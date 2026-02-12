import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import {
  Radio, Users, Zap, Globe, Shield, Loader2, Settings, Server,
  ArrowRight, Trash2, Search, RefreshCw, Lock, ChevronDown,
  Activity, DollarSign, BarChart3, Eye, Copy, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Tab = "overview" | "relays" | "users" | "orders" | "config";

const TABS: { id: Tab; label: string; icon: typeof Globe }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "relays", label: "Relays", icon: Radio },
  { id: "users", label: "Users", icon: Users },
  { id: "orders", label: "Orders", icon: Zap },
  { id: "config", label: "Config", icon: Settings },
];

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
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  if (!user?.admin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Lock className="size-10 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold">Admin Access Required</h2>
        <p className="mt-1 text-sm text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-56 shrink-0 space-y-4">
          <div className="flex items-center gap-2.5 px-1">
            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="size-4.5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-sm">Admin Panel</h1>
              <p className="text-[11px] text-muted-foreground">Server Management</p>
            </div>
          </div>

          <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {TABS.map((t) => (
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
          {tab === "overview" && <OverviewTab />}
          {tab === "relays" && <RelaysTab />}
          {tab === "users" && <UsersTab />}
          {tab === "orders" && <OrdersTab />}
          {tab === "config" && <ConfigTab />}
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
                          {relay.name}.{relay.domain}
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
