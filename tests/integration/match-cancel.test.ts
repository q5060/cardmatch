import { beforeEach, describe, expect, it } from "vitest";
import { cancelMatch } from "@/actions/match";
import { createInviteMatch } from "@/lib/matchInvite";
import { acceptInviteForUser } from "@/lib/matchLifecycle";
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

describe("cancelMatch (server action)", () => {
  beforeEach(async () => {
    clearTestCookies();
    await resetTables();
  });

  it("cancels match when both players agree to cancel", async () => {
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
    await cancelMatch(match.id.toString());

    let row = await testPrisma.match.findUnique({ where: { id: match.id } });
    expect(row?.cancelRequestedBy).toBe(inviter.id);

    clearTestCookies();
    await loginAsUser("target@example.com");
    await cancelMatch(match.id.toString());

    row = await testPrisma.match.findUnique({ where: { id: match.id } });
    expect(row?.status).toBe(MATCH_STATUS.CANCELLED);
    expect(row?.cancelRequestedBy).toBeNull();
  });
});
