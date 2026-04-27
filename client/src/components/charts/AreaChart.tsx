import { useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { buildSmoothPath, type Point } from "./path";

interface AreaChartDatum {
  /** X-axis label (string is rendered as-is). */
  label: string;
  /** Numeric value for this point. */
  value: number;
}

interface AreaChartProps {
  data: AreaChartDatum[];
  className?: string;
  /** Tooltip header — usually "Sessions" / "Tickets". */
  valueLabel?: string;
  /**
   * Y-axis tick count. We auto-pick min/max but you can override the count.
   */
  yTicks?: number;
}

/**
 * Hand-rolled SVG replacement for recharts' AreaChart used on the dashboard.
 *
 * Why not recharts? recharts pulls in d3-scale, d3-shape, d3-array etc. and
 * adds ~100kB gzipped. The dashboard only needs one kind of area chart, so a
 * 100-line component is much cheaper. Visual parity verified against the old
 * recharts output (smooth curve, faint dashed grid, small axis ticks).
 */
export function AreaChart({
  data,
  className,
  valueLabel = "Value",
  yTicks = 4,
}: AreaChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // viewBox dimensions — chart is rendered with `preserveAspectRatio="none"`
  // for the line, but a fixed pixel-ish viewBox keeps text readable.
  const W = 600;
  const H = 200;
  const padLeft = 36;
  const padRight = 8;
  const padTop = 8;
  const padBottom = 22;
  const innerW = W - padLeft - padRight;
  const innerH = H - padTop - padBottom;

  const { linePath, areaPath, points, yTickValues, yMax } = useMemo(() => {
    if (data.length === 0) {
      return {
        linePath: "",
        areaPath: "",
        points: [] as Point[],
        yTickValues: [] as number[],
        yMax: 0,
      };
    }
    const values = data.map((d) => d.value);
    const yMax = Math.max(1, Math.ceil(Math.max(...values) * 1.1));
    const yMin = 0;
    const range = yMax - yMin;

    const points: Point[] = data.map((d, i) => ({
      x:
        padLeft +
        (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
      y: padTop + innerH - ((d.value - yMin) / range) * innerH,
    }));

    const linePath = buildSmoothPath(points);
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${
      padTop + innerH
    } L ${points[0].x} ${padTop + innerH} Z`;

    // Pick "nice" tick values
    const tickStep = Math.ceil(yMax / yTicks);
    const yTickValues: number[] = [];
    for (let v = 0; v <= yMax; v += tickStep) yTickValues.push(v);

    return { linePath, areaPath, points, yTickValues, yMax };
  }, [data, innerH, innerW, yTicks]);

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || data.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const xInView = xPct * W;
    let nearest = 0;
    let dist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].x - xInView);
      if (d < dist) {
        dist = d;
        nearest = i;
      }
    }
    setHoverIdx(nearest);
  }

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-full text-xs text-fg-faint",
          className,
        )}
      >
        No data to chart yet
      </div>
    );
  }

  const hover = hoverIdx != null ? data[hoverIdx] : null;
  const hoverPt = hoverIdx != null ? points[hoverIdx] : null;

  return (
    <div className={cn("relative h-full w-full", className)}>
      <svg
        ref={svgRef}
        className="h-full w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onMouseMove={onMove}
        onMouseLeave={() => setHoverIdx(null)}
        role="img"
        aria-label={`${valueLabel} trend chart`}
      >
        <defs>
          <linearGradient id="dashboard-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--fg))" stopOpacity={0.16} />
            <stop offset="100%" stopColor="hsl(var(--fg))" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {yTickValues.map((v) => {
          const y =
            padTop + innerH - (v / (yMax || 1)) * innerH;
          return (
            <g key={v}>
              <line
                x1={padLeft}
                x2={padLeft + innerW}
                y1={y}
                y2={y}
                stroke="hsl(var(--border))"
                strokeDasharray="3 3"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={padLeft - 6}
                y={y + 3}
                textAnchor="end"
                fontSize={10}
                fill="hsl(var(--fg-faint))"
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* X-axis labels — show first, last, and middle to avoid clutter */}
        {data.map((d, i) => {
          const showAt =
            data.length <= 7 ||
            i === 0 ||
            i === data.length - 1 ||
            i === Math.floor(data.length / 2);
          if (!showAt) return null;
          const x = points[i].x;
          return (
            <text
              key={i}
              x={x}
              y={H - 6}
              textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
              fontSize={10}
              fill="hsl(var(--fg-faint))"
            >
              {d.label}
            </text>
          );
        })}

        {/* Filled area + line */}
        {areaPath && <path d={areaPath} fill="url(#dashboard-area-grad)" />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="hsl(var(--fg))"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Hover crosshair + dot */}
        {hoverPt && (
          <g>
            <line
              x1={hoverPt.x}
              x2={hoverPt.x}
              y1={padTop}
              y2={padTop + innerH}
              stroke="hsl(var(--border-strong))"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={hoverPt.x}
              cy={hoverPt.y}
              r={4}
              fill="hsl(var(--fg))"
              stroke="hsl(var(--bg))"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )}
      </svg>

      {/* Tooltip — positioned in screen coords so the text stays crisp. */}
      {hover && hoverPt && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full pb-2"
          style={{
            left: `${(hoverPt.x / W) * 100}%`,
            top: `${(hoverPt.y / H) * 100}%`,
          }}
        >
          <div className="rounded-md border border-border bg-surface-overlay px-3 py-2 shadow-md text-xs whitespace-nowrap">
            <div className="font-medium text-fg mb-0.5">{hover.label}</div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-fg" />
              <span className="text-fg-subtle">{valueLabel}</span>
              <span className="font-mono tabular-nums text-fg ml-1">
                {hover.value.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
