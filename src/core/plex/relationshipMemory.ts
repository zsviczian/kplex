/** Generic Add relationship memory is independent of explicit gate, role and journal choices. */
import type {RelationshipRole} from "../graph/relations";

export type GenericRelationshipSelection = Readonly<{role: RelationshipRole; field: string}>;

/** Decode one local preference without assigning or changing any configured ontology field. */
export function sanitizeGenericRelationshipSelection(value: unknown): GenericRelationshipSelection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const role: unknown = Reflect.get(value, "role"), field: unknown = Reflect.get(value, "field");
  if (role !== "parent" && role !== "child" && role !== "left" && role !== "right" && role !== "previous" && role !== "next") return null;
  return typeof field === "string" && field.trim() ? {role, field: field.trim()} : null;
}
