import { ChevronRight, Menu, Monitor, Moon, Search, Sparkles, Sun } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { allNavItems } from '@/lib/nav';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.userAgent);

interface Crumb {
  /** i18n key, resolved with t() at render. Preferred over the raw label. */
  labelKey?: string;
  /** Raw label for dynamic path segments (e.g. a session id) with no key. */
  label?: string;
  to?: string;
}

const segmentLabelKeys: Record<string, string> = {
  dashboard: 'sidebar.dashboard',
  sessions: 'sidebar.sessions',
  sandbox: 'sidebar.sandbox',
  module: 'nav.moduleSdk',
  script: 'nav.scriptSdk',
};

function buildCrumbs(pathname: string): Crumb[] {
  if (pathname === '/' || pathname === '') {
    return [{ labelKey: 'topbar.home' }];
  }

  const parts = pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [];

  // First segment: map to a nav item so the crumb is localized via its key.
  const first = `/${parts[0]}`;
  const navMatch = allNavItems.find((n) => n.to === first);
  const firstTo = parts.length > 1 ? first : undefined;
  crumbs.push(
    navMatch
      ? { labelKey: navMatch.labelKey, to: firstTo }
      : segmentLabelKeys[parts[0]]
        ? { labelKey: segmentLabelKeys[parts[0]], to: firstTo }
        : { label: prettify(parts[0]), to: firstTo },
  );

  for (let i = 1; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    const labelKey = segmentLabelKeys[parts[i]];
    crumbs.push({
      ...(labelKey ? { labelKey } : { label: prettify(parts[i]) }),
      to: isLast ? undefined : `/${parts.slice(0, i + 1).join('/')}`,
    });
  }

  return crumbs;
}

function prettify(slug: string) {
  if (/^\d+$/.test(slug)) return `#${slug}`;
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

export function Topbar() {
  const location = useLocation();
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const toggleCommand = useAppStore((s) => s.toggleCommand);
  const demoMode = useAppStore((s) => s.demoMode);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const { t } = useTranslation();

  // Cycle: light → dark → system → light. GitHub / Vercel pattern.
  const cycleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light');
  };
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const themeLabel =
    theme === 'light'
      ? t('topbar.themeLight')
      : theme === 'dark'
        ? t('topbar.themeDark')
        : t('topbar.themeSystem');

  const crumbs = useMemo(() => buildCrumbs(location.pathname), [location.pathname]);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex items-center gap-1.5 sm:gap-2',
        'h-14 px-2 sm:px-3 lg:px-5 safe-pt',
        'border-b border-border bg-bg/80 backdrop-blur-xl',
      )}
    >
      {/* Mobile sidebar trigger — full 44×44 touch target on phones */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden touch-target"
        onClick={() => setSidebarOpen(true)}
        aria-label={t('topbar.openNavigation')}
      >
        <Menu />
      </Button>

      {/* Breadcrumb — non-leaf crumbs collapse on phones so only the
          current page is shown; the trail re-expands at `sm`. The crumbs
          themselves stay in the DOM so a11y traversal & tests still see
          them. */}
      <nav
        className="flex items-center gap-1 text-sm min-w-0 flex-1 sm:flex-initial"
        aria-label={t('topbar.breadcrumb')}
      >
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          const isLeaf = isLast;
          return (
            <div
              key={idx}
              className={cn('flex items-center gap-1 min-w-0', !isLeaf && 'hidden sm:flex')}
            >
              {idx > 0 && (
                <ChevronRight className="size-3.5 text-fg-faint shrink-0 hidden sm:block" />
              )}
              {crumb.to && !isLast ? (
                <Link
                  to={crumb.to}
                  className="text-fg-subtle hover:text-fg transition-colors truncate"
                >
                  {crumb.labelKey ? t(crumb.labelKey) : crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={cn('truncate', isLast ? 'text-fg font-medium' : 'text-fg-subtle')}
                >
                  {crumb.labelKey ? t(crumb.labelKey) : crumb.label}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      <div className="hidden sm:block flex-1" />

      {demoMode && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="accent"
              className="gap-1 cursor-help shrink-0 hidden xs:inline-flex sm:inline-flex"
              data-testid="demo-mode-badge"
            >
              <Sparkles className="size-3" />
              <span className="hidden sm:inline">{t('topbar.demoMode')}</span>
              <span className="sm:hidden">{t('topbar.demoMode')}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('topbar.demoModeTooltip')}</TooltipContent>
        </Tooltip>
      )}

      {/* Theme quick toggle — desktop only; on mobile the Sidebar's
          theme menu and CommandPalette cover this. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={cycleTheme}
            className={cn(
              'hidden lg:inline-flex items-center justify-center size-8 rounded-md shrink-0',
              'border border-border bg-surface text-fg-subtle',
              'hover:border-border-strong hover:text-fg transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            aria-label={themeLabel}
            data-testid="topbar-theme-toggle"
          >
            <ThemeIcon className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{themeLabel}</TooltipContent>
      </Tooltip>

      {/* Search trigger — full pill on tablet+, icon-only on phone */}
      <button
        type="button"
        onClick={toggleCommand}
        className={cn(
          'group flex items-center justify-center gap-2 rounded-md shrink-0',
          'h-9 w-9 sm:h-8 sm:w-auto sm:pl-2.5 sm:pr-2 touch-target',
          'border border-border bg-surface text-sm text-fg-faint',
          'hover:border-border-strong hover:text-fg-subtle transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        title={t('topbar.openCommandPalette')}
        aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
      >
        <Search className="size-4 sm:size-3.5" aria-hidden />
        {/* Visible label on tablet+, an sr-only equivalent on phone so the
            icon-only button still has an accessible name. The accessible name
            mirrors the visible text (WCAG 2.5.3); the shortcut is exposed via
            aria-keyshortcuts rather than the decorative kbd hints. */}
        <span className="sr-only sm:hidden">{t('topbar.search')}</span>
        <span className="hidden sm:inline pr-3">{t('topbar.search')}</span>
        <Kbd className="hidden sm:inline-flex" aria-hidden>
          {isMac ? '⌘' : 'Ctrl'}
        </Kbd>
        <Kbd className="hidden sm:inline-flex" aria-hidden>
          K
        </Kbd>
      </button>
    </header>
  );
}
