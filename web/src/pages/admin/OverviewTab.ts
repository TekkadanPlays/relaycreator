import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { Chart, registerables } from "chart.js";
import { Card, CardContent } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { cn } from "@/ui/utils";
import {
  Radio, Users, Activity, BarChart3, Bitcoin, Zap, Database,
  DollarSign, TrendingUp, Clock, Server,
} from "@/lib/icons";
import { renderStatusBadge, renderLoading, pubkeyShort } from "./helpers";
import type { OverviewData, AdminRelay, AdminUser, CoinosStatus, CoinosCreditsData } from "./types";

Chart.register(...registerables);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCSSVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function fmtSats(sats: number): string {
  if (sats >= 1_000_000) return (sats / 1_000_000).toFixed(1) + "M";
  if (sats >= 1_000) return (sats / 1_000).toFixed(sats >= 100_000 ? 0 : 1) + "k";
  return String(sats);
}

// ---------------------------------------------------------------------------
// InfluxChart component
// ---------------------------------------------------------------------------

interface InfluxChartProps { data: any[]; label: string; color?: string; type?: "line" | "bar"; }

class InfluxChart extends Component<InfluxChartProps, {}> {
  private canvasRef: HTMLCanvasElement | null = null;
  private chart: Chart | null = null;
  private observer: MutationObserver | null = null;

  componentDidMount() { this.buildChart(); this.observer = new MutationObserver(() => setTimeout(() => this.buildChart(), 50)); this.observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] }); }
  componentDidUpdate(prev: InfluxChartProps) { if (prev.data !== this.props.data) this.buildChart(); }
  componentWillUnmount() { this.chart?.destroy(); this.observer?.disconnect(); }

  private buildChart() {
    if (!this.canvasRef) return;
    this.chart?.destroy();
    const rows = this.props.data || [];
    if (!rows.length) return;
    const primary = this.props.color || getCSSVar("--primary") || "oklch(0.648 0.2 132)";
    const border = getCSSVar("--border") || "oklch(0.3 0 0)";
    const mutedFg = getCSSVar("--muted-foreground") || "oklch(0.556 0 0)";
    const labels = rows.map((r: any) => new Date(r._time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
    const values = rows.map((r: any) => r._value ?? 0);
    const ctx = this.canvasRef.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, primary.includes("oklch") ? primary.replace(")", " / 0.2)") : primary + "33");
    grad.addColorStop(1, "transparent");
    this.chart = new Chart(ctx, {
      type: this.props.type || "line",
      data: { labels, datasets: [{ label: this.props.label, data: values, borderColor: primary, backgroundColor: this.props.type === "bar" ? primary : grad, fill: this.props.type !== "bar", tension: 0.4, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: "hsl(0 0% 10%)", titleColor: "#fff", bodyColor: "#fff", borderColor: border, borderWidth: 1, cornerRadius: 8, padding: 10 } },
        scales: { x: { grid: { display: false }, ticks: { color: mutedFg, maxTicksLimit: 8, font: { size: 10 } }, border: { display: false } }, y: { grid: { color: border + "30" }, ticks: { color: mutedFg, font: { size: 10 } }, border: { display: false }, beginAtZero: true } },
      },
    });
  }

  render() { return createElement("div", { style: { height: "220px" } }, createElement("canvas", { ref: (el: any) => { this.canvasRef = el; } } as any)); }
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard(p: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return createElement(Card, { className: "border-border/50" },
    createElement(CardContent, { className: "p-5" },
      createElement("div", { className: "flex items-center justify-between" },
        createElement("div", null,
          createElement("p", { className: "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground" }, p.label),
          createElement("p", { className: "text-2xl font-bold font-mono tabular-nums mt-1" }, p.value),
          p.sub ? createElement("p", { className: "text-[11px] text-muted-foreground mt-0.5" }, p.sub) : null,
        ),
        createElement("div", { className: "rounded-xl p-3 bg-muted/30" },
          createElement(p.icon, { className: cn("size-5", p.color) }),
        ),
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Relay status breakdown
// ---------------------------------------------------------------------------

function RelayStatusBreakdown(relays: AdminRelay[]) {
  if (!relays.length) return null;
  const counts: Record<string, number> = {};
  relays.forEach((r) => { const s = r.status || "unknown"; counts[s] = (counts[s] || 0) + 1; });
  const statusColors: Record<string, string> = { running: "bg-emerald-400", provision: "bg-amber-400", stopped: "bg-red-400", unknown: "bg-muted-foreground" };
  const total = relays.length;

  return createElement(Card, { className: "border-border/50" },
    createElement(CardContent, { className: "p-5" },
      createElement("h3", { className: "text-sm font-semibold mb-4" }, "Relay Status"),
      // Stacked bar
      createElement("div", { className: "flex h-3 rounded-full overflow-hidden gap-0.5 mb-4" },
        ...Object.entries(counts).map(([status, count]) =>
          createElement("div", {
            key: status,
            className: cn("rounded-full", statusColors[status] || "bg-muted-foreground"),
            style: { width: Math.max((count / total) * 100, 2) + "%" },
            title: `${status}: ${count}`,
          }),
        ),
      ),
      // Legend
      createElement("div", { className: "flex flex-wrap gap-x-5 gap-y-2" },
        ...Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([status, count]) =>
          createElement("div", { key: status, className: "flex items-center gap-2" },
            createElement("span", { className: cn("size-2.5 rounded-full", statusColors[status] || "bg-muted-foreground") }),
            createElement("span", { className: "text-xs capitalize" }, status),
            createElement("span", { className: "text-xs font-bold font-mono tabular-nums" }, String(count)),
          ),
        ),
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// renderOverview
// ---------------------------------------------------------------------------

export function renderOverview(
  overview: OverviewData | null,
  overviewLoading: boolean,
  fallbackDomain: string,
  relays: AdminRelay[],
  users: AdminUser[],
  coinosStatus: CoinosStatus | null,
  coinosCredits: CoinosCreditsData | null,
  coinosLoading: boolean,
  influxPlatform: { available: boolean; events: any[]; connections: any[] } | null,
  influxLoading: boolean,
  influxRange: string,
  influxTopRelays: { available: boolean; relays: any[] } | null,
  onInfluxRangeChange: (range: string) => void,
) {
  if (overviewLoading && !overview) return renderLoading();

  const o = overview || { totalRelays: 0, runningRelays: 0, provisioningRelays: 0, totalUsers: 0, totalOrders: 0, paidOrders: 0, recentOrders: 0, totalRevenue: 0 };

  // Derive recent relays/users from the full arrays (sorted by id desc = most recent)
  const recentRelays = relays.slice(0, 8);
  const recentUsers = users.slice(0, 8);

  return createElement("div", { className: "space-y-6" },

    // ─── Row 1: Key metrics ───────────────────────────────────────────
    createElement("div", { className: "grid gap-3 grid-cols-2 xl:grid-cols-5" },
      createElement(StatCard, { label: "Total Relays", value: String(o.totalRelays), sub: `${o.runningRelays} running · ${o.provisioningRelays} provisioning`, icon: Radio, color: "text-primary" }),
      createElement(StatCard, { label: "Users", value: String(o.totalUsers), icon: Users, color: "text-blue-400" }),
      createElement(StatCard, { label: "Total Orders", value: String(o.totalOrders), sub: `${o.paidOrders} paid · ${o.recentOrders} last 30d`, icon: BarChart3, color: "text-amber-400" }),
      createElement(StatCard, { label: "Revenue", value: fmtSats(o.totalRevenue) + " sats", sub: o.totalRevenue > 0 ? "from paid orders" : "no revenue yet", icon: DollarSign, color: "text-emerald-400" }),
      createElement(StatCard, { label: "Running", value: String(o.runningRelays) + "/" + String(o.totalRelays), sub: o.totalRelays > 0 ? Math.round((o.runningRelays / o.totalRelays) * 100) + "% uptime" : "—", icon: Activity, color: "text-emerald-400" }),
    ),

    // ─── Row 2: Relay status + CoinOS ─────────────────────────────────
    createElement("div", { className: "grid gap-4 lg:grid-cols-2" },
      // Relay status breakdown
      RelayStatusBreakdown(relays),

      // CoinOS summary
      coinosStatus || coinosCredits ? createElement(Card, { className: "border-border/50" },
        createElement(CardContent, { className: "p-5" },
          createElement("h3", { className: "text-sm font-semibold mb-4" }, "CoinOS Wallet"),
          createElement("div", { className: "space-y-4" },
            // Health status
            coinosStatus ? createElement("div", { className: "flex items-center gap-3" },
              createElement("div", { className: cn("size-3 rounded-full", coinosStatus.healthy ? "bg-emerald-400" : "bg-destructive") }),
              createElement("div", null,
                createElement("p", { className: "text-sm font-medium" }, coinosStatus.healthy ? "System Healthy" : "System Down"),
                coinosStatus.lastFailureReason ? createElement("p", { className: "text-xs text-muted-foreground" }, coinosStatus.lastFailureReason) : null,
              ),
            ) : null,
            // Balances
            coinosCredits ? createElement("div", { className: "grid grid-cols-3 gap-3" },
              ...[
                { label: "Lightning", value: coinosCredits.lightning, icon: Zap, color: "text-amber-400" },
                { label: "On-chain", value: coinosCredits.bitcoin, icon: Bitcoin, color: "text-orange-400" },
                { label: "Liquid", value: coinosCredits.liquid, icon: Database, color: "text-blue-400" },
              ].map((b) =>
                createElement("div", { key: b.label, className: "rounded-lg border border-border/40 p-3" },
                  createElement("div", { className: "flex items-center gap-1.5 mb-1" },
                    createElement(b.icon, { className: cn("size-3.5", b.color) }),
                    createElement("span", { className: "text-[10px] font-medium uppercase tracking-wider text-muted-foreground" }, b.label),
                  ),
                  createElement("p", { className: "text-lg font-bold font-mono tabular-nums" }, fmtSats(b.value)),
                  createElement("p", { className: "text-[10px] text-muted-foreground" }, "sats"),
                ),
              ),
            ) : null,
          ),
        ),
      ) : null,
    ),

    // ─── Row 3: InfluxDB charts ───────────────────────────────────────
    influxPlatform?.available ? createElement("div", { className: "space-y-4" },
      createElement("div", { className: "flex items-center justify-between" },
        createElement("h3", { className: "text-sm font-semibold" }, "Platform Metrics"),
        createElement("div", { className: "flex gap-1" },
          ...["24h", "7d", "30d"].map((r) =>
            createElement("button", {
              key: r, type: "button",
              onClick: () => onInfluxRangeChange(r),
              className: cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer", influxRange === r ? "bg-primary text-primary-foreground" : "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground"),
            }, r),
          ),
        ),
      ),
      createElement("div", { className: "grid gap-4 lg:grid-cols-2" },
        createElement(Card, { className: "border-border/50" },
          createElement(CardContent, { className: "p-5" },
            createElement("div", { className: "flex items-center gap-2 mb-3" }, createElement(Zap, { className: "size-4 text-primary" }), createElement("p", { className: "text-sm font-semibold" }, "Events Allowed")),
            influxPlatform.events.length > 0 ? createElement(InfluxChart, { data: influxPlatform.events, label: "Events" }) : createElement("div", { className: "h-[220px] flex items-center justify-center text-xs text-muted-foreground" }, "No event data for this range"),
          ),
        ),
        createElement(Card, { className: "border-border/50" },
          createElement(CardContent, { className: "p-5" },
            createElement("div", { className: "flex items-center gap-2 mb-3" }, createElement(Database, { className: "size-4 text-blue-400" }), createElement("p", { className: "text-sm font-semibold" }, "Active Connections")),
            influxPlatform.connections.length > 0 ? createElement(InfluxChart, { data: influxPlatform.connections, label: "Connections", color: "oklch(0.488 0.243 264)" }) : createElement("div", { className: "h-[220px] flex items-center justify-center text-xs text-muted-foreground" }, "No connection data for this range"),
          ),
        ),
      ),
    ) : influxLoading ? createElement(Card, { className: "border-border/50" },
      createElement(CardContent, { className: "p-8 text-center" }, createElement("p", { className: "text-sm text-muted-foreground" }, "Loading platform metrics...")),
    ) : null,

    // ─── Row 4: Top relays + Recent relays ────────────────────────────
    createElement("div", { className: "grid gap-4 lg:grid-cols-2 xl:grid-cols-3" },

      // Top relays by events (InfluxDB)
      influxTopRelays?.available && influxTopRelays.relays.length > 0 ? createElement(Card, { className: "border-border/50" },
        createElement(CardContent, { className: "p-5" },
          createElement("h3", { className: "text-sm font-semibold mb-4" }, "Top Relays by Events (24h)"),
          createElement("div", { className: "space-y-2.5" },
            ...influxTopRelays.relays.slice(0, 10).map((r: any, i: number) => {
              const maxVal = influxTopRelays!.relays[0]?._value || 1;
              const pct = Math.round((r._value / maxVal) * 100);
              return createElement("div", { key: r.relay || i, className: "space-y-1" },
                createElement("div", { className: "flex items-center justify-between text-xs" },
                  createElement("span", { className: "font-medium truncate max-w-[70%]" }, r.relay || "unknown"),
                  createElement("span", { className: "text-muted-foreground font-mono tabular-nums" }, String(Math.round(r._value))),
                ),
                createElement("div", { className: "h-1.5 rounded-full bg-muted/50 overflow-hidden" },
                  createElement("div", { className: "h-full rounded-full bg-primary/60 transition-all", style: { width: pct + "%" } }),
                ),
              );
            }),
          ),
        ),
      ) : null,

      // Recent relays
      recentRelays.length ? createElement(Card, { className: "border-border/50" },
        createElement(CardContent, { className: "p-5" },
          createElement("h3", { className: "text-sm font-semibold mb-4" }, "Recent Relays"),
          createElement("div", { className: "divide-y divide-border/30" },
            ...recentRelays.map((r) =>
              createElement("div", { key: r.id, className: "flex items-center justify-between py-2.5" },
                createElement("div", { className: "min-w-0 flex-1 mr-3" },
                  createElement("p", { className: "font-medium text-sm truncate" }, r.name),
                  createElement("p", { className: "text-xs text-muted-foreground font-mono truncate" }, r.name + "." + (r.domain || fallbackDomain)),
                  r.owner ? createElement("p", { className: "text-[10px] text-muted-foreground mt-0.5" }, "by " + (r.owner.name || pubkeyShort(r.owner.pubkey))) : null,
                ),
                renderStatusBadge(r.status),
              ),
            ),
          ),
        ),
      ) : null,

      // Recent users
      recentUsers.length ? createElement(Card, { className: "border-border/50" },
        createElement(CardContent, { className: "p-5" },
          createElement("h3", { className: "text-sm font-semibold mb-4" }, "Recent Users"),
          createElement("div", { className: "divide-y divide-border/30" },
            ...recentUsers.map((u) =>
              createElement("div", { key: u.id, className: "flex items-center justify-between py-2.5" },
                createElement("div", { className: "min-w-0 flex-1 mr-3" },
                  createElement("p", { className: "text-sm font-medium truncate" }, u.name || pubkeyShort(u.pubkey)),
                  createElement("p", { className: "text-xs text-muted-foreground font-mono truncate" }, pubkeyShort(u.pubkey)),
                  createElement("p", { className: "text-[10px] text-muted-foreground" }, u._count.relays + " relays · " + u._count.orders + " orders"),
                ),
                u.admin
                  ? createElement(Badge, { className: "text-[10px] bg-primary/10 text-primary border-primary/20 shrink-0" }, "Admin")
                  : createElement(Badge, { variant: "secondary", className: "text-[10px] shrink-0" }, "User"),
              ),
            ),
          ),
        ),
      ) : null,
    ),
  );
}
