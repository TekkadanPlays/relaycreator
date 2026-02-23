import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getEnv } from "../lib/env.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);
const router = Router();

interface ServiceCheck {
  name: string;
  status: "ok" | "warn" | "error" | "unknown";
  message: string;
  latency?: number;
  details?: Record<string, any>;
}

async function ensureAdmin(req: Request, res: Response): Promise<boolean> {
  if (!req.auth) { res.status(401).json({ error: "Authentication required" }); return false; }
  const user = await prisma.user.findUnique({ where: { id: req.auth.userId } });
  if (!user?.admin) { res.status(403).json({ error: "Admin access required" }); return false; }
  return true;
}

async function checkDatabase(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const result = await prisma.$queryRaw<any[]>`SELECT 1 as ok`;
    const latency = Date.now() - start;
    const [relayCount, userCount, runningCount, provisionCount] = await Promise.all([
      prisma.relay.count(),
      prisma.user.count(),
      prisma.relay.count({ where: { status: "running" } }),
      prisma.relay.count({ where: { status: "provision" } }),
    ]);
    return {
      name: "MariaDB",
      status: "ok",
      message: `Connected (${latency}ms)`,
      latency,
      details: { relays: relayCount, users: userCount, running: runningCount, provisioning: provisionCount },
    };
  } catch (err: any) {
    return { name: "MariaDB", status: "error", message: err.message || "Connection failed", latency: Date.now() - start };
  }
}

async function checkStrfry(): Promise<ServiceCheck> {
  const isWindows = process.platform === "win32";
  try {
    if (isWindows) {
      // Check if strfry is running inside WSL
      const { stdout } = await execAsync('wsl -d Ubuntu -- pgrep -x strfry 2>/dev/null || echo ""', { timeout: 5000 });
      const pid = stdout.trim();
      if (pid) {
        return { name: "strfry (WSL2)", status: "ok", message: `Running (PID ${pid})`, details: { pid, platform: "wsl2" } };
      }
      // Check if binary exists even if not running
      try {
        await execAsync('wsl -d Ubuntu -- test -f /usr/local/bin/strfry', { timeout: 3000 });
        return { name: "strfry (WSL2)", status: "warn", message: "Installed but not running", details: { platform: "wsl2" } };
      } catch {
        return { name: "strfry (WSL2)", status: "error", message: "Not installed in WSL2", details: { platform: "wsl2" } };
      }
    } else {
      // Linux: check native strfry
      const { stdout } = await execAsync('pgrep -x strfry 2>/dev/null || echo ""', { timeout: 3000 });
      const pid = stdout.trim();
      if (pid) {
        return { name: "strfry", status: "ok", message: `Running (PID ${pid})`, details: { pid, platform: "linux" } };
      }
      try {
        await execAsync('which strfry', { timeout: 2000 });
        return { name: "strfry", status: "warn", message: "Installed but not running", details: { platform: "linux" } };
      } catch {
        return { name: "strfry", status: "error", message: "Not installed", details: { platform: "linux" } };
      }
    }
  } catch (err: any) {
    return { name: "strfry", status: "unknown", message: err.message || "Check failed" };
  }
}

async function checkStrfryRelay(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    // Try WebSocket connection to strfry
    const relayUrl = "ws://localhost:7777";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch("http://localhost:7777", {
      headers: { Accept: "application/nostr+json" },
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeout);
    const latency = Date.now() - start;
    if (response && response.ok) {
      const info = await response.json().catch(() => null);
      return {
        name: "strfry relay",
        status: "ok",
        message: `Accepting connections (${latency}ms)`,
        latency,
        details: { url: relayUrl, nip11: info },
      };
    }
    return { name: "strfry relay", status: "warn", message: "Port open but no NIP-11 response", latency };
  } catch {
    return { name: "strfry relay", status: "error", message: "Not responding on ws://localhost:7777", latency: Date.now() - start };
  }
}

async function checkCertificates(): Promise<ServiceCheck> {
  const env = getEnv();
  const isWindows = process.platform === "win32";
  const homeDir = isWindows ? process.env.USERPROFILE || "" : process.env.HOME || "";
  const certsDir = path.join(homeDir, "relay-tools", "certs");

  try {
    const certPath = path.join(certsDir, "localhost.pem");
    const keyPath = path.join(certsDir, "localhost-key.pem");
    const bundlePath = path.join(certsDir, "bundle.pem");

    const certExists = fs.existsSync(certPath);
    const keyExists = fs.existsSync(keyPath);
    const bundleExists = fs.existsSync(bundlePath);

    if (certExists && keyExists) {
      const certStat = fs.statSync(certPath);
      const ageDays = Math.floor((Date.now() - certStat.mtimeMs) / (1000 * 60 * 60 * 24));
      return {
        name: "TLS Certificates",
        status: ageDays > 365 ? "warn" : "ok",
        message: certExists && keyExists && bundleExists ? `All present (${ageDays}d old)` : "Partial — missing bundle.pem",
        details: { cert: certExists, key: keyExists, bundle: bundleExists, ageDays, path: certsDir },
      };
    }
    return { name: "TLS Certificates", status: "error", message: "Certificates not found", details: { path: certsDir } };
  } catch (err: any) {
    return { name: "TLS Certificates", status: "unknown", message: err.message };
  }
}

async function checkRelayStatuses(): Promise<ServiceCheck> {
  try {
    const relays = await prisma.relay.findMany({
      select: { id: true, name: true, status: true, port: true, domain: true },
    });
    const byStatus: Record<string, number> = {};
    for (const r of relays) {
      const s = r.status || "null";
      byStatus[s] = (byStatus[s] || 0) + 1;
    }
    const stuck = relays.filter((r) => r.status === "provision");
    const status = stuck.length > 0 ? "warn" : relays.length === 0 ? "unknown" : "ok";
    const message = stuck.length > 0
      ? `${stuck.length} relay(s) stuck in 'provision' state`
      : `${relays.length} relay(s) total`;
    return {
      name: "Relay Fleet",
      status,
      message,
      details: { total: relays.length, byStatus, stuck: stuck.map((r) => ({ id: r.id, name: r.name, port: r.port })) },
    };
  } catch (err: any) {
    return { name: "Relay Fleet", status: "error", message: err.message };
  }
}

function checkApiServer(): ServiceCheck {
  const env = getEnv();
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();
  return {
    name: "API Server",
    status: "ok",
    message: `Running on port ${env.PORT}`,
    details: {
      port: env.PORT,
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      uptimeSeconds: Math.floor(uptime),
      memoryMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      nodeVersion: process.version,
      platform: process.platform,
      paymentsEnabled: env.PAYMENTS_ENABLED === "true",
      coinosEnabled: env.COINOS_ENABLED === "true",
      domain: env.CREATOR_DOMAIN,
    },
  };
}

/**
 * GET /admin/health
 * Comprehensive health check of all services.
 */
router.get("/health", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;

  const checks = await Promise.all([
    Promise.resolve(checkApiServer()),
    checkDatabase(),
    checkStrfry(),
    checkStrfryRelay(),
    checkCertificates(),
    checkRelayStatuses(),
  ]);

  const overall = checks.every((c) => c.status === "ok")
    ? "healthy"
    : checks.some((c) => c.status === "error")
      ? "degraded"
      : "warning";

  res.json({
    overall,
    timestamp: new Date().toISOString(),
    services: checks,
  });
});

/**
 * POST /admin/health/provision-stuck
 * Auto-provision stuck relays (set status from 'provision' to 'running').
 * Only works when payments are disabled (local mode).
 */
router.post("/health/provision-stuck", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;

  const env = getEnv();
  if (env.PAYMENTS_ENABLED === "true") {
    res.status(400).json({ error: "Cannot auto-provision when payments are enabled" });
    return;
  }

  const stuck = await prisma.relay.findMany({ where: { status: "provision" } });
  if (stuck.length === 0) {
    res.json({ message: "No stuck relays", count: 0 });
    return;
  }

  await prisma.relay.updateMany({
    where: { status: "provision" },
    data: { status: "running" },
  });

  res.json({ message: `Provisioned ${stuck.length} relay(s)`, count: stuck.length, relays: stuck.map((r) => r.name) });
});

export default router;
