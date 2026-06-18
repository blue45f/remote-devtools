import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Clock,
  Download,
  ExternalLink,
  Filter,
  Globe,
  LayoutGrid,
  Link2 as LinkIcon,
  Monitor as MonitorIcon,
  PlaySquare,
  Pin,
  PinOff,
  RadioTower,
  Regex,
  RefreshCw,
  Rows3,
  Rows4,
  Search,
  Smartphone,
  StickyNote,
  Table as TableIcon,
  Tag,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DevToolsLinkButton } from '@/components/DevToolsLinkButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { apiFetch } from '@/lib/api';
import { copyToClipboard } from '@/lib/clipboard';
import { formatDurationFromNanos, formatTimeAgo, shortHash } from '@/lib/format';
import { useDocumentTitle } from '@/lib/use-document-title';
import { formatUserAgentBadge } from '@/lib/user-agent';
import { cn } from '@/lib/utils';

interface SessionRecord {
  id: number;
  name: string;
  url?: string;
  deviceId?: string;
  duration?: string | number;
  recordMode?: boolean;
  timestamp?: string;
  userAgent?: string;
  tags?: string[];
  hasNote?: boolean;
}

type SessionTab = 'record' | 'live';
type SortKey = 'newest' | 'oldest' | 'name';
type ViewMode = 'table' | 'grid';
type Density = 'comfortable' | 'compact';

const DEFAULT_DENSITY: Density = 'comfortable';

type DurationFilter = 'all' | 'short' | 'medium' | 'long';
type AgeFilter = 'all' | '24h' | '7d' | '30d';

// Age-filter label key maps resolved with `t()` at render (SPEC.md i18n notes).
// `AGE_CHIP_KEYS` is the terse chip variant ("24h"); `AGE_PILL_KEYS` is the
// lowercased active-filter pill variant ("last 24h"). They are separate keys
// because Korean has no case distinction and the chip drops the "Last " prefix.
const AGE_CHIP_KEYS: Record<AgeFilter, string> = {
  all: 'sessions.ageChipAll',
  '24h': 'sessions.ageChip24h',
  '7d': 'sessions.ageChip7d',
  '30d': 'sessions.ageChip30d',
};

const AGE_PILL_KEYS: Record<AgeFilter, string> = {
  all: 'sessions.agePillAll',
  '24h': 'sessions.agePill24h',
  '7d': 'sessions.agePill7d',
  '30d': 'sessions.agePill30d',
};

const AGE_LIMITS_MS: Record<AgeFilter, number> = {
  all: 0,
  '24h': 24 * 3600 * 1000,
  '7d': 7 * 24 * 3600 * 1000,
  '30d': 30 * 24 * 3600 * 1000,
};

const SORT_LABEL_KEYS: Record<SortKey, string> = {
  newest: 'sessions.sortNewest',
  oldest: 'sessions.sortOldest',
  name: 'sessions.sortName',
};

const SORT_ICONS: Record<SortKey, typeof ArrowDown> = {
  newest: ArrowDown,
  oldest: ArrowUp,
  name: ArrowUpDown,
};

type PaginatedRecordResponse =
  | SessionRecord[]
  | { rows: SessionRecord[]; nextCursor: string | null };

const PAGE_SIZES = [50, 100, 200] as const;
type PageSize = (typeof PAGE_SIZES)[number];
const DEFAULT_PAGE_SIZE: PageSize = 50;

/**
 * Pick the default view for the user's viewport. Below `lg` the table needs
 * horizontal scroll on a phone, while the grid is purpose-built for that
 * width. Users can still flip back via the toggle — we just don't drop
 * them into the worse default. `window` is safe to reach in a Vite SPA;
 * during SSR / first paint we fall back to the desktop default.
 */
function pickDefaultView(): ViewMode {
  if (typeof window === 'undefined') return 'table';
  return globalThis.innerWidth >= 1024 ? 'table' : 'grid';
}

function getHostname(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const PREFS_STORAGE_KEY = 'sessions-prefs:v1';

interface SessionsPrefs {
  view?: ViewMode;
  sort?: SortKey;
  pageSize?: PageSize;
  density?: Density;
}

function readStoredPrefs(): SessionsPrefs {
  if (typeof window === 'undefined') return {};
  try {
    const raw = globalThis.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SessionsPrefs;
    // Defend against future-version garbage by only allowing known values.
    const view: ViewMode | undefined =
      parsed.view === 'table' || parsed.view === 'grid' ? parsed.view : undefined;
    const sort: SortKey | undefined =
      parsed.sort === 'newest' || parsed.sort === 'oldest' || parsed.sort === 'name'
        ? parsed.sort
        : undefined;
    const pageSize: PageSize | undefined = (PAGE_SIZES as readonly number[]).includes(
      Number(parsed.pageSize),
    )
      ? (parsed.pageSize as PageSize)
      : undefined;
    const density: Density | undefined =
      parsed.density === 'comfortable' || parsed.density === 'compact' ? parsed.density : undefined;
    return { view, sort, pageSize, density };
  } catch {
    return {};
  }
}

function persistPrefs(prefs: SessionsPrefs) {
  if (typeof window === 'undefined') return;
  try {
    globalThis.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* quota or private-mode — best effort */
  }
}

const PINS_STORAGE_KEY = 'sessions-pins:v1';

function readPinnedIds(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = globalThis.localStorage.getItem(PINS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is number => typeof x === 'number'));
  } catch {
    return new Set();
  }
}

function persistPinnedIds(ids: Set<number>) {
  if (typeof window === 'undefined') return;
  try {
    globalThis.localStorage.setItem(PINS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* best effort */
  }
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function sessionsToJson(rows: SessionRecord[]): string {
  const payload = rows.map((r) => ({
    id: r.id,
    name: r.name,
    url: r.url ?? null,
    host: getHostname(r.url) ?? null,
    deviceId: r.deviceId ?? null,
    mode: r.recordMode ? 'recorded' : 'live',
    durationMs: r.duration ? Math.round(Number(r.duration) / 1_000_000) : null,
    timestamp: r.timestamp ?? null,
    tags: Array.isArray(r.tags) ? r.tags : [],
    userAgent: r.userAgent ?? null,
  }));
  return JSON.stringify(payload, null, 2) + '\n';
}

function sessionsToCsv(rows: SessionRecord[]): string {
  const header = [
    'id',
    'name',
    'url',
    'host',
    'deviceId',
    'mode',
    'durationMs',
    'timestamp',
    'tags',
    'userAgent',
  ];
  const lines = [header.join(',')];
  for (const r of rows) {
    const host = getHostname(r.url) ?? '';
    const durMs = r.duration ? Math.round(Number(r.duration) / 1_000_000) : '';
    const tags = Array.isArray(r.tags) ? r.tags.join(' ') : '';
    const cells = [
      r.id,
      r.name,
      r.url ?? '',
      host,
      r.deviceId ?? '',
      r.recordMode ? 'recorded' : 'live',
      durMs,
      r.timestamp ?? '',
      tags,
      r.userAgent ?? '',
    ];
    lines.push(cells.map(csvCell).join(','));
  }
  return lines.join('\n') + '\n';
}

export default function SessionsPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('sessions.title'));
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial state from URL params. Falls back to stored prefs /
  // sensible defaults so an empty URL still produces the right shape.
  const initialTab: SessionTab = searchParams.get('tab') === 'live' ? 'live' : 'record';
  const initialSearch = searchParams.get('q') ?? '';
  const initialRegexMode = searchParams.get('re') === '1';
  const urlSort = searchParams.get('sort');
  const initialSort: SortKey =
    urlSort === 'newest' || urlSort === 'oldest' || urlSort === 'name'
      ? urlSort
      : (readStoredPrefs().sort ?? 'newest');
  const urlDuration = searchParams.get('dur');
  const initialDuration: DurationFilter =
    urlDuration === 'short' ||
    urlDuration === 'medium' ||
    urlDuration === 'long' ||
    urlDuration === 'all'
      ? urlDuration
      : 'all';
  const urlAge = searchParams.get('age');
  const initialAge: AgeFilter =
    urlAge === '24h' || urlAge === '7d' || urlAge === '30d' || urlAge === 'all' ? urlAge : 'all';
  const initialHost = searchParams.get('host');
  const initialTag = searchParams.get('tag');
  const initialNoteOnly = searchParams.get('note') === '1';

  const [tab, setTab] = useState<SessionTab>(initialTab);
  const [search, setSearch] = useState(initialSearch);
  const [regexMode, setRegexMode] = useState(initialRegexMode);
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [view, setView] = useState<ViewMode>(() => readStoredPrefs().view ?? pickDefaultView());
  const [pageSize, setPageSize] = useState<PageSize>(
    () => readStoredPrefs().pageSize ?? DEFAULT_PAGE_SIZE,
  );
  const [density, setDensity] = useState<Density>(
    () => readStoredPrefs().density ?? DEFAULT_DENSITY,
  );
  const [durationFilter, setDurationFilter] = useState<DurationFilter>(initialDuration);
  const [ageFilter, setAgeFilter] = useState<AgeFilter>(initialAge);
  const [hostFilter, setHostFilter] = useState<string | null>(initialHost);
  const [tagFilter, setTagFilter] = useState<string | null>(initialTag);
  const [noteOnly, setNoteOnly] = useState<boolean>(initialNoteOnly);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Live tab polling: 5s default, 15s / 30s slower, "off" pauses.
  // Stored in component state only — most sessions are short-lived
  // enough that persisting this would just confuse the next visit.
  const [liveInterval, setLiveInterval] = useState<'5s' | '15s' | '30s' | 'off'>('5s');

  const [pinned, setPinned] = useState<Set<number>>(() => readPinnedIds());
  useEffect(() => {
    persistPinnedIds(pinned);
  }, [pinned]);
  const togglePin = (id: number) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Mirror the whole filter shape into the URL — this makes the address
  // bar itself a shareable view. Replace, not push, so each keystroke
  // doesn't pollute browser history.
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const writeOrDelete = (key: string, value: string, def: string) => {
          if (value && value !== def) next.set(key, value);
          else next.delete(key);
        };
        writeOrDelete('tab', tab, 'record');
        writeOrDelete('q', search.trim(), '');
        writeOrDelete('re', regexMode ? '1' : '', '');
        writeOrDelete('sort', sort, 'newest');
        writeOrDelete('dur', durationFilter, 'all');
        writeOrDelete('age', ageFilter, 'all');
        writeOrDelete('host', hostFilter ?? '', '');
        writeOrDelete('tag', tagFilter ?? '', '');
        writeOrDelete('note', noteOnly ? '1' : '', '');
        return next;
      },
      { replace: true },
    );
  }, [
    tab,
    search,
    regexMode,
    sort,
    durationFilter,
    ageFilter,
    hostFilter,
    tagFilter,
    noteOnly,
    setSearchParams,
  ]);
  // Index of the currently-focused row in the filtered list. -1 means
  // "no row selected" — the cursor reveals only after the user presses
  // a navigation key so it doesn't visually compete with the toolbar.
  const [cursorIdx, setCursorIdx] = useState<number>(-1);

  // Persist view+sort whenever they change so the next visit reopens
  // with the same shape. Search, host, duration are intentionally NOT
  // persisted — they're query-bound state, not preferences.
  useEffect(() => {
    persistPrefs({ view, sort, pageSize, density });
  }, [view, sort, pageSize, density]);

  // Reset the cursor whenever the filter result changes — the row at
  // cursorIdx might not exist any more.

  useEffect(() => {
    setCursorIdx(-1);
  }, [tab, search, sort, durationFilter, ageFilter, hostFilter, tagFilter, noteOnly]);

  // Compile the search query into a matcher once per change. Invalid regex
  // patterns fall back to plain-substring matching so the user never gets
  // an empty result list just from a half-typed `(foo`.
  const matcher = useMemo<((value: string) => boolean) | null>(() => {
    const trimmed = search.trim();
    if (!trimmed) return null;

    if (regexMode) {
      try {
        const re = new RegExp(trimmed, 'i');
        return (v) => re.test(v);
      } catch {
        return null;
      }
    }
    const lower = trimmed.toLowerCase();
    return (v) => v.toLowerCase().includes(lower);
  }, [search, regexMode]);

  const regexError = useMemo(() => {
    if (!regexMode || !search.trim()) return null;
    try {
      new RegExp(search.trim());
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : t('sessions.regexInvalid');
    }
  }, [regexMode, search, t]);

  // Debounce the search term that gets sent to the server. The local input
  // updates instantly so the field stays responsive.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['sessions', tab, debouncedSearch, pageSize],
    queryFn: async ({ pageParam }) => {
      if (tab === 'live') {
        const live = await apiFetch<SessionRecord[]>('/sessions');
        return { rows: live, nextCursor: null as string | null };
      }
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (debouncedSearch || pageParam) params.set('limit', String(pageSize));
      if (pageParam) params.set('cursor', pageParam);
      const qs = params.toString();
      const path = qs ? `/sessions/record?${qs}` : '/sessions/record';
      const res = await apiFetch<PaginatedRecordResponse>(path);
      if (Array.isArray(res)) return { rows: res, nextCursor: null };
      return res;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    refetchInterval:
      tab === 'live'
        ? liveInterval === 'off'
          ? false
          : liveInterval === '15s'
            ? 15_000
            : liveInterval === '30s'
              ? 30_000
              : 5_000
        : false,
  });

  const sessions = useMemo<SessionRecord[]>(() => data?.pages.flatMap((p) => p.rows) ?? [], [data]);

  const filtered = useMemo(() => {
    let result = sessions;

    if (matcher) {
      result = result.filter(
        (s) =>
          matcher(s.name) ||
          (s.url ? matcher(s.url) : false) ||
          (s.deviceId ? matcher(s.deviceId) : false) ||
          (Array.isArray(s.tags) && s.tags.some((t) => matcher(t))),
      );
    }

    if (durationFilter !== 'all') {
      result = result.filter((s) => {
        const ms = Number(s.duration || 0) / 1_000_000;
        if (durationFilter === 'short') return ms > 0 && ms < 30_000;
        if (durationFilter === 'medium') return ms >= 30_000 && ms < 300_000;
        return ms >= 300_000;
      });
    }

    if (ageFilter !== 'all') {
      // Intentional read of the current time when computing the age cutoff;
      // recomputed whenever the filter inputs change.
      // eslint-disable-next-line react-hooks/purity
      const cutoff = Date.now() - AGE_LIMITS_MS[ageFilter];
      result = result.filter((s) => {
        if (!s.timestamp) return false;
        const t = new Date(s.timestamp).getTime();
        return Number.isFinite(t) && t >= cutoff;
      });
    }

    if (hostFilter) {
      result = result.filter((s) => getHostname(s.url) === hostFilter);
    }

    if (tagFilter) {
      result = result.filter((s) => Array.isArray(s.tags) && s.tags.includes(tagFilter));
    }

    if (noteOnly) {
      result = result.filter((s) => s.hasNote);
    }

    return [...result].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      const ta = new Date(a.timestamp ?? 0).getTime();
      const tb = new Date(b.timestamp ?? 0).getTime();
      return sort === 'newest' ? tb - ta : ta - tb;
    });
  }, [sessions, matcher, sort, durationFilter, ageFilter, hostFilter, tagFilter, noteOnly]);

  const downloadExport = (format: 'csv' | 'json') => {
    const filename = `sessions-${new Date().toISOString().slice(0, 10)}.${format}`;
    const payload = format === 'csv' ? sessionsToCsv(filtered) : sessionsToJson(filtered);
    const mime = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json';
    const blob = new Blob([payload], { type: mime });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('sessions.exportToast', { format: format.toUpperCase() }), {
      description: t(filtered.length === 1 ? 'sessions.rowCountOne' : 'sessions.rowCountOther', {
        n: filtered.length,
      }),
    });
  };
  const exportCsv = () => downloadExport('csv');
  const exportJson = () => downloadExport('json');

  // Build the host strip from the *currently loaded* sessions so it
  // reflects what's on screen. Sort by hit count descending so the
  // dominant host floats to the front.
  const hostCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sessions) {
      const host = getHostname(s.url);
      if (host) counts.set(host, (counts.get(host) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // a longer list overflows the rail; 8 is plenty
  }, [sessions]);

  // Same idea for tags — surface the top 8 across currently-loaded
  // sessions so the user can pick one without scanning every row.
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sessions) {
      if (!Array.isArray(s.tags)) continue;
      for (const t of s.tags) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [sessions]);

  const filtersActive =
    search.trim() !== '' ||
    durationFilter !== 'all' ||
    ageFilter !== 'all' ||
    hostFilter !== null ||
    tagFilter !== null ||
    noteOnly;

  // Single source of truth for "reset every filter". Used by both the toolbar
  // clear chip and the no-results empty state so they can never drift — the
  // empty-state button previously left `tag`/`note` filters set, stranding the
  // user on an empty list they couldn't clear from there.
  const clearAllFilters = () => {
    setSearch('');
    setDurationFilter('all');
    setAgeFilter('all');
    setHostFilter(null);
    setTagFilter(null);
    setNoteOnly(false);
  };

  // `/` focuses the search box (GitHub / Linear convention). Ignored
  // while already typing so it doesn't hijack a literal slash.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  }, []);

  // Keyboard nav: j/↓ next, k/↑ prev, Enter opens detail. Ignored
  // while typing in inputs, while modifier keys are held, and while
  // live tab is active (the live tab has no detail route).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (filtered.length === 0) return;

      const move = (delta: number) => {
        e.preventDefault();
        setCursorIdx((idx) => {
          const next = idx < 0 ? (delta > 0 ? 0 : filtered.length - 1) : idx + delta;
          const clamped = Math.max(0, Math.min(filtered.length - 1, next));
          // Bring the focused row into view on the next paint
          requestAnimationFrame(() => {
            const id = filtered[clamped]?.id;
            if (id === undefined || id === null) return;
            const el = document.querySelector<HTMLElement>(`[data-session-row="${id}"]`);
            el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          });
          return clamped;
        });
      };

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          move(1);
          return;
        case 'k':
        case 'ArrowUp':
          move(-1);
          return;
        case 'Enter': {
          if (tab !== 'record') return;
          if (cursorIdx < 0) return;
          const id = filtered[cursorIdx]?.id;
          if (id === undefined || id === null) return;
          e.preventDefault();
          navigate(`/sessions/${id}`);
          return;
        }
        default:
          return;
      }
    };
    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  }, [filtered, cursorIdx, navigate, tab]);

  const SortIcon = SORT_ICONS[sort];
  // On phones / small tablets the row-based table is illegible — force the
  // card grid below `lg`. Users who explicitly opt into a table on a small
  // screen would just be fighting horizontal scroll; the grid carries the
  // same fields in a denser-on-tap form.
  const effectiveView: ViewMode = view;

  return (
    <div className="safe-px py-5 sm:py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-4 sm:mb-5 gap-3 sm:gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fg">
            {t('sessions.title')}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-fg-subtle">{t('sessions.description')}</p>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void refetch()}
                disabled={isFetching}
                aria-label={t('sessions.refresh')}
                className="touch-target"
              >
                <RefreshCw className={cn(isFetching && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('sessions.refresh')}</TooltipContent>
          </Tooltip>

          <ViewModeToggle value={view} onChange={setView} />
          <DensityToggle value={density} onChange={setDensity} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={filtered.length === 0}
                aria-label={t('sessions.exportAria')}
                data-testid="sessions-export"
                className="touch-target"
              >
                <Download />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={exportCsv} data-testid="sessions-export-csv">
                {t('sessions.exportCsv')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={exportJson} data-testid="sessions-export-json">
                {t('sessions.exportJson')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Toolbar — sticks to the top of the scroll container while a long
          session list scrolls underneath. */}
      <div className="sticky top-0 z-20 pb-3 mb-3 -mt-2 pt-2 bg-bg/85 backdrop-blur-xl border-b border-border flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented control, not tabs: filters the list by capture mode with
              no content panels, so a labelled aria-pressed button group avoids
              the invalid aria-controls that Radix Tabs would emit (WCAG 4.1.2). */}
          <div
            role="group"
            aria-label={t('sessions.viewFilterLabel')}
            className="inline-flex h-9 items-center gap-1 rounded-md bg-bg-muted p-1 text-fg-subtle"
          >
            {(
              [
                { value: 'record' as const, labelKey: 'sessions.tabRecorded' },
                { value: 'live' as const, labelKey: 'sessions.tabLive' },
              ] satisfies { value: SessionTab; labelKey: string }[]
            ).map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setTab(s.value)}
                aria-pressed={tab === s.value}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1 text-xs font-medium',
                  'transition-[color,background-color,box-shadow] duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-bg',
                  tab === s.value ? 'bg-surface text-fg shadow-xs' : 'hover:text-fg',
                )}
              >
                {s.value === 'live' ? (
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-live opacity-60 animate-ping" />
                    <span className="relative inline-flex size-2 rounded-full bg-live" />
                  </span>
                ) : (
                  <PlaySquare className="size-3.5" />
                )}
                {t(s.labelKey)}
              </button>
            ))}
          </div>

          <div className="order-3 sm:order-none w-full sm:flex-1 sm:min-w-[220px]">
            <div className="relative">
              <Input
                ref={searchInputRef}
                placeholder={
                  regexMode ? t('sessions.searchPlaceholderRegex') : t('sessions.searchPlaceholder')
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leadingIcon={<Search />}
                aria-invalid={regexError ? 'true' : undefined}
                trailingIcon={
                  <div className="flex items-center gap-0.5 pointer-events-auto">
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        aria-label={t('sessions.clearSearch')}
                        className="inline-flex items-center justify-center size-6 rounded text-fg-faint hover:text-fg"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setRegexMode((v) => !v)}
                          aria-pressed={regexMode}
                          aria-label={t('sessions.toggleRegex')}
                          className={cn(
                            'inline-flex items-center justify-center size-6 rounded transition-colors',
                            regexMode
                              ? 'bg-fg text-bg'
                              : 'text-fg-faint hover:text-fg hover:bg-bg-muted',
                          )}
                          data-testid="sessions-regex-toggle"
                        >
                          <Regex className="size-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {regexMode ? t('sessions.regexOn') : t('sessions.regexOff')}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                }
              />
              {regexError && (
                <p className="mt-1 text-[11px] text-danger" data-testid="sessions-regex-error">
                  {t('sessions.regexError', { message: regexError })}
                </p>
              )}
            </div>
          </div>

          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger aria-label={t('sessions.sortAria')} className="w-auto sm:min-w-[160px]">
              <span className="flex items-center gap-2">
                <SortIcon className="size-3.5 text-fg-subtle" />
                {/* Hide the long label on small screens; the icon already
                    communicates direction */}
                <span className="hidden sm:inline">
                  <SelectValue />
                </span>
                <span className="sm:hidden text-xs">{t('sessions.sort')}</span>
              </span>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABEL_KEYS) as SortKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {t(SORT_LABEL_KEYS[key])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <FilterChips
          duration={durationFilter}
          onDurationChange={setDurationFilter}
          age={ageFilter}
          onAgeChange={setAgeFilter}
          onClear={clearAllFilters}
          showClear={filtersActive}
        />

        <button
          type="button"
          onClick={() => setNoteOnly((v) => !v)}
          aria-pressed={noteOnly}
          data-testid="sessions-note-filter"
          className={cn(
            'h-7 px-2.5 rounded-full border text-xs font-medium transition-colors inline-flex items-center gap-1.5 shrink-0',
            noteOnly
              ? 'bg-fg text-bg border-fg'
              : 'bg-surface border-border text-fg-subtle hover:text-fg',
          )}
        >
          <StickyNote className="size-3.5" />
          {t('sessions.annotated')}
        </button>

        {hostCounts.length > 1 && (
          <HostChips hosts={hostCounts} active={hostFilter} onChange={setHostFilter} />
        )}

        {tagCounts.length > 0 && (
          <TopTagChips tags={tagCounts} active={tagFilter} onChange={setTagFilter} />
        )}
      </div>

      {filtersActive && (
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <span className="text-[11px] text-fg-faint uppercase tracking-wider font-semibold">
            {t('sessions.activeFilters')}
          </span>
          {search.trim() && (
            <FilterPill
              label={t(regexMode ? 'sessions.pillRegex' : 'sessions.pillSearch', {
                value: search.trim(),
              })}
              onRemove={() => setSearch('')}
            />
          )}
          {durationFilter !== 'all' && (
            <FilterPill
              label={t('sessions.pillDuration', {
                value:
                  durationFilter === 'short'
                    ? t('sessions.durationShort')
                    : durationFilter === 'medium'
                      ? t('sessions.durationMedium')
                      : t('sessions.durationLong'),
              })}
              onRemove={() => setDurationFilter('all')}
            />
          )}
          {ageFilter !== 'all' && (
            <FilterPill
              label={t('sessions.pillTime', { value: t(AGE_PILL_KEYS[ageFilter]) })}
              onRemove={() => setAgeFilter('all')}
            />
          )}
          {hostFilter && (
            <FilterPill
              label={t('sessions.pillHost', { value: hostFilter })}
              onRemove={() => setHostFilter(null)}
            />
          )}
          {tagFilter && (
            <FilterPill
              label={t('sessions.pillTag', { value: tagFilter })}
              onRemove={() => setTagFilter(null)}
            />
          )}
          {noteOnly && (
            <FilterPill label={t('sessions.pillAnnotated')} onRemove={() => setNoteOnly(false)} />
          )}
        </div>
      )}

      {/* Result meta */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-xs text-fg-subtle">
          {isLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <>
              <span className="font-medium text-fg">{filtered.length}</span>{' '}
              {t(filtered.length === 1 ? 'sessions.sessionWordOne' : 'sessions.sessionWordOther')}
              {filtersActive && (
                <>
                  {' '}
                  {t('sessions.matchingFilters')}{' '}
                  <span className="text-fg-faint">
                    {t('sessions.ofTotal', { value: sessions.length })}
                  </span>
                </>
              )}
            </>
          )}
        </div>

        {tab === 'record' && (
          <div className="flex items-center gap-1.5 text-[11px] text-fg-faint">
            <span className="hidden sm:inline">{t('sessions.perPage')}</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v) as PageSize)}
            >
              <SelectTrigger
                aria-label={t('sessions.perPageAria')}
                className="h-7 px-2 text-[11px] font-mono"
                data-testid="sessions-page-size"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {tab === 'live' && (
          <div className="flex items-center gap-1.5 text-[11px] text-fg-faint">
            <span className="hidden sm:inline">{t('sessions.refresh')}</span>
            <Select
              value={liveInterval}
              onValueChange={(v) => setLiveInterval(v as typeof liveInterval)}
            >
              <SelectTrigger
                aria-label={t('sessions.refreshIntervalAria')}
                className="h-7 px-2 text-[11px] font-mono"
                data-testid="sessions-live-interval"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5s">5s</SelectItem>
                <SelectItem value="15s">15s</SelectItem>
                <SelectItem value="30s">30s</SelectItem>
                <SelectItem value="off">{t('sessions.paused')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Body — render exactly one of table/grid based on the toggle. The
          table itself ships with `overflow-x-auto` plus a sticky session
          column (see `SessionTable`) so it stays usable on phones, while
          phones may still prefer the grid via the toggle. */}
      {error ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading ? (
        effectiveView === 'table' ? (
          <SessionTableSkeleton density={density} />
        ) : (
          <SessionGridSkeleton density={density} />
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={filtersActive ? t('sessions.emptyMatchTitle') : t('sessions.emptyTitle')}
          description={
            filtersActive ? t('sessions.emptyMatchDescription') : t('sessions.emptyDescription')
          }
          action={
            filtersActive ? (
              <Button variant="outline" onClick={clearAllFilters}>
                {t('sessions.clearFilters')}
              </Button>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button asChild variant="primary" size="sm">
                  <Link to="/sandbox/module">
                    <PlaySquare />
                    {t('sessions.openModuleSandbox')}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/sandbox/script">
                    <ExternalLink />
                    {t('sessions.scriptSdk')}
                  </Link>
                </Button>
              </div>
            )
          }
        />
      ) : (
        <>
          {(() => {
            const pinnedRows = filtered.filter((s) => pinned.has(s.id));
            const otherRows = filtered.filter((s) => !pinned.has(s.id));
            const renderBody = (rows: SessionRecord[]) =>
              effectiveView === 'table' ? (
                <SessionTable
                  sessions={rows}
                  tab={tab}
                  cursorIdx={cursorIdx - (rows === otherRows ? pinnedRows.length : 0)}
                  pinned={pinned}
                  onTogglePin={togglePin}
                  density={density}
                  onTagClick={setTagFilter}
                  activeTag={tagFilter}
                />
              ) : (
                <SessionGrid
                  sessions={rows}
                  tab={tab}
                  cursorIdx={cursorIdx - (rows === otherRows ? pinnedRows.length : 0)}
                  pinned={pinned}
                  onTogglePin={togglePin}
                  density={density}
                  onTagClick={setTagFilter}
                  activeTag={tagFilter}
                />
              );
            return (
              <div className="space-y-4">
                {pinnedRows.length > 0 && (
                  <section
                    aria-label={t('sessions.pinnedSessions')}
                    data-testid="sessions-pinned-group"
                  >
                    <h3 className="text-[10px] uppercase tracking-wider text-fg-faint font-semibold mb-2 inline-flex items-center gap-1.5">
                      <Pin className="size-3" />
                      {t('sessions.pinned')}
                      <span className="font-mono normal-case tracking-normal">
                        {pinnedRows.length}
                      </span>
                    </h3>
                    {renderBody(pinnedRows)}
                  </section>
                )}
                {renderBody(otherRows)}
              </div>
            );
          })()}
          {tab === 'record' && hasNextPage && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full sm:w-auto touch-target"
              >
                {isFetchingNextPage ? (
                  <>
                    <RefreshCw className="animate-spin" />
                    {t('sessions.loadingMore')}
                  </>
                ) : (
                  t('sessions.loadMore')
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ───────── Toolbar ───────── */

function SessionRowTagChip({
  tag,
  active,
  onClick,
}: {
  tag: string;
  active?: boolean;
  onClick?: (next: string | null) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.(active ? null : tag);
      }}
      aria-pressed={!!active}
      data-testid="session-tag-chip"
      className={cn(
        'inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-medium border transition-colors',
        active
          ? 'bg-fg text-bg border-fg'
          : 'bg-accent-soft text-accent-soft-fg border-accent-soft hover:border-border-strong',
      )}
    >
      {tag}
    </button>
  );
}

function DensityToggle({ value, onChange }: { value: Density; onChange: (next: Density) => void }) {
  const { t } = useTranslation();
  const next: Density = value === 'comfortable' ? 'compact' : 'comfortable';
  const isCompact = value === 'compact';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => onChange(next)}
          aria-pressed={isCompact}
          aria-label={isCompact ? t('sessions.densityComfortable') : t('sessions.densityCompact')}
          data-testid="sessions-density-toggle"
          className={cn(
            'inline-flex h-8 items-center gap-1 rounded-md border border-border bg-bg-muted px-2 text-[11px] font-medium transition-colors',
            isCompact ? 'bg-surface text-fg shadow-xs' : 'text-fg-subtle hover:text-fg',
          )}
        >
          {isCompact ? <Rows4 className="size-3.5" /> : <Rows3 className="size-3.5" />}
          <span className="hidden md:inline">
            {isCompact ? t('sessions.compact') : t('sessions.comfortable')}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {isCompact
          ? t('sessions.densityToggleToComfortable')
          : t('sessions.densityToggleToCompact')}
      </TooltipContent>
    </Tooltip>
  );
}

function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const { t } = useTranslation();
  return (
    <div
      role="radiogroup"
      aria-label={t('sessions.viewMode')}
      className="inline-flex h-8 items-center gap-0.5 rounded-md border border-border bg-bg-muted p-0.5"
    >
      <ViewToggleButton
        active={value === 'table'}
        onClick={() => onChange('table')}
        label={t('sessions.tableView')}
      >
        <TableIcon className="size-3.5" />
      </ViewToggleButton>
      <ViewToggleButton
        active={value === 'grid'}
        onClick={() => onChange('grid')}
        label={t('sessions.gridView')}
      >
        <LayoutGrid className="size-3.5" />
      </ViewToggleButton>
    </div>
  );
}

function ViewToggleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          role="radio"
          aria-checked={active}
          aria-label={label}
          onClick={onClick}
          className={cn(
            'size-7 rounded-sm flex items-center justify-center transition-colors',
            active ? 'bg-surface text-fg shadow-xs' : 'text-fg-subtle hover:text-fg',
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  const { t } = useTranslation();
  return (
    <span
      className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-accent-soft text-accent-soft-fg border border-accent-soft text-[11px] font-medium"
      data-testid="active-filter-pill"
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('sessions.removeFilter', { value: label })}
        className="inline-flex items-center justify-center size-3.5 rounded-full hover:bg-fg/10 text-current"
      >
        <X className="size-2.5" />
      </button>
    </span>
  );
}

function HostChips({
  hosts,
  active,
  onChange,
}: {
  hosts: [string, number][];
  active: string | null;
  onChange: (host: string | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="-mx-1 px-1 scroll-rail scroll-rail-fade sm:overflow-visible">
      <div className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap pb-0.5">
        <span className="inline-flex items-center gap-1 text-xs text-fg-faint mr-1 shrink-0">
          <Globe className="size-3" />
          {t('sessions.host')}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            'h-7 sm:h-6 px-2.5 sm:px-2 rounded-full border text-[12px] sm:text-[11px] font-medium transition-colors shrink-0',
            active === null
              ? 'bg-fg text-bg border-fg'
              : 'bg-surface border-border text-fg-subtle hover:border-border-strong hover:text-fg',
          )}
          aria-pressed={active === null}
        >
          {t('sessions.any')}
        </button>
        {hosts.map(([host, count]) => {
          const isActive = active === host;
          return (
            <button
              key={host}
              type="button"
              onClick={() => onChange(isActive ? null : host)}
              className={cn(
                'h-7 sm:h-6 px-2.5 sm:px-2 rounded-full border text-[12px] sm:text-[11px] font-medium transition-colors shrink-0 inline-flex items-center gap-1.5',
                isActive
                  ? 'bg-fg text-bg border-fg'
                  : 'bg-surface border-border text-fg-subtle hover:border-border-strong hover:text-fg',
              )}
              aria-pressed={isActive}
              data-testid={`sessions-host-chip-${host}`}
            >
              <span className="font-mono">{host}</span>
              <span
                className={cn(
                  'font-mono tabular-nums text-[10px]',
                  isActive ? 'text-bg/80' : 'text-fg-faint',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TopTagChips({
  tags,
  active,
  onChange,
}: {
  tags: [string, number][];
  active: string | null;
  onChange: (tag: string | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="-mx-1 px-1 scroll-rail scroll-rail-fade sm:overflow-visible"
      data-testid="sessions-tag-strip"
    >
      <div className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap pb-0.5">
        <span className="inline-flex items-center gap-1 text-xs text-fg-faint mr-1 shrink-0">
          <Tag className="size-3" />
          {t('sessions.tag')}
        </span>
        {tags.map(([tag, count]) => {
          const isActive = active === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(isActive ? null : tag)}
              className={cn(
                'h-7 sm:h-6 px-2.5 sm:px-2 rounded-full border text-[12px] sm:text-[11px] font-medium transition-colors shrink-0 inline-flex items-center gap-1.5',
                isActive
                  ? 'bg-fg text-bg border-fg'
                  : 'bg-accent-soft text-accent-soft-fg border-accent-soft hover:border-border-strong',
              )}
              aria-pressed={isActive}
              data-testid={`sessions-top-tag-${tag}`}
            >
              <span>{tag}</span>
              <span
                className={cn(
                  'font-mono tabular-nums text-[10px]',
                  isActive ? 'text-bg/80' : 'text-fg-faint',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilterChips({
  duration,
  onDurationChange,
  age,
  onAgeChange,
  onClear,
  showClear,
}: {
  duration: DurationFilter;
  onDurationChange: (v: DurationFilter) => void;
  age: AgeFilter;
  onAgeChange: (v: AgeFilter) => void;
  onClear: () => void;
  showClear: boolean;
}) {
  const { t } = useTranslation();
  const durationOptions: { value: DurationFilter; label: string }[] = [
    { value: 'all', label: t('sessions.durationAny') },
    { value: 'short', label: t('sessions.durationShort') },
    { value: 'medium', label: t('sessions.durationMedium') },
    { value: 'long', label: t('sessions.durationLong') },
  ];

  const ageOptions: { value: AgeFilter; label: string }[] = (
    Object.keys(AGE_CHIP_KEYS) as AgeFilter[]
  ).map((k) => ({
    value: k,
    label: t(AGE_CHIP_KEYS[k]),
  }));

  return (
    <div className="-mx-1 px-1 scroll-rail scroll-rail-fade sm:overflow-visible">
      <div className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap pb-0.5">
        <span className="inline-flex items-center gap-1 text-xs text-fg-faint mr-1 shrink-0">
          <Clock className="size-3" />
          {t('sessions.time')}
        </span>
        {ageOptions.map((opt) => {
          const active = age === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onAgeChange(opt.value)}
              className={cn(
                'h-7 sm:h-6 px-2.5 sm:px-2 rounded-full border text-[12px] sm:text-[11px] font-medium transition-colors shrink-0',
                active
                  ? 'bg-fg text-bg border-fg'
                  : 'bg-surface border-border text-fg-subtle hover:border-border-strong hover:text-fg',
              )}
              aria-pressed={active}
              data-testid={`sessions-age-chip-${opt.value}`}
            >
              {opt.label}
            </button>
          );
        })}
        <span className="inline-flex items-center gap-1 text-xs text-fg-faint mx-1 shrink-0">
          <Filter className="size-3" />
          {t('sessions.duration')}
        </span>
        {durationOptions.map((opt) => {
          const active = duration === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onDurationChange(opt.value)}
              className={cn(
                'h-7 sm:h-6 px-2.5 sm:px-2 rounded-full border text-[12px] sm:text-[11px] font-medium transition-colors shrink-0',
                active
                  ? 'bg-fg text-bg border-fg'
                  : 'bg-surface border-border text-fg-subtle hover:border-border-strong hover:text-fg',
              )}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
        {showClear && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="ml-1 h-7 sm:h-6 px-2 text-[11px] shrink-0"
          >
            <X className="size-3" />
            {t('sessions.clear')}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ───────── Table ───────── */

function SessionTable({
  sessions,
  tab,
  cursorIdx,
  pinned,
  onTogglePin,
  density,
  onTagClick,
  activeTag,
}: {
  sessions: SessionRecord[];
  tab: SessionTab;
  cursorIdx: number;
  pinned: Set<number>;
  onTogglePin: (id: number) => void;
  density: Density;
  onTagClick: (tag: string | null) => void;
  activeTag: string | null;
}) {
  const { t } = useTranslation();
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-subtle text-[11px] uppercase tracking-wider text-fg-faint">
              <Th className="w-[28px]">
                <span className="sr-only">{t('sessions.colStatus')}</span>
              </Th>
              <Th>{t('sessions.colSession')}</Th>
              <Th>{t('sessions.colUrl')}</Th>
              <Th>{t('sessions.colDevice')}</Th>
              <Th className="text-right">{t('sessions.colDuration')}</Th>
              <Th className="text-right">{t('sessions.colWhen')}</Th>
              <Th className="w-[100px] text-right">
                <span className="sr-only">{t('sessions.colActions')}</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session, idx) => (
              <SessionRow
                key={session.id}
                session={session}
                tab={tab}
                active={idx === cursorIdx}
                pinned={pinned.has(session.id)}
                onTogglePin={onTogglePin}
                density={density}
                onTagClick={onTagClick}
                activeTag={activeTag}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Th({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <th
      scope="col"
      className={cn('h-9 px-3 text-left font-semibold first:pl-4 last:pr-4', className)}
    >
      {children}
    </th>
  );
}

function SessionRow({
  session,
  tab,
  active,
  pinned,
  onTogglePin,
  density,
  onTagClick,
  activeTag,
}: {
  session: SessionRecord;
  tab: SessionTab;
  active?: boolean;
  pinned?: boolean;
  onTogglePin?: (id: number) => void;
  density: Density;
  onTagClick?: (tag: string | null) => void;
  activeTag?: string | null;
}) {
  const { t } = useTranslation();
  const isLive = tab === 'live';
  const isRecording = session.recordMode ?? !isLive;
  const cellY = density === 'compact' ? 'py-1.5' : 'py-3';

  return (
    <tr
      data-session-row={session.id}
      data-density={density}
      className={cn(
        'group border-b border-border last:border-0 hover:bg-bg-muted/40 transition-colors',
        active && 'bg-accent-soft/40',
      )}
    >
      <td className={cn('pl-4 pr-2 align-middle', cellY)}>
        <StatusDot isLive={isLive} isRecording={isRecording} />
      </td>
      <td className={cn('px-3 align-middle', cellY)}>
        <div className="flex flex-col min-w-0">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="font-medium text-fg truncate max-w-[280px]">
              {session.name || t('sessions.sessionFallbackName', { id: session.id })}
            </span>
            {session.hasNote && (
              <StickyNote
                className="size-3.5 text-fg-faint shrink-0"
                data-testid="session-note-indicator"
                aria-label={t('sessions.hasNote')}
              />
            )}
          </span>
          {density === 'comfortable' && (
            <span className="text-[11px] text-fg-faint">
              {t('sessions.idLabel')} {shortHash(String(session.id), 10)}
            </span>
          )}
          {density === 'comfortable' && session.tags && session.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {session.tags.map((t) => (
                <SessionRowTagChip key={t} tag={t} active={activeTag === t} onClick={onTagClick} />
              ))}
            </div>
          )}
        </div>
      </td>
      <td className={cn('px-3 align-middle', cellY)}>
        {session.url ? (
          <span className="font-mono text-xs text-fg-subtle truncate block max-w-[260px]">
            {session.url}
          </span>
        ) : (
          <span className="text-fg-faint">—</span>
        )}
      </td>
      <td className={cn('px-3 align-middle', cellY)}>
        {session.deviceId ? (
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs text-fg-subtle">
              <Smartphone className="size-3.5" />
              <span className="font-mono">{shortHash(session.deviceId, 12)}</span>
            </span>
            {density === 'comfortable' &&
              (() => {
                const badge = formatUserAgentBadge(session.userAgent);
                if (!badge) return null;
                return (
                  <span
                    className="text-[10px] text-fg-faint truncate"
                    data-testid="session-row-ua"
                    title={session.userAgent}
                  >
                    {badge}
                  </span>
                );
              })()}
          </div>
        ) : (
          <span className="text-fg-faint">—</span>
        )}
      </td>
      <td className={cn('px-3 align-middle text-right', cellY)}>
        <span className="font-mono text-xs text-fg-subtle">
          {formatDurationFromNanos(session.duration)}
        </span>
      </td>
      <td className={cn('px-3 align-middle text-right', cellY)}>
        <span className="text-xs text-fg-subtle">{formatTimeAgo(session.timestamp)}</span>
      </td>
      <td className={cn('pl-3 pr-4 align-middle text-right', cellY)}>
        <div className="inline-flex items-center gap-1">
          {onTogglePin && tab === 'record' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onTogglePin(session.id)}
                  aria-label={pinned ? t('sessions.unpinSession') : t('sessions.pinSession')}
                  aria-pressed={pinned}
                  data-testid="session-pin-button"
                  className={cn(
                    'transition-opacity',
                    pinned
                      ? 'opacity-100 text-fg'
                      : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-fg-subtle',
                  )}
                >
                  {pinned ? <Pin className="size-3.5" /> : <PinOff className="size-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{pinned ? t('sessions.unpin') : t('sessions.pin')}</TooltipContent>
            </Tooltip>
          )}
          <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            {tab === 'record' && <SessionRowCopyLink id={session.id} />}
            {tab === 'record' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="ghost" size="icon-sm">
                    <Link
                      to={`/sessions/${session.id}`}
                      aria-label={t('sessions.viewSessionDetails')}
                    >
                      <Activity className="size-3.5" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('sessions.detail')}</TooltipContent>
              </Tooltip>
            )}
            <DevToolsLinkButton
              variant="ghost"
              size="icon-sm"
              room={session.name}
              recordId={tab === 'record' ? session.id : undefined}
              label={t('sessions.openInDevTools')}
              title={t('sessions.openDevTools')}
            >
              <ExternalLink className="size-3.5" />
            </DevToolsLinkButton>
          </div>
        </div>
      </td>
    </tr>
  );
}

function SessionRowCopyLink({ id }: { id: number }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url =
      typeof window !== 'undefined'
        ? `${globalThis.location.origin}/sessions/${id}`
        : `/sessions/${id}`;
    try {
      await copyToClipboard(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success(t('sessions.linkCopied'));
    } catch {
      toast.error(t('sessions.copyFailed'));
    }
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={copy}
          aria-label={t('sessions.copySessionLink')}
          data-testid="session-copy-link"
        >
          {copied ? <Check className="size-3.5" /> : <LinkIcon className="size-3.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t('sessions.copyLink')}</TooltipContent>
    </Tooltip>
  );
}

function StatusDot({ isLive, isRecording }: { isLive: boolean; isRecording: boolean }) {
  const { t } = useTranslation();
  if (isLive) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-live opacity-50 animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-live" />
          </span>
        </TooltipTrigger>
        <TooltipContent>{t('sessions.liveNow')}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-block size-2 rounded-full',
            isRecording ? 'bg-fg-faint' : 'bg-success',
          )}
        />
      </TooltipTrigger>
      <TooltipContent>
        {isRecording ? t('sessions.recorded') : t('sessions.completed')}
      </TooltipContent>
    </Tooltip>
  );
}

/* ───────── Grid ───────── */

function SessionGrid({
  sessions,
  tab,
  cursorIdx,
  pinned,
  onTogglePin,
  density,
  onTagClick,
  activeTag,
}: {
  sessions: SessionRecord[];
  tab: SessionTab;
  cursorIdx: number;
  pinned: Set<number>;
  onTogglePin: (id: number) => void;
  density: Density;
  onTagClick: (tag: string | null) => void;
  activeTag: string | null;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
        density === 'compact' ? 'gap-1.5 sm:gap-2' : 'gap-2.5 sm:gap-3',
      )}
    >
      {sessions.map((session, idx) => (
        <SessionCard
          key={session.id}
          session={session}
          tab={tab}
          active={idx === cursorIdx}
          pinned={pinned.has(session.id)}
          onTogglePin={onTogglePin}
          density={density}
          onTagClick={onTagClick}
          activeTag={activeTag}
        />
      ))}
    </div>
  );
}

function SessionCard({
  session,
  tab,
  active,
  pinned,
  onTogglePin,
  density,
  onTagClick,
  activeTag,
}: {
  session: SessionRecord;
  tab: SessionTab;
  active?: boolean;
  pinned?: boolean;
  onTogglePin?: (id: number) => void;
  density: Density;
  onTagClick?: (tag: string | null) => void;
  activeTag?: string | null;
}) {
  const { t } = useTranslation();
  const isLive = tab === 'live';
  return (
    <Card
      data-session-row={session.id}
      data-density={density}
      className={cn(
        'group transition-all hover:border-border-strong hover:shadow-sm',
        density === 'compact' ? 'p-2 sm:p-2.5' : 'p-3.5 sm:p-4',
        active && 'border-accent ring-1 ring-accent',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot isLive={isLive} isRecording={session.recordMode ?? !isLive} />
          <span className="font-medium text-[15px] sm:text-sm text-fg truncate">
            {session.name || t('sessions.sessionFallbackName', { id: session.id })}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onTogglePin && tab === 'record' && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePin(session.id);
              }}
              aria-label={pinned ? t('sessions.unpinSession') : t('sessions.pinSession')}
              aria-pressed={pinned}
              data-testid="session-pin-button"
              className={cn(
                'inline-flex items-center justify-center size-6 rounded-md transition-opacity hover:bg-bg-muted',
                pinned
                  ? 'opacity-100 text-fg'
                  : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-fg-subtle',
              )}
            >
              {pinned ? <Pin className="size-3.5" /> : <PinOff className="size-3.5" />}
            </button>
          )}
          {isLive ? (
            <Badge variant="live" size="sm" className="gap-1">
              <RadioTower className="size-2.5" />
              {t('sessions.badgeLive')}
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm">
              {t('sessions.badgeRec')}
            </Badge>
          )}
        </div>
      </div>

      {session.url && (
        <p className="font-mono text-[11px] text-fg-faint truncate mb-3">{session.url}</p>
      )}

      {session.tags && session.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {session.tags.map((t) => (
            <SessionRowTagChip key={t} tag={t} active={activeTag === t} onClick={onTagClick} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] sm:text-xs text-fg-subtle">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          {formatDurationFromNanos(session.duration)}
        </span>
        {session.deviceId && (
          <span className="inline-flex items-center gap-1">
            <MonitorIcon className="size-3" />
            <span className="font-mono">{shortHash(session.deviceId, 10)}</span>
          </span>
        )}
        {(() => {
          const badge = formatUserAgentBadge(session.userAgent);
          if (!badge) return null;
          return (
            <span
              className="inline-flex items-center gap-1 text-fg-faint"
              data-testid="session-card-ua"
              title={session.userAgent}
            >
              {badge}
            </span>
          );
        })()}
        {session.timestamp && (
          <span className="ml-auto text-fg-faint">{formatTimeAgo(session.timestamp)}</span>
        )}
      </div>

      {/* Action row — full-width on mobile so thumbs hit easy targets */}
      <div className="flex gap-1.5 mt-3 pt-3 border-t border-border">
        {tab === 'record' && (
          <Button asChild variant="secondary" size="sm" className="flex-1 touch-target">
            <Link to={`/sessions/${session.id}`}>
              <Activity />
              {t('sessions.details')}
            </Link>
          </Button>
        )}
        <DevToolsLinkButton
          variant="outline"
          size="sm"
          className="flex-1 touch-target"
          room={session.name}
          recordId={tab === 'record' ? session.id : undefined}
        >
          <ExternalLink />
          {t('sessions.devtools')}
        </DevToolsLinkButton>
      </div>
    </Card>
  );
}

/* ───────── Skeletons / Error ───────── */

function SessionTableSkeleton({ density }: { density: Density }) {
  // Mirror SessionRow cell padding so the skeleton occupies the same row
  // height as loaded rows (no vertical layout shift on first paint).
  const cellY = density === 'compact' ? 'py-1.5' : 'py-3';
  return (
    <Card className="overflow-hidden p-0">
      <table className="w-full">
        <thead>
          {/* 7 columns, matching SessionTable's <thead>: status dot, Session,
              URL, Device, Duration, When, actions. */}
          <tr className="border-b border-border bg-bg-subtle">
            {Array.from({ length: 7 }).map((_, i) => (
              <th key={i} className="h-9 px-3" />
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className={cn('pl-4 pr-2', cellY)}>
                <Skeleton className="size-2 rounded-full" />
              </td>
              <td className={cn('px-3', cellY)}>
                {density === 'comfortable' ? (
                  <>
                    <Skeleton className="h-3.5 w-40 mb-1.5" />
                    <Skeleton className="h-2.5 w-20" />
                  </>
                ) : (
                  <Skeleton className="h-3.5 w-40" />
                )}
              </td>
              <td className={cn('px-3', cellY)}>
                <Skeleton className="h-3 w-48" />
              </td>
              <td className={cn('px-3', cellY)}>
                <Skeleton className="h-3 w-24" />
              </td>
              <td className={cn('px-3 text-right', cellY)}>
                <Skeleton className="h-3 w-12 ml-auto" />
              </td>
              <td className={cn('px-3 text-right', cellY)}>
                <Skeleton className="h-3 w-14 ml-auto" />
              </td>
              <td className={cn('pl-3 pr-4 text-right', cellY)}>
                <Skeleton className="h-3 w-16 ml-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function SessionGridSkeleton({ density }: { density: Density }) {
  // Mirror SessionGrid gap + SessionCard padding/structure so cards reserve
  // the same footprint as loaded cards (no layout shift).
  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
        density === 'compact' ? 'gap-1.5 sm:gap-2' : 'gap-2.5 sm:gap-3',
      )}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className={cn(density === 'compact' ? 'p-2 sm:p-2.5' : 'p-3.5 sm:p-4')}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-3 w-48 mb-3" />
          <Skeleton className="h-3 w-24" />
          <div className="flex gap-1.5 mt-3 pt-3 border-t border-border">
            <Skeleton className="h-8 w-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <Card className="border-danger/20 bg-danger-soft/20">
      <div className="flex flex-col items-center text-center py-12 px-6">
        <div className="size-10 rounded-full bg-danger-soft flex items-center justify-center mb-3">
          <X className="size-5 text-danger" />
        </div>
        <h3 className="text-sm font-semibold text-fg mb-1">{t('sessions.errorTitle')}</h3>
        <p className="text-sm text-fg-subtle max-w-sm mb-4">{t('sessions.errorDescription')}</p>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw />
          {t('sessions.tryAgain')}
        </Button>
      </div>
    </Card>
  );
}
