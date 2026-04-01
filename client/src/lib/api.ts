/**
 * Centralized API configuration and fetch utilities.
 * All data fetching goes through TanStack Query; this module provides
 * the query client and typed fetch helpers.
 */
import { QueryClient } from "@tanstack/react-query";

export const API_HOST = import.meta.env.VITE_HOST || "http://localhost:3000";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_HOST}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
