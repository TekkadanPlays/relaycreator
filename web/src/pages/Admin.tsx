import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { Link } from "inferno-router";
import { authStore, type User } from "../stores/auth";
import { api } from "../lib/api";
import { Badge } from "@/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/Tabs";
import {
  Shield, Zap, Globe, Users, Play, BarChart3, Lock, KeyRound, Bitcoin, Loader2,
} from "@/lib/icons";

import type {
  TabId, OverviewData, AdminRelay, AdminUser, AdminOrder,
  MyRelay, PermissionRequestItem, PermissionItem, PermissionTypeInfo,
  MyPermissionsData, CoinosStatus, NodeInfoData, CoinosPaymentsResponse,
  CoinosCreditsData, CoinosPaymentItem, AdminInvoiceItem, FundManagerItem,
} from "./admin/types";

import { renderOverview } from "./admin/OverviewTab";
import { renderMyRelays } from "./admin/MyRelaysTab";
import { renderRelays } from "./admin/RelaysTab";
import { renderUsers } from "./admin/UsersTab";
import { renderOrders } from "./admin/OrdersTab";
import { renderPermissions } from "./admin/PermissionsTab";
import { renderRequestAccess } from "./admin/RequestAccessTab";
import { renderCoinosGate, renderCoinosDashboard, renderCoinosFunds, renderCoinosInvoices } from "./admin/CoinosTab";
import { renderLoading } from "./admin/helpers";

// ─── State ───────────────────────────────────────────────────────────────────

interface AdminState {
  user: User | null;
  tab: TabId;
  fallbackDomain: string;

  overview: OverviewData | null; overviewLoading: boolean;
  relays: AdminRelay[]; relaysLoading: boolean; relaySearch: string;
  myRelays: MyRelay[]; moderatedRelays: MyRelay[]; myRelaysLoading: boolean; myRelaysError: string; copiedRelayId: string | null;
  users: AdminUser[]; usersLoading: boolean; userSearch: string;
  orders: AdminOrder[]; ordersLoading: boolean;

  permFilter: "pending" | "approved" | "denied";
  permRequests: PermissionRequestItem[]; permRequestsLoading: boolean;
  permGrants: PermissionItem[]; permGrantsLoading: boolean;
  permDeciding: boolean; permRevoking: boolean;

  myPerms: MyPermissionsData | null; myPermsLoading: boolean;
  permTypes: PermissionTypeInfo[];
  requestType: string; requestReason: string; requestSubmitting: boolean; requestError: string;

  coinosStatus: CoinosStatus | null; coinosStatusLoading: boolean;
  coinosInfo: NodeInfoData | null; coinosRates: Record<string, number> | null;
  coinosPayments: CoinosPaymentsResponse | null; coinosCredits: CoinosCreditsData | null;
  showAllRates: boolean; showDiagnostics: boolean; copiedPubkey: boolean;
  coinosHasPermission: boolean; coinosHasGrant: boolean;
  coinosDisclaimerAccepting: boolean; coinosDisclaimer: string;

  fundsExpanded: boolean; fundId: string; fundLoading: boolean;
  fund: { amount: number; authorization?: any; payments: CoinosPaymentItem[] } | null;
  fundManagers: FundManagerItem[]; fundError: string;
  authAmount: string; authCurrency: string; authSats: string; authorizing: boolean;
  withdrawAmount: string; withdrawing: boolean; withdrawResult: string;
  newManager: string; addingManager: boolean;

  invoicesExpanded: boolean; invoices: AdminInvoiceItem[]; invoicesLoading: boolean;
  invoicesLoaded: boolean; invoiceError: string; invoiceCopied: string | null;
  invAmount: string; invMemo: string; invType: string; invCreating: boolean;
  invCreated: AdminInvoiceItem | null;
  invLookupId: string; invLookupLoading: boolean; invLookupResult: AdminInvoiceItem | null;

  demoRelays: { id: string; name: string; domain: string | null; status: string | null; description: string | null }[];
  demoLoading: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default class Admin extends Component<{}, AdminState> {
  declare state: AdminState;
  private unsub: (() => void) | null = null;
  private coinosInterval: ReturnType<typeof setInterval> | null = null;

  constructor(props: {}) {
    super(props);
    const auth = authStore.get();
    this.state = {
      user: auth.user,
      tab: this.getDefaultTab(auth.user),
      fallbackDomain: "",

      overview: null, overviewLoading: false,
      relays: [], relaysLoading: false, relaySearch: "",
      myRelays: [], moderatedRelays: [], myRelaysLoading: false, myRelaysError: "", copiedRelayId: null,
      users: [], usersLoading: false, userSearch: "",
      orders: [], ordersLoading: false,

      permFilter: "pending", permRequests: [], permRequestsLoading: false,
      permGrants: [], permGrantsLoading: false, permDeciding: false, permRevoking: false,

      myPerms: null, myPermsLoading: false, permTypes: [],
      requestType: "", requestReason: "", requestSubmitting: false, requestError: "",

      coinosStatus: null, coinosStatusLoading: false, coinosInfo: null,
      coinosRates: null, coinosPayments: null, coinosCredits: null,
      showAllRates: false, showDiagnostics: false, copiedPubkey: false,
      coinosHasPermission: false, coinosHasGrant: false,
      coinosDisclaimerAccepting: false, coinosDisclaimer: "",

      fundsExpanded: false, fundId: "", fundLoading: false, fund: null,
      fundManagers: [], fundError: "", authAmount: "", authCurrency: "USD",
      authSats: "", authorizing: false, withdrawAmount: "", withdrawing: false,
      withdrawResult: "", newManager: "", addingManager: false,

      invoicesExpanded: false, invoices: [], invoicesLoading: false,
      invoicesLoaded: false, invoiceError: "", invoiceCopied: null,
      invAmount: "", invMemo: "", invType: "lightning", invCreating: false,
      invCreated: null, invLookupId: "", invLookupLoading: false, invLookupResult: null,

      demoRelays: [], demoLoading: false,
    };
  }

  private getDefaultTab(user: User | null): TabId {
    if (user?.admin) return "overview";
    if (user) return "myrelays";
    return "demo";
  }

  componentDidMount() {
    this.unsub = authStore.subscribe((s) => {
      this.setState({ user: s.user });
      this.checkCoinosPermission(s.user);
    });
    this.loadDomain();
    this.loadTabData(this.state.tab);
    this.checkCoinosPermission(this.state.user);
    this.loadPermTypes();
  }

  componentWillUnmount() {
    this.unsub?.();
    if (this.coinosInterval) clearInterval(this.coinosInterval);
  }

  private async loadDomain() {
    try {
      const cfg = await api.get<{ domain: string }>("/config");
      if (cfg?.domain) this.setState({ fallbackDomain: cfg.domain });
    } catch { /* ignore */ }
  }

  private async loadPermTypes() {
    try {
      const data = await api.get<{ types: PermissionTypeInfo[] }>("/permissions/types");
      this.setState({ permTypes: data?.types || [] });
    } catch { /* ignore */ }
  }

  private checkCoinosPermission(user: User | null) {
    if (!user) { this.setState({ coinosHasPermission: false, coinosHasGrant: false }); return; }
    const perms = user.permissions || [];
    const grant = perms.find((p) => p.type === "coinos_admin");
    this.setState({ coinosHasGrant: !!grant, coinosHasPermission: !!grant?.disclaimer_accepted });
  }

  private switchTab = (tab: TabId) => {
    this.setState({ tab });
    this.loadTabData(tab);
  };

  private async loadTabData(tab: TabId) {
    switch (tab) {
      case "overview": return this.loadOverview();
      case "relays": return this.loadRelays();
      case "myrelays": return this.loadMyRelays();
      case "users": return this.loadUsers();
      case "orders": return this.loadOrders();
      case "permissions": return this.loadPermissions();
      case "coinos": return this.loadCoinos();
      case "demo": return this.loadDemo();
      case "access": return this.loadMyPerms();
    }
  }

  // ─── Data Loaders ────────────────────────────────────────────────────────

  private async loadOverview() {
    this.setState({ overviewLoading: true });
    try { const d = await api.get<OverviewData>("/admin/overview"); this.setState({ overview: d, overviewLoading: false }); }
    catch { this.setState({ overviewLoading: false }); }
  }

  private async loadRelays() {
    this.setState({ relaysLoading: true });
    try { const d = await api.get<{ relays: AdminRelay[] }>("/admin/relays"); this.setState({ relays: d?.relays || [], relaysLoading: false }); }
    catch { this.setState({ relaysLoading: false }); }
  }

  private async loadMyRelays() {
    if (!this.state.user) return;
    this.setState({ myRelaysLoading: true, myRelaysError: "" });
    try {
      const d = await api.get<{ myRelays: MyRelay[]; moderatedRelays: MyRelay[] }>("/relays/mine");
      this.setState({ myRelays: d?.myRelays || [], moderatedRelays: d?.moderatedRelays || [], myRelaysLoading: false });
    } catch (e: any) { this.setState({ myRelaysLoading: false, myRelaysError: e.message || "Failed to load" }); }
  }

  private async loadUsers() {
    this.setState({ usersLoading: true });
    try { const d = await api.get<{ users: AdminUser[] }>("/admin/users"); this.setState({ users: d?.users || [], usersLoading: false }); }
    catch { this.setState({ usersLoading: false }); }
  }

  private async loadOrders() {
    this.setState({ ordersLoading: true });
    try { const d = await api.get<{ orders: AdminOrder[] }>("/admin/orders"); this.setState({ orders: d?.orders || [], ordersLoading: false }); }
    catch { this.setState({ ordersLoading: false }); }
  }

  private async loadPermissions() {
    this.setState({ permRequestsLoading: true, permGrantsLoading: true });
    try {
      const [rq, pg] = await Promise.all([
        api.get<{ requests: PermissionRequestItem[] }>(`/permissions/requests?status=${this.state.permFilter}`),
        api.get<{ permissions: PermissionItem[] }>("/permissions/all"),
      ]);
      this.setState({ permRequests: rq?.requests || [], permGrants: pg?.permissions || [], permRequestsLoading: false, permGrantsLoading: false });
    } catch { this.setState({ permRequestsLoading: false, permGrantsLoading: false }); }
  }

  private async loadMyPerms() {
    if (!this.state.user) return;
    this.setState({ myPermsLoading: true });
    try { const d = await api.get<MyPermissionsData>("/permissions/mine"); this.setState({ myPerms: d, myPermsLoading: false }); }
    catch { this.setState({ myPermsLoading: false }); }
  }

  private async loadCoinos() {
    this.setState({ coinosStatusLoading: true });
    try {
      const [status, info, rates, payments, credits] = await Promise.all([
        api.get<CoinosStatus>("/coinos/status").catch(() => null),
        api.get<NodeInfoData>("/coinos/info").catch(() => null),
        api.get<Record<string, number>>("/coinos/rates").catch(() => null),
        api.get<CoinosPaymentsResponse>("/coinos/payments?limit=20&offset=0").catch(() => null),
        api.get<CoinosCreditsData>("/coinos/credits").catch(() => null),
      ]);
      const disclaimer = this.state.permTypes.find((t) => t.type === "coinos_admin")?.disclaimer || "";
      this.setState({ coinosStatus: status, coinosInfo: info, coinosRates: rates, coinosPayments: payments, coinosCredits: credits, coinosStatusLoading: false, coinosDisclaimer: disclaimer });
    } catch { this.setState({ coinosStatusLoading: false }); }
    if (!this.coinosInterval) {
      this.coinosInterval = setInterval(() => { if (this.state.tab === "coinos") this.loadCoinos(); }, 30_000);
    }
  }

  private async loadDemo() {
    this.setState({ demoLoading: true });
    try { const d = await api.get<{ relays: typeof this.state.demoRelays }>("/relays/directory"); this.setState({ demoRelays: d?.relays || [], demoLoading: false }); }
    catch { this.setState({ demoLoading: false }); }
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  private handleDeleteRelay = async (id: string, name: string) => {
    if (!confirm(`Delete relay "${name}"? This cannot be undone.`)) return;
    try { await api.delete(`/admin/relays/${id}`); this.setState((s) => ({ relays: s.relays.filter((r) => r.id !== id) })); }
    catch (e: any) { alert(e.message || "Failed to delete"); }
  };

  private handleToggleAdmin = async (userId: string, currentAdmin: boolean) => {
    if (!confirm(`Are you sure you want to ${currentAdmin ? "remove admin from" : "make admin"} this user?`)) return;
    try { await api.patch(`/admin/users/${userId}`, { admin: !currentAdmin }); this.loadUsers(); }
    catch (e: any) { alert(e.message || "Failed to update"); }
  };

  private handlePermDecide = async (id: string, decision: "approved" | "denied") => {
    const note = decision === "denied" ? prompt("Reason for denial (optional):") : undefined;
    this.setState({ permDeciding: true });
    try { await api.post(`/permissions/requests/${id}/decide`, { decision, note: note || undefined }); this.loadPermissions(); }
    catch (e: any) { alert(e.message || "Failed"); }
    this.setState({ permDeciding: false });
  };

  private handlePermRevoke = async (userId: string, type: string, userName: string) => {
    if (!confirm(`Revoke ${type} from ${userName}?`)) return;
    this.setState({ permRevoking: true });
    try { await api.post("/permissions/revoke", { userId, type }); this.loadPermissions(); }
    catch (e: any) { alert(e.message || "Failed"); }
    this.setState({ permRevoking: false });
  };

  private handlePermFilterChange = (filter: "pending" | "approved" | "denied") => {
    this.setState({ permFilter: filter }, () => {
      api.get<{ requests: PermissionRequestItem[] }>(`/permissions/requests?status=${filter}`)
        .then((d) => this.setState({ permRequests: d?.requests || [] })).catch(() => {});
    });
  };

  private handleRequestAccess = async () => {
    const { requestType, requestReason } = this.state;
    if (!requestType) return;
    this.setState({ requestSubmitting: true, requestError: "" });
    try { await api.post("/permissions/request", { type: requestType, reason: requestReason || undefined }); this.setState({ requestType: "", requestReason: "" }); this.loadMyPerms(); }
    catch (e: any) { this.setState({ requestError: e.message || "Failed to submit" }); }
    this.setState({ requestSubmitting: false });
  };

  private handleCoinosDisclaimerAccept = async () => {
    this.setState({ coinosDisclaimerAccepting: true });
    try {
      await api.post("/permissions/accept-disclaimer", { type: "coinos_admin" });
      const { user: u } = await api.get<{ user: User }>("/auth/me");
      authStore.set({ user: u, token: authStore.get().token, loading: false });
    } catch { /* ignore */ }
    this.setState({ coinosDisclaimerAccepting: false });
  };

  private copyWss = (relay: MyRelay) => {
    const domain = relay.domain || this.state.fallbackDomain;
    navigator.clipboard.writeText(`wss://${relay.name}.${domain}`);
    this.setState({ copiedRelayId: relay.id });
    setTimeout(() => this.setState({ copiedRelayId: null }), 2000);
  };

  private copyNodePubkey = () => {
    const pk = this.state.coinosInfo?.identity_pubkey || this.state.coinosInfo?.pubkey || "";
    if (pk) { navigator.clipboard.writeText(pk); this.setState({ copiedPubkey: true }); setTimeout(() => this.setState({ copiedPubkey: false }), 2000); }
  };

  // ─── CoinOS Funds Actions ────────────────────────────────────────────────

  private fundLookup = async () => {
    const { fundId } = this.state;
    if (!fundId.trim()) return;
    this.setState({ fundLoading: true, fund: null, fundManagers: [], fundError: "" });
    try {
      const [f, m] = await Promise.allSettled([
        api.get<{ amount: number; authorization?: any; payments: CoinosPaymentItem[] }>(`/coinos/fund/${encodeURIComponent(fundId.trim())}`),
        api.get<FundManagerItem[]>(`/coinos/fund/${encodeURIComponent(fundId.trim())}/managers`),
      ]);
      if (f.status === "fulfilled") this.setState({ fund: f.value }); else this.setState({ fundError: "Fund not found" });
      if (m.status === "fulfilled") this.setState({ fundManagers: Array.isArray(m.value) ? m.value : [] });
    } catch (e: any) { this.setState({ fundError: e.message }); }
    this.setState({ fundLoading: false });
  };

  private fundAuthorize = async () => {
    const { fundId, authAmount, authCurrency, authSats } = this.state;
    if (!fundId.trim()) return;
    this.setState({ authorizing: true, fundError: "" });
    try {
      await api.post("/coinos/authorize", { id: fundId.trim(), fiat: parseFloat(authAmount) || 0, currency: authCurrency, amount: parseInt(authSats) || 0 });
      this.setState({ authAmount: "", authSats: "" }); await this.fundLookup();
    } catch (e: any) { this.setState({ fundError: e.message }); }
    this.setState({ authorizing: false });
  };

  private fundWithdraw = async () => {
    const { fundId, withdrawAmount } = this.state;
    if (!fundId.trim() || !withdrawAmount) return;
    this.setState({ withdrawing: true, withdrawResult: "", fundError: "" });
    try {
      await api.post("/coinos/take", { id: fundId.trim(), amount: parseInt(withdrawAmount) });
      this.setState({ withdrawResult: "Withdrawal successful!", withdrawAmount: "" }); await this.fundLookup();
    } catch (e: any) { this.setState({ fundError: e.message }); }
    this.setState({ withdrawing: false });
  };

  private fundAddManager = async () => {
    const { fundId, newManager } = this.state;
    if (!fundId.trim() || !newManager.trim()) return;
    this.setState({ addingManager: true, fundError: "" });
    try {
      const r = await api.post<FundManagerItem[]>("/coinos/fund/managers", { id: fundId.trim(), username: newManager.trim() });
      if (Array.isArray(r)) this.setState({ fundManagers: r });
      this.setState({ newManager: "" });
    } catch (e: any) { this.setState({ fundError: e.message }); }
    this.setState({ addingManager: false });
  };

  private fundRemoveManager = async (managerId: string) => {
    const { fundId } = this.state;
    if (!fundId.trim()) return;
    this.setState({ fundError: "" });
    try {
      const r = await api.post<FundManagerItem[]>(`/coinos/fund/${encodeURIComponent(fundId.trim())}/managers/delete`, { id: managerId });
      if (Array.isArray(r)) this.setState({ fundManagers: r });
      else this.setState((s) => ({ fundManagers: s.fundManagers.filter((m) => m.id !== managerId) }));
    } catch (e: any) { this.setState({ fundError: e.message }); }
  };

  // ─── CoinOS Invoice Actions ──────────────────────────────────────────────

  private invoiceLoad = async () => {
    this.setState({ invoicesLoading: true, invoiceError: "" });
    try { const l = await api.get<AdminInvoiceItem[]>("/coinos/invoices"); this.setState({ invoices: Array.isArray(l) ? l : [], invoicesLoaded: true }); }
    catch { this.setState({ invoices: [], invoicesLoaded: true }); }
    this.setState({ invoicesLoading: false });
  };

  private invoiceCreate = async () => {
    const amt = parseInt(this.state.invAmount);
    if (!amt) return;
    this.setState({ invCreating: true, invCreated: null, invoiceError: "" });
    try {
      const inv = await api.post<AdminInvoiceItem>("/coinos/invoice", { invoice: { amount: amt, memo: this.state.invMemo || undefined, type: this.state.invType } });
      this.setState({ invCreated: inv, invAmount: "", invMemo: "" });
      if (this.state.invoicesLoaded) await this.invoiceLoad();
    } catch (e: any) { this.setState({ invoiceError: e.message }); }
    this.setState({ invCreating: false });
  };

  private invoiceLookup = async () => {
    const { invLookupId } = this.state;
    if (!invLookupId.trim()) return;
    this.setState({ invLookupLoading: true, invLookupResult: null, invoiceError: "" });
    try { const inv = await api.get<AdminInvoiceItem>(`/coinos/invoice/${encodeURIComponent(invLookupId.trim())}`); this.setState({ invLookupResult: inv }); }
    catch (e: any) { this.setState({ invoiceError: e.message }); }
    this.setState({ invLookupLoading: false });
  };

  private invoiceCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    this.setState({ invoiceCopied: id });
    setTimeout(() => this.setState({ invoiceCopied: null }), 2000);
  };

  private invoiceToggle = () => {
    const next = !this.state.invoicesExpanded;
    this.setState({ invoicesExpanded: next });
    if (next && !this.state.invoicesLoaded) this.invoiceLoad();
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  private renderDemo() {
    const { demoRelays, demoLoading, fallbackDomain } = this.state;
    if (demoLoading) return renderLoading();
    return createElement("div", { className: "space-y-4" },
      createElement("div", null,
        createElement("h2", { className: "text-lg font-semibold" }, "Relay Directory"),
        createElement("p", { className: "text-sm text-muted-foreground" }, "Browse public relays on this platform"),
      ),
      demoRelays.length === 0
        ? createElement("div", { className: "py-12 text-center text-sm text-muted-foreground" }, "No public relays found")
        : createElement("div", { className: "rounded-lg border border-border/50 divide-y divide-border/30" },
            ...demoRelays.slice(0, 20).map((r) =>
              createElement(Link, { key: r.id, to: `/relays/${r.name}`, className: "flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors" },
                createElement("div", null,
                  createElement("p", { className: "font-medium text-sm" }, r.name),
                  createElement("p", { className: "text-xs text-muted-foreground font-mono" }, r.name + "." + (r.domain || fallbackDomain)),
                  r.description ? createElement("p", { className: "text-xs text-muted-foreground mt-0.5 line-clamp-1" }, r.description) : null,
                ),
                createElement(Badge, {
                  variant: "secondary",
                  className: r.status === "running" ? "text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "text-[10px]",
                }, r.status || "unknown"),
              ),
            ),
          ),
    );
  }

  private renderCoinosTab() {
    const s = this.state;
    const gate = renderCoinosGate(s.user, s.coinosHasGrant, s.coinosHasPermission, s.coinosDisclaimerAccepting, s.coinosDisclaimer, this.handleCoinosDisclaimerAccept);
    if (gate) return gate;

    const fundsEl = renderCoinosFunds(
      s.fundsExpanded, s.fundId, s.fundLoading, s.fund, s.fundManagers, s.fundError,
      s.authAmount, s.authCurrency, s.authSats, s.authorizing,
      s.withdrawAmount, s.withdrawing, s.withdrawResult, s.newManager, s.addingManager,
      () => this.setState((p) => ({ fundsExpanded: !p.fundsExpanded })),
      (v) => this.setState({ fundId: v }), this.fundLookup,
      (v) => this.setState({ authAmount: v }), (v) => this.setState({ authCurrency: v }), (v) => this.setState({ authSats: v }),
      this.fundAuthorize, (v) => this.setState({ withdrawAmount: v }), this.fundWithdraw,
      (v) => this.setState({ newManager: v }), this.fundAddManager, this.fundRemoveManager,
      () => this.setState({ fundError: "" }),
    );

    const invoicesEl = renderCoinosInvoices(
      s.invoicesExpanded, s.invoices, s.invoicesLoading, s.invoicesLoaded, s.invoiceError, s.invoiceCopied,
      s.invAmount, s.invMemo, s.invType, s.invCreating, s.invCreated,
      s.invLookupId, s.invLookupLoading, s.invLookupResult,
      this.invoiceToggle,
      (v) => this.setState({ invAmount: v }), (v) => this.setState({ invMemo: v }), (v) => this.setState({ invType: v }),
      this.invoiceCreate, (v) => this.setState({ invLookupId: v }), this.invoiceLookup, this.invoiceCopyText,
    );

    return renderCoinosDashboard(
      s.coinosStatus, s.coinosStatusLoading, s.coinosInfo, s.coinosRates, s.coinosPayments, s.coinosCredits,
      s.showAllRates, s.showDiagnostics, s.copiedPubkey,
      () => this.loadCoinos(),
      () => this.setState((p) => ({ showAllRates: !p.showAllRates })),
      () => this.setState((p) => ({ showDiagnostics: !p.showDiagnostics })),
      this.copyNodePubkey,
      fundsEl, invoicesEl,
    );
  }

  render() {
    const { user, tab } = this.state;
    const isAdmin = !!user?.admin;

    const tabs: { id: TabId; label: string; icon: any; adminOnly?: boolean }[] = [
      { id: "overview", label: "Overview", icon: Shield, adminOnly: true },
      { id: "myrelays", label: "My Relays", icon: Globe },
      { id: "relays", label: "All Relays", icon: Globe, adminOnly: true },
      { id: "users", label: "Users", icon: Users, adminOnly: true },
      { id: "orders", label: "Orders", icon: BarChart3, adminOnly: true },
      { id: "permissions", label: "Permissions", icon: Lock, adminOnly: true },
      { id: "coinos", label: "CoinOS", icon: Bitcoin },
      { id: "access", label: "Request Access", icon: KeyRound },
      { id: "demo", label: "Directory", icon: Play },
    ];

    const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

    return createElement("div", { className: "space-y-6 animate-in" },
      // Header
      createElement("div", { className: "flex items-start justify-between gap-4" },
        createElement("div", null,
          createElement("h1", { className: "text-2xl font-extrabold tracking-tight flex items-center gap-2.5" },
            createElement(Shield, { className: "size-6 text-primary" }),
            isAdmin ? "Admin Panel" : user ? "Dashboard" : "Relay Explorer",
          ),
          createElement("p", { className: "text-sm text-muted-foreground mt-1" },
            isAdmin ? "Manage relays, users, orders, and platform settings"
              : user ? "Manage your relays and account"
              : "Browse the relay directory",
          ),
        ),
        user ? createElement(Link, { to: "/signup", className: "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0" },
          createElement(Zap, { className: "size-4" }), "New Relay",
        ) : null,
      ),

      createElement(Tabs, { value: tab },
        createElement(TabsList, { className: "flex-wrap h-auto gap-0.5 p-1" },
          ...visibleTabs.map((t) =>
            createElement(TabsTrigger, {
              key: t.id, value: t.id, active: tab === t.id,
              onClick: () => this.switchTab(t.id),
              className: "gap-1.5 text-xs",
            },
              createElement(t.icon, { className: "size-3.5" }),
              t.label,
            ),
          ),
        ),

        createElement(TabsContent, { value: "overview", active: tab === "overview" },
          renderOverview(this.state.overview, this.state.overviewLoading, this.state.fallbackDomain),
        ),
        createElement(TabsContent, { value: "myrelays", active: tab === "myrelays" },
          renderMyRelays(this.state.user, this.state.myRelays, this.state.moderatedRelays, this.state.myRelaysLoading, this.state.myRelaysError, this.state.copiedRelayId, this.state.fallbackDomain, this.copyWss),
        ),
        createElement(TabsContent, { value: "relays", active: tab === "relays" },
          renderRelays(this.state.relays, this.state.relaysLoading, this.state.relaySearch, this.state.fallbackDomain, (v) => this.setState({ relaySearch: v }), this.handleDeleteRelay),
        ),
        createElement(TabsContent, { value: "users", active: tab === "users" },
          renderUsers(this.state.users, this.state.usersLoading, this.state.userSearch, (v) => this.setState({ userSearch: v }), this.handleToggleAdmin),
        ),
        createElement(TabsContent, { value: "orders", active: tab === "orders" },
          renderOrders(this.state.orders, this.state.ordersLoading),
        ),
        createElement(TabsContent, { value: "permissions", active: tab === "permissions" },
          renderPermissions(this.state.permFilter, this.state.permRequests, this.state.permRequestsLoading, this.state.permGrants, this.state.permGrantsLoading, this.state.permDeciding, this.state.permRevoking, this.handlePermFilterChange, this.handlePermDecide, this.handlePermRevoke),
        ),
        createElement(TabsContent, { value: "coinos", active: tab === "coinos" },
          this.renderCoinosTab(),
        ),
        createElement(TabsContent, { value: "access", active: tab === "access" },
          renderRequestAccess(this.state.user, this.state.myPerms, this.state.myPermsLoading, this.state.permTypes, this.state.requestType, this.state.requestReason, this.state.requestSubmitting, this.state.requestError, (t) => this.setState({ requestType: t }), (r) => this.setState({ requestReason: r }), this.handleRequestAccess),
        ),
        createElement(TabsContent, { value: "demo", active: tab === "demo" },
          this.renderDemo(),
        ),
      ),
    );
  }
}
