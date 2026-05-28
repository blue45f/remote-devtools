import { useQuery } from "@tanstack/react-query";
import { Camera, EyeOff, ImageOff, MousePointerClick } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SessionPreview {
  head: string;
  body: string;
  bodyClass?: string;
  width?: number;
  height?: number;
  baseHref?: string;
  capturedAt?: string;
}

export interface ClickPoint {
  x: number;
  y: number;
}

interface SessionPreviewCardProps {
  sessionId: string | number;
  className?: string;
  /** Native-coordinate click points to overlay as a heatmap. */
  clickPoints?: ClickPoint[];
}

/**
 * Renders the most recent screenPreview snapshot (head + body HTML captured
 * by the SDK) inside a sandboxed iframe scaled down to fit a thumbnail card.
 *
 * Native viewport pixels are preserved on the iframe element; a CSS scale
 * transform shrinks it to the card's actual width via ResizeObserver so the
 * mini-page always fills the card without distortion.
 */
export function SessionPreviewCard({
  sessionId,
  className,
  clickPoints,
}: SessionPreviewCardProps) {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const { data, isLoading, error } = useQuery({
    queryKey: ["session-preview", sessionId],
    queryFn: () =>
      apiFetch<SessionPreview | null>(
        `/api/session-replay/sessions/${sessionId}/preview`,
      ),
    enabled: Boolean(sessionId),
    retry: 0,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  const nativeWidth = data?.width ?? 1280;
  const nativeHeight = data?.height ?? 800;

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setScale(w / nativeWidth);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [nativeWidth]);

  const srcDoc = useMemo(() => {
    if (!data) return "";
    const base = data.baseHref ? `<base href="${data.baseHref}">` : "";
    const head = data.head ?? "";
    const bodyClass = data.bodyClass ? ` class="${data.bodyClass}"` : "";
    return `<!doctype html><html><head>${base}<meta name="referrer" content="no-referrer">${head}</head><body${bodyClass}>${data.body ?? ""}</body></html>`;
  }, [data]);

  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden p-0", className)}>
        <Skeleton className="aspect-[16/10] w-full" />
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card
        className={cn(
          "overflow-hidden p-0 flex flex-col items-center justify-center",
          "aspect-[16/10] text-fg-faint gap-2 text-xs bg-bg-subtle",
          className,
        )}
      >
        <ImageOff className="size-5" />
        <span>No preview captured</span>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden p-0 group bg-bg-subtle",
        className,
      )}
    >
      <div ref={containerRef} className="aspect-[16/10] w-full relative">
        <iframe
          title="Session preview"
          aria-label="Captured page preview"
          srcDoc={srcDoc}
          sandbox=""
          referrerPolicy="no-referrer"
          loading="lazy"
          className="absolute top-0 left-0 origin-top-left pointer-events-none border-0"
          style={{
            width: `${nativeWidth}px`,
            height: `${nativeHeight}px`,
            transform: `scale(${scale})`,
          }}
        />
        {showHeatmap &&
          clickPoints &&
          clickPoints.length > 0 &&
          clickPoints.map((p, i) => (
            <span
              key={i}
              aria-hidden
              data-testid="preview-click-dot"
              className="absolute rounded-full bg-accent/40 ring-2 ring-accent/70 pointer-events-none"
              style={{
                left: p.x * scale - 5,
                top: p.y * scale - 5,
                width: 10,
                height: 10,
              }}
            />
          ))}
      </div>
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 px-3 py-2",
          "flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold",
          "text-bg bg-fg/85 backdrop-blur-sm",
        )}
      >
        <Camera className="size-3" />
        <span className="flex-1">Captured preview</span>
        {clickPoints && clickPoints.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHeatmap((v) => !v)}
            aria-pressed={showHeatmap}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider hover:text-bg/80"
            data-testid="preview-heatmap-toggle"
          >
            {showHeatmap ? (
              <EyeOff className="size-3" />
            ) : (
              <MousePointerClick className="size-3" />
            )}
            <span className="font-mono normal-case tracking-normal">
              {clickPoints.length}
            </span>
          </button>
        )}
      </div>
    </Card>
  );
}
