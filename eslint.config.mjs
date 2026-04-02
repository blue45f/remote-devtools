import path from 'node:path';
import { fileURLToPath } from 'node:url';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier/recommended';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rootTsconfig = path.join(__dirname, 'tsconfig.json');
const clientDir = path.join(__dirname, 'client');
const clientTsconfig = path.join(clientDir, 'tsconfig.json');
const sdkDir = path.join(__dirname, 'sdk');
const sdkTsconfig = path.join(sdkDir, 'tsconfig.json');

export default tseslint.config(
  // Global ignores
  {
    ignores: ['devtools-frontend/**', 'node_modules/**', 'dist/**', '.next/**'],
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
      sourceType: 'module',
      parserOptions: {
        project: [rootTsconfig],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-constant-condition': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      'prettier/prettier': 'error',
    },
  },

  // Override for client/**
  {
    files: ['client/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: [clientTsconfig],
        tsconfigRootDir: clientDir,
      },
    },
  },

  // Override for sdk/**
  {
    files: ['sdk/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: [sdkTsconfig],
        tsconfigRootDir: sdkDir,
      },
    },
  },
);
