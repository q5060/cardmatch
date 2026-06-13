import { beforeEach, describe, expect, it } from "vitest";
import { finishMatch } from "@/actions/match";
import { createInviteMatch } from "@/lib/matchInvite";
import {
  acceptInviteForUser,
  setReadyForUser,
} from "@/lib/matchLifecycle";
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

describe("finishMatch (server action)", () => {
  beforeEach(async () => {
    clearTestCookies();
    await resetTables();
  });

  it("completes match when both players agree on winner", async () => {
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

    await loginAsUser("inviter@example.com");
    const first = await finishMatch(match.id.toString(), inviter.id, false);
    expect(first.completed).toBe(false);

    clearTestCookies();
    await loginAsUser("target@example.com");
    const second = await finishMatch(match.id.toString(), inviter.id, false);
    expect(second.completed).toBe(true);
    if (second.completed) {
      expect(second.share?.matchId).toBe(match.id);
    }

    const row = await testPrisma.match.findUnique({ where: { id: match.id } });
    expect(row?.status).toBe(MATCH_STATUS.COMPLETED);
  });

  it("rejects conflicting winner submissions", async () => {
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

    await loginAsUser("inviter@example.com");
    await finishMatch(match.id.toString(), inviter.id, false);

    clearTestCookies();
    await loginAsUser("target@example.com");
    await expect(
      finishMatch(match.id.toString(), target.id, false),
    ).rejects.toThrow("雙方送出之結果不相符");
  });
});
