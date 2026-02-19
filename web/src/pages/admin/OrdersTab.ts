import { createElement } from "inferno-create-element";
import { Link } from "inferno-router";
import { Badge } from "@/ui/Badge";
import { Check } from "@/lib/icons";
import { renderLoading, pubkeyShort } from "./helpers";
import type { AdminOrder } from "./types";

export function renderOrders(
  orders: AdminOrder[],
  ordersLoading: boolean,
) {
  return createElement("div", { className: "space-y-4" },
    createElement("div", null,
      createElement("h2", { className: "text-lg font-semibold" }, "Recent Orders"),
      createElement("p", { className: "text-sm text-muted-foreground" }, "Last 100 orders"),
    ),
    ordersLoading ? renderLoading() :
      createElement("div", { className: "rounded-lg border border-border/50 overflow-hidden" },
        createElement("div", { className: "overflow-x-auto" },
          createElement("table", { className: "w-full text-sm" },
            createElement("thead", null,
              createElement("tr", { className: "border-b border-border/50 bg-muted/30" },
                createElement("th", { className: "text-left px-4 py-2.5 font-medium text-muted-foreground" }, "Relay"),
                createElement("th", { className: "text-left px-4 py-2.5 font-medium text-muted-foreground" }, "Amount"),
                createElement("th", { className: "text-left px-4 py-2.5 font-medium text-muted-foreground" }, "Type"),
                createElement("th", { className: "text-left px-4 py-2.5 font-medium text-muted-foreground" }, "Status"),
                createElement("th", { className: "text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell" }, "User"),
                createElement("th", { className: "text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell" }, "Paid At"),
              ),
            ),
            createElement("tbody", null,
              ...orders.map((order) =>
                createElement("tr", { key: order.id, className: "border-b border-border/30 hover:bg-muted/20 transition-colors" },
                  createElement("td", { className: "px-4 py-3" },
                    createElement(Link, { to: `/relays/${order.relay.name}`, className: "hover:text-primary transition-colors" },
                      createElement("p", { className: "font-medium" }, order.relay.name),
                      createElement("p", { className: "text-xs text-muted-foreground font-mono" }, order.relay.domain),
                    ),
                  ),
                  createElement("td", { className: "px-4 py-3" },
                    createElement("span", { className: "font-mono font-medium" }, order.amount.toLocaleString()),
                    createElement("span", { className: "text-xs text-muted-foreground ml-1" }, "sats"),
                  ),
                  createElement("td", { className: "px-4 py-3" },
                    createElement(Badge, { variant: "outline", className: "text-[10px]" }, order.order_type),
                  ),
                  createElement("td", { className: "px-4 py-3" },
                    order.paid
                      ? createElement(Badge, { variant: "secondary", className: "gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
                          createElement(Check, { className: "size-3" }), "Paid",
                        )
                      : createElement(Badge, { variant: "secondary", className: "gap-1 text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20" }, "Pending"),
                  ),
                  createElement("td", { className: "px-4 py-3 hidden md:table-cell" },
                    createElement("span", { className: "text-xs font-mono" }, pubkeyShort(order.user.pubkey)),
                  ),
                  createElement("td", { className: "px-4 py-3 hidden lg:table-cell" },
                    createElement("span", { className: "text-xs text-muted-foreground" },
                      order.paid_at
                        ? new Date(order.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "---",
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        orders.length === 0 ? createElement("div", { className: "py-12 text-center text-sm text-muted-foreground" }, "No orders found") : null,
      ),
  );
}
