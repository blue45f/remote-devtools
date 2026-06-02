import mkcert from 'vite-plugin-mkcert';
import * as path from 'path';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import { defineConfig, loadEnv } from 'vite';

function normalizeModulePath(id: string) {
  return id.split(path.sep).join('/');
}

function getPackageName(id: string) {
  const normalizedId = normalizeModulePath(id);
  const marker = '/node_modules/';
  const markerIndex = normalizedId.lastIndexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const packagePath = normalizedId.slice(markerIndex + marker.length);
  const [scopeOrName, packageName] = packagePath.split('/');

  if (scopeOrName?.startsWith('@') && packageName) {
    return `${scopeOrName}/${packageName}`;
  }

  return scopeOrName ?? null;
}

function manualChunks(id: string) {
  const packageName = getPackageName(id);

  if (!packageName) {
    return null;
  }

  if (
    ['react', 'react-dom', 'react-is', 'react-router', 'react-router-dom', 'scheduler'].includes(
      packageName,
    )
  ) {
    return 'vendor-react';
  }

  if (packageName === '@tanstack/react-query') {
    return 'vendor-query';
  }

  if (packageName === 'axios') {
    return 'vendor-http';
  }

  return null;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      mkcert({
        certFileName: `${process.cwd()}/localhost+3.pem`,
        keyFileName: `${process.cwd()}/localhost+3-key.pem`,
      }),
    ],
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
      chunkSizeWarningLimit: 600,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: env.VITE_DEV_HOST || 'localhost',
    },
  };
});
