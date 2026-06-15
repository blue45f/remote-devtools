import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'recent-sessions:v1';
const MAX_ENTRIES = 5;

export interface RecentSession {
  id: string;
  name?: string;
  url?: string;
  visitedAt: number;
}

function readStorage(): RecentSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r): r is RecentSession =>
          typeof r === 'object' &&
          r !== null &&
          typeof (r as RecentSession).id === 'string' &&
          typeof (r as RecentSession).visitedAt === 'number',
      )
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function writeStorage(list: RecentSession[]) {
  if (typeof window === 'undefined') return;
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    globalThis.dispatchEvent(new Event('recent-sessions:change'));
  } catch {
    /* localStorage is sometimes unavailable (private mode, quota) — silent skip */
  }
}

export function recordSessionVisit(entry: Omit<RecentSession, 'visitedAt'>) {
  const list = readStorage();
  const filtered = list.filter((r) => r.id !== entry.id);
  const next: RecentSession[] = [{ ...entry, visitedAt: Date.now() }, ...filtered].slice(
    0,
    MAX_ENTRIES,
  );
  writeStorage(next);
}

export function clearRecentSessions() {
  if (typeof window === 'undefined') return;
  try {
    globalThis.localStorage.removeItem(STORAGE_KEY);
    globalThis.dispatchEvent(new Event('recent-sessions:change'));
  } catch {
    /* see writeStorage */
  }
}

/**
 * Live view of the recent-sessions list. Re-reads when the list changes
 * (this tab via the custom event, other tabs via the `storage` event).
 */
export function useRecentSessions(): RecentSession[] {
  const [list, setList] = useState<RecentSession[]>(() => readStorage());

  const sync = useCallback(() => {
    setList(readStorage());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };
    globalThis.addEventListener('recent-sessions:change', sync);
    globalThis.addEventListener('storage', onStorage);
    return () => {
      globalThis.removeEventListener('recent-sessions:change', sync);
      globalThis.removeEventListener('storage', onStorage);
    };
  }, [sync]);

  return list;
}
