import type * as WebSocket from "ws";

// ---------------------------------------------------------------------------
// Types -- WebSocket 룸 및 연결 상태 관련 타입 정의
// ---------------------------------------------------------------------------

/**
 * WebSocket 룸의 상태를 나타내는 타입.
 */
export type RoomData = {
  client: WebSocket;
  devtools: Map<string, WebSocket>;
  recordMode: boolean;
  recordId: number | null;
};

/**
 * DevTools 연결 정보를 룸에 매핑하는 타입.
 */
export type DevtoolsData = {
  room: string;
  devtoolsId: string;
};

/**
 * 버퍼 모드 룸의 메타데이터를 나타내는 타입.
 */
export type BufferRoomInfo = {
  deviceId: string;
  url: string;
  userAgent: string;
  title?: string;
  sessionStartTime?: number;
};

/**
 * 연결 해제 후에도 유지되는 버퍼 정보 타입.
 */
export type LastBufferInfo = BufferRoomInfo & { room: string };

// ---------------------------------------------------------------------------
// Exported Types -- 외부 모듈에서 사용하는 공유 타입
// ---------------------------------------------------------------------------

/**
 * SDK에서 전달되는 공통 사용자/디바이스 정보 타입.
 */
export type CommonInfo = {
  user: {
    userAppData?: string;
    userBaedal?: string;
    authorization: string;
    memberId: string;
    memberNumber: string;
    perseusClientId?: string;
    perseusSessionId?: string;
  };
  device: {
    adid: string;
    att?: number;
    appsflyerId: string;
    deviceBaedal?: string;
    deviceId: string;
    sessionId: string;
    actionTrackingKey?: string;
    osVersion: string;
    webUserAgent: string;
    deviceModel: string;
    carrier: string;
    idfv?: string;
  };
  supportData: string;
  URL: string;
  userAgent: string;
};

/**
 * 에이전트(브라우저/OS) 정보 타입.
 */
export type AgentInfo = {
  os: string;
  browser: string;
  URL: string;
};

/**
 * Jira 티켓 생성 시 사용되는 폼 데이터 타입.
 */
export type TicketFormData = {
  Epic: string;
  assignee: string;
  title?: string;
  components: string[];
  labels?: string[];
};

/**
 * SDK에서 전달되는 사용자 데이터 타입.
 */
export type UserData = {
  commonInfo?: CommonInfo;
  userAgent: string;
  URL: string;
  webTitle: string;
};
