import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import { Radio, Settings, Globe, Loader2, Plus, Lock, Zap, ExternalLink, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Relay {
  id: string;
  name: string;
  domain: string | null;
  status: string | null;
  default_message_policy: boolean;
  auth_required: boolean;
  created_at: string | null;
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "running") {
    return (
      <Badge variant="secondary" className="gap-1.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        Running
      </Badge>
    );
  }
  if (status === "provision") {
    return (
      <Badge variant="secondary" className="gap-1.5 bg-amber-500/10 text-amber-400 border-amber-500/20">
        <Loader2 className="size-3 animate-spin" />
        Provisioning
      </Badge>
    );
  }
  return <Badge variant="secondary">{status}</Badge>;
}

export default function MyRelays() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["myRelays"],
    queryFn: () => api.get<{ myRelays: Relay[]; moderatedRelays: any[] }>("/relays/mine"),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Lock className="size-10 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold">Sign in to view your relays</h2>
        <p className="mt-1 text-sm text-muted-foreground">Use a NIP-07 browser extension to authenticate</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {(error as Error).message}
      </div>
    );
  }

  const relays = data?.myRelays || [];

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Relays</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {relays.length} relay{relays.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" asChild>
          <Link to="/signup">
            <Plus className="size-4" /> New Relay
          </Link>
        </Button>
      </div>

      {relays.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <Globe className="size-10 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold">No relays yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">Create your first Nostr relay and join the decentralized network</p>
          <Button className="mt-6 gap-2" asChild>
            <Link to="/signup">
              <Radio className="size-4" /> Create Your First Relay
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {relays.map((relay) => (
            <Card key={relay.id} className="border-border/50 transition-colors hover:border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold truncate">{relay.name}</h2>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5">
                      wss://{relay.name}.{relay.domain}
                    </p>
                  </div>
                  <StatusBadge status={relay.status} />
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {relay.auth_required && (
                    <Badge variant="outline" className="gap-1 text-xs font-normal">
                      <Shield className="size-3" /> Auth
                    </Badge>
                  )}
                  <Badge variant="outline" className="gap-1 text-xs font-normal">
                    <Zap className="size-3" /> {relay.default_message_policy ? "Open" : "Private"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                  <Button size="sm" variant="ghost" className="flex-1 gap-1.5 text-xs" asChild>
                    <Link to={`/relays/${relay.name}`}>
                      <ExternalLink className="size-3.5" /> View
                    </Link>
                  </Button>
                  <div className="w-px h-4 bg-border" />
                  <Button size="sm" variant="ghost" className="flex-1 gap-1.5 text-xs" asChild>
                    <Link to={`/relays/${relay.name}/settings`}>
                      <Settings className="size-3.5" /> Settings
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
