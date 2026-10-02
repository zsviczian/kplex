/**
 * Obsidian-owned neutral acquisition and inventory reconciliation. Physical parser inputs and lexical
 * references have a different lifetime from host target resolution. This adapter uses the existing
 * parser/Date collector/host resolver, never semantic settings or custom path guessing. It owns its
 * event fence independently of graph no-op suppression, plus a single cooperative inventory task.
 * Its read-only cached semantic capability supplies missing host facts without changing live routing.
 * SI4b1 adds an explicit structural inventory and bounded Date-registry observation fence. V3
 * catalogs capture full-builder Markdown encounter order only within that explicit acquisition. C2
 * host events also raise a coalesced durable UNKNOWN-impact ticket; no inverse resolver is invented.
 */
import { Platform, TFile, TFolder, type App, type CachedMetadata } from "obsidian";
import type { GraphCompilerRuntime } from "../../core/graph/compiler";
import { acceptSourceBatch, beginSourceRead, sourceReadCanPublish, type NormalizedSourceBatch,
  type NormalizedSourceRecord, type SourceReadBoundary } from "../../core/graph/source";
import { CachedSourceSemanticReader, type CachedSemanticPolicy,
  type CachedSemanticPreparation } from "../../index/CachedSourceSemantics";
import { CachedRequestedNeighborhoodReader, type CachedCenterGatePreparation,
  type CachedNeighborhoodRequest } from "../../index/CachedRequestedNeighborhood";
import { CachedRequestedCandidateDegreeReader, type CachedCandidateDegreePreparation,
  type CachedCandidateDegreeRequest } from "../../index/CachedRequestedCandidateDegrees";
import { CachedRequestedUrlTitleReader, type CachedUrlTitlePreparation } from "../../index/CachedRequestedUrlTitle";
import type { CachedCenterGatePolicy } from "../../index/CachedCenterGateProjection";
import type { SourcePatchReadPort } from "../../core/graph/patch";
import type { SourceEntityRef } from "../../core/graph/source";
import { SourceContributorDiscovery, type ContributorHostCatalog } from "../../index/SourceContributorDiscovery";
import { SourceLocalContributorDiscovery } from "./sourceLocalContributorDiscovery";
import { sourceLocalDependencyKey } from "../../index/SourceLocalDependencies";
import type { ContributorHostChange } from "../../index/SourceContributorJournal";
import type { CachedSourceHost, CachedSourceRequest } from "../../index/SourceReplay";
import { selectedSourceFailure, type SelectedSourceResult } from "../../index/SourceRepository";
import type { ParsedBodyMetadata, ParsedFileMetadata } from "../../core/parser/metadata";
import { mergeFileMetadata } from "../../index/fieldParser";
import type { KplexIndexedDbCache } from "../../index/IndexedDbCache";
import { SOURCE_FAMILIES, SOURCE_MAX_BATCH_RECORDS, SourceFactError, sourceFieldNames, sourceValueSteps, type SourceFamily, type SourceFamilyManifest,
  type SourceObservation, type SourcePhysical, type SourceReason, type StoredMetadataFact, type StoredSourceFact } from "../../index/SourceFacts";
import type { SourceFamilyProducer, SourceInspection, SourceRepositoryDiagnostics } from "../../index/SourceRepository";
import { createObsidianMetadataSourceHost, normalizedBodyUrl, ObsidianMetadataSourceCollector, type ObsidianMetadataSourceSettings } from "./metadataSourceCollector";
import { entityFactForFile, entityFactForFolder, ObsidianStructuralPatchSourceCollector, ObsidianStructuralSourceCollector,
  structuralMarkdownSourceOrder } from "./structuralSourceCollector";
import { hostLinkRecord, ObsidianHostLinkSourceCollector } from "./hostLinkSourceCollector";
import { resolveObsidianReferenceTarget } from "./ontologySourceCollector";

type FileObservation = { identity: string | null; revision: number; dirty: boolean; bodyDirty: boolean; resolutionDirty: boolean; path: string; oldPath?: string; created: boolean };
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
  /** Monotonic topology/resolution fence retained only for the legacy explicit global catalog. */
  private catalogObservation = 0;
  /** Settings-only reads are enabled only after the startup/event inventory closed every local owner. */
  private localDependenciesReady = false;
  private closed = false;
  private started = false;
  private enabled = false;
  private timer: number | null = null;
  private pollTimer: number | null = null;
  private inventory: Promise<boolean> | null = null;
  private inventoryRevision = 0;
  /** One narrow durable/current host comparison per process before restart readiness is declared. */
  private restartInventoryChecked = false;
  /** Known events whose source-local fan-out could not be authenticated are coalesced here. */
  private uncertainResolution = false;
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
    /** Observe host changes before scheduling acquisition. Known file events fan out through the
     * source-local dependency index; only an unscoped resolver event advances the global host fence. */
    const changed = (file?: TFile, created = false, oldPath?: string, bodyChanged = false,
      kind: ContributorHostChange["kind"] = "source"): void => {
      const effectiveKind = created || oldPath ? "topology" : kind;
      this.markContributorHostChange(effectiveKind, !file && effectiveKind === "resolution");
      if (file) {
        const state = this.state(file);
        state.revision += 1; state.dirty = true; state.bodyDirty ||= bodyChanged || created;
        if (created) { state.identity = this.repository.createIdentity(); state.created = true; }
        if (oldPath) state.oldPath = oldPath;
        this.repository.cancelSource(oldPath ?? state.path);
        this.repository.cancelSource(file.path);
        void this.markKnownResolutionDependents(file, oldPath);
      }
      this.requestInventory();
    };
    const create = this.app.vault.on("create", (file) => changed(file instanceof TFile ? file : undefined, true));
    const modify = this.app.vault.on("modify", (file) => changed(file instanceof TFile ? file : undefined, false, undefined, true));
    const rename = this.app.vault.on("rename", (file, oldPath) => {
      changed(file instanceof TFile ? file : undefined, false, oldPath);
      if (file instanceof TFile) void this.repository.tombstone(oldPath, () => !this.closed && !this.app.vault.getFileByPath(oldPath), true);
    });
    const remove = this.app.vault.on("delete", (file) => {
      changed(file instanceof TFile ? file : undefined, false, undefined, false, "topology");
      if (file instanceof TFile) {
        const path = file.path;
        void this.repository.tombstone(path, () => !this.closed && !this.app.vault.getFileByPath(path));
      }
    });
    const metadata = this.app.metadataCache.on("changed", (file) => changed(file));
    const resolved = this.app.metadataCache.on("resolved", () => changed(undefined, false, undefined, false, "resolution"));
    this.cleanup.push(() => this.app.vault.offref(create), () => this.app.vault.offref(modify),
      () => this.app.vault.offref(rename), () => this.app.vault.offref(remove),
      () => this.app.metadataCache.offref(metadata), () => this.app.metadataCache.offref(resolved));
  }
  /** Synchronously fence host authority and persist a bounded, coalesced unknown-impact observation. */
  private markContributorHostChange(kind: ContributorHostChange["kind"], global = kind === "resolution"): void {
    // Known file events are fenced by their FileObservation and source-local dependents. Only an
    // unscoped resolver event lacks a provable fan-out and therefore advances the global host fence.
    if (kind !== "environment") {
      if (global) this.hostRevision += 1;
      this.inventoryRevision += 1;
      this.localDependenciesReady = false;
    }
    if (kind !== "environment") this.catalogObservation += 1;
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
    this.timer = null; this.pollTimer = null;
  }
  /** Allocate an incarnation lazily; a matching restart head can supply its already durable identity. */
  private state(file: TFile): FileObservation {
    let state = this.states.get(file);
    if (!state) { state = { identity: null, revision: 0, dirty: false, bodyDirty: false, resolutionDirty: false, path: file.path, created: false }; this.states.set(file, state); }
    if (state.path !== file.path) { state.oldPath = state.path; state.path = file.path; state.dirty = true; state.revision += 1; }
    return state;
  }
  /** Host-significant metadata available from MetadataCache without reading Markdown bodies. */
  private currentHostInventory(file: TFile, cache: CachedMetadata): StoredMetadataFact[] {
    const metadata = mergeFileMetadata(cache, { inlineFields: {}, inlineFieldOccurrences: [], urls: [] });
    return [...metadataSteps(file, metadata, cache)].filter((record): record is StoredMetadataFact =>
      record.kind === "alias" || record.kind === "tag" || record.kind === "file-parent" || record.kind === "host-literal");
  }
  /** Read only the selected source's durable host-significant metadata family. */
  private async durableHostInventory(sourceId: string, current: () => boolean): Promise<Readonly<{ reason: SourceReason; facts: StoredMetadataFact[] }>> {
    const facts: StoredMetadataFact[] = [];
    const reason = await this.repository.visit(sourceId, "metadata", (records) => {
      for (const record of records) if (record.kind === "alias" || record.kind === "tag" || record.kind === "file-parent" || record.kind === "host-literal") facts.push(record);
      return current();
    }, current);
    return { reason, facts };
  }
  /** Literal spellings whose resolver result may change when this target/path/alias changes. */
  private dependencyTokens(path: string, facts: readonly StoredMetadataFact[]): string[] {
    const tokens = new Set<string>();
    const leaf = path.split("/").pop() ?? path;
    const withoutExtension = path.replace(/\.md$/i, "");
    const basename = leaf.replace(/\.md$/i, "");
    for (const token of [path, withoutExtension, leaf, basename]) if (token) tokens.add(token);
    for (const fact of facts) if (fact.kind === "alias" && fact.value) tokens.add(fact.value);
    return [...tokens];
  }
  /** Mark only source-local literal owners; no global contributor catalog participates. */
  private async markResolutionDependents(tokens: readonly string[], excluded: ReadonlySet<string> = new Set(),
    current: () => boolean = () => !this.closed): Promise<boolean> {
    const unique = [...new Set(tokens.filter(Boolean))];
    if (!unique.length) return true;
    for (let offset = 0; offset < unique.length; offset += SOURCE_MAX_BATCH_RECORDS) {
      if (!current() || this.closed) return false;
      const page = unique.slice(offset, offset + SOURCE_MAX_BATCH_RECORDS)
        .map((token) => sourceLocalDependencyKey("literal", token));
      const found = await this.repository.lookupLocalDependencies(page, current);
      if (found.outcome !== "ready") return false;
      let marked = 0;
      for (const stamp of found.value.sources) {
        const sourceId = stamp.head.sourceId;
        if (excluded.has(sourceId)) continue;
        const file = this.app.vault.getFileByPath(sourceId);
        if (!(file instanceof TFile) || file.extension !== "md") continue;
        const state = this.state(file);
        if (!state.resolutionDirty) { state.resolutionDirty = true; state.revision += 1; this.repository.cancelSource(sourceId); }
        if (++marked % 256 === 0) { await new Promise<void>(resolve => window.setTimeout(resolve, 0)); if (!current()) return false; }
      }
    }
    this.requestInventory();
    return true;
  }
  /** Resolve known live file-event fan-out from durable/current aliases and path spellings. */
  private async markKnownResolutionDependents(file: TFile, oldPath?: string): Promise<void> {
    const generation = this.inventoryRevision;
    const current = (): boolean => !this.closed && generation === this.inventoryRevision;
    try {
      const tokens = new Set<string>();
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache) for (const token of this.dependencyTokens(file.path, this.currentHostInventory(file, cache))) tokens.add(token);
      const candidates = [oldPath, file.path].filter((path): path is string => !!path);
      for (const path of candidates) {
        const durable = await this.durableHostInventory(path, current);
        if (!current()) return;
        if (durable.reason === "ready") for (const token of this.dependencyTokens(path, durable.facts)) tokens.add(token);
      }
      const excluded = new Set(candidates);
      if (!(await this.markResolutionDependents([...tokens], excluded, current)) && current()) {
        // The source-local certificate was not usable. Queue one coalesced cached-fact refresh at
        // the next inventory boundary; do not asynchronously invalidate an in-flight changed-source
        // acquisition that was captured after the host event itself.
        this.uncertainResolution = true;
        this.localDependenciesReady = false;
        this.requestInventory();
      }
    } catch {
      if (current()) { this.uncertainResolution = true; this.localDependenciesReady = false; this.requestInventory(); }
    }
  }
  /**
   * Before first-process readiness, compare narrow current MetadataCache facts with their durable
   * per-source metadata families. This detects offline alias/path/create/delete drift without reading
   * unchanged Markdown bodies. Proven referrers are marked for resolution-only replay.
   */
  private async reconcileRestartHostInventory(markdown: readonly TFile[], current: () => boolean): Promise<boolean> {
    if (this.restartInventoryChecked) return true;
    const tokens = new Set<string>(), changedPaths = new Set<string>();
    for (const file of markdown) {
      if (!current()) return false;
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache) continue;
      const inspection = await this.repository.inspect(file.path, ["metadata"], current);
      if (!current()) return false;
      const head = inspection.head;
      const now = this.currentHostInventory(file, cache);
      if (!inspection.saved || !head || head.state !== "complete") {
        changedPaths.add(file.path);
        for (const token of this.dependencyTokens(file.path, now)) tokens.add(token);
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
        for (const token of this.dependencyTokens(file.path, durable.facts)) tokens.add(token);
        for (const token of this.dependencyTokens(file.path, now)) tokens.add(token);
      }
    }
    let after: string | null = null;
    while (current()) {
      const page = await this.repository.headPage(after);
      // Restart drift reconciliation is a durable-storage enhancement. Storage-degraded operation
      // retains the established in-memory acquisition path and cannot authenticate offline drift.
      if (!page.available) { this.restartInventoryChecked = true; return current(); }
      for (const head of page.heads) if (head.state === "complete" && !this.app.vault.getFileByPath(head.physical.path)) {
        changedPaths.add(head.physical.path);
        const durable = await this.durableHostInventory(head.sourceId, current);
        if (!current()) return false;
        if (durable.reason === "ready") for (const token of this.dependencyTokens(head.physical.path, durable.facts)) tokens.add(token);
        else for (const token of this.dependencyTokens(head.physical.path, [])) tokens.add(token);
      }
      if (page.next === null) break;
      after = page.next;
      await new Promise<void>(resolve => window.setTimeout(resolve, 0));
    }
    if (tokens.size && !(await this.markResolutionDependents([...tokens], changedPaths, current))) {
      if (!current()) return false;
      this.hostRevision += 1;
      this.localDependenciesReady = false;
    }
    this.restartInventoryChecked = true;
    return current();
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
    const contributorObservation = this.contributorObservation;
    const current = (): boolean => this.current(capture, runtime.isCurrent)
      && this.contributorObservation === contributorObservation
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
        observation = { epoch: this.epoch, revision: capture.hostRevision, environment };
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

  /**
   * Internal, read-only SI4a entry point. Replay each requested owner once and return private
   * semantics, not a GraphIndex patch/publication. Only exact current physical entities are seeded;
   * dormant references and synthetic nodes from an older policy are never imported from GraphState.
   */
  async prepareCachedSemantics(sourceIds: readonly string[], policy: CachedSemanticPolicy,
    presentation: ObsidianMetadataSourceSettings, runtime: GraphCompilerRuntime): Promise<CachedSemanticPreparation> {
    const unique = [...new Set(sourceIds)];
    const requests: CachedSourceRequest[] = [];
    const policyRevision = policy.revision;
    const current = (): boolean => runtime.isCurrent() && policy.isCurrent() && policy.revision === policyRevision;
    const scopedRuntime = { ...runtime, isCurrent: current };
    for (const sourceId of unique) {
      const captured = await this.captureForReplay(sourceId, presentation, scopedRuntime);
      if (!runtime.isCurrent()) return selectedSourceFailure("cancelled");
      if (!policy.isCurrent() || policy.revision !== policyRevision) return selectedSourceFailure("superseded");
      if (captured.outcome !== "ready") return { ...captured, sourceId };
      requests.push(captured.request);
      if (requests.length % SOURCE_MAX_BATCH_RECORDS === 0) { await runtime.yield(); if (!current()) return selectedSourceFailure("cancelled"); }
    }
    return new CachedSourceSemanticReader(this.repository).prepare(requests, policy, {
      entity: (ref) => {
        if (!current() || ref.physicalPath === undefined) return undefined;
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
    }, runtime);
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
    const current = (): boolean => !this.closed && runtime.isCurrent() && this.localDependenciesReady
      && this.hostRevision === revision && this.contributorObservation === observation;
    return new SourceLocalContributorDiscovery(this.repository, this.app,
      { epoch: this.epoch, revision, token: `${this.epoch}:${revision}:${observation}` }, current);
  }

  /** Prepare one exact center from cached facts; missing catalog remains pending and never falls back. */
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

  /**
   * Create an internal SI4b1 catalog capability for the current host revision. Rebuild is explicit;
   * neither construction nor querying schedules acquisition or changes any live graph consumer.
   * Explicit collection captures Markdown encounter ordinals separately from structural order,
   * and rechecks exact inventory identity/order before activating the derivative catalog.
   * Canonical topology finalization closes the inventory; a bounded field vocabulary checks Date
   * registry changes without scanning all files per query. A new host revision needs a new capability.
   */
  contributorDiscovery(runtime: GraphCompilerRuntime): SourceContributorDiscovery {
    this.start();
    const revision = this.hostRevision;
    const catalogObservation = this.catalogObservation;
    const daily = JSON.stringify(this.metadataHost.dailyNotesSettings());
    const fields = new Map<string, boolean>();
    let fieldBytes = 0;
    let environmentDirty = false;
    /** Source events, cancellation and unload cheaply fence every awaited source/structure batch. */
    const current = (): boolean => !this.closed && runtime.isCurrent() && this.hostRevision === revision
      && this.catalogObservation === catalogObservation;
    const scopedRuntime = { ...runtime, isCurrent: current };
    const catalog: ContributorHostCatalog = {
      stamp: { epoch: this.epoch, revision, token: this.repository.createIdentity() },
      markdownOrderVersion: 1,
      hostLinkOwnerOrderVersion: 1,
      isCurrent: current,
      /** Check all observed Date and non-Date fields; policy-only changes do not enter this fence. */
      validate: () => {
        if (!current()) return false;
        if (JSON.stringify(this.metadataHost.dailyNotesSettings()) === daily
          && [...fields].every(([field, wasDate]) => this.metadataHost.isDateProperty(field) === wasDate)) {
          environmentDirty = false;
          return true;
        }
        // Demand observes canonical inputs without changing the accepted reversible validator.
        // A restored environment cannot retire its persisted UNKNOWN host transition ticket.
        if (!environmentDirty) { environmentDirty = true; this.markContributorHostChange("environment"); }
        return false;
      },
      /**
       * Capture ordinals only during explicit acquisition, never a settings query. The same host
       * revision encloses both inventories. Exact TFile membership and final enumeration equality
       * prevent equal-length replacements, duplicates or traversal order from supplying ordinals.
       */
      collect: async (emit) => {
        if (!current()) return false;
        const markdown = this.app.vault.getMarkdownFiles().slice();
        const ordinals = new Map<TFile, number>();
        let inventoryBytes = 0;
        for (const [ordinal, file] of markdown.entries()) {
          if (!current()) return false;
          if (!(file instanceof TFile) || file.extension !== "md" || ordinals.has(file)
            || this.app.vault.getFileByPath(file.path) !== file) throw new SourceFactError("host-catalog-stale");
          inventoryBytes += file.path.length * 2 + 128;
          if (inventoryBytes > 8 * 1024 * 1024) throw new SourceFactError("memory-budget");
          ordinals.set(file, ordinal);
          if ((ordinal & 255) === 255) { await runtime.yield(); if (!current()) return false; }
        }
        const collector = new ObsidianStructuralSourceCollector(this.app, {
          isCurrent: current, sourceRevision: () => this.hostRevision,
          checkpoint: async () => { await runtime.yield(); return current(); },
        });
        let cursor = beginSourceRead(collector.boundary);
        let documents = 0;
        /** Consume finite canonical batches without retaining a second full structural graph. */
        const consume = async (batch: NormalizedSourceBatch): Promise<boolean> => {
          const accepted = acceptSourceBatch(cursor, batch);
          if (!accepted.accepted || !current()) return false;
          for (const record of batch.records) {
            if (record.kind !== "entity" && record.kind !== "file-tree" && record.kind !== "tag-tree") return false;
            let ordinal: number | undefined;
            if (record.kind === "entity" && record.entity.kind === "document") {
              documents++;
              const path = record.entity.physicalPath;
              const file = path === undefined ? null : this.app.vault.getFileByPath(path);
              ordinal = file instanceof TFile ? ordinals.get(file) : undefined;
              if (ordinal === undefined) return false;
            }
            if (!(await emit(record, ordinal)) || !current()) return false;
          }
          cursor = accepted.cursor;
          return current();
        };
        if (!(await collector.collectBatches(consume))) return false;
        const final = await collector.finalize();
        if (final === null || !(await consume(final)) || !current() || documents !== markdown.length) return false;
        const after = this.app.vault.getMarkdownFiles();
        if (after.length !== markdown.length) return false;
        // Recheck the exact encounter stream cooperatively, not just its length or sorted paths.
        for (const [ordinal, file] of after.entries()) {
          if (!current() || file !== markdown[ordinal] || this.app.vault.getFileByPath(file.path) !== file) return false;
          if ((ordinal & 255) === 255) { await runtime.yield(); if (!current()) return false; }
        }
        return current() && collector.isBoundaryCurrent(collector.boundary) && sourceReadCanPublish(cursor, collector.boundary);
      },
      /** Capture original whole-map owner order only during this explicit catalog acquisition. */
      captureHostLinkOwnerOrder: async () => {
        const collector = new ObsidianHostLinkSourceCollector(this.app, {
          isCurrent: current, sourceRevision: () => this.hostRevision,
          checkpoint: async () => { await runtime.yield(); return current(); },
        });
        return collector.captureOwnerOrder();
      },
      /** Capture one already-acquired document and its complete frontmatter field-type vocabulary. */
      capture: async (entity) => {
        const path = entity.entity.physicalPath;
        const file = path ? this.app.vault.getFileByPath(path) : null;
        if (!(file instanceof TFile) || file.extension !== "md") throw new SourceFactError("host-catalog-stale");
        const metadata = this.app.metadataCache.getFileCache(file);
        if (!metadata) throw new SourceFactError("pending-metadata");
        for (const field of Object.keys(metadata.frontmatter ?? {})) {
          if (field === "position" || fields.has(field)) continue;
          fieldBytes += field.length * 2 + 64;
          if (fields.size >= 4096 || fieldBytes > 1024 * 1024) throw new SourceFactError("memory-budget");
          fields.set(field, this.metadataHost.isDateProperty(field));
        }
        // These presentation records are irrelevant to dependency discovery. Do not persist or
        // index configured semantic roles or arbitrary frontmatter presentation values.
        const captured = await this.captureForReplay(file.path, { noteTypeField: "", primaryTagField: "" }, scopedRuntime);
        if (captured.outcome !== "ready") throw new SourceFactError(captured.reason);
        return captured.request;
      },
    };
    return new SourceContributorDiscovery(this.repository, catalog, runtime);
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
      body = await this.repository.readBody(capture.state.oldPath, (physical) => accept(physical, true), current, true);
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
      if (intrinsic && hostCurrent && inspection.saved && inspection.reason === "ready") return { current: current(), saved: inspection.saved, reason: "ready" };
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
      return { current: observationCurrent(), saved: result.outcome === "activated", reason: result.reason };
    } catch { this.counters.failures += 1; return { current: current(), saved: false, reason: "write-error" }; }
  }
  /** Enable after the existing authoritative publication; do not lengthen its metadata-stability gate. */
  enableInventory(): void {
    this.start(); this.enabled = true; this.requestInventory();
    if (this.pollTimer === null && !this.closed) this.pollTimer = window.setTimeout(() => {
      this.pollTimer = null; this.enableInventory();
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
    if (this.uncertainResolution) { this.uncertainResolution = false; this.hostRevision += 1; }
    const revision = this.inventoryRevision;
    const current = (): boolean => !this.closed && revision === this.inventoryRevision;
    this.inventory = (async () => {
      let complete = true;
      try {
        const movedPaths = new Set<string>();
        const markdown = this.app.vault.getMarkdownFiles();
        const structuralOrder = structuralMarkdownSourceOrder(this.app.vault);
        if (structuralOrder.size !== markdown.length) return false;
        if (!(await this.reconcileRestartHostInventory(markdown, current))) return false;
        for (const [markdownOrder, file] of markdown.entries()) {
          const order = structuralOrder.get(file.path);
          if (order === undefined) return false;
          if (!current()) return false;
          const capture = this.capture(file);
          if (capture.state.oldPath) movedPaths.add(capture.state.oldPath);
          const hostCache = this.app.metadataCache.getFileCache(file);
          if (!hostCache) { this.counters.pendingMetadata += 1; complete = false; continue; }
          const environment = await this.repository.observationDigest(this.environment(hostCache));
          const inspection = await this.repository.inspect(file.path, [], current);
          if (!current()) return false;
          const head = inspection.head;
          const hostCurrent = head?.observation.environment === environment
            && (head.observation.epoch === this.epoch && head.observation.revision === this.hostRevision
              || this.hostRevision === 0 && !capture.state.dirty);
          if (inspection.saved && head && !capture.state.dirty && !capture.state.resolutionDirty && !capture.state.created
            && physicalMatches(head.physical, capture.physical) && hostCurrent) {
            // A clean restart may reuse the exact durable source head without rewriting its host
            // observation. Live host events still require this session's current epoch/revision.
            capture.state.identity ??= head.physical.identity;
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
        }
        this.localDependenciesReady = ready;
        if (ready) this.inventoryReady?.();
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
