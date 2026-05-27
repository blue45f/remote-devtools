import { lazy, Suspense, type ComponentType } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES } from '@/shared/constants'
import { Layout } from '../Layout'

function lazyPage<TModule, TExport extends keyof TModule>(
  loader: () => Promise<TModule>,
  exportName: TExport,
) {
  return lazy(async () => {
    const module = await loader()

    return { default: module[exportName] as ComponentType }
  })
}

const FeatureIntroductionPage = lazyPage(
  () => import('@/features/guide/components/FeatureIntroductionPage'),
  'FeatureIntroductionPage',
)
const UserGuidePage = lazyPage(
  () => import('@/features/guide/components/UserGuidePage'),
  'UserGuidePage',
)
const DevGuidePage = lazyPage(
  () => import('@/features/guide/components/DevGuidePage'),
  'DevGuidePage',
)
const UserInfoPage = lazyPage(
  () => import('@/features/user/components/UserInfoPage'),
  'UserInfoPage',
)
const DashboardPage = lazyPage(
  () => import('@/features/dashboard/components/DashboardPage'),
  'DashboardPage',
)
const RemoteDevToolsPage = lazyPage(
  () => import('@/features/remoteDevtools/components/RemoteDevToolsPage'),
  'RemoteDevToolsPage',
)

const ROUTE_FALLBACK = <div className="route-loading" role="status" />

interface LazyRouteProps {
  page: ComponentType
}

function LazyRoute({ page: Page }: LazyRouteProps) {
  return (
    <Suspense fallback={ROUTE_FALLBACK}>
      <Page />
    </Suspense>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to={ROUTES.USER_INFO} replace />} />
        <Route
          path={ROUTES.FEATURE_INTRODUCTION}
          element={<LazyRoute page={FeatureIntroductionPage} />}
        />
        <Route
          path={ROUTES.USER_GUIDE}
          element={<LazyRoute page={UserGuidePage} />}
        />
        <Route
          path={ROUTES.DEV_GUIDE}
          element={<LazyRoute page={DevGuidePage} />}
        />
        <Route
          path={ROUTES.USER_INFO}
          element={<LazyRoute page={UserInfoPage} />}
        />
        <Route
          path={ROUTES.DASHBOARD}
          element={<LazyRoute page={DashboardPage} />}
        />
        <Route
          path={ROUTES.REMOTE_DEVTOOLS}
          element={<LazyRoute page={RemoteDevToolsPage} />}
        />
        <Route path="*" element={<Navigate to={ROUTES.USER_INFO} replace />} />
      </Route>
    </Routes>
  )
}
