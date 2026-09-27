import type { GraphPage } from "../types";
import { RelationEvidenceStore } from "./RelationEvidence";

/** Published graph repository state. Full replacements are built privately, while runtime patches
 * and cold progressive startup mutate only through synchronous per-source commit boundaries. A
 * startup state may therefore be useful before every Markdown source has been ingested. */
export type GraphState = {
  pages: Map<string, GraphPage>;
  lowercasePathMap: Map<string, string>;
  evidence: RelationEvidenceStore;
  discoveredFields: Map<string, { name: string; count: number }>;
};

export const createGraphState = (): GraphState => ({
  pages: new Map<string, GraphPage>(),
  lowercasePathMap: new Map<string, string>(),
  evidence: new RelationEvidenceStore(),
  discoveredFields: new Map<string, { name: string; count: number }>(),
});

export function getGraphPage(state: GraphState, path: string): GraphPage | undefined {
  return state.pages.get(path) ?? state.pages.get(state.lowercasePathMap.get(path.toLowerCase()) ?? "");
}
