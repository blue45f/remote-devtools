import { RemoteDebugger } from "./common/remoteDebugger";
import { CommonInfo } from "./types/common";
import {
  createDebuggerButtons,
  createFloatingButton,
} from "./ui/debuggerButtons";
import { makeDraggable } from "./ui/draggable";
import { createGuideButton } from "./ui/guideButton";
import { injectKeyframeAnimations } from "./ui/theme";
import { createGuideModal } from "./ui/guideModal";
import { createNetworkRewriteModal } from "./ui/networkRewriteModal";
import { createRecordingToast } from "./ui/recordingToast";
import { createTicketModal, TicketFormData } from "./ui/ticketModal";
import { getCommonInfo } from "./utils/helpers";
import { logger } from "./utils/logger";

// 전역 타입 선언
declare global {
  interface Window {
    REMOTE_DEBUG_SDK_COMMON_INFO?: (r: string) => Promise<void>;
  }
}

let created = false;

const addRewriteAnimationStyles = () => {
  injectKeyframeAnimations();

  if (!document.getElementById("remote-debug-rewrite-styles")) {
    const style = document.createElement("style");
    style.id = "remote-debug-rewrite-styles";
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
  const tooltip = document.createElement("div");
  tooltip.className = "rewrite-tooltip";
  tooltip.textContent = "Rewrite Active";
  tooltip.id = "rewrite-tooltip";
  return tooltip;
};

export const createDebugger = (
  onClickDebugger?: () => void,
  autoConnect = true,
) => {
  // 중복 생성 방지
  if (created) return;
  created = true;

  const remoteDebugger = new RemoteDebugger();
  const root = document.createElement("div");
  root.id = "REMOTE_DEBUGGER";
  root.style.position = "fixed";
  root.style.bottom = "70px";
  root.style.right = "20px";
  root.style.zIndex = "9999";
  let isOpen = false;
  let commonInfo: CommonInfo | null;
  let currentRoomType: "record" | "live" | null = null; // 현재 방 타입을 저장할 변수

  window.REMOTE_DEBUG_SDK_COMMON_INFO = async (r: string) => {
    try {
      commonInfo = JSON.parse(r);
      logger.commonInfo.info("", commonInfo);
    } catch (e) {
      //
    }
  };
  getCommonInfo();

  // autoConnect가 true면 deviceId 로드 후 WebSocket 연결
  if (autoConnect) {
    // commonInfo 로드 후 WebSocket 연결 시작
    let retryCount = 0;
    const checkAndConnect = () => {
      const currentCommonInfo =
        commonInfo || (window.REMOTE_DEBUG_SDK_COMMON_INFO ? commonInfo : null);

      if (currentCommonInfo?.device?.deviceId) {
        remoteDebugger.setDeviceId(currentCommonInfo.device.deviceId);

        // deviceId 설정 후 WebSocket 연결
        remoteDebugger.initSocket(true);
      } else if (retryCount < 20) {
        // 100ms * 20 = 2초
        retryCount += 1;
        setTimeout(checkAndConnect, 100);
      } else {
        console.warn(
          "[SDK] Could not load deviceId within 2 seconds, connecting with unknown-device",
        );
        // 타임아웃 시에도 연결은 시작
        remoteDebugger.initSocket(true);
      }
    };

    checkAndConnect();
  }

  const handleClickFloatingButton = () => {
    if (isOpen) {
      floatingButton.style.transform = "rotate(0deg)";
      root.removeChild(debuggerButton);

      // 메뉴 닫을 때 Screen Preview 재개
      remoteDebugger.resumeScreenPreview();

      // 메뉴 닫을 때 Rewrite 상태면 툴팁 다시 표시
      const existingTooltip = root.querySelector("#rewrite-tooltip");
      if (!existingTooltip) {
        (async () => {
          const { Network } = await import("./domain/network");
          if (Network.Rewrite.isEnabled()) {
            const tooltip = createRewriteTooltip();
            root.appendChild(tooltip);
          }
        })();
      }
    } else {
      floatingButton.style.transform = "rotate(45deg)";
      root.appendChild(debuggerButton);

      // 메뉴 열 때 Screen Preview 일시 중단
      remoteDebugger.pauseScreenPreview();

      // 메뉴 열 때 툴팁 숨기기
      const tooltip = root.querySelector("#rewrite-tooltip");
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
    type: "record" | "live" | "ticket" | "network-rewrite",
  ) => {
    handleClickFloatingButton();
    onClickDebugger?.();

    if (type === "network-rewrite") {
      // 애니메이션 스타일 추가
      addRewriteAnimationStyles();

      // 모달 띄우기 전 Screen Preview 일시 중단
      remoteDebugger.pauseScreenPreview();

      // 전역 네트워크 데이터 가져오기
      const { Network } = await import("./domain/network");
      const globalNetworkData = Network.getGlobalResponseData();

      // 모달 표시 - Network 클래스의 정적 메서드 사용
      const modal = createNetworkRewriteModal(
        globalNetworkData,
        (url, method, status, response, queryString, requestBody) => {
          Network.Rewrite.addRule(
            url,
            method,
            status,
            response,
            queryString,
            requestBody,
          );

          // Rewrite 활성화 시 플로팅 버튼 색상 변경 및 툴팁 추가
          if (Network.Rewrite.isEnabled()) {
            floatingButton.style.backgroundColor = "#f59e0b";

            // 메뉴가 열려있지 않을 때만 툴팁 표시
            if (!isOpen) {
              const existingTooltip = root.querySelector("#rewrite-tooltip");
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

    if (type === "ticket") {
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
        "open",
        () => {
          // 연결 완료 후 room 생성
          if (type === "record") {
            remoteDebugger.createRoom(true, commonInfo);
          } else {
            remoteDebugger.createRoom(false, commonInfo);
          }
        },
        { once: true },
      );
    } else {
      if (type === "record") {
        remoteDebugger.createRoom(true, commonInfo);
      } else {
        remoteDebugger.createRoom(false, commonInfo);
      }
    }

    // WebSocket 연결 종료 시 UI 복구
    remoteDebugger.addSocketEventListener("close", () => {
      if (root.contains(recordingToast.element)) {
        root.removeChild(recordingToast.element);
      }
      if (!root.contains(floatingButton)) {
        root.appendChild(floatingButton);
      }
      root.style.bottom = "80px";
      root.style.right = "10px";
    });

    // WebSocket 연결 오류 처리
    remoteDebugger.addSocketEventListener("error", () => {
      alert("Unable to connect to remote debugger.");
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

      // floatingButton이 root에 있는지 확인
      if (root.contains(floatingButton)) {
        root.removeChild(floatingButton);
      }

      // recordingToast가 이미 추가되어 있지 않은 경우에만 추가
      if (!root.contains(recordingToast.element)) {
        root.appendChild(recordingToast.element);
      }

      root.style.bottom = "80px";
      root.style.right = "10px";
    }
  });

  // 안내 버튼을 디버거 버튼 컨테이너의 제일 위에 추가
  debuggerButton.insertBefore(guideButton, debuggerButton.firstChild);

  // 페이지 로드 시 Rewrite 상태 확인하고 버튼 색상 및 툴팁 복원
  (async () => {
    try {
      const { Network } = await import("./domain/network");
      if (Network.Rewrite.isEnabled()) {
        // Rewrite이 활성화되어 있으면 플로팅 버튼을 주황색으로
        addRewriteAnimationStyles(); // 애니메이션 스타일 추가
        floatingButton.style.backgroundColor = "#f59e0b";

        // 툴팁도 함께 표시
        const tooltip = createRewriteTooltip();
        root.appendChild(tooltip);

        logger.rewrite.debug(
          "Rewrite state restored - floating button color and tooltip displayed",
        );
      }
    } catch (e) {
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
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
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
  const URL = window.location.href;

  // WebSocket이 연결되어 있지 않은 경우에만 새로 연결
  if (!remoteDebugger.Connected) {
    remoteDebugger.initSocket();

    // 연결 완료 후 티켓 생성
    remoteDebugger.addSocketEventListener(
      "open",
      () => {
        remoteDebugger.createTicket({
          commonInfo,
          userAgent: navigator.userAgent,
          formData: formData as any,
          URL,
        });
      },
      { once: true },
    );
  } else {
    remoteDebugger.createTicket({
      commonInfo,
      userAgent: navigator.userAgent,
      formData: formData as any,
      URL,
    });
  }
};

createDebugger();
