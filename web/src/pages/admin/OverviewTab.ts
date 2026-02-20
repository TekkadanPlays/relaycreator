import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { Chart, registerables } from "chart.js";
import { Card, CardContent } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { cn } from "@/ui/utils";
import { Radio, Users, Activity, BarChart3, Bitcoin, Zap, Database } from "@/lib/icons";
import { renderStatusBadge, renderLoading, pubkeyShort } from "./helpers";
import type { OverviewData, CoinosStatus, CoinosCreditsData } from "./types";

Chart.register(...registerables);

// ---------------------------------------------------------------------------
// CSS variable reader for Chart.js theming
// ---------------------------------------------------------------------------

function getCSSVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ---------------------------------------------------------------------------
// InfluxChart — renders a Chart.js line chart from InfluxDB time-series data
// ---------------------------------------------------------------------------

interface InfluxChartProps {
  data: any[];
  label: string;
  color?: string;
  type?: "line" | "bar";
}

class InfluxChart extends Component<InfluxChartProps, {}> {
  private canvasRef: HTMLCanvasElement | null = null;
  private chart: Chart | null = null;
  private observer: MutationObserver | null = null;

  componentDidMount() {
    this.renderChart();
    this.observer = new MutationObserver(() => setTimeout(() => this.renderChart(), 50));
    this.observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
  }

  componentDidUpdate(prevProps: InfluxChartProps) {
    if (prevProps.data !== this.props.data) this.renderChart();
  }

  componentWillUnmount() {
    this.chart?.destroy();
    this.observer?.disconnect();
  }

  private renderChart() {
    if (!this.canvasRef) return;
    this.chart?.destroy();

    const rows = this.props.data || [];
    if (rows.length === 0) return;

    const primary = this.props.color || getCSSVar("--primary") || "oklch(0.648 0.2 132)";
    const border = getCSSVar("--border") || "oklch(0.3 0 0)";
    const mutedFg = getCSSVar("--muted-foreground") || "oklch(0.556 0 0)";

    const labels = rows.map((r: any) => {
      const d = new Date(r._time);
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    });
    const values = rows.map((r: any) => r._value ?? 0);

    const ctx = this.canvasRef.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, primary.includes("oklch") ? primary.replace(")", " / 0.25)") : primary + "40");
    gradient.addColorStop(1, "transparent");

    this.chart = new Chart(ctx, {
      type: this.props.type || "line",
      data: {
        labels,
        datasets: [{
          label: this.props.label,
          data: values,
          borderColor: primary,
          backgroundColor: this.props.type === "bar" ? primary : gradient,
          fill: this.props.type !== "bar",
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 3,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "hsl(0 0% 10%)",
            titleColor: "#fff",
            bodyColor: "#fff",
            borderColor: border,
            borderWidth: 1,
            cornerRadius: 8,
            padding: 10,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: mutedFg, maxTicksLimit: 8, font: { size: 10 } },
            border: { display: false },
          },
          y: {
            grid: { color: border + "30" },
            ticks: { color: mutedFg, font: { size: 10 } },
            border: { display: false },
            beginAtZero: true,
          },
        },
      },
    });
  }

  render() {
    return createElement("div", { style: { height: "200px" } },
      createElement("canvas", { ref: (el: any) => { this.canvasRef = el; } } as any),
    );
  }
}

// ---------------------------------------------------------------------------
// Stat card helper
// ---------------------------------------------------------------------------

function StatCard(props: { label: string; value: string; icon: any; color: string }) {
  return createElement(Card, { className: "border-border/50" },
    createElement(CardContent, { className: "p-4" },
      createElement("div", { className: "flex items-center justify-between" },
        createElement("div", null,
          createElement("p", { className: "text-[10px] font-medium uppercase tracking-wider text-muted-foreground" }, props.label),
          createElement("p", { className: "text-2xl font-bold font-mono tabular-nums mt-1" }, props.value),
        ),
        createElement("div", { className: "rounded-lg p-2.5 bg-muted/30" },
          createElement(props.icon, { className: cn("size-5", props.color) }),
        ),
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// renderOverview — the full dashboard
// ---------------------------------------------------------------------------

export function renderOverview(
  overview: OverviewData | null,
  overviewLoading: boolean,
  fallbackDomain: string,
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

  const o = overview || { totalRelays: 0, runningRelays: 0, totalUsers: 0, totalOrders: 0, recentRelays: [], recentUsers: [] };

  return createElement("div", { className: "space-y-6" },

    // ─── Stat cards ───────────────────────────────────────────────────
    createElement("div", { className: "grid gap-3 grid-cols-2 lg:grid-cols-4" },
      createElement(StatCard, { label: "Total Relays", value: String(o.totalRelays), icon: Radio, color: "text-primary" }),
      createElement(StatCard, { label: "Running", value: String(o.runningRelays), icon: Activity, color: "text-emerald-400" }),
      createElement(StatCard, { label: "Users", value: String(o.totalUsers), icon: Users, color: "text-blue-400" }),
      createElement(StatCard, { label: "Orders", value: String(o.totalOrders), icon: BarChart3, color: "text-amber-400" }),
    ),

    // ─── CoinOS balance row ───────────────────────────────────────────
    coinosStatus || coinosCredits ? createElement(Card, { className: "border-border/50" },
      createElement(CardContent, { className: "p-4" },
        createElement("div", { className: "flex items-center justify-between flex-wrap gap-3" },
          createElement("div", { className: "flex items-center gap-3" },
            createElement(Bitcoin, { className: "size-5 text-amber-400" }),
            createElement("div", null,
              createElement("p", { className: "text-sm font-semibold" }, "CoinOS"),
              coinosStatus ? createElement("div", { className: "flex items-center gap-1.5 mt-0.5" },
                createElement("span", { className: cn("size-1.5 rounded-full", coinosStatus.healthy ? "bg-emerald-400" : "bg-destructive") }),
                createElement("span", { className: "text-xs text-muted-foreground" }, coinosStatus.healthy ? "Healthy" : "Down"),
              ) : null,
            ),
          ),
          coinosCredits ? createElement("div", { className: "flex items-center gap-4" },
            ...[
              { label: "Lightning", value: coinosCredits.lightning },
              { label: "On-chain", value: coinosCredits.bitcoin },
              { label: "Liquid", value: coinosCredits.liquid },
            ].filter((b) => b.value > 0).map((b) =>
              createElement("div", { key: b.label, className: "text-right" },
                createElement("p", { className: "text-xs text-muted-foreground" }, b.label),
                createElement("p", { className: "text-sm font-bold font-mono tabular-nums" },
                  (b.value / 1000).toFixed(b.value > 100000 ? 0 : 1) + "k sats",
                ),
              ),
            ),
          ) : null,
        ),
      ),
    ) : null,

    // ─── InfluxDB charts ──────────────────────────────────────────────
    influxPlatform?.available ? createElement("div", { className: "space-y-4" },
      // Range selector
      createElement("div", { className: "flex items-center justify-between" },
        createElement("h3", { className: "text-sm font-semibold" }, "Platform Metrics"),
        createElement("div", { className: "flex gap-1" },
          ...["24h", "7d", "30d"].map((r) =>
            createElement("button", {
              key: r,
              type: "button",
              onClick: () => onInfluxRangeChange(r),
              className: cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                influxRange === r
                  ? "bg-primary text-primary-foreground"
                  : "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
              ),
            }, r),
          ),
        ),
      ),

      // Charts grid
      createElement("div", { className: "grid gap-4 lg:grid-cols-2" },
        // Events chart
        createElement(Card, { className: "border-border/50" },
          createElement(CardContent, { className: "p-4" },
            createElement("div", { className: "flex items-center gap-2 mb-3" },
              createElement(Zap, { className: "size-4 text-primary" }),
              createElement("p", { className: "text-sm font-semibold" }, "Events Allowed"),
            ),
            influxPlatform.events.length > 0
              ? createElement(InfluxChart, { data: influxPlatform.events, label: "Events" })
              : createElement("div", { className: "h-[200px] flex items-center justify-center text-xs text-muted-foreground" }, "No event data"),
          ),
        ),
        // Connections chart
        createElement(Card, { className: "border-border/50" },
          createElement(CardContent, { className: "p-4" },
            createElement("div", { className: "flex items-center gap-2 mb-3" },
              createElement(Database, { className: "size-4 text-blue-400" }),
              createElement("p", { className: "text-sm font-semibold" }, "Active Connections"),
            ),
            influxPlatform.connections.length > 0
              ? createElement(InfluxChart, { data: influxPlatform.connections, label: "Connections", color: "oklch(0.488 0.243 264)" })
              : createElement("div", { className: "h-[200px] flex items-center justify-center text-xs text-muted-foreground" }, "No connection data"),
          ),
        ),
      ),
    ) : influxLoading ? createElement(Card, { className: "border-border/50" },
      createElement(CardContent, { className: "p-8 text-center" },
        createElement("p", { className: "text-sm text-muted-foreground" }, "Loading metrics..."),
      ),
    ) : null,

    // ─── Top relays + Recent activity ─────────────────────────────────
    createElement("div", { className: "grid gap-4 lg:grid-cols-2" },

      // Top relays by events
      influxTopRelays?.available && influxTopRelays.relays.length > 0 ? createElement(Card, { className: "border-border/50" },
        createElement(CardContent, { className: "p-4" },
          createElement("h3", { className: "text-sm font-semibold mb-3" }, "Top Relays (24h events)"),
          createElement("div", { className: "space-y-2" },
            ...influxTopRelays.relays.slice(0, 8).map((r: any, i: number) => {
              const maxVal = influxTopRelays!.relays[0]?._value || 1;
              const pct = Math.round((r._value / maxVal) * 100);
              return createElement("div", { key: r.relay || i, className: "space-y-1" },
                createElement("div", { className: "flex items-center justify-between text-xs" },
                  createElement("span", { className: "font-medium truncate" }, r.relay || "unknown"),
                  createElement("span", { className: "text-muted-foreground font-mono tabular-nums" }, String(Math.round(r._value))),
                ),
                createElement("div", { className: "h-1.5 rounded-full bg-muted/50 overflow-hidden" },
                  createElement("div", { className: "h-full rounded-full bg-primary/60", style: { width: pct + "%" } }),
                ),
              );
            }),
          ),
        ),
      ) : null,

      // Recent relays
      o.recentRelays?.length ? createElement(Card, { className: "border-border/50" },
        createElement(CardContent, { className: "p-4" },
          createElement("h3", { className: "text-sm font-semibold mb-3" }, "Recent Relays"),
          createElement("div", { className: "divide-y divide-border/30" },
            ...o.recentRelays.slice(0, 5).map((r) =>
              createElement("div", { key: r.id, className: "flex items-center justify-between py-2.5" },
                createElement("div", null,
                  createElement("p", { className: "font-medium text-sm" }, r.name),
                  createElement("p", { className: "text-xs text-muted-foreground font-mono" }, r.name + "." + (r.domain || fallbackDomain)),
                ),
                renderStatusBadge(r.status),
              ),
            ),
          ),
        ),
      ) : null,
    ),

    // Recent users
    o.recentUsers?.length ? createElement(Card, { className: "border-border/50" },
      createElement(CardContent, { className: "p-4" },
        createElement("h3", { className: "text-sm font-semibold mb-3" }, "Recent Users"),
        createElement("div", { className: "divide-y divide-border/30" },
          ...o.recentUsers.slice(0, 5).map((u) =>
            createElement("div", { key: u.id, className: "flex items-center justify-between py-2.5" },
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
      ),
    ) : null,
  );
}
