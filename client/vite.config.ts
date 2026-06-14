import { resolve } from 'path';

import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Vite 8. React Compiler is wired through plugin-react v6's `reactCompilerPreset`
// helper fed into `@rolldown/plugin-babel` (plugin-react v4's `babel` escape
// hatch was dropped). React 19 → no `target`/runtime override needed.
// Proxy targets default to the standard dev ports but can be overridden
// (e.g. `VITE_INTERNAL_PORT=3010 VITE_EXTERNAL_PORT=3011 pnpm dev`) to run
// the client against an isolated backend instance on alternate ports.
const internalTarget = `http://localhost:${process.env.VITE_INTERNAL_PORT ?? '3000'}`;
const externalTarget = `http://localhost:${process.env.VITE_EXTERNAL_PORT ?? '3001'}`;

export default defineConfig(({ command }) => ({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8080,
    // Same-origin proxy for backend resources during dev. Lets the SDK
    // demo and api calls bypass CORS / CORP issues without weakening helmet
    // on the backend. Only attached for `vite dev` — `vite preview` serves
    // a frozen production build that should not pretend to have a backend.
    proxy:
      command === 'serve'
        ? {
            '/sdk': {
              target: externalTarget,
              changeOrigin: true,
            },
            '/buffer': {
              target: externalTarget,
              changeOrigin: true,
            },
            '/api': {
              target: internalTarget,
              changeOrigin: true,
            },
            '/tabbed-debug': {
              target: internalTarget,
              changeOrigin: true,
            },
            '/devtools': {
              target: internalTarget,
              changeOrigin: true,
            },
            '/sessions': {
              target: internalTarget,
              changeOrigin: true,
              // SPA route `/sessions/*` collides with the API path of the same
              // name. Skip the proxy when the browser is asking for HTML.
              bypass(req) {
                if (req.headers.accept?.includes('text/html')) return req.url;
              },
            },
            '/socket.io': {
              target: externalTarget,
              ws: true,
              changeOrigin: true,
            },
            // Live-presence WebSocket on the internal app (separate ws path
            // from the DevTools gateway).
            '/ws/presence': {
              target: internalTarget,
              ws: true,
              changeOrigin: true,
            },
            // Replay / Playback WebSocket on the internal app
            '/ws/playback': {
              target: internalTarget,
              ws: true,
              changeOrigin: true,
            },
          }
        : undefined,
  },
  preview: {
    port: 4173,
    proxy: {},
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-router')) return 'router';
          if (id.includes('node_modules/motion')) return 'motion';
          if (id.includes('node_modules/@radix-ui')) return 'radix';
          if (id.includes('node_modules/cmdk')) return 'cmdk';
          if (id.includes('node_modules/lucide-react')) return 'icons';
          if (id.includes('node_modules/sonner')) return 'toast';
          if (id.includes('node_modules/@tanstack/react-query')) return 'query';
          return undefined;
        },
      },
    },
  },
}));
