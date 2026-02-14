import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import {
  Radio, Users, Zap, Globe, Shield, Loader2, Settings, Server,
  ArrowRight, Trash2, Search, RefreshCw, Lock, ChevronDown,
  Activity, DollarSign, BarChart3, Eye, Copy, Check, X,
  Play, ExternalLink, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRelayDomain } from "../hooks/useRelayDomain";

type Tab = "myrelays" | "overview" | "relays" | "users" | "orders" | "config" | "demo";
type PanelTier = "admin" | "operator" | "demo";

const ADMIN_TABS: { id: Tab; label: string; icon: typeof Globe }[] = [
  { id: "myrelays", label: "My Relays", icon: Zap },
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "relays", label: "All Relays", icon: Radio },
  { id: "users", label: "Users", icon: Users },
  { id: "orders", label: "Orders", icon: DollarSign },
  { id: "config", label: "Config", icon: Settings },
];

const OPERATOR_TABS: { id: Tab; label: string; icon: typeof Globe }[] = [
  { id: "myrelays", label: "My Relays", icon: Zap },
];

const DEMO_TABS: { id: Tab; label: string; icon: typeof Globe }[] = [
  { id: "demo", label: "Live Demo", icon: Play },
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
  const defaultTab: Tab = tier === "admin" ? "myrelays" : tier === "operator" ? "myrelays" : "demo";
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
          {tab === "config" && <ConfigTab />}
          {tab === "demo" && <DemoTab />}
        </main>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OVERVIEW TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function OverviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => api.get<Stats>("/admin/stats"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = data;
  if (!stats) return null;

  const cards = [
    { label: "Total Relays", value: stats.totalRelays, icon: Radio, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Running", value: stats.runningRelays, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Provisioning", value: stats.provisioningRelays, icon: Loader2, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Total Orders", value: stats.totalOrders, icon: Zap, color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Paid Orders", value: stats.paidOrders, icon: Check, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Last 30 Days", value: stats.recentOrders, icon: BarChart3, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Total Revenue", value: `${stats.totalRevenue.toLocaleString()} sats`, icon: DollarSign, color: "text-amber-400", bg: "bg-amber-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Overview</h2>
        <p className="text-sm text-muted-foreground">Server statistics at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
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
                      <p className="font-mono text-xs text-muted-foreground truncate max-w-[120px]">
                        {relay.owner.pubkey.slice(0, 16)}...
                      </p>
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
            placeholder="Search by pubkey..."
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
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Pubkey</th>
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
                      <div>
                        <p className="font-mono text-xs truncate max-w-[200px]">{u.pubkey}</p>
                        {u.name && <p className="text-xs text-muted-foreground">{u.name}</p>}
                      </div>
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
                      <p className="font-mono text-xs text-muted-foreground truncate max-w-[100px]">
                        {order.user.pubkey.slice(0, 12)}...
                      </p>
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
// CONFIG TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ConfigTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "config"],
    queryFn: () => api.get<AdminConfig>("/admin/config"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const config = data;
  if (!config) return null;

  const items = [
    { label: "Domain", value: config.domain, icon: Globe },
    { label: "Payments Enabled", value: config.payments_enabled ? "Yes" : "No", icon: Zap },
    { label: "CoinOS Enabled", value: config.coinos_enabled ? "Yes" : "No", icon: DollarSign },
    { label: "LNBits Configured", value: config.lnbits_configured ? "Yes" : "No", icon: Server },
    { label: "Standard Price", value: `${config.invoice_amount.toLocaleString()} sats`, icon: Zap },
    { label: "Premium Price", value: `${config.invoice_premium_amount.toLocaleString()} sats`, icon: Zap },
    { label: "CORS Origin", value: config.cors_origin, icon: Shield },
    { label: "API Port", value: String(config.port), icon: Server },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Server Configuration</h2>
        <p className="text-sm text-muted-foreground">Current server settings (read-only, edit via .env file).</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="divide-y divide-border/30">
            {items.map((item) => (
              <div key={item.label} className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-muted p-1.5">
                    <item.icon className="size-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <span className="text-sm font-mono text-muted-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
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
