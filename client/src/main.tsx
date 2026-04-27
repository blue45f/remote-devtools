import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ErrorBoundary from "@/components/ErrorBoundary";
import Layout from "@/components/Layout";
import { RequireAuth } from "@/components/RequireAuth";
import { Spinner } from "@/components/ui/spinner";
import { queryClient } from "@/lib/api";
import { AuthProvider } from "@/lib/auth";
import "@/lib/i18n"; // side-effect import — initialises react-i18next
import { initSentry } from "@/lib/sentry";

import "./index.css";

initSentry();

const Landing = lazy(() => import("@/pages/Landing"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const SignIn = lazy(() => import("@/pages/SignIn"));
const SignUp = lazy(() => import("@/pages/SignUp"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Sessions = lazy(() => import("@/pages/Sessions"));
const SessionDetail = lazy(() => import("@/pages/SessionDetail"));
const SdkModule = lazy(() => import("@/pages/SdkModule"));
const SdkScript = lazy(() => import("@/pages/SdkScript"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Spinner label="Loading…" />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
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
                <Route path="sandbox/module" element={<SdkModule />} />
                <Route path="sandbox/script" element={<SdkScript />} />
                {/* Legacy redirects (preserve old links) */}
                <Route
                  path="test"
                  element={<Navigate to="/sandbox/script" replace />}
                />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
