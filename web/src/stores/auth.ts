import { createStore } from "../lib/store";
import { api } from "../lib/api";
import { fetchProfile, clearProfileCache } from "../lib/nostr";

export interface UserPermission {
  type: string;
  disclaimer_accepted: boolean;
}

export interface User {
  id: string;
  pubkey: string;
  name: string | null;
  picture: string | null;
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
        name: user.name || profile.display_name || profile.name || null,
      };
    }
  } catch { /* ignore */ }
  return user;
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
  authStore.set({ user: { ...user, picture: user.picture || null }, token, loading: false });

  // Enrich with Nostr profile in background (non-blocking)
  enrichUser(user).then((enriched) => {
    authStore.set({ ...authStore.get(), user: enriched });
  });
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
    authStore.set({ user: { ...user, picture: user.picture || null }, token, loading: false });

    // Enrich with Nostr profile in background
    enrichUser(user).then((enriched) => {
      authStore.set({ ...authStore.get(), user: enriched });
    });
  } catch {
    localStorage.removeItem("token");
    authStore.set({ user: null, token: null, loading: false });
  }
}
