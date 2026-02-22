import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { Link } from "inferno-router";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { Textarea } from "@/ui/Textarea";
import { Label } from "@/ui/Label";
import { Switch } from "@/ui/Switch";
import { Separator } from "@/ui/Separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/Tabs";
import {
  Loader2, Globe, Settings, Lock, Unlock, Shield, Trash2, Plus, X, Users, Radio, AlertTriangle, ChevronLeft,
} from "@/lib/icons";

// ── Types ──

interface ListEntryPubkey {
  id: string;
  pubkey: string;
  reason: string | null;
}

interface ListEntryKeyword {
  id: string;
  keyword: string;
  reason: string | null;
}

interface ListEntryKind {
  id: string;
  kind: number;
  reason: string | null;
}

interface AclList {
  id: string;
  list_pubkeys: ListEntryPubkey[];
  list_keywords: ListEntryKeyword[];
  list_kinds: ListEntryKind[];
}

interface StreamData {
  id: string;
  url: string;
  direction: string;
  internal: boolean;
  sync: boolean;
  status: string;
}

interface ModeratorData {
  id: string;
  user: { id: string; pubkey: string };
}

interface RelayFull {
  id: string;
  name: string;
  domain: string;
  status: string | null;
  details: string | null;
  profile_image: string | null;
  banner_image: string | null;
  listed_in_directory: boolean;
  default_message_policy: boolean;
  auth_required: boolean;
  allow_tagged: boolean;
  allow_giftwrap: boolean;
  allow_keyword_pubkey: boolean;
  payment_required: boolean;
  payment_amount: number;
  payment_premium_amount: number;
  nip05_payment_amount: number;
  request_payment: boolean;
  request_payment_amount: number;
  relay_kind_description: string;
  is_external: boolean;
  owner: { id: string; pubkey: string } | null;
  moderators: ModeratorData[];
  streams: StreamData[];
  allow_list: AclList | null;
  block_list: AclList | null;
  acl_sources: { id: string; url: string; aclType: string }[];
}

interface RelaySettingsProps {
  match?: { params?: { slug?: string } };
}

interface RelaySettingsState {
  relay: RelayFull | null;
  loading: boolean;
  error: string;
  saving: boolean;
  activeTab: string;
  // General
  details: string;
  profileImage: string;
  bannerImage: string;
  listedInDirectory: boolean;
  authRequired: boolean;
  defaultMessagePolicy: boolean;
  allowTagged: boolean;
  allowGiftwrap: boolean;
  // ACL inputs
  newAllowPubkey: string;
  newBlockPubkey: string;
  newAllowKeyword: string;
  newBlockKeyword: string;
  newAllowKind: string;
  newBlockKind: string;
  // Moderator input
  newModPubkey: string;
  // Stream inputs
  newStreamUrl: string;
  newStreamDirection: string;
  // Feedback
  toast: string;
}

export default class RelaySettings extends Component<RelaySettingsProps, RelaySettingsState> {
  declare state: RelaySettingsState;

  constructor(props: RelaySettingsProps) {
    super(props);
    this.state = {
      relay: null, loading: true, error: "", saving: false,
      activeTab: "general",
      details: "", profileImage: "", bannerImage: "",
      listedInDirectory: false, authRequired: false,
      defaultMessagePolicy: false, allowTagged: false, allowGiftwrap: true,
      newAllowPubkey: "", newBlockPubkey: "",
      newAllowKeyword: "", newBlockKeyword: "",
      newAllowKind: "", newBlockKind: "",
      newModPubkey: "",
      newStreamUrl: "", newStreamDirection: "both",
      toast: "",
    };
  }

  componentDidMount() {
    const slug = this.props.match?.params?.slug;
    if (slug) this.loadRelay(slug);
  }

  private async loadRelay(slug: string) {
    try {
      const data = await api.get<{ relay: RelayFull }>(`/relays/by-name/${slug}`);
      const r = data.relay;
      this.setState({
        relay: r, loading: false,
        details: r.details || "",
        profileImage: r.profile_image || "",
        bannerImage: r.banner_image || "",
        listedInDirectory: r.listed_in_directory,
        authRequired: r.auth_required,
        defaultMessagePolicy: r.default_message_policy,
        allowTagged: r.allow_tagged,
        allowGiftwrap: r.allow_giftwrap,
      });
    } catch (err: any) {
      this.setState({ error: err.message || "Failed to load relay", loading: false });
    }
  }

  private showToast(msg: string) {
    this.setState({ toast: msg });
    setTimeout(() => this.setState({ toast: "" }), 3000);
  }

  private async patchSettings(body: Record<string, any>) {
    const { relay } = this.state;
    if (!relay) return;
    this.setState({ saving: true });
    try {
      await api.patch(`/relays/${relay.id}/settings`, body);
      this.showToast("Settings saved");
    } catch (err: any) {
      this.showToast("Error: " + (err.message || "save failed"));
    } finally {
      this.setState({ saving: false });
    }
  }

  private relayUrl(): string {
    const r = this.state.relay;
    if (!r) return "";
    return r.is_external ? `wss://${r.domain}` : `wss://${r.name}.${r.domain}`;
  }

  // ── General Tab ──

  private renderGeneral() {
    const { details, profileImage, bannerImage, listedInDirectory, authRequired, defaultMessagePolicy, allowTagged, allowGiftwrap, saving } = this.state;

    return createElement("div", { className: "space-y-6" },
      // Profile
      createElement(Card, null,
        createElement(CardHeader, null,
          createElement(CardTitle, null, "Profile"),
          createElement(CardDescription, null, "Public information about your relay."),
        ),
        createElement(CardContent, { className: "space-y-4" },
          createElement("div", { className: "space-y-2" },
            createElement(Label, null, "Description"),
            createElement(Textarea, {
              value: details, rows: 4,
              onInput: (e: Event) => this.setState({ details: (e.target as HTMLTextAreaElement).value }),
            }),
          ),
          createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" },
            createElement("div", { className: "space-y-2" },
              createElement(Label, null, "Profile Image URL"),
              createElement(Input, {
                value: profileImage, placeholder: "https://...",
                onInput: (e: Event) => this.setState({ profileImage: (e.target as HTMLInputElement).value }),
              }),
            ),
            createElement("div", { className: "space-y-2" },
              createElement(Label, null, "Banner Image URL"),
              createElement(Input, {
                value: bannerImage, placeholder: "https://...",
                onInput: (e: Event) => this.setState({ bannerImage: (e.target as HTMLInputElement).value }),
              }),
            ),
          ),
          createElement("div", { className: "flex items-center justify-between" },
            createElement(Label, null, "Listed in Directory"),
            createElement(Switch, { checked: listedInDirectory, onChange: (v: boolean) => this.setState({ listedInDirectory: v }) }),
          ),
          createElement(Button, {
            disabled: saving,
            onClick: () => this.patchSettings({
              details, profile_image: profileImage, banner_image: bannerImage, listed_in_directory: listedInDirectory,
            }),
          }, saving ? "Saving..." : "Save Profile"),
        ),
      ),

      // Access Mode
      createElement(Card, null,
        createElement(CardHeader, null,
          createElement(CardTitle, null, "Access Control"),
          createElement(CardDescription, null, "Control who can write to your relay."),
        ),
        createElement(CardContent, { className: "space-y-4" },
          createElement("div", { className: "flex items-center justify-between" },
            createElement("div", null,
              createElement(Label, null, "NIP-42 Authentication Required"),
              createElement("p", { className: "text-xs text-muted-foreground mt-1" }, "Require clients to authenticate before writing."),
            ),
            createElement(Switch, { checked: authRequired, onChange: (v: boolean) => { this.setState({ authRequired: v }); this.patchSettings({ auth_required: v }); } }),
          ),
          createElement(Separator, null),
          createElement("div", { className: "flex items-center justify-between" },
            createElement("div", null,
              createElement(Label, null, "Default Message Policy"),
              createElement("p", { className: "text-xs text-muted-foreground mt-1" }, "Allow: accept all events by default. Deny: only accept from allow list."),
            ),
            createElement("div", { className: "flex items-center gap-2" },
              createElement("span", { className: "text-xs text-muted-foreground" }, defaultMessagePolicy ? "Allow" : "Deny"),
              createElement(Switch, { checked: defaultMessagePolicy, onChange: (v: boolean) => { this.setState({ defaultMessagePolicy: v }); this.patchSettings({ default_message_policy: v }); } }),
            ),
          ),
          createElement(Separator, null),
          createElement("div", { className: "flex items-center justify-between" },
            createElement("div", null,
              createElement(Label, null, "Allow Tagged Events"),
              createElement("p", { className: "text-xs text-muted-foreground mt-1" }, "Accept events that tag allowed pubkeys."),
            ),
            createElement(Switch, { checked: allowTagged, onChange: (v: boolean) => { this.setState({ allowTagged: v }); this.patchSettings({ allow_tagged: v }); } }),
          ),
          createElement(Separator, null),
          createElement("div", { className: "flex items-center justify-between" },
            createElement("div", null,
              createElement(Label, null, "Allow Gift Wrap (NIP-17)"),
              createElement("p", { className: "text-xs text-muted-foreground mt-1" }, "Accept encrypted direct messages."),
            ),
            createElement(Switch, { checked: allowGiftwrap, onChange: (v: boolean) => { this.setState({ allowGiftwrap: v }); this.patchSettings({ allow_giftwrap: v }); } }),
          ),
        ),
      ),
    );
  }

  // ── ACL Tab ──

  private async addAclEntry(type: "allowlistpubkey" | "blocklistpubkey" | "allowlistkeyword" | "blocklistkeyword" | "allowlistkind" | "blocklistkind", body: Record<string, any>) {
    const { relay } = this.state;
    if (!relay) return;
    try {
      await api.post(`/relays/${relay.id}/${type}`, body);
      this.showToast("Entry added");
      await this.loadRelay(relay.name);
    } catch (err: any) {
      this.showToast("Error: " + (err.message || "add failed"));
    }
  }

  private async removeAclEntry(type: string, entryId: string) {
    const { relay } = this.state;
    if (!relay) return;
    try {
      await api.delete(`/relays/${relay.id}/${type}`, { id: entryId });
      this.showToast("Entry removed");
      await this.loadRelay(relay.name);
    } catch (err: any) {
      this.showToast("Error: " + (err.message || "remove failed"));
    }
  }

  private renderPubkeyList(title: string, entries: ListEntryPubkey[], removeType: string, addType: string, inputKey: "newAllowPubkey" | "newBlockPubkey") {
    const inputVal = this.state[inputKey] as string;
    return createElement("div", { className: "space-y-3" },
      createElement(Label, null, title),
      entries.length > 0
        ? createElement("div", { className: "space-y-1" },
            ...entries.map((e) =>
              createElement("div", { key: e.id, className: "flex items-center justify-between bg-muted/50 rounded-md px-3 py-1.5 group" },
                createElement("span", { className: "text-xs font-mono truncate" }, e.pubkey.slice(0, 16) + "..." + e.pubkey.slice(-8)),
                createElement(Button, { variant: "ghost", size: "xs", className: "opacity-0 group-hover:opacity-100 text-destructive", onClick: () => this.removeAclEntry(removeType, e.id) },
                  createElement(X, { className: "size-3" }),
                ),
              ),
            ),
          )
        : createElement("p", { className: "text-xs text-muted-foreground italic" }, "No entries"),
      createElement("div", { className: "flex gap-2" },
        createElement(Input, {
          className: "flex-1", placeholder: "hex pubkey",
          value: inputVal,
          onInput: (e: Event) => this.setState({ [inputKey]: (e.target as HTMLInputElement).value } as any),
          onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter" && inputVal.trim()) { this.addAclEntry(addType as any, { pubkey: inputVal.trim() }); this.setState({ [inputKey]: "" } as any); } },
        }),
        createElement(Button, { size: "sm", disabled: !inputVal.trim(), onClick: () => { this.addAclEntry(addType as any, { pubkey: inputVal.trim() }); this.setState({ [inputKey]: "" } as any); } },
          createElement(Plus, { className: "size-3" }),
        ),
      ),
    );
  }

  private renderKeywordList(title: string, entries: ListEntryKeyword[], removeType: string, addType: string, inputKey: "newAllowKeyword" | "newBlockKeyword") {
    const inputVal = this.state[inputKey] as string;
    return createElement("div", { className: "space-y-3" },
      createElement(Label, null, title),
      entries.length > 0
        ? createElement("div", { className: "flex flex-wrap gap-1.5" },
            ...entries.map((e) =>
              createElement("span", { key: e.id, className: "inline-flex items-center gap-1 bg-muted/50 rounded-full px-2.5 py-0.5 text-xs" },
                e.keyword,
                createElement("button", { className: "text-muted-foreground hover:text-destructive cursor-pointer", onClick: () => this.removeAclEntry(removeType, e.id) }, "×"),
              ),
            ),
          )
        : createElement("p", { className: "text-xs text-muted-foreground italic" }, "No entries"),
      createElement("div", { className: "flex gap-2" },
        createElement(Input, {
          className: "flex-1", placeholder: "keyword",
          value: inputVal,
          onInput: (e: Event) => this.setState({ [inputKey]: (e.target as HTMLInputElement).value } as any),
          onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter" && inputVal.trim()) { this.addAclEntry(addType as any, { keyword: inputVal.trim() }); this.setState({ [inputKey]: "" } as any); } },
        }),
        createElement(Button, { size: "sm", disabled: !inputVal.trim(), onClick: () => { this.addAclEntry(addType as any, { keyword: inputVal.trim() }); this.setState({ [inputKey]: "" } as any); } },
          createElement(Plus, { className: "size-3" }),
        ),
      ),
    );
  }

  private renderKindList(title: string, entries: ListEntryKind[], removeType: string, addType: string, inputKey: "newAllowKind" | "newBlockKind") {
    const inputVal = this.state[inputKey] as string;
    return createElement("div", { className: "space-y-3" },
      createElement(Label, null, title),
      entries.length > 0
        ? createElement("div", { className: "flex flex-wrap gap-1.5" },
            ...entries.map((e) =>
              createElement("span", { key: e.id, className: "inline-flex items-center gap-1 bg-muted/50 rounded-full px-2.5 py-0.5 text-xs font-mono" },
                String(e.kind),
                createElement("button", { className: "text-muted-foreground hover:text-destructive cursor-pointer", onClick: () => this.removeAclEntry(removeType, e.id) }, "×"),
              ),
            ),
          )
        : createElement("p", { className: "text-xs text-muted-foreground italic" }, "No entries"),
      createElement("div", { className: "flex gap-2" },
        createElement(Input, {
          className: "flex-1", type: "number", placeholder: "kind number",
          value: inputVal,
          onInput: (e: Event) => this.setState({ [inputKey]: (e.target as HTMLInputElement).value } as any),
          onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter" && inputVal.trim()) { this.addAclEntry(addType as any, { kind: inputVal.trim() }); this.setState({ [inputKey]: "" } as any); } },
        }),
        createElement(Button, { size: "sm", disabled: !inputVal.trim(), onClick: () => { this.addAclEntry(addType as any, { kind: inputVal.trim() }); this.setState({ [inputKey]: "" } as any); } },
          createElement(Plus, { className: "size-3" }),
        ),
      ),
    );
  }

  private renderAcl() {
    const { relay } = this.state;
    if (!relay) return null;
    const allow = relay.allow_list;
    const block = relay.block_list;

    return createElement("div", { className: "space-y-6" },
      // Allow List
      createElement(Card, null,
        createElement(CardHeader, null,
          createElement(CardTitle, { className: "flex items-center gap-2" },
            createElement(Shield, { className: "size-4 text-success" }), "Allow List",
          ),
          createElement(CardDescription, null, "When default policy is Deny, only these entries can write."),
        ),
        createElement(CardContent, { className: "space-y-6" },
          this.renderPubkeyList("Allowed Pubkeys", allow?.list_pubkeys || [], "allowlistpubkey", "allowlistpubkey", "newAllowPubkey"),
          createElement(Separator, null),
          this.renderKeywordList("Allowed Keywords", allow?.list_keywords || [], "allowlistkeyword", "allowlistkeyword", "newAllowKeyword"),
          createElement(Separator, null),
          this.renderKindList("Allowed Kinds", allow?.list_kinds || [], "allowlistkind", "allowlistkind", "newAllowKind"),
        ),
      ),

      // Block List
      createElement(Card, null,
        createElement(CardHeader, null,
          createElement(CardTitle, { className: "flex items-center gap-2" },
            createElement(Shield, { className: "size-4 text-destructive" }), "Block List",
          ),
          createElement(CardDescription, null, "These entries are always blocked regardless of policy."),
        ),
        createElement(CardContent, { className: "space-y-6" },
          this.renderPubkeyList("Blocked Pubkeys", block?.list_pubkeys || [], "blocklistpubkey", "blocklistpubkey", "newBlockPubkey"),
          createElement(Separator, null),
          this.renderKeywordList("Blocked Keywords", block?.list_keywords || [], "blocklistkeyword", "blocklistkeyword", "newBlockKeyword"),
          createElement(Separator, null),
          this.renderKindList("Blocked Kinds", block?.list_kinds || [], "blocklistkind", "blocklistkind", "newBlockKind"),
        ),
      ),
    );
  }

  // ── Moderators Tab ──

  private async addModerator() {
    const { relay, newModPubkey } = this.state;
    if (!relay || !newModPubkey.trim()) return;
    try {
      await api.post(`/relays/${relay.id}/moderators`, { pubkey: newModPubkey.trim() });
      this.setState({ newModPubkey: "" });
      this.showToast("Moderator added");
      await this.loadRelay(relay.name);
    } catch (err: any) {
      this.showToast("Error: " + (err.message || "add failed"));
    }
  }

  private async removeModerator(modId: string) {
    const { relay } = this.state;
    if (!relay) return;
    try {
      await api.delete(`/relays/${relay.id}/moderators/${modId}`);
      this.showToast("Moderator removed");
      await this.loadRelay(relay.name);
    } catch (err: any) {
      this.showToast("Error: " + (err.message || "remove failed"));
    }
  }

  private renderModerators() {
    const { relay, newModPubkey } = this.state;
    if (!relay) return null;

    return createElement("div", { className: "space-y-6" },
      createElement(Card, null,
        createElement(CardHeader, null,
          createElement(CardTitle, { className: "flex items-center gap-2" },
            createElement(Users, { className: "size-4" }), "Moderators",
          ),
          createElement(CardDescription, null, "Moderators can manage ACLs and relay settings."),
        ),
        createElement(CardContent, { className: "space-y-4" },
          // Owner
          relay.owner ? createElement("div", { className: "flex items-center justify-between bg-muted/50 rounded-md px-3 py-2" },
            createElement("div", null,
              createElement("span", { className: "text-xs font-mono" }, relay.owner.pubkey.slice(0, 16) + "..." + relay.owner.pubkey.slice(-8)),
              createElement(Badge, { variant: "secondary", className: "ml-2" }, "Owner"),
            ),
          ) : null,
          // Moderators
          relay.moderators.length > 0
            ? createElement("div", { className: "space-y-1" },
                ...relay.moderators.map((mod) =>
                  createElement("div", { key: mod.id, className: "flex items-center justify-between bg-muted/30 rounded-md px-3 py-2 group" },
                    createElement("span", { className: "text-xs font-mono" }, mod.user.pubkey.slice(0, 16) + "..." + mod.user.pubkey.slice(-8)),
                    createElement(Button, { variant: "ghost", size: "xs", className: "opacity-0 group-hover:opacity-100 text-destructive", onClick: () => this.removeModerator(mod.id) },
                      createElement(Trash2, { className: "size-3" }),
                    ),
                  ),
                ),
              )
            : createElement("p", { className: "text-xs text-muted-foreground italic" }, "No moderators added yet."),
          createElement(Separator, null),
          createElement("div", { className: "flex gap-2" },
            createElement(Input, {
              className: "flex-1", placeholder: "hex pubkey of new moderator",
              value: newModPubkey,
              onInput: (e: Event) => this.setState({ newModPubkey: (e.target as HTMLInputElement).value }),
              onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter") this.addModerator(); },
            }),
            createElement(Button, { size: "sm", disabled: !newModPubkey.trim(), onClick: () => this.addModerator() }, "Add Moderator"),
          ),
        ),
      ),
    );
  }

  // ── Streams Tab ──

  private async addStream() {
    const { relay, newStreamUrl, newStreamDirection } = this.state;
    if (!relay || !newStreamUrl.trim()) return;
    try {
      await api.post(`/relays/${relay.id}/streams`, { url: newStreamUrl.trim(), direction: newStreamDirection });
      this.setState({ newStreamUrl: "" });
      this.showToast("Stream added");
      await this.loadRelay(relay.name);
    } catch (err: any) {
      this.showToast("Error: " + (err.message || "add failed"));
    }
  }

  private async removeStream(streamId: string) {
    const { relay } = this.state;
    if (!relay) return;
    try {
      await api.delete(`/relays/${relay.id}/streams/${streamId}`);
      this.showToast("Stream removed");
      await this.loadRelay(relay.name);
    } catch (err: any) {
      this.showToast("Error: " + (err.message || "remove failed"));
    }
  }

  private renderStreams() {
    const { relay, newStreamUrl, newStreamDirection } = this.state;
    if (!relay) return null;

    return createElement("div", { className: "space-y-6" },
      createElement(Card, null,
        createElement(CardHeader, null,
          createElement(CardTitle, { className: "flex items-center gap-2" },
            createElement(Radio, { className: "size-4" }), "Stream Configuration",
          ),
          createElement(CardDescription, null, "Sync events with other relays. Maximum 5 streams."),
        ),
        createElement(CardContent, { className: "space-y-4" },
          relay.streams.length > 0
            ? createElement("div", { className: "space-y-2" },
                ...relay.streams.map((s) =>
                  createElement("div", { key: s.id, className: "flex items-center justify-between bg-muted/30 rounded-md px-3 py-2 group" },
                    createElement("div", { className: "flex items-center gap-2 min-w-0" },
                      createElement("span", { className: "text-xs font-mono truncate" }, s.url),
                      createElement(Badge, { variant: "outline" }, s.direction),
                      createElement(Badge, { variant: s.status === "running" ? "default" : "secondary" }, s.status),
                    ),
                    createElement(Button, { variant: "ghost", size: "xs", className: "opacity-0 group-hover:opacity-100 text-destructive shrink-0", onClick: () => this.removeStream(s.id) },
                      createElement(Trash2, { className: "size-3" }),
                    ),
                  ),
                ),
              )
            : createElement("p", { className: "text-xs text-muted-foreground italic" }, "No streams configured."),
          createElement(Separator, null),
          createElement("div", { className: "space-y-3" },
            createElement(Label, null, "Add Stream"),
            createElement("div", { className: "flex gap-2" },
              createElement(Input, {
                className: "flex-1", placeholder: "wss://relay.example.com",
                value: newStreamUrl,
                onInput: (e: Event) => this.setState({ newStreamUrl: (e.target as HTMLInputElement).value }),
              }),
              createElement("select", {
                className: "h-9 rounded-md border border-input bg-transparent px-2 text-sm",
                value: newStreamDirection,
                onChange: (e: Event) => this.setState({ newStreamDirection: (e.target as HTMLSelectElement).value }),
              },
                createElement("option", { value: "both" }, "Both"),
                createElement("option", { value: "up" }, "Up"),
                createElement("option", { value: "down" }, "Down"),
              ),
              createElement(Button, { size: "sm", disabled: !newStreamUrl.trim() || relay.streams.length >= 5, onClick: () => this.addStream() }, "Add"),
            ),
          ),
        ),
      ),
    );
  }

  // ── Danger Zone ──

  private async deleteRelay() {
    const { relay } = this.state;
    if (!relay) return;
    if (!confirm(`Are you sure you want to delete relay "${relay.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/relays/${relay.id}`);
      this.showToast("Relay marked for deletion");
      // Redirect to admin after short delay
      setTimeout(() => { window.location.href = "/admin"; }, 1500);
    } catch (err: any) {
      this.showToast("Error: " + (err.message || "delete failed"));
    }
  }

  private renderDanger() {
    return createElement("div", { className: "space-y-6" },
      createElement(Card, { className: "border-destructive/50" },
        createElement(CardHeader, null,
          createElement(CardTitle, { className: "flex items-center gap-2 text-destructive" },
            createElement(AlertTriangle, { className: "size-4" }), "Danger Zone",
          ),
          createElement(CardDescription, null, "Irreversible actions. Proceed with caution."),
        ),
        createElement(CardContent, null,
          createElement(Button, { variant: "destructive", onClick: () => this.deleteRelay() },
            createElement(Trash2, { className: "size-4" }), "Delete Relay",
          ),
        ),
      ),
    );
  }

  // ── Main Render ──

  render() {
    const { relay, loading, error, activeTab, toast } = this.state;

    if (loading) {
      return createElement("div", { className: "flex justify-center py-16" },
        createElement(Loader2, { className: "size-8 animate-spin text-muted-foreground" }),
      );
    }

    if (error || !relay) {
      return createElement("div", { className: "text-center py-16" },
        createElement("p", { className: "text-destructive" }, error || "Relay not found"),
        createElement(Link, { to: "/admin", className: "text-sm text-primary hover:underline mt-4 inline-block" }, "← Back to Admin"),
      );
    }

    return createElement("div", { className: "max-w-3xl mx-auto space-y-6 animate-in" },
      // Toast
      toast ? createElement("div", { className: "fixed top-4 right-4 z-50 bg-foreground text-background px-4 py-2 rounded-md text-sm shadow-lg" }, toast) : null,

      // Header
      createElement("div", { className: "flex items-center gap-3" },
        createElement(Link, { to: `/relays/${relay.name}`, className: "text-muted-foreground hover:text-foreground" },
          createElement(ChevronLeft, { className: "size-5" }),
        ),
        createElement("div", null,
          createElement("h1", { className: "text-2xl font-bold tracking-tight flex items-center gap-2" },
            createElement(Settings, { className: "size-5 text-primary" }),
            `${relay.name} Settings`,
          ),
          createElement("p", { className: "text-sm text-muted-foreground flex items-center gap-2 mt-0.5" },
            createElement(Globe, { className: "size-3" }),
            this.relayUrl(),
            createElement(Badge, { variant: relay.status === "running" ? "default" : "secondary", className: "ml-1" }, relay.status || "unknown"),
            relay.auth_required
              ? createElement(Badge, { variant: "outline", className: "ml-1" }, createElement(Lock, { className: "size-3 mr-1" }), "Auth")
              : null,
          ),
        ),
      ),

      // Tabs
      createElement(Tabs, null,
        createElement(TabsList, { className: "w-full justify-start" },
          createElement(TabsTrigger, { value: "general", active: activeTab === "general", onClick: () => this.setState({ activeTab: "general" }) }, "General"),
          createElement(TabsTrigger, { value: "acl", active: activeTab === "acl", onClick: () => this.setState({ activeTab: "acl" }) }, "ACLs"),
          createElement(TabsTrigger, { value: "moderators", active: activeTab === "moderators", onClick: () => this.setState({ activeTab: "moderators" }) }, "Moderators"),
          createElement(TabsTrigger, { value: "streams", active: activeTab === "streams", onClick: () => this.setState({ activeTab: "streams" }) }, "Streams"),
          createElement(TabsTrigger, { value: "danger", active: activeTab === "danger", onClick: () => this.setState({ activeTab: "danger" }) }, "Danger"),
        ),
        createElement(TabsContent, { value: "general", active: activeTab === "general" }, this.renderGeneral()),
        createElement(TabsContent, { value: "acl", active: activeTab === "acl" }, this.renderAcl()),
        createElement(TabsContent, { value: "moderators", active: activeTab === "moderators" }, this.renderModerators()),
        createElement(TabsContent, { value: "streams", active: activeTab === "streams" }, this.renderStreams()),
        createElement(TabsContent, { value: "danger", active: activeTab === "danger" }, this.renderDanger()),
      ),
    );
  }
}
