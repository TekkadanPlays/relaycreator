// Lightweight Nostr helpers for the relaycreator web frontend
// Fetches kind-0 profile metadata from well-known relays

const PROFILE_RELAYS = [
  "wss://purplepag.es",
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nos.lol",
  "wss://relay.primal.net",
];

const PROFILE_TIMEOUT = 8000;

export interface NostrProfile {
  name?: string;
  display_name?: string;
  picture?: string;
  banner?: string;
  about?: string;
  nip05?: string;
  lud16?: string;
}

const profileCache = new Map<string, NostrProfile>();

/**
 * Fetch kind-0 metadata for a pubkey from well-known relays.
 * Returns the most recent profile found, cached for the session.
 */
export async function fetchProfile(pubkey: string): Promise<NostrProfile | null> {
  if (profileCache.has(pubkey)) return profileCache.get(pubkey)!;

  const results: { profile: NostrProfile; created_at: number }[] = [];

  const promises = PROFILE_RELAYS.map((url) =>
    fetchProfileFromRelay(url, pubkey).catch(() => null),
  );

  const settled = await Promise.allSettled(
    promises.map((p) =>
      Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), PROFILE_TIMEOUT))]),
    ),
  );

  for (const r of settled) {
    if (r.status === "fulfilled" && r.value) {
      results.push(r.value);
    }
  }

  if (results.length === 0) return null;

  // Use the most recent event
  results.sort((a, b) => b.created_at - a.created_at);
  const best = results[0].profile;
  profileCache.set(pubkey, best);
  return best;
}

async function fetchProfileFromRelay(
  url: string,
  pubkey: string,
): Promise<{ profile: NostrProfile; created_at: number } | null> {
  return new Promise((resolve, reject) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      reject(new Error("WebSocket constructor failed"));
      return;
    }

    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("timeout"));
    }, PROFILE_TIMEOUT);

    const subId = "p_" + pubkey.slice(0, 8) + "_" + Math.random().toString(36).slice(2, 6);
    let found: { profile: NostrProfile; created_at: number } | null = null;

    ws.onopen = () => {
      ws.send(JSON.stringify(["REQ", subId, { kinds: [0], authors: [pubkey], limit: 1 }]));
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data[0] === "EVENT" && data[1] === subId && data[2]) {
          const event = data[2];
          const profile = JSON.parse(event.content) as NostrProfile;
          found = { profile, created_at: event.created_at };
        }
        if (data[0] === "EOSE" && data[1] === subId) {
          ws.send(JSON.stringify(["CLOSE", subId]));
          clearTimeout(timer);
          ws.close();
          resolve(found);
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error("ws error"));
    };

    ws.onclose = () => {
      clearTimeout(timer);
      if (found) resolve(found);
      else reject(new Error("closed"));
    };
  });
}

// ─── NIP-65 Relay List (kind 10002) ─────────────────────────────────────────

export interface Nip65RelayList {
  outbox: string[];
  inbox: string[];
  both: string[];
}

/**
 * Fetch kind-10002 relay list for a pubkey from well-known relays.
 * Returns categorized outbox (write), inbox (read), and both relay URLs.
 */
export async function fetchRelayList(pubkey: string): Promise<Nip65RelayList | null> {
  const results: { tags: string[][]; created_at: number }[] = [];

  const promises = PROFILE_RELAYS.map((url) =>
    fetchRelayListFromRelay(url, pubkey).catch(() => null),
  );

  const settled = await Promise.allSettled(
    promises.map((p) =>
      Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), PROFILE_TIMEOUT))]),
    ),
  );

  for (const r of settled) {
    if (r.status === "fulfilled" && r.value) {
      results.push(r.value);
    }
  }

  if (results.length === 0) return null;

  // Use the most recent event
  results.sort((a, b) => b.created_at - a.created_at);
  const tags = results[0].tags;

  const outbox: string[] = [];
  const inbox: string[] = [];
  const both: string[] = [];

  for (const tag of tags) {
    if (tag[0] !== "r" || !tag[1]) continue;
    const url = tag[1].replace(/\/$/, "");
    const marker = tag[2]; // "read", "write", or undefined (both)
    if (marker === "read") inbox.push(url);
    else if (marker === "write") outbox.push(url);
    else { both.push(url); outbox.push(url); inbox.push(url); }
  }

  return { outbox, inbox, both };
}

async function fetchRelayListFromRelay(
  url: string,
  pubkey: string,
): Promise<{ tags: string[][]; created_at: number } | null> {
  return new Promise((resolve, reject) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      reject(new Error("WebSocket constructor failed"));
      return;
    }

    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("timeout"));
    }, PROFILE_TIMEOUT);

    const subId = "rl_" + pubkey.slice(0, 8) + "_" + Math.random().toString(36).slice(2, 6);
    let found: { tags: string[][]; created_at: number } | null = null;

    ws.onopen = () => {
      ws.send(JSON.stringify(["REQ", subId, { kinds: [10002], authors: [pubkey], limit: 1 }]));
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data[0] === "EVENT" && data[1] === subId && data[2]) {
          const event = data[2];
          if (!found || event.created_at > found.created_at) {
            found = { tags: event.tags, created_at: event.created_at };
          }
        }
        if (data[0] === "EOSE" && data[1] === subId) {
          ws.send(JSON.stringify(["CLOSE", subId]));
          clearTimeout(timer);
          ws.close();
          resolve(found);
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error("ws error"));
    };

    ws.onclose = () => {
      clearTimeout(timer);
      if (found) resolve(found);
      else reject(new Error("closed"));
    };
  });
}

/** Clear the profile cache (e.g. on logout) */
export function clearProfileCache() {
  profileCache.clear();
}
