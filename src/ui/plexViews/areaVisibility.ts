/** Shared presentation-only clipping and reveal geometry over already admitted measured rows. */
import type {GateSide, PositionedEdge, PositionedNode} from "../../types";
import {edgePhysicalOccurrence, type SceneViewport} from "./scene";

/** One paint-only attachment; a continued endpoint is never a node, gate or relationship target. */
export type ViewportEdgeEndpoint = Readonly<{point: Readonly<{x: number; y: number}>; port: GateSide; continued: boolean}>;

/** Paint ordinary routes only while both cards intersect their scroll apertures. A caller may
 * retain an explicitly identified tree ancestor as a boundary continuation for its visible child;
 * hidden leaf rows never acquire routes merely because a visible hub connects to them.
 * Two hidden cards have no visible context and paint nothing.
 * Existing explicit visible-endpoints policy may still suppress a route. Canonical endpoints,
 * directions and evidence never change; the caller only changes paint and hides clipped markers. */
export function edgeViewportEndpoints(a: Readonly<{x: number; y: number}>, b: Readonly<{x: number; y: number}>,
  sourcePort: GateSide, targetPort: GateSide, sourceArea?: SceneViewport, targetArea?: SceneViewport,
  cards?: Readonly<{source: Pick<PositionedNode, "x" | "y" | "width" | "height">; target: Pick<PositionedNode, "x" | "y" | "width" | "height">; continueSource?: boolean; continueTarget?: boolean}>): Readonly<{source: ViewportEdgeEndpoint; target: ViewportEdgeEndpoint}> | null {
  /** Clip only scrollable apertures; fixed forests own complete measured geometry. */
  const endpoint = (point: Readonly<{x: number; y: number}>, port: GateSide, area?: SceneViewport): ViewportEdgeEndpoint => {
    if (!area || area.scrollable === false) return {point, port, continued: false};
    const x = Math.max(area.left, Math.min(area.left + area.width, point.x));
    const y = Math.max(area.top, Math.min(area.top + area.height, point.y));
    return {point: {x, y}, port, continued: x !== point.x || y !== point.y};
  };
  const source = endpoint(a, sourcePort, sourceArea), target = endpoint(b, targetPort, targetArea);
  /** A card touching the aperture still supplies visible context when its protruding gate is clipped. */
  const visible = (end: ViewportEdgeEndpoint, area?: SceneViewport, card?: Pick<PositionedNode, "x" | "y" | "width" | "height">): boolean =>
    !area || area.scrollable === false || (card ? card.x + card.width / 2 > area.left && card.x - card.width / 2 < area.left + area.width
      && card.y + card.height / 2 > area.top && card.y - card.height / 2 < area.top + area.height : !end.continued);
  const sourceVisible = visible(source, sourceArea, cards?.source), targetVisible = visible(target, targetArea, cards?.target);
  if (!sourceVisible && !targetVisible || !sourceVisible && !cards?.continueSource || !targetVisible && !cards?.continueTarget
    || source.continued && sourceArea?.edgeVisibility === "visible-endpoints"
    || target.continued && targetArea?.edgeVisibility === "visible-endpoints") return null;
  /** The continuation faces the visible counterpart, rather than inheriting a hidden gate's tangent. */
  const toward = (end: ViewportEdgeEndpoint, other: ViewportEdgeEndpoint): ViewportEdgeEndpoint => {
    if (!end.continued) return end;
    const dx = other.point.x - end.point.x, dy = other.point.y - end.point.y;
    const port = Math.abs(dx) >= Math.abs(dy) ? dx < 0 ? "left" : "right" : dy < 0 ? "top" : "bottom";
    return {...end, port};
  };
  return {source: toward(source, target), target: toward(target, source)};
}

/** Keep routes between exact physical endpoints, clipping area-local overflow without changing canonical evidence.
 * Cross-area routes retain the span between both visible areas (or an unbounded endpoint's measured card).
 * The SVG viewport clips stroke, arrowheads, caption and hit path together. Optional visible-endpoint
 * policy suppresses the whole painted route when a scrolled physical gate is hidden; null never
 * removes the admitted canonical relationship. Omission preserves through-area routes. */
export function edgeViewportClip(edge: PositionedEdge, nodes: ReadonlyMap<string, PositionedNode>,
  viewport: (node: PositionedNode) => SceneViewport | undefined): {left: number; top: number; width: number; height: number} | null | undefined {
  const source = nodes.get(edgePhysicalOccurrence(edge, "source")), target = nodes.get(edgePhysicalOccurrence(edge, "target"));
  if (!source || !target) return undefined;
  const a = viewport(source), b = viewport(target);
  /** Match the real physical attachment, including section endpoints, after native scrolling. */
  const hidden = (node: PositionedNode, area: SceneViewport | undefined, port: PositionedEdge["sourcePort"]): boolean => {
    if (area?.edgeVisibility !== "visible-endpoints") return false;
    const x = node.x + (port === "left" ? -node.width / 2 : port === "right" ? node.width / 2 : 0);
    const y = node.y + (port === "top" ? -node.height / 2 : port === "bottom" ? node.height / 2 : 0);
    return x < area.left || x > area.left + area.width || y < area.top || y > area.top + area.height;
  };
  if (hidden(source, a, edge.sourcePort) || hidden(target, b, edge.targetPort)) return null;
  if (!a && !b) return undefined;
  /** Outside cards retain their gate/marker clearance; bounded rows share the actual area rectangle. */
  const bounds = (node: PositionedNode, area?: SceneViewport) => area ?? {
    left: node.x - node.width / 2 - 32, top: node.y - node.height / 2 - 32, width: node.width + 64, height: node.height + 64,
  };
  const first = bounds(source, a), second = bounds(target, b);
  const left = Math.min(first.left, second.left), top = Math.min(first.top, second.top);
  return {left, top, width: Math.max(first.left + first.width, second.left + second.width) - left,
    height: Math.max(first.top + first.height, second.top + second.height) - top};
}

/** Minimal bounded scroll that reveals a measured row; oversized editors retain the row's top edge. */
export function revealRowScrollTop(center: number, height: number, scrollTop: number, viewportHeight: number, contentHeight: number): number {
  const top = center - height / 2, bottom = center + height / 2;
  const next = top < scrollTop || height > viewportHeight ? top : bottom > scrollTop + viewportHeight ? bottom - viewportHeight : scrollTop;
  return Math.max(0, Math.min(Math.max(0, contentHeight - viewportHeight), next));
}

/** Keep an area-hosted editor's toolbar in the visible canvas intersection while its native body retains full dimensions. */
export function editorToolbarInsets(editor: {left: number; top: number; width: number; height: number},
  canvas: {width: number; height: number; topInset?: number; bottomInset?: number}, area?: {left: number; top: number; width: number; height: number}, toolbarHeight = 30, minimumWidth = 0): {top: number; left: number; right: number} {
  // Chrome sits above the visible document, independent of its content clip. A tall/panned
  // editor pins only the toolbar to the canvas; the native leaf keeps its original dimensions.
  const visibleTop = Math.max(editor.top, area?.top ?? editor.top);
  const topInset = canvas.topInset ?? 4, bottomInset = canvas.bottomInset ?? 4;
  const top = Math.max(topInset, Math.min(Math.max(topInset, canvas.height - toolbarHeight - bottomInset), visibleTop - toolbarHeight - 4));
  const visibleLeft = Math.max(4, editor.left, area?.left ?? editor.left);
  const visibleRight = Math.min(canvas.width - 4, editor.left + editor.width, area ? area.left + area.width : Infinity);
  const width = Math.min(Math.max(0, canvas.width - 8), Math.max(minimumWidth, visibleRight - visibleLeft));
  const left = Math.max(4, Math.min(visibleLeft, canvas.width - 4 - width));
  return {top: top - editor.top, left: left - editor.left, right: editor.left + editor.width - left - width};
}
