/**
 * Seed script: Add _@mycelium.social NIP-05 identity.
 * Run with: npx tsx src/seed-nip05.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const domain = process.env.CREATOR_DOMAIN || "mycelium.social";
  const name = "_";
  const pubkey = "50809a53fef95904513a840d4082a92b45cd5f1b9e436d9d2b92a89ce091f164";

  // Check if already exists
  const existing = await prisma.nip05.findFirst({ where: { name, domain } });
  if (existing) {
    console.log(`✓ ${name}@${domain} already exists (id: ${existing.id}, pubkey: ${existing.pubkey})`);
    if (existing.pubkey !== pubkey) {
      await prisma.nip05.update({ where: { id: existing.id }, data: { pubkey } });
      console.log(`  Updated pubkey to ${pubkey}`);
    }
    return;
  }

  const entry = await prisma.nip05.create({
    data: {
      name,
      pubkey,
      domain,
      relayUrls: {
        create: [
          { url: "wss://relay.mycelium.social" },
          { url: "wss://permissions.mycelium.social" },
        ],
      },
    },
    include: { relayUrls: true },
  });

  console.log(`✓ Created ${name}@${domain}`);
  console.log(`  id: ${entry.id}`);
  console.log(`  pubkey: ${entry.pubkey}`);
  console.log(`  relays: ${entry.relayUrls.map((r) => r.url).join(", ")}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
