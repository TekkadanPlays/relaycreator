import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import { loadEnv } from "./lib/env.js";
import authRoutes from "./routes/auth.js";
import invoiceRoutes from "./routes/invoices.js";
import relayRoutes from "./routes/relays.js";
import sconfigRoutes from "./routes/sconfig.js";
import nip86Routes from "./routes/nip86.js";

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

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes (prefixed with /api in production)
app.use("/api/auth", authRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/relays", relayRoutes);
app.use("/api/sconfig", sconfigRoutes);

// Also mount without /api prefix for backward compatibility with sconfig daemons
app.use("/auth", authRoutes);
app.use("/sconfig", sconfigRoutes);

// Mount sconfig relay sub-routes at /api/relay for cookiecutter daemon compatibility
// cookiecutter calls: PUT /api/relay/:id/status, GET /api/relay/:id/strfry, GET /api/relay/:id/nostrjson
app.use("/api", sconfigRoutes);

// NIP-86 relay management (used by Nostr clients)
app.use("/api/86", nip86Routes);
app.use("/86", nip86Routes);

// Serve SPA static files in production
const spaDistPath = path.resolve(__dirname, "../../web/dist");
app.use(express.static(spaDistPath));

// SPA fallback: any non-API route serves index.html for client-side routing
// Express 5 uses path-to-regexp v8 which requires named wildcards
app.get("/{*splat}", (_req, res, next) => {
  // Don't serve index.html for API routes
  if (_req.path.startsWith("/api/") || _req.path.startsWith("/sconfig/") || _req.path.startsWith("/auth/") || _req.path === "/health") {
    next();
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
});

export default app;
