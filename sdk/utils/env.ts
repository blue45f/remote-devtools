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

// The SDK historically shipped a committed `sdk/.env.production` whose
// placeholder hosts (e.g. `wss://your-external-domain.com`) were inlined by
// `vite build` into the bundle. Such a baked placeholder is a non-empty string,
// so it used to shadow the correct runtime same-origin default and the SDK
// dialed a dead domain. Treat any unresolved placeholder as "unset" so the
// dynamic same-origin fallback wins — the SDK ships ONE bundle to many origins,
// so the runtime origin (or `globalThis.REMOTE_DEBUG_SDK_ENV`) is the source of
// truth for connection hosts, not whatever was inlined at build time.
const PLACEHOLDER_HOST_RE = /your-(?:internal|external)-domain\.com/i;

function readBuildEnv(key: SdkEnvKey): string | undefined {
  let value: string | undefined;
  switch (key) {
    case 'VITE_INTERNAL_HOST':
      value = import.meta.env.VITE_INTERNAL_HOST;
      break;
    case 'VITE_INTERNAL_WS':
      value = import.meta.env.VITE_INTERNAL_WS;
      break;
    case 'VITE_EXTERNAL_HOST':
      value = import.meta.env.VITE_EXTERNAL_HOST;
      break;
    case 'VITE_EXTERNAL_WS':
      value = import.meta.env.VITE_EXTERNAL_WS;
      break;
    case 'VITE_FORCE_DEMO':
      return import.meta.env.VITE_FORCE_DEMO;
  }

  if (value && PLACEHOLDER_HOST_RE.test(value)) return undefined;
  return value;
}

export function readSdkEnv(key: SdkEnvKey, fallback: string, source?: SdkEnvSource): string {
  if (source) {
    const value = source.env?.[key];
    return value || fallback;
  }

  if (typeof window !== 'undefined' && globalThis.REMOTE_DEBUG_SDK_ENV) {
    const value = globalThis.REMOTE_DEBUG_SDK_ENV[key];
    if (value) return value;
  }

  const value = readBuildEnv(key);
  return value || fallback;
}

function originFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  try {
    return new URL(url, globalThis.location.href).origin;
  } catch {
    return undefined;
  }
}

function isSdkScriptUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url, globalThis.location.href);
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
    return typeof window !== 'undefined' && globalThis.localStorage.getItem('demo-mode') === '1';
  } catch {
    return false;
  }
}
