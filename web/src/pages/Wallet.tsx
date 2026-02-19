import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { authStore, type User } from "../stores/auth";
import { api } from "../lib/api";
import {
  coinos, getCoinosToken, setCoinosToken, clearWalletSession, getActivePubkey,
  type CoinosUser, type CoinosPayment, type CoinosPaymentsResponse,
  type CoinosAccount, type CoinosContact, type CoinosInvoice, type CoinosApp,
  type CoinosStatus,
} from "../lib/coinos";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { Badge } from "@/ui/Badge";
import { Input } from "@/ui/Input";
import { Label } from "@/ui/Label";
import { Separator } from "@/ui/Separator";
import { cn } from "@/ui/utils";
import {
  Wallet as WalletIcon, Zap, ArrowDownLeft, ArrowUpRight, RefreshCw,
  AlertCircle, Loader2, Bitcoin, LogOut, Users, Layers, Clock,
  AtSign, Send, Copy, Check, Coins, Radio, Settings, Plus, Trash2,
  ExternalLink, Lock, Eye, Search, ChevronDown, X,
} from "@/lib/icons";

// ─── Types ───────────────────────────────────────────────────────────────────

type Section = "overview" | "receive" | "send" | "history" | "accounts" | "contacts" | "ecash" | "nwc" | "settings";

interface WalletState {
  user: User | null;
  config: { coinos_enabled: boolean } | null;
  status: CoinosStatus | null;
  coinosUser: CoinosUser | null;
  payments: CoinosPayment[];
  totalPayments: number;
  incoming: number;
  outgoing: number;
  loading: boolean;
  connecting: boolean;
  error: string;
  btcRate: number | null;
  section: Section;
  copied: string | null;
  page: number;

  // Accounts
  accounts: CoinosAccount[];
  accountName: string;
  accountCreating: boolean;

  // Contacts
  contacts: CoinosContact[];

  // Send
  sendTo: string;
  sendAmount: string;
  sendMemo: string;
  sending: boolean;
  sendResult: string;

  // Receive
  recvAmount: string;
  recvMemo: string;
  recvType: string;
  recvCreating: boolean;
  recvInvoice: CoinosInvoice | null;

  // Ecash
  ecashToken: string;
  ecashClaiming: boolean;
  ecashMintAmount: string;
  ecashMinting: boolean;
  ecashResult: string;

  // NWC
  apps: CoinosApp[];
  appsLoading: boolean;
}

const PAGE_SIZE = 15;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtSats(amount: number): string {
  return new Intl.NumberFormat().format(Math.abs(amount));
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function paymentLabel(p: CoinosPayment): string {
  if (p.with) return p.with.username;
  if (p.type === "lightning" || p.type === "bolt12") return "Lightning";
  if (p.type === "ecash") return p.amount > 0 ? "Ecash redeemed" : "Ecash minted";
  if (p.type === "bitcoin") return "On-chain";
  if (p.type === "liquid") return "Liquid";
  if (p.type === "internal") return "Internal";
  return p.amount > 0 ? "Received" : "Sent";
}

// ─── Component ───────────────────────────────────────────────────────────────

export default class Wallet extends Component<{}, WalletState> {
  declare state: WalletState;
  private unsub: (() => void) | null = null;

  constructor(props: {}) {
    super(props);
    const auth = authStore.get();
    this.state = {
      user: auth.user, config: null, status: null, coinosUser: null,
      payments: [], totalPayments: 0, incoming: 0, outgoing: 0,
      loading: true, connecting: false, error: "", btcRate: null,
      section: "overview", copied: null, page: 0,
      accounts: [], accountName: "", accountCreating: false,
      contacts: [],
      sendTo: "", sendAmount: "", sendMemo: "", sending: false, sendResult: "",
      recvAmount: "", recvMemo: "", recvType: "lightning", recvCreating: false, recvInvoice: null,
      ecashToken: "", ecashClaiming: false, ecashMintAmount: "", ecashMinting: false, ecashResult: "",
      apps: [], appsLoading: false,
    };
  }

  componentDidMount() {
    this.unsub = authStore.subscribe((s) => this.setState({ user: s.user }));
    this.loadData();
  }

  componentWillUnmount() { this.unsub?.(); }

  private satsToUsd = (sats: number): string | null => {
    if (!this.state.btcRate) return null;
    const usd = (Math.abs(sats) / 100_000_000) * this.state.btcRate;
    return usd.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2 });
  };

  private copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    this.setState({ copied: id });
    setTimeout(() => this.setState({ copied: null }), 2000);
  };

  // ─── Data Loading ────────────────────────────────────────────────────────

  private loadData = async () => {
    this.setState({ loading: true, error: "" });
    try {
      const cfg = await api.get<{ coinos_enabled: boolean }>("/config");
      this.setState({ config: cfg });
      if (!cfg.coinos_enabled) { this.setState({ loading: false }); return; }

      const s = await coinos.status();
      this.setState({ status: s });

      if (s.healthy) {
        try { const rates = await coinos.rates(); if (rates?.USD) this.setState({ btcRate: rates.USD }); } catch {}

        const activePk = await getActivePubkey();
        const storedPk = localStorage.getItem("coinos_pubkey");
        if (storedPk && activePk && storedPk !== activePk) {
          clearWalletSession();
          this.setState({ coinosUser: null, payments: [] });
        }

        if (getCoinosToken()) {
          await this.loadWalletData();
        } else if ((window as any).nostr) {
          const ok = await this.connectWithNostr();
          if (ok) await this.loadWalletData();
        }
      }
    } catch (err: any) { this.setState({ error: err.message }); }
    this.setState({ loading: false });
  };

  private connectWithNostr = async (): Promise<boolean> => {
    const nostr = (window as any).nostr;
    if (!nostr) { this.setState({ error: "No Nostr extension found" }); return false; }
    this.setState({ connecting: true });
    try {
      const { challenge } = await coinos.challenge();
      const event = {
        kind: 27235,
        created_at: Math.floor(Date.now() / 1000),
        content: "",
        tags: [
          ["u", `${window.location.origin}/api/coinos/nostrAuth`],
          ["method", "POST"],
          ["challenge", challenge],
        ],
      };
      const signedEvent = await nostr.signEvent(event);
      const pubkey = signedEvent.pubkey || (await nostr.getPublicKey());
      const result = await coinos.nostrAuth({ challenge, event: signedEvent });
      if (result.token) { setCoinosToken(pubkey, result.token); return true; }
      this.setState({ error: "Authentication failed" });
      return false;
    } catch (err: any) { this.setState({ error: err.message || "Failed to connect" }); return false; }
    finally { this.setState({ connecting: false }); }
  };

  private loadWalletData = async () => {
    try {
      const me = await coinos.me();
      this.setState({ coinosUser: me });
      await this.loadPayments(0);
      Promise.all([
        coinos.listAccounts().then((a) => this.setState({ accounts: a })).catch(() => {}),
        coinos.listContacts(20).then((c) => this.setState({ contacts: c })).catch(() => {}),
      ]);
    } catch {
      clearWalletSession();
      this.setState({ coinosUser: null });
    }
  };

  private loadPayments = async (pageNum: number) => {
    try {
      const resp = await coinos.payments(PAGE_SIZE, pageNum * PAGE_SIZE);
      const inSats = resp.incoming ? Object.values(resp.incoming).reduce((a, b) => a + (b.sats || 0), 0) : 0;
      const outSats = resp.outgoing ? Object.values(resp.outgoing).reduce((a, b) => a + Math.abs(b.sats || 0), 0) : 0;
      this.setState({ payments: resp.payments || [], totalPayments: resp.count || 0, incoming: inSats, outgoing: outSats, page: pageNum });
    } catch {
      try {
        const legacy = await coinos.paymentsLegacy();
        const arr = Array.isArray(legacy) ? legacy : [];
        this.setState({
          payments: arr, totalPayments: arr.length,
          incoming: arr.filter((p) => p.amount > 0).reduce((a, b) => a + b.amount, 0),
          outgoing: arr.filter((p) => p.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0),
        });
      } catch {}
    }
  };

  private handleConnect = async () => {
    this.setState({ error: "" });
    const ok = await this.connectWithNostr();
    if (ok) await this.loadWalletData();
  };

  private handleLogout = () => {
    clearWalletSession();
    this.setState({ coinosUser: null, payments: [], accounts: [], contacts: [] });
  };

  // ─── Send ────────────────────────────────────────────────────────────────

  private handleSend = async () => {
    const { sendTo, sendAmount, sendMemo } = this.state;
    const amt = parseInt(sendAmount);
    if (!sendTo.trim() || !amt) return;
    this.setState({ sending: true, sendResult: "", error: "" });
    try {
      if (sendTo.includes("@")) {
        await coinos.sendToLnAddress(sendTo.trim(), amt);
      } else if (sendTo.startsWith("ln") || sendTo.startsWith("LNBC") || sendTo.startsWith("lnbc")) {
        await coinos.sendPayment({ payreq: sendTo.trim(), amount: amt, memo: sendMemo || undefined });
      } else {
        await coinos.sendInternal({ username: sendTo.trim(), amount: amt, memo: sendMemo || undefined });
      }
      this.setState({ sendResult: "Payment sent!", sendTo: "", sendAmount: "", sendMemo: "" });
      await this.loadWalletData();
    } catch (err: any) { this.setState({ error: err.message }); }
    this.setState({ sending: false });
  };

  // ─── Receive ─────────────────────────────────────────────────────────────

  private handleCreateInvoice = async () => {
    const amt = parseInt(this.state.recvAmount);
    if (!amt) return;
    this.setState({ recvCreating: true, recvInvoice: null, error: "" });
    try {
      const inv = await coinos.createInvoice({ amount: amt, memo: this.state.recvMemo || undefined, type: this.state.recvType });
      this.setState({ recvInvoice: inv, recvAmount: "", recvMemo: "" });
    } catch (err: any) { this.setState({ error: err.message }); }
    this.setState({ recvCreating: false });
  };

  // ─── Accounts ────────────────────────────────────────────────────────────

  private handleCreateAccount = async () => {
    const { accountName } = this.state;
    if (!accountName.trim()) return;
    this.setState({ accountCreating: true, error: "" });
    try {
      const acct = await coinos.createAccount({ name: accountName.trim() });
      this.setState((s) => ({ accounts: [...s.accounts, acct], accountName: "" }));
    } catch (err: any) { this.setState({ error: err.message }); }
    this.setState({ accountCreating: false });
  };

  private handleDeleteAccount = async (id: string) => {
    if (!confirm("Delete this account?")) return;
    try { await coinos.deleteAccount(id); this.setState((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })); }
    catch (err: any) { this.setState({ error: err.message }); }
  };

  // ─── Contacts ────────────────────────────────────────────────────────────

  private handlePinContact = async (id: string, pinned: boolean) => {
    try {
      if (pinned) await coinos.unpinContact(id); else await coinos.pinContact(id);
      this.setState((s) => ({ contacts: s.contacts.map((c) => c.id === id ? { ...c, pinned: !pinned } : c) }));
    } catch (err: any) { this.setState({ error: err.message }); }
  };

  // ─── Ecash ───────────────────────────────────────────────────────────────

  private handleClaimEcash = async () => {
    const { ecashToken } = this.state;
    if (!ecashToken.trim()) return;
    this.setState({ ecashClaiming: true, ecashResult: "", error: "" });
    try { await coinos.claimEcash(ecashToken.trim()); this.setState({ ecashResult: "Ecash claimed!", ecashToken: "" }); await this.loadWalletData(); }
    catch (err: any) { this.setState({ error: err.message }); }
    this.setState({ ecashClaiming: false });
  };

  private handleMintEcash = async () => {
    const amt = parseInt(this.state.ecashMintAmount);
    if (!amt) return;
    this.setState({ ecashMinting: true, ecashResult: "", error: "" });
    try {
      const result = await coinos.mintEcash(amt);
      this.setState({ ecashResult: `Ecash minted! Token: ${result.token?.slice(0, 30)}...`, ecashMintAmount: "" });
      await this.loadWalletData();
    } catch (err: any) { this.setState({ error: err.message }); }
    this.setState({ ecashMinting: false });
  };

  // ─── NWC ─────────────────────────────────────────────────────────────────

  private loadApps = async () => {
    this.setState({ appsLoading: true });
    try { const apps = await coinos.listApps(); this.setState({ apps: Array.isArray(apps) ? apps : [] }); }
    catch { this.setState({ apps: [] }); }
    this.setState({ appsLoading: false });
  };

  private handleDeleteApp = async (pubkey: string) => {
    if (!confirm("Delete this NWC app?")) return;
    try { await coinos.deleteApp(pubkey); this.setState((s) => ({ apps: s.apps.filter((a) => a.pubkey !== pubkey) })); }
    catch (err: any) { this.setState({ error: err.message }); }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  private renderLoading() {
    return createElement("div", { className: "flex justify-center py-24" },
      createElement(Loader2, { className: "size-8 animate-spin text-muted-foreground" }),
    );
  }

  private renderNotSignedIn() {
    return createElement("div", { className: "flex flex-col items-center py-24 text-center animate-in" },
      createElement("div", { className: "size-16 rounded-2xl bg-muted flex items-center justify-center mb-5" },
        createElement(WalletIcon, { className: "size-8 text-muted-foreground/40" }),
      ),
      createElement("h2", { className: "text-xl font-bold" }, "Sign in to access your wallet"),
      createElement("p", { className: "mt-2 text-sm text-muted-foreground max-w-xs" }, "Connect your Nostr extension to access CoinOS."),
    );
  }

  private renderNotEnabled() {
    return createElement("div", { className: "flex flex-col items-center py-24 text-center animate-in" },
      createElement("div", { className: "size-16 rounded-2xl bg-muted flex items-center justify-center mb-5" },
        createElement(Bitcoin, { className: "size-8 text-muted-foreground/40" }),
      ),
      createElement("h2", { className: "text-xl font-bold" }, "Wallet Not Available"),
      createElement("p", { className: "mt-2 text-sm text-muted-foreground max-w-xs" }, "CoinOS is not enabled on this server."),
    );
  }

  private renderUnhealthy() {
    return createElement("div", { className: "flex flex-col items-center py-24 text-center animate-in" },
      createElement("div", { className: "size-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5" },
        createElement(AlertCircle, { className: "size-8 text-destructive/60" }),
      ),
      createElement("h2", { className: "text-xl font-bold" }, "Wallet Service Unavailable"),
      createElement("p", { className: "mt-2 text-sm text-muted-foreground max-w-xs" }, "The CoinOS server is not responding."),
      createElement(Button, { variant: "outline", onClick: this.loadData, className: "mt-4 gap-2" },
        createElement(RefreshCw, { className: "size-4" }), "Retry",
      ),
    );
  }

  private renderConnectPrompt() {
    const { error, connecting } = this.state;
    return createElement("div", { className: "mx-auto max-w-md animate-in" },
      createElement("div", { className: "pt-6 pb-8 sm:pt-10 sm:pb-10 text-center" },
        createElement("div", { className: "size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5" },
          createElement(Zap, { className: "size-8 text-primary" }),
        ),
        createElement("h1", { className: "text-3xl font-extrabold tracking-tight" }, "Wallet"),
        createElement("p", { className: "mt-2 text-muted-foreground max-w-sm mx-auto" },
          "Lightning payments, ecash, internal transfers, sub-accounts, and more \u2014 powered by CoinOS.",
        ),
      ),
      error ? createElement("div", { className: "flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-6" },
        createElement(AlertCircle, { className: "size-4 shrink-0" }), error,
      ) : null,
      createElement(Button, { onClick: this.handleConnect, disabled: connecting, className: "w-full gap-2 h-12 text-base" },
        connecting ? createElement(Loader2, { className: "size-4 animate-spin" }) : createElement(ExternalLink, { className: "size-4" }),
        connecting ? "Connecting..." : "Connect with Nostr",
      ),
      createElement("div", { className: "mt-8 grid grid-cols-3 sm:grid-cols-6 gap-3 text-center" },
        ...[
          { icon: Zap, label: "Lightning", desc: "Instant payments" },
          { icon: Users, label: "Contacts", desc: "Send by username" },
          { icon: Layers, label: "Accounts", desc: "Sub-wallets" },
          { icon: Coins, label: "Ecash", desc: "Cashu tokens" },
          { icon: Radio, label: "NWC", desc: "App connections" },
          { icon: Settings, label: "Settings", desc: "Preferences" },
        ].map(({ icon: Icon, label, desc }) =>
          createElement("div", { key: label, className: "rounded-lg border border-border/30 p-3" },
            createElement(Icon, { className: "size-5 text-primary mx-auto mb-1.5" }),
            createElement("p", { className: "text-xs font-semibold" }, label),
            createElement("p", { className: "text-[10px] text-muted-foreground" }, desc),
          ),
        ),
      ),
    );
  }

  // ─── Section: Overview ───────────────────────────────────────────────────

  private renderOverview() {
    const { coinosUser, payments, incoming, outgoing, btcRate, contacts } = this.state;
    if (!coinosUser) return null;
    const balance = coinosUser.balance || 0;
    const usdBal = this.satsToUsd(balance);

    return createElement("div", { className: "space-y-6" },
      // Balance card
      createElement(Card, { className: "border-border/50 bg-gradient-to-br from-primary/5 to-transparent" },
        createElement(CardContent, { className: "p-6 text-center" },
          createElement("p", { className: "text-xs text-muted-foreground uppercase tracking-wider mb-1" }, "Balance"),
          createElement("p", { className: "text-4xl font-extrabold font-mono tabular-nums" }, fmtSats(balance)),
          createElement("p", { className: "text-sm text-muted-foreground" }, "sats"),
          usdBal ? createElement("p", { className: "text-lg font-semibold text-primary mt-1" }, "\u2248 " + usdBal) : null,
        ),
      ),

      // Quick stats
      createElement("div", { className: "grid grid-cols-2 gap-3" },
        createElement(Card, { className: "border-border/50" },
          createElement(CardContent, { className: "p-4 flex items-center gap-3" },
            createElement("div", { className: "size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0" },
              createElement(ArrowDownLeft, { className: "size-4 text-emerald-400" }),
            ),
            createElement("div", null,
              createElement("p", { className: "text-[10px] text-muted-foreground" }, "Received"),
              createElement("p", { className: "text-sm font-bold font-mono" }, fmtSats(incoming) + " sats"),
            ),
          ),
        ),
        createElement(Card, { className: "border-border/50" },
          createElement(CardContent, { className: "p-4 flex items-center gap-3" },
            createElement("div", { className: "size-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0" },
              createElement(ArrowUpRight, { className: "size-4 text-red-400" }),
            ),
            createElement("div", null,
              createElement("p", { className: "text-[10px] text-muted-foreground" }, "Sent"),
              createElement("p", { className: "text-sm font-bold font-mono" }, fmtSats(outgoing) + " sats"),
            ),
          ),
        ),
      ),

      // Quick actions
      createElement("div", { className: "grid grid-cols-2 gap-3" },
        createElement(Button, { variant: "outline", className: "h-12 gap-2", onClick: () => this.setState({ section: "receive" }) },
          createElement(ArrowDownLeft, { className: "size-4" }), "Receive",
        ),
        createElement(Button, { className: "h-12 gap-2", onClick: () => this.setState({ section: "send" }) },
          createElement(Send, { className: "size-4" }), "Send",
        ),
      ),

      // Recent payments
      payments.length > 0 ? createElement("div", null,
        createElement("div", { className: "flex items-center justify-between mb-3" },
          createElement("h3", { className: "text-sm font-semibold" }, "Recent Activity"),
          createElement("button", { onClick: () => this.setState({ section: "history" }), className: "text-xs text-primary hover:underline cursor-pointer" }, "View all"),
        ),
        createElement("div", { className: "rounded-lg border border-border/50 divide-y divide-border/30" },
          ...payments.slice(0, 5).map((p) => {
            const isIn = p.amount > 0;
            return createElement("div", { key: p.id || p.hash || String(p.created), className: "flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors" },
              createElement("div", { className: cn("size-8 rounded-full flex items-center justify-center shrink-0", isIn ? "bg-emerald-500/10" : "bg-red-500/10") },
                isIn ? createElement(ArrowDownLeft, { className: "size-4 text-emerald-400" }) : createElement(ArrowUpRight, { className: "size-4 text-red-400" }),
              ),
              createElement("div", { className: "flex-1 min-w-0" },
                createElement("p", { className: "text-sm font-medium truncate" }, paymentLabel(p)),
                createElement("p", { className: "text-[10px] text-muted-foreground" }, fmtDate(p.created)),
              ),
              createElement("div", { className: "text-right shrink-0" },
                createElement("p", { className: cn("text-sm font-bold font-mono tabular-nums", isIn ? "text-emerald-400" : "text-red-400") },
                  (isIn ? "+" : "-") + fmtSats(p.amount),
                ),
                (() => { const usd = this.satsToUsd(p.amount); return usd ? createElement("p", { className: "text-[10px] text-muted-foreground" }, usd) : null; })(),
              ),
            );
          }),
        ),
      ) : null,

      // Pinned contacts
      contacts.filter((c) => c.pinned).length > 0 ? createElement("div", null,
        createElement("h3", { className: "text-sm font-semibold mb-3" }, "Quick Send"),
        createElement("div", { className: "flex gap-3 overflow-x-auto pb-1" },
          ...contacts.filter((c) => c.pinned).map((c) =>
            createElement("button", {
              key: c.id,
              onClick: () => this.setState({ sendTo: c.username, section: "send" }),
              className: "flex flex-col items-center gap-1.5 rounded-lg border border-border/30 p-3 min-w-[80px] hover:bg-accent/50 transition-colors cursor-pointer",
            },
              createElement("div", { className: "size-8 rounded-full bg-primary/10 flex items-center justify-center" },
                createElement("span", { className: "text-xs font-bold text-primary" }, c.username.slice(0, 2).toUpperCase()),
              ),
              createElement("p", { className: "text-[10px] font-medium truncate w-full text-center" }, c.username),
            ),
          ),
        ),
      ) : null,
    );
  }

  // ─── Section: Send ───────────────────────────────────────────────────────

  private renderSend() {
    const { sendTo, sendAmount, sendMemo, sending, sendResult, error, contacts } = this.state;
    return createElement("div", { className: "space-y-4 max-w-md" },
      createElement("h2", { className: "text-lg font-semibold" }, "Send Payment"),
      createElement("div", { className: "space-y-3" },
        createElement(Label, { className: "text-xs" }, "Recipient"),
        createElement(Input, {
          placeholder: "Username, Lightning address, or invoice...",
          value: sendTo,
          onInput: (e: Event) => this.setState({ sendTo: (e.target as HTMLInputElement).value }),
        }),
        createElement(Label, { className: "text-xs" }, "Amount (sats)"),
        createElement(Input, {
          placeholder: "0", type: "number", value: sendAmount,
          onInput: (e: Event) => this.setState({ sendAmount: (e.target as HTMLInputElement).value }),
        }),
        sendAmount ? (() => { const usd = this.satsToUsd(parseInt(sendAmount) || 0); return usd ? createElement("p", { className: "text-xs text-muted-foreground" }, "\u2248 " + usd) : null; })() : null,
        createElement(Label, { className: "text-xs" }, "Memo (optional)"),
        createElement(Input, {
          placeholder: "What's this for?", value: sendMemo,
          onInput: (e: Event) => this.setState({ sendMemo: (e.target as HTMLInputElement).value }),
        }),
        createElement(Button, { onClick: this.handleSend, disabled: sending || !sendTo.trim() || !sendAmount, className: "w-full gap-2" },
          sending ? createElement(Loader2, { className: "size-4 animate-spin" }) : createElement(Send, { className: "size-4" }),
          sending ? "Sending..." : "Send",
        ),
        sendResult ? createElement("div", { className: "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400" }, sendResult) : null,
      ),
      contacts.length > 0 ? createElement("div", null,
        createElement("p", { className: "text-xs font-semibold mb-2 mt-4" }, "Quick pick"),
        createElement("div", { className: "flex flex-wrap gap-1.5" },
          ...contacts.slice(0, 10).map((c) =>
            createElement("button", {
              key: c.id,
              onClick: () => this.setState({ sendTo: c.username }),
              className: "rounded-full border border-border/50 px-2.5 py-1 text-xs hover:bg-accent transition-colors cursor-pointer",
            }, "@" + c.username),
          ),
        ),
      ) : null,
    );
  }

  // ─── Section: Receive ────────────────────────────────────────────────────

  private renderReceive() {
    const { recvAmount, recvMemo, recvType, recvCreating, recvInvoice, coinosUser, copied } = this.state;
    const lnAddress = coinosUser ? `${coinosUser.username}@${window.location.hostname}` : "";

    return createElement("div", { className: "space-y-4 max-w-md" },
      createElement("h2", { className: "text-lg font-semibold" }, "Receive Payment"),

      // Lightning address
      lnAddress ? createElement(Card, { className: "border-border/50" },
        createElement(CardContent, { className: "p-4" },
          createElement("p", { className: "text-xs text-muted-foreground mb-1" }, "Your Lightning Address"),
          createElement("div", { className: "flex items-center gap-2" },
            createElement(AtSign, { className: "size-3.5 text-primary shrink-0" }),
            createElement("code", { className: "text-sm font-mono flex-1 truncate" }, lnAddress),
            createElement("button", { onClick: () => this.copyText(lnAddress, "lnaddr"), className: "shrink-0 cursor-pointer" },
              copied === "lnaddr" ? createElement(Check, { className: "size-3.5 text-emerald-400" }) : createElement(Copy, { className: "size-3.5" }),
            ),
          ),
        ),
      ) : null,

      // Create invoice
      createElement("div", { className: "space-y-3" },
        createElement(Label, { className: "text-xs" }, "Amount (sats)"),
        createElement(Input, {
          placeholder: "0", type: "number", value: recvAmount,
          onInput: (e: Event) => this.setState({ recvAmount: (e.target as HTMLInputElement).value }),
        }),
        createElement(Label, { className: "text-xs" }, "Memo (optional)"),
        createElement(Input, {
          placeholder: "Payment for...", value: recvMemo,
          onInput: (e: Event) => this.setState({ recvMemo: (e.target as HTMLInputElement).value }),
        }),
        createElement("div", { className: "flex gap-1.5" },
          ...(["lightning", "bitcoin", "liquid"] as const).map((t) =>
            createElement(Button, {
              key: t, variant: recvType === t ? "default" : "outline", size: "sm", className: "text-xs capitalize",
              onClick: () => this.setState({ recvType: t }),
            }, t),
          ),
        ),
        createElement(Button, { onClick: this.handleCreateInvoice, disabled: recvCreating || !recvAmount, className: "w-full gap-2" },
          recvCreating ? createElement(Loader2, { className: "size-4 animate-spin" }) : createElement(Zap, { className: "size-4" }),
          "Create Invoice",
        ),
      ),

      // Invoice result
      recvInvoice ? createElement(Card, { className: "border-emerald-500/30 bg-emerald-500/5" },
        createElement(CardContent, { className: "p-4 space-y-2" },
          createElement("p", { className: "text-xs font-semibold text-emerald-400" }, "Invoice Created"),
          createElement("p", { className: "text-xs" }, "Amount: ", createElement("span", { className: "font-mono font-bold" }, fmtSats(recvInvoice.amount) + " sats")),
          (recvInvoice.bolt11 || recvInvoice.text) ? createElement("div", { className: "flex items-center gap-1.5" },
            createElement("code", { className: "text-[10px] font-mono truncate flex-1" }, (recvInvoice.bolt11 || recvInvoice.text || "").slice(0, 50) + "..."),
            createElement("button", {
              onClick: () => this.copyText(recvInvoice!.bolt11 || recvInvoice!.text || "", "inv"),
              className: "shrink-0 cursor-pointer",
            }, copied === "inv" ? createElement(Check, { className: "size-3.5 text-emerald-400" }) : createElement(Copy, { className: "size-3.5" })),
          ) : null,
        ),
      ) : null,
    );
  }

  // ─── Section: History ────────────────────────────────────────────────────

  private renderHistory() {
    const { payments, totalPayments, page } = this.state;
    const totalPages = Math.ceil(totalPayments / PAGE_SIZE);

    return createElement("div", { className: "space-y-4" },
      createElement("div", { className: "flex items-center justify-between" },
        createElement("h2", { className: "text-lg font-semibold" }, "Payment History"),
        createElement("span", { className: "text-xs text-muted-foreground tabular-nums" }, totalPayments.toLocaleString() + " total"),
      ),
      payments.length === 0
        ? createElement("div", { className: "py-12 text-center text-sm text-muted-foreground" }, "No payments yet")
        : createElement("div", { className: "rounded-lg border border-border/50 divide-y divide-border/30" },
            ...payments.map((p) => {
              const isIn = p.amount > 0;
              return createElement("div", { key: p.id || p.hash || String(p.created), className: "flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors" },
                createElement("div", { className: cn("size-8 rounded-full flex items-center justify-center shrink-0", isIn ? "bg-emerald-500/10" : "bg-red-500/10") },
                  isIn ? createElement(ArrowDownLeft, { className: "size-4 text-emerald-400" }) : createElement(ArrowUpRight, { className: "size-4 text-red-400" }),
                ),
                createElement("div", { className: "flex-1 min-w-0" },
                  createElement("p", { className: "text-sm font-medium truncate" }, paymentLabel(p)),
                  createElement("p", { className: "text-[10px] text-muted-foreground" },
                    fmtDate(p.created), p.memo ? " \u00B7 " + p.memo : "",
                  ),
                ),
                createElement("div", { className: "text-right shrink-0" },
                  createElement("p", { className: cn("text-sm font-bold font-mono tabular-nums", isIn ? "text-emerald-400" : "text-red-400") },
                    (isIn ? "+" : "-") + fmtSats(p.amount),
                  ),
                  createElement(Badge, { variant: "outline", className: "text-[8px] px-1 py-0 capitalize" }, p.type),
                ),
              );
            }),
          ),
      totalPages > 1 ? createElement("div", { className: "flex items-center justify-center gap-2" },
        createElement(Button, { variant: "outline", size: "sm", disabled: page === 0, onClick: () => this.loadPayments(page - 1) }, "Prev"),
        createElement("span", { className: "text-xs text-muted-foreground tabular-nums" }, `${page + 1} / ${totalPages}`),
        createElement(Button, { variant: "outline", size: "sm", disabled: page >= totalPages - 1, onClick: () => this.loadPayments(page + 1) }, "Next"),
      ) : null,
    );
  }

  // ─── Section: Accounts ───────────────────────────────────────────────────

  private renderAccounts() {
    const { accounts, accountName, accountCreating, coinosUser } = this.state;
    return createElement("div", { className: "space-y-4" },
      createElement("h2", { className: "text-lg font-semibold" }, "Sub-Accounts"),
      createElement("div", { className: "flex gap-2" },
        createElement(Input, {
          placeholder: "New account name...", value: accountName,
          onInput: (e: Event) => this.setState({ accountName: (e.target as HTMLInputElement).value }),
          className: "h-8 text-sm",
        }),
        createElement(Button, { onClick: this.handleCreateAccount, disabled: accountCreating || !accountName.trim(), size: "sm", className: "gap-1 shrink-0" },
          accountCreating ? createElement(Loader2, { className: "size-3 animate-spin" }) : createElement(Plus, { className: "size-3" }),
          "Create",
        ),
      ),
      // Main account
      coinosUser ? createElement(Card, { className: "border-primary/20 bg-primary/5" },
        createElement(CardContent, { className: "p-4 flex items-center justify-between" },
          createElement("div", null,
            createElement("p", { className: "text-sm font-semibold" }, "Main Account"),
            createElement("p", { className: "text-xs text-muted-foreground" }, "@" + coinosUser.username),
          ),
          createElement("p", { className: "text-lg font-bold font-mono" }, fmtSats(coinosUser.balance || 0) + " sats"),
        ),
      ) : null,
      accounts.length > 0 ? createElement("div", { className: "rounded-lg border border-border/50 divide-y divide-border/30" },
        ...accounts.map((a) =>
          createElement("div", { key: a.id, className: "flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors" },
            createElement("div", null,
              createElement("p", { className: "text-sm font-medium" }, a.name),
              a.type ? createElement(Badge, { variant: "outline", className: "text-[9px] mt-0.5" }, a.type) : null,
            ),
            createElement("div", { className: "flex items-center gap-2" },
              createElement("span", { className: "text-sm font-mono font-bold" }, fmtSats(a.balance || 0)),
              createElement("button", { onClick: () => this.handleDeleteAccount(a.id), className: "text-destructive hover:text-destructive/80 cursor-pointer" },
                createElement(Trash2, { className: "size-3.5" }),
              ),
            ),
          ),
        ),
      ) : createElement("p", { className: "text-sm text-muted-foreground text-center py-6" }, "No sub-accounts yet"),
    );
  }

  // ─── Section: Contacts ───────────────────────────────────────────────────

  private renderContacts() {
    const { contacts } = this.state;
    return createElement("div", { className: "space-y-4" },
      createElement("h2", { className: "text-lg font-semibold" }, "Contacts"),
      contacts.length === 0
        ? createElement("p", { className: "text-sm text-muted-foreground text-center py-12" }, "No contacts yet")
        : createElement("div", { className: "rounded-lg border border-border/50 divide-y divide-border/30" },
            ...contacts.map((c) =>
              createElement("div", { key: c.id, className: "flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors" },
                createElement("div", { className: "size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0" },
                  createElement("span", { className: "text-xs font-bold text-primary" }, c.username.slice(0, 2).toUpperCase()),
                ),
                createElement("div", { className: "flex-1 min-w-0" },
                  createElement("p", { className: "text-sm font-medium" }, c.username),
                  createElement("div", { className: "flex gap-1 mt-0.5" },
                    c.pinned ? createElement(Badge, { variant: "secondary", className: "text-[8px] px-1 py-0" }, "Pinned") : null,
                    c.trusted ? createElement(Badge, { variant: "secondary", className: "text-[8px] px-1 py-0" }, "Trusted") : null,
                  ),
                ),
                createElement("div", { className: "flex gap-1 shrink-0" },
                  createElement("button", {
                    onClick: () => this.handlePinContact(c.id, !!c.pinned),
                    className: "inline-flex items-center justify-center size-7 rounded-md hover:bg-accent transition-colors cursor-pointer",
                    title: c.pinned ? "Unpin" : "Pin",
                  }, createElement(c.pinned ? Check : Plus, { className: "size-3.5" })),
                  createElement("button", {
                    onClick: () => this.setState({ sendTo: c.username, section: "send" }),
                    className: "inline-flex items-center justify-center size-7 rounded-md hover:bg-accent transition-colors cursor-pointer",
                    title: "Send",
                  }, createElement(Send, { className: "size-3.5" })),
                ),
              ),
            ),
          ),
    );
  }

  // ─── Section: Ecash ──────────────────────────────────────────────────────

  private renderEcash() {
    const { ecashToken, ecashClaiming, ecashMintAmount, ecashMinting, ecashResult } = this.state;
    return createElement("div", { className: "space-y-6 max-w-md" },
      createElement("h2", { className: "text-lg font-semibold" }, "Ecash (Cashu)"),
      createElement(Card, { className: "border-border/50" },
        createElement(CardHeader, { className: "pb-2" }, createElement(CardTitle, { className: "text-sm" }, "Claim Ecash")),
        createElement(CardContent, { className: "space-y-3" },
          createElement(Input, {
            placeholder: "Paste ecash token...", value: ecashToken,
            onInput: (e: Event) => this.setState({ ecashToken: (e.target as HTMLInputElement).value }),
          }),
          createElement(Button, { onClick: this.handleClaimEcash, disabled: ecashClaiming || !ecashToken.trim(), className: "w-full gap-2" },
            ecashClaiming ? createElement(Loader2, { className: "size-4 animate-spin" }) : createElement(Coins, { className: "size-4" }),
            "Claim",
          ),
        ),
      ),
      createElement(Card, { className: "border-border/50" },
        createElement(CardHeader, { className: "pb-2" }, createElement(CardTitle, { className: "text-sm" }, "Mint Ecash")),
        createElement(CardContent, { className: "space-y-3" },
          createElement(Input, {
            placeholder: "Amount in sats", type: "number", value: ecashMintAmount,
            onInput: (e: Event) => this.setState({ ecashMintAmount: (e.target as HTMLInputElement).value }),
          }),
          createElement(Button, { onClick: this.handleMintEcash, disabled: ecashMinting || !ecashMintAmount, variant: "outline", className: "w-full gap-2" },
            ecashMinting ? createElement(Loader2, { className: "size-4 animate-spin" }) : createElement(Coins, { className: "size-4" }),
            "Mint",
          ),
        ),
      ),
      ecashResult ? createElement("div", { className: "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400" }, ecashResult) : null,
    );
  }

  // ─── Section: NWC ────────────────────────────────────────────────────────

  private renderNwc() {
    const { apps, appsLoading } = this.state;
    return createElement("div", { className: "space-y-4" },
      createElement("div", { className: "flex items-center justify-between" },
        createElement("h2", { className: "text-lg font-semibold" }, "NWC Apps"),
        createElement(Button, { variant: "outline", size: "sm", onClick: this.loadApps, className: "gap-1" },
          createElement(RefreshCw, { className: "size-3" }), "Refresh",
        ),
      ),
      appsLoading ? createElement("div", { className: "flex justify-center py-8" }, createElement(Loader2, { className: "size-5 animate-spin text-muted-foreground" })) :
        apps.length === 0
          ? createElement("p", { className: "text-sm text-muted-foreground text-center py-12" }, "No NWC apps connected. Click Refresh to load.")
          : createElement("div", { className: "rounded-lg border border-border/50 divide-y divide-border/30" },
              ...apps.map((app) =>
                createElement("div", { key: app.pubkey, className: "flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors" },
                  createElement("div", { className: "min-w-0 flex-1" },
                    createElement("p", { className: "text-sm font-medium" }, app.name || "Unnamed App"),
                    createElement("p", { className: "text-[10px] text-muted-foreground font-mono truncate" }, app.pubkey.slice(0, 16) + "..."),
                    app.max_amount ? createElement("p", { className: "text-[10px] text-muted-foreground" }, "Budget: " + fmtSats(app.max_amount) + " sats") : null,
                  ),
                  createElement("button", {
                    onClick: () => this.handleDeleteApp(app.pubkey),
                    className: "text-destructive hover:text-destructive/80 cursor-pointer shrink-0",
                  }, createElement(Trash2, { className: "size-3.5" })),
                ),
              ),
            ),
    );
  }

  // ─── Section: Settings ───────────────────────────────────────────────────

  private renderSettings() {
    const { coinosUser } = this.state;
    if (!coinosUser) return null;
    return createElement("div", { className: "space-y-4 max-w-md" },
      createElement("h2", { className: "text-lg font-semibold" }, "Wallet Settings"),
      createElement(Card, { className: "border-border/50" },
        createElement(CardContent, { className: "p-4 space-y-3" },
          createElement("div", { className: "flex items-center justify-between" },
            createElement("span", { className: "text-sm text-muted-foreground" }, "Username"),
            createElement("span", { className: "text-sm font-medium" }, coinosUser.username),
          ),
          createElement(Separator, null),
          createElement("div", { className: "flex items-center justify-between" },
            createElement("span", { className: "text-sm text-muted-foreground" }, "Currency"),
            createElement("span", { className: "text-sm font-medium" }, coinosUser.currency || "BTC"),
          ),
          createElement(Separator, null),
          createElement("div", { className: "flex items-center justify-between" },
            createElement("span", { className: "text-sm text-muted-foreground" }, "2FA"),
            createElement(Badge, { variant: coinosUser.twofa ? "default" : "secondary", className: "text-[10px]" }, coinosUser.twofa ? "Enabled" : "Disabled"),
          ),
          createElement(Separator, null),
          createElement("div", { className: "flex items-center justify-between" },
            createElement("span", { className: "text-sm text-muted-foreground" }, "PIN"),
            createElement(Badge, { variant: coinosUser.haspin ? "default" : "secondary", className: "text-[10px]" }, coinosUser.haspin ? "Set" : "Not set"),
          ),
          coinosUser.pubkey ? [
            createElement(Separator, { key: "sep" }),
            createElement("div", { key: "pk", className: "flex items-center justify-between" },
              createElement("span", { className: "text-sm text-muted-foreground" }, "Pubkey"),
              createElement("code", { className: "text-[10px] font-mono truncate max-w-[200px]" }, coinosUser.pubkey),
            ),
          ] : null,
        ),
      ),
      createElement(Button, { variant: "outline", onClick: this.handleLogout, className: "w-full gap-2 text-destructive hover:text-destructive" },
        createElement(LogOut, { className: "size-4" }), "Disconnect Wallet",
      ),
    );
  }

  // ─── Main Render ─────────────────────────────────────────────────────────

  render() {
    const { user, config, status, coinosUser, loading, error, section } = this.state;

    if (loading) return this.renderLoading();
    if (!user) return this.renderNotSignedIn();
    if (!config?.coinos_enabled) return this.renderNotEnabled();
    if (status && !status.healthy) return this.renderUnhealthy();
    if (!coinosUser) return this.renderConnectPrompt();

    const lnAddress = `${coinosUser.username}@${window.location.hostname}`;

    const navItems: { id: Section; label: string; icon: any }[] = [
      { id: "overview", label: "Overview", icon: WalletIcon },
      { id: "receive", label: "Receive", icon: ArrowDownLeft },
      { id: "send", label: "Send", icon: Send },
      { id: "history", label: "History", icon: Clock },
      { id: "accounts", label: "Accounts", icon: Layers },
      { id: "contacts", label: "Contacts", icon: Users },
      { id: "ecash", label: "Ecash", icon: Coins },
      { id: "nwc", label: "NWC Apps", icon: Radio },
      { id: "settings", label: "Settings", icon: Settings },
    ];

    return createElement("div", { className: "animate-in" },
      // Header
      createElement("section", { className: "pt-6 pb-4 sm:pt-10 sm:pb-6" },
        createElement("div", { className: "flex items-start justify-between" },
          createElement("div", null,
            createElement("h1", { className: "text-3xl font-extrabold tracking-tight sm:text-4xl" }, "Wallet"),
            createElement("div", { className: "flex items-center gap-2 mt-1" },
              createElement("p", { className: "text-sm text-muted-foreground" }, "@" + coinosUser.username),
              lnAddress ? createElement("button", {
                onClick: () => this.copyText(lnAddress, "lnaddr"),
                className: "flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors cursor-pointer",
              },
                createElement(AtSign, { className: "size-3" }),
                lnAddress,
                this.state.copied === "lnaddr" ? createElement(Check, { className: "size-3" }) : createElement(Copy, { className: "size-3" }),
              ) : null,
            ),
          ),
          createElement("div", { className: "flex gap-1.5" },
            createElement(Button, { variant: "ghost", size: "icon", onClick: () => this.loadWalletData(), title: "Refresh" },
              createElement(RefreshCw, { className: "size-4" }),
            ),
            createElement(Button, { variant: "ghost", size: "icon", onClick: this.handleLogout, title: "Disconnect", className: "text-muted-foreground" },
              createElement(LogOut, { className: "size-4" }),
            ),
          ),
        ),
      ),

      // Error
      error ? createElement("div", { className: "flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4" },
        createElement(AlertCircle, { className: "size-4 shrink-0" }),
        createElement("span", { className: "flex-1" }, error),
        createElement("button", { onClick: () => this.setState({ error: "" }), className: "text-xs underline shrink-0 cursor-pointer" }, "dismiss"),
      ) : null,

      // Navigation
      createElement("div", { className: "flex gap-1 overflow-x-auto pb-4 border-b border-border/30 mb-6 scrollbar-none" },
        ...navItems.map(({ id, label, icon: Icon }) =>
          createElement("button", {
            key: id,
            onClick: () => { this.setState({ section: id }); if (id === "nwc" && this.state.apps.length === 0) this.loadApps(); },
            className: cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer",
              section === id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
            ),
          },
            createElement(Icon, { className: "size-3.5" }), label,
          ),
        ),
      ),

      // Section content
      section === "overview" ? this.renderOverview() : null,
      section === "receive" ? this.renderReceive() : null,
      section === "send" ? this.renderSend() : null,
      section === "history" ? this.renderHistory() : null,
      section === "accounts" ? this.renderAccounts() : null,
      section === "contacts" ? this.renderContacts() : null,
      section === "ecash" ? this.renderEcash() : null,
      section === "nwc" ? this.renderNwc() : null,
      section === "settings" ? this.renderSettings() : null,
    );
  }
}
