import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';

export interface Viewer {
  clientId: string;
  name: string | null;
}

interface PresenceResponse {
  count: number;
  viewers: Viewer[];
}

const CLIENT_ID_KEY = 'presence-client-id';
const HEARTBEAT_MS = 10_000;

function isDemoMode(): boolean {
  if (typeof localStorage === 'undefined') return false;
  if (import.meta.env.VITE_FORCE_DEMO === 'true') return true;
  return localStorage.getItem('demo-mode') === '1';
}

/**
 * Stable per-tab client id. Lives in sessionStorage so a reload keeps the
 * same identity but a new tab counts as a distinct viewer.
 */
export function getPresenceClientId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = globalThis.sessionStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = `c_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
      globalThis.sessionStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return `c_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function presenceWsUrl(sessionId: string, clientId: string): string {
  const proto = globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const qs = new URLSearchParams({ sessionId, clientId });
  return `${proto}//${globalThis.location.host}/ws/presence?${qs.toString()}`;
}

/**
 * Live presence for a session. Prefers a WebSocket (push) on /ws/presence
 * and falls back to HTTP heartbeat polling — in demo mode (no real server)
 * or if the socket can't connect / drops. Returns the current viewers +
 * count (including self).
 */
export function usePresence(sessionId: string | undefined, enabled: boolean): PresenceResponse {
  const emptyState: PresenceResponse = { count: 0, viewers: [] };
  const [state, setState] = useState<PresenceResponse>(emptyState);

  const active = enabled && !!sessionId;

  useEffect(() => {
    if (!active || !sessionId) {
      return;
    }

    let cancelled = false;
    const clientId = getPresenceClientId();
    let socket: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let pingTimer: ReturnType<typeof setInterval> | undefined;

    const stopPolling = () => {
      if (pollTimer !== undefined) globalThis.clearInterval(pollTimer);
      pollTimer = undefined;
    };

    const poll = async () => {
      try {
        const res = await apiFetch<PresenceResponse>(
          `/api/presence/${encodeURIComponent(sessionId)}/heartbeat`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId }),
          },
        );
        if (!cancelled && res) setState(res);
      } catch {
        /* best-effort */
      }
    };

    const startPolling = () => {
      if (cancelled || pollTimer !== undefined) return;
      void poll();
      pollTimer = globalThis.setInterval(() => void poll(), HEARTBEAT_MS);
    };

    // Demo mode / SSR: no live socket server, so poll the (seed-routed) HTTP
    // endpoint instead of opening a doomed WebSocket.
    if (isDemoMode() || typeof WebSocket === 'undefined') {
      startPolling();
      return () => {
        cancelled = true;
        stopPolling();
        setState({ count: 0, viewers: [] });
      };
    }

    try {
      socket = new WebSocket(presenceWsUrl(sessionId, clientId));
      socket.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as { type?: string } & PresenceResponse;
          if (!cancelled && msg.type === 'viewers') {
            setState({ count: msg.count, viewers: msg.viewers });
          }
        } catch {
          /* ignore malformed frames */
        }
      };
      socket.onopen = () => {
        pingTimer = globalThis.setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) socket.send('ping');
        }, HEARTBEAT_MS);
      };
      // If the socket errors or closes unexpectedly, fall back to polling so
      // presence still works even where the ws path isn't reachable.
      const fallback = () => {
        if (cancelled) return;
        if (pingTimer !== undefined) globalThis.clearInterval(pingTimer);
        pingTimer = undefined;
        startPolling();
      };
      socket.onerror = fallback;
      socket.onclose = fallback;
    } catch {
      startPolling();
    }

    return () => {
      cancelled = true;
      stopPolling();
      if (pingTimer !== undefined) globalThis.clearInterval(pingTimer);
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        try {
          socket.close();
        } catch {
          /* already closed */
        }
      }
      setState({ count: 0, viewers: [] });
    };
  }, [sessionId, active]);

  if (!active) return emptyState;
  return state;
}
