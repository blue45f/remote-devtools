import { tokens } from "./theme";

/**
 * Create debugger action buttons panel
 */
export function createDebuggerButtons(
  onClick: (type: "record" | "live" | "ticket" | "network-rewrite") => void,
) {
  const buttonContainer = document.createElement("div");
  Object.assign(buttonContainer.style, {
    position: "absolute",
    bottom: "100%",
    right: "0px",
    marginBottom: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  });

  const ticketButton = createActionButton("Create Ticket", () =>
    onClick?.("ticket"),
  );
  const recordButton = createActionButton("Start Recording", () =>
    onClick?.("record"),
  );
  const liveButton = createActionButton("Live Session", () =>
    onClick?.("live"),
  );

  // Network Rewrite button with amber dot indicator
  const networkRewriteButton = createActionButton("Network Rewrite", () =>
    onClick?.("network-rewrite"),
  );
  const dot = document.createElement("span");
  Object.assign(dot.style, {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: tokens.color.accent.amber,
    display: "inline-block",
    flexShrink: "0",
  });
  networkRewriteButton.insertBefore(dot, networkRewriteButton.firstChild);

  buttonContainer.appendChild(ticketButton);
  buttonContainer.appendChild(recordButton);
  // buttonContainer.appendChild(liveButton)
  buttonContainer.appendChild(networkRewriteButton);

  return buttonContainer;
}

/**
 * Create a dark pill action button
 */
function createActionButton(
  text: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;

  Object.assign(button.style, {
    padding: "10px 16px",
    backgroundColor: tokens.color.bg.hover,
    color: tokens.color.text.secondary,
    border: `1px solid ${tokens.color.border.medium}`,
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
 * Create floating button
 */
export const createFloatingButton = (onClick: () => void) => {
  const button = document.createElement("button");

  Object.assign(button.style, {
    background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
    border: `1px solid rgba(139, 92, 246, 0.3)`,
    borderRadius: "999px",
    width: "48px",
    height: "48px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    position: "relative",
    boxShadow: "0 4px 16px rgba(139, 92, 246, 0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    outline: "none",
  });

  // SVG plus icon
  button.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
    <line x1="10" y1="4" x2="10" y2="16"/>
    <line x1="4" y1="10" x2="16" y2="10"/>
  </svg>`;

  button.addEventListener("mouseenter", () => {
    button.style.boxShadow = "0 6px 20px rgba(139, 92, 246, 0.45)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.boxShadow = "0 4px 16px rgba(139, 92, 246, 0.35)";
  });
  button.addEventListener("mousedown", () => {
    button.style.transform = "scale(0.93)";
  });
  button.addEventListener("mouseup", () => {
    button.style.transform = "scale(1)";
  });
  button.addEventListener("click", onClick);

  return button;
};
