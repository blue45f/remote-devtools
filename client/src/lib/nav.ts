import {
  LayoutDashboard,
  PlaySquare,
  Sparkles,
  TerminalSquare,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  /**
   * i18n key for the item label, resolved with `t(item.labelKey)` at render.
   * Reuses existing `sidebar.*` keys for Dashboard/Sessions; `nav.*` for the
   * SDK playground items.
   */
  labelKey: string;
  /**
   * English fallback label. Kept for non-`t()` consumers (breadcrumbs in
   * Topbar, the 404 "Did you mean?" hint) that read the raw string; UI chrome
   * should prefer `t(labelKey)`.
   */
  label: string;
  icon: LucideIcon;
  badge?: string;
  /** Displayed-only keyboard shortcut hint (e.g. "G D"). */
  shortcut?: string;
}

export interface NavSection {
  /** i18n key for the section heading, resolved with `t(section.labelKey)`. */
  labelKey?: string;
  /** English fallback for the section heading. */
  label?: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    items: [
      {
        to: '/dashboard',
        labelKey: 'sidebar.dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        shortcut: 'G D',
      },
      {
        to: '/sessions',
        labelKey: 'sidebar.sessions',
        label: 'Sessions',
        icon: PlaySquare,
        shortcut: 'G S',
      },
    ],
  },
  {
    labelKey: 'nav.sdkPlayground',
    label: 'SDK Playground',
    items: [
      {
        to: '/sandbox/module',
        labelKey: 'nav.moduleSdk',
        label: 'Module SDK',
        icon: Sparkles,
      },
      {
        to: '/sandbox/script',
        labelKey: 'nav.scriptSdk',
        label: 'Script SDK',
        icon: TerminalSquare,
      },
    ],
  },
];

export const allNavItems = navSections.flatMap((s) => s.items);
