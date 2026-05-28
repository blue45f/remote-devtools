import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
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
  Monitor,
  PlaySquare,
  RadioTower,
  Regex,
  RefreshCw,
  Search,
  Smartphone,
  Table as TableIcon,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api";
import { DevToolsLinkButton } from "@/components/DevToolsLinkButton";
import {
  formatDurationFromNanos,
  formatTimeAgo,
  shortHash,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface SessionRecord {
  id: number;
  name: string;
  url?: string;
  deviceId?: string;
  duration?: string | number;
  recordMode?: boolean;
  timestamp?: string;
}

type SessionTab = "record" | "live";
type SortKey = "newest" | "oldest" | "name";
type ViewMode = "table" | "grid";

type DurationFilter = "all" | "short" | "medium" | "long";

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  name: "Name A → Z",
};

const SORT_ICONS: Record<SortKey, typeof ArrowDown> = {
  newest: ArrowDown,
  oldest: ArrowUp,
  name: ArrowUpDown,
};

type PaginatedRecordResponse =
  | SessionRecord[]
  | { rows: SessionRecord[]; nextCursor: string | null };

const PAGE_SIZE = 50;

/**
 * Pick the default view for the user's viewport. Below `lg` the table needs
 * horizontal scroll on a phone, while the grid is purpose-built for that
 * width. Users can still flip back via the toggle — we just don't drop
 * them into the worse default. `window` is safe to reach in a Vite SPA;
 * during SSR / first paint we fall back to the desktop default.
 */
function pickDefaultView(): ViewMode {
  if (typeof window === "undefined") return "table";
  return window.innerWidth >= 1024 ? "table" : "grid";
}

function getHostname(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const PREFS_STORAGE_KEY = "sessions-prefs:v1";

interface SessionsPrefs {
  view?: ViewMode;
  sort?: SortKey;
}

function readStoredPrefs(): SessionsPrefs {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SessionsPrefs;
    // Defend against future-version garbage by only allowing known values.
    const view: ViewMode | undefined =
      parsed.view === "table" || parsed.view === "grid" ? parsed.view : undefined;
    const sort: SortKey | undefined =
      parsed.sort === "newest" || parsed.sort === "oldest" || parsed.sort === "name"
        ? parsed.sort
        : undefined;
    return { view, sort };
  } catch {
    return {};
  }
}

function persistPrefs(prefs: SessionsPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* quota or private-mode — best effort */
  }
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<SessionTab>("record");
  const [search, setSearch] = useState("");
  const [regexMode, setRegexMode] = useState(false);
  const [sort, setSort] = useState<SortKey>(() => readStoredPrefs().sort ?? "newest");
  const [view, setView] = useState<ViewMode>(
    () => readStoredPrefs().view ?? pickDefaultView(),
  );
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("all");
  const [hostFilter, setHostFilter] = useState<string | null>(null);
  // Index of the currently-focused row in the filtered list. -1 means
  // "no row selected" — the cursor reveals only after the user presses
  // a navigation key so it doesn't visually compete with the toolbar.
  const [cursorIdx, setCursorIdx] = useState<number>(-1);

  // Persist view+sort whenever they change so the next visit reopens
  // with the same shape. Search, host, duration are intentionally NOT
  // persisted — they're query-bound state, not preferences.
  useEffect(() => {
    persistPrefs({ view, sort });
  }, [view, sort]);

  // Reset the cursor whenever the filter result changes — the row at
  // cursorIdx might not exist any more.
  useEffect(() => {
    setCursorIdx(-1);
  }, [tab, search, sort, durationFilter, hostFilter]);

  // Compile the search query into a matcher once per change. Invalid regex
  // patterns fall back to plain-substring matching so the user never gets
  // an empty result list just from a half-typed `(foo`.
  const matcher = useMemo<((value: string) => boolean) | null>(() => {
    const trimmed = search.trim();
    if (!trimmed) return null;

    if (regexMode) {
      try {
        const re = new RegExp(trimmed, "i");
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
      return err instanceof Error ? err.message : "Invalid pattern";
    }
  }, [regexMode, search]);

  // Debounce the search term that gets sent to the server. The local input
  // updates instantly so the field stays responsive.
  const [debouncedSearch, setDebouncedSearch] = useState("");
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
    queryKey: ["sessions", tab, debouncedSearch],
    queryFn: async ({ pageParam }) => {
      if (tab === "live") {
        const live = await apiFetch<SessionRecord[]>("/sessions");
        return { rows: live, nextCursor: null as string | null };
      }
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (debouncedSearch || pageParam) params.set("limit", String(PAGE_SIZE));
      if (pageParam) params.set("cursor", pageParam);
      const qs = params.toString();
      const path = qs ? `/sessions/record?${qs}` : "/sessions/record";
      const res = await apiFetch<PaginatedRecordResponse>(path);
      if (Array.isArray(res)) return { rows: res, nextCursor: null };
      return res;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    refetchInterval: tab === "live" ? 5000 : false,
  });

  const sessions = useMemo<SessionRecord[]>(
    () => data?.pages.flatMap((p) => p.rows) ?? [],
    [data],
  );

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

    if (durationFilter !== "all") {
      result = result.filter((s) => {
        const ms = Number(s.duration || 0) / 1_000_000;
        if (durationFilter === "short") return ms > 0 && ms < 30_000;
        if (durationFilter === "medium") return ms >= 30_000 && ms < 300_000;
        return ms >= 300_000;
      });
    }

    if (hostFilter) {
      result = result.filter((s) => getHostname(s.url) === hostFilter);
    }

    return [...result].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const ta = new Date(a.timestamp ?? 0).getTime();
      const tb = new Date(b.timestamp ?? 0).getTime();
      return sort === "newest" ? tb - ta : ta - tb;
    });
  }, [sessions, matcher, sort, durationFilter, hostFilter]);

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

  const filtersActive =
    search.trim() !== "" || durationFilter !== "all" || hostFilter !== null;

  // Keyboard nav: j/↓ next, k/↑ prev, Enter opens detail. Ignored
  // while typing in inputs, while modifier keys are held, and while
  // live tab is active (the live tab has no detail route).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
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
            if (id == null) return;
            const el = document.querySelector<HTMLElement>(
              `[data-session-row="${id}"]`,
            );
            el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          });
          return clamped;
        });
      };

      switch (e.key) {
        case "j":
        case "ArrowDown":
          move(1);
          return;
        case "k":
        case "ArrowUp":
          move(-1);
          return;
        case "Enter": {
          if (tab !== "record") return;
          if (cursorIdx < 0) return;
          const id = filtered[cursorIdx]?.id;
          if (id == null) return;
          e.preventDefault();
          navigate(`/sessions/${id}`);
          return;
        }
        default:
          return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
            Sessions
          </h1>
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
                <RefreshCw className={cn(isFetching && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>

          <ViewModeToggle value={view} onChange={setView} />
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
                    ? "/regex/ — match name, URL, or device"
                    : "Search by name, URL, or device…"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leadingIcon={<Search />}
                aria-invalid={regexError ? "true" : undefined}
                trailingIcon={
                  <div className="flex items-center gap-0.5 pointer-events-auto">
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
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
                            "inline-flex items-center justify-center size-5 rounded transition-colors",
                            regexMode
                              ? "bg-fg text-bg"
                              : "text-fg-faint hover:text-fg hover:bg-bg-muted",
                          )}
                          data-testid="sessions-regex-toggle"
                        >
                          <Regex className="size-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {regexMode ? "Regex on" : "Regex off"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                }
              />
              {regexError && (
                <p
                  className="mt-1 text-[11px] text-danger"
                  data-testid="sessions-regex-error"
                >
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
          onClear={() => {
            setSearch("");
            setDurationFilter("all");
            setHostFilter(null);
          }}
          showClear={filtersActive}
        />

        {hostCounts.length > 1 && (
          <HostChips
            hosts={hostCounts}
            active={hostFilter}
            onChange={setHostFilter}
          />
        )}
      </div>

      {/* Result meta */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-fg-subtle">
          {isLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <>
              <span className="font-medium text-fg">{filtered.length}</span>{" "}
              session{filtered.length !== 1 && "s"}
              {filtersActive && (
                <>
                  {" "}
                  matching filters{" "}
                  <span className="text-fg-faint">(of {sessions.length})</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Body — render exactly one of table/grid based on the toggle. The
          table itself ships with `overflow-x-auto` plus a sticky session
          column (see `SessionTable`) so it stays usable on phones, while
          phones may still prefer the grid via the toggle. */}
      {error ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading ? (
        effectiveView === "table" ? (
          <SessionTableSkeleton />
        ) : (
          <SessionGridSkeleton />
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={filtersActive ? "No matches" : "No sessions yet"}
          description={
            filtersActive
              ? "Try clearing some filters or expanding the date range."
              : "Sessions will appear here as your SDK starts capturing traffic."
          }
          action={
            filtersActive ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setDurationFilter("all");
                }}
              >
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          {effectiveView === "table" ? (
            <SessionTable
              sessions={filtered}
              tab={tab}
              cursorIdx={cursorIdx}
            />
          ) : (
            <SessionGrid
              sessions={filtered}
              tab={tab}
              cursorIdx={cursorIdx}
            />
          )}
          {tab === "record" && hasNextPage && (
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
                  "Load more"
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

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      className="inline-flex h-8 items-center gap-0.5 rounded-md border border-border bg-bg-muted p-0.5"
    >
      <ViewToggleButton
        active={value === "table"}
        onClick={() => onChange("table")}
        label="Table view"
      >
        <TableIcon className="size-3.5" />
      </ViewToggleButton>
      <ViewToggleButton
        active={value === "grid"}
        onClick={() => onChange("grid")}
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
            "size-7 rounded-sm flex items-center justify-center transition-colors",
            active
              ? "bg-surface text-fg shadow-xs"
              : "text-fg-subtle hover:text-fg",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
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
            "h-7 sm:h-6 px-2.5 sm:px-2 rounded-full border text-[12px] sm:text-[11px] font-medium transition-colors shrink-0",
            active === null
              ? "bg-fg text-bg border-fg"
              : "bg-surface border-border text-fg-subtle hover:border-border-strong hover:text-fg",
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
                "h-7 sm:h-6 px-2.5 sm:px-2 rounded-full border text-[12px] sm:text-[11px] font-medium transition-colors shrink-0 inline-flex items-center gap-1.5",
                isActive
                  ? "bg-fg text-bg border-fg"
                  : "bg-surface border-border text-fg-subtle hover:border-border-strong hover:text-fg",
              )}
              aria-pressed={isActive}
              data-testid={`sessions-host-chip-${host}`}
            >
              <span className="font-mono">{host}</span>
              <span
                className={cn(
                  "font-mono tabular-nums text-[10px]",
                  isActive ? "text-bg/80" : "text-fg-faint",
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
  onClear,
  showClear,
}: {
  duration: DurationFilter;
  onDurationChange: (v: DurationFilter) => void;
  onClear: () => void;
  showClear: boolean;
}) {
  const options: { value: DurationFilter; label: string }[] = [
    { value: "all", label: "Any duration" },
    { value: "short", label: "< 30s" },
    { value: "medium", label: "30s – 5m" },
    { value: "long", label: "> 5m" },
  ];

  return (
    <div className="-mx-1 px-1 scroll-rail scroll-rail-fade sm:overflow-visible">
      <div className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap pb-0.5">
        <span className="inline-flex items-center gap-1 text-xs text-fg-faint mr-1 shrink-0">
          <Filter className="size-3" />
          Duration
        </span>
        {options.map((opt) => {
          const active = duration === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onDurationChange(opt.value)}
              className={cn(
                "h-7 sm:h-6 px-2.5 sm:px-2 rounded-full border text-[12px] sm:text-[11px] font-medium transition-colors shrink-0",
                active
                  ? "bg-fg text-bg border-fg"
                  : "bg-surface border-border text-fg-subtle hover:border-border-strong hover:text-fg",
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
}: {
  sessions: SessionRecord[];
  tab: SessionTab;
  cursorIdx: number;
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
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Th({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "h-9 px-3 text-left font-semibold first:pl-4 last:pr-4",
        className,
      )}
    >
      {children}
    </th>
  );
}

function SessionRow({
  session,
  tab,
  active,
}: {
  session: SessionRecord;
  tab: SessionTab;
  active?: boolean;
}) {
  const isLive = tab === "live";
  const isRecording = session.recordMode ?? !isLive;

  return (
    <tr
      data-session-row={session.id}
      className={cn(
        "group border-b border-border last:border-0 hover:bg-bg-muted/40 transition-colors",
        active && "bg-accent-soft/40",
      )}>
      <td className="pl-4 pr-2 py-3 align-middle">
        <StatusDot isLive={isLive} isRecording={isRecording} />
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-fg truncate max-w-[280px]">
            {session.name || `Session #${session.id}`}
          </span>
          <span className="text-[11px] text-fg-faint">
            ID {shortHash(String(session.id), 10)}
          </span>
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        {session.url ? (
          <span className="font-mono text-xs text-fg-subtle truncate block max-w-[260px]">
            {session.url}
          </span>
        ) : (
          <span className="text-fg-faint">—</span>
        )}
      </td>
      <td className="px-3 py-3 align-middle">
        {session.deviceId ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-fg-subtle">
            <Smartphone className="size-3.5" />
            <span className="font-mono">{shortHash(session.deviceId, 12)}</span>
          </span>
        ) : (
          <span className="text-fg-faint">—</span>
        )}
      </td>
      <td className="px-3 py-3 align-middle text-right">
        <span className="font-mono text-xs text-fg-subtle">
          {formatDurationFromNanos(session.duration)}
        </span>
      </td>
      <td className="px-3 py-3 align-middle text-right">
        <span className="text-xs text-fg-subtle">
          {formatTimeAgo(session.timestamp)}
        </span>
      </td>
      <td className="pl-3 pr-4 py-3 align-middle text-right">
        <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          {tab === "record" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="ghost" size="icon-sm">
                  <Link
                    to={`/sessions/${session.id}`}
                    aria-label="View session details"
                  >
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
            recordId={tab === "record" ? session.id : undefined}
            label="Open in DevTools"
            title="Open DevTools"
          >
            <ExternalLink className="size-3.5" />
          </DevToolsLinkButton>
        </div>
      </td>
    </tr>
  );
}

function StatusDot({
  isLive,
  isRecording,
}: {
  isLive: boolean;
  isRecording: boolean;
}) {
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
            "inline-block size-2 rounded-full",
            isRecording ? "bg-fg-faint" : "bg-success",
          )}
        />
      </TooltipTrigger>
      <TooltipContent>{isRecording ? "Recorded" : "Completed"}</TooltipContent>
    </Tooltip>
  );
}

/* ───────── Grid ───────── */

function SessionGrid({
  sessions,
  tab,
  cursorIdx,
}: {
  sessions: SessionRecord[];
  tab: SessionTab;
  cursorIdx: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
      {sessions.map((session, idx) => (
        <SessionCard
          key={session.id}
          session={session}
          tab={tab}
          active={idx === cursorIdx}
        />
      ))}
    </div>
  );
}

function SessionCard({
  session,
  tab,
  active,
}: {
  session: SessionRecord;
  tab: SessionTab;
  active?: boolean;
}) {
  const isLive = tab === "live";
  return (
    <Card
      data-session-row={session.id}
      className={cn(
        "group p-3.5 sm:p-4 transition-all hover:border-border-strong hover:shadow-sm",
        active && "border-accent ring-1 ring-accent",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot
            isLive={isLive}
            isRecording={session.recordMode ?? !isLive}
          />
          <span className="font-medium text-[15px] sm:text-sm text-fg truncate">
            {session.name || `Session #${session.id}`}
          </span>
        </div>
        {isLive ? (
          <Badge variant="live" size="sm" className="gap-1 shrink-0">
            <RadioTower className="size-2.5" />
            LIVE
          </Badge>
        ) : (
          <Badge variant="neutral" size="sm" className="shrink-0">
            REC
          </Badge>
        )}
      </div>

      {session.url && (
        <p className="font-mono text-[11px] text-fg-faint truncate mb-3">
          {session.url}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] sm:text-xs text-fg-subtle">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          {formatDurationFromNanos(session.duration)}
        </span>
        {session.deviceId && (
          <span className="inline-flex items-center gap-1">
            <Monitor className="size-3" />
            <span className="font-mono">{shortHash(session.deviceId, 10)}</span>
          </span>
        )}
        {session.timestamp && (
          <span className="ml-auto text-fg-faint">
            {formatTimeAgo(session.timestamp)}
          </span>
        )}
      </div>

      {/* Action row — full-width on mobile so thumbs hit easy targets */}
      <div className="flex gap-1.5 mt-3 pt-3 border-t border-border">
        {tab === "record" && (
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
          recordId={tab === "record" ? session.id : undefined}
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
        <h3 className="text-sm font-semibold text-fg mb-1">
          Failed to load sessions
        </h3>
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
