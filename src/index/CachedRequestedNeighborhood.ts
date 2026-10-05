/**
 * Private clean-host neighborhood relation closure. Complete neutral center incidence is compiled
 * under one captured policy. Sibling reads close every or an explicitly admitted subset of parents;
 * direct-center reads deliberately defer parent incidence before top-N. A second combined range
 * closes sibling witnesses in original contributor order. Both passes use the canonical cached
 * compiler, never a graph mirror.
 * Only final root/head/journal/host/policy/demand-fenced inputs escape. A separate private gate
 * request also captures visibility policy and proves physical target facets; sorted visible lists,
 * GraphIndex publication, source acquisition and changed-host repair are not capabilities.
 */
import type { GraphCompilerRuntime, PortableGraphCompilation } from "../core/graph/compiler";
import type { SourcePatchReadPort } from "../core/graph/patch";
import type { NodeId } from "../core/graph/model";
import { RelationType } from "../core/graph/relations";
import { classifyRelation } from "../core/graph/resolver";
import type { SourceEntityRef } from "../core/graph/source";
import type { CachedPairCapture } from "./CachedRequestedPair";
import { captureCachedCenterGateSettings, projectCachedCenterGates, cachedCenterTargetVisibility,
  type CachedCenterGatePolicy, type CachedCenterGateSettings, type CachedCenterGates } from "./CachedCenterGateProjection";
import { CachedSourceSemanticReader, captureCachedSemanticSettings, validateCachedOwners, cachedOwnersCurrent, sameCachedSelections,
  type CachedSemanticPolicy, type CachedSemanticPreparation } from "./CachedSourceSemantics";
import { type ContributorCertificate, type ContributorDiscoveryResult, type ContributorFailure, type ContributorRequest,
  type SourceContributorDiscovery } from "./SourceContributorDiscovery";
import { SOURCE_MAX_BATCH_RECORDS, type SourceReason } from "./SourceFacts";
import { cachedSourceMatches, type CachedSourceRequest } from "./SourceReplay";
import { selectedSourceFailure, type NeutralSourceRepository } from "./SourceRepository";

/** One exact center with an explicit optional sibling-incidence request, independent of top-N. */
export type CachedNeighborhoodRequest = Readonly<{
  kind: "neighborhood";
  center: SourceEntityRef;
  /** Complete closes all parents, selected closes only admitted IDs, deferred closes just the center. */
  siblingClosure?: "complete" | "deferred" | "selected";
  /** Opaque canonical parent IDs admitted separately for optional bounded sibling work. */
  siblingParents?: readonly NodeId[];
}>;
/** Both center directions are complete; only completeParents certify additional parent incidence. */
type CachedRelationCertificate<Coverage extends "complete-neighborhood-relations" | "complete-visible-parent-relations" | "complete-center-relations" | "complete-selected-parent-relations"> = Readonly<{
  coverage: Coverage;
  center: SourceEntityRef;
  parents: readonly SourceEntityRef[];
  /** Only these parent nodes have complete incidence; other parents remain exact direct targets. */
  completeParents: readonly SourceEntityRef[];
  siblingClosure: "complete" | "deferred" | "selected";
  policyRevision: string;
  gateTotals: "not-certified";
  contributors: ContributorCertificate;
}>;
/** Relation-only callers retain every semantic parent; deferred reads do not certify its incidence. */
export type CachedNeighborhoodCertificate = CachedRelationCertificate<"complete-neighborhood-relations" | "complete-center-relations" | "complete-selected-parent-relations">;
/** Gate callers certify the entire center and explicitly requested visible-parent closure before top-N. */
export type CachedVisibleParentCertificate = CachedRelationCertificate<"complete-visible-parent-relations" | "complete-center-relations" | "complete-selected-parent-relations">;
type Failure = ContributorFailure | Exclude<CachedSemanticPreparation, { outcome: "ready" }>;
type Discovered = Extract<ContributorDiscoveryResult, { outcome: "ready" }>;
/** Final direct-center inputs with explicitly complete or deferred parent/child sibling witnesses. */
export type CachedNeighborhoodPreparation = Failure | Readonly<{
  outcome: "ready";
  coverage: "complete-neighborhood-relations" | "complete-center-relations" | "complete-selected-parent-relations";
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
    relations: CachedVisibleParentCertificate;
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


/** Compare a potentially large requested scope without one giant JSON serialization. */
async function sameScope(left: ContributorRequest, right: ContributorRequest, runtime: GraphCompilerRuntime): Promise<boolean> {
  if (left.kind !== right.kind || left.endpoints.length !== right.endpoints.length
    || (left.fields?.length ?? -1) !== (right.fields?.length ?? -1)
    || (left.literals?.length ?? -1) !== (right.literals?.length ?? -1)) return false;
  let visited = 0;
  const checkpoint = async (): Promise<boolean> => {
    visited += 1;
    if (visited % SOURCE_MAX_BATCH_RECORDS !== 0) return runtime.isCurrent();
    await runtime.yield(); return runtime.isCurrent();
  };
  for (let index = 0; index < left.endpoints.length; index += 1) {
    const a = left.endpoints[index], b = right.endpoints[index];
    if (a.id !== b.id || a.kind !== b.kind || a.state !== b.state || a.semanticPath !== b.semanticPath || a.physicalPath !== b.physicalPath) return false;
    if (!(await checkpoint())) return false;
  }
  for (const key of ["fields", "literals"] as const) {
    const a = left[key] ?? [], b = right[key] ?? [];
    for (let index = 0; index < a.length; index += 1) {
      if (a[index] !== b[index]) return false;
      if (!(await checkpoint())) return false;
    }
  }
  return runtime.isCurrent();
}

/** Compare every root and host coordinate; equal heads alone cannot authenticate negative ranges. */
function sameRoot(left: ContributorCertificate, right: ContributorCertificate): boolean {
  const a = left.dependency, b = right.dependency, h = left.host, k = right.host;
  return a.digest === b.digest && a.generation === b.generation && a.revision === b.revision
    && a.sequence === b.sequence && a.slot === b.slot
    && h.epoch === k.epoch && h.revision === k.revision && h.token === k.token;
}

/** The combined range must retain every original owner/structural occurrence, not just its keys. */
async function containsCover(combined: ContributorCertificate, initial: ContributorCertificate,
  runtime: GraphCompilerRuntime): Promise<boolean> {
  if ((combined.hostFactOrder === "scope-local") !== (initial.hostFactOrder === "scope-local")) return false;
  let visited = 0;
  const checkpoint = async (): Promise<boolean> => {
    visited += 1;
    if (visited % SOURCE_MAX_BATCH_RECORDS !== 0) return runtime.isCurrent();
    await runtime.yield(); return runtime.isCurrent();
  };
  const sources = new Map<string, ContributorCertificate["sources"][number]>();
  for (const stamp of combined.sources) { sources.set(stamp.head.sourceId, stamp); if (!(await checkpoint())) return false; }
  for (const stamp of initial.sources) {
    if (JSON.stringify(sources.get(stamp.head.sourceId)) !== JSON.stringify(stamp)) return false;
    if (!(await checkpoint())) return false;
  }
  if (combined.hostFactOrder === "scope-local") {
    // Widening a finite source-local scope can insert earlier current facts and therefore renumber
    // them. Each certificate authenticates its exact stream; containment binds the occurrence itself.
    const facts = new Map<string, ContributorCertificate["hostFacts"][number]["fact"]>();
    /** Constructors identify one structural occurrence by kind and exact source/target IDs. */
    const key = (fact: ContributorCertificate["hostFacts"][number]["fact"]): string =>
      JSON.stringify([fact.kind, fact.source.id, fact.kind === "entity" ? fact.entity.id : fact.target.entity.id]);
    for (const entry of combined.hostFacts) { facts.set(key(entry.fact), entry.fact); if (!(await checkpoint())) return false; }
    for (const entry of initial.hostFacts) {
      if (JSON.stringify(facts.get(key(entry.fact))) !== JSON.stringify(entry.fact)) return false;
      if (!(await checkpoint())) return false;
    }
  } else {
    const facts = new Map<number, string>();
    for (const entry of combined.hostFacts) { facts.set(entry.order, JSON.stringify(entry.fact)); if (!(await checkpoint())) return false; }
    for (const entry of initial.hostFacts) { if (facts.get(entry.order) !== JSON.stringify(entry.fact)) return false; if (!(await checkpoint())) return false; }
  }
  return runtime.isCurrent();
}

/**
 * Project the canonical semantic parent frontier. Relation-only callers retain every parent;
 * gate callers retain every proved policy-visible parent, independently of top-N or sorting. Scan even non-parent incidence cooperatively. Null rejects an
 * oversized/cancelled frontier, never a ready prefix; the caller reports the exact lifetime reason.
 */
async function parentsOf(compilation: PortableGraphCompilation, center: SourceEntityRef,
  inferAllLinksAsFriends: boolean, runtime: GraphCompilerRuntime,
  visibility?: Readonly<{ settings: CachedCenterGateSettings; entities: SourcePatchReadPort }>): Promise<
    Readonly<{ outcome: "ready"; parents: readonly SourceEntityRef[] }>
    | Readonly<{ outcome: "unproved"; reason: SourceReason }>> {
  const parents: SourceEntityRef[] = [];
  let started = runtime.now(), visited = 0;
  for (const relation of compilation.node(center.id)?.neighbours.values() ?? []) {
    if (!runtime.isCurrent()) return { outcome: "unproved", reason: "cancelled" };
    if ((visited > 0 && visited % SOURCE_MAX_BATCH_RECORDS === 0) || runtime.now() - started >= runtime.sliceBudgetMs) {
      await runtime.yield();
      if (!runtime.isCurrent()) return { outcome: "unproved", reason: "cancelled" };
      started = runtime.now();
    }
    visited += 1;
    if (relation.isHidden || classifyRelation(relation, "parent", inferAllLinksAsFriends) === null) continue;
    if (visibility) {
      const proof = cachedCenterTargetVisibility(relation.target, visibility.settings, visibility.entities);
      if (proof.outcome !== "ready") return proof;
      if (!proof.visible || !visibility.settings.showInferredNodes
        && classifyRelation(relation, "parent", inferAllLinksAsFriends) === RelationType.INFERRED) continue;
    }
    parents.push(copyRef(relation.target));
  }
  return { outcome: "ready", parents: parents.sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0) };
}

/** Compose existing read-only capabilities; no production caller or publication method is added. */
export class CachedRequestedNeighborhoodReader {
  private readonly semantics: CachedSourceSemanticReader;

  /** Captures and exact-ID entity reads must observe the same clean host as discovery, without IO. */
  constructor(repository: NeutralSourceRepository,
    private readonly discovery: Pick<SourceContributorDiscovery, "discover" | "revalidate" | "isHostCurrent"> & Partial<Pick<SourceContributorDiscovery, "isGenerationCurrent">>,
    private readonly capture: CachedPairCapture, private readonly entities: SourcePatchReadPort) {
    this.semantics = new CachedSourceSemanticReader(repository);
  }

  /**
   * Close one center and the requested canonical parent incidence with at most two discoveries.
   * The final combined discovery supplies global owner order; source/structure lists are never
   * concatenated. The first private compilation goes out of scope before a second is constructed.
   * Empty/no-parent and explicitly deferred sibling scopes take one pass; selected scopes close
   * only the supplied IDs from the canonical parent frontier. Deferred results prove
   * the entire center, never complete parent incidence or sibling absence. Any failure discards
   * everything and triggers no fallback.
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
    /** Generation checks stay constant-time; selected host observations close at final validation. */
    const reason = (): SourceReason => requestReason() !== "ready" ? requestReason()
      : this.discovery.isGenerationCurrent?.() === false ? "stale" : "ready";
    /** Replay shares this request's full lifetime rather than the catalog's longer-lived demand. */
    const current = (): boolean => reason() === "ready";
    const captureRuntime = { ...runtime,
      /** A capture must not depend on the source-host callback it is about to create. */
      isCurrent: (): boolean => requestReason() === "ready",
    };
    const scopedRuntime = { ...runtime, isCurrent: current };
    if (!current()) return selectedSourceFailure(reason());
    if (!request || request.kind !== "neighborhood" || !request.center
      || request.siblingClosure !== undefined && request.siblingClosure !== "complete" && request.siblingClosure !== "deferred" && request.siblingClosure !== "selected"
      || request.siblingClosure !== "selected" && request.siblingParents !== undefined) {
      return selectedSourceFailure("unsupported-scope");
    }
    const siblingClosure = request.siblingClosure ?? "complete";
    // Optional selection is bounded independently of required direct incidence; snapshot before IO.
    if (siblingClosure === "selected" && (!request.siblingParents || request.siblingParents.length > SOURCE_MAX_BATCH_RECORDS
      || request.siblingParents.some(/** Reject malformed IDs without interpreting their opaque contents. */
        id => typeof id !== "string" || !id || id.length * 2 > 32 * 1024 * 1024))) return selectedSourceFailure("unsupported-scope");
    const selectedParents = new Set(request.siblingParents ?? []);
    if (selectedParents.size !== (request.siblingParents?.length ?? 0)) return selectedSourceFailure("unsupported-scope");
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
        const discovered = await this.discovery.discover(scope);
        if (!current()) return selectedSourceFailure(reason());
        if (discovered.outcome !== "ready") return discovered;
        if (discovered.coverage !== "complete-direct-contributors" || !(await sameScope(discovered.scope, scope, scopedRuntime))) {
          if (!current()) return selectedSourceFailure(reason());
          return selectedSourceFailure("dependency-invalid");
        }
        if (initial) {
          const covered = sameRoot(initial, discovered) && await containsCover(discovered, initial, scopedRuntime);
          if (!current()) return selectedSourceFailure(reason());
          if (!covered) return selectedSourceFailure("superseded");
          initial = null; // Release the first pass's heads/facts before constructing the final graph.
        }
        const selected = await this.captureOwners(discovered, owners, captureRuntime, reason);
        if (!current()) return selectedSourceFailure(reason());
        if (selected.outcome !== "ready") return selected;
        const prepared = await this.semantics.prepare(selected.requests, capturedPolicy, this.entities, scopedRuntime,
          discovered.hostFacts.map((entry) => entry.fact));
        if (!current()) return selectedSourceFailure(reason());
        if (prepared.outcome !== "ready") return prepared;
        if (prepared.policyRevision !== revision || !(await sameCachedSelections(prepared.sources, discovered.sources, scopedRuntime))) {
          if (!current()) return selectedSourceFailure(reason());
          return selectedSourceFailure("superseded");
        }
        sourceReplays += prepared.work.length;
        for (const work of prepared.work) familyVisits += work.familyVisits;
        const parentProjection = await parentsOf(prepared.compilation, center, capturedPolicy.settings.inferAllLinksAsFriends, scopedRuntime,
          visibility ? { settings: visibility, entities: this.entities } : undefined);
        if (!current()) return selectedSourceFailure(reason());
        if (parentProjection.outcome !== "ready") return selectedSourceFailure(parentProjection.reason);
        const parents = parentProjection.parents;
        const closureParents = siblingClosure === "complete" ? parents : siblingClosure === "selected"
          ? parents.filter(/** Only the current canonical parent frontier can gain optional completeness. */
            parent => selectedParents.has(parent.id)) : [];
        if (siblingClosure === "selected" && closureParents.length !== selectedParents.size) return selectedSourceFailure("unsupported-scope");
        if (frontier && !(await sameScope({ kind: "neighborhood", endpoints: parents },
          { kind: "neighborhood", endpoints: frontier }, scopedRuntime))) {
          if (!current()) return selectedSourceFailure(reason());
          return selectedSourceFailure("dependency-invalid");
        }
        if (pass === 0 && closureParents.length) {
          initial = discovered;
          frontier = parents;
          endpoints = [center, ...closureParents];
          // Keep only bounded refs/owner stamps/work, not this preparation or its graph, across passes.
          continue;
        }
        const projected = visibility ? await projectCachedCenterGates(prepared.compilation, center,
          capturedPolicy.settings.inferAllLinksAsFriends, visibility, this.entities, scopedRuntime) : null;
        if (!current()) return selectedSourceFailure(reason());
        if (projected && projected.outcome !== "ready") return selectedSourceFailure(projected.reason);
        const hosts = await validateCachedOwners(owners.values(), { ...runtime, isCurrent: current });
        if (hosts !== "ready") return selectedSourceFailure(current() ? hosts : reason());
        const validated = await this.discovery.revalidate(discovered);
        if (!current()) return selectedSourceFailure(reason());
        if (validated !== "ready") return selectedSourceFailure(validated);
        const finalHosts = cachedOwnersCurrent(owners.values());
        if (finalHosts !== "ready") return selectedSourceFailure(finalHosts);

        // No source callbacks exist for empty/host-only scopes, but their host observation must close.
        if (!this.discovery.isHostCurrent()) return selectedSourceFailure("host-catalog-stale");
        if (!current()) return selectedSourceFailure(reason());
        const coverage = siblingClosure === "complete" ? "complete-neighborhood-relations"
          : siblingClosure === "selected" && closureParents.length ? "complete-selected-parent-relations" : "complete-center-relations";
        const certificate: CachedNeighborhoodCertificate = { coverage,
          center, parents, completeParents: closureParents, siblingClosure,
          policyRevision: revision, gateTotals: "not-certified", contributors: discovered };
        if (projected && presentationRevision !== undefined) return {
          outcome: "ready", coverage: "complete-center-gates",
          certificate: { coverage: "complete-center-gates", relations: { ...certificate, coverage: siblingClosure === "complete" ? "complete-visible-parent-relations"
            : siblingClosure === "selected" && closureParents.length ? "complete-selected-parent-relations" : "complete-center-relations" },
            presentationRevision, visibleLists: "not-certified" },
          gates: projected.gates, preparation: prepared,
          work: { passes: pass + 1, sourceReplays, familyVisits,
            gateRelations: projected.work.relations, gateEntityReads: projected.work.entityReads },
        };
        return { outcome: "ready", coverage, certificate, preparation: prepared,
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
      if (requests.length % SOURCE_MAX_BATCH_RECORDS === 0) {
        await runtime.yield();
        if (reason() !== "ready") return selectedSourceFailure(reason());
      }
    }
    return { outcome: "ready", requests };
  }
}
