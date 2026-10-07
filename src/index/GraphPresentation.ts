/**
 * Obsidian presentation preparation for the synchronous GraphPage compatibility facade. Only
 * selected MetadataCache fields and mtime-valid parsed-body records are read. Preparation is
 * private, batched and cancellable; optional background checkpoints run before cache batches; the repository publishes all facets and policy without awaits.
 * Unknown facets are omitted so pending input cannot erase known-good shared page values.
 * Missing inputs remain explicitly pending and never cause Markdown acquisition or graph work.
 * Facet batches release CPU slices through host event tasks while keeping captured metadata,
 * settings and cancellation fences independent of dispatch.
 */
import { yieldToHostTask } from "../adapters/obsidian/yieldToHostTask";
import { getAllTags, type App, type CachedMetadata, type TFile } from "obsidian";
import type { KplexSettings } from "../settings";
import type { GraphPage } from "../types";
import { normalizeFieldName } from "../core/contracts/fieldName";
import type { ParsedBodyMetadata } from "../core/parser/metadata";
import { primaryStyleTagFromValues, selectStyleTags, tagDisplayName, unwrapNoteType } from "../core/graph/presentation";
import { PRESENTATION_KEYS } from "../core/graph/settingsPolicy";
import type { FieldCacheEntry } from "./GraphBuilder";
import type { KplexIndexedDbCache } from "./IndexedDbCache";

export type PresentationStatus = Readonly<{ noteType: "ready" | "pending"; styleTags: "ready" | "pending" }>;
export type FacetSelection = Readonly<{ names: boolean; limits: boolean; noteType: boolean; styleTags: boolean }>;
export const ALL_PRESENTATION_FACETS: FacetSelection = { names: true, limits: true, noteType: true, styleTags: true };
export type PreparedPageFacets = Partial<Pick<GraphPage, "name" | "noteType" | "primaryStyleTag" | "styleTags" | "maxLabelLength">> & {
  status?: Partial<PresentationStatus>;
};
export type PreparedGraphPresentation = Readonly<{
  facets: ReadonlyMap<GraphPage, PreparedPageFacets>;
  pending: number;
  /** Final synchronous source fence; called immediately before repository publication. */
  isCurrent: () => boolean;
}>;

/** Clone only presentation-owned settings so manager mutations cannot change a prepared policy. */
export function capturePresentationSettings(settings: KplexSettings): KplexSettings {
  return Object.assign({}, settings, Object.fromEntries(PRESENTATION_KEYS.map((key) => [key, structuredClone(settings[key])])));
}

/** Render with one prepared presentation policy, while preserving live view/workflow settings. */
export function withPreparedPresentation(settings: KplexSettings, prepared: KplexSettings): KplexSettings {
  return Object.assign({}, settings, Object.fromEntries(PRESENTATION_KEYS.map((key) => [key, prepared[key]])));
}

/** Read only the requested field, preserving the collector's first-match note-type precedence. */
function fieldValues(frontmatter: Record<string, unknown>, normalized: string): unknown[] {
  if (!normalized) return [];
  return Object.entries(frontmatter).filter(([key]) => key !== "position" && normalizeFieldName(key) === normalized).map(([, value]) => value);
}

/** Read actual host tag membership for physical notes; sparse compiled tags are not presentation proof. */
function presentationTags(page: GraphPage, cache: CachedMetadata | null): readonly string[] {
  return page.file?.extension === "md" && cache ? getAllTags(cache) ?? [] : page.tags;
}

/** A matching frontmatter primary selector outranks all inline selectors and needs no body input. */
function needsStyleBody(page: GraphPage, settings: KplexSettings, cache: CachedMetadata | null): boolean {
  const primaryField = normalizeFieldName(settings.primaryTagField);
  const styleTags = presentationTags(page, cache).filter(tag => settings.tagStyleList.some(prefix => tag.startsWith(prefix)));
  return Boolean(primaryField && styleTags.length
    && !primaryStyleTagFromValues(styleTags, fieldValues(cache?.frontmatter ?? {}, primaryField)));
}

/** Determine whether selected facets need inline input, never treating unavailable body input as empty. */
function needsBody(page: GraphPage, settings: KplexSettings, selection: FacetSelection, cache: CachedMetadata | null): boolean {
  return (selection.noteType && Boolean(normalizeFieldName(settings.noteTypeField))
    && fieldValues(cache?.frontmatter ?? {}, normalizeFieldName(settings.noteTypeField))[0] == null)
    || (selection.styleTags && needsStyleBody(page, settings, cache));
}

/** Skip pages whose current and next selected facets are both empty; broad restore preparation still visits all pages through limits. */
function needsFacetPreparation(page: GraphPage, settings: KplexSettings, selection: FacetSelection): boolean {
  if (selection.limits || (selection.names && page.isTag)) return true;
  if (selection.noteType && (page.file?.extension === "md" || page.noteType !== null)) return true;
  return selection.styleTags && ((page.file?.extension === "md" && settings.tagStyleList.length > 0)
    || page.primaryStyleTag !== null || page.styleTags.length > 0 ||
    page.tags.some((tag) => settings.tagStyleList.some((prefix) => tag.startsWith(prefix))));
}

/** Compute selected facets: ready empties clear prior values, while pending omits unknown fields. */
export function presentationFacetsForPage(
  page: GraphPage, settings: KplexSettings, app: App, body: ParsedBodyMetadata | undefined,
  selection: FacetSelection = ALL_PRESENTATION_FACETS,
): PreparedPageFacets {
  const result: PreparedPageFacets = {};
  if (selection.names && page.isTag) result.name = tagDisplayName(page.path, settings.showFullTagName);
  if (selection.limits) result.maxLabelLength = settings.baseNodeStyle.maxLabelLength ?? 30;
  if (!selection.noteType && !selection.styleTags) return result;
  const file = page.file;
  const cache = file?.extension === "md" && app.vault.getFileByPath(file.path) === file
    ? app.metadataCache.getFileCache(file) : undefined;
  const frontmatter = cache?.frontmatter ?? {};
  const typeField = normalizeFieldName(settings.noteTypeField);
  const primaryField = normalizeFieldName(settings.primaryTagField);
  const materializedNote = file?.extension === "md";
  const fmTypes = fieldValues(frontmatter, typeField);
  const inline = body?.inlineFields;
  const typePending = Boolean(materializedNote && typeField && (!cache || (fmTypes[0] == null && !body)));
  const tags = presentationTags(page, cache ?? null);
  const tagsPending = Boolean(materializedNote && settings.tagStyleList.length
    && (!cache || (needsStyleBody(page, settings, cache ?? null) && !body)));
  if (selection.noteType && !typePending) result.noteType = unwrapNoteType(fmTypes[0] ?? inline?.[typeField]?.[0]);
  if (selection.styleTags && !tagsPending) {
    Object.assign(result, selectStyleTags(tags, settings.tagStyleList,
      [...fieldValues(frontmatter, primaryField), ...(inline?.[primaryField] ?? [])]));
  }
  result.status = {
    ...(selection.noteType ? { noteType: typePending ? "pending" as const : "ready" as const } : {}),
    ...(selection.styleTags ? { styleTags: tagsPending ? "pending" as const : "ready" as const } : {}),
  };
  return result;
}

/** Capture only presentation semantics, avoiding arbitrary or cyclic unrelated property values. */
function selectedInputSignature(page: GraphPage, cache: CachedMetadata | null, body: ParsedBodyMetadata | undefined,
  settings: KplexSettings, selection: FacetSelection): string {
  const typeField = normalizeFieldName(settings.noteTypeField), primaryField = normalizeFieldName(settings.primaryTagField);
  return JSON.stringify([
    selection.noteType ? unwrapNoteType(fieldValues(cache?.frontmatter ?? {}, typeField)[0]) : null,
    selection.noteType ? unwrapNoteType(body?.inlineFields[typeField]?.[0]) : null,
    selection.styleTags ? [page.tags, presentationTags(page, cache)] : null,
    selection.styleTags ? fieldValues(cache?.frontmatter ?? {}, primaryField).filter(value => typeof value === "string") : null,
    selection.styleTags ? (body?.inlineFields[primaryField] ?? []).filter(value => typeof value === "string") : null,
  ]);
}

/** Bind an in-place policy edit to selected facets without capturing unrelated settings or graph policy. */
function selectedPolicySignature(settings: KplexSettings, selection: FacetSelection): string {
  return JSON.stringify([
    selection.names ? settings.showFullTagName : null,
    selection.limits ? settings.baseNodeStyle.maxLabelLength : null,
    selection.noteType ? settings.noteTypeField : null,
    selection.styleTags ? [settings.primaryTagField, settings.tagStyleList] : null,
  ]);
}

/**
 * Stage lightweight facets without acquisition. File/metadata identity, selected lexical values,
 * tags, cached body inputs and caller policy/source lifetime survive every await and final apply.
 * Pending statuses preserve published fields; ready empty replacements still clear them.
 */
export async function prepareGraphPresentation(
  pages: Iterable<GraphPage>, settings: KplexSettings, selection: FacetSelection,
  app: App, hot: ReadonlyMap<string, FieldCacheEntry>, storage: Pick<KplexIndexedDbCache, "getBodies">,
  isCurrent: () => boolean, onProgress?: () => void,
  backgroundCheckpoint?: () => Promise<void>,
): Promise<PreparedGraphPresentation | null> {
  const facets = new Map<GraphPage, PreparedPageFacets>();
  const policySignature = selectedPolicySignature(settings, selection);
  const revisions: Array<{ page: GraphPage; file: TFile; path: string; mtime: number; size: number;
    cache: CachedMetadata | null; hotEntry?: FieldCacheEntry; signature: string }> = [];
  let pending = 0;
  let started = Date.now();
  let batch: GraphPage[] = [];
  /** Reject renamed/deleted/modified files as well as a superseded policy or repository lifetime. */
  const inputsCurrent = (inputs: typeof revisions): boolean => isCurrent() && selectedPolicySignature(settings, selection) === policySignature
    && inputs.every(({ page, file, path, mtime, size, cache, hotEntry, signature }) =>
      page.file === file && file.path === path && file.stat.mtime === mtime && file.stat.size === size
      && app.vault.getFileByPath(path) === file && app.metadataCache.getFileCache(file) === cache
      && (!hotEntry || hot.get(path) === hotEntry)
      && selectedInputSignature(page, cache, hotEntry?.body, settings, selection) === signature);
  /** Validate the complete accumulated observation only at final publication, retaining linear work. */
  const current = (): boolean => inputsCurrent(revisions);
  /** Consume one bounded cache batch; no parser or Vault read exists in this provider. */
  const flush = async (): Promise<boolean> => {
    await backgroundCheckpoint?.();
    if (!isCurrent()) return false;
    const inputs: typeof revisions = [];
    const bodies = new Map<string, ParsedBodyMetadata>();
    const requests: Array<{ path: string; mtime: number }> = [];
    for (const page of batch) {
      const file = page.file;
      if (!selection.noteType && !selection.styleTags) continue;
      // A source already removed from the vault has no current inputs. Publish pending facets
      // rather than repeatedly retrying a detached file while normal semantic work is deferred.
      if (file?.extension !== "md" || app.vault.getFileByPath(file.path) !== file) continue;
      const cache = app.metadataCache.getFileCache(file);
      const revision: (typeof revisions)[number] = { page, file, path: file.path, mtime: file.stat.mtime, size: file.stat.size, cache,
        signature: selectedInputSignature(page, cache, undefined, settings, selection) };
      revisions.push(revision); inputs.push(revision);
      if (!needsBody(page, settings, selection, cache)) continue;
      const entry = hot.get(file.path);
      if (entry && entry.mtime === file.stat.mtime) {
        revision.hotEntry = entry;
        revision.signature = selectedInputSignature(page, cache, entry.body, settings, selection);
        bodies.set(file.path, entry.body);
      } else requests.push({ path: file.path, mtime: file.stat.mtime });
    }
    if (requests.length) {
      const loaded = await storage.getBodies(requests);
      if (!inputsCurrent(inputs)) return false;
      // Durable bodies are mtime-validated by getBodies and released after this batch. Retain
      // only selected facets and file/metadata/source proofs, never whole-vault parsed bodies.
      for (const [path, body] of loaded) bodies.set(path, body);
    }
    if (!inputsCurrent(inputs)) return false;
    for (const page of batch) {
      const values = presentationFacetsForPage(page, settings, app, page.file ? bodies.get(page.file.path) : undefined, selection);
      if (values.status?.noteType === "pending" || values.status?.styleTags === "pending") pending += 1;
      facets.set(page, values);
    }
    batch = [];
    onProgress?.();
    if (Date.now() - started >= 8) {
      await yieldToHostTask();
      started = Date.now();
    }
    return inputsCurrent(inputs);
  };
  for (const page of pages) {
    if (!needsFacetPreparation(page, settings, selection)) continue;
    batch.push(page);
    if (batch.length >= 64 && !(await flush())) return null;
  }
  if (batch.length && !(await flush())) return null;
  return current() ? { facets, pending, isCurrent: current } : null;
}

/** Synchronous publication helper. Status stays runtime-only and never enters persisted pages. */
export function applyPreparedPresentation(
  prepared: PreparedGraphPresentation, statuses: WeakMap<GraphPage, PresentationStatus>,
): void {
  for (const [page, values] of prepared.facets) {
    const { status, ...fields } = values;
    Object.assign(page, fields);
    if (status) statuses.set(page, { noteType: "pending", styleTags: "pending", ...statuses.get(page), ...status });
  }
}
