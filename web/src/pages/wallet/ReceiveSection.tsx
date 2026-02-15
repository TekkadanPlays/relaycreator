import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { coinos } from "../../lib/coinos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ArrowDownLeft,
  Copy,
  Check,
  Loader2,
  Zap,
  AtSign,
} from "lucide-react";

interface ReceiveSectionProps {
  lnAddress: string;
  satsToUsd: (n: number) => string | null;
  onError: (msg: string) => void;
}

export default function ReceiveSection({
  lnAddress,
  satsToUsd,
  onError,
}: ReceiveSectionProps) {
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [invoiceType, setInvoiceType] = useState("lightning");
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  async function handleCreate() {
    const sats = parseInt(amount);
    if (!sats) return;
    setLoading(true);
    setInvoice("");
    try {
      const inv = await coinos.createInvoice({
        amount: sats,
        memo: memo || undefined,
        type: invoiceType,
      });
      setInvoice(inv.hash || inv.bolt11 || inv.text || "");
    } catch (err: any) {
      onError(err.message);
    }
    setLoading(false);
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h2 className="text-lg font-bold">Receive</h2>
        <p className="text-sm text-muted-foreground">
          Create a payment request or share your Lightning address.
        </p>
      </div>

      {/* Lightning address card */}
      {lnAddress && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AtSign className="size-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Your Lightning Address</p>
                <p className="text-sm font-mono font-semibold">{lnAddress}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyText(lnAddress, "ln-addr")}
              className="gap-1.5 shrink-0"
            >
              {copied === "ln-addr" ? (
                <Check className="size-3.5 text-emerald-500" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copied === "ln-addr" ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      {/* Create invoice */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="recv-amount">Amount (sats)</Label>
          <Input
            id="recv-amount"
            type="number"
            placeholder="21000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-11"
          />
          {amount && satsToUsd(parseInt(amount)) && (
            <p className="text-xs text-muted-foreground">
              ≈ {satsToUsd(parseInt(amount))}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recv-memo">Memo (optional)</Label>
          <Input
            id="recv-memo"
            placeholder="Payment for..."
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="h-11"
          />
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
      </div>

      <Button
        onClick={handleCreate}
        disabled={!amount || loading}
        className="w-full gap-2 h-11"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Zap className="size-4" />
        )}
        Create Invoice
      </Button>

      {/* Invoice result */}
      {invoice && (
        <div className="rounded-xl border border-border/30 p-5 space-y-4">
          <div className="flex justify-center">
            <div className="rounded-xl bg-white p-3">
              <QRCodeSVG value={invoice} size={200} />
            </div>
          </div>
          <div className="rounded-md bg-muted/60 p-3">
            <p className="break-all font-mono text-xs leading-relaxed text-muted-foreground">
              {invoice}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => copyText(invoice, "invoice")}
            className="w-full gap-2"
          >
            {copied === "invoice" ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copied === "invoice" ? "Copied!" : "Copy Invoice"}
          </Button>
        </div>
      )}
    </div>
  );
}
