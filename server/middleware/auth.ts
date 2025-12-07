import type { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";

// Initialize Firebase Admin if not already initialized
async function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
      }
    } catch (error) {
      console.error("Failed to initialize Firebase Admin:", error);
    }
  }
}

// Authentication middleware
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await initializeFirebaseAdmin();

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    if (!token) {
      res.status(401).json({ error: "مطلوب رمز مصادقة" });
      return;
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (error: any) {
    console.error("Authentication error:", error?.message);
    res.status(401).json({ error: "رمز المصادقة غير صالح" });
    return;
  }
}

// Optional authentication (doesn't fail if no token)
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await initializeFirebaseAdmin();

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    if (token) {
      const decodedToken = await admin.auth().verifyIdToken(token);
      (req as any).user = decodedToken;
    } else {
      (req as any).user = null;
    }
    next();
  } catch (error: any) {
    // If token is invalid, continue without user
    (req as any).user = null;
    next();
  }
}

// Admin-only middleware (requires admin role)
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await initializeFirebaseAdmin();

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    if (!token) {
      res.status(401).json({ error: "مطلوب رمز مصادقة" });
      return;
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check if user has admin custom claim
    if (!decodedToken.admin && decodedToken.email !== process.env.ADMIN_EMAIL) {
      res.status(403).json({ error: "غير مصرح - يتطلب صلاحيات المدير" });
      return;
    }

    (req as any).user = decodedToken;
    next();
  } catch (error: any) {
    console.error("Admin authentication error:", error?.message);
    res.status(401).json({ error: "رمز المصادقة غير صالح" });
    return;
  }
}

