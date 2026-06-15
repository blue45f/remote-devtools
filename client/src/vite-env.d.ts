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
  /**
   * SurveyDesk endpoint for the shared feedback widget. When unset the widget
   * is not rendered at all (default today — SurveyDesk not yet deployed).
   */
  readonly VITE_SURVEYDESK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** A session the SDK has open. Mirrors `ActiveSdkSession` in sdk/index.ts. */
interface RemoteDebugSdkSession {
  room: string;
  recordId: number | null;
  recordMode: boolean;
}

interface Window {
  RemoteDebugSdk?: {
    createDebugger: (onClick?: () => void) => void;
    /** The SDK's currently-active session, or null when no room is open. */
    getActiveSession?: () => RemoteDebugSdkSession | null;
  };
}

/**
 * Dispatched on `window` whenever the SDK opens or closes a session.
 * `detail` is the active session, or null when it closed.
 */
interface WindowEventMap {
  'remote-debug-sdk:session': CustomEvent<RemoteDebugSdkSession | null>;
}
