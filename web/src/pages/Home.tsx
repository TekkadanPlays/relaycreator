import { Link } from "react-router";
import { Radio, Zap, Shield, Globe, ArrowRight, Layers, Lock, Workflow, Terminal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Powered by strfry — one of the fastest Nostr relay implementations. Sub-millisecond event processing.",
    accent: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-400",
  },
  {
    icon: Shield,
    title: "Total Control",
    description: "Allow lists, block lists, keyword filters, kind restrictions, and NIP-42 auth. Your relay, your rules.",
    accent: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-400",
  },
  {
    icon: Globe,
    title: "Instant Deploy",
    description: "Your own subdomain with automatic DNS, SSL, and load balancing. Live in minutes.",
    accent: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-400",
  },
  {
    icon: Workflow,
    title: "Relay Streaming",
    description: "Sync events between relays with configurable upstream and downstream streaming.",
    accent: "from-violet-500/20 to-purple-500/20",
    iconColor: "text-violet-400",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "Private relays with NIP-42 authentication. Control exactly who can read and write.",
    accent: "from-rose-500/20 to-pink-500/20",
    iconColor: "text-rose-400",
  },
  {
    icon: Layers,
    title: "Moderation Tools",
    description: "Add moderators, manage access lists, and configure event kind filtering from the dashboard.",
    accent: "from-indigo-500/20 to-blue-500/20",
    iconColor: "text-indigo-400",
  },
];

export default function Home() {
  return (
    <div className="space-y-32 pb-20">
      {/* ─── HERO ─── */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center text-center -mt-8 overflow-hidden">
        {/* Background glow orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/4 left-1/4 size-96 rounded-full bg-primary/8 blur-[120px] animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 size-80 rounded-full bg-violet-500/6 blur-[100px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        </div>

        <div className="relative max-w-4xl space-y-8 animate-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm">
            <Sparkles className="size-3.5" />
            Sovereign Nostr Infrastructure
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-8xl leading-[0.85]">
            Your Relay,
            <br />
            <span className="text-gradient">Your Rules</span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
            Deploy a fully managed Nostr relay in under a minute.
            Total control over access, moderation, and your community.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center pt-4">
            <Button size="lg" className="gap-2 px-8 h-13 text-base glow-primary" asChild>
              <Link to="/signup">
                <Radio className="size-5" /> Create Your Relay
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 h-13 text-base" asChild>
              <Link to="/directory">
                Browse Directory <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          {/* Stats bar */}
          <div className="mx-auto max-w-md mt-4">
            <div className="flex items-center justify-center gap-0 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm divide-x divide-border/50">
              {[
                { value: "strfry", label: "Relay Engine" },
                { value: "21", label: "sats to start" },
                { value: "< 60s", label: "Deploy time" },
              ].map((stat) => (
                <div key={stat.label} className="flex-1 py-4 px-3 text-center">
                  <div className="text-lg font-bold tracking-tight">{stat.value}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Terminal className="size-3.5" />
            Built for operators
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Everything you need to run a relay
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground text-lg">
            Professional tools that give you complete sovereignty over your Nostr infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="group relative border-border/50 transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/5 overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <CardContent className="relative p-6 space-y-4">
                <div className={`inline-flex rounded-xl bg-muted p-3 ring-1 ring-border/50 group-hover:ring-border transition-all`}>
                  <feature.icon className={`size-5 ${feature.iconColor}`} />
                </div>
                <h3 className="font-bold text-[15px]">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="relative rounded-2xl border border-border/50 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/10 animate-gradient" />
        <div className="absolute inset-0 bg-card/80 backdrop-blur-sm" />

        <div className="relative p-12 sm:p-16 text-center space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to take control?
          </h2>
          <p className="max-w-lg mx-auto text-muted-foreground text-lg">
            Join the growing network of sovereign relay operators.
            Set up your relay in under a minute.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button size="lg" className="gap-2 px-8 glow-primary" asChild>
              <Link to="/signup">
                Get Started <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" className="gap-2" asChild>
              <Link to="/faq">
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
