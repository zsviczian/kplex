/** YAML-only optional defaults shared by individual and reviewed bulk initialization.
 * This adapter stages absent keys; native FileManager and its caller retain write/lifetime ownership. */
import {normalizeFieldName} from "../../core/contracts/fieldName";
import {noteTypeSelection, noteTypeAsTag, type NoteTypeSelection, NoteTypeChangedError} from "./tagNoteType";
import {hasYamlTagMembership} from "./tagMembership";
import type {NodeProperty} from "../../core/plex/nodeProperties";

/** Normalized existing keys, including null/empty values, satisfy an optional configured default. */
export function missingNoteProperties(frontmatter: Record<string, unknown>, rows: readonly NodeProperty[]): string[] {
  const present = new Set(Object.keys(frontmatter).map(normalizeFieldName));
  return rows.filter(row => !present.has(normalizeFieldName(row.field))).map(row => row.field);
}

/** Reauthorize the same tag-backed primary selector and append only still-absent empty keys.
 * Hidden display fields participate; no property is mandatory and no existing value is replaced. */
export function initializeNoteProperties(frontmatter: Record<string, unknown>, field: string, opening: NoteTypeSelection,
  rows: readonly NodeProperty[], invalid: string): boolean {
  const selected = noteTypeSelection(frontmatter, field), tag = noteTypeAsTag(selected.value);
  if (!selected.supported || selected.token !== opening.token) throw new NoteTypeChangedError(selected);
  if (!tag || !hasYamlTagMembership(frontmatter, tag)) throw new Error(invalid);
  const missing = missingNoteProperties(frontmatter, rows);
  for (const key of missing) Object.defineProperty(frontmatter, key, {value: null, enumerable: true, configurable: true, writable: true});
  return missing.length > 0;
}
