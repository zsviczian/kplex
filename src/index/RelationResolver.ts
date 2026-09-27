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
      yield: () => new Promise<void>((resolve) => window.setTimeout(resolve, 0)),
      isCurrent,
    },
    batchSize,
    onProgress,
  );
}
