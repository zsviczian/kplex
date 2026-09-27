import type { TFile } from "obsidian";
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
  backgroundColor?: string;
  fillStyle?: FillStyle;
  textColor?: string;
  borderColor?: string;
  fontSize?: number;
  fontFamily?: number;
  maxLabelLength?: number;
  roughness?: number;
  strokeShaprness?: "round" | "sharp";
  strokeWidth?: number;
  strokeStyle?: StrokeStyle;
  padding?: number;
  gateRadius?: number;
  gateOffset?: number;
  gateStrokeColor?: string;
  gateBackgroundColor?: string;
  gateFillStyle?: FillStyle;
  embedWidth?: number;
  embedHeight?: number;
};

export type LinkStyle = {
  strokeColor?: string;
  strokeWidth?: number;
  strokeStyle?: StrokeStyle;
  roughness?: number;
  startArrowHead?: Arrowhead;
  endArrowHead?: Arrowhead;
  showLabel?: boolean;
  fontSize?: number;
  fontFamily?: number;
  textColor?: string;
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
  /** Runtime-only visual identity used by central-section expansion. Never persisted in GraphIndex. */
  transient?: {
    kind: "section" | "section-target";
    sourcePath: string;
    actualPath?: string;
    sectionId: string;
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
  /** Connections currently visible after K-Plex visibility/inferred filters, before a local Plex filter/lens. */
  visibleCount: number;
  /** Connections surviving the currently active Quick Filter / Graph Lenses. Undefined when no global filter is active. */
  shownCount?: number;
  /** True when the semantic gate has any relationship, even when its target is filtered out. */
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
