import { resolve } from "path";

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "index.ts"),
      name: "RemoteDebugSdk",
      fileName: "index",
      formats: ["es", "umd"],
    },
  },
});
