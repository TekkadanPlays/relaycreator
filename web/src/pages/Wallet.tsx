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
} from "../lib/coinos";
import { api } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 10;

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

  useEffect(() => {
    loadData();
  }, [user?.pubkey]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const cfg = await api.get<AppConfig>("/config");
      setConfig(cfg);

      if (!cfg.coinos_enabled) {
        setLoading(false);
        return;
      }

      const s = await coinos.status();
      setStatus(s);

      if (s.healthy) {
        // Fetch exchange rates
        try {
          const rates = await coinos.rates();
          if (rates?.USD) setBtcRate(rates.USD);
        } catch {}

        // Verify the active NIP-07 pubkey matches the stored wallet session
        const activePk = await getActivePubkey();
        const storedPk = localStorage.getItem("coinos_pubkey");

        if (storedPk && activePk && storedPk !== activePk) {
          clearWalletSession();
          setCoinosUser(null);
          setPayments([]);
          setTotalPayments(0);
          setIncoming(0);
          setOutgoing(0);
        }

        if (getCoinosToken()) {
          await loadWalletData();
        } else if (window.nostr) {
          const ok = await connectWithNostr();
          if (ok) await loadWalletData();
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function loadWalletData() {
    try {
      const me = await coinos.me();
      setCoinosUser(me);
      await loadPayments(0);
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
      setIncoming(resp.incoming || 0);
      setOutgoing(resp.outgoing || 0);
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
    setTotalPayments(0);
    setIncoming(0);
    setOutgoing(0);
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
      setCreatedInvoice(inv.hash || inv.bolt11 || "");
      setInvoiceAmount("");
      setInvoiceMemo("");
    } catch (err: any) {
      setError(err.message);
    }
    setInvoiceLoading(false);
  }

  async function handleSend() {
    setSendLoading(true);
    setSendResult("");
    try {
      await coinos.sendPayment({
        amount: parseInt(sendAmount),
        address: sendAddress,
      });
      setSendResult("Payment sent!");
      setSendAddress("");
      setSendAmount("");
      await loadWalletData();
    } catch (err: any) {
      setError(err.message);
    }
    setSendLoading(false);
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
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const totalPages = Math.ceil(totalPayments / pageSize);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Not signed into Nostr ──
  if (!user) {
    return (
      <div className="flex flex-col items-center py-24 text-center animate-in">
        <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
          <WalletIcon className="size-8 text-muted-foreground/40" />
        </div>
        <h2 className="text-xl font-bold">Sign in to access your wallet</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          Connect your Nostr extension to manage your Lightning wallet.
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
          The CoinOS wallet integration is not enabled on this server.
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
          The CoinOS server is not responding. Please try again later.
        </p>
        <Button variant="outline" onClick={loadData} className="mt-4 gap-2">
          <RefreshCw className="size-4" /> Retry
        </Button>
      </div>
    );
  }

  // ── Not logged into CoinOS — connect prompt ──
  if (!coinosUser) {
    return (
      <div className="mx-auto max-w-md animate-in">
        <div className="pt-6 pb-8 sm:pt-10 sm:pb-10 text-center">
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <Zap className="size-8 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Lightning <span className="text-gradient">Wallet</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Link your Nostr identity to a CoinOS Lightning wallet.
            Your extension will sign a one-time auth event.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-6">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        <Button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full gap-2 h-12 text-base"
        >
          {connecting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LinkIcon className="size-4" />
          )}
          {connecting ? "Connecting..." : "Connect with Nostr"}
        </Button>
      </div>
    );
  }

  // ── Connected — full wallet ──
  return (
    <div className="mx-auto max-w-2xl animate-in">
      {/* Header */}
      <section className="pt-6 pb-8 sm:pt-10 sm:pb-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              <span className="text-gradient">Wallet</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              @{coinosUser.username} · CoinOS Lightning
            </p>
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

        {/* Balance */}
        <div className="mt-6 rounded-lg border border-border/30 p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Balance</p>
          <div className="flex items-baseline gap-3 mt-1">
            <p className="text-4xl font-extrabold tabular-nums tracking-tight">
              {formatSats(coinosUser.balance)}
            </p>
            <span className="text-lg text-muted-foreground font-medium">sats</span>
          </div>
          {satsToUsd(coinosUser.balance) && (
            <p className="text-sm text-muted-foreground mt-1">
              ≈ {satsToUsd(coinosUser.balance)}
            </p>
          )}

          <div className="flex gap-6 mt-4 pt-4 border-t border-border/30">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-emerald-500/10 p-1">
                <TrendingUp className="size-3.5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold tabular-nums text-emerald-500">
                  +{formatSats(incoming)}
                </p>
                <p className="text-[11px] text-muted-foreground">Received</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-orange-500/10 p-1">
                <TrendingDown className="size-3.5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-semibold tabular-nums text-orange-500">
                  -{formatSats(outgoing)}
                </p>
                <p className="text-[11px] text-muted-foreground">Sent</p>
              </div>
            </div>
            {btcRate && (
              <div className="ml-auto text-right">
                <p className="text-sm font-semibold tabular-nums">
                  ${btcRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[11px] text-muted-foreground">BTC/USD</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-6">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-xs underline">dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="receive" className="space-y-6">
        <TabsList className="w-full">
          <TabsTrigger value="receive" className="gap-1.5 flex-1">
            <ArrowDownLeft className="size-3.5" /> Receive
          </TabsTrigger>
          <TabsTrigger value="send" className="gap-1.5 flex-1">
            <ArrowUpRight className="size-3.5" /> Send
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 flex-1">
            <Zap className="size-3.5" /> History
          </TabsTrigger>
        </TabsList>

        {/* ── Receive ── */}
        <TabsContent value="receive" className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">Receive Lightning</h2>
            <p className="text-sm text-muted-foreground">Create an invoice to receive sats.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="invoice-amount">Amount (sats)</Label>
              <Input
                id="invoice-amount"
                type="number"
                placeholder="21000"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoice-memo">Memo (optional)</Label>
              <Input
                id="invoice-memo"
                placeholder="What's this for?"
                value={invoiceMemo}
                onChange={(e) => setInvoiceMemo(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <Button
            onClick={handleCreateInvoice}
            disabled={!invoiceAmount || invoiceLoading}
            className="w-full gap-2 h-11"
          >
            {invoiceLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Zap className="size-4" />
            )}
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
                <p className="break-all font-mono text-xs leading-relaxed text-muted-foreground">
                  {createdInvoice}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => copyText(createdInvoice, "invoice")}
                className="w-full gap-2"
              >
                {copied === "invoice" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied === "invoice" ? "Copied!" : "Copy Invoice"}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── Send ── */}
        <TabsContent value="send" className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">Send Lightning</h2>
            <p className="text-sm text-muted-foreground">Pay an invoice or Lightning address.</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="send-address">Invoice or Lightning address</Label>
              <Input
                id="send-address"
                placeholder="lnbc... or user@domain.com"
                value={sendAddress}
                onChange={(e) => setSendAddress(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="send-amount">Amount (sats)</Label>
              <Input
                id="send-amount"
                type="number"
                placeholder="1000"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                className="h-11"
              />
              {sendAmount && satsToUsd(parseInt(sendAmount)) && (
                <p className="text-xs text-muted-foreground">
                  ≈ {satsToUsd(parseInt(sendAmount))}
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={handleSend}
            disabled={!sendAddress || !sendAmount || sendLoading}
            className="w-full gap-2 h-11"
          >
            {sendLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowUpRight className="size-4" />
            )}
            Send Payment
          </Button>

          {sendResult && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
              <Check className="size-4" /> {sendResult}
            </div>
          )}
        </TabsContent>

        {/* ── History ── */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Payment History</h2>
              <p className="text-sm text-muted-foreground">
                {totalPayments} transaction{totalPayments !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {payments.length > 0 ? (
            <div className="space-y-1">
              {payments.map((payment, i) => (
                <div
                  key={payment.id || i}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/30 transition-colors"
                >
                  {payment.amount > 0 ? (
                    <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10 shrink-0">
                      <ArrowDownLeft className="size-3.5 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="flex size-8 items-center justify-center rounded-full bg-orange-500/10 shrink-0">
                      <ArrowUpRight className="size-3.5 text-orange-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {payment.memo || (payment.amount > 0 ? "Received" : "Sent")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payment.created)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-mono font-semibold tabular-nums ${
                        payment.amount > 0 ? "text-emerald-500" : "text-orange-500"
                      }`}
                    >
                      {payment.amount > 0 ? "+" : "-"}
                      {formatSats(payment.amount)}
                    </p>
                    {satsToUsd(payment.amount) && (
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {satsToUsd(payment.amount)}
                      </p>
                    )}
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
              <p className="text-sm text-muted-foreground mt-1">
                Your payment history will appear here.
              </p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => loadPayments(page - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => loadPayments(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
