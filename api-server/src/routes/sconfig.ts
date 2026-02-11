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
        select: { id: true, name: true, port: true, domain: true, status: true, streams: true },
      });
      res.json(allRelays);
    } else {
      const allRelays = await prisma.relay.findMany({
        where: { status: "provision", ip: ip },
        select: { id: true, name: true, port: true, domain: true, status: true, streams: true },
      });
      res.json(allRelays);
    }
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
 * GET /sconfig/relays/authrequired
 * Get list of relays that require NIP-42 auth.
 */
router.get("/relays/authrequired", (req: Request, res: Response) => {
  if (!verifyDeployPubkey(req, res)) return;

  void (async () => {
    const relays = await prisma.relay.findMany({
      where: {
        auth_required: true,
        OR: [{ status: "running" }, { status: "provision" }],
      },
      select: { id: true, name: true, domain: true, port: true },
    });
    res.json(relays);
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
 * GET /sconfig/haproxy/:id
 * Generate HAProxy config file dynamically from database.
 * Used by haproxy cookiecutter daemon.
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
    server     app-${i} ${useApps[i]}:4000 maxconn 50000 weight 10 check`;
      }

      const fetchDomain = await prisma.relay.findMany({
        where: {
          domain: usethisdomain,
          OR: [{ status: "provision" }, { status: "running" }],
        },
      });

      const fetchExternalDomain = await prisma.relay.findMany({
        where: { is_external: true, status: "running" },
      });

      const fetchDeletedDomains = await prisma.relay.findMany({
        where: { domain: usethisdomain, status: "deleted" },
      });

      const fetchPausedDomains = await prisma.relay.findMany({
        where: { domain: usethisdomain, status: "paused" },
      });

      let haproxy_subdomains_cfg = `
		acl host_ws hdr_beg(Host) -i ws.
		acl hdr_connection_upgrade hdr(Connection)  -i upgrade
		acl hdr_upgrade_websocket  hdr(Upgrade)     -i websocket
	
	`;

      let haproxy_backends_cfg = ``;

      fetchDomain.forEach((element) => {
        let usePort = element.port;
        if (element.auth_required || element.request_payment) {
          usePort = interceptorPort;
        }
        let useIP = "127.0.0.1";
        if (element.ip) {
          useIP = element.ip;
        }
        haproxy_subdomains_cfg += `
		acl ${element.name + "_root"} path_beg -i /
		acl ${element.name} hdr(Host) -i ${element.name}.${element.domain}
		acl ${element.name + "_nostrjson"} req.hdr(Accept) -i application/nostr+json
		acl ${element.name + "_nostrjsonrpc"} req.hdr(Accept) -i application/nostr+json+rpc
		use_backend ${element.name} if host_ws ${element.name}
		use_backend ${element.name} if hdr_connection_upgrade hdr_upgrade_websocket ${element.name} 
		http-request set-path /api/relay/${element.id}/nostrjson if ${element.name} ${element.name + "_root"} ${element.name + "_nostrjson"}
		http-request set-path /api/86/${element.id} if ${element.name} ${element.name + "_root"} ${element.name + "_nostrjsonrpc"}
		`;

        haproxy_backends_cfg += `
backend ${element.name}
	mode  		        http
	option 		        redispatch
	balance 	        roundrobin
	option forwardfor except 127.0.0.1 header x-real-ip`;

        if (element.auth_required || element.request_payment) {
          for (let i = 0; i < useInterceptors.length; i++) {
            haproxy_backends_cfg += `
    server     interceptor-${i} ${useInterceptors[i]}:${interceptorPort} maxconn 50000 weight 10 check`;
          }
        } else {
          haproxy_backends_cfg += `
    server     websocket-001 ${useIP}:${usePort} maxconn 50000 weight 10 check`;
        }
      });

      fetchExternalDomain.forEach((element) => {
        let useSSLVerify = "";
        if (element.port === 443) {
          useSSLVerify = "ssl verify none";
        }

        haproxy_subdomains_cfg += `
		acl ${element.name + "_root"} path_beg -i /
		acl ${element.name} hdr(Host) -i ${element.domain}
		acl ${element.name + "_nostrjson"} req.hdr(Accept) -i application/nostr+json
		use_backend ${element.name} if host_ws ${element.name}
		use_backend ${element.name} if hdr_connection_upgrade hdr_upgrade_websocket ${element.name} 
		http-request set-path /api/relay/${element.id}/nostrjson if ${element.name} ${element.name + "_root"} ${element.name + "_nostrjson"}
		`;

        haproxy_backends_cfg += `
backend ${element.name}
	mode  		        http
	option 		        redispatch
	balance 	        roundrobin
	option forwardfor except 127.0.0.1 header x-real-ip
	server     ${element.name} ${element.ip}:${element.port} ${useSSLVerify} maxconn 50000 weight 10 check
	`;
      });

      let deleted_domains = ``;
      fetchDeletedDomains.forEach((element) => {
        deleted_domains += `
        http-request return content-type text/html status 410 file /etc/haproxy/static/410.http if { hdr(Host) -i ${element.name}.${element.domain} }
        `;
      });

      let paused_domains = ``;
      fetchPausedDomains.forEach((element) => {
        paused_domains += `
        http-request return content-type text/html status 402 file /etc/haproxy/static/402.http if { hdr(Host) -i ${element.name}.${element.domain} }
        `;
      });

      const haproxy_cfg = `
global
	log /dev/log	local0
	log /dev/log	local1 notice
	stats socket /tmp/admin.sock mode 660 level admin
    stats socket /etc/haproxy/haproxy.sock mode 660 level user
	stats timeout 30s
	user haproxy
	group haproxy
	daemon
	ca-base /etc/ssl/certs
	crt-base /etc/ssl/private
	ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384
	ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
	ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets
    hard-stop-after 120s

defaults
	log	global
	mode	http
	option	httplog
	option	dontlognull
    timeout connect 20s
    timeout client  20s
    timeout server  60s
	timeout tunnel 300s
	errorfile 400 /etc/haproxy/errors/400.http
	errorfile 403 /etc/haproxy/errors/403.http
	errorfile 408 /etc/haproxy/errors/408.http
	errorfile 500 /etc/haproxy/errors/500.http
	errorfile 502 /etc/haproxy/errors/502.http
	errorfile 503 /etc/haproxy/errors/503.http
	errorfile 504 /etc/haproxy/errors/504.http

frontend unsecured
	maxconn 10000
	bind 0.0.0.0:80 name http
	mode 		        http
    acl is_acme_challenge path_beg /.well-known/acme-challenge/
    use_backend certbot_server if is_acme_challenge
    http-request allow if is_acme_challenge
    redirect scheme https code 301 if !is_acme_challenge !{ ssl_fc }

frontend secured
	bind			0.0.0.0:443 ssl crt /etc/haproxy/certs/${pemName}

	mode			http
	backlog			4096
	maxconn			60000      
	default_backend		main	
	http-request del-header x-real-ip
	option forwardfor except 127.0.0.1 header x-real-ip

    http-request set-header host %[hdr(host),field(1,:)]
    capture request header Host len 30

	http-request return content-type image/x-icon file /etc/haproxy/static/favicon.ico if { path /favicon.ico }
	http-request return content-type image/png file /etc/haproxy/static/favicon-32x32.png if { path /favicon-32x32.png }
	http-request return content-type image/png file /etc/haproxy/static/favicon-16x16.png if { path /favicon-16x16.png }
	http-request return content-type image/png file /etc/haproxy/static/apple-touch-icon.png if { path /apple-touch-icon.png }
	http-request return content-type application/json file /etc/haproxy/static/apple-touch-icon.png if { path /site.webmanifest }

    ${deleted_domains}

    ${paused_domains}

	${haproxy_subdomains_cfg}

backend main
	mode  		        http
	option 		        redispatch
	balance 	        source
	option forwardfor except 127.0.0.1 header x-real-ip
    ${app_servers_cfg}

	${haproxy_backends_cfg}

backend certbot_server
    server certbot 127.0.0.1:10000

listen stats
	bind 0.0.0.0:8888 ssl crt  /etc/haproxy/certs/${pemName}
        mode            	http
        stats           	enable
        option          	httplog
        stats           	show-legends
        stats          		uri /haproxy
        stats           	realm Haproxy\\ Statistics
        stats           	refresh 5s
        stats           	auth ${haproxyStatsUser}:${haproxyStatsPass}
        timeout         	connect 5000ms
        timeout         	client 50000ms
        timeout         	server 50000ms

backend backend_static_index
	mode http
	http-request set-log-level silent
	errorfile 503 /etc/haproxy/static/index.static.html
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

export default router;
