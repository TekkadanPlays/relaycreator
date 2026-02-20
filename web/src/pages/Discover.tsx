import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { Link } from "inferno-router";
import { api } from "../lib/api";
import { Card, CardContent } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { Badge } from "@/ui/Badge";
import { Input } from "@/ui/Input";
import { Separator } from "@/ui/Separator";
import { Spinner } from "@/ui/Spinner";
import {
  Globe, Search, Zap, Shield, Radio, RefreshCw, ChevronDown,
  AlertCircle, Server, Settings, Loader2, Check, ExternalLink,
} from "@/lib/icons";
import { cn } from "@/ui/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RelayInfo {
  url: string;
  name: string;
  description: string;
  software: string;
  version: string;
  supportedNips: number[];
  countryCode: string;
  countryName: string;
  city: string;
  isOnline: boolean;
  uptimePct: number | null;
  rttRead: number | null;
  rttWrite: number | null;
  lastSeen: number;
}

type SortMode = "recent" | "name" | "nips" | "rtt" | "uptime";

interface DiscoverState {
  relays: RelayInfo[];
  loading: boolean;
  error: string;
  search: string;
  filterSoftware: string;
  filterNip: number | null;
  filterCountry: string;
  sortBy: SortMode;
  showFilters: boolean;
  rstateAvailable: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseRstateRelay(raw: any): RelayInfo {
  // rstate CompactRelayState schema:
  // relayUrl, network.value, software.family.value, software.version.value,
  // rtt.{open,read,write}.value, nips.list, geo.{lat,lon}, country.value,
  // lastSeenAt, lastOpenAt, observationCount, labels, updated_at
  const url = raw.relayUrl || raw.url || "";
  const sw = raw.software?.family?.value || "";
  const ver = raw.software?.version?.value || "";
  const nips: number[] = Array.isArray(raw.nips?.list) ? raw.nips.list : [];
  const countryCode = raw.country?.value || "";

  // Determine online status: if lastOpenAt is within the last 30 minutes
  const now = Math.floor(Date.now() / 1000);
  const lastOpen = raw.lastOpenAt || 0;
  const isOnline = lastOpen > 0 && (now - lastOpen) < 1800;

  return {
    url,
    name: url.replace("wss://", "").replace("ws://", "").replace(/\/$/, ""),
    description: "",
    software: sw,
    version: ver,
    supportedNips: nips.sort((a, b) => a - b),
    countryCode,
    countryName: countryCode,
    city: "",
    isOnline,
    uptimePct: null,
    rttRead: raw.rtt?.read?.value ?? null,
    rttWrite: raw.rtt?.write?.value ?? null,
    lastSeen: raw.lastSeenAt ?? raw.updated_at ?? 0,
  };
}

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1F1E6 + c.charCodeAt(0) - 65),
  );
}

function sortRelays(relays: RelayInfo[], mode: SortMode): RelayInfo[] {
  const copy = [...relays];
  switch (mode) {
    case "name": return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "nips": return copy.sort((a, b) => b.supportedNips.length - a.supportedNips.length);
    case "rtt": return copy.sort((a, b) => (a.rttRead ?? 9999) - (b.rttRead ?? 9999));
    case "uptime": return copy.sort((a, b) => (b.uptimePct ?? 0) - (a.uptimePct ?? 0));
    case "recent":
    default: return copy.sort((a, b) => b.lastSeen - a.lastSeen);
  }
}

function collectSoftware(relays: RelayInfo[]): string[] {
  const s = new Set<string>();
  for (const r of relays) if (r.software) s.add(r.software);
  return Array.from(s).sort();
}

function collectNips(relays: RelayInfo[]): number[] {
  const s = new Set<number>();
  for (const r of relays) for (const n of r.supportedNips) s.add(n);
  return Array.from(s).sort((a, b) => a - b);
}

// ─── Component ──────────────────────────────────────────────────────────────

export default class Discover extends Component<{}, DiscoverState> {
  declare state: DiscoverState;

  constructor(props: {}) {
    super(props);
    this.state = {
      relays: [], loading: true, error: "", search: "",
      filterSoftware: "", filterNip: null, filterCountry: "",
      sortBy: "recent", showFilters: false, rstateAvailable: true,
    };
  }

  componentDidMount() { this.fetchRelays(); }

  private async fetchRelays() {
    this.setState({ loading: true, error: "" });
    try {
      // Fetch all relays from rstate via API proxy, paginating in chunks of 200 (max)
      let allRelays: RelayInfo[] = [];
      let offset = 0;
      const limit = 200;
      let total = Infinity;

      while (offset < total) {
        const res = await fetch(`/api/rstate/relays?limit=${limit}&offset=${offset}&sortBy=lastSeen&sortOrder=desc`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        total = data.total ?? 0;
        const rawList = Array.isArray(data.relays) ? data.relays : [];
        if (rawList.length === 0) break;
        const parsed = rawList.map(parseRstateRelay).filter((r: RelayInfo) => r.url);
        allRelays = allRelays.concat(parsed);
        offset += limit;
        // Safety cap at 2000 relays
        if (allRelays.length >= 2000) break;
      }

      if (allRelays.length === 0) throw new Error("No relays returned");
      this.setState({ relays: allRelays, loading: false, rstateAvailable: true });
    } catch (err: any) {
      console.error("rstate fetch failed:", err);
      this.setState({ loading: false, error: "Could not connect to relay intelligence service. rstate may be unavailable.", rstateAvailable: false });
    }
  }

  private getFiltered(): RelayInfo[] {
    const { relays, search, filterSoftware, filterNip, filterCountry, sortBy } = this.state;
    let result = relays;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        r.url.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) || r.software.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) || r.countryName.toLowerCase().includes(q),
      );
    }
    if (filterSoftware) result = result.filter((r) => r.software === filterSoftware);
    if (filterNip !== null) result = result.filter((r) => r.supportedNips.includes(filterNip!));
    if (filterCountry) result = result.filter((r) => r.countryCode === filterCountry);
    return sortRelays(result, sortBy);
  }

  private get filterCount(): number {
    let c = 0;
    if (this.state.filterSoftware) c++;
    if (this.state.filterNip !== null) c++;
    if (this.state.filterCountry) c++;
    if (this.state.sortBy !== "recent") c++;
    return c;
  }

  private clearFilters = () => {
    this.setState({ filterSoftware: "", filterNip: null, filterCountry: "", sortBy: "recent", search: "" });
  };

  render() {
    const { relays, loading, error, search, filterSoftware, filterNip, filterCountry, sortBy, showFilters, rstateAvailable } = this.state;
    const filtered = this.getFiltered();
    const softwareOpts = collectSoftware(relays);
    const nipOpts = collectNips(relays);
    const fc = this.filterCount;

    return createElement("div", { className: "max-w-4xl mx-auto space-y-6 animate-in" },
      // Hero
      createElement("div", { className: "flex items-start justify-between gap-4" },
        createElement("div", null,
          createElement("h1", { className: "text-2xl font-extrabold tracking-tight flex items-center gap-2.5" },
            createElement(Globe, { className: "size-6 text-primary" }),
            "Discover Relays",
          ),
          createElement("p", { className: "text-sm text-muted-foreground mt-1" },
            "Browse the global Nostr relay network. Data from ",
            createElement("span", { className: "font-medium" }, rstateAvailable ? "rstate" : "NIP-66 monitors"),
            ".",
          ),
        ),
        createElement("div", { className: "flex items-center gap-2 shrink-0" },
          createElement(Link, { to: "/relays" },
            createElement(Button, { variant: "outline", size: "sm", className: "gap-1.5" },
              createElement(Settings, { className: "size-3.5" }), "Manager",
            ),
          ),
          createElement(Button, {
            variant: "ghost", size: "sm", className: "gap-1.5",
            onClick: () => this.fetchRelays(),
          },
            createElement(RefreshCw, { className: "size-3.5" }), "Refresh",
          ),
        ),
      ),

      // Search + filters toggle
      createElement("div", { className: "flex gap-2" },
        createElement("div", { className: "relative flex-1" },
          createElement(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" }),
          createElement(Input, {
            value: search,
            onInput: (e: Event) => this.setState({ search: (e.target as HTMLInputElement).value }),
            placeholder: "Search by name, URL, software, city, country...",
            className: "pl-9",
          }),
        ),
        createElement(Button, {
          variant: showFilters ? "default" : "outline", size: "sm",
          onClick: () => this.setState({ showFilters: !showFilters }),
          className: "gap-1.5 shrink-0",
        },
          createElement(ChevronDown, { className: cn("size-3.5 transition-transform", showFilters && "rotate-180") }),
          "Filters",
          fc > 0 ? createElement(Badge, { variant: "secondary", className: "text-[10px] ml-1 h-4 px-1" }, String(fc)) : null,
        ),
      ),

      // Filter panel
      showFilters
        ? createElement(Card, { className: "border-border/50" },
            createElement(CardContent, { className: "p-4 space-y-4" },
              createElement("div", { className: "flex items-center justify-between" },
                createElement("p", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground" }, "Filters & Sort"),
                fc > 0 ? createElement("button", { onClick: this.clearFilters, className: "text-xs text-primary hover:underline cursor-pointer" }, "Clear all") : null,
              ),

              // Software
              createElement("div", null,
                createElement("label", { className: "text-xs text-muted-foreground mb-1.5 block" }, "Software"),
                createElement("div", { className: "flex flex-wrap gap-1.5" },
                  createElement("button", {
                    onClick: () => this.setState({ filterSoftware: "" }),
                    className: cn("text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer", !filterSoftware ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"),
                  }, "All"),
                  ...softwareOpts.map((sw) =>
                    createElement("button", {
                      key: sw,
                      onClick: () => this.setState({ filterSoftware: filterSoftware === sw ? "" : sw }),
                      className: cn("text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer", filterSoftware === sw ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"),
                    }, sw),
                  ),
                ),
              ),

              // NIPs
              createElement("div", null,
                createElement("label", { className: "text-xs text-muted-foreground mb-1.5 block" }, "Supports NIP"),
                createElement("div", { className: "flex flex-wrap gap-1" },
                  createElement("button", {
                    onClick: () => this.setState({ filterNip: null }),
                    className: cn("text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer", filterNip === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"),
                  }, "Any"),
                  ...nipOpts.slice(0, 40).map((n) =>
                    createElement("button", {
                      key: String(n),
                      onClick: () => this.setState({ filterNip: filterNip === n ? null : n }),
                      className: cn("text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer", filterNip === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"),
                    }, String(n).padStart(2, "0")),
                  ),
                ),
              ),

              // Sort
              createElement("div", null,
                createElement("label", { className: "text-xs text-muted-foreground mb-1.5 block" }, "Sort by"),
                createElement("div", { className: "flex gap-1.5" },
                  ...(["recent", "name", "nips", "rtt", "uptime"] as SortMode[]).map((key) =>
                    createElement("button", {
                      key,
                      onClick: () => this.setState({ sortBy: key }),
                      className: cn("text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer capitalize", sortBy === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"),
                    }, key === "rtt" ? "Fastest RTT" : key === "nips" ? "Most NIPs" : key === "uptime" ? "Best Uptime" : key === "name" ? "Name" : "Recent"),
                  ),
                ),
              ),
            ),
          )
        : null,

      // Stats bar
      createElement("div", { className: "flex items-center gap-3 text-xs text-muted-foreground" },
        loading
          ? createElement("span", { className: "flex items-center gap-1.5 animate-pulse" },
              createElement(Loader2, { className: "size-3 animate-spin" }), "Loading relays...",
            )
          : createElement("span", null,
              String(filtered.length) + " relay" + (filtered.length !== 1 ? "s" : ""),
              relays.length !== filtered.length ? ` (of ${relays.length} total)` : "",
            ),
        error ? createElement("span", { className: "text-destructive" }, error) : null,
      ),

      // Relay list
      loading
        ? createElement("div", { className: "flex justify-center py-16" },
            createElement(Spinner, { size: "lg" }),
          )
        : filtered.length > 0
          ? createElement("div", { className: "space-y-2" },
              ...filtered.slice(0, 100).map((relay) => this.renderRelayCard(relay)),
            )
          : createElement("div", { className: "text-center py-16 space-y-3" },
              createElement(Globe, { className: "size-12 text-muted-foreground/20 mx-auto" }),
              createElement("p", { className: "text-sm text-muted-foreground" },
                fc > 0 ? "No relays match your filters." : "No relays found.",
              ),
              fc > 0 ? createElement("button", { onClick: this.clearFilters, className: "text-xs text-primary hover:underline cursor-pointer" }, "Clear filters") : null,
            ),
    );
  }

  private renderRelayCard(relay: RelayInfo) {
    const flag = countryFlag(relay.countryCode);
    const { filterNip } = this.state;

    return createElement("div", {
      key: relay.url,
      className: "rounded-xl border border-border/50 p-4 hover:border-primary/20 transition-all hover:shadow-sm",
    },
      createElement("div", { className: "flex items-start justify-between gap-3" },
        createElement("div", { className: "flex-1 min-w-0" },
          // Name row
          createElement("div", { className: "flex items-center gap-2 mb-1" },
            flag ? createElement("span", { className: "text-sm shrink-0" }, flag) : null,
            createElement("span", { className: "text-sm font-semibold truncate" }, relay.name),
            relay.software
              ? createElement(Badge, { variant: "secondary", className: "text-[10px] shrink-0" },
                  relay.software + (relay.version ? " " + relay.version : ""),
                )
              : null,
            relay.isOnline
              ? createElement("span", { className: "size-2 rounded-full bg-emerald-500 shrink-0" })
              : createElement("span", { className: "size-2 rounded-full bg-destructive shrink-0" }),
          ),

          // URL
          createElement("p", { className: "text-xs font-mono text-muted-foreground truncate" }, relay.url),

          // Metrics row
          createElement("div", { className: "flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-muted-foreground" },
            relay.city || relay.countryName
              ? createElement("span", null, (relay.city ? relay.city + ", " : "") + relay.countryName)
              : null,
            relay.rttRead !== null
              ? createElement("span", {
                  className: relay.rttRead < 200 ? "text-emerald-500" : relay.rttRead < 500 ? "text-amber-500" : "text-destructive",
                }, relay.rttRead + "ms")
              : null,
            relay.uptimePct !== null
              ? createElement("span", {
                  className: relay.uptimePct > 95 ? "text-emerald-500" : relay.uptimePct > 80 ? "text-amber-500" : "text-destructive",
                }, relay.uptimePct.toFixed(1) + "% uptime")
              : null,
          ),

          // Description
          relay.description
            ? createElement("p", { className: "text-xs text-muted-foreground mt-1.5 line-clamp-2" }, relay.description)
            : null,

          // NIP badges
          relay.supportedNips.length > 0
            ? createElement("div", { className: "flex flex-wrap gap-1 mt-2" },
                ...relay.supportedNips.slice(0, 12).map((n) =>
                  createElement("button", {
                    key: String(n),
                    onClick: () => this.setState({ filterNip: n, showFilters: true }),
                    className: cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer",
                      filterNip === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent",
                    ),
                  }, "NIP-" + String(n).padStart(2, "0")),
                ),
                relay.supportedNips.length > 12
                  ? createElement("span", { className: "text-[10px] text-muted-foreground/50" }, "+" + (relay.supportedNips.length - 12) + " more")
                  : null,
              )
            : null,
        ),

        // Copy URL button
        createElement(Button, {
          variant: "outline", size: "sm", className: "shrink-0 text-xs gap-1",
          onClick: () => navigator.clipboard.writeText(relay.url),
        }, "Copy URL"),
      ),
    );
  }
}
