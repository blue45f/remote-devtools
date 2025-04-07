/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { BaseDomain, Option } from "./base";
import { CSS } from "./css";
import { Dom } from "./dom";
import { Network } from "./network";
import { Overlay } from "./overlay";
import { Page } from "./page";
import protocol from "./protocol";
import { Runtime } from "./runtime";
import { ScreenPreview } from "./screen-preview";
import { SessionReplay } from "./session-replay";

export class ChromeDomain {
  private recordMode: boolean = false;

  constructor(option: Option, recordMode?: boolean) {
    this.recordMode = recordMode || false;
    this.registerProtocol(option);
    // startImmediateCapture()를 통해 명시적으로 시작
  }

  public registerProtocol(option: Option): void {
    this.domains = [
      new Network(option),
      new Dom(option),
      new Overlay(option),
      new Runtime(option),
      new CSS(option),
      new Page(option),
      new ScreenPreview(option), // 실시간 미러링용
      new SessionReplay(option), // 세션 기록/재생용
    ];

    this.domains.forEach((domain) => {
      const name = domain.namespace as keyof typeof protocol;
      const commands = protocol[name];
      // SessionReplay 같은 커스텀 도메인은 protocol에 없을 수 있음
      if (commands && Array.isArray(commands)) {
        commands.forEach((cmd) => {
          this.protocol.set(
            `${name}.${cmd}`,
            (domain as any)[cmd].bind(domain),
          );
        });
      }
    });
  }

  /**
   * Execution CDP method
   * @public
   * @param {Object} message socket data
   */
  public execute(
    message: { id?: number | null; method?: string | null; params?: any } = {
      id: null,
      method: null,
      params: null,
    },
  ): { id: number | null; result?: any } {
    const { id, method, params } = message;
    const methodCall = this.protocol.get(method);
    if (typeof methodCall !== "function") return { id: id || null };

    return { id: id || null, result: methodCall(params) };
  }

  public updateRoomInfo(roomInfo: {
    room: string;
    recordMode?: boolean;
    socket: WebSocket | null;
    deviceId?: string;
    url?: string;
    title?: string;
  }): void {
    this.domains.forEach((domain) => {
      domain.updateRoomInfo(roomInfo);

      // SessionReplay는 연결 시 버퍼 플러시
      if (domain.namespace === "SessionReplay") {
        const sessionReplay = domain as SessionReplay;
        sessionReplay.onRoomConnected();
      }
      // ScreenPreview는 모든 모드에서 화면 캡처 (버퍼 모드, 녹화 모드 모두)
      else if (domain.namespace === "ScreenPreview") {
        const screenPreview = domain as ScreenPreview;
        screenPreview.startPreview();
      } else if (typeof domain.enable === "function") {
        // 다른 도메인들은 일반 enable
        domain.enable();
      }
    });
  }

  /**
   * 페이지 로드 시점부터 즉시 캡처 시작 (SessionReplay용)
   */
  public startImmediateCapture(): void {
    const sessionReplayDomain = this.domains.find(
      (d) => d.namespace === "SessionReplay",
    ) as SessionReplay;
    if (sessionReplayDomain) {
      sessionReplayDomain.startRecording();
    } else {
      console.warn("[SDK ChromeDomain] SessionReplay domain not found!");
    }
  }

  /**
   * 새로운 기록을 위해 도메인 상태 리셋
   */
  public resetForNewRecording(): void {
    // SessionReplay 리셋 및 재시작
    const sessionReplayDomain = this.domains.find(
      (d) => d.namespace === "SessionReplay",
    ) as SessionReplay;
    if (sessionReplayDomain) {
      sessionReplayDomain.stopRecording();

      // 다시 기록 시작
      sessionReplayDomain.startRecording();
    }

    // ScreenPreview는 리셋만 (실시간이므로 자동으로 계속됨)
    const screenPreviewDomain = this.domains.find(
      (d) => d.namespace === "ScreenPreview",
    ) as ScreenPreview;
    if (
      screenPreviewDomain &&
      typeof screenPreviewDomain.stopPreview === "function"
    ) {
      screenPreviewDomain.stopPreview();
    }
  }

  /**
   * ScreenPreview 인스턴스에 접근
   */
  public getScreenPreview(): ScreenPreview | null {
    return (
      (this.domains.find(
        (domain) => domain.namespace === "ScreenPreview",
      ) as ScreenPreview) || null
    );
  }

  /**
   * 모든 도메인 정지 및 리소스 정리
   */
  public stopAllDomains(): void {
    this.domains.forEach((domain) => {
      // ScreenPreview의 stopPreview 호출
      if (domain.namespace === "ScreenPreview" && "stopPreview" in domain) {
        (domain as any).stopPreview();
      }
      // SessionReplay의 stopRecording 호출
      if (domain.namespace === "SessionReplay" && "stopRecording" in domain) {
        (domain as any).stopRecording();
      }
      // 모든 도메인의 socket을 null로 설정
      domain.socket = null;
    });
  }

  /**
   * 현재 room 이름 반환
   */
  public getCurrentRoom(): string | null {
    return this.domains[0]?.room || null;
  }

  /**
   * 모든 도메인의 deviceId 업데이트
   */
  public updateDeviceId(deviceId: string): void {
    this.domains.forEach((domain) => {
      domain.deviceId = deviceId;
    });
  }

  /**
   * 모든 도메인 활성화 - 캐시된 데이터들을 서버로 전송
   */
  public enable(): void {
    this.domains.forEach((domain) => {
      domain.enable();
    });
  }

  public flushNetworkCacheForRecord(): void {
    const networkDomain = this.domains.find(
      (domain) => domain.namespace === "Network",
    ) as Network | undefined;
    if (
      networkDomain &&
      typeof networkDomain.flushCachedEventsForRecord === "function"
    ) {
      networkDomain.flushCachedEventsForRecord();
    }
  }

  public flushConsoleCacheForRecord(): void {
    const runtimeDomain = this.domains.find(
      (domain) => domain.namespace === "Runtime",
    ) as Runtime | undefined;
    if (
      runtimeDomain &&
      typeof runtimeDomain.flushCachedConsoleForRecord === "function"
    ) {
      runtimeDomain.flushCachedConsoleForRecord();
    }
  }

  public flushSessionReplayForRecord(): void {
    const sessionReplayDomain = this.domains.find(
      (domain) => domain.namespace === "SessionReplay",
    ) as SessionReplay | undefined;
    if (
      sessionReplayDomain &&
      typeof sessionReplayDomain.onRoomConnected === "function"
    ) {
      sessionReplayDomain.onRoomConnected();
    }
  }

  /**
   * 모든 도메인 비활성화 - 연결 해제 시 상태 초기화
   */
  public disable(): void {
    this.domains.forEach((domain) => {
      domain.disable();
    });
    // console.log('All domains disabled')
  }

  private protocol = new Map();
  private domains: BaseDomain[] = [];
}
