import { describe, expect, it } from 'vitest';

import { formatUserAgentBadge, parseUserAgent } from './user-agent';

describe('parseUserAgent', () => {
  it('returns null for empty / undefined input', () => {
    expect(parseUserAgent(undefined)).toBeNull();
    expect(parseUserAgent(null)).toBeNull();
    expect(parseUserAgent('')).toBeNull();
    expect(parseUserAgent('   ')).toBeNull();
  });

  it('detects Chrome on macOS', () => {
    expect(
      parseUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      ),
    ).toEqual({ browser: 'Chrome', os: 'macOS' });
  });

  it('detects Safari on iOS', () => {
    expect(
      parseUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      ),
    ).toEqual({ browser: 'Safari', os: 'iOS' });
  });

  it('detects Firefox on Linux', () => {
    expect(
      parseUserAgent('Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0'),
    ).toEqual({ browser: 'Firefox', os: 'Linux' });
  });

  it('detects Edge on Windows 10/11', () => {
    expect(
      parseUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36 Edg/127.0',
      ),
    ).toEqual({ browser: 'Edge', os: 'Windows 10/11' });
  });

  it('detects Chrome on Android', () => {
    expect(
      parseUserAgent(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Mobile Safari/537.36',
      ),
    ).toEqual({ browser: 'Chrome', os: 'Android' });
  });

  it('falls back to Unknown for opaque UAs', () => {
    expect(parseUserAgent('totally-not-a-browser')).toEqual({
      browser: 'Unknown',
      os: 'Unknown',
    });
  });
});

describe('formatUserAgentBadge', () => {
  it('returns a compact label', () => {
    expect(
      formatUserAgentBadge('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/127.0'),
    ).toBe('Chrome · macOS');
  });

  it('returns null when there is no UA to render', () => {
    expect(formatUserAgentBadge(undefined)).toBeNull();
  });
});
