import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

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

const LANGUAGES: { code: "en" | "ko"; labelKey: "common.english" | "common.korean" }[] = [
  { code: "en", labelKey: "common.english" },
  { code: "ko", labelKey: "common.korean" },
];

export function LanguageMenu({ collapsed }: { collapsed?: boolean }) {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage ?? "en";

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("common.language")}
              data-testid="language-menu-trigger"
            >
              <Languages />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right">
            {t("common.language")}: {current.toUpperCase()}
          </TooltipContent>
        )}
      </Tooltip>
      <DropdownMenuContent align={collapsed ? "start" : "end"} side="top">
        <DropdownMenuLabel>{t("common.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() => void i18n.changeLanguage(lang.code)}
            data-active={current === lang.code || undefined}
            className="data-[active]:bg-bg-muted"
          >
            <span className="font-mono text-[10px] text-fg-faint w-6">
              {lang.code.toUpperCase()}
            </span>
            <span>{t(lang.labelKey)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
