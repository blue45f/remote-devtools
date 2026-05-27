export type RemoteDevToolsSessionStatus =
  | "idle"
  | "waiting"
  | "connected"
  | "running"
  | "stopped"
  | "error";

export type RemoteDevToolsEventLevel = "info" | "warn" | "error" | "debug";
export type RemoteDevToolsActivityLevel =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "debug";

export interface RemoteDevToolsSessionDevice {
  id?: string;
  name?: string;
  platform?: string;
  browser?: string;
  appVersion?: string;
  userAgent?: string;
}

export interface RemoteDevToolsSession {
  id: string;
  name: string;
  roomName?: string;
  status: RemoteDevToolsSessionStatus;
  environment?: string;
  startedAt?: string;
  lastHeartbeatAt?: string;
  device?: RemoteDevToolsSessionDevice;
  participantCount?: number;
  eventsCount?: number;
  roomUrl?: string;
  deviceId?: string;
  tags?: string[];
}

export interface RemoteDevToolsEvent {
  id: string;
  sessionId: string;
  type: string;
  level: RemoteDevToolsEventLevel;
  source: string;
  message: string;
  timestamp: string;
  payload?: unknown;
}

export interface RemoteDevToolsSessionHistory {
  sessionId: string;
  totalEvents: number;
  events: RemoteDevToolsEvent[];
}

export type RemoteDevToolsCommand =
  | "start"
  | "pause"
  | "resume"
  | "replay"
  | "disconnect"
  | "collect";

export interface RemoteDevToolsCommandPayload {
  command: RemoteDevToolsCommand;
  value?: string;
  payload?: Record<string, unknown>;
}

export interface RemoteDevToolsCommandRequest extends Omit<
  RemoteDevToolsCommandPayload,
  "command"
> {
  command: RemoteDevToolsCommand;
}

export interface RemoteDevToolsEventFilter {
  searchText: string;
  level: RemoteDevToolsEventLevel | "all";
}

export interface RemoteDevToolsSessionFilter {
  searchText: string;
  status: RemoteDevToolsSession["status"] | "all";
}

export interface RemoteDevToolsConnectionInfo {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
  lastError?: string;
  lastConnectedAt?: string;
  lastEventAt?: string;
  liveMode?: boolean;
}

export interface RemoteDevToolsActivity {
  id: string;
  sessionId?: string;
  level: RemoteDevToolsActivityLevel;
  message: string;
  details?: string;
  timestamp: string;
}

export interface RemoteDevToolsApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}
