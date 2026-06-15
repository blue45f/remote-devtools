import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'replay-prefs:v1';

export type ReplaySpeed = 0.5 | 1 | 2 | 4;

export const REPLAY_SPEEDS: ReplaySpeed[] = [0.5, 1, 2, 4];

interface ReplayPrefs {
  speed: ReplaySpeed;
  skipInactive: boolean;
}

const DEFAULT_PREFS: ReplayPrefs = { speed: 1, skipInactive: false };

function readPrefs(): ReplayPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<ReplayPrefs>;
    const speed = REPLAY_SPEEDS.includes(parsed?.speed as ReplaySpeed)
      ? (parsed.speed as ReplaySpeed)
      : DEFAULT_PREFS.speed;
    const skipInactive =
      typeof parsed?.skipInactive === 'boolean' ? parsed.skipInactive : DEFAULT_PREFS.skipInactive;
    return { speed, skipInactive };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writePrefs(prefs: ReplayPrefs) {
  if (typeof window === 'undefined') return;
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    globalThis.dispatchEvent(new Event('replay-prefs:change'));
  } catch {
    /* private mode / quota — silent skip, prefs just won't persist */
  }
}

export function useReplayPrefs(): [ReplayPrefs, (next: Partial<ReplayPrefs>) => void] {
  const [prefs, setPrefs] = useState<ReplayPrefs>(() => readPrefs());

  const sync = useCallback(() => setPrefs(readPrefs()), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };
    globalThis.addEventListener('replay-prefs:change', sync);
    globalThis.addEventListener('storage', onStorage);
    return () => {
      globalThis.removeEventListener('replay-prefs:change', sync);
      globalThis.removeEventListener('storage', onStorage);
    };
  }, [sync]);

  const update = useCallback((next: Partial<ReplayPrefs>) => {
    setPrefs((prev) => {
      const merged = { ...prev, ...next };
      writePrefs(merged);
      return merged;
    });
  }, []);

  return [prefs, update];
}
