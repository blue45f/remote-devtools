import { expect, test } from "@playwright/test";

test.describe("Dashboard", () => {
  test("renders hero metrics and the trend chart", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { level: 1, name: /Dashboard/ }),
    ).toBeVisible();

    // Hero tile labels (seeded data is non-zero)
    await expect(page.getByText(/Sessions today/)).toBeVisible();
    await expect(page.getByText(/Tickets today/)).toBeVisible();

    // Hand-rolled SVG chart should be present
    const chart = page.getByRole("img", { name: /trend chart/i });
    await expect(chart).toBeVisible();
  });

  test("activity feed renders entries", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText(/Recent activity/)).toBeVisible();
    // Demo seeds at least one entry
    const items = page.locator("ol li");
    await expect(items.first()).toBeVisible({ timeout: 5000 });
  });

  test("command palette opens with the topbar search trigger", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // The topbar search button toggles the palette — exercise that instead of
    // the keyboard shortcut, which is OS-conditional and flaky in headless.
    await page.getByRole("button", { name: /Open command palette/ }).click();
    await expect(
      page.getByPlaceholder(/Type a command/),
    ).toBeVisible({ timeout: 2000 });
  });
});
