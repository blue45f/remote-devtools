import { describe, expect, it } from "vitest";

import {
  buildRecordTrend,
  buildSeedSessionMeta,
  buildSeedSessions,
  buildSeedStats,
  buildTicketTrend,
  liveSeedSessions,
  recordSeedSessions,
} from "./seed";

describe("buildSeedSessions", () => {
  it("returns at least 12 entries with stable shape", () => {
    const sessions = buildSeedSessions();
    expect(sessions.length).toBeGreaterThanOrEqual(12);
    for (const s of sessions) {
      expect(s).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        url: expect.any(String),
        deviceId: expect.any(String),
        timestamp: expect.any(String),
        recordMode: expect.any(Boolean),
      });
    }
  });

  it("partitions live and record sessions", () => {
    const all = buildSeedSessions();
    const live = liveSeedSessions();
    const recorded = recordSeedSessions();
    expect(live.every((s) => s.recordMode === false)).toBe(true);
    expect(recorded.every((s) => s.recordMode === true)).toBe(true);
    expect(live.length + recorded.length).toBe(all.length);
  });
});

describe("buildSeedStats", () => {
  it("provides finite numbers for every field", () => {
    const stats = buildSeedStats();
    Object.values(stats).forEach((v) => {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    });
  });
});

describe("buildTicketTrend / buildRecordTrend", () => {
  it("returns 14 daily entries by default", () => {
    expect(buildTicketTrend("day")).toHaveLength(14);
    expect(buildRecordTrend("day")).toHaveLength(14);
  });

  it("varies length by period", () => {
    expect(buildTicketTrend("week")).toHaveLength(8);
    expect(buildTicketTrend("month")).toHaveLength(12);
  });

  it("each ticket trend item sums roles into 'created' total", () => {
    const trend = buildTicketTrend("day");
    for (const item of trend) {
      const sum = item.developer + item.designer + item.pm + item.qa + item.other;
      expect(sum).toBe(item.created);
    }
  });
});

describe("buildSeedSessionMeta + buildSeedEvents", () => {
  it("returns a metadata record for known seed ids", () => {
    const sessions = buildSeedSessions();
    const meta = buildSeedSessionMeta(sessions[0]!.id);
    expect(meta.id).toBe(sessions[0]!.id);
    expect(meta.url).toBe(sessions[0]!.url);
  });

  it("falls back gracefully for unknown ids", () => {
    const meta = buildSeedSessionMeta(999_999);
    expect(meta.id).toBe(999_999);
    expect(meta.recordMode).toBe(true);
  });

});
