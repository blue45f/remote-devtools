import { expect, test } from "@playwright/test";

test.describe("Auth pages", () => {
  test("sign-in form submits in demo mode and routes to dashboard", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByPlaceholder(/you@team\.com/).fill("ada@example.com");
    await page.getByRole("button", { name: /Continue with email/ }).click();
    await page.waitForURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Dashboard/ }),
    ).toBeVisible();
  });

  test("sign-up page renders waitlist form with name + email", async ({
    page,
  }) => {
    await page.goto("/sign-up");
    await expect(page.getByPlaceholder(/Jane Cooper/)).toBeVisible();
    await expect(page.getByPlaceholder(/you@team\.com/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Join the waitlist/ }),
    ).toBeVisible();
  });
});

test.describe("Pricing", () => {
  test("renders three plans", async ({ page }) => {
    await page.goto("/pricing");
    await expect(
      page.getByRole("heading", { level: 1, name: /Self-host free/ }),
    ).toBeVisible();
    // Each tier has a heading-level plan name
    await expect(
      page.getByRole("heading", { name: "Self-hosted" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Starter" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
  });
});
