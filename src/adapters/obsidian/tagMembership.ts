/** Native YAML tag edits; preserve unrelated values and use Obsidian's existing scalar grammar. */
import { parseFrontMatterTags } from "obsidian";
import { canonicalTagParts } from "../../core/graph/tagPaths";
import { tagDisplayName } from "../../core/graph/presentation";
import type { GraphPage } from "../../types";

/** Only existing tag facets provide a tag coordinate; this never interprets neutral node IDs. */
export function graphTagValue(page: GraphPage): string | null {
  if (!page.isTag || page.transient) return null;
  const value = canonicalTagParts(tagDisplayName(page.path, true)).join("/");
  return value || null;
}

/** Cache-only negative membership lets inline-only Unlink open evidence without creating empty YAML. */
export function hasYamlTagMembership(frontmatter: Record<string, unknown>, tag: string): boolean {
  const value = frontmatter.tags;
  if (typeof value !== "string" && (!Array.isArray(value) || !value.every(/** Unsupported future/user data remains inspection-only. */ item => typeof item === "string"))) return false;
  return (parseFrontMatterTags(frontmatter) ?? []).some(/** Native tag grammar owns scalar/list interpretation. */ item => item.replace(/^#/, "").toLocaleLowerCase() === tag.toLocaleLowerCase());
}

/** Append exact membership idempotently without deleting/replacing unsupported user data. */
export function appendTagMembership(frontmatter: Record<string, unknown>, tag: string, invalidValue: string): boolean {
  const value = frontmatter.tags;
  if (value !== undefined && value !== null && typeof value !== "string" && (!Array.isArray(value) || !value.every(item => typeof item === "string"))) throw new Error(invalidValue);
  const existing = parseFrontMatterTags({ tags: value }) ?? [];
  const normalized = tag.toLocaleLowerCase();
  if (existing.some(item => item.replace(/^#/, "").toLocaleLowerCase() === normalized)) return false;
  if (typeof value === "string" && value.trim() && !existing.length) throw new Error(invalidValue);
  frontmatter.tags = [...(Array.isArray(value) ? value : existing.map(item => item.replace(/^#/, ""))), tag];
  return true;
}

/** Remove exact YAML membership only, preserving child/parent tags, unsupported values and the document body. */
export function removeTagMembership(frontmatter: Record<string, unknown>, tag: string, invalidValue: string): boolean {
  const value = frontmatter.tags;
  if (value === undefined || value === null) return false;
  if (typeof value !== "string" && (!Array.isArray(value) || !value.every(/** YAML tag lists contain strings, never coerced arbitrary user data. */ item => typeof item === "string"))) throw new Error(invalidValue);
  const existing = parseFrontMatterTags({ tags: value }) ?? [];
  const wanted = tag.toLocaleLowerCase();
  if (!existing.some(/** Tag spelling is case-insensitive; hierarchical membership is exact. */ item => item.replace(/^#/, "").toLocaleLowerCase() === wanted)) return false;
  const values = Array.isArray(value) ? value : existing.map(/** Convert only a native-supported scalar into the standard YAML list. */ item => item.replace(/^#/, ""));
  frontmatter.tags = values.filter(/** Repeated spellings of this one tag are all removed, while other values retain their original order. */ item => item.replace(/^#/, "").toLocaleLowerCase() !== wanted);
  return true;
}
