import { Router, Request, Response } from "express";

// Server-side Nostr event fetching via HTTP APIs
// Uses relay HTTP endpoints (nostr.band, purplepag.es) which are far more
// reliable than raw WebSocket connections from a server.

const router = Router();

const FETCH_TIMEOUT = 6000;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Fetch Nostr events via relay HTTP API.
 * Many relays support NIP-50 search or REQ-over-HTTP.
 * We use nostr.band's API and purplepag.es' HTTP endpoint.
 */
async function fetchEventsHttp(
  filter: { kinds: number[]; authors: string[] },
): Promise<any[]> {
  const events: any[] = [];

  // Strategy 1: nostr.band API (supports profile and relay list lookups)
  const nostrBandUrls = filter.kinds.map((kind) =>
    `https://api.nostr.band/v0/events?kinds=${kind}&authors=${filter.authors[0]}&limit=1`
  );

  // Strategy 2: purplepag.es HTTP API (REQ-over-HTTP)
  const purplePagesUrl = `https://purplepag.es/api/events?kinds=${filter.kinds.join(",")}&authors=${filter.authors[0]}&limit=1`;

  const fetchers: Promise<any[]>[] = [
    // nostr.band
    ...nostrBandUrls.map(async (url) => {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
        if (!r.ok) return [];
        const data: any = await r.json();
        return Array.isArray(data.events) ? data.events : Array.isArray(data) ? data : [];
      } catch { return []; }
    }),
    // purplepag.es
    (async () => {
      try {
        const r = await fetch(purplePagesUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
        if (!r.ok) return [];
        const data: any = await r.json();
        return Array.isArray(data) ? data : Array.isArray(data.events) ? data.events : [];
      } catch { return []; }
    })(),
  ];

  const results = await Promise.allSettled(fetchers);
  for (const r of results) {
    if (r.status === "fulfilled") events.push(...r.value);
  }

  // Deduplicate by id and sort by created_at descending
  const seen = new Set<string>();
  return events
    .filter((e) => e && e.id && !seen.has(e.id) && seen.add(e.id))
    .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
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
    const events = await fetchEventsHttp({ kinds: [0], authors: [pubkey] });
    if (events.length === 0) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const profile = JSON.parse(events[0].content) as NostrProfile;
    res.json({ profile });
  } catch (err) {
    console.error("[nostr-fetch] Profile fetch error:", err);
    res.status(502).json({ error: "Failed to fetch profile from indexers" });
  }
});

// ─── POST /profiles — Batch fetch kind-0 profiles ───────────────────────────

router.post("/profiles", async (req: Request, res: Response) => {
  const { pubkeys } = req.body;
  if (!Array.isArray(pubkeys) || pubkeys.length === 0) {
    res.status(400).json({ error: "pubkeys array required" });
    return;
  }

  // Cap at 50 to prevent abuse
  const validPubkeys = pubkeys
    .filter((pk: any) => typeof pk === "string" && /^[0-9a-f]{64}$/.test(pk))
    .slice(0, 50);

  if (validPubkeys.length === 0) {
    res.json({ profiles: {} });
    return;
  }

  try {
    const profiles: Record<string, NostrProfile & { pubkey: string }> = {};

    // Fetch in parallel, 10 at a time to avoid overwhelming indexers
    const batchSize = 10;
    for (let i = 0; i < validPubkeys.length; i += batchSize) {
      const batch = validPubkeys.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (pk: string) => {
          const events = await fetchEventsHttp({ kinds: [0], authors: [pk] });
          if (events.length > 0) {
            try {
              const data = JSON.parse(events[0].content) as NostrProfile;
              profiles[pk] = { ...data, pubkey: pk };
            } catch { /* invalid JSON content */ }
          }
        }),
      );
    }

    res.json({ profiles });
  } catch (err) {
    console.error("[nostr-fetch] Batch profile fetch error:", err);
    res.status(502).json({ error: "Failed to fetch profiles from indexers" });
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
    const events = await fetchEventsHttp({ kinds: [10002], authors: [pubkey] });
    if (events.length === 0) {
      res.status(404).json({ error: "Relay list not found" });
      return;
    }

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

    res.json({ relayList: { outbox, inbox, both } });
  } catch (err) {
    console.error("[nostr-fetch] Relay list fetch error:", err);
    res.status(502).json({ error: "Failed to fetch relay list from indexers" });
  }
});

export default router;
