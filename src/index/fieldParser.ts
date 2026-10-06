/**
 * Obsidian metadata merge and legacy parser/reference facade. Portable body grammar remains owned
 * by core/parser; this boundary normalizes cached frontmatter aliases/tags without choosing graph
 * policy or treating host metadata as acquired Markdown. Alias traversal supports synchronous merge
 * and cooperative finite requested facets through one canonical normalization implementation.
 * Cooperative parsing releases host event tasks before optional background-priority checkpoints;
 * parser grammar and the caller-owned cancellation predicate remain in the portable owner.
 */
import { yieldToHostTask } from "../adapters/obsidian/yieldToHostTask";
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
 * this adapter retains historical callers and selects the renderer window scheduler. An optional
 * background boundary pauses only after the parser has yielded without exposing partial results.
 */
export function parseBodyMetadataCooperative(
  content: string,
  shouldContinue: (phase?: string) => boolean = () => true,
  budgetMs = 4,
  afterYield?: () => Promise<void>,
): Promise<ParsedBodyMetadata> {
  return parseBodyMetadataCooperativeCore(content, {
    now: () => Date.now(),
    yield: async () => {
      await yieldToHostTask();
      await afterYield?.();
    },
    shouldContinue,
  }, budgetMs);
}

/**
 * A work step exposes live cursor/ancestor depth for cooperative retained-byte proofs. `rawLength`
 * precedes string trimming so bounded callers can reject a possible normalized copy before allocation.
 */
export type FrontmatterAliasStep = Readonly<{ value: string | null; depth: number; rawLength?: number }>;

/**
 * Preserve canonical aliases-before-alias selection, nested array order/duplicates, string trimming
 * and non-string/empty filtering. Explicit array cursors avoid flattening the entire input before a
 * cooperative caller can yield or reject its retained-byte bound; null steps represent real work.
 * Reject cyclic ancestor arrays instead of retaining unbounded cursors; repeated sibling arrays
 * remain distinct occurrences, preserving the old recursive normalizer's multiplicity.
 * @throws TypeError when the selected alias value contains a cyclic ancestor array.
 */
export function* iterateFrontmatterAliasSteps(frontmatter: Readonly<Record<string, unknown>>): IterableIterator<FrontmatterAliasStep> {
  // mergeFileMetadata historically spreads cached frontmatter first, so inherited/non-enumerable
  // aliases must not become facets when this same normalizer reads the captured cache directly.
  const aliases = Object.prototype.propertyIsEnumerable.call(frontmatter, "aliases") ? frontmatter.aliases : undefined;
  const alias = Object.prototype.propertyIsEnumerable.call(frontmatter, "alias") ? frontmatter.alias : undefined;
  const stack: Array<{ values: readonly unknown[]; index: number }> = [{ values: [aliases ?? alias], index: 0 }];
  const ancestors = new Set<readonly unknown[]>([stack[0].values]);
  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (frame.index >= frame.values.length) {
      ancestors.delete(frame.values); stack.pop(); yield { value: null, depth: stack.length + 1 }; continue;
    }
    const value = frame.values[frame.index++];
    if (Array.isArray(value)) {
      if (ancestors.has(value)) throw new TypeError("Cyclic frontmatter aliases");
      ancestors.add(value);
      stack.push({ values: value, index: 0 });
      yield { value: null, depth: stack.length };
    } else if (typeof value === "string") {
      // A bounded caller may reject the maximum trimmed-copy allocation before trim evaluates it.
      yield { value: null, depth: stack.length, rawLength: value.length };
      yield { value: value.trim() || null, depth: stack.length };
    } else yield { value: null, depth: stack.length };
  }
}

/** Merge actual cached frontmatter with the caller's canonical body, retaining historical alias/tag rules. */
export function mergeFileMetadata(cache: CachedMetadata | null, body: ParsedBodyMetadata): ParsedFileMetadata {
  const frontmatter: Record<string, unknown> = { ...(cache?.frontmatter ?? {}) };
  delete frontmatter.position;

  const aliases: string[] = [];
  for (const step of iterateFrontmatterAliasSteps(frontmatter)) if (step.value !== null) aliases.push(step.value);

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
