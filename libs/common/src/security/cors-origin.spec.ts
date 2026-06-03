import { describe, it, expect } from 'vitest';

import {
  buildAllowedOriginPatterns,
  createCorsOriginValidator,
  isOriginAllowed,
} from './cors-origin';

describe('isOriginAllowed', () => {
  describe('no Origin header', () => {
    it('allows undefined origin (same-origin / server-to-server / curl)', () => {
      expect(isOriginAllowed(undefined, 'example.com')).toBe(true);
    });

    it('allows empty-string origin', () => {
      expect(isOriginAllowed('', 'example.com')).toBe(true);
    });
  });

  describe('localhost', () => {
    it.each([
      'http://localhost',
      'https://localhost',
      'http://localhost:8080',
      'https://localhost:3000',
    ])('always allows %s regardless of config', (origin) => {
      expect(isOriginAllowed(origin, '')).toBe(true);
      expect(isOriginAllowed(origin, undefined)).toBe(true);
    });

    it('does not allow look-alike localhost hosts', () => {
      expect(isOriginAllowed('http://localhost.evil.com', '')).toBe(false);
      expect(isOriginAllowed('http://notlocalhost', '')).toBe(false);
      expect(isOriginAllowed('http://localhost:abc', '')).toBe(false);
    });
  });

  describe('configured domains (subdomain matching)', () => {
    it('allows http and https subdomains of a configured domain', () => {
      expect(isOriginAllowed('https://app.example.com', 'example.com')).toBe(true);
      expect(isOriginAllowed('http://app.example.com', 'example.com')).toBe(true);
      expect(isOriginAllowed('https://staging.app.example.com', 'example.com')).toBe(true);
    });

    it('honours multiple comma-separated domains', () => {
      const cfg = 'example.com, my-app.io';
      expect(isOriginAllowed('https://app.example.com', cfg)).toBe(true);
      expect(isOriginAllowed('https://dash.my-app.io', cfg)).toBe(true);
      expect(isOriginAllowed('https://app.other.com', cfg)).toBe(false);
    });

    it('rejects an unrelated domain', () => {
      expect(isOriginAllowed('https://app.evil.com', 'example.com')).toBe(false);
    });

    it('rejects an origin that carries a path', () => {
      expect(isOriginAllowed('https://app.example.com/steal', 'example.com')).toBe(false);
    });

    it('does NOT treat the configured domain as a suffix of an attacker domain', () => {
      // The dot before the domain is literal: "evilexample.com" must not match
      // a config of "example.com".
      expect(isOriginAllowed('https://app.evilexample.com', 'example.com')).toBe(false);
    });

    it('escapes dots so they are not treated as the regex "any char"', () => {
      // Without escaping, "example.com" would also match "exampleXcom".
      expect(isOriginAllowed('https://app.exampleXcom', 'example.com')).toBe(false);
    });
  });

  describe('apex domain caveat (documented behaviour)', () => {
    it('does NOT match the apex domain itself, only subdomains', () => {
      // This mirrors the original inline implementation: a subdomain label is
      // required by the `[^/]+\.` prefix.
      expect(isOriginAllowed('https://example.com', 'example.com')).toBe(false);
    });
  });

  describe('hardened empty-entry handling', () => {
    it('ignores empty entries from a trailing comma (never widens to match-all)', () => {
      // A trailing comma used to produce a pattern from "" — guarded against now.
      expect(isOriginAllowed('https://anything.com', 'example.com,')).toBe(false);
      expect(isOriginAllowed('https://app.example.com', 'example.com,')).toBe(true);
    });

    it('an unset/empty config still allows only localhost', () => {
      expect(buildAllowedOriginPatterns(undefined)).toHaveLength(1);
      expect(buildAllowedOriginPatterns('')).toHaveLength(1);
      expect(buildAllowedOriginPatterns('   ')).toHaveLength(1);
      expect(isOriginAllowed('https://app.example.com', '')).toBe(false);
    });
  });
});

describe('createCorsOriginValidator', () => {
  it('invokes callback(null, true) for an allowed origin', () => {
    const validator = createCorsOriginValidator(() => 'example.com');
    let err: Error | null = null;
    let allow: boolean | undefined;
    validator('https://app.example.com', (e, a) => {
      err = e;
      allow = a;
    });
    expect(err).toBeNull();
    expect(allow).toBe(true);
  });

  it('invokes callback(Error) for a disallowed origin', () => {
    const validator = createCorsOriginValidator(() => 'example.com');
    let err: Error | null = null;
    validator('https://app.evil.com', (e) => {
      err = e;
    });
    expect(err).toBeInstanceOf(Error);
    expect((err as unknown as Error).message).toBe('Not allowed by CORS');
  });

  it('reads the env value lazily on each request', () => {
    let cfg = '';
    const validator = createCorsOriginValidator(() => cfg);

    let firstAllow: boolean | undefined;
    validator('https://app.example.com', (_e, a) => {
      firstAllow = a;
    });
    expect(firstAllow).toBeUndefined(); // rejected → no allow flag

    cfg = 'example.com';
    let secondAllow: boolean | undefined;
    validator('https://app.example.com', (_e, a) => {
      secondAllow = a;
    });
    expect(secondAllow).toBe(true);
  });

  it('defaults to reading process.env.CORS_ALLOWED_ORIGINS', () => {
    const prev = process.env.CORS_ALLOWED_ORIGINS;
    process.env.CORS_ALLOWED_ORIGINS = 'env-domain.com';
    try {
      const validator = createCorsOriginValidator();
      let allow: boolean | undefined;
      validator('https://app.env-domain.com', (_e, a) => {
        allow = a;
      });
      expect(allow).toBe(true);
    } finally {
      if (prev === undefined) {
        delete process.env.CORS_ALLOWED_ORIGINS;
      } else {
        process.env.CORS_ALLOWED_ORIGINS = prev;
      }
    }
  });
});
