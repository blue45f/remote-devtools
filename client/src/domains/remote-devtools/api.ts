import type { RemoteCommandPayload, RemoteEvent, RemoteSession } from './types';

import { apiFetch } from '@/lib/api';

const BASE = '/api/remote-devtools';

/** Backend may wrap in `{ success, data }` or return the value directly. */
interface Envelope<T> {
  success?: boolean;
  data?: T;
}
function unwrap<T>(res: Envelope<T> | T, fallback: T): T {
  if (res && typeof res === 'object' && 'data' in (res as Envelope<T>)) {
    return ((res as Envelope<T>).data ?? fallback) as T;
  }
  return (res as T) ?? fallback;
}

export async function getSessions(): Promise<RemoteSession[]> {
  const res = await apiFetch<Envelope<RemoteSession[]> | RemoteSession[]>(`${BASE}/sessions`);
  return unwrap(res, []);
}

export async function getEvents(sessionId: string): Promise<RemoteEvent[]> {
  const res = await apiFetch<Envelope<RemoteEvent[]> | RemoteEvent[]>(
    `${BASE}/sessions/${encodeURIComponent(sessionId)}/events`,
  );
  return unwrap(res, []);
}

export async function sendCommand(sessionId: string, payload: RemoteCommandPayload): Promise<void> {
  await apiFetch<unknown>(`${BASE}/sessions/${encodeURIComponent(sessionId)}/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function createSession(): Promise<RemoteSession> {
  const res = await apiFetch<Envelope<RemoteSession> | RemoteSession>(`${BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return unwrap(res, {} as RemoteSession);
}
