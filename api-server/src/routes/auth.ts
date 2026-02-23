import { Router, Request, Response } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { verifyLoginEvent, type NostrEvent } from "../lib/nostr.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { getEnv } from "../lib/env.js";

const router = Router();

/**
 * GET /auth/logintoken
 * NextAuth-compatible stub for cookiecutter daemon.
 * Cookiecutter calls this to get a token before signing a Nostr event.
 */
router.get("/logintoken", async (_req: Request, res: Response) => {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.loginToken.create({ data: { token, created_at: new Date() } });
  res.json({ token });
});

/**
 * GET /auth/csrf
 * NextAuth-compatible stub for cookiecutter daemon.
 * Returns a dummy CSRF token since we don't use CSRF protection on API routes.
 */
router.get("/csrf", (_req: Request, res: Response) => {
  res.json({ csrfToken: crypto.randomBytes(16).toString("hex") });
});

/**
 * POST /auth/callback/credentials
 * NextAuth-compatible stub for cookiecutter daemon.
 * Cookiecutter POSTs a signed Nostr event here to "log in".
 * Since sconfig routes have auth disabled, we just return success.
 */
router.post("/callback/credentials", (_req: Request, res: Response) => {
  res.json({ url: "/" });
});

/**
 * GET /auth/login-token
 * Generate a random login token for NIP-07 signing (frontend SPA).
 */
router.get("/login-token", async (_req: Request, res: Response) => {
  const token = crypto.randomBytes(32).toString("hex");
  const created_at = new Date();

  await prisma.loginToken.create({
    data: { token, created_at },
  });

  // Clean up tokens older than 15 minutes
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
  await prisma.loginToken.deleteMany({
    where: { created_at: { lt: fifteenMinAgo } },
  });

  res.json({ token });
});

const loginSchema = z.object({
  id: z.string(),
  pubkey: z.string(),
  created_at: z.number(),
  kind: z.number(),
  tags: z.array(z.array(z.string())),
  content: z.string(),
  sig: z.string(),
});

/**
 * POST /auth/login
 * Verify a signed NIP-07 event and return a JWT.
 * Body: a signed Nostr event with the login token as content.
 */
router.post("/login", validateBody(loginSchema), async (req: Request, res: Response) => {
  const event = req.body as NostrEvent;

  // Look up the login token
  const tokenRecord = await prisma.loginToken.findUnique({
    where: { token: event.content },
  });

  if (!tokenRecord) {
    console.warn(`[auth] Login failed: token not found (content: ${event.content.slice(0, 8)}...)`);
    res.status(401).json({ error: "Invalid or expired login token. Please try again." });
    return;
  }

  // Verify the signed event
  const pubkey = verifyLoginEvent(event, event.content);
  if (!pubkey) {
    const now = Math.floor(Date.now() / 1000);
    const age = Math.abs(now - event.created_at);
    console.warn(`[auth] Login failed: event verification failed (kind: ${event.kind}, age: ${age}s, pubkey: ${event.pubkey?.slice(0, 8)}...)`);
    res.status(401).json({ error: `Invalid event signature or event too old (${age}s). Please try again.` });
    return;
  }

  // Delete the used token
  await prisma.loginToken.delete({ where: { id: tokenRecord.id } });

  // Find or create user
  let user = await prisma.user.findUnique({ where: { pubkey } });
  if (!user) {
    user = await prisma.user.create({ data: { pubkey } });
  }

  // Auto-promote admin pubkeys from env
  const adminPubkeys = getEnv().ADMIN_PUBKEYS.split(",").map((s) => s.trim()).filter(Boolean);
  if (adminPubkeys.includes(pubkey) && !user.admin) {
    user = await prisma.user.update({ where: { id: user.id }, data: { admin: true } });
    console.log(`[auth] Auto-promoted ${pubkey.slice(0, 8)}... to admin via ADMIN_PUBKEYS`);
  }

  // Fetch active permissions
  const permissions = await prisma.permission.findMany({
    where: { userId: user.id, revoked_at: null },
    select: { type: true, disclaimer_accepted: true },
  });

  const token = signToken(pubkey, user.id);

  res.json({
    token,
    user: {
      id: user.id,
      pubkey: user.pubkey,
      name: user.name,
      admin: user.admin,
      permissions: permissions.map((p) => ({ type: p.type, disclaimer_accepted: p.disclaimer_accepted })),
    },
  });
});

/**
 * GET /auth/me
 * Return the current authenticated user's info.
 */
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: {
      id: true,
      pubkey: true,
      name: true,
      admin: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const permissions = await prisma.permission.findMany({
    where: { userId: user.id, revoked_at: null },
    select: { type: true, disclaimer_accepted: true },
  });

  res.json({
    user: {
      ...user,
      permissions: permissions.map((p) => ({ type: p.type, disclaimer_accepted: p.disclaimer_accepted })),
    },
  });
});

export default router;
