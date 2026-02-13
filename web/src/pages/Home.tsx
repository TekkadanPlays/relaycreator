import { Link } from "react-router";
import {
  Radio, Zap, Shield, Globe, ArrowRight, Layers, Lock,
  Users, FileText, ArrowUpDown, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="space-y-20 pb-16 animate-in">
      {/* ─── HERO ─── */}
      <section className="flex flex-col items-center text-center pt-12 sm:pt-20">
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

      {/* ─── HOW IT WORKS ─── */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Three steps. That's it.</h2>
          <p className="text-sm text-muted-foreground mt-1">No servers to manage. No config files to edit.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { step: "1", title: "Choose a plan", desc: "Standard or Premium. Pay with Lightning.", icon: Zap },
            { step: "2", title: "Pick a name", desc: "Your relay gets its own subdomain with SSL.", icon: Globe },
            { step: "3", title: "Configure & go", desc: "Set access rules, add moderators, go live.", icon: Shield },
          ].map((item) => (
            <div key={item.step} className="relative rounded-xl border border-border/50 bg-card p-6 text-center">
              <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                {item.step}
              </div>
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CAPABILITIES ─── */}
      <section>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground mb-4">
            <Sparkles className="size-3.5" />
            Built for operators
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Everything you need</h2>
        </div>

        <div className="grid grid-cols-1 gap-px bg-border/30 rounded-xl border border-border/50 overflow-hidden sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Lock, title: "Access Control", desc: "NIP-42 auth, pubkey allow/block lists, keyword filters, event kind restrictions. Block by default or allow by default." },
            { icon: Users, title: "Team Management", desc: "Add moderators by pubkey. They get dashboard access and can manage lists. Only owners can change team." },
            { icon: ArrowUpDown, title: "Relay Streaming", desc: "Sync events upstream, downstream, or bidirectional with other relays. Built-in federation." },
            { icon: Zap, title: "Lightning Payments", desc: "Gate access behind a Lightning paywall. Users pay, get added to the allow list automatically." },
            { icon: Layers, title: "Event Filtering", desc: "Filter by kind, keyword, or pubkey. Allow tagged events and giftwrap (NIP-59) for DM compatibility." },
            { icon: FileText, title: "Full Dashboard", desc: "Profile editor, directory listing toggle, billing controls, danger zone. Everything from one settings page." },
          ].map((item) => (
            <div key={item.title} className="bg-background p-6 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2.5 mb-2.5">
                <item.icon className="size-4 text-primary shrink-0" />
                <h3 className="text-sm font-semibold">{item.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── OPEN SOURCE ─── */}
      <section className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="p-8 sm:p-10 text-center space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Free. Open Source. Forever.</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            MIT licensed. Run it yourself or use our hosted infrastructure.
            The protocol is Nostr. The relay engine is strfry. The management layer is relay.tools.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button size="lg" className="gap-2 px-8" asChild>
              <Link to="/signup">
                Get Started <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" className="gap-2" asChild>
              <a href="https://github.com/relaytools" target="_blank" rel="noopener noreferrer">
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
