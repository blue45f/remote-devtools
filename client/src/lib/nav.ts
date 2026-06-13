import {
  BookOpen,
  Code2,
  Compass,
  LayoutDashboard,
  PlaySquare,
  Radio,
  Sparkles,
  TerminalSquare,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { FeatureFlag } from '@/lib/config';
import type { Role } from '@/lib/roles';

export interface NavItem {
  to: string;
  /**
   * i18n key for the item label, resolved with `t(item.labelKey)` at render.
   */
  labelKey: string;
  /** Korean-first fallback label for non-`t()` consumers. */
  label: string;
  /** Extra filter tokens for command-palette search in secondary languages. */
  searchTokens?: string[];
  icon: LucideIcon;
  badge?: string;
  /** Displayed-only keyboard shortcut hint (e.g. "G D"). */
  shortcut?: string;
  /** Restrict the item to these roles. Absent → visible to everyone. */
  roles?: readonly Role[];
  /** Hide the item unless the named feature flag is on. */
  flag?: FeatureFlag;
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
    labelKey: 'sidebar.sectionOperate',
    label: '운영',
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
      {
        to: '/remote-devtools',
        labelKey: 'sidebar.remoteDevtools',
        label: '원격 DevTools',
        searchTokens: ['Remote DevTools', 'CDP', 'live console'],
        icon: Radio,
        shortcut: 'G R',
        flag: 'remoteDevtools',
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
  {
    labelKey: 'sidebar.sectionGuide',
    label: '가이드',
    items: [
      {
        to: '/guide',
        labelKey: 'sidebar.guideFeatures',
        label: '기능 소개',
        searchTokens: ['Feature introduction', '기능'],
        icon: Compass,
      },
      {
        to: '/guide/user',
        labelKey: 'sidebar.guideUser',
        label: '사용자 가이드',
        searchTokens: ['User guide'],
        icon: BookOpen,
      },
      {
        to: '/guide/dev',
        labelKey: 'sidebar.guideDev',
        label: '개발자 가이드',
        searchTokens: ['Developer guide', 'SDK'],
        icon: Code2,
      },
    ],
  },
  {
    labelKey: 'sidebar.sectionSettings',
    label: '설정',
    items: [
      {
        to: '/settings/profile',
        labelKey: 'sidebar.settingsProfile',
        label: '내 정보',
        searchTokens: ['Profile', 'devices', 'ticket template', '디바이스', '템플릿'],
        icon: UserCog,
      },
      {
        to: '/settings/team',
        labelKey: 'sidebar.settingsTeam',
        label: '팀 관리',
        searchTokens: ['Team', 'members', 'organization', '멤버', '조직'],
        icon: Users,
        roles: ['owner', 'admin'],
        flag: 'team',
      },
    ],
  },
];

export const allNavItems = navSections.flatMap((s) => s.items);
