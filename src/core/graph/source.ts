import type { FileFacet, GraphNodeKind, NodeId } from "./model";

/** Opaque adapter-owned source revision. A file mtime alone is not a coherent host revision. */
export type SourceRevision = string & { readonly __sourceRevision: unique symbol };

/** Opaque coherent-read token. Producers mint a new value whenever the read boundary changes. */
export type SourceSnapshotRevision = string & { readonly __sourceSnapshotRevision: unique symbol };

/** Opaque collection generation. It prevents an older stream from publishing over a newer run. */
export type SourceGeneration = string & { readonly __sourceGeneration: unique symbol };

export const sourceRevision = (value: string): SourceRevision => value as SourceRevision;
export const sourceSnapshotRevision = (value: string): SourceSnapshotRevision => value as SourceSnapshotRevision;
export const sourceGeneration = (value: string): SourceGeneration => value as SourceGeneration;

/**
 * Materialization is independent from semantic identity. In particular, an unresolved target can
 * have a stable semantic identity without a host file; deleted is a later observation about an
 * identity that previously existed, while missing means the producer has no entity for it in this
 * coherent read.
 */
export type SourceEntityState = "materialized" | "unresolved" | "missing" | "deleted";

/** Identity/path/kind are explicit independent facts; core code must never infer one from another. */
export type SourceEntityRef = Readonly<{
  id: NodeId;
  kind: GraphNodeKind;
  state: SourceEntityState;
  semanticPath?: string;
  physicalPath?: string;
}>;

export type SourceLocation = Readonly<{
  /** One-based Markdown line when the current producer exposes it. */
  line?: number;
  /** Zero-based character range in the physical declaring source when available. */
  start?: number;
  end?: number;
}>;

export type SourceProvenance = Readonly<{
  /** Preserve where competing values came from; the compiler chooses precedence later. */
  surface?: "frontmatter" | "inline" | "body" | "host";
  /** Existing evidence definition/property label when the producer already exposes one. */
  definition?: string;
  /** Original declaring property name, preserving presentation/casing. */
  fieldName?: string;
  /** Normalized property key used for later compiler lookup, never a relationship role. */
  normalizedFieldName?: string;
  rawValue?: string;
  location?: SourceLocation;
}>;

/**
 * Resolution is producer-owned. `rawTarget` and `subpath` preserve what was declared; `entity`
 * preserves the exact semantic target chosen by the host/adapter. This supports ambiguous names,
 * source-relative links, headings/subpaths and case-distinct paths without a core basename rule.
 */
export type SourceTargetRef = Readonly<{
  entity: SourceEntityRef;
  rawTarget: string;
  subpath?: string;
  resolvedBy: "host" | "unresolved" | "url" | "daily-notes" | "structural";
}>;

export type SourceRecordBase = Readonly<{
  /** The semantic node that declares/owns this fact. */
  source: SourceEntityRef;
  /** Revision of that source as observed inside the enclosing coherent read. */
  sourceRevision: SourceRevision;
  /** Physical contribution owner when it differs from the semantic declaring node (e.g. tag membership). */
  contribution?: Readonly<{ source: SourceEntityRef; revision: SourceRevision }>;
  provenance?: SourceProvenance;
}>;

/** Entity/materialization facts are separate from occurrence facts so targets may appear later. */
export type SourceEntityFact = SourceRecordBase & Readonly<{
  kind: "entity";
  entity: SourceEntityRef;
  name: string;
  url: string | null;
  semanticMtime?: number | null;
  file?: FileFacet;
}>;

/** Only graph-relevant metadata is normalized; arbitrary frontmatter values are deliberately absent. */
export type SemanticMetadataOccurrence = SourceRecordBase & Readonly<{
  kind: "semantic-metadata";
  metadataKind: "alias" | "tag" | "note-type" | "primary-tag-field";
  value: string;
}>;

/** Property discovery needs names, including non-ontology fields, but never their arbitrary values. */
export type SourceFieldNameFact = SourceRecordBase & Readonly<{
  kind: "field-name";
  fieldName: string;
  normalizedFieldName: string;
  surface: "frontmatter" | "inline";
}>;

/** Physical vault hierarchy. The source is the parent container and target is its direct child. */
export type FileTreeOccurrence = SourceRecordBase & Readonly<{
  kind: "file-tree";
  target: SourceTargetRef;
}>;

/** Tag hierarchy or tag-to-entity membership. */
export type TagTreeOccurrence = SourceRecordBase & Readonly<{
  kind: "tag-tree";
  target: SourceTargetRef;
  membership: "tag-child" | "entity-member";
}>;

/**
 * Obsidian currently exposes resolved/unresolved link maps as source-target counts. A future
 * adapter may provide individual locations, but this contract does not fabricate locations the
 * current collector does not own.
 */
export type HostLinkOccurrence = SourceRecordBase & Readonly<{
  kind: "obsidian-link" | "unresolved-link";
  target: SourceTargetRef;
  occurrenceCount: number;
}>;

/** Ontology field occurrence; role/precedence is intentionally not part of this source record. */
export type OntologyOccurrence = SourceRecordBase & Readonly<{
  kind: "frontmatter-ontology" | "inline-ontology";
  target: SourceTargetRef;
}>;

/** Body URL occurrence. URL-origin evidence is derived later from `origin`, once per URL target. */
export type BodyUrlOccurrence = SourceRecordBase & Readonly<{
  kind: "body-url";
  target: SourceTargetRef;
  /** Absent when URL parsing fails: retain the URL node without inventing origin evidence. */
  origin?: SourceTargetRef;
  label?: string;
}>;

/** Host Date-property + Daily Notes normalization, retaining original property provenance. */
export type DatePropertyOccurrence = SourceRecordBase & Readonly<{
  kind: "date-property";
  target: SourceTargetRef;
}>;

/**
 * Links found in configured thumbnail/node-image fields are semantic reconciliation inputs only;
 * decoded imagery never crosses this boundary. They let the compiler exclude an otherwise generic
 * host link only when every host occurrence is presentation-only.
 */
export type PresentationLinkOccurrence = SourceRecordBase & Readonly<{
  kind: "presentation-link";
  surface: "frontmatter" | "inline";
  target: SourceTargetRef;
}>;

export type NormalizedSourceRecord =
  | SourceEntityFact
  | SemanticMetadataOccurrence
  | SourceFieldNameFact
  | FileTreeOccurrence
  | TagTreeOccurrence
  | HostLinkOccurrence
  | OntologyOccurrence
  | BodyUrlOccurrence
  | DatePropertyOccurrence
  | PresentationLinkOccurrence;

export type SourceReadBoundary = Readonly<{
  generation: SourceGeneration;
  snapshotRevision: SourceSnapshotRevision;
}>;

/** Dense single-file sources may span arbitrarily many batches; no per-file occurrence array exists. */
export const MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH = 256;

export type NormalizedSourceBatch = Readonly<{
  boundary: SourceReadBoundary;
  sequence: number;
  final: boolean;
  records: readonly NormalizedSourceRecord[];
}>;

export type SourceBatchCursor = Readonly<{
  boundary: SourceReadBoundary;
  nextSequence: number;
  complete: boolean;
}>;

export type SourceBatchAcceptance =
  | Readonly<{ accepted: true; cursor: SourceBatchCursor }>
  | Readonly<{ accepted: false; reason: "wrong-boundary" | "wrong-sequence" | "already-complete" | "batch-too-large" }>;

export const beginSourceRead = (boundary: SourceReadBoundary): SourceBatchCursor => ({
  boundary,
  nextSequence: 0,
  complete: false,
});

const sameBoundary = (left: SourceReadBoundary, right: SourceReadBoundary): boolean =>
  left.generation === right.generation && left.snapshotRevision === right.snapshotRevision;

/** Contract-seam validation only; production scheduling/publication remains owned by later checkpoints. */
export function acceptSourceBatch(cursor: SourceBatchCursor, batch: NormalizedSourceBatch): SourceBatchAcceptance {
  if (cursor.complete) return { accepted: false, reason: "already-complete" };
  if (!sameBoundary(cursor.boundary, batch.boundary)) return { accepted: false, reason: "wrong-boundary" };
  if (batch.sequence !== cursor.nextSequence) return { accepted: false, reason: "wrong-sequence" };
  if (batch.records.length > MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH) return { accepted: false, reason: "batch-too-large" };
  return {
    accepted: true,
    cursor: {
      boundary: cursor.boundary,
      nextSequence: cursor.nextSequence + 1,
      complete: batch.final,
    },
  };
}

/**
 * Necessary stream-validity condition for publication: final sequential batch and still-current
 * boundary. Producers must also supply complete entity facts for materialized target references;
 * this cursor does not inspect record contents or validate referential completeness. References
 * may point to entity facts introduced in later batches; the compiler must wait for finality.
 */
export const sourceReadCanPublish = (cursor: SourceBatchCursor, currentBoundary: SourceReadBoundary): boolean =>
  cursor.complete && sameBoundary(cursor.boundary, currentBoundary);
