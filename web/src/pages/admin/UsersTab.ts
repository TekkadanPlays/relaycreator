import { createElement } from "inferno-create-element";
import { Input } from "@/ui/Input";
import { Badge } from "@/ui/Badge";
import { Search } from "@/lib/icons";
import { renderLoading, pubkeyShort } from "./helpers";
import type { AdminUser } from "./types";

export function renderUsers(
  users: AdminUser[],
  usersLoading: boolean,
  userSearch: string,
  onSearchChange: (v: string) => void,
  onToggleAdmin: (userId: string, currentAdmin: boolean) => void,
) {
  const q = userSearch.toLowerCase();
  const filtered = q ? users.filter((u) => u.pubkey.includes(q) || u.name?.toLowerCase().includes(q)) : users;

  return createElement("div", { className: "space-y-4" },
    createElement("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" },
      createElement("div", null,
        createElement("h2", { className: "text-lg font-semibold" }, "All Users"),
        createElement("p", { className: "text-sm text-muted-foreground" }, users.length + " total"),
      ),
      createElement("div", { className: "relative" },
        createElement(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" }),
        createElement(Input, {
          placeholder: "Search by name or pubkey...",
          value: userSearch,
          onInput: (e: Event) => onSearchChange((e.target as HTMLInputElement).value),
          className: "pl-9 h-8 w-56 text-sm",
        }),
      ),
    ),
    usersLoading ? renderLoading() :
      createElement("div", { className: "rounded-lg border border-border/50 overflow-hidden" },
        createElement("div", { className: "overflow-x-auto" },
          createElement("table", { className: "w-full text-sm" },
            createElement("thead", null,
              createElement("tr", { className: "border-b border-border/50 bg-muted/30" },
                createElement("th", { className: "text-left px-4 py-2.5 font-medium text-muted-foreground" }, "User"),
                createElement("th", { className: "text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell" }, "Relays"),
                createElement("th", { className: "text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell" }, "Orders"),
                createElement("th", { className: "text-left px-4 py-2.5 font-medium text-muted-foreground" }, "Role"),
                createElement("th", { className: "text-right px-4 py-2.5 font-medium text-muted-foreground" }, "Actions"),
              ),
            ),
            createElement("tbody", null,
              ...filtered.map((u) =>
                createElement("tr", { key: u.id, className: "border-b border-border/30 hover:bg-muted/20 transition-colors" },
                  createElement("td", { className: "px-4 py-3" },
                    createElement("div", null,
                      createElement("p", { className: "text-sm font-medium" }, u.name || pubkeyShort(u.pubkey)),
                      createElement("p", { className: "text-xs text-muted-foreground font-mono" }, pubkeyShort(u.pubkey)),
                    ),
                  ),
                  createElement("td", { className: "px-4 py-3 hidden sm:table-cell" },
                    createElement("span", { className: "text-xs tabular-nums" }, String(u._count.relays)),
                  ),
                  createElement("td", { className: "px-4 py-3 hidden sm:table-cell" },
                    createElement("span", { className: "text-xs tabular-nums" }, String(u._count.orders)),
                  ),
                  createElement("td", { className: "px-4 py-3" },
                    u.admin
                      ? createElement(Badge, { className: "text-[10px] bg-primary/10 text-primary border-primary/20" }, "Admin")
                      : createElement(Badge, { variant: "secondary", className: "text-[10px]" }, "User"),
                  ),
                  createElement("td", { className: "px-4 py-3 text-right" },
                    createElement("button", {
                      className: "inline-flex items-center justify-center rounded-md h-7 px-2 text-xs hover:bg-accent transition-colors cursor-pointer",
                      onClick: () => onToggleAdmin(u.id, u.admin),
                    }, u.admin ? "Remove Admin" : "Make Admin"),
                  ),
                ),
              ),
            ),
          ),
        ),
        filtered.length === 0 ? createElement("div", { className: "py-12 text-center text-sm text-muted-foreground" },
          userSearch ? `No users matching "${userSearch}"` : "No users found",
        ) : null,
      ),
  );
}
