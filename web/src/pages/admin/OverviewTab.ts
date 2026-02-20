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

function pct(n: number, total: number): string {
  if (!total) return "0%";
  return Math.round((n / total) * 100) + "%";
}

// ---------------------------------------------------------------------------
// InfluxChart — reusable Chart.js wrapper with theme awareness
// ---------------------------------------------------------------------------

interface InfluxChartProps {
  data: any[];
  label: string;
  color?: string;
  type?: "line" | "bar";
  height?: number;
  datasets?: { data: any[]; label: string; color: string }[];
}

class InfluxChart extends Component<InfluxChartProps, {}> {
  private canvasRef: HTMLCanvasElement | null = null;
  private chart: Chart | null = null;
  private observer: MutationObserver | null = null;

  componentDidMount() {
    this.buildChart();
    this.observer = new MutationObserver(() => setTimeout(() => this.buildChart(), 50));
    this.observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
  }

  componentDidUpdate(prev: InfluxChartProps) {
    if (prev.data !== this.props.data || prev.datasets !== this.props.datasets) this.buildChart();
  }

  componentWillUnmount() { this.chart?.destroy(); this.observer?.disconnect(); }

  private buildChart() {
    if (!this.canvasRef) return;
    this.chart?.destroy();

    const ctx = this.canvasRef.getContext("2d")!;
    const border = getCSSVar("--border") || "oklch(0.3 0 0)";
    const mutedFg = getCSSVar("--muted-foreground") || "oklch(0.556 0 0)";
    const chartType = this.props.type || "line";
    const h = this.props.height || 160;

    // Multi-dataset or single
    const multiDs = this.props.datasets;
    const rows = multiDs ? multiDs[0]?.data || [] : (this.props.data || []);
    if (!rows.length) return;

    const labels = rows.map((r: any) => {
      const d = new Date(r._time);
      return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    });

    const datasets = multiDs
      ? multiDs.map((ds) => this.makeDataset(ctx, ds.data, ds.label, ds.color, chartType, h))
      : [this.makeDataset(ctx, this.props.data, this.props.label, this.props.color || getCSSVar("--primary") || "oklch(0.648 0.2 132)", chartType, h)];

    this.chart = new Chart(ctx, {
      type: chartType,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { display: !!multiDs, position: "top", labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: "circle", padding: 12, color: mutedFg, font: { size: 11 } } },
          tooltip: {
            backgroundColor: "hsl(0 0% 8%)", titleColor: "#fff", bodyColor: "#ddd",
            borderColor: border, borderWidth: 1, cornerRadius: 6, padding: 8,
            titleFont: { size: 11, weight: "600" as any }, bodyFont: { size: 11 },
            callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString() ?? 0}` },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: mutedFg, maxTicksLimit: 6, font: { size: 10 } }, border: { display: false } },
          y: { grid: { color: border + "18" }, ticks: { color: mutedFg, font: { size: 10 }, maxTicksLimit: 5 }, border: { display: false }, beginAtZero: true },
        },
      },
    });
  }

  private makeDataset(ctx: CanvasRenderingContext2D, data: any[], label: string, color: string, type: string, h: number) {
    const values = data.map((r: any) => r._value ?? 0);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color.includes("oklch") ? color.replace(")", " / 0.15)") : color + "26");
    grad.addColorStop(1, "transparent");
    return {
      label, data: values, borderColor: color,
      backgroundColor: type === "bar" ? color : grad,
      fill: type !== "bar", tension: 0.35, pointRadius: 0, pointHoverRadius: 3,
      borderWidth: 1.5, barPercentage: 0.7,
    };
  }

  render() {
    const h = this.props.height || 160;
    return createElement("div", { style: { height: h + "px" } },
      createElement("canvas", { ref: (el: any) => { this.canvasRef = el; } } as any),
    );
  }
}

// ---------------------------------------------------------------------------
// Compact stat card — inline icon, tight spacing
// ---------------------------------------------------------------------------

function Stat(p: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return createElement("div", { className: "flex items-center gap-3 rounded-lg border border-border/40 bg-card px-3 py-2.5" },
    createElement("div", { className: cn("rounded-md p-1.5 bg-muted/40") },
      createElement(p.icon, { className: cn("size-4", p.color) }),
    ),
    createElement("div", { className: "min-w-0 flex-1" },
      createElement("p", { className: "text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-none" }, p.label),
      createElement("div", { className: "flex items-baseline gap-1.5 mt-0.5" },
        createElement("span", { className: "text-lg font-bold font-mono tabular-nums leading-none" }, p.value),
        p.sub ? createElement("span", { className: "text-[10px] text-muted-foreground truncate" }, p.sub) : null,
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

  const recentRelays = relays.slice(0, 6);
  const recentUsers = users.slice(0, 6);

  // Relay status counts
  const statusCounts: Record<string, number> = {};
  relays.forEach((r) => { const s = r.status || "unknown"; statusCounts[s] = (statusCounts[s] || 0) + 1; });
  const statusColors: Record<string, string> = { running: "bg-emerald-400", provision: "bg-amber-400", stopped: "bg-red-400", unknown: "bg-muted-foreground" };

  // Range selector
  const rangeSelector = createElement("div", { className: "flex gap-0.5 rounded-md border border-border/40 p-0.5" },
    ...["24h", "7d", "30d"].map((r) =>
      createElement("button", {
        key: r, type: "button",
        onClick: () => onInfluxRangeChange(r),
        className: cn(
          "px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
          influxRange === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
        ),
      }, r),
    ),
  );

  return createElement("div", { className: "space-y-4" },

    // ─── Row 1: Compact stat cards ─────────────────────────────────────
    createElement("div", { className: "grid gap-2 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" },
      createElement(Stat, { label: "Relays", value: String(o.totalRelays), sub: `${o.runningRelays} up`, icon: Radio, color: "text-primary" }),
      createElement(Stat, { label: "Users", value: String(o.totalUsers), icon: Users, color: "text-blue-400" }),
      createElement(Stat, { label: "Orders", value: String(o.totalOrders), sub: `${o.paidOrders} paid`, icon: BarChart3, color: "text-amber-400" }),
      createElement(Stat, { label: "Revenue", value: fmtSats(o.totalRevenue) + " sats", icon: DollarSign, color: "text-emerald-400" }),
      createElement(Stat, { label: "Uptime", value: o.totalRelays > 0 ? pct(o.runningRelays, o.totalRelays) : "—", sub: `${o.runningRelays}/${o.totalRelays}`, icon: Activity, color: "text-emerald-400" }),
    ),

    // ─── Row 2: Charts + Status ─────────────────────────────────────────
    createElement("div", { className: "grid gap-3 lg:grid-cols-3" },

      // Events chart (2 cols)
      createElement("div", { className: "lg:col-span-2 rounded-lg border border-border/40 bg-card p-4" },
        createElement("div", { className: "flex items-center justify-between mb-3" },
          createElement("div", { className: "flex items-center gap-2" },
            createElement(Zap, { className: "size-3.5 text-primary" }),
            createElement("span", { className: "text-xs font-semibold" }, "Platform Activity"),
          ),
          rangeSelector,
        ),
        influxPlatform?.available && (influxPlatform.events.length > 0 || influxPlatform.connections.length > 0)
          ? createElement(InfluxChart, {
              data: influxPlatform.events,
              label: "Events",
              height: 180,
              datasets: [
                ...(influxPlatform.events.length > 0 ? [{ data: influxPlatform.events, label: "Events Allowed", color: getCSSVar("--primary") || "oklch(0.648 0.2 132)" }] : []),
                ...(influxPlatform.connections.length > 0 ? [{ data: influxPlatform.connections, label: "Connections", color: "oklch(0.488 0.243 264)" }] : []),
              ],
            })
          : influxLoading
            ? createElement("div", { className: "h-[180px] flex items-center justify-center" },
                createElement("div", { className: "text-xs text-muted-foreground animate-pulse" }, "Loading metrics..."),
              )
            : createElement("div", { className: "h-[180px] flex items-center justify-center" },
                createElement("div", { className: "text-center" },
                  createElement(Activity, { className: "size-8 text-muted-foreground/30 mx-auto mb-2" }),
                  createElement("p", { className: "text-xs text-muted-foreground" }, "No InfluxDB data available"),
                  createElement("p", { className: "text-[10px] text-muted-foreground/60 mt-0.5" }, "Metrics will appear once relays start processing events"),
                ),
              ),
      ),

      // Right column: relay status + CoinOS health
      createElement("div", { className: "space-y-3" },

        // Relay status breakdown
        relays.length > 0 ? createElement("div", { className: "rounded-lg border border-border/40 bg-card p-4" },
          createElement("span", { className: "text-xs font-semibold" }, "Relay Status"),
          // Stacked bar
          createElement("div", { className: "flex h-2 rounded-full overflow-hidden gap-px mt-3 mb-2.5" },
            ...Object.entries(statusCounts).map(([status, count]) =>
              createElement("div", {
                key: status,
                className: cn("rounded-full", statusColors[status] || "bg-muted-foreground"),
                style: { width: Math.max((count / relays.length) * 100, 3) + "%" },
                title: `${status}: ${count}`,
              }),
            ),
          ),
          createElement("div", { className: "flex flex-wrap gap-x-4 gap-y-1" },
            ...Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) =>
              createElement("div", { key: status, className: "flex items-center gap-1.5" },
                createElement("span", { className: cn("size-2 rounded-full", statusColors[status] || "bg-muted-foreground") }),
                createElement("span", { className: "text-[11px] capitalize text-muted-foreground" }, status),
                createElement("span", { className: "text-[11px] font-bold font-mono" }, String(count)),
              ),
            ),
          ),
        ) : null,

        // CoinOS health
        coinosStatus || coinosCredits ? createElement("div", { className: "rounded-lg border border-border/40 bg-card p-4" },
          createElement("div", { className: "flex items-center justify-between mb-3" },
            createElement("span", { className: "text-xs font-semibold" }, "CoinOS Wallet"),
            coinosStatus ? createElement("div", { className: "flex items-center gap-1.5" },
              createElement("div", { className: cn("size-2 rounded-full", coinosStatus.healthy ? "bg-emerald-400" : "bg-destructive") }),
              createElement("span", { className: "text-[10px] text-muted-foreground" }, coinosStatus.healthy ? "Healthy" : "Down"),
            ) : null,
          ),
          coinosCredits ? createElement("div", { className: "space-y-1.5" },
            ...[
              { label: "Lightning", value: coinosCredits.lightning, icon: Zap, color: "text-amber-400" },
              { label: "On-chain", value: coinosCredits.bitcoin, icon: Bitcoin, color: "text-orange-400" },
              { label: "Liquid", value: coinosCredits.liquid, icon: Database, color: "text-blue-400" },
            ].map((b) =>
              createElement("div", { key: b.label, className: "flex items-center justify-between py-1" },
                createElement("div", { className: "flex items-center gap-1.5" },
                  createElement(b.icon, { className: cn("size-3", b.color) }),
                  createElement("span", { className: "text-[11px] text-muted-foreground" }, b.label),
                ),
                createElement("span", { className: "text-[11px] font-bold font-mono tabular-nums" }, fmtSats(b.value) + " sats"),
              ),
            ),
          ) : null,
        ) : null,

        // Top relays mini
        influxTopRelays?.available && influxTopRelays.relays.length > 0 ? createElement("div", { className: "rounded-lg border border-border/40 bg-card p-4" },
          createElement("span", { className: "text-xs font-semibold" }, "Top Relays (24h)"),
          createElement("div", { className: "mt-2.5 space-y-1.5" },
            ...influxTopRelays.relays.slice(0, 5).map((r: any, i: number) => {
              const maxVal = influxTopRelays!.relays[0]?._value || 1;
              const barPct = Math.round((r._value / maxVal) * 100);
              return createElement("div", { key: r.relay || i },
                createElement("div", { className: "flex items-center justify-between mb-0.5" },
                  createElement("span", { className: "text-[11px] font-medium truncate max-w-[65%]" }, r.relay || "unknown"),
                  createElement("span", { className: "text-[10px] text-muted-foreground font-mono tabular-nums" }, Math.round(r._value).toLocaleString()),
                ),
                createElement("div", { className: "h-1 rounded-full bg-muted/40 overflow-hidden" },
                  createElement("div", { className: "h-full rounded-full bg-primary/50", style: { width: barPct + "%" } }),
                ),
              );
            }),
          ),
        ) : null,
      ),
    ),

    // ─── Row 3: Recent relays + Recent users ────────────────────────────
    (recentRelays.length > 0 || recentUsers.length > 0) ? createElement("div", { className: "grid gap-3 lg:grid-cols-2" },

      // Recent relays
      recentRelays.length > 0 ? createElement("div", { className: "rounded-lg border border-border/40 bg-card" },
        createElement("div", { className: "px-4 py-3 border-b border-border/30" },
          createElement("span", { className: "text-xs font-semibold" }, "Recent Relays"),
        ),
        createElement("div", { className: "divide-y divide-border/20" },
          ...recentRelays.map((r) =>
            createElement("div", { key: r.id, className: "flex items-center justify-between px-4 py-2" },
              createElement("div", { className: "min-w-0 flex-1 mr-3" },
                createElement("p", { className: "text-[13px] font-medium truncate" }, r.name),
                createElement("p", { className: "text-[10px] text-muted-foreground font-mono truncate" }, r.name + "." + (r.domain || fallbackDomain)),
              ),
              renderStatusBadge(r.status),
            ),
          ),
        ),
      ) : null,

      // Recent users
      recentUsers.length > 0 ? createElement("div", { className: "rounded-lg border border-border/40 bg-card" },
        createElement("div", { className: "px-4 py-3 border-b border-border/30" },
          createElement("span", { className: "text-xs font-semibold" }, "Recent Users"),
        ),
        createElement("div", { className: "divide-y divide-border/20" },
          ...recentUsers.map((u) =>
            createElement("div", { key: u.id, className: "flex items-center justify-between px-4 py-2" },
              createElement("div", { className: "min-w-0 flex-1 mr-3" },
                createElement("p", { className: "text-[13px] font-medium truncate" }, u.name || pubkeyShort(u.pubkey)),
                createElement("p", { className: "text-[10px] text-muted-foreground" }, u._count.relays + " relays · " + u._count.orders + " orders"),
              ),
              u.admin
                ? createElement(Badge, { className: "text-[9px] bg-primary/10 text-primary border-primary/20 shrink-0 px-1.5 py-0" }, "Admin")
                : null,
            ),
          ),
        ),
      ) : null,
    ) : null,
  );
}
