import { withThemeByClassName } from '@storybook/addon-themes';

import type { Preview } from '@storybook/react';

// Load Tailwind tokens + base styles so stories render with the real design system.
import '../src/index.css';
// Initialise i18next so components calling `useTranslation()` don't crash.
import '../src/lib/i18n';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      // Match design tokens (--bg / --bg in .dark) so the stage matches the app.
      default: 'app',
      values: [
        { name: 'app', value: 'oklch(1 0 0)' },
        { name: 'app-dark', value: 'oklch(0.14575 0 0)' },
        { name: 'subtle', value: 'oklch(0.98481 0 0)' },
      ],
    },
    a11y: {
      // Surface violations in the panel without failing the build by default.
      test: 'todo',
    },
  },
  decorators: [
    // Theme toggle wired into the design-token system: the app keys off the
    // `.dark` class on the documentElement, so we map theme names to classes.
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
  ],
};

export default preview;
