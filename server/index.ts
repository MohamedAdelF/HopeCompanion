import { config } from "dotenv";
import { resolve } from "path";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { corsOptions, securityHeaders, apiLimiter } from "./middleware/security";

// Load .env file explicitly with override
const envPath = resolve(process.cwd(), ".env");
const result = config({ path: envPath, override: true });
console.log("📁 Environment loaded from:", envPath);
console.log("📦 Dotenv result:", result ? (result.parsed ? `Found ${Object.keys(result.parsed).length} vars` : "No vars parsed") : "Error");
console.log("🔑 GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? `Found (${process.env.GEMINI_API_KEY.length} chars)` : "NOT FOUND");
console.log("🔑 All env keys with GEMINI:", Object.keys(process.env).filter(k => k.includes("GEMINI")));

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// Security middleware - apply before other middleware
app.use(securityHeaders);

// CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  
  if (origin && corsOptions.origin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", corsOptions.methods.join(", "));
    res.setHeader("Access-Control-Allow-Headers", corsOptions.allowedHeaders.join(", "));
    res.setHeader("Access-Control-Expose-Headers", corsOptions.exposedHeaders.join(", "));
  } else if (!origin) {
    // Allow requests with no origin
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  
  next();
});

// Rate limiting for all API routes
app.use("/api", apiLimiter);

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
  limit: "10mb" // Limit JSON payload size
}));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  const listenOptions: any = {
    port,
    host: "0.0.0.0",
  };
  // Windows and macOS do not support SO_REUSEPORT; enabling it causes ENOTSUP.
  if (process.platform === 'linux') {
    listenOptions.reusePort = true;
  }

  server.listen(listenOptions, async () => {
    log(`serving on port ${port}`);
    
    // Start notification scheduler
    try {
      const { startScheduler } = await import("./services/scheduler");
      startScheduler();
    } catch (error) {
      console.warn("⚠️ Could not start scheduler:", error);
    }
  });
})();
