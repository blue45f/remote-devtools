import { cn } from '@/lib/utils';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'live';

const DOT: Record<StatusTone, string> = {
  neutral: 'bg-fg-faint',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  live: 'bg-live',
};

interface StatusDotProps {
  tone: StatusTone;
  label?: React.ReactNode;
  /** Animate the dot (for live/running states). */
  pulse?: boolean;
  className?: string;
}

/**
 * Status conveyed by a coloured dot + label — never colour alone (a11y).
 * Replaces antd <Badge status>.
 */
export function StatusDot({ tone, label, pulse, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted',
        className,
      )}
    >
      <span className="relative flex size-2">
        {pulse && (
          <span
            aria-hidden
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping',
              DOT[tone],
            )}
          />
        )}
        <span className={cn('relative inline-flex size-2 rounded-full', DOT[tone])} />
      </span>
      {label}
    </span>
  );
}
