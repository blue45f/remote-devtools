import { Toaster as Sonner } from "sonner";

import { useAppStore } from "@/lib/store";

function resolveTheme(theme: string) {
  if (theme === "dark") return "dark" as const;
  if (theme === "light") return "light" as const;
  return "system" as const;
}

export function Toaster() {
  const theme = useAppStore((s) => s.theme);
  return (
    <Sonner
      theme={resolveTheme(theme)}
      position="bottom-right"
      offset={16}
      gap={8}
      closeButton
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex items-start gap-3 p-3.5 rounded-lg border border-border bg-surface-overlay text-fg shadow-md w-full text-sm",
          title: "font-medium",
          description: "text-fg-subtle text-xs mt-0.5",
          actionButton:
            "h-7 px-2.5 rounded-md bg-fg text-bg text-xs font-medium",
          cancelButton:
            "h-7 px-2.5 rounded-md text-fg-subtle hover:bg-bg-muted text-xs",
          icon: "shrink-0 size-4 mt-0.5",
          success: "[&_[data-icon]]:text-success",
          error: "[&_[data-icon]]:text-danger",
          warning: "[&_[data-icon]]:text-warning",
          info: "[&_[data-icon]]:text-accent",
        },
      }}
    />
  );
}

export { toast } from "sonner";
