/**
 * SearchDesk — 단일 파일 벤더링 컴포넌트 (의존성: react 만).
 * ──────────────────────────────────────────────────────────────────────────
 * DeskCloud(@searchdesk/widget)의 npm publish 가 막혀 있는 동안, 형제 앱에 그대로
 * 복붙해서 쓰는 self-contained 버전입니다. 워크스페이스 의존(@searchdesk/sdk·shared) 0 —
 * 필요한 클라이언트·스타일·그룹핑을 인라인했습니다.
 * 동작/디자인은 @searchdesk/widget 의 <SearchPalette>/<SearchBox> 와 동일합니다.
 *
 * 원본: searchdesk/apps-vendor/SearchPalette.tsx (코드 스타일만 이 앱에 맞춤).
 *
 * 사용:
 *   import { SearchPalette, SearchBox } from '@/components/deskcloud/searchdesk/SearchPalette';
 *   <SearchPalette publishableKey="pk_…" endpoint="https://search.example.com" />
 *   <SearchBox publishableKey="pk_…" endpoint="https://search.example.com" />
 *
 * 백엔드 계약(공개·publishable 키):
 *   GET {endpoint}/api/search?q=&index=&category=&tags=&limit=  (Authorization: Bearer pk_…)
 *     → { query, index, total, hits[], facets, limit, engine }
 *
 * 접근성/디자인: role="dialog"+aria-modal(팔레트) · combobox/listbox/option ·
 * aria-activedescendant · 포커스 트랩 · Esc · prefers-reduced-motion · :focus-visible ·
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

/* ============================ 공유 타입(인라인) ============================ */

export interface FacetCount {
  value: string;
  count: number;
}
export interface SearchHit {
  id: string;
  index: string;
  title: string;
  titleHighlight: string;
  url: string | null;
  category: string | null;
  tags: string[];
  attrs: Record<string, unknown> | null;
  snippet: string | null;
  score: number;
}
export interface SearchResponse {
  query: string;
  index: string;
  total: number;
  hits: SearchHit[];
  facets: { category: FacetCount[]; tags: FacetCount[] };
  limit: number;
  engine: 'postgres' | 'fallback';
}

const DEFAULT_INDEX = 'default';

/* ============================== 클라이언트 ============================== */

class SearchDeskError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'SearchDeskError';
  }
}

interface SearchOpts {
  index?: string;
  category?: string;
  tags?: string[];
  limit?: number;
  signal?: AbortSignal;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function searchRequest(
  endpoint: string,
  publishableKey: string,
  indexName: string,
  query: string,
  opts: SearchOpts,
): Promise<SearchResponse> {
  const base = endpoint.replace(/\/+$/, '');
  const params = new URLSearchParams();
  params.set('q', query ?? '');
  const index = opts.index ?? indexName;
  if (index) params.set('index', index);
  if (opts.category) params.set('category', opts.category);
  if (opts.tags && opts.tags.length > 0) params.set('tags', opts.tags.join(','));
  if (opts.limit != null) params.set('limit', String(opts.limit));

  const res = await fetch(`${base}/api/search?${params.toString()}`, {
    method: 'GET',
    headers: { authorization: `Bearer ${publishableKey}`, 'x-searchdesk-sdk': 'vendor-0.1.0' },
    signal: opts.signal,
  });
  const text = await res.text();
  const json: unknown = text ? safeJson(text) : null;
  if (!res.ok) {
    const rec = (json ?? {}) as Record<string, unknown>;
    const raw = rec.message ?? rec.error ?? `SearchDesk 요청 실패 (${res.status})`;
    throw new SearchDeskError(Array.isArray(raw) ? raw.join(', ') : String(raw), res.status);
  }
  return json as SearchResponse;
}

/* ============================ 그룹핑(인라인) ============================ */

interface ResultGroup {
  category: string;
  hits: SearchHit[];
}
const UNCATEGORIZED = '기타';

function groupHits(hits: SearchHit[]): ResultGroup[] {
  const order: string[] = [];
  const byCat = new Map<string, SearchHit[]>();
  for (const h of hits) {
    const cat = h.category ?? UNCATEGORIZED;
    if (!byCat.has(cat)) {
      byCat.set(cat, []);
      order.push(cat);
    }
    byCat.get(cat)!.push(h);
  }
  return order.map((category) => ({ category, hits: byCat.get(category)! }));
}

/* ================================ 스타일 ================================ */

const STYLE_ID = 'searchdesk-widget-styles';
const ACCENT = '#2f5fe0';
const ACCENT_INK = '#ffffff';

function ensureStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.sk-root, .sk-root * { box-sizing: border-box; }
.sk-root {
  --sk-accent: ${ACCENT}; --sk-accent-ink: ${ACCENT_INK};
  --sk-ink:#1a1d23; --sk-ink-soft:#4a4f57; --sk-muted:#6b7280;
  --sk-surface:#fff; --sk-surface-2:#f4f5f7; --sk-border:#d7dae0; --sk-border-strong:#b7bcc6;
  --sk-danger:#b42318; --sk-radius:14px; --sk-radius-sm:9px;
  --sk-shadow:0 1px 2px rgba(16,24,40,.06),0 18px 48px -12px rgba(16,24,40,.28);
  --sk-z-backdrop:2147483600; --sk-z-dialog:2147483601;
  --sk-ease:cubic-bezier(.22,1,.36,1);
  --sk-mark-bg:color-mix(in srgb, var(--sk-accent) 22%, #fff);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color:var(--sk-ink); line-height:1.5;
}
.sk-backdrop{position:fixed;inset:0;z-index:var(--sk-z-backdrop);background:rgba(16,24,40,.42);
  display:flex;align-items:flex-start;justify-content:center;padding:12vh 16px 16px;animation:sk-fade .16s var(--sk-ease);}
.sk-dialog{position:relative;z-index:var(--sk-z-dialog);width:min(640px,100%);max-height:min(70vh,560px);
  display:flex;flex-direction:column;background:var(--sk-surface);color:var(--sk-ink);
  border:1px solid var(--sk-border);border-radius:var(--sk-radius);box-shadow:var(--sk-shadow);
  overflow:hidden;animation:sk-pop .2s var(--sk-ease);}
@media (max-width:520px){.sk-backdrop{padding:8vh 10px 10px;} .sk-dialog{max-height:84vh;}}
.sk-inputbar{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--sk-border);}
.sk-inputbar svg.sk-search-icon{width:20px;height:20px;color:var(--sk-muted);flex:none;}
.sk-input{flex:1;min-width:0;border:0;outline:none;background:transparent;font:inherit;font-size:16px;color:var(--sk-ink);padding:4px 0;}
.sk-input::placeholder{color:var(--sk-muted);}
.sk-kbd{flex:none;font:inherit;font-size:11px;font-weight:600;color:var(--sk-muted);background:var(--sk-surface-2);
  border:1px solid var(--sk-border);border-radius:6px;padding:2px 7px;line-height:1.4;}
.sk-mini-spinner{width:16px;height:16px;border:2px solid var(--sk-border);border-top-color:var(--sk-accent);
  border-radius:50%;flex:none;animation:sk-spin .7s linear infinite;}
.sk-results{margin:0;padding:6px;list-style:none;overflow-y:auto;-webkit-overflow-scrolling:touch;}
.sk-group-label{padding:10px 12px 6px;font-size:11px;font-weight:700;letter-spacing:.04em;
  text-transform:uppercase;color:var(--sk-muted);}
.sk-option{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:var(--sk-radius-sm);
  cursor:pointer;scroll-margin:8px;}
.sk-option-main{flex:1;min-width:0;}
.sk-option-title{font-size:14px;font-weight:600;color:var(--sk-ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.sk-option-snippet{margin-top:2px;font-size:12.5px;color:var(--sk-ink-soft);display:-webkit-box;
  -webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.sk-option-tags{display:flex;gap:6px;flex:none;max-width:40%;overflow:hidden;}
.sk-tag{font-size:11px;color:var(--sk-ink-soft);background:var(--sk-surface-2);border:1px solid var(--sk-border);
  border-radius:999px;padding:1px 8px;white-space:nowrap;}
.sk-option[aria-selected="true"]{background:color-mix(in srgb,var(--sk-accent) 12%,var(--sk-surface));}
.sk-option[aria-selected="true"] .sk-option-title{color:var(--sk-accent);}
.sk-option:hover{background:var(--sk-surface-2);}
.sk-option mark,.sk-option-title mark,.sk-option-snippet mark{background:var(--sk-mark-bg);color:inherit;
  border-radius:3px;padding:0 1px;font-weight:700;}
.sk-state{padding:44px 24px;text-align:center;color:var(--sk-ink-soft);}
.sk-state-title{margin:0;font-size:15px;font-weight:600;color:var(--sk-ink);}
.sk-state-text{margin:6px 0 0;font-size:13px;color:var(--sk-muted);}
.sk-state-text strong{color:var(--sk-ink);font-weight:600;}
.sk-spinner{width:26px;height:26px;border:3px solid var(--sk-border);border-top-color:var(--sk-accent);
  border-radius:50%;margin:0 auto 12px;animation:sk-spin .7s linear infinite;}
.sk-footer{display:flex;align-items:center;gap:12px;padding:8px 14px;border-top:1px solid var(--sk-border);
  font-size:11px;color:var(--sk-muted);}
.sk-footer-spacer{flex:1;} .sk-footer .sk-kbd{font-size:10px;padding:1px 5px;}
.sk-foot-key{display:inline-flex;align-items:center;gap:4px;}
.sk-brand{color:var(--sk-muted);text-decoration:none;font-weight:600;} .sk-brand:hover{color:var(--sk-ink-soft);}
.sk-box{position:relative;width:100%;}
.sk-box-inputbar{display:flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid var(--sk-border);
  border-radius:var(--sk-radius-sm);background:var(--sk-surface);
  transition:border-color .12s var(--sk-ease),box-shadow .12s var(--sk-ease);}
.sk-box-inputbar:focus-within{border-color:var(--sk-accent);
  box-shadow:0 0 0 3px color-mix(in srgb,var(--sk-accent) 18%,transparent);}
.sk-box-inputbar svg.sk-search-icon{width:17px;height:17px;}
.sk-box .sk-input{font-size:14px;}
.sk-box-panel{position:absolute;z-index:var(--sk-z-dialog);top:calc(100% + 6px);left:0;right:0;max-height:360px;
  display:flex;flex-direction:column;background:var(--sk-surface);border:1px solid var(--sk-border);
  border-radius:var(--sk-radius);box-shadow:var(--sk-shadow);overflow:hidden;animation:sk-pop .16s var(--sk-ease);}
.sk-root :focus{outline:none;}
.sk-root :focus-visible{outline:2px solid var(--sk-accent);outline-offset:2px;border-radius:6px;}
@keyframes sk-fade{from{opacity:0}to{opacity:1}}
@keyframes sk-pop{from{opacity:0;transform:translateY(-6px) scale(.99)}to{opacity:1;transform:none}}
@keyframes sk-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){
  .sk-root *,.sk-backdrop,.sk-dialog,.sk-box-panel,.sk-spinner,.sk-mini-spinner{
    animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;}
  .sk-spinner,.sk-mini-spinner{animation:sk-spin .9s linear infinite!important;}
}
`;

/* ================================ 아이콘 ================================ */

const SearchIcon = ({ className }: { className?: string }): ReactElement => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
    <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const EnterIcon = (): ReactElement => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
    <path
      d="M20 6v5a2 2 0 0 1-2 2H5m0 0 4-4m-4 4 4 4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ============================ 디바운스 검색 훅 ============================ */

type SearchPhase = 'idle' | 'loading' | 'ready' | 'error';

interface UseSearchState {
  query: string;
  setQuery: (q: string) => void;
  phase: SearchPhase;
  hits: SearchHit[];
  groups: ResultGroup[];
  error: string | null;
  retry: () => void;
}

function useSearch(opts: {
  publishableKey: string;
  endpoint: string;
  indexName: string;
  limit?: number;
  debounceMs: number;
}): UseSearchState {
  const { publishableKey, endpoint, indexName, limit, debounceMs } = opts;
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<SearchPhase>('idle');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    abortRef.current?.abort();
    if (trimmed.length === 0) {
      setHits([]);
      setPhase('idle');
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const t = setTimeout(() => {
      setPhase('loading');
      setError(null);
      searchRequest(endpoint, publishableKey, indexName, trimmed, { limit, signal: ctrl.signal })
        .then((res) => {
          if (ctrl.signal.aborted) return;
          setHits(res.hits);
          setPhase('ready');
        })
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return;
          setError(e instanceof Error ? e.message : '검색에 실패했습니다.');
          setHits([]);
          setPhase('error');
        });
    }, debounceMs);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, debounceMs, endpoint, publishableKey, indexName, limit, nonce]);

  const groups = useMemo(() => groupHits(hits), [hits]);
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { query, setQuery, phase, hits, groups, error, retry };
}

/* ============================== 결과 리스트 ============================== */

function Highlighted({ html, className }: { html: string; className: string }): ReactElement {
  // eslint-disable-next-line react/no-danger -- 서버가 매치 토큰만 <mark> 로 감싼 안전한 HTML
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

interface ResultsListProps {
  phase: SearchPhase;
  query: string;
  groups: ResultGroup[];
  flatHits: SearchHit[];
  activeIndex: number;
  error: string | null;
  idPrefix: string;
  listboxId: string;
  onSelect: (hit: SearchHit) => void;
  onHover: (index: number) => void;
  onRetry: () => void;
}

function ResultsList(props: ResultsListProps): ReactElement {
  const {
    phase,
    query,
    groups,
    flatHits,
    activeIndex,
    error,
    idPrefix,
    listboxId,
    onSelect,
    onHover,
    onRetry,
  } = props;

  if (phase === 'idle' && query.trim().length === 0) {
    return (
      <div className="sk-state">
        <p className="sk-state-title">무엇을 찾고 계신가요?</p>
        <p className="sk-state-text">검색어를 입력하면 결과가 바로 표시됩니다.</p>
      </div>
    );
  }
  if (phase === 'error') {
    return (
      <div className="sk-state" role="alert">
        <p className="sk-state-title">검색에 실패했어요</p>
        <p className="sk-state-text">{error ?? '네트워크 상태를 확인해 주세요.'}</p>
        <div style={{ marginTop: 14 }}>
          <button type="button" className="sk-kbd" onClick={onRetry} style={{ cursor: 'pointer' }}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }
  if (phase === 'loading' && flatHits.length === 0) {
    return (
      <div className="sk-state" aria-busy="true">
        <div className="sk-spinner" />
        <p className="sk-state-text">검색 중…</p>
      </div>
    );
  }
  if (flatHits.length === 0) {
    return (
      <div className="sk-state">
        <p className="sk-state-title">결과가 없습니다</p>
        <p className="sk-state-text">
          <strong>{query.trim()}</strong> 에 대한 검색 결과를 찾지 못했어요.
        </p>
      </div>
    );
  }

  let flatIndex = -1;
  return (
    <ul className="sk-results" role="listbox" id={listboxId} aria-label="검색 결과">
      {groups.map((group) => (
        <li key={group.category} role="presentation">
          <div className="sk-group-label" role="presentation">
            {group.category}
          </div>
          <ul role="presentation" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {group.hits.map((hit) => {
              flatIndex += 1;
              const index = flatIndex;
              const selected = index === activeIndex;
              return (
                <li
                  key={`${hit.index}:${hit.id}`}
                  id={`${idPrefix}-opt-${index}`}
                  role="option"
                  aria-selected={selected}
                  className="sk-option"
                  onMouseEnter={() => onHover(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(hit);
                  }}
                >
                  <div className="sk-option-main">
                    <Highlighted className="sk-option-title" html={hit.titleHighlight} />
                    {hit.snippet ? (
                      <Highlighted className="sk-option-snippet" html={hit.snippet} />
                    ) : null}
                  </div>
                  {hit.tags.length > 0 ? (
                    <div className="sk-option-tags" aria-hidden="true">
                      {hit.tags.slice(0, 2).map((t) => (
                        <span key={t} className="sk-tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

/* ============================== ⌘K 팔레트 ============================== */

export interface SearchPaletteProps {
  publishableKey: string;
  endpoint: string;
  indexName?: string;
  hotkey?: string;
  placeholder?: string;
  limit?: number;
  debounceMs?: number;
  accent?: string;
  accentInk?: string;
  open?: boolean;
  onClose?: () => void;
  onSelect?: (hit: SearchHit) => void;
}

function matchHotkey(hotkey: string, e: KeyboardEvent): boolean {
  const parts = hotkey
    .toLowerCase()
    .split('+')
    .map((p) => p.trim());
  const key = parts[parts.length - 1]!;
  const wantMod = parts.includes('mod') || parts.includes('cmd') || parts.includes('meta');
  const wantCtrl = parts.includes('ctrl') || parts.includes('control');
  const wantShift = parts.includes('shift');
  const wantAlt = parts.includes('alt') || parts.includes('option');
  if (e.key.toLowerCase() !== key) return false;
  if (wantMod && !(e.metaKey || e.ctrlKey)) return false;
  if (wantCtrl && !e.ctrlKey) return false;
  if (wantShift && !e.shiftKey) return false;
  if (wantAlt && !e.altKey) return false;
  if (!wantMod && !wantCtrl && (e.metaKey || e.ctrlKey)) return false;
  return true;
}

const FOCUSABLE =
  'a[href],input:not([disabled]),textarea:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function SearchPalette(props: SearchPaletteProps): ReactElement | null {
  const {
    publishableKey,
    endpoint,
    indexName = DEFAULT_INDEX,
    hotkey = 'mod+k',
    placeholder = '검색…',
    limit,
    debounceMs = 160,
    accent = ACCENT,
    accentInk = ACCENT_INK,
    open: controlledOpen,
    onClose,
    onSelect,
  } = props;

  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const [activeIndex, setActiveIndex] = useState(0);

  const reactId = useId();
  const listboxId = `${reactId}-listbox`;
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const { query, setQuery, phase, hits, groups, error, retry } = useSearch({
    publishableKey,
    endpoint,
    indexName,
    limit,
    debounceMs,
  });

  useEffect(() => {
    ensureStyles();
  }, []);

  const close = useCallback(() => {
    if (isControlled) onClose?.();
    else setUncontrolledOpen(false);
  }, [isControlled, onClose]);

  useEffect(() => {
    if (isControlled) return;
    const onKey = (e: KeyboardEvent) => {
      if (matchHotkey(hotkey, e)) {
        e.preventDefault();
        setUncontrolledOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isControlled, hotkey]);

  useEffect(() => {
    setActiveIndex((i) => (i >= hits.length ? 0 : i));
  }, [hits.length]);

  useEffect(() => {
    if (open) {
      restoreFocusRef.current = (document.activeElement as HTMLElement) ?? null;
      const t = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(t);
    }
    setQuery('');
    setActiveIndex(0);
    restoreFocusRef.current?.focus?.();
    return undefined;
  }, [open, setQuery]);

  const selectHit = useCallback(
    (hit: SearchHit) => {
      close();
      if (onSelect) onSelect(hit);
      else if (hit.url) window.location.assign(hit.url);
    },
    [close, onSelect],
  );

  const move = useCallback(
    (delta: number) => {
      if (hits.length === 0) return;
      setActiveIndex((i) => {
        const next = (i + delta + hits.length) % hits.length;
        window.setTimeout(() => {
          dialogRef.current
            ?.querySelector<HTMLElement>('[aria-selected="true"]')
            ?.scrollIntoView({ block: 'nearest' });
        }, 0);
        return next;
      });
    },
    [hits.length],
  );

  const onDialogKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        move(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        move(-1);
      } else if (e.key === 'Enter') {
        const hit = hits[activeIndex];
        if (hit) {
          e.preventDefault();
          selectHit(hit);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      } else if (e.key === 'Tab') {
        const root = dialogRef.current;
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
      }
    },
    [move, hits, activeIndex, selectHit, close],
  );

  const activeDescendant = hits.length > 0 ? `${reactId}-opt-${activeIndex}` : undefined;

  if (!open) return null;

  const rootStyle: CSSProperties = {
    ['--sk-accent' as string]: accent,
    ['--sk-accent-ink' as string]: accentInk,
  };
  const busy = phase === 'loading';

  return (
    <div className="sk-root" style={rootStyle}>
      <div
        className="sk-backdrop"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div
          ref={dialogRef}
          className="sk-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="검색"
          onKeyDown={onDialogKeyDown}
        >
          <div className="sk-inputbar">
            <SearchIcon className="sk-search-icon" />
            <input
              ref={inputRef}
              className="sk-input"
              type="text"
              role="combobox"
              aria-expanded={hits.length > 0}
              aria-controls={listboxId}
              aria-activedescendant={activeDescendant}
              aria-autocomplete="list"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {busy ? <div className="sk-mini-spinner" aria-hidden="true" /> : null}
            <kbd className="sk-kbd" aria-hidden="true">
              Esc
            </kbd>
          </div>

          <ResultsList
            phase={phase}
            query={query}
            groups={groups}
            flatHits={hits}
            activeIndex={activeIndex}
            error={error}
            idPrefix={reactId}
            listboxId={listboxId}
            onSelect={selectHit}
            onHover={setActiveIndex}
            onRetry={retry}
          />

          <div className="sk-footer">
            <span className="sk-foot-key">
              <kbd className="sk-kbd">↑</kbd>
              <kbd className="sk-kbd">↓</kbd>
              이동
            </span>
            <span className="sk-foot-key">
              <kbd className="sk-kbd">
                <EnterIcon />
              </kbd>
              선택
            </span>
            <span className="sk-footer-spacer" />
            <a className="sk-brand" href="https://github.com" target="_blank" rel="noreferrer">
              SearchDesk
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== 인라인 박스 ============================== */

export interface SearchBoxProps {
  publishableKey: string;
  endpoint: string;
  indexName?: string;
  placeholder?: string;
  limit?: number;
  debounceMs?: number;
  accent?: string;
  accentInk?: string;
  onSelect?: (hit: SearchHit) => void;
}

export function SearchBox(props: SearchBoxProps): ReactElement {
  const {
    publishableKey,
    endpoint,
    indexName = DEFAULT_INDEX,
    placeholder = '검색…',
    limit,
    debounceMs = 160,
    accent = ACCENT,
    accentInk = ACCENT_INK,
    onSelect,
  } = props;

  const [openPanel, setOpenPanel] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const reactId = useId();
  const listboxId = `${reactId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { query, setQuery, phase, hits, groups, error, retry } = useSearch({
    publishableKey,
    endpoint,
    indexName,
    limit,
    debounceMs,
  });

  useEffect(() => {
    ensureStyles();
  }, []);

  useEffect(() => {
    setActiveIndex((i) => (i >= hits.length ? 0 : i));
  }, [hits.length]);

  const selectHit = useCallback(
    (hit: SearchHit) => {
      setOpenPanel(false);
      if (onSelect) onSelect(hit);
      else if (hit.url) window.location.assign(hit.url);
    },
    [onSelect],
  );

  const move = useCallback(
    (delta: number) => {
      if (hits.length === 0) return;
      setActiveIndex((i) => {
        const next = (i + delta + hits.length) % hits.length;
        window.setTimeout(() => {
          panelRef.current
            ?.querySelector<HTMLElement>('[aria-selected="true"]')
            ?.scrollIntoView({ block: 'nearest' });
        }, 0);
        return next;
      });
    },
    [hits.length],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!openPanel) setOpenPanel(true);
        move(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        move(-1);
      } else if (e.key === 'Enter') {
        const hit = hits[activeIndex];
        if (hit) {
          e.preventDefault();
          selectHit(hit);
        }
      } else if (e.key === 'Escape') {
        if (openPanel) {
          e.preventDefault();
          setOpenPanel(false);
        }
      }
    },
    [openPanel, move, hits, activeIndex, selectHit],
  );

  const showPanel = openPanel && (query.trim().length > 0 || phase === 'error');
  const activeDescendant =
    showPanel && hits.length > 0 ? `${reactId}-opt-${activeIndex}` : undefined;
  const rootStyle: CSSProperties = {
    ['--sk-accent' as string]: accent,
    ['--sk-accent-ink' as string]: accentInk,
  };
  const busy = phase === 'loading';

  return (
    <div className="sk-root" style={rootStyle}>
      <div
        ref={rootRef}
        className="sk-box"
        onBlur={(e) => {
          if (!rootRef.current?.contains(e.relatedTarget as Node)) setOpenPanel(false);
        }}
      >
        <div className="sk-box-inputbar">
          <SearchIcon className="sk-search-icon" />
          <input
            className="sk-input"
            type="text"
            role="combobox"
            aria-expanded={showPanel && hits.length > 0}
            aria-controls={listboxId}
            aria-activedescendant={activeDescendant}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpenPanel(true);
            }}
            onFocus={() => {
              if (query.trim().length > 0) setOpenPanel(true);
            }}
            onKeyDown={onKeyDown}
          />
          {busy ? <div className="sk-mini-spinner" aria-hidden="true" /> : null}
        </div>

        {showPanel ? (
          <div ref={panelRef} className="sk-box-panel">
            <ResultsList
              phase={phase}
              query={query}
              groups={groups}
              flatHits={hits}
              activeIndex={activeIndex}
              error={error}
              idPrefix={reactId}
              listboxId={listboxId}
              onSelect={selectHit}
              onHover={setActiveIndex}
              onRetry={retry}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default SearchPalette;
export { SearchDeskError };
