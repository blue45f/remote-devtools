/**
 * Lightweight route prefetch helper for our `lazy()` route chunks.
 *
 * React Router v7 does not bundle a `Link prefetch` prop the way Remix does,
 * so we trigger the dynamic import manually on hover/focus. The browser
 * caches the chunk, and clicking the link is then near-instant.
 *
 * Usage:
 *   <a onMouseEnter={() => prefetchRoute("/sessions")} ...>
 */

const PREFETCHERS: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/sessions": () => import("@/pages/Sessions"),
  "/sandbox/module": () => import("@/pages/SdkModule"),
  "/sandbox/script": () => import("@/pages/SdkScript"),
  "/pricing": () => import("@/pages/Pricing"),
  "/sign-in": () => import("@/pages/SignIn"),
  "/sign-up": () => import("@/pages/SignUp"),
};

const STARTED = new Set<string>();

export function prefetchRoute(path: string) {
  // Match exact or prefix (e.g. /sessions/42 → /sessions chunk)
  const key = path in PREFETCHERS
    ? path
    : Object.keys(PREFETCHERS).find((p) => path.startsWith(p + "/"));
  if (!key || STARTED.has(key)) return;
  STARTED.add(key);
  void PREFETCHERS[key]().catch(() => {
    // Re-allow retry on next hover if it failed.
    STARTED.delete(key);
  });
}
