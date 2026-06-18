import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ExternalLink, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { SkipLink } from '@/components/a11y/SkipLink';
import { Brand } from '@/components/Brand';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { shortHash } from '@/lib/format';
import {
  POLICY_SLUGS,
  fetchPublicPolicy,
  parsePolicyBody,
  policyExternalUrl,
  type PolicySlug,
  type PublicPolicy,
} from '@/lib/policy';
import { useDocumentTitle } from '@/lib/use-document-title';

const GITHUB_URL = 'https://github.com/blue45f/remote-devtools';

/**
 * Legal document page (/terms, /privacy). Renders the centrally versioned
 * TermsDesk publication in-app instead of bouncing visitors to an external
 * host, and surfaces the version label, content hash and effective date as a
 * trust footer. On fetch failure it degrades to a card linking the canonical
 * TermsDesk page, so the document is always reachable.
 */
export default function PolicyPage({ slug }: { slug: PolicySlug }) {
  const { t } = useTranslation();
  const isTerms = slug === POLICY_SLUGS.terms;
  useDocumentTitle(isTerms ? t('policy.termsTitle') : t('policy.privacyTitle'));

  const {
    data: policy,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['public-policy', slug],
    queryFn: ({ signal }) => fetchPublicPolicy(slug, signal),
    staleTime: 5 * 60_000,
    // Retry policy comes from the QueryClient defaults (2 in the app).
    // The page renders its own fallback card — keep the global error toast quiet.
    meta: { suppressToast: true },
  });

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
            <Link to="/pricing" className="hover:text-fg">
              {t('nav.pricing')}
            </Link>
            <a href={GITHUB_URL} className="hover:text-fg">
              GitHub
            </a>
          </nav>
          <Button asChild variant="primary" size="sm">
            <Link to="/dashboard">
              {t('nav.openDemo')}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 py-10 sm:py-14 lg:py-16 focus:outline-none"
      >
        <article className="max-w-3xl mx-auto safe-px px-4">
          <Badge variant="accent" size="md" className="mb-4">
            {t('policy.badge')}
          </Badge>

          {isPending && <PolicySkeleton />}

          {isError && (
            <PolicyErrorCard
              slug={slug}
              title={isTerms ? t('policy.termsTitle') : t('policy.privacyTitle')}
              onRetry={() => void refetch()}
            />
          )}

          {policy && <PolicyArticle policy={policy} slug={slug} />}
        </article>
      </main>

      <footer className="border-t border-border py-6 safe-pb">
        <div className="max-w-6xl mx-auto safe-px px-4 flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-fg-faint">
          <Link to="/" className="hover:text-fg-subtle">
            {t('nav.home')}
          </Link>
          <Link to="/terms" className="hover:text-fg-subtle">
            {t('policy.termsLink')}
          </Link>
          <Link to="/privacy" className="hover:text-fg-subtle">
            {t('policy.privacyLink')}
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-fg-subtle">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

/* ───────── Pieces ───────── */

function PolicySkeleton() {
  return (
    <div data-testid="policy-skeleton" className="space-y-3" aria-hidden="true">
      <Skeleton className="h-9 w-3/5" />
      <Skeleton className="h-4 w-2/5" />
      <div className="pt-4 space-y-2.5">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className={i % 4 === 0 ? 'h-5 w-1/3 mt-4' : 'h-4 w-full'} />
        ))}
      </div>
    </div>
  );
}

function PolicyErrorCard({
  slug,
  title,
  onRetry,
}: {
  slug: PolicySlug;
  title: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card className="p-6 sm:p-8 text-center bg-bg-subtle" data-testid="policy-error">
      <h1 className="text-lg font-semibold tracking-tight mb-1">{title}</h1>
      <p className="text-sm text-fg-subtle mb-1">{t('policy.loadFailedTitle')}</p>
      <p className="text-xs text-fg-faint max-w-md mx-auto">{t('policy.loadFailedBody')}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
        <Button asChild variant="primary" size="sm">
          <a href={policyExternalUrl(slug)} target="_blank" rel="noreferrer">
            {t('policy.openExternal')}
            <ExternalLink />
          </a>
        </Button>
      </div>
    </Card>
  );
}

function PolicyArticle({ policy, slug }: { policy: PublicPolicy; slug: PolicySlug }) {
  const { t, i18n } = useTranslation();
  const blocks = parsePolicyBody(policy.body);
  const effectiveDate = formatPolicyDate(policy.effectiveAt, i18n.resolvedLanguage);

  return (
    <>
      {/* Document name is publication data, not UI chrome — render as-is. */}
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] mb-2">{policy.name}</h1>
      <p className="text-xs text-fg-subtle mb-8">
        {t('policy.effectiveAt', { date: effectiveDate })} · {policy.versionLabel}
      </p>

      <div>
        {blocks.map((block, i) => {
          if (block.type === 'heading') {
            return (
              <h2
                key={i}
                className="text-base font-semibold tracking-tight text-fg mt-8 first:mt-0 mb-2"
              >
                {block.text}
              </h2>
            );
          }
          if (block.type === 'list') {
            return (
              <ul
                key={i}
                className="list-disc pl-5 mb-4 space-y-1.5 text-sm text-fg-subtle leading-relaxed"
              >
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            );
          }
          return (
            <p key={i} className="text-sm text-fg-subtle leading-relaxed whitespace-pre-line mb-4">
              {block.text}
            </p>
          );
        })}
      </div>

      {/* Trust surface: version, integrity hash and effective date straight
          from the append-only registry, plus the canonical source link. */}
      <div
        data-testid="policy-trust"
        className="mt-10 pt-5 border-t border-border flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-faint"
      >
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          {t('policy.version', { label: policy.versionLabel })}
        </span>
        <span className="font-mono" title={policy.contentHash}>
          {t('policy.hashLabel')} {shortHash(policy.contentHash, 12)}
        </span>
        <span>{t('policy.effectiveAt', { date: effectiveDate })}</span>
        <a
          href={policyExternalUrl(slug)}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 hover:text-fg-subtle"
        >
          {t('policy.viewOnTermsDesk')}
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </div>
    </>
  );
}

/**
 * Locale-aware long date. Native Intl on purpose: `date-fns` is not a client
 * dependency and a single long-form date does not justify adding one.
 */
function formatPolicyDate(iso: string, language?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
