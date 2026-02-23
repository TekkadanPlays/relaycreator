export interface AdminRelay {
  id: string;
  name: string;
  domain: string | null;
  status: string | null;
  port: number | null;
  owner: { pubkey: string; name: string | null };
  _count: { Order: number };
}

export interface AdminUser {
  id: string;
  pubkey: string;
  name: string | null;
  admin: boolean;
  _count: { relays: number; orders: number };
}

export interface AdminOrder {
  id: string;
  amount: number;
  order_type: string;
  paid: boolean;
  paid_at: string | null;
  relay: { name: string; domain: string | null };
  user: { pubkey: string; name: string | null };
}

export interface MyRelay {
  id: string;
  name: string;
  domain: string | null;
  status: string | null;
  default_message_policy: boolean;
  auth_required: boolean;
  created_at: string | null;
}

export interface PermissionRequestItem {
  id: string;
  userId: string;
  type: string;
  status: string;
  reason: string | null;
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
  user: { id: string; pubkey: string; name: string | null; admin: boolean };
  decided_by?: { id: string; pubkey: string; name: string | null } | null;
}

export interface PermissionItem {
  id: string;
  userId: string;
  type: string;
  granted_at: string;
  granted_by: string | null;
  disclaimer_accepted: boolean;
  revoked_at: string | null;
  user: { id: string; pubkey: string; name: string | null; admin: boolean };
}

export interface PermissionTypeInfo {
  type: string;
  disclaimer: string;
}

export interface MyPermissionsData {
  permissions: { id: string; type: string; granted_at: string; disclaimer_accepted: boolean; revoked_at: string | null }[];
  requests: { id: string; type: string; status: string; reason: string | null; created_at: string; decided_at: string | null; decision_note: string | null }[];
}

export interface OverviewData {
  totalRelays: number;
  runningRelays: number;
  provisioningRelays: number;
  totalUsers: number;
  totalOrders: number;
  paidOrders: number;
  recentOrders: number;
  totalRevenue: number;
}

export interface CoinosStatus {
  enabled: boolean;
  healthy: boolean;
  consecutiveFailures?: number;
  lastSuccessTime?: number;
  lastFailureReason?: string;
  stalledCheck?: boolean;
  bitcoin_implementation?: string;
  bitcoin_pruned?: boolean;
  [key: string]: unknown;
}

export interface NodeInfoData {
  alias?: string;
  num_peers?: number;
  num_active_channels?: number;
  num_inactive_channels?: number;
  num_pending_channels?: number;
  block_height?: number;
  synced_to_chain?: boolean;
  synced_to_graph?: boolean;
  identity_pubkey?: string;
  pubkey?: string;
  version?: string;
  commit_hash?: string;
  network?: string;
  uris?: string[];
  best_header_timestamp?: number;
  chains?: { chain: string; network: string }[];
  [key: string]: unknown;
}

export interface CoinosPaymentItem {
  id: string;
  amount: number;
  fee?: number;
  ourfee?: number;
  tip?: number;
  memo?: string;
  hash?: string;
  type: string;
  created: number;
  ref?: string;
  confirmed?: boolean;
  rate?: number;
  currency?: string;
  with?: { id: string; username: string; picture?: string };
}

export interface CoinosPaymentsResponse {
  count: number;
  payments: CoinosPaymentItem[];
  incoming?: Record<string, { sats: number; fiat: string; tips: number; fiatTips: string }>;
  outgoing?: Record<string, { sats: number; fiat: string; tips: number; fiatTips: string }>;
}

export interface CoinosCreditsData {
  bitcoin: number;
  lightning: number;
  liquid: number;
}

export interface AdminInvoiceItem {
  id?: string;
  hash?: string;
  bolt11?: string;
  text?: string;
  amount: number;
  memo?: string;
  type?: string;
  created?: number;
  received?: boolean;
}

export interface FundManagerItem {
  id: string;
  username: string;
  pubkey?: string;
  picture?: string;
}

export type TabId = "overview" | "myrelays" | "relays" | "users" | "orders" | "permissions" | "coinos" | "demo" | "access";
