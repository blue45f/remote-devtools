import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, ChevronDown, Search as SearchIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { SkipLink } from '@/components/a11y/SkipLink';
import { Brand } from '@/components/Brand';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { useDocumentTitle } from '@/lib/use-document-title';
import { cn } from '@/lib/utils';

interface BillingStatus {
  enabled: boolean;
  plans?: Array<{ id: string; name: string; monthly: number }>;
}

const GITHUB_URL = 'https://github.com/blue45f/remote-devtools';

interface Plan {
  /** i18n key under `pricing` for the plan name. */
  nameKey: string;
  price: string;
  /** i18n key under `pricing` for the billing cadence, if any. */
  cadenceKey?: string;
  /** i18n key under `pricing` for the plan description. */
  descriptionKey: string;
  /**
   * i18n key under `pricing` for the CTA. When `comingSoon` is set this is the
   * placeholder label, swapped for `pricing.getStarted` once billing is live.
   */
  ctaKey: string;
  /** Plans gated behind the hosted-billing waitlist show "Coming soon" until enabled. */
  comingSoon?: boolean;
  href: string;
  highlight?: boolean;
  /** i18n keys under `pricing` for each feature bullet. */
  featureKeys: string[];
  /** i18n key under `pricing` for the footnote, if any. */
  footnoteKey?: string;
}

const PLANS: Plan[] = [
  {
    nameKey: 'planSelfHostedName',
    price: '$0',
    cadenceKey: 'cadenceForever',
    descriptionKey: 'planSelfHostedDesc',
    ctaKey: 'readDocs',
    href: GITHUB_URL + '/blob/main/docs/SELF_HOSTING.md',
    featureKeys: [
      'planSelfHostedFeature1',
      'planSelfHostedFeature2',
      'planSelfHostedFeature3',
      'planSelfHostedFeature4',
      'planSelfHostedFeature5',
    ],
    footnoteKey: 'planSelfHostedFootnote',
  },
  {
    nameKey: 'planStarterName',
    price: '$29',
    cadenceKey: 'cadenceTeamMonth',
    descriptionKey: 'planStarterDesc',
    ctaKey: 'comingSoon',
    comingSoon: true,
    href: '/sign-up?plan=starter',
    highlight: true,
    featureKeys: [
      'planStarterFeature1',
      'planStarterFeature2',
      'planStarterFeature3',
      'planStarterFeature4',
      'planStarterFeature5',
      'planStarterFeature6',
    ],
    footnoteKey: 'planHostedFootnote',
  },
  {
    nameKey: 'planProName',
    price: '$99',
    cadenceKey: 'cadenceTeamMonth',
    descriptionKey: 'planProDesc',
    ctaKey: 'comingSoon',
    comingSoon: true,
    href: '/sign-up?plan=pro',
    featureKeys: [
      'planProFeature1',
      'planProFeature2',
      'planProFeature3',
      'planProFeature4',
      'planProFeature5',
      'planProFeature6',
    ],
    footnoteKey: 'planHostedFootnote',
  },
];

export default function PricingPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('pricing.title'));
  // Probe the backend so we can adapt CTAs / show a status pill. The query
  // never throws — a missing/disabled backend just resolves to enabled:false.
  const { data: billing } = useQuery({
    queryKey: ['billing-status'],
    queryFn: () =>
      apiFetch<BillingStatus>('/api/billing/status').catch(
        () => ({ enabled: false }) as BillingStatus,
      ),
    staleTime: 60_000,
    retry: false,
  });
  const billingEnabled = billing?.enabled ?? false;

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col">
      <SkipLink />
      <header className="border-b border-border bg-bg/80 backdrop-blur-xl sticky top-0 z-30 safe-pt">
        <div className="max-w-6xl mx-auto h-14 flex items-center px-3 sm:px-4 lg:px-6 gap-2">
          <Link to="/" className="flex items-center gap-2 select-none min-w-0">
            <Brand collapsed />
            <span className="text-[14px] sm:text-[15px] font-semibold tracking-tight truncate">
              Remote DevTools
            </span>
          </Link>
          <div className="flex-1" />
          <nav className="hidden md:flex items-center gap-5 text-sm text-fg-subtle mr-3">
            <Link to="/" className="hover:text-fg">
              {t('nav.home')}
            </Link>
            <Link to="/pricing" className="text-fg">
              {t('nav.pricing')}
            </Link>
            <a href={GITHUB_URL} className="hover:text-fg">
              GitHub
            </a>
          </nav>
          <Button asChild variant="primary" size="sm">
            <Link to="/dashboard">
              <span className="hidden xs:inline sm:inline">{t('nav.openDemo')}</span>
              <span className="xs:hidden sm:hidden">{t('topbar.demoMode')}</span>
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 py-12 sm:py-20 lg:py-28 focus:outline-none"
      >
        <div className="max-w-6xl mx-auto safe-px">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <Badge variant="accent" size="md" className="mb-4">
              {t('pricing.badge')}
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-[-0.02em] mb-3 sm:mb-4 text-balance">
              {t('pricing.title')}
              <br />
              <span className="text-fg-subtle">{t('pricing.titleAccent')}</span>
            </h1>
            <p className="text-sm sm:text-base text-fg-subtle max-w-xl mx-auto text-balance">
              {t('pricing.subtitle')}
            </p>
          </div>

          <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
            {PLANS.map((plan, i) => {
              // When billing is wired up, flip "Coming soon" to a real CTA.
              const ctaLabel =
                billingEnabled && plan.comingSoon
                  ? t('pricing.getStarted')
                  : t(`pricing.${plan.ctaKey}`);
              return (
                <motion.div
                  key={plan.nameKey}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
                  className="h-full"
                >
                  <Card
                    className={cn(
                      'p-5 sm:p-6 h-full flex flex-col gap-4 sm:gap-5 relative',
                      plan.highlight && 'border-fg shadow-md',
                    )}
                  >
                    {plan.highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-fg text-bg text-[10px] font-semibold uppercase tracking-wider">
                        {t('pricing.mostPopular')}
                      </span>
                    )}
                    <div>
                      <h2 className="text-lg font-semibold">{t(`pricing.${plan.nameKey}`)}</h2>
                      <p className="text-xs text-fg-subtle mt-1">
                        {t(`pricing.${plan.descriptionKey}`)}
                      </p>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                      {plan.cadenceKey && (
                        <span className="text-xs text-fg-subtle">
                          / {t(`pricing.${plan.cadenceKey}`)}
                        </span>
                      )}
                    </div>
                    <Button
                      asChild
                      variant={plan.highlight ? 'primary' : 'outline'}
                      className="w-full touch-target"
                    >
                      {plan.href.startsWith('/') ? (
                        <Link to={plan.href}>{ctaLabel}</Link>
                      ) : (
                        <a href={plan.href} target="_blank" rel="noreferrer">
                          {ctaLabel}
                        </a>
                      )}
                    </Button>
                    <ul className="flex flex-col gap-2 text-sm">
                      {plan.featureKeys.map((fKey) => (
                        <li key={fKey} className="flex items-start gap-2 text-fg-subtle">
                          <Check className="size-4 text-fg-faint mt-0.5 shrink-0" />
                          <span>{t(`pricing.${fKey}`)}</span>
                        </li>
                      ))}
                    </ul>
                    {plan.footnoteKey && (
                      <p className="text-[11px] text-fg-faint mt-auto pt-2 border-t border-border">
                        {t(`pricing.${plan.footnoteKey}`)}
                      </p>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <Card className="mt-10 p-6 bg-bg-subtle">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-[280px]">
                <h2 className="text-sm font-semibold mb-1">{t('pricing.aboutHostedPlans')}</h2>
                <p className="text-xs text-fg-subtle leading-relaxed">
                  {t('pricing.aboutHostedDescPrefix')}{' '}
                  <a
                    href={GITHUB_URL + '/blob/main/docs/LAUNCH.md'}
                    className="underline-offset-2 hover:underline text-fg-subtle hover:text-fg"
                    target="_blank"
                    rel="noreferrer"
                  >
                    LAUNCH.md
                  </a>{' '}
                  {t('pricing.aboutHostedDescSuffix')}
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/sign-up">
                  {t('auth.joinWaitlist')}
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </Card>

          <FAQ />
        </div>
      </main>

      <footer className="border-t border-border py-6 safe-pb">
        <div className="max-w-6xl mx-auto safe-px flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-fg-faint">
          <Link to="/" className="hover:text-fg-subtle">
            {t('nav.home')}
          </Link>
          <Link to="/pricing" className="hover:text-fg-subtle">
            {t('nav.pricing')}
          </Link>
          <a href={GITHUB_URL} className="hover:text-fg-subtle">
            GitHub
          </a>
          <a href={GITHUB_URL + '/blob/main/docs/SELF_HOSTING.md'} className="hover:text-fg-subtle">
            {t('devtools.selfHostDocs')}
          </a>
          <a href={GITHUB_URL + '/blob/main/docs/LAUNCH.md'} className="hover:text-fg-subtle">
            {t('pricing.roadmap')}
          </a>
          <span className="ml-auto">{t('pricing.footerNote')}</span>
        </div>
      </footer>
    </div>
  );
}

/** FAQ entries keyed into the `pricing` namespace; resolved at render. */
const FAQ_KEYS: { qKey: string; aKey: string }[] = [
  { qKey: 'faqDemoFreeQ', aKey: 'faqDemoFreeA' },
  { qKey: 'faqSelfVsStarterQ', aKey: 'faqSelfVsStarterA' },
  { qKey: 'faqLaunchQ', aKey: 'faqLaunchA' },
  { qKey: 'faqSwitchQ', aKey: 'faqSwitchA' },
  { qKey: 'faqVpnQ', aKey: 'faqVpnA' },
  { qKey: 'faqPrivacyQ', aKey: 'faqPrivacyA' },
];

function FAQ() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const faqs = useMemo(
    () => FAQ_KEYS.map((f) => ({ q: t(`pricing.${f.qKey}`), a: t(`pricing.${f.aKey}`) })),
    [t],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  }, [query, faqs]);

  return (
    <section className="mt-16">
      <div className="mb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <Badge variant="neutral" size="sm" className="mb-3 uppercase tracking-wider">
            FAQ
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">{t('pricing.commonQuestions')}</h2>
        </div>
        <div className="w-full sm:max-w-xs">
          <Input
            placeholder={t('pricing.searchFaq')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leadingIcon={<SearchIcon />}
            data-testid="faq-search"
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <Card className="p-6 text-center bg-bg-subtle">
          <p className="text-sm text-fg-subtle">
            {t('pricing.noMatchesPrefix')}{' '}
            <a
              href={GITHUB_URL + '/issues/new'}
              className="text-fg hover:underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              {t('pricing.githubIssues')}
            </a>
            {t('pricing.noMatchesSuffix')}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((item) => (
            <details
              key={item.q}
              className="group rounded-lg border border-border bg-surface px-4 py-3 open:bg-bg-subtle transition-colors"
            >
              <summary className="flex items-center justify-between cursor-pointer text-sm font-medium list-none">
                <span>{item.q}</span>
                <ChevronDown
                  aria-hidden
                  className="ml-3 size-4 shrink-0 text-fg-faint transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="mt-2 text-sm text-fg-subtle leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
