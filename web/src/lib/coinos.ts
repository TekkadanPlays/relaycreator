import { api } from "./api";

export interface CoinosStatus {
  enabled: boolean;
  healthy: boolean;
  error?: string;
}

export interface CoinosPayment {
  id: string;
  amount: number;
  fee?: number;
  tip?: number;
  memo?: string;
  hash?: string;
  type: string;
  created: number;
  ref?: string;
  confirmed?: boolean;
}

export interface CoinosPaymentsResponse {
  count: number;
  payments: CoinosPayment[];
  incoming: number;
  outgoing: number;
}

export interface CoinosUser {
  id: string;
  username: string;
  pubkey?: string;
  balance: number;
  currency: string;
}

export interface CoinosInvoice {
  hash: string;
  amount: number;
  memo?: string;
  bolt11?: string;
  paymentHash?: string;
}

export interface NodeInfo {
  alias?: string;
  block_height?: number;
  pubkey?: string;
  network?: string;
}

/** Get the CoinOS JWT for the given pubkey (or the stored active pubkey). */
export function getCoinosToken(pubkey?: string): string | null {
  const pk = pubkey || localStorage.getItem("coinos_pubkey");
  if (!pk) return null;
  return localStorage.getItem(`coinos_token:${pk}`);
}

/** Store a CoinOS JWT keyed to a specific pubkey. */
export function setCoinosToken(pubkey: string, token: string) {
  localStorage.setItem(`coinos_token:${pubkey}`, token);
  localStorage.setItem("coinos_pubkey", pubkey);
}

/** Clear the CoinOS wallet session for the active pubkey. */
export function clearWalletSession() {
  const pk = localStorage.getItem("coinos_pubkey");
  if (pk) localStorage.removeItem(`coinos_token:${pk}`);
  localStorage.removeItem("coinos_pubkey");
  // Also clean up legacy key if present
  localStorage.removeItem("coinos_token");
}

/** Get the currently active NIP-07 pubkey, or null. */
export async function getActivePubkey(): Promise<string | null> {
  try {
    return (window as any).nostr?.getPublicKey() ?? null;
  } catch {
    return null;
  }
}

async function coinosRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const coinosToken = getCoinosToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(coinosToken ? { "x-coinos-token": coinosToken } : {}),
  };

  const res = await fetch(`/api/coinos${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const coinos = {
  status: () => coinosRequest<CoinosStatus>("/status"),
  
  challenge: () => coinosRequest<{ challenge: string }>("/challenge"),

  nostrAuth: (body: { challenge: string; event: any }) =>
    coinosRequest<{ user: CoinosUser; token: string }>("/nostrAuth", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  register: (body: { username: string; password: string }) =>
    coinosRequest<{ user: CoinosUser; token: string }>("/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: { username: string; password: string }) =>
    coinosRequest<{ user: CoinosUser; token: string }>("/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  me: () => coinosRequest<CoinosUser>("/me"),

  payments: (limit = 10, offset = 0) =>
    coinosRequest<CoinosPaymentsResponse>(`/payments?limit=${limit}&offset=${offset}`),

  paymentsLegacy: () => coinosRequest<CoinosPayment[]>("/payments"),

  logout: () => {
    clearWalletSession();
  },

  createInvoice: (body: { amount: number; memo?: string; type?: string }) =>
    coinosRequest<CoinosInvoice>("/invoice", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  sendPayment: (body: { amount: number; address?: string; memo?: string }) =>
    coinosRequest<CoinosPayment>("/payments", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  info: () => coinosRequest<NodeInfo>("/info"),

  rates: () => coinosRequest<Record<string, number>>("/rates"),
};
