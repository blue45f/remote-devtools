/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_ADMIN_BFF_HOST: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_TITLE: string
  readonly VITE_ISSUE_TRACKER_NAME: string
  readonly VITE_ISSUE_LABEL: string
  readonly VITE_ISSUE_PROJECT_KEY_LABEL: string
  readonly VITE_ISSUE_PREFIX_LABEL: string
  readonly VITE_SPREADSHEET_LABEL: string
  readonly VITE_SHARE_CHANNEL_NAME: string
  readonly VITE_DESIGN_TOOL_NAME: string
  readonly VITE_SDK_URL: string
  readonly VITE_ICON_BASE_URL: string
  readonly VITE_REMOTE_DEVTOOLS_ENABLED: string
  readonly VITE_REMOTE_DEVTOOLS_API_BASE: string
  readonly VITE_REMOTE_DEVTOOLS_WS_URL: string
  readonly VITE_REMOTE_DEVTOOLS_MAX_EVENTS: string
  readonly VITE_DEFAULT_SHEET_NAME: string
  readonly VITE_DEV_HOST: string
  readonly VITE_SDK_NAME: string
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// react-syntax-highlighter@16 ships ESM-only sub-paths without bundled
// types, so the DevGuidePage's deep imports (per-language and per-style)
// can't see the public typings. The values are passed straight into
// SyntaxHighlighter.registerLanguage / .style — both accept `unknown`
// at the runtime boundary.
declare module 'react-syntax-highlighter/dist/esm/prism-light'
declare module 'react-syntax-highlighter/dist/esm/languages/prism/*'
declare module 'react-syntax-highlighter/dist/esm/styles/prism/*'
