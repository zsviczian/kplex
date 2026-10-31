/** Host-bound render payloads. Occurrence identity and physical areas stay separate from canonical write endpoints. */
import type {PlexArea, PlexProjection, PlexDecoration, PlexAreaShape} from "../../core/plex/views/contracts";
import type {PositionedNode, PositionedEdge} from "../../types";
import type {AdmittedOccurrenceEditor} from "./occurrenceEditors";
import type {PlexPropertyAssignment} from "../../core/plex/views/propertyAssignment";

export type SceneViewport = {key: string; left: number; top: number; width: number; height: number;
  contentTop: number; contentHeight: number; initialScrollTop: number; scrollable?: false; edgeVisibility?: "visible-endpoints"};
export type SceneAreaBounds = {key: string; left: number; top: number; width: number; height: number; resizeEdge: "top" | "bottom"; shape?: PlexAreaShape};
export type HostPlexScene = {
  nodes: PositionedNode[]; edges: PositionedEdge[];
  zoneViewports: Partial<Record<string, SceneViewport>>; zoneAreas: Partial<Record<string, SceneAreaBounds>>;
  sectionTreeEdges?: {id: string; sourcePath: string; targetPath: string; sourceOccurrence?: string; targetOccurrence?: string}[];
  projection?: PlexProjection;
  areas?: readonly PlexArea[];
  decorations?: readonly PlexDecoration[];
  propertyAssignments?: readonly PlexPropertyAssignment[];
  /** World rectangles are fit-only; the shared ThoughtNode paints its own attached badge. */
  badgeBounds?: readonly Readonly<{occurrenceId: string; bounds: import("../../core/plex/views/contracts").ViewRect}>[];
  entryOccurrence?: string; editorOccurrence?: string; frameOccurrence?: string;
  boundEditors?: readonly AdmittedOccurrenceEditor[];
  /** A bounded cached connector pass stopped early; it makes no completeness claim. */
  crossLinksLimited?: boolean;
  failed?: boolean;
};
export type SceneAreaLayout = {nodes: PositionedNode[]; localPositions: Map<string, {x: number; y: number}>;
  contentHeight: number; count: number; filtering: boolean};

/** Stable private occurrence identity; legacy scenes keep their established unique-path map keys. */
export function occurrenceKey(node: PositionedNode): string { return node.occurrenceId ?? node.page.path; }
/** Canonical paths are never overloaded with a visual connector's occurrence endpoint. */
export function edgeOccurrence(edge: Pick<PositionedEdge, "sourceOccurrence" | "targetOccurrence" | "sourcePath" | "targetPath">, endpoint: "source" | "target"): string {
  return endpoint === "source" ? edge.sourceOccurrence ?? edge.sourcePath : edge.targetOccurrence ?? edge.targetPath;
}
/** Geometry/clipping may use a measured section row without changing canonical action identity. */
export function edgePhysicalOccurrence(edge: PositionedEdge, endpoint: "source" | "target"): string {
  return (endpoint === "source" ? edge.sourceSectionOccurrence : undefined) ?? edgeOccurrence(edge, endpoint);
}
/** Non-semantic connectors have no relationship-write authority, even when both endpoints are real notes. */
export function semanticSceneEdge(edge: PositionedEdge): boolean { return !edge.kind || edge.kind === "semantic"; }
/** A visual edge ID wins only for its exact canonical pair; a pair without an ID must be unambiguous. */
export function semanticEdgeForTarget(edges: readonly PositionedEdge[], source: string, target: string, id?: string): PositionedEdge | null {
  const candidates = edges.filter(edge => semanticSceneEdge(edge) && edge.sourcePath === source && edge.targetPath === target);
  return id ? candidates.find(edge => edge.id === id) ?? null : candidates.length === 1 ? candidates[0] : null;
}
