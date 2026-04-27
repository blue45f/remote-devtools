import { expect, test } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders hero and primary CTA", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /Debug any web page/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Try the live demo|Try the demo/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /View on GitHub/ }),
    ).toBeVisible();
  });

  test("Try the demo CTA navigates to the dashboard", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: /Try the live demo|Try the demo/ })
      .click();
    await page.waitForURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Dashboard/ }),
    ).toBeVisible();
  });

  test("language toggle persists after reload", async ({ page }) => {
    await page.goto("/dashboard");
    // The Layout renders both desktop and mobile sidebars (CSS-hidden).
    // Pick the visible one — the desktop sidebar is the only one rendered
    // by default on a Desktop Chrome viewport.
    await page
      .getByTestId("language-menu-trigger")
      .filter({ visible: true })
      .first()
      .click();
    await page.getByRole("menuitem", { name: /한국어/ }).click();
    // i18next.changeLanguage is sync but React's update is via state; allow
    // one tick for the Topbar Badge to re-render.
    await expect(page.getByText("데모")).toBeVisible({ timeout: 3000 });
    await page.reload();
    await expect(page.getByText("데모")).toBeVisible();
  });
});
