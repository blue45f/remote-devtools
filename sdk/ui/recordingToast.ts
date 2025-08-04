import { convertLink } from "../utils/helpers";
import { tokens, injectKeyframeAnimations } from "./theme";

/**
 * Create recording toast UI
 */
export const createRecordingToast = (onClickDisconnect: () => void) => {
  injectKeyframeAnimations();

  const toast = document.createElement("div");
  Object.assign(toast.style, {
    backgroundColor: tokens.color.bg.surface,
    border: `1px solid ${tokens.color.border.subtle}`,
    color: tokens.color.text.secondary,
    padding: "10px 14px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    transition: "opacity 0.3s ease",
    fontSize: "13px",
    fontFamily: tokens.font.system,
    boxShadow: tokens.shadow.sm,
  });

  // Pulsing green dot
  const dot = document.createElement("span");
  Object.assign(dot.style, {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: tokens.color.accent.green,
    boxShadow: `0 0 6px rgba(34, 197, 94, 0.5)`,
    animation: "rdtPulseDot 2s infinite",
    flexShrink: "0",
  });
  toast.appendChild(dot);

  const title = document.createElement("span");
  title.textContent = "Recording...";
  title.style.color = tokens.color.text.secondary;
  toast.appendChild(title);

  const copyButton = createToastButton("Copy Link");
  toast.appendChild(copyButton);

  const disconnectButton = createToastButton("Disconnect", true);
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
      title.textContent =
        type === "record"
          ? "Recording session active"
          : "Live session active";
      copyButton.textContent = "Copy Link";
      copyButton.onclick = async () => {
        const recordId = getRecordId();
        const roomName = getRoomName();

        if (!roomName) {
          copyButton.textContent = "No session info";
          setTimeout(() => {
            copyButton.textContent = "Copy Link";
          }, 2000);
          return;
        }

        try {
          const roomUrl = convertLink(roomName, recordId);

          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(roomUrl);
            copyButton.textContent = "Copied!";
          } else {
            const textArea = document.createElement("textarea");
            textArea.value = roomUrl;
            textArea.style.position = "fixed";
            textArea.style.opacity = "0";
            document.body.appendChild(textArea);
            textArea.select();
            const successful = document.execCommand("copy");
            document.body.removeChild(textArea);

            if (successful) {
              copyButton.textContent = "Copied!";
            } else {
              copyButton.textContent = "Copy failed";
              console.error(
                `[COPY_FAILED] Both clipboard API and fallback failed`,
              );
            }
          }

          setTimeout(() => {
            copyButton.textContent = "Copy Link";
          }, 2000);
        } catch (error) {
          console.error(`[COPY_ERROR] Failed to copy room URL:`, error);
          copyButton.textContent = "Copy failed";
          setTimeout(() => {
            copyButton.textContent = "Copy Link";
          }, 2000);
        }
      };
    },
  };
};

function createToastButton(text: string, isDanger = false): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;

  const baseStyles: Partial<CSSStyleDeclaration> = {
    backgroundColor: tokens.color.bg.hover,
    border: `1px solid ${tokens.color.border.medium}`,
    color: tokens.color.text.secondary,
    borderRadius: "6px",
    cursor: "pointer",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: "500",
    fontFamily: tokens.font.system,
    transition: `all ${tokens.transition.fast}`,
    outline: "none",
    whiteSpace: "nowrap",
  };

  if (isDanger) {
    baseStyles.borderColor = "rgba(239, 68, 68, 0.3)";
    baseStyles.color = "#f87171";
  }

  Object.assign(button.style, baseStyles);

  button.addEventListener("mouseenter", () => {
    if (isDanger) {
      button.style.backgroundColor = tokens.color.accent.redDim;
    } else {
      button.style.backgroundColor = tokens.color.bg.active;
      button.style.color = tokens.color.text.primary;
    }
  });
  button.addEventListener("mouseleave", () => {
    button.style.backgroundColor = tokens.color.bg.hover;
    button.style.color = isDanger ? "#f87171" : tokens.color.text.secondary;
  });

  return button;
}
