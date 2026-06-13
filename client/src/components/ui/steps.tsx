import { Check } from 'lucide-react';
import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface Step {
  title: ReactNode;
  description?: ReactNode;
}

interface StepsProps {
  steps: ReadonlyArray<Step>;
  /** Index of the current step (0-based). Steps before it render as done. */
  current?: number;
  className?: string;
}

/** Vertical numbered procedure. Replaces antd <Steps direction="vertical">. */
export function Steps({ steps, current = -1, className }: StepsProps) {
  return (
    <ol className={cn('flex flex-col', className)}>
      {steps.map((step, i) => {
        const done = current >= 0 && i < current;
        const active = i === current;
        const isLast = i === steps.length - 1;
        return (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums',
                  done && 'bg-success border-success text-success-fg',
                  active && 'bg-accent border-accent text-accent-fg',
                  !done && !active && 'bg-bg-subtle border-border text-fg-subtle',
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              {!isLast && <span className="w-px flex-1 my-1 bg-border" />}
            </div>
            <div className={cn('pb-6', isLast && 'pb-0')}>
              <div className="text-sm font-semibold text-fg">{step.title}</div>
              {step.description && (
                <div className="mt-0.5 text-sm text-fg-muted">{step.description}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
