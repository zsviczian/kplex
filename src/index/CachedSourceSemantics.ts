/**
 * Internal SI4a orchestration: dependency postings identify candidate owners, validated cached
 * replay feeds the portable source-scope preparer, and source/host/policy stamps fence the result.
 * An explicitly supplied complete structural supplement replaces per-owner structure exactly once;
 * host-only/empty scopes use the same compiler without manufacturing a source. This still supplies
 * only private inputs: contributor authentication and scope finality belong to the requested readers.
 * No live GraphIndex, settings route, search index or persisted head is changed by this module.
 */
import { NormalizedGraphCompiler, type GraphCompilerRuntime, type GraphCompilerSettings, type PortableGraphCompilation } from "../core/graph/compiler";
import type { SourcePatchReadPort } from "../core/graph/patch";
import { NormalizedSourceScopePreparer } from "../core/graph/scoped";
import { estimateReferenceRecordBytes, MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH, MAX_REFERENCE_BATCH_ESTIMATED_BYTES,
  sourceGeneration, sourceSnapshotRevision, type SourceEntityFact, type FileTreeOccurrence, type TagTreeOccurrence, type NormalizedSourceRecord,
} from "../core/graph/source";
import type { SourcePostingKind, SourceReason } from "./SourceFacts";
import { CachedSourceReplay, cachedSourceMatches, type CachedSourceRequest, type SourceReplayWork } from "./SourceReplay";
import { selectedSourceFailure, type NeutralSourceRepository, type SelectedSourceResult, type SelectedSourceStamp } from "./SourceRepository";

export const MAX_CACHED_SCOPE_ESTIMATED_BYTES = 32 * 1024 * 1024;
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
  /** Conservative retained scope reservation, separate from one-owner replay buffers. */
  memory?: Readonly<{ owners: number; structure: number; compilation: number; transient: number; peakBytes: number }>;
}> | (Exclude<SelectedSourceResult<never>, { outcome: "ready" }> & Readonly<{ sourceId?: string }>);

/** Retained scope ceiling; pages and one-owner joins have separate, smaller byte/record limits. */
export const MAX_CACHED_SCOPE_RETAINED_BYTES = 768 * 1024 * 1024;

/** Account for plain head/fact fields, container overhead and UTF-16 strings without serialization. */
export function cachedScopeValueBytes(value: unknown): number {
  return estimateReferenceRecordBytes(value) + 128;
}

/** Reserve host closures/captured metadata plus explicit source/physical/observation coordinates. */
export function cachedOwnerBytes(request: CachedSourceRequest): number {
  return 2048 + cachedScopeValueBytes([request.sourceId, request.host.source, request.host.physical,
    request.host.observation, request.expected]);
}

/** Compare complete ordered selections one bounded head at a time, without giant serialized arrays. */
export async function sameCachedSelections(left: readonly SelectedSourceStamp[], right: readonly SelectedSourceStamp[],
  runtime: GraphCompilerRuntime): Promise<boolean> {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index++) {
    if (!runtime.isCurrent() || JSON.stringify(left[index]) !== JSON.stringify(right[index])) return false;
    if ((index + 1) % MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH === 0) {
      await runtime.yield(); if (!runtime.isCurrent()) return false;
    }
  }
  return runtime.isCurrent();
}

/** Close selected host observations synchronously after the last storage/host await. */
export function cachedOwnersCurrent(owners: Iterable<CachedSourceRequest>): SourceReason {
  for (const owner of owners) if (!owner.host.isCurrent()) return "stale";
  return "ready";
}

/** Check every selected host cooperatively, then close mutations during earlier awaited checkpoints. */
export async function validateCachedOwners(owners: Iterable<CachedSourceRequest>, runtime: GraphCompilerRuntime): Promise<SourceReason> {
  let visited = 0;
  for (const owner of owners) {
    if (!runtime.isCurrent()) return "cancelled";
    if (!owner.host.isCurrent()) return "stale";
    if (++visited % MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH === 0) {
      await runtime.yield();
      if (!runtime.isCurrent()) return "cancelled";
    }
  }
  // No await after this closing sweep: hosts without an event generation (including test hosts)
  // may mutate an already checked observation during the last cooperative continuation.
  if (cachedOwnersCurrent(owners) !== "ready") return "stale";
  return runtime.isCurrent() ? "ready" : "cancelled";
}

/** Copy all finite compiler policy inputs; never read mutable settings across an awaited batch. */
export function captureCachedSemanticSettings(settings: GraphCompilerSettings): GraphCompilerSettings {
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
    for (const query of queries) {
      if (!current()) return { outcome: "cancelled", reason: "cancelled" };
      const identity = JSON.stringify([query.kind, query.key]);
      if (lookups.has(identity)) continue;
      lookups.add(identity);
      const complete = await this.repository.querySources(query.kind, query.key, (batch) => {
        for (const id of batch) ids.add(id);
        return current();
      }, current);
      if (!current()) return { outcome: "cancelled", reason: "cancelled" };
      if (!complete) return this.repository.getDiagnostics().storage === "unavailable" ? { outcome: "storage-unavailable", reason: "storage-unavailable" }
        : { outcome: "pending-acquisition", reason: "catalog-uncertain" };
      if (!current()) return { outcome: "cancelled", reason: "cancelled" };
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
    readPort: SourcePatchReadPort, runtime: GraphCompilerRuntime & Readonly<{ retainedBytes?: number }>,
    structure?: CachedSemanticStructure): Promise<CachedSemanticPreparation> {
    // These arrays were consumed synchronously before R3 introduced continuation yields. Snapshot
    // their membership first so a caller cannot replace an unvisited entry while this read yields.
    if (requests.length * 128 + (structure?.length ?? 0) * 64 > MAX_CACHED_SCOPE_RETAINED_BYTES) return selectedSourceFailure("decode-budget");
    const capturedRequests = [...requests];
    const capturedStructure = structure === undefined ? undefined : [...structure];
    const policyRevision = policy.revision;
    if (!runtime.isCurrent() || !policy.isCurrent()) return selectedSourceFailure(!runtime.isCurrent() ? "cancelled" : "superseded");
    const settings = captureCachedSemanticSettings(policy.settings);
    const unique = new Map<string, CachedSourceRequest>();
    let requestIndex = 0;
    for (const request of capturedRequests) {
      const previous = unique.get(request.sourceId);
      if (previous && (previous.host.source.id !== request.host.source.id
        || JSON.stringify([previous.host.physical, previous.host.observation, previous.expected])
          !== JSON.stringify([request.host.physical, request.host.observation, request.expected]))) return selectedSourceFailure("superseded");
      unique.set(request.sourceId, request);
      if (++requestIndex % MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH === 0) {
        await runtime.yield();
        if (!runtime.isCurrent()) return selectedSourceFailure("cancelled");
      }
    }
    if (!unique.size && capturedStructure === undefined) return selectedSourceFailure("missing");
    // Admit supported hot scopes, while rejecting a pathological indivisible fact before copying
    // or compiling it. Aggregate required state is charged separately below, including host-only reads.
    let structureBytes = 0;
    if (capturedStructure) for (let index = 0; index < capturedStructure.length; index += 1) {
      structureBytes += cachedScopeValueBytes(capturedStructure[index]);
      if (structureBytes > MAX_CACHED_SCOPE_RETAINED_BYTES || estimateReferenceRecordBytes(capturedStructure[index]) > MAX_CACHED_SCOPE_ESTIMATED_BYTES) return selectedSourceFailure("decode-budget");
      if ((index + 1) % MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH === 0) {
        await runtime.yield();
        if (!runtime.isCurrent()) return selectedSourceFailure("cancelled");
      }
    }
    const owners = [...unique.values()], hostIds = new Set<string>();
    unique.clear(); capturedRequests.length = 0;
    const memory = { owners: 0, structure: structureBytes, compilation: 0, transient: 0, peakBytes: 0 };
    /** Reserve required state before compiling; never retain normalized batches after consumption. */
    const reserve = (): boolean => {
      memory.peakBytes = Math.max(memory.peakBytes, memory.owners + memory.structure + memory.compilation + memory.transient + (runtime.retainedBytes ?? 0));
      return memory.peakBytes <= MAX_CACHED_SCOPE_RETAINED_BYTES;
    };
    if (!reserve()) return selectedSourceFailure("decode-budget");
    for (let index = 0; index < owners.length; index += 1) {
      memory.owners += cachedOwnerBytes(owners[index]);
      if (!reserve()) return selectedSourceFailure("decode-budget");
      const id = owners[index].host.source.id;
      if (hostIds.has(id)) return selectedSourceFailure("invalid-frame");
      hostIds.add(id);
      if ((index + 1) % MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH === 0) {
        await runtime.yield();
        if (!runtime.isCurrent()) return selectedSourceFailure("cancelled");
      }
    }
    /** Hot callbacks use policy/demand generations; replay checks only its active source locally. */
    const reason = (): SourceReason => !runtime.isCurrent() ? "cancelled" : (!policy.isCurrent() || policy.revision !== policyRevision) ? "superseded"
      : "ready";
    const current = (): boolean => reason() === "ready";
    if (!current()) return selectedSourceFailure(reason());
    const scopedRuntime = { ...runtime, isCurrent: current };
    const initialValidation = await validateCachedOwners(owners, scopedRuntime);
    if (initialValidation !== "ready") return selectedSourceFailure(current() ? initialValidation : reason());
    /** Account for compiler ownership/indexes and a single live batch before accepting any records. */
    const accountBatch = (records: readonly NormalizedSourceRecord[]): boolean => {
      for (const record of records) memory.compilation += 256 + cachedScopeValueBytes(record);
      memory.transient = Math.max(memory.transient, records.reduce(
        /** One normalized batch plus repository, body and join decoder reservations. */
        (bytes, record) => bytes + cachedScopeValueBytes(record), 3 * 8 * 1024 * 1024));
      return reserve();
    };
    if (!owners.length) {
      const compilation = await this.prepareHostOnly(capturedStructure ?? [], settings, readPort, scopedRuntime, accountBatch);
      if (!reserve()) return selectedSourceFailure("decode-budget");
      if (!current()) return selectedSourceFailure(reason());
      if (!compilation) return selectedSourceFailure("invalid-frame");
      return { outcome: "ready", coverage: "source-owners", policyRevision, sources: [], compilation, work: [], memory };
    }
    const preparer = new NormalizedSourceScopePreparer(owners.map((request) => request.host.source.id), settings, scopedRuntime, readPort);
    const stamps: SelectedSourceStamp[] = [];
    const work: SourceReplayWork[] = [];
    for (const request of owners) {
      let read: ReturnType<NormalizedSourceScopePreparer["beginSource"]> = null;
      const replayRequest: CachedSourceRequest = capturedStructure === undefined ? request : { ...request, host: { ...request.host,
        /** The certified host stream replaces, rather than duplicates, each owner's tag/structural facts. */
        structure: async (emit): Promise<boolean> => {
          if (request === owners[0]) for (const record of capturedStructure) {
            if (!current() || !(await emit(record))) return false;
          }
          return current();
        },
      } };
      const result = await this.replay.read(replayRequest, scopedRuntime, async (batch) => {
        read ??= preparer.beginSource(request.host.source.id, batch.boundary);
        // Charging dormant/duplicate records too is conservative; retain no second graph mirror.
        return accountBatch(batch.records) && read !== null && await preparer.acceptBatch(read, batch);
      });
      if (!current()) return { ...selectedSourceFailure(reason()), sourceId: request.sourceId };
      if (!request.host.isCurrent()) return { ...selectedSourceFailure("stale"), sourceId: request.sourceId };
      if (!reserve()) return selectedSourceFailure("decode-budget");
      if (result.outcome !== "ready") return { ...result, sourceId: request.sourceId };
      if (!read || !preparer.completeSource(read, result.value.boundary)) return { ...selectedSourceFailure("invalid-frame"), sourceId: request.sourceId };
      // Discovery and replay may hold independently decoded heads until final authentication.
      memory.owners += 2 * cachedScopeValueBytes(result.stamp);
      if (!reserve()) return selectedSourceFailure("decode-budget");
      stamps.push(result.stamp); work.push(result.value.work);
    }
    const prepared = await preparer.finish();
    if (!current()) return selectedSourceFailure(reason());
    if (prepared.outcome !== "prepared") return selectedSourceFailure(prepared.outcome === "missing-entity" ? "missing" : "invalid-frame");
    for (let index = 0; index < owners.length; index += 1) {
      const matched = cachedSourceMatches(owners[index], stamps[index]);
      if ((index + 1) % MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH === 0) { await runtime.yield(); if (!current()) return selectedSourceFailure(reason()); }
      if (matched !== "ready") return { ...selectedSourceFailure(matched), sourceId: owners[index].sourceId };
    }
    const finalValidation = await validateCachedOwners(owners, scopedRuntime);
    if (finalValidation !== "ready") return selectedSourceFailure(current() ? finalValidation : reason());
    const selected = await this.repository.validateSelections(stamps, current);
    if (!current()) return selectedSourceFailure(reason());
    if (selected.reason !== "ready") return { ...selectedSourceFailure(selected.reason), sourceId: selected.sourceId };
    const hosts = cachedOwnersCurrent(owners);
    if (hosts !== "ready") return selectedSourceFailure(hosts);
    return { outcome: "ready", coverage: "source-owners", policyRevision, sources: stamps, compilation: prepared.compilation, work, memory };
  }

  /**
   * Compile a finalized structural-only (possibly empty) read through the canonical compiler.
   * Structural records need no policy selection before exact-ID entity seeding. Missing required
   * materialized facts remain compiler failures; this path never invents a sentinel source owner.
   */
  private async prepareHostOnly(records: CachedSemanticStructure, settings: GraphCompilerSettings,
    readPort: SourcePatchReadPort, runtime: GraphCompilerRuntime,
    accountBatch: (records: readonly NormalizedSourceRecord[]) => boolean): Promise<PortableGraphCompilation | null> {
    const compiler = new NormalizedGraphCompiler(settings, runtime);
    const seeded = new Set<string>();
    let seededRecords = 0;
    for (const record of records) {
      if (seededRecords > 0 && seededRecords % MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH === 0) {
        await runtime.yield();
        if (!runtime.isCurrent()) return null;
      }
      seededRecords += 1;
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
      if (!runtime.isCurrent() || !accountBatch(records.slice(start, end)) || !(await compiler.acceptBatch(read, {
        boundary, sequence: sequence++, records: records.slice(start, end), final: end === records.length,
      }))) return null;
      start = end;
      if (start < records.length) { await runtime.yield(); if (!runtime.isCurrent()) return null; }
    } while (start < records.length);
    if (!compiler.completeRead(read, boundary)) return null;
    return compiler.finish();
  }
}
