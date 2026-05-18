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
 * Extract JWT from cookie or Authorization header.
 * Prefers cookie for cross-subdomain SSO, falls back to header.
 */
function extractToken(req: Request): string | null {
  // 1. Check cookie (cross-subdomain SSO)
  const cookieToken = req.cookies?.mycelium_token;
  if (cookieToken) return cookieToken;

  // 2. Fallback to Authorization header
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);

  return null;
}

/**
 * Set the SSO cookie on the response.
 * Scoped to the parent domain so all subdomains share the session.
 */
export function setAuthCookie(res: Response, token: string): void {
  const domain = getEnv().CREATOR_DOMAIN; // e.g. "mycelium.social"
  res.cookie("mycelium_token", token, {
    domain: `.${domain}`,
    path: "/",
    httpOnly: false,     // Client JS needs to read for auth state
    secure: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matches JWT expiry)
  });
}

/**
 * Clear the SSO cookie on the response.
 */
export function clearAuthCookie(res: Response): void {
  const domain = getEnv().CREATOR_DOMAIN;
  res.cookie("mycelium_token", "", {
    domain: `.${domain}`,
    path: "/",
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
  });
}

/**
 * Middleware that requires a valid JWT in the cookie or Authorization header.
 * Sets req.auth with { pubkey, userId }.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Missing or invalid authorization" });
    return;
  }

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
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }

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
