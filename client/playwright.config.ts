import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for the demo build.
 *
 * The tests run against the production build with `VITE_FORCE_DEMO=true`,
 * which is exactly what users hit on https://remote-devtools.vercel.app/.
 * Demo mode short-circuits every API call to seed data, so the suite needs
 * zero backend, zero network — just `vite preview` in front of the built
 * static assets.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Mobile profile gets a single smoke test so we don't double the runtime.
    {
      name: "mobile",
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices["iPhone 14"] },
    },
  ],

  webServer: {
    command: "VITE_FORCE_DEMO=true pnpm build && pnpm preview --host 127.0.0.1 --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
