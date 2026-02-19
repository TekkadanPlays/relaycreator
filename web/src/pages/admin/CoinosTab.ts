import { createElement } from "inferno-create-element";
import { Card, CardContent } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { Badge } from "@/ui/Badge";
import { Input } from "@/ui/Input";
import { cn } from "@/ui/utils";
import {
  Lock, Zap, Bitcoin, RefreshCw, Cpu, Check, Copy, AlertTriangle,
  Info, ShieldCheck, Loader2, TrendingUp, CircleDollarSign, Activity,
  ArrowDownLeft, ArrowUpRight, Boxes, Vault, Settings, ChevronDown,
  Search, Trash2,
} from "@/lib/icons";
import { formatSats, timeAgo, renderLoading, RATE_CURRENCIES } from "./helpers";
import type {
  CoinosStatus, NodeInfoData, CoinosPaymentsResponse, CoinosCreditsData,
  CoinosPaymentItem, AdminInvoiceItem, FundManagerItem, PermissionTypeInfo,
} from "./types";
import type { User } from "../../stores/auth";

// ─── Permission Gate ─────────────────────────────────────────────────────────

export function renderCoinosGate(
  user: User | null,
  coinosHasGrant: boolean,
  coinosHasPermission: boolean,
  coinosDisclaimerAccepting: boolean,
  coinosDisclaimer: string,
  onAcceptDisclaimer: () => void,
) {
  // No permission at all
  if (!user?.admin && !coinosHasGrant) {
    return createElement("div", { className: "flex flex-col items-center justify-center py-24 text-center" },
      createElement(Lock, { className: "size-10 text-muted-foreground/30 mb-4" }),
      createElement("h2", { className: "text-xl font-bold" }, "CoinOS Access Required"),
      createElement("p", { className: "mt-1 text-sm text-muted-foreground max-w-md" },
        "CoinOS admin access requires explicit permission. Contact a platform administrator to request access.",
      ),
    );
  }

  // Disclaimer gate
  if (!coinosHasPermission && (coinosHasGrant || user?.admin)) {
    return createElement("div", { className: "max-w-lg mx-auto py-12 space-y-6" },
      createElement("div", { className: "flex flex-col items-center text-center space-y-3" },
        createElement("div", { className: "size-14 rounded-xl bg-amber-500/10 flex items-center justify-center" },
          createElement(AlertTriangle, { className: "size-7 text-amber-400" }),
        ),
        createElement("h2", { className: "text-xl font-bold" }, "CoinOS Admin Access"),
        createElement("p", { className: "text-sm text-muted-foreground" },
          "You must read and accept the following disclaimer before accessing the CoinOS backend.",
        ),
      ),
      createElement(Card, { className: "border-amber-500/30 bg-amber-500/5" },
        createElement(CardContent, { className: "p-5" },
          createElement("div", { className: "flex items-start gap-3" },
            createElement(Info, { className: "size-4 text-amber-400 shrink-0 mt-0.5" }),
            createElement("p", { className: "text-sm leading-relaxed" }, coinosDisclaimer),
          ),
        ),
      ),
      createElement("div", { className: "flex flex-col items-center gap-3" },
        createElement(Button, {
          className: "gap-2 w-full max-w-xs",
          onClick: onAcceptDisclaimer,
          disabled: coinosDisclaimerAccepting,
        },
          coinosDisclaimerAccepting
            ? createElement(Loader2, { className: "size-4 animate-spin" })
            : createElement(ShieldCheck, { className: "size-4" }),
          "I Understand & Accept",
        ),
        createElement("p", { className: "text-[10px] text-muted-foreground text-center max-w-xs" },
          "By clicking above, you accept full responsibility for actions taken within the CoinOS admin interface.",
        ),
      ),
    );
  }

  return null; // Has permission — caller should render dashboard
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function renderCoinosDashboard(
  coinosStatus: CoinosStatus | null,
  coinosStatusLoading: boolean,
  coinosInfo: NodeInfoData | null,
  coinosRates: Record<string, number> | null,
  coinosPayments: CoinosPaymentsResponse | null,
  coinosCredits: CoinosCreditsData | null,
  showAllRates: boolean,
  showDiagnostics: boolean,
  copiedPubkey: boolean,
  onRefresh: () => void,
  onToggleAllRates: () => void,
  onToggleDiagnostics: () => void,
  onCopyPubkey: () => void,
  fundsEl: any,
  invoicesEl: any,
) {
  const isHealthy = coinosStatus?.healthy ?? false;
  const nodePubkey = coinosInfo?.identity_pubkey || coinosInfo?.pubkey || "";
  const nodeVersion = coinosInfo?.version || "";
  const btcImpl = coinosStatus?.bitcoin_implementation || "";
  const isKnots = btcImpl.toLowerCase().includes("knots") || nodeVersion.toLowerCase().includes("knots");
  const isPruned = coinosStatus?.bitcoin_pruned ?? false;
  const nodeNetwork = coinosInfo?.chains?.[0]?.network || (coinosInfo as any)?.network || "mainnet";
  const payments = coinosPayments?.payments || [];
  const totalPayments = coinosPayments?.count ?? 0;

  return createElement("div", { className: "space-y-4" },
    // Header + status
    createElement("div", { className: "flex items-center justify-between" },
      createElement("h2", { className: "text-lg font-semibold flex items-center gap-2" },
        createElement(Bitcoin, { className: "size-5 text-amber-400" }),
        "CoinOS Backend",
      ),
      createElement("div", { className: "flex items-center gap-2" },
        createElement("button", {
          className: "inline-flex items-center justify-center size-7 rounded-md hover:bg-accent transition-colors cursor-pointer",
          onClick: onRefresh,
        }, createElement(RefreshCw, { className: "size-3.5" })),
        createElement(Badge, {
          variant: isHealthy ? "default" : "destructive",
          className: cn("text-xs gap-1", isHealthy && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"),
        },
          createElement("span", { className: cn("size-1.5 rounded-full", isHealthy ? "bg-emerald-400 animate-pulse" : "bg-destructive") }),
          coinosStatusLoading ? "..." : isHealthy ? "Healthy" : "Down",
        ),
      ),
    ),

    // Node identity bar
    createElement(Card, { className: "border-border/50" },
      createElement(CardContent, { className: "p-3" },
        createElement("div", { className: "flex items-center gap-3" },
          createElement("div", { className: "size-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0" },
            createElement(Zap, { className: "size-4 text-amber-400" }),
          ),
          createElement("div", { className: "min-w-0 flex-1" },
            createElement("div", { className: "flex items-center gap-2 flex-wrap" },
              createElement("span", { className: "font-bold text-sm" }, coinosInfo?.alias || "Lightning Node"),
              btcImpl ? createElement(Badge, { variant: "outline", className: cn("text-[9px] px-1.5 py-0", isKnots ? "border-orange-500/30 text-orange-400 bg-orange-500/5" : "") },
                createElement(Bitcoin, { className: "size-2.5 mr-0.5" }), btcImpl,
              ) : null,
              isPruned ? createElement(Badge, { variant: "outline", className: "text-[9px] px-1.5 py-0 border-purple-500/30 text-purple-400" }, "Pruned") : null,
              nodeVersion ? createElement(Badge, { variant: "outline", className: "text-[9px] px-1.5 py-0" },
                createElement(Cpu, { className: "size-2.5 mr-0.5" }), "LND " + nodeVersion,
              ) : null,
              createElement(Badge, { variant: "outline", className: "text-[9px] px-1.5 py-0 capitalize" }, nodeNetwork),
            ),
            nodePubkey ? createElement("div", { className: "flex items-center gap-1.5 mt-1" },
              createElement("code", { className: "text-[10px] font-mono text-muted-foreground truncate" }, nodePubkey),
              createElement("button", { onClick: onCopyPubkey, className: "shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" },
                copiedPubkey ? createElement(Check, { className: "size-3 text-emerald-400" }) : createElement(Copy, { className: "size-3" }),
              ),
            ) : null,
          ),
        ),
      ),
    ),

    // Stats strip
    createElement("div", { className: "grid grid-cols-4 gap-px rounded-lg border border-border/50 overflow-hidden bg-border/50" },
      ...[
        { label: "Block", value: coinosInfo?.block_height?.toLocaleString() ?? "---", sub: coinosInfo?.synced_to_chain !== false ? "synced" : "syncing" },
        { label: "Channels", value: String(coinosInfo?.num_active_channels ?? 0), sub: `${coinosInfo?.num_peers ?? 0} peers` },
        { label: "Payments", value: totalPayments.toLocaleString(), sub: "total" },
        { label: "Failures", value: String(coinosStatus?.consecutiveFailures ?? 0), sub: coinosStatus?.consecutiveFailures === 0 ? "none" : "consecutive" },
      ].map(({ label, value, sub }) =>
        createElement("div", { key: label, className: "bg-background p-3 text-center" },
          createElement("p", { className: "text-[10px] text-muted-foreground uppercase tracking-wider" }, label),
          createElement("p", { className: "text-lg font-bold font-mono tabular-nums mt-0.5" }, value),
          createElement("p", { className: "text-[10px] text-muted-foreground" }, sub),
        ),
      ),
    ),

    // Rates + Credits
    createElement("div", { className: "grid gap-3 lg:grid-cols-3" },
      // Exchange Rates
      createElement(Card, { className: "border-border/50 lg:col-span-2" },
        createElement(CardContent, { className: "p-0" },
          createElement("div", { className: "flex items-center justify-between px-4 pt-3 pb-2" },
            createElement("span", { className: "text-xs font-semibold flex items-center gap-1.5" },
              createElement(TrendingUp, { className: "size-3 text-muted-foreground" }), "Exchange Rates",
            ),
            createElement("button", {
              className: "text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
              onClick: onToggleAllRates,
            }, showAllRates ? "less" : "all"),
          ),
          coinosRates
            ? createElement("div", { className: "grid gap-px grid-cols-3 sm:grid-cols-5 bg-border/30 mx-3 mb-3 rounded-md overflow-hidden" },
                ...(showAllRates ? Object.keys(coinosRates).sort() : (RATE_CURRENCIES as readonly string[]).filter((c) => coinosRates[c]))
                  .map((currency) => {
                    const rate = coinosRates[currency];
                    if (!rate) return null;
                    const isUSD = currency === "USD";
                    return createElement("div", { key: currency, className: cn("bg-background px-2.5 py-2", isUSD && "bg-amber-500/5") },
                      createElement("p", { className: "text-[10px] text-muted-foreground" }, currency),
                      createElement("p", { className: cn("text-xs font-bold font-mono tabular-nums", isUSD && "text-amber-400") },
                        rate >= 1 ? rate.toLocaleString(undefined, { maximumFractionDigits: 0 }) : rate.toFixed(6),
                      ),
                    );
                  }).filter(Boolean),
              )
            : createElement("p", { className: "text-xs text-muted-foreground text-center py-4 px-3" }, "Unable to fetch rates"),
        ),
      ),

      // Fee Credits
      createElement(Card, { className: "border-border/50" },
        createElement(CardContent, { className: "p-0" },
          createElement("div", { className: "px-4 pt-3 pb-2" },
            createElement("span", { className: "text-xs font-semibold flex items-center gap-1.5" },
              createElement(CircleDollarSign, { className: "size-3 text-muted-foreground" }), "Fee Credits",
            ),
          ),
          createElement("div", { className: "px-3 pb-3 space-y-1" },
            coinosCredits
              ? [
                  { label: "Lightning", value: coinosCredits.lightning, icon: Zap, color: "text-amber-400" },
                  { label: "Bitcoin", value: coinosCredits.bitcoin, icon: Bitcoin, color: "text-orange-400" },
                  { label: "Liquid", value: coinosCredits.liquid, icon: Boxes, color: "text-blue-400" },
                ].map(({ label, value, icon: Icon, color }) =>
                  createElement("div", { key: label, className: "flex items-center justify-between rounded-md bg-muted/20 px-3 py-2" },
                    createElement("span", { className: "flex items-center gap-1.5 text-xs text-muted-foreground" },
                      createElement(Icon, { className: cn("size-3", color) }), label,
                    ),
                    createElement("span", { className: "text-xs font-bold font-mono" }, formatSats(value)),
                  ),
                )
              : createElement("p", { className: "text-xs text-muted-foreground text-center py-4" }, "---"),
          ),
        ),
      ),
    ),

    // Recent Payments
    renderPayments(payments, totalPayments, coinosPayments),

    // Funds + Invoices (passed in from parent)
    fundsEl,
    invoicesEl,

    // Admin warning
    createElement("div", { className: "flex items-center gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs" },
      createElement(AlertTriangle, { className: "size-3.5 text-amber-400 shrink-0" }),
      createElement("span", { className: "text-muted-foreground" }, "Admin access \u00B7 All actions logged \u00B7 Transactions are irreversible"),
    ),

    // System Diagnostics
    renderDiagnostics(coinosStatus, coinosInfo, totalPayments, showDiagnostics, onToggleDiagnostics),
  );
}

// ─── Payments Section ────────────────────────────────────────────────────────

function renderPayments(
  payments: CoinosPaymentItem[],
  totalPayments: number,
  coinosPayments: CoinosPaymentsResponse | null,
) {
  return createElement(Card, { className: "border-border/50" },
    createElement(CardContent, { className: "p-0" },
      createElement("div", { className: "flex items-center justify-between px-4 pt-3 pb-2" },
        createElement("span", { className: "text-xs font-semibold flex items-center gap-1.5" },
          createElement(Activity, { className: "size-3 text-muted-foreground" }), "Recent Payments",
        ),
        totalPayments > 0 ? createElement("span", { className: "text-[10px] text-muted-foreground tabular-nums" }, totalPayments.toLocaleString()) : null,
      ),
      payments.length === 0
        ? createElement("p", { className: "text-xs text-muted-foreground text-center py-6" }, "No payments yet")
        : createElement("div", { className: "px-3 pb-3" },
            createElement("div", { className: "rounded-md border border-border/30 divide-y divide-border/20" },
              ...payments.slice(0, 8).map((p) => {
                const isIn = p.amount > 0;
                return createElement("div", { key: p.id || p.hash || String(p.created), className: "flex items-center gap-2.5 px-3 py-2 hover:bg-muted/10 transition-colors" },
                  createElement("div", { className: cn("size-6 rounded-full flex items-center justify-center shrink-0", isIn ? "bg-emerald-500/10" : "bg-red-500/10") },
                    isIn ? createElement(ArrowDownLeft, { className: "size-3 text-emerald-400" }) : createElement(ArrowUpRight, { className: "size-3 text-red-400" }),
                  ),
                  createElement("span", { className: cn("text-xs font-semibold font-mono tabular-nums w-24 shrink-0", isIn ? "text-emerald-400" : "text-red-400") },
                    (isIn ? "+" : "") + formatSats(p.amount),
                  ),
                  createElement(Badge, { variant: "outline", className: "text-[8px] px-1 py-0 capitalize shrink-0" }, p.type),
                  createElement("span", { className: "text-[10px] text-muted-foreground truncate flex-1" },
                    p.with?.username ? `${isIn ? "from" : "to"} ${p.with.username}` : p.memo || "",
                  ),
                  createElement("span", { className: "text-[10px] text-muted-foreground shrink-0" }, timeAgo(p.created)),
                );
              }),
            ),

            // Volume summary
            coinosPayments?.incoming && coinosPayments?.outgoing
              ? createElement("div", { className: "flex gap-3 mt-2" },
                  Object.keys(coinosPayments.incoming).length > 0
                    ? createElement("div", { className: "flex items-center gap-2 rounded-md bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 flex-1" },
                        createElement(ArrowDownLeft, { className: "size-3 text-emerald-400 shrink-0" }),
                        ...Object.values(coinosPayments.incoming).map((data, i) =>
                          createElement("span", { key: "in" + i, className: "text-xs font-mono font-bold" }, formatSats(data.sats)),
                        ),
                        createElement("span", { className: "text-[10px] text-emerald-400" }, "in"),
                      )
                    : null,
                  Object.keys(coinosPayments.outgoing).length > 0
                    ? createElement("div", { className: "flex items-center gap-2 rounded-md bg-red-500/5 border border-red-500/10 px-3 py-1.5 flex-1" },
                        createElement(ArrowUpRight, { className: "size-3 text-red-400 shrink-0" }),
                        ...Object.values(coinosPayments.outgoing).map((data, i) =>
                          createElement("span", { key: "out" + i, className: "text-xs font-mono font-bold" }, formatSats(data.sats)),
                        ),
                        createElement("span", { className: "text-[10px] text-red-400" }, "out"),
                      )
                    : null,
                )
              : null,
          ),
    ),
  );
}

// ─── Diagnostics ─────────────────────────────────────────────────────────────

function renderDiagnostics(
  coinosStatus: CoinosStatus | null,
  coinosInfo: NodeInfoData | null,
  totalPayments: number,
  showDiagnostics: boolean,
  onToggle: () => void,
) {
  const isHealthy = coinosStatus?.healthy ?? false;
  const nodeVersion = coinosInfo?.version || "";
  const btcImpl = coinosStatus?.bitcoin_implementation || "";

  return createElement("div", { className: "rounded-lg border border-border/50" },
    createElement("button", {
      className: "flex items-center justify-between w-full px-4 py-2.5 cursor-pointer",
      onClick: onToggle,
    },
      createElement("span", { className: "text-xs font-semibold flex items-center gap-1.5" },
        createElement(Settings, { className: "size-3 text-muted-foreground" }), "System Diagnostics",
      ),
      createElement(ChevronDown, { className: cn("size-3.5 text-muted-foreground transition-transform", showDiagnostics && "rotate-180") }),
    ),
    showDiagnostics ? createElement("div", { className: "px-4 pb-3 space-y-0" },
      ...[
        { label: "CoinOS Enabled", value: coinosStatus?.enabled ? "true" : "false" },
        { label: "Health", value: isHealthy ? "healthy" : "unhealthy" },
        { label: "Failures", value: String(coinosStatus?.consecutiveFailures ?? "---") },
        { label: "Last Success", value: coinosStatus?.lastSuccessTime ? new Date(coinosStatus.lastSuccessTime as number).toISOString() : "---" },
        { label: "Last Failure", value: (coinosStatus?.lastFailureReason as string) || "none" },
        { label: "Alias", value: coinosInfo?.alias || "---" },
        { label: "LND Version", value: nodeVersion || "---" },
        { label: "Bitcoin Impl", value: btcImpl || "---" },
        { label: "Block", value: coinosInfo?.block_height?.toLocaleString() || "---" },
        { label: "Chain Sync", value: String(coinosInfo?.synced_to_chain ?? "---") },
        { label: "Active Ch", value: String(coinosInfo?.num_active_channels ?? "---") },
        { label: "Peers", value: String(coinosInfo?.num_peers ?? "---") },
        { label: "Payments", value: totalPayments.toLocaleString() },
      ].map(({ label, value }) =>
        createElement("div", { key: label, className: "flex justify-between items-center py-1 border-b border-border/10 last:border-0 text-[11px] font-mono" },
          createElement("span", { className: "text-muted-foreground" }, label),
          createElement("span", { className: "truncate max-w-[60%] text-right" }, value),
        ),
      ),
    ) : null,
  );
}

// ─── Funds Management ────────────────────────────────────────────────────────

export function renderCoinosFunds(
  fundsExpanded: boolean,
  fundId: string,
  fundLoading: boolean,
  fund: { amount: number; authorization?: any; payments: CoinosPaymentItem[] } | null,
  fundManagers: FundManagerItem[],
  fundError: string,
  authAmount: string,
  authCurrency: string,
  authSats: string,
  authorizing: boolean,
  withdrawAmount: string,
  withdrawing: boolean,
  withdrawResult: string,
  newManager: string,
  addingManager: boolean,
  onToggle: () => void,
  onFundIdChange: (v: string) => void,
  onLookup: () => void,
  onAuthAmountChange: (v: string) => void,
  onAuthCurrencyChange: (v: string) => void,
  onAuthSatsChange: (v: string) => void,
  onAuthorize: () => void,
  onWithdrawAmountChange: (v: string) => void,
  onWithdraw: () => void,
  onNewManagerChange: (v: string) => void,
  onAddManager: () => void,
  onRemoveManager: (id: string) => void,
  onDismissError: () => void,
) {
  return createElement(Card, { className: "border-border/50" },
    createElement("button", {
      className: "flex items-center justify-between w-full px-4 py-3 cursor-pointer",
      onClick: onToggle,
    },
      createElement("span", { className: "text-xs font-semibold flex items-center gap-1.5" },
        createElement(Vault, { className: "size-3 text-muted-foreground" }), "Funds Management",
      ),
      createElement(ChevronDown, { className: cn("size-3.5 text-muted-foreground transition-transform", fundsExpanded && "rotate-180") }),
    ),
    fundsExpanded ? createElement(CardContent, { className: "pt-0 space-y-4" },
      fundError ? createElement("div", { className: "flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive" },
        createElement(AlertTriangle, { className: "size-3 shrink-0" }), fundError,
        createElement("button", { onClick: onDismissError, className: "ml-auto text-[10px] underline cursor-pointer" }, "dismiss"),
      ) : null,

      // Lookup
      createElement("div", { className: "flex gap-2" },
        createElement(Input, {
          placeholder: "Fund ID or name...",
          value: fundId,
          onInput: (e: Event) => onFundIdChange((e.target as HTMLInputElement).value),
          className: "h-8 text-sm",
          onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter") onLookup(); },
        }),
        createElement(Button, { onClick: onLookup, disabled: !fundId.trim() || fundLoading, size: "sm", className: "gap-1 h-8 px-3 shrink-0" },
          fundLoading ? createElement(Loader2, { className: "size-3 animate-spin" }) : createElement(Search, { className: "size-3" }),
          "Load",
        ),
      ),

      fund ? createElement("div", { className: "space-y-3" },
        // Fund overview
        createElement("div", { className: "rounded-md border border-primary/20 bg-primary/5 p-3 flex items-center justify-between" },
          createElement("div", { className: "flex items-center gap-2" },
            createElement(Vault, { className: "size-4 text-primary" }),
            createElement("div", null,
              createElement("p", { className: "text-xs font-semibold" }, "Fund: " + fundId),
              createElement("p", { className: "text-[10px] text-muted-foreground" },
                fund.payments?.length ? fund.payments.length + " transactions" : "No transactions",
              ),
            ),
          ),
          createElement("span", { className: "text-lg font-bold font-mono tabular-nums" }, formatSats(fund.amount)),
        ),

        // Authorization
        fund.authorization ? createElement("div", { className: "rounded-md bg-muted/20 p-3" },
          createElement("p", { className: "text-xs font-semibold mb-2" }, "Current Authorization"),
          createElement("div", { className: "grid grid-cols-3 gap-2 text-xs" },
            createElement("div", null,
              createElement("p", { className: "text-muted-foreground" }, "Amount"),
              createElement("p", { className: "font-mono font-bold" }, formatSats(fund.authorization.amount || 0)),
            ),
            createElement("div", null,
              createElement("p", { className: "text-muted-foreground" }, "Fiat"),
              createElement("p", { className: "font-mono font-bold" }, (fund.authorization.fiat || 0) + " " + (fund.authorization.currency || "")),
            ),
            createElement("div", null,
              createElement("p", { className: "text-muted-foreground" }, "Rate"),
              createElement("p", { className: "font-mono font-bold" }, fund.authorization.rate?.toLocaleString() || "---"),
            ),
          ),
        ) : null,

        // Authorize form
        createElement("div", { className: "rounded-md border border-border/30 p-3 space-y-2" },
          createElement("p", { className: "text-xs font-semibold" }, "Set Authorization"),
          createElement("div", { className: "grid grid-cols-3 gap-2" },
            createElement(Input, {
              placeholder: "Fiat amount",
              value: authAmount,
              onInput: (e: Event) => onAuthAmountChange((e.target as HTMLInputElement).value),
              className: "h-7 text-xs",
              type: "number",
            }),
            createElement("select", {
              value: authCurrency,
              onChange: (e: Event) => onAuthCurrencyChange((e.target as HTMLSelectElement).value),
              className: "h-7 rounded-md border border-input bg-background px-2 text-xs",
            },
              ...RATE_CURRENCIES.map((c) => createElement("option", { key: c, value: c }, c)),
            ),
            createElement(Input, {
              placeholder: "Sats",
              value: authSats,
              onInput: (e: Event) => onAuthSatsChange((e.target as HTMLInputElement).value),
              className: "h-7 text-xs",
              type: "number",
            }),
          ),
          createElement(Button, { onClick: onAuthorize, disabled: authorizing, size: "sm", className: "w-full h-7 text-xs gap-1" },
            authorizing ? createElement(Loader2, { className: "size-3 animate-spin" }) : null,
            "Authorize",
          ),
        ),

        // Withdraw
        createElement("div", { className: "rounded-md border border-border/30 p-3 space-y-2" },
          createElement("p", { className: "text-xs font-semibold" }, "Withdraw"),
          createElement("div", { className: "flex gap-2" },
            createElement(Input, {
              placeholder: "Amount in sats",
              value: withdrawAmount,
              onInput: (e: Event) => onWithdrawAmountChange((e.target as HTMLInputElement).value),
              className: "h-7 text-xs",
              type: "number",
            }),
            createElement(Button, { onClick: onWithdraw, disabled: withdrawing || !withdrawAmount, size: "sm", className: "h-7 text-xs gap-1 shrink-0" },
              withdrawing ? createElement(Loader2, { className: "size-3 animate-spin" }) : null,
              "Withdraw",
            ),
          ),
          withdrawResult ? createElement("p", { className: "text-xs text-emerald-400" }, withdrawResult) : null,
        ),

        // Managers
        createElement("div", { className: "rounded-md border border-border/30 p-3 space-y-2" },
          createElement("p", { className: "text-xs font-semibold" }, "Fund Managers"),
          fundManagers.length > 0
            ? createElement("div", { className: "space-y-1" },
                ...fundManagers.map((m) =>
                  createElement("div", { key: m.id, className: "flex items-center justify-between rounded-md bg-muted/20 px-2.5 py-1.5" },
                    createElement("span", { className: "text-xs" }, m.username),
                    createElement("button", {
                      onClick: () => onRemoveManager(m.id),
                      className: "text-destructive hover:text-destructive/80 cursor-pointer",
                    }, createElement(Trash2, { className: "size-3" })),
                  ),
                ),
              )
            : createElement("p", { className: "text-[10px] text-muted-foreground" }, "No managers"),
          createElement("div", { className: "flex gap-2" },
            createElement(Input, {
              placeholder: "Username...",
              value: newManager,
              onInput: (e: Event) => onNewManagerChange((e.target as HTMLInputElement).value),
              className: "h-7 text-xs",
            }),
            createElement(Button, { onClick: onAddManager, disabled: addingManager || !newManager.trim(), size: "sm", className: "h-7 text-xs shrink-0" },
              addingManager ? createElement(Loader2, { className: "size-3 animate-spin" }) : "Add",
            ),
          ),
        ),

        // Recent fund transactions
        fund.payments?.length > 0 ? createElement("div", null,
          createElement("p", { className: "text-xs font-semibold mb-2" }, "Fund Transactions"),
          createElement("div", { className: "rounded-md border border-border/30 divide-y divide-border/20 max-h-48 overflow-y-auto" },
            ...fund.payments.slice(0, 10).map((p) => {
              const isIn = p.amount > 0;
              return createElement("div", { key: p.id || String(p.created), className: "flex items-center gap-2 px-2.5 py-1.5 text-xs" },
                createElement("span", { className: cn("font-mono tabular-nums", isIn ? "text-emerald-400" : "text-red-400") },
                  (isIn ? "+" : "") + formatSats(p.amount),
                ),
                createElement("span", { className: "text-muted-foreground truncate flex-1" }, p.memo || p.type),
                createElement("span", { className: "text-muted-foreground shrink-0" }, timeAgo(p.created)),
              );
            }),
          ),
        ) : null,
      ) : null,
    ) : null,
  );
}

// ─── Invoice Management ──────────────────────────────────────────────────────

export function renderCoinosInvoices(
  invoicesExpanded: boolean,
  invoices: AdminInvoiceItem[],
  invoicesLoading: boolean,
  invoicesLoaded: boolean,
  invoiceError: string,
  invoiceCopied: string | null,
  invAmount: string,
  invMemo: string,
  invType: string,
  invCreating: boolean,
  invCreated: AdminInvoiceItem | null,
  invLookupId: string,
  invLookupLoading: boolean,
  invLookupResult: AdminInvoiceItem | null,
  onToggle: () => void,
  onAmountChange: (v: string) => void,
  onMemoChange: (v: string) => void,
  onTypeChange: (v: string) => void,
  onCreate: () => void,
  onLookupIdChange: (v: string) => void,
  onLookup: () => void,
  onCopyText: (text: string, id: string) => void,
) {
  return createElement(Card, { className: "border-border/50" },
    createElement("button", {
      className: "flex items-center justify-between w-full px-4 py-3 cursor-pointer",
      onClick: onToggle,
    },
      createElement("span", { className: "text-xs font-semibold flex items-center gap-1.5" },
        createElement(Zap, { className: "size-3 text-muted-foreground" }), "Invoice Management",
      ),
      createElement(ChevronDown, { className: cn("size-3.5 text-muted-foreground transition-transform", invoicesExpanded && "rotate-180") }),
    ),
    invoicesExpanded ? createElement(CardContent, { className: "pt-0 space-y-4" },
      invoiceError ? createElement("div", { className: "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive" }, invoiceError) : null,

      // Create invoice
      createElement("div", { className: "rounded-md border border-border/30 p-3 space-y-2" },
        createElement("p", { className: "text-xs font-semibold" }, "Create Invoice"),
        createElement("div", { className: "grid grid-cols-3 gap-2" },
          createElement(Input, {
            placeholder: "Amount (sats)",
            value: invAmount,
            onInput: (e: Event) => onAmountChange((e.target as HTMLInputElement).value),
            className: "h-7 text-xs",
            type: "number",
          }),
          createElement(Input, {
            placeholder: "Memo (optional)",
            value: invMemo,
            onInput: (e: Event) => onMemoChange((e.target as HTMLInputElement).value),
            className: "h-7 text-xs",
          }),
          createElement("select", {
            value: invType,
            onChange: (e: Event) => onTypeChange((e.target as HTMLSelectElement).value),
            className: "h-7 rounded-md border border-input bg-background px-2 text-xs",
          },
            createElement("option", { value: "lightning" }, "Lightning"),
            createElement("option", { value: "bitcoin" }, "Bitcoin"),
            createElement("option", { value: "liquid" }, "Liquid"),
          ),
        ),
        createElement(Button, { onClick: onCreate, disabled: invCreating || !invAmount, size: "sm", className: "w-full h-7 text-xs gap-1" },
          invCreating ? createElement(Loader2, { className: "size-3 animate-spin" }) : createElement(Zap, { className: "size-3" }),
          "Create Invoice",
        ),
      ),

      // Created invoice display
      invCreated ? createElement("div", { className: "rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2" },
        createElement("p", { className: "text-xs font-semibold text-emerald-400" }, "Invoice Created"),
        createElement("div", { className: "text-xs space-y-1" },
          createElement("p", null, createElement("span", { className: "text-muted-foreground" }, "Amount: "), createElement("span", { className: "font-mono" }, formatSats(invCreated.amount))),
          invCreated.hash ? createElement("div", { className: "flex items-center gap-1" },
            createElement("span", { className: "text-muted-foreground" }, "Hash: "),
            createElement("code", { className: "font-mono text-[10px] truncate" }, invCreated.hash),
            createElement("button", {
              onClick: () => onCopyText(invCreated.hash!, "hash"),
              className: "shrink-0 cursor-pointer",
            }, invoiceCopied === "hash" ? createElement(Check, { className: "size-3 text-emerald-400" }) : createElement(Copy, { className: "size-3" })),
          ) : null,
          invCreated.bolt11 || invCreated.text ? createElement("div", { className: "flex items-center gap-1" },
            createElement("span", { className: "text-muted-foreground" }, "Invoice: "),
            createElement("code", { className: "font-mono text-[10px] truncate max-w-[200px]" }, (invCreated.bolt11 || invCreated.text || "").slice(0, 40) + "..."),
            createElement("button", {
              onClick: () => onCopyText(invCreated.bolt11 || invCreated.text || "", "bolt11"),
              className: "shrink-0 cursor-pointer",
            }, invoiceCopied === "bolt11" ? createElement(Check, { className: "size-3 text-emerald-400" }) : createElement(Copy, { className: "size-3" })),
          ) : null,
        ),
      ) : null,

      // Lookup invoice
      createElement("div", { className: "rounded-md border border-border/30 p-3 space-y-2" },
        createElement("p", { className: "text-xs font-semibold" }, "Lookup Invoice"),
        createElement("div", { className: "flex gap-2" },
          createElement(Input, {
            placeholder: "Invoice hash or ID...",
            value: invLookupId,
            onInput: (e: Event) => onLookupIdChange((e.target as HTMLInputElement).value),
            className: "h-7 text-xs",
            onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter") onLookup(); },
          }),
          createElement(Button, { onClick: onLookup, disabled: invLookupLoading || !invLookupId.trim(), size: "sm", className: "h-7 text-xs gap-1 shrink-0" },
            invLookupLoading ? createElement(Loader2, { className: "size-3 animate-spin" }) : createElement(Search, { className: "size-3" }),
            "Find",
          ),
        ),
        invLookupResult ? createElement("div", { className: "rounded-md bg-muted/20 p-2.5 text-xs space-y-1" },
          createElement("p", null, createElement("span", { className: "text-muted-foreground" }, "Amount: "), createElement("span", { className: "font-mono" }, formatSats(invLookupResult.amount))),
          invLookupResult.type ? createElement("p", null, createElement("span", { className: "text-muted-foreground" }, "Type: "), invLookupResult.type) : null,
          invLookupResult.memo ? createElement("p", null, createElement("span", { className: "text-muted-foreground" }, "Memo: "), invLookupResult.memo) : null,
          invLookupResult.received !== undefined ? createElement("p", null,
            createElement("span", { className: "text-muted-foreground" }, "Received: "),
            createElement("span", { className: invLookupResult.received ? "text-emerald-400" : "text-amber-400" }, invLookupResult.received ? "Yes" : "No"),
          ) : null,
        ) : null,
      ),

      // Invoice list
      invoicesLoading ? renderLoading() :
        invoicesLoaded && invoices.length > 0
          ? createElement("div", null,
              createElement("p", { className: "text-xs font-semibold mb-2" }, "Recent Invoices"),
              createElement("div", { className: "rounded-md border border-border/30 divide-y divide-border/20 max-h-48 overflow-y-auto" },
                ...invoices.slice(0, 15).map((inv, i) =>
                  createElement("div", { key: inv.id || inv.hash || String(i), className: "flex items-center gap-2 px-2.5 py-1.5 text-xs" },
                    createElement("span", { className: "font-mono tabular-nums font-bold w-20 shrink-0" }, formatSats(inv.amount)),
                    createElement(Badge, { variant: "outline", className: "text-[8px] px-1 py-0 capitalize shrink-0" }, inv.type || "ln"),
                    createElement("span", { className: "text-muted-foreground truncate flex-1" }, inv.memo || ""),
                    inv.received !== undefined
                      ? createElement("span", { className: cn("text-[10px] shrink-0", inv.received ? "text-emerald-400" : "text-amber-400") },
                          inv.received ? "paid" : "pending",
                        )
                      : null,
                  ),
                ),
              ),
            )
          : invoicesLoaded
            ? createElement("p", { className: "text-xs text-muted-foreground text-center py-4" }, "No invoices found")
            : null,
    ) : null,
  );
}
