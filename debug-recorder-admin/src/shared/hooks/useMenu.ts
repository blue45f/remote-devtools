import { type ComponentType, useMemo } from 'react'
import {
  HomeOutlined,
  UserOutlined,
  BookOutlined,
  CodeOutlined,
  DashboardOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons'
import { CONFIG, ROUTES } from '@/shared/constants'

export interface MenuItem {
  key: string
  icon: ComponentType
  label: string
  path: string
}

export function useMenu() {
  const isRemoteDevToolsEnabled = CONFIG.REMOTE_DEVTOOLS_ENABLED

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        key: 'feature-introduction',
        icon: HomeOutlined,
        label: '기능 소개',
        path: ROUTES.FEATURE_INTRODUCTION,
      },
      {
        key: 'user-guide',
        icon: BookOutlined,
        label: '유저 가이드',
        path: ROUTES.USER_GUIDE,
      },
      {
        key: 'dev-guide',
        icon: CodeOutlined,
        label: '개발 가이드',
        path: ROUTES.DEV_GUIDE,
      },
      {
        key: 'user-info',
        icon: UserOutlined,
        label: '유저 정보',
        path: ROUTES.USER_INFO,
      },
      {
        key: 'dashboard',
        icon: DashboardOutlined,
        label: '대시보드',
        path: ROUTES.DASHBOARD,
      },
    ...(isRemoteDevToolsEnabled
      ? [
          {
            key: 'remote-devtools',
            icon: NodeIndexOutlined,
            label: 'Remote DevTools',
            path: ROUTES.REMOTE_DEVTOOLS,
          },
        ]
      : []),
    ],
    [isRemoteDevToolsEnabled]
  )

  return { menuItems }
}
