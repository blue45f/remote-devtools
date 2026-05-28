import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearRecentSessions, recordSessionVisit, useRecentSessions } from './recent-sessions';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('recent-sessions', () => {
  it('records a visit and reads it back via the hook', () => {
    recordSessionVisit({ id: 'abc', name: 'demo', url: 'https://x.test/' });
    const { result } = renderHook(() => useRecentSessions());
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('abc');
    expect(result.current[0].name).toBe('demo');
    expect(result.current[0].visitedAt).toBeTypeOf('number');
  });

  it('deduplicates by id — most-recent visit floats to the top', () => {
    recordSessionVisit({ id: 'a', name: 'first' });
    recordSessionVisit({ id: 'b', name: 'second' });
    recordSessionVisit({ id: 'a', name: 'first-again' });

    const { result } = renderHook(() => useRecentSessions());
    expect(result.current.map((r) => r.id)).toEqual(['a', 'b']);
    expect(result.current[0].name).toBe('first-again');
  });

  it('caps the ring at 5 entries', () => {
    for (let i = 0; i < 8; i++) {
      recordSessionVisit({ id: `id-${i}` });
    }
    const { result } = renderHook(() => useRecentSessions());
    expect(result.current).toHaveLength(5);
    expect(result.current[0].id).toBe('id-7');
    expect(result.current[4].id).toBe('id-3');
  });

  it('clearRecentSessions wipes the list', () => {
    recordSessionVisit({ id: 'a' });
    const { result } = renderHook(() => useRecentSessions());
    expect(result.current).toHaveLength(1);

    act(() => clearRecentSessions());
    expect(result.current).toHaveLength(0);
  });

  it('survives malformed storage by returning an empty list', () => {
    localStorage.setItem('recent-sessions:v1', 'not-json');
    const { result } = renderHook(() => useRecentSessions());
    expect(result.current).toEqual([]);
  });

  it('ignores entries with missing id or visitedAt', () => {
    localStorage.setItem(
      'recent-sessions:v1',
      JSON.stringify([
        { id: 'ok', visitedAt: 1 },
        { id: 123, visitedAt: 1 },
        { id: 'no-time' },
        { visitedAt: 2 },
      ]),
    );
    const { result } = renderHook(() => useRecentSessions());
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('ok');
  });
});
