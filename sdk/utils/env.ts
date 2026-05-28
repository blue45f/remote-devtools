export type SdkEnvKey =
  | 'VITE_INTERNAL_HOST'
  | 'VITE_INTERNAL_WS'
  | 'VITE_EXTERNAL_HOST'
  | 'VITE_EXTERNAL_WS';

type ImportMetaWithOptionalEnv = ImportMeta & {
  readonly env?: Partial<Record<SdkEnvKey, string | undefined>>;
};

export function readSdkEnv(
  key: SdkEnvKey,
  fallback: string,
  meta: ImportMeta = import.meta,
): string {
  const value = (meta as ImportMetaWithOptionalEnv).env?.[key];
  return value || fallback;
}
