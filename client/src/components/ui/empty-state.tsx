import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6",
        className,
      )}
    >
      {Icon && (
        <div className="relative mb-4">
          <div className="absolute inset-0 size-14 rounded-full bg-accent/10 blur-xl animate-pulse [animation-duration:3s]" />
          <div className="relative flex size-14 items-center justify-center rounded-2xl bg-bg-muted border border-border animate-slide-up">
            <Icon className="size-6 text-fg-subtle" />
          </div>
        </div>
      )}
      <h3 className="text-sm font-semibold text-fg mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-fg-subtle max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
