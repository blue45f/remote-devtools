import { describe, expect, it } from "vitest";

import { buildSeedRrwebEvents } from "./seed-rrweb";

describe("buildSeedRrwebEvents", () => {
  it("starts with a Meta event (type 4)", () => {
    const events = buildSeedRrwebEvents(0);
    expect(events[0].type).toBe(4);
    expect(events[0].data).toMatchObject({
      href: expect.any(String),
      width: expect.any(Number),
      height: expect.any(Number),
    });
  });

  it("includes a FullSnapshot (type 2) right after Meta", () => {
    const events = buildSeedRrwebEvents(0);
    expect(events[1].type).toBe(2);
    const data = events[1].data as { node: { type: number; id: number } };
    expect(data.node.type).toBe(0); // Document
    expect(data.node.id).toBe(0);
  });

  it("emits monotonically increasing timestamps", () => {
    const start = 1_700_000_000_000;
    const events = buildSeedRrwebEvents(start);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].timestamp).toBeGreaterThanOrEqual(events[i - 1].timestamp);
    }
  });

  it("contains incremental events (type 3) after the snapshot", () => {
    const events = buildSeedRrwebEvents(0);
    const incremental = events.filter((e) => e.type === 3);
    expect(incremental.length).toBeGreaterThan(10);
  });

  it("does not produce malformed event types", () => {
    const events = buildSeedRrwebEvents(0);
    const validTypes = new Set([0, 1, 2, 3, 4, 5]);
    for (const e of events) {
      expect(validTypes.has(e.type)).toBe(true);
    }
  });
});
