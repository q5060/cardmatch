import { spawnSync } from "node:child_process";
import { config } from "dotenv";

config();

/**
 * Run `prisma migrate deploy` with retries.
 * Vercel can start multiple builds at once; only one migration can hold the
 * Postgres advisory lock, so the others need to wait and retry.
 */
if (!process.env.DIRECT_DATABASE_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_DATABASE_URL = process.env.DATABASE_URL;
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
