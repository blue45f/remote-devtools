import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['common/**/*.ts', 'utils/**/*.ts', 'ui/theme.ts', 'types/**/*.ts'],
      exclude: [
        '**/*.{test,spec}.ts',
        'common/remoteDebugger.ts',
        'common/remoteObject.ts',
        'common/nodes.ts',
      ],
    },
  },
});
