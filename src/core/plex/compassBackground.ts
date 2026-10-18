/**
 * Constant-size viewport compass geometry. Two half-planes clip each directional sector from the
 * actual viewport rectangle. This portable helper owns no graph, layout, camera, DOM or animation;
 * the view supplies its rendered central occurrence in screen coordinates.
 */
export type CompassPoint = Readonly<{ x: number; y: number }>;
export type CompassPolygons = Readonly<Record<"north" | "east" | "south" | "west", readonly CompassPoint[]>>;

/** Append only distinct adjacent vertices so boundary intersections cannot inflate polygon bounds. */
function append(points: CompassPoint[], point: CompassPoint): void {
  const last = points[points.length - 1];
  if (!last || last.x !== point.x || last.y !== point.y) points.push(point);
}

/** Clip a convex polygon against a*x+b*y <= threshold; every crossing interpolates an existing edge. */
function clip(points: readonly CompassPoint[], a: number, b: number, threshold: number): CompassPoint[] {
  const result: CompassPoint[] = [];
  if (!points.length) return result;
  let previous = points[points.length - 1], before = a * previous.x + b * previous.y - threshold;
  for (const current of points) {
    const after = a * current.x + b * current.y - threshold;
    if ((before <= 0) !== (after <= 0)) {
      const fraction = before / (before - after);
      append(result, { x: previous.x + (current.x - previous.x) * fraction, y: previous.y + (current.y - previous.y) * fraction });
    }
    if (after <= 0) append(result, current);
    previous = current; before = after;
  }
  const first = result[0], last = result[result.length - 1];
  if (result.length > 1 && first.x === last.x && first.y === last.y) result.pop();
  return result;
}

/**
 * Cover a finite viewport once apart from shared boundaries, including an offscreen apex.
 * Normalize arithmetic before forming diagonal constants to prevent finite-coordinate overflow.
 * Each of the four polygons has at most six vertices; invalid/zero geometry paints nothing.
 */
export function compassPolygons(width: number, height: number, apex: CompassPoint | null): CompassPolygons {
  const empty: CompassPolygons = { north: [], east: [], south: [], west: [] };
  if (!apex || ![width, height, apex.x, apex.y].every(Number.isFinite) || width <= 0 || height <= 0) return empty;
  const scale = Math.max(1, width, height, Math.abs(apex.x), Math.abs(apex.y));
  const w = width / scale, h = height / scale, cx = apex.x / scale, cy = apex.y / scale;
  if (!w || !h) return empty;
  const rectangle = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
  /** Rescale bounded clipped coordinates only, retaining viewport bounds despite floating-point noise. */
  const sector = (a: number, b: number, c: number, d: number): CompassPoint[] =>
    clip(clip(rectangle, a, b, a * cx + b * cy), c, d, c * cx + d * cy).map(/** Restore viewport bounds after normalized clipping, including edge-rounding noise. */ point => ({
      x: Math.max(0, Math.min(width, point.x * scale)), y: Math.max(0, Math.min(height, point.y * scale)),
    }));
  return {
    north: sector(1, 1, -1, 1), east: sector(-1, 1, -1, -1),
    south: sector(1, -1, -1, -1), west: sector(1, 1, 1, -1),
  };
}
