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
import styles from "./Dashboard.module.css";

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
    void fetch(
      `${API_HOST}/api/dashboard/record-sessions/trend?period=${period}`,
    )
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
      <div className={styles.container}>
        <h1 className={styles.title}>Dashboard</h1>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Dashboard</h1>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Tickets", value: stats?.totalTickets ?? 0 },
    { label: "Today's Tickets", value: stats?.todayTickets ?? 0 },
    { label: "Weekly Avg Tickets", value: stats?.weeklyAverage ?? 0 },
    { label: "Total Record Sessions", value: stats?.totalRecordSessions ?? 0 },
    {
      label: "Today's Record Sessions",
      value: stats?.todayRecordSessions ?? 0,
    },
    {
      label: "Weekly Avg Sessions",
      value: stats?.weeklyAverageRecordSessions ?? 0,
    },
  ];

  const periods: { value: Period; label: string }[] = [
    { value: "day", label: "Daily" },
    { value: "week", label: "Weekly" },
    { value: "month", label: "Monthly" },
  ];

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>

      <div className={styles.statsGrid}>
        {statCards.map((card) => (
          <div key={card.label} className={styles.statCard}>
            <span className={styles.statValue}>{card.value}</span>
            <span className={styles.statLabel}>{card.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.chartSection}>
        <h2 className={styles.chartTitle}>Ticket Creation Trend</h2>
        <div className={styles.periodTabs}>
          {periods.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`${styles.periodTab} ${ticketPeriod === p.value ? styles.periodTabActive : ""}`}
              onClick={() => setTicketPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ticketTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="created" fill="#007bff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.chartSection}>
        <h2 className={styles.chartTitle}>Record Session Trend</h2>
        <div className={styles.periodTabs}>
          {periods.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`${styles.periodTab} ${recordPeriod === p.value ? styles.periodTabActive : ""}`}
              onClick={() => setRecordPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={recordTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="created"
              stroke="#28a745"
              fill="#28a74533"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardPage;
