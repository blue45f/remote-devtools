import { Mail } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { BrandMark } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { API_HOST } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAppStore } from "@/lib/store";

/**
 * Sign-in page.
 *
 * Behaviour by environment:
 *  - Public Vercel demo (VITE_FORCE_DEMO=true): the form is decorative;
 *    submit flips on demo mode and routes to the dashboard.
 *  - Self-host with backend reachable: submit calls
 *    `POST /api/auth/dev-token` to mint a JWT, stores it via `useAuth().signIn`,
 *    and navigates onward. Production deployments swap the body of `submit()`
 *    for Clerk/Supabase/Auth0 — see auth.tsx for the drop-in example.
 */
export default function SignInPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setDemoMode = useAppStore((s) => s.setDemoMode);
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);

  const isForcedDemo = import.meta.env.VITE_FORCE_DEMO === "true";
  const next = params.get("next") ?? "/dashboard";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      // Vercel demo build has no backend — fall through to demo mode.
      if (isForcedDemo) {
        await new Promise((r) => setTimeout(r, 600));
        toast.success("Demo mode activated", {
          description: "Real authentication ships with the hosted plan.",
        });
        setDemoMode(true);
        navigate(next);
        return;
      }

      const res = await fetch(`${API_HOST}/api/auth/dev-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sub: email || "dev-user" }),
      });

      if (res.status === 503) {
        // Backend has AUTH_JWT_SECRET unset — single-tenant self-host.
        toast.success("Signed in (auth disabled)", {
          description: "AUTH_JWT_SECRET is unset, so the backend skips token verification.",
        });
        navigate(next);
        return;
      }
      if (!res.ok) {
        const msg = await res.text().catch(() => "Sign-in failed");
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const { token } = (await res.json()) as { token: string };
      signIn(token);
      toast.success("Signed in");
      navigate(next);
    } catch (err) {
      toast.error("Could not sign in", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell>
      <div className="text-center mb-7">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          Welcome back
        </h1>
        <p className="text-sm text-fg-subtle">
          Sign in to your team workspace.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-fg-subtle mb-1.5 block">
            Email
          </span>
          <Input
            type="email"
            required
            placeholder="you@team.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leadingIcon={<Mail />}
            autoComplete="email"
          />
        </label>
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={pending}
        >
          {pending ? "Signing in…" : "Continue with email"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[11px] text-fg-faint">
        <span className="flex-1 h-px bg-border" />
        <span>or</span>
        <span className="flex-1 h-px bg-border" />
      </div>

      <div className="space-y-2">
        <Button variant="outline" className="w-full" disabled>
          Continue with Google · soon
        </Button>
        <Button variant="outline" className="w-full" disabled>
          Continue with SSO · soon
        </Button>
      </div>

      <p className="mt-7 text-center text-xs text-fg-subtle">
        New here?{" "}
        <Link
          to="/sign-up"
          className="text-fg underline underline-offset-2"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-md mx-auto h-14 flex items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <BrandMark className="size-7" />
            <span className="text-[15px] font-semibold tracking-tight">
              Remote DevTools
            </span>
          </Link>
          <Link to="/" className="text-xs text-fg-subtle hover:text-fg">
            ← Home
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-sm p-6 bg-surface-raised">
          {children}
        </Card>
      </main>
    </div>
  );
}
