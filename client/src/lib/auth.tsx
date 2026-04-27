import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const TOKEN_KEY = "auth-token";

/**
 * Provider-agnostic auth context.
 *
 * The provider stores a JWT in localStorage and exposes minimal helpers.
 * Real production deployments swap this implementation for a Clerk /
 * Supabase / Auth0 React provider — every consumer of `useAuth()` keeps
 * working as long as the new provider exposes the same shape.
 *
 * In the public Vercel demo and self-host single-tenant deployments the
 * provider stays empty (token=null) and the app behaves exactly as before.
 *
 * ─────────────────────────────────────────────────────────────────────
 * Clerk swap example (drop-in replacement; activate by setting
 *   VITE_CLERK_PUBLISHABLE_KEY in .env and installing `@clerk/clerk-react`):
 *
 *   import { ClerkProvider, useAuth as useClerk } from "@clerk/clerk-react";
 *
 *   const PUB_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
 *
 *   export function AuthProvider({ children }) {
 *     // If the env var is unset (self-host / demo) fall through to the
 *     // local JWT provider — no behavioural change.
 *     if (!PUB_KEY) return <LocalAuthProvider>{children}</LocalAuthProvider>;
 *     return (
 *       <ClerkProvider publishableKey={PUB_KEY}>
 *         <ClerkBridge>{children}</ClerkBridge>
 *       </ClerkProvider>
 *     );
 *   }
 *
 *   function ClerkBridge({ children }) {
 *     const { getToken, signOut, isSignedIn, userId, orgId } = useClerk();
 *     const [token, setToken] = useState<string | null>(null);
 *     useEffect(() => {
 *       if (!isSignedIn) { setToken(null); return; }
 *       void getToken().then(setToken);
 *     }, [isSignedIn, getToken]);
 *     const value = useMemo(() => ({
 *       token,
 *       claims: token ? { sub: userId!, org: orgId ?? undefined } : null,
 *       signIn: () => {},      // Clerk handles the UI flow itself
 *       signOut: () => void signOut(),
 *     }), [token, userId, orgId, signOut]);
 *     return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
 *   }
 *
 * Supabase / Auth0 follow the same pattern: wrap the official provider,
 * fetch the access-token, expose it as { token, claims, signIn, signOut }.
 * ─────────────────────────────────────────────────────────────────────
 */
export interface AuthClaims {
  sub: string;
  org?: string;
  plan?: "free" | "starter" | "pro";
  email?: string;
  exp?: number;
}

interface AuthContextValue {
  token: string | null;
  claims: AuthClaims | null;
  signIn: (token: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function decodeClaims(token: string | null): AuthClaims | null {
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as AuthClaims;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readToken());

  // Keep multiple tabs in sync.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) setToken(readToken());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const signIn = useCallback((next: string) => {
    localStorage.setItem(TOKEN_KEY, next);
    setToken(next);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      claims: decodeClaims(token),
      signIn,
      signOut,
    }),
    [token, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() must be used inside <AuthProvider>");
  }
  return ctx;
}

/**
 * Convenience helper for fetch callers — adds `Authorization: Bearer <token>`
 * when available. Used by `apiFetch` once it's wired up.
 */
export function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
