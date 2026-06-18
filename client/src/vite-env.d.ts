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
  /**
   * ChangelogDesk endpoint for the shared "What's new" widget. When unset the
   * widget is not rendered at all (default today — ChangelogDesk not deployed).
   */
  readonly VITE_CHANGELOGDESK_URL?: string;
  /** ChangelogDesk publishable key (pk_…) — defaults to 'pk_demo'. */
  readonly VITE_CHANGELOGDESK_PK?: string;
  /**
   * NotifyDesk endpoint for the shared notification bell. When unset the widget
   * is not rendered at all (default today — NotifyDesk not deployed).
   */
  readonly VITE_NOTIFYDESK_URL?: string;
  /** NotifyDesk publishable key (pk_…) — defaults to 'pk_demo'. */
  readonly VITE_NOTIFYDESK_PK?: string;
  /**
   * SearchDesk endpoint for the shared ⌘K search palette. When unset the widget
   * is not rendered at all (default today — SearchDesk not deployed).
   */
  readonly VITE_SEARCHDESK_URL?: string;
  /** SearchDesk publishable key (pk_…) — defaults to 'pk_demo'. */
  readonly VITE_SEARCHDESK_PK?: string;
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

/** The SDK's UMD global, exposed as `RemoteDebugSdk` when loaded via <script>. */
interface RemoteDebugSdkGlobal {
  createDebugger: (onClick?: () => void) => void;
  /** The SDK's currently-active session, or null when no room is open. */
  getActiveSession?: () => RemoteDebugSdkSession | null;
}

interface Window {
  RemoteDebugSdk?: RemoteDebugSdkGlobal;
}

// The app reads the UMD global via `globalThis.RemoteDebugSdk`. TypeScript only
// surfaces `var` declarations on `typeof globalThis` (not `interface Window`
// members), so this `var` mirror is required to type those reads.
// eslint-disable-next-line no-var -- ambient global must be declared with `var`
declare var RemoteDebugSdk: RemoteDebugSdkGlobal | undefined;

/**
 * Dispatched on `window` whenever the SDK opens or closes a session.
 * `detail` is the active session, or null when it closed.
 */
interface WindowEventMap {
  'remote-debug-sdk:session': CustomEvent<RemoteDebugSdkSession | null>;
}
