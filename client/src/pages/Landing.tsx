import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  CircuitBoard,
  Code2,
  Copy,
  PlayCircle,
  Radio,
  ServerCog,
  Sparkles,
  TerminalSquare,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import type { ComponentType } from 'react';

import { SkipLink } from '@/components/a11y/SkipLink';
import { BrandMark } from '@/components/Brand';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Kbd } from '@/components/ui/kbd';
import { Reveal } from '@/components/ui/reveal';
import { Toaster, toast } from '@/components/ui/toaster';
import { SUPPORT_URL } from '@/lib/policy';
import { applyTheme, useAppStore } from '@/lib/store';
import { useDocumentTitle } from '@/lib/use-document-title';
import { cn } from '@/lib/utils';

/** GitHub mark — kept as inline SVG since lucide-react v1+ dropped brand icons. */
function Github({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18.91-.25 1.89-.38 2.86-.38.97 0 1.95.13 2.86.38 2.18-1.49 3.14-1.18 3.14-1.18.62 1.59.23 2.76.11 3.05.73.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.07.78 2.16v3.21c0 .31.21.68.79.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

const GITHUB_URL = 'https://github.com/blue45f/remote-devtools';

export default function LandingPage() {
  useDocumentTitle();
  const navigate = useNavigate();
  const setDemoMode = useAppStore((s) => s.setDemoMode);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  // Landing is the only public route — make sure the dark class follows the
  // saved theme even before the rest of the app shell mounts.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const enterDemo = useCallback(() => {
    setDemoMode(true);
    navigate('/dashboard');
  }, [setDemoMode, navigate]);

  // Public-route shortcuts: the landing teaches the in-app hotkeys, so it
  // should honour the headline one. `D` opens the demo; `G` then `S` jumps to
  // sessions. Kept local (the app shell's useGlobalShortcuts only mounts inside
  // the authenticated Layout) and inert while typing or with modifiers held.
  useEffect(() => {
    let pendingG = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clearPending = () => {
      pendingG = false;
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const isEditable = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      (el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        el.isContentEditable);

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isEditable(e.target)) return;
      const key = e.key.toLowerCase();
      if (pendingG) {
        clearPending();
        if (key === 's') {
          e.preventDefault();
          setDemoMode(true);
          navigate('/sessions');
        } else if (key === 'd') {
          e.preventDefault();
          enterDemo();
        }
        return;
      }
      if (key === 'g') {
        pendingG = true;
        timer = setTimeout(clearPending, 900);
        return;
      }
      if (key === 'd') {
        e.preventDefault();
        enterDemo();
      }
    };
    globalThis.addEventListener('keydown', onKey);
    return () => {
      globalThis.removeEventListener('keydown', onKey);
      clearPending();
    };
  }, [enterDemo, navigate, setDemoMode]);

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col">
      <SkipLink />
      <TopNav onTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Hero onEnterDemo={enterDemo} />
        <DashboardMockup />
        <StatsStrip />
        <Features />
        <TechnicalDeepDive />
        <QuickStart />
        <ClosingCta onEnterDemo={enterDemo} />
      </main>

      <SiteFooter />
      {/* The public route renders outside the app shell, so it carries its own
          toast outlet for the quick-start copy confirmation. */}
      <Toaster />
    </div>
  );
}

/* ───────── Scroll progress ───────── */

/**
 * A 2px ink rail under the sticky header that fills with scroll depth. It is a
 * wayfinding cue (how far through the page am I), not decoration, and it never
 * animates layout — only `scaleX` on the GPU.
 */
function ScrollProgress() {
  const prefersReducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(1, el.scrollTop / max) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    globalThis.addEventListener('scroll', onScroll, { passive: true });
    globalThis.addEventListener('resize', onScroll, { passive: true });
    return () => {
      globalThis.removeEventListener('scroll', onScroll);
      globalThis.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (prefersReducedMotion) return null;

  return (
    <div aria-hidden className="absolute inset-x-0 bottom-0 h-px overflow-hidden">
      <div
        className="h-full w-full origin-left bg-fg"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}

/* ───────── Top nav ───────── */

function TopNav({ onTheme }: { onTheme: () => void }) {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-xl safe-pt">
      <div className="max-w-6xl mx-auto h-14 flex items-center gap-2 sm:gap-3 lg:gap-4 px-3 sm:px-4 lg:px-6">
        <Link
          to="/"
          className="group flex items-center gap-2 sm:gap-2.5 select-none min-w-0"
          aria-label="Remote DevTools"
        >
          <BrandMark className="size-7 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-105" />
          <span className="text-[14px] sm:text-[15px] font-semibold tracking-tight truncate">
            Remote DevTools
          </span>
        </Link>

        {/* The bar never wraps (fixed h-14), and the nav appears exactly at
            md where the row is at capacity. Gaps stay tight until lg and the
            labels are nowrap so they can't fold to two lines; under pressure
            the brand name (min-w-0 + truncate) gives way first. */}
        <nav className="hidden md:flex items-center gap-x-3 lg:gap-x-5 ml-2 text-sm text-fg-subtle whitespace-nowrap">
          {[
            { href: '#features', label: t('landing.navFeatures') },
            { href: '#architecture', label: t('landing.navArchitecture') },
            { href: '#quickstart', label: t('landing.navQuickStart') },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="relative py-1 transition-colors hover:text-fg after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-fg after:transition-transform after:duration-200 after:ease-[cubic-bezier(0.16,1,0.3,1)] hover:after:scale-x-100"
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/pricing"
            className="relative py-1 transition-colors hover:text-fg after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-fg after:transition-transform after:duration-200 after:ease-[cubic-bezier(0.16,1,0.3,1)] hover:after:scale-x-100"
          >
            {t('nav.pricing')}
          </Link>
          <a
            href={GITHUB_URL}
            className="relative py-1 transition-colors hover:text-fg after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-fg after:transition-transform after:duration-200 after:ease-[cubic-bezier(0.16,1,0.3,1)] hover:after:scale-x-100"
          >
            GitHub
          </a>
        </nav>

        <div className="flex-1" />

        <button
          type="button"
          onClick={onTheme}
          className="hidden sm:inline text-xs text-fg-subtle hover:text-fg px-2 py-1"
        >
          {t('sidebar.theme')}
        </button>

        {/* GitHub button collapses to an icon on phones to keep the
            primary CTA visible at 320px viewports */}
        <Button asChild variant="ghost" size="sm" aria-label={t('landing.githubRepoAria')}>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            <Github />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </Button>
        <Button asChild variant="primary" size="sm">
          <Link to="/dashboard">
            <span className="hidden xs:inline sm:inline">{t('landing.openApp')}</span>
            <span className="xs:hidden sm:hidden">{t('landing.openShort')}</span>
            <ArrowRight />
          </Link>
        </Button>
      </div>
      <ScrollProgress />
    </header>
  );
}

/* ───────── Hero ───────── */

function Hero({ onEnterDemo }: { onEnterDemo: () => void }) {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden">
      <BackgroundGrid />

      <div className="relative max-w-5xl mx-auto px-4 lg:px-6 pt-20 pb-16 lg:pt-32 lg:pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Badge variant="accent" size="lg" className="mb-5 gap-1.5 inline-flex">
            <Sparkles className="size-3" />
            {t('landing.heroBadge')}
            <span
              aria-hidden
              className="ml-0.5 inline-block h-3 w-px translate-y-px bg-accent-soft-fg animate-caret-blink"
            />
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.025em] leading-[1.05] mb-5 text-balance"
        >
          {t('landing.heroTitle')}
          <br />
          <span className="text-fg-subtle">{t('landing.heroTitleAccent')}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-base sm:text-lg text-fg-subtle max-w-2xl mx-auto mb-8 text-balance"
        >
          {t('landing.heroDescription')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-col xs:flex-row sm:flex-row flex-wrap items-stretch xs:items-center sm:items-center justify-center gap-3 max-w-md xs:max-w-none sm:max-w-none mx-auto"
        >
          <Button
            variant="primary"
            size="lg"
            onClick={onEnterDemo}
            className="group w-full xs:w-auto sm:w-auto touch-target"
          >
            <PlayCircle />
            {t('landing.tryDemo')}
            <ArrowRight className="transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5" />
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full xs:w-auto sm:w-auto touch-target"
          >
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              <Github />
              {t('landing.viewOnGitHub')}
            </a>
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-fg-faint"
        >
          {t('landing.heroNote')}
          <span className="hidden sm:inline-flex items-center gap-1 text-fg-faint">
            <span className="text-border-strong">·</span>
            {t('landing.heroPressHint')}
            <Kbd>D</Kbd>
          </span>
        </motion.p>
      </div>
    </section>
  );
}

function BackgroundGrid() {
  // Operator identity: the hero leans on the hairline grid alone — no colored
  // glow. Color is information in this product, so the landing must not spend
  // the accent hue on decoration. Depth comes from the hairline + radial mask,
  // and the one live element is a monochrome signal trace travelling the grid —
  // the product's "is this live" heartbeat, extended to the marketing surface.
  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      <div
        className="absolute inset-0 opacity-60 dark:opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 50%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 50%, transparent 100%)',
        }}
      />
      <svg
        className="absolute inset-x-0 top-0 h-72 w-full opacity-70 dark:opacity-40"
        preserveAspectRatio="none"
        viewBox="0 0 1200 288"
        fill="none"
        style={{
          maskImage: 'radial-gradient(ellipse 70% 90% at 50% 0%, #000 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 90% at 50% 0%, #000 30%, transparent 80%)',
        }}
      >
        <path
          d="M0,96 L360,96 L408,48 L600,48 L648,144 L840,144 L888,96 L1200,96"
          stroke="var(--fg)"
          strokeOpacity="0.18"
          strokeWidth="1.5"
          fill="none"
          className="animate-signal-trace"
        />
      </svg>
    </div>
  );
}

/* ───────── Dashboard mockup (under hero) ───────── */

/**
 * A miniature, statically-rendered version of the live Dashboard, scaled and
 * elevated to look like a captured screenshot. Pure SVG-ish HTML so it scales
 * cleanly on any DPI without shipping a real screenshot file. It rises into
 * view on scroll and lifts a hairline on hover — the "capture" settling onto
 * the page, then responding to the cursor.
 */
function DashboardMockup() {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  return (
    <section className="relative -mt-4 lg:-mt-8 pb-16 lg:pb-24 px-4 lg:px-6">
      <div
        aria-hidden
        className="absolute inset-x-0 -top-12 -z-10 h-64 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at 50% 50%, color-mix(in oklab, var(--accent) 10%, transparent), transparent 70%)',
        }}
      />
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 32, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        whileHover={prefersReducedMotion ? undefined : { y: -4 }}
        className="group relative max-w-5xl mx-auto"
      >
        <div className="rounded-xl border border-border bg-surface shadow-2xl overflow-hidden transition-[border-color,box-shadow] duration-300 group-hover:border-border-strong">
          {/* macOS-style traffic lights bar */}
          <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-border bg-bg-subtle">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-[11px] font-mono text-fg-faint">
              remote-devtools.vercel.app/dashboard
            </span>
            <span className="ml-auto text-[10px] text-fg-faint">{t('landing.mockDemoMode')}</span>
          </div>

          {/* Mock UI body — on phones we drop the sidebar entirely so the
              content gets the full mockup width (the page is small enough
              that a faux sidebar adds noise, not signal). */}
          <div className="grid grid-cols-1 sm:grid-cols-[148px_1fr] min-h-[280px] sm:min-h-[360px]">
            {/* Mini sidebar */}
            <aside className="border-r border-border bg-bg-subtle p-3 hidden sm:block">
              <div className="flex items-center gap-2 mb-4">
                <div className="size-5 rounded-md bg-fg" />
                <span className="text-xs font-semibold">Remote DevTools</span>
              </div>
              <div className="space-y-1">
                <div className="h-6 rounded-md bg-bg-muted px-2 flex items-center text-[11px] font-medium">
                  {t('sidebar.dashboard')}
                </div>
                <div className="h-6 rounded-md px-2 flex items-center text-[11px] text-fg-subtle">
                  {t('sidebar.sessions')}
                </div>
                <div className="h-6 rounded-md px-2 flex items-center text-[11px] text-fg-subtle">
                  {t('nav.moduleSdk')}
                </div>
                <div className="h-6 rounded-md px-2 flex items-center text-[11px] text-fg-subtle">
                  {t('nav.scriptSdk')}
                </div>
              </div>
            </aside>

            {/* Mini main content */}
            <div className="p-3.5 sm:p-5">
              {/* Decorative label inside the hero's product mockup, not a
                  document heading — a real <h3> here skips <h2> after the page
                  <h1> and breaks heading order (WCAG 1.3.1). */}
              <div className="text-base sm:text-lg font-semibold mb-3">{t('dashboard.title')}</div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <MockTile label={t('landing.mockLiveNow')} value="2" tone="live" />
                <MockTile label={t('landing.mockSessionsToday')} value="142" tone="up" />
                <MockTile label={t('landing.mockTicketsToday')} value="23" tone="up" />
              </div>
              {/* Tiny faux chart */}
              <div className="rounded-lg border border-border p-3 mb-3 bg-bg-subtle">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[11px] font-semibold">
                    {t('dashboard.sessionsOverTime')}
                  </span>
                  <span className="text-[10px] text-fg-faint">{t('dashboard.periodDaily')}</span>
                </div>
                <svg
                  viewBox="0 0 280 60"
                  className="w-full h-12"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="mockg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--fg)" stopOpacity="0.16" />
                      <stop offset="100%" stopColor="var(--fg)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,42 L20,38 L40,40 L60,30 L80,28 L100,22 L120,30 L140,18 L160,24 L180,16 L200,12 L220,16 L240,8 L260,14 L280,4 L280,60 L0,60 Z"
                    fill="url(#mockg)"
                  />
                  <path
                    d="M0,42 L20,38 L40,40 L60,30 L80,28 L100,22 L120,30 L140,18 L160,24 L180,16 L200,12 L220,16 L240,8 L260,14 L280,4"
                    stroke="var(--fg)"
                    strokeWidth="1.4"
                    fill="none"
                  />
                </svg>
              </div>
              {/* Activity feed mini */}
              <div className="rounded-lg border border-border p-3 bg-bg-subtle">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold">{t('activity.recentActivity')}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-50 animate-ping" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                    </span>
                    {t('sessions.badgeLive')}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { kind: t('landing.mockRecordedSession'), time: '12s' },
                    { kind: t('landing.mockTicketCreated'), time: '37s' },
                    { kind: t('landing.mockConsoleError'), time: '1m' },
                  ].map((row) => (
                    <div key={row.kind} className="flex items-center gap-2 text-[10px]">
                      <span className="size-1.5 rounded-full bg-fg-faint" />
                      <span className="font-medium truncate">{row.kind}</span>
                      <span className="text-fg-faint ml-auto">{row.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function MockTile({ label, value, tone }: { label: string; value: string; tone: 'live' | 'up' }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border bg-bg-subtle p-2.5">
      <div className="text-[9px] uppercase tracking-wider font-semibold text-fg-faint mb-0.5">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-base font-semibold tabular-nums">{value}</span>
        {tone === 'live' && (
          <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider px-1 rounded bg-live-soft text-live-soft-fg">
            <span className="size-1 rounded-full bg-live animate-pulse-dot" />
            {t('sessions.badgeRec')}
          </span>
        )}
        {tone === 'up' && <span className="text-[9px] font-semibold text-success">↑ 20%</span>}
      </div>
    </div>
  );
}

/* ───────── Stats stripe ───────── */

/**
 * Numeric stats count up the first time the strip scrolls into view — a real
 * "tallying the dataset" beat rather than a static figure. Non-numeric stats
 * (rrweb v2, MIT) just reveal. The whole strip is silenced under reduced
 * motion via AnimatedNumber + Reveal.
 */
function StatsStrip() {
  const { t } = useTranslation();
  const stats: { value: string; label: string; count?: number; suffix?: string }[] = [
    { value: '8.4k+', label: t('landing.stat1Label'), count: 8.4, suffix: 'k+' },
    { value: 'rrweb v2', label: t('landing.stat2Label') },
    { value: 'MIT', label: t('landing.stat3Label') },
    { value: '0 DB', label: t('landing.stat4Label') },
  ];
  return (
    <section className="border-y border-border bg-bg-subtle">
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-7 grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <Reveal key={s.value} delay={i * 0.06}>
            <div className="text-2xl lg:text-3xl font-semibold tracking-[-0.02em] tabular-nums">
              {s.count != null ? (
                <CountUpOnView value={s.count} suffix={s.suffix} fallback={s.value} />
              ) : (
                s.value
              )}
            </div>
            <div className="mt-1 text-[11px] text-fg-faint leading-tight">{s.label}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** Counts up to `value` once it scrolls into view; renders `fallback` verbatim
 *  under reduced motion so the figure is always correct and never blank. */
function CountUpOnView({
  value,
  suffix = '',
  fallback,
}: {
  value: number;
  suffix?: string;
  fallback: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [active, setActive] = useState(false);

  if (prefersReducedMotion) return <>{fallback}</>;

  return (
    <motion.span
      onViewportEnter={() => setActive(true)}
      viewport={{ once: true, amount: 0.6 }}
      className="inline-flex items-baseline"
    >
      <AnimatedNumber
        value={active ? value : 0}
        duration={1100}
        format={(n) => n.toFixed(1)}
        className="tabular-nums"
      />
      {suffix}
    </motion.span>
  );
}

/* ───────── Features ───────── */

const FEATURES: {
  icon: ComponentType<{ className?: string }>;
  /** i18n key under `landing` for the feature title. */
  titleKey: string;
  /** i18n key under `landing` for the feature body. */
  bodyKey: string;
}[] = [
  { icon: Radio, titleKey: 'featureLiveCaptureTitle', bodyKey: 'featureLiveCaptureBody' },
  { icon: PlayCircle, titleKey: 'featureReplayTitle', bodyKey: 'featureReplayBody' },
  { icon: Activity, titleKey: 'featureActivityTitle', bodyKey: 'featureActivityBody' },
  { icon: Code2, titleKey: 'featureSdkTitle', bodyKey: 'featureSdkBody' },
  { icon: TerminalSquare, titleKey: 'featureDevToolsTitle', bodyKey: 'featureDevToolsBody' },
  { icon: ServerCog, titleKey: 'featureSelfHostTitle', bodyKey: 'featureSelfHostBody' },
];

function Features() {
  const { t } = useTranslation();
  return (
    <section id="features" className="py-20 lg:py-28">
      <div className="max-w-6xl mx-auto px-4 lg:px-6">
        <Reveal className="max-w-2xl mb-10 lg:mb-14">
          <Badge variant="neutral" size="sm" className="mb-3 uppercase tracking-wider">
            {t('landing.featuresBadge')}
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight mb-3">
            {t('landing.featuresHeading')}
          </h2>
          <p className="text-fg-subtle">{t('landing.featuresLead')}</p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.titleKey} delay={(i % 3) * 0.06}>
              <Card className="group h-full p-5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong">
                <div className="mb-3 flex size-9 items-center justify-center rounded-lg border border-border bg-bg-muted transition-colors duration-200 group-hover:border-border-strong group-hover:bg-bg">
                  <f.icon className="size-4 text-fg-subtle transition-colors duration-200 group-hover:text-fg" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{t(`landing.${f.titleKey}`)}</h3>
                <p className="text-sm text-fg-subtle leading-relaxed">
                  {t(`landing.${f.bodyKey}`)}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Quick start ───────── */

const SNIPPETS: Record<string, string> = {
  Module: `import { createDebugger } from "remote-debug-sdk";

createDebugger();
// SDK now mirrors DOM, network, and console traffic
// to ws://localhost:3001 (configurable)`,
  Script: `<script
  src="https://cdn.your-domain/sdk/index.umd.js"
  onload="globalThis.RemoteDebugSdk.createDebugger()"
></script>`,
  Docker: `git clone https://github.com/blue45f/remote-devtools
cd remote-devtools
docker-compose up

# UI:           http://localhost:8080
# Internal API: http://localhost:3000
# External API: http://localhost:3001`,
};

/* ───────── Technical Deep Dive & Architecture ───────── */

function TechnicalDeepDive() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'sdk' | 'gateway' | 'internal' | 'client'>('sdk');

  const tabs = [
    {
      id: 'sdk' as const,
      label: t('landing.archTabSdk'),
      title: t('landing.archTabSdkTitle'),
      subtitle: 'Browser Client',
      desc: t('landing.archTabSdkDesc'),
      bullets: [
        t('landing.archTabSdkBullet1'),
        t('landing.archTabSdkBullet2'),
        t('landing.archTabSdkBullet3'),
        t('landing.archTabSdkBullet4'),
      ],
      techs: ['rrweb v2', 'MutationObserver', 'Monkeypatching', 'TypeScript'],
      icon: Code2,
    },
    {
      id: 'gateway' as const,
      label: t('landing.archTabGateway'),
      title: t('landing.archTabGatewayTitle'),
      subtitle: 'Port 3001',
      desc: t('landing.archTabGatewayDesc'),
      bullets: [
        t('landing.archTabGatewayBullet1'),
        t('landing.archTabGatewayBullet2'),
        t('landing.archTabGatewayBullet3'),
        t('landing.archTabGatewayBullet4'),
      ],
      techs: ['NestJS 11', 'WebSockets', '@nestjs/throttler', 'AWS S3'],
      icon: Radio,
    },
    {
      id: 'internal' as const,
      label: t('landing.archTabInternal'),
      title: t('landing.archTabInternalTitle'),
      subtitle: 'Port 3000 & DB',
      desc: t('landing.archTabInternalDesc'),
      bullets: [
        t('landing.archTabInternalBullet1'),
        t('landing.archTabInternalBullet2'),
        t('landing.archTabInternalBullet3'),
        t('landing.archTabInternalBullet4'),
      ],
      techs: ['NestJS 11', 'PostgreSQL', 'TypeORM', 'OpenAPI / Swagger'],
      icon: ServerCog,
    },
    {
      id: 'client' as const,
      label: t('landing.archTabClient'),
      title: t('landing.archTabClientTitle'),
      subtitle: 'Port 8080',
      desc: t('landing.archTabClientDesc'),
      bullets: [
        t('landing.archTabClientBullet1'),
        t('landing.archTabClientBullet2'),
        t('landing.archTabClientBullet3'),
        t('landing.archTabClientBullet4'),
      ],
      techs: ['React 19', 'Chromium DevTools UI', 'rrweb-player', 'Radix UI'],
      icon: TerminalSquare,
    },
  ];

  const current = tabs.find((x) => x.id === activeTab) || tabs[0];

  return (
    <section id="architecture" className="py-20 lg:py-28 border-t border-border bg-bg">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes archDash {
          to {
            stroke-dashoffset: -28;
          }
        }
        .animate-dash {
          animation: archDash 1.2s linear infinite;
        }
      `,
        }}
      />

      <div className="max-w-6xl mx-auto px-4 lg:px-6">
        <Reveal className="max-w-2xl mb-12">
          <Badge variant="accent" size="sm" className="mb-3 uppercase tracking-wider">
            {t('landing.archBadge')}
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight mb-3">
            {t('landing.archTitle')}
          </h2>
          <p className="text-fg-subtle">{t('landing.archSubtitle')}</p>
        </Reveal>

        {/* Node Flow Map */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-1">
            {tabs.map((tab, idx) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <div
                  key={tab.id}
                  className="flex flex-col lg:flex-row flex-1 items-stretch lg:items-center"
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex-1 text-left p-5 rounded-xl border transition-all duration-300 select-none cursor-pointer outline-none relative overflow-hidden active:scale-[0.99]',
                      isSelected
                        ? 'border-accent bg-accent-soft/20 dark:bg-accent-soft/5 shadow-md'
                        : 'border-border bg-surface hover:border-border-strong hover:bg-bg-subtle hover:-translate-y-0.5',
                    )}
                  >
                    {/* Glowing highlight indicator */}
                    {isSelected && <div className="absolute top-0 left-0 w-1 h-full bg-accent" />}

                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'size-10 rounded-lg border flex items-center justify-center shrink-0 transition-colors',
                          isSelected
                            ? 'bg-accent text-accent-fg border-accent'
                            : 'bg-bg-muted text-fg-subtle border-border',
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase font-mono tracking-wider text-fg-faint">
                          {tab.subtitle}
                        </div>
                        <h3 className="text-sm font-semibold truncate mt-0.5">{tab.label}</h3>
                      </div>
                    </div>
                  </button>

                  {/* Connectors */}
                  {idx < tabs.length - 1 && (
                    <>
                      <DesktopConnector
                        isActive={activeTab === tab.id || activeTab === tabs[idx + 1].id}
                      />
                      <MobileConnector
                        isActive={activeTab === tab.id || activeTab === tabs[idx + 1].id}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Tab Details */}
        <div className="rounded-xl border border-border bg-surface shadow-xs overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-bg-subtle">
            <span className="size-2 rounded-full bg-[#ff5f57]" />
            <span className="size-2 rounded-full bg-[#febc2e]" />
            <span className="size-2 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-[11px] font-mono text-fg-faint uppercase tracking-wider">
              Technical Specification
            </span>
          </div>

          <div className="p-6 lg:p-8">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 lg:grid-cols-[1fr_1.8fr] gap-8 lg:gap-12"
            >
              {/* Left Column: Tech Stack & Overview */}
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{current.title}</h3>
                  <p className="text-sm text-fg-subtle leading-relaxed">{current.desc}</p>
                </div>

                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-fg-faint mb-3">
                    Core Technologies
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {current.techs.map((tech) => (
                      <span
                        key={tech}
                        className="px-2.5 py-1 rounded bg-bg-muted border border-border text-xs font-medium font-mono text-fg-subtle"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Detailed Bullets (Seminar style) */}
              <div className="border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-8 flex flex-col gap-4">
                <h4 className="text-xs font-mono uppercase tracking-wider text-fg-faint mb-1 lg:mb-2">
                  Technical Breakdown
                </h4>
                <div className="space-y-4">
                  {current.bullets.map((bullet, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="size-5 rounded-full bg-success-soft text-success border border-success/10 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="size-3.5" />
                      </div>
                      <div className="text-sm leading-relaxed text-fg-subtle">{bullet}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DesktopConnector({ isActive }: { isActive: boolean }) {
  return (
    <div className="hidden lg:flex flex-1 items-center justify-center min-w-[32px] max-w-[80px]">
      <svg viewBox="0 0 60 20" className="w-full h-5 overflow-visible" fill="none">
        <path
          d="M0,10 L60,10"
          stroke="var(--border-strong)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <path
          d="M0,10 L60,10"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeDasharray="8 6"
          className={cn(
            'opacity-0 transition-opacity duration-300',
            isActive && 'opacity-100 animate-dash',
          )}
        />
        <polygon
          points="54,7 60,10 54,13"
          fill={isActive ? 'var(--accent)' : 'var(--border-strong)'}
          className="transition-colors duration-300"
        />
      </svg>
    </div>
  );
}

function MobileConnector({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex lg:hidden justify-center py-2">
      <svg viewBox="0 0 20 40" className="w-5 h-10 overflow-visible" fill="none">
        <path
          d="M10,0 L10,40"
          stroke="var(--border-strong)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <path
          d="M10,0 L10,40"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeDasharray="8 6"
          className={cn(
            'opacity-0 transition-opacity duration-300',
            isActive && 'opacity-100 animate-dash',
          )}
        />
        <polygon
          points="7,34 10,40 13,34"
          fill={isActive ? 'var(--accent)' : 'var(--border-strong)'}
          className="transition-colors duration-300"
        />
      </svg>
    </div>
  );
}

function QuickStart() {
  const { t } = useTranslation();
  const [active, setActive] = useState<keyof typeof SNIPPETS>('Module');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SNIPPETS[active]);
      setCopied(true);
      toast(t('landing.copiedToast'), {
        description: t('landing.copiedToastDesc', { lang: active }),
      });
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast(t('landing.copyFailedToast'));
    }
  };

  return (
    <section id="quickstart" className="py-20 lg:py-28 border-y border-border bg-bg-subtle">
      <div className="max-w-5xl mx-auto px-4 lg:px-6">
        <Reveal className="max-w-2xl mb-8">
          <Badge variant="neutral" size="sm" className="mb-3 uppercase tracking-wider">
            {t('landing.quickStartBadge')}
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight mb-3">
            {t('landing.quickStartHeading')}
          </h2>
          <p className="text-fg-subtle">{t('landing.quickStartLead')}</p>
        </Reveal>

        <Reveal delay={0.08}>
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border bg-surface-raised px-2 py-1.5 gap-2">
              <div className="scroll-rail flex flex-1 min-w-0">
                {Object.keys(SNIPPETS).map((key) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setActive(key as keyof typeof SNIPPETS)}
                    className={cn(
                      'px-3 h-7 rounded-sm text-xs font-medium transition-colors shrink-0',
                      key === active ? 'bg-bg text-fg shadow-xs' : 'text-fg-subtle hover:text-fg',
                    )}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={copy}
                aria-label={copied ? t('common.copied') : t('common.copy')}
                className="inline-flex items-center gap-1.5 text-xs text-fg-subtle hover:text-fg px-2 py-1 rounded-md hover:bg-bg-muted transition-colors shrink-0 active:scale-[0.97]"
              >
                {copied ? (
                  <Check className="size-3.5 text-success" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copied ? t('common.copied') : t('common.copy')}
              </button>
            </div>
            <pre className="font-mono text-[12px] sm:text-[12.5px] leading-relaxed p-4 sm:p-5 text-fg-subtle overflow-x-auto">
              {SNIPPETS[active]}
            </pre>
          </Card>

          <div className="mt-5 flex items-center gap-2 text-xs text-fg-faint">
            <CircuitBoard className="size-3.5" />
            {t('landing.needGuide')}{' '}
            <a
              href={GITHUB_URL + '/blob/main/README.md'}
              className="underline-offset-2 hover:underline text-fg-subtle"
              target="_blank"
              rel="noreferrer"
            >
              README →
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────── Closing CTA ───────── */

function ClosingCta({ onEnterDemo }: { onEnterDemo: () => void }) {
  const { t } = useTranslation();
  return (
    <section className="py-24 lg:py-32 text-center relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 50% 60% at 50% 50%, color-mix(in oklab, var(--accent) 12%, transparent), transparent 70%)',
        }}
      />
      <Reveal className="max-w-3xl mx-auto px-4 lg:px-6">
        <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight mb-3">
          {t('landing.ctaHeading')}
        </h2>
        <p className="text-fg-subtle mb-7 max-w-xl mx-auto">{t('landing.ctaLead')}</p>
        <div className="flex flex-col xs:flex-row sm:flex-row flex-wrap items-stretch xs:items-center sm:items-center justify-center gap-3 max-w-md xs:max-w-none sm:max-w-none mx-auto">
          <Button
            variant="primary"
            size="lg"
            onClick={onEnterDemo}
            className="group w-full xs:w-auto sm:w-auto touch-target"
          >
            <PlayCircle />
            {t('landing.openTheDemo')}
            <ArrowRight className="transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5" />
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full xs:w-auto sm:w-auto touch-target"
          >
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              <Github />
              GitHub
            </a>
          </Button>
        </div>
        <ShortcutHints />
      </Reveal>
    </section>
  );
}

function ShortcutHints() {
  const { t } = useTranslation();
  return (
    <div className="mt-10 inline-flex items-center gap-3 text-[11px] text-fg-faint">
      <span className="inline-flex items-center gap-1.5">
        <Kbd>G</Kbd>
        <Kbd>D</Kbd>
        <span>{t('sidebar.dashboard')}</span>
      </span>
      <span className="text-border-strong">·</span>
      <span className="inline-flex items-center gap-1.5">
        <Kbd>G</Kbd>
        <Kbd>S</Kbd>
        <span>{t('sidebar.sessions')}</span>
      </span>
      <span className="text-border-strong">·</span>
      <span className="inline-flex items-center gap-1.5">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
        <span>{t('landing.commandPalette')}</span>
      </span>
    </div>
  );
}

/* ───────── Footer ───────── */

function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border py-8">
      <div className="max-w-6xl mx-auto px-4 lg:px-6 flex flex-wrap items-center gap-4 text-xs text-fg-faint">
        <div className="flex items-center gap-2">
          <BrandMark className="size-5" />
          <span>Remote DevTools</span>
        </div>
        <span>MIT</span>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-fg-subtle">
          GitHub
        </a>
        <Link to="/terms" className="hover:text-fg-subtle">
          {t('policy.termsLink')}
        </Link>
        <Link to="/privacy" className="hover:text-fg-subtle">
          {t('policy.privacyLink')}
        </Link>
        <a
          href={GITHUB_URL + '/blob/main/README.md'}
          target="_blank"
          rel="noreferrer"
          className="hover:text-fg-subtle"
        >
          {t('landing.docs')}
        </a>
        <Link to="/design" className="hover:text-fg-subtle">
          {t('landing.designSystem')}
        </Link>
        <a
          href={`${SUPPORT_URL}?category=site-inquiry`}
          target="_blank"
          rel="noreferrer"
          className="hover:text-fg-subtle"
        >
          {t('policy.supportLink')}
        </a>
        <span className="ml-auto">{t('landing.builtWith')}</span>
      </div>
    </footer>
  );
}
