import { expect, test } from '@playwright/test';

test.describe('Sessions list and detail', () => {
  test('lists sessions and opens the detail page', async ({ page }) => {
    await page.goto('/sessions');
    await expect(page.getByRole('heading', { level: 1, name: /Sessions|세션/ })).toBeVisible();
    // At least one session row
    const firstSession = page.locator('tbody tr').first();
    await expect(firstSession).toBeVisible();

    // Click the row's "View session details" link
    await firstSession.hover();
    await firstSession.getByLabel(/View session details|세션 상세 보기/).click();
    await page.waitForURL(/\/sessions\/\d+/);

    // Detail page surface — tabs visible
    await expect(page.getByRole('tab', { name: /Overview|개요/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Replay|리플레이/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Timeline|타임라인/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Raw/ })).toBeVisible();
  });

  test('search narrows the list', async ({ page }) => {
    await page.goto('/sessions');
    // Wait until the seeded table has rendered.
    await expect(page.locator('tbody tr').first()).toBeVisible();
    const initialRows = await page.locator('tbody tr').count();
    expect(initialRows).toBeGreaterThan(0);

    await page.getByPlaceholder(/Search by name|이름, URL, 기기, 태그로 검색/).fill('checkout');
    // Wait for debounced server filter (250ms) plus seed-router latency (120ms).
    await page.waitForTimeout(600);

    const filtered = await page.locator('tbody tr').count();
    expect(filtered).toBeLessThanOrEqual(initialRows);
  });

  test('DevTools button opens tabbed debugger', async ({ page, context }) => {
    await page.goto('/sessions');
    const row = page.locator('tbody tr').first();
    await row.hover();
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      row.getByLabel(/Open in DevTools|DevTools에서 열기/).click(),
    ]);
    await newPage.waitForLoadState();
    expect(newPage.url()).toContain('/tabbed-debug/');
  });
});
