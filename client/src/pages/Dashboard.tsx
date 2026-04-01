import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Legend,
} from "recharts";

import { apiFetch } from "../lib/api";

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
  developer: number;
  designer: number;
  pm: number;
  qa: number;
  other: number;
}

interface RecordTrendItem extends TrendItem {
  messages: number;
  participants: number;
}

type Period = "day" | "week" | "month";

const API_HOST = import.meta.env.VITE_HOST || "http://localhost:3000";

const JOB_COLORS = {
  developer: "#7c3aed",
  designer: "#ec4899",
  pm: "#f59e0b",
  qa: "#10b981",
  other: "#94a3b8",
};

const DashboardPage = () => {
  const [ticketPeriod, setTicketPeriod] = useState<Period>("day");
  const [recordPeriod, setRecordPeriod] = useState<Period>("day");

  const { data: statsData, isLoading: loading, error: statsError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiFetch<{ data: DashboardStats }>("/api/dashboard/stats"),
  });

  const { data: liveData } = useQuery({
    queryKey: ["live-sessions"],
    queryFn: () => apiFetch<unknown[]>("/sessions").catch(() => []),
    refetchInterval: 30_000,
  });

  const { data: ticketData } = useQuery({
    queryKey: ["ticket-trend", ticketPeriod],
    queryFn: () =>
      apiFetch<{ data: TrendItem[] }>(`/api/dashboard/tickets/trend?period=${ticketPeriod}`),
  });

  const { data: recordData } = useQuery({
    queryKey: ["record-trend", recordPeriod],
    queryFn: () =>
      apiFetch<{ data: RecordTrendItem[] }>(`/api/dashboard/record-sessions/trend?period=${recordPeriod}`),
  });

  const stats = statsData?.data ?? null;
  const liveSessions = Array.isArray(liveData) ? liveData.length : 0;
  const ticketTrend = ticketData?.data ?? [];
  const recordTrend = recordData?.data ?? [];
  const error = statsError ? "Failed to load dashboard statistics." : null;

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
        <button type="button" onClick={() => window.location.reload()} className="text-sm text-violet-600 dark:text-violet-400 hover:underline">Retry</button>
      </div>
    );
  }

  const statCards = [
    { label: "Total Tickets", value: stats?.totalTickets ?? 0, icon: TicketIcon, color: "violet" },
    { label: "Today's Tickets", value: stats?.todayTickets ?? 0, icon: TodayIcon, color: "blue" },
    { label: "Weekly Avg", value: stats?.weeklyAverage ?? 0, icon: AvgIcon, color: "indigo" },
    { label: "Total Sessions", value: stats?.totalRecordSessions ?? 0, icon: RecordIcon, color: "emerald" },
    { label: "Today's Sessions", value: stats?.todayRecordSessions ?? 0, icon: TodayIcon, color: "teal" },
    { label: "Live Now", value: liveSessions, icon: LiveIcon, color: "rose" },
  ];

  const colorMap: Record<string, { bg: string; text: string }> = {
    violet: { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-600 dark:text-violet-400" },
    blue: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
    indigo: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400" },
    emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
    teal: { bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-600 dark:text-teal-400" },
    rose: { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-600 dark:text-rose-400" },
  };

  const periods: { value: Period; label: string }[] = [
    { value: "day", label: "Daily" },
    { value: "week", label: "Weekly" },
    { value: "month", label: "Monthly" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-8">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {statCards.map((card) => {
          const c = colorMap[card.color];
          return (
            <div key={card.label} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${c.text}`} />
              </div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{card.value.toLocaleString()}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Ticket trend - Stacked bar chart by job type */}
      <ChartCard title="Ticket Creation by Role">
        <PeriodTabs periods={periods} selected={ticketPeriod} onChange={setTicketPeriod} />
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ticketTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-slate-500" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-slate-500" />
            <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="developer" stackId="a" fill={JOB_COLORS.developer} name="Developer" radius={[0, 0, 0, 0]} />
            <Bar dataKey="designer" stackId="a" fill={JOB_COLORS.designer} name="Designer" />
            <Bar dataKey="pm" stackId="a" fill={JOB_COLORS.pm} name="PM" />
            <Bar dataKey="qa" stackId="a" fill={JOB_COLORS.qa} name="QA" />
            <Bar dataKey="other" stackId="a" fill={JOB_COLORS.other} name="Other" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Record session trend */}
      <ChartCard title="Record Session Trend">
        <PeriodTabs periods={periods} selected={recordPeriod} onChange={setRecordPeriod} />
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={recordTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-slate-500" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-slate-500" />
            <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }} />
            <Area type="monotone" dataKey="created" stroke="#059669" fill="#05966920" strokeWidth={2} name="Sessions" />
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

function PeriodTabs({ periods, selected, onChange }: { periods: { value: Period; label: string }[]; selected: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg w-fit" role="tablist">
      {periods.map((p) => (
        <button key={p.value} role="tab" type="button" aria-selected={selected === p.value}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${selected === p.value ? "bg-white dark:bg-slate-600 text-violet-700 dark:text-violet-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}
          onClick={() => onChange(p.value)}>{p.label}</button>
      ))}
    </div>
  );
}

function TicketIcon({ className }: { className?: string }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>);
}
function TodayIcon({ className }: { className?: string }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>);
}
function AvgIcon({ className }: { className?: string }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>);
}
function RecordIcon({ className }: { className?: string }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>);
}
function LiveIcon({ className }: { className?: string }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M9.172 15.828a4 4 0 010-5.656m5.656 0a4 4 0 010 5.656M12 12h.01" /></svg>);
}

export default DashboardPage;
