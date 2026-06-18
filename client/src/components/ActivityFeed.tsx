import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Clapperboard,
  MessageSquare,
  Pause,
  Play,
  Sparkles,
  Ticket,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { formatTimeAgo, shortHash } from '@/lib/format';
import { cn } from '@/lib/utils';

type ActivityKind = 'session' | 'ticket' | 'error' | 'join' | 'comment';

const FILTER_STORAGE_KEY = 'activity-prefs:v1';

function readStoredKinds(): Set<ActivityKind> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = globalThis.localStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { kinds?: unknown };
    if (!Array.isArray(parsed?.kinds)) return new Set();
    const valid = new Set<ActivityKind>(
      parsed.kinds.filter(
        (k): k is ActivityKind =>
          k === 'session' || k === 'ticket' || k === 'error' || k === 'join' || k === 'comment',
      ),
    );
    return valid;
  } catch {
    return new Set();
  }
}

function persistKinds(kinds: Set<ActivityKind>) {
  if (typeof window === 'undefined') return;
  try {
    globalThis.localStorage.setItem(
      FILTER_STORAGE_KEY,
      JSON.stringify({ kinds: Array.from(kinds) }),
    );
  } catch {
    /* quota / private mode — best effort */
  }
}

interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  title: string;
  subtitle?: string;
  at: string;
  device?: string;
  sessionId?: number;
}

const KIND_META: Record<ActivityKind, { icon: LucideIcon; tone: string; labelKey: string }> = {
  session: {
    icon: Clapperboard,
    tone: 'bg-accent-soft text-accent-soft-fg',
    labelKey: 'activity.kindSession',
  },
  ticket: {
    icon: Ticket,
    tone: 'bg-warning-soft text-warning',
    labelKey: 'activity.kindTicket',
  },
  error: {
    icon: AlertCircle,
    tone: 'bg-danger-soft text-danger',
    labelKey: 'activity.kindError',
  },
  join: {
    icon: UserPlus,
    tone: 'bg-success-soft text-success',
    labelKey: 'activity.kindJoin',
  },
  comment: {
    icon: MessageSquare,
    tone: 'bg-accent-soft text-accent-soft-fg',
    labelKey: 'activity.kindComment',
  },
};

interface ActivityFeedProps {
  /** Polling interval in ms. Set to 0 to disable polling. */
  pollMs?: number;
  /** Maximum entries to render. */
  limit?: number;
  className?: string;
}

interface ActivityPage {
  rows: ActivityEntry[];
  nextCursor: string | null;
}

export function ActivityFeed({ pollMs = 8_000, limit = 12, className }: ActivityFeedProps) {
  const { t } = useTranslation();
  // User-controllable pause. Polling never starts when `pollMs === 0` (the
  // parent disabled it), or when the user clicks pause.
  const [paused, setPaused] = useState(false);
  const effectivePollMs = paused ? 0 : pollMs;

  // Top-of-feed: polling query (back-compat array shape).
  const { data, isLoading, error } = useQuery({
    queryKey: ['activity-feed', limit],
    queryFn: () => apiFetch<ActivityEntry[]>(`/api/activity/feed?limit=${limit}`),
    refetchInterval: effectivePollMs > 0 ? effectivePollMs : false,
  });

  // Older entries appended on demand. We don't fold them into `useInfiniteQuery`
  // because polling on infinite queries refetches every loaded page, which
  // causes visible flicker on the dashboard.
  const top = (data ?? []).slice(0, limit);
  const [olderPages, setOlderPages] = useState<ActivityPage[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [endReached, setEndReached] = useState(false);

  const oldestTopAt = top[top.length - 1]?.at;
  const lastCursor = olderPages.at(-1)?.nextCursor ?? oldestTopAt ?? null;

  async function loadMore() {
    if (!lastCursor || loadingMore || endReached) return;
    setLoadingMore(true);
    try {
      const page = await apiFetch<ActivityPage>(
        `/api/activity/feed?limit=${limit}&before=${encodeURIComponent(lastCursor)}`,
      );
      setOlderPages((prev) => [...prev, page]);
      if (!page.nextCursor || page.rows.length === 0) {
        setEndReached(true);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  const allItems = useMemo(() => [...top, ...olderPages.flatMap((p) => p.rows)], [top, olderPages]);

  // Multi-select kind filter. Empty set means "show everything".
  // Hydrate from localStorage so the next visit reopens with the user's
  // last chosen filter set; write through whenever the set changes.
  const [activeKinds, setActiveKinds] = useState<Set<ActivityKind>>(() => readStoredKinds());
  useEffect(() => {
    persistKinds(activeKinds);
  }, [activeKinds]);
  const items = useMemo(() => {
    if (activeKinds.size === 0) return allItems;
    return allItems.filter((it) => activeKinds.has(it.kind));
  }, [allItems, activeKinds]);

  // Per-kind counts feed the chip strip — chips with 0 hits stay
  // visible but disabled-looking so the filter row's width is stable
  // as the feed polls.
  const kindCounts = useMemo(() => {
    const counts: Record<ActivityKind, number> = {
      session: 0,
      ticket: 0,
      error: 0,
      join: 0,
      comment: 0,
    };
    for (const it of allItems) {
      counts[it.kind] = (counts[it.kind] ?? 0) + 1;
    }
    return counts;
  }, [allItems]);

  const grouped = useMemo(() => groupByBucket(items), [items]);

  const toggleKind = (k: ActivityKind) => {
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const allKinds: ActivityKind[] = ['session', 'ticket', 'error', 'join', 'comment'];

  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-fg flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-fg-faint" />
            {t('activity.recentActivity')}
          </h2>
          <p className="text-xs text-fg-subtle mt-0.5">{t('activity.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {pollMs > 0 && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              aria-label={paused ? t('activity.resumePolling') : t('activity.pausePolling')}
              data-testid="activity-feed-pause"
              className={cn(
                'h-6 w-6 rounded-full border transition-colors inline-flex items-center justify-center shrink-0',
                paused
                  ? 'bg-fg text-bg border-fg'
                  : 'bg-surface border-border text-fg-subtle hover:text-fg',
              )}
              title={paused ? t('activity.resumeLiveUpdates') : t('activity.pauseLiveUpdates')}
            >
              {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
            </button>
          )}
          <LiveDot active={effectivePollMs > 0} />
        </div>
      </div>

      {allItems.length > 0 && (
        <div className="scroll-rail scroll-rail-fade -mx-1 px-1 mb-3 sm:overflow-visible">
          <div className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap pb-0.5">
            {allKinds.map((k) => {
              const meta = KIND_META[k];
              const Icon = meta.icon;
              const active = activeKinds.has(k);
              const count = kindCounts[k];
              const empty = count === 0;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleKind(k)}
                  disabled={empty}
                  aria-pressed={active}
                  data-testid={`activity-kind-chip-${k}`}
                  className={cn(
                    'h-6 px-2 rounded-full border text-[11px] font-medium transition-colors shrink-0',
                    'inline-flex items-center gap-1',
                    empty && 'opacity-50 cursor-not-allowed',
                    active
                      ? 'bg-fg text-bg border-fg'
                      : 'bg-surface border-border text-fg-subtle hover:border-border-strong hover:text-fg',
                  )}
                >
                  <Icon className="size-3" />
                  <span>{t(meta.labelKey)}</span>
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

      {error ? (
        <EmptyState
          icon={AlertCircle}
          title={t('activity.couldNotLoad')}
          description={t('activity.couldNotLoadDesc')}
        />
      ) : isLoading ? (
        <FeedSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={t('activity.quietTitle')}
          description={t('activity.quietDesc')}
        />
      ) : (
        <>
          <div
            className="relative"
            aria-live="polite"
            aria-relevant="additions"
            data-testid="activity-feed"
          >
            {/* spine — runs the full height of the feed */}
            <span aria-hidden className="absolute left-[15px] top-1 bottom-1 w-px bg-border" />
            <AnimatePresence initial={false}>
              {grouped.map((group) => (
                <section key={group.bucket} className="relative" data-bucket={group.bucket}>
                  <h3 className="sticky top-0 z-10 -ml-1 pl-2 pr-2 py-1 bg-surface/90 backdrop-blur-sm text-[10px] uppercase tracking-wider text-fg-faint font-semibold border-b border-border/60">
                    {t(group.labelKey)}{' '}
                    <span className="ml-1 text-fg-faint normal-case tracking-normal font-mono tabular-nums">
                      {group.rows.length}
                    </span>
                  </h3>
                  <ol className="space-y-0">
                    {group.rows.map((item) => (
                      <FeedRow key={item.id} item={item} />
                    ))}
                  </ol>
                </section>
              ))}
            </AnimatePresence>
          </div>
          {!endReached && lastCursor && (
            <div className="flex justify-center mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="text-xs"
              >
                {loadingMore ? t('common.loading') : t('activity.loadOlder')}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

type BucketKey = 'today' | 'yesterday' | 'thisWeek' | 'older';

interface ActivityGroup {
  bucket: BucketKey;
  labelKey: string;
  rows: ActivityEntry[];
}

/**
 * Groups items into Today / Yesterday / This week / Older by the local
 * day of their `at` timestamp. Order is preserved within each bucket
 * (the feed arrives newest-first; we keep it that way).
 */
function groupByBucket(items: ActivityEntry[]): ActivityGroup[] {
  if (items.length === 0) return [];
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 3600 * 1000;
  const startOfWeek = startOfToday - 7 * 24 * 3600 * 1000;

  const buckets: Record<BucketKey, ActivityEntry[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };

  for (const item of items) {
    const ts = new Date(item.at).getTime();
    if (Number.isNaN(ts)) {
      buckets.older.push(item);
      continue;
    }
    if (ts >= startOfToday) buckets.today.push(item);
    else if (ts >= startOfYesterday) buckets.yesterday.push(item);
    else if (ts >= startOfWeek) buckets.thisWeek.push(item);
    else buckets.older.push(item);
  }

  const labelKeys: Record<BucketKey, string> = {
    today: 'activity.bucketToday',
    yesterday: 'activity.bucketYesterday',
    thisWeek: 'activity.bucketThisWeek',
    older: 'activity.bucketOlder',
  };

  return (Object.keys(labelKeys) as BucketKey[])
    .filter((b) => buckets[b].length > 0)
    .map((b) => ({ bucket: b, labelKey: labelKeys[b], rows: buckets[b] }));
}

function FeedRow({ item }: { item: ActivityEntry }) {
  const { t } = useTranslation();
  const meta = KIND_META[item.kind] ?? KIND_META.session;
  const Icon = meta.icon;

  const content = (
    <div className="relative flex items-start gap-3 py-2.5 group">
      <span
        className={cn(
          'relative z-10 size-8 shrink-0 rounded-full flex items-center justify-center border border-border bg-surface',
          meta.tone,
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-fg truncate">{item.title}</span>
        </div>
        {item.subtitle && (
          <p className="text-[11px] text-fg-subtle truncate font-mono mt-0.5">{item.subtitle}</p>
        )}
        <div className="flex items-center gap-2 mt-1 text-[10px] uppercase tracking-wider text-fg-faint">
          <span className="font-semibold">{t(meta.labelKey)}</span>
          {item.device && (
            <>
              <span aria-hidden>·</span>
              <span className="font-mono normal-case tracking-normal">
                {shortHash(item.device, 10)}
              </span>
            </>
          )}
        </div>
      </div>
      <span className="text-[10px] text-fg-faint whitespace-nowrap pt-1">
        {formatTimeAgo(item.at)}
      </span>
    </div>
  );

  return (
    // Note: no `layout` prop. Layout animations on a long polling list cause
    // visible flicker as items reflow on each refetch. Plain enter/exit is
    // already enough since react-query keeps stable item identity.
    <motion.li
      initial={{ opacity: 0, height: 0, y: -4 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="border-b border-border last:border-0 overflow-hidden"
    >
      {item.sessionId ? (
        <Link
          to={`/sessions/${item.sessionId}`}
          className="block hover:bg-bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </motion.li>
  );
}

function LiveDot({ active }: { active: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold',
        active ? 'text-success' : 'text-fg-faint',
      )}
    >
      <span className="relative flex size-2">
        {active && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-50 animate-ping" />
        )}
        <span
          className={cn(
            'relative inline-flex size-2 rounded-full',
            active ? 'bg-success' : 'bg-fg-faint',
          )}
        />
      </span>
      {active ? t('activity.live') : t('activity.paused')}
    </span>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-2.5">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-2.5 w-32" />
            <Skeleton className="h-2 w-20" />
          </div>
          <Skeleton className="h-2.5 w-12" />
        </div>
      ))}
    </div>
  );
}
