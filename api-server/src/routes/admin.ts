import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getEnv } from "../lib/env.js";

const router = Router();

/**
 * Middleware: check that the authenticated user is a super admin.
 */
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

/**
 * GET /admin/stats
 * Dashboard overview stats.
 */
router.get("/stats", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;

  const [
    totalRelays,
    runningRelays,
    provisioningRelays,
    totalUsers,
    totalOrders,
    paidOrders,
    recentOrders,
    totalRevenue,
  ] = await Promise.all([
    prisma.relay.count(),
    prisma.relay.count({ where: { status: "running" } }),
    prisma.relay.count({ where: { status: "provision" } }),
    prisma.user.count(),
    prisma.order.count(),
    prisma.order.count({ where: { paid: true } }),
    prisma.order.count({
      where: { paid_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.order.aggregate({
      where: { paid: true },
      _sum: { amount: true },
    }),
  ]);

  res.json({
    totalRelays,
    runningRelays,
    provisioningRelays,
    totalUsers,
    totalOrders,
    paidOrders,
    recentOrders,
    totalRevenue: totalRevenue._sum.amount || 0,
  });
});

/**
 * GET /admin/relays
 * All relays with owner info.
 */
router.get("/relays", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;

  const relays = await prisma.relay.findMany({
    include: {
      owner: { select: { id: true, pubkey: true, name: true } },
      moderators: { include: { user: { select: { pubkey: true } } } },
      _count: { select: { Order: true, streams: true } },
    },
    orderBy: { created_at: "desc" },
  });

  res.json({ relays });
});

/**
 * GET /admin/users
 * All users with relay counts.
 */
router.get("/users", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;

  const users = await prisma.user.findMany({
    include: {
      _count: { select: { relays: true, orders: true } },
    },
    orderBy: { id: "desc" },
  });

  res.json({ users });
});

/**
 * GET /admin/orders
 * All orders with relay and user info.
 */
router.get("/orders", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;

  const orders = await prisma.order.findMany({
    include: {
      relay: { select: { id: true, name: true, domain: true, status: true } },
      user: { select: { id: true, pubkey: true, name: true } },
    },
    orderBy: { id: "desc" },
    take: 100,
  });

  res.json({ orders });
});

/**
 * GET /admin/config
 * Server configuration (non-secret).
 */
router.get("/config", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;

  const env = getEnv();
  res.json({
    domain: env.CREATOR_DOMAIN,
    payments_enabled: env.PAYMENTS_ENABLED === "true",
    coinos_enabled: env.COINOS_ENABLED === "true",
    lnbits_configured: !!(env.LNBITS_ADMIN_KEY && env.LNBITS_ENDPOINT),
    invoice_amount: env.INVOICE_AMOUNT,
    invoice_premium_amount: env.INVOICE_PREMIUM_AMOUNT,
    cors_origin: env.CORS_ORIGIN,
    port: env.PORT,
  });
});

/**
 * PATCH /admin/users/:id
 * Toggle admin status for a user.
 */
router.patch("/users/:id", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;

  const userId = req.params.id as string;
  const { admin } = req.body;

  if (typeof admin !== "boolean") {
    res.status(400).json({ error: "admin must be a boolean" });
    return;
  }

  // Prevent revoking admin from instance creator pubkeys
  if (!admin) {
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (targetUser) {
      const creatorPubkeys = getEnv().ADMIN_PUBKEYS.split(",").map((s) => s.trim()).filter(Boolean);
      if (creatorPubkeys.includes(targetUser.pubkey)) {
        res.status(403).json({ error: "Cannot revoke admin from the instance creator" });
        return;
      }
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { admin },
  });

  res.json({ success: true });
});

/**
 * DELETE /admin/relays/:id
 * Delete a relay (admin only).
 */
router.delete("/relays/:id", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;

  const relayId = req.params.id as string;

  const relay = await prisma.relay.findUnique({ where: { id: relayId } });
  if (!relay) {
    res.status(404).json({ error: "Relay not found" });
    return;
  }

  // Clean up related records
  const rid = relayId;
  await prisma.$transaction([
    prisma.moderator.deleteMany({ where: { relayId: rid } }),
    prisma.stream.deleteMany({ where: { relayId: rid } }),
    prisma.job.deleteMany({ where: { relayId: rid } }),
    prisma.order.deleteMany({ where: { relayId: rid } }),
    prisma.clientOrder.deleteMany({ where: { relayId: rid } }),
    prisma.planChange.deleteMany({ where: { relayId: rid } }),
    prisma.relayPlanChange.deleteMany({ where: { relayId: rid } }),
    prisma.aclSource.deleteMany({ where: { relayId: rid } }),
  ]);

  // Delete allow/block lists and their entries
  const allowList = await prisma.allowList.findUnique({ where: { relayId: rid } });
  if (allowList) {
    await prisma.listEntryPubkey.deleteMany({ where: { AllowListId: allowList.id } });
    await prisma.listEntryKeyword.deleteMany({ where: { AllowListId: allowList.id } });
    await prisma.listEntryKind.deleteMany({ where: { AllowListId: allowList.id } });
    await prisma.allowList.delete({ where: { id: allowList.id } });
  }

  const blockList = await prisma.blockList.findUnique({ where: { relayId: rid } });
  if (blockList) {
    await prisma.listEntryPubkey.deleteMany({ where: { BlockListId: blockList.id } });
    await prisma.listEntryKeyword.deleteMany({ where: { BlockListId: blockList.id } });
    await prisma.listEntryKind.deleteMany({ where: { BlockListId: blockList.id } });
    await prisma.blockList.delete({ where: { id: blockList.id } });
  }

  await prisma.relay.delete({ where: { id: rid } });

  res.json({ success: true });
});

export default router;
