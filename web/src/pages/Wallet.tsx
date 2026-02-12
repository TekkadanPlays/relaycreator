import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../stores/auth";
import {
  coinos,
  type CoinosStatus,
  type CoinosUser,
  type CoinosPayment,
} from "../lib/coinos";
import { api } from "../lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  Link,
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

  // Invoice creation
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceMemo, setInvoiceMemo] = useState("");
  const [createdInvoice, setCreatedInvoice] = useState("");
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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
      const result = await coinos.nostrAuth({ challenge, event: signedEvent });

      if (result.token) {
        localStorage.setItem("coinos_token", result.token);
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
  }, []);

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
        if (localStorage.getItem("coinos_token")) {
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
      localStorage.removeItem("coinos_token");
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
    coinos.logout();
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

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatSats(amount: number) {
    return new Intl.NumberFormat().format(Math.abs(amount));
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
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <WalletIcon className="size-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Sign in to access your wallet</h2>
        <p className="text-muted-foreground">
          Connect your Nostr extension to manage your Lightning wallet.
        </p>
      </div>
    );
  }

  // ── CoinOS not enabled ──
  if (!config?.coinos_enabled) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <Bitcoin className="size-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Wallet Not Available</h2>
        <p className="text-muted-foreground max-w-md">
          The CoinOS wallet integration is not enabled on this server.
        </p>
      </div>
    );
  }

  // ── CoinOS server down ──
  if (status && !status.healthy) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <AlertCircle className="size-12 text-destructive" />
        <h2 className="text-xl font-semibold">Wallet Service Unavailable</h2>
        <p className="text-muted-foreground">
          The CoinOS server is not responding. Please try again later.
        </p>
        <Button variant="outline" onClick={loadData} className="gap-2">
          <RefreshCw className="size-4" /> Retry
        </Button>
      </div>
    );
  }

  // ── Not logged into CoinOS — auto-connect prompt ──
  if (!coinosUser) {
    return (
      <div className="mx-auto max-w-md py-8 animate-in">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Connect Wallet</CardTitle>
            <CardDescription>
              Link your Nostr identity to a CoinOS Lightning wallet.
              {" "}Your extension will sign a one-time auth event.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full gap-2"
            >
              {connecting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Link className="size-4" />
              )}
              {connecting ? "Connecting..." : "Connect with Nostr"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ── Logged in — full wallet ──
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
          <p className="text-sm text-muted-foreground">
            @{coinosUser.username} &middot; CoinOS
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => loadWalletData()} className="gap-1.5">
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-muted-foreground">
            <LogOut className="size-3.5" /> Disconnect
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-xs underline">dismiss</button>
        </div>
      )}

      {/* Balance */}
      <Card>
        <CardContent className="flex items-center justify-between py-6">
          <div>
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className="text-3xl font-bold tabular-nums">
              {formatSats(coinosUser.balance)}{" "}
              <span className="text-base font-normal text-muted-foreground">sats</span>
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Received</p>
              <p className="text-sm font-semibold tabular-nums text-emerald-500">
                +{formatSats(incoming)}
              </p>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Sent</p>
              <p className="text-sm font-semibold tabular-nums text-orange-500">
                -{formatSats(outgoing)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Receive / Send / History */}
      <Tabs defaultValue="receive">
        <TabsList className="w-full">
          <TabsTrigger value="receive" className="gap-1.5">
            <ArrowDownLeft className="size-3.5" /> Receive
          </TabsTrigger>
          <TabsTrigger value="send" className="gap-1.5">
            <ArrowUpRight className="size-3.5" /> Send
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <RefreshCw className="size-3.5" /> History
          </TabsTrigger>
        </TabsList>

        {/* ── Receive ── */}
        <TabsContent value="receive">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receive Lightning</CardTitle>
              <CardDescription>Create an invoice to receive sats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="invoice-amount">Amount (sats)</Label>
                <Input
                  id="invoice-amount"
                  type="number"
                  placeholder="21000"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invoice-memo">Memo (optional)</Label>
                <Input
                  id="invoice-memo"
                  placeholder="What's this for?"
                  value={invoiceMemo}
                  onChange={(e) => setInvoiceMemo(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button
                onClick={handleCreateInvoice}
                disabled={!invoiceAmount || invoiceLoading}
                className="w-full gap-2"
              >
                {invoiceLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Zap className="size-4" />
                )}
                Create Invoice
              </Button>
              {createdInvoice && (
                <>
                  <div className="w-full rounded-md bg-muted p-3">
                    <p className="break-all font-mono text-xs leading-relaxed">
                      {createdInvoice}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(createdInvoice)}
                    className="w-full gap-2"
                  >
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? "Copied!" : "Copy Invoice"}
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ── Send ── */}
        <TabsContent value="send">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Send Lightning</CardTitle>
              <CardDescription>Pay an invoice or Lightning address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="send-address">Invoice or address</Label>
                <Input
                  id="send-address"
                  placeholder="lnbc... or user@domain.com"
                  value={sendAddress}
                  onChange={(e) => setSendAddress(e.target.value)}
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
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button
                onClick={handleSend}
                disabled={!sendAddress || !sendAmount || sendLoading}
                className="w-full gap-2"
              >
                {sendLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowUpRight className="size-4" />
                )}
                Send Payment
              </Button>
              {sendResult && (
                <div className="w-full flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-500">
                  <Check className="size-4" /> {sendResult}
                </div>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ── History ── */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment History</CardTitle>
              <CardDescription>
                {totalPayments} total payment{totalPayments !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {payments.length > 0 ? (
                <div className="divide-y">
                  {payments.map((payment, i) => (
                    <div
                      key={payment.id || i}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors"
                    >
                      {payment.amount > 0 ? (
                        <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10">
                          <ArrowDownLeft className="size-4 text-emerald-500" />
                        </div>
                      ) : (
                        <div className="flex size-8 items-center justify-center rounded-full bg-orange-500/10">
                          <ArrowUpRight className="size-4 text-orange-500" />
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
                      <p
                        className={`text-sm font-mono font-medium ${
                          payment.amount > 0 ? "text-emerald-500" : "text-orange-500"
                        }`}
                      >
                        {payment.amount > 0 ? "+" : "-"}
                        {formatSats(payment.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-12 text-center">
                  <Zap className="size-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium">No transactions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your payment history will appear here.
                  </p>
                </div>
              )}
            </CardContent>
            {totalPages > 1 && (
              <CardFooter className="justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => loadPayments(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
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
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
