export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  USER_INFO: '/user-info',
  FEATURE_INTRODUCTION: '/feature-introduction',
  USER_GUIDE: '/user-guide',
  DEV_GUIDE: '/dev-guide',
  REMOTE_DEVTOOLS: '/remote-devtools',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]
