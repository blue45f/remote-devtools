import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bug,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Circle,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FastForward,
  FileJson,
  FileText,
  Globe,
  Hash,
  Layers,
  Lightbulb,
  Link2,
  ListTree,
  Maximize2,
  Minimize2,
  Monitor as MonitorIcon,
  MessageSquare,
  PlayCircle,
  Plus,
  RotateCcw,
  StickyNote,
  Tag,
  Terminal,
  Trash2,
  RadioTower,
  Smartphone,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { SessionPreviewCard } from '@/components/replay/SessionPreviewCard';

const ReplayPlayer = lazy(() =>
  import('@/components/replay/ReplayPlayer').then((m) => ({
    default: m.ReplayPlayer,
  })),
);

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toaster';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { apiFetch } from '@/lib/api';
import i18n from '@/lib/i18n';
import { DevToolsLinkButton } from '@/components/DevToolsLinkButton';
import { formatDurationFromNanos, shortHash } from '@/lib/format';
import { buildCurlCommand } from '@/lib/curl';
import { buildHar } from '@/lib/har';
import { recordSessionVisit } from '@/lib/recent-sessions';
import { usePresence } from '@/lib/presence';
import { REPLAY_SPEEDS, useReplayPrefs } from '@/lib/replay-prefs';
import { formatUserAgentBadge } from '@/lib/user-agent';
import { cn } from '@/lib/utils';

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
  userAgent?: string;
  tags?: string[];
  note?: string | null;
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
    typeof raw.timestamp === 'number'
      ? raw.timestamp
      : (raw.protocol?.timestamp ?? Number(raw.timestamp ?? 0));
  const data = raw.data ?? raw.protocol?.data;
  return { type, timestamp, data };
}

const EVENT_META: Record<number, { name: string; icon: typeof Activity }> = {
  0: { name: 'DomLoaded', icon: Globe },
  1: { name: 'PageLoaded', icon: Eye },
  2: { name: 'FullSnapshot', icon: Layers },
  3: { name: 'Incremental', icon: Activity },
  4: { name: 'Meta', icon: FileJson },
  5: { name: 'Custom', icon: Zap },
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
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${time}.${ms}`;
}

interface SummaryCounts {
  networkErrorCount: number;
  consoleErrorCount: number;
  commentCount: number;
}

/**
 * Build a Markdown summary of a session for pasting into a bug ticket
 * (Linear / GitHub / Jira). Composes the metadata the page already has;
 * omits rows that have no value so the block stays tight.
 */
function buildSessionSummary(
  id: string,
  metadata: SessionMetadata | undefined,
  counts: SummaryCounts,
  insights: SessionInsight[] = [],
): string {
  const name = metadata?.name ?? metadata?.room ?? i18n.t('sessionDetail.summaryName', { id });
  const lines: string[] = [`### ${name}`, ''];
  const add = (label: string, value?: string | number | null) => {
    if (value === undefined || value === null || value === '') return;
    lines.push(`- **${label}:** ${value}`);
  };
  add(i18n.t('sessionDetail.summarySessionId'), id);
  add(i18n.t('sessionDetail.summaryUrl'), metadata?.url);
  add(i18n.t('sessionDetail.summaryDevice'), metadata?.deviceId);
  if (metadata?.duration)
    add(i18n.t('sessionDetail.summaryDuration'), formatDurationFromNanos(metadata.duration));
  add(
    i18n.t('sessionDetail.summaryCaptured'),
    metadata?.createdAt ? new Date(metadata.createdAt).toLocaleString() : undefined,
  );
  if (metadata?.userAgent)
    add(
      i18n.t('sessionDetail.summaryBrowser'),
      formatUserAgentBadge(metadata.userAgent) || undefined,
    );
  if (metadata?.tags && metadata.tags.length > 0)
    add(i18n.t('sessionDetail.summaryTags'), metadata.tags.join(', '));
  add(i18n.t('sessionDetail.summaryNetworkErrors'), counts.networkErrorCount);
  add(i18n.t('sessionDetail.summaryConsoleErrors'), counts.consoleErrorCount);
  add(i18n.t('sessionDetail.summaryComments'), counts.commentCount);
  if (insights.length > 0) {
    lines.push('', `**${i18n.t('sessionDetail.summaryNotable')}**`);
    for (const insight of insights) lines.push(`- ${insight.text}`);
  }
  if (metadata?.note && metadata.note.trim()) {
    lines.push('', '> ' + metadata.note.trim().replace(/\n/g, '\n> '));
  }
  return lines.join('\n') + '\n';
}

export interface SessionInsight {
  text: string;
  /** Offset (ms from session start) to seek the replay to, when relevant. */
  jumpMs?: number;
}

/**
 * Derive plain-language observations about a session from the data already
 * on the page — errors, failed requests, response sizes, rage-clicks. This
 * is deterministic ("AI-style" summarisation without a model): it surfaces
 * the *narrative* (clustering, the single worst payload, a clean run) that
 * the raw per-tab lists don't make obvious. Capped to keep it skimmable.
 */
export function buildSessionInsights(input: {
  consoleErrors: { timestamp: number }[];
  failedRequests: { timestamp: number; status?: number; method: string; url: string }[];
  networkRows: { timestamp: number; encodedDataLength?: number; method: string; url: string }[];
  rageClicks: { startMs: number; count: number }[];
  sessionStartMs: number;
}): SessionInsight[] {
  const { consoleErrors, failedRequests, networkRows, rageClicks, sessionStartMs } = input;

  const errorOffsets = [
    ...consoleErrors.map((r) => normaliseOffsetMs(r.timestamp, sessionStartMs)),
    ...failedRequests.map((r) => normaliseOffsetMs(r.timestamp, sessionStartMs)),
  ].sort((a, b) => a - b);

  if (errorOffsets.length === 0 && rageClicks.length === 0) {
    return [{ text: i18n.t('sessionDetail.insightCleanSession') }];
  }

  const out: SessionInsight[] = [];

  if (errorOffsets.length > 0) {
    const ce = consoleErrors.length;
    const fr = failedRequests.length;
    const parts: string[] = [];
    if (ce > 0)
      parts.push(
        i18n.t(
          ce === 1
            ? 'sessionDetail.insightConsoleErrorOne'
            : 'sessionDetail.insightConsoleErrorOther',
          {
            n: ce,
          },
        ),
      );
    if (fr > 0)
      parts.push(
        i18n.t(
          fr === 1
            ? 'sessionDetail.insightFailedRequestOne'
            : 'sessionDetail.insightFailedRequestOther',
          {
            n: fr,
          },
        ),
      );
    out.push({
      text: i18n.t('sessionDetail.insightInThisSession', {
        parts: parts.join(i18n.t('sessionDetail.insightAnd')),
      }),
      jumpMs: errorOffsets[0],
    });

    // Densest 3s window across all error offsets — the "what blew up" moment.
    const WINDOW = 3000;
    let best = { start: errorOffsets[0], count: 0 };
    for (let i = 0; i < errorOffsets.length; i++) {
      let j = i;
      while (j < errorOffsets.length && errorOffsets[j] - errorOffsets[i] <= WINDOW) j++;
      const count = j - i;
      if (count > best.count) best = { start: errorOffsets[i], count };
    }
    if (best.count >= 2) {
      out.push({
        text: i18n.t('sessionDetail.insightErrorsCluster', {
          n: best.count,
          time: formatPlayhead(best.start),
        }),
        jumpMs: best.start,
      });
    }
  }

  const largest = networkRows.reduce<{
    timestamp: number;
    encodedDataLength?: number;
    method: string;
    url: string;
  } | null>(
    (max, r) => ((r.encodedDataLength ?? 0) > (max?.encodedDataLength ?? 0) ? r : max),
    null,
  );
  if (largest && (largest.encodedDataLength ?? 0) > 0) {
    let path = largest.url;
    try {
      path = new URL(largest.url).pathname || largest.url;
    } catch {
      /* keep raw url */
    }
    out.push({
      text: i18n.t('sessionDetail.insightLargestResponse', {
        size: formatBytes(largest.encodedDataLength),
        method: largest.method,
        path,
      }),
      jumpMs: normaliseOffsetMs(largest.timestamp, sessionStartMs),
    });
  }

  if (rageClicks.length > 0) {
    const worst = rageClicks.reduce((m, c) => (c.count > m.count ? c : m), rageClicks[0]);
    const offset = Math.max(0, worst.startMs - sessionStartMs);
    out.push({
      text: i18n.t('sessionDetail.insightRageClickBurst', {
        time: formatPlayhead(offset),
        n: worst.count,
      }),
      jumpMs: offset,
    });
  }

  return out.slice(0, 4);
}

type TabValue = 'overview' | 'replay' | 'timeline' | 'network' | 'console' | 'raw';

export default function SessionDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // S3-backed sessions can't be edited (no DB row to update). Only DB
  // sessions get an integer recordId that the tags-editor mutation can
  // target.
  const recordId = useMemo<number | null>(() => {
    if (!id || id.startsWith('s3-')) return null;
    const n = Number(id);
    return Number.isInteger(n) && n > 0 ? n : null;
  }, [id]);

  // Deep link to a specific moment in the replay: `?t=12345` (ms from
  // session start). Parity with PostHog / Sentry / Highlight.io share
  // links — pasting a URL with `?t=` should land the viewer right on
  // the moment that mattered.
  const initialReplayOffset = useMemo(() => {
    const raw = searchParams.get('t');
    if (!raw) return 0;
    const ms = Number.parseInt(raw, 10);
    return Number.isFinite(ms) && ms > 0 ? ms : 0;
  }, [searchParams]);

  // `?tab=` deep-links a specific tab; falls back to Replay when a `?t=`
  // deep-link is present, else Overview. Resolved once for the initial
  // state — subsequent changes flow through `setTab` (which writes the URL).
  const initialTab = useMemo<TabValue>(() => {
    const param = searchParams.get('tab');
    const valid: TabValue[] = ['overview', 'replay', 'timeline', 'network', 'console', 'raw'];
    if (param && valid.includes(param as TabValue)) return param as TabValue;
    return initialReplayOffset > 0 ? 'replay' : 'overview';
    // Resolve once on mount; later changes flow through setTab.
  }, []);

  const [tab, setTabState] = useState<TabValue>(initialTab);

  // Single writer: update state AND mirror to the URL in one call so the
  // active tab is shareable. No separate effect, so this never races with
  // jumpToReplay's `?t=` write. 'overview' is the default → omitted.
  const setTab = useCallback(
    (next: TabValue) => {
      setTabState(next);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 'overview') p.delete('tab');
          else p.set('tab', next);
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // The rrweb-player drives this via the `onTimeUpdate` callback. We keep
  // it in a ref so the share button reads the latest value without making
  // every playhead tick re-render the page.
  const playheadMsRef = useRef<number>(initialReplayOffset);

  const { data: metadata, isLoading: metaLoading } = useQuery({
    queryKey: ['session-metadata', id],
    queryFn: () => apiFetch<SessionMetadata>(`/api/session-replay/sessions/${id}`),
    enabled: !!id,
  });

  const { data: rawEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['session-events', id],
    queryFn: () => apiFetch<RawEvent[]>(`/api/session-replay/sessions/${id}/events`),
    enabled: !!id,
  });

  // Pre-fetch the network + console summaries so the tab triggers can
  // render error-count badges before the user clicks into either panel.
  // Same query key as NetworkTab / ConsoleTab — TanStack Query shares the
  // cache, so the panel queries become free reads.
  const { data: networkRows } = useQuery<NetworkRow[]>({
    queryKey: ['session-network', id],
    queryFn: () => apiFetch<NetworkRow[]>(`/api/session-replay/sessions/${id}/network`),
    enabled: !!id && recordId !== null,
  });
  const { data: consoleRows } = useQuery<ConsoleRow[]>({
    queryKey: ['session-console', id],
    queryFn: () => apiFetch<ConsoleRow[]>(`/api/session-replay/sessions/${id}/console`),
    enabled: !!id && recordId !== null,
  });

  const networkErrorCount = useMemo(
    () =>
      (networkRows ?? []).reduce(
        (acc, r) => acc + (r.status !== undefined && r.status >= 400 ? 1 : 0),
        0,
      ),
    [networkRows],
  );
  const consoleErrorCount = useMemo(
    () => (consoleRows ?? []).reduce((acc, r) => acc + (r.level === 'error' ? 1 : 0), 0),
    [consoleRows],
  );

  // Pre-fetch comment count so the Replay-tab badge appears without
  // forcing the user to click into Replay first. Polls so a teammate's
  // annotations (and resolve toggles) surface without a manual reload —
  // the panel shares this query key, so its list refreshes too.
  const { data: commentRows } = useQuery<ReplayComment[]>({
    queryKey: ['session-comments', recordId],
    queryFn: () => apiFetch<ReplayComment[]>(`/sessions/record/${recordId}/comments`),
    enabled: recordId !== null,
    refetchInterval: 15_000,
  });
  const commentCount = commentRows?.length ?? 0;
  // Open (unresolved) count drives the tab badge — the actionable triage
  // number — while the total still feeds the copy-summary.
  const openCommentCount = (commentRows ?? []).filter((c) => !c.resolved).length;

  // Live presence — who else is viewing this session right now.
  const { count: viewerCount } = usePresence(id, recordId !== null);

  const events = useMemo<ReplayEvent[]>(() => (rawEvents ?? []).map(normaliseEvent), [rawEvents]);

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
      const data = e.data as { source?: number; type?: number; x?: number; y?: number } | undefined;
      if (data?.source !== 2 || data?.type !== 2) continue;
      if (typeof data.x !== 'number' || typeof data.y !== 'number') continue;
      out.push({ x: data.x, y: data.y });
    }
    return out;
  }, [events]);

  // First event's wall-clock timestamp anchors offset math for the
  // "Timeline → Jump to replay" flow. rrweb-player expects ms from
  // session start, not absolute epoch ms.
  const sessionStartMs = useMemo(() => events?.[0]?.timestamp ?? 0, [events]);

  // Error positions (console errors + 4xx/5xx network) drawn as red ticks
  // on the replay minimap so the user can jump straight to a failure.
  const errorMarkers = useMemo(() => {
    const out: { id: string; offsetMs: number }[] = [];
    for (const r of consoleRows ?? []) {
      if (r.level === 'error') {
        out.push({
          id: `console-${r.id}`,
          offsetMs: normaliseOffsetMs(r.timestamp, sessionStartMs),
        });
      }
    }
    for (const r of networkRows ?? []) {
      if (r.status !== undefined && r.status >= 400) {
        out.push({ id: `net-${r.id}`, offsetMs: normaliseOffsetMs(r.timestamp, sessionStartMs) });
      }
    }
    return out;
  }, [consoleRows, networkRows, sessionStartMs]);

  // Derived narrative observations — shared by the Overview Insights card
  // and the "Copy summary" Markdown so both tell the same story.
  const insights = useMemo(
    () =>
      buildSessionInsights({
        consoleErrors: (consoleRows ?? []).filter((r) => r.level === 'error'),
        failedRequests: (networkRows ?? []).filter(
          (r) => r.status !== undefined && r.status >= 400,
        ),
        networkRows: networkRows ?? [],
        rageClicks,
        sessionStartMs,
      }),
    [consoleRows, networkRows, rageClicks, sessionStartMs],
  );

  const jumpToReplay = (offsetMs: number) => {
    const clamped = Math.max(0, Math.round(offsetMs));
    // Write tab + playhead in one searchParams update (raw state setter, so
    // we don't double-write the URL via setTab). Replace, not push — we
    // don't want every event click building up a history entry.
    setTabState('replay');
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('t', String(clamped));
        next.set('tab', 'replay');
        return next;
      },
      { replace: true },
    );
    playheadMsRef.current = clamped;
  };

  // Record this visit in the recent-sessions ring so the CommandPalette
  // can offer a "Recent" group for quick re-open. Fires once per metadata
  // load — id/name/url only change when the user navigates to a different
  // session.
  useEffect(() => {
    if (!id || !metadata) return;
    recordSessionVisit({
      id,
      name: metadata.name ?? metadata.room,
      url: metadata.url,
    });
  }, [id, metadata]);

  // Number-key tab switching (1/2/3/4/5). Mirrors the DevTools docking
  // convention and Linear's tab-by-number model — once a user knows the
  // layout, jumping between Overview / Replay / Timeline / Network / Raw
  // becomes muscle memory.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
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
      const next =
        e.key === '1'
          ? 'overview'
          : e.key === '2'
            ? 'replay'
            : e.key === '3'
              ? 'timeline'
              : e.key === '4'
                ? 'network'
                : e.key === '5'
                  ? 'console'
                  : e.key === '6'
                    ? 'raw'
                    : null;
      if (!next) return;
      e.preventDefault();
      setTab(next);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // `C` jumps to the Replay tab and focuses the comment input. Works
  // from any tab so a reviewer can drop a note without breaking flow.
  // The signal counter triggers a focus effect inside CommentsPanel after
  // the Replay tab has actually mounted — bypasses the timing race that
  // a `setTimeout(0)` would lose against React's tab transition.
  const [commentFocusSignal, setCommentFocusSignal] = useState(0);
  useEffect(() => {
    if (recordId === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (e.key !== 'c' && e.key !== 'C') return;
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
      setTab('replay');
      setCommentFocusSignal((s) => s + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [recordId]);

  // `?` opens the shortcuts cheatsheet. Lets Shift through because `?` is
  // produced with Shift+/ on US layouts. Closes via Esc (handled by Dialog).
  const [helpOpen, setHelpOpen] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== '?') return;
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
      setHelpOpen((v) => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
          {t('sessionDetail.allSessions')}
        </Link>
      </Button>

      {/* Header */}
      <SessionHeader
        id={id ?? ''}
        metadata={metadata}
        loading={metaLoading}
        recordId={recordId}
        summary={buildSessionSummary(
          id ?? '',
          metadata,
          {
            networkErrorCount,
            consoleErrorCount,
            commentCount,
          },
          insights,
        )}
        viewerCount={viewerCount}
      />
      {recordId !== null && (
        <TagsEditor recordId={recordId} loading={metaLoading} tags={metadata?.tags ?? []} />
      )}
      {recordId !== null && (
        <NoteEditor recordId={recordId} loading={metaLoading} note={metadata?.note ?? ''} />
      )}

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
        {/* One hairline-divided strip rather than four separate metric cards
            (mirrors the dashboard's stat strip for a consistent visual
            language). Borders draw a clean cross on the 2-up phone layout. */}
        <Card className="grid grid-cols-2 md:grid-cols-4 overflow-hidden self-start">
          <MetricTile
            icon={Layers}
            label={t('sessionDetail.metricTotalEvents')}
            value={metaLoading || eventsLoading ? null : totalEvents.toLocaleString()}
          />
          <MetricTile
            icon={Clock}
            label={t('sessionDetail.metricDuration')}
            value={metaLoading ? null : formatDurationFromNanos(metadata?.duration)}
            className="border-l border-border"
          />
          <MetricTile
            icon={Calendar}
            label={t('sessionDetail.metricStarted')}
            value={
              metaLoading
                ? null
                : metadata?.createdAt
                  ? new Date(metadata.createdAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : '—'
            }
            className="border-t border-border md:border-t-0 md:border-l"
          />
          <MetricTile
            icon={Smartphone}
            label={t('sessionDetail.metricDevice')}
            value={metaLoading ? null : shortHash(metadata?.deviceId, 14)}
            mono
            copy={metadata?.deviceId}
            copyToastLabel={t('sessionDetail.deviceIdCopied')}
            className="border-t border-l border-border md:border-t-0"
          />
        </Card>
      </div>

      {/* Tabs — horizontally scrollable on narrow screens with fading edges
          to hint at off-screen options without taking layout space. */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <div className="scroll-rail scroll-rail-fade -mx-1 px-1">
          <TabsList className="w-max">
            <TabsTrigger value="overview" className="gap-1.5">
              <Activity className="size-3.5" />
              {t('sessionDetail.tabOverview')}
            </TabsTrigger>
            <TabsTrigger value="replay" className="gap-1.5">
              <PlayCircle className="size-3.5" />
              {t('sessionDetail.tabReplay')}
              {openCommentCount > 0 && (
                <Badge
                  variant="neutral"
                  size="sm"
                  className="ml-1 h-4 px-1 text-[10px]"
                  data-testid="replay-comments-badge"
                  title={t(
                    openCommentCount === 1
                      ? 'sessionDetail.openCommentsTitleOne'
                      : 'sessionDetail.openCommentsTitleOther',
                    { n: openCommentCount },
                  )}
                >
                  {openCommentCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5">
              <ListTree className="size-3.5" />
              {t('sessionDetail.tabTimeline')}
              {totalEvents > 0 && (
                <Badge variant="neutral" size="sm" className="ml-1 h-4 px-1 text-[10px]">
                  {totalEvents}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="network" className="gap-1.5">
              <Globe className="size-3.5" />
              {t('sessionDetail.tabNetwork')}
              {networkErrorCount > 0 && (
                <Badge
                  variant="danger"
                  size="sm"
                  className="ml-1 h-4 px-1 text-[10px]"
                  data-testid="network-error-badge"
                >
                  {networkErrorCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="console" className="gap-1.5">
              <Terminal className="size-3.5" />
              {t('sessionDetail.tabConsole')}
              {consoleErrorCount > 0 && (
                <Badge
                  variant="danger"
                  size="sm"
                  className="ml-1 h-4 px-1 text-[10px]"
                  data-testid="console-error-badge"
                >
                  {consoleErrorCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="raw" className="gap-1.5">
              <FileJson className="size-3.5" />
              {t('sessionDetail.tabRaw')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-5 space-y-4">
          {!eventsLoading && recordId !== null && (
            <SessionInsightsCard insights={insights} onJump={jumpToReplay} />
          )}
          {!eventsLoading && rageClicks.length > 0 && (
            <RageClickCard
              clicks={rageClicks}
              sessionStartMs={sessionStartMs}
              onJump={jumpToReplay}
            />
          )}
          {(consoleRows ?? []).some((r) => r.level === 'error') && (
            <TopErrorsCard
              rows={(consoleRows ?? []).filter((r) => r.level === 'error')}
              onJumpToConsole={() => setTab('console')}
              onJumpToReplay={jumpToReplay}
              sessionStartMs={sessionStartMs}
            />
          )}
          {(networkRows ?? []).some((r) => r.status !== undefined && r.status >= 400) && (
            <FailedRequestsCard
              rows={(networkRows ?? []).filter((r) => r.status !== undefined && r.status >= 400)}
              onJumpToNetwork={() => setTab('network')}
              onJumpToReplay={jumpToReplay}
              sessionStartMs={sessionStartMs}
            />
          )}
          <OverviewTab loading={eventsLoading} counts={eventTypeCounts} total={totalEvents} />
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
              recordId={recordId}
              commentFocusSignal={commentFocusSignal}
              commentMarkers={(commentRows ?? [])
                .filter((c) => !c.resolved)
                .map((c) => ({
                  id: c.id,
                  timestampMs: c.timestampMs,
                }))}
              errorMarkers={errorMarkers}
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

        <TabsContent value="network" className="mt-5">
          <NetworkTab
            sessionId={id ?? ''}
            sessionName={metadata?.name ?? metadata?.room}
            onJumpToReplay={jumpToReplay}
            sessionStartMs={sessionStartMs}
          />
        </TabsContent>

        <TabsContent value="console" className="mt-5">
          <ConsoleTab
            sessionId={id ?? ''}
            sessionName={metadata?.name ?? metadata?.room}
            onJumpToReplay={jumpToReplay}
            sessionStartMs={sessionStartMs}
          />
        </TabsContent>

        <TabsContent value="raw" className="mt-5">
          <RawTab events={events ?? []} loading={eventsLoading} />
        </TabsContent>
      </Tabs>
      <ShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} activeTab={tab} />
    </div>
  );
}

function ShortcutsHelp({
  open,
  onOpenChange,
  activeTab,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  activeTab: TabValue;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="session-shortcuts-help">
        <DialogHeader>
          <DialogTitle>{t('sessionDetail.shortcutsTitle')}</DialogTitle>
          <DialogDescription>
            {t('sessionDetail.shortcutsToggleHint_part1')}
            <Kbd>?</Kbd>
            {t('sessionDetail.shortcutsToggleHint_part2')}
          </DialogDescription>
        </DialogHeader>
        <ul className="text-sm space-y-2">
          <ShortcutRow keys={['1']} label={t('sessionDetail.shortcutOverviewTab')} />
          <ShortcutRow keys={['2']} label={t('sessionDetail.shortcutReplayTab')} />
          <ShortcutRow keys={['3']} label={t('sessionDetail.shortcutTimelineTab')} />
          <ShortcutRow keys={['4']} label={t('sessionDetail.shortcutNetworkTab')} />
          <ShortcutRow keys={['5']} label={t('sessionDetail.shortcutConsoleTab')} />
          <ShortcutRow keys={['6']} label={t('sessionDetail.shortcutRawTab')} />
          <ShortcutRow keys={['C']} label={t('sessionDetail.shortcutComment')} />
          {activeTab === 'timeline' && (
            <>
              <ShortcutRow keys={['J', '↓']} label={t('sessionDetail.shortcutNextTimelineRow')} />
              <ShortcutRow keys={['K', '↑']} label={t('sessionDetail.shortcutPrevTimelineRow')} />
              <ShortcutRow keys={['Enter']} label={t('sessionDetail.shortcutSeekToRow')} />
            </>
          )}
          {activeTab === 'replay' && (
            <>
              <ShortcutRow keys={['F']} label={t('sessionDetail.shortcutToggleFullscreen')} />
              <ShortcutRow keys={['E']} label={t('sessionDetail.shortcutNextError')} />
              <ShortcutRow keys={['⇧', 'E']} label={t('sessionDetail.shortcutPrevError')} />
            </>
          )}
          <ShortcutRow keys={['?']} label={t('sessionDetail.shortcutToggleCheatsheet')} />
          <ShortcutRow keys={['Esc']} label={t('sessionDetail.shortcutDismissDialog')} />
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-fg-subtle">{label}</span>
      <span className="flex items-center gap-1 shrink-0">
        {keys.map((k, i) => (
          <Kbd key={i}>{k}</Kbd>
        ))}
      </span>
    </li>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded border border-border bg-bg-subtle text-[11px] font-mono text-fg-subtle">
      {children}
    </kbd>
  );
}

/* ───────── Network tab ───────── */

interface NetworkRow {
  id: number;
  requestId: number;
  timestamp: number;
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  resourceType?: string;
  mimeType?: string;
  encodedDataLength?: number;
  responseBody?: string | null;
  base64Encoded?: boolean | null;
}

type StatusClass = '2xx' | '3xx' | '4xx' | '5xx' | 'pending';
const STATUS_CLASSES: readonly StatusClass[] = ['2xx', '3xx', '4xx', '5xx', 'pending'];

function statusClassOf(status: number | undefined): StatusClass {
  if (status === undefined || status === null) return 'pending';
  if (status >= 200 && status < 300) return '2xx';
  if (status >= 300 && status < 400) return '3xx';
  if (status >= 400 && status < 500) return '4xx';
  if (status >= 500 && status < 600) return '5xx';
  return 'pending';
}

function NetworkTab({
  sessionId,
  sessionName,
  onJumpToReplay,
  sessionStartMs,
}: {
  sessionId: string;
  sessionName?: string;
  /** Forwarded from SessionDetailPage so rows can hop into the Replay tab. */
  onJumpToReplay?: (offsetMs: number) => void;
  /** Anchor timestamp used to compute the seek offset. Same unit as
   * `row.timestamp` (caller normalises). */
  sessionStartMs?: number;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<NetworkRow[]>({
    queryKey: ['session-network', sessionId],
    queryFn: () => apiFetch<NetworkRow[]>(`/api/session-replay/sessions/${sessionId}/network`),
    enabled: !!sessionId,
  });

  const rows = data ?? [];
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<NetworkRow | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [activeStatusClasses, setActiveStatusClasses] = useState<Set<StatusClass>>(new Set());

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const t = r.resourceType ?? 'Other';
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const statusCounts = useMemo(() => {
    const counts = new Map<StatusClass, number>();
    for (const r of rows) {
      const cls = statusClassOf(r.status);
      counts.set(cls, (counts.get(cls) ?? 0) + 1);
    }
    return STATUS_CLASSES.map((c) => [c, counts.get(c) ?? 0] as const);
  }, [rows]);

  const toggleType = (t: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const toggleStatusClass = (c: StatusClass) => {
    setActiveStatusClasses((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const type = r.resourceType ?? 'Other';
      if (activeTypes.size > 0 && !activeTypes.has(type)) return false;
      if (activeStatusClasses.size > 0 && !activeStatusClasses.has(statusClassOf(r.status))) {
        return false;
      }
      if (filter) {
        const term = filter.toLowerCase();
        const match =
          r.url.toLowerCase().includes(term) ||
          r.method.toLowerCase().includes(term) ||
          (r.mimeType?.toLowerCase().includes(term) ?? false);
        if (!match) return false;
      }
      return true;
    });
  }, [rows, filter, activeTypes, activeStatusClasses]);

  const summary = useMemo(() => {
    let transferred = 0;
    let failed = 0;
    for (const r of filtered) {
      transferred += Number(r.encodedDataLength) || 0;
      const cls = statusClassOf(r.status);
      if (cls === '4xx' || cls === '5xx') failed += 1;
    }
    return { transferred, failed };
  }, [filtered]);

  // null sortKey = capture order (the array's natural order).
  const [sort, setSort] = useState<{ key: 'status' | 'size' | null; dir: 'asc' | 'desc' }>({
    key: null,
    dir: 'desc',
  });

  const toggleSort = (key: 'status' | 'size') => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key, dir: 'asc' };
      return { key: null, dir: 'desc' }; // third click clears
    });
  };

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const factor = sort.dir === 'asc' ? 1 : -1;
    const value = (r: NetworkRow) =>
      sort.key === 'size' ? Number(r.encodedDataLength) || 0 : Number(r.status) || 0;
    return [...filtered].sort((a, b) => (value(a) - value(b)) * factor);
  }, [filtered, sort]);

  if (isLoading) {
    return (
      <Card className="p-3 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Globe}
          title={t('sessionDetail.networkEmptyTitle')}
          description={
            sessionId.startsWith('s3-')
              ? t('sessionDetail.networkEmptyS3')
              : t('sessionDetail.networkEmptyNone')
          }
        />
      </Card>
    );
  }

  const exportHar = () => {
    const har = buildHar(rows, sessionName);
    const blob = new Blob([JSON.stringify(har, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `${sessionName || `session-${sessionId}`}.har`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('sessionDetail.harDownloaded'), {
      description: t(
        rows.length === 1 ? 'sessionDetail.requestCountOne' : 'sessionDetail.requestCountOther',
        { n: rows.length },
      ),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder={t('sessionDetail.networkFilterPlaceholder')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            leadingIcon={<Globe />}
            trailingIcon={
              filter ? (
                <button
                  type="button"
                  onClick={() => setFilter('')}
                  aria-label={t('sessionDetail.clearFilter')}
                >
                  <X className="size-3.5" />
                </button>
              ) : undefined
            }
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportHar}
          data-testid="session-network-har"
          title={t('sessionDetail.exportHarTitle')}
        >
          <Download />
          <span className="hidden sm:inline">{t('sessionDetail.exportHar')}</span>
        </Button>
      </div>
      {typeCounts.length > 1 && (
        <div
          className="-mx-1 px-1 scroll-rail scroll-rail-fade sm:overflow-visible"
          data-testid="session-network-type-strip"
        >
          <div className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap pb-0.5">
            {typeCounts.map(([type, count]) => {
              const active = activeTypes.has(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  aria-pressed={active}
                  data-testid={`session-network-type-${type}`}
                  className={cn(
                    'h-6 px-2 rounded-full border text-[11px] font-medium transition-colors shrink-0 inline-flex items-center gap-1',
                    active
                      ? 'bg-fg text-bg border-fg'
                      : 'bg-surface border-border text-fg-subtle hover:text-fg',
                  )}
                >
                  <span>{type}</span>
                  <span
                    className={cn(
                      'font-mono tabular-nums text-[10px]',
                      active ? 'text-bg/80' : 'text-fg-faint',
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div
        className="flex items-center gap-1.5 flex-wrap"
        data-testid="session-network-status-strip"
      >
        {statusCounts.map(([cls, count]) => {
          const active = activeStatusClasses.has(cls);
          const empty = count === 0;
          return (
            <button
              key={cls}
              type="button"
              onClick={() => toggleStatusClass(cls)}
              disabled={empty}
              aria-pressed={active}
              data-testid={`session-network-status-${cls}`}
              className={cn(
                'h-6 px-2 rounded-full border text-[11px] font-medium transition-colors shrink-0 inline-flex items-center gap-1',
                empty && 'opacity-40 cursor-not-allowed',
                active
                  ? cls === '4xx'
                    ? 'bg-warning text-bg border-warning'
                    : cls === '5xx'
                      ? 'bg-danger text-bg border-danger'
                      : 'bg-fg text-bg border-fg'
                  : 'bg-surface border-border text-fg-subtle hover:text-fg',
              )}
            >
              <span>{cls}</span>
              <span
                className={cn(
                  'font-mono tabular-nums text-[10px]',
                  active ? 'text-bg/80' : 'text-fg-faint',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
      <Card className="overflow-hidden p-0">
        <div
          className="px-3 py-2 border-b border-border bg-bg-subtle text-[11px] uppercase tracking-wider text-fg-faint flex items-center justify-between gap-2"
          data-testid="session-network-summary"
        >
          <span>
            <span className="font-medium text-fg-subtle">{filtered.length}</span>{' '}
            {t('sessionDetail.requestsLabel')}
            {filtered.length !== rows.length && (
              <span className="text-fg-faint ml-1">
                {t('sessionDetail.ofTotal', { n: rows.length })}
              </span>
            )}
          </span>
          <span className="flex items-center gap-3 shrink-0">
            <span data-testid="session-network-transferred">
              {t('sessionDetail.bytesTransferred', { value: formatBytes(summary.transferred) })}
            </span>
            {summary.failed > 0 && (
              <span className="text-danger" data-testid="session-network-failed">
                {t('sessionDetail.failedCount', { n: summary.failed })}
              </span>
            )}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="session-network-table">
            <thead>
              <tr className="border-b border-border bg-bg-subtle text-[11px] uppercase tracking-wider text-fg-faint">
                <th className="h-9 px-3 text-left font-semibold first:pl-4">
                  {t('sessionDetail.colMethod')}
                </th>
                <th className="h-9 px-3 text-left font-semibold">{t('sessionDetail.colUrl')}</th>
                <th className="h-9 px-3 text-right font-semibold">
                  <NetworkSortHeader
                    label={t('sessionDetail.colStatus')}
                    active={sort.key === 'status'}
                    dir={sort.dir}
                    onClick={() => toggleSort('status')}
                    testid="session-network-sort-status"
                  />
                </th>
                <th className="h-9 px-3 text-left font-semibold">{t('sessionDetail.colType')}</th>
                <th className="h-9 px-3 text-right font-semibold">
                  <NetworkSortHeader
                    label={t('sessionDetail.colSize')}
                    active={sort.key === 'size'}
                    dir={sort.dir}
                    onClick={() => toggleSort('size')}
                    testid="session-network-sort-size"
                  />
                </th>
                <th className="h-9 pl-3 pr-4 text-right font-semibold w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <NetworkRowView
                  key={r.id}
                  row={r}
                  onSelect={() => setSelected(r)}
                  onJump={
                    onJumpToReplay && sessionStartMs !== undefined
                      ? () => onJumpToReplay(normaliseOffsetMs(r.timestamp, sessionStartMs))
                      : undefined
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <NetworkRowDetail row={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function NetworkRowDetail({ row, onClose }: { row: NetworkRow | null; onClose: () => void }) {
  const { t } = useTranslation();
  const open = row !== null;
  const body = row?.responseBody ?? null;
  const isJson =
    !!body &&
    !row?.base64Encoded &&
    (row?.mimeType?.includes('json') || body.trim().startsWith('{') || body.trim().startsWith('['));
  const pretty = useMemo(() => {
    if (!body) return null;
    if (!isJson) return body;
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }, [body, isJson]);

  const copyUrl = async () => {
    if (!row?.url) return;
    try {
      await navigator.clipboard.writeText(row.url);
      toast.success(t('sessionDetail.urlCopied'));
    } catch {
      toast.error(t('sessionDetail.failedToCopy'));
    }
  };

  const copyCurl = async () => {
    if (!row) return;
    try {
      await navigator.clipboard.writeText(buildCurlCommand(row));
      toast.success(t('sessionDetail.curlCopied'));
    } catch {
      toast.error(t('sessionDetail.failedToCopy'));
    }
  };

  const copyBody = async () => {
    if (!body) return;
    try {
      await navigator.clipboard.writeText(pretty ?? body);
      toast.success(t('sessionDetail.bodyCopied'));
    } catch {
      toast.error(t('sessionDetail.failedToCopy'));
    }
  };

  const downloadBody = () => {
    if (!body || !row) return;
    const extension = row.base64Encoded
      ? 'bin'
      : isJson
        ? 'json'
        : row.mimeType?.includes('html')
          ? 'html'
          : row.mimeType?.includes('xml')
            ? 'xml'
            : row.mimeType?.includes('css')
              ? 'css'
              : row.mimeType?.includes('javascript')
                ? 'js'
                : 'txt';
    const filename = filenameFromUrl(row.url, row.requestId, extension);
    const payload = row.base64Encoded ? base64ToBytes(body) : (pretty ?? body);
    const blob = new Blob([payload], {
      type: row.mimeType || 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('sessionDetail.bodyDownloaded'), { description: filename });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden" data-testid="session-network-detail">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2 font-mono text-sm">
            <span>{row?.method ?? ''}</span>
            <span className="truncate">{row?.url ?? ''}</span>
          </DialogTitle>
          <DialogDescription className="font-mono text-[11px] flex items-center gap-3">
            <span>{t('sessionDetail.detailStatus', { value: row?.status ?? '—' })}</span>
            {row?.resourceType && (
              <span>{t('sessionDetail.detailType', { value: row.resourceType })}</span>
            )}
            {row?.mimeType && <span>{t('sessionDetail.detailMime', { value: row.mimeType })}</span>}
            <span>
              {t('sessionDetail.detailSize', { value: formatBytes(row?.encodedDataLength) })}
            </span>
          </DialogDescription>
          {row && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={copyUrl}
                data-testid="session-network-detail-copy-url"
              >
                <Link2 />
                <span className="hidden sm:inline">{t('sessionDetail.copyUrl')}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyCurl}
                data-testid="session-network-detail-copy-curl"
              >
                <Copy />
                <span className="hidden sm:inline">{t('sessionDetail.copyCurl')}</span>
              </Button>
              {row.url && (
                <Button asChild variant="outline" size="sm">
                  <a href={row.url} target="_blank" rel="noreferrer">
                    <ExternalLink />
                    <span className="hidden sm:inline">{t('sessionDetail.open')}</span>
                  </a>
                </Button>
              )}
            </div>
          )}
        </DialogHeader>
        <div className="px-6 pb-6 max-h-[60vh] flex flex-col">
          {body ? (
            <>
              <div className="flex items-center justify-end mb-2 gap-2">
                {row?.base64Encoded && (
                  <Badge variant="neutral" size="sm">
                    base64
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyBody}
                  data-testid="session-network-body-copy"
                >
                  <Copy />
                  <span className="hidden sm:inline">{t('sessionDetail.copyBody')}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadBody}
                  data-testid="session-network-body-download"
                  title={t('sessionDetail.downloadBodyTitle')}
                >
                  <Download />
                  <span className="hidden sm:inline">{t('sessionDetail.download')}</span>
                </Button>
              </div>
              <pre
                className="font-mono text-[11px] bg-bg-subtle border border-border rounded-md p-3 overflow-auto flex-1"
                data-testid="session-network-body"
              >
                {pretty}
              </pre>
            </>
          ) : (
            <EmptyState
              icon={Globe}
              title={t('sessionDetail.noBodyTitle')}
              description={t('sessionDetail.noBodyDescription')}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NetworkSortHeader({
  label,
  active,
  dir,
  onClick,
  testid,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  testid: string;
}) {
  const { t } = useTranslation();
  const Icon = !active ? ChevronsUpDown : dir === 'asc' ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      aria-label={t('sessionDetail.sortBy', { label })}
      className={cn(
        'inline-flex items-center gap-1 uppercase tracking-wider transition-colors ml-auto',
        active ? 'text-fg' : 'hover:text-fg',
      )}
    >
      <span>{label}</span>
      <Icon className="size-3" />
    </button>
  );
}

function NetworkRowView({
  row,
  onSelect,
  onJump,
}: {
  row: NetworkRow;
  onSelect: () => void;
  onJump?: () => void;
}) {
  const { t } = useTranslation();
  const statusClass =
    row.status === undefined
      ? 'text-fg-faint'
      : row.status >= 500
        ? 'text-danger'
        : row.status >= 400
          ? 'text-warning'
          : row.status >= 300
            ? 'text-fg-subtle'
            : 'text-success';

  return (
    <tr
      className="group border-b border-border last:border-0 hover:bg-bg-muted/40 transition-colors cursor-pointer"
      data-testid="session-network-row"
      onClick={onSelect}
    >
      <td className="px-3 py-2 align-middle font-mono text-[11px] text-fg">{row.method}</td>
      <td className="px-3 py-2 align-middle font-mono text-[11px] text-fg-subtle">
        <span className="truncate block max-w-[420px] sm:max-w-[640px]" title={row.url}>
          {row.url || '—'}
        </span>
      </td>
      <td
        className={cn(
          'px-3 py-2 align-middle text-right font-mono text-[11px] tabular-nums',
          statusClass,
        )}
      >
        {row.status ?? '—'}
      </td>
      <td className="px-3 py-2 align-middle text-[11px] text-fg-subtle">
        {row.resourceType ?? row.mimeType ?? '—'}
      </td>
      <td className="px-3 py-2 align-middle text-right font-mono text-[11px] tabular-nums text-fg-subtle">
        {formatBytes(row.encodedDataLength)}
      </td>
      <td className="pl-3 pr-4 py-2 align-middle text-right" onClick={(e) => e.stopPropagation()}>
        <div className="inline-flex items-center gap-0.5">
          {onJump && (
            <button
              type="button"
              onClick={onJump}
              aria-label={t('sessionDetail.jumpReplayToRequest')}
              data-testid="session-network-jump"
              className={cn(
                'inline-flex items-center justify-center size-6 rounded-md transition-opacity',
                'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
                'hover:bg-bg-muted text-fg-subtle hover:text-fg',
              )}
            >
              <PlayCircle className="size-3" />
            </button>
          )}
          {row.url && (
            <a
              href={row.url}
              target="_blank"
              rel="noreferrer"
              aria-label={t('sessionDetail.openUrlInNewTab')}
              data-testid="session-network-open-url"
              className={cn(
                'inline-flex items-center justify-center size-6 rounded-md transition-opacity',
                'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
                'hover:bg-bg-muted text-fg-subtle hover:text-fg',
              )}
            >
              <ExternalLink className="size-3" />
            </a>
          )}
          {row.url && <NetworkRowCopyUrl url={row.url} />}
          <NetworkRowCopyCurl row={row} />
        </div>
      </td>
    </tr>
  );
}

function NetworkRowCopyUrl({ url }: { url: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success(t('sessionDetail.urlCopied'));
    } catch {
      toast.error(t('sessionDetail.failedToCopy'));
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={t('sessionDetail.copyUrl')}
      data-testid="session-network-copy-url"
      className={cn(
        'inline-flex items-center justify-center size-6 rounded-md transition-opacity',
        'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
        'hover:bg-bg-muted text-fg-subtle hover:text-fg',
      )}
    >
      {copied ? <Check className="size-3" /> : <Link2 className="size-3" />}
    </button>
  );
}

function NetworkRowCopyCurl({ row }: { row: NetworkRow }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const cmd = buildCurlCommand(row);
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success(t('sessionDetail.curlCopied'), { description: row.method + ' ' + row.url });
    } catch {
      toast.error(t('sessionDetail.failedToCopy'));
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={t('sessionDetail.copyAsCurl')}
      data-testid="session-network-curl"
      className={cn(
        'inline-flex items-center justify-center size-6 rounded-md transition-opacity',
        'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
        'hover:bg-bg-muted text-fg-subtle hover:text-fg',
      )}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  );
}

/**
 * Convert a raw row timestamp (which may be ms or ns depending on the
 * capture path — rrweb sends ms, the CDP-stored DB rows store ns) into a
 * ms-from-session-start offset.
 *
 * Heuristic: if the magnitude of `(row - start)` is way larger than any
 * reasonable session length (1 day = 86_400_000 ms), assume nanoseconds
 * and divide by 1_000_000. Otherwise treat as already-ms.
 */
function normaliseOffsetMs(rowTimestamp: number, sessionStartMs: number): number {
  const raw = rowTimestamp - sessionStartMs;
  // 24 hours in ms — anything beyond this is almost certainly ns.
  if (Math.abs(raw) > 86_400_000) return Math.max(0, Math.round(raw / 1_000_000));
  return Math.max(0, Math.round(raw));
}

function filenameFromUrl(url: string, requestId: number, extension: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop() ?? '';
    const base = last.replace(/\.[^.]+$/, '') || `response-${requestId}`;
    return `${base}.${extension}`;
  } catch {
    return `response-${requestId}.${extension}`;
  }
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function formatBytes(n?: number): string {
  if (!n || !Number.isFinite(n)) return '—';
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

/* ───────── Console tab ───────── */

type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface ConsoleRow {
  id: number;
  timestamp: number;
  level: ConsoleLevel;
  text: string;
  source: 'console' | 'exception';
  url?: string;
  lineNumber?: number;
}

const ALL_CONSOLE_LEVELS: ConsoleLevel[] = ['log', 'info', 'warn', 'error', 'debug'];

function ConsoleTab({
  sessionId,
  sessionName,
  onJumpToReplay,
  sessionStartMs,
}: {
  sessionId: string;
  sessionName?: string;
  onJumpToReplay?: (offsetMs: number) => void;
  sessionStartMs?: number;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<ConsoleRow[]>({
    queryKey: ['session-console', sessionId],
    queryFn: () => apiFetch<ConsoleRow[]>(`/api/session-replay/sessions/${sessionId}/console`),
    enabled: !!sessionId,
  });

  const rows = data ?? [];
  const [activeLevels, setActiveLevels] = useState<Set<ConsoleLevel>>(new Set());
  const [filter, setFilter] = useState('');

  const counts = useMemo(() => {
    const out: Record<ConsoleLevel, number> = {
      log: 0,
      info: 0,
      warn: 0,
      error: 0,
      debug: 0,
    };
    for (const r of rows) out[r.level] += 1;
    return out;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (activeLevels.size > 0 && !activeLevels.has(r.level)) return false;
      if (filter && !r.text.toLowerCase().includes(filter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [rows, activeLevels, filter]);

  const toggleLevel = (l: ConsoleLevel) => {
    setActiveLevels((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });
  };

  const exportFiltered = () => {
    const lines = filtered.map((r) => {
      const ts = new Date(r.timestamp).toISOString();
      return `[${ts}] [${r.level.toUpperCase()}] ${r.text}`;
    });
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/plain' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `${sessionName || `session-${sessionId}`}-console.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('sessionDetail.consoleExportDownloaded'), {
      description: t(
        filtered.length === 1 ? 'sessionDetail.messageCountOne' : 'sessionDetail.messageCountOther',
        { n: filtered.length },
      ),
    });
  };

  if (isLoading) {
    return (
      <Card className="p-3 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Terminal}
          title={t('sessionDetail.consoleEmptyTitle')}
          description={
            sessionId.startsWith('s3-')
              ? t('sessionDetail.consoleEmptyS3')
              : t('sessionDetail.consoleEmptyNone')
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder={t('sessionDetail.consoleFilterPlaceholder')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            leadingIcon={<Terminal />}
            trailingIcon={
              filter ? (
                <button
                  type="button"
                  onClick={() => setFilter('')}
                  aria-label={t('sessionDetail.clearFilter')}
                >
                  <X className="size-3.5" />
                </button>
              ) : undefined
            }
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportFiltered}
          data-testid="session-console-export"
          title={t('sessionDetail.exportConsoleTitle')}
          disabled={filtered.length === 0}
        >
          <Download />
          <span className="hidden sm:inline">{t('sessionDetail.export')}</span>
        </Button>
        <div className="flex items-center gap-1.5 flex-wrap">
          {ALL_CONSOLE_LEVELS.map((l) => {
            const count = counts[l];
            const active = activeLevels.has(l);
            const empty = count === 0;
            return (
              <button
                key={l}
                type="button"
                onClick={() => toggleLevel(l)}
                disabled={empty}
                aria-pressed={active}
                data-testid={`console-level-chip-${l}`}
                className={cn(
                  'h-6 px-2 rounded-full border text-[11px] font-medium transition-colors shrink-0',
                  'inline-flex items-center gap-1',
                  empty && 'opacity-40 cursor-not-allowed',
                  active
                    ? 'bg-fg text-bg border-fg'
                    : 'bg-surface border-border text-fg-subtle hover:text-fg',
                )}
              >
                <span className="capitalize">{l}</span>
                <span
                  className={cn(
                    'font-mono tabular-nums text-[10px]',
                    active ? 'text-bg/80' : 'text-fg-faint',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="px-3 py-2 border-b border-border bg-bg-subtle text-[11px] uppercase tracking-wider text-fg-faint">
          <span className="font-medium text-fg-subtle">{filtered.length}</span>{' '}
          {t('sessionDetail.messagesLabel')}
          {filtered.length !== rows.length && (
            <span className="text-fg-faint ml-1">
              {t('sessionDetail.ofTotal', { n: rows.length })}
            </span>
          )}
        </div>
        <ul className="divide-y divide-border" data-testid="session-console-list">
          {filtered.map((r) => (
            <ConsoleRowView
              key={r.id}
              row={r}
              onJump={
                onJumpToReplay && sessionStartMs !== undefined
                  ? () => onJumpToReplay(normaliseOffsetMs(r.timestamp, sessionStartMs))
                  : undefined
              }
            />
          ))}
        </ul>
      </Card>
    </div>
  );
}

function ConsoleRowView({ row, onJump }: { row: ConsoleRow; onJump?: () => void }) {
  const { t } = useTranslation();
  const colour =
    row.level === 'error'
      ? 'text-danger'
      : row.level === 'warn'
        ? 'text-warning'
        : row.level === 'info'
          ? 'text-accent'
          : 'text-fg-subtle';
  return (
    <li
      className="group px-3 py-1.5 flex items-start gap-2 text-[12px] font-mono"
      data-testid="session-console-row"
      data-level={row.level}
    >
      <span
        className={cn('uppercase tracking-wider text-[10px] font-semibold shrink-0 w-12', colour)}
      >
        {row.level}
      </span>
      <span className="flex-1 whitespace-pre-wrap break-words text-fg">{row.text}</span>
      {row.url && (
        <span className="text-[10px] text-fg-faint shrink-0">
          {row.url.replace(/^https?:\/\//, '')}
          {row.lineNumber ? `:${row.lineNumber}` : ''}
        </span>
      )}
      <ConsoleRowCopy text={row.text} />
      {onJump && (
        <button
          type="button"
          onClick={onJump}
          aria-label={t('sessionDetail.jumpReplayToMessage')}
          data-testid="session-console-jump"
          className={cn(
            'shrink-0 inline-flex items-center justify-center size-5 rounded-md transition-opacity',
            'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
            'hover:bg-bg-muted text-fg-subtle hover:text-fg',
          )}
        >
          <PlayCircle className="size-3" />
        </button>
      )}
    </li>
  );
}

function ConsoleRowCopy({ text }: { text: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('sessionDetail.failedToCopy'));
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={t('sessionDetail.copyMessage')}
      data-testid="session-console-copy"
      className={cn(
        'shrink-0 inline-flex items-center justify-center size-5 rounded-md transition-opacity',
        'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
        'hover:bg-bg-muted text-fg-subtle hover:text-fg',
      )}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  );
}

/* ───────── Tags editor ───────── */

const MAX_TAG_LENGTH = 24;
const MAX_TAGS = 16;

function normaliseTags(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const trimmed = raw.trim().slice(0, MAX_TAG_LENGTH);
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

function TagsEditor({
  recordId,
  loading,
  tags,
}: {
  recordId: number;
  loading: boolean;
  tags: string[];
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<string[] | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);

  // Cross-session tag list for autosuggest. Cached for 5 min — the set
  // changes slowly relative to the user's typing speed.
  const { data: allTags } = useQuery<string[]>({
    queryKey: ['all-record-tags'],
    queryFn: () => apiFetch<string[]>('/sessions/record/tags'),
    staleTime: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (next: string[]) => {
      const res = await apiFetch<{ id: number; tags: string[] }>(
        `/sessions/record/${recordId}/tags`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: next }),
        },
      );
      return res.tags;
    },
    onSuccess: (saved) => {
      // Round-trip the server's normalised result back into the cache so
      // the optimistic value is replaced even if the server trimmed more.
      queryClient.setQueryData<SessionMetadata | undefined>(
        ['session-metadata', String(recordId)],
        (prev) => (prev ? { ...prev, tags: saved } : prev),
      );
      setPending(null);
    },
    onError: () => {
      setPending(null);
      toast.error(t('sessionDetail.couldntSaveTags'));
    },
  });

  const visible = pending ?? tags;

  const suggestions = useMemo(() => {
    const term = draft.trim().toLowerCase();
    if (!term) return [] as string[];
    const taken = new Set(visible);
    return (allTags ?? [])
      .filter((tag) => tag.toLowerCase().includes(term) && !taken.has(tag))
      .slice(0, 6);
  }, [draft, visible, allTags]);

  const submit = () => {
    const next = normaliseTags([...visible, draft]);
    if (next.length === visible.length && draft.trim()) {
      // Duplicate or normalised-to-empty — clear the input but don't fire.
      setDraft('');
      return;
    }
    setDraft('');
    setPending(next);
    mutation.mutate(next);
  };

  const remove = (tag: string) => {
    const next = visible.filter((x) => x !== tag);
    setPending(next);
    mutation.mutate(next);
  };

  if (loading) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-3" data-testid="session-tags-editor">
      <Tag className="size-3.5 text-fg-faint shrink-0" />
      {visible.length === 0 && (
        <span className="text-[11px] text-fg-faint">{t('sessionDetail.noTagsYet')}</span>
      )}
      {visible.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-accent-soft text-accent-soft-fg border border-accent-soft text-[11px] font-medium"
          data-testid="session-tag-chip"
        >
          {tag}
          <button
            type="button"
            onClick={() => remove(tag)}
            disabled={mutation.isPending}
            aria-label={t('sessionDetail.removeTag', { tag })}
            className="opacity-60 hover:opacity-100 disabled:opacity-30"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      {visible.length < MAX_TAGS && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="inline-flex items-center gap-1 relative"
        >
          {showSuggest && suggestions.length > 0 && (
            <div
              className="absolute top-full mt-1 left-0 z-10 min-w-[180px] rounded-md border border-border bg-surface shadow-lg p-1"
              data-testid="session-tag-suggest"
            >
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  // mouseDown so the input's blur doesn't fire first and
                  // close the dropdown before we register the click.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setPending(normaliseTags([...visible, s]));
                    mutation.mutate(normaliseTags([...visible, s]));
                    setDraft('');
                    setShowSuggest(false);
                  }}
                  data-testid="session-tag-suggest-item"
                  className="w-full text-left px-2 py-1 text-[11px] rounded hover:bg-bg-muted text-fg"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <input
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setShowSuggest(true);
            }}
            onFocus={() => setShowSuggest(true)}
            onBlur={() => setShowSuggest(false)}
            maxLength={MAX_TAG_LENGTH}
            placeholder={t('sessionDetail.addTagPlaceholder')}
            aria-label={t('sessionDetail.addTag')}
            data-testid="session-tag-input"
            className="h-6 px-2 rounded-full border border-border bg-surface text-[11px] placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-ring w-24"
          />
          <button
            type="submit"
            disabled={!draft.trim() || mutation.isPending}
            aria-label={t('sessionDetail.saveTag')}
            data-testid="session-tag-add"
            className="inline-flex items-center justify-center size-6 rounded-full border border-border bg-surface text-fg-subtle hover:text-fg disabled:opacity-40"
          >
            <Plus className="size-3" />
          </button>
        </form>
      )}
    </div>
  );
}

const MAX_NOTE_LENGTH = 4000;

function NoteEditor({
  recordId,
  loading,
  note,
}: {
  recordId: number;
  loading: boolean;
  note: string;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(note);

  // Re-sync when the metadata cache updates (e.g. after a save round-trips
  // the server-trimmed value, or when navigating between sessions).
  useEffect(() => {
    setDraft(note);
  }, [note]);

  const mutation = useMutation({
    mutationFn: async (next: string) => {
      const res = await apiFetch<{ id: number; note: string | null }>(
        `/sessions/record/${recordId}/note`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: next }),
        },
      );
      return res.note ?? '';
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<SessionMetadata | undefined>(
        ['session-metadata', String(recordId)],
        (prev) => (prev ? { ...prev, note: saved } : prev),
      );
      toast.success(t('sessionDetail.noteSaved'));
    },
    onError: () => toast.error(t('sessionDetail.couldntSaveNote')),
  });

  if (loading) return null;

  const dirty = draft.trim() !== note.trim();

  return (
    <div className="mt-3" data-testid="session-note-editor">
      <div className="flex items-center gap-1.5 mb-1.5 text-[11px] text-fg-faint">
        <StickyNote className="size-3.5 shrink-0" />
        <span>{t('sessionDetail.note')}</span>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={MAX_NOTE_LENGTH}
        rows={2}
        placeholder={t('sessionDetail.notePlaceholder')}
        aria-label={t('sessionDetail.noteAriaLabel')}
        data-testid="session-note-input"
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-ring resize-y"
      />
      {dirty && (
        <div className="flex items-center gap-2 mt-1.5">
          <Button
            size="sm"
            variant="primary"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(draft.trim())}
            data-testid="session-note-save"
          >
            <Check />
            {t('sessionDetail.saveNote')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={mutation.isPending}
            onClick={() => setDraft(note)}
            data-testid="session-note-cancel"
          >
            {t('sessionDetail.cancel')}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ───────── Header ───────── */

function SessionHeader({
  id,
  metadata,
  loading,
  summary,
  viewerCount = 0,
}: {
  id: string;
  metadata?: SessionMetadata;
  loading: boolean;
  /** Numeric record id when this is a DB session (vs. an S3 backup). */
  recordId?: number | null;
  /** Pre-built Markdown summary for the Copy summary button. */
  summary?: string;
  /** Live viewer count from presence polling. */
  viewerCount?: number;
}) {
  const { t } = useTranslation();
  const isRecording = metadata?.recordMode;
  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 sm:gap-4">
      <div className="min-w-0">
        <CopyChip
          icon={<Hash className="size-3" />}
          label={t('sessionDetail.sessionChip', { hash: shortHash(id, 12) })}
          value={id}
          toastLabel={t('sessionDetail.sessionIdCopied')}
          className="mb-1.5 sm:mb-2"
        />
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fg break-words">
          {loading ? (
            <Skeleton className="h-7 w-48 sm:w-72" />
          ) : (
            (metadata?.name ?? metadata?.room ?? t('sessionDetail.sessionFallbackName', { id }))
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
        {!loading &&
          metadata?.userAgent &&
          (() => {
            const label = formatUserAgentBadge(metadata.userAgent);
            if (!label) return null;
            return (
              <div
                className="flex items-center gap-1.5 mt-1.5 text-[11px] text-fg-faint"
                data-testid="session-user-agent"
                title={metadata.userAgent}
              >
                <MonitorIcon className="size-3 shrink-0" />
                <span className="truncate">{label}</span>
              </div>
            );
          })()}
      </div>

      {/* Action cluster — wraps on tablet, stacks-then-grid on phone */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {loading ? (
          <Skeleton className="h-6 w-20" />
        ) : isRecording !== undefined ? (
          isRecording ? (
            <Badge variant="live" className="gap-1">
              <RadioTower className="size-3 animate-pulse-dot" />
              {t('sessionDetail.recording')}
            </Badge>
          ) : (
            <Badge variant="success">{t('sessionDetail.completed')}</Badge>
          )
        ) : null}

        {viewerCount > 1 && (
          <span
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border bg-surface text-xs text-fg-subtle"
            data-testid="session-presence"
            title={t('sessionDetail.viewersTitle', { n: viewerCount })}
          >
            <Users className="size-3.5 text-success" />
            <span className="tabular-nums">{viewerCount}</span>
            <span className="hidden sm:inline">{t('sessionDetail.viewing')}</span>
          </span>
        )}

        {!loading && summary && <SessionHeaderCopySummary summary={summary} />}
        {metadata?.url && <SessionHeaderCopyUrl url={metadata.url} />}
        {metadata?.url && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="outline" size="sm" className="touch-target">
                <a href={metadata.url} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  <span className="hidden xs:inline sm:inline">{t('sessionDetail.openUrl')}</span>
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('sessionDetail.openCapturedUrl')}</TooltipContent>
          </Tooltip>
        )}

        {(metadata?.name || metadata?.room) && (
          <DevToolsLinkButton
            variant="primary"
            size="sm"
            className="touch-target"
            room={metadata?.name ?? metadata?.room ?? ''}
            recordId={metadata?.recordMode ? metadata.id : undefined}
            label={t('sessionDetail.openInDevTools')}
            title={t('sessionDetail.openInDevToolsTitle')}
          >
            <Bug />
            <span className="hidden xs:inline sm:inline">{t('sessionDetail.openDevTools')}</span>
            <span className="xs:hidden sm:hidden">{t('sessionDetail.devTools')}</span>
          </DevToolsLinkButton>
        )}
      </div>
    </div>
  );
}

function SessionHeaderCopySummary({ summary }: { summary: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success(t('sessionDetail.summaryCopied'), {
        description: t('sessionDetail.summaryCopiedDescription'),
      });
    } catch {
      toast.error(t('sessionDetail.failedToCopy'));
    }
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="touch-target"
          onClick={copy}
          data-testid="session-header-copy-summary"
          aria-label={t('sessionDetail.copySummaryAria')}
        >
          {copied ? <Check /> : <FileText />}
          <span className="hidden xs:inline sm:inline">{t('sessionDetail.copySummary')}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t('sessionDetail.copySummaryTooltip')}</TooltipContent>
    </Tooltip>
  );
}

function SessionHeaderCopyUrl({ url }: { url: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success(t('sessionDetail.urlCopied'));
    } catch {
      toast.error(t('sessionDetail.failedToCopy'));
    }
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="touch-target"
          onClick={copy}
          data-testid="session-header-copy-url"
          aria-label={t('sessionDetail.copyUrlAria')}
        >
          {copied ? <Check /> : <Link2 />}
          <span className="hidden xs:inline sm:inline">{t('sessionDetail.copyUrl')}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t('sessionDetail.copyUrlAria')}</TooltipContent>
    </Tooltip>
  );
}

/* ───────── Replay panel (wraps player + minimap + share + fullscreen) ───────── */

interface ReplayPanelProps {
  events: ReplayEvent[];
  sessionStartMs: number;
  initialReplayOffset: number;
  playheadMsRef: React.MutableRefObject<number>;
  onJumpToReplay: (offsetMs: number) => void;
  /** Numeric record id when this is a DB session (vs. an S3 backup). */
  recordId: number | null;
  /** Bumped by the page's `C` shortcut — CommentsPanel focuses its input. */
  commentFocusSignal: number;
  /** Comment positions (ms-from-session-start) drawn as minimap markers. */
  commentMarkers?: { id: number; timestampMs: number }[];
  /** Error positions (ms-from-session-start) drawn as red minimap ticks. */
  errorMarkers?: { id: string; offsetMs: number }[];
}

function ReplayPanel({
  events,
  sessionStartMs,
  initialReplayOffset,
  playheadMsRef,
  onJumpToReplay,
  recordId,
  commentFocusSignal,
  commentMarkers,
  errorMarkers,
}: ReplayPanelProps) {
  const { t } = useTranslation();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [{ speed, skipInactive }, setPrefs] = useReplayPrefs();
  const [restartToken, setRestartToken] = useState(0);
  const fullscreenSupported =
    typeof document !== 'undefined' && typeof document.fullscreenEnabled === 'boolean'
      ? document.fullscreenEnabled
      : false;

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
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
      if (e.key !== 'f' && e.key !== 'F') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      toggleFullscreen();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // toggleFullscreen reads fresh refs each call — safe to omit from deps
  }, [fullscreenSupported]);

  // `e` jumps to the next error, `Shift+E` to the previous one. Mirrors the
  // ErrorNavButton so keyboard-driven triage works without reaching for it.
  useEffect(() => {
    if (!errorMarkers || errorMarkers.length === 0) return;
    const sorted = errorMarkers.map((m) => m.offsetMs).sort((a, b) => a - b);
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'e' && e.key !== 'E') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      const next = pickErrorOffset(sorted, playheadMsRef.current, e.shiftKey ? -1 : 1);
      if (next !== undefined) {
        e.preventDefault();
        onJumpToReplay(next);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [errorMarkers, playheadMsRef, onJumpToReplay]);

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'space-y-3',
        // Inside fullscreen the wrapper IS the viewport, so paint a
        // background and give it interior padding so the player isn't
        // glued to the screen edges.
        isFullscreen && 'bg-bg p-4 sm:p-6 overflow-auto',
      )}
    >
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <SpeedPicker value={speed} onChange={(next) => setPrefs({ speed: next })} />
        {errorMarkers && errorMarkers.length > 0 && (
          <ErrorNavButton
            errorMarkers={errorMarkers}
            playheadMsRef={playheadMsRef}
            onSeek={onJumpToReplay}
          />
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRestartToken((token) => token + 1)}
          data-testid="replay-restart"
          title={t('sessionDetail.replayRestart')}
        >
          <RotateCcw />
          <span className="hidden sm:inline">{t('sessionDetail.restart')}</span>
        </Button>
        <Button
          variant={skipInactive ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setPrefs({ skipInactive: !skipInactive })}
          aria-pressed={skipInactive}
          data-testid="replay-skip-inactive"
          title={t('sessionDetail.replaySkipIdle')}
        >
          <FastForward />
          <span className="hidden sm:inline">{t('sessionDetail.skipIdle')}</span>
        </Button>
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
              {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            </span>
          </Button>
        )}
        <ShareReplayLinkButton playheadMsRef={playheadMsRef} />
      </div>
      <ReplayMinimap
        events={events}
        sessionStartMs={sessionStartMs}
        onSeek={onJumpToReplay}
        commentMarkers={commentMarkers}
        errorMarkers={errorMarkers}
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
          speed={speed}
          skipInactive={skipInactive}
          restartToken={restartToken}
          onTimeUpdate={(ms) => {
            playheadMsRef.current = ms;
          }}
        />
      </Suspense>
      {recordId !== null && (
        <CommentsPanel
          recordId={recordId}
          playheadMsRef={playheadMsRef}
          onSeek={onJumpToReplay}
          focusSignal={commentFocusSignal}
        />
      )}
    </div>
  );
}

/* ───────── Replay comments ───────── */

function CommentRow({
  comment,
  onSeek,
  onDelete,
  onEditCommit,
  onToggleResolved,
}: {
  comment: {
    id: number;
    timestampMs: number;
    body: string;
    resolved?: boolean;
    author?: string | null;
  };
  onSeek: (offsetMs: number) => void;
  onDelete: () => void;
  onEditCommit: (body: string) => void;
  onToggleResolved: (resolved: boolean) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Mirror server state whenever the prop changes (other tab edits,
  // optimistic rollbacks, refetches).
  useEffect(() => {
    if (!editing) setDraft(comment.body);
  }, [comment.body, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const next = draft.trim().slice(0, 2000);
    setEditing(false);
    if (next && next !== comment.body) {
      onEditCommit(next);
    } else {
      setDraft(comment.body);
    }
  };

  const cancel = () => {
    setDraft(comment.body);
    setEditing(false);
  };

  const resolved = comment.resolved ?? false;

  return (
    <li
      className={cn('flex items-start gap-2 text-xs', resolved && 'opacity-55')}
      data-testid="replay-comment"
      data-resolved={resolved ? 'true' : 'false'}
    >
      <button
        type="button"
        onClick={() => onToggleResolved(!resolved)}
        aria-label={resolved ? 'Reopen comment' : 'Mark comment resolved'}
        aria-pressed={resolved}
        data-testid="replay-comment-resolve"
        className={cn(
          'shrink-0 mt-0.5 transition-colors',
          resolved ? 'text-success' : 'text-fg-faint hover:text-fg',
        )}
      >
        {resolved ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
      </button>
      <button
        type="button"
        onClick={() => onSeek(comment.timestampMs)}
        className="font-mono tabular-nums text-accent hover:underline shrink-0 mt-0.5"
        data-testid="replay-comment-seek"
        aria-label={`Seek to ${formatReplayTimestamp(comment.timestampMs)}`}
      >
        {formatReplayTimestamp(comment.timestampMs)}
      </button>
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          maxLength={2000}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
          className="flex-1 h-6 px-1.5 rounded border border-border bg-surface text-fg focus:outline-none focus:ring-2 focus:ring-ring"
          data-testid="replay-comment-edit-input"
        />
      ) : (
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={cn(
              'w-full text-left text-fg break-words cursor-text hover:bg-bg-muted/60 rounded px-1 -mx-1',
              resolved && 'line-through',
            )}
            data-testid="replay-comment-body"
            title={t('sessionDetail.clickToEdit')}
          >
            {comment.body}
          </button>
          {comment.author && (
            <span
              className="block px-1 -mx-1 text-[10px] text-fg-faint"
              data-testid="replay-comment-author"
            >
              — {comment.author}
            </span>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={onDelete}
        aria-label={t('sessionDetail.deleteComment')}
        data-testid="replay-comment-delete"
        className="opacity-40 hover:opacity-100 text-fg-faint hover:text-danger"
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}

interface ReplayComment {
  id: number;
  timestampMs: number;
  body: string;
  author: string | null;
  createdAt: string;
  resolved?: boolean;
}

function formatReplayTimestamp(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function CommentsPanel({
  recordId,
  playheadMsRef,
  onSeek,
  focusSignal,
}: {
  recordId: number;
  playheadMsRef: React.MutableRefObject<number>;
  onSeek: (offsetMs: number) => void;
  focusSignal: number;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['session-comments', recordId] as const, [recordId]);

  const { data, isLoading } = useQuery<ReplayComment[]>({
    queryKey,
    queryFn: () => apiFetch<ReplayComment[]>(`/sessions/record/${recordId}/comments`),
  });

  const [draft, setDraft] = useState('');
  const [hideResolved, setHideResolved] = useState(false);
  const comments = data ?? [];
  const resolvedCount = comments.filter((c) => c.resolved).length;
  const visibleComments = hideResolved ? comments.filter((c) => !c.resolved) : comments;
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus the input whenever the page's `C` shortcut fires. Skip the
  // initial-mount signal (focusSignal === 0).
  useEffect(() => {
    if (focusSignal === 0) return;
    inputRef.current?.focus();
  }, [focusSignal]);

  const addMutation = useMutation({
    mutationFn: async (input: { timestampMs: number; body: string }) => {
      return apiFetch<ReplayComment>(`/sessions/record/${recordId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<ReplayComment[] | undefined>(queryKey, (prev) =>
        [...(prev ?? []), saved].sort((a, b) => a.timestampMs - b.timestampMs),
      );
      setDraft('');
    },
    onError: () => toast.error("Couldn't save comment"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await apiFetch<void>(`/sessions/record/${recordId}/comments/${commentId}`, {
        method: 'DELETE',
      });
      return commentId;
    },
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<ReplayComment[]>(queryKey);
      queryClient.setQueryData<ReplayComment[] | undefined>(queryKey, (p) =>
        (p ?? []).filter((c) => c.id !== commentId),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      toast.error("Couldn't delete comment");
    },
  });

  const editMutation = useMutation({
    mutationFn: async (input: { id: number; body: string }) => {
      return apiFetch<ReplayComment>(`/sessions/record/${recordId}/comments/${input.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: input.body }),
      });
    },
    onMutate: async ({ id, body }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<ReplayComment[]>(queryKey);
      queryClient.setQueryData<ReplayComment[] | undefined>(queryKey, (p) =>
        (p ?? []).map((c) => (c.id === id ? { ...c, body } : c)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      toast.error("Couldn't update comment");
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (input: { id: number; resolved: boolean }) => {
      return apiFetch<ReplayComment>(`/sessions/record/${recordId}/comments/${input.id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: input.resolved }),
      });
    },
    onMutate: async ({ id, resolved }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<ReplayComment[]>(queryKey);
      queryClient.setQueryData<ReplayComment[] | undefined>(queryKey, (p) =>
        (p ?? []).map((c) => (c.id === id ? { ...c, resolved } : c)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      toast.error("Couldn't update comment");
    },
  });

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    addMutation.mutate({
      timestampMs: Math.max(0, Math.round(playheadMsRef.current)),
      body: text,
    });
  };

  return (
    <Card className="p-4" data-testid="replay-comments-panel">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <MessageSquare className="size-3.5 text-fg-faint" />
          Comments
          {comments.length > 0 && (
            <Badge variant="neutral" size="sm" className="ml-1">
              {comments.length}
            </Badge>
          )}
        </h3>
        {resolvedCount > 0 && (
          <button
            type="button"
            onClick={() => setHideResolved((v) => !v)}
            aria-pressed={hideResolved}
            data-testid="replay-comments-hide-resolved"
            className="text-[11px] text-fg-faint hover:text-fg transition-colors"
          >
            {hideResolved ? `Show resolved (${resolvedCount})` : `Hide resolved (${resolvedCount})`}
          </button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : visibleComments.length === 0 ? (
        <p className="text-xs text-fg-faint mb-3">
          {comments.length === 0
            ? 'No comments yet — add one anchored to the current playhead.'
            : 'All comments resolved.'}
        </p>
      ) : (
        <ol className="space-y-2 mb-3">
          {visibleComments.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              onSeek={onSeek}
              onDelete={() => deleteMutation.mutate(c.id)}
              onEditCommit={(body) => editMutation.mutate({ id: c.id, body })}
              onToggleResolved={(resolved) => resolveMutation.mutate({ id: c.id, resolved })}
            />
          ))}
        </ol>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2"
      >
        <Input
          ref={inputRef}
          placeholder={t('sessionDetail.addCommentPlaceholder')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          data-testid="replay-comment-input"
          leadingIcon={<MessageSquare />}
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!draft.trim() || addMutation.isPending}
          data-testid="replay-comment-add"
        >
          <Plus />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </form>
    </Card>
  );
}

function SpeedPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: 0.5 | 1 | 2 | 4) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5"
      role="group"
      aria-label={t('sessionDetail.playbackSpeed')}
      data-testid="replay-speed-picker"
    >
      {REPLAY_SPEEDS.map((s) => {
        const active = value === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-pressed={active}
            className={cn(
              'h-7 min-w-[2.25rem] px-1.5 rounded text-[11px] font-medium tabular-nums transition-colors',
              active ? 'bg-fg text-bg' : 'text-fg-subtle hover:bg-bg-muted hover:text-fg',
            )}
            data-testid={`replay-speed-${s}`}
          >
            {s}x
          </button>
        );
      })}
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
    const data = e.data as { source?: number; type?: number; x?: number; y?: number } | undefined;
    if (data?.source !== 2 || data?.type !== 2) continue;
    if (typeof data.x !== 'number' || typeof data.y !== 'number') continue;
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
  const { t } = useTranslation();
  return (
    <Card className="p-4 border-warning/40 bg-warning-soft/30" data-testid="rage-click-card">
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-md bg-warning-soft text-warning flex items-center justify-center shrink-0">
          <Zap className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-fg">
            {clicks.length === 1
              ? t('sessionDetail.rageClickOne')
              : t('sessionDetail.rageClickOther', { n: clicks.length })}
          </h3>
          <p className="text-xs text-fg-subtle mt-0.5">{t('sessionDetail.rageClickDesc')}</p>
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
                    <span className="ml-1 text-[10px] text-fg-faint font-mono">×{c.count}</span>
                  </Button>
                </li>
              );
            })}
            {clicks.length > 5 && (
              <li className="text-[11px] text-fg-faint self-center">+{clicks.length - 5} more</li>
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
/**
 * Pick the next (dir=1) or previous (dir=-1) error offset relative to the
 * current playhead, wrapping around at the ends so the control always does
 * something. `sortedOffsets` must be ascending.
 */
function pickErrorOffset(sortedOffsets: number[], here: number, dir: 1 | -1): number | undefined {
  if (sortedOffsets.length === 0) return undefined;
  const target =
    dir === 1
      ? sortedOffsets.find((o) => o > here + 1)
      : [...sortedOffsets].reverse().find((o) => o < here - 1);
  const fallback = dir === 1 ? sortedOffsets[0] : sortedOffsets[sortedOffsets.length - 1];
  return target ?? fallback;
}

function ErrorNavButton({
  errorMarkers,
  playheadMsRef,
  onSeek,
}: {
  errorMarkers: { id: string; offsetMs: number }[];
  playheadMsRef: React.MutableRefObject<number>;
  onSeek: (offsetMs: number) => void;
}) {
  const { t } = useTranslation();
  const sortedOffsets = useMemo(
    () => errorMarkers.map((m) => m.offsetMs).sort((a, b) => a - b),
    [errorMarkers],
  );

  const seekRelative = (dir: 1 | -1) => {
    const next = pickErrorOffset(sortedOffsets, playheadMsRef.current, dir);
    if (next !== undefined) onSeek(next);
  };

  return (
    <div className="inline-flex items-center rounded-md border border-danger-soft bg-danger-soft/40 text-danger">
      <button
        type="button"
        onClick={() => seekRelative(-1)}
        aria-label={t('sessionDetail.prevError')}
        data-testid="replay-prev-error"
        className="inline-flex items-center justify-center h-8 px-1.5 hover:bg-danger-soft rounded-l-md"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="inline-flex items-center gap-1 px-1.5 text-[11px] font-medium tabular-nums">
        <AlertTriangle className="size-3" />
        {sortedOffsets.length}
      </span>
      <button
        type="button"
        onClick={() => seekRelative(1)}
        aria-label={t('sessionDetail.nextError')}
        data-testid="replay-next-error"
        className="inline-flex items-center justify-center h-8 px-1.5 hover:bg-danger-soft rounded-r-md"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

function ReplayMinimap({
  events,
  sessionStartMs,
  onSeek,
  commentMarkers,
  errorMarkers,
}: {
  events: ReplayEvent[];
  sessionStartMs: number;
  onSeek: (offsetMs: number) => void;
  /** Comment positions (ms-from-session-start) to render as marker pins. */
  commentMarkers?: { id: number; timestampMs: number }[];
  /** Error positions (ms-from-session-start) to render as red ticks. */
  errorMarkers?: { id: string; offsetMs: number }[];
}) {
  const { t } = useTranslation();
  const BUCKETS = 96;

  const { buckets, totalMs } = useMemo(() => {
    if (events.length === 0) return { buckets: [] as number[], totalMs: 0 };
    const start = sessionStartMs;
    const end = events[events.length - 1].timestamp;
    const span = Math.max(1, end - start);
    const arr = new Array<number>(BUCKETS).fill(0);
    for (const e of events) {
      const ratio = (e.timestamp - start) / span;
      const idx = Math.min(BUCKETS - 1, Math.max(0, Math.floor(ratio * BUCKETS)));
      arr[idx] += 1;
    }
    return { buckets: arr, totalMs: span };
  }, [events, sessionStartMs]);

  if (events.length === 0 || totalMs === 0) return null;

  const max = buckets.reduce((m, n) => (n > m ? n : m), 0) || 1;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(Math.round(ratio * totalMs));
  };

  return (
    <Card className="p-2.5">
      <div className="flex items-center justify-between mb-1.5 text-[10px] uppercase tracking-wider text-fg-faint font-semibold">
        <span>{t('sessionDetail.minimapActivity')}</span>
        <span className="text-fg-faint normal-case tracking-normal">
          {t('sessionDetail.minimapClickToSeek')}
        </span>
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label={t('sessionDetail.minimapAria')}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSeek(totalMs / 2);
          }
        }}
        className="relative flex h-10 items-end gap-px cursor-pointer rounded-sm overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        {(errorMarkers ?? []).map((m) => {
          const ratio = Math.min(1, Math.max(0, m.offsetMs / totalMs));
          return (
            <button
              key={m.id}
              type="button"
              aria-label={t('sessionDetail.jumpToError')}
              data-testid="replay-minimap-error"
              onClick={(e) => {
                e.stopPropagation();
                onSeek(m.offsetMs);
              }}
              className="absolute top-0 bottom-0 w-0.5 bg-danger hover:w-1 transition-all"
              style={{ left: `calc(${ratio * 100}% - 1px)` }}
            />
          );
        })}
        {(commentMarkers ?? []).map((m) => {
          const ratio = Math.min(1, Math.max(0, m.timestampMs / totalMs));
          return (
            <button
              key={m.id}
              type="button"
              aria-label={t('sessionDetail.jumpToComment')}
              data-testid="replay-minimap-comment"
              onClick={(e) => {
                e.stopPropagation();
                onSeek(m.timestampMs);
              }}
              className="absolute top-0 bottom-0 w-0.5 bg-accent hover:w-1 transition-all"
              style={{ left: `calc(${ratio * 100}% - 1px)` }}
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
      typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
    const url = playhead > 0 ? `${base}?t=${playhead}` : base;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      toast.success('Share link copied', {
        description:
          playhead > 0
            ? `Opens the replay at ${formatPlayhead(playhead)}.`
            : 'Opens the replay from the beginning.',
      });
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={() => void copy()} data-testid="share-replay-link">
      <Link2 />
      {copied ? 'Copied' : 'Share link to current time'}
    </Button>
  );
}

function formatPlayhead(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ───────── Metric tile ───────── */

function MetricTile({
  icon: Icon,
  label,
  value,
  mono,
  copy,
  copyToastLabel,
  className,
}: {
  icon: typeof Activity;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  /** Optional raw value to copy when the tile's copy chip is clicked. */
  copy?: string;
  copyToastLabel?: string;
  /** Divider/border classes — the tiles render as cells of one strip. */
  className?: string;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!copy) return;
    try {
      await navigator.clipboard.writeText(copy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      if (copyToastLabel) toast.success(copyToastLabel);
    } catch {
      toast.error(t('sessionDetail.failedToCopy'));
    }
  };

  return (
    <div className={cn('group relative p-4', className)}>
      <div className="flex items-center gap-2 text-fg-faint mb-1.5">
        <Icon className="size-3.5" />
        <span className="text-[11px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      {value === null ? (
        <Skeleton className="h-6 w-20" />
      ) : (
        <div className={cn('text-base font-semibold text-fg truncate', mono && 'font-mono')}>
          {value}
        </div>
      )}
      {copy && (
        <button
          type="button"
          onClick={() => void onCopy()}
          aria-label={copyToastLabel ?? t('sessionDetail.copyMetric', { label })}
          className={cn(
            'absolute top-2 right-2 size-6 inline-flex items-center justify-center rounded-md',
            'text-fg-faint hover:text-fg hover:bg-bg-muted',
            'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity',
          )}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      )}
    </div>
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
      toast.error('Failed to copy');
    }
  };
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      data-testid="copy-chip"
      className={cn(
        'group inline-flex items-center gap-2 text-[11px] sm:text-xs text-fg-faint hover:text-fg transition-colors',
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

/* ───────── Overview: top errors card ───────── */

function TopErrorsCard({
  rows,
  onJumpToConsole,
  onJumpToReplay,
  sessionStartMs,
}: {
  rows: ConsoleRow[];
  onJumpToConsole: () => void;
  onJumpToReplay?: (offsetMs: number) => void;
  sessionStartMs?: number;
}) {
  // Show the most recent 3 — sort by timestamp desc, slice.
  const recent = useMemo(
    () => [...rows].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3),
    [rows],
  );

  return (
    <Card className="p-4 border-danger-soft bg-danger-soft/40" data-testid="overview-top-errors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bug className="size-4 text-danger" />
          <h3 className="text-sm font-semibold text-fg">
            Console errors
            <span className="ml-2 text-fg-faint font-normal">({rows.length} total)</span>
          </h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onJumpToConsole}
          data-testid="overview-top-errors-jump"
        >
          See all
        </Button>
      </div>
      <ul className="space-y-1.5">
        {recent.map((r) => {
          const canJump = onJumpToReplay && sessionStartMs !== undefined;
          return (
            <li key={r.id} data-testid="overview-top-error-row">
              <button
                type="button"
                disabled={!canJump}
                onClick={
                  canJump
                    ? () => onJumpToReplay(normaliseOffsetMs(r.timestamp, sessionStartMs))
                    : undefined
                }
                data-testid="overview-top-error-jump"
                className={cn(
                  'flex items-start gap-2 text-[12px] font-mono w-full text-left rounded px-1 -mx-1',
                  canJump && 'hover:bg-danger-soft/60 cursor-pointer',
                )}
                title={canJump ? 'Jump to this moment in the replay' : undefined}
              >
                <span className="text-fg-faint shrink-0 tabular-nums">
                  {formatTimestampWithMillis(r.timestamp)}
                </span>
                <span className="text-danger truncate">{r.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function FailedRequestsCard({
  rows,
  onJumpToNetwork,
  onJumpToReplay,
  sessionStartMs,
}: {
  rows: NetworkRow[];
  onJumpToNetwork: () => void;
  onJumpToReplay?: (offsetMs: number) => void;
  sessionStartMs?: number;
}) {
  const recent = useMemo(
    () => [...rows].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3),
    [rows],
  );

  return (
    <Card
      className="p-4 border-danger-soft bg-danger-soft/40"
      data-testid="overview-failed-requests"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-danger" />
          <h3 className="text-sm font-semibold text-fg">
            Failed requests
            <span className="ml-2 text-fg-faint font-normal">({rows.length} total)</span>
          </h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onJumpToNetwork}
          data-testid="overview-failed-requests-jump"
        >
          See all
        </Button>
      </div>
      <ul className="space-y-1.5">
        {recent.map((r) => {
          const canJump = onJumpToReplay && sessionStartMs !== undefined;
          return (
            <li key={r.id} data-testid="overview-failed-request-row">
              <button
                type="button"
                disabled={!canJump}
                onClick={
                  canJump
                    ? () => onJumpToReplay(normaliseOffsetMs(r.timestamp, sessionStartMs))
                    : undefined
                }
                data-testid="overview-failed-request-jump"
                className={cn(
                  'flex items-center gap-2 text-[12px] font-mono w-full text-left rounded px-1 -mx-1',
                  canJump && 'hover:bg-danger-soft/60 cursor-pointer',
                )}
                title={canJump ? 'Jump to this moment in the replay' : undefined}
              >
                <span className="text-danger shrink-0 tabular-nums w-9">{r.status}</span>
                <span className="text-fg-faint shrink-0">{r.method}</span>
                <span className="text-fg-subtle truncate">{r.url}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function SessionInsightsCard({
  insights,
  onJump,
}: {
  insights: SessionInsight[];
  onJump: (offsetMs: number) => void;
}) {
  const { t } = useTranslation();
  if (insights.length === 0) return null;
  return (
    <Card className="p-4" data-testid="session-insights">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="size-4 text-accent" />
        <h3 className="text-sm font-semibold text-fg">{t('sessionDetail.insights')}</h3>
      </div>
      <ul className="space-y-1.5">
        {insights.map((insight, i) => (
          <li key={i} data-testid="session-insight-row">
            {insight.jumpMs !== undefined ? (
              <button
                type="button"
                onClick={() => onJump(insight.jumpMs as number)}
                data-testid="session-insight-jump"
                className="flex items-start gap-2 text-xs text-fg-subtle w-full text-left rounded px-1 -mx-1 hover:bg-bg-muted/60 hover:text-fg cursor-pointer"
                title={t('sessionDetail.jumpToMomentTitle')}
              >
                <PlayCircle className="size-3.5 mt-0.5 shrink-0 text-fg-faint" />
                <span>{insight.text}</span>
              </button>
            ) : (
              <div className="flex items-start gap-2 text-xs text-fg-subtle px-1 -mx-1">
                <Check className="size-3.5 mt-0.5 shrink-0 text-success" />
                <span>{insight.text}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
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
  const { t } = useTranslation();
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
          title={t('sessionDetail.noEventsTitle')}
          description={t('sessionDetail.noEventsDesc')}
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
              <span className="text-sm font-medium text-fg flex-1">{meta.name}</span>
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
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  // Multi-select event-type filter. Empty set = show everything. Matches
  // the ActivityFeed kind filter mental model so the user only needs to
  // learn one toggle pattern across the app.
  const [activeTypes, setActiveTypes] = useState<Set<number>>(new Set());
  // Cursor for keyboard navigation. -1 = no row focused yet; revealed
  // on first j / k press.
  const [cursorIdx, setCursorIdx] = useState<number>(-1);

  const types = useMemo(() => {
    const set = new Set<number>();
    events.forEach((e) => set.add(e.type));
    return Array.from(set).sort((a, b) => a - b);
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (activeTypes.size > 0 && !activeTypes.has(e.type)) return false;
      if (search) {
        const meta = getEventMeta(e.type);
        const match =
          meta.name.toLowerCase().includes(search.toLowerCase()) ||
          String(e.timestamp).includes(search);
        if (!match) return false;
      }
      return true;
    });
  }, [events, activeTypes, search]);

  const toggleType = (item: number) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };
  const clearTypes = () => setActiveTypes(new Set());

  // Reset cursor whenever the visible result set changes — the row at
  // `cursorIdx` might no longer exist.
  useEffect(() => {
    setCursorIdx(-1);
  }, [activeTypes, search]);

  // j / k navigation, Enter jumps the replay to that moment. Consistent
  // with the Sessions list — same keys, same Linear/Gmail mental model.
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
          requestAnimationFrame(() => {
            const el = document.querySelector<HTMLElement>(`[data-timeline-row="${clamped}"]`);
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
          if (cursorIdx < 0) return;
          const ev = filtered[cursorIdx];
          if (!ev) return;
          e.preventDefault();
          onJumpToReplay(Math.max(0, ev.timestamp - sessionStartMs));
          return;
        }
        default:
          return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filtered, cursorIdx, onJumpToReplay, sessionStartMs]);

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
          title={t('sessionDetail.emptyTimelineTitle')}
          description={t('sessionDetail.emptyTimelineDesc')}
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
          placeholder={t('sessionDetail.filterEventsPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leadingIcon={<Activity />}
          trailingIcon={
            search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label={t('sessionDetail.clearFilter')}
              >
                <X className="size-3.5" />
              </button>
            ) : undefined
          }
        />
        {/* Desktop list */}
        <div className="hidden lg:block">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] uppercase tracking-wider text-fg-faint font-semibold">
              Type
            </span>
            {activeTypes.size > 0 && (
              <button
                type="button"
                onClick={clearTypes}
                className="text-[10px] uppercase tracking-wider text-fg-faint hover:text-fg font-semibold"
              >
                Clear
              </button>
            )}
          </div>
          <ul className="space-y-0.5">
            <li>
              <FilterRow
                active={activeTypes.size === 0}
                onClick={clearTypes}
                label="All types"
                count={events.length}
              />
            </li>
            {types.map((item) => {
              const meta = getEventMeta(item);
              const count = events.filter((e) => e.type === item).length;
              const Icon = meta.icon;
              return (
                <li key={item}>
                  <FilterRow
                    active={activeTypes.has(item)}
                    onClick={() => toggleType(item)}
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
              active={activeTypes.size === 0}
              onClick={clearTypes}
              label="All"
              count={events.length}
            />
            {types.map((item) => {
              const meta = getEventMeta(item);
              const count = events.filter((e) => e.type === item).length;
              const Icon = meta.icon;
              return (
                <FilterChip
                  key={item}
                  active={activeTypes.has(item)}
                  onClick={() => toggleType(item)}
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
            <span className="font-medium text-fg-subtle">{filtered.length}</span> events
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
          cursorIdx={cursorIdx}
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
        'h-7 px-2.5 rounded-full border text-[12px] font-medium shrink-0',
        'inline-flex items-center gap-1.5 transition-colors',
        active
          ? 'bg-fg text-bg border-fg'
          : 'bg-surface border-border text-fg-subtle hover:border-border-strong hover:text-fg',
      )}
      aria-pressed={active}
    >
      {icon}
      <span>{label}</span>
      <span
        className={cn(
          'font-mono tabular-nums text-[10px]',
          active ? 'text-bg/80' : 'text-fg-faint',
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
  cursorIdx,
}: {
  events: ReplayEvent[];
  sessionStartMs: number;
  onJumpToReplay: (offsetMs: number) => void;
  highlight?: string;
  cursorIdx?: number;
}) {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36, // px per row, matches py-2 + 24px content
    overscan: 12,
  });

  // When the keyboard cursor moves to a row that's been virtualised out
  // of view, scroll the virtualizer to bring it into the window.
  useEffect(() => {
    if (cursorIdx === undefined || cursorIdx < 0) return;
    if (cursorIdx >= events.length) return;
    virtualizer.scrollToIndex(cursorIdx, { align: 'auto' });
  }, [cursorIdx, events.length, virtualizer]);

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
      <ol className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
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
                data-timeline-row={virtualRow.index}
                className={cn(
                  'group flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-bg-muted/50 focus-visible:bg-bg-muted/50 focus-visible:outline-none transition-colors',
                  cursorIdx === virtualRow.index && 'bg-accent-soft/40',
                )}
                title={t('sessionDetail.jumpToPointTitle')}
              >
                <span className="w-10 shrink-0 text-right text-[10px] text-fg-faint font-mono tabular-nums">
                  {virtualRow.index + 1}
                </span>
                <span
                  className={cn(
                    'size-6 shrink-0 rounded-md border flex items-center justify-center',
                    'border-border bg-bg-muted text-fg-subtle',
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

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let re: RegExp;
  try {
    re = new RegExp(`(${escaped})`, 'ig');
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
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors',
        active ? 'bg-bg-muted text-fg' : 'text-fg-subtle hover:bg-bg-muted/60 hover:text-fg',
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      <span className="font-mono tabular-nums text-fg-faint">{count}</span>
    </button>
  );
}

/* ───────── Raw tab ───────── */

function RawTab({ events, loading }: { events: ReplayEvent[]; loading: boolean }) {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);
  const json = useMemo(() => JSON.stringify(events, null, 2), [events]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success('Copied to clipboard', {
        description: `${events.length} events`,
      });
    } catch {
      toast.error('Failed to copy');
    }
  };

  const download = () => {
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${id ?? 'events'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Defer revocation by a tick so Safari has the URL when it queues the
      // download request.
      setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success('Download started', {
        description: `${events.length} events · ${(json.length / 1024).toFixed(1)} kB`,
      });
    } catch {
      toast.error('Failed to download');
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
        <EmptyState
          icon={FileJson}
          title={t('sessionDetail.noData')}
          description={t('sessionDetail.noDataDesc')}
        />
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
          <Button variant="ghost" size="sm" onClick={download} data-testid="raw-download">
            <Download />
            <span className="hidden xs:inline sm:inline">{t('sessionDetail.download')}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void copy()} data-testid="raw-copy">
            <Copy />
            {copied ? 'Copied' : 'Copy'}
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
