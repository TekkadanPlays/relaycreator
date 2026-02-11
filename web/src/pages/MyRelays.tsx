import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import { Radio, Settings, Globe, Loader2, Plus } from "lucide-react";
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
        <h2 className="text-2xl font-bold">Sign in to view your relays</h2>
        <p className="mt-2 text-muted-foreground">Use a NIP-07 extension to authenticate</p>
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
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {(error as Error).message}
      </div>
    );
  }

  const relays = data?.myRelays || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">My Relays</h1>
        <Button size="sm" className="gap-1.5" asChild>
          <Link to="/signup">
            <Plus className="size-4" /> New Relay
          </Link>
        </Button>
      </div>

      {relays.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <Globe className="size-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-semibold">No relays yet</h3>
          <p className="mt-1 text-muted-foreground">Create your first Nostr relay to get started</p>
          <Button className="mt-6 gap-2" asChild>
            <Link to="/signup">
              <Radio className="size-4" /> Create Relay
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {relays.map((relay) => (
            <Link key={relay.id} to={`/relays/${relay.name}`}>
              <Card className="group h-full transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h2 className="text-lg font-bold group-hover:text-primary transition-colors">
                        {relay.name}
                      </h2>
                      <p className="font-mono text-xs text-muted-foreground">
                        wss://{relay.name}.{relay.domain}
                      </p>
                    </div>
                    <Badge
                      variant={relay.status === "running" ? "default" : "secondary"}
                      className={relay.status === "running" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : ""}
                    >
                      {relay.status}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-end">
                    <Settings className="size-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
