/**
 * Published graph repository for K-Plex. It owns snapshot restoration/persistence, search and
 * presentation caches, atomic per-file publication and startup rebuild orchestration; builders stage
 * semantics privately while this class decides when partial cold-start or authoritative state may
 * become visible to UI readers.
 */
import { ObsidianSourceAcquisition } from "../adapters/obsidian/sourceAcquisition";
import { Platform, TFile, normalizePath, type App } from "obsidian";
import type KplexPlugin from "../main";
import type { KplexSettings } from "../settings";
import {
  LinkDirection,
  RelationType,
  type GraphPage,
  type NodeVisual,
  type GateSide,
  type GateStats,
  type Neighbour,
  type Neighborhood,
  type Relation,
  type Role,
} from "../types";
import { planRetiredExclusionReconciliation } from "./LegacySnapshotPolicy";
import { GraphBuilder, type FieldCacheEntry, type PatchFileCommit, type PatchFilePublisher } from "./GraphBuilder";
import { normalizeFieldName, type ParsedBodyMetadata } from "../core/parser/metadata";
import { extractLinksFromValue } from "./fieldParser";
import { KplexIndexedDbCache, sanitizeIndexDiagnostics, type IndexedDbSnapshotMeta, type IndexDiagnosticEntry,
  type SnapshotWriteFailureReason } from "./IndexedDbCache";
import { createGraphState, getGraphPage } from "./GraphState";
import type { EvidenceRole, EvidenceSourceKind, RelationEvidence } from "./RelationEvidence";
import { MetadataParser } from "./MetadataParser";
import {
  addPersistedEvidenceToState,
  addPersistedPageToState,
  captureVaultInventory,
  computeIndexSettingsSignature,
  computeVaultSignature,
  finalizeHydratedGraphStateCooperative,
  hydratePersistedPageRelations,
  isPersistedIndexManifestV2,
  persistedDeclarationFromEvidence,
  persistedPageFromGraphPage,
  type PersistedEvidenceDeclaration,
  type PersistedIndexManifestV2,
  type PersistedPage,
  type VaultInventory,
} from "./IndexSnapshot";
import {
  classifyRelation,
  explainResolvedRelationship,
  resolveEvidencePair,
  type RelationshipExplanation,
} from "./RelationResolver";


import { tagDisplayName } from "../core/graph/presentation";
import { captureSettingsPolicy, classifySettingsChange, compareIndexSettingsSignature } from "../core/graph/settingsPolicy";
import {
  ALL_PRESENTATION_FACETS, applyPreparedPresentation, capturePresentationSettings, prepareGraphPresentation,
  presentationFacetsForPage, withPreparedPresentation, type PreparedGraphPresentation, type PresentationStatus,
} from "./GraphPresentation";

type PreparedPresentationPublication = {
  settings: KplexSettings;
  facets: PreparedGraphPresentation;
  search: PreparedSearchIndex;
};

type CachedRelationView = {
  signature: string;
  roles: Record<Exclude<Role, "sibling">, Neighbour[]>;
  gateStats: GateStats;
  neighbourCount: number;
};

type SearchEntry = {
  page: GraphPage;
  name: string;
  aliases: string[];
  path: string;
};

type PreparedSearchIndex = {
  entries: SearchEntry[];
  byPath: Map<string, SearchEntry>;
};

type FileRevision = { mtime: number; size: number };

const captureFileRevision = (file: TFile): FileRevision => ({ mtime: file.stat.mtime, size: file.stat.size });
const fileRevisionMatches = (file: TFile, revision: FileRevision): boolean =>
  file.stat.mtime === revision.mtime && file.stat.size === revision.size;

const FILE_CONTENT_EVIDENCE = new Set<EvidenceSourceKind>([
  "obsidian-link",
  "unresolved-link",
  "frontmatter-ontology",
  "inline-ontology",
  "body-url",
  "date-property",
]);

export type SuggestionCatalog = {
  tags: string[];
  noteTypes: string[];
  folders: string[];
  properties: string[];
};

export type PatchMarkdownPathsResult =
  | { outcome: "patched"; count: number }
  | { outcome: "cancelled"; count: number; pendingPaths: string[] }
  | { outcome: "needs-rebuild"; count: number };

const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const naturalCompare = (a: string, b: string) => naturalCollator.compare(a, b);
const SNAPSHOT_EDIT_IDLE_MS = 5 * 60 * 1000;
const SNAPSHOT_MAINTENANCE_IDLE_MS = 5 * 60 * 1000;
const SNAPSHOT_HYDRATION_STALL_MS = 90 * 1000;
const SNAPSHOT_HYDRATION_WATCHDOG_POLL_MS = 5 * 1000;
const COLD_CHECKPOINT_MIN_FILES = 500;
const COLD_CHECKPOINT_INTERVAL_MS = 2 * 60 * 1000;
const COLD_CHECKPOINT_MAX_INTERVAL_MS = 5 * 60 * 1000;
const COLD_CHECKPOINT_PROGRESS_FILES = 2000;
const COLD_CHECKPOINT_PROGRESS_MIN_INTERVAL_MS = 60 * 1000;

type SnapshotHydrationPhase =
  | "idle"
  | "metadata"
  | "preview"
  | "pages"
  | "file-rebind"
  | "relations"
  | "preview-search"
  | "evidence"
  | "resolve"
  | "authoritative-search"
  | "promote"
  | "complete"
  | "failed"
  | "timed-out"
  | "cancelled";

export type SnapshotHydrationDiagnostics = {
  run: number;
  phase: SnapshotHydrationPhase;
  lastActivePhase: SnapshotHydrationPhase;
  startedAt: number | null;
  phaseStartedAt: number | null;
  lastProgressAt: number | null;
  pages: number;
  relations: number;
  evidence: number;
  outcome: "idle" | "running" | "complete" | "failed" | "timed-out" | "cancelled";
};

function subsequenceScore(text: string, query: string): number | null {
  if (!query) return 0;
  if (text === query) return 0;
  if (text.startsWith(query)) return 20 + Math.min(80, text.length - query.length);
  const containedAt = text.indexOf(query);
  if (containedAt >= 0) return 120 + containedAt * 4 + Math.min(120, text.length - query.length);

  let qi = 0;
  let first = -1;
  let last = -1;
  let gapPenalty = 0;
  let boundaryBonus = 0;
  for (let i = 0; i < text.length && qi < query.length; i += 1) {
    if (text[i] !== query[qi]) continue;
    if (first < 0) first = i;
    if (last >= 0) gapPenalty += Math.max(0, i - last - 1);
    if (i === 0 || /[\s_\-/.]/.test(text[i - 1])) boundaryBonus += 8;
    last = i;
    qi += 1;
  }
  if (qi !== query.length) return null;
  return 1000 + first * 5 + gapPenalty * 12 + Math.max(0, text.length - query.length) - boundaryBonus;
}

function searchEntryScore(entry: SearchEntry, query: string): number | null {
  let best = subsequenceScore(entry.name, query);
  for (const alias of entry.aliases) {
    const score = subsequenceScore(alias, query);
    if (score !== null && (best === null || score + 8 < best)) best = score + 8;
  }
  const pathScore = subsequenceScore(entry.path, query);
  if (pathScore !== null && (best === null || pathScore + 240 < best)) best = pathScore + 240;
  return best;
}

export class GraphIndex {
  private state = createGraphState();
  private listeners = new Set<() => void>();
  private presentationListeners = new Set<() => void>();
  private presentationSettings: KplexSettings;
  private presentationStatuses = new WeakMap<GraphPage, PresentationStatus>();
  private presentationRun = 0;
  private publicationRevision = 0;
  private semanticRevision = 0;
  private fieldCache = new Map<string, FieldCacheEntry>();
  /** Compact semantic fingerprints survive hot-body LRU eviction so prose-only edits stay cheap. */
  private semanticFingerprints = new Map<string, string>();
  private generation = 0;
  private building = false;
  private checkpointSaving = false;
  private rebuildQueued = false;
  private searchEntries: SearchEntry[] = [];
  private searchEntryByPath = new Map<string, SearchEntry>();
  private searchCandidateCache = new Map<string, SearchEntry[]>();
  private suggestionCatalogCache: SuggestionCatalog | null = null;
  private titleCache = new Map<string, { signature: string; title: string }>();
  private relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
  private metadataParser = new MetadataParser();
  private snapshotPersistTimer: number | null = null;
  private orphanCleanupTimer: number | null = null;
  private snapshotPersistGeneration = 0;
  private bodyWarmGeneration = 0;
  private readonly indexedDb: KplexIndexedDbCache;
  private readonly sourceAcquisition: ObsidianSourceAcquisition;
  private indexDiagnostics: IndexDiagnosticEntry[] = [];
  private savedSnapshotSummary: {
    storage: "unchecked" | "available" | "unavailable";
    invalidActive: boolean;
    active: { createdAt: number; schema: number } | null;
    checkpoint: { createdAt: number; schema: number; completedMarkdownFiles: number } | null;
  } = { storage: "unchecked", invalidActive: false, active: null, checkpoint: null };
  private diagnosticWriteTask: Promise<void> = Promise.resolve();
  private diagnosticsClosed = false;
  private searchEntryPointPaths: string[] = [];
  private restoredModifiedMarkdownPaths: string[] = [];
  private restoredAddedMarkdownPaths: string[] = [];
  private restoredRemovedMarkdownPaths: string[] = [];
  private restoredVaultSignature: string | null = null;
  private restoreInventorySourceRevision: number | null = null;
  private restoredStructuralMismatch = false;
  private restoredPatchPlanAvailable = false;
  private resumableCheckpointPaths: Set<string> | null = null;
  private snapshotHydrationTask: Promise<{ restored: boolean; fresh: boolean; createdAt: number | null }> | null = null;
  private snapshotHydrationRun = 0;
  private cancelSnapshotHydration: (() => void) | null = null;
  private snapshotHydrationDiagnostics: SnapshotHydrationDiagnostics = {
    run: 0, phase: "idle", lastActivePhase: "idle", startedAt: null, phaseStartedAt: null, lastProgressAt: null,
    pages: 0, relations: 0, evidence: 0, outcome: "idle",
  };
  private fullSnapshotHydrated = false;
  private fullSnapshotFresh = false;
  private previewSnapshotPublished = false;
  private activeSnapshotGeneration: string | null = null;
  private nodeVisualCache = new Map<string, { signature: string; visual: NodeVisual | null }>();
  constructor(private plugin: KplexPlugin, private app: App = plugin.app) {
    this.presentationSettings = capturePresentationSettings(plugin.settings);
    this.indexedDb = new KplexIndexedDbCache(app.vault.getName());
    this.sourceAcquisition = new ObsidianSourceAcquisition(app, this.indexedDb, (text) => this.metadataParser.parse(text));
    // Remove the old parsed-body localStorage payload. IndexedDB is now the only durable index
    // cache; localStorage is a poor fit for large vaults because serialization duplicates memory.
    void this.indexedDb.clearLegacyLocalStorage(app);
  }

  /** Aggregate-only neutral persistence status, independent of graph snapshot readiness. */
  getSourceRepositoryDiagnostics() { return this.sourceAcquisition.getDiagnostics(); }
  /** Aggregate acquisition counters for restart/selective-repair validation; never source contents. */
  getSourceAcquisitionCounters() { return this.sourceAcquisition.getCounters(); }
  /** Explicit maintenance durability fence; plugin unload deliberately does not await this. */
  flushSourceRepository(): Promise<boolean> { return this.sourceAcquisition.flush(); }

  get pages(): Map<string, GraphPage> { return this.state.pages; }
  get lowercasePathMap(): Map<string, string> { return this.state.lowercasePathMap; }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** Advance the evidence revision only for repository semantic/workflow notifications. */
  private emit(): void {
    this.semanticRevision += 1;
    for (const listener of this.listeners) listener();
  }
  notify(): void { this.emit(); }

  /** Subscribe to presentation publication without invalidating evidence/relationship consumers. */
  subscribePresentation(listener: () => void): () => void {
    this.presentationListeners.add(listener);
    return () => { this.presentationListeners.delete(listener); };
  }

  /** Evidence consumers use this revision rather than render-only updates. */
  getSemanticRevision(): number { return this.semanticRevision; }

  /** Expose pending inputs without persisting a misleading known-empty presentation value. */
  getPresentationStatus(page: GraphPage): PresentationStatus {
    return this.presentationStatuses.get(page) ?? { noteType: "pending", styleTags: "pending" };
  }

  /** Overlay only the prepared presentation policy; view/workflow preferences remain live. */
  withPreparedPresentationSettings(settings: KplexSettings): KplexSettings {
    return withPreparedPresentation(settings, this.presentationSettings);
  }

  /** Notify visible views; hidden views catch up through their existing visibility subscription. */
  private emitPresentation(): void {
    for (const listener of this.presentationListeners) listener();
  }

  /** Request a render-only update for legacy workflow controls without touching evidence. */
  notifyPresentation(): void { this.emitPresentation(); }

  /**
   * Legacy synchronous display-name facade. It owns only alias/name/title preferences, not selected
   * type/style facets. Settings controls use refreshPresentationSettings for the full atomic path.
   */
  refreshDisplayNames(): void {
    this.presentationSettings = { ...this.presentationSettings,
      renderAlias: this.plugin.settings.renderAlias, nameFields: this.plugin.settings.nameFields,
      nodeTitleScript: this.plugin.settings.nodeTitleScript };
    this.titleCache.clear();
    this.rebuildSearchIndex();
    this.emitPresentation();
  }

  /**
   * Prepare a settings-only refresh from cached inputs. A lightweight facet/search staging area is
   * published in one synchronous step. No builder, patcher, parser, relationship cache or body read
   * participates. Supersession, source publication and unload invalidate the complete preparation.
   */
  async refreshPresentationSettings(): Promise<void> {
    const run = ++this.presentationRun;
    const alive = (): boolean => !this.diagnosticsClosed && run === this.presentationRun;
    while (alive()) {
      const settings = capturePresentationSettings(this.plugin.settings);
      const policy = captureSettingsPolicy(settings);
      const effects = classifySettingsChange(captureSettingsPolicy(this.presentationSettings), policy);
      if (!effects.render) return;
      const revision = this.publicationRevision;
      const sourceRevision = this.plugin.getIndexSourceRevision();
      const state = this.state;
      const current = (): boolean => alive() && this.state === state && revision === this.publicationRevision &&
        sourceRevision === this.plugin.getIndexSourceRevision();
      const policyCurrent = (): boolean => current() && !classifySettingsChange(policy, captureSettingsPolicy(this.plugin.settings)).render;
      const keys = effects.changedKeys;
      const facets = effects.presentationFacets ? await prepareGraphPresentation(state.pages.values(), settings, {
        names: keys.includes("showFullTagName"), limits: keys.includes("baseNodeStyle.maxLabelLength"),
        noteType: keys.includes("noteTypeField"), styleTags: keys.includes("primaryTagField") || keys.includes("tagStyleList"),
      }, this.app, this.fieldCache, this.indexedDb, current) : null;
      if (!policyCurrent() || (effects.presentationFacets && !facets)) continue;
      const search = effects.searchTerms ? await this.prepareSearchIndex(state, current, undefined, settings, facets) : null;
      if (!policyCurrent() || (facets && !facets.isCurrent()) || (effects.searchTerms && !search)) continue;
      // No await below this line: policy, facets and search become visible as one publication.
      if (facets) applyPreparedPresentation(facets, this.presentationStatuses);
      this.presentationSettings = settings;
      if (effects.searchTerms) this.titleCache.clear();
      if (search) this.installSearchIndex(search);
      if (effects.presentationFacets) this.suggestionCatalogCache = null;
      if (effects.nodeVisuals) this.nodeVisualCache.clear();
      this.recordIndexDiagnostic("restore", facets?.pending ? "presentation-inputs-pending" : "presentation-settings-adapted",
        { changedKeys: [...keys], modified: facets?.pending ?? 0 });
      this.emitPresentation();
      return;
    }
  }

  /** Prepare current presentation and search for an unpublished state, retrying changed policies. */
  private async preparePresentationPublication(
    state: ReturnType<typeof createGraphState>, isCurrent: () => boolean, onProgress?: () => void, structuralPreview = false,
  ): Promise<PreparedPresentationPublication | null> {
    while (isCurrent() && !this.diagnosticsClosed) {
      const settings = capturePresentationSettings(this.plugin.settings);
      const policy = captureSettingsPolicy(settings);
      const sourceRevision = this.plugin.getIndexSourceRevision();
      const current = (): boolean => isCurrent() && !this.diagnosticsClosed &&
        sourceRevision === this.plugin.getIndexSourceRevision();
      const policyCurrent = (): boolean => current() && !classifySettingsChange(policy, captureSettingsPolicy(this.plugin.settings)).render;
      const facets = await prepareGraphPresentation(state.pages.values(), settings, ALL_PRESENTATION_FACETS,
        this.app, this.fieldCache, structuralPreview ? { getBodies: () => Promise.resolve(new Map()) } : this.indexedDb, current, onProgress);
      if (!facets || !policyCurrent()) continue;
      // Cold structural publication keeps its bounded seed search and never preloads all bodies.
      const search = structuralPreview ? { entries: [], byPath: new Map<string, SearchEntry>() } :
        await this.prepareSearchIndex(state, current, onProgress, settings, facets);
      if (!search || !policyCurrent() || !facets.isCurrent()) continue;
      return { settings, facets, search };
    }
    return null;
  }

  /** Install prepared facets immediately before the associated graph/search publication. */
  private acceptPresentation(prepared: PreparedPresentationPublication): void {
    applyPreparedPresentation(prepared.facets, this.presentationStatuses);
    this.presentationSettings = prepared.settings;
  }

  get size(): number { return this.state.pages.size; }
  /** Markdown sources represented by the currently published semantic index. */
  indexedMarkdownFileCount(): number { return this.semanticFingerprints.size; }
  /** The progressive builder pauses source ingestion while a checkpoint is made durable. */
  isCheckpointSaving(): boolean { return this.checkpointSaving; }
  get(path: string): GraphPage | undefined { return getGraphPage(this.state, path); }
  allPages(): GraphPage[] { return [...this.state.pages.values()]; }

  private static readonly IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp"]);

  private imageVisualFromValue(value: unknown, hostFile: TFile, mode: NodeVisual["mode"]): NodeVisual | null {
    for (const target of extractLinksFromValue(this.app, value, hostFile)) {
      if (/^https?:\/\//i.test(target)) {
        return { mode, src: target, path: target, alt: target };
      }
      const file = this.app.vault.getAbstractFileByPath(target);
      if (!(file instanceof TFile) || !GraphIndex.IMAGE_EXTENSIONS.has(file.extension.toLowerCase())) continue;
      return { mode, src: this.app.vault.getResourcePath(file), path: file.path, alt: file.basename };
    }
    return null;
  }

  /**
   * Resolve imagery only for the nodes a Plex is about to render. This deliberately stays outside
   * GraphPage/persisted snapshots: frontmatter comes from Obsidian's metadata cache and Dataview-
   * style inline fields come from K-Plex's existing parsed-body cache in one batched IndexedDB read.
   */
  invalidateNodeVisual(path: string): void {
    this.nodeVisualCache.delete(path);
  }

  async resolveNodeVisuals(pages: readonly GraphPage[]): Promise<Map<string, NodeVisual>> {
    const result = new Map<string, NodeVisual>();
    const thumbnailField = normalizeFieldName(this.plugin.settings.thumbnailProperty);
    const replaceField = normalizeFieldName(this.plugin.settings.nodeImageProperty);
    const bodyRequests: Array<{ page: GraphPage; file: TFile; signature: string }> = [];

    const frontmatterValue = (file: TFile, normalized: string): unknown => {
      if (!normalized) return undefined;
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (!frontmatter) return undefined;
      for (const [key, value] of Object.entries(frontmatter)) {
        if (key !== "position" && normalizeFieldName(key) === normalized) return value;
      }
      return undefined;
    };

    for (const page of pages) {
      const file = page.file;
      if (!file) continue;
      const signature = [file.stat.mtime, thumbnailField, replaceField, this.plugin.settings.attachmentImageDisplay].join("\u0001");
      const cached = this.nodeVisualCache.get(page.path);
      if (cached?.signature === signature) { if (cached.visual) result.set(page.path, cached.visual); continue; }

      if (file.extension !== "md" && GraphIndex.IMAGE_EXTENSIONS.has(file.extension.toLowerCase())) {
        const display = this.plugin.settings.attachmentImageDisplay;
        const visual = display === "label" ? null : {
          mode: display === "image" ? "replace" as const : "thumbnail" as const,
          src: this.app.vault.getResourcePath(file), path: file.path, alt: file.basename,
        };
        this.nodeVisualCache.set(page.path, { signature, visual });
        if (visual) result.set(page.path, visual);
        continue;
      }
      if (file.extension !== "md") { this.nodeVisualCache.set(page.path, { signature, visual: null }); continue; }

      const replacement = this.imageVisualFromValue(frontmatterValue(file, replaceField), file, "replace");
      const thumbnail = replacement ? null : this.imageVisualFromValue(frontmatterValue(file, thumbnailField), file, "thumbnail");
      const visual = replacement ?? thumbnail;
      if (visual) {
        this.nodeVisualCache.set(page.path, { signature, visual });
        result.set(page.path, visual);
        continue;
      }

      const hot = this.fieldCache.get(page.path);
      if (hot && hot.mtime === file.stat.mtime) {
        const inlineReplacement = this.imageVisualFromValue(hot.body.inlineFields[replaceField], file, "replace");
        const inlineThumbnail = inlineReplacement ? null : this.imageVisualFromValue(hot.body.inlineFields[thumbnailField], file, "thumbnail");
        const inlineVisual = inlineReplacement ?? inlineThumbnail;
        this.nodeVisualCache.set(page.path, { signature, visual: inlineVisual });
        if (inlineVisual) result.set(page.path, inlineVisual);
      } else {
        bodyRequests.push({ page, file, signature });
      }
    }

    if (bodyRequests.length) {
      const bodies = await this.indexedDb.getBodies(bodyRequests.map(({ file }) => ({ path: file.path, mtime: file.stat.mtime })));
      for (const { page, file, signature } of bodyRequests) {
        const body = bodies.get(file.path);
        const replacement = body ? this.imageVisualFromValue(body.inlineFields[replaceField], file, "replace") : null;
        const thumbnail = body && !replacement ? this.imageVisualFromValue(body.inlineFields[thumbnailField], file, "thumbnail") : null;
        const visual = replacement ?? thumbnail;
        this.nodeVisualCache.set(page.path, { signature, visual });
        if (visual) result.set(page.path, visual);
      }
    }
    return result;
  }

  setSearchEntryPoints(paths: string[]): boolean {
    const next = [...new Set(paths)];
    if (next.length === this.searchEntryPointPaths.length && next.every((path, index) => path === this.searchEntryPointPaths[index])) return false;
    this.searchEntryPointPaths = next;
    return true;
  }

  /** Whole-vault catalogs used by the filter/lens editor. They are derived once per published
   * semantic or selected-facet revision instead of rescanning every page on each React render/status update. */
  suggestionCatalog(): SuggestionCatalog {
    if (this.suggestionCatalogCache) return this.suggestionCatalogCache;
    const tags = new Set<string>();
    const noteTypes = new Set<string>();
    const folders = new Set<string>();
    for (const page of this.state.pages.values()) {
      for (const tag of page.tags) tags.add(tag);
      if (page.noteType) noteTypes.add(page.noteType);
      const slash = page.path.lastIndexOf("/");
      if (slash > 0) folders.add(page.path.slice(0, slash));
    }
    const sort = (values: Iterable<string>) => [...new Set(values)].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    this.suggestionCatalogCache = {
      tags: sort(tags),
      noteTypes: sort(noteTypes),
      folders: sort(folders),
      properties: sort([...this.state.discoveredFields.values()].map((field) => field.name)),
    };
    return this.suggestionCatalogCache;
  }

  evidenceFrom(sourcePath: string): Array<{ targetPath: string; evidence: RelationEvidence[] }> {
    return this.state.evidence.from(sourcePath);
  }

  evidenceBetween(sourcePath: string, targetPath: string): RelationEvidence[] {
    return this.state.evidence.between(sourcePath, targetPath);
  }

  discoveredFields(): Array<{ normalized: string; name: string; count: number }> {
    return [...this.state.discoveredFields.entries()]
      .map(([normalized, value]) => ({ normalized, ...value }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  unassignedOntologyFields(): Array<{ normalized: string; name: string; count: number }> {
    const h = this.plugin.settings.hierarchy;
    const assigned = new Set([
      ...h.hidden, ...h.parents, ...h.children, ...h.leftFriends, ...h.rightFriends, ...h.previous, ...h.next, ...h.exclusions,
      this.plugin.settings.noteTypeField, this.plugin.settings.primaryTagField,
    ].map((name) => name.toLowerCase().replaceAll(" ", "-").trim()));
    return this.discoveredFields().filter((field) => !assigned.has(field.normalized));
  }

  /** Invalidate in-flight semantic work only when the canonical settings classifier requires it. */
  invalidateSemanticPolicy(): void {
    this.cancelRebuild();
    this.cancelSnapshotHydration?.();
    this.snapshotHydrationRun += 1;
    this.cancelPendingPersistence();
  }

  cancelRebuild(): void {
    this.bodyWarmGeneration += 1;
    this.metadataParser.cancelPending();
    if (!this.building) return;
    this.generation += 1;
    this.rebuildQueued = false;
  }

  /**
   * Prime the durable parsed-body cache before a large iOS cold build.
   *
   * Obsidian's own metadata cache already gives K-Plex the vault tree and ordinary links, but
   * inline ontology/URL parsing still requires Markdown bodies. Reading ten thousand files while
   * simultaneously retaining a complete second graph snapshot is a poor iOS memory pattern. This
   * pass therefore does only I/O + parsing + small transactional IndexedDB checkpoints. The full
   * GraphBuilder then consumes durable hits without re-reading the vault. Interrupted runs resume
   * from the committed body records rather than starting from file zero.
   */
  async prewarmBodyCache(isCurrent: () => boolean = () => true): Promise<boolean> {
    const run = ++this.bodyWarmGeneration;
    const current = () => run === this.bodyWarmGeneration && isCurrent();
    const files = this.app.vault.getMarkdownFiles();
    if (!files.length) return true;

    const storeReady = await this.indexedDb.bodyStoreReady();
    if (!storeReady || !current()) return false;

    const lookupBatchSize = Platform.isIosApp ? 96 : Platform.isMobile ? 160 : 384;
    const readConcurrency = Platform.isIosApp ? 4 : Platform.isMobile ? 4 : 8;
    const readByteBudget = Platform.isIosApp ? 1.5 * 1024 * 1024 : Platform.isMobile ? 3 * 1024 * 1024 : 8 * 1024 * 1024;
    const writeBatchSize = Platform.isIosApp ? 24 : Platform.isMobile ? 64 : 160;
    const pendingWrites: Array<{ path: string; mtime: number; body: ParsedBodyMetadata }> = [];

    const flush = async (): Promise<boolean> => {
      if (!pendingWrites.length) return current();
      const batch = pendingWrites.splice(0, pendingWrites.length);
      return (await this.indexedDb.putBodies(batch)) && current();
    };

    for (let batchStart = 0; batchStart < files.length; batchStart += lookupBatchSize) {
      if (!current()) return false;
      const batch = files.slice(batchStart, batchStart + lookupBatchSize);
      const revisions = new Map(batch.map((file) => [file.path, captureFileRevision(file)] as const));
      const lookupRequests: Array<{ path: string; mtime: number }> = [];
      const needsLookup: TFile[] = [];
      for (const file of batch) {
        const revision = revisions.get(file.path)!;
        const hot = this.fieldCache.get(file.path);
        if (hot?.mtime === revision.mtime) continue;
        needsLookup.push(file);
        lookupRequests.push({ path: file.path, mtime: revision.mtime });
      }

      const durable = await this.indexedDb.getBodies(lookupRequests);
      if (!current()) return false;
      // Prewarm is an optimization, so a file edited during this pass is simply skipped. The
      // authoritative builder will read its latest revision; never cache stale content as current.
      const misses = needsLookup.filter((file) => fileRevisionMatches(file, revisions.get(file.path)!) && !durable.has(file.path));

      const readGroups: TFile[][] = [];
      let group: TFile[] = [];
      let groupBytes = 0;
      for (const file of misses) {
        const size = Math.max(1, revisions.get(file.path)!.size || 0);
        if (group.length && (group.length >= readConcurrency || groupBytes + size > readByteBudget)) {
          readGroups.push(group);
          group = [];
          groupBytes = 0;
        }
        group.push(file);
        groupBytes += size;
        if (group.length >= readConcurrency || groupBytes >= readByteBudget) {
          readGroups.push(group);
          group = [];
          groupBytes = 0;
        }
      }
      if (group.length) readGroups.push(group);

      for (const readGroup of readGroups) {
        if (!current()) return false;
        // Parallelize only native file reads. Parsing remains sequential and low-memory on iOS.
        const contents = await Promise.all(readGroup.map(async (file) => ({
          file,
          revision: revisions.get(file.path)!,
          content: await this.app.vault.read(file),
        })));
        if (!current()) return false;
        for (const { file, revision, content } of contents) {
          if (!fileRevisionMatches(file, revision)) continue;
          let body: ParsedBodyMetadata;
          try {
            body = await this.metadataParser.parse(content);
          } catch (error) {
            if (!current()) return false;
            throw error;
          }
          if (!current()) return false;
          if (!fileRevisionMatches(file, revision)) continue;
          pendingWrites.push({ path: file.path, mtime: revision.mtime, body });
          if (pendingWrites.length >= writeBatchSize && !(await flush())) return false;
        }

        // Extremely large native reads can leave substantial temporary strings behind in WebKit.
        // Yield once for those waves without imposing a timer on every ordinary four-file group.
        const retainedBytes = contents.reduce((sum, item) => sum + item.content.length * 2, 0);
        if (Platform.isIosApp && retainedBytes >= 1024 * 1024) {
          await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
          if (!current()) return false;
        }
      }

      // Give WebKit a real paint/autorelease opportunity between native I/O waves rather than
      // one long chain of micro-yields. This is intentionally longer than setTimeout(0).
      if (Platform.isIosApp) await new Promise<void>((resolve) => window.setTimeout(resolve, 8));
      else if (Platform.isMobile) await new Promise<void>((resolve) => window.setTimeout(resolve, 8));
    }

    return (await flush()) && current();
  }

  /** Stop deferred/full-cache writes when no K-Plex surface is visible. A stale complete snapshot
   * remains safe because the next startup reconciles changed Markdown mtimes incrementally. */
  cancelPendingPersistence(): void {
    if (this.snapshotPersistTimer !== null) {
      window.clearTimeout(this.snapshotPersistTimer);
      this.snapshotPersistTimer = null;
    }
    if (this.orphanCleanupTimer !== null) {
      window.clearTimeout(this.orphanCleanupTimer);
      this.orphanCleanupTimer = null;
    }
    this.snapshotPersistGeneration += 1;
  }

  destroy(): void {
    this.sourceAcquisition.close();
    this.diagnosticsClosed = true;
    this.presentationRun += 1;
    this.presentationListeners.clear();
    this.generation += 1;
    this.bodyWarmGeneration += 1;
    this.cancelSnapshotHydration?.();
    this.snapshotHydrationRun += 1;
    this.snapshotPersistGeneration += 1;
    this.snapshotHydrationTask = null;
    if (this.snapshotPersistTimer !== null) window.clearTimeout(this.snapshotPersistTimer);
    if (this.orphanCleanupTimer !== null) window.clearTimeout(this.orphanCleanupTimer);
    this.searchCandidateCache.clear();
    this.searchEntryByPath.clear();
    this.semanticFingerprints.clear();
    this.suggestionCatalogCache = null;
    this.titleCache.clear();
    this.listeners.clear();
    this.indexedDb.close();
    this.metadataParser.destroy();
  }

  private snapshotPath(): string | null {
    const dir = this.plugin.manifest?.dir;
    return dir ? `${dir}/kplex-index-snapshot-v1.json` : null;
  }

  private snapshotManifestPath(): string | null {
    const dir = this.plugin.manifest?.dir;
    return dir ? `${dir}/kplex-index-snapshot-v2.json` : null;
  }

  private snapshotChunkPath(generation: string, kind: "pages" | "evidence", index: number): string | null {
    const dir = this.plugin.manifest?.dir;
    return dir ? `${dir}/kplex-index-${generation}-${kind}-${String(index).padStart(4, "0")}.json` : null;
  }

  private async yieldSnapshotWork(): Promise<void> {
    if (!Platform.isMobile) return;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }

  private publishRestoredState(
    next: ReturnType<typeof createGraphState>,
    preparedSearch: PreparedSearchIndex | null = null,
    keepExistingSearch = false,
  ): void {
    this.state = next;
    this.publicationRevision += 1;
    this.titleCache.clear();
    this.suggestionCatalogCache = null;
    this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
    if (preparedSearch) this.installSearchIndex(preparedSearch);
    else if (!keepExistingSearch) this.rebuildSearchIndex();
    this.emit();
  }

  private installSearchIndex(prepared: PreparedSearchIndex): void {
    this.searchCandidateCache.clear();
    this.searchEntries = prepared.entries;
    this.searchEntryByPath = prepared.byPath;
  }

  /** Stage search against a proposed presentation policy without modifying published pages/caches. */
  private async prepareSearchIndex(
    state: ReturnType<typeof createGraphState>,
    isCurrent: () => boolean,
    onProgress?: () => void,
    settings?: KplexSettings,
    facets?: PreparedGraphPresentation | null,
  ): Promise<PreparedSearchIndex | null> {
    const entries: SearchEntry[] = [];
    const byPath = new Map<string, SearchEntry>();
    const budgetMs = Platform.isIosApp ? 5 : Platform.isMobile ? 7 : 10;
    let sliceStartedAt = Date.now();
    let processed = 0;

    for (const page of state.pages.values()) {
      if (!isCurrent()) return null;
      const entry = this.makeSearchEntry(page, settings, facets?.facets.get(page)?.name);
      entries.push(entry);
      byPath.set(page.path, entry);
      processed += 1;

      if ((processed & 255) === 0) {
        onProgress?.();
        if (Date.now() - sliceStartedAt >= budgetMs) {
          await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
          if (!isCurrent()) return null;
          sliceStartedAt = Date.now();
        }
      }
    }

    return { entries, byPath };
  }

  /** Publish the bounded saved neighborhood only after current facets/search pass the restore fence. */
  private async publishSnapshotPreview(meta: IndexedDbSnapshotMeta, seedPaths: readonly string[], isCurrent: () => boolean): Promise<boolean> {
    if (meta.schema < 2) return false;
    const seeds = [...new Set([
      ...seedPaths,
      this.plugin.settings.lastActivePath,
      ...this.plugin.settings.pinnedNodes,
    ].filter((path): path is string => typeof path === "string" && path.length > 0))];
    if (!seeds.length) {
      return false;
    }

    const savedByPath = new Map<string, PersistedPage>();
    let frontier = [...(await this.indexedDb.getPages(meta.generation, seeds)).values()];
    if (!isCurrent()) return false;
    for (const page of frontier) savedByPath.set(page.path, page);
    if (!frontier.length) {
      return false;
    }

    // One relation hop is enough for the central note and its direct neighbours. Keeping the startup
    // preview to that first hop avoids a second targeted IndexedDB fetch delaying first paint;
    // the complete graph continues hydrating immediately in the background.
    const maxItems = Math.max(8, this.plugin.settings.maxItemCount);
    const previewLimit = Platform.isMobile ? Math.max(120, Math.min(480, maxItems * 10)) : Math.max(240, Math.min(900, maxItems * 16));
    for (let depth = 0; depth < 1 && frontier.length && savedByPath.size < previewLimit; depth += 1) {
      const wanted: string[] = [];
      const seenWanted = new Set<string>();
      for (const page of frontier) {
        for (const relation of page.relations ?? []) {
          if (savedByPath.has(relation.targetPath) || seenWanted.has(relation.targetPath)) continue;
          seenWanted.add(relation.targetPath);
          wanted.push(relation.targetPath);
          if (savedByPath.size + wanted.length >= previewLimit) break;
        }
        if (savedByPath.size + wanted.length >= previewLimit) break;
      }
      if (!wanted.length) break;
      const fetched = await this.indexedDb.getPages(meta.generation, wanted);
      if (!isCurrent()) return false;
      frontier = [...fetched.values()];
      for (const page of frontier) savedByPath.set(page.path, page);
    }

    const next = createGraphState();
    for (const saved of savedByPath.values()) addPersistedPageToState(next, saved, this.app);
    for (const saved of savedByPath.values()) hydratePersistedPageRelations(next, saved);
    next.discoveredFields = new Map(meta.discoveredFields);
    // Current presentation and search are prepared before the targeted preview becomes visible.
    // Attribute this newly awaited work to the existing search watchdog phase, not the page fetch.
    const run = this.snapshotHydrationRun;
    this.setSnapshotHydrationPhase(run, "preview-search");
    const prepared = await this.preparePresentationPublication(next, isCurrent,
      () => this.touchSnapshotHydrationProgress(run));
    if (!prepared || !isCurrent() || !prepared.facets.isCurrent()) return false;
    this.acceptPresentation(prepared);
    this.fullSnapshotHydrated = false;
    this.previewSnapshotPublished = true;
    this.restoredPatchPlanAvailable = false;
    this.publishRestoredState(next, prepared.search);
    return true;
  }

  /** Hydrate a candidate privately, adapt its facade and retain the existing reconciliation plan. */
  private async restoreFullIndexedDbSnapshot(
    meta: IndexedDbSnapshotMeta,
    fresh: boolean,
    run: number,
    inventory: VaultInventory,
    parentCurrent: () => boolean,
    upgradePaths: ReadonlySet<string> = new Set(),
  ): Promise<{ restored: boolean; fresh: boolean; createdAt: number | null }> {
    const isCurrent = () => run === this.snapshotHydrationRun && parentCurrent();
    const next = createGraphState();
    const persistedPhysicalPaths = new Set<string>();
    const modifiedMarkdownPaths = new Set<string>(upgradePaths);
    const missingFileBindings = new Set<string>();
    const restoredFingerprints = new Map<string, string>();
    // Old schema-2 desktop snapshots use one slow page cursor. Retain those decoded records so we
    // do not pay the same cursor cost twice. Chunked snapshots are cheap to stream a second time,
    // so avoid retaining 100k+ duplicate serialized page objects in memory.
    const retainedPages: PersistedPage[] | null = !Platform.isMobile && !this.indexedDb.snapshotUsesChunks(meta) ? [] : null;

    this.setSnapshotHydrationPhase(run, "pages");
    const pagesOk = await this.indexedDb.iterateSnapshotPages(meta, (page) => {
      if (!isCurrent()) return;
      this.noteSnapshotHydrationProgress(run, "pages");
      retainedPages?.push(page);
      addPersistedPageToState(next, page, this.app);
      if (page.semanticSignature) restoredFingerprints.set(page.path, page.semanticSignature);
      if (page.filePath) {
        persistedPhysicalPaths.add(page.filePath);
        const rebound = next.pages.get(page.path)?.file;
        if (rebound) {
          if (rebound.extension === "md" && typeof page.mtime === "number" && rebound.stat.mtime !== page.mtime) modifiedMarkdownPaths.add(rebound.path);
        } else missingFileBindings.add(page.path);
      }
    }, isCurrent, (reason) => {
      if (isCurrent()) this.recordIndexDiagnostic("restore", `${meta.key}-pages-${reason}`);
    });
    if (!pagesOk || !isCurrent()) return { restored: false, fresh: false, createdAt: meta.createdAt };

    if (missingFileBindings.size) {
      this.setSnapshotHydrationPhase(run, "file-rebind");
      const delays = Platform.isMobile ? [120, 320, 700] : [80];
      for (const delay of delays) {
        if (!missingFileBindings.size || !isCurrent()) break;
        await new Promise<void>((resolve) => window.setTimeout(resolve, delay));
        if (!isCurrent()) return { restored: false, fresh: false, createdAt: meta.createdAt };
        for (const path of [...missingFileBindings]) {
          const page = next.pages.get(path);
          const file = this.app.vault.getAbstractFileByPath(path);
          if (!page || !(file instanceof TFile)) continue;
          page.file = file;
          if (file.extension === "md" && typeof page.mtime === "number" && file.stat.mtime !== page.mtime) modifiedMarkdownPaths.add(file.path);
          missingFileBindings.delete(path);
        }
      }
    }

    const currentPhysicalPaths = new Set(inventory.filesByPath.keys());
    let structuralMismatch = currentPhysicalPaths.size !== persistedPhysicalPaths.size;
    if (!structuralMismatch) {
      for (const path of currentPhysicalPaths) {
        if (!persistedPhysicalPaths.has(path)) { structuralMismatch = true; break; }
      }
    }

    const addedPaths = [...currentPhysicalPaths].filter((path) => !persistedPhysicalPaths.has(path));
    const removedPaths = [...persistedPhysicalPaths].filter((path) => !currentPhysicalPaths.has(path));
    const savedFolders = new Set([...next.pages.values()].filter((page) => page.isFolder)
      .map((page) => page.path === "folder:/" ? "" : page.path.slice("folder:".length)));
    const foldersMatch = savedFolders.size === inventory.folderPaths.size &&
      [...inventory.folderPaths].every((path) => savedFolders.has(path));
    // A completed graph can absorb note-only additions and deletions. Renames are deliberately
    // excluded: inbound link resolution can change even when the declaring notes did not change.
    const markdownDelta = foldersMatch && !(addedPaths.length && removedPaths.length) &&
      addedPaths.every((path) => inventory.filesByPath.get(path)?.extension === "md") &&
      removedPaths.every((path) => path.toLowerCase().endsWith(".md")) &&
      [...missingFileBindings].every((path) => removedPaths.includes(path));
    const recoverableStructuralDelta = structuralMismatch && markdownDelta;

    // A bounded startup preview may already be visible, but never promote/retain a known-invalid
    // full snapshot. Hydrating its relations + evidence only to immediately build a replacement
    // doubles peak memory on iOS and delays the authoritative cold build on every platform.
    if ((structuralMismatch && !recoverableStructuralDelta) ||
      (missingFileBindings.size > 0 && !recoverableStructuralDelta) || !foldersMatch) {
      this.recordIndexDiagnostic("restore", !foldersMatch ? "folder-structure-changed" :
        addedPaths.length && removedPaths.length ? "possible-file-rename" :
          addedPaths.some((path) => inventory.filesByPath.get(path)?.extension !== "md") ? "non-markdown-file-added" :
            missingFileBindings.size ? "missing-file-binding" : "unsupported-physical-change",
      { added: addedPaths.length, removed: removedPaths.length, modified: modifiedMarkdownPaths.size });
      this.fullSnapshotHydrated = false;
      this.fullSnapshotFresh = false;
      this.restoredModifiedMarkdownPaths = [];
      this.restoredStructuralMismatch = true;
      this.restoredPatchPlanAvailable = false;
      return { restored: false, fresh: false, createdAt: meta.createdAt };
    }

    // Persisted page records already carry resolved neighbour relations. Hydrate those before the
    // much larger evidence store so a complete navigable graph can be published as soon as the
    // page snapshot is available. Evidence/provenance continues loading in the background.
    let relationsHydrated = meta.schema >= 2;
    if (relationsHydrated) {
      this.setSnapshotHydrationPhase(run, "relations");
      let relationsComplete = true;
      if (retainedPages) {
        for (const saved of retainedPages) {
          this.noteSnapshotHydrationProgress(run, "relations");
          if (!hydratePersistedPageRelations(next, saved)) relationsComplete = false;
        }
      } else {
        const relationPassOk = await this.indexedDb.iterateSnapshotPages(meta, (saved) => {
          if (!isCurrent()) return;
          this.noteSnapshotHydrationProgress(run, "relations");
          if (!hydratePersistedPageRelations(next, saved)) relationsComplete = false;
        }, isCurrent, (reason) => {
          if (isCurrent()) this.recordIndexDiagnostic("restore", `${meta.key}-relations-${reason}`);
        });
        relationsHydrated = relationPassOk && relationsComplete;
      }
      if (retainedPages) relationsHydrated = relationsComplete;
    }
    if (!isCurrent()) return { restored: false, fresh: false, createdAt: meta.createdAt };

    if (relationsHydrated) {
      // Publish a page-only state with complete resolved relations and empty provenance. This is a
      // deliberate progressive-hydration boundary: navigation/search can work immediately while
      // the private `next` state continues loading evidence. Do not expose partially-loaded
      // evidence itself.
      next.discoveredFields = new Map(meta.discoveredFields);
      const pagePreview = createGraphState();
      pagePreview.pages = next.pages;
      pagePreview.lowercasePathMap = next.lowercasePathMap;
      pagePreview.discoveredFields = next.discoveredFields;
      this.fullSnapshotHydrated = false;
      this.fullSnapshotFresh = false;
      this.previewSnapshotPublished = true;
      this.restoredPatchPlanAvailable = false;
      this.setSnapshotHydrationPhase(run, "preview-search");
      const prepared = await this.preparePresentationPublication(pagePreview, isCurrent, () => this.touchSnapshotHydrationProgress(run));
      if (!prepared || !isCurrent() || !prepared.facets.isCurrent()) return { restored: false, fresh: false, createdAt: meta.createdAt };
      this.acceptPresentation(prepared);
      this.publishRestoredState(pagePreview, prepared.search);
    }

    this.setSnapshotHydrationPhase(run, "evidence");
    const evidenceOk = await this.indexedDb.iterateSnapshotEvidence(meta, (item) => {
      if (!isCurrent()) return;
      this.noteSnapshotHydrationProgress(run, "evidence");
      addPersistedEvidenceToState(next, item);
    }, isCurrent, (reason) => {
      if (isCurrent()) this.recordIndexDiagnostic("restore", `${meta.key}-evidence-${reason}`);
    });
    if (!evidenceOk || !isCurrent()) return { restored: false, fresh: false, createdAt: meta.createdAt };
    next.discoveredFields = new Map(meta.discoveredFields);

    // Schema-1/early schema-2 snapshots without cached relations still need the authoritative
    // resolver after evidence has loaded. New schema-3 snapshots take the fast relation path above.
    if (!relationsHydrated) {
      this.setSnapshotHydrationPhase(run, "resolve");
      const resolved = await finalizeHydratedGraphStateCooperative(
        next,
        isCurrent,
        Platform.isIosApp ? 96 : Platform.isMobile ? 160 : 400,
        () => this.touchSnapshotHydrationProgress(run),
      );
      if (!resolved) return { restored: false, fresh: false, createdAt: meta.createdAt };
    }
    if (!isCurrent()) return { restored: false, fresh: false, createdAt: meta.createdAt };

    const isCheckpoint = meta.key === "checkpoint";
    if (isCheckpoint && meta.completedMarkdownPaths?.some((path) => !restoredFingerprints.has(path))) {
      return { restored: false, fresh: false, createdAt: meta.createdAt };
    }
    if (isCheckpoint) {
      for (const path of modifiedMarkdownPaths) restoredFingerprints.delete(path);
      for (const path of removedPaths) restoredFingerprints.delete(path);
    }
    const authoritativeFresh = fresh && !structuralMismatch && missingFileBindings.size === 0;
    // The earlier page-only publication uses this same `next.pages` map. Evidence hydration does
    // not alter searchable page metadata, so avoid allocating/sorting the 100k+ search index a
    // second time when promoting the fully hydrated state.
    this.setSnapshotHydrationPhase(run, "promote");
    if (relationsHydrated) {
      if (classifySettingsChange(captureSettingsPolicy(this.presentationSettings), captureSettingsPolicy(this.plugin.settings)).render) {
        await this.refreshPresentationSettings();
        if (!isCurrent()) return { restored: false, fresh: false, createdAt: meta.createdAt };
      }
      this.publishRestoredState(next, null, true);
    } else {
      this.setSnapshotHydrationPhase(run, "authoritative-search");
      const prepared = await this.preparePresentationPublication(next, isCurrent, () => this.touchSnapshotHydrationProgress(run));
      if (!prepared || !isCurrent() || !prepared.facets.isCurrent()) return { restored: false, fresh: false, createdAt: meta.createdAt };
      this.acceptPresentation(prepared);
      this.publishRestoredState(next, prepared.search);
    }
    this.fullSnapshotHydrated = !isCheckpoint;
    if (!isCheckpoint) this.sourceAcquisition.enableInventory();
    this.fullSnapshotFresh = authoritativeFresh;
    this.finishSnapshotHydrationDiagnostics(run, "complete");
    this.semanticFingerprints = restoredFingerprints;
    this.previewSnapshotPublished = false;
    this.restoredModifiedMarkdownPaths = [...modifiedMarkdownPaths];
    this.restoredAddedMarkdownPaths = recoverableStructuralDelta ? addedPaths : [];
    this.restoredRemovedMarkdownPaths = recoverableStructuralDelta ? removedPaths : [];
    this.restoredStructuralMismatch = false;
    this.restoredPatchPlanAvailable = !isCheckpoint && !this.restoredStructuralMismatch;
    this.restoredVaultSignature = inventory.signature;
    this.resumableCheckpointPaths = isCheckpoint ? new Set(meta.completedMarkdownPaths?.filter((path) =>
      inventory.filesByPath.has(path) && !modifiedMarkdownPaths.has(path))) : null;
    this.recordIndexDiagnostic("restore", isCheckpoint ? "checkpoint-restored" :
      recoverableStructuralDelta ? "complete-markdown-delta" :
        modifiedMarkdownPaths.size ? "complete-modified-markdown" : "complete-restored",
    { added: this.restoredAddedMarkdownPaths.length, removed: this.restoredRemovedMarkdownPaths.length,
      modified: modifiedMarkdownPaths.size });

    if (!isCheckpoint && !relationsHydrated) this.scheduleSnapshotPersist(5000);
    else if (!this.indexedDb.snapshotUsesChunks(meta) && !Platform.isIosApp) {
      // One background migration turns the old 356k-record cursor restore into a few hundred
      // chunk reads on the next launch. Delay it so first paint and Obsidian startup stay quiet.
      this.scheduleSnapshotPersist(8000);
    }
    // Previous builds could leave incomplete generations behind when a snapshot write was
    // cancelled by another edit. Discover/clean those only after the active graph is usable.
    this.scheduleOrphanCleanup(meta.generation);

    return { restored: true, fresh: authoritativeFresh, createdAt: meta.createdAt };
  }

  /** Compare named semantic policy, preserve candidate fallback and scope any retired-policy repair. */
  private async restoreIndexedDbSnapshot(seedPaths: readonly string[] = []): Promise<{ restored: boolean; fresh: boolean; createdAt: number | null; partial?: boolean }> {
    this.cancelSnapshotHydration?.();
    const run = ++this.snapshotHydrationRun;
    const semanticPolicy = computeIndexSettingsSignature(this.plugin.settings);
    const isCurrent = () => run === this.snapshotHydrationRun && !this.diagnosticsClosed &&
      semanticPolicy === computeIndexSettingsSignature(this.plugin.settings);
    this.beginSnapshotHydrationDiagnostics(run);
    this.fullSnapshotHydrated = false;
    this.fullSnapshotFresh = false;
    this.restoredPatchPlanAvailable = false;
    this.restoredAddedMarkdownPaths = [];
    this.restoredRemovedMarkdownPaths = [];
    this.restoredVaultSignature = null;
    this.restoreInventorySourceRevision = null;
    this.resumableCheckpointPaths = null;
    let createdAt: number | null = null;
    type RestoreResult = { restored: boolean; fresh: boolean; createdAt: number | null; partial?: boolean };
    let reportPreview!: (result: RestoreResult) => void;
    const preview = new Promise<RestoreResult>((resolve) => { reportPreview = resolve; });
    // Guard metadata and targeted preview reads too: startup must never wait indefinitely before
    // the public full-hydration task has even been installed.
    const restoreTask = (async () => {
      const [catalog, previousDiagnostics] = await Promise.all([
        this.indexedDb.readSnapshotCatalog(), this.indexedDb.readIndexDiagnostics(),
      ]);
      if (!isCurrent()) return { restored: false, fresh: false, createdAt };
      this.rememberSnapshotCatalog(catalog);
      if (this.indexDiagnostics.length === 0) this.indexDiagnostics = previousDiagnostics;
      const { active, checkpoint } = catalog;
      const compatibility = new Map([active, checkpoint].filter((meta): meta is IndexedDbSnapshotMeta => Boolean(meta))
        .map((meta) => [meta, compareIndexSettingsSignature(meta.settingsSignature, this.plugin.settings)] as const));
      const usable = (meta: IndexedDbSnapshotMeta | null): boolean => Boolean(meta && compatibility.get(meta)?.compatible);
      if (!usable(active) && !usable(checkpoint)) {
        createdAt = active?.createdAt ?? checkpoint?.createdAt ?? null;
        const decision = (active && compatibility.get(active)) || (checkpoint && compatibility.get(checkpoint));
        this.recordIndexDiagnostic("restore", !catalog.available ? "storage-unavailable" :
          catalog.invalidActive || catalog.invalidCheckpoint ? "invalid-snapshot-metadata" :
            decision ? decision.reason : "no-complete-snapshot", { changedKeys: [...(decision?.changedKeys ?? [])] });
        return { restored: false, fresh: false, createdAt };
      }
      const inventory = captureVaultInventory(this.app);
      this.restoreInventorySourceRevision = this.plugin.getIndexSourceRevision();
      const vaultSignature = inventory.signature;
      // Preserve active/checkpoint freshness preference and corruption fallback after classification.
      const usableCheckpoint = usable(checkpoint) && (!usable(active) ||
        (checkpoint?.vaultSignature === vaultSignature && active?.vaultSignature !== vaultSignature));
      const candidates = (usableCheckpoint ? [checkpoint, active] : [active, checkpoint])
        .filter((meta): meta is IndexedDbSnapshotMeta => Boolean(meta && usable(meta)));
      for (const meta of candidates) {
        if (!isCurrent()) return { restored: false, fresh: false, createdAt };
        createdAt = meta.createdAt;
        const decision = compatibility.get(meta)!;
        if (decision.reason !== "compatible") this.recordIndexDiagnostic("restore", decision.reason, { changedKeys: [...decision.changedKeys] });
        this.activeSnapshotGeneration = meta.generation;
        const upgradePaths = decision.retiredFilepath ? await planRetiredExclusionReconciliation(
          decision.retiredFilepath, this.plugin.settings, this.app, this.fieldCache, this.indexedDb,
          isCurrent, () => this.plugin.getIndexSourceRevision(),
        ) : new Set<string>();
        if (!upgradePaths || !isCurrent()) return { restored: false, fresh: false, createdAt };
        if (decision.retiredFilepath) this.recordIndexDiagnostic("restore", upgradePaths.size ?
          "retired-policy-reconcile" : "retired-policy-no-affected-sources", { modified: upgradePaths.size });
        const fresh = meta.key === "active" && meta.vaultSignature === vaultSignature && upgradePaths.size === 0;
        this.recordIndexDiagnostic("restore", meta.key === "checkpoint" ? "checkpoint-selected" :
          fresh ? "complete-snapshot-fresh" : "complete-snapshot-stale");
        this.setSnapshotHydrationPhase(run, "preview");
        const previewPublished = await this.publishSnapshotPreview(meta, seedPaths, isCurrent);
        if (!isCurrent()) return { restored: false, fresh: false, createdAt };
        if (previewPublished) reportPreview({ restored: true, fresh, createdAt, partial: true });
        const result = await this.restoreFullIndexedDbSnapshot(meta, fresh, run, inventory, isCurrent, upgradePaths);
        if (result.restored && decision.presentationChanged) this.recordIndexDiagnostic("restore", "presentation-settings-adapted",
          { changedKeys: [...decision.changedKeys] });
        if (result.restored || !isCurrent()) return result;
      }
      return { restored: false, fresh: false, createdAt };
    })().then((result) => {
      if (!result.restored) {
        this.finishSnapshotHydrationDiagnostics(run, "failed");
        const lastReason = this.indexDiagnostics[this.indexDiagnostics.length - 1]?.reason;
        if (lastReason === "checkpoint-selected" || lastReason === "complete-snapshot-fresh" ||
          lastReason === "complete-snapshot-stale") this.recordIndexDiagnostic("restore", "hydration-incomplete");
      }
      return result;
    }).catch(() => {
      this.finishSnapshotHydrationDiagnostics(run, "failed");
      this.recordIndexDiagnostic("restore", "restore-exception");
      return { restored: false, fresh: false, createdAt };
    });
    const task = this.watchSnapshotHydration(restoreTask, run, () => createdAt);
    this.snapshotHydrationTask = task;
    void task.then(() => {
      if (this.snapshotHydrationTask !== task) return;
      this.snapshotHydrationTask = null;
      // Status consumers distinguish cache hydration from later reconciliation/indexing. Publish
      // that phase boundary even when the graph itself did not change at task completion.
      this.emit();
    });
    return Promise.race([preview, task]);
  }

  private beginSnapshotHydrationDiagnostics(run: number): void {
    const now = Date.now();
    this.snapshotHydrationDiagnostics = {
      run, phase: "metadata", lastActivePhase: "metadata", startedAt: now, phaseStartedAt: now, lastProgressAt: now,
      pages: 0, relations: 0, evidence: 0, outcome: "running",
    };
  }

  private isSnapshotHydrationRunning(run: number): boolean {
    return this.snapshotHydrationRun === run && this.snapshotHydrationDiagnostics.run === run &&
      this.snapshotHydrationDiagnostics.outcome === "running";
  }

  private setSnapshotHydrationPhase(run: number, phase: SnapshotHydrationPhase): void {
    if (!this.isSnapshotHydrationRunning(run)) return;
    const now = Date.now();
    this.snapshotHydrationDiagnostics.phase = phase;
    this.snapshotHydrationDiagnostics.lastActivePhase = phase;
    this.snapshotHydrationDiagnostics.phaseStartedAt = now;
    this.snapshotHydrationDiagnostics.lastProgressAt = now;
  }

  private touchSnapshotHydrationProgress(run: number): void {
    if (this.isSnapshotHydrationRunning(run)) this.snapshotHydrationDiagnostics.lastProgressAt = Date.now();
  }

  private noteSnapshotHydrationProgress(run: number, kind: "pages" | "relations" | "evidence"): void {
    if (!this.isSnapshotHydrationRunning(run)) return;
    this.snapshotHydrationDiagnostics[kind] += 1;
    // Sample time reads, not counters. Search/resolver loops also signal bounded real progress.
    if ((this.snapshotHydrationDiagnostics[kind] & 255) === 0) this.touchSnapshotHydrationProgress(run);
  }

  private finishSnapshotHydrationDiagnostics(
    run: number,
    outcome: Exclude<SnapshotHydrationDiagnostics["outcome"], "idle" | "running">,
  ): void {
    if (!this.isSnapshotHydrationRunning(run)) return;
    this.snapshotHydrationDiagnostics.phase = outcome;
    this.snapshotHydrationDiagnostics.phaseStartedAt = Date.now();
    // Preserve the actual last work timestamp and phase for diagnosing stalls. Terminal outcomes
    // are immutable: a late callback/rejection from abandoned work cannot rewrite them.
    this.snapshotHydrationDiagnostics.outcome = outcome;
  }

  getSnapshotHydrationDiagnostics(): SnapshotHydrationDiagnostics {
    return { ...this.snapshotHydrationDiagnostics };
  }

  /** Inspect recent local index decisions without exposing vault paths or note content. */
  getIndexDiagnostics(): IndexDiagnosticEntry[] {
    return sanitizeIndexDiagnostics(this.indexDiagnostics);
  }

  /** Safe, synchronous snapshot facts for a user-shared report. Clipboard writes need the user gesture. */
  getSavedSnapshotSummary(): {
    storage: "unchecked" | "available" | "unavailable";
    invalidActive: boolean;
    active: { createdAt: number; schema: number } | null;
    checkpoint: { createdAt: number; schema: number; completedMarkdownFiles: number } | null;
  } {
    return {
      ...this.savedSnapshotSummary,
      active: this.savedSnapshotSummary.active && { ...this.savedSnapshotSummary.active },
      checkpoint: this.savedSnapshotSummary.checkpoint && { ...this.savedSnapshotSummary.checkpoint },
    };
  }

  private rememberSnapshotCatalog(catalog: Awaited<ReturnType<KplexIndexedDbCache["readSnapshotCatalog"]>>): void {
    this.savedSnapshotSummary = {
      storage: catalog.available ? "available" : "unavailable",
      invalidActive: catalog.invalidActive,
      active: catalog.active ? { createdAt: catalog.active.createdAt, schema: catalog.active.schema } : null,
      checkpoint: catalog.checkpoint ? {
        createdAt: catalog.checkpoint.createdAt,
        schema: catalog.checkpoint.schema,
        completedMarkdownFiles: catalog.checkpoint.completedMarkdownPaths?.length ?? 0,
      } : null,
    };
  }

  /** Record the coordinator's decision without retaining vault paths or note content. */
  noteBuildDecision(kind: "cold-progressive" | "full-rebuild" | "per-file-patch", reason: string, modified = 0): void {
    this.recordIndexDiagnostic("build", `${kind}:${reason}`, { modified });
  }

  /** Retain only bounded sanitized decisions, including built-in changed-key names. */
  private recordIndexDiagnostic(
    stage: IndexDiagnosticEntry["stage"],
    reason: string,
    counts: Pick<IndexDiagnosticEntry, "added" | "removed" | "modified" | "completedMarkdownFiles" | "durationMs" | "changedKeys"> = {},
  ): void {
    this.indexDiagnostics = sanitizeIndexDiagnostics([...this.indexDiagnostics, { at: Date.now(), stage, reason, ...counts }]);
    const entries = this.getIndexDiagnostics();
    this.diagnosticWriteTask = this.diagnosticWriteTask.then(() =>
      this.diagnosticsClosed ? undefined : this.indexedDb.writeIndexDiagnostics(entries));
  }

  private watchSnapshotHydration(
    task: Promise<{ restored: boolean; fresh: boolean; createdAt: number | null }>,
    run: number,
    createdAt: () => number | null,
  ): Promise<{ restored: boolean; fresh: boolean; createdAt: number | null }> {
    let timer: number | null = null;
    let cancel!: () => void;
    const stalled = new Promise<{ restored: boolean; fresh: boolean; createdAt: number | null }>((resolve) => {
      const stop = (outcome: "cancelled" | "timed-out"): void => {
        if (timer !== null) window.clearTimeout(timer);
        timer = null;
        this.finishSnapshotHydrationDiagnostics(run, outcome);
        if (outcome === "timed-out") this.recordIndexDiagnostic("restore", "hydration-stalled");
        if (run === this.snapshotHydrationRun) this.snapshotHydrationRun += 1;
        resolve({ restored: false, fresh: false, createdAt: createdAt() });
      };
      cancel = () => stop("cancelled");
      const check = (): void => {
        if (run !== this.snapshotHydrationRun) { stop("cancelled"); return; }
        const lastProgressAt = this.snapshotHydrationDiagnostics.lastProgressAt ?? Date.now();
        if (Date.now() - lastProgressAt >= SNAPSHOT_HYDRATION_STALL_MS) { stop("timed-out"); return; }
        timer = window.setTimeout(check, SNAPSHOT_HYDRATION_WATCHDOG_POLL_MS);
      };
      timer = window.setTimeout(check, SNAPSHOT_HYDRATION_WATCHDOG_POLL_MS);
    });
    this.cancelSnapshotHydration = cancel;
    return Promise.race([task, stalled]).finally(() => {
      if (timer !== null) window.clearTimeout(timer);
      if (this.cancelSnapshotHydration === cancel) this.cancelSnapshotHydration = null;
    });
  }

  hasPendingSnapshotHydration(): boolean {
    return this.snapshotHydrationTask !== null;
  }

  isFullSnapshotHydrated(): boolean {
    return this.fullSnapshotHydrated;
  }

  /** A validated partial generation can resume even after its hydration task has settled. */
  hasRestoredCheckpoint(): boolean {
    return this.resumableCheckpointPaths !== null;
  }

  async waitForSnapshotHydration(): Promise<{ restored: boolean; fresh: boolean; createdAt: number | null }> {
    const task = this.snapshotHydrationTask;
    if (!task) return { restored: this.fullSnapshotHydrated, fresh: this.fullSnapshotFresh, createdAt: null };
    return task;
  }

  hasIncrementalRestorePatch(): boolean {
    return this.restoredPatchPlanAvailable && !this.restoredStructuralMismatch;
  }

  /** Source revision covered by the physical inventory captured during restore. */
  getRestoreInventorySourceRevision(): number | null {
    return this.restoreInventorySourceRevision;
  }

  /**
   * Apply one prepared file commit and refresh every repository-owned derived view synchronously.
   *
   * @param commit Describes paths affected by the already-prepared source transaction.
   * @param publishPreparedState Synchronous one-shot callback that makes the staged graph/fingerprint
   * state visible. It must be invoked before search/cache invalidation and must never be retained.
   */
  private commitPreparedFile(commit: PatchFileCommit, publishPreparedState: () => void): void {
    publishPreparedState();
    this.publicationRevision += 1;
    for (const path of commit.touchedPagePaths) {
      const page = this.state.pages.get(path);
      if (!page) continue;
      if (path !== commit.sourcePath) {
        // A URL-heavy source may touch thousands of targets. Their type/style values were not
        // recollected: retain those prepared facets without allocating a per-target staging object.
        if (page.isTag) page.name = tagDisplayName(page.path, this.presentationSettings.showFullTagName);
        page.maxLabelLength = this.presentationSettings.baseNodeStyle.maxLabelLength ?? 30;
        continue;
      }
      const hot = this.fieldCache.get(path);
      const body = hot?.mtime === page.file?.stat.mtime ? hot?.body : undefined;
      const { status, ...facets } = presentationFacetsForPage(page, this.presentationSettings, this.app, body);
      Object.assign(page, facets);
      if (status) this.presentationStatuses.set(page, { noteType: "pending", styleTags: "pending", ...status });
    }
    this.invalidatePatchedPages(commit.touchedPagePaths);
    this.patchSearchIndex(commit.touchedPagePaths);
    this.suggestionCatalogCache = null;
  }

  /** Complete one normal incremental publication synchronously and notify graph subscribers only
   * when graph topology changed. The publisher never awaits or retains the prepared-state callback. */
  private publishIncrementalFile: PatchFilePublisher = (commit: PatchFileCommit, publishPreparedState: () => void): void => {
    this.commitPreparedFile(commit, publishPreparedState);
    if (commit.semanticChanged) this.emit();
    else this.emitPresentation();
  };

  /** Patch modified Markdown sources into a restored snapshot without rebuilding the whole vault. */
  async reconcileRestoredSnapshot(): Promise<{ reconciled: boolean; patched: number }> {
    if (!this.restoredPatchPlanAvailable || this.restoredStructuralMismatch) return { reconciled: false, patched: 0 };
    const paths = [...new Set([...this.restoredModifiedMarkdownPaths, ...this.restoredAddedMarkdownPaths])];
    if (!paths.length && !this.restoredRemovedMarkdownPaths.length) return { reconciled: true, patched: 0 };
    if (this.building) return { reconciled: false, patched: 0 };

    const files: TFile[] = [];
    for (const path of paths) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile) || file.extension !== "md") return { reconciled: false, patched: 0 };
      files.push(file);
    }
    if (this.restoredRemovedMarkdownPaths.some((path) => this.app.vault.getFileByPath(path))) {
      return { reconciled: false, patched: 0 };
    }

    this.building = true;
    const run = ++this.generation;
    try {
      for (const path of this.restoredRemovedMarkdownPaths) this.dematerializeFile(path);
      for (const path of this.restoredAddedMarkdownPaths) {
        const file = this.app.vault.getFileByPath(path);
        if (!file || file.extension !== "md") return { reconciled: false, patched: 0 };
        this.insertCreatedFile(file);
      }
      this.sourceAcquisition.start();
      const builder = new GraphBuilder(
        this.plugin,
        this.app,
        this.fieldCache,
        this.metadataParser,
        this.indexedDb,
        () => run === this.generation,
        this.semanticFingerprints,
        this.sourceAcquisition,
      );
      const result = await builder.patchMarkdownFiles(this.state, files, {
        useDurableCache: true,
        awaitBodyWrite: false,
        publishFileCommit: this.publishIncrementalFile,
      });
      if (!result.ok || run !== this.generation) {
        this.recordIndexDiagnostic("reconcile", "source-changed-during-reconcile", {
          added: this.restoredAddedMarkdownPaths.length,
          removed: this.restoredRemovedMarkdownPaths.length,
          modified: this.restoredModifiedMarkdownPaths.length,
        });
        return { reconciled: false, patched: 0 };
      }
      this.suggestionCatalogCache = null;
      this.recordIndexDiagnostic("reconcile", "per-file-reconcile-complete", {
        added: this.restoredAddedMarkdownPaths.length,
        removed: this.restoredRemovedMarkdownPaths.length,
        modified: this.restoredModifiedMarkdownPaths.length,
      });
      this.restoredModifiedMarkdownPaths = [];
      this.restoredAddedMarkdownPaths = [];
      this.restoredRemovedMarkdownPaths = [];
      this.restoredPatchPlanAvailable = false;
      this.fullSnapshotFresh = true;
      this.scheduleSnapshotPersist(SNAPSHOT_EDIT_IDLE_MS);
      this.deferOrphanCleanup();
      return { reconciled: true, patched: files.length };
    } finally {
      this.building = false;
    }
  }

  /** Incrementally replace declarations owned by already-indexed Markdown files.
   * Used for normal metadataCache.changed events so editing one note does not rebuild a large vault. */
  async patchMarkdownPaths(paths: readonly string[]): Promise<PatchMarkdownPathsResult> {
    if (!paths.length) return { outcome: "patched", count: 0 };
    if (this.building) return { outcome: "cancelled", count: 0, pendingPaths: [...paths] };
    this.cancelPendingPersistence();
    this.deferOrphanCleanup();
    const files: TFile[] = [];
    for (const path of [...new Set(paths)]) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile) || file.extension !== "md" || !this.get(path)) {
        return { outcome: "needs-rebuild", count: 0 };
      }
      files.push(file);
    }
    if (!files.length) return { outcome: "patched", count: 0 };

    this.building = true;
    const run = ++this.generation;
    let committed = 0;
    const committedPaths = new Set<string>();
    try {
      this.sourceAcquisition.start();
      const builder = new GraphBuilder(
        this.plugin, this.app, this.fieldCache, this.metadataParser, this.indexedDb,
        () => run === this.generation, this.semanticFingerprints, this.sourceAcquisition,
      );
      const result = await builder.patchMarkdownFiles(this.state, files, {
        useDurableCache: false,
        awaitBodyWrite: false,
        publishFileCommit: (commit, publishPreparedState) => {
          this.publishIncrementalFile(commit, publishPreparedState);
          committed += 1;
          committedPaths.add(commit.sourcePath);
        },
      });
      if (!result.ok || run !== this.generation) {
        if (result.rebuildRequired && run === this.generation) return { outcome: "needs-rebuild", count: committed };
        return {
          outcome: "cancelled",
          count: committed,
          pendingPaths: files.map((file) => file.path).filter((path) => !committedPaths.has(path)),
        };
      }
      this.suggestionCatalogCache = null;
      this.scheduleSnapshotPersist(SNAPSHOT_EDIT_IDLE_MS);
      this.deferOrphanCleanup();
      return { outcome: "patched", count: files.length };
    } finally {
      this.building = false;
    }
  }

  /** Deprecated disk-cache compatibility reader; production startup uses IndexedDB. */
  private async restoreChunkedSnapshot(): Promise<{ restored: boolean; fresh: boolean; createdAt: number | null }> {
    const manifestPath = this.snapshotManifestPath();
    if (!manifestPath || !(await this.app.vault.adapter.exists(manifestPath))) {
      return { restored: false, fresh: false, createdAt: null };
    }
    try {
      const raw = await this.app.vault.adapter.read(manifestPath);
      const parsed: unknown = JSON.parse(raw);
      if (!isPersistedIndexManifestV2(parsed)) return { restored: false, fresh: false, createdAt: null };
      const manifest = parsed;
      const decision = compareIndexSettingsSignature(manifest.settingsSignature, this.plugin.settings);
      if (!decision.compatible || decision.retiredFilepath) {
        return { restored: false, fresh: false, createdAt: manifest.createdAt };
      }

      const policy = computeIndexSettingsSignature(this.plugin.settings);
      const current = (): boolean => !this.diagnosticsClosed && policy === computeIndexSettingsSignature(this.plugin.settings);
      const next = createGraphState();
      for (let i = 0; i < manifest.pageChunkCount; i += 1) {
        const path = this.snapshotChunkPath(manifest.generation, "pages", i);
        if (!path || !(await this.app.vault.adapter.exists(path))) throw new Error("Missing K-Plex page snapshot chunk");
        const chunk = JSON.parse(await this.app.vault.adapter.read(path)) as PersistedPage[];
        if (!Array.isArray(chunk)) throw new Error("Invalid K-Plex page snapshot chunk");
        for (const saved of chunk) addPersistedPageToState(next, saved, this.app);
        await this.yieldSnapshotWork();
      }
      for (let i = 0; i < manifest.evidenceChunkCount; i += 1) {
        const path = this.snapshotChunkPath(manifest.generation, "evidence", i);
        if (!path || !(await this.app.vault.adapter.exists(path))) throw new Error("Missing K-Plex evidence snapshot chunk");
        const chunk = JSON.parse(await this.app.vault.adapter.read(path)) as PersistedEvidenceDeclaration[];
        if (!Array.isArray(chunk)) throw new Error("Invalid K-Plex evidence snapshot chunk");
        for (const declaration of chunk) addPersistedEvidenceToState(next, declaration);
        await this.yieldSnapshotWork();
      }
      next.discoveredFields = new Map(manifest.discoveredFields);
      const resolved = await finalizeHydratedGraphStateCooperative(
        next,
        current,
        Platform.isIosApp ? 50 : Platform.isMobile ? 100 : 240,
      );
      if (!resolved) return { restored: false, fresh: false, createdAt: manifest.createdAt };
      const prepared = await this.preparePresentationPublication(next, current);
      if (!prepared || !current() || !prepared.facets.isCurrent()) return { restored: false, fresh: false, createdAt: manifest.createdAt };
      this.acceptPresentation(prepared);
      this.publishRestoredState(next, prepared.search);
      const fresh = manifest.vaultSignature === computeVaultSignature(this.app);
      // A previous iOS/WebView termination may have interrupted a new generation after some
      // chunks were written but before its manifest became authoritative. Remove those orphaned
      // chunks now so repeated crashes can never accumulate stale cache generations forever.
      void this.cleanupSnapshotOrphans(manifest.generation);
      return { restored: true, fresh, createdAt: manifest.createdAt };
    } catch {
      // A cache is never authoritative. Missing/corrupt chunks fall through to the legacy cache
      // or a normal rebuild without preventing K-Plex from opening.
      return { restored: false, fresh: false, createdAt: null };
    }
  }

  /**
   * Restore the last complete semantic graph before any expensive Markdown parsing. Snapshot v2
   * is chunked so iOS never has to parse/stringify the entire graph as one enormous temporary
   * string/object. A v1 file is still accepted once for seamless migration.
   */
  async restorePersistedSnapshot(seedPaths: readonly string[] = []): Promise<{ restored: boolean; fresh: boolean; createdAt: number | null; partial?: boolean }> {
    // IndexedDB is the sole active graph cache. A small neighborhood is published first from
    // targeted page reads; full graph hydration continues independently in the background.
    const indexed = await this.restoreIndexedDbSnapshot(seedPaths);
    void this.cleanupLegacySnapshotFiles();
    return indexed;
  }

  private async cleanupLegacySnapshotFiles(): Promise<void> {
    try {
      const legacyManifest = await this.readSnapshotManifest();
      await this.removeSnapshotGeneration(legacyManifest);
      for (const path of [this.snapshotManifestPath(), this.snapshotPath()]) {
        if (!path) continue;
        try { if (await this.app.vault.adapter.exists(path)) await this.app.vault.adapter.remove(path); } catch { /* migration cleanup only */ }
      }
      if (legacyManifest) await this.cleanupSnapshotOrphans(legacyManifest.generation);
    } catch {
      // Cache housekeeping is best-effort and must never delay graph restoration.
    }
  }

  private async cleanupSnapshotOrphans(activeGeneration: string): Promise<void> {
    const dir = this.plugin.manifest?.dir;
    if (!dir) return;
    try {
      const listing = await this.app.vault.adapter.list(dir);
      const activePrefix = `${dir}/kplex-index-${activeGeneration}-`;
      for (const path of listing.files) {
        if (!path.startsWith(`${dir}/kplex-index-`) || path.startsWith(`${dir}/kplex-index-snapshot-`)) continue;
        if (!/-(?:pages|evidence)-\d+\.json$/.test(path)) continue;
        if (path.startsWith(activePrefix)) continue;
        try { await this.app.vault.adapter.remove(path); } catch { /* orphan cleanup only */ }
      }
    } catch {
      // Cache housekeeping must never interfere with index restoration.
    }
  }

  private async removeSnapshotGeneration(manifest: PersistedIndexManifestV2 | null): Promise<void> {
    if (!manifest) return;
    for (let i = 0; i < manifest.pageChunkCount; i += 1) {
      const path = this.snapshotChunkPath(manifest.generation, "pages", i);
      if (path) try { if (await this.app.vault.adapter.exists(path)) await this.app.vault.adapter.remove(path); } catch { /* cache cleanup only */ }
    }
    for (let i = 0; i < manifest.evidenceChunkCount; i += 1) {
      const path = this.snapshotChunkPath(manifest.generation, "evidence", i);
      if (path) try { if (await this.app.vault.adapter.exists(path)) await this.app.vault.adapter.remove(path); } catch { /* cache cleanup only */ }
    }
  }

  private async readSnapshotManifest(): Promise<PersistedIndexManifestV2 | null> {
    const path = this.snapshotManifestPath();
    if (!path) return null;
    try {
      if (!(await this.app.vault.adapter.exists(path))) return null;
      const parsed: unknown = JSON.parse(await this.app.vault.adapter.read(path));
      return isPersistedIndexManifestV2(parsed) ? parsed : null;
    } catch { return null; }
  }

  /** Write a complete generation or resumable checkpoint, returning true only when its pointer activated.
   * Callers retain unsaved progress and retry after false; a partial generation is never authoritative. */
  private async persistIndexedDbSnapshot(
    run: number,
    completedMarkdownPaths?: Iterable<string>,
    isCurrent: () => boolean = () => true,
    knownVaultSignature?: string,
  ): Promise<boolean> {
    const checkpoint = completedMarkdownPaths !== undefined;
    if (run !== this.snapshotPersistGeneration || (!checkpoint && !this.fullSnapshotHydrated) || this.state.pages.size === 0) return false;
    const state = this.state;
    const semanticFingerprints = this.semanticFingerprints;
    function* pageRecords(): IterableIterator<PersistedPage> {
      for (const page of state.pages.values()) {
        if (!page.transient) yield persistedPageFromGraphPage(page, semanticFingerprints.get(page.path));
      }
    }
    function* evidenceRecords(): IterableIterator<PersistedEvidenceDeclaration> {
      for (const item of state.evidence.declarations()) yield persistedDeclarationFromEvidence(item);
    }
    const pages = pageRecords();
    const evidence = evidenceRecords();

    const vaultSignature = knownVaultSignature ?? computeVaultSignature(this.app);
    const settingsSignature = computeIndexSettingsSignature(this.plugin.settings);
    const snapshotCreatedAt = Date.now();
    const completedPaths = completedMarkdownPaths ? [...completedMarkdownPaths] : null;
    const completedMarkdownFiles = completedPaths?.length;
    let failureReason: SnapshotWriteFailureReason | null = null;
    const persisted = await this.indexedDb.writeSnapshot({
      createdAt: snapshotCreatedAt,
      vaultSignature,
      settingsSignature,
      discoveredFields: [...this.state.discoveredFields.entries()],
      ...(completedPaths ? { completedMarkdownPaths: completedPaths } : {}),
    }, pages, evidence, () => run === this.snapshotPersistGeneration && isCurrent(), checkpoint ? "checkpoint" : "active",
    (reason) => { failureReason = reason; });

    if (!persisted || run !== this.snapshotPersistGeneration) {
      this.recordIndexDiagnostic("persist", run !== this.snapshotPersistGeneration || failureReason === "cancelled" ?
        "snapshot-write-cancelled" : checkpoint ? `checkpoint-${failureReason ?? "write-failed"}` :
          `complete-${failureReason ?? "write-failed"}`, { completedMarkdownFiles, durationMs: Math.max(0, Date.now() - snapshotCreatedAt) });
      return false;
    }
    this.savedSnapshotSummary = {
      ...this.savedSnapshotSummary,
      storage: "available",
      ...(checkpoint ? { checkpoint: { createdAt: snapshotCreatedAt, schema: 3,
        completedMarkdownFiles: completedPaths?.length ?? 0 } } :
        { active: { createdAt: snapshotCreatedAt, schema: 3 } }),
    };
    this.recordIndexDiagnostic("persist", checkpoint ? "checkpoint-saved" : "complete-saved",
      { completedMarkdownFiles, durationMs: Math.max(0, Date.now() - snapshotCreatedAt) });
    if (checkpoint) return true;
    await this.indexedDb.clearCheckpoint();
    this.savedSnapshotSummary.checkpoint = null;
    const latestMeta = await this.indexedDb.readSnapshotMeta();
    if (latestMeta?.generation) this.scheduleOrphanCleanup(latestMeta.generation);
    // Clean legacy file-based snapshots only after IndexedDB has had a chance to become
    // authoritative. Failures are harmless; they are ignored on the next startup once IDB loads.
    const legacyManifest = await this.readSnapshotManifest();
    await this.removeSnapshotGeneration(legacyManifest);
    for (const path of [this.snapshotManifestPath(), this.snapshotPath()]) {
      if (!path) continue;
      try { if (await this.app.vault.adapter.exists(path)) await this.app.vault.adapter.remove(path); } catch { /* migration cleanup only */ }
    }
    return true;
  }

  private scheduleSnapshotPersist(delayOverride?: number): void {
    if (this.snapshotPersistTimer !== null) {
      window.clearTimeout(this.snapshotPersistTimer);
    }
    const run = ++this.snapshotPersistGeneration;
    const delay = delayOverride ?? (Platform.isIosApp ? 12000 : Platform.isMobile ? 8000 : 5000);
    this.snapshotPersistTimer = window.setTimeout(() => {
      this.snapshotPersistTimer = null;
      void this.persistIndexedDbSnapshot(run).catch(() => { /* persistence is an optimization only */ });
    }, delay);
  }

  /**
   * Build a cold-start graph in usefulness order while preserving the per-source atomic boundary.
   *
   * The structural/link-map baseline is private until the preferred center Markdown source and the
   * bounded child notes visible from that center have been parsed. That first useful neighborhood
   * is then published with a small working search index. Remaining Markdown files commit one at a
   * time into the live state; UI notifications are batched so the graph grows progressively without
   * forcing a React render for every note. Large iOS vaults may prewarm durable body parses only
   * after the first neighborhood is visible, retaining the existing low-memory safety contract.
   * A validated partial checkpoint can supply the already-published baseline and completed source
   * set on restart. Source ingestion pauses at periodic durable checkpoint boundaries.
   *
   * @param seedPaths Ordered startup center candidates; the first graph path that exists wins.
   * @param options `prewarmBodyCache` preserves the large-iOS checkpoint pass before the remainder.
   * @returns `true` only after every Markdown source has committed and the final search index is
   * authoritative. Cancellation or a source revision change leaves any already-published preview
   * non-authoritative and returns `false` for the coordinator to retry.
   */
  async rebuildProgressively(
    seedPaths: readonly string[] = [],
    options: Readonly<{ prewarmBodyCache?: boolean }> = {},
  ): Promise<boolean> {
    if (this.building) {
      this.rebuildQueued = true;
      return false;
    }
    this.cancelPendingPersistence();
    this.building = true;
    const run = ++this.generation;
    // The coordinator retains Markdown changes that arrive during cold ingestion as a per-file
    // backlog. Cancelling the entire pass for each sync/metadata event restarted large vaults at
    // file zero. GraphBuilder still fences each source by its exact TFile/stat revision; a source
    // changed during its own read cancels safely, while unrelated events leave committed work intact.
    const isCurrent = (): boolean => run === this.generation && !this.diagnosticsClosed;
    try {
      const resuming = this.resumableCheckpointPaths !== null;
      const nextFingerprints = resuming ? this.semanticFingerprints : new Map<string, string>();
      this.sourceAcquisition.start();
      const builder = new GraphBuilder(
        this.plugin,
        this.app,
        this.fieldCache,
        this.metadataParser,
        this.indexedDb,
        isCurrent,
        nextFingerprints,
        this.sourceAcquisition,
      );
      const next = resuming ? this.state : await builder.buildStructuralBaseline();
      if (!next || !isCurrent()) return false;

      if (resuming) {
        for (const path of this.restoredRemovedMarkdownPaths) this.dematerializeFile(path);
        for (const path of this.restoredAddedMarkdownPaths) {
          const file = this.app.vault.getFileByPath(path);
          if (!file || file.extension !== "md" || !isCurrent()) return false;
          this.insertCreatedFile(file);
        }
        this.restoredAddedMarkdownPaths = [];
        this.restoredRemovedMarkdownPaths = [];
      }

      const markdownFiles = this.app.vault.getMarkdownFiles();
      const markdownByPath = new Map(markdownFiles.map((file) => [file.path, file] as const));
      const indexedPaths = new Set<string>(resuming ? this.resumableCheckpointPaths ?? [] : []);
      let centerPath: string | null = null;
      for (const seed of seedPaths) {
        const page = getGraphPage(next, seed);
        if (!page) continue;
        centerPath = page.path;
        break;
      }
      centerPath ??= getGraphPage(next, "folder:/")?.path ?? null;

      const patchBeforePublish = async (files: readonly TFile[]): Promise<boolean> => {
        const unique = files.filter((file) => !indexedPaths.has(file.path));
        if (!unique.length) return true;
        const result = await builder.patchMarkdownFiles(next, unique, {
          useDurableCache: true,
          awaitBodyWrite: false,
          discoveryMode: "rebuild",
          // On a restored checkpoint `next` is already published. Seed sources must cross the
          // same synchronous graph/search/notification boundary as the remaining files.
          ...(resuming ? { publishFileCommit: this.publishIncrementalFile } : {}),
        });
        if (!result.ok || !isCurrent()) return false;
        for (const file of unique) indexedPaths.add(file.path);
        return true;
      };

      const centerFile = centerPath ? markdownByPath.get(centerPath) : undefined;
      if (centerFile && !(await patchBeforePublish([centerFile]))) return false;

      const initialChildFiles: TFile[] = [];
      const center = centerPath ? getGraphPage(next, centerPath) : undefined;
      if (center) {
        const childLimit = Math.max(1, this.plugin.settings.maxItemCount);
        for (const relation of center.neighbours.values()) {
          if (relation.isHidden || classifyRelation(relation, "child", this.plugin.settings.inferAllLinksAsFriends) === null) continue;
          const file = relation.target.file;
          if (!(file instanceof TFile) || file.extension !== "md" || indexedPaths.has(file.path)) continue;
          initialChildFiles.push(file);
          if (initialChildFiles.length >= childLimit) break;
        }
      }
      if (!(await patchBeforePublish(initialChildFiles))) return false;

      if (!isCurrent()) return false;
      if (!resuming) {
        const prepared = await this.preparePresentationPublication(next, isCurrent, undefined, true);
        if (!prepared || !isCurrent() || !prepared.facets.isCurrent()) return false;
        this.acceptPresentation(prepared);
        this.state = next;
        this.publicationRevision += 1;
        this.semanticFingerprints = nextFingerprints;
        this.fullSnapshotHydrated = false;
        this.fullSnapshotFresh = false;
        this.previewSnapshotPublished = false;
        this.restoredModifiedMarkdownPaths = [];
        this.restoredStructuralMismatch = false;
        this.restoredPatchPlanAvailable = false;
        this.activeSnapshotGeneration = null;
        this.titleCache.clear();
        this.nodeVisualCache.clear();
        this.suggestionCatalogCache = null;
        this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();

        const initialSearchPaths = new Set<string>(indexedPaths);
        if (center) {
          initialSearchPaths.add(center.path);
          for (const relation of center.neighbours.values()) initialSearchPaths.add(relation.target.path);
        }
        const initialEntries: SearchEntry[] = [];
        const initialByPath = new Map<string, SearchEntry>();
        for (const path of initialSearchPaths) {
          const page = getGraphPage(next, path);
          if (!page || initialByPath.has(page.path)) continue;
          const entry = this.makeSearchEntry(page);
          initialEntries.push(entry);
          initialByPath.set(page.path, entry);
        }
        this.installSearchIndex({ entries: initialEntries, byPath: initialByPath });
        this.emit();
      }

      if (options.prewarmBodyCache && indexedPaths.size < markdownFiles.length) {
        const warmed = await this.prewarmBodyCache(isCurrent);
        if (!warmed || !isCurrent()) return false;
      }

      const remaining: TFile[] = [];
      const queued = new Set<string>();
      for (const seed of seedPaths) {
        const page = getGraphPage(next, seed);
        const file = page ? markdownByPath.get(page.path) : undefined;
        if (!file || indexedPaths.has(file.path) || queued.has(file.path)) continue;
        queued.add(file.path);
        remaining.push(file);
      }
      for (const file of markdownFiles) {
        if (indexedPaths.has(file.path) || queued.has(file.path)) continue;
        queued.add(file.path);
        remaining.push(file);
      }

      const notifyEvery = Platform.isIosApp ? 3 : Platform.isMobile ? 5 : 10;
      let commitsSinceNotify = 0;
      let commitsSinceCheckpoint = 0;
      // A restart must not restart the durability clock. A checkpoint restored hours later is
      // due again after the first 500 new commits, even when this process is only seconds old.
      let lastCheckpointAt = resuming && this.savedSnapshotSummary.checkpoint
        ? Math.min(Date.now(), this.savedSnapshotSummary.checkpoint.createdAt)
        : Date.now();
      let checkpointIntervalMs = COLD_CHECKPOINT_INTERVAL_MS;
      let checkpointRetryAfter = 0;
      let checkpointRetryDelayMs = 15_000;
      let checkpointVaultSignature = resuming ? this.restoredVaultSignature : null;
      const result = await builder.patchMarkdownFiles(this.state, remaining, {
        useDurableCache: true,
        awaitBodyWrite: false,
        discoveryMode: "rebuild",
        publishFileCommit: (commit, publishPreparedState) => {
          this.commitPreparedFile(commit, publishPreparedState);
          indexedPaths.add(commit.sourcePath);
          commitsSinceCheckpoint += 1;
          commitsSinceNotify += 1;
          if (commitsSinceNotify < notifyEvery) return;
          commitsSinceNotify = 0;
          this.emit();
        },
        afterFileCommit: async () => {
          const elapsedSinceCheckpoint = Date.now() - lastCheckpointAt;
          if (markdownFiles.length - indexedPaths.size < COLD_CHECKPOINT_MIN_FILES ||
            commitsSinceCheckpoint < COLD_CHECKPOINT_MIN_FILES ||
            (elapsedSinceCheckpoint < checkpointIntervalMs &&
              (commitsSinceCheckpoint < COLD_CHECKPOINT_PROGRESS_FILES ||
                elapsedSinceCheckpoint < COLD_CHECKPOINT_PROGRESS_MIN_INTERVAL_MS)) ||
            Date.now() < checkpointRetryAfter || !isCurrent()) return;
          // Pause source ingestion while serializing the coherent committed graph. The IndexedDB
          // checkpoint metadata activates only after all page/evidence chunks are durable.
          let persisted = false;
          this.checkpointSaving = true;
          this.emit();
          try {
            checkpointVaultSignature ??= computeVaultSignature(this.app);
            persisted = await this.persistIndexedDbSnapshot(this.snapshotPersistGeneration, indexedPaths, isCurrent, checkpointVaultSignature);
          } catch { /* checkpoint persistence is an optimization; ingestion must continue */ }
          finally {
            this.checkpointSaving = false;
            this.emit();
          }
          if (!persisted) {
            // A failed or cancelled checkpoint did not save those sources. Retain the commit count
            // and interval, but avoid retrying a large serialization on every following note.
            checkpointRetryAfter = Date.now() + checkpointRetryDelayMs;
            checkpointRetryDelayMs = Math.min(COLD_CHECKPOINT_MAX_INTERVAL_MS, checkpointRetryDelayMs * 2);
            return;
          }
          commitsSinceCheckpoint = 0;
          lastCheckpointAt = Date.now();
          checkpointRetryAfter = 0;
          checkpointRetryDelayMs = 15_000;
          // A full graph checkpoint took about 31 seconds on the 20k-note desktop fixture. Grow
          // the interval so repeated saves do not dominate the remainder of cold indexing.
          checkpointIntervalMs = Math.min(COLD_CHECKPOINT_MAX_INTERVAL_MS, checkpointIntervalMs * 2);
        },
      });
      if (!result.ok || !isCurrent()) return false;
      if (commitsSinceNotify > 0) this.emit();

      // The bounded startup search intentionally grows from per-file commits. Rebuild it once at
      // completion so standalone attachments/folders/tags and untouched virtual nodes are included.
      this.rebuildSearchIndex();
      this.fullSnapshotHydrated = true;
      this.sourceAcquisition.enableInventory();
      this.fullSnapshotFresh = true;
      this.previewSnapshotPublished = false;
      this.resumableCheckpointPaths = null;
      this.emit();
      this.scheduleSnapshotPersist();
      return true;
    } finally {
      this.building = false;
      this.rebuildQueued = false;
    }
  }

  /** Build a complete graph off to the side, then atomically publish it. */
  async rebuild(): Promise<boolean> {
    if (this.building) {
      // Main.ts coalesces dirty events and will request one follow-up rebuild after this one.
      // Never invalidate useful work merely because MetadataCache emitted another startup event:
      // that cancellation loop was particularly harmful on slower mobile devices.
      this.rebuildQueued = true;
      return false;
    }
    this.building = true;
    const run = ++this.generation;
    const semanticPolicy = computeIndexSettingsSignature(this.plugin.settings);
    const current = (): boolean => run === this.generation && !this.diagnosticsClosed;
    const resumeInventory = this.sourceAcquisition.pauseInventory();
    try {
      const nextFingerprints = new Map<string, string>();
      this.sourceAcquisition.start();
      const builder = new GraphBuilder(
        this.plugin,
        this.app,
        this.fieldCache,
        this.metadataParser,
        this.indexedDb,
        current,
        nextFingerprints,
        this.sourceAcquisition,
      );
      const next = await builder.build({ acquireSources: false });
      if (!next || !current()) {
        return false;
      }

      const prepared = await this.preparePresentationPublication(next, current);
      if (!prepared || !current() || !prepared.facets.isCurrent() ||
        semanticPolicy !== computeIndexSettingsSignature(this.plugin.settings)) return false;
      const preparedSearch = prepared.search;
      this.acceptPresentation(prepared);

      // Atomic graph-state swap: readers never observe a half-built graph.
      this.state = next;
      this.publicationRevision += 1;
      this.semanticFingerprints = nextFingerprints;
      this.fullSnapshotHydrated = true;
      this.sourceAcquisition.enableInventory();
      this.fullSnapshotFresh = true;
      this.previewSnapshotPublished = false;
      this.titleCache.clear();
      this.nodeVisualCache.clear();
      this.suggestionCatalogCache = null;
      this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
      this.installSearchIndex(preparedSearch);
      this.emit();
      this.scheduleSnapshotPersist();
      return true;
    } finally {
      this.sourceAcquisition.resumeInventory(resumeInventory);
      this.building = false;
      this.rebuildQueued = false;
    }
  }

  /** Build search terms against a proposed policy without mutating pages or live title caches. */
  private makeSearchEntry(page: GraphPage, settings?: KplexSettings, name = page.name): SearchEntry {
    const title = settings ? this.displayNameFromConfiguredFields(page, settings) ?? name : this.titleFor(page);
    const alternateNames = new Set([name, ...page.aliases]);
    alternateNames.delete(title);
    return {
      page,
      name: title.toLowerCase(),
      aliases: [...alternateNames].map((alias) => alias.toLowerCase()),
      path: page.path.toLowerCase(),
    };
  }

  private rebuildSearchIndex(): void {
    const entries: SearchEntry[] = [];
    const byPath = new Map<string, SearchEntry>();
    for (const page of this.state.pages.values()) {
      const entry = this.makeSearchEntry(page);
      entries.push(entry);
      byPath.set(page.path, entry);
    }
    this.installSearchIndex({ entries, byPath });
  }

  /** Update only entries whose source/target page may have changed during a Markdown patch. */
  private patchSearchIndex(paths: Iterable<string>): void {
    this.searchCandidateCache.clear();
    const removed = new Set<string>();
    const uniquePaths: Iterable<string> = paths instanceof Set ? paths : new Set(paths);
    for (const path of uniquePaths) {
      // Incremental commits already provide canonical graph paths. Prefer the direct lookup so a
      // URL-heavy patch does not repeat lowercase/path-resolution work for thousands of entries.
      const page = this.state.pages.get(path) ?? this.get(path);
      if (!page) {
        if (this.searchEntryByPath.delete(path)) removed.add(path);
        continue;
      }
      const existing = this.searchEntryByPath.get(page.path);
      if (existing) {
        const next = this.makeSearchEntry(page);
        existing.page = next.page;
        existing.name = next.name;
        existing.aliases = next.aliases;
        existing.path = next.path;
      } else {
        const entry = this.makeSearchEntry(page);
        this.searchEntries.push(entry);
        this.searchEntryByPath.set(page.path, entry);
      }
    }
    if (removed.size) this.searchEntries = this.searchEntries.filter((entry) => !removed.has(entry.page.path));
  }

  private invalidatePatchedPages(paths: Iterable<string>): void {
    for (const path of paths) {
      this.titleCache.delete(path);
      this.nodeVisualCache.delete(path);
      const page = this.get(path);
      if (page) this.relationViewCache.delete(page);
    }
  }

  private scheduleOrphanCleanup(activeGeneration: string): void {
    this.activeSnapshotGeneration = activeGeneration;
    if (this.orphanCleanupTimer !== null) window.clearTimeout(this.orphanCleanupTimer);
    const run = this.snapshotPersistGeneration;
    this.orphanCleanupTimer = window.setTimeout(() => {
      this.orphanCleanupTimer = null;
      if (run !== this.snapshotPersistGeneration) return;
      const generation = this.activeSnapshotGeneration;
      if (!generation || this.building || this.snapshotPersistTimer !== null) {
        if (generation) this.scheduleOrphanCleanup(generation);
        return;
      }
      void this.indexedDb.cleanupOrphanGenerations(
        generation,
        () => run === this.snapshotPersistGeneration && this.activeSnapshotGeneration === generation,
      );
    }, SNAPSHOT_MAINTENANCE_IDLE_MS);
  }

  private deferOrphanCleanup(): void {
    if (this.activeSnapshotGeneration) this.scheduleOrphanCleanup(this.activeSnapshotGeneration);
  }

  relationshipStorageCandidates(sourcePath: string, targetPath: string): string[] {
    const editable = new Set<string>();
    for (const path of [sourcePath, targetPath]) {
      const page = this.get(path);
      if (page?.file?.extension === "md") editable.add(path);
    }
    if (!editable.size) return [];

    const evidence = this.state.evidence.between(sourcePath, targetPath);
    const rank = new Map<string, number>();
    const scoreKind = (kind: RelationEvidence["sourceKind"]): number => {
      if (kind === "frontmatter-ontology") return 0;
      if (kind === "inline-ontology") return 1;
      if (kind === "obsidian-link" || kind === "unresolved-link") return 2;
      return 4;
    };
    for (const item of evidence) {
      const declarer = item.declaredByPath;
      if (!editable.has(declarer)) continue;
      const score = scoreKind(item.sourceKind);
      rank.set(declarer, Math.min(rank.get(declarer) ?? Number.POSITIVE_INFINITY, score));
    }
    return [...editable].sort((a, b) => (rank.get(a) ?? 9) - (rank.get(b) ?? 9) || (a === sourcePath ? -1 : 1));
  }

  private reconcileFileTreeMembership(file: TFile): Set<string> {
    const touched = new Set<string>();
    const ensureFolder = (folderPath: string, name: string): GraphPage => {
      const path = folderPath ? `folder:${folderPath}` : "folder:/";
      let page = this.state.pages.get(path);
      if (!page) {
        page = {
          path, file: null, name, url: null, isFolder: true, isTag: false, mtime: null,
          neighbours: new Map(), aliases: [], tags: [], noteType: null, primaryStyleTag: null,
          styleTags: [], maxLabelLength: this.plugin.settings.baseNodeStyle.maxLabelLength ?? 30,
        };
        this.state.pages.set(path, page);
        this.state.lowercasePathMap.set(path.toLowerCase(), path);
        touched.add(path);
      }
      return page;
    };
    const ensureTreeEdge = (parent: GraphPage, child: GraphPage): void => {
      const exists = this.state.evidence.between(parent.path, child.path).some((item) =>
        item.sourceKind === "file-tree" && item.declaredByPath === parent.path && item.declaredTargetPath === child.path,
      );
      if (!exists) {
        this.state.evidence.addPair(parent.path, child.path, "child", RelationType.DEFINED, LinkDirection.FROM, {
          sourceKind: "file-tree", definition: "file-tree",
        });
      }
      resolveEvidencePair(this.state.pages, this.state.evidence, parent.path, child.path);
      resolveEvidencePair(this.state.pages, this.state.evidence, child.path, parent.path);
      touched.add(parent.path);
      touched.add(child.path);
    };

    const filePage = this.state.pages.get(file.path);
    if (!filePage) return touched;
    const oldParents = this.state.evidence.declarationsTouching(file.path)
      .filter((item) => item.sourceKind === "file-tree" && item.declaredTargetPath === file.path && item.declaredByPath.startsWith("folder:"))
      .map((item) => item.declaredByPath);
    this.state.evidence.removeDeclarationsTouching(file.path, (item) =>
      item.sourceKind === "file-tree" && item.declaredTargetPath === file.path && item.declaredByPath.startsWith("folder:"));
    for (const parentPath of oldParents) {
      resolveEvidencePair(this.state.pages, this.state.evidence, parentPath, file.path);
      resolveEvidencePair(this.state.pages, this.state.evidence, file.path, parentPath);
      touched.add(parentPath);
    }

    let parent = ensureFolder("", "/");
    const folderParts = file.path.split("/").slice(0, -1).filter(Boolean);
    let currentPath = "";
    for (const part of folderParts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const folder = ensureFolder(currentPath, part);
      ensureTreeEdge(parent, folder);
      parent = folder;
    }
    ensureTreeEdge(parent, filePage);
    return touched;
  }

  /**
   * Apply an Obsidian file rename/move directly to the published semantic graph. A TFile keeps its
   * object identity across rename, and none of the note-owned ontology/body evidence changes merely
   * because its path changed. Remap only the renamed page, evidence buckets and directly connected
   * relation-map keys; do not schedule a whole-vault rebuild or reread Markdown.
   */
  renameFile(oldPath: string, file: TFile): boolean {
    const newPath = file.path;
    if (!oldPath || !newPath || oldPath === newPath) return true;

    const page = this.state.pages.get(oldPath);
    if (!page || page.isFolder || page.isTag || page.url) return false;

    const collision = this.state.pages.get(newPath);
    if (collision && collision !== page && (collision.file || collision.isFolder || collision.isTag || collision.url)) return false;

    const affectedPaths = new Set<string>();
    for (const targetPath of page.neighbours.keys()) affectedPaths.add(targetPath);
    for (const item of this.state.evidence.declarationsTouching(oldPath)) {
      affectedPaths.add(item.declaredByPath);
      affectedPaths.add(item.declaredTargetPath);
    }
    if (collision && collision !== page) {
      for (const targetPath of collision.neighbours.keys()) affectedPaths.add(targetPath);
      for (const item of this.state.evidence.declarationsTouching(newPath)) {
        affectedPaths.add(item.declaredByPath);
        affectedPaths.add(item.declaredTargetPath);
      }
    }

    const oldSearchEntry = this.searchEntryByPath.get(oldPath);
    const collisionSearchEntry = collision && collision !== page ? this.searchEntryByPath.get(newPath) : undefined;

    for (const path of this.state.evidence.renamePath(oldPath, newPath)) affectedPaths.add(path);

    this.state.pages.delete(oldPath);
    this.state.lowercasePathMap.delete(oldPath.toLowerCase());
    if (collision && collision !== page) {
      this.state.pages.delete(newPath);
      this.state.lowercasePathMap.delete(newPath.toLowerCase());
    }

    page.path = newPath;
    page.file = file;
    page.name = file.basename;
    page.mtime = file.stat.mtime;
    page.url = null;
    page.isFolder = false;
    page.isTag = false;
    page.neighbours.clear();
    this.state.pages.set(newPath, page);
    this.state.lowercasePathMap.set(newPath.toLowerCase(), newPath);

    const canonicalAffected = new Set<string>();
    for (const rawPath of affectedPaths) {
      const path = rawPath === oldPath ? newPath : rawPath;
      if (path !== newPath) canonicalAffected.add(path);
    }
    for (const targetPath of canonicalAffected) {
      const target = this.get(targetPath);
      if (!target || target === page) continue;
      target.neighbours.delete(oldPath);
      target.neighbours.delete(newPath);
      resolveEvidencePair(this.state.pages, this.state.evidence, newPath, target.path);
      resolveEvidencePair(this.state.pages, this.state.evidence, target.path, newPath);
    }

    // File-tree ancestry is the only semantic relation that can legitimately change when a rename
    // also moves the file to another folder. Reconcile just that ancestry locally. A basename-only
    // rename simply removes/re-adds the same one folder edge.
    const treeTouched = this.reconcileFileTreeMembership(file);
    for (const path of treeTouched) canonicalAffected.add(path);
    canonicalAffected.add(newPath);

    const fieldEntry = this.fieldCache.get(oldPath);
    if (fieldEntry) {
      this.fieldCache.delete(oldPath);
      this.fieldCache.set(newPath, fieldEntry);
    }
    const fingerprint = this.semanticFingerprints.get(oldPath);
    if (fingerprint !== undefined) {
      this.semanticFingerprints.delete(oldPath);
      this.semanticFingerprints.set(newPath, fingerprint);
    }

    this.searchCandidateCache.clear();
    this.searchEntryByPath.delete(oldPath);
    if (collisionSearchEntry) this.searchEntryByPath.delete(newPath);
    const retainedEntry = oldSearchEntry ?? collisionSearchEntry;
    const nextSearch = this.makeSearchEntry(page);
    if (retainedEntry) {
      retainedEntry.page = nextSearch.page;
      retainedEntry.name = nextSearch.name;
      retainedEntry.aliases = nextSearch.aliases;
      retainedEntry.path = nextSearch.path;
      this.searchEntryByPath.set(newPath, retainedEntry);
      if (oldSearchEntry && collisionSearchEntry && collisionSearchEntry !== oldSearchEntry) {
        this.searchEntries = this.searchEntries.filter((entry) => entry !== collisionSearchEntry);
      }
    } else {
      this.searchEntries.push(nextSearch);
      this.searchEntryByPath.set(newPath, nextSearch);
    }

    this.searchEntryPointPaths = [...new Set(this.searchEntryPointPaths.map((path) => path === oldPath ? newPath : path))];
    this.restoredModifiedMarkdownPaths = [...new Set(this.restoredModifiedMarkdownPaths.map((path) => path === oldPath ? newPath : path))];
    this.titleCache.delete(oldPath);
    this.titleCache.delete(newPath);
    this.nodeVisualCache.delete(oldPath);
    this.nodeVisualCache.delete(newPath);
    this.suggestionCatalogCache = null;
    this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
    this.emit();
    // Persist the remapped semantic snapshot soon, but outside the rename interaction itself.
    this.scheduleSnapshotPersist(5000);
    return true;
  }

  /**
   * Convert a deleted Markdown file into the unresolved node that its surviving inbound links now
   * describe. File-owned evidence (body/YAML declarations, tags and folder membership) disappears,
   * while declarations from other notes that still point at this path remain intact. Keeping the
   * GraphPage object itself is important when the deleted note is the active Plex center.
   */
  dematerializeFile(path: string): GraphPage | null {
    const page = this.get(path);
    if (!page || page.isFolder || page.isTag || page.url) return page ?? null;

    const affected = new Set<string>([page.path]);
    const membershipParents = new Set<string>();
    for (const item of this.state.evidence.declarationsTouching(page.path)) {
      affected.add(item.declaredByPath);
      affected.add(item.declaredTargetPath);
      if ((item.sourceKind === "file-tree" || item.sourceKind === "tag-tree") && item.declaredTargetPath === page.path) {
        membershipParents.add(item.declaredByPath);
      }
    }

    this.state.evidence.removeDeclarationsTouching(page.path, (item) => {
      if (item.declaredByPath === page.path && FILE_CONTENT_EVIDENCE.has(item.sourceKind)) return true;
      if ((item.sourceKind === "file-tree" || item.sourceKind === "tag-tree") && item.declaredTargetPath === page.path) return true;
      return false;
    });

    // Physical folder/tag membership exists only while a backing file exists. Clear those relation
    // map entries eagerly as well as their evidence so the current scene cannot render the deleted
    // ghost under its former folder while the affected pair resolver catches up.
    for (const parentPath of membershipParents) {
      this.get(parentPath)?.neighbours.delete(page.path);
      page.neighbours.delete(parentPath);
    }

    page.file = null;
    page.mtime = null;
    page.url = null;
    page.aliases = [];
    page.tags = [];
    page.noteType = null;
    page.primaryStyleTag = null;
    page.styleTags = [];
    page.neighbours.clear();

    for (const rawPath of affected) {
      if (rawPath === page.path) continue;
      const target = this.get(rawPath);
      if (!target) continue;
      target.neighbours.delete(page.path);
      resolveEvidencePair(this.state.pages, this.state.evidence, page.path, target.path);
      resolveEvidencePair(this.state.pages, this.state.evidence, target.path, page.path);
    }

    this.fieldCache.delete(page.path);
    this.semanticFingerprints.delete(page.path);
    this.restoredModifiedMarkdownPaths = this.restoredModifiedMarkdownPaths.filter((candidate) => candidate !== page.path);
    this.invalidatePatchedPages(affected);
    this.patchSearchIndex(affected);
    this.suggestionCatalogCache = null;
    this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
    this.emit();
    this.scheduleSnapshotPersist(SNAPSHOT_EDIT_IDLE_MS);
    return page;
  }

  /**
   * Remove relationship evidence that was stored in YAML for one host/target pair. Generic Obsidian
   * link evidence is removed only when the caller has verified that no Markdown-body occurrence
   * remains after the YAML edit.
   */
  removePropertyReferenceEvidence(storagePath: string, targetPath: string, removeGenericLinkEvidence: boolean): boolean {
    const source = this.get(storagePath);
    const target = this.get(targetPath);
    if (!source || !target) return false;
    const removed = this.state.evidence.removeDeclarationsTouching(targetPath, (item) => {
      if (item.declaredByPath !== storagePath || item.declaredTargetPath !== targetPath) return false;
      if (item.sourceKind === "frontmatter-ontology" || item.sourceKind === "date-property") return true;
      return removeGenericLinkEvidence && (item.sourceKind === "obsidian-link" || item.sourceKind === "unresolved-link");
    });
    if (!removed) return false;
    resolveEvidencePair(this.state.pages, this.state.evidence, storagePath, targetPath);
    resolveEvidencePair(this.state.pages, this.state.evidence, targetPath, storagePath);
    this.invalidatePatchedPages(new Set([storagePath, targetPath]));
    this.patchSearchIndex(new Set([storagePath, targetPath]));
    this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
    this.emit();
    this.scheduleSnapshotPersist(SNAPSHOT_EDIT_IDLE_MS);
    return true;
  }

  /** Remove an unresolved node only when no declaration anywhere in the graph still references it. */
  removeVirtualPageIfUnreferenced(path: string): boolean {
    const page = this.get(path);
    if (!page || page.file || page.isFolder || page.isTag || page.url) return false;
    if (this.state.evidence.declarationsTouching(page.path).length) return false;

    this.state.pages.delete(page.path);
    this.state.lowercasePathMap.delete(page.path.toLowerCase());
    this.fieldCache.delete(page.path);
    this.semanticFingerprints.delete(page.path);
    this.titleCache.delete(page.path);
    this.nodeVisualCache.delete(page.path);
    this.searchCandidateCache.clear();
    const searchEntry = this.searchEntryByPath.get(page.path);
    this.searchEntryByPath.delete(page.path);
    if (searchEntry) this.searchEntries = this.searchEntries.filter((entry) => entry !== searchEntry);
    this.searchEntryPointPaths = this.searchEntryPointPaths.filter((candidate) => candidate !== page.path);
    this.restoredModifiedMarkdownPaths = this.restoredModifiedMarkdownPaths.filter((candidate) => candidate !== page.path);
    this.suggestionCatalogCache = null;
    this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
    this.emit();
    this.scheduleSnapshotPersist(SNAPSHOT_EDIT_IDLE_MS);
    return true;
  }

  /** Insert an unresolved/virtual note immediately so a placeholder relationship can appear in
   * the live Plex without creating a file or waiting for MetadataCache to rediscover the link. */
  insertVirtualPage(rawPath: string): GraphPage {
    const path = normalizePath(rawPath.trim());
    const existing = this.get(path);
    if (existing) return existing;
    const name = path.split("/").pop()?.replace(/\.md$/i, "") || path;
    const page: GraphPage = {
      path, file: null, name, url: null, isFolder: false, isTag: false, mtime: null,
      neighbours: new Map(), aliases: [], tags: [], noteType: null,
      primaryStyleTag: null, styleTags: [], maxLabelLength: 0,
    };
    this.state.pages.set(path, page);
    this.state.lowercasePathMap.set(path.toLowerCase(), path);
    this.invalidatePatchedPages(new Set([path]));
    this.patchSearchIndex(new Set([path]));
    this.suggestionCatalogCache = null;
    this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
    this.emit();
    this.scheduleSnapshotPersist(SNAPSHOT_EDIT_IDLE_MS);
    return page;
  }

  /** Insert a URL target immediately after its frontmatter relationship has been written. */
  insertUrlPage(rawUrl: string, alias?: string): GraphPage {
    const url = rawUrl.trim();
    const existing = this.get(url);
    if (existing) {
      if (alias?.trim() && (existing.name === existing.url || existing.name === existing.path)) existing.name = alias.trim();
      this.invalidatePatchedPages(new Set([existing.path]));
      this.patchSearchIndex(new Set([existing.path]));
      this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
      this.emit();
      return existing;
    }
    const page: GraphPage = {
      path: url, file: null, name: alias?.trim() || url, url, isFolder: false, isTag: false, mtime: null,
      neighbours: new Map(), aliases: [], tags: [], noteType: null, primaryStyleTag: null, styleTags: [], maxLabelLength: 0,
    };
    this.state.pages.set(url, page);
    this.state.lowercasePathMap.set(url.toLowerCase(), url);
    this.invalidatePatchedPages(new Set([url]));
    this.patchSearchIndex(new Set([url]));
    this.suggestionCatalogCache = null;
    this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
    this.emit();
    this.scheduleSnapshotPersist(SNAPSHOT_EDIT_IDLE_MS);
    return page;
  }

  /**
   * Optimistically materialize a file K-Plex itself just created. The normal Obsidian metadata
   * event remains authoritative and may enrich this page later, but UI rendering no longer waits
   * for that asynchronous round trip.
   */
  insertCreatedFile(file: TFile, aliases: readonly string[] = []): GraphPage {
    const existing = this.get(file.path);
    if (existing) {
      // A K-Plex-created note can materialize a previously unresolved/virtual graph page. Promote
      // that page immediately instead of waiting for the managed Obsidian create event (which is
      // intentionally suppressed), then reconcile file-tree ancestry from the actual TFile.
      existing.file = file;
      existing.name = file.basename;
      existing.url = null;
      existing.isFolder = false;
      existing.isTag = false;
      existing.mtime = file.stat.mtime;
      if (aliases.length) existing.aliases = [...new Set([...existing.aliases, ...aliases.map((alias) => alias.trim()).filter(Boolean)])];
      const touched = this.reconcileFileTreeMembership(file);
      touched.add(existing.path);
      this.invalidatePatchedPages(touched);
      this.patchSearchIndex(touched);
      this.suggestionCatalogCache = null;
      this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
      this.emit();
      this.scheduleSnapshotPersist(SNAPSHOT_EDIT_IDLE_MS);
      return existing;
    }
    const page: GraphPage = {
      path: file.path, file, name: file.basename, url: null, isFolder: false, isTag: false,
      mtime: file.stat.mtime, neighbours: new Map(), aliases: aliases.map((alias) => alias.trim()).filter(Boolean), tags: [], noteType: null,
      primaryStyleTag: null, styleTags: [], maxLabelLength: 0,
    };
    this.state.pages.set(page.path, page);
    this.state.lowercasePathMap.set(page.path.toLowerCase(), page.path);
    const touched = this.reconcileFileTreeMembership(file);
    touched.add(page.path);
    this.invalidatePatchedPages(touched);
    this.patchSearchIndex(touched);
    this.suggestionCatalogCache = null;
    this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
    this.emit();
    this.scheduleSnapshotPersist(SNAPSHOT_EDIT_IDLE_MS);
    return page;
  }

  /**
   * Apply a relationship frontmatter edit directly to the live semantic graph. The subsequent
   * Obsidian metadata event is only a consistency signal; a one-property move must not rebuild a
   * 20k-note index or make the optimistic node jump back while a full scan runs.
   */
  applyRelationshipEdit(storagePath: string, targetPath: string, role: Exclude<EvidenceRole, "hidden">, field: string): boolean {
    const source = this.get(storagePath);
    const target = this.get(targetPath);
    if (!source || !target) return false;

    const pair = new Set([storagePath, targetPath]);
    this.state.evidence.removeDeclarationsTouching(storagePath, (item) =>
      item.sourceKind === "frontmatter-ontology" &&
      pair.has(item.declaredByPath) && pair.has(item.declaredTargetPath) &&
      item.declaredByPath !== item.declaredTargetPath
    );
    this.state.evidence.addPair(storagePath, targetPath, role, RelationType.DEFINED, LinkDirection.FROM, {
      sourceKind: "frontmatter-ontology",
      definition: field.toLowerCase().replaceAll(" ", "-").trim(),
      fieldName: field,
    });
    resolveEvidencePair(this.state.pages, this.state.evidence, storagePath, targetPath);
    resolveEvidencePair(this.state.pages, this.state.evidence, targetPath, storagePath);
    if (source.file) source.mtime = source.file.stat.mtime;
    this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
    this.emit();
    this.scheduleSnapshotPersist(SNAPSHOT_EDIT_IDLE_MS);
    return true;
  }

  /**
   * Add another frontmatter ontology declaration for an already-connected pair without replacing
   * any existing ontology evidence. Connection details uses this for Add/Specify ontology.
   */
  applyAdditionalRelationshipEdit(storagePath: string, targetPath: string, role: Exclude<EvidenceRole, "hidden">, field: string): boolean {
    const source = this.get(storagePath);
    const target = this.get(targetPath);
    if (!source || !target) return false;

    const normalizedField = field.toLowerCase().replace(/\s+/g, "-").trim();
    const alreadyPresent = this.state.evidence.between(storagePath, targetPath).some((item) =>
      item.sourceKind === "frontmatter-ontology" &&
      item.declaredByPath === storagePath &&
      item.declaredTargetPath === targetPath &&
      (item.fieldName ?? item.definition ?? "").toLowerCase().replace(/\s+/g, "-").trim() === normalizedField
    );
    if (!alreadyPresent) {
      this.state.evidence.addPair(storagePath, targetPath, role, RelationType.DEFINED, LinkDirection.FROM, {
        sourceKind: "frontmatter-ontology",
        definition: normalizedField,
        fieldName: field,
      });
    }

    resolveEvidencePair(this.state.pages, this.state.evidence, storagePath, targetPath);
    resolveEvidencePair(this.state.pages, this.state.evidence, targetPath, storagePath);
    if (source.file) source.mtime = source.file.stat.mtime;
    this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
    this.emit();
    this.scheduleSnapshotPersist(SNAPSHOT_EDIT_IDLE_MS);
    return true;
  }

  applyFrontmatterRelationshipRemoval(storagePath: string, targetPath: string, field: string): boolean {
    const source = this.get(storagePath);
    const target = this.get(targetPath);
    if (!source || !target) return false;
    const normalizedField = field.toLowerCase().replace(/\s+/g, "-").trim();
    const removed = this.state.evidence.removeDeclarationsTouching(storagePath, (item) =>
      item.sourceKind === "frontmatter-ontology" &&
      item.declaredByPath === storagePath &&
      item.declaredTargetPath === targetPath &&
      (item.fieldName ?? item.definition ?? "").toLowerCase().replace(/\s+/g, "-").trim() === normalizedField
    );
    if (!removed) return false;

    resolveEvidencePair(this.state.pages, this.state.evidence, storagePath, targetPath);
    resolveEvidencePair(this.state.pages, this.state.evidence, targetPath, storagePath);
    if (source.file) source.mtime = source.file.stat.mtime;
    this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
    this.emit();
    this.scheduleSnapshotPersist(SNAPSHOT_EDIT_IDLE_MS);
    return true;
  }

  explainRelationship(sourcePath: string, targetPath: string): RelationshipExplanation | null {
    const source = this.get(sourcePath);
    const target = this.get(targetPath);
    if (!source || !target) return null;
    return explainResolvedRelationship(
      source,
      target,
      this.state.evidence.between(source.path, target.path),
      this.plugin.settings.inferAllLinksAsFriends,
    );
  }

  isVisiblePage(page: GraphPage, settings: KplexSettings = this.plugin.settings): boolean {
    if (settings.excludeFilepaths.some((prefix) => page.path.startsWith(prefix))) return false;
    const isVirtual = !page.file && !page.isFolder && !page.isTag && !page.url;
    const isAttachment = Boolean(page.file && page.file.extension !== "md");
    if (!settings.showVirtualNodes && isVirtual) return false;
    if (!settings.showAttachments && isAttachment) return false;
    if (!settings.showFolderNodes && page.isFolder) return false;
    if (!settings.showTagNodes && page.isTag) return false;
    if (!settings.showPageNodes && !page.isFolder && !page.isTag && !isAttachment && !page.url) return false;
    if (!settings.showURLNodes && page.url) return false;
    return true;
  }

  /** Sort a rendered zone without changing graph topology or rebuilding the index. */
  sortNeighbours(items: readonly Neighbour[]): Neighbour[] {
    if (items.length < 2) return [...items];
    const order = this.plugin.settings.nodeSortOrder;
    const keyed = items.map((item, index) => ({
      item,
      index,
      title: this.titleFor(item.page),
      modified: item.page.file?.stat.mtime ?? item.page.mtime ?? 0,
      created: item.page.file?.stat.ctime ?? 0,
      connections: item.page.neighbours.size,
    }));
    keyed.sort((a, b) => {
      let primary = 0;
      switch (order) {
        case "name-desc": primary = naturalCompare(b.title, a.title); break;
        case "modified-desc": primary = b.modified - a.modified; break;
        case "modified-asc": primary = a.modified - b.modified; break;
        case "created-desc": primary = b.created - a.created; break;
        case "created-asc": primary = a.created - b.created; break;
        case "connections-desc": primary = b.connections - a.connections; break;
        case "connections-asc": primary = a.connections - b.connections; break;
        case "name-asc": primary = naturalCompare(a.title, b.title); break;
      }
      if (primary) return primary;
      const titleOrder = naturalCompare(a.title, b.title);
      return titleOrder || a.index - b.index;
    });
    return keyed.map((entry) => entry.item);
  }

  private relationViewSignature(): string {
    const settings = this.plugin.settings;
    return [
      settings.showInferredNodes ? "1" : "0",
      settings.showVirtualNodes ? "1" : "0",
      settings.showAttachments ? "1" : "0",
      settings.showFolderNodes ? "1" : "0",
      settings.showTagNodes ? "1" : "0",
      settings.showPageNodes ? "1" : "0",
      settings.showURLNodes ? "1" : "0",
      settings.renderAlias ? "1" : "0",
      settings.nodeSortOrder,
      settings.nodeTitleScript,
      settings.excludeFilepaths.join("\u0002"),
    ].join("\u0001");
  }

  private relationView(page: GraphPage): CachedRelationView {
    const signature = this.relationViewSignature();
    const cached = this.relationViewCache.get(page);
    if (cached?.signature === signature) return cached;

    const settings = this.plugin.settings;
    const roles: CachedRelationView["roles"] = {
      parent: [],
      child: [],
      left: [],
      right: [],
      previous: [],
      next: [],
    };
    const gateStats: GateStats = {
      top: { visibleCount: 0, hasAny: false },
      bottom: { visibleCount: 0, hasAny: false },
      left: { visibleCount: 0, hasAny: false },
      right: { visibleCount: 0, hasAny: false },
    };
    const visibleGatePaths: Record<GateSide, Set<string>> = {
      top: new Set<string>(),
      bottom: new Set<string>(),
      left: new Set<string>(),
      right: new Set<string>(),
    };
    const uniqueVisible = new Set<string>();

    const roleGate = (role: Exclude<Role, "sibling">): GateSide => {
      if (role === "parent") return "top";
      if (role === "child") return "bottom";
      if (role === "left" || role === "previous") return "left";
      return "right";
    };
    const typeDefinitionFor = (relation: Relation, role: Exclude<Role, "sibling">): string | undefined => {
      switch (role) {
        case "parent": return relation.parentTypeDefinition;
        case "child": return relation.childTypeDefinition;
        case "left": return relation.leftFriendTypeDefinition;
        case "right": return relation.rightFriendTypeDefinition;
        case "previous": return relation.previousFriendTypeDefinition;
        case "next": return relation.nextFriendTypeDefinition;
      }
    };

    const concreteRoles: Array<Exclude<Role, "sibling">> = ["parent", "child", "left", "right", "previous", "next"];
    for (const relation of page.neighbours.values()) {
      if (relation.isHidden) continue;

      // A filled gate represents semantic relationships even when the target is currently hidden.
      for (const role of concreteRoles) {
        if (classifyRelation(relation, role, settings.inferAllLinksAsFriends) !== null) gateStats[roleGate(role)].hasAny = true;
      }

      if (!this.isVisiblePage(relation.target, settings)) continue;
      for (const role of concreteRoles) {
        const relationType = classifyRelation(relation, role, settings.inferAllLinksAsFriends);
        if (!relationType || (relationType === RelationType.INFERRED && !settings.showInferredNodes)) continue;
        roles[role].push({
          page: relation.target,
          relationType,
          typeDefinition: typeDefinitionFor(relation, role),
          linkDirection: relation.direction,
          role,
        });
        visibleGatePaths[roleGate(role)].add(relation.target.path);
        uniqueVisible.add(relation.target.path);
      }
    }

    for (const role of concreteRoles) {
      roles[role] = this.sortNeighbours(roles[role]);
    }
    gateStats.top.visibleCount = visibleGatePaths.top.size;
    gateStats.bottom.visibleCount = visibleGatePaths.bottom.size;
    gateStats.left.visibleCount = visibleGatePaths.left.size;
    gateStats.right.visibleCount = visibleGatePaths.right.size;

    const result: CachedRelationView = { signature, roles, gateStats, neighbourCount: uniqueVisible.size };
    this.relationViewCache.set(page, result);
    return result;
  }

  neighbours(page: GraphPage, role: Role): Neighbour[] {
    return role === "sibling" ? [] : this.relationView(page).roles[role];
  }

  /** Return semantic parent pages without applying presentation visibility filters. Creation flows
   * use this to resolve a ghost note's destination from every parent that actually defines it, even
   * when one of those parents is currently outside the rendered Plex. */
  semanticParentPages(page: GraphPage): GraphPage[] {
    const result: GraphPage[] = [];
    for (const relation of page.neighbours.values()) {
      if (relation.isHidden) continue;
      if (classifyRelation(relation, "parent", this.plugin.settings.inferAllLinksAsFriends) === null) continue;
      result.push(relation.target);
    }
    return result;
  }

  /** Resolve visible semantic relationships from one page to a supplied set of already-visible
   * targets. Cross-link layout calls this once per displayed page, so work scales with graph
   * degree rather than with every possible pair of visible nodes. */
  visibleRelationshipsWithin(source: GraphPage, targetPaths: ReadonlySet<string>): Neighbour[] {
    const settings = this.plugin.settings;
    const result: Neighbour[] = [];
    const definitionFor = (relation: Relation, role: Exclude<Role, "sibling">): string | undefined => {
      switch (role) {
        case "parent": return relation.parentTypeDefinition;
        case "child": return relation.childTypeDefinition;
        case "left": return relation.leftFriendTypeDefinition;
        case "right": return relation.rightFriendTypeDefinition;
        case "previous": return relation.previousFriendTypeDefinition;
        case "next": return relation.nextFriendTypeDefinition;
      }
    };

    const roles = ["parent", "child", "left", "right", "previous", "next"] as const;
    for (const relation of source.neighbours.values()) {
      if (!targetPaths.has(relation.target.path) || relation.isHidden || !this.isVisiblePage(relation.target)) continue;
      for (const role of roles) {
        const relationType = classifyRelation(relation, role, settings.inferAllLinksAsFriends);
        if (!relationType || (relationType === RelationType.INFERRED && !settings.showInferredNodes)) continue;
        result.push({
          page: relation.target,
          relationType,
          typeDefinition: definitionFor(relation, role),
          linkDirection: relation.direction,
          role,
        });
        // RelationResolver's precedence can expose several raw flags, but K-Plex renders one
        // resolved semantic role for a pair, matching the center-neighbourhood classification.
        break;
      }
    }
    return result;
  }

  isConnected(source: GraphPage, targetPath: string): boolean {
    if (source.neighbours.has(targetPath)) return true;
    const target = this.get(targetPath);
    return target?.neighbours.has(source.path) ?? false;
  }

  gateStats(page: GraphPage): GateStats {
    return this.relationView(page).gateStats;
  }

  gateNeighbourPaths(page: GraphPage, gate: GateSide): Set<string> {
    const roleSets: Record<GateSide, Array<Exclude<Role, "sibling">>> = {
      top: ["parent"],
      bottom: ["child"],
      left: ["left", "previous"],
      right: ["right", "next"],
    };
    const paths = new Set<string>();
    // Relationship editing must honor the semantic connection even when its target is
    // hidden by the current inferred/type visibility filters. This is the same distinction
    // used by gateStats(): gate fill represents all relationships, while the count represents
    // only the currently visible ones.
    for (const relation of page.neighbours.values()) {
      if (relation.isHidden) continue;
      if (roleSets[gate].some((role) => classifyRelation(relation, role, this.plugin.settings.inferAllLinksAsFriends) !== null)) paths.add(relation.target.path);
    }
    return paths;
  }

  getNeighborhood(path: string): Neighborhood | null {
    const center = this.get(path);
    if (!center) return null;
    const max = this.plugin.settings.maxItemCount;
    const parents = this.neighbours(center, "parent").slice(0, max);
    const children = this.neighbours(center, "child").slice(0, max);
    const leftFriends = [...this.neighbours(center, "left"), ...this.neighbours(center, "previous")].slice(0, max);
    const rightFriends = [...this.neighbours(center, "right"), ...this.neighbours(center, "next")].slice(0, max);

    const occupied = new Set([center.path, ...parents.map((n) => n.page.path), ...children.map((n) => n.page.path), ...leftFriends.map((n) => n.page.path), ...rightFriends.map((n) => n.page.path)]);
    const parentPaths = new Set(parents.map((n) => n.page.path));
    const siblingsMap = new Map<string, Neighbour>();
    if (this.plugin.settings.renderSiblings) {
      for (const parent of parents) {
        for (const sibling of this.neighbours(parent.page, "child")) {
          if (occupied.has(sibling.page.path) || !parentPaths.has(parent.page.path)) continue;
          const previous = siblingsMap.get(sibling.page.path);
          siblingsMap.set(sibling.page.path, {
            ...sibling,
            role: "sibling",
            relationType: previous?.relationType === RelationType.DEFINED || sibling.relationType === RelationType.DEFINED ? RelationType.DEFINED : RelationType.INFERRED
          });
        }
      }
    }
    const siblings = this.sortNeighbours([...siblingsMap.values()]).slice(0, max);
    const result = { center, parents, children, leftFriends, rightFriends, siblings };
    return result;
  }

  /** Select a display name from MetadataCache only, using the prepared or explicitly staged policy. */
  private displayNameFromConfiguredFields(page: GraphPage, settings = this.presentationSettings): string | null {
    if (!settings.renderAlias) return null;
    const fields = settings.nameFields
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean);
    if (!fields.length) return null;

    const firstTextValue = (value: unknown): string | null => {
      if (Array.isArray(value)) {
        for (const item of value) {
          const candidate = firstTextValue(item);
          if (candidate) return candidate;
        }
        return null;
      }
      if (typeof value !== "string") return null;
      const text = value.trim();
      return text || null;
    };

    const frontmatter = page.file ? this.app.metadataCache.getFileCache(page.file)?.frontmatter : null;
    for (const requested of fields) {
      const normalized = normalizeFieldName(requested);
      // Using `aliases` must be byte-for-byte equivalent to the historical Render aliases behavior.
      if (normalized === "aliases" || normalized === "alias") {
        const alias = page.aliases.find((value) => value.trim().length > 0);
        if (alias) return alias.trim();
        continue;
      }
      if (!frontmatter) continue;
      for (const [key, value] of Object.entries(frontmatter)) {
        if (key === "position" || normalizeFieldName(key) !== normalized) continue;
        const candidate = firstTextValue(value);
        if (candidate) return candidate;
        break;
      }
    }
    return null;
  }

  /** Read the synchronous prepared display facade; no storage or parsing occurs during render. */
  titleFor(page: GraphPage): string {
    const settings = this.presentationSettings;
    const signature = [
      page.mtime ?? 0,
      settings.renderAlias ? "1" : "0",
      settings.nameFields,
      settings.nodeTitleScript,
      page.aliases[0] ?? "",
      page.name,
    ].join("\u0001");
    const cached = this.titleCache.get(page.path);
    if (cached?.signature === signature) {
      return cached.title;
    }

    // Custom JavaScript title expressions from legacy ExcaliBrain settings are intentionally not
    // executed. Community plugins must remain statically analyzable and must not execute user-provided JavaScript.
    const title = this.displayNameFromConfiguredFields(page) ?? page.name;
    this.titleCache.set(page.path, { signature, title });
    return title;
  }

  neighbourCount(page: GraphPage): number {
    return this.relationView(page).neighbourCount;
  }

  search(query: string, limit = 40): GraphPage[] {
    const q = query.trim().toLowerCase();
    const settings = this.plugin.settings;
    const max = Math.max(1, limit);

    if (!q) {
      const output: GraphPage[] = [];
      const seen = new Set<string>();
      const preferred = [...this.searchEntryPointPaths, ...this.plugin.settings.pinnedNodes];
      for (const path of preferred) {
        const page = this.get(path);
        if (!page || seen.has(page.path) || !this.isVisiblePage(page, settings)) continue;
        seen.add(page.path);
        output.push(page);
        if (output.length >= max) return output;
      }
      for (const entry of this.searchEntries) {
        if (seen.has(entry.page.path) || !this.isVisiblePage(entry.page, settings)) continue;
        seen.add(entry.page.path);
        output.push(entry.page);
        if (output.length >= max) break;
      }
      return output;
    }

    // A match for a longer query must also match every prefix of that query. Reuse the longest
    // cached prefix so normal typing progressively searches a much smaller candidate set instead
    // of rescanning 100k+ thoughts on every keypress. Cache textual matches independently from
    // visibility so toggling graph filters cannot make the cache incorrect.
    let candidates = this.searchEntries;
    for (let length = q.length - 1; length >= 1; length -= 1) {
      const prefix = q.slice(0, length);
      const cached = this.searchCandidateCache.get(prefix);
      if (!cached) continue;
      candidates = cached;
      break;
    }

    const textualMatches: SearchEntry[] = [];
    const best: Array<{ page: GraphPage; score: number }> = [];
    for (const entry of candidates) {
      const score = searchEntryScore(entry, q);
      if (score === null) continue;
      textualMatches.push(entry);
      if (!this.isVisiblePage(entry.page, settings)) continue;
      if (best.length >= max && score >= best[best.length - 1].score) continue;

      let at = best.length;
      while (at > 0 && score < best[at - 1].score) at -= 1;
      best.splice(at, 0, { page: entry.page, score });
      if (best.length > max) best.pop();
    }

    this.searchCandidateCache.set(q, textualMatches);
    // Keep a small LRU-ish working set. SearchBox queries are generally a single prefix chain;
    // retaining the most recent dozen prefixes gives fast typing and backspacing without keeping
    // large candidate arrays forever.
    while (this.searchCandidateCache.size > 12) {
      const oldest = this.searchCandidateCache.keys().next();
      if (oldest.done) break;
      this.searchCandidateCache.delete(oldest.value);
    }

    return best.map((item) => item.page);
  }
}
