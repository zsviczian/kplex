/**
 * Legacy host graph and Plex presentation contracts shared by index binding and rendering. Semantic
 * flags delegate to the portable graph owner; host file references and display facets stay here.
 * Gate coverage may be partial: omitted completeness preserves complete callers, while false marks
 * available counts as lower bounds without granting relationship authority.
 */
import type { TFile } from "obsidian";
import type { ColorValue } from "./core/contracts/colorValue";
import { LinkDirection, RelationType, type Role, type RelationshipRole, type SemanticRelation } from "./core/graph/relations";

export { LinkDirection, RelationType };
export type { Role, RelationshipRole };

export type GateRole = "parent" | "child" | "left" | "right";
export type GateSide = "top" | "bottom" | "left" | "right";
export type ScrollZone = "parent" | "child" | "left" | "right" | "sibling";
export type StrokeStyle = "solid" | "dashed" | "dotted";
export type FillStyle = "solid" | "hachure" | "cross-hatch";
export type Arrowhead = "none" | "arrow" | "bar" | "dot" | "triangle";

export type Hierarchy = {
  hidden: string[];
  parents: string[];
  children: string[];
  leftFriends: string[];
  rightFriends: string[];
  previous: string[];
  next: string[];
  exclusions: string[];
  friends?: string[];
};

export type NodeStyle = {
  prefix?: string;
  icon?: string;
  backgroundColor?: ColorValue;
  fillStyle?: FillStyle;
  textColor?: ColorValue;
  borderColor?: ColorValue;
  fontSize?: number;
  fontFamily?: number;
  maxLabelLength?: number;
  maxWidth?: number;
  roughness?: number;
  strokeShaprness?: "round" | "sharp";
  strokeWidth?: number;
  strokeStyle?: StrokeStyle;
  padding?: number;
  gateRadius?: number;
  gateOffset?: number;
  gateStrokeColor?: ColorValue;
  gateBackgroundColor?: ColorValue;
  gateFillStyle?: FillStyle;
  embedWidth?: number;
  embedHeight?: number;
};

export type LinkStyle = {
  strokeColor?: ColorValue;
  strokeWidth?: number;
  strokeStyle?: StrokeStyle;
  roughness?: number;
  startArrowHead?: Arrowhead;
  endArrowHead?: Arrowhead;
  showLabel?: boolean;
  fontSize?: number;
  fontFamily?: number;
  textColor?: ColorValue;
};

export type Relation = SemanticRelation<GraphPage>;

export type GraphPage = {
  path: string;
  file: TFile | null;
  name: string;
  url: string | null;
  isFolder: boolean;
  isTag: boolean;
  mtime: number | null;
  neighbours: Map<string, Relation>;
  aliases: string[];
  tags: string[];
  noteType: string | null;
  primaryStyleTag: string | null;
  styleTags: string[];
  maxLabelLength: number;
  /** Runtime-only visual identity for section expansion and relation groups. Never persisted in GraphIndex. */
  transient?: {
    kind: "section" | "section-target" | "group";
    sourcePath: string;
    actualPath?: string;
    sectionId: string;
    /** Runtime-only relation bucket; never serialized or treated as a native endpoint. */
    groupMembers?: readonly Neighbour[];
    heading?: string;
    level?: number;
    subpath?: string;
    line?: number;
    start?: number;
    end?: number;
  };
};

export type Neighbour = {
  page: GraphPage;
  relationType: RelationType;
  typeDefinition?: string;
  linkDirection: LinkDirection | null;
  role: Role;
};

export type Neighborhood = {
  center: GraphPage;
  parents: Neighbour[];
  children: Neighbour[];
  leftFriends: Neighbour[];
  rightFriends: Neighbour[];
  siblings: Neighbour[];
};

export type GateStat = {
  /** Available connections after visibility/inferred filters, before a local Plex filter/lens. */
  visibleCount: number;
  /** False means global semantic coverage is uncertified. With local coverage, numbers still count
   * all available host/indexed incidence; otherwise they are lower bounds. Never grants editing authority. */
  complete?: boolean;
  /** Local counts cover available host/indexed incidence; cached counts describe the last coherent
   * snapshot awaiting current validation. Neither grants current/global negative-evidence authority. */
  coverage?: "local" | "cached";
  /** Current host inputs failed a decode/record guard or are missing; no numerical total is asserted. */
  countUnavailable?: boolean;
  /** Connections surviving the currently active Quick Filter / Graph Lenses. Undefined when no global filter is active. */
  shownCount?: number;
  /** True when an available semantic relationship occupies the gate, even if its target is filtered out. */
  hasAny: boolean;
};

export type GateStats = Record<GateSide, GateStat>;


export type NodeVisual = {
  /** Small preview before the node label, or an image-only node. */
  mode: "thumbnail" | "replace";
  src: string;
  path: string;
  alt: string;
};

export type PositionedNode = {
  /** Selected cached document fields, measured before layout; never part of semantic state. */
  propertyLines?: readonly import("./core/plex/nodeProperties").NodePropertyLine[];
  /** Shared measured decoration, with no semantic gate/drop authority. */
  viewBadge?: Readonly<{label: string; description?: string; background?: import("./core/contracts/colorValue").ColorValue;
    width: number; height: number; fontSize: number; presentation?: "category" | "status"}>;
  viewDescription?: string;
  /** Independent visual occurrence; canonical page identity remains the action/write target. */
  occurrenceId?: string;
  areaId?: string;
  representation?: "thought" | "point";
  physicalPorts?: Partial<Record<GateSide, GateRole>>;
  /** Presentation-only aggregate from the bounded view reader, independent of the port's default creation role. */
  /** Display-only canonical count hydration; projection incidence never grants write authority. */
  peerPort?: import("./core/plex/views/contracts").PlexOccurrence["peerPort"] & {
    shownCount?: number; hasAny?: boolean; coverage?: GateStat["coverage"]; countUnavailable?: boolean;
  };
  /** Canonical source of this occurrence's primary real relationship, independent of current attention. */
  semanticSourceId?: string;
  branch?: import("./core/plex/views/contracts").PlexBranch;
  /** Shared touch disclosure clearance, independent of the note body and canonical gates. */
  controlReserve?: Readonly<{right: number; bottom: number}>;
  page: GraphPage;
  role: Role | "center";
  relationType?: RelationType;
  typeDefinition?: string;
  linkDirection?: LinkDirection | null;
  x: number;
  y: number;
  width: number;
  height: number;
  style: NodeStyle;
  label: string;
  neighbourCount: number;
  gateStats: GateStats;
};

export type PositionedEdge = {
  kind?: "semantic" | "derived" | "decorative";
  sourceOccurrence?: string;
  targetOccurrence?: string;
  /** Measured sub-node geometry only; canonical occurrence/path/edit endpoints stay unchanged. */
  sourceSectionOccurrence?: string;
  sourcePort?: GateSide;
  targetPort?: GateSide;
  /** Display-only directional wording; physical typeDefinition remains the style/filter/mutation key. */
  caption?: string;
  id: string;
  sourcePath: string;
  targetPath: string;
  /** Optional provenance pair when a visible edge projects/aggregates evidence from another transient source. */
  explanationSourcePath?: string;
  explanationTargetPath?: string;
  role: Role;
  relationType: RelationType;
  typeDefinition?: string;
  direction: LinkDirection | null;
  style: LinkStyle;
  /** True when this relationship connects two visible non-central nodes. */
  isCrossLink?: boolean;
};
