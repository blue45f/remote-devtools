import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Automated WCAG 2.1 AA scan for the public-facing pages. We only assert on
 * "serious" and "critical" violations — "moderate" findings (color contrast
 * on lone-glyph icons etc.) are tracked manually since axe over-reports them
 * on icon-heavy UIs.
 */
const PAGES = ["/", "/pricing", "/sign-in", "/sign-up", "/dashboard"];

for (const path of PAGES) {
  test(`a11y: ${path} has no critical/serious violations`, async ({ page }) => {
    await page.goto(path);
    // Let route lazy-import + first paint settle.
    await page.waitForLoadState("networkidle");
    // Framer Motion's `initial={{ opacity: 0 }}` blocks color-contrast checks
    // because axe samples the element while it's mid-animation. 700ms covers
    // the longest staged delay we use on Landing.
    await page.waitForTimeout(700);

    const results = await new AxeBuilder({ page })
      // Disable Radix-driven false positives: tab triggers reference content
      // panels that we intentionally don't render (we only use the Tabs
      // primitive as a controlled toggle group). The buttons remain
      // operable and have proper roles + names.
      .disableRules(["aria-valid-attr-value"])
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );

    if (blocking.length > 0) {
      console.error(
        `axe violations on ${path}:`,
        JSON.stringify(blocking, null, 2),
      );
    }
    expect(blocking).toEqual([]);
  });
}
