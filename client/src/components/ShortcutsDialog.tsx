import { Keyboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { SHORTCUT_GROUPS } from '@/lib/keyboard';
import { useAppStore } from '@/lib/store';

export function ShortcutsDialog() {
  const { t } = useTranslation();
  const open = useAppStore((s) => s.shortcutsOpen);
  const setOpen = useAppStore((s) => s.setShortcutsOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0 overflow-hidden" data-testid="shortcuts-dialog">
        <DialogHeader className="px-6 pt-6 mb-0">
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-4 text-fg-subtle" />
            {t('shortcuts.title')}
          </DialogTitle>
          <DialogDescription>{t('shortcuts.description')}</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6 pt-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.labelKey}>
              <h3 className="text-[10px] uppercase tracking-wider text-fg-faint font-semibold mb-2">
                {t(group.labelKey)}
              </h3>
              <ul className="divide-y divide-border rounded-md border border-border bg-bg-subtle/50">
                {group.shortcuts.map((s) => (
                  <li
                    key={s.labelKey}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-fg truncate">{t(s.labelKey)}</p>
                      {s.descriptionKey && (
                        <p className="text-[11px] text-fg-faint truncate mt-0.5">
                          {t(s.descriptionKey)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.keys.map((key, idx) => (
                        <span key={`${s.labelKey}-${idx}`} className="inline-flex items-center">
                          {idx > 0 && (
                            <span className="text-[10px] text-fg-faint mx-1">
                              {t('shortcuts.then')}
                            </span>
                          )}
                          <Kbd>{key}</Kbd>
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <p className="text-[11px] text-fg-faint border-t border-border pt-3">
            {t('shortcuts.tip')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
