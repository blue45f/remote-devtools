/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import type { eventWithTime } from "@rrweb/types";
import * as rrweb from "rrweb";

import { BaseDomain } from "./base";

/**
 * SessionReplay - rrweb 기반 세션 기록
 * 더 안정적이고 완벽한 세션 리플레이 구현
 */
export class SessionReplay extends BaseDomain {
  public namespace = "SessionReplay";

  // rrweb 관련
  private stopRecordingFn: ReturnType<typeof rrweb.record> | null = null;
  private eventBuffer: eventWithTime[] = [];
  private buffering = true;
  private recording = false;
  private eventSequence = 0;
  private lastBufferedEvents: eventWithTime[] = [];

  /**
   * enable - CDP 명령 호환성
   */
  public enable(): void {
    // CDP enable 시 자동 시작하지 않음
    // startRecording을 명시적으로 호출해야 함
  }

  /**
   * 세션 기록 시작 (rrweb 사용)
   */
  public startRecording(): void {
    // Buffer 모드에서는 기존 기록을 중지하고 새로 시작
    const isBufferMode = this.room && this.room.startsWith("Buffer-");

    if (this.recording && isBufferMode) {
      this.stopRecording();
    } else if (this.recording) {
      return;
    }

    // DOM이 완전히 로드되지 않은 경우 대기
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          this.startRecording();
        },
        { once: true },
      );
      return;
    }

    // matches polyfill 추가 (텍스트 노드 오류 방지)
    this.addMatchesPolyfill();
    this.recording = true;
    this.buffering = true;
    this.eventBuffer = [];
    this.eventSequence = 0;

    // rrweb 설정 옵션
    const options: any = {
      emit: (event: any) => {
        // 시퀀스 번호 추가
        const typedEvent = event as eventWithTime;

        // FullSnapshot에 viewport 정보 추가
        if (typedEvent.type === rrweb.EventType.FullSnapshot) {
          // FullSnapshot 이벤트
          const data = typedEvent.data as any;
          if (!data.width || !data.height) {
            data.width = window.innerWidth;
            data.height = window.innerHeight;
          }
        }

        const enhancedEvent: eventWithTime = {
          ...typedEvent,
          data: {
            ...(typedEvent.data as any),
            sequence: (this.eventSequence += 1),
          },
        };

        // Buffer 모드인지 확인
        const isBufferMode = this.room && this.room.startsWith("Buffer-");

        if (this.buffering) {
          // 버퍼링 모드: 메모리에 저장
          this.eventBuffer.push(enhancedEvent);

          // Buffer 모드에서는 즉시 전송 (버퍼링하지 않음)
          if (isBufferMode) {
            this.sendEvent(enhancedEvent);
          }

          // 메모리 관리: 버퍼 크기 제한
          if (this.eventBuffer.length > 2000) {
            console.warn(
              "[RemoteDebug-SDK][SessionReplay] 버퍼 크기 초과, 오래된 이벤트 삭제",
            );
            this.eventBuffer = this.eventBuffer.slice(-1500);
          }
        } else {
          // 실시간 전송 모드 (Buffer 모드에서는 실시간 전송 안함)
          if (!isBufferMode) {
            this.sendEvent(enhancedEvent);
          }
        }
      },

      // 샘플링 설정 (성능 최적화)
      sampling: {
        scroll: 150, // 스크롤 이벤트 150ms 샘플링
        media: 800, // 미디어 이벤트 800ms 샘플링
        input: "last", // 입력은 마지막 값만
        canvas: 5, // Canvas FPS
        mousemove: true, // 마우스 이동 기록
        mouseInteraction: true, // 마우스 상호작용 기록
      },

      // 에러 핸들링 추가
      errorHandler: (error: Error) => {
        console.warn(
          "[RemoteDebug-SDK][SessionReplay] rrweb 내부 오류 발생:",
          error.message,
        );
        // scrollLeft/scrollTop 관련 오류는 무시 (일시적인 DOM 상태)
        if (
          error.message?.includes("scrollLeft") ||
          error.message?.includes("scrollTop")
        ) {
          return true; // 오류 무시하고 계속 진행
        }
        return false; // 다른 오류는 기본 처리
      },

      // DOM 최적화 옵션
      slimDOMOptions: {
        script: true, // <script> 내용 제거
        comment: true, // 주석 제거
        headFavicon: true, // favicon 제거
        headWhitespace: true,
        headMetaDescKeywords: true,
        headMetaSocial: true,
        headMetaRobots: true,
        headMetaHttpEquiv: true,
        headMetaAuthorship: true,
        headMetaVerification: true,
      },

      // 프라이버시 설정
      maskAllInputs: false, // 입력 필드 마스킹 (프로덕션에서는 true 권장)
      maskInputOptions: {
        password: true, // 비밀번호는 항상 마스킹
        email: false,
        tel: false,
      },
      // maskTextContent는 maskAllText로 통합됨
      maskAllText: false,

      // 추가 기능
      recordCanvas: true, // Canvas 기록
      recordCrossOriginIframes: false, // Cross-origin iframe (보안상 비활성화)
      recordAfter: "DOMContentLoaded", // DOM 로드 후 기록 시작

      // SDK UI 요소 제외
      blockSelector: "#REMOTE_DEBUGGER, .remote-debug-sdk-ui",
      ignoreSelector: ".rrweb-ignore",

      // 인라인 스타일시트 수집 (CSS-in-JS 지원)
      inlineStylesheet: true,

      // 이미지 인라인화 (선택적)
      inlineImages: false,

      // 압축 설정
      packFn: undefined, // 커스텀 압축 함수 (필요시 추가)

      // 플러그인 (필요시 추가)
      plugins: [],

      // 콜백 훅 - rrweb v2의 변경사항으로 hooks 구조 단순화
      // hooks 옵션은 더 이상 사용되지 않거나 다른 형태로 변경됨
    };

    // rrweb 기록 시작
    this.stopRecordingFn = rrweb.record(options);
  }

  /**
   * 기록 중지
   */
  public stopRecording(): void {
    if (this.stopRecordingFn && typeof this.stopRecordingFn === "function") {
      this.stopRecordingFn();
      this.stopRecordingFn = null;
    }

    this.recording = false;
    this.buffering = true;
    this.eventBuffer = [];
    this.eventSequence = 0;
  }

  /**
   * 룸 연결 시 버퍼 플러시
   */
  public onRoomConnected(): void {
    const isBufferRoom = this.room && this.room.startsWith("Buffer-");

    if (isBufferRoom && this.eventBuffer.length > 0) {
      this.lastBufferedEvents = [...this.eventBuffer];
    }

    if (
      !isBufferRoom &&
      this.eventBuffer.length === 0 &&
      this.lastBufferedEvents.length > 0
    ) {
      this.eventBuffer = [...this.lastBufferedEvents];
    }

    if (this.eventBuffer.length === 0) {
      this.buffering = !!isBufferRoom;
      return;
    }

    // 배치로 전송 (성능 최적화) - Buffer/일반 모드 동일
    const batchSize = 50;
    const sendBatch = async () => {
      let batchIndex = 0;

      while (this.eventBuffer.length > 0) {
        const batch = this.eventBuffer.splice(0, batchSize);

        // CDP 프로토콜 형식으로 래핑
        const cdpEvent = {
          method: "SessionReplay.rrwebEvents",
          params: {
            events: batch,
            batchIndex: (batchIndex += 1),
            totalBatches: Math.ceil(this.eventBuffer.length / batchSize) + 1,
          },
        };

        super.sendProtocol(cdpEvent);

        // 네트워크 부하 방지
        if (this.eventBuffer.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    };

    // 비동기로 배치 전송 시작
    sendBatch()
      .then(() => {
        if (isBufferRoom) {
          this.buffering = true;
        } else {
          this.buffering = false;
          this.lastBufferedEvents = [];
        }
      })
      .catch((err) => {
        console.error(
          "[RemoteDebug-SDK][SessionReplay] 버퍼 전송 중 오류:",
          err,
        );
      });
  }

  /**
   * 단일 이벤트 전송
   */
  private sendEvent(event: eventWithTime): void {
    const cdpEvent = {
      method: "SessionReplay.rrwebEvent",
      params: {
        event,
        timestamp: Date.now(),
      },
    };

    super.sendProtocol(cdpEvent);
  }

  /**
   * 디버깅용 - 현재 상태 조회
   */
  public getStatus(): {
    recording: boolean;
    buffering: boolean;
    bufferSize: number;
    sequence: number;
  } {
    return {
      recording: this.recording,
      buffering: this.buffering,
      bufferSize: this.eventBuffer.length,
      sequence: this.eventSequence,
    };
  }

  /**
   * 버퍼 비우기 (메모리 관리)
   */
  public clearBuffer(): void {
    this.eventBuffer = [];
  }

  /**
   * matches polyfill 추가 (rrweb 호환성)
   */
  private addMatchesPolyfill(): void {
    // Text, Comment 등의 노드에 matches 메서드 추가
    const textProto: any = Text.prototype;
    if (!textProto.matches) {
      textProto.matches = function () {
        return false;
      };
    }

    const commentProto: any = Comment.prototype;
    if (!commentProto.matches) {
      commentProto.matches = function () {
        return false;
      };
    }

    // DocumentFragment에도 추가
    const fragProto: any = DocumentFragment.prototype;
    if (!fragProto.matches) {
      fragProto.matches = function () {
        return false;
      };
    }

    // scrollingElement polyfill 추가 (구형 브라우저/특수 환경 대응)
    if (!document.scrollingElement) {
      Object.defineProperty(document, "scrollingElement", {
        get: function () {
          // documentElement이 없는 경우를 대비한 안전장치
          if (!document.documentElement) {
            console.warn(
              "[RemoteDebug-SDK][SessionReplay] document.documentElement is null",
            );
            return document.body || null;
          }

          // 표준 모드
          if (document.compatMode !== "BackCompat") {
            return document.documentElement;
          }
          // 쿼크 모드
          return document.body;
        },
        configurable: true,
      });
    }
  }
}
