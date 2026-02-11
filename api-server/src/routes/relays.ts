import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

const router = Router();

// --- Shared includes for relay queries ---
const relayFullInclude = {
  owner: true,
  streams: {
    select: { id: true, url: true, direction: true, internal: true, sync: true, status: true },
  },
  moderators: { include: { user: true } },
  block_list: {
    include: { list_keywords: true, list_pubkeys: true, list_kinds: true },
  },
  allow_list: {
    include: { list_keywords: true, list_pubkeys: true, list_kinds: true },
  },
  acl_sources: true,
};

const relayPublicInclude = {
  owner: true,
  streams: {
    select: { id: true, url: true, direction: true, internal: true, sync: true, status: true },
  },
  moderators: { include: { user: true } },
  allow_list: {
    include: { list_keywords: true, list_pubkeys: true, list_kinds: true },
  },
  acl_sources: true,
};

/**
 * GET /relays/mine
 * Get all relays owned by or moderated by the current user.
 */
router.get("/mine", requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) {
    res.status(404).json({ error: "user not found" });
    return;
  }

  const whereClause = user.admin
    ? { OR: [{ status: "running" }, { status: "provision" }] }
    : { ownerId: user.id, OR: [{ status: "running" }, { status: "provision" }] };

  const myRelays = await prisma.relay.findMany({
    where: whereClause,
    include: relayFullInclude,
  });

  const moderatedRelays = await prisma.moderator.findMany({
    where: { userId: user.id },
    include: {
      relay: { include: relayFullInclude },
    },
  });

  res.json({ myRelays, moderatedRelays });
});

/**
 * GET /relays/public
 * Get all relays listed in the public directory.
 */
router.get("/public", async (_req: Request, res: Response) => {
  const relays = await prisma.relay.findMany({
    where: {
      listed_in_directory: true,
      OR: [{ status: "running" }, { status: "provision" }],
    },
    include: relayPublicInclude,
  });

  res.json({ relays });
});

/**
 * GET /relays/:id
 * Get a single relay by ID. Returns public or full data based on ownership.
 */
router.get("/:id", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const relay = await prisma.relay.findFirst({
    where: { id },
    include: relayPublicInclude,
  });

  if (!relay) {
    res.status(404).json({ error: "relay not found" });
    return;
  }

  res.json({ relay });
});

/**
 * GET /relays/by-name/:name
 * Get a relay by subdomain name. Returns full data if requester is owner/mod/admin.
 */
router.get("/by-name/:name", async (req: Request, res: Response) => {
  const name = req.params.name as string;

  // Try to determine if the requester is an owner/mod/admin for full data
  let useFull = false;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const jwt = await import("jsonwebtoken");
      const { getEnv } = await import("../lib/env.js");
      const payload = jwt.default.verify(header.slice(7), getEnv().JWT_SECRET) as { userId: string };
      if (payload?.userId) {
        const user = await prisma.user.findUnique({ where: { id: payload.userId } });
        if (user) {
          if (user.admin) {
            useFull = true;
          } else {
            const owned = await prisma.relay.findFirst({ where: { name, ownerId: user.id } });
            if (owned) useFull = true;
            else {
              const modded = await prisma.moderator.findFirst({
                where: { userId: user.id, relay: { name } },
              });
              if (modded) useFull = true;
            }
          }
        }
      }
    } catch {
      // Token invalid — fall through to public include
    }
  }

  const relay = await prisma.relay.findFirst({
    where: { name },
    include: useFull ? relayFullInclude : relayPublicInclude,
  });

  if (!relay) {
    res.status(404).json({ error: "relay not found" });
    return;
  }

  res.json({ relay });
});

/**
 * DELETE /relays/:id
 * Mark a relay for deletion (sets status to "deleting").
 */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const relayId = req.params.id as string;
  const relay = await checkRelayOwnership(req.auth!.userId, relayId);
  if (!relay) {
    res.status(403).json({ error: "not your relay" });
    return;
  }

  await prisma.relay.update({
    where: { id: relay.id },
    data: { status: "deleting" },
  });

  res.json({ success: true });
});

// --- SETTINGS ---

const settingsSchema = z.object({
  details: z.string().optional(),
  default_message_policy: z.boolean().optional(),
  listed_in_directory: z.boolean().optional(),
  payment_required: z.boolean().optional(),
  payment_amount: z.coerce.number().optional(),
  payment_premium_amount: z.coerce.number().optional(),
  nip05_payment_amount: z.coerce.number().optional(),
  profile_image: z.string().optional(),
  banner_image: z.string().optional(),
  allow_giftwrap: z.boolean().optional(),
  allow_tagged: z.boolean().optional(),
  auth_required: z.boolean().optional(),
  allow_keyword_pubkey: z.boolean().optional(),
  relay_kind_description: z.string().optional(),
  request_payment: z.boolean().optional(),
  request_payment_amount: z.coerce.number().optional(),
});

/**
 * PATCH /relays/:id/settings
 * Update relay settings. Owner or super admin only.
 */
router.patch("/:id/settings", requireAuth, validateBody(settingsSchema), async (req: Request, res: Response) => {
  const relayId = req.params.id as string;
  const relay = await checkRelayOwnership(req.auth!.userId, relayId);
  if (!relay) {
    res.status(403).json({ error: "not your relay" });
    return;
  }

  await prisma.relay.update({
    where: { id: relay.id },
    data: req.body,
  });

  res.json({ success: true });
});

// --- MODERATORS ---

const addModeratorSchema = z.object({
  pubkey: z.string().min(1),
});

/**
 * POST /relays/:id/moderators
 * Add a moderator to a relay.
 */
router.post("/:id/moderators", requireAuth, validateBody(addModeratorSchema), async (req: Request, res: Response) => {
  const relayId = req.params.id as string;
  const relay = await checkRelayOwnership(req.auth!.userId, relayId);
  if (!relay) {
    res.status(403).json({ error: "not your relay" });
    return;
  }

  const { pubkey } = req.body;

  let user = await prisma.user.findFirst({ where: { pubkey } });
  if (!user) {
    user = await prisma.user.create({ data: { pubkey } });
  }

  const existing = await prisma.moderator.findFirst({
    where: { relayId: relay.id, userId: user.id },
  });

  if (existing) {
    res.status(409).json({ error: "moderator already exists" });
    return;
  }

  const mod = await prisma.moderator.create({
    data: { relayId: relay.id, userId: user.id },
  });

  res.json(mod);
});

/**
 * DELETE /relays/:id/moderators/:modId
 * Remove a moderator from a relay.
 */
router.delete("/:id/moderators/:modId", requireAuth, async (req: Request, res: Response) => {
  const relayId = req.params.id as string;
  const modId = req.params.modId as string;
  const relay = await checkRelayOwnership(req.auth!.userId, relayId);
  if (!relay) {
    res.status(403).json({ error: "not your relay" });
    return;
  }

  const mod = await prisma.moderator.findFirst({
    where: { id: modId, relayId: relay.id },
  });

  if (!mod) {
    res.status(404).json({ error: "moderator not found" });
    return;
  }

  await prisma.moderator.delete({ where: { id: mod.id } });
  res.json({ success: true });
});

// --- STREAMS ---

const addStreamSchema = z.object({
  url: z.string().min(1),
  direction: z.enum(["up", "down", "both"]),
});

function validateStreamUrl(url: string): boolean {
  if (!url.match(/^wss?:\/\//)) return false;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname) return false;
    const h = parsed.hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1" || h.startsWith("192.168.") || h.startsWith("10.") || h.startsWith("172.")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * GET /relays/:id/streams
 * List streams for a relay.
 */
router.get("/:id/streams", requireAuth, async (req: Request, res: Response) => {
  const relayId = req.params.id as string;
  const relay = await checkRelayAccess(req.auth!.userId, relayId);
  if (!relay) {
    res.status(403).json({ error: "not authorized" });
    return;
  }

  const streams = await prisma.stream.findMany({ where: { relayId: relay.id } });
  res.json({ streams });
});

/**
 * POST /relays/:id/streams
 * Add a stream to a relay.
 */
router.post("/:id/streams", requireAuth, validateBody(addStreamSchema), async (req: Request, res: Response) => {
  const relayId = req.params.id as string;
  const relay = await checkRelayAccess(req.auth!.userId, relayId);
  if (!relay) {
    res.status(403).json({ error: "not authorized" });
    return;
  }

  const { url, direction } = req.body;

  if (!validateStreamUrl(url)) {
    res.status(400).json({ error: "invalid stream URL" });
    return;
  }

  const count = await prisma.stream.count({ where: { relayId: relay.id } });
  if (count >= 5) {
    res.status(400).json({ error: "maximum of 5 streams allowed" });
    return;
  }

  const stream = await prisma.stream.create({
    data: { url, direction, relayId: relay.id, status: "pending" },
  });

  await prisma.relay.update({
    where: { id: relay.id },
    data: { status: "provision" },
  });

  res.json(stream);
});

/**
 * DELETE /relays/:id/streams/:streamId
 * Remove a stream from a relay.
 */
router.delete("/:id/streams/:streamId", requireAuth, async (req: Request, res: Response) => {
  const relayId = req.params.id as string;
  const streamId = req.params.streamId as string;
  const relay = await checkRelayAccess(req.auth!.userId, relayId);
  if (!relay) {
    res.status(403).json({ error: "not authorized" });
    return;
  }

  const deleted = await prisma.stream.delete({
    where: { id: streamId, relayId: relay.id },
  });

  await prisma.relay.update({
    where: { id: relay.id },
    data: { status: "provision" },
  });

  res.json(deleted);
});

// --- HELPERS ---

async function checkRelayOwnership(userId: string, relayId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const relay = await prisma.relay.findFirst({
    where: { id: relayId },
    include: { moderators: true, block_list: true, allow_list: true },
  });

  if (!relay) return null;

  // Super admin can access any relay
  if (user.admin) return relay;

  // Must be the owner
  if (relay.ownerId !== user.id) return null;

  return relay;
}

async function checkRelayAccess(userId: string, relayId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const relay = await prisma.relay.findFirst({
    where: { id: relayId },
    include: { moderators: true, block_list: true, allow_list: true },
  });

  if (!relay) return null;

  // Super admin
  if (user.admin) return relay;

  // Owner
  if (relay.ownerId === user.id) return relay;

  // Moderator
  const isMod = relay.moderators.some((m) => m.userId === user.id);
  if (isMod) return relay;

  return null;
}

export default router;
