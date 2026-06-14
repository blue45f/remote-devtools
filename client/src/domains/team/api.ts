import type { InviteMemberPayload, Member, UpdateMemberPayload } from './types';

import { apiFetch } from '@/lib/api';

const BASE = '/api/accounts/organization/members';

/** The list endpoint may return a bare array or `{ members: [...] }`. */
function toList(res: Member[] | { members?: Member[] }): Member[] {
  if (Array.isArray(res)) return res;
  return res.members ?? [];
}

export async function listMembers(): Promise<Member[]> {
  const res = await apiFetch<Member[] | { members?: Member[] }>(BASE);
  return toList(res);
}

export async function inviteMember(payload: InviteMemberPayload): Promise<Member> {
  return apiFetch<Member>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateMember(id: string, payload: UpdateMemberPayload): Promise<Member> {
  return apiFetch<Member>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function removeMember(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
