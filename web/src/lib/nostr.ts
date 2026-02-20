// Lightweight Nostr helpers for the relaycreator web frontend
// Fetches profile and relay list data via server-side API endpoints
// (server makes WSS connections to indexer relays, avoiding browser WSS issues)

export interface NostrProfile {
  name?: string;
  display_name?: string;
  picture?: string;
  banner?: string;
  about?: string;
  nip05?: string;
  lud16?: string;
}

export interface Nip65RelayList {
  outbox: string[];
  inbox: string[];
  both: string[];
}

const profileCache = new Map<string, NostrProfile>();

/**
 * Fetch kind-0 metadata for a pubkey via server-side API.
 * The server connects to indexer relays over WSS and returns the result.
 * Cached for the session.
 */
export async function fetchProfile(pubkey: string): Promise<NostrProfile | null> {
  if (profileCache.has(pubkey)) return profileCache.get(pubkey)!;

  try {
    const res = await fetch(`/api/nostr/profile/${pubkey}`);
    if (!res.ok) return null;
    const data = await res.json();
    const profile = data.profile as NostrProfile;
    if (profile) profileCache.set(pubkey, profile);
    return profile || null;
  } catch (err) {
    console.warn("[nostr] Profile fetch failed for", pubkey.slice(0, 8) + "...", err);
    return null;
  }
}

/**
 * Fetch kind-10002 relay list for a pubkey via server-side API.
 * Returns categorized outbox (write), inbox (read), and both relay URLs.
 */
export async function fetchRelayList(pubkey: string): Promise<Nip65RelayList | null> {
  try {
    const res = await fetch(`/api/nostr/relaylist/${pubkey}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.relayList as Nip65RelayList || null;
  } catch (err) {
    console.warn("[nostr] Relay list fetch failed for", pubkey.slice(0, 8) + "...", err);
    return null;
  }
}

/** Clear the profile cache (e.g. on logout) */
export function clearProfileCache() {
  profileCache.clear();
}
