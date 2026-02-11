import prisma from "./prisma.js";
import { getEnv } from "./env.js";

let running = false;

/**
 * Polls LNBits for pending orders and marks them as paid when the invoice is settled.
 * When an order is paid, the relay status is set to "provision" to trigger cookiecutter.
 */
async function checkPendingPayments() {
  if (running) return;
  running = true;

  try {
    const env = getEnv();

    if (env.PAYMENTS_ENABLED !== "true" || !env.LNBITS_ADMIN_KEY || !env.LNBITS_INVOICE_READ_KEY || !env.LNBITS_ENDPOINT) {
      return;
    }

    const pendingOrders = await prisma.order.findMany({
      where: { paid: false, status: "pending" },
      include: { relay: true },
    });

    if (pendingOrders.length === 0) return;

    const LNBits = (await import("lnbits")).default;
    const { wallet } = LNBits({
      adminKey: env.LNBITS_ADMIN_KEY,
      invoiceReadKey: env.LNBITS_INVOICE_READ_KEY,
      endpoint: env.LNBITS_ENDPOINT,
    });

    for (const order of pendingOrders) {
      try {
        const status = await wallet.getInvoiceStatus({ payment_hash: order.payment_hash });

        // LNBits returns { paid: true } when the invoice is settled
        const isPaid = status?.paid === true || status?.details?.pending === false;

        if (isPaid) {
          console.log(`[paymentChecker] Order ${order.id} paid — provisioning relay ${order.relay?.name}`);

          await prisma.order.update({
            where: { id: order.id },
            data: { paid: true, status: "paid" },
          });

          // Set relay to provision if it hasn't been provisioned yet
          if (order.relay && (order.relay.status === null || order.relay.status === "pending")) {
            await prisma.relay.update({
              where: { id: order.relay.id },
              data: { status: "provision" },
            });
          }
        }
      } catch (err) {
        console.error(`[paymentChecker] Error checking order ${order.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[paymentChecker] Fatal error:", err);
  } finally {
    running = false;
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start the payment checker polling loop.
 * Checks every 10 seconds for pending payments.
 */
export function startPaymentChecker() {
  const env = getEnv();
  if (env.PAYMENTS_ENABLED !== "true") {
    console.log("[paymentChecker] Payments disabled — skipping");
    return;
  }

  console.log("[paymentChecker] Starting (10s interval)");
  // Run immediately, then every 10 seconds
  checkPendingPayments();
  intervalId = setInterval(checkPendingPayments, 10_000);
}

export function stopPaymentChecker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[paymentChecker] Stopped");
  }
}
