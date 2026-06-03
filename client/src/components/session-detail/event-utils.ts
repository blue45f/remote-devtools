import { Activity, Eye, FileJson, Globe, Layers, Zap } from 'lucide-react';

const EVENT_META: Record<number, { name: string; icon: typeof Activity }> = {
  0: { name: 'DomLoaded', icon: Globe },
  1: { name: 'PageLoaded', icon: Eye },
  2: { name: 'FullSnapshot', icon: Layers },
  3: { name: 'Incremental', icon: Activity },
  4: { name: 'Meta', icon: FileJson },
  5: { name: 'Custom', icon: Zap },
};

export function getEventMeta(type: number) {
  return (
    EVENT_META[type] ?? {
      name: `Type-${type}`,
      icon: Activity,
    }
  );
}

export function formatTimestampWithMillis(ts: number) {
  const d = new Date(ts);
  const time = d.toLocaleTimeString(undefined, { hour12: false });
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${time}.${ms}`;
}

export function formatPlayhead(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Convert a raw row timestamp (which may be ms or ns depending on the
 * capture path — rrweb sends ms, the CDP-stored DB rows store ns) into a
 * ms-from-session-start offset.
 *
 * Heuristic: if the magnitude of `(row - start)` is way larger than any
 * reasonable session length (1 day = 86_400_000 ms), assume nanoseconds
 * and divide by 1_000_000. Otherwise treat as already-ms.
 */
export function normaliseOffsetMs(rowTimestamp: number, sessionStartMs: number): number {
  const raw = rowTimestamp - sessionStartMs;
  // 24 hours in ms — anything beyond this is almost certainly ns.
  if (Math.abs(raw) > 86_400_000) return Math.max(0, Math.round(raw / 1_000_000));
  return Math.max(0, Math.round(raw));
}

export function formatBytes(n?: number): string {
  if (!n || !Number.isFinite(n)) return '—';
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}
