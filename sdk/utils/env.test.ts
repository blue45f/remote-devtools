import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSdkScriptOrigin, isSdkDemoMode, readSdkEnv, toWebSocketOrigin } from './env';

describe('readSdkEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.removeItem('demo-mode');
  });

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
    vi.stubEnv('VITE_EXTERNAL_WS', '');

    expect(readSdkEnv('VITE_EXTERNAL_WS', 'ws://localhost:3001')).toBe('ws://localhost:3001');
  });

  it('returns the Vite env value when no explicit source is provided', () => {
    vi.stubEnv('VITE_EXTERNAL_WS', 'wss://external.example.com');

    expect(readSdkEnv('VITE_EXTERNAL_WS', 'ws://localhost:3001')).toBe(
      'wss://external.example.com',
    );
  });

  it('treats baked placeholder hosts as unset and uses the runtime fallback', () => {
    // Reproduces the shipped sdk/.env.production placeholders that Vite inlines:
    // they must NOT shadow the dynamic same-origin default.
    vi.stubEnv('VITE_EXTERNAL_WS', 'wss://your-external-domain.com');
    expect(readSdkEnv('VITE_EXTERNAL_WS', 'ws://localhost:3001/socket.io')).toBe(
      'ws://localhost:3001/socket.io',
    );

    vi.stubEnv('VITE_INTERNAL_HOST', 'https://your-internal-domain.com');
    expect(readSdkEnv('VITE_INTERNAL_HOST', 'http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('detects demo mode from Vite env or local storage', () => {
    expect(isSdkDemoMode()).toBe(false);

    vi.stubEnv('VITE_FORCE_DEMO', 'true');
    expect(isSdkDemoMode()).toBe(true);

    vi.stubEnv('VITE_FORCE_DEMO', '');
    localStorage.setItem('demo-mode', '1');
    expect(isSdkDemoMode()).toBe(true);
  });
});

describe('SDK script origin helpers', () => {
  it('finds the origin for the loaded SDK script tag', () => {
    const script = document.createElement('script');
    script.src = 'https://external.example.com/sdk/index.umd.js';
    document.head.appendChild(script);

    expect(getSdkScriptOrigin()).toBe('https://external.example.com');

    script.remove();
  });

  it('converts HTTP origins to WebSocket origins', () => {
    expect(toWebSocketOrigin('http://external.example.com:3001')).toBe(
      'ws://external.example.com:3001',
    );
    expect(toWebSocketOrigin('https://external.example.com')).toBe('wss://external.example.com');
  });
});
