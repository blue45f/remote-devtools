import { describe, expect, it, vi } from "vitest";

import {
  formatDurationFromNanos,
  formatNumber,
  formatTimeAgo,
  shortHash,
  truncate,
} from "./format";

const MS = 1_000_000;

describe("formatDurationFromNanos", () => {
  it("returns em dash for missing or non-positive values", () => {
    expect(formatDurationFromNanos(undefined)).toBe("—");
    expect(formatDurationFromNanos(0)).toBe("—");
    expect(formatDurationFromNanos(-1)).toBe("—");
    expect(formatDurationFromNanos("nope")).toBe("—");
  });

  it("formats sub-second values in ms", () => {
    expect(formatDurationFromNanos(500 * MS)).toBe("500ms");
    expect(formatDurationFromNanos(999 * MS)).toBe("999ms");
  });

  it("formats seconds", () => {
    expect(formatDurationFromNanos(1500 * MS)).toBe("1s");
    expect(formatDurationFromNanos(45_000 * MS)).toBe("45s");
  });

  it("formats minutes with optional seconds", () => {
    expect(formatDurationFromNanos(60_000 * MS)).toBe("1m");
    expect(formatDurationFromNanos(95_000 * MS)).toBe("1m 35s");
  });

  it("formats hours and minutes", () => {
    expect(formatDurationFromNanos(3_600_000 * MS)).toBe("1h");
    expect(formatDurationFromNanos((3_600_000 + 7 * 60_000) * MS)).toBe("1h 7m");
  });

  it("accepts numeric strings (gateway returns BigInt as string)", () => {
    expect(formatDurationFromNanos(`${1500 * MS}`)).toBe("1s");
  });
});

describe("formatTimeAgo", () => {
  it("handles missing input", () => {
    expect(formatTimeAgo()).toBe("—");
    expect(formatTimeAgo("not a date")).toBe("—");
  });

  it("uses 'just now' for recent timestamps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-27T10:00:00Z"));
    expect(formatTimeAgo("2026-04-27T09:59:30Z")).toBe("just now");
    expect(formatTimeAgo("2026-04-27T10:00:30Z")).toBe("just now"); // future falls into just now
    vi.useRealTimers();
  });

  it("buckets minutes / hours / days / months / years", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-27T10:00:00Z"));
    expect(formatTimeAgo("2026-04-27T09:55:00Z")).toBe("5m ago");
    expect(formatTimeAgo("2026-04-27T07:00:00Z")).toBe("3h ago");
    expect(formatTimeAgo("2026-04-25T10:00:00Z")).toBe("2d ago");
    expect(formatTimeAgo("2026-02-15T10:00:00Z")).toBe("2mo ago");
    expect(formatTimeAgo("2024-01-01T00:00:00Z")).toBe("2y ago");
    vi.useRealTimers();
  });
});

describe("formatNumber", () => {
  it("returns 0 for missing values", () => {
    expect(formatNumber(undefined)).toBe("0");
    expect(formatNumber(NaN)).toBe("0");
  });

  it("uses thousands separators below 1K", () => {
    expect(formatNumber(950)).toBe("950");
  });

  it("compacts thousands and millions", () => {
    expect(formatNumber(1500)).toBe("1.5K");
    expect(formatNumber(8423)).toBe("8.4K");
    expect(formatNumber(2_500_000)).toBe("2.5M");
  });
});

describe("truncate", () => {
  it("returns empty string for missing input", () => {
    expect(truncate(undefined)).toBe("");
  });

  it("returns the original when within limit", () => {
    expect(truncate("short")).toBe("short");
  });

  it("appends ellipsis when truncated", () => {
    expect(truncate("abcdefghij", 5)).toBe("abcd…");
  });
});

describe("shortHash", () => {
  it("returns em dash for missing input", () => {
    expect(shortHash()).toBe("—");
  });

  it("preserves short values", () => {
    expect(shortHash("abc", 8)).toBe("abc");
  });

  it("truncates with ellipsis", () => {
    expect(shortHash("abcdefghijkl", 6)).toBe("abcdef…");
  });
});
