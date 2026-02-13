import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../stores/auth";
import { api } from "../lib/api";
import {
  Radio, Zap, Shield, Globe, ArrowRight, Layers, Lock,
  Users, FileText, ArrowUpDown, Settings, Wallet,
  Plus, ExternalLink, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   AUTHENTICATED HOME — Operator Dashboard
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface Relay {
  id: string;
  name: string;
  domain: string | null;
  status: string | null;
  auth_required: boolean;
  default_message_policy: boolean;
}

function AuthHome() {
  const { data, isLoading } = useQuery({
    queryKey: ["myRelays"],
    queryFn: () => api.get<{ myRelays: Relay[]; moderatedRelays: any[] }>("/relays/mine"),
  });

  const relays = data?.myRelays || [];
  const running = relays.filter((r) => r.status === "running").length;

  return (
    <div className="space-y-8 animate-in">
      {/* Welcome bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {relays.length === 0
              ? "Get started by creating your first relay"
              : `${relays.length} relay${relays.length !== 1 ? "s" : ""} · ${running} running`}
          </p>
        </div>
        <Button className="gap-1.5 shrink-0" asChild>
          <Link to="/signup">
            <Plus className="size-4" /> New Relay
          </Link>
        </Button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { to: "/relays/myrelays", label: "My Relays", icon: Zap, desc: `${relays.length} total` },
          { to: "/directory", label: "Directory", icon: Globe, desc: "Browse all" },
          { to: "/wallet", label: "Wallet", icon: Wallet, desc: "Lightning" },
          { to: "/signup", label: "Create Relay", icon: Plus, desc: "New relay" },
        ].map((action) => (
          <Link key={action.to} to={action.to}>
            <Card className="h-full border-border/50 transition-all hover:border-border hover:bg-accent/30">
              <CardContent className="p-4">
                <action.icon className="size-5 text-primary mb-2" />
                <p className="text-sm font-semibold">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Relay list — compact overview */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : relays.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Radio className="size-10 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No relays yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Create your first Nostr relay — pick a plan, choose a name, and you're live in under a minute.
            </p>
            <Button className="mt-6 gap-2" asChild>
              <Link to="/signup">
                <Radio className="size-4" /> Create Your First Relay
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Relays</h2>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
              <Link to="/relays/myrelays">
                View all <ArrowRight className="size-3" />
              </Link>
            </Button>
          </div>
          <div className="rounded-lg border border-border/50 divide-y divide-border/30">
            {relays.slice(0, 5).map((relay) => (
              <div key={relay.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`size-2 rounded-full shrink-0 ${relay.status === "running" ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <span className="font-semibold text-sm truncate">{relay.name}</span>
                  <span className="font-mono text-xs text-muted-foreground truncate hidden sm:inline">
                    wss://{relay.name}.{relay.domain}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {relay.auth_required && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                      <Lock className="size-2.5" /> Auth
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                    <Link to={`/relays/${relay.name}`}>
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                    <Link to={`/relays/${relay.name}/settings`}>
                      <Settings className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {relays.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">
              +{relays.length - 5} more — <Link to="/relays/myrelays" className="text-primary hover:underline">view all</Link>
            </p>
          )}
        </div>
      )}

      {/* Platform capabilities — compact reference */}
      <div className="grid grid-cols-2 gap-px bg-border/30 rounded-lg border border-border/50 overflow-hidden sm:grid-cols-3">
        {[
          { icon: Shield, label: "Access Control", desc: "Allow/block lists, NIP-42 auth, keyword filters" },
          { icon: Users, label: "Team", desc: "Add moderators by pubkey" },
          { icon: ArrowUpDown, label: "Streaming", desc: "Relay-to-relay sync" },
          { icon: Zap, label: "Payments", desc: "Lightning paywalls" },
          { icon: Layers, label: "Filtering", desc: "Kind, keyword, giftwrap" },
          { icon: FileText, label: "Full Dashboard", desc: "Profile, billing, danger zone" },
        ].map((cap) => (
          <div key={cap.label} className="bg-background px-4 py-3">
            <div className="flex items-center gap-2 mb-0.5">
              <cap.icon className="size-3.5 text-primary shrink-0" />
              <span className="text-xs font-semibold">{cap.label}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">{cap.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ANONYMOUS HOME — Landing Page
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function AnonHome() {
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

      {/* ─── WHAT YOU CONTROL ─── */}
      <section>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: capability list */}
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
                { icon: Zap, title: "Lightning Paywalls", desc: "Gate access behind a Lightning payment. Users pay, get auto-added to the allow list." },
                { icon: Layers, title: "Event Filtering", desc: "Filter by kind, keyword, or pubkey. Allow tagged events and giftwrap (NIP-59) for DM compatibility." },
                { icon: FileText, title: "Full Dashboard", desc: "Profile editor, directory listing, billing controls, danger zone — everything from one settings page." },
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

          {/* Right: how it works + relay types */}
          <div className="space-y-6">
            {/* How it works */}
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

            {/* Relay types */}
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

            {/* Open source */}
            <Card className="border-border/50 bg-primary/5">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-bold">Free. Open Source. Forever.</h3>
                <p className="text-sm text-muted-foreground">
                  MIT licensed. Run it yourself or use our hosted infrastructure.
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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ROUTER — auth-aware homepage
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return user ? <AuthHome /> : <AnonHome />;
}
