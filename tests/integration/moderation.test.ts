import { beforeEach, describe, expect, it } from "vitest";
import { blockUser, reportUser } from "@/actions/moderation";
import { assertNotBlocked } from "@/lib/block";
import { clearTestCookies } from "../helpers/auth";
import { createUser, resetTables, testPrisma } from "../helpers/db";
import { loginAsUser } from "../helpers/session";

describe("moderation (server actions)", () => {
  beforeEach(async () => {
    clearTestCookies();
    await resetTables();
  });

  it("creates user report", async () => {
    const [a, b] = await Promise.all([
      createUser({
        email: "a@example.com",
        password: "password12",
        displayName: "A",
      }),
      createUser({
        email: "b@example.com",
        password: "password12",
        displayName: "B",
      }),
    ]);

    await loginAsUser("a@example.com");
    await reportUser(b.id, "騷擾訊息");

    const report = await testPrisma.userReport.findFirst({
      where: { reporterId: a.id, reportedId: b.id },
    });
    expect(report?.reason).toBe("騷擾訊息");
  });

  it("blocks user and prevents new invites", async () => {
    const [a, b] = await Promise.all([
      createUser({
        email: "a@example.com",
        password: "password12",
        displayName: "A",
      }),
      createUser({
        email: "b@example.com",
        password: "password12",
        displayName: "B",
      }),
    ]);

    await loginAsUser("a@example.com");
    await blockUser(b.id);

    await expect(assertNotBlocked(a.id, b.id)).rejects.toThrow(
      "無法與此使用者互動",
    );
  });
});
