import { beforeEach, describe, expect, it } from "vitest";
import { getHomeAnnouncementStats } from "@/lib/queries";
import { createLookingMeetSpot, createUser, resetTables } from "../helpers/db";

describe("queries", () => {
  beforeEach(async () => {
    await resetTables();
  });

  it("getHomeAnnouncementStats returns player count and recent announcements", async () => {
    const user = await createUser({
      email: "player@example.com",
      password: "password12",
      displayName: "地圖玩家",
    });
    await createLookingMeetSpot(user.id, { label: "台北車站" });

    const stats = await getHomeAnnouncementStats(3);
    expect(stats.playerCount).toBeGreaterThanOrEqual(1);
    expect(stats.recent.length).toBeGreaterThanOrEqual(1);
    expect(stats.recent[0]?.displayName).toBe("地圖玩家");
    expect(stats.recent[0]?.label).toBe("台北車站");
  });
});
