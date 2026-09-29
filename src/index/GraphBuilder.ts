/**
 * Obsidian-bound graph construction and per-file semantic patch staging. Full builds collect host
 * structure, cached link maps and Markdown semantics into a private snapshot; cold startup can also
 * publish a structure/link baseline and then reuse the same atomic per-file patch boundary to add
 * Markdown semantics progressively without exposing half-committed source state.
 */
import { Platform, TFile, type App } from "obsidian";
import type KplexPlugin from "../main";
import { LinkDirection, RelationType, type GraphPage, type Relation } from "../types";
import { normalizeFieldName } from "../core/contracts/fieldName";
import type { ParsedBodyMetadata, ParsedFileMetadata } from "../core/parser/metadata";
import { mergeFileMetadata } from "./fieldParser";
import { MetadataParseCancelledError, type MetadataParser } from "./MetadataParser";
import type { KplexIndexedDbCache } from "./IndexedDbCache";
import type { EvidenceProvenance, EvidenceSourceKind } from "./RelationEvidence";
import { resolveEvidencePair } from "./RelationResolver";
import { createGraphState, getGraphPage, type GraphState } from "./GraphState";
import { perfNow } from "../util/perf";
import { NormalizedGraphCompiler, type CompiledGraphNode, type CompiledRelationEvidence, type GraphCompilerSettings, type GraphCompilerSourceRead, type PortableGraphCompilation } from "../core/graph/compiler";
import { NormalizedSourcePatchPreparer, type PreparedSourcePatch, type SourcePatchReadPort } from "../core/graph/patch";
import { nodeId, type NodeId } from "../core/graph/model";
import { ObsidianStructuralPatchSourceCollector, ObsidianStructuralSourceCollector } from "../adapters/obsidian/structuralSourceCollector";
import { ObsidianHostLinkSourceCollector, readHostLinkSignatureEntries } from "../adapters/obsidian/hostLinkSourceCollector";
import { ObsidianOntologySourceCollector } from "../adapters/obsidian/ontologySourceCollector";
import {
  createObsidianMetadataSourceHost,
  ObsidianMetadataSourceCollector,
  type ObsidianMetadataSourceHost,
  type ObsidianMetadataSourceSettings,
} from "../adapters/obsidian/metadataSourceCollector";
import {
  acceptSourceBatch,
  beginSourceRead,
  sourceReadCanPublish,
  sourceRevision,
  type NormalizedSourceBatch,
  type SourceEntityFact,
  type SourceEntityRef,
  type SourceFieldNameFact,
  type SourceReadBoundary,
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
  rebuildRequired: boolean;
  touchedPagePaths: Set<string>;
  semanticChanges: number;
  semanticNoops: number;
};

export type PatchFileCommit = Readonly<{
  sourcePath: string;
  touchedPagePaths: ReadonlySet<string>;
  semanticChanged: boolean;
}>;

export type PatchFilePublisher = (commit: PatchFileCommit, publishPreparedState: () => void) => void;

type FileRevision = {
  path: string;
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
  private readonly ontologyConfiguredFields: readonly string[];
  private readonly metadataSourceHost: ObsidianMetadataSourceHost;
  private readonly metadataSourceSettings: ObsidianMetadataSourceSettings;

  constructor(
    private plugin: KplexPlugin,
    private app: App,
    private fieldCache: Map<string, FieldCacheEntry>,
    private metadataParser: MetadataParser,
    private bodyCache: KplexIndexedDbCache,
    private isCurrent: () => boolean,
    private semanticFingerprints: Map<string, string> = new Map(),
  ) {
    this.metadataSourceHost = createObsidianMetadataSourceHost(app);
    this.metadataSourceSettings = {
      noteTypeField: plugin.settings.noteTypeField,
      primaryTagField: plugin.settings.primaryTagField,
      thumbnailProperty: plugin.settings.thumbnailProperty,
      nodeImageProperty: plugin.settings.nodeImageProperty,
    };
    const hierarchy = plugin.settings.hierarchy;
    this.ontologyConfiguredFields = [...new Set([
      ...hierarchy.hidden,
      ...hierarchy.parents,
      ...hierarchy.children,
      ...hierarchy.leftFriends,
      ...hierarchy.rightFriends,
      ...hierarchy.previous,
      ...hierarchy.next,
    ].filter((fieldName) => Boolean(normalizeFieldName(fieldName))))];
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
      if (this.semanticFrontmatterFields.has(normalizeFieldName(key)) || this.metadataSourceHost.isDateProperty(key)) {
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
      if (this.semanticFrontmatterFields.has(normalizeFieldName(key)) || this.metadataSourceHost.isDateProperty(key)) {
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

  private materializePreparedNode(state: GraphState, node: CompiledGraphNode): boolean {
    const path = node.semanticPath;
    if (!path) return false;
    if (state.pages.has(path)) return true;
    // Existing materialized files are supplied through the stable read port. A previously unknown
    // materialized document/attachment therefore requires structural reconciliation, not optimistic
    // creation inside semantic preparation.
    if (node.file || node.kind === "document" || node.kind === "attachment" || node.kind === "container") return false;
    this.addPage(state, this.createPage({
      path,
      name: node.name,
      url: node.url,
      isTag: node.kind === "tag",
      mtime: node.semanticMtime,
      aliases: [...node.aliases],
      tags: [...node.tags],
      noteType: node.noteType,
      primaryStyleTag: node.primaryStyleTag,
      styleTags: [...node.styleTags],
      maxLabelLength: node.maxLabelLength,
    }));
    return true;
  }

  private preparedEvidenceProvenance(item: CompiledRelationEvidence): EvidenceProvenance {
    return {
      sourceKind: item.sourceKind,
      ...(item.definition === undefined ? {} : { definition: item.definition }),
      ...(item.fieldName === undefined ? {} : { fieldName: item.fieldName }),
      ...(item.rawValue === undefined ? {} : { rawValue: item.rawValue }),
      ...(item.line === undefined ? {} : { line: item.line }),
      ...(item.start === undefined ? {} : { start: item.start }),
      ...(item.end === undefined ? {} : { end: item.end }),
    };
  }

  private addPreparedDeclaration(state: GraphState, item: CompiledRelationEvidence): boolean {
    const sourcePath = item.declaredByPath;
    const targetPath = item.declaredTargetPath;
    if (!sourcePath || !targetPath) return false;
    // Tag hierarchy is shared derived structure. Keep one declaration even when many notes
    // contribute the same nested tag path; leaf memberships retain their own multiplicity.
    if (item.sourceKind === "tag-tree" && sourcePath.startsWith("tag:") && targetPath.startsWith("tag:")
      && state.evidence.between(sourcePath, targetPath).some((existing) => existing.sourceKind === "tag-tree")) return true;
    state.evidence.addDeclaration(sourcePath, targetPath, item.declaredRole, item.relationType, item.direction, this.preparedEvidenceProvenance(item));
    return true;
  }

  /** Apply portable semantic preparation only to the private staging state. Publication, file
   * binding, signatures and callbacks remain outside this method at the existing revision fence. */
  private async applyPreparedSourcePatch(
    state: GraphState,
    sourcePath: string,
    patch: PreparedSourcePatch,
    affected: Set<string>,
    desiredUrlOrigins: Map<string, string>,
    discoveryMode: "patch" | "rebuild",
  ): Promise<boolean> {
    const sourceNode = patch.sourceNode;
    const sourcePage = state.pages.get(sourcePath);
    if (!sourceNode || sourceNode.semanticPath !== sourcePath || !sourcePage) return false;

    let processed = 0;
    for (const node of patch.newNodes()) {
      if (!this.materializePreparedNode(state, node)) return false;
      if (node.semanticPath) affected.add(node.semanticPath);
      processed += 1;
      if ((processed & 63) === 0 && !(await this.yieldToHost())) return false;
    }

    // Preserve the legacy first-meaningful URL label rule without cloning every referenced page.
    // Inspect the published value and clone only a URL page that actually needs a label upgrade.
    for (const node of patch.compilation.nodes.values()) {
      if (node.kind !== "url" || !node.semanticPath || !node.name || node.name === node.url) continue;
      const published = isPatchOverlayMap(state.pages)
        ? state.pages.publicationValue(node.semanticPath)
        : state.pages.get(node.semanticPath);
      if (published?.url && published.name === published.url) {
        const staged = state.pages.get(node.semanticPath);
        if (!staged) return false;
        staged.name = node.name;
        affected.add(node.semanticPath);
      }
      processed += 1;
      if ((processed & 63) === 0 && !(await this.yieldToHost())) return false;
    }

    sourcePage.aliases = [...sourceNode.aliases];
    sourcePage.tags = [...sourceNode.tags];
    sourcePage.noteType = sourceNode.noteType;
    sourcePage.primaryStyleTag = sourceNode.primaryStyleTag;
    sourcePage.styleTags = [...sourceNode.styleTags];
    sourcePage.maxLabelLength = sourceNode.maxLabelLength;

    for (const [normalized, value] of patch.compilation.discoveredFields) {
      const current = state.discoveredFields.get(normalized);
      if (discoveryMode === "rebuild") {
        state.discoveredFields.set(normalized, {
          name: current?.name ?? value.name,
          count: (current?.count ?? 0) + value.count,
        });
      } else if (!current) {
        // Runtime patches cannot cheaply subtract the prior per-file contribution, so they retain
        // the historical discovery contract: learn newly seen fields and let the next full build
        // restore exact counts. Cold progressive ingestion starts from zero and may count exactly.
        state.discoveredFields.set(normalized, { ...value, count: 1 });
      }
    }

    for (const item of patch.declarations()) {
      const declaredBy = item.declaredByPath;
      const declaredTarget = item.declaredTargetPath;
      if (!declaredBy || !declaredTarget) return false;
      affected.add(declaredBy);
      affected.add(declaredTarget);
      if (item.sourceKind === "url-origin") {
        desiredUrlOrigins.set(declaredTarget, declaredBy);
      } else if (!this.addPreparedDeclaration(state, item)) {
        return false;
      } else if (item.sourceKind === "tag-tree" && declaredBy.startsWith("tag:") && declaredTarget.startsWith("tag:")) {
        this.resolvePatchEvidencePair(state, declaredBy, declaredTarget);
        this.resolvePatchEvidencePair(state, declaredTarget, declaredBy);
      }
      processed += 1;
      if ((processed & 127) === 0 && !(await this.yieldToHost())) return false;
    }
    return this.isCurrent();
  }

  private async reconcilePreparedUrlOriginsCooperative(
    state: GraphState,
    candidatePaths: Iterable<string>,
    desiredOrigins: ReadonlyMap<string, string>,
    affected: Set<string>,
  ): Promise<boolean> {
    let processed = 0;
    for (const urlPath of new Set(candidatePaths)) {
      if (!/^https?:\/\//i.test(urlPath)) continue;
      let referenceCount = 0;
      const existingOrigins: string[] = [];
      for (const item of state.evidence.declarationsTouchingIterator(urlPath)) {
        if (item.sourceKind === "body-url" && item.declaredTargetPath === urlPath) referenceCount += 1;
        if (item.sourceKind === "url-origin" && item.declaredTargetPath === urlPath) existingOrigins.push(item.declaredByPath);
        processed += 1;
        if ((processed & 127) === 0 && !(await this.yieldToHost())) return false;
      }
      let desiredOrigin: string | undefined;
      if (!referenceCount) {
        if (existingOrigins.length) {
          const removed = await state.evidence.removeDeclarationsTouchingCooperative(
            urlPath,
            (item) => item.sourceKind === "url-origin" && item.declaredTargetPath === urlPath,
            () => this.yieldToHost(),
          );
          if (removed === null) return false;
        }
      } else {
        desiredOrigin = desiredOrigins.get(urlPath) ?? existingOrigins[0];
        if (!desiredOrigin) {
          // Root URLs point at their own origin and malformed external references have no origin.
          // The legacy patch path deliberately kept both as URL nodes without a derived self-edge.
          let derivedOrigin: string | null = null;
          try { derivedOrigin = new URL(urlPath).origin; } catch { /* malformed URL */ }
          if (derivedOrigin && derivedOrigin !== urlPath) return false;
        } else {
          if (existingOrigins.length !== 1 || existingOrigins[0] !== desiredOrigin) {
            const removed = await state.evidence.removeDeclarationsTouchingCooperative(
              urlPath,
              (item) => item.sourceKind === "url-origin" && item.declaredTargetPath === urlPath,
              () => this.yieldToHost(),
            );
            if (removed === null) return false;
            const originPage = state.pages.get(desiredOrigin);
            const urlPage = state.pages.get(urlPath);
            if (!originPage || !urlPage) return false;
            state.evidence.addPair(desiredOrigin, urlPath, "child", RelationType.INFERRED, LinkDirection.TO, { sourceKind: "url-origin", definition: "url-origin" });
          }
          affected.add(desiredOrigin);
        }
      }
      for (const origin of new Set([...existingOrigins, ...(desiredOrigin ? [desiredOrigin] : [])])) {
        this.resolvePatchEvidencePair(state, origin, urlPath);
        this.resolvePatchEvidencePair(state, urlPath, origin);
      }
      affected.add(urlPath);
      processed += 1;
      if ((processed & 31) === 0 && !(await this.yieldToHost())) return false;
    }
    return this.isCurrent();
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

  /**
   * Build the authoritative complete graph privately.
   *
   * @returns A fully collected state only when every source family remains current through binding;
   * otherwise `null` so the coordinator can retain the previous published graph.
   */
  async build(): Promise<GraphState | null> {
    const compiler = this.createFullCompiler();
    const structuralRead = await this.collectStructuralSources(compiler);
    if (!structuralRead) return null;
    if (!(await this.collectHostLinkSources(compiler))) return null;
    if (!(await this.collectMarkdownSources(compiler))) return null;
    if (!(await this.finalizeStructuralSources(compiler, structuralRead))) return null;

    const compiled = await compiler.finish();
    if (!compiled || !structuralRead.collector.isBoundaryCurrent(structuralRead.read.boundary) || !this.isCurrent()) return null;
    const state = await this.bindCompiledGraph(compiled, structuralRead.collector);
    if (!state || !structuralRead.collector.isBoundaryCurrent(structuralRead.read.boundary) || !this.isCurrent()) return null;
    return state;
  }

  /**
   * Build the low-cost cold-start baseline from vault structure, tag structure and Obsidian's
   * already-resolved link maps without reading Markdown bodies.
   *
   * @returns A graph containing materialized vault nodes and host-link relationships, or `null` if
   * the source revision changes while the private read is in flight. The caller may patch Markdown
   * semantics into this state before publishing it as a non-authoritative startup preview.
   */
  async buildStructuralBaseline(): Promise<GraphState | null> {
    const compiler = this.createFullCompiler();
    const structuralRead = await this.collectStructuralSources(compiler);
    if (!structuralRead) return null;
    if (!(await this.collectHostLinkSources(compiler))) return null;
    if (!(await this.finalizeStructuralSources(compiler, structuralRead))) return null;

    const compiled = await compiler.finish();
    if (!compiled || !structuralRead.collector.isBoundaryCurrent(structuralRead.read.boundary) || !this.isCurrent()) return null;
    const state = await this.bindCompiledGraph(compiled, structuralRead.collector);
    if (!state || !structuralRead.collector.isBoundaryCurrent(structuralRead.read.boundary) || !this.isCurrent()) return null;
    return state;
  }

  private fullCompilerSettings(): GraphCompilerSettings {
    const hierarchy = this.plugin.settings.hierarchy;
    return {
      hierarchy: {
        hidden: [...hierarchy.hidden],
        parents: [...hierarchy.parents],
        children: [...hierarchy.children],
        leftFriends: [...hierarchy.leftFriends],
        rightFriends: [...hierarchy.rightFriends],
        previous: [...hierarchy.previous],
        next: [...hierarchy.next],
      },
      inferAllLinksAsFriends: this.plugin.settings.inferAllLinksAsFriends,
      inverseInfer: this.plugin.settings.inverseInfer,
      showFullTagName: this.plugin.settings.showFullTagName,
      tagStyleList: [...this.plugin.settings.tagStyleList],
      maxLabelLength: this.plugin.settings.baseNodeStyle.maxLabelLength ?? 30,
    };
  }

  private createFullCompiler(): NormalizedGraphCompiler {
    return new NormalizedGraphCompiler(this.fullCompilerSettings(), {
      now: perfNow,
      yield: async () => { await new Promise<void>((resolve) => window.setTimeout(resolve, 0)); },
      isCurrent: this.isCurrent,
      sliceBudgetMs: Platform.isIosApp ? 7 : Platform.isMobile ? 9 : 13,
      resolverBatchSize: Platform.isIosApp ? 96 : Platform.isMobile ? 160 : 400,
    });
  }

  private patchCompilerRuntime() {
    return {
      now: perfNow,
      yield: async () => { await new Promise<void>((resolve) => window.setTimeout(resolve, 0)); },
      isCurrent: this.isCurrent,
      sliceBudgetMs: Platform.isIosApp ? 7 : Platform.isMobile ? 9 : 13,
      resolverBatchSize: Platform.isIosApp ? 96 : Platform.isMobile ? 160 : 400,
    };
  }

  private patchReadPort(state: GraphState): SourcePatchReadPort {
    return {
      entity: (ref: SourceEntityRef): SourceEntityFact | undefined => {
        if (!ref.semanticPath) return undefined;
        // Preparation reads the stable published value, not a clone in the private transaction.
        // The legacy GraphState is path-keyed; the portable side still retains/refers to the exact
        // producer NodeId supplied in `ref`, and host path binding remains outside core.
        const page = isPatchOverlayMap(state.pages)
          ? state.pages.publicationValue(ref.semanticPath)
          : state.pages.get(ref.semanticPath);
        if (!page) return undefined;
        const entity: SourceEntityRef = {
          id: ref.id,
          kind: ref.kind,
          state: ref.state,
          semanticPath: page.path,
          ...(page.file ? { physicalPath: page.file.path } : ref.physicalPath ? { physicalPath: ref.physicalPath } : {}),
        };
        return {
          kind: "entity",
          source: entity,
          sourceRevision: sourceRevision(`published:${page.path}\u0000${page.mtime ?? ""}`),
          entity,
          name: page.name,
          url: page.url,
          semanticMtime: page.mtime,
          ...(page.file ? {
            file: {
              name: page.file.name,
              extension: page.file.extension,
              path: page.file.path,
              mtime: page.file.stat.mtime,
              basename: page.file.basename,
              ctime: page.file.stat.ctime,
              size: page.file.stat.size,
            },
          } : {}),
        };
      },
    };
  }

  private async collectPatchFinalSource(
    preparer: NormalizedSourcePatchPreparer,
    collector: {
      readonly boundary: SourceReadBoundary;
      collectBatches(consume: (batch: NormalizedSourceBatch) => Promise<boolean> | boolean): Promise<boolean>;
      isBoundaryCurrent(boundary: SourceReadBoundary): boolean;
    },
  ): Promise<boolean> {
    const read = preparer.beginRead(collector.boundary);
    if (!(await collector.collectBatches((batch) => preparer.acceptBatch(read, batch)))) return false;
    return collector.isBoundaryCurrent(read.boundary)
      && preparer.completeRead(read, collector.boundary)
      && this.isCurrent();
  }

  private async collectPatchHostLinks(
    preparer: NormalizedSourcePatchPreparer,
    sourcePath: string,
  ): Promise<boolean> {
    const collector = new ObsidianHostLinkSourceCollector(
      { vault: this.app.vault, metadataCache: this.app.metadataCache },
      { isCurrent: this.isCurrent, checkpoint: () => this.yieldToHost(), sourceRevision: () => this.plugin.getIndexSourceRevision() },
      sourcePath,
    );
    const read = preparer.beginRead(collector.boundary);
    if (!(await collector.collectBatches((batch) => preparer.acceptBatch(read, batch)))) return false;
    const finalBatch = await collector.finalize();
    if (!finalBatch || !(await preparer.acceptBatch(read, finalBatch))) return false;
    return collector.isBoundaryCurrent(read.boundary)
      && preparer.completeRead(read, collector.boundary)
      && this.isCurrent();
  }

  private async prepareMarkdownSourcePatch(
    state: GraphState,
    file: TFile,
    meta: ParsedFileMetadata,
  ): Promise<Readonly<{ outcome: "prepared"; patch: PreparedSourcePatch }> | Readonly<{ outcome: "cancelled" | "rejected" | "rebuild-required" }>> {
    const preparer = new NormalizedSourcePatchPreparer(
      nodeId(file.path),
      this.fullCompilerSettings(),
      this.patchCompilerRuntime(),
      this.patchReadPort(state),
    );
    const runtime = {
      isCurrent: this.isCurrent,
      checkpoint: () => this.yieldToHost(),
      sourceRevision: () => this.plugin.getIndexSourceRevision(),
    };
    const structural = new ObsidianStructuralPatchSourceCollector(
      { vault: this.app.vault, metadataCache: this.app.metadataCache }, runtime, file,
    );
    if (!(await this.collectPatchFinalSource(preparer, structural))) return { outcome: "cancelled" };
    if (!(await this.collectPatchHostLinks(preparer, file.path))) return { outcome: "cancelled" };

    const metadata = new ObsidianMetadataSourceCollector(
      this.metadataSourceHost, runtime, file, meta, this.metadataSourceSettings, "metadata",
    );
    if (!(await this.collectPatchFinalSource(preparer, metadata))) return { outcome: "cancelled" };
    const ontology = new ObsidianOntologySourceCollector(
      { metadataCache: this.app.metadataCache }, runtime, file, meta, this.ontologyConfiguredFields,
    );
    if (!(await this.collectPatchFinalSource(preparer, ontology))) return { outcome: "cancelled" };
    const relations = new ObsidianMetadataSourceCollector(
      this.metadataSourceHost, runtime, file, meta, this.metadataSourceSettings, "relations",
    );
    if (!(await this.collectPatchFinalSource(preparer, relations))) return { outcome: "cancelled" };

    const prepared = await preparer.finish();
    if (prepared.outcome === "prepared") return prepared;
    return { outcome: prepared.outcome };
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
    return { path: file.path, mtime: file.stat.mtime, size: file.stat.size };
  }

  private fileRevisionMatches(file: TFile, revision: FileRevision): boolean {
    return file.path === revision.path && file.stat.mtime === revision.mtime && file.stat.size === revision.size &&
      this.app.vault.getFileByPath(revision.path) === file;
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

  private async collectStructuralSources(compiler: NormalizedGraphCompiler): Promise<{
    collector: ObsidianStructuralSourceCollector;
    read: GraphCompilerSourceRead;
  } | null> {
    const collector = new ObsidianStructuralSourceCollector(
      { vault: this.app.vault, metadataCache: this.app.metadataCache },
      { isCurrent: this.isCurrent, checkpoint: () => this.yieldToHost(), sourceRevision: () => this.plugin.getIndexSourceRevision() },
    );
    const read = compiler.beginRead(collector.boundary);
    const consumed = await collector.collectBatches((batch) => compiler.acceptBatch(read, batch));
    return consumed && this.isCurrent() ? { collector, read } : null;
  }

  private async finalizeStructuralSources(
    compiler: NormalizedGraphCompiler,
    context: { collector: ObsidianStructuralSourceCollector; read: GraphCompilerSourceRead },
  ): Promise<boolean> {
    const finalBatch = await context.collector.finalize();
    if (!finalBatch || !(await compiler.acceptBatch(context.read, finalBatch))) return false;
    return context.collector.isBoundaryCurrent(context.read.boundary)
      && compiler.completeRead(context.read, context.collector.boundary)
      && this.isCurrent();
  }

  private async collectHostLinkSources(compiler: NormalizedGraphCompiler): Promise<boolean> {
    const collector = new ObsidianHostLinkSourceCollector(
      { vault: this.app.vault, metadataCache: this.app.metadataCache },
      { isCurrent: this.isCurrent, checkpoint: () => this.yieldToHost(), sourceRevision: () => this.plugin.getIndexSourceRevision() },
    );
    const read = compiler.beginRead(collector.boundary);
    if (!(await collector.collectBatches((batch) => compiler.acceptBatch(read, batch)))) return false;
    const finalBatch = await collector.finalize();
    if (!finalBatch || !(await compiler.acceptBatch(read, finalBatch))) return false;
    return collector.isBoundaryCurrent(read.boundary)
      && compiler.completeRead(read, collector.boundary)
      && this.isCurrent();
  }

  private async collectFinalCompilerSource(
    compiler: NormalizedGraphCompiler,
    collector: {
      readonly boundary: SourceReadBoundary;
      collectBatches(consume: (batch: NormalizedSourceBatch) => Promise<boolean> | boolean): Promise<boolean>;
      isBoundaryCurrent(boundary: SourceReadBoundary): boolean;
    },
  ): Promise<boolean> {
    const read = compiler.beginRead(collector.boundary);
    if (!(await collector.collectBatches((batch) => compiler.acceptBatch(read, batch)))) return false;
    return collector.isBoundaryCurrent(read.boundary)
      && compiler.completeRead(read, collector.boundary)
      && this.isCurrent();
  }

  private async collectMetadataSources(
    compiler: NormalizedGraphCompiler,
    file: TFile,
    meta: ParsedFileMetadata,
  ): Promise<boolean> {
    const runtime = {
      isCurrent: this.isCurrent,
      checkpoint: () => this.yieldToHost(),
      sourceRevision: () => this.plugin.getIndexSourceRevision(),
    };
    const metadata = new ObsidianMetadataSourceCollector(
      this.metadataSourceHost, runtime, file, meta, this.metadataSourceSettings, "metadata",
    );
    if (!(await this.collectFinalCompilerSource(compiler, metadata))) return false;

    const ontology = new ObsidianOntologySourceCollector(
      { metadataCache: this.app.metadataCache }, runtime, file, meta, this.ontologyConfiguredFields,
    );
    if (!(await this.collectFinalCompilerSource(compiler, ontology))) return false;

    const relations = new ObsidianMetadataSourceCollector(
      this.metadataSourceHost, runtime, file, meta, this.metadataSourceSettings, "relations",
    );
    return this.collectFinalCompilerSource(compiler, relations);
  }

  private async bindCompiledGraph(
    compiled: PortableGraphCompilation,
    structuralCollector: ObsidianStructuralSourceCollector,
  ): Promise<GraphState | null> {
    if (!this.isCurrent()) return null;
    const evidence = compiled.legacyEvidence();
    if (!evidence) return null;
    const state = createGraphState();
    state.evidence = evidence;
    state.discoveredFields = new Map(compiled.discoveredFields);
    const pagesById = new Map<NodeId, GraphPage>();
    let processed = 0;

    for (const node of compiled.nodes.values()) {
      if (!node.semanticPath) return null;
      let file: TFile | null = null;
      if (node.file) {
        file = structuralCollector.materializedFile(node.file);
        if (!file || file.path !== node.physicalPath) return null;
      }
      const page = this.createPage({
        path: node.semanticPath,
        name: node.name,
        file,
        url: node.url,
        isFolder: node.kind === "container",
        isTag: node.kind === "tag",
        mtime: node.semanticMtime,
        aliases: [...node.aliases],
        tags: [...node.tags],
        noteType: node.noteType,
        primaryStyleTag: node.primaryStyleTag,
        styleTags: [...node.styleTags],
        maxLabelLength: node.maxLabelLength,
      });
      this.addPage(state, page);
      pagesById.set(node.id, page);
      if ((++processed & 127) === 0 && !(await this.yieldToHost())) return null;
    }

    for (const node of compiled.nodes.values()) {
      const page = pagesById.get(node.id);
      if (!page) return null;
      for (const relation of node.neighbours.values()) {
        const target = pagesById.get(relation.target.id);
        if (!target) return null;
        page.neighbours.set(target.path, { ...relation, target });
        if ((++processed & 127) === 0 && !(await this.yieldToHost())) return null;
      }
    }
    return state;
  }

  private async collectMarkdownSources(compiler: NormalizedGraphCompiler): Promise<boolean> {
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
      const revisions = new Map(batchFiles.map((file) => [file, this.captureFileRevision(file)] as const));
      const misses = batchFiles.filter((file) => {
        const revision = revisions.get(file)!;
        const hot = this.fieldCache.get(revision.path);
        return hot?.mtime !== revision.mtime;
      });
      const durable = await this.bodyCache.getBodies(misses.map((file) => {
        const revision = revisions.get(file)!;
        return { path: revision.path, mtime: revision.mtime };
      }));
      if (!this.isCurrent()) return false;
      // TFile.stat is mutable. Never let an old body read be committed under a newer revision.
      // Abort this private full build if a source changed while the durable lookup was in flight;
      // Main.ts retains the dirty backlog and coalesces the replacement build.
      if (batchFiles.some((file) => !this.fileRevisionMatches(file, revisions.get(file)!))) return false;

      const fresh = new Map<string, ParsedBodyMetadata>();
      const needsRead = misses.filter((file) => !durable.has(file.path));
      for (const group of readGroups(needsRead)) {
        if (!this.isCurrent()) return false;
        const contents = await Promise.all(group.map(async (file) => ({
          file,
          revision: revisions.get(file)!,
          content: Platform.isMobile ? await this.app.vault.read(file) : await this.app.vault.cachedRead(file),
        })));
        if (!this.isCurrent()) return false;
        // One worker services parser requests serially. Awaiting each result avoids retaining cloned
        // payloads while still benefiting from overlapped native reads above.
        for (const { file, revision, content } of contents) {
          if (!this.fileRevisionMatches(file, revision)) return false;
          const body = await this.parseBody(content);
          if (!body || !this.isCurrent() || !this.fileRevisionMatches(file, revision)) return false;
          fresh.set(revision.path, body);
          pendingWrites.push({ path: revision.path, mtime: revision.mtime, body });
          if (pendingWrites.length >= writeBatchSize && !(await flushWrites())) return false;
        }
        if (!(await this.yieldToHost())) return false;
      }

      for (const file of batchFiles) {
        if (!this.isCurrent()) return false;
        const revision = revisions.get(file)!;
        if (!this.fileRevisionMatches(file, revision)) return false;
        let entry = this.fieldCache.get(revision.path);
        if (!entry || entry.mtime !== revision.mtime) {
          const body = durable.get(revision.path) ?? fresh.get(revision.path);
          if (!body) return false;
          entry = { mtime: revision.mtime, body };
          this.rememberFieldCache(revision.path, entry);
        }

        const meta = mergeFileMetadata(this.app.metadataCache.getFileCache(file), entry.body);
        entry.semanticSignature = this.semanticSourceSignature(file, entry.body);
        this.semanticFingerprints.set(revision.path, entry.semanticSignature);
        if (!(await this.collectMetadataSources(compiler, file, meta))) return false;
        if (!(await this.yieldToHost())) return false;
      }
    }
    if (!(await flushWrites())) return false;
    return this.isCurrent();
  }

  /**
   * Parse Markdown sources and commit each source through the existing atomic patch boundary.
   *
   * Runtime/warm-start callers replace declarations owned by modified files on a hydrated graph.
   * Cold progressive startup sets `discoveryMode: "rebuild"` and feeds every source exactly once
   * into a structural baseline, forcing semantic application even when a prior cancelled attempt
   * left a hot body/fingerprint cache entry behind. Structural vault changes remain the caller's
   * responsibility. `afterFileCommit` runs only after a complete per-source publication and may
   * pause ingestion for maintenance; cancellation still retains previously committed sources.
   */
  async patchMarkdownFiles(
    state: GraphState,
    files: readonly TFile[],
    options: {
      useDurableCache?: boolean;
      awaitBodyWrite?: boolean;
      publishFileCommit?: PatchFilePublisher;
      /** Optional maintenance after a complete source commit, before the next source is read. */
      afterFileCommit?: (sourcePath: string) => Promise<void>;
      /** Full cold-start ingestion counts every discovered field exactly once per source. */
      discoveryMode?: "patch" | "rebuild";
    } = {},
  ): Promise<PatchMarkdownResult> {
    const touchedPagePaths = new Set<string>();
    let semanticChanges = 0;
    let semanticNoops = 0;
    const useDurableCache = options.useDurableCache === true;
    const awaitBodyWrite = options.awaitBodyWrite === true;
    const discoveryMode = options.discoveryMode ?? "patch";

    for (const file of files) {
      if (!this.isCurrent()) return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
      const revision = this.captureFileRevision(file);
      const sourcePath = revision.path;
      const fileTouchedPagePaths = new Set<string>();
      this.patchTouchedPagePaths = fileTouchedPagePaths;
      const publishFileCommit = (semanticChanged: boolean, publishPreparedState: () => void): void => {
        fileTouchedPagePaths.add(sourcePath);
        const commit: PatchFileCommit = {
          sourcePath,
          touchedPagePaths: new Set(fileTouchedPagePaths),
          semanticChanged,
        };
        for (const path of fileTouchedPagePaths) touchedPagePaths.add(path);
        if (!options.publishFileCommit) {
          publishPreparedState();
          return;
        }
        let published = false;
        let acceptingPublication = true;
        const publishOnce = (): void => {
          if (!acceptingPublication) throw new Error(`Patch publisher callback expired: ${sourcePath}`);
          if (published) throw new Error(`Patch commit published more than once: ${sourcePath}`);
          published = true;
          publishPreparedState();
        };
        try {
          options.publishFileCommit(commit, publishOnce);
        } finally {
          acceptingPublication = false;
        }
        if (!published) throw new Error(`Patch publisher did not publish synchronously: ${sourcePath}`);
      };
      const page = getGraphPage(state, sourcePath);
      if (!page) return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };

      // Live metadata events imply a new mtime, so a durable lookup is normally guaranteed to
      // miss and can be badly delayed by unrelated IndexedDB maintenance. Startup reconciliation
      // opts into durable lookup because it can legitimately hit a body written in the prior run.
      const previousEntry = this.fieldCache.get(sourcePath);
      let body: ParsedBodyMetadata | null = null;
      if (previousEntry && previousEntry.mtime === revision.mtime) {
        body = previousEntry.body;
      } else if (useDurableCache) {
        body = await this.bodyCache.getBody(sourcePath, revision.mtime);
        if (!this.isCurrent() || !this.fileRevisionMatches(file, revision)) {
          return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
        }
      }

      if (!body) {
        const content = Platform.isMobile ? await this.app.vault.read(file) : await this.app.vault.cachedRead(file);
        if (!this.isCurrent() || !this.fileRevisionMatches(file, revision)) {
          return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
        }

        body = await this.parseBody(content);
        if (!body || !this.isCurrent() || !this.fileRevisionMatches(file, revision)) {
          return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
        }

        if (awaitBodyWrite) {
          await this.bodyCache.putBody(sourcePath, revision.mtime, body);
          if (!this.isCurrent() || !this.fileRevisionMatches(file, revision)) {
            return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
          }
        } else {
          this.bodyCache.queueBodyWrite(sourcePath, revision.mtime, body);
        }
      }

      if (!this.fileRevisionMatches(file, revision)) {
        return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
      }
      const signature = await this.semanticSourceSignatureCooperative(file, body);
      if (!signature || !this.isCurrent() || !this.fileRevisionMatches(file, revision)) {
        return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
      }
      // A progressive rebuild starts from a structural-only baseline. A body cache entry left by a
      // cancelled earlier attempt is useful for parsing, but its semantic fingerprint must never
      // suppress applying that source to the fresh baseline. Runtime patches do have prior semantics.
      const previousSignature = discoveryMode === "rebuild"
        ? undefined
        : this.semanticFingerprints.get(sourcePath) ?? previousEntry?.semanticSignature;
      if (!(await this.compactPublishedPatchLayers(state)) || !this.fileRevisionMatches(file, revision)) {
        return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
      }
      const stagedState = this.createPatchState(state, previousSignature !== signature);
      const stagedPage = getGraphPage(stagedState, sourcePath);
      if (!stagedPage) return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };

      if (previousSignature === signature) {
        // Even semantic no-ops stage their small metadata/cache-visible mutations. Cancellation can
        // therefore never leave a half-updated discovered-field table or mtime behind.
        const meta = mergeFileMetadata(this.app.metadataCache.getFileCache(file), body);
        if (!(await this.applyFieldNameSourceFacts(stagedState, file, meta))) {
          return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
        }
        stagedPage.mtime = revision.mtime;
        if (!this.isCurrent() || !this.fileRevisionMatches(file, revision)) {
          return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
        }
        if (!(await this.yieldToHost(true)) || !this.fileRevisionMatches(file, revision)) {
          return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
        }
        publishFileCommit(false, () => {
          this.commitPatchState(state, stagedState);
          this.rememberFieldCache(sourcePath, { mtime: revision.mtime, body, semanticSignature: signature });
          this.semanticFingerprints.set(sourcePath, signature);
        });
        semanticNoops += 1;
        await options.afterFileCommit?.(sourcePath);
        if (!(await this.yieldToHost())) return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
        continue;
      }

      const topologyChanged = this.topologySignature(previousSignature) !== this.topologySignature(signature);
      const affected = new Set<string>();
      const oldTagPaths = new Set<string>();
      const oldUrlPaths = new Set<string>();
      const desiredUrlOrigins = new Map<string, string>();
      touchedPagePaths.add(sourcePath);
      const meta = mergeFileMetadata(this.app.metadataCache.getFileCache(file), body);
      const preparation = await this.prepareMarkdownSourcePatch(stagedState, file, meta);
      if (preparation.outcome === "rebuild-required") {
        return { ok: false, cancelled: false, rebuildRequired: true, touchedPagePaths, semanticChanges, semanticNoops };
      }
      if (preparation.outcome !== "prepared" || !this.isCurrent() || !this.fileRevisionMatches(file, revision)) {
        return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
      }
      const preparedPatch = preparation.patch;

      let processed = 0;
      for (const item of stagedState.evidence.declarationsTouchingIterator(sourcePath)) {
        const ownedByFile = item.declaredByPath === sourcePath && FILE_OWNED_EVIDENCE.has(item.sourceKind);
        const tagMembership = item.sourceKind === "tag-tree" && item.declaredTargetPath === sourcePath && item.declaredByPath.startsWith("tag:");
        if (ownedByFile || tagMembership) {
          affected.add(item.declaredByPath);
          affected.add(item.declaredTargetPath);
          if (tagMembership) oldTagPaths.add(item.declaredByPath);
          if (item.sourceKind === "body-url") oldUrlPaths.add(item.declaredTargetPath);
        }
        processed += 1;
        if ((processed & 127) === 0 && !(await this.yieldToHost())) {
          return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
        }
      }
      const removed = await stagedState.evidence.removeDeclarationsTouchingCooperative(sourcePath, (item) => {
        if (item.declaredByPath === sourcePath && FILE_OWNED_EVIDENCE.has(item.sourceKind)) return true;
        return item.sourceKind === "tag-tree" && item.declaredTargetPath === sourcePath && item.declaredByPath.startsWith("tag:");
      }, () => this.yieldToHost());
      if (removed === null) return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };

      if (!(await this.applyPreparedSourcePatch(stagedState, sourcePath, preparedPatch, affected, desiredUrlOrigins, discoveryMode))) {
        return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
      }
      stagedPage.mtime = revision.mtime;
      for (const item of stagedState.evidence.declarationsTouchingIterator(sourcePath)) {
        affected.add(item.declaredByPath);
        affected.add(item.declaredTargetPath);
        if (item.sourceKind === "body-url") oldUrlPaths.add(item.declaredTargetPath);
        processed += 1;
        if ((processed & 127) === 0 && !(await this.yieldToHost())) return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
      }
      if (!(await this.pruneEmptyTagNodesCooperative(stagedState, oldTagPaths, affected))) return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
      if (!(await this.reconcilePreparedUrlOriginsCooperative(stagedState, oldUrlPaths, desiredUrlOrigins, affected))) return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
      for (const targetPath of affected) {
        fileTouchedPagePaths.add(targetPath);
        if (targetPath !== sourcePath) {
          this.resolvePatchEvidencePair(stagedState, sourcePath, targetPath);
          this.resolvePatchEvidencePair(stagedState, targetPath, sourcePath);
        }
        processed += 1;
        if ((processed & 31) === 0 && !(await this.yieldToHost())) return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
      }
      if (!(await this.pruneUnusedUrlNodesCooperative(stagedState, oldUrlPaths, affected))) return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
      for (const targetPath of affected) fileTouchedPagePaths.add(targetPath);

      if (!this.isCurrent() || !this.fileRevisionMatches(file, revision)) return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
      // Start the atomic publication section at a fresh event-loop slice. The graph/search commit
      // itself must remain synchronous for consistency, so do not let earlier staged work consume
      // part of the same responsiveness budget.
      if (!(await this.yieldToHost(true)) || !this.fileRevisionMatches(file, revision)) {
        return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
      }
      publishFileCommit(topologyChanged, () => {
        this.commitPatchState(state, stagedState);
        this.rememberFieldCache(sourcePath, { mtime: revision.mtime, body, semanticSignature: signature });
        this.semanticFingerprints.set(sourcePath, signature);
      });
      if (topologyChanged) semanticChanges += 1;
      else semanticNoops += 1;
      await options.afterFileCommit?.(sourcePath);
      if (!(await this.yieldToHost())) return { ok: false, cancelled: true, rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
    }

    this.patchTouchedPagePaths = null;
    return { ok: this.isCurrent(), cancelled: !this.isCurrent(), rebuildRequired: false, touchedPagePaths, semanticChanges, semanticNoops };
  }

  private consumeFieldNameRecord(
    state: GraphState,
    record: SourceFieldNameFact,
    discoveryMode: "rebuild" | "patch",
  ): boolean {
    const normalized = record.normalizedFieldName;
    if (!normalized) return true;
    const current = state.discoveredFields.get(normalized);
    if (discoveryMode === "patch") {
      // Incremental edits must not inflate counts every time the same note is saved. Exact counts
      // are rebuilt on an authoritative full build; during patches we only discover new fields.
      if (!current) state.discoveredFields.set(normalized, { name: record.fieldName.trim(), count: 1 });
      return true;
    }
    state.discoveredFields.set(normalized, {
      name: current?.name ?? record.fieldName.trim(),
      count: (current?.count ?? 0) + 1,
    });
    return true;
  }

  private async applyFieldNameSourceFacts(
    state: GraphState,
    file: TFile,
    meta: ParsedFileMetadata,
  ): Promise<boolean> {
    const collector = new ObsidianMetadataSourceCollector(
      this.metadataSourceHost,
      { isCurrent: this.isCurrent, checkpoint: () => this.yieldToHost(), sourceRevision: () => this.plugin.getIndexSourceRevision() },
      file,
      meta,
      this.metadataSourceSettings,
      "field-names",
    );
    let cursor = beginSourceRead(collector.boundary);
    const consume = async (batch: NormalizedSourceBatch): Promise<boolean> => {
      const accepted = acceptSourceBatch(cursor, batch);
      if (!accepted.accepted) return false;
      for (const record of batch.records) {
        if (record.kind !== "field-name" || record.source.semanticPath !== file.path) return false;
        if (!this.consumeFieldNameRecord(state, record, "patch")) return false;
      }
      cursor = accepted.cursor;
      return this.isCurrent();
    };
    if (!(await collector.collectBatches(consume))) return false;
    return collector.isBoundaryCurrent(cursor.boundary)
      && sourceReadCanPublish(cursor, collector.boundary)
      && this.isCurrent();
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

}
