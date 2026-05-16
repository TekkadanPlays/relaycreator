import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { Input } from "@/ui/Input";
import { Button } from "@/ui/Button";
import { Separator } from "@/ui/Separator";
import { Spinner } from "@/ui/Spinner";
import {
  Globe, Search, Zap, Shield, Radio, RefreshCw, Server,
  Activity, AlertCircle, ChevronDown, ChevronUp, ExternalLink,
  Check, X, Filter,
} from "@/lib/icons";
import { cn } from "@/ui/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RelayState {
  url: string;
  name: string;
  online: boolean;
  software: string;
  version: string;
  nips: number[];
  uptimePct: number;
  rttOpen: number;
  rttRead: number;
  rttWrite: number;
  country: string;
  lastSeen: number;
}

interface SoftwareGroup {
  name: string;
  count: number;
}

interface NetworkStats {
  total: number;
  online: number;
  offline: number;
  avgUptime: number;
  avgRtt: number;
  softwareGroups: SoftwareGroup[];
}

type SortMode = "url" | "uptime" | "rtt" | "software" | "nips";
type FilterMode = "all" | "online" | "offline";

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

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseRelay(raw: any): RelayState {
  const url = raw.relayUrl || raw.url || "";
  let sw = raw.software?.family?.value || "";
  if (sw.includes("/") || sw.includes("://")) {
    sw = sw.replace(/^git\+/, "").replace(/\.git$/, "");
    const parts = sw.split("/").filter(Boolean);
    sw = parts[parts.length - 1] || sw;
  }
  const ver = raw.software?.version?.value || "";
  const nips: number[] = Array.isArray(raw.nips?.list) ? raw.nips.list : [];
  const now = Math.floor(Date.now() / 1000);
  const lastOpen = raw.lastOpenAt || 0;
  const isOnline = raw.online ?? (lastOpen > 0 && (now - lastOpen) < 1800);
  const uptimePct = typeof raw.uptimePercentage === "number" ? raw.uptimePercentage
    : raw.uptime?.allTime?.value ? raw.uptime.allTime.value * 100 : 0;

  return {
    url,
    name: url.replace("wss://", "").replace("ws://", "").replace(/\/$/, ""),
    online: isOnline,
    software: sw,
    version: ver,
    nips,
    uptimePct,
    rttOpen: raw.rtt?.open?.value || 0,
    rttRead: raw.rtt?.read?.value || 0,
    rttWrite: raw.rtt?.write?.value || 0,
    country: raw.country?.value || "",
    lastSeen: lastOpen,
  };
}

function computeStats(relays: RelayState[]): NetworkStats {
  const online = relays.filter((r) => r.online).length;
  const offline = relays.length - online;
  const withUptime = relays.filter((r) => r.uptimePct > 0);
  const avgUptime = withUptime.length > 0
    ? withUptime.reduce((s, r) => s + r.uptimePct, 0) / withUptime.length
    : 0;
  const withRtt = relays.filter((r) => r.rttOpen > 0);
  const avgRtt = withRtt.length > 0
    ? withRtt.reduce((s, r) => s + r.rttOpen, 0) / withRtt.length
    : 0;

  const swMap = new Map<string, number>();
  for (const r of relays) {
    if (r.software) {
      swMap.set(r.software, (swMap.get(r.software) || 0) + 1);
    }
  }
  const softwareGroups: SoftwareGroup[] = Array.from(swMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return { total: relays.length, online, offline, avgUptime, avgRtt, softwareGroups };
}

function uptimeColor(pct: number): string {
  if (pct >= 99) return "text-emerald-500";
  if (pct >= 95) return "text-emerald-400";
  if (pct >= 80) return "text-amber-400";
  return "text-red-400";
}

function rttColor(ms: number): string {
  if (ms <= 100) return "text-emerald-400";
  if (ms <= 300) return "text-amber-400";
  return "text-red-400";
}

function timeAgo(ts: number): string {
  if (!ts) return "never";
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default class Monitor extends Component<{}, MonitorState> {
  declare state: MonitorState;
  private refreshTimer: any = null;

  constructor(props: {}) {
    super(props);
    this.state = {
      relays: [],
      stats: { total: 0, online: 0, offline: 0, avgUptime: 0, avgRtt: 0, softwareGroups: [] },
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
      const res = await api("/api/rstate/relays?limit=5000");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.relays || data.data || [];
      const relays = list.map(parseRelay);
      const stats = computeStats(relays);
      this.setState({ relays, stats, loading: false, lastRefresh: Date.now() });
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
    const { stats, loading, error, search, filterStatus, filterSoftware, showFilters, lastRefresh, autoRefresh } = this.state;
    const filtered = this.getFiltered();
    const SortIcon = this.state.sortAsc ? ChevronUp : ChevronDown;

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
        this.renderStatCard("Avg RTT",
          stats.avgRtt > 0 ? `${Math.round(stats.avgRtt)}ms` : "—",
          Zap, rttColor(stats.avgRtt)),
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
                ? filtered.slice(0, 200).map((relay) => this.renderRelayRow(relay))
                : createElement("div", { className: "px-4 py-12 text-center text-sm text-muted-foreground" },
                    "No relays match your filters.",
                  ),
            ),
            // Footer
            createElement("div", { className: "px-4 py-2 bg-muted/30 border-t text-xs text-muted-foreground" },
              `Showing ${Math.min(filtered.length, 200)} of ${filtered.length} relays`,
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
    const SortIcon = this.state.sortAsc ? ChevronUp : ChevronDown;
    return createElement("button", {
      className: cn(
        "flex items-center gap-1 hover:text-foreground transition-colors text-left",
        active ? "text-foreground" : "",
      ),
      onClick: () => this.toggleSort(col),
    },
      label,
      active ? createElement(SortIcon, { className: "size-3" }) : null,
    );
  }

  renderRelayRow(relay: RelayState) {
    return createElement("div", {
      key: relay.url,
      className: "grid grid-cols-[1fr_80px_80px_100px_60px] gap-2 px-4 py-2.5 hover:bg-muted/30 transition-colors items-center text-sm",
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
