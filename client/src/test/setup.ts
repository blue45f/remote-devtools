import * as matchers from '@testing-library/jest-dom/matchers';

// Side-effect: initialise i18n synchronously before any component test mounts.
// Components under test use `useTranslation`, which would fall through to the
// raw key string ("topbar.openCommandPalette") if i18n hadn't booted yet.
import i18n from '@/lib/i18n';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, vi } from 'vitest';

expect.extend(matchers);

// The app now defaults to Korean (see lib/i18n.ts), but the test suite asserts
// on English copy. Pin every test to English so text-based queries stay valid;
// language-switching behaviour is covered by the LanguageMenu tests, which opt
// into `ko` explicitly. Resources are bundled, so changeLanguage is synchronous.
beforeEach(() => {
  void i18n.changeLanguage('en');
});

// Reset DOM between tests
afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

// jsdom polyfills
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Radix Dialog needs scrollIntoView
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = vi.fn();
}

// hasPointerCapture for Radix Select / DropdownMenu in jsdom
if (typeof Element.prototype.hasPointerCapture !== 'function') {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => undefined;
  Element.prototype.setPointerCapture = () => undefined;
}

// IntersectionObserver
if (!window.IntersectionObserver) {
  window.IntersectionObserver = class implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '';
    readonly scrollMargin = '';
    readonly thresholds = [];

    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  };
}
