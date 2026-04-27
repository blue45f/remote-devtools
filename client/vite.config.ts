import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

const ReactCompilerConfig = {
  target: "19" as const,
};

export default defineConfig(({ command }) => ({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", ReactCompilerConfig]],
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 8080,
    // Same-origin proxy for backend resources during dev. Lets the SDK
    // demo and api calls bypass CORS / CORP issues without weakening helmet
    // on the backend. Only attached for `vite dev` — `vite preview` serves
    // a frozen production build that should not pretend to have a backend.
    proxy:
      command === "serve"
        ? {
            "/sdk": {
              target: "http://localhost:3001",
              changeOrigin: true,
            },
            "/buffer": {
              target: "http://localhost:3001",
              changeOrigin: true,
            },
            "/api": {
              target: "http://localhost:3000",
              changeOrigin: true,
            },
            "/sessions": {
              target: "http://localhost:3000",
              changeOrigin: true,
              // SPA route `/sessions/*` collides with the API path of the same
              // name. Skip the proxy when the browser is asking for HTML.
              bypass(req) {
                if (req.headers.accept?.includes("text/html")) return req.url;
              },
            },
            "/socket.io": {
              target: "http://localhost:3001",
              ws: true,
              changeOrigin: true,
            },
          }
        : undefined,
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-router")) return "router";
          if (id.includes("node_modules/framer-motion")) return "motion";
          if (id.includes("node_modules/@radix-ui")) return "radix";
          if (id.includes("node_modules/cmdk")) return "cmdk";
          if (id.includes("node_modules/lucide-react")) return "icons";
          if (id.includes("node_modules/sonner")) return "toast";
          if (id.includes("node_modules/@tanstack/react-query"))
            return "query";
          return undefined;
        },
      },
    },
  },
}));
