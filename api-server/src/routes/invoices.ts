import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { getEnv } from "../lib/env.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";

const router = Router();

const createInvoiceQuery = z.object({
  relayname: z.string().min(1).max(63),
  pubkey: z.string().min(1),
  plan: z.enum(["standard", "premium"]).default("standard"),
  referrer: z.string().optional().default(""),
  topup: z.string().optional(),
  sats: z.coerce.number().optional(),
});

/**
 * GET /invoices
 * Create a new relay reservation + invoice (or topup an existing relay).
 */
router.get("/", optionalAuth, validateQuery(createInvoiceQuery), async (req: Request, res: Response) => {
 try {
  const { relayname, pubkey, plan, referrer, topup, sats } = req.query as unknown as z.infer<typeof createInvoiceQuery>;
  const env = getEnv();

  // --- TOPUP FLOW ---
  if (topup === "true" && relayname) {
    const r = await prisma.relay.findFirst({
      where: { name: relayname },
      include: { owner: true },
    });

    if (!r) {
      res.status(404).json({ error: "relay not found" });
      return;
    }

    if (env.PAYMENTS_ENABLED === "true" && env.LNBITS_ADMIN_KEY && env.LNBITS_INVOICE_READ_KEY && env.LNBITS_ENDPOINT) {
      let useAmount = env.INVOICE_AMOUNT;
      let orderType = "standard";

      if (plan === "premium") {
        orderType = "premium";
        useAmount = env.INVOICE_PREMIUM_AMOUNT;
      }

      if (r.status != null && sats != null) {
        useAmount = sats;
        const standardAmount = env.INVOICE_AMOUNT;
        const premiumAmount = env.INVOICE_PREMIUM_AMOUNT;

        if (useAmount === standardAmount) {
          orderType = "standard";
        } else if (useAmount === premiumAmount) {
          orderType = "premium";
        } else {
          orderType = "custom";
        }
      }

      // Dynamic import for LNBits (it's a CJS module)
      const LNBits = (await import("lnbits")).default;
      const { wallet } = LNBits({
        adminKey: env.LNBITS_ADMIN_KEY,
        invoiceReadKey: env.LNBITS_INVOICE_READ_KEY,
        endpoint: env.LNBITS_ENDPOINT,
      });

      const newInvoice = await wallet.createInvoice({
        amount: useAmount,
        memo: relayname + " topup",
        out: false,
      });

      const usePaymentRequest = newInvoice.payment_request ?? newInvoice.bolt11 ?? "";

      const orderCreated = await prisma.order.create({
        data: {
          relayId: r.id,
          userId: r.owner.id,
          status: "pending",
          paid: false,
          payment_hash: newInvoice.payment_hash,
          lnurl: usePaymentRequest,
          amount: useAmount,
          order_type: orderType,
        },
      });

      res.json({ order_id: orderCreated.id });
      return;
    }
  }

  // --- NEW RELAY FLOW ---
  if (!pubkey) {
    res.status(400).json({ error: "not signed in or no pubkey" });
    return;
  }

  let user = await prisma.user.findFirst({ where: { pubkey } });
  if (!user) {
    user = await prisma.user.create({ data: { pubkey } });
  }

  if (!relayname) {
    res.status(400).json({ error: "enter a relay name" });
    return;
  }

  // Check if relay name is taken
  const existing = await prisma.relay.findFirst({ where: { name: relayname } });
  if (existing) {
    res.status(409).json({ error: "relay name already exists" });
    return;
  }

  // Validate LNBits config if payments enabled
  if (env.PAYMENTS_ENABLED === "true" && (!env.LNBITS_ADMIN_KEY || !env.LNBITS_INVOICE_READ_KEY || !env.LNBITS_ENDPOINT)) {
    res.status(500).json({ error: "payments enabled, but no lnbits vars found" });
    return;
  }

  let useAmount = env.INVOICE_AMOUNT;
  const useDomain = env.CREATOR_DOMAIN;

  // Find a free port
  const allRelays = await prisma.relay.findMany({
    where: { domain: useDomain },
    select: { port: true },
  });

  let p = 0;
  for (const r of allRelays) {
    if (r.port != null && r.port > p) p = r.port;
  }
  p = p + 1;
  if (p === 1) p = 7777;

  // Find available server IP
  const servers = await prisma.server.findMany({ where: { available: true } });
  let useIP = "127.0.0.1";
  if (servers.length > 0) useIP = servers[0].ip;

  // Create relay
  let useStatus: string | null = null;
  if (env.PAYMENTS_ENABLED !== "true") useStatus = "provision";

  const relayResult = await prisma.relay.create({
    data: {
      name: relayname,
      ownerId: user.id,
      domain: useDomain,
      created_at: new Date(),
      status: useStatus,
      port: p,
      ip: useIP,
      referrer: referrer || "",
      default_message_policy: false,
    },
  });

  await prisma.blockList.create({ data: { relayId: relayResult.id } });
  await prisma.allowList.create({ data: { relayId: relayResult.id } });

  if (!relayResult) {
    res.status(500).json({ error: "relay creation failed" });
    return;
  }

  // Payment flow
  if (env.PAYMENTS_ENABLED === "true" && env.LNBITS_ADMIN_KEY && env.LNBITS_INVOICE_READ_KEY && env.LNBITS_ENDPOINT) {
    const LNBits = (await import("lnbits")).default;
    const { wallet } = LNBits({
      adminKey: env.LNBITS_ADMIN_KEY,
      invoiceReadKey: env.LNBITS_INVOICE_READ_KEY,
      endpoint: env.LNBITS_ENDPOINT,
    });

    let orderType = "standard";
    if (plan === "premium") {
      orderType = "premium";
      useAmount = env.INVOICE_PREMIUM_AMOUNT;
    }

    const newInvoice = await wallet.createInvoice({
      amount: useAmount,
      memo: relayname + " " + pubkey,
      out: false,
    });

    const usePaymentRequest = newInvoice.payment_request ?? newInvoice.bolt11 ?? "";

    const orderCreated = await prisma.order.create({
      data: {
        relayId: relayResult.id,
        userId: user.id,
        status: "pending",
        paid: false,
        payment_hash: newInvoice.payment_hash,
        lnurl: usePaymentRequest,
        amount: useAmount,
        order_type: orderType,
      },
    });

    res.json({ order_id: orderCreated.id });
  } else {
    // No payments — auto-provision
    const orderCreated = await prisma.order.create({
      data: {
        relayId: relayResult.id,
        userId: user.id,
        status: "paid",
        paid: true,
        payment_hash: "0000",
        lnurl: "0000",
      },
    });

    res.json({ order_id: orderCreated.id });
  }
 } catch (err: any) {
    console.error("POST /invoices error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

/**
 * GET /invoices/:id
 * Get invoice/order details by ID.
 */
router.get("/:id", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      relay: {
        select: {
          id: true,
          name: true,
          domain: true,
          created_at: true,
          status: true,
        },
      },
    },
  });

  if (!order) {
    res.status(404).json({ error: "order not found" });
    return;
  }

  res.json({ order });
});

export default router;
