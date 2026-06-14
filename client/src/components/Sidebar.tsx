import { ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

import { LanguageMenu } from './LanguageMenu';
import { ThemeMenu } from './ThemeMenu';

import { Brand } from '@/components/Brand';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { isFeatureEnabled } from '@/lib/config';
import { navSections, type NavItem, type NavSection } from '@/lib/nav';
import { hasRole, useRole } from '@/lib/roles';
import { prefetchRoute } from '@/lib/route-prefetch';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface SidebarProps {
  onItemClick?: () => void;
  /** When mounted as a mobile drawer, render a close button + full width and
   *  ignore the desktop `sidebarCollapsed` store flag. */
  mobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ onItemClick, mobile = false, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const role = useRole();
  const storeCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleCollapsed = useAppStore((s) => s.toggleSidebarCollapsed);
  // Mobile drawer always renders the expanded sidebar — collapsed-rail mode
  // is a desktop affordance only.
  const collapsed = mobile ? false : storeCollapsed;

  // Hide items the current user cannot reach (role) or that a feature flag
  // turns off, then drop any section left empty.
  const visibleSections: NavSection[] = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => isFeatureEnabled(item.flag) && (!item.roles || hasRole(role, item.roles)),
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-bg-subtle border-r border-border',
        mobile ? 'w-full' : collapsed ? 'w-[60px]' : 'w-[232px]',
        !mobile && 'transition-[width] duration-200 ease-out',
      )}
    >
      {/* Brand row — on mobile, includes a close affordance. */}
      <div
        className={cn(
          'h-14 flex items-center border-b border-border shrink-0',
          collapsed ? 'px-2 justify-center' : 'px-4',
          mobile && 'justify-between',
        )}
      >
        <Brand collapsed={collapsed} />
        {mobile && onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t('sidebar.closeNav')}
            className="-mr-1 touch-target"
          >
            <X />
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label={t('sidebar.mainNav')}>
        {visibleSections.map((section, idx) => (
          <div key={idx} className={cn(idx > 0 && 'mt-5')}>
            {section.labelKey && !collapsed && (
              <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-faint">
                {t(section.labelKey)}
              </div>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <SidebarLink item={item} collapsed={collapsed} onClick={onItemClick} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <Separator />

      {/* Footer — collapse toggle is hidden on mobile (no rail mode there) */}
      <div
        className={cn(
          'p-2 flex gap-1 safe-pb',
          collapsed ? 'flex-col items-center' : 'items-center justify-between',
        )}
      >
        <ThemeMenu collapsed={collapsed} />
        <LanguageMenu collapsed={collapsed} />
        {!mobile && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={toggleCollapsed}
                aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
              >
                {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function SidebarLink({
  item,
  collapsed,
  onClick,
}: {
  item: NavItem;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const Icon = item.icon;
  const label = t(item.labelKey);

  const link = (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onClick}
      onMouseEnter={() => prefetchRoute(item.to)}
      onFocus={() => prefetchRoute(item.to)}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-2.5 rounded-md px-2 py-2 sm:py-1.5 text-sm font-medium',
          'transition-[background-color,color] duration-150',
          isActive ? 'bg-bg-muted text-fg' : 'text-fg-subtle hover:bg-bg-muted/60 hover:text-fg',
          collapsed && 'justify-center px-0',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden
              className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-fg"
            />
          )}
          <Icon className="size-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{label}</span>
              {item.shortcut && (
                <span className="text-[10px] tracking-widest text-fg-faint opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.shortcut}
                </span>
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
