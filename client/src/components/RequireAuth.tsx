import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';

import { Spinner } from '@/components/ui/spinner';
import { API_HOST } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAppStore } from '@/lib/store';

/**
 * Protects an outlet behind authentication when the backend has it enabled.
 *
 * Decision tree:
 *   1. Demo mode active → pass through (offline seed data, no auth needed).
 *   2. Backend reports `auth.enabled = false` → pass through (self-host).
 *   3. Backend reports `auth.enabled = true` and there's no token → redirect
 *      to /sign-in?next=<current> so the user lands back where they were.
 *   4. There IS a token → pass through; APIs validate the JWT themselves.
 *
 * The probe is a GET /api/auth/status with a 1.5s timeout — if the request
 * fails (network error / dev backend not running) we treat it as
 * `enabled: false` to avoid stranding self-host operators behind a redirect.
 */
interface AuthStatus {
  enabled: boolean;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const isDemo = useAppStore((s) => s.demoMode);
  const isForcedDemo = import.meta.env.VITE_FORCE_DEMO === 'true';
  const location = useLocation();
  const [status, setStatus] = useState<'checking' | 'open' | 'locked'>('checking');

  // Intentional: derive the auth-gate status from token/demo flags on change.

  useEffect(() => {
    if (isDemo || isForcedDemo) {
      setStatus('open');
      return;
    }
    if (token) {
      setStatus('open');
      return;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);

    fetch(`${API_HOST}/api/auth/status`, { signal: ctrl.signal })
      .then((res) => (res.ok ? (res.json() as Promise<AuthStatus>) : null))
      .then((body) => {
        if (body?.enabled) setStatus('locked');
        else setStatus('open');
      })
      .catch(() => setStatus('open')) // backend unreachable → don't strand the user
      .finally(() => clearTimeout(timer));

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [token, isDemo, isForcedDemo]);

  if (status === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Spinner label={t('common.checking')} />
      </div>
    );
  }
  if (status === 'locked') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?next=${next}`} replace />;
  }
  return <>{children}</>;
}
