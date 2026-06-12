import { expect, test, type Page } from '@playwright/test';

/**
 * Drives the Cmd+K palette. The preview build ships with VITE_FORCE_DEMO=true,
 * so demo mode starts ON — the "Enable demo mode" item is rendered as
 * "Disable demo mode" and the Topbar already shows the Demo badge.
 *
 * The keyboard shortcut itself gets a dedicated test; the rest use the topbar
 * search trigger to open the palette (matches existing dashboard.spec.ts
 * style and avoids focus-trap flakiness in headless Chromium).
 */

async function openPaletteViaShortcut(page: Page) {
  // Move focus to the document body so the global keydown listener fires
  // — there is no auto-focused input in the demo dashboard, but being
  // explicit keeps this resilient.
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+KeyK');
}

async function openPaletteViaTopbar(page: Page) {
  await page
    .getByRole('button', { name: /Open command palette|명령 팔레트 열기|Search|검색/ })
    .click();
}

test.describe('Command palette', () => {
  test('opens with Control+K and closes with Escape', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1, name: /Dashboard|대시보드/ })).toBeVisible();

    await openPaletteViaShortcut(page);
    const input = page.getByPlaceholder(/Type a command|명령을 입력/);
    await expect(input).toBeVisible({ timeout: 2_000 });

    await page.keyboard.press('Escape');
    await expect(input).toBeHidden();
  });

  test('typing filters the command list', async ({ page }) => {
    await page.goto('/dashboard');
    await openPaletteViaTopbar(page);
    const input = page.getByPlaceholder(/Type a command|명령을 입력/);
    await expect(input).toBeVisible();

    await input.fill('세션');
    // The "Sessions" nav item stays visible…
    await expect(page.getByRole('option', { name: /Sessions|세션/ }).first()).toBeVisible();
    // …while Theme commands (no match) drop out of the list.
    await expect(page.getByRole('option', { name: /Light theme|라이트 테마/ })).toBeHidden();
  });

  test('toggling demo mode reacts in the topbar badge', async ({ page }) => {
    await page.goto('/dashboard');
    const badge = page.getByTestId('demo-mode-badge');
    // Forced demo build — badge is visible on load.
    await expect(badge).toBeVisible();

    await openPaletteViaTopbar(page);
    // With demo mode already ON the label is "Disable demo mode".
    await page.getByRole('option', { name: /Disable demo mode|데모 모드 끄기/ }).click();
    await expect(badge).toBeHidden();

    // Toggle back on so other tests in this file see a consistent state.
    await openPaletteViaTopbar(page);
    await page.getByRole('option', { name: /Enable demo mode|데모 모드 켜기/ }).click();
    await expect(badge).toBeVisible();
  });

  test('selecting a navigation item changes the URL', async ({ page }) => {
    await page.goto('/dashboard');
    await openPaletteViaTopbar(page);
    await page
      .getByRole('option', { name: /Sessions|세션/ })
      .first()
      .click();
    await page.waitForURL(/\/sessions$/);
    await expect(page.getByRole('heading', { level: 1, name: /Sessions|세션/ })).toBeVisible();
  });

  test('switching theme adds the matching class on <html>', async ({ page }) => {
    await page.goto('/dashboard');

    // Force dark first.
    await openPaletteViaTopbar(page);
    await page.getByRole('option', { name: /Dark theme|다크 테마/ }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // …then back to light, which removes the dark class.
    await openPaletteViaTopbar(page);
    await page.getByRole('option', { name: /Light theme|라이트 테마/ }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});
