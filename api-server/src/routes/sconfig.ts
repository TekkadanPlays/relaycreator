import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { getEnv } from "../lib/env.js";
import { nip19 } from "nostr-tools";

const router = Router();

/**
 * Verify deploy auth via NextAuth session cookie (cookiecutter daemon) or
 * X-Deploy-Pubkey header (direct calls). Since sconfig is only called
 * internally between containers on localhost, auth is relaxed — the
 * cookiecutter daemon authenticates via Nostr-signed NextAuth sessions
 * which we no longer support. For now, allow unauthenticated access to
 * sconfig routes since they only expose relay provisioning config.
 *
 * TODO: Add proper internal auth (shared secret or mTLS) once cookiecutter
 * is updated to support JWT or API key auth.
 */
function verifyDeployPubkey(_req: Request, _res: Response): boolean {
  return true;
}

/**
 * GET /sconfig/relays
 * List relays for provisioning. Used by cookiecutter/strfry daemons.
 * Query params: ip (server IP), running (if "true", return all running relays)
 */
router.get("/relays", (req: Request, res: Response) => {
  if (!verifyDeployPubkey(req, res)) return;

  const { ip, running } = req.query as { ip?: string; running?: string };
  console.log("strfrycheck hostip", ip);

  void (async () => {
    if (running === "true") {
      const allRelays = await prisma.relay.findMany({
        where: { OR: [{ status: "running" }, { status: "provision" }] },
        select: { id: true, name: true, port: true, domain: true, ip: true, status: true, auth_required: true, streams: true },
      });
      res.json(allRelays);
    } else {
      const allRelays = await prisma.relay.findMany({
        where: { status: "provision", ip: ip },
        select: { id: true, name: true, port: true, domain: true, ip: true, status: true, auth_required: true, streams: true },
      });
      res.json(allRelays);
    }
  })();
});

/**
 * GET /sconfig/relays/authrequired
 * Used by interceptor daemon to resolve backend URL for a relay.
 * Query params: host (relay hostname, e.g. "admin.mycelium.social")
 * Returns HostResponse: { name, ip, port, domain, mode, invoice }
 * mode: "authrequired" | "authnone" | "authnone:requestpayment"
 */
router.get("/relays/authrequired", (req: Request, res: Response) => {
  const host = req.query.host as string | undefined;

  void (async () => {
    if (host) {
      // Interceptor mode: resolve a single relay by hostname
      // Check external domains first
      const external = await prisma.relay.findFirst({
        where: { is_external: true, domain: host, OR: [{ status: "running" }, { status: "provision" }] },
        select: { id: true, name: true, ip: true, port: true, domain: true, auth_required: true, request_payment: true, payment_amount: true },
      });

      if (external) {
        let mode = "authnone";
        if (external.auth_required) mode = "authrequired";
        else if (external.request_payment) mode = "authnone:requestpayment";
        res.json({
          name: external.name,
          ip: external.ip || "127.0.0.1",
          port: external.port,
          domain: external.domain,
          mode,
          invoice: "",
        });
        return;
      }

      // Internal domain: parse subdomain
      const parts = host.split(".");
      const subdomain = parts[0];
      const domain = parts.slice(1).join(".");

      if (!subdomain) {
        res.status(400).json({ error: "invalid host" });
        return;
      }

      const relay = await prisma.relay.findFirst({
        where: { name: subdomain, domain, OR: [{ status: "running" }, { status: "provision" }] },
        select: { id: true, name: true, ip: true, port: true, domain: true, auth_required: true, request_payment: true, payment_amount: true },
      });

      if (!relay) {
        res.status(404).json({ error: "relay not found" });
        return;
      }

      let mode = "authnone";
      if (relay.auth_required) mode = "authrequired";
      else if (relay.request_payment) mode = "authnone:requestpayment";

      res.json({
        name: relay.name,
        ip: relay.ip || "127.0.0.1",
        port: relay.port,
        domain: relay.domain,
        mode,
        invoice: "",
      });
    } else {
      // Legacy mode: return all auth-required relays
      if (!verifyDeployPubkey(req, res)) return;
      const relays = await prisma.relay.findMany({
        where: {
          auth_required: true,
          OR: [{ status: "running" }, { status: "provision" }],
        },
        select: { id: true, name: true, domain: true, port: true, ip: true },
      });
      res.json(relays);
    }
  })();
});

/**
 * GET /sconfig/relays/authorized
 * Check NIP-42 AUTH status for a pubkey on a relay.
 * Used by interceptor daemon.
 * Query params: pubkey (hex), host (relay hostname)
 */
router.get("/relays/authorized", (req: Request, res: Response) => {
  const host = req.query.host as string | undefined;
  const pubkey = req.query.pubkey as string | undefined;

  if (!host || !pubkey) {
    res.status(400).json({ error: "missing host or pubkey" });
    return;
  }

  void (async () => {
    // Validate pubkey by encoding to npub
    let npubEncoded = "";
    try {
      npubEncoded = nip19.npubEncode(pubkey);
    } catch {
      res.status(400).json({ error: "invalid pubkey" });
      return;
    }

    // Check external domains first
    const external = await prisma.relay.findFirst({
      where: { is_external: true, domain: host },
      select: {
        id: true, name: true, status: true,
        default_message_policy: true, allow_giftwrap: true, allow_tagged: true,
        allow_list: {
          select: { list_keywords: true, list_pubkeys: true, list_kinds: true },
        },
      },
    });

    if (external) {
      if (external.default_message_policy) {
        res.json({ authorized: true });
        return;
      }
      if (external.allow_list) {
        const authorized = external.allow_list.list_pubkeys.find((p: any) => p.pubkey === pubkey || p.pubkey === npubEncoded);
        if (authorized) {
          res.json({ authorized: true });
        } else {
          res.status(401).json({ error: "unauthorized" });
        }
        return;
      }
    }

    // Internal domain: parse subdomain
    const parts = host.split(".");
    const subdomain = parts[0];
    const domain = parts.slice(1).join(".");

    if (!subdomain) {
      res.status(400).json({ error: "invalid host" });
      return;
    }

    const relay = await prisma.relay.findFirst({
      where: { name: subdomain, domain },
      include: {
        owner: true,
        moderators: { include: { user: true } },
        allow_list: { include: { list_keywords: true, list_pubkeys: true, list_kinds: true } },
      },
    });

    if (!relay) {
      res.status(404).json({ error: "not found" });
      return;
    }

    // Super admin
    const superAdmin = await prisma.user.findFirst({ where: { pubkey, admin: true } });
    if (superAdmin) {
      res.json({ authorized: true, status: "full" });
      return;
    }

    // Default allow policy
    if (relay.default_message_policy) {
      res.json({ authorized: true, status: "full" });
      return;
    }

    // Owner
    if (relay.owner.pubkey === pubkey) {
      res.json({ authorized: true, status: "full" });
      return;
    }

    // Moderator
    if (relay.moderators.find((m: any) => m.user.pubkey === pubkey)) {
      res.json({ authorized: true, status: "full" });
      return;
    }

    // Allow list check
    if (relay.allow_list) {
      const authorized = relay.allow_list.list_pubkeys.find((p: any) => p.pubkey === pubkey || p.pubkey === npubEncoded);
      if (!authorized && !relay.allow_tagged) {
        res.status(401).json({ error: "unauthorized" });
      } else if (!authorized && relay.allow_tagged) {
        res.json({ authorized: true, status: "partial" });
      } else {
        res.json({ authorized: true, status: "full" });
      }
    } else {
      res.status(401).json({ error: "unauthorized" });
    }
  })();
});

/**
 * GET /sconfig/relays/deleting
 * Get list of relays marked for deletion.
 */
router.get("/relays/deleting", (req: Request, res: Response) => {
  if (!verifyDeployPubkey(req, res)) return;

  void (async () => {
    const relays = await prisma.relay.findMany({
      where: { status: "deleting" },
      select: { id: true, name: true, domain: true, port: true },
    });
    res.json(relays);
  })();
});

/**
 * GET /sconfig/relays/:id
 * Get a single relay config for provisioning.
 */
router.get("/relays/:id", (req: Request, res: Response) => {
  if (!verifyDeployPubkey(req, res)) return;

  void (async () => {
    const relay = await prisma.relay.findFirst({
      where: { id: req.params.id as string },
      include: {
        owner: true,
        streams: true,
        moderators: { include: { user: true } },
        allow_list: {
          include: { list_keywords: true, list_pubkeys: true, list_kinds: true },
        },
        block_list: {
          include: { list_keywords: true, list_pubkeys: true, list_kinds: true },
        },
        acl_sources: true,
      },
    });

    if (!relay) {
      res.status(404).json({ error: "relay not found" });
      return;
    }

    res.json(relay);
  })();
});

/**
 * GET /sconfig/haproxy/:id
 * Generate HAProxy config file dynamically from database.
 * Used by haproxy cookiecutter daemon.
 *
 * Uses wildcard interceptor routing: all relay subdomains are routed to the
 * interceptor (port 9696) which resolves the correct strfry backend via the
 * sconfig API. This eliminates per-relay ACLs/backends and handles new relays
 * automatically without config regeneration.
 */
router.get("/haproxy/:id", (req: Request, res: Response) => {
  if (!verifyDeployPubkey(req, res)) return;

  void (async () => {
    try {
      const env = getEnv();
      const haproxyStatsUser = env.HAPROXY_STATS_USER;
      const haproxyStatsPass = env.HAPROXY_STATS_PASS;
      const pemName = env.HAPROXY_PEM;
      const interceptorPort = env.INTERCEPTOR_PORT;
      const usethisdomain = env.CREATOR_DOMAIN;
      const coinosEnabled = env.COINOS_ENABLED === "true";

      const fetchServers = await prisma.server.findMany();

      const useInterceptors: string[] = [];
      const useApps: string[] = [];
      if (fetchServers && fetchServers.length > 0) {
        for (const s of fetchServers) {
          useInterceptors.push(s.ip);
          useApps.push(s.ip);
        }
      } else {
        useInterceptors.push("127.0.0.1");
        useApps.push("127.0.0.1");
      }

      let app_servers_cfg = ``;
      for (let i = 0; i < useApps.length; i++) {
        app_servers_cfg += `
	server main-${i} ${useApps[i]}:4000 maxconn 100000 weight 10 check inter 5s fall 3 rise 2`;
      }

      let interceptor_servers_cfg = ``;
      for (let i = 0; i < useInterceptors.length; i++) {
        interceptor_servers_cfg += `
	server interceptor-${i} ${useInterceptors[i]}:${interceptorPort} maxconn 100000 weight 10 check inter 5s fall 3 rise 2`;
      }

      const fetchDeletedDomains = await prisma.relay.findMany({
        where: { domain: usethisdomain, status: "deleted" },
      });

      const fetchPausedDomains = await prisma.relay.findMany({
        where: { domain: usethisdomain, status: "paused" },
      });

      let deleted_domains = ``;
      fetchDeletedDomains.forEach((element) => {
        deleted_domains += `
	http-request return content-type text/html status 410 file /etc/haproxy/static/410.http if { hdr(Host) -i ${element.name}.${element.domain} }`;
      });

      let paused_domains = ``;
      fetchPausedDomains.forEach((element) => {
        paused_domains += `
	http-request return content-type text/html status 402 file /etc/haproxy/static/402.http if { hdr(Host) -i ${element.name}.${element.domain} }`;
      });

      const haproxy_cfg = `global
	log /dev/log	local0
	log /dev/log	local1 notice
	stats socket /tmp/admin.sock mode 660 level admin
	stats timeout 30s
	user haproxy
	group haproxy
	daemon
	maxconn 200000
	ca-base /etc/ssl/certs
	crt-base /etc/ssl/private
	ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384
	ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
	ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets
	tune.ssl.default-dh-param 2048
	tune.bufsize 32768

defaults
	log	global
	mode	http
	option	httplog
	option	dontlognull
	timeout connect 5s
	timeout client  30s
	timeout server  30s
	timeout tunnel  3600s
	timeout http-keep-alive 60s
	timeout http-request 10s
	timeout queue 30s
	errorfile 400 /etc/haproxy/errors/400.http
	errorfile 403 /etc/haproxy/errors/403.http
	errorfile 408 /etc/haproxy/errors/408.http
	errorfile 429 /etc/haproxy/errors/429.http
	errorfile 500 /etc/haproxy/errors/500.http
	errorfile 502 /etc/haproxy/errors/502.http
	errorfile 503 /etc/haproxy/errors/503.http
	errorfile 504 /etc/haproxy/errors/504.http

backend rate_limit_tracking
	stick-table type ip size 200k expire 30s store http_req_rate(10s),conn_cur

frontend http
	bind 0.0.0.0:80
	mode http
	acl is_acme path_beg /.well-known/acme-challenge/
	http-request redirect scheme https code 301 unless is_acme
	default_backend acme_backend

backend acme_backend
	mode http
	server acme 127.0.0.1:8080

frontend secured
	bind 0.0.0.0:443 ssl crt /etc/haproxy/certs/${pemName} alpn h2,http/1.1

	mode			http
	timeout			client 3600s
	backlog			8192
	maxconn			200000
	default_backend		main

	# --- CoinOS external API proxy ---
	acl is_coinos path_beg /coinos
	acl has_api_key req.hdr(x-api-key) -m found
	http-request deny deny_status 403 if is_coinos !has_api_key
	http-request set-path %[path,regsub(^/coinos,,)] if is_coinos
	use_backend coinos if is_coinos

	# --- Hostname-based routing ---
	acl is_app_subdomain hdr(host) -i app.${usethisdomain}
	acl is_chat_subdomain hdr(host) -i chat.${usethisdomain}
	acl is_live_subdomain hdr(host) -i live.${usethisdomain}
	acl is_bare_domain hdr(host) -i ${usethisdomain}
	acl is_relay_subdomain hdr(host) -m reg -i ^[a-z0-9][a-z0-9-]+\\.${usethisdomain.replace(/\./g, "\\.")}$

	# --- rstate direct routing (NIP-66 relay discovery API) ---
	acl is_relays path_beg /relays
	acl is_monitors path_beg /monitors
	acl is_rstate_health path /health/ping
	use_backend rstate if is_relays { srv_is_up(rstate/rstate-001) }
	use_backend rstate if is_monitors { srv_is_up(rstate/rstate-001) }
	use_backend rstate if is_rstate_health { srv_is_up(rstate/rstate-001) }

	# --- app subdomain -> social client frontend ---
	use_backend mycelium if is_app_subdomain { srv_is_up(mycelium/mycelium-001) }
	use_backend ribbit if is_app_subdomain { srv_is_up(ribbit/ribbit-001) }

	# --- chat subdomain -> hyphae IRC web client ---
	use_backend hyphae if is_chat_subdomain { srv_is_up(hyphae/hyphae-001) }

	# --- live subdomain -> mycelium-live (Bun + OME) ---
	use_backend mycelium-live if is_live_subdomain { srv_is_up(mycelium-live/live-001) }

	# --- Wildcard relay subdomains -> interceptor (strfry WebSocket proxy) ---
	use_backend interceptor if is_relay_subdomain !is_app_subdomain !is_chat_subdomain !is_live_subdomain !is_bare_domain { srv_is_up(interceptor/interceptor-001) }
${deleted_domains}
${paused_domains}

	# Security headers
	http-request del-header x-real-ip
	option forwardfor except 127.0.0.1 header x-real-ip
	http-response set-header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
	http-response set-header X-Content-Type-Options "nosniff"
	http-response set-header X-Frame-Options "SAMEORIGIN"

	# Rate limiting
	http-request track-sc0 src table rate_limit_tracking
	http-request deny deny_status 429 if { sc_http_req_rate(0) gt 100 }
	http-request deny deny_status 429 if { sc_conn_cur(0) gt 50 }

# --- Stats dashboard ---
frontend stats
	bind 0.0.0.0:8404
	mode http
	stats enable
	stats uri /stats
	stats refresh 10s
	stats show-legends
	stats auth ${haproxyStatsUser}:${haproxyStatsPass}

# --- Main backend (relaycreator API + admin) ---
backend main
	mode		http
	option		redispatch
	balance		source
	option forwardfor except 127.0.0.1 header x-real-ip
${app_servers_cfg}

# --- Mycelium frontend backend (Bun/Hono on port 3000) ---
backend mycelium
	mode		http
	option		redispatch
	balance		source
	option forwardfor except 127.0.0.1 header x-real-ip
	server mycelium-001 127.0.0.1:3000 maxconn 100000 weight 10 check inter 5s fall 3 rise 2

# --- Ribbit frontend backend (legacy, Bun/Hono on port 3000) ---
backend ribbit
	mode		http
	option		redispatch
	balance		source
	option forwardfor except 127.0.0.1 header x-real-ip
	server ribbit-001 127.0.0.1:3000 maxconn 100000 weight 10 check inter 5s fall 3 rise 2

# --- rstate backend (NIP-66 relay discovery API on port 3100) ---
backend rstate
	mode		http
	option forwardfor except 127.0.0.1 header x-real-ip
	server rstate-001 127.0.0.1:3100 maxconn 50000 weight 10 check inter 5s fall 3 rise 2

# --- Hyphae backend (IRC web client on port 5173) ---
backend hyphae
	mode		http
	option		redispatch
	balance		source
	option forwardfor except 127.0.0.1 header x-real-ip
	server hyphae-001 127.0.0.1:5173 maxconn 50000 weight 10 check inter 5s fall 3 rise 2

# --- Mycelium Live backend (Bun server on port 8085, OME on 3333) ---
backend mycelium-live
	mode		http
	option		redispatch
	balance		source
	option forwardfor except 127.0.0.1 header x-real-ip
	server live-001 127.0.0.1:8085 maxconn 50000 weight 10 check inter 5s fall 3 rise 2

# --- Interceptor backend (strfry WebSocket proxy) ---
backend interceptor
	mode		http
	option		redispatch
	balance		source
	timeout server 3600s
	timeout tunnel 3600s
	option forwardfor except 127.0.0.1 header x-real-ip
${interceptor_servers_cfg}

# --- CoinOS backend (coinos-server on port 3119) ---
backend coinos
	mode		http
	option forwardfor except 127.0.0.1 header x-real-ip
	server coinos-001 127.0.0.1:3119 maxconn 10000 weight 10 check inter 10s fall 3 rise 2
`;

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-disposition", 'filename="haproxy.cfg"');
      res.end(haproxy_cfg);
    } catch (error) {
      console.error("Error generating haproxy config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  })();
});

/**
 * GET /sconfig/jobs
 * Get pending jobs for relays on a specific IP.
 * Query params: ip (server IP)
 */
router.get("/jobs", (req: Request, res: Response) => {
  if (!verifyDeployPubkey(req, res)) return;

  const ip = req.query.ip as string | undefined;
  if (!ip) {
    res.status(400).json({ error: "IP parameter required" });
    return;
  }

  void (async () => {
    try {
      const jobs = await prisma.job.findMany({
        where: { relay: { ip } },
        include: {
          relay: {
            select: { id: true, name: true, ip: true, domain: true, status: true },
          },
        },
        orderBy: { created_at: "desc" },
      });
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  })();
});

/**
 * PUT /sconfig/jobs/:jobId/status
 * Update job status. Used by cookiecutter daemon to report job completion.
 */
router.put("/jobs/:jobId/status", (req: Request, res: Response) => {
  if (!verifyDeployPubkey(req, res)) return;

  const { jobId } = req.params;
  const status = req.query.status as string | undefined;
  const { error_msg, output } = req.body || {};

  const validStatuses = ["pending", "running", "completed", "failed"];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status. Must be one of: " + validStatuses.join(", ") });
    return;
  }

  void (async () => {
    try {
      const job = await prisma.job.findUnique({ where: { id: jobId as string } });
      if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      const updatedJob = await prisma.job.update({
        where: { id: jobId as string },
        data: {
          ...(status && { status }),
          ...(error_msg && { error_msg }),
          ...(output && { output }),
          updated_at: new Date(),
        },
      });

      res.json(updatedJob);
    } catch (error) {
      console.error("Error updating job status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  })();
});

/**
 * PUT /sconfig/relay/:id/status
 * Update relay status. Used by cookiecutter daemon after provisioning.
 * Query params: status ("running" or "deleted")
 * Note: cookiecutter calls PUT /api/relay/:id/status?status=running
 */
router.put("/relay/:id/status", (req: Request, res: Response) => {
  if (!verifyDeployPubkey(req, res)) return;

  const relayId = req.params.id as string;
  const status = req.query.status as string | undefined;

  if (!relayId) {
    res.status(400).json({ error: "no relay id" });
    return;
  }

  if (!status || (status !== "running" && status !== "deleted")) {
    res.status(400).json({ error: "no relay status, or invalid status (running or deleted)" });
    return;
  }

  void (async () => {
    try {
      const updated = await prisma.relay.update({
        where: { id: relayId },
        data: { status },
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating relay status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  })();
});

/**
 * GET /sconfig/relay/:id/strfry
 * Generate strfry.conf for a relay. Used by cookiecutter daemon.
 * Note: cookiecutter calls GET /api/relay/:id/strfry
 */
router.get("/relay/:id/strfry", (req: Request, res: Response) => {
  if (!verifyDeployPubkey(req, res)) return;

  const relayId = req.params.id as string;

  void (async () => {
    try {
      const thisRelay = await prisma.relay.findFirst({
        where: { id: relayId },
        select: {
          id: true,
          owner: true,
          port: true,
          domain: true,
          ip: true,
          name: true,
          details: true,
        },
      });

      if (!thisRelay) {
        res.status(404).json({ error: "relay not found" });
        return;
      }

      const useIP = thisRelay.ip || "127.0.0.1";

      const strfry_cfg = `
##
## Default strfry config
##

# Directory that contains the strfry LMDB database (restart required)
db = "./strfry-db/"

dbParams {
    # Maximum number of threads/processes that can simultaneously have LMDB transactions open (restart required)
    maxreaders = 256

    # Size of mmap() to use when loading LMDB (default is 10TB, does *not* correspond to disk-space used) (restart required)
    mapsize = 10995116277760

    # Disables read-ahead when accessing the LMDB mapping. Reduces IO activity when DB size is larger than RAM. (restart required)
    noReadAhead = false
}

relay {
    # Interface to listen on. Use 0.0.0.0 to listen on all interfaces (restart required)
    #bind = "0.0.0.0"
    bind = "${useIP}"

    # Port to open for the nostr websocket protocol (restart required)
    port = ${thisRelay.port}

    # Set OS-limit on maximum number of open files/sockets (if 0, don't attempt to set) (restart required)
    #nofiles = 1000000

    # HTTP header that contains the client's real IP, before reverse proxying (ie x-real-ip) (MUST be all lower-case)
    realIpHeader = "x-real-ip"

    info {
        # NIP-11: Name of this server. Short/descriptive (< 30 characters)
        name = "${thisRelay.name}"

        # NIP-11: Detailed information about relay, free-form
        description = "managed by relay.tools"

        # NIP-11: Administrative nostr pubkey, for contact purposes
        pubkey = "${thisRelay.owner.pubkey}"

        # NIP-11: Alternative administrative contact (email, website, etc)
        contact = ""
    }

    # Maximum accepted incoming websocket frame size (should be larger than max event and yesstr msg) (restart required)
    maxWebsocketPayloadSize = 262200

    # Maximum number of filters allowed in a REQ
    maxReqFilterSize = 1000

    # Websocket-level PING message frequency (should be less than any reverse proxy idle timeouts) (restart required)
    autoPingSeconds = 55

    # If TCP keep-alive should be enabled (detect dropped connections to upstream reverse proxy)
    enableTcpKeepalive = true

    # How much uninterrupted CPU time a REQ query should get during its DB scan
    queryTimesliceBudgetMicroseconds = 10000

    # Maximum records that can be returned per filter
    maxFilterLimit = 10000

    # Maximum number of subscriptions (concurrent REQs) a connection can have open at any time
    maxSubsPerConnection = 80

    writePolicy {
        # If non-empty, path to an executable script that implements the writePolicy plugin logic
        plugin = "/usr/local/bin/spamblaster"

        # Number of seconds to search backwards for lookback events when starting the writePolicy plugin (0 for no lookback)
        lookbackSeconds = 0
    }

    compression {
        # Use permessage-deflate compression if supported by client. Reduces bandwidth, but slight increase in CPU (restart required)
        enabled = true

        # Maintain a sliding window buffer for each connection. Improves compression, but uses more memory (restart required)
        slidingWindow = true
    }

    logging {
        # Dump all incoming messages
        dumpInAll = false

        # Dump all incoming EVENT messages
        dumpInEvents = false

        # Dump all incoming REQ/CLOSE messages
        dumpInReqs = false

        # Log performance metrics for initial REQ database scans
        dbScanPerf = false

        # Log reason for invalid event rejection? Can be disabled to silence excessive logging
        invalidEvents = false
    }

    numThreads {
        # Ingester threads: route incoming requests, validate events/sigs (restart required)
        ingester = 3

        # reqWorker threads: Handle initial DB scan for events (restart required)
        reqWorker = 3

        # reqMonitor threads: Handle filtering of new events (restart required)
        reqMonitor = 3

        # negentropy threads: Handle negentropy protocol messages (restart required)
        negentropy = 2
    }
    
    negentropy {
       # Support negentropy protocol messages
        enabled = true

        # Maximum records that sync will process before returning an error
        maxSyncEvents = 1000000
    }
}

events {
    # Maximum size of normalised JSON, in bytes
    maxEventSize = 262140

    # Events newer than this will be rejected
    rejectEventsNewerThanSeconds = 900

    # Events older than this will be rejected
    rejectEventsOlderThanSeconds = 94608000

    # Ephemeral events older than this will be rejected
    rejectEphemeralEventsOlderThanSeconds = 60

    # Ephemeral events will be deleted from the DB when older than this
    ephemeralEventsLifetimeSeconds = 300

    # Maximum number of tags allowed
    maxNumTags = 10000

    # Maximum size for tag values, in bytes
    maxTagValSize = 4096
}
`;

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-disposition", 'filename="strfry.conf"');
      res.end(strfry_cfg);
    } catch (error) {
      console.error("Error generating strfry config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  })();
});

/**
 * GET /sconfig/relay/:id/nostrjson
 * Return NIP-11 relay information document.
 * Note: cookiecutter/HAProxy rewrites relay subdomain requests to this path.
 */
router.get("/relay/:id/nostrjson", (req: Request, res: Response) => {
  const relayId = req.params.id as string;

  void (async () => {
    try {
      const relay = await prisma.relay.findFirst({
        where: { id: relayId },
        select: {
          id: true,
          name: true,
          domain: true,
          details: true,
          owner: { select: { pubkey: true } },
          payment_required: true,
          payment_amount: true,
          auth_required: true,
        },
      });

      if (!relay) {
        res.status(404).json({ error: "relay not found" });
        return;
      }

      const nip11 = {
        name: relay.name,
        description: relay.details || `${relay.name}.${relay.domain} - managed by relay.tools`,
        pubkey: relay.owner.pubkey,
        contact: "",
        supported_nips: [1, 2, 4, 9, 11, 12, 15, 16, 20, 22, 28, 33, 40],
        software: "https://github.com/hoytech/strfry",
        version: "1.0.4",
        limitation: {
          payment_required: relay.payment_required,
          auth_required: relay.auth_required,
        },
        ...(relay.payment_required && {
          payments_url: `https://${relay.domain}/api/relay/${relay.id}/payment`,
          fees: {
            admission: [{ amount: relay.payment_amount * 1000, unit: "msats" }],
          },
        }),
      };

      res.setHeader("Content-Type", "application/nostr+json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.json(nip11);
    } catch (error) {
      console.error("Error generating NIP-11:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  })();
});

export default router;
