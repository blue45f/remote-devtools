import path from "node:path";
import { fileURLToPath } from "node:url";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierPlugin from "eslint-plugin-prettier/recommended";
import reactCompiler from "eslint-plugin-react-compiler";
import reactHooks from "eslint-plugin-react-hooks";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rootTsconfig = path.join(__dirname, "tsconfig.json");
const clientDir = path.join(__dirname, "client");
const clientTsconfig = path.join(clientDir, "tsconfig.json");
const clientEslintTsconfig = path.join(clientDir, "tsconfig.eslint.json");
const sdkDir = path.join(__dirname, "sdk");
const sdkTsconfig = path.join(sdkDir, "tsconfig.json");

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      "devtools-frontend/**",
      "node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.next/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/storybook-static/**",
      ".eslintrc.js",
      "ecosystem.config.js",
      "eslint.config.mjs",
      "scripts/**",
      "migrations/**",
      "vitest*.config.ts",
      "figma-plugin/**",
    ],
  },

  // Base configs
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // Prettier (disables conflicting rules + adds prettier/prettier rule)
  prettierPlugin,

  // Global language options and custom rules
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        project: [rootTsconfig],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-constant-condition": "error",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
      "prettier/prettier": "error",
    },
  },

  // Override for client/** — the client runs the React Compiler, so register
  // eslint-plugin-react-hooks (v7) and enforce its Compiler-safety rules.
  {
    files: ["client/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parserOptions: {
        project: [clientTsconfig, clientEslintTsconfig],
        tsconfigRootDir: clientDir,
      },
    },
    rules: {
      "react-hooks/purity": "error",
      "react-hooks/immutability": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/refs": "error",
      "react-hooks/preserve-manual-memoization": "error",
      "react-hooks/static-components": "error",
    },
  },

  // Override for sdk/**
  {
    files: ["sdk/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: [sdkTsconfig],
        tsconfigRootDir: sdkDir,
      },
    },
  },

  // Static assets served verbatim from client/public (service worker, …) are
  // plain browser scripts outside every tsconfig — lint them without type
  // information instead of failing on "file not found in project".
  {
    files: ["client/public/**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // React Compiler correctness — the client is compiled (see client/vite.config.ts),
  // so Rules-of-React violations the compiler cannot handle must fail lint.
  {
    files: ["client/**/*.{ts,tsx}"],
    plugins: {
      "react-compiler": reactCompiler,
    },
    rules: {
      "react-compiler/react-compiler": "error",
    },
  },
);
