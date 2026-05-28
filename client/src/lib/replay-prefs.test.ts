import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { REPLAY_SPEEDS, useReplayPrefs } from './replay-prefs';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('replay-prefs', () => {
  it('defaults to 1x speed and skipInactive=false when nothing is stored', () => {
    const { result } = renderHook(() => useReplayPrefs());
    expect(result.current[0]).toEqual({ speed: 1, skipInactive: false });
  });

  it('persists updates and reads them back across hook instances', () => {
    const first = renderHook(() => useReplayPrefs());
    act(() => first.result.current[1]({ speed: 2 }));
    act(() => first.result.current[1]({ skipInactive: true }));
    expect(first.result.current[0]).toEqual({ speed: 2, skipInactive: true });

    const second = renderHook(() => useReplayPrefs());
    expect(second.result.current[0]).toEqual({ speed: 2, skipInactive: true });
  });

  it('ignores invalid speeds stored in localStorage', () => {
    localStorage.setItem('replay-prefs:v1', JSON.stringify({ speed: 999, skipInactive: true }));
    const { result } = renderHook(() => useReplayPrefs());
    expect(result.current[0]).toEqual({ speed: 1, skipInactive: true });
  });

  it('coerces non-boolean skipInactive to the default', () => {
    localStorage.setItem('replay-prefs:v1', JSON.stringify({ speed: 2, skipInactive: 'yes' }));
    const { result } = renderHook(() => useReplayPrefs());
    expect(result.current[0]).toEqual({ speed: 2, skipInactive: false });
  });

  it('survives malformed JSON', () => {
    localStorage.setItem('replay-prefs:v1', 'not-json');
    const { result } = renderHook(() => useReplayPrefs());
    expect(result.current[0]).toEqual({ speed: 1, skipInactive: false });
  });

  it('exports the canonical speed list', () => {
    expect(REPLAY_SPEEDS).toEqual([0.5, 1, 2, 4]);
  });
});
