import { beforeEach, describe, expect, it } from "vitest";
import { createInviteMatch } from "@/lib/matchInvite";
import {
  acceptInviteForUser,
  setReadyForUser,
} from "@/lib/matchLifecycle";
import { MATCH_STATUS } from "@/lib/constants";
import { createUser, resetTables, testPrisma } from "../helpers/db";

const meet = {
  lat: 25.033,
  lng: 121.565,
  label: "測試地點",
  shopId: null as string | null,
};

describe("match lifecycle", () => {
  beforeEach(async () => {
    await resetTables();
  });

  it("accepts invite then starts battle when both ready", async () => {
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

    let row = await testPrisma.match.findUnique({ where: { id: match.id } });
    expect(row?.status).toBe(MATCH_STATUS.ACCEPTED);

    await setReadyForUser(match.id, inviter.id, true);
    await setReadyForUser(match.id, target.id, true);

    row = await testPrisma.match.findUnique({ where: { id: match.id } });
    expect(row?.status).toBe(MATCH_STATUS.IN_PROGRESS);
    expect(row?.playerAReady).toBe(true);
    expect(row?.playerBReady).toBe(true);
  });

  it("rejects accept from inviter", async () => {
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

    await expect(acceptInviteForUser(match.id, inviter.id)).rejects.toThrow(
      "不能接受自己發出的邀請",
    );
  });
});
