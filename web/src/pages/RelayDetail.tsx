import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Globe, Shield, Calendar, Copy } from "lucide-react";
import { useState } from "react";

interface RelayData {
  id: string;
  name: string;
  domain: string | null;
  status: string | null;
  details: string | null;
  default_message_policy: boolean;
  auth_required: boolean;
  created_at: string | null;
  profile_image: string | null;
  banner_image: string | null;
  owner: { pubkey: string; name: string | null };
  moderators: { id: string; user: { pubkey: string; name: string | null } }[];
}

export default function RelayDetail() {
  const { slug } = useParams();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["relay", slug],
    queryFn: () => api.get<{ relay: RelayData }>(`/relays/by-name/${slug}`),
    enabled: !!slug,
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg" /></div>;
  }

  if (error || !data?.relay) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Relay not found</h2>
        <p className="text-base-content/60 mt-2">The relay you are looking for does not exist.</p>
      </div>
    );
  }

  const relay = data.relay;
  const relayUrl = `wss://${relay.name}.${relay.domain}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(relayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Banner */}
      <div className="relative rounded-xl overflow-hidden mb-6">
        <div className="w-full h-48 bg-gradient-to-r from-primary/20 to-secondary/20">
          {relay.banner_image && (
            <img src={relay.banner_image} alt="" className="w-full h-full object-cover opacity-50" />
          )}
        </div>
        <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-base-300/90 to-transparent">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-full border-4 border-base-100 bg-base-200 overflow-hidden">
              {relay.profile_image ? (
                <img src={relay.profile_image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary">
                  {relay.name[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{relay.name}</h1>
              <p className="text-sm text-white/80 font-mono flex items-center gap-1">
                <Globe className="w-3 h-3" /> {relayUrl}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* About */}
        <div className="lg:col-span-2">
          <div className="card bg-base-200 mb-6">
            <div className="card-body">
              <h2 className="card-title">About</h2>
              <p>{relay.details || "A Nostr relay powered by relay.tools"}</p>
            </div>
          </div>

          {/* Team */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">Team</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="font-mono text-sm">{relay.owner.pubkey.slice(0, 16)}...</span>
                  <span className="badge badge-primary badge-sm">owner</span>
                </div>
                {relay.moderators.map((mod) => (
                  <div key={mod.id} className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-secondary" />
                    <span className="font-mono text-sm">{mod.user.pubkey.slice(0, 16)}...</span>
                    <span className="badge badge-secondary badge-sm">mod</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="card bg-base-200 mb-4">
            <div className="card-body">
              <h2 className="card-title">Connect</h2>
              <div className="flex items-center gap-2 bg-base-300 p-3 rounded-md">
                <span className="font-mono text-xs break-all flex-1">{relayUrl}</span>
                <button className="btn btn-ghost btn-sm" onClick={copyUrl}>
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copied && <p className="text-xs text-success mt-1">Copied!</p>}
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title text-sm">Info</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Created {relay.created_at ? new Date(relay.created_at).toLocaleDateString() : "Unknown"}</span>
                </div>
                <div className="flex items-center gap-2">
                  {relay.auth_required ? (
                    <span className="badge badge-secondary badge-sm">Auth required</span>
                  ) : (
                    <span className="badge badge-outline badge-sm">No auth</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
