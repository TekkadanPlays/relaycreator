import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../lib/api";
import { Globe, Shield, Loader2, Search, Radio, ArrowRight } from "lucide-react";
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((relay) => (
            <Link key={relay.id} to={`/relays/${relay.name}`}>
              <Card className="group h-full border-border/50 transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="size-10 ring-2 ring-border/50 group-hover:ring-primary/30 transition-all">
                      {relay.profile_image ? (
                        <AvatarImage src={relay.profile_image} alt={relay.name} />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {relay.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold truncate group-hover:text-primary transition-colors">{relay.name}</h2>
                      <p className="font-mono text-xs text-muted-foreground truncate">
                        wss://{relay.name}.{relay.domain}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground/20 group-hover:text-primary/60 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>

                  {relay.details && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{relay.details}</p>
                  )}

                  <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
                    {relay.auth_required && (
                      <Badge variant="outline" className="gap-1 text-xs font-normal">
                        <Shield className="size-3" /> Auth
                      </Badge>
                    )}
                    {relay.status === "running" && (
                      <Badge variant="secondary" className="gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live
                      </Badge>
                    )}
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

