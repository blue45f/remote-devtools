import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Lock, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { AuthShell } from './SignIn';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { API_HOST } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { SUPPORT_URL } from '@/lib/policy';
import { useAppStore } from '@/lib/store';
import { useDocumentTitle } from '@/lib/use-document-title';

// Mirrors the previous native constraints: name `required`, email `required` +
// `type="email"`. Invalid input blocks the submit side-effects exactly as the
// browser bubbles used to, now surfaced inline via react-hook-form.
const signUpSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().min(1).email(),
  password: z.string().optional(),
  organizationName: z.string().trim().optional(),
});

type SignUpValues = z.infer<typeof signUpSchema>;

/**
 * Sign-up scaffold. Public demo builds still route to seed data; hosted SaaS
 * builds create the account, organization, and owner membership in one call.
 */
export default function SignUpPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('auth.createAccount'));
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setDemoMode = useAppStore((s) => s.setDemoMode);
  const { signIn } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '', organizationName: '' },
  });

  const plan = params.get('plan') ?? 'free';
  const isForcedDemo = import.meta.env.VITE_FORCE_DEMO === 'true';
  const [demoConsent, setDemoConsent] = useState({ terms: false, telemetry: false });
  const demoConsentReady = demoConsent.terms && demoConsent.telemetry;

  const submit = handleSubmit(({ email, name, organizationName, password }) => {
    if (!isForcedDemo) {
      return (async () => {
        if (!organizationName?.trim() || !password || password.length < 8) {
          throw new Error(t('auth.completeRequiredFields'));
        }
        const res = await fetch(`${API_HOST}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, organizationName, password }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) {
          const message = await res.text().catch(() => t('auth.signUpFailed'));
          throw new Error(message || `HTTP ${res.status}`);
        }
        const { token } = (await res.json()) as { token: string };
        signIn(token);
        toast.success(t('auth.workspaceCreated'));
        navigate('/dashboard');
      })().catch((error) => {
        toast.error(t('auth.couldNotSignUp'), {
          description: error instanceof Error ? error.message : t('auth.tryAgain'),
        });
      });
    }

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        toast.success(t('auth.onTheList'), {
          description: t('auth.onTheListDesc', { email, plan }),
        });
        // Drop the visitor into the demo so they can keep exploring.
        setDemoMode(true);
        navigate('/dashboard');
        resolve();
      }, 800);
    });
  });

  return (
    <AuthShell>
      <div className="text-center mb-6">
        <Badge variant="accent" size="sm" className="mb-3 capitalize">
          {t('auth.planBadge', { plan })}
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">{t('auth.createWorkspace')}</h1>
        <p className="text-sm text-fg-subtle">{t('auth.waitlistSubtitle')}</p>
      </div>

      <form onSubmit={submit} noValidate className="space-y-3">
        <label htmlFor="signup-name" className="block">
          <span className="text-xs font-medium text-fg-subtle mb-1.5 block">
            {t('auth.fullName')}
          </span>
          <Input
            id="signup-name"
            type="text"
            placeholder={t('auth.fullNamePlaceholder')}
            leadingIcon={<User />}
            autoComplete="name"
            aria-invalid={errors.name ? true : undefined}
            {...register('name')}
          />
        </label>
        <label htmlFor="signup-email" className="block">
          <span className="text-xs font-medium text-fg-subtle mb-1.5 block">
            {t('auth.workEmail')}
          </span>
          <Input
            id="signup-email"
            type="email"
            placeholder={t('auth.emailPlaceholder')}
            leadingIcon={<Mail />}
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            {...register('email')}
          />
        </label>
        {!isForcedDemo && (
          <>
            <label htmlFor="signup-organization" className="block">
              <span className="text-xs font-medium text-fg-subtle mb-1.5 block">
                {t('auth.organizationName')}
              </span>
              <Input
                id="signup-organization"
                type="text"
                placeholder={t('auth.organizationNamePlaceholder')}
                leadingIcon={<Building2 />}
                autoComplete="organization"
                required
                aria-invalid={errors.organizationName ? true : undefined}
                {...register('organizationName')}
              />
            </label>
            <label htmlFor="signup-password" className="block">
              <span className="text-xs font-medium text-fg-subtle mb-1.5 block">
                {t('auth.password')}
              </span>
              <Input
                id="signup-password"
                type="password"
                placeholder={t('auth.passwordPlaceholder')}
                leadingIcon={<Lock />}
                autoComplete="new-password"
                required
                aria-invalid={errors.password ? true : undefined}
                {...register('password')}
              />
            </label>
          </>
        )}
        {isForcedDemo && (
          <div className="rounded-xl border border-border bg-bg-muted/55 p-3 text-xs text-fg-subtle">
            <p className="mb-2 font-medium text-fg">{t('auth.demoChecklistTitle')}</p>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={demoConsent.terms}
                onChange={(event) =>
                  setDemoConsent((current) => ({ ...current, terms: event.target.checked }))
                }
                className="mt-0.5"
              />
              <span>{t('auth.demoChecklistSynthetic')}</span>
            </label>
            <label className="mt-2 flex items-start gap-2">
              <input
                type="checkbox"
                checked={demoConsent.telemetry}
                onChange={(event) =>
                  setDemoConsent((current) => ({ ...current, telemetry: event.target.checked }))
                }
                className="mt-0.5"
              />
              <span>
                {t('auth.demoChecklistReviewPrefix')}{' '}
                <Link to="/terms" className="underline underline-offset-2">
                  {t('auth.demoChecklistTerms')}
                </Link>
                ,{' '}
                <Link to="/privacy" className="underline underline-offset-2">
                  {t('auth.demoChecklistPrivacy')}
                </Link>
                ,{' '}
                <a
                  href={`${SUPPORT_URL}?category=site-inquiry`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  {t('auth.demoChecklistSupport')}
                </a>{' '}
                {t('auth.demoChecklistReviewSuffix')}
              </span>
            </label>
          </div>
        )}
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={isSubmitting || (isForcedDemo && !demoConsentReady)}
        >
          {isSubmitting
            ? isForcedDemo
              ? t('auth.reservingSpot')
              : t('auth.creatingAccount')
            : isForcedDemo
              ? t('auth.joinWaitlist')
              : t('auth.createAccount')}
        </Button>
      </form>

      <p className="mt-7 text-center text-xs text-fg-subtle">
        {t('auth.alreadyHaveAccount')}{' '}
        <Link to="/sign-in" className="text-fg underline underline-offset-2">
          {t('auth.signInLink')}
        </Link>
      </p>

      <p className="mt-4 text-center text-[11px] text-fg-faint">
        {t('auth.skipWaitPrefix')}{' '}
        <a
          href="https://github.com/blue45f/remote-devtools"
          target="_blank"
          rel="noreferrer"
          className="hover:text-fg-subtle underline-offset-2 hover:underline"
        >
          {t('auth.readyToSelfHost')}
        </a>
        .
      </p>
    </AuthShell>
  );
}
