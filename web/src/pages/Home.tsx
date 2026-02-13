import { Link } from "react-router";
import { Radio, Zap, Shield, Globe, ArrowRight, Layers, Lock, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    desc: "Powered by strfry — sub-millisecond event processing.",
  },
  {
    icon: Shield,
    title: "Total Control",
    desc: "Allow lists, block lists, keyword filters, kind restrictions, NIP-42 auth.",
  },
  {
    icon: Globe,
    title: "Instant Deploy",
    desc: "Your own subdomain with automatic DNS, SSL, and load balancing.",
  },
  {
    icon: Workflow,
    title: "Relay Streaming",
    desc: "Sync events between relays with configurable upstream and downstream.",
  },
  {
    icon: Lock,
    title: "Privacy First",
    desc: "Private relays with NIP-42 authentication. Control who reads and writes.",
  },
  {
    icon: Layers,
    title: "Moderation Tools",
    desc: "Add moderators, manage access lists, configure event kind filtering.",
  },
];

export default function Home() {
  return (
    <div className="space-y-16 pb-12">
      {/* ─── HERO ─── */}
      <section className="pt-8 sm:pt-12">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your Relay, Your Rules
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed max-w-xl">
            Deploy a fully managed Nostr relay in under a minute.
            Total control over access, moderation, and your community.
          </p>
          <div className="flex items-center gap-3 mt-6">
            <Button className="gap-2" asChild>
              <Link to="/signup">
                <Radio className="size-4" /> Create Relay
              </Link>
            </Button>
            <Button variant="outline" className="gap-2" asChild>
              <Link to="/directory">
                Directory <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-8 text-sm">
          {[
            { value: "strfry", label: "Relay Engine" },
            { value: "21 sats", label: "To start" },
            { value: "< 60s", label: "Deploy time" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-1.5">
              <span className="font-semibold">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section>
        <h2 className="text-lg font-semibold mb-4">What you get</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-border/50 p-4 hover:border-border transition-colors"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="rounded-md bg-muted p-1.5">
                  <f.icon className="size-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">{f.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="rounded-lg border border-border/50 bg-card p-8 text-center">
        <h2 className="text-lg font-semibold">Ready to take control?</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
          Join the growing network of sovereign relay operators.
        </p>
        <Button className="gap-2 mt-4" asChild>
          <Link to="/signup">
            Get Started <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
