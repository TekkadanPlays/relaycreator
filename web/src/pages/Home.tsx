import { Link } from "react-router";
import { Radio, Zap, Shield, Globe, ArrowRight, Layers, Lock, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Powered by strfry — one of the fastest Nostr relay implementations. Sub-millisecond event processing.",
  },
  {
    icon: Shield,
    title: "Total Control",
    description: "Allow lists, block lists, keyword filters, kind restrictions, and NIP-42 auth. Your relay, your rules.",
  },
  {
    icon: Globe,
    title: "Instant Deploy",
    description: "Your own subdomain with automatic DNS, SSL, and load balancing. Live in minutes.",
  },
  {
    icon: Workflow,
    title: "Relay Streaming",
    description: "Sync events between relays with configurable upstream and downstream streaming.",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "Private relays with NIP-42 authentication. Control exactly who can read and write.",
  },
  {
    icon: Layers,
    title: "Moderation Tools",
    description: "Add moderators, manage access lists, and configure event kind filtering from the dashboard.",
  },
];

export default function Home() {
  return (
    <div className="space-y-24 pb-16">
      {/* ─── HERO ─── */}
      <section className="flex min-h-[70vh] flex-col items-center justify-center text-center -mt-8">
        <div className="max-w-3xl space-y-8 animate-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <Radio className="size-3.5" />
            Sovereign Nostr Relay Hosting
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl leading-[0.9]">
            Your Relay,
            <br />
            <span className="text-gradient">Your Rules</span>
          </h1>

          <p className="mx-auto max-w-xl text-lg text-muted-foreground leading-relaxed">
            Deploy a fully customizable Nostr relay in minutes.
            Control access, moderate content, and own your corner of the decentralized web.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center pt-2">
            <Button size="lg" className="gap-2 px-8 h-12" asChild>
              <Link to="/signup">
                <Radio className="size-5" /> Create Your Relay
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 h-12" asChild>
              <Link to="/directory">
                Browse Directory <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 pt-6 text-sm text-muted-foreground">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-foreground">strfry</span>
              <span className="text-xs">Relay Engine</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-foreground">21</span>
              <span className="text-xs">sats to start</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-foreground">&lt; 1 min</span>
              <span className="text-xs">Deploy time</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold tracking-tight">
            Everything you need to run a relay
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Professional relay management tools that give you complete sovereignty over your Nostr infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border/50 transition-colors hover:border-border">
              <CardContent className="p-6 space-y-3">
                <div className="inline-flex rounded-lg bg-primary/10 p-2.5">
                  <feature.icon className="size-5 text-primary" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="rounded-2xl border border-border/50 bg-card p-12 text-center space-y-5">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Ready to take control?
        </h2>
        <p className="max-w-lg mx-auto text-muted-foreground">
          Join the growing network of sovereign relay operators.
          Set up your relay in under a minute.
        </p>
        <Button size="lg" className="gap-2 px-8" asChild>
          <Link to="/signup">
            Get Started <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
