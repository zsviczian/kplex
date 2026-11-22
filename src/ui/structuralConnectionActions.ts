/** Writable connection affordances from explicit endpoint facets; this never classifies semantic relationships. */
import type { GraphPage } from "../types";
import {RelationType} from "../core/graph/relations";

/** Only a physical Markdown note has editable YAML tag membership; tag hierarchy itself is read-only. */
export function tagMembershipPair(source: GraphPage | undefined, target: GraphPage | undefined): { note: GraphPage; tag: GraphPage } | null {
  if (!source || !target || source.transient || target.transient) return null;
  const tag = source.isTag ? source : target.isTag ? target : null;
  const note = tag === source ? target : source;
  return tag && !note.isFolder && !note.isTag && note.file?.extension === "md" ? { note, tag } : null;
}

/** Structural membership has no Hidden/ontology representation; folders are changed only through native file actions. */
export function connectionActionAllowed(id: "relationship.details" | "relationship.relink" | "relationship.unlink" | "relationship.hide", source: GraphPage | undefined, target: GraphPage | undefined): boolean {
  if (!source || !target) return false;
  if (id === "relationship.details") return true;
  if (source.isFolder || target.isFolder) return false;
  if (source.isTag || target.isTag) return id === "relationship.unlink" && Boolean(tagMembershipPair(source, target));
  return true;
}

/** An inferred connector can acquire an ontology whenever one non-structural endpoint can own
 * a document property. The caller supplies the canonical scene's relation type, not a new classifier. */
export function canDefineConnection(source: GraphPage | undefined, target: GraphPage | undefined, relationType: RelationType): boolean {
  return relationType === RelationType.INFERRED && connectionActionAllowed("relationship.relink", source, target)
    && Boolean(source && target && !source.transient && !target.transient
      && (source.file?.extension === "md" || target.file?.extension === "md"));
}
