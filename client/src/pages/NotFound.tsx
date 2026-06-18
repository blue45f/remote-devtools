import { ArrowLeft, Compass, Home, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { allNavItems } from '@/lib/nav';
import { useAppStore } from '@/lib/store';
import { useDocumentTitle } from '@/lib/use-document-title';

const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.userAgent);

/**
 * Cheap Levenshtein for ≤32-char paths. Used to surface the closest
 * known route as a "Did you mean?" hint on the 404 page.
 */
function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  let curr = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

export default function NotFound() {
  const { t } = useTranslation();
  useDocumentTitle(t('notFound.title'));
  const location = useLocation();
  const setCommandOpen = useAppStore((s) => s.setCommandOpen);

  // Surface the closest known route if the attempted path is "almost"
  // one of them — e.g. `/sesions` → `/sessions`. Threshold is ≤ 3 so we
  // don't suggest nonsense for genuinely random paths.
  const suggestion = useMemo(() => {
    const target = location.pathname.toLowerCase();
    if (!target || target === '/') return null;
    let best: { item: (typeof allNavItems)[number]; d: number } | null = null;
    for (const item of allNavItems) {
      const d = distance(target, item.to.toLowerCase());
      if (!best || d < best.d) best = { item, d };
    }
    return best && best.d <= 3 ? best.item : null;
  }, [location.pathname]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <div className="flex size-20 items-center justify-center rounded-3xl bg-bg-subtle border border-border">
          <Compass className="size-9 text-fg-subtle" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-[0.2em] font-semibold text-fg-faint mb-3">
          <span className="h-px w-6 bg-border" />
          404
          <span className="h-px w-6 bg-border" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-fg mb-2">
          {t('notFound.title')}
        </h1>
        <p className="text-sm text-fg-subtle max-w-sm mb-1 mx-auto">{t('notFound.description')}</p>
        {location.pathname && location.pathname !== '/' && (
          <p
            className="text-[11px] text-fg-faint font-mono mb-5"
            data-testid="notfound-attempted-path"
          >
            {location.pathname}
          </p>
        )}

        {suggestion && (
          <div className="mb-5 text-sm text-fg-subtle">
            {t('notFound.didYouMean')}{' '}
            <Link
              to={suggestion.to}
              className="text-fg hover:underline underline-offset-2 font-medium"
              data-testid="notfound-suggestion"
            >
              {t(suggestion.labelKey)} ({suggestion.to})
            </Link>
            ?
          </div>
        )}

        <div className="flex items-center justify-center flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/sessions">
              <ArrowLeft />
              {t('notFound.allSessions')}
            </Link>
          </Button>
          <Button asChild variant="primary">
            <Link to="/dashboard">
              <Home />
              {t('sidebar.dashboard')}
            </Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => setCommandOpen(true)}
            data-testid="notfound-search"
          >
            <Search />
            {t('notFound.search')}
            <Kbd className="ml-1">{isMac ? '⌘' : 'Ctrl'}</Kbd>
            <Kbd>K</Kbd>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
