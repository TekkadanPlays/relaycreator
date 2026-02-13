import { useState, useEffect } from "react";
import { coinos, type CoinosUser, type CoinosCredits, type NodeInfo } from "../../lib/coinos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  Shield,
  Zap,
  Bitcoin,
  Loader2,
  Check,
  Server,
  CreditCard,
  Globe,
  Bell,
} from "lucide-react";

interface SettingsSectionProps {
  coinosUser: CoinosUser;
  onUserUpdate: (user: CoinosUser) => void;
  onError: (msg: string) => void;
}

export default function SettingsSection({ coinosUser, onUserUpdate, onError }: SettingsSectionProps) {
  const [credits, setCredits] = useState<CoinosCredits | null>(null);
  const [nodeInfo, setNodeInfo] = useState<NodeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable fields
  const [currency, setCurrency] = useState(coinosUser.currency || "USD");
  const [autowithdraw, setAutowithdraw] = useState(coinosUser.autowithdraw || false);
  const [destination, setDestination] = useState(coinosUser.destination || "");
  const [threshold, setThreshold] = useState(String(coinosUser.threshold || ""));
  const [reserve, setReserve] = useState(String(coinosUser.reserve || ""));
  const [notify, setNotify] = useState(coinosUser.notify ?? true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const [c, n] = await Promise.allSettled([
        coinos.credits(),
        coinos.info(),
      ]);
      if (c.status === "fulfilled") setCredits(c.value);
      if (n.status === "fulfilled") setNodeInfo(n.value);
    } catch {}
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const result = await coinos.updateUser({
        currency,
        autowithdraw,
        destination: destination || undefined,
        threshold: threshold ? parseInt(threshold) : undefined,
        reserve: reserve ? parseInt(reserve) : undefined,
        notify,
      });
      if (result.user) onUserUpdate(result.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) { onError(err.message); }
    setSaving(false);
  }

  function formatSats(n: number) {
    return new Intl.NumberFormat().format(n);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Wallet preferences, auto-withdraw, notifications, and node information.
        </p>
      </div>

      {/* Preferences */}
      <div className="rounded-lg border border-border/30 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Preferences</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pref-currency">Display Currency</Label>
            <Input id="pref-currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="USD" className="h-10" />
            <p className="text-[11px] text-muted-foreground">Fiat currency for balance display</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Notifications</p>
            <p className="text-[11px] text-muted-foreground">Receive payment notifications</p>
          </div>
          <Switch checked={notify} onCheckedChange={setNotify} />
        </div>
      </div>

      {/* Auto-withdraw */}
      <div className="rounded-lg border border-border/30 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Auto-Withdraw</h3>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable auto-withdraw</p>
            <p className="text-[11px] text-muted-foreground">Automatically withdraw to an external wallet when balance exceeds threshold</p>
          </div>
          <Switch checked={autowithdraw} onCheckedChange={setAutowithdraw} />
        </div>

        {autowithdraw && (
          <div className="grid gap-3 sm:grid-cols-2 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="aw-dest">Destination (Lightning address or invoice)</Label>
              <Input id="aw-dest" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="you@wallet.com" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aw-threshold">Threshold (sats)</Label>
              <Input id="aw-threshold" type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="100000" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aw-reserve">Reserve (sats to keep)</Label>
              <Input id="aw-reserve" type="number" value={reserve} onChange={(e) => setReserve(e.target.value)} placeholder="10000" className="h-10" />
            </div>
          </div>
        )}
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : <Settings className="size-4" />}
        {saved ? "Saved!" : "Save Settings"}
      </Button>

      {/* Security */}
      <div className="rounded-lg border border-border/30 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-emerald-500" />
          <h3 className="text-sm font-semibold">Security</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Two-Factor Auth</p>
            <p className="font-semibold">{coinosUser.twofa ? "Enabled" : "Disabled"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">PIN Protection</p>
            <p className="font-semibold">{coinosUser.haspin ? "Enabled" : "Disabled"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Email</p>
            <p className="font-semibold">{coinosUser.email || "Not set"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Verified</p>
            <p className="font-semibold">{coinosUser.verified ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>

      {/* Fee Credits */}
      {credits && (
        <div className="rounded-lg border border-border/30 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-blue-500" />
            <h3 className="text-sm font-semibold">Fee Credits</h3>
          </div>
          <p className="text-[11px] text-muted-foreground">Free transaction credits remaining per network.</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-md bg-amber-500/10 p-3 text-center">
              <Bitcoin className="size-4 text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-bold tabular-nums">{credits.bitcoin}</p>
              <p className="text-[10px] text-muted-foreground">Bitcoin</p>
            </div>
            <div className="rounded-md bg-purple-500/10 p-3 text-center">
              <Zap className="size-4 text-purple-500 mx-auto mb-1" />
              <p className="text-lg font-bold tabular-nums">{credits.lightning}</p>
              <p className="text-[10px] text-muted-foreground">Lightning</p>
            </div>
            <div className="rounded-md bg-blue-500/10 p-3 text-center">
              <Zap className="size-4 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold tabular-nums">{credits.liquid}</p>
              <p className="text-[10px] text-muted-foreground">Liquid</p>
            </div>
          </div>
        </div>
      )}

      {/* Node Info */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : nodeInfo && (
        <div className="rounded-lg border border-border/30 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Server className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Lightning Node</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {nodeInfo.alias && (
              <div>
                <p className="text-muted-foreground text-xs">Alias</p>
                <p className="font-semibold">{nodeInfo.alias}</p>
              </div>
            )}
            {nodeInfo.block_height && (
              <div>
                <p className="text-muted-foreground text-xs">Block Height</p>
                <p className="font-semibold tabular-nums">{formatSats(nodeInfo.block_height)}</p>
              </div>
            )}
            {nodeInfo.network && (
              <div>
                <p className="text-muted-foreground text-xs">Network</p>
                <p className="font-semibold capitalize">{nodeInfo.network}</p>
              </div>
            )}
            {nodeInfo.pubkey && (
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Node Pubkey</p>
                <p className="font-mono text-xs break-all">{nodeInfo.pubkey}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
