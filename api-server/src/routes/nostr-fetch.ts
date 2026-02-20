import { Router, Request, Response } from "express";

// Server-side Nostr event fetching via WebSocket
// Uses Node 20+ native global WebSocket (browser-style API)
// This avoids browser WSS connection issues (Firefox blocks, CSP, extensions, etc.)

const router = Router();

const INDEXER_RELAYS = [
  "wss://purplepag.es",
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nos.lol",
  "wss://relay.primal.net",
];

const FETCH_TIMEOUT = 8000;

// ─── Helpers ────────────────────────────────────────────────────────────────

interface FetchResult<T> {
  data: T | null;
  created_at: number;
}

function fetchEventFromRelay<T>(
  relayUrl: string,
  filter: Record<string, unknown>,
  parseEvent: (event: any) => T,
): Promise<FetchResult<T> | null> {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (result: FetchResult<T> | null) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      try { ws.close(); } catch { /* ignore */ }
      resolve(result);
    };

    let ws: InstanceType<typeof globalThis.WebSocket>;
    try {
      ws = new globalThis.WebSocket(relayUrl);
    } catch {
      resolve(null);
      return;
    }

    const timer = setTimeout(() => finish(null), FETCH_TIMEOUT);
    const subId = "sf_" + Math.random().toString(36).slice(2, 10);
    let found: FetchResult<T> | null = null;

    ws.onopen = () => {
      ws.send(JSON.stringify(["REQ", subId, { ...filter, limit: 1 }]));
    };

    ws.onmessage = (msg: MessageEvent) => {
      try {
        const data = JSON.parse(typeof msg.data === "string" ? msg.data : msg.data.toString());
        if (data[0] === "EVENT" && data[1] === subId && data[2]) {
          const event = data[2];
          const parsed = parseEvent(event);
          if (parsed && (!found || event.created_at > found.created_at)) {
            found = { data: parsed, created_at: event.created_at };
          }
        }
        if (data[0] === "EOSE" && data[1] === subId) {
          ws.send(JSON.stringify(["CLOSE", subId]));
          finish(found);
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = () => finish(null);
    ws.onclose = () => finish(found);
  });
}

async function fetchFromIndexers<T>(
  filter: Record<string, unknown>,
  parseEvent: (event: any) => T,
): Promise<T | null> {
  const results = await Promise.all(
    INDEXER_RELAYS.map((url) => fetchEventFromRelay(url, filter, parseEvent).catch(() => null)),
  );

  const valid = results.filter((r): r is FetchResult<T> => r !== null && r.data !== null);
  if (valid.length === 0) return null;

  valid.sort((a, b) => b.created_at - a.created_at);
  return valid[0].data;
}

// ─── GET /profile/:pubkey — Fetch kind-0 profile ────────────────────────────

interface NostrProfile {
  name?: string;
  display_name?: string;
  picture?: string;
  banner?: string;
  about?: string;
  nip05?: string;
  lud16?: string;
}

router.get("/profile/:pubkey", async (req: Request, res: Response) => {
  const pubkey = req.params.pubkey as string;
  if (!pubkey || !/^[0-9a-f]{64}$/.test(pubkey)) {
    res.status(400).json({ error: "Invalid pubkey (must be 64-char hex)" });
    return;
  }

  try {
    const profile = await fetchFromIndexers<NostrProfile>(
      { kinds: [0], authors: [pubkey] },
      (event) => JSON.parse(event.content) as NostrProfile,
    );

    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    res.json({ profile });
  } catch (err) {
    console.error("[nostr-fetch] Profile fetch error:", err);
    res.status(502).json({ error: "Failed to fetch profile from indexers" });
  }
});

// ─── GET /relaylist/:pubkey — Fetch kind-10002 NIP-65 relay list ────────────

interface Nip65RelayList {
  outbox: string[];
  inbox: string[];
  both: string[];
}

router.get("/relaylist/:pubkey", async (req: Request, res: Response) => {
  const pubkey = req.params.pubkey as string;
  if (!pubkey || !/^[0-9a-f]{64}$/.test(pubkey)) {
    res.status(400).json({ error: "Invalid pubkey (must be 64-char hex)" });
    return;
  }

  try {
    const relayList = await fetchFromIndexers<Nip65RelayList>(
      { kinds: [10002], authors: [pubkey] },
      (event) => {
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
      },
    );

    if (!relayList) {
      res.status(404).json({ error: "Relay list not found" });
      return;
    }

    res.json({ relayList });
  } catch (err) {
    console.error("[nostr-fetch] Relay list fetch error:", err);
    res.status(502).json({ error: "Failed to fetch relay list from indexers" });
  }
});

export default router;
