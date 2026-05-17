import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Spinner } from "@/ui/Spinner";
import {
  Globe, Zap, Shield, ArrowLeft, Server,
  Activity, AlertCircle, Clock,
} from "@/lib/icons";
import { cn } from "@/ui/utils";
import {
  type RelayState,
  fetchAllRelays,
  uptimeColor, rttColor, timeAgo, countryFlag, nipAdoptionColor,
} from "./monitor/types";

// ─── State ──────────────────────────────────────────────────────────────────

interface DetailState {
  relay: RelayState | null;
  loading: boolean;
  error: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default class MonitorDetail extends Component<{ match?: any }, DetailState> {
  declare state: DetailState;

  constructor(props: any) {
    super(props);
    this.state = { relay: null, loading: true, error: "" };
  }

  componentDidMount() {
    this.fetchRelay();
  }

  private getRelayUrl(): string {
    // Route is /monitor/wss/relay.example.com or /monitor/ws/relay.example.com
    // match.params.rest* captures everything after /monitor/
    const rest = this.props.match?.params?.rest || this.props.match?.params?.[0] || "";
    if (!rest) return "";
    // Reconstruct: "wss/relay.example.com/path" → "wss://relay.example.com/path"
    const cleaned = rest.replace(/^\/+/, "");
    const slashIdx = cleaned.indexOf("/");
    if (slashIdx === -1) return "";
    const scheme = cleaned.substring(0, slashIdx);
    const host = cleaned.substring(slashIdx + 1);
    return `${scheme}://${host}`;
  }

  async fetchRelay() {
    this.setState({ loading: true, error: "" });
    const targetUrl = this.getRelayUrl();
    if (!targetUrl) {
      this.setState({ loading: false, error: "Invalid relay URL" });
      return;
    }
    try {
      const allRelays = await fetchAllRelays();
      const found = allRelays.find((r) => r.url === targetUrl);
      if (!found) {
        this.setState({ loading: false, error: `Relay not found: ${targetUrl}` });
        return;
      }
      this.setState({ relay: found, loading: false });
    } catch (err: any) {
      this.setState({ loading: false, error: err.message || "Failed to fetch relay data" });
    }
  }

  render() {
    const { relay, loading, error } = this.state;

    return createElement("div", { className: "max-w-4xl mx-auto px-4 py-8 space-y-6" },

      // ── Back button ──
      createElement("a", {
        href: "/monitor",
        className: "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors",
      },
        createElement(ArrowLeft, { className: "size-4" }),
        "Back to relay list",
      ),

      // ── Loading ──
      loading
        ? createElement("div", { className: "flex items-center justify-center py-20" },
            createElement(Spinner, null),
            createElement("span", { className: "ml-3 text-muted-foreground" }, "Loading relay data..."),
          )
        : null,

      // ── Error ──
      error
        ? createElement("div", { className: "rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center gap-3" },
            createElement(AlertCircle, { className: "size-5 text-destructive shrink-0" }),
            createElement("p", { className: "text-sm" }, error),
          )
        : null,

      // ── Relay Detail ──
      relay ? this.renderDetail(relay) : null,
    );
  }

  renderDetail(relay: RelayState) {
    const flag = countryFlag(relay.country);

    return createElement("div", { className: "space-y-6" },

      // ── Header ──
      createElement("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3" },
        createElement("div", null,
          createElement("h1", { className: "text-2xl font-bold tracking-tight font-mono" }, relay.name),
          createElement("p", { className: "text-sm text-muted-foreground mt-0.5 font-mono" }, relay.url),
        ),
        createElement("div", { className: "flex items-center gap-2" },
          createElement("span", {
            className: cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
              relay.online
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/15 text-red-400 border border-red-500/30",
            ),
          },
            createElement("span", {
              className: cn("size-2 rounded-full", relay.online ? "bg-emerald-500" : "bg-red-400"),
            }),
            relay.online ? "Online" : "Offline",
          ),
        ),
      ),

      // ── Stats Cards ──
      createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3" },
        this.renderStatCard("Uptime",
          relay.uptimePct > 0 ? `${relay.uptimePct.toFixed(1)}%` : "—",
          Shield, relay.uptimePct > 0 ? uptimeColor(relay.uptimePct) : "text-muted-foreground"),
        this.renderStatCard("RTT Open",
          relay.rttOpen > 0 ? `${relay.rttOpen}ms` : "—",
          Zap, relay.rttOpen > 0 ? rttColor(relay.rttOpen) : "text-muted-foreground"),
        this.renderStatCard("RTT Read",
          relay.rttRead > 0 ? `${relay.rttRead}ms` : "—",
          Activity, relay.rttRead > 0 ? rttColor(relay.rttRead) : "text-muted-foreground"),
        this.renderStatCard("RTT Write",
          relay.rttWrite > 0 ? `${relay.rttWrite}ms` : "—",
          Clock, relay.rttWrite > 0 ? rttColor(relay.rttWrite) : "text-muted-foreground"),
      ),

      // ── Info Cards Row ──
      createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3" },

        // Software
        createElement(Card, null,
          createElement(CardHeader, { className: "pb-2" },
            createElement(CardTitle, { className: "text-sm font-medium flex items-center gap-2" },
              createElement(Server, { className: "size-4" }),
              "Software",
            ),
          ),
          createElement(CardContent, null,
            relay.software
              ? createElement("div", { className: "space-y-1" },
                  createElement("p", { className: "text-lg font-semibold" }, relay.software),
                  relay.version
                    ? createElement("p", { className: "text-sm text-muted-foreground" }, `Version ${relay.version}`)
                    : null,
                )
              : createElement("p", { className: "text-sm text-muted-foreground" }, "Unknown"),
          ),
        ),

        // Country / Geo
        createElement(Card, null,
          createElement(CardHeader, { className: "pb-2" },
            createElement(CardTitle, { className: "text-sm font-medium flex items-center gap-2" },
              createElement(Globe, { className: "size-4" }),
              "Location",
            ),
          ),
          createElement(CardContent, null,
            relay.country
              ? createElement("div", { className: "flex items-center gap-2" },
                  flag ? createElement("span", { className: "text-2xl" }, flag) : null,
                  createElement("span", { className: "text-lg font-semibold" }, relay.country),
                )
              : createElement("p", { className: "text-sm text-muted-foreground" }, "Unknown"),
          ),
        ),
      ),

      // ── Last Seen ──
      relay.lastSeen > 0
        ? createElement("p", { className: "text-xs text-muted-foreground" },
            `Last seen: ${timeAgo(relay.lastSeen)}`,
          )
        : null,

      // ── NIP List ──
      relay.nips.length > 0
        ? createElement(Card, null,
            createElement(CardHeader, { className: "pb-3" },
              createElement(CardTitle, { className: "text-sm font-medium flex items-center gap-2" },
                createElement(Shield, { className: "size-4" }),
                `Supported NIPs (${relay.nips.length})`,
              ),
            ),
            createElement(CardContent, null,
              createElement("div", { className: "flex flex-wrap gap-1.5" },
                ...relay.nips.sort((a, b) => a - b).map((nip) =>
                  createElement("span", {
                    key: String(nip),
                    className: cn(
                      "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono border",
                      nipAdoptionColor(50), // individual relay doesn't have global adoption context
                    ),
                  }, `NIP-${String(nip).padStart(2, "0")}`)
                ),
              ),
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
}
