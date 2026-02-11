import { useState, useEffect } from "react";
import { useAuth } from "../stores/auth";
import { coinos, type CoinosStatus, type CoinosUser, type CoinosPayment, type NodeInfo } from "../lib/coinos";
import { api } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Server,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
          <p className="text-muted-foreground">Manage your Lightning wallet powered by CoinOS</p>
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Balance Card */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardDescription>Balance</CardDescription>
            <CardTitle className="text-3xl font-bold tabular-nums">
              {coinosUser ? (
                <>
                  <span className="text-gradient">{formatSats(coinosUser.balance)}</span>
                  <span className="ml-2 text-lg font-normal text-muted-foreground">sats</span>
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coinosUser && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="size-3.5" />
                <span>Logged in as <strong>{coinosUser.username}</strong></span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Node Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Lightning Node</CardDescription>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="size-4" />
              {nodeInfo?.alias || "Node"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {nodeInfo ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Block Height</span>
                  <span className="font-mono">{nodeInfo.block_height?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network</span>
                  <Badge variant="secondary" className="text-xs">{nodeInfo.network}</Badge>
                </div>
                {nodeInfo.pubkey && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pubkey</span>
                    <span className="font-mono text-xs truncate max-w-[120px]">{nodeInfo.pubkey}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Not connected</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Activity</CardDescription>
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Payments</span>
              <span className="font-mono">{payments.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Received</span>
              <span className="font-mono text-green-500">
                {formatSats(payments.filter(p => p.amount > 0).reduce((a, b) => a + b.amount, 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sent</span>
              <span className="font-mono text-orange-500">
                {formatSats(payments.filter(p => p.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0))}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Receive */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownLeft className="size-4 text-green-500" />
              Receive
            </CardTitle>
            <CardDescription>Create a Lightning invoice to receive sats</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-amount">Amount (sats)</Label>
              <Input
                id="invoice-amount"
                type="number"
                placeholder="21000"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-memo">Memo (optional)</Label>
              <Input
                id="invoice-memo"
                placeholder="What's this for?"
                value={invoiceMemo}
                onChange={(e) => setInvoiceMemo(e.target.value)}
              />
            </div>
            <Button
              onClick={handleCreateInvoice}
              disabled={!invoiceAmount || invoiceLoading}
              className="w-full gap-2"
            >
              {invoiceLoading ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              Create Invoice
            </Button>
            {createdInvoice && (
              <div className="space-y-2">
                <Separator />
                <div className="rounded-lg bg-muted p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Lightning Invoice</p>
                  <p className="break-all font-mono text-xs">{createdInvoice}</p>
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Send */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="size-4 text-orange-500" />
              Send
            </CardTitle>
            <CardDescription>Pay a Lightning invoice or send to an address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="send-address">Invoice or Lightning Address</Label>
              <Input
                id="send-address"
                placeholder="lnbc... or user@domain.com"
                value={sendAddress}
                onChange={(e) => setSendAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="send-amount">Amount (sats)</Label>
              <Input
                id="send-amount"
                type="number"
                placeholder="1000"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={!sendAddress || !sendAmount || sendLoading}
              variant="outline"
              className="w-full gap-2"
            >
              {sendLoading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpRight className="size-4" />}
              Send Payment
            </Button>
            {sendResult && (
              <p className="text-sm text-green-500">{sendResult}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Your recent Lightning transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {payments.slice(0, 20).map((payment, i) => (
                <div
                  key={payment.id || i}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {payment.amount > 0 ? (
                      <div className="flex size-8 items-center justify-center rounded-full bg-green-500/10">
                        <ArrowDownLeft className="size-4 text-green-500" />
                      </div>
                    ) : (
                      <div className="flex size-8 items-center justify-center rounded-full bg-orange-500/10">
                        <ArrowUpRight className="size-4 text-orange-500" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {payment.memo || (payment.amount > 0 ? "Received" : "Sent")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.type} · {formatDate(payment.created)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-mono font-medium ${payment.amount > 0 ? "text-green-500" : "text-orange-500"}`}>
                      {payment.amount > 0 ? "+" : "-"}{formatSats(payment.amount)} sats
                    </p>
                    {payment.fee ? (
                      <p className="text-xs text-muted-foreground">fee: {payment.fee}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
