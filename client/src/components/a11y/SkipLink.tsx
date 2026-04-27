import { cn } from "@/lib/utils";

/**
 * Visually hidden until keyboard-focused. Lets users jump past the persistent
 * top navigation directly to the page's main content. Required for WCAG 2.4.1.
 *
 * Usage: render once near the very top of a layout, with `targetId` matching
 * the `id` of the page's `<main>` element.
 */
export function SkipLink({
  targetId = "main-content",
  children = "Skip to main content",
}: {
  targetId?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60]",
        "focus:bg-fg focus:text-bg focus:px-3 focus:py-1.5 focus:rounded-md",
        "focus:text-sm focus:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {children}
    </a>
  );
}
