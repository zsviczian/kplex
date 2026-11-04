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

/** A held modifier selects the temporal alternative of the source's semantic lateral role. */
export function gateCreationRole(role: GateRole, modifiers: Modifiers): RelationshipRole {
  const modified = modifiers.altKey || modifiers.ctrlKey || modifiers.metaKey || modifiers.shiftKey;
  return modified && role === "left" ? "previous" : modified && role === "right" ? "next" : role;
}

/** History/pin eligibility retains its existing four physical membership groups. */
export function gateGroupRole(role: RelationshipRole): GateRole {
  return role === "previous" ? "left" : role === "next" ? "right" : role;
}
