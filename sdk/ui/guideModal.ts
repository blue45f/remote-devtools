import {
  tokens,
  applyModalOverlayStyles,
  applyModalContainerStyles,
  applyButtonStyles,
  injectKeyframeAnimations,
} from "./theme";

/**
 * Create guide modal
 */
export function createGuideModal(onClose: () => void) {
  injectKeyframeAnimations();

  const overlay = document.createElement("div");
  overlay.setAttribute("data-remote-debugger-overlay", "true");
  applyModalOverlayStyles(overlay);

  const modal = document.createElement("div");
  applyModalContainerStyles(modal, { maxWidth: "560px" });

  // Header
  const header = document.createElement("div");
  Object.assign(header.style, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: `1px solid ${tokens.color.border.subtle}`,
  });

  const title = document.createElement("h2");
  title.textContent = "Quick Guide";
  Object.assign(title.style, {
    margin: "0",
    fontSize: "18px",
    fontWeight: "600",
    color: tokens.color.text.primary,
    fontFamily: tokens.font.system,
  });

  const closeButton = document.createElement("button");
  closeButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  Object.assign(closeButton.style, {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "6px",
    borderRadius: tokens.radius.sm,
    color: tokens.color.text.dim,
    transition: `all ${tokens.transition.fast}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });
  closeButton.addEventListener("mouseenter", () => {
    closeButton.style.backgroundColor = tokens.color.bg.hover;
    closeButton.style.color = tokens.color.text.primary;
  });
  closeButton.addEventListener("mouseleave", () => {
    closeButton.style.backgroundColor = "transparent";
    closeButton.style.color = tokens.color.text.dim;
  });

  header.appendChild(title);
  header.appendChild(closeButton);

  // Content
  const content = document.createElement("div");
  Object.assign(content.style, {
    padding: "24px",
    overflowY: "auto",
    flex: "1",
  });

  content.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px; font-family: ${tokens.font.system};">
      <div style="background: ${tokens.color.bg.elevated}; border-left: 3px solid ${tokens.color.accent.violet}; padding: 16px; border-radius: ${tokens.radius.sm};">
        <h3 style="margin: 0 0 8px 0; color: #c4b5fd; font-size: 14px; font-weight: 600;">What is this tool?</h3>
        <p style="margin: 0; color: ${tokens.color.text.muted}; line-height: 1.6; font-size: 13px;">
          A remote debugging toolkit that records and shares web page issues in real time, enabling efficient cross-team collaboration.
        </p>
        <p style="margin: 8px 0 0 0; color: ${tokens.color.text.dim}; line-height: 1.6; font-size: 13px;">
          Refer to the project documentation for detailed guides.
        </p>
      </div>

      <div style="background: ${tokens.color.bg.elevated}; border-left: 3px solid ${tokens.color.accent.amber}; padding: 16px; border-radius: ${tokens.radius.sm};">
        <h3 style="margin: 0 0 12px 0; color: #fcd34d; font-size: 14px; font-weight: 600;">Key Features</h3>
        <ul style="margin: 0; padding-left: 20px; color: ${tokens.color.text.muted}; line-height: 2; font-size: 13px;">
          <li><strong style="color: ${tokens.color.text.secondary};">Create Ticket:</strong> Generate issue tickets with recording sessions and device info. (Setup required)</li>
          <li><strong style="color: ${tokens.color.text.secondary};">Start Recording:</strong> Capture and store network activity remotely, then share via URL.</li>
          <li><strong style="color: ${tokens.color.text.secondary};">Live Session:</strong> Share your screen in real time.</li>
          <li><strong style="color: ${tokens.color.text.secondary};">Network Rewrite:</strong> Intercept and modify API responses to test different scenarios.</li>
        </ul>
        <hr style="margin: 12px 0; border: none; border-top: 1px solid ${tokens.color.border.subtle};" />
        <p style="margin: 0; color: ${tokens.color.text.dim}; line-height: 1.6; font-size: 13px;">
          Share recording session or ticket URLs with your team via any messenger.
        </p>
      </div>
    </div>
  `;

  // Footer
  const footer = document.createElement("div");
  Object.assign(footer.style, {
    padding: "16px 24px",
    borderTop: `1px solid ${tokens.color.border.subtle}`,
    display: "flex",
    justifyContent: "center",
  });

  const confirmButton = document.createElement("button");
  confirmButton.textContent = "Got it";
  applyButtonStyles(confirmButton, "primary");
  confirmButton.style.padding = "10px 24px";

  footer.appendChild(confirmButton);

  // Event handlers
  const handleClose = () => {
    if (overlay.parentElement) {
      overlay.parentElement.removeChild(overlay);
    }
    onClose();
  };

  closeButton.addEventListener("click", handleClose);
  confirmButton.addEventListener("click", handleClose);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      handleClose();
    }
  });

  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose();
      document.removeEventListener("keydown", handleEsc);
    }
  };
  document.addEventListener("keydown", handleEsc);

  modal.appendChild(header);
  modal.appendChild(content);
  modal.appendChild(footer);
  overlay.appendChild(modal);

  return overlay;
}
