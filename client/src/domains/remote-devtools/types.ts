export type RemoteSessionStatus =
  | 'idle'
  | 'waiting'
  | 'connected'
  | 'running'
  | 'stopped'
  | 'error';

export type RemoteEventLevel = 'info' | 'warn' | 'error' | 'debug';

export type RemoteActivityLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';

export type RemoteCommand = 'start' | 'pause' | 'resume' | 'replay' | 'disconnect' | 'collect';

export interface RemoteSessionDevice {
  id?: string;
  name?: string;
  platform?: string;
  browser?: string;
  appVersion?: string;
  userAgent?: string;
}

export interface RemoteSession {
  id: string;
  name: string;
  roomName?: string;
  status: RemoteSessionStatus;
  environment?: string;
  startedAt?: string;
  lastHeartbeatAt?: string;
  device?: RemoteSessionDevice;
  participantCount?: number;
  eventsCount?: number;
  roomUrl?: string;
  deviceId?: string;
  tags?: string[];
}

export interface RemoteEvent {
  id: string;
  sessionId: string;
  type: string;
  level: RemoteEventLevel;
  source: string;
  message: string;
  timestamp: string;
  payload?: unknown;
}

export interface RemoteCommandPayload {
  command: RemoteCommand;
  value?: string;
  payload?: Record<string, unknown>;
}

export interface RemoteActivity {
  id: string;
  sessionId?: string;
  level: RemoteActivityLevel;
  message: string;
  details?: string;
  timestamp: string;
}
