import { createStore } from "../lib/store";
import { api } from "../lib/api";
import { fetchProfile, fetchRelayList, clearProfileCache } from "../lib/nostr";

export interface UserPermission {
  type: string;
  disclaimer_accepted: boolean;
}

export interface User {
  id: string;
  pubkey: string;
  name: string | null;
  picture: string | null;
  banner: string | null;
  about: string | null;
  admin: boolean;
  permissions?: UserPermission[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

export const authStore = createStore<AuthState>({
  user: null,
  token: localStorage.getItem("token"),
  loading: true,
});

/** Fetch Nostr kind-0 profile and merge picture/name into user */
async function enrichUser(user: User, retries = 2): Promise<User> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const profile = await fetchProfile(user.pubkey);
      if (profile) {
        console.log(`[auth] Profile enriched for ${user.pubkey.slice(0, 8)}... (attempt ${attempt + 1})`);
        return {
          ...user,
          picture: profile.picture || user.picture,
          banner: profile.banner || user.banner,
          about: profile.about || user.about,
          name: user.name || profile.display_name || profile.name || null,
        };
      }
    } catch (err) {
      console.warn(`[auth] Profile enrichment attempt ${attempt + 1} failed for ${user.pubkey.slice(0, 8)}...`, err);
    }
    // Wait before retry (1s, then 3s)
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, attempt === 0 ? 1000 : 3000));
      clearProfileCache(); // Clear cache so retry actually re-fetches
    }
  }
  console.warn(`[auth] Profile enrichment failed after ${retries + 1} attempts for ${user.pubkey.slice(0, 8)}...`);
  return user;
}

/** Fetch NIP-65 relay list and populate Relay Manager localStorage profiles */
async function populateRelayProfiles(pubkey: string): Promise<void> {
  try {
    const relayList = await fetchRelayList(pubkey);
    if (!relayList) return;

    const STORAGE_KEY = "mycelium_relay_profiles";
    let profiles: { id: string; name: string; relays: string[]; builtin: boolean }[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) profiles = JSON.parse(raw);
    } catch { /* ignore */ }

    // Update or create outbox/inbox profiles with NIP-65 data
    const updateProfile = (id: string, name: string, relays: string[]) => {
      if (relays.length === 0) return;
      const idx = profiles.findIndex((p) => p.id === id);
      if (idx >= 0) {
        profiles[idx] = { ...profiles[idx], relays };
      } else {
        profiles.push({ id, name, relays, builtin: true });
      }
    };

    updateProfile("outbox", "Outbox", relayList.outbox);
    updateProfile("inbox", "Inbox", relayList.inbox);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    console.log(`[auth] NIP-65 relay list populated: ${relayList.outbox.length} outbox, ${relayList.inbox.length} inbox`);
  } catch (err) {
    console.warn("[auth] Failed to fetch NIP-65 relay list:", err);
  }
}

let loginInProgress = false;

export async function login(): Promise<void> {
  if (loginInProgress) {
    console.warn("[auth] Login already in progress, ignoring duplicate call");
    return;
  }
  loginInProgress = true;

  try {
    console.log("[auth] Starting login...");
    const { token: loginToken } = await api.get<{ token: string }>("/auth/login-token");
    console.log("[auth] Got login token:", loginToken.slice(0, 8) + "...");

    const nostr = (window as any).nostr;
    if (!nostr) {
      throw new Error("No NIP-07 extension found. Install Alby, nos2x, or similar.");
    }

    const unsigned = {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: loginToken,
    };
    console.log("[auth] Requesting signature...");
    const event = await nostr.signEvent(unsigned);
    console.log("[auth] Signed event:", JSON.stringify({ id: event?.id, pubkey: event?.pubkey, kind: event?.kind, hasContent: !!event?.content, hasSig: !!event?.sig }));

    if (!event || !event.id || !event.pubkey || !event.sig) {
      throw new Error("Signer returned invalid event (missing id, pubkey, or sig)");
    }

    console.log("[auth] POSTing to /auth/login...");
    const { token, user } = await api.post<{ token: string; user: User }>("/auth/login", event);
    console.log("[auth] Login success! User:", user.pubkey.slice(0, 8) + "...", "admin:", user.admin);

    localStorage.setItem("token", token);
    authStore.set({ user: { ...user, picture: user.picture || null, banner: null, about: null }, token, loading: false });

    // Enrich with Nostr profile and NIP-65 relay list in background (non-blocking)
    enrichUser(user).then((enriched) => {
      authStore.set({ ...authStore.get(), user: enriched });
    });
    populateRelayProfiles(user.pubkey);
  } finally {
    loginInProgress = false;
  }
}

export function logout(): void {
  // Purge all user-related state
  localStorage.removeItem("token");
  localStorage.removeItem("mycelium_relay_profiles");
  clearProfileCache();
  authStore.set({ user: null, token: null, loading: false });
  console.log("[auth] Logged out, all user state purged");
}

export async function checkAuth(): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    authStore.set({ loading: false });
    return;
  }
  try {
    const { user } = await api.get<{ user: User }>("/auth/me");

    // If a NIP-07 extension is available, verify the JWT's pubkey matches
    // the extension's current pubkey. If they differ, the user switched
    // accounts in their signer — invalidate the old session.
    const nostr = (window as any).nostr;
    if (nostr?.getPublicKey) {
      try {
        const extensionPubkey = await nostr.getPublicKey();
        if (extensionPubkey && extensionPubkey !== user.pubkey) {
          console.log(`[auth] Extension pubkey (${extensionPubkey.slice(0, 8)}...) differs from session (${user.pubkey.slice(0, 8)}...) — invalidating session`);
          localStorage.removeItem("token");
          clearProfileCache();
          authStore.set({ user: null, token: null, loading: false });
          return;
        }
      } catch {
        // Extension denied access or unavailable — continue with existing session
      }
    }

    authStore.set({ user: { ...user, picture: user.picture || null, banner: null, about: null }, token, loading: false });

    // Enrich with Nostr profile and NIP-65 relay list in background
    enrichUser(user).then((enriched) => {
      authStore.set({ ...authStore.get(), user: enriched });
    });
    populateRelayProfiles(user.pubkey);
  } catch {
    localStorage.removeItem("token");
    authStore.set({ user: null, token: null, loading: false });
  }
}
