import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
}

interface RecordTrendItem extends TrendItem {
  messages: number;
  participants: number;
}

type Period = "day" | "week" | "month";

const API_HOST = import.meta.env.VITE_HOST || "http://localhost:3000";

const statIcons = [
  { color: "violet", icon: TicketIcon },
  { color: "blue", icon: TodayIcon },
  { color: "indigo", icon: AvgIcon },
  { color: "emerald", icon: RecordIcon },
  { color: "teal", icon: TodayIcon },
  { color: "cyan", icon: AvgIcon },
];

const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
  violet: { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-600 dark:text-violet-400", ring: "ring-violet-200 dark:ring-violet-800" },
  blue: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", ring: "ring-blue-200 dark:ring-blue-800" },
  indigo: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400", ring: "ring-indigo-200 dark:ring-indigo-800" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-200 dark:ring-emerald-800" },
  teal: { bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-600 dark:text-teal-400", ring: "ring-teal-200 dark:ring-teal-800" },
  cyan: { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400", ring: "ring-cyan-200 dark:ring-cyan-800" },
};

const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ticketTrend, setTicketTrend] = useState<TrendItem[]>([]);
  const [recordTrend, setRecordTrend] = useState<RecordTrendItem[]>([]);
  const [ticketPeriod, setTicketPeriod] = useState<Period>("day");
  const [recordPeriod, setRecordPeriod] = useState<Period>("day");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`${API_HOST}/api/dashboard/stats`)
      .then((res) => res.json())
      .then((res) => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load dashboard statistics.");
        setLoading(false);
      });
  }, []);

  const fetchTicketTrend = useCallback((period: Period) => {
    void fetch(`${API_HOST}/api/dashboard/tickets/trend?period=${period}`)
      .then((res) => res.json())
      .then((res) => setTicketTrend(res.data))
      .catch(() => setTicketTrend([]));
  }, []);

  const fetchRecordTrend = useCallback((period: Period) => {
    void fetch(`${API_HOST}/api/dashboard/record-sessions/trend?period=${period}`)
      .then((res) => res.json())
      .then((res) => setRecordTrend(res.data))
      .catch(() => setRecordTrend([]));
  }, []);

  useEffect(() => {
    fetchTicketTrend(ticketPeriod);
  }, [ticketPeriod, fetchTicketTrend]);

  useEffect(() => {
    fetchRecordTrend(recordPeriod);
  }, [recordPeriod, fetchRecordTrend]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span className="text-sm" aria-live="polite">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button type="button" onClick={() => window.location.reload()} className="text-sm text-violet-600 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    { label: "Total Tickets", value: stats?.totalTickets ?? 0 },
    { label: "Today's Tickets", value: stats?.todayTickets ?? 0 },
    { label: "Weekly Avg Tickets", value: stats?.weeklyAverage ?? 0 },
    { label: "Total Sessions", value: stats?.totalRecordSessions ?? 0 },
    { label: "Today's Sessions", value: stats?.todayRecordSessions ?? 0 },
    { label: "Weekly Avg Sessions", value: stats?.weeklyAverageRecordSessions ?? 0 },
  ];

  const periods: { value: Period; label: string }[] = [
    { value: "day", label: "Daily" },
    { value: "week", label: "Weekly" },
    { value: "month", label: "Monthly" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-8">
        Dashboard
      </h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {statCards.map((card, i) => {
          const c = colorMap[statIcons[i].color];
          const Icon = statIcons[i].icon;
          return (
            <div
              key={card.label}
              className="flex items-center gap-4 p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${c.text}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {card.value.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {card.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ticket trend chart */}
      <ChartCard title="Ticket Creation Trend">
        <PeriodTabs periods={periods} selected={ticketPeriod} onChange={setTicketPeriod} />
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ticketTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-slate-500" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="text-slate-500" />
            <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
            <Bar dataKey="created" fill="#7c3aed" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Record session trend chart */}
      <ChartCard title="Record Session Trend">
        <PeriodTabs periods={periods} selected={recordPeriod} onChange={setRecordPeriod} />
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={recordTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-slate-500" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="text-slate-500" />
            <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
            <Area type="monotone" dataKey="created" stroke="#059669" fill="#05966920" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-6">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function PeriodTabs({
  periods,
  selected,
  onChange,
}: {
  periods: { value: Period; label: string }[];
  selected: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg w-fit" role="tablist">
      {periods.map((p) => (
        <button
          key={p.value}
          role="tab"
          type="button"
          aria-selected={selected === p.value}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
            selected === p.value
              ? "bg-white dark:bg-slate-600 text-violet-700 dark:text-violet-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
          }`}
          onClick={() => onChange(p.value)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function TicketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  );
}

function TodayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function AvgIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function RecordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

export default DashboardPage;
