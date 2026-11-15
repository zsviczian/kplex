/** Creation intent follows the source's rendered ports. Destination geometry selects an
 * endpoint only; it never reclassifies an explicitly dragged source gate. */
import type {RelationshipRole} from "../../core/graph/relations";

type GateRole = Exclude<RelationshipRole, "previous" | "next">;
type GateSide = "top" | "bottom" | "left" | "right";
type Modifiers = Readonly<{altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean}>;

/** Explicit view ports outrank the legacy Compass fallback, including disabled ports. */
export function sourceGateRole(gate: GateSide, ports: Partial<Record<GateSide, GateRole>> | undefined, flipped: boolean): GateRole | null {
  if (ports !== undefined) return ports[gate] ?? null;
  return gate === "top" ? "parent" : gate === "bottom" ? "child"
    : (gate === "left") !== flipped ? "left" : "right";
}

/** Primary forces Friend/Challenger, Alt forces Previous/Next; otherwise restore this side's
 * last used family. Shift alone does not change relationship meaning. Primary wins if both are held. */
export function gateCreationRole(role: GateRole, modifiers: Modifiers,
  remembered?: Readonly<{left?: RelationshipRole; right?: RelationshipRole}>): RelationshipRole {
  if (role !== "left" && role !== "right") return role;
  if (modifiers.ctrlKey || modifiers.metaKey) return role;
  const chronological = role === "left" ? "previous" : "next";
  return modifiers.altKey || remembered?.[role] === chronological ? chronological : role;
}

/** History/pin eligibility retains its existing four physical membership groups. */
export function gateGroupRole(role: RelationshipRole): GateRole {
  return role === "previous" ? "left" : role === "next" ? "right" : role;
}
