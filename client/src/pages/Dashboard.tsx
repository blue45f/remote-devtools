import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Clapperboard,
  Minus,
  Radio,
  Ticket,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Link } from "react-router-dom";

import { ActivityFeed } from "@/components/ActivityFeed";
import { AreaChart, Sparkline } from "@/components/charts";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

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

type Period = "day" | "week" | "month";

const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

const ROLE_KEYS = ["developer", "designer", "pm", "qa", "other"] as const;
const ROLE_LABELS: Record<(typeof ROLE_KEYS)[number], string> = {
  developer: "Developer",
  designer: "Designer",
  pm: "PM",
  qa: "QA",
  other: "Other",
};

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("day");

  const statsQuery = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiFetch<{ data: DashboardStats }>("/api/dashboard/stats"),
  });

  const ticketTrendQuery = useQuery({
    queryKey: ["ticket-trend", period],
    queryFn: () =>
      apiFetch<{ data: TrendItem[] }>(
        `/api/dashboard/tickets/trend?period=${period}`,
      ),
  });

  const recordTrendQuery = useQuery({
    queryKey: ["record-trend", period],
    queryFn: () =>
      apiFetch<{ data: TrendItem[] }>(
        `/api/dashboard/record-sessions/trend?period=${period}`,
      ),
  });

  const liveQuery = useQuery({
    queryKey: ["live-sessions"],
    queryFn: () => apiFetch<unknown[]>("/sessions").catch(() => []),
    refetchInterval: 30_000,
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
            Dashboard
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-fg-subtle">
            Activity overview across all your debug sessions and tickets.
          </p>
        </div>
        <div className="scroll-rail -mx-1 px-1 sm:overflow-visible">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="w-max">
              {PERIODS.map((p) => (
                <TabsTrigger key={p.value} value={p.value} className="gap-1.5">
                  <CalendarDays className="size-3.5" />
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Hero row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
        <Link
          to="/sessions?tab=live"
          aria-label="Open live sessions"
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
        >
          <HeroLiveCard live={liveCount} loading={liveQuery.isLoading} />
        </Link>
        <Link
          to="/sessions"
          aria-label="Open all recorded sessions"
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
        >
          <HeroMetricCard
            label="Sessions today"
            value={stats?.todayRecordSessions}
            weeklyAvg={stats?.weeklyAverageRecordSessions}
            loading={statsQuery.isLoading}
            icon={Clapperboard}
            spark={recordTrend}
            accent="fg"
          />
        </Link>
        <HeroMetricCard
          label="Tickets today"
          value={stats?.todayTickets}
          weeklyAvg={stats?.weeklyAverage}
          loading={statsQuery.isLoading}
          icon={Ticket}
          spark={ticketTrend}
          accent="muted"
        />
      </div>

      {/* Secondary stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 mb-6 sm:mb-8">
        <Link
          to="/sessions"
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
        >
          <StatTile
            label="Total sessions"
            value={stats?.totalRecordSessions}
            icon={Activity}
            loading={statsQuery.isLoading}
          />
        </Link>
        <StatTile
          label="Total tickets"
          value={stats?.totalTickets}
          icon={Ticket}
          loading={statsQuery.isLoading}
        />
        <Link
          to="/sessions"
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
        >
          <StatTile
            label="Weekly avg sessions"
            value={stats?.weeklyAverageRecordSessions}
            icon={TrendingUp}
            loading={statsQuery.isLoading}
          />
        </Link>
        <StatTile
          label="Weekly avg tickets"
          value={stats?.weeklyAverage}
          icon={TrendingUp}
          loading={statsQuery.isLoading}
        />
      </div>

      {/* Charts + activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4">
        <div className="xl:col-span-2 space-y-3 sm:space-y-4 min-w-0">
          <ChartPanel
            title="Sessions over time"
            description="New record sessions captured per period."
            loading={recordTrendQuery.isLoading}
            empty={recordTrend.length === 0}
          >
            <SessionsAreaChart data={recordTrend} />
          </ChartPanel>
          <ChartPanel
            title="Tickets by role"
            description="Tickets created per role."
            loading={ticketTrendQuery.isLoading}
            empty={ticketTrend.length === 0}
          >
            <TicketsByRoleChart data={ticketTrend} />
          </ChartPanel>
        </div>
        <ActivityFeed />
      </div>
    </div>
  );
}

/* ─────────────  Hero cards  ───────────── */

function HeroLiveCard({ live, loading }: { live: number; loading: boolean }) {
  const isActive = live > 0;
  return (
    <Card
      className={cn(
        "p-4 sm:p-5 relative overflow-hidden h-full",
        "transition-colors hover:border-border-strong",
        isActive && "border-danger/30",
      )}
    >
      {isActive && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-1/2 -right-1/2 size-72 rounded-full blur-3xl bg-danger/10"
        />
      )}
      <div className="relative">
        <div className="flex items-center gap-2 text-fg-subtle text-xs uppercase tracking-wider font-semibold mb-2">
          <Radio className="size-3.5" />
          Live now
        </div>
        {loading ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <div className="flex items-baseline gap-2">
            <AnimatedNumber
              value={live}
              className="text-3xl font-semibold text-fg"
            />
            <span className="text-sm text-fg-subtle">
              session{live !== 1 && "s"}
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
              Streaming
            </Badge>
          ) : (
            <Badge variant="neutral">Idle</Badge>
          )}
          <span className="text-[11px] text-fg-faint">refresh 30s</span>
        </div>
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
  accent: "fg" | "muted";
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
  const v = value ?? 0;
  const avg = weeklyAvg ?? 0;
  const delta = avg > 0 ? ((v - avg) / avg) * 100 : 0;

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
        weekly avg{" "}
        <span className="font-mono text-fg-subtle">{formatNumber(avg)}</span>
      </div>

      {/* sparkline — pulls margin to bleed into the card edge */}
      <div className="-mx-4 sm:-mx-5 -mb-4 sm:-mb-5 mt-3 h-12 sm:h-14">
        {spark.length > 0 ? (
          <Sparkline
            data={spark.map((d) => d.created ?? 0)}
            intensity={accent === "fg" ? "fg" : "muted"}
          />
        ) : null}
      </div>
    </Card>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.5) {
    return (
      <Badge variant="neutral" size="sm" className="gap-0.5">
        <Minus className="size-2.5" />
        flat
      </Badge>
    );
  }
  const positive = delta > 0;
  return (
    <Badge
      variant={positive ? "success" : "danger"}
      size="sm"
      className="gap-0.5"
    >
      {positive ? (
        <ArrowUpRight className="size-2.5" />
      ) : (
        <ArrowDownRight className="size-2.5" />
      )}
      {Math.abs(delta).toFixed(0)}%
    </Badge>
  );
}

/* ───────── Secondary stat tile ───────── */

interface StatTileProps {
  label: string;
  value?: number;
  icon: typeof Activity;
  loading?: boolean;
}

function StatTile({ label, value, icon: Icon, loading }: StatTileProps) {
  return (
    <Card className="p-3 sm:p-4 h-full transition-colors hover:border-border-strong">
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
          className="text-lg sm:text-xl font-semibold text-fg block"
        />
      )}
    </Card>
  );
}

/* ───────── Chart panel ───────── */

interface ChartPanelProps {
  title: string;
  description?: string;
  loading?: boolean;
  empty?: boolean;
  children: React.ReactNode;
}

function ChartPanel({
  title,
  description,
  loading,
  empty,
  children,
}: ChartPanelProps) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
      </div>
      {description && (
        <p className="text-xs text-fg-subtle mb-3 sm:mb-4">{description}</p>
      )}
      {/* Chart bodies size down on tablet to keep two charts above the fold */}
      <div className="h-[200px] sm:h-[240px] lg:h-[260px]">
        {loading ? <ChartSkeleton /> : empty ? <ChartEmpty /> : children}
      </div>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-full flex items-end gap-1.5">
      {Array.from({ length: 14 }).map((_, i) => (
        <Skeleton
          key={i}
          className="flex-1"
          style={{ height: `${30 + ((i * 7) % 70)}%` }}
        />
      ))}
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-fg-faint">
      <Activity className="size-6 mb-2" />
      <p className="text-xs">No data for this period</p>
    </div>
  );
}

/* ───────── Sessions Area Chart ───────── */

function SessionsAreaChart({ data }: { data: TrendItem[] }) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        label: d.date ?? "",
        value: d.created ?? 0,
      })),
    [data],
  );
  return <AreaChart data={chartData} valueLabel="Sessions" />;
}

/* ───────── Tickets by Role (horizontal stacked bar) ───────── */

function TicketsByRoleChart({ data }: { data: TrendItem[] }) {
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
      label: ROLE_LABELS[role],
      value: acc[role] ?? 0,
      shade: i,
    }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

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
                  background: `hsl(var(--fg) / ${0.85 - i * 0.12})`,
                }}
              />
            </div>
          </div>
        );
      })}
      {/* Mini legend */}
      <div className="mt-3 pt-3 border-t border-border text-[11px] text-fg-faint flex items-center justify-between">
        <span>Total</span>
        <span className="font-mono tabular-nums text-fg-subtle">
          {totals.reduce((s, t) => s + t.value, 0).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
