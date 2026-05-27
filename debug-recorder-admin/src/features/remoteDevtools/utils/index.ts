import { CONFIG } from "@/shared/constants";
import type {
  RemoteDevToolsEvent,
  RemoteDevToolsEventLevel,
  RemoteDevToolsSession,
} from "../types";

const SUPPORTED_LEVELS: RemoteDevToolsEventLevel[] = [
  "info",
  "warn",
  "error",
  "debug",
];

export function parseRemoteDevToolsLevel(
  value: unknown,
): RemoteDevToolsEventLevel {
  if (typeof value !== "string") {
    return "info";
  }

  const normalized = value.toLowerCase();
  return SUPPORTED_LEVELS.includes(normalized as RemoteDevToolsEventLevel)
    ? (normalized as RemoteDevToolsEventLevel)
    : "info";
}

export function parseRemoteDevToolsTimestamp(value: unknown): string {
  if (value instanceof Date) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? new Date().toISOString()
      : parsed.toISOString();
  }

  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? new Date().toISOString()
      : parsed.toISOString();
  }

  if (typeof value !== "string") {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : value;
}

export function buildRemoteDevToolsWsUrl(
  sessionId: string,
  baseUrl = CONFIG.REMOTE_DEVTOOLS_WS_URL,
): string {
  const base = baseUrl.trim();
  if (!base) {
    return "";
  }

  const safeSessionId = encodeURIComponent(sessionId);

  if (base.includes("{sessionId}")) {
    return base.replace("{sessionId}", safeSessionId);
  }

  if (base.endsWith("/")) {
    return `${base}sessions/${safeSessionId}/events`;
  }

  if (/sessionId=/.test(base)) {
    return base.includes(`sessionId=${safeSessionId}`)
      ? base
      : `${base}${base.includes("?") ? "&" : "?"}sessionId=${safeSessionId}`;
  }

  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}sessionId=${safeSessionId}`;
}

export function mergeRemoteDevToolsEvents(
  current: RemoteDevToolsEvent[],
  incoming: RemoteDevToolsEvent[],
  maxCount: number,
): RemoteDevToolsEvent[] {
  const map = new Map<string, RemoteDevToolsEvent>();

  for (const event of [...current, ...incoming]) {
    map.set(event.id, event);
  }

  return [...map.values()]
    .sort((a, b) =>
      parseRemoteDevToolsTimestamp(b.timestamp).localeCompare(
        parseRemoteDevToolsTimestamp(a.timestamp),
      ),
    )
    .slice(0, maxCount);
}

export function normalizeRemoteDevToolsEvent(
  raw: unknown,
  fallbackSessionId: string,
): RemoteDevToolsEvent | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const candidate =
    typeof record.event === "object" && record.event !== null
      ? (record.event as Record<string, unknown>)
      : record;

  const message =
    typeof candidate.message === "string"
      ? candidate.message
      : typeof candidate.type === "string"
        ? candidate.type
        : JSON.stringify(candidate);

  const eventId =
    typeof candidate.id === "string"
      ? candidate.id
      : `${fallbackSessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const source =
    typeof candidate.source === "string" ? candidate.source : "remote-devtools";
  const type =
    typeof candidate.type === "string" ? candidate.type : "recording-event";

  return {
    id: eventId,
    sessionId:
      typeof candidate.sessionId === "string"
        ? candidate.sessionId
        : fallbackSessionId,
    level: parseRemoteDevToolsLevel(candidate.level),
    source,
    type,
    message,
    timestamp: parseRemoteDevToolsTimestamp(candidate.timestamp),
    payload: candidate.payload,
  };
}

export const DEFAULT_SESSION_STATUS_FILTER:
  | "all"
  | RemoteDevToolsSession["status"] = "all";

export {
  doesRemoteDevToolsCommandRequireValue,
  getRemoteDevToolsCommandsForStatus,
  isRemoteDevToolsCommandAllowed,
  REMOTE_DEVTOOLS_COMMAND_LABELS,
  REMOTE_DEVTOOLS_COMMAND_POLICIES,
  type RemoteDevToolsCommandPolicy,
} from "./commandPolicies";
