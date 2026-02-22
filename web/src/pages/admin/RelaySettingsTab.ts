import { createElement } from "inferno-create-element";
import { api } from "../../lib/api";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { Textarea } from "@/ui/Textarea";
import { Label } from "@/ui/Label";
import { Switch } from "@/ui/Switch";
import { Separator } from "@/ui/Separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/Tabs";
import {
  Loader2, Globe, Settings, Lock, Shield, Trash2, Plus, X, Users, Radio,
  AlertTriangle, ChevronLeft, Check, Copy,
} from "@/lib/icons";
import { renderLoading, pubkeyShort } from "./helpers";

// ── Types ──

interface ListEntryPubkey { id: string; pubkey: string; reason: string | null; }
interface ListEntryKeyword { id: string; keyword: string; reason: string | null; }
interface ListEntryKind { id: string; kind: number; reason: string | null; }
interface AclList { id: string; list_pubkeys: ListEntryPubkey[]; list_keywords: ListEntryKeyword[]; list_kinds: ListEntryKind[]; }
interface StreamData { id: string; url: string; direction: string; internal: boolean; sync: boolean; status: string; }
interface ModeratorData { id: string; user: { id: string; pubkey: string }; }

export interface RelaySettingsFull {
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
  payment_required: boolean;
  payment_amount: number;
  is_external: boolean;
  owner: { id: string; pubkey: string } | null;
  moderators: ModeratorData[];
  streams: StreamData[];
  allow_list: AclList | null;
  block_list: AclList | null;
}

export interface RelaySettingsTabState {
  relay: RelaySettingsFull | null;
  loading: boolean;
  error: string;
  saving: boolean;
  activeTab: string;
  toast: string;
  // General fields
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
}

export function initialRelaySettingsState(): RelaySettingsTabState {
  return {
    relay: null, loading: false, error: "", saving: false,
    activeTab: "general", toast: "",
    details: "", profileImage: "", bannerImage: "",
    listedInDirectory: false, authRequired: false,
    defaultMessagePolicy: false, allowTagged: false, allowGiftwrap: true,
    newAllowPubkey: "", newBlockPubkey: "",
    newAllowKeyword: "", newBlockKeyword: "",
    newAllowKind: "", newBlockKind: "",
    newModPubkey: "",
    newStreamUrl: "", newStreamDirection: "both",
  };
}

export function populateFromRelay(r: RelaySettingsFull): Partial<RelaySettingsTabState> {
  return {
    relay: r, loading: false, error: "",
    details: r.details || "",
    profileImage: r.profile_image || "",
    bannerImage: r.banner_image || "",
    listedInDirectory: r.listed_in_directory,
    authRequired: r.auth_required,
    defaultMessagePolicy: r.default_message_policy,
    allowTagged: r.allow_tagged,
    allowGiftwrap: r.allow_giftwrap,
  };
}

// ── Helpers ──

function relayUrl(r: RelaySettingsFull): string {
  return r.is_external ? `wss://${r.domain}` : `wss://${r.name}.${r.domain}`;
}

// ── Render functions ──

export function renderRelaySettingsPanel(
  s: RelaySettingsTabState,
  onBack: () => void,
  onSetState: (partial: Partial<RelaySettingsTabState>) => void,
  onReload: () => void,
  onShowToast: (msg: string) => void,
) {
  const { relay, loading, error, activeTab, saving } = s;

  if (loading) return renderLoading();

  if (error || !relay) {
    return createElement("div", { className: "text-center py-16" },
      createElement("p", { className: "text-destructive" }, error || "Relay not found"),
      createElement(Button, { variant: "ghost", onClick: onBack, className: "mt-4" }, "← Back"),
    );
  }

  return createElement("div", { className: "space-y-6 animate-in" },
    // Header
    createElement("div", { className: "flex items-center gap-3" },
      createElement(Button, { variant: "ghost", size: "icon-sm", onClick: onBack },
        createElement(ChevronLeft, { className: "size-5" }),
      ),
      createElement("div", { className: "flex-1 min-w-0" },
        createElement("h2", { className: "text-lg font-semibold flex items-center gap-2 truncate" },
          createElement(Settings, { className: "size-4 text-primary shrink-0" }),
          relay.name + " Settings",
        ),
        createElement("div", { className: "flex items-center gap-2 mt-0.5" },
          createElement("code", { className: "text-xs text-muted-foreground font-mono" }, relayUrl(relay)),
          createElement(Badge, {
            variant: relay.status === "running" ? "default" : "secondary",
            className: "text-[10px]",
          }, relay.status || "unknown"),
          relay.auth_required
            ? createElement(Badge, { variant: "outline", className: "text-[10px] gap-1" },
                createElement(Lock, { className: "size-2.5" }), "Auth",
              )
            : null,
        ),
      ),
    ),

    // Tabs
    createElement(Tabs, null,
      createElement(TabsList, { className: "w-full justify-start" },
        ...["general", "acl", "moderators", "streams", "danger"].map((t) =>
          createElement(TabsTrigger, {
            key: t, value: t, active: activeTab === t,
            onClick: () => onSetState({ activeTab: t }),
          }, t === "acl" ? "ACLs" : t.charAt(0).toUpperCase() + t.slice(1)),
        ),
      ),
      createElement(TabsContent, { value: "general", active: activeTab === "general" },
        renderGeneral(s, onSetState, onShowToast),
      ),
      createElement(TabsContent, { value: "acl", active: activeTab === "acl" },
        renderAcl(s, onSetState, onReload, onShowToast),
      ),
      createElement(TabsContent, { value: "moderators", active: activeTab === "moderators" },
        renderModerators(s, onSetState, onReload, onShowToast),
      ),
      createElement(TabsContent, { value: "streams", active: activeTab === "streams" },
        renderStreams(s, onSetState, onReload, onShowToast),
      ),
      createElement(TabsContent, { value: "danger", active: activeTab === "danger" },
        renderDanger(relay, onBack, onShowToast),
      ),
    ),
  );
}

// ── General Tab ──

function patchSettings(relay: RelaySettingsFull, body: Record<string, any>, onSetState: (p: Partial<RelaySettingsTabState>) => void, onShowToast: (m: string) => void) {
  onSetState({ saving: true });
  api.patch(`/relays/${relay.id}/settings`, body)
    .then(() => onShowToast("Settings saved"))
    .catch((err: any) => onShowToast("Error: " + (err.message || "save failed")))
    .finally(() => onSetState({ saving: false }));
}

function renderGeneral(s: RelaySettingsTabState, onSetState: (p: Partial<RelaySettingsTabState>) => void, onShowToast: (m: string) => void) {
  const { relay, details, profileImage, bannerImage, listedInDirectory, authRequired, defaultMessagePolicy, allowTagged, allowGiftwrap, saving } = s;
  if (!relay) return null;

  return createElement("div", { className: "space-y-6" },
    // Profile card
    createElement("div", { className: "rounded-lg border border-border/50 p-4 space-y-4" },
      createElement("h3", { className: "text-sm font-semibold" }, "Profile"),
      createElement("div", { className: "space-y-2" },
        createElement(Label, { className: "text-xs" }, "Description"),
        createElement(Textarea, {
          value: details, rows: 3,
          onInput: (e: Event) => onSetState({ details: (e.target as HTMLTextAreaElement).value }),
        }),
      ),
      createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
        createElement("div", { className: "space-y-1" },
          createElement(Label, { className: "text-xs" }, "Profile Image URL"),
          createElement(Input, {
            value: profileImage, placeholder: "https://...",
            onInput: (e: Event) => onSetState({ profileImage: (e.target as HTMLInputElement).value }),
          }),
        ),
        createElement("div", { className: "space-y-1" },
          createElement(Label, { className: "text-xs" }, "Banner Image URL"),
          createElement(Input, {
            value: bannerImage, placeholder: "https://...",
            onInput: (e: Event) => onSetState({ bannerImage: (e.target as HTMLInputElement).value }),
          }),
        ),
      ),
      createElement("div", { className: "flex items-center justify-between" },
        createElement(Label, { className: "text-xs" }, "Listed in Directory"),
        createElement(Switch, { checked: listedInDirectory, onChange: (v: boolean) => onSetState({ listedInDirectory: v }) }),
      ),
      createElement(Button, {
        size: "sm", disabled: saving,
        onClick: () => patchSettings(relay, { details, profile_image: profileImage, banner_image: bannerImage, listed_in_directory: listedInDirectory }, onSetState, onShowToast),
      }, saving ? "Saving..." : "Save Profile"),
    ),

    // Access control card
    createElement("div", { className: "rounded-lg border border-border/50 p-4 space-y-4" },
      createElement("h3", { className: "text-sm font-semibold" }, "Access Control"),
      renderToggleRow("NIP-42 Authentication Required", "Require clients to authenticate before writing.", authRequired,
        (v) => { onSetState({ authRequired: v }); patchSettings(relay, { auth_required: v }, onSetState, onShowToast); }),
      createElement(Separator, null),
      renderToggleRow("Default Message Policy", "Allow: accept all by default. Deny: only allow list.", defaultMessagePolicy,
        (v) => { onSetState({ defaultMessagePolicy: v }); patchSettings(relay, { default_message_policy: v }, onSetState, onShowToast); },
        defaultMessagePolicy ? "Allow" : "Deny"),
      createElement(Separator, null),
      renderToggleRow("Allow Tagged Events", "Accept events that tag allowed pubkeys.", allowTagged,
        (v) => { onSetState({ allowTagged: v }); patchSettings(relay, { allow_tagged: v }, onSetState, onShowToast); }),
      createElement(Separator, null),
      renderToggleRow("Allow Gift Wrap (NIP-17)", "Accept encrypted direct messages.", allowGiftwrap,
        (v) => { onSetState({ allowGiftwrap: v }); patchSettings(relay, { allow_giftwrap: v }, onSetState, onShowToast); }),
    ),
  );
}

function renderToggleRow(title: string, desc: string, checked: boolean, onChange: (v: boolean) => void, label?: string) {
  return createElement("div", { className: "flex items-center justify-between gap-4" },
    createElement("div", { className: "min-w-0" },
      createElement(Label, { className: "text-xs font-medium" }, title),
      createElement("p", { className: "text-[11px] text-muted-foreground mt-0.5" }, desc),
    ),
    createElement("div", { className: "flex items-center gap-2 shrink-0" },
      label ? createElement("span", { className: "text-[11px] text-muted-foreground" }, label) : null,
      createElement(Switch, { checked, onChange }),
    ),
  );
}

// ── ACL Tab ──

function addAclEntry(relay: RelaySettingsFull, type: string, body: Record<string, any>, onReload: () => void, onShowToast: (m: string) => void) {
  api.post(`/relays/${relay.id}/${type}`, body)
    .then(() => { onShowToast("Entry added"); onReload(); })
    .catch((err: any) => onShowToast("Error: " + (err.message || "add failed")));
}

function removeAclEntry(relay: RelaySettingsFull, type: string, entryId: string, onReload: () => void, onShowToast: (m: string) => void) {
  api.delete(`/relays/${relay.id}/${type}`, { id: entryId })
    .then(() => { onShowToast("Entry removed"); onReload(); })
    .catch((err: any) => onShowToast("Error: " + (err.message || "remove failed")));
}

function renderPubkeyList(
  title: string, entries: ListEntryPubkey[], type: string,
  inputVal: string, inputKey: string,
  relay: RelaySettingsFull,
  onSetState: (p: Partial<RelaySettingsTabState>) => void,
  onReload: () => void, onShowToast: (m: string) => void,
) {
  return createElement("div", { className: "space-y-2" },
    createElement(Label, { className: "text-xs" }, title + " (" + entries.length + ")"),
    entries.length > 0
      ? createElement("div", { className: "max-h-40 overflow-y-auto space-y-1" },
          ...entries.map((e) =>
            createElement("div", { key: e.id, className: "flex items-center justify-between bg-muted/40 rounded px-2.5 py-1 group text-xs" },
              createElement("code", { className: "font-mono truncate" }, pubkeyShort(e.pubkey)),
              createElement("button", {
                className: "text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 cursor-pointer shrink-0 ml-2",
                onClick: () => removeAclEntry(relay, type, e.id, onReload, onShowToast),
              }, "×"),
            ),
          ),
        )
      : createElement("p", { className: "text-[11px] text-muted-foreground italic" }, "No entries"),
    createElement("div", { className: "flex gap-1.5" },
      createElement(Input, {
        className: "flex-1 h-8 text-xs", placeholder: "hex pubkey",
        value: inputVal,
        onInput: (e: Event) => onSetState({ [inputKey]: (e.target as HTMLInputElement).value } as any),
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === "Enter" && inputVal.trim()) {
            addAclEntry(relay, type, { pubkey: inputVal.trim() }, onReload, onShowToast);
            onSetState({ [inputKey]: "" } as any);
          }
        },
      }),
      createElement(Button, {
        size: "xs", disabled: !inputVal.trim(),
        onClick: () => { addAclEntry(relay, type, { pubkey: inputVal.trim() }, onReload, onShowToast); onSetState({ [inputKey]: "" } as any); },
      }, createElement(Plus, { className: "size-3" })),
    ),
  );
}

function renderTagList(
  title: string, entries: { id: string; keyword?: string; kind?: number }[], type: string,
  inputVal: string, inputKey: string, placeholder: string, bodyKey: string,
  relay: RelaySettingsFull,
  onSetState: (p: Partial<RelaySettingsTabState>) => void,
  onReload: () => void, onShowToast: (m: string) => void,
) {
  return createElement("div", { className: "space-y-2" },
    createElement(Label, { className: "text-xs" }, title + " (" + entries.length + ")"),
    entries.length > 0
      ? createElement("div", { className: "flex flex-wrap gap-1" },
          ...entries.map((e) =>
            createElement("span", { key: e.id, className: "inline-flex items-center gap-1 bg-muted/40 rounded-full px-2 py-0.5 text-[11px]" },
              e.keyword || String(e.kind),
              createElement("button", {
                className: "text-muted-foreground hover:text-destructive cursor-pointer",
                onClick: () => removeAclEntry(relay, type, e.id, onReload, onShowToast),
              }, "×"),
            ),
          ),
        )
      : createElement("p", { className: "text-[11px] text-muted-foreground italic" }, "No entries"),
    createElement("div", { className: "flex gap-1.5" },
      createElement(Input, {
        className: "flex-1 h-8 text-xs", placeholder,
        value: inputVal,
        onInput: (e: Event) => onSetState({ [inputKey]: (e.target as HTMLInputElement).value } as any),
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === "Enter" && inputVal.trim()) {
            addAclEntry(relay, type, { [bodyKey]: inputVal.trim() }, onReload, onShowToast);
            onSetState({ [inputKey]: "" } as any);
          }
        },
      }),
      createElement(Button, {
        size: "xs", disabled: !inputVal.trim(),
        onClick: () => { addAclEntry(relay, type, { [bodyKey]: inputVal.trim() }, onReload, onShowToast); onSetState({ [inputKey]: "" } as any); },
      }, createElement(Plus, { className: "size-3" })),
    ),
  );
}

function renderAcl(s: RelaySettingsTabState, onSetState: (p: Partial<RelaySettingsTabState>) => void, onReload: () => void, onShowToast: (m: string) => void) {
  const { relay } = s;
  if (!relay) return null;
  const allow = relay.allow_list;
  const block = relay.block_list;

  return createElement("div", { className: "space-y-6" },
    // Allow List
    createElement("div", { className: "rounded-lg border border-border/50 p-4 space-y-4" },
      createElement("h3", { className: "text-sm font-semibold flex items-center gap-2" },
        createElement(Shield, { className: "size-3.5 text-emerald-500" }), "Allow List",
      ),
      createElement("p", { className: "text-[11px] text-muted-foreground -mt-2" }, "When default policy is Deny, only these entries can write."),
      renderPubkeyList("Pubkeys", allow?.list_pubkeys || [], "allowlistpubkey", s.newAllowPubkey, "newAllowPubkey", relay, onSetState, onReload, onShowToast),
      createElement(Separator, null),
      renderTagList("Keywords", allow?.list_keywords || [], "allowlistkeyword", s.newAllowKeyword, "newAllowKeyword", "keyword", "keyword", relay, onSetState, onReload, onShowToast),
      createElement(Separator, null),
      renderTagList("Kinds", allow?.list_kinds || [], "allowlistkind", s.newAllowKind, "newAllowKind", "kind number", "kind", relay, onSetState, onReload, onShowToast),
    ),

    // Block List
    createElement("div", { className: "rounded-lg border border-destructive/30 p-4 space-y-4" },
      createElement("h3", { className: "text-sm font-semibold flex items-center gap-2" },
        createElement(Shield, { className: "size-3.5 text-destructive" }), "Block List",
      ),
      createElement("p", { className: "text-[11px] text-muted-foreground -mt-2" }, "Always blocked regardless of policy."),
      renderPubkeyList("Pubkeys", block?.list_pubkeys || [], "blocklistpubkey", s.newBlockPubkey, "newBlockPubkey", relay, onSetState, onReload, onShowToast),
      createElement(Separator, null),
      renderTagList("Keywords", block?.list_keywords || [], "blocklistkeyword", s.newBlockKeyword, "newBlockKeyword", "keyword", "keyword", relay, onSetState, onReload, onShowToast),
      createElement(Separator, null),
      renderTagList("Kinds", block?.list_kinds || [], "blocklistkind", s.newBlockKind, "newBlockKind", "kind number", "kind", relay, onSetState, onReload, onShowToast),
    ),
  );
}

// ── Moderators Tab ──

function renderModerators(s: RelaySettingsTabState, onSetState: (p: Partial<RelaySettingsTabState>) => void, onReload: () => void, onShowToast: (m: string) => void) {
  const { relay, newModPubkey } = s;
  if (!relay) return null;

  const addMod = () => {
    if (!newModPubkey.trim()) return;
    api.post(`/relays/${relay.id}/moderators`, { pubkey: newModPubkey.trim() })
      .then(() => { onSetState({ newModPubkey: "" }); onShowToast("Moderator added"); onReload(); })
      .catch((err: any) => onShowToast("Error: " + (err.message || "add failed")));
  };

  const removeMod = (modId: string) => {
    api.delete(`/relays/${relay.id}/moderators/${modId}`)
      .then(() => { onShowToast("Moderator removed"); onReload(); })
      .catch((err: any) => onShowToast("Error: " + (err.message || "remove failed")));
  };

  return createElement("div", { className: "rounded-lg border border-border/50 p-4 space-y-4" },
    createElement("h3", { className: "text-sm font-semibold flex items-center gap-2" },
      createElement(Users, { className: "size-3.5" }), "Moderators",
    ),
    createElement("p", { className: "text-[11px] text-muted-foreground -mt-2" }, "Moderators can manage ACLs and relay settings."),
    // Owner
    relay.owner ? createElement("div", { className: "flex items-center gap-2 bg-muted/40 rounded px-3 py-2" },
      createElement("code", { className: "text-xs font-mono flex-1 truncate" }, relay.owner.pubkey),
      createElement(Badge, { variant: "secondary", className: "text-[10px] shrink-0" }, "Owner"),
    ) : null,
    // Moderators
    relay.moderators.length > 0
      ? createElement("div", { className: "space-y-1" },
          ...relay.moderators.map((mod) =>
            createElement("div", { key: mod.id, className: "flex items-center justify-between bg-muted/30 rounded px-3 py-1.5 group" },
              createElement("code", { className: "text-xs font-mono truncate" }, pubkeyShort(mod.user.pubkey)),
              createElement(Button, {
                variant: "ghost", size: "xs",
                className: "opacity-0 group-hover:opacity-100 text-destructive",
                onClick: () => removeMod(mod.id),
              }, createElement(Trash2, { className: "size-3" })),
            ),
          ),
        )
      : createElement("p", { className: "text-[11px] text-muted-foreground italic" }, "No moderators added yet."),
    createElement(Separator, null),
    createElement("div", { className: "flex gap-1.5" },
      createElement(Input, {
        className: "flex-1 h-8 text-xs", placeholder: "hex pubkey of new moderator",
        value: newModPubkey,
        onInput: (e: Event) => onSetState({ newModPubkey: (e.target as HTMLInputElement).value }),
        onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter") addMod(); },
      }),
      createElement(Button, { size: "sm", disabled: !newModPubkey.trim(), onClick: addMod }, "Add"),
    ),
  );
}

// ── Streams Tab ──

function renderStreams(s: RelaySettingsTabState, onSetState: (p: Partial<RelaySettingsTabState>) => void, onReload: () => void, onShowToast: (m: string) => void) {
  const { relay, newStreamUrl, newStreamDirection } = s;
  if (!relay) return null;

  const addStream = () => {
    if (!newStreamUrl.trim()) return;
    api.post(`/relays/${relay.id}/streams`, { url: newStreamUrl.trim(), direction: newStreamDirection })
      .then(() => { onSetState({ newStreamUrl: "" }); onShowToast("Stream added"); onReload(); })
      .catch((err: any) => onShowToast("Error: " + (err.message || "add failed")));
  };

  const removeStream = (streamId: string) => {
    api.delete(`/relays/${relay.id}/streams/${streamId}`)
      .then(() => { onShowToast("Stream removed"); onReload(); })
      .catch((err: any) => onShowToast("Error: " + (err.message || "remove failed")));
  };

  return createElement("div", { className: "rounded-lg border border-border/50 p-4 space-y-4" },
    createElement("h3", { className: "text-sm font-semibold flex items-center gap-2" },
      createElement(Radio, { className: "size-3.5" }), "Stream Configuration",
    ),
    createElement("p", { className: "text-[11px] text-muted-foreground -mt-2" }, "Sync events with other relays. Maximum 5 streams."),
    relay.streams.length > 0
      ? createElement("div", { className: "space-y-1.5" },
          ...relay.streams.map((st) =>
            createElement("div", { key: st.id, className: "flex items-center justify-between bg-muted/30 rounded px-3 py-1.5 group" },
              createElement("div", { className: "flex items-center gap-2 min-w-0 flex-1" },
                createElement("code", { className: "text-xs font-mono truncate" }, st.url),
                createElement(Badge, { variant: "outline", className: "text-[10px] shrink-0" }, st.direction),
                createElement(Badge, { variant: st.status === "running" ? "default" : "secondary", className: "text-[10px] shrink-0" }, st.status),
              ),
              createElement(Button, {
                variant: "ghost", size: "xs",
                className: "opacity-0 group-hover:opacity-100 text-destructive shrink-0",
                onClick: () => removeStream(st.id),
              }, createElement(Trash2, { className: "size-3" })),
            ),
          ),
        )
      : createElement("p", { className: "text-[11px] text-muted-foreground italic" }, "No streams configured."),
    createElement(Separator, null),
    createElement("div", { className: "flex gap-1.5" },
      createElement(Input, {
        className: "flex-1 h-8 text-xs", placeholder: "wss://relay.example.com",
        value: newStreamUrl,
        onInput: (e: Event) => onSetState({ newStreamUrl: (e.target as HTMLInputElement).value }),
      }),
      createElement("select", {
        className: "h-8 rounded-md border border-input bg-transparent px-2 text-xs",
        value: newStreamDirection,
        onChange: (e: Event) => onSetState({ newStreamDirection: (e.target as HTMLSelectElement).value }),
      },
        createElement("option", { value: "both" }, "Both"),
        createElement("option", { value: "up" }, "Up"),
        createElement("option", { value: "down" }, "Down"),
      ),
      createElement(Button, { size: "sm", disabled: !newStreamUrl.trim() || relay.streams.length >= 5, onClick: addStream }, "Add"),
    ),
  );
}

// ── Danger Zone ──

function renderDanger(relay: RelaySettingsFull, onBack: () => void, onShowToast: (m: string) => void) {
  const deleteRelay = () => {
    if (!confirm(`Are you sure you want to delete relay "${relay.name}"? This cannot be undone.`)) return;
    api.delete(`/relays/${relay.id}`)
      .then(() => { onShowToast("Relay marked for deletion"); setTimeout(onBack, 1500); })
      .catch((err: any) => onShowToast("Error: " + (err.message || "delete failed")));
  };

  return createElement("div", { className: "rounded-lg border border-destructive/50 p-4 space-y-4" },
    createElement("h3", { className: "text-sm font-semibold flex items-center gap-2 text-destructive" },
      createElement(AlertTriangle, { className: "size-3.5" }), "Danger Zone",
    ),
    createElement("p", { className: "text-[11px] text-muted-foreground" }, "Irreversible actions. Proceed with caution."),
    createElement(Button, { variant: "destructive", size: "sm", onClick: deleteRelay },
      createElement(Trash2, { className: "size-3.5" }), "Delete Relay",
    ),
  );
}
