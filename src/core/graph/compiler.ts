import { normalizeFieldName } from "../contracts/fieldName";
import { nodeId, type FileFacet, type GraphNodeKind, type NodeId } from "./model";
import {
  acceptSourceBatch,
  beginSourceRead,
  sourceReadCanPublish,
  type BodyUrlOccurrence,
  type DatePropertyOccurrence,
  type FileTreeOccurrence,
  type HostLinkOccurrence,
  type NormalizedSourceBatch,
  type NormalizedSourceRecord,
  type OntologyOccurrence,
  type PresentationLinkOccurrence,
  type SemanticMetadataOccurrence,
  type SourceBatchCursor,
  type SourceEntityFact,
  type SourceEntityRef,
  type SourceFieldNameFact,
  type SourceReadBoundary,
  type SourceRevision,
  type TagTreeOccurrence,
} from "./source";
import {
  RelationEvidenceStore,
  type EvidenceProvenance,
  type EvidenceRole,
  type EvidenceSourceKind,
  type RelationEvidence,
} from "./evidence";
import { LinkDirection, RelationType, type SemanticRelation } from "./relations";
import { resolveEvidenceStoreCooperativeByKey } from "./resolver";

const PATHLESS_KEY_PREFIX = "\u0001kplex-node-id:";

export type GraphCompilerSettings = Readonly<{
  hierarchy: Readonly<{
    hidden: readonly string[];
    parents: readonly string[];
    children: readonly string[];
    leftFriends: readonly string[];
    rightFriends: readonly string[];
    previous: readonly string[];
    next: readonly string[];
  }>;
  inferAllLinksAsFriends: boolean;
  inverseInfer: boolean;
  showFullTagName: boolean;
  tagStyleList: readonly string[];
  maxLabelLength: number;
}>;

export type GraphCompilerRuntime = Readonly<{
  now: () => number;
  yield: () => Promise<void>;
  isCurrent: () => boolean;
  /** Collector/compiler semantic work budget. Resolver keeps its accepted C13b 7ms budget. */
  sliceBudgetMs: number;
  resolverBatchSize: number;
  onProgress?: () => void;
}>;

export type CompiledGraphNode = {
  id: NodeId;
  kind: GraphNodeKind;
  state: SourceEntityRef["state"];
  semanticPath?: string;
  physicalPath?: string;
  name: string;
  url: string | null;
  semanticMtime: number | null;
  file?: FileFacet;
  aliases: string[];
  tags: string[];
  noteType: string | null;
  primaryStyleTag: string | null;
  styleTags: string[];
  maxLabelLength: number;
  /** Resolver keys are private identity bindings, not semantic paths. */
  neighbours: Map<string, SemanticRelation<CompiledGraphNode>>;
};

export type CompiledEvidenceOwnership = Readonly<{
  sourceId: NodeId;
  revision: SourceRevision;
}>;

export type CompiledRelationEvidence = Omit<
  RelationEvidence,
  "sourcePath" | "targetPath" | "declaredByPath" | "declaredTargetPath"
> & Readonly<{
  sourceId: NodeId;
  targetId: NodeId;
  declaredById: NodeId;
  declaredTargetId: NodeId;
  sourcePath?: string;
  targetPath?: string;
  declaredByPath?: string;
  declaredTargetPath?: string;
  contribution: CompiledEvidenceOwnership;
}>;

type NodeMetadataAccumulator = {
  frontmatterNoteType?: SemanticMetadataOccurrence["value"];
  inlineNoteType?: SemanticMetadataOccurrence["value"];
  hasFrontmatterNoteType: boolean;
  hasInlineNoteType: boolean;
  primaryValues: SemanticMetadataOccurrence["value"][];
};

type PresentationCount = { visual: number; host: number };

type OntologyAssignment = Readonly<{
  configuredFieldName: string;
  normalizedFieldName: string;
  role: EvidenceRole;
}>;

/**
 * One bounded producer read. The compiler mutates only its private state; a rejected/stale read
 * therefore discards the whole compilation rather than exposing a partial graph.
 */
export class GraphCompilerSourceRead {
  cursor: SourceBatchCursor;
  complete = false;

  constructor(readonly boundary: SourceReadBoundary) {
    this.cursor = beginSourceRead(boundary);
  }
}

/**
 * Host-free full graph compiler. It consumes only C11 normalized facts and narrow semantic
 * settings. Exact NodeId is primary identity; semantic/physical paths remain independent facets.
 *
 * C13b's evidence store is intentionally retained. For legacy pathful nodes the resolver key is
 * the exact semantic path, preserving serialized declarations byte-for-byte. Pathless nodes use a
 * private generated resolver key which is mapped back to NodeId before portable evidence is exposed;
 * the opaque id is never presented as a semantic path.
 */
export class PortableGraphCompilation {
  constructor(
    readonly nodes: ReadonlyMap<NodeId, CompiledGraphNode>,
    readonly discoveredFields: ReadonlyMap<string, { name: string; count: number }>,
    private readonly nodesByResolverKey: ReadonlyMap<string, CompiledGraphNode>,
    private readonly resolverKeyById: ReadonlyMap<NodeId, string>,
    private readonly evidenceStore: RelationEvidenceStore,
    private readonly ownershipByEvidenceId: ReadonlyMap<string, CompiledEvidenceOwnership>,
  ) {}

  node(id: NodeId): CompiledGraphNode | undefined { return this.nodes.get(id); }

  *declarations(): IterableIterator<CompiledRelationEvidence> {
    for (const item of this.evidenceStore.declarations()) {
      const mapped = this.mapEvidence(item);
      if (mapped) yield mapped;
    }
  }

  evidenceBetween(sourceId: NodeId, targetId: NodeId): CompiledRelationEvidence[] {
    const sourceKey = this.resolverKeyById.get(sourceId);
    const targetKey = this.resolverKeyById.get(targetId);
    if (!sourceKey || !targetKey) return [];
    return this.evidenceStore.between(sourceKey, targetKey)
      .map((item) => this.mapEvidence(item))
      .filter((item): item is CompiledRelationEvidence => item !== null);
  }

  /**
   * C13c compatibility seam for GraphState/IndexSnapshot. It succeeds only when every evidence
   * node's private resolver key is already its exact semantic path. C14 owns removing this
   * legacy publication shape; pathless portable graphs never masquerade IDs as paths here.
   */
  legacyEvidence(): RelationEvidenceStore | null {
    for (const [key, node] of this.nodesByResolverKey) {
      if (!node.semanticPath || node.semanticPath !== key) return null;
    }
    return this.evidenceStore;
  }

  private mapEvidence(item: RelationEvidence): CompiledRelationEvidence | null {
    const source = this.nodesByResolverKey.get(item.sourcePath);
    const target = this.nodesByResolverKey.get(item.targetPath);
    const declaredBy = this.nodesByResolverKey.get(item.declaredByPath);
    const declaredTarget = this.nodesByResolverKey.get(item.declaredTargetPath);
    if (!source || !target || !declaredBy || !declaredTarget) return null;
    const forwardId = item.id.replace(/:reverse$/, ":forward");
    const contribution = this.ownershipByEvidenceId.get(forwardId);
    if (!contribution) throw new Error("Compiled evidence has no contribution ownership");
    const {
      sourcePath: _sourceResolverKey,
      targetPath: _targetResolverKey,
      declaredByPath: _declaredByResolverKey,
      declaredTargetPath: _declaredTargetResolverKey,
      ...portableEvidence
    } = item;
    return {
      ...portableEvidence,
      sourceId: source.id,
      targetId: target.id,
      declaredById: declaredBy.id,
      declaredTargetId: declaredTarget.id,
      ...(source.semanticPath === undefined ? {} : { sourcePath: source.semanticPath }),
      ...(target.semanticPath === undefined ? {} : { targetPath: target.semanticPath }),
      ...(declaredBy.semanticPath === undefined ? {} : { declaredByPath: declaredBy.semanticPath }),
      ...(declaredTarget.semanticPath === undefined ? {} : { declaredTargetPath: declaredTarget.semanticPath }),
      contribution,
    };
  }
}

export class NormalizedGraphCompiler {
  private readonly nodes = new Map<NodeId, CompiledGraphNode>();
  private readonly nodesByResolverKey = new Map<string, CompiledGraphNode>();
  private readonly resolverKeyById = new Map<NodeId, string>();
  private readonly idBySemanticPath = new Map<string, NodeId>();
  private readonly entityFactSeen = new Set<NodeId>();
  private readonly requiredMaterializedEntityFacts = new Set<NodeId>();
  private readonly syntheticNodes = new Set<NodeId>();
  private readonly evidence = new RelationEvidenceStore();
  private readonly discoveredFields = new Map<string, { name: string; count: number }>();
  private readonly metadata = new Map<NodeId, NodeMetadataAccumulator>();
  private readonly presentationCounts = new Map<string, PresentationCount>();
  private readonly urlLabels = new Map<NodeId, string>();
  private readonly ownershipByEvidenceId = new Map<string, CompiledEvidenceOwnership>();
  private readonly openReads = new Set<GraphCompilerSourceRead>();
  private readonly ontologyAssignments: readonly OntologyAssignment[];
  private sliceStartedAt: number;
  private finished = false;
  private rejected = false;
  private nextResolverKey = 0;
  private nextSyntheticId = 0;

  constructor(
    private readonly settings: GraphCompilerSettings,
    private readonly runtime: GraphCompilerRuntime,
  ) {
    this.sliceStartedAt = runtime.now();
    const hierarchy = settings.hierarchy;
    const groups: ReadonlyArray<readonly [readonly string[], EvidenceRole]> = [
      [hierarchy.hidden, "hidden"],
      [hierarchy.parents, "parent"],
      [hierarchy.children, "child"],
      [hierarchy.leftFriends, "left"],
      [hierarchy.rightFriends, "right"],
      [hierarchy.previous, "previous"],
      [hierarchy.next, "next"],
    ];
    this.ontologyAssignments = groups.flatMap(([fieldNames, role]) => fieldNames.map((configuredFieldName) => ({
      configuredFieldName,
      normalizedFieldName: normalizeFieldName(configuredFieldName),
      role,
    }))).filter((assignment) => Boolean(assignment.normalizedFieldName));
  }

  beginRead(boundary: SourceReadBoundary): GraphCompilerSourceRead {
    if (this.finished) throw new Error("Graph compiler is already finalized");
    const read = new GraphCompilerSourceRead(boundary);
    this.openReads.add(read);
    return read;
  }

  /**
   * Seed one exact entity from a stable published-state read. This is used only by per-source
   * preparation so the full semantic compiler can resolve current materialized targets without
   * cloning the published graph. Entity seeds carry no relationship contribution of their own.
   */
  async seedEntityFact(record: SourceEntityFact): Promise<boolean> {
    if (this.finished || this.rejected || !this.runtime.isCurrent()) return this.reject();
    if (!this.consumeEntity(record)) return this.reject();
    // A published URL name can carry the first meaningful label chosen by an earlier contribution.
    // Preserve it while recompiling one later source: full compilation chooses that label on first
    // materialization, whereas a patch must not let an arbitrary edited referrer rename a shared URL.
    if (record.entity.kind === "url" && record.url && record.name && record.name !== record.url) {
      this.urlLabels.set(record.entity.id, record.name);
    }
    return this.checkpoint();
  }

  async acceptBatch(read: GraphCompilerSourceRead, batch: NormalizedSourceBatch): Promise<boolean> {
    if (this.finished || this.rejected || read.complete || !this.openReads.has(read) || !this.runtime.isCurrent()) return this.reject();
    const accepted = acceptSourceBatch(read.cursor, batch);
    if (!accepted.accepted) return this.reject();
    for (const record of batch.records) {
      if (!this.consumeRecord(record)) return this.reject();
      if (!(await this.checkpoint())) return this.reject();
    }
    read.cursor = accepted.cursor;
    return this.runtime.isCurrent() || this.reject();
  }

  completeRead(read: GraphCompilerSourceRead, currentBoundary: SourceReadBoundary): boolean {
    if (this.finished || this.rejected || read.complete || !this.openReads.has(read) || !this.runtime.isCurrent()) return this.reject();
    if (!sourceReadCanPublish(read.cursor, currentBoundary)) return this.reject();
    read.complete = true;
    this.openReads.delete(read);
    return true;
  }

  async finish(): Promise<PortableGraphCompilation | null> {
    if (this.finished || this.rejected || this.openReads.size || !this.runtime.isCurrent()) return null;
    this.finished = true;
    for (const id of this.requiredMaterializedEntityFacts) if (!this.entityFactSeen.has(id)) return null;

    let processed = 0;
    for (const node of this.nodes.values()) {
      this.finalizeMetadata(node);
      processed += 1;
      if ((processed & 127) === 0 && !(await this.checkpoint())) return null;
    }
    if (!(await this.applyPresentationSuppression())) return null;
    if (!this.runtime.isCurrent()) return null;

    const resolved = await resolveEvidenceStoreCooperativeByKey(
      this.nodesByResolverKey,
      this.evidence,
      { now: this.runtime.now, yield: this.runtime.yield, isCurrent: this.runtime.isCurrent },
      this.runtime.resolverBatchSize,
      this.runtime.onProgress,
    );
    if (!resolved || !this.runtime.isCurrent()) return null;

    return new PortableGraphCompilation(
      this.nodes,
      this.discoveredFields,
      this.nodesByResolverKey,
      this.resolverKeyById,
      this.evidence,
      this.ownershipByEvidenceId,
    );
  }

  private reject(): false {
    this.rejected = true;
    return false;
  }

  private async checkpoint(force = false): Promise<boolean> {
    if (!this.runtime.isCurrent()) return false;
    if (!force && this.runtime.now() - this.sliceStartedAt < this.runtime.sliceBudgetMs) return true;
    await this.runtime.yield();
    if (!this.runtime.isCurrent()) return false;
    this.sliceStartedAt = this.runtime.now();
    return true;
  }

  private consumeRecord(record: NormalizedSourceRecord): boolean {
    switch (record.kind) {
      case "entity": return this.consumeEntity(record);
      case "file-tree": return this.consumeFileTree(record);
      case "tag-tree": return this.consumeTagTree(record);
      case "obsidian-link":
      case "unresolved-link": return this.consumeHostLink(record);
      case "frontmatter-ontology":
      case "inline-ontology": return this.consumeOntology(record);
      case "field-name": return this.consumeFieldName(record);
      case "semantic-metadata": return this.consumeSemanticMetadata(record);
      case "date-property": return this.consumeDate(record);
      case "body-url": return this.consumeBodyUrl(record);
      case "presentation-link": return this.consumePresentationLink(record);
    }
  }

  private consumeEntity(record: SourceEntityFact): boolean {
    const node = this.ensureNode(record.entity, record.name, record.url, false);
    if (!node) return false;
    node.kind = record.entity.kind;
    node.state = record.entity.state;
    node.semanticPath = record.entity.semanticPath;
    node.physicalPath = record.entity.physicalPath;
    const preferredUrlLabel = this.urlLabels.get(node.id);
    node.name = node.kind === "url" && preferredUrlLabel ? preferredUrlLabel : record.name;
    node.url = record.url;
    node.semanticMtime = record.semanticMtime ?? null;
    if (record.file) node.file = record.file;
    this.entityFactSeen.add(record.entity.id);
    this.syntheticNodes.delete(record.entity.id);
    return true;
  }

  private consumeFileTree(record: FileTreeOccurrence): boolean {
    const source = this.ensureNode(record.source, this.fallbackName(record.source, record.target.rawTarget));
    const target = this.ensureNode(record.target.entity, this.fallbackName(record.target.entity, record.target.rawTarget));
    if (!source || !target) return false;
    this.addEvidence(record, source, target, "child", RelationType.DEFINED, LinkDirection.FROM, {
      sourceKind: "file-tree", definition: "file-tree",
    });
    return true;
  }

  private consumeTagTree(record: TagTreeOccurrence): boolean {
    if (record.membership === "tag-child") {
      const source = this.ensureNode(record.source, this.tagNameFromPath(record.source.semanticPath));
      const target = this.ensureNode(record.target.entity, this.tagNameFromPath(record.target.entity.semanticPath));
      if (!source || !target) return false;
      if (!this.hasSourceKindBetween(source, target, "tag-tree")) {
        this.addEvidence(record, source, target, "child", RelationType.DEFINED, LinkDirection.FROM, {
          sourceKind: "tag-tree", definition: "tag-tree",
        });
      }
      return true;
    }

    const rawTag = record.provenance?.rawValue
      ?? this.rawTagFromSourcePath(record.source.semanticPath);
    if (!rawTag) return false;
    const leaf = this.ensureTagPath(rawTag, record.source, record);
    const member = this.ensureNode(record.target.entity, this.fallbackName(record.target.entity, record.target.rawTarget));
    if (!leaf || !member) return false;
    this.addEvidence(record, leaf, member, "child", RelationType.DEFINED, LinkDirection.TO, {
      sourceKind: "tag-tree", definition: "tag-tree",
    });
    return true;
  }

  private consumeHostLink(record: HostLinkOccurrence): boolean {
    // Aggregate host-link maps may briefly retain stale source/target paths. The legacy full build
    // ignored those entries unless the source (and, for resolved links, the target) already existed
    // in the structural graph. Preserve that behavior instead of materializing stale host-map keys.
    if (!this.nodes.has(record.source.id)) return true;
    const source = this.ensureNode(record.source, this.fallbackName(record.source));
    if (!source) return false;
    if (record.kind === "obsidian-link" && !this.nodes.has(record.target.entity.id)) return true;
    const target = this.ensureNode(record.target.entity, this.fallbackName(record.target.entity, record.target.rawTarget));
    if (!target) return false;
    this.addInferred(record, source, target, record.kind);
    return true;
  }

  private consumeOntology(record: OntologyOccurrence): boolean {
    const source = this.ensureNode(record.source, this.fallbackName(record.source));
    const target = this.ensureNode(record.target.entity, this.fallbackName(record.target.entity, record.target.rawTarget));
    if (!source || !target) return false;
    const configured = record.provenance?.configuredFieldName;
    const normalized = record.provenance?.normalizedFieldName
      ?? normalizeFieldName(record.provenance?.fieldName ?? configured ?? "");
    const assignments = configured
      ? this.ontologyAssignments.filter((assignment) => assignment.configuredFieldName === configured)
      : this.ontologyAssignments.filter((assignment) => assignment.normalizedFieldName === normalized);
    if (!assignments.length) return false;
    for (const assignment of assignments) {
      const location = record.provenance?.location;
      const provenance: EvidenceProvenance = {
        sourceKind: record.kind,
        definition: record.provenance?.definition ?? assignment.normalizedFieldName,
        fieldName: record.provenance?.fieldName ?? configured ?? assignment.configuredFieldName,
        ...(record.provenance?.rawValue === undefined ? {} : { rawValue: record.provenance.rawValue }),
        ...(location?.line === undefined ? {} : { line: location.line }),
        ...(location?.start === undefined ? {} : { start: location.start }),
        ...(location?.end === undefined ? {} : { end: location.end }),
      };
      if (assignment.role === "hidden") {
        this.addHidden(record, source, target, provenance);
      } else {
        this.addEvidence(record, source, target, assignment.role, RelationType.DEFINED, LinkDirection.FROM, provenance);
      }
    }
    return true;
  }

  private consumeFieldName(record: SourceFieldNameFact): boolean {
    this.ensureNode(record.source, this.fallbackName(record.source));
    if (!record.normalizedFieldName) return true;
    const current = this.discoveredFields.get(record.normalizedFieldName);
    this.discoveredFields.set(record.normalizedFieldName, {
      name: current?.name ?? record.fieldName.trim(),
      count: (current?.count ?? 0) + 1,
    });
    return true;
  }

  private consumeSemanticMetadata(record: SemanticMetadataOccurrence): boolean {
    const node = this.ensureNode(record.source, this.fallbackName(record.source));
    if (!node) return false;
    if (record.metadataKind === "alias") {
      node.aliases.push(record.value);
      return true;
    }
    if (record.metadataKind === "tag") {
      node.tags.push(record.value);
      return true;
    }
    const accumulator = this.metadata.get(node.id) ?? {
      hasFrontmatterNoteType: false,
      hasInlineNoteType: false,
      primaryValues: [],
    };
    if (record.metadataKind === "note-type") {
      if (record.provenance?.surface === "frontmatter" && !accumulator.hasFrontmatterNoteType) {
        accumulator.frontmatterNoteType = record.value;
        accumulator.hasFrontmatterNoteType = true;
      } else if (record.provenance?.surface === "inline" && !accumulator.hasInlineNoteType) {
        accumulator.inlineNoteType = record.value;
        accumulator.hasInlineNoteType = true;
      }
    } else {
      accumulator.primaryValues.push(record.value);
    }
    this.metadata.set(node.id, accumulator);
    return true;
  }

  private consumeDate(record: DatePropertyOccurrence): boolean {
    if (record.target.resolvedBy !== "daily-notes") return false;
    const source = this.ensureNode(record.source, this.fallbackName(record.source));
    const target = this.ensureNode(record.target.entity, this.fallbackName(record.target.entity, record.target.rawTarget));
    const fieldName = record.provenance?.fieldName;
    const rawValue = record.provenance?.rawValue;
    if (!source || !target || !fieldName || typeof rawValue !== "string") return false;
    this.addEvidence(record, source, target, this.inferredRole(), RelationType.INFERRED, LinkDirection.FROM, {
      sourceKind: "date-property",
      definition: record.provenance?.definition ?? fieldName,
      fieldName,
      rawValue,
    });
    return true;
  }

  private consumeBodyUrl(record: BodyUrlOccurrence): boolean {
    if (record.target.resolvedBy !== "url") return false;
    const source = this.ensureNode(record.source, this.fallbackName(record.source));
    const target = this.ensureNode(record.target.entity, record.label || record.target.rawTarget, record.target.rawTarget);
    if (!source || !target) return false;
    if (record.label && record.label !== target.url && !this.urlLabels.has(target.id)) this.urlLabels.set(target.id, record.label);
    const preferredLabel = this.urlLabels.get(target.id);
    if (preferredLabel) target.name = preferredLabel;
    const line = record.provenance?.location?.line;
    this.addInferred(record, source, target, "body-url", line ? { line } : undefined);
    if (record.origin) {
      const origin = this.ensureNode(record.origin.entity, record.origin.rawTarget, record.origin.rawTarget);
      if (!origin) return false;
      if (!this.hasSourceKindBetween(origin, target, "url-origin")) {
        this.addEvidence(record, origin, target, "child", RelationType.INFERRED, LinkDirection.TO, {
          sourceKind: "url-origin", definition: "url-origin",
        });
      }
    }
    return true;
  }

  private consumePresentationLink(record: PresentationLinkOccurrence): boolean {
    const source = this.ensureNode(record.source, this.fallbackName(record.source));
    const target = this.ensureNode(record.target.entity, this.fallbackName(record.target.entity, record.target.rawTarget));
    if (!source || !target) return false;
    const key = this.pairCountKey(this.keyForNode(source), this.keyForNode(target));
    const count = this.presentationCounts.get(key) ?? { visual: 0, host: record.hostOccurrenceCount };
    count.visual += 1;
    count.host = record.hostOccurrenceCount;
    this.presentationCounts.set(key, count);
    return true;
  }

  private ensureNode(ref: SourceEntityRef, fallbackName = "", url: string | null = null, requireEntityFact = true): CompiledGraphNode | null {
    let existing = this.nodes.get(ref.id);
    if (existing && this.syntheticNodes.has(ref.id) && existing.semanticPath !== ref.semanticPath) {
      // Producer IDs are opaque and may equal an earlier generated ancestor ID. Relocate only
      // that private synthetic identity; references and its explicit semantic path stay intact.
      const replacement = this.syntheticId();
      const key = this.resolverKeyById.get(ref.id);
      this.nodes.delete(ref.id);
      this.syntheticNodes.delete(ref.id);
      this.resolverKeyById.delete(ref.id);
      existing.id = replacement;
      this.nodes.set(replacement, existing);
      this.syntheticNodes.add(replacement);
      if (key) this.resolverKeyById.set(replacement, key);
      if (existing.semanticPath !== undefined) this.idBySemanticPath.set(existing.semanticPath, replacement);
      existing = undefined;
    }
    if (existing) {
      this.updateReference(existing, ref);
      if (requireEntityFact) this.requireEntityFact(ref);
      return existing;
    }

    const semanticPath = ref.semanticPath;
    const pathCollisionId = semanticPath === undefined ? undefined : this.idBySemanticPath.get(semanticPath);
    if (semanticPath !== undefined && pathCollisionId && pathCollisionId !== ref.id) {
      const collided = this.nodes.get(pathCollisionId);
      if (collided && this.syntheticNodes.has(pathCollisionId)) {
        this.nodes.delete(pathCollisionId);
        this.syntheticNodes.delete(pathCollisionId);
        const key = this.resolverKeyById.get(pathCollisionId);
        this.resolverKeyById.delete(pathCollisionId);
        collided.id = ref.id;
        this.nodes.set(ref.id, collided);
        if (key) this.resolverKeyById.set(ref.id, key);
        this.idBySemanticPath.set(semanticPath, ref.id);
        existing = collided;
        this.updateReference(existing, ref);
        if (requireEntityFact) this.requireEntityFact(ref);
        return existing;
      }
    }

    let resolverKey = semanticPath;
    if (resolverKey === undefined || resolverKey.includes("\u0000") || this.nodesByResolverKey.has(resolverKey)) {
      do { resolverKey = `${PATHLESS_KEY_PREFIX}${++this.nextResolverKey}`; }
      while (this.nodesByResolverKey.has(resolverKey));
    }
    const node: CompiledGraphNode = {
      id: ref.id,
      kind: ref.kind,
      state: ref.state,
      ...(semanticPath === undefined ? {} : { semanticPath }),
      ...(ref.physicalPath === undefined ? {} : { physicalPath: ref.physicalPath }),
      name: fallbackName,
      url: url ?? (ref.kind === "url" ? ref.semanticPath ?? null : null),
      semanticMtime: null,
      aliases: [],
      tags: [],
      noteType: null,
      primaryStyleTag: null,
      styleTags: [],
      maxLabelLength: this.settings.maxLabelLength,
      neighbours: new Map(),
    };
    this.nodes.set(ref.id, node);
    this.nodesByResolverKey.set(resolverKey, node);
    this.resolverKeyById.set(ref.id, resolverKey);
    if (semanticPath !== undefined && !this.idBySemanticPath.has(semanticPath)) this.idBySemanticPath.set(semanticPath, ref.id);
    if (requireEntityFact) this.requireEntityFact(ref);
    return node;
  }

  private updateReference(node: CompiledGraphNode, ref: SourceEntityRef): void {
    node.kind = ref.kind;
    node.state = ref.state;
    if (ref.semanticPath !== undefined) {
      node.semanticPath = ref.semanticPath;
      if (!this.idBySemanticPath.has(ref.semanticPath)) this.idBySemanticPath.set(ref.semanticPath, node.id);
    }
    if (ref.physicalPath !== undefined) node.physicalPath = ref.physicalPath;
  }

  private requireEntityFact(ref: SourceEntityRef): void {
    if (ref.state === "materialized" && (ref.kind === "document" || ref.kind === "attachment" || ref.kind === "container")) {
      this.requiredMaterializedEntityFacts.add(ref.id);
    }
  }

  private keyForNode(node: CompiledGraphNode): string {
    const key = this.resolverKeyById.get(node.id);
    if (!key) throw new Error("Compiled node has no resolver identity binding");
    return key;
  }

  private fallbackName(ref: SourceEntityRef, rawTarget = ""): string {
    if (ref.kind === "url") return ref.semanticPath ?? rawTarget;
    const path = ref.semanticPath ?? rawTarget;
    if (!path) return "";
    if (ref.kind === "container" || ref.kind === "tag") return path.split("/").pop() ?? path;
    return (path.split("/").pop() ?? path).replace(/\.md$/i, "");
  }

  private rawTagFromSourcePath(path: string | undefined): string | null {
    if (!path) return null;
    if (path.startsWith("tag:")) return path.slice(4);
    return path;
  }

  private tagNameFromPath(path: string | undefined): string {
    if (!path) return "";
    const tagPath = path.replace(/^tag:/, "");
    const parts = tagPath.split("/");
    return this.settings.showFullTagName ? tagPath : parts[parts.length - 1] ?? tagPath;
  }

  private syntheticId(): NodeId {
    let id: NodeId;
    do { id = nodeId(`\u0001kplex-derived-tag:${++this.nextSyntheticId}`); }
    while (this.nodes.has(id));
    return id;
  }

  private ensureTagPath(rawTag: string, providedLeaf: SourceEntityRef, ownershipRecord: TagTreeOccurrence): CompiledGraphNode | null {
    const parts = rawTag.replace(/^tag:/, "").replace(/^#/, "").split("/").map((part) => part.trim()).filter(Boolean);
    let parent: CompiledGraphNode | null = null;
    let leaf: CompiledGraphNode | null = null;
    for (let index = 0; index < parts.length; index += 1) {
      const tagPath = parts.slice(0, index + 1).join("/");
      const semanticPath = `tag:${tagPath}`;
      const existingId = this.idBySemanticPath.get(semanticPath);
      let page = existingId ? this.nodes.get(existingId) ?? null : null;
      const useProvided = index === parts.length - 1 && providedLeaf.kind === "tag";
      if (!page || (useProvided && page.id !== providedLeaf.id)) {
        const ref: SourceEntityRef = useProvided ? providedLeaf : {
          id: this.syntheticId(), kind: "tag", state: "materialized", semanticPath,
        };
        page = this.ensureNode(ref, this.settings.showFullTagName ? tagPath : parts[index], null, false);
        if (!page) return null;
        if (!useProvided) this.syntheticNodes.add(page.id);
      }
      if (parent && !this.hasSourceKindBetween(parent, page, "tag-tree")) {
        this.addEvidence(ownershipRecord, parent, page, "child", RelationType.DEFINED, LinkDirection.FROM, {
          sourceKind: "tag-tree", definition: "tag-tree",
        });
      }
      parent = page;
      leaf = page;
    }
    return leaf;
  }

  private inferredRole(): Exclude<EvidenceRole, "hidden"> {
    if (this.settings.inferAllLinksAsFriends) return "left";
    return this.settings.inverseInfer ? "parent" : "child";
  }

  private addInferred(
    record: NormalizedSourceRecord,
    source: CompiledGraphNode,
    target: CompiledGraphNode,
    sourceKind: EvidenceSourceKind,
    extra?: Omit<EvidenceProvenance, "sourceKind">,
  ): void {
    this.addEvidence(record, source, target, this.inferredRole(), RelationType.INFERRED, LinkDirection.FROM, { sourceKind, ...extra });
  }

  private addHidden(record: NormalizedSourceRecord, source: CompiledGraphNode, target: CompiledGraphNode, provenance: EvidenceProvenance): void {
    if (source.id === target.id) return;
    const id = this.evidence.addHidden(this.keyForNode(source), this.keyForNode(target), provenance);
    if (id) this.ownershipByEvidenceId.set(id, this.ownership(record));
  }

  private addEvidence(
    record: NormalizedSourceRecord,
    source: CompiledGraphNode,
    target: CompiledGraphNode,
    role: Exclude<EvidenceRole, "hidden">,
    relationType: RelationType,
    direction: LinkDirection,
    provenance: EvidenceProvenance,
  ): void {
    if (source.id === target.id) return;
    const id = this.evidence.addPair(this.keyForNode(source), this.keyForNode(target), role, relationType, direction, provenance);
    if (id) this.ownershipByEvidenceId.set(id, this.ownership(record));
  }

  private ownership(record: NormalizedSourceRecord): CompiledEvidenceOwnership {
    return record.contribution
      ? { sourceId: record.contribution.source.id, revision: record.contribution.revision }
      : { sourceId: record.source.id, revision: record.sourceRevision };
  }

  private hasSourceKindBetween(source: CompiledGraphNode, target: CompiledGraphNode, sourceKind: EvidenceSourceKind): boolean {
    return this.evidence.between(this.keyForNode(source), this.keyForNode(target)).some((item) => item.sourceKind === sourceKind);
  }

  private pairCountKey(sourceKey: string, targetKey: string): string { return `${sourceKey}\u0000${targetKey}`; }

  private splitPairCountKey(key: string): [string, string] {
    const splitAt = key.indexOf("\u0000");
    return [key.slice(0, splitAt), key.slice(splitAt + 1)];
  }

  private async applyPresentationSuppression(): Promise<boolean> {
    const bySource = new Map<string, Set<string>>();
    for (const [key, counts] of this.presentationCounts) {
      if (counts.host <= 0 || counts.host > counts.visual) continue;
      const [sourceKey, targetKey] = this.splitPairCountKey(key);
      const targets = bySource.get(sourceKey) ?? new Set<string>();
      targets.add(targetKey);
      bySource.set(sourceKey, targets);
    }
    let processed = 0;
    for (const [sourceKey, targets] of bySource) {
      this.evidence.removeDeclarationsTouching(sourceKey, (item) =>
        item.declaredByPath === sourceKey && targets.has(item.declaredTargetPath) && item.sourceKind === "obsidian-link");
      processed += 1;
      if ((processed & 31) === 0 && !(await this.checkpoint())) return false;
    }
    return this.runtime.isCurrent();
  }

  private finalizeMetadata(node: CompiledGraphNode): void {
    const accumulator = this.metadata.get(node.id);
    if (accumulator) {
      const noteType = (accumulator.hasFrontmatterNoteType ? accumulator.frontmatterNoteType : undefined)
        ?? (accumulator.hasInlineNoteType ? accumulator.inlineNoteType : undefined);
      node.noteType = this.unwrapNoteType(noteType);
      const styleTags = node.tags.filter((tag) => this.settings.tagStyleList.some((prefix) => tag.startsWith(prefix)));
      const primaryTags = accumulator.primaryValues
        .flatMap((value) => typeof value === "string" ? value.match(/#[^\s\])$"'\\]+/g) ?? [] : []);
      node.primaryStyleTag = primaryTags.find((tag) => styleTags.some((styleTag) => styleTag.startsWith(tag))) ?? styleTags[0] ?? null;
      node.styleTags = styleTags.filter((tag) => tag !== node.primaryStyleTag);
      return;
    }
    const styleTags = node.tags.filter((tag) => this.settings.tagStyleList.some((prefix) => tag.startsWith(prefix)));
    node.primaryStyleTag = styleTags[0] ?? null;
    node.styleTags = styleTags.filter((tag) => tag !== node.primaryStyleTag);
  }

  private unwrapNoteType(value: SemanticMetadataOccurrence["value"] | undefined): string | null {
    const first: unknown = Array.isArray(value) ? value[0] : value;
    if (typeof first !== "string" && typeof first !== "number") return null;
    let text = String(first).trim();
    const wiki = text.match(/^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]$/);
    if (wiki) text = wiki[1].trim();
    text = text.replace(/^#/, "").trim();
    return text || null;
  }
}
