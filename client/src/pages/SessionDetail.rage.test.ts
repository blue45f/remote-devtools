import { describe, expect, it } from 'vitest';

import { detectRageClicks } from './SessionDetail';

interface ReplayEventLike {
  type: number;
  timestamp: number;
  data?: unknown;
}

function click(timestamp: number, x: number, y: number): ReplayEventLike {
  return {
    type: 3,
    timestamp,
    data: { source: 2, type: 2, id: 1, x, y },
  };
}

describe('detectRageClicks', () => {
  it('returns nothing when there are no incremental click events', () => {
    expect(detectRageClicks([])).toEqual([]);
    expect(
      detectRageClicks([
        { type: 4, timestamp: 0 },
        { type: 2, timestamp: 1 },
      ]),
    ).toEqual([]);
  });

  it('requires at least 3 close-together clicks', () => {
    // Two clicks — not a rage
    const two = detectRageClicks([click(1000, 10, 10), click(1100, 10, 10)]);
    expect(two).toEqual([]);

    // Three clicks — IS a rage
    const three = detectRageClicks([click(1000, 10, 10), click(1100, 10, 10), click(1200, 10, 10)]);
    expect(three).toHaveLength(1);
    expect(three[0].count).toBe(3);
    expect(three[0].startMs).toBe(1000);
  });

  it('ignores clicks too far apart in time', () => {
    // Three clicks but spread over 4s with the default 1.5s window
    const out = detectRageClicks([click(0, 10, 10), click(2000, 10, 10), click(4000, 10, 10)]);
    expect(out).toEqual([]);
  });

  it('ignores clicks too far apart in space', () => {
    const out = detectRageClicks([click(0, 10, 10), click(200, 200, 200), click(400, 400, 400)]);
    expect(out).toEqual([]);
  });

  it('does not double-count overlapping bursts', () => {
    // 5 rapid clicks should report as a single group of 5, not many
    const out = detectRageClicks([
      click(0, 10, 10),
      click(200, 10, 10),
      click(400, 10, 10),
      click(600, 10, 10),
      click(800, 10, 10),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].count).toBe(5);
  });
});
