/**
 * Host-bound Plex geometry: arrange semantic neighborhoods into presentation zones.
 * Area resize bounds exist for empty groups independently of overflow viewports;
 * callers own interaction, settings persistence and camera transforms.
 */
import type { ExcaliBrainSettings } from "../settings";
import type { GraphPage, Neighborhood, Neighbour, NodeStyle, PositionedEdge, PositionedNode, Role, ScrollZone } from "../types";
import { RelationType } from "../types";
import { resolveLinkStyle, resolveNodeStyle } from "../index/style";
import type { GraphIndex } from "../index/GraphIndex";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export function siblingScale(settings: ExcaliBrainSettings): number {
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

export function gateDiameter(style: NodeStyle): number {
  // Keep a generous hit target in CSS, but visually the gate should remain subordinate to
  // the thought itself. gateRadius is retained as the legacy-compatible source setting.
  return Math.max(5, (style.gateRadius ?? 5) * 1.05);
}

export function effectiveLabelLimit(settings: ExcaliBrainSettings, configured = 30, center = false): number {
  // Compactness changes only how much text is shown and how tightly thoughts are spaced.
  // Node interior padding remains constant in every view.
  const density = clamp(settings.compactingFactor / 1.5, 0.5, 2);
  const base = Math.max(8, configured);
  const scaled = Math.round(base / density);
  return clamp(scaled + (center ? 8 : 0), center ? 18 : 8, center ? 72 : 52);
}

function nodeSize(label: string, fontSize: number, settings: ExcaliBrainSettings, center = false, configuredMax = 30): { width: number; height: number } {
  const visibleLength = Math.min(label.length, effectiveLabelLimit(settings, configuredMax, center));
  const minWidth = center ? 180 : 112;
  const maxWidth = center ? 370 : 286;
  const width = clamp(70 + visibleLength * Math.max(4.8, fontSize * 0.29), minWidth, maxWidth);

  // These are the tight/compact paddings, now used everywhere.
  return { width, height: center ? 48 : 26 };
}

function makeNode(
  n: Neighbour,
  role: Role,
  index: GraphIndex,
  settings: ExcaliBrainSettings,
): PositionedNode {
  const resolved = resolveNodeStyle(n.page, n, role, settings);
  const scale = role === "sibling" ? siblingScale(settings) : 1;
  const style: NodeStyle = scale === 1 ? resolved : {
    ...resolved,
    fontSize: (resolved.fontSize ?? 18) * scale,
    gateRadius: (resolved.gateRadius ?? settings.baseNodeStyle.gateRadius ?? 5) * scale,
  };
  const label = index.titleFor(n.page);
  const baseSize = nodeSize(`${resolved.prefix ?? ""}${label}`, resolved.fontSize ?? 18, settings, false, resolved.maxLabelLength ?? 30);
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
    neighbourCount: index.neighbourCount(n.page),
    gateStats: index.gateStats(n.page),
  };
}

const EXPANDED_CLUSTER_TOP_GAP = 14;
const EXPANDED_MINI_ROW_HEIGHT = 28;
const EXPANDED_MINI_COLUMNS = 3;
const EXPANDED_MINI_VISIBLE_ROWS = 2;

export function expandedChildReserve(page: GraphPage, index: GraphIndex, settings: ExcaliBrainSettings, centerPath: string): number {
  if (settings.graphDepth !== 2) return 0;
  const childCount = index.neighbours(page, "child")
    .filter((child) => child.page.path !== centerPath)
    .slice(0, settings.maxItemCount).length;
  if (!childCount) return 0;
  const visibleRows = Math.min(EXPANDED_MINI_VISIBLE_ROWS, Math.ceil(childCount / EXPANDED_MINI_COLUMNS));
  return EXPANDED_CLUSTER_TOP_GAP + visibleRows * EXPANDED_MINI_ROW_HEIGHT;
}

function distributeGrid(
  items: Neighbour[],
  baseY: number,
  rowDirection: -1 | 1,
  maxColumns: number,
  columnGap: number,
  rowGap: number,
  index: GraphIndex,
  settings: ExcaliBrainSettings,
  role: Role,
  centerPath: string,
): PositionedNode[] {
  const nodes = items.map((n) => makeNode(n, role, index, settings));
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

    const rowWidth = row.nodes.reduce((sum, n) => sum + n.width, 0) + columnGap * Math.max(0, row.nodes.length - 1);
    let x = -rowWidth / 2;
    for (const node of row.nodes) {
      node.x = x + node.width / 2;
      node.y = y;
      x += node.width + columnGap;
    }

    previousY = y;
    previousHeight = row.height;
    previousReserve = row.reserve;
  });

  return nodes;
}

function distributeVertical(
  items: Neighbour[],
  x: number,
  gap: number,
  index: GraphIndex,
  settings: ExcaliBrainSettings,
  role: Role,
  centerPath: string,
): PositionedNode[] {
  const nodes = items.map((n) => makeNode(n, role, index, settings));
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

function fitVerticalStrip(
  nodes: PositionedNode[],
  topLimit: number,
  bottomLimit: number,
  index: GraphIndex,
  settings: ExcaliBrainSettings,
  centerPath: string,
  alignment: "top" | "center" | "bottom" | "midline" = "center",
): void {
  if (!nodes.length) return;
  const occupiedTop = Math.min(...nodes.map((node) => node.y - node.height / 2));
  const occupiedBottom = Math.max(...nodes.map((node) =>
    node.y + node.height / 2 + expandedChildReserve(node.page, index, settings, centerPath)
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

/** Build the deterministic Plex layout, optionally reserving an explicit center-node rectangle. */
/** Arrange one neighborhood, retaining all editable areas while creating scroll viewports only for overflow. */
export function buildScene(
  neighborhood: Neighborhood,
  index: GraphIndex,
  settings: ExcaliBrainSettings,
  showCrossLinks = true,
  centerSizeOverride?: CenterNodeSize,
): PlexScene {
  const centerStyle = resolveNodeStyle(neighborhood.center, null, "center", settings);
  const centerLabel = index.titleFor(neighborhood.center);
  const normalCenterSize = nodeSize(`${centerStyle.prefix ?? ""}${centerLabel}`, centerStyle.fontSize ?? 30, settings, true, centerStyle.maxLabelLength ?? 30);
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
    neighbourCount: index.neighbourCount(neighborhood.center),
    gateStats: index.gateStats(neighborhood.center),
  };

  // Compactness controls inter-node spacing and label length. Expanded view adds vertical
  // space per thought/row only when that thought actually has visible child thoughts.
  const compactFactor = clamp(1.35 / settings.compactingFactor, 0.38, 1.35);
  const legacySpacing = clamp(settings.minLinkLength / 18, 0.72, 1.7);
  const columnGap = 50 * compactFactor * legacySpacing;
  const rowGap = 36 * compactFactor * legacySpacing;
  const centerGap = 66 * compactFactor * legacySpacing;
  const sideGap = 18 * compactFactor * legacySpacing;

  const typicalHeight = 26;
  const parentBaseY = -(center.height / 2 + typicalHeight / 2 + centerGap);
  const childExtraGap = Math.max(42, 52 * compactFactor * legacySpacing);
  const childBaseY = center.height / 2 + typicalHeight / 2 + centerGap + childExtraGap;

  const parents = distributeGrid(neighborhood.parents, parentBaseY, -1, Math.max(1, Math.min(2, Math.round(settings.parentColumns))), columnGap, rowGap, index, settings, "parent", neighborhood.center.path);
  const children = distributeGrid(neighborhood.children, childBaseY, 1, Math.max(1, Math.min(7, Math.round(settings.childColumns))), columnGap, rowGap, index, settings, "child", neighborhood.center.path);

  const maxCenterHalfWidth = center.width / 2;
  const sideX = maxCenterHalfWidth + (205 * compactFactor * legacySpacing);
  const left = distributeVertical(neighborhood.leftFriends, -sideX, sideGap, index, settings, "left", neighborhood.center.path);
  const right = distributeVertical(neighborhood.rightFriends, sideX, sideGap, index, settings, "right", neighborhood.center.path);

  const rightExtent = right.length ? Math.max(...right.map((n) => n.x + n.width / 2)) : maxCenterHalfWidth;
  // When there is no challenger/next strip, siblings should not reserve an empty lateral column.
  // Compact view tightens the remaining gap a little further without changing sibling scale.
  const siblingBase = right.length ? 285 : 205;
  const siblingAfterRight = right.length ? 190 : 120;
  const compactSiblingMultiplier = settings.compactView ? 0.82 : 1;
  const siblingCenterX = Math.max(
    sideX + siblingBase * compactFactor * legacySpacing * compactSiblingMultiplier,
    rightExtent + siblingAfterRight * compactFactor * legacySpacing * compactSiblingMultiplier,
  );
  const siblings = distributeVertical(neighborhood.siblings, siblingCenterX, sideGap, index, settings, "sibling", neighborhood.center.path);

  // Lateral zones are independent of the parent zone. Friends and challengers form a
  // symmetrical pair around the Plex and may extend upward into the same vertical range as
  // parents. Their lower edge stays slightly above the children. Siblings occupy a separate,
  // slightly higher band farther to the right.
  const childSectionTop = children.length
    ? Math.min(...children.map((node) => node.y - node.height / 2))
    : center.height / 2 + centerGap + childExtraGap + 12;
  const sideToChildrenGap = Math.max(30, 36 * compactFactor * legacySpacing);
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

  const siblingLift = Math.max(58, 72 * compactFactor * legacySpacing);
  const siblingBottom = centerSizeOverride ? siblingBandHeight / 2 : sideBottom - siblingLift;
  const siblingTop = centerSizeOverride ? -siblingBandHeight / 2 : siblingBottom - siblingBandHeight;
  fitVerticalStrip(siblings, siblingTop, siblingBottom, index, settings, neighborhood.center.path, centerSizeOverride ? "midline" : "center");

  const zoneViewports: Partial<Record<ScrollZone, ZoneViewport>> = {};
  const parentViewport = viewportFor("parent", parents, settings.parentMaxHeight, "bottom");
  const childViewport = viewportFor("child", children, settings.childMaxHeight, "top");
  const leftViewport = viewportFor("left", left, settings.friendMaxHeight, "top", sideBottom, sideTop);
  const rightViewport = viewportFor("right", right, settings.friendMaxHeight, "top", sideBottom, sideTop);
  const siblingViewport = viewportFor("sibling", siblings, settings.siblingMaxHeight, "top", siblingBottom, siblingTop);
  if (parentViewport) zoneViewports.parent = parentViewport;
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
  zoneAreas.parent = areaBoundsFor("parent", parents, settings.parentMaxHeight, "top", { centerX: 0, width: 340, fixedEdgeY: parentAreaBottom });
  zoneAreas.child = areaBoundsFor("child", children, settings.childMaxHeight, "bottom", { centerX: 0, width: 440, fixedEdgeY: childAreaTop });
  zoneAreas.left = areaBoundsFor("left", left, settings.friendMaxHeight, "top", { centerX: -sideX, width: 230, fixedEdgeY: sideBottom }, sideBottom, sideTop);
  zoneAreas.right = areaBoundsFor("right", right, settings.friendMaxHeight, "top", { centerX: sideX, width: 230, fixedEdgeY: sideBottom }, sideBottom, sideTop);
  zoneAreas.sibling = areaBoundsFor("sibling", siblings, settings.siblingMaxHeight, "top", { centerX: siblingCenterX, width: 220, fixedEdgeY: siblingBottom }, siblingBottom, siblingTop);

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
  settings: ExcaliBrainSettings,
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

/** Add each semantic relationship between already-visible, non-central persistent nodes exactly
 * once. Iterating each visible page's actual adjacency list avoids an O(visible²) pair scan. */
function appendVisibleCrossLinks(
  nodes: PositionedNode[],
  edges: PositionedEdge[],
  index: GraphIndex,
  settings: ExcaliBrainSettings,
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
 * editable area controls remain available independently of expanded sections. */
export function buildSectionExpandedScene(
  expansion: import("../index/SectionExpansion").CentralSectionExpansion,
  index: GraphIndex,
  settings: ExcaliBrainSettings,
  expandedSectionIds: ReadonlySet<string> = new Set(expansion.sections.filter((section) => section.childIds.length).map((section) => section.id)),
  showCrossLinks = true,
  centerSizeOverride?: CenterNodeSize,
): PlexScene {
  const sectionPaths = new Set(expansion.sections.map((section) => section.page.path));
  const baseNeighborhood: Neighborhood = {
    ...expansion.centerNeighborhood,
    children: expansion.centerNeighborhood.children.filter((item) => !sectionPaths.has(item.page.path)),
  };
  // Add cross-links after section/runtime relationship nodes are appended, so the visibility rule
  // is truly based on the final scene rather than only on the unexpanded center neighbourhood.
  const scene = buildScene(baseNeighborhood, index, settings, false, centerSizeOverride);
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
  const sectionDensity = clamp(settings.compactingFactor, 1, 4);
  const densityT = (sectionDensity - 1) / 3;
  const mix = (lo: number, hi: number): number => lo + (hi - lo) * densityT;

  // Keep the outline itself very compact at high density, but do not squeeze the semantic
  // neighbours attached to a section nearly as aggressively. User testing showed that the old
  // density 2.25 relationship spacing is the right visual target for density 4: compact, but with
  // a visible sliver of air between sibling thoughts. This remap therefore drives only the
  // section-attached semantic nodes through a gentler density curve while leaving the L-shaped
  // structural tree on the steeper section curve above.
  const relationDensityT = densityT * (5 / 12); // density 4 -> previous density 2.25 spacing
  const relationMix = (lo: number, hi: number): number => lo + (hi - lo) * relationDensityT;

  const sectionStartGap = mix(78, 26);
  const depthIndent = mix(92, 28);
  const verticalGap = mix(48, 20);
  const relationHorizontalGap = relationMix(60, 24);
  const relationLateralStep = relationMix(36, 22);
  const relationVerticalGap = relationMix(66, 38);
  const relationRowStep = relationMix(38, 22);
  // These reserves determine section-to-section outline spacing, so keep them on the compact
  // section curve. The semantic nodes themselves are spaced with relationMix above.
  const clusterBaseGap = mix(56, 30);
  const clusterLateralReserve = mix(18, 9);
  const relationMinGap = relationMix(8, 4);
  const startY = normalBottom + sectionStartGap;
  const centerNode = scene.nodes.find((node) => node.role === "center");
  const centerStructuralX = centerNode ? centerNode.x - centerNode.width / 2 + 20 : -80;
  const rootLeft = centerStructuralX + mix(92, 24);
  const sectionTreeEdges: SectionTreeEdge[] = [];
  const sectionNodeById = new Map<string, PositionedNode>();
  let cursorY = startY;

  const makeSectionNode = (section: import("../index/SectionExpansion").ExpandedSection, depth: number, relations: ReturnType<typeof collectForVisibleSection>): PositionedNode => {
    const pseudo: Neighbour = { page: section.page, role: "child", relationType: RelationType.DEFINED, typeDefinition: "section", linkDirection: null };
    const node = makeNode(pseudo, "child", index, settings);
    node.width = Math.max(172, Math.min(286, node.width + mix(16, 2)));
    node.height = Math.max(32, node.height + mix(3, -1));
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

  const addRelationGroup = (sectionNode: PositionedNode, items: SourcedNeighbour[], role: Exclude<Role, "sibling">) => {
    const nodes = items.map((item) => makeNode(item.relation, role, index, settings));
    const horizontal = role === "left" || role === "previous" || role === "right" || role === "next";
    const direction = role === "left" || role === "previous" ? -1 : role === "right" || role === "next" ? 1 : 0;

    if (horizontal) {
      // Side neighbours form a vertical stack. At maximum density, never allow the thought pills
      // themselves to touch/overlap: preserve a small positive gap even when their rendered height
      // is larger than the nominal density step.
      const maxHeight = Math.max(0, ...nodes.map((node) => node.height));
      const lateralStep = Math.max(relationLateralStep, maxHeight + relationMinGap);
      nodes.forEach((node, itemIndex) => {
        node.x = sectionNode.x + direction * (sectionNode.width / 2 + node.width / 2 + relationHorizontalGap);
        node.y = sectionNode.y + (itemIndex - (nodes.length - 1) / 2) * lateralStep;
      });
    } else {
      // Parents/children are arranged in rows of up to three. Position each row from the actual
      // rendered node widths instead of a fixed centre-to-centre step, so long labels can never
      // make adjacent pills overlap. Row spacing receives the same minimum-air guarantee.
      const columns = Math.min(3, Math.max(1, nodes.length));
      const rows = Math.ceil(nodes.length / columns);
      let rowOffset = 0;
      for (let row = 0; row < rows; row++) {
        const start = row * columns;
        const rowNodes = nodes.slice(start, start + columns);
        const totalWidth = rowNodes.reduce((sum, node) => sum + node.width, 0) + relationMinGap * Math.max(0, rowNodes.length - 1);
        let x = sectionNode.x - totalWidth / 2;
        const rowHeight = Math.max(0, ...rowNodes.map((node) => node.height));
        const rowStep = Math.max(relationRowStep, rowHeight + relationMinGap);
        for (const node of rowNodes) {
          node.x = x + node.width / 2;
          node.y = sectionNode.y + (role === "parent" ? -1 : 1) * (relationVerticalGap + rowOffset);
          x += node.width + relationMinGap;
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
    const lateralCount = Math.max(relations.left.length, relations.right.length);
    const topRows = Math.ceil(relations.parent.length / 3);
    const bottomRows = Math.ceil(relations.child.length / 3);
    const clusterAbove = Math.max(topRows * relationRowStep + (topRows ? clusterBaseGap : 0), lateralCount > 1 ? (lateralCount - 1) * clusterLateralReserve : 0);
    const clusterBelow = Math.max(bottomRows * relationRowStep + (bottomRows ? clusterBaseGap : 0), lateralCount > 1 ? (lateralCount - 1) * clusterLateralReserve : 0);
    const node = makeSectionNode(section, depth, relations);
    cursorY += clusterAbove;
    node.y = cursorY;
    cursorY += node.height / 2 + clusterBelow + verticalGap;
    sectionNodeById.set(section.id, node);
    scene.nodes.push(node);
    addRelationGroup(node, relations.parent, "parent");
    addRelationGroup(node, relations.child, "child");
    addRelationGroup(node, relations.left, "left");
    addRelationGroup(node, relations.right, "right");
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
