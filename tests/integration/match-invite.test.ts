import { beforeEach, describe, expect, it } from "vitest";
import { createInviteMatch } from "@/lib/matchInvite";
import { MATCH_STATUS } from "@/lib/constants";
import { createUser, resetTables, testPrisma } from "../helpers/db";

const meet = {
  lat: 25.033,
  lng: 121.565,
  label: "測試地點",
  shopId: null as string | null,
};

describe("createInviteMatch", () => {
  beforeEach(async () => {
    await resetTables();
  });

  it("creates INVITE_PENDING for spot invites", async () => {
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

    expect(match.status).toBe(MATCH_STATUS.INVITE_PENDING);
    expect(match.invitedById).toBe(inviter.id);
  });

  it("creates ACCEPTED for random matches", async () => {
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

    const match = await createInviteMatch({
      inviterId: a.id,
      targetUserId: b.id,
      meet,
      source: "random",
    });

    expect(match.status).toBe(MATCH_STATUS.ACCEPTED);
  });

  it("rejects when inviter already has active match", async () => {
    const [inviter, target, other] = await Promise.all([
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
      createUser({
        email: "other@example.com",
        password: "password12",
        displayName: "Other",
      }),
    ]);

    await testPrisma.match.create({
      data: {
        playerAId: inviter.id,
        playerBId: other.id,
        invitedById: inviter.id,
        status: MATCH_STATUS.IN_PROGRESS,
        meetLat: meet.lat,
        meetLng: meet.lng,
        meetLabel: meet.label,
      },
    });

    await expect(
      createInviteMatch({
        inviterId: inviter.id,
        targetUserId: target.id,
        meet,
        source: "spot",
      }),
    ).rejects.toThrow("你已有進行中的約戰");
  });

  it("rejects when inviter already has active match from prior invite", async () => {
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

    await createInviteMatch({
      inviterId: inviter.id,
      targetUserId: target.id,
      meet,
      source: "spot",
    });

    await expect(
      createInviteMatch({
        inviterId: inviter.id,
        targetUserId: target.id,
        meet,
        source: "spot",
      }),
    ).rejects.toThrow("你已有進行中的約戰");
  });
});
