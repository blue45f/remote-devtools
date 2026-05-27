import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAppStore } from "./store";

const isEditable = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
};

export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const setCommandOpen = useAppStore((s) => s.setCommandOpen);
  const toggleCommand = useAppStore((s) => s.toggleCommand);
  const toggleShortcuts = useAppStore((s) => s.toggleShortcuts);

  useEffect(() => {
    let pendingG = false;
    let pendingTimer: number | null = null;

    const clearPending = () => {
      pendingG = false;
      if (pendingTimer) {
        window.clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    };

    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleCommand();
        return;
      }

      // Escape closes command palette (handled by Radix Dialog already)
      if (isEditable(e.target)) return;

      // "?" — keyboard shortcut reference. Industry-standard hotkey
      // (Linear, GitHub, Slack, Notion). Arrives as Shift+/ on US layouts;
      // matching on `e.key === "?"` covers every modern layout.
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        toggleShortcuts();
        return;
      }

      // "g" then nav letter (Linear-style)
      if (!pendingG && e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        pendingG = true;
        pendingTimer = window.setTimeout(clearPending, 1000);
        return;
      }

      if (pendingG) {
        clearPending();
        const k = e.key.toLowerCase();
        if (k === "d") {
          e.preventDefault();
          navigate("/dashboard");
        } else if (k === "s") {
          e.preventDefault();
          navigate("/sessions");
        } else if (k === "m") {
          e.preventDefault();
          navigate("/sandbox/module");
        } else if (k === "p") {
          e.preventDefault();
          navigate("/sandbox/script");
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      clearPending();
    };
  }, [navigate, setCommandOpen, toggleCommand, toggleShortcuts]);
}

/**
 * Static shortcut reference — kept here so the ShortcutsDialog and any
 * future CommandPalette entry stay in sync with the actual handlers
 * registered in `useGlobalShortcuts`. Update both together.
 */
export interface KeyboardShortcut {
  keys: string[];
  label: string;
  description?: string;
}

export interface ShortcutGroup {
  label: string;
  shortcuts: KeyboardShortcut[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: "General",
    shortcuts: [
      { keys: ["⌘", "K"], label: "Open command palette" },
      { keys: ["?"], label: "Show keyboard shortcuts" },
      { keys: ["Esc"], label: "Close dialog / cancel" },
    ],
  },
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["G", "D"], label: "Go to Dashboard" },
      { keys: ["G", "S"], label: "Go to Sessions" },
      { keys: ["G", "M"], label: "Go to Module SDK" },
      { keys: ["G", "P"], label: "Go to Script SDK" },
    ],
  },
];
