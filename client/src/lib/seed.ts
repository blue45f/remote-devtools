/**
 * Seed data for demo mode. Designed so that every page in the app
 * shows realistic content even when the backend is unreachable.
 */

const DAY = 24 * 60 * 60 * 1000;
const MS_TO_NANOS = 1_000_000;

const URLS = [
  "https://shop.example.com/cart/checkout",
  "https://app.acme.io/dashboard",
  "https://staging.acme.io/login",
  "https://news.example.com/article/2026/04/launch",
  "https://api.example.com/health",
  "https://app.acme.io/settings/billing",
  "https://shop.example.com/products/sk-1234",
  "https://app.acme.io/onboarding/step-2",
];

const DEVICES = [
  "iPhone 15 Pro · iOS 18",
  "Pixel 8 · Android 15",
  "MacBook Pro 14 · Chrome 147",
  "Galaxy S24 · Samsung Internet",
  "Surface Pro · Edge 144",
  "iPad Pro · Safari 18",
];

const NAMES = [
  "checkout-flow-test",
  "billing-modal-bug",
  "onboarding-step-fail",
  "settings-permissions",
  "homepage-perf-trace",
  "search-suggestions",
  "auth-flaky-redirect",
  "image-upload-403",
  "dark-mode-flicker",
  "table-pagination-jump",
  "live-stream-debug",
  "live-checkout-monitor",
];

function deviceHash(seed: number) {
  // Stable pseudo hash so the same seed produces the same id
  return `device-${seed.toString(16).padStart(6, "0")}-${(seed * 31 + 11)
    .toString(16)
    .padStart(6, "0")}`;
}

export interface SeedSession {
  id: number;
  name: string;
  url: string;
  deviceId: string;
  duration: number; // nanoseconds
  recordMode: boolean;
  timestamp: string;
}

export function buildSeedSessions(): SeedSession[] {
  const now = Date.now();
  return NAMES.map((name, i) => {
    const seconds = [12, 47, 240, 1240, 18, 96, 720, 33, 5400, 64, 0, 0][i] ??
      30;
    const isLive = i >= 10;
    return {
      id: 1000 + i,
      name,
      url: URLS[i % URLS.length],
      deviceId: deviceHash(i),
      duration: isLive ? 0 : seconds * 1000 * MS_TO_NANOS,
      recordMode: !isLive,
      timestamp: new Date(now - i * 17 * 60_000).toISOString(),
    };
  });
}

export function liveSeedSessions(): SeedSession[] {
  return buildSeedSessions().filter((s) => !s.recordMode);
}

export function recordSeedSessions(): SeedSession[] {
  return buildSeedSessions().filter((s) => s.recordMode);
}

/* ─────────────  Dashboard stats / trends  ───────────── */

export interface SeedStats {
  totalTickets: number;
  todayTickets: number;
  weeklyAverage: number;
  totalRecordSessions: number;
  todayRecordSessions: number;
  weeklyAverageRecordSessions: number;
}

export function buildSeedStats(): SeedStats {
  return {
    totalTickets: 1284,
    todayTickets: 23,
    weeklyAverage: 18,
    totalRecordSessions: 8423,
    todayRecordSessions: 142,
    weeklyAverageRecordSessions: 118,
  };
}

export interface SeedTrendItem {
  date: string;
  created: number;
  developer: number;
  designer: number;
  pm: number;
  qa: number;
  other: number;
  messages: number;
  participants: number;
}

function pseudoRand(seed: number) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function buildTicketTrend(period: string): SeedTrendItem[] {
  const len = period === "month" ? 12 : period === "week" ? 8 : 14;
  const now = Date.now();
  return Array.from({ length: len }, (_, i) => {
    const offset = (len - 1 - i) * (period === "month" ? 30 : period === "week" ? 7 : 1);
    const date = new Date(now - offset * DAY);
    const total = 12 + Math.floor(pseudoRand(i + 1) * 28);
    const developer = Math.floor(total * 0.45);
    const designer = Math.floor(total * 0.18);
    const pm = Math.floor(total * 0.15);
    const qa = Math.floor(total * 0.12);
    const other = total - developer - designer - pm - qa;
    return {
      date:
        period === "month"
          ? date.toLocaleString(undefined, { month: "short" })
          : date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      created: total,
      developer,
      designer,
      pm,
      qa,
      other: Math.max(0, other),
      messages: total * 4,
      participants: total + Math.floor(pseudoRand(i + 100) * 6),
    };
  });
}

export function buildRecordTrend(period: string): SeedTrendItem[] {
  const base = buildTicketTrend(period);
  return base.map((item, i) => ({
    ...item,
    created: 80 + Math.floor(pseudoRand(i + 50) * 120),
    messages: 200 + Math.floor(pseudoRand(i + 80) * 400),
  }));
}

/* ─────────────  Session detail  ───────────── */

export interface SeedReplayEvent {
  type: number;
  timestamp: number;
  data?: unknown;
}

export function buildSeedSessionMeta(id: number) {
  const found = buildSeedSessions().find((s) => s.id === id);
  if (!found) {
    return {
      id,
      name: `unknown-${id}`,
      deviceId: deviceHash(id),
      url: "https://app.example.com/",
      duration: 60_000 * MS_TO_NANOS,
      recordMode: true,
      createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
      eventCount: 0,
    };
  }
  return {
    id: found.id,
    name: found.name,
    deviceId: found.deviceId,
    url: found.url,
    duration: found.duration,
    recordMode: found.recordMode,
    createdAt: found.timestamp,
    eventCount: 0,
  };
}

// buildSeedEvents lives in seed-router.ts so it can import the rrweb fixture
// without forcing this lightweight module to depend on it.
