import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { REPLAY_SPEEDS, useReplayPrefs } from "./replay-prefs";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("replay-prefs", () => {
  it("defaults to 1x speed when nothing is stored", () => {
    const { result } = renderHook(() => useReplayPrefs());
    expect(result.current[0].speed).toBe(1);
  });

  it("persists updates and reads them back across hook instances", () => {
    const first = renderHook(() => useReplayPrefs());
    act(() => first.result.current[1]({ speed: 2 }));
    expect(first.result.current[0].speed).toBe(2);

    const second = renderHook(() => useReplayPrefs());
    expect(second.result.current[0].speed).toBe(2);
  });

  it("ignores invalid speeds stored in localStorage", () => {
    localStorage.setItem("replay-prefs:v1", JSON.stringify({ speed: 999 }));
    const { result } = renderHook(() => useReplayPrefs());
    expect(result.current[0].speed).toBe(1);
  });

  it("survives malformed JSON", () => {
    localStorage.setItem("replay-prefs:v1", "not-json");
    const { result } = renderHook(() => useReplayPrefs());
    expect(result.current[0].speed).toBe(1);
  });

  it("exports the canonical speed list", () => {
    expect(REPLAY_SPEEDS).toEqual([0.5, 1, 2, 4]);
  });
});
