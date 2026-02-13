import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

/**
 * Returns the platform's relay domain from /api/config.
 * Falls back to "mycelium.social" if the config call fails.
 * Use this as a fallback when relay.domain might be null.
 */
export function useRelayDomain(): string {
  const { data } = useQuery({
    queryKey: ["config"],
    queryFn: () => api.get<{ domain: string }>("/config"),
    staleTime: Infinity,
  });
  return data?.domain || "mycelium.social";
}
