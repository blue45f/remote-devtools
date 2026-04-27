import { ChevronRight, Menu, Search, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { allNavItems } from "@/lib/nav";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const isMac =
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad|ipod/i.test(navigator.userAgent);

interface Crumb {
  label: string;
  to?: string;
}

function buildCrumbs(pathname: string): Crumb[] {
  if (pathname === "/" || pathname === "") {
    return [{ label: "Home" }];
  }

  const parts = pathname.split("/").filter(Boolean);
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
      to: isLast ? undefined : `/${parts.slice(0, i + 1).join("/")}`,
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
  const { t } = useTranslation();

  const crumbs = useMemo(() => buildCrumbs(location.pathname), [location.pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-14 flex items-center gap-2 px-3 lg:px-5",
        "border-b border-border bg-bg/80 backdrop-blur-xl",
      )}
    >
      {/* Mobile sidebar trigger — bumped to 36px to meet touch-target guidelines */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label={t("sidebar.expand")}
      >
        <Menu />
      </Button>

      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-1 text-sm min-w-0"
        aria-label="Breadcrumb"
      >
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <div key={idx} className="flex items-center gap-1 min-w-0">
              {idx > 0 && (
                <ChevronRight className="size-3.5 text-fg-faint shrink-0" />
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
                  className={cn(
                    "truncate",
                    isLast ? "text-fg font-medium" : "text-fg-subtle",
                  )}
                >
                  {crumb.label}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      <div className="flex-1" />

      {demoMode && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="accent"
              className="gap-1 cursor-help"
              data-testid="demo-mode-badge"
            >
              <Sparkles className="size-3" />
              {t("topbar.demoMode")}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t("topbar.demoModeTooltip")}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Search trigger */}
      <button
        type="button"
        onClick={toggleCommand}
        className={cn(
          "group flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-md",
          "border border-border bg-surface text-sm text-fg-faint",
          "hover:border-border-strong hover:text-fg-subtle transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label={t("topbar.openCommandPalette")}
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline pr-3">{t("topbar.search")}</span>
        <Kbd className="hidden sm:inline-flex">
          {isMac ? "⌘" : "Ctrl"}
        </Kbd>
        <Kbd className="hidden sm:inline-flex">K</Kbd>
      </button>
    </header>
  );
}
