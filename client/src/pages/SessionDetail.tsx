import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/api";

interface SessionMetadata {
  id: number;
  room?: string;
  deviceId?: string;
  url?: string;
  duration?: number;
  recordMode?: boolean;
  createdAt?: string;
  eventCount?: number;
}

interface ReplayEvent {
  type: number;
  timestamp: number;
  data?: unknown;
}

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: metadata, isLoading: metaLoading } = useQuery({
    queryKey: ["session-metadata", id],
    queryFn: () => apiFetch<SessionMetadata>(`/api/session-replay/sessions/${id}`),
    enabled: !!id,
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["session-events", id],
    queryFn: () => apiFetch<ReplayEvent[]>(`/api/session-replay/sessions/${id}/events`),
    enabled: !!id,
  });

  const loading = metaLoading || eventsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span className="text-sm">Loading session...</span>
        </div>
      </div>
    );
  }

  const eventTypes = (events ?? []).reduce<Record<string, number>>((acc, e) => {
    const type = mapEventType(e.type);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 mb-6">
        <Link to="/sessions" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
          Sessions
        </Link>
        <span>/</span>
        <span className="text-slate-700 dark:text-slate-300">#{id}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Session #{id}
          </h1>
          {metadata?.url && (
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-lg">
              {metadata.url}
            </p>
          )}
        </div>
        {metadata?.recordMode !== undefined && (
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            metadata.recordMode
              ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400"
          }`}>
            {metadata.recordMode ? "Recording" : "Live"}
          </span>
        )}
      </div>

      {/* Metadata cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <MetaCard label="Events" value={String(events?.length ?? 0)} />
        <MetaCard label="Device" value={metadata?.deviceId?.slice(0, 16) ?? "N/A"} />
        <MetaCard label="Duration" value={formatDuration(metadata?.duration)} />
        <MetaCard label="Created" value={metadata?.createdAt ? new Date(metadata.createdAt).toLocaleString() : "N/A"} />
      </div>

      {/* Event breakdown */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Event Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(eventTypes).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <span className="text-sm text-slate-600 dark:text-slate-400">{type}</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{count}</span>
            </div>
          ))}
          {Object.keys(eventTypes).length === 0 && (
            <p className="text-sm text-slate-400 col-span-full">No events recorded</p>
          )}
        </div>
      </div>

      {/* Event timeline */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          Event Timeline ({events?.length ?? 0})
        </h2>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {(events ?? []).slice(0, 100).map((event, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded text-xs">
              <span className="w-8 text-slate-400 text-right">{i + 1}</span>
              <span className={`px-2 py-0.5 rounded font-medium ${getEventColor(event.type)}`}>
                {mapEventType(event.type)}
              </span>
              <span className="text-slate-400 ml-auto">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
          {(events?.length ?? 0) > 100 && (
            <p className="text-xs text-slate-400 text-center pt-2">
              Showing first 100 of {events?.length} events
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
      <span className="text-xs text-slate-400 dark:text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{value}</span>
    </div>
  );
}

function formatDuration(nanos?: number): string {
  if (!nanos || nanos <= 0) return "N/A";
  const ms = nanos / 1_000_000;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

function mapEventType(type: number): string {
  switch (type) {
    case 0: return "DomLoaded";
    case 1: return "PageLoaded";
    case 2: return "FullSnapshot";
    case 3: return "Incremental";
    case 4: return "Meta";
    case 5: return "Custom";
    default: return `Type-${type}`;
  }
}

function getEventColor(type: number): string {
  switch (type) {
    case 2: return "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400";
    case 3: return "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case 4: return "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400";
    default: return "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400";
  }
}
