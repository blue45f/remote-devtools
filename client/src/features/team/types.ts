export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';
export type MemberStatus = 'active' | 'invited' | 'suspended' | 'deleted';

export const MEMBER_ROLES: MemberRole[] = ['owner', 'admin', 'member', 'viewer'];

export interface Member {
  id: string;
  name?: string;
  email?: string;
  role: MemberRole;
  status: MemberStatus;
  createdAt?: string;
}

export interface InviteMemberPayload {
  email: string;
  name?: string;
  role: MemberRole;
}

export interface UpdateMemberPayload {
  name?: string;
  role?: MemberRole;
  status?: MemberStatus;
}
