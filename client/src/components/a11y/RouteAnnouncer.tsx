import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

/**
 * SPA route-change a11y: announces the new page title through an aria-live
 * region, moves focus to the main landmark (#main-content — the same target as
 * the skip link), and scrolls to the top. The first render (a directly-opened
 * URL) is skipped, and the scroll honours prefers-reduced-motion.
 *
 * Each page sets its own title via `useDocumentTitle`, so we read `document.title`
 * one frame later (rAF) to pick up the freshly applied value.
 */
export function RouteAnnouncer() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const isFirstRef = useRef(true);

  useEffect(() => {
    if (isFirstRef.current) {
      isFirstRef.current = false;
      return;
    }

    const frame = requestAnimationFrame(() => {
      setMessage(t('a11y.navigatedTo', { title: document.title }));

      document.getElementById('main-content')?.focus({ preventScroll: true });

      const prefersReducedMotion = globalThis.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      globalThis.scrollTo({ top: 0, left: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });

    return () => cancelAnimationFrame(frame);
  }, [pathname, t]);

  return (
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </p>
  );
}
