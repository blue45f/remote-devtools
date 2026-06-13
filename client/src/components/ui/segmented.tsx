import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  size?: 'sm' | 'md';
  'aria-label'?: string;
  className?: string;
}

/** Pill toggle group. Replaces antd <Segmented> / <Radio.Group> for view/period switches. */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  size = 'md',
  className,
  ...props
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={props['aria-label']}
      className={cn('inline-flex items-center gap-1 rounded-md bg-bg-muted p-1', className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[5px] font-medium whitespace-nowrap',
              'transition-[background,color,box-shadow] duration-150 outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring',
              size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-sm',
              active ? 'bg-surface text-fg shadow-xs' : 'text-fg-subtle hover:text-fg',
              '[&_svg]:size-3.5 [&_svg]:shrink-0',
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
