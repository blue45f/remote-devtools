import { expect, test } from "@playwright/test";

/**
 * Mobile smoke test — only runs in the `mobile` project.
 * Verifies the layout doesn't break on a 375px-wide iPhone viewport.
 */
test("mobile: landing renders without horizontal scroll", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /Debug any web page/ }),
  ).toBeVisible();
  // No horizontal overflow on the body
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(2); // 2px tolerance for sub-pixel rounding
});

test("mobile: sidebar trigger opens drawer", async ({ page }) => {
  await page.goto("/dashboard");
  // The desktop sidebar is hidden below lg, the topbar trigger is visible
  await page.getByLabel(/Open sidebar|Expand sidebar/).click();
  // Drawer reveals nav items
  await expect(page.getByRole("link", { name: /Sessions/ })).toBeVisible();
});
