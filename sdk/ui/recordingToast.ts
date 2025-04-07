import { convertLink } from "../utils/helpers";

/**
 * 녹화 중 토스트 UI 생성
 */
export const createRecordingToast = (onClickDisconnect: () => void) => {
  const toast = document.createElement("div");
  toast.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
  toast.style.color = "#fff";
  toast.style.padding = "8px 10px";
  toast.style.borderRadius = "4px";
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.transition = "opacity 0.3s ease";
  toast.style.fontSize = "13px";

  const title = document.createElement("span");
  title.textContent = "기록 중입니다.";
  toast.appendChild(title);

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = "방 주소 복사";
  copyButton.style.backgroundColor = "rgba(255, 255, 255, 0.4)";
  copyButton.style.color = "#000";
  copyButton.style.border = "none";
  copyButton.style.borderRadius = "4px";
  copyButton.style.cursor = "pointer";
  copyButton.style.marginLeft = "10px";
  copyButton.style.padding = "4px 8px";
  copyButton.style.transition = "background-color 0.3s ease";

  toast.appendChild(copyButton);

  const disconnectButton = document.createElement("button");
  disconnectButton.type = "button";
  disconnectButton.textContent = "연결 종료";
  disconnectButton.style.backgroundColor = "rgba(255, 255, 255, 0.4)";
  disconnectButton.style.color = "#000";
  disconnectButton.style.border = "none";
  disconnectButton.style.borderRadius = "4px";
  disconnectButton.style.cursor = "pointer";
  disconnectButton.style.marginLeft = "10px";
  disconnectButton.style.padding = "4px 8px";
  disconnectButton.style.transition = "background-color 0.3s ease";

  disconnectButton.addEventListener("click", onClickDisconnect);
  toast.appendChild(disconnectButton);

  return {
    element: toast,
    updateRoomInfo: ({
      type,
      getRoomName,
      getRecordId,
    }: {
      type: "live" | "record";
      getRoomName: () => string | null;
      getRecordId: () => number | null;
    }) => {
      title.textContent = `${type === "record" ? "기록" : "실시간"} 방 연결됨`;
      copyButton.textContent = "방 주소 복사";
      copyButton.onclick = async () => {
        const recordId = getRecordId();
        const roomName = getRoomName();

        if (!roomName) {
          copyButton.textContent = "방 정보 없음";
          setTimeout(() => {
            copyButton.textContent = "방 주소 복사";
          }, 2000);
          return;
        }

        try {
          const roomUrl = convertLink(roomName, recordId);

          // clipboard API 지원 여부 확인
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(roomUrl);
            copyButton.textContent = "복사 완료";
          } else {
            // fallback: 수동 복사 방식
            const textArea = document.createElement("textarea");
            textArea.value = roomUrl;
            textArea.style.position = "fixed";
            textArea.style.opacity = "0";
            document.body.appendChild(textArea);
            textArea.select();
            const successful = document.execCommand("copy");
            document.body.removeChild(textArea);

            if (successful) {
              copyButton.textContent = "복사 완료";
            } else {
              copyButton.textContent = "복사 실패";
              console.error(
                `[COPY_FAILED] Both clipboard API and fallback failed`,
              );
            }
          }

          setTimeout(() => {
            copyButton.textContent = "방 주소 복사";
          }, 2000);
        } catch (error) {
          console.error(`[COPY_ERROR] Failed to copy room URL:`, error);
          copyButton.textContent = "복사 실패";
          setTimeout(() => {
            copyButton.textContent = "방 주소 복사";
          }, 2000);
        }
      };
    },
  };
};
