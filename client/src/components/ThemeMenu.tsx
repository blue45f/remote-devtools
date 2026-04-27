import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore, type Theme } from "@/lib/store";

const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeMenu({ collapsed }: { collapsed?: boolean }) {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const Icon = themes.find((t) => t.value === theme)?.icon ?? Monitor;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Switch theme"
            >
              <Icon />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right">Theme: {theme}</TooltipContent>
        )}
      </Tooltip>
      <DropdownMenuContent align={collapsed ? "start" : "end"} side="top">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((t) => {
          const Icon = t.icon;
          return (
            <DropdownMenuItem
              key={t.value}
              onSelect={() => setTheme(t.value)}
              data-active={theme === t.value || undefined}
              className="data-[active]:bg-bg-muted"
            >
              <Icon />
              <span>{t.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
