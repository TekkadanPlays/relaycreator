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
  CircleDollarSign, Boxes, Network, Fingerprint, Vault, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
// OVERVIEW TAB
// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????

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

  const btcImpl = coinosStatus?.bitcoin_implementation || "";
  const isKnots = btcImpl.toLowerCase().includes("knots");
  const isPruned = coinosStatus?.bitcoin_pruned ?? false;
  const btcUsd = coinosRates?.USD;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Overview</h2>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => {
          queryClient.invalidateQueries({ queryKey: ["admin"] });
          queryClient.invalidateQueries({ queryKey: ["coinos"] });
        }}>
          <RefreshCw className="size-3.5" />
        </Button>
      </div>

      {/* Hero row: 2 featured cards + 2 secondary */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="col-span-2 border-border/50 bg-blue-500/[0.03]">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="size-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Radio className="size-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{stats.runningRelays}<span className="text-sm font-normal text-muted-foreground">/{stats.totalRelays}</span></p>
              <p className="text-xs text-muted-foreground">relays running{stats.provisioningRelays > 0 && <span className="text-amber-400"> ?? {stats.provisioningRelays} provisioning</span>}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Users</p>
            <p className="text-xl font-bold tabular-nums mt-1">{stats.totalUsers}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Revenue</p>
            <p className="text-xl font-bold tabular-nums mt-1">{stats.totalRevenue >= 1000 ? `${(stats.totalRevenue / 1000).toFixed(1)}k` : stats.totalRevenue}<span className="text-xs font-normal text-muted-foreground ml-1">sats</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Orders strip */}
      <div className="flex items-center gap-4 rounded-lg border border-border/50 px-4 py-2.5 text-xs">
        <span className="text-muted-foreground">Orders</span>
        <span className="font-semibold tabular-nums">{stats.totalOrders} total</span>
        <span className="text-emerald-400 tabular-nums">{stats.paidOrders} paid</span>
        <span className="text-cyan-400 tabular-nums">{stats.recentOrders} last 30d</span>
        {configData && (
          <>
            <span className="text-muted-foreground/30">|</span>
            <span className="text-muted-foreground">{configData.invoice_amount} / {configData.invoice_premium_amount} sats</span>
          </>
        )}
      </div>

      {/* CoinOS status bar */}
      {hasCoinosPermission && coinosStatus && (
        <div className={cn(
          "flex items-center gap-3 rounded-lg border px-4 py-2.5 text-xs",
          coinosStatus.healthy ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-destructive/30 bg-destructive/5"
        )}>
          <Bitcoin className="size-3.5 text-amber-400 shrink-0" />
          <span className={cn("size-1.5 rounded-full shrink-0", coinosStatus.healthy ? "bg-emerald-400 animate-pulse" : "bg-destructive")} />
          <span className="font-medium">{coinosInfo?.alias || "CoinOS"}</span>
          <span className="text-muted-foreground/30">|</span>
          {btcUsd && <span className="font-mono text-amber-400">${btcUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>}
          {coinosInfo?.block_height && <span className="font-mono">{coinosInfo.block_height.toLocaleString()}</span>}
          <span className="text-muted-foreground">{coinosInfo?.num_active_channels ?? 0}ch ?? {coinosInfo?.num_peers ?? 0}p</span>
          {btcImpl && (
            <>
              <span className="text-muted-foreground/30">|</span>
              <span className={cn(isKnots && "text-orange-400")}>{btcImpl}</span>
              {isPruned && <Badge variant="outline" className="text-[9px] px-1 py-0 border-purple-500/30 text-purple-400">pruned</Badge>}
            </>
          )}
        </div>
      )}

      {/* Recent activity */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="text-xs font-semibold flex items-center gap-1.5"><Radio className="size-3 text-blue-400" /> Recent Relays</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">{stats.totalRelays}</span>
            </div>
            {recentRelays.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No relays yet</p>
            ) : (
              <div className="px-2 pb-2">
                {recentRelays.map((relay) => (
                  <div key={relay.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/20 transition-colors">
                    <span className={cn("size-1.5 rounded-full shrink-0", relay.status === "running" ? "bg-emerald-400" : relay.status === "provision" ? "bg-amber-400 animate-pulse" : "bg-muted-foreground/30")} />
                    <span className="text-sm font-medium truncate flex-1">{relay.name}</span>
                    <NostrIdentity pubkey={relay.owner.pubkey} fallbackName={relay.owner.name} size="xs" className="max-w-[100px]" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="text-xs font-semibold flex items-center gap-1.5"><Users className="size-3 text-violet-400" /> Users</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">{stats.totalUsers}</span>
            </div>
            {recentUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No users yet</p>
            ) : (
              <div className="px-2 pb-2">
                {recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/20 transition-colors">
                    <NostrIdentity pubkey={u.pubkey} fallbackName={u.name} size="sm" className="flex-1 min-w-0" />
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{u._count.relays}r ?? {u._count.orders}o</span>
                    {u.admin && <span className="size-1.5 rounded-full bg-primary shrink-0" title="Admin" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Server config strip */}
      {configData && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/50 px-4 py-2.5 text-xs">
          <span className="text-muted-foreground flex items-center gap-1"><Settings className="size-3" /> Config</span>
          <span className="font-mono font-medium">{configData.domain}</span>
          <span className="flex items-center gap-1">
            <span className={cn("size-1.5 rounded-full", configData.payments_enabled ? "bg-emerald-400" : "bg-muted-foreground/30")} />
            Payments {configData.payments_enabled ? "on" : "off"}
          </span>
          <span className="flex items-center gap-1">
            <span className={cn("size-1.5 rounded-full", configData.coinos_enabled ? "bg-emerald-400" : "bg-muted-foreground/30")} />
            CoinOS {configData.coinos_enabled ? "on" : "off"}
          </span>
          <span className="flex items-center gap-1">
            <span className={cn("size-1.5 rounded-full", configData.lnbits_configured ? "bg-emerald-400" : "bg-muted-foreground/30")} />
            LNBits {configData.lnbits_configured ? "on" : "off"}
          </span>
          <span className="text-muted-foreground">port {configData.port}</span>
        </div>
      )}
    </div>
  );
}

// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
// RELAYS TAB
// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
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
                      <span className="font-mono text-xs">{relay.port || "???"}</span>
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

// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
// USERS TAB
// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
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

// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
// ORDERS TAB
// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
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
                          : "???"}
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

// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
// MY RELAYS TAB (integrated operator view)
// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????

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
            {allRelays.length} relay{allRelays.length !== 1 ? "s" : ""}{allRelays.length > 0 && ` ?? ${running} running`}
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

// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
// LIVE DEMO TAB (guest exploration view)
// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
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
              Deploy your own Nostr relay with custom access controls, moderation tools, and Lightning payments ??? all in under 60 seconds.
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

// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
// PERMISSIONS TAB (admin: manage permission requests & grants)
// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????

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

// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
// COINOS ADMIN TAB (requires coinos_admin permission + disclaimer)
// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????

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

// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
// REQUEST ACCESS TAB (user-facing permission request UI)
// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????

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

  const { data: infoData } = useQuery({
    queryKey: ["coinos", "info"],
    queryFn: () => api.get<NodeInfoData>("/coinos/info"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: ratesData } = useQuery({
    queryKey: ["coinos", "rates"],
    queryFn: () => api.get<Record<string, number>>("/coinos/rates"),
    refetchInterval: 30_000,
  });

  const { data: paymentsData } = useQuery({
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

  const handleCopyPubkey = () => {
    if (nodePubkey) {
      navigator.clipboard.writeText(nodePubkey);
      setCopiedPubkey(true);
      setTimeout(() => setCopiedPubkey(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header + status */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bitcoin className="size-5 text-amber-400" />
          CoinOS Backend
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => queryClient.invalidateQueries({ queryKey: ["coinos"] })}>
            <RefreshCw className="size-3.5" />
          </Button>
          <Badge
            variant={isHealthy ? "default" : "destructive"}
            className={cn("text-xs gap-1", isHealthy && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20")}
          >
            <span className={cn("size-1.5 rounded-full", isHealthy ? "bg-emerald-400 animate-pulse" : "bg-destructive")} />
            {statusLoading ? "..." : isHealthy ? "Healthy" : "Down"}
          </Badge>
        </div>
      </div>

      {/* Node identity bar */}
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Zap className="size-4 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">{infoData?.alias || "Lightning Node"}</span>
                {btcImpl && (
                  <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", isKnots ? "border-orange-500/30 text-orange-400 bg-orange-500/5" : "")}>
                    <Bitcoin className="size-2.5 mr-0.5" />{btcImpl}
                  </Badge>
                )}
                {isPruned && <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-purple-500/30 text-purple-400">Pruned</Badge>}
                {nodeVersion && <Badge variant="outline" className="text-[9px] px-1.5 py-0"><Cpu className="size-2.5 mr-0.5" />LND {nodeVersion}</Badge>}
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize">{nodeNetwork}</Badge>
              </div>
              {nodePubkey && (
                <div className="flex items-center gap-1.5 mt-1">
                  <code className="text-[10px] font-mono text-muted-foreground truncate">{nodePubkey}</code>
                  <button onClick={handleCopyPubkey} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                    {copiedPubkey ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-px rounded-lg border border-border/50 overflow-hidden bg-border/50">
        {[
          { label: "Block", value: infoData?.block_height?.toLocaleString() ?? "???", sub: infoData?.synced_to_chain !== false ? "synced" : "syncing" },
          { label: "Channels", value: String(infoData?.num_active_channels ?? 0), sub: `${infoData?.num_peers ?? 0} peers` },
          { label: "Payments", value: totalPayments.toLocaleString(), sub: "total" },
          { label: "Failures", value: String(statusData?.consecutiveFailures ?? 0), sub: statusData?.consecutiveFailures === 0 ? "none" : "consecutive" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-background p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-lg font-bold font-mono tabular-nums mt-0.5">{value}</p>
            <p className="text-[10px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Rates + Credits side by side */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Exchange Rates ??? 2/3 width */}
        <Card className="border-border/50 lg:col-span-2">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="text-xs font-semibold flex items-center gap-1.5"><TrendingUp className="size-3 text-muted-foreground" /> Exchange Rates</span>
              <button className="text-[10px] text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowAllRates(!showAllRates)}>
                {showAllRates ? "less" : "all"}
              </button>
            </div>
            {ratesData ? (
              <div className="grid gap-px grid-cols-3 sm:grid-cols-5 bg-border/30 mx-3 mb-3 rounded-md overflow-hidden">
                {(showAllRates ? Object.keys(ratesData).sort() : RATE_CURRENCIES.filter((c) => ratesData[c]))
                  .map((currency) => {
                    const rate = ratesData[currency as string];
                    if (!rate) return null;
                    const isUSD = currency === "USD";
                    return (
                      <div key={currency} className={cn("bg-background px-2.5 py-2", isUSD && "bg-amber-500/5")}>
                        <p className="text-[10px] text-muted-foreground">{currency}</p>
                        <p className={cn("text-xs font-bold font-mono tabular-nums", isUSD && "text-amber-400")}>
                          {rate >= 1 ? rate.toLocaleString(undefined, { maximumFractionDigits: 0 }) : rate.toFixed(6)}
                        </p>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4 px-3">Unable to fetch rates</p>
            )}
          </CardContent>
        </Card>

        {/* Fee Credits ??? 1/3 width */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="px-4 pt-3 pb-2">
              <span className="text-xs font-semibold flex items-center gap-1.5"><CircleDollarSign className="size-3 text-muted-foreground" /> Fee Credits</span>
            </div>
            <div className="px-3 pb-3 space-y-1">
              {creditsData ? [
                { label: "Lightning", value: creditsData.lightning, icon: Zap, color: "text-amber-400" },
                { label: "Bitcoin", value: creditsData.bitcoin, icon: Bitcoin, color: "text-orange-400" },
                { label: "Liquid", value: creditsData.liquid, icon: Boxes, color: "text-blue-400" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center justify-between rounded-md bg-muted/20 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className={cn("size-3", color)} />{label}</span>
                  <span className="text-xs font-bold font-mono">{formatSats(value)}</span>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground text-center py-4">???</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Activity className="size-3 text-muted-foreground" /> Recent Payments
            </span>
            {totalPayments > 0 && <span className="text-[10px] text-muted-foreground tabular-nums">{totalPayments.toLocaleString()}</span>}
          </div>
          {payments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No payments yet</p>
          ) : (
            <div className="px-3 pb-3">
              <div className="rounded-md border border-border/30 divide-y divide-border/20">
                {payments.slice(0, 8).map((p) => {
                  const isIn = p.amount > 0;
                  return (
                    <div key={p.id || p.hash || p.created} className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/10 transition-colors">
                      <div className={cn("size-6 rounded-full flex items-center justify-center shrink-0", isIn ? "bg-emerald-500/10" : "bg-red-500/10")}>
                        {isIn ? <ArrowDownLeft className="size-3 text-emerald-400" /> : <ArrowUpRight className="size-3 text-red-400" />}
                      </div>
                      <span className={cn("text-xs font-semibold font-mono tabular-nums w-24 shrink-0", isIn ? "text-emerald-400" : "text-red-400")}>
                        {isIn ? "+" : ""}{formatSats(p.amount)}
                      </span>
                      <Badge variant="outline" className="text-[8px] px-1 py-0 capitalize shrink-0">{p.type}</Badge>
                      <span className="text-[10px] text-muted-foreground truncate flex-1">
                        {p.with?.username ? `${isIn ? "from" : "to"} ${p.with.username}` : p.memo || ""}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(p.created)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Volume summary */}
              {paymentsData?.incoming && paymentsData?.outgoing && (
                <div className="flex gap-3 mt-2">
                  {Object.keys(paymentsData.incoming).length > 0 && (
                    <div className="flex items-center gap-2 rounded-md bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 flex-1">
                      <ArrowDownLeft className="size-3 text-emerald-400 shrink-0" />
                      {Object.entries(paymentsData.incoming).map(([, data]) => (
                        <span key="in" className="text-xs font-mono font-bold">{formatSats(data.sats)}</span>
                      ))}
                      <span className="text-[10px] text-emerald-400">in</span>
                    </div>
                  )}
                  {Object.keys(paymentsData.outgoing).length > 0 && (
                    <div className="flex items-center gap-2 rounded-md bg-red-500/5 border border-red-500/10 px-3 py-1.5 flex-1">
                      <ArrowUpRight className="size-3 text-red-400 shrink-0" />
                      {Object.entries(paymentsData.outgoing).map(([, data]) => (
                        <span key="out" className="text-xs font-mono font-bold">{formatSats(data.sats)}</span>
                      ))}
                      <span className="text-[10px] text-red-400">out</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Funds Management (collapsible) */}
      <CoinosAdminFunds />

      {/* Invoice Management (collapsible) */}
      <CoinosAdminInvoices />

      {/* Admin warning ??? compact */}
      <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs">
        <AlertTriangle className="size-3.5 text-amber-400 shrink-0" />
        <span className="text-muted-foreground">Admin access ?? All actions logged ?? Transactions are irreversible</span>
      </div>

      {/* System Diagnostics (collapsible) */}
      <div className="rounded-lg border border-border/50">
        <button className="flex items-center justify-between w-full px-4 py-2.5" onClick={() => setShowDiagnostics(!showDiagnostics)}>
          <span className="text-xs font-semibold flex items-center gap-1.5"><Settings className="size-3 text-muted-foreground" /> System Diagnostics</span>
          <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", showDiagnostics && "rotate-180")} />
        </button>
        {showDiagnostics && (
          <div className="px-4 pb-3 space-y-0">
            {[
              { label: "CoinOS Enabled", value: statusData?.enabled ? "true" : "false" },
              { label: "Health", value: isHealthy ? "healthy" : "unhealthy" },
              { label: "Failures", value: String(statusData?.consecutiveFailures ?? "???") },
              { label: "Last Success", value: statusData?.lastSuccessTime ? new Date(statusData.lastSuccessTime as number).toISOString() : "???" },
              { label: "Last Failure", value: (statusData?.lastFailureReason as string) || "none" },
              { label: "Stalled", value: String(statusData?.stalledCheck ?? "???") },
              { label: "Alias", value: infoData?.alias || "???" },
              { label: "LND Version", value: nodeVersion || "???" },
              { label: "Bitcoin Impl", value: btcImpl || "???" },
              { label: "Pruned", value: isPruned ? "yes" : "no" },
              { label: "Pubkey", value: nodePubkey ? nodePubkey.slice(0, 20) + "???" + nodePubkey.slice(-8) : "???" },
              { label: "Network", value: nodeNetwork },
              { label: "Block", value: infoData?.block_height?.toLocaleString() || "???" },
              { label: "Chain Sync", value: String(infoData?.synced_to_chain ?? "???") },
              { label: "Graph Sync", value: String(infoData?.synced_to_graph ?? "???") },
              { label: "Active Ch", value: String(infoData?.num_active_channels ?? "???") },
              { label: "Inactive Ch", value: String(infoData?.num_inactive_channels ?? "???") },
              { label: "Pending Ch", value: String(infoData?.num_pending_channels ?? "???") },
              { label: "Peers", value: String(infoData?.num_peers ?? "???") },
              { label: "URIs", value: infoData?.uris?.length ? String(infoData.uris.length) : "0" },
              { label: "Payments", value: totalPayments.toLocaleString() },
              { label: "Credits LN", value: creditsData ? formatSats(creditsData.lightning) : "???" },
              { label: "Credits BTC", value: creditsData ? formatSats(creditsData.bitcoin) : "???" },
              { label: "Credits Liquid", value: creditsData ? formatSats(creditsData.liquid) : "???" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-1 border-b border-border/10 last:border-0 text-[11px] font-mono">
                <span className="text-muted-foreground">{label}</span>
                <span className="truncate max-w-[60%] text-right">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
// COINOS ADMIN ??? FUNDS MANAGEMENT
// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????

interface FundManagerItem {
  id: string;
  username: string;
  pubkey?: string;
  picture?: string;
}

function CoinosAdminFunds() {
  const [expanded, setExpanded] = useState(false);
  const [fundId, setFundId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fund, setFund] = useState<{ amount: number; authorization?: any; payments: CoinosPaymentItem[] } | null>(null);
  const [managers, setManagers] = useState<FundManagerItem[]>([]);
  const [error, setError] = useState("");

  // Authorize
  const [authAmount, setAuthAmount] = useState("");
  const [authCurrency, setAuthCurrency] = useState("USD");
  const [authSats, setAuthSats] = useState("");
  const [authorizing, setAuthorizing] = useState(false);

  // Withdraw
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState("");

  // Add manager
  const [newManager, setNewManager] = useState("");
  const [addingManager, setAddingManager] = useState(false);

  async function handleLookup() {
    if (!fundId.trim()) return;
    setLoading(true);
    setFund(null);
    setManagers([]);
    setError("");
    try {
      const [f, m] = await Promise.allSettled([
        api.get<{ amount: number; authorization?: any; payments: CoinosPaymentItem[] }>(`/coinos/fund/${encodeURIComponent(fundId.trim())}`),
        api.get<FundManagerItem[]>(`/coinos/fund/${encodeURIComponent(fundId.trim())}/managers`),
      ]);
      if (f.status === "fulfilled") setFund(f.value);
      else setError("Fund not found");
      if (m.status === "fulfilled") setManagers(Array.isArray(m.value) ? m.value : []);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  async function handleAuthorize() {
    if (!fundId.trim()) return;
    setAuthorizing(true);
    setError("");
    try {
      await api.post("/coinos/authorize", {
        id: fundId.trim(),
        fiat: parseFloat(authAmount) || 0,
        currency: authCurrency,
        amount: parseInt(authSats) || 0,
      });
      setAuthAmount("");
      setAuthSats("");
      await handleLookup();
    } catch (err: any) { setError(err.message); }
    setAuthorizing(false);
  }

  async function handleWithdraw() {
    if (!fundId.trim() || !withdrawAmount) return;
    setWithdrawing(true);
    setWithdrawResult("");
    setError("");
    try {
      await api.post("/coinos/take", { id: fundId.trim(), amount: parseInt(withdrawAmount) });
      setWithdrawResult("Withdrawal successful!");
      setWithdrawAmount("");
      await handleLookup();
    } catch (err: any) { setError(err.message); }
    setWithdrawing(false);
  }

  async function handleAddManager() {
    if (!fundId.trim() || !newManager.trim()) return;
    setAddingManager(true);
    setError("");
    try {
      const result = await api.post<FundManagerItem[]>("/coinos/fund/managers", { id: fundId.trim(), username: newManager.trim() });
      if (Array.isArray(result)) setManagers(result);
      setNewManager("");
    } catch (err: any) { setError(err.message); }
    setAddingManager(false);
  }

  async function handleRemoveManager(managerId: string) {
    if (!fundId.trim()) return;
    setError("");
    try {
      const result = await api.post<FundManagerItem[]>(`/coinos/fund/${encodeURIComponent(fundId.trim())}/managers/delete`, { id: managerId });
      if (Array.isArray(result)) setManagers(result);
      else setManagers((prev) => prev.filter((m) => m.id !== managerId));
    } catch (err: any) { setError(err.message); }
  }

  return (
    <Card className="border-border/50">
      <button className="flex items-center justify-between w-full px-4 py-3" onClick={() => setExpanded(!expanded)}>
        <span className="text-xs font-semibold flex items-center gap-1.5">
          <Vault className="size-3 text-muted-foreground" /> Funds Management
        </span>
        <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="size-3 shrink-0" /> {error}
              <button onClick={() => setError("")} className="ml-auto text-[10px] underline">dismiss</button>
            </div>
          )}

          {/* Lookup */}
          <div className="flex gap-2">
            <Input
              placeholder="Fund ID or name..."
              value={fundId}
              onChange={(e) => setFundId(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
            <Button onClick={handleLookup} disabled={!fundId.trim() || loading} size="sm" className="gap-1 h-8 px-3 shrink-0">
              {loading ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
              Load
            </Button>
          </div>

          {fund && (
            <>
              {/* Fund overview */}
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vault className="size-4 text-primary" />
                  <div>
                    <p className="text-xs font-semibold">Fund: {fundId}</p>
                    <p className="text-[10px] text-muted-foreground">{managers.length} manager{managers.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold font-mono tabular-nums">{formatSats(fund.amount)}</p>
                  {fund.authorization && (
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1 justify-end">
                      <ShieldCheck className="size-2.5" /> Auth: {formatSats(fund.authorization.amount || 0)}
                    </p>
                  )}
                </div>
              </div>

              {/* Authorize */}
              <div className="rounded-md border border-border/30 p-3 space-y-2">
                <p className="text-xs font-semibold">Authorize Spending</p>
                <div className="grid gap-2 grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Fiat</Label>
                    <Input type="number" value={authAmount} onChange={(e) => setAuthAmount(e.target.value)} placeholder="100" className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Currency</Label>
                    <Input value={authCurrency} onChange={(e) => setAuthCurrency(e.target.value.toUpperCase())} placeholder="USD" className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Sats</Label>
                    <Input type="number" value={authSats} onChange={(e) => setAuthSats(e.target.value)} placeholder="100000" className="h-7 text-xs" />
                  </div>
                </div>
                <Button onClick={handleAuthorize} disabled={authorizing} size="sm" className="gap-1 h-7 text-xs">
                  {authorizing ? <Loader2 className="size-3 animate-spin" /> : <ShieldCheck className="size-3" />}
                  Authorize
                </Button>
              </div>

              {/* Withdraw */}
              <div className="rounded-md border border-border/30 p-3 space-y-2">
                <p className="text-xs font-semibold">Withdraw</p>
                <div className="flex gap-2">
                  <Input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Sats" className="h-7 text-xs" />
                  <Button onClick={handleWithdraw} disabled={!withdrawAmount || withdrawing} size="sm" className="gap-1 h-7 text-xs shrink-0">
                    {withdrawing ? <Loader2 className="size-3 animate-spin" /> : <ArrowUpRight className="size-3" />}
                    Withdraw
                  </Button>
                </div>
                {withdrawResult && (
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1"><Check className="size-2.5" /> {withdrawResult}</p>
                )}
              </div>

              {/* Managers */}
              <div className="rounded-md border border-border/30 p-3 space-y-2">
                <p className="text-xs font-semibold">Managers</p>
                {managers.length > 0 ? (
                  <div className="space-y-1">
                    {managers.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-md bg-muted/20 px-2.5 py-1.5">
                        <div>
                          <p className="text-xs font-medium">{m.username}</p>
                          {m.pubkey && <p className="text-[9px] text-muted-foreground font-mono truncate max-w-[200px]">{m.pubkey}</p>}
                        </div>
                        <button onClick={() => handleRemoveManager(m.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">No managers</p>
                )}
                <div className="flex gap-2">
                  <Input placeholder="Username..." value={newManager} onChange={(e) => setNewManager(e.target.value)} className="h-7 text-xs" onKeyDown={(e) => e.key === "Enter" && handleAddManager()} />
                  <Button onClick={handleAddManager} disabled={!newManager.trim() || addingManager} size="sm" className="gap-1 h-7 text-xs shrink-0">
                    {addingManager ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                    Add
                  </Button>
                </div>
              </div>

              {/* Recent fund transactions */}
              {fund.payments && fund.payments.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold">Fund Transactions</p>
                  <div className="rounded-md border border-border/30 divide-y divide-border/20">
                    {fund.payments.slice(0, 8).map((p, i) => {
                      const isIn = p.amount > 0;
                      return (
                        <div key={p.id || i} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/10 transition-colors">
                          <div className={cn("size-5 rounded-full flex items-center justify-center shrink-0", isIn ? "bg-emerald-500/10" : "bg-red-500/10")}>
                            {isIn ? <ArrowDownLeft className="size-2.5 text-emerald-400" /> : <ArrowUpRight className="size-2.5 text-red-400" />}
                          </div>
                          <span className={cn("text-[10px] font-mono font-semibold tabular-nums w-20 shrink-0", isIn ? "text-emerald-400" : "text-red-400")}>
                            {isIn ? "+" : ""}{formatSats(p.amount)}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate flex-1">{p.memo || (isIn ? "Deposit" : "Withdrawal")}</span>
                          <span className="text-[9px] text-muted-foreground shrink-0">{timeAgo(p.created)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {!fund && !loading && fundId && (
            <p className="text-xs text-muted-foreground text-center py-4">Enter a fund ID and click Load</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
// COINOS ADMIN ??? INVOICE MANAGEMENT
// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????

interface AdminInvoiceItem {
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

function CoinosAdminInvoices() {
  const [expanded, setExpanded] = useState(false);
  const [invoices, setInvoices] = useState<AdminInvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // Create
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [invoiceType, setInvoiceType] = useState("lightning");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<AdminInvoiceItem | null>(null);

  // Lookup
  const [lookupId, setLookupId] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<AdminInvoiceItem | null>(null);

  async function loadInvoices() {
    setLoading(true);
    setError("");
    try {
      const list = await api.get<AdminInvoiceItem[]>("/coinos/invoices");
      setInvoices(Array.isArray(list) ? list : []);
      setLoaded(true);
    } catch { setInvoices([]); setLoaded(true); }
    setLoading(false);
  }

  async function handleCreate() {
    const amt = parseInt(amount);
    if (!amt) return;
    setCreating(true);
    setCreated(null);
    setError("");
    try {
      const inv = await api.post<AdminInvoiceItem>("/coinos/invoice", { invoice: { amount: amt, memo: memo || undefined, type: invoiceType } });
      setCreated(inv);
      setAmount("");
      setMemo("");
      if (loaded) await loadInvoices();
    } catch (err: any) { setError(err.message); }
    setCreating(false);
  }

  async function handleLookup() {
    if (!lookupId.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);
    setError("");
    try {
      const inv = await api.get<AdminInvoiceItem>(`/coinos/invoice/${encodeURIComponent(lookupId.trim())}`);
      setLookupResult(inv);
    } catch (err: any) { setError(err.message); }
    setLookupLoading(false);
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && !loaded) loadInvoices();
  }

  return (
    <Card className="border-border/50">
      <button className="flex items-center justify-between w-full px-4 py-3" onClick={handleExpand}>
        <span className="text-xs font-semibold flex items-center gap-1.5">
          <FileText className="size-3 text-muted-foreground" /> Invoice Management
        </span>
        <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="size-3 shrink-0" /> {error}
              <button onClick={() => setError("")} className="ml-auto text-[10px] underline">dismiss</button>
            </div>
          )}

          {/* Create invoice */}
          <div className="rounded-md border border-border/30 p-3 space-y-2">
            <p className="text-xs font-semibold">Create Invoice</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Amount (sats)</Label>
                <Input type="number" placeholder="21000" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-7 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Memo</Label>
                <Input placeholder="Payment for..." value={memo} onChange={(e) => setMemo(e.target.value)} className="h-7 text-xs" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {["lightning", "bitcoin", "liquid"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setInvoiceType(t)}
                    className={cn(
                      "rounded px-2 py-0.5 text-[10px] font-medium border transition-colors capitalize",
                      invoiceType === t ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Button onClick={handleCreate} disabled={!amount || creating} size="sm" className="gap-1 h-7 text-xs ml-auto">
                {creating ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                Create
              </Button>
            </div>
            {created && (
              <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-2 space-y-1.5">
                <p className="text-[10px] text-emerald-400 font-semibold">Invoice created!</p>
                {(created.bolt11 || created.hash || created.text) && (
                  <div className="flex items-start gap-1.5">
                    <code className="text-[9px] font-mono text-muted-foreground break-all flex-1 leading-relaxed">
                      {created.bolt11 || created.hash || created.text}
                    </code>
                    <button
                      onClick={() => copyText(created.bolt11 || created.hash || created.text || "", "admin-inv")}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                    >
                      {copied === "admin-inv" ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lookup invoice */}
          <div className="rounded-md border border-border/30 p-3 space-y-2">
            <p className="text-xs font-semibold">Lookup Invoice</p>
            <div className="flex gap-2">
              <Input placeholder="Invoice ID or hash..." value={lookupId} onChange={(e) => setLookupId(e.target.value)} className="h-7 text-xs" onKeyDown={(e) => e.key === "Enter" && handleLookup()} />
              <Button onClick={handleLookup} disabled={!lookupId.trim() || lookupLoading} size="sm" className="gap-1 h-7 text-xs shrink-0">
                {lookupLoading ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
                Lookup
              </Button>
            </div>
            {lookupResult && (
              <div className="grid grid-cols-2 gap-1.5 text-[10px] rounded-md bg-muted/20 p-2">
                <div><span className="text-muted-foreground">Amount:</span> <span className="font-semibold font-mono">{formatSats(lookupResult.amount)}</span></div>
                <div><span className="text-muted-foreground">Type:</span> <span className="font-semibold capitalize">{lookupResult.type || "???"}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className={cn("font-semibold", lookupResult.received ? "text-emerald-400" : "text-amber-400")}>{lookupResult.received ? "Paid" : "Pending"}</span></div>
                {lookupResult.memo && <div className="col-span-2"><span className="text-muted-foreground">Memo:</span> <span className="font-semibold">{lookupResult.memo}</span></div>}
              </div>
            )}
          </div>

          {/* Invoice list */}
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold">All Invoices</p>
                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={loadInvoices}>
                  <RefreshCw className="size-3" />
                </Button>
              </div>
              <div className="rounded-md border border-border/30 divide-y divide-border/20">
                {invoices.slice(0, 15).map((inv) => (
                  <div key={inv.id || inv.hash} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/10 transition-colors">
                    <div className="size-5 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Zap className="size-2.5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium truncate">
                        {inv.memo || `#${(inv.id || inv.hash || "").slice(0, 8)}`}
                      </p>
                      <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                        {inv.type && <span className="capitalize">{inv.type}</span>}
                        {inv.created && <span>?? {timeAgo(inv.created)}</span>}
                        <span>?? {inv.received ? "Paid" : "Pending"}</span>
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-semibold tabular-nums shrink-0">{formatSats(inv.amount)}</span>
                  </div>
                ))}
              </div>
              {invoices.length > 15 && (
                <p className="text-[10px] text-muted-foreground text-center mt-1">Showing 15 of {invoices.length}</p>
              )}
            </div>
          ) : loaded ? (
            <p className="text-xs text-muted-foreground text-center py-4">No invoices found</p>
          ) : null}
        </CardContent>
      )}
    </Card>
  );
}
