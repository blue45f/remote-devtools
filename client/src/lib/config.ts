/**
 * Build-time feature flags. Mirrors the admin app's CONFIG.* env switches but
 * scoped to what the unified client needs. All flags default to ON so a plain
 * `pnpm dev` exposes every surface; set the env var to 'false' to hide one.
 */
function flag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value !== 'false' && value !== '0';
}

export const FEATURES = {
  /** Remote DevTools live CDP console (`/remote-devtools`). */
  remoteDevtools: flag(import.meta.env.VITE_REMOTE_DEVTOOLS_ENABLED, true),
  /** Team / organization member management (`/settings/team`). */
  team: flag(import.meta.env.VITE_TEAM_ENABLED, true),
} as const;

export type FeatureFlag = keyof typeof FEATURES;

export function isFeatureEnabled(flagName?: FeatureFlag): boolean {
  if (!flagName) return true;
  return FEATURES[flagName];
}
