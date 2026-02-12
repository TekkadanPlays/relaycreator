import { useState, useEffect } from "react";
import { useAuth } from "../stores/auth";
import { coinos, type CoinosStatus, type CoinosUser, type CoinosPayment, type NodeInfo } from "../lib/coinos";
import { api } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";

interface AppConfig {
  coinos_enabled: boolean;
}

export default function Wallet() {
  const { user } = useAuth();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [status, setStatus] = useState<CoinosStatus | null>(null);
  const [coinosUser, setCoinosUser] = useState<CoinosUser | null>(null);
  const [payments, setPayments] = useState<CoinosPayment[]>([]);
  const [nodeInfo, setNodeInfo] = useState<NodeInfo | null>(null);
  const [loading, setLoading] = useState(true);
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

      if (s.healthy && localStorage.getItem("coinos_token")) {
        try {
          const me = await coinos.me();
          setCoinosUser(me);
          const p = await coinos.payments();
          setPayments(Array.isArray(p) ? p : []);
        } catch {
          localStorage.removeItem("coinos_token");
        }

        try {
          const info = await coinos.info();
          setNodeInfo(info);
        } catch {}
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
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
      setSendResult("Payment sent successfully");
      setSendAddress("");
      setSendAmount("");
      loadData();
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

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <WalletIcon className="size-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Sign in to access your wallet</h2>
        <p className="text-muted-foreground">Connect your Nostr extension to manage your Lightning wallet.</p>
      </div>
    );
  }

  if (!config?.coinos_enabled) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <Bitcoin className="size-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Wallet Not Available</h2>
        <p className="text-muted-foreground max-w-md">
          The CoinOS wallet integration is not enabled on this server.
          Contact the server administrator to enable it.
        </p>
      </div>
    );
  }

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

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
          <p className="text-sm text-muted-foreground">Lightning wallet powered by CoinOS</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5">
          <RefreshCw className="size-3.5" /> Refresh
        </Button>
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
              {coinosUser ? (
                <>{formatSats(coinosUser.balance)} <span className="text-base font-normal text-muted-foreground">sats</span></>
              ) : (
                <span className="text-lg text-muted-foreground">Not connected</span>
              )}
            </p>
            {coinosUser && (
              <p className="text-xs text-muted-foreground mt-1">@{coinosUser.username}</p>
            )}
          </div>
          <div className="flex gap-3">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Received</p>
              <p className="text-sm font-semibold tabular-nums text-emerald-500">
                +{formatSats(payments.filter(p => p.amount > 0).reduce((a, b) => a + b.amount, 0))}
              </p>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Sent</p>
              <p className="text-sm font-semibold tabular-nums text-orange-500">
                -{formatSats(payments.filter(p => p.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receive + Send side by side */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Receive */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDownLeft className="size-4 text-emerald-500" /> Receive
            </CardTitle>
            <CardDescription>Create a Lightning invoice</CardDescription>
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
              {invoiceLoading ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              Create Invoice
            </Button>
            {createdInvoice && (
              <>
                <div className="w-full rounded-md bg-muted p-3">
                  <p className="break-all font-mono text-xs leading-relaxed">{createdInvoice}</p>
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

        {/* Send */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpRight className="size-4 text-orange-500" /> Send
            </CardTitle>
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
              {sendLoading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpRight className="size-4" />}
              Send Payment
            </Button>
            {sendResult && (
              <div className="w-full flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-500">
                <Check className="size-4" /> {sendResult}
              </div>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Recent Transactions */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <CardDescription>{payments.length} payment{payments.length !== 1 ? "s" : ""}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {payments.slice(0, 10).map((payment, i) => (
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
                    <p className="text-xs text-muted-foreground">{formatDate(payment.created)}</p>
                  </div>
                  <p className={`text-sm font-mono font-medium ${payment.amount > 0 ? "text-emerald-500" : "text-orange-500"}`}>
                    {payment.amount > 0 ? "+" : "-"}{formatSats(payment.amount)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
