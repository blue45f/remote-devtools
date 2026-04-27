import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span
      className="inline-flex items-center gap-2 text-fg-subtle"
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn("size-4 animate-spin", className)} />
      {label && <span className="text-sm">{label}</span>}
      {!label && <span className="sr-only">Loading</span>}
    </span>
  );
}
