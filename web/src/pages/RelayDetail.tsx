import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { Link } from "inferno-router";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { Loader2, Globe, Shield, Settings, Lock, Unlock } from "@/lib/icons";

interface RelayDetailProps {
  match?: { params?: { slug?: string } };
}

interface RelayData {
  id: string;
  name: string;
  domain: string;
  description?: string;
  auth_required?: boolean;
  status: string;
  port: number;
}

interface RelayDetailState {
  relay: RelayData | null;
  loading: boolean;
  error: string;
}

// TODO: Port full relay detail view with NIP-11 info, copy buttons, owner actions from React version
export default class RelayDetail extends Component<RelayDetailProps, RelayDetailState> {
  declare state: RelayDetailState;

  constructor(props: RelayDetailProps) {
    super(props);
    this.state = { relay: null, loading: true, error: "" };
  }

  componentDidMount() {
    const slug = this.props.match?.params?.slug;
    if (slug) this.loadRelay(slug);
  }

  private async loadRelay(slug: string) {
    try {
      const relay = await api.get<RelayData>(`/relays/${slug}`);
      this.setState({ relay, loading: false });
    } catch (err: any) {
      this.setState({ error: err.message, loading: false });
    }
  }

  render() {
    const { relay, loading, error } = this.state;

    if (loading) {
      return createElement("div", { className: "flex justify-center py-16" },
        createElement(Loader2, { className: "size-8 animate-spin text-muted-foreground" }),
      );
    }

    if (error || !relay) {
      return createElement("div", { className: "text-center py-16" },
        createElement("p", { className: "text-destructive" }, error || "Relay not found"),
      );
    }

    return createElement("div", { className: "max-w-2xl mx-auto space-y-6 animate-in" },
      createElement(Card, null,
        createElement(CardHeader, null,
          createElement("div", { className: "flex items-center justify-between" },
            createElement(CardTitle, { className: "flex items-center gap-2" },
              createElement(Globe, { className: "size-5 text-primary" }),
              `${relay.name}.${relay.domain}`,
            ),
            createElement(Badge, { variant: relay.status === "running" ? "default" : "secondary" }, relay.status),
          ),
        ),
        createElement(CardContent, { className: "space-y-4" },
          relay.description
            ? createElement("p", { className: "text-sm text-muted-foreground" }, relay.description)
            : null,
          createElement("div", { className: "flex items-center gap-2 text-sm" },
            relay.auth_required
              ? createElement("span", { className: "flex items-center gap-1" }, createElement(Lock, { className: "size-3" }), "NIP-42 Auth Required")
              : createElement("span", { className: "flex items-center gap-1" }, createElement(Unlock, { className: "size-3" }), "Open Access"),
          ),
          createElement(Link, { to: `/relays/${relay.name}/settings`, className: "inline-flex items-center gap-1.5 text-sm text-primary hover:underline" },
            createElement(Settings, { className: "size-4" }), "Relay Settings",
          ),
        ),
      ),
    );
  }
}
