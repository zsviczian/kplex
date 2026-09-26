import { Platform, TFile, type App } from "obsidian";
import type ExcaliBrainPlugin from "../main";
import { LinkDirection, RelationType, type GraphPage, type Relation } from "../types";
import {
  extractLinksFromValue,
  getNormalizedFieldValues,
  getNormalizedFrontmatterValues,
  getNormalizedInlineFieldValues,
  mergeFileMetadata,
  normalizeFieldName,
  type ParsedBodyMetadata,
  type ParsedFileMetadata,
} from "./fieldParser";
import { MetadataParseCancelledError, type MetadataParser } from "./MetadataParser";
import type { KplexIndexedDbCache } from "./IndexedDbCache";
import type { EvidenceProvenance, EvidenceRole, EvidenceSourceKind } from "./RelationEvidence";
import { resolveEvidencePair, resolveEvidenceStoreCooperative } from "./RelationResolver";
import { createGraphState, getGraphPage, type GraphState } from "./GraphState";
import { perfNow } from "../util/perf";
import { ObsidianStructuralSourceCollector } from "../adapters/obsidian/structuralSourceCollector";
import { ObsidianHostLinkSourceCollector, readHostLinkSignatureEntries } from "../adapters/obsidian/hostLinkSourceCollector";
import { ObsidianOntologySourceCollector } from "../adapters/obsidian/ontologySourceCollector";
import {
  acceptSourceBatch,
  beginSourceRead,
  sourceReadCanPublish,
  type FileTreeOccurrence,
  type HostLinkOccurrence,
  type NormalizedSourceBatch,
  type OntologyOccurrence,
  type SourceBatchCursor,
  type SourceEntityFact,
  type TagTreeOccurrence,
} from "../core/graph/source";

export type FieldCacheEntry = {
  mtime: number;
  body: ParsedBodyMetadata;
  /** Runtime-only semantic fingerprint used to suppress graph work for drawing-only/format-only edits. */
  semanticSignature?: string;
};

export type PatchMarkdownResult = {
  ok: boolean;
  cancelled: boolean;
  touchedPagePaths: Set<string>;
  semanticChanges: number;
  semanticNoops: number;
};

export type PatchFileCommit = {
  sourcePath: string;
  touchedPagePaths: Set<string>;
  semanticChanged: boolean;
};

type FileRevision = {
  mtime: number;
  size: number;
};

const FILE_OWNED_EVIDENCE = new Set<EvidenceSourceKind>([
  "obsidian-link",
  "unresolved-link",
  "frontmatter-ontology",
  "inline-ontology",
  "body-url",
  "date-property",
]);

function flatten(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (value === null || value === undefined) return [];
  return [value];
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
}

type ObsidianMomentInstance = {
  isValid(): boolean;
  format(format: string): string;
};

type ObsidianMomentFactory = (value: string, inputFormat: string, strict: boolean) => ObsidianMomentInstance;

/**
 * Render an Obsidian Date property with the vault's configured Daily Notes Moment format.
 *
 * Obsidian provides Moment at runtime on `window`. Do not import Moment into production code:
 * doing so either hits Obsidian's namespace-style typing mismatch or bundles a library that the
 * host already provides. This mirrors the long-standing approach used by Obsidian Tasks.
 */
function formatDailyDate(isoDate: string, format: string): string | null {
  const obsidianMoment = (window as unknown as { moment: ObsidianMomentFactory }).moment;
  const parsed = obsidianMoment(isoDate, "YYYY-MM-DD", true);
  return parsed.isValid() ? parsed.format(format) : null;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableSemanticValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableSemanticValue);
  if (!isUnknownRecord(value)) return value;
  const output: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    if (key === "position") continue;
    output[key] = stableSemanticValue(value[key]);
  }
  return output;
}

/** A compact, versioned equality token for semantic inputs. Four independent 32-bit lanes plus
 * the serialized byte/character length make accidental collisions impractical without retaining
 * the full per-file JSON in memory. This is deliberately wider than a single short hash because
 * fingerprint equality suppresses graph work after the body LRU has been evicted. */
function compactFingerprint(serialized: string): string {
  let a = 2166136261 >>> 0;
  let b = 3339675911 >>> 0;
  let c = 374761393 >>> 0;
  let d = 668265263 >>> 0;
  for (let i = 0; i < serialized.length; i += 1) {
    const code = serialized.charCodeAt(i);
    a = Math.imul(a ^ code, 16777619) >>> 0;
    b = Math.imul(b ^ (code + i), 2246822519) >>> 0;
    c = Math.imul(c ^ (code + (i << 1)), 3266489917) >>> 0;
    d = Math.imul(d ^ (code + (i >>> 1)), 2654435761) >>> 0;
  }
  return [serialized.length, a, b, c, d].map((value) => value.toString(36)).join(":");
}

/** Small copy-on-write map used only while staging one incremental file patch. Reads fall through
 * to the published map; writes/deletes stay private until commit. */
const MAX_PATCH_OVERLAY_DEPTH = 8;

class PatchOverlayMap<K, V> extends Map<K, V> {
  private readonly local = new Map<K, V>();
  private readonly removed = new Set<K>();
  private readonly clonedBaseKeys = new Set<K>();
  readonly depth: number;

  constructor(private readonly base: Map<K, V>, private cloneOnRead?: (value: V) => V) {
    super();
    this.depth = base instanceof PatchOverlayMap ? base.depth + 1 : 1;
  }

  override get size(): number {
    let size = this.base.size;
    for (const key of this.removed) if (this.base.has(key)) size -= 1;
    for (const key of this.local.keys()) if (!this.base.has(key) || this.removed.has(key)) size += 1;
    return size;
  }

  override has(key: K): boolean { return !this.removed.has(key) && (this.local.has(key) || this.base.has(key)); }

  override get(key: K): V | undefined {
    if (this.removed.has(key)) return undefined;
    const local = this.local.get(key);
    if (local !== undefined || this.local.has(key)) return local;
    const value = this.base.get(key);
    if (value === undefined || !this.cloneOnRead) return value;
    const clone = this.cloneOnRead(value);
    this.local.set(key, clone);
    this.clonedBaseKeys.add(key);
    return clone;
  }

  override set(key: K, value: V): this {
    if (this.base.has(key)) this.clonedBaseKeys.add(key);
    this.removed.delete(key);
    this.local.set(key, value);
    return this;
  }
  override delete(key: K): boolean {
    const existed = this.has(key);
    this.local.delete(key);
    if (this.base.has(key)) this.removed.add(key);
    return existed;
  }
  override clear(): void {
    this.local.clear();
    for (const key of this.base.keys()) this.removed.add(key);
  }

  override *keys(): IterableIterator<K> { for (const [key] of this.entries()) yield key; }
  override *values(): IterableIterator<V> { for (const [, value] of this.entries()) yield value; }
  override *entries(): IterableIterator<[K, V]> {
    const emitted = new Set<K>();
    for (const [key, value] of this.local) {
      if (this.removed.has(key)) continue;
      emitted.add(key);
      yield [key, value];
    }
    for (const [key, value] of this.base) {
      if (emitted.has(key) || this.removed.has(key)) continue;
      yield [key, value];
    }
  }
  override [Symbol.iterator](): IterableIterator<[K, V]> { return this.entries(); }
  override forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: unknown): void {
    for (const [key, value] of this.entries()) callbackfn.call(thisArg, value, key, this);
  }

  localEntries(): IterableIterator<[K, V]> { return this.local.entries(); }
  removedKeys(): IterableIterator<K> { return this.removed.values(); }
  *existingLocalEntries(): IterableIterator<[K, V, V]> {
    for (const key of this.clonedBaseKeys) {
      const staged = this.local.get(key);
      const published = this.base.get(key);
      if (staged !== undefined && published !== undefined) yield [key, staged, published];
    }
  }
  publicationValue(key: K): V | undefined {
    if (this.base.has(key)) return this.base.get(key);
    return this.removed.has(key) ? undefined : this.local.get(key);
  }
  changeCount(): number { return this.local.size + this.removed.size; }
  async flattenCooperative(checkpoint: () => Promise<boolean>): Promise<Map<K, V> | null> {
    const flattened = new Map<K, V>();
    let processed = 0;
    for (const [key, value] of this.entries()) {
      flattened.set(key, value);
      processed += 1;
      if ((processed & 255) === 0 && !(await checkpoint())) return null;
    }
    return flattened;
  }
  /** Published overlays must become read-only views over their base. Clone-on-read is a staging
   * behavior only; leaving it enabled would make ordinary graph reads mutate the published map. */
  seal(): this { this.cloneOnRead = undefined; return this; }
}

function isPatchOverlayMap<K, V>(map: Map<K, V>): map is PatchOverlayMap<K, V> {
  return map instanceof PatchOverlayMap;
}

function cloneGraphPage(page: GraphPage): GraphPage {
  return {
    ...page,
    neighbours: new Map(page.neighbours),
    aliases: [...page.aliases],
    tags: [...page.tags],
    styleTags: [...page.styleTags],
    transient: page.transient ? { ...page.transient } : undefined,
  };
}

function publishGraphPage(target: GraphPage, staged: GraphPage): void {
  target.file = staged.file;
  target.name = staged.name;
  target.url = staged.url;
  target.isFolder = staged.isFolder;
  target.isTag = staged.isTag;
  target.mtime = staged.mtime;
  target.neighbours = staged.neighbours;
  target.aliases = staged.aliases;
  target.tags = staged.tags;
  target.noteType = staged.noteType;
  target.primaryStyleTag = staged.primaryStyleTag;
  target.styleTags = staged.styleTags;
  target.maxLabelLength = staged.maxLabelLength;
  target.transient = staged.transient;
}

/**
 * Builds a complete graph snapshot from vault inputs. It does not publish state or service UI
 * queries; those responsibilities belong to GraphIndex. All collectors emit provenance-bearing
 * evidence and relationship resolution happens once, after collection is complete.
 */
export class GraphBuilder {
  private sliceStartedAt = perfNow();
  private patchTouchedPagePaths: Set<string> | null = null;
  private readonly semanticFrontmatterFields: Set<string>;
  private readonly semanticInlineFields: Set<string>;
  private readonly ontologyAssignments: ReadonlyArray<{ configuredFieldName: string; normalizedFieldName: string; role: EvidenceRole }>;
  private readonly ontologyConfiguredFields: readonly string[];

  constructor(
    private plugin: ExcaliBrainPlugin,
    private app: App,
    private fieldCache: Map<string, FieldCacheEntry>,
    private metadataParser: MetadataParser,
    private bodyCache: KplexIndexedDbCache,
    private isCurrent: () => boolean,
    private semanticFingerprints: Map<string, string> = new Map(),
  ) {
    const hierarchy = plugin.settings.hierarchy;
    const ontologyGroups: ReadonlyArray<readonly [readonly string[], EvidenceRole]> = [
      [hierarchy.hidden, "hidden"],
      [hierarchy.parents, "parent"],
      [hierarchy.children, "child"],
      [hierarchy.leftFriends, "left"],
      [hierarchy.rightFriends, "right"],
      [hierarchy.previous, "previous"],
      [hierarchy.next, "next"],
    ];
    this.ontologyAssignments = ontologyGroups.flatMap(([fieldNames, role]) => fieldNames.map((configuredFieldName) => ({
      configuredFieldName,
      normalizedFieldName: normalizeFieldName(configuredFieldName),
      role,
    }))).filter((assignment) => Boolean(assignment.normalizedFieldName));
    this.ontologyConfiguredFields = [...new Set(this.ontologyAssignments.map((assignment) => assignment.configuredFieldName))];
    this.semanticFrontmatterFields = new Set([
      "aliases", "alias", "tags", "tag",
      plugin.settings.noteTypeField,
      plugin.settings.primaryTagField,
      plugin.settings.thumbnailProperty,
      plugin.settings.nodeImageProperty,
      ...hierarchy.hidden,
      ...hierarchy.parents,
      ...hierarchy.children,
      ...hierarchy.leftFriends,
      ...hierarchy.rightFriends,
      ...hierarchy.previous,
      ...hierarchy.next,
    ].map(normalizeFieldName).filter(Boolean));
    this.semanticInlineFields = new Set([
      plugin.settings.noteTypeField,
      plugin.settings.primaryTagField,
      plugin.settings.thumbnailProperty,
      plugin.settings.nodeImageProperty,
      ...hierarchy.hidden,
      ...hierarchy.parents,
      ...hierarchy.children,
      ...hierarchy.leftFriends,
      ...hierarchy.rightFriends,
      ...hierarchy.previous,
      ...hierarchy.next,
    ].map(normalizeFieldName).filter(Boolean));
  }


  /**
   * Fingerprint only metadata that can affect K-Plex graph semantics. Arbitrary frontmatter
   * property names and values are intentionally excluded: lenses read them lazily from
   * MetadataCache, while field discovery is maintained separately from relationship invalidation.
   */
  private semanticSourceSignature(file: TFile, body: ParsedBodyMetadata): string {
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter: Record<string, unknown> = { ...(cache?.frontmatter ?? {}) };
    delete frontmatter.position;

    const semanticFrontmatter: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(frontmatter)) {
      if (this.semanticFrontmatterFields.has(normalizeFieldName(key)) || this.isDateProperty(key)) {
        semanticFrontmatter[key] = stableSemanticValue(value);
      }
    }

    const tags = (cache?.tags ?? []).map((item: { tag: string }) => item.tag).sort();
    // Counts matter for presentation-only image suppression: one thumbnail link plus one ordinary
    // link must remain graph-semantic, while a single thumbnail-only link is suppressed.
    const { resolved, unresolved } = readHostLinkSignatureEntries(this.app.metadataCache, file.path);
    const relevantOccurrences = body.inlineFieldOccurrences
      .filter((item) => this.semanticInlineFields.has(item.normalizedName));
    const topologyBody = {
      fields: relevantOccurrences.map((item) => [item.normalizedName, item.value]),
      urls: body.urls.map((item) => [item.url, item.label ?? ""]),
    };
    const provenanceBody = {
      fields: relevantOccurrences.map((item) => [item.normalizedName, item.value, item.syntax, item.line, item.start, item.end]),
      urls: body.urls.map((item) => [item.url, item.label ?? "", item.line ?? 0]),
    };

    const topology = JSON.stringify({
      frontmatter: stableSemanticValue(semanticFrontmatter),
      tags,
      resolved,
      unresolved,
      body: topologyBody,
    });
    const provenance = JSON.stringify(provenanceBody);
    return `v2:${compactFingerprint(topology)}~${compactFingerprint(provenance)}`;
  }

  private async compactFingerprintCooperative(serialized: string): Promise<string | null> {
    let a = 2166136261 >>> 0;
    let b = 3339675911 >>> 0;
    let c = 374761393 >>> 0;
    let d = 668265263 >>> 0;
    for (let i = 0; i < serialized.length; i += 1) {
      const code = serialized.charCodeAt(i);
      a = Math.imul(a ^ code, 16777619) >>> 0;
      b = Math.imul(b ^ (code + i), 2246822519) >>> 0;
      c = Math.imul(c ^ (code + (i << 1)), 3266489917) >>> 0;
      d = Math.imul(d ^ (code + (i >>> 1)), 2654435761) >>> 0;
      if ((i & 2047) === 0 && !(await this.yieldToHost())) return null;
    }
    return [serialized.length, a, b, c, d].map((value) => value.toString(36)).join(":");
  }

  /** Same token as semanticSourceSignature(), but the potentially large body-derived arrays and
   * hashes are built cooperatively for live edits. */
  private async semanticSourceSignatureCooperative(file: TFile, body: ParsedBodyMetadata): Promise<string | null> {
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter: Record<string, unknown> = { ...(cache?.frontmatter ?? {}) };
    delete frontmatter.position;
    const semanticFrontmatter: Record<string, unknown> = {};
    let processed = 0;
    for (const [key, value] of Object.entries(frontmatter)) {
      if (this.semanticFrontmatterFields.has(normalizeFieldName(key)) || this.isDateProperty(key)) {
        semanticFrontmatter[key] = stableSemanticValue(value);
      }
      processed += 1;
      if ((processed & 127) === 0 && !(await this.yieldToHost())) return null;
    }

    const tags = (cache?.tags ?? []).map((item: { tag: string }) => item.tag).sort();
    const { resolved, unresolved } = readHostLinkSignatureEntries(this.app.metadataCache, file.path);
    const topologyFields: unknown[] = [];
    const provenanceFields: unknown[] = [];
    for (const item of body.inlineFieldOccurrences) {
      if (!this.semanticInlineFields.has(item.normalizedName)) continue;
      topologyFields.push([item.normalizedName, item.value]);
      provenanceFields.push([item.normalizedName, item.value, item.syntax, item.line, item.start, item.end]);
      if ((topologyFields.length & 127) === 0 && !(await this.yieldToHost())) return null;
    }
    const topologyUrls: unknown[] = [];
    const provenanceUrls: unknown[] = [];
    for (let i = 0; i < body.urls.length; i += 1) {
      const item = body.urls[i];
      topologyUrls.push([item.url, item.label ?? ""]);
      provenanceUrls.push([item.url, item.label ?? "", item.line ?? 0]);
      if ((i & 127) === 0 && !(await this.yieldToHost())) return null;
    }
    if (!(await this.yieldToHost())) return null;

    const topology = JSON.stringify({
      frontmatter: stableSemanticValue(semanticFrontmatter),
      tags, resolved, unresolved,
      body: { fields: topologyFields, urls: topologyUrls },
    });
    if (!(await this.yieldToHost())) return null;
    const provenance = JSON.stringify({ fields: provenanceFields, urls: provenanceUrls });
    if (!(await this.yieldToHost())) return null;
    const topologyHash = await this.compactFingerprintCooperative(topology);
    if (!topologyHash) return null;
    const provenanceHash = await this.compactFingerprintCooperative(provenance);
    return provenanceHash ? `v2:${topologyHash}~${provenanceHash}` : null;
  }

  private createPatchState(state: GraphState, forkEvidence = true): GraphState {
    return {
      pages: new PatchOverlayMap(state.pages, cloneGraphPage),
      lowercasePathMap: new PatchOverlayMap(state.lowercasePathMap),
      evidence: forkEvidence ? state.evidence.fork() : state.evidence,
      discoveredFields: new PatchOverlayMap(state.discoveredFields, (value) => ({ ...value })),
    };
  }

  /** Bound retained copy-on-write history before starting another transaction. Compaction builds
   * complete private replacements and publishes them together only after all checkpoints pass. */
  private async compactPublishedPatchLayers(state: GraphState): Promise<boolean> {
    const pageOverlay = isPatchOverlayMap(state.pages) && state.pages.depth >= MAX_PATCH_OVERLAY_DEPTH
      ? state.pages : null;
    const lowercaseOverlay = isPatchOverlayMap(state.lowercasePathMap) && state.lowercasePathMap.depth >= MAX_PATCH_OVERLAY_DEPTH
      ? state.lowercasePathMap : null;
    const fieldOverlay = isPatchOverlayMap(state.discoveredFields) && state.discoveredFields.depth >= MAX_PATCH_OVERLAY_DEPTH
      ? state.discoveredFields : null;
    const compactEvidence = state.evidence.depth >= MAX_PATCH_OVERLAY_DEPTH;
    if (!pageOverlay && !lowercaseOverlay && !fieldOverlay && !compactEvidence) return this.isCurrent();

    const pages = pageOverlay ? await pageOverlay.flattenCooperative(() => this.yieldToHost()) : state.pages;
    if (!pages) return false;
    const lowercasePathMap = lowercaseOverlay
      ? await lowercaseOverlay.flattenCooperative(() => this.yieldToHost()) : state.lowercasePathMap;
    if (!lowercasePathMap) return false;
    const discoveredFields = fieldOverlay
      ? await fieldOverlay.flattenCooperative(() => this.yieldToHost()) : state.discoveredFields;
    if (!discoveredFields) return false;
    const evidence = compactEvidence
      ? await state.evidence.compactCooperative(() => this.yieldToHost()) : state.evidence;
    if (!evidence || !this.isCurrent()) return false;

    state.pages = pages;
    state.lowercasePathMap = lowercasePathMap;
    state.discoveredFields = discoveredFields;
    state.evidence = evidence;
    return true;
  }

  private resolvePatchEvidencePair(state: GraphState, sourcePath: string, targetPath: string): void {
    const pages = state.pages;
    resolveEvidencePair(
      pages,
      state.evidence,
      sourcePath,
      targetPath,
      isPatchOverlayMap(pages)
        ? (path, staged) => pages.publicationValue(path) ?? staged
        : undefined,
    );
  }

  /** Publish a fully staged file patch. All expensive parsing/evidence/resolution work happens in
   * the private overlay first; this short final section only preserves existing GraphPage identity
   * and swaps the evidence transaction. */
  private commitPatchState(live: GraphState, staged: GraphState): void {
    const pages = staged.pages as PatchOverlayMap<string, GraphPage>;
    const lowercase = staged.lowercasePathMap as PatchOverlayMap<string, string>;
    const fields = staged.discoveredFields as PatchOverlayMap<string, { name: string; count: number }>;

    // Very large edits (for example a note containing ten thousand distinct external URLs) can
    // touch enough page keys that replaying every staged Map mutation would itself become the
    // longest main-thread task. Publish sealed copy-on-write overlays in O(1) instead. Smaller
    // patches are flattened into the existing maps to avoid building deep overlay chains during
    // ordinary editing sessions. Evidence already uses the same copy-on-write publication model.
    // Existing pages have stable identity because Relation stores direct GraphPage targets. Copy
    // staged fields into those identities and make the overlay reference them before publication.
    // New pages can be published directly; deleted pages need no identity preservation.
    for (const [path, stagedPage, publishedPage] of pages.existingLocalEntries()) {
      publishGraphPage(publishedPage, stagedPage);
      pages.set(path, publishedPage);
    }

    const bulkPublish = pages.changeCount() + lowercase.changeCount() + fields.changeCount() > 1024;
    if (bulkPublish) {
      live.pages = pages.seal();
      live.lowercasePathMap = lowercase.seal();
      live.discoveredFields = fields.seal();
    } else {
      for (const path of pages.removedKeys()) live.pages.delete(path);
      for (const [path, stagedPage] of pages.localEntries()) live.pages.set(path, stagedPage);
      for (const key of lowercase.removedKeys()) live.lowercasePathMap.delete(key);
      for (const [key, value] of lowercase.localEntries()) live.lowercasePathMap.set(key, value);
      for (const key of fields.removedKeys()) live.discoveredFields.delete(key);
      for (const [key, value] of fields.localEntries()) live.discoveredFields.set(key, value);
    }
    live.evidence = staged.evidence;
  }

  private topologySignature(signature: string | undefined): string | null {
    if (!signature?.startsWith("v2:")) return signature ?? null;
    const splitAt = signature.indexOf("~");
    return splitAt < 0 ? signature : signature.slice(0, splitAt);
  }

  private rememberFieldCache(path: string, entry: FieldCacheEntry): void {
    // Refresh insertion order so this remains a true small hot working set during long sessions.
    this.fieldCache.delete(path);
    this.fieldCache.set(path, entry);
    const hotLimit = Platform.isIosApp ? 48 : Platform.isMobile ? 160 : 1200;
    while (this.fieldCache.size > hotLimit) {
      const oldest = this.fieldCache.keys().next();
      if (oldest.done) break;
      this.fieldCache.delete(oldest.value);
    }
  }

  async build(): Promise<GraphState | null> {
    const state = createGraphState();
    const structuralRead = await this.addStructuralSources(state);
    if (!structuralRead) return null;
    if (!(await this.addHostLinkSources(state))) return null;
    if (!(await this.enrichMarkdownPages(state))) return null;
    if (!this.isCurrent()) return null;
    if (!(await resolveEvidenceStoreCooperative(
      state.pages,
      state.evidence,
      this.isCurrent,
      Platform.isIosApp ? 96 : Platform.isMobile ? 160 : 400,
    ))) return null;
    if (!(await this.finalizeStructuralSources(state, structuralRead))) return null;
    return state;
  }

  private async yieldToHost(force = false): Promise<boolean> {
    if (!this.isCurrent()) return false;
    const budgetMs = Platform.isIosApp ? 7 : Platform.isMobile ? 9 : 13;
    if (!force && perfNow() - this.sliceStartedAt < budgetMs) return true;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    this.sliceStartedAt = perfNow();
    return this.isCurrent();
  }

  private async parseBody(content: string): Promise<ParsedBodyMetadata | null> {
    try {
      return await this.metadataParser.parse(content);
    } catch (error) {
      if (error instanceof MetadataParseCancelledError || !this.isCurrent()) return null;
      throw error;
    }
  }

  private captureFileRevision(file: TFile): FileRevision {
    return { mtime: file.stat.mtime, size: file.stat.size };
  }

  private fileRevisionMatches(file: TFile, revision: FileRevision): boolean {
    return file.stat.mtime === revision.mtime && file.stat.size === revision.size;
  }

  private createPage(params: Partial<GraphPage> & Pick<GraphPage, "path" | "name">): GraphPage {
    return {
      path: params.path,
      file: params.file ?? null,
      name: params.name,
      url: params.url ?? null,
      isFolder: params.isFolder ?? false,
      isTag: params.isTag ?? false,
      mtime: params.mtime ?? params.file?.stat.mtime ?? null,
      neighbours: params.neighbours ?? new Map<string, Relation>(),
      aliases: params.aliases ?? [],
      tags: params.tags ?? [],
      noteType: params.noteType ?? null,
      primaryStyleTag: params.primaryStyleTag ?? null,
      styleTags: params.styleTags ?? [],
      maxLabelLength: params.maxLabelLength ?? this.plugin.settings.baseNodeStyle.maxLabelLength ?? 30,
    };
  }

  private addPage(state: GraphState, page: GraphPage): void {
    state.pages.set(page.path, page);
    state.lowercasePathMap.set(page.path.toLowerCase(), page.path);
    this.patchTouchedPagePaths?.add(page.path);
  }

  private async addStructuralSources(state: GraphState): Promise<{
    collector: ObsidianStructuralSourceCollector;
    cursor: SourceBatchCursor;
    pendingFileTree: FileTreeOccurrence[];
    pendingTagTree: TagTreeOccurrence[];
    tagPages: Map<string, GraphPage | null>;
  } | null> {
    const collector = new ObsidianStructuralSourceCollector(
      { vault: this.app.vault, metadataCache: this.app.metadataCache },
      { isCurrent: this.isCurrent, checkpoint: () => this.yieldToHost(), sourceRevision: () => this.plugin.getIndexSourceRevision() },
    );
    const context = {
      collector,
      cursor: beginSourceRead(collector.boundary),
      pendingFileTree: [] as FileTreeOccurrence[],
      pendingTagTree: [] as TagTreeOccurrence[],
      tagPages: new Map<string, GraphPage | null>(),
    };
    const consumed = await collector.collectBatches(async (batch) => {
      const next = this.acceptStructuralBatch(state, context, batch);
      if (!next) return false;
      context.cursor = next;
      return this.yieldToHost();
    });
    return consumed && this.isCurrent() ? context : null;
  }

  private async finalizeStructuralSources(
    state: GraphState,
    context: {
      collector: ObsidianStructuralSourceCollector;
      cursor: SourceBatchCursor;
      pendingFileTree: FileTreeOccurrence[];
      pendingTagTree: TagTreeOccurrence[];
      tagPages: Map<string, GraphPage | null>;
    },
  ): Promise<boolean> {
    const finalBatch = await context.collector.finalize();
    if (!finalBatch) return false;
    const cursor = this.acceptStructuralBatch(state, context, finalBatch);
    if (!cursor) return false;
    context.cursor = cursor;
    if (!this.flushPendingStructuralRecords(state, context)) return false;
    return context.pendingFileTree.length === 0
      && context.pendingTagTree.length === 0
      && context.collector.isBoundaryCurrent(context.cursor.boundary)
      && sourceReadCanPublish(context.cursor, context.collector.boundary)
      && this.isCurrent();
  }

  private acceptStructuralBatch(
    state: GraphState,
    context: {
      collector: ObsidianStructuralSourceCollector;
      cursor: SourceBatchCursor;
      pendingFileTree: FileTreeOccurrence[];
      pendingTagTree: TagTreeOccurrence[];
      tagPages: Map<string, GraphPage | null>;
    },
    batch: NormalizedSourceBatch,
  ): SourceBatchCursor | null {
    const accepted = acceptSourceBatch(context.cursor, batch);
    if (!accepted.accepted) return null;
    for (const record of batch.records) {
      if (record.kind === "entity") {
        if (!this.consumeStructuralEntity(state, context.collector, record)) return null;
      } else if (record.kind === "file-tree") {
        if (!this.consumeFileTreeRecord(state, record)) context.pendingFileTree.push(record);
      } else if (record.kind === "tag-tree") {
        if (!this.consumeTagTreeRecord(state, record, context.tagPages)) context.pendingTagTree.push(record);
      } else {
        return null;
      }
      if (!this.flushPendingStructuralRecords(state, context)) return null;
    }
    return accepted.cursor;
  }

  private consumeStructuralEntity(
    state: GraphState,
    collector: ObsidianStructuralSourceCollector,
    record: SourceEntityFact,
  ): boolean {
    const path = record.entity.semanticPath;
    if (!path) return record.entity.kind === "tag";
    if (record.entity.kind === "tag") return true;
    if (state.pages.has(path)) return true;
    if (record.entity.kind === "container") {
      this.addPage(state, this.createPage({ path, name: record.name, isFolder: true, mtime: record.semanticMtime ?? null }));
      return true;
    }
    if (record.entity.kind !== "document" && record.entity.kind !== "attachment") return false;
    if (!record.file || record.entity.physicalPath !== record.file.path) return false;
    const file = collector.materializedFile(record.file);
    if (!file || file.path !== path) return false;
    this.addPage(state, this.createPage({
      path,
      name: record.name,
      file,
      mtime: record.semanticMtime ?? record.file.mtime ?? null,
    }));
    return true;
  }

  private consumeFileTreeRecord(state: GraphState, record: FileTreeOccurrence): boolean {
    const sourcePath = record.source.semanticPath;
    const targetPath = record.target.entity.semanticPath;
    if (!sourcePath || !targetPath) return false;
    const source = getGraphPage(state, sourcePath);
    const target = getGraphPage(state, targetPath);
    if (!source || !target) return false;
    this.addEvidencePair(state, source, target, "child", RelationType.DEFINED, LinkDirection.FROM, { sourceKind: "file-tree", definition: "file-tree" });
    return true;
  }

  private consumeTagTreeRecord(state: GraphState, record: TagTreeOccurrence, tagPages: Map<string, GraphPage | null>): boolean {
    const rawTag = record.provenance?.rawValue
      ?? record.source.semanticPath?.replace(/^tag:/, "")
      ?? (record.membership === "tag-child" ? record.target.entity.semanticPath?.replace(/^tag:/, "") : undefined);
    if (!rawTag) return false;
    // The former grouped collector resolved each raw tag hierarchy once, not once per member.
    // This run-local cache retains only existing graph pages, never a tag-to-members input copy.
    if (!tagPages.has(rawTag)) tagPages.set(rawTag, this.ensureTagPath(state, rawTag));
    const tagPage = tagPages.get(rawTag);
    if (!tagPage) return true;
    if (record.membership === "tag-child") return true;
    const targetPath = record.target.entity.semanticPath;
    if (!targetPath) return false;
    const member = getGraphPage(state, targetPath);
    if (!member) return false;
    // getAllTags can return repeated memberships. Preserve those original declarations;
    // only ensureTagPath owns deduplication of structural hierarchy edges.
    this.addEvidencePair(state, tagPage, member, "child", RelationType.DEFINED, LinkDirection.TO, { sourceKind: "tag-tree", definition: "tag-tree" });
    return true;
  }

  private flushPendingStructuralRecords(
    state: GraphState,
    context: { pendingFileTree: FileTreeOccurrence[]; pendingTagTree: TagTreeOccurrence[]; tagPages: Map<string, GraphPage | null> },
  ): boolean {
    if (context.pendingFileTree.length) {
      const remaining = context.pendingFileTree.filter((record) => !this.consumeFileTreeRecord(state, record));
      context.pendingFileTree.splice(0, context.pendingFileTree.length, ...remaining);
    }
    if (context.pendingTagTree.length) {
      const remaining = context.pendingTagTree.filter((record) => !this.consumeTagTreeRecord(state, record, context.tagPages));
      context.pendingTagTree.splice(0, context.pendingTagTree.length, ...remaining);
    }
    return this.isCurrent();
  }

  private async addHostLinkSources(state: GraphState): Promise<boolean> {
    const collector = new ObsidianHostLinkSourceCollector(
      { vault: this.app.vault, metadataCache: this.app.metadataCache },
      { isCurrent: this.isCurrent, checkpoint: () => this.yieldToHost(), sourceRevision: () => this.plugin.getIndexSourceRevision() },
    );
    let cursor = beginSourceRead(collector.boundary);
    const consume = async (batch: NormalizedSourceBatch): Promise<boolean> => {
      const accepted = acceptSourceBatch(cursor, batch);
      if (!accepted.accepted) return false;
      for (const record of batch.records) {
        if (record.kind !== "obsidian-link" && record.kind !== "unresolved-link") return false;
        if (!this.consumeHostLinkRecord(state, record)) return false;
      }
      cursor = accepted.cursor;
      return this.yieldToHost();
    };
    if (!(await collector.collectBatches(consume))) return false;
    const finalBatch = await collector.finalize();
    if (!finalBatch || !(await consume(finalBatch))) return false;
    return collector.isBoundaryCurrent(cursor.boundary)
      && sourceReadCanPublish(cursor, collector.boundary)
      && this.isCurrent();
  }

  private consumeHostLinkRecord(state: GraphState, record: HostLinkOccurrence): boolean {
    const sourcePath = record.source.semanticPath;
    const targetPath = record.target.entity.semanticPath;
    if (!sourcePath || !targetPath) return false;
    const source = getGraphPage(state, sourcePath);
    if (!source) return true;
    if (record.kind === "obsidian-link") {
      const target = getGraphPage(state, targetPath);
      if (target) this.addInferredParentChild(state, source, target, "obsidian-link");
      return true;
    }
    if (sourcePath === this.plugin.settings.excalibrainFilepath) return true;
    const target = this.ensureVirtual(state, targetPath);
    this.addInferredParentChild(state, source, target, "unresolved-link");
    return true;
  }

  private async applyHostLinkSourcesForFile(
    state: GraphState,
    sourcePath: string,
    affected: Set<string>,
  ): Promise<boolean> {
    const collector = new ObsidianHostLinkSourceCollector(
      { vault: this.app.vault, metadataCache: this.app.metadataCache },
      { isCurrent: this.isCurrent, checkpoint: () => this.yieldToHost(), sourceRevision: () => this.plugin.getIndexSourceRevision() },
      sourcePath,
    );
    let cursor = beginSourceRead(collector.boundary);
    const consume = async (batch: NormalizedSourceBatch): Promise<boolean> => {
      const accepted = acceptSourceBatch(cursor, batch);
      if (!accepted.accepted) return false;
      for (const record of batch.records) {
        if (record.kind !== "obsidian-link" && record.kind !== "unresolved-link") return false;
        if (!this.consumeHostLinkRecord(state, record)) return false;
        const targetPath = record.target.entity.semanticPath;
        if (targetPath && state.pages.has(targetPath)) affected.add(targetPath);
      }
      cursor = accepted.cursor;
      return this.yieldToHost();
    };
    if (!(await collector.collectBatches(consume))) return false;
    const finalBatch = await collector.finalize();
    if (!finalBatch || !(await consume(finalBatch))) return false;
    return collector.isBoundaryCurrent(cursor.boundary)
      && sourceReadCanPublish(cursor, collector.boundary)
      && this.isCurrent();
  }

  /**
   * Consume configured frontmatter/inline ontology occurrences through the same Obsidian adapter
   * in both rebuild and incremental paths. The adapter owns property selection plus exact
   * source-relative host resolution; relationship role/precedence remains a compiler concern here.
   */
  private async applyOntologySourceFacts(
    state: GraphState,
    page: GraphPage,
    file: TFile,
    meta: ParsedFileMetadata,
  ): Promise<boolean> {
    const collector = new ObsidianOntologySourceCollector(
      { metadataCache: this.app.metadataCache },
      { isCurrent: this.isCurrent, checkpoint: () => this.yieldToHost(), sourceRevision: () => this.plugin.getIndexSourceRevision() },
      file,
      meta,
      this.ontologyConfiguredFields,
    );
    let cursor = beginSourceRead(collector.boundary);
    const consume = async (batch: NormalizedSourceBatch): Promise<boolean> => {
      const accepted = acceptSourceBatch(cursor, batch);
      if (!accepted.accepted) return false;
      for (const record of batch.records) {
        if (record.kind !== "frontmatter-ontology" && record.kind !== "inline-ontology") return false;
        if (!this.consumeOntologyRecord(state, page, record)) return false;
      }
      cursor = accepted.cursor;
      return this.isCurrent();
    };
    if (!(await collector.collectBatches(consume))) return false;
    return collector.isBoundaryCurrent(cursor.boundary)
      && sourceReadCanPublish(cursor, collector.boundary)
      && this.isCurrent();
  }

  private consumeOntologyRecord(state: GraphState, page: GraphPage, record: OntologyOccurrence): boolean {
    if (record.source.semanticPath !== page.path) return false;
    const targetPath = record.target.entity.semanticPath;
    const configuredFieldName = record.provenance?.configuredFieldName;
    if (!targetPath || !configuredFieldName) return false;
    const assignments = this.ontologyAssignments.filter((assignment) => assignment.configuredFieldName === configuredFieldName);
    if (!assignments.length) return false;
    const target = this.ensureTarget(state, targetPath);
    for (const assignment of assignments) {
      const location = record.provenance?.location;
      this.addOntologyEvidence(state, page, target, assignment.role, {
        sourceKind: record.kind,
        definition: record.provenance?.definition ?? assignment.normalizedFieldName,
        fieldName: record.provenance?.fieldName ?? configuredFieldName,
        ...(record.provenance?.rawValue === undefined ? {} : { rawValue: record.provenance.rawValue }),
        ...(location?.line === undefined ? {} : { line: location.line }),
        ...(location?.start === undefined ? {} : { start: location.start }),
        ...(location?.end === undefined ? {} : { end: location.end }),
      });
    }
    return true;
  }

  private async enrichMarkdownPages(state: GraphState): Promise<boolean> {
    const files = this.app.vault.getMarkdownFiles();
    const alive = new Set(files.map((file) => file.path));
    for (const cachedPath of this.fieldCache.keys()) {
      if (alive.has(cachedPath)) continue;
      this.fieldCache.delete(cachedPath);
      void this.bodyCache.deleteBody(cachedPath);
    }

    // A handful of medium IDB transactions is much cheaper than one transaction per note. Keep
    // native file reads bounded by both count and bytes so desktop cold start can overlap I/O
    // without retaining a whole vault of Markdown strings. iOS intentionally remains serial.
    const lookupBatchSize = Platform.isIosApp ? 64 : Platform.isMobile ? 96 : 256;
    const writeBatchSize = Platform.isIosApp ? 48 : Platform.isMobile ? 64 : 128;
    const readConcurrency = Platform.isIosApp ? 1 : Platform.isMobile ? 2 : 6;
    const readByteBudget = Platform.isIosApp ? 1.5 * 1024 * 1024 : Platform.isMobile ? 3 * 1024 * 1024 : 8 * 1024 * 1024;
    const pendingWrites: Array<{ path: string; mtime: number; body: ParsedBodyMetadata }> = [];

    const flushWrites = async (): Promise<boolean> => {
      if (!pendingWrites.length) return true;
      const batch = pendingWrites.splice(0, pendingWrites.length);
      await this.bodyCache.putBodies(batch);
      return this.isCurrent();
    };

    const readGroups = (input: TFile[]): TFile[][] => {
      const groups: TFile[][] = [];
      let current: TFile[] = [];
      let bytes = 0;
      for (const file of input) {
        const size = Math.max(1, file.stat.size || 0);
        if (current.length && (current.length >= readConcurrency || bytes + size > readByteBudget)) {
          groups.push(current);
          current = [];
          bytes = 0;
        }
        current.push(file);
        bytes += size;
        // A single huge file is allowed to exceed the byte budget, but never shares its group.
        if (bytes >= readByteBudget || current.length >= readConcurrency) {
          groups.push(current);
          current = [];
          bytes = 0;
        }
      }
      if (current.length) groups.push(current);
      return groups;
    };

    for (let batchStart = 0; batchStart < files.length; batchStart += lookupBatchSize) {
      if (!this.isCurrent()) return false;
      const batchFiles = files.slice(batchStart, batchStart + lookupBatchSize);
      const revisions = new Map(batchFiles.map((file) => [file.path, this.captureFileRevision(file)] as const));
      const misses = batchFiles.filter((file) => {
        const revision = revisions.get(file.path)!;
        const hot = this.fieldCache.get(file.path);
        return hot?.mtime !== revision.mtime;
      });
      const durable = await this.bodyCache.getBodies(misses.map((file) => ({
        path: file.path,
        mtime: revisions.get(file.path)!.mtime,
      })));
      if (!this.isCurrent()) return false;
      // TFile.stat is mutable. Never let an old body read be committed under a newer revision.
      // Abort this private full build if a source changed while the durable lookup was in flight;
      // Main.ts retains the dirty backlog and coalesces the replacement build.
      if (batchFiles.some((file) => !this.fileRevisionMatches(file, revisions.get(file.path)!))) return false;

      const fresh = new Map<string, ParsedBodyMetadata>();
      const needsRead = misses.filter((file) => !durable.has(file.path));
      for (const group of readGroups(needsRead)) {
        if (!this.isCurrent()) return false;
        const contents = await Promise.all(group.map(async (file) => ({
          file,
          revision: revisions.get(file.path)!,
          content: Platform.isMobile ? await this.app.vault.read(file) : await this.app.vault.cachedRead(file),
        })));
        if (!this.isCurrent()) return false;
        // One worker services parser requests serially. Awaiting each result avoids retaining cloned
        // payloads while still benefiting from overlapped native reads above.
        for (const { file, revision, content } of contents) {
          if (!this.fileRevisionMatches(file, revision)) return false;
          const body = await this.parseBody(content);
          if (!body || !this.isCurrent() || !this.fileRevisionMatches(file, revision)) return false;
          fresh.set(file.path, body);
          pendingWrites.push({ path: file.path, mtime: revision.mtime, body });
          if (pendingWrites.length >= writeBatchSize && !(await flushWrites())) return false;
        }
        if (!(await this.yieldToHost())) return false;
      }

      for (const file of batchFiles) {
        if (!this.isCurrent()) return false;
        const revision = revisions.get(file.path)!;
        if (!this.fileRevisionMatches(file, revision)) return false;
        const page = getGraphPage(state, file.path);
        if (!page) continue;

        let entry = this.fieldCache.get(file.path);
        if (!entry || entry.mtime !== revision.mtime) {
          const body = durable.get(file.path) ?? fresh.get(file.path);
          if (!body) return false;
          entry = { mtime: revision.mtime, body };
          this.rememberFieldCache(file.path, entry);
        }

        const meta = mergeFileMetadata(this.app.metadataCache.getFileCache(file), entry.body);
        entry.semanticSignature = this.semanticSourceSignature(file, entry.body);
        this.semanticFingerprints.set(file.path, entry.semanticSignature);
        if (!(await this.applyMetadata(state, page, file, meta))) return false;
        if (!(await this.yieldToHost())) return false;
      }
    }
    if (!(await flushWrites())) return false;
    return this.isCurrent();
  }

  /**
   * Re-index only modified Markdown sources on top of a hydrated semantic snapshot.
   *
   * This is the normal warm-start path for a large vault: restore the last complete graph from
   * IndexedDB, then replace declarations owned by the handful of files whose mtimes changed while
   * K-Plex was closed. Incoming declarations from other notes remain untouched. Structural vault
   * changes (create/delete/rename) are intentionally handled by a full rebuild instead.
   */
  async patchMarkdownFiles(
    state: GraphState,
    files: readonly TFile[],
    options: {
      useDurableCache?: boolean;
      awaitBodyWrite?: boolean;
      onFileCommitted?: (commit: PatchFileCommit) => void;
    } = {},
  ): Promise<PatchMarkdownResult> {
    const touchedPagePaths = new Set<string>();
    let semanticChanges = 0;
    let semanticNoops = 0;
    const useDurableCache = options.useDurableCache === true;
    const awaitBodyWrite = options.awaitBodyWrite === true;


    for (const file of files) {
      if (!this.isCurrent()) return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
      const fileTouchedPagePaths = new Set<string>();
      this.patchTouchedPagePaths = fileTouchedPagePaths;
      const publishFileCommit = (semanticChanged: boolean): void => {
        fileTouchedPagePaths.add(file.path);
        for (const path of fileTouchedPagePaths) touchedPagePaths.add(path);
        options.onFileCommitted?.({ sourcePath: file.path, touchedPagePaths: new Set(fileTouchedPagePaths), semanticChanged });
      };
      const page = getGraphPage(state, file.path);
      if (!page) return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
      const revision = this.captureFileRevision(file);

      // Live metadata events imply a new mtime, so a durable lookup is normally guaranteed to
      // miss and can be badly delayed by unrelated IndexedDB maintenance. Startup reconciliation
      // opts into durable lookup because it can legitimately hit a body written in the prior run.
      const previousEntry = this.fieldCache.get(file.path);
      let body: ParsedBodyMetadata | null = null;
      if (previousEntry && previousEntry.mtime === revision.mtime) {
        body = previousEntry.body;
      } else if (useDurableCache) {
        body = await this.bodyCache.getBody(file.path, revision.mtime);
        if (!this.isCurrent() || !this.fileRevisionMatches(file, revision)) {
          return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
        }
      }

      if (!body) {
        const content = Platform.isMobile ? await this.app.vault.read(file) : await this.app.vault.cachedRead(file);
        if (!this.isCurrent() || !this.fileRevisionMatches(file, revision)) {
          return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
        }

        body = await this.parseBody(content);
        if (!body || !this.isCurrent() || !this.fileRevisionMatches(file, revision)) {
          return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
        }

        if (awaitBodyWrite) {
          await this.bodyCache.putBody(file.path, revision.mtime, body);
          if (!this.isCurrent() || !this.fileRevisionMatches(file, revision)) {
            return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
          }
        } else {
          this.bodyCache.queueBodyWrite(file.path, revision.mtime, body);
        }
      }

      if (!this.fileRevisionMatches(file, revision)) {
        return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
      }
      const signature = await this.semanticSourceSignatureCooperative(file, body);
      if (!signature || !this.isCurrent() || !this.fileRevisionMatches(file, revision)) {
        return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
      }
      const previousSignature = this.semanticFingerprints.get(file.path) ?? previousEntry?.semanticSignature;
      if (!(await this.compactPublishedPatchLayers(state)) || !this.fileRevisionMatches(file, revision)) {
        return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
      }
      const stagedState = this.createPatchState(state, previousSignature !== signature);
      const stagedPage = getGraphPage(stagedState, file.path);
      if (!stagedPage) return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };

      if (previousSignature === signature) {
        // Even semantic no-ops stage their small metadata/cache-visible mutations. Cancellation can
        // therefore never leave a half-updated discovered-field table or mtime behind.
        const meta = mergeFileMetadata(this.app.metadataCache.getFileCache(file), body);
        if (!(await this.recordDiscoveredFieldsCooperative(stagedState, meta))) {
          return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
        }
        stagedPage.mtime = revision.mtime;
        if (!this.isCurrent() || !this.fileRevisionMatches(file, revision)) {
          return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
        }
        if (!(await this.yieldToHost(true)) || !this.fileRevisionMatches(file, revision)) {
          return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
        }
        this.commitPatchState(state, stagedState);
        this.rememberFieldCache(file.path, { mtime: revision.mtime, body, semanticSignature: signature });
        this.semanticFingerprints.set(file.path, signature);
        semanticNoops += 1;
        publishFileCommit(false);
        if (!(await this.yieldToHost())) return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
        continue;
      }

      const topologyChanged = this.topologySignature(previousSignature) !== this.topologySignature(signature);
      const affected = new Set<string>();
      const oldTagPaths = new Set<string>();
      const oldUrlPaths = new Set<string>();
      touchedPagePaths.add(file.path);
      let processed = 0;
      for (const item of stagedState.evidence.declarationsTouchingIterator(file.path)) {
        const ownedByFile = item.declaredByPath === file.path && FILE_OWNED_EVIDENCE.has(item.sourceKind);
        const tagMembership = item.sourceKind === "tag-tree" && item.declaredTargetPath === file.path && item.declaredByPath.startsWith("tag:");
        if (ownedByFile || tagMembership) {
          affected.add(item.declaredByPath);
          affected.add(item.declaredTargetPath);
          if (tagMembership) oldTagPaths.add(item.declaredByPath);
          if (item.sourceKind === "body-url") oldUrlPaths.add(item.declaredTargetPath);
        }
        processed += 1;
        if ((processed & 127) === 0 && !(await this.yieldToHost())) {
          return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
        }
      }
      const removed = await stagedState.evidence.removeDeclarationsTouchingCooperative(file.path, (item) => {
        if (item.declaredByPath === file.path && FILE_OWNED_EVIDENCE.has(item.sourceKind)) return true;
        return item.sourceKind === "tag-tree" && item.declaredTargetPath === file.path && item.declaredByPath.startsWith("tag:");
      }, () => this.yieldToHost());
      if (removed === null) return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };

      if (!(await this.applyHostLinkSourcesForFile(stagedState, file.path, affected))) {
        return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
      }

      const meta = mergeFileMetadata(this.app.metadataCache.getFileCache(file), body);
      if (!(await this.applyMetadataPatchCooperative(stagedState, stagedPage, file, meta))) {
        return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
      }
      stagedPage.mtime = revision.mtime;
      for (const item of stagedState.evidence.declarationsTouchingIterator(file.path)) {
        affected.add(item.declaredByPath);
        affected.add(item.declaredTargetPath);
        if (item.sourceKind === "body-url") oldUrlPaths.add(item.declaredTargetPath);
        processed += 1;
        if ((processed & 127) === 0 && !(await this.yieldToHost())) return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
      }
      if (!(await this.pruneEmptyTagNodesCooperative(stagedState, oldTagPaths, affected))) return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
      if (!(await this.refreshDerivedUrlOriginsCooperative(stagedState, oldUrlPaths, affected))) return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
      for (const targetPath of affected) {
        fileTouchedPagePaths.add(targetPath);
        if (targetPath !== file.path) {
          this.resolvePatchEvidencePair(stagedState, file.path, targetPath);
          this.resolvePatchEvidencePair(stagedState, targetPath, file.path);
        }
        processed += 1;
        if ((processed & 31) === 0 && !(await this.yieldToHost())) return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
      }
      if (!(await this.pruneUnusedUrlNodesCooperative(stagedState, oldUrlPaths, affected))) return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
      for (const targetPath of affected) fileTouchedPagePaths.add(targetPath);

      if (!this.isCurrent() || !this.fileRevisionMatches(file, revision)) return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
      // Start the atomic publication section at a fresh event-loop slice. The graph/search commit
      // itself must remain synchronous for consistency, so do not let earlier staged work consume
      // part of the same responsiveness budget.
      if (!(await this.yieldToHost(true)) || !this.fileRevisionMatches(file, revision)) {
        return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
      }
      this.commitPatchState(state, stagedState);
      this.rememberFieldCache(file.path, { mtime: revision.mtime, body, semanticSignature: signature });
      this.semanticFingerprints.set(file.path, signature);
      if (topologyChanged) semanticChanges += 1;
      else semanticNoops += 1;
      publishFileCommit(topologyChanged);
      if (!(await this.yieldToHost())) return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
    }

    this.patchTouchedPagePaths = null;
    return { ok: this.isCurrent(), cancelled: !this.isCurrent(), touchedPagePaths, semanticChanges, semanticNoops };
  }

  private recordDiscoveredFields(
    state: GraphState,
    meta: ParsedFileMetadata,
    discoveryMode: "rebuild" | "patch",
  ): void {
    const recordField = (name: string): void => {
      const normalized = normalizeFieldName(name);
      if (!normalized) return;
      const current = state.discoveredFields.get(normalized);
      if (discoveryMode === "patch") {
        // Incremental edits must not inflate counts every time the same note is saved. Exact counts
        // are rebuilt on an authoritative full build; during patches we only discover new fields.
        if (!current) state.discoveredFields.set(normalized, { name: name.trim(), count: 1 });
        return;
      }
      state.discoveredFields.set(normalized, { name: current?.name ?? name.trim(), count: (current?.count ?? 0) + 1 });
    };
    Object.keys(meta.frontmatter).forEach(recordField);
    meta.inlineFieldOccurrences.forEach((occurrence) => recordField(occurrence.name));
  }

  private async recordDiscoveredFieldsCooperative(
    state: GraphState,
    meta: ParsedFileMetadata,
  ): Promise<boolean> {
    const recordField = (name: string): void => {
      const normalized = normalizeFieldName(name);
      if (!normalized) return;
      const current = state.discoveredFields.get(normalized);
      if (!current) state.discoveredFields.set(normalized, { name: name.trim(), count: 1 });
    };
    let processed = 0;
    for (const name of Object.keys(meta.frontmatter)) {
      recordField(name);
      processed += 1;
      if ((processed & 127) === 0 && !(await this.yieldToHost())) return false;
    }
    for (const occurrence of meta.inlineFieldOccurrences) {
      recordField(occurrence.name);
      processed += 1;
      if ((processed & 127) === 0 && !(await this.yieldToHost())) return false;
    }
    return this.isCurrent();
  }

  /** Incremental metadata application runs against a private patch overlay. Every potentially large
   * collection is checkpointed so parsing a note in a worker cannot simply move the UI stall into
   * URL/tag/evidence construction on the main thread. */
  private async applyMetadataPatchCooperative(
    state: GraphState,
    page: GraphPage,
    file: TFile,
    meta: ParsedFileMetadata,
  ): Promise<boolean> {
    page.aliases = meta.aliases;
    page.tags = meta.tags;
    if (!(await this.recordDiscoveredFieldsCooperative(state, meta))) return false;

    const noteTypeField = normalizeFieldName(this.plugin.settings.noteTypeField);
    const frontmatterNoteType = getNormalizedFrontmatterValues(meta, noteTypeField)[0];
    const inlineNoteType = getNormalizedInlineFieldValues(meta, noteTypeField)[0];
    const unwrapNoteType = (value: unknown): string | null => {
      const first: unknown = Array.isArray(value) ? (value as unknown[])[0] : value;
      if (typeof first !== "string" && typeof first !== "number") return null;
      let text = String(first).trim();
      const wiki = text.match(/^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]$/);
      if (wiki) text = wiki[1].trim();
      text = text.replace(/^#/, "").trim();
      return text || null;
    };
    page.noteType = unwrapNoteType(frontmatterNoteType ?? inlineNoteType);

    const styleTags = page.tags.filter((tag) => this.plugin.settings.tagStyleList.some((prefix) => tag.startsWith(prefix)));
    const primaryField = normalizeFieldName(this.plugin.settings.primaryTagField);
    const primaryValues = getNormalizedFieldValues(meta, primaryField)
      .flatMap((v) => typeof v === "string" ? v.match(/#[^\s\])$"'\\]+/g) ?? [] : []);
    page.primaryStyleTag = primaryValues.find((tag) => styleTags.some((s) => s.startsWith(tag))) ?? styleTags[0] ?? null;
    page.styleTags = styleTags.filter((tag) => tag !== page.primaryStyleTag);

    let processed = 0;
    for (const tag of page.tags) {
      const tagPage = this.ensureTagPath(state, tag);
      if (tagPage) this.addEvidencePair(state, tagPage, page, "child", RelationType.DEFINED, LinkDirection.TO, { sourceKind: "tag-tree", definition: "tag-tree" });
      processed += 1;
      if ((processed & 31) === 0 && !(await this.yieldToHost())) return false;
    }

    if (!(await this.applyOntologySourceFacts(state, page, file, meta))) return false;

    this.addDatePropertyEvidence(state, page, meta);
    if (!(await this.yieldToHost())) return false;
    for (const reference of meta.urls) {
      const urlPage = this.ensureUrl(state, reference.url, reference.label || reference.url);
      this.addInferredParentChild(state, page, urlPage, "body-url", reference.line ? { line: reference.line } : undefined);
      try {
        const origin = new URL(reference.url).origin;
        const originPage = this.ensureUrl(state, origin, origin);
        const hasOriginEvidence = state.evidence.between(originPage.path, urlPage.path).some((item) => item.sourceKind === "url-origin");
        if (!hasOriginEvidence) this.addEvidencePair(state, originPage, urlPage, "child", RelationType.INFERRED, LinkDirection.TO, { sourceKind: "url-origin", definition: "url-origin" });
      } catch { /* malformed URL - keep the raw URL node */ }
      processed += 1;
      if ((processed & 31) === 0 && !(await this.yieldToHost())) return false;
    }

    this.suppressPresentationOnlyImageLinks(state, page, file, meta);
    return this.yieldToHost();
  }

  private async applyMetadata(
    state: GraphState,
    page: GraphPage,
    file: TFile,
    meta: ParsedFileMetadata,
    discoveryMode: "rebuild" | "patch" = "rebuild",
  ): Promise<boolean> {
    page.aliases = meta.aliases;
    page.tags = meta.tags;
    this.recordDiscoveredFields(state, meta, discoveryMode);

    const noteTypeField = normalizeFieldName(this.plugin.settings.noteTypeField);
    const frontmatterNoteType = getNormalizedFrontmatterValues(meta, noteTypeField)[0];
    const inlineNoteType = getNormalizedInlineFieldValues(meta, noteTypeField)[0];
    const unwrapNoteType = (value: unknown): string | null => {
      const first: unknown = Array.isArray(value) ? (value as unknown[])[0] : value;
      if (typeof first !== "string" && typeof first !== "number") return null;
      let text = String(first).trim();
      const wiki = text.match(/^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]$/);
      if (wiki) text = wiki[1].trim();
      text = text.replace(/^#/, "").trim();
      return text || null;
    };
    // Frontmatter wins when both forms are present, but classic Dataview body fields remain valid.
    page.noteType = unwrapNoteType(frontmatterNoteType ?? inlineNoteType);

    const styleTags = page.tags.filter((tag) => this.plugin.settings.tagStyleList.some((prefix) => tag.startsWith(prefix)));
    const primaryField = normalizeFieldName(this.plugin.settings.primaryTagField);
    const primaryValues = getNormalizedFieldValues(meta, primaryField)
      .flatMap((v) => typeof v === "string" ? v.match(/#[^\s\])$"'\\]+/g) ?? [] : []);
    page.primaryStyleTag = primaryValues.find((tag) => styleTags.some((s) => s.startsWith(tag))) ?? styleTags[0] ?? null;
    page.styleTags = styleTags.filter((tag) => tag !== page.primaryStyleTag);

    if (discoveryMode === "patch") {
      for (const tag of page.tags) {
        const tagPage = this.ensureTagPath(state, tag);
        if (tagPage) this.addEvidencePair(state, tagPage, page, "child", RelationType.DEFINED, LinkDirection.TO, { sourceKind: "tag-tree", definition: "tag-tree" });
      }
    }

    if (!(await this.applyOntologySourceFacts(state, page, file, meta))) return false;

    this.addDatePropertyEvidence(state, page, meta);

    for (const reference of meta.urls) {
      const urlPage = this.ensureUrl(state, reference.url, reference.label || reference.url);
      this.addInferredParentChild(state, page, urlPage, "body-url", reference.line ? { line: reference.line } : undefined);
      try {
        const origin = new URL(reference.url).origin;
        const originPage = this.ensureUrl(state, origin, origin);
        const hasOriginEvidence = state.evidence.between(originPage.path, urlPage.path)
          .some((item) => item.sourceKind === "url-origin");
        if (!hasOriginEvidence) {
          this.addEvidencePair(state, originPage, urlPage, "child", RelationType.INFERRED, LinkDirection.TO, { sourceKind: "url-origin", definition: "url-origin" });
        }
      } catch { /* malformed URL - keep the raw URL node */ }
    }

    this.suppressPresentationOnlyImageLinks(state, page, file, meta);
    return this.isCurrent();
  }

  /**
   * `thumbnail` / `node-image` are presentation metadata, not graph semantics. Obsidian's
   * resolvedLinks includes links stored in those fields, so without this small reconciliation an
   * image used only to decorate a thought also appears as an inferred child. Compare Obsidian's
   * occurrence count with the links K-Plex can account for inside the two visual fields: only when
   * every occurrence is presentation-only do we remove the generic inferred-link declaration.
   * A second prose/ontology link therefore keeps the attachment visible in the Plex as expected.
   */
  private suppressPresentationOnlyImageLinks(
    state: GraphState,
    page: GraphPage,
    file: TFile,
    meta: ParsedFileMetadata,
  ): void {
    const fields = [this.plugin.settings.thumbnailProperty, this.plugin.settings.nodeImageProperty]
      .map(normalizeFieldName)
      .filter(Boolean);
    if (!fields.length) return;

    const visualCounts = new Map<string, number>();
    for (const field of new Set(fields)) {
      const values = [
        ...getNormalizedFrontmatterValues(meta, field),
        ...getNormalizedInlineFieldValues(meta, field),
      ];
      for (const value of values) {
        for (const targetPath of extractLinksFromValue(this.app, value, file)) {
          visualCounts.set(targetPath, (visualCounts.get(targetPath) ?? 0) + 1);
        }
      }
    }
    if (!visualCounts.size) return;

    const resolved = this.app.metadataCache.resolvedLinks[file.path] ?? {};
    for (const [targetPath, visualCount] of visualCounts) {
      const totalCount = resolved[targetPath] ?? 0;
      if (totalCount <= 0 || totalCount > visualCount) continue;
      state.evidence.removeDeclarationsTouching(file.path, (item) =>
        item.declaredByPath === page.path &&
        item.declaredTargetPath === targetPath &&
        item.sourceKind === "obsidian-link",
      );
    }
  }

  private addOntologyEvidence(state: GraphState, source: GraphPage, target: GraphPage, role: EvidenceRole, provenance: EvidenceProvenance): void {
    if (role === "hidden") {
      if (target.path !== this.plugin.settings.excalibrainFilepath && target.path !== source.path) state.evidence.addHidden(source.path, target.path, provenance);
      return;
    }
    this.addEvidencePair(state, source, target, role, RelationType.DEFINED, LinkDirection.FROM, provenance);
  }

  private ensureTagPath(state: GraphState, rawTag: string): GraphPage | null {
    const parts = rawTag.replace(/^#/, "").split("/").map((part) => part.trim()).filter(Boolean);
    let parent: GraphPage | null = null;
    let leaf: GraphPage | null = null;
    for (let index = 0; index < parts.length; index += 1) {
      const tagPath = parts.slice(0, index + 1).join("/");
      const path = `tag:${tagPath}`;
      let page = state.pages.get(path);
      if (!page) {
        page = this.createPage({ path, name: this.plugin.settings.showFullTagName ? tagPath : parts[index], isTag: true });
        this.addPage(state, page);
      }
      if (parent) {
        const exists = state.evidence.between(parent.path, page.path).some((item) => item.sourceKind === "tag-tree");
        if (!exists) {
          this.addEvidencePair(state, parent, page, "child", RelationType.DEFINED, LinkDirection.FROM, { sourceKind: "tag-tree", definition: "tag-tree" });
          if (this.patchTouchedPagePaths) {
            this.resolvePatchEvidencePair(state, parent.path, page.path);
            this.resolvePatchEvidencePair(state, page.path, parent.path);
            this.patchTouchedPagePaths.add(parent.path);
            this.patchTouchedPagePaths.add(page.path);
          }
        }
      }
      parent = page;
      leaf = page;
    }
    return leaf;
  }

  /** Remove tag nodes made unreachable by an incremental tag edit. Only the edited tag's ancestor
   * chain is visited, so enabling tag thoughts no longer turns every metadata change into a full build. */
  private pruneEmptyTagNodes(state: GraphState, candidates: Iterable<string>, affected: Set<string>): void {
    const pending = new Set([...candidates].filter((path) => path.startsWith("tag:")));
    const ordered = () => [...pending].sort((a, b) => b.split("/").length - a.split("/").length || b.length - a.length);
    for (;;) {
      const paths = ordered();
      if (!paths.length) break;
      pending.clear();
      let removedAny = false;
      for (const path of paths) {
        const page = state.pages.get(path);
        if (!page?.isTag) continue;
        const local = state.evidence.declarationsTouching(path);
        const hasOutgoing = local.some((item) => item.sourceKind === "tag-tree" && item.declaredByPath === path);
        if (hasOutgoing) continue;
        const parents = local
          .filter((item) => item.sourceKind === "tag-tree" && item.declaredTargetPath === path && item.declaredByPath.startsWith("tag:"))
          .map((item) => item.declaredByPath);
        state.evidence.removeDeclarationsTouching(path, (item) =>
          item.sourceKind === "tag-tree" && item.declaredTargetPath === path && item.declaredByPath.startsWith("tag:"));
        for (const parentPath of parents) {
          const parent = state.pages.get(parentPath);
          parent?.neighbours.delete(path);
          affected.add(parentPath);
          pending.add(parentPath);
        }
        for (const targetPath of page.neighbours.keys()) state.pages.get(targetPath)?.neighbours.delete(path);
        state.pages.delete(path);
        state.lowercasePathMap.delete(path.toLowerCase());
        affected.add(path);
        removedAny = true;
      }
      if (!removedAny) break;
    }
  }

  private async pruneEmptyTagNodesCooperative(
    state: GraphState,
    candidates: Iterable<string>,
    affected: Set<string>,
  ): Promise<boolean> {
    const pending = new Set([...candidates].filter((path) => path.startsWith("tag:")));
    let processed = 0;
    for (;;) {
      const paths = [...pending].sort((a, b) => b.split("/").length - a.split("/").length || b.length - a.length);
      if (!paths.length) break;
      pending.clear();
      let removedAny = false;
      for (const path of paths) {
        const page = state.pages.get(path);
        if (!page?.isTag) continue;
        const local: ReturnType<typeof state.evidence.declarationsTouching> = [];
        for (const item of state.evidence.declarationsTouchingIterator(path)) {
          local.push(item);
          processed += 1;
          if ((processed & 127) === 0 && !(await this.yieldToHost())) return false;
        }
        const hasOutgoing = local.some((item) => item.sourceKind === "tag-tree" && item.declaredByPath === path);
        if (hasOutgoing) continue;
        const parents = local
          .filter((item) => item.sourceKind === "tag-tree" && item.declaredTargetPath === path && item.declaredByPath.startsWith("tag:"))
          .map((item) => item.declaredByPath);
        const removed = await state.evidence.removeDeclarationsTouchingCooperative(
          path,
          (item) => item.sourceKind === "tag-tree" && item.declaredTargetPath === path && item.declaredByPath.startsWith("tag:"),
          () => this.yieldToHost(),
        );
        if (removed === null) return false;
        for (const parentPath of parents) {
          state.pages.get(parentPath)?.neighbours.delete(path);
          affected.add(parentPath);
          pending.add(parentPath);
        }
        for (const targetPath of page.neighbours.keys()) state.pages.get(targetPath)?.neighbours.delete(path);
        state.pages.delete(path);
        state.lowercasePathMap.delete(path.toLowerCase());
        affected.add(path);
        removedAny = true;
        processed += 1;
        if ((processed & 31) === 0 && !(await this.yieldToHost())) return false;
      }
      if (!removedAny) break;
    }
    return this.isCurrent();
  }

  /** URL-origin edges are derived from body URL references, not declarations owned by the origin
   * node. Recompute only the URL nodes touched by one edited Markdown file to prevent duplicate
   * declarations and stale derived relations from accumulating over long sessions. */
  private refreshDerivedUrlOrigins(state: GraphState, candidatePaths: Iterable<string>, affected: Set<string>): void {
    for (const urlPath of new Set(candidatePaths)) {
      if (!/^https?:\/\//i.test(urlPath)) continue;
      let origin: string;
      try { origin = new URL(urlPath).origin; } catch { continue; }
      if (origin === urlPath) continue;
      const references = state.evidence.declarationsTouching(urlPath)
        .filter((item) => item.sourceKind === "body-url" && item.declaredTargetPath === urlPath);
      const existing = state.evidence.between(origin, urlPath).filter((item) => item.sourceKind === "url-origin");
      if (!references.length) {
        if (existing.length) state.evidence.removeDeclarationsTouching(urlPath, (item) => item.sourceKind === "url-origin" && item.declaredTargetPath === urlPath);
      } else if (existing.length !== 1) {
        state.evidence.removeDeclarationsTouching(urlPath, (item) => item.sourceKind === "url-origin" && item.declaredTargetPath === urlPath);
        const urlPage = state.pages.get(urlPath);
        const originPage = this.ensureUrl(state, origin, origin);
        if (urlPage) this.addEvidencePair(state, originPage, urlPage, "child", RelationType.INFERRED, LinkDirection.TO, { sourceKind: "url-origin", definition: "url-origin" });
      }
      affected.add(urlPath);
      affected.add(origin);
      this.resolvePatchEvidencePair(state, origin, urlPath);
      this.resolvePatchEvidencePair(state, urlPath, origin);
    }
  }

  private async refreshDerivedUrlOriginsCooperative(
    state: GraphState,
    candidatePaths: Iterable<string>,
    affected: Set<string>,
  ): Promise<boolean> {
    let processed = 0;
    for (const urlPath of new Set(candidatePaths)) {
      if (!/^https?:\/\//i.test(urlPath)) continue;
      let origin: string;
      try { origin = new URL(urlPath).origin; } catch { continue; }
      if (origin === urlPath) continue;
      let referenceCount = 0;
      for (const item of state.evidence.declarationsTouchingIterator(urlPath)) {
        if (item.sourceKind === "body-url" && item.declaredTargetPath === urlPath) referenceCount += 1;
        processed += 1;
        if ((processed & 127) === 0 && !(await this.yieldToHost())) return false;
      }
      const existing = state.evidence.between(origin, urlPath).filter((item) => item.sourceKind === "url-origin");
      if (!referenceCount) {
        if (existing.length) {
          const removed = await state.evidence.removeDeclarationsTouchingCooperative(
            urlPath,
            (item) => item.sourceKind === "url-origin" && item.declaredTargetPath === urlPath,
            () => this.yieldToHost(),
          );
          if (removed === null) return false;
        }
      } else if (existing.length !== 1) {
        const removed = await state.evidence.removeDeclarationsTouchingCooperative(
          urlPath,
          (item) => item.sourceKind === "url-origin" && item.declaredTargetPath === urlPath,
          () => this.yieldToHost(),
        );
        if (removed === null) return false;
        const urlPage = state.pages.get(urlPath);
        const originPage = this.ensureUrl(state, origin, origin);
        if (urlPage) this.addEvidencePair(state, originPage, urlPage, "child", RelationType.INFERRED, LinkDirection.TO, { sourceKind: "url-origin", definition: "url-origin" });
      }
      affected.add(urlPath);
      affected.add(origin);
      this.resolvePatchEvidencePair(state, origin, urlPath);
      this.resolvePatchEvidencePair(state, urlPath, origin);
      processed += 1;
      if ((processed & 31) === 0 && !(await this.yieldToHost())) return false;
    }
    return this.isCurrent();
  }

  /** Release URL nodes that became purely derived and no longer have any declaration touching
   * them. Shared origins survive as long as any URL/referrer still owns evidence. */
  private pruneUnusedUrlNodes(state: GraphState, candidatePaths: Iterable<string>, affected: Set<string>): void {
    const candidates = new Set<string>();
    for (const urlPath of candidatePaths) {
      if (!/^https?:\/\//i.test(urlPath)) continue;
      candidates.add(urlPath);
      try { candidates.add(new URL(urlPath).origin); } catch { /* malformed external target */ }
    }
    // Child URL pages first, then origins. That lets an origin become removable after its final
    // derived child is released in the same patch.
    const ordered = [...candidates].sort((a, b) => b.length - a.length);
    for (const path of ordered) {
      const page = state.pages.get(path);
      if (!page?.url || page.file || state.evidence.declarationsTouching(path).length > 0) continue;
      for (const neighborPath of page.neighbours.keys()) {
        state.pages.get(neighborPath)?.neighbours.delete(path);
        affected.add(neighborPath);
      }
      state.pages.delete(path);
      state.lowercasePathMap.delete(path.toLowerCase());
      affected.add(path);
    }
  }

  private async pruneUnusedUrlNodesCooperative(
    state: GraphState,
    candidatePaths: Iterable<string>,
    affected: Set<string>,
  ): Promise<boolean> {
    const children = new Set<string>();
    const origins = new Set<string>();
    let processed = 0;
    for (const urlPath of candidatePaths) {
      if (!/^https?:\/\//i.test(urlPath)) continue;
      let origin: string | null = null;
      try { origin = new URL(urlPath).origin; } catch { /* malformed external target */ }
      if (origin && origin !== urlPath) {
        children.add(urlPath);
        origins.add(origin);
      } else {
        origins.add(urlPath);
      }
      processed += 1;
      if ((processed & 127) === 0 && !(await this.yieldToHost())) return false;
    }

    const removeIfUnused = async (path: string): Promise<boolean> => {
      const page = state.pages.get(path);
      let hasEvidence = false;
      if (page?.url && !page.file) {
        hasEvidence = !state.evidence.declarationsTouchingIterator(path).next().done;
      }
      if (page?.url && !page.file && !hasEvidence) {
        for (const neighborPath of page.neighbours.keys()) {
          state.pages.get(neighborPath)?.neighbours.delete(path);
          affected.add(neighborPath);
        }
        state.pages.delete(path);
        state.lowercasePathMap.delete(path.toLowerCase());
        affected.add(path);
      }
      processed += 1;
      if ((processed & 31) === 0) return this.yieldToHost();
      return true;
    };

    // Child URL pages must be removed before origins so an origin can become unreferenced within
    // the same patch. Two insertion-ordered passes avoid an O(n log n) synchronous sort.
    for (const path of children) if (!(await removeIfUnused(path))) return false;
    for (const path of origins) if (!(await removeIfUnused(path))) return false;
    return this.isCurrent();
  }

  private addDatePropertyEvidence(state: GraphState, source: GraphPage, meta: ParsedFileMetadata): void {
    const daily = this.dailyNotesSettings();
    if (!daily) return;
    for (const [fieldName, rawValue] of Object.entries(meta.frontmatter)) {
      if (!this.isDateProperty(fieldName)) continue;
      for (const value of flatten(rawValue)) {
        if (typeof value !== "string") continue;
        const rendered = formatDailyDate(value.trim(), daily.format);
        if (!rendered) continue;
        const relative = normalizePath([daily.folder, rendered].filter(Boolean).join("/"));
        const targetPath = relative.toLowerCase().endsWith(".md") ? relative : `${relative}.md`;
        const target = this.ensureVirtualOrExisting(state, targetPath);
        this.addEvidencePair(state, source, target, this.inferredRole(), RelationType.INFERRED, LinkDirection.FROM, {
          sourceKind: "date-property",
          definition: fieldName,
          fieldName,
          rawValue: value,
        });
      }
    }
  }

  private isDateProperty(fieldName: string): boolean {
    const app = this.app as App & {
      metadataTypeManager?: {
        getPropertyInfo?: (name: string) => { widget?: string } | null;
        getAssignedWidget?: (name: string) => string | null;
      };
    };
    const info = app.metadataTypeManager?.getPropertyInfo?.(fieldName);
    const widget = info?.widget ?? app.metadataTypeManager?.getAssignedWidget?.(fieldName);
    return widget === "date";
  }

  private dailyNotesSettings(): { folder: string; format: string } | null {
    const app = this.app as App & {
      internalPlugins?: {
        getPluginById?: (id: string) => unknown;
        plugins?: Record<string, unknown>;
      };
    };
    const registry = app.internalPlugins;
    const candidate = registry?.getPluginById?.("daily-notes") ?? registry?.plugins?.["daily-notes"];
    if (!candidate || typeof candidate !== "object") return null;
    const record = candidate as Record<string, unknown>;
    if (record.enabled === false) return null;
    const instance = record.instance && typeof record.instance === "object" ? record.instance as Record<string, unknown> : record;
    const options = instance.options && typeof instance.options === "object" ? instance.options as Record<string, unknown> : instance;
    const folder = typeof options.folder === "string" ? options.folder : "";
    const format = typeof options.format === "string" && options.format.trim() ? options.format : "YYYY-MM-DD";
    return { folder: normalizePath(folder), format };
  }

  private ensureVirtual(state: GraphState, path: string): GraphPage {
    const existing = getGraphPage(state, path);
    if (existing) return existing;
    const name = path.split("/").pop()?.replace(/\.md$/i, "") || path;
    const page = this.createPage({ path, name });
    this.addPage(state, page);
    return page;
  }

  private ensureVirtualOrExisting(state: GraphState, path: string): GraphPage {
    return getGraphPage(state, path) ?? this.ensureVirtual(state, path);
  }

  private ensureUrl(state: GraphState, url: string, alias?: string): GraphPage {
    const existing = state.pages.get(url);
    if (existing) {
      if (alias && existing.name === existing.url) existing.name = alias;
      return existing;
    }
    const page = this.createPage({ path: url, name: alias || url, url });
    this.addPage(state, page);
    return page;
  }

  private ensureTarget(state: GraphState, path: string): GraphPage {
    if (/^https?:\/\//i.test(path)) return this.ensureUrl(state, path);
    return getGraphPage(state, path) ?? this.ensureVirtual(state, path);
  }

  private inferredRole(): Exclude<EvidenceRole, "hidden"> {
    if (this.plugin.settings.inferAllLinksAsFriends) return "left";
    return this.plugin.settings.inverseInfer ? "parent" : "child";
  }

  private addInferredParentChild(
    state: GraphState,
    source: GraphPage,
    target: GraphPage,
    sourceKind: EvidenceSourceKind,
    extra?: Omit<EvidenceProvenance, "sourceKind">,
  ): void {
    this.addEvidencePair(state, source, target, this.inferredRole(), RelationType.INFERRED, LinkDirection.FROM, { sourceKind, ...extra });
  }

  private addEvidencePair(
    state: GraphState,
    source: GraphPage,
    target: GraphPage,
    role: Exclude<EvidenceRole, "hidden">,
    relationType: RelationType,
    direction: LinkDirection,
    provenance: EvidenceProvenance,
  ): void {
    if (source.path === target.path || target.path === this.plugin.settings.excalibrainFilepath) return;
    state.evidence.addPair(source.path, target.path, role, relationType, direction, provenance);
  }
}
