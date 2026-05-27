import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

/**
 * E2E test configuration.
 *
 * Picks up `*.e2e-spec.ts` files under `apps/** /test/**` and runs them with
 * the same swc + tsconfig-paths plugin pipeline as the unit suite. Coverage
 * and unit-test globs are intentionally NOT inherited here — these are slower
 * Nest HTTP suites that boot a Nest app via `@nestjs/testing` + supertest.
 *
 * The unit suite (`vitest.config.ts`) explicitly excludes `*.e2e-spec.ts`, so
 * the two configs partition the workspace cleanly:
 *   pnpm test       → unit
 *   pnpm test:e2e   → this config
 */
export default defineConfig({
  oxc: false,
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    root: "./",
    include: ["apps/**/test/**/*.e2e-spec.ts"],
    environment: "node",
  },
  plugins: [swc.vite({ module: { type: "es6" } })],
});
