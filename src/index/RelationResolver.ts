/**
 * Compatibility exports for the portable relationship resolver. Existing host callers retain this facade while semantic decisions remain core-owned.
 * The cooperative compatibility adapter supplies host event-task yields to the canonical resolver;
 * the caller still owns cancellation and final publication.
 */
import { yieldToHostTask } from "../adapters/obsidian/yieldToHostTask";
import type { GraphPage } from "../types";
import type { RelationEvidenceStore } from "../core/graph/evidence";
import { resolveEvidenceStoreCooperative as resolveEvidenceStoreCooperativeCore } from "../core/graph/resolver";

export {
  classifyRelation,
  explainResolvedRelationship,
  relationVector,
  resolveEvidencePair,
  resolveEvidenceStore,
  type RelationVector,
  type RelationshipExplanation,
  type RelationshipSummary,
  type ResolvedRole,
} from "../core/graph/resolver";

/** Legacy host wrapper preserving the historical cooperative signature and renderer scheduler. */
export async function resolveEvidenceStoreCooperative(
  pages: Map<string, GraphPage>,
  store: RelationEvidenceStore,
  isCurrent: () => boolean,
  batchSize = 300,
  onProgress?: () => void,
): Promise<boolean> {
  return resolveEvidenceStoreCooperativeCore(
    pages,
    store,
    {
      now: () => performance.now(),
      yield: () => yieldToHostTask(),
      isCurrent,
    },
    batchSize,
    onProgress,
  );
}
