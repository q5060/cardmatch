/**
 * Copy all Card rows from local DB to production (Vercel Postgres / Neon).
 *
 * Usage:
 *   npm run db:sync-cards
 *
 * Requires .env (local DATABASE_URL) and either:
 *   - PRODUCTION_DATABASE_URL in .env.production.local, or
 *   - DATABASE_URL from `vercel env pull .env.production.local --environment=production`
 */
import { parse } from "dotenv";
import fs from "fs";
import { PrismaClient, type Card } from "@prisma/client";

const localEnv = fs.existsSync(".env")
  ? parse(fs.readFileSync(".env"))
  : {};
const localUrl =
  process.env.LOCAL_DATABASE_URL?.replace(/^["']|["']$/g, "") ??
  localEnv.DATABASE_URL?.replace(/^["']|["']$/g, "") ??
  "";

// Production: from `vercel env run --environment=production` or explicit var / file
let productionUrl =
  process.env.PRODUCTION_DATABASE_URL?.replace(/^["']|["']$/g, "") ?? "";
if (!productionUrl && process.env.VERCEL_ENV) {
  productionUrl = process.env.DATABASE_URL?.replace(/^["']|["']$/g, "") ?? "";
}
if (!productionUrl && fs.existsSync(".env.production.local")) {
  const prod = parse(fs.readFileSync(".env.production.local"));
  productionUrl =
    prod.PRODUCTION_DATABASE_URL?.replace(/^["']|["']$/g, "") ??
    prod.DATABASE_URL?.replace(/^["']|["']$/g, "") ??
    prod.DATABASE_POSTGRES_URL?.replace(/^["']|["']$/g, "") ??
    "";
}

if (!localUrl) {
  console.error("Missing LOCAL_DATABASE_URL or DATABASE_URL in .env");
  process.exit(1);
}

// CLI override: npm run db:sync-cards -- "postgresql://..."
const cliUrl = process.argv[2]?.replace(/^["']|["']$/g, "");
if (cliUrl) {
  productionUrl = cliUrl;
}

if (!productionUrl) {
  console.error(
    "Missing production DATABASE_URL.\n" +
      "Copy from Vercel → Settings → Environment Variables → DATABASE_URL (Production).\n" +
      'Run: npm run db:sync-cards -- "postgresql://..."',
  );
  process.exit(1);
}

if (localUrl === productionUrl) {
  console.error("LOCAL and PRODUCTION DATABASE_URL are the same — aborting.");
  process.exit(1);
}

const local = new PrismaClient({
  datasources: { db: { url: localUrl } },
});

const remote = new PrismaClient({
  datasources: { db: { url: productionUrl } },
});

function cardData(card: Card) {
  return {
    name: card.name,
    category: card.category,
    stage: card.stage,
    type: card.type,
    hp: card.hp,
    subType: card.subType,
    isAceSpec: card.isAceSpec,
    regulationMark: card.regulationMark,
    imageUrl: card.imageUrl,
    sourceUrl: card.sourceUrl,
  };
}

async function main() {
  console.log("Applying migrations on production...");
  const { execSync } = await import("child_process");
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: productionUrl },
  });

  const cards = await local.card.findMany({ orderBy: { id: "asc" } });
  console.log(`Local cards: ${cards.length}`);

  const before = await remote.card.count();
  console.log(`Production cards before: ${before}`);

  let synced = 0;
  for (const card of cards) {
    const data = cardData(card);
    await remote.card.upsert({
      where: { sourceUrl: card.sourceUrl },
      update: data,
      create: data,
    });
    synced++;
    if (synced % 100 === 0 || synced === cards.length) {
      console.log(`Synced ${synced}/${cards.length}`);
    }
  }

  const after = await remote.card.count();
  console.log(`Production cards after: ${after}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await local.$disconnect();
    await remote.$disconnect();
  });
