import { cn } from "@/lib/utils";

interface BrandProps {
  className?: string;
  collapsed?: boolean;
}

export function Brand({ className, collapsed = false }: BrandProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 select-none",
        className,
      )}
    >
      <BrandMark />
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="text-[13px] font-semibold tracking-tight text-fg">
            Remote DevTools
          </span>
          <span className="text-[10px] text-fg-faint mt-0.5">
            v0.1
          </span>
        </div>
      )}
    </div>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-7 shrink-0 text-fg", className)}
      aria-hidden="true"
    >
      {/* monogram: stylized "R" + signal arc */}
      <rect
        x="1.5"
        y="1.5"
        width="21"
        height="21"
        rx="6"
        className="fill-fg"
      />
      <path
        d="M8.5 7.5h5.2c1.7 0 3 1.3 3 3 0 1.4-.9 2.5-2.1 2.9l2.4 4.1h-2.5L12 13.6h-1.3v3.9H8.5V7.5Zm2.2 4h2.7c.6 0 1-.4 1-1s-.4-1-1-1h-2.7v2Z"
        className="fill-bg"
      />
      <path
        d="M16 17a3.5 3.5 0 0 0 0-5"
        className="stroke-bg"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
