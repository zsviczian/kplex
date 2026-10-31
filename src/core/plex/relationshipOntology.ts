/** Presentation of ontology fields from the canonical Connection details decisions. This module
 * never resolves roles or overrides evidence precedence; only active cached decisions participate. */
import type {RelationshipExplanation} from "../graph/resolver";
import {normalizeFieldName} from "../contracts/fieldName";

/** Keep Connection details' existing active-field order and deduplicate exact displayed names. */
export function activeOntologyFields(explanation: RelationshipExplanation): string[] {
  return [...new Set(explanation.decisions.filter(decision => decision.active)
    .map(decision => (decision.evidence.fieldName ?? decision.evidence.definition ?? "").trim()).filter(Boolean))];
}

/** The rendered relationship's resolved definition chooses the branch label, never list order.
 * Joint drivers retain their existing combined definition. Other active fields remain secondary;
 * overridden evidence cannot be promoted merely because its property name sorts earlier. */
export function exportRelationshipOntology(explanation: RelationshipExplanation | null, definition?: string): {primary?: string; additional: string[]} {
  if (!explanation) return {primary: definition, additional: []};
  const fields = activeOntologyFields({...explanation, decisions: explanation.decisions.filter(decision => Boolean(decision.evidence.fieldName) || decision.evidence.sourceKind === "frontmatter-ontology" || decision.evidence.sourceKind === "inline-ontology")}), keys = new Set(fields.map(normalizeFieldName));
  const driving = (definition?.split(",") ?? []).map(field => field.trim()).filter(field => keys.has(normalizeFieldName(field)));
  if (!driving.length && explanation.summary === "conflicting-defined-roles") driving.push(...fields);
  const drivingKeys = new Set(driving.map(normalizeFieldName));
  return {primary: driving.length ? driving.join(", ") : undefined, additional: fields.filter(field => !drivingKeys.has(normalizeFieldName(field)))};
}
