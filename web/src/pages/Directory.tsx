import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../lib/api";
import { Globe, Shield, Loader2, Search, Radio, ArrowRight, Copy, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Relay {
  id: string;
  name: string;
  domain: string | null;
  status: string | null;
  details: string | null;
  auth_required: boolean;
  profile_image: string | null;
}

export default function Directory() {
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyWss(e: React.MouseEvent, relay: Relay) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(`wss://${relay.name}.${relay.domain}`);
    setCopiedId(relay.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["publicRelays"],
    queryFn: () => api.get<{ relays: Relay[] }>("/relays/public"),
  });

  const filtered = useMemo(() => {
    const relays = data?.relays || [];
    if (!search.trim()) return relays;
    const q = search.toLowerCase();
    return relays.filter(
      (r) => r.name.toLowerCase().includes(q) || r.details?.toLowerCase().includes(q)
    );
  }, [data?.relays, search]);

  const totalRelays = data?.relays?.length || 0;
  const liveRelays = data?.relays?.filter(r => r.status === "running").length || 0;
  const authRelays = data?.relays?.filter(r => r.auth_required).length || 0;

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relay Directory</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="secondary" className="gap-1.5 text-xs">
              <Globe className="size-3" /> {totalRelays} total
            </Badge>
            <Badge variant="secondary" className="gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-400" /> {liveRelays} live
            </Badge>
            {authRelays > 0 && (
              <Badge variant="secondary" className="gap-1.5 text-xs">
                <Shield className="size-3" /> {authRelays} private
              </Badge>
            )}
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search relays..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="size-12 rounded-xl bg-muted flex items-center justify-center mb-4">
            <Globe className="size-6 text-muted-foreground/50" />
          </div>
          {search ? (
            <>
              <h3 className="font-semibold">No results for "{search}"</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search term</p>
            </>
          ) : (
            <>
              <h3 className="font-semibold">No public relays yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Be the first to list your relay</p>
              <Button className="mt-6 gap-2" asChild>
                <Link to="/signup">
                  <Radio className="size-4" /> Create a Relay
                </Link>
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((relay) => (
            <Link key={relay.id} to={`/relays/${relay.name}`}>
              <Card className="group h-full transition-all hover:bg-accent/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-9 shrink-0">
                      {relay.profile_image ? (
                        <AvatarImage src={relay.profile_image} alt={relay.name} />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {relay.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold truncate">{relay.name}</h2>
                        {relay.status === "running" && (
                          <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" title="Live" />
                        )}
                        {relay.auth_required && (
                          <Shield className="size-3 text-muted-foreground shrink-0" />
                        )}
                      </div>
                      {relay.details && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{relay.details}</p>
                      )}
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground/30 group-hover:text-foreground/50 shrink-0 mt-0.5 transition-colors" />
                  </div>

                  {/* Connection string — the thing users actually need */}
                  <div className="mt-3 flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5">
                    <code className="flex-1 truncate text-[11px] font-mono text-muted-foreground">
                      wss://{relay.name}.{relay.domain}
                    </code>
                    <button
                      onClick={(e) => copyWss(e, relay)}
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
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

