// Design tokens and shared style utilities for SDK UI components
// Zinc + Violet dark theme matching DevTools tabbed UI

export const tokens = {
  color: {
    bg: {
      surface: "#18181b",
      elevated: "#1e1e22",
      hover: "#27272a",
      active: "#3f3f46",
      overlay: "rgba(0, 0, 0, 0.6)",
    },
    border: {
      subtle: "#27272a",
      medium: "#3f3f46",
      strong: "#52525b",
    },
    text: {
      primary: "#f4f4f5",
      secondary: "#d4d4d8",
      muted: "#a1a1aa",
      dim: "#71717a",
    },
    accent: {
      violet: "#8b5cf6",
      violetHover: "#7c3aed",
      violetGlow: "rgba(139, 92, 246, 0.25)",
      green: "#22c55e",
      greenDim: "rgba(34, 197, 94, 0.15)",
      amber: "#f59e0b",
      amberDim: "rgba(245, 158, 11, 0.15)",
      red: "#ef4444",
      redDim: "rgba(239, 68, 68, 0.15)",
      cyan: "#22d3ee",
    },
    method: {
      GET: { text: "#4ade80", bg: "rgba(74, 222, 128, 0.12)" },
      POST: { text: "#60a5fa", bg: "rgba(96, 165, 250, 0.12)" },
      PUT: { text: "#fbbf24", bg: "rgba(251, 191, 36, 0.12)" },
      DELETE: { text: "#f87171", bg: "rgba(248, 113, 113, 0.12)" },
      PATCH: { text: "#22d3ee", bg: "rgba(34, 211, 238, 0.12)" },
    },
    status: {
      "2xx": "#4ade80",
      "3xx": "#fbbf24",
      "4xx": "#fb923c",
      "5xx": "#f87171",
    },
  },
  font: {
    system:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
  },
  radius: {
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    full: "999px",
  },
  shadow: {
    sm: "0 2px 8px rgba(0, 0, 0, 0.3)",
    md: "0 8px 24px rgba(0, 0, 0, 0.4)",
    lg: "0 16px 40px rgba(0, 0, 0, 0.5)",
    glowViolet: "0 0 16px rgba(139, 92, 246, 0.3)",
  },
  transition: {
    fast: "0.15s ease",
    normal: "0.2s ease",
  },
  zIndex: {
    root: "9999",
    overlay: "10000",
    dropdown: "10001",
    bottomSheet: "10002",
    toast: "10003",
  },
};

export function applyStyles(
  el: HTMLElement,
  styles: Partial<CSSStyleDeclaration>
): void {
  Object.assign(el.style, styles);
}

export function createStyledElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  styles: Partial<CSSStyleDeclaration>,
  attrs?: Record<string, string>
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  Object.assign(el.style, styles);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
  }
  return el;
}

export function applyModalOverlayStyles(el: HTMLElement): void {
  Object.assign(el.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: tokens.color.bg.overlay,
    zIndex: tokens.zIndex.overlay,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });
}

export function applyModalContainerStyles(
  el: HTMLElement,
  options?: { maxWidth?: string; maxHeight?: string }
): void {
  Object.assign(el.style, {
    backgroundColor: tokens.color.bg.surface,
    border: `1px solid ${tokens.color.border.subtle}`,
    borderRadius: tokens.radius.lg,
    maxWidth: options?.maxWidth || "520px",
    width: "92%",
    maxHeight: options?.maxHeight || "85vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: tokens.shadow.lg,
    overflow: "hidden",
    fontFamily: tokens.font.system,
    animation: "rdtFadeIn 0.2s ease-out",
  });
}

export function applyInputStyles(el: HTMLElement): void {
  Object.assign(el.style, {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: tokens.color.bg.elevated,
    border: `1px solid ${tokens.color.border.medium}`,
    borderRadius: tokens.radius.sm,
    color: tokens.color.text.primary,
    fontSize: "14px",
    fontFamily: tokens.font.system,
    outline: "none",
    boxSizing: "border-box",
    transition: `border-color ${tokens.transition.fast}`,
  });

  el.addEventListener("focus", () => {
    el.style.borderColor = tokens.color.accent.violet;
    el.style.boxShadow = `0 0 0 2px ${tokens.color.accent.violetGlow}`;
  });
  el.addEventListener("blur", () => {
    el.style.borderColor = tokens.color.border.medium;
    el.style.boxShadow = "none";
  });
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function applyButtonStyles(
  el: HTMLElement,
  variant: ButtonVariant = "primary"
): void {
  const base: Partial<CSSStyleDeclaration> = {
    padding: "10px 20px",
    borderRadius: tokens.radius.md,
    fontSize: "14px",
    fontWeight: "500",
    fontFamily: tokens.font.system,
    cursor: "pointer",
    border: "none",
    outline: "none",
    transition: `all ${tokens.transition.normal}`,
    minHeight: "40px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  };

  const variants: Record<ButtonVariant, Partial<CSSStyleDeclaration>> = {
    primary: {
      background: "linear-gradient(135deg, #7c3aed, #6366f1)",
      color: "#ffffff",
      border: "none",
    },
    secondary: {
      backgroundColor: tokens.color.bg.hover,
      color: tokens.color.text.secondary,
      border: `1px solid ${tokens.color.border.medium}`,
    },
    danger: {
      backgroundColor: "transparent",
      color: tokens.color.accent.red,
      border: `1px solid rgba(239, 68, 68, 0.3)`,
    },
    ghost: {
      backgroundColor: "transparent",
      color: tokens.color.text.muted,
      border: "none",
    },
  };

  Object.assign(el.style, base, variants[variant]);

  const hoverStyles: Record<ButtonVariant, Partial<CSSStyleDeclaration>> = {
    primary: {
      background: "linear-gradient(135deg, #6d28d9, #4f46e5)",
      boxShadow: tokens.shadow.glowViolet,
    },
    secondary: {
      backgroundColor: tokens.color.bg.active,
      borderColor: tokens.color.border.strong,
      color: tokens.color.text.primary,
    },
    danger: {
      backgroundColor: tokens.color.accent.redDim,
      color: "#f87171",
    },
    ghost: {
      backgroundColor: tokens.color.bg.hover,
      color: tokens.color.text.primary,
    },
  };

  const originalStyles = { ...variants[variant] };
  el.addEventListener("mouseenter", () =>
    Object.assign(el.style, hoverStyles[variant])
  );
  el.addEventListener("mouseleave", () =>
    Object.assign(el.style, originalStyles)
  );
}

let animationsInjected = false;

export function injectKeyframeAnimations(): void {
  if (animationsInjected) return;
  const styleId = "rdt-sdk-keyframes";
  if (document.getElementById(styleId)) {
    animationsInjected = true;
    return;
  }

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes rdtFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes rdtSlideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    @keyframes rdtPulseDot {
      0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(34, 197, 94, 0.5); }
      50% { opacity: 0.5; box-shadow: 0 0 2px rgba(34, 197, 94, 0.3); }
    }
    @keyframes rdtSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes rdtSlideIn {
      from { opacity: 0; transform: translateX(100%); }
      to { opacity: 1; transform: translateX(0); }
    }
  `;
  document.head.appendChild(style);
  animationsInjected = true;
}

export function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return tokens.color.status["2xx"];
  if (status >= 300 && status < 400) return tokens.color.status["3xx"];
  if (status >= 400 && status < 500) return tokens.color.status["4xx"];
  if (status >= 500) return tokens.color.status["5xx"];
  return tokens.color.text.dim;
}

export function getMethodColor(method: string): {
  text: string;
  bg: string;
} {
  const upper = method.toUpperCase() as keyof typeof tokens.color.method;
  return (
    tokens.color.method[upper] || {
      text: tokens.color.text.muted,
      bg: "rgba(161, 161, 170, 0.12)",
    }
  );
}
