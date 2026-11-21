/**
 * Read-only feedback for a committed relationship in its originating Plex. Reuses ordinary
 * node visibility and the shared predicate/lens evaluators; missing pair publication is not
 * evidence of filtering. No source acquisition, indexing, navigation or preference writes.
 */
import type {GraphIndex} from "../index/GraphIndex";
import type {KplexSettings} from "../settings";
import type {GraphPage} from "../types";
import type {GraphPredicateEngine, CompiledGraphPredicate} from "../lens/GraphPredicate";
import {matchesGraphLenses, type CompiledGraphLensSet} from "../lens/GraphLens";

/** Check the saved endpoint against live visibility. Any admitted role keeps a multi-role
 * endpoint visible; Previous/Next use their displayed Left/Right roles just as scene filtering
 * does. Pending pair metadata remains unknown, while a disabled node kind is already certain. */
export function linkedNodeHidden(
  index: Pick<GraphIndex, "isVisiblePage" | "neighbours" | "titleFor" | "explainRelationship">,
  settings: KplexSettings,
  engine: GraphPredicateEngine,
  predicate: CompiledGraphPredicate | null,
  lenses: CompiledGraphLensSet,
  origin: GraphPage,
  target: GraphPage,
  center: GraphPage | undefined,
): boolean {
  if (target.path === center?.path) return false;
  if (!index.isVisiblePage(target, settings, origin.isTag)) return true;
  if (!predicate && !lenses.lenses.some(lens => lens.mode !== "style")) return false;
  const roles = ["parent", "child", "left", "right", "previous", "next"] as const;
  const relations = roles.flatMap(/** Reuse cached role classification, retaining every displayed role of this endpoint. */ role =>
    index.neighbours(origin, role).filter(relation => relation.page.path === target.path));
  if (!relations.length) return false;
  const label = index.titleFor(target);
  return !relations.some(/** Evaluate actual published roles/ontology, never the composer's requested guess. */ relation => {
    const edge = {role: relation.role === "previous" ? "left" as const : relation.role === "next" ? "right" as const : relation.role,
      relationType: relation.relationType, definition: relation.typeDefinition, linkDirection: relation.linkDirection,
      sourcePath: origin.path, targetPath: target.path};
    return engine.matches(predicate, {node: {page: target, label}, center, edge})
      && matchesGraphLenses(engine, index, lenses, {page: target, label, center, edge});
  });
}
