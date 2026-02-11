import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../lib/api";
import { Globe, Shield, Loader2, Search, Radio, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/20 bg-gradient-to-br from-primary/5 via-card/50 to-purple-500/5 p-8 sm:p-10">
        <div className="absolute -top-20 -right-20 size-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 size-48 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Globe className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Relay Directory</h1>
              <p className="text-muted-foreground">
                {data?.relays?.length || 0} public relay{(data?.relays?.length || 0) !== 1 ? "s" : ""} on the network
              </p>
            </div>
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search relays..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background/60 backdrop-blur-sm border-border/30 focus:border-primary/40"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center animate-fade-up">
          <div className="rounded-2xl bg-muted/30 p-6 mb-4">
            <Globe className="size-12 text-muted-foreground/30" />
          </div>
          {search ? (
            <>
              <h3 className="text-lg font-bold">No results for "{search}"</h3>
              <p className="mt-1 text-muted-foreground">Try a different search term</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold">No public relays yet</h3>
              <p className="mt-1 text-muted-foreground">Be the first to list your relay in the directory</p>
              <Button className="mt-6 gap-2 bg-gradient-to-r from-primary to-purple-500 border-0" asChild>
                <Link to="/signup">
                  <Radio className="size-4" /> Create a Relay
                </Link>
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((relay, i) => (
            <Link key={relay.id} to={`/relays/${relay.name}`}>
              <Card
                className="group relative h-full overflow-hidden border-border/30 bg-card/30 backdrop-blur-sm transition-all duration-500 hover:bg-card/60 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/30 animate-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Shimmer */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" />

                <CardContent className="relative p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="size-11 ring-2 ring-border/30 group-hover:ring-primary/30 transition-all">
                      {relay.profile_image ? (
                        <AvatarImage src={relay.profile_image} alt={relay.name} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary font-bold">
                        {relay.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold truncate group-hover:text-primary transition-colors duration-300">
                        {relay.name}
                      </h2>
                      <p className="font-mono text-xs text-muted-foreground/60 truncate">
                        wss://{relay.name}.{relay.domain}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
                  </div>

                  {relay.details && (
                    <p className="text-sm text-muted-foreground/80 line-clamp-2 mb-3 leading-relaxed">{relay.details}</p>
                  )}

                  <div className="flex items-center gap-1.5 pt-2 border-t border-border/15">
                    {relay.auth_required && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs text-rose-400">
                        <Shield className="size-3" /> Auth
                      </span>
                    )}
                    {relay.status === "running" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                        <span className="relative flex size-1.5">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                        </span>
                        Live
                      </span>
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
