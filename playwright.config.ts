import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, ".env.test") });
loadEnv({ path: path.resolve(__dirname, ".env.test.example") });

const port = process.env.PLAYWRIGHT_PORT ?? "3001";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      PORT: port,
      DATABASE_URL: process.env.DATABASE_URL ?? "file:./test.db",
      SESSION_SECRET:
        process.env.SESSION_SECRET ??
        "test-session-secret-at-least-32-chars-long",
      REALTIME_BUS: "memory",
      NODE_ENV: "production",
    },
  },
  globalSetup: "./e2e/global-setup.ts",
});
