import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { ensureAdmin } from "../middleware/admin.js";
import { getEnv } from "../lib/env.js";
import { influxEnabled, queryInflux } from "../lib/influx.js";

const router = Router();

/**
 * GET /admin/stats/influx/platform
 * Platform-wide event counts over time (24h, 7d, 30d).
 */
router.get("/platform", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;
  if (!influxEnabled()) return res.json({ available: false, events: [], connections: [] });

  const env = getEnv();
  const range = req.query.range === "7d" ? "-7d" : req.query.range === "30d" ? "-30d" : "-24h";
  const window = range === "-24h" ? "1h" : range === "-7d" ? "6h" : "1d";

  try {
    const [events, connections] = await Promise.all([
      queryInflux(`
        from(bucket: "${env.INFLUXDB_BUCKET}")
          |> range(start: ${range})
          |> filter(fn: (r) => r["_measurement"] == "events1")
          |> filter(fn: (r) => r["_field"] == "allowed")
          |> group(columns: ["_measurement", "_field"])
          |> aggregateWindow(every: ${window}, fn: sum, createEmpty: true)
          |> yield(name: "sum")
      `),
      queryInflux(`
        from(bucket: "${env.INFLUXDB_BUCKET}")
          |> range(start: ${range})
          |> filter(fn: (r) => r["_measurement"] == "haproxy")
          |> filter(fn: (r) => r["_field"] == "h1_open_streams")
          |> group(columns: ["_measurement", "_field"])
          |> aggregateWindow(every: ${window}, fn: mean, createEmpty: true)
          |> yield(name: "mean")
      `),
    ]);
    res.json({ available: true, events, connections });
  } catch (e: any) {
    console.error("[InfluxDB] platform stats error:", e.message);
    res.json({ available: false, events: [], connections: [], error: e.message });
  }
});

/**
 * GET /admin/stats/influx/relay/:slug
 * Per-relay event + connection stats.
 */
router.get("/relay/:slug", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;
  if (!influxEnabled()) return res.json({ available: false });

  const env = getEnv();
  const { slug } = req.params;
  const range = req.query.range === "7d" ? "-7d" : req.query.range === "30d" ? "-30d" : "-24h";
  const window = range === "-24h" ? "1h" : range === "-7d" ? "6h" : "1d";

  try {
    const [events, blocked, connections, kinds] = await Promise.all([
      queryInflux(`
        from(bucket: "${env.INFLUXDB_BUCKET}")
          |> range(start: ${range})
          |> filter(fn: (r) => r["_measurement"] == "events1")
          |> filter(fn: (r) => r["_field"] == "allowed")
          |> filter(fn: (r) => r["relay"] == "${slug}")
          |> group(columns: ["_measurement", "_field", "kind"])
          |> aggregateWindow(every: ${window}, fn: sum, createEmpty: false)
          |> yield(name: "sum")
      `),
      queryInflux(`
        from(bucket: "${env.INFLUXDB_BUCKET}")
          |> range(start: ${range})
          |> filter(fn: (r) => r["_measurement"] == "events1")
          |> filter(fn: (r) => r["_field"] == "blocked")
          |> filter(fn: (r) => r["relay"] == "${slug}")
          |> group(columns: ["_measurement", "_field"])
          |> aggregateWindow(every: ${window}, fn: sum, createEmpty: false)
          |> yield(name: "sum")
      `),
      queryInflux(`
        from(bucket: "${env.INFLUXDB_BUCKET}")
          |> range(start: ${range})
          |> filter(fn: (r) => r["_measurement"] == "haproxy")
          |> filter(fn: (r) => r["_field"] == "h1_open_streams")
          |> filter(fn: (r) => r["proxy"] == "${slug}")
          |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
          |> yield(name: "mean")
      `),
      queryInflux(`
        from(bucket: "${env.INFLUXDB_BUCKET}")
          |> range(start: ${range})
          |> filter(fn: (r) => r["_measurement"] == "events1")
          |> filter(fn: (r) => r["_field"] == "allowed")
          |> filter(fn: (r) => r["relay"] == "${slug}")
          |> group(columns: ["kind"])
          |> sum()
          |> filter(fn: (r) => r["_value"] > 0)
          |> yield(name: "sum")
      `),
    ]);
    res.json({ available: true, events, blocked, connections, kinds });
  } catch (e: any) {
    console.error("[InfluxDB] relay stats error:", slug, e.message);
    res.json({ available: false, error: e.message });
  }
});

/**
 * GET /admin/stats/influx/top-relays
 * Top relays by event count in the last 24h.
 */
router.get("/top-relays", requireAuth, async (req: Request, res: Response) => {
  if (!(await ensureAdmin(req, res))) return;
  if (!influxEnabled()) return res.json({ available: false, relays: [] });

  const env = getEnv();
  try {
    const rows = await queryInflux(`
      from(bucket: "${env.INFLUXDB_BUCKET}")
        |> range(start: -24h)
        |> filter(fn: (r) => r["_measurement"] == "events1")
        |> filter(fn: (r) => r["_field"] == "allowed")
        |> group(columns: ["relay"])
        |> sum()
        |> group()
        |> sort(columns: ["_value"], desc: true)
        |> limit(n: 10)
        |> yield(name: "top")
    `);
    res.json({ available: true, relays: rows });
  } catch (e: any) {
    console.error("[InfluxDB] top-relays error:", e.message);
    res.json({ available: false, relays: [], error: e.message });
  }
});

export default router;
