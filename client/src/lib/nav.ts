import {
  LayoutDashboard,
  PlaySquare,
  Sparkles,
  TerminalSquare,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  /** Displayed-only keyboard shortcut hint (e.g. "G D"). */
  shortcut?: string;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    items: [
      {
        to: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        shortcut: "G D",
      },
      {
        to: "/sessions",
        label: "Sessions",
        icon: PlaySquare,
        shortcut: "G S",
      },
    ],
  },
  {
    label: "SDK Playground",
    items: [
      {
        to: "/sandbox/module",
        label: "Module SDK",
        icon: Sparkles,
      },
      {
        to: "/sandbox/script",
        label: "Script SDK",
        icon: TerminalSquare,
      },
    ],
  },
];

export const allNavItems = navSections.flatMap((s) => s.items);
