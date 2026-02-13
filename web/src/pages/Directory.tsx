import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../lib/api";
import {
  Globe, Shield, Loader2, Search, Radio, Copy, Check, Lock, Unlock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Relay {
  id: string;
  name: string;
  domain: string | null;
  status: string | null;
  details: string | null;
  auth_required: boolean;
  profile_image: string | null;
}

type Filter = "all" | "public" | "private";

export default function Directory() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
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

  const allRelays = data?.relays || [];
  const liveCount = allRelays.filter((r) => r.status === "running").length;
  const privateCount = allRelays.filter((r) => r.auth_required).length;
  const publicCount = allRelays.length - privateCount;

  const filtered = useMemo(() => {
    let result = allRelays;

    if (filter === "public") result = result.filter((r) => !r.auth_required);
    if (filter === "private") result = result.filter((r) => r.auth_required);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.details?.toLowerCase().includes(q) ||
          `${r.name}.${r.domain}`.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allRelays, search, filter]);

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All Relays", count: allRelays.length },
    { id: "public", label: "Public", count: publicCount },
    { id: "private", label: "Private", count: privateCount },
  ];

  return (
    <div className="animate-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relay Directory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Discover Nostr relays. Connect directly, or explore what each one offers.
        </p>
      </div>

      {/* Toolbar: filters + search + live count */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {f.label}
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                filter === f.id ? "bg-primary/20" : "bg-muted"
              )}>
                {f.count}
              </span>
            </button>
          ))}
          {liveCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground ml-2">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              {liveCount} live
            </span>
          )}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="size-12 rounded-xl bg-muted flex items-center justify-center mb-4">
            <Globe className="size-6 text-muted-foreground/50" />
          </div>
          {search || filter !== "all" ? (
            <>
              <h3 className="font-semibold">No relays match your filters</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different search term or filter
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => { setSearch(""); setFilter("all"); }}
              >
                Clear filters
              </Button>
            </>
          ) : (
            <>
              <h3 className="font-semibold">No public relays yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Be the first to list your relay in the directory</p>
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
              <Card className="group h-full border-border/50 transition-all hover:border-border hover:shadow-sm">
                <CardContent className="p-5">
                  {/* Identity row */}
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="size-10 shrink-0 ring-1 ring-border/50">
                      {relay.profile_image ? (
                        <AvatarImage src={relay.profile_image} alt={relay.name} />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                        {relay.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold truncate">{relay.name}</h2>
                        {relay.status === "running" && (
                          <span className="size-2 rounded-full bg-emerald-400 shrink-0" title="Live" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                        {relay.name}.{relay.domain}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {relay.details ? (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                      {relay.details}
                    </p>
                  ) : (
                    <div className="mb-3" />
                  )}

                  {/* Footer: badges + connection string */}
                  <div className="flex items-center gap-2 mb-3">
                    {relay.auth_required ? (
                      <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0">
                        <Lock className="size-2.5" /> NIP-42
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0">
                        <Unlock className="size-2.5" /> Public
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-2">
                    <code className="flex-1 truncate text-[11px] font-mono text-muted-foreground">
                      wss://{relay.name}.{relay.domain}
                    </code>
                    <button
                      onClick={(e) => copyWss(e, relay)}
                      className="shrink-0 rounded-sm p-1 text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                      title="Copy connection string"
                    >
                      {copiedId === relay.id ? (
                        <Check className="size-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="size-3.5" />
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
