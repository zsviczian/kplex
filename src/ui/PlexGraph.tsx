/**
 * Host-bound Plex scene composition, layout and relationship interactions. Semantic resolution stays index/core-owned; UI labels and on-demand evidence hints use the injected translator. Global typography drafts survive host publication and save after input settles. Area-height gestures own viewport pointer capture and persist existing presentation settings on completion or interruption. History and pinned drag targets share composer eligibility; external file drops follow the rendered area's semantic role. Theme-native area previews follow the existing drop action without intercepting capture or moving the dragged thought. Visible rows retain finite cache-only presentation demand; hidden surfaces and effect teardown release it. Geometry defers gate/count queries until a row intersects the displayed viewport, including partially clipped rows. Ordinary unfiltered scenes project cross-links for clipped visible rows; filtered and section scenes retain their established edge/count policy.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type DragEvent, type MouseEvent, type PointerEvent } from "react";
import { Menu, Platform, type WorkspaceLeaf } from "obsidian";
import { addNativeSubmenu } from "../adapters/obsidian/nativeSubmenu";
import { getDraggedFile } from "../adapters/obsidian/fileExplorerDrag";
import { urlEmbed } from "./features/urlEmbed";
import type KplexPlugin from "../main";
import type { GraphIndex } from "../index/GraphIndex";
import type { KplexLayoutProfile, KplexSettings, KplexViewSurface, SidecarMarkdownMode } from "../settings";
import type { GateRole, GateSide, GraphPage, Neighbour, Neighborhood, NodeStyle, NodeVisual, PositionedEdge, PositionedNode, Role, ScrollZone } from "../types";
import { LinkDirection, RelationType } from "../types";
import { alphaHexToCss, resolveLinkStyle, resolveNodeStyle } from "../index/style";
import { buildScene, buildSectionExpandedScene, appendVisibleCrossLinks, projectNodeCounts, rowIntersectsViewport, effectiveLabelLimit, expandedChildReserve, expandedNodeWidth, expandedMiniLayout, horizontalDensity, layoutColumns, spacingPolicy, gateDiameter, siblingScale, withAreaHeightOverrides, type CenterNodeSize, type ZoneViewport, type ZoneAreaBounds } from "./layout";
import { LayoutSlider } from "./components/LayoutSlider";
import { ElementMotion } from "./components/ElementMotion";
import { ResizableAreaFrame } from "./components/ResizableAreaFrame";
import { ThoughtNode, type ConnectionDragState } from "./ThoughtNode";
import { DropAreaPreview } from "./components/DropAreaPreview";
import { DoubleTapGesture } from "./components/DoubleTapGesture";
import { ObsidianIcon } from "./ObsidianIcon";
import { CentralNodeEditor } from "./CentralNodeEditor";
import { PlexFind, matchesFindNode, matchesOntologyFind } from "./features/PlexFind";
import { RelationshipExplanationModal } from "./RelationshipExplanationModal";
import { RenameNoteModal } from "./RenameNoteModal";
import { buildCentralSectionExpansion, canExpandCentralSections, projectCentralSectionExpansion, type CentralSectionExpansion } from "../index/SectionExpansion";
import { GraphPredicateEngine, type CompiledGraphPredicate, type GraphPredicateEdgeContext } from "../lens/GraphPredicate";
import { graphLensEdgeStyle, graphLensNodeStyle, matchesGraphLenses, type CompiledGraphLensSet } from "../lens/GraphLens";
import type { Translator, PlainTranslationKey } from "../lang";

type Point = { x: number; y: number };
type HoverState =
  | { kind: "node"; path: string }
  | { kind: "gate"; path: string; gate: GateSide }
  | { kind: "edge"; id: string }
  | null;

type EdgeHoverTooltip = {
  edgeId: string;
  left: number;
  top: number;
  text: string;
} | null;

type EdgeGates = { source: GateSide; target: GateSide };
type ConnectDrag = {
  originPath: string;
  gate: GateSide;
  pointerId: number;
  current: Point;
  startClientX: number;
  startClientY: number;
  moved: boolean;
};
type NodeDrag = {
  path: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  startClientX: number;
  startClientY: number;
  x: number;
  y: number;
  moved: boolean;
};

type AreaHoverState = { zone: ScrollZone; edgeActive: boolean } | null;
type AreaHeightKey = "parentMaxHeight" | "childMaxHeight" | "friendMaxHeight" | "siblingMaxHeight";
type AreaResizeDrag = {
  zone: ScrollZone;
  pointerId: number;
  startClientY: number;
  startHeight: number;
  startScale: number;
  changed: boolean;
};

type ScrollValues = Record<ScrollZone, number>;
type ZoneBooleanMap = Partial<Record<ScrollZone, boolean>>;
type ZoneStringMap = Partial<Record<ScrollZone, string>>;

const ZONES: ScrollZone[] = ["parent", "child", "left", "right", "sibling"];
const AREA_HEIGHT_CONFIG: Record<ScrollZone, { key: AreaHeightKey; min: number; max: number }> = {
  parent: { key: "parentMaxHeight", min: 140, max: 800 },
  child: { key: "childMaxHeight", min: 160, max: 900 },
  left: { key: "friendMaxHeight", min: 140, max: 800 },
  right: { key: "friendMaxHeight", min: 140, max: 800 },
  sibling: { key: "siblingMaxHeight", min: 120, max: 700 },
};
const AREA_RESIZE_EDGE_PX = 7;
const AREA_TOUCH_RESIZE_EDGE_PX = 22;
const EMPTY_SCROLLS: ScrollValues = { parent: 0, child: 0, left: 0, right: 0, sibling: 0 };
const GATE_GAP = 3;
const MAX_ZOOM = 3;
const IOS_MAX_ZOOM = 1.85;
const TOUCH_GATE_LONG_PRESS_MS = 420;
const NODE_RELINK_MIN_DRAG_PX = 36;
const CENTRAL_EDITOR_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp", "heic", "heif"]);

/** Keep embedded-center expansion bounded to native views requested by the feature set. */
function supportsCentralEditorFile(page: GraphPage | undefined): boolean {
  const extension = page?.file?.extension.toLocaleLowerCase();
  return extension === "md"
    || extension === "canvas"
    || extension === "excalidraw"
    || Boolean(extension && CENTRAL_EDITOR_IMAGE_EXTENSIONS.has(extension));
}

const NODE_RELINK_HYSTERESIS_PX = 48;
const GENERIC_RELATION_LABELS = new Set([
  "parent", "parents", "child", "children", "friend", "friends", "challenger", "jump", "jumps",
  "previous", "prev", "next", "before", "after", "west", "east", "north", "south", "up", "down",
  "u", "d", "n", "e", "w", "source", "origin", "inception", "parent domain", "leads to",
  "contributes to", "nurtures", "similar", "supports", "alternatives", "advantages", "pros", "opposes",
  "disadvantages", "missing", "cons", "file-tree", "folder-tree", "tag-tree", "inferred-link", "inferred",
  "sibling", "url", "attachment",
].map((label) => label.toLowerCase()));
const gateKey = (path: string, gate: GateSide) => `${path}::${gate}`;

const EVIDENCE_ROLE_LABEL: Record<string, PlainTranslationKey> = {
  parent: "role.parent",
  child: "role.child",
  left: "role.friend",
  right: "role.challenger",
  previous: "role.previous",
  next: "role.next",
  hidden: "role.hidden",
};
const EVIDENCE_SOURCE_LABEL: Record<string, PlainTranslationKey> = {
  "obsidian-link": "graph.sourceResolvedLink",
  "unresolved-link": "graph.sourceUnresolvedLink",
  "frontmatter-ontology": "graph.sourceDocumentProperty",
  "inline-ontology": "graph.sourceBodyProperty",
  "body-url": "graph.sourceBodyUrl",
  "property-url": "graph.sourcePropertyUrl",
  "date-property": "graph.sourceDateProperty",
  "file-tree": "graph.sourceFolderTree",
  "tag-tree": "graph.sourceTagTree",
  "url-origin": "graph.sourceUrlOrigin",
};
const relationTypeText = (type: RelationType, translate: Translator): string => translate(type === RelationType.DEFINED ? "graph.relationDefined" : "graph.relationInferred");

/** Lazily format relationship evidence for a connector hint using localized role/source labels and original provenance. */
function edgeEvidenceTooltipText(index: GraphIndex, edge: PositionedEdge, translate: Translator): string | null {
  const sourcePath = edge.explanationSourcePath ?? edge.sourcePath;
  const targetPath = edge.explanationTargetPath ?? edge.targetPath;
  const explanation = index.explainRelationship(sourcePath, targetPath);
  if (!explanation) return null;

  const lines: string[] = [];
  if (explanation.resolvedRoles.length) {
    const resolved = explanation.resolvedRoles
      .map((item) => `${EVIDENCE_ROLE_LABEL[item.role] ? translate(EVIDENCE_ROLE_LABEL[item.role]) : item.role} · ${relationTypeText(item.relationType, translate)}`)
      .join(", ");
    lines.push(translate("graph.resolved", { roles: resolved }));
  } else if (explanation.hidden) {
    lines.push(translate("graph.resolvedHidden"));
  }

  const seen = new Set<string>();
  let evidenceShown = 0;
  for (const decision of explanation.decisions) {
    const evidence = decision.evidence;
    const sourceKey = EVIDENCE_SOURCE_LABEL[evidence.sourceKind];
    const source = (evidence.fieldName ?? evidence.definition ?? (sourceKey ? translate(sourceKey) : evidence.sourceKind)).trim();
    const roleKey = EVIDENCE_ROLE_LABEL[evidence.role];
    const resolution = `${roleKey ? translate(roleKey) : evidence.role} · ${relationTypeText(evidence.relationType, translate)}`;
    const text = translate(decision.active ? "graph.evidenceDecision" : "graph.evidenceDecisionOverridden", { source, resolution });
    if (!seen.has(text)) {
      seen.add(text);
      lines.push(text);
      evidenceShown += 1;
    }
    if (evidenceShown >= 4) break;
  }
  const remaining = Math.max(0, explanation.decisions.length - evidenceShown);
  if (remaining > 0) lines.push(translate("graph.moreEvidence", { count: remaining }));
  return lines.length ? lines.join("\n") : null;
}

type EdgeGeometry = { d: string; midpoint: Point };
type ZoneDisplayLayout = {
  nodes: PositionedNode[];
  localPositions: Map<string, Point>;
  contentHeight: number;
  count: number;
  filtering: boolean;
};

type ExpandedMiniThought = {
  key: string;
  relation: Neighbour;
  label: string;
  style: NodeStyle;
  localX: number;
  localY: number;
  width: number;
  height: number;
};

type ExpandedCluster = {
  parent: PositionedNode;
  left: number;
  top: number;
  width: number;
  viewportHeight: number;
  contentHeight: number;
  scrollTop: number;
  children: ExpandedMiniThought[];
};

function gatesForEdge(edge: PositionedEdge): EdgeGates {
  switch (edge.role) {
    case "parent": return { source: "top", target: "bottom" };
    case "child": return { source: "bottom", target: "top" };
    case "left":
    case "previous": return { source: "left", target: "right" };
    case "right":
    case "next": return { source: "right", target: "left" };
    case "sibling": return { source: "right", target: "left" };
  }
}


function applyOptimisticRelink(base: Neighborhood, targetPath: string, role: GateRole): Neighborhood {
  const all = [...base.parents, ...base.children, ...base.leftFriends, ...base.rightFriends];
  const found = all.find((item) => item.page.path === targetPath);
  if (!found) return base;
  const next: Neighborhood = {
    ...base,
    parents: base.parents.filter((item) => item.page.path !== targetPath),
    children: base.children.filter((item) => item.page.path !== targetPath),
    leftFriends: base.leftFriends.filter((item) => item.page.path !== targetPath),
    rightFriends: base.rightFriends.filter((item) => item.page.path !== targetPath),
    siblings: [...base.siblings],
  };
  const moved: Neighbour = { ...found, role };
  if (role === "parent") next.parents.push(moved);
  else if (role === "child") next.children.push(moved);
  else if (role === "left") next.leftFriends.push(moved);
  else next.rightFriends.push(moved);
  return next;
}

function neighborhoodHasRelink(base: Neighborhood | null | undefined, targetPath: string, role: GateRole): boolean {
  if (!base) return false;
  const list = role === "parent" ? base.parents
    : role === "child" ? base.children
      : role === "left" ? base.leftFriends : base.rightFriends;
  return list.some((item) => item.page.path === targetPath);
}

function semanticRoleForGate(gate: GateSide): GateRole {
  switch (gate) {
    case "top": return "parent";
    case "bottom": return "child";
    case "left": return "left";
    case "right": return "right";
  }
}

function semanticRoleForPosition(point: Point, currentRole?: GateRole, hysteresis = 0): GateRole {
  const scores: Record<GateRole, number> = {
    parent: -point.y,
    child: point.y,
    left: -point.x,
    right: point.x,
  };
  if (currentRole) scores[currentRole] += hysteresis;
  let best: GateRole = "parent";
  for (const role of ["child", "left", "right"] as GateRole[]) {
    if (scores[role] > scores[best]) best = role;
  }
  return best;
}

function normalizedRole(role: Role | "center"): GateRole | null {
  if (role === "parent" || role === "child" || role === "left" || role === "right") return role;
  if (role === "previous") return "left";
  if (role === "next") return "right";
  return null;
}

function zoneForRole(role: Role | "center"): ScrollZone | null {
  switch (role) {
    case "parent": return "parent";
    case "child": return "child";
    case "left":
    case "previous": return "left";
    case "right":
    case "next": return "right";
    case "sibling": return "sibling";
    case "center": return null;
  }
}

function oppositeGate(gate: GateSide): GateSide {
  if (gate === "top") return "bottom";
  if (gate === "bottom") return "top";
  if (gate === "left") return "right";
  return "left";
}

function gatePoint(node: PositionedNode, gate: GateSide): Point {
  const gateRadius = gateDiameter(node.style) / 2;
  switch (gate) {
    case "top": return { x: node.x, y: node.y - node.height / 2 - GATE_GAP - gateRadius };
    case "bottom": return { x: node.x, y: node.y + node.height / 2 + GATE_GAP + gateRadius };
    case "left": return { x: node.x - node.width / 2 - GATE_GAP - gateRadius, y: node.y };
    case "right": return { x: node.x + node.width / 2 + GATE_GAP + gateRadius, y: node.y };
  }
}

function gateVector(gate: GateSide): Point {
  switch (gate) {
    case "top": return { x: 0, y: -1 };
    case "bottom": return { x: 0, y: 1 };
    case "left": return { x: -1, y: 0 };
    case "right": return { x: 1, y: 0 };
  }
}

function cubicPoint(a: Point, c1: Point, c2: Point, b: Point, t: number): Point {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  return {
    x: uu * u * a.x + 3 * uu * t * c1.x + 3 * u * tt * c2.x + tt * t * b.x,
    y: uu * u * a.y + 3 * uu * t * c1.y + 3 * u * tt * c2.y + tt * t * b.y,
  };
}

function edgeGeometry(a: Point, b: Point, sourceGate: GateSide, targetGate: GateSide, connectorStyle: "bezier" | "straight"): EdgeGeometry {
  if (connectorStyle === "straight") {
    return { d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`, midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  }

  // TheBrain-style connectors are deliberately shallow. Shorter control handles avoid the
  // exaggerated loops produced when lateral displacement is large compared with node spacing.
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  const control = Math.max(20, Math.min(108, distance * 0.20));
  const av = gateVector(sourceGate);
  const bv = gateVector(targetGate);
  const c1 = { x: a.x + av.x * control, y: a.y + av.y * control };
  const c2 = { x: b.x + bv.x * control, y: b.y + bv.y * control };
  return {
    d: `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`,
    midpoint: cubicPoint(a, c1, c2, b, 0.5),
  };
}

/** Return the actual connector label; default role/topology definitions remain visually suppressed. */
function relationLabel(typeDefinition?: string): string | null {
  const label = typeDefinition?.trim();
  if (!label || GENERIC_RELATION_LABELS.has(label.toLowerCase())) return null;
  return label;
}

function markerFor(head?: string): string | undefined {
  if (!head || head === "none") return undefined;
  if (head === "triangle") return "url(#kplex-triangle)";
  if (head === "dot") return "url(#kplex-dot)";
  if (head === "bar") return "url(#kplex-bar)";
  return "url(#kplex-arrow)";
}

/** Translate the displayed zone heading while preserving semantic role and layout classification. */
function zoneTitle(zone: ScrollZone, translate: Translator): string {
  if (zone === "parent") return translate("graph.zoneParents");
  if (zone === "child") return translate("graph.zoneChildren");
  if (zone === "left") return translate("graph.zoneFriendsPrevious");
  if (zone === "right") return translate("graph.zoneChallengersNext");
  return translate("graph.zoneSiblings");
}

function matchesZoneFilter(node: PositionedNode, filter: string): boolean {
  const q = filter.trim().toLowerCase();
  if (!q) return true;
  return node.label.toLowerCase().includes(q) || node.page.path.toLowerCase().includes(q);
}

function matchesGraphPredicatePage(
  engine: GraphPredicateEngine,
  predicate: CompiledGraphPredicate | null,
  page: GraphPage,
  label: string,
  typeDefinition: string | undefined,
  center: GraphPage | undefined,
  edge: GraphPredicateEdgeContext = {},
): boolean {
  return engine.matches(predicate, {
    node: { page, label },
    center,
    edge: { ...edge, definition: typeDefinition ?? edge.definition },
  });
}

function matchesGraphPredicateNode(
  engine: GraphPredicateEngine,
  predicate: CompiledGraphPredicate | null,
  node: PositionedNode,
  center: GraphPage | undefined,
): boolean {
  return matchesGraphPredicatePage(engine, predicate, node.page, node.label, node.typeDefinition, center, {
    role: node.role,
    relationType: node.relationType,
    linkDirection: node.linkDirection,
    sourcePath: center?.path,
    targetPath: node.page.path,
  });
}

function matchesVisibleLensPage(
  engine: GraphPredicateEngine,
  index: GraphIndex,
  lenses: CompiledGraphLensSet,
  page: GraphPage,
  label: string,
  typeDefinition: string | undefined,
  center: GraphPage | undefined,
  edge: GraphPredicateEdgeContext = {},
): boolean {
  return matchesGraphLenses(engine, index, lenses, {
    page,
    label,
    center,
    edge: { ...edge, definition: typeDefinition ?? edge.definition },
  });
}

function matchesVisibleLensNode(
  engine: GraphPredicateEngine,
  index: GraphIndex,
  lenses: CompiledGraphLensSet,
  node: PositionedNode,
  center: GraphPage | undefined,
): boolean {
  return matchesVisibleLensPage(engine, index, lenses, node.page, node.label, node.typeDefinition, center, {
    role: node.role,
    relationType: node.relationType,
    linkDirection: node.linkDirection,
    sourcePath: center?.path,
    targetPath: node.page.path,
  });
}

function matchesVisibleCandidate(
  engine: GraphPredicateEngine,
  index: GraphIndex,
  predicate: CompiledGraphPredicate | null,
  lenses: CompiledGraphLensSet,
  page: GraphPage,
  label: string,
  typeDefinition: string | undefined,
  center: GraphPage | undefined,
  edge: GraphPredicateEdgeContext = {},
): boolean {
  return matchesGraphPredicatePage(engine, predicate, page, label, typeDefinition, center, edge)
    && matchesVisibleLensPage(engine, index, lenses, page, label, typeDefinition, center, edge);
}

function filterNeighborhoodForLenses(
  neighborhood: Neighborhood,
  contextCenter: GraphPage,
  engine: GraphPredicateEngine,
  index: GraphIndex,
  predicate: CompiledGraphPredicate | null,
  lenses: CompiledGraphLensSet,
): Neighborhood {
  const filter = (items: Neighbour[], displayedRole: Role) => items.filter((item) => matchesVisibleCandidate(
    engine,
    index,
    predicate,
    lenses,
    item.page,
    index.titleFor(item.page),
    item.typeDefinition,
    contextCenter,
    {
      // Match the same role users see in the rendered Plex. `previous`/`next` relationships are
      // displayed in the left/right zones, so Keep layout and Reflow must evaluate identically.
      role: displayedRole,
      relationType: item.relationType,
      linkDirection: item.linkDirection,
      sourcePath: neighborhood.center.path,
      targetPath: item.page.path,
    },
  ));
  return {
    ...neighborhood,
    parents: filter(neighborhood.parents, "parent"),
    children: filter(neighborhood.children, "child"),
    leftFriends: filter(neighborhood.leftFriends, "left"),
    rightFriends: filter(neighborhood.rightFriends, "right"),
    siblings: filter(neighborhood.siblings, "sibling"),
  };
}

/** Repack zone-local matches with the current axis/column policy and full expanded-child footprint. */
function buildZoneDisplayLayout(
  zone: ScrollZone,
  panel: ZoneViewport,
  nodes: PositionedNode[],
  filter: string,
  settings: KplexSettings,
  index: GraphIndex,
  centerPath: string,
): ZoneDisplayLayout {
  const filtering = filter.trim().length > 0;
  const filtered = filtering ? nodes.filter((node) => matchesZoneFilter(node, filter)) : nodes;
  const localPositions = new Map<string, Point>();

  if (!filtering) {
    for (const node of filtered) {
      localPositions.set(node.page.path, { x: node.x - panel.left, y: node.y - panel.contentTop });
    }
    return { nodes: filtered, localPositions, contentHeight: panel.contentHeight, count: filtered.length, filtering };
  }

  // Filtering is a list operation, not a visibility mask. Re-pack matching thoughts so removed
  // items leave no holes in the scroll content. The filter tools occupy the first ~36 px.
  const topPadding = 42;
  const bottomPadding = 16;
  if (zone === "parent" || zone === "child") {
    const columns = layoutColumns(settings, zone);
    const { horizontal, vertical, spacing } = spacingPolicy(settings);
    const columnGap = 26 * horizontal / 0.675 * spacing;
    const rowGap = 20 * vertical / 0.675 * spacing;
    let y = topPadding;

    for (let start = 0; start < filtered.length; start += columns) {
      const row = filtered.slice(start, start + columns);
      const rowHeight = row.length ? Math.max(...row.map((node) => node.height)) : 0;
      const widths = row.map((node) => expandedNodeWidth(node, index, settings, centerPath));
      const rowWidth = widths.reduce((sum, width) => sum + width, 0) + columnGap * Math.max(0, row.length - 1);
      let x = Math.max(8, (panel.width - rowWidth) / 2);
      row.forEach(/** Center each pill within its full descendant footprint. */ (node, column) => {
        localPositions.set(node.page.path, { x: x + widths[column] / 2, y: y + rowHeight / 2 });
        x += widths[column] + columnGap;
      });
      const rowReserve = Math.max(0, ...row.map((node) => expandedChildReserve(node.page, index, settings, centerPath)));
      y += rowHeight + rowReserve + rowGap;
    }
    const contentHeight = Math.max(panel.height, Math.max(topPadding + bottomPadding, y - (filtered.length ? rowGap : 0) + bottomPadding));
    return { nodes: filtered, localPositions, contentHeight, count: filtered.length, filtering };
  }

  const { vertical, spacing } = spacingPolicy(settings);
  const gap = 20 * vertical / 0.675 * spacing;
  const occupiedHeight = filtered.reduce((sum, node, nodeIndex) => (
    sum
    + node.height
    + expandedChildReserve(node.page, index, settings, centerPath, node.role === "sibling" ? siblingScale(settings) : 1)
    + (nodeIndex > 0 ? gap : 0)
  ), 0);
  const availableHeight = Math.max(0, panel.height - topPadding - bottomPadding);
  let y = topPadding;
  if ((zone === "left" || zone === "right") && occupiedHeight < availableHeight) {
    // panel.top is in world coordinates. The active node lives at world y = 0, so -panel.top
    // is its panel-local midline. Keep filtered sparse lateral lists centered on that same line.
    const midlineY = -panel.top;
    const maxTop = Math.max(topPadding, panel.height - bottomPadding - occupiedHeight);
    y = Math.max(topPadding, Math.min(maxTop, midlineY - occupiedHeight / 2));
  }
  for (const node of filtered) {
    localPositions.set(node.page.path, { x: node.x - panel.left, y: y + node.height / 2 });
    y += node.height + expandedChildReserve(node.page, index, settings, centerPath, node.role === "sibling" ? siblingScale(settings) : 1) + gap;
  }
  const contentHeight = Math.max(panel.height, Math.max(topPadding + bottomPadding, y - (filtered.length ? gap : 0) + bottomPadding));
  return { nodes: filtered, localPositions, contentHeight, count: filtered.length, filtering };
}

function Edge({
  edge,
  nodes,
  inverseArrowDirection,
  connectorStyle,
  labelBackground,
  crossLinkOpacity,
  highlighted,
  dimmed,
  onHover,
  onMove,
  onLeave,
  onContextMenu,
}: {
  edge: PositionedEdge;
  nodes: Map<string, PositionedNode>;
  inverseArrowDirection: boolean;
  connectorStyle: "bezier" | "straight";
  labelBackground: string;
  crossLinkOpacity: number;
  highlighted: boolean;
  dimmed: boolean;
  onHover: (event: PointerEvent<SVGPathElement>) => void;
  onMove: (event: PointerEvent<SVGPathElement>) => void;
  onLeave: () => void;
  onContextMenu: (event: MouseEvent<SVGPathElement>) => void;
}) {
  const source = nodes.get(edge.sourcePath);
  const target = nodes.get(edge.targetPath);
  if (!source || !target) return null;

  const gates = gatesForEdge(edge);
  const a = gatePoint(source, gates.source);
  const b = gatePoint(target, gates.target);
  const geometry = edgeGeometry(a, b, gates.source, gates.target, connectorStyle);
  const style = edge.style;
  const dash = style.strokeStyle === "dashed" ? "7 7" : style.strokeStyle === "dotted" ? "2 6" : undefined;
  const reverse = edge.direction === (inverseArrowDirection ? LinkDirection.TO : LinkDirection.FROM);
  const markerStart = markerFor(reverse ? style.endArrowHead : style.startArrowHead);
  const markerEnd = markerFor(reverse ? style.startArrowHead : style.endArrowHead);
  const baseWidth = style.strokeWidth ?? 1.2;
  const strokeWidth = highlighted ? Math.max(baseWidth + 1.7, 2.8) : baseWidth;
  const stroke = alphaHexToCss(style.strokeColor, "rgba(190,210,235,.52)");
  const label = style.showLabel ? relationLabel(edge.typeDefinition) : null;
  const fontSize = style.fontSize ?? 10;
  const labelWidth = label ? Math.max(20, label.length * fontSize * 0.58 + 10) : 0;
  const labelHeight = fontSize + 6;

  const resolvedCrossLinkOpacity = edge.isCrossLink && !highlighted ? crossLinkOpacity : undefined;

  return <g className={`kplex-edge${edge.isCrossLink ? " is-cross-link" : ""}${highlighted ? " is-highlighted" : ""}${dimmed ? " is-dimmed" : ""}`}>
    <path
      className="kplex-edge-visible"
      opacity={resolvedCrossLinkOpacity}
      d={geometry.d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={dash}
      markerEnd={markerEnd}
      markerStart={markerStart}
      vectorEffect="non-scaling-stroke"
    />
    <path
      className="kplex-edge-hit"
      data-kplex-edge-id={edge.id}
      d={geometry.d}
      fill="none"
      stroke="transparent"
      strokeWidth={Math.max(14, baseWidth + 12)}
      vectorEffect="non-scaling-stroke"
      onPointerEnter={onHover}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onContextMenu={onContextMenu}
    />
    {label && <g className="kplex-edge-label-wrap" pointerEvents="none" opacity={resolvedCrossLinkOpacity}>
      <rect
        x={geometry.midpoint.x - labelWidth / 2}
        y={geometry.midpoint.y - labelHeight / 2}
        width={labelWidth}
        height={labelHeight}
        rx={3}
        fill={labelBackground}
      />
      <text
        className="kplex-edge-label"
        x={geometry.midpoint.x}
        y={geometry.midpoint.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={alphaHexToCss(style.textColor, "white")}
        fontSize={fontSize}
      >{label}</text>
    </g>}
  </g>;
}

/** Compose the deterministic Plex scene and interaction handlers, using localized UI copy without rebuilding semantic state for presentation changes. */
export function PlexGraph({ plugin, index, settings: viewSettings, surface, hostLeaf, predicate, lenses, filterLayoutMode, predicateRevision, showCrossLinks, activePath, renderRevision, semanticRevision, findFocusRequest, areaSettingsMode, onAreaSettingsModeChange, onApplyFindFilter, appliedFindFilterQuery, onClearFindFilter, onActivate, onOpen, onCentralNodeEditorChange, onCentralNodeModeChange }: {
  plugin: KplexPlugin;
  index: GraphIndex;
  settings: KplexSettings;
  surface: KplexViewSurface;
  hostLeaf: WorkspaceLeaf;
  predicate: CompiledGraphPredicate | null;
  lenses: CompiledGraphLensSet;
  filterLayoutMode: "keep" | "reflow";
  predicateRevision: number;
  showCrossLinks: boolean;
  activePath: string;
  renderRevision: number;
  semanticRevision: number;
  findFocusRequest: number;
  areaSettingsMode: boolean;
  onAreaSettingsModeChange: (enabled: boolean) => void;
  onApplyFindFilter: (query: string) => void;
  appliedFindFilterQuery: string | null;
  onClearFindFilter: () => void;
  onActivate: (page: GraphPage) => void;
  onOpen: (page: GraphPage) => void;
  onCentralNodeEditorChange: (enabled: boolean) => void;
  onCentralNodeModeChange: (mode: SidecarMarkdownMode) => void;
}) {
  const translate = plugin.translator;
  const [findQuery, setFindQuery] = useState("");
  const [findIncludePath, setFindIncludePath] = useState(false);
  const [findCursor, setFindCursor] = useState(0);
  const [layoutControlsOpen, setLayoutControlsOpen] = useState(false);
  const [layoutOverrides, setLayoutOverrides] = useState<Partial<KplexLayoutProfile>>({});
  const layoutDraft = useRef<KplexLayoutProfile | null>(null);
  const [typographyOverrides, setTypographyOverrides] = useState<Partial<Pick<KplexSettings, "baseFontSize" | "baseNodeStyle" | "wrapNodeLabels">>>({});
  const typographyDraft = useRef<typeof typographyOverrides | null>(null);
  const typographySave = useRef<{ id: number; window: Window } | null>(null);
  const [areaHeightOverrides, setAreaHeightOverrides] = useState<Partial<Record<AreaHeightKey, number>>>({});
  // App receives fresh prepared facades during unrelated renders. Explicit drafts survive those
  // publications; mutating one temporary facade would discard slow slider changes mid-gesture.
  const settings = useMemo(() => Object.assign(withAreaHeightOverrides(viewSettings, areaHeightOverrides), layoutOverrides, typographyOverrides), [viewSettings, areaHeightOverrides, layoutOverrides, typographyOverrides]);
  const predicateEngine = useMemo(() => new GraphPredicateEngine(plugin.app), [plugin]);
  useEffect(() => index.acquireSemanticDemand(activePath), [index, activePath]);
  // getNeighborhood() performs relationship classification/filtering. Keep it stable during local
  // pointer/camera/hover state updates; only rebuild it when navigation, settings, or the index
  // actually changes. This removes the largest source of wasted work in dense Plex scenes.
  const persistentNeighborhood = useMemo(() => index.getNeighborhood(activePath), [index, activePath, renderRevision, semanticRevision]);
  const centralEditorCapable = Boolean(
    supportsCentralEditorFile(persistentNeighborhood?.center)
    || (persistentNeighborhood?.center.url && urlEmbed(persistentNeighborhood.center.url)),
  );
  const centralEditorAvailable = settings.embedCentralNode && centralEditorCapable;
  const centralEditorCanMaximize = surface !== "sidepanel";
  const [centralEditorMaximized, setCentralEditorMaximized] = useState(false);
  const centralEditorAvailabilityRef = useRef(centralEditorAvailable);
  const centralEditorSizeKeyRef = useRef("");
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const centralEditorRestoreCamera = useRef<{ x: number; y: number; scale: number } | null>(null);
  const restoreCentralEditorCamera = useRef(false);
  const centralEditorSize = useMemo<CenterNodeSize | undefined>(() => {
    if (!centralEditorAvailable) return undefined;
    if (centralEditorCanMaximize && centralEditorMaximized && viewportSize.width > 0 && viewportSize.height > 0) {
      return {
        width: Math.max(280, viewportSize.width - 36),
        // Reserve enough top/bottom Plex margin for the editor-local controls to sit outside the
        // document while still communicating that the user remains inside the graph surface.
        height: Math.max(220, viewportSize.height - 60),
      };
    }
    const availableWidth = viewportSize.width > 0 ? Math.max(180, viewportSize.width - 24) : Number.POSITIVE_INFINITY;
    const availableHeight = viewportSize.height > 0 ? Math.max(220, viewportSize.height - 80) : Number.POSITIVE_INFINITY;
    return {
      width: Math.min(availableWidth, Math.max(360, Math.min(720, settings.centerEmbedWidth))),
      height: Math.min(availableHeight, Math.max(260, Math.min(460, settings.centerEmbedHeight))),
    };
  }, [centralEditorAvailable, centralEditorCanMaximize, centralEditorMaximized, viewportSize.width, viewportSize.height, settings.centerEmbedWidth, settings.centerEmbedHeight]);
  const [sectionExpanded, setSectionExpanded] = useState(false);
  const [sectionExpansion, setSectionExpansion] = useState<CentralSectionExpansion | null>(null);
  const sectionProjectionRevision = [
    settings.showFolderNodes ? "1" : "0",
    settings.showTagNodes ? "1" : "0",
    settings.showPageNodes ? "1" : "0",
    settings.showURLNodes ? "1" : "0",
    settings.showAttachments ? "1" : "0",
    settings.showVirtualNodes ? "1" : "0",
    settings.showInferredNodes ? "1" : "0",
    settings.inferAllLinksAsFriends ? "1" : "0",
    settings.renderSiblings ? "1" : "0",
    settings.maxItemCount,
  ].join("|");
  // Presentation publications reproject cached section evidence; only semantic/source revisions
  // above may trigger the asynchronous Markdown expansion again.
  const projectedSectionExpansion = useMemo(() => sectionExpansion
    ? projectCentralSectionExpansion(plugin, index, sectionExpansion)
    : null, [sectionExpansion, plugin, index, sectionProjectionRevision, renderRevision, semanticRevision]);
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(new Set());
  const sectionFoldCenter = useRef<string | null>(null);
  const [sceneTransitioning, setSceneTransitioning] = useState(false);
  const [sceneMotion] = useState(() => new ElementMotion());
  const suppressLayoutMotionUntil = useRef(0);
  const previousNodeRects = useRef<Map<string, { left: number; top: number; width: number; height: number }>>(new Map());
  const [layoutRevision, setLayoutRevision] = useState(0);
  const [optimisticRelink, setOptimisticRelink] = useState<{ targetPath: string; role: GateRole } | null>(null);
  const [relationshipUpdating, setRelationshipUpdating] = useState(false);
  const effectivePersistentNeighborhood = useMemo(() => persistentNeighborhood && optimisticRelink
    ? applyOptimisticRelink(persistentNeighborhood, optimisticRelink.targetPath, optimisticRelink.role)
    : persistentNeighborhood, [persistentNeighborhood, optimisticRelink]);
  const effectiveSectionExpansion = useMemo(() => projectedSectionExpansion && optimisticRelink
    ? { ...projectedSectionExpansion, centerNeighborhood: applyOptimisticRelink(projectedSectionExpansion.centerNeighborhood, optimisticRelink.targetPath, optimisticRelink.role) }
    : projectedSectionExpansion, [projectedSectionExpansion, optimisticRelink]);
  const neighborhood = effectiveSectionExpansion?.centerNeighborhood ?? effectivePersistentNeighborhood;
  const globalFiltering = predicate !== null || lenses.lenses.some((lens) => lens.mode === "include" || lens.mode === "exclude");

  // Keep the optimistic role in place until the authoritative rebuilt graph actually agrees.
  // RelationModal awaits the metadata write/rebuild, but React may not have committed the new
  // index revision yet when its success callback fires. Clearing here instead of in the modal
  // callback prevents the confusing new-side → old-side → new-side flash.
  useEffect(() => {
    if (!optimisticRelink || !relationshipUpdating) return;
    if (!neighborhoodHasRelink(persistentNeighborhood, optimisticRelink.targetPath, optimisticRelink.role)) return;
    // Section expansion is rebuilt asynchronously from the new authoritative index. Keep the
    // optimistic overlay until that transient scene has caught up as well, otherwise expanded
    // mode can still flash the old side for one render.
    if (sectionExpanded && sectionExpansion && !neighborhoodHasRelink(sectionExpansion.centerNeighborhood, optimisticRelink.targetPath, optimisticRelink.role)) return;
    setOptimisticRelink(null);
    setRelationshipUpdating(false);
  }, [persistentNeighborhood, sectionExpanded, sectionExpansion, renderRevision, optimisticRelink, relationshipUpdating]);
  const layoutSectionExpansion = useMemo(() => {
    if (!effectiveSectionExpansion || !globalFiltering || filterLayoutMode !== "reflow") return effectiveSectionExpansion;
    const contextCenter = effectiveSectionExpansion.centerNeighborhood.center;
    return {
      ...effectiveSectionExpansion,
      centerNeighborhood: filterNeighborhoodForLenses(effectiveSectionExpansion.centerNeighborhood, contextCenter, predicateEngine, index, predicate, lenses),
      sections: effectiveSectionExpansion.sections.map((section) => ({
        ...section,
        neighborhood: filterNeighborhoodForLenses(section.neighborhood, contextCenter, predicateEngine, index, predicate, lenses),
      })),
    };
  }, [effectiveSectionExpansion, globalFiltering, filterLayoutMode, predicateEngine, index, predicate, lenses, predicateRevision]);
  const layoutNeighborhood = useMemo(() => {
    if (!neighborhood || !globalFiltering || filterLayoutMode !== "reflow" || layoutSectionExpansion) return neighborhood;
    return filterNeighborhoodForLenses(neighborhood, neighborhood.center, predicateEngine, index, predicate, lenses);
  }, [neighborhood, globalFiltering, filterLayoutMode, layoutSectionExpansion, predicateEngine, index, predicate, lenses, predicateRevision]);
  const scene = useMemo(() => layoutNeighborhood
    ? (layoutSectionExpansion
      ? buildSectionExpandedScene(layoutSectionExpansion, index, settings, expandedSectionIds, showCrossLinks, centralEditorSize, true)
      : buildScene(layoutNeighborhood, index, settings, showCrossLinks && globalFiltering, centralEditorSize, true))
    : { nodes: [], edges: [], zoneViewports: {}, zoneAreas: {} }, [layoutNeighborhood, layoutSectionExpansion, expandedSectionIds, index, settings, layoutRevision, showCrossLinks, globalFiltering, centralEditorSize]);
  const centralEditorNode = useMemo(() => centralEditorAvailable
    ? scene.nodes.find((node) => node.role === "center") ?? null
    : null, [centralEditorAvailable, scene.nodes]);
  const centralEditorPage = centralEditorAvailable ? persistentNeighborhood?.center ?? null : null;
  const centralEditorGeometry = useRef({ node: centralEditorNode, page: centralEditorPage });
  centralEditorGeometry.current = { node: centralEditorNode, page: centralEditorPage };
  const [nodeVisuals, setNodeVisuals] = useState<Map<string, NodeVisual>>(new Map());
  const visualRefreshTimers = useRef(new Map<string, number>());
  const visualPages = useMemo(() => [...new Map(
    scene.nodes.filter((node) => !node.page.transient).map((node) => [node.page.path, node.page]),
  ).values()], [scene.nodes]);
  const visualPageByPath = useMemo(() => new Map(visualPages.map((page) => [page.path, page])), [visualPages]);
  useEffect(() => {
    let cancelled = false;
    if (!visualPages.length) {
      setNodeVisuals(new Map());
      return () => { cancelled = true; };
    }
    void index.resolveNodeVisuals(visualPages).then((resolved) => { if (!cancelled) setNodeVisuals(resolved); });
    return () => { cancelled = true; };
  }, [index, visualPages, settings.thumbnailProperty, settings.nodeImageProperty, settings.attachmentImageDisplay, renderRevision]);
  useEffect(() => {
    const refreshVisibleVisual = (page: GraphPage) => {
      index.invalidateNodeVisual(page.path);
      void index.resolveNodeVisuals([page]).then((resolved) => {
        setNodeVisuals((current) => {
          const next = new Map(current);
          const visual = resolved.get(page.path);
          if (visual) next.set(page.path, visual); else next.delete(page.path);
          return next;
        });
      });
    };
    const ref = plugin.app.metadataCache.on("changed", (file) => {
      const page = visualPageByPath.get(file.path);
      if (!page) return;
      // Frontmatter is already in MetadataCache, so refresh immediately. Dataview-style inline
      // fields reach K-Plex's parsed-body cache through the normal incremental patch shortly after;
      // one debounced follow-up catches that state without forcing a file read or semantic emit.
      refreshVisibleVisual(page);
      const pending = visualRefreshTimers.current.get(page.path);
      if (pending !== undefined) window.clearTimeout(pending);
      visualRefreshTimers.current.set(page.path, window.setTimeout(() => {
        visualRefreshTimers.current.delete(page.path);
        const currentPage = visualPageByPath.get(page.path);
        if (currentPage) refreshVisibleVisual(currentPage);
      }, 3500));
    });
    return () => {
      plugin.app.metadataCache.offref(ref);
      for (const timer of visualRefreshTimers.current.values()) window.clearTimeout(timer);
      visualRefreshTimers.current.clear();
    };
  }, [plugin, index, visualPageByPath, settings.thumbnailProperty, settings.nodeImageProperty, settings.attachmentImageDisplay]);
  const viewport = useRef<HTMLDivElement | null>(null);
  const cameraElement = useRef<HTMLDivElement | null>(null);
  const centralEditorOverlayElement = useRef<HTMLDivElement | null>(null);
  const cameraFrame = useRef<number | null>(null);
  const cameraFrameWindow = useRef<Window | null>(null);
  const zoneScrollRefs = useRef<Partial<Record<ScrollZone, HTMLDivElement>>>({});
  const camera = useRef({ x: 0, y: 0, scale: 1 });
  const [hover, setHover] = useState<HoverState>(null);
  const hoverIntentTimer = useRef<number | null>(null);
  const edgeTooltipTimer = useRef<number | null>(null);
  const edgeTooltipPoint = useRef<Point>({ x: 0, y: 0 });
  const [edgeHoverTooltip, setEdgeHoverTooltip] = useState<EdgeHoverTooltip>(null);
  const [zoneScrollTop, setZoneScrollTop] = useState<ScrollValues>({ ...EMPTY_SCROLLS });
  const [zoneFilterOpen, setZoneFilterOpen] = useState<ZoneBooleanMap>({});
  const [zoneFilters, setZoneFilters] = useState<ZoneStringMap>({});
  const [pendingNodeFlair, setPendingNodeFlair] = useState<{ path: string; requestedAt: number } | null>(null);
  const [activeNodeFlair, setActiveNodeFlair] = useState<string | null>(null);
  const [flairFilterZone, setFlairFilterZone] = useState<ScrollZone | null>(null);
  const flairClearTimer = useRef<number | null>(null);
  const flairPendingTimer = useRef<number | null>(null);
  const [expandedScrollTop, setExpandedScrollTop] = useState<Record<string, number>>({});
  const historyDragHover = useRef<HTMLElement | null>(null);
  const [connectDrag, setConnectDrag] = useState<ConnectDrag | null>(null);
  const [nodeDrag, setNodeDrag] = useState<NodeDrag | null>(null);
  const [areaHover, setAreaHover] = useState<AreaHoverState>(null);
  const [externalDropZone, setExternalDropZone] = useState<GateRole | "center" | null>(null);
  const [resizingArea, setResizingArea] = useState<ScrollZone | null>(null);
  const areaResizeDrag = useRef<AreaResizeDrag | null>(null);
  const areaResizeFrame = useRef<{ owner: Window; id: number } | null>(null);
  const pendingAreaHeight = useRef<{ zone: ScrollZone; height: number } | null>(null);
  useEffect(/** Accept later settings edits after the local pointer gesture has released ownership. */ () => {
    if (!areaResizeDrag.current) setAreaHeightOverrides({});
  }, [viewSettings.parentMaxHeight, viewSettings.childMaxHeight, viewSettings.friendMaxHeight, viewSettings.siblingMaxHeight]);
  const panDrag = useRef<{ pointerId: number; button: number; pointerType: string; x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const areaSettingsDismissPointer = useRef<{ pointerId: number; startClientX: number; startClientY: number } | null>(null);
  const touchPointers = useRef(new Map<number, Point>());
  const pinchGesture = useRef<{ startDistance: number; worldMidpoint: Point; startScale: number } | null>(null);
  const suppressActivateUntil = useRef(0);
  const suppressSyntheticClickUntil = useRef(0);
  const suppressNativeDoubleClickUntil = useRef(0);
  const touchDoubleTap = useRef(new DoubleTapGesture());
  const layoutSaveTimer = useRef<number | null>(null);
  const preserveCameraOnNextLayout = useRef(false);
  const suppressAutoFitUntil = useRef(0);
  const updateSectionFolds = (updater: (current: Set<string>) => Set<string>): void => {
    // Folding is an outline operation, not navigation. Preserve the user's exact viewport while
    // the transient section scene reflows around the changed subtree.
    preserveCameraOnNextLayout.current = true;
    // Folding changes only the transient outline. ResizeObserver can fire while relation clusters
    // reflow; suppress auto-fit briefly so the camera remains *exactly* where the user left it.
    suppressAutoFitUntil.current = Date.now() + 2500;
    setExpandedSectionIds(updater);
  };
  const toggleCentralSections = (): void => {
    preserveCameraOnNextLayout.current = true;
    suppressAutoFitUntil.current = Date.now() + 2500;
    setSectionExpanded((current) => !current);
  };
  const sceneTransitionTimer = useRef<number | null>(null);
  const transitionPath = useRef(activePath);
  const pathChangedThisRender = transitionPath.current !== activePath;
  const touchLongPress = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    timer: number;
    nodePath?: string;
    edgeId?: string;
  } | null>(null);

  const pendingGateLongPress = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    timer: number;
    element: HTMLSpanElement;
    nodePath: string;
    gate: GateSide;
  } | null>(null);

  const cancelTouchLongPress = () => {
    if (touchLongPress.current) window.clearTimeout(touchLongPress.current.timer);
    touchLongPress.current = null;
  };

  const cancelPendingGateLongPress = () => {
    if (pendingGateLongPress.current) window.clearTimeout(pendingGateLongPress.current.timer);
    pendingGateLongPress.current = null;
  };

  useEffect(() => () => {
    cancelTouchLongPress();
    cancelPendingGateLongPress();
  }, []);

  useEffect(() => plugin.subscribeNodeFlair((path) => {
    if (flairClearTimer.current !== null) window.clearTimeout(flairClearTimer.current);
    if (flairPendingTimer.current !== null) window.clearTimeout(flairPendingTimer.current);
    setActiveNodeFlair(null);
    setFlairFilterZone(null);
    setPendingNodeFlair({ path, requestedAt: Date.now() });
    flairPendingTimer.current = window.setTimeout(() => {
      flairPendingTimer.current = null;
      setPendingNodeFlair((current) => current?.path === path ? null : current);
    }, 15000);
  }), [plugin]);

  useEffect(() => () => {
    if (flairClearTimer.current !== null) window.clearTimeout(flairClearTimer.current);
    if (flairPendingTimer.current !== null) window.clearTimeout(flairPendingTimer.current);
  }, []);

  const clearEdgeTooltip = () => {
    if (edgeTooltipTimer.current !== null) window.clearTimeout(edgeTooltipTimer.current);
    edgeTooltipTimer.current = null;
    setEdgeHoverTooltip(null);
  };

  const clearHoverIntent = (clearActive = false) => {
    if (hoverIntentTimer.current !== null) window.clearTimeout(hoverIntentTimer.current);
    hoverIntentTimer.current = null;
    clearEdgeTooltip();
    if (clearActive) setHover(null);
  };

  const scheduleHoverIntent = (next: Exclude<HoverState, null>) => {
    clearHoverIntent(false);
    hoverIntentTimer.current = window.setTimeout(() => {
      hoverIntentTimer.current = null;
      setHover(next);
    }, 750);
  };

  const edgeTooltipPosition = (clientX: number, clientY: number): Point => {
    const el = viewport.current;
    if (!el) return { x: 12, y: 12 };
    const rect = el.getBoundingClientRect();
    return {
      x: Math.max(8, Math.min(el.clientWidth - 260, clientX - rect.left + 14)),
      y: Math.max(8, Math.min(el.clientHeight - 110, clientY - rect.top + 14)),
    };
  };

  const scheduleEdgeHover = (edge: PositionedEdge, event: PointerEvent<SVGPathElement>) => {
    if (event.pointerType === "touch") return;
    scheduleHoverIntent({ kind: "edge", id: edge.id });
    edgeTooltipPoint.current = edgeTooltipPosition(event.clientX, event.clientY);
    edgeTooltipTimer.current = window.setTimeout(() => {
      edgeTooltipTimer.current = null;
      const text = edgeEvidenceTooltipText(index, edge, translate);
      if (!text) return;
      const point = edgeTooltipPoint.current;
      setEdgeHoverTooltip({ edgeId: edge.id, left: point.x, top: point.y, text });
    }, 1000);
  };

  const moveEdgeHover = (edge: PositionedEdge, event: PointerEvent<SVGPathElement>) => {
    if (event.pointerType === "touch") return;
    const point = edgeTooltipPosition(event.clientX, event.clientY);
    edgeTooltipPoint.current = point;
    setEdgeHoverTooltip((current) => current?.edgeId === edge.id
      ? { ...current, left: point.x, top: point.y }
      : current);
  };

  useEffect(() => {
    transitionPath.current = activePath;
    setSectionExpanded(false);
    setSectionExpansion(null);
    setExpandedSectionIds(new Set());
    sectionFoldCenter.current = null;
    setSceneTransitioning(true);
    if (sceneTransitionTimer.current !== null) window.clearTimeout(sceneTransitionTimer.current);
    sceneTransitionTimer.current = window.setTimeout(() => {
      sceneTransitionTimer.current = null;
      setSceneTransitioning(false);
    }, settings.animationSpeed <= 0 ? 0 : Math.max(140, Math.round(620 / Math.max(0.25, settings.animationSpeed))));
  }, [activePath, settings.animationSpeed]);

  useEffect(() => {
    if (!centralEditorAvailable || !sectionExpanded) return;
    preserveCameraOnNextLayout.current = true;
    suppressAutoFitUntil.current = Date.now() + 2500;
    setSectionExpanded(false);
    setSectionExpansion(null);
    setExpandedSectionIds(new Set());
    sectionFoldCenter.current = null;
  }, [centralEditorAvailable, sectionExpanded]);

  useEffect(() => {
    if (centralEditorAvailable || !centralEditorMaximized) return;
    preserveCameraOnNextLayout.current = true;
    suppressAutoFitUntil.current = Date.now() + 2500;
    restoreCentralEditorCamera.current = centralEditorRestoreCamera.current !== null;
    setCentralEditorMaximized(false);
  }, [centralEditorAvailable, centralEditorMaximized]);

  useEffect(() => {
    let cancelled = false;
    if (!sectionExpanded || !persistentNeighborhood?.center.file || persistentNeighborhood.center.file.extension !== "md") {
      setSectionExpansion(null);
      return () => { cancelled = true; };
    }
    void buildCentralSectionExpansion(plugin, index, persistentNeighborhood.center, () => !cancelled).then((expanded) => {
      if (cancelled) return;
      if (!expanded) {
        setSectionExpansion(null);
        setSectionExpanded(false);
        return;
      }
      setSectionExpansion(expanded);
      setExpandedSectionIds((current) => {
        const expandable = new Set(expanded.sections.filter((section) => section.childIds.length).map((section) => section.id));
        if (sectionFoldCenter.current !== expanded.centerPath) {
          sectionFoldCenter.current = expanded.centerPath;
          return expandable;
        }
        return new Set([...current].filter((id) => expandable.has(id)));
      });
      setSceneTransitioning(true);
      if (sceneTransitionTimer.current !== null) window.clearTimeout(sceneTransitionTimer.current);
      sceneTransitionTimer.current = window.setTimeout(() => {
        sceneTransitionTimer.current = null;
        setSceneTransitioning(false);
      }, settings.animationSpeed <= 0 ? 0 : Math.max(140, Math.round(620 / Math.max(0.25, settings.animationSpeed))));
    });
    return () => { cancelled = true; };
  }, [sectionExpanded, persistentNeighborhood?.center.path, persistentNeighborhood?.center.mtime, plugin, index, settings.animationSpeed]);
  /** Keep the native central editor in viewport coordinates so host canvases are never scaled by a DOM transform. */
  const syncCentralEditorOverlay = (): void => {
    const overlay = centralEditorOverlayElement.current;
    // Native wheel listeners outlive the render that installed them. Read current geometry so
    // zoom works after enabling the editor or selecting a different file, without requiring pan.
    const { node, page } = centralEditorGeometry.current;
    if (!overlay || !node || !page) return;
    if (overlay.classList.contains("is-native-view-fullscreen")) return;
    const current = camera.current;
    const width = Math.max(1, node.width * current.scale);
    const height = Math.max(1, node.height * current.scale);
    overlay.style.left = `${current.x + (node.x - node.width / 2) * current.scale}px`;
    overlay.style.top = `${current.y + (node.y - node.height / 2) * current.scale}px`;
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
  };

  const applyCamera = (nextOrUpdater: { x: number; y: number; scale: number } | ((current: { x: number; y: number; scale: number }) => { x: number; y: number; scale: number })) => {
    const next = typeof nextOrUpdater === "function" ? nextOrUpdater(camera.current) : nextOrUpdater;
    camera.current = next;
    // Pointer streams on iOS can deliver substantially more events than the screen can paint.
    // Coalesce camera writes to one per animation frame, and use a 2D transform for graph-only
    // content. Native embedded views are positioned separately above the camera so Excalidraw and
    // other host canvases continue receiving untransformed pointer coordinates at every Plex zoom.
    if (cameraFrame.current === null) {
      const viewWindow = cameraElement.current?.ownerDocument.defaultView ?? viewport.current?.ownerDocument.defaultView ?? window;
      cameraFrameWindow.current = viewWindow;
      cameraFrame.current = viewWindow.requestAnimationFrame(() => {
        cameraFrame.current = null;
        cameraFrameWindow.current = null;
        const element = cameraElement.current;
        if (element) {
          const current = camera.current;
          element.style.transform = `translate(${current.x}px, ${current.y}px) scale(${current.scale})`;
        }
        syncCentralEditorOverlay();
      });
    }
    return next;
  };

  const flushCameraTransform = () => {
    const element = cameraElement.current;
    const current = camera.current;
    if (element) element.style.transform = `translate(${current.x}px, ${current.y}px) scale(${current.scale})`;
    syncCentralEditorOverlay();
  };

  /** Expand or restore the embedded central editor without losing the user's previous Plex camera. */
  const setCentralEditorMaximizedState = (maximized: boolean): void => {
    if (maximized && !centralEditorCanMaximize) return;
    if (maximized === centralEditorMaximized) return;
    preserveCameraOnNextLayout.current = true;
    suppressAutoFitUntil.current = Date.now() + 2500;
    if (maximized) {
      centralEditorRestoreCamera.current = { ...camera.current };
      restoreCentralEditorCamera.current = false;
    } else {
      restoreCentralEditorCamera.current = true;
    }
    setCentralEditorMaximized(maximized);
  };

  /** Restore the graph camera when necessary, then return the center to its compact Plex node. */
  const collapseCentralEditor = (): void => {
    if (centralEditorMaximized && centralEditorRestoreCamera.current) {
      restoreCentralEditorCamera.current = false;
      applyCamera(centralEditorRestoreCamera.current);
      centralEditorRestoreCamera.current = null;
      flushCameraTransform();
    }
    setCentralEditorMaximized(false);
    onCentralNodeEditorChange(false);
  };

  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return;
    if (centralEditorMaximized && centralEditorAvailable) {
      applyCamera({ x: el.clientWidth / 2, y: el.clientHeight / 2, scale: 1 });
      flushCameraTransform();
      return;
    }
    if (!restoreCentralEditorCamera.current || !centralEditorRestoreCamera.current) return;
    restoreCentralEditorCamera.current = false;
    applyCamera(centralEditorRestoreCamera.current);
    centralEditorRestoreCamera.current = null;
    flushCameraTransform();
  }, [centralEditorMaximized, centralEditorAvailable, viewportSize.width, viewportSize.height]);

  const sceneLayoutKey = [
    activePath,
    centralEditorSize ? `central-editor:${centralEditorSize.width}:${centralEditorSize.height}` : "central-editor:-",
    scene.nodes.map((node) => `${node.role}:${node.page.path}:${node.x}:${node.y}:${node.width}:${node.height}`).join("|"),
    ...ZONES.map((zone) => {
      const panel = scene.zoneViewports[zone];
      return panel ? `${zone}:${panel.left}:${panel.top}:${panel.width}:${panel.height}:${panel.contentTop}:${panel.contentHeight}` : `${zone}:-`;
    }),
  ].join("::");

  useLayoutEffect(() => {
    const root = viewport.current;
    if (!root) return;
    // Measure actual target layout, never a retained or still-running transform from the prior
    // scene. Live configuration and relationship gestures own coordinates directly.
    sceneMotion.cancelAll();

    // Recenter only for initial display, explicit navigation, or an explicit central-editor mode
    // toggle. Index/metadata updates often add or move thoughts after an autosave or Sync event;
    // those updates must preserve the
    // user's exact camera and bounded-list scroll positions. FLIP still animates nodes into their
    // new layout, but the canvas itself stays anchored.
    const preserveCamera = preserveCameraOnNextLayout.current;
    const editorModeChanged = centralEditorAvailabilityRef.current !== centralEditorAvailable;
    const editorSizeKey = centralEditorSize ? `${centralEditorSize.width}:${centralEditorSize.height}` : "";
    const editorSizeChanged = centralEditorSizeKeyRef.current !== editorSizeKey;
    const shouldRecenter = !preserveCamera && (previousNodeRects.current.size === 0 || pathChangedThisRender || editorModeChanged || editorSizeChanged);
    if (shouldRecenter) {
      if (settings.allowAutozoom) fit();
      else {
        const el = viewport.current;
        if (el) applyCamera({ x: el.clientWidth / 2, y: el.clientHeight / 2, scale: 1 });
      }
      flushCameraTransform();
    }

    const nextRects = new Map<string, { left: number; top: number; width: number; height: number }>();
    const elements = root.querySelectorAll<HTMLElement>("[data-kplex-path]");
    elements.forEach((element) => {
      const path = element.dataset.kplexPath;
      if (!path) return;
      const rect = element.getBoundingClientRect();
      nextRects.set(path, { left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    });

    const speed = Math.max(0, Math.min(2, settings.animationSpeed));
    const reduceMotion = root.ownerDocument.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (speed > 0 && !reduceMotion && !areaResizeDrag.current && !nodeDrag && !connectDrag && Date.now() >= suppressLayoutMotionUntil.current) {
      // At 1x, shared thoughts migrate for ~520ms so their old→new position is legible without
      // making navigation feel delayed. The newly selected center moves more briskly (~300ms),
      // while genuinely new thoughts enter over ~390ms. The slider is a speed multiplier.
      const duration = Math.max(170, Math.round(520 / Math.max(0.25, speed)));
      const easing = "cubic-bezier(.2,.72,.22,1)";
      elements.forEach((element) => {
        const path = element.dataset.kplexPath;
        if (!path) return;
        const current = nextRects.get(path);
        if (!current) return;
        const previous = previousNodeRects.current.get(path);
        if (previous) {
          // Bounding rectangles are screen pixels; transforms live inside the scaled camera.
          const dx = (previous.left - current.left) / camera.current.scale;
          const dy = (previous.top - current.top) / camera.current.scale;
          const sx = current.width > 0 ? previous.width / current.width : 1;
          const sy = current.height > 0 ? previous.height / current.height : 1;
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5 || Math.abs(sx - 1) > 0.02 || Math.abs(sy - 1) > 0.02) {
            const isCenter = element.classList.contains("kplex-role-center");
            sceneMotion.play(element, [
              { transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.90 },
              { transformOrigin: "0 0", transform: "translate(0, 0) scale(1, 1)", opacity: 1 },
            ], { duration: isCenter ? Math.max(150, Math.round(duration * 0.58)) : duration, easing });
          }
          return;
        }

        const role = Array.from(element.classList).find((value) => value.startsWith("kplex-role-"))?.replace("kplex-role-", "") ?? "child";
        const offset = role === "parent" ? [0, 22] : role === "child" ? [0, -22] : role === "left" || role === "previous" ? [22, 0] : role === "right" || role === "next" ? [-22, 0] : [0, 14];
        sceneMotion.play(element, [
          { transform: `translate(${offset[0]}px, ${offset[1]}px) scale(.92)`, opacity: 0 },
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
        ], { duration: Math.max(160, Math.round(duration * 0.75)), easing });
      });
    }
    previousNodeRects.current = nextRects;
    centralEditorAvailabilityRef.current = centralEditorAvailable;
    centralEditorSizeKeyRef.current = editorSizeKey;
    preserveCameraOnNextLayout.current = false;
    syncCentralEditorOverlay();
  }, [sceneLayoutKey, settings.animationSpeed, nodeDrag?.path, connectDrag?.originPath, sceneMotion]);

  const fit = () => {
    const el = viewport.current;
    if (!el) return;
    if (centralEditorMaximized) {
      applyCamera({ x: el.clientWidth / 2, y: el.clientHeight / 2, scale: 1 });
      return;
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    const includeRect = (left: number, top: number, right: number, bottom: number) => {
      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, right);
      maxY = Math.max(maxY, bottom);
    };

    for (const node of scene.nodes) {
      const zone = zoneForRole(node.role);
      if (zone && scene.zoneViewports[zone]) continue;
      includeRect(node.x - node.width / 2 - 14, node.y - node.height / 2 - 14, node.x + node.width / 2 + 14, node.y + node.height / 2 + 14);
    }
    for (const zone of ZONES) {
      const panel = scene.zoneViewports[zone];
      if (!panel) continue;
      includeRect(panel.left - 12, panel.top - 12, panel.left + panel.width + 12, panel.top + panel.height + 12);
    }

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      applyCamera({ x: el.clientWidth / 2, y: el.clientHeight / 2, scale: 1 });
      return;
    }

    const graphWidth = Math.max(1, maxX - minX);
    const graphHeight = Math.max(1, maxY - minY);
    const padding = 46;
    const availableWidth = Math.max(80, el.clientWidth - padding * 2);
    const availableHeight = Math.max(80, el.clientHeight - padding * 2);
    const maxScale = Platform.isIosApp ? IOS_MAX_ZOOM : MAX_ZOOM;
    const scale = Math.max(0.18, Math.min(maxScale, availableWidth / graphWidth, availableHeight / graphHeight));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    applyCamera({
      scale,
      x: el.clientWidth / 2 - centerX * scale,
      y: el.clientHeight / 2 - centerY * scale,
    });
  };

  const toWorld = (clientX: number, clientY: number): Point => {
    const el = viewport.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: (clientX - rect.left - camera.current.x) / camera.current.scale,
      y: (clientY - rect.top - camera.current.y) / camera.current.scale,
    };
  };

  /** Identify native controls whose pointer and keyboard behavior the canvas must preserve. */
  const isAreaControlTarget = (target: Element | null): boolean => Boolean(target?.closest(
    ".kplex-zoom-controls, .kplex-zone-tools, .kplex-layout-controls, .kplex-filter-panel, input, select, textarea, button",
  ));

  /** Distinguish empty canvas from graph content before revealing frames or dismissing edit mode. */
  const isEmptyAreaTarget = (target: Element | null): boolean => {
    if (!target || isAreaControlTarget(target)) return false;
    return !target.closest(".kplex-thought, .kplex-edge-hit, [data-kplex-gate], .kplex-expanded-cluster");
  };

  /** Resolve the nearest editable edge in screen pixels, or an empty area interior in world coordinates. */
  const areaHoverAt = (
    clientX: number,
    clientY: number,
    target: Element | null,
    edgePixels = AREA_RESIZE_EDGE_PX,
    allowCoveredEdge = false,
  ): AreaHoverState => {
    if (!target || isAreaControlTarget(target)) return null;
    const emptyTarget = isEmptyAreaTarget(target);
    if (!emptyTarget && !allowCoveredEdge) return null;
    const point = toWorld(clientX, clientY);
    const threshold = edgePixels / Math.max(0.01, camera.current.scale);
    let edgeMatch: { zone: ScrollZone; distance: number } | null = null;
    const interiorMatches: Array<{ zone: ScrollZone; score: number }> = [];

    for (const zone of ZONES) {
      const area = scene.zoneAreas[zone];
      if (!area) continue;
      const right = area.left + area.width;
      const bottom = area.top + area.height;
      const resizeY = area.resizeEdge === "top" ? area.top : bottom;
      if (point.x >= area.left && point.x <= right) {
        const distance = Math.abs(point.y - resizeY);
        if (distance <= threshold && (!edgeMatch || distance < edgeMatch.distance)) edgeMatch = { zone, distance };
      }
      if (!emptyTarget || point.x < area.left || point.x > right || point.y < area.top || point.y > bottom) continue;
      const horizontalDistance = Math.abs(point.x - (area.left + area.width / 2)) / Math.max(1, area.width);
      const verticalDistance = Math.abs(point.y - (area.top + area.height / 2)) / Math.max(1, area.height);
      interiorMatches.push({ zone, score: horizontalDistance + verticalDistance * 0.12 });
    }

    if (edgeMatch) return { zone: edgeMatch.zone, edgeActive: true };
    interiorMatches.sort((a, b) => a.score - b.score);
    return interiorMatches[0] ? { zone: interiorMatches[0].zone, edgeActive: false } : null;
  };

  /** Avoid re-rendering the scene for pointer motion that stays on the same affordance. */
  const setAreaHoverIfChanged = (next: AreaHoverState): void => {
    setAreaHover((current) => current?.zone === next?.zone && current?.edgeActive === next?.edgeActive ? current : next);
  };

  /** Clamp and update an existing presentation setting while retaining the current camera; persistence happens at gesture end. */
  const setAreaHeight = (zone: ScrollZone, height: number): boolean => {
    const config = AREA_HEIGHT_CONFIG[zone];
    const next = Math.max(config.min, Math.min(config.max, Math.round(height)));
    if (plugin.settings[config.key] === next) return false;
    plugin.settings[config.key] = next;
    setAreaHeightOverrides((current) => ({ ...current, [config.key]: next }));
    preserveCameraOnNextLayout.current = true;
    suppressAutoFitUntil.current = Date.now() + 1200;
    setLayoutRevision((value) => value + 1);
    return true;
  };

  /** Commit the latest sampled height once per paint, or synchronously before release/save. */
  const flushAreaHeight = (): void => {
    const frame = areaResizeFrame.current;
    if (frame) frame.owner.cancelAnimationFrame(frame.id);
    areaResizeFrame.current = null;
    const pending = pendingAreaHeight.current;
    pendingAreaHeight.current = null;
    if (pending && setAreaHeight(pending.zone, pending.height) && areaResizeDrag.current) areaResizeDrag.current.changed = true;
  };

  /** Finish only the owning pointer and persist a changed height once, without scheduling a semantic rebuild. */
  const finishAreaResize = (pointerId: number): boolean => {
    const drag = areaResizeDrag.current;
    if (!drag || drag.pointerId !== pointerId) return false;
    flushAreaHeight();
    areaResizeDrag.current = null;
    setResizingArea(null);
    if (drag.changed) void plugin.saveSettings(false);
    return true;
  };

  /** Remember an empty-canvas press so a stationary release can exit area editing. */
  const armAreaSettingsDismiss = (e: PointerEvent<HTMLDivElement>, target: Element): void => {
    if (!areaSettingsMode || !isEmptyAreaTarget(target)) {
      areaSettingsDismissPointer.current = null;
      return;
    }
    areaSettingsDismissPointer.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
    };
  };

  /** Retain editing during pan gestures by cancelling the stationary-press candidate after movement. */
  const updateAreaSettingsDismiss = (e: PointerEvent<HTMLDivElement>): void => {
    const pending = areaSettingsDismissPointer.current;
    if (!pending || pending.pointerId !== e.pointerId) return;
    if (Math.hypot(e.clientX - pending.startClientX, e.clientY - pending.startClientY) > 7) {
      areaSettingsDismissPointer.current = null;
    }
  };

  /** Exit editing only after an unmoved empty-canvas press, leaving pan and resize sessions active. */
  const finishAreaSettingsDismiss = (e: PointerEvent<HTMLDivElement>): void => {
    const pending = areaSettingsDismissPointer.current;
    if (!pending || pending.pointerId !== e.pointerId) return;
    areaSettingsDismissPointer.current = null;
    const panMoved = panDrag.current?.pointerId === e.pointerId && panDrag.current.moved;
    if (!panMoved && Math.hypot(e.clientX - pending.startClientX, e.clientY - pending.startClientY) <= 7) {
      onAreaSettingsModeChange(false);
      setAreaHoverIfChanged(null);
    }
  };

  useEffect(() => {
    /** Persist an interrupted edit before navigation or surface teardown discards its pointer. */
    return () => {
      flushAreaHeight();
      const drag = areaResizeDrag.current;
      areaResizeDrag.current = null;
      if (drag?.changed) void plugin.saveSettings(false);
    };
  }, [plugin, activePath]);

  useEffect(() => {
    // Zone scroll/filter state is navigation state. Reset it only when the central note changes,
    // never when the same graph receives a delayed metadata/index update.
    const nextScrolls: ScrollValues = { ...EMPTY_SCROLLS };
    for (const zone of ZONES) nextScrolls[zone] = scene.zoneViewports[zone]?.initialScrollTop ?? 0;
    setZoneScrollTop(nextScrolls);
    setZoneFilterOpen({});
    setZoneFilters({});
    setExpandedScrollTop({});
    clearHoverIntent(true);
    setConnectDrag(null);
    setNodeDrag(null);
    setAreaHover(null);
    setResizingArea(null);
    areaResizeDrag.current = null;
    areaSettingsDismissPointer.current = null;
    panDrag.current = null;

    const resetTimer = window.setTimeout(() => {
      for (const zone of ZONES) {
        const scrollEl = zoneScrollRefs.current[zone];
        if (scrollEl) scrollEl.scrollTop = nextScrolls[zone];
      }
    }, 0);
    return () => window.clearTimeout(resetTimer);
  }, [activePath]);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    type WindowWithResizeObserver = Window & { ResizeObserver: typeof ResizeObserver };
    const owningWindow = (el.ownerDocument.defaultView ?? window) as WindowWithResizeObserver;
    const updateViewport = (): void => {
      setViewportSize((current) => {
        const width = el.clientWidth;
        const height = el.clientHeight;
        return current.width === width && current.height === height ? current : { width, height };
      });
      if (centralEditorMaximized || Date.now() < suppressAutoFitUntil.current) return;
      if (settings.allowAutozoom) fit();
    };
    updateViewport();
    const observer = new owningWindow.ResizeObserver(updateViewport);
    observer.observe(el);
    return () => observer.disconnect();
  }, [settings.allowAutozoom, centralEditorMaximized]);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      const target = e.target as Element | null;
      // Native wheel scrolling is retained only inside bounded thought lists. Everywhere else
      // the wheel zooms, regardless of whether the wheel/middle button is currently pressed.
      if (target?.closest?.(".kplex-central-editor-content, .kplex-zone-scroll, .kplex-expanded-scroll, .modal-container")) return;
      e.preventDefault();
      if (centralEditorMaximized) return;
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0015);
      applyCamera((c) => {
        const nextScale = Math.max(0.3, Math.min(Platform.isIosApp ? IOS_MAX_ZOOM : MAX_ZOOM, c.scale * factor));
        const worldX = (px - c.x) / c.scale;
        const worldY = (py - c.y) / c.scale;
        const next = { scale: nextScale, x: px - worldX * nextScale, y: py - worldY * nextScale };
        // If the middle/left/right pan gesture is also active, reset its anchor to the newly
        // zoomed camera so the next pointermove cannot snap back to the pre-zoom position.
        const drag = panDrag.current;
        if (drag) {
          drag.x = e.clientX;
          drag.y = e.clientY;
          drag.cx = next.x;
          drag.cy = next.y;
        }
        return next;
      });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [centralEditorMaximized]);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    /** Keep graph touch gestures local while preserving native scrolling in empty bounded lists. */
    const protectTouchGesture = (event: TouchEvent) => {
      // K-Plex owns touch gestures inside its canvas. Stop Obsidian Mobile's edge/top swipe
      // recognizers from interpreting graph pans as sidebar/command-palette gestures. Native
      // editor/relationship scrolling remains available inside their bounded surfaces.
      const target = event.target as Element | null;
      if (target?.closest?.(".kplex-central-editor-content, .modal-container, input, select, textarea, button")) return;
      event.stopPropagation();
      const scrollSurface = target?.closest?.(".kplex-zone-scroll, .kplex-expanded-scroll");
      const graphTarget = target?.closest?.("[data-kplex-path], .kplex-edge-hit");
      // Empty bounded relationship lists keep native one-finger scrolling. A touch that starts on
      // a thought/connector belongs to the Plex, so two-finger pinch works even when the Plex is
      // visually full of thoughts (important on iPad where there may be almost no bare canvas).
      if (scrollSurface && !graphTarget) return;
      if (event.cancelable) event.preventDefault();
    };
    el.addEventListener("touchstart", protectTouchGesture, { passive: false });
    el.addEventListener("touchmove", protectTouchGesture, { passive: false });
    return () => {
      el.removeEventListener("touchstart", protectTouchGesture);
      el.removeEventListener("touchmove", protectTouchGesture);
    };
  }, []);

  useEffect(() => () => {
    if (layoutSaveTimer.current !== null) window.clearTimeout(layoutSaveTimer.current);
    layoutDraft.current = null;
    // Only an unstarted debounce needs flushing. A save already awaiting view refresh has written
    // its settings and must not start a second persistence operation while this view retires.
    if (typographySave.current) {
      typographySave.current.window.clearTimeout(typographySave.current.id);
      void plugin.saveSettings(false);
    }
    typographySave.current = null;
    typographyDraft.current = null;
    sceneMotion.cancelAll();
    if (hoverIntentTimer.current !== null) window.clearTimeout(hoverIntentTimer.current);
    if (edgeTooltipTimer.current !== null) window.clearTimeout(edgeTooltipTimer.current);
    if (sceneTransitionTimer.current !== null) window.clearTimeout(sceneTransitionTimer.current);
    if (cameraFrame.current !== null) (cameraFrameWindow.current ?? window).cancelAnimationFrame(cameraFrame.current);
    cameraFrameWindow.current = null;
    viewport.current?.classList.remove("is-touch-gesturing", "is-pinch-gesturing");
  }, [sceneMotion]);

  /** Debounce the current surface's axis and column values without requesting semantic work. */
  const scheduleLayoutSave = () => {
    if (layoutSaveTimer.current !== null) window.clearTimeout(layoutSaveTimer.current);
    layoutSaveTimer.current = window.setTimeout(() => {
      layoutSaveTimer.current = null;
      const draft = layoutDraft.current;
      if (!draft) return;
      void plugin.updateLayoutProfile(surface, draft).then(/** Retire only the saved draft; a newer input must remain visible. */ () => {
        if (layoutDraft.current !== draft) return;
        layoutDraft.current = null;
        setLayoutOverrides({});
      });
    }, 180);
  };

  const filterMatchedNodePaths = useMemo(() => {
    const matches = new Set<string>();
    for (const node of scene.nodes) {
      if (!globalFiltering || node.role === "center" || (matchesGraphPredicateNode(predicateEngine, predicate, node, neighborhood?.center) && matchesVisibleLensNode(predicateEngine, index, lenses, node, neighborhood?.center))) matches.add(node.page.path);
    }
    // Section headings are structural containers. If a section-level relationship matches the
    // global filter, retain its heading node so the matching result is not visually orphaned.
    if (sectionExpansion && globalFiltering) {
      for (const edge of scene.edges) {
        if (!matches.has(edge.targetPath)) continue;
        const source = scene.nodes.find((node) => node.page.path === edge.sourcePath);
        if (source?.page.transient?.kind === "section") matches.add(source.page.path);
      }
    }
    return matches;
  }, [scene.nodes, scene.edges, globalFiltering, predicate, lenses, predicateRevision, predicateEngine, index, neighborhood?.center, sectionExpansion]);

  const zoneDisplayLayouts = useMemo(() => {
    const layouts: Partial<Record<ScrollZone, ZoneDisplayLayout>> = {};
    for (const zone of ZONES) {
      const panel = scene.zoneViewports[zone];
      if (!panel) continue;
      const nodes = scene.nodes.filter((node) => zoneForRole(node.role) === zone && filterMatchedNodePaths.has(node.page.path));
      const layout = buildZoneDisplayLayout(zone, panel, nodes, zoneFilters[zone] ?? "", settings, index, neighborhood?.center.path ?? activePath);
      layouts[zone] = layout;
    }
    return layouts;
  }, [scene.nodes, scene.zoneViewports, filterMatchedNodePaths, zoneFilters, settings.parentColumns, settings.childColumns, layoutRevision, index, neighborhood?.center, activePath]);

  const renderedNodeMap = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    for (const node of scene.nodes) {
      const zone = zoneForRole(node.role);
      const panel = zone ? scene.zoneViewports[zone] : undefined;
      const local = zone ? zoneDisplayLayouts[zone]?.localPositions.get(node.page.path) : undefined;
      let rendered = panel && zone && local
        ? { ...node, x: panel.left + local.x, y: panel.top + local.y - zoneScrollTop[zone] }
        : node;
      if (nodeDrag?.path === node.page.path) rendered = { ...rendered, x: nodeDrag.x, y: nodeDrag.y };
      map.set(node.page.path, rendered);
    }
    return map;
  }, [scene.nodes, scene.zoneViewports, zoneDisplayLayouts, zoneScrollTop, nodeDrag]);

  useEffect(() => {
    const pending = pendingNodeFlair;
    if (!pending) return;
    const targetNode = scene.nodes.find((node) => node.page.path === pending.path);
    if (!targetNode) return;

    const finishFlair = (path: string | null, filterZone: ScrollZone | null) => {
      if (flairPendingTimer.current !== null) {
        window.clearTimeout(flairPendingTimer.current);
        flairPendingTimer.current = null;
      }
      setPendingNodeFlair(null);
      setActiveNodeFlair(path);
      setFlairFilterZone(filterZone);
      if (flairClearTimer.current !== null) window.clearTimeout(flairClearTimer.current);
      flairClearTimer.current = window.setTimeout(() => {
        flairClearTimer.current = null;
        setActiveNodeFlair(null);
        setFlairFilterZone(null);
      }, 3600);
    };

    const zone = zoneForRole(targetNode.role);
    const panel = zone ? scene.zoneViewports[zone] : undefined;
    if (zone && panel) {
      const layout = zoneDisplayLayouts[zone];
      const local = layout?.localPositions.get(pending.path);
      if (!local) {
        // The relationship exists, but a bounded-list filter is hiding it. Point the user's
        // attention at the filter rather than silently failing to show where the new link went.
        finishFlair(null, zone);
        return;
      }

      const viewWindow = viewport.current?.ownerDocument.defaultView ?? window;
      viewWindow.requestAnimationFrame(() => {
        const scrollEl = zoneScrollRefs.current[zone];
        if (!scrollEl) return;
        const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
        const targetTop = Math.max(0, Math.min(maxScroll, local.y - scrollEl.clientHeight / 2));
        scrollEl.scrollTo({ top: targetTop, behavior: "smooth" });
      });
    }

    // Find actions also need to recover from a manually panned/zoomed Plex. Scrollable zones own
    // their internal vertical position, so make the whole zone visible; other nodes use their own
    // world-space rectangle. This keeps camera movement minimal instead of resetting zoom-to-fit.
    const viewportEl = viewport.current;
    if (viewportEl) {
      const rect = panel
        ? { left: panel.left, top: panel.top, right: panel.left + panel.width, bottom: panel.top + panel.height }
        : {
          left: targetNode.x - targetNode.width / 2,
          top: targetNode.y - targetNode.height / 2,
          right: targetNode.x + targetNode.width / 2,
          bottom: targetNode.y + targetNode.height / 2,
        };
      const current = camera.current;
      const margin = 32;
      const left = current.x + rect.left * current.scale;
      const right = current.x + rect.right * current.scale;
      const top = current.y + rect.top * current.scale;
      const bottom = current.y + rect.bottom * current.scale;
      let dx = 0;
      let dy = 0;
      if (left < margin) dx = margin - left;
      else if (right > viewportEl.clientWidth - margin) dx = viewportEl.clientWidth - margin - right;
      if (top < margin) dy = margin - top;
      else if (bottom > viewportEl.clientHeight - margin) dy = viewportEl.clientHeight - margin - bottom;
      if (dx || dy) applyCamera({ ...current, x: current.x + dx, y: current.y + dy });
    }

    finishFlair(pending.path, null);
  }, [pendingNodeFlair, scene.nodes, scene.zoneViewports, zoneDisplayLayouts]);

  const visibleNodePaths = useMemo(() => {
    const paths = new Set<string>();
    for (const node of scene.nodes) {
      if (!filterMatchedNodePaths.has(node.page.path)) continue;
      if (nodeDrag?.path === node.page.path) {
        paths.add(node.page.path);
        continue;
      }
      const zone = zoneForRole(node.role);
      const panel = zone ? scene.zoneViewports[zone] : undefined;
      if (!zone || !panel) {
        paths.add(node.page.path);
        continue;
      }
      if (!zoneDisplayLayouts[zone]?.localPositions.has(node.page.path)) continue;
      const rendered = renderedNodeMap.get(node.page.path);
      if (!rendered) continue;
      const panelBottom = panel.top + panel.height;
      // Connectors only exist while the corresponding clipped node is actually visible.
      if (rendered.y - rendered.height / 2 >= panel.top && rendered.y + rendered.height / 2 <= panelBottom) {
        paths.add(node.page.path);
      }
    }
    return paths;
  }, [scene.nodes, scene.zoneViewports, filterMatchedNodePaths, zoneDisplayLayouts, renderedNodeMap, nodeDrag]);

  const filteredGateCounts = useMemo(() => {
    const counts = new Map<string, Record<GateSide, number>>();
    if (!globalFiltering) return counts;
    const ensure = (path: string) => {
      let item = counts.get(path);
      if (!item) {
        item = { top: 0, bottom: 0, left: 0, right: 0 };
        counts.set(path, item);
      }
      return item;
    };
    for (const node of scene.nodes) ensure(node.page.path);
    for (const edge of scene.edges) {
      if (!filterMatchedNodePaths.has(edge.sourcePath) || !filterMatchedNodePaths.has(edge.targetPath)) continue;
      const gates = gatesForEdge(edge);
      ensure(edge.sourcePath)[gates.source] += 1;
      ensure(edge.targetPath)[gates.target] += 1;
    }
    return counts;
  }, [globalFiltering, scene.nodes, scene.edges, filterMatchedNodePaths]);

  const expandedClusters = useMemo<ExpandedCluster[]>(() => {
    if (sectionExpansion || settings.graphDepth !== 2 || !neighborhood) return [];
    const clusters: ExpandedCluster[] = [];

    for (const baseNode of scene.nodes) {
      if (baseNode.role === "center" || !visibleNodePaths.has(baseNode.page.path)) continue;
      if (nodeDrag?.path === baseNode.page.path) continue;
      const parent = renderedNodeMap.get(baseNode.page.path);
      if (!parent) continue;

      const visibilityFiltering = predicate !== null || lenses.lenses.some((lens) => lens.mode === "include" || lens.mode === "exclude");
      const relations = index.neighbours(baseNode.page, "child")
        .filter((child) => child.page.path !== neighborhood.center.path)
        .filter((child) => !visibilityFiltering || matchesVisibleCandidate(
          predicateEngine,
          index,
          predicate,
          lenses,
          child.page,
          index.titleFor(child.page),
          child.typeDefinition,
          neighborhood.center,
          {
            role: child.role,
            relationType: child.relationType,
            linkDirection: child.linkDirection,
            sourcePath: baseNode.page.path,
            targetPath: child.page.path,
          },
        ))
        .slice(0, settings.maxItemCount);
      if (!relations.length) continue;

      const miniScale = parent.role === "sibling" ? siblingScale(settings) : 1;
      const metrics = expandedMiniLayout(settings, parent.width, relations.length, miniScale);
      const { width, columns, rowHeight, contentHeight, columnGap, topGap } = metrics;
      const top = parent.y + parent.height / 2 + topGap;
      const zone = zoneForRole(baseNode.role);
      const bounds = zone ? scene.zoneViewports[zone] ?? scene.zoneAreas[zone] : undefined;
      // Child boxes are rendered above the camera as siblings of scrollers. Clip their actual
      // viewport to their owning band's bottom so they cannot leak into the child region.
      const viewportHeight = bounds ? Math.min(metrics.viewportHeight, bounds.top + bounds.height - top) : metrics.viewportHeight;
      if (viewportHeight <= 0) continue;
      const cellWidth = width / columns;
      const scrollTop = Math.max(0, Math.min(expandedScrollTop[parent.page.path] ?? 0, Math.max(0, contentHeight - viewportHeight)));

      const children: ExpandedMiniThought[] = relations.map((relation, indexValue) => {
        const col = indexValue % columns;
        const row = Math.floor(indexValue / columns);
        const baseStyle = resolveNodeStyle(relation.page, relation, "child", settings);
        const label = index.titleFor(relation.page);
        const lensStyle = graphLensNodeStyle(predicateEngine, index, lenses, {
          page: relation.page,
          label,
          center: neighborhood.center,
          edge: { role: relation.role, relationType: relation.relationType, definition: relation.typeDefinition, linkDirection: relation.linkDirection, sourcePath: baseNode.page.path, targetPath: relation.page.path },
        });
        const style = { ...baseStyle, ...lensStyle };
        const maxChars = Math.min(22, effectiveLabelLimit(settings, style.maxLabelLength ?? 30));
        const shownChars = Math.min(label.length, maxChars);
        const nodeWidth = Math.max(64 * miniScale, Math.min(cellWidth - columnGap, (34 + shownChars * 3.8) * miniScale));
        return {
          key: `${parent.page.path}::${relation.page.path}::${indexValue}`,
          relation,
          label,
          style,
          localX: (col + 0.5) * cellWidth,
          localY: row * rowHeight + rowHeight / 2,
          width: nodeWidth,
          height: 16 * miniScale * (settings.baseFontSize ?? 12.4) / 12.4,
        };
      });

      clusters.push({
        parent,
        left: parent.x - width / 2,
        top,
        width,
        viewportHeight,
        contentHeight,
        scrollTop,
        children,
      });
    }

    return clusters;
  }, [sectionExpansion, settings.graphDepth, settings.compactingFactor, settings.horizontalCompactingFactor, settings.compactView, settings.minLinkLength, settings.childColumns, settings.maxItemCount, settings.siblingRelativeSize, neighborhood, scene.nodes, visibleNodePaths, renderedNodeMap, expandedScrollTop, index, layoutRevision, predicate, lenses, predicateRevision, predicateEngine]);

  const retainedPresentationDemand = useRef<Set<GraphPage>>(new Set());
  /** Retain exact visible page membership across unrelated scene renders; new page incarnations still repair. */
  const presentationDemandPages = useMemo(() => {
    const pages = new Set<GraphPage>();
    for (const node of scene.nodes) if (visibleNodePaths.has(node.page.path)) pages.add(node.page);
    for (const cluster of expandedClusters) for (const child of cluster.children) {
      const y = cluster.top + child.localY - cluster.scrollTop;
      if (y - child.height / 2 >= cluster.top && y + child.height / 2 <= cluster.top + cluster.viewportHeight) {
        pages.add(child.relation.page);
      }
    }
    const retained = retainedPresentationDemand.current;
    if (retained.size === pages.size && [...pages].every(page => retained.has(page))) return retained;
    retainedPresentationDemand.current = pages;
    return pages;
  }, [scene.nodes, visibleNodePaths, expandedClusters]);
  useEffect(() => {
    let release: (() => void) | null = null;
    /** Hidden Obsidian leaves stay mounted; release optional work until this surface is revealed. */
    const refreshVisibility = (): void => {
      const visible = plugin.isKplexLeafVisible(hostLeaf);
      if (visible && !release) release = index.acquirePresentationDemand(presentationDemandPages);
      else if (!visible && release) { release(); release = null; }
    };
    refreshVisibility();
    const unsubscribe = plugin.subscribeKplexVisibility(refreshVisibility);
    return () => { unsubscribe(); release?.(); };
  }, [plugin, hostLeaf, index, presentationDemandPages]);

  const expandedConnectors = useMemo(() => {
    if (settings.graphDepth !== 2) return [] as Array<{ key: string; d: string; stroke: string; width: number; dash?: string; markerStart?: string; markerEnd?: string; definition?: string }>;
    const connectors: Array<{ key: string; d: string; stroke: string; width: number; dash?: string; markerStart?: string; markerEnd?: string; definition?: string }> = [];
    for (const cluster of expandedClusters) {
      const source = gatePoint(cluster.parent, "bottom");
      for (const child of cluster.children) {
        const childY = cluster.top + child.localY - cluster.scrollTop;
        const childTop = childY - child.height / 2;
        const childBottom = childY + child.height / 2;
        if (childTop < cluster.top || childBottom > cluster.top + cluster.viewportHeight) continue;
        const target = { x: cluster.left + child.localX, y: childTop - 2 };
        const geometry = edgeGeometry(source, target, "bottom", "top", settings.connectorStyle);
        const baseStyle = resolveLinkStyle(child.relation, settings);
        const lensStyle = neighborhood ? graphLensEdgeStyle(predicateEngine, index, lenses, {
          page: child.relation.page,
          label: child.label,
          center: neighborhood.center,
          edge: { role: child.relation.role, relationType: child.relation.relationType, definition: child.relation.typeDefinition, linkDirection: child.relation.linkDirection, sourcePath: cluster.parent.page.path, targetPath: child.relation.page.path },
        }) : {};
        const style = { ...baseStyle, ...lensStyle };
        const reverse = child.relation.linkDirection === (settings.inverseArrowDirection ? LinkDirection.TO : LinkDirection.FROM);
        connectors.push({
          key: child.key,
          definition: child.relation.typeDefinition,
          d: geometry.d,
          stroke: alphaHexToCss(style.strokeColor, "rgba(190,210,235,.52)"),
          width: Math.max(0.65, (style.strokeWidth ?? 1.2) * 0.75),
          dash: style.strokeStyle === "dashed" ? "5 5" : style.strokeStyle === "dotted" ? "1.5 5" : undefined,
          markerStart: markerFor(reverse ? style.endArrowHead : style.startArrowHead),
          markerEnd: markerFor(reverse ? style.startArrowHead : style.endArrowHead),
        });
      }
    }
    return connectors;
  }, [expandedClusters, settings.graphDepth, settings.connectorStyle, settings.inverseArrowDirection, settings.baseLinkStyle, settings.hierarchyLinkStyles, neighborhood, predicateEngine, index, lenses, predicateRevision]);

  // Find uses this surface's projection, including overflow rows and expanded children.
  // Global lenses and area filters exclude candidates; camera clipping does not.
  const findNodePaths = new Set<string>();
  for (const node of scene.nodes) {
    const zone = zoneForRole(node.role);
    if (!filterMatchedNodePaths.has(node.page.path)) continue;
    if (zone && scene.zoneViewports[zone] && !zoneDisplayLayouts[zone]?.localPositions.has(node.page.path)) continue;
    if (matchesFindNode(findQuery, node.label, node.page.path, findIncludePath)) findNodePaths.add(node.page.path);
  }
  for (const cluster of expandedClusters) for (const child of cluster.children) {
    if (matchesFindNode(findQuery, child.label, child.relation.page.path, findIncludePath)) findNodePaths.add(child.relation.page.path);
  }
  const findPaths = [...findNodePaths];
  const finding = !centralEditorMaximized && Boolean(findQuery.trim());
  const findHitKey = JSON.stringify(findPaths);
  /** Reveal a projected hit through its own overflow list and this surface's camera. */
  const revealFindHit = (path: string): void => {
    const root = viewport.current;
    if (!root) return;
    const target = Array.from(root.querySelectorAll<HTMLElement>("[data-kplex-path]")).find((element) => element.dataset.kplexPath === path);
    if (!target) return;
    const scroll = target.closest<HTMLElement>(".kplex-zone-scroll, .kplex-expanded-scroll");
    if (scroll) {
      const nodeRect = target.getBoundingClientRect(), scrollRect = scroll.getBoundingClientRect();
      if (nodeRect.top < scrollRect.top || nodeRect.bottom > scrollRect.bottom) {
        scroll.scrollTo({ top: scroll.scrollTop + ((nodeRect.top + nodeRect.bottom - scrollRect.top - scrollRect.bottom) / 2) / camera.current.scale, behavior: "auto" });
      }
    }
    const rect = target.getBoundingClientRect(), bounds = root.getBoundingClientRect();
    const dx = rect.left < bounds.left + 32 ? bounds.left + 32 - rect.left : rect.right > bounds.right - 32 ? bounds.right - 32 - rect.right : 0;
    const dy = rect.top < bounds.top + 48 ? bounds.top + 48 - rect.top : rect.bottom > bounds.bottom - 32 ? bounds.bottom - 32 - rect.bottom : 0;
    if (dx || dy) applyCamera((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
  };
  useEffect(/** Typing/cycling reveals a hit without changing the center or history. */ () => {
    if (!centralEditorMaximized && findPaths.length) revealFindHit(findPaths[((findCursor % findPaths.length) + findPaths.length) % findPaths.length]);
  }, [findQuery, findCursor, findHitKey, centralEditorMaximized]);

  /** Ordinary scenes acquire cross-links only for clipped visible rows; filtering retains the full-scene edge/count policy. */
  const visibleEdges = useMemo(() => {
    const edges = scene.edges.filter((edge) => visibleNodePaths.has(edge.sourcePath) && visibleNodePaths.has(edge.targetPath));
    if (showCrossLinks && !globalFiltering && !layoutSectionExpansion && neighborhood) {
      appendVisibleCrossLinks(scene.nodes.filter(node => visibleNodePaths.has(node.page.path)), edges,
        index, settings, neighborhood.center.path);
    }
    return edges.map((edge) => {
      const target = scene.nodes.find((node) => node.page.path === edge.targetPath);
      if (!target || !neighborhood) return edge;
      const lensStyle = graphLensEdgeStyle(predicateEngine, index, lenses, {
        page: target.page,
        label: target.label,
        center: neighborhood.center,
        edge: {
          role: edge.role, relationType: edge.relationType, definition: edge.typeDefinition, linkDirection: edge.direction,
          sourcePath: edge.explanationSourcePath ?? edge.sourcePath, targetPath: edge.explanationTargetPath ?? edge.targetPath,
        },
      });
      return Object.keys(lensStyle).length ? { ...edge, style: { ...edge.style, ...lensStyle } } : edge;
    });
  }, [scene.edges, scene.nodes, visibleNodePaths, neighborhood, predicateEngine, index, settings, lenses,
    predicateRevision, showCrossLinks, globalFiltering, layoutSectionExpansion]);

  const interaction = useMemo(() => {
    const edgeIds = new Set<string>();
    const nodePaths = new Set<string>();
    const gates = new Set<string>();
    if (!hover) return { edgeIds, nodePaths, gates };

    if (hover.kind === "edge") edgeIds.add(hover.id);
    else if (hover.kind === "node") {
      nodePaths.add(hover.path);
      for (const edge of visibleEdges) if (edge.sourcePath === hover.path || edge.targetPath === hover.path) edgeIds.add(edge.id);
    } else {
      nodePaths.add(hover.path);
      gates.add(gateKey(hover.path, hover.gate));
      for (const edge of visibleEdges) {
        const edgeGates = gatesForEdge(edge);
        if ((edge.sourcePath === hover.path && edgeGates.source === hover.gate) || (edge.targetPath === hover.path && edgeGates.target === hover.gate)) edgeIds.add(edge.id);
      }
    }

    for (const edge of visibleEdges) {
      if (!edgeIds.has(edge.id)) continue;
      const edgeGates = gatesForEdge(edge);
      nodePaths.add(edge.sourcePath);
      nodePaths.add(edge.targetPath);
      gates.add(gateKey(edge.sourcePath, edgeGates.source));
      gates.add(gateKey(edge.targetPath, edgeGates.target));
    }
    return { edgeIds, nodePaths, gates };
  }, [hover, visibleEdges]);

  const connectBlockedPaths = useMemo(() => {
    if (!connectDrag) return new Set<string>();
    const origin = index.get(connectDrag.originPath);
    if (!origin) return new Set<string>();
    if (origin.isFolder) {
      // A folder's child gate is a creation gesture, not a relationship gesture. Dim all other
      // nodes while dragging because the drop position does not select a relationship target.
      return new Set(scene.nodes.map((node) => node.page.path).filter((path) => path !== origin.path));
    }
    const blocked = index.gateNeighbourPaths(origin, connectDrag.gate);
    // Tags are never writable relationship endpoints. Folders remain valid drop targets for the
    // secondary file-only creation gesture that starts from a regular note gate.
    for (const node of scene.nodes) {
      if (node.page.isFolder) blocked.delete(node.page.path);
      else if (node.page.isTag) blocked.add(node.page.path);
    }
    if (!origin.file || origin.file.extension !== "md") {
      for (const node of scene.nodes) {
        if (!node.page.isFolder && (!node.page.file || node.page.file.extension !== "md")) blocked.add(node.page.path);
      }
    }
    blocked.delete(origin.path);
    return blocked;
  }, [connectDrag, index, scene.nodes]);

  const connectBlockedEdgeIds = useMemo(() => {
    const ids = new Set<string>();
    if (!connectDrag) return ids;
    for (const edge of visibleEdges) {
      const gates = gatesForEdge(edge);
      if ((edge.sourcePath === connectDrag.originPath && gates.source === connectDrag.gate) ||
          (edge.targetPath === connectDrag.originPath && gates.target === connectDrag.gate)) ids.add(edge.id);
    }
    return ids;
  }, [connectDrag, visibleEdges]);

  /** Begin gate connection ownership; touch gate gestures cancel a pending node double-tap. */
  const startGateDrag = (node: PositionedNode, gate: GateSide, event: PointerEvent<HTMLSpanElement>) => {
    const folderChildCreation = node.page.isFolder && gate === "bottom";
    if (event.button !== 0 || node.page.isTag || node.page.transient || (node.page.isFolder && !folderChildCreation)) return;

    if (event.pointerType === "touch") {
      touchDoubleTap.current.reset();
      cancelPendingGateLongPress();
      const element = event.currentTarget;
      const pointerId = event.pointerId;
      const startX = event.clientX;
      const startY = event.clientY;
      const timer = window.setTimeout(() => {
        const pending = pendingGateLongPress.current;
        if (!pending || pending.pointerId !== pointerId || touchPointers.current.size > 1 || pinchGesture.current) return;
        pendingGateLongPress.current = null;
        cancelTouchLongPress();
        panDrag.current = null;
        touchPointers.current.delete(pointerId);
        if (touchPointers.current.size === 0) viewport.current?.classList.remove("is-touch-gesturing");
        suppressActivateUntil.current = Date.now() + 220;
        clearHoverIntent(false);
        setHover({ kind: "gate", path: pending.nodePath, gate: pending.gate });
        setConnectDrag({
          originPath: pending.nodePath,
          gate: pending.gate,
          pointerId,
          current: toWorld(startX, startY),
          startClientX: startX,
          startClientY: startY,
          moved: false,
        });
        try { pending.element.setPointerCapture(pointerId); } catch { /* Pointer can already be captured by WebKit. */ }
      }, TOUCH_GATE_LONG_PRESS_MS);
      pendingGateLongPress.current = { pointerId, startX, startY, timer, element, nodePath: node.page.path, gate };
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    clearHoverIntent(false);
    setHover({ kind: "gate", path: node.page.path, gate });
    setConnectDrag({
      originPath: node.page.path,
      gate,
      pointerId: event.pointerId,
      current: toWorld(event.clientX, event.clientY),
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  /** Prepare relinking/taps with stable viewport capture across a node's move into the drag layer. */
  const startNodeDrag = (node: PositionedNode, event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") touchDoubleTap.current.reset();
    const target = event.target as Element;
    if (target.closest("[data-kplex-gate], button")) return;
    if (event.button !== 0 || !normalizedRole(node.role) || node.page.isFolder || node.page.isTag || node.page.transient || neighborhood?.center.isFolder || neighborhood?.center.isTag) return;
    const captureElement = viewport.current;
    if (!captureElement) return;
    clearHoverIntent(true);
    event.preventDefault();
    event.stopPropagation();
    const world = toWorld(event.clientX, event.clientY);
    const displayed = renderedNodeMap.get(node.page.path) ?? node;
    setNodeDrag({
      path: node.page.path,
      pointerId: event.pointerId,
      offsetX: world.x - displayed.x,
      offsetY: world.y - displayed.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      x: displayed.x,
      y: displayed.y,
      moved: false,
    });
    // Dragging removes an overflow row and renders a new floating thought. The original
    // row cannot retain capture across that DOM replacement; the viewport owns the gesture.
    captureElement.setPointerCapture(event.pointerId);

    if (event.pointerType === "touch") {
      cancelTouchLongPress();
      touchPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      viewport.current?.classList.add("is-touch-gesturing");
      const element = captureElement;
      const pointerId = event.pointerId;
      const clientX = event.clientX;
      const clientY = event.clientY;
      const timer = window.setTimeout(() => {
        const pending = touchLongPress.current;
        if (!pending || pending.pointerId !== pointerId || pending.nodePath !== node.page.path) return;
        touchLongPress.current = null;
        setNodeDrag(null);
        touchPointers.current.delete(pointerId);
        if (touchPointers.current.size === 0) viewport.current?.classList.remove("is-touch-gesturing");
        suppressActivateUntil.current = Date.now() + 650;
        try { element.releasePointerCapture(pointerId); } catch { /* Capture may already be released. */ }
        showNodeContextMenuAt(node, clientX, clientY);
      }, 520);
      touchLongPress.current = { pointerId, startX: clientX, startY: clientY, timer, nodePath: node.page.path };
    }
  };

  /** Transfer multiple touch pointers to camera zoom and discard pending node tap pairs. */
  const beginPinch = () => {
    touchDoubleTap.current.reset();
    const points = [...touchPointers.current.values()];
    if (points.length < 2) { pinchGesture.current = null; return; }
    const a = points[0];
    const b = points[1];
    const distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
    const el = viewport.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const midX = (a.x + b.x) / 2 - rect.left;
    const midY = (a.y + b.y) / 2 - rect.top;
    viewport.current?.classList.add("is-pinch-gesturing");
    pinchGesture.current = {
      startDistance: distance,
      startScale: camera.current.scale,
      worldMidpoint: {
        x: (midX - camera.current.x) / camera.current.scale,
        y: (midY - camera.current.y) / camera.current.scale,
      },
    };
  };

  const mouseButtonCanPan = (button: number, overThought: boolean): boolean => {
    if (settings.mouseInteractionMode === "legacy") return button === 0 || button === 1 || button === 2;
    if (settings.mouseInteractionMode === "middle-only") return button === 1;
    // Smart default: familiar map/canvas controls. Left-drag empty canvas or middle-drag anywhere;
    // right-click remains free for context menus.
    return button === 1 || (button === 0 && !overThought);
  };

  /** Claim resize gestures before node/gate handlers can consume a covered edge.
   * Other pointer input retains the existing graph and native-control routing.
   */
  const captureAreaResize = (e: PointerEvent<HTMLDivElement>): void => {
    if (areaResizeDrag.current) {
      // Additional fingers must not start a pinch or relink during a height edit.
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (connectDrag || nodeDrag || panDrag.current || touchPointers.current.size) return;
    const target = e.target as Element;
    if ((e.pointerType === "touch" || e.button === 0) && (e.pointerType !== "touch" || areaSettingsMode)) {
      const areaHit = areaHoverAt(
        e.clientX,
        e.clientY,
        target,
        e.pointerType === "touch" ? AREA_TOUCH_RESIZE_EDGE_PX : AREA_RESIZE_EDGE_PX,
        areaSettingsMode,
      );
      if (areaHit?.edgeActive) {
        const config = AREA_HEIGHT_CONFIG[areaHit.zone];
        touchDoubleTap.current.reset();
        clearHoverIntent(true);
        panDrag.current = null;
        areaSettingsDismissPointer.current = null;
        areaResizeDrag.current = {
          zone: areaHit.zone,
          pointerId: e.pointerId,
          startClientY: e.clientY,
          startHeight: settings[config.key],
          startScale: camera.current.scale,
          changed: false,
        };
        setAreaHoverIfChanged(areaHit);
        setResizingArea(areaHit.zone);
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }
  };

  /** Route canvas presses to pan, pinch, tap or context-menu gestures after resize capture. */
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (connectDrag) return;
    if (nodeDrag) {
      if (e.pointerType !== "touch" || e.pointerId === nodeDrag.pointerId) return;
      if (touchLongPress.current?.pointerId === nodeDrag.pointerId) cancelTouchLongPress();
      setNodeDrag(null);
      touchPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      viewport.current?.classList.add("is-touch-gesturing");
      if (touchPointers.current.size >= 2) {
        cancelPendingGateLongPress();
        panDrag.current = null;
        beginPinch();
      }
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const target = e.target as Element;
    if (target.closest(".kplex-central-editor-content, .kplex-zoom-controls, .kplex-zone-tools, .kplex-layout-controls, .kplex-filter-panel, input, select, textarea, button")) return;
    if (centralEditorMaximized) return;


    armAreaSettingsDismiss(e, target);

    // Empty-canvas click/touch is an explicit escape hatch for hover intent. Pointer-leave events
    // can occasionally lag in Obsidian/WebView, leaving a node/gate/connector visually highlighted
    // until the mouse moves again. Clicking the canvas should always clear that transient state.
    if (!target.closest(".kplex-thought, .kplex-edge-hit, [data-kplex-gate]")) clearHoverIntent(true);

    if (e.pointerType === "touch") {
      // Empty bounded lists own one-finger vertical scrolling. A thought/edge inside such a list
      // still belongs to the graph so pinch can begin over visible content, not only bare canvas.
      const scrollSurface = target.closest(".kplex-zone-scroll, .kplex-expanded-scroll");
      const graphTarget = target.closest("[data-kplex-path], .kplex-edge-hit");
      if (scrollSurface && !graphTarget) return;
      e.preventDefault();
      e.stopPropagation();
      touchPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      viewport.current?.classList.add("is-touch-gesturing");
      // Touch/pen pointers receive implicit capture on direct-manipulation browsers. Explicitly
      // capturing multiple touch pointers has historically been fragile in iOS WebViews and is
      // unnecessary here; mouse capture remains explicit in the non-touch path below.

      // Obsidian Mobile/browser native long-press menus are unreliable once K-Plex owns the
      // touch stream (which it must do to prevent workspace edge/top swipe gestures). Provide an
      // explicit long-press gesture for thought and connector context menus instead. Gate touches
      // are handled separately: a stationary hold becomes a relationship drag, while movement
      // before the hold remains a camera gesture.
      cancelTouchLongPress();
      const gateEl = target.closest("[data-kplex-gate]");
      const nodeEl = !gateEl ? target.closest<HTMLElement>("[data-kplex-path]") : null;
      const edgeEl = !gateEl && !nodeEl ? target.closest<SVGPathElement>("[data-kplex-edge-id]") : null;
      const nodePath = nodeEl?.dataset.kplexPath;
      const edgeId = edgeEl?.dataset.kplexEdgeId;
      if (nodePath || edgeId) {
        const pointerId = e.pointerId;
        const clientX = e.clientX;
        const clientY = e.clientY;
        const timer = window.setTimeout(() => {
          const pending = touchLongPress.current;
          if (!pending || pending.pointerId !== pointerId || touchPointers.current.size !== 1 || pinchGesture.current) return;
          touchLongPress.current = null;
          panDrag.current = null;
          suppressActivateUntil.current = Date.now() + 650;
          if (pending.nodePath) {
            const node = renderedNodeMap.get(pending.nodePath) ?? scene.nodes.find((candidate) => candidate.page.path === pending.nodePath);
            if (node) showNodeContextMenuAt(node, clientX, clientY);
          } else if (pending.edgeId) {
            const edge = visibleEdges.find((candidate) => candidate.id === pending.edgeId);
            if (edge) showEdgeContextMenuAt(edge, clientX, clientY);
          }
        }, 520);
        touchLongPress.current = { pointerId, startX: clientX, startY: clientY, timer, nodePath, edgeId };
      }

      if (touchPointers.current.size >= 2) {
        cancelTouchLongPress();
        cancelPendingGateLongPress();
        panDrag.current = null;
        beginPinch();
      } else {
        pinchGesture.current = null;
        panDrag.current = { pointerId: e.pointerId, button: 0, pointerType: "touch", x: e.clientX, y: e.clientY, cx: camera.current.x, cy: camera.current.y, moved: false };
      }
      return;
    }

    touchDoubleTap.current.reset();
    if (![0, 1, 2].includes(e.button)) return;
    const overThought = Boolean(target.closest(".kplex-thought"));
    if (!mouseButtonCanPan(e.button, overThought)) return;
    const scrollZone = target.closest<HTMLElement>(".kplex-zone-scroll");
    if (e.button === 0 && scrollZone) {
      const rect = scrollZone.getBoundingClientRect();
      if (rect.right - e.clientX <= 12) return; // leave the native scrollbar draggable
    }
    e.preventDefault();
    setAreaHoverIfChanged(null);
    panDrag.current = { pointerId: e.pointerId, button: e.button, pointerType: e.pointerType, x: e.clientX, y: e.clientY, cx: camera.current.x, cy: camera.current.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  /** Update the owning resize, node/link drag or camera gesture; resize deltas use the scale captured at press time. */
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const resizeDrag = areaResizeDrag.current;
    if (resizeDrag) {
      if (e.pointerId !== resizeDrag.pointerId) return;
      const direction = resizeDrag.zone === "child" ? 1 : -1;
      const delta = direction * (e.clientY - resizeDrag.startClientY) / Math.max(0.3, resizeDrag.startScale);
      pendingAreaHeight.current = { zone: resizeDrag.zone, height: resizeDrag.startHeight + delta };
      if (!areaResizeFrame.current) {
        const owner = viewport.current?.ownerDocument.defaultView ?? window;
        areaResizeFrame.current = { owner, id: owner.requestAnimationFrame(flushAreaHeight) };
      }
      e.preventDefault();
      return;
    }
    updateAreaSettingsDismiss(e);
    if (connectDrag) {
      if (e.pointerId !== connectDrag.pointerId) return;
      updateHistoryDragHover(index.get(connectDrag.originPath), e.clientX, e.clientY, e.currentTarget.ownerDocument, semanticRoleForGate(connectDrag.gate));
      setConnectDrag((current) => current ? {
        ...current,
        current: toWorld(e.clientX, e.clientY),
        moved: current.moved || Math.hypot(e.clientX - current.startClientX, e.clientY - current.startClientY) > 6,
      } : null);
      return;
    }
    if (nodeDrag) {
      if (e.pointerId !== nodeDrag.pointerId) return;
      updateHistoryDragHover(index.get(nodeDrag.path), e.clientX, e.clientY, e.currentTarget.ownerDocument);
      const world = toWorld(e.clientX, e.clientY);
      if (e.pointerType === "touch") touchPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const moved = nodeDrag.moved || Math.hypot(e.clientX - nodeDrag.startClientX, e.clientY - nodeDrag.startClientY) > 6;
      if (moved && touchLongPress.current?.pointerId === e.pointerId) cancelTouchLongPress();
      setNodeDrag((current) => current ? { ...current, x: world.x - current.offsetX, y: world.y - current.offsetY, moved } : null);
      return;
    }

    if (e.pointerType === "touch" && touchPointers.current.has(e.pointerId)) {
      e.preventDefault();
      e.stopPropagation();
      touchPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pendingGate = pendingGateLongPress.current;
      if (pendingGate && pendingGate.pointerId === e.pointerId) {
        const gateDistance = Math.hypot(e.clientX - pendingGate.startX, e.clientY - pendingGate.startY);
        if (gateDistance > 10) cancelPendingGateLongPress();
        else return; // Keep a deliberate gate hold stationary until it is promoted to a connector drag.
      }
      const pendingLongPress = touchLongPress.current;
      if (pendingLongPress && pendingLongPress.pointerId === e.pointerId && Math.hypot(e.clientX - pendingLongPress.startX, e.clientY - pendingLongPress.startY) > 10) {
        cancelTouchLongPress();
      }
      if (touchPointers.current.size >= 2) {
        cancelTouchLongPress();
        cancelPendingGateLongPress();
        if (!pinchGesture.current) beginPinch();
        const pinch = pinchGesture.current;
        const points = [...touchPointers.current.values()];
        const el = viewport.current;
        if (!pinch || points.length < 2 || !el) return;
        const a = points[0];
        const b = points[1];
        const distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
        const rect = el.getBoundingClientRect();
        const midX = (a.x + b.x) / 2 - rect.left;
        const midY = (a.y + b.y) / 2 - rect.top;
        const scale = Math.max(0.3, Math.min(Platform.isIosApp ? IOS_MAX_ZOOM : MAX_ZOOM, pinch.startScale * distance / pinch.startDistance));
        applyCamera({
          scale,
          x: midX - pinch.worldMidpoint.x * scale,
          y: midY - pinch.worldMidpoint.y * scale,
        });
        suppressActivateUntil.current = Date.now() + 220;
        return;
      }
    }

    const drag = panDrag.current;
    if (!drag || e.pointerId !== drag.pointerId) {
      if (e.pointerType !== "touch") {
        setAreaHoverIfChanged(areaHoverAt(e.clientX, e.clientY, e.target as Element, AREA_RESIZE_EDGE_PX, areaSettingsMode));
      }
      return;
    }
    // Snapshot the ref before scheduling state. Never dereference panDrag.current from inside
    // the state updater: pointerup/cancel can clear the ref before React executes the updater.
    const x = drag.cx + e.clientX - drag.x;
    const y = drag.cy + e.clientY - drag.y;
    drag.moved = drag.moved || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > (drag.pointerType === "touch" ? 4 : 2);
    if (drag.moved && drag.pointerType === "touch") suppressActivateUntil.current = Date.now() + 220;
    applyCamera((current) => ({ ...current, x, y }));
  };

  /** Complete a stationary touch synchronously; two taps open without waiting for a native dblclick. */
  const completeTouchTap = (page: GraphPage, event: PointerEvent<HTMLDivElement>): void => {
    suppressSyntheticClickUntil.current = Date.now() + 350;
    if (page.transient?.kind === "section") {
      touchDoubleTap.current.reset();
      void plugin.openSection(page);
      return;
    }
    const target = index.get(page.transient?.actualPath ?? page.path);
    if (!target) {
      touchDoubleTap.current.reset();
      return;
    }
    if (touchDoubleTap.current.complete(target.path, event.timeStamp, event.clientX, event.clientY)) {
      // Android may also synthesize dblclick; consume that duplicate while retaining desktop mouse opening.
      suppressNativeDoubleClickUntil.current = Date.now() + 500;
      onOpen(target);
    } else {
      onActivate(target);
    }
  };

  /** Reuse canonical gate membership and the composer's writable-endpoint requirement for all fixed targets. */
  const relationshipDropRoles = (origin: GraphPage, target: GraphPage, semanticRole?: GateRole): GateRole[] => {
    if (target.path === origin.path || target.isFolder || target.isTag || origin.isFolder || origin.isTag
      || (origin.file?.extension !== "md" && target.file?.extension !== "md")) return [];
    const gates: Array<{ role: GateRole; gate: GateSide }> = [
      { role: "parent", gate: "top" }, { role: "child", gate: "bottom" },
      { role: "left", gate: "left" }, { role: "right", gate: "right" },
    ];
    return gates.filter(({ role }) => !semanticRole || role === semanticRole)
      .filter(({ gate }) => !index.gateNeighbourPaths(origin, gate).has(target.path)).map(({ role }) => role);
  };

  /** Resolve history and pinned open buttons through one owner-document hit test and eligibility check. */
  const historyRelationshipTarget = (origin: GraphPage, clientX: number, clientY: number, ownerDocument: Document, semanticRole?: GateRole): { button: HTMLElement; target: GraphPage } | null => {
    const button = ownerDocument.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-kplex-history-path], [data-kplex-pinned-path]");
    const path = button?.dataset.kplexHistoryPath ?? button?.dataset.kplexPinnedPath;
    const target = path ? index.get(path) : undefined;
    if (!button || !target) return null;
    const roles = relationshipDropRoles(origin, target, semanticRole);
    return (semanticRole ? roles.includes(semanticRole) : roles.length > 0) ? { button, target } : null;
  };

  /** Retire the view-owned history/pinned drag affordance on leave, release, cancellation or unload. */
  const clearHistoryDragHover = (): void => {
    historyDragHover.current?.classList.remove("is-relationship-drop-target");
    historyDragHover.current = null;
  };
  useEffect(/** Retire the affordance when drag ownership ends or this graph unmounts. */ () => {
    if (!connectDrag && !nodeDrag) clearHistoryDragHover();
    return clearHistoryDragHover;
  }, [connectDrag?.originPath, nodeDrag?.path]);

  /** Highlight only the same eligible endpoint that an eventual drop can select. */
  const updateHistoryDragHover = (origin: GraphPage | undefined, clientX: number, clientY: number, ownerDocument: Document, semanticRole?: GateRole): void => {
    const next = origin ? historyRelationshipTarget(origin, clientX, clientY, ownerDocument, semanticRole)?.button ?? null : null;
    if (next === historyDragHover.current) return;
    clearHistoryDragHover();
    next?.classList.add("is-relationship-drop-target");
    historyDragHover.current = next;
  };

  /** A gate states its role directly; body drops on history or pinned chips offer the remaining eligible roles. */
  const openHistoryRelationshipMenu = (origin: GraphPage, clientX: number, clientY: number, ownerDocument: Document, semanticRole?: GateRole): boolean => {
    const hit = historyRelationshipTarget(origin, clientX, clientY, ownerDocument, semanticRole);
    if (!hit) return false;
    const { target } = hit;
    if (semanticRole) {
      plugin.openRelationModal({ hostLeaf, mode: "create", origin, fixedTarget: target, semanticRole,
        onCommitted: /** Retire ordinary graph hover after the explicit composer commit. */ () => clearHoverIntent(true) });
      return true;
    }
    const menu = new Menu();
    const roles: Array<{ role: GateRole; labelKey: PlainTranslationKey; icon: string }> = [
      { role: "parent", labelKey: "role.parent", icon: "arrow-up" },
      { role: "child", labelKey: "role.child", icon: "arrow-down" },
      { role: "left", labelKey: "role.friend", icon: "arrow-left" },
      { role: "right", labelKey: "role.challenger", icon: "arrow-right" },
    ];
    const eligibleRoles = relationshipDropRoles(origin, target);
    for (const relation of roles.filter(({ role }) => eligibleRoles.includes(role))) {
      menu.addItem(/** Preserve the dragged origin and fixed historical endpoint until explicit commit. */ (item) => item
        .setTitle(translate(relation.labelKey))
        .setIcon(relation.icon)
        .onClick(/** Delegate ontology selection and persistence to the canonical relationship modal. */ () => plugin.openRelationModal({
          hostLeaf,
          mode: "create",
          origin,
          fixedTarget: target,
          semanticRole: relation.role,
          onCommitted: /** Clear hover affordances once the selected relationship is persisted. */ () => clearHoverIntent(true),
        })));
    }
    plugin.showKplexMenuAtPosition(menu, { x: clientX, y: clientY }, ownerDocument);
    return true;
  };

  /** Resolve actual center and rendered semantic areas, including their nodes; controls and out-of-area nodes remain blocked. */
  const externalFileDropTarget = (clientX: number, clientY: number, target: Element | null): "center" | "blocked" | GateRole | null => {
    if (!target) return null;
    if (isAreaControlTarget(target) || target.closest(".kplex-find")) return "blocked";
    const center = target.closest<HTMLElement>(".kplex-role-center[data-kplex-path]");
    if ((center && center.dataset.kplexPath === neighborhood?.center.path) || target.closest(".kplex-central-editor-overlay")) return "center";
    // The viewport is a neutral geometry probe: area meaning does not change when its content
    // happens to cover the dropped pixel. The real hit still owns center/control exclusions.
    const area = areaHoverAt(clientX, clientY, viewport.current, 0);
    if (area) return normalizedRole(area.zone) ?? "blocked";
    return !isEmptyAreaTarget(target) || target.closest("[data-kplex-path]") ? "blocked" : null;
  };

  /** Accept the host's current single-file payload without overriding the App's background/unindexed navigation fallback. */
  const dragExternalFileOver = (event: DragEvent<HTMLDivElement>): void => {
    const file = getDraggedFile(plugin.app);
    if (!file) { setExternalDropZone(null); return; }
    const hit = externalFileDropTarget(event.clientX, event.clientY, event.currentTarget.ownerDocument.elementFromPoint(event.clientX, event.clientY));
    // Empty canvas uses App's navigation fallback; preview that same action at the center.
    if (!hit) { setExternalDropZone("center"); return; }
    const origin = neighborhood?.center;
    const target = index.get(file.path);
    const eligible = hit === "center" || (hit !== "blocked" && origin && target && relationshipDropRoles(origin, target, hit).includes(hit));
    setExternalDropZone(hit !== "blocked" && eligible ? hit : null);
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = eligible ? "copy" : "none";
  };

  /** Keep child-to-child dragleave events from blinking the preview; leaving the canvas retires it. */
  const leaveExternalFile = (event: DragEvent<HTMLDivElement>): void => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX >= bounds.right || event.clientY < bounds.top || event.clientY >= bounds.bottom) setExternalDropZone(null);
  };

  useEffect(/** Retire external previews when a drag ends outside this canvas, loses its window or navigates away. */ () => {
    setExternalDropZone(null);
    const element = viewport.current;
    const ownerDocument = element?.ownerDocument;
    const ownerWindow = ownerDocument?.defaultView;
    if (!element || !ownerDocument || !ownerWindow) return;
    /** An outside dragover clears this view only; it never consumes the host's drag delivery. */
    const outside = (event: DocumentEventMap["dragover"]): void => {
      if (!element.contains(event.target as Node | null)) setExternalDropZone(null);
    };
    /** Clear feedback on completion/cancellation without handling the drop itself. */
    const finish = (): void => setExternalDropZone(null);
    ownerDocument.addEventListener("dragover", outside, true);
    ownerDocument.addEventListener("dragend", finish, true);
    ownerDocument.addEventListener("drop", finish, true);
    ownerWindow.addEventListener("blur", finish);
    return /** Release only this viewport's feedback listeners on navigation or unmount. */ () => {
      ownerDocument.removeEventListener("dragover", outside, true);
      ownerDocument.removeEventListener("dragend", finish, true);
      ownerDocument.removeEventListener("drop", finish, true);
      ownerWindow.removeEventListener("blur", finish);
    };
  }, [activePath]);

  /** Navigate actual center drops or open the shared composer with the center origin and fixed dropped endpoint. */
  const dropExternalFile = (event: DragEvent<HTMLDivElement>): void => {
    setExternalDropZone(null);
    const file = getDraggedFile(plugin.app);
    if (!file) return;
    const hit = externalFileDropTarget(event.clientX, event.clientY, event.currentTarget.ownerDocument.elementFromPoint(event.clientX, event.clientY));
    if (!hit) return;
    const target = index.get(file.path);
    if (hit === "center" && !target) return;
    event.preventDefault();
    event.stopPropagation();
    if (hit === "center") { if (target) onActivate(target); return; }
    const origin = neighborhood?.center;
    if (hit === "blocked" || !origin || !target || !relationshipDropRoles(origin, target, hit).includes(hit)) return;
    plugin.openRelationModal({ hostLeaf, mode: "create", origin, fixedTarget: target, semanticRole: hit,
      onCommitted: /** Let canonical publication drive the scene after persistence. */ () => clearHoverIntent(true) });
  };

  /** Finish resize, drag, pan or touch activation with one owner; movement cannot complete a tap pair. */
  const up = (e: PointerEvent<HTMLDivElement>) => {
    clearHistoryDragHover();
    // A rejected history/pinned endpoint remains an explicit target, rather than empty canvas
    // that could open an unfixed composer or relink the dragged node to a different area.
    const relationshipChip = e.currentTarget.ownerDocument.elementFromPoint(e.clientX, e.clientY)
      ?.closest("[data-kplex-history-path], [data-kplex-pinned-path]");
    if (areaResizeDrag.current?.pointerId === e.pointerId) {
      const ownerDocument = e.currentTarget.ownerDocument;
      const hitTarget = ownerDocument.elementFromPoint(e.clientX, e.clientY);
      finishAreaResize(e.pointerId);
      setAreaHoverIfChanged(e.pointerType === "touch" ? null : areaHoverAt(e.clientX, e.clientY, hitTarget, AREA_RESIZE_EDGE_PX, areaSettingsMode));
      return;
    }
    finishAreaSettingsDismiss(e);
    if (pendingGateLongPress.current?.pointerId === e.pointerId) cancelPendingGateLongPress();
    if (connectDrag && e.pointerId === connectDrag.pointerId) {
      const drag = connectDrag;
      const origin = index.get(drag.originPath);
      if (origin?.isFolder && drag.gate === "bottom") {
        setConnectDrag(null);
        clearHoverIntent(true);
        suppressActivateUntil.current = Date.now() + 180;
        if (drag.moved) plugin.openCreateInFolderModal(origin, hostLeaf);
        return;
      }
      if (origin && drag.moved && (openHistoryRelationshipMenu(origin, e.clientX, e.clientY, e.currentTarget.ownerDocument, semanticRoleForGate(drag.gate)) || relationshipChip)) {
        setConnectDrag(null);
        clearHoverIntent(true);
        suppressActivateUntil.current = Date.now() + 220;
        if (e.pointerType === "touch") {
          touchPointers.current.delete(e.pointerId);
          if (touchPointers.current.size === 0) viewport.current?.classList.remove("is-touch-gesturing");
        }
        return;
      }
      const hit = e.currentTarget.ownerDocument.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const targetEl = hit?.closest<HTMLElement>("[data-kplex-path]") ?? null;
      const targetGateEl = hit?.closest<HTMLElement>("[data-kplex-gate]") ?? null;
      const targetPath = targetEl?.dataset.kplexPath ?? null;
      const target = targetPath ? index.get(targetPath) : null;
      const targetGate = targetGateEl?.dataset.kplexGate as GateSide | undefined;
      // If the user deliberately drops on a gate, that gate states how the origin is seen from
      // the target. Invert it to obtain the relationship stored from the drag origin's view.
      const semanticRole = targetGate
        ? plugin.inverseGateRole(semanticRoleForGate(targetGate))
        : semanticRoleForGate(drag.gate);
      const fixedTarget = target && !target.isFolder && !target.isTag && target.path !== drag.originPath && !connectBlockedPaths.has(target.path) ? target : undefined;
      setConnectDrag(null);
      clearHoverIntent(true);
      suppressActivateUntil.current = Date.now() + 180;
      if (origin && target?.isFolder) {
        plugin.openCreateInFolderModal(target, hostLeaf);
        return;
      }
      if (origin && !target?.isTag) {
        plugin.openRelationModal({
          hostLeaf,
          mode: "create",
          origin,
          semanticRole,
          fixedTarget,
          onCommitted: () => clearHoverIntent(true),
        });
      }
      return;
    }
    if (nodeDrag && e.pointerId === nodeDrag.pointerId) {
      const drag = nodeDrag;
      if (touchLongPress.current?.pointerId === e.pointerId) cancelTouchLongPress();
      const original = scene.nodes.find((node) => node.page.path === drag.path);
      const dragDistance = Math.hypot(e.clientX - drag.startClientX, e.clientY - drag.startClientY);
      if (drag.moved) {
        touchDoubleTap.current.reset();
        suppressActivateUntil.current = Date.now() + 220;
        const draggedNode = renderedNodeMap.get(drag.path);
        const center = neighborhood?.center;
        const currentRole = original ? normalizedRole(original.role) : null;
        if (dragDistance >= NODE_RELINK_MIN_DRAG_PX && original
          && (openHistoryRelationshipMenu(original.page, e.clientX, e.clientY, e.currentTarget.ownerDocument) || relationshipChip)) {
          setNodeDrag(null);
          clearHoverIntent(true);
          if (e.pointerType === "touch") {
            touchPointers.current.delete(e.pointerId);
            if (touchPointers.current.size === 0) viewport.current?.classList.remove("is-touch-gesturing");
          }
          return;
        }
        if (dragDistance >= NODE_RELINK_MIN_DRAG_PX && draggedNode && original && center && currentRole) {
          const nextRole = semanticRoleForPosition(
            { x: draggedNode.x, y: draggedNode.y },
            currentRole,
            NODE_RELINK_HYSTERESIS_PX / Math.max(0.3, camera.current.scale),
          );
          if (nextRole !== currentRole) {
            plugin.openRelationModal({
              hostLeaf,
              mode: "relink",
              origin: center,
              fixedTarget: original.page,
              existingDirection: original.linkDirection,
              semanticRole: nextRole,
              onCommitStart: (role) => {
                setOptimisticRelink({ targetPath: original.page.path, role });
                setRelationshipUpdating(true);
              },
              onCommitEnd: (success) => {
                // On success keep the optimistic overlay and interaction blocker until an index
                // revision confirms the requested role. On failure roll back immediately.
                if (!success) {
                  setRelationshipUpdating(false);
                  setOptimisticRelink(null);
                }
              },
              onCommitted: () => {
                clearHoverIntent(true);
              },
            });
          }
        }
      } else if (original) {
        // Starting a potential relationship-relink drag uses pointer capture. Some Chromium/React
        // combinations then suppress the synthetic click, so make a tap explicitly navigate.
        if (e.pointerType === "touch") {
          completeTouchTap(original.page, e);
        } else {
          suppressActivateUntil.current = Date.now() + 180;
          onActivate(original.page);
        }
      }
      setNodeDrag(null);
      if (e.pointerType === "touch") {
        touchPointers.current.delete(e.pointerId);
        if (touchPointers.current.size === 0) viewport.current?.classList.remove("is-touch-gesturing");
      }
      return;
    }
    if (e.pointerType === "touch" && touchPointers.current.has(e.pointerId)) {
      const activePan = panDrag.current;
      const moved = activePan && activePan.pointerId === e.pointerId ? activePan.moved : Boolean(pinchGesture.current);
      const wasOnlyTouch = touchPointers.current.size === 1;
      const wasSuppressed = Date.now() < suppressActivateUntil.current;
      if (touchLongPress.current?.pointerId === e.pointerId) cancelTouchLongPress();

      // Mobile Chromium/Obsidian does not reliably synthesize a click after K-Plex calls
      // preventDefault() to own pan/pinch gestures. Treat a stationary one-finger pointer-up as
      // the activation gesture explicitly. This also avoids waiting for a browser click delay.
      if (!moved && wasOnlyTouch && !wasSuppressed) {
        const hit = e.currentTarget.ownerDocument.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const gate = hit?.closest<HTMLElement>("[data-kplex-gate]");
        const nodeEl = !gate ? hit?.closest<HTMLElement>("[data-kplex-path]") : null;
        const nodePath = nodeEl?.dataset.kplexPath;
        const node = nodePath ? (renderedNodeMap.get(nodePath) ?? scene.nodes.find((candidate) => candidate.page.path === nodePath)) : undefined;
        // Expanded mini nodes share this gesture owner without belonging to the primary scene map.
        const page = node?.page ?? (nodePath ? index.get(nodePath) : undefined);
        if (page) {
          completeTouchTap(page, e);
        } else {
          touchDoubleTap.current.reset();
        }
      } else {
        touchDoubleTap.current.reset();
      }

      touchPointers.current.delete(e.pointerId);
      if (moved) suppressActivateUntil.current = Date.now() + 220;
      pinchGesture.current = null;
      viewport.current?.classList.remove("is-pinch-gesturing");
      if (touchPointers.current.size === 0) viewport.current?.classList.remove("is-touch-gesturing");
      panDrag.current = null;
      const remaining = [...touchPointers.current.entries()][0];
      if (remaining) {
        const [pointerId, point] = remaining;
        panDrag.current = { pointerId, button: 0, pointerType: "touch", x: point.x, y: point.y, cx: camera.current.x, cy: camera.current.y, moved: true };
      }
      return;
    }
    const finishedPan = panDrag.current;
    if (finishedPan && finishedPan.pointerId === e.pointerId) {
      if (finishedPan.moved) suppressActivateUntil.current = Date.now() + 220;
      panDrag.current = null;
    }
  };

  /** Release cancelled pointer ownership, persist area changes and discard pending touch taps. */
  const cancel = (e: PointerEvent<HTMLDivElement>) => {
    clearHistoryDragHover();
    touchDoubleTap.current.reset();
    if (areaSettingsDismissPointer.current?.pointerId === e.pointerId) areaSettingsDismissPointer.current = null;
    if (areaResizeDrag.current?.pointerId === e.pointerId) {
      finishAreaResize(e.pointerId);
      setAreaHoverIfChanged(null);
      return;
    }
    if (pendingGateLongPress.current?.pointerId === e.pointerId) cancelPendingGateLongPress();
    if (connectDrag?.pointerId === e.pointerId) {
      setConnectDrag(null);
      clearHoverIntent(true);
    }
    if (nodeDrag?.pointerId === e.pointerId) {
      if (touchLongPress.current?.pointerId === e.pointerId) cancelTouchLongPress();
      setNodeDrag(null);
    }
    if (e.pointerType === "touch") {
      if (touchLongPress.current?.pointerId === e.pointerId) cancelTouchLongPress();
      touchPointers.current.delete(e.pointerId);
      pinchGesture.current = null;
      viewport.current?.classList.remove("is-pinch-gesturing");
      if (touchPointers.current.size === 0) viewport.current?.classList.remove("is-touch-gesturing");
    }
    if (panDrag.current?.pointerId === e.pointerId) panDrag.current = null;
  };

  /** Retire actual relationship capture loss; stale child loss cannot cancel a newer viewport-owned drag. */
  const lostPointerCapture = (event: PointerEvent<HTMLDivElement>): void => {
    if (connectDrag?.pointerId === event.pointerId || nodeDrag?.pointerId === event.pointerId) {
      // A touch/overflow row can surrender its implicit capture after the stable viewport has
      // claimed this same pointer. Its bubbling loss event does not end the viewport's gesture.
      if (event.currentTarget.hasPointerCapture(event.pointerId)) return;
      cancel(event);
      return;
    }
    if (event.target === event.currentTarget) {
      clearHistoryDragHover();
      if (finishAreaResize(event.pointerId)) setAreaHoverIfChanged(null);
    }
  };

  if (!neighborhood) return <div className="kplex-empty">{translate("graph.selectNote")}</div>;

  const connectionStateFor = (node: PositionedNode): ConnectionDragState => {
    if (!connectDrag) return "normal";
    if (node.page.path === connectDrag.originPath) return "origin";
    return connectBlockedPaths.has(node.page.path) ? "blocked" : "candidate";
  };

  const persistentPageFor = (page: GraphPage): GraphPage | null => {
    const actualPath = page.transient?.actualPath ?? (page.transient?.kind === "section" ? page.transient.sourcePath : page.path);
    return index.get(actualPath) ?? null;
  };

  /** Navigate through click-based input while ignoring compatibility clicks already handled by pointer-up. */
  const activateNode = (page: GraphPage): void => {
    if (page.transient?.kind === "section") return;
    const target = persistentPageFor(page);
    if (target && Date.now() >= Math.max(suppressActivateUntil.current, suppressSyntheticClickUntil.current)) onActivate(target);
  };

  /** Open through mouse double-click unless a completed touch pair already performed the same action. */
  const openNode = (page: GraphPage): void => {
    if (Date.now() < suppressNativeDoubleClickUntil.current) return;
    if (page.transient?.kind === "section") {
      void plugin.openSection(page);
      return;
    }
    const target = persistentPageFor(page);
    if (target) onOpen(target);
  };

  /** Build the node context menu at a viewport point, including host-aware file opening targets and node-specific graph actions. */
  const showNodeContextMenuAt = (node: PositionedNode, clientX: number, clientY: number): void => {
    touchDoubleTap.current.reset();
    const page = node.page;
    const persistent = persistentPageFor(page);
    const isCenter = node.role === "center" && page.path === neighborhood?.center.path;
    const isMarkdown = Boolean(persistent?.file?.extension === "md");
    const canExpand = canExpandCentralSections(persistent, activePath);
    const menu = new Menu();

    const persistentFile = persistent?.file;
    if (persistentFile && page.transient?.kind !== "section") {
      const openState = plugin.getFileOpenMenuState(persistentFile);
      addNativeSubmenu(menu, translate("graph.openMenu"), "external-link",
        /** Populate platform-supported destinations without replacing the owning context menu. */
        (openMenu) => {
        if (openState.focusOpenTab) {
          openMenu.addItem(/** Configure the existing-file action without creating a duplicate tab. */ (item) => item
            .setTitle(translate("graph.focusOpenTab"))
            .setIcon("scan-eye")
            .onClick(/** Reveal the selected file through native workspace focus. */ () => void plugin.focusOpenFileTab(persistentFile)));
        }
        openMenu.addItem(/** Configure an independent file tab on every form factor. */ (item) => item
          .setTitle(translate("graph.openNewTab"))
          .setIcon("file-plus-2")
          .onClick(/** Create a tab through the host instead of changing the graph center. */ () => void plugin.openFileInNewTab(persistentFile)));
        if (openState.adjacentPane) {
          openMenu.addItem(/** Configure a split destination anchored to this graph and its companion. */ (item) => item
            .setTitle(translate("graph.openAdjacentPane"))
            .setIcon("panel-right-open")
            .onClick(/** Preserve this Plex/Sidecar pair while opening the file outside it. */ () => void plugin.openFileInAdjacentPane(persistentFile, hostLeaf)));
        }
        if (openState.popoutWindow) {
          openMenu.addItem(/** Configure the desktop-only native window destination. */ (item) => item
            .setTitle(translate("graph.openPopoutWindow"))
            .setIcon("external-link")
            .onClick(/** Delegate window creation and unavailable-host feedback. */ () => void plugin.openFileInPopout(persistentFile)));
        }
      });
      menu.addSeparator();
    }

    if (persistent?.url && page.transient?.kind !== "section") {
      addNativeSubmenu(menu, translate("graph.openMenu"), "external-link", (openMenu) => {
        openMenu.addItem((item) => item
          .setTitle(translate("graph.openBrowser"))
          .setIcon("globe")
          .onClick(() => plugin.openUrlInBrowser(persistent.url!, viewport.current?.ownerDocument)));
        if (plugin.canOpenUrlInWebViewer()) {
          openMenu.addItem((item) => item
            .setTitle(translate("graph.openWebViewer"))
            .setIcon("panel-top-open")
            .onClick(() => void plugin.openUrlInWebViewer(persistent.url!)));
        }
      });
      menu.addSeparator();
    }

    if (persistent && !persistent.isFolder && !persistent.isTag && !persistent.url && page.transient?.kind !== "section") {
      menu.addItem((item) => item
        .setTitle(translate("graph.addNote"))
        .setIcon("file-plus-2")
        .onClick(() => plugin.openRelationModal({
          hostLeaf,
          mode: "create", origin: persistent, semanticRole: "child",
          onCommitted: () => clearHoverIntent(true),
        })));
    }

    if (isMarkdown && persistent && page.transient?.kind !== "section") {
      menu.addItem((item) => item
        .setTitle(translate("graph.setNoteType"))
        .setIcon("tags")
        .onClick(() => plugin.openNoteTypeModal(persistent)));
    }

    if (persistent?.file && page.transient?.kind !== "section") {
      menu.addItem((item) => item
        .setTitle(translate("graph.renameNote"))
        .setIcon("pencil-line")
        .onClick(() => new RenameNoteModal(plugin, persistent.file!).open()));
    }

    if (persistent && page.transient?.kind !== "section") {
      const pinned = plugin.isPinned(persistent.path);
      menu.addItem((item) => item
        .setTitle(translate(pinned ? "graph.unpinNote" : "graph.pinNote"))
        .setIcon(pinned ? "pin-off" : "pin")
        .onClick(() => void plugin.togglePinned(persistent.path)));
    }

    if (persistent && !persistent.isFolder && !persistent.isTag && !persistent.url &&
        (!persistent.file || persistent.file.extension === "md") && page.transient?.kind !== "section") {
      menu.addSeparator();
      menu.addItem((item) => item
        .setTitle(translate(persistent.file ? "graph.deleteNote" : "graph.deletePlaceholder"))
        .setIcon("trash-2")
        .onClick(() => {
          void plugin.deleteNode(persistent, hostLeaf, isCenter).then(() => clearHoverIntent(true));
        }));
    }

    if (isCenter && isMarkdown && persistent && !page.transient && canExpand && !centralEditorAvailable) {
      menu.addSeparator();
      menu.addItem((item) => item
        .setTitle(translate(sectionExpanded ? "graph.collapseSections" : "graph.expandSections"))
        .setIcon(sectionExpanded ? "fold-vertical" : "unfold-vertical")
        .onClick(() => toggleCentralSections()));
      if (sectionExpanded && sectionExpansion) {
        menu.addItem((item) => item
          .setTitle(translate("graph.foldAllSections"))
          .setIcon("list-tree")
          .onClick(() => updateSectionFolds(() => new Set())));
        menu.addItem((item) => item
          .setTitle(translate("graph.unfoldAllSections"))
          .setIcon("list-tree")
          .onClick(() => updateSectionFolds(() => new Set(sectionExpansion.sections.filter((section) => section.childIds.length).map((section) => section.id)))));
      }
    }

    if (page.transient?.kind === "section") {
      const section = sectionExpansion?.sections.find((candidate) => candidate.id === page.transient?.sectionId);
      menu.addItem((item) => item
        .setTitle(translate("graph.openSection"))
        .setIcon("heading")
        .onClick(() => void plugin.openSection(page)));
      if (section?.childIds.length) {
        const descendants = new Set<string>();
        const collect = (id: string) => {
          const current = sectionExpansion?.sections.find((candidate) => candidate.id === id);
          if (!current) return;
          for (const childId of current.childIds) { descendants.add(childId); collect(childId); }
        };
        collect(section.id);
        menu.addSeparator();
        const expanded = expandedSectionIds.has(section.id);
        menu.addItem((item) => item
          .setTitle(translate(expanded ? "graph.foldOneLevel" : "graph.unfoldOneLevel"))
          .setIcon(expanded ? "square-minus" : "square-plus")
          .onClick(() => updateSectionFolds((current) => {
            const next = new Set(current);
            if (expanded) next.delete(section.id); else next.add(section.id);
            return next;
          })));
        menu.addItem((item) => item
          .setTitle(translate("graph.foldAllDescendants"))
          .setIcon("fold-vertical")
          .onClick(() => updateSectionFolds((current) => {
            const next = new Set(current);
            next.delete(section.id);
            for (const id of descendants) next.delete(id);
            return next;
          })));
        menu.addItem((item) => item
          .setTitle(translate("graph.unfoldAllDescendants"))
          .setIcon("unfold-vertical")
          .onClick(() => updateSectionFolds((current) => {
            const next = new Set(current);
            next.add(section.id);
            for (const id of descendants) {
              const candidate = sectionExpansion?.sections.find((value) => value.id === id);
              if (candidate?.childIds.length) next.add(id);
            }
            return next;
          })));
      }
    }

    const doc = viewport.current?.ownerDocument ?? document;
    plugin.showKplexMenuAtPosition(menu, { x: clientX, y: clientY }, doc);
  };

  /** Route node context gestures through the shared host-destination/action policy. */
  const showNodeContextMenu = (node: PositionedNode, event: MouseEvent<HTMLDivElement>): void => {
    if (Date.now() < suppressActivateUntil.current) return;
    showNodeContextMenuAt(node, event.clientX, event.clientY);
  };

  /** Show host connection actions at the pointer position and end any pending node tap sequence. */
  const showEdgeContextMenuAt = (edge: PositionedEdge, clientX: number, clientY: number): void => {
    touchDoubleTap.current.reset();
    const explanationSourcePath = edge.explanationSourcePath ?? edge.sourcePath;
    const explanationTargetPath = edge.explanationTargetPath ?? edge.targetPath;
    const explanation = sectionExpansion?.explanations.get(`${explanationSourcePath}\u0000${explanationTargetPath}`)
      ?? index.explainRelationship(explanationSourcePath, explanationTargetPath);
    if (!explanation) return;
    const menu = new Menu();
    const sourceNode = renderedNodeMap.get(edge.sourcePath) ?? scene.nodes.find((node) => node.page.path === edge.sourcePath);
    const targetNode = renderedNodeMap.get(edge.targetPath) ?? scene.nodes.find((node) => node.page.path === edge.targetPath);
    const explanationSection = sectionExpansion?.sections.find((section) => section.page.path === explanationSourcePath);
    const explanationTargetSection = sectionExpansion?.sections.find((section) => section.page.path === explanationTargetPath);
    const openDetails = (initialFocus: "why" | "sources" = "sources") => new RelationshipExplanationModal(plugin, explanation, {
      role: edge.role,
      centerPath: neighborhood?.center.path,
      sourceTitle: explanationSection?.page.name ?? sourceNode?.label,
      targetTitle: explanationTargetSection?.page.name ?? targetNode?.label,
      hostLeaf,
      initialFocus,
    }).open();

    menu.addItem((item) => item
      .setTitle(translate("graph.connectionDetails"))
      .setIcon("list-tree")
      .onClick(() => openDetails("sources")));

    menu.addItem((item) => item
      .setTitle(translate("graph.unlinkConnection"))
      .setIcon("unlink")
      .onClick(() => {
        void plugin.directFrontmatterUnlinkCandidate(explanation.decisions.map((decision) => decision.evidence)).then(async (candidate) => {
          if (!candidate) {
            openDetails("sources");
            return;
          }
          const removed = await plugin.unlinkFrontmatterEvidence(candidate);
          if (!removed) openDetails("sources");
          else clearHoverIntent(true);
        }).catch(() => openDetails("sources"));
      }));
    const doc = viewport.current?.ownerDocument ?? document;
    plugin.showKplexMenuAtPosition(menu, { x: clientX, y: clientY }, doc);
  };

  /** Render live counts only for viewport-intersecting regular rows, retaining transient section gate ownership. */
  const renderNode = (baseNode: PositionedNode, displayNode: PositionedNode, hydrateCounts = true) => {
    const highlightedGates = new Set<GateSide>();
    for (const gate of ["top", "bottom", "left", "right"] as GateSide[]) {
      if (interaction.gates.has(gateKey(baseNode.page.path, gate))) highlightedGates.add(gate);
    }
    if (connectDrag?.originPath === baseNode.page.path) highlightedGates.add(connectDrag.gate);

    const lensNodeStyle = neighborhood ? graphLensNodeStyle(predicateEngine, index, lenses, {
      page: baseNode.page,
      label: baseNode.label,
      center: neighborhood.center,
      edge: baseNode.role === "center" ? undefined : {
        role: baseNode.role, relationType: baseNode.relationType, definition: baseNode.typeDefinition, linkDirection: baseNode.linkDirection,
        sourcePath: neighborhood.center.path, targetPath: baseNode.page.path,
      },
    }) : {};
    const countedDisplayNode = hydrateCounts ? projectNodeCounts(displayNode, index) : displayNode;
    const styledDisplayNode = Object.keys(lensNodeStyle).length ? { ...countedDisplayNode, style: { ...countedDisplayNode.style, ...lensNodeStyle } } : countedDisplayNode;
    const gateCounts = filteredGateCounts.get(baseNode.page.path);
    const nodeForDisplay = globalFiltering && gateCounts
      ? {
        ...styledDisplayNode,
        gateStats: {
          top: { ...countedDisplayNode.gateStats.top, shownCount: gateCounts.top },
          bottom: { ...countedDisplayNode.gateStats.bottom, shownCount: gateCounts.bottom },
          left: { ...countedDisplayNode.gateStats.left, shownCount: gateCounts.left },
          right: { ...countedDisplayNode.gateStats.right, shownCount: gateCounts.right },
        },
      }
      : styledDisplayNode;
    const hasCentralEditor = baseNode.role === "center" && centralEditorPage !== null;
    const canOpenCentralEditor = baseNode.role === "center" && centralEditorCapable && !hasCentralEditor;

    return <ThoughtNode
      key={baseNode.page.path}
      node={nodeForDisplay}
      translate={translate}
      visual={hasCentralEditor ? undefined : nodeVisuals.get(baseNode.page.path)}
      content={hasCentralEditor ? <div className="kplex-central-editor-placeholder" aria-hidden="true" /> : undefined}
      cornerAction={canOpenCentralEditor ? {
        icon: "file-text",
        label: translate("app.useCentralNodeEditor"),
        onClick: () => onCentralNodeEditorChange(true),
      } : undefined}
      settings={settings}
      selected={baseNode.page.path === activePath}
      highlighted={!connectDrag && (finding ? findNodePaths.has(baseNode.page.path) : interaction.nodePaths.has(baseNode.page.path))}
      dimmed={!connectDrag && !finding && hover !== null && !interaction.nodePaths.has(baseNode.page.path)}
      highlightedGates={highlightedGates}
      dragging={nodeDrag?.path === baseNode.page.path}
      flair={activeNodeFlair === baseNode.page.path}
      connectionState={connectionStateFor(baseNode)}
      onActivate={() => activateNode(baseNode.page)}
      onOpen={() => openNode(baseNode.page)}
      onHoverNode={() => { if (!connectDrag && !nodeDrag) scheduleHoverIntent({ kind: "node", path: baseNode.page.path }); }}
      onHoverGate={(_, gate) => { if (!connectDrag && !nodeDrag) scheduleHoverIntent({ kind: "gate", path: baseNode.page.path, gate }); }}
      onHoverEnd={() => { if (!connectDrag && !nodeDrag) clearHoverIntent(true); }}
      onHoverPreview={(_, targetEl, event) => {
        if (!connectDrag && !nodeDrag) plugin.triggerHoverPreview(baseNode.page, targetEl, event, neighborhood.center.file?.path ?? "");
      }}
      onGatePointerDown={(_, gate, event) => startGateDrag(baseNode, gate, event)}
      onNodePointerDown={(_, event) => startNodeDrag(baseNode, event)}
      onContextMenu={(_, event) => showNodeContextMenu(baseNode, event)}
      sectionFold={baseNode.page.transient?.kind === "section" ? (() => {
        const section = sectionExpansion?.sections.find((candidate) => candidate.id === baseNode.page.transient?.sectionId);
        if (!section) return undefined;
        const descendants = new Set<string>();
        const collect = (id: string) => {
          const current = sectionExpansion?.sections.find((candidate) => candidate.id === id);
          if (!current) return;
          for (const childId of current.childIds) { descendants.add(childId); collect(childId); }
        };
        collect(section.id);
        return {
          hasChildren: section.childIds.length > 0,
          expanded: expandedSectionIds.has(section.id),
          hiddenDescendantCount: expandedSectionIds.has(section.id) ? 0 : descendants.size,
          onToggle: () => updateSectionFolds((current) => {
            const next = new Set(current);
            if (next.has(section.id)) next.delete(section.id); else next.add(section.id);
            return next;
          }),
        };
      })() : (baseNode.role === "center" && !centralEditorAvailable && persistentPageFor(baseNode.page)?.file?.extension === "md" ? {
        hasChildren: true,
        expanded: sectionExpanded,
        hiddenDescendantCount: 0,
        expandedTitle: translate("graph.foldNoteSections"),
        foldedTitle: translate("graph.unfoldNoteSections"),
        onToggle: toggleCentralSections,
      } : undefined)}
    />;
  };

  const standardNodes = scene.nodes.filter((node) => {
    const zone = zoneForRole(node.role);
    return !zone || !scene.zoneViewports[zone];
  });
  const draggedBaseNode = nodeDrag ? scene.nodes.find((node) => node.page.path === nodeDrag.path) ?? null : null;
  const dragOrigin = connectDrag ? renderedNodeMap.get(connectDrag.originPath) : null;
  const dragPath = dragOrigin && connectDrag
    ? edgeGeometry(gatePoint(dragOrigin, connectDrag.gate), connectDrag.current, connectDrag.gate, oppositeGate(connectDrag.gate), settings.connectorStyle).d
    : null;

  /** Compose the shared region affordance with localized names and the existing height-setting policy. */
  const renderAreaFrame = (zone: ScrollZone, area: ZoneAreaBounds) => {
    const edgeActive = resizingArea === zone || (areaHover?.zone === zone && areaHover.edgeActive);
    const config = AREA_HEIGHT_CONFIG[zone];
    return <ResizableAreaFrame
      key={zone}
      className={`kplex-area-frame kplex-area-${zone} is-edge-${area.resizeEdge}${areaSettingsMode ? " is-settings-mode" : ""}${edgeActive ? " is-active" : ""}${resizingArea === zone ? " is-resizing" : ""}`}
      left={area.left} top={area.top} width={area.width} height={area.height}
      edge={area.resizeEdge} editing={areaSettingsMode} label={zoneTitle(zone, translate)}
      value={plugin.settings[config.key]} min={config.min} max={config.max}
      onHeightChange={/** Persist keyboard height edits through the same presentation-only path as pointer edits. */ (height) => { if (setAreaHeight(zone, height)) void plugin.saveSettings(false); }}
    />;
  };

  const renderScrollZone = (zone: ScrollZone, panel: ZoneViewport) => {
    const allNodes = scene.nodes.filter((node) => zoneForRole(node.role) === zone && nodeDrag?.path !== node.page.path);
    const filter = zoneFilters[zone] ?? "";
    const layout = zoneDisplayLayouts[zone] ?? buildZoneDisplayLayout(zone, panel, allNodes, filter, settings, index, neighborhood?.center.path ?? activePath);
    const displayedNodes = layout.nodes.filter((node) => nodeDrag?.path !== node.page.path);
    return <div
      key={zone}
      className={`kplex-zone-panel kplex-zone-${zone}`}
      style={{ left: panel.left, top: panel.top, width: panel.width, height: panel.height }}
    >
      <div className="kplex-zone-tools" onPointerDown={(event: PointerEvent<HTMLDivElement>) => event.stopPropagation()}>
        {zoneFilterOpen[zone] && <input
          className="kplex-zone-filter-input"
          type="text"
          value={filter}
          placeholder={translate("graph.filterZonePlaceholder", { zone: zoneTitle(zone, translate).toLowerCase() })}
          aria-label={translate("graph.filterZone", { zone: zoneTitle(zone, translate) })}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const value = event.currentTarget.value;
            setZoneFilters((current) => ({ ...current, [zone]: value }));
            const scrollEl = zoneScrollRefs.current[zone];
            if (scrollEl) scrollEl.scrollTop = 0;
            setZoneScrollTop((current) => ({ ...current, [zone]: 0 }));
          }}
          onPointerDown={(event: PointerEvent<HTMLInputElement>) => event.stopPropagation()}
          autoFocus
        />}
        <span className={`kplex-zone-filter-control${flairFilterZone === zone ? " is-new-flair" : ""}`}>
          <span className="kplex-zone-count" aria-label={translate("graph.zoneCount", { count: layout.count, zone: zoneTitle(zone, translate).toLowerCase() })}>{layout.count}</span>
          <button
            type="button"
            className={`kplex-zone-filter-button${zoneFilterOpen[zone] ? " is-on" : ""}`}
            aria-pressed={Boolean(zoneFilterOpen[zone])}
            aria-label={translate("graph.filterZone", { zone: zoneTitle(zone, translate) })}
            onPointerDown={(event: PointerEvent<HTMLButtonElement>) => event.stopPropagation()}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              const closing = Boolean(zoneFilterOpen[zone]);
              setZoneFilterOpen((current) => ({ ...current, [zone]: !current[zone] }));
              if (closing) {
                setZoneFilters((current) => ({ ...current, [zone]: "" }));
                const scrollEl = zoneScrollRefs.current[zone];
                if (scrollEl) scrollEl.scrollTop = 0;
                setZoneScrollTop((current) => ({ ...current, [zone]: 0 }));
              }
            }}
          ><ObsidianIcon name="filter" size={15} /></button>
        </span>
      </div>
      <div
        ref={(element: HTMLDivElement | null) => { zoneScrollRefs.current[zone] = element ?? undefined; }}
        className="kplex-zone-scroll"
        onScroll={(event: { currentTarget: HTMLDivElement }) => {
          const scrollTop = event.currentTarget.scrollTop;
          setZoneScrollTop((current) => ({ ...current, [zone]: scrollTop }));
        }}
      >
        <div className="kplex-zone-content" style={{ height: layout.contentHeight }}>
          {displayedNodes.map((node) => {
            const local = layout.localPositions.get(node.page.path);
            if (!local) return null;
            const hydrateCounts = rowIntersectsViewport(local.y, node.height, zoneScrollTop[zone], panel.height);
            return renderNode(node, { ...node, x: local.x, y: local.y }, hydrateCounts);
          })}
        </div>
      </div>
    </div>;
  };

  const renderExpandedCluster = (cluster: ExpandedCluster) => {
    const scrollable = cluster.contentHeight > cluster.viewportHeight + 0.5;
    return <div
      key={`expanded:${cluster.parent.page.path}`}
      className="kplex-expanded-cluster"
      style={{ left: cluster.left, top: cluster.top, width: cluster.width, height: cluster.viewportHeight }}
      onPointerDown={(event: PointerEvent<HTMLDivElement>) => event.stopPropagation()}
    >
      <div
        className={`kplex-expanded-scroll${scrollable ? " is-scrollable" : ""}`}
        onScroll={(event: { currentTarget: HTMLDivElement }) => {
          const scrollTop = event.currentTarget.scrollTop;
          setExpandedScrollTop((current) => ({ ...current, [cluster.parent.page.path]: scrollTop }));
        }}
      >
        <div className="kplex-expanded-content" style={{ height: cluster.contentHeight }}>
          {cluster.children.map((child) => {
            const maxChars = Math.min(22, effectiveLabelLimit(settings, child.style.maxLabelLength ?? 30));
            const text = child.label.length > maxChars ? `${child.label.slice(0, Math.max(1, maxChars - 1))}…` : child.label;
            return <div
              key={child.key}
              className={`kplex-expanded-mini-thought${cluster.parent.role === "sibling" ? " is-sibling-descendant" : ""}${findNodePaths.has(child.relation.page.path) ? " is-find-match" : ""}`}
              data-kplex-path={child.relation.page.path}
              style={{
                left: child.localX - child.width / 2,
                top: child.localY - child.height / 2,
                width: child.width,
                height: child.height,
                background: alphaHexToCss(child.style.backgroundColor, "rgba(0,0,0,.42)"),
                color: alphaHexToCss(child.style.textColor, "white"),
                borderColor: alphaHexToCss(child.style.borderColor, "rgba(255,255,255,.18)"),
                fontSize: 8 * (cluster.parent.role === "sibling" ? siblingScale(settings) : 1) * (settings.baseFontSize ?? 12.4) / 12.4,
              }}
              title={translate("graph.relatedNotePath", { label: child.label, path: child.relation.page.path })}
              onClick={(event: MouseEvent<HTMLDivElement>) => { event.stopPropagation(); activateNode(child.relation.page); }}
              onDoubleClick={(event: MouseEvent<HTMLDivElement>) => { event.stopPropagation(); openNode(child.relation.page); }}
              onPointerEnter={(event: PointerEvent<HTMLDivElement>) => {
                if (event.nativeEvent.ctrlKey || event.nativeEvent.metaKey) {
                  plugin.triggerHoverPreview(child.relation.page, event.currentTarget, event.nativeEvent, neighborhood?.center.file?.path ?? "");
                }
              }}
            >
              <span className="kplex-expanded-mini-gate" />
              {child.style.icon && <ObsidianIcon name={child.style.icon} size={cluster.parent.role === "sibling" ? 8 * siblingScale(settings) : 8} className="kplex-expanded-mini-icon" />}
              <span className="kplex-expanded-mini-label">{text}</span>
            </div>;
          })}
        </div>
      </div>
    </div>;
  };

  /** Update only the current surface profile while retaining the user's camera. */
  const changeLayoutValue = (key: "compactingFactor" | "horizontalCompactingFactor" | "parentColumns" | "childColumns", value: number) => {
    const draft = { compactingFactor: settings.compactingFactor, horizontalCompactingFactor: horizontalDensity(settings),
      parentColumns: settings.parentColumns, childColumns: settings.childColumns, ...layoutDraft.current, [key]: value };
    layoutDraft.current = draft;
    setLayoutOverrides(draft);
    suppressLayoutMotionUntil.current = Date.now() + 800;
    suppressAutoFitUntil.current = Date.now() + 1200;
    sceneMotion.cancelAll();
    preserveCameraOnNextLayout.current = true;
    setLayoutRevision((revision) => revision + 1);
    scheduleLayoutSave();
  };
  /** Keep label controls responsive during publication and save their global appearance settings after input settles. */
  const changeTypography = (patch: Partial<Pick<KplexSettings, "baseFontSize" | "baseNodeStyle" | "wrapNodeLabels">>): void => {
    const draft = { ...typographyDraft.current, ...patch };
    typographyDraft.current = draft;
    Object.assign(plugin.settings, patch);
    setTypographyOverrides(draft);
    suppressLayoutMotionUntil.current = Date.now() + 800;
    suppressAutoFitUntil.current = Date.now() + 1200;
    sceneMotion.cancelAll();
    preserveCameraOnNextLayout.current = true;
    setLayoutRevision((revision) => revision + 1);
    if (typographySave.current) typographySave.current.window.clearTimeout(typographySave.current.id);
    const ownerWindow = viewport.current?.ownerDocument.defaultView ?? window;
    const id = ownerWindow.setTimeout(/** Save the latest labels without retiring a newer interleaved font/width/wrap draft. */ () => {
      typographySave.current = null;
      void plugin.saveSettings(false).then(/** Inherit the saved global settings only after this exact draft commits. */ () => {
        if (typographyDraft.current !== draft) return;
        typographyDraft.current = null;
        setTypographyOverrides({});
      });
    }, 180);
    typographySave.current = { id, window: ownerWindow };
  };

  /** Preview the existing navigation/gate/relink action; chips and native controls keep their own feedback. */
  const relationshipDropArea = (): GateRole | "center" | null => {
    if (externalDropZone) return externalDropZone;
    const element = viewport.current;
    if (!element || (!nodeDrag?.moved && !connectDrag?.moved)) return null;
    const point = nodeDrag ? { x: nodeDrag.x + nodeDrag.offsetX, y: nodeDrag.y + nodeDrag.offsetY } : connectDrag?.current;
    if (!point) return null;
    const bounds = element.getBoundingClientRect();
    const clientX = bounds.left + camera.current.x + point.x * camera.current.scale;
    const clientY = bounds.top + camera.current.y + point.y * camera.current.scale;
    const hit = element.ownerDocument.elementFromPoint(clientX, clientY);
    if (!hit || !element.contains(hit) || isAreaControlTarget(hit) || hit.closest("[data-kplex-history-path], [data-kplex-pinned-path]")) return null;
    if (nodeDrag) {
      if (Math.hypot(clientX - nodeDrag.startClientX, clientY - nodeDrag.startClientY) < NODE_RELINK_MIN_DRAG_PX) return null;
      const original = scene.nodes.find((node) => node.page.path === nodeDrag.path);
      const currentRole = original ? normalizedRole(original.role) : null;
      if (!currentRole) return null;
      const nextRole = semanticRoleForPosition(nodeDrag, currentRole, NODE_RELINK_HYSTERESIS_PX / Math.max(0.3, camera.current.scale));
      return nextRole !== currentRole ? nextRole : null;
    }
    const origin = connectDrag ? index.get(connectDrag.originPath) : undefined;
    if (!connectDrag || !origin || origin.isFolder || origin.isTag) return null;
    const target = hit.closest<HTMLElement>("[data-kplex-path]");
    const page = target?.dataset.kplexPath ? index.get(target.dataset.kplexPath) : undefined;
    if (page?.isFolder || page?.isTag) return null;
    const gate = hit.closest<HTMLElement>("[data-kplex-gate]")?.dataset.kplexGate as GateSide | undefined;
    return gate ? plugin.inverseGateRole(semanticRoleForGate(gate)) : semanticRoleForGate(connectDrag.gate);
  };
  const dropAreaZone = relationshipDropArea();
  const visibleAreaZone = resizingArea ?? areaHover?.zone ?? null;
  const visibleArea = visibleAreaZone ? scene.zoneAreas[visibleAreaZone] : undefined;
  const previewCenter = centralEditorPage && centralEditorNode ? centralEditorNode : scene.nodes.find((node) => node.role === "center");
  const previewArea = dropAreaZone === "center" && previewCenter
    ? { left: previewCenter.x - previewCenter.width / 2, top: previewCenter.y - previewCenter.height / 2, width: previewCenter.width, height: previewCenter.height }
    : dropAreaZone && dropAreaZone !== "center" ? scene.zoneAreas[dropAreaZone] : undefined;
  const centerPreviewPadding = dropAreaZone === "center" ? 4 : 0;

  return <div
    ref={viewport}
    className={`kplex-plex${finding ? " is-finding" : ""}${sceneTransitioning || pathChangedThisRender ? " is-scene-transitioning" : ""}${sectionExpanded ? " is-section-expanded" : ""}${centralEditorMaximized ? " is-central-editor-maximized" : ""}${Platform.isIosApp ? " is-ios" : ""}${areaSettingsMode ? " is-area-settings-mode" : ""}${areaHover?.edgeActive ? " is-area-resize-ready" : ""}${resizingArea ? " is-area-resizing" : ""}`}
    style={{
      background: alphaHexToCss(settings.backgroundColor, "#0c2233"),
      "--kplex-motion-scale": String(Math.max(0, Math.min(2, settings.animationSpeed))),
      "--kplex-motion-ms": settings.animationSpeed <= 0 ? "0ms" : `${Math.max(140, Math.round(520 / Math.max(.25, settings.animationSpeed)))}ms`,
    } as CSSProperties}
    onPointerDownCapture={captureAreaResize}
    onDragOver={dragExternalFileOver}
    onDragLeave={leaveExternalFile}
    onDrop={dropExternalFile}
    onPointerDown={down}
    onPointerMove={move}
    onPointerUp={up}
    onPointerCancel={cancel}
    onLostPointerCapture={lostPointerCapture}
    onPointerLeave={(event: PointerEvent<HTMLDivElement>) => {
      if (!areaResizeDrag.current && event.pointerType !== "touch") setAreaHoverIfChanged(null);
    }}
    onContextMenu={(event: MouseEvent<HTMLDivElement>) => event.preventDefault()}
  >
    {relationshipUpdating && <div className="kplex-relationship-updating" aria-live="polite" aria-busy="true"><ObsidianIcon name="loader-circle" size={16} /><span>{translate("graph.updatingRelationship")}</span></div>}
    <PlexFind query={findQuery} focusRequest={findFocusRequest} visible={!centralEditorMaximized}
      includePath={findIncludePath} onIncludePathChange={/** A new vocabulary starts its own reveal cycle. */ (includePath) => { setFindIncludePath(includePath); setFindCursor(0); }}
      pathIcon={<ObsidianIcon name="folder-kanban" size={15} />} pathLabel={translate("find.includePath")}
      onApplyFilter={onApplyFindFilter} filterIcon={<ObsidianIcon name="list-filter" size={15} />} filterLabel={translate("find.applyFilter")}
      appliedFilterQuery={appliedFindFilterQuery} onClearFilter={onClearFindFilter}
      onChange={/** Start a fresh cycle for each edited term. */ (query) => { setFindQuery(query); setFindCursor(0); }}
      onNext={/** Cycle in either direction without global navigation. */ (backward) => setFindCursor((cursor) => cursor + (backward ? -1 : 1))}
      icon={<ObsidianIcon name="search" size={15} />} closeIcon={<ObsidianIcon name="x" size={14} />}
      label={translate("find.ariaLabel")} placeholder={translate("find.placeholder")} closeLabel={translate("find.close")}
      matchLabel={translate("find.matches", { count: findPaths.length })} />
    <div ref={cameraElement} className="kplex-camera" style={{ transform: `translate(${camera.current.x}px, ${camera.current.y}px) scale(${camera.current.scale})` }}>
      <svg className="kplex-links" width="3200" height="2400" viewBox="-1600 -1200 3200 2400">
        <defs>
          <marker id="kplex-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M1,1 L8,4.5 L1,8" fill="none" stroke="context-stroke" strokeWidth="1.4" /></marker>
          <marker id="kplex-triangle" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0,0 L9,4.5 L0,9 z" fill="context-stroke" /></marker>
          <marker id="kplex-dot" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto" markerUnits="strokeWidth"><circle cx="4" cy="4" r="2.6" fill="context-stroke" /></marker>
          <marker id="kplex-bar" markerWidth="8" markerHeight="10" refX="4" refY="5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M4,1 L4,9" stroke="context-stroke" strokeWidth="1.8" /></marker>
        </defs>
        {(scene.sectionTreeEdges ?? []).map((treeEdge) => {
          const source = renderedNodeMap.get(treeEdge.sourcePath) ?? scene.nodes.find((node) => node.page.path === treeEdge.sourcePath);
          const target = renderedNodeMap.get(treeEdge.targetPath) ?? scene.nodes.find((node) => node.page.path === treeEdge.targetPath);
          if (!source || !target || !visibleNodePaths.has(source.page.path) || !visibleNodePaths.has(target.page.path)) return null;
          // Folder-tree geometry: each parent owns a vertical spine from its small bottom-left
          // structural port; the child receives one horizontal L-branch at its left-center edge.
          // This is intentionally orthogonal and never enters through the semantic top gate.
          const sourceInset = source.role === "center" ? 20 : 14;
          const sourceX = source.x - source.width / 2 + sourceInset;
          const sourceY = source.y + source.height / 2;
          const targetX = target.x - target.width / 2;
          const targetY = target.y;
          const d = `M ${sourceX} ${sourceY} L ${sourceX} ${targetY} L ${targetX} ${targetY}`;
          const sourceIsCenter = source.role === "center";
          return <g key={treeEdge.id}>
            <path className="kplex-section-tree-edge" d={d} fill="none" vectorEffect="non-scaling-stroke" />
            {sourceIsCenter && <rect
              className="kplex-section-root-port"
              x={sourceX - 3.5}
              y={sourceY - 3.5}
              width="7"
              height="7"
              rx="1.5"
              vectorEffect="non-scaling-stroke"
            />}
          </g>;
        })}
        {visibleEdges.map((edge) => <Edge
          key={edge.id}
          edge={edge}
          nodes={renderedNodeMap}
          inverseArrowDirection={settings.inverseArrowDirection}
          connectorStyle={settings.connectorStyle}
          labelBackground={alphaHexToCss(settings.backgroundColor, "#0c3e6a")}
          crossLinkOpacity={Math.max(0, Math.min(1, settings.crossLinkOpacity / 100))}
          highlighted={!connectDrag && (finding ? matchesOntologyFind(findQuery, edge.style.showLabel ? relationLabel(edge.typeDefinition) ?? undefined : undefined) : interaction.edgeIds.has(edge.id))}
          dimmed={connectDrag ? connectBlockedEdgeIds.has(edge.id) : !finding && hover !== null && !interaction.edgeIds.has(edge.id)}
          onHover={(event) => { if (!connectDrag && !nodeDrag) scheduleEdgeHover(edge, event); }}
          onMove={(event) => { if (!connectDrag && !nodeDrag) moveEdgeHover(edge, event); }}
          onLeave={() => { if (!connectDrag && !nodeDrag) clearHoverIntent(true); }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            showEdgeContextMenuAt(edge, event.clientX, event.clientY);
          }}
        />)}
        {expandedConnectors.map((connector) => <path
          key={`expanded-edge:${connector.key}`}
          className="kplex-expanded-edge"
          d={connector.d}
          fill="none"
          stroke={connector.stroke}
          strokeWidth={connector.width}
          strokeDasharray={connector.dash}
          markerStart={connector.markerStart}
          markerEnd={connector.markerEnd}
          vectorEffect="non-scaling-stroke"
        />)}
        {dragPath && <path className="kplex-drag-connector" d={dragPath} fill="none" vectorEffect="non-scaling-stroke" />}
      </svg>

      {areaSettingsMode
        ? ZONES.map((zone) => {
          const area = scene.zoneAreas[zone];
          return area ? renderAreaFrame(zone, area) : null;
        })
        : visibleAreaZone && visibleArea ? renderAreaFrame(visibleAreaZone, visibleArea) : null}

      <div className="kplex-nodes">
        {standardNodes.filter((node) => nodeDrag?.path !== node.page.path && visibleNodePaths.has(node.page.path)).map((node) => renderNode(node, renderedNodeMap.get(node.page.path) ?? node))}
        {ZONES.map((zone) => {
          const panel = scene.zoneViewports[zone];
          return panel ? renderScrollZone(zone, panel) : null;
        })}
        {settings.graphDepth === 2 && expandedClusters.map(renderExpandedCluster)}
        {draggedBaseNode && renderNode(draggedBaseNode, renderedNodeMap.get(draggedBaseNode.page.path) ?? draggedBaseNode)}
      </div>
    </div>

    {dropAreaZone && previewArea && viewport.current && <DropAreaPreview
      className={dropAreaZone === "center" ? "kplex-center-drop-preview is-navigation-drop-target" : `kplex-area-${dropAreaZone} is-relationship-drop-area`}
      left={camera.current.x + previewArea.left * camera.current.scale - centerPreviewPadding}
      top={camera.current.y + previewArea.top * camera.current.scale - centerPreviewPadding}
      width={previewArea.width * camera.current.scale + centerPreviewPadding * 2}
      height={previewArea.height * camera.current.scale + centerPreviewPadding * 2}
      viewportWidth={viewport.current.clientWidth} viewportHeight={viewport.current.clientHeight}
    />}

    {centralEditorPage && centralEditorNode && <div
      ref={centralEditorOverlayElement}
      className={`kplex-central-editor-overlay${centralEditorMaximized ? " is-maximized" : ""}`}
      style={{
        left: camera.current.x + (centralEditorNode.x - centralEditorNode.width / 2) * camera.current.scale,
        top: camera.current.y + (centralEditorNode.y - centralEditorNode.height / 2) * camera.current.scale,
        width: Math.max(1, centralEditorNode.width * camera.current.scale),
        height: Math.max(1, centralEditorNode.height * camera.current.scale),
      }}
      onContextMenu={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
    >
      <CentralNodeEditor
        key={centralEditorPage.path}
        plugin={plugin}
        hostLeaf={hostLeaf}
        page={centralEditorPage}
        defaultMode={settings.centralNodeMarkdownMode}
        maximized={centralEditorMaximized}
        allowMaximize={centralEditorCanMaximize}
        activateHostLeafOnInteraction={surface === "sidepanel" || Platform.isMobile}
        onModeChange={onCentralNodeModeChange}
        onMaximizedChange={setCentralEditorMaximizedState}
        onCollapse={collapseCentralEditor}
        onOpenMenu={/** Reuse the exact central node's context policy and owning view menu. */ (button) => {
          const bounds = button.getBoundingClientRect();
          showNodeContextMenuAt(centralEditorNode, bounds.left, bounds.bottom);
        }}
        onNavigate={(nextFile) => {
          const target = index.get(nextFile.path);
          if (target) onActivate(target);
        }}
        translate={translate}
      />
    </div>}

    {edgeHoverTooltip && <div
      className="kplex-edge-hover-tooltip"
      role="tooltip"
      style={{ left: edgeHoverTooltip.left, top: edgeHoverTooltip.top }}
    >{edgeHoverTooltip.text}</div>}

    <div className="kplex-layout-controls" onPointerDown={(event: PointerEvent<HTMLDivElement>) => event.stopPropagation()}>
      <button type="button" className="kplex-icon-button kplex-layout-toggle" aria-label={translate("graph.configureLayout")}
        aria-expanded={layoutControlsOpen} aria-pressed={layoutControlsOpen}
        onClick={/** Keep configuration local to this view; hidden sliders are unmounted. */ () => setLayoutControlsOpen((open) => !open)}>
        <ObsidianIcon name="sliders-horizontal" size={16} />
      </button>
      {layoutControlsOpen && <>
      <div className="kplex-density-axes">
        <LayoutSlider label={translate("graph.horizontalDensity")} caption={translate("graph.horizontalDensityShort")}
          hint={translate("settings.ui.horizontal.density.help")} icon={<ObsidianIcon name="move-horizontal" size={11} />}
          value={horizontalDensity(settings)} displayValue={horizontalDensity(settings).toFixed(2)} min={0.75} max={4} step={0.05}
          onChange={/** Persist the horizontal axis without modifying row spacing. */ (value) => changeLayoutValue("horizontalCompactingFactor", value)} />
        <LayoutSlider label={translate("graph.verticalDensity")} caption={translate("graph.verticalDensityShort")}
          hint={translate("settings.ui.vertical.density.help")} icon={<ObsidianIcon name="move-vertical" size={11} />}
          value={settings.compactingFactor} displayValue={settings.compactingFactor.toFixed(2)} min={0.75} max={4} step={0.05}
          onChange={/** Persist row density without modifying labels or horizontal spacing. */ (value) => changeLayoutValue("compactingFactor", value)} />
      </div>
      <div className="kplex-density-axes">
        <LayoutSlider label={translate("graph.parentColumns")} caption={translate("graph.parentColumnsShort")}
          icon={<ObsidianIcon name="columns-2" size={11} />} value={layoutColumns(settings, "parent")} displayValue={String(layoutColumns(settings, "parent"))}
          min={1} max={3} step={1} onChange={/** Persist the exact parent grid width. */ (value) => changeLayoutValue("parentColumns", value)} />
        <LayoutSlider label={translate("graph.childColumns")} caption={translate("graph.childColumnsShort")}
          icon={<ObsidianIcon name="columns-3" size={11} />} value={layoutColumns(settings, "child")} displayValue={String(layoutColumns(settings, "child"))}
          min={1} max={7} step={1} onChange={/** Persist the exact child grid width. */ (value) => changeLayoutValue("childColumns", value)} />
      </div>
      <div className="kplex-typography-controls">
        <div className="kplex-density-axes">
        <LayoutSlider label={translate("graph.baseFontSize")} caption={translate("graph.baseFontSizeShort")}
          hint={translate("settings.ui.base.font.size.help")} icon={<ObsidianIcon name="type" size={11} />}
          value={settings.baseFontSize} displayValue={settings.baseFontSize.toFixed(1)} min={8} max={28} step={0.2}
          onChange={/** Scale label typography globally while keeping style proportions. */ (value) => changeTypography({ baseFontSize: value })} />
        <LayoutSlider label={translate("settings.ui.maximum.node.width")} caption={translate("graph.maximumNodeWidthShort")}
          hint={translate("settings.ui.maximum.node.width.help")} icon={<ObsidianIcon name="between-horizontal-start" size={11} />}
          value={settings.baseNodeStyle.maxWidth ?? 286} displayValue={String(settings.baseNodeStyle.maxWidth ?? 286)} min={160} max={800} step={10}
          onChange={/** Reuse the existing regular-node maximum without changing explicit style overrides. */ (value) => changeTypography({ baseNodeStyle: { ...plugin.settings.baseNodeStyle, maxWidth: value } })} />
        </div>
        <label className="kplex-density-control kplex-wrap-label-control">
          <input type="checkbox" checked={settings.wrapNodeLabels} aria-label={translate("settings.ui.wrap.node.labels")}
            onChange={/** Share the plugin's existing fixed two-line label setting. */ (event) => changeTypography({ wrapNodeLabels: event.currentTarget.checked })} />
          <span className="kplex-wrap-label-caption">{translate("settings.ui.wrap.node.labels")}</span>
        </label>
      </div>
      </>}
    </div>

    <div className="kplex-zoom-controls">
      <button aria-label={translate("graph.zoomIn")} onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); applyCamera((c) => ({ ...c, scale: Math.min(Platform.isIosApp ? IOS_MAX_ZOOM : MAX_ZOOM, c.scale * 1.15) })); }}><ObsidianIcon name="zoom-in" size={16} /></button>
      <button aria-label={translate("graph.zoomOut")} onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); applyCamera((c) => ({ ...c, scale: Math.max(.3, c.scale / 1.15) })); }}><ObsidianIcon name="zoom-out" size={16} /></button>
      <button aria-label={translate("graph.fitGraph")} onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); fit(); }}><ObsidianIcon name="focus" size={16} /></button>
    </div>
  </div>;
}
