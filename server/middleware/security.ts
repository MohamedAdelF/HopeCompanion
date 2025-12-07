import type { Request, Response, NextFunction } from "express";

// Simple rate limiting implementation (since express-rate-limit may not be installed)
interface RateLimitStore {
  [ip: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

function createRateLimit(windowMs: number, max: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    
    if (!rateLimitStore[ip] || rateLimitStore[ip].resetTime < now) {
      rateLimitStore[ip] = {
        count: 1,
        resetTime: now + windowMs,
      };
      next();
      return;
    }
    
    if (rateLimitStore[ip].count >= max) {
      res.status(429).json({ 
        error: "تم تجاوز عدد الطلبات المسموح به. يرجى المحاولة مرة أخرى لاحقاً.",
        retryAfter: Math.ceil((rateLimitStore[ip].resetTime - now) / 1000)
      });
      return;
    }
    
    rateLimitStore[ip].count++;
    next();
  };
}

// CORS configuration
export const corsOptions = {
  origin: function (origin: string | undefined): boolean {
    const allowedOrigins = [
      "http://localhost:5000",
      "http://127.0.0.1:5000",
      "https://pinkhopecompanion.web.app",
      "https://pinkhopecompanion.firebaseapp.com",
    ];

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return true;
    }

    return allowedOrigins.includes(origin);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Type"],
};

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // XSS Protection
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  // Strict Transport Security (only in production with HTTPS)
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  
  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://*.googleapis.com https://*.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://maps.googleapis.com https://*.gstatic.com; img-src 'self' data: https: https://maps.googleapis.com https://*.googleapis.com https://*.gstatic.com; font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com; worker-src 'self' blob: data:; connect-src 'self' data: blob: https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://*.googleapis.com https://maps.googleapis.com https://www.gstatic.com https://*.gstatic.com"
  );
  
  // Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Permissions Policy - Allow geolocation for the app
  res.setHeader("Permissions-Policy", "geolocation=(self), microphone=(), camera=()");
  
  next();
}

// Rate limiting for general API routes
export const apiLimiter = createRateLimit(15 * 60 * 1000, 100); // 15 minutes, 100 requests

// Stricter rate limiting for authentication routes
export const authLimiter = createRateLimit(15 * 60 * 1000, 5); // 15 minutes, 5 requests

// Rate limiting for file uploads
export const uploadLimiter = createRateLimit(60 * 60 * 1000, 10); // 1 hour, 10 uploads

// Rate limiting for AI endpoints (expensive operations)
export const aiLimiter = createRateLimit(60 * 60 * 1000, 50); // 1 hour, 50 requests

