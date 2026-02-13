import { useState } from "react";
import { coinos, type CoinosPayment, type CoinosUserPublic } from "../../lib/coinos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Vault,
  Search,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Check,
  Plus,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FundsSectionProps {
  onError: (msg: string) => void;
  formatSats: (n: number) => string;
  satsToUsd: (n: number) => string | null;
}

interface FundData {
  amount: number;
  authorization?: any;
  payments: CoinosPayment[];
}

export default function FundsSection({ onError, formatSats, satsToUsd }: FundsSectionProps) {
  const [fundId, setFundId] = useState("");
  const [fund, setFund] = useState<FundData | null>(null);
  const [managers, setManagers] = useState<CoinosUserPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"lookup" | "manage">("lookup");

  // Authorize
  const [authAmount, setAuthAmount] = useState("");
  const [authCurrency, setAuthCurrency] = useState("USD");
  const [authSats, setAuthSats] = useState("");
  const [authorizing, setAuthorizing] = useState(false);

  // Withdraw
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState("");

  // Add manager
  const [newManager, setNewManager] = useState("");
  const [addingManager, setAddingManager] = useState(false);

  async function handleLookup() {
    if (!fundId.trim()) return;
    setLoading(true);
    setFund(null);
    setManagers([]);
    try {
      const [f, m] = await Promise.allSettled([
        coinos.getFund(fundId.trim()),
        coinos.getFundManagers(fundId.trim()),
      ]);
      if (f.status === "fulfilled") setFund(f.value);
      else onError("Fund not found");
      if (m.status === "fulfilled") setManagers(Array.isArray(m.value) ? m.value : []);
    } catch (err: any) { onError(err.message); }
    setLoading(false);
  }

  async function handleAuthorize() {
    if (!fundId.trim()) return;
    setAuthorizing(true);
    try {
      await coinos.authorizeFund({
        id: fundId.trim(),
        fiat: parseFloat(authAmount) || 0,
        currency: authCurrency,
        amount: parseInt(authSats) || 0,
      });
      setAuthAmount("");
      setAuthSats("");
      await handleLookup();
    } catch (err: any) { onError(err.message); }
    setAuthorizing(false);
  }

  async function handleWithdraw() {
    if (!fundId.trim() || !withdrawAmount) return;
    setWithdrawing(true);
    setWithdrawResult("");
    try {
      await coinos.takeFromFund({
        id: fundId.trim(),
        amount: parseInt(withdrawAmount),
      });
      setWithdrawResult("Withdrawal successful!");
      setWithdrawAmount("");
      await handleLookup();
    } catch (err: any) { onError(err.message); }
    setWithdrawing(false);
  }

  async function handleAddManager() {
    if (!fundId.trim() || !newManager.trim()) return;
    setAddingManager(true);
    try {
      const result = await coinos.addFundManager({ id: fundId.trim(), username: newManager.trim() });
      if (Array.isArray(result)) setManagers(result);
      setNewManager("");
    } catch (err: any) { onError(err.message); }
    setAddingManager(false);
  }

  async function handleRemoveManager(managerId: string) {
    if (!fundId.trim()) return;
    try {
      const result = await coinos.removeFundManager(fundId.trim(), managerId);
      if (Array.isArray(result)) setManagers(result);
      else setManagers((prev) => prev.filter((m) => m.id !== managerId));
    } catch (err: any) { onError(err.message); }
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Funds</h2>
        <p className="text-sm text-muted-foreground">
          Shared wallets with multiple managers. Authorize spending limits and withdraw funds.
        </p>
      </div>

      {/* Lookup */}
      <div className="flex gap-2 max-w-lg">
        <Input
          placeholder="Fund ID or name..."
          value={fundId}
          onChange={(e) => setFundId(e.target.value)}
          className="h-10"
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
        />
        <Button onClick={handleLookup} disabled={!fundId.trim() || loading} size="sm" className="gap-1.5 h-10 px-4 shrink-0">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
          Load
        </Button>
      </div>

      {fund && (
        <>
          {/* Fund overview */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2"><Vault className="size-5 text-primary" /></div>
                <div>
                  <p className="text-sm font-semibold">Fund: {fundId}</p>
                  <p className="text-xs text-muted-foreground">{managers.length} manager{managers.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold tabular-nums">{formatSats(fund.amount)} sats</p>
                {satsToUsd(fund.amount) && <p className="text-xs text-muted-foreground">{satsToUsd(fund.amount)}</p>}
              </div>
            </div>
            {fund.authorization && (
              <div className="mt-3 pt-3 border-t border-primary/20 flex items-center gap-2 text-xs">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                <span className="text-muted-foreground">Authorized:</span>
                <span className="font-semibold">{formatSats(fund.authorization.amount || 0)} sats</span>
              </div>
            )}
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-1">
            {[
              { id: "lookup" as const, label: "Actions" },
              { id: "manage" as const, label: "Managers" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "lookup" && (
            <div className="space-y-5">
              {/* Authorize */}
              <div className="rounded-lg border border-border/30 p-4 space-y-3">
                <p className="text-sm font-semibold">Authorize Spending</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Fiat Amount</Label>
                    <Input type="number" value={authAmount} onChange={(e) => setAuthAmount(e.target.value)} placeholder="100" className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Currency</Label>
                    <Input value={authCurrency} onChange={(e) => setAuthCurrency(e.target.value.toUpperCase())} placeholder="USD" className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sats Amount</Label>
                    <Input type="number" value={authSats} onChange={(e) => setAuthSats(e.target.value)} placeholder="100000" className="h-10" />
                  </div>
                </div>
                <Button onClick={handleAuthorize} disabled={authorizing} size="sm" className="gap-1.5">
                  {authorizing ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
                  Authorize
                </Button>
              </div>

              {/* Withdraw */}
              <div className="rounded-lg border border-border/30 p-4 space-y-3">
                <p className="text-sm font-semibold">Withdraw</p>
                <div className="flex gap-2">
                  <Input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Amount in sats" className="h-10" />
                  <Button onClick={handleWithdraw} disabled={!withdrawAmount || withdrawing} size="sm" className="gap-1.5 h-10 shrink-0">
                    {withdrawing ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUpRight className="size-3.5" />}
                    Withdraw
                  </Button>
                </div>
                {withdrawResult && (
                  <div className="flex items-center gap-2 text-sm text-emerald-500">
                    <Check className="size-3.5" /> {withdrawResult}
                  </div>
                )}
              </div>

              {/* Fund payments */}
              {fund.payments && fund.payments.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Recent Fund Transactions</p>
                  <div className="space-y-1">
                    {fund.payments.slice(0, 10).map((p, i) => (
                      <div key={p.id || i} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/30 transition-colors">
                        {p.amount > 0 ? (
                          <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/10 shrink-0">
                            <ArrowDownLeft className="size-3 text-emerald-500" />
                          </div>
                        ) : (
                          <div className="flex size-7 items-center justify-center rounded-full bg-orange-500/10 shrink-0">
                            <ArrowUpRight className="size-3 text-orange-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{p.memo || (p.amount > 0 ? "Deposit" : "Withdrawal")}</p>
                          <p className="text-[11px] text-muted-foreground">{formatDate(p.created)}</p>
                        </div>
                        <p className={cn("text-xs font-mono font-semibold tabular-nums", p.amount > 0 ? "text-emerald-500" : "text-orange-500")}>
                          {p.amount > 0 ? "+" : "-"}{formatSats(Math.abs(p.amount))}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "manage" && (
            <div className="space-y-4">
              {managers.length > 0 ? (
                <div className="space-y-1">
                  {managers.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/30 transition-colors">
                      <div className="flex size-8 items-center justify-center rounded-full bg-blue-500/10 shrink-0">
                        <Users className="size-3.5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.username}</p>
                        {m.pubkey && <p className="text-[11px] text-muted-foreground font-mono truncate">{m.pubkey.slice(0, 20)}...</p>}
                      </div>
                      <button
                        onClick={() => handleRemoveManager(m.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remove manager"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No managers found.</p>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Username to add..."
                  value={newManager}
                  onChange={(e) => setNewManager(e.target.value)}
                  className="h-10"
                  onKeyDown={(e) => e.key === "Enter" && handleAddManager()}
                />
                <Button onClick={handleAddManager} disabled={!newManager.trim() || addingManager} size="sm" className="gap-1.5 h-10 px-4 shrink-0">
                  {addingManager ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  Add
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {!fund && !loading && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="size-12 rounded-xl bg-muted flex items-center justify-center mb-4">
            <Vault className="size-6 text-muted-foreground/40" />
          </div>
          <p className="font-medium">Look up a fund</p>
          <p className="text-sm text-muted-foreground mt-1">
            Enter a fund ID or name above to view its balance, managers, and transactions.
          </p>
        </div>
      )}
    </div>
  );
}
