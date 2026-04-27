import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  Bug,
  Calendar,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileJson,
  Globe,
  Hash,
  Layers,
  ListTree,
  PlayCircle,
  RadioTower,
  Smartphone,
  X,
  Zap,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { SessionPreviewCard } from "@/components/replay/SessionPreviewCard";

const ReplayPlayer = lazy(() =>
  import("@/components/replay/ReplayPlayer").then((m) => ({
    default: m.ReplayPlayer,
  })),
);

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api";
import { DevToolsLinkButton } from "@/components/DevToolsLinkButton";
import { formatDurationFromNanos, shortHash } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SessionMetadata {
  id: number;
  name?: string;
  /** Legacy alias retained for backward compatibility with seed responses. */
  room?: string;
  deviceId?: string;
  url?: string;
  duration?: number;
  recordMode?: boolean;
  createdAt?: string;
  eventCount?: number;
}

/**
 * Frontend-facing replay event shape.
 *
 * Both demo seed data and the internal backend now return rrweb events with
 * `type`, `timestamp`, and `data` at the top level (the backend was flattened
 * in `session-replay.service.ts`). `normaliseEvent` only falls back to the
 * older `protocol.{type,data,timestamp}` envelope when running against a
 * legacy API that hasn't shipped the flatten change.
 */
interface ReplayEvent {
  type: number;
  timestamp: number;
  data?: unknown;
}

interface RawEvent {
  type?: number;
  timestamp?: number | string;
  data?: unknown;
  protocol?: {
    type?: number;
    timestamp?: number;
    data?: unknown;
  };
  isRRWeb?: boolean;
}

function normaliseEvent(raw: RawEvent): ReplayEvent {
  const type = raw.type ?? raw.protocol?.type ?? 0;
  const timestamp =
    typeof raw.timestamp === "number"
      ? raw.timestamp
      : raw.protocol?.timestamp ?? Number(raw.timestamp ?? 0);
  const data = raw.data ?? raw.protocol?.data;
  return { type, timestamp, data };
}

const EVENT_META: Record<
  number,
  { name: string; tone: "neutral" | "accent" | "success" | "warning"; icon: typeof Activity }
> = {
  0: { name: "DomLoaded", tone: "accent", icon: Globe },
  1: { name: "PageLoaded", tone: "accent", icon: Eye },
  2: { name: "FullSnapshot", tone: "warning", icon: Layers },
  3: { name: "Incremental", tone: "neutral", icon: Activity },
  4: { name: "Meta", tone: "success", icon: FileJson },
  5: { name: "Custom", tone: "warning", icon: Zap },
};

function getEventMeta(type: number) {
  return (
    EVENT_META[type] ?? {
      name: `Type-${type}`,
      tone: "neutral" as const,
      icon: Activity,
    }
  );
}

function formatTimestampWithMillis(ts: number) {
  const d = new Date(ts);
  const time = d.toLocaleTimeString(undefined, { hour12: false });
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${time}.${ms}`;
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<"overview" | "replay" | "timeline" | "raw">(
    "overview",
  );

  const { data: metadata, isLoading: metaLoading } = useQuery({
    queryKey: ["session-metadata", id],
    queryFn: () =>
      apiFetch<SessionMetadata>(`/api/session-replay/sessions/${id}`),
    enabled: !!id,
  });

  const { data: rawEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["session-events", id],
    queryFn: () =>
      apiFetch<RawEvent[]>(`/api/session-replay/sessions/${id}/events`),
    enabled: !!id,
  });

  const events = useMemo<ReplayEvent[]>(
    () => (rawEvents ?? []).map(normaliseEvent),
    [rawEvents],
  );

  const eventTypeCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const e of events ?? []) {
      counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [events]);

  const totalEvents = events?.length ?? 0;

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* Back link */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 mb-4 text-fg-subtle hover:text-fg"
      >
        <Link to="/sessions">
          <ArrowLeft />
          All sessions
        </Link>
      </Button>

      {/* Header */}
      <SessionHeader
        id={id ?? ""}
        metadata={metadata}
        loading={metaLoading}
      />

      <Separator className="my-6" />

      {/* Preview thumbnail + metric tiles side-by-side on wide screens */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_1fr] mb-6">
        {id && (
          <SessionPreviewCard
            sessionId={id}
            className="lg:max-w-[260px] w-full"
          />
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 self-start">
          <MetricTile
            icon={Layers}
            label="Total events"
            value={
              metaLoading || eventsLoading ? null : totalEvents.toLocaleString()
            }
          />
          <MetricTile
            icon={Clock}
            label="Duration"
            value={
              metaLoading
                ? null
                : formatDurationFromNanos(metadata?.duration)
            }
          />
          <MetricTile
            icon={Calendar}
            label="Started"
            value={
              metaLoading
                ? null
                : metadata?.createdAt
                  ? new Date(metadata.createdAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "—"
            }
          />
          <MetricTile
            icon={Smartphone}
            label="Device"
            value={metaLoading ? null : shortHash(metadata?.deviceId, 14)}
            mono
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <Activity className="size-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="replay" className="gap-1.5">
            <PlayCircle className="size-3.5" />
            Replay
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5">
            <ListTree className="size-3.5" />
            Timeline
            {totalEvents > 0 && (
              <Badge variant="neutral" size="sm" className="ml-1 h-4 px-1 text-[10px]">
                {totalEvents}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="raw" className="gap-1.5">
            <FileJson className="size-3.5" />
            Raw JSON
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <OverviewTab
            loading={eventsLoading}
            counts={eventTypeCounts}
            total={totalEvents}
          />
        </TabsContent>

        <TabsContent value="replay" className="mt-5">
          {eventsLoading ? (
            <Card className="p-6">
              <Skeleton className="h-[420px] w-full" />
            </Card>
          ) : (
            <Suspense
              fallback={
                <Card className="p-6">
                  <Skeleton className="h-[420px] w-full" />
                </Card>
              }
            >
              <ReplayPlayer events={(events ?? []) as unknown[]} />
            </Suspense>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-5">
          <TimelineTab events={events ?? []} loading={eventsLoading} />
        </TabsContent>

        <TabsContent value="raw" className="mt-5">
          <RawTab events={events ?? []} loading={eventsLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ───────── Header ───────── */

function SessionHeader({
  id,
  metadata,
  loading,
}: {
  id: string;
  metadata?: SessionMetadata;
  loading: boolean;
}) {
  const isRecording = metadata?.recordMode;
  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs text-fg-faint mb-2">
          <Hash className="size-3" />
          Session {shortHash(id, 12)}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          {loading ? (
            <Skeleton className="h-7 w-72" />
          ) : (
            metadata?.name ?? metadata?.room ?? `Session #${id}`
          )}
        </h1>
        {(loading || metadata?.url) && (
          <div className="flex items-center gap-2 mt-2 max-w-2xl">
            <Globe className="size-3.5 text-fg-faint shrink-0" />
            {loading ? (
              <Skeleton className="h-3.5 w-96" />
            ) : (
              <a
                href={metadata?.url}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-fg-subtle hover:text-accent truncate"
              >
                {metadata?.url}
              </a>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {loading ? (
          <Skeleton className="h-6 w-20" />
        ) : isRecording !== undefined ? (
          isRecording ? (
            <Badge variant="live" className="gap-1">
              <RadioTower className="size-3 animate-pulse-dot" />
              Recording
            </Badge>
          ) : (
            <Badge variant="success">Completed</Badge>
          )
        ) : null}

        {metadata?.url && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="outline" size="sm">
                <a href={metadata.url} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  Open URL
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open captured URL</TooltipContent>
          </Tooltip>
        )}

        {(metadata?.name || metadata?.room) && (
          <DevToolsLinkButton
            variant="primary"
            size="sm"
            room={metadata?.name ?? metadata?.room ?? ""}
            recordId={metadata?.recordMode ? metadata.id : undefined}
            label="Open in DevTools"
            title="Inspect this session in the Chrome DevTools UI"
          >
            <Bug />
            Open DevTools
          </DevToolsLinkButton>
        )}
      </div>
    </div>
  );
}

/* ───────── Metric tile ───────── */

function MetricTile({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Activity;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-fg-faint mb-1.5">
        <Icon className="size-3.5" />
        <span className="text-[11px] uppercase tracking-wider font-semibold">
          {label}
        </span>
      </div>
      {value === null ? (
        <Skeleton className="h-6 w-20" />
      ) : (
        <div
          className={cn(
            "text-base font-semibold text-fg truncate",
            mono && "font-mono",
          )}
        >
          {value}
        </div>
      )}
    </Card>
  );
}

/* ───────── Overview tab ───────── */

function OverviewTab({
  loading,
  counts,
  total,
}: {
  loading: boolean;
  counts: [number, number][];
  total: number;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-6 w-12" />
          </Card>
        ))}
      </div>
    );
  }

  if (total === 0) {
    return (
      <Card>
        <EmptyState
          icon={Activity}
          title="No events recorded"
          description="This session captured no replay events."
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {counts.map(([type, count]) => {
        const meta = getEventMeta(type);
        const Icon = meta.icon;
        const percentage = (count / total) * 100;
        return (
          <Card key={type} className="p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="size-7 rounded-md bg-bg-muted border border-border flex items-center justify-center">
                <Icon className="size-3.5 text-fg-subtle" />
              </div>
              <span className="text-sm font-medium text-fg flex-1">
                {meta.name}
              </span>
              <span className="font-mono text-base font-semibold text-fg tabular-nums">
                {count.toLocaleString()}
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-bg-muted overflow-hidden">
              <div
                className="h-full bg-fg rounded-full transition-[width] duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="mt-1.5 text-[11px] text-fg-faint tabular-nums">
              {percentage.toFixed(1)}% of total
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ───────── Timeline tab ───────── */

function TimelineTab({
  events,
  loading,
}: {
  events: ReplayEvent[];
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<number | null>(null);

  const types = useMemo(() => {
    const set = new Set<number>();
    events.forEach((e) => set.add(e.type));
    return Array.from(set).sort((a, b) => a - b);
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (activeType !== null && e.type !== activeType) return false;
      if (search) {
        const meta = getEventMeta(e.type);
        const match =
          meta.name.toLowerCase().includes(search.toLowerCase()) ||
          String(e.timestamp).includes(search);
        if (!match) return false;
      }
      return true;
    });
  }, [events, activeType, search]);

  if (loading) {
    return (
      <Card className="p-3 space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <Skeleton className="size-6 rounded-md" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24 ml-auto" />
          </div>
        ))}
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={ListTree}
          title="Empty timeline"
          description="No events were captured for this session."
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      {/* Sidebar filter */}
      <aside className="space-y-3">
        <Input
          placeholder="Filter events…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leadingIcon={<Activity />}
          trailingIcon={
            search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear filter"
              >
                <X className="size-3.5" />
              </button>
            ) : undefined
          }
        />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-fg-faint font-semibold mb-1.5 px-1">
            Type
          </div>
          <ul className="space-y-0.5">
            <li>
              <FilterRow
                active={activeType === null}
                onClick={() => setActiveType(null)}
                label="All types"
                count={events.length}
              />
            </li>
            {types.map((t) => {
              const meta = getEventMeta(t);
              const count = events.filter((e) => e.type === t).length;
              const Icon = meta.icon;
              return (
                <li key={t}>
                  <FilterRow
                    active={activeType === t}
                    onClick={() => setActiveType(t)}
                    label={meta.name}
                    count={count}
                    icon={<Icon className="size-3.5" />}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* Timeline */}
      <Card className="p-0 overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-bg-subtle text-[11px] uppercase tracking-wider text-fg-faint flex items-center justify-between">
          <span>
            <span className="font-medium text-fg-subtle">
              {filtered.length}
            </span>{" "}
            events
            {filtered.length !== events.length && (
              <span className="text-fg-faint ml-1">(of {events.length})</span>
            )}
          </span>
        </div>
        <VirtualEventList events={filtered} />
      </Card>
    </div>
  );
}

/**
 * Virtual scroller for the event list. Renders only the rows currently in view
 * so a session with thousands of events stays smooth and bounded in memory.
 */
function VirtualEventList({ events }: { events: ReplayEvent[] }) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36, // px per row, matches py-2 + 24px content
    overscan: 12,
  });

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-[360px] text-xs text-fg-subtle">
        No events match the current filters.
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[480px] overflow-auto"
      data-testid="timeline-virtual-scroll"
    >
      <ol
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const event = events[virtualRow.index];
          const meta = getEventMeta(event.type);
          const Icon = meta.icon;
          return (
            <li
              key={virtualRow.key}
              className="group absolute left-0 right-0 flex items-center gap-3 px-3 py-2 border-b border-border hover:bg-bg-muted/50 transition-colors"
              style={{
                top: 0,
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <span className="w-10 shrink-0 text-right text-[10px] text-fg-faint font-mono tabular-nums">
                {virtualRow.index + 1}
              </span>
              <span
                className={cn(
                  "size-6 shrink-0 rounded-md border flex items-center justify-center",
                  "border-border bg-bg-muted text-fg-subtle",
                )}
              >
                <Icon className="size-3" />
              </span>
              <span className="text-xs font-medium text-fg min-w-[110px]">
                {meta.name}
              </span>
              <span className="font-mono text-[11px] text-fg-faint flex-1 truncate">
                {formatTimestampWithMillis(event.timestamp)}
              </span>
              <ChevronRight className="size-3.5 text-fg-faint opacity-0 group-hover:opacity-100 transition-opacity" />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function FilterRow({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
        active
          ? "bg-bg-muted text-fg"
          : "text-fg-subtle hover:bg-bg-muted/60 hover:text-fg",
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      <span className="font-mono tabular-nums text-fg-faint">{count}</span>
    </button>
  );
}

/* ───────── Raw tab ───────── */

function RawTab({
  events,
  loading,
}: {
  events: ReplayEvent[];
  loading: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const json = useMemo(() => JSON.stringify(events, null, 2), [events]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Copied to clipboard", {
        description: `${events.length} events`,
      });
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-96 w-full" />
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <EmptyState icon={FileJson} title="No data" />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-subtle">
        <span className="text-[11px] uppercase tracking-wider text-fg-faint font-semibold">
          {events.length} events · {(json.length / 1024).toFixed(1)} kB
        </span>
        <Button variant="ghost" size="sm" onClick={() => void copy()}>
          <Copy />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <ScrollArea className="h-[520px]">
        <pre className="p-4 font-mono text-[11px] leading-relaxed text-fg-subtle whitespace-pre-wrap break-all">
          {json}
        </pre>
      </ScrollArea>
    </Card>
  );
}
