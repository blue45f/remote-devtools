import swc from "unplugin-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    root: "./",
    include: ["apps/**/*.spec.ts", "libs/**/*.spec.ts"],
    // e2e suites live under `apps/** /test/` and end in `.e2e-spec.ts`. They
    // boot a Nest HTTP app via supertest and are run by `pnpm test:e2e`
    // (see `vitest.e2e.config.ts`). Exclude them here so the unit suite stays
    // fast and does not double-load them.
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.e2e-spec.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["apps/**/src/**/*.ts", "libs/**/src/**/*.ts"],
      exclude: [
        "**/*.spec.ts",
        "**/*.module.ts",
        "**/main.ts",
        "**/instrument.ts",
        "**/index.ts",
        "**/*.entity.ts",
        "**/*.dto.ts",
        "**/*.types.ts",
        "**/*.interface.ts",
        // TypeORM CLI datasource — config-only, exercised by migrations not unit tests
        "**/datasource.ts",
        // Decorator-only files — no runtime branches to cover meaningfully
        "**/*.decorator.ts",
      ],
      // Thresholds tuned to the actual current coverage of tested surfaces.
      // Branches are high (~81%) because most tested modules cover every
      // conditional; lines/functions lag because the webview gateways,
      // session-replay service, and a few external integrations are still
      // partially tested. CI's job here is to catch regressions, not gate
      // on the in-flight gap.
      thresholds: {
        lines: 40,
        functions: 55,
        branches: 75,
        statements: 40,
      },
    },
  },
  plugins: [tsconfigPaths(), swc.vite({ module: { type: "es6" } })],
});
