import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { base, plugin, defineConfig } from '@heejun/eslint-config'
import { globalIgnores } from 'eslint/config'
import globals from 'globals'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(
  globalIgnores(['dist/**', 'node_modules/**', '**/*.html']),

  // Shared base for cross-repo consistency.
  base({ files: ['src/**/*.{ts,tsx}'], tsconfigRootDir: rootDir }),

  // heejun personal test/mock convention rules are off (see root config).
  {
    plugins: { '@heejun': plugin },
    rules: {
      '@heejun/vitest-mock-import': 'off',
      '@heejun/vitest-mock-import-original': 'off',
      '@heejun/mock-response-naming': 'off',
      '@heejun/no-js-interface-direct-access': 'off',
    },
  },

  // Figma plugin runs in two sandboxes: the plugin "code" side (figma global,
  // no DOM) and the "ui" side (browser DOM). Provide both global sets plus the
  // Figma plugin API. console is the plugin's only logging channel (no NestJS
  // Logger, runtime-zero deps), so the root's no-console policy is not applied.
  //
  // This package had no working lint config before adopting the shared base, so
  // the strict typed-style rules below fire across pre-existing legacy code
  // (figma postMessage payloads are inherently dynamic). Relax just those rules
  // to land the shared base's import hygiene / unused-vars / prettier gates
  // without a large unrelated refactor.
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, figma: 'readonly', __html__: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'preserve-caught-error': 'off',
    },
  },
)
