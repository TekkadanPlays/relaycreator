import { useState } from "react";
import { coinos, type CoinosAccount, type CoinosUser } from "../../lib/coinos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Wallet as WalletIcon,
  Layers,
  Plus,
  Trash2,
} from "lucide-react";

interface AccountsSectionProps {
  coinosUser: CoinosUser;
  accounts: CoinosAccount[];
  formatSats: (n: number) => string;
  satsToUsd: (n: number) => string | null;
  onError: (msg: string) => void;
  onAccountsChange: (accounts: CoinosAccount[]) => void;
}

export default function AccountsSection({
  coinosUser,
  accounts,
  formatSats,
  satsToUsd,
  onError,
  onAccountsChange,
}: AccountsSectionProps) {
  const [newName, setNewName] = useState("");

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const acc = await coinos.createAccount({ name: newName.trim() });
      onAccountsChange([...accounts, acc]);
      setNewName("");
    } catch (err: any) {
      onError(err.message);
    }
  }

  async function handleDelete(id: string) {
    try {
      await coinos.deleteAccount(id);
      onAccountsChange(accounts.filter((a) => a.id !== id));
    } catch (err: any) {
      onError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Accounts</h2>
        <p className="text-sm text-muted-foreground">
          Sub-wallets for organizing your funds. Each account has its own balance.
        </p>
      </div>

      {/* Main account */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <WalletIcon className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Main Account</p>
            <p className="text-xs text-muted-foreground">Primary wallet</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold tabular-nums">
            {formatSats(coinosUser.balance)} sats
          </p>
          {satsToUsd(coinosUser.balance) && (
            <p className="text-[11px] text-muted-foreground">
              {satsToUsd(coinosUser.balance)}
            </p>
          )}
        </div>
      </div>

      {/* Sub-accounts */}
      {accounts.map((acc) => (
        <div
          key={acc.id}
          className="rounded-xl border border-border/30 p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Layers className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">{acc.name}</p>
              <p className="text-xs text-muted-foreground">
                {acc.type || "Sub-account"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums">
                {formatSats(acc.balance || 0)} sats
              </p>
              {acc.balance && satsToUsd(acc.balance) && (
                <p className="text-[11px] text-muted-foreground">
                  {satsToUsd(acc.balance)}
                </p>
              )}
            </div>
            <button
              onClick={() => handleDelete(acc.id)}
              className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete account"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      ))}

      {/* Create account */}
      <div className="flex gap-2">
        <Input
          placeholder="New account name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="h-10"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <Button
          onClick={handleCreate}
          disabled={!newName.trim()}
          size="sm"
          className="gap-1.5 h-10 px-4 shrink-0"
        >
          <Plus className="size-3.5" /> Create
        </Button>
      </div>
    </div>
  );
}
