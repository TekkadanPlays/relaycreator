import { verifyEvent } from "nostr-tools/pure";

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/**
 * Verify a NIP-98 HTTP Auth event (kind 27235).
 * Returns the pubkey if valid, null otherwise.
 */
export function verifyNip98Event(
  event: NostrEvent,
  expectedUrl: string,
  expectedMethod: string
): string | null {
  if (event.kind !== 27235) return null;

  // Check event is not too old (within 60 seconds)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - event.created_at) > 60) return null;

  // Verify the event signature
  if (!verifyEvent(event)) return null;

  // Check URL tag
  const urlTag = event.tags.find((t) => t[0] === "u");
  if (!urlTag || urlTag[1] !== expectedUrl) return null;

  // Check method tag
  const methodTag = event.tags.find((t) => t[0] === "method");
  if (!methodTag || methodTag[1].toUpperCase() !== expectedMethod.toUpperCase())
    return null;

  return event.pubkey;
}

/**
 * Verify a NIP-07 login event (kind 27235 with token content).
 * Used for initial authentication to get a JWT.
 */
export function verifyLoginEvent(event: NostrEvent, expectedToken: string): string | null {
  if (event.kind !== 27235) return null;

  // Verify the event signature
  if (!verifyEvent(event)) return null;

  // Check that the content matches the expected token
  if (event.content !== expectedToken) return null;

  // Check event is not too old (within 120 seconds for login)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - event.created_at) > 120) return null;

  return event.pubkey;
}
