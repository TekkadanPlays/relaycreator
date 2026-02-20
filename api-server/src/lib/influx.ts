import { InfluxDB } from "@influxdata/influxdb-client";
import { getEnv } from "./env.js";

let client: InfluxDB | null = null;

export function getInfluxClient(): InfluxDB | null {
  const env = getEnv();
  if (!env.INFLUXDB_URL || !env.INFLUXDB_TOKEN) return null;
  if (!client) {
    client = new InfluxDB({ url: env.INFLUXDB_URL, token: env.INFLUXDB_TOKEN });
  }
  return client;
}

export function influxEnabled(): boolean {
  const env = getEnv();
  return !!(env.INFLUXDB_URL && env.INFLUXDB_TOKEN && env.INFLUXDB_ORG && env.INFLUXDB_BUCKET);
}

export async function queryInflux<T = Record<string, unknown>>(flux: string): Promise<T[]> {
  const env = getEnv();
  const db = getInfluxClient();
  if (!db || !env.INFLUXDB_ORG) return [];
  const api = db.getQueryApi(env.INFLUXDB_ORG);
  return api.collectRows<T>(flux);
}
