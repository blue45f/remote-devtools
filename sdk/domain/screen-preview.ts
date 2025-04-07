/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { isElement, isMobile } from "../common/utils";

import { BaseDomain } from "./base";
import { Events } from "./protocol";

declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options: object,
    ) => Promise<HTMLCanvasElement>;
  }
}

/**
 * ScreenPreview - 실시간 화면 미러링 전용
 * 버퍼링 없이 즉시 전송
 */
export class ScreenPreview extends BaseDomain {
  public namespace = "ScreenPreview";

  private observerInst: MutationObserver | null = null;
  private lastSendTime = 0;
  private readonly MIN_SEND_INTERVAL = 100; // 100ms 쓰로틀링
  private isPaused = false; // 디버거 UI 표시 중 일시 중단 상태

  /**
   * 스타일 요소 문자열 추출
   */
  private static getStyleElementString() {
    return Array.from(document.styleSheets).map((styleSheet) => {
      try {
        if (styleSheet.href) {
          return `<link rel="stylesheet" href="${styleSheet.href}">`;
        } else {
          const cssRules = Array.from(styleSheet.cssRules)
            .map((rule) => rule.cssText)
            .join("\n");
          return `<style>${cssRules}</style>`;
        }
      } catch {
        return "";
      }
    });
  }

  /**
   * 디버거 UI가 표시되어 있는지 확인
   */
  private isDebuggerUIVisible(): boolean {
    const debuggerElement = document.getElementById("REMOTE_DEBUGGER");
    if (!debuggerElement) return false;

    // 원격 디버거에서 띄운 오버레이(모달)가 있는지 확인
    const debuggerOverlay = document.querySelector(
      '[data-remote-debugger-overlay="true"]',
    );

    return !!debuggerOverlay;
  }

  /**
   * enable - WebSocket 연결 시 호출
   */
  public enable(): void {
    // ScreenPreview는 WebSocket 연결 후 startPreview가 호출됨
    // 여기서는 특별한 처리 없음
  }

  /**
   * 화면 미러링 시작 - 실시간 전송
   */
  public startPreview() {
    // 이미 시작된 경우 중복 실행 방지
    if (this.observerInst) {
      return;
    }

    // 디버깅 버튼 숨김 처리
    const getBody = () =>
      document.body.innerHTML.replace(
        'id="REMOTE_DEBUGGER" style="',
        'id="REMOTE_DEBUGGER" style="display: none;',
      );

    // 첫 스냅샷 즉시 전송
    this.sendProtocol({
      method: Events.captured,
      params: {
        isMobile: isMobile(),
        head: ScreenPreview.getStyleElementString(),
        body: getBody(),
        bodyClass: document.body.className,
        width: window.innerWidth,
        height: window.innerHeight,
        baseHref: document.baseURI,
      },
    });

    // DOM 변경 감지 및 전송 (쓰로틀링 적용)
    this.observerInst = new MutationObserver((mutations) => {
      if (this.socket?.readyState === WebSocket.CLOSED) {
        return this.observerInst?.disconnect();
      }

      // 디버거 UI가 표시되어 있으면 Screen Preview 업데이트 중단
      if (this.isDebuggerUIVisible()) {
        if (!this.isPaused) {
          this.isPaused = true;
          console.log("[ScreenPreview] Paused - debugger UI is visible");
        }
        return;
      } else {
        if (this.isPaused) {
          this.isPaused = false;
          // UI가 숨겨졌을 때 즉시 업데이트된 스냅샷 전송
          this.sendProtocol({
            method: Events.captured,
            params: {
              head: ScreenPreview.getStyleElementString(),
              body: getBody(),
              bodyClass: document.body.className,
              width: window.innerWidth,
              height: window.innerHeight,
              isMobile: isMobile(),
              baseHref: document.baseURI,
            },
          });
        }
      }

      // svg 변경은 무시
      if (
        mutations.every(
          ({ target }) => isElement(target) && !!target.closest("svg"),
        )
      ) {
        return;
      }

      // 쓰로틀링 - 너무 자주 전송하지 않도록
      const now = Date.now();
      if (now - this.lastSendTime < this.MIN_SEND_INTERVAL) {
        return;
      }
      this.lastSendTime = now;

      // 변경사항 전송
      this.sendProtocol({
        method: Events.captured,
        params: {
          head: ScreenPreview.getStyleElementString(),
          body: getBody(),
          bodyClass: document.body.className,
          width: window.innerWidth,
          height: window.innerHeight,
          isMobile: isMobile(),
          baseHref: document.baseURI,
        },
      });
    });

    // MutationObserver 시작
    this.observerInst.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    // 마우스/스크롤 이벤트 동기화
    window.addEventListener("scroll", this.syncScroll);
    [
      "mousemove",
      "mousedown",
      "mouseup",
      "touchmove",
      "touchstart",
      "touchend",
    ].forEach((event) => {
      window.addEventListener(event, this.syncMouse as EventListener);
    });
  }

  /**
   * 화면 미러링 일시 중단 (디버거 UI 표시 시)
   */
  public pausePreview() {
    this.isPaused = true;
  }

  /**
   * 화면 미러링 재개 (디버거 UI 숨김 시)
   */
  public resumePreview() {
    if (this.isPaused) {
      this.isPaused = false;

      // 재개 시 현재 상태 즉시 전송
      const getBody = () =>
        document.body.innerHTML.replace(
          'id="REMOTE_DEBUGGER" style="',
          'id="REMOTE_DEBUGGER" style="display: none;',
        );

      this.sendProtocol({
        method: Events.captured,
        params: {
          head: ScreenPreview.getStyleElementString(),
          body: getBody(),
          bodyClass: document.body.className,
          width: window.innerWidth,
          height: window.innerHeight,
          isMobile: isMobile(),
          baseHref: document.baseURI,
        },
      });
    }
  }

  /**
   * 화면 미러링 중지
   */
  public stopPreview() {
    if (this.observerInst) {
      this.observerInst.disconnect();
      this.observerInst = null;
    }

    this.isPaused = false;
    window.removeEventListener("scroll", this.syncScroll);
    [
      "mousemove",
      "mousedown",
      "mouseup",
      "touchmove",
      "touchstart",
      "touchend",
    ].forEach((event) => {
      window.removeEventListener(event, this.syncMouse as EventListener);
    });
  }

  /**
   * 스크롤 동기화
   */
  public syncScroll = throttle(() => {
    const scrollTop =
      document.body.scrollTop || document.documentElement.scrollTop;
    const scrollLeft =
      document.body.scrollLeft || document.documentElement.scrollLeft;
    this.sendProtocol({
      method: Events.syncScroll,
      params: {
        scrollTop,
        scrollLeft,
      },
    });
  }, 100);

  /**
   * 마우스 동기화
   */
  public syncMouse = throttle((e: MouseEvent | TouchEvent) => {
    const type = e.type || "mousemove";
    let left: number;
    let top: number;

    if (type.includes("touch") && "touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      left = touch.clientX;
      top = touch.clientY;
    } else if ("clientX" in e) {
      left = e.clientX;
      top = e.clientY;
    } else {
      return;
    }

    this.sendProtocol({
      method: Events.syncMouse,
      params: { type, left, top },
    });
  }, 50);
}

/**
 * 쓰로틀 헬퍼 함수
 */
function throttle<T extends (...args: any[]) => void>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>): void {
    const now = Date.now();
    const remaining = wait - (now - lastTime);

    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastTime = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastTime = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}
