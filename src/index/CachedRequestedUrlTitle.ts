/**
 * Private SI4 URL-title input proof. A v3 contributor cover supplies all supporting owners in the
 * full builder's Markdown encounter order; the existing cached compiler owns label selection.
 * Only an exact synthetic URL's immutable name input escapes, never an over-cover graph, scalar
 * observation, public title selector or sorted-list certificate. Every awaited read is fenced by
 * the root/journal, selected heads, host, caller policy and demand. This module acquires nothing.
 */
import type { GraphCompilerRuntime } from "../core/graph/compiler";
import type { SourcePatchReadPort } from "../core/graph/patch";
import type { SourceEntityRef } from "../core/graph/source";
import type { CachedPairCapture } from "./CachedRequestedPair";
import { CachedSourceSemanticReader, captureCachedSemanticSettings, validateCachedOwners, cachedOwnersCurrent, sameCachedSelections,
  type CachedSemanticPolicy, type CachedSemanticPreparation } from "./CachedSourceSemantics";
import type { ContributorCertificate, ContributorFailure, SourceContributorDiscovery } from "./SourceContributorDiscovery";
import { cachedSourceMatches, type CachedSourceRequest } from "./SourceReplay";
import { selectedSourceFailure, type NeutralSourceRepository } from "./SourceRepository";

type Failure = ContributorFailure | Exclude<CachedSemanticPreparation, { outcome: "ready" }>;
/**
 * Name input only: canonical URL nodes have no bound file or aliases, so the existing GraphIndex
 * title policy falls back to this name under every presentation configuration. This is not a
 * general selected-title capability and confers no degree, relation-order or publication authority.
 */
export type CachedUrlTitlePreparation = Failure | Readonly<{
  outcome: "ready";
  coverage: "complete-url-title-input";
  input: Readonly<{ entity: SourceEntityRef; name: string; url: string | null }>;
  certificate: Readonly<{
    coverage: "complete-url-title-input";
    policyRevision: string;
    contributors: ContributorCertificate;
  }>;
  work: Readonly<{ sourceReplays: number; familyVisits: number }>;
}>;

/** Compose finite ordered source coverage with the canonical replay/compiler; never select labels. */
export class CachedRequestedUrlTitleReader {
  private readonly semantics: CachedSourceSemanticReader;
  /** Reuse the existing repository, current-source capture and exact canonical host entity port. */
  constructor(repository: NeutralSourceRepository,
    private readonly discovery: Pick<SourceContributorDiscovery, "discoverUrlTitle" | "revalidate" | "isHostCurrent"> & Partial<Pick<SourceContributorDiscovery, "isGenerationCurrent">>,
    private readonly capture: CachedPairCapture, private readonly entities: SourcePatchReadPort) {
    this.semantics = new CachedSourceSemanticReader(repository);
  }

  /**
   * Prepare one exact URL, including origin-only support. Hot or incomplete ranges reject without
   * a truncated prefix or acquisition fallback. Snapshot finite policy before the first await;
   * the caller's monotonic token may also fence presentation edits, although URL names need no
   * live selected property. A missing URL is pending/missing, not a fabricated empty title.
   */
  async prepare(endpoint: SourceEntityRef, policy: CachedSemanticPolicy,
    runtime: GraphCompilerRuntime): Promise<CachedUrlTitlePreparation> {
    const revision = policy.revision;
    const owners: CachedSourceRequest[] = [];
    /** Captures retain only the parent lifetime, avoiding capture/owner callback recursion. */
    const parentReason = () => !runtime.isCurrent() ? "cancelled"
      : !policy.isCurrent() || policy.revision !== revision ? "superseded" : "ready";
    /** Monotonic cancellation is cheap; all selected hosts are revalidated before return. */
    const reason = () => parentReason() !== "ready" ? parentReason()
      : this.discovery.isGenerationCurrent?.() === false ? "stale" : "ready";
    /** No compiler or repository await may outlive the exact requested inputs. */
    const current = (): boolean => reason() === "ready";
    const captureRuntime = { ...runtime,
      /** A capture must not depend on the callback it is about to return. */
      isCurrent: (): boolean => parentReason() === "ready",
    };
    if (!current()) return selectedSourceFailure(reason());
    try {
      const capturedPolicy = { revision, settings: captureCachedSemanticSettings(policy.settings),
        /** Include revision equality even when a caller keeps reusing its policy object. */
        isCurrent: (): boolean => parentReason() === "ready",
      };
      const discovered = await this.discovery.discoverUrlTitle(endpoint);
      if (!current()) return selectedSourceFailure(reason());
      if (discovered.outcome !== "ready") return discovered;
      const order = discovered.markdownOrder;
      if (discovered.coverage !== "complete-direct-contributors" || order === undefined
        || order.length !== discovered.sources.length || order.length !== discovered.sourceIds.length
        || new Set(discovered.sourceIds).size !== order.length
        || discovered.scope.endpoints.length !== 1
        || discovered.scope.endpoints[0].kind !== "url"
        || order.some(/** Exact distinct ordinal order is necessary; structural order is not a fallback. */
          (ordinal, index) => !Number.isSafeInteger(ordinal) || ordinal < 0 || index > 0 && ordinal <= order[index - 1])) {
        return selectedSourceFailure("dependency-invalid");
      }
      // Discovery snapshots the requested identity before its first await. Do not retain the
      // caller's mutable endpoint or infer a URL identity from another node's semantic path.
      const entity = { ...discovered.scope.endpoints[0] };
      for (const [index, sourceId] of discovered.sourceIds.entries()) {
        const stamp = discovered.sources[index];
        if (stamp.head.sourceId !== sourceId || !stamp.saved || stamp.sequence === null) return selectedSourceFailure("dependency-invalid");
        const captured = await this.capture(sourceId, captureRuntime);
        if (!current()) return selectedSourceFailure(reason());
        if (captured.outcome !== "ready") return captured;
        if (captured.request.sourceId !== sourceId) return selectedSourceFailure("dependency-invalid");
        const owner = { ...captured.request, expected: { sourceRevision: stamp.head.sourceRevision, sequence: stamp.sequence } };
        const matched = cachedSourceMatches(owner, stamp);
        if (matched !== "ready") return selectedSourceFailure(matched);
        owners.push(owner);
      }
      const prepared = await this.semantics.prepare(owners, capturedPolicy, this.entities, { ...runtime, isCurrent: current },
        discovered.hostFacts.map(/** Canonical structural order stays separate from Markdown precedence. */ entry => entry.fact));
      if (!current()) return selectedSourceFailure(reason());
      if (prepared.outcome !== "ready") return prepared;
      if (prepared.policyRevision !== revision || !(await sameCachedSelections(prepared.sources, discovered.sources, { ...runtime, isCurrent: current }))) {
        return selectedSourceFailure(current() ? "superseded" : reason());
      }
      const node = prepared.compilation.node(entity.id);
      if (!node) return selectedSourceFailure("missing");
      if (node.kind !== "url" || node.state !== "materialized" || node.semanticPath !== entity.semanticPath
        || node.physicalPath !== undefined || node.file || node.aliases.length) return selectedSourceFailure("unsupported-scope");
      const hosts = await validateCachedOwners(owners, { ...runtime, isCurrent: current });
      if (hosts !== "ready") return selectedSourceFailure(current() ? hosts : reason());
      const validated = await this.discovery.revalidate(discovered);
      if (!current()) return selectedSourceFailure(reason());
      if (validated !== "ready") return selectedSourceFailure(validated);
      const finalHosts = cachedOwnersCurrent(owners);
      if (finalHosts !== "ready") return selectedSourceFailure(finalHosts);

      if (!this.discovery.isHostCurrent()) return selectedSourceFailure("host-catalog-stale");
      if (!current()) return selectedSourceFailure(reason());
      return { outcome: "ready", coverage: "complete-url-title-input",
        input: { entity, name: node.name, url: node.url },
        certificate: { coverage: "complete-url-title-input", policyRevision: revision, contributors: discovered },
        work: { sourceReplays: owners.length,
          familyVisits: prepared.work.reduce(/** Count actual canonical family visits, not selected candidates. */
            (total, work) => total + work.familyVisits, 0) } };
    } catch {
      return selectedSourceFailure(current() ? "read-error" : reason());
    }
  }
}
