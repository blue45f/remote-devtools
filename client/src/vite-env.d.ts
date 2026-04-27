/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HOST?: string;
  readonly VITE_WS_HOST?: string;
  readonly VITE_ENV?: string;
  /**
   * When set to "true" the build defaults to demo mode for every visitor
   * (used by the public Vercel demo deployment where there is no backend).
   */
  readonly VITE_FORCE_DEMO?: string;
  /** Sentry DSN — telemetry is a no-op when this is unset. */
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_RELEASE?: string;
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;
  readonly VITE_SENTRY_REPLAYS_SAMPLE_RATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  RemoteDebugSdk?: {
    createDebugger: (onClick?: () => void) => void;
  };
}
