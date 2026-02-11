import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import { Globe, Shield, Calendar, Copy, Check, Loader2, Settings, Users, Lock, Unlock } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data?.relay) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Globe className="size-10 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold">Relay not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">The relay you are looking for does not exist.</p>
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
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 border-2 border-border">
            {relay.profile_image ? (
              <AvatarImage src={relay.profile_image} alt={relay.name} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
              {relay.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight">{relay.name}</h1>
              {relay.status === "running" ? (
                <Badge variant="secondary" className="gap-1.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Online
                </Badge>
              ) : (
                <Badge variant="secondary">{relay.status}</Badge>
              )}
            </div>
            <p className="font-mono text-sm text-muted-foreground mt-0.5">{relayUrl}</p>
          </div>
        </div>
        {isOwner && (
          <Button variant="outline" className="gap-1.5 shrink-0" asChild>
            <Link to={`/relays/${slug}/settings`}>
              <Settings className="size-4" /> Manage
            </Link>
          </Button>
        )}
      </div>

      {/* Banner */}
      {relay.banner_image && (
        <div className="h-48 overflow-hidden rounded-lg border border-border/50">
          <img src={relay.banner_image} alt="" className="size-full object-cover" />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: relay.auth_required ? Lock : Unlock, label: relay.auth_required ? "Private" : "Public", sub: relay.auth_required ? "NIP-42 Auth" : "Open access" },
          { icon: Shield, label: relay.default_message_policy ? "Allow All" : "Restricted", sub: relay.default_message_policy ? "Open policy" : "Allowlist mode" },
          { icon: Users, label: `${1 + relay.moderators.length}`, sub: "Team members" },
          { icon: Calendar, label: relay.created_at ? new Date(relay.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—", sub: "Created" },
        ].map((stat, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-muted p-2">
                <stat.icon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{stat.label}</p>
                <p className="text-xs text-muted-foreground">{stat.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* About */}
          <Card>
            <CardHeader><CardTitle className="text-base">About</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {relay.details || "A Nostr relay powered by relay.tools."}
              </p>
            </CardContent>
          </Card>

          {/* Team */}
          <Card>
            <CardHeader><CardTitle className="text-base">Team</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {relay.owner.pubkey.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm truncate">{relay.owner.pubkey.slice(0, 20)}...</p>
                </div>
                <Badge variant="secondary">Owner</Badge>
              </div>
              {relay.moderators.map((mod) => (
                <div key={mod.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                      {mod.user.pubkey.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm truncate">{mod.user.pubkey.slice(0, 20)}...</p>
                  </div>
                  <Badge variant="outline">Mod</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Connect</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div
                className="flex items-center gap-2 rounded-lg border border-border/50 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={copyUrl}
              >
                <span className="flex-1 break-all font-mono text-xs text-muted-foreground">{relayUrl}</span>
                {copied ? (
                  <Check className="size-4 text-emerald-400 shrink-0" />
                ) : (
                  <Copy className="size-4 text-muted-foreground shrink-0" />
                )}
              </div>
              {copied && <p className="text-xs text-emerald-400 text-center">Copied!</p>}
            </CardContent>
          </Card>

          {isOwner && (
            <Card>
              <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <Link to={`/relays/${slug}/settings`}>
                    <Settings className="size-4" /> Relay Settings
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <Link to={`/relays/${slug}/settings`}>
                    <Shield className="size-4" /> Access Control
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
