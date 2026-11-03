/** Shared thought-body geometry for view-scoped center connectors. Canonical roles/ports,
 * evidence and actions are unchanged; callers retain scroll clipping and SVG painting ownership. */
import type {NodeStyle, PositionedNode} from "../../types";
type ConnectionNode = Pick<PositionedNode, "x" | "y" | "width" | "height" | "role" | "style">;
type Point = Readonly<{x: number; y: number}>;

/** Use the same radius for painted thought bodies and their measured connector intersections. */
export function thoughtCornerRadius(style: Pick<NodeStyle, "strokeShaprness">, center: boolean): number {
  return style.strokeShaprness === "sharp" ? 5 : center ? 18 : 12;
}

/** Intersect the outward center ray with the actual rounded thought rectangle, including corners. */
function boundary(node: ConnectionNode, toward: Point): Point {
  const dx = toward.x - node.x, dy = toward.y - node.y, width = node.width / 2, height = node.height / 2;
  const x = Math.abs(dx), y = Math.abs(dy), radius = Math.min(width, height, thoughtCornerRadius(node.style, node.role === "center"));
  let t = Math.min(x ? width / x : Infinity, y ? height / y : Infinity);
  if (radius > 0 && x * t > width - radius && y * t > height - radius) {
    const cx = width - radius, cy = height - radius, a = x * x + y * y, b = -2 * (x * cx + y * cy);
    const c = cx * cx + cy * cy - radius * radius;
    t = (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
  }
  return {x: node.x + dx * t, y: node.y + dy * t};
}

/** Return the visible center-line span; overlapping bodies never receive a backwards label-crossing line. */
export function nodeCenterConnector(source: ConnectionNode, target: ConnectionNode): Readonly<{source: Point; target: Point}> | null {
  const dx = target.x - source.x, dy = target.y - source.y;
  if (!Number.isFinite(dx + dy) || dx === 0 && dy === 0) return null;
  const a = boundary(source, target), b = boundary(target, source);
  return (b.x - a.x) * dx + (b.y - a.y) * dy > 0 ? {source: a, target: b} : null;
}
