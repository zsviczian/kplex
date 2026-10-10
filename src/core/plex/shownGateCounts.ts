/**
 * Portable, detached presentation counts for a finite materialized Plex. The graph read owner
 * supplies already-classified endpoint gate memberships; this accumulator knows no relationship
 * flags, physical connector routes, host files, source acquisition or editing authority.
 */

/** Semantic endpoint sides shared with the existing gate presentation contract. */
export type SemanticGateSide = "top" | "bottom" | "left" | "right";

/** One classified endpoint-to-target connection; identities remain exact and case-sensitive. */
export type ShownGateMembership = Readonly<{
  nodePath: string;
  targetPath: string;
  gates: readonly SemanticGateSide[];
}>;

/** Detached unique-target counts, independent of denominator coverage and gate fill. */
export type ShownGateCounts = Record<SemanticGateSide, number>;

/**
 * Count each exact target once on each semantic gate, including duplicate scene/provenance
 * representations and several roles occupying one side. Supplied nodes with no surviving
 * membership receive a real shown zero; unavailable reads must be withheld by the caller.
 */
export function accumulateShownGateCounts(
  nodePaths: Iterable<string>, memberships: Iterable<ShownGateMembership>,
): Map<string, ShownGateCounts> {
  const targets = new Map<string, Record<SemanticGateSide, Set<string>>>();
  for (const path of nodePaths) targets.set(path, { top: new Set(), bottom: new Set(), left: new Set(), right: new Set() });
  for (const membership of memberships) {
    const gates = targets.get(membership.nodePath);
    if (!gates) continue;
    for (const gate of membership.gates) gates[gate].add(membership.targetPath);
  }
  const result = new Map<string, ShownGateCounts>();
  for (const [path, gates] of targets) result.set(path, {
    top: gates.top.size, bottom: gates.bottom.size, left: gates.left.size, right: gates.right.size,
  });
  return result;
}
