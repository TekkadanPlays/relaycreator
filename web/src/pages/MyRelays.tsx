import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import { useRelayDomain } from "../hooks/useRelayDomain";
import {
  Radio, Settings, Globe, Loader2, Plus, Lock, Zap,
  ExternalLink, Shield, Copy, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function MyRelays() {
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["myRelays"],
    queryFn: () => api.get<{ myRelays: Relay[]; moderatedRelays: any[] }>("/relays/mine"),
    enabled: !!user,
  });

  const fallbackDomain = useRelayDomain();

  function copyWss(relay: Relay) {
    navigator.clipboard.writeText(`wss://${relay.name}.${relay.domain || fallbackDomain}`);
    setCopiedId(relay.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

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
  const running = relays.filter((r) => r.status === "running").length;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Relays</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {relays.length} relay{relays.length !== 1 ? "s" : ""}{relays.length > 0 && ` · ${running} running`}
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
        <div className="rounded-lg border border-border/50 divide-y divide-border/30">
          {relays.map((relay) => (
            <div key={relay.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center hover:bg-muted/20 transition-colors">
              {/* Left: identity + status */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className={`size-2.5 rounded-full shrink-0 ${
                  relay.status === "running" ? "bg-emerald-400" :
                  relay.status === "provision" ? "bg-amber-400 animate-pulse" :
                  "bg-muted-foreground/30"
                }`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-sm truncate">{relay.name}</h2>
                    <div className="flex items-center gap-1.5">
                      {relay.auth_required && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 shrink-0">
                          <Lock className="size-2.5" /> Auth
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 shrink-0">
                        {relay.default_message_policy ? "Open" : "Allowlist"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <code className="font-mono text-xs text-muted-foreground truncate">
                      wss://{relay.name}.{relay.domain || fallbackDomain}
                    </code>
                    <button
                      onClick={() => copyWss(relay)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy connection string"
                    >
                      {copiedId === relay.id ? (
                        <Check className="size-3 text-emerald-500" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-1.5 shrink-0 sm:ml-auto">
                <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" asChild>
                  <Link to={`/relays/${relay.name}`}>
                    <ExternalLink className="size-3.5" /> View
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" asChild>
                  <Link to={`/relays/${relay.name}/settings`}>
                    <Settings className="size-3.5" /> Settings
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
