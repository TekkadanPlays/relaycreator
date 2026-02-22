import { createElement } from "inferno-create-element";
import { Link } from "inferno-router";
import { Badge } from "@/ui/Badge";
import { cn } from "@/ui/utils";
import {
  Lock, Globe, Plus, Check, Copy, ExternalLink, Settings, Radio,
} from "@/lib/icons";
import { renderLoading, pubkeyShort } from "./helpers";
import type { MyRelay } from "./types";
import type { User } from "../../stores/auth";

export function renderMyRelays(
  user: User | null,
  myRelays: MyRelay[],
  moderatedRelays: MyRelay[],
  myRelaysLoading: boolean,
  myRelaysError: string,
  copiedRelayId: string | null,
  fallbackDomain: string,
  onCopyWss: (relay: MyRelay) => void,
  onOpenSettings?: (slug: string) => void,
) {
  if (!user) {
    return createElement("div", { className: "flex flex-col items-center justify-center py-24 text-center" },
      createElement(Lock, { className: "size-10 text-muted-foreground/30 mb-4" }),
      createElement("h2", { className: "text-xl font-bold" }, "Sign in to view your relays"),
      createElement("p", { className: "mt-1 text-sm text-muted-foreground" }, "Use a NIP-07 browser extension to authenticate"),
    );
  }

  if (myRelaysLoading) return renderLoading();
  if (myRelaysError) {
    return createElement("div", { className: "rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive" }, myRelaysError);
  }

  const allRelays = [...myRelays, ...moderatedRelays.filter((m) => !myRelays.some((r) => r.id === m.id))];
  const running = allRelays.filter((r) => r.status === "running").length;

  return createElement("div", { className: "space-y-6" },
    createElement("div", { className: "flex items-center justify-between" },
      createElement("div", null,
        createElement("h2", { className: "text-lg font-semibold" }, "My Relays"),
        createElement("p", { className: "text-sm text-muted-foreground" },
          allRelays.length + " relay" + (allRelays.length !== 1 ? "s" : "") + (allRelays.length > 0 ? ` \u00B7 ${running} running` : ""),
        ),
      ),
      createElement(Link, { to: "/signup", className: "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors" },
        createElement(Plus, { className: "size-4" }), "New Relay",
      ),
    ),

    allRelays.length === 0
      ? createElement("div", { className: "flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center" },
          createElement(Globe, { className: "size-10 text-muted-foreground/30 mb-4" }),
          createElement("h3", { className: "font-semibold" }, "No relays yet"),
          createElement("p", { className: "mt-1 text-sm text-muted-foreground max-w-sm" }, "Create your first Nostr relay and join the decentralized network"),
          createElement(Link, { to: "/signup", className: "mt-6 inline-flex items-center gap-2 rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors" },
            createElement(Radio, { className: "size-4" }), "Create Your First Relay",
          ),
        )
      : createElement("div", { className: "rounded-lg border border-border/50 divide-y divide-border/30" },
          ...allRelays.map((relay) =>
            createElement("div", { key: relay.id, className: "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center hover:bg-muted/20 transition-colors" },
              createElement("div", { className: "flex items-center gap-3 min-w-0 flex-1" },
                createElement("span", { className: cn("size-2.5 rounded-full shrink-0",
                  relay.status === "running" ? "bg-emerald-400" :
                  relay.status === "provision" ? "bg-amber-400 animate-pulse" :
                  "bg-muted-foreground/30",
                ) }),
                createElement("div", { className: "min-w-0 flex-1" },
                  createElement("div", { className: "flex items-center gap-2" },
                    createElement("h3", { className: "font-semibold text-sm truncate" }, relay.name),
                    createElement("div", { className: "flex items-center gap-1.5" },
                      relay.auth_required ? createElement(Badge, { variant: "outline", className: "text-[10px] px-1.5 py-0 gap-1 shrink-0" },
                        createElement(Lock, { className: "size-2.5" }), "Auth",
                      ) : null,
                      createElement(Badge, { variant: "outline", className: "text-[10px] px-1.5 py-0 gap-1 shrink-0" },
                        relay.default_message_policy ? "Open" : "Allowlist",
                      ),
                    ),
                  ),
                  createElement("div", { className: "flex items-center gap-1.5 mt-0.5" },
                    createElement("code", { className: "font-mono text-xs text-muted-foreground truncate" },
                      `wss://${relay.name}.${relay.domain || fallbackDomain}`,
                    ),
                    createElement("button", {
                      onClick: () => onCopyWss(relay),
                      className: "shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
                      title: "Copy connection string",
                    },
                      copiedRelayId === relay.id
                        ? createElement(Check, { className: "size-3 text-emerald-500" })
                        : createElement(Copy, { className: "size-3" }),
                    ),
                  ),
                ),
              ),
              createElement("div", { className: "flex items-center gap-1.5 shrink-0 sm:ml-auto" },
                createElement(Link, { to: `/relays/${relay.name}`, className: "inline-flex items-center gap-1.5 rounded-md text-xs h-8 px-3 hover:bg-accent transition-colors" },
                  createElement(ExternalLink, { className: "size-3.5" }), "View",
                ),
                onOpenSettings
                  ? createElement("button", {
                      onClick: () => onOpenSettings(relay.name),
                      className: "inline-flex items-center gap-1.5 rounded-md border border-input text-xs h-8 px-3 hover:bg-accent transition-colors cursor-pointer",
                    },
                      createElement(Settings, { className: "size-3.5" }), "Settings",
                    )
                  : createElement(Link, { to: `/relays/${relay.name}/settings`, className: "inline-flex items-center gap-1.5 rounded-md border border-input text-xs h-8 px-3 hover:bg-accent transition-colors" },
                      createElement(Settings, { className: "size-3.5" }), "Settings",
                    ),
              ),
            ),
          ),
        ),
  );
}
