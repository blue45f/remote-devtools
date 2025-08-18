import swc from "unplugin-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    root: "./",
    include: ["apps/**/*.spec.ts", "libs/**/*.spec.ts"],
    environment: "node",
  },
  plugins: [tsconfigPaths(), swc.vite({ module: { type: "es6" } })],
});
