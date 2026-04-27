import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium",
    "transition-[background,color,border-color,box-shadow,transform] duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-fg text-bg hover:bg-fg/90 dark:bg-fg dark:text-bg",
        accent:
          "bg-accent text-accent-fg hover:bg-accent/90 shadow-xs",
        secondary:
          "bg-bg-muted text-fg hover:bg-border border border-border",
        outline:
          "bg-transparent text-fg border border-border-strong hover:bg-bg-muted",
        ghost: "bg-transparent text-fg-muted hover:bg-bg-muted hover:text-fg",
        soft: "bg-accent-soft text-accent-soft-fg hover:bg-accent-soft/80",
        danger:
          "bg-danger text-white hover:bg-danger/90 shadow-xs",
        link: "bg-transparent text-accent hover:underline underline-offset-2 px-0 h-auto",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        md: "h-9 px-3.5 text-sm",
        lg: "h-11 px-5 text-sm",
        icon: "size-9",
        "icon-sm": "size-7",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
