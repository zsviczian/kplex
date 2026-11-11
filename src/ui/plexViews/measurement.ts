/** Shared note/heading measurement and lazy displayed-count binding. No view topology or geometry policy. */
import type {KplexSettings} from "../../settings";
import type {GraphPage, NodeStyle, PositionedNode} from "../../types";
import type {GraphIndex} from "../../index/GraphIndex";
import {nodePropertyFontSize, type NodePropertyLine} from "../../core/plex/nodeProperties";
export type NodeDetailsRead = Readonly<{detailsFor?: (page: GraphPage) => readonly NodePropertyLine[]}>;
/** Bound dimensions to the existing supported presentation interval. */
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
/** Keep the gate visually subordinate while preserving the legacy style radius. */
export function gateDiameter(style: NodeStyle): number {
  // Keep a generous hit target in CSS, but visually the gate should remain subordinate to
  // the thought itself. gateRadius is retained as the legacy-compatible source setting.
  return Math.max(5, (style.gateRadius ?? 5) * 1.05);
}

/** Apply the configured character budget independently of horizontal/vertical density. Explicit imported styles retain larger limits. */
export function effectiveLabelLimit(configured = 30, center = false): number {
  const base = Math.round(Math.max(8, configured));
  return Math.max(center ? 18 : 8, base + (center ? 8 : 0));
}

/** Preserve historical role/style proportions while applying the user's base label size in pixels. */
export function nodeLabelFontSize(fontSize: number, center: boolean, baseFontSize = 12.4): number {
  const historical = center ? clamp(fontSize * 0.72, 13, 24) : clamp(fontSize * 0.62, 10, 16);
  return historical * clamp(Number.isFinite(baseFontSize) ? baseFontSize : 12.4, 8, 28) / 12.4;
}

/** Measure a fixed-padding pill from the bounded label; center estimates use its larger rendered font, independently of density. */
export function nodeSize(
  label: string,
  fontSize: number,
  settings: KplexSettings,
  center = false,
  configuredMax = 30,
  configuredMaxWidth?: number,
  strokeWidth = 1,
  details: readonly NodePropertyLine[] = [],
): { width: number; height: number } {
  const fontScale = (settings.baseFontSize ?? 12.4) / 12.4;
  const visibleLength = Math.min(label.length, effectiveLabelLimit(configuredMax, center));
  const minWidth = center ? 180 : 112;
  const defaultMaxWidth = center ? 370 : 286;
  const maxWidth = Math.max(minWidth, configuredMaxWidth ?? defaultMaxWidth);
  // Regular pills keep their established geometry. The center uses a larger, heavier rendered
  // font, so the regular raw-style coefficient underestimates even short labels and CSS clips
  // text before either configured limit is reached. Estimate its advance from that actual font.
  const characterWidth = center ? nodeLabelFontSize(fontSize, true, settings.baseFontSize) * 0.55 : fontSize * fontScale * 0.29;
  const width = clamp(70 + visibleLength * Math.max(4.8, characterWidth), minWidth, maxWidth);

  // Both modes reserve the font's ink padding as well as the node's own padding and border.
  const verticalInsets = (center ? 16 : 8) + 2 * Math.max(0, strokeWidth);
  const renderedFont = nodeLabelFontSize(fontSize, center, settings.baseFontSize);
  // Match the text span's 1.2em lines plus 0.2em ink padding at each edge, including wrapped text.
  const singleLineHeight = Math.max(center ? 48 : 26, Math.ceil(renderedFont * 1.6 + verticalInsets));
  const twoLineHeight = Math.ceil(Math.max(fontSize * fontScale, renderedFont) * 2.4 + renderedFont * 0.4 + verticalInsets);
  const baseHeight = settings.wrapNodeLabels ? Math.max(singleLineHeight, twoLineHeight) : singleLineHeight;
  const propertyFont = nodePropertyFontSize(settings.propertyFontSize);
  const detailWidth = details.reduce((maximum, row) => Math.max(maximum, 32 + Math.min(512, row.text.length) * propertyFont * .55), 0);
  return {width: details.length ? clamp(Math.max(width, detailWidth), minWidth, maxWidth) : width,
    height: baseHeight + (details.length ? 4 + details.length * Math.ceil(propertyFont * 1.4) : 0)};
}

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
