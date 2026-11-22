/**
 * Portable edit eligibility for one connection's document-property ontology. This application
 * policy consumes canonical pair evidence and configured role/pair facts without classifying a
 * relationship again. Native file identity, current property values and save authority remain
 * the host writer's responsibility; generic prose/cache references are retained unchanged.
 */
import {normalizeFieldName} from "../core/contracts/fieldName";
import {ONTOLOGY_RECIPROCAL, type OntologyConfiguration} from "../core/contracts/ontologyConfiguration";
import type {RelationEvidence} from "../core/graph/evidence";
import {RelationType, type RelationshipRole} from "../core/graph/relations";
import {frontmatterDeclarationKey, selectedFrontmatterDeclarations} from "./frontmatterUnlink";

/** One configured editable property declaration, retaining its exact physical field spelling. */
export type ConnectionOntologyDeclaration = RelationEvidence & {fieldName: string; declaredRole: RelationshipRole};

/** A finite single-owner or reciprocal-owner edit intent. Signature is independent of evidence
 * IDs, source ranges and whole-property payloads; consumers still reauthorize it before writes. */
export type ConnectionOntologySelection = Readonly<{
  declarations: readonly ConnectionOntologyDeclaration[];
  primary: ConnectionOntologyDeclaration;
  signature: string;
}>;

/** Refuse hidden/unknown roles without broad casts or deriving semantics from an endpoint path. */
function relationshipRole(role: string): role is RelationshipRole {
  return role === "parent" || role === "child" || role === "left" || role === "right" || role === "previous" || role === "next";
}

/** Preserve only a configured defined property whose canonical view agrees with its physical owner. */
function editableDeclaration(item: RelationEvidence, configuration: OntologyConfiguration, sourcePath: string): item is ConnectionOntologyDeclaration {
  if (!item.fieldName || item.relationType !== RelationType.DEFINED || !relationshipRole(item.declaredRole)) return false;
  if (configuration.roles.get(normalizeFieldName(item.fieldName)) !== item.declaredRole) return false;
  const viewRole = item.declaredByPath === sourcePath ? item.declaredRole : ONTOLOGY_RECIPROCAL[item.declaredRole];
  return item.role === viewRole;
}

/**
 * Select one physical property or the matching reciprocal pair from a canonical pair read.
 * Competing inline/date/structural/URL-property provenance fails closed. Ordinary inferred
 * references do not add an ontology and are never removal targets. Duplicate property evidence
 * reuses the established edit identity, while conflicting exact spellings remain ambiguous.
 *
 * @returns No intent for multiple ontologies, unsupported provenance or stale configuration.
 * The returned primary prefers the view source's declaration; a sole inverse owner is retained.
 */
export function selectConnectionOntology(evidence: readonly RelationEvidence[], configuration: OntologyConfiguration,
  sourcePath: string, targetPath: string): ConnectionOntologySelection | null {
  if (sourcePath === targetPath) return null;
  const spellings = new Map<string, string>();
  for (const item of evidence) {
    if (item.sourcePath !== sourcePath || item.targetPath !== targetPath
      || !(item.declaredByPath === sourcePath && item.declaredTargetPath === targetPath
        || item.declaredByPath === targetPath && item.declaredTargetPath === sourcePath)) return null;
    if (item.sourceKind !== "frontmatter-ontology") {
      if (item.relationType !== RelationType.INFERRED
        || item.sourceKind !== "obsidian-link" && item.sourceKind !== "unresolved-link" && item.sourceKind !== "body-url") return null;
      continue;
    }
    if (!editableDeclaration(item, configuration, sourcePath)) return null;
    const key = frontmatterDeclarationKey(item);
    if (key === null || spellings.has(key) && spellings.get(key) !== item.fieldName) return null;
    spellings.set(key, item.fieldName);
  }
  const declarations = selectedFrontmatterDeclarations(evidence).filter(
    /** The earlier complete validation proves every selected declaration still has a concrete supported field/role. */
    (item): item is ConnectionOntologyDeclaration => editableDeclaration(item, configuration, sourcePath));
  if (!declarations.length || declarations.length > 2) return null;
  const primary = declarations.find(/** The displayed source owns the initial direction when both notes author the pair. */ item => item.declaredByPath === sourcePath) ?? declarations[0];
  if (declarations.length === 2) {
    const other = declarations.find(/** A second distinct physical property must belong to the opposite note. */ item => item !== primary)!;
    if (other.declaredByPath === primary.declaredByPath || ONTOLOGY_RECIPROCAL[primary.declaredRole] !== other.declaredRole) return null;
    const key = normalizeFieldName(primary.fieldName), otherKey = normalizeFieldName(other.fieldName);
    const pair = configuration.pairs.get(key);
    if (pair ? normalizeFieldName(pair.partner) !== otherKey
      : key !== otherKey || primary.declaredRole !== "left" && primary.declaredRole !== "right") return null;
  }
  const coordinates = declarations.map(/** Keep exact physical spelling in addition to the shared normalized edit identity. */
    item => JSON.stringify([frontmatterDeclarationKey(item), item.fieldName])).sort();
  return {declarations, primary, signature: JSON.stringify([sourcePath, targetPath, coordinates])};
}
