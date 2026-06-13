import { Check } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'type'
> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

/** Accessible checkbox (native button + role="checkbox"). No extra deps. */
export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked = false, onCheckedChange, disabled, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center rounded-[5px] border',
        'transition-colors duration-150 outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:opacity-50 disabled:pointer-events-none',
        checked ? 'bg-accent border-accent text-accent-fg' : 'bg-surface border-border-strong',
        className,
      )}
      {...props}
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
    </button>
  ),
);
Checkbox.displayName = 'Checkbox';
