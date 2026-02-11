import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../lib/api";
import { Globe, Shield } from "lucide-react";

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
    <div>
      <h1 className="text-3xl font-bold mb-6">Relay Directory</h1>

      {isLoading ? (
        <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.relays || []).map((relay) => (
            <Link key={relay.id} to={`/relays/${relay.name}`} className="card bg-base-200 hover:shadow-lg transition-shadow">
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-base-300 overflow-hidden flex items-center justify-center">
                    {relay.profile_image ? (
                      <img src={relay.profile_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Globe className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold">{relay.name}</h2>
                    <p className="text-xs text-base-content/50 font-mono">wss://{relay.name}.{relay.domain}</p>
                  </div>
                </div>
                {relay.details && <p className="text-sm text-base-content/60 mt-2 line-clamp-2">{relay.details}</p>}
                <div className="flex gap-1 mt-2">
                  {relay.auth_required && <span className="badge badge-secondary badge-xs gap-1"><Shield className="w-3 h-3" /> Auth</span>}
                  <span className={`badge badge-xs ${relay.status === "running" ? "badge-success" : "badge-warning"}`}>{relay.status}</span>
                </div>
              </div>
            </Link>
          ))}
          {data?.relays?.length === 0 && (
            <div className="col-span-full text-center py-16 text-base-content/40">
              No public relays listed yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
