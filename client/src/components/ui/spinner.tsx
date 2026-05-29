import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className, label }: SpinnerProps) {
  const { t } = useTranslation();
  return (
    <span
      className="inline-flex items-center gap-2 text-fg-subtle"
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn('size-4 animate-spin', className)} />
      {label && <span className="text-sm">{label}</span>}
      {!label && <span className="sr-only">{t('common.loadingShort')}</span>}
    </span>
  );
}
