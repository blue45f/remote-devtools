const path = require('path');

const rootTsconfig = path.join(__dirname, 'tsconfig.json');
const clientDir = path.join(__dirname, 'client');
const clientTsconfig = path.join(clientDir, 'tsconfig.json');
const sdkDir = path.join(__dirname, 'sdk');
const sdkTsconfig = path.join(sdkDir, 'tsconfig.json');

module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  ignorePatterns: ['devtools-frontend/*', 'node_modules/*', 'dist/*', '.next/*'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: [rootTsconfig],
    tsconfigRootDir: __dirname,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'no-console': 'off',
    'prettier/prettier': 'error',
  },
  overrides: [
    {
      files: ['client/**/*.{ts,tsx}'],
      parserOptions: {
        project: [clientTsconfig],
        tsconfigRootDir: clientDir,
      },
    },
    {
      files: ['sdk/**/*.{ts,tsx}'],
      parserOptions: {
        project: [sdkTsconfig],
        tsconfigRootDir: sdkDir,
      },
    },
  ],
};
