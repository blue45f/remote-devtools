export type SdkEnvKey =
  | 'VITE_INTERNAL_HOST'
  | 'VITE_INTERNAL_WS'
  | 'VITE_EXTERNAL_HOST'
  | 'VITE_EXTERNAL_WS'
  | 'VITE_FORCE_DEMO';

export type SdkEnvSource = {
  readonly env?: Partial<Record<SdkEnvKey, string | undefined>>;
};

declare global {
  interface Window {
    REMOTE_DEBUG_SDK_ENV?: Partial<Record<SdkEnvKey, string | undefined>>;
  }
}

function readBuildEnv(key: SdkEnvKey): string | undefined {
  switch (key) {
    case 'VITE_INTERNAL_HOST':
      return import.meta.env.VITE_INTERNAL_HOST;
    case 'VITE_INTERNAL_WS':
      return import.meta.env.VITE_INTERNAL_WS;
    case 'VITE_EXTERNAL_HOST':
      return import.meta.env.VITE_EXTERNAL_HOST;
    case 'VITE_EXTERNAL_WS':
      return import.meta.env.VITE_EXTERNAL_WS;
    case 'VITE_FORCE_DEMO':
      return import.meta.env.VITE_FORCE_DEMO;
  }
}

export function readSdkEnv(key: SdkEnvKey, fallback: string, source?: SdkEnvSource): string {
  if (source) {
    const value = source.env?.[key];
    return value || fallback;
  }

  if (typeof window !== 'undefined' && window.REMOTE_DEBUG_SDK_ENV) {
    const value = window.REMOTE_DEBUG_SDK_ENV[key];
    if (value) return value;
  }

  const value = readBuildEnv(key);
  return value || fallback;
}

function originFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  try {
    return new URL(url, window.location.href).origin;
  } catch {
    return undefined;
  }
}

function isSdkScriptUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url, window.location.href);
    return /\/sdk\/(?:dist\/)?index\.(?:umd\.)?js$/.test(pathname);
  } catch {
    return false;
  }
}

function getCurrentScriptOrigin(): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const script = document.currentScript;
  if (!(script instanceof HTMLScriptElement)) return undefined;

  return originFromUrl(script.src);
}

function findSdkScriptTagOrigin(): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const scripts = Array.from(document.getElementsByTagName('script'));
  for (let index = scripts.length - 1; index >= 0; index -= 1) {
    const src = scripts[index]?.src;
    if (src && isSdkScriptUrl(src)) {
      return originFromUrl(src);
    }
  }

  return undefined;
}

const initialSdkScriptOrigin = getCurrentScriptOrigin();

export function getSdkScriptOrigin(): string | undefined {
  return findSdkScriptTagOrigin() || initialSdkScriptOrigin;
}

export function toWebSocketOrigin(origin: string): string {
  const url = new URL(origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.origin;
}

export function isSdkDemoMode(): boolean {
  if (readSdkEnv('VITE_FORCE_DEMO', '') === 'true') return true;

  try {
    return typeof window !== 'undefined' && window.localStorage.getItem('demo-mode') === '1';
  } catch {
    return false;
  }
}
