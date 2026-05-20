import type { StorybookConfig } from "@storybook/react-vite";
import { resolve } from "path";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx|mdx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  typescript: {
    reactDocgen: "react-docgen-typescript",
  },
  docs: {
    autodocs: "tag",
  },
  async viteFinal(config) {
    // Storybook loads this file in CJS mode via esbuild-register, so `__dirname`
    // is the .storybook directory regardless of ESM gymnastics — perfect for us.
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string> | undefined),
      "@": resolve(__dirname, "../src"),
    };
    return config;
  },
};

export default config;
