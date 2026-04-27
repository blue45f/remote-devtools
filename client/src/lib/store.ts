/**
 * Global UI state with Zustand. Holds sidebar visibility, theme preference,
 * and command palette open state. Theme is persisted to localStorage.
 */
import { create } from "zustand";

export type Theme = "light" | "dark" | "system";

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem("theme") as Theme | null;
  return stored ?? "system";
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

interface AppState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;

  theme: Theme;
  setTheme: (theme: Theme) => void;

  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  toggleCommand: () => void;

  demoMode: boolean;
  setDemoMode: (on: boolean) => void;
  toggleDemoMode: () => void;
}

function readDemoMode() {
  if (typeof window === "undefined") return false;
  // Public Vercel demo build flips demo mode on for everyone — there is no
  // backend, so the badge should always show, irrespective of localStorage.
  if (import.meta.env.VITE_FORCE_DEMO === "true") return true;
  return localStorage.getItem("demo-mode") === "1";
}

function persistDemoMode(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) localStorage.setItem("demo-mode", "1");
  else localStorage.removeItem("demo-mode");
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  sidebarCollapsed:
    typeof window !== "undefined" &&
    localStorage.getItem("sidebar-collapsed") === "1",
  toggleSidebarCollapsed: () =>
    set((s) => {
      const next = !s.sidebarCollapsed;
      if (typeof window !== "undefined") {
        localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      }
      return { sidebarCollapsed: next };
    }),

  theme: readInitialTheme(),
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
    }
    applyTheme(theme);
    set({ theme });
  },

  commandOpen: false,
  setCommandOpen: (open) => set({ commandOpen: open }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),

  demoMode: readDemoMode(),
  setDemoMode: (on) => {
    persistDemoMode(on);
    set({ demoMode: on });
  },
  toggleDemoMode: () =>
    set((s) => {
      const next = !s.demoMode;
      persistDemoMode(next);
      return { demoMode: next };
    }),
}));

// Apply on load + listen to system changes
if (typeof window !== "undefined") {
  applyTheme(readInitialTheme());
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const theme = useAppStore.getState().theme;
      if (theme === "system") applyTheme("system");
    });
}
