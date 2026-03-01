import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { api } from "../lib/api";
import { authStore, type User } from "../stores/auth";
import { Card, CardContent } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { Badge } from "@/ui/Badge";
import { Input } from "@/ui/Input";
import { Label } from "@/ui/Label";
import { Separator } from "@/ui/Separator";
import {
  AtSign, Plus, Trash2, Check, AlertCircle, Loader2, Copy, Pencil, X, Shield,
} from "@/lib/icons";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Nip05Entry {
  id: string;
  name: string;
  domain: string;
  pubkey: string;
  relayUrls: { id: string; url: string }[];
}

interface Nip05State {
  user: User | null;
  domain: string;
  nip05s: Nip05Entry[];
  allNip05s: Nip05Entry[];
  loading: boolean;
  // Create form
  newName: string;
  newPubkey: string;
  newRelayUrl: string;
  newRelayUrls: string[];
  creating: boolean;
  createError: string;
  // Edit state
  editingId: string | null;
  editRelayUrls: string[];
  editPubkey: string;
  editRelayInput: string;
  saving: boolean;
  // Delete
  deletingId: string | null;
  // Copy
  copiedId: string | null;
}

export default class Nip05 extends Component<{}, Nip05State> {
  declare state: Nip05State;
  private unsub: (() => void) | null = null;

  constructor(props: {}) {
    super(props);
    this.state = {
      user: authStore.get().user,
      domain: "",
      nip05s: [],
      allNip05s: [],
      loading: true,
      newName: "",
      newPubkey: "",
      newRelayUrl: "",
      newRelayUrls: [],
      creating: false,
      createError: "",
      editingId: null,
      editRelayUrls: [],
      editPubkey: "",
      editRelayInput: "",
      saving: false,
      deletingId: null,
      copiedId: null,
    };
  }

  componentDidMount() {
    this.unsub = authStore.subscribe((s) => {
      this.setState({ user: s.user });
      if (s.user) this.loadData();
    });
    if (this.state.user) this.loadData();
  }

  componentWillUnmount() {
    this.unsub?.();
  }

  private async loadData() {
    this.setState({ loading: true });
    try {
      const mine = await api.get<{ nip05s: Nip05Entry[]; domain: string }>("/nip05/mine");
      const state: Partial<Nip05State> = {
        nip05s: mine?.nip05s || [],
        domain: mine?.domain || "",
        loading: false,
      };

      // If admin, also load all entries
      if (this.state.user?.admin) {
        const all = await api.get<{ nip05s: Nip05Entry[]; domain: string }>("/nip05");
        state.allNip05s = all?.nip05s || [];
      }

      this.setState(state as Nip05State);
    } catch {
      this.setState({ loading: false });
    }
  }

  private handleCreate = async () => {
    const { newName, newPubkey, newRelayUrls, user } = this.state;
    if (!newName.trim()) {
      this.setState({ createError: "Name is required" });
      return;
    }

    this.setState({ creating: true, createError: "" });
    try {
      const body: any = { name: newName.trim(), relayUrls: newRelayUrls };
      // If admin provided a pubkey, include it
      if (newPubkey.trim() && user?.admin) {
        body.pubkey = newPubkey.trim();
      }

      await api.post("/nip05", body);
      this.setState({ newName: "", newPubkey: "", newRelayUrls: [], newRelayUrl: "", creating: false });
      this.loadData();
    } catch (err: any) {
      const msg = err?.message || "Failed to create NIP-05";
      this.setState({ creating: false, createError: msg });
    }
  };

  private handleAdminAssign = async () => {
    const { newName, newPubkey, newRelayUrls } = this.state;
    if (!newName.trim() || !newPubkey.trim()) {
      this.setState({ createError: "Name and pubkey are required for admin assign" });
      return;
    }

    this.setState({ creating: true, createError: "" });
    try {
      await api.post("/nip05/admin/assign", {
        name: newName.trim(),
        pubkey: newPubkey.trim(),
        relayUrls: newRelayUrls,
      });
      this.setState({ newName: "", newPubkey: "", newRelayUrls: [], newRelayUrl: "", creating: false });
      this.loadData();
    } catch (err: any) {
      const msg = err?.message || "Failed to assign NIP-05";
      this.setState({ creating: false, createError: msg });
    }
  };

  private startEdit = (entry: Nip05Entry) => {
    this.setState({
      editingId: entry.id,
      editRelayUrls: entry.relayUrls.map((r) => r.url),
      editPubkey: entry.pubkey,
      editRelayInput: "",
    });
  };

  private cancelEdit = () => {
    this.setState({ editingId: null, editRelayUrls: [], editPubkey: "", editRelayInput: "" });
  };

  private saveEdit = async () => {
    const { editingId, editRelayUrls, editPubkey } = this.state;
    if (!editingId) return;

    this.setState({ saving: true });
    try {
      await api.put(`/nip05/${editingId}`, { relayUrls: editRelayUrls, pubkey: editPubkey });
      this.setState({ saving: false, editingId: null });
      this.loadData();
    } catch {
      this.setState({ saving: false });
    }
  };

  private handleDelete = async (id: string) => {
    this.setState({ deletingId: id });
    try {
      await api.delete(`/nip05/${id}`);
      this.loadData();
    } catch { /* ignore */ }
    this.setState({ deletingId: null });
  };

  private addNewRelayUrl = () => {
    const { newRelayUrl, newRelayUrls } = this.state;
    const url = newRelayUrl.trim();
    if (url && url.startsWith("wss://") && !newRelayUrls.includes(url)) {
      this.setState({ newRelayUrls: [...newRelayUrls, url], newRelayUrl: "" });
    }
  };

  private addEditRelayUrl = () => {
    const { editRelayInput, editRelayUrls } = this.state;
    const url = editRelayInput.trim();
    if (url && url.startsWith("wss://") && !editRelayUrls.includes(url)) {
      this.setState({ editRelayUrls: [...editRelayUrls, url], editRelayInput: "" });
    }
  };

  private copyNip05 = (entry: Nip05Entry) => {
    const addr = `${entry.name}@${entry.domain}`;
    navigator.clipboard.writeText(addr).then(() => {
      this.setState({ copiedId: entry.id });
      setTimeout(() => this.setState({ copiedId: null }), 2000);
    });
  };

  render() {
    const { user, domain, nip05s, allNip05s, loading, newName, newPubkey, newRelayUrl, newRelayUrls, creating, createError, editingId, editRelayUrls, editPubkey, editRelayInput, saving, deletingId, copiedId } = this.state;

    if (!user) {
      return createElement("div", { className: "flex items-center justify-center min-h-[60vh]" },
        createElement("div", { className: "text-center space-y-3" },
          createElement(AtSign, { className: "size-12 text-muted-foreground mx-auto" }),
          createElement("h2", { className: "text-lg font-semibold" }, "Not signed in"),
          createElement("p", { className: "text-sm text-muted-foreground" }, "Sign in to manage your NIP-05 identity."),
        ),
      );
    }

    return createElement("div", { className: "max-w-3xl mx-auto space-y-6 animate-in" },

      // Header
      createElement("div", null,
        createElement("h1", { className: "text-2xl font-bold tracking-tight" }, "NIP-05 Identity"),
        createElement("p", { className: "text-sm text-muted-foreground mt-1" },
          `Manage your NIP-05 verification at ${domain || "..."}`,
        ),
      ),

      // Create form
      createElement(Card, { className: "border-border/50" },
        createElement(CardContent, { className: "p-6 space-y-4" },
          createElement("div", { className: "flex items-center gap-2 mb-2" },
            createElement(Plus, { className: "size-4 text-primary" }),
            createElement("h2", { className: "text-sm font-semibold" }, user.admin ? "Create / Assign NIP-05" : "Register NIP-05"),
          ),

          // Name + domain preview
          createElement("div", { className: "space-y-2" },
            createElement(Label, null, "Username"),
            createElement("div", { className: "flex items-center gap-2" },
              createElement(Input, {
                placeholder: "alice",
                value: newName,
                onInput: (e: Event) => this.setState({ newName: (e.target as HTMLInputElement).value, createError: "" }),
                className: "flex-1",
              }),
              createElement("span", { className: "text-sm text-muted-foreground whitespace-nowrap" }, `@${domain}`),
            ),
          ),

          // Pubkey (admin only, or optional for self)
          user.admin
            ? createElement("div", { className: "space-y-2" },
                createElement(Label, null, "Pubkey (hex or npub) — leave blank for yourself"),
                createElement(Input, {
                  placeholder: "npub1... or hex pubkey",
                  value: newPubkey,
                  onInput: (e: Event) => this.setState({ newPubkey: (e.target as HTMLInputElement).value }),
                  className: "font-mono text-xs",
                }),
              )
            : null,

          // Relay URLs
          createElement("div", { className: "space-y-2" },
            createElement(Label, null, "Relay URLs (optional)"),
            ...newRelayUrls.map((url, i) =>
              createElement("div", { key: i, className: "flex items-center gap-2" },
                createElement("span", { className: "text-xs font-mono text-muted-foreground flex-1 truncate" }, url),
                createElement("button", {
                  className: "text-destructive hover:text-destructive/80 p-1 cursor-pointer",
                  onClick: () => this.setState({ newRelayUrls: newRelayUrls.filter((_, idx) => idx !== i) }),
                }, createElement(X, { className: "size-3" })),
              ),
            ),
            createElement("div", { className: "flex gap-2" },
              createElement(Input, {
                placeholder: "wss://relay.example.com",
                value: newRelayUrl,
                onInput: (e: Event) => this.setState({ newRelayUrl: (e.target as HTMLInputElement).value }),
                className: "flex-1 font-mono text-xs",
                onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); this.addNewRelayUrl(); } },
              }),
              createElement(Button, { size: "sm", variant: "outline", onClick: this.addNewRelayUrl }, "Add"),
            ),
          ),

          createError
            ? createElement("div", { className: "flex items-center gap-2 text-sm text-destructive" },
                createElement(AlertCircle, { className: "size-4" }),
                createError,
              )
            : null,

          createElement("div", { className: "flex gap-2" },
            createElement(Button, {
              onClick: this.handleCreate,
              disabled: creating || !newName.trim(),
            },
              creating ? createElement(Loader2, { className: "size-4 animate-spin mr-2" }) : createElement(Plus, { className: "size-4 mr-2" }),
              "Register",
            ),
            user.admin && newPubkey.trim()
              ? createElement(Button, {
                  variant: "outline",
                  onClick: this.handleAdminAssign,
                  disabled: creating || !newName.trim() || !newPubkey.trim(),
                },
                  createElement(Shield, { className: "size-4 mr-2" }),
                  "Admin Assign",
                )
              : null,
          ),
        ),
      ),

      // My NIP-05s
      nip05s.length > 0
        ? createElement("div", { className: "space-y-3" },
            createElement("h2", { className: "text-sm font-semibold text-muted-foreground" }, "Your NIP-05 Identities"),
            ...nip05s.map((entry) => this.renderEntry(entry, true)),
          )
        : !loading
          ? createElement("div", { className: "py-8 text-center text-sm text-muted-foreground" },
              "You don't have any NIP-05 identities yet.",
            )
          : null,

      loading
        ? createElement("div", { className: "flex justify-center py-8" },
            createElement(Loader2, { className: "size-6 animate-spin text-muted-foreground" }),
          )
        : null,

      // Admin view: all entries
      user.admin && allNip05s.length > 0
        ? createElement("div", { className: "space-y-3" },
            createElement(Separator, null),
            createElement("div", { className: "flex items-center gap-2" },
              createElement(Shield, { className: "size-4 text-primary" }),
              createElement("h2", { className: "text-sm font-semibold" }, `All NIP-05s (${allNip05s.length})`),
            ),
            ...allNip05s.map((entry) => this.renderEntry(entry, false)),
          )
        : null,
    );
  }

  private renderEntry(entry: Nip05Entry, isOwner: boolean) {
    const { editingId, editRelayUrls, editPubkey, editRelayInput, saving, deletingId, copiedId, user } = this.state;
    const isEditing = editingId === entry.id;
    const isDeleting = deletingId === entry.id;
    const isCopied = copiedId === entry.id;
    const canEdit = isOwner || user?.admin;

    return createElement(Card, { key: entry.id, className: "border-border/50" },
      createElement(CardContent, { className: "p-4 space-y-3" },

        // Header row
        createElement("div", { className: "flex items-center justify-between" },
          createElement("div", { className: "flex items-center gap-2 min-w-0" },
            createElement(AtSign, { className: "size-4 text-primary shrink-0" }),
            createElement("span", { className: "font-medium truncate" }, `${entry.name}@${entry.domain}`),
          ),
          createElement("div", { className: "flex items-center gap-1 shrink-0" },
            createElement("button", {
              className: "p-1.5 rounded hover:bg-muted transition-colors cursor-pointer",
              onClick: () => this.copyNip05(entry),
              title: "Copy NIP-05 address",
            }, isCopied
              ? createElement(Check, { className: "size-3.5 text-emerald-400" })
              : createElement(Copy, { className: "size-3.5 text-muted-foreground" }),
            ),
            canEdit && !isEditing
              ? createElement("button", {
                  className: "p-1.5 rounded hover:bg-muted transition-colors cursor-pointer",
                  onClick: () => this.startEdit(entry),
                  title: "Edit",
                }, createElement(Pencil, { className: "size-3.5 text-muted-foreground" }))
              : null,
            canEdit
              ? createElement("button", {
                  className: "p-1.5 rounded hover:bg-destructive/10 transition-colors cursor-pointer",
                  onClick: () => this.handleDelete(entry.id),
                  disabled: isDeleting,
                  title: "Delete",
                }, isDeleting
                  ? createElement(Loader2, { className: "size-3.5 animate-spin text-destructive" })
                  : createElement(Trash2, { className: "size-3.5 text-destructive" }),
                )
              : null,
          ),
        ),

        // Pubkey
        !isEditing
          ? createElement("div", null,
              createElement("p", { className: "text-[10px] uppercase text-muted-foreground/60 mb-0.5" }, "Pubkey"),
              createElement("p", { className: "text-xs font-mono text-muted-foreground break-all" }, entry.pubkey),
            )
          : createElement("div", { className: "space-y-1" },
              createElement(Label, { className: "text-xs" }, "Pubkey"),
              createElement(Input, {
                value: editPubkey,
                onInput: (e: Event) => this.setState({ editPubkey: (e.target as HTMLInputElement).value }),
                className: "font-mono text-xs",
                disabled: !user?.admin,
              }),
            ),

        // Relay URLs
        !isEditing
          ? entry.relayUrls.length > 0
            ? createElement("div", null,
                createElement("p", { className: "text-[10px] uppercase text-muted-foreground/60 mb-0.5" }, "Relays"),
                ...entry.relayUrls.map((r) =>
                  createElement("p", { key: r.id, className: "text-xs font-mono text-muted-foreground" }, r.url),
                ),
              )
            : createElement("p", { className: "text-xs text-muted-foreground/40" }, "No relay URLs set")
          : createElement("div", { className: "space-y-2" },
              createElement(Label, { className: "text-xs" }, "Relay URLs"),
              ...editRelayUrls.map((url, i) =>
                createElement("div", { key: i, className: "flex items-center gap-2" },
                  createElement("span", { className: "text-xs font-mono text-muted-foreground flex-1 truncate" }, url),
                  createElement("button", {
                    className: "text-destructive hover:text-destructive/80 p-1 cursor-pointer",
                    onClick: () => this.setState({ editRelayUrls: editRelayUrls.filter((_, idx) => idx !== i) }),
                  }, createElement(X, { className: "size-3" })),
                ),
              ),
              createElement("div", { className: "flex gap-2" },
                createElement(Input, {
                  placeholder: "wss://relay.example.com",
                  value: editRelayInput,
                  onInput: (e: Event) => this.setState({ editRelayInput: (e.target as HTMLInputElement).value }),
                  className: "flex-1 font-mono text-xs",
                  onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); this.addEditRelayUrl(); } },
                }),
                createElement(Button, { size: "sm", variant: "outline", onClick: this.addEditRelayUrl }, "Add"),
              ),
            ),

        // Edit actions
        isEditing
          ? createElement("div", { className: "flex gap-2 pt-1" },
              createElement(Button, { size: "sm", onClick: this.saveEdit, disabled: saving },
                saving ? createElement(Loader2, { className: "size-3 animate-spin mr-1" }) : null,
                "Save",
              ),
              createElement(Button, { size: "sm", variant: "outline", onClick: this.cancelEdit }, "Cancel"),
            )
          : null,
      ),
    );
  }
}
