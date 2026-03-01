import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ─── Valid permission types ──────────────────────────────────────────────────
const PERMISSION_TYPES = ["admin", "coinos_admin", "operator"] as const;
type PermissionType = (typeof PERMISSION_TYPES)[number];

function isValidType(t: string): t is PermissionType {
  return PERMISSION_TYPES.includes(t as PermissionType);
}

// ─── Disclaimers per permission type ─────────────────────────────────────────
const DISCLAIMERS: Record<PermissionType, string> = {
  admin:
    "You are being granted full administrative access to this relay management platform. " +
    "This includes the ability to terminate relays, manage user accounts, modify server configuration, " +
    "and access all financial data. Misuse of admin privileges may result in service disruption. " +
    "By accepting, you acknowledge full responsibility for actions taken under this permission.",
  coinos_admin:
    "You are being granted access to the CoinOS banking backend. " +
    "This includes the ability to view balances, manage funds, create invoices, and send payments " +
    "on behalf of the platform. Unauthorized or careless use of this interface can result in " +
    "IRREVERSIBLE LOSS OF FUNDS. By accepting, you acknowledge full financial responsibility " +
    "and agree to exercise extreme caution with all monetary operations.",
  operator:
    "You are being granted relay operator privileges. " +
    "This includes the ability to manage relay settings, access controls, moderation tools, " +
    "and streaming configuration for relays assigned to you. " +
    "By accepting, you agree to operate relays in accordance with platform policies.",
};

// ─── Helper: check admin ─────────────────────────────────────────────────────
async function ensureAdmin(req: Request, res: Response): Promise<boolean> {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  const user = await prisma.user.findUnique({ where: { id: req.auth.userId } });
  if (!user?.admin) {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// USER ENDPOINTS (any authenticated user)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * GET /permissions/mine
 * Get the current user's permissions and pending requests.
 */
router.get("/mine", requireAuth, async (req: Request, res: Response) => {
  const userId = req.auth!.userId;

  try {
    const [permissions, requests] = await Promise.all([
      prisma.permission.findMany({
        where: { userId, revoked_at: null },
        orderBy: { granted_at: "desc" },
      }),
      prisma.permissionRequest.findMany({
        where: { userId },
        orderBy: { created_at: "desc" },
        take: 20,
      }),
    ]);

    res.json({ permissions, requests });
  } catch (err: any) {
    console.error("[permissions] /mine error:", err.message);
    res.status(500).json({ error: "Failed to load permissions", permissions: [], requests: [] });
  }
});

/**
 * GET /permissions/types
 * Get available permission types and their disclaimers.
 */
router.get("/types", requireAuth, async (_req: Request, res: Response) => {
  const types = PERMISSION_TYPES.map((t) => ({
    type: t,
    disclaimer: DISCLAIMERS[t],
  }));
  res.json({ types });
});

/**
 * POST /permissions/request
 * Request a permission. Body: { type, reason? }
 */
router.post("/request", requireAuth, async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const { type, reason } = req.body;

  if (!type || !isValidType(type)) {
    res.status(400).json({ error: `Invalid permission type. Valid: ${PERMISSION_TYPES.join(", ")}` });
    return;
  }

  // Check if already has this permission
  const existing = await prisma.permission.findUnique({
    where: { userId_type: { userId, type } },
  });
  if (existing && !existing.revoked_at) {
    res.status(409).json({ error: "You already have this permission" });
    return;
  }

  // Check for pending request
  const pending = await prisma.permissionRequest.findFirst({
    where: { userId, type, status: "pending" },
  });
  if (pending) {
    res.status(409).json({ error: "You already have a pending request for this permission" });
    return;
  }

  const request = await prisma.permissionRequest.create({
    data: { userId, type, reason: reason || null },
  });

  res.status(201).json({ request });
});

/**
 * POST /permissions/accept-disclaimer
 * Accept the disclaimer for a granted permission. Body: { type }
 */
router.post("/accept-disclaimer", requireAuth, async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const { type } = req.body;

  if (!type || !isValidType(type)) {
    res.status(400).json({ error: "Invalid permission type" });
    return;
  }

  let permission = await prisma.permission.findUnique({
    where: { userId_type: { userId, type } },
  });

  // Auto-create permission row for admins who have implicit access
  if (!permission || permission.revoked_at) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.admin) {
      permission = await prisma.permission.upsert({
        where: { userId_type: { userId, type } },
        create: {
          userId,
          type,
          granted_by: userId,
        },
        update: {
          revoked_at: null,
        },
      });
    } else {
      res.status(404).json({ error: "Permission not found or revoked" });
      return;
    }
  }

  if (permission.disclaimer_accepted) {
    res.json({ permission, disclaimer: DISCLAIMERS[type] });
    return;
  }

  const updated = await prisma.permission.update({
    where: { id: permission.id },
    data: {
      disclaimer_accepted: true,
      disclaimer_accepted_at: new Date(),
    },
  });

  res.json({ permission: updated, disclaimer: DISCLAIMERS[type] });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADMIN ENDPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * GET /permissions/all
 * List all active permissions (admin only).
 */
router.get("/all", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;

  try {
    const permissions = await prisma.permission.findMany({
      where: { revoked_at: null },
      include: {
        user: { select: { id: true, pubkey: true, name: true, admin: true } },
      },
      orderBy: { granted_at: "desc" },
    });

    res.json({ permissions });
  } catch (err: any) {
    console.error("[permissions] /all error:", err.message);
    res.status(500).json({ error: "Failed to load permissions", permissions: [] });
  }
});

/**
 * GET /permissions/requests
 * List permission requests (admin only). Query: ?status=pending|approved|denied
 */
router.get("/requests", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;

  try {
    const status = (req.query.status as string) || "pending";

    const requests = await prisma.permissionRequest.findMany({
      where: { status },
      include: {
        user: { select: { id: true, pubkey: true, name: true, admin: true } },
        decided_by: { select: { id: true, pubkey: true, name: true } },
      },
      orderBy: { created_at: "desc" },
      take: 100,
    });

    res.json({ requests });
  } catch (err: any) {
    console.error("[permissions] /requests error:", err.message);
    res.status(500).json({ error: "Failed to load permission requests", requests: [] });
  }
});

/**
 * POST /permissions/grant
 * Grant a permission to a user. Body: { userId?, pubkey?, type, notes? }
 * Accepts userId (cuid), hex pubkey, or npub. If the pubkey has no account yet, one is created.
 */
router.post("/grant", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;

  const { userId, pubkey: rawPubkey, type, notes } = req.body;

  if (!type || !isValidType(type)) {
    res.status(400).json({ error: "Valid type required" });
    return;
  }

  let targetUser;

  if (userId) {
    targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }
  } else if (rawPubkey) {
    // Decode npub to hex if needed
    let hexPubkey = rawPubkey.trim();
    if (hexPubkey.startsWith("npub1")) {
      try {
        const nip19 = await import("nostr-tools/nip19");
        const decoded: { type: string; data: unknown } = nip19.decode(hexPubkey) as any;
        if (decoded.type !== "npub" || typeof decoded.data !== "string") {
          res.status(400).json({ error: "Invalid npub" });
          return;
        }
        hexPubkey = decoded.data;
      } catch {
        res.status(400).json({ error: "Invalid npub encoding" });
        return;
      }
    }

    if (!/^[0-9a-f]{64}$/i.test(hexPubkey)) {
      res.status(400).json({ error: "Invalid pubkey format (expected 64-char hex or npub)" });
      return;
    }

    hexPubkey = hexPubkey.toLowerCase();

    // Find or create user by pubkey
    targetUser = await prisma.user.findUnique({ where: { pubkey: hexPubkey } });
    if (!targetUser) {
      targetUser = await prisma.user.create({ data: { pubkey: hexPubkey } });
    }
  } else {
    res.status(400).json({ error: "userId or pubkey (hex or npub) required" });
    return;
  }

  // Get the granting admin's pubkey
  const admin = await prisma.user.findUnique({ where: { id: req.auth!.userId } });

  const permission = await prisma.permission.upsert({
    where: { userId_type: { userId: targetUser.id, type } },
    create: {
      userId: targetUser.id,
      type,
      granted_by: admin?.pubkey || null,
      notes: notes || null,
    },
    update: {
      revoked_at: null,
      granted_at: new Date(),
      granted_by: admin?.pubkey || null,
      disclaimer_accepted: false,
      disclaimer_accepted_at: null,
      notes: notes || null,
    },
  });

  // If granting admin permission, also set the legacy boolean
  if (type === "admin") {
    await prisma.user.update({ where: { id: targetUser.id }, data: { admin: true } });
  }

  res.json({ permission, user: { id: targetUser.id, pubkey: targetUser.pubkey, name: targetUser.name } });
});

/**
 * POST /permissions/revoke
 * Revoke a permission. Body: { userId, type, notes? }
 */
router.post("/revoke", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;

  const { userId, type, notes } = req.body;

  if (!userId || !type || !isValidType(type)) {
    res.status(400).json({ error: "userId and valid type required" });
    return;
  }

  // Protect instance creator pubkeys — admin can never be revoked
  if (type === "admin") {
    const { getEnv } = await import("../lib/env.js");
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (targetUser) {
      const creatorPubkeys = getEnv().ADMIN_PUBKEYS.split(",").map((s: string) => s.trim()).filter(Boolean);
      if (creatorPubkeys.includes(targetUser.pubkey)) {
        res.status(403).json({ error: "Cannot revoke admin from the instance creator" });
        return;
      }
    }
  }

  const permission = await prisma.permission.findUnique({
    where: { userId_type: { userId, type } },
  });

  if (!permission || permission.revoked_at) {
    res.status(404).json({ error: "Active permission not found" });
    return;
  }

  await prisma.permission.update({
    where: { id: permission.id },
    data: {
      revoked_at: new Date(),
      notes: notes ? `${permission.notes || ""}\nRevoked: ${notes}`.trim() : permission.notes,
    },
  });

  // If revoking admin permission, also clear the legacy boolean
  if (type === "admin") {
    await prisma.user.update({ where: { id: userId }, data: { admin: false } });
  }

  res.json({ success: true });
});

/**
 * POST /permissions/requests/:id/decide
 * Approve or deny a permission request. Body: { decision: "approved"|"denied", note? }
 */
router.post("/requests/:id/decide", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;

  const requestId = req.params.id as string;
  const { decision, note } = req.body;

  if (!decision || !["approved", "denied"].includes(decision)) {
    res.status(400).json({ error: "decision must be 'approved' or 'denied'" });
    return;
  }

  const permReq = await prisma.permissionRequest.findUnique({ where: { id: requestId } });
  if (!permReq) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  if (permReq.status !== "pending") {
    res.status(409).json({ error: `Request already ${permReq.status}` });
    return;
  }

  // Update the request
  await prisma.permissionRequest.update({
    where: { id: requestId },
    data: {
      status: decision,
      decidedById: req.auth!.userId,
      decision_note: note || null,
      decided_at: new Date(),
    },
  });

  // If approved, grant the permission
  if (decision === "approved") {
    const admin = await prisma.user.findUnique({ where: { id: req.auth!.userId } });

    await prisma.permission.upsert({
      where: { userId_type: { userId: permReq.userId, type: permReq.type } },
      create: {
        userId: permReq.userId,
        type: permReq.type,
        granted_by: admin?.pubkey || null,
      },
      update: {
        revoked_at: null,
        granted_at: new Date(),
        granted_by: admin?.pubkey || null,
        disclaimer_accepted: false,
        disclaimer_accepted_at: null,
      },
    });

    // Sync legacy admin boolean
    if (permReq.type === "admin") {
      await prisma.user.update({ where: { id: permReq.userId }, data: { admin: true } });
    }
  }

  res.json({ success: true, decision });
});

export default router;
