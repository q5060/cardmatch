import { spawnSync } from "node:child_process";

/**
 * Run `prisma migrate deploy` with retries.
 * Use via `npm run db:deploy` — not during Vercel build (concurrent deploys
 * fight for the Postgres advisory lock and cause P1002 timeouts).
 */
if (!process.env.DIRECT_DATABASE_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_DATABASE_URL = process.env.DATABASE_URL;
}

if (!process.env.DATABASE_URL) {
  console.error("[migrate-deploy] DATABASE_URL is not set");
  process.exit(1);
}

const maxAttempts = 6;
const baseDelayMs = 5_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runMigrate() {
  return spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
  });
}

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const result = runMigrate();
  if (result.status === 0) {
    process.exit(0);
  }

  if (attempt >= maxAttempts) break;

  const delayMs = baseDelayMs * attempt;
  console.warn(
    `[migrate-deploy] attempt ${attempt}/${maxAttempts} failed; retrying in ${delayMs / 1000}s…`,
  );
  await sleep(delayMs);
}

console.error("[migrate-deploy] all attempts failed");
process.exit(1);
