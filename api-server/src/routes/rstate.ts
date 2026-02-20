import { Router, Request, Response } from "express";
import { getEnv } from "../lib/env.js";

const router = Router();

// rstate relay intelligence proxy
// Forwards requests to the local rstate instance (NIP-66 aggregation engine)
// rstate runs on a separate port and is not exposed publicly.

const RSTATE_TIMEOUT = 10000;

function getRstateUrl(): string {
  return getEnv().RSTATE_URL;
}

function getRstateFallbackUrl(): string {
  return getEnv().RSTATE_FALLBACK_URL;
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RSTATE_TIMEOUT);
  try {
    return await fetch(url, { ...init, signal: controller.signal, headers: { "Content-Type": "application/json", ...init?.headers } });
  } finally {
    clearTimeout(timer);
  }
}

async function proxy(path: string, init?: RequestInit): Promise<globalThis.Response> {
  // Try primary rstate URL
  try {
    const res = await fetchWithTimeout(`${getRstateUrl()}${path}`, init);
    if (res.ok) return res;
  } catch { /* fall through to fallback */ }

  // Try fallback (ribbit server's rstate proxy)
  const fallback = getRstateFallbackUrl();
  if (fallback) {
    try {
      const res = await fetchWithTimeout(`${fallback}${path}`, init);
      if (res.ok) return res;
    } catch { /* fall through to error */ }
  }

  return new globalThis.Response(JSON.stringify({ error: "rstate unavailable" }), {
    status: 502,
    headers: { "Content-Type": "application/json" },
  });
}

// GET /health — rstate health check
router.get("/health", async (_req: Request, res: Response) => {
  try {
    const r = await proxy("/health/ping");
    const data = await r.json();
    res.status(r.status).json(data);
  } catch { res.status(502).json({ error: "rstate unavailable" }); }
});

// GET /relays — list relays (paginated)
router.get("/relays", async (req: Request, res: Response) => {
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  try {
    const r = await proxy(`/relays${qs ? `?${qs}` : ""}`);
    const data = await r.json();
    res.status(r.status).json(data);
  } catch { res.status(502).json({ error: "rstate unavailable" }); }
});

// GET /relays/state — single relay state
router.get("/relays/state", async (req: Request, res: Response) => {
  const relayUrl = req.query.relayUrl as string;
  if (!relayUrl) { res.status(400).json({ error: "relayUrl required" }); return; }
  try {
    const r = await proxy(`/relays/state?relayUrl=${encodeURIComponent(relayUrl)}`);
    const data = await r.json();
    res.status(r.status).json(data);
  } catch { res.status(502).json({ error: "rstate unavailable" }); }
});

// POST /relays/search — search relays by filter
router.post("/relays/search", async (req: Request, res: Response) => {
  try {
    const r = await proxy("/relays/search", { method: "POST", body: JSON.stringify(req.body) });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch { res.status(502).json({ error: "rstate unavailable" }); }
});

// POST /relays/online — find online relays
router.post("/relays/online", async (req: Request, res: Response) => {
  try {
    const r = await proxy("/relays/online", { method: "POST", body: JSON.stringify(req.body) });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch { res.status(502).json({ error: "rstate unavailable" }); }
});

// GET /relays/by/software — group by software
router.get("/relays/by/software", async (_req: Request, res: Response) => {
  try {
    const r = await proxy("/relays/by/software");
    const data = await r.json();
    res.status(r.status).json(data);
  } catch { res.status(502).json({ error: "rstate unavailable" }); }
});

// GET /relays/by/nip — group by NIP support
router.get("/relays/by/nip", async (_req: Request, res: Response) => {
  try {
    const r = await proxy("/relays/by/nip");
    const data = await r.json();
    res.status(r.status).json(data);
  } catch { res.status(502).json({ error: "rstate unavailable" }); }
});

// GET /relays/by/country — group by country
router.get("/relays/by/country", async (_req: Request, res: Response) => {
  try {
    const r = await proxy("/relays/by/country");
    const data = await r.json();
    res.status(r.status).json(data);
  } catch { res.status(502).json({ error: "rstate unavailable" }); }
});

// POST /relays/nearby — geospatial search
router.post("/relays/nearby", async (req: Request, res: Response) => {
  try {
    const r = await proxy("/relays/nearby", { method: "POST", body: JSON.stringify(req.body) });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch { res.status(502).json({ error: "rstate unavailable" }); }
});

// GET /monitors — list monitors
router.get("/monitors", async (_req: Request, res: Response) => {
  try {
    const r = await proxy("/monitors");
    const data = await r.json();
    res.status(r.status).json(data);
  } catch { res.status(502).json({ error: "rstate unavailable" }); }
});

export default router;
