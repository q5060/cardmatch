import { expect, test } from "@playwright/test";

test.describe("auth", () => {
  test("allows guests to browse battle map but requires login for random match", async ({
    page,
  }) => {
    await page.goto("/battle");
    await expect(page).toHaveURL(/\/battle/);
    await page.getByRole("button", { name: "隨機配對" }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Fbattle/);
  });

  test("registers a new account", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByTestId("register-display-name").fill("E2E User");
    await page.getByTestId("register-email").fill(email);
    await page.getByTestId("register-password").fill("password12");
    await page.getByTestId("register-submit").click();
    await expect(page).toHaveURL(/\/profile/);
  });

  test("shows error on invalid login", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("nobody@example.com");
    await page.getByTestId("login-password").fill("wrong-password");
    await page.getByTestId("login-submit").click();
    await expect(page.getByText("帳號或密碼錯誤")).toBeVisible();
  });
});
