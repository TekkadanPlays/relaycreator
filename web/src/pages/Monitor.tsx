import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { Input } from "@/ui/Input";
import { Button } from "@/ui/Button";
import { Spinner } from "@/ui/Spinner";
import {
  Globe, Search, Zap, Shield, RefreshCw, Server,
  Activity, AlertCircle, ChevronDown,
} from "@/lib/icons";
import { cn } from "@/ui/utils";
import {
  type RelayState, type NetworkStats, type SortMode, type FilterMode,
  fetchAllRelays, computeStats,
  uptimeColor, rttColor, timeAgo,
} from "./monitor/types";

// ─── Component State ────────────────────────────────────────────────────────

interface MonitorState {
  relays: RelayState[];
  stats: NetworkStats;
  loading: boolean;
  error: string;
  search: string;
  sortBy: SortMode;
  sortAsc: boolean;
  filterStatus: FilterMode;
  filterSoftware: string;
  showFilters: boolean;
  lastRefresh: number;
  autoRefresh: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default class Monitor extends Component<{}, MonitorState> {
  declare state: MonitorState;
  private refreshTimer: any = null;

  constructor(props: {}) {
    super(props);
    this.state = {
      relays: [],
      stats: { total: 0, online: 0, offline: 0, avgUptime: 0, medianRtt: 0, softwareGroups: [], geoGroups: [], nipAdoption: [] },
      loading: true,
      error: "",
      search: "",
      sortBy: "uptime",
      sortAsc: false,
      filterStatus: "all",
      filterSoftware: "",
      showFilters: false,
      lastRefresh: 0,
      autoRefresh: true,
    };
  }

  componentDidMount() {
    this.fetchRelays();
    // Auto-refresh every 60s
    this.refreshTimer = setInterval(() => {
      if (this.state.autoRefresh) this.fetchRelays();
    }, 60000);
  }

  componentWillUnmount() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  async fetchRelays() {
    this.setState({ loading: true, error: "" });
    try {
      const allRelays = await fetchAllRelays();
      const stats = computeStats(allRelays);
      this.setState({ relays: allRelays, stats, loading: false, lastRefresh: Date.now() });
    } catch (err: any) {
      this.setState({ loading: false, error: err.message || "Failed to fetch relay data" });
    }
  }

  getFiltered(): RelayState[] {
    let list = [...this.state.relays];
    const { search, filterStatus, filterSoftware, sortBy, sortAsc } = this.state;

    // Filter
    if (filterStatus === "online") list = list.filter((r) => r.online);
    if (filterStatus === "offline") list = list.filter((r) => !r.online);
    if (filterSoftware) list = list.filter((r) => r.software.toLowerCase() === filterSoftware.toLowerCase());
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.url.toLowerCase().includes(q) ||
        r.software.toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "url": cmp = a.url.localeCompare(b.url); break;
        case "uptime": cmp = b.uptimePct - a.uptimePct; break;
        case "rtt": cmp = (a.rttOpen || 9999) - (b.rttOpen || 9999); break;
        case "software": cmp = a.software.localeCompare(b.software); break;
        case "nips": cmp = b.nips.length - a.nips.length; break;
      }
      return sortAsc ? -cmp : cmp;
    });

    return list;
  }

  toggleSort(col: SortMode) {
    if (this.state.sortBy === col) {
      this.setState({ sortAsc: !this.state.sortAsc });
    } else {
      this.setState({ sortBy: col, sortAsc: false });
    }
  }

  render() {
    const { stats, loading, error, search, filterStatus, filterSoftware, lastRefresh } = this.state;
    const filtered = this.getFiltered();

    return createElement("div", { className: "max-w-7xl mx-auto px-4 py-8 space-y-6" },

      // ── Header ──
      createElement("div", { className: "flex flex-col sm:flex-row sm:items-end justify-between gap-4" },
        createElement("div", null,
          createElement("h1", { className: "text-3xl font-bold tracking-tight" }, "Relay Monitor"),
          createElement("p", { className: "text-muted-foreground mt-1" },
            "Real-time health telemetry for the Nostr relay network"
          ),
        ),
        createElement("div", { className: "flex items-center gap-2" },
          lastRefresh > 0
            ? createElement("span", { className: "text-xs text-muted-foreground" },
                `Updated ${timeAgo(Math.floor(lastRefresh / 1000))}`
              )
            : null,
          createElement(Button, {
            variant: "outline", size: "sm",
            onClick: () => this.fetchRelays(),
            disabled: loading,
          },
            createElement(RefreshCw, { className: cn("size-3.5 mr-1.5", loading ? "animate-spin" : "") }),
            "Refresh",
          ),
        ),
      ),

      // ── Stats Cards ──
      createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3" },
        this.renderStatCard("Total Relays", stats.total.toLocaleString(), Globe, "text-blue-400"),
        this.renderStatCard("Online", stats.online.toLocaleString(), Activity,
          stats.online > 0 ? "text-emerald-400" : "text-muted-foreground"),
        this.renderStatCard("Avg Uptime",
          stats.avgUptime > 0 ? `${stats.avgUptime.toFixed(1)}%` : "—",
          Shield, uptimeColor(stats.avgUptime)),
        this.renderStatCard("Median RTT",
          stats.medianRtt > 0 ? `${Math.round(stats.medianRtt)}ms` : "—",
          Zap, rttColor(stats.medianRtt)),
      ),

      // ── Software Distribution ──
      stats.softwareGroups.length > 0
        ? createElement(Card, null,
            createElement(CardHeader, { className: "pb-3" },
              createElement(CardTitle, { className: "text-sm font-medium flex items-center gap-2" },
                createElement(Server, { className: "size-4" }),
                "Software Distribution",
              ),
            ),
            createElement(CardContent, null,
              createElement("div", { className: "flex flex-wrap gap-1.5" },
                ...stats.softwareGroups.slice(0, 15).map((sg) =>
                  createElement(Badge, {
                    key: sg.name,
                    variant: filterSoftware === sg.name ? "default" : "outline",
                    className: "cursor-pointer text-xs",
                    onClick: () => this.setState({
                      filterSoftware: filterSoftware === sg.name ? "" : sg.name,
                    }),
                  }, `${sg.name} (${sg.count})`)
                ),
              ),
            ),
          )
        : null,

      // ── Search + Filters ──
      createElement("div", { className: "flex flex-col sm:flex-row gap-3" },
        createElement("div", { className: "relative flex-1" },
          createElement(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" }),
          createElement(Input, {
            placeholder: "Search relays by URL, software, country...",
            className: "pl-9",
            value: search,
            onInput: (e: any) => this.setState({ search: e.target.value }),
          }),
        ),
        createElement("div", { className: "flex gap-2" },
          ...(["all", "online", "offline"] as FilterMode[]).map((mode) =>
            createElement(Button, {
              key: mode,
              variant: filterStatus === mode ? "default" : "outline",
              size: "sm",
              onClick: () => this.setState({ filterStatus: mode }),
            }, mode === "all" ? `All (${stats.total})` : mode === "online" ? `Online (${stats.online})` : `Offline (${stats.offline})`)
          ),
        ),
      ),

      // ── Error ──
      error
        ? createElement("div", { className: "rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center gap-3" },
            createElement(AlertCircle, { className: "size-5 text-destructive shrink-0" }),
            createElement("p", { className: "text-sm" }, error),
          )
        : null,

      // ── Loading ──
      loading && this.state.relays.length === 0
        ? createElement("div", { className: "flex items-center justify-center py-20" },
            createElement(Spinner, null),
            createElement("span", { className: "ml-3 text-muted-foreground" }, "Loading relay network data..."),
          )
        : null,

      // ── Relay Table ──
      !loading || this.state.relays.length > 0
        ? createElement("div", { className: "rounded-lg border bg-card overflow-hidden" },
            // Table header
            createElement("div", {
              className: "grid grid-cols-[1fr_80px_80px_100px_60px] gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b",
            },
              this.renderSortHeader("Relay", "url"),
              this.renderSortHeader("Uptime", "uptime"),
              this.renderSortHeader("RTT", "rtt"),
              this.renderSortHeader("Software", "software"),
              this.renderSortHeader("NIPs", "nips"),
            ),
            // Rows
            createElement("div", { className: "divide-y divide-border/50 max-h-[600px] overflow-y-auto" },
              filtered.length > 0
                ? filtered.slice(0, 500).map((relay) => this.renderRelayRow(relay))
                : createElement("div", { className: "px-4 py-12 text-center text-sm text-muted-foreground" },
                    "No relays match your filters.",
                  ),
            ),
            // Footer
            createElement("div", { className: "px-4 py-2 bg-muted/30 border-t text-xs text-muted-foreground" },
              `Showing ${Math.min(filtered.length, 500)} of ${filtered.length} relays`,
            ),
          )
        : null,
    );
  }

  renderStatCard(label: string, value: string, Icon: any, iconColor: string) {
    return createElement(Card, null,
      createElement(CardContent, { className: "p-4 flex items-center gap-3" },
        createElement("div", { className: cn("p-2 rounded-lg bg-muted/50", iconColor) },
          createElement(Icon, { className: "size-5" }),
        ),
        createElement("div", null,
          createElement("p", { className: "text-2xl font-bold tracking-tight" }, value),
          createElement("p", { className: "text-xs text-muted-foreground" }, label),
        ),
      ),
    );
  }

  renderSortHeader(label: string, col: SortMode) {
    const active = this.state.sortBy === col;
    return createElement("button", {
      className: cn(
        "flex items-center gap-1 hover:text-foreground transition-colors text-left",
        active ? "text-foreground" : "",
      ),
      onClick: () => this.toggleSort(col),
    },
      label,
      active ? createElement(ChevronDown, { className: "size-3" }) : null,
    );
  }

  renderRelayRow(relay: RelayState) {
    // /monitor/wss/relay.example.com → MonitorDetail reconstructs the URL
    const detailPath = `/monitor/${relay.url.replace("://", "/")}`;
    return createElement("a", {
      key: relay.url,
      href: detailPath,
      className: "grid grid-cols-[1fr_80px_80px_100px_60px] gap-2 px-4 py-2.5 hover:bg-muted/30 transition-colors items-center text-sm cursor-pointer no-underline text-inherit",
    },
      // URL + status
      createElement("div", { className: "flex items-center gap-2 min-w-0" },
        createElement("span", {
          className: cn("size-2 rounded-full shrink-0",
            relay.online ? "bg-emerald-500" : "bg-red-400/60",
          ),
        }),
        createElement("span", { className: "truncate font-mono text-xs" }, relay.name),
        relay.country
          ? createElement("span", { className: "text-[10px] text-muted-foreground shrink-0" }, relay.country)
          : null,
      ),
      // Uptime
      createElement("span", {
        className: cn("text-xs font-mono tabular-nums", relay.uptimePct > 0 ? uptimeColor(relay.uptimePct) : "text-muted-foreground"),
      }, relay.uptimePct > 0 ? `${relay.uptimePct.toFixed(1)}%` : "—"),
      // RTT
      createElement("span", {
        className: cn("text-xs font-mono tabular-nums", relay.rttOpen > 0 ? rttColor(relay.rttOpen) : "text-muted-foreground"),
      }, relay.rttOpen > 0 ? `${relay.rttOpen}ms` : "—"),
      // Software
      createElement("span", { className: "text-xs text-muted-foreground truncate" },
        relay.software
          ? `${relay.software}${relay.version ? ` v${relay.version}` : ""}`
          : "—",
      ),
      // NIPs count
      createElement("span", { className: "text-xs text-muted-foreground tabular-nums" },
        relay.nips.length > 0 ? relay.nips.length.toString() : "—",
      ),
    );
  }
}
