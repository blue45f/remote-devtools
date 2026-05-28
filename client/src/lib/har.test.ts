import { describe, expect, it } from 'vitest';

import { buildHar } from './har';

describe('buildHar', () => {
  it('wraps rows in HAR v1.2 envelope with creator + pages', () => {
    const har = buildHar(
      [
        {
          requestId: 1,
          timestamp: 1_700_000_000_000,
          method: 'GET',
          url: 'https://api.x.test/v1/cart',
          status: 200,
          statusText: 'OK',
          mimeType: 'application/json',
          encodedDataLength: 412,
        },
      ],
      'checkout-flow-test',
    );
    expect(har.log.version).toBe('1.2');
    expect(har.log.creator.name).toBe('remote-devtools');
    expect(har.log.pages?.[0].title).toBe('checkout-flow-test');
    expect(har.log.entries[0].pageref).toBe('page_0');
  });

  it('omits the pages block when no session name is provided', () => {
    const har = buildHar(
      [
        {
          requestId: 1,
          timestamp: 0,
          method: 'GET',
          url: 'https://x.test/',
        },
      ],
      undefined,
    );
    expect(har.log.pages).toBeUndefined();
    expect(har.log.entries[0].pageref).toBeUndefined();
  });

  it("splits the URL's query string into HAR queryString entries", () => {
    const har = buildHar(
      [
        {
          requestId: 1,
          timestamp: 0,
          method: 'GET',
          url: 'https://x.test/search?q=hat&category=accessories',
        },
      ],
      undefined,
    );
    expect(har.log.entries[0].request.queryString).toEqual([
      { name: 'q', value: 'hat' },
      { name: 'category', value: 'accessories' },
    ]);
  });

  it('carries the response body when base64Encoded is recorded', () => {
    const har = buildHar(
      [
        {
          requestId: 1,
          timestamp: 0,
          method: 'GET',
          url: 'https://x.test/',
          mimeType: 'image/png',
          base64Encoded: true,
          responseBody: 'iVBORw0KGgo=',
        },
      ],
      undefined,
    );
    const content = har.log.entries[0].response.content;
    expect(content.text).toBe('iVBORw0KGgo=');
    expect(content.encoding).toBe('base64');
  });

  it('falls back to safe HAR defaults for missing fields', () => {
    const har = buildHar(
      [
        {
          requestId: 1,
          timestamp: 0,
          method: 'post',
          url: 'https://x.test/',
        },
      ],
      undefined,
    );
    const entry = har.log.entries[0];
    expect(entry.request.method).toBe('POST'); // upper-cased
    expect(entry.response.status).toBe(0);
    expect(entry.response.content.size).toBe(-1);
    expect(entry.response.content.mimeType).toBe('x-unknown');
    expect(entry.response.bodySize).toBe(-1);
  });
});
