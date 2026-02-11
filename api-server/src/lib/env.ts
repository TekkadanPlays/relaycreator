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
  CREATOR_DOMAIN: z.string().default("nostr1.com"),
  INVOICE_AMOUNT: z.coerce.number().default(21),
  INVOICE_PREMIUM_AMOUNT: z.coerce.number().default(2100),
  INTERCEPTOR_PORT: z.coerce.number().default(9696),
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
