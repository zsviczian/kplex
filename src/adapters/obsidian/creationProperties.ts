/** Native metadata types and atomic creation-property mutation. No files are created here;
 * the existing creation/template/metadata receipt retains exact native lifetime ownership. */
import type {App} from "obsidian";
import {normalizeFieldName} from "../../core/contracts/fieldName";
import {supportedCreationPropertyValue, type CreationMetadata, type CreationPropertyKind} from "../../application/creationProperties";
import {MAX_NODE_PROPERTIES} from "../../core/plex/nodeProperties";
import {noteTypeAsTag, noteTypeSelection, setNoteType} from "./tagNoteType";
import {appendTagMembership} from "./tagMembership";

/** Narrow existing native string lists before merging; arbitrary or sparse arrays stay unsupported. */
function stringList(value: unknown): value is readonly string[] {return Array.isArray(value) && Array.from(value).every(/** Preserve only supported native list entries, including during recovery. */ item => typeof item === "string");}

/** Read the same optional native widget registry used by source metadata acquisition. */
export function creationPropertyKind(app: App, field: string): CreationPropertyKind {
  const key = normalizeFieldName(field);
  if (key === "aliases" || key === "alias" || key === "tags") return "list";
  const manager = (app as App & {metadataTypeManager?: {getAssignedWidget?: (name: string) => string | null;
    getPropertyInfo?: (name: string) => {widget?: string} | null}}).metadataTypeManager;
  const widget = manager?.getAssignedWidget?.(field) ?? manager?.getPropertyInfo?.(field)?.widget;
  if (widget === "number" || widget === "checkbox" || widget === "date") return widget;
  if (widget === "datetime") return "datetime-local";
  return widget === "multitext" || widget === "tags" || widget === "aliases" ? "list" : "text";
}

/** Stage all fields before publishing any value, preserving template values unless explicitly edited.
 * Alias and tag entries append through their existing semantics; native selector ownership stays shared. */
export function applyCreationProperties(frontmatter: Record<string, unknown>, draft: CreationMetadata, typeField: string, invalid: string): void {
  const stage: Record<string, unknown> = {...frontmatter};
  if (draft.properties.length > MAX_NODE_PROPERTIES * 2 || draft.noteType !== null && typeof draft.noteType !== "string") throw new Error(invalid);
  const submitted = new Set<string>();
  const tagKeys = Object.keys(stage).filter(/** Reuse the template's one actual spelling rather than appending a normalized duplicate. */ key => normalizeFieldName(key) === "tags"), tagKey = tagKeys[0] ?? "tags";
  const tagStage: Record<string, unknown> = {tags: stage[tagKey]};
  let tagsTouched = false;
  for (const {field: inputField, value} of draft.properties) {
    const field = inputField.trim();
    const normalized = normalizeFieldName(field);
    const identity = normalized === "alias" ? "aliases" : normalized;
    if (!field || field.length > 128 || /[\r\n]/.test(field) || ["position", "__proto__", "constructor", "prototype"].includes(normalized)
      || normalized === normalizeFieldName(typeField) || submitted.has(identity) || !supportedCreationPropertyValue(value)) throw new Error(invalid);
    submitted.add(identity);
    const names = Object.keys(stage).filter(/** Aliases share native list semantics; unrelated property identities remain distinct. */ key => normalizeFieldName(key) === normalized
      || ["alias", "aliases"].includes(normalized) && ["alias", "aliases"].includes(normalizeFieldName(key)));
    if (names.length > 1) throw new Error(invalid);
    const key = names[0] ?? field;
    if (normalized === "tags") {
      if (tagKeys.length > 1) throw new Error(invalid);
      if (typeof value !== "string" && !stringList(value)) throw new Error(invalid);
      for (const item of typeof value === "string" ? [value] : value) {
        const tag = noteTypeAsTag(item);if (!tag) throw new Error(invalid);
        appendTagMembership(tagStage, tag, invalid);
      }
      tagsTouched = true;
    } else if (normalized === "alias" || normalized === "aliases") {
      const existing = stage[key];
      if (existing != null && typeof existing !== "string" && !stringList(existing)) throw new Error(invalid);
      if (typeof value !== "string" && !stringList(value)) throw new Error(invalid);
      const before = stringList(existing) ? existing : typeof existing === "string" && existing.trim() ? [existing] : [];
      stage[key] = [...new Set([...before, ...(typeof value === "string" ? [value] : value)])];
    } else Object.defineProperty(stage, key, {value: typeof value === "object" ? [...value] : value, enumerable: true, configurable: true, writable: true});
  }
  if (draft.noteType !== null) {
    if (tagKeys.length > 1) throw new Error(invalid);
    const selected = noteTypeSelection(stage, typeField), typeStage: Record<string, unknown> = {...stage, tags: tagStage.tags};
    setNoteType(typeStage, typeField, selected, draft.noteType, false, invalid);
    Object.defineProperty(stage, selected.key, {value: typeStage[selected.key], enumerable: true, configurable: true, writable: true});
    tagStage.tags = typeStage.tags;tagsTouched = true;
  }
  // Shared native writers use literal `tags`; publish their staged result under the template's
  // one actual spelling rather than introducing a second normalized Tags/tags property.
  if (tagsTouched && tagStage.tags !== stage[tagKey]) Object.defineProperty(stage, tagKey, {value: tagStage.tags, enumerable: true, configurable: true, writable: true});
  for (const key of Object.keys(stage)) if (stage[key] !== frontmatter[key])
    Object.defineProperty(frontmatter, key, {value: stage[key], enumerable: true, configurable: true, writable: true});
}
