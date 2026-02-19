import { createElement } from "inferno-create-element";
import { Card, CardContent } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { cn } from "@/ui/utils";
import { Radio, Users, Activity, BarChart3, Bitcoin } from "@/lib/icons";
import { renderStatusBadge, renderLoading, pubkeyShort } from "./helpers";
import type { OverviewData } from "./types";

export function renderOverview(
  overview: OverviewData | null,
  overviewLoading: boolean,
  fallbackDomain: string,
) {
  if (overviewLoading) return renderLoading();
  if (!overview) return createElement("div", { className: "text-sm text-muted-foreground text-center py-12" }, "No data available");

  return createElement("div", { className: "space-y-6" },
    // Stats grid
    createElement("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4" },
      ...[
        { label: "Total Relays", value: String(overview.totalRelays), icon: Radio, color: "text-primary" },
        { label: "Running", value: String(overview.runningRelays), icon: Activity, color: "text-emerald-400" },
        { label: "Users", value: String(overview.totalUsers), icon: Users, color: "text-blue-400" },
        { label: "Orders", value: String(overview.totalOrders), icon: BarChart3, color: "text-amber-400" },
      ].map(({ label, value, icon: Icon, color }) =>
        createElement(Card, { key: label, className: "border-border/50" },
          createElement(CardContent, { className: "p-4" },
            createElement("div", { className: "flex items-center justify-between" },
              createElement("div", null,
                createElement("p", { className: "text-xs text-muted-foreground" }, label),
                createElement("p", { className: "text-2xl font-bold font-mono tabular-nums mt-1" }, value),
              ),
              createElement("div", { className: "rounded-lg p-2.5 bg-muted/30" },
                createElement(Icon, { className: cn("size-5", color) }),
              ),
            ),
          ),
        ),
      ),
    ),

    // CoinOS status
    overview.coinosStatus ? createElement(Card, { className: "border-border/50" },
      createElement(CardContent, { className: "p-4 flex items-center justify-between" },
        createElement("div", { className: "flex items-center gap-3" },
          createElement(Bitcoin, { className: "size-5 text-amber-400" }),
          createElement("div", null,
            createElement("p", { className: "text-sm font-semibold" }, "CoinOS"),
            createElement("p", { className: "text-xs text-muted-foreground" },
              overview.coinosStatus.enabled ? "Enabled" : "Disabled",
            ),
          ),
        ),
        createElement(Badge, {
          variant: overview.coinosStatus.healthy ? "default" : "destructive",
          className: cn("text-xs gap-1", overview.coinosStatus.healthy && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"),
        },
          createElement("span", { className: cn("size-1.5 rounded-full", overview.coinosStatus.healthy ? "bg-emerald-400" : "bg-destructive") }),
          overview.coinosStatus.healthy ? "Healthy" : "Down",
        ),
      ),
    ) : null,

    // Recent relays
    overview.recentRelays?.length ? createElement("div", null,
      createElement("h3", { className: "text-sm font-semibold mb-3" }, "Recent Relays"),
      createElement("div", { className: "rounded-lg border border-border/50 divide-y divide-border/30" },
        ...overview.recentRelays.slice(0, 5).map((r) =>
          createElement("div", { key: r.id, className: "flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors" },
            createElement("div", null,
              createElement("p", { className: "font-medium text-sm" }, r.name),
              createElement("p", { className: "text-xs text-muted-foreground font-mono" },
                r.name + "." + (r.domain || fallbackDomain),
              ),
            ),
            renderStatusBadge(r.status),
          ),
        ),
      ),
    ) : null,

    // Recent users
    overview.recentUsers?.length ? createElement("div", null,
      createElement("h3", { className: "text-sm font-semibold mb-3" }, "Recent Users"),
      createElement("div", { className: "rounded-lg border border-border/50 divide-y divide-border/30" },
        ...overview.recentUsers.slice(0, 5).map((u) =>
          createElement("div", { key: u.id, className: "flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors" },
            createElement("div", null,
              createElement("p", { className: "text-sm font-medium" }, u.name || pubkeyShort(u.pubkey)),
              createElement("p", { className: "text-xs text-muted-foreground font-mono" }, pubkeyShort(u.pubkey)),
            ),
            u.admin
              ? createElement(Badge, { className: "text-[10px] bg-primary/10 text-primary border-primary/20" }, "Admin")
              : createElement(Badge, { variant: "secondary", className: "text-[10px]" }, "User"),
          ),
        ),
      ),
    ) : null,
  );
}
