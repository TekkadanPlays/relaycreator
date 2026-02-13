import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import {
  Globe, Shield, Users, Radio, Zap, Trash2, Loader2, Save,
  Plus, X, Copy, Check, Settings, Lock, Unlock, Tag, Hash,
  ChevronDown, Eye, Image, FileText, Gift, ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useRelayDomain } from "../hooks/useRelayDomain";

interface RelayFull {
  id: string;
  name: string;
  domain: string | null;
  status: string | null;
  details: string | null;
  default_message_policy: boolean;
  auth_required: boolean;
  listed_in_directory: boolean;
  payment_required: boolean;
  payment_amount: number;
  payment_premium_amount: number;
  nip05_payment_amount: number;
  allow_tagged: boolean;
  allow_giftwrap: boolean;
  allow_keyword_pubkey: boolean;
  profile_image: string | null;
  banner_image: string | null;
  relay_kind_description: string | null;
  request_payment: boolean;
  request_payment_amount: number;
  owner: { id: string; pubkey: string; name: string | null };
  moderators: { id: string; user: { id: string; pubkey: string; name: string | null } }[];
  streams: { id: string; url: string; direction: string; sync: boolean; status: string | null }[];
  block_list: {
    id: string;
    list_pubkeys: { id: string; pubkey: string; reason: string | null }[];
    list_keywords: { id: string; keyword: string; reason: string | null }[];
    list_kinds: { id: string; kind: number; reason: string | null }[];
  } | null;
  allow_list: {
    id: string;
    list_pubkeys: { id: string; pubkey: string; reason: string | null }[];
    list_keywords: { id: string; keyword: string; reason: string | null }[];
    list_kinds: { id: string; kind: number; reason: string | null }[];
  } | null;
}

type Section = "general" | "access" | "team" | "networking" | "billing" | "danger";

const NAV_ITEMS: { id: Section; label: string; icon: typeof Globe }[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "access", label: "Access Control", icon: Shield },
  { id: "team", label: "Team", icon: Users },
  { id: "networking", label: "Networking", icon: Radio },
  { id: "billing", label: "Billing", icon: Zap },
  { id: "danger", label: "Danger Zone", icon: Trash2 },
];

export default function RelaySettings() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>("general");
  const [copied, setCopied] = useState(false);
  const fallbackDomain = useRelayDomain();

  const { data, isLoading, error } = useQuery({
    queryKey: ["relaySettings", slug],
    queryFn: () => api.get<{ relay: RelayFull }>(`/relays/by-name/${slug}`),
    enabled: !!slug && !!user,
  });

  const onUpdate = () => queryClient.invalidateQueries({ queryKey: ["relaySettings", slug] });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Lock className="size-10 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold">Sign in required</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to manage your relay settings.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data?.relay) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Globe className="size-10 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold">Relay not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">The relay does not exist or you don't have access.</p>
      </div>
    );
  }

  const relay = data.relay;
  const relayUrl = `wss://${relay.name}.${relay.domain || fallbackDomain}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(relayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-in">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* ─── SIDEBAR ─── */}
        <aside className="lg:w-64 shrink-0 space-y-4">
          {/* Relay identity card */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {relay.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h1 className="font-bold truncate">{relay.name}</h1>
                  {relay.status === "running" ? (
                    <Badge variant="secondary" className="gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      <span className="size-1.5 rounded-full bg-emerald-400" /> Online
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">{relay.status}</Badge>
                  )}
                </div>
              </div>
              <div
                className="flex items-center gap-2 rounded-md border border-border/50 px-2.5 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={copyUrl}
              >
                <span className="flex-1 font-mono text-[11px] text-muted-foreground truncate">{relayUrl}</span>
                {copied ? <Check className="size-3 text-emerald-400 shrink-0" /> : <Copy className="size-3 text-muted-foreground shrink-0" />}
              </div>
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" asChild>
                <Link to={`/relays/${slug}`}><Eye className="size-3" /> View Public Page</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Navigation */}
          <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                  section === item.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  item.id === "danger" && section === item.id && "bg-destructive/10 text-destructive",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ─── MAIN CONTENT ─── */}
        <main className="flex-1 min-w-0">
          {section === "general" && <GeneralSection relay={relay} onUpdate={onUpdate} />}
          {section === "access" && <AccessSection relay={relay} onUpdate={onUpdate} />}
          {section === "team" && <TeamSection relay={relay} onUpdate={onUpdate} />}
          {section === "networking" && <NetworkingSection relay={relay} onUpdate={onUpdate} />}
          {section === "billing" && <BillingSection relay={relay} onUpdate={onUpdate} />}
          {section === "danger" && <DangerSection relay={relay} onDelete={() => navigate("/")} />}
        </main>
      </div>
    </div>
  );
}

// ─── REUSABLE: Setting row with switch ───
function SettingRow({ label, description, checked, onToggle }: {
  label: string; description: string; checked: boolean; onToggle: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} />
    </div>
  );
}

// ─── REUSABLE: Collapsible list section ───
function CollapsibleList({ title, count, icon, children }: {
  title: string; count: number; icon: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(count > 0);
  return (
    <div className="rounded-lg border border-border/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        <Badge variant="secondary" className="text-[10px] px-1.5">{count}</Badge>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="border-t border-border/50 p-4">{children}</div>}
    </div>
  );
}

// ─── REUSABLE: Inline list manager (used inside CollapsibleList) ───
function InlineListManager({ items, relayId, listType, fieldName, placeholder, onUpdate }: {
  items: { id: string; value: string }[];
  relayId: string;
  listType: string;
  fieldName: string;
  placeholder: string;
  onUpdate: () => void;
}) {
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    try {
      await api.post(`/relays/${relayId}/${listType}`, { [fieldName]: newValue.trim() });
      setNewValue("");
      toast.success("Added");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await api.delete(`/relays/${relayId}/${listType}`, { id });
      toast.success("Removed");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="font-mono text-xs h-8"
        />
        <Button size="sm" onClick={handleAdd} disabled={adding || !newValue.trim()} className="gap-1 shrink-0 h-8 px-3">
          {adding ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
          Add
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2 text-center">Empty</p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="group flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5">
              <span className="flex-1 truncate font-mono text-xs">{item.value}</span>
              <button onClick={() => handleRemove(item.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GENERAL SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function GeneralSection({ relay, onUpdate }: { relay: RelayFull; onUpdate: () => void }) {
  const [details, setDetails] = useState(relay.details || "");
  const [bannerImage, setBannerImage] = useState(relay.banner_image || "");
  const [profileImage, setProfileImage] = useState(relay.profile_image || "");
  const [kindDesc, setKindDesc] = useState(relay.relay_kind_description || "");
  const [listed, setListed] = useState(relay.listed_in_directory);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDetails(relay.details || "");
    setBannerImage(relay.banner_image || "");
    setProfileImage(relay.profile_image || "");
    setKindDesc(relay.relay_kind_description || "");
    setListed(relay.listed_in_directory);
  }, [relay.details, relay.banner_image, relay.profile_image, relay.relay_kind_description, relay.listed_in_directory]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/relays/${relay.id}/settings`, {
        details,
        banner_image: bannerImage,
        profile_image: profileImage,
        relay_kind_description: kindDesc,
        listed_in_directory: listed,
      });
      toast.success("Profile saved");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">General</h2>
        <p className="text-sm text-muted-foreground">Public profile and directory settings.</p>
      </div>

      {/* Visibility */}
      <Card>
        <CardContent className="p-4">
          <SettingRow
            label="Listed in Directory"
            description="Show this relay in the public relay directory"
            checked={listed}
            onToggle={setListed}
          />
        </CardContent>
      </Card>

      {/* Profile fields */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="details" className="text-xs font-medium text-muted-foreground">Description</Label>
            <Textarea
              id="details"
              placeholder="Describe your relay..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kindDesc" className="text-xs font-medium text-muted-foreground">Relay Type Label</Label>
            <Input
              id="kindDesc"
              placeholder="e.g. Community Relay, Private Relay"
              value={kindDesc}
              onChange={(e) => setKindDesc(e.target.value)}
              className="text-sm"
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profileImg" className="text-xs font-medium text-muted-foreground">Profile Image URL</Label>
              <Input
                id="profileImg"
                placeholder="https://..."
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                className="text-sm"
              />
              {profileImage && (
                <div className="mt-1.5 size-16 overflow-hidden rounded-lg border border-border/50">
                  <img src={profileImage} alt="Profile" className="size-full object-cover" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bannerImg" className="text-xs font-medium text-muted-foreground">Banner Image URL</Label>
              <Input
                id="bannerImg"
                placeholder="https://..."
                value={bannerImage}
                onChange={(e) => setBannerImage(e.target.value)}
                className="text-sm"
              />
              {bannerImage && (
                <div className="mt-1.5 h-16 overflow-hidden rounded-lg border border-border/50">
                  <img src={bannerImage} alt="Banner" className="size-full object-cover" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save Changes
      </Button>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACCESS CONTROL SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AccessSection({ relay, onUpdate }: { relay: RelayFull; onUpdate: () => void }) {
  const [allow, setAllow] = useState(relay.default_message_policy);
  const [authRequired, setAuthRequired] = useState(relay.auth_required);
  const [allowTagged, setAllowTagged] = useState(relay.allow_tagged);
  const [allowGiftwrap, setAllowGiftwrap] = useState(relay.allow_giftwrap);
  const [allowKeywordPubkey, setAllowKeywordPubkey] = useState(relay.allow_keyword_pubkey);

  useEffect(() => {
    setAllow(relay.default_message_policy);
    setAuthRequired(relay.auth_required);
    setAllowTagged(relay.allow_tagged);
    setAllowGiftwrap(relay.allow_giftwrap);
    setAllowKeywordPubkey(relay.allow_keyword_pubkey);
  }, [relay.default_message_policy, relay.auth_required, relay.allow_tagged, relay.allow_giftwrap, relay.allow_keyword_pubkey]);

  const toggle = async (key: string, value: boolean, setter: (v: boolean) => void) => {
    try {
      await api.patch(`/relays/${relay.id}/settings`, { [key]: value });
      setter(value);
      toast.success("Updated");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  const allowPubkeys = relay.allow_list?.list_pubkeys ?? [];
  const allowKeywords = relay.allow_list?.list_keywords ?? [];
  const allowKinds = relay.allow_list?.list_kinds ?? [];
  const blockPubkeys = relay.block_list?.list_pubkeys ?? [];
  const blockKeywords = relay.block_list?.list_keywords ?? [];
  const blockKinds = relay.block_list?.list_kinds ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Access Control</h2>
        <p className="text-sm text-muted-foreground">Manage who can read and write to your relay.</p>
      </div>

      {/* Policy toggles */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Policy</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border/50">
          <SettingRow
            label={allow ? "Allow by default" : "Block by default"}
            description={allow ? "All events accepted unless explicitly blocked" : "All events blocked unless explicitly allowed"}
            checked={allow}
            onToggle={(v) => toggle("default_message_policy", v, setAllow)}
          />
          <SettingRow
            label="Authentication (NIP-42)"
            description="Require clients to prove identity before connecting"
            checked={authRequired}
            onToggle={(v) => toggle("auth_required", v, setAuthRequired)}
          />
          <SettingRow
            label="Allow Tagged Events"
            description="Accept events from non-members that tag your members"
            checked={allowTagged}
            onToggle={(v) => toggle("allow_tagged", v, setAllowTagged)}
          />
          <SettingRow
            label="Allow Giftwrap (NIP-59)"
            description="Accept giftwrapped events for private messaging"
            checked={allowGiftwrap}
            onToggle={(v) => toggle("allow_giftwrap", v, setAllowGiftwrap)}
          />
          <SettingRow
            label="Keyword AND Pubkey mode"
            description="Require both keyword and pubkey match (instead of either)"
            checked={allowKeywordPubkey}
            onToggle={(v) => toggle("allow_keyword_pubkey", v, setAllowKeywordPubkey)}
          />
        </CardContent>
      </Card>

      {/* Allow lists — only shown in block-by-default mode */}
      {!allow && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Check className="size-4 text-emerald-400" /> Allow Lists
            </CardTitle>
            <CardDescription>Entries that are explicitly permitted.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CollapsibleList title="Pubkeys" count={allowPubkeys.length} icon={<Users className="size-3.5 text-emerald-400" />}>
              <InlineListManager items={allowPubkeys.map(p => ({ id: p.id, value: p.pubkey }))} relayId={relay.id} listType="allowlistpubkey" fieldName="pubkey" placeholder="npub or hex pubkey" onUpdate={onUpdate} />
            </CollapsibleList>
            <CollapsibleList title="Keywords" count={allowKeywords.length} icon={<Hash className="size-3.5 text-emerald-400" />}>
              <InlineListManager items={allowKeywords.map(k => ({ id: k.id, value: k.keyword }))} relayId={relay.id} listType="allowlistkeyword" fieldName="keyword" placeholder="keyword" onUpdate={onUpdate} />
            </CollapsibleList>
            <CollapsibleList title="Event Kinds" count={allowKinds.length} icon={<FileText className="size-3.5 text-emerald-400" />}>
              <InlineListManager items={allowKinds.map(k => ({ id: k.id, value: String(k.kind) }))} relayId={relay.id} listType="allowlistkind" fieldName="kind" placeholder="Kind number (e.g. 1, 30023)" onUpdate={onUpdate} />
            </CollapsibleList>
          </CardContent>
        </Card>
      )}

      {/* Block lists — always shown */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <X className="size-4 text-destructive" /> Block Lists
          </CardTitle>
          <CardDescription>Entries that are explicitly denied.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CollapsibleList title="Pubkeys" count={blockPubkeys.length} icon={<Users className="size-3.5 text-destructive" />}>
            <InlineListManager items={blockPubkeys.map(p => ({ id: p.id, value: p.pubkey }))} relayId={relay.id} listType="blocklistpubkey" fieldName="pubkey" placeholder="npub or hex pubkey" onUpdate={onUpdate} />
          </CollapsibleList>
          <CollapsibleList title="Keywords" count={blockKeywords.length} icon={<Hash className="size-3.5 text-destructive" />}>
            <InlineListManager items={blockKeywords.map(k => ({ id: k.id, value: k.keyword }))} relayId={relay.id} listType="blocklistkeyword" fieldName="keyword" placeholder="keyword" onUpdate={onUpdate} />
          </CollapsibleList>
          <CollapsibleList title="Event Kinds" count={blockKinds.length} icon={<FileText className="size-3.5 text-destructive" />}>
            <InlineListManager items={blockKinds.map(k => ({ id: k.id, value: String(k.kind) }))} relayId={relay.id} listType="blocklistkind" fieldName="kind" placeholder="Kind number (e.g. 1, 30023)" onUpdate={onUpdate} />
          </CollapsibleList>
        </CardContent>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEAM SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function TeamSection({ relay, onUpdate }: { relay: RelayFull; onUpdate: () => void }) {
  const [newPubkey, setNewPubkey] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newPubkey.trim()) return;
    setAdding(true);
    try {
      await api.post(`/relays/${relay.id}/moderators`, { pubkey: newPubkey.trim() });
      setNewPubkey("");
      toast.success("Moderator added");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to add moderator");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (modId: string) => {
    try {
      await api.delete(`/relays/${relay.id}/moderators/${modId}`);
      toast.success("Moderator removed");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Team</h2>
        <p className="text-sm text-muted-foreground">Manage who can administer this relay.</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          {/* Owner */}
          <div className="flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2.5">
            <Shield className="size-4 text-muted-foreground shrink-0" />
            <span className="font-mono text-xs truncate flex-1">{relay.owner.pubkey}</span>
            <Badge variant="secondary" className="text-[10px]">Owner</Badge>
          </div>

          {/* Moderators */}
          {relay.moderators.map((mod) => (
            <div key={mod.id} className="group flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2.5">
              <Users className="size-4 text-muted-foreground shrink-0" />
              <span className="font-mono text-xs truncate flex-1">{mod.user.pubkey}</span>
              <Badge variant="outline" className="text-[10px]">Mod</Badge>
              <button onClick={() => handleRemove(mod.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="size-3.5" />
              </button>
            </div>
          ))}

          <Separator className="my-2" />

          {/* Add moderator */}
          <div className="flex gap-2">
            <Input
              placeholder="npub or hex pubkey"
              value={newPubkey}
              onChange={(e) => setNewPubkey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="font-mono text-xs h-8"
            />
            <Button size="sm" onClick={handleAdd} disabled={adding || !newPubkey.trim()} className="gap-1 shrink-0 h-8 px-3">
              {adding ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NETWORKING SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function NetworkingSection({ relay, onUpdate }: { relay: RelayFull; onUpdate: () => void }) {
  const [url, setUrl] = useState("");
  const [direction, setDirection] = useState("both");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!url.trim()) return;
    setAdding(true);
    try {
      await api.post(`/relays/${relay.id}/streams`, { url: url.trim(), direction });
      setUrl("");
      toast.success("Stream added — relay will re-provision");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to add stream");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (streamId: string) => {
    try {
      await api.delete(`/relays/${relay.id}/streams/${streamId}`);
      toast.success("Stream removed");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Networking</h2>
        <p className="text-sm text-muted-foreground">Relay-to-relay streaming and federation.</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Streams</CardTitle>
          <CardDescription>Sync events between your relay and others.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing streams */}
          {relay.streams.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 text-center">No streams configured</p>
          ) : (
            <div className="space-y-2">
              {relay.streams.map((stream) => (
                <div key={stream.id} className="group flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2.5">
                  <ArrowUpDown className="size-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs truncate">{stream.url}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{stream.direction}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{stream.status || "pending"}</Badge>
                  <button onClick={() => handleRemove(stream.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Add stream form */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Relay URL</Label>
              <Input
                placeholder="wss://relay.example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="font-mono text-xs h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Direction</Label>
              <div className="flex gap-1.5">
                {["up", "down", "both"].map((d) => (
                  <Button
                    key={d}
                    variant={direction === d ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDirection(d)}
                    className="capitalize h-7 px-3 text-xs"
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>
            <Button size="sm" onClick={handleAdd} disabled={adding || !url.trim()} className="gap-1">
              {adding ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
              Add Stream
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BILLING SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function BillingSection({ relay, onUpdate }: { relay: RelayFull; onUpdate: () => void }) {
  const [payRequired, setPayRequired] = useState(relay.payment_required);
  const [amount, setAmount] = useState(relay.payment_amount.toString());
  const [premiumAmount, setPremiumAmount] = useState(relay.payment_premium_amount.toString());
  const [nip05Amount, setNip05Amount] = useState(relay.nip05_payment_amount.toString());
  const [requestPayment, setRequestPayment] = useState(relay.request_payment ?? false);
  const [requestAmount, setRequestAmount] = useState((relay.request_payment_amount ?? 1000).toString());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPayRequired(relay.payment_required);
    setAmount(relay.payment_amount.toString());
    setPremiumAmount(relay.payment_premium_amount.toString());
    setNip05Amount(relay.nip05_payment_amount.toString());
    setRequestPayment(relay.request_payment ?? false);
    setRequestAmount((relay.request_payment_amount ?? 1000).toString());
  }, [relay.payment_required, relay.payment_amount, relay.payment_premium_amount, relay.nip05_payment_amount, relay.request_payment, relay.request_payment_amount]);

  const togglePayment = async (key: string, value: boolean, setter: (v: boolean) => void) => {
    try {
      await api.patch(`/relays/${relay.id}/settings`, { [key]: value });
      setter(value);
      toast.success("Updated");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/relays/${relay.id}/settings`, {
        payment_amount: parseInt(amount) || 0,
        payment_premium_amount: parseInt(premiumAmount) || 0,
        nip05_payment_amount: parseInt(nip05Amount) || 0,
        request_payment_amount: parseInt(requestAmount) || 0,
      });
      toast.success("Billing settings saved");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Billing</h2>
        <p className="text-sm text-muted-foreground">Lightning payment settings for relay access.</p>
      </div>

      {/* Toggles */}
      <Card>
        <CardContent className="p-4 divide-y divide-border/50">
          <SettingRow
            label="Require Payment for Access"
            description="Users must pay to get their pubkey on the allow list"
            checked={payRequired}
            onToggle={(v) => togglePayment("payment_required", v, setPayRequired)}
          />
          <SettingRow
            label="Request Payment (NIP-XX)"
            description="Suggest a payment to clients connecting to this relay"
            checked={requestPayment}
            onToggle={(v) => togglePayment("request_payment", v, setRequestPayment)}
          />
        </CardContent>
      </Card>

      {/* Amounts */}
      {(payRequired || requestPayment) && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Amounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {payRequired && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Standard (sats)</Label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Premium (sats)</Label>
                    <Input type="number" value={premiumAmount} onChange={(e) => setPremiumAmount(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">NIP-05 Registration (sats)</Label>
                  <Input type="number" value={nip05Amount} onChange={(e) => setNip05Amount(e.target.value)} className="h-8 text-sm" />
                </div>
              </>
            )}
            {requestPayment && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Request Payment Amount (sats)</Label>
                <Input type="number" value={requestAmount} onChange={(e) => setRequestAmount(e.target.value)} className="h-8 text-sm" />
              </div>
            )}
            <Button onClick={handleSave} disabled={saving} className="gap-2" size="sm">
              {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
              Save Amounts
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DANGER SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function DangerSection({ relay, onDelete }: { relay: RelayFull; onDelete: () => void }) {
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmName !== relay.name) return;
    setDeleting(true);
    try {
      await api.delete(`/relays/${relay.id}`);
      toast.success("Relay deleted");
      onDelete();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">Irreversible actions.</p>
      </div>

      <Card className="border-destructive/30">
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-destructive">Delete Relay</p>
            <p className="text-xs text-muted-foreground mt-1">
              Permanently delete this relay and all associated data. This cannot be undone.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Type <span className="font-mono font-bold text-foreground">{relay.name}</span> to confirm
            </Label>
            <Input
              placeholder={relay.name}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={confirmName !== relay.name || deleting}
            className="gap-1.5"
          >
            {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
            Delete Relay Permanently
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
