/**
 * Portable relationship reconciliation and explanations derived from source evidence. Date-only
 * definitions retain their Date reason instead of implying configured wiki-link ontology. Semantic
 * roles and reason codes remain independent of layout, host APIs and language.
 */
import { RelationType, type ResolverTarget, type Role, type SemanticRelation } from "./relations";
import {
  RelationEvidenceStore,
  applyEvidenceToRelation,
  applyOntologyPrecedence,
  emptyRelation,
  type EvidenceDecision,
  type EvidenceSourceKind,
  type RelationEvidence,
} from "./evidence";

export type RelationVector = {
  pi: boolean; pd: boolean; ci: boolean; cd: boolean;
  lfd: boolean; rfd: boolean; pfd: boolean; nfd: boolean;
};

export type ResolvedRole = {
  role: Exclude<Role, "sibling">;
  relationType: RelationType;
};

export type RelationshipSummary =
  | "hidden"
  | "ontology-precedence"
  | "conflicting-defined-roles"
  | "bidirectional-inferred"
  | "defined-ontology"
  | "date-property"
  | "no-active-evidence"
  | "transient-section"
  | `source:${EvidenceSourceKind}`;

export type RelationshipExplanation = {
  sourcePath: string;
  targetPath: string;
  resolvedRoles: ResolvedRole[];
  hidden: boolean;
  /** Stable semantic reason. The UI adapter maps this to localized presentation copy. */
  summary: RelationshipSummary;
  decisions: EvidenceDecision[];
};

/** Explicit cooperative runtime. Core resolution never chooses a host clock or scheduler. */
export type ResolverCooperativeRuntime = Readonly<{
  now: () => number;
  yield: () => Promise<void>;
  isCurrent: () => boolean;
}>;

export const RESOLVER_SLICE_BUDGET_MS = 7;

export function relationVector<TTarget>(relation: SemanticRelation<TTarget>, inferAllLinksAsFriends: boolean): RelationVector {
  return {
    pi: relation.isParent && relation.parentType === RelationType.INFERRED,
    pd: relation.isParent && relation.parentType === RelationType.DEFINED,
    ci: relation.isChild && relation.childType === RelationType.INFERRED,
    cd: relation.isChild && relation.childType === RelationType.DEFINED,
    lfd: (!inferAllLinksAsFriends && relation.isLeftFriend) ||
      (inferAllLinksAsFriends && relation.isLeftFriend && ![
        relation.parentType === RelationType.DEFINED,
        relation.childType === RelationType.DEFINED,
        relation.rightFriendType === RelationType.DEFINED,
        relation.nextFriendType === RelationType.DEFINED,
        relation.previousFriendType === RelationType.DEFINED,
      ].some(Boolean)),
    rfd: relation.isRightFriend && relation.rightFriendType === RelationType.DEFINED,
    pfd: relation.isPreviousFriend && relation.previousFriendType === RelationType.DEFINED,
    nfd: relation.isNextFriend && relation.nextFriendType === RelationType.DEFINED,
  };
}

export function classifyRelation<TTarget>(
  relation: SemanticRelation<TTarget>,
  role: Exclude<Role, "sibling">,
  inferAllLinksAsFriends: boolean,
): RelationType | null {
  const { pi, pd, ci, cd, lfd, rfd, nfd, pfd } = relationVector(relation, inferAllLinksAsFriends);
  switch (role) {
    case "child":
      return cd && !pd && !lfd && !rfd && !nfd && !pfd
        ? RelationType.DEFINED
        : !pi && !pd && ci && !cd && !lfd && !rfd && !nfd && !pfd ? RelationType.INFERRED : null;
    case "parent":
      return !cd && pd && !lfd && !rfd && !nfd && !pfd
        ? RelationType.DEFINED
        : pi && !pd && !ci && !cd && !lfd && !rfd && !nfd && !pfd ? RelationType.INFERRED : null;
    case "left": {
      const type = lfd
        ? RelationType.DEFINED
        : ((pi && !pd && ci && !cd && !lfd && !rfd && !nfd && !pfd) || [pd, cd, lfd, rfd, nfd, pfd].filter(Boolean).length >= 2)
          ? RelationType.INFERRED : null;
      // K-Plex presents a defined Parent+Child conflict laterally. Preserve the
      // existing K-Plex behavior but centralize it here instead of fixing it later in the UI view.
      if (type && pd && cd) return RelationType.DEFINED;
      return type;
    }
    case "right": return !pd && !cd && !lfd && rfd && !nfd && !pfd ? RelationType.DEFINED : null;
    case "previous": return !pd && !cd && !lfd && !rfd && pfd && !nfd ? RelationType.DEFINED : null;
    case "next": return !pd && !cd && !lfd && !rfd && !pfd && nfd ? RelationType.DEFINED : null;
  }
}


export type ResolverKeyTarget<TTarget> = {
  neighbours: Map<string, SemanticRelation<TTarget>>;
};

const relationHasRole = <TTarget>(relation: SemanticRelation<TTarget>): boolean =>
  relation.isHidden || relation.isParent || relation.isChild || relation.isLeftFriend ||
  relation.isRightFriend || relation.isNextFriend || relation.isPreviousFriend;

/**
 * Resolve one exact identity-key pair without requiring that the key be a semantic path.
 * The legacy path-based API below delegates to the same evidence/precedence implementation.
 */
export function resolveEvidencePairByKey<TPage extends ResolverKeyTarget<TPage>>(
  pages: Map<string, TPage>,
  store: RelationEvidenceStore,
  sourceKey: string,
  targetKey: string,
  canonicalTarget?: (key: string, staged: TPage) => TPage,
): void {
  const source = pages.get(sourceKey);
  const target = pages.get(targetKey);
  if (!source || !target) return;
  const evidence = store.between(sourceKey, targetKey);
  if (!evidence.length) {
    source.neighbours.delete(targetKey);
    return;
  }
  const relation: SemanticRelation<TPage> = { ...emptyRelation<TPage>(), target: canonicalTarget?.(targetKey, target) ?? target };
  for (const decision of applyOntologyPrecedence(evidence)) applyEvidenceToRelation(relation, decision);
  if (relationHasRole(relation)) source.neighbours.set(targetKey, relation);
  else source.neighbours.delete(targetKey);
}

export function resolveEvidenceStoreByKey<TPage extends ResolverKeyTarget<TPage>>(
  pages: Map<string, TPage>,
  store: RelationEvidenceStore,
): void {
  for (const page of pages.values()) page.neighbours = new Map();
  for (const [sourceKey, targetKey, evidence] of store.entries()) {
    const source = pages.get(sourceKey);
    const target = pages.get(targetKey);
    if (!source || !target) continue;
    const relation: SemanticRelation<TPage> = { ...emptyRelation<TPage>(), target };
    for (const decision of applyOntologyPrecedence(evidence)) applyEvidenceToRelation(relation, decision);
    if (relationHasRole(relation)) source.neighbours.set(targetKey, relation);
  }
}

export function resolveEvidencePair<TPage extends ResolverTarget<TPage>>(
  pages: Map<string, TPage>,
  store: RelationEvidenceStore,
  sourcePath: string,
  targetPath: string,
  canonicalTarget?: (path: string, staged: TPage) => TPage,
): void {
  resolveEvidencePairByKey(pages, store, sourcePath, targetPath, canonicalTarget);
}

export function resolveEvidenceStore<TPage extends ResolverTarget<TPage>>(
  pages: Map<string, TPage>,
  store: RelationEvidenceStore,
): void {
  resolveEvidenceStoreByKey(pages, store);
}

/** Cooperative full-store resolution using an injected clock, yield and lifetime policy. */
export async function resolveEvidenceStoreCooperativeByKey<TPage extends ResolverKeyTarget<TPage>>(
  pages: Map<string, TPage>,
  store: RelationEvidenceStore,
  runtime: ResolverCooperativeRuntime,
  batchSize = 300,
  onProgress?: () => void,
): Promise<boolean> {
  let sliceStartedAt = runtime.now();
  const maybeYield = async (processed: number): Promise<boolean> => {
    if ((processed & 255) === 0) onProgress?.();
    if (processed % batchSize === 0 && !runtime.isCurrent()) return false;
    if (runtime.now() - sliceStartedAt < RESOLVER_SLICE_BUDGET_MS) return true;
    if (!runtime.isCurrent()) return false;
    await runtime.yield();
    if (!runtime.isCurrent()) return false;
    sliceStartedAt = runtime.now();
    return true;
  };

  let processed = 0;
  for (const page of pages.values()) {
    page.neighbours = new Map();
    processed += 1;
    if (!(await maybeYield(processed))) return false;
  }

  processed = 0;
  for (const [sourceKey, targetKey, evidence] of store.entries()) {
    if (!runtime.isCurrent()) return false;
    const source = pages.get(sourceKey);
    const target = pages.get(targetKey);
    if (source && target) {
      const relation: SemanticRelation<TPage> = { ...emptyRelation<TPage>(), target };
      for (const decision of applyOntologyPrecedence(evidence)) applyEvidenceToRelation(relation, decision);
      if (relationHasRole(relation)) source.neighbours.set(targetKey, relation);
    }
    processed += 1;
    if (!(await maybeYield(processed))) return false;
  }
  return runtime.isCurrent();
}

export async function resolveEvidenceStoreCooperative<TPage extends ResolverTarget<TPage>>(
  pages: Map<string, TPage>,
  store: RelationEvidenceStore,
  runtime: ResolverCooperativeRuntime,
  batchSize = 300,
  onProgress?: () => void,
): Promise<boolean> {
  return resolveEvidenceStoreCooperativeByKey(pages, store, runtime, batchSize, onProgress);
}


/** Describe the reconciled pair with stable reasons; Date-only definitions keep Date provenance while higher-priority conflict/suppression reasons remain authoritative. */
export function explainResolvedRelationship<TPage extends ResolverTarget<TPage>>(
  source: TPage,
  target: TPage,
  evidence: RelationEvidence[],
  inferAllLinksAsFriends: boolean,
): RelationshipExplanation {
  const decisions = applyOntologyPrecedence(evidence);
  const relation = source.neighbours.get(target.path);
  const roles: ResolvedRole[] = [];
  if (relation) {
    for (const role of ["parent", "child", "left", "right", "previous", "next"] as const) {
      const relationType = classifyRelation(relation, role, inferAllLinksAsFriends);
      if (relationType) roles.push({ role, relationType });
    }
  }

  const suppressed = decisions.filter((item) => !item.active);
  const active = decisions.filter((item) => item.active);
  const activeDefinedRoles = new Set(active
    .filter((item) => item.evidence.relationType === RelationType.DEFINED && item.evidence.role !== "hidden")
    .map((item) => item.evidence.role));
  const ordinaryDirections = active.filter((item) => item.evidence.relationType === RelationType.INFERRED &&
    (item.evidence.sourceKind === "obsidian-link" || item.evidence.sourceKind === "unresolved-link"));

  let reason: RelationshipSummary;
  if (relation?.isHidden && roles.length === 0) {
    reason = "hidden";
  } else if (suppressed.length) {
    reason = "ontology-precedence";
  } else if (activeDefinedRoles.size >= 2 && roles.some((item) => item.role === "left")) {
    reason = "conflicting-defined-roles";
  } else if (roles.some((item) => item.role === "left" && item.relationType === RelationType.INFERRED) && ordinaryDirections.length >= 2) {
    reason = "bidirectional-inferred";
  } else if (active.some((item) => item.evidence.sourceKind === "date-property")
    && active.every((item) => item.evidence.relationType !== RelationType.DEFINED || item.evidence.sourceKind === "date-property")) {
    reason = "date-property";
  } else if (roles.some((item) => item.relationType === RelationType.DEFINED)) {
    reason = "defined-ontology";
  } else if (active.some((item) => item.evidence.sourceKind === "date-property")) {
    reason = "date-property";
  } else if (active.length) {
    reason = `source:${active[0].evidence.sourceKind}`;
  } else {
    reason = "no-active-evidence";
  }

  return {
    sourcePath: source.path,
    targetPath: target.path,
    resolvedRoles: roles,
    hidden: relation?.isHidden ?? false,
    summary: reason,
    decisions,
  };
}
