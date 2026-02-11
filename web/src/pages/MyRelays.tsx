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

function StatusIndicator({ status }: { status: string | null }) {
  if (status === "running") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-xs font-medium text-emerald-400">Running</span>
      </div>
    );
  }
  if (status === "provision") {
    return (
      <div className="flex items-center gap-1.5">
        <Loader2 className="size-3 animate-spin text-amber-400" />
        <span className="text-xs font-medium text-amber-400">Provisioning</span>
      </div>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs">{status}</Badge>
  );
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
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-up">
        <div className="rounded-2xl bg-muted/30 p-6 mb-6">
          <Lock className="size-12 text-muted-foreground/40" />
        </div>
        <h2 className="text-2xl font-bold">Sign in to view your relays</h2>
        <p className="mt-2 text-muted-foreground">Use a NIP-07 browser extension to authenticate</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-fade-up">
        {(error as Error).message}
      </div>
    );
  }

  const relays = data?.myRelays || [];

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">My Relays</h1>
          <p className="mt-1 text-muted-foreground">
            {relays.length} relay{relays.length !== 1 ? "s" : ""} in your fleet
          </p>
        </div>
        <Button className="gap-1.5 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 border-0 shadow-lg shadow-primary/20" asChild>
          <Link to="/signup">
            <Plus className="size-4" /> New Relay
          </Link>
        </Button>
      </div>

      {relays.length === 0 ? (
        <div className="relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 py-24 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
          <div className="relative">
            <div className="mx-auto mb-6 rounded-2xl bg-muted/30 p-6">
              <Globe className="size-16 text-muted-foreground/30" />
            </div>
            <h3 className="text-xl font-bold">No relays yet</h3>
            <p className="mt-2 text-muted-foreground max-w-sm">Create your first Nostr relay and join the decentralized network</p>
            <Button className="mt-8 gap-2 bg-gradient-to-r from-primary to-purple-500 border-0 shadow-lg shadow-primary/20" asChild>
              <Link to="/signup">
                <Radio className="size-4" /> Create Your First Relay
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {relays.map((relay, i) => (
            <Card
              key={relay.id}
              className="group relative overflow-hidden border-border/30 bg-card/40 backdrop-blur-sm transition-all duration-500 hover:bg-card/70 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/30 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Top gradient accent */}
              <div className={`absolute inset-x-0 top-0 h-px ${relay.status === "running" ? "bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" : "bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"}`} />

              {/* Shimmer */}
              <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" />

              <CardContent className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1.5">
                    <h2 className="text-xl font-bold group-hover:text-primary transition-colors duration-300">
                      {relay.name}
                    </h2>
                    <p className="font-mono text-xs text-muted-foreground/70">
                      wss://{relay.name}.{relay.domain}
                    </p>
                  </div>
                  <StatusIndicator status={relay.status} />
                </div>

                {/* Feature pills */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {relay.auth_required && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs text-rose-400">
                      <Shield className="size-3" /> Auth
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                    <Zap className="size-3" /> {relay.default_message_policy ? "Open" : "Private"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/20">
                  <Button size="sm" variant="ghost" className="flex-1 gap-1.5 text-xs text-muted-foreground hover:text-foreground" asChild>
                    <Link to={`/relays/${relay.name}`}>
                      <ExternalLink className="size-3.5" /> View
                    </Link>
                  </Button>
                  <div className="w-px h-4 bg-border/30" />
                  <Button size="sm" variant="ghost" className="flex-1 gap-1.5 text-xs text-muted-foreground hover:text-primary" asChild>
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
