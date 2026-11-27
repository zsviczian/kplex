/** Shared note/heading measurement and lazy displayed-count binding. No view topology or geometry policy. */
import type {KplexSettings} from "../../settings";
import type {GraphPage, PositionedNode} from "../../types";
import type {GraphIndex} from "../../index/GraphIndex";
import {type NodePropertyLine} from "../../core/plex/nodeProperties";
import {nodeLabelFontSize, nodeSize} from "../../core/plex/nodeGeometry";
export {effectiveLabelLimit, gateDiameter, nodeLabelFontSize, nodePropertyLineWidth, nodePropertyLinesHeight, nodePropertyLinesWidth, nodeSize} from "../../core/plex/nodeGeometry";

export type NodeDetailsRead = Readonly<{detailsFor?: (page: GraphPage) => readonly NodePropertyLine[]}>;
/** Reserve the shared heading marker/padding and minimum readable label width. All section
 * consumers start with ordinary measured text; Classic may retain its existing density insets.
 * This changes presentation bounds only, never source text or its configured character limit. */
export function sectionNodeSize(size: {width: number; height: number}, configuredMaxWidth?: number,
  widthReserve = 16, heightReserve = 0): {width: number; height: number} {
  const maximum = Math.max(172, configuredMaxWidth ?? 286);
  return {width: Math.max(172, Math.min(maximum, size.width + widthReserve)), height: Math.max(32, size.height + heightReserve)};
}

/** Small non-wrapping node adornment uses the same label/font measurement pipeline. Full copy
 * stays accessible while the visible badge clips to its finite measured width. */
export function nodeBadgeSize(label: string, settings: KplexSettings, presentation?: "category" | "status"): {width: number; height: number; fontSize: number} {
  if (presentation === "status") return {width: Math.max(1, nodeSize(label, 10, settings, false, 80, 336, 0).width - 36), height: 12, fontSize: 10};
  const measured = nodeSize(label, 18, settings, false, 80, 336, 0), fontSize = nodeLabelFontSize(18, false, settings.baseFontSize);
  return {width: Math.max(56, Math.min(300, measured.width - 36)), height: Math.ceil(fontSize * 1.6 + 8), fontSize};
}

/** Keep geometry count-free when requested; provisional zero values never certify absent edges. */
export function countsForLayout(page: GraphPage, index: Pick<GraphIndex, "neighbourCount" | "gateStats">, deferred: boolean): Pick<PositionedNode, "neighbourCount" | "gateStats"> {
  if (page.transient?.kind === "group") return { neighbourCount: 0, gateStats: {
    top: { visibleCount: 0, hasAny: false }, bottom: { visibleCount: 0, hasAny: false },
    left: { visibleCount: 0, hasAny: false }, right: { visibleCount: 0, hasAny: false },
  } };
  if (!deferred) return { neighbourCount: index.neighbourCount(page), gateStats: index.gateStats(page) };
  return deferredNodeCounts();
}

/** Resolve visible section targets to their live canonical page; synthetic heading gates remain section-owned. */
export function presentationPage(page: GraphPage, index: Pick<GraphIndex, "get">): GraphPage | null {
  if (!page.transient) return page;
  if (page.transient.kind === "section") return null;
  return page.transient.actualPath ? index.get(page.transient.actualPath) ?? null : null;
}

/** Read current canonical counts without changing geometry or count/write authority. The shared
 * resolver makes left/previous and right/next incidence disjoint, so a merged peer port sums
 * those two certified gate totals rather than the view's truncated traversal prefix. */
export function projectNodeCounts(node: PositionedNode, index: Pick<GraphIndex, "get" | "gateStats">): PositionedNode {
  const page = presentationPage(node.page, index);
  if (!page) return node;
  const gateStats = index.gateStats(page), left = gateStats.left, right = gateStats.right;
  return {...node, gateStats, ...(node.peerPort ? {peerPort: {...node.peerPort,
    count: left.visibleCount + right.visibleCount, hasAny: left.hasAny || right.hasAny,
    complete: left.complete !== false && right.complete !== false,
    countUnavailable: left.countUnavailable || right.countUnavailable,
    coverage: left.coverage === "cached" || right.coverage === "cached" ? "cached" as const
      : left.coverage === "local" || right.coverage === "local" ? "local" as const : undefined}} : {})};
}

/** Include partially clipped rows while excluding offscreen rows from optional count projection. */
export function rowIntersectsViewport(y: number, height: number, scrollTop: number, viewportHeight: number): boolean {
  return y + height / 2 > scrollTop && y - height / 2 < scrollTop + viewportHeight;
}


/** Unknown counts are placeholders, never certified absence or editing authority. */
export function deferredNodeCounts(): Pick<PositionedNode, "neighbourCount" | "gateStats"> {
  return { neighbourCount: 0, gateStats: {
    top: { visibleCount: 0, hasAny: false, complete: false, countUnavailable: true },
    bottom: { visibleCount: 0, hasAny: false, complete: false, countUnavailable: true },
    left: { visibleCount: 0, hasAny: false, complete: false, countUnavailable: true },
    right: { visibleCount: 0, hasAny: false, complete: false, countUnavailable: true },
  } };
}

/** Map canonical role counts to the explicitly declared physical ports without claiming absent counts for undeclared gates. */
export function physicalGateStats(node: Pick<PositionedNode, "gateStats" | "physicalPorts" | "peerPort">): PositionedNode["gateStats"] {
  if (!node.physicalPorts) return node.gateStats;
  const sides = {parent: "top", child: "bottom", left: "left", right: "right"} as const;
  const result = deferredNodeCounts().gateStats;
  for (const side of ["top", "bottom", "left", "right"] as const) {
    const role = node.physicalPorts[side];
    if (role) result[side] = node.gateStats[sides[role]];
  }
  if (node.peerPort) {
    const peer = node.peerPort;
    result[peer.side] = {visibleCount: peer.count, complete: peer.complete, hasAny: peer.hasAny ?? peer.count > 0,
      shownCount: peer.shownCount, ...(peer.coverage ? {coverage: peer.coverage} : {}),
      ...(peer.countUnavailable ? {countUnavailable: true} : {})};
  }
  return result;
}
