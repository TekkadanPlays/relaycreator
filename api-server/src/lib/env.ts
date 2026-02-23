import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("*"),
  DEPLOY_PUBKEY: z.string().optional(),
  PAYMENTS_ENABLED: z.string().default("false"),
  LNBITS_ADMIN_KEY: z.string().optional(),
  LNBITS_INVOICE_READ_KEY: z.string().optional(),
  LNBITS_ENDPOINT: z.string().optional(),
  CREATOR_DOMAIN: z.string().default("mycelium.social"),
  INVOICE_AMOUNT: z.coerce.number().default(21),
  INVOICE_PREMIUM_AMOUNT: z.coerce.number().default(2100),
  INTERCEPTOR_PORT: z.coerce.number().default(9696),
  HAPROXY_STATS_USER: z.string().default("haproxy"),
  HAPROXY_STATS_PASS: z.string().default("haproxy"),
  HAPROXY_PEM: z.string().default("bundle.pem"),
  COINOS_ENABLED: z.string().default("false"),
  COINOS_ENDPOINT: z.string().default("http://127.0.0.1:3119"),
  COINOS_API_KEY: z.string().default("nStack"),
  BITCOIN_IMPLEMENTATION: z.string().default("Bitcoin Knots"),
  BITCOIN_PRUNED: z.string().default("true"),
  WALLET_ENABLED: z.string().default("false"),
  WALLET_SERVICE_URL: z.string().default("http://127.0.0.1:8080"),
  BITCOIN_RPC_URL: z.string().default("http://127.0.0.1:8332"),
  BITCOIN_RPC_USER: z.string().default("relaytools"),
  BITCOIN_RPC_PASS: z.string().default(""),
  RSTATE_URL: z.string().default("http://127.0.0.1:3100"),
  RSTATE_FALLBACK_URL: z.string().default(""),
  INFLUXDB_URL: z.string().optional(),
  INFLUXDB_TOKEN: z.string().optional(),
  INFLUXDB_ORG: z.string().optional(),
  INFLUXDB_BUCKET: z.string().optional(),
  ADMIN_PUBKEYS: z.string().default(""),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten().fieldErrors);
    process.exit(1);
  }
  env = result.data;
  return env;
}

export function getEnv(): Env {
  if (!env) throw new Error("Environment not loaded. Call loadEnv() first.");
  return env;
}
