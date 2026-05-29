/**
 * Seed data for demo mode. Designed so that every page in the app
 * shows realistic content even when the backend is unreachable.
 */
import i18n from '@/lib/i18n';

const DAY = 24 * 60 * 60 * 1000;
const MS_TO_NANOS = 1_000_000;

const URLS = [
  'https://shop.example.com/cart/checkout',
  'https://app.example.com/dashboard',
  'https://staging.example.com/login',
  'https://news.example.com/article/2026/04/launch',
  'https://api.example.com/health',
  'https://app.example.com/settings/billing',
  'https://shop.example.com/products/sk-1234',
  'https://app.example.com/onboarding/step-2',
];

const NAMES = [
  'checkout-flow-test',
  'billing-modal-bug',
  'onboarding-step-fail',
  'settings-permissions',
  'homepage-perf-trace',
  'search-suggestions',
  'auth-flaky-redirect',
  'image-upload-403',
  'dark-mode-flicker',
  'table-pagination-jump',
  'live-stream-debug',
  'live-checkout-monitor',
];

function deviceHash(seed: number) {
  // Stable pseudo hash so the same seed produces the same id
  return `device-${seed.toString(16).padStart(6, '0')}-${(seed * 31 + 11)
    .toString(16)
    .padStart(6, '0')}`;
}

export interface SeedSession {
  id: number;
  name: string;
  url: string;
  deviceId: string;
  duration: number; // nanoseconds
  recordMode: boolean;
  timestamp: string;
  userAgent: string;
  tags: string[];
  hasNote: boolean;
}

const SEED_TAGS: string[][] = [
  ['checkout', 'bug'],
  ['pricing'],
  [],
  ['mobile', 'verified'],
  ['error'],
  [],
];

const USER_AGENTS: string[] = [
  // Chrome / macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  // Safari / iOS
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  // Firefox / Linux
  'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
  // Edge / Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0',
  // Chrome / Android
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
];

let cachedSeedSessions: SeedSession[] | undefined;

export function buildSeedSessions(): SeedSession[] {
  if (cachedSeedSessions) return cachedSeedSessions;
  const now = Date.now();
  cachedSeedSessions = NAMES.map((name, i) => {
    const seconds = [12, 47, 240, 1240, 18, 96, 720, 33, 5400, 64, 0, 0][i] ?? 30;
    const isLive = i >= 10;
    return {
      id: 1000 + i,
      name,
      url: URLS[i % URLS.length],
      deviceId: deviceHash(i),
      duration: isLive ? 0 : seconds * 1000 * MS_TO_NANOS,
      recordMode: !isLive,
      timestamp: new Date(now - i * 17 * 60_000).toISOString(),
      userAgent: USER_AGENTS[i % USER_AGENTS.length],
      tags: SEED_TAGS[i % SEED_TAGS.length],
      // Session 1000 ships a seeded note (see buildSeedSessionMeta).
      hasNote: 1000 + i === 1000,
    };
  });
  return cachedSeedSessions;
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
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function buildTicketTrend(period: string): SeedTrendItem[] {
  const len = period === 'month' ? 12 : period === 'week' ? 8 : 14;
  const now = Date.now();
  return Array.from({ length: len }, (_, i) => {
    const offset = (len - 1 - i) * (period === 'month' ? 30 : period === 'week' ? 7 : 1);
    const date = new Date(now - offset * DAY);
    const total = 12 + Math.floor(pseudoRand(i + 1) * 28);
    const developer = Math.floor(total * 0.45);
    const designer = Math.floor(total * 0.18);
    const pm = Math.floor(total * 0.15);
    const qa = Math.floor(total * 0.12);
    const other = total - developer - designer - pm - qa;
    return {
      date:
        period === 'month'
          ? date.toLocaleString(undefined, { month: 'short' })
          : date.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            }),
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
      url: 'https://app.example.com/',
      duration: 60_000 * MS_TO_NANOS,
      recordMode: true,
      createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
      eventCount: 0,
      userAgent: USER_AGENTS[0],
      tags: [] as string[],
      note: null as string | null,
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
    userAgent: found.userAgent,
    tags: found.tags,
    note: found.id === 1000 ? i18n.t('activity.demoSessionNote') : null,
  };
}

// buildSeedEvents lives in seed-router.ts so it can import the rrweb fixture
// without forcing this lightweight module to depend on it.
