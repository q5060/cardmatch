import { beforeEach, describe, expect, it } from "vitest";
import { sendInviteFromSpot } from "@/actions/match";
import { STALE_ANNOUNCEMENT_ERROR } from "@/lib/meetSpotErrors";
import { clearTestCookies } from "../helpers/auth";
import {
  createLookingMeetSpot,
  createUser,
  resetTables,
  testPrisma,
} from "../helpers/db";
import { loginAsUser } from "../helpers/session";

describe("sendInviteFromSpot", () => {
  beforeEach(async () => {
    clearTestCookies();
    await resetTables();
  });

  it("clears the announcement pin when someone invites", async () => {
    const [publisher, inviter] = await Promise.all([
      createUser({
        email: "pub@example.com",
        password: "password12",
        displayName: "Pub",
      }),
      createUser({
        email: "inv@example.com",
        password: "password12",
        displayName: "Inv",
      }),
    ]);

    const spot = await createLookingMeetSpot(publisher.id);

    await loginAsUser("inv@example.com");
    await sendInviteFromSpot(spot.id);

    const updated = await testPrisma.meetSpot.findUnique({
      where: { id: spot.id },
    });
    expect(updated?.looking).toBe(false);
  });

  it("rejects a second invite after the spot is claimed", async () => {
    const [publisher, inviterA, inviterB] = await Promise.all([
      createUser({
        email: "pub@example.com",
        password: "password12",
        displayName: "Pub",
      }),
      createUser({
        email: "inv-a@example.com",
        password: "password12",
        displayName: "InvA",
      }),
      createUser({
        email: "inv-b@example.com",
        password: "password12",
        displayName: "InvB",
      }),
    ]);

    const spot = await createLookingMeetSpot(publisher.id);

    await loginAsUser("inv-a@example.com");
    await sendInviteFromSpot(spot.id);

    clearTestCookies();
    await loginAsUser("inv-b@example.com");
    await expect(sendInviteFromSpot(spot.id)).rejects.toThrow(STALE_ANNOUNCEMENT_ERROR);

    const matches = await testPrisma.match.findMany({
      where: { invitedById: { in: [inviterA.id, inviterB.id] } },
    });
    expect(matches).toHaveLength(1);
  });
});
