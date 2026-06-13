export type RemoteSessionStatus =
  | 'idle'
  | 'waiting'
  | 'connected'
  | 'running'
  | 'stopped'
  | 'error';

export type RemoteEventLevel = 'info' | 'warn' | 'error' | 'debug';

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
