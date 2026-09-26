import { RelationType, type GraphPage, type Relation, type Role } from "../types";
import {
  RelationEvidenceStore,
  applyEvidenceToRelation,
  applyOntologyPrecedence,
  emptyRelation,
  type EvidenceDecision,
  type RelationEvidence,
} from "./RelationEvidence";

export type RelationVector = {
  pi: boolean; pd: boolean; ci: boolean; cd: boolean;
  lfd: boolean; rfd: boolean; pfd: boolean; nfd: boolean;
};

export type ResolvedRole = {
  role: Exclude<Role, "sibling">;
  relationType: RelationType;
};

export type RelationshipExplanation = {
  sourcePath: string;
  targetPath: string;
  resolvedRoles: ResolvedRole[];
  hidden: boolean;
  summary: string;
  decisions: EvidenceDecision[];
};

export function relationVector(relation: Relation, inferAllLinksAsFriends: boolean): RelationVector {
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

export function classifyRelation(
  relation: Relation,
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
      // Classic ExcaliBrain presents a defined Parent+Child conflict laterally. Preserve the
      // existing K-Plex behavior but centralize it here instead of fixing it later in the UI view.
      if (type && pd && cd) return RelationType.DEFINED;
      return type;
    }
    case "right": return !pd && !cd && !lfd && rfd && !nfd && !pfd ? RelationType.DEFINED : null;
    case "previous": return !pd && !cd && !lfd && !rfd && pfd && !nfd ? RelationType.DEFINED : null;
    case "next": return !pd && !cd && !lfd && !rfd && !pfd && nfd ? RelationType.DEFINED : null;
  }
}


export function resolveEvidencePair(
  pages: Map<string, GraphPage>,
  store: RelationEvidenceStore,
  sourcePath: string,
  targetPath: string,
  canonicalTarget?: (path: string, staged: GraphPage) => GraphPage,
): void {
  const source = pages.get(sourcePath);
  const target = pages.get(targetPath);
  if (!source || !target) return;
  const evidence = store.between(sourcePath, targetPath);
  if (!evidence.length) {
    source.neighbours.delete(targetPath);
    return;
  }
  const relation: Relation = { ...emptyRelation(), target: canonicalTarget?.(targetPath, target) ?? target };
  for (const decision of applyOntologyPrecedence(evidence)) applyEvidenceToRelation(relation, decision);
  const hasRole = relation.isHidden || relation.isParent || relation.isChild || relation.isLeftFriend ||
    relation.isRightFriend || relation.isNextFriend || relation.isPreviousFriend;
  if (hasRole) source.neighbours.set(targetPath, relation);
  else source.neighbours.delete(targetPath);
}

export function resolveEvidenceStore(
  pages: Map<string, GraphPage>,
  store: RelationEvidenceStore,
): void {
  for (const page of pages.values()) page.neighbours = new Map();

  for (const [sourcePath, targetPath, evidence] of store.entries()) {
    const source = pages.get(sourcePath);
    const target = pages.get(targetPath);
    if (!source || !target) continue;
    const relation: Relation = { ...emptyRelation(), target };
    for (const decision of applyOntologyPrecedence(evidence)) applyEvidenceToRelation(relation, decision);
    const hasRole = relation.isHidden || relation.isParent || relation.isChild || relation.isLeftFriend || relation.isRightFriend || relation.isNextFriend || relation.isPreviousFriend;
    if (hasRole) source.neighbours.set(targetPath, relation);
  }
}

/**
 * Cooperative variant used by the production index builder. Large vaults can contain hundreds
 * of thousands of directional evidence buckets; yielding periodically keeps Obsidian's WebView
 * responsive and avoids iOS watchdog-style reloads during a long synchronous resolver pass.
 */
export async function resolveEvidenceStoreCooperative(
  pages: Map<string, GraphPage>,
  store: RelationEvidenceStore,
  isCurrent: () => boolean,
  batchSize = 300,
  onProgress?: () => void,
): Promise<boolean> {
  // batchSize is now only a cheap cancellation checkpoint. Host yielding is time-budgeted: the
  // old iOS path yielded every 12 records, creating thousands of timers during a large rebuild.
  const sliceBudgetMs = 7;
  let sliceStartedAt = performance.now();
  const maybeYield = async (processed: number): Promise<boolean> => {
    if ((processed & 255) === 0) onProgress?.();
    if (processed % batchSize === 0 && !isCurrent()) return false;
    if (performance.now() - sliceStartedAt < sliceBudgetMs) return true;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    sliceStartedAt = performance.now();
    return isCurrent();
  };

  let processed = 0;
  for (const page of pages.values()) {
    page.neighbours = new Map();
    processed += 1;
    if (!(await maybeYield(processed))) return false;
  }

  processed = 0;
  for (const [sourcePath, targetPath, evidence] of store.entries()) {
    if (!isCurrent()) return false;
    const source = pages.get(sourcePath);
    const target = pages.get(targetPath);
    if (source && target) {
      const relation: Relation = { ...emptyRelation(), target };
      for (const decision of applyOntologyPrecedence(evidence)) applyEvidenceToRelation(relation, decision);
      const hasRole = relation.isHidden || relation.isParent || relation.isChild || relation.isLeftFriend || relation.isRightFriend || relation.isNextFriend || relation.isPreviousFriend;
      if (hasRole) source.neighbours.set(targetPath, relation);
    }
    processed += 1;
    if (!(await maybeYield(processed))) return false;
  }
  return isCurrent();
}

function sourceLabel(evidence: RelationEvidence): string {
  switch (evidence.sourceKind) {
    case "frontmatter-ontology": return "frontmatter ontology";
    case "inline-ontology": return "body ontology";
    case "obsidian-link": return "resolved note link";
    case "unresolved-link": return "unresolved note link";
    case "body-url": return "body URL";
    case "date-property": return "Date property";
    case "file-tree": return "physical folder tree";
    case "tag-tree": return "tag tree";
    case "url-origin": return "URL origin hierarchy";
  }
}

export function explainResolvedRelationship(
  source: GraphPage,
  target: GraphPage,
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

  let reason: string;
  if (relation?.isHidden && roles.length === 0) {
    reason = "The relationship is indexed but hidden from this source note's visible neighbourhood.";
  } else if (suppressed.length) {
    reason = "Frontmatter ontology takes precedence over conflicting body ontology; the overridden body evidence is retained for explanation.";
  } else if (activeDefinedRoles.size >= 2 && roles.some((item) => item.role === "left")) {
    reason = "Multiple active defined ontology roles conflict, so the pair is presented laterally as a friend relationship.";
  } else if (roles.some((item) => item.role === "left" && item.relationType === RelationType.INFERRED) && ordinaryDirections.length >= 2) {
    reason = "Ordinary links provide evidence in both directions, so the pair resolves to an inferred friend relationship.";
  } else if (roles.some((item) => item.relationType === RelationType.DEFINED)) {
    reason = "Defined ontology determines the visible relationship; inferred link evidence remains recorded but does not override it.";
  } else if (active.some((item) => item.evidence.sourceKind === "date-property")) {
    reason = "An Obsidian Date property maps to a Daily Notes target and is treated as an inferred outgoing relationship.";
  } else if (active.length) {
    reason = `The visible relationship is derived from ${sourceLabel(active[0].evidence)} evidence.`;
  } else {
    reason = "No active evidence currently resolves to a visible relationship.";
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
