import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { Link } from "inferno-router";
import { Card, CardContent } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { Badge } from "@/ui/Badge";
import { Input } from "@/ui/Input";
import { Separator } from "@/ui/Separator";
import {
  Radio, Globe, Zap, Search, Plus, Trash2, Check, Copy,
  Settings, RefreshCw, Loader2, AlertCircle, ExternalLink,
} from "@/lib/icons";
import { cn } from "@/ui/utils";
import { authStore } from "../stores/auth";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RelayProfile {
  id: string;
  name: string;
  relays: string[];
  builtin: boolean;
}

interface RelayHealthData {
  online: boolean;
  uptime: number;
  rttOpen: number | null;
  software: string;
  version: string;
}

interface RelayManagerState {
  profiles: RelayProfile[];
  activeProfileId: string;
  newRelayUrl: string;
  newProfileName: string;
  editingProfileId: string | null;
  editingName: string;
  copiedUrl: string | null;
  relayStatuses: Map<string, "connected" | "connecting" | "disconnected" | "error">;
  testing: string | null;
  healthData: Map<string, RelayHealthData>;
  healthLoading: boolean;
  nip65Status: "idle" | "loaded" | "empty";
}

const STORAGE_KEY = "mycelium_relay_profiles";
const ACTIVE_KEY = "mycelium_active_profile";

const DEFAULT_PROFILES: RelayProfile[] = [
  { id: "outbox", name: "Outbox", relays: [], builtin: true },
  { id: "inbox", name: "Inbox", relays: [], builtin: true },
  { id: "indexers", name: "Indexers", relays: ["wss://relay.nostr.band", "wss://purplepag.es"], builtin: true },
  { id: "dm", name: "DM Relays", relays: [], builtin: true },
  { id: "announcement", name: "Announcement", relays: [], builtin: true },
  { id: "drafts", name: "Drafts", relays: [], builtin: true },
  { id: "blossom", name: "Blossom", relays: [], builtin: true },
  { id: "nip96", name: "NIP-96", relays: [], builtin: true },
];

// ─── Persistence ────────────────────────────────────────────────────────────

function loadProfiles(): RelayProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved: RelayProfile[] = JSON.parse(raw);
      // Merge in any new built-in categories that didn't exist when user last saved
      const savedIds = new Set(saved.map((p) => p.id));
      for (const def of DEFAULT_PROFILES) {
        if (!savedIds.has(def.id)) saved.push({ ...def });
      }
      return saved;
    }
  } catch { /* ignore */ }
  return DEFAULT_PROFILES.map((p) => ({ ...p }));
}

function saveProfiles(profiles: RelayProfile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

function loadActiveId(): string {
  return localStorage.getItem(ACTIVE_KEY) || "outbox";
}

function saveActiveId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

// ─── Component ──────────────────────────────────────────────────────────────

export default class RelayManager extends Component<{}, RelayManagerState> {
  declare state: RelayManagerState;
  private unsubAuth: (() => void) | null = null;

  constructor(props: {}) {
    super(props);
    this.state = {
      profiles: loadProfiles(),
      activeProfileId: loadActiveId(),
      newRelayUrl: "",
      newProfileName: "",
      editingProfileId: null,
      editingName: "",
      copiedUrl: null,
      relayStatuses: new Map(),
      testing: null,
      healthData: new Map(),
      healthLoading: false,
      nip65Status: "idle",
    };
  }

  componentDidMount() {
    // Test connectivity for active profile relays
    const active = this.getActiveProfile();
    if (active) {
      for (const url of active.relays) this.testRelay(url);
    }

    // Subscribe to auth changes — re-read profiles when NIP-65 populates
    this.unsubAuth = authStore.subscribe((auth) => {
      if (auth.user) {
        // Give populateRelayProfiles() a moment to write to localStorage
        setTimeout(() => {
          const freshProfiles = loadProfiles();
          const active = freshProfiles.find((p) => p.id === this.state.activeProfileId) || freshProfiles[0];
          const hadRelays = this.state.profiles.reduce((n, p) => n + p.relays.length, 0);
          const hasRelays = freshProfiles.reduce((n, p) => n + p.relays.length, 0);
          this.setState({
            profiles: freshProfiles,
            nip65Status: hasRelays > hadRelays ? "loaded" : hadRelays > 0 ? "loaded" : "empty",
          });
          // Fetch health data for all relays in profiles
          this.fetchHealthData(freshProfiles);
          // Test new relays
          if (active) {
            for (const url of active.relays) {
              if (!this.state.relayStatuses.has(url)) this.testRelay(url);
            }
          }
        }, 1500);
      }
    });

    // Also fetch health data on initial load if profiles have relays
    const profiles = this.state.profiles;
    const totalRelays = profiles.reduce((n, p) => n + p.relays.length, 0);
    if (totalRelays > 0) {
      this.setState({ nip65Status: "loaded" });
      this.fetchHealthData(profiles);
    }
  }

  componentWillUnmount() {
    this.unsubAuth?.();
  }

  /** Fetch health data from the native monitor API for all relays across all profiles */
  private async fetchHealthData(profiles: RelayProfile[]) {
    const allUrls = new Set<string>();
    for (const p of profiles) for (const u of p.relays) allUrls.add(u);
    if (allUrls.size === 0) return;

    this.setState({ healthLoading: true });
    const healthData = new Map(this.state.healthData);

    // Fetch in parallel (monitor API is fast, local SQLite)
    await Promise.allSettled(
      Array.from(allUrls).map(async (url) => {
        try {
          const res = await fetch(`/api/rstate/relays/state?relayUrl=${encodeURIComponent(url)}`);
          if (!res.ok) return;
          const data = await res.json();
          healthData.set(url, {
            online: !!data.online,
            uptime: data.uptime || 0,
            rttOpen: data.rtt?.open?.value ?? null,
            software: data.software?.family?.value || "",
            version: data.software?.version?.value || "",
          });
        } catch { /* monitor unavailable for this relay */ }
      }),
    );

    this.setState({ healthData, healthLoading: false });
  }

  private getActiveProfile(): RelayProfile | undefined {
    return this.state.profiles.find((p) => p.id === this.state.activeProfileId) || this.state.profiles[0];
  }

  private async testRelay(url: string) {
    const statuses = new Map(this.state.relayStatuses);
    statuses.set(url, "connecting");
    this.setState({ relayStatuses: statuses });

    try {
      const ws = new WebSocket(url);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { ws.close(); reject(new Error("timeout")); }, 5000);
        ws.onopen = () => { clearTimeout(timer); ws.close(); resolve(); };
        ws.onerror = () => { clearTimeout(timer); reject(new Error("error")); };
      });
      const s2 = new Map(this.state.relayStatuses);
      s2.set(url, "connected");
      this.setState({ relayStatuses: s2 });
    } catch {
      const s2 = new Map(this.state.relayStatuses);
      s2.set(url, "error");
      this.setState({ relayStatuses: s2 });
    }
  }

  private testAllRelays = () => {
    const active = this.getActiveProfile();
    if (active) {
      for (const url of active.relays) this.testRelay(url);
    }
  };

  private setActiveProfile = (id: string) => {
    saveActiveId(id);
    this.setState({ activeProfileId: id, relayStatuses: new Map() }, () => {
      const active = this.getActiveProfile();
      if (active) for (const url of active.relays) this.testRelay(url);
    });
  };

  private addRelay = () => {
    let url = this.state.newRelayUrl.trim();
    if (!url) return;
    if (!url.startsWith("wss://") && !url.startsWith("ws://")) url = "wss://" + url;

    const profiles = this.state.profiles.map((p) => {
      if (p.id === this.state.activeProfileId && !p.relays.includes(url)) {
        return { ...p, relays: [...p.relays, url] };
      }
      return p;
    });
    saveProfiles(profiles);
    this.setState({ profiles, newRelayUrl: "" });
    this.testRelay(url);
  };

  private removeRelay = (url: string) => {
    const profiles = this.state.profiles.map((p) => {
      if (p.id === this.state.activeProfileId) {
        return { ...p, relays: p.relays.filter((r) => r !== url) };
      }
      return p;
    });
    saveProfiles(profiles);
    const statuses = new Map(this.state.relayStatuses);
    statuses.delete(url);
    this.setState({ profiles, relayStatuses: statuses });
  };

  private createProfile = () => {
    const name = this.state.newProfileName.trim();
    if (!name) return;
    const id = "custom_" + Date.now().toString(36);
    const profile: RelayProfile = { id, name, relays: [], builtin: false };
    const profiles = [...this.state.profiles, profile];
    saveProfiles(profiles);
    saveActiveId(id);
    this.setState({ profiles, activeProfileId: id, newProfileName: "" });
  };

  private deleteProfile = (id: string) => {
    if (!confirm("Delete this profile?")) return;
    const profiles = this.state.profiles.filter((p) => p.id !== id);
    saveProfiles(profiles);
    const newActive = profiles[0]?.id || "outbox";
    saveActiveId(newActive);
    this.setState({ profiles, activeProfileId: newActive });
  };

  private startRename = (profile: RelayProfile) => {
    this.setState({ editingProfileId: profile.id, editingName: profile.name });
  };

  private saveRename = () => {
    const { editingProfileId, editingName } = this.state;
    if (!editingProfileId || !editingName.trim()) return;
    const profiles = this.state.profiles.map((p) =>
      p.id === editingProfileId ? { ...p, name: editingName.trim() } : p,
    );
    saveProfiles(profiles);
    this.setState({ profiles, editingProfileId: null, editingName: "" });
  };

  private copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    this.setState({ copiedUrl: url });
    setTimeout(() => this.setState({ copiedUrl: null }), 2000);
  };

  render() {
    const { profiles, activeProfileId, newRelayUrl, newProfileName, editingProfileId, editingName, copiedUrl, relayStatuses, healthData, healthLoading, nip65Status } = this.state;
    const active = this.getActiveProfile();
    const outboxCount = profiles.find((p) => p.id === "outbox")?.relays.length || 0;
    const inboxCount = profiles.find((p) => p.id === "inbox")?.relays.length || 0;

    return createElement("div", { className: "max-w-3xl mx-auto space-y-6 animate-in" },
      // Header
      createElement("div", { className: "flex items-start justify-between gap-4" },
        createElement("div", null,
          createElement("h1", { className: "text-2xl font-extrabold tracking-tight flex items-center gap-2.5" },
            createElement(Radio, { className: "size-6 text-primary" }),
            "Relay Manager",
          ),
          createElement("p", { className: "text-sm text-muted-foreground mt-1" },
            "Organize relays into profiles. Switch profiles to change which relays you connect to.",
          ),
        ),
        createElement(Link, { to: "/discover" },
          createElement(Button, { variant: "outline", size: "sm", className: "gap-1.5" },
            createElement(Search, { className: "size-3.5" }), "Discover",
          ),
        ),
      ),

      // NIP-65 status banner
      nip65Status === "loaded" && (outboxCount > 0 || inboxCount > 0)
        ? createElement("div", { className: "flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5" },
            createElement(Check, { className: "size-4 text-emerald-500 shrink-0" }),
            createElement("p", { className: "text-sm text-muted-foreground" },
              `NIP-65 relay list loaded: ${outboxCount} outbox, ${inboxCount} inbox`,
              healthLoading ? " · fetching health data..." : healthData.size > 0 ? ` · ${healthData.size} monitored` : "",
            ),
          )
        : nip65Status === "empty"
          ? createElement("div", { className: "flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5" },
              createElement(AlertCircle, { className: "size-4 text-amber-500 shrink-0" }),
              createElement("p", { className: "text-sm text-muted-foreground" },
                "No relay list found on the network. Add relays manually or discover relays.",
              ),
            )
          : null,

      // Profile tabs
      createElement("div", { className: "space-y-3" },
        createElement("div", { className: "flex items-center gap-1.5 flex-wrap" },
          ...profiles.map((profile) =>
            createElement("button", {
              key: profile.id,
              onClick: () => this.setActiveProfile(profile.id),
              className: cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg transition-all cursor-pointer",
                profile.id === activeProfileId
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent",
              ),
            },
              profile.name,
              profile.relays.length > 0
                ? createElement("span", {
                    className: cn("ml-1.5 text-xs", profile.id === activeProfileId ? "text-primary-foreground/70" : "text-muted-foreground/60"),
                  }, String(profile.relays.length))
                : null,
            ),
          ),
        ),

        // New profile
        createElement("div", { className: "flex gap-2" },
          createElement(Input, {
            value: newProfileName,
            onInput: (e: Event) => this.setState({ newProfileName: (e.target as HTMLInputElement).value }),
            onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter") this.createProfile(); },
            placeholder: "New profile name...",
            className: "max-w-[200px]",
          }),
          createElement(Button, {
            onClick: this.createProfile, disabled: !newProfileName.trim(),
            variant: "outline", size: "sm", className: "gap-1",
          }, createElement(Plus, { className: "size-3.5" }), "Add Profile"),
        ),
      ),

      // Active profile card
      active
        ? createElement(Card, { className: "border-border/50 overflow-hidden" },
            // Profile header
            createElement("div", { className: "px-5 py-4 flex items-center justify-between border-b border-border/30" },
              editingProfileId === active.id
                ? createElement("div", { className: "flex items-center gap-2" },
                    createElement(Input, {
                      value: editingName,
                      onInput: (e: Event) => this.setState({ editingName: (e.target as HTMLInputElement).value }),
                      onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter") this.saveRename(); },
                      className: "max-w-[200px]",
                      autoFocus: true,
                    }),
                    createElement(Button, { onClick: this.saveRename, size: "sm" }, "Save"),
                  )
                : createElement("div", { className: "flex items-center gap-3" },
                    createElement("h2", { className: "text-base font-semibold" }, active.name),
                    active.builtin ? createElement(Badge, { variant: "secondary", className: "text-[10px]" }, "Built-in") : null,
                    createElement(Badge, { variant: "outline", className: "text-[10px]" },
                      active.relays.length + " relay" + (active.relays.length !== 1 ? "s" : ""),
                    ),
                  ),
              createElement("div", { className: "flex items-center gap-1.5" },
                !active.builtin
                  ? createElement(Button, { variant: "ghost", size: "sm", onClick: () => this.startRename(active) }, "Rename")
                  : null,
                !active.builtin
                  ? createElement(Button, {
                      variant: "ghost", size: "sm", className: "text-destructive/70 hover:text-destructive",
                      onClick: () => this.deleteProfile(active.id),
                    }, "Delete")
                  : null,
                createElement(Button, {
                  variant: "outline", size: "sm", className: "gap-1",
                  onClick: this.testAllRelays,
                }, createElement(RefreshCw, { className: "size-3" }), "Test All"),
              ),
            ),

            // Add relay input
            createElement("div", { className: "px-5 py-3 border-b border-border/30 bg-muted/20" },
              createElement("div", { className: "flex gap-2" },
                createElement(Input, {
                  value: newRelayUrl,
                  onInput: (e: Event) => this.setState({ newRelayUrl: (e.target as HTMLInputElement).value }),
                  onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter") this.addRelay(); },
                  placeholder: "wss://relay.example.com",
                  className: "flex-1 font-mono text-sm",
                }),
                createElement(Button, {
                  onClick: this.addRelay, disabled: !newRelayUrl.trim(),
                  size: "sm", className: "gap-1",
                }, createElement(Plus, { className: "size-3.5" }), "Add"),
              ),
            ),

            // Relay list
            active.relays.length > 0
              ? createElement("div", { className: "divide-y divide-border/30" },
                  ...active.relays.map((url) => {
                    const status = relayStatuses.get(url);
                    const health = healthData.get(url);
                    // Prefer monitor online status over WebSocket ping
                    const isOnline = health ? health.online : status === "connected";
                    const dotColor = isOnline ? "bg-emerald-500"
                      : status === "connecting" ? "bg-amber-500 animate-pulse"
                      : status === "error" || (health && !health.online) ? "bg-destructive"
                      : "bg-muted-foreground/30";
                    const statusLabel = health
                      ? (health.online ? "online" : "offline") + (health.software ? ` · ${health.software}${health.version ? " " + health.version : ""}` : "")
                      : status || "idle";

                    return createElement("div", {
                      key: url,
                      className: "px-5 py-3 flex items-center justify-between gap-3 group",
                    },
                      createElement("div", { className: "flex items-center gap-3 min-w-0 flex-1" },
                        createElement("span", { className: cn("size-2 rounded-full shrink-0", dotColor) }),
                        createElement("div", { className: "min-w-0 flex-1" },
                          createElement("p", { className: "text-sm font-mono truncate" }, url),
                          createElement("p", { className: "text-[10px] text-muted-foreground" }, statusLabel),
                        ),
                      ),
                      // Health badges
                      health
                        ? createElement("div", { className: "flex items-center gap-1.5 shrink-0" },
                            health.uptime > 0
                              ? createElement(Badge, {
                                  variant: health.uptime >= 95 ? "secondary" : "outline",
                                  className: cn("text-[10px] px-1.5 py-0", health.uptime >= 95 ? "text-emerald-600 dark:text-emerald-400" : ""),
                                }, `${health.uptime.toFixed(0)}%`)
                              : null,
                            health.rttOpen !== null && health.rttOpen > 0
                              ? createElement(Badge, { variant: "outline", className: "text-[10px] px-1.5 py-0" },
                                  `${health.rttOpen}ms`,
                                )
                              : null,
                          )
                        : null,
                      createElement("div", { className: "flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" },
                        createElement(Button, {
                          variant: "ghost", size: "sm", className: "size-7 p-0",
                          onClick: () => this.copyUrl(url),
                        },
                          copiedUrl === url
                            ? createElement(Check, { className: "size-3.5 text-emerald-500" })
                            : createElement(Copy, { className: "size-3.5" }),
                        ),
                        createElement(Button, {
                          variant: "ghost", size: "sm",
                          className: "size-7 p-0 text-destructive/50 hover:text-destructive",
                          onClick: () => this.removeRelay(url),
                        }, createElement(Trash2, { className: "size-3.5" })),
                      ),
                    );
                  }),
                )
              : createElement("div", { className: "px-5 py-12 text-center" },
                  createElement("p", { className: "text-sm text-muted-foreground" }, "No relays in this profile yet."),
                  createElement("p", { className: "text-xs text-muted-foreground/60 mt-1" }, "Add a relay above or discover relays on the network."),
                ),
          )
        : null,

      // Help section
      createElement(Card, { className: "border-border/50 bg-muted/10" },
        createElement(CardContent, { className: "p-5" },
          createElement("h3", { className: "text-sm font-semibold mb-3" }, "How profiles work"),
          createElement("div", { className: "grid sm:grid-cols-2 gap-3 text-xs text-muted-foreground" },
            createElement("div", { className: "flex items-start gap-2" },
              createElement(Zap, { className: "size-4 text-primary shrink-0 mt-0.5" }),
              createElement("div", null,
                createElement("p", { className: "font-medium text-foreground" }, "Outbox"),
                createElement("p", null, "Relays you publish to. Your posts are sent here."),
              ),
            ),
            createElement("div", { className: "flex items-start gap-2" },
              createElement(Globe, { className: "size-4 text-primary shrink-0 mt-0.5" }),
              createElement("div", null,
                createElement("p", { className: "font-medium text-foreground" }, "Inbox"),
                createElement("p", null, "Relays you read from. Your feed pulls events from here."),
              ),
            ),
            createElement("div", { className: "flex items-start gap-2" },
              createElement(Search, { className: "size-4 text-primary shrink-0 mt-0.5" }),
              createElement("div", null,
                createElement("p", { className: "font-medium text-foreground" }, "Indexers"),
                createElement("p", null, "Relays that index profiles and events for discovery."),
              ),
            ),
            createElement("div", { className: "flex items-start gap-2" },
              createElement(Plus, { className: "size-4 text-primary shrink-0 mt-0.5" }),
              createElement("div", null,
                createElement("p", { className: "font-medium text-foreground" }, "Custom"),
                createElement("p", null, "Create unlimited profiles for communities or topics."),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
