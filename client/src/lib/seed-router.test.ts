import { describe, expect, it } from "vitest";

import { resolveSeed } from "./seed-router";

describe("resolveSeed", () => {
  it("returns dashboard stats for /api/dashboard/stats", () => {
    const result = resolveSeed<{ data: { totalTickets: number } }>(
      "/api/dashboard/stats",
    );
    expect(result?.data.totalTickets).toBeGreaterThan(0);
  });

  it("parses period from ticket trend query string", () => {
    const day = resolveSeed<{ data: unknown[] }>(
      "/api/dashboard/tickets/trend?period=day",
    );
    const month = resolveSeed<{ data: unknown[] }>(
      "/api/dashboard/tickets/trend?period=month",
    );
    expect(day?.data.length).toBe(14);
    expect(month?.data.length).toBe(12);
  });

  it("returns live sessions for /sessions", () => {
    const result = resolveSeed<unknown[]>("/sessions") ?? [];
    expect(Array.isArray(result)).toBe(true);
    expect((result as { recordMode: boolean }[]).every((s) => !s.recordMode)).toBe(
      true,
    );
  });

  it("returns recorded sessions for /sessions/record", () => {
    const result = (resolveSeed<unknown[]>("/sessions/record") ??
      []) as { recordMode: boolean }[];
    expect(result.every((s) => s.recordMode)).toBe(true);
  });

  it("wraps paginated record requests in {rows,nextCursor} and applies q filter", () => {
    const all = resolveSeed<unknown[]>("/sessions/record") as {
      name: string;
    }[];
    const term = all[0].name.split(" ")[0].toLowerCase();
    const page = resolveSeed<{
      rows: { name: string }[];
      nextCursor: string | null;
    }>(`/sessions/record?q=${encodeURIComponent(term)}&limit=50`);
    expect(page).toBeDefined();
    expect(Array.isArray(page!.rows)).toBe(true);
    expect(page!.nextCursor).toBeNull();
    expect(
      page!.rows.every((r) => r.name.toLowerCase().includes(term)),
    ).toBe(true);
  });

  it("returns rrweb events for session events endpoint", () => {
    const events = resolveSeed<{ type: number; timestamp: number }[]>(
      "/api/session-replay/sessions/1000/events",
    );
    expect(events?.[0]?.type).toBe(4); // Meta
    expect(events?.[1]?.type).toBe(2); // FullSnapshot
    expect(events!.length).toBeGreaterThan(20);
  });

  it("returns metadata for the session detail endpoint", () => {
    const meta = resolveSeed<{ id: number; url: string }>(
      "/api/session-replay/sessions/1000",
    );
    expect(meta?.id).toBe(1000);
    expect(meta?.url).toContain("https://");
  });

  it("returns activity feed entries with required fields", () => {
    const feed = resolveSeed<
      { id: string; kind: string; title: string; at: string }[]
    >("/api/activity/feed");
    expect(feed?.length).toBeGreaterThan(0);
    for (const item of feed!) {
      expect(item.id).toMatch(/^[a-z]+-\d+-\d+$/);
      expect(["session", "ticket", "error", "join"]).toContain(item.kind);
      expect(item.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it("returns undefined for unmatched paths", () => {
    expect(resolveSeed("/unknown/path")).toBeUndefined();
  });
});
