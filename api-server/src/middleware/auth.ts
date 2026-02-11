import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getEnv } from "../lib/env.js";

export interface AuthPayload {
  pubkey: string;
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

/**
 * Middleware that requires a valid JWT in the Authorization header.
 * Sets req.auth with { pubkey, userId }.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getEnv().JWT_SECRET) as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware that optionally parses a JWT if present.
 * Does not reject requests without auth.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getEnv().JWT_SECRET) as AuthPayload;
    req.auth = payload;
  } catch {
    // Invalid token, but auth is optional — continue without it
  }
  next();
}

/**
 * Middleware that requires the authenticated user to be a super admin.
 * Must be used after requireAuth.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  // Admin check is done in the route handler via DB lookup
  // This middleware just ensures auth exists
  next();
}

/**
 * Generate a JWT for a verified user.
 */
export function signToken(pubkey: string, userId: string): string {
  return jwt.sign({ pubkey, userId } satisfies AuthPayload, getEnv().JWT_SECRET, {
    expiresIn: "7d",
  });
}
