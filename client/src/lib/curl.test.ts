import { describe, expect, it } from 'vitest';

import { buildCurlCommand } from './curl';

describe('buildCurlCommand', () => {
  it('omits -X for GET', () => {
    expect(buildCurlCommand({ method: 'GET', url: 'https://x.test/' })).toBe(
      "curl 'https://x.test/'",
    );
  });

  it('emits -X for POST/PUT/DELETE/PATCH', () => {
    expect(buildCurlCommand({ method: 'post', url: 'https://x.test/' })).toBe(
      "curl -X POST 'https://x.test/'",
    );
    expect(buildCurlCommand({ method: 'PUT', url: 'https://x.test/' })).toContain('-X PUT');
    expect(buildCurlCommand({ method: 'DELETE', url: 'https://x.test/' })).toContain('-X DELETE');
  });

  it('appends an Accept header when mimeType is known', () => {
    expect(
      buildCurlCommand({
        method: 'GET',
        url: 'https://x.test/',
        mimeType: 'application/json',
      }),
    ).toBe("curl 'https://x.test/' -H 'Accept: application/json'");
  });

  it('escapes embedded single quotes in the URL', () => {
    expect(
      buildCurlCommand({
        method: 'GET',
        url: "https://x.test/?q=O'Brien",
      }),
    ).toBe("curl 'https://x.test/?q=O'\\''Brien'");
  });

  it('handles empty url gracefully', () => {
    expect(buildCurlCommand({ method: 'GET', url: '' })).toBe("curl ''");
  });
});
