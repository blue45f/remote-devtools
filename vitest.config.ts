import swc from "unplugin-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    root: "./",
    include: ["apps/**/*.spec.ts", "libs/**/*.spec.ts"],
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
      // The numbers look modest because chunks of the legacy external app
      // and internal app are not unit-tested yet; the modules WE care
      // about (auth, billing, activity, record, etc.) sit between 80–100%
      // individually. CI's job here is to catch regressions, not gate on
      // unrelated legacy debt.
      thresholds: {
        lines: 30,
        functions: 45,
        branches: 35,
        statements: 30,
      },
    },
  },
  plugins: [tsconfigPaths(), swc.vite({ module: { type: "es6" } })],
});
