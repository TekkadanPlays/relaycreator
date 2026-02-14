import { useState, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import {
  Radio, Users, Zap, Globe, Shield, Loader2, Settings, Server,
  ArrowRight, Trash2, Search, RefreshCw, Lock, ChevronDown,
  Activity, DollarSign, BarChart3, Eye, Copy, Check, X,
  Play, ExternalLink, Plus, Wallet, AlertTriangle, KeyRound,
  CheckCircle2, XCircle, Clock, ShieldCheck, Info,
  Bitcoin, ArrowUpRight, ArrowDownLeft, Hash, Cpu, TrendingUp,
  CircleDollarSign, Boxes, Network, Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRelayDomain } from "../hooks/useRelayDomain";
import { useHasPermission, useHasPermissionGranted } from "../hooks/usePermissions";
import { NostrIdentity } from "../components/NostrIdentity";

type Tab = "myrelays" | "overview" | "relays" | "users" | "orders" | "demo" | "coinos" | "permissions" | "request_access";
type PanelTier = "admin" | "operator" | "demo";

const ADMIN_TABS: { id: Tab; label: string; icon: typeof Globe }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "myrelays", label: "My Relays", icon: Zap },
  { id: "relays", label: "All Relays", icon: Radio },
  { id: "users", label: "Users", icon: Users },
  { id: "orders", label: "Orders", icon: DollarSign },
  { id: "permissions", label: "Permissions", icon: KeyRound },
  { id: "coinos", label: "CoinOS", icon: Wallet },
];

const OPERATOR_TABS: { id: Tab; label: string; icon: typeof Globe }[] = [
  { id: "myrelays", label: "My Relays", icon: Zap },
  { id: "request_access", label: "Request Access", icon: KeyRound },
];

const DEMO_TABS: { id: Tab; label: string; icon: typeof Globe }[] = [
  { id: "demo", label: "Live Demo", icon: Play },
  { id: "request_access", label: "Request Access", icon: KeyRound },
];

function usePanelTier(): PanelTier {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["myRelays"],
    queryFn: () => api.get<{ myRelays: any[]; moderatedRelays: any[] }>("/relays/mine"),
    enabled: !!user,
    staleTime: 60_000,
  });

  if (user?.admin) return "admin";
  const hasRelays = (data?.myRelays?.length ?? 0) > 0 || (data?.moderatedRelays?.length ?? 0) > 0;
  if (user && hasRelays) return "operator";
  return "demo";
}

interface Stats {
  totalRelays: number;
  runningRelays: number;
  provisioningRelays: number;
  totalUsers: number;
  totalOrders: number;
  paidOrders: number;
  recentOrders: number;
  totalRevenue: number;
}

interface AdminRelay {
  id: string;
  name: string;
  domain: string | null;
  status: string | null;
  ip: string | null;
  port: number | null;
  created_at: string | null;
  auth_required: boolean;
  default_message_policy: boolean;
  listed_in_directory: boolean;
  owner: { id: string; pubkey: string; name: string | null };
  moderators: { user: { pubkey: string } }[];
  _count: { Order: number; streams: number };
}

interface AdminUser {
  id: string;
  pubkey: string;
  name: string | null;
  admin: boolean;
  _count: { relays: number; orders: number };
}

interface AdminOrder {
  id: string;
  status: string;
  paid: boolean;
  amount: number;
  order_type: string;
  payment_hash: string;
  lnurl: string;
  paid_at: string | null;
  relay: { id: string; name: string; domain: string; status: string | null };
  user: { id: string; pubkey: string; name: string | null };
}

interface AdminConfig {
  domain: string;
  payments_enabled: boolean;
  coinos_enabled: boolean;
  lnbits_configured: boolean;
  invoice_amount: number;
  invoice_premium_amount: number;
  cors_origin: string;
  port: number;
}

export default function Admin() {
  const tier = usePanelTier();
  const defaultTab: Tab = tier === "admin" ? "overview" : tier === "operator" ? "myrelays" : "demo";
  const [tab, setTab] = useState<Tab>(defaultTab);

  const tabs = tier === "admin" ? ADMIN_TABS : tier === "operator" ? OPERATOR_TABS : DEMO_TABS;
  const TierIcon = tier === "admin" ? Shield : tier === "operator" ? Zap : Play;
  const tierTitle = tier === "admin" ? "Admin Panel" : tier === "operator" ? "My Relays" : "Live Demo";
  const tierSubtitle = tier === "admin" ? "Server Management" : tier === "operator" ? "Relay Operations" : "Explore the Platform";

  return (
    <div className="animate-in">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-56 shrink-0 space-y-4">
          <div className="flex items-center gap-2.5 px-1">
            <div className={cn(
              "size-9 rounded-lg flex items-center justify-center",
              tier === "admin" ? "bg-primary/10" : tier === "operator" ? "bg-amber-500/10" : "bg-emerald-500/10"
            )}>
              <TierIcon className={cn(
                "size-4.5",
                tier === "admin" ? "text-primary" : tier === "operator" ? "text-amber-400" : "text-emerald-400"
              )} />
            </div>
            <div>
              <h1 className="font-bold text-sm">{tierTitle}</h1>
              <p className="text-[11px] text-muted-foreground">{tierSubtitle}</p>
            </div>
          </div>

          <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                  tab === t.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <t.icon className="size-4 shrink-0" />
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {tab === "myrelays" && <MyRelaysTab />}
          {tab === "overview" && <OverviewTab />}
          {tab === "relays" && <RelaysTab />}
          {tab === "users" && <UsersTab />}
          {tab === "orders" && <OrdersTab />}
          {tab === "permissions" && <PermissionsTab />}
          {tab === "coinos" && <CoinosAdminTab />}
          {tab === "demo" && <DemoTab />}
          {tab === "request_access" && <RequestAccessTab />}
        </main>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OVERVIEW TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CoinosStatusOverview {
  enabled: boolean;
  healthy: boolean;
  bitcoin_implementation?: string;
  bitcoin_pruned?: boolean;
  [key: string]: unknown;
}

interface NodeInfoOverview {
  alias?: string;
  version?: string;
  block_height?: number;
  num_active_channels?: number;
  num_peers?: number;
  synced_to_chain?: boolean;
  [key: string]: unknown;
}

function OverviewTab() {
  const hasCoinosPermission = useHasPermission("coinos_admin");
  const queryClient = useQueryClient();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => api.get<Stats>("/admin/stats"),
  });

  const { data: relaysData } = useQuery({
    queryKey: ["admin", "relays"],
    queryFn: () => api.get<{ relays: AdminRelay[] }>("/admin/relays"),
    staleTime: 60_000,
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => api.get<{ users: AdminUser[] }>("/admin/users"),
    staleTime: 60_000,
  });

  const { data: coinosStatus } = useQuery({
    queryKey: ["coinos", "status"],
    queryFn: () => api.get<CoinosStatusOverview>("/coinos/status"),
    enabled: hasCoinosPermission,
    staleTime: 30_000,
  });

  const { data: coinosInfo } = useQuery({
    queryKey: ["coinos", "info"],
    queryFn: () => api.get<NodeInfoOverview>("/coinos/info"),
    enabled: hasCoinosPermission,
    staleTime: 60_000,
  });

  const { data: coinosRates } = useQuery({
    queryKey: ["coinos", "rates"],
    queryFn: () => api.get<Record<string, number>>("/coinos/rates"),
    enabled: hasCoinosPermission,
    staleTime: 30_000,
  });

  const { data: configData } = useQuery({
    queryKey: ["admin", "config"],
    queryFn: () => api.get<AdminConfig>("/admin/config"),
    staleTime: 120_000,
  });

  if (statsLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = statsData;
  if (!stats) return null;

  const recentRelays = (relaysData?.relays || [])
    .filter((r) => r.created_at)
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
    .slice(0, 5);

  const recentUsers = (usersData?.users || []).slice(0, 5);

  const platformCards = [
    { label: "Total Relays", value: stats.totalRelays, icon: Radio, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Running", value: stats.runningRelays, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Provisioning", value: stats.provisioningRelays, icon: Loader2, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Total Orders", value: stats.totalOrders, icon: Zap, color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Paid Orders", value: stats.paidOrders, icon: Check, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Last 30 Days", value: stats.recentOrders, icon: BarChart3, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Total Revenue", value: `${stats.totalRevenue.toLocaleString()} sats`, icon: DollarSign, color: "text-amber-400", bg: "bg-amber-500/10" },
  ];

  const btcImpl = coinosStatus?.bitcoin_implementation || "";
  const isKnots = btcImpl.toLowerCase().includes("knots");
  const isPruned = coinosStatus?.bitcoin_pruned ?? false;
  const btcUsd = coinosRates?.USD;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Overview</h2>
          <p className="text-sm text-muted-foreground">Platform health &amp; activity at a glance</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["admin"] })}
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {platformCards.map((card) => (
          <Card key={card.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("rounded-lg p-2", card.bg)}>
                  <card.icon className={cn("size-4", card.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-lg font-bold tabular-nums truncate">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CoinOS Summary (for admins with coinos_admin permission) */}
      {hasCoinosPermission && coinosStatus && (
        <Card className={cn("border-border/50", coinosStatus.healthy ? "bg-emerald-500/[0.02]" : "bg-destructive/5")}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bitcoin className="size-4 text-amber-400" />
                <CardTitle className="text-sm">CoinOS Infrastructure</CardTitle>
              </div>
              <Badge
                variant={coinosStatus.healthy ? "default" : "destructive"}
                className={cn(
                  "text-[10px] gap-1",
                  coinosStatus.healthy && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                )}
              >
                <span className={cn("size-1.5 rounded-full", coinosStatus.healthy ? "bg-emerald-400 animate-pulse" : "bg-destructive")} />
                {coinosStatus.healthy ? "Healthy" : "Unhealthy"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* BTC/USD Rate */}
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">BTC/USD</p>
                <p className="text-base font-bold font-mono text-amber-400">
                  {btcUsd ? `$${btcUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—"}
                </p>
              </div>

              {/* Node */}
              <div className="rounded-lg bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Lightning</p>
                <p className="text-sm font-bold truncate">{coinosInfo?.alias || "—"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {coinosInfo?.num_active_channels ?? 0} ch · {coinosInfo?.num_peers ?? 0} peers
                </p>
              </div>

              {/* Block Height */}
              <div className="rounded-lg bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Block</p>
                <p className="text-sm font-bold font-mono">{coinosInfo?.block_height?.toLocaleString() ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {coinosInfo?.synced_to_chain !== false ? "Synced" : "Syncing..."}
                </p>
              </div>

              {/* Bitcoin Implementation */}
              <div className="rounded-lg bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Backend</p>
                <p className={cn("text-sm font-bold truncate", isKnots && "text-orange-400")}>{btcImpl || "—"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {isPruned ? "Pruned" : "Full node"} · {coinosInfo?.version || "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Relays */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-blue-400" />
                <CardTitle className="text-sm">Recent Relays</CardTitle>
              </div>
              <Badge variant="secondary" className="text-[10px]">{stats.totalRelays}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {recentRelays.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No relays yet</p>
            ) : (
              <div className="space-y-1">
                {recentRelays.map((relay) => (
                  <div key={relay.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className={cn(
                        "size-2 rounded-full shrink-0",
                        relay.status === "running" ? "bg-emerald-400" : relay.status === "provision" ? "bg-amber-400 animate-pulse" : "bg-muted-foreground/30"
                      )} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{relay.name}</p>
                        <NostrIdentity pubkey={relay.owner.pubkey} fallbackName={relay.owner.name} size="xs" />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <StatusBadge status={relay.status} />
                      {relay.created_at && (
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {new Date(relay.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-violet-400" />
                <CardTitle className="text-sm">Users</CardTitle>
              </div>
              <Badge variant="secondary" className="text-[10px]">{stats.totalUsers}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No users yet</p>
            ) : (
              <div className="space-y-1">
                {recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-muted/20 transition-colors">
                    <NostrIdentity pubkey={u.pubkey} fallbackName={u.name} size="sm" />
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{u._count.relays} relays</span>
                      {u.admin && (
                        <Badge className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">Admin</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Server Configuration */}
      {configData && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Settings className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm">Server Configuration</CardTitle>
              <span className="text-[10px] text-muted-foreground ml-auto">read-only · edit via .env</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Domain</p>
                <p className="text-sm font-bold font-mono truncate">{configData.domain}</p>
              </div>
              <div className="rounded-lg bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Payments</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn("size-1.5 rounded-full", configData.payments_enabled ? "bg-emerald-400" : "bg-muted-foreground/30")} />
                  <p className="text-sm font-medium">{configData.payments_enabled ? "Enabled" : "Disabled"}</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Standard</p>
                <p className="text-sm font-bold font-mono">{configData.invoice_amount.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">sats</span></p>
              </div>
              <div className="rounded-lg bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Premium</p>
                <p className="text-sm font-bold font-mono">{configData.invoice_premium_amount.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">sats</span></p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <div className="rounded-lg bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">CoinOS</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn("size-1.5 rounded-full", configData.coinos_enabled ? "bg-emerald-400" : "bg-muted-foreground/30")} />
                  <p className="text-sm font-medium">{configData.coinos_enabled ? "Enabled" : "Disabled"}</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">LNBits</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn("size-1.5 rounded-full", configData.lnbits_configured ? "bg-emerald-400" : "bg-muted-foreground/30")} />
                  <p className="text-sm font-medium">{configData.lnbits_configured ? "Configured" : "Not set"}</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">CORS</p>
                <p className="text-sm font-mono truncate">{configData.cors_origin}</p>
              </div>
              <div className="rounded-lg bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">API Port</p>
                <p className="text-sm font-bold font-mono">{configData.port}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RELAYS TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function RelaysTab() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const fallbackDomain = useRelayDomain();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "relays"],
    queryFn: () => api.get<{ relays: AdminRelay[] }>("/admin/relays"),
  });

  const relays = data?.relays || [];
  const filtered = search
    ? relays.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.owner.pubkey.includes(search))
    : relays;

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete relay "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/relays/${id}`);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">All Relays</h2>
          <p className="text-sm text-muted-foreground">{relays.length} total</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search relays..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 w-56 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "relays"] })}
          >
            <RefreshCw className="size-3" /> Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Relay</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Owner</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Port</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Orders</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((relay) => (
                  <tr key={relay.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{relay.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {relay.name}.{relay.domain || fallbackDomain}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={relay.status} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <NostrIdentity pubkey={relay.owner.pubkey} fallbackName={relay.owner.name} size="xs" />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="font-mono text-xs">{relay.port || "—"}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs">{relay._count.Order}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                          <Link to={`/relays/${relay.name}`}>
                            <Eye className="size-3.5" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                          <Link to={`/relays/${relay.name}/settings`}>
                            <Settings className="size-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(relay.id, relay.name)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {search ? `No relays matching "${search}"` : "No relays found"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "running") {
    return (
      <Badge variant="secondary" className="gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        Running
      </Badge>
    );
  }
  if (status === "provision") {
    return (
      <Badge variant="secondary" className="gap-1.5 text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">
        <Loader2 className="size-3 animate-spin" />
        Provisioning
      </Badge>
    );
  }
  return <Badge variant="secondary" className="text-[10px]">{status || "unknown"}</Badge>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// USERS TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function UsersTab() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => api.get<{ users: AdminUser[] }>("/admin/users"),
  });

  const users = data?.users || [];
  const filtered = search
    ? users.filter((u) => u.pubkey.includes(search) || u.name?.toLowerCase().includes(search.toLowerCase()))
    : users;

  const toggleAdmin = async (userId: string, currentAdmin: boolean) => {
    const action = currentAdmin ? "remove admin from" : "make admin";
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      await api.patch(`/admin/users/${userId}`, { admin: !currentAdmin });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err: any) {
      alert(err.message || "Failed to update");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">All Users</h2>
          <p className="text-sm text-muted-foreground">{users.length} total</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name or pubkey..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 w-56 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Relays</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Orders</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Role</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <NostrIdentity pubkey={u.pubkey} fallbackName={u.name} size="sm" showPubkey />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs tabular-nums">{u._count.relays}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs tabular-nums">{u._count.orders}</span>
                    </td>
                    <td className="px-4 py-3">
                      {u.admin ? (
                        <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">Admin</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">User</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => toggleAdmin(u.id, u.admin)}
                      >
                        {u.admin ? "Remove Admin" : "Make Admin"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {search ? `No users matching "${search}"` : "No users found"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ORDERS TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function OrdersTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => api.get<{ orders: AdminOrder[] }>("/admin/orders"),
  });

  const orders = data?.orders || [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Recent Orders</h2>
        <p className="text-sm text-muted-foreground">Last 100 orders</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Relay</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">User</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Paid At</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/relays/${order.relay.name}`} className="hover:text-primary transition-colors">
                        <p className="font-medium">{order.relay.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{order.relay.domain}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium">{order.amount.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground ml-1">sats</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">{order.order_type}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {order.paid ? (
                        <Badge variant="secondary" className="gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          <Check className="size-3" /> Paid
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">
                          Pending
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <NostrIdentity pubkey={order.user.pubkey} fallbackName={order.user.name} size="xs" />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {order.paid_at
                          ? new Date(order.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">No orders found</div>
          )}
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MY RELAYS TAB (integrated operator view)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface MyRelay {
  id: string;
  name: string;
  domain: string | null;
  status: string | null;
  default_message_policy: boolean;
  auth_required: boolean;
  created_at: string | null;
}

function MyRelaysTab() {
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fallbackDomain = useRelayDomain();

  const { data, isLoading, error } = useQuery({
    queryKey: ["myRelays"],
    queryFn: () => api.get<{ myRelays: MyRelay[]; moderatedRelays: MyRelay[] }>("/relays/mine"),
    enabled: !!user,
  });

  function copyWss(relay: MyRelay) {
    navigator.clipboard.writeText(`wss://${relay.name}.${relay.domain || fallbackDomain}`);
    setCopiedId(relay.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Lock className="size-10 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold">Sign in to view your relays</h2>
        <p className="mt-1 text-sm text-muted-foreground">Use a NIP-07 browser extension to authenticate</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {(error as Error).message}
      </div>
    );
  }

  const relays = data?.myRelays || [];
  const moderated = data?.moderatedRelays || [];
  const allRelays = [...relays, ...moderated.filter((m) => !relays.some((r) => r.id === m.id))];
  const running = allRelays.filter((r) => r.status === "running").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">My Relays</h2>
          <p className="text-sm text-muted-foreground">
            {allRelays.length} relay{allRelays.length !== 1 ? "s" : ""}{allRelays.length > 0 && ` · ${running} running`}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" asChild>
          <Link to="/signup">
            <Plus className="size-4" /> New Relay
          </Link>
        </Button>
      </div>

      {allRelays.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <Globe className="size-10 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold">No relays yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">Create your first Nostr relay and join the decentralized network</p>
          <Button className="mt-6 gap-2" asChild>
            <Link to="/signup">
              <Radio className="size-4" /> Create Your First Relay
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 divide-y divide-border/30">
          {allRelays.map((relay) => (
            <div key={relay.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className={`size-2.5 rounded-full shrink-0 ${
                  relay.status === "running" ? "bg-emerald-400" :
                  relay.status === "provision" ? "bg-amber-400 animate-pulse" :
                  "bg-muted-foreground/30"
                }`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm truncate">{relay.name}</h3>
                    <div className="flex items-center gap-1.5">
                      {relay.auth_required && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 shrink-0">
                          <Lock className="size-2.5" /> Auth
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 shrink-0">
                        {relay.default_message_policy ? "Open" : "Allowlist"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <code className="font-mono text-xs text-muted-foreground truncate">
                      wss://{relay.name}.{relay.domain || fallbackDomain}
                    </code>
                    <button
                      onClick={() => copyWss(relay)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy connection string"
                    >
                      {copiedId === relay.id ? (
                        <Check className="size-3 text-emerald-500" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 sm:ml-auto">
                <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" asChild>
                  <Link to={`/relays/${relay.name}`}>
                    <ExternalLink className="size-3.5" /> View
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" asChild>
                  <Link to={`/relays/${relay.name}/settings`}>
                    <Settings className="size-3.5" /> Settings
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LIVE DEMO TAB (guest exploration view)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function DemoTab() {
  const fallbackDomain = useRelayDomain();

  const { data, isLoading } = useQuery({
    queryKey: ["directory"],
    queryFn: () => api.get<{ relays: { id: string; name: string; domain: string | null; status: string | null; description: string | null }[] }>("/relays/directory"),
    staleTime: 30_000,
  });

  const relays = data?.relays || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Live Demo</h2>
        <p className="text-sm text-muted-foreground">
          Explore what relay management looks like. Sign in and create a relay to unlock the full experience.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/50 bg-primary/5">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Radio className="size-4 text-primary" />
              </div>
              <h3 className="font-bold text-sm">Create a Relay</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Deploy your own Nostr relay with custom access controls, moderation tools, and Lightning payments — all in under 60 seconds.
            </p>
            <Button size="sm" className="gap-1.5 w-full" asChild>
              <Link to="/signup">
                <Plus className="size-3.5" /> Get Started
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <Globe className="size-4 text-emerald-400" />
              </div>
              <h3 className="font-bold text-sm">Browse Directory</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Discover public relays on the network. See what operators are building and find relays to connect to.
            </p>
            <Button size="sm" variant="outline" className="gap-1.5 w-full" asChild>
              <Link to="/directory">
                <ArrowRight className="size-3.5" /> Explore
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Public Relays on this Server</h3>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : relays.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No public relays listed yet.</div>
        ) : (
          <div className="rounded-lg border border-border/50 divide-y divide-border/30">
            {relays.slice(0, 8).map((relay) => (
              <div key={relay.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{relay.name}</p>
                  <p className="font-mono text-xs text-muted-foreground truncate">
                    wss://{relay.name}.{relay.domain || fallbackDomain}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={relay.status} />
                  <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                    <Link to={`/relays/${relay.name}`}>
                      <Eye className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Card className="border-border/50 border-dashed">
        <CardContent className="p-5 text-center space-y-2">
          <p className="text-sm font-medium">Want the full operator experience?</p>
          <p className="text-xs text-muted-foreground">
            Sign in with a NIP-07 extension and create your first relay to unlock relay management, settings, and moderation tools.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PERMISSIONS TAB (admin: manage permission requests & grants)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PermissionRequestItem {
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

interface PermissionItem {
  id: string;
  userId: string;
  type: string;
  granted_at: string;
  granted_by: string | null;
  disclaimer_accepted: boolean;
  revoked_at: string | null;
  user: { id: string; pubkey: string; name: string | null; admin: boolean };
}

function PermissionsTab() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "denied">("pending");

  const { data: reqData, isLoading: reqLoading } = useQuery({
    queryKey: ["admin", "permissionRequests", filter],
    queryFn: () => api.get<{ requests: PermissionRequestItem[] }>(`/permissions/requests?status=${filter}`),
  });

  const { data: permData, isLoading: permLoading } = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: () => api.get<{ permissions: PermissionItem[] }>("/permissions/all"),
  });

  const requests = reqData?.requests || [];
  const permissions = permData?.permissions || [];

  const decideMutation = useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: string; note?: string }) =>
      api.post(`/permissions/requests/${id}/decide`, { decision, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "permissionRequests"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "permissions"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: ({ userId, type }: { userId: string; type: string }) =>
      api.post("/permissions/revoke", { userId, type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "permissions"] });
    },
  });

  const handleDecide = (id: string, decision: "approved" | "denied") => {
    const note = decision === "denied" ? prompt("Reason for denial (optional):") : undefined;
    decideMutation.mutate({ id, decision, note: note || undefined });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Permission Management</h2>
        <p className="text-sm text-muted-foreground">Review requests and manage granted permissions</p>
      </div>

      {/* Request filter tabs */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Permission Requests</h3>
        <div className="flex gap-1 mb-4">
          {(["pending", "approved", "denied"] as const).map((s) => (
            <Button
              key={s}
              variant={filter === s ? "default" : "outline"}
              size="sm"
              className="text-xs capitalize"
              onClick={() => setFilter(s)}
            >
              {s === "pending" && <Clock className="size-3 mr-1" />}
              {s === "approved" && <CheckCircle2 className="size-3 mr-1" />}
              {s === "denied" && <XCircle className="size-3 mr-1" />}
              {s}
            </Button>
          ))}
        </div>

        {reqLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No {filter} requests
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 divide-y divide-border/30">
            {requests.map((req) => (
              <div key={req.id} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                        {req.type.replace("_", " ")}
                      </Badge>
                      <NostrIdentity pubkey={req.user.pubkey} fallbackName={req.user.name} size="xs" />
                    </div>
                    {req.reason && (
                      <p className="text-xs text-muted-foreground mt-1">&ldquo;{req.reason}&rdquo;</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {req.status === "pending" && (
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleDecide(req.id, "approved")}
                        disabled={decideMutation.isPending}
                      >
                        <CheckCircle2 className="size-3" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                        onClick={() => handleDecide(req.id, "denied")}
                        disabled={decideMutation.isPending}
                      >
                        <XCircle className="size-3" /> Deny
                      </Button>
                    </div>
                  )}
                  {req.status !== "pending" && req.decided_by && (
                    <div className="shrink-0 flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">by</span>
                      <NostrIdentity pubkey={req.decided_by.pubkey} fallbackName={req.decided_by.name} size="xs" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active permissions */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Active Permissions</h3>
        {permLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : permissions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No active permissions granted
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Permission</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Disclaimer</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Granted</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((p) => (
                  <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <NostrIdentity pubkey={p.user.pubkey} fallbackName={p.user.name} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {p.type.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {p.disclaimer_accepted ? (
                        <ShieldCheck className="size-3.5 text-emerald-400" />
                      ) : (
                        <Clock className="size-3.5 text-amber-400" />
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {new Date(p.granted_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Revoke ${p.type} from ${p.user.name || p.user.pubkey.slice(0, 16)}?`)) {
                            revokeMutation.mutate({ userId: p.userId, type: p.type });
                          }
                        }}
                        disabled={revokeMutation.isPending}
                      >
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COINOS ADMIN TAB (requires coinos_admin permission + disclaimer)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CoinosStatus {
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

interface NodeInfoData {
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
  features?: Record<string, { name: string; is_required: boolean; is_known: boolean }>;
  [key: string]: unknown;
}

interface CoinosPaymentItem {
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

interface CoinosPaymentsResponse {
  count: number;
  payments: CoinosPaymentItem[];
  incoming?: Record<string, { sats: number; fiat: string; tips: number; fiatTips: string }>;
  outgoing?: Record<string, { sats: number; fiat: string; tips: number; fiatTips: string }>;
}

interface CoinosCreditsData {
  bitcoin: number;
  lightning: number;
  liquid: number;
}

function CoinosAdminTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission("coinos_admin");
  const hasGrant = useHasPermissionGranted("coinos_admin");
  const [disclaimerAccepting, setDisclaimerAccepting] = useState(false);

  // Fetch disclaimer text
  const { data: typesData } = useQuery({
    queryKey: ["permissionTypes"],
    queryFn: () => api.get<{ types: { type: string; disclaimer: string }[] }>("/permissions/types"),
    staleTime: Infinity,
  });

  const disclaimer = typesData?.types?.find((t) => t.type === "coinos_admin")?.disclaimer || "";

  const acceptDisclaimer = useCallback(async () => {
    setDisclaimerAccepting(true);
    try {
      await api.post("/permissions/accept-disclaimer", { type: "coinos_admin" });
      // Refresh user data to get updated permissions
      const { user: updatedUser } = await api.get<{ user: any }>("/auth/me");
      useAuth.setState({ user: updatedUser });
    } finally {
      setDisclaimerAccepting(false);
    }
  }, []);

  // If user doesn't have the permission at all, show request prompt
  if (!user?.admin && !hasGrant) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Lock className="size-10 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold">CoinOS Access Required</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-md">
          CoinOS admin access requires explicit permission. Contact a platform administrator to request access.
        </p>
      </div>
    );
  }

  // If permission granted but disclaimer not accepted, show disclaimer gate
  if (!hasPermission && (hasGrant || user?.admin)) {
    return (
      <div className="max-w-lg mx-auto py-12 space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="size-14 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="size-7 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold">CoinOS Admin Access</h2>
          <p className="text-sm text-muted-foreground">
            You must read and accept the following disclaimer before accessing the CoinOS backend.
          </p>
        </div>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Info className="size-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">{disclaimer}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center gap-3">
          <Button
            className="gap-2 w-full max-w-xs"
            onClick={acceptDisclaimer}
            disabled={disclaimerAccepting}
          >
            {disclaimerAccepting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            I Understand &amp; Accept
          </Button>
          <p className="text-[10px] text-muted-foreground text-center max-w-xs">
            By clicking above, you accept full responsibility for actions taken within the CoinOS admin interface.
          </p>
        </div>
      </div>
    );
  }

  // Full CoinOS admin interface
  return <CoinosAdminDashboard />;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REQUEST ACCESS TAB (user-facing permission request UI)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface MyPermissionsData {
  permissions: { id: string; type: string; granted_at: string; disclaimer_accepted: boolean; revoked_at: string | null }[];
  requests: { id: string; type: string; status: string; reason: string | null; created_at: string; decided_at: string | null; decision_note: string | null }[];
}

interface PermissionTypeInfo {
  type: string;
  disclaimer: string;
}

function RequestAccessTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [requestType, setRequestType] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const { data: myData, isLoading } = useQuery({
    queryKey: ["permissions", "mine"],
    queryFn: () => api.get<MyPermissionsData>("/permissions/mine"),
    enabled: !!user,
  });

  const { data: typesData } = useQuery({
    queryKey: ["permissionTypes"],
    queryFn: () => api.get<{ types: PermissionTypeInfo[] }>("/permissions/types"),
    staleTime: Infinity,
  });

  const myPermissions = myData?.permissions || [];
  const myRequests = myData?.requests || [];
  const permTypes = typesData?.types || [];

  // Filter out types the user already has or has pending requests for
  const activeTypes = new Set(myPermissions.filter((p) => !p.revoked_at).map((p) => p.type));
  const pendingTypes = new Set(myRequests.filter((r) => r.status === "pending").map((r) => r.type));
  const availableTypes = permTypes.filter((t) => !activeTypes.has(t.type) && !pendingTypes.has(t.type));

  const handleSubmit = async () => {
    if (!requestType) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await api.post("/permissions/request", { type: requestType, reason: requestReason || undefined });
      queryClient.invalidateQueries({ queryKey: ["permissions", "mine"] });
      setRequestType("");
      setRequestReason("");
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Lock className="size-10 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold">Sign in Required</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign in with a NIP-07 extension to request permissions.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Request Access</h2>
        <p className="text-sm text-muted-foreground">
          Request elevated permissions from platform administrators
        </p>
      </div>

      {/* Current permissions */}
      {myPermissions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Your Permissions</h3>
          <div className="flex flex-wrap gap-2">
            {myPermissions.filter((p) => !p.revoked_at).map((p) => (
              <Badge key={p.id} className="gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <ShieldCheck className="size-3" />
                {p.type.replace("_", " ")}
                {p.disclaimer_accepted && <Check className="size-3" />}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Pending requests */}
      {myRequests.filter((r) => r.status === "pending").length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Pending Requests</h3>
          <div className="rounded-lg border border-border/50 divide-y divide-border/30">
            {myRequests.filter((r) => r.status === "pending").map((r) => (
              <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <Badge variant="outline" className="text-[10px] capitalize mb-1">
                    {r.type.replace("_", " ")}
                  </Badge>
                  {r.reason && (
                    <p className="text-xs text-muted-foreground mt-1">{r.reason}</p>
                  )}
                </div>
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Clock className="size-2.5" /> Pending
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past decisions */}
      {myRequests.filter((r) => r.status !== "pending").length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Request History</h3>
          <div className="rounded-lg border border-border/50 divide-y divide-border/30">
            {myRequests.filter((r) => r.status !== "pending").slice(0, 10).map((r) => (
              <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {r.type.replace("_", " ")}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {r.decided_at ? new Date(r.decided_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                  {r.decision_note && (
                    <p className="text-xs text-muted-foreground mt-1">{r.decision_note}</p>
                  )}
                </div>
                {r.status === "approved" ? (
                  <Badge className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    <CheckCircle2 className="size-2.5" /> Approved
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <XCircle className="size-2.5" /> Denied
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New request form */}
      {availableTypes.length > 0 ? (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Request a Permission</CardTitle>
            <CardDescription className="text-xs">
              Select a permission type and optionally explain why you need it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {availableTypes.map((t) => (
                <Button
                  key={t.type}
                  variant={requestType === t.type ? "default" : "outline"}
                  size="sm"
                  className="text-xs capitalize"
                  onClick={() => setRequestType(t.type)}
                >
                  {t.type.replace("_", " ")}
                </Button>
              ))}
            </div>

            {requestType && (
              <>
                <div className="rounded-lg bg-muted/30 p-3">
                  <div className="flex items-start gap-2">
                    <Info className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {permTypes.find((t) => t.type === requestType)?.disclaimer || ""}
                    </p>
                  </div>
                </div>

                <Input
                  placeholder="Why do you need this permission? (optional)"
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  className="text-sm"
                />

                {submitError && (
                  <p className="text-xs text-destructive">{submitError}</p>
                )}

                <Button
                  className="gap-1.5 w-full"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <KeyRound className="size-4" />
                  )}
                  Submit Request
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 border-dashed">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">
              {activeTypes.size > 0 || pendingTypes.size > 0
                ? "All available permissions are either granted or pending."
                : "No permission types available to request at this time."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatSats(sats: number): string {
  if (Math.abs(sats) >= 100_000_000) return (sats / 100_000_000).toFixed(4) + " BTC";
  if (Math.abs(sats) >= 1_000_000) return (sats / 1_000_000).toFixed(2) + "M sats";
  if (Math.abs(sats) >= 1_000) return (sats / 1_000).toFixed(1) + "k sats";
  return sats.toLocaleString() + " sats";
}

function formatFiat(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m ago";
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h ago";
  return Math.floor(diff / 86_400_000) + "d ago";
}

const RATE_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "BRL", "MXN"] as const;

function CoinosAdminDashboard() {
  const queryClient = useQueryClient();
  const [copiedPubkey, setCopiedPubkey] = useState(false);
  const [showAllRates, setShowAllRates] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["coinos", "status"],
    queryFn: () => api.get<CoinosStatus>("/coinos/status"),
    refetchInterval: 15_000,
  });

  const { data: infoData, isLoading: infoLoading } = useQuery({
    queryKey: ["coinos", "info"],
    queryFn: () => api.get<NodeInfoData>("/coinos/info"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: ratesData, isLoading: ratesLoading } = useQuery({
    queryKey: ["coinos", "rates"],
    queryFn: () => api.get<Record<string, number>>("/coinos/rates"),
    refetchInterval: 30_000,
  });

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ["coinos", "payments"],
    queryFn: () => api.get<CoinosPaymentsResponse>("/coinos/payments?limit=20&offset=0"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: creditsData } = useQuery({
    queryKey: ["coinos", "credits"],
    queryFn: () => api.get<CoinosCreditsData>("/coinos/credits"),
    staleTime: 60_000,
  });

  const isHealthy = statusData?.healthy ?? false;
  const nodePubkey = infoData?.identity_pubkey || infoData?.pubkey || "";
  const nodeVersion = infoData?.version || "";
  const btcImpl = statusData?.bitcoin_implementation || "";
  const isKnots = btcImpl.toLowerCase().includes("knots") || nodeVersion.toLowerCase().includes("knots");
  const isPruned = statusData?.bitcoin_pruned ?? false;
  const nodeNetwork = infoData?.chains?.[0]?.network || infoData?.network || "mainnet";
  const payments = paymentsData?.payments || [];
  const totalPayments = paymentsData?.count ?? 0;

  const uptimeMs = statusData?.lastSuccessTime ? Date.now() - (statusData.lastSuccessTime as number) : null;

  const handleCopyPubkey = () => {
    if (nodePubkey) {
      navigator.clipboard.writeText(nodePubkey);
      setCopiedPubkey(true);
      setTimeout(() => setCopiedPubkey(false), 2000);
    }
  };

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["coinos"] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bitcoin className="size-5 text-amber-400" />
            CoinOS Backend
          </h2>
          <p className="text-sm text-muted-foreground">Lightning node &amp; payment infrastructure</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleRefreshAll}>
            <RefreshCw className="size-3.5" />
          </Button>
          <Badge
            variant={isHealthy ? "default" : "destructive"}
            className={cn(
              "text-xs gap-1",
              isHealthy && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            )}
          >
            <span className={cn("size-1.5 rounded-full", isHealthy ? "bg-emerald-400 animate-pulse" : "bg-destructive")} />
            {statusLoading ? "Checking..." : isHealthy ? "Healthy" : "Unhealthy"}
          </Badge>
        </div>
      </div>

      {/* ─── Top Stats Row ─────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {/* Node Status */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Activity className="size-3.5" />
              <span className="text-[11px] font-medium uppercase tracking-wider">Status</span>
            </div>
            {statusLoading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <p className={cn("text-xl font-bold", isHealthy ? "text-emerald-400" : "text-destructive")}>
                  {isHealthy ? "Online" : "Offline"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {statusData?.consecutiveFailures === 0
                    ? "No failures"
                    : `${statusData?.consecutiveFailures ?? "?"} consecutive failures`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Block Height */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Boxes className="size-3.5" />
              <span className="text-[11px] font-medium uppercase tracking-wider">Block Height</span>
            </div>
            {infoLoading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <p className="text-xl font-bold font-mono">
                  {infoData?.block_height?.toLocaleString() ?? "—"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {infoData?.synced_to_chain !== false ? (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="size-2.5" /> Synced
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1">
                      <Loader2 className="size-2.5 animate-spin" /> Syncing
                    </span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Channels & Peers */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Network className="size-3.5" />
              <span className="text-[11px] font-medium uppercase tracking-wider">Network</span>
            </div>
            {infoLoading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <p className="text-xl font-bold">
                  {infoData?.num_active_channels ?? 0}
                  <span className="text-sm font-normal text-muted-foreground ml-1">ch</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {infoData?.num_peers ?? 0} peers
                  {(infoData?.num_inactive_channels ?? 0) > 0 && (
                    <span className="text-amber-400"> · {infoData?.num_inactive_channels} inactive</span>
                  )}
                  {(infoData?.num_pending_channels ?? 0) > 0 && (
                    <span className="text-blue-400"> · {infoData?.num_pending_channels} pending</span>
                  )}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Payments */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Zap className="size-3.5" />
              <span className="text-[11px] font-medium uppercase tracking-wider">Payments</span>
            </div>
            {paymentsLoading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <p className="text-xl font-bold">{totalPayments.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">total transactions</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Node Identity ─────────────────────────────────────────────── */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Zap className="size-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-base truncate">{infoData?.alias || "Lightning Node"}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {btcImpl && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          isKnots ? "border-orange-500/30 text-orange-400 bg-orange-500/5" : "border-border/50"
                        )}
                      >
                        <Bitcoin className="size-2.5 mr-1" />
                        {btcImpl}
                      </Badge>
                    )}
                    {isPruned && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/30 text-purple-400 bg-purple-500/5">
                        Pruned
                      </Badge>
                    )}
                    {nodeVersion && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        <Cpu className="size-2.5 mr-1" />
                        LND {nodeVersion}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                      {nodeNetwork}
                    </Badge>
                  </div>
                </div>
              </div>

              {nodePubkey && (
                <div className="flex items-center gap-2">
                  <Fingerprint className="size-3.5 text-muted-foreground shrink-0" />
                  <code className="text-[11px] font-mono text-muted-foreground truncate flex-1">
                    {nodePubkey}
                  </code>
                  <Button variant="ghost" size="sm" className="h-6 px-1.5 shrink-0" onClick={handleCopyPubkey}>
                    {copiedPubkey ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Exchange Rates ────────────────────────────────────────────── */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm">Exchange Rates</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setShowAllRates(!showAllRates)}
            >
              {showAllRates ? "Show less" : "Show all"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {ratesLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : ratesData ? (
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {(showAllRates ? Object.keys(ratesData).sort() : RATE_CURRENCIES.filter((c) => ratesData[c]))
                .map((currency) => {
                  const rate = ratesData[currency as string];
                  if (!rate) return null;
                  const isUSD = currency === "USD";
                  return (
                    <div
                      key={currency}
                      className={cn(
                        "rounded-lg p-3 transition-colors",
                        isUSD ? "bg-amber-500/5 border border-amber-500/20" : "bg-muted/20"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-muted-foreground">{currency}</span>
                        {isUSD && <Bitcoin className="size-3 text-amber-400" />}
                      </div>
                      <p className={cn("text-sm font-bold font-mono", isUSD && "text-amber-400")}>
                        {rate >= 1
                          ? rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : rate.toFixed(8)}
                      </p>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Unable to fetch rates</p>
          )}
        </CardContent>
      </Card>

      {/* ─── Fee Credits ───────────────────────────────────────────────── */}
      {creditsData && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm">Fee Credits</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-3">
              {[
                { label: "Lightning", value: creditsData.lightning, icon: Zap, color: "text-amber-400" },
                { label: "Bitcoin", value: creditsData.bitcoin, icon: Bitcoin, color: "text-orange-400" },
                { label: "Liquid", value: creditsData.liquid, icon: Boxes, color: "text-blue-400" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="rounded-lg bg-muted/20 p-3 text-center">
                  <Icon className={cn("size-4 mx-auto mb-1", color)} />
                  <p className="text-sm font-bold font-mono">{formatSats(value)}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Recent Payments ───────────────────────────────────────────── */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm">Recent Payments</CardTitle>
              {totalPayments > 0 && (
                <Badge variant="secondary" className="text-[10px] ml-1">{totalPayments.toLocaleString()}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No payments yet</p>
          ) : (
            <div className="rounded-lg border border-border/30 divide-y divide-border/20">
              {payments.slice(0, 10).map((p) => {
                const isIncoming = p.amount > 0;
                return (
                  <div key={p.id || p.hash || p.created} className="px-3 py-2.5 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={cn(
                          "size-7 rounded-full flex items-center justify-center shrink-0",
                          isIncoming ? "bg-emerald-500/10" : "bg-red-500/10"
                        )}>
                          {isIncoming
                            ? <ArrowDownLeft className="size-3.5 text-emerald-400" />
                            : <ArrowUpRight className="size-3.5 text-red-400" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-sm font-semibold font-mono",
                              isIncoming ? "text-emerald-400" : "text-red-400"
                            )}>
                              {isIncoming ? "+" : ""}{formatSats(p.amount)}
                            </span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">
                              {p.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {p.with?.username && (
                              <span className="text-[10px] text-muted-foreground truncate">
                                {isIncoming ? "from" : "to"} {p.with.username}
                              </span>
                            )}
                            {p.memo && (
                              <span className="text-[10px] text-muted-foreground/60 truncate">
                                — {p.memo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-muted-foreground">{timeAgo(p.created)}</p>
                        {p.fee != null && p.fee > 0 && (
                          <p className="text-[9px] text-muted-foreground/50">fee: {p.fee}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Payment volume summary */}
          {paymentsData?.incoming && paymentsData?.outgoing && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              {Object.keys(paymentsData.incoming).length > 0 && (
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowDownLeft className="size-3 text-emerald-400" />
                    <span className="text-[10px] font-medium text-emerald-400">Incoming</span>
                  </div>
                  {Object.entries(paymentsData.incoming).map(([period, data]) => (
                    <div key={period}>
                      <p className="text-sm font-bold font-mono">{formatSats(data.sats)}</p>
                      <p className="text-[10px] text-muted-foreground">{data.fiat}</p>
                    </div>
                  ))}
                </div>
              )}
              {Object.keys(paymentsData.outgoing).length > 0 && (
                <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowUpRight className="size-3 text-red-400" />
                    <span className="text-[10px] font-medium text-red-400">Outgoing</span>
                  </div>
                  {Object.entries(paymentsData.outgoing).map(([period, data]) => (
                    <div key={period}>
                      <p className="text-sm font-bold font-mono">{formatSats(data.sats)}</p>
                      <p className="text-[10px] text-muted-foreground">{data.fiat}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Admin Warning ─────────────────────────────────────────────── */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Administrative Access</p>
              <p className="text-xs text-muted-foreground mt-1">
                You are viewing the CoinOS backend with admin privileges. All actions are logged.
                Exercise caution with payment operations — transactions are irreversible.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── System Diagnostics (collapsible) ──────────────────────────── */}
      <Card className="border-border/50">
        <CardHeader className="pb-0">
          <button
            className="flex items-center justify-between w-full"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
          >
            <div className="flex items-center gap-2">
              <Settings className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm">System Diagnostics</CardTitle>
            </div>
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", showDiagnostics && "rotate-180")} />
          </button>
        </CardHeader>
        {showDiagnostics && (
          <CardContent className="pt-3">
            <div className="space-y-2 text-xs font-mono">
              {[
                { label: "CoinOS Enabled", value: statusData?.enabled ? "true" : "false" },
                { label: "Health Status", value: isHealthy ? "healthy" : "unhealthy" },
                { label: "Consecutive Failures", value: String(statusData?.consecutiveFailures ?? "—") },
                { label: "Last Success", value: statusData?.lastSuccessTime ? new Date(statusData.lastSuccessTime as number).toISOString() : "—" },
                { label: "Last Failure Reason", value: (statusData?.lastFailureReason as string) || "none" },
                { label: "Stalled Check", value: String(statusData?.stalledCheck ?? "—") },
                { label: "Node Alias", value: infoData?.alias || "—" },
                { label: "Node Version", value: nodeVersion || "—" },
                { label: "Bitcoin Implementation", value: btcImpl || "—" },
                { label: "Pruned Node", value: isPruned ? "yes" : "no" },
                { label: "Node Pubkey", value: nodePubkey ? nodePubkey.slice(0, 20) + "..." + nodePubkey.slice(-8) : "—" },
                { label: "Network", value: nodeNetwork },
                { label: "Block Height", value: infoData?.block_height?.toLocaleString() || "—" },
                { label: "Synced to Chain", value: String(infoData?.synced_to_chain ?? "—") },
                { label: "Synced to Graph", value: String(infoData?.synced_to_graph ?? "—") },
                { label: "Active Channels", value: String(infoData?.num_active_channels ?? "—") },
                { label: "Inactive Channels", value: String(infoData?.num_inactive_channels ?? "—") },
                { label: "Pending Channels", value: String(infoData?.num_pending_channels ?? "—") },
                { label: "Peers", value: String(infoData?.num_peers ?? "—") },
                { label: "URIs", value: infoData?.uris?.length ? String(infoData.uris.length) : "0" },
                { label: "Total Payments", value: totalPayments.toLocaleString() },
                { label: "Fee Credits (LN)", value: creditsData ? formatSats(creditsData.lightning) : "—" },
                { label: "Fee Credits (BTC)", value: creditsData ? formatSats(creditsData.bitcoin) : "—" },
                { label: "Fee Credits (Liquid)", value: creditsData ? formatSats(creditsData.liquid) : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-1 border-b border-border/20 last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground truncate max-w-[60%] text-right">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
