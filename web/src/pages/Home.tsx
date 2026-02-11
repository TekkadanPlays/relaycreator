import { Link } from "react-router";
import { Radio, Zap, Shield, Globe, ArrowRight, Layers, Lock, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Powered by strfry — one of the fastest Nostr relay implementations on earth. Sub-millisecond event processing.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "group-hover:border-amber-500/30",
  },
  {
    icon: Shield,
    title: "Total Control",
    description: "Allow lists, block lists, keyword filters, kind restrictions, and NIP-42 auth. Your relay, your rules.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "group-hover:border-emerald-500/30",
  },
  {
    icon: Globe,
    title: "Instant Deploy",
    description: "Your own subdomain with automatic DNS, SSL certificates, and HAProxy load balancing. Live in minutes.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "group-hover:border-blue-500/30",
  },
  {
    icon: Workflow,
    title: "Relay Streaming",
    description: "Sync events between relays with configurable upstream and downstream streaming. Build your relay network.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "group-hover:border-purple-500/30",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "Private relays with NIP-42 authentication. Control exactly who can read and write to your relay.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "group-hover:border-rose-500/30",
  },
  {
    icon: Layers,
    title: "Moderation Tools",
    description: "Add moderators, manage access lists, and configure event kind filtering — all from a beautiful dashboard.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "group-hover:border-cyan-500/30",
  },
];

export default function Home() {
  return (
    <div className="space-y-32 pb-16">
      {/* ─── HERO ─── */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center text-center overflow-hidden -mt-8">
        {/* Orbital background decoration */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative size-[500px] sm:size-[700px]">
            {/* Orbiting dots */}
            <div className="absolute inset-0 animate-orbit opacity-20">
              <div className="size-2 rounded-full bg-primary" />
            </div>
            <div className="absolute inset-0 animate-orbit opacity-15" style={{ animationDuration: "30s", animationDirection: "reverse" }}>
              <div className="size-1.5 rounded-full bg-purple-400" />
            </div>
            <div className="absolute inset-0 animate-orbit opacity-10" style={{ animationDuration: "25s" }}>
              <div className="size-1 rounded-full bg-cyan-400" />
            </div>
            {/* Rings */}
            <div className="absolute inset-[15%] rounded-full border border-primary/5" />
            <div className="absolute inset-[30%] rounded-full border border-primary/8" />
            <div className="absolute inset-[45%] rounded-full border border-primary/5" />
          </div>
        </div>

        {/* Gradient blobs */}
        <div className="pointer-events-none absolute top-1/4 -left-32 size-96 rounded-full bg-primary/6 blur-3xl animate-glow-pulse" />
        <div className="pointer-events-none absolute bottom-1/4 -right-32 size-96 rounded-full bg-purple-500/6 blur-3xl animate-glow-pulse delay-200" />

        <div className="relative z-10 max-w-3xl space-y-8 animate-fade-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm font-medium text-primary backdrop-blur-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            Sovereign Nostr Relay Hosting
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-8xl leading-[0.9]">
            Your Relay,
            <br />
            <span className="text-gradient">Your Rules</span>
          </h1>

          {/* Subhead */}
          <p className="mx-auto max-w-xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
            Deploy a fully customizable Nostr relay in minutes.
            Control access, moderate content, and own your corner of the decentralized web.
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center pt-2">
            <Button size="lg" className="gap-2 text-base px-8 h-12 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 border-0 shadow-xl shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02]" asChild>
              <Link to="/signup">
                <Radio className="size-5" /> Create Your Relay
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base h-12 border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300" asChild>
              <Link to="/directory">
                Browse Directory <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-8 pt-8 text-sm text-muted-foreground/60">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground">strfry</span>
              <span className="text-xs">Relay Engine</span>
            </div>
            <div className="h-8 w-px bg-border/50" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground">21</span>
              <span className="text-xs">sats to start</span>
            </div>
            <div className="h-8 w-px bg-border/50" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground">&lt; 1 min</span>
              <span className="text-xs">Deploy time</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="space-y-12">
        <div className="text-center space-y-4 animate-fade-up">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Everything you need to run a{" "}
            <span className="text-gradient">world-class relay</span>
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground text-lg">
            Professional relay management tools that give you complete sovereignty over your Nostr infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <Card
              key={feature.title}
              className={`group relative overflow-hidden border-border/30 bg-card/30 backdrop-blur-sm transition-all duration-500 hover:bg-card/60 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 ${feature.border} animate-fade-up`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
              <CardContent className="relative p-6 space-y-4">
                <div className={`inline-flex rounded-xl ${feature.bg} p-3 transition-transform duration-300 group-hover:scale-110`}>
                  <feature.icon className={`size-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-bold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 animate-fade-up">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent" />
        <div className="absolute -top-24 -right-24 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 size-64 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-6 px-8 py-16 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to take control?
          </h2>
          <p className="max-w-lg text-muted-foreground text-lg">
            Join the growing network of sovereign relay operators.
            Set up your relay in under a minute.
          </p>
          <Button size="lg" className="gap-2 text-base px-8 h-12 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 border-0 shadow-xl shadow-primary/25 transition-all duration-300 hover:shadow-primary/40" asChild>
            <Link to="/signup">
              Get Started <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
