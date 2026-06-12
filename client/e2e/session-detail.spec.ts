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
    await firstSession.getByLabel(/View session details|세션 상세 보기/).click();
    await page.waitForURL(/\/sessions\/\d+/);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // All four tabs render
    await expect(page.getByRole('tab', { name: /Overview|개요/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Replay|리플레이/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Timeline|타임라인/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Raw/ })).toBeVisible();
  });

  test('each tab reveals its own content', async ({ page }) => {
    await page.goto('/sessions');
    const firstSession = page.locator('tbody tr').first();
    await firstSession.hover();
    await firstSession.getByLabel(/View session details|세션 상세 보기/).click();
    await page.waitForURL(/\/sessions\/\d+/);

    // Overview is the default tab — exposes event-type breakdown labels
    // (every seed session has at least one event type tile).
    await expect(
      page.getByRole('tab', { name: /^Overview$|^개요$/, selected: true }),
    ).toBeVisible();
    await expect(page.getByText(/% of total|전체의/).first()).toBeVisible({
      timeout: 5_000,
    });

    // Replay tab — rrweb mount or a loading skeleton must appear.
    await page.getByRole('tab', { name: /^(Replay|리플레이)(\s+\d+)?$/ }).click();
    await expect(
      page.getByRole('tab', { name: /^(Replay|리플레이)(\s+\d+)?$/, selected: true }),
    ).toBeVisible();
    const replayMount = page.getByTestId('rrweb-mount');
    const replayMessage = page.getByText(
      /Replay unavailable|Replay failed|리플레이를 사용할 수 없음|리플레이 실패/i,
    );
    // rrweb-player chunk is large + lazy; allow some time to load.
    await expect(replayMount.or(replayMessage)).toBeVisible({
      timeout: 10_000,
    });

    // Timeline — virtual scroll container + event count header.
    await page.getByRole('tab', { name: /^(Timeline|타임라인)(\s+\d+)?$/ }).click();
    await expect(
      page.getByRole('tab', { name: /^(Timeline|타임라인)(\s+\d+)?$/, selected: true }),
    ).toBeVisible();
    await expect(page.getByTestId('timeline-virtual-scroll')).toBeVisible();
    await expect(page.getByText(/events|이벤트/i).first()).toBeVisible();

    // Raw — JSON pre block + Copy button.
    await page.getByRole('tab', { name: /^Raw JSON$/ }).click();
    await expect(page.getByRole('tab', { name: /^Raw JSON$/, selected: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Copy$|^복사$/ })).toBeVisible();
    await expect(page.locator('pre').first()).toContainText(/"timestamp"|\[/, {
      timeout: 3_000,
    });
  });

  test('ArrowRight on a focused tab moves focus to the next tab', async ({ page }) => {
    await page.goto('/sessions');
    const firstSession = page.locator('tbody tr').first();
    await firstSession.hover();
    await firstSession.getByLabel(/View session details|세션 상세 보기/).click();
    await page.waitForURL(/\/sessions\/\d+/);

    const overview = page.getByRole('tab', { name: /Overview|개요/ });
    await overview.focus();
    await expect(overview).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: /Replay|리플레이/ })).toBeFocused();
  });
});
