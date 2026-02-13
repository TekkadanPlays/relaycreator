import { useEffect, useState } from "react";
import { SimplePool } from "nostr-tools/pool";

export interface NostrProfile {
  name?: string;
  display_name?: string;
  displayName?: string;
  picture?: string;
  about?: string;
  nip05?: string;
  banner?: string;
  lud16?: string;
}

const profileCache = new Map<string, NostrProfile>();
const pendingFetches = new Map<string, Promise<NostrProfile | null>>();

const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nos.lol",
  "wss://relay.primal.net",
];

async function fetchProfile(pubkey: string): Promise<NostrProfile | null> {
  if (profileCache.has(pubkey)) return profileCache.get(pubkey)!;

  if (pendingFetches.has(pubkey)) return pendingFetches.get(pubkey)!;

  const promise = (async () => {
    try {
      const pool = new SimplePool();
      const event = await pool.get(DEFAULT_RELAYS, {
        kinds: [0],
        authors: [pubkey],
      });
      pool.close(DEFAULT_RELAYS);

      if (event?.content) {
        const profile: NostrProfile = JSON.parse(event.content);
        profileCache.set(pubkey, profile);
        return profile;
      }
      return null;
    } catch {
      return null;
    } finally {
      pendingFetches.delete(pubkey);
    }
  })();

  pendingFetches.set(pubkey, promise);
  return promise;
}

/**
 * Fetch a Nostr kind-0 profile for a given pubkey.
 * Caches results in memory so subsequent renders are instant.
 */
export function useNostrProfile(pubkey: string | undefined) {
  const [profile, setProfile] = useState<NostrProfile | null>(
    pubkey ? profileCache.get(pubkey) ?? null : null
  );
  const [loading, setLoading] = useState(!profileCache.has(pubkey ?? ""));

  useEffect(() => {
    if (!pubkey) {
      setProfile(null);
      setLoading(false);
      return;
    }

    if (profileCache.has(pubkey)) {
      setProfile(profileCache.get(pubkey)!);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchProfile(pubkey).then((p) => {
      if (!cancelled) {
        setProfile(p);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [pubkey]);

  const displayName = profile?.display_name || profile?.displayName || profile?.name;

  return { profile, displayName, loading };
}
