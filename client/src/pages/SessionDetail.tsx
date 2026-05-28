import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  Bug,
  Calendar,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileJson,
  Globe,
  Hash,
  Layers,
  Link2,
  ListTree,
  Maximize2,
  Minimize2,
  PlayCircle,
  RadioTower,
  Smartphone,
  X,
  Zap,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

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
      : (raw.protocol?.timestamp ?? Number(raw.timestamp ?? 0));
  const data = raw.data ?? raw.protocol?.data;
  return { type, timestamp, data };
}

const EVENT_META: Record<number, { name: string; icon: typeof Activity }> = {
  0: { name: "DomLoaded", icon: Globe },
  1: { name: "PageLoaded", icon: Eye },
  2: { name: "FullSnapshot", icon: Layers },
  3: { name: "Incremental", icon: Activity },
  4: { name: "Meta", icon: FileJson },
  5: { name: "Custom", icon: Zap },
};

function getEventMeta(type: number) {
  return (
    EVENT_META[type] ?? {
      name: `Type-${type}`,
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
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep link to a specific moment in the replay: `?t=12345` (ms from
  // session start). Parity with PostHog / Sentry / Highlight.io share
  // links — pasting a URL with `?t=` should land the viewer right on
  // the moment that mattered.
  const initialReplayOffset = useMemo(() => {
    const raw = searchParams.get("t");
    if (!raw) return 0;
    const ms = Number.parseInt(raw, 10);
    return Number.isFinite(ms) && ms > 0 ? ms : 0;
  }, [searchParams]);

  const [tab, setTab] = useState<"overview" | "replay" | "timeline" | "raw">(
    initialReplayOffset > 0 ? "replay" : "overview",
  );

  // The rrweb-player drives this via the `onTimeUpdate` callback. We keep
  // it in a ref so the share button reads the latest value without making
  // every playhead tick re-render the page.
  const playheadMsRef = useRef<number>(initialReplayOffset);

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

  const rageClicks = useMemo(() => detectRageClicks(events), [events]);

  // All MouseInteraction "Click" coordinates (rrweb IncrementalSnapshot,
  // source=2, type=2). Streamed into SessionPreviewCard as overlay dots.
  const clickPoints = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    for (const e of events) {
      if (e.type !== 3) continue;
      const data = e.data as
        | { source?: number; type?: number; x?: number; y?: number }
        | undefined;
      if (data?.source !== 2 || data?.type !== 2) continue;
      if (typeof data.x !== "number" || typeof data.y !== "number") continue;
      out.push({ x: data.x, y: data.y });
    }
    return out;
  }, [events]);

  // First event's wall-clock timestamp anchors offset math for the
  // "Timeline → Jump to replay" flow. rrweb-player expects ms from
  // session start, not absolute epoch ms.
  const sessionStartMs = useMemo(
    () => events?.[0]?.timestamp ?? 0,
    [events],
  );

  const jumpToReplay = (offsetMs: number) => {
    const clamped = Math.max(0, Math.round(offsetMs));
    setTab("replay");
    // Replace, not push — we don't want every event click building up an
    // entry on the history stack.
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("t", String(clamped));
        return next;
      },
      { replace: true },
    );
    playheadMsRef.current = clamped;
  };

  return (
    <div className="safe-px py-5 sm:py-6 max-w-7xl mx-auto">
      {/* Back link */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 mb-3 sm:mb-4 text-fg-subtle hover:text-fg touch-target"
      >
        <Link to="/sessions">
          <ArrowLeft />
          All sessions
        </Link>
      </Button>

      {/* Header */}
      <SessionHeader id={id ?? ""} metadata={metadata} loading={metaLoading} />

      <Separator className="my-5 sm:my-6" />

      {/* Preview thumbnail + metric tiles side-by-side on wide screens.
          On phones the preview gets full width above the metric grid; metric
          tiles compress to a 2-col grid that handles 320px viewports. */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,260px)_1fr] mb-5 sm:mb-6">
        {id && (
          <SessionPreviewCard
            sessionId={id}
            className="lg:max-w-[260px] w-full"
            clickPoints={clickPoints}
          />
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 self-start">
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
              metaLoading ? null : formatDurationFromNanos(metadata?.duration)
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
            copy={metadata?.deviceId}
            copyToastLabel="Device ID copied"
          />
        </div>
      </div>

      {/* Tabs — horizontally scrollable on narrow screens with fading edges
          to hint at off-screen options without taking layout space. */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <div className="scroll-rail scroll-rail-fade -mx-1 px-1">
          <TabsList className="w-max">
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
                <Badge
                  variant="neutral"
                  size="sm"
                  className="ml-1 h-4 px-1 text-[10px]"
                >
                  {totalEvents}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="raw" className="gap-1.5">
              <FileJson className="size-3.5" />
              Raw JSON
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-5 space-y-4">
          {!eventsLoading && rageClicks.length > 0 && (
            <RageClickCard
              clicks={rageClicks}
              sessionStartMs={sessionStartMs}
              onJump={jumpToReplay}
            />
          )}
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
            <ReplayPanel
              events={events ?? []}
              sessionStartMs={sessionStartMs}
              initialReplayOffset={initialReplayOffset}
              playheadMsRef={playheadMsRef}
              onJumpToReplay={jumpToReplay}
            />
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-5">
          <TimelineTab
            events={events ?? []}
            loading={eventsLoading}
            sessionStartMs={sessionStartMs}
            onJumpToReplay={jumpToReplay}
          />
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
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 sm:gap-4">
      <div className="min-w-0">
        <CopyChip
          icon={<Hash className="size-3" />}
          label={`Session ${shortHash(id, 12)}`}
          value={id}
          toastLabel="Session ID copied"
          className="mb-1.5 sm:mb-2"
        />
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fg break-words">
          {loading ? (
            <Skeleton className="h-7 w-48 sm:w-72" />
          ) : (
            (metadata?.name ?? metadata?.room ?? `Session #${id}`)
          )}
        </h1>
        {(loading || metadata?.url) && (
          <div className="flex items-center gap-2 mt-2 max-w-2xl min-w-0">
            <Globe className="size-3.5 text-fg-faint shrink-0" />
            {loading ? (
              <Skeleton className="h-3.5 w-48 sm:w-96" />
            ) : (
              <a
                href={metadata?.url}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[11px] sm:text-xs text-fg-subtle hover:text-accent truncate min-w-0"
              >
                {metadata?.url}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Action cluster — wraps on tablet, stacks-then-grid on phone */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
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
              <Button asChild variant="outline" size="sm" className="touch-target">
                <a href={metadata.url} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  <span className="hidden xs:inline sm:inline">Open URL</span>
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
            className="touch-target"
            room={metadata?.name ?? metadata?.room ?? ""}
            recordId={metadata?.recordMode ? metadata.id : undefined}
            label="Open in DevTools"
            title="Inspect this session in the Chrome DevTools UI"
          >
            <Bug />
            <span className="hidden xs:inline sm:inline">Open DevTools</span>
            <span className="xs:hidden sm:hidden">DevTools</span>
          </DevToolsLinkButton>
        )}
      </div>
    </div>
  );
}

/* ───────── Replay panel (wraps player + minimap + share + fullscreen) ───────── */

interface ReplayPanelProps {
  events: ReplayEvent[];
  sessionStartMs: number;
  initialReplayOffset: number;
  playheadMsRef: React.MutableRefObject<number>;
  onJumpToReplay: (offsetMs: number) => void;
}

function ReplayPanel({
  events,
  sessionStartMs,
  initialReplayOffset,
  playheadMsRef,
  onJumpToReplay,
}: ReplayPanelProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenSupported =
    typeof document !== "undefined" &&
    typeof document.fullscreenEnabled === "boolean"
      ? document.fullscreenEnabled
      : false;

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    const el = wrapperRef.current;
    if (!el || !fullscreenSupported) return;
    if (document.fullscreenElement === el) {
      void document.exitFullscreen().catch(() => {
        /* user gesture lost, ignore */
      });
    } else {
      void el.requestFullscreen().catch(() => {
        /* user gesture lost, ignore */
      });
    }
  };

  // `F` toggles fullscreen unless typing into an input
  useEffect(() => {
    if (!fullscreenSupported) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "f" && e.key !== "F") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      toggleFullscreen();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // toggleFullscreen reads fresh refs each call — safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreenSupported]);

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "space-y-3",
        // Inside fullscreen the wrapper IS the viewport, so paint a
        // background and give it interior padding so the player isn't
        // glued to the screen edges.
        isFullscreen && "bg-bg p-4 sm:p-6 overflow-auto",
      )}
    >
      <div className="flex items-center justify-end gap-2">
        {fullscreenSupported && (
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            aria-pressed={isFullscreen}
            data-testid="replay-fullscreen"
          >
            {isFullscreen ? <Minimize2 /> : <Maximize2 />}
            <span className="hidden sm:inline">
              {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            </span>
          </Button>
        )}
        <ShareReplayLinkButton playheadMsRef={playheadMsRef} />
      </div>
      <ReplayMinimap
        events={events}
        sessionStartMs={sessionStartMs}
        onSeek={onJumpToReplay}
      />
      <Suspense
        fallback={
          <Card className="p-6">
            <Skeleton className="h-[420px] w-full" />
          </Card>
        }
      >
        <ReplayPlayer
          events={events as unknown[]}
          startTime={initialReplayOffset}
          onTimeUpdate={(ms) => {
            playheadMsRef.current = ms;
          }}
        />
      </Suspense>
    </div>
  );
}

/* ───────── Frustration signals ───────── */

interface RageClickGroup {
  startMs: number;
  endMs: number;
  count: number;
  x: number;
  y: number;
}

interface IncrementalClick {
  timestamp: number;
  x: number;
  y: number;
}

/**
 * Detects rage-clicks per FullStory's / Microsoft Clarity's definition:
 * three or more clicks landed within a small spatial radius and a tight
 * time window, indicating a user repeatedly hammering on something that
 * isn't responding.
 *
 * rrweb encodes mouse interactions as IncrementalSnapshot (type 3) with
 * `data.source === 2` and `data.type === 2` (Click). We pull those out,
 * then walk the list with a sliding window.
 */
export function detectRageClicks(
  events: ReplayEvent[],
  {
    windowMs = 1500,
    radiusPx = 50,
    minCount = 3,
  }: { windowMs?: number; radiusPx?: number; minCount?: number } = {},
): RageClickGroup[] {
  const clicks: IncrementalClick[] = [];
  for (const e of events) {
    if (e.type !== 3) continue;
    const data = e.data as
      | { source?: number; type?: number; x?: number; y?: number }
      | undefined;
    if (data?.source !== 2 || data?.type !== 2) continue;
    if (typeof data.x !== "number" || typeof data.y !== "number") continue;
    clicks.push({ timestamp: e.timestamp, x: data.x, y: data.y });
  }
  if (clicks.length < minCount) return [];

  const groups: RageClickGroup[] = [];
  for (let i = 0; i < clicks.length; i++) {
    const anchor = clicks[i];
    let count = 1;
    let last = i;
    for (let j = i + 1; j < clicks.length; j++) {
      const c = clicks[j];
      if (c.timestamp - anchor.timestamp > windowMs) break;
      const dx = c.x - anchor.x;
      const dy = c.y - anchor.y;
      if (Math.hypot(dx, dy) > radiusPx) continue;
      count += 1;
      last = j;
    }
    if (count >= minCount) {
      groups.push({
        startMs: anchor.timestamp,
        endMs: clicks[last].timestamp,
        count,
        x: anchor.x,
        y: anchor.y,
      });
      // Skip past the clicks we just consumed so a single rage burst
      // doesn't surface as N overlapping groups.
      i = last;
    }
  }

  return groups;
}

function RageClickCard({
  clicks,
  sessionStartMs,
  onJump,
}: {
  clicks: RageClickGroup[];
  sessionStartMs: number;
  onJump: (offsetMs: number) => void;
}) {
  return (
    <Card
      className="p-4 border-warning/40 bg-warning-soft/30"
      data-testid="rage-click-card"
    >
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-md bg-warning-soft text-warning flex items-center justify-center shrink-0">
          <Zap className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-fg">
            {clicks.length === 1
              ? "1 rage-click moment detected"
              : `${clicks.length} rage-click moments detected`}
          </h3>
          <p className="text-xs text-fg-subtle mt-0.5">
            User clicked rapidly in the same spot — often a sign of an
            unresponsive button.
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {clicks.slice(0, 5).map((c, idx) => {
              const offsetMs = Math.max(0, c.startMs - sessionStartMs);
              return (
                <li key={`${c.startMs}-${idx}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onJump(offsetMs)}
                    className="h-7 px-2.5 text-xs"
                    data-testid="rage-click-jump"
                  >
                    <PlayCircle className="size-3" />
                    {formatPlayhead(offsetMs)}
                    <span className="ml-1 text-[10px] text-fg-faint font-mono">
                      ×{c.count}
                    </span>
                  </Button>
                </li>
              );
            })}
            {clicks.length > 5 && (
              <li className="text-[11px] text-fg-faint self-center">
                +{clicks.length - 5} more
              </li>
            )}
          </ul>
        </div>
      </div>
    </Card>
  );
}

/* ───────── Replay minimap ───────── */

/**
 * A thin density bar above the rrweb player. Each pixel column on the bar
 * is a bucket of session time; the column's opacity scales with the event
 * count that falls in that bucket. Clicking the bar seeks the player to
 * the matching offset.
 *
 * Why: parity with OpenReplay / FullStory, where a quick visual of where
 * activity happens in a long session is essential triage. Without it the
 * player's own controller only shows current position, not where the
 * action is.
 */
function ReplayMinimap({
  events,
  sessionStartMs,
  onSeek,
}: {
  events: ReplayEvent[];
  sessionStartMs: number;
  onSeek: (offsetMs: number) => void;
}) {
  const BUCKETS = 96;

  const { buckets, totalMs } = useMemo(() => {
    if (events.length === 0) return { buckets: [] as number[], totalMs: 0 };
    const start = sessionStartMs;
    const end = events[events.length - 1].timestamp;
    const span = Math.max(1, end - start);
    const arr = new Array<number>(BUCKETS).fill(0);
    for (const e of events) {
      const ratio = (e.timestamp - start) / span;
      const idx = Math.min(
        BUCKETS - 1,
        Math.max(0, Math.floor(ratio * BUCKETS)),
      );
      arr[idx] += 1;
    }
    return { buckets: arr, totalMs: span };
  }, [events, sessionStartMs]);

  if (events.length === 0 || totalMs === 0) return null;

  const max = buckets.reduce((m, n) => (n > m ? n : m), 0) || 1;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(
      1,
      Math.max(0, (e.clientX - rect.left) / rect.width),
    );
    onSeek(Math.round(ratio * totalMs));
  };

  return (
    <Card className="p-2.5">
      <div className="flex items-center justify-between mb-1.5 text-[10px] uppercase tracking-wider text-fg-faint font-semibold">
        <span>Activity</span>
        <span className="text-fg-faint normal-case tracking-normal">
          Click to seek
        </span>
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Replay activity minimap — click to seek"
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSeek(totalMs / 2);
          }
        }}
        className="flex h-10 items-end gap-px cursor-pointer rounded-sm overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="replay-minimap"
      >
        {buckets.map((count, i) => {
          const intensity = count / max;
          // Always render at least a thin sliver so the bar reads as a
          // continuous strip even where no events landed.
          const heightPct = count === 0 ? 6 : 12 + intensity * 88;
          return (
            <span
              key={i}
              aria-hidden
              className="flex-1 rounded-sm bg-fg transition-colors"
              style={{
                height: `${heightPct}%`,
                opacity: count === 0 ? 0.12 : 0.25 + intensity * 0.65,
              }}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-1 text-[10px] text-fg-faint font-mono tabular-nums">
        <span>0:00</span>
        <span>{formatPlayhead(totalMs)}</span>
      </div>
    </Card>
  );
}

/* ───────── Share replay deep link ───────── */

function ShareReplayLinkButton({
  playheadMsRef,
}: {
  playheadMsRef: React.MutableRefObject<number>;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const playhead = Math.max(0, Math.round(playheadMsRef.current));
    const base =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}`
        : "";
    const url = playhead > 0 ? `${base}?t=${playhead}` : base;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      toast.success("Share link copied", {
        description:
          playhead > 0
            ? `Opens the replay at ${formatPlayhead(playhead)}.`
            : "Opens the replay from the beginning.",
      });
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => void copy()}
      data-testid="share-replay-link"
    >
      <Link2 />
      {copied ? "Copied" : "Share link to current time"}
    </Button>
  );
}

function formatPlayhead(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ───────── Metric tile ───────── */

function MetricTile({
  icon: Icon,
  label,
  value,
  mono,
  copy,
  copyToastLabel,
}: {
  icon: typeof Activity;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  /** Optional raw value to copy when the tile's copy chip is clicked. */
  copy?: string;
  copyToastLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!copy) return;
    try {
      await navigator.clipboard.writeText(copy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      if (copyToastLabel) toast.success(copyToastLabel);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <Card className="group p-4 relative">
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
      {copy && (
        <button
          type="button"
          onClick={() => void onCopy()}
          aria-label={copyToastLabel ?? `Copy ${label.toLowerCase()}`}
          className={cn(
            "absolute top-2 right-2 size-6 inline-flex items-center justify-center rounded-md",
            "text-fg-faint hover:text-fg hover:bg-bg-muted",
            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity",
          )}
        >
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </button>
      )}
    </Card>
  );
}

/* ───────── Copy chip ───────── */

function CopyChip({
  icon,
  label,
  value,
  toastLabel,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  toastLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      toast.success(toastLabel);
    } catch {
      toast.error("Failed to copy");
    }
  };
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      data-testid="copy-chip"
      className={cn(
        "group inline-flex items-center gap-2 text-[11px] sm:text-xs text-fg-faint hover:text-fg transition-colors",
        className,
      )}
    >
      {icon}
      <span>{label}</span>
      {copied ? (
        <Check className="size-3 text-success" />
      ) : (
        <Copy className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
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
  sessionStartMs,
  onJumpToReplay,
}: {
  events: ReplayEvent[];
  loading: boolean;
  sessionStartMs: number;
  onJumpToReplay: (offsetMs: number) => void;
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
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-[220px_1fr]">
      {/* Filter region.
          On desktop: full sidebar with type list.
          On mobile/tablet: search bar + horizontal chip rail. */}
      <aside className="space-y-3 min-w-0">
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
        {/* Desktop list */}
        <div className="hidden lg:block">
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

        {/* Mobile chip rail */}
        <div className="lg:hidden -mx-1 px-1 scroll-rail scroll-rail-fade">
          <div className="flex items-center gap-1.5 pb-0.5">
            <FilterChip
              active={activeType === null}
              onClick={() => setActiveType(null)}
              label="All"
              count={events.length}
            />
            {types.map((t) => {
              const meta = getEventMeta(t);
              const count = events.filter((e) => e.type === t).length;
              const Icon = meta.icon;
              return (
                <FilterChip
                  key={t}
                  active={activeType === t}
                  onClick={() => setActiveType(t)}
                  label={meta.name}
                  count={count}
                  icon={<Icon className="size-3" />}
                />
              );
            })}
          </div>
        </div>
      </aside>

      {/* Timeline */}
      <Card className="p-0 overflow-hidden min-w-0">
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
        <VirtualEventList
          events={filtered}
          sessionStartMs={sessionStartMs}
          onJumpToReplay={onJumpToReplay}
          highlight={search}
        />
      </Card>
    </div>
  );
}

function FilterChip({
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
        "h-7 px-2.5 rounded-full border text-[12px] font-medium shrink-0",
        "inline-flex items-center gap-1.5 transition-colors",
        active
          ? "bg-fg text-bg border-fg"
          : "bg-surface border-border text-fg-subtle hover:border-border-strong hover:text-fg",
      )}
      aria-pressed={active}
    >
      {icon}
      <span>{label}</span>
      <span
        className={cn(
          "font-mono tabular-nums text-[10px]",
          active ? "text-bg/80" : "text-fg-faint",
        )}
      >
        {count}
      </span>
    </button>
  );
}

/**
 * Virtual scroller for the event list. Renders only the rows currently in view
 * so a session with thousands of events stays smooth and bounded in memory.
 */
function VirtualEventList({
  events,
  sessionStartMs,
  onJumpToReplay,
  highlight,
}: {
  events: ReplayEvent[];
  sessionStartMs: number;
  onJumpToReplay: (offsetMs: number) => void;
  highlight?: string;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36, // px per row, matches py-2 + 24px content
    overscan: 12,
  });

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] sm:h-[360px] text-xs text-fg-subtle">
        No events match the current filters.
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[min(60vh,480px)] sm:h-[min(65vh,520px)] overflow-auto"
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
          const offsetMs = Math.max(0, event.timestamp - sessionStartMs);
          return (
            <li
              key={virtualRow.key}
              className="absolute left-0 right-0 border-b border-border"
              style={{
                top: 0,
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <button
                type="button"
                onClick={() => onJumpToReplay(offsetMs)}
                className="group flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-bg-muted/50 focus-visible:bg-bg-muted/50 focus-visible:outline-none transition-colors"
                title="Jump to this point in the replay"
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
                  {highlightText(meta.name, highlight)}
                </span>
                <span className="font-mono text-[11px] text-fg-faint flex-1 truncate">
                  {formatTimestampWithMillis(event.timestamp)}
                </span>
                <PlayCircle className="size-3.5 text-fg-faint opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Wraps each case-insensitive match of `query` inside `text` with a `<mark>`
 * tinted via design tokens. Returns plain text when query is empty/missing
 * and falls back to plain text if the regex compilation fails.
 *
 * Uses `split` with a capturing group, then identifies match segments by
 * `toLowerCase()` equality against the trimmed query rather than re-running
 * the regex (which is stateful with the `g` flag and unsafe after split).
 */
function highlightText(text: string, query?: string) {
  if (!query) return text;
  const trimmed = query.trim();
  if (!trimmed) return text;

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let re: RegExp;
  try {
    re = new RegExp(`(${escaped})`, "ig");
  } catch {
    return text;
  }

  const needle = trimmed.toLowerCase();
  const parts = text.split(re);
  return parts.map((part, i) =>
    part.toLowerCase() === needle ? (
      <mark
        key={i}
        className="bg-warning-soft text-fg rounded px-0.5"
        data-testid="event-highlight"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
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
  const { id } = useParams<{ id: string }>();
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

  const download = () => {
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `session-${id ?? "events"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Defer revocation by a tick so Safari has the URL when it queues the
      // download request.
      setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success("Download started", {
        description: `${events.length} events · ${(json.length / 1024).toFixed(
          1,
        )} kB`,
      });
    } catch {
      toast.error("Failed to download");
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
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-bg-subtle">
        <span className="text-[11px] uppercase tracking-wider text-fg-faint font-semibold truncate">
          {events.length} events · {(json.length / 1024).toFixed(1)} kB
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={download}
            data-testid="raw-download"
          >
            <Download />
            <span className="hidden xs:inline sm:inline">Download</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void copy()}>
            <Copy />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      <ScrollArea className="h-[min(65vh,520px)]">
        <pre className="p-3 sm:p-4 font-mono text-[11px] leading-relaxed text-fg-subtle whitespace-pre-wrap break-all">
          {json}
        </pre>
      </ScrollArea>
    </Card>
  );
}
