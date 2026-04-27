/**
 * Maps API paths to seed responses for demo mode.
 * Returns undefined for unmatched paths so the caller falls back to network.
 */
import {
  buildRecordTrend,
  buildSeedSessionMeta,
  buildSeedSessions,
  buildSeedStats,
  buildTicketTrend,
  liveSeedSessions,
  recordSeedSessions,
} from "./seed";
import { buildSeedRrwebEvents } from "./seed-rrweb";

export function resolveSeed<T>(path: string): T | undefined {
  // /api/dashboard/stats
  if (path === "/api/dashboard/stats") {
    return { data: buildSeedStats() } as T;
  }
  // /api/dashboard/tickets/trend?period=...
  if (path.startsWith("/api/dashboard/tickets/trend")) {
    const period = new URLSearchParams(path.split("?")[1] ?? "").get("period") ?? "day";
    return { data: buildTicketTrend(period) } as T;
  }
  if (path.startsWith("/api/dashboard/record-sessions/trend")) {
    const period = new URLSearchParams(path.split("?")[1] ?? "").get("period") ?? "day";
    return { data: buildRecordTrend(period) } as T;
  }
  // /sessions, /sessions/record (with optional pagination/search query string)
  if (path === "/sessions") {
    return liveSeedSessions() as unknown as T;
  }
  if (path === "/sessions/record" || path.startsWith("/sessions/record?")) {
    const qs = new URLSearchParams(path.split("?")[1] ?? "");
    const all = recordSeedSessions();
    const noFilters = [...qs.keys()].length === 0;
    if (noFilters) return all as unknown as T;
    const q = (qs.get("q") ?? "").toLowerCase();
    const filtered = q
      ? all.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.url ?? "").toLowerCase().includes(q) ||
            (s.deviceId ?? "").toLowerCase().includes(q),
        )
      : all;
    return { rows: filtered, nextCursor: null } as unknown as T;
  }
  // /api/session-replay/sessions/:id
  const metaMatch = path.match(/^\/api\/session-replay\/sessions\/(\d+)$/);
  if (metaMatch) {
    return buildSeedSessionMeta(Number(metaMatch[1])) as unknown as T;
  }
  const eventsMatch = path.match(/^\/api\/session-replay\/sessions\/(\d+)\/events$/);
  if (eventsMatch) {
    const meta = buildSeedSessionMeta(Number(eventsMatch[1]));
    const start = new Date(meta.createdAt ?? Date.now()).getTime();
    return buildSeedRrwebEvents(start) as unknown as T;
  }
  // Session preview thumbnail (head + body HTML for the iframe card)
  const previewMatch = path.match(
    /^\/api\/session-replay\/sessions\/(\d+)\/preview$/,
  );
  if (previewMatch) {
    return buildSeedPreview(Number(previewMatch[1])) as unknown as T;
  }
  // Billing status (demo always reports billing disabled).
  if (path === "/api/billing/status") {
    return { enabled: false } as unknown as T;
  }
  // Activity feed (Phase 10 endpoint, demo only)
  if (path === "/api/activity/feed" || path.startsWith("/api/activity/feed?")) {
    const qs = new URLSearchParams(path.split("?")[1] ?? "");
    const before = qs.get("before");
    const limitParam = qs.get("limit");
    const limit = limitParam ? Math.max(1, Number(limitParam)) || 20 : 20;
    const all = buildActivityFeed();

    if (!before) {
      // Back-compat shape — bare array.
      return all.slice(0, limit) as unknown as T;
    }
    const beforeTime = new Date(before).getTime();
    const filtered = Number.isNaN(beforeTime)
      ? all
      : all.filter((e) => new Date(e.at).getTime() < beforeTime);
    const rows = filtered.slice(0, limit);
    const nextCursor =
      rows.length === limit && rows.length > 0
        ? (rows[rows.length - 1]?.at ?? null)
        : null;
    return { rows, nextCursor } as unknown as T;
  }
  return undefined;
}

/** Returns a static screenPreview for any seeded session id. */
function buildSeedPreview(id: number) {
  const meta = buildSeedSessionMeta(id);
  return {
    head: `<style>
      body { margin: 0; font: 15px -apple-system, "Inter Variable", sans-serif; background: #fafafa; color: #171717; }
      .nav { display: flex; align-items: center; gap: 16px; padding: 14px 20px; border-bottom: 1px solid #e5e5e5; background: #fff; }
      .brand { font-weight: 700; }
      .nav a { color: #525252; text-decoration: none; font-size: 13px; }
      .hero { padding: 40px 20px; max-width: 720px; margin: 0 auto; }
      h1 { font-size: 32px; line-height: 1.1; letter-spacing: -.02em; margin: 12px 0 8px; }
      .lead { color: #525252; font-size: 15px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; padding: 0 20px; max-width: 920px; margin: 0 auto; }
      .card { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 16px; }
      .card h3 { margin: 0 0 4px; font-size: 14px; }
      .card p { margin: 0; color: #737373; font-size: 12px; }
      .cta { background: #171717; color: #fff; padding: 8px 14px; border-radius: 8px; border: 0; font-size: 12px; }
    </style>`,
    body: `
      <div class="nav">
        <span class="brand">${(meta.url ?? "shop.example.com").replace(/https?:\/\//, "").split("/")[0]}</span>
        <a href="#">Products</a>
        <a href="#">Cart</a>
        <a href="#">Account</a>
        <span style="margin-left:auto"><button class="cta">Checkout</button></span>
      </div>
      <section class="hero">
        <h1>Captured customer page</h1>
        <p class="lead">${meta.name ?? `Session #${id}`} — recorded ${meta.createdAt ? new Date(meta.createdAt).toLocaleDateString() : "recently"}.</p>
      </section>
      <section class="grid">
        <div class="card"><h3>Free shipping</h3><p>On orders over $40</p></div>
        <div class="card"><h3>30-day returns</h3><p>No questions asked</p></div>
        <div class="card"><h3>Live chat</h3><p>Replies in under 2 minutes</p></div>
      </section>`,
    bodyClass: "page-checkout",
    width: 1280,
    height: 800,
    baseHref: meta.url ?? "https://shop.example.com/",
    capturedAt: meta.createdAt ?? new Date().toISOString(),
  };
}

interface ActivityEntry {
  id: string;
  kind: "session" | "ticket" | "error" | "join";
  title: string;
  subtitle?: string;
  at: string;
  device?: string;
  sessionId?: number;
}

function buildActivityFeed(): ActivityEntry[] {
  const now = Date.now();
  const sessions = buildSeedSessions();
  const events: ActivityEntry[] = [];

  for (let i = 0; i < 14; i++) {
    const s = sessions[i % sessions.length];
    const offset = i * 11_000 + Math.floor(Math.random() * 5_000);
    const at = new Date(now - offset).toISOString();
    const kind = (["session", "ticket", "error", "join"] as const)[i % 4];
    const titleByKind = {
      session: `Recorded session · ${s.name}`,
      ticket: `Ticket created on ${s.name}`,
      error: `Console error in ${s.url.split("/")[2]}`,
      join: `Engineer joined ${s.name}`,
    };
    events.push({
      id: `${kind}-${i}-${s.id}`,
      kind,
      title: titleByKind[kind],
      subtitle: s.url,
      at,
      device: s.deviceId,
      sessionId: s.recordMode ? s.id : undefined,
    });
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}
