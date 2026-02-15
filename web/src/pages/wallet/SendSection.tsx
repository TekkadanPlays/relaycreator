import { useState } from "react";
import { coinos, type CoinosContact } from "../../lib/coinos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  Zap,
  Loader2,
  Check,
} from "lucide-react";

interface SendSectionProps {
  contacts: CoinosContact[];
  initialAddress?: string;
  satsToUsd: (n: number) => string | null;
  onError: (msg: string) => void;
  onSuccess: () => void;
}

function sendTypeHint(addr: string): string | null {
  if (!addr) return null;
  if (addr.startsWith("lnbc") || addr.startsWith("lntb")) return "Lightning invoice detected";
  if (addr.includes("@")) return "Lightning address detected";
  if (addr.startsWith("bc1") || addr.startsWith("1") || addr.startsWith("3")) return "On-chain address detected";
  return null;
}

export default function SendSection({
  contacts,
  initialAddress = "",
  satsToUsd,
  onError,
  onSuccess,
}: SendSectionProps) {
  const [address, setAddress] = useState(initialAddress);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  async function handleSend() {
    if (!address || !amount) return;
    setLoading(true);
    setResult("");
    try {
      const sats = parseInt(amount);
      if (address.startsWith("lnbc") || address.startsWith("lntb")) {
        await coinos.sendPayment({ payreq: address, amount: sats });
      } else if (address.includes("@")) {
        await coinos.sendToLnAddress(address, sats);
      } else {
        await coinos.sendInternal({ username: address, amount: sats });
      }
      setResult("Payment sent successfully!");
      setAddress("");
      setAmount("");
      onSuccess();
    } catch (err: any) {
      onError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h2 className="text-lg font-bold">Send</h2>
        <p className="text-sm text-muted-foreground">
          Pay a Lightning invoice, Lightning address, or send to a CoinOS user.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="send-address">Recipient</Label>
          <Input
            id="send-address"
            placeholder="lnbc..., user@domain.com, or username"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-11"
          />
          {sendTypeHint(address) && (
            <p className="text-xs text-primary/70 flex items-center gap-1">
              <Zap className="size-3" /> {sendTypeHint(address)}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="send-amount">Amount (sats)</Label>
          <Input
            id="send-amount"
            type="number"
            placeholder="1000"
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
      </div>

      <Button
        onClick={handleSend}
        disabled={!address || !amount || loading}
        className="w-full gap-2 h-11"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ArrowUpRight className="size-4" />
        )}
        Send Payment
      </Button>

      {result && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          <Check className="size-4" /> {result}
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
                onClick={() => setAddress(c.username)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                  address === c.username
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Avatar className="size-4">
                  {c.picture && <AvatarImage src={c.picture} />}
                  <AvatarFallback className="text-[8px]">
                    {c.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {c.username}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
