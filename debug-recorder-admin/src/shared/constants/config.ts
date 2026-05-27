const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const deriveWsUrl = (apiBaseUrl: string): string => {
  if (!apiBaseUrl) {
    return ''
  }
  return apiBaseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
}

export const CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  ADMIN_BFF_HOST: import.meta.env.VITE_ADMIN_BFF_HOST || '',
  APP_TITLE: import.meta.env.VITE_APP_TITLE || 'Debug Recorder Admin',
  SDK_URL: import.meta.env.VITE_SDK_URL || '',
  ICON_BASE_URL: import.meta.env.VITE_ICON_BASE_URL || '',
  DEFAULT_SHEET_NAME: import.meta.env.VITE_DEFAULT_SHEET_NAME || 'Sheet1',
  REMOTE_DEVTOOLS_ENABLED:
    import.meta.env.VITE_REMOTE_DEVTOOLS_ENABLED === 'true',
  REMOTE_DEVTOOLS_API_BASE:
    import.meta.env.VITE_REMOTE_DEVTOOLS_API_BASE || '/api/remote-devtools',
  REMOTE_DEVTOOLS_WS_URL:
    import.meta.env.VITE_REMOTE_DEVTOOLS_WS_URL ||
    `${deriveWsUrl(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000')}/api/remote-devtools/events`,
  REMOTE_DEVTOOLS_MAX_EVENTS: parseNumber(
    import.meta.env.VITE_REMOTE_DEVTOOLS_MAX_EVENTS,
    250
  ),
} as const

export const UX_TERMS = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Debug Recorder',
  ISSUE_TRACKER_NAME:
    import.meta.env.VITE_ISSUE_TRACKER_NAME || '이슈 추적 시스템',
  ISSUE_LABEL: import.meta.env.VITE_ISSUE_LABEL || '이슈',
  ISSUE_PROJECT_KEY_LABEL:
    import.meta.env.VITE_ISSUE_PROJECT_KEY_LABEL || '프로젝트 키',
  ISSUE_PREFIX_LABEL:
    import.meta.env.VITE_ISSUE_PREFIX_LABEL || '제목 접두어',
  SPREADSHEET_LABEL:
    import.meta.env.VITE_SPREADSHEET_LABEL || '스프레드시트',
  SHARE_CHANNEL_NAME:
    import.meta.env.VITE_SHARE_CHANNEL_NAME || '알림 채널',
  DESIGN_TOOL_NAME: import.meta.env.VITE_DESIGN_TOOL_NAME || '디자인 툴',
  SDK_NAME: import.meta.env.VITE_SDK_NAME || 'SDK',
} as const

export const isAuthEnabled = (): boolean => {
  return Boolean(CONFIG.ADMIN_BFF_HOST)
}
