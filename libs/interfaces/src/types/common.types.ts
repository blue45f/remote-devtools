// WebSocket related types
export interface WebSocketClient {
  id: string;
  recordId?: number;
  deviceId?: string;
  send: (data: string) => void;
}

// CDP message types
export interface CDPMessage {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

// Recording session state
export enum RecordSessionState {
  IDLE = "idle",
  RECORDING = "recording",
  PAUSED = "paused",
  STOPPED = "stopped",
}

// Page information
export interface PageInfo {
  url: string;
  title?: string;
  referrer?: string;
}

// Device information
export interface DeviceInfo {
  deviceId: string;
  userAgent?: string;
  platform?: string;
  screenWidth?: number;
  screenHeight?: number;
}
