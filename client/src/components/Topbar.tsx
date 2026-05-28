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
  label: string;
  to?: string;
}

function buildCrumbs(pathname: string): Crumb[] {
  if (pathname === '/' || pathname === '') {
    return [{ label: 'Home' }];
  }

  const parts = pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [];

  // First segment: try to map to nav label
  const first = `/${parts[0]}`;
  const navMatch = allNavItems.find((n) => n.to === first);
  crumbs.push({
    label: navMatch?.label ?? prettify(parts[0]),
    to: parts.length > 1 ? first : undefined,
  });

  for (let i = 1; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    crumbs.push({
      label: prettify(parts[i]),
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
      ? 'Light theme · switch to dark'
      : theme === 'dark'
        ? 'Dark theme · switch to system'
        : 'System theme · switch to light';

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
        aria-label={t('sidebar.expand')}
      >
        <Menu />
      </Button>

      {/* Breadcrumb — non-leaf crumbs collapse on phones so only the
          current page is shown; the trail re-expands at `sm`. The crumbs
          themselves stay in the DOM so a11y traversal & tests still see
          them. */}
      <nav
        className="flex items-center gap-1 text-sm min-w-0 flex-1 sm:flex-initial"
        aria-label="Breadcrumb"
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
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={cn('truncate', isLast ? 'text-fg font-medium' : 'text-fg-subtle')}
                >
                  {crumb.label}
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
              <span className="sm:hidden">Demo</span>
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
        aria-label={t('topbar.openCommandPalette')}
      >
        <Search className="size-4 sm:size-3.5" />
        <span className="hidden sm:inline pr-3">{t('topbar.search')}</span>
        <Kbd className="hidden sm:inline-flex">{isMac ? '⌘' : 'Ctrl'}</Kbd>
        <Kbd className="hidden sm:inline-flex">K</Kbd>
      </button>
    </header>
  );
}
