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
  }, [navigate, setCommandOpen, toggleCommand]);
}
