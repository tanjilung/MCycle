import { expect, test } from "@playwright/test";

test("landing page shows app title and auth links", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Understand your menstrual cycle with privacy-first predictions.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Create account" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Login with passkey" })).toBeVisible();
});

test("login page is reachable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Login with passkey" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Login to MCycle" })).toBeVisible();
});
