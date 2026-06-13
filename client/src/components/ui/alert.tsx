import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative flex gap-3 rounded-lg border px-4 py-3 text-sm [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:mt-0.5',
  {
    variants: {
      tone: {
        info: 'border-info/30 bg-info-soft text-fg',
        success: 'border-success/30 bg-success-soft text-fg',
        warning: 'border-warning/30 bg-warning-soft text-fg',
        danger: 'border-danger/30 bg-danger-soft text-fg',
        neutral: 'border-border bg-bg-subtle text-fg',
      },
    },
    defaultVariants: { tone: 'info' },
  },
);

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  neutral: Info,
} as const;

const ICON_TONE = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-fg-subtle',
} as const;

export interface AlertProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'>, VariantProps<typeof alertVariants> {
  title?: ReactNode;
  icon?: ReactNode;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ tone = 'info', title, icon, className, children, ...props }, ref) => {
    const Icon = ICONS[tone ?? 'info'];
    return (
      <div ref={ref} role="alert" className={cn(alertVariants({ tone }), className)} {...props}>
        <span className={ICON_TONE[tone ?? 'info']}>{icon ?? <Icon />}</span>
        <div className="flex-1 min-w-0">
          {title && <div className="font-semibold mb-0.5">{title}</div>}
          {children && <div className="text-fg-muted">{children}</div>}
        </div>
      </div>
    );
  },
);
Alert.displayName = 'Alert';
