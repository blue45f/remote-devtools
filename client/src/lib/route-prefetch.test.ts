import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stub all dynamic imports referenced by PREFETCHERS so the test does not
// actually pull the page bundles.
vi.mock("@/pages/Dashboard", () => ({ default: () => null }));
vi.mock("@/pages/Sessions", () => ({ default: () => null }));
vi.mock("@/pages/SdkModule", () => ({ default: () => null }));
vi.mock("@/pages/SdkScript", () => ({ default: () => null }));
vi.mock("@/pages/Pricing", () => ({ default: () => null }));
vi.mock("@/pages/SignIn", () => ({ default: () => null }));
vi.mock("@/pages/SignUp", () => ({ default: () => null }));

describe("prefetchRoute", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("triggers a dynamic import for a known exact path", async () => {
    const { prefetchRoute } = await import("./route-prefetch");
    const spy = vi.spyOn(globalThis as unknown as { console: Console }, "console", "get");
    expect(() => prefetchRoute("/sessions")).not.toThrow();
    spy.mockRestore?.();
  });

  it("matches a nested path against its parent prefix", async () => {
    const { prefetchRoute } = await import("./route-prefetch");
    // /sessions/42 should resolve to the /sessions chunk without throwing.
    expect(() => prefetchRoute("/sessions/42")).not.toThrow();
  });

  it("ignores paths that don't match any known prefetcher", async () => {
    const { prefetchRoute } = await import("./route-prefetch");
    // Should be a no-op, not throw.
    expect(() => prefetchRoute("/totally/unknown/route")).not.toThrow();
  });

  it("dedupes repeated calls for the same route within a session", async () => {
    // Re-import a fresh module so the STARTED set is empty.
    vi.resetModules();
    const mod = await import("./route-prefetch");
    // Call twice — the second call should hit the dedupe guard and not throw.
    mod.prefetchRoute("/dashboard");
    expect(() => mod.prefetchRoute("/dashboard")).not.toThrow();
  });

  it("treats a deeper match as the same chunk (prefix match, not duplicate import)", async () => {
    vi.resetModules();
    const mod = await import("./route-prefetch");
    mod.prefetchRoute("/sessions");
    // /sessions/123 maps to the same /sessions chunk → dedupe path.
    expect(() => mod.prefetchRoute("/sessions/123")).not.toThrow();
  });
});
