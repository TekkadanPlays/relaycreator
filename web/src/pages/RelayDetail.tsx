import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import { Globe, Shield, Calendar, Copy, Check, Loader2, Settings } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

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
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Globe className="size-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-bold">Relay not found</h2>
        <p className="mt-2 text-muted-foreground">The relay you are looking for does not exist.</p>
      </div>
    );
  }

  const relay = data.relay;
  const relayUrl = `wss://${relay.name}.${relay.domain}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(relayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-xl">
        <div className="h-48 w-full bg-gradient-to-br from-primary/20 via-purple-500/10 to-secondary/20">
          {relay.banner_image && (
            <img src={relay.banner_image} alt="" className="size-full object-cover opacity-40" />
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent p-6">
          <div className="flex items-end gap-4">
            <Avatar className="size-20 border-4 border-background shadow-xl">
              {relay.profile_image ? (
                <AvatarImage src={relay.profile_image} alt={relay.name} />
              ) : null}
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                {relay.name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold tracking-tight">{relay.name}</h1>
                <Badge
                  variant={relay.status === "running" ? "default" : "secondary"}
                  className={relay.status === "running" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : ""}
                >
                  {relay.status}
                </Badge>
              </div>
              <p className="flex items-center gap-1.5 font-mono text-sm text-muted-foreground">
                <Globe className="size-3.5" /> {relayUrl}
              </p>
            </div>
          </div>
          {user && (user.pubkey === relay.owner.pubkey || user.admin) && (
            <Button size="sm" variant="outline" className="ml-auto gap-1.5 self-end" asChild>
              <Link to={`/relays/${slug}/settings`}>
                <Settings className="size-4" /> Settings
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {relay.details || "A Nostr relay powered by relay.tools"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <Shield className="size-4 text-primary shrink-0" />
                <span className="font-mono text-sm truncate flex-1">{relay.owner.pubkey.slice(0, 16)}...</span>
                <Badge className="bg-primary/15 text-primary border-primary/30">owner</Badge>
              </div>
              {relay.moderators.map((mod) => (
                <div key={mod.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <Shield className="size-4 text-muted-foreground shrink-0" />
                  <span className="font-mono text-sm truncate flex-1">{mod.user.pubkey.slice(0, 16)}...</span>
                  <Badge variant="secondary">mod</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connect</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                <span className="flex-1 break-all font-mono text-xs text-muted-foreground">{relayUrl}</span>
                <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={copyUrl}>
                  {copied ? (
                    <Check className="size-4 text-emerald-400" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="size-4 shrink-0" />
                <span>Created {relay.created_at ? new Date(relay.created_at).toLocaleDateString() : "Unknown"}</span>
              </div>
              <Separator />
              <div>
                {relay.auth_required ? (
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="size-3" /> Auth required
                  </Badge>
                ) : (
                  <Badge variant="outline">Open relay</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
