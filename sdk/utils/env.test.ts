import { describe, expect, it } from 'vitest';

import { readSdkEnv } from './env';

describe('readSdkEnv', () => {
  it('returns the configured SDK env value when an explicit source is present', () => {
    const meta = {
      env: {
        VITE_INTERNAL_HOST: 'https://internal.example',
      },
    };

    expect(readSdkEnv('VITE_INTERNAL_HOST', 'http://localhost:3000', meta)).toBe(
      'https://internal.example',
    );
  });

  it('falls back when an explicit source has no env object', () => {
    expect(readSdkEnv('VITE_EXTERNAL_HOST', 'http://localhost:3001', {})).toBe(
      'http://localhost:3001',
    );
  });

  it('falls back when no SDK env source is provided', () => {
    expect(readSdkEnv('VITE_EXTERNAL_WS', 'ws://localhost:3001')).toBe('ws://localhost:3001');
  });
});
