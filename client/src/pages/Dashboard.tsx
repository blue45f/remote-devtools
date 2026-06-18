import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Clapperboard,
  Globe,
  Minus,
  Radio,
  RefreshCw,
  StickyNote,
  Tag,
  Ticket,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import type { TFunction } from 'i18next';

import { ActivityFeed } from '@/components/ActivityFeed';
import { AreaChart, Sparkline } from '@/components/charts';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { useAppStore } from '@/lib/store';
import { useDocumentTitle } from '@/lib/use-document-title';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalTickets: number;
  todayTickets: number;
  weeklyAverage: number;
  totalRecordSessions: number;
  todayRecordSessions: number;
  weeklyAverageRecordSessions: number;
}

interface TrendItem {
  date: string;
  created: number;
  developer?: number;
  designer?: number;
  pm?: number;
  qa?: number;
  other?: number;
  messages?: number;
  participants?: number;
}

type Period = 'day' | 'week' | 'month';

const DASHBOARD_PREFS_KEY = 'dashboard-prefs:v1';
const ALL_PERIODS: Period[] = ['day', 'week', 'month'];

function readStoredPeriod(): Period | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = globalThis.localStorage.getItem(DASHBOARD_PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { period?: string };
    return ALL_PERIODS.includes(parsed?.period as Period) ? (parsed.period as Period) : null;
  } catch {
    return null;
  }
}

function persistPeriod(period: Period) {
  if (typeof window === 'undefined') return;
  try {
    globalThis.localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify({ period }));
  } catch {
    /* private mode / quota — the toggle still works in-session */
  }
}

const PERIODS: { value: Period; labelKey: string }[] = [
  { value: 'day', labelKey: 'dashboard.periodDaily' },
  { value: 'week', labelKey: 'dashboard.periodWeekly' },
  { value: 'month', labelKey: 'dashboard.periodMonthly' },
];

const ROLE_KEYS = ['developer', 'designer', 'pm', 'qa', 'other'] as const;
const ROLE_LABEL_KEYS: Record<(typeof ROLE_KEYS)[number], string> = {
  developer: 'dashboard.roleDeveloper',
  designer: 'dashboard.roleDesigner',
  pm: 'dashboard.rolePm',
  qa: 'dashboard.roleQa',
  other: 'dashboard.roleOther',
};

export default function DashboardPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('dashboard.title'));
  const [period, setPeriod] = useState<Period>(() => readStoredPeriod() ?? 'day');
  const queryClient = useQueryClient();
  const [, forceTick] = useState(0);

  // Re-render every 5s so the "Updated Xs ago" label stays fresh
  // without depending on every query firing onSettled.
  useEffect(() => {
    const i = globalThis.setInterval(() => forceTick((n) => n + 1), 5_000);
    return () => globalThis.clearInterval(i);
  }, []);

  // Persist the period preference so reopens land on the user's last
  // chosen range.
  useEffect(() => {
    persistPeriod(period);
  }, [period]);

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiFetch<{ data: DashboardStats }>('/api/dashboard/stats'),
  });

  const ticketTrendQuery = useQuery({
    queryKey: ['ticket-trend', period],
    queryFn: () => apiFetch<{ data: TrendItem[] }>(`/api/dashboard/tickets/trend?period=${period}`),
  });

  const recordTrendQuery = useQuery({
    queryKey: ['record-trend', period],
    queryFn: () =>
      apiFetch<{ data: TrendItem[] }>(`/api/dashboard/record-sessions/trend?period=${period}`),
  });

  const liveQuery = useQuery({
    queryKey: ['live-sessions'],
    queryFn: () => apiFetch<unknown[]>('/sessions'),
    refetchInterval: 30_000,
    meta: { suppressToast: true },
  });

  const stats = statsQuery.data?.data;
  const ticketTrend = ticketTrendQuery.data?.data ?? [];
  const recordTrend = recordTrendQuery.data?.data ?? [];
  const liveCount = Array.isArray(liveQuery.data) ? liveQuery.data.length : 0;

  return (
    <div className="safe-px py-5 sm:py-6 max-w-7xl mx-auto">
      {/* Header. On phones the period tabs drop below the title so the
          eyebrow can breathe. */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between flex-wrap gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fg">
            {t('dashboard.title')}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-fg-subtle">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FreshnessBadge
            updatedAt={Math.max(
              statsQuery.dataUpdatedAt,
              recordTrendQuery.dataUpdatedAt,
              ticketTrendQuery.dataUpdatedAt,
              liveQuery.dataUpdatedAt,
            )}
            fetching={
              statsQuery.isFetching ||
              recordTrendQuery.isFetching ||
              ticketTrendQuery.isFetching ||
              liveQuery.isFetching
            }
            onRefresh={() => {
              void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
              void queryClient.invalidateQueries({ queryKey: ['ticket-trend'] });
              void queryClient.invalidateQueries({ queryKey: ['record-trend'] });
              void queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
              void queryClient.invalidateQueries({ queryKey: ['top-hosts'] });
              void queryClient.invalidateQueries({ queryKey: ['top-tags'] });
              void queryClient.invalidateQueries({ queryKey: ['recent-notes'] });
            }}
          />
          <div className="scroll-rail -mx-1 px-1 sm:overflow-visible">
            {/* Segmented control, not tabs: it filters the charts' period rather
                than switching panels, so a labelled button group with
                aria-pressed (no phantom aria-controls) is the valid pattern. */}
            <div
              role="group"
              aria-label={t('dashboard.periodGroupLabel')}
              className="inline-flex h-9 w-max items-center gap-1 rounded-md bg-bg-muted p-1 text-fg-subtle"
            >
              {PERIODS.map((p) => {
                const active = period === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPeriod(p.value)}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1 text-xs font-medium',
                      'transition-[color,background-color,box-shadow] duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-bg',
                      active ? 'bg-surface text-fg shadow-xs' : 'hover:text-fg',
                    )}
                  >
                    <CalendarDays className="size-3.5" />
                    {t(p.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats error banner */}
      {statsQuery.isError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-muted px-4 py-2.5 mb-4 text-sm text-fg-subtle"
        >
          <span>{t('dashboard.statsLoadFailed')}</span>
          <button
            type="button"
            onClick={() => void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })}
            className="shrink-0 text-xs font-medium text-fg underline-offset-2 hover:underline"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Hero row — the live signal reads first, then today's counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 mb-3 sm:mb-4">
        <Link
          to="/sessions?tab=live"
          aria-label={t('dashboard.openLiveSessions')}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
        >
          <HeroLiveCard live={liveCount} loading={liveQuery.isLoading} />
        </Link>
        <Link
          to="/sessions"
          aria-label={t('dashboard.openRecordedSessions')}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
        >
          <HeroMetricCard
            label={t('dashboard.sessionsToday')}
            value={stats?.todayRecordSessions}
            weeklyAvg={stats?.weeklyAverageRecordSessions}
            loading={statsQuery.isLoading}
            icon={Clapperboard}
            spark={recordTrend}
            accent="fg"
          />
        </Link>
        <HeroMetricCard
          label={t('dashboard.ticketsToday')}
          value={stats?.todayTickets}
          weeklyAvg={stats?.weeklyAverage}
          loading={statsQuery.isLoading}
          icon={Ticket}
          spark={ticketTrend}
          accent="muted"
        />
      </div>

      {/* Secondary stats — one dense, hairline-divided strip rather than four
          identical cards (the identical-card-grid anti-pattern). Borders draw
          a clean cross on the 2-up phone layout and a single row of dividers
          from md up. */}
      <Card className="grid grid-cols-2 md:grid-cols-4 overflow-hidden mb-6 sm:mb-8">
        <StatCell
          label={t('dashboard.totalSessions')}
          value={stats?.totalRecordSessions}
          icon={Activity}
          loading={statsQuery.isLoading}
          to="/sessions"
        />
        <StatCell
          label={t('dashboard.totalTickets')}
          value={stats?.totalTickets}
          icon={Ticket}
          loading={statsQuery.isLoading}
          className="border-l border-border"
        />
        <StatCell
          label={t('dashboard.weeklyAvgSessions')}
          value={stats?.weeklyAverageRecordSessions}
          icon={TrendingUp}
          loading={statsQuery.isLoading}
          to="/sessions"
          className="border-t border-border md:border-t-0 md:border-l"
        />
        <StatCell
          label={t('dashboard.weeklyAvgTickets')}
          value={stats?.weeklyAverage}
          icon={TrendingUp}
          loading={statsQuery.isLoading}
          className="border-t border-l border-border md:border-t-0"
        />
      </Card>

      {/* Charts + activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4">
        <div className="xl:col-span-2 space-y-3 sm:space-y-4 min-w-0">
          <ChartPanel
            title={t('dashboard.sessionsOverTime')}
            description={t('dashboard.sessionsOverTimeDesc')}
            loading={recordTrendQuery.isLoading}
            error={recordTrendQuery.isError}
            onRetry={() => void queryClient.invalidateQueries({ queryKey: ['record-trend'] })}
            empty={recordTrend.length === 0}
          >
            <SessionsAreaChart data={recordTrend} />
          </ChartPanel>
          <ChartPanel
            title={t('dashboard.ticketsByRole')}
            description={t('dashboard.ticketsByRoleDesc')}
            loading={ticketTrendQuery.isLoading}
            error={ticketTrendQuery.isError}
            onRetry={() => void queryClient.invalidateQueries({ queryKey: ['ticket-trend'] })}
            empty={ticketTrend.length === 0}
          >
            <TicketsByRoleChart data={ticketTrend} />
          </ChartPanel>
          <TopHostsPanel period={period} />
          <TopTagsPanel period={period} />
          <RecentNotesPanel />
        </div>
        <ActivityFeed />
      </div>
    </div>
  );
}

interface RecentNote {
  id: number;
  name: string;
  note: string;
  timestamp: string;
}

function RecentNotesPanel() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery<RecentNote[]>({
    queryKey: ['recent-notes'],
    queryFn: () => apiFetch<RecentNote[]>('/api/dashboard/recent-notes?limit=5'),
  });
  const rows = data ?? [];

  if (isLoading) {
    return (
      <Card className="p-5 space-y-2.5">
        <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5">
          <StickyNote className="size-3.5 text-fg-faint" />
          {t('dashboard.recentlyAnnotated')}
        </h3>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5">
          <StickyNote className="size-3.5 text-fg-faint" />
          {t('dashboard.recentlyAnnotated')}
        </h3>
        <p className="text-xs text-fg-subtle mt-2">{t('common.loadFailed')}</p>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5">
          <StickyNote className="size-3.5 text-fg-faint" />
          {t('dashboard.recentlyAnnotated')}
        </h3>
        <p className="text-xs text-fg-subtle mt-2">{t('dashboard.noAnnotatedSessions')}</p>
      </Card>
    );
  }

  return (
    <Card className="p-5" data-testid="dashboard-recent-notes">
      <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5 mb-3">
        <StickyNote className="size-3.5 text-fg-faint" />
        {t('dashboard.recentlyAnnotated')}
      </h3>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              to={`/sessions/${r.id}`}
              className="group block rounded-md px-2 py-1.5 hover:bg-bg-muted/60 transition-colors"
              data-testid="dashboard-recent-note-row"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-fg truncate group-hover:text-accent">
                  {r.name}
                </span>
                <span className="text-[10px] text-fg-faint shrink-0">
                  {formatRelativeAge(new Date(r.timestamp).getTime(), t)}
                </span>
              </div>
              <p className="text-[11px] text-fg-subtle truncate mt-0.5">{r.note}</p>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TopHostsPanel({ period }: { period: Period }) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery<{ host: string; count: number }[]>({
    queryKey: ['top-hosts', period],
    queryFn: () =>
      apiFetch<{ host: string; count: number }[]>(
        `/api/dashboard/top-hosts?period=${period}&limit=8`,
      ),
  });
  const rows = data ?? [];
  const max = useMemo(() => rows.reduce((m, r) => (r.count > m ? r.count : m), 0), [rows]);

  if (isLoading) {
    return (
      <Card className="p-5 space-y-2.5">
        <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5">
          <Globe className="size-3.5 text-fg-faint" />
          {t('dashboard.topHosts')}
        </h3>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5">
          <Globe className="size-3.5 text-fg-faint" />
          {t('dashboard.topHosts')}
        </h3>
        <p className="text-xs text-fg-subtle mt-2">{t('common.loadFailed')}</p>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5">
          <Globe className="size-3.5 text-fg-faint" />
          {t('dashboard.topHosts')}
        </h3>
        <p className="text-xs text-fg-subtle mt-2">{t('dashboard.noHostData')}</p>
      </Card>
    );
  }

  return (
    <Card className="p-5" data-testid="dashboard-top-hosts">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5">
          <Globe className="size-3.5 text-fg-faint" />
          {t('dashboard.topHosts')}
        </h3>
        <span className="text-[11px] text-fg-faint">
          {t('dashboard.lastRange', { range: t(PERIOD_LABEL_KEY[period]) })}
        </span>
      </div>
      <ul className="space-y-1.5">
        {rows.map((r) => {
          const pct = max > 0 ? Math.round((r.count / max) * 100) : 0;
          return (
            <li key={r.host}>
              <Link
                to={`/sessions?host=${encodeURIComponent(r.host)}`}
                className="group block rounded-md px-2 py-1.5 hover:bg-bg-muted/60 transition-colors"
                data-testid="dashboard-top-host-row"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-mono text-fg group-hover:text-accent">
                    {r.host}
                  </span>
                  <span className="font-mono tabular-nums text-fg-subtle shrink-0">{r.count}</span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-bg-subtle overflow-hidden">
                  <div className="h-full bg-accent/70" style={{ width: `${Math.max(pct, 4)}%` }} />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

const PERIOD_LABEL_KEY: Record<Period, string> = {
  day: 'dashboard.periodRange7Days',
  week: 'dashboard.periodRange8Weeks',
  month: 'dashboard.periodRange6Months',
};

function TopTagsPanel({ period }: { period: Period }) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery<{ tag: string; count: number }[]>({
    queryKey: ['top-tags', period],
    queryFn: () =>
      apiFetch<{ tag: string; count: number }[]>(
        `/api/dashboard/top-tags?period=${period}&limit=10`,
      ),
  });
  const rows = data ?? [];

  if (isLoading) {
    return (
      <Card className="p-5 space-y-2.5">
        <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5">
          <Tag className="size-3.5 text-fg-faint" />
          {t('dashboard.topTags')}
        </h3>
        {/* Chip-shaped skeletons that mirror the wrapped tag pills below,
            so the layout doesn't jump from stacked bars to a chip wrap. */}
        <div className="flex flex-wrap gap-1.5">
          {[64, 48, 80, 56, 40, 72, 52].map((w, i) => (
            <Skeleton key={i} className="h-7 rounded-full" style={{ width: w }} />
          ))}
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5">
          <Tag className="size-3.5 text-fg-faint" />
          {t('dashboard.topTags')}
        </h3>
        <p className="text-xs text-fg-subtle mt-2">{t('common.loadFailed')}</p>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5">
          <Tag className="size-3.5 text-fg-faint" />
          {t('dashboard.topTags')}
        </h3>
        <p className="text-xs text-fg-subtle mt-2">{t('dashboard.noTagsApplied')}</p>
      </Card>
    );
  }

  return (
    <Card className="p-5" data-testid="dashboard-top-tags">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5">
          <Tag className="size-3.5 text-fg-faint" />
          {t('dashboard.topTags')}
        </h3>
        <span className="text-[11px] text-fg-faint">
          {t('dashboard.lastRange', { range: t(PERIOD_LABEL_KEY[period]) })}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {rows.map((r) => (
          <Link
            key={r.tag}
            to={`/sessions?tag=${encodeURIComponent(r.tag)}`}
            data-testid="dashboard-top-tag-chip"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-border bg-surface text-xs text-fg-subtle hover:text-fg hover:border-border-strong transition-colors"
          >
            <span>{r.tag}</span>
            <span className="font-mono tabular-nums text-[10px] text-fg-faint">{r.count}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

/* ─────────────  Freshness badge  ───────────── */

function FreshnessBadge({
  updatedAt,
  fetching,
  onRefresh,
}: {
  updatedAt: number;
  fetching: boolean;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  // Recompute on every render; the parent ticks every 5s so the relative
  // time string stays current without an internal interval.
  const label = formatRelativeAge(updatedAt, t);

  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={fetching}
      className={cn(
        'inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-[11px]',
        'border border-border bg-surface text-fg-subtle',
        'hover:border-border-strong hover:text-fg transition-colors',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
      aria-label={t('dashboard.refreshData')}
      data-testid="dashboard-refresh"
    >
      <RefreshCw className={cn('size-3', fetching && 'animate-spin')} />
      <span>{fetching ? t('dashboard.refreshing') : t('dashboard.updated', { time: label })}</span>
    </button>
  );
}

function formatRelativeAge(updatedAt: number, t: TFunction) {
  if (!updatedAt) return t('common.justNow');
  const ms = Date.now() - updatedAt;
  if (ms < 5_000) return t('common.justNow');
  if (ms < 60_000) return t('common.secondsAgo', { n: Math.floor(ms / 1_000) });
  if (ms < 3_600_000) return t('common.minutesAgo', { n: Math.floor(ms / 60_000) });
  return t('common.hoursAgo', { n: Math.floor(ms / 3_600_000) });
}

/* ─────────────  Hero cards  ───────────── */

function HeroLiveCard({ live, loading }: { live: number; loading: boolean }) {
  const { t } = useTranslation();
  const isActive = live > 0;
  return (
    <Card
      className={cn(
        'p-4 sm:p-5 h-full transition-colors',
        // Live is a *state*, so the only color it earns is a hairline tint on
        // the border, reinforced by the record-dot heartbeat below. No
        // decorative wash, and the `live` token (not `danger`) so an active
        // session never reads as an error.
        isActive ? 'border-live/40 hover:border-live/60' : 'hover:border-border-strong',
      )}
    >
      <div className="flex items-center gap-2 text-fg-subtle text-xs uppercase tracking-wider font-semibold mb-2">
        <Radio className="size-3.5" />
        {t('dashboard.liveNow')}
      </div>
      {loading ? (
        <Skeleton className="h-9 w-16" />
      ) : (
        <div className="flex items-baseline gap-2">
          <AnimatedNumber value={live} className="text-3xl font-semibold text-fg tabular-nums" />
          <span className="text-sm text-fg-subtle">
            {t(live === 1 ? 'dashboard.sessionOne' : 'dashboard.sessionOther')}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2 mt-3">
        {isActive ? (
          <Badge variant="live" className="gap-1.5">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-live opacity-60 animate-ping" />
              <span className="relative inline-flex size-1.5 rounded-full bg-live" />
            </span>
            {t('dashboard.streaming')}
          </Badge>
        ) : (
          <Badge variant="neutral">{t('dashboard.idle')}</Badge>
        )}
        <span className="text-[11px] text-fg-faint">{t('dashboard.refresh30s')}</span>
      </div>
    </Card>
  );
}

interface HeroMetricCardProps {
  label: string;
  value?: number;
  weeklyAvg?: number;
  loading?: boolean;
  icon: typeof Activity;
  spark: TrendItem[];
  accent: 'fg' | 'muted';
}

function HeroMetricCard({
  label,
  value,
  weeklyAvg,
  loading,
  icon: Icon,
  spark,
  accent,
}: HeroMetricCardProps) {
  const { t } = useTranslation();
  const v = value ?? 0;
  const avg = weeklyAvg ?? 0;
  const delta = avg > 0 ? ((v - avg) / avg) * 100 : 0;
  const sparkData = useMemo(() => spark.map((d) => d.created ?? 0), [spark]);

  return (
    <Card className="p-4 sm:p-5 relative overflow-hidden h-full transition-colors hover:border-border-strong">
      <div className="flex items-center gap-2 text-fg-subtle text-xs uppercase tracking-wider font-semibold mb-2">
        <Icon className="size-3.5" />
        {label}
      </div>
      {loading ? (
        <Skeleton className="h-9 w-20" />
      ) : (
        <div className="flex items-baseline gap-2">
          <AnimatedNumber
            value={v}
            format={(n) => formatNumber(Math.round(n))}
            className="text-3xl font-semibold text-fg"
          />
          {avg > 0 && <DeltaBadge delta={delta} />}
        </div>
      )}
      <div className="text-[11px] text-fg-faint mt-1.5">
        {t('dashboard.weeklyAvg')}{' '}
        <span className="font-mono text-fg-subtle">{formatNumber(avg)}</span>
      </div>

      {/* sparkline — pulls margin to bleed into the card edge */}
      <div className="-mx-4 sm:-mx-5 -mb-4 sm:-mb-5 mt-3 h-12 sm:h-14">
        {spark.length > 0 ? (
          <Sparkline data={sparkData} intensity={accent === 'fg' ? 'fg' : 'muted'} />
        ) : null}
      </div>
    </Card>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const { t } = useTranslation();
  if (Math.abs(delta) < 0.5) {
    return (
      <Badge variant="neutral" size="sm" className="gap-0.5">
        <Minus className="size-2.5" />
        {t('dashboard.flat')}
      </Badge>
    );
  }
  const positive = delta > 0;
  return (
    <Badge variant={positive ? 'success' : 'danger'} size="sm" className="gap-0.5">
      {positive ? <ArrowUpRight className="size-2.5" /> : <ArrowDownRight className="size-2.5" />}
      {Math.abs(delta).toFixed(0)}%
    </Badge>
  );
}

/* ───────── Secondary stat cell (a division of the stat strip) ───────── */

interface StatCellProps {
  label: string;
  value?: number;
  icon: typeof Activity;
  loading?: boolean;
  to?: string;
  className?: string;
}

function StatCell({ label, value, icon: Icon, loading, to, className }: StatCellProps) {
  const body = (
    <>
      <div className="flex items-center gap-1.5 sm:gap-2 text-fg-faint text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold mb-1 sm:mb-1.5">
        <Icon className="size-3" />
        <span className="truncate">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <AnimatedNumber
          value={value ?? 0}
          format={(n) => formatNumber(Math.round(n))}
          className="text-lg sm:text-xl font-semibold text-fg block tabular-nums"
        />
      )}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          'block p-3 sm:p-4 transition-colors hover:bg-bg-subtle',
          // inset ring so it isn't clipped by the strip's overflow-hidden
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
          className,
        )}
      >
        {body}
      </Link>
    );
  }

  return <div className={cn('p-3 sm:p-4', className)}>{body}</div>;
}

/* ───────── Chart panel ───────── */

interface ChartPanelProps {
  title: string;
  description?: string;
  loading?: boolean;
  empty?: boolean;
  error?: boolean;
  onRetry?: () => void;
  children: React.ReactNode;
}

function ChartPanel({
  title,
  description,
  loading,
  empty,
  error,
  onRetry,
  children,
}: ChartPanelProps) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
      </div>
      {description && <p className="text-xs text-fg-subtle mb-3 sm:mb-4">{description}</p>}
      {/* Chart bodies size down on tablet to keep two charts above the fold */}
      <div className="h-[200px] sm:h-[240px] lg:h-[260px]">
        {loading ? (
          <ChartSkeleton />
        ) : error ? (
          <ChartError onRetry={onRetry} />
        ) : empty ? (
          <ChartEmpty />
        ) : (
          children
        )}
      </div>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-full flex items-end gap-1.5">
      {Array.from({ length: 14 }).map((_, i) => (
        <Skeleton key={i} className="flex-1" style={{ height: `${30 + ((i * 7) % 70)}%` }} />
      ))}
    </div>
  );
}

function ChartEmpty() {
  const { t } = useTranslation();
  const demoMode = useAppStore((s) => s.demoMode);
  const toggleDemoMode = useAppStore((s) => s.toggleDemoMode);
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-fg-faint gap-2">
      <Activity className="size-6" />
      <p className="text-xs">{t('dashboard.noDataForPeriod')}</p>
      {!demoMode && (
        <button
          type="button"
          onClick={() => toggleDemoMode()}
          className="text-xs text-fg-subtle hover:text-fg underline-offset-2 hover:underline"
        >
          {t('dashboard.enableDemoMode')}
        </button>
      )}
    </div>
  );
}

function ChartError({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-fg-faint gap-2">
      <RefreshCw className="size-5 text-fg-subtle" />
      <p className="text-xs">{t('dashboard.chartLoadFailed')}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs text-fg-subtle hover:text-fg underline-offset-2 hover:underline"
        >
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}

/* ───────── Sessions Area Chart ───────── */

function SessionsAreaChart({ data }: { data: TrendItem[] }) {
  const { t } = useTranslation();
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        label: d.date ?? '',
        value: d.created ?? 0,
      })),
    [data],
  );
  return <AreaChart data={chartData} valueLabel={t('dashboard.sessionsValueLabel')} />;
}

/* ───────── Tickets by Role (horizontal stacked bar) ───────── */

function TicketsByRoleChart({ data }: { data: TrendItem[] }) {
  const { t } = useTranslation();
  // aggregate across the period
  const totals = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const item of data) {
      for (const role of ROLE_KEYS) {
        acc[role] = (acc[role] ?? 0) + (item[role] ?? 0);
      }
    }
    return ROLE_KEYS.map((role, i) => ({
      role,
      label: t(ROLE_LABEL_KEYS[role]),
      value: acc[role] ?? 0,
      shade: i,
    }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data, t]);

  if (totals.length === 0) return <ChartEmpty />;

  // monochrome shading: deeper for top, lighter for bottom
  const max = totals[0]?.value ?? 1;

  return (
    <div className="flex flex-col gap-3">
      {totals.map((t, i) => {
        const pct = (t.value / max) * 100;
        return (
          <div key={t.role}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs font-medium text-fg">{t.label}</span>
              <span className="font-mono text-xs text-fg-subtle tabular-nums">
                {t.value.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  background: `color-mix(in oklab, var(--fg) ${(0.85 - i * 0.12) * 100}%, transparent)`,
                }}
              />
            </div>
          </div>
        );
      })}
      {/* Mini legend */}
      <div className="mt-3 pt-3 border-t border-border text-[11px] text-fg-faint flex items-center justify-between">
        <span>{t('dashboard.total')}</span>
        <span className="font-mono tabular-nums text-fg-subtle">
          {totals.reduce((s, t) => s + t.value, 0).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
