import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: false,
  resolve: {
    tsconfigPaths: true,
  },
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
      // Thresholds track the current global baseline so CI catches regressions
      // without blocking on broad, still-untested integration surfaces.
      thresholds: {
        lines: 37,
        functions: 47,
        branches: 29,
        statements: 36,
      },
    },
  },
  plugins: [swc.vite({ module: { type: "es6" } })],
});
