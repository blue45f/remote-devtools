import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Clock,
  ExternalLink,
  Filter,
  Globe,
  LayoutGrid,
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
  Table as TableIcon,
  Tag,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { apiFetch } from '@/lib/api';
import { formatUserAgentBadge } from '@/lib/user-agent';
import { DevToolsLinkButton } from '@/components/DevToolsLinkButton';
import { formatDurationFromNanos, formatTimeAgo, shortHash } from '@/lib/format';
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
}

type SessionTab = 'record' | 'live';
type SortKey = 'newest' | 'oldest' | 'name';
type ViewMode = 'table' | 'grid';
type Density = 'comfortable' | 'compact';

const DEFAULT_DENSITY: Density = 'comfortable';

type DurationFilter = 'all' | 'short' | 'medium' | 'long';
type AgeFilter = 'all' | '24h' | '7d' | '30d';

const AGE_LABELS: Record<AgeFilter, string> = {
  all: 'All time',
  '24h': 'Last 24h',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

const AGE_LIMITS_MS: Record<AgeFilter, number> = {
  all: 0,
  '24h': 24 * 3600 * 1000,
  '7d': 7 * 24 * 3600 * 1000,
  '30d': 30 * 24 * 3600 * 1000,
};

const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  name: 'Name A → Z',
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
  return window.innerWidth >= 1024 ? 'table' : 'grid';
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
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
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
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* quota or private-mode — best effort */
  }
}

const PINS_STORAGE_KEY = 'sessions-pins:v1';

function readPinnedIds(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(PINS_STORAGE_KEY);
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
    window.localStorage.setItem(PINS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* best effort */
  }
}

export default function SessionsPage() {
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
  }, [tab, search, sort, durationFilter, ageFilter, hostFilter, tagFilter]);

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
      return err instanceof Error ? err.message : 'Invalid pattern';
    }
  }, [regexMode, search]);

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
          (s.deviceId ? matcher(s.deviceId) : false),
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

    return [...result].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      const ta = new Date(a.timestamp ?? 0).getTime();
      const tb = new Date(b.timestamp ?? 0).getTime();
      return sort === 'newest' ? tb - ta : ta - tb;
    });
  }, [sessions, matcher, sort, durationFilter, ageFilter, hostFilter, tagFilter]);

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
    tagFilter !== null;

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
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
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
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fg">Sessions</h1>
          <p className="mt-1 text-xs sm:text-sm text-fg-subtle">
            Recorded and live debugging sessions across all devices.
          </p>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void refetch()}
                disabled={isFetching}
                aria-label="Refresh"
                className="touch-target"
              >
                <RefreshCw className={cn(isFetching && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>

          <ViewModeToggle value={view} onChange={setView} />
          <DensityToggle value={density} onChange={setDensity} />
        </div>
      </div>

      {/* Toolbar — sticks to the top of the scroll container while a long
          session list scrolls underneath. */}
      <div className="sticky top-0 z-20 pb-3 mb-3 -mt-2 pt-2 bg-bg/85 backdrop-blur-xl border-b border-border flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={tab} onValueChange={(v) => setTab(v as SessionTab)}>
            <TabsList>
              <TabsTrigger value="record" className="gap-1.5">
                <PlaySquare className="size-3.5" />
                Recorded
              </TabsTrigger>
              <TabsTrigger value="live" className="gap-1.5">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-live opacity-60 animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-live" />
                </span>
                Live
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="order-3 sm:order-none w-full sm:flex-1 sm:min-w-[220px]">
            <div className="relative">
              <Input
                placeholder={
                  regexMode
                    ? '/regex/ — match name, URL, or device'
                    : 'Search by name, URL, or device…'
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
                        aria-label="Clear search"
                        className="text-fg-faint hover:text-fg"
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
                          aria-label="Toggle regular-expression search"
                          className={cn(
                            'inline-flex items-center justify-center size-5 rounded transition-colors',
                            regexMode
                              ? 'bg-fg text-bg'
                              : 'text-fg-faint hover:text-fg hover:bg-bg-muted',
                          )}
                          data-testid="sessions-regex-toggle"
                        >
                          <Regex className="size-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{regexMode ? 'Regex on' : 'Regex off'}</TooltipContent>
                    </Tooltip>
                  </div>
                }
              />
              {regexError && (
                <p className="mt-1 text-[11px] text-danger" data-testid="sessions-regex-error">
                  Regex error: {regexError}
                </p>
              )}
            </div>
          </div>

          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-auto sm:min-w-[160px]">
              <span className="flex items-center gap-2">
                <SortIcon className="size-3.5 text-fg-subtle" />
                {/* Hide the long label on small screens; the icon already
                    communicates direction */}
                <span className="hidden sm:inline">
                  <SelectValue />
                </span>
                <span className="sm:hidden text-xs">Sort</span>
              </span>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_LABELS[key]}
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
          onClear={() => {
            setSearch('');
            setDurationFilter('all');
            setAgeFilter('all');
            setHostFilter(null);
            setTagFilter(null);
          }}
          showClear={filtersActive}
        />

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
            Active
          </span>
          {search.trim() && (
            <FilterPill
              label={`${regexMode ? 'regex' : 'search'}: "${search.trim()}"`}
              onRemove={() => setSearch('')}
            />
          )}
          {durationFilter !== 'all' && (
            <FilterPill
              label={`duration: ${
                durationFilter === 'short'
                  ? '< 30s'
                  : durationFilter === 'medium'
                    ? '30s – 5m'
                    : '> 5m'
              }`}
              onRemove={() => setDurationFilter('all')}
            />
          )}
          {ageFilter !== 'all' && (
            <FilterPill
              label={`time: ${AGE_LABELS[ageFilter].toLowerCase()}`}
              onRemove={() => setAgeFilter('all')}
            />
          )}
          {hostFilter && (
            <FilterPill label={`host: ${hostFilter}`} onRemove={() => setHostFilter(null)} />
          )}
          {tagFilter && (
            <FilterPill label={`tag: ${tagFilter}`} onRemove={() => setTagFilter(null)} />
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
              <span className="font-medium text-fg">{filtered.length}</span> session
              {filtered.length !== 1 && 's'}
              {filtersActive && (
                <>
                  {' '}
                  matching filters <span className="text-fg-faint">(of {sessions.length})</span>
                </>
              )}
            </>
          )}
        </div>

        {tab === 'record' && (
          <div className="flex items-center gap-1.5 text-[11px] text-fg-faint">
            <span className="hidden sm:inline">Per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v) as PageSize)}
            >
              <SelectTrigger
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
            <span className="hidden sm:inline">Refresh</span>
            <Select
              value={liveInterval}
              onValueChange={(v) => setLiveInterval(v as typeof liveInterval)}
            >
              <SelectTrigger
                className="h-7 px-2 text-[11px] font-mono"
                data-testid="sessions-live-interval"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5s">5s</SelectItem>
                <SelectItem value="15s">15s</SelectItem>
                <SelectItem value="30s">30s</SelectItem>
                <SelectItem value="off">Paused</SelectItem>
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
          <SessionTableSkeleton />
        ) : (
          <SessionGridSkeleton />
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={filtersActive ? 'No matches' : 'No sessions yet'}
          description={
            filtersActive
              ? 'Try clearing some filters or expanding the date range.'
              : 'Sessions will appear here as your SDK starts capturing traffic. The Module / Script sandbox pages generate live events to test the pipeline end-to-end.'
          }
          action={
            filtersActive ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setDurationFilter('all');
                  setAgeFilter('all');
                  setHostFilter(null);
                }}
              >
                Clear filters
              </Button>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button asChild variant="primary" size="sm">
                  <Link to="/sandbox/module">
                    <PlaySquare />
                    Open Module SDK sandbox
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/sandbox/script">
                    <ExternalLink />
                    Script SDK
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
                  <section aria-label="Pinned sessions" data-testid="sessions-pinned-group">
                    <h3 className="text-[10px] uppercase tracking-wider text-fg-faint font-semibold mb-2 inline-flex items-center gap-1.5">
                      <Pin className="size-3" />
                      Pinned
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
                    Loading…
                  </>
                ) : (
                  'Load more'
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
  const next: Density = value === 'comfortable' ? 'compact' : 'comfortable';
  const isCompact = value === 'compact';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => onChange(next)}
          aria-pressed={isCompact}
          aria-label={isCompact ? 'Comfortable density' : 'Compact density'}
          data-testid="sessions-density-toggle"
          className={cn(
            'inline-flex h-8 items-center gap-1 rounded-md border border-border bg-bg-muted px-2 text-[11px] font-medium transition-colors',
            isCompact ? 'bg-surface text-fg shadow-xs' : 'text-fg-subtle hover:text-fg',
          )}
        >
          {isCompact ? <Rows4 className="size-3.5" /> : <Rows3 className="size-3.5" />}
          <span className="hidden md:inline">{isCompact ? 'Compact' : 'Comfortable'}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        Toggle row density ({isCompact ? '→ comfortable' : '→ compact'})
      </TooltipContent>
    </Tooltip>
  );
}

function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      className="inline-flex h-8 items-center gap-0.5 rounded-md border border-border bg-bg-muted p-0.5"
    >
      <ViewToggleButton
        active={value === 'table'}
        onClick={() => onChange('table')}
        label="Table view"
      >
        <TableIcon className="size-3.5" />
      </ViewToggleButton>
      <ViewToggleButton
        active={value === 'grid'}
        onClick={() => onChange('grid')}
        label="Grid view"
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
  return (
    <span
      className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-accent-soft text-accent-soft-fg border border-accent-soft text-[11px] font-medium"
      data-testid="active-filter-pill"
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
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
  return (
    <div className="-mx-1 px-1 scroll-rail scroll-rail-fade sm:overflow-visible">
      <div className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap pb-0.5">
        <span className="inline-flex items-center gap-1 text-xs text-fg-faint mr-1 shrink-0">
          <Globe className="size-3" />
          Host
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
          Any
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
  return (
    <div
      className="-mx-1 px-1 scroll-rail scroll-rail-fade sm:overflow-visible"
      data-testid="sessions-tag-strip"
    >
      <div className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap pb-0.5">
        <span className="inline-flex items-center gap-1 text-xs text-fg-faint mr-1 shrink-0">
          <Tag className="size-3" />
          Tag
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
  const durationOptions: { value: DurationFilter; label: string }[] = [
    { value: 'all', label: 'Any duration' },
    { value: 'short', label: '< 30s' },
    { value: 'medium', label: '30s – 5m' },
    { value: 'long', label: '> 5m' },
  ];

  const ageOptions: { value: AgeFilter; label: string }[] = (
    Object.keys(AGE_LABELS) as AgeFilter[]
  ).map((k) => ({
    value: k,
    label: k === 'all' ? 'Any time' : AGE_LABELS[k].replace('Last ', ''),
  }));

  return (
    <div className="-mx-1 px-1 scroll-rail scroll-rail-fade sm:overflow-visible">
      <div className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap pb-0.5">
        <span className="inline-flex items-center gap-1 text-xs text-fg-faint mr-1 shrink-0">
          <Clock className="size-3" />
          Time
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
          Duration
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
            Clear
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
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-subtle text-[11px] uppercase tracking-wider text-fg-faint">
              <Th className="w-[28px]" />
              <Th>Session</Th>
              <Th>URL</Th>
              <Th>Device</Th>
              <Th className="text-right">Duration</Th>
              <Th className="text-right">When</Th>
              <Th className="w-[100px] text-right" />
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
          <span className="font-medium text-fg truncate max-w-[280px]">
            {session.name || `Session #${session.id}`}
          </span>
          {density === 'comfortable' && (
            <span className="text-[11px] text-fg-faint">
              ID {shortHash(String(session.id), 10)}
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
                  aria-label={pinned ? 'Unpin session' : 'Pin session'}
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
              <TooltipContent>{pinned ? 'Unpin' : 'Pin'}</TooltipContent>
            </Tooltip>
          )}
          <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            {tab === 'record' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="ghost" size="icon-sm">
                    <Link to={`/sessions/${session.id}`} aria-label="View session details">
                      <Activity className="size-3.5" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Detail</TooltipContent>
              </Tooltip>
            )}
            <DevToolsLinkButton
              variant="ghost"
              size="icon-sm"
              room={session.name}
              recordId={tab === 'record' ? session.id : undefined}
              label="Open in DevTools"
              title="Open DevTools"
            >
              <ExternalLink className="size-3.5" />
            </DevToolsLinkButton>
          </div>
        </div>
      </td>
    </tr>
  );
}

function StatusDot({ isLive, isRecording }: { isLive: boolean; isRecording: boolean }) {
  if (isLive) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-live opacity-50 animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-live" />
          </span>
        </TooltipTrigger>
        <TooltipContent>Live now</TooltipContent>
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
      <TooltipContent>{isRecording ? 'Recorded' : 'Completed'}</TooltipContent>
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
            {session.name || `Session #${session.id}`}
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
              aria-label={pinned ? 'Unpin session' : 'Pin session'}
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
              LIVE
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm">
              REC
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
              Details
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
          DevTools
        </DevToolsLinkButton>
      </div>
    </Card>
  );
}

/* ───────── Skeletons / Error ───────── */

function SessionTableSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-bg-subtle">
            {Array.from({ length: 6 }).map((_, i) => (
              <th key={i} className="h-9 px-3" />
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="pl-4 pr-2 py-3.5">
                <Skeleton className="size-2 rounded-full" />
              </td>
              <td className="px-3 py-3.5">
                <Skeleton className="h-3.5 w-40 mb-1.5" />
                <Skeleton className="h-2.5 w-20" />
              </td>
              <td className="px-3 py-3.5">
                <Skeleton className="h-3 w-48" />
              </td>
              <td className="px-3 py-3.5">
                <Skeleton className="h-3 w-24" />
              </td>
              <td className="px-3 py-3.5 text-right">
                <Skeleton className="h-3 w-12 ml-auto" />
              </td>
              <td className="pl-3 pr-4 py-3.5 text-right">
                <Skeleton className="h-3 w-16 ml-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function SessionGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-48 mb-4" />
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-8 w-full mt-3" />
        </Card>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-danger/20 bg-danger-soft/20">
      <div className="flex flex-col items-center text-center py-12 px-6">
        <div className="size-10 rounded-full bg-danger-soft flex items-center justify-center mb-3">
          <X className="size-5 text-danger" />
        </div>
        <h3 className="text-sm font-semibold text-fg mb-1">Failed to load sessions</h3>
        <p className="text-sm text-fg-subtle max-w-sm mb-4">
          The server didn't respond. Check your connection or try again.
        </p>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw />
          Try again
        </Button>
      </div>
    </Card>
  );
}
