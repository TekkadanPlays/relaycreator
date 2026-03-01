import { createElement } from "inferno-create-element";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import {
  Activity, Database, Radio, Shield, Loader2, RefreshCw,
  CheckCircle2, AlertTriangle, XCircle, HelpCircle,
} from "@/lib/icons";
import { renderLoading } from "./helpers";

export interface ServiceCheck {
  name: string;
  status: "ok" | "warn" | "error" | "unknown";
  message: string;
  latency?: number;
  details?: Record<string, any>;
}

export interface HealthData {
  overall: "healthy" | "degraded" | "warning";
  timestamp: string;
  services: ServiceCheck[];
}

function statusIcon(status: string) {
  switch (status) {
    case "ok": return createElement(CheckCircle2, { className: "size-5 text-emerald-400" });
    case "warn": return createElement(AlertTriangle, { className: "size-5 text-amber-400" });
    case "error": return createElement(XCircle, { className: "size-5 text-red-400" });
    default: return createElement(HelpCircle, { className: "size-5 text-muted-foreground" });
  }
}

function statusBadge(status: string) {
  const map: Record<string, { className: string; label: string }> = {
    ok: { className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Healthy" },
    warn: { className: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Warning" },
    error: { className: "bg-red-500/10 text-red-400 border-red-500/20", label: "Error" },
    unknown: { className: "bg-muted text-muted-foreground", label: "Unknown" },
  };
  const s = map[status] || map.unknown;
  return createElement(Badge, { variant: "secondary", className: `text-[10px] ${s.className}` }, s.label);
}

function overallBadge(overall: string) {
  const map: Record<string, { className: string; label: string }> = {
    healthy: { className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "All Systems Operational" },
    warning: { className: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Degraded Performance" },
    degraded: { className: "bg-red-500/10 text-red-400 border-red-500/20", label: "Service Disruption" },
  };
  const s = map[overall] || map.degraded;
  return createElement(Badge, { variant: "secondary", className: `text-xs px-3 py-1 ${s.className}` }, s.label);
}

function renderDetailRow(key: string, value: any): any {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return createElement("div", { className: "col-span-2 mt-1" },
      createElement("span", { className: "text-[10px] font-medium text-muted-foreground uppercase tracking-wider" }, key),
      createElement("div", { className: "ml-2 mt-0.5 grid grid-cols-2 gap-x-4 gap-y-0.5" },
        ...Object.entries(value).map(([k, v]) => renderDetailRow(k, v)).filter(Boolean),
      ),
    );
  }
  if (Array.isArray(value)) {
    return createElement("div", { className: "col-span-2 mt-1" },
      createElement("span", { className: "text-[10px] font-medium text-muted-foreground uppercase tracking-wider" }, key),
      createElement("div", { className: "ml-2 mt-0.5 space-y-0.5" },
        ...value.map((item, i) =>
          createElement("div", { key: i, className: "text-xs text-foreground/70 font-mono" },
            typeof item === "object" ? JSON.stringify(item) : String(item),
          ),
        ),
      ),
    );
  }
  return [
    createElement("span", { key: `${key}-k`, className: "text-[10px] text-muted-foreground" }, key),
    createElement("span", { key: `${key}-v`, className: "text-xs text-foreground/80 font-mono truncate" },
      typeof value === "boolean" ? (value ? "true" : "false") : String(value),
    ),
  ];
}

function renderServiceCard(svc: ServiceCheck) {
  return createElement("div", {
    key: svc.name,
    className: "rounded-lg border border-border bg-card p-4 space-y-3",
  },
    // Header
    createElement("div", { className: "flex items-center justify-between" },
      createElement("div", { className: "flex items-center gap-2.5" },
        statusIcon(svc.status),
        createElement("span", { className: "text-sm font-semibold" }, svc.name),
      ),
      statusBadge(svc.status),
    ),
    // Message
    createElement("p", { className: "text-xs text-muted-foreground" }, svc.message),
    // Latency bar
    svc.latency !== undefined
      ? createElement("div", { className: "flex items-center gap-2" },
          createElement("span", { className: "text-[10px] text-muted-foreground" }, "Latency"),
          createElement("div", { className: "flex-1 h-1.5 rounded-full bg-muted overflow-hidden" },
            createElement("div", {
              className: `h-full rounded-full ${svc.latency < 50 ? "bg-emerald-400" : svc.latency < 200 ? "bg-amber-400" : "bg-red-400"}`,
              style: { width: `${Math.min(100, (svc.latency / 500) * 100)}%` },
            }),
          ),
          createElement("span", { className: "text-[10px] font-mono text-muted-foreground" }, `${svc.latency}ms`),
        )
      : null,
    // Details
    svc.details
      ? createElement("div", { className: "pt-2 border-t border-border/50 grid grid-cols-2 gap-x-4 gap-y-1" },
          ...Object.entries(svc.details).map(([k, v]) => renderDetailRow(k, v)).flat().filter(Boolean),
        )
      : null,
  );
}

export function renderDebug(
  health: HealthData | null,
  loading: boolean,
  provisionLoading: boolean,
  onRefresh: () => void,
  onProvisionStuck: () => void,
) {
  if (loading && !health) return renderLoading();

  return createElement("div", { className: "space-y-6" },
    // Header
    createElement("div", { className: "flex items-center justify-between" },
      createElement("div", null,
        createElement("h2", { className: "text-xl font-bold tracking-tight" }, "System Health"),
        createElement("p", { className: "text-sm text-muted-foreground mt-0.5" }, "Real-time status of all relay-tools services"),
      ),
      createElement("div", { className: "flex items-center gap-2" },
        health ? overallBadge(health.overall) : null,
        createElement(Button, {
          variant: "outline", size: "sm",
          onClick: onRefresh,
          disabled: loading,
          className: "gap-1.5",
        },
          loading
            ? createElement(Loader2, { className: "size-3.5 animate-spin" })
            : createElement(RefreshCw, { className: "size-3.5" }),
          "Refresh",
        ),
      ),
    ),

    // Timestamp
    health
      ? createElement("p", { className: "text-[10px] text-muted-foreground font-mono" },
          `Last checked: ${new Date(health.timestamp).toLocaleString()}`,
        )
      : null,

    // Service grid
    health
      ? createElement("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" },
          ...health.services.map(renderServiceCard),
        )
      : null,

    // Actions
    health
      ? createElement("div", { className: "rounded-lg border border-border bg-card p-4 space-y-3" },
          createElement("div", { className: "flex items-center gap-2" },
            createElement(Shield, { className: "size-4 text-muted-foreground" }),
            createElement("span", { className: "text-sm font-semibold" }, "Quick Actions"),
          ),
          createElement("div", { className: "flex flex-wrap gap-2" },
            // Provision stuck relays
            (() => {
              const stuckSvc = health.services.find((s) => s.name === "Relay Fleet");
              const stuckCount = stuckSvc?.details?.stuck?.length || 0;
              return stuckCount > 0
                ? createElement(Button, {
                    variant: "outline", size: "sm",
                    onClick: onProvisionStuck,
                    disabled: provisionLoading,
                    className: "gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10",
                  },
                    provisionLoading
                      ? createElement(Loader2, { className: "size-3.5 animate-spin" })
                      : createElement(Radio, { className: "size-3.5" }),
                    `Provision ${stuckCount} stuck relay(s)`,
                  )
                : createElement("span", { className: "text-xs text-muted-foreground" }, "No actions needed");
            })(),
          ),
        )
      : null,
  );
}
