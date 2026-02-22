import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { ensureAdmin } from "../middleware/admin.js";
import { getEnv } from "../lib/env.js";

const router = Router();

// ─── Public: GET /.well-known/nostr.json ─────────────────────────────────────
// Served at the root level (not under /api), mounted in index.ts

/**
 * Build the NIP-05 response for a given domain.
 * ?name= query param filters to a single name (per NIP-05 spec).
 */
export async function buildNostrJson(domain: string, nameFilter?: string) {
  const where: any = { domain };
  if (nameFilter) where.name = nameFilter;

  const entries = await prisma.nip05.findMany({
    where,
    include: { relayUrls: true },
  });

  const names: Record<string, string> = {};
  const relays: Record<string, string[]> = {};

  for (const entry of entries) {
    names[entry.name] = entry.pubkey;
    if (entry.relayUrls.length > 0) {
      relays[entry.pubkey] = entry.relayUrls.map((r) => r.url);
    }
  }

  return { names, relays };
}

// ─── Admin CRUD: /api/nip05/* ────────────────────────────────────────────────

/**
 * GET /api/nip05/entries
 * List all NIP-05 entries. Admin only.
 */
router.get("/entries", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    const entries = await prisma.nip05.findMany({
      include: { relayUrls: true, nip05Orders: true },
      orderBy: { name: "asc" },
    });
    res.json({ entries });
  } catch (err) {
    console.error("[nip05] List error:", err);
    res.status(500).json({ error: "Failed to list NIP-05 entries" });
  }
});

/**
 * POST /api/nip05/entries
 * Create a new NIP-05 entry. Admin only.
 * Body: { name, pubkey, domain?, relays?: string[] }
 */
router.post("/entries", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;
  const { name, pubkey, domain, relays } = req.body;

  if (!name || !pubkey) {
    res.status(400).json({ error: "name and pubkey are required" });
    return;
  }

  if (!/^[0-9a-f]{64}$/.test(pubkey)) {
    res.status(400).json({ error: "pubkey must be 64-char hex" });
    return;
  }

  const useDomain = domain || getEnv().CREATOR_DOMAIN;

  try {
    // Check for duplicate
    const existing = await prisma.nip05.findFirst({
      where: { name, domain: useDomain },
    });
    if (existing) {
      res.status(409).json({ error: `${name}@${useDomain} already exists` });
      return;
    }

    const entry = await prisma.nip05.create({
      data: {
        name,
        pubkey,
        domain: useDomain,
        ...(relays && relays.length > 0
          ? { relayUrls: { create: relays.map((url: string) => ({ url })) } }
          : {}),
      },
      include: { relayUrls: true },
    });

    res.json({ entry });
  } catch (err) {
    console.error("[nip05] Create error:", err);
    res.status(500).json({ error: "Failed to create NIP-05 entry" });
  }
});

/**
 * PATCH /api/nip05/entries/:id
 * Update a NIP-05 entry. Admin only.
 * Body: { name?, pubkey?, relays?: string[] }
 */
router.patch("/entries/:id", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;
  const { id } = req.params;
  const { name, pubkey, relays } = req.body;

  try {
    const existing = await prisma.nip05.findUnique({ where: { id: id as string } });
    if (!existing) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }

    // Update main fields
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (pubkey !== undefined) {
      if (!/^[0-9a-f]{64}$/.test(pubkey)) {
        res.status(400).json({ error: "pubkey must be 64-char hex" });
        return;
      }
      data.pubkey = pubkey;
    }

    const entry = await prisma.nip05.update({
      where: { id: id as string },
      data,
      include: { relayUrls: true },
    });

    // Replace relay URLs if provided
    if (relays !== undefined) {
      await prisma.relayUrl.deleteMany({ where: { nip05Id: id as string } });
      if (relays.length > 0) {
        await prisma.relayUrl.createMany({
          data: relays.map((url: string) => ({ nip05Id: id as string, url })),
        });
      }
      // Re-fetch with updated relays
      const updated = await prisma.nip05.findUnique({
        where: { id: id as string },
        include: { relayUrls: true },
      });
      res.json({ entry: updated });
      return;
    }

    res.json({ entry });
  } catch (err) {
    console.error("[nip05] Update error:", err);
    res.status(500).json({ error: "Failed to update NIP-05 entry" });
  }
});

/**
 * DELETE /api/nip05/entries/:id
 * Delete a NIP-05 entry. Admin only.
 */
router.delete("/entries/:id", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;
  const { id } = req.params;

  try {
    await prisma.nip05.delete({ where: { id: id as string } });
    res.json({ success: true });
  } catch (err) {
    console.error("[nip05] Delete error:", err);
    res.status(500).json({ error: "Failed to delete NIP-05 entry" });
  }
});

export default router;
