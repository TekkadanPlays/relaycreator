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
async function enrichUser(user: User): Promise<User> {
  try {
    const profile = await fetchProfile(user.pubkey);
    if (profile) {
      return {
        ...user,
        picture: profile.picture || user.picture,
        banner: profile.banner || user.banner,
        about: profile.about || user.about,
        name: user.name || profile.display_name || profile.name || null,
      };
    }
  } catch { /* ignore */ }
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

export async function login(): Promise<void> {
  const { token: loginToken } = await api.get<{ token: string }>("/auth/login-token");

  const nostr = (window as any).nostr;
  if (!nostr) {
    throw new Error("No NIP-07 extension found. Install Alby, nos2x, or similar.");
  }

  const event = await nostr.signEvent({
    kind: 27235,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: loginToken,
  });

  const { token, user } = await api.post<{ token: string; user: User }>("/auth/login", event);

  localStorage.setItem("token", token);
  authStore.set({ user: { ...user, picture: user.picture || null, banner: null, about: null }, token, loading: false });

  // Enrich with Nostr profile and NIP-65 relay list in background (non-blocking)
  enrichUser(user).then((enriched) => {
    authStore.set({ ...authStore.get(), user: enriched });
  });
  populateRelayProfiles(user.pubkey);
}

export function logout(): void {
  localStorage.removeItem("token");
  clearProfileCache();
  authStore.set({ user: null, token: null, loading: false });
}

export async function checkAuth(): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    authStore.set({ loading: false });
    return;
  }
  try {
    const { user } = await api.get<{ user: User }>("/auth/me");
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
