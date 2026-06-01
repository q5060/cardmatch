import { beforeEach, describe, expect, it } from "vitest";
import { reportMatchOpponent } from "@/actions/moderation";
import { createInviteMatch } from "@/lib/matchInvite";
import { acceptInviteForUser } from "@/lib/matchLifecycle";
import { MATCH_REPORT_CATEGORIES } from "@/lib/matchReportCategories";
import { MATCH_STATUS } from "@/lib/constants";
import { clearTestCookies } from "../helpers/auth";
import { createUser, resetTables, testPrisma } from "../helpers/db";
import { loginAsUser } from "../helpers/session";

const meet = {
  lat: 25.033,
  lng: 121.565,
  label: "測試地點",
  shopId: null as string | null,
};

describe("reportMatchOpponent (server action)", () => {
  beforeEach(async () => {
    clearTestCookies();
    await resetTables();
  });

  it("cancels match and stores report when logged-in participant reports", async () => {
    const [inviter, target] = await Promise.all([
      createUser({
        email: "inviter@example.com",
        password: "password12",
        displayName: "Inviter",
      }),
      createUser({
        email: "target@example.com",
        password: "password12",
        displayName: "Target",
      }),
    ]);

    const match = await createInviteMatch({
      inviterId: inviter.id,
      targetUserId: target.id,
      meet,
      source: "spot",
    });
    await acceptInviteForUser(match.id, target.id);

    await loginAsUser("inviter@example.com");
    await reportMatchOpponent(
      match.id.toString(),
      [MATCH_REPORT_CATEGORIES.UNREASONABLE_CANCEL],
      "一直按取消",
    );

    const row = await testPrisma.match.findUnique({ where: { id: match.id } });
    expect(row?.status).toBe(MATCH_STATUS.CANCELLED);

    const report = await testPrisma.userReport.findFirst({
      where: { matchId: match.id },
    });
    expect(report?.reportedId).toBe(target.id);
    expect(report?.categories).toBe(MATCH_REPORT_CATEGORIES.UNREASONABLE_CANCEL);
  });

  it("rejects report without categories", async () => {
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

    const match = await testPrisma.match.create({
      data: {
        playerAId: a.id,
        playerBId: b.id,
        invitedById: a.id,
        status: MATCH_STATUS.ACCEPTED,
        meetLat: meet.lat,
        meetLng: meet.lng,
        meetLabel: meet.label,
      },
    });

    await loginAsUser("a@example.com");
    await expect(
      reportMatchOpponent(match.id.toString(), [], ""),
    ).rejects.toThrow("請至少選擇一項原因");
  });
});
