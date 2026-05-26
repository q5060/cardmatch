import { execSync } from "node:child_process";
import path from "node:path";
import { config as loadEnv } from "dotenv";

const DEFAULT_DATABASE_URL =
  "postgresql://cardmatch:cardmatch@localhost:5432/cardmatch_test";

export default async function globalSetup() {
  const root = path.resolve(__dirname, "..");
  loadEnv({ path: path.join(root, ".env.test") });
  loadEnv({ path: path.join(root, ".env.test.example") });

  process.env.DATABASE_URL ??= DEFAULT_DATABASE_URL;
  process.env.SESSION_SECRET ??=
    "test-session-secret-at-least-32-chars-long";
  process.env.REALTIME_BUS ??= "memory";

  execSync("npx prisma migrate deploy", {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env },
  });
}
