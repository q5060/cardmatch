import { expect, test } from "@playwright/test";
import { createUser, testPrisma } from "../tests/helpers/db";

test.describe("match report", () => {
  test("logged-in player can report opponent and end match", async ({ page }) => {
    const suffix = Date.now();
    const password = "password12";
    const emailA = `report-a-${suffix}@example.com`;
    const emailB = `report-b-${suffix}@example.com`;

    const [userA, userB] = await Promise.all([
      createUser({
        email: emailA,
        password,
        displayName: "Reporter",
      }),
      createUser({
        email: emailB,
        password,
        displayName: "Opponent",
      }),
    ]);

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

    await page.goto("/login");
    await page.getByTestId("login-email").fill(emailA);
    await page.getByTestId("login-password").fill(password);
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL(/\/(profile|battle)/);

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

    const row = await testPrisma.match.findUnique({ where: { id: match.id } });
    expect(row?.status).toBe("CANCELLED");

    const report = await testPrisma.userReport.findFirst({
      where: { matchId: match.id },
    });
    expect(report?.reportedId).toBe(userB.id);
  });
});
