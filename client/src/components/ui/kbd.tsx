import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded",
        "border border-border bg-bg-muted px-1.5 font-mono text-[10px] font-medium text-fg-subtle",
        "shadow-[0_1px_0_0_hsl(var(--border-strong))]",
        className,
      )}
      {...props}
    />
  );
}
