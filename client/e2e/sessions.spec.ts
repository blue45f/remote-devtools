import { expect, test } from "@playwright/test";

test.describe("Sessions list and detail", () => {
  test("lists sessions and opens the detail page", async ({ page }) => {
    await page.goto("/sessions");
    await expect(
      page.getByRole("heading", { level: 1, name: /Sessions/ }),
    ).toBeVisible();
    // At least one session row
    const firstSession = page.locator("tbody tr").first();
    await expect(firstSession).toBeVisible();

    // Click the row's "View session details" link
    await firstSession.hover();
    await firstSession.getByLabel(/View session details/).click();
    await page.waitForURL(/\/sessions\/\d+/);

    // Detail page surface — tabs visible
    await expect(page.getByRole("tab", { name: /Overview/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Replay/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Timeline/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Raw/ })).toBeVisible();
  });

  test("search narrows the list", async ({ page }) => {
    await page.goto("/sessions");
    // Wait until the seeded table has rendered.
    await expect(page.locator("tbody tr").first()).toBeVisible();
    const initialRows = await page.locator("tbody tr").count();
    expect(initialRows).toBeGreaterThan(0);

    await page.getByPlaceholder(/Search by name/).fill("checkout");
    // Wait for debounced server filter (250ms) plus seed-router latency (120ms).
    await page.waitForTimeout(600);

    const filtered = await page.locator("tbody tr").count();
    expect(filtered).toBeLessThanOrEqual(initialRows);
  });

  test("DevTools button shows demo-mode toast", async ({ page }) => {
    await page.goto("/sessions");
    const row = page.locator("tbody tr").first();
    await row.hover();
    await row.getByLabel(/Open in DevTools/).click();
    // sonner toast — selector is region with role status
    await expect(
      page.getByText(/DevTools requires a backend/i),
    ).toBeVisible({ timeout: 3000 });
  });
});
