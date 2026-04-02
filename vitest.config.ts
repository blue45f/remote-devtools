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
        "**/index.ts",
        "**/*.entity.ts",
        "**/*.dto.ts",
        "**/*.types.ts",
        "**/*.interface.ts",
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50,
      },
    },
  },
  plugins: [tsconfigPaths(), swc.vite({ module: { type: "es6" } })],
});
