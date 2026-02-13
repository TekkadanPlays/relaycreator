import { Link } from "react-router";
import {
  Radio, Zap, Shield, Globe, ArrowRight, Layers, Lock,
  Users, FileText, ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="space-y-20 pb-16 animate-in">
      {/* ─── HERO ─── */}
      <section className="flex flex-col items-center text-center pt-10 sm:pt-16">
        <div className="max-w-3xl space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
            Your Relay,{" "}
            <span className="text-gradient">Your Rules</span>
          </h1>

          <p className="mx-auto max-w-xl text-lg text-muted-foreground leading-relaxed">
            Deploy a fully managed Nostr relay in under a minute.
            Total control over access, moderation, and your community.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center pt-2">
            <Button size="lg" className="gap-2 px-8 text-base" asChild>
              <Link to="/signup">
                <Radio className="size-5" /> Create Your Relay
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base" asChild>
              <Link to="/directory">
                Browse Directory <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats pill */}
        <div className="mt-10 inline-flex items-center rounded-full border border-border/50 bg-card/60 backdrop-blur-sm divide-x divide-border/50 shadow-sm">
          {[
            { value: "strfry", label: "Engine" },
            { value: "21 sats", label: "To start" },
            { value: "< 60s", label: "Deploy" },
          ].map((stat) => (
            <div key={stat.label} className="px-5 py-2.5 text-center">
              <div className="text-sm font-bold tracking-tight">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PLATFORM CAPABILITIES ─── */}
      <section>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: what operators get */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">
              A full relay management platform
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Not just hosting — a complete control plane for your Nostr relay.
              Every setting is live-configurable from the dashboard.
            </p>
            <div className="space-y-2 pt-2">
              {[
                { icon: Shield, title: "Access Control", desc: "NIP-42 auth, pubkey allow/block lists, keyword filters, event kind restrictions. Block-by-default or allow-by-default." },
                { icon: Users, title: "Team Management", desc: "Add moderators by pubkey. They manage lists and have posting access. Only owners change the team." },
                { icon: ArrowUpDown, title: "Relay Streaming", desc: "Sync events upstream, downstream, or bidirectional. Built-in relay federation." },
                { icon: Zap, title: "Lightning Payments", desc: "Gate access behind a Lightning paywall. Users pay, get auto-added to the allow list. Request payment from any connecting client." },
                { icon: Layers, title: "Event Filtering", desc: "Filter by kind, keyword, or pubkey. Allow tagged events and giftwrap (NIP-59) for DM compatibility." },
                { icon: FileText, title: "NIP-11 Profile & More", desc: "Relay identity, directory listing, billing controls, danger zone — everything from one settings page." },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 rounded-lg border border-border/30 p-3 hover:border-border/60 transition-colors">
                  <div className="rounded-md bg-primary/10 p-2 h-fit shrink-0">
                    <item.icon className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: how it works + relay types + open source */}
          <div className="space-y-6">
            <Card className="border-border/50">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold">How it works</h3>
                <ol className="space-y-3">
                  {[
                    { step: "1", text: "Choose Standard or Premium plan. Pay with Lightning." },
                    { step: "2", text: "Pick a relay name — you get a subdomain with automatic SSL." },
                    { step: "3", text: "Configure access rules, add moderators, go live." },
                  ].map((item) => (
                    <li key={item.step} className="flex gap-3 items-start">
                      <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                        {item.step}
                      </span>
                      <span className="text-sm text-muted-foreground">{item.text}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-bold">Popular configurations</h3>
                {[
                  { icon: Users, label: "Community Relay", desc: "Pubkey allow-list for your group" },
                  { icon: Lock, label: "Private Relay", desc: "NIP-42 auth, restricted read + write" },
                  { icon: Zap, label: "Paid Public Relay", desc: "Lightning paywall, auto-allowlist" },
                  { icon: Globe, label: "Free Public Relay", desc: "Open to all, with moderation tools" },
                ].map((type) => (
                  <div key={type.label} className="flex items-center gap-3 rounded-md bg-muted/30 px-3 py-2.5">
                    <type.icon className="size-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.desc}</p>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="gap-1 text-xs w-full mt-1" asChild>
                  <Link to="/faq">
                    Learn more about relay types <ArrowRight className="size-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-primary/5">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-bold">Free. Open Source. Forever.</h3>
                <p className="text-sm text-muted-foreground">
                  GPLv3 licensed. Run it yourself or use our hosted infrastructure.
                  The protocol is Nostr. The engine is strfry. The management layer is relay.tools.
                </p>
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href="https://github.com/relaytools" target="_blank" rel="noopener noreferrer">
                    <Globe className="size-3.5" /> View on GitHub
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
