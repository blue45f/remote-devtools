/**
 * Centralized API configuration and HTTP client.
 * All data fetching goes through TanStack Query; this module provides the
 * query client and a typed `apiFetch` helper backed by a shared `ky`
 * instance. When demo mode is enabled the helper short-circuits to seed data
 * instead of the network — the seed router is lazy-loaded so it is not paid
 * for in normal builds.
 */
import { QueryCache, QueryClient } from '@tanstack/react-query';
import ky, { HTTPError, type Options } from 'ky';
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

/**
 * Absolute base URL ky resolves origin-rooted paths (`/api/…`, `/sessions`)
 * against. Callers pass origin-rooted paths, so the base only contributes the
 * origin: `API_HOST` (from `VITE_HOST`) when the API lives on another origin,
 * otherwise the current page origin (same-origin). Mirrors the old
 * `fetch(\`${API_HOST}${path}\`)`: empty host → same-origin. Falls back to a
 * dummy origin under SSR/tests where `location` is unavailable.
 */
function resolveBaseUrl(): string {
  if (API_HOST) return API_HOST;
  if (typeof window !== 'undefined' && globalThis.location) return globalThis.location.origin;
  return 'http://localhost';
}

/**
 * Shared ky instance for the app backend. `credentials: 'include'` keeps the
 * cookie-based session working; retries are off because TanStack Query owns
 * retry policy and mutations must not be replayed.
 */
const client = ky.create({
  baseUrl: resolveBaseUrl(),
  credentials: 'include',
  timeout: 30_000,
  retry: 0,
  hooks: {
    beforeRequest: [
      ({ request }) => {
        // Forward the auth token if one is present. Production swaps the
        // localStorage source for Clerk / Supabase / Auth0 — see auth.tsx.
        const token = typeof window === 'undefined' ? null : localStorage.getItem('auth-token');
        if (token) request.headers.set('Authorization', `Bearer ${token}`);
        // Tell the backend which language to localize its responses in (activity
        // titles, error messages). Mirrors the i18n default: Korean unless the
        // user explicitly switched (persisted as `rd-lang`).
        const lang = typeof window === 'undefined' ? 'ko' : localStorage.getItem('rd-lang') || 'ko';
        request.headers.set('Accept-Language', lang);
      },
    ],
  },
});

/**
 * Turn a ky `HTTPError` into the plain `Error` the UI relies on. Our exception
 * filter always returns `{ statusCode, message, error }`, so prefer the
 * backend's localized `message`; fall back to `API 오류: <status>`.
 */
async function toUiError(error: HTTPError): Promise<Error> {
  let message = `API 오류: ${error.response.status}`;
  try {
    const body = (await error.response.clone().json()) as { message?: unknown };
    if (typeof body?.message === 'string' && body.message) {
      message = body.message;
    }
  } catch {
    /* response is not JSON — keep the status-code fallback */
  }
  return new Error(message);
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

  // Map the RequestInit call sites pass into ky options. `body`/`headers` are
  // forwarded as-is (callers already JSON.stringify bodies and set
  // Content-Type); auth + Accept-Language are injected by the beforeRequest
  // hook. Default the timeout via an AbortSignal when the caller did not pass
  // its own signal, matching the previous fetch-based behaviour.
  const options: Options = {
    method,
    headers: init?.headers,
    body: init?.body,
    signal: init?.signal ?? AbortSignal.timeout(30_000),
  };

  let res: Response;
  try {
    res = await client(path, options);
  } catch (err) {
    if (err instanceof HTTPError) {
      // Try to extract the backend's localized error message from the body.
      throw await toUiError(err);
    }
    // Network error (backend unreachable). If not in demo mode, suggest it.
    if (!isDemoMode()) {
      throw new Error(
        '백엔드 서버에 연결할 수 없습니다. 데모 모드를 사용하거나 백엔드를 시작하세요.',
        { cause: err },
      );
    }
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
