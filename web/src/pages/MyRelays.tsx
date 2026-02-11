import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import { Radio, Settings, Globe } from "lucide-react";

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
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Sign in to view your relays</h2>
        <p className="text-base-content/60">Use a NIP-07 extension to authenticate</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg" /></div>;
  }

  if (error) {
    return <div className="alert alert-error">{(error as Error).message}</div>;
  }

  const relays = data?.myRelays || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Relays</h1>
        <Link to="/signup" className="btn btn-primary btn-sm gap-1">
          <Radio className="w-4 h-4" /> New Relay
        </Link>
      </div>

      {relays.length === 0 ? (
        <div className="text-center py-16">
          <Globe className="w-16 h-16 mx-auto text-base-content/20 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No relays yet</h3>
          <p className="text-base-content/60 mb-4">Create your first Nostr relay to get started</p>
          <Link to="/signup" className="btn btn-primary">Create Relay</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {relays.map((relay) => (
            <Link key={relay.id} to={`/relays/${relay.name}`} className="card bg-base-200 hover:shadow-lg transition-shadow">
              <div className="card-body">
                <h2 className="card-title">
                  {relay.name}
                  <span className={`badge badge-sm ${relay.status === "running" ? "badge-success" : "badge-warning"}`}>
                    {relay.status}
                  </span>
                </h2>
                <p className="text-sm text-base-content/60 font-mono">
                  wss://{relay.name}.{relay.domain}
                </p>
                <div className="card-actions justify-end mt-2">
                  <Settings className="w-4 h-4 text-base-content/40" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
