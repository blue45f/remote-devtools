import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Clock,
  ExternalLink,
  Filter,
  LayoutGrid,
  Monitor,
  PlaySquare,
  RadioTower,
  RefreshCw,
  Search,
  Smartphone,
  Table as TableIcon,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

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
import { formatDurationFromNanos, formatTimeAgo, shortHash } from "@/lib/format";
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

export default function SessionsPage() {
  const [tab, setTab] = useState<SessionTab>("record");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<ViewMode>("table");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("all");

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

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.url?.toLowerCase().includes(q) ||
          s.deviceId?.toLowerCase().includes(q),
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

    return [...result].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const ta = new Date(a.timestamp ?? 0).getTime();
      const tb = new Date(b.timestamp ?? 0).getTime();
      return sort === "newest" ? tb - ta : ta - tb;
    });
  }, [sessions, search, sort, durationFilter]);

  const filtersActive = search.trim() !== "" || durationFilter !== "all";
  const SortIcon = SORT_ICONS[sort];

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Sessions
          </h1>
          <p className="mt-1 text-sm text-fg-subtle">
            Recorded and live debugging sessions across all devices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void refetch()}
                disabled={isFetching}
                aria-label="Refresh"
              >
                <RefreshCw className={cn(isFetching && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>

          <ViewModeToggle value={view} onChange={setView} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-4">
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

          <div className="flex-1 min-w-[220px]">
            <Input
              placeholder="Search by name, URL, or device…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leadingIcon={<Search />}
              trailingIcon={
                search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="text-fg-faint hover:text-fg pointer-events-auto"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : (
                  <Kbd>/</Kbd>
                )
              }
            />
          </div>

          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-auto min-w-[160px]">
              <span className="flex items-center gap-2">
                <SortIcon className="size-3.5 text-fg-subtle" />
                <SelectValue />
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
          }}
          showClear={filtersActive}
        />
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
                  <span className="text-fg-faint">
                    (of {sessions.length})
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Body */}
      {error ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading ? (
        view === "table" ? (
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
          {view === "table" ? (
            <SessionTable sessions={filtered} tab={tab} />
          ) : (
            <SessionGrid sessions={filtered} tab={tab} />
          )}
          {tab === "record" && hasNextPage && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
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
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="inline-flex items-center gap-1 text-xs text-fg-faint mr-1">
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
              "h-6 px-2 rounded-full border text-[11px] font-medium transition-colors",
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
          className="ml-1 h-6 px-2 text-[11px]"
        >
          <X className="size-3" />
          Clear
        </Button>
      )}
    </div>
  );
}

/* ───────── Table ───────── */

function SessionTable({
  sessions,
  tab,
}: {
  sessions: SessionRecord[];
  tab: SessionTab;
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
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} tab={tab} />
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
}: {
  session: SessionRecord;
  tab: SessionTab;
}) {
  const isLive = tab === "live";
  const isRecording = session.recordMode ?? !isLive;

  return (
    <tr className="group border-b border-border last:border-0 hover:bg-bg-muted/40 transition-colors">
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
        <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
      <TooltipContent>
        {isRecording ? "Recorded" : "Completed"}
      </TooltipContent>
    </Tooltip>
  );
}

/* ───────── Grid ───────── */

function SessionGrid({
  sessions,
  tab,
}: {
  sessions: SessionRecord[];
  tab: SessionTab;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} tab={tab} />
      ))}
    </div>
  );
}

function SessionCard({
  session,
  tab,
}: {
  session: SessionRecord;
  tab: SessionTab;
}) {
  const isLive = tab === "live";
  return (
    <Card className="group p-4 transition-all hover:border-border-strong hover:shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot
            isLive={isLive}
            isRecording={session.recordMode ?? !isLive}
          />
          <span className="font-medium text-sm text-fg truncate">
            {session.name || `Session #${session.id}`}
          </span>
        </div>
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

      {session.url && (
        <p className="font-mono text-[11px] text-fg-faint truncate mb-3">
          {session.url}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
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

      <div className="flex gap-1.5 mt-3 pt-3 border-t border-border">
        {tab === "record" && (
          <Button asChild variant="secondary" size="sm" className="flex-1">
            <Link to={`/sessions/${session.id}`}>
              <Activity />
              Details
            </Link>
          </Button>
        )}
        <DevToolsLinkButton
          variant="outline"
          size="sm"
          className="flex-1"
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

