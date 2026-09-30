/**
 * Internal SI4a orchestration: dependency postings identify candidate owners, validated cached
 * replay feeds the portable source-scope preparer, and source/host/policy stamps fence the result.
 * An explicitly supplied complete structural supplement replaces per-owner structure exactly once;
 * host-only/empty scopes use the same compiler without manufacturing a source. This still supplies
 * only private inputs: contributor authentication and pair finality belong to the requested reader.
 * No live GraphIndex, settings route, search index or persisted head is changed by this module.
 */
import { NormalizedGraphCompiler, type GraphCompilerRuntime, type GraphCompilerSettings, type PortableGraphCompilation } from "../core/graph/compiler";
import type { SourcePatchReadPort } from "../core/graph/patch";
import { NormalizedSourceScopePreparer } from "../core/graph/scoped";
import { estimateReferenceRecordBytes, MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH, MAX_REFERENCE_BATCH_ESTIMATED_BYTES,
  sourceGeneration, sourceSnapshotRevision, type SourceEntityFact, type FileTreeOccurrence, type TagTreeOccurrence,
} from "../core/graph/source";
import type { SourcePostingKind, SourceReason } from "./SourceFacts";
import { CachedSourceReplay, cachedSourceMatches, type CachedSourceRequest, type SourceReplayWork } from "./SourceReplay";
import { selectedSourceFailure, type NeutralSourceRepository, type SelectedSourceResult, type SelectedSourceStamp } from "./SourceRepository";

export const MAX_CACHED_SCOPE_SOURCES = 256;
export const MAX_CACHED_SCOPE_ESTIMATED_BYTES = 32 * 1024 * 1024;
export const MAX_CACHED_SCOPE_STRUCTURAL_FACTS = 1024;
/** Explicit complete host structure for this scope, held stable under the caller's host fence. */
export type CachedSemanticStructure = readonly (SourceEntityFact | FileTreeOccurrence | TagTreeOccurrence)[];
/** The caller's monotonic policy token fences in-place settings edits as well as replacement. */
export type CachedSemanticPolicy = Readonly<{ revision: string; settings: GraphCompilerSettings; isCurrent(): boolean }>;
/** These results are dependency candidates, never proof of relationship absence or pair completeness. */
export type CachedSourceCandidates =
  | Readonly<{ outcome: "candidates"; coverage: "candidates-only"; sourceIds: readonly string[] }>
  | Readonly<{ outcome: "pending-acquisition" | "stale" | "cancelled" | "storage-unavailable"; reason: SourceReason }>;
/** A private result is valid only at its captured source/host/policy revisions. It is not published. */
export type CachedSemanticPreparation = Readonly<{
  outcome: "ready";
  coverage: "source-owners";
  policyRevision: string;
  sources: readonly SelectedSourceStamp[];
  compilation: PortableGraphCompilation;
  work: readonly SourceReplayWork[];
}> | (Exclude<SelectedSourceResult<never>, { outcome: "ready" }> & Readonly<{ sourceId?: string }>);

/** Copy all finite compiler policy inputs; never read mutable settings across an awaited batch. */
function capturePolicy(settings: GraphCompilerSettings): GraphCompilerSettings {
  return { ...settings, hierarchy: {
    hidden: [...settings.hierarchy.hidden], parents: [...settings.hierarchy.parents], children: [...settings.hierarchy.children],
    leftFriends: [...settings.hierarchy.leftFriends], rightFriends: [...settings.hierarchy.rightFriends],
    previous: [...settings.hierarchy.previous], next: [...settings.hierarchy.next],
  }, tagStyleList: [...settings.tagStyleList] };
}

/** Select and prepare a finite owner scope; explicit later publication is outside this capability. */
export class CachedSourceSemanticReader {
  private readonly replay: CachedSourceReplay;
  /** Share the existing connection/repository owner rather than opening an independent database. */
  constructor(private readonly repository: NeutralSourceRepository) { this.replay = new CachedSourceReplay(repository); }

  /**
   * Union field/target/literal/family dependencies with one owner entry. v5 lacks authenticated
   * pair/structural/URL coverage, so even success is labelled candidates-only. An interrupted or
   * known-incomplete lookup discards all candidates rather than returning an empty relationship.
   */
  async discover(queries: readonly Readonly<{ kind: SourcePostingKind; key: string }>[],
    current: () => boolean): Promise<CachedSourceCandidates> {
    const ids = new Set<string>();
    const lookups = new Set<string>();
    let exceeded = false;
    if (queries.length > MAX_CACHED_SCOPE_SOURCES) return { outcome: "pending-acquisition", reason: "backpressure" };
    for (const query of queries) {
      if (!current()) return { outcome: "cancelled", reason: "cancelled" };
      const identity = JSON.stringify([query.kind, query.key]);
      if (lookups.has(identity)) continue;
      lookups.add(identity);
      const complete = await this.repository.querySources(query.kind, query.key, (batch) => {
        for (const id of batch) {
          if (ids.size >= MAX_CACHED_SCOPE_SOURCES && !ids.has(id)) { exceeded = true; return false; }
          ids.add(id);
        }
        return current();
      }, current);
      if (!current()) return { outcome: "cancelled", reason: "cancelled" };
      if (!complete) return exceeded ? { outcome: "pending-acquisition", reason: "backpressure" }
        : this.repository.getDiagnostics().storage === "unavailable" ? { outcome: "storage-unavailable", reason: "storage-unavailable" }
        : { outcome: "pending-acquisition", reason: "catalog-uncertain" };
    }
    return { outcome: "candidates", coverage: "candidates-only", sourceIds: [...ids] };
  }

  /**
   * Replay each owner once, compile competing contributions together, then atomically recheck the
   * selected heads. No publication callback exists. A failure identifies the affected source only;
   * it neither invalidates intact source heads nor retries/reacquires anything implicitly. Explicit
   * structure replaces all owner supplements and is emitted once, preserving original contribution
   * ownership. Only that explicit mode permits zero owners; it does not authenticate a negative.
   */
  async prepare(requests: readonly CachedSourceRequest[], policy: CachedSemanticPolicy,
    readPort: SourcePatchReadPort, runtime: GraphCompilerRuntime,
    structure?: CachedSemanticStructure): Promise<CachedSemanticPreparation> {
    const unique = new Map<string, CachedSourceRequest>();
    for (const request of requests) {
      const previous = unique.get(request.sourceId);
      if (previous && (previous.host.source.id !== request.host.source.id
        || JSON.stringify([previous.host.physical, previous.host.observation, previous.expected])
          !== JSON.stringify([request.host.physical, request.host.observation, request.expected]))) return selectedSourceFailure("superseded");
      unique.set(request.sourceId, request);
      if (unique.size > MAX_CACHED_SCOPE_SOURCES) return selectedSourceFailure("backpressure");
    }
    if (!unique.size && structure === undefined) return selectedSourceFailure("missing");
    if (structure && structure.length > MAX_CACHED_SCOPE_STRUCTURAL_FACTS) return selectedSourceFailure("backpressure");
    const structuralBytes = structure?.reduce((total, record) => total + estimateReferenceRecordBytes(record), 0) ?? 0;
    if (structuralBytes > MAX_CACHED_SCOPE_ESTIMATED_BYTES) return selectedSourceFailure("decode-budget");
    const owners = [...unique.values()];
    if (new Set(owners.map((request) => request.host.source.id)).size !== owners.length) return selectedSourceFailure("invalid-frame");
    const policyRevision = policy.revision;
    /** Source and host observations remain independent from policy and demand cancellation. */
    const reason = (): SourceReason => !runtime.isCurrent() ? "cancelled" : (!policy.isCurrent() || policy.revision !== policyRevision) ? "superseded"
      : owners.some((request) => !request.host.isCurrent()) ? "stale" : "ready";
    const current = (): boolean => reason() === "ready";
    if (!current()) return selectedSourceFailure(reason());
    const settings = capturePolicy(policy.settings);
    const scopedRuntime = { ...runtime, isCurrent: current };
    if (!owners.length) {
      const compilation = await this.prepareHostOnly(structure ?? [], settings, readPort, scopedRuntime);
      if (!current()) return selectedSourceFailure(reason());
      if (!compilation) return selectedSourceFailure("invalid-frame");
      return { outcome: "ready", coverage: "source-owners", policyRevision, sources: [], compilation, work: [] };
    }
    const preparer = new NormalizedSourceScopePreparer(owners.map((request) => request.host.source.id), settings, scopedRuntime, readPort);
    const stamps: SelectedSourceStamp[] = [];
    const work: SourceReplayWork[] = [];
    let bytes = 0;
    for (const request of owners) {
      let read: ReturnType<NormalizedSourceScopePreparer["beginSource"]> = null;
      let budgetExceeded = false;
      const replayRequest: CachedSourceRequest = structure === undefined ? request : { ...request, host: { ...request.host,
        /** The certified host stream replaces, rather than duplicates, each owner's tag/structural facts. */
        structure: async (emit): Promise<boolean> => {
          if (request === owners[0]) for (const record of structure) {
            if (!current() || !(await emit(record))) return false;
          }
          return current();
        },
      } };
      const result = await this.replay.read(replayRequest, scopedRuntime, async (batch) => {
        for (const record of batch.records) bytes += estimateReferenceRecordBytes(record);
        if (bytes > MAX_CACHED_SCOPE_ESTIMATED_BYTES) { budgetExceeded = true; return false; }
        read ??= preparer.beginSource(request.host.source.id, batch.boundary);
        return read !== null && await preparer.acceptBatch(read, batch);
      });
      if (!current()) return { ...selectedSourceFailure(reason()), sourceId: request.sourceId };
      if (budgetExceeded) return { ...selectedSourceFailure("decode-budget"), sourceId: request.sourceId };
      if (result.outcome !== "ready") return { ...result, sourceId: request.sourceId };
      if (!read || !preparer.completeSource(read, result.value.boundary)) return { ...selectedSourceFailure("invalid-frame"), sourceId: request.sourceId };
      stamps.push(result.stamp); work.push(result.value.work);
    }
    const prepared = await preparer.finish();
    if (!current()) return selectedSourceFailure(reason());
    if (prepared.outcome !== "prepared") return selectedSourceFailure(prepared.outcome === "missing-entity" ? "missing" : "invalid-frame");
    for (let index = 0; index < owners.length; index += 1) {
      const matched = cachedSourceMatches(owners[index], stamps[index]);
      if (matched !== "ready") return { ...selectedSourceFailure(matched), sourceId: owners[index].sourceId };
    }
    const selected = await this.repository.validateSelections(stamps, current);
    if (!current()) return selectedSourceFailure(reason());
    if (selected.reason !== "ready") return { ...selectedSourceFailure(selected.reason), sourceId: selected.sourceId };
    return { outcome: "ready", coverage: "source-owners", policyRevision, sources: stamps, compilation: prepared.compilation, work };
  }

  /**
   * Compile a finalized structural-only (possibly empty) read through the canonical compiler.
   * Structural records need no policy selection before exact-ID entity seeding. Missing required
   * materialized facts remain compiler failures; this path never invents a sentinel source owner.
   */
  private async prepareHostOnly(records: CachedSemanticStructure, settings: GraphCompilerSettings,
    readPort: SourcePatchReadPort, runtime: GraphCompilerRuntime): Promise<PortableGraphCompilation | null> {
    const compiler = new NormalizedGraphCompiler(settings, runtime);
    const seeded = new Set<string>();
    for (const record of records) {
      for (const ref of [record.source, record.kind === "entity" ? record.entity : record.target.entity]) {
        if (!runtime.isCurrent()) return null;
        if (seeded.has(ref.id)) continue;
        const fact = readPort.entity(ref);
        if (!fact) continue;
        if (fact.entity.id !== ref.id || fact.source.id !== ref.id || !(await compiler.seedEntityFact(fact))) return null;
        seeded.add(ref.id);
      }
    }
    const boundary = { generation: sourceGeneration("cached-host-structure"), snapshotRevision: sourceSnapshotRevision("private") };
    const read = compiler.beginRead(boundary);
    let sequence = 0, start = 0;
    do {
      let end = start, bytes = 0;
      while (end < records.length && end - start < MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH) {
        const size = estimateReferenceRecordBytes(records[end]);
        if (end > start && bytes + size > MAX_REFERENCE_BATCH_ESTIMATED_BYTES) break;
        bytes += size; end++;
      }
      if (!runtime.isCurrent() || !(await compiler.acceptBatch(read, {
        boundary, sequence: sequence++, records: records.slice(start, end), final: end === records.length,
      }))) return null;
      start = end;
    } while (start < records.length);
    if (!compiler.completeRead(read, boundary)) return null;
    return compiler.finish();
  }
}
