import { useState, useEffect } from "react";
import { coinos, type CoinosInvoice } from "../../lib/coinos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Plus,
  Copy,
  Check,
  Loader2,
  Zap,
  Clock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InvoicesSectionProps {
  onError: (msg: string) => void;
  formatSats: (n: number) => string;
  satsToUsd: (n: number) => string | null;
}

export default function InvoicesSection({ onError, formatSats, satsToUsd }: InvoicesSectionProps) {
  const [invoices, setInvoices] = useState<CoinosInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"list" | "create" | "lookup">("list");
  const [copied, setCopied] = useState<string | null>(null);

  // Create
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [invoiceType, setInvoiceType] = useState("lightning");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CoinosInvoice | null>(null);

  // Lookup
  const [lookupId, setLookupId] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<CoinosInvoice | null>(null);

  useEffect(() => { loadInvoices(); }, []);

  async function loadInvoices() {
    setLoading(true);
    try {
      const list = await coinos.listInvoices();
      setInvoices(Array.isArray(list) ? list : []);
    } catch { setInvoices([]); }
    setLoading(false);
  }

  async function handleCreate() {
    const amt = parseInt(amount);
    if (!amt) return;
    setCreating(true);
    setCreated(null);
    try {
      const inv = await coinos.createInvoice({
        amount: amt,
        memo: memo || undefined,
        type: invoiceType,
      });
      setCreated(inv);
      setAmount("");
      setMemo("");
      await loadInvoices();
    } catch (err: any) { onError(err.message); }
    setCreating(false);
  }

  async function handleLookup() {
    if (!lookupId.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const inv = await coinos.getInvoice(lookupId.trim());
      setLookupResult(inv);
    } catch (err: any) { onError(err.message); }
    setLookupLoading(false);
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function formatDate(ts: number | undefined) {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  const tabs = [
    { id: "list" as const, label: "All Invoices", icon: FileText },
    { id: "create" as const, label: "Create", icon: Plus },
    { id: "lookup" as const, label: "Lookup", icon: ExternalLink },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Invoices</h2>
        <p className="text-sm text-muted-foreground">
          Create, list, and look up payment invoices.
        </p>
      </div>

      <div className="flex gap-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === "list" && (
        loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : invoices.length > 0 ? (
          <div className="space-y-1">
            {invoices.map((inv) => (
              <div key={inv.id || inv.hash} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/30 transition-colors">
                <div className="flex size-9 items-center justify-center rounded-full bg-blue-500/10 shrink-0">
                  <Zap className="size-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {inv.memo || `Invoice #${inv.id?.slice(0, 8) || inv.hash?.slice(0, 8)}`}
                    </p>
                    {inv.type && (
                      <span className="text-[10px] rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground shrink-0 capitalize">
                        {inv.type}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDate(inv.created)}
                    {inv.received ? " · Paid" : " · Pending"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-semibold tabular-nums">{formatSats(inv.amount)} sats</p>
                  {satsToUsd(inv.amount) && <p className="text-[11px] text-muted-foreground tabular-nums">{satsToUsd(inv.amount)}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="size-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <FileText className="size-6 text-muted-foreground/40" />
            </div>
            <p className="font-medium">No invoices</p>
            <p className="text-sm text-muted-foreground mt-1">Create an invoice to get started.</p>
          </div>
        )
      )}

      {tab === "create" && (
        <div className="space-y-4 max-w-lg">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="inv-amount">Amount (sats)</Label>
              <Input id="inv-amount" type="number" placeholder="21000" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-memo">Memo</Label>
              <Input id="inv-memo" placeholder="Payment for..." value={memo} onChange={(e) => setMemo(e.target.value)} className="h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="flex gap-2">
              {["lightning", "bitcoin", "liquid"].map((t) => (
                <button
                  key={t}
                  onClick={() => setInvoiceType(t)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium border transition-colors capitalize",
                    invoiceType === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleCreate} disabled={!amount || creating} className="w-full gap-2 h-11">
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create Invoice
          </Button>
          {created && (
            <div className="rounded-lg border border-border/30 p-4 space-y-3">
              <p className="text-xs font-medium text-emerald-500">Invoice created!</p>
              {(created.bolt11 || created.hash || created.text) && (
                <>
                  <div className="rounded-md bg-muted/60 p-3">
                    <p className="break-all font-mono text-xs leading-relaxed text-muted-foreground">
                      {created.bolt11 || created.hash || created.text}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(created.bolt11 || created.hash || created.text || "", "created-inv")}
                    className="gap-1.5"
                  >
                    {copied === "created-inv" ? <Check className="size-3" /> : <Copy className="size-3" />}
                    {copied === "created-inv" ? "Copied!" : "Copy"}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "lookup" && (
        <div className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <Label htmlFor="inv-lookup">Invoice ID or Hash</Label>
            <Input id="inv-lookup" placeholder="Invoice ID..." value={lookupId} onChange={(e) => setLookupId(e.target.value)} className="h-11" />
          </div>
          <Button onClick={handleLookup} disabled={!lookupId.trim() || lookupLoading} className="w-full gap-2 h-11">
            {lookupLoading ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
            Lookup
          </Button>
          {lookupResult && (
            <div className="rounded-lg border border-border/30 p-4 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Amount:</span> <span className="font-semibold">{formatSats(lookupResult.amount)} sats</span></div>
                <div><span className="text-muted-foreground">Type:</span> <span className="font-semibold capitalize">{lookupResult.type || "—"}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className="font-semibold">{lookupResult.received ? "Paid" : "Pending"}</span></div>
                {lookupResult.memo && <div className="col-span-2"><span className="text-muted-foreground">Memo:</span> <span className="font-semibold">{lookupResult.memo}</span></div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
