import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { Link } from "inferno-router";
import { api } from "../lib/api";
import { authStore, type User } from "../stores/auth";
import { Card, CardContent } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { Badge } from "@/ui/Badge";
import { Input } from "@/ui/Input";
import { Label } from "@/ui/Label";
import { Textarea } from "@/ui/Textarea";
import { Separator } from "@/ui/Separator";
import { Switch } from "@/ui/Switch";
import { Tabs, TabsList, TabsTrigger } from "@/ui/Tabs";
import {
  Settings, Shield, Users, Zap, Plus, Trash2,
  Check, AlertCircle, Loader2, ArrowUpDown,
  KeyRound, Filter, Radio, ArrowLeft, X,
} from "@/lib/icons";
import { cn } from "@/ui/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ListEntryPubkey { id: string; pubkey: string; reason: string | null; }
interface ListEntryKeyword { id: string; keyword: string; reason: string | null; }
interface ListEntryKind { id: string; kind: number; reason: string | null; }
interface AclList {
  id: string;
  list_pubkeys: ListEntryPubkey[];
  list_keywords: ListEntryKeyword[];
  list_kinds: ListEntryKind[];
}
interface StreamData { id: string; url: string; direction: string; internal: boolean; sync: boolean; status: string; }
interface ModeratorData { id: string; user: { id: string; pubkey: string; name?: string | null }; }
interface RelayData {
  id: string; name: string; domain: string | null; status: string | null;
  details: string | null; default_message_policy: boolean; listed_in_directory: boolean;
  payment_required: boolean; payment_amount: number; payment_premium_amount: number;
  nip05_payment_amount: number; profile_image: string | null; banner_image: string | null;
  allow_giftwrap: boolean; allow_tagged: boolean; auth_required: boolean;
  allow_keyword_pubkey: boolean; relay_kind_description: string;
  request_payment: boolean; request_payment_amount: number;
  owner: { id: string; pubkey: string; name?: string | null };
  moderators: ModeratorData[]; streams: StreamData[];
  allow_list: AclList | null; block_list: AclList | null;
  acl_sources: { id: string; url: string; aclType: string }[];
}

type SettingsTab = "general" | "access" | "allowlist" | "blocklist" | "moderators" | "streams" | "payments" | "danger";

interface RelaySettingsProps { match?: { params?: { slug?: string } }; }

interface RelaySettingsState {
  user: User | null;
  relay: RelayData | null;
  loading: boolean;
  saving: boolean;
  error: string;
  success: string;
  tab: SettingsTab;
  // Editable fields
  details: string;
  listed_in_directory: boolean;
  default_message_policy: boolean;
  auth_required: boolean;
  allow_giftwrap: boolean;
  allow_tagged: boolean;
  allow_keyword_pubkey: boolean;
  relay_kind_description: string;
  profile_image: string;
  banner_image: string;
  payment_required: boolean;
  payment_amount: string;
  request_payment: boolean;
  request_payment_amount: string;
  // CRUD inputs
  newPubkey: string;
  newPubkeyReason: string;
  newKeyword: string;
  newKeywordReason: string;
  newKind: string;
  newKindReason: string;
  newModPubkey: string;
  newStreamUrl: string;
  newStreamDirection: string;
  // Busy states
  addingPubkey: boolean;
  addingKeyword: boolean;
  addingKind: boolean;
  addingMod: boolean;
  addingStream: boolean;
  deletingRelay: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default class RelaySettings extends Component<RelaySettingsProps, RelaySettingsState> {
  declare state: RelaySettingsState;
  private unsub: (() => void) | null = null;

  constructor(props: RelaySettingsProps) {
    super(props);
    this.state = {
      user: authStore.get().user, relay: null, loading: true, saving: false,
      error: "", success: "", tab: "general",
      details: "", listed_in_directory: true, default_message_policy: true,
      auth_required: false, allow_giftwrap: true, allow_tagged: false,
      allow_keyword_pubkey: false, relay_kind_description: "",
      profile_image: "", banner_image: "",
      payment_required: false, payment_amount: "21",
      request_payment: false, request_payment_amount: "1000",
      newPubkey: "", newPubkeyReason: "", newKeyword: "", newKeywordReason: "",
      newKind: "", newKindReason: "", newModPubkey: "",
      newStreamUrl: "", newStreamDirection: "up",
      addingPubkey: false, addingKeyword: false, addingKind: false,
      addingMod: false, addingStream: false, deletingRelay: false,
    };
  }

  componentDidMount() {
    this.unsub = authStore.subscribe((s) => this.setState({ user: s.user }));
    const slug = this.props.match?.params?.slug;
    if (slug) this.loadRelay(slug);
  }

  componentWillUnmount() { this.unsub?.(); }

  private async loadRelay(slug: string) {
    this.setState({ loading: true, error: "" });
    try {
      const data = await api.get<{ relay: RelayData }>(`/relays/by-name/${slug}`);
      const r = data?.relay;
      if (!r) { this.setState({ error: "Relay not found", loading: false }); return; }
      this.setState({
        relay: r, loading: false,
        details: r.details || "",
        listed_in_directory: r.listed_in_directory,
        default_message_policy: r.default_message_policy,
        auth_required: r.auth_required,
        allow_giftwrap: r.allow_giftwrap,
        allow_tagged: r.allow_tagged,
        allow_keyword_pubkey: r.allow_keyword_pubkey,
        relay_kind_description: r.relay_kind_description || "",
        profile_image: r.profile_image || "",
        banner_image: r.banner_image || "",
        payment_required: r.payment_required,
        payment_amount: String(r.payment_amount),
        request_payment: r.request_payment,
        request_payment_amount: String(r.request_payment_amount),
      });
    } catch (err: any) {
      this.setState({ error: err.message || "Failed to load relay", loading: false });
    }
  }

  private saveSettings = async () => {
    const { relay } = this.state;
    if (!relay) return;
    this.setState({ saving: true, error: "", success: "" });
    try {
      await api.patch(`/relays/${relay.id}/settings`, {
        details: this.state.details || null,
        listed_in_directory: this.state.listed_in_directory,
        default_message_policy: this.state.default_message_policy,
        auth_required: this.state.auth_required,
        allow_giftwrap: this.state.allow_giftwrap,
        allow_tagged: this.state.allow_tagged,
        allow_keyword_pubkey: this.state.allow_keyword_pubkey,
        relay_kind_description: this.state.relay_kind_description,
        profile_image: this.state.profile_image || null,
        banner_image: this.state.banner_image || null,
        payment_required: this.state.payment_required,
        payment_amount: parseInt(this.state.payment_amount) || 21,
        request_payment: this.state.request_payment,
        request_payment_amount: parseInt(this.state.request_payment_amount) || 1000,
      });
      this.setState({ saving: false, success: "Settings saved" });
      setTimeout(() => this.setState({ success: "" }), 3000);
    } catch (err: any) {
      this.setState({ saving: false, error: err.message || "Failed to save" });
    }
  };

  // ─── ACL CRUD ─────────────────────────────────────────────────────────────

  private addPubkey = async (list: "allowlist" | "blocklist") => {
    const { relay, newPubkey, newPubkeyReason } = this.state;
    if (!relay || !newPubkey.trim()) return;
    this.setState({ addingPubkey: true, error: "" });
    try {
      await api.post(`/relays/${relay.id}/${list}pubkey`, { pubkey: newPubkey.trim(), reason: newPubkeyReason || undefined });
      this.setState({ newPubkey: "", newPubkeyReason: "" });
      await this.loadRelay(relay.name);
    } catch (err: any) { this.setState({ error: err.message }); }
    this.setState({ addingPubkey: false });
  };

  private removePubkey = async (list: "allowlist" | "blocklist", entryId: string) => {
    const { relay } = this.state;
    if (!relay) return;
    try {
      await api.delete(`/relays/${relay.id}/${list}pubkey`, { id: entryId });
      await this.loadRelay(relay.name);
    } catch (err: any) { this.setState({ error: err.message }); }
  };

  private addKeyword = async (list: "allowlist" | "blocklist") => {
    const { relay, newKeyword, newKeywordReason } = this.state;
    if (!relay || !newKeyword.trim()) return;
    this.setState({ addingKeyword: true, error: "" });
    try {
      await api.post(`/relays/${relay.id}/${list}keyword`, { keyword: newKeyword.trim(), reason: newKeywordReason || undefined });
      this.setState({ newKeyword: "", newKeywordReason: "" });
      await this.loadRelay(relay.name);
    } catch (err: any) { this.setState({ error: err.message }); }
    this.setState({ addingKeyword: false });
  };

  private removeKeyword = async (list: "allowlist" | "blocklist", entryId: string) => {
    const { relay } = this.state;
    if (!relay) return;
    try {
      await api.delete(`/relays/${relay.id}/${list}keyword`, { id: entryId });
      await this.loadRelay(relay.name);
    } catch (err: any) { this.setState({ error: err.message }); }
  };

  private addKind = async (list: "allowlist" | "blocklist") => {
    const { relay, newKind, newKindReason } = this.state;
    if (!relay || !newKind.trim()) return;
    this.setState({ addingKind: true, error: "" });
    try {
      await api.post(`/relays/${relay.id}/${list}kind`, { kind: parseInt(newKind), reason: newKindReason || undefined });
      this.setState({ newKind: "", newKindReason: "" });
      await this.loadRelay(relay.name);
    } catch (err: any) { this.setState({ error: err.message }); }
    this.setState({ addingKind: false });
  };

  private removeKind = async (list: "allowlist" | "blocklist", entryId: string) => {
    const { relay } = this.state;
    if (!relay) return;
    try {
      await api.delete(`/relays/${relay.id}/${list}kind`, { id: entryId });
      await this.loadRelay(relay.name);
    } catch (err: any) { this.setState({ error: err.message }); }
  };

  // ─── Moderators ───────────────────────────────────────────────────────────

  private addModerator = async () => {
    const { relay, newModPubkey } = this.state;
    if (!relay || !newModPubkey.trim()) return;
    this.setState({ addingMod: true, error: "" });
    try {
      await api.post(`/relays/${relay.id}/moderators`, { pubkey: newModPubkey.trim() });
      this.setState({ newModPubkey: "" });
      await this.loadRelay(relay.name);
    } catch (err: any) { this.setState({ error: err.message }); }
    this.setState({ addingMod: false });
  };

  private removeModerator = async (modId: string) => {
    const { relay } = this.state;
    if (!relay) return;
    try {
      await api.delete(`/relays/${relay.id}/moderators/${modId}`);
      await this.loadRelay(relay.name);
    } catch (err: any) { this.setState({ error: err.message }); }
  };

  // ─── Streams ──────────────────────────────────────────────────────────────

  private addStream = async () => {
    const { relay, newStreamUrl, newStreamDirection } = this.state;
    if (!relay || !newStreamUrl.trim()) return;
    this.setState({ addingStream: true, error: "" });
    try {
      await api.post(`/relays/${relay.id}/streams`, { url: newStreamUrl.trim(), direction: newStreamDirection });
      this.setState({ newStreamUrl: "" });
      await this.loadRelay(relay.name);
    } catch (err: any) { this.setState({ error: err.message }); }
    this.setState({ addingStream: false });
  };

  private removeStream = async (streamId: string) => {
    const { relay } = this.state;
    if (!relay) return;
    try {
      await api.delete(`/relays/${relay.id}/streams/${streamId}`);
      await this.loadRelay(relay.name);
    } catch (err: any) { this.setState({ error: err.message }); }
  };

  // ─── Danger ───────────────────────────────────────────────────────────────

  private deleteRelay = async () => {
    const { relay } = this.state;
    if (!relay || !confirm(`Delete relay "${relay.name}"? This cannot be undone.`)) return;
    this.setState({ deletingRelay: true, error: "" });
    try {
      await api.delete(`/relays/${relay.id}`);
      window.location.href = "/admin";
    } catch (err: any) { this.setState({ error: err.message, deletingRelay: false }); }
  };

  // ─── Render helpers ───────────────────────────────────────────────────────

  private settingRow(label: string, description: string, control: any) {
    return createElement("div", { className: "flex items-center justify-between gap-4 py-3" },
      createElement("div", { className: "space-y-0.5" },
        createElement("p", { className: "text-sm font-medium" }, label),
        createElement("p", { className: "text-xs text-muted-foreground" }, description),
      ),
      control,
    );
  }

  private renderAclList(listType: "allowlist" | "blocklist", aclList: AclList | null) {
    const pubkeys = aclList?.list_pubkeys || [];
    const keywords = aclList?.list_keywords || [];
    const kinds = aclList?.list_kinds || [];
    const { newPubkey, newPubkeyReason, newKeyword, newKeywordReason, newKind, newKindReason, addingPubkey, addingKeyword, addingKind } = this.state;
    const isAllow = listType === "allowlist";
    const label = isAllow ? "Allow" : "Block";

    return createElement("div", { className: "space-y-6" },
      // Pubkeys
      createElement("div", null,
        createElement("h3", { className: "text-sm font-semibold mb-3 flex items-center gap-2" },
          createElement(KeyRound, { className: "size-4 text-primary" }),
          `${label}ed Pubkeys`,
          pubkeys.length > 0 ? createElement(Badge, { variant: "secondary", className: "text-[10px]" }, String(pubkeys.length)) : null,
        ),
        createElement("div", { className: "flex gap-2 mb-3" },
          createElement(Input, {
            placeholder: "Hex pubkey...", value: newPubkey, className: "flex-1 font-mono text-xs",
            onInput: (e: Event) => this.setState({ newPubkey: (e.target as HTMLInputElement).value }),
          }),
          createElement(Input, {
            placeholder: "Reason (optional)", value: newPubkeyReason, className: "w-40",
            onInput: (e: Event) => this.setState({ newPubkeyReason: (e.target as HTMLInputElement).value }),
          }),
          createElement(Button, {
            size: "sm", disabled: addingPubkey || !newPubkey.trim(), className: "gap-1 shrink-0",
            onClick: () => this.addPubkey(listType),
          }, addingPubkey ? createElement(Loader2, { className: "size-3 animate-spin" }) : createElement(Plus, { className: "size-3" }), "Add"),
        ),
        pubkeys.length > 0
          ? createElement("div", { className: "rounded-lg border border-border/50 divide-y divide-border/30" },
              ...pubkeys.map((entry) =>
                createElement("div", { key: entry.id, className: "flex items-center justify-between px-3 py-2 group" },
                  createElement("div", { className: "min-w-0" },
                    createElement("p", { className: "text-xs font-mono truncate" }, entry.pubkey),
                    entry.reason ? createElement("p", { className: "text-[10px] text-muted-foreground" }, entry.reason) : null,
                  ),
                  createElement(Button, {
                    variant: "ghost", size: "sm", className: "size-7 p-0 opacity-0 group-hover:opacity-100 text-destructive/50 hover:text-destructive shrink-0",
                    onClick: () => this.removePubkey(listType, entry.id),
                  }, createElement(Trash2, { className: "size-3" })),
                ),
              ),
            )
          : createElement("p", { className: "text-xs text-muted-foreground" }, `No ${listType === "allowlist" ? "allowed" : "blocked"} pubkeys.`),
      ),

      createElement(Separator, null),

      // Keywords
      createElement("div", null,
        createElement("h3", { className: "text-sm font-semibold mb-3 flex items-center gap-2" },
          createElement(Filter, { className: "size-4 text-primary" }),
          `${label}ed Keywords`,
          keywords.length > 0 ? createElement(Badge, { variant: "secondary", className: "text-[10px]" }, String(keywords.length)) : null,
        ),
        createElement("div", { className: "flex gap-2 mb-3" },
          createElement(Input, {
            placeholder: "Keyword...", value: newKeyword, className: "flex-1",
            onInput: (e: Event) => this.setState({ newKeyword: (e.target as HTMLInputElement).value }),
          }),
          createElement(Input, {
            placeholder: "Reason (optional)", value: newKeywordReason, className: "w-40",
            onInput: (e: Event) => this.setState({ newKeywordReason: (e.target as HTMLInputElement).value }),
          }),
          createElement(Button, {
            size: "sm", disabled: addingKeyword || !newKeyword.trim(), className: "gap-1 shrink-0",
            onClick: () => this.addKeyword(listType),
          }, addingKeyword ? createElement(Loader2, { className: "size-3 animate-spin" }) : createElement(Plus, { className: "size-3" }), "Add"),
        ),
        keywords.length > 0
          ? createElement("div", { className: "rounded-lg border border-border/50 divide-y divide-border/30" },
              ...keywords.map((entry) =>
                createElement("div", { key: entry.id, className: "flex items-center justify-between px-3 py-2 group" },
                  createElement("div", { className: "min-w-0" },
                    createElement("p", { className: "text-xs font-medium" }, entry.keyword),
                    entry.reason ? createElement("p", { className: "text-[10px] text-muted-foreground" }, entry.reason) : null,
                  ),
                  createElement(Button, {
                    variant: "ghost", size: "sm", className: "size-7 p-0 opacity-0 group-hover:opacity-100 text-destructive/50 hover:text-destructive shrink-0",
                    onClick: () => this.removeKeyword(listType, entry.id),
                  }, createElement(Trash2, { className: "size-3" })),
                ),
              ),
            )
          : createElement("p", { className: "text-xs text-muted-foreground" }, `No ${listType === "allowlist" ? "allowed" : "blocked"} keywords.`),
      ),

      createElement(Separator, null),

      // Kinds
      createElement("div", null,
        createElement("h3", { className: "text-sm font-semibold mb-3 flex items-center gap-2" },
          createElement(Radio, { className: "size-4 text-primary" }),
          `${label}ed Event Kinds`,
          kinds.length > 0 ? createElement(Badge, { variant: "secondary", className: "text-[10px]" }, String(kinds.length)) : null,
        ),
        createElement("div", { className: "flex gap-2 mb-3" },
          createElement(Input, {
            placeholder: "Kind number (e.g. 1)", value: newKind, type: "number", className: "w-32",
            onInput: (e: Event) => this.setState({ newKind: (e.target as HTMLInputElement).value }),
          }),
          createElement(Input, {
            placeholder: "Reason (optional)", value: newKindReason, className: "flex-1",
            onInput: (e: Event) => this.setState({ newKindReason: (e.target as HTMLInputElement).value }),
          }),
          createElement(Button, {
            size: "sm", disabled: addingKind || !newKind.trim(), className: "gap-1 shrink-0",
            onClick: () => this.addKind(listType),
          }, addingKind ? createElement(Loader2, { className: "size-3 animate-spin" }) : createElement(Plus, { className: "size-3" }), "Add"),
        ),
        kinds.length > 0
          ? createElement("div", { className: "flex flex-wrap gap-1.5" },
              ...kinds.map((entry) =>
                createElement("div", { key: entry.id, className: "inline-flex items-center gap-1 rounded-md border border-border/50 px-2 py-1 text-xs group" },
                  createElement("span", { className: "font-mono font-medium" }, `Kind ${entry.kind}`),
                  entry.reason ? createElement("span", { className: "text-muted-foreground" }, `(${entry.reason})`) : null,
                  createElement("button", {
                    onClick: () => this.removeKind(listType, entry.id),
                    className: "ml-1 opacity-0 group-hover:opacity-100 text-destructive/50 hover:text-destructive cursor-pointer",
                  }, createElement(X, { className: "size-3" })),
                ),
              ),
            )
          : createElement("p", { className: "text-xs text-muted-foreground" }, `No ${listType === "allowlist" ? "allowed" : "blocked"} event kinds.`),
      ),
    );
  }

  // ─── Tab content renderers ────────────────────────────────────────────────

  private renderGeneral() {
    const { relay } = this.state;
    if (!relay) return null;
    return createElement("div", { className: "space-y-6" },
      // NIP-11 Description
      createElement("div", { className: "space-y-2" },
        createElement(Label, null, "Description"),
        createElement(Textarea, {
          placeholder: "Describe your relay...",
          value: this.state.details,
          rows: 4,
          onInput: (e: Event) => this.setState({ details: (e.target as HTMLTextAreaElement).value }),
        }),
        createElement("p", { className: "text-[10px] text-muted-foreground" }, "Appears in NIP-11 relay information document."),
      ),

      createElement(Separator, null),

      // Relay Kind Description
      createElement("div", { className: "space-y-2" },
        createElement(Label, null, "Relay Kind"),
        createElement(Input, {
          placeholder: "e.g. community, personal, paid...",
          value: this.state.relay_kind_description,
          onInput: (e: Event) => this.setState({ relay_kind_description: (e.target as HTMLInputElement).value }),
        }),
        createElement("p", { className: "text-[10px] text-muted-foreground" }, "Categorize your relay for directory listings."),
      ),

      createElement(Separator, null),

      // Images
      createElement("div", { className: "grid gap-4 sm:grid-cols-2" },
        createElement("div", { className: "space-y-2" },
          createElement(Label, null, "Profile Image URL"),
          createElement(Input, {
            placeholder: "https://...", value: this.state.profile_image,
            onInput: (e: Event) => this.setState({ profile_image: (e.target as HTMLInputElement).value }),
          }),
          this.state.profile_image
            ? createElement("img", { src: this.state.profile_image, className: "w-16 h-16 rounded-full object-cover border border-border/50" })
            : null,
        ),
        createElement("div", { className: "space-y-2" },
          createElement(Label, null, "Banner Image URL"),
          createElement(Input, {
            placeholder: "https://...", value: this.state.banner_image,
            onInput: (e: Event) => this.setState({ banner_image: (e.target as HTMLInputElement).value }),
          }),
          this.state.banner_image
            ? createElement("img", { src: this.state.banner_image, className: "w-full h-20 rounded-lg object-cover border border-border/50" })
            : null,
        ),
      ),

      createElement(Separator, null),

      // Directory listing
      this.settingRow("Listed in Directory", "Show this relay in the public directory.",
        createElement(Switch, { checked: this.state.listed_in_directory, onChange: (v: boolean) => this.setState({ listed_in_directory: v }) }),
      ),
    );
  }

  private renderAccess() {
    return createElement("div", { className: "space-y-1" },
      this.settingRow("Default Write Policy",
        "Allow all pubkeys to write by default. Disable to restrict writes to the allowlist only.",
        createElement(Switch, { checked: this.state.default_message_policy, onChange: (v: boolean) => this.setState({ default_message_policy: v }) }),
      ),
      createElement(Separator, null),
      this.settingRow("NIP-42 Auth Required",
        "Require clients to authenticate with NIP-42 before reading or writing.",
        createElement(Switch, { checked: this.state.auth_required, onChange: (v: boolean) => this.setState({ auth_required: v }) }),
      ),
      createElement(Separator, null),
      this.settingRow("Allow Giftwrap (NIP-59)",
        "Accept NIP-59 gift-wrapped events for DM compatibility.",
        createElement(Switch, { checked: this.state.allow_giftwrap, onChange: (v: boolean) => this.setState({ allow_giftwrap: v }) }),
      ),
      createElement(Separator, null),
      this.settingRow("Allow Tagged Events",
        "Accept events where the sender is tagged by an allowed pubkey.",
        createElement(Switch, { checked: this.state.allow_tagged, onChange: (v: boolean) => this.setState({ allow_tagged: v }) }),
      ),
      createElement(Separator, null),
      this.settingRow("Keyword → Pubkey Allow",
        "If a keyword matches, also allow the event's pubkey for future events.",
        createElement(Switch, { checked: this.state.allow_keyword_pubkey, onChange: (v: boolean) => this.setState({ allow_keyword_pubkey: v }) }),
      ),
    );
  }

  private renderModerators() {
    const { relay, newModPubkey, addingMod } = this.state;
    if (!relay) return null;
    const mods = relay.moderators || [];

    return createElement("div", { className: "space-y-4" },
      createElement("p", { className: "text-sm text-muted-foreground" },
        "Moderators can manage allowlists and blocklists. Only the owner can add or remove moderators.",
      ),
      createElement("div", { className: "flex gap-2" },
        createElement(Input, {
          placeholder: "Moderator hex pubkey...", value: newModPubkey, className: "flex-1 font-mono text-xs",
          onInput: (e: Event) => this.setState({ newModPubkey: (e.target as HTMLInputElement).value }),
        }),
        createElement(Button, {
          size: "sm", disabled: addingMod || !newModPubkey.trim(), className: "gap-1",
          onClick: this.addModerator,
        }, addingMod ? createElement(Loader2, { className: "size-3 animate-spin" }) : createElement(Plus, { className: "size-3" }), "Add Moderator"),
      ),
      mods.length > 0
        ? createElement("div", { className: "rounded-lg border border-border/50 divide-y divide-border/30" },
            ...mods.map((mod) =>
              createElement("div", { key: mod.id, className: "flex items-center justify-between px-4 py-3 group" },
                createElement("div", { className: "min-w-0" },
                  createElement("p", { className: "text-sm font-medium" }, mod.user.name || "Unknown"),
                  createElement("p", { className: "text-xs font-mono text-muted-foreground truncate" }, mod.user.pubkey),
                ),
                createElement(Button, {
                  variant: "ghost", size: "sm", className: "text-destructive/50 hover:text-destructive opacity-0 group-hover:opacity-100",
                  onClick: () => this.removeModerator(mod.id),
                }, createElement(Trash2, { className: "size-3.5" })),
              ),
            ),
          )
        : createElement("p", { className: "text-xs text-muted-foreground py-4" }, "No moderators added yet."),
    );
  }

  private renderStreams() {
    const { relay, newStreamUrl, newStreamDirection, addingStream } = this.state;
    if (!relay) return null;
    const streams = relay.streams || [];

    return createElement("div", { className: "space-y-4" },
      createElement("p", { className: "text-sm text-muted-foreground" },
        "Sync events with other relays. Upstream sends events to the target, downstream pulls events from it, and bidirectional does both.",
      ),
      createElement("div", { className: "flex gap-2" },
        createElement(Input, {
          placeholder: "wss://relay.example.com", value: newStreamUrl, className: "flex-1 font-mono text-xs",
          onInput: (e: Event) => this.setState({ newStreamUrl: (e.target as HTMLInputElement).value }),
        }),
        createElement("div", { className: "flex gap-1 shrink-0" },
          ...(["up", "down", "both"] as const).map((dir) =>
            createElement(Button, {
              key: dir, size: "sm",
              variant: newStreamDirection === dir ? "default" : "outline",
              className: "text-xs capitalize",
              onClick: () => this.setState({ newStreamDirection: dir }),
            }, dir === "both" ? "Both" : dir === "up" ? "Up" : "Down"),
          ),
        ),
        createElement(Button, {
          size: "sm", disabled: addingStream || !newStreamUrl.trim(), className: "gap-1",
          onClick: this.addStream,
        }, addingStream ? createElement(Loader2, { className: "size-3 animate-spin" }) : createElement(Plus, { className: "size-3" }), "Add"),
      ),
      streams.length > 0
        ? createElement("div", { className: "rounded-lg border border-border/50 divide-y divide-border/30" },
            ...streams.map((s) =>
              createElement("div", { key: s.id, className: "flex items-center justify-between px-4 py-3 group" },
                createElement("div", { className: "flex items-center gap-3 min-w-0" },
                  createElement(ArrowUpDown, { className: "size-4 text-muted-foreground shrink-0" }),
                  createElement("div", { className: "min-w-0" },
                    createElement("p", { className: "text-xs font-mono truncate" }, s.url),
                    createElement("div", { className: "flex items-center gap-2 mt-0.5" },
                      createElement(Badge, { variant: "secondary", className: "text-[10px] capitalize" }, s.direction),
                      createElement(Badge, {
                        variant: s.status === "running" ? "default" : "secondary",
                        className: cn("text-[10px]", s.status === "running" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"),
                      }, s.status),
                    ),
                  ),
                ),
                createElement(Button, {
                  variant: "ghost", size: "sm", className: "text-destructive/50 hover:text-destructive opacity-0 group-hover:opacity-100",
                  onClick: () => this.removeStream(s.id),
                }, createElement(Trash2, { className: "size-3.5" })),
              ),
            ),
          )
        : createElement("p", { className: "text-xs text-muted-foreground py-4" }, "No streams configured."),
    );
  }

  private renderPayments() {
    return createElement("div", { className: "space-y-1" },
      this.settingRow("Payment Required",
        "Require a Lightning payment before users can write to this relay.",
        createElement(Switch, { checked: this.state.payment_required, onChange: (v: boolean) => this.setState({ payment_required: v }) }),
      ),
      this.state.payment_required ? createElement("div", { className: "pl-0 py-2 space-y-3" },
        createElement("div", { className: "space-y-1" },
          createElement(Label, { className: "text-xs" }, "Payment Amount (sats)"),
          createElement(Input, {
            type: "number", value: this.state.payment_amount, className: "w-40",
            onInput: (e: Event) => this.setState({ payment_amount: (e.target as HTMLInputElement).value }),
          }),
        ),
      ) : null,
      createElement(Separator, null),
      this.settingRow("Request Payment on Connect",
        "Send a payment request to connecting clients (NIP-42 style).",
        createElement(Switch, { checked: this.state.request_payment, onChange: (v: boolean) => this.setState({ request_payment: v }) }),
      ),
      this.state.request_payment ? createElement("div", { className: "pl-0 py-2 space-y-3" },
        createElement("div", { className: "space-y-1" },
          createElement(Label, { className: "text-xs" }, "Request Amount (msats)"),
          createElement(Input, {
            type: "number", value: this.state.request_payment_amount, className: "w-40",
            onInput: (e: Event) => this.setState({ request_payment_amount: (e.target as HTMLInputElement).value }),
          }),
        ),
      ) : null,
    );
  }

  private renderDanger() {
    const { relay, deletingRelay } = this.state;
    if (!relay) return null;

    return createElement("div", { className: "space-y-4" },
      createElement("div", { className: "rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3" },
        createElement("h3", { className: "text-sm font-semibold text-destructive flex items-center gap-2" },
          createElement(AlertCircle, { className: "size-4" }), "Delete Relay",
        ),
        createElement("p", { className: "text-xs text-muted-foreground" },
          `This will permanently delete ${relay.name}.${relay.domain || "mycelium.social"} and all associated data. This action cannot be undone.`,
        ),
        createElement(Button, {
          variant: "destructive", size: "sm", className: "gap-1.5",
          disabled: deletingRelay,
          onClick: this.deleteRelay,
        },
          deletingRelay ? createElement(Loader2, { className: "size-3.5 animate-spin" }) : createElement(Trash2, { className: "size-3.5" }),
          "Delete Relay",
        ),
      ),
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  render() {
    const { relay, loading, error, success, saving, tab } = this.state;

    if (loading) {
      return createElement("div", { className: "flex justify-center py-16" },
        createElement(Loader2, { className: "size-8 animate-spin text-muted-foreground" }),
      );
    }

    if (!relay) {
      return createElement("div", { className: "text-center py-16" },
        createElement("p", { className: "text-destructive" }, error || "Relay not found"),
        createElement(Link, { to: "/admin", className: "text-sm text-primary hover:underline mt-2 inline-block" }, "Back to dashboard"),
      );
    }

    const domain = relay.domain || "mycelium.social";

    const tabs: { id: SettingsTab; label: string; icon: any }[] = [
      { id: "general", label: "General", icon: Settings },
      { id: "access", label: "Access", icon: Shield },
      { id: "allowlist", label: "Allowlist", icon: Check },
      { id: "blocklist", label: "Blocklist", icon: X },
      { id: "moderators", label: "Moderators", icon: Users },
      { id: "streams", label: "Streams", icon: ArrowUpDown },
      { id: "payments", label: "Payments", icon: Zap },
      { id: "danger", label: "Danger", icon: AlertCircle },
    ];

    return createElement("div", { className: "max-w-3xl mx-auto space-y-6 animate-in" },
      // Header
      createElement("div", { className: "flex items-start justify-between gap-4" },
        createElement("div", null,
          createElement(Link, { to: `/relays/${relay.name}`, className: "text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2 cursor-pointer" },
            createElement(ArrowLeft, { className: "size-3" }), "Back to relay",
          ),
          createElement("h1", { className: "text-2xl font-extrabold tracking-tight flex items-center gap-2.5" },
            createElement(Settings, { className: "size-6 text-primary" }),
            `${relay.name}.${domain}`,
          ),
          createElement("p", { className: "text-sm text-muted-foreground mt-0.5" }, "Manage your relay configuration"),
        ),
        createElement("div", { className: "flex items-center gap-2 shrink-0" },
          createElement(Badge, { variant: relay.status === "running" ? "default" : "secondary" }, relay.status || "unknown"),
        ),
      ),

      // Status messages
      error ? createElement("div", { className: "flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive" },
        createElement(AlertCircle, { className: "size-4 shrink-0" }), error,
      ) : null,
      success ? createElement("div", { className: "flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400" },
        createElement(Check, { className: "size-4 shrink-0" }), success,
      ) : null,

      // Tab navigation
      createElement(Tabs, { value: tab },
        createElement(TabsList, { className: "w-full flex-wrap h-auto gap-1 p-1" },
          ...tabs.map((t) =>
            createElement(TabsTrigger, {
              key: t.id, value: t.id, active: tab === t.id,
              onClick: () => this.setState({ tab: t.id }),
              className: "gap-1.5",
            },
              createElement(t.icon, { className: "size-3.5" }),
              t.label,
            ),
          ),
        ),
      ),

      // Tab content
      createElement(Card, { className: "border-border/50" },
        createElement(CardContent, { className: "p-6" },
          tab === "general" ? this.renderGeneral() : null,
          tab === "access" ? this.renderAccess() : null,
          tab === "allowlist" ? this.renderAclList("allowlist", relay.allow_list) : null,
          tab === "blocklist" ? this.renderAclList("blocklist", relay.block_list) : null,
          tab === "moderators" ? this.renderModerators() : null,
          tab === "streams" ? this.renderStreams() : null,
          tab === "payments" ? this.renderPayments() : null,
          tab === "danger" ? this.renderDanger() : null,
        ),
      ),

      // Save button (not shown for ACL tabs which save immediately, or danger)
      (tab === "general" || tab === "access" || tab === "payments")
        ? createElement("div", { className: "flex justify-end" },
            createElement(Button, {
              onClick: this.saveSettings, disabled: saving, className: "gap-2 min-w-[140px]",
            },
              saving ? createElement(Loader2, { className: "size-4 animate-spin" }) : createElement(Check, { className: "size-4" }),
              saving ? "Saving..." : "Save Settings",
            ),
          )
        : null,
    );
  }
}
