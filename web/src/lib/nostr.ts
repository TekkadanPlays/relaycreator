// Direct WebSocket relay fetching for Nostr events
// Connects to indexer relays, queries for events, collects results, disconnects.
// Mirrors Android's ephemeral relay pattern — no server proxy needed.

const INDEXER_RELAYS = [
  "wss://relay.nostr.band",
  "wss://purplepag.es",
  "wss://relay.damus.io",
  "wss://nos.lol",
];

const FETCH_TIMEOUT = 8000;
const SETTLE_MS = 1500;

// ─── Core: fetch events from relays ─────────────────────────────────────────

interface NostrFilter {
  kinds: number[];
  authors?: string[];
  limit?: number;
  "#d"?: string[];
}

/**
 * Query multiple relays for events matching a filter.
 * Opens WebSocket connections, sends REQ, collects events until settle timeout,
 * then closes all connections. Returns deduplicated events sorted by created_at desc.
 */
async function queryRelays(
  relayUrls: string[],
  filter: NostrFilter,
  settleMs = SETTLE_MS,
  maxWaitMs = FETCH_TIMEOUT,
): Promise<any[]> {
  const events = new Map<string, any>(); // dedupe by event id
  const subId = "q_" + Math.random().toString(36).slice(2, 8);
  let lastEventAt = Date.now();

  const sockets: WebSocket[] = [];

  const done = new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      for (const ws of sockets) {
        try { ws.close(); } catch { /* ignore */ }
      }
      resolve();
    };

    // Hard timeout
    const hardTimer = setTimeout(finish, maxWaitMs);

    // Settle timer — resolve when no new events for settleMs
    const settleCheck = setInterval(() => {
      if (Date.now() - lastEventAt > settleMs) {
        clearInterval(settleCheck);
        clearTimeout(hardTimer);
        finish();
      }
    }, 200);

    for (const url of relayUrls) {
      try {
        const ws = new WebSocket(url);
        sockets.push(ws);

        ws.onopen = () => {
          ws.send(JSON.stringify(["REQ", subId, filter]));
        };

        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            if (data[0] === "EVENT" && data[1] === subId && data[2]) {
              const event = data[2];
              if (event.id && !events.has(event.id)) {
                events.set(event.id, event);
                lastEventAt = Date.now();
              }
            } else if (data[0] === "EOSE" && data[1] === subId) {
              // This relay is done, but keep connection open until settle
            }
          } catch { /* malformed message */ }
        };

        ws.onerror = () => { /* ignore individual relay errors */ };

        // Timeout for connection
        setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            try { ws.close(); } catch { /* ignore */ }
          }
        }, 5000);
      } catch { /* skip bad relay */ }
    }
  });

  await done;

  // Sort by created_at descending, return newest first
  return Array.from(events.values()).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
}

// ─── Kind-0: Profile ────────────────────────────────────────────────────────

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

export async function fetchProfile(pubkey: string): Promise<NostrProfile | null> {
  if (profileCache.has(pubkey)) return profileCache.get(pubkey)!;

  const events = await queryRelays(INDEXER_RELAYS, {
    kinds: [0],
    authors: [pubkey],
    limit: 1,
  });

  if (events.length === 0) return null;

  try {
    const profile = JSON.parse(events[0].content) as NostrProfile;
    profileCache.set(pubkey, profile);
    return profile;
  } catch {
    return null;
  }
}

// ─── Kind-10002: NIP-65 Relay List ──────────────────────────────────────────

export interface Nip65RelayList {
  outbox: string[];
  inbox: string[];
  both: string[];
}

export async function fetchRelayList(pubkey: string): Promise<Nip65RelayList | null> {
  const events = await queryRelays(INDEXER_RELAYS, {
    kinds: [10002],
    authors: [pubkey],
    limit: 1,
  });

  if (events.length === 0) return null;

  const event = events[0];
  const outbox: string[] = [];
  const inbox: string[] = [];
  const both: string[] = [];

  for (const tag of event.tags) {
    if (tag[0] !== "r" || !tag[1]) continue;
    const url = tag[1].replace(/\/$/, "");
    const marker = tag[2];
    if (marker === "read") inbox.push(url);
    else if (marker === "write") outbox.push(url);
    else { both.push(url); outbox.push(url); inbox.push(url); }
  }

  return { outbox, inbox, both };
}

// ─── Kind-3: Follow/Contact List ────────────────────────────────────────────

export interface ContactList {
  follows: string[];
  eventId: string;
  createdAt: number;
}

export async function fetchContacts(pubkey: string): Promise<ContactList | null> {
  const events = await queryRelays(INDEXER_RELAYS, {
    kinds: [3],
    authors: [pubkey],
    limit: 1,
  });

  if (events.length === 0) return null;

  const event = events[0];
  const follows: string[] = [];
  for (const tag of event.tags) {
    if (tag[0] === "p" && tag[1] && /^[0-9a-f]{64}$/.test(tag[1])) {
      follows.push(tag[1]);
    }
  }

  return { follows, eventId: event.id, createdAt: event.created_at };
}

// ─── Kind-10000: Mute List ──────────────────────────────────────────────────

export interface MuteList {
  mutedPubkeys: string[];
  mutedEventIds: string[];
  mutedHashtags: string[];
  mutedWords: string[];
  createdAt: number;
}

export async function fetchMuteList(pubkey: string): Promise<MuteList | null> {
  const events = await queryRelays(INDEXER_RELAYS, {
    kinds: [10000],
    authors: [pubkey],
    limit: 1,
  });

  if (events.length === 0) return null;

  const event = events[0];
  const mutedPubkeys: string[] = [];
  const mutedEventIds: string[] = [];
  const mutedHashtags: string[] = [];
  const mutedWords: string[] = [];

  for (const tag of event.tags) {
    if (tag[0] === "p" && tag[1]) mutedPubkeys.push(tag[1]);
    else if (tag[0] === "e" && tag[1]) mutedEventIds.push(tag[1]);
    else if (tag[0] === "t" && tag[1]) mutedHashtags.push(tag[1]);
    else if (tag[0] === "word" && tag[1]) mutedWords.push(tag[1]);
  }

  return { mutedPubkeys, mutedEventIds, mutedHashtags, mutedWords, createdAt: event.created_at };
}

// ─── Kind-10050: DM Relay List ──────────────────────────────────────────────

export interface DmRelayList {
  dmRelays: string[];
  createdAt: number;
}

export async function fetchDmRelays(pubkey: string): Promise<DmRelayList | null> {
  const events = await queryRelays(INDEXER_RELAYS, {
    kinds: [10050],
    authors: [pubkey],
    limit: 1,
  });

  if (events.length === 0) return null;

  const event = events[0];
  const dmRelays: string[] = [];
  for (const tag of event.tags) {
    if (tag[0] === "relay" && tag[1]) {
      const url = tag[1].trim().replace(/\/$/, "");
      if (url.startsWith("wss://") || url.startsWith("ws://")) dmRelays.push(url);
    }
  }

  return { dmRelays, createdAt: event.created_at };
}

// ─── Batch profile fetch ────────────────────────────────────────────────────

export async function fetchProfiles(pubkeys: string[]): Promise<Record<string, NostrProfile>> {
  const result: Record<string, NostrProfile> = {};
  const uncached: string[] = [];

  for (const pk of pubkeys) {
    if (profileCache.has(pk)) {
      result[pk] = profileCache.get(pk)!;
    } else {
      uncached.push(pk);
    }
  }

  if (uncached.length === 0) return result;

  // Batch query — fetch up to 50 profiles at once
  const batch = uncached.slice(0, 50);
  const events = await queryRelays(INDEXER_RELAYS, {
    kinds: [0],
    authors: batch,
    limit: batch.length,
  });

  for (const event of events) {
    try {
      const profile = JSON.parse(event.content) as NostrProfile;
      profileCache.set(event.pubkey, profile);
      result[event.pubkey] = profile;
    } catch { /* invalid JSON */ }
  }

  return result;
}

// ─── Utilities ──────────────────────────────────────────────────────────────

export function clearProfileCache() {
  profileCache.clear();
}
