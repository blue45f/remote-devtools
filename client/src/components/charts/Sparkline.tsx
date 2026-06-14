import { useId, useMemo } from 'react';

import { buildSmoothPath, type Point } from './path';

import { cn } from '@/lib/utils';

interface SparklineProps {
  /** Numeric series (already in chronological order). */
  data: number[];
  /** Render area beneath the line. */
  area?: boolean;
  /** Stroke opacity. */
  intensity?: 'fg' | 'muted';
  className?: string;
}

/**
 * Tiny inline area chart for stat cards. No axes, no tooltips, no animation —
 * if you need any of that, reach for AreaChart instead. Replaces the recharts
 * dependency for the dashboard's hero tiles.
 */
export function Sparkline({ data, area = true, intensity = 'fg', className }: SparklineProps) {
  const W = 100; // viewBox width — scales freely
  const H = 28;

  const { linePath, areaPath } = useMemo(() => {
    if (data.length === 0) return { linePath: '', areaPath: '' };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points: Point[] = data.map((v, i) => ({
      x: data.length === 1 ? W / 2 : (i / (data.length - 1)) * W,
      y: H - ((v - min) / range) * (H - 2) - 1, // 1px breathing room top/bottom
    }));

    const linePath = buildSmoothPath(points);
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`;
    return { linePath, areaPath };
  }, [data]);

  const opacity = intensity === 'fg' ? 0.18 : 0.08;
  // useId() gives a stable, SSR-safe unique id for the gradient — no impure
  // Math.random() at render.
  const gradId = `spark-${useId()}`;

  return (
    <svg
      className={cn('h-full w-full', className)}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--fg)" stopOpacity={opacity} />
          <stop offset="100%" stopColor="var(--fg)" stopOpacity={0} />
        </linearGradient>
      </defs>
      {area && areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke="var(--fg)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
