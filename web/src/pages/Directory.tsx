import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { Link } from "inferno-router";
import { api } from "../lib/api";
import { Card, CardContent } from "@/ui/Card";
import { Input } from "@/ui/Input";
import { Badge } from "@/ui/Badge";
import { Loader2, Globe, Search, Lock, Unlock, Radio } from "@/lib/icons";
import { cn } from "@/ui/utils";

interface Relay {
  id: string;
  name: string;
  domain: string;
  description?: string;
  auth_required?: boolean;
  status: string;
}

interface DirectoryState {
  relays: Relay[];
  loading: boolean;
  search: string;
  error: string;
}

// TODO: Port full directory with relay cards, search, copy buttons from React version
export default class Directory extends Component<{}, DirectoryState> {
  declare state: DirectoryState;

  constructor(props: {}) {
    super(props);
    this.state = { relays: [], loading: true, search: "", error: "" };
  }

  componentDidMount() {
    this.loadRelays();
  }

  private async loadRelays() {
    try {
      const data = await api.get<{ relays: Relay[] }>("/relays/public");
      this.setState({ relays: data.relays || [], loading: false });
    } catch (err: any) {
      this.setState({ error: err.message, loading: false });
    }
  }

  render() {
    const { relays, loading, search, error } = this.state;
    const filtered = relays.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(search.toLowerCase())
    );

    return createElement("div", { className: "space-y-6 animate-in" },
      createElement("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" },
        createElement("div", null,
          createElement("h1", { className: "text-3xl font-bold tracking-tight" }, "Relay Directory"),
          createElement("p", { className: "text-muted-foreground mt-1" }, "Browse public Nostr relays"),
        ),
        createElement("div", { className: "relative w-full sm:w-72" },
          createElement(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" }),
          createElement(Input, {
            className: "pl-9",
            placeholder: "Search relays...",
            value: search,
            onInput: (e: Event) => this.setState({ search: (e.target as HTMLInputElement).value }),
          }),
        ),
      ),

      loading
        ? createElement("div", { className: "flex justify-center py-16" },
            createElement(Loader2, { className: "size-8 animate-spin text-muted-foreground" }),
          )
        : error
          ? createElement("p", { className: "text-destructive text-center py-8" }, error)
          : createElement("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" },
              ...filtered.map((relay) =>
                createElement(Link, { to: `/relays/${relay.name}`, key: relay.id },
                  createElement(Card, { className: "hover:border-primary/30 transition-colors cursor-pointer" },
                    createElement(CardContent, { className: "p-4 space-y-2" },
                      createElement("div", { className: "flex items-center justify-between" },
                        createElement("div", { className: "flex items-center gap-2" },
                          createElement(Radio, { className: "size-4 text-primary" }),
                          createElement("span", { className: "font-semibold text-sm" }, relay.name),
                        ),
                        relay.auth_required
                          ? createElement(Badge, { variant: "secondary" }, createElement(Lock, { className: "size-3 mr-1" }), "Auth")
                          : createElement(Badge, { variant: "outline" }, createElement(Unlock, { className: "size-3 mr-1" }), "Open"),
                      ),
                      createElement("p", { className: "text-xs text-muted-foreground truncate" },
                        relay.description || `${relay.name}.${relay.domain}`,
                      ),
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}
