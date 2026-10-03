/**
 * Obsidian-owned neutral acquisition and inventory reconciliation. Physical parser inputs and lexical
 * references have a different lifetime from host target resolution. This adapter uses the existing
 * parser/Date collector/host resolver, never semantic settings or custom path guessing. It owns its
 * event fence independently of graph no-op suppression, plus a single cooperative inventory task.
 * Its read-only cached semantic capability supplies missing host facts without changing live routing.
 * Requested semantic preparation uses the source-local dependency derivative. Historical SI4a
 * selected-source/catalog construction adapters live only in test fixtures. Host events retain the
 * durable legacy UNKNOWN-impact journal for storage compatibility; no inverse resolver is invented.
 */
import { Platform, TFile, TFolder, type App, type CachedMetadata } from "obsidian";
import type { GraphCompilerRuntime } from "../../core/graph/compiler";
import { acceptSourceBatch, beginSourceRead, sourceReadCanPublish, type NormalizedSourceBatch,
  type NormalizedSourceRecord, type SourceReadBoundary } from "../../core/graph/source";
import type { CachedSemanticPolicy } from "../../index/CachedSourceSemantics";
import { CachedRequestedNeighborhoodReader, type CachedCenterGatePreparation,
  type CachedNeighborhoodRequest } from "../../index/CachedRequestedNeighborhood";
import { CachedRequestedCandidateDegreeReader, type CachedCandidateDegreePreparation,
  type CachedCandidateDegreeRequest } from "../../index/CachedRequestedCandidateDegrees";
import { CachedRequestedUrlTitleReader, type CachedUrlTitlePreparation } from "../../index/CachedRequestedUrlTitle";
import type { CachedCenterGatePolicy } from "../../index/CachedCenterGateProjection";
import type { SourcePatchReadPort } from "../../core/graph/patch";
import type { SourceEntityRef } from "../../core/graph/source";
import { SourceLocalContributorDiscovery } from "./sourceLocalContributorDiscovery";
import type { ContributorHostChange } from "../../index/SourceContributorJournal";
import type { CachedSourceHost, CachedSourceRequest } from "../../index/SourceReplay";
import { selectedSourceFailure, type SelectedSourceResult } from "../../index/SourceRepository";
import type { ParsedBodyMetadata, ParsedFileMetadata } from "../../core/parser/metadata";
import { mergeFileMetadata } from "../../index/fieldParser";
import type { KplexIndexedDbCache } from "../../index/IndexedDbCache";
import { SOURCE_FAMILIES, SOURCE_MAX_BATCH_RECORDS, SourceFactError, sourceFieldNames, sourceValueSteps, type SourceFamily, type SourceFamilyManifest,
  type SourceObservation, type SourcePhysical, type SourceReason, type StoredMetadataFact, type StoredSourceFact } from "../../index/SourceFacts";
import type { SourceFamilyProducer, SourceInspection, SourceRepositoryDiagnostics } from "../../index/SourceRepository";
import { sourceLocalDependencyKey, sourceLocalResolverDependencyKey, sourceLocalResolverPathDependencyKey } from "../../index/SourceLocalDependencies";
import { createObsidianMetadataSourceHost, normalizedBodyUrl, ObsidianMetadataSourceCollector, type ObsidianMetadataSourceSettings } from "./metadataSourceCollector";
import { entityFactForFile, entityFactForFolder, ObsidianStructuralPatchSourceCollector,
  structuralMarkdownSourceOrder } from "./structuralSourceCollector";
import { hostLinkRecord } from "./hostLinkSourceCollector";
import { resolveObsidianReferenceTarget } from "./ontologySourceCollector";

type FileObservation = { identity: string | null; observation?: SourceObservation; revision: number; dirty: boolean; bodyDirty: boolean; resolutionDirty: boolean; path: string; oldPath?: string; created: boolean; impact: Promise<void> | null };
type SourceCoordinates = Readonly<{ order: number; markdownOrder: number }>;
type Capture = { physical: SourcePhysical; revision: number; hostRevision: number; state: FileObservation; file: TFile };
/** Narrow parser port: acquisition does not import GraphBuilder or own a second parser. */
export type SourceBodyParser = (content: string) => Promise<ParsedBodyMetadata>;
/** These counters are aggregate-only and reset with the adapter's lifetime. */
export type SourceAcquisitionCounters = Readonly<{
  checked: number; reusedBodies: number; legacyBodies: number; vaultReads: number; parses: number;
  repaired: number; resolutionRefreshes: number; pendingMetadata: number; failures: number;
}>;
/** The existing live graph may proceed on storage failure, but not across a source/host revision. */
export type SourceAcquisitionResult = Readonly<{ current: boolean; saved: boolean; reason: SourceReason }>;

/**
 * Native Obsidian file events are followed by metadata:resolved within the same short resolver wave.
 * The timer is only a bounded stale-token retirement guard; coverage still requires an observed,
 * fully known TFile wave and is consumed by the first resolved event.
 */
const KNOWN_RESOLVER_WAVE_RETIRE_MS = 50;
/** Retry transient local dependency fences quickly, then back off instead of polling in a tight loop. */
const DEFERRED_RESOLUTION_RETRY_MIN_MS = 350;
const DEFERRED_RESOLUTION_RETRY_MAX_MS = 30000;

/** Apply producer backpressure to a canonical generator, including its cooperative null steps. */
function producer(steps: () => Iterable<StoredSourceFact | null>): SourceFamilyProducer {
  return async (emit) => { for (const fact of steps()) if (!(await emit(fact))) return false; return true; };
}
/** Compare only observations actually present in storage; legacy records do not invent a size. */
function physicalMatches(stored: SourcePhysical, captured: SourcePhysical, allowOldPath = false): boolean {
  return (allowOldPath || stored.path === captured.path) && stored.mtime === captured.mtime
    && (stored.size === undefined || stored.size === captured.size)
    && (stored.ctime === undefined || stored.ctime === captured.ctime);
}
/** Finite intrinsic host facts: name-only discovery, aliases/tags and genuine cached lexical links. */
function* metadataSteps(file: TFile, metadata: ParsedFileMetadata, cache: CachedMetadata): IterableIterator<StoredMetadataFact> {
  for (const value of metadata.aliases) yield { kind: "alias", value };
  for (const value of metadata.tags) yield { kind: "tag", value };
  if (file.parent?.path) yield { kind: "file-parent", path: file.parent.path };
  yield* sourceFieldNames(metadata);
  let ordinal = 0;
  // resolvedLinks is deliberately not used to invent lexical spellings.
  for (const links of [cache.links ?? [], cache.embeds ?? []]) for (const link of links) {
    yield { kind: "host-literal", ordinal: ordinal++, rawTarget: link.link,
      location: { line: link.position.start.line + 1, start: link.position.start.offset, end: link.position.end.offset } };
  }
}

/** Own durable acquisition/re-resolution without changing the current semantic settings route. */
export class ObsidianSourceAcquisition {
  private readonly repository;
  private readonly metadataHost;
  private readonly states = new WeakMap<TFile, FileObservation>();
  private readonly cleanup: Array<() => void> = [];
  private epoch = "";
  private hostRevision = 0;
  private contributorObservation = 0;
  /** Legacy contributor capabilities fence known source/topology events without making environment validation irreversible. */
  private catalogObservation = 0;
  /** Settings-only reads are enabled only after the startup/event inventory closed every local owner. */
  private localDependenciesReady = false;
  /** Durable local lookup authority remains usable while a known source-local maintenance fence is open. */
  private localDependencyAuthorityReady = false;
  private closed = false;
  private started = false;
  private enabled = false;
  private timer: number | null = null;
  private pollTimer: number | null = null;
  private inventory: Promise<boolean> | null = null;
  private inventoryRevision = 0;
  /** Monotonic host-maintenance fence consumed by demanded semantic publication. */
  private maintenanceRevision = 0;
  /** One restart comparison discovers offline target/alias/path drift without rereading unchanged bodies. */
  private restartInventoryChecked = false;
  /** Coalesces an unscoped resolver wave into one cached-fact host refresh. */
  private uncertainResolution = false;
  /** One bounded causal token replaces per-event resolver bookkeeping for native TFile waves. */
  private knownResolverWave = false;
  /** Folder/non-file activity poisons the current wave: a following resolved event remains uncertain. */
  private uncoveredResolverWave = false;
  /** Retires a known wave if the host never emits its traced closing resolved event. */
  private resolverWaveTimer: number | null = null;
  private resolverWaveGeneration = 0;
  /** One coalesced retry clock keeps transient deferred local fan-out live without a per-event queue. */
  private deferredResolutionRetryTimer: number | null = null;
  private deferredResolutionRetryDelay = DEFERRED_RESOLUTION_RETRY_MIN_MS;
  /** Date/Daily Notes drift closes semantic writes without advancing the reversible legacy host revision. */
  private environmentMaintenancePending = false;
  /** Transient local lookup misses coalesce by dependency/source identity instead of retaining one entry per event. */
  private readonly pendingResolutionKeys = new Set<string>();
  /** A failed durable count-journal close is retried without rediscovering source inventory. */
  private localInventoryCompletionPending = false;
  /** Known host events and proven referrers are the complete hot-lane acquisition set. */
  private readonly pendingKnownFiles = new Set<TFile>();
  /** Synchronous event bursts share one deferred fan-out task per TFile. */
  private readonly pendingKnownImpacts = new Map<TFile, { oldPaths: Set<string>; canLookup: boolean }>();
  private readonly knownFanoutTasks = new WeakMap<TFile, Promise<void>>();
  /** Startup captures reusable stable coordinates; hot maintenance never rebuilds whole-vault order. */
  private readonly sourceCoordinates = new Map<string, SourceCoordinates>();
  private nextSourceOrder = 0;
  private nextMarkdownOrder = 0;
  /** Cheap idle preflight: field vocabulary is collected while sources are already being visited. */
  private readonly environmentFields = new Map<string, boolean>();
  private dailyNotesObservation: string | null = null;
  /** Prevent a changed source from replacing old durable alias/path evidence before fan-out capture. */
  private knownImpactTasks = 0;
  /** R3 owns high-degree continuation; R2 must preserve the accepted terminal backpressure behavior. */
  private resolutionBackpressure = false;
  private requested = false;
  private counters = { checked: 0, reusedBodies: 0, legacyBodies: 0, vaultReads: 0, parses: 0,
    repaired: 0, resolutionRefreshes: 0, pendingMetadata: 0, failures: 0 };

  /** Construction is side-effect free; start() explicitly owns host subscriptions. */
  constructor(private readonly app: App, private readonly cache: KplexIndexedDbCache, private readonly parse: SourceBodyParser,
    private readonly inventoryReady?: () => void) {
    this.repository = cache.sources;
    this.metadataHost = createObsidianMetadataSourceHost(app);
  }
  /** Keep immutable copies of aggregate counters suitable for a native read/parser reuse probe. */
  getCounters(): SourceAcquisitionCounters { return { ...this.counters }; }
  /** The repository independently sanitizes all persistent diagnostic fields. */
  getDiagnostics(): SourceRepositoryDiagnostics { return this.repository.getDiagnostics(); }
  /** Subscribe before asynchronous acquisition; pure graph no-ops never suppress this fence. */
  start(): void {
    if (this.started || this.closed) return;
    this.started = true;
    this.epoch = this.repository.createIdentity();
    /** Observe host changes before scheduling acquisition. Known file events use source-local fan-out;
     * only an unscoped resolver wave advances the global host fence. */
    const changed = (file?: TFile, created = false, oldPath?: string, bodyChanged = false,
      kind: ContributorHostChange["kind"] = "source"): void => {
      const effectiveKind = created || oldPath ? "topology" : kind;
      if (!file && effectiveKind === "resolution") {
        // Obsidian 1.14.4 closes ordinary create/rename/modify/delete waves with metadata:resolved.
        // Consume exactly one fully known TFile wave without globalizing it. A resolved event with
        // no live token, or one preceded by folder/non-file activity, remains the uncertain lane.
        if (this.consumeKnownResolverWave()) return;
        this.markContributorHostChange("resolution", true);
        this.requestInventory();
        return;
      }
      this.noteResolverWaveCause(Boolean(file));
      const dependenciesWereReady = this.localDependencyAuthorityReady;
      this.markContributorHostChange(effectiveKind, false);
      if (file) {
        const state = this.state(file);
        state.revision += 1; state.dirty = true; state.bodyDirty ||= bodyChanged || created;
        if (created) { state.identity = this.repository.createIdentity(); state.created = true; }
        if (oldPath) state.oldPath = oldPath;
        this.repository.cancelSource(oldPath ?? state.path);
        this.repository.cancelSource(file.path);
        this.pendingKnownFiles.add(file);
        void this.queueKnownResolutionImpact(file, oldPath, dependenciesWereReady);
      }
      this.requestInventory();
    };
    const create = this.app.vault.on("create", (file) => changed(file instanceof TFile ? file : undefined, true));
    const modify = this.app.vault.on("modify", (file) => changed(file instanceof TFile ? file : undefined, false, undefined, true));
    const rename = this.app.vault.on("rename", (file, oldPath) => {
      changed(file instanceof TFile ? file : undefined, false, oldPath);
      if (file instanceof TFile) {
        const state = this.state(file), fanout = this.knownFanoutTasks.get(file) ?? Promise.resolve();
        const prior = state.impact ?? Promise.resolve();
        this.knownImpactTasks += 1;
        const tombstone = this.repository.tombstone(oldPath,
          () => !this.closed && !this.app.vault.getFileByPath(oldPath), true,
          Promise.all([prior, fanout]).then(() => undefined)).then(() => undefined)
          .finally(() => { this.knownImpactTasks = Math.max(0, this.knownImpactTasks - 1); if (!this.closed) this.requestInventory(); });
        state.impact = tombstone; void tombstone.finally(() => { if (state.impact === tombstone) state.impact = null; });
      }
    });
    const remove = this.app.vault.on("delete", (file) => {
      changed(file instanceof TFile ? file : undefined, false, undefined, false, "topology");
      if (file instanceof TFile) {
        const path = file.path, state = this.state(file), fanout = this.knownFanoutTasks.get(file) ?? Promise.resolve();
        const prior = state.impact ?? Promise.resolve();
        this.knownImpactTasks += 1;
        const tombstone = this.repository.tombstone(path,
          () => !this.closed && !this.app.vault.getFileByPath(path), false,
          Promise.all([prior, fanout]).then(() => undefined)).then(() => undefined)
          .finally(() => { this.knownImpactTasks = Math.max(0, this.knownImpactTasks - 1); if (!this.closed) this.requestInventory(); });
        state.impact = tombstone; void tombstone.finally(() => { if (state.impact === tombstone) state.impact = null; });
      }
    });
    const metadata = this.app.metadataCache.on("changed", (file) => changed(file));
    const resolved = this.app.metadataCache.on("resolved", () => changed(undefined, false, undefined, false, "resolution"));
    this.cleanup.push(() => this.app.vault.offref(create), () => this.app.vault.offref(modify),
      () => this.app.vault.offref(rename), () => this.app.vault.offref(remove),
      () => this.app.metadataCache.offref(metadata), () => this.app.metadataCache.offref(resolved));
  }
  /**
   * Coalesce all causes since the previous resolver close into constant-size causal state. TFile
   * events are source-local proof; folder/non-file events make the whole wave unprovable. The one
   * timer prevents a missing host close from suppressing a later unrelated resolved event.
   */
  private noteResolverWaveCause(covered: boolean): void {
    if (covered) this.knownResolverWave = true;
    else this.uncoveredResolverWave = true;
    const generation = ++this.resolverWaveGeneration;
    if (this.resolverWaveTimer !== null) window.clearTimeout(this.resolverWaveTimer);
    this.resolverWaveTimer = window.setTimeout(() => {
      if (this.closed || generation !== this.resolverWaveGeneration) return;
      this.resolverWaveTimer = null;
      this.knownResolverWave = false;
      this.uncoveredResolverWave = false;
    }, KNOWN_RESOLVER_WAVE_RETIRE_MS);
  }

  /** Consume only a live wave whose every observed cause was a known TFile event. */
  private consumeKnownResolverWave(): boolean {
    const covered = this.knownResolverWave && !this.uncoveredResolverWave;
    this.resolverWaveGeneration += 1;
    if (this.resolverWaveTimer !== null) window.clearTimeout(this.resolverWaveTimer);
    this.resolverWaveTimer = null;
    this.knownResolverWave = false;
    this.uncoveredResolverWave = false;
    return covered;
  }
  /** Synchronously fence host authority and persist a bounded, coalesced host observation. */
  private markContributorHostChange(kind: ContributorHostChange["kind"], global = kind === "resolution"): void {
    // Known source events fence only their source plus proven referrers. Unscoped resolver and
    // environment observations are coalesced until reconciliation starts, so a native burst causes
    // one cached-fact pass rather than a per-event vault scan.
    if (global) {
      if (!this.uncertainResolution) {
        this.uncertainResolution = true; this.hostRevision += 1; this.inventoryRevision += 1;
        this.maintenanceRevision += 1; this.localDependenciesReady = false; this.localDependencyAuthorityReady = false;
      }
    } else if (kind === "environment") {
      if (!this.environmentMaintenancePending) {
        this.environmentMaintenancePending = true; this.inventoryRevision += 1;
        this.maintenanceRevision += 1; this.localDependenciesReady = false; this.localDependencyAuthorityReady = false;
      }
    } else {
      this.catalogObservation += 1;
      this.inventoryRevision += 1; this.maintenanceRevision += 1; this.localDependenciesReady = false;
    }
    const from = this.contributorObservation++;
    // The repository owns retries/unload and never clears a newer coalesced observation on completion.
    void this.repository.markContributorHostDirty({ epoch: this.epoch, from, to: this.contributorObservation, kind });
  }
  /** Cancel every continuation and release event/timer ownership; unload does not await persistence. */
  close(): void {
    this.closed = true; this.inventoryRevision += 1;
    for (const dispose of this.cleanup.splice(0)) dispose();
    if (this.timer !== null) window.clearTimeout(this.timer);
    if (this.pollTimer !== null) window.clearTimeout(this.pollTimer);
    if (this.resolverWaveTimer !== null) window.clearTimeout(this.resolverWaveTimer);
    if (this.deferredResolutionRetryTimer !== null) window.clearTimeout(this.deferredResolutionRetryTimer);
    this.timer = null; this.pollTimer = null; this.resolverWaveTimer = null; this.deferredResolutionRetryTimer = null;
    this.knownResolverWave = false; this.uncoveredResolverWave = false;
  }
  /** Allocate an incarnation lazily; a matching restart head can supply its already durable identity. */
  private state(file: TFile): FileObservation {
    let state = this.states.get(file);
    if (!state) { state = { identity: null, revision: 0, dirty: false, bodyDirty: false, resolutionDirty: false, path: file.path, created: false, impact: null }; this.states.set(file, state); }
    if (state.path !== file.path) { state.oldPath = state.path; state.path = file.path; state.dirty = true; state.revision += 1; }
    return state;
  }
  /** Host-maintenance revision used by GraphIndex to reject stale demanded semantic publications. */
  getMaintenanceRevision(): number { return this.maintenanceRevision; }

  /** Host-significant metadata available from MetadataCache without reading Markdown bodies. */
  private currentHostInventory(file: TFile, cache: CachedMetadata): StoredMetadataFact[] {
    const metadata = mergeFileMetadata(cache, { inlineFields: {}, inlineFieldOccurrences: [], urls: [] });
    return [...metadataSteps(file, metadata, cache)].filter((record): record is StoredMetadataFact =>
      record.kind === "alias" || record.kind === "tag" || record.kind === "file-parent" || record.kind === "host-literal");
  }

  /** Read only one selected source's durable host-significant metadata family. */
  private async durableHostInventory(sourceId: string, current: () => boolean): Promise<Readonly<{ reason: SourceReason; facts: StoredMetadataFact[] }>> {
    const facts: StoredMetadataFact[] = [];
    const reason = await this.repository.visit(sourceId, "metadata", (records) => {
      for (const record of records) if (record.kind === "alias" || record.kind === "tag" || record.kind === "file-parent" || record.kind === "host-literal") facts.push(record);
      return current();
    }, current);
    return { reason, facts };
  }

  /** Dependency keys whose bindings can change when this path or one of its aliases appears/disappears. */
  private resolutionImpactKeys(path: string, facts: readonly StoredMetadataFact[]): string[] {
    const keys = new Set<string>();
    keys.add(sourceLocalDependencyKey("node", path));
    const leaf = path.split("/").pop() ?? path;
    const withoutExtension = path.replace(/\.md$/i, "");
    const basename = leaf.replace(/\.md$/i, "");
    for (const token of [path, withoutExtension, leaf, basename]) if (token) keys.add(sourceLocalDependencyKey("literal", token));
    for (const targetPath of [path, withoutExtension]) {
      const resolver = sourceLocalResolverPathDependencyKey(targetPath);
      if (resolver) keys.add(resolver);
    }
    for (const token of [leaf, basename]) {
      const resolver = sourceLocalResolverDependencyKey(token);
      if (resolver) keys.add(resolver);
    }
    for (const fact of facts) if (fact.kind === "alias" && fact.value) {
      keys.add(sourceLocalDependencyKey("literal", fact.value));
      const resolver = sourceLocalResolverDependencyKey(fact.value);
      if (resolver) keys.add(resolver);
    }
    return [...keys];
  }

  /** Mark only proven source-local referrers; no process-wide contributor catalog participates. */
  private async markResolutionDependents(keys: readonly string[], excluded: ReadonlySet<string> = new Set(),
    current: () => boolean = () => !this.closed): Promise<SourceReason> {
    const unique = [...new Set(keys.filter(Boolean))];
    if (!unique.length) return "ready";
    for (let offset = 0; offset < unique.length; offset += SOURCE_MAX_BATCH_RECORDS) {
      if (!current() || this.closed) return "cancelled";
      const found = await this.repository.lookupLocalDependencies(unique.slice(offset, offset + SOURCE_MAX_BATCH_RECORDS), current);
      if (found.outcome !== "ready") return found.reason;
      let marked = 0;
      for (const stamp of found.value.sources) {
        const sourceId = stamp.head.sourceId;
        if (excluded.has(sourceId)) continue;
        const file = this.app.vault.getFileByPath(sourceId);
        if (!(file instanceof TFile) || file.extension !== "md") continue;
        const state = this.state(file);
        if (!state.resolutionDirty) {
          state.resolutionDirty = true; state.revision += 1; this.repository.cancelSource(sourceId);
        }
        this.pendingKnownFiles.add(file);
        if (++marked % SOURCE_MAX_BATCH_RECORDS === 0) {
          await new Promise<void>(resolve => window.setTimeout(resolve, 0));
          if (!current()) return "cancelled";
        }
      }
    }
    this.requestInventory();
    return "ready";
  }

  /** Escalate an unauthenticated local fan-out to one coalesced cached-fact host reconciliation. */
  private promoteUnknownFanout(): void {
    this.clearDeferredResolutionRetry(true);
    if (this.uncertainResolution) return;
    this.uncertainResolution = true; this.hostRevision += 1; this.inventoryRevision += 1;
    this.maintenanceRevision += 1;
    this.localDependenciesReady = false; this.localDependencyAuthorityReady = false; this.requested = true;
  }

  /** Queue a local lookup retry without changing the accepted R3 high-degree backpressure boundary. */
  private deferResolutionImpact(keys: readonly string[], excluded: ReadonlySet<string>, reason: SourceReason): void {
    if (reason === "backpressure") { this.resolutionBackpressure = true; this.clearDeferredResolutionRetry(); return; }
    if (reason !== "dependency-pending" && reason !== "unsaved" && reason !== "superseded" && reason !== "storage-unavailable"
      && reason !== "read-error" && reason !== "write-error") {
      this.promoteUnknownFanout();
      return;
    }
    const unique = [...new Set(keys.filter(Boolean))];
    if (!unique.length) return;
    for (const key of unique) this.pendingResolutionKeys.add(key);
  }

  /** Coalesce a synchronous source-event burst before any durable/local dependency lookup begins. */
  private queueKnownResolutionImpact(file: TFile, oldPath: string | undefined, canLookup: boolean): Promise<void> {
    let pending = this.pendingKnownImpacts.get(file);
    if (!pending) {
      pending = { oldPaths: new Set(), canLookup };
      this.pendingKnownImpacts.set(file, pending);
    } else pending.canLookup ||= canLookup;
    if (oldPath) pending.oldPaths.add(oldPath);
    const active = this.knownFanoutTasks.get(file);
    if (active) return active;
    this.knownImpactTasks += 1;
    const task = Promise.resolve().then(() => this.markKnownResolutionDependents(file)).catch(() => {
      if (!this.closed) this.promoteUnknownFanout();
    }).finally(() => {
      if (this.knownFanoutTasks.get(file) === task) this.knownFanoutTasks.delete(file);
      this.knownImpactTasks = Math.max(0, this.knownImpactTasks - 1);
      if (!this.closed) this.requestInventory();
    });
    this.knownFanoutTasks.set(file, task);
    return task;
  }

  /** Resolve one coalesced live file-event fan-out from durable/current aliases, exact targets and lexical tokens. */
  private async markKnownResolutionDependents(file: TFile): Promise<void> {
    const current = (): boolean => !this.closed;
    // Keep the task alive through every event that arrives while its durable reads/lookup are awaited.
    // Rename/delete tombstones await this same promise, so old alias/path evidence cannot retire early.
    while (current()) {
      const keys = new Set<string>();
      const candidates = new Set<string>();
      const durableCandidates = new Set<string>();
      let canLookup = false;
      while (current()) {
        const pending = this.pendingKnownImpacts.get(file);
        if (!pending) break;
        this.pendingKnownImpacts.delete(file);
        canLookup ||= pending.canLookup;
        const eventPath = file.path;
        candidates.add(eventPath);
        for (const path of pending.oldPaths) candidates.add(path);
        const cache = this.app.metadataCache.getFileCache(file);
        if (cache) for (const key of this.resolutionImpactKeys(eventPath, this.currentHostInventory(file, cache))) keys.add(key);
        for (const path of candidates) {
          if (durableCandidates.has(path)) continue;
          durableCandidates.add(path);
          const durable = await this.durableHostInventory(path, current);
          if (!current()) return;
          if (durable.reason === "ready") for (const key of this.resolutionImpactKeys(path, durable.facts)) keys.add(key);
          else for (const key of this.resolutionImpactKeys(path, [])) keys.add(key);
        }
      }
      if (!current()) return;
      if (keys.size) {
        const excluded = new Set(candidates);
        if (!canLookup) this.deferResolutionImpact([...keys], excluded, "dependency-pending");
        else {
          const reason = await this.markResolutionDependents([...keys], excluded, current);
          if (reason !== "ready" && reason !== "cancelled" && current()) this.deferResolutionImpact([...keys], excluded, reason);
        }
      }
      if (!this.pendingKnownImpacts.has(file)) return;
    }
  }

  /** Upgrade accepted R1 owners before restart fan-out so unresolved relative/subpath tokens exist. */
  private async upgradeRestartLocalDependencies(markdown: readonly TFile[], structuralOrder: ReadonlyMap<string, number>,
    current: () => boolean): Promise<boolean> {
    for (const [markdownOrder, file] of markdown.entries()) {
      if (!current()) return false;
      const order = structuralOrder.get(file.path);
      if (order === undefined) return false;
      const inspection = await this.repository.inspect(file.path, [], current);
      if (!current()) return false;
      if (!inspection.saved || !inspection.head || inspection.head.state !== "complete") continue;
      const reason = await this.repository.ensureLocalDependencies(file.path, order, markdownOrder, current);
      if (reason !== "ready") return false;
      await new Promise<void>(resolve => window.setTimeout(resolve, 0));
    }
    return current();
  }

  /**
   * On first restart inventory, compare current MetadataCache facts with durable source-local facts.
   * Offline alias/path/create/delete drift marks only the changed source and proven referrers.
   */
  private async reconcileRestartHostInventory(markdown: readonly TFile[], current: () => boolean): Promise<boolean> {
    if (this.restartInventoryChecked) return true;
    const keys = new Set<string>(), changedPaths = new Set<string>();
    for (const file of markdown) {
      if (!current()) return false;
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache) continue;
      const inspection = await this.repository.inspect(file.path, ["metadata"], current);
      if (!current()) return false;
      const head = inspection.head;
      const now = this.currentHostInventory(file, cache);
      if (!head || head.state !== "complete") {
        // Storage-unavailable operation has no durable restart evidence. Preserve the established
        // current-process/legacy body path instead of inventing a recreation from absence that
        // cannot be authenticated.
        if (!head && inspection.expected.kind === "unavailable") continue;
        changedPaths.add(file.path);
        const state = this.state(file);
        // A current file over a missing/tombstoned selected binding is a restart recreation. Its
        // path+mtime legacy body accelerator is not identity-safe across that absence boundary.
        // A complete in-memory head in storage-degraded operation remains valid current-process
        // authority even though inspection.saved is false; do not misclassify it as recreation.
        if (!state.dirty) { state.dirty = true; state.revision += 1; }
        state.bodyDirty = true; state.created = true;
        for (const key of this.resolutionImpactKeys(file.path, now)) keys.add(key);
        continue;
      }
      const durable = await this.durableHostInventory(file.path, current);
      if (!current()) return false;
      const sameFacts = durable.reason === "ready" && JSON.stringify(durable.facts) === JSON.stringify(now);
      const samePhysical = physicalMatches(head.physical,
        { identity: head.physical.identity, path: file.path, mtime: file.stat.mtime, size: file.stat.size, ctime: file.stat.ctime });
      if (!sameFacts || !samePhysical) {
        changedPaths.add(file.path);
        const state = this.state(file);
        if (!state.dirty) { state.dirty = true; state.revision += 1; }
        if (!samePhysical) state.bodyDirty = true;
        for (const key of this.resolutionImpactKeys(file.path, durable.facts)) keys.add(key);
        for (const key of this.resolutionImpactKeys(file.path, now)) keys.add(key);
      }
    }
    let after: string | null = null;
    while (current()) {
      const page = await this.repository.headPage(after);
      // Durable restart reconciliation is an enhancement; storage-degraded operation cannot prove
      // offline drift and retains the established in-memory path.
      if (!page.available) { this.restartInventoryChecked = true; return current(); }
      for (const head of page.heads) if (head.state === "complete" && !this.app.vault.getFileByPath(head.physical.path)) {
        changedPaths.add(head.physical.path);
        const durable = await this.durableHostInventory(head.sourceId, current);
        if (!current()) return false;
        const facts = durable.reason === "ready" ? durable.facts : [];
        for (const key of this.resolutionImpactKeys(head.physical.path, facts)) keys.add(key);
      }
      if (page.next === null) break;
      after = page.next;
      await new Promise<void>(resolve => window.setTimeout(resolve, 0));
    }
    if (changedPaths.size) {
      this.maintenanceRevision += 1; this.localDependenciesReady = false;
      const reason = await this.markResolutionDependents([...keys], changedPaths, current);
      if (reason !== "ready" && reason !== "cancelled" && current()) this.deferResolutionImpact([...keys], changedPaths, reason);
    }
    this.restartInventoryChecked = true;
    return current();
  }

  /** Cancel the one retry clock; successful local closure also restores the fast first-retry delay. */
  private clearDeferredResolutionRetry(resetDelay = false): void {
    if (this.deferredResolutionRetryTimer !== null) window.clearTimeout(this.deferredResolutionRetryTimer);
    this.deferredResolutionRetryTimer = null;
    if (resetDelay) this.deferredResolutionRetryDelay = DEFERRED_RESOLUTION_RETRY_MIN_MS;
  }

  /**
   * A transient local lookup can race the changed source's own durable write/count journal. Keep one
   * later production reconciliation alive, with exponential backoff capped at the normal 30-second poll interval.
   * This is independent of event cardinality: pendingResolutionKeys remains the only coalesced work set.
   */
  private scheduleDeferredResolutionRetry(): void {
    if (this.closed || !this.enabled || this.resolutionBackpressure || !this.pendingResolutionKeys.size
      || this.deferredResolutionRetryTimer !== null) return;
    const delay = this.deferredResolutionRetryDelay;
    this.deferredResolutionRetryDelay = Math.min(DEFERRED_RESOLUTION_RETRY_MAX_MS, delay * 2);
    this.deferredResolutionRetryTimer = window.setTimeout(() => {
      this.deferredResolutionRetryTimer = null;
      if (this.closed || this.resolutionBackpressure || !this.pendingResolutionKeys.size) return;
      this.requestInventory();
    }, delay);
  }

  /** Retry local fan-out once R1 count repair has closed the inventory. */
  private async retryDeferredResolutionImpacts(current: () => boolean): Promise<SourceReason> {
    if (this.resolutionBackpressure) { this.clearDeferredResolutionRetry(); return "backpressure"; }
    if (!this.pendingResolutionKeys.size) { this.clearDeferredResolutionRetry(true); return "ready"; }
    if (!current()) return "cancelled";
    const keys = [...this.pendingResolutionKeys];
    this.pendingResolutionKeys.clear();
    // Deferred impacts may combine independent changed sources. Re-selecting a changed source that
    // also proves to be a referrer is harmless; globally unioning exclusions could hide a real edge.
    const reason = await this.markResolutionDependents(keys, new Set(), current);
    if (reason === "ready") { this.clearDeferredResolutionRetry(true); return reason; }
    if (reason === "backpressure") { this.resolutionBackpressure = true; this.clearDeferredResolutionRetry(); return reason; }
    if (reason !== "dependency-pending" && reason !== "unsaved" && reason !== "superseded" && reason !== "storage-unavailable"
      && reason !== "read-error" && reason !== "write-error" && reason !== "cancelled") {
      this.promoteUnknownFanout();
      return reason;
    }
    for (const key of keys) this.pendingResolutionKeys.add(key);
    if (reason !== "cancelled" && current()) this.scheduleDeferredResolutionRetry();
    return reason;
  }

  /** Remember only the field vocabulary needed to detect Date-registry drift without touching source inventory. */
  private observeEnvironment(cache: CachedMetadata): void {
    this.dailyNotesObservation = JSON.stringify(this.metadataHost.dailyNotesSettings());
    for (const field of Object.keys(cache.frontmatter ?? {})) {
      if (field === "position") continue;
      this.environmentFields.set(field, this.metadataHost.isDateProperty(field));
    }
  }

  /** Cheap idle/environment preflight: no Vault inventory, source inspection, family visit or write. */
  private environmentObservationChanged(): boolean {
    if (this.dailyNotesObservation !== null
      && this.dailyNotesObservation !== JSON.stringify(this.metadataHost.dailyNotesSettings())) return true;
    for (const [field, wasDate] of this.environmentFields) if (this.metadataHost.isDateProperty(field) !== wasDate) return true;
    return false;
  }

  /** Reuse a moved source's established order; new sources append without renumbering unrelated owners. */
  private coordinatesFor(file: TFile): SourceCoordinates {
    const state = this.state(file);
    let coordinates = this.sourceCoordinates.get(file.path);
    if (!coordinates && state.oldPath) coordinates = this.sourceCoordinates.get(state.oldPath);
    if (!coordinates) coordinates = { order: this.nextSourceOrder++, markdownOrder: this.nextMarkdownOrder++ };
    if (state.oldPath && state.oldPath !== file.path) this.sourceCoordinates.delete(state.oldPath);
    this.sourceCoordinates.set(file.path, coordinates);
    return coordinates;
  }

  /** Maintain only changed sources and proven referrers after startup authority has closed. */
  private async reconcileKnownImpacts(current: () => boolean): Promise<boolean> {
    let complete = true;
    while (current()) {
      if (this.uncertainResolution || this.environmentMaintenancePending || !this.localDependencyAuthorityReady) return false;
      const deferred = await this.retryDeferredResolutionImpacts(current);
      if (deferred !== "ready") return false;
      if (this.uncertainResolution || this.environmentMaintenancePending || !this.localDependencyAuthorityReady) return false;
      const files = [...this.pendingKnownFiles];
      if (!files.length && !this.localInventoryCompletionPending) break;
      if (files.length) this.localInventoryCompletionPending = true;
      let retryPendingMetadata = false;
      for (const file of files) {
        if (!current()) return false;
        // Delete before work: a concurrent event for this same TFile re-adds it and cannot be erased
        // by successful completion of the older observation. Unvisited snapshot entries stay queued.
        this.pendingKnownFiles.delete(file);
        if (this.app.vault.getFileByPath(file.path) !== file || file.extension !== "md") {
          this.sourceCoordinates.delete(file.path);
          continue;
        }
        if (this.environmentObservationChanged()) {
          this.markContributorHostChange("environment");
          return false;
        }
        const hostCache = this.app.metadataCache.getFileCache(file);
        if (!hostCache) {
          this.counters.pendingMetadata += 1;
          this.pendingKnownFiles.add(file);
          retryPendingMetadata = true;
          complete = false;
          continue;
        }
        const body = await this.loadBody(file, current);
        if (!body || !current()) { this.pendingKnownFiles.add(file); return false; }
        const acquired = await this.acquire(file, body, current);
        if (!acquired.current) { this.pendingKnownFiles.add(file); return false; }
        complete &&= acquired.saved;
        if (!acquired.saved) this.pendingKnownFiles.add(file);
        if (acquired.saved) {
          const coordinates = this.coordinatesFor(file);
          const local = await this.repository.ensureLocalDependencies(file.path, coordinates.order, coordinates.markdownOrder, current);
          complete &&= local === "ready";
          if (local !== "ready") this.pendingKnownFiles.add(file);
          this.observeEnvironment(hostCache);
          const state = this.state(file);
          if (state.oldPath) {
            const oldPath = state.oldPath;
            const tombstone = await this.repository.tombstone(oldPath, () => current() && !this.app.vault.getFileByPath(oldPath), true);
            complete &&= tombstone.outcome === "activated";
            if (tombstone.outcome === "activated") state.oldPath = undefined;
            else this.pendingKnownFiles.add(file);
          }
        }
        await new Promise<void>(resolve => window.setTimeout(resolve, 0));
      }
      if (!complete || retryPendingMetadata) break;
      if (this.localInventoryCompletionPending) {
        const local = await this.repository.completeLocalDependencyInventory(current);
        if (local !== "ready") { complete = false; break; }
        this.localInventoryCompletionPending = false;
      }
      // Fan-out lookup can discover more referrers; iterate only that newly proven set.
      if (!this.pendingKnownFiles.size && !this.pendingResolutionKeys.size) break;
    }
    const ready = current() && complete && !this.resolutionBackpressure && !this.uncertainResolution
      && !this.environmentMaintenancePending && this.pendingKnownFiles.size === 0 && this.pendingResolutionKeys.size === 0
      && !this.localInventoryCompletionPending;
    this.localDependenciesReady = ready;
    this.localDependencyAuthorityReady = ready || this.localDependencyAuthorityReady && !this.uncertainResolution && !this.environmentMaintenancePending;
    if (ready) this.inventoryReady?.();
    return ready;
  }

  /** Repair referrers discovered only after a deferred local lookup without rescanning unrelated sources. */
  private async repairResolutionDirtySources(markdown: readonly TFile[], structuralOrder: ReadonlyMap<string, number>,
    current: () => boolean): Promise<boolean> {
    let complete = true;
    for (const [markdownOrder, file] of markdown.entries()) {
      if (!current()) return false;
      const state = this.state(file);
      if (!state.resolutionDirty) continue;
      const order = structuralOrder.get(file.path);
      if (order === undefined) return false;
      const body = await this.loadBody(file, current);
      if (!body || !current()) return false;
      const acquired = await this.acquire(file, body, current);
      if (!acquired.current) return false;
      complete &&= acquired.saved;
      if (acquired.saved) {
        const local = await this.repository.ensureLocalDependencies(file.path, order, markdownOrder, current);
        complete &&= local === "ready";
      }
      await new Promise<void>(resolve => window.setTimeout(resolve, 0));
    }
    return current() && complete;
  }

  /** Fence GraphBuilder body reads against observed equal-stat edits as well as mutable file stats. */
  getFileRevision(file: TFile): number { this.start(); return this.state(file).revision; }
  /** An observed content change cannot be satisfied by an equal-mtime hot, neutral or legacy body. */
  needsBodyRead(file: TFile): boolean { this.start(); return this.state(file).bodyDirty; }
  /** Capture mutable TFile/stat fields before any await; a TFile replacement is also a change. */
  private capture(file: TFile): Capture {
    this.start();
    const state = this.state(file);
    return { state, file, revision: state.revision, hostRevision: this.hostRevision,
      physical: { identity: state.identity ?? "unbound", path: file.path, mtime: file.stat.mtime, size: file.stat.size, ctime: file.stat.ctime } };
  }
  /** A relevant host observation is a different fence from graph policy/generation. */
  private current(capture: Capture, caller: () => boolean): boolean {
    const { file, physical, state } = capture;
    return !this.closed && caller() && state.revision === capture.revision && this.hostRevision === capture.hostRevision
      && this.app.vault.getFileByPath(physical.path) === file && file.path === physical.path
      && file.stat.mtime === physical.mtime && file.stat.size === physical.size && file.stat.ctime === physical.ctime;
  }
  /** Hash only Date-registry observations and Daily Notes interpretation configuration, not K-Plex settings. */
  private environment(cache: CachedMetadata): string {
    return JSON.stringify({ daily: this.metadataHost.dailyNotesSettings(), dates: Object.keys(cache.frontmatter ?? {})
      .filter((name) => name !== "position" && this.metadataHost.isDateProperty(name)).sort() });
  }
  /**
   * Capture host inputs not represented by neutral source facts. Current-session memory/disk replay
   * keeps its established identity path. A clean process restart may adopt an unchanged durable head
   * after physical/environment checks, without rewriting that head solely to stamp the new epoch.
   */
  async captureForReplay(sourceId: string, settings: ObsidianMetadataSourceSettings, runtime: GraphCompilerRuntime): Promise<
    Readonly<{ outcome: "ready"; request: CachedSourceRequest }> | Exclude<SelectedSourceResult<never>, { outcome: "ready" }>> {
    if (!runtime.isCurrent() || this.closed) return selectedSourceFailure("cancelled");
    const file = this.app.vault.getFileByPath(sourceId);
    if (!(file instanceof TFile) || file.extension !== "md") return selectedSourceFailure("missing");
    const capture = this.capture(file);
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return selectedSourceFailure("pending-metadata");
    if (capture.state.dirty || capture.state.bodyDirty || capture.state.resolutionDirty || capture.state.created) return selectedSourceFailure("unsaved");
    const environmentText = this.environment(cache);
    const maintenanceRevision = this.maintenanceRevision;
    const current = (): boolean => this.current(capture, runtime.isCurrent) && this.maintenanceRevision === maintenanceRevision
      && this.app.metadataCache.getFileCache(file) === cache && this.environment(cache) === environmentText;
    try {
      const environment = await this.repository.observationDigest(environmentText);
      if (!current()) return selectedSourceFailure(runtime.isCurrent() ? "stale" : "cancelled");
      let physical: SourcePhysical;
      let observation: SourceObservation;
      if (capture.state.identity !== null) {
        // Preserve the established current-session replay contract, including the bounded in-memory
        // fallback used when durable storage is unavailable.
        physical = { ...capture.physical, identity: capture.state.identity };
        // A clean restart retains the accepted durable observation; binding its physical identity
        // must not fabricate a new epoch for a head whose bytes were deliberately reused.
        observation = { epoch: capture.state.observation?.epoch ?? this.epoch,
          revision: capture.state.observation?.revision ?? capture.hostRevision, environment };
      } else {
        // A new process has no in-memory incarnation. Adopt only an unchanged durable selected head;
        // any live host event makes this uncertain and leaves the requested settings scope pending.
        if (this.hostRevision !== 0) return selectedSourceFailure("unsaved");
        const inspection = await this.repository.inspect(sourceId, [], current);
        if (!current()) return selectedSourceFailure(runtime.isCurrent() ? "stale" : "cancelled");
        const head = inspection.head;
        if (!inspection.saved || !head || head.state !== "complete" || !physicalMatches(head.physical, capture.physical)
          || head.observation.environment !== environment) return selectedSourceFailure("unsaved");
        capture.state.identity = head.physical.identity;
        capture.state.observation = { ...head.observation };
        physical = { ...capture.physical, identity: head.physical.identity };
        observation = { ...head.observation };
      }
      const presentation = { noteTypeField: settings.noteTypeField, primaryTagField: settings.primaryTagField };
      const source = entityFactForFile(file).entity;
      const collectorRuntime = { isCurrent: current, sourceRevision: () => this.hostRevision,
        checkpoint: async (): Promise<boolean> => { await runtime.yield(); return current(); } };
      /** Validate supplemental producers with the same normalized cursor as stored replay batches. */
      const relay = async (collector: Readonly<{ boundary: SourceReadBoundary;
        collectBatches(consume: (batch: NormalizedSourceBatch) => Promise<boolean>): Promise<boolean>;
        isBoundaryCurrent(boundary: SourceReadBoundary): boolean }>, emit: (record: NormalizedSourceRecord) => Promise<boolean>): Promise<boolean> => {
        let cursor = beginSourceRead(collector.boundary);
        const complete = await collector.collectBatches(async (batch) => {
          if (!current()) return false;
          const accepted = acceptSourceBatch(cursor, batch);
          if (!accepted.accepted) return false;
          for (const record of batch.records) if (!current() || !(await emit(record)) || !current()) return false;
          cursor = accepted.cursor;
          return current();
        });
        return complete && current() && collector.isBoundaryCurrent(collector.boundary) && sourceReadCanPublish(cursor, collector.boundary);
      };
      const host: CachedSourceHost = {
        source, physical, observation, isCurrent: current,
        structure: (emit) => relay(new ObsidianStructuralPatchSourceCollector(this.app, collectorRuntime, file), emit),
        presentation: (body, emit) => relay(new ObsidianMetadataSourceCollector(this.metadataHost, collectorRuntime, file,
          mergeFileMetadata(cache, body), presentation, "presentation"), emit),
        hostLink: (record, revision) => hostLinkRecord(this.app, source, revision, record.target, record.count,
          record.state === "resolved" ? "obsidian-link" : "unresolved-link"),
        bodyUrl: (record, revision) => normalizedBodyUrl(source, revision, record),
      };
      return { outcome: "ready", request: { sourceId, host } };
    } catch { return selectedSourceFailure(current() ? "storage-unavailable" : "stale"); }
  }

  /** Return exact current host entity facts for cached preparation without reading file bodies. */
  private cachedEntityReadPort(runtime: GraphCompilerRuntime): SourcePatchReadPort {
    return {
      entity: (ref) => {
        if (!runtime.isCurrent() || ref.physicalPath === undefined) return undefined;
        if (ref.kind === "container") {
          const folder = ref.physicalPath === "" || ref.physicalPath === "/"
            ? this.app.vault.getRoot() : this.app.vault.getFolderByPath(ref.physicalPath);
          if (!(folder instanceof TFolder)) return undefined;
          const fact = entityFactForFolder(folder);
          return fact.entity.id === ref.id ? fact : undefined;
        }
        const file = this.app.vault.getFileByPath(ref.physicalPath);
        if (!(file instanceof TFile)) return undefined;
        const fact = entityFactForFile(file);
        return fact.entity.id === ref.id ? fact : undefined;
      },
    };
  }

  /** Whether settings-only semantic preparation has a closed current source-local dependency inventory. */
  hasSemanticDependencies(): boolean { return this.localDependenciesReady && !this.closed; }

  /** One request-scoped dependency capability; construction never scans the Markdown inventory. */
  private localContributorDiscovery(runtime: GraphCompilerRuntime): SourceLocalContributorDiscovery | null {
    if (!this.hasSemanticDependencies()) return null;
    const revision = this.hostRevision;
    const observation = this.contributorObservation;
    const maintenance = this.maintenanceRevision;
    const current = (): boolean => !this.closed && runtime.isCurrent() && this.localDependenciesReady
      && this.hostRevision === revision && this.contributorObservation === observation && this.maintenanceRevision === maintenance;
    return new SourceLocalContributorDiscovery(this.repository, this.app,
      { epoch: this.epoch, revision, token: `${this.epoch}:${revision}:${observation}:${maintenance}` }, current, () => {
        this.promoteUnknownFanout();
        this.requestInventory();
      });
  }

  /** Prepare one exact center from cached facts; incomplete local dependencies remain explicitly pending. */
  async prepareRequestedNeighborhood(request: CachedNeighborhoodRequest, policy: CachedSemanticPolicy,
    presentation: ObsidianMetadataSourceSettings, gatePolicy: CachedCenterGatePolicy,
    runtime: GraphCompilerRuntime): Promise<CachedCenterGatePreparation> {
    const discovery = this.localContributorDiscovery(runtime);
    if (!discovery) return selectedSourceFailure("dependency-pending");
    const capture = (sourceId: string, scoped: GraphCompilerRuntime) => this.captureForReplay(sourceId, presentation, scoped);
    return new CachedRequestedNeighborhoodReader(this.repository, discovery, capture, this.cachedEntityReadPort(runtime))
      .prepareCenterGates(request, policy, gatePolicy, runtime);
  }

  /** Prepare exact raw degrees only when the active sort key needs them. */
  async prepareRequestedCandidateDegrees(request: CachedCandidateDegreeRequest, policy: CachedSemanticPolicy,
    presentation: ObsidianMetadataSourceSettings, runtime: GraphCompilerRuntime): Promise<CachedCandidateDegreePreparation> {
    const discovery = this.localContributorDiscovery(runtime);
    if (!discovery) return selectedSourceFailure("dependency-pending");
    const capture = (sourceId: string, scoped: GraphCompilerRuntime) => this.captureForReplay(sourceId, presentation, scoped);
    return new CachedRequestedCandidateDegreeReader(this.repository, discovery, capture, this.cachedEntityReadPort(runtime))
      .prepare(request, policy, runtime);
  }

  /** Prepare the full-builder URL label input for one exact URL candidate from cached facts. */
  async prepareRequestedUrlTitle(endpoint: SourceEntityRef, policy: CachedSemanticPolicy,
    presentation: ObsidianMetadataSourceSettings, runtime: GraphCompilerRuntime): Promise<CachedUrlTitlePreparation> {
    const discovery = this.localContributorDiscovery(runtime);
    if (!discovery) return selectedSourceFailure("dependency-pending");
    const capture = (sourceId: string, scoped: GraphCompilerRuntime) => this.captureForReplay(sourceId, presentation, scoped);
    return new CachedRequestedUrlTitleReader(this.repository, discovery, capture, this.cachedEntityReadPort(runtime))
      .prepare(endpoint, policy, runtime);
  }

  /** Reuse immutable body inputs before the mutable legacy cache, including an observed pure move. */
  async readBody(file: TFile, caller: () => boolean = () => true): Promise<ParsedBodyMetadata | null> {
    if (this.needsBodyRead(file)) return null;
    const capture = this.capture(file); const current = (): boolean => this.current(capture, caller);
    const accept = (physical: SourcePhysical, old = false): boolean => {
      if (!physicalMatches(physical, capture.physical, old) || capture.state.created
        || capture.state.identity !== null && physical.identity !== capture.state.identity) return false;
      capture.state.identity ??= physical.identity;
      return true;
    };
    let body = await this.repository.readBody(capture.physical.path, (physical) => accept(physical), current);
    if (!current()) return null;
    if (!body && capture.state.oldPath) {
      body = await this.repository.readBody(capture.state.oldPath, (physical) => accept(physical, true), current, true, true);
    }
    if (!current()) return null;
    if (body) this.counters.reusedBodies += 1;
    return body;
  }
  /** Load one actual body miss serially; even mobile's stricter acquisition concurrency is retained. */
  private async loadBody(file: TFile, current: () => boolean): Promise<ParsedBodyMetadata | null> {
    const capture = this.capture(file); const valid = (): boolean => this.current(capture, current);
    const neutral = await this.readBody(file, valid); if (!valid()) return null;
    if (neutral) return neutral;
    const legacy = capture.state.bodyDirty ? undefined
      : (await this.cache.getBodies([{ path: capture.physical.path, mtime: capture.physical.mtime }])).get(capture.physical.path);
    if (!valid()) return null;
    if (legacy) { this.counters.legacyBodies += 1; return legacy; }
    this.counters.vaultReads += 1;
    const text = Platform.isMobile ? await this.app.vault.read(file) : await this.app.vault.cachedRead(file);
    if (!valid()) return null;
    this.counters.parses += 1;
    const body = await this.parse(text);
    if (!valid()) return null;
    // Legacy body-v2 remains an optional accelerator, not neutral-source durability.
    await this.cache.putBody(capture.physical.path, capture.physical.mtime, body);
    return valid() ? body : null;
  }
  /** Resolve a lexical stream using exactly the established Obsidian reference resolver. */
  private resolution(metadata: ParsedFileMetadata, file: TFile, cache: CachedMetadata, inspection: SourceInspection,
    reuseValues: boolean, reuseMetadata: boolean, current: () => boolean): SourceFamilyProducer {
    const referenceHost = { metadataCache: this.app.metadataCache, resolvedLinkCount: this.metadataHost.resolvedLinkCount };
    return async (emit) => {
      const resolve = async (record: StoredSourceFact | null): Promise<boolean> => {
        if (record?.kind === "reference-candidate") {
          const target = resolveObsidianReferenceTarget(referenceHost, file.path, record);
          return emit({ kind: "reference-resolution", valueId: record.valueId, ordinal: record.ordinal, target,
            hostOccurrenceCount: target ? this.metadataHost.resolvedLinkCount(file.path, target.entity.id) : 0 });
        }
        if (record?.kind === "host-literal") return emit({ kind: "literal-resolution", ordinal: record.ordinal,
          target: resolveObsidianReferenceTarget(referenceHost, file.path, { rawTarget: record.rawTarget, external: false }) });
        return emit(null);
      };
      const replay = async (family: SourceFamily): Promise<boolean> => {
        return await this.repository.visit(file.path, family, async (records) => {
          for (const record of records) if (!(await resolve(record))) return false;
          return current();
        }, current) === "ready";
      };
      if (reuseValues && inspection.saved) { if (!(await replay("values"))) return false; }
      else for (const step of sourceValueSteps(metadata)) if (!(await resolve(step))) return false;
      if (reuseMetadata && inspection.saved) { if (!(await replay("metadata"))) return false; }
      else for (const step of metadataSteps(file, metadata, cache)) if (!(await resolve(step))) return false;
      for (const [state, links] of [["resolved", this.app.metadataCache.resolvedLinks], ["unresolved", this.app.metadataCache.unresolvedLinks]] as const) {
        for (const [target, count] of Object.entries(links[file.path] ?? {})) {
          if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) throw new SourceFactError("invalid-frame", "resolution");
          if (!(await emit({ kind: "host-link", state, target, count }))) return false;
        }
      }
      // Reuse the single accepted Date grammar/host compatibility seam. No Date classifier is duplicated.
      const date = new ObsidianMetadataSourceCollector(this.metadataHost, { isCurrent: current,
        sourceRevision: () => this.hostRevision, checkpoint: async () => { await new Promise<void>(resolve => window.setTimeout(resolve, 0)); return current(); } },
      file, metadata, { noteTypeField: "", primaryTagField: "" }, "relations");
      return date.collectBatches(async (batch) => {
        for (const record of batch.records) if (record.kind === "date-property") {
          const provenance = record.provenance;
          if (typeof provenance?.fieldName !== "string" || typeof provenance.normalizedFieldName !== "string"
            || typeof provenance.rawValue !== "string") return false;
          if (!(await emit({ kind: "date-property", fieldName: provenance.fieldName, normalizedFieldName: provenance.normalizedFieldName,
            rawValue: provenance.rawValue, target: record.target }))) return false;
        }
        return current();
      });
    };
  }
  /** Persist dormant facts even when GraphBuilder subsequently takes its semantic no-op branch. */
  async acquire(file: TFile, body: ParsedBodyMetadata, caller: () => boolean = () => true): Promise<SourceAcquisitionResult> {
    this.start();
    const state = this.state(file);
    while (this.knownFanoutTasks.get(file)) {
      const fanout = this.knownFanoutTasks.get(file)!;
      await fanout;
      if (!caller() || this.closed) return { current: false, saved: false, reason: "cancelled" };
      if (this.knownFanoutTasks.get(file) === fanout) this.knownFanoutTasks.delete(file);
    }
    while (state.impact) {
      const impact = state.impact;
      await impact;
      if (!caller() || this.closed) return { current: false, saved: false, reason: "cancelled" };
      if (state.impact === impact) state.impact = null;
    }
    const capture = this.capture(file); const current = (): boolean => this.current(capture, caller);
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) { this.counters.pendingMetadata += 1; return { current: current(), saved: false, reason: "pending-metadata" }; }
    try {
      const environmentText = this.environment(cache);
      const observationCurrent = (): boolean => current() && this.environment(cache) === environmentText
        && this.app.metadataCache.getFileCache(file) === cache;
      const environment = await this.repository.observationDigest(environmentText);
      if (!current()) return { current: false, saved: false, reason: "cancelled" };
      const inspection = await this.repository.inspect(file.path, SOURCE_FAMILIES, current);
      if (!current() || this.environment(cache) !== environmentText || this.app.metadataCache.getFileCache(file) !== cache) return { current: false, saved: false, reason: "cancelled" };
      this.counters.checked += 1;
      const head = inspection.head;
      const samePhysical = !!head && !capture.state.created && physicalMatches(head.physical, capture.physical)
        && (capture.state.identity === null || capture.state.identity === head.physical.identity);
      if (samePhysical && head) capture.state.identity ??= head.physical.identity;
      capture.state.identity ??= this.repository.createIdentity();
      const physical = { ...capture.physical, identity: capture.state.identity };
      const intrinsic = samePhysical && !capture.state.dirty;
      const hostCurrent = !capture.state.resolutionDirty && head?.observation.environment === environment
        && (head.observation.epoch === this.epoch && head.observation.revision === this.hostRevision
          || this.hostRevision === 0 && !capture.state.dirty);
      if (intrinsic && hostCurrent && inspection.saved && inspection.reason === "ready" && head) {
        capture.state.observation = { ...head.observation };
        return { current: current(), saved: inspection.saved, reason: "ready" };
      }
      const metadata = mergeFileMetadata(cache, body);
      const validFamily = (family: SourceFamily): boolean => intrinsic && inspection.saved && inspection.families[family] === "ready";
      const retain = (family: SourceFamily, fresh: SourceFamilyProducer): SourceFamilyProducer | SourceFamilyManifest => {
        const manifest = head?.families[family];
        return validFamily(family) && manifest ? manifest : fresh;
      };
      const expected = inspection.expected.kind === "unavailable" ? await this.repository.catalogExpectation(file.path) : inspection.expected;
      if (!current()) return { current: false, saved: false, reason: "cancelled" };
      const write = (forceFresh: boolean) => {
        const values = producer(() => sourceValueSteps(metadata));
        const urls = producer(function* () { for (const url of body.urls) yield { kind: "body-url" as const, ...url }; });
        const names = producer(() => metadataSteps(file, metadata, cache));
        return this.repository.replace({ sourceId: file.path, physical,
          observation: { epoch: this.epoch, revision: capture.hostRevision, environment }, expected,
          families: {
            values: forceFresh ? values : retain("values", values),
            "body-urls": forceFresh ? urls : retain("body-urls", urls),
            metadata: forceFresh ? names : retain("metadata", names),
            resolution: this.resolution(metadata, file, cache, inspection, !forceFresh && validFamily("values"), !forceFresh && validFamily("metadata"), current),
          } }, observationCurrent);
      };
      let result = await write(false);
      // A retained disk family can become unavailable after inspection. Re-acquire once from the
      // already owned body + MetadataCache, not from Markdown and not by rebuilding the graph.
      if (current() && inspection.saved && (result.outcome === "unsaved" || result.outcome === "rejected"
        && ["storage-unavailable", "read-error", "write-error", "missing-chunk", "missing-posting"].includes(result.reason))) {
        result = await write(true);
      }
      if (!observationCurrent()) return { current: false, saved: false, reason: result.reason };
      if ((result.outcome === "activated" || result.outcome === "unsaved") && result.live) {
        capture.state.observation = { epoch: this.epoch, revision: capture.hostRevision, environment };
        capture.state.dirty = false; capture.state.bodyDirty = false; capture.state.resolutionDirty = false; capture.state.created = false;
        if (intrinsic) this.counters.resolutionRefreshes += 1; else this.counters.repaired += 1;
        if (result.outcome === "activated" && head) {
          // Only explicitly known retired revisions are considered, and the repository rechecks
          // heads and persistent reader/writer leases atomically before deleting anything.
          for (const revision of new Set(Object.values(head.families).map(family => family.revision))) {
            await this.repository.cleanupRevision(file.path, revision, current);
            if (!current()) break;
          }
        }
      } else this.counters.failures += 1;
      const live = observationCurrent(), saved = result.outcome === "activated";
      if (live && !saved) {
        // GraphBuilder can acquire beside inventory. A late unsaved result must retain a source-
        // local retry owner even if the earlier inventory already consumed this file's event.
        this.pendingKnownFiles.add(file); this.localDependenciesReady = false;
        if (!this.inventory) this.requestInventory();
      }
      return { current: live, saved, reason: result.reason };
    } catch {
      this.counters.failures += 1;
      const live = current();
      if (live) {
        this.pendingKnownFiles.add(file); this.localDependenciesReady = false;
        if (!this.inventory) this.requestInventory();
      }
      return { current: live, saved: false, reason: "write-error" };
    }
  }
  /** Enable after the existing authoritative publication; do not lengthen its metadata-stability gate. */
  enableInventory(): void {
    this.start();
    const wasEnabled = this.enabled;
    this.enabled = true;
    if (!wasEnabled && (!this.localDependencyAuthorityReady || this.requested || this.pendingKnownFiles.size > 0
      || this.pendingResolutionKeys.size > 0 || this.localInventoryCompletionPending || this.uncertainResolution || this.environmentMaintenancePending)) this.requestInventory();
    this.schedulePoll();
  }
  /** Periodic host drift check is observation-only unless a token actually changes. */
  private schedulePoll(): void {
    if (this.pollTimer !== null || this.closed || !this.enabled) return;
    this.pollTimer = window.setTimeout(() => {
      this.pollTimer = null;
      if (this.closed || !this.enabled) return;
      if (!this.resolutionBackpressure && (!this.localDependencyAuthorityReady || this.pendingKnownFiles.size > 0
        || this.pendingResolutionKeys.size > 0 || this.localInventoryCompletionPending || this.knownImpactTasks > 0)) this.requestInventory();
      else if (this.localDependencyAuthorityReady && this.environmentObservationChanged()) {
        this.markContributorHostChange("environment");
        this.requestInventory();
      }
      this.schedulePoll();
    }, 30000);
  }
  /** Yield storage bandwidth to a complete graph rebuild; preserve the pending inventory request. */
  pauseInventory(): boolean {
    const wasEnabled = this.enabled;
    this.enabled = false;
    this.inventoryRevision += 1;
    this.requested = true;
    if (this.timer !== null) { window.clearTimeout(this.timer); this.timer = null; }
    if (this.pollTimer !== null) { window.clearTimeout(this.pollTimer); this.pollTimer = null; }
    if (this.deferredResolutionRetryTimer !== null) { window.clearTimeout(this.deferredResolutionRetryTimer); this.deferredResolutionRetryTimer = null; }
    return wasEnabled;
  }
  /** Continue a previously enabled inventory after graph publication or cancellation. */
  resumeInventory(wasEnabled: boolean): void {
    if (wasEnabled && !this.closed) this.enableInventory();
  }
  /** Coalesce target/source changes into one task; no per-file write-promise queue is retained. */
  requestInventory(): void {
    this.requested = true;
    if (!this.enabled || this.closed || this.inventory || this.timer !== null) return;
    this.timer = window.setTimeout(() => { this.timer = null; void this.reconcile(); }, 350);
  }
  /**
   * Reconcile a captured inventory, reusing valid parsed inputs and repairing local misses.
   * Event-side tombstones may still be queued when this task returns; repository.flush() is their
   * durable completion fence. Neither an inventory result nor a delay proves tombstone activation.
   */
  async reconcile(): Promise<boolean> {
    this.start();
    if (this.inventory) return this.inventory;
    if (this.closed) return false;
    this.requested = false;
    // Events that arrive after this boundary advance inventoryRevision and cancel this pass.
    const revision = this.inventoryRevision;
    const current = (): boolean => !this.closed && revision === this.inventoryRevision;
    this.inventory = (async () => {
      let complete = true;
      try {
        while (this.knownImpactTasks > 0 && current()) await new Promise<void>(resolve => window.setTimeout(resolve, 0));
        if (!current()) return false;
        if (this.localDependencyAuthorityReady && this.restartInventoryChecked
          && !this.uncertainResolution && !this.environmentMaintenancePending) return this.reconcileKnownImpacts(current);
        // Events observed before this boundary are one coalesced cached-fact pass. A new unscoped
        // resolver/environment event after this point advances inventoryRevision and cancels the pass.
        // Keep whether this pass was already globally fenced so polling-discovered environment drift
        // advances maintenance exactly once without forcing an otherwise unnecessary host revision.
        let environmentMaintenanceFenced = this.uncertainResolution || this.environmentMaintenancePending;
        this.uncertainResolution = false; this.environmentMaintenancePending = false;
        const movedPaths = new Set<string>();
        const markdown = this.app.vault.getMarkdownFiles();
        const structuralOrder = structuralMarkdownSourceOrder(this.app.vault);
        if (structuralOrder.size !== markdown.length) return false;
        this.sourceCoordinates.clear();
        this.nextSourceOrder = 0; this.nextMarkdownOrder = markdown.length;
        for (const [markdownOrder, file] of markdown.entries()) {
          const order = structuralOrder.get(file.path);
          if (order === undefined) return false;
          this.sourceCoordinates.set(file.path, { order, markdownOrder });
          this.nextSourceOrder = Math.max(this.nextSourceOrder, order + 1);
        }
        this.environmentFields.clear();
        this.dailyNotesObservation = JSON.stringify(this.metadataHost.dailyNotesSettings());
        if (!this.restartInventoryChecked && !(await this.upgradeRestartLocalDependencies(markdown, structuralOrder, current))) return false;
        if (!(await this.reconcileRestartHostInventory(markdown, current))) return false;
        for (const [markdownOrder, file] of markdown.entries()) {
          const order = structuralOrder.get(file.path);
          if (order === undefined) return false;
          if (!current()) return false;
          const capture = this.capture(file);
          if (capture.state.oldPath) movedPaths.add(capture.state.oldPath);
          const hostCache = this.app.metadataCache.getFileCache(file);
          if (!hostCache) { this.counters.pendingMetadata += 1; complete = false; continue; }
          this.observeEnvironment(hostCache);
          const environment = await this.repository.observationDigest(this.environment(hostCache));
          const inspection = await this.repository.inspect(file.path, [], current);
          if (!current()) return false;
          const head = inspection.head;
          if (head && head.observation.environment !== environment && !environmentMaintenanceFenced) {
            // No native event necessarily accompanies Date-registry/Daily Notes changes. The periodic
            // cached-fact inventory is therefore the first authoritative observation for this drift.
            // Close semantic writes immediately, but do not globalize hostRevision: sources whose
            // environment digest is unchanged remain reusable in this same bounded pass.
            this.maintenanceRevision += 1; this.localDependenciesReady = false;
            environmentMaintenanceFenced = true;
          }
          const hostCurrent = !capture.state.resolutionDirty && head?.observation.environment === environment
            && (head.observation.epoch === this.epoch && head.observation.revision === this.hostRevision
              || this.hostRevision === 0 && !capture.state.dirty);
          if (inspection.saved && head?.state === "complete" && !capture.state.dirty && !capture.state.resolutionDirty && !capture.state.created
            && physicalMatches(head.physical, capture.physical) && hostCurrent) {
            // A clean restart may reuse the exact durable source head without rewriting its host
            // observation. Live host events still require this session's current epoch/revision.
            capture.state.identity ??= head.physical.identity;
            capture.state.observation = { ...head.observation };
            const local = await this.repository.ensureLocalDependencies(file.path, order, markdownOrder, current);
            if (!current()) return false;
            complete &&= local === "ready";
            await new Promise<void>(resolve => window.setTimeout(resolve, 0));
            continue;
          }
          const body = await this.loadBody(file, current);
          if (!body || !current()) return false;
          const acquired = await this.acquire(file, body, current);
          if (!acquired.current) return false;
          complete &&= acquired.saved;
          if (acquired.saved) {
            const local = await this.repository.ensureLocalDependencies(file.path, order, markdownOrder, current);
            complete &&= local === "ready";
            const state = this.state(file);
            if (state.oldPath) {
              const oldPath = state.oldPath;
              await this.repository.tombstone(oldPath, () => current() && !this.app.vault.getFileByPath(oldPath));
              state.oldPath = undefined;
            }
          }
          await new Promise<void>(resolve => window.setTimeout(resolve, 0));
        }
        // Missing graph pages or a broken graph snapshot never enter this catalog decision.
        let after: string | null = null;
        while (current()) {
          const page = await this.repository.headPage(after);
          if (!page.available || !current()) return false;
          if (page.invalid > 0) complete = false;
          for (const head of page.heads) if (head.state === "complete" && !this.app.vault.getFileByPath(head.physical.path)) {
            const result = await this.repository.tombstone(head.sourceId, () => current() && !this.app.vault.getFileByPath(head.physical.path), movedPaths.has(head.physical.path));
            complete &&= result.outcome === "activated";
          }
          if (page.next === null) break;
          after = page.next;
        }
        let ready = current() && complete;
        if (ready) {
          const local = await this.repository.completeLocalDependencyInventory(current);
          ready = current() && local === "ready";
          if (ready) {
            const deferred = await this.retryDeferredResolutionImpacts(current);
            ready = deferred === "ready" && await this.repairResolutionDirtySources(markdown, structuralOrder, current);
            if (ready) {
              const repairedLocal = await this.repository.completeLocalDependencyInventory(current);
              ready = current() && repairedLocal === "ready";
            }
          }
        }
        ready &&= !this.resolutionBackpressure;
        this.localDependenciesReady = ready;
        this.localDependencyAuthorityReady = ready;
        this.localInventoryCompletionPending = false;
        if (ready) {
          this.pendingKnownFiles.clear();
          this.inventoryReady?.();
        }
        return ready;
      } catch { this.counters.failures += 1; return false; }
    })();
    try { return await this.inventory; }
    finally { this.inventory = null; if (this.requested) this.requestInventory(); }
  }
  /** Explicit test/maintenance stop; never use this promise as an unload guarantee. */
  async flush(): Promise<boolean> {
    const inventory = this.inventory ? await this.inventory : await this.reconcile();
    const saved = await this.repository.flush();
    return inventory && saved;
  }
}
