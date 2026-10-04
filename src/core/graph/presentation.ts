/**
 * Pure prepared presentation rules shared by compiler compatibility output and the runtime facet
 * provider. No source acquisition, field grammar, semantic classification or persistence lives here.
 */

/** Normalize the first selected property value exactly as the historical compiler did. */
export function unwrapNoteType(value: unknown): string | null {
  const first: unknown = Array.isArray(value) ? value[0] : value;
  if (typeof first !== "string" && typeof first !== "number") return null;
  let text = String(first).trim();
  const wiki = text.match(/^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]$/);
  if (wiki) text = wiki[1].trim();
  text = text.replace(/^#/, "").trim();
  return text || null;
}

/** Keep raw tag membership order, primary-selector preference and first prefix-match precedence. */
export function selectStyleTags(tags: readonly string[], prefixes: readonly string[], primaryValues: readonly unknown[]): {
  primaryStyleTag: string | null; styleTags: string[];
} {
  const styleTags = tags.filter((tag) => prefixes.some((prefix) => tag.startsWith(prefix)));
  const primaryTags = primaryValues.flatMap((value) => typeof value === "string" ? value.match(/#[^\s\])$"'\\]+/g) ?? [] : []);
  const primaryStyleTag = primaryTags.find((tag) => styleTags.some((styleTag) => styleTag.startsWith(tag))) ?? styleTags[0] ?? null;
  return { primaryStyleTag, styleTags: styleTags.filter((tag) => tag !== primaryStyleTag) };
}

/** Derive a tag label from an explicit semantic tag path; opaque node IDs are never parsed. */
export function tagDisplayName(semanticPath: string, showFullTagName: boolean): string {
  const tagPath = semanticPath.replace(/^tag:/, "");
  const parts = tagPath.split("/");
  return showFullTagName ? tagPath : parts[parts.length - 1] ?? tagPath;
}
