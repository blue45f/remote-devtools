import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { base, react, plugin, boundaries, defineConfig } from '@heejun/eslint-config';
import { globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  // figma-plugin keeps its own eslint.config.mjs (own base + plugin globals);
  // it stays ignored at the root so root lint scopes to apps/libs/client/sdk.
  globalIgnores([
    'devtools-frontend/**',
    'node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.next/**',
    '**/playwright-report/**',
    '**/test-results/**',
    '**/storybook-static/**',
    '.eslintrc.js',
    'ecosystem.config.js',
    'eslint.config.mjs',
    'scripts/**',
    'migrations/**',
    'vitest*.config.ts',
    'figma-plugin/**',
    // Vendored single-file DeskCloud/SurveyDesk widgets (copy-pasted
    // self-contained components, react-only). They intentionally don't follow
    // our react-compiler/react-hooks/jsx-a11y rules, so keep them out of the gate.
    '**/components/deskcloud/**',
    '**/components/feedback/**',
  ]),

  // Shared base (TS + import hygiene + custom rules + prettier conflict off).
  // tsconfigRootDir pins the parser root so lint-staged's per-file invocation
  // doesn't get confused by the figma-plugin sub-tsconfig (it has its own
  // config and is ignored here).
  base({ files: ['**/*.{ts,tsx}'], tsconfigRootDir: rootDir }),

  // client/ — React 19 + Vite + React Compiler + jsx-a11y. react-hooks v7's
  // recommended set (bundled by react()) already enables the Compiler-safety
  // diagnostics (set-state-in-effect/refs/immutability/...) the old config
  // enabled explicitly, so parity is preserved.
  react({ files: ['client/**/*.{ts,tsx}'] }),

  // client/ react-hooks parity adjustments. react() pulls react-hooks v7
  // *recommended*, which adds advisory rules the previous inline config never
  // enabled and that fire across pre-existing legacy code. Disable only those
  // newly-added advisory rules to preserve the prior gate's parity; the
  // Compiler-safety diagnostics the old config DID enable stay on (intentional
  // single-pattern exceptions are suppressed inline with justification).
  {
    files: ['client/**/*.{ts,tsx}'],
    rules: {
      // Advisory only; legacy effects/memos are intentionally hand-tuned.
      'react-hooks/exhaustive-deps': 'off',
      // Flags TanStack Virtual/Radix interop the compiler handles fine.
      'react-hooks/incompatible-library': 'off',
      // Reports at the setState *call site* inside the effect, so it can't be
      // suppressed per-line for multi-statement effects. Every occurrence here
      // is the React-sanctioned "sync derived state when a prop/dep changes"
      // pattern (each effect is commented as such). Was listed in the old
      // inline config but never executed by any lint gate (client was unlinted
      // in CI), so turning it off preserves the previously-enforced parity.
      'react-hooks/set-state-in-effect': 'off',
    },
  },

  // client/ Storybook stories — `render: () => { useState/useEffect }` is the
  // canonical CSF3 idiom; the render fn isn't PascalCase so rules-of-hooks
  // false-positives. react-refresh is also irrelevant for story modules.
  {
    files: ['client/**/*.stories.{ts,tsx}'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },

  // client/ fast-refresh: shadcn-style primitives (ui/**) co-locate CVA
  // variant helpers / primitive re-exports with their components by design, and
  // main.tsx is the app bootstrap (route tree + lazy() with no exports). The
  // old config never enabled react-refresh; scope it off where the pattern is
  // idiomatic, and allow the common context/helper export names elsewhere.
  {
    files: ['client/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': [
        'error',
        {
          allowConstantExport: true,
          allowExportNames: [
            'useAuth',
            'authHeaders',
            'toast',
            'buildSessionInsights',
            'detectRageClicks',
          ],
        },
      ],
    },
  },
  {
    files: ['client/src/main.tsx', 'client/src/components/ui/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // client/ layer boundaries — app/domains/shared/infrastructure (offhours
  // pilot). Scoped to client/src only; the NestJS apps/libs, sdk and
  // figma-plugin are intentionally NOT subject to these rules. features/ has
  // been physically renamed to domains/; components/lib(minus api)/locales are
  // mapped to shared without moving. The http/api layer is a single module
  // (lib/api.ts + its test) and is mapped to infrastructure — it is listed
  // BEFORE shared so the first-match-wins classifier picks it up while the rest
  // of lib/ stays shared.
  ...boundaries({
    files: ['client/src/**/*.{ts,tsx}'],
    elements: [
      { type: 'app', pattern: 'client/src/pages/**/*', mode: 'full' },
      { type: 'app', pattern: 'client/src/main.tsx', mode: 'full' },
      { type: 'domains', pattern: 'client/src/domains/*/**/*', mode: 'full' },
      { type: 'infrastructure', pattern: 'client/src/lib/api*', mode: 'full' },
      {
        type: 'shared',
        pattern: 'client/src/{components,lib,locales}/**/*',
        mode: 'full',
      },
    ],
    rules: [
      { from: ['app'], allow: ['app', 'domains', 'shared', 'infrastructure'] },
      { from: ['domains'], allow: ['domains', 'shared', 'infrastructure'] },
      { from: ['infrastructure'], allow: ['shared', 'infrastructure'] },
      { from: ['shared'], allow: ['shared'] },
    ],
  }),
  // boundaries needs a resolver to classify TS imports (otherwise it silently
  // no-ops). Scoped to client files so the backend lint is unaffected.
  {
    files: ['client/src/**/*.{ts,tsx}'],
    settings: {
      'import/resolver': { typescript: { project: 'client/tsconfig.json' }, node: true },
    },
  },
  // Tech-debt relaxation (precise file allow-list, not whole folders): a handful
  // of shared modules are in practice feature-coupled and reach into the api
  // layer (infrastructure) or domain types. Moving them into domains/ would be a
  // large refactor (CommandPalette/ActivityFeed/RequireAuth are app-wide shared
  // building blocks; the seed fixtures must mirror domain shapes), so this pilot
  // exempts only these files. Pure shared (the rest of components/ui, lib utils,
  // locales) stays strictly shared→shared.
  //  - components fetch via apiFetch/queryClient/API_HOST (data-coupled shared).
  //  - lib/presence.ts is a live-presence hook that polls apiFetch.
  //  - lib/devtools-link.ts builds the tabbed-debug URL off the API_HOST const.
  //  - lib/seed-admin.ts is demo-mode seed data shaped after domain types
  //    (RemoteSession/UserProfile/Member); its domain coupling is inherent.
  {
    files: [
      'client/src/components/ActivityFeed.tsx',
      'client/src/components/CommandPalette.tsx',
      'client/src/components/RequireAuth.tsx',
      'client/src/components/replay/SessionPreviewCard.tsx',
      'client/src/components/session-detail/ReplayTab.tsx',
      'client/src/lib/presence.ts',
      'client/src/lib/devtools-link.ts',
      'client/src/lib/seed-admin.ts',
    ],
    rules: { 'boundaries/element-types': 'off' },
  },

  // heejun personal test/mock convention rules are off — not cross-repo policy
  // and they clash with this repo's own test style (shared base general rules
  // are still adopted).
  {
    plugins: { '@heejun': plugin },
    rules: {
      '@heejun/vitest-mock-import': 'off',
      '@heejun/vitest-mock-import-original': 'off',
      '@heejun/mock-response-naming': 'off',
      '@heejun/no-js-interface-direct-access': 'off',
    },
  },

  // Repo policy carried over from the previous inline config (base() does not
  // ship these): ban console.log/debug/info and non-null assertions.
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-constant-condition': 'error',
    },
  },

  // Static assets served verbatim from client/public (service worker, …) are
  // plain browser scripts — lint them with browser globals.
  {
    files: ['client/public/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser, ...globals.serviceworker },
    },
  },

  // apps/* — NestJS (Node). Decorators + empty constructors/classes idioms.
  {
    files: ['apps/**/*.ts', 'libs/**/*.ts'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },

  // sdk/ — browser instrumentation library (DOM + worker surfaces).
  {
    files: ['sdk/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },

  // Tests — Vitest globals; relax fast-refresh + any constraints.
  {
    files: ['**/*.{test,spec}.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
);
