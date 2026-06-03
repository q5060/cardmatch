import { describe, expect, it } from "vitest";
import { toActiveMatchDTO } from "@/lib/matchDto";

describe("toActiveMatchDTO", () => {
  it("maps match row to DTO", () => {
    const dto = toActiveMatchDTO({
      id: 1,
      status: "ACCEPTED",
      invitedById: 2,
      playerAId: 1,
      playerBId: 2,
      playerAReady: true,
      playerBReady: false,
      cancelRequestedBy: null,
      meetLat: 25.033,
      meetLng: 121.565,
      meetLabel: "測試地點",
      playerA: {
        id: 1,
        displayName: "A",
        avatarUrl: null,
        gender: "MALE",
        age: 30,
      },
      playerB: {
        id: 2,
        displayName: "B",
        avatarUrl: "/a.png",
        gender: "FEMALE",
        age: 21,
      },
      shop: null,
    });

    expect(dto).toEqual({
      id: 1,
      status: "ACCEPTED",
      invitedById: 2,
      playerAId: 1,
      playerBId: 2,
      playerAReady: true,
      playerBReady: false,
      cancelRequestedBy: null,
      meetLat: 25.033,
      meetLng: 121.565,
      meetLabel: "測試地點",
      playerA: {
        id: 1,
        displayName: "A",
        avatarUrl: null,
        gender: "MALE",
        age: 30,
      },
      playerB: {
        id: 2,
        displayName: "B",
        avatarUrl: "/a.png",
        gender: "FEMALE",
        age: 21,
      },
    });
  });
});
