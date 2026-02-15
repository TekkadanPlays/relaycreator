import { useState, useEffect, useCallback } from "react";
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
import { cn } from "@/lib/utils";
import OverviewSection from "./wallet/OverviewSection";
import SendSection from "./wallet/SendSection";
import ReceiveSection from "./wallet/ReceiveSection";
import HistorySection from "./wallet/HistorySection";
import AccountsSection from "./wallet/AccountsSection";
import ContactsSection from "./wallet/ContactsSection";
import EcashSection from "./wallet/EcashSection";
import NwcAppsSection from "./wallet/NwcAppsSection";
import SettingsSection from "./wallet/SettingsSection";
import {
  Wallet as WalletIcon,
  Zap,
  ArrowDownLeft,
  RefreshCw,
  AlertCircle,
  Loader2,
  Bitcoin,
  LogOut,
  Link as LinkIcon,
  Users,
  Layers,
  Clock,
  AtSign,
  Send,
  Copy,
  Check,
  Coins,
  Radio,
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

type Section = "overview" | "receive" | "send" | "history" | "accounts" | "contacts" | "ecash" | "nwc" | "settings";

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
  const [sendToAddress, setSendToAddress] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // Accounts & Contacts
  const [accounts, setAccounts] = useState<CoinosAccount[]>([]);
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

  // ── Helpers ──
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

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const lnAddress = coinosUser ? `${coinosUser.username}@${window.location.hostname}` : "";

  // ── Nav items (consumer-only) ──
  const navItems: { id: Section; label: string; icon: typeof Zap }[] = [
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
            Lightning payments, ecash, internal transfers, sub-accounts, and more — powered by CoinOS.
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
            { icon: Settings, label: "Settings", desc: "Preferences" },
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

  // ── Connected — consumer wallet interface ──
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

      {/* Section content */}
      {section === "overview" && (
        <OverviewSection
          coinosUser={coinosUser}
          payments={payments}
          contacts={contacts}
          incoming={incoming}
          outgoing={outgoing}
          btcRate={btcRate}
          formatSats={formatSats}
          satsToUsd={satsToUsd}
          formatDate={formatDate}
          paymentTypeLabel={paymentTypeLabel}
          onNavigate={(s) => setSection(s as Section)}
          onSendTo={(username) => { setSendToAddress(username); setSection("send"); }}
        />
      )}

      {section === "receive" && (
        <ReceiveSection
          lnAddress={lnAddress}
          satsToUsd={satsToUsd}
          onError={setError}
        />
      )}

      {section === "send" && (
        <SendSection
          contacts={contacts}
          initialAddress={sendToAddress}
          satsToUsd={satsToUsd}
          onError={setError}
          onSuccess={() => loadWalletData()}
        />
      )}

      {section === "history" && (
        <HistorySection
          payments={payments}
          totalPayments={totalPayments}
          page={page}
          pageSize={pageSize}
          formatSats={formatSats}
          satsToUsd={satsToUsd}
          formatDate={formatDate}
          paymentTypeLabel={paymentTypeLabel}
          onPageChange={loadPayments}
        />
      )}

      {section === "accounts" && (
        <AccountsSection
          coinosUser={coinosUser}
          accounts={accounts}
          formatSats={formatSats}
          satsToUsd={satsToUsd}
          onError={setError}
          onAccountsChange={setAccounts}
        />
      )}

      {section === "contacts" && (
        <ContactsSection
          contacts={contacts}
          onSend={(username) => { setSendToAddress(username); setSection("send"); }}
          onPin={handlePinContact}
          onTrust={handleTrustContact}
        />
      )}

      {section === "ecash" && (
        <EcashSection onError={setError} />
      )}

      {section === "nwc" && (
        <NwcAppsSection onError={setError} />
      )}

      {section === "settings" && (
        <SettingsSection coinosUser={coinosUser} onUserUpdate={setCoinosUser} onError={setError} />
      )}
    </div>
  );
}
