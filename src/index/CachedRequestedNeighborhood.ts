/**
 * Private clean-host neighborhood relation closure. Complete neutral center incidence is compiled
 * under one captured policy; a second combined center/parent range closes sibling witnesses in
 * original contributor order. Both passes use the canonical cached compiler, never a graph mirror.
 * Only final root/head/journal/host/policy/demand-fenced inputs escape. A separate private gate
 * request also captures visibility policy and proves physical target facets; sorted visible lists,
 * GraphIndex publication, source acquisition and changed-host repair are not capabilities.
 */
import type { GraphCompilerRuntime, PortableGraphCompilation } from "../core/graph/compiler";
import type { SourcePatchReadPort } from "../core/graph/patch";
import { classifyRelation } from "../core/graph/resolver";
import type { SourceEntityRef } from "../core/graph/source";
import type { CachedPairCapture } from "./CachedRequestedPair";
import { captureCachedCenterGateSettings, projectCachedCenterGates,
  type CachedCenterGatePolicy, type CachedCenterGates } from "./CachedCenterGateProjection";
import { CachedSourceSemanticReader, captureCachedSemanticSettings,
  type CachedSemanticPolicy, type CachedSemanticPreparation } from "./CachedSourceSemantics";
import { MAX_CONTRIBUTOR_ENDPOINTS, type ContributorCertificate, type ContributorDiscoveryResult,
  type ContributorFailure, type SourceContributorDiscovery } from "./SourceContributorDiscovery";
import type { SourceReason } from "./SourceFacts";
import { cachedSourceMatches, type CachedSourceRequest } from "./SourceReplay";
import { selectedSourceFailure, type NeutralSourceRepository } from "./SourceRepository";

/** One exact center; there is deliberately no top-N, displayed-parent list or gate-count option. */
export type CachedNeighborhoodRequest = Readonly<{ kind: "neighborhood"; center: SourceEntityRef }>;
/** Both directions of center and parent incidence, not arbitrary edges in the over-cover graph. */
export type CachedNeighborhoodCertificate = Readonly<{
  coverage: "complete-neighborhood-relations";
  center: SourceEntityRef;
  parents: readonly SourceEntityRef[];
  policyRevision: string;
  gateTotals: "not-certified";
  contributors: ContributorCertificate;
}>;
type Failure = ContributorFailure | Exclude<CachedSemanticPreparation, { outcome: "ready" }>;
type Discovered = Extract<ContributorDiscoveryResult, { outcome: "ready" }>;
/** Point-in-time private inputs, including all parent/child sibling witnesses and no partial scopes. */
export type CachedNeighborhoodPreparation = Failure | Readonly<{
  outcome: "ready";
  coverage: "complete-neighborhood-relations";
  certificate: CachedNeighborhoodCertificate;
  preparation: Extract<CachedSemanticPreparation, { outcome: "ready" }>;
  work: Readonly<{ passes: number; sourceReplays: number; familyVisits: number }>;
}>;

/** Distinct from the relation-only result: counts are certified for this center and visibility only. */
export type CachedCenterGatePreparation = Failure | Readonly<{
  outcome: "ready";
  coverage: "complete-center-gates";
  certificate: Readonly<{
    coverage: "complete-center-gates";
    relations: CachedNeighborhoodCertificate;
    presentationRevision: string;
    visibleLists: "not-certified";
  }>;
  gates: CachedCenterGates;
  preparation: Extract<CachedSemanticPreparation, { outcome: "ready" }>;
  work: Readonly<{ passes: number; sourceReplays: number; familyVisits: number; gateRelations: number; gateEntityReads: number }>;
}>;

/** Preserve exact identity facets without retaining a compiled node or its relationship map. */
function copyRef(ref: SourceEntityRef): SourceEntityRef {
  return { id: ref.id, kind: ref.kind, state: ref.state,
    ...(ref.semanticPath === undefined ? {} : { semanticPath: ref.semanticPath }),
    ...(ref.physicalPath === undefined ? {} : { physicalPath: ref.physicalPath }) };
}

/** Compare every root and host coordinate; equal heads alone cannot authenticate negative ranges. */
function sameRoot(left: ContributorCertificate, right: ContributorCertificate): boolean {
  const a = left.dependency, b = right.dependency, h = left.host, k = right.host;
  return a.digest === b.digest && a.generation === b.generation && a.revision === b.revision
    && a.sequence === b.sequence && a.slot === b.slot
    && h.epoch === k.epoch && h.revision === k.revision && h.token === k.token;
}

/** The combined range must retain every original owner/structural occurrence, not just its keys. */
function containsCover(combined: ContributorCertificate, initial: ContributorCertificate): boolean {
  const sources = new Map(combined.sources.map((stamp) => [stamp.head.sourceId, JSON.stringify(stamp)]));
  if ((combined.hostFactOrder === "scope-local") !== (initial.hostFactOrder === "scope-local")) return false;
  const hostFactsRetained = combined.hostFactOrder === "scope-local"
    // Widening a finite source-local scope can insert earlier current facts and therefore renumber
    // them. Each certificate authenticates its exact stream, while cover containment binds the
    // occurrence itself. The legacy durable catalog keeps its absolute occurrence coordinate below.
    ? (() => {
        const facts = new Set(combined.hostFacts.map((entry) => JSON.stringify(entry.fact)));
        return initial.hostFacts.every((entry) => facts.has(JSON.stringify(entry.fact)));
      })()
    : (() => {
        const facts = new Map(combined.hostFacts.map((entry) => [entry.order, JSON.stringify(entry.fact)]));
        return initial.hostFacts.every((entry) => facts.get(entry.order) === JSON.stringify(entry.fact));
      })();
  return initial.sources.every((stamp) => sources.get(stamp.head.sourceId) === JSON.stringify(stamp))
    && hostFactsRetained;
}

/**
 * Project the entire semantic parent frontier using the canonical classifier. Visibility and
 * maxItemCount must not trim it. Scan even non-parent incidence cooperatively. Null rejects an
 * oversized/cancelled frontier, never a ready prefix; the caller reports the exact lifetime reason.
 */
async function parentsOf(compilation: PortableGraphCompilation, center: SourceEntityRef,
  inferAllLinksAsFriends: boolean, runtime: GraphCompilerRuntime): Promise<readonly SourceEntityRef[] | null> {
  const parents: SourceEntityRef[] = [];
  let started = runtime.now();
  for (const relation of compilation.node(center.id)?.neighbours.values() ?? []) {
    if (!runtime.isCurrent()) return null;
    if (runtime.now() - started >= runtime.sliceBudgetMs) {
      await runtime.yield();
      if (!runtime.isCurrent()) return null;
      started = runtime.now();
    }
    if (relation.isHidden || classifyRelation(relation, "parent", inferAllLinksAsFriends) === null) continue;
    parents.push(copyRef(relation.target));
    if (parents.length >= MAX_CONTRIBUTOR_ENDPOINTS) return null;
  }
  return parents.sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
}

/** Compose existing read-only capabilities; no production caller or publication method is added. */
export class CachedRequestedNeighborhoodReader {
  private readonly semantics: CachedSourceSemanticReader;

  /** Captures and exact-ID entity reads must observe the same clean host as discovery, without IO. */
  constructor(repository: NeutralSourceRepository,
    private readonly discovery: Pick<SourceContributorDiscovery, "discover" | "revalidate" | "isHostCurrent">,
    private readonly capture: CachedPairCapture, private readonly entities: SourcePatchReadPort) {
    this.semantics = new CachedSourceSemanticReader(repository);
  }

  /**
   * Close one center and every semantic parent's incidence with at most two bounded discoveries.
   * The final combined discovery supplies global owner order; source/structure lists are never
   * concatenated. The first private compilation goes out of scope before a second is constructed.
   * Empty/no-parent scopes take one pass. Any failure discards everything and triggers no fallback.
   */
  prepare(request: CachedNeighborhoodRequest, policy: CachedSemanticPolicy,
    runtime: GraphCompilerRuntime): Promise<CachedNeighborhoodPreparation> {
    return this.prepareScope(request, policy, runtime);
  }

  /**
   * Prepare only the center's four pre-top-N gate totals under a separate captured visibility policy.
   * This adds no sorted-list, other-node, editing or publication authority. Projection happens inside
   * the original lifetime, before its final awaited contributor revalidation, not after a ready read.
   */
  prepareCenterGates(request: CachedNeighborhoodRequest, policy: CachedSemanticPolicy,
    presentation: CachedCenterGatePolicy, runtime: GraphCompilerRuntime): Promise<CachedCenterGatePreparation> {
    return this.prepareScope(request, policy, runtime, presentation);
  }

  /** Relation-only overload retains the existing private API without adding gate authority. */
  private prepareScope(request: CachedNeighborhoodRequest, policy: CachedSemanticPolicy,
    runtime: GraphCompilerRuntime): Promise<CachedNeighborhoodPreparation>;
  /** Gate overload shares the complete source/host lifetime with the additional projection. */
  private prepareScope(request: CachedNeighborhoodRequest, policy: CachedSemanticPolicy,
    runtime: GraphCompilerRuntime, presentation: CachedCenterGatePolicy): Promise<CachedCenterGatePreparation>;
  /** Run one canonical closure; expose neither variant until all of its inputs survive finality. */
  private async prepareScope(request: CachedNeighborhoodRequest, policy: CachedSemanticPolicy,
    runtime: GraphCompilerRuntime, presentation?: CachedCenterGatePolicy): Promise<CachedNeighborhoodPreparation | CachedCenterGatePreparation> {
    const revision = policy.revision, presentationRevision = presentation?.revision;
    const owners = new Map<string, CachedSourceRequest>();
    /** Capture callbacks retain only parent demand/policy, avoiding a cycle through their own hosts. */
    const requestReason = (): SourceReason => !runtime.isCurrent() ? "cancelled"
      : !policy.isCurrent() || policy.revision !== revision
        || (presentation && (!presentation.isCurrent() || presentation.revision !== presentationRevision)) ? "superseded" : "ready";
    /** Previously captured owners stay live across both passes, including the final awaited fence. */
    const reason = (): SourceReason => {
      const parent = requestReason();
      if (parent !== "ready") return parent;
      for (const owner of owners.values()) if (!owner.host.isCurrent()) return "stale";
      return "ready";
    };
    /** Replay shares this request's full lifetime rather than the catalog's longer-lived demand. */
    const current = (): boolean => reason() === "ready";
    const captureRuntime = { ...runtime,
      /** A capture must not depend on the source-host callback it is about to create. */
      isCurrent: (): boolean => requestReason() === "ready",
    };
    const scopedRuntime = { ...runtime, isCurrent: current };
    if (!current()) return selectedSourceFailure(reason());
    if (!request || request.kind !== "neighborhood" || !request.center) return selectedSourceFailure("unsupported-scope");
    try {
      const center = copyRef(request.center);
      const visibility = presentation ? captureCachedCenterGateSettings(presentation.settings) : null;
      if (presentation && !visibility) return selectedSourceFailure("backpressure");
      const capturedPolicy: CachedSemanticPolicy = { revision, settings: captureCachedSemanticSettings(policy.settings),
        /** One immutable settings snapshot is used across both canonical compilations. */
        isCurrent: (): boolean => requestReason() === "ready",
      };
      let endpoints: readonly SourceEntityRef[] = [center];
      let initial: ContributorCertificate | null = null;
      let frontier: readonly SourceEntityRef[] | null = null;
      let sourceReplays = 0, familyVisits = 0;
      for (let pass = 0; pass < 2; pass++) {
        const scope = { kind: "neighborhood" as const, endpoints };
        const identity = JSON.stringify(scope);
        const discovered = await this.discovery.discover(scope);
        if (!current()) return selectedSourceFailure(reason());
        if (discovered.outcome !== "ready") return discovered;
        if (discovered.coverage !== "complete-direct-contributors" || JSON.stringify(discovered.scope) !== identity) {
          return selectedSourceFailure("dependency-invalid");
        }
        if (initial && (!sameRoot(initial, discovered) || !containsCover(discovered, initial))) {
          return selectedSourceFailure("superseded");
        }
        const selected = await this.captureOwners(discovered, owners, captureRuntime, reason);
        if (!current()) return selectedSourceFailure(reason());
        if (selected.outcome !== "ready") return selected;
        const prepared = await this.semantics.prepare(selected.requests, capturedPolicy, this.entities, scopedRuntime,
          discovered.hostFacts.map((entry) => entry.fact));
        if (!current()) return selectedSourceFailure(reason());
        if (prepared.outcome !== "ready") return prepared;
        if (prepared.policyRevision !== revision || JSON.stringify(prepared.sources) !== JSON.stringify(discovered.sources)) {
          return selectedSourceFailure("superseded");
        }
        sourceReplays += prepared.work.length;
        for (const work of prepared.work) familyVisits += work.familyVisits;
        const parents = await parentsOf(prepared.compilation, center, capturedPolicy.settings.inferAllLinksAsFriends, scopedRuntime);
        if (!current()) return selectedSourceFailure(reason());
        if (!parents) return selectedSourceFailure("backpressure");
        if (frontier && JSON.stringify(parents) !== JSON.stringify(frontier)) return selectedSourceFailure("dependency-invalid");
        if (pass === 0 && parents.length) {
          initial = discovered;
          frontier = parents;
          endpoints = [center, ...parents];
          // Keep only bounded refs/owner stamps/work, not this preparation or its graph, across passes.
          continue;
        }
        const projected = visibility ? await projectCachedCenterGates(prepared.compilation, center,
          capturedPolicy.settings.inferAllLinksAsFriends, visibility, this.entities, scopedRuntime) : null;
        if (!current()) return selectedSourceFailure(reason());
        if (projected && projected.outcome !== "ready") return selectedSourceFailure(projected.reason);
        const validated = await this.discovery.revalidate(discovered);
        if (!current()) return selectedSourceFailure(reason());
        if (validated !== "ready") return selectedSourceFailure(validated);
        // No source callbacks exist for empty/host-only scopes, but their host observation must close.
        if (!this.discovery.isHostCurrent()) return selectedSourceFailure("host-catalog-stale");
        if (!current()) return selectedSourceFailure(reason());
        const certificate: CachedNeighborhoodCertificate = { coverage: "complete-neighborhood-relations",
          center, parents, policyRevision: revision, gateTotals: "not-certified", contributors: discovered };
        if (projected && presentationRevision !== undefined) return {
          outcome: "ready", coverage: "complete-center-gates",
          certificate: { coverage: "complete-center-gates", relations: certificate,
            presentationRevision, visibleLists: "not-certified" },
          gates: projected.gates, preparation: prepared,
          work: { passes: pass + 1, sourceReplays, familyVisits,
            gateRelations: projected.work.relations, gateEntityReads: projected.work.entityReads },
        };
        return { outcome: "ready", coverage: "complete-neighborhood-relations", certificate, preparation: prepared,
          work: { passes: pass + 1, sourceReplays, familyVisits } };
      }
      return selectedSourceFailure("dependency-invalid");
    } catch {
      return selectedSourceFailure(current() ? "read-error" : reason());
    }
  }

  /**
   * Capture each source at most once, reusing its exact pinned observation in a later combined
   * cover. Return requests in discovery order, not capture order. A stale/missing source is terminal.
   */
  private async captureOwners(discovered: Discovered, owners: Map<string, CachedSourceRequest>,
    runtime: GraphCompilerRuntime, reason: () => SourceReason): Promise<Failure | Readonly<{
      outcome: "ready"; requests: readonly CachedSourceRequest[];
    }>> {
    if (discovered.sourceIds.length !== discovered.sources.length
      || new Set(discovered.sourceIds).size !== discovered.sourceIds.length) return selectedSourceFailure("dependency-invalid");
    const requests: CachedSourceRequest[] = [];
    for (const [index, sourceId] of discovered.sourceIds.entries()) {
      const stamp = discovered.sources[index];
      if (stamp.head.sourceId !== sourceId || !stamp.saved || stamp.sequence === null) return selectedSourceFailure("dependency-invalid");
      let owner = owners.get(sourceId);
      if (!owner) {
        const captured = await this.capture(sourceId, runtime);
        if (reason() !== "ready") return selectedSourceFailure(reason());
        if (captured.outcome !== "ready") return captured;
        owner = { ...captured.request, expected: { sourceRevision: stamp.head.sourceRevision, sequence: stamp.sequence } };
        owners.set(sourceId, owner);
      }
      const matched = cachedSourceMatches(owner, stamp);
      if (matched !== "ready") return selectedSourceFailure(matched);
      requests.push(owner);
    }
    return { outcome: "ready", requests };
  }
}
