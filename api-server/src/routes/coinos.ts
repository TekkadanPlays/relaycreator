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

// GET /api/coinos/status — check if coinos is enabled and reachable
router.get("/status", coinosEnabled, async (_req: Request, res: Response) => {
  const env = getEnv();
  try {
    const response = await fetch(`${env.COINOS_ENDPOINT}/health`);
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
  const coinosToken = req.headers["x-coinos-token"];
  try {
    const response = await fetch(`${env.COINOS_ENDPOINT}/me`, {
      headers: {
        "Content-Type": "application/json",
        ...(coinosToken ? { Authorization: `Bearer ${coinosToken}` } : {}),
      },
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
  const coinosToken = req.headers["x-coinos-token"];
  const qs = new URLSearchParams();
  for (const key of ["limit", "offset", "start", "end", "aid"]) {
    if (req.query[key]) qs.set(key, String(req.query[key]));
  }
  const qsStr = qs.toString();
  try {
    const response = await fetch(`${env.COINOS_ENDPOINT}/payments${qsStr ? `?${qsStr}` : ""}`, {
      headers: {
        "Content-Type": "application/json",
        ...(coinosToken ? { Authorization: `Bearer ${coinosToken}` } : {}),
      },
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
  const coinosToken = req.headers["x-coinos-token"];
  try {
    const response = await fetch(`${env.COINOS_ENDPOINT}/invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(coinosToken ? { Authorization: `Bearer ${coinosToken}` } : {}),
      },
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
  const coinosToken = req.headers["x-coinos-token"];
  try {
    const response = await fetch(`${env.COINOS_ENDPOINT}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(coinosToken ? { Authorization: `Bearer ${coinosToken}` } : {}),
      },
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
  const coinosToken = req.headers["x-coinos-token"];
  try {
    const response = await fetch(`${env.COINOS_ENDPOINT}/info`, {
      headers: {
        "Content-Type": "application/json",
        ...(coinosToken ? { Authorization: `Bearer ${coinosToken}` } : {}),
      },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err: any) {
    res.status(502).json({ error: "Failed to connect to CoinOS server" });
  }
});

// GET /api/coinos/rates — get exchange rates
router.get("/rates", coinosEnabled, async (_req: Request, res: Response) => {
  const env = getEnv();
  try {
    const response = await fetch(`${env.COINOS_ENDPOINT}/rates`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err: any) {
    res.status(502).json({ error: "Failed to connect to CoinOS server" });
  }
});

export default router;
