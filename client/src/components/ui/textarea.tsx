import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg',
      'placeholder:text-fg-faint resize-y',
      'transition-[border-color,box-shadow] duration-150 outline-none',
      'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20',
      'disabled:opacity-50 disabled:pointer-events-none',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
