import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { verifyEvent } from "nostr-tools";

const router: Router = Router();

interface Nip86Request {
  method: string;
  params: any[];
}

interface Nip86Response {
  result?: any;
  error?: string;
}

const SUPPORTED_METHODS = [
  "supportedmethods",
  "banpubkey",
  "listbannedpubkeys",
  "allowpubkey",
  "deleteallowedpubkey",
  "listallowedpubkeys",
  "banevent",
  "changerelaydescription",
  "changerelayicon",
  "allowkind",
  "disallowkind",
  "listallowedkinds",
];

async function verifyNip98Event(
  authHeader: string,
  requestUrl: string
): Promise<{ valid: boolean; pubkey?: string; error?: string }> {
  try {
    if (!authHeader.startsWith("Nostr ")) {
      return { valid: false, error: "Invalid Authorization header format" };
    }

    const base64Event = authHeader.substring(6);
    const eventJson = Buffer.from(base64Event, "base64").toString("utf-8");
    const event = JSON.parse(eventJson);

    if (!verifyEvent(event)) {
      return { valid: false, error: "Invalid event signature" };
    }

    if (event.kind !== 27235) {
      return { valid: false, error: "Invalid event kind, expected 27235" };
    }

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - event.created_at) > 60) {
      return { valid: false, error: "Event is too old or from the future" };
    }

    const methodTag = event.tags.find((tag: string[]) => tag[0] === "method");
    const uTag = event.tags.find((tag: string[]) => tag[0] === "u");
    const payloadTag = event.tags.find((tag: string[]) => tag[0] === "payload");

    if (!methodTag) return { valid: false, error: "Missing method tag" };
    if (!uTag) return { valid: false, error: "Missing u tag" };
    if (!payloadTag) return { valid: false, error: "Missing payload tag" };
    if (methodTag[1] !== "POST") return { valid: false, error: "Invalid method" };

    const relayUrl = new URL(requestUrl, "https://example.com").pathname;
    if (!uTag[1].includes(relayUrl)) {
      return { valid: false, error: "URL mismatch" };
    }

    return { valid: true, pubkey: event.pubkey };
  } catch (error) {
    console.error("Error verifying NIP-98 event:", error);
    return { valid: false, error: "Error verifying authorization" };
  }
}

function validatePubkey(pubkeyInput: string): { valid: boolean; error?: string } {
  if (typeof pubkeyInput !== "string" || !/^[a-f0-9]{64}$/.test(pubkeyInput)) {
    return { valid: false, error: "Invalid pubkey. Must be a 64-character hexadecimal string" };
  }
  return { valid: true };
}

/**
 * POST /86/:id
 * NIP-86 relay management endpoint.
 */
router.post("/:id", async (req: Request, res: Response) => {
  try {
    const relayId = req.params.id as string;
    if (!relayId) {
      res.status(400).json({ error: "Relay ID not found in request" });
      return;
    }

    // Parse body if string (for application/nostr+json+rpc content type)
    let parsedBody = req.body;
    if (typeof req.body === "string") {
      try {
        parsedBody = JSON.parse(req.body);
      } catch {
        res.status(400).json({ error: "Invalid JSON in request body" });
        return;
      }
    }

    // Verify NIP-98 authorization
    const authHeader = req.headers.authorization as string;
    if (!authHeader) {
      res.status(401).json({ error: "Authorization header required" });
      return;
    }

    const relayCheck = await prisma.relay.findFirst({ where: { id: relayId } });
    if (!relayCheck) {
      res.status(404).json({ error: "Relay not found" });
      return;
    }

    const relayUrl = `https://${relayCheck.name}.${relayCheck.domain}`;
    const verificationResult = await verifyNip98Event(authHeader, relayUrl);
    if (!verificationResult.valid) {
      res.status(401).json({ error: verificationResult.error || "Invalid authorization" });
      return;
    }

    const authorizedPubkey = verificationResult.pubkey;
    if (!authorizedPubkey) {
      res.status(401).json({ error: "Unable to extract pubkey from authorization" });
      return;
    }

    // Check if user is owner or moderator
    const relay = await prisma.relay.findFirst({
      where: { id: relayId, owner: { pubkey: authorizedPubkey } },
    });

    if (!relay) {
      const moderator = await prisma.moderator.findFirst({
        where: { relayId, user: { pubkey: authorizedPubkey } },
        include: { user: true },
      });
      if (!moderator) {
        res.status(403).json({ error: "Not authorized to manage this relay" });
        return;
      }
    }

    const { method, params } = parsedBody as Nip86Request;
    if (!method) {
      res.status(400).json({ error: "Invalid request format" });
      return;
    }

    let response: Nip86Response = {};

    switch (method) {
      case "supportedmethods":
        response.result = SUPPORTED_METHODS;
        break;

      case "banpubkey": {
        if (!params || params.length < 1) {
          response.error = "Missing required parameters";
        } else {
          const pubkey = params[0];
          const reason = params[1] || "";
          const validation = validatePubkey(pubkey);
          if (!validation.valid) {
            res.status(400).json({ error: validation.error });
            return;
          }

          let blockList = await prisma.blockList.findUnique({ where: { relayId } });
          if (!blockList) {
            blockList = await prisma.blockList.create({ data: { relayId } });
          }

          await prisma.listEntryPubkey.create({
            data: { BlockListId: blockList.id, pubkey, reason },
          });

          const allowList = await prisma.allowList.findUnique({
            where: { relayId },
            include: { list_pubkeys: true },
          });
          if (allowList) {
            await prisma.listEntryPubkey.deleteMany({
              where: { AllowListId: allowList.id, pubkey },
            });
          }

          await prisma.job.create({
            data: { relayId, kind: "deletePubkey", status: "queue", pubkey },
          });

          response.result = true;
        }
        break;
      }

      case "listbannedpubkeys": {
        const blockList = await prisma.blockList.findUnique({
          where: { relayId },
          include: { list_pubkeys: true },
        });
        response.result = blockList
          ? blockList.list_pubkeys.map((item: any) => ({ pubkey: item.pubkey, reason: item.reason || "" }))
          : [];
        break;
      }

      case "deleteallowedpubkey": {
        if (!params || params.length < 1) {
          response.error = "Missing required parameters";
        } else {
          const pubkey = params[0];
          const validation = validatePubkey(pubkey);
          if (!validation.valid) {
            res.status(400).json({ error: validation.error });
            return;
          }

          let allowList = await prisma.allowList.findUnique({ where: { relayId } });
          if (!allowList) {
            allowList = await prisma.allowList.create({ data: { relayId } });
          }

          await prisma.listEntryPubkey.deleteMany({
            where: { AllowListId: allowList.id, pubkey },
          });

          response.result = true;
        }
        break;
      }

      case "allowpubkey": {
        if (!params || params.length < 1) {
          response.error = "Missing required parameters";
        } else {
          const pubkey = params[0];
          const reason = params[1] || "";
          const validation = validatePubkey(pubkey);
          if (!validation.valid) {
            res.status(400).json({ error: validation.error });
            return;
          }

          const blockList = await prisma.blockList.findUnique({
            where: { relayId },
            include: { list_pubkeys: true },
          });
          if (blockList) {
            const bannedEntry = blockList.list_pubkeys.find((item: any) => item.pubkey === pubkey);
            if (bannedEntry) {
              await prisma.listEntryPubkey.delete({ where: { id: bannedEntry.id } });
            }
          }

          let allowList = await prisma.allowList.findUnique({ where: { relayId } });
          if (!allowList) {
            allowList = await prisma.allowList.create({ data: { relayId } });
          }

          await prisma.listEntryPubkey.create({
            data: { AllowListId: allowList.id, pubkey, reason },
          });

          response.result = true;
        }
        break;
      }

      case "listallowedpubkeys": {
        const allowList = await prisma.allowList.findUnique({
          where: { relayId },
          include: { list_pubkeys: true },
        });
        response.result = allowList
          ? allowList.list_pubkeys.map((item: any) => ({ pubkey: item.pubkey, reason: item.reason || "" }))
          : [];
        break;
      }

      case "allowkind": {
        if (!params || params.length < 1) {
          response.error = "Missing required parameters";
        } else {
          const kindNumber = params[0];
          let allowList = await prisma.allowList.findUnique({ where: { relayId } });
          if (!allowList) {
            allowList = await prisma.allowList.create({ data: { relayId } });
          }
          await prisma.listEntryKind.create({
            data: { AllowListId: allowList.id, kind: kindNumber },
          });
          response.result = true;
        }
        break;
      }

      case "disallowkind": {
        if (!params || params.length < 1) {
          response.error = "Missing required parameters";
        } else {
          const kindNumber = params[0];
          const allowList = await prisma.allowList.findUnique({
            where: { relayId },
            include: { list_kinds: true },
          });
          if (allowList) {
            const kindEntry = allowList.list_kinds.find((item: any) => item.kind === kindNumber);
            if (kindEntry) {
              await prisma.listEntryKind.delete({ where: { id: kindEntry.id } });
            }
          }
          response.result = true;
        }
        break;
      }

      case "listallowedkinds": {
        const allowListForKinds = await prisma.allowList.findUnique({
          where: { relayId },
          include: { list_kinds: true },
        });
        response.result = allowListForKinds
          ? allowListForKinds.list_kinds.map((item: any) => item.kind)
          : [];
        break;
      }

      case "changerelaydescription": {
        if (!params || params.length < 1) {
          response.error = "Missing required parameters";
        } else {
          await prisma.relay.update({ where: { id: relayId }, data: { details: params[0] } });
          response.result = true;
        }
        break;
      }

      case "changerelayicon": {
        if (!params || params.length < 1) {
          response.error = "Missing required parameters";
        } else {
          await prisma.relay.update({ where: { id: relayId }, data: { banner_image: params[0] } });
          response.result = true;
        }
        break;
      }

      case "banevent": {
        if (!params || params.length < 1) {
          response.error = "Missing required parameters";
        } else {
          const eventId = params[0];
          if (typeof eventId !== "string" || !/^[a-f0-9]{64}$/.test(eventId)) {
            response.error = "Invalid event ID";
            break;
          }
          await prisma.job.create({
            data: { relayId, kind: "deleteEvent", status: "queue", eventId },
          });
          response.result = true;
        }
        break;
      }

      default:
        response.error = `Method '${method}' not supported`;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error processing NIP-86 request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
