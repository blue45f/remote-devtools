/**
 * Role helpers for the unified admin surface.
 *
 * Roles come from the decoded JWT (`claims.role`). When auth is disabled
 * (self-host / demo) there is no token and therefore no role — in that mode
 * the single operator is treated as an `owner` so every feature stays usable,
 * mirroring the pass-through philosophy of <RequireAuth>.
 */
import { useAuth, type AuthClaims } from '@/lib/auth';

export type Role = NonNullable<AuthClaims['role']>;

export const ROLE_RANK: Record<Role, number> = {
  owner: 3,
  admin: 2,
  member: 1,
  viewer: 0,
};

/** The role to assume when auth is off (no token). */
const SELF_HOST_ROLE: Role = 'owner';

export function resolveRole(claims: AuthClaims | null, hasToken: boolean): Role {
  if (!hasToken) return SELF_HOST_ROLE;
  return claims?.role ?? 'viewer';
}

export function hasRole(role: Role, allowed: readonly Role[]): boolean {
  return allowed.includes(role);
}

/** True when `role` is at least as privileged as `min`. */
export function atLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export function useRole(): Role {
  const { token, claims } = useAuth();
  return resolveRole(claims, Boolean(token));
}

/** Convenience: is the current user an org manager (owner/admin)? */
export function useIsManager(): boolean {
  return atLeast(useRole(), 'admin');
}
