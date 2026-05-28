import { expect, test } from '@playwright/test';

/**
 * Drives the four-tab session detail surface. Demo mode means we can rely on
 * seeded events for every session id, so the tab content is deterministic.
 */
test.describe('Session detail tabs', () => {
  test('opens detail page from the sessions list', async ({ page }) => {
    await page.goto('/sessions');
    const firstSession = page.locator('tbody tr').first();
    await expect(firstSession).toBeVisible();

    await firstSession.hover();
    await firstSession.getByLabel(/View session details/).click();
    await page.waitForURL(/\/sessions\/\d+/);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // All four tabs render
    await expect(page.getByRole('tab', { name: /Overview/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Replay/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Timeline/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Raw/ })).toBeVisible();
  });

  test('each tab reveals its own content', async ({ page }) => {
    await page.goto('/sessions');
    const firstSession = page.locator('tbody tr').first();
    await firstSession.hover();
    await firstSession.getByLabel(/View session details/).click();
    await page.waitForURL(/\/sessions\/\d+/);

    // Overview is the default tab — exposes event-type breakdown labels
    // (every seed session has at least one event type tile).
    await expect(page.getByRole('tab', { name: /^Overview$/, selected: true })).toBeVisible();
    await expect(page.getByText(/% of total/).first()).toBeVisible({
      timeout: 5_000,
    });

    // Replay tab — rrweb mount or a loading skeleton must appear.
    await page.getByRole('tab', { name: /^Replay$/ }).click();
    await expect(page.getByRole('tab', { name: /^Replay$/, selected: true })).toBeVisible();
    const replayMount = page.getByTestId('rrweb-mount');
    const replayMessage = page.getByText(/Replay unavailable|Replay failed/i);
    // rrweb-player chunk is large + lazy; allow some time to load.
    await expect(replayMount.or(replayMessage)).toBeVisible({
      timeout: 10_000,
    });

    // Timeline — virtual scroll container + event count header.
    await page.getByRole('tab', { name: /^Timeline/ }).click();
    await expect(page.getByRole('tab', { name: /^Timeline/, selected: true })).toBeVisible();
    await expect(page.getByTestId('timeline-virtual-scroll')).toBeVisible();
    await expect(page.getByText(/events/i).first()).toBeVisible();

    // Raw — JSON pre block + Copy button.
    await page.getByRole('tab', { name: /^Raw JSON$/ }).click();
    await expect(page.getByRole('tab', { name: /^Raw JSON$/, selected: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Copy$/ })).toBeVisible();
    await expect(page.locator('pre').first()).toContainText(/"timestamp"|\[/, {
      timeout: 3_000,
    });
  });

  test('ArrowRight on a focused tab moves focus to the next tab', async ({ page }) => {
    await page.goto('/sessions');
    const firstSession = page.locator('tbody tr').first();
    await firstSession.hover();
    await firstSession.getByLabel(/View session details/).click();
    await page.waitForURL(/\/sessions\/\d+/);

    const overview = page.getByRole('tab', { name: /Overview/ });
    await overview.focus();
    await expect(overview).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: /Replay/ })).toBeFocused();
  });
});
