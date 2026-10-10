/**
 * Legacy host-bound composition of filtered Plex gate overlays. Only persistent semantic pairs
 * already represented in the materialized scene participate; viewport clipping and connector
 * attachment sides do not define membership. GraphIndex owns classification, visibility and
 * revision coherence, while the portable accumulator deduplicates exact target identities.
 */
import type { GraphIndex } from "../index/GraphIndex";
import type { PositionedEdge, PositionedNode } from "../types";
import { accumulateShownGateCounts, type ShownGateMembership } from "../core/plex/shownGateCounts";

/**
 * Project a detached filtered numerator with a current-read guard. Work scales with scene edges
 * and the existing cached incidence of represented endpoints, never all possible scene pairs.
 * Section outline/target projections have separate provenance and retain their existing totals
 * without asserting a persistent-graph ratio. Sibling witness edges count their real parent pair,
 * never a fabricated center-to-sibling connection. Style-only lenses do not call this projection.
 */
export function projectFilteredGateCounts(
  nodes: readonly PositionedNode[], edges: readonly PositionedEdge[], matchedPaths: ReadonlySet<string>,
  index: Pick<GraphIndex, "captureSemanticGateRead">,
) {
  const read = index.captureSemanticGateRead();
  const persistent = new Map(nodes.filter(/** Keep persistent semantic endpoints; section projections own a separate count contract. */ node => !node.page.transient).map(/** Bind each exact scene path to its canonical semantic page. */ node => [node.page.path, node.page]));
  const pairs = new Map<string, Set<string>>();
  /** Record one exact materialized endpoint pair, including duplicated/mirrored scene strokes. */
  const add = (source: string, target: string): void => {
    const targets = pairs.get(source) ?? new Set<string>();
    targets.add(target);
    pairs.set(source, targets);
  };
  for (const edge of edges) {
    if (!persistent.has(edge.sourcePath) || !persistent.has(edge.targetPath)
      || !matchedPaths.has(edge.sourcePath) || !matchedPaths.has(edge.targetPath)) continue;
    add(edge.sourcePath, edge.targetPath);
    add(edge.targetPath, edge.sourcePath);
  }
  const memberships: ShownGateMembership[] = [];
  const available = new Set(persistent.keys());
  for (const [path, targets] of pairs) {
    const classified = read.read(persistent.get(path)!, targets);
    if (classified === null) { available.delete(path); continue; }
    for (const [targetPath, gates] of classified) memberships.push({ nodePath: path, targetPath, gates });
  }
  return { counts: accumulateShownGateCounts(available, memberships), isCurrent: read.isCurrent };
}
