import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getEnv } from "../lib/env.js";

const router = Router();

// ─── Helper: check if user is admin ─────────────────────────────────────────
async function ensureAdmin(req: Request, res: Response): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user?.admin) {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

// ─── GET /nip05 — List all NIP-05 entries for the root domain ────────────────
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const domain = getEnv().CREATOR_DOMAIN.toLowerCase();

  const nip05s = await prisma.nip05.findMany({
    where: { domain },
    include: { relayUrls: true, nip05Orders: { orderBy: { id: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });

  res.json({ nip05s, domain });
});

// ─── GET /nip05/mine — List current user's NIP-05 entries ────────────────────
router.get("/mine", requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const domain = getEnv().CREATOR_DOMAIN.toLowerCase();

  const nip05s = await prisma.nip05.findMany({
    where: { pubkey: user.pubkey, domain },
    include: { relayUrls: true },
    orderBy: { name: "asc" },
  });

  res.json({ nip05s, domain });
});

// ─── PUT /nip05/:id — Update relay URLs and/or pubkey ────────────────────────
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { relayUrls, pubkey: rawPubkey } = req.body;

  const nip05 = await prisma.nip05.findUnique({ where: { id }, include: { relayUrls: true } });
  if (!nip05) { res.status(404).json({ error: "NIP-05 not found" }); return; }

  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // Only the owner or an admin can edit
  if (nip05.pubkey !== user.pubkey && !user.admin) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  // Update pubkey if provided (admin only for changing to different pubkey)
  if (rawPubkey && rawPubkey !== nip05.pubkey) {
    if (!user.admin) {
      res.status(403).json({ error: "Only admins can reassign NIP-05 pubkey" });
      return;
    }

    let hexPubkey = rawPubkey.trim();
    if (hexPubkey.startsWith("npub1")) {
      try {
        const nip19 = await import("nostr-tools/nip19");
        const decoded: { type: string; data: unknown } = nip19.decode(hexPubkey) as any;
        if (decoded.type !== "npub" || typeof decoded.data !== "string") {
          res.status(400).json({ error: "Invalid npub" }); return;
        }
        hexPubkey = decoded.data;
      } catch {
        res.status(400).json({ error: "Invalid npub encoding" }); return;
      }
    }

    if (!/^[0-9a-f]{64}$/i.test(hexPubkey)) {
      res.status(400).json({ error: "Invalid pubkey format" }); return;
    }

    await prisma.nip05.update({ where: { id }, data: { pubkey: hexPubkey.toLowerCase() } });
  }

  // Update relay URLs if provided
  if (Array.isArray(relayUrls)) {
    const validUrls = relayUrls
      .filter((u: any) => typeof u === "string" && u.startsWith("wss://"))
      .slice(0, 10);

    const currentUrls = nip05!.relayUrls.map((r: { url: string }) => r.url);
    const toAdd = validUrls.filter((u: string) => !currentUrls.includes(u));
    const toRemove = currentUrls.filter((u: string) => !validUrls.includes(u));

    if (toAdd.length > 0 || toRemove.length > 0) {
      await prisma.$transaction([
        ...toAdd.map((url: string) => prisma.relayUrl.create({ data: { url, nip05Id: id } })),
        ...toRemove.map((url: string) => prisma.relayUrl.deleteMany({ where: { url, nip05Id: id } })),
      ]);
    }
  }

  const updated = await prisma.nip05.findUnique({
    where: { id },
    include: { relayUrls: true },
  });

  res.json({ nip05: updated });
});

// ─── DELETE /nip05/:id — Delete a NIP-05 entry ──────────────────────────────
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const nip05 = await prisma.nip05.findUnique({ where: { id } });
  if (!nip05) { res.status(404).json({ error: "NIP-05 not found" }); return; }

  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // Only the owner or an admin can delete
  if (nip05.pubkey !== user.pubkey && !user.admin) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  await prisma.nip05.delete({ where: { id } });
  res.json({ success: true });
});

// ─── POST /nip05/admin/assign — Admin assigns NIP-05 to any pubkey ──────────
router.post("/admin/assign", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;

  const { name, pubkey: rawPubkey, relayUrls } = req.body;
  const domain = getEnv().CREATOR_DOMAIN.toLowerCase();

  if (!name || !rawPubkey) {
    res.status(400).json({ error: "name and pubkey required" });
    return;
  }

  const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
  if (cleanName.length < 1 || cleanName.length > 64) {
    res.status(400).json({ error: "Name must be 1-64 characters" });
    return;
  }

  const existing = await prisma.nip05.findFirst({ where: { name: cleanName, domain } });
  if (existing) {
    res.status(409).json({ error: "Name already taken" });
    return;
  }

  // Decode npub if needed
  let hexPubkey: string = (rawPubkey as string).trim();
  if (hexPubkey.startsWith("npub1")) {
    try {
      const nip19 = await import("nostr-tools/nip19");
      const decoded: { type: string; data: unknown } = nip19.decode(hexPubkey) as any;
      if (decoded.type !== "npub" || typeof decoded.data !== "string") {
        res.status(400).json({ error: "Invalid npub" }); return;
      }
      hexPubkey = decoded.data;
    } catch {
      res.status(400).json({ error: "Invalid npub encoding" }); return;
    }
  }

  if (!/^[0-9a-f]{64}$/i.test(hexPubkey)) {
    res.status(400).json({ error: "Invalid pubkey format" }); return;
  }

  hexPubkey = hexPubkey.toLowerCase();

  const nip05 = await prisma.nip05.create({
    data: { name: cleanName, domain, pubkey: hexPubkey },
  });

  // Create relay URLs if provided
  if (Array.isArray(relayUrls) && relayUrls.length > 0) {
    const validUrls = (relayUrls as string[])
      .filter((u: string) => typeof u === "string" && u.startsWith("wss://"))
      .slice(0, 10);

    if (validUrls.length > 0) {
      await prisma.relayUrl.createMany({
        data: validUrls.map((url: string) => ({ nip05Id: nip05.id, url })),
      });
    }
  }

  // Find or create user for the order record
  let targetUser = await prisma.user.findUnique({ where: { pubkey: hexPubkey } });
  if (!targetUser) {
    targetUser = await prisma.user.create({ data: { pubkey: hexPubkey } });
  }

  await prisma.nip05Order.create({
    data: {
      userId: targetUser.id,
      nip05Id: nip05.id,
      amount: 0,
      paid: true,
      payment_hash: "admin-assigned",
      lnurl: "admin-assigned",
      status: "completed",
    },
  });

  const created = await prisma.nip05.findUnique({
    where: { id: nip05.id },
    include: { relayUrls: true },
  });

  res.json({ nip05: created });
});

export default router;
