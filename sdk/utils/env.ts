export type SdkEnvKey =
  | 'VITE_INTERNAL_HOST'
  | 'VITE_INTERNAL_WS'
  | 'VITE_EXTERNAL_HOST'
  | 'VITE_EXTERNAL_WS';

export type SdkEnvSource = {
  readonly env?: Partial<Record<SdkEnvKey, string | undefined>>;
};

export function readSdkEnv(
  key: SdkEnvKey,
  fallback: string,
  source?: SdkEnvSource,
): string {
  const value = source?.env?.[key];
  return value || fallback;
}
