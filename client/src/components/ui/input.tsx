import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, leadingIcon, trailingIcon, type = "text", ...props }, ref) => {
    if (leadingIcon || trailingIcon) {
      return (
        <div
          className={cn(
            "group relative flex items-center h-9 rounded-md border border-border bg-surface text-sm",
            "transition-[border-color,box-shadow] duration-150",
            "focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20",
            className,
          )}
        >
          {leadingIcon && (
            <span className="absolute left-3 text-fg-faint pointer-events-none [&_svg]:size-4">
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            type={type}
            className={cn(
              "h-full w-full bg-transparent text-fg placeholder:text-fg-faint outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              leadingIcon ? "pl-9" : "pl-3",
              trailingIcon ? "pr-9" : "pr-3",
            )}
            {...props}
          />
          {trailingIcon && (
            <span className="absolute right-3 text-fg-faint [&_svg]:size-4">
              {trailingIcon}
            </span>
          )}
        </div>
      );
    }

    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg",
          "placeholder:text-fg-faint outline-none",
          "transition-[border-color,box-shadow] duration-150",
          "focus:border-accent focus:ring-2 focus:ring-accent/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
