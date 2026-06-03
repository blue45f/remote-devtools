import { type ComponentType, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import BookOutlined from '@ant-design/icons/es/icons/BookOutlined';
import CodeOutlined from '@ant-design/icons/es/icons/CodeOutlined';
import DashboardOutlined from '@ant-design/icons/es/icons/DashboardOutlined';
import HomeOutlined from '@ant-design/icons/es/icons/HomeOutlined';
import NodeIndexOutlined from '@ant-design/icons/es/icons/NodeIndexOutlined';
import UserOutlined from '@ant-design/icons/es/icons/UserOutlined';
import { CONFIG, ROUTES } from '@/shared/constants';

export interface MenuItem {
  key: string;
  icon: ComponentType;
  label: string;
  path: string;
}

export function useMenu() {
  const { t } = useTranslation();
  const isRemoteDevToolsEnabled = CONFIG.REMOTE_DEVTOOLS_ENABLED;

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        key: 'feature-introduction',
        icon: HomeOutlined,
        label: t('nav.featureIntroduction'),
        path: ROUTES.FEATURE_INTRODUCTION,
      },
      {
        key: 'user-guide',
        icon: BookOutlined,
        label: t('nav.userGuide'),
        path: ROUTES.USER_GUIDE,
      },
      {
        key: 'dev-guide',
        icon: CodeOutlined,
        label: t('nav.devGuide'),
        path: ROUTES.DEV_GUIDE,
      },
      {
        key: 'user-info',
        icon: UserOutlined,
        label: t('nav.userInfo'),
        path: ROUTES.USER_INFO,
      },
      {
        key: 'dashboard',
        icon: DashboardOutlined,
        label: t('nav.dashboard'),
        path: ROUTES.DASHBOARD,
      },
      ...(isRemoteDevToolsEnabled
        ? [
            {
              key: 'remote-devtools',
              icon: NodeIndexOutlined,
              label: t('nav.remoteDevtools'),
              path: ROUTES.REMOTE_DEVTOOLS,
            },
          ]
        : []),
    ],
    [isRemoteDevToolsEnabled, t],
  );

  return { menuItems };
}
