/**
 * Demo-mode seed data for the unified admin surfaces (remote-devtools, profile,
 * team). Kept separate from seed.ts/seed-router.ts so the operator-console seeds
 * stay readable. resolveAdminSeed() is called first by the seed router.
 */
import type { UserProfile } from '@/domains/profile/types';
import type { RemoteEvent, RemoteEventLevel, RemoteSession } from '@/domains/remote-devtools/types';
import type { Member } from '@/domains/team/types';

let createdCounter = 0;

export function buildRemoteSessions(): RemoteSession[] {
  const now = Date.now();
  const base: Array<Partial<RemoteSession> & Pick<RemoteSession, 'id' | 'name' | 'status'>> = [
    {
      id: 'rd-1001',
      name: 'checkout-flow / chrome-mac',
      status: 'running',
      environment: 'production',
      deviceId: 'device-a1',
      device: { name: 'MacBook Pro', platform: 'macOS', browser: 'Chrome 124' },
      participantCount: 3,
      eventsCount: 42,
      roomUrl: 'https://app.example.com/rooms/rd-1001',
    },
    {
      id: 'rd-1002',
      name: 'billing-modal / safari-ios',
      status: 'connected',
      environment: 'staging',
      deviceId: 'device-b2',
      device: { name: 'iPhone 15', platform: 'iOS', browser: 'Safari 17' },
      participantCount: 1,
      eventsCount: 12,
    },
    {
      id: 'rd-1003',
      name: 'onboarding / edge-win',
      status: 'waiting',
      environment: 'production',
      deviceId: 'device-c3',
      device: { name: 'Surface', platform: 'Windows', browser: 'Edge 124' },
      participantCount: 0,
      eventsCount: 0,
    },
    {
      id: 'rd-1004',
      name: 'search-page / firefox-linux',
      status: 'error',
      environment: 'production',
      deviceId: 'device-d4',
      device: { name: 'ThinkPad', platform: 'Linux', browser: 'Firefox 126' },
      participantCount: 2,
      eventsCount: 28,
    },
    {
      id: 'rd-1005',
      name: 'profile-settings / chrome-android',
      status: 'idle',
      environment: 'staging',
      deviceId: 'device-e5',
      device: { name: 'Pixel 8', platform: 'Android', browser: 'Chrome 124' },
      participantCount: 0,
      eventsCount: 5,
    },
  ];
  return base.map((s, i) => ({
    startedAt: new Date(now - (i + 1) * 5 * 60_000).toISOString(),
    lastHeartbeatAt: new Date(now - i * 4_000).toISOString(),
    tags: [],
    ...s,
  })) as RemoteSession[];
}

const EVENT_SEEDS: Array<{
  type: string;
  level: RemoteEventLevel;
  source: string;
  message: string;
  payload?: unknown;
}> = [
  {
    type: 'cdp.network',
    level: 'info',
    source: 'Network',
    message: 'GET /v1/cart 200',
    payload: { status: 200, ms: 84 },
  },
  {
    type: 'cdp.console',
    level: 'warn',
    source: 'Console',
    message: 'Deprecation: legacy cart endpoint',
    payload: { count: 1 },
  },
  {
    type: 'cdp.runtime',
    level: 'error',
    source: 'Runtime',
    message: "TypeError: cannot read 'discount' of undefined",
    payload: { line: 1284, file: 'app.js' },
  },
  {
    type: 'cdp.network',
    level: 'info',
    source: 'Network',
    message: 'POST /v1/checkout 201',
    payload: { status: 201 },
  },
  { type: 'cdp.dom', level: 'debug', source: 'DOM', message: 'mutation: 14 nodes added' },
  {
    type: 'cdp.network',
    level: 'error',
    source: 'Network',
    message: 'GET /v1/session 401',
    payload: { status: 401 },
  },
  {
    type: 'cdp.console',
    level: 'info',
    source: 'Console',
    message: 'feature flag checkout_v2=true',
  },
];

export function buildRemoteEvents(sessionId: string): RemoteEvent[] {
  const now = Date.now();
  return EVENT_SEEDS.map((e, i) => ({
    id: `${sessionId}-evt-${i}`,
    sessionId,
    timestamp: new Date(now - (EVENT_SEEDS.length - i) * 3_000).toISOString(),
    ...e,
  }));
}

export function buildDemoProfile(empNo: string): UserProfile {
  return {
    id: 1,
    name: 'Demo Operator',
    username: 'demo',
    jobType: 'DEV',
    slackId: 'U0DEMO',
    empNo,
    deviceInfoList: [
      { deviceId: 'device-a1', name: 'MacBook Pro' },
      { deviceId: 'device-e5', name: 'Pixel 8' },
    ],
    ticketTemplateList: [
      {
        id: 1,
        name: 'Bug — Checkout',
        jiraProjectKey: 'SHOP',
        epicTicket: 'SHOP-100',
        titlePrefix: '[Checkout]',
        componentList: ['cart', 'payment'],
        labelList: ['bug', 'p1'],
        assigneeInfoList: [{ accountId: 'acc-1', displayName: 'QA Lead' }],
      },
    ],
    lastSelectedTemplate: { id: 1, name: 'Bug — Checkout' },
    createdAt: new Date(Date.now() - 90 * 86_400_000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function buildDemoMembers(): Member[] {
  return [
    {
      id: 'm-1',
      name: 'Demo Operator',
      email: 'owner@example.com',
      role: 'owner',
      status: 'active',
    },
    { id: 'm-2', name: 'Jin Park', email: 'jin@example.com', role: 'admin', status: 'active' },
    { id: 'm-3', name: 'Sora Lee', email: 'sora@example.com', role: 'member', status: 'active' },
    { id: 'm-4', email: 'pending@example.com', role: 'viewer', status: 'invited' },
  ];
}

/**
 * Returns a seed payload for an admin-surface path, or undefined to let the
 * router fall through to the operator-console seeds / network.
 */
export function resolveAdminSeed<T>(
  path: string,
  init: RequestInit | undefined,
  method: string,
): T | undefined {
  // ── Remote DevTools ───────────────────────────────────────────────
  if (path === '/api/remote-devtools/sessions') {
    if (method === 'POST') {
      createdCounter += 1;
      const id = `rd-new-${createdCounter}`;
      return {
        id,
        name: `new-session-${createdCounter}`,
        status: 'idle',
        environment: 'staging',
        participantCount: 0,
        eventsCount: 0,
        startedAt: new Date().toISOString(),
      } as unknown as T;
    }
    return buildRemoteSessions() as unknown as T;
  }
  const eventsMatch = path.match(/^\/api\/remote-devtools\/sessions\/([^/]+)\/events$/);
  if (eventsMatch && method === 'GET') {
    return buildRemoteEvents(decodeURIComponent(eventsMatch[1])) as unknown as T;
  }
  if (/^\/api\/remote-devtools\/sessions\/[^/]+\/commands$/.test(path) && method === 'POST') {
    return { ok: true } as unknown as T;
  }

  // ── Profile ───────────────────────────────────────────────────────
  const profileMatch = path.match(/^\/api\/user-profile\/([^/]+)$/);
  if (profileMatch && method === 'GET') {
    return buildDemoProfile(decodeURIComponent(profileMatch[1])) as unknown as T;
  }
  const upsertMatch = path.match(/^\/api\/user-profile\/([^/]+)\/upsert$/);
  if (upsertMatch && method === 'PUT') {
    const empNo = decodeURIComponent(upsertMatch[1]);
    const merged = buildDemoProfile(empNo);
    try {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      return { ...merged, ...body, empNo } as unknown as T;
    } catch {
      return merged as unknown as T;
    }
  }

  // ── Team ──────────────────────────────────────────────────────────
  if (path === '/api/accounts/organization/members' && method === 'GET') {
    return buildDemoMembers() as unknown as T;
  }

  return undefined;
}
