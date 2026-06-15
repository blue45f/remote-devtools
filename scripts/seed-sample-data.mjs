#!/usr/bin/env node
/**
 * Rich, idempotent local sample-data seeder for Remote DevTools.
 *
 * Populates the local Postgres with realistic breadth so the dashboard,
 * Sessions list, Session detail (Replay / Timeline / Network / Console),
 * thumbnails, activity feed, and team/admin surfaces all have something
 * meaningful to render against real DB rows — no demo mode required.
 *
 * Connection settings are read from the standard DB_* env vars (matching
 * `libs/core/src/config/database.config.ts`), falling back to the local
 * QA defaults. Pass them inline, e.g.
 *
 *   DB_HOST=localhost DB_PORT=5433 DB_USER=qa DB_PASSWORD=qa \
 *   DB_NAME=remotedevtools node scripts/seed-sample-data.mjs
 *
 * Safety: this script refuses to run against a *.neon.tech host.
 *
 * Idempotency: keyed off stable natural keys (account email, org slug,
 * record name, device id, screen (record,type) unique constraint). Re-running
 * upserts rather than duplicating. Pass `--reset` to wipe seeded rows first.
 */
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

import pg from 'pg';

const scrypt = promisify(scryptCallback);

const RESET = process.argv.includes('--reset');

const host = process.env.DB_HOST ?? process.env.DB_WRITER_HOST ?? 'localhost';
if (/neon\.tech/i.test(host)) {
  console.error(`[seed] refusing to run against a Neon host: ${host}`);
  process.exit(1);
}

const client = new pg.Client({
  host,
  port: Number(process.env.DB_PORT ?? 5433),
  user: process.env.DB_USER ?? process.env.DB_USERNAME ?? 'qa',
  password: process.env.DB_PASSWORD ?? 'qa',
  database: process.env.DB_NAME ?? process.env.DB_DATABASE ?? 'remotedevtools',
});

/* ────────────────────────── helpers ────────────────────────── */

const NS_PER_MS = 1_000_000n;
const DAY_MS = 86_400_000;

/** Deterministic PRNG so repeated runs produce a stable shape. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260615);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pickN = (arr, n) => {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
};
const intBetween = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

/* ────────────────────── seed content tables ────────────────────── */

const UA_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const UA_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
const UA_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const UA_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const UA_FIREFOX =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) Gecko/20100101 Firefox/125.0';
const USER_AGENTS = [UA_DESKTOP, UA_WINDOWS, UA_IPHONE, UA_ANDROID, UA_FIREFOX];

const SCENARIOS = [
  { name: 'Checkout payment failure', url: 'https://shop.example.com/checkout', tags: ['bug', 'checkout', 'payment'], note: 'Stripe 3DS 콜백 후 빈 화면. step 2에서 재현됨.' },
  { name: 'Cart quantity desync', url: 'https://shop.example.com/cart', tags: ['bug', 'cart'], note: '수량 +/- 빠르게 누르면 합계가 어긋남.' },
  { name: 'Product gallery lazy-load jank', url: 'https://shop.example.com/p/aurora-jacket', tags: ['perf', 'ui'], note: null },
  { name: 'Login redirect loop', url: 'https://app.example.com/login', tags: ['bug', 'auth', 'p1'], note: 'SSO 후 /login ↔ /dashboard 무한 리다이렉트.' },
  { name: 'Dashboard chart misalign', url: 'https://app.example.com/dashboard', tags: ['ui', 'regression'], note: null },
  { name: 'Settings save no feedback', url: 'https://app.example.com/settings/profile', tags: ['ux', 'feedback'], note: '저장 버튼 눌러도 토스트가 안 뜸.' },
  { name: 'Search empty state copy', url: 'https://app.example.com/search?q=zzz', tags: ['ux', 'copy'], note: null },
  { name: 'Onboarding step 3 stuck', url: 'https://app.example.com/onboarding/3', tags: ['onboarding', 'p2'], note: '다음 버튼 비활성. 약관 체크 후에도 안 풀림.' },
  { name: 'Mobile nav overlap', url: 'https://m.example.com/home', tags: ['mobile', 'ui'], note: '햄버거 메뉴가 헤더와 겹침 (iPhone SE).' },
  { name: 'Pricing toggle a11y', url: 'https://www.example.com/pricing', tags: ['a11y', 'pricing'], note: null },
  { name: 'Blog image 404', url: 'https://blog.example.com/posts/launch', tags: ['content', 'bug'], note: '히어로 이미지가 404.' },
  { name: 'Live triage — support escalation', url: 'https://app.example.com/tickets/4821', tags: ['live', 'support'], note: null },
  { name: 'API timeout on export', url: 'https://app.example.com/reports/export', tags: ['bug', 'api', 'p1'], note: 'CSV 내보내기 30s 타임아웃.' },
  { name: 'Form validation flicker', url: 'https://app.example.com/signup', tags: ['ux', 'forms'], note: null },
  { name: 'Dark mode contrast', url: 'https://app.example.com/settings/appearance', tags: ['a11y', 'theme'], note: '다크모드에서 보조 텍스트 대비 부족.' },
  { name: 'Infinite scroll duplicate', url: 'https://feed.example.com/', tags: ['bug', 'feed'], note: null },
  { name: 'Video player buffering', url: 'https://watch.example.com/v/8821', tags: ['perf', 'media'], note: '720p에서 끊김 반복.' },
  { name: 'Coupon stacking exploit', url: 'https://shop.example.com/checkout', tags: ['bug', 'security', 'p1'], note: '쿠폰 두 개가 동시에 적용됨.' },
  { name: 'Address autocomplete blank', url: 'https://shop.example.com/checkout/shipping', tags: ['bug', 'forms'], note: null },
  { name: 'Notification badge stale', url: 'https://app.example.com/inbox', tags: ['bug', 'realtime'], note: '읽음 처리 후에도 배지가 남음.' },
];

const TEAM = [
  { name: 'Jisoo Park', username: 'jisoo.park', jobType: 'QA', slackId: 'U0QA0001', empNo: 'E1001' },
  { name: 'Minho Kang', username: 'minho.kang', jobType: 'DEV', slackId: 'U0DEV001', empNo: 'E1002' },
  { name: 'Yuna Seo', username: 'yuna.seo', jobType: 'PD', slackId: 'U0PD0001', empNo: 'E1003' },
  { name: 'Daniel Cho', username: 'daniel.cho', jobType: 'PM', slackId: 'U0PM0001', empNo: 'E1004' },
  { name: 'Haeun Lim', username: 'haeun.lim', jobType: 'QA', slackId: 'U0QA0002', empNo: 'E1005' },
  { name: 'Tae Kim', username: 'tae.kim', jobType: 'DEV', slackId: 'U0DEV002', empNo: 'E1006' },
  { name: 'Sora Han', username: 'sora.han', jobType: 'OTHER', slackId: 'U0OT0001', empNo: 'E1007' },
];

const CONSOLE_LINES = [
  { level: 'log', text: '[checkout] mounting step 2' },
  { level: 'info', text: '[analytics] page_view fired' },
  { level: 'warn', text: 'Deprecated prop `onToggle` will be removed in v3' },
  { level: 'error', text: 'TypeError: Cannot read properties of undefined (reading "total")' },
  { level: 'log', text: '[cart] recalculated subtotal = 124.00' },
  { level: 'debug', text: 'feature flag `new-replay-bar` = on' },
  { level: 'warn', text: 'Slow network: response > 2000ms for /api/checkout' },
  { level: 'error', text: 'Uncaught (in promise) Error: 3DS challenge cancelled' },
];

const NET_TEMPLATES = [
  { path: '/api/products', method: 'GET', status: 200, mime: 'application/json', type: 'XHR' },
  { path: '/api/cart', method: 'GET', status: 200, mime: 'application/json', type: 'XHR' },
  { path: '/api/checkout', method: 'POST', status: 500, mime: 'application/json', type: 'Fetch' },
  { path: '/api/user/me', method: 'GET', status: 304, mime: 'application/json', type: 'XHR' },
  { path: '/assets/app.js', method: 'GET', status: 200, mime: 'application/javascript', type: 'Script' },
  { path: '/assets/hero.webp', method: 'GET', status: 404, mime: 'text/html', type: 'Image' },
  { path: '/api/coupons/validate', method: 'POST', status: 422, mime: 'application/json', type: 'Fetch' },
  { path: '/api/reports/export', method: 'POST', status: 504, mime: 'text/plain', type: 'Fetch' },
];

const COMMENTS = [
  { body: '여기서 결제 버튼 눌렀는데 스피너만 돌고 끝.', author: 'Jisoo Park', resolved: false },
  { body: '네트워크 탭 보면 /api/checkout 500 떨어짐. 백엔드 로그 확인 필요.', author: 'Tae Kim', resolved: false },
  { body: '재현 됨 — 3DS 콜백 핸들러에서 throw. 수정 PR 올림.', author: 'Minho Kang', resolved: true },
  { body: '디자인 의도상 토스트가 떠야 함. UX 스펙 첨부.', author: 'Yuna Seo', resolved: false },
  { body: '이건 모바일에서만 재현. 데스크탑은 정상.', author: 'Haeun Lim', resolved: false },
  { body: 'P1로 올립니다. 결제 이탈 직접 영향.', author: 'Daniel Cho', resolved: false },
];

/** Build a single screenPreview protocol envelope for a given scenario. */
function buildPreviewProtocol(scenario) {
  const hostName = new URL(scenario.url).host;
  const head = `
    <style>
      body { font: 16px -apple-system, "Inter Variable", sans-serif; margin: 0; background: #fafafa; color: #171717; }
      .nav { display: flex; align-items: center; gap: 16px; padding: 16px 24px; border-bottom: 1px solid #e5e5e5; background: #fff; }
      .brand { font-weight: 700; }
      .nav a { color: #525252; text-decoration: none; font-size: 14px; }
      .hero { padding: 48px 24px; max-width: 720px; margin: 0 auto; }
      h1 { font-size: 32px; line-height: 1.12; letter-spacing: -0.02em; margin: 0 0 12px; }
      .lead { color: #525252; font-size: 16px; }
      .cards { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; padding: 0 24px; max-width: 960px; margin: 0 auto; }
      .card { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 18px; }
      .card h3 { margin: 0 0 6px; font-size: 15px; }
      .card p { margin: 0; color: #737373; font-size: 13px; }
      .cta { background: #171717; color: #fff; padding: 10px 18px; border-radius: 8px; border: 0; font-size: 14px; }
    </style>`;
  const body = `
    <div class="nav">
      <span class="brand">${hostName}</span>
      <a href="#">Products</a><a href="#">Cart</a><a href="#">Account</a>
      <span style="margin-left:auto"><button class="cta">Checkout</button></span>
    </div>
    <section class="hero">
      <h1>${scenario.name}</h1>
      <p class="lead">SDK가 플랫폼으로 보낸 캡처된 페이지 스냅샷입니다. 아래는 ${hostName} 화면의 하이라이트 모듈입니다.</p>
    </section>
    <section class="cards">
      <div class="card"><h3>Free shipping</h3><p>On orders over $40</p></div>
      <div class="card"><h3>30-day returns</h3><p>No questions asked</p></div>
      <div class="card"><h3>Live chat</h3><p>Replies in under 2 minutes</p></div>
    </section>`;
  return {
    method: 'ScreenPreview.captured',
    params: {
      head,
      body,
      bodyClass: 'page-' + hostName.split('.')[0],
      width: 1280,
      height: 800,
      isMobile: scenario.url.startsWith('https://m.'),
      baseHref: scenario.url,
    },
  };
}

/** Build a small rrweb event stream (Meta + FullSnapshot + Incremental). */
function buildRRWebEvents(startMs, durationMs) {
  const events = [
    { type: 4, timestamp: startMs, data: { href: 'page', width: 1280, height: 720 } },
    {
      type: 2,
      timestamp: startMs + 60,
      data: { node: { type: 0, id: 0, childNodes: [] }, initialOffset: { left: 0, top: 0 } },
    },
  ];
  const steps = intBetween(8, 22);
  for (let i = 0; i < steps; i += 1) {
    const t = startMs + Math.floor((durationMs * (i + 1)) / (steps + 1));
    if (i % 4 === 3) {
      events.push({ type: 3, timestamp: t, data: { source: 2, type: 2, id: 100 + i, x: intBetween(20, 1200), y: intBetween(40, 700) } });
    } else {
      events.push({ type: 3, timestamp: t, data: { source: 1, positions: [{ x: intBetween(20, 1200), y: intBetween(40, 700), id: 1, timeOffset: 0 }] } });
    }
  }
  return events;
}

/* ───────────────────────────── main ───────────────────────────── */

async function ensurePgcrypto() {
  // accounts/organizations PKs default to uuid_generate_v4 / uuid-ossp; ensure
  // the extension exists when the synchronize boot path didn't install it.
  await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`).catch(() => {});
  await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`).catch(() => {});
}

async function seedOrganization() {
  const slug = 'acme-qa';
  const existing = await client.query('SELECT id FROM organizations WHERE slug = $1', [slug]);
  if (existing.rows[0]) return existing.rows[0].id;
  const res = await client.query(
    `INSERT INTO organizations (slug, name, plan, subscription_status)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [slug, 'Acme QA Workspace', 'pro', 'active'],
  );
  return res.rows[0].id;
}

async function upsertAccount(orgId, { email, name, password, role }) {
  const passwordHash = password ? await hashPassword(password) : null;
  const found = await client.query('SELECT id FROM accounts WHERE email = $1', [email]);
  let accountId;
  if (found.rows[0]) {
    accountId = found.rows[0].id;
    // refresh name + password so the documented credentials always work
    await client.query(
      `UPDATE accounts SET name = $2, status = 'active',
       password_hash = COALESCE($3, password_hash), updated_at = now() WHERE id = $1`,
      [accountId, name, passwordHash],
    );
  } else {
    const res = await client.query(
      `INSERT INTO accounts (email, name, password_hash, status, last_login_at)
       VALUES ($1, $2, $3, 'active', now()) RETURNING id`,
      [email, name, passwordHash],
    );
    accountId = res.rows[0].id;
  }
  const member = await client.query(
    'SELECT id FROM organization_members WHERE org_id = $1 AND account_id = $2',
    [orgId, accountId],
  );
  if (member.rows[0]) {
    await client.query(
      `UPDATE organization_members SET role = $3, status = 'active', joined_at = COALESCE(joined_at, now()),
       updated_at = now() WHERE id = $1 AND org_id = $2`,
      [member.rows[0].id, orgId, role],
    );
  } else {
    await client.query(
      `INSERT INTO organization_members (org_id, account_id, role, status, joined_at)
       VALUES ($1, $2, $3, 'active', now())`,
      [orgId, accountId, role],
    );
  }
  return accountId;
}

async function seedUsersAndDevices(orgId) {
  const deviceIds = [];
  for (const member of TEAM) {
    const found = await client.query('SELECT id FROM users WHERE emp_no = $1', [member.empNo]);
    let userId;
    if (found.rows[0]) {
      userId = found.rows[0].id;
      await client.query(
        `UPDATE users SET name=$2, username=$3, job_type=$4, slack_id=$5, org_id=$6, updated_at=now() WHERE id=$1`,
        [userId, member.name, member.username, member.jobType, member.slackId, orgId],
      );
    } else {
      const res = await client.query(
        `INSERT INTO users (name, username, job_type, slack_id, emp_no, org_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [member.name, member.username, member.jobType, member.slackId, member.empNo, orgId],
      );
      userId = res.rows[0].id;
    }
    const deviceId = `device-${member.username}`;
    const dev = await client.query('SELECT id FROM device_info_list WHERE device_id = $1', [deviceId]);
    if (!dev.rows[0]) {
      await client.query(
        `INSERT INTO device_info_list (user_id, device_id, device_name, org_id)
         VALUES ($1, $2, $3, $4)`,
        [userId, deviceId, `${member.name}'s laptop`, orgId],
      );
    }
    deviceIds.push({ deviceId, member });
  }
  return deviceIds;
}

async function seedRecords(orgId, devices) {
  const now = Date.now();
  const created = [];
  // 36 sessions spread across the last ~60 days; ~30% live (recordMode=false).
  for (let i = 0; i < 36; i += 1) {
    const scenario = SCENARIOS[i % SCENARIOS.length];
    const variant = i < SCENARIOS.length ? '' : ` #${Math.floor(i / SCENARIOS.length) + 1}`;
    const name = `${scenario.name}${variant}`;
    const recordMode = rand() > 0.3; // most are recordings
    const daysAgo = Math.floor((i / 36) * 60) + (rand() < 0.5 ? 0 : 1);
    // Cluster some on "today" so the dashboard's today/weekly counters light up.
    const offsetMs = i < 5 ? intBetween(0, 6) * 3_600_000 : daysAgo * DAY_MS + intBetween(0, 23) * 3_600_000;
    const ts = new Date(now - offsetMs);
    const durationMs = intBetween(6_000, 95_000);
    const device = pick(devices);

    const found = await client.query('SELECT id FROM record WHERE name = $1', [name]);
    let recordId;
    if (found.rows[0]) {
      recordId = found.rows[0].id;
      await client.query(
        `UPDATE record SET duration=$2, url=$3, device_id=$4, record_mode=$5, referrer=$6,
         user_agent=$7, tags=$8, note=$9, "timestamp"=$10, org_id=$11 WHERE id=$1`,
        [
          recordId,
          String(BigInt(durationMs) * NS_PER_MS),
          scenario.url,
          device.deviceId,
          recordMode,
          new URL(scenario.url).origin,
          pick(USER_AGENTS),
          scenario.tags,
          scenario.note,
          ts,
          orgId,
        ],
      );
    } else {
      const res = await client.query(
        `INSERT INTO record (name, duration, url, device_id, record_mode, referrer, user_agent, tags, note, "timestamp", org_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [
          name,
          String(BigInt(durationMs) * NS_PER_MS),
          scenario.url,
          device.deviceId,
          recordMode,
          new URL(scenario.url).origin,
          pick(USER_AGENTS),
          scenario.tags,
          scenario.note,
          ts,
          orgId,
        ],
      );
      recordId = res.rows[0].id;
    }
    created.push({ recordId, scenario, recordMode, tsMs: ts.getTime(), durationMs, device, orgId });
  }
  return created;
}

async function seedScreens(rec) {
  const { recordId, scenario, durationMs, orgId } = rec;
  const startNs = BigInt(rec.tsMs) * NS_PER_MS;

  // rrweb replay stream — wipe + reinsert for idempotency (no unique key on these)
  await client.query(`DELETE FROM screen WHERE "recordId" = $1 AND (type IS NULL OR type <> 'screenPreview')`, [recordId]);
  const rrwebEvents = buildRRWebEvents(rec.tsMs, durationMs);
  let seq = 0;
  for (const evt of rrwebEvents) {
    const eventType = evt.type === 2 ? 'full_snapshot' : evt.type === 4 ? 'meta' : 'incremental';
    await client.query(
      `INSERT INTO screen (event_type, protocol, "timestamp", sequence, "recordId", org_id)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        eventType,
        JSON.stringify({ method: 'SessionReplay.rrwebEvent', params: { event: evt } }),
        String(startNs + BigInt(seq) * NS_PER_MS),
        seq,
        recordId,
        orgId,
      ],
    );
    seq += 1;
  }

  // screenPreview (unique on record+type) — upsert
  const preview = buildPreviewProtocol(scenario);
  const existing = await client.query(
    `SELECT id FROM screen WHERE "recordId" = $1 AND type = 'screenPreview'`,
    [recordId],
  );
  if (existing.rows[0]) {
    await client.query(`UPDATE screen SET protocol = $2, "timestamp" = $3 WHERE id = $1`, [
      existing.rows[0].id,
      JSON.stringify(preview),
      String(BigInt(rec.tsMs) * NS_PER_MS),
    ]);
  } else {
    await client.query(
      `INSERT INTO screen (type, event_type, protocol, "timestamp", sequence, "recordId", org_id)
       VALUES ('screenPreview', null, $1, $2, 999, $3, $4)`,
      [JSON.stringify(preview), String(BigInt(rec.tsMs) * NS_PER_MS), recordId, orgId],
    );
  }
}

async function seedNetwork(rec) {
  const { recordId, scenario, orgId } = rec;
  await client.query(`DELETE FROM network WHERE "recordId" = $1`, [recordId]);
  const origin = new URL(scenario.url).origin;
  const count = intBetween(4, NET_TEMPLATES.length);
  const chosen = pickN(NET_TEMPLATES, count);
  let reqId = 1;
  for (const t of chosen) {
    const ts = BigInt(rec.tsMs + intBetween(100, rec.durationMs)) * NS_PER_MS;
    await client.query(
      `INSERT INTO network ("requestId", "responseBody", "base64Encoded", protocol, "timestamp", "recordId", org_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        reqId,
        t.mime.includes('json') ? JSON.stringify({ ok: t.status < 400, status: t.status }) : null,
        false,
        JSON.stringify({
          method: 'Network.responseReceived',
          params: {
            request: { url: origin + t.path, method: t.method },
            response: {
              url: origin + t.path,
              status: t.status,
              statusText: t.status === 200 ? 'OK' : t.status === 404 ? 'Not Found' : 'Error',
              mimeType: t.mime,
              encodedDataLength: intBetween(120, 48_000),
            },
            type: t.type,
          },
        }),
        String(ts),
        recordId,
        orgId,
      ],
    );
    reqId += 1;
  }
}

async function seedRuntime(rec) {
  const { recordId, orgId } = rec;
  await client.query(`DELETE FROM runtime WHERE "recordId" = $1`, [recordId]);
  const count = intBetween(3, CONSOLE_LINES.length);
  const lines = pickN(CONSOLE_LINES, count);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const ts = BigInt(rec.tsMs + intBetween(100, rec.durationMs)) * NS_PER_MS;
    const protocol =
      line.level === 'error' && line.text.startsWith('Uncaught')
        ? {
            method: 'Runtime.exceptionThrown',
            params: {
              exceptionDetails: {
                text: line.text,
                url: new URL(rec.scenario.url).origin + '/assets/app.js',
                lineNumber: intBetween(10, 900),
                exception: { description: line.text },
              },
            },
          }
        : {
            method: 'Runtime.consoleAPICalled',
            params: { type: line.level, args: [{ type: 'string', value: line.text }] },
          };
    await client.query(
      `INSERT INTO runtime (protocol, "timestamp", "recordId", org_id) VALUES ($1,$2,$3,$4)`,
      [JSON.stringify(protocol), String(ts), recordId, orgId],
    );
  }
}

async function seedComments(rec, index) {
  // Annotate roughly every 3rd recorded session so the activity feed + the
  // dashboard "recently annotated" + per-session comments all have content.
  if (rec.recordMode === false || index % 3 !== 0) return;
  const { recordId, orgId } = rec;
  await client.query(`DELETE FROM replay_comment WHERE record_id = $1`, [recordId]);
  const chosen = pickN(COMMENTS, intBetween(1, 3));
  for (const c of chosen) {
    await client.query(
      `INSERT INTO replay_comment (record_id, timestamp_ms, body, author, resolved, org_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        recordId,
        intBetween(500, rec.durationMs),
        c.body,
        c.author,
        c.resolved,
        orgId,
        new Date(rec.tsMs + intBetween(60_000, 3_600_000)),
      ],
    );
  }
}

async function seedTickets(orgId, records, devices) {
  // One JIRA-style ticket per bug-tagged recording, attributed to a team member.
  await client.query(`DELETE FROM ticket_logs WHERE org_id = $1`, [orgId]);
  let n = 0;
  for (const rec of records) {
    if (!rec.scenario.tags.includes('bug') && !rec.scenario.tags.includes('p1')) continue;
    const member = devices.find((d) => d.deviceId === rec.device.deviceId)?.member ?? pick(TEAM);
    const ticketNo = 4800 + n;
    await client.query(
      `INSERT INTO ticket_logs
       (org_id, device_id, username, user_display_name, record_id, ticket_url, jira_project_key,
        assignee, parent_epic, title, room_name, url, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        orgId,
        rec.device.deviceId,
        member.username,
        member.name,
        rec.recordId,
        `https://jira.example.com/browse/QA-${ticketNo}`,
        'QA',
        pick(TEAM).name,
        'QA-4000',
        `[${rec.scenario.tags.includes('p1') ? 'P1' : 'Bug'}] ${rec.scenario.name}`,
        rec.scenario.name,
        rec.scenario.url,
        new Date(rec.tsMs + intBetween(120_000, 7_200_000)),
      ],
    );
    n += 1;
  }
  return n;
}

async function maybeReset(orgId) {
  if (!RESET) return;
  console.log('[seed] --reset: clearing seeded rows for org', orgId);
  await client.query(`DELETE FROM ticket_logs WHERE org_id = $1`, [orgId]);
  await client.query(`DELETE FROM replay_comment WHERE org_id = $1`, [orgId]);
  await client.query(`DELETE FROM screen WHERE org_id = $1`, [orgId]);
  await client.query(`DELETE FROM network WHERE org_id = $1`, [orgId]);
  await client.query(`DELETE FROM runtime WHERE org_id = $1`, [orgId]);
  await client.query(`DELETE FROM record WHERE org_id = $1`, [orgId]);
}

async function counts() {
  const tables = ['organizations', 'accounts', 'organization_members', 'users', 'device_info_list', 'record', 'screen', 'network', 'runtime', 'replay_comment', 'ticket_logs'];
  const out = {};
  for (const t of tables) {
    const r = await client.query(`SELECT COUNT(*)::int AS c FROM ${t}`);
    out[t] = r.rows[0].c;
  }
  return out;
}

async function main() {
  await client.connect();
  console.log(`[seed] connected to ${client.host}:${client.port}/${client.database}`);
  await ensurePgcrypto();

  const orgId = await seedOrganization();
  await maybeReset(orgId);

  // Test accounts (credentials documented in the run report)
  await upsertAccount(orgId, { email: 'owner@acme.test', name: 'Acme Owner', password: 'Password123!', role: 'owner' });
  await upsertAccount(orgId, { email: 'admin@acme.test', name: 'Acme Admin', password: 'Password123!', role: 'admin' });
  await upsertAccount(orgId, { email: 'qa@acme.test', name: 'Acme QA', password: 'Password123!', role: 'member' });
  await upsertAccount(orgId, { email: 'viewer@acme.test', name: 'Acme Viewer', password: 'Password123!', role: 'viewer' });

  const devices = await seedUsersAndDevices(orgId);
  const records = await seedRecords(orgId, devices);

  let i = 0;
  for (const rec of records) {
    await seedScreens(rec);
    await seedNetwork(rec);
    await seedRuntime(rec);
    await seedComments(rec, i);
    i += 1;
  }
  const ticketCount = await seedTickets(orgId, records, devices);

  const c = await counts();
  console.log('\n[seed] done. Row counts:');
  for (const [t, n] of Object.entries(c)) console.log(`  ${t.padEnd(22)} ${n}`);
  console.log(`\n[seed] tickets created this run: ${ticketCount}`);
  console.log('\n[seed] test accounts (password: Password123!):');
  console.log('  owner@acme.test   (owner)');
  console.log('  admin@acme.test   (admin)');
  console.log('  qa@acme.test      (member)');
  console.log('  viewer@acme.test  (viewer)');

  await client.end();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
