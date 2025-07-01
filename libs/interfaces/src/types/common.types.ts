// WebSocket 관련 타입
export interface WebSocketClient {
  id: string;
  recordId?: number;
  deviceId?: string;
  send: (data: string) => void;
}

// CDP 메시지 타입
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

// 녹화 세션 상태
export enum RecordSessionState {
  IDLE = "idle",
  RECORDING = "recording",
  PAUSED = "paused",
  STOPPED = "stopped",
}

// 페이지 정보
export interface PageInfo {
  url: string;
  title?: string;
  referrer?: string;
}

// 디바이스 정보
export interface DeviceInfo {
  deviceId: string;
  userAgent?: string;
  platform?: string;
  screenWidth?: number;
  screenHeight?: number;
}
