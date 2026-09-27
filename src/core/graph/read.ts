import type { GraphNodeView, NodeId } from "./model";

/** A search hit is presentation-ready text paired with a host-free graph identity/view. */
export type GraphSearchHit = Readonly<{
  node: GraphNodeView;
  label: string;
  /** Host-provided secondary text; consumers must not reinterpret an opaque ID as a path. */
  detail: string;
}>;

/**
 * Narrow semantic-index search capability used by the production search box.
 * Ranking, visibility and entry-point policy remain owned by the implementation.
 * Returned views are valid only for the publication/presentation revision in which search() ran.
 */
export interface GraphSearchRead {
  search(query: string, limit: number): readonly GraphSearchHit[];
}

/** Keep activation identity-only across the portable search boundary. */
export type GraphSearchActivation = (id: NodeId) => void;
