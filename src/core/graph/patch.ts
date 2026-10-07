/**
 * Portable per-source preparation using the full compiler and its canonical reference-policy gate.
 * Published identities are read lazily ONLY after selection; dormant candidates cannot seed targets
 * or demand a rebuild. Host revision fencing and synchronous publication remain caller-owned.
 */
import {
  NormalizedGraphCompiler,
  type CompiledGraphNode,
  type CompiledRelationEvidence,
  type GraphCompilerRuntime,
  type GraphCompilerSettings,
  type GraphCompilerSourceRead,
  type PortableGraphCompilation,
} from "./compiler";
import type { NodeId } from "./model";
import type { SelectedSourceRecord } from "./sourcePolicy";
import type {
  NormalizedSourceBatch,
  SourceEntityFact,
  SourceEntityRef,
  SourceReadBoundary,
} from "./source";

/**
 * Stable, scoped view of already-published graph identities used while preparing one source patch.
 * Implementations must answer by exact NodeId. They must not derive IDs from paths in core.
 */
export interface SourcePatchReadPort {
  entity(ref: SourceEntityRef): SourceEntityFact | undefined;
}

export type SourcePatchPreparationOutcome =
  | Readonly<{ outcome: "prepared"; patch: PreparedSourcePatch }>
  | Readonly<{ outcome: "cancelled" }>
  | Readonly<{ outcome: "rebuild-required"; reason: "source-not-published" | "materialized-entity-not-published" }>
  | Readonly<{ outcome: "rejected" }>;

/**
 * Host-free semantic result for one existing normalized source. Publication is intentionally not
 * part of this object: the host binds nodes/files and commits only after its current-revision fence.
 */
export class PreparedSourcePatch {
  constructor(
    readonly sourceId: NodeId,
    readonly compilation: PortableGraphCompilation,
    private readonly seededIds: ReadonlySet<NodeId>,
  ) {}

  get sourceNode(): CompiledGraphNode | undefined { return this.compilation.node(this.sourceId); }

  /** Nodes absent from the stable published read are semantic materialization candidates. */
  *newNodes(): IterableIterator<CompiledGraphNode> {
    for (const node of this.compilation.nodes.values()) {
      if (!this.seededIds.has(node.id)) yield node;
    }
  }

  /** Exact replacement contribution prepared from this source revision. */
  *declarations(): IterableIterator<CompiledRelationEvidence> {
    for (const declaration of this.compilation.declarations()) {
      if (declaration.contribution.sourceId === this.sourceId) yield declaration;
    }
  }
}

/**
 * Per-source semantic preparation reusing the accepted full compiler. Normalized producer reads
 * remain independently fenced; current graph access is a lazy identity read port rather than a
 * cloned graph/evidence model. Rejection is terminal for the preparation run.
 */
export class NormalizedSourcePatchPreparer {
  private readonly compiler: NormalizedGraphCompiler;
  private readonly reads = new Set<GraphCompilerSourceRead>();
  private readonly seededIds = new Set<NodeId>();
  private missingRequiredMaterializedEntity = false;
  private rejected = false;

  constructor(
    private readonly sourceId: NodeId,
    settings: GraphCompilerSettings,
    private readonly runtime: GraphCompilerRuntime,
    private readonly readPort: SourcePatchReadPort,
  ) {
    this.compiler = new NormalizedGraphCompiler(settings, runtime);
  }

  beginRead(boundary: SourceReadBoundary): GraphCompilerSourceRead {
    if (this.rejected) throw new Error("Source patch preparation is already rejected");
    const read = this.compiler.beginRead(boundary);
    this.reads.add(read);
    return read;
  }

  /** Validate/select through the full compiler before lazily seeding any selected endpoints. */
  async acceptBatch(read: GraphCompilerSourceRead, batch: NormalizedSourceBatch): Promise<boolean> {
    if (this.rejected || !this.reads.has(read) || !this.runtime.isCurrent()) return this.reject();
    // The compiler validates the cursor and selects neutral references before this callback.
    // Full and patch builds therefore cannot disagree about whether a target is active.
    if (!(await this.compiler.acceptBatch(read, batch, (record) => this.seedRecordEntities(record)))) return this.reject();
    return true;
  }

  completeRead(read: GraphCompilerSourceRead, currentBoundary: SourceReadBoundary): boolean {
    if (this.rejected || !this.reads.has(read) || !this.runtime.isCurrent()) return this.reject();
    if (!this.compiler.completeRead(read, currentBoundary)) return this.reject();
    this.reads.delete(read);
    return true;
  }

  async finish(): Promise<SourcePatchPreparationOutcome> {
    if (!this.runtime.isCurrent()) return { outcome: "cancelled" };
    if (this.rejected || this.reads.size) return { outcome: "rejected" };
    if (!this.seededIds.has(this.sourceId)) return { outcome: "rebuild-required", reason: "source-not-published" };
    if (this.missingRequiredMaterializedEntity) {
      return { outcome: "rebuild-required", reason: "materialized-entity-not-published" };
    }
    const compilation = await this.compiler.finish();
    if (!compilation) return this.runtime.isCurrent() ? { outcome: "rejected" } : { outcome: "cancelled" };
    if (!compilation.node(this.sourceId)) return { outcome: "rebuild-required", reason: "source-not-published" };
    return { outcome: "prepared", patch: new PreparedSourcePatch(this.sourceId, compilation, new Set(this.seededIds)) };
  }

  private reject(): false {
    this.rejected = true;
    return false;
  }

  /** Seed selected endpoints only; absent dormant targets must never request structural rebuilds. */
  private async seedRecordEntities(record: SelectedSourceRecord): Promise<boolean> {
    const refs: Array<Readonly<{ ref: SourceEntityRef; requiredPublished: boolean }>> = [
      { ref: record.source, requiredPublished: false },
    ];
    if (record.contribution) refs.push({ ref: record.contribution.source, requiredPublished: false });
    if (record.kind === "entity") refs.push({ ref: record.entity, requiredPublished: false });
    if ("target" in record) {
      refs.push({
        ref: record.target.entity,
        requiredPublished: this.requiresPublishedMaterializedTarget(record),
      });
    }
    if ((record.kind === "body-url" || record.kind === "selected-reference"
      && (!record.selection.image || record.selection.assignments.length > 0)) && record.origin) {
      refs.push({ ref: record.origin.entity, requiredPublished: false });
    }
    for (const { ref, requiredPublished } of refs) {
      if (this.seededIds.has(ref.id)) continue;
      const fact = this.readPort.entity(ref);
      if (!fact) {
        if (requiredPublished && ref.state === "materialized"
          && (ref.kind === "document" || ref.kind === "attachment" || ref.kind === "container")) {
          this.missingRequiredMaterializedEntity = true;
        }
        continue;
      }
      if (fact.entity.id !== ref.id || fact.source.id !== ref.id) return false;
      if (!(await this.compiler.seedEntityFact(fact))) return false;
      this.seededIds.add(ref.id);
    }
    return this.runtime.isCurrent();
  }

  /** Active semantic/structural targets require exact published host entities, unlike dormant facts. */
  private requiresPublishedMaterializedTarget(record: SelectedSourceRecord): boolean {
    return record.kind === "file-tree"
      || record.kind === "selected-reference"
      || record.kind === "date-property";
  }
}
