/**
 * ChangelogDesk — 단일 파일 벤더링 컴포넌트 (의존성: react 만).
 * ──────────────────────────────────────────────────────────────────────────
 * DeskCloud(@changelogdesk/widget)의 npm publish 가 막혀 있는 동안, 형제 앱에
 * 그대로 복붙해서 쓰는 self-contained 버전입니다. 워크스페이스 의존(@changelogdesk/shared) 0 —
 * 필요한 마크다운 렌더러·상수·유틸을 이 파일에 인라인했습니다. 동작/디자인은 정본과 동일합니다.
 *
 * 원본: changelogdesk/apps-vendor/ChangelogWidget.tsx (코드 스타일만 이 앱에 맞춤).
 *
 * 사용:
 *   import { ChangelogWidget } from '@/components/deskcloud/changelogdesk/ChangelogWidget';
 *   <ChangelogWidget publishableKey="pk_…" endpoint="https://changelog.example.com" />
 *
 * 백엔드 계약(퍼블리시 키 · x-pk 헤더 + Origin 검사):
 *   GET  {endpoint}/api/changelog?limit=&since=          → PublicChangelogDto (사용량 +1)
 *   GET  {endpoint}/api/changelog/unread-count?anonId=   → UnreadCountDto
 *   POST {endpoint}/api/changelog/seen { anonId, lastSeenEntryId? } → { ok: true }
 *
 * 접근성/디자인: 포커스 트랩 · Esc · focus-visible · prefers-reduced-motion · 대비 ≥4.5:1 ·
 * 그라디언트 텍스트/글래스모피즘/사이드스트라이프 없음 · 외부 CSS 프레임워크 0
 * (인라인 <style> 로 스타일을 self-host 하므로 앱 Tailwind 토큰과 독립적).
 * ──────────────────────────────────────────────────────────────────────────
 */
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react';

/* ============================ 공유 계약(인라인) ============================ */

type EntryTag = 'new' | 'improved' | 'fixed' | 'announcement';

interface ChangelogEntryDto {
  id: string;
  tenantId: string;
  title: string;
  bodyMarkdown: string;
  bodyHtml: string;
  tag: EntryTag;
  version: string | null;
  category: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

interface PublicChangelogDto {
  tenant: { name: string; slug: string };
  items: ChangelogEntryDto[];
  total: number;
}

interface UnreadCountDto {
  unreadCount: number;
  latestEntryId: string | null;
}

interface SeenInput {
  anonId: string;
  lastSeenEntryId?: string;
}

/* ====================== 안전 마크다운 → HTML(인라인) ======================= */
/* @changelogdesk/shared 의 markdownToSafeHtml 동치. raw HTML 은 전부 이스케이프되어
   무력화되므로 위젯에 안전하게 주입할 수 있습니다(XSS 방어). */

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]!);
}

function safeHref(href: string): string | null {
  const trimmed = href.trim();
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
  return null;
}

function inline(escaped: string): string {
  let s = escaped;
  s = s.replace(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, href: string) => {
    const safe = safeHref(href);
    if (!safe) return text;
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer nofollow">${text}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, (_m, t: string) => `<strong>${t}</strong>`);
  s = s.replace(
    /(^|[^*])\*([^*]+)\*(?!\*)/g,
    (_m, pre: string, t: string) => `${pre}<em>${t}</em>`,
  );
  return s;
}

function markdownToSafeHtml(markdown: string): string {
  const escaped = escapeHtml(markdown.replace(/\r\n?/g, '\n'));
  const lines = escaped.split('\n');
  const html: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      html.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const closeList = (): void => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      if (inCode) {
        html.push(`<pre><code>${codeBuf.join('\n')}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        flushParagraph();
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }
    const trimmed = line.trim();
    if (trimmed === '') {
      flushParagraph();
      closeList();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      closeList();
      const level = Math.min(6, heading[1]!.length);
      html.push(`<h${level}>${inline(heading[2]!)}</h${level}>`);
      continue;
    }
    const ul = /^[-*]\s+(.*)$/.exec(trimmed);
    if (ul) {
      flushParagraph();
      if (listType !== 'ul') {
        closeList();
        html.push('<ul>');
        listType = 'ul';
      }
      html.push(`<li>${inline(ul[1]!)}</li>`);
      continue;
    }
    const ol = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (ol) {
      flushParagraph();
      if (listType !== 'ol') {
        closeList();
        html.push('<ol>');
        listType = 'ol';
      }
      html.push(`<li>${inline(ol[1]!)}</li>`);
      continue;
    }
    closeList();
    paragraph.push(trimmed);
  }

  if (inCode) html.push(`<pre><code>${codeBuf.join('\n')}</code></pre>`);
  flushParagraph();
  closeList();
  return html.join('\n');
}

/* ============================== 유틸(인라인) ============================== */

function formatEntryDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

const TAG_LABELS: Record<string, string> = {
  new: 'New',
  improved: 'Improved',
  fixed: 'Fixed',
  announcement: 'News',
};
function tagLabel(tag: string): string {
  return TAG_LABELS[tag] ?? tag;
}

const ANON_STORAGE_KEY = 'changelogdesk:anonId';
let anonMemoryFallback: string | null = null;
function randomId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
function getAnonId(): string {
  if (typeof localStorage !== 'undefined') {
    try {
      const existing = localStorage.getItem(ANON_STORAGE_KEY);
      if (existing) return existing;
      const created = randomId();
      localStorage.setItem(ANON_STORAGE_KEY, created);
      return created;
    } catch {
      /* 스토리지 차단 → 메모리 폴백 */
    }
  }
  if (!anonMemoryFallback) anonMemoryFallback = randomId();
  return anonMemoryFallback;
}

/* ============================== 클라이언트 =============================== */

class ChangelogDeskError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ChangelogDeskError';
  }
}

interface ClientOptions {
  publishableKey: string;
  endpoint: string;
  fetch?: typeof fetch;
}

interface ListParams {
  limit?: number;
  since?: string;
}

const WIDGET_VERSION = '0.1.0';

function createClient(options: ClientOptions) {
  const base = options.endpoint.replace(/\/+$/, '');
  const pk = options.publishableKey;
  const doFetch = options.fetch ?? globalThis.fetch;
  if (!doFetch) throw new ChangelogDeskError('fetch 를 사용할 수 없습니다.', 0);

  const headers = (): Record<string, string> => ({
    'content-type': 'application/json',
    'x-pk': pk,
    'x-changelogdesk-widget': WIDGET_VERSION,
  });

  async function parse<T>(res: Response): Promise<T> {
    const text = await res.text();
    const json: unknown = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const rec = (json ?? {}) as Record<string, unknown>;
      const raw = rec.message ?? rec.error ?? `ChangelogDesk 요청 실패 (${res.status})`;
      const msg = Array.isArray(raw) ? raw.join(', ') : String(raw);
      throw new ChangelogDeskError(msg, res.status);
    }
    return json as T;
  }

  return {
    async listEntries(params?: ListParams, signal?: AbortSignal): Promise<PublicChangelogDto> {
      const qs = new URLSearchParams();
      if (params?.limit != null) qs.set('limit', String(params.limit));
      if (params?.since) qs.set('since', params.since);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      const res = await doFetch(`${base}/api/changelog${suffix}`, {
        method: 'GET',
        headers: headers(),
        signal,
      });
      return parse<PublicChangelogDto>(res);
    },
    async getUnreadCount(anonId: string, signal?: AbortSignal): Promise<UnreadCountDto> {
      const qs = new URLSearchParams({ anonId });
      const res = await doFetch(`${base}/api/changelog/unread-count?${qs.toString()}`, {
        method: 'GET',
        headers: headers(),
        signal,
      });
      return parse<UnreadCountDto>(res);
    },
    async markSeen(input: SeenInput, signal?: AbortSignal): Promise<void> {
      const res = await doFetch(`${base}/api/changelog/seen`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(input),
        signal,
      });
      await parse<unknown>(res);
    },
  };
}

type Client = ReturnType<typeof createClient>;

/* ============================== 스코프 CSS =============================== */

const DEFAULT_ACCENT = '#2f5fe0';
const DEFAULT_ACCENT_INK = '#ffffff';
const STYLE_ID = 'changelogdesk-widget-styles';

const WIDGET_CSS = `
.cd-root, .cd-root * { box-sizing: border-box; }
.cd-root {
  --cd-accent: ${DEFAULT_ACCENT};
  --cd-accent-ink: ${DEFAULT_ACCENT_INK};
  --cd-ink: #1a1d23; --cd-ink-soft: #4a4f57; --cd-muted: #6b7280;
  --cd-surface: #ffffff; --cd-surface-2: #f4f5f7;
  --cd-border: #d7dae0; --cd-border-strong: #b7bcc6; --cd-danger: #b42318;
  --cd-tag-new-bg: #e7f0ff; --cd-tag-new-ink: #1c47b0;
  --cd-tag-imp-bg: #e6f6ec; --cd-tag-imp-ink: #0a6b3b;
  --cd-tag-fix-bg: #fdeceb; --cd-tag-fix-ink: #a4291f;
  --cd-tag-ann-bg: #f1ecfb; --cd-tag-ann-ink: #5a32a3;
  --cd-radius: 14px; --cd-radius-sm: 9px;
  --cd-shadow: 0 1px 2px rgba(16,24,40,.06), 0 12px 32px -8px rgba(16,24,40,.22);
  --cd-z-launcher: 2147483000; --cd-z-backdrop: 2147483600; --cd-z-panel: 2147483601;
  --cd-ease: cubic-bezier(.22,1,.36,1);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--cd-ink); line-height: 1.5;
}
.cd-launcher {
  position: fixed; z-index: var(--cd-z-launcher);
  width: 52px; height: 52px; display: inline-flex; align-items: center; justify-content: center;
  border: 0; border-radius: 999px; background: var(--cd-accent); color: var(--cd-accent-ink);
  cursor: pointer; box-shadow: var(--cd-shadow);
  transition: transform .18s var(--cd-ease), filter .18s var(--cd-ease);
}
.cd-launcher:hover { filter: brightness(1.06); transform: translateY(-1px); }
.cd-launcher:active { transform: translateY(0); }
.cd-launcher svg { width: 24px; height: 24px; display: block; }
.cd-badge {
  position: absolute; top: -4px; right: -4px; min-width: 20px; height: 20px; padding: 0 5px;
  display: inline-flex; align-items: center; justify-content: center; border-radius: 999px;
  background: var(--cd-danger); color: #fff; font-size: 11px; font-weight: 700; line-height: 1;
  border: 2px solid var(--cd-surface);
}
.cd-pos-br { right: 20px; bottom: 20px; } .cd-pos-bl { left: 20px; bottom: 20px; }
.cd-pos-tr { right: 20px; top: 20px; } .cd-pos-tl { left: 20px; top: 20px; }
.cd-backdrop { position: fixed; inset: 0; z-index: var(--cd-z-backdrop); background: transparent; }
.cd-panel {
  position: fixed; z-index: var(--cd-z-panel);
  width: min(400px, calc(100vw - 32px)); max-height: min(560px, calc(100vh - 96px));
  display: flex; flex-direction: column; background: var(--cd-surface); color: var(--cd-ink);
  border: 1px solid var(--cd-border); border-radius: var(--cd-radius); box-shadow: var(--cd-shadow);
  overflow: hidden; animation: cd-pop .18s var(--cd-ease);
}
.cd-panel.cd-pos-br { right: 20px; bottom: 84px; } .cd-panel.cd-pos-bl { left: 20px; bottom: 84px; }
.cd-panel.cd-pos-tr { right: 20px; top: 84px; } .cd-panel.cd-pos-tl { left: 20px; top: 84px; }
@media (max-width: 480px) {
  .cd-panel, .cd-panel.cd-pos-br, .cd-panel.cd-pos-bl, .cd-panel.cd-pos-tr, .cd-panel.cd-pos-tl {
    left: 0; right: 0; bottom: 0; top: auto; width: 100vw; max-height: 88vh;
    border-radius: 18px 18px 0 0; animation: cd-sheet .24s var(--cd-ease);
  }
}
.cd-header { display: flex; align-items: center; gap: 12px; padding: 16px 18px 14px; border-bottom: 1px solid var(--cd-border); flex: none; }
.cd-header-text { flex: 1; min-width: 0; }
.cd-title { margin: 0; font-size: 15px; font-weight: 700; letter-spacing: -0.01em; }
.cd-subtitle { margin: 2px 0 0; font-size: 12px; color: var(--cd-muted); }
.cd-close { flex: none; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 8px; background: transparent; color: var(--cd-muted); cursor: pointer; transition: background .14s var(--cd-ease), color .14s var(--cd-ease); }
.cd-close:hover { background: var(--cd-surface-2); color: var(--cd-ink); }
.cd-close svg { width: 18px; height: 18px; }
.cd-body { padding: 6px 0; overflow-y: auto; -webkit-overflow-scrolling: touch; flex: 1; }
.cd-entry { padding: 14px 18px; border-bottom: 1px solid var(--cd-surface-2); }
.cd-entry:last-child { border-bottom: 0; }
.cd-entry-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.cd-tag { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: .01em; text-transform: capitalize; }
.cd-tag-new { background: var(--cd-tag-new-bg); color: var(--cd-tag-new-ink); }
.cd-tag-improved { background: var(--cd-tag-imp-bg); color: var(--cd-tag-imp-ink); }
.cd-tag-fixed { background: var(--cd-tag-fix-bg); color: var(--cd-tag-fix-ink); }
.cd-tag-announcement { background: var(--cd-tag-ann-bg); color: var(--cd-tag-ann-ink); }
.cd-ver { font-size: 11px; font-weight: 600; color: var(--cd-ink-soft); background: var(--cd-surface-2); padding: 2px 7px; border-radius: 6px; }
.cd-date { font-size: 11px; color: var(--cd-muted); margin-left: auto; }
.cd-entry-title { margin: 0 0 4px; font-size: 14px; font-weight: 700; letter-spacing: -0.01em; }
.cd-md { font-size: 13px; color: var(--cd-ink-soft); }
.cd-md > :first-child { margin-top: 0; } .cd-md > :last-child { margin-bottom: 0; }
.cd-md p { margin: 6px 0; }
.cd-md h1, .cd-md h2, .cd-md h3, .cd-md h4, .cd-md h5, .cd-md h6 { margin: 10px 0 4px; font-size: 13px; font-weight: 700; color: var(--cd-ink); }
.cd-md ul, .cd-md ol { margin: 6px 0; padding-left: 20px; }
.cd-md li { margin: 2px 0; }
.cd-md a { color: var(--cd-accent); text-decoration: underline; }
.cd-md code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; background: var(--cd-surface-2); padding: 1px 5px; border-radius: 5px; }
.cd-md pre { background: var(--cd-surface-2); padding: 10px 12px; border-radius: var(--cd-radius-sm); overflow-x: auto; margin: 8px 0; }
.cd-md pre code { background: transparent; padding: 0; }
.cd-md strong { color: var(--cd-ink); }
.cd-footer { flex: none; padding: 10px 18px; border-top: 1px solid var(--cd-border); display: flex; align-items: center; gap: 10px; }
.cd-brand { font-size: 11px; color: var(--cd-muted); text-decoration: none; }
.cd-brand:hover { color: var(--cd-ink-soft); }
.cd-footer-spacer { flex: 1; }
.cd-more { appearance: none; border: 1px solid var(--cd-border); border-radius: var(--cd-radius-sm); background: var(--cd-surface); color: var(--cd-ink-soft); padding: 7px 14px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .14s var(--cd-ease), border-color .14s var(--cd-ease); }
.cd-more:hover:not(:disabled) { background: var(--cd-surface-2); border-color: var(--cd-border-strong); }
.cd-more:disabled { opacity: .55; cursor: not-allowed; }
.cd-state { padding: 44px 24px; text-align: center; }
.cd-state-icon { width: 48px; height: 48px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--cd-surface-2); color: var(--cd-muted); }
.cd-state-icon.cd-err { background: color-mix(in srgb, var(--cd-danger) 12%, var(--cd-surface)); color: var(--cd-danger); }
.cd-state-icon svg { width: 26px; height: 26px; }
.cd-state-title { margin: 0; font-size: 15px; font-weight: 700; }
.cd-state-text { margin: 6px 0 0; font-size: 13px; color: var(--cd-ink-soft); }
.cd-retry { margin-top: 16px; appearance: none; border: 0; border-radius: var(--cd-radius-sm); background: var(--cd-accent); color: var(--cd-accent-ink); padding: 9px 18px; font: inherit; font-weight: 600; font-size: 13px; cursor: pointer; transition: filter .14s var(--cd-ease); }
.cd-retry:hover { filter: brightness(1.06); }
.cd-spinner { width: 26px; height: 26px; border: 3px solid var(--cd-border); border-top-color: var(--cd-accent); border-radius: 50%; margin: 0 auto; animation: cd-spin .7s linear infinite; }
.cd-skeleton { padding: 14px 18px; border-bottom: 1px solid var(--cd-surface-2); }
.cd-sk-line { height: 11px; border-radius: 6px; background: linear-gradient(90deg, var(--cd-surface-2) 25%, #eceef1 37%, var(--cd-surface-2) 63%); background-size: 400% 100%; animation: cd-shimmer 1.3s ease infinite; margin: 8px 0; }
.cd-root :focus { outline: none; }
.cd-root :focus-visible { outline: 2px solid var(--cd-accent); outline-offset: 2px; border-radius: 6px; }
@keyframes cd-pop { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes cd-sheet { from { transform: translateY(100%); } to { transform: none; } }
@keyframes cd-spin { to { transform: rotate(360deg); } }
@keyframes cd-shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
@media (prefers-reduced-motion: reduce) {
  .cd-root *, .cd-backdrop, .cd-panel, .cd-launcher, .cd-spinner, .cd-sk-line {
    animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important;
  }
  .cd-spinner { animation: cd-spin .9s linear infinite !important; }
  .cd-sk-line { animation: none !important; background: var(--cd-surface-2) !important; }
}
`;

function ensureStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const el = doc.createElement('style');
  el.id = STYLE_ID;
  el.textContent = WIDGET_CSS;
  doc.head.appendChild(el);
}

/* =============================== 아이콘 ================================== */

function BellIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8.4a6 6 0 0 0-12 0c0 5.4-2.4 7-2.4 7h16.8s-2.4-1.6-2.4-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.7 19.5a2 2 0 0 1-3.4 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function CloseIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
function AlertIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 8v5m0 3.5h.01M10.3 3.9 2.5 17.5A2 2 0 0 0 4.2 20.5h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function EmptyIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 8.5a4 4 0 0 1 0 7M18.5 6a7 7 0 0 1 0 12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =============================== 컴포넌트 =============================== */

export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface ChangelogWidgetProps {
  /** 테넌트 퍼블리시 키(pk_…) — 브라우저 노출 안전. */
  publishableKey: string;
  /** API 베이스 URL. */
  endpoint: string;
  position?: WidgetPosition;
  accent?: string;
  accentInk?: string;
  title?: string;
  label?: string;
  pageSize?: number;
  fetch?: typeof fetch;
}

type Phase = 'idle' | 'loading' | 'ready' | 'error';

const POSITION_CLASS: Record<WidgetPosition, string> = {
  'bottom-right': 'cd-pos-br',
  'bottom-left': 'cd-pos-bl',
  'top-right': 'cd-pos-tr',
  'top-left': 'cd-pos-tl',
};

const FOCUSABLE =
  'a[href],area[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex="-1"])';

function EntryItem({ entry }: { entry: ChangelogEntryDto }): ReactElement {
  const html = useMemo(
    () => entry.bodyHtml || markdownToSafeHtml(entry.bodyMarkdown ?? ''),
    [entry.bodyHtml, entry.bodyMarkdown],
  );
  const date = formatEntryDate(entry.publishedAt ?? entry.createdAt);
  return (
    <article className="cd-entry">
      <div className="cd-entry-top">
        <span className={`cd-tag cd-tag-${entry.tag}`}>{tagLabel(entry.tag)}</span>
        {entry.version ? <span className="cd-ver">{entry.version}</span> : null}
        {date ? (
          <time className="cd-date" dateTime={entry.publishedAt ?? entry.createdAt}>
            {date}
          </time>
        ) : null}
      </div>
      <h3 className="cd-entry-title">{entry.title}</h3>
      {html ? (
        // eslint-disable-next-line react/no-danger -- 안전 새니타이저가 raw HTML 제거
        <div className="cd-md" dangerouslySetInnerHTML={{ __html: html }} />
      ) : null}
    </article>
  );
}

function Skeletons(): ReactElement {
  return (
    <div aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div className="cd-skeleton" key={i}>
          <div className="cd-sk-line" style={{ width: '40%' }} />
          <div className="cd-sk-line" style={{ width: '85%' }} />
          <div className="cd-sk-line" style={{ width: '70%' }} />
        </div>
      ))}
    </div>
  );
}

export function ChangelogWidget(props: ChangelogWidgetProps): ReactElement | null {
  const {
    publishableKey,
    endpoint,
    position = 'bottom-right',
    accent = DEFAULT_ACCENT,
    accentInk = DEFAULT_ACCENT_INK,
    title = "What's new",
    label = '변경 이력',
    pageSize = 20,
    fetch: customFetch,
  } = props;

  const client = useMemo<Client>(
    () => createClient({ publishableKey, endpoint, fetch: customFetch }),
    [publishableKey, endpoint, customFetch],
  );
  const anonId = useMemo(() => getAnonId(), []);

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [entries, setEntries] = useState<ChangelogEntryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') ensureStyles();
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    client
      .getUnreadCount(anonId, ctrl.signal)
      .then((r) => setUnread(r.unreadCount))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [client, anonId]);

  const loadEntries = useCallback(() => {
    const ctrl = new AbortController();
    setPhase('loading');
    client
      .listEntries({ limit: pageSize }, ctrl.signal)
      .then((res) => {
        setEntries(res.items);
        setTotal(res.total);
        setTenantName(res.tenant?.name ?? null);
        setPhase('ready');
        const latest = res.items[0];
        client.markSeen({ anonId, lastSeenEntryId: latest?.id }).catch(() => undefined);
        setUnread(0);
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setPhase('error');
      });
    return ctrl;
  }, [client, pageSize, anonId]);

  const loadMore = useCallback(() => {
    setLoadingMore(true);
    client
      .listEntries({ limit: pageSize })
      .then((res) => {
        const seen = new Set(entries.map((x) => x.id));
        setEntries([...entries, ...res.items.filter((x) => !seen.has(x.id))]);
        setTotal(res.total);
      })
      .catch(() => undefined)
      .finally(() => setLoadingMore(false));
  }, [client, entries, pageSize]);

  const openPanel = useCallback(() => {
    setOpen(true);
    if (phase === 'idle' || phase === 'error') loadEntries();
    else {
      const latest = entries[0];
      client.markSeen({ anonId, lastSeenEntryId: latest?.id }).catch(() => undefined);
      setUnread(0);
    }
  }, [phase, loadEntries, entries, client, anonId]);

  const closePanel = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closePanel();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = panelRef.current;
      if (!root) return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null || n === document.activeElement,
      );
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, closePanel]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const root = panelRef.current;
      if (!root) return;
      root.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 20);
    return () => window.clearTimeout(t);
  }, [open, phase]);

  const rootStyle: CSSProperties = {
    ['--cd-accent' as string]: accent,
    ['--cd-accent-ink' as string]: accentInk,
  };
  const hasMore = entries.length < total;

  return (
    <div className="cd-root" style={rootStyle}>
      {!open ? (
        <button
          ref={launcherRef}
          type="button"
          className={`cd-launcher ${POSITION_CLASS[position]}`}
          aria-haspopup="dialog"
          aria-label={unread > 0 ? `${label} — 새 소식 ${unread}건` : label}
          onClick={openPanel}
        >
          <BellIcon />
          {unread > 0 ? (
            <span className="cd-badge" aria-hidden="true">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </button>
      ) : null}

      {open ? (
        <>
          <div
            className="cd-backdrop"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closePanel();
            }}
          />
          <div
            ref={panelRef}
            className={`cd-panel ${POSITION_CLASS[position]}`}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
          >
            <div className="cd-header">
              <div className="cd-header-text">
                <h2 className="cd-title" id={titleId}>
                  {title}
                </h2>
                {tenantName ? <p className="cd-subtitle">{tenantName}</p> : null}
              </div>
              <button type="button" className="cd-close" aria-label="닫기" onClick={closePanel}>
                <CloseIcon />
              </button>
            </div>

            <div className="cd-body">
              {phase === 'loading' ? (
                <div aria-busy="true">
                  <Skeletons />
                </div>
              ) : null}

              {phase === 'error' ? (
                <div className="cd-state" role="alert">
                  <div className="cd-state-icon cd-err">
                    <AlertIcon />
                  </div>
                  <h3 className="cd-state-title">불러오지 못했어요</h3>
                  <p className="cd-state-text">네트워크 상태를 확인하고 다시 시도해 주세요.</p>
                  <button type="button" className="cd-retry" onClick={() => loadEntries()}>
                    다시 시도
                  </button>
                </div>
              ) : null}

              {phase === 'ready' && entries.length === 0 ? (
                <div className="cd-state" role="status">
                  <div className="cd-state-icon">
                    <EmptyIcon />
                  </div>
                  <h3 className="cd-state-title">아직 소식이 없어요</h3>
                  <p className="cd-state-text">새로운 변경 이력이 게시되면 여기에 표시됩니다.</p>
                </div>
              ) : null}

              {phase === 'ready' && entries.length > 0
                ? entries.map((entry) => <EntryItem key={entry.id} entry={entry} />)
                : null}
            </div>

            <div className="cd-footer">
              <a
                className="cd-brand"
                href="https://github.com"
                target="_blank"
                rel="noreferrer noopener"
              >
                ChangelogDesk
              </a>
              <span className="cd-footer-spacer" />
              {phase === 'ready' && hasMore ? (
                <button type="button" className="cd-more" disabled={loadingMore} onClick={loadMore}>
                  {loadingMore ? '불러오는 중…' : '더 보기'}
                </button>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default ChangelogWidget;
export type { ChangelogEntryDto, EntryTag, PublicChangelogDto, UnreadCountDto };
