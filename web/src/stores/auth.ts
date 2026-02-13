import { create } from "zustand";
import { api } from "../lib/api";
import { clearWalletSession } from "../lib/coinos";

interface User {
  id: string;
  pubkey: string;
  name: string | null;
  admin: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("token"),
  loading: true,

  login: async () => {
    // 1. Get a login token from the API
    const { token: loginToken } = await api.get<{ token: string }>("/auth/login-token");

    // 2. Sign with NIP-07 extension
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

    // 3. Send signed event to API for JWT
    const { token, user } = await api.post<{ token: string; user: User }>("/auth/login", event);

    localStorage.setItem("token", token);
    set({ user, token, loading: false });
  },

  logout: () => {
    localStorage.removeItem("token");
    clearWalletSession();
    set({ user: null, token: null, loading: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const { user } = await api.get<{ user: User }>("/auth/me");
      set({ user, token, loading: false });
    } catch {
      localStorage.removeItem("token");
      set({ user: null, token: null, loading: false });
    }
  },
}));
