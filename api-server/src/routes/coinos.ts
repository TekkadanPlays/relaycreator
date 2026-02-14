import { Router, Request, Response } from "express";
import { getEnv } from "../lib/env.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * Proxy requests to the CoinOS server.
 * The frontend calls /api/coinos/* and we forward to the coinos-server.
 *
 * CoinOS is the banking layer of the stack — it supports:
 *   Lightning, Bitcoin on-chain, Liquid, Ecash (Cashu),
 *   internal transfers, accounts (sub-wallets), contacts,
 *   NWC apps, LNURL, Lightning addresses, and more.
 */

function coinosEnabled(_req: Request, res: Response, next: Function) {
  const env = getEnv();
  if (env.COINOS_ENABLED !== "true") {
    res.status(404).json({ error: "CoinOS integration is not enabled" });
    return;
  }
  next();
}

/** Build headers for proxied requests to CoinOS. Always includes x-api-key. */
function coinosHeaders(req?: Request): Record<string, string> {
  const env = getEnv();
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": env.COINOS_API_KEY,
  };
  const coinosToken = req?.headers?.["x-coinos-token"];
  if (coinosToken && typeof coinosToken === "string") {
    h["Authorization"] = `Bearer ${coinosToken}`;
  }
  return h;
}

/** Generic proxy: GET with auth */
function proxyGet(path: string, auth = true) {
  const mw = auth ? [coinosEnabled, requireAuth] : [coinosEnabled];
  router.get(path, ...mw, async (req: Request, res: Response) => {
    const env = getEnv();
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(req.query)) {
        if (v !== undefined && v !== null) qs.set(k, String(v));
      }
      const qsStr = qs.toString();
      const url = `${env.COINOS_ENDPOINT}${path.replace(/:(\w+)/g, (_, p) => req.params[p])}${qsStr ? `?${qsStr}` : ""}`;
      const response = await fetch(url, {
        headers: auth ? coinosHeaders(req) : { "x-api-key": env.COINOS_API_KEY, "Content-Type": "application/json" },
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch {
      res.status(502).json({ error: "Failed to connect to CoinOS server" });
    }
  });
}

/** Generic proxy: POST with auth */
function proxyPost(path: string, auth = true) {
  const mw = auth ? [coinosEnabled, requireAuth] : [coinosEnabled];
  router.post(path, ...mw, async (req: Request, res: Response) => {
    const env = getEnv();
    try {
      const url = `${env.COINOS_ENDPOINT}${path.replace(/:(\w+)/g, (_, p) => req.params[p])}`;
      const response = await fetch(url, {
        method: "POST",
        headers: auth ? coinosHeaders(req) : coinosHeaders(),
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch {
      res.status(502).json({ error: "Failed to connect to CoinOS server" });
    }
  });
}

// ─── Health & Rates ─────────────────────────────────────────────────────────
router.get("/status", coinosEnabled, async (_req: Request, res: Response) => {
  const env = getEnv();
  const bitcoinInfo = {
    bitcoin_implementation: env.BITCOIN_IMPLEMENTATION,
    bitcoin_pruned: env.BITCOIN_PRUNED === "true",
  };
  try {
    const response = await fetch(`${env.COINOS_ENDPOINT}/health`, {
      headers: { "x-api-key": env.COINOS_API_KEY },
    });
    if (response.ok) {
      const data = await response.json() as Record<string, unknown>;
      res.json({ enabled: true, healthy: true, ...data, ...bitcoinInfo });
    } else {
      res.json({ enabled: true, healthy: false, status: response.status, ...bitcoinInfo });
    }
  } catch {
    res.json({ enabled: true, healthy: false, error: "Connection refused", ...bitcoinInfo });
  }
});

proxyGet("/rates", false);

// ─── Auth ───────────────────────────────────────────────────────────────────
proxyGet("/challenge", false);
proxyPost("/nostrAuth", false);
proxyPost("/register", true);
proxyPost("/login", false);

// ─── User ───────────────────────────────────────────────────────────────────
proxyGet("/me");
proxyPost("/user");                    // update user settings
proxyGet("/credits");                  // fee credits per network
proxyGet("/users/:key", false);        // lookup user by username/npub

// ─── Payments ───────────────────────────────────────────────────────────────
proxyGet("/payments");                 // list (supports limit, offset, start, end, aid)
proxyPost("/payments");                // send payment (Lightning invoice or internal hash)
proxyGet("/payments/:hash");           // get single payment detail
proxyPost("/parse");                   // decode a Lightning invoice
proxyPost("/send");                    // internal transfer by username
proxyPost("/send/:lnaddress/:amount"); // pay a Lightning address

// ─── Invoices ───────────────────────────────────────────────────────────────
proxyPost("/invoice");                 // create invoice
proxyGet("/invoice/:id", false);       // get invoice (public)
proxyGet("/invoices");                 // list user's invoices

// ─── Accounts (sub-wallets) ─────────────────────────────────────────────────
proxyGet("/accounts");                 // list accounts
proxyPost("/accounts");                // create account
proxyGet("/account/:id");              // get single account
proxyPost("/account/:id");             // update account
proxyPost("/account/delete");          // delete account

// ─── Contacts ───────────────────────────────────────────────────────────────
proxyGet("/contacts");                 // list contacts (recent payment counterparties)
proxyGet("/contacts/:limit");          // list contacts with limit

// ─── Pins & Trust ───────────────────────────────────────────────────────────
proxyPost("/pins");                    // pin a contact
proxyPost("/pins/delete");             // unpin a contact
proxyGet("/trust");                    // list trusted contacts
proxyPost("/trust");                   // trust a contact
proxyPost("/trust/delete");            // untrust a contact

// ─── NWC Apps ───────────────────────────────────────────────────────────────
proxyGet("/apps");                     // list NWC apps
proxyGet("/app/:pubkey");              // get single app
proxyPost("/app");                     // create/update app
proxyPost("/apps/delete");             // delete app

// ─── Ecash (Cashu) ─────────────────────────────────────────────────────────
proxyPost("/claim");                   // claim ecash token
proxyPost("/mint");                    // mint ecash
proxyPost("/cash");                    // save ecash token
proxyGet("/cash/:id/:version", false); // get ecash token

// ─── Node Info ──────────────────────────────────────────────────────────────
proxyGet("/info");                     // Lightning node info

// ─── Funds (shared wallets) ─────────────────────────────────────────────────
proxyGet("/fund/:id", false);          // get fund info
proxyGet("/fund/:name/managers", false); // list fund managers
proxyPost("/fund/managers");           // add fund manager
proxyPost("/fund/:name/managers/delete"); // remove fund manager
proxyPost("/authorize");               // authorize fund withdrawal
proxyPost("/take");                    // withdraw from fund

export default router;
