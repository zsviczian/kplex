/** Classic's ordered, capped local projection. Reads are already classified/admitted by the semantic owner. */
import {RelationType, type Role} from "../../../graph/relations";

/** Canonical roles read for a second-order witness; presentation never reclassifies evidence. */
export const CLASSIC_NEIGHBOR_ROLES = ["parent", "child", "left", "right", "previous", "next"] as const;

/** Payloads stay opaque to policy; the host retains canonical objects and lazy presentation. */
export type ClassicRelation<P> = {page: P; role: Role; relationType: RelationType};
export type ClassicNeighborhood<P, R extends ClassicRelation<P>> = {
  center: P; parents: R[]; children: R[]; leftFriends: R[]; rightFriends: R[]; siblings: R[];
};
export type ClassicProjectionRead<P, R extends ClassicRelation<P>> = Readonly<{
  identity: (page: P) => string;
  neighbours: (page: P, role: Role) => R[];
  sort: (rows: R[]) => R[];
}>;

/** Bound a sorted parent candidate pool before Classic removes occupied direct zones.
 * Four direct zones can occupy at most `4 * maximum` nodes plus the center; retaining that
 * prefix and another `maximum` candidates preserves every possible displayed sibling without
 * requiring a complete parent graph. The final per-zone display cap remains unchanged. */
export function classicSiblingCandidateLimit(maximum: number): number {
  return 5 * Math.max(1, Math.floor(maximum)) + 1;
}

/** Preserve direct area order/caps, then collect unique neighbors of every displayed direct node.
 * The center and occupied direct areas never appear again in the peripheral sibling area. */
export function projectClassicNeighborhood<P, R extends ClassicRelation<P>>(center: P,
  read: ClassicProjectionRead<P, R>, maximum: number, renderSiblings: boolean): ClassicNeighborhood<P, R> {
  const parents = read.neighbours(center, "parent").slice(0, maximum);
  const children = read.neighbours(center, "child").slice(0, maximum);
  const leftFriends = [...read.neighbours(center, "left"), ...read.neighbours(center, "previous")].slice(0, maximum);
  const rightFriends = [...read.neighbours(center, "right"), ...read.neighbours(center, "next")].slice(0, maximum);
  const occupied = new Set([read.identity(center), ...[...parents, ...children, ...leftFriends, ...rightFriends].map(row => read.identity(row.page))]);
  const direct = new Map([...parents, ...children, ...leftFriends, ...rightFriends].map(row => [read.identity(row.page), row.page]));
  const siblings = new Map<string, R>();
  if (renderSiblings) for (const page of direct.values()) for (const role of CLASSIC_NEIGHBOR_ROLES) for (const sibling of read.neighbours(page, role)) {
    const id = read.identity(sibling.page);
    if (occupied.has(id)) continue;
    const previous = siblings.get(id);
    if (!previous || previous.relationType !== RelationType.DEFINED) siblings.set(id, {...sibling, role: "sibling"});
  }
  return {center, parents, children, leftFriends, rightFriends, siblings: read.sort([...siblings.values()]).slice(0, maximum)};
}

/** Hide peripheral duplicates of actual expanded child occurrences. The renderer supplies its
 * admitted identities after editor/fold decisions; projection never guesses which strips are open. */
export function excludeClassicSiblingOccurrences<P, R extends ClassicRelation<P>>(neighborhood: ClassicNeighborhood<P, R>,
  identity: (page: P) => string, occupied: ReadonlySet<string>): ClassicNeighborhood<P, R> {
  return {...neighborhood, siblings: neighborhood.siblings.filter(row => !occupied.has(identity(row.page)))};
}

/** Apply the same center exclusion, visibility predicate and cap to expanded-strip admission
 * and peripheral duplicate suppression. The caller supplies presentation matching, never graph policy. */
export function classicExpandedChildren<P, R extends ClassicRelation<P>>(page: P, center: P,
  read: Pick<ClassicProjectionRead<P, R>, "identity" | "neighbours">, maximum: number, include: (row: R) => boolean): R[] {
  return read.neighbours(page, "child").filter(row => read.identity(row.page) !== read.identity(center) && include(row)).slice(0, maximum);
}
