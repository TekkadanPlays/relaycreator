import { type CoinosUser, type CoinosPayment, type CoinosContact } from "../../lib/coinos";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Send,
  Clock,
  Layers,
  Users,
} from "lucide-react";

interface OverviewSectionProps {
  coinosUser: CoinosUser;
  payments: CoinosPayment[];
  contacts: CoinosContact[];
  incoming: number;
  outgoing: number;
  btcRate: number | null;
  formatSats: (n: number) => string;
  satsToUsd: (n: number) => string | null;
  formatDate: (ts: number) => string;
  paymentTypeLabel: (p: CoinosPayment) => string;
  onNavigate: (section: string) => void;
  onSendTo: (username: string) => void;
}

export default function OverviewSection({
  coinosUser,
  payments,
  contacts,
  incoming,
  outgoing,
  btcRate,
  formatSats,
  satsToUsd,
  formatDate,
  paymentTypeLabel,
  onNavigate,
  onSendTo,
}: OverviewSectionProps) {
  return (
    <div className="space-y-6">
      {/* Balance card */}
      <div className="rounded-xl border border-border/30 bg-gradient-to-br from-card to-card/80 p-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Total Balance
        </p>
        <div className="flex items-baseline gap-3 mt-1">
          <p className="text-4xl font-extrabold tabular-nums tracking-tight">
            {formatSats(coinosUser.balance)}
          </p>
          <span className="text-lg text-muted-foreground font-medium">sats</span>
        </div>
        {satsToUsd(coinosUser.balance) && (
          <p className="text-sm text-muted-foreground mt-1">
            ≈ {satsToUsd(coinosUser.balance)}
          </p>
        )}

        <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-border/20">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-emerald-500/10 p-1.5">
              <TrendingUp className="size-3.5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold tabular-nums text-emerald-500">
                +{formatSats(incoming)}
              </p>
              <p className="text-[11px] text-muted-foreground">Received</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-orange-500/10 p-1.5">
              <TrendingDown className="size-3.5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold tabular-nums text-orange-500">
                -{formatSats(outgoing)}
              </p>
              <p className="text-[11px] text-muted-foreground">Sent</p>
            </div>
          </div>
          {btcRate && (
            <div className="ml-auto text-right">
              <p className="text-sm font-semibold tabular-nums">
                ${btcRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[11px] text-muted-foreground">BTC/USD</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Receive", icon: ArrowDownLeft, sec: "receive", color: "text-emerald-500 bg-emerald-500/10" },
          { label: "Send", icon: Send, sec: "send", color: "text-blue-500 bg-blue-500/10" },
          { label: "History", icon: Clock, sec: "history", color: "text-amber-500 bg-amber-500/10" },
          { label: "Accounts", icon: Layers, sec: "accounts", color: "text-purple-500 bg-purple-500/10" },
        ].map(({ label, icon: Icon, sec, color }) => (
          <button
            key={sec}
            onClick={() => onNavigate(sec)}
            className="flex flex-col items-center gap-2 rounded-xl border border-border/30 p-4 hover:bg-accent/30 transition-all hover:scale-[1.02]"
          >
            <div className={cn("rounded-lg p-2", color)}>
              <Icon className="size-5" />
            </div>
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Recent contacts */}
      {contacts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Users className="size-3.5 text-muted-foreground" />
              Recent Contacts
            </h3>
            <button
              onClick={() => onNavigate("contacts")}
              className="text-xs text-primary hover:underline"
            >
              View all
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {contacts.slice(0, 8).map((c) => (
              <button
                key={c.id}
                onClick={() => onSendTo(c.username)}
                className="flex flex-col items-center gap-1.5 shrink-0 w-16 group"
                title={`Send to ${c.username}`}
              >
                <Avatar className="size-10 ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                  {c.picture && <AvatarImage src={c.picture} alt={c.username} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {c.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] text-muted-foreground truncate w-full text-center group-hover:text-foreground transition-colors">
                  {c.username}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      {payments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Clock className="size-3.5 text-muted-foreground" />
              Recent Transactions
            </h3>
            <button
              onClick={() => onNavigate("history")}
              className="text-xs text-primary hover:underline"
            >
              View all
            </button>
          </div>
          <div className="space-y-0.5">
            {payments.slice(0, 5).map((p, i) => (
              <div
                key={p.id || i}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/30 transition-colors"
              >
                {p.amount > 0 ? (
                  <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10 shrink-0">
                    <ArrowDownLeft className="size-3.5 text-emerald-500" />
                  </div>
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-full bg-orange-500/10 shrink-0">
                    <ArrowUpRight className="size-3.5 text-orange-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{paymentTypeLabel(p)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(p.created)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={cn(
                      "text-sm font-mono font-semibold tabular-nums",
                      p.amount > 0 ? "text-emerald-500" : "text-orange-500"
                    )}
                  >
                    {p.amount > 0 ? "+" : "-"}
                    {formatSats(p.amount)}
                  </p>
                  {satsToUsd(p.amount) && (
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {satsToUsd(p.amount)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {payments.length === 0 && contacts.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No transactions yet. Use the quick actions above to get started.
          </p>
        </div>
      )}
    </div>
  );
}
