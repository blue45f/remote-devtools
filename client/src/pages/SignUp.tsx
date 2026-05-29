import { Mail, User } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { useAppStore } from '@/lib/store';

import { AuthShell } from './SignIn';

/**
 * Sign-up scaffold. Captures form intent (plan from `?plan=`) and sends a
 * waitlist toast. Wire this to a real auth + waitlist API per LAUNCH.md.
 */
export default function SignUpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setDemoMode = useAppStore((s) => s.setDemoMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);

  const plan = params.get('plan') ?? 'free';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setTimeout(() => {
      setPending(false);
      toast.success(t('auth.onTheList'), {
        description: t('auth.onTheListDesc', { email, plan }),
      });
      // Drop the visitor into the demo so they can keep exploring.
      setDemoMode(true);
      navigate('/dashboard');
    }, 800);
  };

  return (
    <AuthShell>
      <div className="text-center mb-6">
        <Badge variant="accent" size="sm" className="mb-3 capitalize">
          {t('auth.planBadge', { plan })}
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">{t('auth.createWorkspace')}</h1>
        <p className="text-sm text-fg-subtle">{t('auth.waitlistSubtitle')}</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-fg-subtle mb-1.5 block">
            {t('auth.fullName')}
          </span>
          <Input
            type="text"
            required
            placeholder={t('auth.fullNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            leadingIcon={<User />}
            autoComplete="name"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-fg-subtle mb-1.5 block">
            {t('auth.workEmail')}
          </span>
          <Input
            type="email"
            required
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leadingIcon={<Mail />}
            autoComplete="email"
          />
        </label>
        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? t('auth.reservingSpot') : t('auth.joinWaitlist')}
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
