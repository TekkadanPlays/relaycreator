import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { Chart, registerables } from "chart.js";
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

function css(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function fmtSats(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 100_000 ? 0 : 1) + "k";
  return String(n);
}

// ---------------------------------------------------------------------------
// ChartBox — reusable Chart.js wrapper, theme-aware, auto-rebuilds on theme
// ---------------------------------------------------------------------------

interface ChartBoxProps {
  type: "line" | "bar" | "doughnut";
  height?: number;
  datasets: { data: number[]; label: string; color: string; fill?: boolean }[];
  labels: string[];
  legendPos?: "top" | "right" | "bottom" | false;
  cutout?: string;
}

class ChartBox extends Component<ChartBoxProps, {}> {
  private ref: HTMLCanvasElement | null = null;
  private chart: Chart | null = null;
  private obs: MutationObserver | null = null;

  componentDidMount() {
    this.build();
    this.obs = new MutationObserver(() => setTimeout(() => this.build(), 60));
    this.obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
  }
  componentDidUpdate(prev: ChartBoxProps) {
    if (prev.datasets !== this.props.datasets || prev.labels !== this.props.labels) this.build();
  }
  componentWillUnmount() { this.chart?.destroy(); this.obs?.disconnect(); }

  private build() {
    if (!this.ref) return;
    this.chart?.destroy();
    const { type, datasets, labels, legendPos, cutout } = this.props;
    const h = this.props.height || 160;
    const border = css("--border") || "oklch(0.3 0 0)";
    const muted = css("--muted-foreground") || "oklch(0.556 0 0)";
    const ctx = this.ref.getContext("2d")!;

    const chartDs = datasets.map((ds) => {
      if (type === "doughnut") {
        // For doughnut, color is a comma-separated string of oklch colors
        const colors = typeof ds.color === "string" && ds.color.includes(",") ? ds.color.split(",") : ds.data.map(() => ds.color);
        return { label: ds.label, data: ds.data, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 };
      }
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, ds.color.includes("oklch") ? ds.color.replace(")", " / 0.18)") : ds.color + "2e");
      grad.addColorStop(1, "transparent");
      return {
        label: ds.label, data: ds.data, borderColor: ds.color,
        backgroundColor: type === "bar" ? ds.color + "cc" : (ds.fill !== false ? grad : "transparent"),
        fill: ds.fill !== false, tension: 0.4, pointRadius: 0, pointHoverRadius: 3,
        borderWidth: type === "bar" ? 0 : 1.5, barPercentage: 0.6, borderRadius: type === "bar" ? 3 : 0,
      };
    });

    const isDoughnut = type === "doughnut";
    this.chart = new Chart(ctx, {
      type,
      data: { labels, datasets: chartDs as any },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: isDoughnut ? undefined : { intersect: false, mode: "index" },
        cutout: cutout || undefined,
        plugins: {
          legend: legendPos === false
            ? { display: false }
            : { display: true, position: legendPos || "top", labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: "circle", padding: 10, color: muted, font: { size: 10 } } },
          tooltip: {
            backgroundColor: "hsl(0 0% 8%)", titleColor: "#fff", bodyColor: "#ccc",
            borderColor: border, borderWidth: 1, cornerRadius: 6, padding: 8,
            titleFont: { size: 10, weight: "600" as any }, bodyFont: { size: 10 },
          },
        },
        scales: isDoughnut ? {} : {
          x: { grid: { display: false }, ticks: { color: muted, maxTicksLimit: 6, font: { size: 9 } }, border: { display: false } },
          y: { grid: { color: border + "15" }, ticks: { color: muted, font: { size: 9 }, maxTicksLimit: 5 }, border: { display: false }, beginAtZero: true },
        },
      } as any,
    });
  }

  render() {
    return createElement("div", { style: { height: (this.props.height || 160) + "px" } },
      createElement("canvas", { ref: (el: any) => { this.ref = el; } } as any),
    );
  }
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

  // Status counts for donut
  const sc: Record<string, number> = {};
  relays.forEach((r) => { sc[r.status || "unknown"] = (sc[r.status || "unknown"] || 0) + 1; });
  const statusLabels = Object.keys(sc);
  const statusValues = Object.values(sc);
  const statusClr: Record<string, string> = { running: "oklch(0.7 0.17 162)", provision: "oklch(0.75 0.18 80)", stopped: "oklch(0.6 0.2 25)", unknown: "oklch(0.5 0 0)" };
  const statusDotClr: Record<string, string> = { running: "bg-emerald-400", provision: "bg-amber-400", stopped: "bg-red-400", unknown: "bg-muted-foreground" };

  // Range pills
  const rangePills = createElement("div", { className: "inline-flex rounded-md border border-border/40 p-0.5 gap-0.5" },
    ...["24h", "7d", "30d"].map((r) =>
      createElement("button", {
        key: r, type: "button", onClick: () => onInfluxRangeChange(r),
        className: cn("px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors",
          influxRange === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"),
      }, r),
    ),
  );

  // Influx chart data
  const hasInflux = influxPlatform?.available && (influxPlatform.events.length > 0 || influxPlatform.connections.length > 0);
  const influxLabels = hasInflux
    ? (influxPlatform!.events.length > 0 ? influxPlatform!.events : influxPlatform!.connections).map((r: any) => {
        const d = new Date(r._time);
        return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric" });
      })
    : [];
  const influxDs: { data: number[]; label: string; color: string }[] = [];
  if (hasInflux && influxPlatform!.events.length > 0) influxDs.push({ data: influxPlatform!.events.map((r: any) => r._value ?? 0), label: "Events", color: css("--primary") || "oklch(0.648 0.2 132)" });
  if (hasInflux && influxPlatform!.connections.length > 0) influxDs.push({ data: influxPlatform!.connections.map((r: any) => r._value ?? 0), label: "Connections", color: "oklch(0.55 0.2 264)" });

  // Top relays bar data
  const topRelays = influxTopRelays?.available ? influxTopRelays.relays.slice(0, 5) : [];

  return createElement("div", { className: "space-y-3" },

    // ─── Row 1: Stat strip ──────────────────────────────────────────────
    createElement("div", { className: "flex flex-wrap gap-x-6 gap-y-2 px-1" },
      ...[
        { icon: Radio, color: "text-primary", label: "Relays", val: String(o.totalRelays), sub: o.runningRelays + " running" },
        { icon: Users, color: "text-blue-400", label: "Users", val: String(o.totalUsers), sub: null },
        { icon: BarChart3, color: "text-amber-400", label: "Orders", val: String(o.totalOrders), sub: o.paidOrders + " paid" },
        { icon: DollarSign, color: "text-emerald-400", label: "Revenue", val: fmtSats(o.totalRevenue) + " sats", sub: null },
        { icon: Activity, color: "text-emerald-400", label: "Uptime", val: o.totalRelays ? Math.round((o.runningRelays / o.totalRelays) * 100) + "%" : "—", sub: null },
      ].map((s) =>
        createElement("div", { key: s.label, className: "flex items-center gap-2" },
          createElement(s.icon, { className: cn("size-3.5", s.color) }),
          createElement("span", { className: "text-[11px] text-muted-foreground" }, s.label),
          createElement("span", { className: "text-sm font-bold font-mono tabular-nums" }, s.val),
          s.sub ? createElement("span", { className: "text-[10px] text-muted-foreground" }, s.sub) : null,
        ),
      ),
    ),

    // ─── Row 2: Main chart + donut + CoinOS ─────────────────────────────
    createElement("div", { className: "grid gap-3 lg:grid-cols-4" },

      // Activity chart — spans 3 cols
      createElement("div", { className: "lg:col-span-3 rounded-lg border border-border/40 bg-card p-3" },
        createElement("div", { className: "flex items-center justify-between mb-2" },
          createElement("span", { className: "text-[11px] font-semibold" }, "Platform Activity"),
          rangePills,
        ),
        hasInflux
          ? createElement(ChartBox, { type: "line", height: 200, labels: influxLabels, datasets: influxDs })
          : influxLoading
            ? createElement("div", { className: "h-[200px] flex items-center justify-center text-xs text-muted-foreground animate-pulse" }, "Loading metrics...")
            : createElement("div", { className: "h-[200px] flex items-center justify-center text-center" },
                createElement("div", null,
                  createElement(Activity, { className: "size-6 text-muted-foreground/20 mx-auto mb-1" }),
                  createElement("p", { className: "text-[11px] text-muted-foreground" }, "No InfluxDB data yet"),
                ),
              ),
      ),

      // Right col: donut + CoinOS stacked
      createElement("div", { className: "space-y-3" },

        // Relay status donut
        relays.length > 0 ? createElement("div", { className: "rounded-lg border border-border/40 bg-card p-3" },
          createElement("span", { className: "text-[11px] font-semibold" }, "Relay Status"),
          createElement("div", { className: "mt-2" },
            createElement(ChartBox, {
              type: "doughnut", height: 110, cutout: "65%", legendPos: false,
              labels: statusLabels,
              datasets: [{ label: "Status", data: statusValues, color: statusLabels.map((s) => statusClr[s] || "oklch(0.5 0 0)").join(",") }],
            }),
          ),
          createElement("div", { className: "flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2" },
            ...statusLabels.map((s, i) =>
              createElement("div", { key: s, className: "flex items-center gap-1" },
                createElement("span", { className: cn("size-1.5 rounded-full", statusDotClr[s] || "bg-muted-foreground") }),
                createElement("span", { className: "text-[10px] capitalize text-muted-foreground" }, s),
                createElement("span", { className: "text-[10px] font-bold font-mono" }, String(statusValues[i])),
              ),
            ),
          ),
        ) : null,

        // CoinOS
        coinosCredits ? createElement("div", { className: "rounded-lg border border-border/40 bg-card p-3" },
          createElement("div", { className: "flex items-center justify-between mb-2" },
            createElement("span", { className: "text-[11px] font-semibold" }, "CoinOS"),
            coinosStatus ? createElement("span", { className: cn("size-1.5 rounded-full inline-block", coinosStatus.healthy ? "bg-emerald-400" : "bg-destructive") }) : null,
          ),
          ...[
            { l: "Lightning", v: coinosCredits.lightning, c: "text-amber-400", icon: Zap },
            { l: "On-chain", v: coinosCredits.bitcoin, c: "text-orange-400", icon: Bitcoin },
            { l: "Liquid", v: coinosCredits.liquid, c: "text-blue-400", icon: Database },
          ].map((b) =>
            createElement("div", { key: b.l, className: "flex items-center justify-between py-0.5" },
              createElement("div", { className: "flex items-center gap-1" },
                createElement(b.icon, { className: cn("size-3", b.c) }),
                createElement("span", { className: "text-[10px] text-muted-foreground" }, b.l),
              ),
              createElement("span", { className: "text-[10px] font-bold font-mono tabular-nums" }, fmtSats(b.v)),
            ),
          ),
        ) : null,
      ),
    ),

    // ─── Row 3: Top relays bar + Recent relays + Recent users ───────────
    createElement("div", { className: "grid gap-3 lg:grid-cols-3" },

      // Top relays horizontal bar chart
      topRelays.length > 0 ? createElement("div", { className: "rounded-lg border border-border/40 bg-card p-3" },
        createElement("span", { className: "text-[11px] font-semibold" }, "Top Relays (24h events)"),
        createElement("div", { className: "mt-2" },
          createElement(ChartBox, {
            type: "bar", height: 140, legendPos: false,
            labels: topRelays.map((r: any) => r.relay || "?"),
            datasets: [{ label: "Events", data: topRelays.map((r: any) => Math.round(r._value)), color: css("--primary") || "oklch(0.648 0.2 132)" }],
          }),
        ),
      ) : null,

      // Recent relays — 5 rows, single-line each
      relays.length > 0 ? createElement("div", { className: "rounded-lg border border-border/40 bg-card" },
        createElement("div", { className: "px-3 py-2 border-b border-border/20 flex items-center justify-between" },
          createElement("span", { className: "text-[11px] font-semibold" }, "Recent Relays"),
          createElement("span", { className: "text-[10px] text-muted-foreground font-mono" }, String(relays.length) + " total"),
        ),
        ...relays.slice(0, 5).map((r) =>
          createElement("div", { key: r.id, className: "flex items-center justify-between px-3 py-1.5 border-b border-border/10 last:border-0" },
            createElement("div", { className: "flex items-center gap-2 min-w-0 flex-1" },
              createElement("span", { className: cn("size-1.5 rounded-full shrink-0", r.status === "running" ? "bg-emerald-400" : r.status === "provision" ? "bg-amber-400" : "bg-muted-foreground") }),
              createElement("span", { className: "text-[12px] font-medium truncate" }, r.name),
            ),
            createElement("span", { className: "text-[10px] text-muted-foreground font-mono shrink-0 ml-2" },
              r.name + "." + (r.domain || fallbackDomain).split(".")[0],
            ),
          ),
        ),
      ) : null,

      // Recent users — 5 rows
      users.length > 0 ? createElement("div", { className: "rounded-lg border border-border/40 bg-card" },
        createElement("div", { className: "px-3 py-2 border-b border-border/20 flex items-center justify-between" },
          createElement("span", { className: "text-[11px] font-semibold" }, "Recent Users"),
          createElement("span", { className: "text-[10px] text-muted-foreground font-mono" }, String(users.length) + " total"),
        ),
        ...users.slice(0, 5).map((u) =>
          createElement("div", { key: u.id, className: "flex items-center justify-between px-3 py-1.5 border-b border-border/10 last:border-0" },
            createElement("div", { className: "flex items-center gap-2 min-w-0 flex-1" },
              u.admin ? createElement("span", { className: "size-1.5 rounded-full bg-primary shrink-0" }) : createElement("span", { className: "size-1.5 rounded-full bg-muted-foreground/40 shrink-0" }),
              createElement("span", { className: "text-[12px] font-medium truncate" }, u.name || pubkeyShort(u.pubkey)),
            ),
            createElement("span", { className: "text-[10px] text-muted-foreground shrink-0 ml-2" },
              u._count.relays + "r · " + u._count.orders + "o",
            ),
          ),
        ),
      ) : null,
    ),
  );
}
