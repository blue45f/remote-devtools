import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useDocumentTitle } from './use-document-title';

afterEach(() => {
  document.title = '';
});

describe('useDocumentTitle', () => {
  it('sets the title to "<title> · Remote DevTools"', () => {
    renderHook(() => useDocumentTitle('Sessions'));
    expect(document.title).toBe('Sessions · Remote DevTools');
  });

  it('falls back to the marketing title when no title is given', () => {
    renderHook(() => useDocumentTitle(undefined));
    expect(document.title).toContain('Remote DevTools');
  });

  it('restores the default title on unmount', () => {
    const { unmount } = renderHook(() => useDocumentTitle('Dashboard'));
    expect(document.title).toBe('Dashboard · Remote DevTools');
    unmount();
    expect(document.title).toContain('Remote DevTools');
    expect(document.title).not.toBe('Dashboard · Remote DevTools');
  });
});
