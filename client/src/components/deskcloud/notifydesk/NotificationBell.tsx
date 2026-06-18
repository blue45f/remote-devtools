/**
 * NotifyDesk — 단일 파일 벤더링 컴포넌트 (의존성: react 만).
 * ──────────────────────────────────────────────────────────────────────────
 * DeskCloud(@notifydesk/widget)의 npm publish 가 막혀 있는 동안, 형제 앱에 그대로
 * 복붙해서 쓰는 self-contained 버전입니다. 워크스페이스 의존(@notifydesk/shared) 0 —
 * 클라이언트·스코프 스타일·아이콘·상대시간·DTO 를 이 파일에 인라인했습니다.
 * 동작/디자인은 @notifydesk/widget 의 <NotificationBell> 과 동일합니다.
 *
 * 원본: notifydesk/packages/widget/src/{react.tsx,client.ts,styles.ts,icons.tsx,relative-time.ts}
 * (코드 스타일만 이 앱에 맞춤. notifydesk 는 apps-vendor 가 없어 위 소스를 단일 파일로 합쳤습니다.)
 *
 * 사용:
 *   import { NotificationBell } from '@/components/deskcloud/notifydesk/NotificationBell';
 *   <NotificationBell recipientId="user_42" publishableKey="pk_…" endpoint="https://notify.example.com" />
 *
 * 백엔드 계약(퍼블리시 키 · Bearer pk_ + Origin 검사):
 *   GET  {endpoint}/api/inbox?recipientId=&limit=          → InboxDto
 *   GET  {endpoint}/api/inbox/unread-count?recipientId=    → UnreadCountDto
 *   POST {endpoint}/api/inbox/read { recipientId, ids?|all? } → MarkReadResultDto
 *
 * 접근성/디자인: 포커스 트랩 · Esc · 바깥 클릭 닫기 · focus-visible · prefers-reduced-motion ·
 * 대비 ≥4.5:1 · 그라디언트 텍스트/글래스모피즘/사이드스트라이프 없음 · 외부 CSS 프레임워크 0.
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

type Channel = 'in_app' | 'email' | 'web_push';
type NotificationStatus = 'queued' | 'sent' | 'read';

/** 인박스 알림 단건(in-app). */
interface NotificationDto {
  id: string;
  tenantId: string;
  recipientId: string;
  type: string;
  channels: Channel[];
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  status: NotificationStatus;
  readAt: string | null;
  createdAt: string;
}

/** 인박스 목록(publishable). */
interface InboxDto {
  items: NotificationDto[];
  unreadCount: number;
  limit: number;
}

/** 미읽음 카운트(publishable). */
interface UnreadCountDto {
  recipientId: string;
  unreadCount: number;
}

/** 읽음 처리 결과. */
interface MarkReadResultDto {
  updated: number;
  unreadCount: number;
}

/* ============================== 클라이언트 =============================== */

const WIDGET_VERSION = '0.1.0';

interface NotifyDeskWidgetClientOptions {
  recipientId: string;
  publishableKey: string;
  endpoint: string;
  fetch?: typeof fetch;
}

/** NotifyDesk API 가 4xx/5xx 를 돌려줄 때 던지는 에러(원본 status·detail 보존). */
class NotifyDeskWidgetError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'NotifyDeskWidgetError';
  }
}

interface NotifyDeskWidgetClient {
  getInbox(limit?: number, signal?: AbortSignal): Promise<InboxDto>;
  getUnreadCount(signal?: AbortSignal): Promise<UnreadCountDto>;
  markRead(ids: string[], signal?: AbortSignal): Promise<MarkReadResultDto>;
  markAllRead(signal?: AbortSignal): Promise<MarkReadResultDto>;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function createNotifyDeskWidgetClient(
  options: NotifyDeskWidgetClientOptions,
): NotifyDeskWidgetClient {
  const base = options.endpoint.replace(/\/+$/, '');
  const recipientId = options.recipientId;
  const rid = encodeURIComponent(recipientId);
  const doFetch = options.fetch ?? globalThis.fetch;
  if (!doFetch) {
    throw new NotifyDeskWidgetError('fetch 를 사용할 수 없습니다. options.fetch 를 전달하세요.', 0);
  }

  const headers = (json = false): Record<string, string> => {
    const h: Record<string, string> = {
      authorization: `Bearer ${options.publishableKey}`,
      'x-notifydesk-widget': WIDGET_VERSION,
    };
    if (json) h['content-type'] = 'application/json';
    return h;
  };

  async function parse<T>(res: Response): Promise<T> {
    const text = await res.text();
    const json: unknown = text ? safeParse(text) : null;
    if (!res.ok) {
      const rec = (json ?? {}) as Record<string, unknown>;
      const raw = rec.message ?? rec.error ?? `NotifyDesk 요청 실패 (${res.status})`;
      const msg = Array.isArray(raw) ? raw.join(', ') : String(raw);
      throw new NotifyDeskWidgetError(msg, res.status, json);
    }
    return json as T;
  }

  return {
    async getInbox(limit, signal) {
      const qs = new URLSearchParams({ recipientId });
      if (limit != null) qs.set('limit', String(limit));
      const res = await doFetch(`${base}/api/inbox?${qs.toString()}`, {
        method: 'GET',
        headers: headers(),
        signal,
      });
      return parse<InboxDto>(res);
    },

    async getUnreadCount(signal) {
      const res = await doFetch(`${base}/api/inbox/unread-count?recipientId=${rid}`, {
        method: 'GET',
        headers: headers(),
        signal,
      });
      return parse<UnreadCountDto>(res);
    },

    async markRead(ids, signal) {
      const res = await doFetch(`${base}/api/inbox/read`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ recipientId, ids }),
        signal,
      });
      return parse<MarkReadResultDto>(res);
    },

    async markAllRead(signal) {
      const res = await doFetch(`${base}/api/inbox/read`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ recipientId, all: true }),
        signal,
      });
      return parse<MarkReadResultDto>(res);
    },
  };
}

/* ============================== 상대 시간(인라인) ============================== */

/**
 * 상대 시간 포맷 — 외부 라이브러리 0(Intl.RelativeTimeFormat 만 사용).
 * "방금 전", "3분 전", "2시간 전", "어제", "3일 전" … 그 이상은 짧은 절대 날짜.
 */
function formatRelativeTime(iso: string, now: Date = new Date(), locale = 'ko'): string {
  const then = new Date(iso);
  const ms = then.getTime();
  if (Number.isNaN(ms)) return '';

  const diffSec = Math.round((ms - now.getTime()) / 1000); // 과거면 음수
  const absSec = Math.abs(diffSec);

  const hasRtf = typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat === 'function';
  const rtf = hasRtf
    ? new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
    : null;

  if (absSec < 45) return rtf ? rtf.format(0, 'second') : '방금 전';
  if (absSec < 90) return rtf ? rtf.format(Math.round(diffSec / 60) || -1, 'minute') : '1분 전';

  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60)
    return rtf ? rtf.format(diffMin, 'minute') : `${Math.abs(diffMin)}분 전`;

  const diffHour = Math.round(diffSec / 3600);
  if (Math.abs(diffHour) < 24)
    return rtf ? rtf.format(diffHour, 'hour') : `${Math.abs(diffHour)}시간 전`;

  const diffDay = Math.round(diffSec / 86_400);
  if (Math.abs(diffDay) < 7) return rtf ? rtf.format(diffDay, 'day') : `${Math.abs(diffDay)}일 전`;

  const sameYear = then.getFullYear() === now.getFullYear();
  try {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
    }).format(then);
  } catch {
    return then.toISOString().slice(0, 10);
  }
}

/* ============================== 스코프 CSS =============================== */

interface WidgetTheme {
  accent: string;
  accentInk: string;
}

const DEFAULT_ACCENT = '#2f5fe0';
const DEFAULT_ACCENT_INK = '#ffffff';
const STYLE_ID = 'notifydesk-widget-styles';

function ensureStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const el = doc.createElement('style');
  el.id = STYLE_ID;
  el.textContent = WIDGET_CSS;
  doc.head.appendChild(el);
}

function themeVars(theme: WidgetTheme): Record<string, string> {
  return {
    '--nd-accent': theme.accent,
    '--nd-accent-ink': theme.accentInk,
  };
}

const WIDGET_CSS = `
.nd-root, .nd-root * { box-sizing: border-box; }
.nd-root {
  --nd-accent: ${DEFAULT_ACCENT};
  --nd-accent-ink: ${DEFAULT_ACCENT_INK};
  --nd-ink: #1a1d23;
  --nd-ink-soft: #4a4f57;
  --nd-muted: #6b7280;
  --nd-surface: #ffffff;
  --nd-surface-2: #f4f5f7;
  --nd-unread: #eef3ff;
  --nd-border: #d7dae0;
  --nd-border-strong: #b7bcc6;
  --nd-danger: #b42318;
  --nd-radius: 14px;
  --nd-radius-sm: 9px;
  --nd-shadow: 0 1px 2px rgba(16,24,40,.06), 0 12px 32px -8px rgba(16,24,40,.22);
  --nd-z-bell: 2147483000;
  --nd-z-panel: 2147483600;
  --nd-ease: cubic-bezier(.22,1,.36,1);
  position: relative;
  display: inline-block;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--nd-ink);
  line-height: 1.5;
}

/* ---- bell 버튼 ---- */
.nd-bell {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--nd-ink-soft);
  cursor: pointer;
  transition: background .14s var(--nd-ease), color .14s var(--nd-ease);
}
.nd-bell:hover { background: var(--nd-surface-2); color: var(--nd-ink); }
.nd-bell[aria-expanded="true"] { background: var(--nd-surface-2); color: var(--nd-ink); }
.nd-bell svg { width: 22px; height: 22px; display: block; }

/* ---- 미읽음 배지 ---- */
.nd-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--nd-accent);
  color: var(--nd-accent-ink);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  border: 2px solid var(--nd-surface);
  pointer-events: none;
}

/* ---- 패널(드롭다운) ---- */
.nd-panel {
  position: absolute;
  z-index: var(--nd-z-panel);
  top: calc(100% + 8px);
  width: min(380px, calc(100vw - 24px));
  max-height: min(520px, calc(100vh - 80px));
  display: flex;
  flex-direction: column;
  background: var(--nd-surface);
  color: var(--nd-ink);
  border: 1px solid var(--nd-border);
  border-radius: var(--nd-radius);
  box-shadow: var(--nd-shadow);
  overflow: hidden;
  animation: nd-pop .18s var(--nd-ease);
}
.nd-align-right { right: 0; }
.nd-align-left { left: 0; }

/* 좁은 화면 — 화면 너비에 맞춰 하단 시트풍으로 */
@media (max-width: 460px) {
  .nd-panel {
    position: fixed;
    left: 12px;
    right: 12px;
    top: auto;
    bottom: 12px;
    width: auto;
    max-height: 80vh;
    animation: nd-sheet .22s var(--nd-ease);
  }
}

.nd-panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--nd-border);
}
.nd-panel-title { margin: 0; font-size: 14px; font-weight: 700; letter-spacing: -0.01em; }
.nd-panel-spacer { flex: 1; }
.nd-mark-all {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--nd-accent);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 7px;
  cursor: pointer;
  transition: background .12s var(--nd-ease);
}
.nd-mark-all:hover:not(:disabled) { background: var(--nd-unread); }
.nd-mark-all:disabled { color: var(--nd-muted); cursor: not-allowed; }
.nd-mark-all svg { width: 15px; height: 15px; }
.nd-panel-close {
  flex: none;
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 0; border-radius: 7px;
  background: transparent; color: var(--nd-muted);
  cursor: pointer;
  transition: background .12s var(--nd-ease), color .12s var(--nd-ease);
}
.nd-panel-close:hover { background: var(--nd-surface-2); color: var(--nd-ink); }
.nd-panel-close svg { width: 17px; height: 17px; }

/* ---- 목록 ---- */
.nd-list {
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.nd-item {
  position: relative;
  display: flex;
  gap: 10px;
  padding: 12px 16px 12px 16px;
  border-bottom: 1px solid var(--nd-surface-2);
  text-align: left;
  width: 100%;
  border-left: 0;
  border-right: 0;
  border-top: 0;
  background: var(--nd-surface);
  font: inherit;
  color: inherit;
  cursor: pointer;
  transition: background .12s var(--nd-ease);
}
.nd-item:last-child { border-bottom: 0; }
.nd-item:hover { background: var(--nd-surface-2); }
.nd-item.nd-unread { background: var(--nd-unread); }
.nd-item.nd-unread:hover { background: color-mix(in srgb, var(--nd-accent) 12%, var(--nd-surface)); }
.nd-dot {
  flex: none;
  width: 8px; height: 8px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--nd-accent);
}
.nd-item.nd-read .nd-dot { background: transparent; }
.nd-item-body { flex: 1; min-width: 0; }
.nd-item-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--nd-ink);
  overflow-wrap: anywhere;
}
.nd-item-text {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--nd-ink-soft);
  overflow-wrap: anywhere;
}
.nd-item-time { margin: 5px 0 0; font-size: 11px; color: var(--nd-muted); }

/* 시각적으로 숨기되 스크린리더에는 노출(미읽음 등 상태 안내) */
.nd-sr-only {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ---- 상태(loading / empty / error) ---- */
.nd-state { padding: 40px 24px; text-align: center; }
.nd-state-icon {
  width: 44px; height: 44px;
  margin: 0 auto 12px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: var(--nd-surface-2);
  color: var(--nd-muted);
}
.nd-state-icon.nd-err {
  background: color-mix(in srgb, var(--nd-danger) 12%, var(--nd-surface));
  color: var(--nd-danger);
}
.nd-state-icon svg { width: 24px; height: 24px; }
.nd-state-title { margin: 0; font-size: 14px; font-weight: 600; }
.nd-state-text { margin: 6px 0 0; font-size: 13px; color: var(--nd-ink-soft); }
.nd-retry {
  margin-top: 14px;
  border: 1px solid var(--nd-border);
  border-radius: var(--nd-radius-sm);
  background: var(--nd-surface);
  color: var(--nd-ink);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  cursor: pointer;
  transition: background .12s var(--nd-ease), border-color .12s var(--nd-ease);
}
.nd-retry:hover { background: var(--nd-surface-2); border-color: var(--nd-border-strong); }

.nd-spinner {
  width: 26px; height: 26px;
  border: 3px solid var(--nd-border);
  border-top-color: var(--nd-accent);
  border-radius: 50%;
  margin: 0 auto;
  animation: nd-spin .7s linear infinite;
}

/* ---- focus-visible: 키보드만 또렷한 링 ---- */
.nd-root :focus { outline: none; }
.nd-root :focus-visible {
  outline: 2px solid var(--nd-accent);
  outline-offset: 2px;
  border-radius: 8px;
}
.nd-item:focus-visible { outline-offset: -2px; }

@keyframes nd-pop { from { opacity: 0; transform: translateY(-6px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes nd-sheet { from { transform: translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes nd-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .nd-root *, .nd-panel, .nd-bell, .nd-spinner {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
  }
  .nd-spinner { animation: nd-spin .9s linear infinite !important; }
}
`;

/* =============================== 아이콘 ================================== */

function BellIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 9a6 6 0 0 1 12 0c0 4.5 1.2 6.2 2 7H4c.8-.8 2-2.5 2-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 19a2.5 2.5 0 0 0 5 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
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

function CheckAllIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m2 13 4 4 8-9M12.5 17l1 1 8-9"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
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

/** 빈 인박스 일러스트 — 조용한 벨. */
function EmptyBellIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 9a6 6 0 0 1 12 0c0 4.5 1.2 6.2 2 7H4c.8-.8 2-2.5 2-7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 19a2.5 2.5 0 0 0 5 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* =============================== 컴포넌트 =============================== */

export type WidgetAlign = 'right' | 'left';

export interface NotificationBellProps {
  /** 알림을 받을 사용자(테넌트 측 식별자). 예: 'user_42'. */
  recipientId: string;
  /** publishable 키(`pk_…`). 브라우저 노출 안전. */
  publishableKey: string;
  /** API 베이스 URL. 예: 'https://notify.example.com'. */
  endpoint: string;
  /** 드롭다운 정렬(벨 기준). 기본 'right'. */
  align?: WidgetAlign;
  /** 강조색(배지/포커스). 기본 #2f5fe0. accent 위 텍스트는 accentInk 로 보정. */
  accent?: string;
  /** accent 위 텍스트색(대비 보장용). 기본 흰색. */
  accentInk?: string;
  /** 벨 버튼 접근성 라벨. 기본 '알림'. */
  label?: string;
  /** 미읽음 카운트 폴링 주기(ms). 기본 30000. 0 이하면 폴링 끔. */
  pollIntervalMs?: number;
  /** 인박스 목록 최대 건수. 기본 20(서버 최대 100). */
  limit?: number;
  /** 배지에 표시할 최대 숫자(초과 시 'N+'). 기본 99. */
  maxBadge?: number;
  /** 알림 클릭 콜백(읽음 처리 후 호출) — 라우팅 등에 사용. */
  onNotificationClick?: (notification: NotificationDto) => void;
  /** 미읽음 카운트 변화 콜백(파비콘 배지 등). */
  onUnreadChange?: (count: number) => void;
  /** 커스텀 fetch(SSR/테스트). */
  fetch?: typeof fetch;
  /** 외부에서 만든 클라이언트 주입(테스트/공유용). 주면 recipientId/endpoint 보다 우선. */
  client?: NotifyDeskWidgetClient;
}

type Phase = 'idle' | 'loading' | 'ready' | 'error';

const FOCUSABLE =
  'a[href],area[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function NotificationBell(props: NotificationBellProps): ReactElement {
  const {
    recipientId,
    publishableKey,
    endpoint,
    align = 'right',
    accent = DEFAULT_ACCENT,
    accentInk = DEFAULT_ACCENT_INK,
    label = '알림',
    pollIntervalMs = 30_000,
    limit = 20,
    maxBadge = 99,
    onNotificationClick,
    onUnreadChange,
    fetch: customFetch,
    client: injectedClient,
  } = props;

  const client = useMemo<NotifyDeskWidgetClient>(
    () =>
      injectedClient ??
      createNotifyDeskWidgetClient({ recipientId, publishableKey, endpoint, fetch: customFetch }),
    [injectedClient, recipientId, publishableKey, endpoint, customFetch],
  );

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unread, setUnread] = useState(0);

  const theme: WidgetTheme = { accent, accentInk };
  const titleId = useId();

  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  // 콜백 ref 로 보관 — effect 의존성을 안정화해 폴링 타이머 재시작을 막는다.
  const onUnreadChangeRef = useRef(onUnreadChange);
  onUnreadChangeRef.current = onUnreadChange;

  // 스타일 1회 주입(브라우저에서만)
  useEffect(() => {
    if (typeof document !== 'undefined') ensureStyles();
  }, []);

  const applyUnread = useCallback((n: number) => {
    setUnread(n);
    onUnreadChangeRef.current?.(n);
  }, []);

  // 미읽음 카운트 폴링(닫혀 있어도 동작 — 배지 갱신)
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    const tick = (): void => {
      client
        .getUnreadCount(ctrl.signal)
        .then((r) => {
          if (!cancelled) applyUnread(r.unreadCount);
        })
        .catch(() => {
          /* 폴링 실패는 조용히 무시 — 다음 틱에서 복구 */
        });
    };

    tick();
    let timer: ReturnType<typeof setInterval> | undefined;
    if (pollIntervalMs > 0) timer = setInterval(tick, pollIntervalMs);

    return () => {
      cancelled = true;
      ctrl.abort();
      if (timer) clearInterval(timer);
    };
  }, [client, pollIntervalMs, applyUnread]);

  const loadInbox = useCallback(() => {
    const ctrl = new AbortController();
    setPhase('loading');
    client
      .getInbox(limit, ctrl.signal)
      .then((inbox) => {
        if (ctrl.signal.aborted) return;
        setItems(inbox.items);
        applyUnread(inbox.unreadCount);
        setPhase('ready');
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted || (e as Error)?.name === 'AbortError') return;
        setPhase('error');
      });
    return ctrl;
  }, [client, limit, applyUnread]);

  // 열릴 때: 인박스 로드 + 미읽음을 낙관적으로 읽음 처리
  const openPanel = useCallback(() => {
    setOpen(true);
    const ctrl = loadInbox();
    // 패널을 여는 행위 = "확인" → 미읽음 전체를 읽음 처리(낙관적 UI + 서버 반영)
    if (unread > 0) {
      setItems((prev) => prev.map((it) => (it.status === 'read' ? it : markItemRead(it))));
      applyUnread(0);
      client
        .markAllRead()
        .then((r) => applyUnread(r.unreadCount))
        .catch(() => {
          /* 실패 시 다음 폴링/리로드에서 실제 값으로 복구 */
        });
    }
    return ctrl;
  }, [loadInbox, unread, client, applyUnread]);

  const closePanel = useCallback(() => {
    setOpen(false);
    bellRef.current?.focus();
  }, []);

  const toggle = useCallback(() => {
    if (open) closePanel();
    else openPanel();
  }, [open, openPanel, closePanel]);

  // Esc 닫기 + 포커스 트랩 + 바깥 클릭 닫기
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent): void => {
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

    const onPointer = (e: MouseEvent): void => {
      const root = rootRef.current;
      if (root && !root.contains(e.target as Node)) closePanel();
    };

    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onPointer, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onPointer, true);
    };
  }, [open, closePanel]);

  // 열리면 패널 안으로 포커스 이동(첫 포커스 가능 요소)
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const root = panelRef.current;
      if (!root) return;
      const target = root.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    }, 20);
    return () => window.clearTimeout(t);
  }, [open, phase]);

  const handleItemClick = useCallback(
    (item: NotificationDto) => {
      if (item.status !== 'read') {
        setItems((prev) => prev.map((it) => (it.id === item.id ? markItemRead(it) : it)));
        applyUnread(Math.max(0, unread - 1));
        client
          .markRead([item.id])
          .then((r) => applyUnread(r.unreadCount))
          .catch(() => undefined);
      }
      onNotificationClick?.(item);
    },
    [client, unread, applyUnread, onNotificationClick],
  );

  const rootStyle = themeVars(theme) as CSSProperties;
  const badgeText = unread > maxBadge ? `${maxBadge}+` : String(unread);
  const hasUnread = unread > 0;

  return (
    <div className="nd-root" style={rootStyle} ref={rootRef}>
      <button
        ref={bellRef}
        type="button"
        className="nd-bell"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={hasUnread ? `${label}, 읽지 않은 알림 ${unread}건` : label}
        onClick={toggle}
      >
        <BellIcon />
        {hasUnread ? (
          <span className="nd-badge" aria-hidden="true">
            {badgeText}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          className={`nd-panel ${align === 'left' ? 'nd-align-left' : 'nd-align-right'}`}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
        >
          <div className="nd-panel-header">
            <h2 className="nd-panel-title" id={titleId}>
              {label}
            </h2>
            <span className="nd-panel-spacer" />
            <button
              type="button"
              className="nd-mark-all"
              disabled={!hasUnread}
              onClick={() => {
                setItems((prev) =>
                  prev.map((it) => (it.status === 'read' ? it : markItemRead(it))),
                );
                applyUnread(0);
                client
                  .markAllRead()
                  .then((r) => applyUnread(r.unreadCount))
                  .catch(() => undefined);
              }}
            >
              <CheckAllIcon />
              모두 읽음
            </button>
            <button type="button" className="nd-panel-close" aria-label="닫기" onClick={closePanel}>
              <CloseIcon />
            </button>
          </div>

          {phase === 'loading' && items.length === 0 ? (
            <div className="nd-state" aria-busy="true">
              <div className="nd-spinner" />
              <p className="nd-state-text" style={{ marginTop: 12 }}>
                알림을 불러오는 중…
              </p>
            </div>
          ) : null}

          {phase === 'error' ? (
            <div className="nd-state" role="alert">
              <div className="nd-state-icon nd-err">
                <AlertIcon />
              </div>
              <h3 className="nd-state-title">알림을 불러오지 못했어요</h3>
              <p className="nd-state-text">네트워크 상태를 확인해 주세요.</p>
              <button type="button" className="nd-retry" onClick={() => loadInbox()}>
                다시 시도
              </button>
            </div>
          ) : null}

          {phase === 'ready' && items.length === 0 ? (
            <div className="nd-state">
              <div className="nd-state-icon">
                <EmptyBellIcon />
              </div>
              <h3 className="nd-state-title">새 알림이 없어요</h3>
              <p className="nd-state-text">알림이 도착하면 여기에 표시됩니다.</p>
            </div>
          ) : null}

          {items.length > 0 ? (
            <ul className="nd-list">
              {items.map((item) => {
                const isUnread = item.status !== 'read';
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`nd-item ${isUnread ? 'nd-unread' : 'nd-read'}`}
                      onClick={() => handleItemClick(item)}
                    >
                      <span className="nd-dot" aria-hidden="true" />
                      <span className="nd-item-body">
                        {item.title ? <p className="nd-item-title">{item.title}</p> : null}
                        {item.body ? <p className="nd-item-text">{item.body}</p> : null}
                        <p className="nd-item-time">
                          <time dateTime={item.createdAt}>
                            {formatRelativeTime(item.createdAt)}
                          </time>
                          {isUnread ? <span className="nd-sr-only"> · 읽지 않음</span> : null}
                        </p>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** 알림을 읽음 상태로 표시한 새 객체를 반환(불변 갱신). */
function markItemRead(item: NotificationDto): NotificationDto {
  return { ...item, status: 'read', readAt: item.readAt ?? new Date().toISOString() };
}

export default NotificationBell;
export { NotifyDeskWidgetError };
export type { NotificationDto, InboxDto, UnreadCountDto, MarkReadResultDto };
