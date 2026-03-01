import { createElement } from "inferno-create-element";
import { Button } from "@/ui/Button";
import { Badge } from "@/ui/Badge";
import { Clock, CheckCircle2, XCircle, ShieldCheck } from "@/lib/icons";
import { renderLoading, pubkeyShort } from "./helpers";
import type { PermissionRequestItem, PermissionItem } from "./types";

export function renderPermissions(
  permFilter: "pending" | "approved" | "denied",
  permRequests: PermissionRequestItem[],
  permRequestsLoading: boolean,
  permGrants: PermissionItem[],
  permGrantsLoading: boolean,
  permDeciding: boolean,
  permRevoking: boolean,
  onFilterChange: (f: "pending" | "approved" | "denied") => void,
  onDecide: (id: string, decision: "approved" | "denied") => void,
  onRevoke: (userId: string, type: string, userName: string) => void,
) {
  return createElement("div", { className: "space-y-6" },
    createElement("div", null,
      createElement("h2", { className: "text-lg font-semibold" }, "Permission Management"),
      createElement("p", { className: "text-sm text-muted-foreground" }, "Review requests and manage granted permissions"),
    ),

    // Request filter tabs
    createElement("div", null,
      createElement("h3", { className: "text-sm font-semibold mb-3" }, "Permission Requests"),
      createElement("div", { className: "flex gap-1 mb-4" },
        ...(["pending", "approved", "denied"] as const).map((s) =>
          createElement(Button, {
            key: s,
            variant: permFilter === s ? "default" : "outline",
            size: "sm",
            className: "text-xs capitalize",
            onClick: () => onFilterChange(s),
          },
            s === "pending" ? createElement(Clock, { className: "size-3 mr-1" }) : null,
            s === "approved" ? createElement(CheckCircle2, { className: "size-3 mr-1" }) : null,
            s === "denied" ? createElement(XCircle, { className: "size-3 mr-1" }) : null,
            s,
          ),
        ),
      ),

      permRequestsLoading ? renderLoading() :
        permRequests.length === 0
          ? createElement("div", { className: "py-8 text-center text-sm text-muted-foreground" }, `No ${permFilter} requests`)
          : createElement("div", { className: "rounded-lg border border-border/50 divide-y divide-border/30" },
              ...permRequests.map((req) =>
                createElement("div", { key: req.id, className: "px-4 py-3 hover:bg-muted/20 transition-colors" },
                  createElement("div", { className: "flex items-start justify-between gap-4" },
                    createElement("div", { className: "min-w-0 flex-1" },
                      createElement("div", { className: "flex items-center gap-2 mb-1" },
                        createElement(Badge, { variant: "outline", className: "text-[10px] px-1.5 py-0 capitalize" },
                          req.type.replace("_", " "),
                        ),
                        req.user.name
                          ? createElement("span", { className: "text-xs" },
                              createElement("span", { className: "font-medium" }, req.user.name),
                              createElement("span", { className: "text-muted-foreground font-mono ml-1.5" }, pubkeyShort(req.user.pubkey)),
                            )
                          : createElement("span", { className: "text-xs font-mono" }, pubkeyShort(req.user.pubkey)),
                      ),
                      req.reason ? createElement("p", { className: "text-xs text-muted-foreground mt-1" }, `"${req.reason}"`) : null,
                      createElement("p", { className: "text-[10px] text-muted-foreground/60 mt-1" },
                        new Date(req.created_at).toLocaleDateString(),
                      ),
                    ),
                    req.status === "pending"
                      ? createElement("div", { className: "flex gap-1.5 shrink-0" },
                          createElement(Button, {
                            size: "sm", className: "h-7 text-xs gap-1",
                            onClick: () => onDecide(req.id, "approved"),
                            disabled: permDeciding,
                          }, createElement(CheckCircle2, { className: "size-3" }), "Approve"),
                          createElement(Button, {
                            size: "sm", variant: "outline",
                            className: "h-7 text-xs gap-1 text-destructive hover:text-destructive",
                            onClick: () => onDecide(req.id, "denied"),
                            disabled: permDeciding,
                          }, createElement(XCircle, { className: "size-3" }), "Deny"),
                        )
                      : req.decided_by
                        ? createElement("div", { className: "shrink-0 flex items-center gap-1" },
                            createElement("span", { className: "text-[10px] text-muted-foreground" }, "by"),
                            createElement("span", { className: "text-xs font-mono" }, pubkeyShort(req.decided_by.pubkey)),
                          )
                        : null,
                  ),
                ),
              ),
            ),
    ),

    // Active permissions
    createElement("div", null,
      createElement("h3", { className: "text-sm font-semibold mb-3" }, "Active Permissions"),
      permGrantsLoading ? renderLoading() :
        permGrants.length === 0
          ? createElement("div", { className: "py-8 text-center text-sm text-muted-foreground" }, "No active permissions granted")
          : createElement("div", { className: "rounded-lg border border-border/50 overflow-hidden" },
              createElement("table", { className: "w-full text-sm" },
                createElement("thead", null,
                  createElement("tr", { className: "border-b border-border/50 bg-muted/30" },
                    createElement("th", { className: "text-left px-4 py-2.5 font-medium text-muted-foreground" }, "User"),
                    createElement("th", { className: "text-left px-4 py-2.5 font-medium text-muted-foreground" }, "Permission"),
                    createElement("th", { className: "text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell" }, "Disclaimer"),
                    createElement("th", { className: "text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell" }, "Granted"),
                    createElement("th", { className: "text-right px-4 py-2.5 font-medium text-muted-foreground" }, "Actions"),
                  ),
                ),
                createElement("tbody", null,
                  ...permGrants.map((p) =>
                    createElement("tr", { key: p.id, className: "border-b border-border/30 hover:bg-muted/20 transition-colors" },
                      createElement("td", { className: "px-4 py-3" },
                        p.user.name
                          ? createElement("div", null,
                              createElement("span", { className: "text-xs font-medium" }, p.user.name),
                              createElement("p", { className: "text-[10px] font-mono text-muted-foreground" }, pubkeyShort(p.user.pubkey)),
                            )
                          : createElement("span", { className: "text-xs font-mono" }, pubkeyShort(p.user.pubkey)),
                      ),
                      createElement("td", { className: "px-4 py-3" },
                        createElement(Badge, { variant: "outline", className: "text-[10px] capitalize" }, p.type.replace("_", " ")),
                      ),
                      createElement("td", { className: "px-4 py-3 hidden sm:table-cell" },
                        p.disclaimer_accepted
                          ? createElement(ShieldCheck, { className: "size-3.5 text-emerald-400" })
                          : createElement(Clock, { className: "size-3.5 text-amber-400" }),
                      ),
                      createElement("td", { className: "px-4 py-3 hidden sm:table-cell" },
                        createElement("span", { className: "text-xs text-muted-foreground" }, new Date(p.granted_at).toLocaleDateString()),
                      ),
                      createElement("td", { className: "px-4 py-3 text-right" },
                        createElement("button", {
                          className: "inline-flex items-center justify-center rounded-md h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-accent transition-colors cursor-pointer",
                          onClick: () => onRevoke(p.userId, p.type, p.user.name || p.user.pubkey.slice(0, 16)),
                          disabled: permRevoking,
                        }, "Revoke"),
                      ),
                    ),
                  ),
                ),
              ),
            ),
    ),
  );
}
