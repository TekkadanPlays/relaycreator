import { useState } from "react";
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
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Lock className="size-12 text-muted-foreground/30 mb-4" />
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
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Globe className="size-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-bold">Relay not found</h2>
        <p className="mt-2 text-muted-foreground">The relay does not exist or you don't have access.</p>
      </div>
    );
  }

  const relay = data.relay;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Settings className="size-7 text-primary" />
            {relay.name}
          </h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            wss://{relay.name}.{relay.domain}
          </p>
        </div>
        <Badge
          variant={relay.status === "running" ? "default" : "secondary"}
          className={relay.status === "running" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : ""}
        >
          {relay.status}
        </Badge>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="moderators">Team</TabsTrigger>
          <TabsTrigger value="streams">Streams</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="danger">Danger</TabsTrigger>
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
    <Card>
      <CardHeader>
        <CardTitle>Relay Profile</CardTitle>
        <CardDescription>Configure your relay's public-facing information and directory listing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="font-medium">Listed in Directory</p>
            <p className="text-sm text-muted-foreground">Show this relay in the public relay directory</p>
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
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="banner">Banner Image URL</Label>
          <Input
            id="banner"
            placeholder="https://example.com/banner.jpg"
            value={bannerImage}
            onChange={(e) => setBannerImage(e.target.value)}
          />
          {bannerImage && (
            <div className="mt-2 h-32 overflow-hidden rounded-lg border border-border">
              <img src={bannerImage} alt="Banner preview" className="size-full object-cover" />
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
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
      <Card>
        <CardHeader>
          <CardTitle>Access Control Mode</CardTitle>
          <CardDescription>Choose how your relay handles incoming events by default.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium flex items-center gap-2">
                {allow ? <Unlock className="size-4 text-amber-400" /> : <Lock className="size-4 text-emerald-400" />}
                {allow ? "Allow by default" : "Block by default"}
              </p>
              <p className="text-sm text-muted-foreground">
                {allow
                  ? "All events accepted unless explicitly blocked"
                  : "All events blocked unless explicitly allowed"}
              </p>
            </div>
            <Switch checked={allow} onCheckedChange={(v) => toggleSetting("default_message_policy", v, setAllow)} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium flex items-center gap-2">
                <Shield className="size-4" /> Authentication (NIP-42)
              </p>
              <p className="text-sm text-muted-foreground">Require clients to authenticate before connecting</p>
            </div>
            <Switch checked={authRequired} onCheckedChange={(v) => toggleSetting("auth_required", v, setAuthRequired)} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium flex items-center gap-2">
                <Tag className="size-4" /> Allow Tagged Events
              </p>
              <p className="text-sm text-muted-foreground">Accept events from non-members if they tag your members</p>
            </div>
            <Switch checked={allowTagged} onCheckedChange={(v) => toggleSetting("allow_tagged", v, setAllowTagged)} />
          </div>
        </CardContent>
      </Card>

      {!allow && relay.allow_list && (
        <ListManager
          title="Allowed Pubkeys"
          description="Pubkeys that are allowed to post on your relay"
          items={relay.allow_list.list_pubkeys.map((p) => ({ id: p.id, value: p.pubkey }))}
          relayId={relay.id}
          listType="allowlistpubkey"
          fieldName="pubkey"
          placeholder="npub or hex pubkey"
          icon={<Check className="size-4 text-emerald-400" />}
          onUpdate={onUpdate}
        />
      )}

      {relay.block_list && (
        <ListManager
          title="Blocked Pubkeys"
          description="Pubkeys that are blocked from posting on your relay"
          items={relay.block_list.list_pubkeys.map((p) => ({ id: p.id, value: p.pubkey }))}
          relayId={relay.id}
          listType="blocklistpubkey"
          fieldName="pubkey"
          placeholder="npub or hex pubkey"
          icon={<X className="size-4 text-destructive" />}
          onUpdate={onUpdate}
        />
      )}

      {!allow && relay.allow_list && (
        <ListManager
          title="Allowed Keywords"
          description="Keywords that are allowed in events"
          items={relay.allow_list.list_keywords.map((k) => ({ id: k.id, value: k.keyword }))}
          relayId={relay.id}
          listType="allowlistkeyword"
          fieldName="keyword"
          placeholder="keyword"
          icon={<Hash className="size-4 text-emerald-400" />}
          onUpdate={onUpdate}
        />
      )}

      {relay.block_list && (
        <ListManager
          title="Blocked Keywords"
          description="Keywords that are blocked from events"
          items={relay.block_list.list_keywords.map((k) => ({ id: k.id, value: k.keyword }))}
          relayId={relay.id}
          listType="blocklistkeyword"
          fieldName="keyword"
          placeholder="keyword"
          icon={<Hash className="size-4 text-destructive" />}
          onUpdate={onUpdate}
        />
      )}

      {!allow && relay.allow_list && (
        <ListManager
          title="Allowed Kinds"
          description="Event kinds that are allowed on your relay"
          items={relay.allow_list.list_kinds.map((k) => ({ id: k.id, value: String(k.kind) }))}
          relayId={relay.id}
          listType="allowlistkind"
          fieldName="kind"
          placeholder="Event kind number (e.g. 1, 30023)"
          icon={<Hash className="size-4 text-emerald-400" />}
          onUpdate={onUpdate}
        />
      )}

      {relay.block_list && (
        <ListManager
          title="Blocked Kinds"
          description="Event kinds that are blocked from your relay"
          items={relay.block_list.list_kinds.map((k) => ({ id: k.id, value: String(k.kind) }))}
          relayId={relay.id}
          listType="blocklistkind"
          fieldName="kind"
          placeholder="Event kind number (e.g. 1, 30023)"
          icon={<Hash className="size-4 text-destructive" />}
          onUpdate={onUpdate}
        />
      )}
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
    <Card>
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
            className="font-mono text-xs"
          />
          <Button size="sm" onClick={handleAdd} disabled={adding || !newValue.trim()} className="gap-1 shrink-0">
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No entries yet</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
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
    <Card>
      <CardHeader>
        <CardTitle>Moderators</CardTitle>
        <CardDescription>Moderators can edit access control lists and have posting access by default.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <Shield className="size-4 text-primary shrink-0" />
          <span className="font-mono text-sm truncate flex-1">{relay.owner.pubkey.slice(0, 24)}...</span>
          <Badge className="bg-primary/15 text-primary border-primary/30">owner</Badge>
        </div>

        {relay.moderators.map((mod) => (
          <div key={mod.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Users className="size-4 text-muted-foreground shrink-0" />
            <span className="font-mono text-sm truncate flex-1">{mod.user.pubkey.slice(0, 24)}...</span>
            <Badge variant="secondary">mod</Badge>
            <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(mod.id)}>
              <X className="size-3.5" />
            </Button>
          </div>
        ))}

        <Separator />

        <div className="flex gap-2">
          <Input
            placeholder="npub or hex pubkey"
            value={newPubkey}
            onChange={(e) => setNewPubkey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="font-mono text-xs"
          />
          <Button size="sm" onClick={handleAdd} disabled={adding || !newPubkey.trim()} className="gap-1 shrink-0">
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
    <Card>
      <CardHeader>
        <CardTitle>Streams</CardTitle>
        <CardDescription>Configure relay-to-relay streaming. Streams sync events between your relay and others.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {relay.streams.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No streams configured</p>
        ) : (
          <div className="space-y-2">
            {relay.streams.map((stream) => (
              <div key={stream.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <Radio className="size-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs truncate">{stream.url}</p>
                  <p className="text-xs text-muted-foreground">Direction: {stream.direction}</p>
                </div>
                <Badge variant="secondary" className="text-xs">{stream.status || "pending"}</Badge>
                <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(stream.id)}>
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Separator />

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Stream URL</Label>
            <Input
              placeholder="wss://relay.example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="font-mono text-xs"
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
                  className="capitalize"
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={handleAdd} disabled={adding || !url.trim()} className="gap-1">
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
    <Card>
      <CardHeader>
        <CardTitle>Lightning Payments</CardTitle>
        <CardDescription>Require Lightning payments for relay access.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="font-medium flex items-center gap-2">
              <Zap className="size-4 text-amber-400" /> Require Payment
            </p>
            <p className="text-sm text-muted-foreground">Users must pay to access this relay</p>
          </div>
          <Switch checked={payRequired} onCheckedChange={togglePayment} />
        </div>

        {payRequired && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount (sats)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
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
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
        <CardDescription>Irreversible actions. Proceed with caution.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-4">
          <div>
            <p className="font-medium text-destructive">Delete Relay</p>
            <p className="text-sm text-muted-foreground">
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
            />
          </div>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmName !== relay.name || deleting}
            className="gap-2"
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Delete Relay Permanently
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
