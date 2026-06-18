import { RemoteDebugger } from './common/remoteDebugger';
import { Network } from './domain/network';
import { CommonInfo } from './types/common';
import { createDebuggerButtons, createFloatingButton } from './ui/debuggerButtons';
import { makeDraggable } from './ui/draggable';
import { createGuideButton } from './ui/guideButton';
import { createGuideModal } from './ui/guideModal';
import { createNetworkRewriteModal } from './ui/networkRewriteModal';
import { createRecordingToast } from './ui/recordingToast';
import { injectKeyframeAnimations } from './ui/theme';
import { createTicketModal, TicketFormData } from './ui/ticketModal';
import { isSdkDemoMode } from './utils/env';
import { getCommonInfo } from './utils/helpers';
import { logger } from './utils/logger';

/**
 * The session the SDK currently has open (record or live), or null when none.
 * RoomName/RecordId live inside the createDebugger() closure; this mirror is the
 * supported way for a host page to read them and build a DevTools link for the
 * active session. Host pages either poll {@link getActiveSession} or listen for
 * the {@link SDK_SESSION_EVENT} window event (detail = ActiveSdkSession | null).
 */
export type ActiveSdkSession = {
  room: string;
  recordId: number | null;
  recordMode: boolean;
};

// 전역 타입 선언
declare global {
  interface Window {
    REMOTE_DEBUG_SDK_COMMON_INFO?: (r: string) => Promise<void>;
    /**
     * Singleton state shared across every execution of this bundle. A host page
     * can load the SDK more than once (React StrictMode double-invokes effects
     * in dev; a customer might embed two <script> tags). Keying the "already
     * created" guard and the active-session mirror off `window` guarantees ONE
     * debugger UI and ONE source of truth regardless of how many module
     * instances run.
     */
    __REMOTE_DEBUG_SDK__?: {
      created: boolean;
      activeSession: ActiveSdkSession | null;
    };
  }

  // The SDK reads/writes these globals through `globalThis.*`. TypeScript only
  // surfaces `var` declarations on `typeof globalThis` (NOT `interface Window`
  // members), so the custom globals must be declared here as `var` to be typed
  // — otherwise every `globalThis.<name>` access is a TS7017 "no index
  // signature" error. Two groups:
  //   1. DevTools command-line API helpers the SDK polyfills onto the page
  //      ($, $$, $x, $0, $_, $$inspectMode, copy/clear/dir/dirxml/keys/values/
  //      table). Loose signatures mirror Chrome's injected console API and give
  //      the polyfill callbacks a contextual param type.
  //   2. SDK-internal singletons/bridges (HMR guards, the native WebView
  //      bridge, the env override map, the logger handle, the active runtime).
  /* eslint-disable @typescript-eslint/no-explicit-any -- DevTools/host globals are inherently loosely typed */
  // 1) DevTools command-line API the SDK polyfills onto the page. Chrome's own
  // injected helpers are loosely typed; `any` here both matches that reality and
  // accepts the SDK's generic `<K extends keyof HTMLElementTagNameMap>` polyfill
  // assignments while giving the polyfill callbacks a contextual param type.
  var $: any;
  var $$: any;
  var $x: any;
  var $0: any;
  var $_: any;
  var $$inspectMode: string | undefined;
  var clear: any;
  var copy: any;
  var dir: any;
  var dirxml: any;
  var keys: any;
  var values: any;
  var table: any;
  // 2) SDK-internal singletons/bridges. Shapes mirror the per-module
  // `interface Window` augmentations; the runtime instance / logger are `any`
  // because their concrete classes aren't importable from this ambient block.
  var __REMOTE_DEBUG_SDK__:
    | { created: boolean; activeSession: ActiveSdkSession | null }
    | undefined;
  var REMOTE_DEBUG_SDK_COMMON_INFO: ((r: string) => Promise<void>) | undefined;
  var __REMOTE_DEBUG_RUNTIME_INSTANCE__: any;
  var __REMOTE_DEBUG_CONSOLE_HOOKED__: boolean | undefined;
  var __REMOTE_DEBUG_ERROR_LISTENER_ADDED__: boolean | undefined;
  var remoteDebugger: any;
  var JavaScriptInterface: { getCommonInfo: (callbackName: string) => void } | undefined;
  var REMOTE_DEBUG_SDK_ENV: Record<string, string | undefined> | undefined;
  var remoteDebugLogger: any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export const SDK_SESSION_EVENT = 'remote-debug-sdk:session';

// Shared singleton state — see Window.__REMOTE_DEBUG_SDK__. Falls back to a
// plain object in non-browser/SSR contexts where `window` is absent.
const sdkState: NonNullable<Window['__REMOTE_DEBUG_SDK__']> =
  typeof window !== 'undefined'
    ? (globalThis.__REMOTE_DEBUG_SDK__ ??= { created: false, activeSession: null })
    : { created: false, activeSession: null };

/** Read the SDK's currently-active session (null when no room is open). */
export const getActiveSession = (): ActiveSdkSession | null => sdkState.activeSession;

const publishSession = (next: ActiveSdkSession | null): void => {
  sdkState.activeSession = next;
  if (typeof window !== 'undefined' && typeof globalThis.dispatchEvent === 'function') {
    globalThis.dispatchEvent(new CustomEvent(SDK_SESSION_EVENT, { detail: next }));
  }
};

const addRewriteAnimationStyles = () => {
  injectKeyframeAnimations();

  if (!document.getElementById('remote-debug-rewrite-styles')) {
    const style = document.createElement('style');
    style.id = 'remote-debug-rewrite-styles';
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.9; }
        100% { transform: scale(1); opacity: 1; }
      }

      @keyframes glow {
        0% { box-shadow: 0 0 5px rgba(245, 158, 11, 0.5); }
        50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.8); }
        100% { box-shadow: 0 0 5px rgba(245, 158, 11, 0.5); }
      }

      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-3px); }
        100% { transform: translateY(0px); }
      }

      .rewrite-tooltip {
        position: absolute;
        bottom: 50px;
        right: 0;
        transform: translateX(calc(-50% + 20px));
        background: #18181b;
        color: #fbbf24;
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid #27272a;
        font-size: 11px;
        font-weight: 500;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        animation: float 2s ease-in-out infinite;
        pointer-events: none;
        z-index: 10001;
      }

      .rewrite-tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-width: 4px;
        border-style: solid;
        border-color: #18181b transparent transparent transparent;
      }
    `;
    document.head.appendChild(style);
  }
};

// Rewrite 툴팁 생성 함수
const createRewriteTooltip = () => {
  const tooltip = document.createElement('div');
  tooltip.className = 'rewrite-tooltip';
  tooltip.textContent = 'Rewrite Active';
  tooltip.id = 'rewrite-tooltip';
  return tooltip;
};

export const createDebugger = (onClickDebugger?: () => void, autoConnect = true) => {
  // 중복 생성 방지 (window 스코프 — 번들이 여러 번 로드돼도 단일 인스턴스 보장)
  if (sdkState.created) return;
  sdkState.created = true;

  const remoteDebugger = new RemoteDebugger();
  const root = document.createElement('div');
  root.id = 'REMOTE_DEBUGGER';
  root.style.position = 'fixed';
  root.style.bottom = '70px';
  root.style.right = '20px';
  root.style.zIndex = '9999';
  let isOpen = false;
  let commonInfo: CommonInfo | null;
  let currentRoomType: 'record' | 'live' | null = null; // 현재 방 타입을 저장할 변수

  globalThis.REMOTE_DEBUG_SDK_COMMON_INFO = async (r: string) => {
    try {
      commonInfo = JSON.parse(r);
      logger.commonInfo.info('', commonInfo);
    } catch {
      //
    }
  };
  getCommonInfo();

  // 데모 모드에서는 실시간 웹소켓 연결이 불필요하므로 생략
  const isDemoMode = isSdkDemoMode();

  // autoConnect가 true고 데모 모드가 아니면 deviceId 로드 후 WebSocket 연결
  if (autoConnect && !isDemoMode) {
    // deviceId는 네이티브 WebView 브릿지(JavaScriptInterface)로만 전달된다.
    // 일반 브라우저에는 브릿지가 없으므로 2초간 폴링하며 매 로드마다 경고를 찍는
    // 대신 즉시 unknown-device 로 연결한다.
    if (typeof window === 'undefined' || !globalThis.JavaScriptInterface) {
      remoteDebugger.initSocket(true);
    } else {
      let retryCount = 0;
      const checkAndConnect = () => {
        if (commonInfo?.device?.deviceId) {
          remoteDebugger.setDeviceId(commonInfo.device.deviceId);
          // deviceId 설정 후 WebSocket 연결
          remoteDebugger.initSocket(true);
        } else if (retryCount < 20) {
          // 100ms * 20 = 2초
          retryCount += 1;
          setTimeout(checkAndConnect, 100);
        } else {
          logger.remote.debug(
            '[SDK] deviceId not received within 2s; connecting as unknown-device',
          );
          // 타임아웃 시에도 연결은 시작
          remoteDebugger.initSocket(true);
        }
      };

      checkAndConnect();
    }
  }

  const handleClickFloatingButton = () => {
    if (isOpen) {
      floatingButton.style.transform = 'rotate(0deg)';
      root.removeChild(debuggerButton);

      // 메뉴 닫을 때 Screen Preview 재개
      remoteDebugger.resumeScreenPreview();

      // 메뉴 닫을 때 Rewrite 상태면 툴팁 다시 표시
      const existingTooltip = root.querySelector('#rewrite-tooltip');
      if (!existingTooltip) {
        if (Network.Rewrite.isEnabled()) {
          const tooltip = createRewriteTooltip();
          root.appendChild(tooltip);
        }
      }
    } else {
      floatingButton.style.transform = 'rotate(45deg)';
      root.appendChild(debuggerButton);

      // 메뉴 열 때 Screen Preview 일시 중단
      remoteDebugger.pauseScreenPreview();

      // 메뉴 열 때 툴팁 숨기기
      const tooltip = root.querySelector('#rewrite-tooltip');
      if (tooltip) {
        tooltip.remove();
      }
    }
    isOpen = !isOpen;
  };

  const handleClickGuideButton = () => {
    // 모달 띄우기 전 Screen Preview 일시 중단
    remoteDebugger.pauseScreenPreview();

    // 안내 모달 띄우기
    const modal = createGuideModal(() => {
      // 모달 닫힐 때 Screen Preview 재개
      remoteDebugger.resumeScreenPreview();
    });
    document.body.appendChild(modal);
  };

  const handleClickDebuggerButton = async (
    type: 'record' | 'live' | 'ticket' | 'network-rewrite',
  ) => {
    handleClickFloatingButton();
    onClickDebugger?.();

    if (type === 'network-rewrite') {
      // 애니메이션 스타일 추가
      addRewriteAnimationStyles();

      // 모달 띄우기 전 Screen Preview 일시 중단
      remoteDebugger.pauseScreenPreview();

      // 전역 네트워크 데이터 가져오기
      const globalNetworkData = Network.getGlobalResponseData();

      // 모달 표시 - Network 클래스의 정적 메서드 사용
      const modal = createNetworkRewriteModal(
        globalNetworkData,
        (url, method, status, response, queryString, requestBody) => {
          Network.Rewrite.addRule(url, method, status, response, queryString, requestBody);

          // Rewrite 활성화 시 플로팅 버튼 색상 변경 및 툴팁 추가
          if (Network.Rewrite.isEnabled()) {
            floatingButton.style.backgroundColor = '#f59e0b';

            // 메뉴가 열려있지 않을 때만 툴팁 표시
            if (!isOpen) {
              const existingTooltip = root.querySelector('#rewrite-tooltip');
              if (!existingTooltip) {
                const tooltip = createRewriteTooltip();
                root.appendChild(tooltip);
              }
            }
          }

          // 모달 닫힐 때 Screen Preview 재개
          remoteDebugger.resumeScreenPreview();
        },
      );

      document.body.appendChild(modal);
      return;
    }

    if (type === 'ticket') {
      // 모달 띄우기 전 Screen Preview 일시 중단
      remoteDebugger.pauseScreenPreview();

      const modal = createTicketModal(
        (commonInfo: CommonInfo | null, formData?: TicketFormData) => {
          // 모달에서 입력받은 데이터로 티켓 생성 (폼 데이터는 로깅만 하고 기존 방식 사용)
          createTicketDirect(remoteDebugger, commonInfo, formData);
          // 티켓 생성 후 Screen Preview 재개
          remoteDebugger.resumeScreenPreview();
        },
        () => {
          // 취소 시 Screen Preview 재개
          remoteDebugger.resumeScreenPreview();
        },
        commonInfo,
      );
      document.body.appendChild(modal);
      return;
    }

    // 현재 방 타입 저장
    currentRoomType = type;

    // WebSocket이 연결되어 있지 않은 경우에만 새로 연결
    if (!remoteDebugger.Connected) {
      remoteDebugger.initSocket();

      // 새 연결인 경우 open 이벤트 리스너 추가
      remoteDebugger.addSocketEventListener(
        'open',
        () => {
          // 연결 완료 후 room 생성
          if (type === 'record') {
            remoteDebugger.createRoom(true, commonInfo);
          } else {
            remoteDebugger.createRoom(false, commonInfo);
          }
        },
        { once: true },
      );
    } else {
      if (type === 'record') {
        remoteDebugger.createRoom(true, commonInfo);
      } else {
        remoteDebugger.createRoom(false, commonInfo);
      }
    }

    // WebSocket 연결 종료 시 UI 복구
    remoteDebugger.addSocketEventListener('close', () => {
      // The session is gone — tell host pages so their "Open DevTools" affordance
      // disables itself.
      publishSession(null);

      if (root.contains(recordingToast.element)) {
        root.removeChild(recordingToast.element);
      }
      if (!root.contains(floatingButton)) {
        root.appendChild(floatingButton);
      }
      root.style.bottom = '80px';
      root.style.right = '10px';
    });

    // WebSocket 연결 오류 처리
    remoteDebugger.addSocketEventListener('error', () => {
      console.warn('[SDK] Unable to connect to remote debugger WebSocket.');
    });
  };

  const handleClickDisconnect = () => {
    remoteDebugger.disconnect();
  };

  const floatingButton = createFloatingButton(handleClickFloatingButton);
  const debuggerButton = createDebuggerButtons(handleClickDebuggerButton);
  const guideButton = createGuideButton(handleClickGuideButton);
  const recordingToast = createRecordingToast(handleClickDisconnect);

  // 녹화 세션 생성 완료 콜백 설정 (handleClickDebuggerButton 호출 전에 설정)
  remoteDebugger.onRoomCreated(() => {
    if (currentRoomType) {
      recordingToast.updateRoomInfo({
        type: currentRoomType,
        getRoomName: () => remoteDebugger.RoomName,
        getRecordId: () => remoteDebugger.RecordId,
      });

      // Publish the active session so host pages (e.g. the sandbox "Open
      // DevTools" button) can build a link for it.
      publishSession({
        room: remoteDebugger.RoomName ?? '',
        recordId: remoteDebugger.RecordId,
        recordMode: currentRoomType === 'record',
      });

      // floatingButton이 root에 있는지 확인
      if (root.contains(floatingButton)) {
        root.removeChild(floatingButton);
      }

      // recordingToast가 이미 추가되어 있지 않은 경우에만 추가
      if (!root.contains(recordingToast.element)) {
        root.appendChild(recordingToast.element);
      }

      root.style.bottom = '80px';
      root.style.right = '10px';
    }
  });

  // 안내 버튼을 디버거 버튼 컨테이너의 제일 위에 추가
  debuggerButton.insertBefore(guideButton, debuggerButton.firstChild);

  // 페이지 로드 시 Rewrite 상태 확인하고 버튼 색상 및 툴팁 복원
  (async () => {
    try {
      if (Network.Rewrite.isEnabled()) {
        // Rewrite이 활성화되어 있으면 플로팅 버튼을 주황색으로
        addRewriteAnimationStyles(); // 애니메이션 스타일 추가
        floatingButton.style.backgroundColor = '#f59e0b';

        // 툴팁도 함께 표시
        const tooltip = createRewriteTooltip();
        root.appendChild(tooltip);

        logger.rewrite.debug(
          'Rewrite state restored - floating button color and tooltip displayed',
        );
      }
    } catch {
      //
    }
  })();

  root.appendChild(floatingButton);
  makeDraggable(root);

  // body가 준비되면 UI를 추가하는 함수
  const appendUIWhenReady = () => {
    if (document.body) {
      document.body.appendChild(root);
    } else {
      // body가 준비되지 않았으면 DOMContentLoaded 이벤트를 기다림
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          if (document.body) {
            document.body.appendChild(root);
          }
        });
      } else {
        // DOMContentLoaded가 이미 발생했지만 body가 없는 경우 폴링
        const checkBody = () => {
          if (document.body) {
            document.body.appendChild(root);
          } else {
            requestAnimationFrame(checkBody);
          }
        };
        checkBody();
      }
    }
  };

  appendUIWhenReady();
};

/**
 * 기존 방식으로 직접 티켓을 생성 (다른 곳에서 사용 가능)
 */
export const createTicketDirect = (
  remoteDebugger: RemoteDebugger,
  commonInfo: CommonInfo | null,
  formData?: TicketFormData,
) => {
  const URL = globalThis.location.href;

  // WebSocket이 연결되어 있지 않은 경우에만 새로 연결
  if (!remoteDebugger.Connected) {
    remoteDebugger.initSocket();

    // 연결 완료 후 티켓 생성
    remoteDebugger.addSocketEventListener(
      'open',
      () => {
        remoteDebugger.createTicket({
          commonInfo,
          userAgent: navigator.userAgent,
          formData,
          URL,
        });
      },
      { once: true },
    );
  } else {
    remoteDebugger.createTicket({
      commonInfo,
      userAgent: navigator.userAgent,
      formData,
      URL,
    });
  }
};

createDebugger();
