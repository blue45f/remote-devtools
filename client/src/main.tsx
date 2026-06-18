import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { DeskCloudWidgets } from '@/components/deskcloud/DeskCloudWidgets';
import ErrorBoundary from '@/components/ErrorBoundary';
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget';
import Layout from '@/components/Layout';
import { RequireAuth } from '@/components/RequireAuth';
import { Spinner } from '@/components/ui/spinner';
import { queryClient } from '@/lib/api';
import { AuthProvider } from '@/lib/auth';
import '@/lib/i18n'; // side-effect import — initialises react-i18next
import { initSentry } from '@/lib/sentry';

import './index.css';

initSentry();

const Landing = lazy(() => import('@/pages/Landing'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const SignIn = lazy(() => import('@/pages/SignIn'));
const SignUp = lazy(() => import('@/pages/SignUp'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Sessions = lazy(() => import('@/pages/Sessions'));
const SessionDetail = lazy(() => import('@/pages/SessionDetail'));
const RemoteDevTools = lazy(() => import('@/pages/RemoteDevTools'));
const GuideFeatures = lazy(() => import('@/pages/GuideFeatures'));
const GuideUser = lazy(() => import('@/pages/GuideUser'));
const GuideDev = lazy(() => import('@/pages/GuideDev'));
const SettingsProfile = lazy(() => import('@/pages/SettingsProfile'));
const SettingsTeam = lazy(() => import('@/pages/SettingsTeam'));
const SdkModule = lazy(() => import('@/pages/SdkModule'));
const SdkScript = lazy(() => import('@/pages/SdkScript'));
const Policy = lazy(() => import('@/pages/Policy'));
const Design = lazy(() => import('@/pages/Design'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Spinner label="Loading…" />
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root was not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public marketing landing — no app shell */}
                <Route path="/" element={<Landing />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/sign-in" element={<SignIn />} />
                <Route path="/sign-up" element={<SignUp />} />
                {/* Legal pages — TermsDesk publications rendered in-app */}
                <Route path="/terms" element={<Policy slug="terms-of-service" />} />
                <Route path="/privacy" element={<Policy slug="privacy-policy" />} />
                {/* Living design-system style guide — public, no app shell */}
                <Route path="/design" element={<Design />} />
                {/* App shell — protected by RequireAuth when the backend has
                   AUTH_JWT_SECRET set; pass-through in demo / self-host. */}
                <Route
                  element={
                    <RequireAuth>
                      <Layout />
                    </RequireAuth>
                  }
                >
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="sessions" element={<Sessions />} />
                  <Route path="sessions/:id" element={<SessionDetail />} />
                  <Route path="remote-devtools" element={<RemoteDevTools />} />
                  <Route path="guide" element={<GuideFeatures />} />
                  <Route path="guide/user" element={<GuideUser />} />
                  <Route path="guide/dev" element={<GuideDev />} />
                  <Route path="settings/profile" element={<SettingsProfile />} />
                  <Route path="settings/team" element={<SettingsTeam />} />
                  <Route path="sandbox/module" element={<SdkModule />} />
                  <Route path="sandbox/script" element={<SdkScript />} />
                  {/* Legacy redirects (preserve old links) */}
                  <Route path="test" element={<Navigate to="/sandbox/script" replace />} />
                  <Route path="user-info" element={<Navigate to="/settings/profile" replace />} />
                  <Route path="feature-introduction" element={<Navigate to="/guide" replace />} />
                  <Route path="user-guide" element={<Navigate to="/guide/user" replace />} />
                  <Route path="dev-guide" element={<Navigate to="/guide/dev" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
            {/* Shared SurveyDesk feedback widget — fixed floating button on every
                page. Rendered only when VITE_SURVEYDESK_URL is set; with the env
                unset (default today) the app is completely unaffected. */}
            {import.meta.env.VITE_SURVEYDESK_URL && (
              <FeedbackWidget
                appId="remotedevtools"
                endpoint={import.meta.env.VITE_SURVEYDESK_URL}
              />
            )}
            {/* Shared DeskCloud widgets (ChangelogDesk / NotifyDesk / SearchDesk).
                Each renders only when its VITE_*_URL is set; all unset by default
                so the app is completely unaffected today. */}
            <DeskCloudWidgets />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// PWA: 프로덕션에서만 서비스워커 등록 (sw.js는 vercel.json rewrite 예외 필요)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
