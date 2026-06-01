import { expect, test } from "@playwright/test";
import { createUser, testPrisma } from "../tests/helpers/db";

test.describe("match report", () => {
  test("logged-in player can report opponent and end match", async ({
    page,
  }) => {
    const suffix = Date.now();
    const password = "password12";
    const emailA = `report-a-${suffix}@example.com`;
    const emailB = `report-b-${suffix}@example.com`;

    // Register B in DB only — must not call /api/auth/register here; it would
    // overwrite the browser session cookie for player A.
    await createUser({
      email: emailB,
      password,
      displayName: "Opponent",
    });

    await page.goto("/register");
    await page.getByTestId("register-display-name").fill("Reporter");
    await page.getByTestId("register-email").fill(emailA);
    await page.getByTestId("register-password").fill(password);
    await page.getByTestId("register-submit").click();
    await expect(page).toHaveURL(/\/profile/, { timeout: 15_000 });

    const userA = await testPrisma.user.findUniqueOrThrow({
      where: { email: emailA.toLowerCase() },
      select: { id: true },
    });
    const userB = await testPrisma.user.findUniqueOrThrow({
      where: { email: emailB.toLowerCase() },
      select: { id: true },
    });

    const match = await testPrisma.match.create({
      data: {
        playerAId: userA.id,
        playerBId: userB.id,
        invitedById: userA.id,
        status: "ACCEPTED",
        meetLat: 25.033,
        meetLng: 121.565,
        meetLabel: "檢舉測試地點",
      },
    });

    await page.goto("/battle");
    await expect(page.getByTestId("match-report-open")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByTestId("match-report-open").click();
    await page.getByTestId("match-report-cat-NOT_READY").check();
    await page.getByTestId("match-report-next").click();
    await page.getByTestId("match-report-confirm").click();

    await expect(page.getByText(/已送出檢舉/)).toBeVisible({
      timeout: 15_000,
    });

    await expect
      .poll(async () =>
        page.evaluate(async () => {
          const res = await fetch("/api/matches/active");
          if (!res.ok) return "pending";
          const body = (await res.json()) as { activeMatch: unknown };
          return body.activeMatch;
        }),
      )
      .toBeNull();

    const row = await testPrisma.match.findUnique({ where: { id: match.id } });
    expect(row?.status).toBe("CANCELLED");

    const report = await testPrisma.userReport.findFirst({
      where: { matchId: match.id },
    });
    expect(report?.reportedId).toBe(userB.id);
  });
});
