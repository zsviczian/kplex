/**
 * Portable source-to-evidence compiler. Semantic rules remain canonical here; presentation fields
 * are a finite compatibility output delegated to the shared presentation owner until SI4. Neutral
 * reference reads use sourcePolicy before materialization; only active evidence survives compilation.
 * The node projection reuses that policy/materialization owner without retaining or resolving evidence;
 * its distinct result cannot authorize relationship readiness.
 */
import { canonicalTagParts } from "./tagPaths";
import { selectStyleTags, tagDisplayName, unwrapNoteType } from "./presentation";
import {
  ReferencePolicySelector, ReferenceSourcePolicyRead,
  type ReferenceAssignment, type SelectedReferenceCandidate, type SelectedSourceRecord,
} from "./sourcePolicy";
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
  thumbnailProperty?: string;
  nodeImageProperty?: string;
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

/** Complete node vocabulary only; empty neighbours never assert complete relationship coverage. */
export type PortableNodeCompilation = Readonly<{
  kind: "node-metadata";
  nodes: ReadonlyMap<NodeId, CompiledGraphNode>;
  discoveredFields: ReadonlyMap<string, { name: string; count: number }>;
}>;

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

/**
 * One bounded producer read. The compiler mutates only its private state; a rejected/stale read
 * therefore discards the whole compilation rather than exposing a partial graph.
 */
export class GraphCompilerSourceRead {
  cursor: SourceBatchCursor;
  complete = false;

  readonly selection: ReferenceSourcePolicyRead;

  /** Capture the producer cursor and its policy decoder; payloads never escape this read's lifetime. */
  constructor(readonly boundary: SourceReadBoundary, selector: ReferencePolicySelector) {
    this.cursor = beginSourceRead(boundary);
    this.selection = new ReferenceSourcePolicyRead(selector);
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

/** Compile validated source reads through one captured policy into a private semantic graph. */
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
  private readonly referenceSelector: ReferencePolicySelector;
  /** Temporary order keys for already-created evidence, not a second source/graph representation. */
  private readonly referenceOrderByEvidenceId = new Map<string, readonly number[]>();
  private readonly referenceSourceOrder = new Map<NodeId, number>();
  private sliceStartedAt: number;
  private finished = false;
  private rejected = false;
  private nextResolverKey = 0;
  private nextSyntheticId = 0;

  /** Capture reference selection once; node projection skips evidence without changing materialization. */
  constructor(
    private readonly settings: GraphCompilerSettings,
    private readonly runtime: GraphCompilerRuntime,
    private readonly projection: "graph" | "nodes" = "graph",
  ) {
    this.sliceStartedAt = runtime.now();
    this.referenceSelector = new ReferencePolicySelector(settings);
  }

  /** Open a producer-local cursor/decoder under the compiler's captured reference policy. */
  beginRead(boundary: SourceReadBoundary): GraphCompilerSourceRead {
    if (this.finished) throw new Error("Graph compiler is already finalized");
    const read = new GraphCompilerSourceRead(boundary, this.referenceSelector);
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

  /**
   * Validate and select each record before the optional patch seeder sees it. The shared decoder
   * is the only policy gate for full and patch builds; dormant values cause no graph reads/writes.
   */
  async acceptBatch(
    read: GraphCompilerSourceRead,
    batch: NormalizedSourceBatch,
    beforeConsume?: (record: SelectedSourceRecord) => Promise<boolean>,
  ): Promise<boolean> {
    if (this.finished || this.rejected || read.complete || !this.openReads.has(read) || !this.runtime.isCurrent()) return this.reject();
    const accepted = acceptSourceBatch(read.cursor, batch);
    if (!accepted.accepted) return this.reject();
    for (const record of batch.records) {
      const selected = read.selection.accept(record);
      if (!selected.accepted) return this.reject();
      if (selected.record) {
        if (beforeConsume && !(await beforeConsume(selected.record))) return this.reject();
        if (!this.runtime.isCurrent()) return this.reject();
        const consumed = this.consumeRecord(selected.record);
        if (!(typeof consumed === "boolean" ? consumed : await consumed)) return this.reject();
      }
      if (!(await this.checkpoint())) return this.reject();
    }
    read.cursor = accepted.cursor;
    return this.runtime.isCurrent() || this.reject();
  }

  /** Close only a current, complete cursor and complete value frame; release its last payload. */
  completeRead(read: GraphCompilerSourceRead, currentBoundary: SourceReadBoundary): boolean {
    if (this.finished || this.rejected || read.complete || !this.openReads.has(read) || !this.runtime.isCurrent()) return this.reject();
    if (!sourceReadCanPublish(read.cursor, currentBoundary) || !read.selection.canComplete()) return this.reject();
    read.selection.release();
    read.complete = true;
    this.openReads.delete(read);
    return true;
  }

  /** Reconcile private evidence order/suppression and resolve; cancellation never publishes a graph. */
  async finish(): Promise<PortableGraphCompilation | null> {
    if (this.projection !== "graph" || !(await this.finalizeNodes())) return null;

    // Natural physical collection order must not replace the accepted configured-field order.
    // Reorder only the existing private evidence buckets; no raw candidate replay/DTO is retained.
    if (this.referenceOrderByEvidenceId.size && !(await this.evidence.orderDeclarationsCooperative(
      (left, right) => this.compareDeclarationOrder(left, right), () => this.checkpoint(),
    ))) return null;
    this.referenceOrderByEvidenceId.clear();
    this.referenceSourceOrder.clear();
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

  /**
   * Finish global vocabulary under the same terminal read/materialization fences as a full build.
   * No evidence ordering, suppression or relationship resolution runs in this projection.
   */
  async finishNodes(): Promise<PortableNodeCompilation | null> {
    if (this.projection !== "nodes" || !(await this.finalizeNodes())) return null;
    return { kind: "node-metadata", nodes: this.nodes, discoveredFields: this.discoveredFields };
  }

  /** Finalize finite metadata only after every producer and required physical entity has closed. */
  private async finalizeNodes(): Promise<boolean> {
    if (this.finished || this.rejected || this.openReads.size || !this.runtime.isCurrent()) return false;
    this.finished = true;
    for (const id of this.requiredMaterializedEntityFacts) if (!this.entityFactSeen.has(id)) return false;
    let processed = 0;
    for (const node of this.nodes.values()) {
      this.finalizeMetadata(node);
      if ((++processed & 127) === 0 && !(await this.checkpoint())) return false;
    }
    return this.runtime.isCurrent();
  }

  /** Terminal rejection releases any partially assembled value payloads and temporary order keys. */
  private reject(): false {
    for (const read of this.openReads) read.selection.release();
    this.openReads.clear();
    this.referenceOrderByEvidenceId.clear();
    this.referenceSourceOrder.clear();
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

  /** Consume selected operations only; dense URL alias accumulation cooperates within its record. */
  private consumeRecord(record: SelectedSourceRecord): boolean | Promise<boolean> {
    switch (record.kind) {
      case "entity": return this.consumeEntity(record);
      case "file-tree": return this.consumeFileTree(record);
      case "tag-tree": return this.consumeTagTree(record);
      case "obsidian-link":
      case "unresolved-link": return this.consumeHostLink(record);
      case "selected-reference": return this.consumeReference(record);
      case "field-name": return this.consumeFieldName(record);
      case "semantic-metadata": return this.consumeSemanticMetadata(record);
      case "date-property": return this.consumeDate(record);
      case "body-url": return this.consumeBodyUrl(record);
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

  /** Materialize only after canonical selection; raw physical names never encode current roles. */
  private consumeReference(record: SelectedReferenceCandidate): boolean {
    const source = this.ensureNode(record.source, this.fallbackName(record.source));
    const target = this.ensureNode(record.target.entity, this.fallbackName(record.target.entity, record.target.rawTarget));
    if (!source || !target) return false;
    const value = record.value;
    for (const assignment of record.selection.assignments) {
      const location = value.location;
      const provenance: EvidenceProvenance = {
        sourceKind: value.surface === "frontmatter" ? "frontmatter-ontology" : "inline-ontology",
        definition: assignment.normalizedFieldName,
        // The accepted evidence oracle uses configured frontmatter labels but actual inline spelling.
        // The neutral value header separately preserves the exact physical frontmatter key.
        fieldName: value.surface === "frontmatter" ? assignment.configuredFieldName : value.fieldName,
        ...(record.rawValue === undefined ? {} : { rawValue: record.rawValue }),
        ...(location?.line === undefined ? {} : { line: location.line }),
        ...(location?.start === undefined ? {} : { start: location.start }),
        ...(location?.end === undefined ? {} : { end: location.end }),
      };
      if (assignment.role === "hidden") this.addHidden(record, source, target, provenance, assignment);
      else this.addEvidence(record, source, target, assignment.role, RelationType.DEFINED, LinkDirection.FROM, provenance, assignment);
    }
    if (this.projection === "graph" && record.selection.image) {
      const key = this.pairCountKey(this.keyForNode(source), this.keyForNode(target));
      const count = this.presentationCounts.get(key) ?? { visual: 0, host: record.hostOccurrenceCount };
      count.visual += 1;
      count.host = record.hostOccurrenceCount;
      this.presentationCounts.set(key, count);
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

  /** Keep the primary display label/declaration while collecting every search label in bounded host slices. */
  private async consumeBodyUrl(record: BodyUrlOccurrence): Promise<boolean> {
    if (record.target.resolvedBy !== "url") return false;
    const source = this.ensureNode(record.source, this.fallbackName(record.source));
    const target = this.ensureNode(record.target.entity, record.label || record.target.rawTarget, record.target.rawTarget);
    if (!source || !target) return false;
    if (record.label && record.label !== target.url && !this.urlLabels.has(target.id)) this.urlLabels.set(target.id, record.label);
    if (record.label && record.label !== target.url && !target.aliases.includes(record.label)) target.aliases.push(record.label);
    const retainedAliases = new Set(target.aliases);
    let processedAliases = 0;
    for (const alias of record.aliases ?? []) {
      if (alias && alias !== target.url && !retainedAliases.has(alias)) {
        retainedAliases.add(alias); target.aliases.push(alias);
      }
      if ((++processedAliases & 127) === 0 && !(await this.checkpoint())) return false;
    }
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
    return tagDisplayName(path, this.settings.showFullTagName);
  }

  private syntheticId(): NodeId {
    let id: NodeId;
    do { id = nodeId(`\u0001kplex-derived-tag:${++this.nextSyntheticId}`); }
    while (this.nodes.has(id));
    return id;
  }

  /** Materialize canonical ancestors incrementally; only segment parts precede ordinary node allocation bounds. */
  private ensureTagPath(rawTag: string, providedLeaf: SourceEntityRef, ownershipRecord: TagTreeOccurrence): CompiledGraphNode | null {
    const parts = canonicalTagParts(rawTag.replace(/^tag:/, ""));
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
    record: SelectedSourceRecord,
    source: CompiledGraphNode,
    target: CompiledGraphNode,
    sourceKind: EvidenceSourceKind,
    extra?: Omit<EvidenceProvenance, "sourceKind">,
  ): void {
    this.addEvidence(record, source, target, this.inferredRole(), RelationType.INFERRED, LinkDirection.FROM, { sourceKind, ...extra });
  }

  /** Add one directional hidden declaration and remember its policy interpretation order. */
  /** Record the original directional hidden declaration, retaining selected reference order. */
  private addHidden(record: SelectedSourceRecord, source: CompiledGraphNode, target: CompiledGraphNode,
    provenance: EvidenceProvenance, assignment?: ReferenceAssignment): void {
    if (this.projection === "nodes" || source.id === target.id) return;
    const id = this.evidence.addHidden(this.keyForNode(source), this.keyForNode(target), provenance);
    if (id) {
      this.ownershipByEvidenceId.set(id, this.ownership(record));
      this.rememberReferenceOrder(id, record, assignment);
    }
  }

  /** Add one original declaration and its physical contribution; reference order is reconciled later. */
  private addEvidence(
    record: SelectedSourceRecord,
    source: CompiledGraphNode,
    target: CompiledGraphNode,
    role: Exclude<EvidenceRole, "hidden">,
    relationType: RelationType,
    direction: LinkDirection,
    provenance: EvidenceProvenance,
    assignment?: ReferenceAssignment,
  ): void {
    if (this.projection === "nodes" || source.id === target.id) return;
    const id = this.evidence.addPair(this.keyForNode(source), this.keyForNode(target), role, relationType, direction, provenance);
    if (id) {
      this.ownershipByEvidenceId.set(id, this.ownership(record));
      this.rememberReferenceOrder(id, record, assignment);
    }
  }

  /** Retain compact ordering metadata for evidence only until final private reconciliation. */
  private rememberReferenceOrder(id: string, record: SelectedSourceRecord, assignment?: ReferenceAssignment): void {
    if (record.kind !== "selected-reference" || !assignment) return;
    const sequence = this.declarationSequence(id);
    const sourceOrder = this.referenceSourceOrder.get(record.source.id) ?? sequence;
    this.referenceSourceOrder.set(record.source.id, sourceOrder);
    this.referenceOrderByEvidenceId.set(id, [sourceOrder, assignment.fieldOrder,
      record.value.surface === "frontmatter" ? 0 : 1, record.value.ordinal, record.ordinal, assignment.assignmentOrder]);
  }

  /** Evidence IDs are compiler-generated counters, never opaque source/entity identifiers. */
  private declarationSequence(id: string): number { return Number(id.slice(3, id.indexOf(":"))); }

  /** Restore configured labels, physical values/targets and exact-assignment multiplicity order. */
  private compareDeclarationOrder(left: RelationEvidence, right: RelationEvidence): number {
    const leftOrder = this.referenceOrderByEvidenceId.get(left.id);
    const rightOrder = this.referenceOrderByEvidenceId.get(right.id);
    const first = (leftOrder?.[0] ?? this.declarationSequence(left.id))
      - (rightOrder?.[0] ?? this.declarationSequence(right.id));
    if (first || !leftOrder || !rightOrder) return first;
    for (let index = 1; index < leftOrder.length; index += 1) {
      const difference = leftOrder[index] - rightOrder[index];
      if (difference) return difference;
    }
    return 0;
  }

  /** Preserve explicit contribution ownership; selected references inherit their observed source revision. */
  private ownership(record: SelectedSourceRecord): CompiledEvidenceOwnership {
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

  /** Prepare compatibility facets through the same presentation rules used after restoration. */
  private finalizeMetadata(node: CompiledGraphNode): void {
    const accumulator = this.metadata.get(node.id);
    node.noteType = unwrapNoteType(accumulator?.frontmatterNoteType ?? accumulator?.inlineNoteType);
    Object.assign(node, selectStyleTags(node.tags, this.settings.tagStyleList, accumulator?.primaryValues ?? []));
  }
}
