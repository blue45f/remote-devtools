import { forwardRef, type LabelHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    // `htmlFor`/`id` association is supplied by consumers via `...props`; the
    // primitive wrapper can't know its control, so this check is a false
    // positive here.
    // eslint-disable-next-line jsx-a11y/label-has-associated-control
    <label ref={ref} className={cn('text-xs font-semibold text-fg-muted', className)} {...props} />
  ),
);
Label.displayName = 'Label';
