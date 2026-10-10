/**
 * Portable edit-intent coordinates for explicit frontmatter declarations. These helpers deduplicate
 * inspection actions only; the native writer still owns file identity, property validation and save
 * authority. Evidence IDs, visual source ranges and generic cache mirrors are never edit identities.
 */
import { normalizeFieldName } from "../core/contracts/fieldName";
import type { RelationEvidence } from "../core/graph/evidence";
import { RelationType } from "../core/graph/relations";

/** Return the exact declaration tuple, or no edit intent for inferred/non-frontmatter provenance. */
export function frontmatterDeclarationKey(evidence: RelationEvidence): string | null {
  if (evidence.sourceKind !== "frontmatter-ontology" || evidence.relationType !== RelationType.DEFINED || !evidence.fieldName) return null;
  return JSON.stringify([evidence.sourceKind, evidence.declaredByPath, normalizeFieldName(evidence.fieldName),
    evidence.declaredTargetPath, evidence.declaredRole, evidence.direction]);
}

/** Collapse repeated occurrences of one property-to-target declaration while retaining independent fields/owners. */
export function selectedFrontmatterDeclarations(evidence: readonly RelationEvidence[]): readonly RelationEvidence[] {
  const unique = new Map<string, RelationEvidence>();
  for (const item of evidence) {
    const key = frontmatterDeclarationKey(item);
    if (key !== null && !unique.has(key)) unique.set(key, item);
  }
  return [...unique.values()];
}
