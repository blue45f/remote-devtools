import { tokens } from "./theme";

/**
 * Create guide button
 */
export function createGuideButton(onClick: () => void) {
  const button = document.createElement("button");
  button.type = "button";

  Object.assign(button.style, {
    padding: "10px 16px",
    backgroundColor: tokens.color.bg.hover,
    color: tokens.color.text.secondary,
    border: `1px solid ${tokens.color.border.medium}`,
    borderLeft: `3px solid ${tokens.color.accent.violet}`,
    borderRadius: tokens.radius.md,
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    fontFamily: tokens.font.system,
    whiteSpace: "nowrap",
    transition: `all ${tokens.transition.normal}`,
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    outline: "none",
  });

  // SVG question mark icon
  const icon = document.createElement("span");
  icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${tokens.color.accent.violet}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`;
  icon.style.display = "flex";
  icon.style.alignItems = "center";

  const text = document.createElement("span");
  text.textContent = "Quick Guide";

  button.appendChild(icon);
  button.appendChild(text);

  button.addEventListener("mouseenter", () => {
    button.style.backgroundColor = tokens.color.bg.active;
    button.style.borderColor = tokens.color.border.strong;
    button.style.color = tokens.color.text.primary;
  });
  button.addEventListener("mouseleave", () => {
    button.style.backgroundColor = tokens.color.bg.hover;
    button.style.borderColor = tokens.color.border.medium;
    button.style.color = tokens.color.text.secondary;
  });
  button.addEventListener("mousedown", () => {
    button.style.transform = "scale(0.97)";
  });
  button.addEventListener("mouseup", () => {
    button.style.transform = "scale(1)";
  });
  button.addEventListener("click", onClick);

  return button;
}

/**
 * Add guide button to debugger button container
 */
export function addGuideButtonToContainer(
  container: HTMLElement,
  guideButton: HTMLButtonElement,
) {
  container.insertBefore(guideButton, container.firstChild);
  guideButton.style.marginBottom = "4px";
}
