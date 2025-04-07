import { logger } from "../utils/logger";

export type Option = {
  socket: WebSocket | null;
  interceptor?: (data: { method: string; params?: unknown }) => void;
  recordMode?: boolean;
  room?: string;
  deviceId?: string;
  url?: string;
  onBufferEvent?: () => void;
  title?: string;
};

export abstract class BaseDomain {
  protected interceptor?: (data: { method: string; params?: unknown }) => void;
  protected onBufferEvent?: () => void;

  constructor(option: Option) {
    this.socket = option.socket;
    this.interceptor = option.interceptor;
    this.recordMode = option.recordMode || false;
    this.room = option.room || "";
    this.deviceId = option.deviceId || "unknown-device";
    this.url = option.url || "";
    this.onBufferEvent = option.onBufferEvent;
    this.title =
      option.title || (typeof document !== "undefined" ? document.title : "");
  }

  // Domain 활성화 되었을 때 취할 행동 오버라이드
  abstract enable(): void;

  // Domain 비활성화 메서드 (기본 구현 제공)
  public disable(): void {
    // 자식 클래스에서 오버라이드할 수 있도록 기본 구현만 제공
  }

  // namespace 반드시 명시 (ex. "Network")
  abstract namespace: string;

  public sendProtocol(data: any): void {
    // interceptor가 있고 method가 있는 경우 호출
    if (this.interceptor && data.method) {
      this.interceptor(data);
    }

    // room 정보가 없으면 조용히 무시 (경고 없이)
    if (!this.room) {
      return;
    }

    if (!this.socket) {
      // Socket이 없으면 조용히 무시
      return;
    }

    if (this.socket.readyState !== WebSocket.OPEN) {
      // WebSocket이 닫힌 상태에서는 조용히 무시
      // 연결 종료 후 일부 이벤트가 발생할 수 있으므로 에러 로그 없이 처리
      return;
    }

    // Buffer 모드인지 확인 (room이 Buffer-로 시작하는지)
    const isBufferMode = this.room && this.room.startsWith("Buffer-");

    let payload: string;

    if (isBufferMode) {
      // Buffer 모드일 때는 bufferEvent로 전송
      this.onBufferEvent?.();
      const latestTitle =
        typeof document !== "undefined" ? document.title : this.title;
      if (latestTitle) {
        this.title = latestTitle;
      }
      payload = JSON.stringify({
        event: "bufferEvent",
        data: {
          room: this.room,
          recordId: 0, // Buffer 모드에서는 recordId가 0
          deviceId: this.deviceId || "unknown-device",
          url: this.url || window.location.href,
          userAgent: navigator.userAgent,
          title: this.title || latestTitle || "",
          event: {
            method: data.method,
            params: data.params,
            timestamp: Date.now(),
          },
        },
      });
      // console.log 제거: Runtime.consoleAPICalled 무한 재귀 방지
    } else {
      // 일반 모드일 때는 기존 방식 사용
      payload = JSON.stringify({
        event: "protocolToAllDevtools",
        data: {
          room: this.room,
          message: JSON.stringify(data),
        },
      });
      // console.log 제거: Runtime.consoleAPICalled 무한 재귀 방지
    }

    try {
      this.socket.send(payload);
    } catch (error) {
      logger.remote.error("Failed to send message:", error);
      logger.remote.debug("Message was:", (data as any).method);
    }
  }

  public updateRoomInfo({
    room,
    recordMode = false,
    socket,
    deviceId,
    url,
    title,
  }: {
    room: string;
    socket: WebSocket | null;
    recordMode?: boolean;
    deviceId?: string;
    url?: string;
    title?: string;
  }): void {
    this.room = room;
    this.recordMode = recordMode;
    this.socket = socket;
    if (deviceId) this.deviceId = deviceId;
    if (url) this.url = url;
    if (title) this.title = title;

    // 연결이 끊어진 경우에만 도메인 비활성화
    // enable()은 명시적으로 호출될 때만 실행되도록 변경
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      this.disable();
    }
  }

  public socket: WebSocket | null;
  public room: string | null = null;
  public recordMode: boolean = false;
  public deviceId: string | null = null;
  public url: string | null = null;
  public title: string | null = null;
}
