import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import {
  Globe, Shield, Users, Radio, Zap, Trash2, Loader2, Save,
  Plus, X, Copy, Check, Settings, Lock, Unlock, Tag, Hash,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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

export default function RelaySettings() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["relaySettings", slug],
    queryFn: () => api.get<{ relay: RelayFull }>(`/relays/by-name/${slug}`),
    enabled: !!slug && !!user,
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-up">
        <div className="rounded-2xl bg-muted/30 p-6 mb-6">
          <Lock className="size-12 text-muted-foreground/30" />
        </div>
        <h2 className="text-2xl font-bold">Sign in required</h2>
        <p className="mt-2 text-muted-foreground">Sign in to manage your relay settings.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data?.relay) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-up">
        <div className="rounded-2xl bg-muted/30 p-6 mb-6">
          <Globe className="size-12 text-muted-foreground/30" />
        </div>
        <h2 className="text-2xl font-bold">Relay not found</h2>
        <p className="mt-2 text-muted-foreground">The relay does not exist or you don't have access.</p>
      </div>
    );
  }

  const relay = data.relay;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/20 bg-gradient-to-br from-primary/5 via-card/50 to-purple-500/5 p-6 sm:p-8">
        <div className="absolute -top-20 -right-20 size-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-3">
              <Settings className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {relay.name}
              </h1>
              <p className="mt-0.5 font-mono text-sm text-muted-foreground/70">
                wss://{relay.name}.{relay.domain}
              </p>
            </div>
          </div>
          {relay.status === "running" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
              </span>
              Online
            </span>
          ) : (
            <Badge variant="secondary">{relay.status}</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 bg-muted/30 border border-border/20 p-1 h-auto">
          <TabsTrigger value="profile" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none py-2.5"><Globe className="size-3.5 hidden sm:block" /> Profile</TabsTrigger>
          <TabsTrigger value="access" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none py-2.5"><Shield className="size-3.5 hidden sm:block" /> Access</TabsTrigger>
          <TabsTrigger value="moderators" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none py-2.5"><Users className="size-3.5 hidden sm:block" /> Team</TabsTrigger>
          <TabsTrigger value="streams" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none py-2.5"><Radio className="size-3.5 hidden sm:block" /> Streams</TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none py-2.5"><Zap className="size-3.5 hidden sm:block" /> Payments</TabsTrigger>
          <TabsTrigger value="danger" className="gap-1.5 data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive data-[state=active]:shadow-none py-2.5"><Trash2 className="size-3.5 hidden sm:block" /> Danger</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab relay={relay} onUpdate={() => queryClient.invalidateQueries({ queryKey: ["relaySettings", slug] })} />
        </TabsContent>
        <TabsContent value="access">
          <AccessTab relay={relay} onUpdate={() => queryClient.invalidateQueries({ queryKey: ["relaySettings", slug] })} />
        </TabsContent>
        <TabsContent value="moderators">
          <ModeratorsTab relay={relay} onUpdate={() => queryClient.invalidateQueries({ queryKey: ["relaySettings", slug] })} />
        </TabsContent>
        <TabsContent value="streams">
          <StreamsTab relay={relay} onUpdate={() => queryClient.invalidateQueries({ queryKey: ["relaySettings", slug] })} />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab relay={relay} onUpdate={() => queryClient.invalidateQueries({ queryKey: ["relaySettings", slug] })} />
        </TabsContent>
        <TabsContent value="danger">
          <DangerTab relay={relay} onDelete={() => navigate("/")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── PROFILE TAB ───
function ProfileTab({ relay, onUpdate }: { relay: RelayFull; onUpdate: () => void }) {
  const [details, setDetails] = useState(relay.details || "");
  const [bannerImage, setBannerImage] = useState(relay.banner_image || "");
  const [listed, setListed] = useState(relay.listed_in_directory);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDetails(relay.details || "");
    setBannerImage(relay.banner_image || "");
    setListed(relay.listed_in_directory);
  }, [relay.details, relay.banner_image, relay.listed_in_directory]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/relays/${relay.id}/settings`, { details, banner_image: bannerImage, listed_in_directory: listed });
      toast.success("Profile updated");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/20 bg-card/30 backdrop-blur-sm overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <CardHeader>
        <CardTitle>Relay Profile</CardTitle>
        <CardDescription>Configure your relay's public-facing information and directory listing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-xl border border-border/20 bg-muted/20 p-4 transition-colors hover:bg-muted/30">
          <div>
            <p className="font-medium flex items-center gap-2">
              <Globe className="size-4 text-primary" /> Listed in Directory
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">Show this relay in the public relay directory</p>
          </div>
          <Switch checked={listed} onCheckedChange={setListed} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="details">Description</Label>
          <Textarea
            id="details"
            placeholder="Describe your relay..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            className="bg-muted/20 border-border/30 focus:border-primary/40"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="banner">Banner Image URL</Label>
          <Input
            id="banner"
            placeholder="https://example.com/banner.jpg"
            value={bannerImage}
            onChange={(e) => setBannerImage(e.target.value)}
            className="bg-muted/20 border-border/30 focus:border-primary/40"
          />
          {bannerImage && (
            <div className="mt-2 h-32 overflow-hidden rounded-xl border border-border/20">
              <img src={bannerImage} alt="Banner preview" className="size-full object-cover" />
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 border-0 shadow-lg shadow-primary/20">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Profile
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── ACCESS CONTROL TAB ───
function AccessTab({ relay, onUpdate }: { relay: RelayFull; onUpdate: () => void }) {
  const [allow, setAllow] = useState(relay.default_message_policy);
  const [authRequired, setAuthRequired] = useState(relay.auth_required);
  const [allowTagged, setAllowTagged] = useState(relay.allow_tagged);

  useEffect(() => {
    setAllow(relay.default_message_policy);
    setAuthRequired(relay.auth_required);
    setAllowTagged(relay.allow_tagged);
  }, [relay.default_message_policy, relay.auth_required, relay.allow_tagged]);

  const toggleSetting = async (key: string, value: boolean, setter: (v: boolean) => void) => {
    try {
      await api.patch(`/relays/${relay.id}/settings`, { [key]: value });
      setter(value);
      toast.success("Setting updated");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/20 bg-card/30 backdrop-blur-sm overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
        <CardHeader>
          <CardTitle>Access Control Mode</CardTitle>
          <CardDescription>Choose how your relay handles incoming events by default.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-border/20 bg-muted/20 p-4 transition-colors hover:bg-muted/30">
            <div>
              <p className="font-medium flex items-center gap-2">
                {allow ? <Unlock className="size-4 text-amber-400" /> : <Lock className="size-4 text-emerald-400" />}
                {allow ? "Allow by default" : "Block by default"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {allow
                  ? "All events accepted unless explicitly blocked"
                  : "All events blocked unless explicitly allowed"}
              </p>
            </div>
            <Switch checked={allow} onCheckedChange={(v) => toggleSetting("default_message_policy", v, setAllow)} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/20 bg-muted/20 p-4 transition-colors hover:bg-muted/30">
            <div>
              <p className="font-medium flex items-center gap-2">
                <Shield className="size-4 text-blue-400" /> Authentication (NIP-42)
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">Require clients to authenticate before connecting</p>
            </div>
            <Switch checked={authRequired} onCheckedChange={(v) => toggleSetting("auth_required", v, setAuthRequired)} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/20 bg-muted/20 p-4 transition-colors hover:bg-muted/30">
            <div>
              <p className="font-medium flex items-center gap-2">
                <Tag className="size-4 text-purple-400" /> Allow Tagged Events
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">Accept events from non-members if they tag your members</p>
            </div>
            <Switch checked={allowTagged} onCheckedChange={(v) => toggleSetting("allow_tagged", v, setAllowTagged)} />
          </div>
        </CardContent>
      </Card>

      {!allow && (
        <ListManager
          title="Allowed Pubkeys"
          description="Pubkeys that are allowed to post on your relay"
          items={(relay.allow_list?.list_pubkeys ?? []).map((p) => ({ id: p.id, value: p.pubkey }))}
          relayId={relay.id}
          listType="allowlistpubkey"
          fieldName="pubkey"
          placeholder="npub or hex pubkey"
          icon={<Check className="size-4 text-emerald-400" />}
          onUpdate={onUpdate}
        />
      )}

      <ListManager
        title="Blocked Pubkeys"
        description="Pubkeys that are blocked from posting on your relay"
        items={(relay.block_list?.list_pubkeys ?? []).map((p) => ({ id: p.id, value: p.pubkey }))}
        relayId={relay.id}
        listType="blocklistpubkey"
        fieldName="pubkey"
        placeholder="npub or hex pubkey"
        icon={<X className="size-4 text-destructive" />}
        onUpdate={onUpdate}
      />

      {!allow && (
        <ListManager
          title="Allowed Keywords"
          description="Keywords that are allowed in events"
          items={(relay.allow_list?.list_keywords ?? []).map((k) => ({ id: k.id, value: k.keyword }))}
          relayId={relay.id}
          listType="allowlistkeyword"
          fieldName="keyword"
          placeholder="keyword"
          icon={<Hash className="size-4 text-emerald-400" />}
          onUpdate={onUpdate}
        />
      )}

      <ListManager
        title="Blocked Keywords"
        description="Keywords that are blocked from events"
        items={(relay.block_list?.list_keywords ?? []).map((k) => ({ id: k.id, value: k.keyword }))}
        relayId={relay.id}
        listType="blocklistkeyword"
        fieldName="keyword"
        placeholder="keyword"
        icon={<Hash className="size-4 text-destructive" />}
        onUpdate={onUpdate}
      />

      {!allow && (
        <ListManager
          title="Allowed Kinds"
          description="Event kinds that are allowed on your relay"
          items={(relay.allow_list?.list_kinds ?? []).map((k) => ({ id: k.id, value: String(k.kind) }))}
          relayId={relay.id}
          listType="allowlistkind"
          fieldName="kind"
          placeholder="Event kind number (e.g. 1, 30023)"
          icon={<Hash className="size-4 text-emerald-400" />}
          onUpdate={onUpdate}
        />
      )}

      <ListManager
        title="Blocked Kinds"
        description="Event kinds that are blocked from your relay"
        items={(relay.block_list?.list_kinds ?? []).map((k) => ({ id: k.id, value: String(k.kind) }))}
        relayId={relay.id}
        listType="blocklistkind"
        fieldName="kind"
        placeholder="Event kind number (e.g. 1, 30023)"
        icon={<Hash className="size-4 text-destructive" />}
        onUpdate={onUpdate}
      />
    </div>
  );
}

// ─── LIST MANAGER (reusable for pubkeys, keywords, kinds) ───
function ListManager({
  title, description, items, relayId, listType, fieldName, placeholder, icon, onUpdate,
}: {
  title: string;
  description: string;
  items: { id: string; value: string }[];
  relayId: string;
  listType: string;
  fieldName: string;
  placeholder: string;
  icon: React.ReactNode;
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
      toast.success(`Added to ${title.toLowerCase()}`);
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
    <Card className="border-border/20 bg-card/30 backdrop-blur-sm overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="font-mono text-xs bg-muted/20 border-border/30 focus:border-primary/40"
          />
          <Button size="sm" onClick={handleAdd} disabled={adding || !newValue.trim()} className="gap-1 shrink-0 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 border-0">
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground/50 py-6 text-center">No entries yet</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-xl bg-muted/20 border border-border/10 px-3 py-2 transition-colors hover:bg-muted/30">
                {icon}
                <span className="flex-1 truncate font-mono text-xs">{item.value}</span>
                <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(item.id)}>
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── MODERATORS TAB ───
function ModeratorsTab({ relay, onUpdate }: { relay: RelayFull; onUpdate: () => void }) {
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
    <Card className="border-border/20 bg-card/30 backdrop-blur-sm overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
      <CardHeader>
        <CardTitle>Moderators</CardTitle>
        <CardDescription>Moderators can edit access control lists and have posting access by default.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl bg-muted/20 border border-border/10 p-3 transition-colors hover:bg-muted/30">
          <Shield className="size-4 text-primary shrink-0" />
          <span className="font-mono text-sm truncate flex-1">{relay.owner.pubkey.slice(0, 24)}...</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">owner</span>
        </div>

        {relay.moderators.map((mod) => (
          <div key={mod.id} className="flex items-center gap-3 rounded-xl bg-muted/20 border border-border/10 p-3 transition-colors hover:bg-muted/30">
            <Users className="size-4 text-muted-foreground shrink-0" />
            <span className="font-mono text-sm truncate flex-1">{mod.user.pubkey.slice(0, 24)}...</span>
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">mod</span>
            <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(mod.id)}>
              <X className="size-3.5" />
            </Button>
          </div>
        ))}

        <Separator className="opacity-20" />

        <div className="flex gap-2">
          <Input
            placeholder="npub or hex pubkey"
            value={newPubkey}
            onChange={(e) => setNewPubkey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="font-mono text-xs bg-muted/20 border-border/30 focus:border-primary/40"
          />
          <Button size="sm" onClick={handleAdd} disabled={adding || !newPubkey.trim()} className="gap-1 shrink-0 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 border-0">
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── STREAMS TAB ───
function StreamsTab({ relay, onUpdate }: { relay: RelayFull; onUpdate: () => void }) {
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
    <Card className="border-border/20 bg-card/30 backdrop-blur-sm overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      <CardHeader>
        <CardTitle>Streams</CardTitle>
        <CardDescription>Configure relay-to-relay streaming. Streams sync events between your relay and others.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {relay.streams.length === 0 ? (
          <p className="text-sm text-muted-foreground/50 py-6 text-center">No streams configured</p>
        ) : (
          <div className="space-y-2">
            {relay.streams.map((stream) => (
              <div key={stream.id} className="flex items-center gap-3 rounded-xl bg-muted/20 border border-border/10 p-3 transition-colors hover:bg-muted/30">
                <Radio className="size-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs truncate">{stream.url}</p>
                  <p className="text-xs text-muted-foreground/60">Direction: {stream.direction}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{stream.status || "pending"}</span>
                <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(stream.id)}>
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Separator className="opacity-20" />

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Stream URL</Label>
            <Input
              placeholder="wss://relay.example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="font-mono text-xs bg-muted/20 border-border/30 focus:border-primary/40"
            />
          </div>
          <div className="space-y-2">
            <Label>Direction</Label>
            <div className="flex gap-2">
              {["up", "down", "both"].map((d) => (
                <Button
                  key={d}
                  variant={direction === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDirection(d)}
                  className={cn("capitalize", direction === d && "bg-gradient-to-r from-primary to-purple-500 border-0", direction !== d && "border-border/30")}
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={handleAdd} disabled={adding || !url.trim()} className="gap-1 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 border-0">
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add Stream
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── PAYMENTS TAB ───
function PaymentsTab({ relay, onUpdate }: { relay: RelayFull; onUpdate: () => void }) {
  const [payRequired, setPayRequired] = useState(relay.payment_required);
  const [amount, setAmount] = useState(relay.payment_amount.toString());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPayRequired(relay.payment_required);
    setAmount(relay.payment_amount.toString());
  }, [relay.payment_required, relay.payment_amount]);

  const togglePayment = async (value: boolean) => {
    try {
      await api.patch(`/relays/${relay.id}/settings`, { payment_required: value });
      setPayRequired(value);
      toast.success(value ? "Payments enabled" : "Payments disabled");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/relays/${relay.id}/settings`, { payment_amount: parseInt(amount) || 0 });
      toast.success("Payment amount saved");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/20 bg-card/30 backdrop-blur-sm overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
      <CardHeader>
        <CardTitle>Lightning Payments</CardTitle>
        <CardDescription>Require Lightning payments for relay access.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-xl border border-border/20 bg-muted/20 p-4 transition-colors hover:bg-muted/30">
          <div>
            <p className="font-medium flex items-center gap-2">
              <Zap className="size-4 text-amber-400" /> Require Payment
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">Users must pay to access this relay</p>
          </div>
          <Switch checked={payRequired} onCheckedChange={togglePayment} />
        </div>

        {payRequired && (
          <div className="space-y-4 animate-fade-up">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount (sats)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-muted/20 border-border/30 focus:border-primary/40"
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 border-0 shadow-lg shadow-primary/20">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save Amount
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── DANGER TAB ───
function DangerTab({ relay, onDelete }: { relay: RelayFull; onDelete: () => void }) {
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
    <Card className="border-destructive/20 bg-card/30 backdrop-blur-sm overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-destructive/30 to-transparent" />
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
        <CardDescription>Irreversible actions. Proceed with caution.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 space-y-4">
          <div>
            <p className="font-medium text-destructive flex items-center gap-2">
              <Trash2 className="size-4" /> Delete Relay
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              This will permanently delete your relay and all associated data. This action cannot be undone.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">
              Type <span className="font-mono font-bold text-foreground">{relay.name}</span> to confirm
            </Label>
            <Input
              placeholder={relay.name}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="bg-muted/20 border-border/30 focus:border-destructive/40"
            />
          </div>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmName !== relay.name || deleting}
            className="gap-2 shadow-lg shadow-destructive/10"
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Delete Relay Permanently
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
