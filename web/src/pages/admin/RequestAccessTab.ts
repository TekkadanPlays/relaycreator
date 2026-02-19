import { createElement } from "inferno-create-element";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { Badge } from "@/ui/Badge";
import { Input } from "@/ui/Input";
import {
  Lock, Check, Clock, CheckCircle2, XCircle, ShieldCheck, Info, KeyRound, Loader2,
} from "@/lib/icons";
import { renderLoading } from "./helpers";
import type { MyPermissionsData, PermissionTypeInfo } from "./types";
import type { User } from "../../stores/auth";

export function renderRequestAccess(
  user: User | null,
  myPerms: MyPermissionsData | null,
  myPermsLoading: boolean,
  permTypes: PermissionTypeInfo[],
  requestType: string,
  requestReason: string,
  requestSubmitting: boolean,
  requestError: string,
  onTypeChange: (t: string) => void,
  onReasonChange: (r: string) => void,
  onSubmit: () => void,
) {
  if (!user) {
    return createElement("div", { className: "flex flex-col items-center justify-center py-24 text-center" },
      createElement(Lock, { className: "size-10 text-muted-foreground/30 mb-4" }),
      createElement("h2", { className: "text-xl font-bold" }, "Sign in Required"),
      createElement("p", { className: "mt-1 text-sm text-muted-foreground" }, "Sign in with a NIP-07 extension to request permissions."),
    );
  }

  if (myPermsLoading) return renderLoading();

  const myPermissions = myPerms?.permissions || [];
  const myRequests = myPerms?.requests || [];
  const activeTypes = new Set(myPermissions.filter((p) => !p.revoked_at).map((p) => p.type));
  const pendingTypes = new Set(myRequests.filter((r) => r.status === "pending").map((r) => r.type));
  const availableTypes = permTypes.filter((t) => !activeTypes.has(t.type) && !pendingTypes.has(t.type));

  return createElement("div", { className: "space-y-6" },
    createElement("div", null,
      createElement("h2", { className: "text-lg font-semibold" }, "Request Access"),
      createElement("p", { className: "text-sm text-muted-foreground" }, "Request elevated permissions from platform administrators"),
    ),

    // Current permissions
    myPermissions.filter((p) => !p.revoked_at).length > 0
      ? createElement("div", null,
          createElement("h3", { className: "text-sm font-semibold mb-3" }, "Your Permissions"),
          createElement("div", { className: "flex flex-wrap gap-2" },
            ...myPermissions.filter((p) => !p.revoked_at).map((p) =>
              createElement(Badge, { key: p.id, className: "gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
                createElement(ShieldCheck, { className: "size-3" }),
                p.type.replace("_", " "),
                p.disclaimer_accepted ? createElement(Check, { className: "size-3" }) : null,
              ),
            ),
          ),
        )
      : null,

    // Pending requests
    myRequests.filter((r) => r.status === "pending").length > 0
      ? createElement("div", null,
          createElement("h3", { className: "text-sm font-semibold mb-3" }, "Pending Requests"),
          createElement("div", { className: "rounded-lg border border-border/50 divide-y divide-border/30" },
            ...myRequests.filter((r) => r.status === "pending").map((r) =>
              createElement("div", { key: r.id, className: "px-4 py-3 flex items-center justify-between" },
                createElement("div", null,
                  createElement(Badge, { variant: "outline", className: "text-[10px] capitalize mb-1" }, r.type.replace("_", " ")),
                  r.reason ? createElement("p", { className: "text-xs text-muted-foreground mt-1" }, r.reason) : null,
                ),
                createElement(Badge, { variant: "secondary", className: "text-[10px] gap-1" },
                  createElement(Clock, { className: "size-2.5" }), "Pending",
                ),
              ),
            ),
          ),
        )
      : null,

    // Past decisions
    myRequests.filter((r) => r.status !== "pending").length > 0
      ? createElement("div", null,
          createElement("h3", { className: "text-sm font-semibold mb-3" }, "Request History"),
          createElement("div", { className: "rounded-lg border border-border/50 divide-y divide-border/30" },
            ...myRequests.filter((r) => r.status !== "pending").slice(0, 10).map((r) =>
              createElement("div", { key: r.id, className: "px-4 py-3 flex items-center justify-between" },
                createElement("div", null,
                  createElement("div", { className: "flex items-center gap-2" },
                    createElement(Badge, { variant: "outline", className: "text-[10px] capitalize" }, r.type.replace("_", " ")),
                    createElement("span", { className: "text-[10px] text-muted-foreground" },
                      r.decided_at ? new Date(r.decided_at).toLocaleDateString() : "",
                    ),
                  ),
                  r.decision_note ? createElement("p", { className: "text-xs text-muted-foreground mt-1" }, r.decision_note) : null,
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

    // New request form
    availableTypes.length > 0
      ? createElement(Card, { className: "border-border/50" },
          createElement(CardHeader, { className: "pb-3" },
            createElement(CardTitle, { className: "text-sm" }, "Request a Permission"),
            createElement(CardDescription, { className: "text-xs" }, "Select a permission type and optionally explain why you need it."),
          ),
          createElement(CardContent, { className: "space-y-3" },
            createElement("div", { className: "flex flex-wrap gap-2" },
              ...availableTypes.map((t) =>
                createElement(Button, {
                  key: t.type,
                  variant: requestType === t.type ? "default" : "outline",
                  size: "sm", className: "text-xs capitalize",
                  onClick: () => onTypeChange(t.type),
                }, t.type.replace("_", " ")),
              ),
            ),
            requestType ? createElement("div", { className: "space-y-3" },
              createElement("div", { className: "rounded-lg bg-muted/30 p-3" },
                createElement("div", { className: "flex items-start gap-2" },
                  createElement(Info, { className: "size-3.5 text-muted-foreground shrink-0 mt-0.5" }),
                  createElement("p", { className: "text-xs text-muted-foreground leading-relaxed" },
                    permTypes.find((t) => t.type === requestType)?.disclaimer || "",
                  ),
                ),
              ),
              createElement(Input, {
                placeholder: "Why do you need this permission? (optional)",
                value: requestReason,
                onInput: (e: Event) => onReasonChange((e.target as HTMLInputElement).value),
                className: "text-sm",
              }),
              requestError ? createElement("p", { className: "text-xs text-destructive" }, requestError) : null,
              createElement(Button, {
                className: "gap-1.5 w-full",
                onClick: onSubmit,
                disabled: requestSubmitting,
              },
                requestSubmitting
                  ? createElement(Loader2, { className: "size-4 animate-spin" })
                  : createElement(KeyRound, { className: "size-4" }),
                "Submit Request",
              ),
            ) : null,
          ),
        )
      : createElement(Card, { className: "border-border/50 border-dashed" },
          createElement(CardContent, { className: "p-5 text-center" },
            createElement("p", { className: "text-sm text-muted-foreground" },
              activeTypes.size > 0 || pendingTypes.size > 0
                ? "All available permissions are either granted or pending."
                : "No permission types available to request at this time.",
            ),
          ),
        ),
  );
}
