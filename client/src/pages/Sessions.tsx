import { useEffect, useState } from "react";

const API_HOST = import.meta.env.VITE_HOST || "http://localhost:3000";

const SessionsPage = () => {
  const [sessions, setSessions] = useState<{ id: number; name: string }[]>([]);
  const [selectedTab, setSelectedTab] = useState<"record" | "live">("record");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const endpoint =
      selectedTab === "record"
        ? `${API_HOST}/sessions/record`
        : `${API_HOST}/sessions`;

    void fetch(endpoint)
      .then((response) => response.json())
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load session list.");
        setSessions([]);
        setLoading(false);
      });
  }, [selectedTab]);

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">
        Sessions
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit" role="tablist">
        <button
          role="tab"
          type="button"
          aria-selected={selectedTab === "record"}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedTab === "record"
              ? "bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
          onClick={() => setSelectedTab("record")}
        >
          Record Sessions
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={selectedTab === "live"}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedTab === "live"
              ? "bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
          onClick={() => setSelectedTab("live")}
        >
          Live Sessions
        </button>
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
            onClick={() => setSelectedTab(selectedTab)}
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && sessions.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-slate-500 dark:text-slate-400">No sessions found</p>
        </div>
      )}

      {/* Session grid */}
      {!loading && !error && sessions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="tabpanel">
          {sessions.map((session) => (
            <a
              key={session.id}
              href={convertLink(
                session.name,
                selectedTab === "record" ? session.id : undefined,
              )}
              className="group flex flex-col gap-3 p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${selectedTab === "live" ? "bg-green-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600"}`} />
                <h2 className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors truncate">
                  {session.name}
                </h2>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Click to enter the session
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

const convertLink = (room: string, recordId?: number) => {
  const host = import.meta.env.VITE_HOST || "http://localhost:3000";
  const wsHost = host.replace(/^https?:\/\/(.+)$/, "$1");
  const record = recordId ? `&recordMode=true&recordId=${recordId}` : "";
  const wsUrl = encodeURIComponent(`${wsHost}?room=${room}${record}`);
  const protocol = host.startsWith("https") ? "wss" : "ws";
  return `${host}/tabbed-debug/?${protocol}=${wsUrl}`;
};

export default SessionsPage;
