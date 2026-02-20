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
  return createElement("div", { className: "space-y-0 pb-0 animate-in" },

    // ─── Hero (unchanged) ───────────────────────────────────────────────
    createElement("section", { className: "flex flex-col items-center text-center pt-10 sm:pt-16 pb-16" },
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
          createElement("div", { key: stat.label, className: "px-5 py-2.5 text-center" },
            createElement("div", { className: "text-sm font-bold tracking-tight" }, stat.value),
            createElement("div", { className: "text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5" }, stat.label),
          ),
        ),
      ),
    ),

    // ─── How it works ───────────────────────────────────────────────────
    createElement("section", { className: "relative left-[50%] right-[50%] ml-[-50vw] mr-[-50vw] w-screen px-4 sm:px-6 py-16 bg-muted/30 border-y border-border/20" },
      createElement("div", { className: "mx-auto max-w-4xl" },
        createElement("div", { className: "text-center mb-10" },
          createElement("p", { className: "text-xs font-semibold uppercase tracking-widest text-primary mb-2" }, "How it works"),
          createElement("h2", { className: "text-2xl font-bold tracking-tight" }, "Live in three steps"),
        ),
        createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto" },
          ...steps.map((item, i) =>
            createElement("div", { key: item.step, className: "relative flex flex-col items-center text-center gap-3" },
              createElement("span", { className: "flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold shadow-sm" }, item.step),
              createElement("span", { className: "text-sm text-muted-foreground leading-relaxed max-w-[200px]" }, item.text),
              // Connector line (hidden on last item and mobile)
              i < steps.length - 1
                ? createElement("div", { className: "hidden sm:block absolute top-5 left-[calc(50%+28px)] w-[calc(100%-56px)] h-px bg-border/50" })
                : null,
            ),
          ),
        ),
      ),
    ),

    // ─── Platform capabilities ──────────────────────────────────────────
    createElement("section", { className: "py-16" },
      createElement("div", { className: "text-center mb-10" },
        createElement("p", { className: "text-xs font-semibold uppercase tracking-widest text-primary mb-2" }, "Features"),
        createElement("h2", { className: "text-2xl font-bold tracking-tight" }, "A complete relay management platform"),
        createElement("p", { className: "text-sm text-muted-foreground mt-2 max-w-lg mx-auto" },
          "Not just hosting — a full control plane. Every setting is live-configurable from the dashboard.",
        ),
      ),
      createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" },
        ...capabilities.map((item) =>
          createElement("div", { key: item.title, className: "group rounded-xl border border-border/30 p-5 hover:border-primary/20 hover:shadow-sm transition-all" },
            createElement("div", { className: "rounded-lg bg-primary/10 p-2.5 w-fit mb-3 group-hover:bg-primary/15 transition-colors" },
              createElement(item.Icon, { className: "size-5 text-primary" }),
            ),
            createElement("h3", { className: "text-sm font-semibold mb-1" }, item.title),
            createElement("p", { className: "text-xs text-muted-foreground leading-relaxed" }, item.desc),
          ),
        ),
      ),
    ),

    // ─── Popular configurations + Discover ──────────────────────────────
    createElement("section", { className: "relative left-[50%] right-[50%] ml-[-50vw] mr-[-50vw] w-screen px-4 sm:px-6 py-16 bg-muted/30 border-y border-border/20" },
      createElement("div", { className: "mx-auto max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8" },

        // Configs
        createElement("div", null,
          createElement("p", { className: "text-xs font-semibold uppercase tracking-widest text-primary mb-2" }, "Templates"),
          createElement("h3", { className: "text-xl font-bold mb-4" }, "Popular configurations"),
          createElement("div", { className: "space-y-2" },
            ...configs.map((type) =>
              createElement("div", { key: type.label, className: "flex items-center gap-3 rounded-lg border border-border/30 bg-card px-4 py-3 hover:border-primary/20 transition-colors" },
                createElement("div", { className: "rounded-md bg-primary/10 p-2 shrink-0" },
                  createElement(type.Icon, { className: "size-4 text-primary" }),
                ),
                createElement("div", { className: "min-w-0" },
                  createElement("p", { className: "text-sm font-medium" }, type.label),
                  createElement("p", { className: "text-xs text-muted-foreground" }, type.desc),
                ),
              ),
            ),
          ),
          createElement(Link, { to: "/faq", className: "inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3 cursor-pointer" },
            "Learn more about relay types", createElement(ArrowRight, { className: "size-3" }),
          ),
        ),

        // Discover
        createElement("div", null,
          createElement("p", { className: "text-xs font-semibold uppercase tracking-widest text-primary mb-2" }, "Network"),
          createElement("h3", { className: "text-xl font-bold mb-4" }, "Explore the relay network"),
          createElement("p", { className: "text-sm text-muted-foreground leading-relaxed mb-4" },
            "Browse the global Nostr relay network. Filter by software, NIPs, country, and latency. Powered by NIP-66 relay intelligence.",
          ),
          createElement(Link, { to: "/discover" },
            createElement(Button, { variant: "outline", className: "gap-2" },
              createElement(Globe, { className: "size-4" }), "Discover Relays",
            ),
          ),
          createElement("div", { className: "mt-6" },
            createElement("p", { className: "text-xs font-semibold uppercase tracking-widest text-primary mb-2" }, "Open Source"),
            createElement("h3", { className: "text-xl font-bold mb-2" }, "Free. Open Source. Forever."),
            createElement("p", { className: "text-sm text-muted-foreground leading-relaxed mb-3" },
              "GPLv3 licensed. Run it yourself or use our hosted infrastructure. The protocol is Nostr. The engine is strfry.",
            ),
            createElement("a", { href: "https://github.com/relaytools", target: "_blank", rel: "noopener noreferrer" },
              createElement(Button, { variant: "outline", size: "sm", className: "gap-1.5" },
                createElement(Globe, { className: "size-3.5" }), "View on GitHub",
              ),
            ),
          ),
        ),
      ),
    ),

    // ─── Bottom CTA ─────────────────────────────────────────────────────
    createElement("section", { className: "py-20 text-center" },
      createElement("div", { className: "max-w-lg mx-auto space-y-4" },
        createElement("h2", { className: "text-2xl font-bold tracking-tight" }, "Ready to launch your relay?"),
        createElement("p", { className: "text-sm text-muted-foreground" },
          "Pick a plan, choose a name, and go live. It takes less than a minute.",
        ),
        createElement("div", { className: "flex flex-col items-center gap-3 sm:flex-row sm:justify-center pt-2" },
          createElement(Link, { to: "/signup" },
            createElement(Button, { size: "lg", className: "gap-2" },
              createElement(Zap, { className: "size-5" }), "Get Started",
            ),
          ),
          createElement(Link, { to: "/docs" },
            createElement(Button, { variant: "outline", size: "lg", className: "gap-2" },
              createElement(FileText, { className: "size-4" }), "Read the Docs",
            ),
          ),
        ),
      ),
    ),
  );
}
