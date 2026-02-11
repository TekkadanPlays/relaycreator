import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { loadEnv } from "./lib/env.js";
import authRoutes from "./routes/auth.js";
import invoiceRoutes from "./routes/invoices.js";
import relayRoutes from "./routes/relays.js";
import sconfigRoutes from "./routes/sconfig.js";

const env = loadEnv();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/auth", authRoutes);
app.use("/invoices", invoiceRoutes);
app.use("/relays", relayRoutes);
app.use("/sconfig", sconfigRoutes);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(env.PORT, () => {
  console.log(`relaycreator-api listening on port ${env.PORT}`);
});

export default app;
