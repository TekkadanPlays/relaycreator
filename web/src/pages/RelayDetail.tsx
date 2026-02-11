import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import { Globe, Shield, Calendar, Copy, Check, Loader2, Settings, Users, Zap, Lock, Unlock } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RelayData {
  id: string;
  name: string;
  domain: string | null;
  status: string | null;
  details: string | null;
  default_message_policy: boolean;
  auth_required: boolean;
  created_at: string | null;
  profile_image: string | null;
  banner_image: string | null;
  owner: { pubkey: string; name: string | null };
  moderators: { id: string; user: { pubkey: string; name: string | null } }[];
}

export default function RelayDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["relay", slug],
    queryFn: () => api.get<{ relay: RelayData }>(`/relays/by-name/${slug}`),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data?.relay) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-up">
        <div className="rounded-2xl bg-muted/30 p-6 mb-4">
          <Globe className="size-12 text-muted-foreground/30" />
        </div>
        <h2 className="text-2xl font-bold">Relay not found</h2>
        <p className="mt-2 text-muted-foreground">The relay you are looking for does not exist.</p>
      </div>
    );
  }

  const relay = data.relay;
  const relayUrl = `wss://${relay.name}.${relay.domain}`;
  const isOwner = user && (user.pubkey === relay.owner.pubkey || user.admin);

  const copyUrl = () => {
    navigator.clipboard.writeText(relayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-up">
      {/* ─── HERO BANNER ─── */}
      <div className="relative overflow-hidden rounded-2xl">
        {/* Banner image or gradient */}
        <div className="h-56 sm:h-64 w-full">
          {relay.banner_image ? (
            <img src={relay.banner_image} alt="" className="size-full object-cover" />
          ) : (
            <div className="size-full bg-gradient-to-br from-primary/15 via-purple-500/10 to-cyan-500/10">
              {/* Decorative grid */}
              <div className="size-full opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "32px 32px" }} />
            </div>
          )}
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        {/* Content overlay */}
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar className="size-20 sm:size-24 border-4 border-background shadow-2xl ring-2 ring-primary/20">
                {relay.profile_image ? (
                  <AvatarImage src={relay.profile_image} alt={relay.name} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-primary to-purple-500 text-primary-foreground text-3xl font-bold">
                  {relay.name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1.5 pb-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{relay.name}</h1>
                  {relay.status === "running" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                      <span className="relative flex size-1.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                      </span>
                      Online
                    </span>
                  )}
                </div>
                <p className="flex items-center gap-1.5 font-mono text-sm text-muted-foreground/80">
                  <Globe className="size-3.5" /> {relayUrl}
                </p>
              </div>
            </div>
            {isOwner && (
              <Button variant="outline" className="gap-1.5 border-border/30 bg-background/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/30 transition-all shrink-0" asChild>
                <Link to={`/relays/${slug}/settings`}>
                  <Settings className="size-4" /> Manage Relay
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ─── STATS ROW ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: relay.auth_required ? Lock : Unlock,
            label: relay.auth_required ? "Private" : "Public",
            sublabel: relay.auth_required ? "NIP-42 Auth" : "Open access",
            color: relay.auth_required ? "text-rose-400 bg-rose-500/10" : "text-emerald-400 bg-emerald-500/10",
          },
          {
            icon: Shield,
            label: relay.default_message_policy ? "Allow All" : "Restricted",
            sublabel: relay.default_message_policy ? "Open policy" : "Allowlist mode",
            color: "text-blue-400 bg-blue-500/10",
          },
          {
            icon: Users,
            label: `${1 + relay.moderators.length}`,
            sublabel: "Team members",
            color: "text-purple-400 bg-purple-500/10",
          },
          {
            icon: Calendar,
            label: relay.created_at ? new Date(relay.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—",
            sublabel: "Created",
            color: "text-amber-400 bg-amber-500/10",
          },
        ].map((stat, i) => (
          <Card key={i} className="border-border/20 bg-card/30 backdrop-blur-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-lg p-2 ${stat.color}`}>
                <stat.icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{stat.label}</p>
                <p className="text-xs text-muted-foreground/60">{stat.sublabel}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ─── MAIN CONTENT ─── */}
        <div className="space-y-6 lg:col-span-2">
          {/* About */}
          <Card className="border-border/20 bg-card/30 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <CardContent className="p-6">
              <h2 className="text-lg font-bold mb-3">About</h2>
              <p className="text-muted-foreground leading-relaxed">
                {relay.details || "A Nostr relay powered by relay.tools — the best relay management platform on earth."}
              </p>
            </CardContent>
          </Card>

          {/* Team */}
          <Card className="border-border/20 bg-card/30 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
            <CardContent className="p-6">
              <h2 className="text-lg font-bold mb-4">Team</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                  <Avatar className="size-9 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-purple-500 text-primary-foreground text-xs font-bold">
                      {relay.owner.pubkey.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm truncate">{relay.owner.pubkey.slice(0, 20)}...</p>
                    <p className="text-xs text-muted-foreground/60">Relay owner</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <Zap className="size-3" /> Owner
                  </span>
                </div>
                {relay.moderators.map((mod) => (
                  <div key={mod.id} className="flex items-center gap-3 rounded-xl bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                    <Avatar className="size-9 ring-2 ring-border/30">
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                        {mod.user.pubkey.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm truncate">{mod.user.pubkey.slice(0, 20)}...</p>
                      <p className="text-xs text-muted-foreground/60">Moderator</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                      Mod
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── SIDEBAR ─── */}
        <div className="space-y-4">
          {/* Connect card */}
          <Card className="border-border/20 bg-card/30 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Globe className="size-4 text-primary" /> Connect
              </h3>
              <div className="group flex items-center gap-2 rounded-xl bg-muted/40 p-3 transition-colors hover:bg-muted/60 cursor-pointer" onClick={copyUrl}>
                <span className="flex-1 break-all font-mono text-xs text-muted-foreground">{relayUrl}</span>
                <div className="shrink-0 rounded-lg bg-background/60 p-1.5 transition-colors group-hover:bg-primary/10">
                  {copied ? (
                    <Check className="size-4 text-emerald-400" />
                  ) : (
                    <Copy className="size-4 text-muted-foreground group-hover:text-primary" />
                  )}
                </div>
              </div>
              {copied && (
                <p className="text-xs text-emerald-400 text-center animate-fade-up">Copied to clipboard!</p>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          {isOwner && (
            <Card className="border-border/20 bg-card/30 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-bold text-sm">Quick Actions</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start gap-2 border-border/30 hover:border-primary/30 hover:bg-primary/5" asChild>
                    <Link to={`/relays/${slug}/settings`}>
                      <Settings className="size-4" /> Relay Settings
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2 border-border/30 hover:border-primary/30 hover:bg-primary/5" asChild>
                    <Link to={`/relays/${slug}/settings`}>
                      <Shield className="size-4" /> Access Control
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
