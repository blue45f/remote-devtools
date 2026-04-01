import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/api";

interface SessionRecord {
  id: number;
  name: string;
  url?: string;
  deviceId?: string;
  duration?: string | number;
  recordMode?: boolean;
  timestamp?: string;
}

const SessionsPage = () => {
  const [selectedTab, setSelectedTab] = useState<"record" | "live">("record");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");

  const {
    data: sessions = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["sessions", selectedTab],
    queryFn: () =>
      apiFetch<SessionRecord[]>(
        selectedTab === "record" ? "/sessions/record" : "/sessions",
      ),
  });

  const error = queryError ? "Failed to load session list." : null;
  const retry = () => void refetch();

  const filteredSessions = useMemo(() => {
    let result = sessions;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.url?.toLowerCase().includes(q) ||
          s.deviceId?.toLowerCase().includes(q),
      );
    }

    if (sortBy === "newest") {
      result = [...result].sort(
        (a, b) =>
          new Date(b.timestamp || 0).getTime() -
          new Date(a.timestamp || 0).getTime(),
      );
    } else if (sortBy === "oldest") {
      result = [...result].sort(
        (a, b) =>
          new Date(a.timestamp || 0).getTime() -
          new Date(b.timestamp || 0).getTime(),
      );
    } else {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [sessions, searchQuery, sortBy]);

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
          Sessions
        </h1>
        <span className="text-sm text-slate-400 dark:text-slate-500">
          {filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Tabs + Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div
          className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit"
          role="tablist"
        >
          <TabButton
            selected={selectedTab === "record"}
            onClick={() => setSelectedTab("record")}
          >
            Record Sessions
          </TabButton>
          <TabButton
            selected={selectedTab === "live"}
            onClick={() => setSelectedTab("live")}
          >
            Live Sessions
          </TabButton>
        </div>

        <div className="flex gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, URL, device..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search sessions"
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Sort sessions"
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-sm" aria-live="polite">Loading sessions...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filteredSessions.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            {searchQuery ? "No sessions match your search" : "No sessions found"}
          </p>
        </div>
      )}

      {/* Session grid */}
      {!loading && !error && filteredSessions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="tabpanel">
          {filteredSessions.map((session) => (
            <a
              key={session.id}
              href={convertLink(
                session.name,
                selectedTab === "record" ? session.id : undefined,
              )}
              className="group flex flex-col gap-2 p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      selectedTab === "live"
                        ? "bg-green-500 animate-pulse"
                        : "bg-violet-400"
                    }`}
                  />
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors truncate text-sm">
                    {session.name}
                  </h2>
                </div>
                {session.recordMode !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      session.recordMode
                        ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                        : "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400"
                    }`}
                  >
                    {session.recordMode ? "REC" : "LIVE"}
                  </span>
                )}
              </div>

              {/* URL */}
              {session.url && (
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                  {session.url}
                </p>
              )}

              {/* Metadata row */}
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 dark:text-slate-500">
                {session.duration && Number(session.duration) > 0 && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    {formatDuration(Number(session.duration))}
                  </span>
                )}
                {session.deviceId && (
                  <span className="flex items-center gap-1 truncate max-w-[120px]">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    {session.deviceId.slice(0, 12)}...
                  </span>
                )}
                {session.timestamp && (
                  <span className="ml-auto">{formatTimeAgo(session.timestamp)}</span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

function TabButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      type="button"
      aria-selected={selected}
      className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
        selected
          ? "bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-400 shadow-sm"
          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function formatDuration(nanos: number): string {
  const ms = nanos / 1_000_000;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60)
    return `${minutes}m ${remainingSeconds > 0 ? `${remainingSeconds}s` : ""}`.trim();
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

const convertLink = (room: string, recordId?: number) => {
  const host = import.meta.env.VITE_HOST || "http://localhost:3000";
  const wsHost = host.replace(/^https?:\/\/(.+)$/, "$1");
  const record = recordId ? `&recordMode=true&recordId=${recordId}` : "";
  const wsUrl = encodeURIComponent(`${wsHost}?room=${room}${record}`);
  const protocol = host.startsWith("https") ? "wss" : "ws";
  return `${host}/tabbed-debug/?${protocol}=${wsUrl}`;
};

export default SessionsPage;
