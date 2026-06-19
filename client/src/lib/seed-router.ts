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
} from './seed';
import { resolveAdminSeed } from './seed-admin';
import { buildSeedRrwebEvents } from './seed-rrweb';

import i18n from '@/lib/i18n';

interface DemoComment {
  id: number;
  timestampMs: number;
  body: string;
  author: string | null;
  createdAt: string;
  resolved?: boolean;
}

const demoCommentStore = new Map<number, DemoComment[]>();
const demoCommentSeeded = new Set<number>();
let demoCommentSaveShouldFail = false;

/**
 * Test-only: clear the module-level demo comment state so the in-memory
 * store doesn't leak across test cases. No-op effect in production.
 */
export function __resetDemoComments(): void {
  demoCommentStore.clear();
  demoCommentSeeded.clear();
  demoCommentSaveShouldFail = false;
}

/**
 * Test-only: make the next demo comment save throw, so optimistic-insert
 * rollback paths are exercisable offline. No-op effect in production.
 */
export function __failNextDemoCommentSave(): void {
  demoCommentSaveShouldFail = true;
}

function seedDemoComments(recordId: number): DemoComment[] {
  // First time a session opens its comments panel in demo mode, drop in
  // a couple of representative comments so the UI isn't empty.
  if (demoCommentSeeded.has(recordId)) return demoCommentStore.get(recordId) ?? [];
  demoCommentSeeded.add(recordId);
  const initial: DemoComment[] = [
    {
      id: recordId * 1000 + 1,
      timestampMs: 4500,
      body: i18n.t('activity.demoReplayComment1'),
      author: 'qa',
      createdAt: new Date(Date.now() - 3 * 60_000).toISOString(),
    },
    {
      id: recordId * 1000 + 2,
      timestampMs: 12000,
      body: i18n.t('activity.demoReplayComment2'),
      author: 'frontend',
      createdAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    },
  ];
  demoCommentStore.set(recordId, initial);
  return initial;
}

function getDemoComments(recordId: number): DemoComment[] {
  return seedDemoComments(recordId);
}

function appendDemoComment(recordId: number, c: DemoComment): void {
  const list = seedDemoComments(recordId);
  list.push(c);
  list.sort((a, b) => a.timestampMs - b.timestampMs);
}

function deleteDemoComment(recordId: number, commentId: number): void {
  const list = demoCommentStore.get(recordId);
  if (!list) return;
  demoCommentStore.set(
    recordId,
    list.filter((c) => c.id !== commentId),
  );
}

function updateDemoComment(
  recordId: number,
  commentId: number,
  body: string,
): DemoComment | undefined {
  const list = seedDemoComments(recordId);
  const idx = list.findIndex((c) => c.id === commentId);
  if (idx < 0) return undefined;
  list[idx] = { ...list[idx], body };
  return list[idx];
}

function resolveDemoComment(
  recordId: number,
  commentId: number,
  resolved: boolean,
): DemoComment | undefined {
  const list = seedDemoComments(recordId);
  const idx = list.findIndex((c) => c.id === commentId);
  if (idx < 0) return undefined;
  list[idx] = { ...list[idx], resolved };
  return list[idx];
}

export function resolveSeed<T>(path: string, init?: RequestInit): T | undefined {
  // Demo-mode mutations don't hit a backend. Echo the parsed body back
  // as the result so optimistic UI keeps working offline. The api layer
  // also has this fallback but reaching it here keeps the test surface
  // visible.
  const method = (init?.method ?? 'GET').toUpperCase();
  // Unified admin surfaces (remote-devtools, profile, team) seed first.
  const adminSeed = resolveAdminSeed<T>(path, init, method);
  if (adminSeed !== undefined) return adminSeed;
  if (method === 'PUT' && /^\/sessions\/record\/\d+\/tags$/.test(path)) {
    const id = Number(path.split('/')[3]);
    try {
      const body = init?.body ? JSON.parse(init.body as string) : { tags: [] };
      const tags = Array.isArray(body?.tags)
        ? (body.tags as unknown[]).filter((t) => typeof t === 'string')
        : [];
      return { id, tags } as T;
    } catch {
      return { id, tags: [] } as T;
    }
  }
  if (method === 'PATCH' && /^\/sessions\/record\/\d+\/note$/.test(path)) {
    const id = Number(path.split('/')[3]);
    try {
      const body = init?.body ? JSON.parse(init.body as string) : { note: null };
      const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 4000) || null : null;
      return { id, note } as T;
    } catch {
      return { id, note: null } as T;
    }
  }
  // Replay comments (in-memory demo store, lives for the page session).
  const commentListMatch = path.match(/^\/sessions\/record\/(\d+)\/comments$/);
  if (commentListMatch) {
    const recordId = Number(commentListMatch[1]);
    if (method === 'GET') {
      return getDemoComments(recordId) as T;
    }
    if (method === 'POST' && init?.body) {
      if (demoCommentSaveShouldFail) {
        // One-shot test hook — surfaces as a rejected apiFetch, exactly
        // like a backend 5xx would.
        demoCommentSaveShouldFail = false;
        throw new Error('demo: comment save rejected');
      }
      try {
        const parsed = JSON.parse(init.body as string) as {
          timestampMs?: number;
          body?: string;
          author?: string;
        };
        const text = (parsed.body ?? '').trim();
        if (!text) return undefined;
        const saved: DemoComment = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          timestampMs: Math.max(0, Math.floor(parsed.timestampMs ?? 0)),
          body: text.slice(0, 2000),
          author: (parsed.author ?? null) || null,
          createdAt: new Date().toISOString(),
        };
        appendDemoComment(recordId, saved);
        return saved as T;
      } catch {
        return undefined;
      }
    }
  }
  const commentResolveMatch = path.match(/^\/sessions\/record\/(\d+)\/comments\/(\d+)\/resolve$/);
  if (commentResolveMatch && method === 'PATCH' && init?.body) {
    const recordId = Number(commentResolveMatch[1]);
    const commentId = Number(commentResolveMatch[2]);
    try {
      const parsed = JSON.parse(init.body as string) as { resolved?: boolean };
      const updated = resolveDemoComment(recordId, commentId, !!parsed.resolved);
      return updated as T;
    } catch {
      return undefined;
    }
  }
  const commentRowMatch = path.match(/^\/sessions\/record\/(\d+)\/comments\/(\d+)$/);
  if (commentRowMatch) {
    const recordId = Number(commentRowMatch[1]);
    const commentId = Number(commentRowMatch[2]);
    if (method === 'DELETE') {
      deleteDemoComment(recordId, commentId);
      return undefined as T; // 204 — apiFetch unwraps to undefined
    }
    if (method === 'PATCH' && init?.body) {
      try {
        const parsed = JSON.parse(init.body as string) as { body?: string };
        const text = (parsed.body ?? '').trim();
        if (!text) return undefined;
        const updated = updateDemoComment(recordId, commentId, text.slice(0, 2000));
        return updated as T;
      } catch {
        return undefined;
      }
    }
  }

  // /api/presence/:sessionId[/heartbeat] — demo shows the caller plus a
  // stub teammate so the indicator is non-trivial offline.
  if (/^\/api\/presence\//.test(path)) {
    const viewers = [
      { clientId: 'demo-self', name: null },
      { clientId: 'demo-teammate', name: 'teammate' },
    ];
    return { count: viewers.length, viewers } as unknown as T;
  }

  // /api/dashboard/stats
  if (path === '/api/dashboard/stats') {
    return { data: buildSeedStats() } as T;
  }
  // /api/dashboard/tickets/trend?period=...
  if (path.startsWith('/api/dashboard/tickets/trend')) {
    const period = new URLSearchParams(path.split('?')[1] ?? '').get('period') ?? 'day';
    return { data: buildTicketTrend(period) } as T;
  }
  if (path.startsWith('/api/dashboard/record-sessions/trend')) {
    const period = new URLSearchParams(path.split('?')[1] ?? '').get('period') ?? 'day';
    return { data: buildRecordTrend(period) } as T;
  }
  // /api/dashboard/top-hosts?period=…&limit=…
  if (path.startsWith('/api/dashboard/top-hosts')) {
    const params = new URLSearchParams(path.split('?')[1] ?? '');
    const limit = Number.parseInt(params.get('limit') ?? '8', 10) || 8;
    const counts = new Map<string, number>();
    for (const s of recordSeedSessions()) {
      try {
        const host = new URL(s.url ?? '').hostname.replace(/^www\./, '');
        if (!host) continue;
        counts.set(host, (counts.get(host) ?? 0) + 1);
      } catch {
        /* skip non-URLs */
      }
    }
    const rows = Array.from(counts.entries())
      .map(([host, count]) => ({ host, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, Math.min(Math.max(limit, 1), 25));
    return rows as unknown as T;
  }
  // /api/dashboard/recent-notes?limit=…
  if (path.startsWith('/api/dashboard/recent-notes')) {
    const params = new URLSearchParams(path.split('?')[1] ?? '');
    const limit = Number.parseInt(params.get('limit') ?? '5', 10) || 5;
    const annotated = recordSeedSessions()
      .filter((s) => s.hasNote)
      .map((s) => {
        const meta = buildSeedSessionMeta(s.id);
        return {
          id: s.id,
          name: s.name,
          note: meta.note ?? '',
          timestamp: s.timestamp,
        };
      })
      .filter((r) => r.note.trim().length > 0)
      .slice(0, Math.min(Math.max(limit, 1), 25));
    return annotated as unknown as T;
  }
  // /api/dashboard/top-tags?period=…&limit=…
  if (path.startsWith('/api/dashboard/top-tags')) {
    const params = new URLSearchParams(path.split('?')[1] ?? '');
    const limit = Number.parseInt(params.get('limit') ?? '8', 10) || 8;
    const counts = new Map<string, number>();
    for (const s of recordSeedSessions()) {
      for (const t of s.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    const rows = Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, Math.min(Math.max(limit, 1), 25));
    return rows as unknown as T;
  }
  // Unique tag list — aggregates from the seed sessions for autosuggest.
  if (path === '/sessions/record/tags') {
    const all = new Set<string>();
    for (const s of recordSeedSessions()) {
      for (const t of s.tags ?? []) all.add(t);
    }
    return Array.from(all).sort((a, b) => a.localeCompare(b)) as unknown as T;
  }
  // /sessions, /sessions/record (with optional pagination/search query string)
  if (path === '/sessions') {
    return liveSeedSessions() as unknown as T;
  }
  if (path === '/sessions/record' || path.startsWith('/sessions/record?')) {
    const qs = new URLSearchParams(path.split('?')[1] ?? '');
    const all = recordSeedSessions();
    const noFilters = [...qs.keys()].length === 0;
    if (noFilters) return all as unknown as T;
    const q = (qs.get('q') ?? '').toLowerCase();
    const filtered = q
      ? all.filter((s) => {
          const tags = (s.tags ?? []).join(' ').toLowerCase();
          return (
            s.name.toLowerCase().includes(q) ||
            (s.url ?? '').toLowerCase().includes(q) ||
            (s.deviceId ?? '').toLowerCase().includes(q) ||
            tags.includes(q)
          );
        })
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
  const previewMatch = path.match(/^\/api\/session-replay\/sessions\/(\d+)\/preview$/);
  if (previewMatch) {
    return buildSeedPreview(Number(previewMatch[1])) as unknown as T;
  }
  // Captured network rows for the Network tab.
  const networkMatch = path.match(/^\/api\/session-replay\/sessions\/(\d+)\/network$/);
  if (networkMatch) {
    return buildSeedNetwork(Number(networkMatch[1])) as unknown as T;
  }
  // Captured console / runtime rows for the Console tab.
  const consoleMatch = path.match(/^\/api\/session-replay\/sessions\/(\d+)\/console$/);
  if (consoleMatch) {
    return buildSeedConsole(Number(consoleMatch[1])) as unknown as T;
  }
  // Billing status (demo always reports billing disabled).
  if (path === '/api/billing/status') {
    return { enabled: false } as unknown as T;
  }
  // Activity feed (Phase 10 endpoint, demo only)
  if (path === '/api/activity/feed' || path.startsWith('/api/activity/feed?')) {
    const qs = new URLSearchParams(path.split('?')[1] ?? '');
    const before = qs.get('before');
    const limitParam = qs.get('limit');
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
      rows.length === limit && rows.length > 0 ? (rows[rows.length - 1]?.at ?? null) : null;
    return { rows, nextCursor } as unknown as T;
  }
  return undefined;
}

interface SeedNetworkRow {
  id: number;
  requestId: number;
  timestamp: number;
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  resourceType?: string;
  mimeType?: string;
  encodedDataLength?: number;
  responseBody?: string | null;
  base64Encoded?: boolean | null;
}

const SEED_NETWORK_ROWS: Omit<SeedNetworkRow, 'id' | 'requestId' | 'timestamp'>[] = [
  {
    method: 'GET',
    url: 'https://shop.example.com/cart/checkout',
    status: 200,
    statusText: 'OK',
    resourceType: 'Document',
    mimeType: 'text/html',
    encodedDataLength: 38221,
  },
  {
    method: 'GET',
    url: 'https://shop.example.com/static/app.css',
    status: 200,
    resourceType: 'Stylesheet',
    mimeType: 'text/css',
    encodedDataLength: 18432,
  },
  {
    method: 'POST',
    url: 'https://api.shop.example.com/v1/cart/items',
    status: 201,
    resourceType: 'Fetch',
    mimeType: 'application/json',
    encodedDataLength: 412,
    responseBody: '{"ok":true,"cartId":"cart_12ab34cd"}',
  },
  {
    method: 'GET',
    url: 'https://api.shop.example.com/v1/checkout/session',
    status: 401,
    statusText: 'Unauthorized',
    resourceType: 'Fetch',
    mimeType: 'application/json',
    encodedDataLength: 89,
  },
  {
    method: 'POST',
    url: 'https://api.shop.example.com/v1/log/error',
    status: 500,
    statusText: 'Internal Server Error',
    resourceType: 'Fetch',
    mimeType: 'application/json',
    encodedDataLength: 217,
  },
  {
    method: 'GET',
    url: 'https://cdn.shop.example.com/img/banner.jpg',
    status: 200,
    resourceType: 'Image',
    mimeType: 'image/jpeg',
    encodedDataLength: 112408,
  },
];

interface SeedConsoleRow {
  id: number;
  timestamp: number;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  text: string;
  source: 'console' | 'exception';
  url?: string;
  lineNumber?: number;
}

const SEED_CONSOLE_ROWS: Omit<SeedConsoleRow, 'id' | 'timestamp'>[] = [
  { level: 'log', text: 'Cart hydrated with 3 items', source: 'console' },
  {
    level: 'warn',
    text: 'Deprecation: legacy /v1/cart endpoint will be removed in March',
    source: 'console',
  },
  {
    level: 'error',
    text: "TypeError: cannot read property 'discount' of undefined",
    source: 'exception',
    url: 'https://shop.example.com/static/app.js',
    lineNumber: 1284,
  },
  { level: 'info', text: 'Stripe checkout opened in popup', source: 'console' },
  {
    level: 'error',
    text: 'Network request failed: 500 Internal Server Error',
    source: 'console',
  },
  { level: 'debug', text: 'feature flag: checkout_v2=true', source: 'console' },
];

function seedTimelineStartMs(id: number): number {
  const parsed = new Date(buildSeedSessionMeta(id).createdAt ?? '').getTime();
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function buildSeedConsole(id: number): SeedConsoleRow[] {
  const base = seedTimelineStartMs(id);
  return SEED_CONSOLE_ROWS.map((row, i) => ({
    ...row,
    id: id * 100 + 50 + i,
    timestamp: base + i * 900,
  }));
}

/** Returns a small fixture of captured network rows for a seeded session. */
function buildSeedNetwork(id: number): SeedNetworkRow[] {
  // S3-style sessions (string ids with "s3-" prefix) wouldn't hit this
  // branch — the route uses (\d+).
  const base = seedTimelineStartMs(id);
  return SEED_NETWORK_ROWS.map((row, i) => ({
    ...row,
    id: id * 100 + i,
    requestId: i + 1,
    timestamp: base + i * 1200,
  }));
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
        <span class="brand">${(meta.url ?? 'shop.example.com').replace(/https?:\/\//, '').split('/')[0]}</span>
        <a href="#">Products</a>
        <a href="#">Cart</a>
        <a href="#">Account</a>
        <span style="margin-left:auto"><button class="cta">Checkout</button></span>
      </div>
      <section class="hero">
        <h1>Captured customer page</h1>
        <p class="lead">${meta.name ?? `Session #${id}`} — recorded ${meta.createdAt ? new Date(meta.createdAt).toLocaleDateString() : 'recently'}.</p>
      </section>
      <section class="grid">
        <div class="card"><h3>Free shipping</h3><p>On orders over $40</p></div>
        <div class="card"><h3>30-day returns</h3><p>No questions asked</p></div>
        <div class="card"><h3>Live chat</h3><p>Replies in under 2 minutes</p></div>
      </section>`,
    bodyClass: 'page-checkout',
    width: 1280,
    height: 800,
    baseHref: meta.url ?? 'https://shop.example.com/',
    capturedAt: meta.createdAt ?? new Date().toISOString(),
  };
}

interface ActivityEntry {
  id: string;
  kind: 'session' | 'ticket' | 'error' | 'join' | 'comment';
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

  const kinds = ['session', 'ticket', 'error', 'join', 'comment'] as const;

  for (let i = 0; i < 15; i++) {
    const s = sessions[i % sessions.length];
    const offset = i * 11_000 + Math.floor(Math.random() * 5_000);
    const at = new Date(now - offset).toISOString();
    const kind = kinds[i % kinds.length];
    const titleByKind = {
      session: i18n.t('activity.titleRecordedSession', { name: s.name }),
      ticket: i18n.t('activity.titleTicketCreated', { name: s.name }),
      error: i18n.t('activity.titleConsoleError', { host: s.url.split('/')[2] }),
      join: i18n.t('activity.titleEngineerJoined', { name: s.name }),
      comment: i18n.t('activity.titleCommentBy', { name: s.name }),
    };
    const subtitleByKind = {
      session: s.url,
      ticket: s.url,
      error: s.url,
      join: s.url,
      comment:
        i % 2 === 0 ? i18n.t('activity.demoCommentOffset') : i18n.t('activity.demoCommentSpinner'),
    };
    events.push({
      id: `${kind}-${i}-${s.id}`,
      kind,
      title: titleByKind[kind],
      subtitle: subtitleByKind[kind],
      at,
      device: s.deviceId,
      sessionId: s.recordMode ? s.id : undefined,
    });
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}
