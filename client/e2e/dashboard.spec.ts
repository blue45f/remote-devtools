import { expect, test } from '@playwright/test';

test.describe('Dashboard', () => {
  test('renders hero metrics and the trend chart', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1, name: /Dashboard|대시보드/ })).toBeVisible();

    // Hero tile labels (seeded data is non-zero)
    await expect(page.getByText(/Sessions today|오늘 세션/)).toBeVisible();
    await expect(page.getByText(/Tickets today|오늘 티켓/)).toBeVisible();

    // Hand-rolled SVG chart should be present
    const chart = page.getByRole('img', { name: /trend chart|추이 차트/i });
    await expect(chart).toBeVisible();
  });

  test('activity feed renders entries', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText(/Recent activity|최근 활동/)).toBeVisible();
    // Demo seeds at least one entry
    const items = page.locator('ol li');
    await expect(items.first()).toBeVisible({ timeout: 5000 });
  });

  test('command palette opens with the topbar search trigger', async ({ page }) => {
    await page.goto('/dashboard');
    // The topbar search button toggles the palette — exercise that instead of
    // the keyboard shortcut, which is OS-conditional and flaky in headless.
    await page
      .getByRole('button', { name: /Open command palette|명령 팔레트 열기|Search|검색/ })
      .click();
    await expect(page.getByPlaceholder(/Type a command|명령을 입력/)).toBeVisible({
      timeout: 2000,
    });
  });
});
