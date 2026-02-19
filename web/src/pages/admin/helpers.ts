import { createElement } from "inferno-create-element";
import { Badge } from "@/ui/Badge";
import { Loader2 } from "@/lib/icons";

export function formatSats(sats: number): string {
  if (Math.abs(sats) >= 100_000_000) return (sats / 100_000_000).toFixed(4) + " BTC";
  if (Math.abs(sats) >= 1_000_000) return (sats / 1_000_000).toFixed(2) + "M sats";
  if (Math.abs(sats) >= 1_000) return (sats / 1_000).toFixed(1) + "k sats";
  return sats.toLocaleString() + " sats";
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m ago";
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h ago";
  return Math.floor(diff / 86_400_000) + "d ago";
}

export function pubkeyShort(pk: string): string {
  return pk.slice(0, 8) + "..." + pk.slice(-4);
}

export function renderStatusBadge(status: string | null) {
  if (status === "running") {
    return createElement(Badge, { variant: "secondary", className: "gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
      createElement("span", { className: "size-1.5 rounded-full bg-emerald-400" }),
      "Running",
    );
  }
  if (status === "provision") {
    return createElement(Badge, { variant: "secondary", className: "gap-1.5 text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20" },
      createElement(Loader2, { className: "size-3 animate-spin" }),
      "Provisioning",
    );
  }
  return createElement(Badge, { variant: "secondary", className: "text-[10px]" }, status || "unknown");
}

export function renderLoading() {
  return createElement("div", { className: "flex justify-center py-16" },
    createElement(Loader2, { className: "size-6 animate-spin text-muted-foreground" }),
  );
}

export const RATE_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "BRL", "MXN"] as const;
