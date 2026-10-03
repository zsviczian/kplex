/**
 * Private SI4 direct-neighbor order preparation. A v4 contributor coordinate restores the full
 * builder's structural -> resolved host -> unresolved host -> Markdown phase order for only the
 * finite complete center-incidence cover. Every selected source is pinned to its exact persisted
 * head and replayed through the existing canonical compiler; no graph copy, alternate classifier,
 * sibling closure or substitute sort exists here. Production has no native host-order finality
 * capability yet, so callers without the explicit capability fail closed before exposing a prefix.
 */
import type { GraphCompilerRuntime } from "../core/graph/compiler";
import type { SourcePatchReadPort } from "../core/graph/patch";
import type { NodeId } from "../core/graph/model";
import { NormalizedSourceScopePreparer } from "../core/graph/scoped";
import {
  estimateReferenceRecordBytes, MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH, MAX_REFERENCE_BATCH_ESTIMATED_BYTES,
  sourceGeneration, sourceSnapshotRevision, type SourceEntityRef,
} from "../core/graph/source";
import type { CachedPairCapture } from "./CachedRequestedPair";
import { CachedSourceSemanticReader, captureCachedSemanticSettings, MAX_CACHED_SCOPE_ESTIMATED_BYTES,
  type CachedSemanticPolicy, type CachedSemanticPreparation, type CachedSemanticStructure } from "./CachedSourceSemantics";
import type { ContributorCertificate, ContributorDirectOrderDiscoveryResult, ContributorFailure,
  ContributorHostOrderValidity, SourceContributorDiscovery } from "./SourceContributorDiscovery";
import { CachedSourceReplay, cachedSourceMatches, type CachedSourceReplayPhase, type CachedSourceRequest,
  type SourceReplayWork } from "./SourceReplay";
import type { SourceReason } from "./SourceFacts";
import { selectedSourceFailure, type NeutralSourceRepository, type SelectedSourceStamp } from "./SourceRepository";

/** One finite complete direct-neighbor scope; direct incidence is authenticated by the center key. */
export type CachedDirectOrderRequest = Readonly<{ kind: "direct-order"; center: SourceEntityRef }>;
/** Native evidence must eventually prove MetadataCache owner order/currentness after the final await. */
export type CachedDirectOrderHostValidity = ContributorHostOrderValidity;
type Failure = ContributorFailure | Exclude<CachedSemanticPreparation, { outcome: "ready" }>;
type Discovered = Extract<ContributorDirectOrderDiscoveryResult, { outcome: "ready" }>;
/** A ready result is private compiler input only; GraphIndex remains the owner of visible-list sorting. */
export type CachedDirectOrderPreparation = Failure | Readonly<{
  outcome: "ready";
  coverage: "complete-direct-neighbor-order-input";
  certificate: ContributorCertificate;
  preparation: Extract<CachedSemanticPreparation, { outcome: "ready" }>;
  work: Readonly<{ sourceReplays: number; familyVisits: number; normalizedRecords: number }>;
}>;

/** Compose authenticated coordinates with canonical replay. No production caller supplies validity yet. */
export class CachedRequestedDirectOrderReader {
  private readonly replay: CachedSourceReplay;
  private readonly semantics: CachedSourceSemanticReader;

  /** Retain the repository and exact host capabilities; an absent order-validity port disables readiness. */
  constructor(private readonly repository: NeutralSourceRepository,
    private readonly discovery: Pick<SourceContributorDiscovery, "discoverDirectOrder" | "revalidate" | "isHostCurrent">,
    private readonly capture: CachedPairCapture, private readonly entities: SourcePatchReadPort,
    private readonly hostOrderValidity?: CachedDirectOrderHostValidity) {
    this.replay = new CachedSourceReplay(repository);
    this.semantics = new CachedSourceSemanticReader(repository);
  }

  /**
   * Prepare the complete direct center incidence in full-builder phase order. The explicit host-order
   * capability is deliberately required at the final synchronous fence; tests may inject it, while
   * production stays non-ready until native MetadataCache ordering/currentness is demonstrated.
   */
  async prepare(request: CachedDirectOrderRequest, policy: CachedSemanticPolicy,
    runtime: GraphCompilerRuntime): Promise<CachedDirectOrderPreparation> {
    if (!this.hostOrderValidity) return selectedSourceFailure("host-catalog-stale");
    const policyRevision = policy.revision;
    const owners = new Map<string, CachedSourceRequest>();
    /** Check caller, policy and order authority before each source capture and awaited phase. */
    const requestReason = (): SourceReason => !runtime.isCurrent() ? "cancelled"
      : !policy.isCurrent() || policy.revision !== policyRevision ? "superseded"
      : !this.hostOrderValidity?.isCurrent() ? "host-catalog-stale" : "ready";
    /** Include every captured source's own host observation in the private preparation fence. */
    const reason = (): SourceReason => {
      const parent = requestReason();
      return parent !== "ready" ? parent : [...owners.values()].some(
        /** A stale captured source invalidates the whole ordered input. */
        (owner) => !owner.host.isCurrent()) ? "stale" : "ready";
    };
    /** Provide one boolean fence to the canonical compiler and selected replay. */
    const current = (): boolean => reason() === "ready";
    const captureRuntime = { ...runtime,
      /** Capture can precede the selected-owner map; its own result is checked immediately afterward. */
      isCurrent: (): boolean => requestReason() === "ready" };
    const scopedRuntime = { ...runtime, isCurrent: current };
    if (request.kind !== "direct-order" || !request.center || !current()) return selectedSourceFailure(
      request.kind !== "direct-order" || !request.center ? "unsupported-scope" : reason());
    try {
      const discovered = await this.discovery.discoverDirectOrder(
        { kind: "neighborhood", endpoints: [request.center] }, this.hostOrderValidity);
      if (!current()) return selectedSourceFailure(reason());
      if (discovered.outcome !== "ready") return discovered;
      if (!this.validCoordinate(discovered)) return selectedSourceFailure("dependency-invalid");

      const stamps = new Map(discovered.sources.map(
        /** Preserve the exact catalog-selected head for each source ID. */
        (stamp) => [stamp.head.sourceId, stamp]));
      for (const sourceId of discovered.sourceIds) {
        const stamp = stamps.get(sourceId);
        if (!stamp || !stamp.saved || stamp.sequence === null) return selectedSourceFailure("dependency-invalid");
        const captured = await this.capture(sourceId, captureRuntime);
        if (!current()) return selectedSourceFailure(reason());
        if (captured.outcome !== "ready") return captured;
        const owner: CachedSourceRequest = { ...captured.request,
          expected: { sourceRevision: stamp.head.sourceRevision, sequence: stamp.sequence } };
        const matched = cachedSourceMatches(owner, stamp);
        if (matched !== "ready") return selectedSourceFailure(matched);
        owners.set(sourceId, owner);
      }

      const structure = this.structuralInput(discovered, owners);
      if (!structure) return selectedSourceFailure("missing");
      if (!owners.size) {
        const prepared = await this.semantics.prepare([], policy, this.entities, scopedRuntime, structure);
        if (!current()) return selectedSourceFailure(reason());
        if (prepared.outcome !== "ready") return prepared;
        const validated = await this.discovery.revalidate(discovered);
        if (validated !== "ready") return selectedSourceFailure(validated);
        if (!current() || !this.discovery.isHostCurrent() || !this.hostOrderValidity.isCurrent()) {
          return selectedSourceFailure(reason() === "ready" ? "host-catalog-stale" : reason());
        }
        return { outcome: "ready", coverage: "complete-direct-neighbor-order-input", certificate: discovered,
          preparation: prepared, work: { sourceReplays: 0, familyVisits: 0, normalizedRecords: 0 } };
      }

      const ownerNodeIds: NodeId[] = [];
      for (const sourceId of discovered.sourceIds) {
        const owner = owners.get(sourceId);
        if (!owner) return selectedSourceFailure("dependency-invalid");
        ownerNodeIds.push(owner.host.source.id);
      }
      const preparer = new NormalizedSourceScopePreparer(ownerNodeIds, captureCachedSemanticSettings(policy.settings),
        scopedRuntime, this.entities);
      let estimatedBytes = 0, sourceReplays = 0, familyVisits = 0, normalizedRecords = 0;
      if (!(await this.feedStructural(preparer, structure, scopedRuntime,
        /** Structural batches share the same total estimated-byte cap as source phases. */
        (size) => { estimatedBytes += size; return estimatedBytes <= MAX_CACHED_SCOPE_ESTIMATED_BYTES; }))) {
        return selectedSourceFailure(estimatedBytes > MAX_CACHED_SCOPE_ESTIMATED_BYTES ? "decode-budget" : "invalid-frame");
      }
      const markdownStamps = new Map<string, SelectedSourceStamp>();
      const work: SourceReplayWork[] = [];
      /** Replay each selected phase in authenticated order, rejecting nonempty missing-rank sources. */
      const replayPhase = async (sourceIds: readonly string[], phase: CachedSourceReplayPhase, markdown: boolean,
        expectEmpty = false): Promise<SourceReason | null> => {
        for (const sourceId of sourceIds) {
          const owner = owners.get(sourceId);
          if (!owner) return "dependency-invalid";
          let read: ReturnType<NormalizedSourceScopePreparer["beginSource"]> = null;
          let unexpected = false;
          const result = await this.replay.read(owner, scopedRuntime,
            /** Feed only bounded validated batches to the existing canonical compiler. */
            async (batch) => {
            if (expectEmpty && batch.records.length) { unexpected = true; return false; }
            for (const record of batch.records) estimatedBytes += estimateReferenceRecordBytes(record);
            if (estimatedBytes > MAX_CACHED_SCOPE_ESTIMATED_BYTES) return false;
            read ??= markdown ? preparer.beginSource(owner.host.source.id, batch.boundary) : preparer.beginPhase(batch.boundary);
            return read !== null && await preparer.acceptBatch(read, batch);
            }, undefined, phase);
          sourceReplays += 1;
          if (!current()) return reason();
          if (unexpected) return "dependency-invalid";
          if (estimatedBytes > MAX_CACHED_SCOPE_ESTIMATED_BYTES) return "decode-budget";
          if (result.outcome !== "ready") return result.reason;
          if (!read || !(markdown ? preparer.completeSource(read, result.value.boundary) : preparer.completePhase(read, result.value.boundary))) {
            return "invalid-frame";
          }
          familyVisits += result.value.work.familyVisits; normalizedRecords += result.value.work.normalizedRecords;
          if (markdown) { markdownStamps.set(sourceId, result.stamp); work.push(result.value.work); }
        }
        return null;
      };
      for (const [ids, phase, markdown, expectEmpty] of [
        [discovered.resolvedSourceIds, "host-resolved", false, false],
        [discovered.resolvedAbsentSourceIds, "host-resolved", false, true],
        [discovered.unresolvedSourceIds, "host-unresolved", false, false],
        [discovered.unresolvedAbsentSourceIds, "host-unresolved", false, true],
        [discovered.markdownSourceIds, "markdown", true, false],
      ] as const) {
        const failed = await replayPhase(ids, phase, markdown, expectEmpty);
        if (failed) return selectedSourceFailure(failed);
      }
      const result = await preparer.finish();
      if (!current()) return selectedSourceFailure(reason());
      if (result.outcome !== "prepared") return selectedSourceFailure(result.outcome === "missing-entity" ? "missing" : "invalid-frame");
      const exactStamps: SelectedSourceStamp[] = [];
      for (const sourceId of discovered.sourceIds) {
        const stamp = markdownStamps.get(sourceId);
        if (!stamp) return selectedSourceFailure("dependency-invalid");
        if (JSON.stringify(stamp) !== JSON.stringify(stamps.get(sourceId))) return selectedSourceFailure("superseded");
        exactStamps.push(stamp);
      }
      const preparation: Extract<CachedSemanticPreparation, { outcome: "ready" }> = {
        outcome: "ready", coverage: "source-owners", policyRevision, sources: exactStamps,
        compilation: result.compilation, work,
      };
      const validated = await this.discovery.revalidate(discovered);
      if (validated !== "ready") return selectedSourceFailure(validated);
      // This is intentionally the final non-awaited fence. No production capability exists yet.
      if (!current() || !this.discovery.isHostCurrent() || !this.hostOrderValidity.isCurrent()) {
        return selectedSourceFailure(reason() === "ready" ? "host-catalog-stale" : reason());
      }
      return { outcome: "ready", coverage: "complete-direct-neighbor-order-input", certificate: discovered,
        preparation, work: { sourceReplays, familyVisits, normalizedRecords } };
    } catch {
      return selectedSourceFailure(current() ? "read-error" : reason());
    }
  }

  /** Validate exact Markdown order plus a complete present/absent partition for both host phases. */
  private validCoordinate(discovered: Discovered): boolean {
    const sourceIds = new Set(discovered.sourceIds);
    if (sourceIds.size !== discovered.sourceIds.length || sourceIds.size !== discovered.sources.length
      || discovered.markdownSourceIds.length !== sourceIds.size || new Set(discovered.markdownSourceIds).size !== sourceIds.size) return false;
    for (const ids of [discovered.resolvedSourceIds, discovered.resolvedAbsentSourceIds,
      discovered.unresolvedSourceIds, discovered.unresolvedAbsentSourceIds, discovered.markdownSourceIds]) {
      if (new Set(ids).size !== ids.length || ids.some(
        /** Every phase entry must belong to the exact finite discovery cover. */
        (id) => !sourceIds.has(id))) return false;
    }
    /** Require an exact present/absent partition for one host-link family. */
    const complete = (present: readonly string[], absent: readonly string[]): boolean => present.length + absent.length === sourceIds.size
      && new Set([...present, ...absent]).size === sourceIds.size;
    return discovered.markdownSourceIds.every(
      /** Markdown order is a complete permutation of the selected source IDs. */
      (id) => sourceIds.has(id))
      && complete(discovered.resolvedSourceIds, discovered.resolvedAbsentSourceIds)
      && complete(discovered.unresolvedSourceIds, discovered.unresolvedAbsentSourceIds);
  }

  /** Add exact selected owner entity facts to the structural phase so dormant owners can seed identity without relationship evidence. */
  private structuralInput(discovered: Discovered, owners: ReadonlyMap<string, CachedSourceRequest>): CachedSemanticStructure | null {
    const records: CachedSemanticStructure[number][] = discovered.hostFacts.map(
      /** Retain the original structural fact stream without applying semantic policy here. */
      (entry) => entry.fact);
    const present = new Set(records.filter(
      /** Existing entity facts already seed these exact IDs. */
      (record) => record.kind === "entity").map(
      /** Record only identity; entity insertion carries no relationship evidence. */
      (record) => record.entity.id));
    const seeds: CachedSemanticStructure[number][] = [];
    for (const sourceId of discovered.sourceIds) {
      const owner = owners.get(sourceId);
      if (!owner || present.has(owner.host.source.id)) continue;
      const fact = this.entities.entity(owner.host.source);
      if (!fact || fact.entity.id !== owner.host.source.id || fact.source.id !== owner.host.source.id) return null;
      seeds.push(fact); present.add(fact.entity.id);
    }
    // Entity facts carry no relationship evidence. Keeping them in this structural phase cannot move
    // pair births; relationship-bearing host facts retain their authenticated original order.
    return [...seeds, ...records];
  }

  /** Feed one synthetic structural phase with the same canonical batch framing and byte limits. */
  private async feedStructural(preparer: NormalizedSourceScopePreparer, records: CachedSemanticStructure,
    runtime: GraphCompilerRuntime, reserve: (bytes: number) => boolean): Promise<boolean> {
    const boundary = { generation: sourceGeneration("cached-direct-order-structure"), snapshotRevision: sourceSnapshotRevision("private") };
    const read = preparer.beginPhase(boundary);
    if (!read) return false;
    let start = 0, sequence = 0;
    do {
      let end = start, estimated = 0;
      while (end < records.length && end - start < MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH) {
        const size = estimateReferenceRecordBytes(records[end]);
        if (end > start && estimated + size > MAX_REFERENCE_BATCH_ESTIMATED_BYTES) break;
        estimated += size; end++;
      }
      if (!reserve(estimated) || !runtime.isCurrent() || !(await preparer.acceptBatch(read, {
        boundary, sequence: sequence++, records: records.slice(start, end), final: end === records.length,
      }))) return false;
      start = end;
    } while (start < records.length);
    return preparer.completePhase(read, boundary);
  }
}
