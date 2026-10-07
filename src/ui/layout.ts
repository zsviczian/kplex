/**
 * Host-bound Plex geometry: arrange semantic neighborhoods into presentation zones.
 * Area resize bounds exist for empty groups independently of overflow viewports;
 * Horizontal density owns widths/column spacing, vertical density owns row spacing; compact view
 * and minimum-link targets share the same geometry policy across normal/expanded/section scenes.
 * Parent width owns lateral x anchors; density three touches area edges and four permits bounded
 * margin overlap, while child-column/row controls cannot push those anchors. Optional deferred counts
 * keep offscreen geometry independent of incidence queries; rendered rows acquire current counts.
 * Callers own interaction, settings persistence and camera transforms.
 */
import type { KplexSettings } from "../settings";
import type { GraphPage, Neighborhood, Neighbour, NodeStyle, PositionedEdge, PositionedNode, Role, ScrollZone } from "../types";
import { RelationType } from "../types";
import { resolveLinkStyle, resolveNodeStyle } from "../index/style";
import type { GraphIndex } from "../index/GraphIndex";

/** Bound a geometry input to its supported presentation interval. */
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Use the selected horizontal axis, retaining old unmerged settings' shared density fallback. */
export function horizontalDensity(settings: Pick<KplexSettings, "compactingFactor" | "horizontalCompactingFactor">): number {
  return settings.horizontalCompactingFactor ?? settings.compactingFactor;
}

/** Shared bounded spacing inputs; compact view changes whitespace rather than thought padding. */
export function spacingPolicy(settings: KplexSettings): { horizontal: number; vertical: number; spacing: number } {
  const compact = settings.compactView ? 0.82 : 1;
  return {
    horizontal: clamp(1.35 / horizontalDensity(settings), 0.38, 1.35) * compact,
    vertical: clamp(1.35 / settings.compactingFactor, 0.38, 1.35) * compact,
    spacing: clamp(settings.minLinkLength / 18, 0.72, 1.7),
  };
}

/** Resolve configured column limits identically for main, section and expanded child grids. */
export function layoutColumns(settings: Pick<KplexSettings, "parentColumns" | "childColumns">, role: "parent" | "child"): number {
  return Math.max(1, Math.min(role === "parent" ? 3 : 7, Math.round(role === "parent" ? settings.parentColumns : settings.childColumns)));
}

/** Overlay live area heights while retaining inherited layout-profile settings and style dictionaries.
 * The source facade remains unchanged; spreading its own fields would discard inherited settings.
 */
export function withAreaHeightOverrides(settings: KplexSettings, overrides: Partial<Pick<KplexSettings, "parentMaxHeight" | "childMaxHeight" | "friendMaxHeight" | "siblingMaxHeight">>): KplexSettings {
  const next = Object.create(settings) as KplexSettings;
  return Object.assign(next, overrides);
}

/** Apply the persisted sibling multiplier to thoughts and their expanded child strips. */
export function siblingScale(settings: KplexSettings): number {
  return clamp(settings.siblingRelativeSize / 100, 0.3, 0.85);
}

export type ZoneViewport = {
  key: ScrollZone;
  left: number;
  top: number;
  width: number;
  height: number;
  contentTop: number;
  contentHeight: number;
  initialScrollTop: number;
};

/** Configured world-space area and its movable edge, independent of content overflow. */
export type ZoneAreaBounds = {
  key: ScrollZone;
  left: number;
  top: number;
  width: number;
  height: number;
  resizeEdge: "top" | "bottom";
};

export type SectionTreeEdge = {
  id: string;
  sourcePath: string;
  targetPath: string;
};

/** Explicit dimensions for a center thought whose content owns more space than a label pill. */
export type CenterNodeSize = { width: number; height: number };

export type PlexScene = {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  zoneViewports: Partial<Record<ScrollZone, ZoneViewport>>;
  zoneAreas: Partial<Record<ScrollZone, ZoneAreaBounds>>;
  sectionTreeEdges?: SectionTreeEdge[];
};

/** Keep the gate visually subordinate while preserving the legacy style radius. */
export function gateDiameter(style: NodeStyle): number {
  // Keep a generous hit target in CSS, but visually the gate should remain subordinate to
  // the thought itself. gateRadius is retained as the legacy-compatible source setting.
  return Math.max(5, (style.gateRadius ?? 5) * 1.05);
}

/** Horizontal density shortens labels without changing fixed thought padding or row height. */
export function effectiveLabelLimit(settings: KplexSettings, configured = 30, center = false): number {
  // Compactness changes only how much text is shown and how tightly thoughts are spaced.
  // Node interior padding remains constant in every view.
  const density = clamp(horizontalDensity(settings) / 1.5, 0.5, 2);
  const base = Math.max(8, configured);
  const scaled = Math.round(base / density);
  return Math.max(center ? 18 : 8, scaled + (center ? 8 : 0));
}

/** Preserve historical role/style proportions while applying the user's base label size in pixels. */
export function nodeLabelFontSize(fontSize: number, center: boolean, baseFontSize = 12.4): number {
  const historical = center ? clamp(fontSize * 0.72, 13, 24) : clamp(fontSize * 0.62, 10, 16);
  return historical * clamp(Number.isFinite(baseFontSize) ? baseFontSize : 12.4, 8, 28) / 12.4;
}

/** Measure a fixed-padding pill from the horizontally bounded label and optional two-line rows. */
function nodeSize(
  label: string,
  fontSize: number,
  settings: KplexSettings,
  center = false,
  configuredMax = 30,
  configuredMaxWidth?: number,
): { width: number; height: number } {
  const fontScale = (settings.baseFontSize ?? 12.4) / 12.4;
  const visibleLength = Math.min(label.length, effectiveLabelLimit(settings, configuredMax, center));
  const minWidth = center ? 180 : 112;
  const defaultMaxWidth = center ? 370 : 286;
  const maxWidth = Math.max(minWidth, configuredMaxWidth ?? defaultMaxWidth);
  const width = clamp(70 + visibleLength * Math.max(4.8, fontSize * fontScale * 0.29), minWidth, maxWidth);

  // Two-line mode reserves the full two line boxes plus the node's vertical padding. Keep the
  // compact single-line defaults unchanged when wrapping is disabled.
  const singleLineHeight = Math.max(center ? 48 : 26, Math.ceil(nodeLabelFontSize(fontSize, center, settings.baseFontSize) * 1.15 + (center ? 16 : 8)));
  const twoLineHeight = Math.ceil(Math.max(fontSize * fontScale, nodeLabelFontSize(fontSize, center, settings.baseFontSize)) * 2.3 + (center ? 16 : 8));
  return { width, height: settings.wrapNodeLabels ? Math.max(singleLineHeight, twoLineHeight) : singleLineHeight };
}

/** Resolve current visual styles and dimensions without mutating the semantic page or neighbor. */
function makeNode(
  n: Neighbour,
  role: Role,
  index: GraphIndex,
  settings: KplexSettings,
  deferCounts = false,
): PositionedNode {
  const resolved = resolveNodeStyle(n.page, n, role, settings);
  const scale = role === "sibling" ? siblingScale(settings) : 1;
  const style: NodeStyle = scale === 1 ? resolved : {
    ...resolved,
    fontSize: (resolved.fontSize ?? 18) * scale,
    gateRadius: (resolved.gateRadius ?? settings.baseNodeStyle.gateRadius ?? 5) * scale,
  };
  const label = index.titleFor(n.page);
  const baseSize = nodeSize(`${resolved.prefix ?? ""}${label}`, resolved.fontSize ?? 18, settings, false, resolved.maxLabelLength ?? 30, resolved.maxWidth ?? settings.baseNodeStyle.maxWidth);
  const size = scale === 1 ? baseSize : { width: baseSize.width * scale, height: baseSize.height * scale };
  return {
    page: n.page,
    role,
    relationType: n.relationType,
    typeDefinition: n.typeDefinition,
    linkDirection: n.linkDirection,
    x: 0,
    y: 0,
    ...size,
    style,
    label,
    ...countsForLayout(n.page, index, deferCounts),
  };
}

/** Keep geometry count-free when requested; provisional zero values never certify absent edges. */
function countsForLayout(page: GraphPage, index: GraphIndex, deferred: boolean): Pick<PositionedNode, "neighbourCount" | "gateStats"> {
  if (!deferred) return { neighbourCount: index.neighbourCount(page), gateStats: index.gateStats(page) };
  return { neighbourCount: 0, gateStats: {
    top: { visibleCount: 0, hasAny: false, complete: false, countUnavailable: true },
    bottom: { visibleCount: 0, hasAny: false, complete: false, countUnavailable: true },
    left: { visibleCount: 0, hasAny: false, complete: false, countUnavailable: true },
    right: { visibleCount: 0, hasAny: false, complete: false, countUnavailable: true },
  } };
}

/** Read displayed gate counts for a rendered regular node; preserve section gates and the unused legacy total field. */
export function projectNodeCounts(node: PositionedNode, index: GraphIndex): PositionedNode {
  return node.page.transient ? node : { ...node, gateStats: index.gateStats(node.page) };
}

/** Include partially clipped rows while excluding offscreen rows from optional count projection. */
export function rowIntersectsViewport(y: number, height: number, scrollTop: number, viewportHeight: number): boolean {
  return y + height / 2 > scrollTop && y - height / 2 < scrollTop + viewportHeight;
}

export type ExpandedMiniLayout = Readonly<{
  columns: number; rows: number; width: number; columnGap: number;
  rowHeight: number; topGap: number; contentHeight: number; viewportHeight: number;
}>;

/**
 * Shared expanded-child box metrics for geometry reserves and renderer cells. Child columns now
 * honor narrower child-column settings within the established three-column maximum. Minimum
 * cell widths preserve non-overlapping pills; scale applies to the whole sibling-descendant box.
 */
export function expandedMiniLayout(settings: KplexSettings, parentWidth: number, childCount: number, scale = 1): ExpandedMiniLayout {
  const { horizontal, vertical, spacing } = spacingPolicy(settings);
  const columns = Math.min(3, layoutColumns(settings, "child"), Math.max(1, childCount));
  const rows = Math.ceil(childCount / columns);
  const columnGap = 8 * horizontal / 0.675 * spacing;
  const width = Math.max(Math.max(220, Math.min(330, parentWidth * 1.7)) * horizontal / 0.675 * spacing,
    columns * (64 + columnGap));
  const rowHeight = 16 * (settings.baseFontSize ?? 12.4) / 12.4 + 12 * vertical / 0.675 * spacing;
  const topGap = 14 * vertical / 0.675 * spacing;
  return {
    columns, rows, width: width * scale, columnGap: columnGap * scale,
    rowHeight: rowHeight * scale, topGap: topGap * scale,
    contentHeight: rows * rowHeight * scale,
    viewportHeight: Math.min(2, rows) * rowHeight * scale,
  };
}

/** Reserve exactly the visible expanded box height, optionally scaling the full sibling-descendant strip. */
export function expandedChildReserve(page: GraphPage, index: GraphIndex, settings: KplexSettings, centerPath: string, scale = 1): number {
  if (settings.graphDepth !== 2) return 0;
  const childCount = index.neighbours(page, "child")
    .filter((child) => child.page.path !== centerPath)
    .slice(0, settings.maxItemCount).length;
  if (!childCount) return 0;
  const metrics = expandedMiniLayout(settings, 0, childCount, scale);
  return metrics.topGap + metrics.viewportHeight;
}

/** Bound the expanded-child footprint independently from whether a renderer currently filters it. */
function miniLayoutForNode(node: Pick<PositionedNode, "page" | "width" | "role">, index: GraphIndex, settings: KplexSettings, centerPath: string): ExpandedMiniLayout | null {
  if (settings.graphDepth !== 2 || node.role === "center") return null;
  const count = index.neighbours(node.page, "child").filter(child => child.page.path !== centerPath).slice(0, settings.maxItemCount).length;
  return count ? expandedMiniLayout(settings, node.width, count, node.role === "sibling" ? siblingScale(settings) : 1) : null;
}

/** Read a thought's full horizontal footprint for main and filtered grids using the same child-box geometry. */
export function expandedNodeWidth(node: Pick<PositionedNode, "page" | "width" | "role">, index: GraphIndex, settings: KplexSettings, centerPath: string): number {
  // Parent packing must remain independent from child-column controls. Reserve the established
  // maximum mini width even when its current renderer uses a narrower one/two-column strip.
  const envelope = node.role === "parent" ? withMiniColumnEnvelope(settings) : settings;
  return Math.max(node.width, miniLayoutForNode(node, index, envelope, centerPath)?.width ?? 0);
}

/** Reserve a stable maximum-width descendant envelope without changing any live settings. */
function withMiniColumnEnvelope(settings: KplexSettings): KplexSettings {
  return Object.assign(Object.create(settings) as KplexSettings, { childColumns: 3 });
}

/**
 * Requested signed separation between parent and adjacent lateral area edges. Density three
 * touches edges; four permits five percent of the parent width. Sparse densities retain a positive
 * whitespace target influenced by compact/minimum-link settings. Body clearance can cap overlap.
 */
export function lateralAreaGap(settings: KplexSettings, parentAreaWidth: number): number {
  const density = clamp(horizontalDensity(settings), 0.75, 4);
  if (density >= 3) return -parentAreaWidth * 0.05 * (density - 3);
  return 48 * (3 - density) * clamp(settings.minLinkLength / 18, 0.72, 1.7) * (settings.compactView ? 0.82 : 1);
}

/** Measure an allocated horizontal area including its padded maximum descendant footprint. */
function occupiedHalfWidth(nodes: PositionedNode[], minimum: number, around = 0): number {
  return Math.max(minimum, ...nodes.map(node => Math.abs(node.x - around) + node.width / 2 + 24));
}

/** Measure only card/mini bodies; conservative horizontal clearance never depends on child rows. */
function bodyHalfWidth(nodes: PositionedNode[], minimum: number, around = 0): number {
  return Math.max(minimum, ...nodes.map(node => Math.abs(node.x - around) + node.width / 2));
}

/** Include descendant boxes when clearing lateral strips, without emitting extra graph nodes. */
function occupiedNodes(nodes: PositionedNode[], index: GraphIndex, settings: KplexSettings, centerPath: string): PositionedNode[] {
  const occupied: PositionedNode[] = [...nodes];
  for (const node of nodes) {
    const box = miniLayoutForNode(node, index, settings, centerPath);
    if (!box) continue;
    occupied.push({ ...node, width: box.width, height: box.viewportHeight,
      y: node.y + node.height / 2 + box.topGap + box.viewportHeight / 2 });
  }
  return occupied;
}

/** Pack actual thought/expanded-box widths and reserve visible child height in configured rows. */
function distributeGrid(
  items: Neighbour[],
  baseY: number,
  rowDirection: -1 | 1,
  maxColumns: number,
  columnGap: number,
  rowGap: number,
  index: GraphIndex,
  settings: KplexSettings,
  role: Role,
  centerPath: string,
  deferCounts = false,
): PositionedNode[] {
  const nodes = items.map((n) => makeNode(n, role, index, settings, deferCounts));
  if (!nodes.length) return nodes;

  const rows: Array<{ nodes: PositionedNode[]; height: number; reserve: number }> = [];
  for (let start = 0; start < nodes.length; start += maxColumns) {
    const rowNodes = nodes.slice(start, start + maxColumns);
    rows.push({
      nodes: rowNodes,
      height: Math.max(...rowNodes.map((n) => n.height)),
      // Expanded child strips grow downward from their parent thought. A row therefore only
      // reserves extra height when at least one thought in that row actually has children.
      reserve: Math.max(0, ...rowNodes.map((n) => expandedChildReserve(n.page, index, settings, centerPath))),
    });
  }

  let previousY = baseY;
  let previousHeight = rows[0].height;
  let previousReserve = rows[0].reserve;

  rows.forEach((row, rowIndex) => {
    let y: number;
    if (rowIndex === 0) {
      // Parent mini-children grow back toward the center, so move only that first parent row
      // upward when it actually has expanded descendants. Child rows grow away from center.
      y = rowDirection === -1 ? baseY - row.reserve : baseY;
    } else if (rowDirection === 1) {
      y = previousY + previousHeight / 2 + previousReserve + rowGap + row.height / 2;
    } else {
      y = previousY - previousHeight / 2 - rowGap - row.reserve - row.height / 2;
    }

    const widths = row.nodes.map(node => expandedNodeWidth(node, index, settings, centerPath));
    const rowWidth = widths.reduce((sum, width) => sum + width, 0) + columnGap * Math.max(0, row.nodes.length - 1);
    let x = -rowWidth / 2;
    row.nodes.forEach((node, position) => {
      const occupiedWidth = widths[position];
      node.x = x + occupiedWidth / 2;
      node.y = y;
      x += occupiedWidth + columnGap;
    });

    previousY = y;
    previousHeight = row.height;
    previousReserve = row.reserve;
  });

  return nodes;
}

/** Stack lateral thoughts with exact scaled expanded-child reserves, then center their footprint. */
function distributeVertical(
  items: Neighbour[],
  x: number,
  gap: number,
  index: GraphIndex,
  settings: KplexSettings,
  role: Role,
  centerPath: string,
  deferCounts = false,
): PositionedNode[] {
  const nodes = items.map((n) => makeNode(n, role, index, settings, deferCounts));
  if (!nodes.length) return nodes;

  const reserveScale = role === "sibling" ? siblingScale(settings) : 1;
  const reserves = nodes.map((node) => expandedChildReserve(node.page, index, settings, centerPath) * reserveScale);
  nodes[0].x = x;
  nodes[0].y = 0;
  for (let i = 1; i < nodes.length; i += 1) {
    const previous = nodes[i - 1];
    const node = nodes[i];
    node.x = x;
    node.y = previous.y + previous.height / 2 + reserves[i - 1] + gap + node.height / 2;
  }

  // Center the complete occupied strip (including expanded children) around the Plex midline.
  const top = nodes[0].y - nodes[0].height / 2;
  const lastIndex = nodes.length - 1;
  const bottom = nodes[lastIndex].y + nodes[lastIndex].height / 2 + reserves[lastIndex];
  const shift = -(top + bottom) / 2;
  for (const node of nodes) node.y += shift;
  return nodes;
}

/** Fit occupied thought/expanded-box height within a zone while preserving its chosen alignment. */
function fitVerticalStrip(
  nodes: PositionedNode[],
  topLimit: number,
  bottomLimit: number,
  index: GraphIndex,
  settings: KplexSettings,
  centerPath: string,
  alignment: "top" | "center" | "bottom" | "midline" = "center",
): void {
  if (!nodes.length) return;
  const occupiedTop = Math.min(...nodes.map((node) => node.y - node.height / 2));
  const occupiedBottom = Math.max(...nodes.map((node) =>
    node.y + node.height / 2 + expandedChildReserve(node.page, index, settings, centerPath) * (node.role === "sibling" ? siblingScale(settings) : 1)
  ));
  const occupiedHeight = occupiedBottom - occupiedTop;
  const availableHeight = Math.max(1, bottomLimit - topLimit);
  const targetTop = occupiedHeight > availableHeight
    ? topLimit
    : alignment === "midline"
      // distributeVertical() is already centered around the active node (y = 0). Preserve
      // that semantic midline whenever the strip fits, shifting only as much as necessary
      // to keep the occupied strip inside its configured lateral bounds.
      ? clamp(occupiedTop, topLimit, bottomLimit - occupiedHeight)
      : alignment === "bottom"
        ? bottomLimit - occupiedHeight
        : alignment === "top"
          ? topLimit
          : topLimit + (availableHeight - occupiedHeight) / 2;
  const shift = targetTop - occupiedTop;
  for (const node of nodes) node.y += shift;
}

/** Calculate an editable area with a conservative width and the established fixed vertical anchor. */
function areaBoundsFor(
  key: ScrollZone,
  nodes: PositionedNode[],
  configuredHeight: number,
  resizeEdge: "top" | "bottom",
  fallback: { centerX: number; width: number; fixedEdgeY: number },
  bottomLimit?: number,
  topLimit?: number,
): ZoneAreaBounds {
  const padX = 24;
  const padY = 16;
  let left = fallback.centerX - fallback.width / 2;
  let right = fallback.centerX + fallback.width / 2;
  let minY = fallback.fixedEdgeY;
  let maxY = fallback.fixedEdgeY;
  if (nodes.length) {
    left = Math.min(left, ...nodes.map((node) => node.x - node.width / 2 - padX));
    right = Math.max(right, ...nodes.map((node) => node.x + node.width / 2 + padX));
    minY = Math.min(...nodes.map((node) => node.y - node.height / 2));
    maxY = Math.max(...nodes.map((node) => node.y + node.height / 2));
  }
  const height = topLimit !== undefined && bottomLimit !== undefined
    ? Math.max(72, bottomLimit - topLimit)
    : Math.max(72, configuredHeight);
  const top = topLimit !== undefined && bottomLimit !== undefined
    ? topLimit
    : resizeEdge === "top"
      ? (nodes.length ? maxY + padY : fallback.fixedEdgeY) - height
      : nodes.length ? minY - padY : fallback.fixedEdgeY;
  return {
    key,
    left,
    top,
    width: right - left,
    height,
    resizeEdge,
  };
}

function viewportFor(
  key: ScrollZone,
  nodes: PositionedNode[],
  maxHeight: number,
  anchor: "top" | "bottom" | "center",
  bottomLimit?: number,
  topLimit?: number,
): ZoneViewport | null {
  if (!nodes.length) return null;
  const padX = 24;
  const padY = 16;
  const minX = Math.min(...nodes.map((n) => n.x - n.width / 2));
  const maxX = Math.max(...nodes.map((n) => n.x + n.width / 2));
  const minY = Math.min(...nodes.map((n) => n.y - n.height / 2));
  const maxY = Math.max(...nodes.map((n) => n.y + n.height / 2));
  const contentTop = minY - padY;
  const contentBottom = maxY + padY;
  const contentHeight = contentBottom - contentTop;
  const boundedHeight = topLimit !== undefined && bottomLimit !== undefined
    ? Math.max(72, bottomLimit - topLimit)
    : bottomLimit === undefined
      ? Number.POSITIVE_INFINITY
      : Math.max(72, bottomLimit - contentTop);
  const height = Math.min(contentHeight, Math.max(72, maxHeight), boundedHeight);
  if (contentHeight <= height + 0.5) return null;

  let top = contentTop;
  let initialScrollTop = 0;
  if (topLimit !== undefined && bottomLimit !== undefined) {
    top = topLimit;
    initialScrollTop = Math.max(0, top - contentTop);
  } else if (bottomLimit !== undefined) {
    top = bottomLimit - height;
    initialScrollTop = Math.max(0, top - contentTop);
  } else {
    if (anchor === "bottom") top = contentBottom - height;
    else if (anchor === "center") top = clamp(-height / 2, contentTop, contentBottom - height);
    initialScrollTop = Math.max(0, top - contentTop);
  }

  return {
    key,
    left: minX - padX,
    top,
    width: maxX - minX + padX * 2,
    height,
    contentTop,
    contentHeight,
    initialScrollTop,
  };
}

/** Arrange a neighborhood with optional count-free geometry; rendered-row callers project fresh counts separately. */
export function buildScene(
  neighborhood: Neighborhood,
  index: GraphIndex,
  settings: KplexSettings,
  showCrossLinks = true,
  centerSizeOverride?: CenterNodeSize,
  deferCounts = false,
): PlexScene {
  const centerStyle = resolveNodeStyle(neighborhood.center, null, "center", settings);
  const centerLabel = index.titleFor(neighborhood.center);
  const normalCenterSize = nodeSize(`${centerStyle.prefix ?? ""}${centerLabel}`, centerStyle.fontSize ?? 30, settings, true, centerStyle.maxLabelLength ?? 30, centerStyle.maxWidth ?? settings.centralNodeStyle.maxWidth ?? settings.baseNodeStyle.maxWidth);
  const centerSize = centerSizeOverride
    ? { width: Math.max(180, centerSizeOverride.width), height: Math.max(48, centerSizeOverride.height) }
    : normalCenterSize;
  const center: PositionedNode = {
    page: neighborhood.center,
    role: "center",
    x: 0,
    y: 0,
    ...centerSize,
    style: centerStyle,
    label: centerLabel,
    ...countsForLayout(neighborhood.center, index, deferCounts),
  };

  // Compactness controls inter-node spacing and label length. Expanded view adds vertical
  // space per thought/row only when that thought actually has visible child thoughts.
  const { horizontal, vertical, spacing: legacySpacing } = spacingPolicy(settings);
  const columnGap = 50 * horizontal * legacySpacing;
  const rowGap = 36 * vertical * legacySpacing;
  const centerGap = 66 * vertical * legacySpacing;
  const sideGap = 18 * vertical * legacySpacing;

  const typicalHeight = 26;
  const parentBaseY = -(center.height / 2 + typicalHeight / 2 + centerGap);
  const childExtraGap = Math.max(42, 52 * vertical * legacySpacing);
  const childBaseY = center.height / 2 + typicalHeight / 2 + centerGap + childExtraGap;

  const parents = distributeGrid(neighborhood.parents, parentBaseY, -1, layoutColumns(settings, "parent"), columnGap, rowGap, index, settings, "parent", neighborhood.center.path, deferCounts);
  const children = distributeGrid(neighborhood.children, childBaseY, 1, layoutColumns(settings, "child"), columnGap, rowGap, index, settings, "child", neighborhood.center.path, deferCounts);

  const maxCenterHalfWidth = center.width / 2;
  let sideX = maxCenterHalfWidth + (205 * horizontal * legacySpacing);
  const left = distributeVertical(neighborhood.leftFriends, -sideX, sideGap, index, settings, "left", neighborhood.center.path, deferCounts);
  const right = distributeVertical(neighborhood.rightFriends, sideX, sideGap, index, settings, "right", neighborhood.center.path, deferCounts);

  const rightExtent = right.length ? Math.max(...right.map((n) => n.x + n.width / 2)) : maxCenterHalfWidth;
  // When there is no challenger/next strip, siblings should not reserve an empty lateral column.
  // Compact view tightens the remaining gap a little further without changing sibling scale.
  const siblingBase = right.length ? 285 : 205;
  const siblingAfterRight = right.length ? 190 : 120;
  let siblingCenterX = Math.max(
    sideX + siblingBase * horizontal * legacySpacing,
    rightExtent + siblingAfterRight * horizontal * legacySpacing,
  );
  const siblings = distributeVertical(neighborhood.siblings, siblingCenterX, sideGap, index, settings, "sibling", neighborhood.center.path, deferCounts);

  // Lateral height bands are independent of the parent height. Friends and challengers form a
  // symmetrical pair around the Plex and may extend upward into the same vertical range as
  // parents. Their lower edge stays slightly above the children. Siblings occupy a separate,
  // slightly higher band farther to the right.
  const childSectionTop = children.length
    ? Math.min(...children.map((node) => node.y - node.height / 2))
    : center.height / 2 + centerGap + childExtraGap + 12;
  const sideToChildrenGap = Math.max(30, 36 * vertical * legacySpacing);
  const friendBandHeight = Math.max(120, settings.friendMaxHeight);
  const siblingBandHeight = Math.max(120, settings.siblingMaxHeight);
  // A large embedded editor changes the visual center of gravity. Keep lateral relationship
  // strips centered beside the editor rather than deriving their band from the much lower child
  // zone; otherwise friends/challengers end up clustered around the editor's lower corners.
  const sideBottom = centerSizeOverride ? friendBandHeight / 2 : childSectionTop - sideToChildrenGap;
  const sideTop = centerSizeOverride ? -friendBandHeight / 2 : sideBottom - friendBandHeight;
  // Sparse lateral relationship lists are centered on the active node's horizontal midline:
  // one node sits level with the center, two straddle it evenly, and larger lists grow
  // outward in both directions. Only shift the strip when it reaches the zone bounds.
  fitVerticalStrip(left, sideTop, sideBottom, index, settings, neighborhood.center.path, "midline");
  fitVerticalStrip(right, sideTop, sideBottom, index, settings, neighborhood.center.path, "midline");

  const siblingLift = Math.max(58, 72 * vertical * legacySpacing);
  const siblingBottom = centerSizeOverride ? siblingBandHeight / 2 : sideBottom - siblingLift;
  const siblingTop = centerSizeOverride ? -siblingBandHeight / 2 : siblingBottom - siblingBandHeight;
  fitVerticalStrip(siblings, siblingTop, siblingBottom, index, settings, neighborhood.center.path, centerSizeOverride ? "midline" : "center");

  // Lateral x ownership belongs to the parent band and horizontal density. Child columns,
  // descendant rows and vertical fitting may change the lower band, never this horizontal anchor.
  const envelopeSettings = withMiniColumnEnvelope(settings);
  const parentEnvelope = occupiedNodes(parents, index, envelopeSettings, neighborhood.center.path);
  const siblingEnvelope = occupiedNodes(siblings, index, envelopeSettings, neighborhood.center.path);
  const parentAreaHalfWidth = parents.length
    ? occupiedHalfWidth(parentEnvelope, center.width / 2 + 24)
    : 170;
  const parentBodyHalfWidth = bodyHalfWidth(parentEnvelope, center.width / 2);
  // Both lateral strips use the same width. Since their current x has opposite signs, measure
  // each around its own anchor before combining to preserve left/right symmetry.
  const lateralAreaHalfWidth = Math.max(
    occupiedHalfWidth(occupiedNodes(left, index, envelopeSettings, neighborhood.center.path), 115, -sideX),
    occupiedHalfWidth(occupiedNodes(right, index, envelopeSettings, neighborhood.center.path), 115, sideX),
  );
  const lateralBodyHalfWidth = Math.max(
    bodyHalfWidth(occupiedNodes(left, index, envelopeSettings, neighborhood.center.path), 0, -sideX),
    bodyHalfWidth(occupiedNodes(right, index, envelopeSettings, neighborhood.center.path), 0, sideX),
  );
  const siblingAreaHalfWidth = occupiedHalfWidth(siblingEnvelope, 110, siblingCenterX);
  const siblingBodyHalfWidth = bodyHalfWidth(siblingEnvelope, 0, siblingCenterX);
  const margin = lateralAreaGap(settings, parentAreaHalfWidth * 2);
  if (parents.length) sideX = parentAreaHalfWidth + lateralAreaHalfWidth + margin;
  sideX = Math.max(sideX, parentBodyHalfWidth + lateralBodyHalfWidth + 4);
  for (const node of left) node.x = -sideX;
  for (const node of right) node.x = sideX;

  if (parents.length || right.length) {
    siblingCenterX = right.length
      ? sideX + lateralAreaHalfWidth + siblingAreaHalfWidth + margin
      : parentAreaHalfWidth + siblingAreaHalfWidth + margin;
  }
  siblingCenterX = Math.max(siblingCenterX, parentBodyHalfWidth + siblingBodyHalfWidth + 4,
    right.length ? sideX + lateralBodyHalfWidth + siblingBodyHalfWidth + 4 : 0);
  for (const node of siblings) node.x = siblingCenterX;

  // Expanded boxes belong to their thought's existing scroll area. Include their measured
  // extents so the same finite column footprint fits when a zone filter later repacks that row.
  const occupiedParents = occupiedNodes(parents, index, settings, neighborhood.center.path);
  const occupiedChildren = occupiedNodes(children, index, settings, neighborhood.center.path);
  const occupiedLeft = occupiedNodes(left, index, settings, neighborhood.center.path);
  const occupiedRight = occupiedNodes(right, index, settings, neighborhood.center.path);
  const occupiedSiblings = occupiedNodes(siblings, index, settings, neighborhood.center.path);
  const zoneViewports: Partial<Record<ScrollZone, ZoneViewport>> = {};
  const parentViewport = viewportFor("parent", occupiedParents, settings.parentMaxHeight, "bottom");
  const childViewport = viewportFor("child", occupiedChildren, settings.childMaxHeight, "top");
  const leftViewport = viewportFor("left", occupiedLeft, settings.friendMaxHeight, "top", sideBottom, sideTop);
  const rightViewport = viewportFor("right", occupiedRight, settings.friendMaxHeight, "top", sideBottom, sideTop);
  const siblingViewport = viewportFor("sibling", occupiedSiblings, settings.siblingMaxHeight, "top", siblingBottom, siblingTop);
  if (parentViewport) {
    // Filtered parent rows reuse the canonical mini-width envelope. A narrower currently rendered
    // child strip must not shrink its scroll box below that row pitch or move the area's x bounds.
    parentViewport.left = -parentAreaHalfWidth;
    parentViewport.width = parentAreaHalfWidth * 2;
    zoneViewports.parent = parentViewport;
  }
  if (childViewport) zoneViewports.child = childViewport;
  if (leftViewport) zoneViewports.left = leftViewport;
  if (rightViewport) zoneViewports.right = rightViewport;
  if (siblingViewport) zoneViewports.sibling = siblingViewport;

  // The configured relationship areas exist independently of whether their contents currently
  // overflow. Keeping these bounds separate from zoneViewports lets the Plex expose the existing
  // max-height settings as direct-manipulation affordances even for sparse relationship lists.
  const zoneAreas: Partial<Record<ScrollZone, ZoneAreaBounds>> = {};
  const parentAreaBottom = parentBaseY + typicalHeight / 2 + 16;
  const childAreaTop = childBaseY - typicalHeight / 2 - 16;
  zoneAreas.parent = areaBoundsFor("parent", occupiedParents, settings.parentMaxHeight, "top", { centerX: 0, width: parentAreaHalfWidth * 2, fixedEdgeY: parentAreaBottom });
  zoneAreas.child = areaBoundsFor("child", occupiedChildren, settings.childMaxHeight, "bottom", { centerX: 0, width: 440, fixedEdgeY: childAreaTop });
  zoneAreas.left = areaBoundsFor("left", occupiedLeft, settings.friendMaxHeight, "top", { centerX: -sideX, width: lateralAreaHalfWidth * 2, fixedEdgeY: sideBottom }, sideBottom, sideTop);
  zoneAreas.right = areaBoundsFor("right", occupiedRight, settings.friendMaxHeight, "top", { centerX: sideX, width: lateralAreaHalfWidth * 2, fixedEdgeY: sideBottom }, sideBottom, sideTop);
  zoneAreas.sibling = areaBoundsFor("sibling", occupiedSiblings, settings.siblingMaxHeight, "top", { centerX: siblingCenterX, width: siblingAreaHalfWidth * 2, fixedEdgeY: siblingBottom }, siblingBottom, siblingTop);

  const nodes = [center, ...parents, ...children, ...left, ...right, ...siblings];
  const edges: PositionedEdge[] = [];
  const from = (items: Neighbour[], role: Role) => {
    items.forEach((n, i) => edges.push({
      id: `${role}:${n.page.path}:${i}`,
      sourcePath: neighborhood.center.path,
      targetPath: n.page.path,
      role,
      relationType: n.relationType,
      typeDefinition: n.typeDefinition,
      direction: n.linkDirection,
      style: resolveLinkStyle(n, settings),
    }));
  };
  from(neighborhood.parents, "parent");
  from(neighborhood.children, "child");
  from(neighborhood.leftFriends, "left");
  from(neighborhood.rightFriends, "right");

  // Siblings exist only because they share one or more currently visible parents with the center.
  // Those structural parent→sibling links are part of the sibling presentation itself and must
  // remain visible even when optional cross-links are disabled.
  appendSiblingParentLinks(nodes, edges, index, settings, neighborhood.center.path);
  if (showCrossLinks) appendVisibleCrossLinks(nodes, edges, index, settings, neighborhood.center.path);

  return { nodes, edges, zoneViewports, zoneAreas };
}

function appendSiblingParentLinks(
  nodes: PositionedNode[],
  edges: PositionedEdge[],
  index: GraphIndex,
  settings: KplexSettings,
  centerPath: string,
): void {
  const siblingPaths = new Set(nodes.filter((node) => node.role === "sibling").map((node) => node.page.path));
  if (!siblingPaths.size) return;
  for (const parent of nodes) {
    if (parent.role !== "parent" || parent.page.path === centerPath || parent.page.transient) continue;
    for (const relation of index.visibleRelationshipsWithin(parent.page, siblingPaths)) {
      if (relation.role !== "child") continue;
      edges.push({
        id: `sibling-parent:${parent.page.path}:${relation.page.path}`,
        sourcePath: parent.page.path,
        targetPath: relation.page.path,
        role: "child",
        relationType: relation.relationType,
        typeDefinition: relation.typeDefinition,
        direction: relation.linkDirection,
        style: resolveLinkStyle(relation, settings),
      });
    }
  }
}

/** Append semantic links between supplied visible persistent nodes, preserving existing structural
 * pairs. Mutates only the caller-owned edge array; the caller chooses full-scene or clipped membership.
 * Iterating adjacency avoids an O(visible²) pair scan and never queries section/transient sources. */
export function appendVisibleCrossLinks(
  nodes: PositionedNode[],
  edges: PositionedEdge[],
  index: GraphIndex,
  settings: KplexSettings,
  centerPath: string,
): void {
  const visibleByPath = new Map<string, GraphPage>();
  for (const node of nodes) {
    if (node.page.path === centerPath || node.page.transient) continue;
    visibleByPath.set(node.page.path, node.page);
  }
  const visiblePaths = new Set(visibleByPath.keys());
  if (visiblePaths.size < 2) return;

  const seenPairs = new Set<string>();
  // Structural sibling-parent links are rendered regardless of the cross-link filter. Seed the
  // de-duplication set with all already-rendered non-central pairs so enabling cross-links adds
  // only additional relationships instead of drawing a second connector on top of them.
  for (const edge of edges) {
    if (edge.sourcePath === centerPath || edge.targetPath === centerPath) continue;
    const pairKey = edge.sourcePath < edge.targetPath
      ? `${edge.sourcePath}\u0000${edge.targetPath}`
      : `${edge.targetPath}\u0000${edge.sourcePath}`;
    seenPairs.add(pairKey);
  }
  for (const source of visibleByPath.values()) {
    for (const relation of index.visibleRelationshipsWithin(source, visiblePaths)) {
      if (source.path === relation.page.path) continue;
      const pairKey = source.path < relation.page.path
        ? `${source.path}\u0000${relation.page.path}`
        : `${relation.page.path}\u0000${source.path}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      edges.push({
        id: `cross:${source.path}:${relation.page.path}:${relation.role}`,
        sourcePath: source.path,
        targetPath: relation.page.path,
        role: relation.role,
        relationType: relation.relationType,
        typeDefinition: relation.typeDefinition,
        direction: relation.linkDirection,
        style: resolveLinkStyle(relation, settings),
        isCrossLink: true,
      });
    }
  }
}

/** Runtime layout for central-note heading expansion. Section headings form an outline tree
 * below the normal Plex. Each visible section still owns a local four-gate relationship cluster.
 * Hidden descendants of a folded section project their relationships upward into the nearest
 * visible folded ancestor. Nothing here is persisted in GraphIndex. The central scene's
 * editable area controls remain available independently of expanded sections. Optional deferred
 * counts preserve section-owned overrides while ordinary rendered rows project fresh gates. */
export function buildSectionExpandedScene(
  expansion: import("../index/SectionExpansion").CentralSectionExpansion,
  index: GraphIndex,
  settings: KplexSettings,
  expandedSectionIds: ReadonlySet<string> = new Set(expansion.sections.filter((section) => section.childIds.length).map((section) => section.id)),
  showCrossLinks = true,
  centerSizeOverride?: CenterNodeSize,
  deferCounts = false,
): PlexScene {
  const sectionPaths = new Set(expansion.sections.map((section) => section.page.path));
  const baseNeighborhood: Neighborhood = {
    ...expansion.centerNeighborhood,
    children: expansion.centerNeighborhood.children.filter((item) => !sectionPaths.has(item.page.path)),
  };
  // Add cross-links after section/runtime relationship nodes are appended, so the visibility rule
  // is truly based on the final scene rather than only on the unexpanded center neighbourhood.
  const scene = buildScene(baseNeighborhood, index, settings, false, centerSizeOverride, deferCounts);
  const byId = new Map(expansion.sections.map((section) => [section.id, section] as const));
  const roots = expansion.sections.filter((section) => !section.parentId);
  const visible: Array<{ section: import("../index/SectionExpansion").ExpandedSection; depth: number }> = [];
  const visit = (section: import("../index/SectionExpansion").ExpandedSection, depth: number) => {
    visible.push({ section, depth });
    if (!expandedSectionIds.has(section.id)) return;
    for (const childId of section.childIds) {
      const child = byId.get(childId);
      if (child) visit(child, depth + 1);
    }
  };
  for (const root of roots) visit(root, 0);

  type SourcedNeighbour = { relation: Neighbour; sourceSectionPath: string };
  const collectOwn = (section: import("../index/SectionExpansion").ExpandedSection): Record<"parent" | "child" | "left" | "right", SourcedNeighbour[]> => ({
    parent: section.neighborhood.parents.map((relation) => ({ relation, sourceSectionPath: section.page.path })),
    child: section.neighborhood.children.map((relation) => ({ relation, sourceSectionPath: section.page.path })),
    left: section.neighborhood.leftFriends.map((relation) => ({ relation, sourceSectionPath: section.page.path })),
    right: section.neighborhood.rightFriends.map((relation) => ({ relation, sourceSectionPath: section.page.path })),
  });
  const mergeRelations = (groups: Array<Record<"parent" | "child" | "left" | "right", SourcedNeighbour[]>>) => {
    const out: Record<"parent" | "child" | "left" | "right", SourcedNeighbour[]> = { parent: [], child: [], left: [], right: [] };
    for (const role of ["parent", "child", "left", "right"] as const) {
      const seen = new Map<string, SourcedNeighbour>();
      for (const group of groups) {
        for (const item of group[role]) {
          const actual = item.relation.page.transient?.actualPath ?? item.relation.page.path;
          const key = `${role}:${actual}`;
          const previous = seen.get(key);
          if (!previous || (previous.relation.relationType === RelationType.INFERRED && item.relation.relationType === RelationType.DEFINED)) seen.set(key, item);
        }
      }
      out[role] = [...seen.values()];
    }
    return out;
  };
  const collectForVisibleSection = (section: import("../index/SectionExpansion").ExpandedSection) => {
    const groups = [collectOwn(section)];
    if (!expandedSectionIds.has(section.id)) {
      const addDescendants = (parent: import("../index/SectionExpansion").ExpandedSection) => {
        for (const childId of parent.childIds) {
          const child = byId.get(childId);
          if (!child) continue;
          groups.push(collectOwn(child));
          addDescendants(child);
        }
      };
      addDescendants(section);
    }
    return mergeRelations(groups);
  };

  const ordinaryChildren = scene.nodes.filter((node) => node.role === "child");
  const childViewport = scene.zoneViewports.child;
  const normalBottom = childViewport
    ? childViewport.top + childViewport.height
    : ordinaryChildren.length
      ? Math.max(...ordinaryChildren.map((node) => node.y + node.height / 2))
      : 90;
  // Section expansion has its own much steeper density curve. Density 1 deliberately matches the
  // previous density-4 appearance; density 4 becomes a genuinely compact outline with short tree
  // branches instead of merely shaving a few pixels from a spacious layout.
  const verticalDensityT = (clamp(settings.compactingFactor, 1, 4) - 1) / 3;
  const horizontalDensityT = (clamp(horizontalDensity(settings), 1, 4) - 1) / 3;
  const { spacing } = spacingPolicy(settings);
  const compact = settings.compactView ? 0.82 : 1;
  /** Preserve each established section curve while applying the selected axis and spacing target. */
  const mix = (lo: number, hi: number, axis: "horizontal" | "vertical" = "vertical", relation = false): number => {
    const progress = (axis === "horizontal" ? horizontalDensityT : verticalDensityT) * (relation ? 5 / 12 : 1);
    return (lo + (hi - lo) * progress) * spacing * compact;
  };

  const sectionStartGap = mix(78, 26);
  const depthIndent = mix(92, 28, "horizontal");
  const verticalGap = mix(48, 20);
  const relationHorizontalGap = mix(60, 24, "horizontal", true);
  const relationLateralStep = mix(36, 22, "vertical", true);
  const relationVerticalGap = mix(66, 38, "vertical", true);
  const relationRowStep = mix(38, 22, "vertical", true);
  const relationMinHorizontalGap = mix(8, 4, "horizontal", true);
  const relationMinVerticalGap = mix(8, 4, "vertical", true);
  const startY = normalBottom + sectionStartGap;
  const centerNode = scene.nodes.find((node) => node.role === "center");
  const centerStructuralX = centerNode ? centerNode.x - centerNode.width / 2 + 20 : -80;
  const rootLeft = centerStructuralX + mix(92, 24, "horizontal");
  const sectionTreeEdges: SectionTreeEdge[] = [];
  const sectionNodeById = new Map<string, PositionedNode>();
  let cursorY = startY;

  /** Measure an outline heading and preserve separate horizontal-indent and vertical-size axes. */
  const makeSectionNode = (section: import("../index/SectionExpansion").ExpandedSection, depth: number, relations: ReturnType<typeof collectForVisibleSection>): PositionedNode => {
    const pseudo: Neighbour = { page: section.page, role: "child", relationType: RelationType.DEFINED, typeDefinition: "section", linkDirection: null };
    const node = makeNode(pseudo, "child", index, settings, deferCounts);
    const maxSectionWidth = Math.max(172, node.style.maxWidth ?? settings.baseNodeStyle.maxWidth ?? 286);
    node.width = Math.max(172, Math.min(maxSectionWidth, node.width + (16 + (2 - 16) * horizontalDensityT)));
    node.height = Math.max(32, node.height + (3 + (-1 - 3) * verticalDensityT));
    // x is the card centre; rootLeft is the left edge of the first heading card.
    node.x = rootLeft + node.width / 2 + depth * depthIndent;
    node.gateStats = {
      top: { visibleCount: relations.parent.length, hasAny: relations.parent.length > 0 },
      bottom: { visibleCount: relations.child.length, hasAny: relations.child.length > 0 },
      left: { visibleCount: relations.left.length, hasAny: relations.left.length > 0 },
      right: { visibleCount: relations.right.length, hasAny: relations.right.length > 0 },
    };
    return node;
  };

  /** Place one bounded section-owned relation group with actual-width and non-touching rows. */
  const addRelationGroup = (sectionNode: PositionedNode, items: SourcedNeighbour[], role: Exclude<Role, "sibling">) => {
    const nodes = items.map((item) => makeNode(item.relation, role, index, settings, deferCounts));
    const horizontal = role === "left" || role === "previous" || role === "right" || role === "next";
    const direction = role === "left" || role === "previous" ? -1 : role === "right" || role === "next" ? 1 : 0;

    if (horizontal) {
      // Side neighbours form a vertical stack. At maximum density, never allow the thought pills
      // themselves to touch/overlap: preserve a small positive gap even when their rendered height
      // is larger than the nominal density step.
      const maxHeight = Math.max(0, ...nodes.map((node) => node.height));
      const lateralStep = Math.max(relationLateralStep, maxHeight + relationMinVerticalGap);
      nodes.forEach((node, itemIndex) => {
        node.x = sectionNode.x + direction * (sectionNode.width / 2 + node.width / 2 + relationHorizontalGap);
        node.y = sectionNode.y + (itemIndex - (nodes.length - 1) / 2) * lateralStep;
      });
    } else {
      // Parents/children use their main-zone column limits. Position each row from actual rendered
      // node widths instead of a fixed centre-to-centre step, so long labels can never
      // make adjacent pills overlap. Row spacing receives the same minimum-air guarantee.
      const columns = Math.min(layoutColumns(settings, role === "parent" ? "parent" : "child"), Math.max(1, nodes.length));
      const rows = Math.ceil(nodes.length / columns);
      let rowOffset = 0;
      for (let row = 0; row < rows; row++) {
        const start = row * columns;
        const rowNodes = nodes.slice(start, start + columns);
        const totalWidth = rowNodes.reduce((sum, node) => sum + node.width, 0) + relationMinHorizontalGap * Math.max(0, rowNodes.length - 1);
        let x = sectionNode.x - totalWidth / 2;
        const rowHeight = Math.max(0, ...rowNodes.map((node) => node.height));
        const rowStep = Math.max(relationRowStep, rowHeight + relationMinVerticalGap);
        for (const node of rowNodes) {
          node.x = x + node.width / 2;
          node.y = sectionNode.y + (role === "parent" ? -1 : 1) * (Math.max(relationVerticalGap, (sectionNode.height + rowHeight) / 2 + relationMinVerticalGap) + rowOffset);
          x += node.width + relationMinHorizontalGap;
        }
        rowOffset += rowStep;
      }
    }

    nodes.forEach((node, itemIndex) => {
      scene.nodes.push(node);
      const sourced = items[itemIndex];
      scene.edges.push({
        id: `section-edge:${sectionNode.page.path}:${node.page.path}:${role}:${itemIndex}`,
        sourcePath: sectionNode.page.path,
        targetPath: node.page.path,
        explanationSourcePath: sourced.sourceSectionPath,
        explanationTargetPath: sourced.relation.page.path,
        role,
        relationType: sourced.relation.relationType,
        typeDefinition: sourced.relation.typeDefinition,
        direction: sourced.relation.linkDirection,
        style: resolveLinkStyle(sourced.relation, settings),
      });
    });
  };

  for (const { section, depth } of visible) {
    const relations = collectForVisibleSection(section);
    const node = makeSectionNode(section, depth, relations);
    // Lay out the finite cluster privately, then translate its actual occupied extents. Nominal
    // row counts cannot reserve wrapped rows or configured 1–7-column clusters safely.
    node.y = 0;
    const clusterStart = scene.nodes.length;
    addRelationGroup(node, relations.parent, "parent");
    addRelationGroup(node, relations.child, "child");
    const gridNodes = scene.nodes.slice(clusterStart);
    addRelationGroup(node, relations.left, "left");
    addRelationGroup(node, relations.right, "right");
    const cluster = [node, ...scene.nodes.slice(clusterStart)];
    for (const lateral of cluster) {
      if (lateral.role !== "left" && lateral.role !== "right") continue;
      const direction = lateral.role === "left" ? -1 : 1;
      let distance = Math.abs(lateral.x - node.x);
      for (const obstacle of gridNodes) {
        if (obstacle.role !== "parent") continue;
        distance = Math.max(distance, direction * (obstacle.x - node.x) + (obstacle.width + lateral.width) / 2 + relationHorizontalGap);
      }
      lateral.x = node.x + direction * distance;
    }
    // Child columns govern their own row width. Keep them below the actual lateral strip rather
    // than widening the lateral anchor to clear children; parent columns alone own that x fence.
    const localChildren = gridNodes.filter(item => item.role === "child");
    const lateralNodes = cluster.filter(item => item.role === "left" || item.role === "right");
    if (localChildren.length && lateralNodes.length) {
      const lateralBottom = Math.max(...lateralNodes.map(item => item.y + item.height / 2));
      const childTop = Math.min(...localChildren.map(item => item.y - item.height / 2));
      const childShift = Math.max(0, lateralBottom + verticalGap - childTop);
      for (const child of localChildren) child.y += childShift;
    }
    const clusterTop = Math.min(...cluster.map(item => item.y - item.height / 2));
    const clusterBottom = Math.max(...cluster.map(item => item.y + item.height / 2));
    const shift = cursorY - clusterTop;
    for (const item of cluster) item.y += shift;
    cursorY += clusterBottom - clusterTop + verticalGap;
    sectionNodeById.set(section.id, node);
    scene.nodes.push(node);
  }

  for (const { section } of visible) {
    const childNode = sectionNodeById.get(section.id);
    if (!childNode) continue;
    const parentNode = section.parentId ? sectionNodeById.get(section.parentId) : centerNode;
    if (!parentNode) continue;
    sectionTreeEdges.push({
      id: `section-tree:${parentNode.page.path}:${childNode.page.path}`,
      sourcePath: parentNode.page.path,
      targetPath: childNode.page.path,
    });
  }

  scene.sectionTreeEdges = sectionTreeEdges;
  if (showCrossLinks) appendVisibleCrossLinks(scene.nodes, scene.edges, index, settings, expansion.centerNeighborhood.center.path);
  return scene;
}
