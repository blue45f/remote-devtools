import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { NavLink } from "react-router-dom";

import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { navSections, type NavItem } from "@/lib/nav";
import { prefetchRoute } from "@/lib/route-prefetch";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

import { ThemeMenu } from "./ThemeMenu";

interface SidebarProps {
  onItemClick?: () => void;
}

export function Sidebar({ onItemClick }: SidebarProps) {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleCollapsed = useAppStore((s) => s.toggleSidebarCollapsed);

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-bg-subtle border-r border-border",
        collapsed ? "w-[60px]" : "w-[232px]",
        "transition-[width] duration-200 ease-out",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "h-14 flex items-center border-b border-border",
          collapsed ? "px-2 justify-center" : "px-4",
        )}
      >
        <Brand collapsed={collapsed} />
      </div>

      {/* Nav */}
      <nav
        className="flex-1 overflow-y-auto px-2 py-3"
        aria-label="Main navigation"
      >
        {navSections.map((section, idx) => (
          <div key={idx} className={cn(idx > 0 && "mt-5")}>
            {section.label && !collapsed && (
              <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-faint">
                {section.label}
              </div>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <SidebarLink
                    item={item}
                    collapsed={collapsed}
                    onClick={onItemClick}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <Separator />

      {/* Footer */}
      <div
        className={cn(
          "p-2 flex gap-1",
          collapsed ? "flex-col items-center" : "items-center justify-between",
        )}
      >
        <ThemeMenu collapsed={collapsed} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </TooltipContent>
        </Tooltip>
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
  const Icon = item.icon;

  const link = (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      onClick={onClick}
      onMouseEnter={() => prefetchRoute(item.to)}
      onFocus={() => prefetchRoute(item.to)}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium",
          "transition-[background-color,color] duration-150",
          isActive
            ? "bg-bg-muted text-fg"
            : "text-fg-subtle hover:bg-bg-muted/60 hover:text-fg",
          collapsed && "justify-center px-0",
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
              <span className="flex-1 truncate">{item.label}</span>
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
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}
