import { Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES } from '@/shared/constants'
import { Layout } from '../Layout'
import { DashboardPage } from '@/features/dashboard'
import { UserInfoPage } from '@/features/user'
import { RemoteDevToolsPage } from '@/features/remoteDevtools'
import {
  FeatureIntroductionPage,
  UserGuidePage,
  DevGuidePage,
} from '@/features/guide'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to={ROUTES.USER_INFO} replace />} />
        <Route
          path={ROUTES.FEATURE_INTRODUCTION}
          element={<FeatureIntroductionPage />}
        />
        <Route path={ROUTES.USER_GUIDE} element={<UserGuidePage />} />
        <Route path={ROUTES.DEV_GUIDE} element={<DevGuidePage />} />
        <Route path={ROUTES.USER_INFO} element={<UserInfoPage />} />
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route
          path={ROUTES.REMOTE_DEVTOOLS}
          element={<RemoteDevToolsPage />}
        />
        <Route path="*" element={<Navigate to={ROUTES.USER_INFO} replace />} />
      </Route>
    </Routes>
  )
}
