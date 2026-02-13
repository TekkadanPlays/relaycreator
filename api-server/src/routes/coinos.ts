import { Router, Request, Response } from "express";
import { getEnv } from "../lib/env.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * Proxy requests to the CoinOS server.
 * All routes require authentication and COINOS_ENABLED=true.
 * The frontend calls /api/coinos/* and we forward to the coinos-server.
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

// GET /api/coinos/status — check if coinos is enabled and reachable
router.get("/status", coinosEnabled, async (_req: Request, res: Response) => {
  const env = getEnv();
  try {
    const response = await fetch(`${env.COINOS_ENDPOINT}/health`, {
      headers: { "x-api-key": env.COINOS_API_KEY },
    });
    if (response.ok) {
      const data = await response.json() as Record<string, unknown>;
      res.json({ enabled: true, healthy: true, ...data });
    } else {
      res.json({ enabled: true, healthy: false, status: response.status });
    }
  } catch {
    res.json({ enabled: true, healthy: false, error: "Connection refused" });
  }
});

// POST /api/coinos/register — create a CoinOS account
router.post("/register", coinosEnabled, requireAuth, async (req: Request, res: Response) => {
  const env = getEnv();
  try {
    const response = await fetch(`${env.COINOS_ENDPOINT}/register`, {
      method: "POST",
      headers: coinosHeaders(req),
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err: any) {
    res.status(502).json({ error: "Failed to connect to CoinOS server" });
  }
});

// POST /api/coinos/login — login to CoinOS
router.post("/login", coinosEnabled, async (req: Request, res: Response) => {
  const env = getEnv();
  try {
    const response = await fetch(`${env.COINOS_ENDPOINT}/login`, {
      method: "POST",
      headers: coinosHeaders(req),
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err: any) {
    res.status(502).json({ error: "Failed to connect to CoinOS server" });
  }
});

// GET /api/coinos/me — get current CoinOS user info
router.get("/me", coinosEnabled, requireAuth, async (req: Request, res: Response) => {
  const env = getEnv();
  try {
    const response = await fetch(`${env.COINOS_ENDPOINT}/me`, {
      headers: coinosHeaders(req),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err: any) {
    res.status(502).json({ error: "Failed to connect to CoinOS server" });
  }
});

// GET /api/coinos/payments — list payments (supports limit, offset, start, end, aid)
router.get("/payments", coinosEnabled, requireAuth, async (req: Request, res: Response) => {
  const env = getEnv();
  const qs = new URLSearchParams();
  for (const key of ["limit", "offset", "start", "end", "aid"]) {
    if (req.query[key]) qs.set(key, String(req.query[key]));
  }
  const qsStr = qs.toString();
  try {
    const response = await fetch(`${env.COINOS_ENDPOINT}/payments${qsStr ? `?${qsStr}` : ""}`, {
      headers: coinosHeaders(req),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err: any) {
    res.status(502).json({ error: "Failed to connect to CoinOS server" });
  }
});

// POST /api/coinos/invoice — create a Lightning invoice via CoinOS
router.post("/invoice", coinosEnabled, requireAuth, async (req: Request, res: Response) => {
  const env = getEnv();
  try {
    const response = await fetch(`${env.COINOS_ENDPOINT}/invoice`, {
      method: "POST",
      headers: coinosHeaders(req),
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err: any) {
    res.status(502).json({ error: "Failed to connect to CoinOS server" });
  }
});

// POST /api/coinos/payments — send a payment via CoinOS
router.post("/payments", coinosEnabled, requireAuth, async (req: Request, res: Response) => {
  const env = getEnv();
  try {
    const response = await fetch(`${env.COINOS_ENDPOINT}/payments`, {
      method: "POST",
      headers: coinosHeaders(req),
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err: any) {
    res.status(502).json({ error: "Failed to connect to CoinOS server" });
  }
});

// GET /api/coinos/info — get node info
router.get("/info", coinosEnabled, requireAuth, async (req: Request, res: Response) => {
  const env = getEnv();
  try {
    const response = await fetch(`${env.COINOS_ENDPOINT}/info`, {
      headers: coinosHeaders(req),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err: any) {
    res.status(502).json({ error: "Failed to connect to CoinOS server" });
  }
});

// GET /api/coinos/challenge — get a challenge for Nostr auth
router.get("/challenge", coinosEnabled, async (_req: Request, res: Response) => {
  const env = getEnv();
  try {
    const response = await fetch(`${env.COINOS_ENDPOINT}/challenge`, {
      headers: { "x-api-key": env.COINOS_API_KEY },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err: any) {
    res.status(502).json({ error: "Failed to connect to CoinOS server" });
  }
});

// POST /api/coinos/nostrAuth — authenticate with a signed Nostr event
router.post("/nostrAuth", coinosEnabled, async (req: Request, res: Response) => {
  const env = getEnv();
  try {
    const outHeaders = coinosHeaders();
    const outBody = JSON.stringify(req.body);
    console.log("[nostrAuth] -> CoinOS", env.COINOS_ENDPOINT + "/nostrAuth");
    console.log("[nostrAuth] headers:", JSON.stringify(outHeaders));
    console.log("[nostrAuth] body keys:", Object.keys(req.body || {}));
    console.log("[nostrAuth] body length:", outBody.length);
    console.log("[nostrAuth] challenge:", req.body?.challenge);
    console.log("[nostrAuth] event.kind:", req.body?.event?.kind);
    console.log("[nostrAuth] event.pubkey:", req.body?.event?.pubkey?.substring(0, 16) + "...");
    console.log("[nostrAuth] event.tags:", JSON.stringify(req.body?.event?.tags));
    console.log("[nostrAuth] event.id:", req.body?.event?.id?.substring(0, 16) + "...");
    console.log("[nostrAuth] event has sig:", !!req.body?.event?.sig);
    const response = await fetch(`${env.COINOS_ENDPOINT}/nostrAuth`, {
      method: "POST",
      headers: outHeaders,
      body: outBody,
    });
    const text = await response.text();
    console.log("[nostrAuth] <- CoinOS status:", response.status, "body:", text.substring(0, 500));
    try {
      const data = JSON.parse(text);
      res.status(response.status).json(data);
    } catch {
      res.status(response.status).send(text);
    }
  } catch (err: any) {
    console.error("[nostrAuth] proxy error:", err.message);
    res.status(502).json({ error: "Failed to connect to CoinOS server" });
  }
});

// GET /api/coinos/rates — get exchange rates
router.get("/rates", coinosEnabled, async (_req: Request, res: Response) => {
  const env = getEnv();
  try {
    const response = await fetch(`${env.COINOS_ENDPOINT}/rates`, {
      headers: { "x-api-key": env.COINOS_API_KEY },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err: any) {
    res.status(502).json({ error: "Failed to connect to CoinOS server" });
  }
});

export default router;
