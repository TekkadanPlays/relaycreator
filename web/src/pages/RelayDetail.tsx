import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import { useRelayDomain } from "../hooks/useRelayDomain";
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
  const fallbackDomain = useRelayDomain();
  const relayDomain = relay.domain || fallbackDomain;
  const relayUrl = `wss://${relay.name}.${relayDomain}`;
  const isOwner = user && (user.pubkey === relay.owner.pubkey || user.admin);

  const copyUrl = () => {
    navigator.clipboard.writeText(relayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-14 border-2 border-border">
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
            {relay.details && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1 max-w-lg">{relay.details}</p>
            )}
          </div>
        </div>
        {isOwner && (
          <Button variant="outline" className="gap-1.5 shrink-0" asChild>
            <Link to={`/relays/${slug}/settings`}>
              <Settings className="size-4" /> Manage Relay
            </Link>
          </Button>
        )}
      </div>

      {/* Banner */}
      {relay.banner_image && (
        <div className="h-44 overflow-hidden rounded-lg border border-border/50">
          <img src={relay.banner_image} alt="" className="size-full object-cover" />
        </div>
      )}

      {/* Connection + Config bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border/50 bg-card px-4 py-3">
        <div
          className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors group"
          onClick={copyUrl}
        >
          <code className="font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors">{relayUrl}</code>
          {copied ? (
            <Check className="size-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Copy className="size-3.5 text-muted-foreground shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {relay.auth_required ? <Lock className="size-3" /> : <Unlock className="size-3" />}
            {relay.auth_required ? "NIP-42 Auth" : "Public"}
          </span>
          <span className="text-border">·</span>
          <span className="flex items-center gap-1.5">
            <Shield className="size-3" />
            {relay.default_message_policy ? "Allow all" : "Allowlist"}
          </span>
          <span className="text-border">·</span>
          <span className="flex items-center gap-1.5">
            <Users className="size-3" />
            {1 + relay.moderators.length} member{1 + relay.moderators.length !== 1 ? "s" : ""}
          </span>
          {relay.created_at && (
            <>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3" />
                {new Date(relay.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Team */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Team</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
              <Avatar className="size-6">
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
                  {relay.owner.pubkey.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-mono text-xs truncate max-w-[140px]">{relay.owner.pubkey.slice(0, 16)}...</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Owner</Badge>
            </div>
            {relay.moderators.map((mod) => (
              <div key={mod.id} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                <Avatar className="size-6">
                  <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-medium">
                    {mod.user.pubkey.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-mono text-xs truncate max-w-[140px]">{mod.user.pubkey.slice(0, 16)}...</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Mod</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Owner actions */}
      {isOwner && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link to={`/relays/${slug}/settings`}>
              <Settings className="size-3.5" /> General Settings
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link to={`/relays/${slug}/settings`} onClick={() => {}}>
              <Shield className="size-3.5" /> Access Control
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link to={`/relays/${slug}/settings`}>
              <Users className="size-3.5" /> Manage Team
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
