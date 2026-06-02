import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  escapeHtml,
  escapeRegString,
  getAbsolutePath,
  isElement,
  isHTMLElement,
  isMatches,
  isMobile,
  key2UpperCase,
} from './utils';

describe('getAbsolutePath', () => {
  it('returns the empty string for nullish input', () => {
    expect(getAbsolutePath(undefined)).toBe('');
    expect(getAbsolutePath(null)).toBe('');
    expect(getAbsolutePath('')).toBe('');
  });

  it('returns the empty string for non-string inputs (URL objects, numbers)', () => {
    // Runtime consumers may pass structured values; only strings resolve.
    expect(getAbsolutePath(new URL('https://example.com/x'))).toBe('');
    expect(getAbsolutePath(42)).toBe('');
  });

  it('resolves a relative path against the current document base', () => {
    const result = getAbsolutePath('/foo/bar');
    // jsdom defaults to about:blank, but anchors still produce an absolute URL.
    expect(result.endsWith('/foo/bar')).toBe(true);
    expect(/^[a-z]+:/.test(result)).toBe(true);
  });

  it('returns the same absolute URL when given an absolute URL', () => {
    expect(getAbsolutePath('https://example.com/x?y=1')).toBe('https://example.com/x?y=1');
  });
});

describe('key2UpperCase', () => {
  it('capitalises the first character', () => {
    expect(key2UpperCase('foo')).toBe('Foo');
  });

  it('capitalises letters that follow dashes (kebab → HTTP header casing)', () => {
    // The regex matches `^\S` and `-[a-z]` and uppercases the match, so the
    // hyphen survives. Net effect: HTTP-style header normalisation.
    expect(key2UpperCase('content-type')).toBe('Content-Type');
    expect(key2UpperCase('x-custom-header')).toBe('X-Custom-Header');
  });

  it('leaves an empty string untouched', () => {
    expect(key2UpperCase('')).toBe('');
  });

  it('does not lowercase already-uppercase characters', () => {
    // The first dash is followed by lower-case `b`, so it does get the
    // capitalisation pass, but the dash stays in place.
    expect(key2UpperCase('FOO-bar')).toBe('FOO-Bar');
  });

  it('does not touch dashes followed by non-letters or by already-upper letters', () => {
    expect(key2UpperCase('a-B')).toBe('A-B');
    expect(key2UpperCase('a-1')).toBe('A-1');
  });
});

describe('isMobile', () => {
  const originalUA = navigator.userAgent;

  const setUA = (ua: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: ua,
      configurable: true,
    });
  };

  afterEach(() => {
    setUA(originalUA);
  });

  it('returns true for iOS user agents', () => {
    setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15');
    expect(isMobile()).toBe(true);
  });

  it('returns true for Android user agents', () => {
    setUA(
      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    );
    expect(isMobile()).toBe(true);
  });

  it('returns true for iPod user agents', () => {
    setUA('Mozilla/5.0 (iPod touch; CPU iPhone OS 12_0 like Mac OS X)');
    expect(isMobile()).toBe(true);
  });

  it('returns false for desktop user agents', () => {
    setUA(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    );
    expect(isMobile()).toBe(false);
  });
});

describe('isElement', () => {
  it('returns true for Element instances', () => {
    const el = document.createElement('div');
    expect(isElement(el)).toBe(true);
  });

  it('returns false for non-Element values', () => {
    expect(isElement(null)).toBe(false);
    expect(isElement(undefined)).toBe(false);
    expect(isElement('div')).toBe(false);
    expect(isElement({})).toBe(false);
    expect(isElement(document.createTextNode('hi'))).toBe(false);
  });
});

describe('isHTMLElement', () => {
  it('returns true for HTMLElement instances', () => {
    expect(isHTMLElement(document.createElement('div'))).toBe(true);
    expect(isHTMLElement(document.createElement('span'))).toBe(true);
  });

  it('returns false for non-HTML element types', () => {
    expect(isHTMLElement(null)).toBe(false);
    expect(isHTMLElement(document.createTextNode('hi'))).toBe(false);
    // SVG elements are Element but not HTMLElement
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    expect(isHTMLElement(svg)).toBe(false);
  });
});

describe('isMatches', () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    root = document.createElement('div');
    root.className = 'container active';
    root.id = 'root';
    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
  });

  it('delegates to Element.matches', () => {
    expect(isMatches(root, '.container')).toBe(true);
    expect(isMatches(root, '#root')).toBe(true);
    expect(isMatches(root, 'div.active')).toBe(true);
    expect(isMatches(root, '.nope')).toBe(false);
  });

  it('returns false when the selector throws (invalid)', () => {
    expect(isMatches(root, '>>>not a selector<<<')).toBe(false);
  });

  it('falls back to webkitMatchesSelector when matches is absent', () => {
    const fake = {
      matches: undefined,
      webkitMatchesSelector: (sel: string) => sel === '.legacy',
    } as unknown as Element;
    expect(isMatches(fake, '.legacy')).toBe(true);
    expect(isMatches(fake, '.other')).toBe(false);
  });

  it('falls back to mozMatchesSelector when matches & webkit are absent', () => {
    const fake = {
      matches: undefined,
      webkitMatchesSelector: undefined,
      mozMatchesSelector: (sel: string) => sel === '.firefox',
    } as unknown as Element;
    expect(isMatches(fake, '.firefox')).toBe(true);
    expect(isMatches(fake, '.other')).toBe(false);
  });

  it('returns false when no matching method exists', () => {
    const bare = {} as unknown as Element;
    expect(isMatches(bare, '.x')).toBe(false);
  });
});

describe('escapeHtml', () => {
  it('escapes all five HTML-significant characters', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#39;');
  });

  it('escapes multiple special characters in a single string', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
    expect(escapeHtml("&lt;img src='x' onerror='bad()'>")).toBe(
      '&amp;lt;img src=&#39;x&#39; onerror=&#39;bad()&#39;&gt;',
    );
  });

  it('leaves plain strings without special characters untouched', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml('abc 123 !@#$%^')).toBe('abc 123 !@#$%^');
  });

  it('converts nullish inputs to an empty string', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('converts non-string inputs via String()', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(true)).toBe('true');
    expect(escapeHtml(0)).toBe('0');
  });

  it('produces output that is safe to interpolate into innerHTML', () => {
    const payload = '<img src=x onerror="alert(1)">';
    const escaped = escapeHtml(payload);
    const div = document.createElement('div');
    div.innerHTML = escaped;
    // No child element injected; treated as plain text
    expect(div.children.length).toBe(0);
    expect(div.textContent).toBe(payload);
  });
});

describe('escapeRegString', () => {
  it('escapes regex meta characters', () => {
    expect(escapeRegString('a.b')).toBe('a\\.b');
    expect(escapeRegString('$^*+?.()|[]{}\\')).toBe('\\$\\^\\*\\+\\?\\.\\(\\)\\|\\[\\]\\{\\}\\\\');
  });

  it('leaves plain strings untouched', () => {
    expect(escapeRegString('hello world')).toBe('hello world');
    expect(escapeRegString('')).toBe('');
  });

  it('produces a string that is safe to plug into RegExp', () => {
    const input = 'a.b*c';
    const re = new RegExp(escapeRegString(input));
    expect(re.test('a.b*c')).toBe(true);
    expect(re.test('axbxc')).toBe(false);
  });
});
