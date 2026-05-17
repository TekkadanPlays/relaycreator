// ─── Monitor Shared Types & Helpers ─────────────────────────────────────────
// Extracted from Monitor.tsx to enable code sharing between Monitor + MonitorDetail

export interface RelayState {
  url: string;
  name: string;
  online: boolean;
  software: string;
  version: string;
  nips: number[];
  uptimePct: number;
  rttOpen: number;
  rttRead: number;
  rttWrite: number;
  country: string;
  lastSeen: number;
}

export interface SoftwareGroup {
  name: string;
  count: number;
}

export interface GeoGroup {
  country: string;
  flag: string;
  count: number;
}

export interface NipAdoption {
  nip: number;
  count: number;
  pct: number;
}

export interface NetworkStats {
  total: number;
  online: number;
  offline: number;
  avgUptime: number;
  medianRtt: number;
  softwareGroups: SoftwareGroup[];
  geoGroups: GeoGroup[];
  nipAdoption: NipAdoption[];
}

export type SortMode = "url" | "uptime" | "rtt" | "software" | "nips" | "country" | "status";
export type FilterMode = "all" | "online" | "offline";
export type MonitorTab = "overview" | "relays";

// ─── Parsing ────────────────────────────────────────────────────────────────

export function parseRelay(raw: any): RelayState {
  const url = raw.relayUrl || raw.url || "";
  let sw = raw.software?.family?.value || "";
  if (sw.includes("/") || sw.includes("://")) {
    sw = sw.replace(/^git\+/, "").replace(/\.git$/, "");
    const parts = sw.split("/").filter(Boolean);
    sw = parts[parts.length - 1] || sw;
  }
  const ver = raw.software?.version?.value || "";
  const nips: number[] = Array.isArray(raw.nips?.list) ? raw.nips.list : [];
  const now = Math.floor(Date.now() / 1000);
  const lastOpen = raw.lastOpenAt || 0;
  const isOnline = raw.online ?? (lastOpen > 0 && (now - lastOpen) < 1800);
  const uptimePct = typeof raw.uptimePercentage === "number" ? raw.uptimePercentage
    : raw.uptime?.allTime?.value ? raw.uptime.allTime.value * 100 : 0;

  return {
    url,
    name: url.replace("wss://", "").replace("ws://", "").replace(/\/$/, ""),
    online: isOnline,
    software: sw,
    version: ver,
    nips,
    uptimePct,
    rttOpen: raw.rtt?.open?.value || 0,
    rttRead: raw.rtt?.read?.value || 0,
    rttWrite: raw.rtt?.write?.value || 0,
    country: raw.country?.value || "",
    lastSeen: lastOpen,
  };
}

// ─── Stats Computation ──────────────────────────────────────────────────────

export function computeStats(relays: RelayState[]): NetworkStats {
  const online = relays.filter((r) => r.online).length;
  const offline = relays.length - online;

  // Avg uptime
  const withUptime = relays.filter((r) => r.uptimePct > 0);
  const avgUptime = withUptime.length > 0
    ? withUptime.reduce((s, r) => s + r.uptimePct, 0) / withUptime.length
    : 0;

  // Median RTT (more useful than mean for latency)
  const rttValues = relays.filter((r) => r.rttOpen > 0).map((r) => r.rttOpen).sort((a, b) => a - b);
  const medianRtt = rttValues.length > 0
    ? rttValues[Math.floor(rttValues.length / 2)]
    : 0;

  // Software distribution
  const swMap = new Map<string, number>();
  for (const r of relays) {
    if (r.software) swMap.set(r.software, (swMap.get(r.software) || 0) + 1);
  }
  const softwareGroups: SoftwareGroup[] = Array.from(swMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Geographic distribution
  const geoMap = new Map<string, number>();
  for (const r of relays) {
    if (r.country) geoMap.set(r.country, (geoMap.get(r.country) || 0) + 1);
  }
  const geoGroups: GeoGroup[] = Array.from(geoMap)
    .map(([country, count]) => ({ country, flag: countryFlag(country), count }))
    .sort((a, b) => b.count - a.count);

  // NIP adoption
  const nipMap = new Map<number, number>();
  for (const r of relays) {
    for (const n of r.nips) nipMap.set(n, (nipMap.get(n) || 0) + 1);
  }
  const total = relays.length || 1;
  const nipAdoption: NipAdoption[] = Array.from(nipMap)
    .map(([nip, count]) => ({ nip, count, pct: (count / total) * 100 }))
    .sort((a, b) => a.nip - b.nip);

  return { total: relays.length, online, offline, avgUptime, medianRtt, softwareGroups, geoGroups, nipAdoption };
}

// ─── Display Helpers ────────────────────────────────────────────────────────

export function uptimeColor(pct: number): string {
  if (pct >= 99) return "text-emerald-500";
  if (pct >= 95) return "text-emerald-400";
  if (pct >= 80) return "text-amber-400";
  return "text-red-400";
}

export function uptimeBg(pct: number): string {
  if (pct >= 99) return "bg-emerald-500";
  if (pct >= 95) return "bg-emerald-400";
  if (pct >= 80) return "bg-amber-400";
  return "bg-red-400";
}

export function rttColor(ms: number): string {
  if (ms <= 100) return "text-emerald-400";
  if (ms <= 300) return "text-amber-400";
  return "text-red-400";
}

export function timeAgo(ts: number): string {
  if (!ts) return "never";
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1F1E6 + c.charCodeAt(0) - 65),
  );
}

export function nipAdoptionColor(pct: number): string {
  if (pct >= 80) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (pct >= 50) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (pct >= 20) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}

// ─── Data Fetching ──────────────────────────────────────────────────────────

export async function fetchAllRelays(): Promise<RelayState[]> {
  let allRelays: RelayState[] = [];
  let offset = 0;
  const limit = 200;
  let total = Infinity;

  while (offset < total) {
    const res = await fetch(`/api/rstate/relays?limit=${limit}&offset=${offset}&sortBy=lastSeen&sortOrder=desc`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    total = data.total ?? 0;
    const rawList = Array.isArray(data.relays) ? data.relays : [];
    if (rawList.length === 0) break;
    allRelays = allRelays.concat(rawList.map(parseRelay).filter((r: RelayState) => r.url));
    offset += limit;
    if (allRelays.length >= 5000) break;
  }

  if (allRelays.length === 0) throw new Error("No relays returned from rstate");
  return allRelays;
}

// ─── Sort/Filter Logic ──────────────────────────────────────────────────────

export interface FilterState {
  search: string;
  filterStatus: FilterMode;
  filterSoftware: string;
  filterCountry: string;
  filterNip: number | null;
  sortBy: SortMode;
  sortAsc: boolean;
}

export function applyFilters(relays: RelayState[], filters: FilterState): RelayState[] {
  let list = [...relays];
  const { search, filterStatus, filterSoftware, filterCountry, filterNip, sortBy, sortAsc } = filters;

  // Filter
  if (filterStatus === "online") list = list.filter((r) => r.online);
  if (filterStatus === "offline") list = list.filter((r) => !r.online);
  if (filterSoftware) list = list.filter((r) => r.software.toLowerCase() === filterSoftware.toLowerCase());
  if (filterCountry) list = list.filter((r) => r.country.toUpperCase() === filterCountry.toUpperCase());
  if (filterNip !== null) list = list.filter((r) => r.nips.includes(filterNip));
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((r) =>
      r.url.toLowerCase().includes(q) ||
      r.software.toLowerCase().includes(q) ||
      r.country.toLowerCase().includes(q)
    );
  }

  // Sort
  list.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "url": cmp = a.url.localeCompare(b.url); break;
      case "uptime": cmp = b.uptimePct - a.uptimePct; break;
      case "rtt": cmp = (a.rttOpen || 9999) - (b.rttOpen || 9999); break;
      case "software": cmp = a.software.localeCompare(b.software); break;
      case "nips": cmp = b.nips.length - a.nips.length; break;
      case "country": cmp = a.country.localeCompare(b.country); break;
      case "status": cmp = (b.online ? 1 : 0) - (a.online ? 1 : 0); break;
    }
    return sortAsc ? -cmp : cmp;
  });

  return list;
}
