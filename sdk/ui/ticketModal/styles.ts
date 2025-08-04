import { tokens } from "../theme";

/**
 * Apply dark-themed text input styles
 */
export function applyTextInputStyles(element: HTMLInputElement) {
  Object.assign(element.style, {
    padding: "10px 12px",
    border: `1px solid ${tokens.color.border.medium}`,
    borderRadius: tokens.radius.sm,
    fontSize: "14px",
    fontFamily: tokens.font.system,
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: tokens.color.bg.elevated,
    color: tokens.color.text.primary,
    minHeight: "40px",
    lineHeight: "1.5",
    outline: "none",
    transition: `border-color ${tokens.transition.fast}`,
  });

  element.addEventListener("mouseenter", () => {
    element.style.borderColor = tokens.color.border.strong;
  });
  element.addEventListener("mouseleave", () => {
    if (document.activeElement !== element) {
      element.style.borderColor = tokens.color.border.medium;
    }
  });
  element.addEventListener("focus", () => {
    element.style.borderColor = tokens.color.accent.violet;
    element.style.boxShadow = `0 0 0 2px ${tokens.color.accent.violetGlow}`;
  });
  element.addEventListener("blur", () => {
    element.style.borderColor = tokens.color.border.medium;
    element.style.boxShadow = "none";
  });
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  });
}

/**
 * Apply dark-themed button styles
 */
export function applyButtonStyles(
  button: HTMLButtonElement,
  variant: "primary" | "secondary",
) {
  Object.assign(button.style, {
    padding: "10px 20px",
    border: "none",
    borderRadius: tokens.radius.md,
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    fontFamily: tokens.font.system,
    transition: `all ${tokens.transition.normal}`,
    minHeight: "40px",
    outline: "none",
  });

  if (variant === "primary") {
    button.style.background = "linear-gradient(135deg, #7c3aed, #6366f1)";
    button.style.color = "#ffffff";
  } else {
    button.style.backgroundColor = tokens.color.bg.hover;
    button.style.color = tokens.color.text.secondary;
    button.style.border = `1px solid ${tokens.color.border.medium}`;
  }

  if (button.disabled) {
    button.style.opacity = "0.4";
    button.style.cursor = "not-allowed";
  }
}
