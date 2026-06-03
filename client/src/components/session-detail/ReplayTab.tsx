import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  FastForward,
  Link2,
  Maximize2,
  MessageSquare,
  Minimize2,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toaster';
import { apiFetch } from '@/lib/api';
import { REPLAY_SPEEDS, useReplayPrefs } from '@/lib/replay-prefs';
import { cn } from '@/lib/utils';

import { formatPlayhead } from './event-utils';
import type { ReplayEvent } from './normaliseEvent';

const ReplayPlayer = lazy(() =>
  import('@/components/replay/ReplayPlayer').then((m) => ({
    default: m.ReplayPlayer,
  })),
);

export interface ReplayComment {
  id: number;
  timestampMs: number;
  body: string;
  author: string | null;
  createdAt: string;
  resolved?: boolean;
}

interface ReplayTabProps {
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

export function ReplayTab({
  events,
  sessionStartMs,
  initialReplayOffset,
  playheadMsRef,
  onJumpToReplay,
  recordId,
  commentFocusSignal,
  commentMarkers,
  errorMarkers,
}: ReplayTabProps) {
  const { t } = useTranslation();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [{ speed, skipInactive }, setPrefs] = useReplayPrefs();
  const [restartToken, setRestartToken] = useState(0);

  // Last offset a seek aimed at, plus a monotonic nonce so the minimap's
  // arrival pulse replays even when the user jumps to the same error twice.
  // `seekTo` wraps the page-level jump so every seek path (minimap click,
  // error-nav button, keyboard E/Shift+E) feeds the minimap one signal.
  const [lastSeek, setLastSeek] = useState<{ ms: number; nonce: number } | null>(null);
  const seekTo = useCallback(
    (offsetMs: number) => {
      setLastSeek((prev) => ({ ms: offsetMs, nonce: (prev?.nonce ?? 0) + 1 }));
      onJumpToReplay(offsetMs);
    },
    [onJumpToReplay],
  );

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
        seekTo(next);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [errorMarkers, playheadMsRef, seekTo]);

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
            onSeek={seekTo}
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
              {isFullscreen ? t('sessionDetail.exitFullscreen') : t('sessionDetail.fullscreen')}
            </span>
          </Button>
        )}
        <ShareReplayLinkButton playheadMsRef={playheadMsRef} />
      </div>
      <ReplayMinimap
        events={events}
        sessionStartMs={sessionStartMs}
        onSeek={seekTo}
        commentMarkers={commentMarkers}
        errorMarkers={errorMarkers}
        playheadMsRef={playheadMsRef}
        seekTargetMs={lastSeek?.ms ?? null}
        seekNonce={lastSeek?.nonce ?? 0}
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
        aria-label={
          resolved ? t('sessionDetail.reopenComment') : t('sessionDetail.markCommentResolved')
        }
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
        aria-label={t('sessionDetail.seekTo', { time: formatReplayTimestamp(comment.timestampMs) })}
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
    onError: () => toast.error(t('sessionDetail.couldntSaveComment')),
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
      toast.error(t('sessionDetail.couldntDeleteComment'));
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
      toast.error(t('sessionDetail.couldntUpdateComment'));
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
      toast.error(t('sessionDetail.couldntUpdateComment'));
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
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <MessageSquare className="size-3.5 text-fg-faint" />
          {t('sessionDetail.comments')}
          {comments.length > 0 && (
            <Badge variant="neutral" size="sm" className="ml-1">
              {comments.length}
            </Badge>
          )}
        </h2>
        {resolvedCount > 0 && (
          <button
            type="button"
            onClick={() => setHideResolved((v) => !v)}
            aria-pressed={hideResolved}
            data-testid="replay-comments-hide-resolved"
            className="text-[11px] text-fg-faint hover:text-fg transition-colors"
          >
            {hideResolved
              ? t('sessionDetail.showResolved', { n: resolvedCount })
              : t('sessionDetail.hideResolved', { n: resolvedCount })}
          </button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : visibleComments.length === 0 ? (
        <p className="text-xs text-fg-faint mb-3">
          {comments.length === 0
            ? t('sessionDetail.noCommentsYet')
            : t('sessionDetail.allCommentsResolved')}
        </p>
      ) : (
        <ol className="space-y-2 mb-3" aria-live="polite" aria-relevant="additions removals">
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
          <span className="hidden sm:inline">{t('sessionDetail.add')}</span>
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

/* ───────── Replay minimap ───────── */

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
  commentMarkers,
  errorMarkers,
  playheadMsRef,
  seekTargetMs,
  seekNonce = 0,
}: {
  events: ReplayEvent[];
  sessionStartMs: number;
  onSeek: (offsetMs: number) => void;
  /** Comment positions (ms-from-session-start) to render as marker pins. */
  commentMarkers?: { id: number; timestampMs: number }[];
  /** Error positions (ms-from-session-start) to render as red ticks. */
  errorMarkers?: { id: string; offsetMs: number }[];
  /** Live playhead position so the bar reads as a position instrument, not
   * just a static density histogram. Polled, never re-renders the page. */
  playheadMsRef?: React.MutableRefObject<number>;
  /** The offset the last seek targeted — the nearest error tick pulses once
   * to confirm the jump landed ("scrub to failure"). */
  seekTargetMs?: number | null;
  /** Bumped on every seek so the arrival pulse replays even on a repeat jump
   * to the same error. */
  seekNonce?: number;
}) {
  const { t } = useTranslation();
  // Denser than before (was 96): a finer histogram resolves a burst of
  // events from a lull at a glance, which is the whole point of the strip
  // during triage. CSS clamps the column width so it stays crisp.
  const BUCKETS = 160;

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

  // Live playhead: drive a CSS variable on the track via rAF reading the
  // shared ref. The marker translates (not `left`) so the browser composites
  // it — and a `transition` on transform makes a seek *glide* to its target
  // instead of teleporting, the "scrub to failure" feel. No React re-render
  // per tick, preserving the page's existing playhead-in-a-ref design.
  const trackRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!playheadMsRef || totalMs === 0) return;
    let raf = 0;
    let last = -1;
    const tick = () => {
      const el = trackRef.current;
      if (el) {
        const ratio = Math.min(1, Math.max(0, playheadMsRef.current / totalMs));
        if (ratio !== last) {
          // A large jump is a deliberate seek — let the playhead *glide* to
          // its target so the eye follows the scrub. Frame-to-frame playback
          // drift is tiny, so we cut the ease to a hair and the line tracks
          // the player tightly instead of lagging behind.
          const seek = Math.abs(ratio - last) > 0.02 && last >= 0;
          el.style.setProperty('--ph-ease', seek ? '360ms' : '90ms');
          last = ratio;
          el.style.setProperty('--ph', String(ratio));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playheadMsRef, totalMs]);

  // Which error tick (if any) should report the arrival. `seekNonce` is in
  // the deps so the match re-runs (and the one-shot CSS pulse replays) even
  // on a repeat jump to the same offset; void-reading it keeps that intent
  // explicit. Matches the offset nearest the seek target.
  const arrivedErrorId = useMemo(() => {
    void seekNonce;
    if (seekTargetMs === null || seekTargetMs === undefined) return null;
    if (!errorMarkers || errorMarkers.length === 0) return null;
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (const m of errorMarkers) {
      const d = Math.abs(m.offsetMs - seekTargetMs);
      if (d < bestDist) {
        bestDist = d;
        bestId = m.id;
      }
    }
    // Only celebrate a genuine hit — within ~half a second of an error.
    return bestDist <= 500 ? bestId : null;
  }, [seekTargetMs, seekNonce, errorMarkers]);

  if (events.length === 0 || totalMs === 0) return null;

  const max = buckets.reduce((m, n) => (n > m ? n : m), 0) || 1;
  const errorCount = errorMarkers?.length ?? 0;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(Math.round(ratio * totalMs));
  };

  return (
    <Card className="p-2.5">
      <div className="flex items-center justify-between mb-1.5 text-[10px] uppercase tracking-wider text-fg-faint font-semibold">
        <span className="inline-flex items-center gap-2">
          {t('sessionDetail.minimapActivity')}
          {errorCount > 0 && (
            <span
              className="inline-flex items-center gap-1 text-danger normal-case tracking-normal tabular-nums"
              data-testid="replay-minimap-error-count"
            >
              <span className="size-1.5 rounded-full bg-danger" aria-hidden />
              {t(
                errorCount === 1
                  ? 'sessionDetail.minimapErrorCountOne'
                  : 'sessionDetail.minimapErrorCountOther',
                { n: errorCount },
              )}
            </span>
          )}
        </span>
        <span className="text-fg-faint normal-case tracking-normal">
          {t('sessionDetail.minimapClickToSeek')}
        </span>
      </div>
      <div
        ref={trackRef}
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
        className="group relative flex h-11 items-end gap-px cursor-pointer rounded-sm overflow-hidden bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [container-type:inline-size]"
        style={{ ['--ph' as string]: '0', ['--ph-ease' as string]: '360ms' }}
        data-testid="replay-minimap"
      >
        {/* Faint hairline baseline so the strip reads as a continuous ruler,
            not floating bars, even across quiet stretches. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border-strong"
        />
        {buckets.map((count, i) => {
          const intensity = count / max;
          // Always render at least a thin sliver so the bar reads as a
          // continuous strip even where no events landed.
          const heightPct = count === 0 ? 5 : 14 + intensity * 86;
          return (
            <span
              key={i}
              aria-hidden
              className="flex-1 min-w-px rounded-t-[1px] bg-fg transition-colors"
              style={{
                height: `${heightPct}%`,
                opacity: count === 0 ? 0.1 : 0.22 + intensity * 0.62,
              }}
            />
          );
        })}
        {/* Played region — a faint fill trailing the live playhead. Scaled on
            X (composited), driven by --ph, so it tracks playback for free. */}
        {playheadMsRef && (
          <span
            aria-hidden
            data-testid="replay-minimap-played"
            className="pointer-events-none absolute inset-y-0 left-0 right-0 origin-left bg-fg/[0.06]"
            style={{
              transform: 'scaleX(var(--ph))',
              transition: 'transform var(--ph-ease, 360ms) var(--ease-out-quart)',
            }}
          />
        )}
        {(errorMarkers ?? []).map((m) => {
          const ratio = Math.min(1, Math.max(0, m.offsetMs / totalMs));
          const arrived = m.id === arrivedErrorId;
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
              className="absolute top-0 bottom-0 w-px bg-danger transition-[width,opacity] hover:w-[3px]"
              style={{ left: `calc(${ratio * 100}% - 0.5px)`, opacity: 0.85 }}
            >
              {/* A small square head turns a 1px line into a readable pin
                  without widening the hit-affecting body. The head is what
                  pulses when a seek lands here. Wrapping it in a keyed array
                  (key folds in seekNonce) forces React to remount on a repeat
                  jump to the same tick, so the one-shot CSS pulse replays. */}
              {[
                <span
                  aria-hidden
                  key={arrived ? `arrived-${seekNonce}` : 'idle'}
                  className={cn(
                    'absolute left-1/2 top-0 size-[5px] -translate-x-1/2 -translate-y-px rounded-[1px] bg-danger',
                    arrived && 'animate-marker-arrive',
                  )}
                />,
              ]}
            </button>
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
              className="absolute top-0 bottom-0 w-px bg-accent transition-[width,opacity] hover:w-[3px]"
              style={{ left: `calc(${ratio * 100}% - 0.5px)`, opacity: 0.85 }}
            >
              <span
                aria-hidden
                className="absolute left-1/2 bottom-0 size-[5px] -translate-x-1/2 translate-y-px rounded-[1px] bg-accent"
              />
            </button>
          );
        })}
        {/* Live playhead — a thin Ink line that glides to its target on seek.
            Composited via translateX; transition makes the scrub readable. */}
        {playheadMsRef && (
          <span
            aria-hidden
            data-testid="replay-minimap-playhead"
            className="pointer-events-none absolute top-0 bottom-0 left-0 w-px bg-fg"
            style={{
              transform: 'translateX(calc(var(--ph) * (100cqw - 1px)))',
              transition: 'transform var(--ph-ease, 360ms) var(--ease-out-quart)',
            }}
          />
        )}
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
  const { t } = useTranslation();
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
      toast.success(t('sessionDetail.shareLinkCopied'), {
        description:
          playhead > 0
            ? t('sessionDetail.shareLinkAtTime', { time: formatPlayhead(playhead) })
            : t('sessionDetail.shareLinkFromBeginning'),
      });
    } catch {
      toast.error(t('sessionDetail.failedToCopyLink'));
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={() => void copy()} data-testid="share-replay-link">
      {copied ? <Check className="text-success" /> : <Link2 />}
      {copied ? t('sessionDetail.copied') : t('sessionDetail.shareLinkToCurrentTime')}
    </Button>
  );
}
