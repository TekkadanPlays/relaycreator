import { createElement } from "inferno-create-element";
import { Badge } from "@/ui/Badge";
import { Input } from "@/ui/Input";
import { Label } from "@/ui/Label";
import { Separator } from "@/ui/Separator";
import { Button } from "@/ui/Button";
import {
  Fingerprint, Plus, Trash2, X, Globe, Copy, Check, Search,
} from "@/lib/icons";
import { renderLoading, pubkeyShort } from "./helpers";

export interface Nip05Entry {
  id: string;
  name: string;
  pubkey: string;
  domain: string;
  relayUrls: { id: string; url: string }[];
}

export function renderNip05(
  entries: Nip05Entry[],
  loading: boolean,
  search: string,
  newName: string,
  newPubkey: string,
  newRelays: string,
  adding: boolean,
  copiedId: string | null,
  onSearchChange: (v: string) => void,
  onNameChange: (v: string) => void,
  onPubkeyChange: (v: string) => void,
  onRelaysChange: (v: string) => void,
  onAdd: () => void,
  onDelete: (id: string, label: string) => void,
  onCopy: (id: string, text: string) => void,
) {
  if (loading) return renderLoading();

  const filtered = search
    ? entries.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.pubkey.includes(search.toLowerCase()) ||
        e.domain.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  return createElement("div", { className: "space-y-6" },
    // Header
    createElement("div", { className: "flex items-center justify-between" },
      createElement("div", null,
        createElement("h2", { className: "text-lg font-semibold" }, "NIP-05 Identities"),
        createElement("p", { className: "text-sm text-muted-foreground" },
          entries.length + " identit" + (entries.length !== 1 ? "ies" : "y") + " registered",
        ),
      ),
    ),

    // Search
    createElement("div", { className: "relative" },
      createElement(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" }),
      createElement(Input, {
        className: "pl-9",
        placeholder: "Search by name, pubkey, or domain...",
        value: search,
        onInput: (e: Event) => onSearchChange((e.target as HTMLInputElement).value),
      }),
    ),

    // Add new entry form
    createElement("div", { className: "rounded-lg border border-border/50 p-4 space-y-3" },
      createElement("h3", { className: "text-sm font-semibold flex items-center gap-2" },
        createElement(Plus, { className: "size-4" }), "Add Identity",
      ),
      createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3" },
        createElement("div", { className: "space-y-1" },
          createElement(Label, { className: "text-xs" }, "Name"),
          createElement(Input, {
            placeholder: "_ (root) or username",
            value: newName,
            onInput: (e: Event) => onNameChange((e.target as HTMLInputElement).value),
          }),
        ),
        createElement("div", { className: "space-y-1 sm:col-span-2" },
          createElement(Label, { className: "text-xs" }, "Pubkey (hex)"),
          createElement(Input, {
            placeholder: "64-char hex pubkey",
            value: newPubkey,
            onInput: (e: Event) => onPubkeyChange((e.target as HTMLInputElement).value),
          }),
        ),
      ),
      createElement("div", { className: "space-y-1" },
        createElement(Label, { className: "text-xs" }, "Relay URLs (comma-separated, optional)"),
        createElement(Input, {
          placeholder: "wss://relay1.example.com, wss://relay2.example.com",
          value: newRelays,
          onInput: (e: Event) => onRelaysChange((e.target as HTMLInputElement).value),
        }),
      ),
      createElement(Button, {
        size: "sm",
        disabled: adding || !newName.trim() || !newPubkey.trim() || !/^[0-9a-f]{64}$/.test(newPubkey.trim()),
        onClick: onAdd,
      }, adding ? "Adding..." : "Add Identity"),
    ),

    // Entries list
    filtered.length === 0
      ? createElement("div", { className: "flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center" },
          createElement(Fingerprint, { className: "size-10 text-muted-foreground/30 mb-4" }),
          createElement("h3", { className: "font-semibold" }, search ? "No matches" : "No identities yet"),
          createElement("p", { className: "mt-1 text-sm text-muted-foreground max-w-sm" },
            search ? "Try a different search term" : "Add your first NIP-05 identity above",
          ),
        )
      : createElement("div", { className: "rounded-lg border border-border/50 divide-y divide-border/30" },
          ...filtered.map((entry) => {
            const nip05Addr = (entry.name === "_" ? "" : entry.name) + "@" + entry.domain;
            return createElement("div", { key: entry.id, className: "flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center hover:bg-muted/20 transition-colors group" },
              // Left: identity info
              createElement("div", { className: "flex-1 min-w-0" },
                createElement("div", { className: "flex items-center gap-2" },
                  createElement("span", { className: "font-semibold text-sm" }, nip05Addr),
                  createElement("button", {
                    className: "shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
                    title: "Copy NIP-05 address",
                    onClick: () => onCopy(entry.id, nip05Addr),
                  },
                    copiedId === entry.id
                      ? createElement(Check, { className: "size-3 text-emerald-500" })
                      : createElement(Copy, { className: "size-3" }),
                  ),
                ),
                createElement("code", { className: "text-xs text-muted-foreground font-mono block truncate mt-0.5" },
                  entry.pubkey,
                ),
                entry.relayUrls.length > 0
                  ? createElement("div", { className: "flex flex-wrap gap-1 mt-1" },
                      ...entry.relayUrls.map((r) =>
                        createElement(Badge, { key: r.id, variant: "outline", className: "text-[10px] font-mono" }, r.url),
                      ),
                    )
                  : null,
              ),
              // Right: actions
              createElement("div", { className: "flex items-center gap-1.5 shrink-0" },
                createElement(Button, {
                  variant: "ghost",
                  size: "xs",
                  className: "text-destructive opacity-0 group-hover:opacity-100",
                  onClick: () => onDelete(entry.id, nip05Addr),
                },
                  createElement(Trash2, { className: "size-3" }), "Remove",
                ),
              ),
            );
          }),
        ),
  );
}
