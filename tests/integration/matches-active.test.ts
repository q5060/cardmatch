import { beforeEach, describe, expect, it } from "vitest";
import { GET as activeGet } from "@/app/api/matches/active/route";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { clearTestCookies } from "../helpers/auth";
import { createUser, resetTables, testPrisma } from "../helpers/db";
import { MATCH_STATUS } from "@/lib/constants";

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/matches/active", () => {
  beforeEach(async () => {
    clearTestCookies();
    await resetTables();
  });

  it("returns 401 when not logged in", async () => {
    const res = await activeGet();
    expect(res.status).toBe(401);
  });

  it("returns active match DTO for logged-in participant", async () => {
    const [a, b] = await Promise.all([
      createUser({
        email: "a@example.com",
        password: "password12",
        displayName: "Player A",
      }),
      createUser({
        email: "b@example.com",
        password: "password12",
        displayName: "Player B",
      }),
    ]);

    await testPrisma.match.create({
      data: {
        playerAId: a.id,
        playerBId: b.id,
        invitedById: a.id,
        status: MATCH_STATUS.ACCEPTED,
        meetLat: 25.033,
        meetLng: 121.565,
        meetLabel: "測試",
      },
    });

    await loginPost(
      jsonRequest("http://localhost/api/auth/login", {
        email: "a@example.com",
        password: "password12",
      }),
    );

    const res = await activeGet();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      activeMatch: { status: string; meetLabel: string } | null;
    };
    expect(body.activeMatch?.status).toBe(MATCH_STATUS.ACCEPTED);
    expect(body.activeMatch?.meetLabel).toBe("測試");
  });
});
