/**
 * Private source-scoped semantic preparation for cached replay. This is a bounded composition of
 * the accepted patch preparer/full compiler, not a second classifier or a complete pair query.
 * Storage and host lifetimes stay outside core; every read shares the caller's revision fence.
 */
import type { GraphCompilerRuntime, GraphCompilerSettings, GraphCompilerSourceRead, PortableGraphCompilation } from "./compiler";
import type { NodeId } from "./model";
import { NormalizedSourcePatchPreparer, type SourcePatchReadPort } from "./patch";
import type { NormalizedSourceBatch, SourceReadBoundary } from "./source";

/** A private compilation describes these owners only; it never proves global pair completeness. */
export type SourceScopePreparationResult =
  | Readonly<{ outcome: "prepared"; coverage: "source-owners"; sourceIds: readonly NodeId[]; compilation: PortableGraphCompilation }>
  | Readonly<{ outcome: "cancelled" | "rejected" | "missing-entity" }>;

/**
 * Compile each requested owner once, resolving competing declarations together through the same
 * compiler/evidence/resolver used by C14. The scope is caller-supplied, not discovered by semantics.
 */
export class NormalizedSourceScopePreparer {
  private readonly sourceIds: readonly NodeId[];
  private readonly delegate: NormalizedSourcePatchPreparer | null;
  private readonly started = new Set<NodeId>();
  private readonly completed = new Set<NodeId>();
  private readonly owners = new Map<GraphCompilerSourceRead, NodeId>();
  private readonly phaseReads = new Set<GraphCompilerSourceRead>();
  private rejected = false;

  /** Snapshot finite scope identity; no caller mutation can add owners to an in-flight preparation. */
  constructor(sourceIds: readonly NodeId[], settings: GraphCompilerSettings, private readonly runtime: GraphCompilerRuntime,
    readPort: SourcePatchReadPort) {
    this.sourceIds = [...new Set(sourceIds)];
    this.delegate = this.sourceIds.length ? new NormalizedSourcePatchPreparer(this.sourceIds[0], settings, runtime, readPort) : null;
  }

  /** Open exactly one canonical normalized read per source owner; duplicate ownership is rejected. */
  beginSource(sourceId: NodeId, boundary: SourceReadBoundary): GraphCompilerSourceRead | null {
    if (!this.delegate || this.rejected || !this.runtime.isCurrent() || !this.sourceIds.includes(sourceId) || this.started.has(sourceId)) {
      this.rejected = true;
      return null;
    }
    const read = this.delegate.beginRead(boundary);
    this.started.add(sourceId);
    this.owners.set(read, sourceId);
    return read;
  }

  /** Open an additional ordered phase read without consuming any source owner's one Markdown slot. */
  beginPhase(boundary: SourceReadBoundary): GraphCompilerSourceRead | null {
    if (!this.delegate || this.rejected || !this.runtime.isCurrent()) { this.rejected = true; return null; }
    const read = this.delegate.beginRead(boundary);
    this.phaseReads.add(read);
    return read;
  }

  /** Close one ordered phase after its producer has reached canonical terminal finality. */
  completePhase(read: GraphCompilerSourceRead, boundary: SourceReadBoundary): boolean {
    if (!this.delegate || this.rejected || !this.phaseReads.has(read) || !this.delegate.completeRead(read, boundary)) {
      this.rejected = true; return false;
    }
    this.phaseReads.delete(read); return true;
  }

  /** Delegate cursor/finality, reference selection and lazy exact-ID seeding to the accepted owner. */
  async acceptBatch(read: GraphCompilerSourceRead, batch: NormalizedSourceBatch): Promise<boolean> {
    if (!this.delegate || this.rejected || !this.owners.has(read) && !this.phaseReads.has(read)) return false;
    const accepted = await this.delegate.acceptBatch(read, batch);
    if (!accepted || !this.runtime.isCurrent()) this.rejected = true;
    return !this.rejected;
  }

  /** Close a source only after its producer has validated all selected families and host facts. */
  completeSource(read: GraphCompilerSourceRead, boundary: SourceReadBoundary): boolean {
    const owner = this.owners.get(read);
    if (!this.delegate || this.rejected || owner === undefined || !this.delegate.completeRead(read, boundary)) {
      this.rejected = true;
      return false;
    }
    this.owners.delete(read);
    this.completed.add(owner);
    return true;
  }

  /** Return no partial semantics: every requested source must finish under the same caller fence. */
  async finish(): Promise<SourceScopePreparationResult> {
    if (!this.runtime.isCurrent()) return { outcome: "cancelled" };
    if (!this.delegate || this.rejected || this.phaseReads.size || this.owners.size
      || this.completed.size !== this.sourceIds.length) return { outcome: "rejected" };
    const result = await this.delegate.finish();
    if (!this.runtime.isCurrent() || result.outcome === "cancelled") return { outcome: "cancelled" };
    if (result.outcome === "rebuild-required") return { outcome: "missing-entity" };
    if (result.outcome !== "prepared") return { outcome: "rejected" };
    if (this.sourceIds.some((id) => !result.patch.compilation.node(id))) return { outcome: "missing-entity" };
    return { outcome: "prepared", coverage: "source-owners", sourceIds: this.sourceIds, compilation: result.patch.compilation };
  }
}
