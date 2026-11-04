/** Classic geometry over measured occurrences. No graph, source, host file, timer or DOM ownership. */
import type {Role} from "../../../graph/relations";
export type ClassicAreaId = "parent" | "child" | "left" | "right" | "sibling";
export type ClassicGeometryPreferences = Readonly<{
  compactingFactor: number; horizontalCompactingFactor?: number; compactView: boolean; minLinkLength: number;
  parentColumns: number; childColumns: number; siblingRelativeSize: number; lateralArrangement?: "split" | "left";
  parentMaxHeight: number; childMaxHeight: number; friendMaxHeight: number; siblingMaxHeight: number;
  flipEastWest?: boolean;
}>;
export type ClassicMeasuredNode = {x: number; y: number; width: number; height: number; role: Role | "center"; editor?: true};
export type ClassicGeometryRead<N> = Readonly<{
  reserve: (node: N) => number; verticalReserve: (node: N) => number; width: (node: N) => number;
  mini: (node: N, envelope: boolean) => {width: number; viewportHeight: number; topGap: number} | null;
}>;
export type ZoneViewport = {key: ClassicAreaId; left: number; top: number; width: number; height: number;
  contentTop: number; contentHeight: number; initialScrollTop: number};
export type ZoneAreaBounds = {key: ClassicAreaId; left: number; top: number; width: number; height: number; resizeEdge: "top" | "bottom"};
/** Bound a geometry input to its supported presentation interval. */
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Use the selected horizontal axis, retaining old unmerged settings' shared density fallback. */
export function horizontalDensity(settings: Pick<ClassicGeometryPreferences, "compactingFactor" | "horizontalCompactingFactor">): number {
  return settings.horizontalCompactingFactor ?? settings.compactingFactor;
}

/** Route semantic roles to their physical scroll/filter owner without changing connector semantics. */
export function classicAreaForRole(role: Role | "center", arrangement: ClassicGeometryPreferences["lateralArrangement"]): ClassicAreaId | null {
  if (role === "center") return null;
  if (role === "previous") return "left";
  if (role === "next" || role === "right") return arrangement === "left" ? "left" : "right";
  return role;
}

/** Shared bounded spacing inputs; compact view changes whitespace rather than thought padding. */
export function spacingPolicy(settings: ClassicGeometryPreferences): { horizontal: number; vertical: number; spacing: number } {
  const compact = settings.compactView ? 0.82 : 1;
  return {
    horizontal: clamp(1.35 / horizontalDensity(settings), 0.38, 1.35) * compact,
    vertical: clamp(1.35 / settings.compactingFactor, 0.38, 1.35) * compact,
    spacing: clamp(settings.minLinkLength / 18, 0.72, 1.7),
  };
}

/** Resolve configured column limits identically for main, section and expanded child grids. */
export function layoutColumns(settings: Pick<ClassicGeometryPreferences, "parentColumns" | "childColumns">, role: "parent" | "child"): number {
  return Math.max(1, Math.min(role === "parent" ? 3 : 7, Math.round(role === "parent" ? settings.parentColumns : settings.childColumns)));
}

/** Apply the persisted sibling multiplier to thoughts and their expanded child strips. */
export function siblingScale(settings: ClassicGeometryPreferences): number {
  return clamp(settings.siblingRelativeSize / 100, 0.3, 0.85);
}

export function lateralAreaGap(settings: ClassicGeometryPreferences, parentAreaWidth: number): number {
  const density = clamp(horizontalDensity(settings), 0.75, 4);
  if (density >= 3) return -parentAreaWidth * 0.05 * (density - 3);
  return 48 * (3 - density) * clamp(settings.minLinkLength / 18, 0.72, 1.7) * (settings.compactView ? 0.82 : 1);
}

/** Measure an allocated horizontal area including its padded maximum descendant footprint. */
function occupiedHalfWidth<N extends ClassicMeasuredNode>(nodes: N[], minimum: number, around = 0): number {
  return Math.max(minimum, ...nodes.map(node => Math.abs(node.x - around) + node.width / 2 + 24));
}

/** Measure only card/mini bodies; conservative horizontal clearance never depends on child rows. */
function bodyHalfWidth<N extends ClassicMeasuredNode>(nodes: N[], minimum: number, around = 0): number {
  return Math.max(minimum, ...nodes.map(node => Math.abs(node.x - around) + node.width / 2));
}

/** Include already measured descendant envelopes without consulting a graph or native host. */
function occupiedNodes<N extends ClassicMeasuredNode>(nodes: N[], read: ClassicGeometryRead<N>, envelope = false): N[] {
  const occupied = [...nodes];
  for (const node of nodes) {
    const box = read.mini(node, envelope);
    if (box) occupied.push({...node, width: box.width, height: box.viewportHeight,
      y: node.y + node.height / 2 + box.topGap + box.viewportHeight / 2});
  }
  return occupied;
}

/** Pack actual thought/expanded-box widths and reserve visible child height in configured rows. */
export function distributeGrid<N extends ClassicMeasuredNode>(
  items: N[],
  baseY: number,
  rowDirection: -1 | 1,
  maxColumns: number,
  columnGap: number,
  rowGap: number,
  read: ClassicGeometryRead<N>,
): N[] {
  const nodes = items;
  if (!nodes.length) return nodes;

  const rows: Array<{ nodes: N[]; height: number; reserve: number }> = [];
  for (let start = 0; start < nodes.length; start += maxColumns) {
    const rowNodes = nodes.slice(start, start + maxColumns);
    rows.push({
      nodes: rowNodes,
      height: Math.max(...rowNodes.map((n) => n.height)),
      // Expanded child strips grow downward from their parent thought. A row therefore only
      // reserves extra height when at least one thought in that row actually has children.
      reserve: Math.max(0, ...rowNodes.map((n) => read.reserve(n))),
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
      const heightCorrection = Math.max(0, row.height - 26) / 2;
      y = rowDirection === -1 ? baseY - row.reserve - heightCorrection : baseY + heightCorrection;
    } else if (rowDirection === 1) {
      y = previousY + previousHeight / 2 + previousReserve + rowGap + row.height / 2;
    } else {
      y = previousY - previousHeight / 2 - rowGap - row.reserve - row.height / 2;
    }

    const widths = row.nodes.map(node => read.width(node));
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
function distributeVertical<N extends ClassicMeasuredNode>(
  items: N[],
  x: number,
  gap: number,
  read: ClassicGeometryRead<N>,
): N[] {
  const nodes = items;
  stackVerticalNodes(nodes, x, gap, read);
  return nodes;
}

/** Share one measured pitch and midline for existing nodes, retaining each node's semantic role. */
export function stackVerticalNodes<N extends ClassicMeasuredNode>(nodes: N[], x: number, gap: number, read: ClassicGeometryRead<N>): void {
  if (!nodes.length) return;

  const reserves = nodes.map((node) => read.verticalReserve(node));
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
}

/** Fit occupied thought/expanded-box height within a zone while preserving its chosen alignment. */
export function fitVerticalStrip<N extends ClassicMeasuredNode>(
  nodes: N[],
  topLimit: number,
  bottomLimit: number,
  read: ClassicGeometryRead<N>,
  alignment: "top" | "center" | "bottom" | "midline" = "center",
): void {
  if (!nodes.length) return;
  const occupiedTop = Math.min(...nodes.map((node) => node.y - node.height / 2));
  const occupiedBottom = Math.max(...nodes.map((node) =>
    node.y + node.height / 2 + read.verticalReserve(node)
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
export function areaBoundsFor<N extends ClassicMeasuredNode>(
  key: ClassicAreaId,
  nodes: N[],
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

export function viewportFor<N extends ClassicMeasuredNode>(
  key: ClassicAreaId,
  nodes: N[],
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

/** Position private measured occurrences with the existing Classic area/collision policy. */
export function layoutClassic<N extends ClassicMeasuredNode>(input: {center: N; parents: N[]; children: N[]; leftFriends: N[]; rightFriends: N[]; siblings: N[]},
  settings: ClassicGeometryPreferences, read: ClassicGeometryRead<N>, editor = false) {
  // An editor owns its full measured body plus area tools/padding. Treat configured caps as
  // minima only while that exact occurrence is expanded; no preference is persisted or clamped.
  /** Reserve the expanded body and native controls, independently of the configured area cap. */
  const editorHeight = (rows: readonly N[]): number => Math.max(0, ...rows.filter(row => row.editor).map(row => row.height + 72));
  if ([...input.parents, ...input.children, ...input.leftFriends, ...input.rightFriends, ...input.siblings].some(row => row.editor)) {
    settings = {...settings, parentMaxHeight: Math.max(settings.parentMaxHeight, editorHeight(input.parents)),
      childMaxHeight: Math.max(settings.childMaxHeight, editorHeight(input.children)),
      friendMaxHeight: Math.max(settings.friendMaxHeight, editorHeight([...input.leftFriends, ...input.rightFriends])),
      siblingMaxHeight: Math.max(settings.siblingMaxHeight, editorHeight(input.siblings))};
  }
  // Compactness controls inter-node spacing and label length. Expanded view adds vertical
  // space per thought/row only when that thought actually has visible child thoughts.
  const center = input.center;
  const { horizontal, vertical, spacing: legacySpacing } = spacingPolicy(settings);
  const columnGap = 50 * horizontal * legacySpacing;
  const rowGap = 36 * vertical * legacySpacing;
  const centerGap = 66 * vertical * legacySpacing;
  const sideGap = 18 * vertical * legacySpacing;

  const typicalHeight = 26;
  const parentBaseY = -(center.height / 2 + typicalHeight / 2 + centerGap);
  const childExtraGap = Math.max(42, 52 * vertical * legacySpacing);
  const childBaseY = center.height / 2 + typicalHeight / 2 + centerGap + childExtraGap;

  const parents = distributeGrid(input.parents, parentBaseY, -1, layoutColumns(settings, "parent"), columnGap, rowGap, read);
  const children = distributeGrid(input.children, childBaseY, 1, layoutColumns(settings, "child"), columnGap, rowGap, read);

  const maxCenterHalfWidth = center.width / 2;
  let sideX = maxCenterHalfWidth + (205 * horizontal * legacySpacing);
  const left = distributeVertical(input.leftFriends, -sideX, sideGap, read);
  const onLeft = settings.lateralArrangement === "left";
  const right = distributeVertical(input.rightFriends, onLeft ? -sideX : sideX, sideGap, read);
  const sharedLateral = onLeft ? [...left, ...right] : left;
  if (onLeft) stackVerticalNodes(sharedLateral, -sideX, sideGap, read);
  const hasRightStrip = !onLeft && right.length > 0;

  const rightExtent = hasRightStrip ? Math.max(...right.map((n) => n.x + n.width / 2)) : maxCenterHalfWidth;
  // When there is no challenger/next strip, siblings should not reserve an empty lateral column.
  // Compact view tightens the remaining gap a little further without changing sibling scale.
  const siblingBase = hasRightStrip ? 285 : 205;
  const siblingAfterRight = hasRightStrip ? 190 : 120;
  let siblingCenterX = Math.max(
    sideX + siblingBase * horizontal * legacySpacing,
    rightExtent + siblingAfterRight * horizontal * legacySpacing,
  );
  const siblings = distributeVertical(input.siblings, siblingCenterX, sideGap, read);

  // Lateral height bands are independent of the parent height. In split mode friends and
  // challengers form a symmetrical pair and may extend upward into the same vertical range as
  // parents. Their lower edge stays slightly above the children. Siblings occupy a separate,
  // slightly higher band farther to the right.
  const childSectionTop = children.length
    ? Math.min(...children.map((node) => node.y - node.height / 2))
    : center.height / 2 + centerGap + childExtraGap + 12;
  const sideToChildrenGap = Math.max(30, 36 * vertical * legacySpacing);
  // Both semantic groups share one physical list, height, filter and scroll position in one-sided mode.
  const friendBandHeight = Math.max(120, settings.friendMaxHeight);
  const siblingBandHeight = Math.max(120, settings.siblingMaxHeight);
  // A large embedded editor changes the visual center of gravity. Keep lateral relationship
  // strips centered beside the editor rather than deriving their band from the much lower child
  // zone; otherwise friends/challengers end up clustered around the editor's lower corners.
  const sideBottom = editor
    ? onLeft ? Math.min(friendBandHeight / 2, childSectionTop - sideToChildrenGap) : friendBandHeight / 2
    : childSectionTop - sideToChildrenGap;
  const sideTop = sideBottom - friendBandHeight;
  // Sparse lateral relationship lists are centered on the active node's horizontal midline:
  // one node sits level with the center, two straddle it evenly, and larger lists grow
  // outward in both directions. Only shift the strip when it reaches the zone bounds.
  const leftTop = sideTop;
  const leftBottom = sideBottom;
  const rightTop = sideTop;
  const rightBottom = sideBottom;
  fitVerticalStrip(sharedLateral, leftTop, leftBottom, read, "midline");
  if (!onLeft) fitVerticalStrip(right, rightTop, rightBottom, read, "midline");

  const siblingLift = Math.max(58, 72 * vertical * legacySpacing);
  const siblingBottom = editor ? siblingBandHeight / 2 : sideBottom - siblingLift;
  const siblingTop = editor ? -siblingBandHeight / 2 : siblingBottom - siblingBandHeight;
  fitVerticalStrip(siblings, siblingTop, siblingBottom, read, editor ? "midline" : "center");

  // Lateral x ownership belongs to the parent band and horizontal density. Child columns,
  // descendant rows and vertical fitting may change the lower band, never this horizontal anchor.
  const parentEnvelope = occupiedNodes(parents, read, true);
  const siblingEnvelope = occupiedNodes(siblings, read, true);
  const parentAreaHalfWidth = parents.length
    ? occupiedHalfWidth(parentEnvelope, center.width / 2 + 24)
    : 170;
  const parentBodyHalfWidth = bodyHalfWidth(parentEnvelope, center.width / 2);
  // Both lateral strips use the same width. Measure each around its own physical anchor before
  // combining; simplified mode shares the left anchor while split mode preserves symmetry.
  const lateralAreaHalfWidth = Math.max(
    occupiedHalfWidth(occupiedNodes(left, read, true), 115, -sideX),
    occupiedHalfWidth(occupiedNodes(right, read, true), 115, onLeft ? -sideX : sideX),
  );
  const lateralBodyHalfWidth = Math.max(
    bodyHalfWidth(occupiedNodes(left, read, true), 0, -sideX),
    bodyHalfWidth(occupiedNodes(right, read, true), 0, onLeft ? -sideX : sideX),
  );
  const siblingAreaHalfWidth = occupiedHalfWidth(siblingEnvelope, 110, siblingCenterX);
  const siblingBodyHalfWidth = bodyHalfWidth(siblingEnvelope, 0, siblingCenterX);
  const margin = onLeft ? Math.max(0, lateralAreaGap(settings, parentAreaHalfWidth * 2))
    : lateralAreaGap(settings, parentAreaHalfWidth * 2);
  if (parents.length) sideX = parentAreaHalfWidth + lateralAreaHalfWidth + margin;
  sideX = Math.max(sideX, parentBodyHalfWidth + lateralBodyHalfWidth + 4);
  for (const node of left) node.x = -sideX;
  for (const node of right) node.x = onLeft ? -sideX : sideX;

  if (parents.length || hasRightStrip) {
    siblingCenterX = hasRightStrip
      // Parent compaction may overlap padded margins. Independent scroll areas must not.
      ? sideX + lateralAreaHalfWidth + siblingAreaHalfWidth + Math.max(0, margin)
      : parentAreaHalfWidth + siblingAreaHalfWidth + margin;
  }
  siblingCenterX = Math.max(siblingCenterX, parentBodyHalfWidth + siblingBodyHalfWidth + 4,
    hasRightStrip ? sideX + lateralBodyHalfWidth + siblingBodyHalfWidth + 4 : 0);
  for (const node of siblings) node.x = siblingCenterX;

  // Expanded boxes belong to their thought's existing scroll area. Include their measured
  // extents so the same finite column footprint fits when a zone filter later repacks that row.
  const occupiedParents = occupiedNodes(parents, read);
  const occupiedChildren = occupiedNodes(children, read);
  const occupiedLeft = occupiedNodes(sharedLateral, read);
  const occupiedRight = occupiedNodes(onLeft ? [] : right, read);
  const occupiedSiblings = occupiedNodes(siblings, read);
  const zoneViewports: Partial<Record<ClassicAreaId, ZoneViewport>> = {};
  const parentViewport = viewportFor("parent", occupiedParents, settings.parentMaxHeight, "bottom");
  const childViewport = viewportFor("child", occupiedChildren, settings.childMaxHeight, "top");
  const leftViewport = viewportFor("left", occupiedLeft, settings.friendMaxHeight, "top", leftBottom, leftTop);
  const rightViewport = viewportFor("right", occupiedRight, settings.friendMaxHeight, "top", rightBottom, rightTop);
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
  const zoneAreas: Partial<Record<ClassicAreaId, ZoneAreaBounds>> = {};
  const parentAreaBottom = parentBaseY + typicalHeight / 2 + 16;
  const childAreaTop = childBaseY - typicalHeight / 2 - 16;
  zoneAreas.parent = areaBoundsFor("parent", occupiedParents, settings.parentMaxHeight, "top", { centerX: 0, width: parentAreaHalfWidth * 2, fixedEdgeY: parentAreaBottom });
  zoneAreas.child = areaBoundsFor("child", occupiedChildren, settings.childMaxHeight, "bottom", { centerX: 0, width: 440, fixedEdgeY: childAreaTop });
  zoneAreas.left = areaBoundsFor("left", occupiedLeft, settings.friendMaxHeight, "top", { centerX: -sideX, width: lateralAreaHalfWidth * 2, fixedEdgeY: leftBottom }, leftBottom, leftTop);
  if (!onLeft) zoneAreas.right = areaBoundsFor("right", occupiedRight, settings.friendMaxHeight, "top", { centerX: sideX, width: lateralAreaHalfWidth * 2, fixedEdgeY: rightBottom }, rightBottom, rightTop);
  zoneAreas.sibling = areaBoundsFor("sibling", occupiedSiblings, settings.siblingMaxHeight, "top", { centerX: siblingCenterX, width: siblingAreaHalfWidth * 2, fixedEdgeY: siblingBottom }, siblingBottom, siblingTop);

  const nodes = [center, ...parents, ...children, ...left, ...right, ...siblings];
  if (settings.flipEastWest) mirrorClassicCoordinates(nodes, zoneAreas, zoneViewports);
  return {nodes, zoneViewports, zoneAreas};
}

/** Mirror private horizontal coordinates and area hit bounds only. Semantic roles, vertical meaning,
 * labels and editor DOM remain untouched; section scenes reuse the same coordinate transform. */
export function mirrorClassicCoordinates(nodes: readonly {x: number}[], areas: Readonly<Partial<Record<string, {left: number; width: number}>>>,
  viewports: Readonly<Partial<Record<string, {left: number; width: number}>>>): void {
  for (const node of nodes) node.x = -node.x;
  for (const area of Object.values(areas)) if (area) area.left = -area.left - area.width;
  for (const viewport of Object.values(viewports)) if (viewport) viewport.left = -viewport.left - viewport.width;
}
