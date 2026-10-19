/** Exact YAML tag/Note Type edits. Native FileManager owns atomic serialization and observation. */
import { normalizeFieldName } from "../../core/contracts/fieldName";
import { unwrapNoteType } from "../../core/graph/presentation";
import { appendTagMembership, removeTagMembership } from "./tagMembership";

export type TagAssignment = "tag" | "note-type";
export type NoteTypeConflictChoice = "replace" | "keep";
export type NoteTypeSelection = Readonly<{key: string; value: string | null; supported: boolean; token: string}>;

/** Preserve the user's actual property spelling and reject ambiguous/future values before writing. */
export function noteTypeSelection(frontmatter: Record<string, unknown>, field: string): NoteTypeSelection {
  const names = Object.keys(frontmatter).filter(key => normalizeFieldName(key) === normalizeFieldName(field));
  const key = names[0] ?? field, raw = frontmatter[key];
  const supported = Boolean(field.trim()) && normalizeFieldName(field) !== "tags" && names.length <= 1
    && (raw == null || typeof raw === "string" || Array.isArray(raw) && raw.length <= 1 && raw.every(value => typeof value === "string"));
  return {key, value: unwrapNoteType(raw), supported, token: supported ? JSON.stringify([names, raw]) : "unsupported"};
}

/** A single tag token cannot contain YAML/Markdown/whitespace syntax; native tags are never links. */
export function noteTypeAsTag(value: string | null): string | null {
  if (!value) return null;
  const tag = value.replace(/^#/, "");
  return tag && !/[\s#,[\]{}()|\\:]/u.test(tag) && !/^\/|\/$|\/\//.test(tag) ? tag : null;
}

/** A fresh conflicting property requires another explicit choice; never replace an unseen type. */
export class NoteTypeChangedError extends Error {
  constructor(readonly selection: NoteTypeSelection) { super("Note Type changed"); }
}

/** Stage owned fields first so rejection cannot leave a partial mutation in the native callback. */
export function assignTag(frontmatter: Record<string, unknown>, tag: string, field: string, assignment: TagAssignment,
  opening: NoteTypeSelection, conflict: NoteTypeConflictChoice | undefined, invalid: string): boolean {
  const selected = noteTypeSelection(frontmatter, field);
  const stage: Record<string, unknown> = {tags: frontmatter.tags};
  let changed = appendTagMembership(stage, tag, invalid);
  let replace = false;
  if (assignment === "note-type") {
    if (!selected.supported) throw new Error(invalid);
    if (selected.token !== opening.token) throw new NoteTypeChangedError(selected);
    const different = selected.value !== null && selected.value.toLocaleLowerCase() !== tag.toLocaleLowerCase();
    if (different && !conflict) throw new NoteTypeChangedError(selected);
    replace = !different || conflict === "replace";
    if (replace && different) {
      const oldTag = noteTypeAsTag(selected.value);
      if (!oldTag) throw new Error(invalid);
      changed = appendTagMembership(stage, oldTag, invalid) || changed;
    }
    changed = replace && frontmatter[selected.key] !== `#${tag}` || changed;
  }
  if (!changed) return false;
  frontmatter.tags = stage.tags;
  if (replace) frontmatter[selected.key] = `#${tag}`;
  return true;
}

/** Demotion keeps exact tag membership and clears only this matching single Note Type. */
export function demoteNoteType(frontmatter: Record<string, unknown>, tag: string, field: string, opening: NoteTypeSelection, invalid: string): boolean {
  const selected = noteTypeSelection(frontmatter, field);
  if (!selected.supported) throw new Error(invalid);
  if (selected.token !== opening.token || selected.value?.toLocaleLowerCase() !== tag.toLocaleLowerCase()) throw new NoteTypeChangedError(selected);
  const stage: Record<string, unknown> = {tags: frontmatter.tags}; appendTagMembership(stage, tag, invalid);
  frontmatter.tags = stage.tags; delete frontmatter[selected.key]; return true;
}

/** Unlink also clears this tag's Note Type selector, retaining other types and inline/body tags. */
export function unlinkTagAssignment(frontmatter: Record<string, unknown>, tag: string, field: string, invalid: string): boolean {
  const selected = noteTypeSelection(frontmatter, field), stage: Record<string, unknown> = {tags: frontmatter.tags};
  const removed = removeTagMembership(stage, tag, invalid);
  const clearType = selected.supported && selected.value?.toLocaleLowerCase() === tag.toLocaleLowerCase();
  if (removed) frontmatter.tags = stage.tags;
  if (clearType) delete frontmatter[selected.key];
  return removed || clearType;
}
