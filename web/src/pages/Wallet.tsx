import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../stores/auth";
import {
  coinos,
  getCoinosToken,
  setCoinosToken,
  clearWalletSession,
  getActivePubkey,
  type CoinosStatus,
  type CoinosUser,
  type CoinosPayment,
  type CoinosAccount,
  type CoinosContact,
} from "../lib/coinos";
import { api } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import EcashSection from "./wallet/EcashSection";
import NwcAppsSection from "./wallet/NwcAppsSection";
import InvoicesSection from "./wallet/InvoicesSection";
import FundsSection from "./wallet/FundsSection";
import SettingsSection from "./wallet/SettingsSection";
import ContactRow from "./wallet/ContactRow";
import {
  Wallet as WalletIcon,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Loader2,
  Bitcoin,
  LogOut,
  Link as LinkIcon,
  TrendingUp,
  TrendingDown,
  Users,
  Layers,
  Clock,
  AtSign,
  Send,
  Plus,
  Trash2,
  Pin,
  PinOff,
  ShieldCheck,
  ShieldOff,
  User,
  Coins,
  Radio,
  FileText,
  Vault,
  Settings,
} from "lucide-react";

declare global {
  interface Window {
    nostr?: {
      getPublicKey: () => Promise<string>;
      signEvent: (event: any) => Promise<any>;
    };
  }
}

interface AppConfig {
  coinos_enabled: boolean;
}

type Section = "overview" | "receive" | "send" | "history" | "accounts" | "contacts" | "ecash" | "nwc" | "invoices" | "funds" | "settings";

export default function Wallet() {
  const { user } = useAuth();

  // Core state
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [status, setStatus] = useState<CoinosStatus | null>(null);
  const [coinosUser, setCoinosUser] = useState<CoinosUser | null>(null);
  const [payments, setPayments] = useState<CoinosPayment[]>([]);
  const [totalPayments, setTotalPayments] = useState(0);
  const [incoming, setIncoming] = useState(0);
  const [outgoing, setOutgoing] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [btcRate, setBtcRate] = useState<number | null>(null);
  const [section, setSection] = useState<Section>("overview");

  // Invoice creation
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceMemo, setInvoiceMemo] = useState("");
  const [createdInvoice, setCreatedInvoice] = useState("");
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Send payment
  const [sendAddress, setSendAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResult, setSendResult] = useState("");

  // Accounts
  const [accounts, setAccounts] = useState<CoinosAccount[]>([]);
  const [newAccountName, setNewAccountName] = useState("");

  // Contacts
  const [contacts, setContacts] = useState<CoinosContact[]>([]);

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 15;

  // ── Nostr auth ──
  const connectWithNostr = useCallback(async () => {
    if (!window.nostr) {
      setError("No Nostr extension found");
      return false;
    }
    setConnecting(true);
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
      const signedEvent = await window.nostr.signEvent(event);
      const pubkey = signedEvent.pubkey || (await window.nostr.getPublicKey());
      const result = await coinos.nostrAuth({ challenge, event: signedEvent });
      if (result.token) {
        setCoinosToken(pubkey, result.token);
        return true;
      }
      setError("Authentication failed — no token received");
      return false;
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
      return false;
    } finally {
      setConnecting(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [user?.pubkey]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const cfg = await api.get<AppConfig>("/config");
      setConfig(cfg);
      if (!cfg.coinos_enabled) { setLoading(false); return; }

      const s = await coinos.status();
      setStatus(s);

      if (s.healthy) {
        try { const rates = await coinos.rates(); if (rates?.USD) setBtcRate(rates.USD); } catch {}

        const activePk = await getActivePubkey();
        const storedPk = localStorage.getItem("coinos_pubkey");
        if (storedPk && activePk && storedPk !== activePk) {
          clearWalletSession();
          setCoinosUser(null);
          setPayments([]);
        }

        if (getCoinosToken()) {
          await loadWalletData();
        } else if (window.nostr) {
          const ok = await connectWithNostr();
          if (ok) await loadWalletData();
        }
      }
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  async function loadWalletData() {
    try {
      const me = await coinos.me();
      setCoinosUser(me);
      await loadPayments(0);
      // Load accounts and contacts in parallel, don't block
      Promise.all([
        coinos.listAccounts().then(setAccounts).catch(() => {}),
        coinos.listContacts(20).then(setContacts).catch(() => {}),
      ]);
    } catch {
      clearWalletSession();
      setCoinosUser(null);
    }
  }

  async function loadPayments(pageNum: number) {
    try {
      const resp = await coinos.payments(pageSize, pageNum * pageSize);
      setPayments(resp.payments || []);
      setTotalPayments(resp.count || 0);
      const inSats = resp.incoming ? Object.values(resp.incoming).reduce((a, b) => a + (b.sats || 0), 0) : 0;
      const outSats = resp.outgoing ? Object.values(resp.outgoing).reduce((a, b) => a + Math.abs(b.sats || 0), 0) : 0;
      setIncoming(inSats);
      setOutgoing(outSats);
      setPage(pageNum);
    } catch {
      try {
        const legacy = await coinos.paymentsLegacy();
        const arr = Array.isArray(legacy) ? legacy : [];
        setPayments(arr);
        setTotalPayments(arr.length);
        setIncoming(arr.filter((p) => p.amount > 0).reduce((a, b) => a + b.amount, 0));
        setOutgoing(arr.filter((p) => p.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0));
      } catch {}
    }
  }

  async function handleConnect() {
    setError("");
    const ok = await connectWithNostr();
    if (ok) await loadWalletData();
  }

  function handleLogout() {
    clearWalletSession();
    setCoinosUser(null);
    setPayments([]);
    setAccounts([]);
    setContacts([]);
  }

  async function handleCreateInvoice() {
    setInvoiceLoading(true);
    setCreatedInvoice("");
    try {
      const inv = await coinos.createInvoice({
        amount: parseInt(invoiceAmount),
        memo: invoiceMemo || undefined,
        type: "lightning",
      });
      setCreatedInvoice(inv.hash || inv.bolt11 || inv.text || "");
      setInvoiceAmount("");
      setInvoiceMemo("");
    } catch (err: any) { setError(err.message); }
    setInvoiceLoading(false);
  }

  async function handleSend() {
    setSendLoading(true);
    setSendResult("");
    try {
      const addr = sendAddress.trim();
      const amt = parseInt(sendAmount);
      if (addr.startsWith("lnbc") || addr.startsWith("lntb") || addr.startsWith("lnurl")) {
        await coinos.sendPayment({ payreq: addr, amount: amt });
      } else if (addr.includes("@")) {
        await coinos.sendToLnAddress(addr, amt);
      } else {
        await coinos.sendInternal({ username: addr, amount: amt });
      }
      setSendResult("Payment sent!");
      setSendAddress("");
      setSendAmount("");
      await loadWalletData();
    } catch (err: any) { setError(err.message); }
    setSendLoading(false);
  }

  async function handleCreateAccount() {
    if (!newAccountName.trim()) return;
    try {
      const acc = await coinos.createAccount({ name: newAccountName.trim() });
      setAccounts((prev) => [...prev, acc]);
      setNewAccountName("");
    } catch (err: any) { setError(err.message); }
  }

  async function handleDeleteAccount(id: string) {
    try {
      await coinos.deleteAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) { setError(err.message); }
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function formatSats(amount: number) {
    return new Intl.NumberFormat().format(Math.abs(amount));
  }

  function satsToUsd(sats: number): string | null {
    if (!btcRate) return null;
    const usd = (Math.abs(sats) / 100_000_000) * btcRate;
    return usd.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2 });
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  function paymentTypeLabel(p: CoinosPayment) {
    if (p.with) return p.with.username;
    if (p.type === "lightning" || p.type === "bolt12") return "Lightning";
    if (p.type === "ecash") return p.amount > 0 ? "Ecash redeemed" : "Ecash minted";
    if (p.type === "bitcoin") return "On-chain";
    if (p.type === "liquid") return "Liquid";
    if (p.type === "internal") return "Internal";
    return p.amount > 0 ? "Received" : "Sent";
  }

  function sendTypeHint(addr: string) {
    if (!addr) return null;
    const a = addr.trim();
    if (a.startsWith("lnbc") || a.startsWith("lntb")) return "Lightning invoice";
    if (a.startsWith("lnurl")) return "LNURL";
    if (a.includes("@")) return "Lightning address";
    if (a.length > 0) return "CoinOS user";
    return null;
  }

  const totalPages = Math.ceil(totalPayments / pageSize);
  const lnAddress = coinosUser ? `${coinosUser.username}@${window.location.hostname}` : "";

  async function handlePinContact(id: string, pinned: boolean) {
    try {
      if (pinned) await coinos.unpinContact(id);
      else await coinos.pinContact(id);
      setContacts((prev) => prev.map((c) => c.id === id ? { ...c, pinned: !pinned } : c));
    } catch (err: any) { setError(err.message); }
  }

  async function handleTrustContact(id: string, trusted: boolean) {
    try {
      if (trusted) await coinos.untrustContact(id);
      else await coinos.trustContact(id);
      setContacts((prev) => prev.map((c) => c.id === id ? { ...c, trusted: !trusted } : c));
    } catch (err: any) { setError(err.message); }
  }

  // ── Nav items ──
  const navItems: { id: Section; label: string; icon: typeof Zap }[] = [
    { id: "overview", label: "Overview", icon: WalletIcon },
    { id: "receive", label: "Receive", icon: ArrowDownLeft },
    { id: "send", label: "Send", icon: Send },
    { id: "history", label: "History", icon: Clock },
    { id: "accounts", label: "Accounts", icon: Layers },
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "invoices", label: "Invoices", icon: FileText },
    { id: "ecash", label: "Ecash", icon: Coins },
    { id: "nwc", label: "NWC Apps", icon: Radio },
    { id: "funds", label: "Funds", icon: Vault },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Not signed in ──
  if (!user) {
    return (
      <div className="flex flex-col items-center py-24 text-center animate-in">
        <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
          <WalletIcon className="size-8 text-muted-foreground/40" />
        </div>
        <h2 className="text-xl font-bold">Sign in to access your wallet</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          Connect your Nostr extension to access CoinOS.
        </p>
      </div>
    );
  }

  // ── CoinOS not enabled ──
  if (!config?.coinos_enabled) {
    return (
      <div className="flex flex-col items-center py-24 text-center animate-in">
        <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
          <Bitcoin className="size-8 text-muted-foreground/40" />
        </div>
        <h2 className="text-xl font-bold">Wallet Not Available</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          CoinOS is not enabled on this server.
        </p>
      </div>
    );
  }

  // ── CoinOS server down ──
  if (status && !status.healthy) {
    return (
      <div className="flex flex-col items-center py-24 text-center animate-in">
        <div className="size-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
          <AlertCircle className="size-8 text-destructive/60" />
        </div>
        <h2 className="text-xl font-bold">Wallet Service Unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          The CoinOS server is not responding.
        </p>
        <Button variant="outline" onClick={loadData} className="mt-4 gap-2">
          <RefreshCw className="size-4" /> Retry
        </Button>
      </div>
    );
  }

  // ── Connect prompt ──
  if (!coinosUser) {
    return (
      <div className="mx-auto max-w-md animate-in">
        <div className="pt-6 pb-8 sm:pt-10 sm:pb-10 text-center">
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <Zap className="size-8 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-gradient">Wallet</span>
          </h1>
          <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
            Lightning payments, ecash, internal transfers, sub-accounts, NWC apps, shared funds, and more — powered by CoinOS.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-6">
            <AlertCircle className="size-4 shrink-0" /> {error}
          </div>
        )}

        <Button onClick={handleConnect} disabled={connecting} className="w-full gap-2 h-12 text-base">
          {connecting ? <Loader2 className="size-4 animate-spin" /> : <LinkIcon className="size-4" />}
          {connecting ? "Connecting..." : "Connect with Nostr"}
        </Button>

        <div className="mt-8 grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
          {[
            { icon: Zap, label: "Lightning", desc: "Instant payments" },
            { icon: Users, label: "Contacts", desc: "Send by username" },
            { icon: Layers, label: "Accounts", desc: "Sub-wallets" },
            { icon: Coins, label: "Ecash", desc: "Cashu tokens" },
            { icon: Radio, label: "NWC", desc: "App connections" },
            { icon: Vault, label: "Funds", desc: "Shared wallets" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-lg border border-border/30 p-3">
              <Icon className="size-5 text-primary mx-auto mb-1.5" />
              <p className="text-xs font-semibold">{label}</p>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Connected — full banking interface ──
  return (
    <div className="animate-in">
      {/* Header */}
      <section className="pt-6 pb-4 sm:pt-10 sm:pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              <span className="text-gradient">Wallet</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground">@{coinosUser.username}</p>
              {lnAddress && (
                <button
                  onClick={() => copyText(lnAddress, "lnaddr")}
                  className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors"
                  title="Copy Lightning address"
                >
                  <AtSign className="size-3" />
                  {lnAddress}
                  {copied === "lnaddr" ? <Check className="size-3" /> : <Copy className="size-3" />}
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="icon" onClick={() => loadWalletData()} title="Refresh">
              <RefreshCw className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Disconnect" className="text-muted-foreground">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          <AlertCircle className="size-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} className="text-xs underline shrink-0">dismiss</button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-4 border-b border-border/30 mb-6 scrollbar-none">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors shrink-0",
              section === id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ═══════════ OVERVIEW ═══════════ */}
      {section === "overview" && (
        <div className="space-y-6">
          {/* Balance card */}
          <div className="rounded-lg border border-border/30 p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Balance</p>
            <div className="flex items-baseline gap-3 mt-1">
              <p className="text-4xl font-extrabold tabular-nums tracking-tight">
                {formatSats(coinosUser.balance)}
              </p>
              <span className="text-lg text-muted-foreground font-medium">sats</span>
            </div>
            {satsToUsd(coinosUser.balance) && (
              <p className="text-sm text-muted-foreground mt-1">≈ {satsToUsd(coinosUser.balance)}</p>
            )}

            <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-border/30">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-emerald-500/10 p-1"><TrendingUp className="size-3.5 text-emerald-500" /></div>
                <div>
                  <p className="text-sm font-semibold tabular-nums text-emerald-500">+{formatSats(incoming)}</p>
                  <p className="text-[11px] text-muted-foreground">Received</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-orange-500/10 p-1"><TrendingDown className="size-3.5 text-orange-500" /></div>
                <div>
                  <p className="text-sm font-semibold tabular-nums text-orange-500">-{formatSats(outgoing)}</p>
                  <p className="text-[11px] text-muted-foreground">Sent</p>
                </div>
              </div>
              {btcRate && (
                <div className="ml-auto text-right">
                  <p className="text-sm font-semibold tabular-nums">${btcRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-[11px] text-muted-foreground">BTC/USD</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Receive", icon: ArrowDownLeft, sec: "receive" as Section, color: "text-emerald-500 bg-emerald-500/10" },
              { label: "Send", icon: Send, sec: "send" as Section, color: "text-blue-500 bg-blue-500/10" },
              { label: "History", icon: Clock, sec: "history" as Section, color: "text-amber-500 bg-amber-500/10" },
              { label: "Accounts", icon: Layers, sec: "accounts" as Section, color: "text-purple-500 bg-purple-500/10" },
            ].map(({ label, icon: Icon, sec, color }) => (
              <button
                key={sec}
                onClick={() => setSection(sec)}
                className="flex flex-col items-center gap-2 rounded-lg border border-border/30 p-4 hover:bg-accent/30 transition-colors"
              >
                <div className={cn("rounded-lg p-2", color)}><Icon className="size-5" /></div>
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>

          {/* Recent contacts */}
          {contacts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Recent Contacts</h3>
                <button onClick={() => setSection("contacts")} className="text-xs text-primary hover:underline">View all</button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
                {contacts.slice(0, 8).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setSendAddress(c.username); setSection("send"); }}
                    className="flex flex-col items-center gap-1.5 shrink-0 w-16"
                    title={`Send to ${c.username}`}
                  >
                    <Avatar className="size-10">
                      {c.picture && <AvatarImage src={c.picture} alt={c.username} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {c.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] text-muted-foreground truncate w-full text-center">{c.username}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent transactions */}
          {payments.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Recent Transactions</h3>
                <button onClick={() => setSection("history")} className="text-xs text-primary hover:underline">View all</button>
              </div>
              <div className="space-y-1">
                {payments.slice(0, 5).map((p, i) => (
                  <div key={p.id || i} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/30 transition-colors">
                    {p.amount > 0 ? (
                      <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10 shrink-0">
                        <ArrowDownLeft className="size-3.5 text-emerald-500" />
                      </div>
                    ) : (
                      <div className="flex size-8 items-center justify-center rounded-full bg-orange-500/10 shrink-0">
                        <ArrowUpRight className="size-3.5 text-orange-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{paymentTypeLabel(p)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.created)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn("text-sm font-mono font-semibold tabular-nums", p.amount > 0 ? "text-emerald-500" : "text-orange-500")}>
                        {p.amount > 0 ? "+" : "-"}{formatSats(p.amount)}
                      </p>
                      {satsToUsd(p.amount) && <p className="text-[11px] text-muted-foreground tabular-nums">{satsToUsd(p.amount)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ RECEIVE ═══════════ */}
      {section === "receive" && (
        <div className="space-y-5 max-w-lg">
          <div>
            <h2 className="text-lg font-bold">Receive</h2>
            <p className="text-sm text-muted-foreground">Create a Lightning invoice or share your Lightning address.</p>
          </div>

          {/* Lightning address */}
          {lnAddress && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">Your Lightning Address</p>
              <div className="flex items-center gap-2">
                <AtSign className="size-4 text-primary shrink-0" />
                <code className="text-sm font-mono font-semibold flex-1">{lnAddress}</code>
                <button
                  onClick={() => copyText(lnAddress, "lnaddr2")}
                  className="rounded-md p-1.5 hover:bg-primary/10 transition-colors"
                >
                  {copied === "lnaddr2" ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5 text-muted-foreground" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">Anyone can send you sats using this address — no invoice needed.</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="invoice-amount">Amount (sats)</Label>
              <Input id="invoice-amount" type="number" placeholder="21000" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoice-memo">Memo (optional)</Label>
              <Input id="invoice-memo" placeholder="What's this for?" value={invoiceMemo} onChange={(e) => setInvoiceMemo(e.target.value)} className="h-11" />
            </div>
          </div>

          <Button onClick={handleCreateInvoice} disabled={!invoiceAmount || invoiceLoading} className="w-full gap-2 h-11">
            {invoiceLoading ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
            Create Invoice
          </Button>

          {createdInvoice && (
            <div className="rounded-lg border border-border/30 p-5 space-y-4">
              <div className="flex justify-center">
                <div className="rounded-lg bg-white p-3">
                  <QRCodeSVG value={createdInvoice} size={200} />
                </div>
              </div>
              <div className="rounded-md bg-muted/60 p-3">
                <p className="break-all font-mono text-xs leading-relaxed text-muted-foreground">{createdInvoice}</p>
              </div>
              <Button variant="outline" onClick={() => copyText(createdInvoice, "invoice")} className="w-full gap-2">
                {copied === "invoice" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied === "invoice" ? "Copied!" : "Copy Invoice"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ SEND ═══════════ */}
      {section === "send" && (
        <div className="space-y-5 max-w-lg">
          <div>
            <h2 className="text-lg font-bold">Send</h2>
            <p className="text-sm text-muted-foreground">Pay a Lightning invoice, Lightning address, or send to a CoinOS user directly.</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="send-address">Recipient</Label>
              <Input id="send-address" placeholder="lnbc..., user@domain.com, or username" value={sendAddress} onChange={(e) => setSendAddress(e.target.value)} className="h-11" />
              {sendTypeHint(sendAddress) && (
                <p className="text-xs text-primary/70 flex items-center gap-1">
                  <Zap className="size-3" /> {sendTypeHint(sendAddress)}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="send-amount">Amount (sats)</Label>
              <Input id="send-amount" type="number" placeholder="1000" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} className="h-11" />
              {sendAmount && satsToUsd(parseInt(sendAmount)) && (
                <p className="text-xs text-muted-foreground">≈ {satsToUsd(parseInt(sendAmount))}</p>
              )}
            </div>
          </div>

          <Button onClick={handleSend} disabled={!sendAddress || !sendAmount || sendLoading} className="w-full gap-2 h-11">
            {sendLoading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpRight className="size-4" />}
            Send Payment
          </Button>

          {sendResult && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
              <Check className="size-4" /> {sendResult}
            </div>
          )}

          {/* Quick-send contacts */}
          {contacts.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Quick send</p>
              <div className="flex flex-wrap gap-1.5">
                {contacts.slice(0, 12).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSendAddress(c.username)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                      sendAddress === c.username
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                    )}
                  >
                    <Avatar className="size-4">
                      {c.picture && <AvatarImage src={c.picture} />}
                      <AvatarFallback className="text-[8px]">{c.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {c.username}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ HISTORY ═══════════ */}
      {section === "history" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">Transaction History</h2>
            <p className="text-sm text-muted-foreground">{totalPayments} transaction{totalPayments !== 1 ? "s" : ""}</p>
          </div>

          {payments.length > 0 ? (
            <div className="space-y-1">
              {payments.map((p, i) => (
                <div key={p.id || i} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/30 transition-colors">
                  {p.amount > 0 ? (
                    <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10 shrink-0">
                      <ArrowDownLeft className="size-4 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="flex size-9 items-center justify-center rounded-full bg-orange-500/10 shrink-0">
                      <ArrowUpRight className="size-4 text-orange-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{paymentTypeLabel(p)}</p>
                      {p.type && (
                        <span className="text-[10px] rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground shrink-0">
                          {p.type}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.memo && <span className="mr-2">{p.memo}</span>}
                      {formatDate(p.created)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-sm font-mono font-semibold tabular-nums", p.amount > 0 ? "text-emerald-500" : "text-orange-500")}>
                      {p.amount > 0 ? "+" : "-"}{formatSats(p.amount)}
                    </p>
                    {satsToUsd(p.amount) && <p className="text-[11px] text-muted-foreground tabular-nums">{satsToUsd(p.amount)}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="size-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                <Zap className="size-6 text-muted-foreground/40" />
              </div>
              <p className="font-medium">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Your payment history will appear here.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => loadPayments(page - 1)}>Previous</Button>
              <span className="text-xs text-muted-foreground tabular-nums">Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => loadPayments(page + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ ACCOUNTS ═══════════ */}
      {section === "accounts" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold">Accounts</h2>
            <p className="text-sm text-muted-foreground">Sub-wallets for organizing your funds. Each account has its own balance and payment history.</p>
          </div>

          {/* Main account */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2"><WalletIcon className="size-5 text-primary" /></div>
              <div>
                <p className="text-sm font-semibold">Main Account</p>
                <p className="text-xs text-muted-foreground">Primary wallet</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums">{formatSats(coinosUser.balance)} sats</p>
              {satsToUsd(coinosUser.balance) && <p className="text-[11px] text-muted-foreground">{satsToUsd(coinosUser.balance)}</p>}
            </div>
          </div>

          {/* Sub-accounts */}
          {accounts.map((acc) => (
            <div key={acc.id} className="rounded-lg border border-border/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2"><Layers className="size-5 text-muted-foreground" /></div>
                <div>
                  <p className="text-sm font-semibold">{acc.name}</p>
                  <p className="text-xs text-muted-foreground">{acc.type || "Sub-account"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums">{formatSats(acc.balance || 0)} sats</p>
                  {acc.balance && satsToUsd(acc.balance) && <p className="text-[11px] text-muted-foreground">{satsToUsd(acc.balance)}</p>}
                </div>
                <button onClick={() => handleDeleteAccount(acc.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete account">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Create account */}
          <div className="flex gap-2">
            <Input placeholder="New account name..." value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} className="h-10" onKeyDown={(e) => e.key === "Enter" && handleCreateAccount()} />
            <Button onClick={handleCreateAccount} disabled={!newAccountName.trim()} size="sm" className="gap-1.5 h-10 px-4 shrink-0">
              <Plus className="size-3.5" /> Create
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════ CONTACTS ═══════════ */}
      {section === "contacts" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold">Contacts</h2>
            <p className="text-sm text-muted-foreground">People you've transacted with. Pin favorites and mark trusted contacts.</p>
          </div>

          {contacts.length > 0 ? (
            <div className="space-y-1">
              {contacts.map((c) => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  onSend={(username) => { setSendAddress(username); setSection("send"); }}
                  onPin={handlePinContact}
                  onTrust={handleTrustContact}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="size-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                <User className="size-6 text-muted-foreground/40" />
              </div>
              <p className="font-medium">No contacts yet</p>
              <p className="text-sm text-muted-foreground mt-1">Contacts appear automatically after you transact with other CoinOS users.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ INVOICES ═══════════ */}
      {section === "invoices" && (
        <InvoicesSection onError={setError} formatSats={formatSats} satsToUsd={satsToUsd} />
      )}

      {/* ═══════════ ECASH ═══════════ */}
      {section === "ecash" && (
        <EcashSection onError={setError} />
      )}

      {/* ═══════════ NWC APPS ═══════════ */}
      {section === "nwc" && (
        <NwcAppsSection onError={setError} />
      )}

      {/* ═══════════ FUNDS ═══════════ */}
      {section === "funds" && (
        <FundsSection onError={setError} formatSats={formatSats} satsToUsd={satsToUsd} />
      )}

      {/* ═══════════ SETTINGS ═══════════ */}
      {section === "settings" && (
        <SettingsSection coinosUser={coinosUser} onUserUpdate={setCoinosUser} onError={setError} />
      )}
    </div>
  );
}
