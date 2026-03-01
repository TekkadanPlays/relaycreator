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
  AtSign, Trash2, Check, AlertCircle, Loader2, Copy, Pencil, X, Shield,
  Clock, CheckCircle2, XCircle, KeyRound,
} from "@/lib/icons";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Nip05Entry {
  id: string;
  name: string;
  domain: string;
  pubkey: string;
  relayUrls: { id: string; url: string }[];
}

interface PermRequest {
  id: string;
  type: string;
  status: string;
  reason: string | null;
  created_at: string;
  decided_at: string | null;
  decision_note: string | null;
}

interface Nip05State {
  user: User | null;
  domain: string;
  nip05s: Nip05Entry[];
  allNip05s: Nip05Entry[];
  loading: boolean;
  // Request form
  requestName: string;
  requesting: boolean;
  requestError: string;
  // My permission requests
  myRequests: PermRequest[];
  myRequestsLoading: boolean;
  // Admin assign form
  assignName: string;
  assignPubkey: string;
  assignRelayUrl: string;
  assignRelayUrls: string[];
  assigning: boolean;
  assignError: string;
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
      requestName: "",
      requesting: false,
      requestError: "",
      myRequests: [],
      myRequestsLoading: false,
      assignName: "",
      assignPubkey: "",
      assignRelayUrl: "",
      assignRelayUrls: [],
      assigning: false,
      assignError: "",
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
    this.setState({ loading: true, myRequestsLoading: true });
    try {
      const [mine, perms] = await Promise.all([
        api.get<{ nip05s: Nip05Entry[]; domain: string }>("/nip05/mine"),
        api.get<{ permissions: any[]; requests: PermRequest[] }>("/permissions/mine"),
      ]);

      const state: Partial<Nip05State> = {
        nip05s: mine?.nip05s || [],
        domain: mine?.domain || "",
        myRequests: (perms?.requests || []).filter((r) => r.type === "nip05"),
        loading: false,
        myRequestsLoading: false,
      };

      // If admin, also load all entries
      if (this.state.user?.admin) {
        const all = await api.get<{ nip05s: Nip05Entry[]; domain: string }>("/nip05");
        state.allNip05s = all?.nip05s || [];
      }

      this.setState(state as Nip05State);
    } catch {
      this.setState({ loading: false, myRequestsLoading: false });
    }
  }

  // ─── Request a NIP-05 username ─────────────────────────────────────────────

  private handleRequest = async () => {
    const { requestName } = this.state;
    if (!requestName.trim()) {
      this.setState({ requestError: "Username is required" });
      return;
    }

    this.setState({ requesting: true, requestError: "" });
    try {
      await api.post("/permissions/request", { type: "nip05", reason: requestName.trim() });
      this.setState({ requestName: "", requesting: false });
      this.loadData();
    } catch (err: any) {
      this.setState({ requesting: false, requestError: err?.message || "Failed to submit request" });
    }
  };

  // ─── Admin assign ──────────────────────────────────────────────────────────

  private handleAdminAssign = async () => {
    const { assignName, assignPubkey, assignRelayUrls } = this.state;
    if (!assignName.trim() || !assignPubkey.trim()) {
      this.setState({ assignError: "Name and pubkey are required" });
      return;
    }

    this.setState({ assigning: true, assignError: "" });
    try {
      await api.post("/nip05/admin/assign", {
        name: assignName.trim(),
        pubkey: assignPubkey.trim(),
        relayUrls: assignRelayUrls,
      });
      this.setState({ assignName: "", assignPubkey: "", assignRelayUrls: [], assignRelayUrl: "", assigning: false });
      this.loadData();
    } catch (err: any) {
      this.setState({ assigning: false, assignError: err?.message || "Failed to assign" });
    }
  };

  private addAssignRelayUrl = () => {
    const { assignRelayUrl, assignRelayUrls } = this.state;
    const url = assignRelayUrl.trim();
    if (url && url.startsWith("wss://") && !assignRelayUrls.includes(url)) {
      this.setState({ assignRelayUrls: [...assignRelayUrls, url], assignRelayUrl: "" });
    }
  };

  // ─── Edit ──────────────────────────────────────────────────────────────────

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

  private addEditRelayUrl = () => {
    const { editRelayInput, editRelayUrls } = this.state;
    const url = editRelayInput.trim();
    if (url && url.startsWith("wss://") && !editRelayUrls.includes(url)) {
      this.setState({ editRelayUrls: [...editRelayUrls, url], editRelayInput: "" });
    }
  };

  // ─── Delete ────────────────────────────────────────────────────────────────

  private handleDelete = async (id: string) => {
    this.setState({ deletingId: id });
    try {
      await api.delete(`/nip05/${id}`);
      this.loadData();
    } catch { /* ignore */ }
    this.setState({ deletingId: null });
  };

  // ─── Copy ──────────────────────────────────────────────────────────────────

  private copyNip05 = (entry: Nip05Entry) => {
    const addr = `${entry.name}@${entry.domain}`;
    navigator.clipboard.writeText(addr).then(() => {
      this.setState({ copiedId: entry.id });
      setTimeout(() => this.setState({ copiedId: null }), 2000);
    });
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  render() {
    const { user, domain, nip05s, allNip05s, loading, requestName, requesting, requestError, myRequests, assignName, assignPubkey, assignRelayUrl, assignRelayUrls, assigning, assignError } = this.state;

    if (!user) {
      return createElement("div", { className: "flex items-center justify-center min-h-[60vh]" },
        createElement("div", { className: "text-center space-y-3" },
          createElement(AtSign, { className: "size-12 text-muted-foreground mx-auto" }),
          createElement("h2", { className: "text-lg font-semibold" }, "Not signed in"),
          createElement("p", { className: "text-sm text-muted-foreground" }, "Sign in to manage your NIP-05 identity."),
        ),
      );
    }

    const pendingRequests = myRequests.filter((r) => r.status === "pending");
    const pastRequests = myRequests.filter((r) => r.status !== "pending");
    const hasPending = pendingRequests.length > 0;

    return createElement("div", { className: "max-w-3xl mx-auto space-y-6 animate-in" },

      // Header
      createElement("div", null,
        createElement("h1", { className: "text-2xl font-bold tracking-tight" }, "NIP-05 Identity"),
        createElement("p", { className: "text-sm text-muted-foreground mt-1" },
          `Request a verified identity at ${domain || "..."}`,
        ),
      ),

      // My active NIP-05s
      nip05s.length > 0
        ? createElement("div", { className: "space-y-3" },
            createElement("h2", { className: "text-sm font-semibold text-muted-foreground" }, "Your NIP-05 Identities"),
            ...nip05s.map((entry) => this.renderEntry(entry, true)),
          )
        : null,

      // Pending requests
      hasPending
        ? createElement("div", { className: "space-y-3" },
            createElement("h2", { className: "text-sm font-semibold text-muted-foreground" }, "Pending Requests"),
            ...pendingRequests.map((r) =>
              createElement(Card, { key: r.id, className: "border-border/50 border-dashed" },
                createElement(CardContent, { className: "p-4" },
                  createElement("div", { className: "flex items-center justify-between" },
                    createElement("div", { className: "flex items-center gap-2" },
                      createElement(AtSign, { className: "size-4 text-primary" }),
                      createElement("span", { className: "text-sm font-medium text-primary" }, r.reason || "?"),
                      createElement("span", { className: "text-xs text-muted-foreground" }, `@${domain}`),
                    ),
                    createElement(Badge, { variant: "secondary", className: "text-[10px] gap-1" },
                      createElement(Clock, { className: "size-2.5" }), "Awaiting admin approval",
                    ),
                  ),
                  createElement("p", { className: "text-[10px] text-muted-foreground/60 mt-2" },
                    "Requested " + new Date(r.created_at).toLocaleDateString(),
                  ),
                ),
              ),
            ),
          )
        : null,

      // Request form (only if no pending request)
      !hasPending
        ? createElement(Card, { className: "border-border/50" },
            createElement(CardContent, { className: "p-6 space-y-4" },
              createElement("div", { className: "flex items-center gap-2 mb-2" },
                createElement(KeyRound, { className: "size-4 text-primary" }),
                createElement("h2", { className: "text-sm font-semibold" }, "Request a NIP-05 Username"),
              ),
              createElement("p", { className: "text-xs text-muted-foreground" },
                "Choose a username to request. An administrator will review and approve or deny your request.",
              ),

              createElement("div", { className: "space-y-2" },
                createElement(Label, null, "Username"),
                createElement("div", { className: "flex items-center gap-2" },
                  createElement(Input, {
                    placeholder: "alice",
                    value: requestName,
                    onInput: (e: Event) => this.setState({ requestName: (e.target as HTMLInputElement).value, requestError: "" }),
                    className: "flex-1",
                    onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); this.handleRequest(); } },
                  }),
                  createElement("span", { className: "text-sm text-muted-foreground whitespace-nowrap" }, `@${domain}`),
                ),
              ),

              requestError
                ? createElement("div", { className: "flex items-center gap-2 text-sm text-destructive" },
                    createElement(AlertCircle, { className: "size-4" }),
                    requestError,
                  )
                : null,

              createElement(Button, {
                onClick: this.handleRequest,
                disabled: requesting || !requestName.trim(),
                className: "gap-1.5",
              },
                requesting
                  ? createElement(Loader2, { className: "size-4 animate-spin" })
                  : createElement(KeyRound, { className: "size-4" }),
                "Submit Request",
              ),
            ),
          )
        : null,

      // Past request history
      pastRequests.length > 0
        ? createElement("div", { className: "space-y-3" },
            createElement("h2", { className: "text-sm font-semibold text-muted-foreground" }, "Request History"),
            createElement("div", { className: "rounded-lg border border-border/50 divide-y divide-border/30" },
              ...pastRequests.slice(0, 10).map((r) =>
                createElement("div", { key: r.id, className: "px-4 py-3 flex items-center justify-between" },
                  createElement("div", null,
                    createElement("div", { className: "flex items-center gap-2" },
                      createElement(AtSign, { className: "size-3 text-muted-foreground" }),
                      createElement("span", { className: "text-xs font-medium" }, r.reason || "?"),
                      createElement("span", { className: "text-[10px] text-muted-foreground" }, `@${domain}`),
                    ),
                    r.decision_note
                      ? createElement("p", { className: "text-xs text-muted-foreground mt-1" }, r.decision_note)
                      : null,
                    createElement("p", { className: "text-[10px] text-muted-foreground/60 mt-1" },
                      r.decided_at ? new Date(r.decided_at).toLocaleDateString() : "",
                    ),
                  ),
                  r.status === "approved"
                    ? createElement(Badge, { className: "text-[10px] gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
                        createElement(CheckCircle2, { className: "size-2.5" }), "Approved",
                      )
                    : createElement(Badge, { variant: "destructive", className: "text-[10px] gap-1" },
                        createElement(XCircle, { className: "size-2.5" }), "Denied",
                      ),
                ),
              ),
            ),
          )
        : null,

      loading
        ? createElement("div", { className: "flex justify-center py-8" },
            createElement(Loader2, { className: "size-6 animate-spin text-muted-foreground" }),
          )
        : !nip05s.length && !hasPending && !pastRequests.length
          ? createElement("div", { className: "py-4 text-center text-sm text-muted-foreground" },
              "You don't have any NIP-05 identities yet. Request one above!",
            )
          : null,

      // Admin section: direct assign
      user.admin
        ? createElement("div", { className: "space-y-3" },
            createElement(Separator, null),
            createElement(Card, { className: "border-border/50" },
              createElement(CardContent, { className: "p-6 space-y-4" },
                createElement("div", { className: "flex items-center gap-2 mb-2" },
                  createElement(Shield, { className: "size-4 text-primary" }),
                  createElement("h2", { className: "text-sm font-semibold" }, "Admin: Direct Assign"),
                ),
                createElement("p", { className: "text-xs text-muted-foreground" },
                  "Assign a NIP-05 identity directly to any pubkey, bypassing the request flow.",
                ),

                createElement("div", { className: "space-y-2" },
                  createElement(Label, null, "Username"),
                  createElement("div", { className: "flex items-center gap-2" },
                    createElement(Input, {
                      placeholder: "alice",
                      value: assignName,
                      onInput: (e: Event) => this.setState({ assignName: (e.target as HTMLInputElement).value, assignError: "" }),
                      className: "flex-1",
                    }),
                    createElement("span", { className: "text-sm text-muted-foreground whitespace-nowrap" }, `@${domain}`),
                  ),
                ),

                createElement("div", { className: "space-y-2" },
                  createElement(Label, null, "Pubkey (hex or npub)"),
                  createElement(Input, {
                    placeholder: "npub1... or hex pubkey",
                    value: assignPubkey,
                    onInput: (e: Event) => this.setState({ assignPubkey: (e.target as HTMLInputElement).value }),
                    className: "font-mono text-xs",
                  }),
                ),

                createElement("div", { className: "space-y-2" },
                  createElement(Label, null, "Relay URLs (optional)"),
                  ...assignRelayUrls.map((url, i) =>
                    createElement("div", { key: i, className: "flex items-center gap-2" },
                      createElement("span", { className: "text-xs font-mono text-muted-foreground flex-1 truncate" }, url),
                      createElement("button", {
                        className: "text-destructive hover:text-destructive/80 p-1 cursor-pointer",
                        onClick: () => this.setState({ assignRelayUrls: assignRelayUrls.filter((_, idx) => idx !== i) }),
                      }, createElement(X, { className: "size-3" })),
                    ),
                  ),
                  createElement("div", { className: "flex gap-2" },
                    createElement(Input, {
                      placeholder: "wss://relay.example.com",
                      value: assignRelayUrl,
                      onInput: (e: Event) => this.setState({ assignRelayUrl: (e.target as HTMLInputElement).value }),
                      className: "flex-1 font-mono text-xs",
                      onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); this.addAssignRelayUrl(); } },
                    }),
                    createElement(Button, { size: "sm", variant: "outline", onClick: this.addAssignRelayUrl }, "Add"),
                  ),
                ),

                assignError
                  ? createElement("div", { className: "flex items-center gap-2 text-sm text-destructive" },
                      createElement(AlertCircle, { className: "size-4" }),
                      assignError,
                    )
                  : null,

                createElement(Button, {
                  onClick: this.handleAdminAssign,
                  disabled: assigning || !assignName.trim() || !assignPubkey.trim(),
                  className: "gap-1.5",
                },
                  assigning ? createElement(Loader2, { className: "size-4 animate-spin" }) : createElement(Shield, { className: "size-4" }),
                  "Assign NIP-05",
                ),
              ),
            ),
          )
        : null,

      // Admin view: all entries
      user.admin && allNip05s.length > 0
        ? createElement("div", { className: "space-y-3" },
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
