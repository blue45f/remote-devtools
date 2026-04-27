/**
 * Path utilities shared by Sparkline / AreaChart.
 *
 * Implements a simple Catmull-Rom→Bezier smoothing so our hand-rolled charts
 * feel as polished as recharts'. The math is the same one d3-shape uses
 * internally for `curveMonotoneX`, but inlined to avoid pulling d3 in.
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Build a smooth (cubic Bezier) SVG path through a series of points.
 * Returns a path starting with `M` and never closes the shape — callers can
 * append `L x y L x y Z` to make an area fill.
 */
export function buildSmoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const segments: string[] = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const tension = 0.5;
    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;

    segments.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }

  return segments.join(" ");
}
