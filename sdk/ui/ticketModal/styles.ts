/**
 * Text Input 필드에 기본 스타일 적용
 */
export function applyTextInputStyles(element: HTMLInputElement) {
  element.style.padding = "8px 12px";
  element.style.border = "1px solid #ddd";
  element.style.borderRadius = "4px";
  element.style.fontSize = "14px";
  element.style.fontFamily = "inherit";
  element.style.width = "100%";
  element.style.boxSizing = "border-box";
  element.style.backgroundColor = "#fff";
  element.style.color = "#333";
  element.style.minHeight = "40px";
  element.style.lineHeight = "1.5";

  // 호버 효과
  element.addEventListener("mouseenter", () => {
    element.style.borderColor = "#007bff";
  });

  element.addEventListener("mouseleave", () => {
    element.style.borderColor = "#ddd";
  });

  // 포커스 효과
  element.addEventListener("focus", () => {
    element.style.borderColor = "#007bff";
    element.style.outline = "none";
    element.style.boxShadow = "0 0 0 2px rgba(0, 123, 255, 0.25)";
  });

  element.addEventListener("blur", () => {
    element.style.borderColor = "#ddd";
    element.style.boxShadow = "none";
  });

  // 엔터키 Submit 방지
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // 엔터키로 인한 form submit 방지
    }
  });
}

/**
 * 버튼에 스타일 적용
 */
export function applyButtonStyles(
  button: HTMLButtonElement,
  variant: "primary" | "secondary",
) {
  button.style.padding = "8px 16px";
  button.style.border = "none";
  button.style.borderRadius = "4px";
  button.style.cursor = "pointer";
  button.style.fontSize = "14px";
  button.style.fontWeight = "bold";
  button.style.transition = "background-color 0.2s ease";

  if (variant === "primary") {
    button.style.backgroundColor = "#007bff";
    button.style.color = "#fff";
  } else {
    button.style.backgroundColor = "#6c757d";
    button.style.color = "#fff";
  }

  if (button.disabled) {
    button.style.backgroundColor = "#ccc";
    button.style.cursor = "not-allowed";
  }
}
