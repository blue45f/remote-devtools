import * as matchers from '@testing-library/jest-dom/matchers';

// Side-effect: initialise i18n synchronously before any component test mounts.
// Components under test use `useTranslation`, which would otherwise fall through
// to the raw key string ("dashboard.title") until i18n boots.
import i18n from '@/shared/i18n';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, vi } from 'vitest';

expect.extend(matchers);

// The app defaults to Korean (see shared/i18n), but smoke tests assert on English
// copy. Pin every test to English so text-based queries stay valid. Resources are
// bundled, so changeLanguage is synchronous.
beforeEach(() => {
  void i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// jsdom polyfills — antd's responsive observers and Statistic/Spin internals
// reach for these browser APIs that jsdom does not implement.
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

if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = vi.fn();
}

if (typeof Element.prototype.hasPointerCapture !== 'function') {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => undefined;
  Element.prototype.setPointerCapture = () => undefined;
}

if (!window.IntersectionObserver) {
  window.IntersectionObserver = class implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '';
    readonly scrollMargin = '';
    readonly thresholds: ReadonlyArray<number> = [];

    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  };
}
