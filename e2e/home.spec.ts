import { expect, test } from "@playwright/test";

test.describe("homepage", () => {
  test("guest sees hero and battle CTA", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "探索對戰地圖" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /如何使用/ })).toBeVisible();
  });
});
