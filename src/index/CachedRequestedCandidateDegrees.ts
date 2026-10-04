/**
 * Private SI4 raw-degree input for a finite exact candidate set. One complete neutral incidence
 * union is replayed through the canonical compiler; only its candidates' raw neighbour-map sizes
 * escape. Path-injective binding is checked, not emulated. Discovery owns root/journal coverage,
 * capture owns physical/source observations, and all of them plus policy/demand survive the final
 * await. No classifier, sorting, title selection, storage write, publication or production caller.
 */
import type { GraphCompilerRuntime, GraphCompilerSettings } from "../core/graph/compiler";
import type { NodeId } from "../core/graph/model";
import type { SourcePatchReadPort } from "../core/graph/patch";
import type { SourceEntityRef } from "../core/graph/source";
import type { CachedPairCapture } from "./CachedRequestedPair";
import { CachedSourceSemanticReader, captureCachedSemanticSettings, validateCachedOwners, cachedOwnersCurrent,
  type CachedSemanticPolicy, type CachedSemanticPreparation } from "./CachedSourceSemantics";
import { type ContributorCertificate, type ContributorFailure,
  type SourceContributorDiscovery } from "./SourceContributorDiscovery";
import { SOURCE_MAX_BATCH_RECORDS, SourceFactError, type SourceReason } from "./SourceFacts";
import { cachedSourceMatches, type CachedSourceRequest } from "./SourceReplay";
import { selectedSourceFailure, type NeutralSourceRepository } from "./SourceRepository";

/** Aggregate request limits supplement, never replace, discovery and canonical replay budgets. */
const MAX_IDENTITY_BYTES = 1024 * 1024;
const MAX_COMPILED_IDENTITY_BYTES = 32 * 1024 * 1024;
const MAX_POLICY_ITEMS = 1024;
const MAX_POLICY_BYTES = 64 * 1024;

export type CachedCandidateDegreeRequest = Readonly<{
  kind: "candidate-degrees";
  candidates: readonly SourceEntityRef[];
}>;
/** Only exact IDs and counts, in caller order. Neither neighbor order nor a visible list is proved. */
export type CachedCandidateDegreePreparation = ContributorFailure
  | Exclude<CachedSemanticPreparation, { outcome: "ready" }>
  | Readonly<{
    outcome: "ready";
    coverage: "complete-candidate-raw-degrees";
    inputs: readonly Readonly<{ id: NodeId; rawDegree: number }>[];
    certificate: Readonly<{
      coverage: "complete-candidate-raw-degrees";
      candidates: readonly SourceEntityRef[];
      policyRevision: string;
      contributors: ContributorCertificate;
    }>;
    work: Readonly<{ sourceReplays: number; familyVisits: number; nodes: number;
      candidateRelations: number; entityReads: number; peakRetainedBytes: number }>;
  }>;

/** Compare identity facets explicitly: neither a path nor a SourceId substitutes for a NodeId. */
function sameEntity(left: SourceEntityRef, right: SourceEntityRef): boolean {
  return left.id === right.id && left.kind === right.kind && left.state === right.state
    && left.semanticPath === right.semanticPath && left.physicalPath === right.physicalPath;
}

/** Bound policy expansion before copying it; duplicate configured assignments are not deduplicated. */
function finitePolicy(settings: GraphCompilerSettings): boolean {
  const arrays = [settings.hierarchy.hidden, settings.hierarchy.parents, settings.hierarchy.children,
    settings.hierarchy.leftFriends, settings.hierarchy.rightFriends, settings.hierarchy.previous,
    settings.hierarchy.next, settings.tagStyleList];
  if (arrays.reduce(/** Count before visiting potentially oversized caller arrays. */
    (total, values) => total + values.length, 0) > MAX_POLICY_ITEMS) return false;
  let bytes = 2 * ((settings.thumbnailProperty?.length ?? 0) + (settings.nodeImageProperty?.length ?? 0));
  for (const values of arrays) for (const value of values) {
    bytes += 2 * value.length;
    if (bytes > MAX_POLICY_BYTES) return false;
  }
  return bytes <= MAX_POLICY_BYTES;
}

/** Compose read-only coverage/capture/replay capabilities; retain no graph or cache on this owner. */
export class CachedRequestedCandidateDegreeReader {
  private readonly semantics: CachedSourceSemanticReader;

  /** Exact entity facts must come from the same clean host as discovery, not an old published graph. */
  constructor(repository: NeutralSourceRepository,
    private readonly discovery: Pick<SourceContributorDiscovery, "discover" | "revalidate" | "isHostCurrent"> & Partial<Pick<SourceContributorDiscovery, "isGenerationCurrent">>,
    private readonly capture: CachedPairCapture, private readonly entities: SourcePatchReadPort) {
    this.semantics = new CachedSourceSemanticReader(repository);
  }

  /**
   * Authenticate the complete union once and compile it once under a captured policy. Every
   * candidate must exist canonically, including zero-degree candidates; absence is never zero.
   * Overflow, an open ticket (even unrelated/known), or any changed input discards all counts.
   * A ready result is point-in-time private input, not permission for later graph publication.
   */
  async prepare(request: CachedCandidateDegreeRequest, policy: CachedSemanticPolicy,
    runtime: GraphCompilerRuntime): Promise<CachedCandidateDegreePreparation> {
    const revision = policy.revision;
    const owners: CachedSourceRequest[] = [];
    /** Capture callbacks depend only on parent demand/policy, never recursively on captured hosts. */
    const parentReason = (): SourceReason => !runtime.isCurrent() ? "cancelled"
      : !policy.isCurrent() || policy.revision !== revision ? "superseded" : "ready";
    /** Keep per-record cancellation constant-time; final validation closes all captured hosts. */
    const reason = (): SourceReason => parentReason() !== "ready" ? parentReason()
      : this.discovery.isGenerationCurrent?.() === false ? "stale" : "ready";
    /** All semantic work shares this request's shorter lifetime, not the catalog's demand. */
    const current = (): boolean => reason() === "ready";
    const captureRuntime = { ...runtime,
      /** The host capability returned by capture cannot depend on itself. */
      isCurrent: (): boolean => parentReason() === "ready",
    };
    if (!current()) return selectedSourceFailure(reason());
    const candidateValue: unknown = request?.candidates;
    if (!request || request.kind !== "candidate-degrees" || !Array.isArray(candidateValue)
      || !request.candidates.length) return selectedSourceFailure("unsupported-scope");
    try {
      // Caller-owned candidate refs and policy are one point-in-time input. Capture them fully before
      // the first cooperative yield, then validate/process the immutable copies in bounded batches.
      const candidates = request.candidates.map((ref) => ({ ...ref }));
      if (!finitePolicy(policy.settings)) return selectedSourceFailure("backpressure");
      const capturedPolicy = { revision, settings: captureCachedSemanticSettings(policy.settings),
        /** In-place token supersession is distinct from demand loss. */
        isCurrent: (): boolean => parentReason() === "ready",
      };
      const candidateIds = new Set<string>();
      let checkedCandidates = 0;
      for (const candidate of candidates) {
        if (candidateIds.has(candidate.id)) return selectedSourceFailure("unsupported-scope");
        candidateIds.add(candidate.id);
        // Bound only one pathological identity. Aggregate candidate work is continued in pages.
        if (2 * ((candidate.id?.length ?? 0) + (candidate.semanticPath?.length ?? 0)
          + (candidate.physicalPath?.length ?? 0)) > MAX_IDENTITY_BYTES) return selectedSourceFailure("backpressure");
        checkedCandidates += 1;
        if (checkedCandidates % SOURCE_MAX_BATCH_RECORDS === 0) { await runtime.yield(); if (!current()) return selectedSourceFailure(reason()); }
      }
      const scope = { kind: "neighborhood" as const, endpoints: candidates };
      const discovered = await this.discovery.discover(scope);
      if (!current()) return selectedSourceFailure(reason());
      if (discovered.outcome !== "ready") return discovered;
      if (discovered.coverage !== "complete-direct-contributors" || discovered.scope.kind !== scope.kind
        || discovered.scope.endpoints.length !== candidates.length || discovered.scope.fields !== undefined || discovered.scope.literals !== undefined
        || discovered.sourceIds.length !== discovered.sources.length
        || new Set(discovered.sourceIds).size !== discovered.sources.length) return selectedSourceFailure("dependency-invalid");
      for (let index = 0; index < candidates.length; index += 1) {
        if (!sameEntity(discovered.scope.endpoints[index], candidates[index])) return selectedSourceFailure("dependency-invalid");
        if ((index + 1) % SOURCE_MAX_BATCH_RECORDS === 0) { await runtime.yield(); if (!current()) return selectedSourceFailure(reason()); }
      }
      for (const [index, sourceId] of discovered.sourceIds.entries()) {
        const stamp = discovered.sources[index];
        if (!stamp.saved || stamp.sequence === null || stamp.head.sourceId !== sourceId) return selectedSourceFailure("dependency-invalid");
        const captured = await this.capture(sourceId, captureRuntime);
        if (!current()) return selectedSourceFailure(reason());
        if (captured.outcome !== "ready") return captured;
        if (captured.request.sourceId !== sourceId) return selectedSourceFailure("dependency-invalid");
        // Source ownership and graph identity are independent, but their physical facets must agree.
        if (captured.request.host.source.kind !== "document" || captured.request.host.source.state !== "materialized"
          || captured.request.host.source.physicalPath !== stamp.head.physical.path) return selectedSourceFailure("stale");
        const owner = { ...captured.request, expected: { sourceRevision: stamp.head.sourceRevision, sequence: stamp.sequence } };
        const matched = cachedSourceMatches(owner, stamp);
        if (matched !== "ready") return selectedSourceFailure(matched);
        owners.push(owner);
        if (owners.length % SOURCE_MAX_BATCH_RECORDS === 0) { await runtime.yield(); if (!current()) return selectedSourceFailure(reason()); }
      }
      let entityReads = 0;
      const entities: SourcePatchReadPort = {
        /** Guard every exact-ID seed, including noncandidate endpoints in whole-owner over-coverage. */
        entity: (ref) => {
          entityReads += 1;
          const fact = this.entities.entity(ref);
          if (fact && (fact.source.id !== ref.id || !sameEntity(fact.entity, ref)
            || fact.file && fact.file.path !== ref.physicalPath)) throw new SourceFactError("stale");
          return fact;
        },
      };
      const prepared = await this.semantics.prepare(owners, capturedPolicy, entities, { ...runtime, isCurrent: current },
        discovered.hostFacts.map(/** Canonical original structural order/ownership is retained once. */
          (entry) => entry.fact));
      if (!current()) return selectedSourceFailure(reason());
      if (prepared.outcome !== "ready") return prepared;
      if (prepared.policyRevision !== revision || prepared.sources.length !== discovered.sources.length) return selectedSourceFailure("superseded");
      for (let index = 0; index < prepared.sources.length; index += 1) {
        const left = prepared.sources[index], right = discovered.sources[index];
        if (JSON.stringify(left) !== JSON.stringify(right)) return selectedSourceFailure("superseded");
        if ((index + 1) % SOURCE_MAX_BATCH_RECORDS === 0) { await runtime.yield(); if (!current()) return selectedSourceFailure(reason()); }
      }
      const compilation = prepared.compilation;
      const paths = new Set<string>();
      let started = runtime.now(), visitedNodes = 0;
      for (const node of compilation.nodes.values()) {
        if (!current()) return selectedSourceFailure(reason());
        if ((visitedNodes > 0 && visitedNodes % SOURCE_MAX_BATCH_RECORDS === 0) || runtime.now() - started >= runtime.sliceBudgetMs) {
          await runtime.yield();
          if (!current()) return selectedSourceFailure(reason());
          started = runtime.now();
        }
        visitedNodes += 1;
        // GraphBuilder binds neighbours by semantic path. Injectivity makes that mapping
        // cardinality-preserving; do not count paths or reproduce the binder's overwrites.
        const path = node.semanticPath;
        if (!path || path.includes("\u0000") || paths.has(path)) return selectedSourceFailure("unsupported-scope");
        // Reject only a single pathological identity. Aggregate path memory is proportional to the
        // requested compiled scope and must not become another fixed high-degree completion cap.
        if (2 * (path.length + node.id.length + (node.physicalPath?.length ?? 0)) > MAX_COMPILED_IDENTITY_BYTES) {
          return selectedSourceFailure("backpressure");
        }
        paths.add(path);
      }
      const inputs: Array<{ id: NodeId; rawDegree: number }> = [];
      let candidateRelations = 0, visitedCandidates = 0;
      for (const candidate of candidates) {
        if (visitedCandidates > 0 && visitedCandidates % SOURCE_MAX_BATCH_RECORDS === 0) {
          await runtime.yield(); if (!current()) return selectedSourceFailure(reason());
        }
        visitedCandidates += 1;
        const node = compilation.node(candidate.id);
        if (!node) return selectedSourceFailure("missing");
        if (!sameEntity(node, candidate)) return selectedSourceFailure("unsupported-scope");
        candidateRelations += node.neighbours.size;
        inputs.push({ id: candidate.id, rawDegree: node.neighbours.size });
      }
      const hosts = await validateCachedOwners(owners, { ...runtime, isCurrent: current });
      if (hosts !== "ready") return selectedSourceFailure(current() ? hosts : reason());
      const validated = await this.discovery.revalidate(discovered);
      if (!current()) return selectedSourceFailure(reason());
      if (validated !== "ready") return selectedSourceFailure(validated);
      const finalHosts = cachedOwnersCurrent(owners);
      if (finalHosts !== "ready") return selectedSourceFailure(finalHosts);

      if (!this.discovery.isHostCurrent()) return selectedSourceFailure("host-catalog-stale");
      if (!current()) return selectedSourceFailure(reason());
      return { outcome: "ready", coverage: "complete-candidate-raw-degrees", inputs,
        certificate: { coverage: "complete-candidate-raw-degrees", candidates, policyRevision: revision, contributors: discovered },
        work: { sourceReplays: owners.length, familyVisits: prepared.work.reduce(/** Actual canonical family visits. */
          (total, work) => total + work.familyVisits, 0), nodes: compilation.nodes.size, candidateRelations, entityReads, peakRetainedBytes: prepared.memory?.peakBytes ?? 0 } };
    } catch (error) {
      return selectedSourceFailure(!current() ? reason() : error instanceof SourceFactError ? error.reason : "read-error");
    }
  }
}
