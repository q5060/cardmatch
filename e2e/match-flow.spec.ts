import { expect, test } from "@playwright/test";
import {
  createLookingMeetSpot,
  fillProfileIdentification,
  testPrisma,
} from "../tests/helpers/db";

test.describe.serial("match flow", () => {
  test("two users invite, accept, and start battle", async ({ browser }) => {
    test.setTimeout(120_000);

    const suffix = Date.now();
    const emailA = `player-a-${suffix}@example.com`;
    const emailB = `player-b-${suffix}@example.com`;
    const password = "password12";

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      await pageA.goto("/register");
      await pageA.getByTestId("register-display-name").fill("Player A");
      await pageA.getByTestId("register-email").fill(emailA);
      await pageA.getByTestId("register-password").fill(password);
      await pageA.getByTestId("register-submit").click();
      await expect(pageA).toHaveURL(/\/profile/);

      const userA = await testPrisma.user.findUniqueOrThrow({
        where: { email: emailA.toLowerCase() },
      });
      await fillProfileIdentification(userA.id);

      await createLookingMeetSpot(userA.id, {
        label: "E2E 約戰地點",
        playNote: "週末練習",
      });

      await pageB.goto("/register");
      await pageB.getByTestId("register-display-name").fill("Player B");
      await pageB.getByTestId("register-email").fill(emailB);
      await pageB.getByTestId("register-password").fill(password);
      await pageB.getByTestId("register-submit").click();
      await expect(pageB).toHaveURL(/\/profile/);

      const userB = await testPrisma.user.findUniqueOrThrow({
        where: { email: emailB.toLowerCase() },
      });
      await fillProfileIdentification(userB.id);

      await pageB.goto("/battle");
      await expect(
        pageB.getByRole("button", { name: new RegExp(userA.displayName) }).first(),
      ).toBeVisible({ timeout: 15_000 });
      await pageB
        .getByRole("button", { name: new RegExp(userA.displayName) })
        .first()
        .click();
      await pageB.getByTestId("send-invite").click();
      await expect(pageB.getByText("已送出邀請")).toBeVisible({
        timeout: 15_000,
      });

      await pageA.goto("/battle");
      const acceptBtn = pageA.getByTestId("accept-invite");
      await expect(acceptBtn).toBeVisible({ timeout: 20_000 });
      await acceptBtn.click();

      await expect(pageA.getByTestId("mark-ready")).toBeVisible({
        timeout: 20_000,
      });
      await pageA.getByTestId("mark-ready").click();

      await pageB.goto("/battle");
      await expect(pageB.getByTestId("mark-ready")).toBeVisible({
        timeout: 20_000,
      });
      await pageB.getByTestId("mark-ready").click();

      await expect
        .poll(
          async () => {
            const row = await testPrisma.match.findFirst({
              where: {
                OR: [
                  { playerAId: userA.id, playerBId: userB.id },
                  { playerAId: userB.id, playerBId: userA.id },
                ],
              },
            });
            return row?.status ?? null;
          },
          { timeout: 30_000 },
        )
        .toBe("IN_PROGRESS");
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
