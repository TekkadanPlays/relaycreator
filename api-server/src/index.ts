import "dotenv/config";

import express from "express";

import cors from "cors";

import helmet from "helmet";

import path from "path";

import { fileURLToPath } from "url";

import { loadEnv } from "./lib/env.js";

import authRoutes from "./routes/auth.js";


import relayRoutes from "./routes/relays.js";

import sconfigRoutes from "./routes/sconfig.js";

import nip86Routes from "./routes/nip86.js";


import adminRoutes from "./routes/admin.js";

import healthRoutes from "./routes/health.js";

import permissionsRoutes from "./routes/permissions.js";


import nostrFetchRoutes from "./routes/nostr-fetch.js";

import nip05Routes from "./routes/nip05.js";




const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);



const env = loadEnv();



const app = express();



// Security middleware — relax CSP for SPA static assets

app.use(helmet({

  contentSecurityPolicy: false,

}));

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

app.use(express.json());

app.use(express.text({ type: "application/nostr+json+rpc" }));



// ─── Subdomain resolution middleware ─────────────────────────────────────────
// Detects subdomains like coracle.mycelium.social and rewrites to /relays/coracle
import prisma from "./lib/prisma.js";

app.use(async (req, _res, next) => {
  const host = req.hostname?.toLowerCase();
  const domain = env.CREATOR_DOMAIN.toLowerCase();

  if (!host || host === domain || host === "localhost" || host.match(/^(127\.|10\.|192\.168\.|0\.0\.0\.0)/)) {
    return next();
  }

  // Extract subdomain: "coracle.mycelium.social" → "coracle"
  if (host.endsWith(`.${domain}`)) {
    const subdomain = host.slice(0, -(domain.length + 1));
    if (subdomain && !subdomain.includes(".")) {
      // Attach subdomain info for downstream handlers
      (req as any).relaySubdomain = subdomain;
      (req as any).relayHost = host;
    }
  }
  next();
});

// ─── .well-known/nostr.json (NIP-05) ────────────────────────────────────────
app.get("/.well-known/nostr.json", async (req, res) => {
  const host = ((req as any).relayHost || req.hostname || env.CREATOR_DOMAIN).toLowerCase();
  const name = req.query.name as string | undefined;

  try {
    const where: any = { domain: host };
    if (name) where.name = name;

    const nip05s = await prisma.nip05.findMany({
      where,
      include: { relayUrls: true },
    });

    const names: Record<string, string> = {};
    const relays: Record<string, string[]> = {};

    for (const entry of nip05s) {
      names[entry.name] = entry.pubkey;
      relays[entry.pubkey] = entry.relayUrls.map((r) => r.url);
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json({ names, relays });
  } catch (err) {
    console.error("[nip05] .well-known/nostr.json error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// Health check

app.get("/health", (_req, res) => {

  res.json({ status: "ok", timestamp: new Date().toISOString() });

});



// Public config endpoint (non-sensitive settings for the frontend)

app.get("/api/config", (_req, res) => {

  res.json({

    domain: env.CREATOR_DOMAIN,

    payments_enabled: env.PAYMENTS_ENABLED === "true",

    coinos_enabled: env.COINOS_ENABLED === "true",

    wallet_enabled: env.WALLET_ENABLED === "true",

    invoice_amount: env.INVOICE_AMOUNT,

    invoice_premium_amount: env.INVOICE_PREMIUM_AMOUNT,

  });

});



// API routes (prefixed with /api in production)

app.use("/api/auth", authRoutes);


app.use("/api/relays", relayRoutes);

app.use("/api/sconfig", sconfigRoutes);



// Also mount without /api prefix for backward compatibility with sconfig daemons

app.use("/auth", authRoutes);

app.use("/sconfig", sconfigRoutes);



// Mount sconfig relay sub-routes at /api/relay for cookiecutter daemon compatibility

// cookiecutter calls: PUT /api/relay/:id/status, GET /api/relay/:id/strfry, GET /api/relay/:id/nostrjson

app.use("/api", sconfigRoutes);



// Admin panel API

app.use("/api/admin", adminRoutes);

app.use("/api/admin", healthRoutes);



// Permissions system

app.use("/api/permissions", permissionsRoutes);






// Server-side Nostr fetching (profile, relay lists via WSS to indexers)

app.use("/api/nostr", nostrFetchRoutes);

// NIP-05 identity management
app.use("/api/nip05", nip05Routes);



// NIP-86 relay management (used by Nostr clients)

app.use("/api/86", nip86Routes);

app.use("/86", nip86Routes);



// Serve SPA static files in production

const spaDistPath = path.resolve(__dirname, "../../web/dist");

app.use("/rc", express.static(spaDistPath));

app.use(express.static(spaDistPath));



// SPA fallback: any non-API route serves index.html for client-side routing

// Express 5 uses path-to-regexp v8 which requires named wildcards

app.get("/{*splat}", (_req, res, next) => {

  // Don't serve index.html for API routes or .well-known

  if (_req.path.startsWith("/api/") || _req.path.startsWith("/sconfig/") || _req.path.startsWith("/auth/") || _req.path.startsWith("/.well-known/") || _req.path === "/health") {

    next();

    return;

  }

  // Subdomain resolution: redirect coracle.mycelium.social → /relays/coracle
  const subdomain = (_req as any).relaySubdomain;
  if (subdomain && _req.path === "/") {
    res.redirect(301, `/relays/${subdomain}`);
    return;
  }

  res.sendFile(path.join(spaDistPath, "index.html"));

});



// Global error handler

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {

  console.error("Unhandled error:", err);

  res.status(500).json({ error: "Internal server error" });

});



app.listen(env.PORT, () => {

  console.log(`relaycreator-api listening on port ${env.PORT}`);

  console.log(`Serving SPA from ${spaDistPath}`);

  console.log("[local mode] Payments disabled");

});



export default app;

