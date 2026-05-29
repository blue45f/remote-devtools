import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore, type Theme } from '@/lib/store';

const themes: { value: Theme; labelKey: string; icon: typeof Sun }[] = [
  { value: 'light', labelKey: 'theme.light', icon: Sun },
  { value: 'dark', labelKey: 'theme.dark', icon: Moon },
  { value: 'system', labelKey: 'theme.system', icon: Monitor },
];

export function ThemeMenu({ collapsed }: { collapsed?: boolean }) {
  const { t } = useTranslation();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const current = themes.find((item) => item.value === theme);
  const Icon = current?.icon ?? Monitor;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t('sidebar.switchTheme')}>
              <Icon />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right">
            {t('sidebar.theme')}: {current ? t(current.labelKey) : theme}
          </TooltipContent>
        )}
      </Tooltip>
      <DropdownMenuContent align={collapsed ? 'start' : 'end'} side="top">
        <DropdownMenuLabel>{t('sidebar.theme')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((item) => {
          const ItemIcon = item.icon;
          return (
            <DropdownMenuItem
              key={item.value}
              onSelect={() => setTheme(item.value)}
              data-active={theme === item.value || undefined}
              className="data-[active]:bg-bg-muted"
            >
              <ItemIcon />
              <span>{t(item.labelKey)}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
