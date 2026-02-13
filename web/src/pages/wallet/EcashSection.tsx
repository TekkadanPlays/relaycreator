import { useState } from "react";
import { coinos } from "../../lib/coinos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Coins,
  Download,
  Upload,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EcashSectionProps {
  onError: (msg: string) => void;
}

export default function EcashSection({ onError }: EcashSectionProps) {
  const [tab, setTab] = useState<"claim" | "mint" | "lookup">("claim");
  const [claimToken, setClaimToken] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimResult, setClaimResult] = useState("");

  const [mintAmount, setMintAmount] = useState("");
  const [mintLoading, setMintLoading] = useState(false);
  const [mintedToken, setMintedToken] = useState("");

  const [lookupId, setLookupId] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<{ token: string; status: any } | null>(null);

  const [copied, setCopied] = useState(false);

  async function handleClaim() {
    if (!claimToken.trim()) return;
    setClaimLoading(true);
    setClaimResult("");
    try {
      await coinos.claimEcash(claimToken.trim());
      setClaimResult("Ecash token claimed successfully!");
      setClaimToken("");
    } catch (err: any) {
      onError(err.message);
    }
    setClaimLoading(false);
  }

  async function handleMint() {
    const amt = parseInt(mintAmount);
    if (!amt || amt <= 0) return;
    setMintLoading(true);
    setMintedToken("");
    try {
      const result = await coinos.mintEcash(amt);
      setMintedToken(result.token || "");
      setMintAmount("");
    } catch (err: any) {
      onError(err.message);
    }
    setMintLoading(false);
  }

  async function handleLookup() {
    if (!lookupId.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const result = await coinos.getEcash(lookupId.trim());
      setLookupResult(result);
    } catch (err: any) {
      onError(err.message);
    }
    setLookupLoading(false);
  }

  function copyToken(token: string) {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const tabs = [
    { id: "claim" as const, label: "Claim", icon: Download },
    { id: "mint" as const, label: "Mint", icon: Upload },
    { id: "lookup" as const, label: "Lookup", icon: Eye },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Ecash</h2>
        <p className="text-sm text-muted-foreground">
          Cashu ecash tokens — bearer instruments for private, offline-capable payments.
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

      {tab === "claim" && (
        <div className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <Label htmlFor="ecash-token">Ecash Token</Label>
            <Input
              id="ecash-token"
              placeholder="cashuA..."
              value={claimToken}
              onChange={(e) => setClaimToken(e.target.value)}
              className="h-11 font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Paste a Cashu ecash token to redeem it into your balance.
            </p>
          </div>
          <Button onClick={handleClaim} disabled={!claimToken.trim() || claimLoading} className="w-full gap-2 h-11">
            {claimLoading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Claim Token
          </Button>
          {claimResult && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
              <Check className="size-4" /> {claimResult}
            </div>
          )}
        </div>
      )}

      {tab === "mint" && (
        <div className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <Label htmlFor="mint-amount">Amount (sats)</Label>
            <Input
              id="mint-amount"
              type="number"
              placeholder="1000"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              className="h-11"
            />
            <p className="text-[11px] text-muted-foreground">
              Mint ecash tokens from your balance. These can be shared offline.
            </p>
          </div>
          <Button onClick={handleMint} disabled={!mintAmount || mintLoading} className="w-full gap-2 h-11">
            {mintLoading ? <Loader2 className="size-4 animate-spin" /> : <Coins className="size-4" />}
            Mint Ecash
          </Button>
          {mintedToken && (
            <div className="rounded-lg border border-border/30 p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Your ecash token:</p>
              <div className="rounded-md bg-muted/60 p-3">
                <p className="break-all font-mono text-xs leading-relaxed text-muted-foreground">{mintedToken}</p>
              </div>
              <Button variant="outline" onClick={() => copyToken(mintedToken)} className="w-full gap-2">
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copied!" : "Copy Token"}
              </Button>
            </div>
          )}
        </div>
      )}

      {tab === "lookup" && (
        <div className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <Label htmlFor="ecash-id">Token ID</Label>
            <Input
              id="ecash-id"
              placeholder="Token ID..."
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              className="h-11"
            />
          </div>
          <Button onClick={handleLookup} disabled={!lookupId.trim() || lookupLoading} className="w-full gap-2 h-11">
            {lookupLoading ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
            Lookup Token
          </Button>
          {lookupResult && (
            <div className="rounded-lg border border-border/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <span className="text-xs font-semibold">
                  {lookupResult.status?.spent ? "Spent" : "Unspent"}
                </span>
              </div>
              {lookupResult.token && (
                <>
                  <div className="rounded-md bg-muted/60 p-3">
                    <p className="break-all font-mono text-xs leading-relaxed text-muted-foreground">
                      {lookupResult.token}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyToken(lookupResult.token)} className="gap-1.5">
                    {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                    Copy
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
