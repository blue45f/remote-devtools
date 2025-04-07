// 디버거 버튼 관련 UI 생성 함수들

/**
 * 디버거 버튼들을 생성
 */
export function createDebuggerButtons(
  onClick: (type: "record" | "live" | "ticket" | "network-rewrite") => void,
) {
  const buttonContainer = document.createElement("div");
  buttonContainer.style.position = "absolute";
  buttonContainer.style.bottom = "100%";
  buttonContainer.style.right = "0px";
  buttonContainer.style.marginBottom = "10px";
  buttonContainer.style.display = "flex";
  buttonContainer.style.flexDirection = "column";
  buttonContainer.style.gap = "10px";

  // QA 티켓 만들기 버튼 생성
  const ticketButton = document.createElement("button");
  ticketButton.type = "button";
  ticketButton.textContent = "QA 티켓 만들기";
  applyButtonStyles(ticketButton);

  ticketButton.addEventListener("click", () => {
    onClick?.("ticket");
  });

  // 녹화 버튼 생성
  const recordButton = document.createElement("button");
  recordButton.type = "button";
  recordButton.textContent = "녹화 시작";
  applyButtonStyles(recordButton);

  recordButton.addEventListener("click", () => {
    onClick?.("record");
  });

  // 라이브 세션 버튼 생성
  const liveButton = document.createElement("button");
  liveButton.type = "button";
  liveButton.textContent = "라이브 세션";
  applyButtonStyles(liveButton);

  liveButton.addEventListener("click", () => {
    onClick?.("live");
  });

  // 네트워크 rewrite 버튼 추가
  const networkRewriteButton = document.createElement("button");
  networkRewriteButton.type = "button";
  networkRewriteButton.textContent = "Network Rewrite";
  applyButtonStyles(networkRewriteButton);

  // 특별한 스타일 추가 (새 기능 강조)
  networkRewriteButton.style.background =
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  networkRewriteButton.style.position = "relative";
  networkRewriteButton.style.overflow = "hidden";

  networkRewriteButton.addEventListener("click", () => {
    onClick?.("network-rewrite");
  });

  buttonContainer.appendChild(ticketButton);
  buttonContainer.appendChild(recordButton);
  // buttonContainer.appendChild(liveButton)
  buttonContainer.appendChild(networkRewriteButton);

  return buttonContainer;
}

/**
 * 버튼에 기본 스타일 적용
 */
function applyButtonStyles(button: HTMLButtonElement) {
  button.style.padding = "8px 16px";
  button.style.backgroundColor = "#007bff";
  button.style.color = "#fff";
  button.style.border = "none";
  button.style.borderRadius = "4px";
  button.style.cursor = "pointer";
  button.style.fontSize = "13px";
  button.style.whiteSpace = "nowrap";
}

/**
 * 플로팅 버튼 생성
 */
export const createFloatingButton = (onClick: () => void) => {
  const button = document.createElement("button");

  button.style.backgroundColor = "#007bff";
  button.style.border = "none";
  button.style.borderRadius = "999px";
  button.style.width = "40px";
  button.style.height = "40px";
  button.style.cursor = "pointer";
  button.style.transition = "transform 0.3s ease";
  button.style.position = "relative";

  // 가로선
  const horizontalLine = document.createElement("div");
  horizontalLine.style.position = "absolute";
  horizontalLine.style.top = "50%";
  horizontalLine.style.left = "0";
  horizontalLine.style.right = "0";
  horizontalLine.style.margin = "auto";
  horizontalLine.style.width = "20px";
  horizontalLine.style.height = "2px";
  horizontalLine.style.backgroundColor = "#fff";
  horizontalLine.style.transform = "translateY(-50%)";

  // 세로선
  const verticalLine = document.createElement("div");
  verticalLine.style.position = "absolute";
  verticalLine.style.top = "0";
  verticalLine.style.bottom = "0";
  verticalLine.style.margin = "auto";
  verticalLine.style.left = "50%";
  verticalLine.style.width = "2px";
  verticalLine.style.height = "20px";
  verticalLine.style.backgroundColor = "#fff";
  verticalLine.style.transform = "translateX(-50%)";

  button.appendChild(horizontalLine);
  button.appendChild(verticalLine);
  button.addEventListener("click", onClick);

  return button;
};
