/**
 * Frontend-facing replay event shape.
 *
 * Both demo seed data and the internal backend now return rrweb events with
 * `type`, `timestamp`, and `data` at the top level (the backend was flattened
 * in `session-replay.service.ts`). `normaliseEvent` only falls back to the
 * older `protocol.{type,data,timestamp}` envelope when running against a
 * legacy API that hasn't shipped the flatten change.
 */
export interface ReplayEvent {
  type: number;
  timestamp: number;
  data?: unknown;
}

export interface RawEvent {
  type?: number;
  timestamp?: number | string;
  data?: unknown;
  protocol?: {
    type?: number;
    timestamp?: number;
    data?: unknown;
  };
  isRRWeb?: boolean;
}

/**
 * `/api/session-replay/sessions/:id/events` returns rows in the shape
 * `{ id, eventType, protocol: { type, data, timestamp }, isRRWeb }` (CDP
 * envelope), but rrweb-player and the Timeline UI expect flat
 * `{ type, timestamp, data }`. This adapter collapses both shapes — keep it
 * when changing either side.
 */
export function normaliseEvent(raw: RawEvent): ReplayEvent {
  const type = raw.type ?? raw.protocol?.type ?? 0;
  const timestamp =
    typeof raw.timestamp === 'number'
      ? raw.timestamp
      : (raw.protocol?.timestamp ?? Number(raw.timestamp ?? 0));
  const data = raw.data ?? raw.protocol?.data;
  return { type, timestamp, data };
}
