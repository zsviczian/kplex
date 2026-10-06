/**
 * Published graph repository for K-Plex. It owns snapshot restoration/persistence, search and
 * presentation caches, atomic per-file publication and source-backed startup adoption; builders stage
 * semantics privately. With durable neutral sources, available preview scopes prepare before optional
 * full snapshot hydration. After cache loss, the same compiler restores complete node vocabulary
 * without relationships, independently of display-only controls, and finite changed-owner incidence
 * closes shared synthetic lifetimes. Physical filenames remain searchable during bounded previews;
 * terminal requested failures retain exact lifetime facts rather than implying active work. Legacy
 * URL alias cache facets replay from authenticated neutral facts without replacing cached relations.
 * Optional alias owners join current requested preparations and their existing supersession retries
 * before changing repository fences; exact failed-demand records prevent repetitive background retries.
 * Exact canonical editable pairs compose over coherent scopes under their own semantic policy;
 * source invalidation closes their authority without erasing saved presentation. Complete matching
 * publications retire their bounded evidence/negative replacements. Partial induced pages retain
 * their compiling policy and retain separately certified gate counts from the raw-degree pass;
 * incomplete counts stay explicit while connection sorting defers unknown
 * total degrees rather than treating induced incidence as a complete total.
 * Finite requested physical notes capture current canonical alias facets separately from sparse
 * incidence, under the same byte ceiling, cooperative runtime and final file/cache/source fences.
 * Unaffected trusted warm incidence remains navigable across known metadata observations; local
 * folder membership certifies only structural gate presentation, never body or editing authority.
 * This class decides when partial cold-start or authoritative state may
 * become visible to UI readers.
 * Requested previews, cached preparation and hydration release CPU slices through host event tasks;
 * this owner retains its existing watchdog, delayed persistence and cancellation boundaries.
 */
import { yieldToHostTask } from "../adapters/obsidian/yieldToHostTask";
import { ForegroundWorkScheduler, type IndexWorkPriority } from "./ForegroundWorkScheduler";
import { HostMetadataPreview } from "./HostMetadataPreview";
import { ObsidianSourceAcquisition } from "../adapters/obsidian/sourceAcquisition";
import { graphCompilerSettingsFromLegacy, graphNodeViewFromLegacy } from "../adapters/obsidian/graphContracts";
import type { CompiledGraphNode, GraphCompilerRuntime, GraphCompilerSettings } from "../core/graph/compiler";
import type { NodeId } from "../core/graph/model";
import { estimateReferenceRecordBytes, type SourceEntityRef } from "../core/graph/source";
import { RelationEvidenceStore } from "../core/graph/evidence";
import { Platform, TFile, TFolder, normalizePath, type App, type CachedMetadata } from "obsidian";
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
import { extractLinksFromValue, iterateFrontmatterAliasSteps } from "./fieldParser";
import { MAX_CACHED_SCOPE_RETAINED_BYTES } from "./CachedSourceSemantics";
import { KplexIndexedDbCache, URL_ALIAS_FACET_VERSION, sanitizeIndexDiagnostics, type IndexedDbSnapshotMeta, type IndexDiagnosticEntry,
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

type PreparedSemanticPageInfo = Readonly<{
  entityId: NodeId;
  policyRevision: number;
  settings: GraphCompilerSettings;
  completeRelations: boolean;
  rawDegree?: number;
  /** Count-only proof does not certify complete incidence or relationship editing authority. */
  gates?: GateStats;
  /** Visibility snapshot used by the count-only proof, independent of incidence completeness. */
  gateCoverageSignature?: string;
  /** Pair-overlay version at atomic count publication; later overlays cannot reuse old totals. */
  gatePairRevision?: number;
}>;

type PreparedSemanticScope = Readonly<{
  centerPath: string;
  policyRevision: number;
  demandRevision: number;
  sourceRevision: number;
  maintenanceRevision: number;
  presentationRevision: number;
  coverageSignature: string;
  settings: GraphCompilerSettings;
  pagesByPath: ReadonlyMap<string, GraphPage>;
  completePaths: ReadonlySet<string>;
  evidence: RelationEvidenceStore;
  gates: GateStats;
  suppressedPaths: ReadonlySet<string>;
}>;

/** Exact canonical pair publication. Retained views survive invalidation; authority never does. */
type PreparedRelationshipPair = Readonly<{
  paths: readonly [string, string]; settings: GraphCompilerSettings; evidence: RelationEvidenceStore;
  relations: ReadonlyMap<string, Relation | undefined>; policyRevision: number; sourceRevision: number;
  maintenanceRevision: number; bytes: number; current: () => boolean;
}>;

/** Collision-free unordered physical/semantic coordinates; opaque node IDs remain adapter-owned. */
function relationshipPairKey(a: string, b: string): string { return JSON.stringify(a < b ? [a, b] : [b, a]); }

/** Aggregate-only SI4 diagnostics; no source contents or user values are retained here. */
export type SemanticPreparationDiagnostics = Readonly<{
  policyRevision: number;
  requested: number;
  prepared: number;
  published: number;
  cancelled: number;
  pending: number;
  dependencyVisits: number;
  fullBuilds: number;
  lastReason: string | null;
}>;

type FileRevision = { mtime: number; size: number };
/** Current finite physical metadata identities; they grant facets only under the final source/file/cache fence. */
type SelectedMetadataToken = Readonly<{ file: TFile; cache: CachedMetadata; revision: FileRevision }>;
/** Alias-only staging shares the existing requested retention ceiling and never claims source acquisition. */
type PreparedPhysicalAliases = Readonly<{ reason: "ready"; byPath: ReadonlyMap<string, string[]>; retainedBytes: number }>
  | Readonly<{ reason: "decode-budget" | "superseded" }>;

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
type SnapshotHydrationPhase =
  | "idle"
  | "metadata"
  | "preview"
  | "source-authority"
  | "requested-semantics"
  | "node-vocabulary"
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
  private presentationRevision = 0;
  /** Only canonical facet/search policy changes supersede legacy URL vocabulary preparation. */
  private aliasVocabularyPresentationRevision = 0;
  private publicationRevision = 0;
  private semanticRevision = 0;
  private semanticPolicyRevision = 1;
  private fullSemanticPolicyRevision = 0;
  private fullSemanticMaintenanceRevision = 0;
  private fullSemanticSourceRevision = 0;
  private fullSemanticSettings: GraphCompilerSettings;
  private semanticDemandRevision = new Map<string, number>();
  private semanticDemandCounts = new Map<string, number>();
  private folderRenameTasks = new WeakMap<TFolder, Promise<void>>();
  private pendingStructuralTasks = 0;
  private semanticScopes = new Map<string, PreparedSemanticScope>();
  /** Weak publication/presentation identities prevent repeated optional sibling work in one lifetime. */
  private siblingEnrichmentScopes = new WeakMap<PreparedSemanticScope, number>();
  /** Saved pairs compose until a complete matching publication replaces them; there is no arbitrary eviction. */
  private relationshipPairs = new Map<string, PreparedRelationshipPair>();
  private relationshipPairBytes = 0;
  private relationshipPairRevision = 0;
  private relationshipPairTasks = new Map<string, Promise<boolean>>();
  /** Share selected observations and drain only older tasks borrowing the same document source owners. */
  private relationshipPairTaskObservations = new WeakMap<Promise<boolean>, Readonly<{
    current: () => boolean; owners: readonly string[];
  }>>();
  private relationshipPairViews = new WeakMap<GraphPage, { revision: number; page: GraphPage }>();
  private semanticPreparationTasks = new Map<string, Readonly<{
    policyRevision: number; demandRevision: number; maintenanceRevision: number; coverageSignature: string;
    sourceRevision: number; publicationRevision: number; presentationRevision: number; task: Promise<void>;
  }>>();
  /** Terminal outcomes are scoped to the exact demand/source lifetime; another center can recover independently. */
  private semanticPreparationFailures = new Map<string, Readonly<{
    policyRevision: number; demandRevision: number; sourceRevision: number; maintenanceRevision: number;
    coverageSignature: string; reason: string;
  }>>();
  /** Optional work retries each exact transient failure only once in a stable primary window. */
  private aliasPriorityFailures = new WeakSet<object>();
  private preparedPageInfo = new WeakMap<GraphPage, PreparedSemanticPageInfo>();
  private semanticPreparationDiagnostics: SemanticPreparationDiagnostics = {
    policyRevision: 1, requested: 0, prepared: 0, published: 0, cancelled: 0, pending: 0,
    dependencyVisits: 0, fullBuilds: 0, lastReason: null,
  };
  private readonly workScheduler = new ForegroundWorkScheduler();
  private readonly hostPreview: HostMetadataPreview;
  private hostPreviewScopes = new Map<string, ReturnType<typeof createGraphState>>();
  private hostPreviewSettings = new WeakMap<GraphPage, GraphCompilerSettings>();
  /** Count-only native folder proofs are scoped to visibility and observed tree lifetime. */
  private folderGateInfo = new WeakMap<GraphPage, Readonly<{
    gates: Partial<GateStats>; coverageSignature: string; structuralRevision: number;
  }>>();
  private hostStructuralRevision = 0;
  private hostPreviewRequests = new Map<string, number>();
  private hostBacklinksReady: Promise<void> | null = null;
  private fieldCache = new Map<string, FieldCacheEntry>();
  /** Compact semantic fingerprints survive hot-body LRU eviction so prose-only edits stay cheap. */
  private semanticFingerprints = new Map<string, string>();
  private generation = 0;
  private building = false;
  private checkpointSaving = false;
  private rebuildQueued = false;
  private searchEntries: SearchEntry[] = [];
  /** Physical search facets cover files outside a bounded startup preview, without semantic relations. */
  private physicalSearchEntries = new Map<string, SearchEntry>();
  private physicalSearchMerge: { base: SearchEntry[]; physical: Map<string, SearchEntry>; entries: SearchEntry[] } | null = null;
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
  /** One restore-owned observer; the existing source scheduler owns all transient retries. */
  private startupSourceAuthorityWaiter: { check: () => void; cancel: () => void } | null = null;
  private snapshotHydrationDiagnostics: SnapshotHydrationDiagnostics = {
    run: 0, phase: "idle", lastActivePhase: "idle", startedAt: null, phaseStartedAt: null, lastProgressAt: null,
    pages: 0, relations: 0, evidence: 0, outcome: "idle",
  };
  private navigableSnapshotSourceRevision: number | null = null;
  /** Paths whose incidence was touched after the trusted warm publication, including old targets. */
  private retiredSnapshotPaths = new Set<string>();
  /** Primitive physical revisions captured during hydration; live TFile stats are mutable. */
  private snapshotFileRevisions = new WeakMap<GraphPage, ReturnType<typeof captureFileRevision>>();
  /** Host observations also fence warm presentation when managed writes suppress dirty revisions. */
  private hostPresentationRevision = 0;
  private fullSnapshotHydrated = false;
  private fullSnapshotFresh = false;
  /** A graph borrowed during neutral-source startup is acceleration, never requested semantic authority. */
  private sourceBackedSemantics = false;
  /** Complete physical inventory with requested semantics; it is deliberately not a full graph. */
  private sourceBackedStartup = false;
  private warmSourceRecoveryAvailable = false;
  private sourceNodeVocabularyPublished = false;
  private urlAliasFacetVersion = URL_ALIAS_FACET_VERSION;
  private pendingUrlAliasUpgrade = false;
  private urlAliasUpgradeTask: Promise<void> | null = null;
  private urlAliasUpgradeFailure: { token: string; reason: string } | null = null;
  private urlAliasUpgradeProgress: { phase: "repair" | "vocabulary"; processed: number; total: number | null } | null = null;
  private nodeImpactTask: Promise<void> | null = null;
  private previewSnapshotPublished = false;
  private activeSnapshotGeneration: string | null = null;
  private nodeVisualCache = new Map<string, { signature: string; visual: NodeVisual | null }>();
  constructor(private plugin: KplexPlugin, private app: App = plugin.app) {
    this.presentationSettings = capturePresentationSettings(plugin.settings);
    this.fullSemanticSettings = graphCompilerSettingsFromLegacy(plugin.settings);
    this.indexedDb = new KplexIndexedDbCache(app.vault.getName(), () => this.workScheduler.checkpoint(3),
      /** Dense sources can finish real chunks long before their whole inventory owner completes. */
      () => {
        if (!this.diagnosticsClosed && this.snapshotHydrationDiagnostics.phase === "source-authority") {
          this.touchSnapshotHydrationProgress(this.snapshotHydrationRun);
        }
      });
    this.sourceAcquisition = new ObsidianSourceAcquisition(app, this.indexedDb, (text, backgroundCheckpoint) => this.metadataParser.parse(text, backgroundCheckpoint),
      /** Source closure wakes a deferred restore and retries only current visible semantic demand. */
      () => {
        this.startupSourceAuthorityWaiter?.check();
        this.retryDemandedSemanticScopes();
        this.retrySourceNodeImpacts();
        this.retryUrlAliasUpgrade();
      },
      /** Completed inventory work advances the existing stall watchdog, never acquisition behavior. */
      () => {
        if (this.snapshotHydrationDiagnostics.phase === "source-authority") {
          this.touchSnapshotHydrationProgress(this.snapshotHydrationRun);
          this.plugin.notifyStartupProgress?.();
        }
      }, plugin.startupDiagnostics, () => this.workScheduler.checkpoint(3));
    this.hostPreview = new HostMetadataPreview(app, () => plugin.settings, this.semanticPreparationRuntime(() => !this.diagnosticsClosed));
    // Remove the old parsed-body localStorage payload. IndexedDB is now the only durable index
    // cache; localStorage is a poor fit for large vaults because serialization duplicates memory.
    void this.indexedDb.clearLegacyLocalStorage(app);
  }

  /** Run a user-visible operation independently of unrelated background work. */
  withForegroundPriority<T>(work: () => Promise<T>, priority: IndexWorkPriority = 0): Promise<T> {
    return this.workScheduler.run(priority, work);
  }

  /** A fully drained host event batch may retire provisional presentation freshness for the complete graph. */
  acknowledgeHostPresentation(): void {
    this.fullSemanticSourceRevision = this.plugin.getIndexSourceRevision();
  }

  /** Canonicalize one visible source ahead of unrelated dirty files; background builds retain their progress. */
  refreshVisibleMarkdownPath(path: string): Promise<void> {
    return this.withForegroundPriority(async () => {
      // Defer a newly scheduled visible patch while an actual mutation owns the higher lane.
      await this.workScheduler.checkpoint(2);
      const file = this.app.vault.getFileByPath(path);
      if (!file || file.extension !== "md" || this.diagnosticsClosed) return;
      if (!this.building && this.state.pages.has(path)) await this.patchMarkdownPaths([path]);
      else for (const [center, count] of this.semanticDemandCounts) {
        if (count > 0 && (center === path || this.get(center)?.neighbours.has(path))) await this.ensureSemanticScope(center);
      }
    }, 2);
  }

  /** Inspect aggregate scheduling activity; request identities and vault content are never retained. */
  getWorkPriorityDiagnostics() { return this.workScheduler.diagnostics(); }

  /** Prime physical Find immediately after layout-ready, without opening durable storage or parsing bodies. */
  async primePhysicalSearchCatalog(): Promise<void> {
    await this.preparePhysicalSearchCatalog(new Map(this.app.vault.getFiles().map(file => [file.path, file])),
      () => !this.diagnosticsClosed);
    this.plugin.startupDiagnostics?.mark("host-search-ready");
  }

  /** Publish a provisional host scope separately from every authoritative graph/evidence owner. */
  async publishHostMetadataPreview(centerPath: string): Promise<void> {
    const publication = this.publicationRevision;
    const sourceRevision = this.plugin.getIndexSourceRevision();
    const folder = centerPath.startsWith("folder:"), structuralRevision = this.hostStructuralRevision;
    const coverageSignature = this.semanticCoverageSignature();
    const compilerSignature = JSON.stringify(graphCompilerSettingsFromLegacy(this.plugin.settings));
    if (this.hasCurrentCanonicalCenter(centerPath)) return;
    const request = (this.hostPreviewRequests.get(centerPath) ?? 0) + 1;
    this.hostPreviewRequests.set(centerPath, request);
    // Native folder membership is independent of the global Markdown backlink scan.
    if (!folder) {
      this.hostBacklinksReady ??= this.hostPreview.initializeBacklinks();
      await this.hostBacklinksReady;
    }
    if (this.diagnosticsClosed) return;
    const preview = await this.hostPreview.build(centerPath);
    if (!preview || this.diagnosticsClosed || this.hostPreviewRequests.get(centerPath) !== request
      || (folder ? structuralRevision !== this.hostStructuralRevision || coverageSignature !== this.semanticCoverageSignature()
        || compilerSignature !== JSON.stringify(graphCompilerSettingsFromLegacy(this.plugin.settings))
        : publication !== this.publicationRevision || sourceRevision !== this.plugin.getIndexSourceRevision())
      || this.hasCurrentCanonicalCenter(centerPath)) return;
    this.hostPreviewScopes.set(centerPath, preview.state);
    for (const page of preview.state.pages.values()) this.hostPreviewSettings.set(page, preview.settings);
    for (const [path, gates] of preview.structuralGates ?? []) {
      const page = preview.state.pages.get(path);
      if (page) this.folderGateInfo.set(page, { gates, coverageSignature,
        structuralRevision: this.hostStructuralRevision });
    }
    this.plugin.startupDiagnostics?.mark("host-preview-ready");
    this.emitPresentation();
    void this.withForegroundPriority(() => this.prepareVisibleFolderGates(preview.state.pages.values(),
      () => this.hostPreviewScopes.get(centerPath) === preview.state), 2);
  }

  /** Retire native membership proofs on every Vault topology event, including pre-restore events. */
  invalidateHostStructure(): void {
    this.hostStructuralRevision += 1;
    this.navigableSnapshotSourceRevision = null;
    this.folderGateInfo = new WeakMap();
    this.relationViewCache = new WeakMap();
    // Run after the synchronous Vault listener has applied its delta/source revision. Recounting
    // before that boundary could certify a cover which the listener immediately supersedes.
    void Promise.resolve().then(/** Refresh only currently demanded folder centers after synchronous host reconciliation. */ async () => {
      if (this.diagnosticsClosed) return;
      const centers = new Set([...this.semanticDemandCounts.keys(), this.plugin.settings.lastActivePath]);
      for (const path of centers) if (path?.startsWith("folder:")) {
        await this.withForegroundPriority(() => this.publishHostMetadataPreview(path), 2);
      }
      for (const path of centers) {
        const semantic = this.semanticScopes.get(path), preview = this.hostPreviewScopes.get(path);
        if (semantic) await this.withForegroundPriority(() => this.prepareVisibleFolderGates(semantic.pagesByPath.values(),
          () => this.semanticScopes.get(path) === semantic), 2);
        if (preview) await this.withForegroundPriority(() => this.prepareVisibleFolderGates(preview.pages.values(),
          () => this.hostPreviewScopes.get(path) === preview), 2);
      }
    });
  }

  /**
   * Supplement only finite displayed folder endpoints with parent/child totals. Each native folder
   * is counted independently; no descendant graph is retained and no incidence/write proof changes.
   * Scope replacement, topology and visibility fence every awaited result. Markdown metadata
   * events do not change native membership and must not cancel unrelated structural totals.
   */
  private async prepareVisibleFolderGates(pages: Iterable<GraphPage>, ownsScope: () => boolean): Promise<void> {
    const coverageSignature = this.semanticCoverageSignature(), structuralRevision = this.hostStructuralRevision;
    const current = (): boolean => !this.diagnosticsClosed && ownsScope()
      && structuralRevision === this.hostStructuralRevision && coverageSignature === this.semanticCoverageSignature();
    let remaining = Math.min(300, Math.max(1, this.plugin.settings.maxItemCount || 100)), changed = false;
    for (const page of pages) {
      if (!current()) return;
      const existing = this.folderGateInfo.get(page);
      if (!page.isFolder || !this.isVisiblePage(page) || (existing?.coverageSignature === coverageSignature
        && existing.structuralRevision === structuralRevision)) continue;
      if (remaining-- <= 0) break;
      const gates = await this.hostPreview.folderGates(page.path);
      if (!current()) return;
      if (!gates) continue;
      this.folderGateInfo.set(page, { gates, coverageSignature, structuralRevision });
      changed = true;
    }
    if (changed && current()) {
      this.relationViewCache = new WeakMap();
      this.emitPresentation();
    }
  }

  /** A current complete center always outranks an incomplete host presentation. */
  private hasCurrentCanonicalCenter(path: string): boolean {
    const source = this.plugin.getIndexSourceRevision();
    if (this.navigableSnapshotSourceRevision === source && !this.retiredSnapshotPaths.has(path)
      && this.state.pages.has(path)) return true;
    if (!this.sourceBackedSemantics && this.fullSemanticPolicyRevision === this.semanticPolicyRevision
      && this.fullSemanticMaintenanceRevision === this.sourceAcquisition.getMaintenanceRevision()
      && this.fullSemanticSourceRevision === source && this.state.pages.has(path)) return true;
    const scope = this.semanticScopes.get(path);
    return Boolean(scope && scope.policyRevision === this.semanticPolicyRevision
      && scope.maintenanceRevision === this.sourceAcquisition.getMaintenanceRevision()
      && scope.sourceRevision === source && scope.completePaths.has(path));
  }

  /**
   * Refresh affected demanded previews. A caller may supply the revision immediately before this
   * one known metadata event; unrelated or unbounded source revisions never renew warm freshness.
   */
  refreshVisibleHostMetadataPreviews(changedPath: string, previousSourceRevision = this.plugin.getIndexSourceRevision()): boolean {
    const affectedTargets = this.hostPreview.refreshSource(changedPath);
    this.hostPresentationRevision += 1;
    // A resolve/unchanged-stat notification does not invalidate unrelated complete cached incidence.
    // Retire the source and old/new targets. A physical edit or unknown revision may have changed
    // body fields/resolution outside MetadataCache's link map, so retain the conservative fallback.
    const sourceRevision = this.plugin.getIndexSourceRevision();
    const page = this.state.pages.get(changedPath);
    const file = this.app.vault.getFileByPath(changedPath);
    const physicalRevision = page && this.snapshotFileRevisions.get(page);
    if (this.navigableSnapshotSourceRevision !== null) {
      if (this.navigableSnapshotSourceRevision !== previousSourceRevision
        || sourceRevision < previousSourceRevision || sourceRevision > previousSourceRevision + 1
        || !file || !page || page.file !== file || page.mtime !== file.stat.mtime
        || !physicalRevision || !fileRevisionMatches(file, physicalRevision)) {
        this.navigableSnapshotSourceRevision = null;
      }
      else {
        this.navigableSnapshotSourceRevision = sourceRevision;
        this.retiredSnapshotPaths.add(changedPath);
        for (const path of page.neighbours.keys()) this.retiredSnapshotPaths.add(path);
        for (const path of affectedTargets) this.retiredSnapshotPaths.add(path);
        const targets = this.hostPreview.metadataImpactTargets(changedPath, page.aliases);
        if (!targets) this.navigableSnapshotSourceRevision = null;
        else for (const path of targets) this.retiredSnapshotPaths.add(path);
      }
    }
    void this.refreshChangedRelationshipPairs(changedPath);
    const centers = new Set([...this.semanticDemandCounts.keys(), this.plugin.settings.lastActivePath].filter(Boolean));
    let visible = false;
    for (const center of centers) {
      const page = this.hostPreviewScopes.get(center)?.pages.get(center) ?? this.semanticPage(center);
      if (center !== changedPath && !page?.neighbours.has(changedPath) && !affectedTargets.has(center)) continue;
      visible = true;
      void this.withForegroundPriority(() => this.publishHostMetadataPreview(center), 2);
    }
    return visible;
  }

  /**
   * Replace retained pair overlays after an endpoint observation changes. Re-reading only the
   * exact pair preserves earlier saved targets and inverse/body declarations; an incomplete host
   * preview cannot retire their canonical positive or negative coverage. Unrelated source events
   * never touch these replacements, and failed/cancelled preparation retains the coherent view.
   */
  private async refreshChangedRelationshipPairs(changedPath: string): Promise<void> {
    const affected = [...this.relationshipPairs.values()].filter(pair => pair.paths.includes(changedPath) && !pair.current());
    for (const pair of affected) {
      // This optional refresh must not manufacture a competing mutation owner during a save.
      await this.workScheduler.checkpoint(2);
      if (this.diagnosticsClosed) return;
      try { await this.prepareRelationshipPair(...pair.paths); }
      catch { /* A failed optional refresh retains coherent reads; existing current fences close writes. */ }
    }
  }

  /** Aggregate-only neutral persistence status, independent of graph snapshot readiness. */
  getSourceRepositoryDiagnostics() { return this.sourceAcquisition.getDiagnostics(); }
  /** Aggregate acquisition counters for restart/selective-repair validation; never source contents. */
  getSourceAcquisitionCounters() { return this.sourceAcquisition.getCounters(); }
  /** Explicit maintenance durability fence; plugin unload deliberately does not await this. */
  flushSourceRepository(): Promise<boolean> { return this.sourceAcquisition.flush(); }

  /** Start bounded source adoption before optional graph hydration when durable work already exists. */
  private async startPersistedSourceInventory(): Promise<boolean> {
    let after: string | null = null;
    do {
      const page = await this.indexedDb.sources.headPage(after);
      if (this.diagnosticsClosed || !page.available) return false;
      // Obsolete grammar heads require the same bounded repair owner as other cache misses.
      if (page.invalid > 0 || page.heads.some(head => head.state === "complete")) {
        this.sourceAcquisition.enableInventory();
        return true;
      }
      after = page.next;
      await this.workScheduler.checkpoint(3);
    } while (after !== null);
    return false;
  }

  /** Retain a navigable warm graph after supersession while the existing source owner certifies replacements. */
  private retainWarmSourceRecovery(): boolean {
    if (!this.warmSourceRecoveryAvailable || this.diagnosticsClosed) return false;
    this.sourceBackedStartup = true;
    this.sourceBackedSemantics = true;
    this.fullSemanticPolicyRevision = 0;
    this.sourceAcquisition.enableNodeImpactTracking();
    return true;
  }

  /** Recover requested semantics from neutral progress when the optional graph cache is absent. */
  private async restoreSourceBackedBaseline(isCurrent: () => boolean, run: number, preview?: () => void): Promise<boolean> {
    const sourceRevision = this.plugin.getIndexSourceRevision();
    const current = (): boolean => isCurrent() && sourceRevision === this.plugin.getIndexSourceRevision();
    const builder = new GraphBuilder(this.plugin, this.app, this.fieldCache, this.metadataParser,
      this.indexedDb, current, new Map(), this.sourceAcquisition, () => this.workScheduler.checkpoint(3));
    const next = await builder.buildStructuralNodeBaseline();
    if (!next || !current()) return false;
    const prepared = await this.preparePresentationPublication(next, current,
      () => this.touchSnapshotHydrationProgress(run), true);
    if (!prepared || !current() || !prepared.facets.isCurrent()) return false;
    const search = await this.prepareSearchIndex(next, current, () => this.touchSnapshotHydrationProgress(run),
      prepared.settings, prepared.facets);
    if (!search || !current() || !prepared.facets.isCurrent()) return false;
    this.sourceBackedSemantics = true;
    this.sourceBackedStartup = true;
    this.sourceNodeVocabularyPublished = false;
    this.sourceAcquisition.enableNodeImpactTracking();
    this.fullSemanticPolicyRevision = 0;
    this.fullSnapshotHydrated = false;
    this.fullSnapshotFresh = false;
    this.previewSnapshotPublished = false;
    this.resumableCheckpointPaths = null;
    this.acceptPresentation(prepared);
    this.publishRestoredState(next, search, false, false);
    this.recordIndexDiagnostic("restore", "source-backed-physical-baseline");
    preview?.();
    this.setSnapshotHydrationPhase(run, "source-authority");
    if (!(await this.awaitStartupSourceAuthority(current)) || !current()) return false;
    this.setSnapshotHydrationPhase(run, "requested-semantics");
    await this.refreshSemanticSettings();
    if (!current()) return false;
    this.setSnapshotHydrationPhase(run, "node-vocabulary");
    if (!(await this.adoptStartupSources()) || !current()) return false;
    this.finishSnapshotHydrationDiagnostics(run, "complete");
    return true;
  }

  /**
   * Await restart authority across transient resolver waves without abandoning optional acceleration.
   * A cancelled inventory pass is not proof that a valid graph cache was lost. The existing source
   * owner schedules retries; this one restore-owned observer only waits for its readiness signal.
   * The hydration watchdog, policy replacement and unload cancel the observer without a new timer.
   */
  private async awaitStartupSourceAuthority(isCurrent: () => boolean): Promise<boolean> {
    await this.sourceAcquisition.flush();
    if (!isCurrent()) return false;
    if (!this.sourceAcquisition.hasSemanticDependencies()) {
      const ready = await new Promise<boolean>((resolve) => {
        /** Release this exact observer once; a replacement restore owns a different lifetime. */
        const finish = (value: boolean): void => {
          if (this.startupSourceAuthorityWaiter !== waiter) return;
          this.startupSourceAuthorityWaiter = null;
          resolve(value);
        };
        const waiter = {
          /** Readiness comes from actual source closure, never a timer or failed flush result. */
          check: (): void => {
            if (!isCurrent()) finish(false);
            else if (this.sourceAcquisition.hasSemanticDependencies()) finish(true);
          },
          /** The existing restore lifetime cancels immediately even if source work is still pending. */
          cancel: (): void => finish(false),
        };
        this.startupSourceAuthorityWaiter?.cancel();
        this.startupSourceAuthorityWaiter = waiter;
        waiter.check();
      });
      if (!ready || !isCurrent()) return false;
    }
    const saved = await this.indexedDb.sources.flush();
    return saved && isCurrent() && this.sourceAcquisition.hasSemanticDependencies();
  }

  /** Physical maintenance may use a complete inventory without pretending it is a complete graph. */
  hasPhysicalBaseline(): boolean { return this.fullSnapshotHydrated || this.sourceBackedStartup; }
  /** Source-backed startup completion belongs to source adoption, not graph-cache hydration. */
  hasSourceBackedStartup(): boolean { return this.sourceBackedStartup; }
  /**
   * Close source-backed startup in consumer order: source authority, requested scopes, global nodes.
   * The catalog is compiled privately from durable facts and published atomically without evidence.
   * A policy/source/maintenance interruption retains the earlier coherent baseline and returns false
   * to the existing startup coordinator; no partial vocabulary claims readiness. Display-only changes
   * remain live: final presentation preparation captures them without abandoning source adoption.
   */
  async adoptStartupSources(): Promise<boolean> {
    if (!this.sourceBackedStartup || this.diagnosticsClosed) return false;
    if (this.sourceNodeVocabularyPublished && this.sourceAcquisition.hasSemanticDependencies()
      && !this.hasPendingSemanticPreparation()) return true;
    if (!(await this.sourceAcquisition.flush()) || this.diagnosticsClosed) return false;
    await this.refreshSemanticSettings();
    if (!this.sourceAcquisition.hasSemanticDependencies() || this.hasPendingSemanticPreparation()) return false;
    const policy = this.semanticPolicyRevision;
    const presentationPolicy = captureSettingsPolicy(this.plugin.settings);
    const source = this.plugin.getIndexSourceRevision();
    const generation = this.generation, publication = this.publicationRevision;
    const maintenance = this.sourceAcquisition.getMaintenanceRevision();
    const run = this.snapshotHydrationRun;
    const current = (): boolean => !this.diagnosticsClosed && !this.building && this.sourceBackedStartup
      && run === this.snapshotHydrationRun
      && generation === this.generation && publication === this.publicationRevision
      && policy === this.semanticPolicyRevision && source === this.plugin.getIndexSourceRevision()
      // Only compiler-owned node facets invalidate replay. Layout/editor controls do not change
      // source facts; treating them as a failed restore makes the coordinator rebuild from zero.
      && !classifySettingsChange(presentationPolicy, captureSettingsPolicy(this.plugin.settings)).presentationFacets
      && maintenance === this.sourceAcquisition.getMaintenanceRevision() && this.sourceAcquisition.hasSemanticDependencies();
    const builder = new GraphBuilder(this.plugin, this.app, this.fieldCache, this.metadataParser,
      this.indexedDb, current, new Map(), this.sourceAcquisition, () => this.workScheduler.checkpoint(3));
    const next = await builder.buildSourceNodeCatalog(
      /** Real completed node work advances the existing restore inactivity watchdog. */
      () => { if (current()) this.touchSnapshotHydrationProgress(run); });
    if (!next || !current()) return false;
    const prepared = await this.preparePresentationPublication(next, current, undefined, true, true, true);
    if (!prepared || !current() || !prepared.facets.isCurrent()) return false;
    const search = prepared.search;
    if (!search || !current() || !prepared.facets.isCurrent()) return false;
    // No await after accepting presentation: all live node/search publication is one synchronous step.
    this.sourceAcquisition.resetNodeImpacts();
    this.sourceNodeVocabularyPublished = true;
    this.pendingUrlAliasUpgrade = !this.sourceAcquisition.hasCurrentUrlAliasAuthority();
    this.urlAliasFacetVersion = this.pendingUrlAliasUpgrade ? 0 : URL_ALIAS_FACET_VERSION;
    this.urlAliasUpgradeFailure = null;
    this.acceptPresentation(prepared);
    this.publishRestoredState(next, search, false, false);
    return !this.diagnosticsClosed && run === this.snapshotHydrationRun && source === this.plugin.getIndexSourceRevision()
      && policy === this.semanticPolicyRevision && maintenance === this.sourceAcquisition.getMaintenanceRevision()
      && !this.hasPendingSemanticPreparation();
  }

  /** Complete source-backed search vocabulary is separate from current requested-view semantics. */
  hasPendingSearchVocabulary(): boolean {
    return this.pendingUrlAliasUpgrade || this.sourceBackedStartup && (!this.sourceNodeVocabularyPublished || this.nodeImpactTask !== null
      || !this.sourceAcquisition.hasCompleteNodeImpacts() || this.sourceAcquisition.pendingNodeImpactOwners().size > 0);
  }

  /** A terminal global alias upgrade outcome is distinct from current requested-view semantics. */
  getSearchVocabularyFailure(): string | null {
    return this.pendingUrlAliasUpgrade && !this.urlAliasUpgradeTask
      && this.urlAliasUpgradeFailure?.token === this.urlAliasUpgradeToken() ? this.urlAliasUpgradeFailure.reason : null;
  }

  /** Aggregate progress belongs only to the existing optional alias task, never cache hydration. */
  getUrlAliasUpgradeProgress(): Readonly<{ phase: "repair" | "vocabulary"; processed: number; total: number | null }> | null {
    return this.urlAliasUpgradeTask && this.urlAliasUpgradeProgress ? { ...this.urlAliasUpgradeProgress } : null;
  }

  /** Fence source/facet/search authority; render-only changes preserve an unchanged failure or replay. */
  private urlAliasUpgradeToken(): string {
    return `${this.semanticPolicyRevision}:${this.aliasVocabularyPresentationRevision}:${this.plugin.getIndexSourceRevision()}:${this.sourceAcquisition.getMaintenanceRevision()}:${this.sourceAcquisition.hasSemanticDependencies()}`;
  }

  /** Prepare legacy URL alias facets and search privately from authenticated neutral node facts. */
  private async prepareUrlAliasUpgrade(state: ReturnType<typeof createGraphState>, parentCurrent: () => boolean,
    onProgress?: () => void): Promise<{ aliases: ReadonlyMap<GraphPage, readonly string[]>; aliasesByPath: ReadonlyMap<string, readonly string[]>; search: PreparedSearchIndex } | null> {
    const token = this.urlAliasUpgradeToken(), publication = this.publicationRevision;
    const settings = capturePresentationSettings(this.plugin.settings);
    const presentationPolicy = captureSettingsPolicy(settings);
    /** Reject stale source/facet/search authority; layout/editor changes do not alter alias vocabulary. */
    const current = (): boolean => {
      const effects = classifySettingsChange(presentationPolicy, captureSettingsPolicy(this.plugin.settings));
      return parentCurrent() && token === this.urlAliasUpgradeToken()
        && publication === this.publicationRevision && !this.diagnosticsClosed
        && !effects.presentationFacets && !effects.searchTerms;
    };
    if (!this.sourceAcquisition.hasSemanticDependencies()) {
      this.urlAliasUpgradeFailure = { token, reason: "source-authority-pending" };
      return null;
    }
    try {
      let lastProgress = performance.now();
      const repair = await this.sourceAcquisition.prepareUrlAliasVocabulary(current,
        /** Report only actual completed canonical owner repairs, bounded by the established startup notification cadence. */
        (processed, total) => {
          if (!current()) return;
          this.urlAliasUpgradeProgress = { phase: "repair", processed, total };
          if (performance.now() - lastProgress >= 250) {
            lastProgress = performance.now(); this.emitPresentation(); onProgress?.();
          }
        }, /** Requested primary scopes own a stable repository window before the next optional CAS. */
        () => this.prioritizeRequestedSemantics(current));
      if (repair !== "ready" || !current()) {
        if (current()) this.urlAliasUpgradeFailure = { token, reason: repair };
        return null;
      }
      this.urlAliasUpgradeProgress = { phase: "vocabulary", processed: 0, total: null };
      this.emitPresentation();
      const builder = new GraphBuilder(this.plugin, this.app, this.fieldCache, this.metadataParser,
        this.indexedDb, current, new Map(), this.sourceAcquisition, () => this.workScheduler.checkpoint(3));
      const nodes = await builder.buildSourceNodeCatalog(onProgress);
      if (!nodes || !current()) {
        if (current()) this.urlAliasUpgradeFailure = { token, reason: "url-alias-vocabulary-unavailable" };
        return null;
      }
      const aliasesByPath = new Map<string, readonly string[]>();
      let catalogProcessed = 0, catalogSlice = performance.now();
      for (const [path, page] of nodes.pages) {
        if (page.url) aliasesByPath.set(path, page.aliases);
        if ((++catalogProcessed & 255) === 0 && performance.now() - catalogSlice >= 7) {
          onProgress?.();
          await yieldToHostTask();
          await this.workScheduler.checkpoint(3);
          if (!current()) return null;
          catalogSlice = performance.now();
        }
      }
      const aliases = new Map<GraphPage, readonly string[]>();
      let processed = 0, slice = performance.now();
      for (const [path, page] of state.pages) {
        if (page.url) {
          const prepared = nodes.pages.get(path);
          if (prepared?.url) aliases.set(page, prepared.aliases);
        }
        if ((++processed & 255) === 0 && performance.now() - slice >= 7) {
          onProgress?.();
          await yieldToHostTask();
          if (!current()) return null;
          slice = performance.now();
        }
      }
      const search = await this.prepareSearchIndex(state, current, onProgress, settings, null, aliases);
      if (!search || !current()) return null;
      return { aliases, aliasesByPath, search };
    } catch {
      if (current()) this.urlAliasUpgradeFailure = { token, reason: "url-alias-vocabulary-unavailable" };
      return null;
    }
  }

  /** Source readiness may retry a genuinely newer alias lifetime; the existing acquisition owner drives it. */
  private retryUrlAliasUpgrade(): void {
    if (!this.pendingUrlAliasUpgrade || this.urlAliasUpgradeTask || this.snapshotHydrationTask || this.building
      || this.diagnosticsClosed || !(this.fullSnapshotHydrated || this.sourceBackedStartup && this.sourceNodeVocabularyPublished)
      || !this.sourceAcquisition.hasSemanticDependencies()
      || this.urlAliasUpgradeFailure?.token === this.urlAliasUpgradeToken()) return;
    const state = this.state, publication = this.publicationRevision, token = this.urlAliasUpgradeToken();
    /** Keep the optional repair attached to the exact borrowed graph instance and publication lifetime. */
    const current = (): boolean => !this.diagnosticsClosed && !this.building && this.state === state
      && this.publicationRevision === publication;
    /** Atomically install the privately prepared search facets without replacing identities or evidence. */
    this.urlAliasUpgradeProgress = { phase: "repair", processed: 0, total: this.sourceAcquisition.pendingUrlAliasSourceCount() };
    const task = (async (): Promise<void> => {
      const prepared = await this.prepareUrlAliasUpgrade(state, current);
      if (!prepared || !current()) return;
      // The existing graph identities and all evidence survive this facet-only publication.
      for (const [page, aliases] of prepared.aliases) page.aliases = [...aliases];
      // Current requested URL pages also override base search; install the same completed facets there.
      for (const scope of this.semanticScopes.values()) for (const page of scope.pagesByPath.values()) {
        const aliases = page.url ? prepared.aliasesByPath.get(page.path) : undefined;
        if (aliases) page.aliases = [...aliases];
      }
      this.pendingUrlAliasUpgrade = false;
      this.urlAliasFacetVersion = URL_ALIAS_FACET_VERSION;
      this.urlAliasUpgradeFailure = null;
      this.titleCache.clear();
      this.installSearchIndex(prepared.search);
      this.emitPresentation();
      this.scheduleSnapshotPersist(SNAPSHOT_EDIT_IDLE_MS);
    })();
    this.urlAliasUpgradeTask = task;
    this.emitPresentation();
    void task.finally(/** Publish a terminal incomplete outcome after the task has released its active-work ownership. */ () => {
      if (this.urlAliasUpgradeTask !== task) return;
      this.urlAliasUpgradeTask = null;
      this.urlAliasUpgradeProgress = null;
      if (!this.diagnosticsClosed) {
        this.emitPresentation();
        if (token !== this.urlAliasUpgradeToken()) this.retryUrlAliasUpgrade();
      }
    });
  }

  /** Retry finite edit/deletion incidence on the existing source-ready signal, without a timer. */
  private retrySourceNodeImpacts(): void {
    if (this.diagnosticsClosed || this.building || !this.sourceBackedStartup || !this.sourceNodeVocabularyPublished
      || this.nodeImpactTask || !this.sourceAcquisition.hasSemanticDependencies()
      || this.sourceAcquisition.hasCompleteNodeImpacts() && this.sourceAcquisition.pendingNodeImpactOwners().size === 0) return;
    const source = this.plugin.getIndexSourceRevision(), policy = this.semanticPolicyRevision;
    const maintenance = this.sourceAcquisition.getMaintenanceRevision();
    const task = this.completeSourceNodeImpacts();
    this.nodeImpactTask = task;
    void task.finally(() => {
      if (this.nodeImpactTask !== task) return;
      this.nodeImpactTask = null;
      if (!this.diagnosticsClosed) {
        this.emitPresentation();
        // A newer source/policy closure may have arrived while the old task was still retiring.
        // Retry that newer lifetime once; an unchanged failing lifetime does not spin or poll.
        if (source !== this.plugin.getIndexSourceRevision() || policy !== this.semanticPolicyRevision
          || maintenance !== this.sourceAcquisition.getMaintenanceRevision()) this.retrySourceNodeImpacts();
      }
    });
  }

  /** Damaged historical incidence needs one node-only recovery; ordinary edits stay source-local. */
  private async completeSourceNodeImpacts(): Promise<void> {
    try {
      if (!this.sourceAcquisition.hasCompleteNodeImpacts()) {
        this.recordIndexDiagnostic("reconcile", "source-node-incidence-recovery");
        await this.adoptStartupSources();
      } else await this.repairSourceNodeImpacts();
    } catch { this.recordIndexDiagnostic("reconcile", "source-node-impact-pending"); }
  }

  /** Publish one bounded owner's affected node metadata only after every revision/identity survives. */
  private async repairSourceNodeImpacts(): Promise<void> {
    try {
      for (const [owner, endpoints] of this.sourceAcquisition.pendingNodeImpactOwners()) {
        if (this.building || this.diagnosticsClosed) return;
        const source = this.plugin.getIndexSourceRevision(), policy = this.semanticPolicyRevision, generation = this.generation;
        const maintenance = this.sourceAcquisition.getMaintenanceRevision(), publication = this.publicationRevision;
        const current = (): boolean => !this.diagnosticsClosed && !this.building && this.sourceBackedStartup
          && source === this.plugin.getIndexSourceRevision() && policy === this.semanticPolicyRevision && generation === this.generation
          && maintenance === this.sourceAcquisition.getMaintenanceRevision() && publication === this.publicationRevision
          && this.sourceAcquisition.nodeImpactEndpoints(owner) === endpoints;
        const builder = new GraphBuilder(this.plugin, this.app, this.fieldCache, this.metadataParser,
          this.indexedDb, current, new Map(), this.sourceAcquisition, () => this.workScheduler.checkpoint(3));
        const patch = await builder.prepareNodeImpactPatch(this.state, endpoints.values());
        if (!patch || !current()) return;
        this.publishIncrementalFile({ sourcePath: owner, touchedPagePaths: patch.touched, semanticChanged: false }, patch.publish);
        this.sourceAcquisition.acknowledgeNodeImpacts(owner, endpoints);
      }
    } catch { this.recordIndexDiagnostic("reconcile", "source-node-impact-pending"); }
  }

  /** Aggregate semantic preparation counters used by acceptance tests and diagnostics. */
  getSemanticPreparationDiagnostics(): SemanticPreparationDiagnostics { return { ...this.semanticPreparationDiagnostics }; }

  /** Capture the visibility inputs that determine which parent/candidate incidence a visible scope needs. */
  private semanticVisibilitySettings() {
    return {
      excludeFilepaths: [...this.plugin.settings.excludeFilepaths], showVirtualNodes: this.plugin.settings.showVirtualNodes,
      showAttachments: this.plugin.settings.showAttachments, showFolderNodes: this.plugin.settings.showFolderNodes,
      showTagNodes: this.plugin.settings.showTagNodes, showPageNodes: this.plugin.settings.showPageNodes,
      showURLNodes: this.plugin.settings.showURLNodes, showInferredNodes: this.plugin.settings.showInferredNodes,
    };
  }

  /** A visibility expansion needs fresh requested coverage, independently of semantic/source validity. */
  private semanticCoverageSignature(): string { return JSON.stringify(this.semanticVisibilitySettings()); }

  /** True while the requested semantic policy has no coherent prepared publication for active demand. */
  hasPendingSemanticPreparation(): boolean {
    if (this.pendingStructuralTasks > 0) return true;
    const maintenanceRevision = this.sourceAcquisition.getMaintenanceRevision();
    if (this.fullSemanticPolicyRevision === this.semanticPolicyRevision
      && this.fullSemanticMaintenanceRevision === maintenanceRevision) return false;
    if (this.semanticPreparationTasks.size > 0) return true;
    const coverageSignature = this.semanticCoverageSignature();
    for (const [path, count] of this.semanticDemandCounts) {
      if (count <= 0) continue;
      const scope = this.semanticScopes.get(path);
      if (!scope || scope.coverageSignature !== coverageSignature || scope.policyRevision !== this.semanticPolicyRevision || scope.maintenanceRevision !== maintenanceRevision
        || scope.sourceRevision !== this.plugin.getIndexSourceRevision() || !this.sourceAcquisition.hasSemanticDependencies()) return true;
    }
    const active = this.plugin.settings.lastActivePath;
    if (!active) return false;
    const scope = this.semanticScopes.get(active);
    return !scope || scope.coverageSignature !== coverageSignature || scope.policyRevision !== this.semanticPolicyRevision || scope.maintenanceRevision !== maintenanceRevision
      || scope.sourceRevision !== this.plugin.getIndexSourceRevision() || !this.sourceAcquisition.hasSemanticDependencies();
  }

  /** Active work is distinct from demand that already ended with an unavailable or bounded outcome. */
  hasActiveSemanticPreparation(): boolean { return this.pendingStructuralTasks > 0 || this.semanticPreparationTasks.size > 0; }

  /** Return one current demanded failure reason without exposing paths or trusting historical aggregate counters. */
  getSemanticPreparationFailure(): string | null {
    const paths = new Set<string>();
    for (const [path, count] of this.semanticDemandCounts) if (count > 0) paths.add(path);
    if (this.plugin.settings.lastActivePath) paths.add(this.plugin.settings.lastActivePath);
    for (const path of paths) {
      const reason = this.currentSemanticPreparationFailure(path);
      if (reason) return reason;
    }
    return null;
  }

  /** Match a failure to the existing source/policy/demand/coverage lifetime before suppressing optional retries. */
  private currentSemanticPreparationFailure(path: string): string | null {
    const failure = this.semanticPreparationFailures.get(path);
    return failure && failure.policyRevision === this.semanticPolicyRevision
      && failure.demandRevision === (this.semanticDemandRevision.get(path) ?? 0)
      && failure.sourceRevision === this.plugin.getIndexSourceRevision()
      && failure.maintenanceRevision === this.sourceAcquisition.getMaintenanceRevision()
      && failure.coverageSignature === this.semanticCoverageSignature() ? failure.reason : null;
  }

  /**
   * Serialize optional alias owners behind current requested primary preparation. Joining existing
   * promises and their supersession retries gives readers an unchanged repository fence; no source
   * authority, counts or semantic publications are relabeled. Same-lifetime terminal failures remain
   * incomplete without a retry for every alias owner. A transient writer conflict gets one fresh
   * attempt after the current alias owner has finished, before another optional owner may activate.
   */
  private async prioritizeRequestedSemantics(current: () => boolean): Promise<void> {
    /** Navigation may replace visible demand while an earlier requested preparation is awaited. */
    const paths = (): Set<string> => {
      const result = new Set<string>();
      for (const [path, count] of this.semanticDemandCounts) if (count > 0) result.add(path);
      if (this.plugin.settings.lastActivePath) result.add(this.plugin.settings.lastActivePath);
      return result;
    };
    /** Drain actual owners, including replacement tasks started by their existing finally retry. */
    const drain = async (): Promise<void> => {
      while (current() && this.sourceAcquisition.hasSemanticDependencies()) {
        const tasks: Promise<unknown>[] = [...this.relationshipPairTasks.values()];
        for (const path of paths()) {
          const active = this.semanticPreparationTasks.get(path);
          if (active) tasks.push(active.task);
        }
        if (!tasks.length) return;
        await Promise.all(tasks);
      }
    };
    await drain();
    if (!current() || !this.sourceAcquisition.hasSemanticDependencies()) return;
    const attempts: Promise<void>[] = [];
    const attemptedPaths: string[] = [];
    for (const path of paths()) {
      const reason = this.currentSemanticPreparationFailure(path);
      // Missing/corrupt/bounded outcomes need a changed authority or demand, not repeated alias work.
      if (reason && reason !== "dependency-pending" && reason !== "superseded") continue;
      const failure = this.semanticPreparationFailures.get(path);
      if (reason && failure && this.aliasPriorityFailures.has(failure)) continue;
      attemptedPaths.push(path);
      attempts.push(this.ensureSemanticScope(path));
    }
    await Promise.all(attempts);
    await drain();
    for (const path of attemptedPaths) {
      const failure = this.semanticPreparationFailures.get(path);
      // A failure after the optional writer has stopped is an actual remaining input limitation.
      // Keep that exact record, not a new authority stamp; ordinary source-ready/user retries work.
      if (failure && this.currentSemanticPreparationFailure(path)) this.aliasPriorityFailures.add(failure);
    }
  }

  /** Let the normal per-file coordinator wait for known tree work instead of patching an intermediate path map. */
  hasPendingStructuralMaintenance(): boolean { return this.pendingStructuralTasks > 0; }

  /** Await cancellable known tree operations; callers check the flag first to preserve the no-work lifecycle ordering. */
  async waitForStructuralMaintenance(): Promise<void> {
    while (this.pendingStructuralTasks > 0 && !this.diagnosticsClosed) {
      await new Promise<void>(done => window.setTimeout(done, 25));
    }
  }

  /** Retry only demanded settings scopes after source-local dependency inventory closes. */
  private retryDemandedSemanticScopes(): void {
    if (this.diagnosticsClosed || !this.sourceAcquisition.hasSemanticDependencies()) return;
    const retry = new Set<string>();
    for (const [path, count] of this.semanticDemandCounts) if (count > 0) retry.add(path);
    if (this.plugin.settings.lastActivePath) retry.add(this.plugin.settings.lastActivePath);
    for (const path of retry) void this.ensureSemanticScope(path);
  }

  /** Register one visible semantic center. Releasing the final demand cancels its in-flight work. */
  acquireSemanticDemand(path: string): () => void {
    const previous = this.semanticDemandCounts.get(path) ?? 0;
    this.semanticDemandCounts.set(path, previous + 1);
    if (previous === 0) this.semanticDemandRevision.set(path, (this.semanticDemandRevision.get(path) ?? 0) + 1);
    void this.withForegroundPriority(() => this.publishHostMetadataPreview(path), 1);
    const maintenanceRevision = this.sourceAcquisition.getMaintenanceRevision();
    if (this.fullSemanticPolicyRevision !== this.semanticPolicyRevision || this.fullSemanticMaintenanceRevision !== maintenanceRevision) void this.ensureSemanticScope(path);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const count = Math.max(0, (this.semanticDemandCounts.get(path) ?? 1) - 1);
      if (count === 0) {
        this.semanticDemandCounts.delete(path);
        this.hostPreviewScopes.delete(path);
        this.hostPreviewRequests.set(path, (this.hostPreviewRequests.get(path) ?? 0) + 1);
        this.semanticDemandRevision.set(path, (this.semanticDemandRevision.get(path) ?? 0) + 1);
        if (this.semanticScopes.delete(path)) {
          this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
          this.searchCandidateCache.clear();
          this.titleCache.clear();
        }
      } else this.semanticDemandCounts.set(path, count);
    };
  }

  /** Prepare all active centers for the current policy; no full/source rebuild is scheduled here. */
  async refreshSemanticSettings(): Promise<void> {
    if (this.fullSemanticPolicyRevision === this.semanticPolicyRevision
      && this.fullSemanticMaintenanceRevision === this.sourceAcquisition.getMaintenanceRevision()) return;
    const paths = new Set<string>();
    for (const [path, count] of this.semanticDemandCounts) if (count > 0) paths.add(path);
    if (this.plugin.settings.lastActivePath) paths.add(this.plugin.settings.lastActivePath);
    await Promise.all([...paths].map((path) => this.ensureSemanticScope(path)));
  }

  /** Create the bounded cooperative runtime shared by dependency readers and compiler finalization. */
  private semanticPreparationRuntime(isCurrent: () => boolean): GraphCompilerRuntime {
    return {
      now: () => performance.now(),
      /** A completed semantic work slice is progress while startup prioritizes requested views. */
      yield: async () => {
        await yieldToHostTask();
        if (isCurrent() && this.snapshotHydrationDiagnostics.phase === "requested-semantics") {
          this.touchSnapshotHydrationProgress(this.snapshotHydrationRun);
        }
      },
      isCurrent,
      sliceBudgetMs: Platform.isIosApp ? 7 : Platform.isMobile ? 9 : 13,
      resolverBatchSize: Platform.isIosApp ? 96 : Platform.isMobile ? 160 : 400,
    };
  }

  /** Convert one bound legacy page back to its explicit source identity without basename inference. */
  private semanticSourceRef(page: GraphPage): SourceEntityRef {
    const prepared = this.preparedPageInfo.get(page);
    const view = graphNodeViewFromLegacy(page);
    // Legacy folder pages have no TFile. Resolve their documented semantic-path coordinate
    // at the host boundary; opaque node IDs never supply a physical path.
    const folder = page.isFolder && page.path.startsWith("folder:")
      ? page.path === "folder:/" ? this.app.vault.getRoot()
        : this.app.vault.getFolderByPath(page.path.slice("folder:".length)) : null;
    const physicalPath = page.file?.path ?? (folder instanceof TFolder ? folder.path : undefined);
    return {
      id: prepared?.entityId ?? view.id,
      kind: view.kind,
      state: view.kind === "unresolved" ? "unresolved" : "materialized",
      semanticPath: page.path,
      ...(physicalPath === undefined ? {} : { physicalPath }),
    };
  }

  /** Capture selected physical metadata identities before a follow-up await and recheck before publish. */
  private captureSelectedMetadata(nodes: Iterable<CompiledGraphNode>): Map<string, SelectedMetadataToken> | null {
    const result = new Map<string, SelectedMetadataToken>();
    for (const node of nodes) {
      if (node.kind !== "document" || !node.physicalPath) continue;
      const file = this.app.vault.getFileByPath(node.physicalPath);
      if (!(file instanceof TFile)) return null;
      if (file.extension !== "md") continue;
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache) return null;
      result.set(node.physicalPath, { file, cache, revision: captureFileRevision(file) });
    }
    return result;
  }

  /** Recheck every selected MetadataCache object and file revision after awaited preparation. */
  private selectedMetadataCurrent(tokens: ReadonlyMap<string, SelectedMetadataToken>): boolean {
    for (const [path, token] of tokens) {
      if (this.app.vault.getFileByPath(path) !== token.file || !fileRevisionMatches(token.file, token.revision)
        || this.app.metadataCache.getFileCache(token.file) !== token.cache) return false;
    }
    return true;
  }

  /**
   * Stage canonical current frontmatter aliases for finite physical candidates, whose sparse compiler
   * endpoints may not replay their own metadata. Copies, strings, map slots and traversal cursors are
   * charged against the same requested-preparation ceiling; dense values yield through its runtime.
   * No body, relationship incidence, synthetic URL aliases or base-page fallback is consulted.
   * @throws TypeError for cyclic alias arrays, preserving canonical metadata rejection.
   */
  private async prepareSelectedPhysicalAliases(tokens: ReadonlyMap<string, SelectedMetadataToken>, runtime: GraphCompilerRuntime,
    retainedBytes: number): Promise<PreparedPhysicalAliases> {
    const byPath = new Map<string, string[]>();
    let lastYield = runtime.now(), steps = 0;
    if (retainedBytes > MAX_CACHED_SCOPE_RETAINED_BYTES) return { reason: "decode-budget" };
    for (const [path, token] of tokens) {
      if (!runtime.isCurrent()) return { reason: "superseded" };
      const aliases: string[] = [];
      retainedBytes += 64 + 2 * path.length;
      if (retainedBytes > MAX_CACHED_SCOPE_RETAINED_BYTES) return { reason: "decode-budget" };
      for (const step of iterateFrontmatterAliasSteps(token.cache.frontmatter ?? {})) {
        if (!runtime.isCurrent()) return { reason: "superseded" };
        // Account for the possible trimmed copy before advancing the iterator into trim, as well
        // as each live cursor and its ancestor-set entry. Raw strings themselves remain borrowed.
        if (step.rawLength !== undefined && retainedBytes + 32 + 2 * step.rawLength + 128 * step.depth > MAX_CACHED_SCOPE_RETAINED_BYTES) return { reason: "decode-budget" };
        if (step.value !== null) retainedBytes += 32 + 2 * step.value.length;
        if (retainedBytes + 128 * step.depth > MAX_CACHED_SCOPE_RETAINED_BYTES) return { reason: "decode-budget" };
        if (step.value !== null) aliases.push(step.value);
        if (++steps % 32 === 0 && runtime.now() - lastYield >= (runtime.sliceBudgetMs ?? 8)) {
          await runtime.yield(); lastYield = runtime.now();
          if (!runtime.isCurrent()) return { reason: "superseded" };
        }
      }
      byPath.set(path, aliases);
    }
    return runtime.isCurrent() && this.selectedMetadataCurrent(tokens) ? { reason: "ready", byPath, retainedBytes } : { reason: "superseded" };
  }

  /** Bind a finite compiler node to a private GraphPage; no live GraphState is mutated. */
  private preparedPageFromNode(node: CompiledGraphNode): GraphPage | null {
    const path = node.semanticPath;
    if (!path) return null;
    let file: TFile | null = null;
    if ((node.kind === "document" || node.kind === "attachment") && node.physicalPath) {
      const bound = this.app.vault.getFileByPath(node.physicalPath);
      if (!(bound instanceof TFile)) return null;
      file = bound;
    }
    return {
      path, file, name: node.name, url: node.url, isFolder: node.kind === "container", isTag: node.kind === "tag",
      mtime: node.semanticMtime, neighbours: new Map(), aliases: [...node.aliases], tags: [...node.tags],
      noteType: node.noteType, primaryStyleTag: node.primaryStyleTag, styleTags: [...node.styleTags],
      maxLabelLength: node.maxLabelLength,
    };
  }

  /**
   * Publish the complete direct center at foreground priority; an optional selected-parent pass
   * may later enrich sibling witnesses without replacing a usable center with an error state.
   * Every asynchronous pass prepares privately and closes the same source/policy/demand fences.
   */
  private async prepareSemanticScope(centerPath: string, policyRevision: number, demandRevision: number,
    siblingParents?: readonly NodeId[], expectedScope?: PreparedSemanticScope): Promise<void> {
    const optional = siblingParents !== undefined;
    const sourceRevision = this.plugin.getIndexSourceRevision();
    const maintenanceRevision = this.sourceAcquisition.getMaintenanceRevision();
    const publicationRevision = this.publicationRevision;
    const presentationRevision = this.presentationRevision;
    const settings = graphCompilerSettingsFromLegacy(this.plugin.settings);
    const settingsSignature = JSON.stringify(settings);
    const gateSettings = this.semanticVisibilitySettings();
    const gateSignature = JSON.stringify(gateSettings);
    const presentation = { noteTypeField: this.plugin.settings.noteTypeField, primaryTagField: this.plugin.settings.primaryTagField };
    /** In-place settings edits are checked at cooperative/final fences, never per graph record. */
    const signaturesCurrent = (): boolean =>
      JSON.stringify(graphCompilerSettingsFromLegacy(this.plugin.settings)) === settingsSignature
      && JSON.stringify({
        excludeFilepaths: [...this.plugin.settings.excludeFilepaths], showVirtualNodes: this.plugin.settings.showVirtualNodes,
        showAttachments: this.plugin.settings.showAttachments, showFolderNodes: this.plugin.settings.showFolderNodes,
        showTagNodes: this.plugin.settings.showTagNodes, showPageNodes: this.plugin.settings.showPageNodes,
        showURLNodes: this.plugin.settings.showURLNodes, showInferredNodes: this.plugin.settings.showInferredNodes,
      }) === gateSignature;
    let signatureValid = signaturesCurrent();
    const current = (): boolean => !this.diagnosticsClosed && this.semanticPolicyRevision === policyRevision
      && (this.semanticDemandRevision.get(centerPath) ?? 0) === demandRevision
      && this.plugin.getIndexSourceRevision() === sourceRevision && this.sourceAcquisition.getMaintenanceRevision() === maintenanceRevision
      && this.publicationRevision === publicationRevision && this.presentationRevision === presentationRevision
      && signatureValid && (!optional || Boolean(this.plugin.settings.renderSiblings)
        && this.semanticScopes.get(centerPath) === expectedScope);
    const baseRuntime = this.semanticPreparationRuntime(current);
    const runtime = { ...baseRuntime,
      /** Generation tokens cancel cheaply; close unnotified edits after every scheduled continuation. */
      yield: async (): Promise<void> => {
        await baseRuntime.yield();
        if (optional) await this.workScheduler.checkpoint(3);
        signatureValid = signaturesCurrent();
      },
    };
    /** Retain only a terminal outcome for this exact captured authority/demand lifetime. */
    const pending = (reason: string): void => {
      // Optional sibling absence is not missing direct-center authority or a user-visible failure.
      if (optional) return;
      this.noteSemanticPreparation("pending", reason);
      if (current()) this.semanticPreparationFailures.set(centerPath, {
        policyRevision, demandRevision, sourceRevision, maintenanceRevision, coverageSignature: gateSignature, reason,
      });
    };
    if (optional) {
      await this.workScheduler.checkpoint(3);
      if (!current()) return;
    }
    const priorScope = this.semanticScopes.get(centerPath);
    const seed = priorScope?.pagesByPath.get(centerPath) ?? this.state.pages.get(centerPath)
      ?? this.hostPreviewScopes.get(centerPath)?.pages.get(centerPath) ?? this.physicalSearchEntries.get(centerPath)?.page;
    if (!seed || !current()) {
      pending("missing-center");
      return;
    }
    const centerMetadata = this.captureSelectedMetadata([{
      ...this.semanticSourceRef(seed), name: seed.name, url: seed.url, semanticMtime: seed.mtime,
      file: seed.file ? { name: seed.file.name, extension: seed.file.extension, path: seed.file.path, mtime: seed.file.stat.mtime,
        basename: seed.file.basename, ctime: seed.file.stat.ctime, size: seed.file.stat.size } : undefined,
      aliases: seed.aliases, tags: seed.tags, noteType: seed.noteType, primaryStyleTag: seed.primaryStyleTag,
      styleTags: seed.styleTags, maxLabelLength: seed.maxLabelLength, neighbours: new Map(),
    }]);
    if (!centerMetadata) { pending("metadata-pending"); return; }
    const policy = { revision: String(policyRevision), settings, isCurrent: current };
    const gatePolicy = { revision: `${presentationRevision}:${policyRevision}`, settings: gateSettings, isCurrent: current };
    let prepared: Awaited<ReturnType<ObsidianSourceAcquisition["prepareRequestedNeighborhood"]>> | null = await this.sourceAcquisition.prepareRequestedNeighborhood(
      { kind: "neighborhood", center: this.semanticSourceRef(seed), siblingClosure: optional ? "selected" : "deferred",
        ...(optional ? { siblingParents } : {}) }, policy, presentation, gatePolicy, runtime);
    if (!current() || !signaturesCurrent()) { if (!optional) this.noteSemanticPreparation("cancelled", "superseded"); return; }
    if (prepared.outcome !== "ready") { pending(prepared.reason); return; }
    const compilation = prepared.preparation.compilation;
    const centerId = prepared.certificate.relations.center.id;
    const parentIds = prepared.certificate.relations.completeParents.map((parent) => parent.id);
    const optionalParentRefs = prepared.certificate.relations.parents.map(/** Retain only finite immutable identity facets for later optional admission. */
      parent => ({ ...parent }));
    const gates = prepared.gates, familyVisits = prepared.work.familyVisits;
    const compiledBytes = prepared.preparation.memory?.compilation ?? 0;
    // Certificates, duplicate heads, structural input and owner captures are no longer needed.
    // Retain only the required compilation/gates before constructing a supplemental compilation.
    prepared = null;
    const legacyEvidence = compilation.legacyEvidence();
    if (!legacyEvidence) { pending("unsupported-scope"); return; }
    const center = compilation.node(centerId);
    if (!center?.semanticPath || center.semanticPath !== centerPath) { pending("missing-center"); return; }
    // The private cover proves the complete center and every policy-visible parent. Publish incidence for
    // parents the view can render: a hidden root's entire child inventory is not a request to
    // replay every Markdown owner for labels/degrees before an ordinary note can appear.
    const visibleParents = parentIds.filter((id) => {
      const node = compilation.node(id), page = node ? this.preparedPageFromNode(node) : null;
      const relation = center.neighbours.get(id);
      return Boolean(page && this.isVisiblePage(page) && relation
        && (gateSettings.showInferredNodes || classifyRelation(relation, "parent", settings.inferAllLinksAsFriends) !== RelationType.INFERRED));
    });
    const completeIds = new Set<NodeId>([center.id, ...visibleParents]);
    const requiredIds = new Set<NodeId>(completeIds);
    for (const id of completeIds) for (const relation of compilation.node(id)?.neighbours.values() ?? []) requiredIds.add(relation.target.id);
    const requiredNodes: CompiledGraphNode[] = [];
    for (const id of requiredIds) {
      const node = compilation.node(id);
      if (!node?.semanticPath) { pending("unsupported-scope"); return; }
      requiredNodes.push(node);
    }
    const metadataTokens = this.captureSelectedMetadata(requiredNodes);
    if (!metadataTokens) { pending("metadata-pending"); return; }
    for (const [path, token] of centerMetadata) metadataTokens.set(path, token);

    // Preserve SI1 sort independence after semantic publication. Complete center/parent incidence is
    // already exact in this compilation; only the remaining finite candidates need the dedicated
    // raw-degree reader. This also avoids asking that reader to rebind structural roots it does not own.
    // Charge the existing compiled state and selected metadata/array/map slots to the same ceiling.
    const physicalAliases = await this.prepareSelectedPhysicalAliases(metadataTokens, runtime, compiledBytes + 256 * requiredNodes.length);
    if (!current() || !signaturesCurrent() || !this.selectedMetadataCurrent(metadataTokens)) { if (!optional) this.noteSemanticPreparation("cancelled", "metadata-stale"); return; }
    if (physicalAliases.reason !== "ready") { pending(physicalAliases.reason); return; }
    const supplementalRuntime = { ...runtime, retainedBytes: physicalAliases.retainedBytes };
    const degrees = new Map<NodeId, number>();
    const candidateGates = new Map<NodeId, GateStats>();
    for (const id of completeIds) {
      const complete = compilation.node(id);
      if (complete) degrees.set(id, complete.neighbours.size);
    }
    const degreeCandidates = requiredNodes.filter((node) => {
      if (completeIds.has(node.id) || node.kind === "container" || node.kind === "tag") return false;
      const page = this.preparedPageFromNode(node);
      return Boolean(page && this.isVisiblePage(page));
    }).map((node) => ({
      id: node.id, kind: node.kind, state: node.state, ...(node.semanticPath ? { semanticPath: node.semanticPath } : {}),
      ...(node.physicalPath ? { physicalPath: node.physicalPath } : {}),
    }));
    if (degreeCandidates.length) {
      const degreeResult = await this.sourceAcquisition.prepareRequestedCandidateDegrees(
        { kind: "candidate-degrees", candidates: degreeCandidates }, policy, presentation, supplementalRuntime, gatePolicy);
      if (!current() || !signaturesCurrent()) { if (!optional) this.noteSemanticPreparation("cancelled", "superseded"); return; }
      if (degreeResult.outcome !== "ready") { pending(degreeResult.reason); return; }
      for (const input of degreeResult.inputs) {
        degrees.set(input.id, input.rawDegree);
        if (input.gates) candidateGates.set(input.id, input.gates);
      }
      this.addSemanticDependencyVisits(degreeResult.work.familyVisits);
    }

    const urlNames = new Map<NodeId, string>();
    for (const node of requiredNodes) {
      if (node.kind !== "url") continue;
      const title = await this.sourceAcquisition.prepareRequestedUrlTitle({ id: node.id, kind: node.kind, state: node.state,
        ...(node.semanticPath ? { semanticPath: node.semanticPath } : {}) }, policy, presentation, supplementalRuntime);
      if (!current() || !signaturesCurrent()) { if (!optional) this.noteSemanticPreparation("cancelled", "superseded"); return; }
      if (title.outcome !== "ready") { pending(title.reason); return; }
      urlNames.set(node.id, title.input.name);
      this.addSemanticDependencyVisits(title.work.familyVisits);
    }
    if (!this.selectedMetadataCurrent(metadataTokens) || !current()) { if (!optional) this.noteSemanticPreparation("cancelled", "metadata-stale"); return; }

    const pagesById = new Map<NodeId, GraphPage>();
    const pagesByPath = new Map<string, GraphPage>();
    for (const node of requiredNodes) {
      const page = this.preparedPageFromNode(node);
      if (!page || pagesByPath.has(page.path)) { pending("unsupported-scope"); return; }
      if (node.kind === "document" && node.physicalPath) {
        const aliases = physicalAliases.byPath.get(node.physicalPath);
        if (!aliases) { pending("metadata-pending"); return; }
        page.aliases = aliases;
      }
      if (urlNames.has(node.id)) page.name = urlNames.get(node.id)!;
      pagesById.set(node.id, page);
      pagesByPath.set(page.path, page);
      this.preparedPageInfo.set(page, { entityId: node.id, policyRevision, settings,
        completeRelations: completeIds.has(node.id), ...(degrees.has(node.id) ? { rawDegree: degrees.get(node.id)! } : {}),
        ...(candidateGates.has(node.id) ? { gates: candidateGates.get(node.id)!, gateCoverageSignature: gateSignature } : {}) });
      this.presentationStatuses.set(page, { noteType: "ready", styleTags: "ready" });
    }
    for (const id of requiredIds) {
      const sourceNode = compilation.node(id)!;
      const sourcePage = pagesById.get(id)!;
      for (const relation of sourceNode.neighbours.values()) {
        const target = pagesById.get(relation.target.id);
        if (!target) { if (completeIds.has(id)) { pending("unsupported-scope"); return; } continue; }
        const { target: _compiledTarget, ...rest } = relation;
        sourcePage.neighbours.set(target.path, { ...rest, target });
      }
    }
    if (!current() || !signaturesCurrent() || !this.selectedMetadataCurrent(metadataTokens)) { if (!optional) this.noteSemanticPreparation("cancelled", "superseded"); return; }
    const oldAffected = new Set<string>([...(priorScope?.pagesByPath.keys() ?? []), ...(priorScope?.suppressedPaths ?? [])]);
    if (!priorScope) {
      // The first settings-only publication has no prior private scope. Bound the old-policy
      // affected set to the full graph's center incidence plus parent incidence (the same sibling
      // witness shape requested from cached facts). Only policy-dependent virtual nodes need
      // suppression: materialized documents/attachments and structural/tag/URL nodes remain valid
      // global search entities even when they are no longer related to this center.
      const oldCenter = this.state.pages.get(centerPath);
      if (oldCenter) {
        oldAffected.add(oldCenter.path);
        for (const relation of oldCenter.neighbours.values()) {
          oldAffected.add(relation.target.path);
          if (!relation.isHidden && classifyRelation(relation, "parent", this.fullSemanticSettings.inferAllLinksAsFriends) !== null) {
            oldAffected.add(relation.target.path);
            // Required direct publication must not walk an unrelated structural parent's fanout.
            if (completeIds.has(this.semanticSourceRef(relation.target).id)) {
              for (const witness of relation.target.neighbours.values()) oldAffected.add(witness.target.path);
            }
          }
        }
      }
    }
    const suppressedPaths = new Set<string>();
    for (const path of oldAffected) {
      if (pagesByPath.has(path)) continue;
      const oldPage = priorScope?.pagesByPath.get(path) ?? this.state.pages.get(path);
      if (oldPage && !oldPage.file && !oldPage.isFolder && !oldPage.isTag && !oldPage.url) suppressedPaths.add(path);
      else if (!oldPage && priorScope?.suppressedPaths.has(path)) suppressedPaths.add(path);
    }
    const scope: PreparedSemanticScope = {
      centerPath, policyRevision, demandRevision, sourceRevision, maintenanceRevision, presentationRevision, coverageSignature: gateSignature, settings, pagesByPath,
      completePaths: new Set([...completeIds].map((id) => pagesById.get(id)!.path)), evidence: legacyEvidence,
      gates: { top: { ...gates.top }, bottom: { ...gates.bottom },
        left: { ...gates.left }, right: { ...gates.right } }, suppressedPaths,
    };
    this.noteSemanticPreparation("prepared", null);
    // No await below this line: the revisioned page/evidence/gate/search overlay becomes visible together.
    this.semanticScopes.set(centerPath, scope);
    if (optional) this.siblingEnrichmentScopes.set(scope, presentationRevision);
    this.hostPreviewScopes.delete(centerPath);
    this.retireRelationshipPairs(scope);
    for (const page of pagesByPath.values()) {
      const info = this.preparedPageInfo.get(page);
      if (info?.gates) this.preparedPageInfo.set(page, { ...info, gatePairRevision: this.relationshipPairRevision });
    }
    this.semanticPreparationFailures.delete(centerPath);
    this.plugin.startupDiagnostics?.mark("first-requested-scope-authoritative");
    this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
    this.searchCandidateCache.clear();
    this.titleCache.clear();
    this.addSemanticDependencyVisits(familyVisits);
    this.noteSemanticPreparation("published", null);
    this.emit();
    void this.withForegroundPriority(() => this.prepareVisibleFolderGates(pagesByPath.values(),
      () => this.semanticScopes.get(centerPath) === scope), 2);
    // Launch after the atomic direct publication; count admission never gates the usable center.
    if (!optional) void this.enrichSemanticScopeSiblings(scope, optionalParentRefs);
  }

  /**
   * Admit optional parent witnesses once for this published demand/presentation lifetime. P3
   * checkpoints let navigation, writes and visible changes pre-empt every compiler continuation.
   * Rejection leaves the complete direct publication and failure diagnostics untouched.
   */
  private async enrichSemanticScopeSiblings(scope: PreparedSemanticScope, parents: readonly SourceEntityRef[]): Promise<void> {
    const presentationRevision = this.presentationRevision;
    if (!this.plugin.settings.renderSiblings || !parents.length
      || this.siblingEnrichmentScopes.get(scope) === presentationRevision) return;
    this.siblingEnrichmentScopes.set(scope, presentationRevision);
    const publicationRevision = this.publicationRevision;
    /** Keep only this exact still-demanded publication; supersession never retries optional work. */
    const current = (): boolean => !this.diagnosticsClosed && Boolean(this.plugin.settings.renderSiblings)
      && this.semanticScopes.get(scope.centerPath) === scope && this.semanticPolicyRevision === scope.policyRevision
      && (this.semanticDemandRevision.get(scope.centerPath) ?? 0) === scope.demandRevision
      && ((this.semanticDemandCounts.get(scope.centerPath) ?? 0) > 0 || this.plugin.settings.lastActivePath === scope.centerPath)
      && this.plugin.getIndexSourceRevision() === scope.sourceRevision
      && this.sourceAcquisition.getMaintenanceRevision() === scope.maintenanceRevision
      && this.presentationRevision === presentationRevision && this.publicationRevision === publicationRevision;
    const baseRuntime = this.semanticPreparationRuntime(current);
    const runtime = { ...baseRuntime,
      /** Background admission and compilation yield behind all current foreground owners. */
      yield: async (): Promise<void> => { await baseRuntime.yield(); await this.workScheduler.checkpoint(3); },
    };
    try {
      await this.workScheduler.run(3, /** Account for the optional lifetime without joining the foreground lane. */
        async (): Promise<void> => {
          await this.workScheduler.checkpoint(3);
          if (!current()) return;
          const admitted = await this.sourceAcquisition.admitRequestedSiblingParents(parents, 256, runtime);
          if (!current() || !admitted.length) return;
          await this.workScheduler.checkpoint(3);
          if (!current()) return;
          await this.prepareSemanticScope(scope.centerPath, scope.policyRevision, scope.demandRevision,
            admitted.map(/** Opaque IDs select only canonical current-parent incidence. */ parent => parent.id), scope);
        });
    } catch {
      // The direct scope remains authoritative; optional faults carry no center-failure authority.
    }
  }

  /** Coalesce one center/revision request and reject stale completion through the captured demand token. */
  private ensureSemanticScope(centerPath: string): Promise<void> {
    if (this.pendingStructuralTasks > 0) return Promise.resolve();
    // A complete current publication already owns aliases, outgoing relationships and search.
    // Do not replace it with a narrower source projection on navigation or a stale task's retry.
    if (this.fullSemanticPolicyRevision === this.semanticPolicyRevision
      && this.fullSemanticMaintenanceRevision === this.sourceAcquisition.getMaintenanceRevision()) return Promise.resolve();
    const policyRevision = this.semanticPolicyRevision;
    const demandRevision = this.semanticDemandRevision.get(centerPath) ?? 0;
    const maintenanceRevision = this.sourceAcquisition.getMaintenanceRevision();
    const coverageSignature = this.semanticCoverageSignature();
    const sourceRevision = this.plugin.getIndexSourceRevision();
    const publicationRevision = this.publicationRevision;
    const presentationRevision = this.presentationRevision;
    const published = this.semanticScopes.get(centerPath);
    if (published?.policyRevision === policyRevision && published.demandRevision === demandRevision && published.coverageSignature === coverageSignature
      && published.maintenanceRevision === maintenanceRevision && published.sourceRevision === this.plugin.getIndexSourceRevision()
      && this.sourceAcquisition.hasSemanticDependencies()) {
      const center = published.pagesByPath.get(centerPath);
      const parents: SourceEntityRef[] = [];
      if (center && this.plugin.settings.renderSiblings) for (const relation of center.neighbours.values()) {
        if (relation.isHidden || !this.isVisiblePage(relation.target)) continue;
        const classification = classifyRelation(relation, "parent", published.settings.inferAllLinksAsFriends);
        if (classification === null || classification === RelationType.INFERRED && !this.plugin.settings.showInferredNodes) continue;
        parents.push(this.semanticSourceRef(relation.target));
      }
      void this.enrichSemanticScopeSiblings(published, parents);
      return Promise.resolve();
    }
    const existing = this.semanticPreparationTasks.get(centerPath);
    if (existing?.policyRevision === policyRevision && existing.demandRevision === demandRevision && existing.coverageSignature === coverageSignature
      && existing.maintenanceRevision === maintenanceRevision && existing.sourceRevision === sourceRevision
      && existing.publicationRevision === publicationRevision && existing.presentationRevision === presentationRevision) return existing.task;
    this.noteSemanticPreparation("requested", null);
    const task = this.withForegroundPriority(() => this.prepareSemanticScope(centerPath, policyRevision, demandRevision), 1).finally(() => {
      if (this.semanticPreparationTasks.get(centerPath)?.task !== task) return;
      this.semanticPreparationTasks.delete(centerPath);
      this.emitPresentation();
      // A local graph patch/presentation commit can close after source readiness already fired.
      // Retry that superseded request once against the new fences, while its demand is still live.
      // Unchanged missing/corrupt/pending input never creates a self-scheduling retry loop.
      if (!this.diagnosticsClosed && this.sourceAcquisition.hasSemanticDependencies()
        && ((this.semanticDemandCounts.get(centerPath) ?? 0) > 0 || this.plugin.settings.lastActivePath === centerPath)
        && (sourceRevision !== this.plugin.getIndexSourceRevision() || publicationRevision !== this.publicationRevision
          || presentationRevision !== this.presentationRevision)) void this.ensureSemanticScope(centerPath);
    });
    this.semanticPreparationTasks.set(centerPath, { policyRevision, demandRevision, maintenanceRevision, coverageSignature,
      sourceRevision, publicationRevision, presentationRevision, task });
    return task;
  }

  /** Update immutable aggregate counters without exposing semantic contents. */
  private noteSemanticPreparation(kind: "requested" | "prepared" | "published" | "cancelled" | "pending", reason: string | null): void {
    const d = this.semanticPreparationDiagnostics;
    this.semanticPreparationDiagnostics = { ...d, policyRevision: this.semanticPolicyRevision,
      requested: d.requested + (kind === "requested" ? 1 : 0), prepared: d.prepared + (kind === "prepared" ? 1 : 0),
      published: d.published + (kind === "published" ? 1 : 0), cancelled: d.cancelled + (kind === "cancelled" ? 1 : 0),
      pending: d.pending + (kind === "pending" ? 1 : 0), lastReason: reason };
  }

  /** Accumulate actual canonical family visits performed by settings preparation. */
  private addSemanticDependencyVisits(count: number): void {
    this.semanticPreparationDiagnostics = { ...this.semanticPreparationDiagnostics,
      dependencyVisits: this.semanticPreparationDiagnostics.dependencyVisits + count };
  }

  /** Prefer complete incidence over sparse endpoints at the current revision; retain coherent older views during repair. */
  private semanticPage(path: string): GraphPage | undefined {
    const maintenanceRevision = this.sourceAcquisition.getMaintenanceRevision();
    const currentSourceRevision = this.plugin.getIndexSourceRevision();
    // An endpoint borrowed by another center can be sparse even when a complete current scope
    // owns this path. Direct get() and relation consumers must select that same complete baseline.
    for (const scope of this.semanticScopes.values()) if (scope.maintenanceRevision === maintenanceRevision
      && scope.policyRevision === this.semanticPolicyRevision && scope.sourceRevision === currentSourceRevision && scope.completePaths.has(path)) {
      const page = scope.pagesByPath.get(path);
      if (page) return page;
    }
    // A page prepared by any current scope wins over suppression recorded by another current scope.
    // This keeps two visible Plexes composable when their bounded affected sets overlap.
    for (const scope of this.semanticScopes.values()) if (scope.maintenanceRevision === maintenanceRevision
      && scope.policyRevision === this.semanticPolicyRevision && scope.sourceRevision === currentSourceRevision) {
      const page = scope.pagesByPath.get(path);
      if (page) return page;
    }
    for (const scope of this.semanticScopes.values()) if (scope.maintenanceRevision === maintenanceRevision
      && scope.policyRevision === this.semanticPolicyRevision && scope.sourceRevision === currentSourceRevision && scope.suppressedPaths.has(path)) return undefined;
    const provisional = this.hostPreviewScopes.get(path)?.pages.get(path);
    if (provisional) return provisional;
    // Host repair closes writes immediately, but a last coherent view remains readable until a
    // current-maintenance scope replaces it.
    for (const scope of this.semanticScopes.values()) if (scope.policyRevision === this.semanticPolicyRevision) {
      const page = scope.pagesByPath.get(path);
      if (page) return page;
    }
    for (const scope of this.semanticScopes.values()) if (scope.policyRevision === this.semanticPolicyRevision
      && scope.suppressedPaths.has(path)) return undefined;
    for (const scope of this.semanticScopes.values()) {
      const page = scope.pagesByPath.get(path);
      if (page) return page;
    }
    const canonical = this.state.pages.get(path);
    const direct = this.hostPreviewScopes.get(path)?.pages.get(path);
    if (direct) return direct;
    for (const scope of this.hostPreviewScopes.values()) {
      const page = scope.pages.get(path);
      if (page) return page;
    }
    return canonical ?? this.physicalSearchEntries.get(path)?.page;
  }

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
   * type/style facets. Meaningful title changes advance the pending alias vocabulary lifetime;
   * settings controls use refreshPresentationSettings for the full atomic path.
   */
  refreshDisplayNames(): void {
    const settings = { ...this.presentationSettings,
      renderAlias: this.plugin.settings.renderAlias, nameFields: this.plugin.settings.nameFields,
      nodeTitleScript: this.plugin.settings.nodeTitleScript };
    const effects = classifySettingsChange(captureSettingsPolicy(this.presentationSettings), captureSettingsPolicy(settings));
    if (effects.presentationFacets || effects.searchTerms) this.aliasVocabularyPresentationRevision += 1;
    this.presentationSettings = settings;
    this.titleCache.clear();
    this.rebuildSearchIndex();
    this.emitPresentation();
    if (effects.presentationFacets || effects.searchTerms) this.retryUrlAliasUpgrade();
  }

  /** Base and retained bounded publications all need the same SI1 presentation facets. */
  private presentationPages(): GraphPage[] {
    const pages = new Set<GraphPage>(this.state.pages.values());
    for (const scope of this.semanticScopes.values()) for (const page of scope.pagesByPath.values()) pages.add(page);
    return [...pages];
  }

  /**
   * Prepare a settings-only refresh from cached inputs. A lightweight facet/search staging area is
   * published in one synchronous step. No builder, patcher, parser, relationship cache or body read
   * participates in presentation staging. Pending legacy alias upgrades retain their existing owner;
   * only meaningful facet/search changes supersede that work. Source publication/unload still fence it.
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
      const facets = effects.presentationFacets ? await prepareGraphPresentation(this.presentationPages(), settings, {
        names: keys.includes("showFullTagName"), limits: keys.includes("baseNodeStyle.maxLabelLength"),
        noteType: keys.includes("noteTypeField"), styleTags: keys.includes("primaryTagField") || keys.includes("tagStyleList"),
      }, this.app, this.fieldCache, this.indexedDb, current) : null;
      if (!policyCurrent() || (effects.presentationFacets && !facets)) continue;
      const search = effects.searchTerms ? await this.prepareSearchIndex(state, current, undefined, settings, facets) : null;
      if (!policyCurrent() || (facets && !facets.isCurrent()) || (effects.searchTerms && !search)) continue;
      // No await below this line: policy, facets and search become visible as one publication.
      if (facets) applyPreparedPresentation(facets, this.presentationStatuses);
      this.presentationSettings = settings;
      this.presentationRevision += 1;
      if (effects.presentationFacets || effects.searchTerms) this.aliasVocabularyPresentationRevision += 1;
      if (effects.searchTerms) this.titleCache.clear();
      if (search) this.installSearchIndex(search);
      if (effects.presentationFacets) this.suggestionCatalogCache = null;
      if (effects.nodeVisuals) this.nodeVisualCache.clear();
      this.recordIndexDiagnostic("restore", facets?.pending ? "presentation-inputs-pending" : "presentation-settings-adapted",
        { changedKeys: [...keys], modified: facets?.pending ?? 0 });
      this.emitPresentation();
      if (effects.presentationFacets || effects.searchTerms) this.retryUrlAliasUpgrade();
      return;
    }
  }

  /**
   * Prepare current presentation/search privately, retrying changed policies. A source-compiled node
   * projection already owns current type/style facets under the caller's captured policy fence;
   * preserve those validated fields rather than replacing them with absent legacy body-cache inputs.
   * A display change during any awaited preparation restarts private presentation work, while the
   * caller's source/compiler lifetime still fences which nodes may be published.
   */
  private async preparePresentationPublication(
    state: ReturnType<typeof createGraphState>, isCurrent: () => boolean, onProgress?: () => void, structuralPreview = false, sourceCompiledFacets = false, background = false,
  ): Promise<PreparedPresentationPublication | null> {
    while (isCurrent() && !this.diagnosticsClosed) {
      const settings = capturePresentationSettings(this.plugin.settings);
      const policy = captureSettingsPolicy(settings);
      const sourceRevision = this.plugin.getIndexSourceRevision();
      const current = (): boolean => isCurrent() && !this.diagnosticsClosed &&
        sourceRevision === this.plugin.getIndexSourceRevision();
      const policyCurrent = (): boolean => current() && !classifySettingsChange(policy, captureSettingsPolicy(this.plugin.settings)).render;
      const selection = sourceCompiledFacets ? { ...ALL_PRESENTATION_FACETS, noteType: false, styleTags: false } : ALL_PRESENTATION_FACETS;
      const facets = await prepareGraphPresentation(state.pages.values(), settings, selection,
        this.app, this.fieldCache, structuralPreview ? { getBodies: () => Promise.resolve(new Map()) } : this.indexedDb, current, onProgress, background ? () => this.workScheduler.checkpoint(3) : undefined);
      if (!facets || !policyCurrent()) continue;
      if (sourceCompiledFacets) {
        // These statuses attest the validated compiler output, not a fabricated empty body cache.
        let processed = 0;
        const readyFacets = new Map(facets.facets);
        for (const page of state.pages.values()) {
          readyFacets.set(page, { ...readyFacets.get(page), status: { noteType: "ready", styleTags: "ready" } });
          if ((++processed & 127) === 0) {
            await yieldToHostTask();
            if (background) await this.workScheduler.checkpoint(3);
            if (!policyCurrent()) break;
          }
        }
        if (!policyCurrent()) continue;
        const ready = { ...facets, facets: readyFacets };
        const search = await this.prepareSearchIndex(state, current, onProgress, settings, ready, undefined, background);
        if (!search || !policyCurrent() || !ready.isCurrent()) continue;
        return { settings, facets: ready, search };
      }
      // Cold structural publication keeps its bounded seed search and never preloads all bodies.
      const search = structuralPreview ? { entries: [], byPath: new Map<string, SearchEntry>() } :
        await this.prepareSearchIndex(state, current, onProgress, settings, facets, undefined, background);
      if (!search || !policyCurrent() || !facets.isCurrent()) continue;
      return { settings, facets, search };
    }
    return null;
  }

  /** Install facets and their narrow search lifetime immediately before graph/search publication. */
  private acceptPresentation(prepared: PreparedPresentationPublication): void {
    const effects = classifySettingsChange(captureSettingsPolicy(this.presentationSettings), captureSettingsPolicy(prepared.settings));
    if (effects.presentationFacets || effects.searchTerms) this.aliasVocabularyPresentationRevision += 1;
    applyPreparedPresentation(prepared.facets, this.presentationStatuses);
    this.presentationSettings = prepared.settings;
    this.presentationRevision += 1;
  }

  get size(): number { return this.state.pages.size; }
  /** Markdown sources represented by the currently published semantic index. */
  indexedMarkdownFileCount(): number { return this.semanticFingerprints.size; }
  /** The progressive builder pauses source ingestion while a checkpoint is made durable. */
  isCheckpointSaving(): boolean { return this.checkpointSaving; }
  get(path: string): GraphPage | undefined {
    const exactPrepared = this.semanticPage(path);
    if (exactPrepared && exactPrepared !== this.state.pages.get(path)) return this.composeRelationshipPairs(exactPrepared);
    const base = getGraphPage(this.state, path);
    if (!base) return exactPrepared ? this.composeRelationshipPairs(exactPrepared) : undefined;
    const page = this.semanticPage(base.path);
    return page ? this.composeRelationshipPairs(page) : undefined;
  }
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
    const scope = this.semanticScopeForPath(sourcePath);
    return scope ? scope.evidence.from(sourcePath) : this.state.evidence.from(sourcePath);
  }

  evidenceBetween(sourcePath: string, targetPath: string): RelationEvidence[] {
    return this.semanticEvidence(sourcePath, targetPath).evidence;
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

  /** Invalidate in-flight semantic work and advance the demanded policy without scheduling a rebuild. */
  invalidateSemanticPolicy(): void {
    this.semanticPolicyRevision += 1;
    this.navigableSnapshotSourceRevision = null;
    this.retiredSnapshotPaths.clear();
    this.hostPreviewScopes.clear();
    this.semanticPreparationDiagnostics = { ...this.semanticPreparationDiagnostics,
      policyRevision: this.semanticPolicyRevision, lastReason: "semantic-policy-changed" };
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
      await this.workScheduler.checkpoint(3);
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
        await this.workScheduler.checkpoint(3);
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
            await this.workScheduler.checkpoint(3);
            if (!current()) return false;
            body = await this.metadataParser.parse(content, () => this.workScheduler.checkpoint(3));
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
          await yieldToHostTask();
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
    this.workScheduler.close();
    this.hostPreview.dispose();
    this.hostPreviewScopes.clear();
    this.hostPreviewRequests.clear();
    this.presentationRun += 1;
    this.semanticPolicyRevision += 1;
    this.semanticDemandRevision.clear();
    this.semanticDemandCounts.clear();
    this.semanticScopes.clear();
    this.hostPreviewScopes.clear();
    this.relationshipPairs.clear();
    this.relationshipPairBytes = 0;
    this.relationshipPairRevision++;
    this.semanticPreparationTasks.clear();
    this.relationshipPairTasks.clear();
    this.relationshipPairTaskObservations = new WeakMap();
    this.relationshipPairViews = new WeakMap();
    this.semanticPreparationFailures.clear();
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
    // An unloaded plugin may remain reachable through a retiring view or cancelled continuation.
    // Release graph/search/body ownership now instead of retaining a complete vault until that
    // unrelated host reference is collected. Published page objects themselves are not mutated.
    this.state = createGraphState();
    this.searchEntries = [];
    this.physicalSearchEntries.clear();
    this.physicalSearchMerge = null;
    this.fieldCache.clear();
    this.nodeVisualCache.clear();
    this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
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

  /** Pause optional snapshot work behind foreground owners, releasing mobile CPU slices through a host event task. */
  private async yieldSnapshotWork(): Promise<void> {
    await this.workScheduler.checkpoint(3);
    if (!Platform.isMobile) return;
    await yieldToHostTask();
  }

  /**
   * Publish a privately prepared generation and its search atomically. Node-only catalogs retire
   * warm incidence proof; only the same hydration owner's fenced evidence promotion preserves it.
   * No asynchronous work occurs between state replacement, cache retirement and notification.
   */
  private publishRestoredState(
    next: ReturnType<typeof createGraphState>,
    preparedSearch: PreparedSearchIndex | null = null,
    keepExistingSearch = false,
    authoritativeSemantics = true,
    preserveSnapshotPresentation = false,
  ): void {
    // Node-only source catalogs and new generations do not inherit the replaced snapshot's
    // complete incidence proof. Only its fenced evidence promotion preserves that presentation.
    if (!preserveSnapshotPresentation) {
      this.navigableSnapshotSourceRevision = null;
      this.retiredSnapshotPaths.clear();
    }
    this.state = next;
    if (authoritativeSemantics) this.hostPreviewScopes.clear();
    if (authoritativeSemantics || this.sourceNodeVocabularyPublished) {
      // These publications contain every captured physical endpoint; preview facets can retire.
      this.physicalSearchEntries.clear();
      this.physicalSearchMerge = null;
    }
    this.publicationRevision += 1;
    if (authoritativeSemantics && !this.sourceBackedSemantics) {
      this.fullSemanticSettings = graphCompilerSettingsFromLegacy(this.plugin.settings);
      this.fullSemanticPolicyRevision = this.semanticPolicyRevision;
      this.fullSemanticMaintenanceRevision = this.sourceAcquisition.getMaintenanceRevision();
      this.fullSemanticSourceRevision = this.plugin.getIndexSourceRevision();
      this.semanticScopes.clear();
      this.retirePublishedRelationshipPairs();
    }
    this.titleCache.clear();
    this.suggestionCatalogCache = null;
    this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
    if (preparedSearch) this.installSearchIndex(preparedSearch);
    else if (!keepExistingSearch) this.rebuildSearchIndex();
    if (this.sourceBackedSemantics) this.retryDemandedSemanticScopes();
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
    aliasOverrides?: ReadonlyMap<GraphPage, readonly string[]>,
    background = false,
  ): Promise<PreparedSearchIndex | null> {
    const entries: SearchEntry[] = [];
    const byPath = new Map<string, SearchEntry>();
    const budgetMs = Platform.isIosApp ? 5 : Platform.isMobile ? 7 : 10;
    let sliceStartedAt = performance.now();
    let processed = 0;

    for (const page of state.pages.values()) {
      if (!isCurrent()) return null;
      const entry = this.makeSearchEntry(page, settings, facets?.facets.get(page)?.name, aliasOverrides?.get(page));
      entries.push(entry);
      byPath.set(page.path, entry);
      processed += 1;

      if ((processed & 255) === 0) {
        onProgress?.();
        if (performance.now() - sliceStartedAt >= budgetMs) {
          await yieldToHostTask();
          if (!isCurrent()) return null;
          if (background) await this.workScheduler.checkpoint(3);
          sliceStartedAt = performance.now();
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
    // durable-source startup prioritizes current requested semantics before full graph hydration.
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
    this.publishRestoredState(next, prepared.search, false, false);
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
    onNavigable?: () => void,
  ): Promise<{ restored: boolean; fresh: boolean; createdAt: number | null }> {
    let expectedPublicationRevision = this.publicationRevision;
    const isCurrent = () => run === this.snapshotHydrationRun && parentCurrent()
      && expectedPublicationRevision === this.publicationRevision;
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
        const reboundPage = next.pages.get(page.path);
        const rebound = reboundPage?.file;
        if (rebound) {
          if (reboundPage) this.snapshotFileRevisions.set(reboundPage, captureFileRevision(rebound));
          if (rebound.extension === "md" && typeof page.mtime === "number") {
            this.plugin.startupDiagnostics?.count("hydration", "physicalRevisionComparisons");
            if (rebound.stat.mtime !== page.mtime) modifiedMarkdownPaths.add(rebound.path);
          }
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
      pagePreview.pages = new Map(next.pages);
      pagePreview.lowercasePathMap = next.lowercasePathMap;
      pagePreview.discoveredFields = next.discoveredFields;
      this.fullSnapshotHydrated = false;
      this.fullSnapshotFresh = false;
      this.previewSnapshotPublished = true;
      this.restoredPatchPlanAvailable = false;
      this.setSnapshotHydrationPhase(run, "preview-search");
      const prepared = await this.preparePresentationPublication(pagePreview, isCurrent, () => this.touchSnapshotHydrationProgress(run), false, false, true);
      if (!prepared || !isCurrent() || !prepared.facets.isCurrent()) return { restored: false, fresh: false, createdAt: meta.createdAt };
      this.acceptPresentation(prepared);
      this.publishRestoredState(pagePreview, prepared.search, false, false);
      if (fresh && meta.key === "active" && modifiedMarkdownPaths.size === 0) {
        this.navigableSnapshotSourceRevision = this.plugin.getIndexSourceRevision();
        this.retiredSnapshotPaths.clear();
        this.hostPreviewScopes.clear();
      }
      expectedPublicationRevision = this.publicationRevision;
      onNavigable?.();
    }

    this.plugin.startupDiagnostics?.mark("evidence-hydration-start");
    this.setSnapshotHydrationPhase(run, "evidence");
    const evidenceOk = await this.indexedDb.iterateSnapshotEvidence(meta, (item) => {
      if (!isCurrent()) return;
      this.noteSnapshotHydrationProgress(run, "evidence");
      addPersistedEvidenceToState(next, item);
    }, isCurrent, (reason) => {
      if (isCurrent()) this.recordIndexDiagnostic("restore", `${meta.key}-evidence-${reason}`);
    });
    if (!evidenceOk || !isCurrent()) return { restored: false, fresh: false, createdAt: meta.createdAt };
    this.plugin.startupDiagnostics?.mark("evidence-hydration-end");
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
    // The earlier page-only publication contains the same immutable page records. Evidence hydration does
    // not alter searchable page metadata, so avoid allocating/sorting the 100k+ search index a
    // second time when promoting the fully hydrated state.
    // Primary source authority is independent of additional URL search labels. Promote the
    // coherent cached graph now; the existing alias owner repairs/stages optional vocabulary after
    // hydration releases its task, preserving the old facet marker until authenticated completion.
    this.setSnapshotHydrationPhase(run, "promote");
    if (relationsHydrated) {
      if (classifySettingsChange(captureSettingsPolicy(this.presentationSettings), captureSettingsPolicy(this.plugin.settings)).render) {
        await this.refreshPresentationSettings();
        if (!isCurrent()) return { restored: false, fresh: false, createdAt: meta.createdAt };
      }
      this.publishRestoredState(next, null, true, true, true);
      expectedPublicationRevision = this.publicationRevision;
    } else {
      this.setSnapshotHydrationPhase(run, "authoritative-search");
      const prepared = await this.preparePresentationPublication(next, isCurrent, () => this.touchSnapshotHydrationProgress(run), false, false, true);
      if (!prepared || !isCurrent() || !prepared.facets.isCurrent()) return { restored: false, fresh: false, createdAt: meta.createdAt };
      this.acceptPresentation(prepared);
      this.publishRestoredState(next, prepared.search, false, true, true);
      expectedPublicationRevision = this.publicationRevision;
    }
    this.fullSnapshotHydrated = !isCheckpoint;
    if (!isCheckpoint && authoritativeFresh && !this.pendingUrlAliasUpgrade) {
      // Requested scopes own bounded semantics, not complete global URL-label incidence. The
      // authenticated complete snapshot certifies those facets for this exact unchanged vault.
      for (const scope of this.semanticScopes.values()) {
        if (scope.policyRevision !== this.semanticPolicyRevision
          || scope.maintenanceRevision !== this.sourceAcquisition.getMaintenanceRevision()
          || scope.sourceRevision !== this.plugin.getIndexSourceRevision()) continue;
        for (const page of scope.pagesByPath.values()) {
          const complete = page.url ? next.pages.get(page.path) : undefined;
          if (complete?.url === page.url && complete) page.aliases = [...complete.aliases];
        }
      }
    }
    if (!isCheckpoint) {
      // Exact physical membership was already compared above. Full search now owns every file.
      this.physicalSearchEntries.clear();
      this.physicalSearchMerge = null;
      this.searchCandidateCache.clear();
    }
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

  /**
   * Restore bounded previews before optional full acceleration, retaining legacy candidate fallback.
   * Trusted active generations publish navigable pages before source certification; untrusted or
   * damaged generations retain neutral-source recovery. Only real source/compiler progress advances
   * the unchanged watchdog. Awaited phases reject supersession; previews never grant write authority.
   */
  private async restoreIndexedDbSnapshot(seedPaths: readonly string[] = []): Promise<{ restored: boolean; fresh: boolean; createdAt: number | null; partial?: boolean }> {
    this.cancelSnapshotHydration?.();
    const run = ++this.snapshotHydrationRun;
    const semanticPolicy = computeIndexSettingsSignature(this.plugin.settings);
    const isCurrent = () => run === this.snapshotHydrationRun && !this.diagnosticsClosed &&
      semanticPolicy === computeIndexSettingsSignature(this.plugin.settings);
    this.beginSnapshotHydrationDiagnostics(run);
    this.fullSnapshotHydrated = false;
    this.fullSnapshotFresh = false;
    this.fullSemanticPolicyRevision = 0;
    this.sourceBackedStartup = false;
    this.warmSourceRecoveryAvailable = false;
    this.sourceNodeVocabularyPublished = false;
    this.restoredPatchPlanAvailable = false;
    this.restoredAddedMarkdownPaths = [];
    this.restoredRemovedMarkdownPaths = [];
    this.restoredVaultSignature = null;
    this.restoreInventorySourceRevision = null;
    this.resumableCheckpointPaths = null;
    let createdAt: number | null = null;
    let persistedSources = false;
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
      // Physical classification is independent of durable source heads. A complete current-policy
      // schema-3 generation can supply navigation before source certification or provenance.
      this.plugin.startupDiagnostics?.mark("snapshot-catalog-read");
      this.plugin.startupDiagnostics?.mark("host-inventory-start");
      const inventory = captureVaultInventory(this.app);
      this.plugin.startupDiagnostics?.mark("host-inventory-end");
      this.plugin.startupDiagnostics?.count("hydration", "inventoryFiles", inventory.filesByPath.size);
      this.plugin.startupDiagnostics?.count("hydration", "inventoryFolders", inventory.folderPaths.size);
      this.restoreInventorySourceRevision = this.plugin.getIndexSourceRevision();
      const snapshotSourceRevision = this.restoreInventorySourceRevision;
      const snapshotHostPresentationRevision = this.hostPresentationRevision;
      const trustedWarmSnapshot = Boolean(active && active.key === "active" && active.schema >= 3
        && active.vaultSignature === inventory.signature && compatibility.get(active)?.reason === "compatible"
        && !compatibility.get(active)?.retiredFilepath);
      if (!trustedWarmSnapshot) persistedSources = await this.startPersistedSourceInventory();
      if (!isCurrent()) return { restored: false, fresh: false, createdAt };
      // A changed ontology does not invalidate neutral facts. Reuse the physical/search baseline,
      // but keep all semantic consumers on the same requested-source path used by live settings.
      const usable = (meta: IndexedDbSnapshotMeta | null): boolean => Boolean(meta
        && (compatibility.get(meta)?.compatible || persistedSources && meta.key === "active"
          && compatibility.get(meta)?.reason === "semantic-settings-changed"));
      if (!usable(active) && !usable(checkpoint)) {
        createdAt = active?.createdAt ?? checkpoint?.createdAt ?? null;
        const decision = (active && compatibility.get(active)) || (checkpoint && compatibility.get(checkpoint));
        this.recordIndexDiagnostic("restore", !catalog.available ? "storage-unavailable" :
          catalog.invalidActive || catalog.invalidCheckpoint ? "invalid-snapshot-metadata" :
            decision ? decision.reason : "no-complete-snapshot", { changedKeys: [...(decision?.changedKeys ?? [])] });
        if (persistedSources && await this.restoreSourceBackedBaseline(isCurrent, run,
          () => reportPreview({ restored: true, fresh: true, createdAt, partial: true }))) {
          return { restored: true, fresh: true, createdAt };
        }
        return { restored: false, fresh: false, createdAt };
      }
      if (!this.physicalSearchEntries.size && !(await this.preparePhysicalSearchCatalog(inventory.filesByPath, isCurrent))) return { restored: false, fresh: false, createdAt };
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
        this.sourceBackedSemantics = persistedSources || trustedWarmSnapshot || !decision.compatible;
        if (this.sourceBackedSemantics) this.fullSemanticPolicyRevision = 0;
        if (!decision.compatible) {
          this.recordIndexDiagnostic("restore", "source-backed-policy-baseline", { changedKeys: [...decision.changedKeys] });
        }
        if (decision.reason !== "compatible") this.recordIndexDiagnostic("restore", decision.reason, { changedKeys: [...decision.changedKeys] });
        this.urlAliasFacetVersion = meta.urlAliasVersion ?? 0;
        this.pendingUrlAliasUpgrade = this.urlAliasFacetVersion !== URL_ALIAS_FACET_VERSION;
        this.urlAliasUpgradeFailure = null;
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
        if (previewPublished) {
          this.plugin.startupDiagnostics?.mark("preview-available");
          reportPreview({ restored: true, fresh, createdAt, partial: true });
        }
        // Optional graph/evidence reads must not compete with the restart source-authority pass.
        // Keep the bounded preview visible, prepare its current-policy scopes, then hydrate the
        // complete search acceleration. This does not claim complete global vocabulary early.
        if (persistedSources) {
          this.setSnapshotHydrationPhase(run, "source-authority");
          const adopted = await this.awaitStartupSourceAuthority(isCurrent);
          if (!isCurrent()) return { restored: false, fresh: false, createdAt };
          if (!adopted || !this.sourceAcquisition.hasSemanticDependencies()) {
            this.recordIndexDiagnostic("restore", "startup-source-authority-pending");
            break;
          }
          this.setSnapshotHydrationPhase(run, "requested-semantics");
          this.plugin.startupDiagnostics?.mark("source-authority-await-ended");
          await this.refreshSemanticSettings();
          this.plugin.startupDiagnostics?.mark("requested-semantics-refresh-ended");
          if (!isCurrent()) return { restored: false, fresh: false, createdAt };
        }
        // Foreground mutations/host events cannot be overwritten by a captured graph generation.
        const candidateCurrent = (): boolean => isCurrent() && (!trustedWarmSnapshot
          || snapshotSourceRevision === this.plugin.getIndexSourceRevision()
            && snapshotHostPresentationRevision === this.hostPresentationRevision);
        const result = await this.restoreFullIndexedDbSnapshot(meta, fresh, run, inventory, candidateCurrent, upgradePaths,
          trustedWarmSnapshot ? () => {
            this.plugin.startupDiagnostics?.mark("navigable-graph-published");
            reportPreview({ restored: true, fresh: true, createdAt, partial: true });
            this.warmSourceRecoveryAvailable = true;
            this.sourceAcquisition.enableInventory();
          } : undefined);
        if (result.restored && decision.presentationChanged) this.recordIndexDiagnostic("restore", "presentation-settings-adapted",
          { changedKeys: [...decision.changedKeys] });
        if (result.restored) { this.warmSourceRecoveryAvailable = false; return result; }
        if (this.retainWarmSourceRecovery() || !isCurrent()) return result;
        if (trustedWarmSnapshot) persistedSources = await this.startPersistedSourceInventory();
      }
      if (persistedSources && await this.restoreSourceBackedBaseline(isCurrent, run,
          () => reportPreview({ restored: true, fresh: true, createdAt, partial: true }))) {
        return { restored: true, fresh: true, createdAt };
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
    }).catch(async () => {
      this.recordIndexDiagnostic("restore", "restore-exception");
      if (this.retainWarmSourceRecovery() || !isCurrent()) {
        this.finishSnapshotHydrationDiagnostics(run, "failed");
        return { restored: false, fresh: false, createdAt };
      }
      // A trusted catalog can still have damaged page chunks. Its fast path deferred source heads;
      // acquire the existing recovery owner now rather than treating skipped inventory as absence.
      if (!persistedSources) persistedSources = await this.startPersistedSourceInventory();
      if (persistedSources && await this.restoreSourceBackedBaseline(isCurrent, run,
          () => reportPreview({ restored: true, fresh: true, createdAt, partial: true }))) {
        return { restored: true, fresh: true, createdAt };
      }
      this.finishSnapshotHydrationDiagnostics(run, "failed");
      return { restored: false, fresh: false, createdAt };
    });
    const task = this.watchSnapshotHydration(restoreTask, run, () => createdAt);
    this.snapshotHydrationTask = task;
    void task.then(() => {
      if (this.snapshotHydrationTask !== task) return;
      this.snapshotHydrationTask = null;
      this.retryUrlAliasUpgrade();
      // Status consumers distinguish cache hydration from later reconciliation/indexing. Publish
      // that phase boundary even when the graph itself did not change at task completion.
      this.emit();
    });
    return Promise.race([preview, task]);
  }

  /** Start watchdog facts and the optional passive timing lane for this exact restore lifetime. */
  private beginSnapshotHydrationDiagnostics(run: number): void {
    const now = Date.now();
    this.plugin.startupDiagnostics?.phase("hydration", "metadata");
    this.snapshotHydrationDiagnostics = {
      run, phase: "metadata", lastActivePhase: "metadata", startedAt: now, phaseStartedAt: now, lastProgressAt: now,
      pages: 0, relations: 0, evidence: 0, outcome: "running",
    };
  }

  private isSnapshotHydrationRunning(run: number): boolean {
    return this.snapshotHydrationRun === run && this.snapshotHydrationDiagnostics.run === run &&
      this.snapshotHydrationDiagnostics.outcome === "running";
  }

  /** Observe actual phase transitions; neither timing nor UI progress changes authority or scheduling. */
  private setSnapshotHydrationPhase(run: number, phase: SnapshotHydrationPhase): void {
    if (!this.isSnapshotHydrationRunning(run)) return;
    const now = Date.now();
    this.plugin.startupDiagnostics?.phase("hydration", phase);
    this.plugin.notifyStartupProgress?.();
    this.snapshotHydrationDiagnostics.phase = phase;
    this.snapshotHydrationDiagnostics.lastActivePhase = phase;
    this.snapshotHydrationDiagnostics.phaseStartedAt = now;
    this.snapshotHydrationDiagnostics.lastProgressAt = now;
  }

  private touchSnapshotHydrationProgress(run: number): void {
    if (this.isSnapshotHydrationRunning(run)) this.snapshotHydrationDiagnostics.lastProgressAt = Date.now();
  }

  /** Count decoded records exactly; sample clock and UI notifications at existing batch boundaries. */
  private noteSnapshotHydrationProgress(run: number, kind: "pages" | "relations" | "evidence"): void {
    if (!this.isSnapshotHydrationRunning(run)) return;
    this.snapshotHydrationDiagnostics[kind] += 1;
    this.plugin.startupDiagnostics?.processed("hydration");
    // Sample time reads, not counters. Search/resolver loops also signal bounded real progress.
    if ((this.snapshotHydrationDiagnostics[kind] & 255) === 0) {
      this.touchSnapshotHydrationProgress(run);
      this.plugin.notifyStartupProgress?.();
    }
  }

  /** Seal watchdog outcome and timing; late superseded callbacks cannot rewrite the result. */
  private finishSnapshotHydrationDiagnostics(
    run: number,
    outcome: Exclude<SnapshotHydrationDiagnostics["outcome"], "idle" | "running">,
  ): void {
    if (!this.isSnapshotHydrationRunning(run)) return;
    this.plugin.startupDiagnostics?.phase("hydration", outcome);
    this.plugin.startupDiagnostics?.mark("snapshot-" + outcome);
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
        this.retainWarmSourceRecovery();
        this.startupSourceAuthorityWaiter?.cancel();
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
    if (this.snapshotHydrationTask) this.cancelSnapshotHydration?.();
    this.navigableSnapshotSourceRevision = null;
    this.publicationRevision += 1;
    // A coherent older scope may remain readable during repair, but cannot shadow a newer atomic
    // file publication. Retire only affected overlays; source readiness owns their bounded refresh.
    for (const [center, scope] of this.semanticScopes) if (scope.pagesByPath.has(commit.sourcePath)
      || [...scope.completePaths].some(path => commit.touchedPagePaths.has(path))) {
      this.semanticScopes.delete(center);
      this.semanticPreparationFailures.delete(center);
    }
    for (const [center, preview] of this.hostPreviewScopes) if (commit.touchedPagePaths.has(center) || preview.pages.has(commit.sourcePath)) {
      this.hostPreviewScopes.delete(center);
      this.hostPreviewRequests.set(center, (this.hostPreviewRequests.get(center) ?? 0) + 1);
    }
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
    this.retryDemandedSemanticScopes();
    this.patchSearchIndex(commit.touchedPagePaths);
    this.suggestionCatalogCache = null;
  }

  /** Complete one normal incremental publication synchronously and notify graph subscribers only
   * when graph topology changed. The publisher never awaits or retains the prepared-state callback. */
  private publishIncrementalFile: PatchFilePublisher = (commit: PatchFileCommit, publishPreparedState: () => void): void => {
    this.commitPreparedFile(commit, publishPreparedState);
    for (const [center, preview] of this.hostPreviewScopes) if (center === commit.sourcePath || preview.pages.has(commit.sourcePath)) {
      this.hostPreviewScopes.delete(center);
      this.hostPreviewRequests.set(center, (this.hostPreviewRequests.get(center) ?? 0) + 1);
    }
    this.retirePublishedRelationshipPairs();
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
        () => this.workScheduler.checkpoint(3),
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
        sourceNodeBaseline: this.sourceBackedStartup,
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
      this.retrySourceNodeImpacts();
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
      const prepared = await this.preparePresentationPublication(next, current, undefined, false, false, true);
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
      urlAliasVersion: this.urlAliasFacetVersion,
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
    // A graph borrowed under another policy is not a complete generation of the current policy.
    // Neutral source heads own progress; do not serialize a mixed requested/baseline graph.
    if (this.sourceBackedSemantics) return;
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
   * set on restart. Production progress is durable per-source; old graph checkpoints are read-only
   * migration inputs. The historical checkpoint writer is available only to characterization.
   *
   * @param seedPaths Ordered startup center candidates; the first graph path that exists wins.
   * @param options `prewarmBodyCache` preserves the large-iOS body pass and
   * remains the only optional ingestion mode; the retired writer lives solely in test fixtures.
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
    this.semanticPreparationDiagnostics = { ...this.semanticPreparationDiagnostics,
      fullBuilds: this.semanticPreparationDiagnostics.fullBuilds + 1 };
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
        () => this.workScheduler.checkpoint(3),
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
        const prepared = await this.preparePresentationPublication(next, isCurrent, undefined, true, false, true);
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
      const result = await builder.patchMarkdownFiles(this.state, remaining, {
        useDurableCache: true,
        awaitBodyWrite: false,
        discoveryMode: "rebuild",
        publishFileCommit: (commit, publishPreparedState) => {
          this.commitPreparedFile(commit, publishPreparedState);
          indexedPaths.add(commit.sourcePath);
          commitsSinceNotify += 1;
          if (commitsSinceNotify < notifyEvery) return;
          commitsSinceNotify = 0;
          this.emit();
        },

      });
      if (!result.ok || !isCurrent()) return false;
      if (commitsSinceNotify > 0) this.emit();

      // The bounded startup search intentionally grows from per-file commits. Rebuild it once at
      // completion so standalone attachments/folders/tags and untouched virtual nodes are included.
      this.rebuildSearchIndex();
      this.fullSemanticSettings = graphCompilerSettingsFromLegacy(this.plugin.settings);
      this.sourceBackedSemantics = false;
      this.pendingUrlAliasUpgrade = false;
      this.urlAliasFacetVersion = URL_ALIAS_FACET_VERSION;
      this.urlAliasUpgradeFailure = null;
      this.sourceBackedStartup = false;
      this.physicalSearchEntries.clear();
      this.physicalSearchMerge = null;
      this.fullSemanticPolicyRevision = this.semanticPolicyRevision;
      this.fullSemanticMaintenanceRevision = this.sourceAcquisition.getMaintenanceRevision();
      this.semanticScopes.clear();
      this.retirePublishedRelationshipPairs();
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
    this.semanticPreparationDiagnostics = { ...this.semanticPreparationDiagnostics,
      fullBuilds: this.semanticPreparationDiagnostics.fullBuilds + 1 };
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
        () => this.workScheduler.checkpoint(3),
      );
      const next = await builder.build({ acquireSources: false });
      if (!next || !current()) {
        return false;
      }

      const prepared = await this.preparePresentationPublication(next, current, undefined, false, false, true);
      if (!prepared || !current() || !prepared.facets.isCurrent() ||
        semanticPolicy !== computeIndexSettingsSignature(this.plugin.settings)) return false;
      const preparedSearch = prepared.search;
      this.acceptPresentation(prepared);

      // Atomic graph-state swap: readers never observe a half-built graph.
      this.state = next;
      this.publicationRevision += 1;
      this.fullSemanticSettings = graphCompilerSettingsFromLegacy(this.plugin.settings);
      this.sourceBackedSemantics = false;
      this.pendingUrlAliasUpgrade = false;
      this.urlAliasFacetVersion = URL_ALIAS_FACET_VERSION;
      this.urlAliasUpgradeFailure = null;
      this.sourceBackedStartup = false;
      this.physicalSearchEntries.clear();
      this.physicalSearchMerge = null;
      this.fullSemanticPolicyRevision = this.semanticPolicyRevision;
      this.fullSemanticMaintenanceRevision = this.sourceAcquisition.getMaintenanceRevision();
      this.semanticScopes.clear();
      this.retirePublishedRelationshipPairs();
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
  private makeSearchEntry(page: GraphPage, settings?: KplexSettings, name = page.name, aliases: readonly string[] = page.aliases): SearchEntry {
    const title = settings ? this.displayNameFromConfiguredFields(page, settings) ?? name : this.titleFor(page);
    const alternateNames = new Set([name, ...aliases]);
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
    this.physicalSearchMerge = null;
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

  /**
   * Prepare and atomically publish canonical evidence for one editable pair. This grants exact pair
   * authority only, without demanding the other endpoint's complete incidence or joining unrelated
   * view preparation. Optional alias owners drain this actual task before their next CAS. One in-flight
   * writer conflict may retry after that writer has finished; unchanged terminal inputs never loop.
   * Calls share one task only while its selected physical/cache/event/policy observation remains
   * current. A newer observation drains the retired exact task before proving its own authority.
   * Distinct pairs borrowing one document drain earlier exact tasks through their entire replay
   * lifetime; unrelated document owners proceed independently of those finite predecessors.
   */
  prepareRelationshipPair(sourcePath: string, targetPath: string, provisionalTarget?: GraphPage): Promise<boolean> {
    const key = relationshipPairKey(sourcePath, targetPath);
    const existing = this.relationshipPairTasks.get(key);
    if (existing && this.relationshipPairTaskObservations.get(existing)?.current()) return existing;
    const policyRevision = this.semanticPolicyRevision;
    const signature = JSON.stringify(graphCompilerSettingsFromLegacy(this.plugin.settings));
    const endpoints = [this.get(sourcePath), this.get(targetPath) ?? provisionalTarget];
    const physical = endpoints.filter((page): page is GraphPage => Boolean(page?.file)).map(
      /** Retain this caller's selected observation while an older source writer finishes. */
      page => ({ path: page.path, file: page.file!, revision: captureFileRevision(page.file!),
        eventRevision: this.sourceAcquisition.getFileRevision(page.file!),
        cache: page.file!.extension === "md" ? this.app.metadataCache.getFileCache(page.file!) : null }));
    const owners = physical.filter(token => token.file.extension === "md").map(token => token.path);
    // Snapshot predecessors before registering this task. The resulting graph is acyclic: later
    // tasks can drain earlier owners, while earlier tasks never acquire dependencies on later ones.
    const predecessors = [...this.relationshipPairTasks.values()].filter(task => task === existing
      || this.relationshipPairTaskObservations.get(task)?.owners.some(path => owners.includes(path)));
    /** A queued caller cannot silently adopt metadata, native events or policy changed during its drain. */
    const observationCurrent = (): boolean => !this.diagnosticsClosed && endpoints.every(Boolean)
      && policyRevision === this.semanticPolicyRevision
      && signature === JSON.stringify(graphCompilerSettingsFromLegacy(this.plugin.settings))
      && physical.every(token => this.app.vault.getFileByPath(token.path) === token.file
        && fileRevisionMatches(token.file, token.revision)
        && this.sourceAcquisition.getFileRevision(token.file) === token.eventRevision
        && (token.file.extension !== "md" || this.app.metadataCache.getFileCache(token.file) === token.cache));
    const task = this.withForegroundPriority(async () => {
      // A new cache/body observation must not borrow the older task's negative evidence or its
      // cancellation result. Drain only that exact retired writer, preserving this caller's inputs.
      if (predecessors.length) await Promise.allSettled(predecessors);
      if (!observationCurrent()) return false;
      return this.prepareRelationshipPairOwned(sourcePath, targetPath, provisionalTarget);
    }).finally(() => {
      if (this.relationshipPairTasks.get(key) === task) this.relationshipPairTasks.delete(key);
      if (!this.diagnosticsClosed) this.emitPresentation();
    });
    this.relationshipPairTaskObservations.set(task, { current: observationCurrent, owners });
    this.relationshipPairTasks.set(key, task);
    return task;
  }

  /** Exact selected endpoints and private staged evidence close at the final current-policy/source fence. */
  private async prepareRelationshipPairOwned(sourcePath: string, targetPath: string, provisionalTarget?: GraphPage): Promise<boolean> {
    const requestedPolicy = this.semanticPolicyRevision, requestedSettings = JSON.stringify(graphCompilerSettingsFromLegacy(this.plugin.settings));
    // Creation supplies only an explicit unbound URL/ghost coordinate. It remains private negative
    // coverage until the established creator inserts that endpoint after its successful vault write.
    if (provisionalTarget && (provisionalTarget.path !== targetPath || provisionalTarget.file
      || provisionalTarget.isFolder || provisionalTarget.isTag || provisionalTarget.neighbours.size)) return false;
    const original = [this.get(sourcePath), this.get(targetPath) ?? provisionalTarget];
    if (original.some(page => !page)) return false;
    const originalPhysical = original.filter((page): page is GraphPage => Boolean(page?.file)).map(
      /** Preserve the selected observation across retries; only unrelated source churn may restart. */
      page => ({ path: page.path, file: page.file!, revision: captureFileRevision(page.file!),
        cache: page.file!.extension === "md" ? this.app.metadataCache.getFileCache(page.file!) : null }));
    /** The caller's selected physical identity and policy cannot silently become a replacement file/action. */
    const requestedCurrent = (): boolean => this.semanticPolicyRevision === requestedPolicy
      && JSON.stringify(graphCompilerSettingsFromLegacy(this.plugin.settings)) === requestedSettings
      && originalPhysical.every(token => this.app.vault.getFileByPath(token.path) === token.file
        && fileRevisionMatches(token.file, token.revision)
        && (token.file.extension !== "md" || this.app.metadataCache.getFileCache(token.file) === token.cache));
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!requestedCurrent() || this.diagnosticsClosed || this.pendingStructuralTasks || sourcePath === targetPath) return false;
      if (this.diagnosticsClosed || !requestedCurrent()) return false;
      const source = this.get(sourcePath), target = this.get(targetPath) ?? provisionalTarget;
      if (!source || !target || (!source.file || source.file.extension !== "md") && (!target.file || target.file.extension !== "md")) return false;
      const policyRevision = this.semanticPolicyRevision, sourceRevision = this.plugin.getIndexSourceRevision();
      const maintenanceRevision = this.sourceAcquisition.getMaintenanceRevision(), publicationRevision = this.publicationRevision;
      const settings = graphCompilerSettingsFromLegacy(this.plugin.settings), signature = JSON.stringify(settings);
      let pairPublished = false;
      const endpoints = [this.semanticSourceRef(source), this.semanticSourceRef(target)] as const;
      const physical = [source, target].filter(page => page.file).map(
        /** Borrow exact native identities; no inferred mtime or whole graph capture grants authority. */
        page => ({ path: page.path, file: page.file!, revision: captureFileRevision(page.file!),
          cache: page.file!.extension === "md" ? this.app.metadataCache.getFileCache(page.file!) : null }));
      /** Physical replacements, actual policy/source edits and publication supersession cancel the whole private pair. */
      const current = (): boolean => requestedCurrent() && !this.diagnosticsClosed && !this.pendingStructuralTasks
        && policyRevision === this.semanticPolicyRevision && sourceRevision === this.plugin.getIndexSourceRevision()
        && (pairPublished || publicationRevision === this.publicationRevision)
        && signature === JSON.stringify(graphCompilerSettingsFromLegacy(this.plugin.settings))
        && physical.every(
          /** Every selected physical endpoint retains its exact observation through publication and writes. */
          token => this.app.vault.getFileByPath(token.path) === token.file && fileRevisionMatches(token.file, token.revision)
            && (token.file.extension !== "md" || this.app.metadataCache.getFileCache(token.file) === token.cache));
      const runtime = { ...this.semanticPreparationRuntime(current), retainedBytes: this.relationshipPairBytes };
      const policy = { revision: String(policyRevision), settings, isCurrent: current };
      const prepared = await this.sourceAcquisition.prepareRequestedPair({ kind: "pair", endpoints }, policy,
        { noteTypeField: this.plugin.settings.noteTypeField, primaryTagField: this.plugin.settings.primaryTagField }, runtime);
      if (prepared.outcome !== "ready" || !current()) {
        if (attempt === 0 && (!current() || prepared.outcome !== "ready" && ["superseded", "dependency-pending", "cancelled"].includes(prepared.reason))) continue;
        return false;
      }
      const canonical = prepared.preparation.compilation.legacyEvidence();
      if (!canonical) return false;
      const evidence = new RelationEvidenceStore();
      const key = relationshipPairKey(sourcePath, targetPath), previous = this.relationshipPairs.get(key);
      const retained = this.relationshipPairBytes - (previous?.bytes ?? 0);
      // Reserve directed relation/target metadata and both immutable derived-map views before save.
      // Borrowed native files and existing baseline objects are not recursively counted as graphs.
      let bytes = 512 + estimateReferenceRecordBytes(settings) + 2 * (sourcePath.length + targetPath.length);
      for (const page of [source, target]) bytes += 256 + 256 * page.neighbours.size
        + estimateReferenceRecordBytes({ name: page.name, aliases: page.aliases, tags: page.tags,
          noteType: page.noteType, primaryStyleTag: page.primaryStyleTag, styleTags: page.styleTags });
      let checked = 0, lastYield = runtime.now();
      for (const item of canonical.declarationsForPair(sourcePath, targetPath)) {
        bytes += 256 + estimateReferenceRecordBytes(item);
        if (retained + bytes > MAX_CACHED_SCOPE_RETAINED_BYTES) return false;
        evidence.addDeclaration(item.declaredByPath, item.declaredTargetPath, item.declaredRole, item.relationType, item.direction, item);
        if (++checked % 32 === 0 && runtime.now() - lastYield >= (runtime.sliceBudgetMs ?? 8)) {
          await runtime.yield(); lastYield = runtime.now(); if (!current()) return false;
        }
      }
      const pages = new Map([[sourcePath, { ...source, neighbours: new Map<string, Relation>() }], [targetPath, { ...target, neighbours: new Map<string, Relation>() }]]);
      resolveEvidencePair(pages, evidence, sourcePath, targetPath);
      resolveEvidencePair(pages, evidence, targetPath, sourcePath);
      if (!current() || this.relationshipPairBytes - (previous?.bytes ?? 0) + bytes > MAX_CACHED_SCOPE_RETAINED_BYTES) return false;
      // No await below: both directed relations and exact provenance/negative coverage publish once.
      const pair: PreparedRelationshipPair = { paths: [sourcePath, targetPath], settings, evidence,
        relations: new Map([[sourcePath, pages.get(sourcePath)!.neighbours.get(targetPath)], [targetPath, pages.get(targetPath)!.neighbours.get(sourcePath)]]),
        policyRevision, sourceRevision, maintenanceRevision, bytes,
        current: () => current() && prepared.isCurrent() };
      pairPublished = true;
      this.relationshipPairs.set(key, pair);
      this.relationshipPairBytes += bytes - (previous?.bytes ?? 0);
      this.relationshipPairRevision++;
      for (const token of physical) if (token.file.extension === "md") {
        this.fieldCache.delete(token.path);
        this.titleCache.delete(token.path);
        this.nodeVisualCache.delete(token.path);
      }
      this.patchSearchIndex(physical.map(token => token.path));
      this.searchCandidateCache.clear();
      this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
      this.emit();
      return true;
    }
    return false;
  }

  /** True only when at least one endpoint is backed by current policy and current source authority. */
  isSemanticWriteReady(sourcePath: string, targetPath: string): boolean {
    if (this.pendingStructuralTasks > 0) return false;
    const pair = this.relationshipPairs.get(relationshipPairKey(sourcePath, targetPath));
    if (pair && pair.policyRevision === this.semanticPolicyRevision
      && pair.current() && pair.sourceRevision === this.plugin.getIndexSourceRevision()
      ) return true;
    const maintenanceRevision = this.sourceAcquisition.getMaintenanceRevision();
    if (this.fullSemanticPolicyRevision === this.semanticPolicyRevision
      && this.fullSemanticMaintenanceRevision === maintenanceRevision) return true;
    const scope = this.semanticScopeForPair(sourcePath, targetPath, true);
    return Boolean(scope && scope.maintenanceRevision === maintenanceRevision
      && scope.sourceRevision === this.plugin.getIndexSourceRevision() && this.sourceAcquisition.hasSemanticDependencies());
  }

  relationshipStorageCandidates(sourcePath: string, targetPath: string): string[] {
    if (!this.isSemanticWriteReady(sourcePath, targetPath)) return [];
    const editable = new Set<string>();
    for (const path of [sourcePath, targetPath]) {
      const page = this.get(path);
      if (page?.file?.extension === "md") editable.add(path);
    }
    if (!editable.size) return [];

    const evidence = this.semanticEvidence(sourcePath, targetPath).evidence;
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

  /** Materialize one physical folder page without traversing the Vault tree. */
  private ensureFolderTreePage(folderPath: string, touched: Set<string>): GraphPage {
    const path = folderPath ? `folder:${folderPath}` : "folder:/";
    let page = this.state.pages.get(path);
    if (!page) {
      page = {
        path, file: null, name: folderPath.split("/").filter(Boolean).pop() ?? "/", url: null, isFolder: true, isTag: false, mtime: null,
        neighbours: new Map(), aliases: [], tags: [], noteType: null, primaryStyleTag: null,
        styleTags: [], maxLabelLength: this.plugin.settings.baseNodeStyle.maxLabelLength ?? 30,
      };
      this.state.pages.set(path, page);
      this.state.lowercasePathMap.set(path.toLowerCase(), path);
      touched.add(path);
    }
    return page;
  }

  /** Ensure one canonical file-tree declaration and resolve both relation-map directions. */
  private ensureFileTreeEdge(parent: GraphPage, child: GraphPage, touched: Set<string>): void {
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
  }

  /** Ensure root-to-folder ancestry from the known path only; never enumerate unrelated files/folders. */
  private ensureFolderTreePath(folderPath: string, touched: Set<string>): GraphPage {
    let parent = this.ensureFolderTreePage("", touched);
    let currentPath = "";
    for (const part of folderPath.split("/").filter(Boolean)) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const folder = this.ensureFolderTreePage(currentPath, touched);
      this.ensureFileTreeEdge(parent, folder, touched);
      parent = folder;
    }
    return parent;
  }

  private reconcileFileTreeMembership(file: TFile | TFolder): Set<string> {
    const touched = new Set<string>();
    const path = file instanceof TFolder ? `folder:${file.path}` : file.path;
    const filePage = this.state.pages.get(path);
    if (!filePage) return touched;
    const oldParents = this.state.evidence.declarationsTouching(path)
      .filter((item) => item.sourceKind === "file-tree" && item.declaredTargetPath === path && item.declaredByPath.startsWith("folder:"))
      .map((item) => item.declaredByPath);
    this.state.evidence.removeDeclarationsTouching(path, (item) =>
      item.sourceKind === "file-tree" && item.declaredTargetPath === path && item.declaredByPath.startsWith("folder:"));
    for (const parentPath of oldParents) {
      resolveEvidencePair(this.state.pages, this.state.evidence, parentPath, path);
      resolveEvidencePair(this.state.pages, this.state.evidence, path, parentPath);
      touched.add(parentPath);
    }

    const parent = this.ensureFolderTreePath(file.path.split("/").slice(0, -1).join("/"), touched);
    this.ensureFileTreeEdge(parent, filePage, touched);
    return touched;
  }

  /**
   * Apply an Obsidian file rename/move directly to the published semantic graph. A TFile keeps its
   * object identity across rename, and none of the note-owned ontology/body evidence changes merely
   * because its path changed. Remap only the renamed page, evidence buckets and directly connected
   * relation-map keys; do not schedule a whole-vault rebuild or reread Markdown.
   */
  renameFile(oldPath: string, file: TFile): boolean {
    return this.renameTreeEndpoint(oldPath, file);
  }

  /** Reflect one startup file event in temporary Find/preview owners without changing canonical evidence. */
  updateHostFileAvailability(previousPath: string, replacement?: TFile): void {
    this.retireHostEndpoint(previousPath, replacement);
  }

  /** Reconcile captured filename descendants for one folder event without rebuilding canonical membership. */
  async updateHostFolderAvailability(previousPath: string, replacement?: TFolder): Promise<void> {
    this.retireHostEndpoint(`folder:${previousPath}`);
    if (replacement?.path === previousPath) return;
    let slice = performance.now();
    for (const [path, entry] of [...this.physicalSearchEntries]) {
      if (this.diagnosticsClosed) return;
      if (performance.now() - slice >= 8) {
        await yieldToHostTask(); slice = performance.now();
      }
      if (!path.startsWith(`${previousPath}/`) || this.physicalSearchEntries.get(path) !== entry) continue;
      const file = entry.page.file;
      this.retireHostEndpoint(path, replacement && file && this.app.vault.getFileByPath(file.path) === file ? file : undefined);
    }
  }

  /** Retire provisional endpoint owners and their neighbors without certifying unrelated canonical scopes. */
  private retireHostEndpoint(path: string, replacement?: TFile): boolean {
    const affected = new Set<string>([path, ...this.hostPreview.removeSource(path)]);
    if (replacement) {
      affected.add(replacement.path);
      for (const target of this.hostPreview.refreshSource(replacement.path)) affected.add(target);
    }
    let changed = false;
    for (const [center, scope] of this.hostPreviewScopes) {
      if (![...affected].some(target => center === target || scope.pages.has(target))) continue;
      this.hostPreviewScopes.delete(center);
      this.hostPreviewRequests.set(center, (this.hostPreviewRequests.get(center) ?? 0) + 1);
      changed = true;
    }
    // Builds which have not published yet retain only a request token, rather than a scope.
    for (const center of this.hostPreviewRequests.keys()) if (affected.has(center)) {
      this.hostPreviewRequests.set(center, (this.hostPreviewRequests.get(center) ?? 0) + 1);
    }
    changed = this.physicalSearchEntries.delete(path) || changed;
    if (replacement && this.app.vault.getFileByPath(replacement.path) === replacement) {
      const page: GraphPage = {
        path: replacement.path, file: replacement, name: replacement.basename, url: null, isFolder: false,
        isTag: false, mtime: replacement.stat.mtime, aliases: [], tags: [], noteType: null,
        primaryStyleTag: null, styleTags: [], maxLabelLength: 0, neighbours: new Map(),
      };
      this.physicalSearchEntries.set(page.path, { page, name: page.name.toLowerCase(), aliases: [], path: page.path.toLowerCase() });
      changed = true;
    }
    if (changed) {
      this.physicalSearchMerge = null;
      this.searchCandidateCache.clear();
      this.emitPresentation();
    }
    return changed;
  }

  /** Remap one known physical endpoint using the same evidence/search/identity boundary for files and folders. */
  private renameTreeEndpoint(oldPath: string, file: TFile | TFolder): boolean {
    const isFolder = file instanceof TFolder;
    const newPath = isFolder ? `folder:${file.path}` : file.path;
    if (!oldPath || !newPath || oldPath === newPath) return true;

    const retiredHost = this.retireHostEndpoint(oldPath, isFolder ? undefined : file);

    const page = this.state.pages.get(oldPath);
    if (!page || page.isFolder !== isFolder || page.isTag || page.url) return retiredHost;

    const collision = this.state.pages.get(newPath);
    if (collision && collision !== page && (collision.file && collision.file !== file
      || collision.isFolder && !isFolder || collision.isTag || collision.url)) return false;

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
    page.file = isFolder ? null : file;
    page.name = isFolder ? file.name : file.basename;
    page.mtime = isFolder ? null : file.stat.mtime;
    page.url = null;
    page.isFolder = isFolder;
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
    this.publicationRevision += 1;
    this.emit();
    // Persist the remapped semantic snapshot soon, but outside the rename interaction itself.
    this.scheduleSnapshotPersist(5000);
    return true;
  }

  /**
   * Remap only a renamed folder's known descendant tree. Host paths have already moved, so derive
   * their former paths from the event's old prefix. No Vault inventory or interpreted rebuild is
   * needed; uncertain inbound source resolution remains owned by acquisition.
   */
  renameFolder(oldPath: string, folder: TFolder): Promise<void> {
    const existing = this.folderRenameTasks.get(folder);
    if (existing) {
      void this.updateHostFolderAvailability(oldPath, folder);
      return existing;
    }
    this.pendingStructuralTasks += 1;
    const task = this.renameFolderTree(oldPath, folder).finally(() => {
      this.pendingStructuralTasks = Math.max(0, this.pendingStructuralTasks - 1);
      this.folderRenameTasks.delete(folder);
      this.retryDemandedSemanticScopes(); this.emit();
    });
    this.folderRenameTasks.set(folder, task);
    return task;
  }

  /**
   * Capture only affected endpoint references, then remap folders before files in cooperative slices.
   * A concurrent second rename changes the same host objects: reuse captured page references and
   * repeat against their latest paths rather than starting a second graph or losing a partial move.
   */
  private async renameFolderTree(oldPath: string, folder: TFolder): Promise<void> {
    const oldRoot = this.state.pages.get(`folder:${oldPath}`);
    const newRoot = this.state.pages.get(`folder:${folder.path}`);
    const pending = [oldRoot, newRoot].filter((page): page is GraphPage => Boolean(page))
      .map(page => ({ page, suffix: "" }));
    const seen = new Set<GraphPage>();
    const folders: Array<{ page: GraphPage; suffix: string }> = [];
    const files: Array<{ page: GraphPage; file: TFile }> = [];
    let sliceStarted = performance.now();
    const pause = async (): Promise<void> => {
      if (performance.now() - sliceStarted < 8) return;
      await yieldToHostTask(); sliceStarted = performance.now();
    };
    // Startup can expose filenames before canonical folder membership exists. Reconcile only
    // captured descendants by their live identity, with the same cooperative event boundary.
    await this.updateHostFolderAvailability(oldPath, folder);
    // Follow existing file-tree declarations, not a mutable host children array. A delete/second
    // rename during a yield cannot erase the remaining published endpoints from this worklist.
    while (pending.length && !this.diagnosticsClosed) {
      const { page, suffix } = pending.pop()!;
      if (seen.has(page)) continue;
      seen.add(page);
      if (page.isFolder) {
        folders.push({ page, suffix });
        for (const declaration of this.state.evidence.declarationsTouching(page.path)) {
          if (declaration.sourceKind !== "file-tree" || declaration.declaredByPath !== page.path) continue;
          const child = this.state.pages.get(declaration.declaredTargetPath);
          if (!child) continue;
          const leaf = child.path.split("/").pop()!;
          pending.push({ page: child, suffix: `${suffix}/${leaf}` });
          await pause();
        }
      } else if (page.file) files.push({ page, file: page.file });
      await pause();
    }
    let targetPath: string;
    do {
      targetPath = folder.path;
      for (const { page, suffix } of folders) {
        if (this.diagnosticsClosed) return;
        if (this.state.pages.get(page.path) !== page) continue;
        const physical = this.app.vault.getFolderByPath(folder.path + suffix);
        if (physical instanceof TFolder) this.renameTreeEndpoint(page.path, physical);
        else this.removeDeletedFolderEndpoint(page.path);
        await pause();
      }
      for (const { page, file } of files) {
        if (this.diagnosticsClosed) return;
        if (this.state.pages.get(page.path) !== page) continue;
        if (this.app.vault.getFileByPath(file.path) === file) this.renameFile(page.path, file);
        else this.dematerializeFile(page.path);
        await pause();
      }
    } while (!this.diagnosticsClosed && folder.path !== targetPath);
  }

  /** Remove a known deleted folder tree locally; return Markdown endpoints not already dematerialized by child events. */
  async removeDeletedFolder(folder: TFolder, onMarkdownRemoved?: (file: TFile) => void): Promise<number> {
    const pending: Array<TFile | TFolder> = [folder]; let markdown = 0;
    this.pendingStructuralTasks += 1; let sliceStarted = performance.now();
    try {
      await this.updateHostFolderAvailability(folder.path);
      while (pending.length && !this.diagnosticsClosed) {
        const item = pending.pop()!;
        if (item instanceof TFolder) {
          for (const child of item.children) if (child instanceof TFile || child instanceof TFolder) pending.push(child);
          this.removeDeletedFolderEndpoint(`folder:${item.path}`);
        } else {
          if (item.extension === "md") onMarkdownRemoved?.(item);
          if (item.extension === "md" && this.state.pages.get(item.path)?.file) markdown += 1;
          this.dematerializeFile(item.path);
        }
        if (performance.now() - sliceStarted >= 8) {
          await yieldToHostTask(); sliceStarted = performance.now();
        }
      }
      return markdown;
    } finally {
      this.pendingStructuralTasks = Math.max(0, this.pendingStructuralTasks - 1);
      this.retryDemandedSemanticScopes(); this.emit();
    }
  }

  /** Remove one deleted physical folder endpoint while retaining surviving non-membership evidence as a ghost. */
  private removeDeletedFolderEndpoint(path: string): void {
    this.retireHostEndpoint(path);
    const page = this.state.pages.get(path);
    if (!page) return;
    const touched = new Set<string>([path]);
    for (const item of this.state.evidence.declarationsTouching(path)) {
      touched.add(item.declaredByPath); touched.add(item.declaredTargetPath);
    }
    this.state.evidence.removeDeclarationsTouching(path, item => item.sourceKind === "file-tree");
    for (const targetPath of touched) {
      if (targetPath === path) continue;
      const target = this.state.pages.get(targetPath);
      target?.neighbours.delete(path); page.neighbours.delete(targetPath);
      resolveEvidencePair(this.state.pages, this.state.evidence, path, targetPath);
      resolveEvidencePair(this.state.pages, this.state.evidence, targetPath, path);
    }
    if (page.neighbours.size === 0) {
      this.state.pages.delete(path); this.state.lowercasePathMap.delete(path.toLowerCase());
    }
    this.invalidatePatchedPages(touched); this.patchSearchIndex(touched);
    this.suggestionCatalogCache = null; this.emit(); this.scheduleSnapshotPersist(SNAPSHOT_EDIT_IDLE_MS);
  }

  /**
   * Convert a deleted file into the unresolved node that its surviving inbound links now
   * describe. File-owned evidence (body/YAML declarations, tags and folder membership) disappears,
   * while declarations from other notes that still point at this path remain intact. Keeping the
   * GraphPage object itself is important when the deleted note is the active Plex center.
   */
  dematerializeFile(path: string): GraphPage | null {
    this.retireHostEndpoint(path);
    const page = this.state.pages.get(path) ?? this.state.pages.get(this.state.lowercasePathMap.get(path.toLowerCase()) ?? path);
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

  /**
   * Delete a virtual endpoint only after current source authority proves no materializing owner.
   * The existing synchronous facade remains available for complete graph states; a node-only
   * baseline must never treat its empty evidence store as a global negative proof.
   */
  async removeVirtualPageIfUnreferencedFromSources(path: string): Promise<boolean> {
    if (!this.sourceBackedStartup) return this.removeVirtualPageIfUnreferenced(path);
    const page = this.get(path);
    if (!page || page.file || page.url || page.isTag || page.isFolder) return false;
    if (!(await this.sourceAcquisition.flush()) || this.diagnosticsClosed) return false;
    const source = this.plugin.getIndexSourceRevision(), policy = this.semanticPolicyRevision, publication = this.publicationRevision;
    const maintenance = this.sourceAcquisition.getMaintenanceRevision();
    const current = (): boolean => !this.diagnosticsClosed && !this.building && this.sourceBackedStartup
      && source === this.plugin.getIndexSourceRevision() && policy === this.semanticPolicyRevision
      && maintenance === this.sourceAcquisition.getMaintenanceRevision() && publication === this.publicationRevision;
    const builder = new GraphBuilder(this.plugin, this.app, this.fieldCache, this.metadataParser,
      this.indexedDb, current, new Map(), this.sourceAcquisition);
    const patch = await builder.prepareNodeImpactPatch(this.state, [this.semanticSourceRef(page)]);
    if (!patch || !current()) return false;
    this.publishIncrementalFile({ sourcePath: path, touchedPagePaths: patch.touched, semanticChanged: false }, patch.publish);
    return !this.state.pages.has(page.path);
  }

  /** Remove an unresolved node only when no declaration anywhere in the graph still references it. */
  removeVirtualPageIfUnreferenced(path: string): boolean {
    const page = this.get(path);
    if (this.sourceBackedStartup || !page || page.file || page.isFolder || page.isTag || page.url) return false;
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

  /** Insert a URL target after persistence, retaining every explicit alias for immediate Vault search. */
  insertUrlPage(rawUrl: string, alias?: string): GraphPage {
    const url = rawUrl.trim();
    const existing = this.get(url);
    if (existing) {
      if (alias?.trim()) {
        if (existing.name === existing.url || existing.name === existing.path) existing.name = alias.trim();
        if (!existing.aliases.includes(alias.trim())) existing.aliases = [...existing.aliases, alias.trim()];
      }
      this.invalidatePatchedPages(new Set([existing.path]));
      this.patchSearchIndex(new Set([existing.path]));
      this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
      this.emit();
      return existing;
    }
    const page: GraphPage = {
      path: url, file: null, name: alias?.trim() || url, url, isFolder: false, isTag: false, mtime: null,
      neighbours: new Map(), aliases: alias?.trim() ? [alias.trim()] : [], tags: [], noteType: null, primaryStyleTag: null, styleTags: [], maxLabelLength: 0,
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
   * Materialize a newly created physical folder without rebuilding the structural inventory. This
   * keeps empty-folder creation local while preserving canonical folder pages, parent relations and
   * search membership. Later file creation reuses the same ancestry through reconcileFileTreeMembership.
   */
  insertCreatedFolder(folder: TFolder): GraphPage {
    const touched = new Set<string>();
    const page = this.ensureFolderTreePath(folder.path, touched);
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
   * Materialize a known newly created file and its ancestry without enumerating the vault. For
   * Markdown, the normal metadata event remains authoritative and may enrich this page later;
   * attachments need only their physical endpoint plus source-local inbound resolution maintenance.
   */
  insertCreatedFile(file: TFile, aliases: readonly string[] = []): GraphPage {
    this.updateHostFileAvailability(file.path, file);
    // A prepared scope can already contain this file before the physical event is patched. The
    // canonical patch baseline must still own its endpoint; never promote only the private view.
    const existing = this.state.pages.get(file.path);
    if (existing?.file === file && aliases.length === 0) return existing;
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
    if (!this.isSemanticWriteReady(storagePath, targetPath)) return false;
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
    if (!this.isSemanticWriteReady(storagePath, targetPath)) return false;
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
    if (!this.isSemanticWriteReady(storagePath, targetPath)) return false;
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

  /** Select the coherent prepared scope that owns complete incidence for one path, preferring current maintenance. */
  private semanticScopeForPath(path: string): PreparedSemanticScope | null {
    const maintenanceRevision = this.sourceAcquisition.getMaintenanceRevision();
    for (const scope of this.semanticScopes.values()) {
      if (scope.maintenanceRevision === maintenanceRevision && scope.policyRevision === this.semanticPolicyRevision
        && scope.completePaths.has(path)) return scope;
    }
    for (const scope of this.semanticScopes.values()) if (scope.policyRevision === this.semanticPolicyRevision
      && scope.completePaths.has(path)) return scope;
    for (const scope of this.semanticScopes.values()) if (scope.completePaths.has(path)) return scope;
    return null;
  }

  /** Select one coherent scope that owns either endpoint incidence and therefore certifies the pair. */
  private semanticScopeForPair(sourcePath: string, targetPath: string, currentOnly = false): PreparedSemanticScope | null {
    const covered = (scope: PreparedSemanticScope, path: string): boolean =>
      scope.pagesByPath.has(path) || scope.suppressedPaths.has(path) || this.state.pages.has(path);
    const ownsPair = (scope: PreparedSemanticScope): boolean =>
      (scope.completePaths.has(sourcePath) || scope.completePaths.has(targetPath))
      && covered(scope, sourcePath) && covered(scope, targetPath);
    const maintenanceRevision = this.sourceAcquisition.getMaintenanceRevision();
    for (const scope of this.semanticScopes.values()) {
      if (scope.maintenanceRevision === maintenanceRevision && scope.policyRevision === this.semanticPolicyRevision && (!currentOnly || scope.coverageSignature === this.semanticCoverageSignature()) && ownsPair(scope)) return scope;
    }
    if (currentOnly) return null;
    for (const scope of this.semanticScopes.values()) if (scope.policyRevision === this.semanticPolicyRevision && ownsPair(scope)) return scope;
    for (const scope of this.semanticScopes.values()) if (ownsPair(scope)) return scope;
    return null;
  }

  /** Inference classification associated with the coherent publication currently backing this path. */
  publishedInferAllLinksAsFriends(path: string): boolean {
    const page = this.semanticPage(path);
    return page ? this.semanticRelationSource(page).settings.inferAllLinksAsFriends : this.fullSemanticSettings.inferAllLinksAsFriends;
  }

  /** Select coherent relation flags with their compiling policy, including uncertified partial incidence. */
  private semanticRelationSource(page: GraphPage): Readonly<{ page: GraphPage; settings: GraphCompilerSettings }> {
    const info = this.preparedPageInfo.get(page);
    if (info?.completeRelations) return { page: this.composeRelationshipPairs(page), settings: info.settings };
    const scope = this.semanticScopeForPath(page.path);
    const selected = this.semanticPage(page.path) ?? page;
    // Sparse candidates own their current aliases/metadata, while unaffected warm incidence still
    // owns their complete relation/count presentation. Selecting the warm page in semanticPage()
    // would also replace those freshly prepared facets with older snapshot labels.
    if (!this.preparedPageInfo.get(selected)?.completeRelations
      && this.navigableSnapshotSourceRevision === this.plugin.getIndexSourceRevision()
      && !this.retiredSnapshotPaths.has(page.path)) {
      const warm = this.state.pages.get(page.path);
      if (warm) return { page: this.composeRelationshipPairs(warm), settings: this.fullSemanticSettings };
    }
    const ownsSelected = scope?.pagesByPath.get(page.path) === selected;
    return { page: this.composeRelationshipPairs(selected),
      settings: this.preparedPageInfo.get(selected)?.settings ?? (ownsSelected ? scope.settings : undefined)
        ?? this.hostPreviewSettings.get(selected) ?? this.fullSemanticSettings };
  }

  /** Compose immutable exact pair replacements, including negative pairs, against this coherent baseline. */
  private composeRelationshipPairs(page: GraphPage): GraphPage {
    if (!this.relationshipPairs.size) return page;
    const cached = this.relationshipPairViews.get(page);
    if (cached?.revision === this.relationshipPairRevision) return cached.page;
    let copy: GraphPage | null = null;
    for (const pair of this.relationshipPairs.values()) {
      if (!pair.paths.includes(page.path)) continue;
      copy ??= { ...page, neighbours: new Map(page.neighbours) };
      const targetPath = pair.paths[0] === page.path ? pair.paths[1] : pair.paths[0];
      const relation = pair.relations.get(page.path);
      if (relation) copy.neighbours.set(targetPath, { ...relation, target: this.semanticPage(targetPath) ?? relation.target });
      else copy.neighbours.delete(targetPath);
    }
    const result = copy ?? page;
    const info = this.preparedPageInfo.get(page);
    if (info && copy) this.preparedPageInfo.set(copy, info);
    const hostSettings = this.hostPreviewSettings.get(page);
    if (hostSettings && copy) this.hostPreviewSettings.set(copy, hostSettings);
    const folderInfo = this.folderGateInfo.get(page);
    if (folderInfo && copy) this.folderGateInfo.set(copy, folderInfo);
    this.relationshipPairViews.set(page, { revision: this.relationshipPairRevision, page: result });
    return result;
  }

  /** Classification belongs to each canonical pair's policy, even over a retained old-policy scope. */
  private relationshipInference(sourcePath: string, targetPath: string, fallback: boolean): boolean {
    return this.relationshipPairs.get(relationshipPairKey(sourcePath, targetPath))?.settings.inferAllLinksAsFriends ?? fallback;
  }

  /** Retire pair replacements only after both directed readers have complete current baselines. */
  private retireRelationshipPairs(scope: PreparedSemanticScope): void {
    const sourceRevision = this.plugin.getIndexSourceRevision();
    const maintenanceRevision = this.sourceAcquisition.getMaintenanceRevision();
    for (const [key, pair] of this.relationshipPairs) {
      if (scope.policyRevision !== pair.policyRevision || scope.sourceRevision !== sourceRevision
        || scope.maintenanceRevision !== maintenanceRevision) continue;
      if (!scope.completePaths.has(pair.paths[0]) && !scope.completePaths.has(pair.paths[1])) continue;
      // A scoped baseline can later be replaced by a full-state publication. Do not discard an
      // edit until that fallback also contains its exact directed semantics and provenance.
      if (!this.relationshipPairMatchesPublishedState(pair)) continue;
      // A complete target scope does not replace the origin's retained older incidence. Keep the
      // immutable pair until both readers can see its positive or negative result without it.
      if (!pair.paths.every(/** Require actual complete current incidence for each directed reader. */ path => {
        const baseline = this.semanticScopeForPath(path);
        return baseline?.policyRevision === pair.policyRevision && baseline.sourceRevision === sourceRevision
          && baseline.maintenanceRevision === maintenanceRevision;
      })) continue;
      this.relationshipPairBytes -= pair.bytes;
      this.relationshipPairs.delete(key);
      this.relationshipPairRevision++;
    }
  }

  /** Compare canonical pair semantics/provenance with the full fallback, ignoring IDs and array-wide raw payloads. */
  private relationshipPairMatchesPublishedState(pair: PreparedRelationshipPair): boolean {
    if (this.fullSemanticPolicyRevision !== pair.policyRevision
      || JSON.stringify(this.fullSemanticSettings) !== JSON.stringify(pair.settings)) return false;
    for (const path of pair.paths) {
      const target = pair.paths[0] === path ? pair.paths[1] : pair.paths[0];
      const actual = this.state.pages.get(path)?.neighbours.get(target), expected = pair.relations.get(path);
      /** Serialize scalar relation flags in stable order without traversing the bound target graph. */
      const signature = (relation: Relation | undefined): string => JSON.stringify(relation
        ? Object.entries(relation).filter(([key]) => key !== "target").sort(([a], [b]) => a.localeCompare(b)) : null);
      if (signature(actual) !== signature(expected)) return false;
    }
    /** Preserve declaration multiplicity and editable coordinates; unrelated values may change the YAML array payload. */
    const evidenceSignature = (store: RelationEvidenceStore): string => JSON.stringify(
      [...store.declarationsForPair(...pair.paths)].map(/** Serialize the actual semantic/provenance identity, not cache-local IDs. */ item => JSON.stringify([
        item.sourceKind, item.declaredByPath, item.declaredTargetPath, item.declaredRole,
        item.relationType, item.direction, item.fieldName, item.definition, item.line, item.start, item.end,
      ])).sort());
    return evidenceSignature(this.state.evidence) === evidenceSignature(pair.evidence);
  }

  /** Retire only pair updates absorbed by a real full-state publication, retaining unmatched edits across swaps. */
  private retirePublishedRelationshipPairs(): void {
    for (const [key, pair] of this.relationshipPairs) {
      if (!this.relationshipPairMatchesPublishedState(pair)) continue;
      this.relationshipPairBytes -= pair.bytes;
      this.relationshipPairs.delete(key);
      this.relationshipPairRevision++;
    }
  }

  /** Return evidence from the same coherent semantic publication as the relation source. */
  private semanticEvidence(sourcePath: string, targetPath: string): Readonly<{ evidence: RelationEvidence[]; settings: GraphCompilerSettings }> {
    const pair = this.relationshipPairs.get(relationshipPairKey(sourcePath, targetPath));
    if (pair) return { evidence: pair.evidence.between(sourcePath, targetPath), settings: pair.settings };
    const scope = this.semanticScopeForPair(sourcePath, targetPath);
    if (scope) return { evidence: scope.evidence.between(sourcePath, targetPath), settings: scope.settings };
    return { evidence: this.state.evidence.between(sourcePath, targetPath), settings: this.fullSemanticSettings };
  }

  explainRelationship(sourcePath: string, targetPath: string): RelationshipExplanation | null {
    const source = this.get(sourcePath);
    const target = this.get(targetPath);
    if (!source || !target) return null;
    const semantic = this.semanticEvidence(source.path, target.path);
    return explainResolvedRelationship(
      source,
      target,
      semantic.evidence,
      semantic.settings.inferAllLinksAsFriends,
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

  /**
   * Sort a rendered zone without source work. Connection order uses certified raw degree or complete
   * incidence; partial pages with unknown totals follow known totals, ordered by stable title/identity.
   */
  sortNeighbours(items: readonly Neighbour[]): Neighbour[] {
    if (items.length < 2) return [...items];
    const order = this.plugin.settings.nodeSortOrder;
    const keyed = items.map((item) => {
      const info = this.preparedPageInfo.get(item.page);
      return {
        item,
        title: this.titleFor(item.page),
        modified: item.page.file?.stat.mtime ?? item.page.mtime ?? 0,
        created: item.page.file?.stat.ctime ?? 0,
        // Induced neighbours certify finite pairs, never the unselected parent's total degree.
        connections: info?.rawDegree ?? (info?.completeRelations === false ? null : item.page.neighbours.size),
        entityId: info?.entityId ?? graphNodeViewFromLegacy(item.page).id,
      };
    });
    keyed.sort((a, b) => {
      let primary = 0;
      switch (order) {
        case "name-desc": primary = naturalCompare(b.title, a.title); break;
        case "modified-desc": primary = b.modified - a.modified; break;
        case "modified-asc": primary = a.modified - b.modified; break;
        case "created-desc": primary = b.created - a.created; break;
        case "created-asc": primary = a.created - b.created; break;
        case "connections-desc":
        case "connections-asc":
          primary = a.connections === null ? (b.connections === null ? 0 : 1)
            : b.connections === null ? -1
              : order === "connections-desc" ? b.connections - a.connections : a.connections - b.connections;
          break;
        case "name-asc": primary = naturalCompare(a.title, b.title); break;
      }
      if (primary) return primary;
      const titleOrder = naturalCompare(a.title, b.title);
      if (titleOrder) return titleOrder;
      return a.entityId < b.entityId ? -1 : a.entityId > b.entityId ? 1 : 0;
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

  /** Classify available incidence with its captured policy and mark partial gate counts as lower bounds. */
  private relationView(page: GraphPage): CachedRelationView {
    const semantic = this.semanticRelationSource(page);
    const source = semantic.page;
    const signature = this.relationViewSignature();
    const cached = this.relationViewCache.get(source);
    if (cached?.signature === signature) return cached;

    const settings = this.plugin.settings;
    const inferAllLinksAsFriends = semantic.settings.inferAllLinksAsFriends;
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
    if (this.preparedPageInfo.get(source)?.completeRelations === false || this.hostPreviewSettings.has(source)) {
      for (const gate of Object.values(gateStats)) gate.complete = false;
    }
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
    for (const relation of source.neighbours.values()) {
      if (relation.isHidden) continue;

      // A filled gate represents semantic relationships even when the target is currently hidden.
      for (const role of concreteRoles) {
        if (classifyRelation(relation, role, this.relationshipInference(source.path, relation.target.path, inferAllLinksAsFriends)) !== null) gateStats[roleGate(role)].hasAny = true;
      }

      if (!this.isVisiblePage(relation.target, settings)) continue;
      for (const role of concreteRoles) {
        const relationType = classifyRelation(relation, role, this.relationshipInference(source.path, relation.target.path, inferAllLinksAsFriends));
        if (!relationType || (relationType === RelationType.INFERRED && !settings.showInferredNodes)) continue;
        roles[role].push({
          page: this.get(relation.target.path) ?? relation.target,
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

    // A partial induced page can still have complete count-only proof. Keep its role lists and
    // editing authority partial; only replace gate presentation. A later pair overlay retires old
    // totals until normal source refresh certifies counts against that overlay's source lifetime.
    const countInfo = this.preparedPageInfo.get(source);
    const countProof = countInfo?.policyRevision === this.semanticPolicyRevision
      && countInfo.gateCoverageSignature === this.semanticCoverageSignature() ? countInfo.gates : undefined;
    let hasPairOverlay = false;
    for (const pair of this.relationshipPairs.values()) if (pair.paths.includes(source.path)
      && (countInfo?.gatePairRevision !== this.relationshipPairRevision || pair.policyRevision !== countInfo.policyRevision)) {
      hasPairOverlay = true; break;
    }
    if (countProof && !hasPairOverlay) {
      for (const gate of ["top", "bottom", "left", "right"] as const) {
        Object.assign(gateStats[gate], countProof[gate], { complete: true });
      }
    }
    const folderInfo = this.folderGateInfo.get(source);
    if (source.isFolder && (countInfo?.completeRelations === false || this.hostPreviewSettings.has(source))
      && folderInfo?.coverageSignature === this.semanticCoverageSignature()
      && folderInfo.structuralRevision === this.hostStructuralRevision) {
      for (const gate of ["top", "bottom"] as const) if (folderInfo.gates[gate]) {
        Object.assign(gateStats[gate], folderInfo.gates[gate], { complete: true });
      }
    }

    const result: CachedRelationView = { signature, roles, gateStats, neighbourCount: uniqueVisible.size };
    this.relationViewCache.set(source, result);
    return result;
  }

  neighbours(page: GraphPage, role: Role): Neighbour[] {
    return role === "sibling" ? [] : this.relationView(page).roles[role];
  }

  /** Return semantic parent pages without applying presentation visibility filters. Creation flows
   * use this to resolve a ghost note's destination from every parent that actually defines it, even
   * when one of those parents is currently outside the rendered Plex. */
  semanticParentPages(page: GraphPage): GraphPage[] {
    const semantic = this.semanticRelationSource(page);
    const result: GraphPage[] = [];
    for (const relation of semantic.page.neighbours.values()) {
      if (relation.isHidden) continue;
      if (classifyRelation(relation, "parent", this.relationshipInference(page.path, relation.target.path, semantic.settings.inferAllLinksAsFriends)) === null) continue;
      result.push(this.get(relation.target.path) ?? relation.target);
    }
    return result;
  }

  /** Resolve visible semantic relationships from one page to a supplied set of already-visible
   * targets. Cross-link layout calls this once per displayed page, so work scales with graph
   * degree rather than with every possible pair of visible nodes. */
  visibleRelationshipsWithin(source: GraphPage, targetPaths: ReadonlySet<string>): Neighbour[] {
    const semantic = this.semanticRelationSource(source);
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
    for (const relation of semantic.page.neighbours.values()) {
      if (!targetPaths.has(relation.target.path) || relation.isHidden || !this.isVisiblePage(relation.target)) continue;
      for (const role of roles) {
        const relationType = classifyRelation(relation, role, this.relationshipInference(semantic.page.path, relation.target.path, semantic.settings.inferAllLinksAsFriends));
        if (!relationType || (relationType === RelationType.INFERRED && !settings.showInferredNodes)) continue;
        result.push({
          page: this.get(relation.target.path) ?? relation.target,
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
    const semanticSource = this.semanticRelationSource(source).page;
    if (semanticSource.neighbours.has(targetPath)) return true;
    const target = this.get(targetPath);
    return target ? this.semanticRelationSource(target).page.neighbours.has(source.path) : false;
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
    const semantic = this.semanticRelationSource(page);
    const paths = new Set<string>();
    // Relationship editing must honor the semantic connection even when its target is
    // hidden by the current inferred/type visibility filters. This is the same distinction
    // used by gateStats(): gate fill represents all relationships, while the count represents
    // only the currently visible ones.
    for (const relation of semantic.page.neighbours.values()) {
      if (relation.isHidden) continue;
      if (roleSets[gate].some((role) => classifyRelation(relation, role, this.relationshipInference(semantic.page.path, relation.target.path, semantic.settings.inferAllLinksAsFriends)) !== null)) paths.add(relation.target.path);
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

  /** Select configured MetadataCache/staged display fields; URL search aliases never replace the primary label. */
  private displayNameFromConfiguredFields(page: GraphPage, settings = this.presentationSettings): string | null {
    // URL aliases are search vocabulary; the canonical primary label owns its display name.
    if (!settings.renderAlias || page.url) return null;
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

  /** Capture current physical filenames once from the restore inventory, yielding without reading file contents. */
  private async preparePhysicalSearchCatalog(files: ReadonlyMap<string, TFile>, current: () => boolean): Promise<boolean> {
    const next = new Map<string, SearchEntry>();
    const sourceRevision = this.plugin.getIndexSourceRevision();
    /** Filenames are valid only for the restore owner and unchanged live source inventory revision. */
    const inventoryCurrent = (): boolean => current() && sourceRevision === this.plugin.getIndexSourceRevision();
    let processed = 0, slice = performance.now();
    for (const [path, file] of files) {
      if (!inventoryCurrent()) return false;
      if (this.app.vault.getFileByPath(path) !== file) continue;
      const page: GraphPage = {
        path, file, name: file.basename, url: null, isFolder: false, isTag: false, mtime: file.stat.mtime,
        aliases: [], tags: [], noteType: null, primaryStyleTag: null, styleTags: [], maxLabelLength: 0, neighbours: new Map(),
      };
      next.set(path, { page, name: file.basename.toLowerCase(), aliases: [], path: path.toLowerCase() });
      if ((++processed & 255) === 0 && performance.now() - slice >= 7) {
        await yieldToHostTask();
        slice = performance.now();
      }
    }
    if (!inventoryCurrent()) return false;
    this.physicalSearchEntries = next;
    this.physicalSearchMerge = null;
    this.searchCandidateCache.clear();
    this.emitPresentation();
    return true;
  }

  /** Reuse one merged search array until graph search or the captured physical inventory changes. */
  private completePhysicalSearchEntries(): SearchEntry[] {
    if (!this.physicalSearchEntries.size) return this.searchEntries;
    const cached = this.physicalSearchMerge;
    if (cached?.base === this.searchEntries && cached.physical === this.physicalSearchEntries) return cached.entries;
    const entries = [...this.searchEntries];
    for (const [path, entry] of this.physicalSearchEntries) if (!this.searchEntryByPath.has(path)) entries.push(entry);
    this.physicalSearchMerge = { base: this.searchEntries, physical: this.physicalSearchEntries, entries };
    return entries;
  }

  /** Resolve a filename-only F4 hit without claiming that its relationship scope has been prepared. */
  getVaultSearchPage(path: string): GraphPage | undefined {
    const canonical = this.get(path);
    if (canonical) return canonical.file && (canonical.path !== canonical.file.path
      || this.app.vault.getFileByPath(canonical.path) !== canonical.file) ? undefined : canonical;
    const page = this.physicalSearchEntries.get(path)?.page;
    return page?.file && this.app.vault.getFileByPath(path) === page.file ? page : undefined;
  }

  /** Merge current bounded semantic publications into the immutable full search catalog. */
  private effectiveSearchEntries(includePhysicalFiles = false): SearchEntry[] {
    const entries = includePhysicalFiles ? this.completePhysicalSearchEntries() : this.searchEntries;
    const maintenanceRevision = this.sourceAcquisition.getMaintenanceRevision();
    if (this.fullSemanticPolicyRevision === this.semanticPolicyRevision
      && this.fullSemanticMaintenanceRevision === maintenanceRevision) return entries;
    const overrides = new Map<string, GraphPage>();
    const suppressed = new Set<string>();
    // While newer policy or host maintenance is pending, retain the last complete publication for
    // that center, but never let it override a page already prepared under current maintenance.
    for (const scope of this.semanticScopes.values()) if (scope.policyRevision !== this.semanticPolicyRevision
      || scope.maintenanceRevision !== maintenanceRevision) {
      for (const [path, page] of scope.pagesByPath) overrides.set(path, page);
      for (const path of scope.suppressedPaths) suppressed.add(path);
    }
    const currentPages = new Set<string>();
    for (const scope of this.semanticScopes.values()) if (scope.maintenanceRevision === maintenanceRevision
      && scope.policyRevision === this.semanticPolicyRevision) {
      for (const [path, page] of scope.pagesByPath) { overrides.set(path, page); currentPages.add(path); }
      for (const path of scope.suppressedPaths) suppressed.add(path);
    }
    for (const path of currentPages) suppressed.delete(path);
    if (!overrides.size && !suppressed.size) return entries;
    const output: SearchEntry[] = [];
    const emitted = new Set<string>();
    const add = (page: GraphPage): void => {
      if (emitted.has(page.path)) return;
      emitted.add(page.path);
      output.push({ page, name: this.titleFor(page).toLowerCase(), aliases: page.aliases.map((alias) => alias.toLowerCase()),
        path: page.path.toLowerCase() });
    };
    for (const entry of entries) {
      const replacement = overrides.get(entry.page.path);
      if (replacement) add(replacement);
      else if (!suppressed.has(entry.page.path)) { output.push(entry); emitted.add(entry.page.path); }
    }
    for (const [path, page] of [...overrides].sort(([a], [b]) => a.localeCompare(b))) if (!emitted.has(path)) add(page);
    return output;
  }

  /** Rank the global catalog; Vault search includes all current files and URL aliases regardless of Plex visibility. */
  search(query: string, limit = 40, scope: "visible" | "vault-files" = "visible"): GraphPage[] {
    const q = query.trim().toLowerCase();
    const settings = this.plugin.settings;
    const max = Math.max(1, limit);
    const searchEntries = this.effectiveSearchEntries(scope === "vault-files");
    /** Vault search ignores graph filters while excluding folders, tags, unresolved and deleted files. */
    const eligible = (page: GraphPage): boolean => scope === "vault-files"
      ? Boolean(page.url || page.file && page.path === page.file.path && this.app.vault.getFileByPath(page.path) === page.file)
      : this.isVisiblePage(page, settings);

    if (!q) {
      const output: GraphPage[] = [];
      const seen = new Set<string>();
      const preferred = [...this.searchEntryPointPaths, ...this.plugin.settings.pinnedNodes];
      for (const path of preferred) {
        const page = this.get(path);
        if (!page || seen.has(page.path) || !eligible(page)) continue;
        seen.add(page.path);
        output.push(page);
        if (output.length >= max) return output;
      }
      for (const entry of searchEntries) {
        if (seen.has(entry.page.path) || !eligible(entry.page)) continue;
        seen.add(entry.page.path);
        output.push(entry.page);
        if (output.length >= max) break;
      }
      return output;
    }

    // A match for a longer query must also match every prefix of that query. Reuse the longest
    // cached prefix so normal typing progressively searches a much smaller candidate set instead
    // of rescanning 100k+ thoughts on every keypress. Cache textual matches independently from
    // visibility so toggling graph filters cannot make the cache incorrect. Scope namespaces
    // remain separate because a startup Vault catalog contains filename-only physical entries.
    let candidates = searchEntries;
    for (let length = q.length - 1; length >= 1; length -= 1) {
      const prefix = q.slice(0, length);
      const cached = this.searchCandidateCache.get(`${scope}:${prefix}`);
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
      if (!eligible(entry.page)) continue;
      if (best.length >= max && score >= best[best.length - 1].score) continue;

      let at = best.length;
      while (at > 0 && score < best[at - 1].score) at -= 1;
      best.splice(at, 0, { page: entry.page, score });
      if (best.length > max) best.pop();
    }

    this.searchCandidateCache.set(`${scope}:${q}`, textualMatches);
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
