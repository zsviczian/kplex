/** Internal scene-policy boundary. Definitions receive revision-scoped facts and measurements, never a host/index. */
import type {GraphNodeView, NodeId} from "../../graph/model";
import type {EvidenceDecision, RelationEvidence} from "../../graph/evidence";
import type {RelationshipExplanation} from "../../graph/resolver";
import type {LinkDirection, RelationType, Role} from "../../graph/relations";
import type {PlexViewConfiguration, PlexViewConfigurationSchema} from "./configuration";
import type {NotePropertyAvailability, NotePropertyRead} from "../noteProperties";
import type {ColorValue} from "../../contracts/colorValue";
import type {PlexPropertyAssignment} from "./propertyAssignment";
import type {PlexSectionRef, PlexSectionRead} from "./sections";
import type {AreaBandShape} from "../../contracts/areaGeometry";

/** Policy API compatibility, independent of configuration and session payload schema versions. */
export const CANVAS_VIEW_API_VERSION = 1 as const;
/** Literal user/extension copy never passes through the host catalog lookup. */
export type CanvasViewText = Readonly<{literal: string} | {key: string}>;
/** A measured presentation badge, with no gate/edge/drop or note mutation authority. */
export type PlexNodeBadge = Readonly<{label: CanvasViewText; description?: CanvasViewText; background?: ColorValue;
  /** Omission preserves the colored category chip. Status uses shared compact text below the card. */
  presentation?: "category" | "status"}>;
export type PlexViewStateAction = Readonly<{id: string; args?: unknown}>;
export type PlexViewStateResult = Readonly<{status: "updated"; state: unknown}
  | {status: "unavailable"; reason?: CanvasViewText}>;

export type OccurrenceId = string;
export type AreaId = string;
export type PhysicalPort = "top" | "bottom" | "left" | "right";
export type ViewPoint = Readonly<{x: number; y: number}>;
export type ViewRect = ViewPoint & Readonly<{width: number; height: number}>;
/** Area meaning is explicit and independent of scroll/resize or decorative presentation. */
export type PlexDropMeaning = Readonly<{kind: "navigation"} | {kind: "relationship"; role: "parent" | "child" | "left" | "right"; origin?: OccurrenceId}
  | {kind: "property"; assignmentId: string} | {kind: "none"}>;
export type ViewCoverage = "local" | "cached" | "unavailable";
/** Owning a frontier lease is distinct from prepared local incidence and certified complete incidence. */
export type PlexViewScopeRead = Readonly<{coverage: ViewCoverage; prepared: boolean; complete: boolean; pending: boolean}>;
export type PlexBranch = Readonly<{parent?: OccurrenceId; depth: number; side: -1 | 1; expanded: boolean;
  canExpand: boolean; reference: boolean; status: "ready" | "loading" | "partial" | "unavailable" | "limited"}>;
export type PlexBranchAction = Readonly<{kind: "toggle"; occurrenceId: OccurrenceId} | {kind: "expand-generation" | "collapse-generation"}>;
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
  relations: (id: NodeId, role: Role, maximum?: number) => PlexRelationRead;
  /** Exact cached pair, used to retain a live occurrence path outside a truncated display prefix. Never acquires sources. */
  relation?: (source: NodeId, target: NodeId, role: Role) => PlexRelationRead;
  /** Optional cache-only per-node proof. Absence cannot certify a leaf or start preparation. */
  scope?: (id: NodeId) => PlexViewScopeRead;
  evidence: (source: NodeId, target: NodeId) => PlexEvidenceRead;
  compare: (left: GraphNodeView, right: GraphNodeView) => number;
  /** Optional admitted-node metadata capability; no enumeration, body reads or acquisition. */
  properties?: Readonly<{availability: (id: NodeId) => NotePropertyAvailability; read: (id: NodeId, field: string) => NotePropertyRead}>;
  /** Unsupported corpus reads stay unavailable; an empty catalogue must never certify unlinked notes. */
  corpus: {available: false; reason: "unsupported"};
}>;
export type PlexOccurrence = Readonly<{
  id: OccurrenceId; areaId?: AreaId;
  badge?: PlexNodeBadge;
  /** Accessible presentation explanation, separate from the semantic node label. */
  description?: CanvasViewText;
  /** Point rendering is reserved; the current host rejects it explicitly rather than rendering a detailed card. */
  representation: "thought" | "point";
  /** Optional semantic context for existing styles/lenses. It does not determine physical placement. */
  role?: Role; relation?: PlexViewRelation;
  groupingPartition?: string;
  /** A measured transient row of one explicit document; it is never an editor or another note. */
  section?: PlexSectionRef;
  /** Explicit occurrence hierarchy; canonical child semantics remain in real edge references. */
  branch?: PlexBranch;
  ports?: Partial<Record<PhysicalPort, "parent" | "child" | "left" | "right">>;
  /** Bounded available peer incidence shares one physical port; its lower-bound count never grants relation-edit authority. */
  peerPort?: Readonly<{side: PhysicalPort; count: number; complete: boolean}>;
} & ({nodeId: NodeId; synthetic?: never} | {nodeId?: never; synthetic: {kind: "group"; members: readonly OccurrenceId[]}})>;
export type PlexViewEdge = Readonly<{
  id: string; source: OccurrenceId; target: OccurrenceId; sourcePort: PhysicalPort; targetPort: PhysicalPort;
  /** Physical sub-node attachment only; canonical occurrence/evidence endpoints stay intact. */
  sourceSection?: PlexSectionRef;
} & ({kind: "semantic"; sourceNode: NodeId; targetNode: NodeId; relation: PlexViewRelation}
  | {kind: "derived" | "decorative"; evidence?: readonly {sourceNode: NodeId; targetNode: NodeId; relation: PlexViewRelation}[]})>;
export type PlexProjection = Readonly<{
  attention: NodeId; layoutRoot?: NodeId; root?: OccurrenceId; entry: OccurrenceId; editor?: OccurrenceId; frame?: OccurrenceId;
  occurrences: readonly PlexOccurrence[]; edges: readonly PlexViewEdge[]; truncated: boolean; coverage: ViewCoverage;
  /** View-scoped note presentation; logical ports/evidence remain intact. Decorative guides are unchanged. */
  connectionPresentation?: "node-centers";
  /** Undefined inherits normal host presentation; null or an empty literal explicitly hides it. */
  heading?: CanvasViewText | null;
  /** Recoverable presentation status, independent of note/relationship semantics. */
  status?: CanvasViewText;
  /** Only an opt-in hierarchy may request bounded, actually represented parent scopes outside projection/layout. */
  preparation?: Readonly<{parents: readonly NodeId[]}>;
  /** Bounded plain session intent (e.g. stable branch sides); the existing session validates and commits it. */
  stateSuggestion?: unknown;
}>;
export type PlexMeasurement = Readonly<{
  id: OccurrenceId; width: number; height: number; expandedWidth: number; expandedReserve: number;
  /** Optional shared control footprint outside the thought body. Opt-in layouts reserve these
   * extents for hit-testing without enlarging the label/editor rectangle or semantic ports. */
  controlReserve?: Readonly<{right: number; bottom: number}>;
  badge?: Readonly<{width: number; height: number; presentation?: "category" | "status"}>;
  /** Only this occurrence has a bound expanded editor; the legacy layout boolean does not describe it. */
  editor?: true;
  mini: {width: number; viewportHeight: number; topGap: number} | null;
  envelope: {width: number; viewportHeight: number; topGap: number} | null;
}>;
/** A bounded canvas-owned dimension. Optional value describes the editable dimension when
 * an area's frame is larger than its usable band thickness or other measured content. */
export type PlexAreaDimension = Readonly<{key: string; minimum: number; maximum: number; value?: number}>;
/** Optional bounded text inputs use the shared measurement pipeline before pure layout. */
export type PlexDecorationText = Readonly<{id: string; label: CanvasViewText}>;
export type PlexDecorationTextSize = Readonly<{width: number; height: number; fontSize: number}>;
/** Optional disjoint rounded band. Bounds describe its outer frame; the inner rounded hole
 * excludes focus/inner categories from hits, highlights, counts and drop authority. */
export type PlexAreaShape = AreaBandShape;
export type PlexArea = Readonly<{
  id: AreaId; labelKey: string; bounds: ViewRect; resizeEdge?: "top" | "bottom";
  shape?: PlexAreaShape;
  /** User labels are literal vault configuration, never translated as catalog keys. */
  label?: string;
  heightPreference?: PlexAreaDimension;
  /** Horizontal resizing is independent of the existing top/bottom height capability. */
  widthResizeEdge?: "left" | "right";
  widthPreference?: PlexAreaDimension;
  /** Non-scrolling regions keep shared tools and measured coordinates; their layout must contain all admitted content. */
  viewport?: ViewRect & {contentTop: number; contentHeight: number; initialScrollTop: number; scrollable?: false;
    /** Opt-in shared paint policy: hide routes whose physical attachment is outside this scroll surface. */
    edgeVisibility?: "visible-endpoints"};
  /** Physical area action is explicit; arbitrary areas have no relationship-write meaning by default. */
  dropRole?: "parent" | "child" | "left" | "right";
  dropTarget?: PlexDropMeaning;
  /** Exact admitted canonical origin; omission means projection root/entry. Area placement is never relationship provenance. */
  dropOrigin?: OccurrenceId;
  reflow?: Readonly<{columns: number; columnGap: number; rowGap: number; paddingTop?: number; paddingBottom?: number;
    /** Recompute columns from surviving measured cards and this area's world width. */
    autoColumns?: boolean;
    /** Keep measured positions while retaining matching ancestors; omitted policies preserve filtered repacking. */
    filterLayout?: "keep"}>;
}>;
/** Pure presentation marks have no semantic endpoints or interaction/write authority. */
export type PlexDecoration = Readonly<{id: string} & (
  {kind: "region"; bounds: ViewRect; shape?: PlexAreaShape; labelKey: string; label?: string; description?: CanvasViewText; areaId?: AreaId; tint?: "water" | "wood" | "fire" | "earth" | "metal"; color?: ColorValue; count?: boolean}
  | {kind: "guide"; points: readonly ViewPoint[]; directed?: boolean; direction?: "forward" | "backward" | "both"; stroke?: "line" | "none";
    caption?: Readonly<{label: CanvasViewText; bounds: ViewRect; fontSize: number}>; variant?: "generating" | "regulating"}
)>;
export type PlexViewLayout = Readonly<{
  positions: ReadonlyMap<OccurrenceId, ViewRect>; areas: readonly PlexArea[];
  decorations?: readonly PlexDecoration[];
}>;
export type PlexViewInput = Readonly<{
  attention: NodeId; read: PlexViewRead; maximum: number; state: unknown;
  /** Present only for an opt-in rooted native session; attention remains an independent navigation target. */
  layoutRoot?: NodeId;
  /** Plain current resource ownership, not coverage. Existing frontier slots take priority over newly arriving branches. */
  retainedScopes?: readonly NodeId[];
  /** Only plain occurrence/canonical identities; native tokens/buffers and dimensions remain with their existing owners. */
  editors?: readonly Readonly<{occurrenceId: OccurrenceId; nodeId: NodeId}>[];
  /** Type-wide configuration is separate from native-session state. */
  configuration?: PlexViewConfiguration;
  /** Supplied only for explicitly expanded, current, single-document section presentation. */
  sections?: PlexSectionRead;
}>;
/** Bounded dependency declaration, never an acquisition request or property inventory. */
export type PlexViewPropertyDependencies = Readonly<{fields: readonly string[]; evidence?: boolean}>;
export interface PlexViewDefinition {
  readonly id: string;
  readonly version: typeof CANVAS_VIEW_API_VERSION;
  readonly labelKey: string;
  readonly icon: string;
  readonly capabilities: Readonly<{sections?: boolean; descendants?: boolean; editor?: boolean; compact?: boolean; properties?: boolean; badges?: boolean}>;
  /** Optional adornment admission within the unchanged 2048-occurrence scene cap; old views retain16. */
  readonly badgeBudget?: number;
  /** Optional retained size-key budget across presets; ordinary views keep64 per dimension. */
  readonly areaPreferenceBudget?: number;
  readonly defaultState: unknown;
  /** Omit for attention-only hosting. Occurrence hosting uses explicit shared bindings;
   * attention-and-occurrence retains the central attention host until another occurrence binds. */
  readonly editorHosting?: "occurrence" | "attention-and-occurrence";
  /** Single central Markdown document. Requires sections capability; omission preserves the
   * attention source. Rooted policies may explicitly follow their pinned layout root instead. */
  readonly sectionSource?: "attention" | "layout-root";
  /** Omit for attention-scoped geometry and navigation compatibility. */
  readonly navigation?: "rooted";
  /** Explicit selector entry may start at this canvas's current attention; workspace restoration still retains its saved root. */
  readonly navigationEntry?: "attention";
  /** Optional bounded branch-frontier policy, independent of attention-following definitions and native editor creation. */
  readonly hierarchy?: Readonly<{maximumScopes: number;
    /** Admitted occurrence depth from 1 through 20; omission preserves 8. This never enlarges the source-scope budget. */
    maximumDepth?: number;
    primary: "activate" | "activate-editor" | "expand" | "center"; relations?: "child-and-peer";
    /** Opt into packing the optional shared disclosure hit-target measurement. */
    controls?: "measured";
    /** Return a small replacement view state, or null when the requested displayed branch is unavailable. */
    reduce: (state: unknown, projection: PlexProjection, action: PlexBranchAction) => unknown}>;
  readonly configuration?: PlexViewConfigurationSchema;
  /** Bounded configured colors join the existing owning-document theme/palette projection.
   * It receives this view's configuration only, and grants no style or settings write. */
  readonly colorReferences?: (configuration: PlexViewConfiguration) => readonly ColorValue[];
  /** Declarative assignment choices join the shared native action/write owner. Omit to remain
   * read-only; categories/regions never derive a YAML or relationship edit from their geometry. */
  readonly propertyAssignments?: (state: unknown, configuration: PlexViewConfiguration) => readonly PlexPropertyAssignment[];
  /** Optional dependency declaration enlarges only the existing finite read frame's budgets.
   * No data is read by declaring it; old consumers keep their previous budget and signature. */
  readonly propertyDependencies?: (state: unknown, configuration: PlexViewConfiguration) => PlexViewPropertyDependencies;
  /** Bounded plain decoration labels are measured without a source reader or private renderer. */
  readonly decorationLabels?: (state: unknown, configuration: PlexViewConfiguration) => readonly PlexDecorationText[];
  /** Optional pure presentation-state actions. The session still validates/persists bounded state
   * and protects native editors; this reducer receives no host or file mutation capability. */
  readonly reduceState?: (state: unknown, action: PlexViewStateAction, configuration: PlexViewConfiguration) => PlexViewStateResult;
  /** Validate only this view's small session state; shared/native settings are not supplied. */
  restoreState(value: unknown): unknown;
  /** Material preparation is host-owned and bounded; pure projection consumes admitted facts only. */
  project(input: PlexViewInput): PlexProjection | null;
  /** Layout has no source reader, scheduling or subscription capability. */
  layout(projection: PlexProjection, measurements: readonly PlexMeasurement[], preferences: unknown, editor: boolean,
    context?: Readonly<{areaHeights: Readonly<Record<string, number>>; areaWidths?: Readonly<Record<string, number>>;
      decorationMeasurements?: ReadonlyMap<string, PlexDecorationTextSize>; configuration?: PlexViewConfiguration}>): PlexViewLayout;
}
