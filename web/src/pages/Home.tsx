import { createElement } from "inferno-create-element";
import { Link } from "inferno-router";
import {
  Radio, Zap, Shield, Globe, ArrowRight, Layers, Lock,
  Users, FileText, ArrowUpDown,
} from "@/lib/icons";
import { Button } from "@/ui/Button";
import { Card, CardContent } from "@/ui/Card";
import type { IconComponent } from "@/lib/icons";

const capabilities: { Icon: IconComponent; title: string; desc: string }[] = [
  { Icon: Shield, title: "Access Control", desc: "NIP-42 auth, pubkey allow/block lists, keyword filters, event kind restrictions. Block-by-default or allow-by-default." },
  { Icon: Users, title: "Team Management", desc: "Add moderators by pubkey. They manage lists and have posting access. Only owners change the team." },
  { Icon: ArrowUpDown, title: "Relay Streaming", desc: "Sync events upstream, downstream, or bidirectional. Built-in relay federation." },
  { Icon: Zap, title: "Lightning Payments", desc: "Gate access behind a Lightning paywall. Users pay, get auto-added to the allow list. Request payment from any connecting client." },
  { Icon: Layers, title: "Event Filtering", desc: "Filter by kind, keyword, or pubkey. Allow tagged events and giftwrap (NIP-59) for DM compatibility." },
  { Icon: FileText, title: "NIP-11 Profile & More", desc: "Relay identity, directory listing, billing controls, danger zone — everything from one settings page." },
];

const steps = [
  { step: "1", text: "Choose Standard or Premium plan. Pay with Lightning." },
  { step: "2", text: "Pick a relay name — you get a subdomain with automatic SSL." },
  { step: "3", text: "Configure access rules, add moderators, go live." },
];

const configs: { Icon: IconComponent; label: string; desc: string }[] = [
  { Icon: Users, label: "Community Relay", desc: "Pubkey allow-list for your group" },
  { Icon: Lock, label: "Private Relay", desc: "NIP-42 auth, restricted read + write" },
  { Icon: Zap, label: "Paid Public Relay", desc: "Lightning paywall, auto-allowlist" },
  { Icon: Globe, label: "Free Public Relay", desc: "Open to all, with moderation tools" },
];

const stats = [
  { value: "strfry", label: "Engine" },
  { value: "21 sats", label: "To start" },
  { value: "< 60s", label: "Deploy" },
];

export default function Home() {
  return createElement("div", { className: "space-y-20 pb-16 animate-in" },

    // Hero
    createElement("section", { className: "flex flex-col items-center text-center pt-10 sm:pt-16" },
      createElement("div", { className: "max-w-3xl space-y-6" },
        createElement("h1", { className: "text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]" },
          "Your Relay, ",
          createElement("span", { className: "text-gradient" }, "Your Rules"),
        ),
        createElement("p", { className: "mx-auto max-w-xl text-lg text-muted-foreground leading-relaxed" },
          "Deploy a fully managed Nostr relay in under a minute. Total control over access, moderation, and your community.",
        ),
        createElement("div", { className: "flex flex-col items-center gap-3 sm:flex-row sm:justify-center pt-2" },
          createElement(Link, { to: "/signup", className: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-base font-medium h-10 px-8 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer transition-all" },
            createElement(Radio, { className: "size-5" }), "Create Your Relay",
          ),
          createElement(Link, { to: "/directory", className: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-base font-medium h-10 px-6 border-2 border-input bg-transparent hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all" },
            "Browse Directory", createElement(ArrowRight, { className: "size-4" }),
          ),
        ),
      ),

      // Stats pill
      createElement("div", { className: "mt-10 inline-flex items-center rounded-full border border-border/50 bg-card/60 backdrop-blur-sm divide-x divide-border/50 shadow-sm" },
        ...stats.map((stat) =>
          createElement("div", { className: "px-5 py-2.5 text-center" },
            createElement("div", { className: "text-sm font-bold tracking-tight" }, stat.value),
            createElement("div", { className: "text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5" }, stat.label),
          ),
        ),
      ),
    ),

    // Ship in minutes — grey band
    createElement("section", { className: "-mx-4 sm:-mx-6 px-4 sm:px-6 py-12 bg-muted/40 border-y border-border/30" },
      createElement("div", { className: "mx-auto max-w-7xl" },
        createElement("div", { className: "text-center mb-8" },
          createElement("h2", { className: "text-2xl font-bold tracking-tight" }, "Ship in minutes"),
          createElement("p", { className: "text-sm text-muted-foreground mt-2" },
            "Three steps. One Lightning payment. Your relay is live.",
          ),
        ),
        createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto" },
          ...steps.map((item) =>
            createElement("div", { className: "flex flex-col items-center text-center gap-3" },
              createElement("span", { className: "flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-bold" }, item.step),
              createElement("span", { className: "text-sm text-muted-foreground leading-relaxed" }, item.text),
            ),
          ),
        ),
      ),
    ),

    // Platform capabilities
    createElement("section", null,
      createElement("div", { className: "grid grid-cols-1 gap-6 lg:grid-cols-2" },

        // Left column
        createElement("div", { className: "space-y-4" },
          createElement("h2", { className: "text-xl font-bold tracking-tight" }, "A full relay management platform"),
          createElement("p", { className: "text-sm text-muted-foreground leading-relaxed" },
            "Not just hosting — a complete control plane for your Nostr relay. Every setting is live-configurable from the dashboard.",
          ),
          createElement("div", { className: "space-y-2 pt-2" },
            ...capabilities.map((item) =>
              createElement("div", { className: "flex gap-3 rounded-lg border border-border/30 p-3 hover:border-border/60 transition-colors" },
                createElement("div", { className: "rounded-md bg-primary/10 p-2 h-fit shrink-0" },
                  createElement(item.Icon, { className: "size-4 text-primary" }),
                ),
                createElement("div", { className: "min-w-0" },
                  createElement("h3", { className: "text-sm font-semibold" }, item.title),
                  createElement("p", { className: "text-xs text-muted-foreground leading-relaxed mt-0.5" }, item.desc),
                ),
              ),
            ),
          ),
        ),

        // Right column
        createElement("div", { className: "space-y-6" },

          // Popular configurations
          createElement(Card, { className: "border-border/50" },
            createElement(CardContent, { className: "p-6 space-y-3" },
              createElement("h3", { className: "font-bold" }, "Popular configurations"),
              ...configs.map((type) =>
                createElement("div", { className: "flex items-center gap-3 rounded-md bg-muted/30 px-3 py-2.5" },
                  createElement(type.Icon, { className: "size-4 text-primary shrink-0" }),
                  createElement("div", { className: "min-w-0" },
                    createElement("p", { className: "text-sm font-medium" }, type.label),
                    createElement("p", { className: "text-xs text-muted-foreground" }, type.desc),
                  ),
                ),
              ),
              createElement(Link, { to: "/faq", className: "inline-flex items-center justify-center gap-1 text-xs w-full mt-1 h-8 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all" },
                "Learn more about relay types", createElement(ArrowRight, { className: "size-3" }),
              ),
            ),
          ),

          // Open source
          createElement(Card, { className: "border-border/50 bg-primary/5" },
            createElement(CardContent, { className: "p-6 space-y-3" },
              createElement("h3", { className: "font-bold" }, "Free. Open Source. Forever."),
              createElement("p", { className: "text-sm text-muted-foreground" },
                "GPLv3 licensed. Run it yourself or use our hosted infrastructure. The protocol is Nostr. The engine is strfry. The management layer is relay.tools.",
              ),
              createElement("a", { href: "https://github.com/relaytools", target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium border-2 border-input bg-transparent hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all" },
                createElement(Globe, { className: "size-3.5" }), "View on GitHub",
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
