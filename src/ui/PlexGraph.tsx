/**
 * Host-bound Plex scene composition, shared captured center-arrival motion and finite Wander navigation ports, layout and relationship interactions. Semantic resolution stays index/core-owned; UI labels and on-demand evidence hints use the injected translator. Navigation fits keep the central node centered and follow late geometry until manual camera input; publication and ordinary pane resizing preserve manual intent. View-owned display transitions retain camera coordinates and scene settings. Device typography stages scalar live preferences and persists after input settles; unmount flushes storage without replaying stale overrides. Area-height gestures own viewport pointer capture and persist existing presentation settings on completion or interruption. History and pinned drag targets share composer eligibility; external file drops follow the rendered area's semantic role. Theme-native area previews follow the existing drop action without intercepting capture or moving the dragged thought. Visible rows retain finite cache-only presentation demand; hidden surfaces and effect teardown release it. Geometry defers gate/count queries until a row intersects the displayed viewport, including partially clipped rows. Ordinary unfiltered scenes project cross-links for clipped visible rows; filtered and section scenes retain their established edge/count policy. Scene-local React keys capture paths before canonical pages can mutate during rename; semantic pages and actions retain their live identity. Normal-mode keyboard and exact-phrase typing selection are view-local; the displayed occurrence projection supplies all candidates and the shared selection owner reveals them without changing the center, filters or native search. Host methods own activation/rename/creation. Filtered badge numerators use revision-scoped semantic endpoint membership independently of connector routing and viewport clipping. Pane-fit native layout controls own local touch containment and bounded scrolling without changing preferences or browser range behavior. Accessible layout-wrapper hints use the shell's shared tooltip owner; inputs retain concise accessible names.
 * Visual resolution and metadata refreshes retain the index consent epoch; teardown and revocation
 * reject late publication. Hover enlargement uses the same already-guarded image element.
 * Connector Hidden actions share the plugin writer; this surface owns their pending confirmation
 * dialogs and retires approval when its graph generation or owning window is released. Disabled
 * Hidden menu entries remain available for explicit first-field setup when configuration is absent.
 * Evidence hints distinguish literal property references from descriptive source-kind labels;
 * shared localization metadata owns reference quoting. Optional Compass paint shares the camera frame
 * and exact center-animation lifetime, owns no input target, and never rebuilds graph geometry.
 * Draft connectors measure their captured visible gate occurrence, including overflow transforms;
 * sibling body drops add a center relation without rewriting their shared-parent evidence.
 * Desktop thought bodies and expanded descendants export native Obsidian links; only regular
 * scene occurrences hold same-view relink authority. Touch and gates retain pointer ownership.
 * Explicit primary-modifier placeholder opening delegates folder choice to the native creation owner.
 */
import { subscribeAppearanceSources } from "../adapters/obsidian/colorChanges";
import {HoverHighlight, bindHoverHighlight} from "./components/hoverHighlight";
import {compassPolygons} from "../core/plex/compassBackground";
import {COMPASS_DIRECTIONS, COMPASS_COLOR_VARIABLES, COMPASS_SEMANTIC_SLOTS, compassIntensity} from "../core/plex/colorPreferences";
import {colorValueCss, semanticColorCss} from "../adapters/obsidian/colorPresentation";
import type {MotionPose} from "./components/motionPose";
import { ColorScope } from "../adapters/obsidian/colorScope";
import { appearanceColorReferences, STYLE_SETTINGS_KEYS } from "../core/contracts/appearance";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type DragEvent, type MouseEvent, type PointerEvent, type RefObject } from "react";
import { createPlexContextMenu } from "./plexContextMenu";
import { ColorSourceModal } from "./ColorSourceModal";
import { Keymap, Menu, Notice, Platform, type WorkspaceLeaf } from "obsidian";
import { addNativeSubmenu } from "../adapters/obsidian/nativeSubmenu";
import { getDraggedFile } from "../adapters/obsidian/fileExplorerDrag";
import { canDragNodeLink, draggedGraphPage, finishNodeLinkDrag, nodeLinkDragSource, startNodeLinkDrag, type NodeLinkDragSource } from "../adapters/obsidian/nodeLinkDrag";
import { urlEmbed } from "./features/urlEmbed";
import type KplexPlugin from "../main";
import type { KplexDisplayModeState } from "./KplexDisplayModes";
import type { GraphIndex } from "../index/GraphIndex";
import type { KplexLayoutProfile, KplexSettings, KplexViewSurface, SidecarMarkdownMode } from "../settings";
import type { GateRole, GateSide, GraphPage, Neighbour, Neighborhood, NodeStyle, NodeVisual, PositionedEdge, PositionedNode, Role, ScrollZone } from "../types";
import { LinkDirection, RelationType } from "../types";
import { alphaHexToCss, resolveLinkStyle, resolveNodeStyle, currentNodeColorStyle, nodePaint, nodePaintFallbacks, NATIVE_CANVAS_FILL, NATIVE_LINK_STROKE, NATIVE_LINK_TEXT, NATIVE_LINK_LABEL_FILL } from "../index/style";
import { TYPOGRAPHY_FIELDS, TYPOGRAPHY_LIMITS, type TypographyValues } from "../core/plex/typographyPreferences";
import { buildScene, buildSectionExpandedScene, appendVisibleCrossLinks, projectNodeCounts, rowIntersectsViewport, effectiveLabelLimit, expandedChildReserve, expandedNodeWidth, expandedMiniLayout, horizontalDensity, layoutColumns, spacingPolicy, gateDiameter, siblingScale, withAreaHeightOverrides, type CenterNodeSize, type ZoneViewport, type ZoneAreaBounds } from "./layout";
import { LayoutSlider } from "./components/LayoutSlider";
import { centeredViewportFit, sameFitCamera, type FitCamera } from "./components/viewportFit";
import { projectFilteredGateCounts } from "./filteredGateCounts";
import { LayoutControls } from "./components/LayoutControls";
import { centerArrivalFrames, type MotionRect } from "./components/centerArrival";
import type { WanderDestination, WanderScene } from "../application/WanderController";
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
import { usePlexKeyboardNavigation, type PlexKeyboardNode } from "./usePlexKeyboardNavigation";
import { usePlexTypeSelection } from "./usePlexTypeSelection";
import { PlexTypeSelectionStatus } from "./features/PlexTypeSelectionStatus";
import { type ActionContext } from "../application/ActionManager";
import { ACTION_DIRECTIONS, type ActionId, type ActionOutcome, type NodeRef } from "../core/plex/actions";
import { actionNodeRef, resolveActionPage } from "../adapters/obsidian/actionNode";
import { acceptPlexKeyEvent } from "./actionKeyboardOwnership";
import { effectiveActionBindings } from "../core/plex/actionPreferences";
import { formatActionBinding } from "./actionPresentation";
import { readObsidianPresentationEnvironment } from "../adapters/obsidian/presentationEnvironment";
import { surfaceAction } from "./surfaceActionImplementation";
import { SavedRelationshipPendingError } from "../adapters/obsidian/relationshipMetadataWrite";
import { captureSurfaceContinuation } from "./surfaceContinuation";
import { ActionTargetPicker, type ActionPickerItem, type ActionPickerEvent } from "./ActionTargetPicker";
import type { GraphActionPorts, SurfaceActionImplementations } from "./usePlexActions";

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
  sourceGateElement: HTMLSpanElement;
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
    const text = evidence.fieldName
      ? translate(decision.active ? "graph.evidenceFieldDecision" : "graph.evidenceFieldDecisionOverridden", {field:evidence.fieldName.trim(),resolution})
      : translate(decision.active ? "graph.evidenceDecision" : "graph.evidenceDecisionOverridden", { source, resolution });
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
  /** Captured base-scene identity; the displayed parent may be a geometry clone with a live path. */
  key: string;
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


/** Project a pending direct relation locally; semantic writes remain owned by the composer. */
function applyOptimisticRelink(base: Neighborhood, targetPath: string, role: GateRole): Neighborhood {
  const all = [...base.parents, ...base.children, ...base.leftFriends, ...base.rightFriends, ...base.siblings];
  const found = all.find((item) => item.page.path === targetPath);
  if (!found) return base;
  const next: Neighborhood = {
    ...base,
    parents: base.parents.filter((item) => item.page.path !== targetPath),
    children: base.children.filter((item) => item.page.path !== targetPath),
    leftFriends: base.leftFriends.filter((item) => item.page.path !== targetPath),
    rightFriends: base.rightFriends.filter((item) => item.page.path !== targetPath),
    siblings: base.siblings.filter((item) => item.page.path !== targetPath),
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
  const stroke = alphaHexToCss(style.strokeColor, NATIVE_LINK_STROKE);
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
        fill={alphaHexToCss(style.textColor, NATIVE_LINK_TEXT)}
        fontSize={fontSize}
      >{label}</text>
    </g>}
  </g>;
}

/** Compose the deterministic Plex scene; native-follow layouts land immediately while explicit navigation retains motion and central Open uses a main tab. */
export function PlexGraph({ plugin, index, settings: viewSettings, paintSettings, paintLenses, surface, hostLeaf, predicate, lenses, filterLayoutMode, predicateRevision, showCrossLinks, activePath, navigationOrigin = "user", onSemanticDemandAcquired, renderRevision, semanticRevision, findFocusRequest, areaSettingsMode, onAreaSettingsModeChange, onApplyFindFilter, appliedFindFilterQuery, onClearFindFilter, onActivate, onWanderActivate, onOpen, onOpenInSidecar, onCentralNodeEditorChange, onCentralNodeModeChange, actionPorts, actionSurfaceId, displayState, fullscreenAvailable }: {
  plugin: KplexPlugin;
  index: GraphIndex;
  settings: KplexSettings;
  paintSettings: KplexSettings;
  paintLenses: CompiledGraphLensSet;
  surface: KplexViewSurface;
  hostLeaf: WorkspaceLeaf;
  predicate: CompiledGraphPredicate | null;
  lenses: CompiledGraphLensSet;
  filterLayoutMode: "keep" | "reflow";
  predicateRevision: number;
  showCrossLinks: boolean;
  activePath: string;
  navigationOrigin?: "user" | "wander" | "follow";
  onSemanticDemandAcquired?: (path: string) => void;
  renderRevision: number;
  semanticRevision: number;
  findFocusRequest: number;
  areaSettingsMode: boolean;
  onAreaSettingsModeChange: (enabled: boolean) => void;
  onApplyFindFilter: (query: string) => void;
  appliedFindFilterQuery: string | null;
  onClearFindFilter: () => void;
  onActivate: (page: GraphPage) => void;
  onWanderActivate: (page: GraphPage) => void;
  onOpen: (page: GraphPage) => void | Promise<unknown>;
  onOpenInSidecar: (page: GraphPage) => Promise<void>;
  onCentralNodeEditorChange: (enabled: boolean) => void;
  onCentralNodeModeChange: (mode: SidecarMarkdownMode) => void;
  actionPorts: RefObject<GraphActionPorts | null>;
  actionSurfaceId: string;
  displayState: KplexDisplayModeState;
  fullscreenAvailable: boolean;
}) {
  const translate = plugin.translator;
  const [findQuery, setFindQuery] = useState("");
  const [findIncludePath, setFindIncludePath] = useState(false);
  const [findCursor, setFindCursor] = useState(0);
  const [layoutControlsOpen, setLayoutControlsOpen] = useState(false);
  const [layoutOverrides, setLayoutOverrides] = useState<Partial<KplexLayoutProfile>>({});
  const layoutDraft = useRef<KplexLayoutProfile | null>(null);
  const typographyDraft = useRef<object | null>(null);
  const typographyDevice = plugin.getTypographyDevice();
  const typographySave = useRef<{ id: number; window: Window } | null>(null);
  const [areaHeightOverrides, setAreaHeightOverrides] = useState<Partial<Record<AreaHeightKey, number>>>({});
  // App receives fresh prepared facades during unrelated renders. Explicit drafts survive those
  // publications; mutating one temporary facade would discard slow slider changes mid-gesture.
  const settings = useMemo(() => Object.assign(withAreaHeightOverrides(viewSettings, areaHeightOverrides), layoutOverrides), [viewSettings, areaHeightOverrides, layoutOverrides]);
  const paintedNodeStyles = useMemo(/** Reuse resolved colors for stable scene occurrences across hover/count/scroll renders. */ () => new WeakMap<object, NodeStyle>(), [paintSettings]);
  const colorScope = useRef<ColorScope | null>(null);
  const compassRefresh = useRef<() => void>(/** Context can initialize before layout has captured a center. */ () => {});
  // This fixed-length inventory compares current appearance owners, not cloned presentation facades.
  // Ordinary source/status publications therefore never enumerate configured styles or probe CSS.
  const colorConfiguration = useMemo(/** Capture configured source identities once per actual appearance change. */ () => ({
    preferences: plugin.settings.colorPreferences, references: [...appearanceColorReferences(plugin.settings), ...(plugin.settings.colorPreferences.compass.enabled ? COMPASS_DIRECTIONS.map(/** Validate the four public direction defaults only while tint is enabled. */ direction => ({kind: "theme" as const, variable: COMPASS_COLOR_VARIABLES[direction]})) : [])],
  }), STYLE_SETTINGS_KEYS.map(key => plugin.settings[key]));
  useLayoutEffect(/** Bind exact owner CSS after commit, retaining scene geometry and public token inheritance. */ () => {
    if (colorScope.current) { colorScope.current.update(colorConfiguration); return; }
    const root = viewport.current; if (!root) return;
    colorScope.current = new ColorScope(root, colorConfiguration, {
      onChange: /** Reuse this scope revision for the one numeric opacity input. */ () => compassRefresh.current(),
      subscribeCss: changed => { const ref = plugin.app.workspace.on("css-change", changed); return () => plugin.app.workspace.offref(ref); },
    });
  }, [plugin, colorConfiguration]);
  useEffect(/** Migration/unload retires the captured owning-window scope before a replacement mounts. */ () => () => {
    colorScope.current?.dispose(); colorScope.current = null;
  }, [plugin]);
  const predicateEngine = useMemo(() => new GraphPredicateEngine(plugin.app), [plugin]);
  useEffect(/** Acquire before acknowledging App's preview handover so the center never loses its final live demand. */ () => {
    const release = index.acquireSemanticDemand(activePath);
    onSemanticDemandAcquired?.(activePath);
    return release;
  }, [index, activePath, onSemanticDemandAcquired]);
  useEffect(/** A borrowed preview can vanish during acquisition; acknowledge again once publication makes this live center readable. */ () => {
    onSemanticDemandAcquired?.(activePath);
  }, [activePath, onSemanticDemandAcquired, renderRevision]);
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
  const incomingCenter = useRef<{ identity: string; rect: MotionRect | null; origin: "user" | "wander" } | null>(null);
  const navigationOccurrence = useRef<{ identity: string; id: string } | null>(null);
  const wanderMotion = useRef(false);
  const wanderSelection = useRef<{ center: string; previous: string | null; owned: string } | null>(null);
  const renderedCenterGates = useRef<{ identity: string; stats: PositionedNode["gateStats"] } | null>(null);
  const previousNodeRects = useRef<Map<string, { left: number; top: number; width: number; height: number }>>(new Map());
  const [layoutRevision, setLayoutRevision] = useState(0);
  const [optimisticRelink, setOptimisticRelink] = useState<{ targetPath: string; role: GateRole } | null>(null);
  const [relationshipUpdating, setRelationshipUpdating] = useState(false);
  const optimisticCommitToken = useRef(0);
  const optimisticCenter = useRef(activePath);
  useEffect(/** Navigation retires presentation owned by the old center; durable native writes may still settle. */ () => {
    if (optimisticCenter.current === activePath) return;
    optimisticCenter.current = activePath; optimisticCommitToken.current++;
    setOptimisticRelink(null); setRelationshipUpdating(false);
  }, [activePath]);
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
  const sceneNodeKeys = useMemo(/** Capture unique reconciliation keys for this scene without changing mutable canonical page identity. */ () => {
    const occurrences = new Map<string, number>();
    return new Map(scene.nodes.map(/** Keep renamed endpoints and new-name placeholders distinct even if geometry rebuilds before their authoritative handover. */ (node) => {
      const path = node.page.path;
      const occurrence = occurrences.get(path) ?? 0;
      occurrences.set(path, occurrence + 1);
      // Encode the pair: vault paths are opaque strings and can contain any delimiter. Ordinary
      // scenes keep one stable key per path; only an intermediate collision needs an occurrence.
      return [node, JSON.stringify([path, occurrence])];
    }));
  }, [scene.nodes]);
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
  useEffect(/** Resolve visible imagery under one consent epoch and retire publication on teardown. */ () => {
    let cancelled = false;
    const revision = index.getNodeVisualRevision();
    if (!visualPages.length) {
      setNodeVisuals(new Map());
      return () => { cancelled = true; };
    }
    void index.resolveNodeVisuals(visualPages).then(/** Reject results resolved before a permission change. */ (resolved) => {
      if (!cancelled && revision === index.getNodeVisualRevision()) {
        setNodeVisuals(/** Recheck the epoch if React defers this update past a later consent save. */ (current) =>
          !cancelled && revision === index.getNodeVisualRevision() ? resolved : current);
      }
    });
    return () => { cancelled = true; };
  }, [index, visualPages, settings.thumbnailProperty, settings.nodeImageProperty, settings.attachmentImageDisplay, settings.allowRemoteNodeImages, renderRevision]);
  useEffect(/** Subscribe only this surface's visible metadata; pending work retires with its consent policy. */ () => {
    let cancelled = false;
    /** Refresh a visible node without acquisition; epoch checks also protect deferred React updaters. */
    const refreshVisibleVisual = (page: GraphPage) => {
      index.invalidateNodeVisual(page.path);
      const revision = index.getNodeVisualRevision();
      void index.resolveNodeVisuals([page]).then(/** Fence the promise before scheduling any state update. */ (resolved) => {
        if (cancelled || revision !== index.getNodeVisualRevision()) return;
        setNodeVisuals(/** A queued updater must still belong to this effect and consent epoch. */ (current) => {
          if (cancelled || revision !== index.getNodeVisualRevision()) return current;
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
      cancelled = true;
      plugin.app.metadataCache.offref(ref);
      for (const timer of visualRefreshTimers.current.values()) window.clearTimeout(timer);
      visualRefreshTimers.current.clear();
    };
  }, [plugin, index, visualPageByPath, settings.thumbnailProperty, settings.nodeImageProperty, settings.attachmentImageDisplay, settings.allowRemoteNodeImages]);
  const viewport = useRef<HTMLDivElement | null>(null);
  const cameraElement = useRef<HTMLDivElement | null>(null);
  const centralEditorOverlayElement = useRef<HTMLDivElement | null>(null);
  const compassElement = useRef<SVGSVGElement | null>(null);
  const compassCenter = useRef<{element: HTMLElement | null; owner: Document; left: number; top: number; width: number; height: number} | null>(null);
  const compassPreferences = useRef(paintSettings.colorPreferences);
  compassPreferences.current = paintSettings.colorPreferences;
  const compassOpacity = useRef(0);
  const compassSync = useRef<() => boolean>(/** No follower can start before a committed viewport owner exists. */ () => false);
  const cameraWritePending = useRef(false);
  const cameraFrame = useRef<number | null>(null);
  const cameraFrameWindow = useRef<Window | null>(null);
  const zoneScrollRefs = useRef<Partial<Record<ScrollZone, HTMLDivElement>>>({});
  const camera = useRef({ x: 0, y: 0, scale: 1 });
  const cameraIntentPlaced = useRef(false);
  const automaticFit = useRef<{ path: string; camera: FitCamera } | null>(null);
  const fitCurrentScene = useRef<() => void>(/** Native resize callbacks must wait for the first composed scene fit. */ () => {});
  const [hover, setHover] = useState<HoverState>(null);
  const hoverHighlight = useRef<HoverHighlight<Exclude<HoverState, null>> | null>(null);
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
  const nativeNodeDrag = useRef<NodeLinkDragSource | null>(null);
  useEffect(/** Navigation and owner-document teardown retire only this view's accepted native drag. */ () => () => {
    finishNodeLinkDrag(plugin.app, nativeNodeDrag.current);
    nativeNodeDrag.current = null;
  }, [plugin, activePath]);
  const [areaHover, setAreaHover] = useState<AreaHoverState>(null);
  const areaOutline = useRef<HoverHighlight<Exclude<AreaHoverState, null>> | null>(null);
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
  const displayResizePending = useRef(false);
  const displayResizeLayout = useRef(false);
  const measuredViewport = useRef({ width: 0, height: 0 });
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
  const sceneTransitionTimerWindow = useRef<Window | null>(null);
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
    hoverHighlight.current?.clear(clearActive);
    clearEdgeTooltip();
    if (clearActive) setHover(null);
  };

  useEffect(/** Each rendered graph owns its modifier listeners and delayed activation. */ () => {
    const element = viewport.current;
    if (!element) return;
    const intent = new HoverHighlight<Exclude<HoverState, null>>(element.ownerDocument.defaultView ?? window, viewSettings.hoverHighlightRequiresAlt, setHover);
    hoverHighlight.current = intent;
    setHover(null);
    const release = bindHoverHighlight(element, intent);
    return () => { release(); if (hoverHighlight.current === intent) hoverHighlight.current = null; };
  }, [viewSettings.hoverHighlightRequiresAlt, activePath, Boolean(neighborhood)]);

  /** Route nodes, gates and connectors through the same surface-owned intent. */
  const scheduleHoverIntent = (next: Exclude<HoverState, null>, event: {altKey: boolean; pointerType: string}) => {
    clearEdgeTooltip();
    hoverHighlight.current?.enter(next, event);
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
    scheduleHoverIntent({ kind: "edge", id: edge.id }, event);
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

  useEffect(/** Reset outline state for a changed center or animation preference, retaining it when only navigation origin changes. */ () => {
    transitionPath.current = activePath;
    setSectionExpanded(false);
    setSectionExpansion(null);
    setExpandedSectionIds(new Set());
    sectionFoldCenter.current = null;
  }, [activePath, settings.animationSpeed]);

  useEffect(/** Passive follow has no transition timer or arrival delay; deliberate navigation keeps its temporary transition. */ () => {
    const viewWindow = viewport.current?.ownerDocument.defaultView ?? window;
    if (sceneTransitionTimer.current !== null) (sceneTransitionTimerWindow.current ?? viewWindow).clearTimeout(sceneTransitionTimer.current);
    sceneTransitionTimer.current = null;
    sceneTransitionTimerWindow.current = null;
    setSceneTransitioning(navigationOrigin !== "follow");
    if (navigationOrigin === "follow") return;
    sceneTransitionTimerWindow.current = viewWindow;
    sceneTransitionTimer.current = viewWindow.setTimeout(/** Retire this center's temporary deliberate-transition state. */ () => {
      sceneTransitionTimer.current = null;
      sceneTransitionTimerWindow.current = null;
      setSceneTransitioning(false);
    }, settings.animationSpeed <= 0 ? 0 : Math.max(140, Math.round(620 / Math.max(0.25, settings.animationSpeed))));
  }, [activePath, navigationOrigin, settings.animationSpeed]);

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

  useEffect(/** Load this center's outline and fence late results when expansion or its native owner changes. */ () => {
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
      const viewWindow = viewport.current?.ownerDocument.defaultView ?? window;
      if (sceneTransitionTimer.current !== null) (sceneTransitionTimerWindow.current ?? viewWindow).clearTimeout(sceneTransitionTimer.current);
      sceneTransitionTimerWindow.current = viewWindow;
      sceneTransitionTimer.current = viewWindow.setTimeout(/** Retire the outline arrival in the window that created its timer. */ () => {
        sceneTransitionTimer.current = null;
        sceneTransitionTimerWindow.current = null;
        setSceneTransitioning(false);
      }, settings.animationSpeed <= 0 ? 0 : Math.max(140, Math.round(620 / Math.max(0.25, settings.animationSpeed))));
    });
    return () => { cancelled = true; };
  }, [sectionExpanded, persistentNeighborhood?.center.path, persistentNeighborhood?.center.mtime, plugin, index, settings.animationSpeed]);
  /** Keep native editor geometry in viewport coordinates; expose camera scale only to opt-in Markdown content, never host canvases. */
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
    overlay.style.setProperty("--kplex-editor-camera-scale", String(current.scale));
  };

  /** Share the existing camera callback with finite center-motion paint; never poll an idle scene. */
  const requestCameraFrame = (): void => {
    if (cameraFrame.current !== null) return;
    const viewWindow = viewport.current?.ownerDocument.defaultView ?? window;
    cameraFrameWindow.current = viewWindow;
    cameraFrame.current = viewWindow.requestAnimationFrame(/** Publish camera intent once, then sample only the tracked center's owned effect. */ () => {
      cameraFrame.current = null; cameraFrameWindow.current = null;
      if (cameraWritePending.current) {
        cameraWritePending.current = false;
        const element = cameraElement.current, current = camera.current;
        if (element) element.style.transform = `translate(${current.x}px, ${current.y}px) scale(${current.scale})`;
        syncCentralEditorOverlay();
      }
      if (compassSync.current()) requestCameraFrame();
    });
  };

  /** Update four bounded polygons from stored target geometry and actual Web Animation progress. */
  const syncCompass = (): boolean => {
    const root = viewport.current, svg = compassElement.current, target = compassCenter.current;
    if (!svg || !root) return false;
    const size = measuredViewport.current, view = root.ownerDocument.defaultView;
    const visible = compassPreferences.current.compass.enabled && compassOpacity.current > 0 && root.isConnected
      && !root.ownerDocument.hidden && !!view && !view.closed && size.width > 0 && size.height > 0
      && !!target && target.owner === root.ownerDocument;
    svg.style.setProperty("display", visible ? "" : "none");
    if (!visible || !target) return false;
    const pose = target.element ? sceneMotion.sample(target.element) : null;
    const x = target.left + (pose ? pose.originX + (target.width / 2 - pose.originX) * pose.scaleX + pose.x : target.width / 2);
    const y = target.top + (pose ? pose.originY + (target.height / 2 - pose.originY) * pose.scaleY + pose.y : target.height / 2);
    const current = camera.current;
    const box = `0 0 ${size.width} ${size.height}`; if (svg.getAttribute("viewBox") !== box) svg.setAttribute("viewBox", box);
    const polygons = compassPolygons(size.width, size.height, {x: current.x + x * current.scale, y: current.y + y * current.scale});
    for (let index = 0; index < COMPASS_DIRECTIONS.length; index++) {
      const points = polygons[COMPASS_DIRECTIONS[index]].map(/** Serialize one bounded viewport vertex without touching a graph occurrence. */ point => `${point.x},${point.y}`).join(" ");
      const polygon = svg.children[index]; if (polygon?.getAttribute("points") !== points) polygon?.setAttribute("points", points);
    }
    return !!target.element && sceneMotion.isRunning(target.element);
  };
  compassSync.current = syncCompass;
  compassRefresh.current = /** Theme/source updates read one numeric token, never a node or stylesheet inventory. */ (): void => {
    const root = viewport.current, svg = compassElement.current; if (!root || !svg) return;
    const prefs = compassPreferences.current;
    const opacity = prefs.compass.enabled ? compassIntensity(prefs, root.ownerDocument.body.classList.contains("theme-light") ? "light" : "dark",
      root.ownerDocument.defaultView?.getComputedStyle(root).getPropertyValue("--kplex-compass-opacity")) : 0;
    compassOpacity.current = opacity;
    svg.style.setProperty("fill-opacity", String(opacity));
    if (syncCompass()) requestCameraFrame();
  };
  useLayoutEffect(/** Paint-only toggles reuse current target/animation; geometry and native editors stay mounted. */ () => {
    compassRefresh.current();
  }, [paintSettings.colorPreferences]);

  /** Apply camera intent; manual movement retires late-layout fitting until navigation or explicit Fit. */
  const applyCamera = (nextOrUpdater: FitCamera | ((current: FitCamera) => FitCamera), fitted = false) => {
    const next = typeof nextOrUpdater === "function" ? nextOrUpdater(camera.current) : nextOrUpdater;
    camera.current = next;
    cameraIntentPlaced.current = true;
    if (fitted) automaticFit.current = { path: activePath, camera: { ...next } };
    else automaticFit.current = null;
    // Pointer streams on iOS can deliver substantially more events than the screen can paint.
    // Coalesce camera writes to one per animation frame, and use a 2D transform for graph-only
    // content. Native embedded views are positioned separately above the camera so Excalidraw and
    // other host canvases continue receiving untransformed pointer coordinates at every Plex zoom.
    cameraWritePending.current = true;
    requestCameraFrame();
    return next;
  };

  const flushCameraTransform = () => {
    const element = cameraElement.current;
    const current = camera.current;
    if (element) element.style.transform = `translate(${current.x}px, ${current.y}px) scale(${current.scale})`;
    cameraWritePending.current = false;
    syncCentralEditorOverlay();
    if (compassSync.current()) requestCameraFrame();
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

  useLayoutEffect(/** Explicit editor maximization owns its camera; display-only resizing preserves the existing coordinates. */ () => {
    const el = viewport.current;
    if (!el) return;
    if (displayResizePending.current || displayResizeLayout.current) return;
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

  useLayoutEffect(/** Measure final layout after cancelling old motion, then land an intentional center from its captured screen origin. */ () => {
    const root = viewport.current;
    if (!root) return;
    // Measure actual target layout, never a retained or still-running transform from the prior
    // scene. Live configuration and relationship gestures own coordinates directly.
    sceneMotion.cancelAll();

    // Navigation starts automatic fit ownership. Later requested-neighborhood publications may
    // enlarge the scene; follow them only while no manual camera action has retired that ownership.
    // Explicit presentation/display transitions still preserve their camera and bounded-list scroll.
    const preserveCamera = preserveCameraOnNextLayout.current;
    const editorModeChanged = centralEditorAvailabilityRef.current !== centralEditorAvailable;
    const editorSizeKey = centralEditorSize ? `${centralEditorSize.width}:${centralEditorSize.height}` : "";
    const editorSizeChanged = centralEditorSizeKeyRef.current !== editorSizeKey;
    const followAutomaticFit = !preserveCamera && !displayResizeLayout.current && !centralEditorMaximized
      && automaticFit.current?.path === activePath && sameFitCamera(automaticFit.current.camera, camera.current);
    const shouldRecenter = !preserveCamera && (!cameraIntentPlaced.current || pathChangedThisRender || editorModeChanged
      || (settings.allowAutozoom && editorSizeChanged && followAutomaticFit));
    if (shouldRecenter || (settings.allowAutozoom && followAutomaticFit)) {
      if (settings.allowAutozoom) fit();
      else {
        const el = viewport.current;
        // Recenter navigation while retaining the user's zoom when automatic fitting is disabled.
        if (el) applyCamera((current) => ({ ...current, x: el.clientWidth / 2, y: el.clientHeight / 2 }));
      }
    }

    compassCenter.current = null;
    flushCameraTransform();
    const rootRect = root.getBoundingClientRect();
    const nextRects = new Map<string, { left: number; top: number; width: number; height: number }>();
    const elements = root.querySelectorAll<HTMLElement>("[data-kplex-path]");
    elements.forEach((element) => {
      const path = element.dataset.kplexPath;
      if (!path) return;
      const rect = element.getBoundingClientRect();
      if (element.classList.contains("kplex-role-center")) {
        const measured = centralEditorAvailable ? centralEditorOverlayElement.current?.getBoundingClientRect() ?? rect : rect;
        const current = camera.current;
        compassCenter.current = {element: centralEditorAvailable ? null : element, owner: root.ownerDocument,
          left: (measured.left - rootRect.left - root.clientLeft - current.x) / current.scale,
          top: (measured.top - rootRect.top - root.clientTop - current.y) / current.scale,
          width: measured.width / current.scale, height: measured.height / current.scale};
      }
      if (nextRects.has(path)) return;
      nextRects.set(path, { left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    });

    const speed = Math.max(0, Math.min(2, settings.animationSpeed));
    const reduceMotion = root.ownerDocument.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (speed > 0 && navigationOrigin !== "follow" && !reduceMotion && !displayResizeLayout.current && !areaResizeDrag.current && !nodeDrag && !connectDrag && Date.now() >= suppressLayoutMotionUntil.current) {
      // At 1x, shared thoughts migrate for ~520ms so their old→new position is legible without
      // making navigation feel delayed. Intentional centers use the shared curved landing,
      // while genuinely new thoughts enter over ~390ms. The slider is a speed multiplier.
      const duration = Math.max(170, Math.round(520 / Math.max(0.25, speed)));
      const easing = "cubic-bezier(.2,.72,.22,1)";
      elements.forEach((element) => {
        const path = element.dataset.kplexPath;
        if (!path) return;
        const measured = element.getBoundingClientRect();
        const current = { left: measured.left, top: measured.top, width: measured.width, height: measured.height };
        const isIncoming = element.classList.contains("kplex-role-center") && pathChangedThisRender && incomingCenter.current?.identity === path;
        const previous = isIncoming ? incomingCenter.current?.rect : previousNodeRects.current.get(path);
        if (previous) {
          // Bounding rectangles are screen pixels; transforms live inside the scaled camera.
          const dx = (previous.left - current.left) / camera.current.scale;
          const dy = (previous.top - current.top) / camera.current.scale;
          const sx = current.width > 0 ? previous.width / current.width : 1;
          const sy = current.height > 0 ? previous.height / current.height : 1;
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5 || Math.abs(sx - 1) > 0.02 || Math.abs(sy - 1) > 0.02) {
            const curved = isIncoming && !centralEditorAvailable;
            const tracked = compassCenter.current?.element === element;
            const poses: MotionPose[] | undefined = tracked ? [] : undefined;
            if (poses && !curved) poses.push({offset: 0, x: dx, y: dy, scaleX: sx, scaleY: sy, originX: 0, originY: 0},
              {offset: 1, x: 0, y: 0, scaleX: 1, scaleY: 1, originX: 0, originY: 0});
            sceneMotion.play(element, curved ? centerArrivalFrames(previous, current, camera.current.scale, poses) : [
              { transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.90 },
              { transformOrigin: "0 0", transform: "translate(0, 0) scale(1, 1)", opacity: 1 },
            ], { duration: curved ? Math.max(220, Math.round((incomingCenter.current?.origin === "wander" ? 820 : 520) / Math.max(0.25, speed))) : element.classList.contains("kplex-role-center") ? Math.max(150, Math.round(duration * 0.58)) : duration, easing }, poses);
          }
          return;
        }

        const role = Array.from(element.classList).find((value) => value.startsWith("kplex-role-"))?.replace("kplex-role-", "") ?? "child";
        const offset = role === "parent" ? [0, 22] : role === "child" ? [0, -22] : role === "left" || role === "previous" ? [22, 0] : role === "right" || role === "next" ? [-22, 0] : [0, 14];
        let poses: MotionPose[] | undefined;
        if (compassCenter.current?.element === element) {
          const origin = root.ownerDocument.defaultView?.getComputedStyle(element).transformOrigin.split(" ").map(Number.parseFloat) ?? [0, 0];
          const originX = origin[0] || 0, originY = origin[1] || 0;
          poses = [{offset: 0, x: offset[0], y: offset[1], scaleX: 0.92, scaleY: 0.92, originX, originY},
            {offset: 1, x: 0, y: 0, scaleX: 1, scaleY: 1, originX, originY}];
        }
        sceneMotion.play(element, [
          { transform: `translate(${offset[0]}px, ${offset[1]}px) scale(.92)`, opacity: 0 },
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
        ], { duration: Math.max(160, Math.round(duration * 0.75)), easing }, poses);
      });
    }
    incomingCenter.current = null;
    previousNodeRects.current = nextRects;
    centralEditorAvailabilityRef.current = centralEditorAvailable;
    centralEditorSizeKeyRef.current = editorSizeKey;
    preserveCameraOnNextLayout.current = false;
    displayResizeLayout.current = false;
    syncCentralEditorOverlay();
    if (compassSync.current()) requestCameraFrame();
  }, [sceneLayoutKey, navigationOrigin, settings.animationSpeed, nodeDrag?.path, connectDrag?.originPath, sceneMotion, viewportSize.width, viewportSize.height, displayState.revision]);

  /** Center the actual central node and fit symmetric displayed bounds; explicit Fit renews ownership. */
  const fit = () => {
    const el = viewport.current;
    if (!el) return;
    if (centralEditorMaximized) {
      applyCamera({ x: el.clientWidth / 2, y: el.clientHeight / 2, scale: 1 }, true);
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
      applyCamera({ x: el.clientWidth / 2, y: el.clientHeight / 2, scale: 1 }, true);
      return;
    }

    const maxScale = Platform.isIosApp ? IOS_MAX_ZOOM : MAX_ZOOM;
    const center = scene.nodes.find(/** Use the central occurrence as the focal point instead of the asymmetric bounds midpoint. */ node => node.role === "center") ?? { x: 0, y: 0 };
    applyCamera(centeredViewportFit(el.clientWidth, el.clientHeight, center,
      { left: minX, top: minY, right: maxX, bottom: maxY }, maxScale), true);
  };
  fitCurrentScene.current = fit;

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

  useEffect(/** Area outlines share the hover modifier lifetime, with immediate eligible feedback. */ () => {
    const element = viewport.current;
    if (!element) return;
    const intent = new HoverHighlight<Exclude<AreaHoverState, null>>(element.ownerDocument.defaultView!,
      viewSettings.areaOutlineRequiresAlt && !areaSettingsMode, setAreaHoverIfChanged, 0);
    areaOutline.current = intent;
    const release = bindHoverHighlight(element, intent);
    return /** Layout/navigation retirement must not revive an old area on a later key press. */ () => {
      release();
      if (areaOutline.current === intent) areaOutline.current = null;
    };
  }, [viewSettings.areaOutlineRequiresAlt, areaSettingsMode, activePath, sceneLayoutKey]);

  /** Retain a geometric candidate for stationary modifier changes without taking touch ownership. */
  const updateAreaHover = (next: AreaHoverState, event: {altKey: boolean; pointerType: string}): void => {
    if (next && event.pointerType !== "touch") areaOutline.current?.enter(next, event);
    else areaOutline.current?.clear();
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

  useEffect(/** Observe the actual pane, preserving manual/display-transition intent and fitting only the current owned scene. */ () => {
    const el = viewport.current;
    if (!el) return;
    type WindowWithResizeObserver = Window & { ResizeObserver: typeof ResizeObserver };
    const owningWindow = (el.ownerDocument.defaultView ?? window) as WindowWithResizeObserver;
    const updateViewport = /** Distinguish one deliberate display transition from ordinary native pane resizing. */ (): void => {
      const width = el.clientWidth, height = el.clientHeight;
      const preserveDisplayCamera = displayResizePending.current;
      displayResizePending.current = false;
      if (measuredViewport.current.width === width && measuredViewport.current.height === height) return;
      measuredViewport.current = { width, height };
      if (compassSync.current()) requestCameraFrame();
      if (preserveDisplayCamera) { preserveCameraOnNextLayout.current = true; displayResizeLayout.current = true; }
      setViewportSize({ width, height });
      // Context-only theme variables can appear/disappear at responsive pane breakpoints.
      colorScope.current?.invalidate();
      if (preserveDisplayCamera || centralEditorMaximized || Date.now() < suppressAutoFitUntil.current) return;
      if (settings.allowAutozoom && automaticFit.current?.path === activePath
        && sameFitCamera(automaticFit.current.camera, camera.current)) fitCurrentScene.current();
    };
    updateViewport();
    const observer = new owningWindow.ResizeObserver(updateViewport);
    observer.observe(el);
    /** Reappearance joins the existing frame owner only if exact center motion still needs following. */
    const visible = (): void => { if (!el.ownerDocument.hidden && compassSync.current()) requestCameraFrame(); };
    el.ownerDocument.addEventListener("visibilitychange", visible);
    return () => {observer.disconnect(); el.ownerDocument.removeEventListener("visibilitychange", visible);};
  }, [settings.allowAutozoom, centralEditorMaximized, displayState.revision, activePath]);

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

  useEffect(/** Release this graph's delayed writes, motion and owning-window tasks when its surface retires. */ () => () => {
    if (layoutSaveTimer.current !== null) window.clearTimeout(layoutSaveTimer.current);
    layoutDraft.current = null;
    // Only an unstarted debounce needs flushing. A save already awaiting view refresh has written
    // its settings and must not start a second persistence operation while this view retires.
    if (typographySave.current) {
      typographySave.current.window.clearTimeout(typographySave.current.id);
      void plugin.persistTypographySettings();
    }
    typographySave.current = null;
    typographyDraft.current = null;
    sceneMotion.cancelAll();
    hoverHighlight.current?.clear(false);
    if (edgeTooltipTimer.current !== null) window.clearTimeout(edgeTooltipTimer.current);
    if (sceneTransitionTimer.current !== null) (sceneTransitionTimerWindow.current ?? window).clearTimeout(sceneTransitionTimer.current);
    sceneTransitionTimer.current = null;
    sceneTransitionTimerWindow.current = null;
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

  const filteredGateCounts = useMemo(/** Count surviving scene pairs by canonical endpoint membership, before viewport clipping. */ () => {
    if (!globalFiltering) return null;
    return projectFilteredGateCounts(scene.nodes, scene.edges, filterMatchedNodePaths, index);
  }, [globalFiltering, scene.nodes, scene.edges, filterMatchedNodePaths, index, renderRevision, semanticRevision, predicateRevision]);

  const expandedClusters = useMemo<ExpandedCluster[]>(/** Project descendant strips with the original base node's captured scene identity. */ () => {
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
      const clusterKey = `expanded:${sceneNodeKeys.get(baseNode)}`;

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
        const maxChars = Math.min(22, effectiveLabelLimit(style.maxLabelLength ?? 30));
        const shownChars = Math.min(label.length, maxChars);
        const nodeWidth = Math.max(64 * miniScale, Math.min(cellWidth - columnGap, (34 + shownChars * 3.8) * miniScale));
        return {
          key: JSON.stringify([clusterKey, relation.page.path, indexValue]),
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
        key: clusterKey,
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
  }, [sectionExpansion, settings.graphDepth, settings.compactingFactor, settings.horizontalCompactingFactor, settings.compactView, settings.minLinkLength, settings.childColumns, settings.maxItemCount, settings.siblingRelativeSize, neighborhood, scene.nodes, sceneNodeKeys, visibleNodePaths, renderedNodeMap, expandedScrollTop, index, layoutRevision, predicate, lenses, predicateRevision, predicateEngine]);

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
        const baseStyle = resolveLinkStyle(child.relation, paintSettings);
        const lensStyle = neighborhood ? graphLensEdgeStyle(predicateEngine, index, paintLenses, {
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
          stroke: alphaHexToCss(style.strokeColor, NATIVE_LINK_STROKE),
          width: Math.max(0.65, (style.strokeWidth ?? 1.2) * 0.75),
          dash: style.strokeStyle === "dashed" ? "5 5" : style.strokeStyle === "dotted" ? "1.5 5" : undefined,
          markerStart: markerFor(reverse ? style.endArrowHead : style.startArrowHead),
          markerEnd: markerFor(reverse ? style.startArrowHead : style.endArrowHead),
        });
      }
    }
    return connectors;
  }, [expandedClusters, settings.graphDepth, settings.connectorStyle, settings.inverseArrowDirection, settings.baseLinkStyle, settings.hierarchyLinkStyles, neighborhood, predicateEngine, index, paintLenses, predicateRevision]);

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
  const revealFindHit = (path: string, keyboardId?: string): void => {
    const root = viewport.current;
    if (!root) return;
    const target = Array.from(root.querySelectorAll<HTMLElement>("[data-kplex-path]")).find((element) =>
      keyboardId ? element.dataset.kplexKeyboardId === keyboardId : element.dataset.kplexPath === path);
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

  const keyboardNodes = useMemo<PlexKeyboardNode[]>(/** Select displayed rows, retaining overflow positions but excluding filtered-out nodes. */ () => {
    const nodes: PlexKeyboardNode[] = [];
    for (const node of scene.nodes) {
      if (!filterMatchedNodePaths.has(node.page.path)) continue;
      const zone = zoneForRole(node.role);
      const panel = zone ? scene.zoneViewports[zone] : undefined;
      const local = zone ? zoneDisplayLayouts[zone]?.localPositions.get(node.page.path) : undefined;
      if (panel && !local) continue;
      const rendered = renderedNodeMap.get(node.page.path) ?? node;
      const area = zone ? scene.zoneAreas[zone] : undefined;
      nodes.push({ id: sceneNodeKeys.get(node)!, path: node.page.path, label: node.label, section: zone ?? "center",
        x: rendered.x, y: rendered.y, sectionX: area ? area.left + area.width / 2 : node.x,
        sectionY: area ? area.top + area.height / 2 : node.y });
    }
    for (const cluster of expandedClusters) for (const child of cluster.children) {
      const zone = zoneForRole(cluster.parent.role);
      const area = zone ? scene.zoneAreas[zone] : undefined;
      nodes.push({ id: child.key, path: child.relation.page.path, label: child.label, section: zone ?? "center",
        x: cluster.left + child.localX, y: cluster.top + child.localY - cluster.scrollTop,
        sectionX: area ? area.left + area.width / 2 : cluster.parent.x,
        sectionY: area ? area.top + area.height / 2 : cluster.parent.y });
    }
    return nodes;
  }, [scene.nodes, scene.zoneViewports, scene.zoneAreas, sceneNodeKeys, filterMatchedNodePaths, zoneDisplayLayouts, expandedClusters, renderedNodeMap]);
  const selection = usePlexKeyboardNavigation({
    activePath, normalMode: !areaSettingsMode && !connectDrag && !nodeDrag && !resizingArea && !relationshipUpdating,
    nodes: keyboardNodes, crossSections: plugin.settings.actionPreferences.crossSectionAtBoundary,
    reveal: /** Reveal the exact occurrence through existing overflow scroll and camera policy. */ node => {
      clearHoverIntent(true); revealFindHit(node.path, node.id);
    },
  });
  /** Cancel passive-follow motion immediately; deliberate navigation captures its live source rectangle. */
  const prepareNavigation = (identity: string, origin: "user" | "wander" | "follow"): void => {
    if (origin === "follow") {
      sceneMotion.cancelAll();
      incomingCenter.current = null;
      navigationOccurrence.current = null;
      wanderMotion.current = false;
      return;
    }
    const root = viewport.current;
    const selected = selection.readSelected();
    const explicit = navigationOccurrence.current?.identity === identity ? navigationOccurrence.current.id : null;
    navigationOccurrence.current = null;
    const occurrences = Array.from(root?.querySelectorAll<HTMLElement>("[data-kplex-path]") ?? []).filter(/** Paths remain exact opaque projection identities. */ element => element.dataset.kplexPath === identity);
    const element = occurrences.find(/** The selected duplicate owns its source geometry when explicitly chosen. */ item => item.dataset.kplexKeyboardId === (explicit ?? selected?.id)) ?? occurrences[0];
    const rect = element?.getBoundingClientRect();
    const bounds = root?.getBoundingClientRect();
    const visible = rect && bounds && rect.width > 0 && rect.height > 0 && rect.bottom > bounds.top && rect.top < bounds.bottom && rect.right > bounds.left && rect.left < bounds.right;
    incomingCenter.current = { identity, origin, rect: visible ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null };
    wanderMotion.current = origin === "wander";
  };
  const wanderCandidates = useMemo<readonly WanderDestination[]>(/** Reuse the finite occurrence projection once per publication instead of rescanning it on every readiness poll. */ () => {
    const pages = new Map(scene.nodes.map(/** Exact occurrence keys disambiguate repeated semantic endpoints. */ node => [sceneNodeKeys.get(node), node.page]));
    for (const cluster of expandedClusters) for (const child of cluster.children) pages.set(child.key, child.relation.page);
    return keyboardNodes.flatMap(/** Transient headings/section targets and unresolved placeholders cannot start autonomous navigation. */ node => {
      const projected = pages.get(node.id);
      const page = index.get(node.path);
      if (!page || projected?.transient || page.transient || page.path === activePath || !(page.file || page.isFolder || page.isTag || page.url)
        || !index.isVisiblePage(page, settings) || page.file && plugin.app.vault.getFileByPath(page.file.path) !== page.file) return [];
      return [{ node: actionNodeRef(page), occurrenceId: node.id }];
    });
  }, [keyboardNodes, scene.nodes, sceneNodeKeys, expandedClusters, index, plugin, settings, activePath, renderRevision, semanticRevision]);
  /** Read current local scene/motion readiness without acquiring sources or rebuilding projection. */
  const readWanderScene = (): WanderScene => {
    const root = viewport.current;
    const center = persistentNeighborhood?.center;
    const gates = renderedCenterGates.current?.identity === center?.path ? renderedCenterGates.current?.stats : null;
    return { center: root?.isConnected && center ? center.path : null,
      ready: Boolean(root?.isConnected && plugin.isKplexLeafVisible(hostLeaf) && center && !sceneTransitioning && !pathChangedThisRender
        && !sceneMotion.isRunning() && !nodeDrag && !connectDrag && !areaSettingsMode && !relationshipUpdating
        && gates && Object.values(gates).every(/** Cached or unavailable incidence waits for existing local demand; global completeness is unnecessary. */ gate => !gate.countUnavailable && (gate.complete || gate.coverage === "local"))), candidates: wanderCandidates };
  };
  /** Revalidate occurrence, visibility and native incarnation after anticipation or an index publication. */
  const resolveWanderDestination = (destination: WanderDestination): GraphPage | null => {
    if (!readWanderScene().candidates.some(item => item.occurrenceId === destination.occurrenceId && item.node.identity === destination.node.identity)) return null;
    const page = resolveActionPage(index, destination.node);
    return page && index.isVisiblePage(page, settings) && (!page.file || plugin.app.vault.getFileByPath(page.file.path) === page.file) ? page : null;
  };
  /** Use existing selection/reveal and keep an exact lease so user-owned selection is never erased. */
  const highlightWander = (destination: WanderDestination): boolean => {
    if (!resolveWanderDestination(destination)) return false;
    wanderSelection.current = { center: activePath, previous: selection.readSelected()?.id ?? null, owned: destination.occurrenceId };
    return selection.select(destination.occurrenceId);
  };
  /** Release only a still-owned temporary highlight and cancel Wander-origin motion on interruption. */
  const clearWander = (): void => {
    const owned = wanderSelection.current; wanderSelection.current = null;
    if (owned?.center === activePath && selection.readSelected()?.id === owned.owned && !selection.select(owned.previous)) selection.select(null);
    if (wanderMotion.current) { sceneMotion.cancelAll(); incomingCenter.current = null; wanderMotion.current = false; }
  };
  const keyboardSelection = selection.selectedId;
  const [keyboardConnect, setKeyboardConnect] = useState<NodeRef | null>(null);
  const keyboardConnectRef = useRef<NodeRef | null>(null);
  const typeSelection = usePlexTypeSelection({ activePath, nodes: keyboardNodes, selection,
    normalMode: !areaSettingsMode && !connectDrag && !nodeDrag && !resizingArea && !relationshipUpdating && !centralEditorMaximized && !keyboardConnect,
  });
  const visibleConnectSession = `${actionSurfaceId}:visible-connect`;
  const graphDialogs = useRef(new Set<{ close(): void }>());
  const graphDialogSerial = useRef(0);
  useEffect(/** Unmount/window migration invalidates visible-target sessions and closes owned pickers. */ () => () => {
    keyboardConnectRef.current = null;
    plugin.actionManager.closeSession(visibleConnectSession);
    for (const dialog of graphDialogs.current) { if (dialog instanceof ColorSourceModal) dialog.retire(); else dialog.close(); }
    graphDialogs.current.clear();
    actionPorts.current = null;
  }, [actionPorts]);

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

  const paintedEdges = useMemo(/** Re-layer visible edge colors without rebuilding their route or scene. */ () => visibleEdges.map(edge => {
    const target = renderedNodeMap.get(edge.targetPath); if (!target || !neighborhood) return edge;
    const current = resolveLinkStyle({page: target.page, role: edge.role, relationType: edge.relationType, typeDefinition: edge.typeDefinition, linkDirection: edge.direction}, paintSettings);
    const layered = graphLensEdgeStyle(predicateEngine, index, paintLenses, {page: target.page, label: target.label, center: neighborhood.center,
      edge: {role: edge.role, relationType: edge.relationType, definition: edge.typeDefinition, linkDirection: edge.direction,
        sourcePath: edge.explanationSourcePath ?? edge.sourcePath, targetPath: edge.explanationTargetPath ?? edge.targetPath}});
    return {...edge, style: {...edge.style, strokeColor: current.strokeColor, textColor: current.textColor, ...layered}};
  }), [visibleEdges, renderedNodeMap, neighborhood, paintSettings, predicateEngine, index, paintLenses]);

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
    areaOutline.current?.clear();

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
          sourceGateElement: pending.element,
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
      sourceGateElement: event.currentTarget,
      gate,
      pointerId: event.pointerId,
      current: toWorld(event.clientX, event.clientY),
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  /** Capture direct-neighbor moves or additive sibling drops in the stable viewport drag layer. */
  const startNodeDrag = (node: PositionedNode, event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") touchDoubleTap.current.reset();
    const target = event.target as Element;
    if (target.closest("[data-kplex-gate], button")) return;
    // HTML dragstart requires the default mouse gesture and its original DOM source. Moving an
    // overflow row through pointer capture would remove that source before native drag can begin.
    // Touch and pen retain their existing pointer owner; gates keep their connector gesture.
    if (event.pointerType === "mouse" && event.button === 0 && canDragNodeLink(node.page)) {
      areaOutline.current?.clear();
      clearHoverIntent(true);
      event.stopPropagation();
      return;
    }
    if (event.button !== 0 || (!normalizedRole(node.role) && node.role !== "sibling") || node.page.isFolder || node.page.isTag || node.page.transient || neighborhood?.center.isFolder || neighborhood?.center.isTag) return;
    const captureElement = viewport.current;
    if (!captureElement) return;
    areaOutline.current?.clear();
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
      const areaHit = e.pointerType !== "touch" && !areaSettingsMode && viewSettings.areaOutlineRequiresAlt && !e.altKey ? null : areaHoverAt(
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
    areaOutline.current?.clear();
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
        updateAreaHover(areaHoverAt(e.clientX, e.clientY, e.target as Element, AREA_RESIZE_EDGE_PX, areaSettingsMode), e);
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
      runNodeAction("node.open", page);
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
      runNodeAction("node.open", target);
    } else {
      const occurrence = event.currentTarget.ownerDocument.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-kplex-keyboard-id]")?.dataset.kplexKeyboardId;
      runNodeAction("node.activate", target, occurrence);
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
    const current = captureSurfaceContinuation(() => viewport.current, () => plugin.actionManager.readSnapshot(actionSurfaceId));
    if (semanticRole) {
      plugin.openRelationModal({ hostLeaf, mode: "create", origin, fixedTarget: target, semanticRole,
        onCommitted: /** Retire hover only when this captured graph intent still owns the view. */ () => { if (current()) clearHoverIntent(true); } });
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
          onCommitted: /** Durable completion cannot alter a subsequently navigated/interacted graph. */ () => { if (current()) clearHoverIntent(true); },
        })));
    }
    plugin.showKplexMenuAtPosition(menu, { x: clientX, y: clientY }, ownerDocument, hostLeaf);
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

  /** Accept native files or captured Plex links; same-view node drags retain relinking semantics. */
  const dragExternalFileOver = (event: DragEvent<HTMLDivElement>): void => {
    const target = draggedGraphPage(plugin.app, index);
    const file = getDraggedFile(plugin.app);
    if (!target && (nodeLinkDragSource(plugin.app) || !file)) { setExternalDropZone(null); return; }
    const hit = externalFileDropTarget(event.clientX, event.clientY, event.currentTarget.ownerDocument.elementFromPoint(event.clientX, event.clientY));
    // Empty canvas uses App's navigation fallback; preview that same action at the center.
    if (!hit) { setExternalDropZone("center"); return; }
    const origin = neighborhood?.center;
    const source = nodeLinkDragSource(plugin.app);
    const internal = source?.owner === viewport.current;
    const eligible = hit === "center" ? !internal
      : hit !== "blocked" && origin && target && relationshipDropRoles(origin, target, hit).includes(hit);
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
      const source = nodeLinkDragSource(plugin.app);
      if (source?.owner !== element) return;
      const page = draggedGraphPage(plugin.app, index);
      if (!page) return;
      updateHistoryDragHover(page, event.clientX, event.clientY, ownerDocument);
      if ((event.target as Element | null)?.closest("[data-kplex-history-path], [data-kplex-pinned-path]")) event.preventDefault();
    };
    /** Native body dragging leaves viewport delivery; preserve its existing history/pin targets. */
    const outsideDrop = (event: DocumentEventMap["drop"]): void => {
      const source = nodeLinkDragSource(plugin.app);
      if (source?.owner !== element || element.contains(event.target as Node | null)) return;
      const chip = (event.target as Element | null)?.closest("[data-kplex-history-path], [data-kplex-pinned-path]");
      if (!chip) return;
      event.preventDefault();
      event.stopPropagation();
      const page = draggedGraphPage(plugin.app, index);
      if (page) openHistoryRelationshipMenu(page, event.clientX, event.clientY, ownerDocument);
      suppressActivateUntil.current = Date.now() + 220;
    };
    /** Clear feedback on completion/cancellation without handling the drop itself. */
    const finish = (): void => { setExternalDropZone(null); clearHistoryDragHover(); };
    ownerDocument.addEventListener("dragover", outside, true);
    ownerDocument.addEventListener("dragend", finish, true);
    ownerDocument.addEventListener("drop", finish, true);
    ownerDocument.addEventListener("drop", outsideDrop, true);
    ownerWindow.addEventListener("blur", finish);
    return /** Release only this viewport's feedback listeners on navigation or unmount. */ () => {
      ownerDocument.removeEventListener("dragover", outside, true);
      ownerDocument.removeEventListener("dragend", finish, true);
      ownerDocument.removeEventListener("drop", finish, true);
      ownerDocument.removeEventListener("drop", outsideDrop, true);
      ownerWindow.removeEventListener("blur", finish);
    };
  }, [activePath]);

  /** Navigate external link drops; same-view moves and additive drops use the shared composer. */
  const dropExternalFile = (event: DragEvent<HTMLDivElement>): void => {
    setExternalDropZone(null);
    const target = draggedGraphPage(plugin.app, index);
    if (!target && (nodeLinkDragSource(plugin.app) || !getDraggedFile(plugin.app))) return;
    const source = nodeLinkDragSource(plugin.app);
    if (source?.owner === viewport.current) {
      event.preventDefault();
      event.stopPropagation();
      const original = scene.nodes.find(node => node.page === target && node.role === source.role);
      if (!original) return;
      suppressActivateUntil.current = Date.now() + 220;
      if (openHistoryRelationshipMenu(original.page, event.clientX, event.clientY, event.currentTarget.ownerDocument)) return;
      const role = externalFileDropTarget(event.clientX, event.clientY, event.currentTarget.ownerDocument.elementFromPoint(event.clientX, event.clientY));
      if (role && role !== "center" && role !== "blocked") commitNodeAreaDrop(original, role);
      return;
    }
    const hit = externalFileDropTarget(event.clientX, event.clientY, event.currentTarget.ownerDocument.elementFromPoint(event.clientX, event.clientY));
    if (!hit) return;
    if (hit === "center" && !target) return;
    event.preventDefault();
    event.stopPropagation();
    if (hit === "center") { if (target) onActivate(target); return; }
    const origin = neighborhood?.center;
    if (hit === "blocked" || !origin || !target || !relationshipDropRoles(origin, target, hit).includes(hit)) return;
    const current = captureSurfaceContinuation(() => viewport.current, () => plugin.actionManager.readSnapshot(actionSurfaceId));
    plugin.openRelationModal({ hostLeaf, mode: "create", origin, fixedTarget: target, semanticRole: hit,
      onCommitted: /** Publication remains durable while old view feedback is fenced. */ () => { if (current()) clearHoverIntent(true); } });
  };

  /** Siblings add a direct relation only inside a real relation area; existing neighbors retain move hysteresis. */
  const nodeDropRole = (node: PositionedNode, position: Point, clientX: number, clientY: number, hit: Element | null): GateRole | null => {
    const currentRole = normalizedRole(node.role);
    if (currentRole && settings.lateralArrangement !== "left") return semanticRoleForPosition(position, currentRole, NODE_RELINK_HYSTERESIS_PX / Math.max(0.3, camera.current.scale));
    if (currentRole) {
      const area = externalFileDropTarget(clientX, clientY, hit);
      return area && area !== "center" && area !== "blocked" ? area : null;
    }
    if (node.role !== "sibling") return null;
    const area = externalFileDropTarget(clientX, clientY, hit);
    return area && area !== "center" && area !== "blocked" ? area : null;
  };

  /** Share the exact durable/optimistic composer path between touch relinks and native body drops. */
  const commitNodeAreaDrop = (original: PositionedNode, nextRole: GateRole): void => {
    const center = neighborhood?.center;
    const currentRole = normalizedRole(original.role);
    if (!center || nextRole === currentRole || !relationshipDropRoles(center, original.page, nextRole).includes(nextRole)) return;
    const current = captureSurfaceContinuation(() => viewport.current, () => plugin.actionManager.readSnapshot(actionSurfaceId));
    const commitRoot = viewport.current, commitDocument = commitRoot?.ownerDocument;
    const token = ++optimisticCommitToken.current;
    plugin.openRelationModal({
      hostLeaf, mode: currentRole ? "relink" : "create", origin: center, fixedTarget: original.page,
      existingDirection: currentRole ? original.linkDirection : undefined, semanticRole: nextRole,
      onCommitStart: /** A retired gesture cannot install optimistic presentation. */ role => {
        if (!current()) return;
        setOptimisticRelink({ targetPath: original.page.path, role });
        setRelationshipUpdating(true);
      },
      onCommitEnd: /** A failed write releases only its own still-mounted optimistic token. */ success => {
        if (!success && token === optimisticCommitToken.current && commitRoot?.isConnected && viewport.current === commitRoot && commitRoot.ownerDocument === commitDocument) {
          setRelationshipUpdating(false);
          setOptimisticRelink(null);
        }
      },
      onCommitted: /** Durable publication survives dialog closure; stale hover feedback does not. */ () => {
        if (current()) clearHoverIntent(true);
      },
    });
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
      updateAreaHover(areaHoverAt(e.clientX, e.clientY, hitTarget, AREA_RESIZE_EDGE_PX, areaSettingsMode), e);
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
        const current = captureSurfaceContinuation(() => viewport.current, () => plugin.actionManager.readSnapshot(actionSurfaceId));
        plugin.openRelationModal({
          hostLeaf,
          mode: "create",
          origin,
          semanticRole,
          fixedTarget,
          onCommitted: /** Ignore late hover effects after interaction or owner-document replacement. */ () => { if (current()) clearHoverIntent(true); },
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
        if (dragDistance >= NODE_RELINK_MIN_DRAG_PX && draggedNode && original) {
          const hit = e.currentTarget.ownerDocument.elementFromPoint(e.clientX, e.clientY);
          const nextRole = nodeDropRole(original, draggedNode, e.clientX, e.clientY, hit);
          if (nextRole) commitNodeAreaDrop(original, nextRole);
        }
      } else if (original) {
        // Starting a potential relationship-relink drag uses pointer capture. Some Chromium/React
        // combinations then suppress the synthetic click, so make a tap explicitly navigate.
        if (e.pointerType === "touch") {
          completeTouchTap(original.page, e);
        } else {
          suppressActivateUntil.current = Date.now() + 180;
          const occurrence = sceneNodeKeys.get(original);
          if (occurrence) navigationOccurrence.current = { identity: original.page.path, id: occurrence };
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
    areaOutline.current?.clear();
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

  /** Resolve a selected transient occurrence from this projection, otherwise reacquire its exact canonical node. */
  const graphActionPage = (context: ActionContext): GraphPage | null => {
    if (context.target.kind !== "node") return null;
    const target = context.target;
    const occurrence = scene.nodes.find(node => target.occurrenceId
      ? sceneNodeKeys.get(node) === target.occurrenceId : node.page.path === target.node.identity);
    if (target.node.kind === "section") {
      const page = occurrence?.page;
      if (page?.transient?.kind !== "section" || target.node.fileIdentity !== undefined && actionNodeRef(page).fileIdentity !== target.node.fileIdentity) return null;
      return !page.file || plugin.app.vault.getFileByPath(page.file.path) === page.file ? page : null;
    }
    return resolveActionPage(index, target.node);
  };
  const graphAction = surfaceAction;
  /** Capture an explicit occurrence for menus and pointer controls using the same dispatcher as keys. */
  const runNodeAction = (id: ActionId, target: GraphPage, occurrenceId?: string): void => {
    void plugin.actionManager.dispatch({ id, source: "context-menu", surfaceId: actionSurfaceId,
      target: { kind: "explicit", node: actionNodeRef(target), occurrenceId } });
  };
  /** Reuse current section-fold state and descendant policy for pointer, menu and keyboard routes. */
  const applySectionAction = (page: GraphPage, id: "section.toggle-level" | "section.fold-descendants" | "section.unfold-descendants"): void => {
    const section = sectionExpansion?.sections.find(candidate => candidate.id === page.transient?.sectionId);
    if (!section?.childIds.length) return;
    const descendants = new Set<string>();
    /** Traverse only the current projected section tree; ontology graphs are never treated as trees. */
    const collect = (sectionId: string): void => {
      const current = sectionExpansion?.sections.find(candidate => candidate.id === sectionId);
      if (!current) return;
      for (const childId of current.childIds) { descendants.add(childId); collect(childId); }
    };
    collect(section.id);
    updateSectionFolds(/** Apply the existing local expansion-set behavior through one owner. */ current => {
      const next = new Set(current);
      if (id === "section.toggle-level") { if (next.has(section.id)) next.delete(section.id); else next.add(section.id); }
      else if (id === "section.fold-descendants") { next.delete(section.id); for (const childId of descendants) next.delete(childId); }
      else {
        next.add(section.id);
        for (const childId of descendants) if (sectionExpansion?.sections.find(candidate => candidate.id === childId)?.childIds.length) next.add(childId);
      }
      return next;
    });
  };
  /** Execute connection inspection/removal with existing pair evidence and canonical writer safety. */
  const performEdgeAction = async (context: ActionContext, edge: PositionedEdge, id: "relationship.details" | "relationship.relink" | "relationship.unlink" | "relationship.hide"): Promise<ActionOutcome> => {
    const sourcePath = edge.explanationSourcePath ?? edge.sourcePath;
    const targetPath = edge.explanationTargetPath ?? edge.targetPath;
    const explanation = sectionExpansion?.explanations.get(`${sourcePath}\u0000${targetPath}`) ?? index.explainRelationship(sourcePath, targetPath);
    if (!explanation) return { status: "unavailable", reasonKey: "actions.target-unavailable" };
    /** Own inspection/role dialogs until native close, preserving canonical evidence and source choice. */
    const openDetails = (): ActionOutcome => {
      const sessionId = `${actionSurfaceId}:details:${++graphDialogSerial.current}`;
      const dialog = new RelationshipExplanationModal(plugin, explanation, {
        role: edge.role, centerPath: neighborhood?.center.path, hostLeaf, initialFocus: "sources",
        sourceTitle: scene.nodes.find(node => node.page.path === sourcePath)?.label,
        targetTitle: scene.nodes.find(node => node.page.path === targetPath)?.label,
      }, /** Native close/window teardown release the exact captured pair session. */ () => { graphDialogs.current.delete(dialog); plugin.actionManager.closeSession(sessionId); });
      graphDialogs.current.add(dialog); dialog.open();
      return { status: "opened", sessionId };
    };
    if (id === "relationship.details") return openDetails();
    if (id === "relationship.hide") {
      let confirmation: { close(): void } | null = null;
      return plugin.hideRelationship(sourcePath,targetPath, /** Retired surfaces cannot approve a late native read. */ () => context.generation !== undefined && plugin.isActionSurfaceCurrent(actionSurfaceId,context.generation),
        /** Exact surface/window teardown closes only its pending native confirmation. */ modal => {
          if (confirmation) graphDialogs.current.delete(confirmation);
          confirmation = modal;
          if (modal) graphDialogs.current.add(modal);
        });
    }
    if (id === "relationship.relink") {
      const explicit = explanation.decisions.filter(decision => decision.active && (decision.evidence.sourceKind === "frontmatter-ontology" || decision.evidence.sourceKind === "inline-ontology"));
      const evidence = explicit.length === 1 ? explicit[0].evidence : null;
      const role = evidence?.declaredRole;
      if (!evidence || role !== "parent" && role !== "child" && role !== "left" && role !== "right") return openDetails();
      const origin = index.get(evidence.declaredByPath), target = index.get(evidence.declaredTargetPath);
      if (!origin?.file || !target?.file || context.generation === undefined || !plugin.isActionSurfaceCurrent(actionSurfaceId, context.generation)) return { status: "unavailable", reasonKey: "actions.target-unavailable" };
      const sessionId = `${actionSurfaceId}:relink:${++graphDialogSerial.current}`;
      const dialog = plugin.openRelationModal({ mode: "relink", purpose: "move", hostLeaf, origin, fixedTarget: target,
        semanticRole: role, existingDirection: evidence.direction, initialField: evidence.fieldName, initialStoragePath: evidence.declaredByPath, allowRoleSelection: true,
        onClosed: /** Relink never leaves a guard or native modal behind a retired graph surface. */ () => { graphDialogs.current.delete(dialog); plugin.actionManager.closeSession(sessionId); },
      });
      graphDialogs.current.add(dialog); return { status: "opened", sessionId };
    }
    const origin = scene.nodes.find(node => node.page.path === edge.sourcePath)?.page ?? index.get(edge.sourcePath);
    const target = scene.nodes.find(node => node.page.path === edge.targetPath)?.page ?? index.get(edge.targetPath);
    const affected = [origin, target].filter((page): page is GraphPage => Boolean(page)).map(actionNodeRef);
    try {
      const candidate = await plugin.directFrontmatterUnlinkCandidate(explanation.decisions.map(decision => decision.evidence));
      if (!candidate || !await plugin.unlinkFrontmatterEvidence(candidate)) {
        return openDetails();
      }
      clearHoverIntent(true); return { status: "committed", affected };
    } catch (error) {
      if (!(error instanceof SavedRelationshipPendingError)) throw error;
      if (!error.noticeReported) new Notice(error.message);
      return { status: "saved-pending", affected, reasonKey: "actions.savedPending" };
    }
  };
  /** Open a native finite projection/connection picker and retain one session until it closes. */
  const ownGraphPicker = <T,>(items: readonly ActionPickerItem<T>[], placeholder: string, choose: (target: T, event: ActionPickerEvent) => void): ActionOutcome => {
    const sessionId = `${actionSurfaceId}:graph-picker:${++graphDialogSerial.current}`;
    const picker = new ActionTargetPicker(plugin.app, items, placeholder, choose,
      /** Close/unmount releases the original surface's picker guard exactly once. */ () => {
        graphDialogs.current.delete(picker); plugin.actionManager.closeSession(sessionId);
      });
    graphDialogs.current.add(picker); picker.open();
    return { status: "opened", sessionId };
  };
  /** Pick a specific current connection instead of guessing among multiple evidence-bearing neighbors. */
  const pickConnection = (context: ActionContext, id: "relationship.details" | "relationship.relink" | "relationship.unlink" | "relationship.hide"): ActionOutcome | Promise<ActionOutcome> => {
    if (context.target.kind === "edge") {
      const target = context.target;
      const edge = scene.edges.find(candidate => candidate.id === target.evidenceId
        || candidate.sourcePath === target.origin.identity && candidate.targetPath === target.target.identity);
      if (!edge) return { status: "unavailable", reasonKey: "actions.target-unavailable" };
      return performEdgeAction(context, edge, id);
    }
    const page = graphActionPage(context);
    if (!page) return { status: "unavailable", reasonKey: "actions.target-unavailable" };
    const edges = scene.edges.filter(edge => edge.sourcePath === page.path || edge.targetPath === page.path);
    const items = edges.flatMap(/** Capture endpoint identities now, before the native picker takes focus. */ edge => {
      const source = scene.nodes.find(node => node.page.path === edge.sourcePath)?.page ?? index.get(edge.sourcePath);
      const target = scene.nodes.find(node => node.page.path === edge.targetPath)?.page ?? index.get(edge.targetPath);
      if (!source || !target) return [];
      return [{ value: { origin: actionNodeRef(source), target: actionNodeRef(target), evidenceId: edge.id },
        label: `${scene.nodes.find(node => node.page.path === edge.sourcePath)?.label ?? source.name} → ${scene.nodes.find(node => node.page.path === edge.targetPath)?.label ?? target.name}`,
        detail: `${relationLabel(edge.typeDefinition) ?? translate(EVIDENCE_ROLE_LABEL[edge.role] ?? "role.child")} · ${relationTypeText(edge.relationType, translate)}` }];
    });
    return ownGraphPicker(items, translate("actions.connectionsPlaceholder"), /** Revalidate captured endpoints through manager and current pair evidence. */ pair => {
      void plugin.actionManager.dispatch({ id, source: "local-menu", surfaceId: actionSurfaceId, target: { kind: "edge", ...pair } });
    });
  };
  /** Open the existing composer with captured endpoints and a surface-owned session lease. */
  const connectFrom = (context: ActionContext): ActionOutcome => {
    const targetRequest = context.target;
    const originRef = targetRequest.kind === "edge" ? targetRequest.origin : targetRequest.kind === "node" ? targetRequest.node : null;
    const targetRef = targetRequest.kind === "edge" ? targetRequest.target : undefined;
    const origin = originRef ? resolveActionPage(index, originRef) : null;
    const target = targetRef ? resolveActionPage(index, targetRef) : undefined;
    if (!origin || origin.isFolder || origin.isTag || targetRef && (!target || target.isFolder || target.isTag || target.path === origin.path)) return { status: "unavailable", reasonKey: "actions.target-unavailable" };
    const sessionId = `${actionSurfaceId}:connect:${++graphDialogSerial.current}`;
    const ownerDocument = viewport.current?.ownerDocument;
    const current = captureSurfaceContinuation(() => viewport.current, () => plugin.actionManager.readSnapshot(actionSurfaceId));
    const generation = context.generation;
    const dialog = plugin.openRelationModal({ hostLeaf, mode: "create", origin, fixedTarget: target ?? undefined, semanticRole: "child",
      invocation: {
        current: /** Detached/migrated or deliberately interacted sources cannot authorize late composer UI effects. */ () => Boolean(current() && viewport.current?.ownerDocument === ownerDocument && generation !== undefined && plugin.isActionSurfaceCurrent(actionSurfaceId, generation)),
        focusGraph: /** Explicit continuation focuses only the originating live graph. */ () => viewport.current?.closest<HTMLElement>(".kplex-app")?.focus({ preventScroll: true }),
        onClosed: /** Release exactly this captured composer's callback and manager guard. */ () => { graphDialogs.current.delete(dialog); plugin.actionManager.closeSession(sessionId); },
      },
    });
    graphDialogs.current.add(dialog);
    return { status: "opened", sessionId };
  };
  /** Track native rename lifetime so held or repeated commands cannot stack duplicate dialogs. */
  const renameFrom = (context: ActionContext): ActionOutcome => {
    const file = graphActionPage(context)?.file;
    if (!file) return { status: "unavailable", reasonKey: "actions.target-unavailable" };
    const sessionId = `${actionSurfaceId}:rename:${++graphDialogSerial.current}`;
    const generation = context.generation;
    const dialog = new RenameNoteModal(plugin, file, {
      current: /** Rename retains its captured native identity and originating view generation. */ () => Boolean(viewport.current?.isConnected && generation !== undefined && plugin.isActionSurfaceCurrent(actionSurfaceId, generation)),
      onClosed: /** Native cancellation and graph teardown retire the same rename session. */ () => { graphDialogs.current.delete(dialog); plugin.actionManager.closeSession(sessionId); },
    });
    graphDialogs.current.add(dialog); dialog.open();
    return { status: "opened", sessionId };
  };
  const graphImplementations: SurfaceActionImplementations = {
    "selection.center": graphAction(/** Select/reveal the displayed center without changing shared navigation. */ () => selection.select(keyboardNodes.find(node => node.section === "center")?.id ?? null)),
    "node.activate": graphAction(/** Preserve legacy Enter on the central file, with explicit activation elsewhere. */ context => {
      const page = graphActionPage(context);
      if (!page) return;
      if (page.transient?.kind === "section") return plugin.openSection(page);
      if (context.request.source === "local-hotkey" && page.path === activePath && page.file) return renameFrom(context);
      if (context.target.kind === "node" && context.target.occurrenceId) navigationOccurrence.current = { identity: page.path, id: context.target.occurrenceId };
      onActivate(page);
      return;
    }, context => Boolean(graphActionPage(context))),
    "node.open": graphAction(/** Central files open beneath the sidebar; other content retains owned Sidecar and ghost materialization behavior. */ context => {
      const page = graphActionPage(context);
      if (page?.transient?.kind === "section") return plugin.openSection(page);
      if (page?.file && page.path === activePath) return plugin.openFileInMainTab(page.file);
      if (page?.file || page?.url) {
        if (context.target.kind === "node" && context.target.occurrenceId) navigationOccurrence.current = { identity: page.path, id: context.target.occurrenceId };
        return onOpenInSidecar(page);
      }
      if (page && context.request.id === "node.open" && context.request.args?.chooseFolder) {
        return plugin.openPage(page, viewport.current?.ownerDocument, { chooseFolder: true });
      }
      if (page) return onOpen(page);
      return;
    }, /** Central files and explicit placeholder-folder prompts remain usable without a Sidecar destination. */ context => {
      const page = graphActionPage(context);
      const folderPrompt = context.request.id === "node.open" && context.request.args?.chooseFolder
        && page && !page.file && !page.url && !page.isFolder && !page.isTag && !page.transient;
      return Boolean(page) && (surface !== "sidepanel" || Boolean(page?.file && page.path === activePath) || Boolean(folderPrompt));
    }),
    "node.edit": graphAction(/** Explicit editing opens this accepted file through existing host policy. */ context => {
      const page = graphActionPage(context); if (page?.file) return onOpen(page);
    }, context => Boolean(graphActionPage(context)?.file)),
    "node.rename": graphAction(renameFrom, context => { const page = graphActionPage(context); return Boolean(page?.file && !page.transient); }),
    "node.note-type": graphAction(/** Delegate document-property editing to its established host modal. */ context => {
      const page = graphActionPage(context); if (!page) return { status: "unavailable", reasonKey: "actions.target-unavailable" };
      const sessionId = `${actionSurfaceId}:note-type:${++graphDialogSerial.current}`;
      const dialog = plugin.openNoteTypeModal(page, /** Closing or unmounting retires exactly the modal's original guard. */ () => {
        if (dialog) graphDialogs.current.delete(dialog); plugin.actionManager.closeSession(sessionId);
      });
      if (!dialog) return { status: "unavailable", reasonKey: "actions.target-unavailable" };
      graphDialogs.current.add(dialog); return { status: "opened", sessionId };
    }, context => { const page = graphActionPage(context); return page?.file?.extension === "md" && !page.transient; }),
    "node.delete": graphAction(/** Delete requires explicit/selected target and keeps the host's confirmation semantics. */ context => {
      const page = graphActionPage(context); if (page) return plugin.deleteNode(page, hostLeaf, page.path === activePath);
      return;
    }, context => {
      const page = graphActionPage(context); return Boolean(page && !page.transient && !page.isFolder && !page.isTag && !page.url && (!page.file || page.file.extension === "md"));
    }),
    "node.copy-link": graphAction(/** Copy a link locally through the owning document's clipboard capability. */ context => {
      const page = graphActionPage(context); if (!page) return;
      return viewport.current?.ownerDocument.defaultView?.navigator.clipboard.writeText(page.url ?? `[[${page.file?.path ?? page.path}]]`);
    }, context => Boolean(graphActionPage(context)) && typeof viewport.current?.ownerDocument.defaultView?.navigator.clipboard?.writeText === "function"),
    "node.context-menu": graphAction(/** Anchor keyboard menus to the exact selected occurrence, retaining native Escape/click-outside behavior. */ context => {
      const page = graphActionPage(context); if (!page) return;
      const occurrence = context.target.kind === "node" ? context.target.occurrenceId : undefined;
      let node = scene.nodes.find(candidate => occurrence ? sceneNodeKeys.get(candidate) === occurrence : candidate.page.path === page.path);
      if (!node) {
        for (const cluster of expandedClusters) {
          const child = cluster.children.find(candidate => occurrence ? candidate.key === occurrence : candidate.relation.page.path === page.path);
          if (child) { node = { ...cluster.parent, page: child.relation.page, role: "child", label: child.label, style: child.style,
            relationType: child.relation.relationType, typeDefinition: child.relation.typeDefinition, linkDirection: child.relation.linkDirection,
            x: cluster.left + child.localX, y: cluster.top + child.localY - cluster.scrollTop, width: child.width, height: child.height }; break; }
        }
      }
      if (!node) return;
      const element = Array.from(viewport.current?.querySelectorAll<HTMLElement>("[data-kplex-keyboard-id]") ?? []).find(candidate => candidate.dataset.kplexKeyboardId === (occurrence ?? sceneNodeKeys.get(node)));
      const rect = element?.getBoundingClientRect() ?? viewport.current?.getBoundingClientRect();
      if (rect) showNodeContextMenuAt(node, rect.left + rect.width / 2, rect.top + rect.height / 2, occurrence);
    }, context => Boolean(graphActionPage(context))),
    "sections.toggle": graphAction(/** Reuse current center Markdown projection folding. */ () => toggleCentralSections(), () => canExpandCentralSections(persistentNeighborhood?.center, activePath) && !centralEditorAvailable),
    "sections.fold-all": graphAction(/** Fold only this center's current section projection. */ () => updateSectionFolds(() => new Set()), () => Boolean(sectionExpansion)),
    "sections.unfold-all": graphAction(/** Expand only actual current sections with children. */ () => updateSectionFolds(() => new Set(sectionExpansion?.sections.filter(section => section.childIds.length).map(section => section.id))), () => Boolean(sectionExpansion)),
    "view.zoom-in": graphAction(/** Keep existing platform clamp and zoom increment. */ () => applyCamera(camera => ({ ...camera, scale: Math.min(Platform.isIosApp ? IOS_MAX_ZOOM : MAX_ZOOM, camera.scale * 1.15) }))),
    "view.zoom-out": graphAction(/** Keep existing minimum and zoom decrement. */ () => applyCamera(camera => ({ ...camera, scale: Math.max(.3, camera.scale / 1.15) }))),
    "view.fit": graphAction(/** Reuse the camera owner's current displayed-scene fitting policy. */ () => fit()),
    "view.layout-controls": graphAction(/** Existing sliders retain native arrows and Tab protocols after disclosure. */ () => setLayoutControlsOpen(value => !value)),
    "nodes.open": {
      availability: /** Only currently displayed occurrences participate; no graph search runs while checking. */ () => keyboardNodes.length ? { state: "enabled" } : { state: "disabled", reasonKey: "actions.unavailable" },
      execute: /** Native picker Enter selects/reveals; Mod+Enter activates only its captured, still-displayed occurrence. */ () => {
        const items = keyboardNodes.flatMap(/** Capture each finite displayed occurrence's identity at launch. */ node => {
          const page = scene.nodes.find(candidate => sceneNodeKeys.get(candidate) === node.id)?.page ?? index.get(node.path);
          return page ? [{ value: { node, ref: actionNodeRef(page) }, label: node.label, detail: node.path }] : [];
        });
        return ownGraphPicker(items, translate("actions.nodesPlaceholder"), ({ node, ref }, event) => {
          if (!selection.select(node.id)) return;
          viewport.current?.closest<HTMLElement>(".kplex-app")?.focus({ preventScroll: true });
          if (event.ctrlKey || event.metaKey) void plugin.actionManager.dispatch({ id: "node.activate", source: "local-menu", surfaceId: actionSurfaceId,
            target: { kind: "explicit", node: ref, occurrenceId: node.id } });
        });
      },
    },
    "relationship.connect": graphAction(connectFrom, context => {
      if (context.target.kind === "edge") return context.target.origin.kind !== "folder" && context.target.origin.kind !== "tag" && context.target.target.kind !== "folder" && context.target.target.kind !== "tag";
      const page = graphActionPage(context); return Boolean(page && !page.isFolder && !page.isTag && !page.transient);
    }),
    "relationship.connect-visible": graphAction(/** Freeze the origin while arrows choose a target without changing center. */ context => {
      const page = graphActionPage(context); if (!page) return { status: "unavailable", reasonKey: "actions.target-unavailable" };
      keyboardConnectRef.current = actionNodeRef(page); setKeyboardConnect(keyboardConnectRef.current);
      viewport.current?.closest<HTMLElement>(".kplex-app")?.focus({ preventScroll: true });
      return { status: "opened", sessionId: visibleConnectSession };
    }, context => { const page = graphActionPage(context); return Boolean(page && !page.isFolder && !page.isTag && !page.transient); }),
  };
  for (const direction of ACTION_DIRECTIONS) {
    graphImplementations[`selection.move.${direction}`] = graphAction(/** Spatial selection consumes the existing finite displayed projection. */ () => selection.move(direction, false));
    graphImplementations[`selection.section.${direction}`] = graphAction(/** Explicit modifier jumps retain established section policy. */ () => selection.move(direction, true));
    graphImplementations[`view.pan.${direction}`] = graphAction(/** Move the existing camera by a viewport-space step; never move semantic nodes. */ () => applyCamera(camera => ({ ...camera,
      x: camera.x + (direction === "left" ? 80 : direction === "right" ? -80 : 0),
      y: camera.y + (direction === "up" ? 80 : direction === "down" ? -80 : 0) })));
  }
  for (const id of ["section.toggle-level", "section.fold-descendants", "section.unfold-descendants"] as const) {
    graphImplementations[id] = graphAction(/** Section intents share the menu/pointer expansion owner. */ context => {
      const page = graphActionPage(context); if (page) applySectionAction(page, id);
    }, context => graphActionPage(context)?.transient?.kind === "section");
  }
  for (const id of ["relationship.details", "relationship.relink", "relationship.unlink", "relationship.hide"] as const) {
    graphImplementations[id] = {
      availability: /** Missing Hidden configuration is handled by explicit setup after activation, without source acquisition here. */ context => context.target.kind === "edge" || Boolean(graphActionPage(context))
        ? { state: "enabled" } : { state: "disabled", reasonKey: "actions.target-unavailable" },
      execute: /** A picker exposes every displayed incident edge; selected edge actions use current evidence. */ context => pickConnection(context, id),
    };
  }
  for (const [id, destination] of [["node.open.focus-tab", "focus-tab"], ["node.open.new-tab", "new-tab"], ["node.open.split", "split"], ["node.open.window", "window"], ["node.open.browser", "browser"], ["node.open.web-viewer", "web-viewer"]] as const) {
    graphImplementations[id] = graphAction(/** Open the exact accepted file/URL using existing device-aware destinations. */ context => {
      const page = graphActionPage(context); if (!page) return;
      if (destination === "browser" && page.url) return plugin.openUrlInBrowser(page.url, viewport.current?.ownerDocument);
      if (destination === "web-viewer" && page.url) return plugin.openUrlInWebViewer(page.url);
      if (!page.file) return;
      if (destination === "focus-tab") return plugin.focusOpenFileTab(page.file);
      if (destination === "new-tab") return plugin.openFileInNewTab(page.file);
      if (destination === "split") return plugin.openFileInAdjacentPane(page.file, hostLeaf);
      if (destination === "window") return plugin.openFileInPopout(page.file);
    }, context => {
      const page = graphActionPage(context);
      if (destination === "browser") return Boolean(page?.url);
      if (destination === "web-viewer") return Boolean(page?.url) && plugin.canOpenUrlInWebViewer();
      if (!page?.file) return false;
      const state = plugin.getFileOpenMenuState(page.file);
      return destination === "focus-tab" ? state.focusOpenTab : destination === "new-tab" || destination === "split" && state.adjacentPane || destination === "window" && state.popoutWindow;
    });
  }
  actionPorts.current = {
    implementations: graphImplementations,
    prepareNavigation, readWanderScene, highlightWander, clearWander,
    navigateWander: /** Accept only an exact still-displayed destination through the shared App activation path. */ destination => {
      const page = resolveWanderDestination(destination);
      if (!page || !readWanderScene().ready) return false;
      onWanderActivate(page); return true;
    },
    prepareDisplayResize: /** Keep exact zoom/pan across toolbar/overlay resizing, including viewport-dependent central editors. */ () => {
      displayResizePending.current = true; displayResizeLayout.current = true; preserveCameraOnNextLayout.current = true;
    },
    clearSelection: /** Pointer graph gestures retire typing and highlighting without affecting native controls. */ () => { typeSelection.clear(); selection.select(null); },
    normalMode: !areaSettingsMode && !connectDrag && !nodeDrag && !resizingArea && !relationshipUpdating,
    readSelected: /** Validate exact selected occurrence against this render before exposing its semantic reference. */ () => {
      const selected = selection.readSelected(); if (!selected) return null;
      const page = scene.nodes.find(node => sceneNodeKeys.get(node) === selected.id)?.page ?? index.get(selected.path);
      return page ? { node: actionNodeRef(page), occurrenceId: selected.id } : null;
    },
    handleSessionKey: /** Visible connection protocol takes priority; otherwise unclaimed typing selects displayed occurrences only. */ (event, matchedAction) => {
      const origin = keyboardConnectRef.current;
      if (!origin) {
        // Default Backspace history gestures yield to an active query. Explicit customized
        // Backspace actions retain their saved intent, as do all matched printable shortcuts.
        const editsQuery = typeSelection.readQuery() && event.key === "Backspace" && (!matchedAction
          || (matchedAction === "history.back" || matchedAction === "history.forward")
          && !Object.prototype.hasOwnProperty.call(plugin.settings.actionPreferences.localBindings, matchedAction));
        if (matchedAction && !editsQuery && event.key !== "Escape" && event.key !== "Tab") return false;
        return typeSelection.handleKey(event);
      }
      if (event.key !== "Escape" && event.key !== "Enter" && matchedAction !== "search.focus") return false;
      acceptPlexKeyEvent(event);
      if (event.repeat) return true;
      if (event.key === "Escape") {
        keyboardConnectRef.current = null; setKeyboardConnect(null); plugin.actionManager.closeSession(visibleConnectSession); return true;
      }
      const selected = selection.readSelected();
      const target = selected ? scene.nodes.find(node => sceneNodeKeys.get(node) === selected.id)?.page ?? index.get(selected.path) : null;
      if (matchedAction !== "search.focus" && event.key === "Enter" && (!target || target.path === origin.path || target.isFolder || target.isTag || target.transient)) return true;
      keyboardConnectRef.current = null; setKeyboardConnect(null); plugin.actionManager.closeSession(visibleConnectSession);
      void plugin.actionManager.dispatch({ id: "relationship.connect", source: "internal", surfaceId: actionSurfaceId,
        target: matchedAction === "search.focus" ? { kind: "explicit", node: origin } : { kind: "edge", origin, target: target ? actionNodeRef(target) : origin } });
      return true;
    },
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
  const activateNode = (page: GraphPage, occurrenceId?: string): void => {
    if (page.transient?.kind === "section") return;
    const target = persistentPageFor(page);
    if (target && Date.now() >= Math.max(suppressActivateUntil.current, suppressSyntheticClickUntil.current)) runNodeAction("node.activate", target, occurrenceId);
  };

  /** Open through mouse double-click unless a completed touch pair already performed the same action. */
  const openNode = (page: GraphPage, chooseFolder = false): void => {
    if (Date.now() < suppressNativeDoubleClickUntil.current) return;
    if (page.transient?.kind === "section") {
      runNodeAction("node.open", page);
      return;
    }
    const target = persistentPageFor(page);
    if (target && chooseFolder && !target.file && !target.url && !target.isFolder && !target.isTag) {
      void plugin.actionManager.dispatch({ id: "node.open", source: "context-menu", surfaceId: actionSurfaceId,
        target: { kind: "explicit", node: actionNodeRef(target) }, args: { chooseFolder: true } });
    } else if (target) runNodeAction("node.open", target);
  };

  /** Build the node context menu at a viewport point, including host-aware file opening targets and node-specific graph actions. */
  const showNodeContextMenuAt = (node: PositionedNode, clientX: number, clientY: number, occurrenceId?: string): void => {
    touchDoubleTap.current.reset();
    const page = node.page;
    const persistent = persistentPageFor(page);
    const isCenter = node.role === "center" && page.path === neighborhood?.center.path;
    const isMarkdown = Boolean(persistent?.file?.extension === "md");
    const canExpand = canExpandCentralSections(persistent, activePath);
    const menu = new Menu();
    menu.addItem(/** Start/resume from the current center, independent of the clicked node. */ item => item
      .setTitle(translate("wander.fromCenter")).setIcon("shuffle")
      .onClick(/** All native entry points dispatch the same surface-owned action. */ () => void plugin.actionManager.dispatch({ id: "view.wander.start", source: "context-menu", surfaceId: actionSurfaceId })));
    menu.addSeparator();
    const capturedPage = actionNodeRef(page);
    const capturedPersistent = persistent ? actionNodeRef(persistent) : null;
    /** Preserve menu-launch native identity even when a canonical graph page mutates while open. */
    const runCapturedNodeAction = (id: ActionId, target: GraphPage): void => {
      const reference = target === page ? capturedPage : capturedPersistent;
      if (!reference) return;
      void plugin.actionManager.dispatch({ id, source: "context-menu", surfaceId: actionSurfaceId,
        target: { kind: "explicit", node: reference, occurrenceId: occurrenceId ?? sceneNodeKeys.get(node) } });
    };

    const persistentFile = persistent?.file;
    if (persistentFile && persistent && page.transient?.kind !== "section") {
      const openState = plugin.getFileOpenMenuState(persistentFile);
      addNativeSubmenu(menu, translate("graph.openMenu"), "external-link",
        /** Populate platform-supported destinations without replacing the owning context menu. */
        (openMenu) => {
        if (openState.focusOpenTab) {
          openMenu.addItem(/** Configure the existing-file action without creating a duplicate tab. */ (item) => item
            .setTitle(translate("graph.focusOpenTab"))
            .setIcon("scan-eye")
            .onClick(/** Reveal the selected file through native workspace focus. */ () => runCapturedNodeAction("node.open.focus-tab", persistent)));
        }
        openMenu.addItem(/** Configure an independent file tab on every form factor. */ (item) => item
          .setTitle(translate("graph.openNewTab"))
          .setIcon("file-plus-2")
          .onClick(/** Create a tab through the host instead of changing the graph center. */ () => runCapturedNodeAction("node.open.new-tab", persistent)));
        if (openState.adjacentPane) {
          openMenu.addItem(/** Configure a split destination anchored to this graph and its companion. */ (item) => item
            .setTitle(translate("graph.openAdjacentPane"))
            .setIcon("panel-right-open")
            .onClick(/** Preserve this Plex/Sidecar pair while opening the file outside it. */ () => runCapturedNodeAction("node.open.split", persistent)));
        }
        if (openState.popoutWindow) {
          openMenu.addItem(/** Configure the desktop-only native window destination. */ (item) => item
            .setTitle(translate("graph.openPopoutWindow"))
            .setIcon("external-link")
            .onClick(/** Delegate window creation and unavailable-host feedback. */ () => runCapturedNodeAction("node.open.window", persistent)));
        }
      });
      menu.addSeparator();
    }

    if (persistent?.url && page.transient?.kind !== "section") {
      addNativeSubmenu(menu, translate("graph.openMenu"), "external-link", (openMenu) => {
        openMenu.addItem((item) => item
          .setTitle(translate("graph.openBrowser"))
          .setIcon("globe")
          .onClick(() => runCapturedNodeAction("node.open.browser", persistent)));
        if (plugin.canOpenUrlInWebViewer()) {
          openMenu.addItem((item) => item
            .setTitle(translate("graph.openWebViewer"))
            .setIcon("panel-top-open")
            .onClick(() => runCapturedNodeAction("node.open.web-viewer", persistent)));
        }
      });
      menu.addSeparator();
    }

    if (persistent && !persistent.isFolder && !persistent.isTag && !persistent.url && page.transient?.kind !== "section") {
      menu.addItem((item) => item
        .setTitle(translate("graph.addNote"))
        .setIcon("file-plus-2")
        .onClick(() => runCapturedNodeAction("relationship.create-selected.child", persistent)));
    }

    if (isMarkdown && persistent && page.transient?.kind !== "section") {
      menu.addItem((item) => item
        .setTitle(translate("graph.setNoteType"))
        .setIcon("tags")
        .onClick(() => runCapturedNodeAction("node.note-type", persistent)));
    }

    if (persistent?.file && page.transient?.kind !== "section") {
      menu.addItem((item) => item
        .setTitle(translate("graph.renameNote"))
        .setIcon("pencil-line")
        .onClick(() => runCapturedNodeAction("node.rename", persistent)));
    }

    if (persistent && page.transient?.kind !== "section") {
      const pinned = plugin.isPinned(persistent.path);
      menu.addItem((item) => item
        .setTitle(translate(pinned ? "graph.unpinNote" : "graph.pinNote"))
        .setIcon(pinned ? "pin-off" : "pin")
        .onClick(() => runCapturedNodeAction("pin.toggle", persistent)));
    }

    if (persistent && !persistent.isFolder && !persistent.isTag && !persistent.url &&
        (!persistent.file || persistent.file.extension === "md") && page.transient?.kind !== "section") {
      menu.addSeparator();
      menu.addItem((item) => item
        .setTitle(translate(persistent.file ? "graph.deleteNote" : "graph.deletePlaceholder"))
        .setIcon("trash-2")
        .onClick(() => runCapturedNodeAction("node.delete", persistent)));
    }

    if (isCenter && isMarkdown && persistent && !page.transient && canExpand && !centralEditorAvailable) {
      menu.addSeparator();
      menu.addItem((item) => item
        .setTitle(translate(sectionExpanded ? "graph.collapseSections" : "graph.expandSections"))
        .setIcon(sectionExpanded ? "fold-vertical" : "unfold-vertical")
        .onClick(() => runCapturedNodeAction("sections.toggle", persistent)));
      if (sectionExpanded && sectionExpansion) {
        menu.addItem((item) => item
          .setTitle(translate("graph.foldAllSections"))
          .setIcon("list-tree")
          .onClick(() => runCapturedNodeAction("sections.fold-all", persistent)));
        menu.addItem((item) => item
          .setTitle(translate("graph.unfoldAllSections"))
          .setIcon("list-tree")
          .onClick(() => runCapturedNodeAction("sections.unfold-all", persistent)));
      }
    }

    if (page.transient?.kind === "section") {
      const section = sectionExpansion?.sections.find((candidate) => candidate.id === page.transient?.sectionId);
      menu.addItem((item) => item
        .setTitle(translate("graph.openSection"))
        .setIcon("heading")
        .onClick(() => void plugin.openSection(page)));
      if (section?.childIds.length) {
        menu.addSeparator();
        for (const [id, label, icon] of [
          ["section.toggle-level", expandedSectionIds.has(section.id) ? "graph.foldOneLevel" : "graph.unfoldOneLevel", expandedSectionIds.has(section.id) ? "square-minus" : "square-plus"],
          ["section.fold-descendants", "graph.foldAllDescendants", "fold-vertical"],
          ["section.unfold-descendants", "graph.unfoldAllDescendants", "unfold-vertical"],
        ] as const) menu.addItem(/** Native menus invoke the same current-section policy as local actions. */ item => item
          .setTitle(translate(label)).setIcon(icon).onClick(() => runCapturedNodeAction(id, page)));
      }
    }

    const doc = viewport.current?.ownerDocument ?? document;
    plugin.showKplexMenuAtPosition(menu, { x: clientX, y: clientY }, doc, hostLeaf);
  };

  /** Route node context gestures through the shared host-destination/action policy. */
  const showNodeContextMenu = (node: PositionedNode, event: MouseEvent<HTMLDivElement>): void => {
    if (Date.now() < suppressActivateUntil.current) return;
    showNodeContextMenuAt(node, event.clientX, event.clientY);
  };

  /** Show connection actions; absent Hidden configuration opens explicit setup rather than disabling the action. */
  const showEdgeContextMenuAt = (edge: PositionedEdge, clientX: number, clientY: number): void => {
    touchDoubleTap.current.reset();
    const menu = new Menu();
    const origin = scene.nodes.find(node => node.page.path === edge.sourcePath)?.page ?? index.get(edge.sourcePath);
    const target = scene.nodes.find(node => node.page.path === edge.targetPath)?.page ?? index.get(edge.targetPath);
    if (!origin || !target) return;
    for (const [id, key, icon] of [["relationship.details", "graph.connectionDetails", "list-tree"], ["relationship.unlink", "graph.unlinkConnection", "unlink"], ["relationship.hide", "hide.title", "eye-off"]] as const) {
      menu.addItem(/** Capture exact endpoints while native menus own arrow/Enter/Escape protocol. */ item => item
        .setTitle(translate(key)).setIcon(icon).onClick(() => void plugin.actionManager.dispatch({ id, source: "context-menu", surfaceId: actionSurfaceId,
          target: { kind: "edge", origin: actionNodeRef(origin), target: actionNodeRef(target), evidenceId: edge.id } })));
    }
    const doc = viewport.current?.ownerDocument ?? document;
    plugin.showKplexMenuAtPosition(menu, { x: clientX, y: clientY }, doc, hostLeaf);
  };

  /**
   * Preserve the rendered source while synchronously handing its payload to Obsidian. Regular
   * scene rows use the viewport's move authority; projected descendants use their own occurrence
   * token, so dropping them in this Plex adds a relation rather than moving their parent's edge.
   */
  const beginNativeNodeDrag = (page: GraphPage, role: Role | "center", label: string, event: DragEvent<HTMLDivElement>, occurrenceOwner?: object): void => {
    const owner = occurrenceOwner ?? viewport.current;
    if (!owner) { event.preventDefault(); return; }
    clearHoverIntent(true);
    nativeNodeDrag.current = startNodeLinkDrag(plugin.app, page, event.nativeEvent, owner, role, label, neighborhood.center.file?.path ?? "");
    if (!nativeNodeDrag.current) event.preventDefault();
  };

  /** Native completion/cancellation releases this view's token and suppresses compatibility activation. */
  const endNativeNodeDrag = (): void => {
    finishNodeLinkDrag(plugin.app, nativeNodeDrag.current);
    nativeNodeDrag.current = null;
    suppressActivateUntil.current = Date.now() + 220;
    setExternalDropZone(null);
    clearHoverIntent(true);
  };

  /** Render live counts only for viewport-intersecting regular rows with captured scene keys, retaining transient section gate ownership. */
  const renderNode = (baseNode: PositionedNode, displayNode: PositionedNode, hydrateCounts = true) => {
    const highlightedGates = new Set<GateSide>();
    for (const gate of ["top", "bottom", "left", "right"] as GateSide[]) {
      if (interaction.gates.has(gateKey(baseNode.page.path, gate))) highlightedGates.add(gate);
    }
    if (connectDrag?.originPath === baseNode.page.path) highlightedGates.add(connectDrag.gate);

    const lensNodeStyle = neighborhood ? graphLensNodeStyle(predicateEngine, index, paintLenses, {
      page: baseNode.page,
      label: baseNode.label,
      center: neighborhood.center,
      edge: baseNode.role === "center" ? undefined : {
        role: baseNode.role, relationType: baseNode.relationType, definition: baseNode.typeDefinition, linkDirection: baseNode.linkDirection,
        sourcePath: neighborhood.center.path, targetPath: baseNode.page.path,
      },
    }) : {};
    const countedDisplayNode = hydrateCounts ? projectNodeCounts(displayNode, index) : displayNode;
    // Layout counts are deliberately deferred placeholders. Reuse the center's actual render-time
    // coverage for autonomous readiness without querying counts/acquiring sources in timer polls.
    if (baseNode.role === "center") renderedCenterGates.current = { identity: baseNode.page.path, stats: countedDisplayNode.gateStats };
    let colorStyle = paintedNodeStyles.get(baseNode);
    if (!colorStyle) {colorStyle = currentNodeColorStyle(baseNode, paintSettings); paintedNodeStyles.set(baseNode, colorStyle);}
    const styledDisplayNode = { ...countedDisplayNode, style: { ...colorStyle, ...lensNodeStyle } };
    const gateCounts = filteredGateCounts?.isCurrent() ? filteredGateCounts.counts.get(baseNode.page.path) : undefined;
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
      key={sceneNodeKeys.get(baseNode)}
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
      keyboardId={sceneNodeKeys.get(baseNode)}
      keyboardSelected={keyboardSelection === sceneNodeKeys.get(baseNode)}
      highlighted={!connectDrag && (finding ? findNodePaths.has(baseNode.page.path) : interaction.nodePaths.has(baseNode.page.path))}
      dimmed={!connectDrag && !finding && hover !== null && !interaction.nodePaths.has(baseNode.page.path)}
      highlightedGates={highlightedGates}
      dragging={nodeDrag?.path === baseNode.page.path}
      flair={activeNodeFlair === baseNode.page.path}
      connectionState={connectionStateFor(baseNode)}
      onActivate={/** Capture the clicked occurrence before its semantic role changes. */ () => activateNode(baseNode.page, sceneNodeKeys.get(baseNode))}
      onOpen={(_, event) => openNode(baseNode.page, Boolean(Keymap.isModEvent(event.nativeEvent)))}
      nativeDraggable={canDragNodeLink(baseNode.page) && !hasCentralEditor}
      onNativeDragStart={/** Regular rows retain the viewport's same-view relink authority. */ (_, event) => beginNativeNodeDrag(baseNode.page, baseNode.role, baseNode.label, event)}
      onNativeDragEnd={endNativeNodeDrag}
      onHoverNode={(_, event) => { if (!connectDrag && !nodeDrag) scheduleHoverIntent({ kind: "node", path: baseNode.page.path }, event); }}
      onHoverGate={(_, gate, event) => { if (!connectDrag && !nodeDrag) scheduleHoverIntent({ kind: "gate", path: baseNode.page.path, gate }, event); }}
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
          onToggle: /** Pointer folding uses the same accepted occurrence as keyboard and native menus. */ () => runNodeAction("section.toggle-level", baseNode.page, sceneNodeKeys.get(baseNode)),
        };
      })() : (baseNode.role === "center" && !centralEditorAvailable && persistentPageFor(baseNode.page)?.file?.extension === "md" ? {
        hasChildren: true,
        expanded: sectionExpanded,
        hiddenDescendantCount: 0,
        expandedTitle: translate("graph.foldNoteSections"),
        foldedTitle: translate("graph.unfoldNoteSections"),
        onToggle: /** Center folding shares the catalog's current projection availability. */ () => runNodeAction("sections.toggle", baseNode.page, sceneNodeKeys.get(baseNode)),
      } : undefined)}
    />;
  };

  const standardNodes = scene.nodes.filter((node) => {
    const zone = zoneForRole(node.role);
    return !zone || !scene.zoneViewports[zone];
  });
  const draggedBaseNode = nodeDrag ? scene.nodes.find((node) => node.page.path === nodeDrag.path) ?? null : null;
  /**
   * Use the actual captured gate occurrence rather than a path-keyed layout copy. Overflow rows,
   * borders and custom gate sizes can change its painted position. Pointer capture leaves event
   * targets on the source, so only an owning-document hit test can choose the destination gate.
   */
  const connectionDragPath = (): string | null => {
    const drag = connectDrag, root = viewport.current;
    if (!drag || !root || !drag.sourceGateElement.isConnected || !root.contains(drag.sourceGateElement)) return null;
    const source = drag.sourceGateElement.getBoundingClientRect();
    const start = toWorld(source.left + source.width / 2, source.top + source.height / 2);
    const bounds = root.getBoundingClientRect();
    const clientX = bounds.left + camera.current.x + drag.current.x * camera.current.scale;
    const clientY = bounds.top + camera.current.y + drag.current.y * camera.current.scale;
    const hit = root.ownerDocument.elementFromPoint(clientX, clientY);
    const target = hit?.closest<HTMLElement>("[data-kplex-path]");
    const gateElement = hit?.closest<HTMLElement>("[data-kplex-gate]");
    const path = target?.dataset.kplexPath;
    const page = path ? index.get(path) : null;
    let end = drag.current, targetGate = oppositeGate(drag.gate);
    if (gateElement && root.contains(gateElement) && page && !page.isFolder && !page.isTag
      && page.path !== drag.originPath && !connectBlockedPaths.has(page.path)) {
      const gate = gateElement.dataset.kplexGate;
      if (gate === "top" || gate === "bottom" || gate === "left" || gate === "right") {
        const rect = gateElement.getBoundingClientRect();
        end = toWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
        targetGate = gate;
      }
    }
    return edgeGeometry(start, end, drag.gate, targetGate, settings.connectorStyle).d;
  };
  const dragPath = connectionDragPath();

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

  /** Render a projected descendant strip with its captured base-scene key, independently of mutable parent paths. */
  const renderExpandedCluster = (cluster: ExpandedCluster) => {
    const scrollable = cluster.contentHeight > cluster.viewportHeight + 0.5;
    return <div
      key={cluster.key}
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
            const maxChars = Math.min(22, effectiveLabelLimit(child.style.maxLabelLength ?? 30));
            const text = child.label.length > maxChars ? `${child.label.slice(0, Math.max(1, maxChars - 1))}…` : child.label;
            let current = paintedNodeStyles.get(child);
            if (!current) {
              current = currentNodeColorStyle({page: child.relation.page, role: "child", relationType: child.relation.relationType,
                typeDefinition: child.relation.typeDefinition, linkDirection: child.relation.linkDirection, style: child.style}, paintSettings);
              paintedNodeStyles.set(child, current);
            }
            const lensStyle = neighborhood ? graphLensNodeStyle(predicateEngine, index, paintLenses, {page: child.relation.page, label: child.label,
              center: neighborhood.center, edge: {role: child.relation.role, relationType: child.relation.relationType, definition: child.relation.typeDefinition,
                linkDirection: child.relation.linkDirection, sourcePath: cluster.parent.page.path, targetPath: child.relation.page.path}}) : {};
            const paint = nodePaint({...current, ...lensStyle}, nodePaintFallbacks({page: child.relation.page, role: "child", relationType: child.relation.relationType}));
            return <div
              key={child.key}
              className={`kplex-expanded-mini-thought${cluster.parent.role === "sibling" ? " is-sibling-descendant" : ""}${findNodePaths.has(child.relation.page.path) ? " is-find-match" : ""}${keyboardSelection === child.key ? " is-keyboard-selected" : ""}`}
              data-kplex-keyboard-id={child.key}
              aria-current={keyboardSelection === child.key ? "true" : undefined}
              aria-label={child.label}
              data-kplex-path={child.relation.page.path}
              draggable={canDragNodeLink(child.relation.page)}
              onDragStart={/** A descendant is an outbound endpoint, never authority to move its parent's relation. */ (event: DragEvent<HTMLDivElement>) => beginNativeNodeDrag(child.relation.page, "child", child.label, event, event.currentTarget)}
              onDragEnd={endNativeNodeDrag}
              style={{
                left: child.localX - child.width / 2,
                top: child.localY - child.height / 2,
                width: child.width,
                height: child.height,
                background: paint.background,
                color: paint.foreground,
                borderColor: paint.border,
                fontSize: 8 * (cluster.parent.role === "sibling" ? siblingScale(settings) : 1) * (settings.baseFontSize ?? 12.4) / 12.4,
              }}
              title={translate("graph.relatedNotePath", { label: child.label, path: child.relation.page.path })}
              onClick={(event: MouseEvent<HTMLDivElement>) => { event.stopPropagation(); activateNode(child.relation.page, child.key); }}
              onDoubleClick={/** Expanded placeholders share the ordinary node's explicit folder-selection gesture. */ (event: MouseEvent<HTMLDivElement>) => { event.stopPropagation(); openNode(child.relation.page, Boolean(Keymap.isModEvent(event.nativeEvent))); }}
              onContextMenu={/** Mini occurrences reuse the same captured native node menu policy. */ (event: MouseEvent<HTMLDivElement>) => {
                event.preventDefault(); event.stopPropagation(); runNodeAction("node.context-menu", child.relation.page, child.key);
              }}
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
  /** Report each scalar's inheritance separately from its effective displayed value. */
  const typographyHint = (field: keyof TypographyValues, help: string): string => {
    const customized = Object.keys(plugin.settings.typographyProfiles[typographyDevice] ?? {}).includes(field);
    return `${help} ${translate(customized ? "typography.customized" : "typography.inherited")}`;
  };

  /** Stage scalar values in the captured device record and debounce storage only; late saves never replay overrides after reset. */
  const changeTypography = (patch: Partial<TypographyValues>): void => {
    const draft = {};
    typographyDraft.current = draft;
    plugin.stageTypographyOverride(typographyDevice, patch);
    suppressLayoutMotionUntil.current = Date.now() + 800;
    suppressAutoFitUntil.current = Date.now() + 1200;
    sceneMotion.cancelAll();
    preserveCameraOnNextLayout.current = true;
    setLayoutRevision((revision) => revision + 1);
    if (typographySave.current) typographySave.current.window.clearTimeout(typographySave.current.id);
    const ownerWindow = viewport.current?.ownerDocument.defaultView ?? window;
    const id = ownerWindow.setTimeout(/** Persist latest live preferences once, including intervening reset or edits from another surface. */ () => {
      typographySave.current = null;
      void plugin.persistTypographySettings().then(/** Retire only a successfully saved exact input token; failed storage leaves the latest live edit available for retry. */ saved => {
        if (saved && typographyDraft.current === draft) typographyDraft.current = null;
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
      if (!original) return null;
      const nextRole = nodeDropRole(original, nodeDrag, clientX, clientY, hit);
      return nextRole !== currentRole ? nextRole : null;
    }
    const origin = connectDrag ? index.get(connectDrag.originPath) : undefined;
    if (!connectDrag || !origin || origin.isFolder || origin.isTag || origin.path !== neighborhood?.center.path) return null;
    const target = hit.closest<HTMLElement>("[data-kplex-path]");
    // The center's areas describe center relations, never a connection between two other nodes.
    if (target || hit.closest("[data-kplex-gate]")) return null;
    return semanticRoleForGate(connectDrag.gate);
  };
  const dropAreaZone = relationshipDropArea();
  const visibleAreaZone = resizingArea ?? areaHover?.zone ?? null;
  const visibleArea = visibleAreaZone ? scene.zoneAreas[visibleAreaZone] : undefined;
  const previewCenter = centralEditorPage && centralEditorNode ? centralEditorNode : scene.nodes.find((node) => node.role === "center");
  const previewArea = dropAreaZone === "center" && previewCenter
    ? { left: previewCenter.x - previewCenter.width / 2, top: previewCenter.y - previewCenter.height / 2, width: previewCenter.width, height: previewCenter.height }
    : dropAreaZone && dropAreaZone !== "center" ? scene.zoneAreas[dropAreaZone] : undefined;
  const centerPreviewPadding = dropAreaZone === "center" ? 4 : 0;

  const connectionSearchHint = effectiveActionBindings(plugin.settings.actionPreferences, "search.focus")
    .map(binding => formatActionBinding(binding, readObsidianPresentationEnvironment(viewport.current?.ownerDocument.defaultView ?? undefined), translate)).filter(Boolean).join(" / ");
  const connectionOrigin = keyboardConnect ? resolveActionPage(index, keyboardConnect) : null;

  return <div
    ref={viewport}
    className={`kplex-plex${finding ? " is-finding" : ""}${navigationOrigin === "follow" ? " is-following-document" : sceneTransitioning || pathChangedThisRender ? " is-scene-transitioning" : ""}${sectionExpanded ? " is-section-expanded" : ""}${centralEditorMaximized ? " is-central-editor-maximized" : ""}${Platform.isIosApp ? " is-ios" : ""}${areaSettingsMode ? " is-area-settings-mode" : ""}${areaHover?.edgeActive ? " is-area-resize-ready" : ""}${resizingArea ? " is-area-resizing" : ""}`}
    style={{
      background: alphaHexToCss(paintSettings.backgroundColor, NATIVE_CANVAS_FILL),
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
      if (!areaResizeDrag.current && event.pointerType !== "touch") areaOutline.current?.clear();
    }}
    onContextMenu={/** Bare Plex context uses the existing native menu owner; node/edge menus stop propagation themselves. */ (event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      const target = event.target as Element;
      if (target.closest("[data-kplex-path], .kplex-edge-hit, button, input, .kplex-central-editor-overlay") || Date.now() < suppressActivateUntil.current) return;
      const menu = createPlexContextMenu({ translate, zen: displayState.zen, fullscreen: displayState.fullscreen, fullscreenAvailable,
        runAction: /** Reuse the exact view-scoped action owner for playback and display modes. */ id => { void plugin.actionManager.dispatch({ id, source: "context-menu", surfaceId: actionSurfaceId }); },
        openSettings: /** Preserve the guarded native settings bridge. */ () => plugin.openSettings(),
        chooseBackground: /** The view owns this picker and closes it on migration/unmount. */ () => {
          const sourceScope = viewport.current; if (!sourceScope?.isConnected) return;
          const owner = plugin.captureAppearanceOwner();
          const opening = structuredClone({colorPreferences: plugin.settings.colorPreferences, baseNodeStyle: plugin.settings.baseNodeStyle,
            baseLinkStyle: plugin.settings.baseLinkStyle, backgroundColor: plugin.settings.backgroundColor});
          /** Stale source previews retain the opening theme without borrowing a later selection. */
          const current = (): Pick<typeof plugin.settings, "colorPreferences" | "baseNodeStyle" | "baseLinkStyle" | "backgroundColor"> => plugin.isAppearanceOwnerCurrent(owner) ? plugin.settings : opening;
          const dialog = new ColorSourceModal(plugin.app, {
            title: translate("actions.canvasBackground"), initial: plugin.settings.backgroundColor,
            sourceScope, translate, bindEditor: editor => plugin.bindAppearanceEditor(editor, owner), target: {kind: "canvas"},
            preferences: () => current().colorPreferences, nodeStyle: () => current().baseNodeStyle,
            linkStyle: () => current().baseLinkStyle, background: () => current().backgroundColor,
            subscribeCss: changed => { const ref = plugin.app.workspace.on("css-change", changed); return () => plugin.app.workspace.offref(ref); },
            subscribeColors: changed => subscribeAppearanceSources(listener => plugin.index.subscribePresentation(listener), () => plugin.settings, changed),
            onSave: async color => plugin.updateStyleSettings(draft => {
              if (color && typeof color !== "string" && color.kind === "palette" && !draft.colorPreferences.palette.some(pair => pair.id === color.id)) throw new Error("Named color no longer exists");
              draft.backgroundColor = color; draft.standardStyleDefaults = "native";
            }, owner),
            onClosed: () => { graphDialogs.current.delete(dialog); },
          });
          graphDialogs.current.add(dialog); dialog.open();
        },
        reportBug: /** Start the existing clipboard-first support flow before any async dispatch. */ () => plugin.reportBug(viewport.current ?? undefined, actionSurfaceId),
      });
      plugin.showKplexMenuAtMouseEvent(menu, event.nativeEvent, hostLeaf);
    }}
  >
    {keyboardConnect && <div className="kplex-find kplex-connection-session" role="status">
      <span><strong>{translate("actions.connectFrom", { origin: connectionOrigin ? index.titleFor(connectionOrigin) : keyboardConnect.path })}</strong> · {connectionSearchHint
        ? translate("actions.connectHint", { submit: "Enter", search: connectionSearchHint, cancel: "Escape" })
        : translate("actions.connectHintNoSearch", { submit: "Enter", cancel: "Escape" })}</span>
      <button type="button" aria-label={translate("common.cancel")} onClick={/** Cancel only this captured visible-target session. */ () => { keyboardConnectRef.current = null; setKeyboardConnect(null); plugin.actionManager.closeSession(visibleConnectSession); }}><ObsidianIcon name="x" size={15} /></button>
    </div>}
    <span className="kplex-keyboard-announcement" aria-live="polite" aria-atomic="true">{keyboardSelection
      ? translate("hotkeys.selection", { label: keyboardNodes.find(node => node.id === keyboardSelection)?.label ?? "" }) : ""}</span>
    <PlexTypeSelectionStatus query={typeSelection.query} count={typeSelection.count} index={typeSelection.index} translate={translate} />
    {relationshipUpdating && <div className="kplex-relationship-updating" aria-live="polite" aria-busy="true"><ObsidianIcon name="loader-circle" size={16} /><span>{translate("graph.updatingRelationship")}</span></div>}
    <PlexFind query={findQuery} focusRequest={findFocusRequest} visible={!centralEditorMaximized && !displayState.zen}
      includePath={findIncludePath} onIncludePathChange={/** A new vocabulary starts its own reveal cycle. */ (includePath) => { setFindIncludePath(includePath); setFindCursor(0); }}
      pathIcon={<ObsidianIcon name="folder-kanban" size={15} />} pathLabel={translate("find.includePath")}
      onApplyFilter={onApplyFindFilter} filterIcon={<ObsidianIcon name="list-filter" size={15} />} filterLabel={translate("find.applyFilter")}
      appliedFilterQuery={appliedFindFilterQuery} onClearFilter={onClearFindFilter}
      onChange={/** Start a fresh cycle for each edited term. */ (query) => { setFindQuery(query); setFindCursor(0); }}
      onNext={/** Cycle in either direction without global navigation. */ (backward) => setFindCursor((cursor) => cursor + (backward ? -1 : 1))}
      icon={<ObsidianIcon name="search" size={15} />} closeIcon={<ObsidianIcon name="x" size={14} />}
      label={translate("find.ariaLabel")} placeholder={translate("find.placeholder")} closeLabel={translate("find.close")}
      matchLabel={translate("find.matches", { count: findPaths.length })} />
    <svg ref={compassElement} className="kplex-compass-background" aria-hidden="true" focusable="false">
      {COMPASS_DIRECTIONS.map(/** Keep four stable decoration nodes; React never owns their animated points. */ direction => <polygon key={direction} points="" fill={colorValueCss(paintSettings.colorPreferences.compass.fills[direction],
        colorValueCss({kind: "theme", variable: COMPASS_COLOR_VARIABLES[direction]}, semanticColorCss(COMPASS_SEMANTIC_SLOTS[direction])))} />)}
    </svg>
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
        {paintedEdges.map((edge) => <Edge
          key={edge.id}
          edge={edge}
          nodes={renderedNodeMap}
          inverseArrowDirection={settings.inverseArrowDirection}
          connectorStyle={settings.connectorStyle}
          labelBackground={NATIVE_LINK_LABEL_FILL}
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
        "--kplex-editor-camera-scale": camera.current.scale,
      } as CSSProperties}
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

    <LayoutControls width={viewportSize.width} height={viewportSize.height} expanded={layoutControlsOpen} toggle={
      <button type="button" className="kplex-icon-button kplex-layout-toggle" aria-label={translate("graph.configureLayout")}
        aria-expanded={layoutControlsOpen} aria-pressed={layoutControlsOpen}
        onClick={/** Keep configuration local to this view; hidden sliders are unmounted. */ () => void plugin.actionManager.dispatch({ id: "view.layout-controls", source: "toolbar", surfaceId: actionSurfaceId })}>
        <ObsidianIcon name="sliders-horizontal" size={16} />
      </button>
      }>
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
      <div className="kplex-typography-group">
      <div className="kplex-typography-scope">
        <span>{translate("typography.scopeHint", { device: translate(`typography.${typographyDevice}`),
          state: translate(TYPOGRAPHY_FIELDS.some(/** A value equal to the shared default still counts as explicit customization. */ field => Object.prototype.hasOwnProperty.call(plugin.settings.typographyProfiles[typographyDevice] ?? {}, field)) ? "typography.customizedShort" : "typography.inheritedShort") })}</span>
        <button aria-label={translate("typography.resetAll")} onClick={/** Reset invalidates only device values; pending storage can never resurrect a prior input. */ () => {
          if (typographySave.current) typographySave.current.window.clearTimeout(typographySave.current.id);
          typographySave.current = null; typographyDraft.current = null;
          suppressLayoutMotionUntil.current = Date.now() + 800;
          suppressAutoFitUntil.current = Date.now() + 1200;
          sceneMotion.cancelAll(); preserveCameraOnNextLayout.current = true;
          void plugin.resetTypographyOverride(typographyDevice);
        }}><ObsidianIcon name="rotate-ccw" size={11} /></button>
      </div>
      <div className="kplex-typography-controls">
        <div className="kplex-density-axes">
        <LayoutSlider label={translate("graph.baseFontSize")} caption={translate("graph.baseFontSizeShort")}
          hint={typographyHint("baseFontSize", translate("settings.ui.base.font.size.help"))} icon={<ObsidianIcon name="type" size={11} />}
          value={settings.baseFontSize} displayValue={settings.baseFontSize.toFixed(1)} min={TYPOGRAPHY_LIMITS.baseFontSize.min} max={TYPOGRAPHY_LIMITS.baseFontSize.max} step={TYPOGRAPHY_LIMITS.baseFontSize.step}
          onChange={/** Scale this device typography while keeping style proportions. */ (value) => changeTypography({ baseFontSize: value })} />
        <LayoutSlider label={translate("settings.ui.max.label.length")} caption={translate("typography.labelLengthShort")}
          hint={typographyHint("maxLabelLength", translate("settings.ui.max.label.length.help"))} icon={<ObsidianIcon name="text" size={11} />}
          value={settings.baseNodeStyle.maxLabelLength ?? 30} displayValue={String(settings.baseNodeStyle.maxLabelLength ?? 30)}
          min={TYPOGRAPHY_LIMITS.maxLabelLength.min} max={TYPOGRAPHY_LIMITS.maxLabelLength.max} step={TYPOGRAPHY_LIMITS.maxLabelLength.step}
          onChange={/** Change the device character budget independently of either density axis. */ value => changeTypography({ maxLabelLength: value })} />
        <LayoutSlider label={translate("settings.ui.maximum.node.width")} caption={translate("graph.maximumNodeWidthShort")}
          hint={typographyHint("maxWidth", translate("typography.deviceWidthHelp"))} icon={<ObsidianIcon name="between-horizontal-start" size={11} />}
          value={settings.baseNodeStyle.maxWidth ?? 286} displayValue={String(settings.baseNodeStyle.maxWidth ?? 286)} min={TYPOGRAPHY_LIMITS.maxWidth.min} max={TYPOGRAPHY_LIMITS.maxWidth.max} step={TYPOGRAPHY_LIMITS.maxWidth.step}
          onChange={/** Override this device regular-node width before explicit style precedence. */ (value) => changeTypography({ maxWidth: value })} />
        </div>
        <label className="kplex-density-control kplex-wrap-label-control" aria-label={typographyHint("wrapNodeLabels", translate("settings.ui.wrap.node.labels.help"))} data-kplex-control-tooltip>
          <input type="checkbox" checked={settings.wrapNodeLabels} aria-label={translate("settings.ui.wrap.node.labels")}
            onChange={/** Set this device fixed two-line label setting. */ (event) => changeTypography({ wrapNodeLabels: event.currentTarget.checked })} />
          <span className="kplex-wrap-label-caption">{translate("settings.ui.wrap.node.labels")}</span>
        </label>
      </div>
      </div>
    </LayoutControls>

    <div className="kplex-zoom-controls">
      <button aria-label={translate("graph.zoomIn")} onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); void plugin.actionManager.dispatch({ id: "view.zoom-in", source: "toolbar", surfaceId: actionSurfaceId }); }}><ObsidianIcon name="zoom-in" size={16} /></button>
      <button aria-label={translate("graph.zoomOut")} onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); void plugin.actionManager.dispatch({ id: "view.zoom-out", source: "toolbar", surfaceId: actionSurfaceId }); }}><ObsidianIcon name="zoom-out" size={16} /></button>
      <button aria-label={translate("graph.fitGraph")} onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); void plugin.actionManager.dispatch({ id: "view.fit", source: "toolbar", surfaceId: actionSurfaceId }); }}><ObsidianIcon name="focus" size={16} /></button>
      {fullscreenAvailable && <button type="button" data-kplex-display-control="fullscreen" aria-pressed={displayState.fullscreen} aria-label={translate(displayState.fullscreen ? "actions.exitFullscreen" : "actions.enterFullscreen")} onClick={/** Dispatch the view-owned fullscreen action through the unified manager. */ event => { event.stopPropagation(); void plugin.actionManager.dispatch({ id: "view.fullscreen.toggle", source: "toolbar", surfaceId: actionSurfaceId }); }}><ObsidianIcon name={displayState.fullscreen ? "minimize" : "maximize"} size={16} /></button>}
      <button type="button" data-kplex-display-control="zen" aria-pressed={displayState.zen} aria-label={translate(displayState.zen ? "actions.exitZen" : "actions.enterZen")} onClick={/** Zen remains independent from native viewport coverage. */ event => { event.stopPropagation(); void plugin.actionManager.dispatch({ id: "view.zen.toggle", source: "toolbar", surfaceId: actionSurfaceId }); }}><ObsidianIcon name={displayState.zen ? "shrink" : "expand"} size={16} /></button>
    </div>
  </div>;
}
