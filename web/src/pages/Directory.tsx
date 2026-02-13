import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../lib/api";
import {
  Globe, Loader2, Search, Radio, Copy, Check, Lock, Unlock,
  ArrowRight, Signal, Users, ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRelayDomain } from "../hooks/useRelayDomain";

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
  const fallbackDomain = useRelayDomain();

  function copyWss(e: React.MouseEvent, relay: Relay) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(`wss://${relay.name}.${relay.domain || fallbackDomain}`);
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
    { id: "all", label: "All", count: allRelays.length },
    { id: "public", label: "Public", count: publicCount },
    { id: "private", label: "Private", count: privateCount },
  ];

  return (
    <div className="animate-in">
      {/* Hero header */}
      <section className="pt-6 pb-8 sm:pt-10 sm:pb-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Relay <span className="text-gradient">Directory</span>
        </h1>
        <p className="mt-2 text-muted-foreground max-w-lg">
          Discover Nostr relays running on this platform. Connect directly, explore configurations, or find the right community.
        </p>

        {/* Stats */}
        {!isLoading && allRelays.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-primary/10 p-1.5">
                <Signal className="size-3.5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums leading-none">{allRelays.length}</p>
                <p className="text-[11px] text-muted-foreground">Total Relays</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-emerald-500/10 p-1.5">
                <span className="flex size-3.5 items-center justify-center">
                  <span className="size-2 rounded-full bg-emerald-400" />
                </span>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums leading-none">{liveCount}</p>
                <p className="text-[11px] text-muted-foreground">Live Now</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-blue-500/10 p-1.5">
                <Users className="size-3.5 text-blue-400" />
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums leading-none">{publicCount}</p>
                <p className="text-[11px] text-muted-foreground">Public</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-amber-500/10 p-1.5">
                <ShieldCheck className="size-3.5 text-amber-400" />
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums leading-none">{privateCount}</p>
                <p className="text-[11px] text-muted-foreground">Private</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/30 mb-6">
        <div className="flex items-center gap-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              <span className={cn(
                "ml-1.5 text-xs tabular-nums",
                filter === f.id ? "text-background/70" : "text-muted-foreground/60"
              )}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search relays..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10"
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
          <div className="size-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Globe className="size-7 text-muted-foreground/40" />
          </div>
          {search || filter !== "all" ? (
            <>
              <h3 className="text-lg font-semibold">No relays match</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                Try a different search term or filter.
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
              <h3 className="text-lg font-semibold">No relays listed yet</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                Be the first to launch a relay on this platform.
              </p>
              <Button className="mt-6 gap-2" asChild>
                <Link to="/signup">
                  Create a Relay <ArrowRight className="size-4" />
                </Link>
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((relay) => {
            const wss = `wss://${relay.name}.${relay.domain || fallbackDomain}`;
            const isLive = relay.status === "running";

            return (
              <Link
                key={relay.id}
                to={`/relays/${relay.name}`}
                className="group flex items-center gap-4 rounded-lg border border-border/30 px-4 py-3.5 transition-all hover:border-border/60 hover:bg-accent/30"
              >
                {/* Avatar */}
                <Avatar className="size-10 shrink-0">
                  {relay.profile_image && (
                    <AvatarImage src={relay.profile_image} alt={relay.name} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                    {relay.name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {relay.name}
                    </h2>
                    {isLive && (
                      <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" title="Live" />
                    )}
                    {relay.auth_required ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                        <Lock className="size-2.5" /> NIP-42
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                        <Unlock className="size-2.5" /> Public
                      </span>
                    )}
                  </div>
                  {relay.details && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {relay.details}
                    </p>
                  )}
                </div>

                {/* Connection string + copy */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <code className="text-xs font-mono text-muted-foreground/70 max-w-[220px] truncate">
                    {wss}
                  </code>
                  <button
                    onClick={(e) => copyWss(e, relay)}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Copy connection string"
                  >
                    {copiedId === relay.id ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>

                {/* Arrow */}
                <ArrowRight className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
