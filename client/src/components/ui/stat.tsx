import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { type ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  /** Optional delta percentage; sign drives colour + arrow. */
  delta?: number;
  icon?: ReactNode;
  loading?: boolean;
  className?: string;
}

/** KPI card. Replaces antd <Statistic>. Number is the loudest thing on it. */
export function Stat({ label, value, hint, delta, icon, loading, className }: StatProps) {
  return (
    <Card className={cn('p-4 flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-faint">
          {label}
        </span>
        {icon && <span className="text-fg-subtle [&_svg]:size-4">{icon}</span>}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <div className="text-2xl font-semibold tracking-tight tabular-nums text-fg">{value}</div>
      )}
      <div className="flex items-center gap-2 min-h-[18px]">
        {typeof delta === 'number' && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
              delta >= 0 ? 'text-success' : 'text-danger',
            )}
          >
            {delta >= 0 ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-xs text-fg-faint truncate">{hint}</span>}
      </div>
    </Card>
  );
}
