/**
 * Centralized API configuration and fetch utilities.
 * All data fetching goes through TanStack Query; this module provides
 * the query client and typed fetch helpers. When demo mode is enabled
 * the fetch helper short-circuits to seed data instead of the network —
 * the seed router is lazy-loaded so it is not paid for in normal builds.
 */
import { QueryClient } from '@tanstack/react-query';

export const API_HOST = import.meta.env.VITE_HOST || 'http://localhost:3000';

export const queryClient = new QueryClient({
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
  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${API_HOST}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
