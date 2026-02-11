import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { getEnv } from "../lib/env.js";
import { nip19 } from "nostr-tools";

const router = Router();

/**
 * Verify that the request comes from the deploy pubkey.
 * In the Next.js version this was done via next-auth session.
 * Here we check the X-Deploy-Pubkey header against DEPLOY_PUBKEY env var.
 */
function verifyDeployPubkey(req: Request, res: Response): boolean {
  const env = getEnv();
  const pubkey = req.headers["x-deploy-pubkey"] as string | undefined;

  if (!env.DEPLOY_PUBKEY) {
    res.status(500).json({ error: "no DEPLOY_PUBKEY configured" });
    return false;
  }

  if (!pubkey || pubkey !== env.DEPLOY_PUBKEY) {
    res.status(403).json({ error: "unauthorized" });
    return false;
  }

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

export default router;
