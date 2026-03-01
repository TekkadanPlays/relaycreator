import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { Link } from "inferno-router";
import { api } from "../lib/api";
import { authStore, type User } from "../stores/auth";
import { Card, CardContent } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { Badge } from "@/ui/Badge";
import { Separator } from "@/ui/Separator";
import {
  Globe, Shield, Settings, Lock, Unlock, Loader2, Copy, Check,
  AlertCircle, Users, Zap, ArrowUpDown, Radio, ExternalLink,
} from "@/lib/icons";
import { cn } from "@/ui/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ModeratorData { id: string; user: { id: string; pubkey: string; name?: string | null }; }
interface StreamData { id: string; url: string; direction: string; status: string; }

interface RelayData {
  id: string;
  name: string;
  domain: string | null;
  status: string | null;
  details: string | null;
  default_message_policy: boolean;
  listed_in_directory: boolean;
  payment_required: boolean;
  payment_amount: number;
  auth_required: boolean;
  allow_giftwrap: boolean;
  allow_tagged: boolean;
  profile_image: string | null;
  banner_image: string | null;
  relay_kind_description: string;
  request_payment: boolean;
  request_payment_amount: number;
  owner: { id: string; pubkey: string; name?: string | null };
  moderators: ModeratorData[];
  streams: StreamData[];
}

interface RelayDetailProps { match?: { params?: { slug?: string } }; }

interface RelayDetailState {
  user: User | null;
  relay: RelayData | null;
  loading: boolean;
  error: string;
  copied: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default class RelayDetail extends Component<RelayDetailProps, RelayDetailState> {
  declare state: RelayDetailState;
  private unsub: (() => void) | null = null;

  constructor(props: RelayDetailProps) {
    super(props);
    this.state = { user: authStore.get().user, relay: null, loading: true, error: "", copied: false };
  }

  componentDidMount() {
    this.unsub = authStore.subscribe((s) => this.setState({ user: s.user }));
    const slug = this.props.match?.params?.slug;
    if (slug) this.loadRelay(slug);
  }

  componentWillUnmount() { this.unsub?.(); }

  private async loadRelay(slug: string) {
    this.setState({ loading: true, error: "" });
    try {
      const data = await api.get<{ relay: RelayData }>(`/relays/by-name/${slug}`);
      const r = data?.relay;
      if (!r) { this.setState({ error: "Relay not found", loading: false }); return; }
      this.setState({ relay: r, loading: false });
    } catch (err: any) {
      this.setState({ error: err.message || "Failed to load relay", loading: false });
    }
  }

  private copyWssUrl = () => {
    const { relay } = this.state;
    if (!relay) return;
    const url = `wss://${relay.name}.${relay.domain || "mycelium.social"}`;
    navigator.clipboard.writeText(url).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  private isOwner(): boolean {
    const { user, relay } = this.state;
    if (!user || !relay) return false;
    return user.pubkey === relay.owner.pubkey;
  }

  private shortPubkey(pk: string): string {
    if (pk.length <= 16) return pk;
    return `${pk.slice(0, 8)}...${pk.slice(-8)}`;
  }

  render() {
    const { relay, loading, error, copied } = this.state;

    if (loading) {
      return createElement("div", { className: "flex justify-center py-16" },
        createElement(Loader2, { className: "size-8 animate-spin text-muted-foreground" }),
      );
    }

    if (error || !relay) {
      return createElement("div", { className: "text-center py-16 space-y-2" },
        createElement(AlertCircle, { className: "size-8 text-destructive mx-auto" }),
        createElement("p", { className: "text-destructive" }, error || "Relay not found"),
        createElement(Link, { to: "/directory", className: "text-sm text-primary hover:underline inline-block" }, "Browse directory"),
      );
    }

    const domain = relay.domain || "mycelium.social";
    const wssUrl = `wss://${relay.name}.${domain}`;
    const isOwner = this.isOwner();

    return createElement("div", { className: "max-w-2xl mx-auto space-y-6 animate-in" },

      // Banner + Profile image
      relay.banner_image
        ? createElement("div", { className: "relative rounded-xl overflow-hidden" },
            createElement("img", { src: relay.banner_image, className: "w-full h-40 object-cover" }),
            relay.profile_image
              ? createElement("img", {
                  src: relay.profile_image,
                  className: "absolute -bottom-8 left-6 w-20 h-20 rounded-full border-4 border-background object-cover shadow-lg",
                })
              : null,
          )
        : relay.profile_image
          ? createElement("div", { className: "flex items-center gap-4 pt-2" },
              createElement("img", { src: relay.profile_image, className: "w-16 h-16 rounded-full border border-border/50 object-cover" }),
            )
          : null,

      // Header
      createElement("div", { className: cn("flex items-start justify-between gap-4", (relay.banner_image && relay.profile_image) ? "pt-10" : "") },
        createElement("div", null,
          createElement("h1", { className: "text-2xl font-extrabold tracking-tight flex items-center gap-2.5" },
            createElement(Globe, { className: "size-6 text-primary" }),
            `${relay.name}.${domain}`,
          ),
          relay.relay_kind_description
            ? createElement(Badge, { variant: "secondary", className: "mt-1.5 text-[10px]" }, relay.relay_kind_description)
            : null,
        ),
        createElement("div", { className: "flex items-center gap-2 shrink-0" },
          createElement(Badge, {
            variant: relay.status === "running" ? "default" : "secondary",
            className: cn(relay.status === "running" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"),
          }, relay.status || "unknown"),
          isOwner
            ? createElement(Link, { to: `/relays/${relay.name}/settings` },
                createElement(Button, { variant: "outline", size: "sm", className: "gap-1.5" },
                  createElement(Settings, { className: "size-3.5" }), "Settings",
                ),
              )
            : null,
        ),
      ),

      // WSS URL copy bar
      createElement("div", { className: "flex items-center gap-2" },
        createElement("div", { className: "flex-1 flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-2.5" },
          createElement(Radio, { className: "size-4 text-primary shrink-0" }),
          createElement("code", { className: "text-sm font-mono truncate" }, wssUrl),
        ),
        createElement(Button, {
          variant: "outline", size: "sm", className: "gap-1.5 shrink-0",
          onClick: this.copyWssUrl,
        },
          copied ? createElement(Check, { className: "size-3.5 text-emerald-400" }) : createElement(Copy, { className: "size-3.5" }),
          copied ? "Copied" : "Copy",
        ),
      ),

      // Description
      relay.details
        ? createElement(Card, { className: "border-border/50" },
            createElement(CardContent, { className: "p-5" },
              createElement("p", { className: "text-sm text-muted-foreground leading-relaxed" }, relay.details),
            ),
          )
        : null,

      // Info grid
      createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3" },
        // Write Policy
        createElement("div", { className: "rounded-lg border border-border/50 p-3 space-y-1" },
          createElement("p", { className: "text-[10px] uppercase tracking-wider text-muted-foreground font-medium" }, "Write Policy"),
          createElement("div", { className: "flex items-center gap-1.5" },
            relay.default_message_policy
              ? createElement(Unlock, { className: "size-3.5 text-emerald-400" })
              : createElement(Lock, { className: "size-3.5 text-amber-400" }),
            createElement("p", { className: "text-sm font-medium" },
              relay.default_message_policy ? "Open" : "Restricted",
            ),
          ),
        ),

        // Auth
        createElement("div", { className: "rounded-lg border border-border/50 p-3 space-y-1" },
          createElement("p", { className: "text-[10px] uppercase tracking-wider text-muted-foreground font-medium" }, "Authentication"),
          createElement("div", { className: "flex items-center gap-1.5" },
            relay.auth_required
              ? createElement(Shield, { className: "size-3.5 text-amber-400" })
              : createElement(Shield, { className: "size-3.5 text-emerald-400" }),
            createElement("p", { className: "text-sm font-medium" },
              relay.auth_required ? "NIP-42 Required" : "Not Required",
            ),
          ),
        ),

        // Payment
        createElement("div", { className: "rounded-lg border border-border/50 p-3 space-y-1" },
          createElement("p", { className: "text-[10px] uppercase tracking-wider text-muted-foreground font-medium" }, "Payment"),
          createElement("div", { className: "flex items-center gap-1.5" },
            relay.payment_required
              ? createElement(Zap, { className: "size-3.5 text-amber-400" })
              : createElement(Zap, { className: "size-3.5 text-emerald-400" }),
            createElement("p", { className: "text-sm font-medium" },
              relay.payment_required ? `${relay.payment_amount} sats` : "Free",
            ),
          ),
        ),

        // Giftwrap
        createElement("div", { className: "rounded-lg border border-border/50 p-3 space-y-1" },
          createElement("p", { className: "text-[10px] uppercase tracking-wider text-muted-foreground font-medium" }, "DM Support"),
          createElement("p", { className: "text-sm font-medium" },
            relay.allow_giftwrap ? "NIP-59 Giftwrap" : "No Giftwrap",
          ),
        ),

        // Tagged
        createElement("div", { className: "rounded-lg border border-border/50 p-3 space-y-1" },
          createElement("p", { className: "text-[10px] uppercase tracking-wider text-muted-foreground font-medium" }, "Tagged Events"),
          createElement("p", { className: "text-sm font-medium" },
            relay.allow_tagged ? "Allowed" : "Not Allowed",
          ),
        ),

        // Directory
        createElement("div", { className: "rounded-lg border border-border/50 p-3 space-y-1" },
          createElement("p", { className: "text-[10px] uppercase tracking-wider text-muted-foreground font-medium" }, "Directory"),
          createElement("p", { className: "text-sm font-medium" },
            relay.listed_in_directory ? "Listed" : "Unlisted",
          ),
        ),
      ),

      // Owner
      createElement(Card, { className: "border-border/50" },
        createElement(CardContent, { className: "p-4 flex items-center gap-3" },
          createElement(Users, { className: "size-4 text-muted-foreground shrink-0" }),
          createElement("div", { className: "min-w-0" },
            createElement("p", { className: "text-xs text-muted-foreground" }, "Owner"),
            createElement("p", { className: "text-sm font-medium" }, relay.owner.name || "Anonymous"),
            createElement("p", { className: "text-[10px] font-mono text-muted-foreground truncate" }, this.shortPubkey(relay.owner.pubkey)),
          ),
        ),
      ),

      // Moderators (if any)
      relay.moderators && relay.moderators.length > 0
        ? createElement(Card, { className: "border-border/50" },
            createElement(CardContent, { className: "p-4 space-y-3" },
              createElement("p", { className: "text-xs text-muted-foreground font-medium flex items-center gap-1.5" },
                createElement(Shield, { className: "size-3" }), `Moderators (${relay.moderators.length})`,
              ),
              ...relay.moderators.map((mod) =>
                createElement("div", { key: mod.id, className: "flex items-center gap-2" },
                  createElement("div", { className: "min-w-0" },
                    createElement("p", { className: "text-sm font-medium" }, mod.user.name || "Unknown"),
                    createElement("p", { className: "text-[10px] font-mono text-muted-foreground truncate" }, this.shortPubkey(mod.user.pubkey)),
                  ),
                ),
              ),
            ),
          )
        : null,

      // Streams (if any)
      relay.streams && relay.streams.length > 0
        ? createElement(Card, { className: "border-border/50" },
            createElement(CardContent, { className: "p-4 space-y-3" },
              createElement("p", { className: "text-xs text-muted-foreground font-medium flex items-center gap-1.5" },
                createElement(ArrowUpDown, { className: "size-3" }), `Streams (${relay.streams.length})`,
              ),
              ...relay.streams.map((s) =>
                createElement("div", { key: s.id, className: "flex items-center gap-2" },
                  createElement("code", { className: "text-xs font-mono truncate" }, s.url),
                  createElement(Badge, { variant: "secondary", className: "text-[10px] capitalize shrink-0" }, s.direction),
                  createElement(Badge, {
                    variant: s.status === "running" ? "default" : "secondary",
                    className: cn("text-[10px]", s.status === "running" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"),
                  }, s.status),
                ),
              ),
            ),
          )
        : null,

      // NIP-11 link
      createElement("div", { className: "flex items-center justify-center gap-4 py-2 text-xs text-muted-foreground" },
        createElement("a", {
          href: `/api/sconfig/relay/${relay.id}/nostrjson`,
          target: "_blank",
          rel: "noopener",
          className: "inline-flex items-center gap-1 hover:text-foreground transition-colors",
        }, createElement(ExternalLink, { className: "size-3" }), "NIP-11 Info"),
      ),
    );
  }
}
