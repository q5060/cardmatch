import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

export default async function globalSetup() {
  const root = path.resolve(__dirname, "..");
  loadEnv({ path: path.join(root, ".env.test") });
  loadEnv({ path: path.join(root, ".env.test.example") });

  process.env.DATABASE_URL ??= "file:./test.db";
  process.env.SESSION_SECRET ??=
    "test-session-secret-at-least-32-chars-long";
  process.env.REALTIME_BUS ??= "memory";

  const dbPath = path.join(root, "prisma", "test.db");
  for (const file of [dbPath, `${dbPath}-journal`]) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  execSync("npx prisma migrate deploy", {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env },
  });
}
