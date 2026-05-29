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

/**
 * Stable per-tab client id. Lives in sessionStorage so a reload keeps the
 * same identity but a new tab counts as a distinct viewer.
 */
export function getPresenceClientId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = window.sessionStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = `c_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
      window.sessionStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return `c_${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Live presence for a session via heartbeat polling. While `enabled`, posts a
 * heartbeat immediately and every 10s, using the returned viewer list as the
 * source of truth. Returns the current viewers + count (including self).
 */
export function usePresence(sessionId: string | undefined, enabled: boolean): PresenceResponse {
  const [state, setState] = useState<PresenceResponse>({ count: 0, viewers: [] });

  useEffect(() => {
    if (!enabled || !sessionId) {
      setState({ count: 0, viewers: [] });
      return;
    }
    let cancelled = false;
    const clientId = getPresenceClientId();

    const beat = async () => {
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
        /* presence is best-effort — ignore transient failures */
      }
    };

    void beat();
    const interval = window.setInterval(() => void beat(), HEARTBEAT_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [sessionId, enabled]);

  return state;
}
