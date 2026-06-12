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
   * Korean-first fallback label for non-`t()` consumers. UI chrome should
   * still prefer `t(labelKey)`.
   */
  label: string;
  /** Extra filter tokens for command-palette search in secondary languages. */
  searchTokens?: string[];
  icon: LucideIcon;
  badge?: string;
  /** Displayed-only keyboard shortcut hint (e.g. "G D"). */
  shortcut?: string;
}

export interface NavSection {
  /** i18n key for the section heading, resolved with `t(section.labelKey)`. */
  labelKey?: string;
  /** Korean-first fallback for the section heading. */
  label?: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    items: [
      {
        to: '/dashboard',
        labelKey: 'sidebar.dashboard',
        label: '대시보드',
        searchTokens: ['Dashboard'],
        icon: LayoutDashboard,
        shortcut: 'G D',
      },
      {
        to: '/sessions',
        labelKey: 'sidebar.sessions',
        label: '세션',
        searchTokens: ['Sessions'],
        icon: PlaySquare,
        shortcut: 'G S',
      },
    ],
  },
  {
    labelKey: 'nav.sdkPlayground',
    label: 'SDK 실험실',
    items: [
      {
        to: '/sandbox/module',
        labelKey: 'nav.moduleSdk',
        label: '모듈 SDK',
        searchTokens: ['Module SDK'],
        icon: Sparkles,
      },
      {
        to: '/sandbox/script',
        labelKey: 'nav.scriptSdk',
        label: '스크립트 SDK',
        searchTokens: ['Script SDK'],
        icon: TerminalSquare,
      },
    ],
  },
];

export const allNavItems = navSections.flatMap((s) => s.items);
