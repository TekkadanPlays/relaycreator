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

  // Wallet tab
  const [tab, setTab] = useState<"overview" | "receive" | "send" | "history">("overview");

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

  const walletTabs = [
    { id: "overview" as const, label: "Overview", icon: WalletIcon },
    { id: "receive" as const, label: "Receive", icon: ArrowDownLeft },
    { id: "send" as const, label: "Send", icon: ArrowUpRight },
    { id: "history" as const, label: "History", icon: RefreshCw },
  ];

  return (
    <div className="animate-in">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-56 shrink-0 space-y-4">
          <div className="flex items-center gap-2.5 px-1">
            <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Zap className="size-4.5 text-amber-400" />
            </div>
            <div>
              <h1 className="font-bold text-sm">Lightning Wallet</h1>
              <p className="text-[11px] text-muted-foreground">Powered by CoinOS</p>
            </div>
          </div>

          {/* Balance summary */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Balance</p>
              <p className="text-2xl font-bold tabular-nums">
                {coinosUser ? (
                  <>{formatSats(coinosUser.balance)} <span className="text-sm font-normal text-muted-foreground">sats</span></>
                ) : (
                  <span className="text-muted-foreground text-base">Not logged in</span>
                )}
              </p>
              {coinosUser && (
                <p className="text-[11px] text-muted-foreground mt-1">@{coinosUser.username}</p>
              )}
            </CardContent>
          </Card>

          <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {walletTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <t.icon className="size-4 shrink-0" />
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
              <button onClick={() => setError("")} className="ml-auto text-xs underline">dismiss</button>
            </div>
          )}

          {tab === "overview" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Overview</h2>
                  <p className="text-sm text-muted-foreground">Wallet status and node information.</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5 h-8">
                  <RefreshCw className="size-3" /> Refresh
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: "Balance", value: coinosUser ? `${formatSats(coinosUser.balance)}` : "—", icon: WalletIcon, color: "text-amber-400", bg: "bg-amber-500/10" },
                  { label: "Transactions", value: String(payments.length), icon: RefreshCw, color: "text-blue-400", bg: "bg-blue-500/10" },
                  { label: "Received", value: formatSats(payments.filter(p => p.amount > 0).reduce((a, b) => a + b.amount, 0)), icon: ArrowDownLeft, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                  { label: "Sent", value: formatSats(payments.filter(p => p.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0)), icon: ArrowUpRight, color: "text-orange-400", bg: "bg-orange-500/10" },
                ].map((stat) => (
                  <Card key={stat.label} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${stat.bg}`}>
                          <stat.icon className={`size-4 ${stat.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                          <p className="text-lg font-bold tabular-nums truncate">{stat.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Node Info */}
              <Card className="border-border/50">
                <CardHeader className="pb-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="size-4" /> Lightning Node
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {nodeInfo ? (
                    <div className="rounded-lg border border-border/50 overflow-hidden">
                      <div className="divide-y divide-border/30">
                        {[
                          { label: "Alias", value: nodeInfo.alias || "—" },
                          { label: "Block Height", value: nodeInfo.block_height?.toLocaleString() || "—" },
                          { label: "Network", value: nodeInfo.network || "—" },
                          ...(nodeInfo.pubkey ? [{ label: "Pubkey", value: nodeInfo.pubkey }] : []),
                        ].map((row) => (
                          <div key={row.label} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
                            <span className="text-sm text-muted-foreground">{row.label}</span>
                            <span className="text-sm font-mono truncate max-w-[200px]">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-8 text-center">
                      <div className="size-10 rounded-lg bg-muted flex items-center justify-center mb-3">
                        <Server className="size-5 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-medium">Node not available</p>
                      <p className="text-xs text-muted-foreground mt-1">Lightning node info could not be retrieved.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "receive" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Receive</h2>
                <p className="text-sm text-muted-foreground">Create a Lightning invoice to receive sats.</p>
              </div>
              <Card className="border-border/50 max-w-lg">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="invoice-amount" className="text-xs font-medium text-muted-foreground">Amount (sats)</Label>
                    <Input
                      id="invoice-amount"
                      type="number"
                      placeholder="21000"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invoice-memo" className="text-xs font-medium text-muted-foreground">Memo (optional)</Label>
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
                    <div className="space-y-3 pt-2">
                      <Separator />
                      <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                        <p className="mb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Lightning Invoice</p>
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
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "send" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Send</h2>
                <p className="text-sm text-muted-foreground">Pay a Lightning invoice or send to an address.</p>
              </div>
              <Card className="border-border/50 max-w-lg">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="send-address" className="text-xs font-medium text-muted-foreground">Invoice or Lightning Address</Label>
                    <Input
                      id="send-address"
                      placeholder="lnbc... or user@domain.com"
                      value={sendAddress}
                      onChange={(e) => setSendAddress(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="send-amount" className="text-xs font-medium text-muted-foreground">Amount (sats)</Label>
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
                    className="w-full gap-2"
                  >
                    {sendLoading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpRight className="size-4" />}
                    Send Payment
                  </Button>
                  {sendResult && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                      <Check className="size-4" />
                      {sendResult}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "history" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Payment History</h2>
                <p className="text-sm text-muted-foreground">Your recent Lightning transactions.</p>
              </div>
              {payments.length > 0 ? (
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/30">
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Memo</th>
                          <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Amount</th>
                          <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.slice(0, 50).map((payment, i) => (
                          <tr key={payment.id || i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {payment.amount > 0 ? (
                                  <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/10">
                                    <ArrowDownLeft className="size-3.5 text-emerald-400" />
                                  </div>
                                ) : (
                                  <div className="flex size-7 items-center justify-center rounded-full bg-orange-500/10">
                                    <ArrowUpRight className="size-3.5 text-orange-400" />
                                  </div>
                                )}
                                <span className="text-xs">{payment.type}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm truncate max-w-[200px] block">
                                {payment.memo || (payment.amount > 0 ? "Received" : "Sent")}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-mono font-medium ${payment.amount > 0 ? "text-emerald-400" : "text-orange-400"}`}>
                                {payment.amount > 0 ? "+" : "-"}{formatSats(payment.amount)}
                              </span>
                              {payment.fee ? (
                                <p className="text-[10px] text-muted-foreground">fee: {payment.fee}</p>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-right hidden sm:table-cell">
                              <span className="text-xs text-muted-foreground">{formatDate(payment.created)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-16 text-center">
                  <div className="size-10 rounded-lg bg-muted flex items-center justify-center mb-3">
                    <RefreshCw className="size-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium">No transactions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Your payment history will appear here.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
