import { ChevronRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface CollapsibleProps {
  trigger: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  triggerClassName?: string;
}

/**
 * Disclosure widget. Replaces antd <Collapse> for expandable rows (event
 * payloads etc.). Uncontrolled by default; lightweight, no extra deps.
 */
export function Collapsible({
  trigger,
  children,
  defaultOpen = false,
  className,
  triggerClassName,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-1.5 text-left text-sm',
          'outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
          triggerClassName,
        )}
      >
        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 text-fg-faint transition-transform',
            open && 'rotate-90',
          )}
        />
        <span className="min-w-0 flex-1">{trigger}</span>
      </button>
      {open && <div className="mt-1.5 pl-5">{children}</div>}
    </div>
  );
}
