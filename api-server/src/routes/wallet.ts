import { Router, Request, Response } from "express";
import { getEnv } from "../lib/env.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * New Wallet API - replaces CoinOS integration
 * Uses the high-performance Rust wallet service with Rusqlite backend
 */

function walletEnabled(_req: Request, res: Response, next: Function) {
  const env = getEnv();
  if (env.WALLET_ENABLED !== "true") {
    res.status(404).json({ error: "Wallet service is not enabled" });
    return;
  }
  next();
}

/** Build headers for requests to wallet service */
function walletHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
  };
}

/** Generic proxy: GET with auth */
function proxyGet(path: string, auth = true) {
  const mw = auth ? [walletEnabled, requireAuth] : [walletEnabled];
  router.get(path, ...mw, async (req: Request, res: Response) => {
    const env = getEnv();
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(req.query)) {
        if (v !== undefined && v !== null) qs.set(k, String(v));
      }
      const qsStr = qs.toString();
      const url = `${env.WALLET_SERVICE_URL}${path.replace(/:(\w+)/g, (_, p) => req.params[p])}${qsStr ? `?${qsStr}` : ""}`;
      const response = await fetch(url, {
        headers: walletHeaders(),
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch {
      res.status(502).json({ error: "Failed to connect to wallet service" });
    }
  });
}

/** Generic proxy: POST with auth */
function proxyPost(path: string, auth = true) {
  const mw = auth ? [walletEnabled, requireAuth] : [walletEnabled];
  router.post(path, ...mw, async (req: Request, res: Response) => {
    const env = getEnv();
    try {
      const url = `${env.WALLET_SERVICE_URL}${path.replace(/:(\w+)/g, (_, p) => req.params[p])}`;
      const response = await fetch(url, {
        method: "POST",
        headers: walletHeaders(),
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch {
      res.status(502).json({ error: "Failed to connect to wallet service" });
    }
  });
}

// ─── Health & Status ─────────────────────────────────────────────────────────
router.get("/status", walletEnabled, async (_req: Request, res: Response) => {
  const env = getEnv();
  const bitcoinInfo = {
    bitcoin_implementation: env.BITCOIN_IMPLEMENTATION,
    bitcoin_pruned: env.BITCOIN_PRUNED === "true",
  };
  try {
    const response = await fetch(`${env.WALLET_SERVICE_URL}/health`, {
      headers: walletHeaders(),
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

// ─── Users ─────────────────────────────────────────────────────────────────────
proxyGet("/users/:id");
proxyPost("/users");

// ─── Payments ───────────────────────────────────────────────────────────────────
proxyGet("/payments");
proxyPost("/payments");
proxyGet("/payments/:id");

// ─── Invoices ───────────────────────────────────────────────────────────────────
proxyPost("/invoices");
proxyGet("/invoices/:id");

// ─── Balance ───────────────────────────────────────────────────────────────────
proxyGet("/balance/:user_id");

// ─── Accounts (sub-wallets) ─────────────────────────────────────────────────
proxyGet("/accounts");
proxyPost("/accounts");
proxyGet("/accounts/:id");
proxyPost("/accounts/:id");

// ─── Bitcoin Integration ───────────────────────────────────────────────────────
router.post("/bitcoin/send", walletEnabled, requireAuth, async (req: Request, res: Response) => {
  const env = getEnv();
  try {
    const { address, amount } = req.body;
    
    // Call Bitcoin RPC directly
    const bitcoinRpc = {
      jsonrpc: "2.0",
      id: "1",
      method: "sendtoaddress",
      params: [address, amount],
    };
    
    const response = await fetch(env.BITCOIN_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(`${env.BITCOIN_RPC_USER}:${env.BITCOIN_RPC_PASS}`).toString("base64")}`,
      },
      body: JSON.stringify(bitcoinRpc),
    });
    
    const data = await response.json() as any;
    
    if (data.error) {
      res.status(400).json({ error: data.error.message });
    } else {
      res.json({ txid: data.result });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to send Bitcoin transaction" });
  }
});

router.get("/bitcoin/address", walletEnabled, requireAuth, async (_req: Request, res: Response) => {
  const env = getEnv();
  try {
    const bitcoinRpc = {
      jsonrpc: "2.0",
      id: "1",
      method: "getnewaddress",
      params: [],
    };
    
    const response = await fetch(env.BITCOIN_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(`${env.BITCOIN_RPC_USER}:${env.BITCOIN_RPC_PASS}`).toString("base64")}`,
      },
      body: JSON.stringify(bitcoinRpc),
    });
    
    const data = await response.json() as any;
    
    if (data.error) {
      res.status(400).json({ error: data.error.message });
    } else {
      res.json({ address: data.result });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to generate Bitcoin address" });
  }
});

router.get("/bitcoin/balance", walletEnabled, requireAuth, async (_req: Request, res: Response) => {
  const env = getEnv();
  try {
    const bitcoinRpc = {
      jsonrpc: "2.0",
      id: "1",
      method: "getbalance",
      params: [],
    };
    
    const response = await fetch(env.BITCOIN_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(`${env.BITCOIN_RPC_USER}:${env.BITCOIN_RPC_PASS}`).toString("base64")}`,
      },
      body: JSON.stringify(bitcoinRpc),
    });
    
    const data = await response.json() as any;
    
    if (data.error) {
      res.status(400).json({ error: data.error.message });
    } else {
      res.json({ balance: data.result });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to get Bitcoin balance" });
  }
});

export default router;
