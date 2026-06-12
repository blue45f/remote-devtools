import { expect, test, type ConsoleMessage } from '@playwright/test';

/**
 * The SDK sandbox pages load the SDK either as a UMD `<script>` or via ESM
 * dynamic import. In the demo/preview build there is no backend serving
 * /sdk/index.umd.js and no real customer telemetry — the SDK fetches may
 * 404 — but the page shell must still render so customers can see what the
 * playground looks like.
 *
 * We allow benign console errors (SDK 404s, network failures), but fail on
 * uncaught React render errors.
 */

const ALLOWED_CONSOLE_PATTERNS = [
  /Failed to load resource/i,
  /net::ERR_/i,
  /404/,
  /\/sdk\/index\.umd\.js/i,
  /remote-debug-sdk/i,
  /Fetch error/i,
  /XHR error/i,
  /Axios error/i,
  /jsonplaceholder/i,
  // rrweb / SDK may log informational warnings; we only care about React errors.
  /React/i,
];

function collectFatalConsoleErrors(messages: ConsoleMessage[]) {
  return messages
    .filter((m) => m.type() === 'error')
    .map((m) => m.text())
    .filter((text) => !ALLOWED_CONSOLE_PATTERNS.some((pattern) => pattern.test(text)));
}

test.describe('SDK sandbox pages', () => {
  test('/sandbox/script renders the playground shell and loads the SDK', async ({ page }) => {
    const consoleMessages: ConsoleMessage[] = [];
    const sdkRequests: string[] = [];
    page.on('console', (msg) => consoleMessages.push(msg));
    page.on('request', (request) => {
      if (request.url().includes('/sdk/index.umd.js')) {
        sdkRequests.push(request.url());
      }
    });

    await page.goto('/sandbox/script');

    // The sidebar also renders a "SDK Playground" group label, so scope the
    // visibility check to the main page surface only.
    const main = page.locator('#main-content');
    await expect(main.getByText(/SDK Playground|SDK 실험실/i)).toBeVisible();
    await expect(main.getByText(/Script SDK \(UMD\)|스크립트 SDK \(UMD\)/i)).toBeVisible();

    // Tab switcher is rendered.
    await expect(page.getByRole('tab', { name: /Customer page|고객 페이지/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Debug actions|디버그 동작/i })).toBeVisible();

    // The debugger widget is loaded and visible.
    await expect(page.locator('#REMOTE_DEBUGGER')).toBeVisible();

    const fatal = collectFatalConsoleErrors(consoleMessages);
    expect(fatal, fatal.join('\n')).toEqual([]);
    expect(sdkRequests.length).toBe(1);
  });

  test('/sandbox/module renders the playground shell and loads the SDK', async ({ page }) => {
    const consoleMessages: ConsoleMessage[] = [];
    page.on('console', (msg) => consoleMessages.push(msg));

    await page.goto('/sandbox/module');

    const main = page.locator('#main-content');
    await expect(main.getByText(/SDK Playground|SDK 실험실/i)).toBeVisible();
    await expect(main.getByText(/^Module SDK$|^모듈 SDK$/i)).toBeVisible();
    await expect(page.getByRole('tab', { name: /Customer page|고객 페이지/i })).toBeVisible();

    // The debugger widget is loaded and visible.
    await expect(page.locator('#REMOTE_DEBUGGER')).toBeVisible();

    const fatal = collectFatalConsoleErrors(consoleMessages);
    expect(fatal, fatal.join('\n')).toEqual([]);
  });

  test('can switch between Customer page and Debug actions tabs', async ({ page }) => {
    await page.goto('/sandbox/module');
    await page.getByRole('tab', { name: /Debug actions|디버그 동작/i }).click();
    await expect(
      page.getByRole('tab', { name: /Debug actions|디버그 동작/i, selected: true }),
    ).toBeVisible();
    await page.getByRole('tab', { name: /Customer page|고객 페이지/i }).click();
    await expect(
      page.getByRole('tab', { name: /Customer page|고객 페이지/i, selected: true }),
    ).toBeVisible();
  });
});
