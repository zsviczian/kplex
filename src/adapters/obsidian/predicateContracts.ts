import type { App } from "obsidian";
import type { RelationEvidence, EvidenceDecision } from "../../index/RelationEvidence";
import type { GraphPage, LinkDirection, RelationType, Role } from "../../types";
import type { GraphPropertyProvider, GraphPredicateContext } from "../../core/plex/predicate";
import type { GraphEvidenceProvider, PortableLensCandidate } from "../../core/plex/lens";
import { graphNodeViewFromLegacy } from "./graphContracts";

export type LegacyPredicateEdgeContext = {
  role?: Role | "center";
  relationType?: RelationType;
  definition?: string;
  linkDirection?: LinkDirection | null;
  sourcePath?: string;
  targetPath?: string;
};
export type LegacyPredicateContext = {
  node: { page: GraphPage; label?: string };
  edge?: LegacyPredicateEdgeContext;
  evidence?: RelationEvidence & { active?: boolean; suppressionReason?: string };
  center?: GraphPage;
};
export type LegacyLensCandidate = {
  page: GraphPage;
  label: string;
  center?: GraphPage;
  edge?: LegacyPredicateEdgeContext;
};
export type LegacyEvidenceSource = {
  explainRelationship(sourcePath: string, targetPath: string): { decisions: readonly EvidenceDecision[] } | null;
};

/** Cached Markdown properties only; never reads bodies or retains a frontmatter copy. */
export function createLegacyPropertyProvider(app: App): GraphPropertyProvider {
  return {
    getNoteProperty(node, key) {
      if (node.kind !== "document" || !node.file || node.file.extension !== "md") return undefined;
      const file = app.vault.getFileByPath(node.file.path);
      if (!file || file.extension !== "md") return undefined;
      const raw: unknown = app.metadataCache.getFileCache(file)?.frontmatter;
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
      const frontmatter = raw as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(frontmatter, key)) return frontmatter[key];
      const wanted = key.toLocaleLowerCase();
      const match = Object.keys(frontmatter).find((candidate) => candidate.toLocaleLowerCase() === wanted);
      return match ? frontmatter[match] : undefined;
    },
  };
}

export function predicateContextFromLegacy(context: LegacyPredicateContext): GraphPredicateContext {
  return {
    node: { node: graphNodeViewFromLegacy(context.node.page), label: context.node.label },
    center: context.center ? graphNodeViewFromLegacy(context.center) : undefined,
    edge: context.edge,
    evidence: context.evidence ? { ...context.evidence } : undefined,
  };
}

export function lensCandidateFromLegacy(candidate: LegacyLensCandidate): PortableLensCandidate {
  return {
    node: graphNodeViewFromLegacy(candidate.page),
    label: candidate.label,
    center: candidate.center ? graphNodeViewFromLegacy(candidate.center) : undefined,
    edge: candidate.edge,
  };
}

/** Pair-scoped mapping runs only when an evidence-scope lens requests it. */
export function createLegacyEvidenceProvider(index: LegacyEvidenceSource): GraphEvidenceProvider {
  return {
    decisions(sourcePath, targetPath) {
      return (index.explainRelationship(sourcePath, targetPath)?.decisions ?? []).map((decision) => ({
        evidence: { ...decision.evidence },
        active: decision.active,
        suppressionReason: decision.suppressionReason,
      }));
    },
  };
}
