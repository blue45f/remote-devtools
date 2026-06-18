import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppStore } from './store';

const isEditable = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
};

export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const setCommandOpen = useAppStore((s) => s.setCommandOpen);
  const toggleCommand = useAppStore((s) => s.toggleCommand);
  const toggleShortcuts = useAppStore((s) => s.toggleShortcuts);
  const toggleSidebarCollapsed = useAppStore((s) => s.toggleSidebarCollapsed);

  useEffect(() => {
    let pendingG = false;
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    const clearPending = () => {
      pendingG = false;
      if (pendingTimer) {
        globalThis.clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    };

    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommand();
        return;
      }

      // Escape closes command palette (handled by Radix Dialog already)
      if (isEditable(e.target)) return;

      // "?" — keyboard shortcut reference. Industry-standard hotkey
      // (Linear, GitHub, Slack, Notion). Arrives as Shift+/ on US layouts;
      // matching on `e.key === "?"` covers every modern layout.
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        toggleShortcuts();
        return;
      }

      // "[" — collapse / expand the sidebar. Notion / Linear / Slack
      // parity for the "give me more canvas" muscle memory.
      if (e.key === '[' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        toggleSidebarCollapsed();
        return;
      }

      // "g" then nav letter (Linear-style)
      if (!pendingG && e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        pendingG = true;
        pendingTimer = globalThis.setTimeout(clearPending, 1000);
        return;
      }

      if (pendingG) {
        clearPending();
        const k = e.key.toLowerCase();
        if (k === 'd') {
          e.preventDefault();
          navigate('/dashboard');
        } else if (k === 's') {
          e.preventDefault();
          navigate('/sessions');
        } else if (k === 'm') {
          e.preventDefault();
          navigate('/sandbox/module');
        } else if (k === 'p') {
          e.preventDefault();
          navigate('/sandbox/script');
        }
      }
    };

    globalThis.addEventListener('keydown', handler);
    return () => {
      globalThis.removeEventListener('keydown', handler);
      clearPending();
    };
  }, [navigate, setCommandOpen, toggleCommand, toggleShortcuts, toggleSidebarCollapsed]);
}

/**
 * Static shortcut reference — kept here so the ShortcutsDialog and any
 * future CommandPalette entry stay in sync with the actual handlers
 * registered in `useGlobalShortcuts`. Update both together.
 */
export interface KeyboardShortcut {
  keys: string[];
  labelKey: string;
  descriptionKey?: string;
}

export interface ShortcutGroup {
  labelKey: string;
  shortcuts: KeyboardShortcut[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    labelKey: 'shortcuts.groupGeneral',
    shortcuts: [
      { keys: ['⌘', 'K'], labelKey: 'shortcuts.openCommandPalette' },
      { keys: ['?'], labelKey: 'shortcuts.showKeyboardShortcuts' },
      { keys: ['['], labelKey: 'shortcuts.collapseSidebar' },
      { keys: ['Esc'], labelKey: 'shortcuts.closeDialog' },
    ],
  },
  {
    labelKey: 'shortcuts.groupNavigation',
    shortcuts: [
      { keys: ['G', 'D'], labelKey: 'shortcuts.goDashboard' },
      { keys: ['G', 'S'], labelKey: 'shortcuts.goSessions' },
      { keys: ['G', 'M'], labelKey: 'shortcuts.goModuleSdk' },
      { keys: ['G', 'P'], labelKey: 'shortcuts.goScriptSdk' },
    ],
  },
  {
    labelKey: 'shortcuts.groupSessionsList',
    shortcuts: [
      {
        keys: ['J'],
        labelKey: 'shortcuts.moveCursorDown',
        descriptionKey: 'shortcuts.downAlsoWorks',
      },
      { keys: ['K'], labelKey: 'shortcuts.moveCursorUp', descriptionKey: 'shortcuts.upAlsoWorks' },
      { keys: ['Enter'], labelKey: 'shortcuts.openFocusedSession' },
    ],
  },
  {
    labelKey: 'shortcuts.groupSessionDetail',
    shortcuts: [
      { keys: ['1'], labelKey: 'shortcuts.overviewTab' },
      { keys: ['2'], labelKey: 'shortcuts.replayTab' },
      { keys: ['3'], labelKey: 'shortcuts.timelineTab' },
      { keys: ['4'], labelKey: 'shortcuts.networkTab' },
      { keys: ['5'], labelKey: 'shortcuts.consoleTab' },
      { keys: ['6'], labelKey: 'shortcuts.rawJsonTab' },
      {
        keys: ['C'],
        labelKey: 'shortcuts.commentAtPlayhead',
        descriptionKey: 'shortcuts.commentAtPlayheadDesc',
      },
    ],
  },
  {
    labelKey: 'shortcuts.groupTimelineTab',
    shortcuts: [
      { keys: ['J'], labelKey: 'shortcuts.nextEvent', descriptionKey: 'shortcuts.downAlsoWorks' },
      { keys: ['K'], labelKey: 'shortcuts.previousEvent', descriptionKey: 'shortcuts.upAlsoWorks' },
      { keys: ['Enter'], labelKey: 'shortcuts.jumpReplayToEvent' },
    ],
  },
  {
    labelKey: 'shortcuts.groupReplayPlayer',
    shortcuts: [
      {
        keys: ['Space'],
        labelKey: 'shortcuts.playPause',
        descriptionKey: 'shortcuts.playPauseDesc',
      },
      { keys: ['←'], labelKey: 'shortcuts.backFiveSeconds' },
      { keys: ['→'], labelKey: 'shortcuts.forwardFiveSeconds' },
      { keys: ['J'], labelKey: 'shortcuts.backTenSeconds' },
      { keys: ['L'], labelKey: 'shortcuts.forwardTenSeconds' },
      { keys: ['Home'], labelKey: 'shortcuts.restartFromBeginning' },
      {
        keys: ['F'],
        labelKey: 'shortcuts.toggleFullscreen',
        descriptionKey: 'shortcuts.onlyReplayTab',
      },
    ],
  },
];
