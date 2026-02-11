import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../lib/api";
import { Globe, Shield, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const { data, isLoading } = useQuery({
    queryKey: ["publicRelays"],
    queryFn: () => api.get<{ relays: Relay[] }>("/relays/public"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Relay Directory</h1>
        <p className="mt-1 text-muted-foreground">Browse public Nostr relays hosted on relay.tools</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(data?.relays || []).map((relay) => (
            <Link key={relay.id} to={`/relays/${relay.name}`}>
              <Card className="group h-full transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      {relay.profile_image ? (
                        <AvatarImage src={relay.profile_image} alt={relay.name} />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Globe className="size-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold truncate group-hover:text-primary transition-colors">
                        {relay.name}
                      </h2>
                      <p className="font-mono text-xs text-muted-foreground truncate">
                        wss://{relay.name}.{relay.domain}
                      </p>
                    </div>
                  </div>
                  {relay.details && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{relay.details}</p>
                  )}
                  <div className="mt-3 flex gap-1.5">
                    {relay.auth_required && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Shield className="size-3" /> Auth
                      </Badge>
                    )}
                    <Badge
                      variant={relay.status === "running" ? "default" : "secondary"}
                      className={relay.status === "running" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs" : "text-xs"}
                    >
                      {relay.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {data?.relays?.length === 0 && (
            <div className="col-span-full flex flex-col items-center py-20 text-muted-foreground/50">
              <Globe className="size-12 mb-3" />
              No public relays listed yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
