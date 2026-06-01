import { beforeEach, describe, expect, it } from "vitest";
import { createInviteMatch } from "@/lib/matchInvite";
import {
  acceptInviteForUser,
  setReadyForUser,
} from "@/lib/matchLifecycle";
import { executeMatchReport } from "@/lib/matchReport";
import {
  MATCH_REPORT_CATEGORIES,
  normalizeMatchReportCategories,
} from "@/lib/matchReportCategories";
import { MATCH_STATUS } from "@/lib/constants";
import { createUser, resetTables, testPrisma } from "../helpers/db";

const meet = {
  lat: 25.033,
  lng: 121.565,
  label: "測試地點",
  shopId: null as string | null,
};

describe("matchReport", () => {
  beforeEach(async () => {
    await resetTables();
  });

  it("normalizes categories", () => {
    expect(
      normalizeMatchReportCategories([
        MATCH_REPORT_CATEGORIES.NOT_READY,
        "INVALID",
        MATCH_REPORT_CATEGORIES.NOT_READY,
      ]),
    ).toEqual([MATCH_REPORT_CATEGORIES.NOT_READY]);
  });

  it("cancels match and creates user report", async () => {
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
    await setReadyForUser(match.id, inviter.id, true);
    await setReadyForUser(match.id, target.id, true);

    await executeMatchReport({
      reporterId: inviter.id,
      matchId: match.id,
      categories: [MATCH_REPORT_CATEGORIES.UNREASONABLE_CANCEL],
      note: "一直要求取消",
    });

    const row = await testPrisma.match.findUnique({ where: { id: match.id } });
    expect(row?.status).toBe(MATCH_STATUS.CANCELLED);

    const report = await testPrisma.userReport.findFirst({
      where: { matchId: match.id },
    });
    expect(report?.reportedId).toBe(target.id);
    expect(report?.reporterId).toBe(inviter.id);
    expect(report?.categories).toBe(MATCH_REPORT_CATEGORIES.UNREASONABLE_CANCEL);
    expect(report?.reason).toBe("一直要求取消");
  });
});
