/**
 * Centralized API configuration and fetch utilities.
 * All data fetching goes through TanStack Query; this module provides
 * the query client and typed fetch helpers. When demo mode is enabled
 * the fetch helper short-circuits to seed data instead of the network —
 * the seed router is lazy-loaded so it is not paid for in normal builds.
 */
import { QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const API_HOST = import.meta.env.VITE_HOST || '';

export const queryClient = new QueryClient({
  // Global error toast for all useQuery failures.
  // Mutations all have their own onError handlers and should NOT set suppressToast.
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.suppressToast) return;
      const msg = (error as Error).message || '알 수 없는 오류가 발생했습니다.';
      toast.error(msg);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function isDemoMode() {
  if (typeof window === 'undefined') return false;
  // Public demo build flips demo on for everybody — there is no backend.
  if (import.meta.env.VITE_FORCE_DEMO === 'true') return true;
  return localStorage.getItem('demo-mode') === '1';
}

let seedRouterPromise: Promise<typeof import('./seed-router')> | undefined;

function loadSeedRouter() {
  if (!seedRouterPromise) {
    seedRouterPromise = import('./seed-router');
  }
  return seedRouterPromise;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();

  if (isDemoMode()) {
    const { resolveSeed } = await loadSeedRouter();
    const seeded = resolveSeed<T>(path, init);
    if (seeded !== undefined) {
      // Tiny delay so loading states are observable in demo mode.
      await new Promise((r) => setTimeout(r, 120));
      return seeded;
    }
    // In demo mode, mutations that have no seed router entry resolve to a
    // best-effort echo of the request body so optimistic UI keeps working
    // offline.
    if (method !== 'GET' && init?.body) {
      try {
        return JSON.parse(init.body as string) as T;
      } catch {
        /* fall through to the network — exposes the missing seed */
      }
    }
  }

  // Forward the auth token if one is present. Production swaps the
  // localStorage source for Clerk / Supabase / Auth0 — see auth.tsx.
  const token = typeof window === 'undefined' ? null : localStorage.getItem('auth-token');
  // Tell the backend which language to localize its responses in (activity
  // titles, error messages). Mirrors the i18n default: Korean unless the user
  // explicitly switched (persisted as `rd-lang`).
  const lang = typeof window === 'undefined' ? 'ko' : localStorage.getItem('rd-lang') || 'ko';
  const headers: HeadersInit = {
    'Accept-Language': lang,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };
  let res: Response;
  try {
    res = await fetch(`${API_HOST}${path}`, {
      ...init,
      headers,
      signal: init?.signal ?? AbortSignal.timeout(30_000),
    });
  } catch (err) {
    // Network error (backend unreachable). If not in demo mode, suggest it.
    if (!isDemoMode()) {
      throw new Error(
        '백엔드 서버에 연결할 수 없습니다. 데모 모드를 사용하거나 백엔드를 시작하세요.',
        { cause: err },
      );
    }
    throw err;
  }
  if (!res.ok) {
    // Try to extract the backend's localized error message from the JSON body.
    // Our exception filter always returns { statusCode, message, error }.
    let message = `API 오류: ${res.status}`;
    try {
      const body = await res.clone().json();
      if (typeof body?.message === 'string' && body.message) {
        message = body.message;
      }
    } catch {
      /* response is not JSON — keep the status-code fallback */
    }
    throw new Error(message);
  }
  return res.json();
}
