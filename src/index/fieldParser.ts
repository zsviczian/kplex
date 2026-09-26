import type { App, CachedMetadata, TFile } from "obsidian";
import {
  extractLinkReferencesFromValue,
  getInlineFieldOccurrences,
  getNormalizedFieldValues,
  getNormalizedFrontmatterValues,
  getNormalizedInlineFieldValues,
  iterateLinkReferencesFromValue,
  normalizeFieldName,
  parseBodyMetadata,
  parseBodyMetadataCooperativeCore,
  parseBodyMetadataCore,
  type ExtractedLinkReference,
  type ExternalUrlReference,
  type InlineFieldOccurrence,
  type ParsedBodyMetadata,
  type ParsedFileMetadata,
} from "../core/parser/metadata";

export {
  extractLinkReferencesFromValue,
  getInlineFieldOccurrences,
  getNormalizedFieldValues,
  getNormalizedFrontmatterValues,
  getNormalizedInlineFieldValues,
  iterateLinkReferencesFromValue,
  normalizeFieldName,
  parseBodyMetadata,
  parseBodyMetadataCore,
};
export type {
  ExtractedLinkReference,
  ExternalUrlReference,
  InlineFieldOccurrence,
  ParsedBodyMetadata,
  ParsedFileMetadata,
};

function flattenValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(flattenValue);
  if (value === null || value === undefined) return [];
  return [value];
}

function stringifyTag(value: unknown): string[] {
  return flattenValue(value)
    .filter((v): v is string => typeof v === "string")
    .flatMap((v) => v.split(/[\s,]+/g))
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => v.startsWith("#") ? v : `#${v}`);
}

/**
 * Legacy host facade for renderer-thread parsing. The portable parser requires an explicit runtime;
 * this adapter retains the historical caller signature and selects the renderer window scheduler.
 */
export function parseBodyMetadataCooperative(
  content: string,
  shouldContinue: (phase?: string) => boolean = () => true,
  budgetMs = 4,
): Promise<ParsedBodyMetadata> {
  return parseBodyMetadataCooperativeCore(content, {
    now: () => Date.now(),
    yield: () => new Promise<void>((resolve) => window.setTimeout(resolve, 0)),
    shouldContinue,
  }, budgetMs);
}

export function mergeFileMetadata(cache: CachedMetadata | null, body: ParsedBodyMetadata): ParsedFileMetadata {
  const frontmatter: Record<string, unknown> = { ...(cache?.frontmatter ?? {}) };
  delete frontmatter.position;

  const aliases = flattenValue(frontmatter.aliases ?? frontmatter.alias)
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);

  const tags = new Set<string>();
  for (const tag of stringifyTag(frontmatter.tags ?? frontmatter.tag)) tags.add(tag);
  for (const item of cache?.tags ?? []) tags.add(item.tag);

  return {
    frontmatter,
    inlineFields: body.inlineFields,
    inlineFieldOccurrences: body.inlineFieldOccurrences,
    aliases,
    tags: [...tags],
    urls: body.urls,
  };
}

export function parseFileMetadata(cache: CachedMetadata | null, content: string): ParsedFileMetadata {
  return mergeFileMetadata(cache, parseBodyMetadata(content));
}

function resolveLink(app: App, raw: string, hostPath: string): string {
  let candidate = raw.trim();
  try { candidate = decodeURIComponent(candidate); } catch { /* keep raw */ }
  const hash = candidate.indexOf("#");
  if (hash >= 0) candidate = candidate.slice(0, hash);
  const dest = app.metadataCache.getFirstLinkpathDest(candidate, hostPath);
  return dest?.path ?? candidate;
}

/** Host-resolution compatibility facade retained for imagery, section and editing consumers. */
export function extractLinksFromValue(app: App, value: unknown, file: TFile): string[] {
  const found = new Set<string>();
  for (const reference of iterateLinkReferencesFromValue(value)) {
    const target = reference.external ? reference.rawTarget : resolveLink(app, reference.rawTarget, file.path);
    if (target) found.add(target);
  }
  return [...found];
}
