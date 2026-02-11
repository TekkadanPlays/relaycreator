import { Router, Request, Response } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { verifyLoginEvent, type NostrEvent } from "../lib/nostr.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";

const router = Router();

/**
 * GET /auth/login-token
 * Generate a random login token for NIP-07 signing.
 */
router.get("/login-token", async (_req: Request, res: Response) => {
  const token = crypto.randomBytes(32).toString("hex");
  const created_at = new Date();

  await prisma.loginToken.create({
    data: { token, created_at },
  });

  // Clean up tokens older than 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  await prisma.loginToken.deleteMany({
    where: { created_at: { lt: fiveMinAgo } },
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
    res.status(401).json({ error: "Invalid or expired login token" });
    return;
  }

  // Verify the signed event
  const pubkey = verifyLoginEvent(event, event.content);
  if (!pubkey) {
    res.status(401).json({ error: "Invalid event signature" });
    return;
  }

  // Delete the used token
  await prisma.loginToken.delete({ where: { id: tokenRecord.id } });

  // Find or create user
  let user = await prisma.user.findUnique({ where: { pubkey } });
  if (!user) {
    user = await prisma.user.create({ data: { pubkey } });
  }

  const token = signToken(pubkey, user.id);

  res.json({
    token,
    user: {
      id: user.id,
      pubkey: user.pubkey,
      name: user.name,
      admin: user.admin,
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

  res.json({ user });
});

export default router;
