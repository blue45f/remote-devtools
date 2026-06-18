import { ArrowLeft, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { BrandMark } from '@/components/Brand';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { API_HOST } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAppStore } from '@/lib/store';
import { useDocumentTitle } from '@/lib/use-document-title';

/**
 * Sign-in page.
 *
 * Behaviour by environment:
 *  - Public Vercel demo (VITE_FORCE_DEMO=true): the form is decorative;
 *    submit flips on demo mode and routes to the dashboard.
 *  - Self-host with backend reachable: submit calls
 *    `POST /api/auth/login` to mint a JWT, stores it via `useAuth().signIn`,
 *    and navigates onward. Production deployments can still swap auth.tsx for
 *    Clerk/Supabase/Auth0 without changing downstream consumers.
 */
export default function SignInPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('auth.welcomeBack'));
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setDemoMode = useAppStore((s) => s.setDemoMode);
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);

  const isForcedDemo = import.meta.env.VITE_FORCE_DEMO === 'true';
  const next = params.get('next') ?? '/dashboard';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      // Vercel demo build has no backend — fall through to demo mode.
      if (isForcedDemo) {
        await new Promise((r) => setTimeout(r, 600));
        toast.success(t('auth.demoModeActivated'), {
          description: t('auth.demoModeActivatedDesc'),
        });
        setDemoMode(true);
        navigate(next);
        return;
      }

      const res = await fetch(`${API_HOST}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(15_000),
      });

      if (res.status === 503) {
        // Backend has AUTH_JWT_SECRET unset — single-tenant self-host.
        toast.success(t('auth.signedInAuthDisabled'), {
          description: t('auth.signedInAuthDisabledDesc'),
        });
        navigate(next);
        return;
      }
      if (!res.ok) {
        const msg = await res.text().catch(() => t('auth.signInFailed'));
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const { token } = (await res.json()) as { token: string };
      signIn(token);
      toast.success(t('auth.signedIn'));
      navigate(next);
    } catch (err) {
      // If the backend is unreachable, fall back to demo mode automatically
      // so the user can still explore the UI.
      if (err instanceof TypeError || (err instanceof Error && err.message.includes('백엔드'))) {
        toast(t('auth.backendUnavailable'), {
          description: t('auth.backendUnavailableDesc'),
          action: {
            label: t('auth.enableDemoMode'),
            onClick: () => {
              setDemoMode(true);
              navigate(next);
            },
          },
        });
      } else {
        toast.error(t('auth.couldNotSignIn'), {
          description: err instanceof Error ? err.message : t('auth.tryAgain'),
        });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell>
      <div className="text-center mb-7">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">{t('auth.welcomeBack')}</h1>
        <p className="text-sm text-fg-subtle">{t('auth.signInSubtitle')}</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="signin-email" className="block">
          <span className="text-xs font-medium text-fg-subtle mb-1.5 block">{t('auth.email')}</span>
          <Input
            id="signin-email"
            type="email"
            required
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leadingIcon={<Mail />}
            autoComplete="email"
          />
        </label>
        {!isForcedDemo && (
          <label htmlFor="signin-password" className="block">
            <span className="text-xs font-medium text-fg-subtle mb-1.5 block">
              {t('auth.password')}
            </span>
            <Input
              id="signin-password"
              type="password"
              required
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leadingIcon={<Lock />}
              autoComplete="current-password"
            />
          </label>
        )}
        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? t('auth.signingIn') : t('auth.continueWithEmail')}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[11px] text-fg-faint">
        <span className="flex-1 h-px bg-border" />
        <span>{t('auth.or')}</span>
        <span className="flex-1 h-px bg-border" />
      </div>

      <div className="space-y-2">
        <Button variant="outline" className="w-full" disabled>
          {t('auth.continueWithGoogle')}
        </Button>
        <Button variant="outline" className="w-full" disabled>
          {t('auth.continueWithSso')}
        </Button>
      </div>

      <p className="mt-7 text-center text-xs text-fg-subtle">
        {t('auth.newHere')}{' '}
        <Link to="/sign-up" className="text-fg underline underline-offset-2">
          {t('auth.createAccountLink')}
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-md mx-auto h-14 flex items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <BrandMark className="size-7" />
            <span className="text-[15px] font-semibold tracking-tight">Remote DevTools</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-fg-subtle hover:text-fg"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {t('nav.home')}
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-sm p-6 bg-surface-raised">{children}</Card>
      </main>
    </div>
  );
}
