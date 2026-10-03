/**
 * Private clean-host SI4 requested-pair composition. Authenticated direct discovery supplies exact
 * owners and structural facts; cached semantics and the canonical compiler supply interpretation.
 * Root/journal, selected-head, host, policy and demand fences must all survive the final await.
 * No GraphIndex, publication, acquisition, root repair, settings route or consumer lives here.
 */
import type { GraphCompilerRuntime } from "../core/graph/compiler";
import type { SourcePatchReadPort } from "../core/graph/patch";
import type { SourceEntityRef } from "../core/graph/source";
import { CachedSourceSemanticReader, validateCachedOwners, cachedOwnersCurrent, sameCachedSelections, type CachedSemanticPolicy, type CachedSemanticPreparation } from "./CachedSourceSemantics";
import type { ContributorCertificate, ContributorFailure, SourceContributorDiscovery } from "./SourceContributorDiscovery";
import { cachedSourceMatches, type CachedSourceRequest } from "./SourceReplay";
import { selectedSourceFailure, type NeutralSourceRepository, type SelectedSourceResult } from "./SourceRepository";

/** Exact unordered pair, with both directed perspectives prepared together; no neighborhood claim. */
export type CachedPairRequest = Readonly<{ kind: "pair"; endpoints: readonly [SourceEntityRef, SourceEntityRef] }>;
/** The host captures an already-current source only; this capability must never acquire or parse it. */
export type CachedPairCapture = (sourceId: string, runtime: GraphCompilerRuntime) => Promise<
  Readonly<{ outcome: "ready"; request: CachedSourceRequest }> | Exclude<SelectedSourceResult<never>, { outcome: "ready" }>>;
/** Point-in-time private proof. The over-cover compilation is not a complete scene or public read. */
export type CachedPairPreparation = ContributorFailure | Exclude<CachedSemanticPreparation, { outcome: "ready" }>
  | Readonly<{
    outcome: "ready";
    coverage: "complete-pair";
    certificate: ContributorCertificate;
    preparation: Extract<CachedSemanticPreparation, { outcome: "ready" }>;
  }>;

/** Compose the existing read-only capabilities without introducing a second semantic policy. */
export class CachedRequestedPairReader {
  private readonly semantics: CachedSourceSemanticReader;
  /** Entity reads must be exact-ID canonical host facts stable under discovery's host observation. */
  constructor(repository: NeutralSourceRepository,
    private readonly discovery: Pick<SourceContributorDiscovery, "discover" | "revalidate" | "isHostCurrent"> & Partial<Pick<SourceContributorDiscovery, "isGenerationCurrent">>,
    private readonly capture: CachedPairCapture, private readonly entities: SourcePatchReadPort) {
    this.semantics = new CachedSourceSemanticReader(repository);
  }

  /**
   * Prepare one complete direct pair from a clean root. No failure returns partial semantics or
   * triggers a fallback. Revalidation is deliberately last: even an empty cover must pass current
   * root/negative-page authentication and the global source/host journal authority.
   */
  async prepare(request: CachedPairRequest, policy: CachedSemanticPolicy,
    runtime: GraphCompilerRuntime): Promise<CachedPairPreparation> {
    const revision = policy.revision;
    const owners: CachedSourceRequest[] = [];
    /** Capture capabilities depend only on parent demand/policy, never on the owners they create. */
    const requestReason = () => !runtime.isCurrent() ? "cancelled"
      : !policy.isCurrent() || policy.revision !== revision ? "superseded" : "ready";
    /** Use monotonic cancellation here; validate captured hosts after the final discovery await. */
    const reason = () => requestReason() !== "ready" ? requestReason()
      : this.discovery.isGenerationCurrent?.() === false ? "stale" : "ready";
    const captureRuntime = { ...runtime,
      /** The host retains this callback; it must not close over the subsequently captured owners. */
      isCurrent: (): boolean => requestReason() === "ready",
    };
    /** Every cached source await shares this request's lifetime, not the catalog's longer lifetime. */
    const current = (): boolean => reason() === "ready";
    const scopedRuntime = { ...runtime, isCurrent: current };
    if (!current()) return selectedSourceFailure(reason());
    if (request.kind !== "pair" || request.endpoints.length !== 2 || request.endpoints[0].id === request.endpoints[1].id) {
      return selectedSourceFailure("unsupported-scope");
    }
    try {
      const discovered = await this.discovery.discover({ kind: "pair", endpoints: request.endpoints });
      if (!current()) return selectedSourceFailure(reason());
      if (discovered.outcome !== "ready") return discovered;
      if (discovered.coverage !== "complete-direct-contributors"
        || discovered.sourceIds.length !== discovered.sources.length
        || new Set(discovered.sourceIds).size !== discovered.sourceIds.length) return selectedSourceFailure("dependency-invalid");
      for (const [index, sourceId] of discovered.sourceIds.entries()) {
        const stamp = discovered.sources[index];
        if (stamp.head.sourceId !== sourceId || !stamp.saved || stamp.sequence === null) return selectedSourceFailure("dependency-invalid");
        const captured = await this.capture(sourceId, captureRuntime);
        if (!current()) return selectedSourceFailure(reason());
        if (captured.outcome !== "ready") return captured;
        const owner: CachedSourceRequest = { ...captured.request,
          expected: { sourceRevision: stamp.head.sourceRevision, sequence: stamp.sequence } };
        const matched = cachedSourceMatches(owner, stamp);
        if (matched !== "ready") return selectedSourceFailure(matched);
        owners.push(owner);
      }
      const prepared = await this.semantics.prepare(owners, policy, this.entities, scopedRuntime,
        discovered.hostFacts.map((entry) => entry.fact));
      if (!current()) return selectedSourceFailure(reason());
      if (prepared.outcome !== "ready") return prepared;
      if (prepared.policyRevision !== revision || !(await sameCachedSelections(prepared.sources, discovered.sources, { ...runtime, isCurrent: current }))) {
        return selectedSourceFailure(current() ? "superseded" : reason());
      }
      const hosts = await validateCachedOwners(owners, { ...runtime, isCurrent: current });
      if (hosts !== "ready") return selectedSourceFailure(current() ? hosts : reason());
      const validated = await this.discovery.revalidate(discovered);
      if (!current()) return selectedSourceFailure(reason());
      if (validated !== "ready") return selectedSourceFailure(validated);
      const finalHosts = cachedOwnersCurrent(owners);
      if (finalHosts !== "ready") return selectedSourceFailure(finalHosts);

      // Empty/host-only covers have no captured source callbacks to close the host observation.
      if (!this.discovery.isHostCurrent()) return selectedSourceFailure("host-catalog-stale");
      if (!current()) return selectedSourceFailure(reason());
      return { outcome: "ready", coverage: "complete-pair", certificate: discovered, preparation: prepared };
    } catch {
      return selectedSourceFailure(current() ? "read-error" : reason());
    }
  }
}
