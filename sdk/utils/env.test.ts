import { describe, expect, it } from 'vitest';

import { readSdkEnv } from './env';

describe('readSdkEnv', () => {
  it('returns the configured Vite env value when present', () => {
    const meta = {
      env: {
        VITE_INTERNAL_HOST: 'https://internal.example',
      },
    } as unknown as ImportMeta;

    expect(readSdkEnv('VITE_INTERNAL_HOST', 'http://localhost:3000', meta)).toBe(
      'https://internal.example',
    );
  });

  it('falls back when import.meta.env is absent at runtime', () => {
    const meta = {} as ImportMeta;

    expect(readSdkEnv('VITE_EXTERNAL_HOST', 'http://localhost:3001', meta)).toBe(
      'http://localhost:3001',
    );
  });
});
