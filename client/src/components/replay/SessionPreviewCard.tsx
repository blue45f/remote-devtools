import { useQuery } from '@tanstack/react-query';
import { Camera, EyeOff, ImageOff, MousePointerClick } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

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
export function SessionPreviewCard({ sessionId, className, clickPoints }: SessionPreviewCardProps) {
  const { t } = useTranslation();
  const [showHeatmap, setShowHeatmap] = useState(true);
  const { data, isLoading, error } = useQuery({
    queryKey: ['session-preview', sessionId],
    queryFn: () =>
      apiFetch<SessionPreview | null>(`/api/session-replay/sessions/${sessionId}/preview`),
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
    if (!data) return '';
    const base = data.baseHref ? `<base href="${data.baseHref}">` : '';
    const head = data.head ?? '';
    const bodyClass = data.bodyClass ? ` class="${data.bodyClass}"` : '';
    return `<!doctype html><html><head>${base}<meta name="referrer" content="no-referrer">${head}</head><body${bodyClass}>${data.body ?? ''}</body></html>`;
  }, [data]);

  if (isLoading) {
    return (
      <Card className={cn('overflow-hidden p-0', className)}>
        <Skeleton className="aspect-[16/10] w-full" />
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card
        className={cn(
          'overflow-hidden p-0 flex flex-col items-center justify-center',
          'aspect-[16/10] text-fg-faint gap-2 text-xs bg-bg-subtle',
          className,
        )}
      >
        <ImageOff className="size-5" />
        <span>{t('replay.noPreviewCaptured')}</span>
      </Card>
    );
  }

  return (
    <Card className={cn('relative overflow-hidden p-0 group bg-bg-subtle', className)}>
      <div ref={containerRef} className="aspect-[16/10] w-full relative">
        <iframe
          title={t('replay.previewIframeTitle')}
          aria-label={t('replay.previewIframeAriaLabel')}
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
        {showHeatmap && clickPoints && clickPoints.length > 0 && (
          <HeatmapCanvas
            points={clickPoints}
            width={nativeWidth}
            height={nativeHeight}
            scale={scale}
          />
        )}
      </div>
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 px-3 py-2',
          'flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold',
          'text-bg bg-fg/85 backdrop-blur-sm',
        )}
      >
        <Camera className="size-3" />
        <span className="flex-1">{t('replay.capturedPreview')}</span>
        {clickPoints && clickPoints.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHeatmap((v) => !v)}
            aria-pressed={showHeatmap}
            aria-label={t('replay.heatmapToggle', { n: clickPoints.length })}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider hover:text-bg/80"
            data-testid="preview-heatmap-toggle"
          >
            {showHeatmap ? <EyeOff className="size-3" /> : <MousePointerClick className="size-3" />}
            <span className="font-mono normal-case tracking-normal">{clickPoints.length}</span>
          </button>
        )}
      </div>
    </Card>
  );
}

/**
 * Renders an additive radial-gradient heatmap of click points onto a canvas.
 * Each click paints a translucent warm blob; overlapping blobs accumulate
 * via `globalCompositeOperation = "lighter"` so dense areas glow hotter.
 *
 * Canvas dimensions are kept in *native* (capture) pixels and CSS-scaled
 * via a transform so the heatmap stays pixel-perfect aligned with the
 * iframe regardless of the card's display size.
 */
function HeatmapCanvas({
  points,
  width,
  height,
  scale,
}: {
  points: ClickPoint[];
  width: number;
  height: number;
  scale: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // useLayoutEffect avoids a flash on first paint — the heatmap appears
  // in the same frame as the underlying iframe scale resolves.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    const radius = 40; // ~thumb-print sized blob in native coordinates
    for (const p of points) {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      grad.addColorStop(0, 'rgba(255, 80, 80, 0.55)');
      grad.addColorStop(0.4, 'rgba(255, 200, 80, 0.3)');
      grad.addColorStop(1, 'rgba(255, 200, 80, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [points, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      aria-hidden
      data-testid="preview-heatmap"
      className="absolute top-0 left-0 origin-top-left pointer-events-none mix-blend-screen"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        transform: `scale(${scale})`,
      }}
    />
  );
}
