import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { useAppStore } from '@/lib/store';

import { AuthShell } from './SignIn';

// Mirrors the previous native constraints: name `required`, email `required` +
// `type="email"`. Invalid input blocks the submit side-effects exactly as the
// browser bubbles used to, now surfaced inline via react-hook-form.
const signUpSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().min(1).email(),
});

type SignUpValues = z.infer<typeof signUpSchema>;

/**
 * Sign-up scaffold. Captures form intent (plan from `?plan=`) and sends a
 * waitlist toast. Wire this to a real auth + waitlist API per LAUNCH.md.
 */
export default function SignUpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setDemoMode = useAppStore((s) => s.setDemoMode);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '' },
  });

  const plan = params.get('plan') ?? 'free';
  const [demoConsent, setDemoConsent] = useState({ terms: false, telemetry: false });
  const demoConsentReady = demoConsent.terms && demoConsent.telemetry;

  const submit = handleSubmit(
    ({ email }) =>
      // Resolve after the simulated 800ms so `isSubmitting` keeps the button
      // disabled / in its "reserving spot" state for the same window as before.
      new Promise<void>((resolve) => {
        setTimeout(() => {
          toast.success(t('auth.onTheList'), {
            description: t('auth.onTheListDesc', { email, plan }),
          });
          // Drop the visitor into the demo so they can keep exploring.
          setDemoMode(true);
          navigate('/dashboard');
          resolve();
        }, 800);
      }),
  );

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
        <div className="rounded-xl border border-border bg-bg-muted/55 p-3 text-xs text-fg-subtle">
          <p className="mb-2 font-medium text-fg">Demo access checklist</p>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={demoConsent.terms}
              onChange={(event) =>
                setDemoConsent((current) => ({ ...current, terms: event.target.checked }))
              }
              className="mt-0.5"
            />
            <span>
              Replay data is synthetic in demo mode and should not be treated as production
              telemetry.
            </span>
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
              Self-hosted use requires reviewing auth, retention, and recording consent policies.
            </span>
          </label>
        </div>
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={isSubmitting || !demoConsentReady}
        >
          {isSubmitting ? t('auth.reservingSpot') : t('auth.joinWaitlist')}
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
