/**
 * 안내 버튼 생성
 */
export function createGuideButton(onClick: () => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "오잉 이게 뭐에요?";

  // 특별한 스타일 적용 (다른 버튼과 다르게)
  button.style.padding = "10px 16px";
  button.style.backgroundColor = "#8b5cf6"; // 보라색 계열
  button.style.color = "#fff";
  button.style.border = "none";
  button.style.borderRadius = "8px";
  button.style.cursor = "pointer";
  button.style.fontSize = "14px";
  button.style.fontWeight = "500";
  button.style.whiteSpace = "nowrap";
  button.style.transition = "all 0.3s ease";
  button.style.boxShadow = "0 2px 8px rgba(139, 92, 246, 0.3)";
  button.style.position = "relative";
  button.style.overflow = "hidden";

  // 물음표 아이콘 추가
  const icon = document.createElement("span");
  icon.textContent = "❓ ";
  icon.style.marginRight = "4px";
  icon.style.fontSize = "16px";
  button.prepend(icon);

  // 호버 효과
  button.addEventListener("mouseenter", () => {
    button.style.backgroundColor = "#7c3aed";
    button.style.transform = "translateY(-2px)";
    button.style.boxShadow = "0 4px 12px rgba(139, 92, 246, 0.4)";
  });

  button.addEventListener("mouseleave", () => {
    button.style.backgroundColor = "#8b5cf6";
    button.style.transform = "translateY(0)";
    button.style.boxShadow = "0 2px 8px rgba(139, 92, 246, 0.3)";
  });

  // 클릭 효과
  button.addEventListener("mousedown", () => {
    button.style.transform = "scale(0.95)";
  });

  button.addEventListener("mouseup", () => {
    button.style.transform = "scale(1)";
  });

  // 클릭 이벤트
  button.addEventListener("click", onClick);

  return button;
}

/**
 * 안내 버튼을 디버거 버튼 컨테이너에 추가
 */
export function addGuideButtonToContainer(
  container: HTMLElement,
  guideButton: HTMLButtonElement,
) {
  // 컨테이너의 첫 번째 자식으로 추가 (제일 위에 위치)
  container.insertBefore(guideButton, container.firstChild);

  // 버튼 간격을 위한 스타일 조정
  guideButton.style.marginBottom = "4px";
}
