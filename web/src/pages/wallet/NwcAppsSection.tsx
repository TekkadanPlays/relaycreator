import { useState, useEffect } from "react";
import { coinos, type CoinosApp } from "../../lib/coinos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Radio,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  Zap,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NwcAppsSectionProps {
  onError: (msg: string) => void;
}

export default function NwcAppsSection({ onError }: NwcAppsSectionProps) {
  const [apps, setApps] = useState<CoinosApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMaxAmount, setNewMaxAmount] = useState("");
  const [newBudgetRenewal, setNewBudgetRenewal] = useState("monthly");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { loadApps(); }, []);

  async function loadApps() {
    setLoading(true);
    try {
      const list = await coinos.listApps();
      setApps(Array.isArray(list) ? list : []);
    } catch { setApps([]); }
    setLoading(false);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await coinos.updateApp({
        name: newName.trim(),
        max_amount: newMaxAmount ? parseInt(newMaxAmount) : undefined,
        budget_renewal: newBudgetRenewal,
      });
      setNewName("");
      setNewMaxAmount("");
      setShowCreate(false);
      await loadApps();
    } catch (err: any) { onError(err.message); }
    setCreating(false);
  }

  async function handleDelete(pubkey: string) {
    try {
      await coinos.deleteApp(pubkey);
      setApps((prev) => prev.filter((a) => a.pubkey !== pubkey));
    } catch (err: any) { onError(err.message); }
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function formatSats(n: number) {
    return new Intl.NumberFormat().format(n);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold">NWC Apps</h2>
          <p className="text-sm text-muted-foreground">
            Nostr Wallet Connect apps — grant external apps permission to make payments on your behalf with spending limits.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-1.5 shrink-0">
          <Plus className="size-3.5" /> New App
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-semibold">Create NWC App</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nwc-name">App Name</Label>
              <Input id="nwc-name" placeholder="My Nostr Client" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nwc-max">Spending Limit (sats)</Label>
              <Input id="nwc-max" type="number" placeholder="100000" value={newMaxAmount} onChange={(e) => setNewMaxAmount(e.target.value)} className="h-10" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Budget Renewal</Label>
            <div className="flex gap-2">
              {["daily", "weekly", "monthly", "yearly", "never"].map((r) => (
                <button
                  key={r}
                  onClick={() => setNewBudgetRenewal(r)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium border transition-colors capitalize",
                    newBudgetRenewal === r
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleCreate} disabled={!newName.trim() || creating} size="sm" className="gap-1.5">
              {creating ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Create
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {apps.length > 0 ? (
        <div className="space-y-2">
          {apps.map((app) => (
            <div key={app.pubkey} className="rounded-lg border border-border/30 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500/10 p-2">
                    <Radio className="size-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{app.name || "Unnamed App"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{app.pubkey.slice(0, 16)}...</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(app.pubkey)}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Delete app"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-4 text-xs">
                {app.max_amount !== undefined && (
                  <div className="flex items-center gap-1.5">
                    <Shield className="size-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Limit:</span>
                    <span className="font-semibold">{formatSats(app.max_amount)} sats</span>
                  </div>
                )}
                {app.spent !== undefined && (
                  <div className="flex items-center gap-1.5">
                    <Zap className="size-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Spent:</span>
                    <span className="font-semibold">{formatSats(app.spent)} sats</span>
                  </div>
                )}
                {app.budget_renewal && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Renewal:</span>
                    <span className="font-semibold capitalize">{app.budget_renewal}</span>
                  </div>
                )}
              </div>

              {app.nwc && (
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[10px] font-mono text-muted-foreground truncate bg-muted/60 rounded px-2 py-1">
                    {app.nwc}
                  </code>
                  <button
                    onClick={() => copyText(app.nwc!, app.pubkey)}
                    className="rounded-md p-1.5 hover:bg-accent/50 transition-colors shrink-0"
                  >
                    {copied === app.pubkey ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5 text-muted-foreground" />}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !showCreate ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="size-12 rounded-xl bg-muted flex items-center justify-center mb-4">
            <Radio className="size-6 text-muted-foreground/40" />
          </div>
          <p className="font-medium">No NWC apps</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create an app to let external Nostr clients make payments through your wallet.
          </p>
        </div>
      ) : null}
    </div>
  );
}
