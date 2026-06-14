import type { UpdateProfilePayload, UserProfile } from './types';

import { apiFetch } from '@/lib/api';

/**
 * The backend wraps user-profile responses in `{ success, data }`. apiFetch
 * returns the raw envelope, so unwrap here and keep the rest of the app working
 * with a plain `UserProfile`.
 */
interface Envelope<T> {
  success?: boolean;
  data?: T;
}

function unwrap<T>(res: Envelope<T> | T): T {
  if (res && typeof res === 'object' && 'data' in (res as Envelope<T>)) {
    return (res as Envelope<T>).data as T;
  }
  return res as T;
}

export async function getProfile(empNo: string): Promise<UserProfile> {
  const res = await apiFetch<Envelope<UserProfile> | UserProfile>(
    `/api/user-profile/${encodeURIComponent(empNo)}`,
  );
  return unwrap(res);
}

export async function updateProfile(
  empNo: string,
  payload: UpdateProfilePayload,
): Promise<UserProfile> {
  const res = await apiFetch<Envelope<UserProfile> | UserProfile>(
    `/api/user-profile/${encodeURIComponent(empNo)}/upsert`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return unwrap(res);
}
