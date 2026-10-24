/** Internal scene-policy boundary. Definitions receive revision-scoped facts and measurements, never a host/index. */
import type {GraphNodeView, NodeId} from "../../graph/model";
import type {EvidenceDecision, RelationEvidence} from "../../graph/evidence";
import type {RelationshipExplanation} from "../../graph/resolver";
import type {LinkDirection, RelationType, Role} from "../../graph/relations";
import type {PlexViewConfiguration, PlexViewConfigurationSchema} from "./configuration";

export type OccurrenceId = string;
export type AreaId = string;
export type PhysicalPort = "top" | "bottom" | "left" | "right";
export type ViewPoint = Readonly<{x: number; y: number}>;
export type ViewRect = ViewPoint & Readonly<{width: number; height: number}>;
export type ViewCoverage = "local" | "cached" | "unavailable";
export type PlexViewRelation = Readonly<{
  node: GraphNodeView; role: Role; relationType: RelationType; definition?: string; direction: LinkDirection | null;
}>;
export type PlexRelationRead = Readonly<{items: readonly PlexViewRelation[]; coverage: ViewCoverage; truncated: boolean}>;
export type PlexEvidenceRead = Readonly<{coverage: ViewCoverage; value: Readonly<{
  source: NodeId; target: NodeId; hidden: boolean; summary: RelationshipExplanation["summary"];
  roles: readonly Readonly<RelationshipExplanation["resolvedRoles"][number]>[];
  decisions: readonly Readonly<{evidence: Readonly<RelationEvidence>; active: boolean; suppressionReason?: EvidenceDecision["suppressionReason"]}>[];
}> | null}>;
export type PlexViewRead = Readonly<{
  /** Current local incidence is independent of corpus/property completeness. Reads never acquire sources. */
  coverage: ViewCoverage; isCurrent: () => boolean;
  node: (id: NodeId) => GraphNodeView | null;
  relations: (id: NodeId, role: Role) => PlexRelationRead;
  evidence: (source: NodeId, target: NodeId) => PlexEvidenceRead;
  compare: (left: GraphNodeView, right: GraphNodeView) => number;
  /** Unsupported corpus reads stay unavailable; an empty catalogue must never certify unlinked notes. */
  corpus: {available: false; reason: "unsupported"};
}>;
export type PlexOccurrence = Readonly<{
  id: OccurrenceId; areaId?: AreaId;
  /** Point rendering is reserved; the current host rejects it explicitly rather than rendering a detailed card. */
  representation: "thought" | "point";
  /** Optional semantic context for existing styles/lenses. It does not determine physical placement. */
  role?: Role; relation?: PlexViewRelation;
  groupingPartition?: string;
  ports?: Partial<Record<PhysicalPort, "parent" | "child" | "left" | "right">>;
} & ({nodeId: NodeId; synthetic?: never} | {nodeId?: never; synthetic: {kind: "group"; members: readonly OccurrenceId[]}})>;
export type PlexViewEdge = Readonly<{
  id: string; source: OccurrenceId; target: OccurrenceId; sourcePort: PhysicalPort; targetPort: PhysicalPort;
} & ({kind: "semantic"; sourceNode: NodeId; targetNode: NodeId; relation: PlexViewRelation}
  | {kind: "derived" | "decorative"; evidence?: readonly {sourceNode: NodeId; targetNode: NodeId; relation: PlexViewRelation}[]})>;
export type PlexProjection = Readonly<{
  attention: NodeId; layoutRoot?: NodeId; entry: OccurrenceId; editor?: OccurrenceId; frame?: OccurrenceId;
  occurrences: readonly PlexOccurrence[]; edges: readonly PlexViewEdge[]; truncated: boolean; coverage: ViewCoverage;
}>;
export type PlexMeasurement = Readonly<{
  id: OccurrenceId; width: number; height: number; expandedWidth: number; expandedReserve: number;
  mini: {width: number; viewportHeight: number; topGap: number} | null;
  envelope: {width: number; viewportHeight: number; topGap: number} | null;
}>;
export type PlexArea = Readonly<{
  id: AreaId; labelKey: string; bounds: ViewRect; resizeEdge?: "top" | "bottom";
  heightPreference?: {key: string; minimum: number; maximum: number};
  viewport?: ViewRect & {contentTop: number; contentHeight: number; initialScrollTop: number};
  /** Physical area action is explicit; arbitrary areas have no relationship-write meaning by default. */
  dropRole?: "parent" | "child" | "left" | "right";
  reflow?: Readonly<{columns: number; columnGap: number; rowGap: number; paddingTop?: number; paddingBottom?: number}>;
}>;
export type PlexViewLayout = Readonly<{
  positions: ReadonlyMap<OccurrenceId, ViewRect>; areas: readonly PlexArea[];
}>;
export type PlexViewInput = Readonly<{
  attention: NodeId; read: PlexViewRead; maximum: number; state: unknown;
  /** Type-wide configuration is separate from native-session state. */
  configuration?: PlexViewConfiguration;
}>;
export interface PlexViewDefinition {
  readonly id: string;
  readonly version: 1;
  readonly labelKey: string;
  readonly icon: string;
  readonly capabilities: Readonly<{sections: boolean; descendants: boolean; editor: boolean; compact: boolean}>;
  readonly defaultState: unknown;
  readonly configuration?: PlexViewConfigurationSchema;
  /** Validate only this view's small session state; shared/native settings are not supplied. */
  restoreState(value: unknown): unknown;
  /** Material preparation is host-owned and bounded; pure projection consumes admitted facts only. */
  project(input: PlexViewInput): PlexProjection | null;
  /** Layout has no source reader, scheduling or subscription capability. */
  layout(projection: PlexProjection, measurements: readonly PlexMeasurement[], preferences: unknown, editor: boolean,
    context?: Readonly<{areaHeights: Readonly<Record<string, number>>; configuration?: PlexViewConfiguration}>): PlexViewLayout;
}
