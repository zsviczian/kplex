/**
 * Obsidian presentation preparation for the synchronous GraphPage compatibility facade. Only
 * selected MetadataCache fields and mtime-valid parsed-body records are read. Preparation is
 * private, batched and cancellable; optional background checkpoints run before cache batches; the repository publishes all facets and policy without awaits.
 * Missing inputs remain explicitly pending and never cause Markdown acquisition or graph work.
 */
import type { App, TFile } from "obsidian";
import type { KplexSettings } from "../settings";
import type { GraphPage } from "../types";
import { normalizeFieldName } from "../core/contracts/fieldName";
import type { ParsedBodyMetadata } from "../core/parser/metadata";
import { selectStyleTags, tagDisplayName, unwrapNoteType } from "../core/graph/presentation";
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

/** Determine whether selected facets actually need inline input, without guessing an empty body. */
function needsBody(page: GraphPage, settings: KplexSettings, selection: FacetSelection, frontmatter: Record<string, unknown>): boolean {
  return (selection.noteType && Boolean(normalizeFieldName(settings.noteTypeField)) && fieldValues(frontmatter, normalizeFieldName(settings.noteTypeField))[0] == null) ||
    (selection.styleTags && Boolean(normalizeFieldName(settings.primaryTagField)) && page.tags.some((tag) => settings.tagStyleList.some((prefix) => tag.startsWith(prefix))));
}

/** Skip pages whose current and next selected facets are both empty; broad restore preparation still visits all pages through limits. */
function needsFacetPreparation(page: GraphPage, settings: KplexSettings, selection: FacetSelection): boolean {
  if (selection.limits || (selection.names && page.isTag)) return true;
  if (selection.noteType && (page.file?.extension === "md" || page.noteType !== null)) return true;
  return selection.styleTags && (page.primaryStyleTag !== null || page.styleTags.length > 0 ||
    page.tags.some((tag) => settings.tagStyleList.some((prefix) => tag.startsWith(prefix))));
}

/** Compute current facets from prepared inputs; null plus pending never asserts a known-empty value. */
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
  const tagMatches = page.tags.some((tag) => settings.tagStyleList.some((prefix) => tag.startsWith(prefix)));
  const tagsPending = Boolean(materializedNote && primaryField && tagMatches && (!cache || !body));
  if (selection.noteType) result.noteType = typePending ? null : unwrapNoteType(fmTypes[0] ?? inline?.[typeField]?.[0]);
  if (selection.styleTags) {
    Object.assign(result, tagsPending ? { primaryStyleTag: null, styleTags: [] } :
      selectStyleTags(page.tags, settings.tagStyleList, [...fieldValues(frontmatter, primaryField), ...(inline?.[primaryField] ?? [])]));
  }
  result.status = {
    ...(selection.noteType ? { noteType: typePending ? "pending" as const : "ready" as const } : {}),
    ...(selection.styleTags ? { styleTags: tagsPending ? "pending" as const : "ready" as const } : {}),
  };
  return result;
}

/** Stage lightweight facets, not a second graph, and release each body batch before reading another. */
export async function prepareGraphPresentation(
  pages: Iterable<GraphPage>, settings: KplexSettings, selection: FacetSelection,
  app: App, hot: ReadonlyMap<string, FieldCacheEntry>, storage: Pick<KplexIndexedDbCache, "getBodies">,
  isCurrent: () => boolean, onProgress?: () => void,
  backgroundCheckpoint?: () => Promise<void>,
): Promise<PreparedGraphPresentation | null> {
  const facets = new Map<GraphPage, PreparedPageFacets>();
  const revisions: Array<{ file: TFile; path: string; mtime: number; size: number }> = [];
  let pending = 0;
  let started = Date.now();
  let batch: GraphPage[] = [];
  /** Reject renamed/deleted/modified files as well as a superseded policy or repository lifetime. */
  const current = (): boolean => isCurrent() && revisions.every(({ file, path, mtime, size }) =>
    file.path === path && file.stat.mtime === mtime && file.stat.size === size && app.vault.getFileByPath(path) === file);
  /** Consume one bounded cache batch; no parser or Vault read exists in this provider. */
  const flush = async (): Promise<boolean> => {
    await backgroundCheckpoint?.();
    if (!isCurrent()) return false;
    const bodies = new Map<string, ParsedBodyMetadata>();
    const requests: Array<{ path: string; mtime: number }> = [];
    for (const page of batch) {
      const file = page.file;
      if (!selection.noteType && !selection.styleTags) continue;
      // A source already removed from the vault has no current inputs. Publish pending facets
      // rather than repeatedly retrying a detached file while normal semantic work is deferred.
      if (file?.extension !== "md" || app.vault.getFileByPath(file.path) !== file) continue;
      revisions.push({ file, path: file.path, mtime: file.stat.mtime, size: file.stat.size });
      const cache = app.metadataCache.getFileCache(file);
      if (!needsBody(page, settings, selection, cache?.frontmatter ?? {})) continue;
      const entry = hot.get(file.path);
      if (entry && entry.mtime === file.stat.mtime) bodies.set(file.path, entry.body);
      else requests.push({ path: file.path, mtime: file.stat.mtime });
    }
    if (requests.length) {
      const loaded = await storage.getBodies(requests);
      if (!isCurrent()) return false;
      for (const [path, body] of loaded) bodies.set(path, body);
    }
    for (const page of batch) {
      const values = presentationFacetsForPage(page, settings, app, page.file ? bodies.get(page.file.path) : undefined, selection);
      if (values.status?.noteType === "pending" || values.status?.styleTags === "pending") pending += 1;
      facets.set(page, values);
    }
    batch = [];
    onProgress?.();
    if (Date.now() - started >= 8) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      started = Date.now();
    }
    return isCurrent();
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
