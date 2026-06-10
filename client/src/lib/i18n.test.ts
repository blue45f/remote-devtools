import { describe, expect, it } from 'vitest';

import i18n from './i18n';

// lib/i18n.ts mirrors the resolved language onto <html lang> so screen
// readers pick the matching speech engine (WCAG 3.1.1). The global test setup
// pins the language to English before each test, which already exercises the
// languageChanged listener once.
describe('i18n <html lang> sync', () => {
  it('keeps <html lang> on the resolved language', () => {
    expect(i18n.resolvedLanguage).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('updates <html lang> when the language changes', async () => {
    await i18n.changeLanguage('ko');
    expect(document.documentElement.lang).toBe('ko');

    await i18n.changeLanguage('en');
    expect(document.documentElement.lang).toBe('en');
  });
});
