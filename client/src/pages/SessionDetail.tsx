import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bug,
  Calendar,
  Check,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  Globe,
  Hash,
  Layers,
  Lightbulb,
  Link2,
  ListTree,
  Monitor as MonitorIcon,
  PlayCircle,
  Plus,
  RotateCcw,
  StickyNote,
  Tag,
  Terminal,
  RadioTower,
  Smartphone,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import type { ReplayEvent, RawEvent } from '@/components/session-detail/normaliseEvent';
import type { ReplayComment } from '@/components/session-detail/ReplayTab';

import { DevToolsLinkButton } from '@/components/DevToolsLinkButton';
import { SessionPreviewCard } from '@/components/replay/SessionPreviewCard';
import {
  formatBytes,
  formatPlayhead,
  formatTimestampWithMillis,
  normaliseOffsetMs,
} from '@/components/session-detail/event-utils';
import { normaliseEvent } from '@/components/session-detail/normaliseEvent';
import { OverviewTab } from '@/components/session-detail/OverviewTab';
import { RawJsonTab } from '@/components/session-detail/RawJsonTab';
import { ReplayTab } from '@/components/session-detail/ReplayTab';
import { TimelineTab } from '@/components/session-detail/TimelineTab';
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
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toaster';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { apiFetch } from '@/lib/api';
import { buildCurlCommand } from '@/lib/curl';
import { formatDurationFromNanos, shortHash } from '@/lib/format';
import { buildHar } from '@/lib/har';
import i18n from '@/lib/i18n';
import { usePresence } from '@/lib/presence';
import { recordSessionVisit } from '@/lib/recent-sessions';
import { useDocumentTitle } from '@/lib/use-document-title';
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
  useDocumentTitle(id ? `${t('sidebar.sessions')} · ${id}` : t('sidebar.sessions'));
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

  const {
    data: metadata,
    isLoading: metaLoading,
    isError: metaError,
  } = useQuery({
    queryKey: ['session-metadata', id],
    queryFn: () => apiFetch<SessionMetadata>(`/api/session-replay/sessions/${id}`),
    enabled: !!id,
    meta: { suppressToast: true },
  });

  const {
    data: rawEvents,
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
    isFetching: eventsFetching,
  } = useQuery({
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

  // rrweb's onTimeUpdate writer lives here, next to the useRef, because the
  // React Compiler only allows `.current` writes where it can prove the value
  // is a ref — inside ReplayTab `playheadMsRef` is an opaque prop.
  const updatePlayheadMs = (ms: number) => {
    playheadMsRef.current = ms;
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
    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
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
    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
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
    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  }, []);

  if (metaError && !metaLoading) {
    return (
      <div className="safe-px py-5 sm:py-6 max-w-7xl mx-auto">
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
        <EmptyState
          title={t('sessionDetail.sessionNotFound')}
          description={t('sessionDetail.sessionNotFoundDesc')}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/sessions">{t('sessionDetail.backToSessions')}</Link>
            </Button>
          }
        />
      </div>
    );
  }

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
            <div className="space-y-3">
              <div className="flex items-center justify-end gap-2 flex-wrap">
                <Skeleton className="h-9 w-64" />
              </div>
              <Card className="p-2.5">
                <Skeleton className="h-10 w-full" />
              </Card>
              <Card className="p-6">
                <Skeleton className="h-[420px] w-full" />
              </Card>
            </div>
          ) : eventsError ? (
            <Card>
              <EmptyState
                icon={AlertTriangle}
                title={t('sessionDetail.replayLoadFailedTitle')}
                description={t('sessionDetail.replayLoadFailedDesc')}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void refetchEvents()}
                    disabled={eventsFetching}
                    data-testid="replay-retry"
                  >
                    <RotateCcw className={cn(eventsFetching && 'animate-spin')} />
                    {eventsFetching ? t('common.retrying') : t('common.retry')}
                  </Button>
                }
              />
            </Card>
          ) : (
            <ReplayTab
              events={events ?? []}
              sessionStartMs={sessionStartMs}
              initialReplayOffset={initialReplayOffset}
              playheadMsRef={playheadMsRef}
              onPlayheadUpdate={updatePlayheadMs}
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
          <RawJsonTab events={events ?? []} loading={eventsLoading} />
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
  const { data, isLoading, isError } = useQuery<NetworkRow[]>({
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

  const networkFiltersActive =
    filter !== '' || activeTypes.size > 0 || activeStatusClasses.size > 0;
  const resetNetworkFilters = () => {
    setFilter('');
    setActiveTypes(new Set());
    setActiveStatusClasses(new Set());
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
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
        <Card className="overflow-hidden p-0">
          <div className="px-3 py-2 border-b border-border bg-bg-subtle">
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (isError) {
    return <Card className="p-6 text-sm text-fg-subtle text-center">{t('common.loadFailed')}</Card>;
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
              {sorted.length === 0 ? (
                <tr data-testid="session-network-no-match">
                  <td colSpan={6} className="px-3 py-10 text-center">
                    <p className="text-sm font-medium text-fg">
                      {t('sessionDetail.noFilterMatchTitle')}
                    </p>
                    <p className="text-sm text-fg-subtle mt-1 mb-3">
                      {t('sessionDetail.noFilterMatchDescription')}
                    </p>
                    {networkFiltersActive && (
                      <Button variant="outline" size="sm" onClick={resetNetworkFilters}>
                        {t('sessionDetail.resetFilters')}
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                sorted.map((r) => (
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
                ))
              )}
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
  const { data, isLoading, isError } = useQuery<ConsoleRow[]>({
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

  const consoleFiltersActive = filter !== '' || activeLevels.size > 0;
  const resetConsoleFilters = () => {
    setFilter('');
    setActiveLevels(new Set());
  };

  // Shared serialisation so the clipboard copy and the file export can never
  // drift in format.
  const serialiseFiltered = () =>
    filtered
      .map((r) => `[${new Date(r.timestamp).toISOString()}] [${r.level.toUpperCase()}] ${r.text}`)
      .join('\n');

  const copyFiltered = async () => {
    if (filtered.length === 0) return;
    try {
      await navigator.clipboard.writeText(serialiseFiltered() + '\n');
      toast.success(t('sessionDetail.consoleCopied'), {
        description: t(
          filtered.length === 1
            ? 'sessionDetail.messageCountOne'
            : 'sessionDetail.messageCountOther',
          { n: filtered.length },
        ),
      });
    } catch {
      toast.error(t('sessionDetail.failedToCopy'));
    }
  };

  const exportFiltered = () => {
    const blob = new Blob([serialiseFiltered() + '\n'], { type: 'text/plain' });
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
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-9 w-24" />
          <div className="flex items-center gap-1.5 flex-wrap">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-16 rounded-full" />
            ))}
          </div>
        </div>
        <Card className="overflow-hidden p-0">
          <div className="px-3 py-2 border-b border-border bg-bg-subtle">
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (isError) {
    return <Card className="p-6 text-sm text-fg-subtle text-center">{t('common.loadFailed')}</Card>;
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
          onClick={copyFiltered}
          data-testid="session-console-copy"
          title={t('sessionDetail.copyConsoleTitle')}
          disabled={filtered.length === 0}
        >
          <Copy />
          <span className="hidden sm:inline">{t('sessionDetail.copyConsole')}</span>
        </Button>
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
        {filtered.length === 0 ? (
          <div className="px-3 py-10 text-center" data-testid="session-console-no-match">
            <p className="text-sm font-medium text-fg">{t('sessionDetail.noFilterMatchTitle')}</p>
            <p className="text-sm text-fg-subtle mt-1 mb-3">
              {t('sessionDetail.noFilterMatchDescription')}
            </p>
            {consoleFiltersActive && (
              <Button variant="outline" size="sm" onClick={resetConsoleFilters}>
                {t('sessionDetail.resetFilters')}
              </Button>
            )}
          </div>
        ) : (
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
        )}
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
            onKeyDown={(e) => {
              if (e.key === 'Escape' && showSuggest) {
                e.preventDefault();
                e.stopPropagation();
                setShowSuggest(false);
              }
            }}
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
            aria-live="polite"
            aria-atomic="true"
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
                <a
                  href={metadata.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t('sessionDetail.openUrl')}
                >
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
            label={t('sessionDetail.openDevTools')}
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
 * then walk the list with a sliding globalThis.
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
          <h2 className="text-sm font-semibold text-fg">
            {clicks.length === 1
              ? t('sessionDetail.rageClickOne')
              : t('sessionDetail.rageClickOther', { n: clicks.length })}
          </h2>
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
              <li className="text-[11px] text-fg-faint self-center">
                {t('sessionDetail.moreCount', { n: clicks.length - 5 })}
              </li>
            )}
          </ul>
        </div>
      </div>
    </Card>
  );
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
      globalThis.setTimeout(() => setCopied(false), 1500);
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
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      globalThis.setTimeout(() => setCopied(false), 1500);
      toast.success(toastLabel);
    } catch {
      toast.error(t('sessionDetail.failedToCopy'));
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
  const { t } = useTranslation();
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
          <h2 className="text-sm font-semibold text-fg">
            {t('sessionDetail.consoleErrors')}
            <span className="ml-2 text-fg-faint font-normal">
              {t('sessionDetail.totalCount', { n: rows.length })}
            </span>
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onJumpToConsole}
          data-testid="overview-top-errors-jump"
        >
          {t('sessionDetail.seeAll')}
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
                title={canJump ? t('sessionDetail.jumpToMomentTitle') : undefined}
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
  const { t } = useTranslation();
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
          <h2 className="text-sm font-semibold text-fg">
            {t('sessionDetail.failedRequests')}
            <span className="ml-2 text-fg-faint font-normal">
              {t('sessionDetail.totalCount', { n: rows.length })}
            </span>
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onJumpToNetwork}
          data-testid="overview-failed-requests-jump"
        >
          {t('sessionDetail.seeAll')}
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
                title={canJump ? t('sessionDetail.jumpToMomentTitle') : undefined}
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
        <h2 className="text-sm font-semibold text-fg">{t('sessionDetail.insights')}</h2>
      </div>
      <ul className="space-y-1.5">
        {insights.map((insight, i) => (
          <li key={i} data-testid="session-insight-row">
            {insight.jumpMs !== undefined ? (
              <button
                type="button"
                onClick={() => onJump(insight.jumpMs as number)}
                data-testid="session-insight-jump"
                className="flex items-start gap-2 text-xs text-fg-subtle w-full text-left rounded px-1 py-1.5 -mx-1 hover:bg-bg-muted/60 hover:text-fg cursor-pointer"
                title={t('sessionDetail.jumpToMomentTitle')}
              >
                <PlayCircle className="size-3.5 mt-0.5 shrink-0 text-fg-faint" />
                <span>{insight.text}</span>
              </button>
            ) : (
              <div className="flex items-start gap-2 text-xs text-fg-subtle px-1 py-1.5 -mx-1">
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
