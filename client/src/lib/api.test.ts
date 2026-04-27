import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "./api";

describe("apiFetch", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("issues a network request when demo mode is off", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const result = await apiFetch<{ ok: boolean }>("/api/dashboard/stats");
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns seed data without touching the network when demo mode is on", async () => {
    localStorage.setItem("demo-mode", "1");
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const result = await apiFetch<{ data: { totalTickets: number } }>(
      "/api/dashboard/stats",
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.data.totalTickets).toBeGreaterThan(0);
  });

  it("throws when the network responds with non-2xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("nope", { status: 503 }),
    );
    await expect(apiFetch("/sessions")).rejects.toThrow(/API error: 503/);
  });

  it("falls back to network when seed router does not match the path", async () => {
    localStorage.setItem("demo-mode", "1");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    await apiFetch("/something/not/seeded");
    expect(fetchMock).toHaveBeenCalled();
  });
});
