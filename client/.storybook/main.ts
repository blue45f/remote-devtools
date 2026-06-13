import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/react-vite';

// Storybook 10 loads this config as ESM, so `__dirname` is no longer
// defined. Derive it from `import.meta.url` to keep the `@` alias
// resolution stable regardless of the cwd that called Storybook.
const here = dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  // Storybook 10 bundles the former `addon-essentials` (controls,
  // actions, viewport, backgrounds, toolbars, measure, outline) and
  // `addon-interactions` into core, so we only list the addons that
  // are still distributed as separate packages.
  addons: ['@storybook/addon-a11y', '@storybook/addon-themes'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
  docs: {
    autodocs: 'tag',
  },
  async viteFinal(config) {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string> | undefined),
      '@': resolve(here, '../src'),
    };
    return config;
  },
};

export default config;
