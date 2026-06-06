import { config as loadEnv } from "dotenv";
import path from "node:path";
import { afterEach, vi } from "vitest";

loadEnv({ path: path.resolve(__dirname, "../.env.test") });
loadEnv({ path: path.resolve(__dirname, "../.env.test.example") });

process.env.DATABASE_URL ??=
  "postgresql://cardmatch:cardmatch@localhost:5432/cardmatch_test";
process.env.DIRECT_DATABASE_URL ??= process.env.DATABASE_URL;
process.env.SESSION_SECRET ??=
  "test-session-secret-at-least-32-chars-long";
process.env.REALTIME_BUS ??= "memory";

declare global {
  var __testCookieStore: Map<string, string> | undefined;
}

const testCookieStore = vi.hoisted(() => {
  if (!globalThis.__testCookieStore) {
    globalThis.__testCookieStore = new Map<string, string>();
  }
  return globalThis.__testCookieStore;
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/realtime/publish", () => ({
  publishMatchSnapshot: vi.fn(),
  publishMatchCompleted: vi.fn(),
  publishNotification: vi.fn(),
  publishToUser: vi.fn(),
  publishMatchMessage: vi.fn(),
  publishFriendMessage: vi.fn(),
  getUnreadCount: vi.fn().mockResolvedValue(0),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = testCookieStore.get(name);
      return value ? { name, value } : undefined;
    },
    set: (name: string, value: string) => {
      testCookieStore.set(name, value);
    },
    delete: (name: string) => {
      testCookieStore.delete(name);
    },
    getAll: () =>
      [...testCookieStore.entries()].map(([name, value]) => ({ name, value })),
  }),
}));

afterEach(() => {
  testCookieStore.clear();
});
