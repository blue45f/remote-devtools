import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center text-center py-16 px-6', className)}
    >
      {Icon && (
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-bg-muted border border-border animate-slide-up">
          <Icon className="size-6 text-fg-subtle" aria-hidden />
        </div>
      )}
      <h3 className="text-sm font-semibold text-fg mb-1">{title}</h3>
      {description && <p className="text-sm text-fg-subtle max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}
