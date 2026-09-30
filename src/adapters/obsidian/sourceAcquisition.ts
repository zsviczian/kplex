/**
 * Obsidian-owned neutral acquisition and inventory reconciliation. Physical parser inputs and lexical
 * references have a different lifetime from host target resolution. This adapter uses the existing
 * parser/Date collector/host resolver, never semantic settings or custom path guessing. It owns its
 * event fence independently of graph no-op suppression, plus a single cooperative inventory task.
 * Its read-only cached semantic capability supplies missing host facts without changing live routing.
 */
import { Platform, TFile, type App, type CachedMetadata } from "obsidian";
import type { GraphCompilerRuntime } from "../../core/graph/compiler";
import { acceptSourceBatch, beginSourceRead, sourceReadCanPublish, type NormalizedSourceBatch,
  type NormalizedSourceRecord, type SourceReadBoundary } from "../../core/graph/source";
import { CachedSourceSemanticReader, MAX_CACHED_SCOPE_SOURCES, type CachedSemanticPolicy,
  type CachedSemanticPreparation } from "../../index/CachedSourceSemantics";
import type { CachedSourceHost, CachedSourceRequest } from "../../index/SourceReplay";
import { selectedSourceFailure, type SelectedSourceResult } from "../../index/SourceRepository";
import type { ParsedBodyMetadata, ParsedFileMetadata } from "../../core/parser/metadata";
import { mergeFileMetadata } from "../../index/fieldParser";
import type { KplexIndexedDbCache } from "../../index/IndexedDbCache";
import { SOURCE_FAMILIES, SourceFactError, sourceFieldNames, sourceValueSteps, type SourceFamily, type SourceFamilyManifest,
  type SourcePhysical, type SourceReason, type StoredMetadataFact, type StoredSourceFact } from "../../index/SourceFacts";
import type { SourceFamilyProducer, SourceInspection, SourceRepositoryDiagnostics } from "../../index/SourceRepository";
import { createObsidianMetadataSourceHost, normalizedBodyUrl, ObsidianMetadataSourceCollector, type ObsidianMetadataSourceSettings } from "./metadataSourceCollector";
import { entityFactForFile, ObsidianStructuralPatchSourceCollector } from "./structuralSourceCollector";
import { hostLinkRecord } from "./hostLinkSourceCollector";
import { resolveObsidianReferenceTarget } from "./ontologySourceCollector";

type FileObservation = { identity: string | null; revision: number; dirty: boolean; bodyDirty: boolean; path: string; oldPath?: string; created: boolean };
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
  private closed = false;
  private started = false;
  private enabled = false;
  private timer: number | null = null;
  private pollTimer: number | null = null;
  private inventory: Promise<boolean> | null = null;
  private inventoryRevision = 0;
  private requested = false;
  private counters = { checked: 0, reusedBodies: 0, legacyBodies: 0, vaultReads: 0, parses: 0,
    repaired: 0, resolutionRefreshes: 0, pendingMetadata: 0, failures: 0 };

  /** Construction is side-effect free; start() explicitly owns host subscriptions. */
  constructor(private readonly app: App, private readonly cache: KplexIndexedDbCache, private readonly parse: SourceBodyParser) {
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
    const changed = (file?: TFile, created = false, oldPath?: string, bodyChanged = false): void => {
      this.hostRevision += 1;
      this.inventoryRevision += 1;
      if (file) {
        const state = this.state(file);
        state.revision += 1; state.dirty = true; state.bodyDirty ||= bodyChanged || created;
        if (created) { state.identity = this.repository.createIdentity(); state.created = true; }
        if (oldPath) state.oldPath = oldPath;
        this.repository.cancelSource(oldPath ?? state.path);
        this.repository.cancelSource(file.path);
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
      changed(file instanceof TFile ? file : undefined);
      if (file instanceof TFile) {
        const path = file.path;
        void this.repository.tombstone(path, () => !this.closed && !this.app.vault.getFileByPath(path));
      }
    });
    const metadata = this.app.metadataCache.on("changed", (file) => changed(file));
    const resolved = this.app.metadataCache.on("resolved", () => changed());
    this.cleanup.push(() => this.app.vault.offref(create), () => this.app.vault.offref(modify),
      () => this.app.vault.offref(rename), () => this.app.vault.offref(remove),
      () => this.app.metadataCache.offref(metadata), () => this.app.metadataCache.offref(resolved));
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
    if (!state) { state = { identity: null, revision: 0, dirty: false, bodyDirty: false, path: file.path, created: false }; this.states.set(file, state); }
    if (state.path !== file.path) { state.oldPath = state.path; state.path = file.path; state.dirty = true; state.revision += 1; }
    return state;
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
   * Capture the host inputs not represented by v5 source facts. This read never starts acquisition,
   * reads Markdown or writes a head. A new host epoch or dirty/pending source must first be acquired
   * through the existing lifecycle. Presentation selectors are copied independently from storage.
   */
  async captureForReplay(sourceId: string, settings: ObsidianMetadataSourceSettings, runtime: GraphCompilerRuntime): Promise<
    Readonly<{ outcome: "ready"; request: CachedSourceRequest }> | Exclude<SelectedSourceResult<never>, { outcome: "ready" }>> {
    if (!runtime.isCurrent() || this.closed) return selectedSourceFailure("cancelled");
    const file = this.app.vault.getFileByPath(sourceId);
    if (!(file instanceof TFile) || file.extension !== "md") return selectedSourceFailure("missing");
    const capture = this.capture(file);
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return selectedSourceFailure("pending-metadata");
    if (!capture.state.identity || capture.state.dirty || capture.state.bodyDirty || capture.state.created) return selectedSourceFailure("unsaved");
    const environmentText = this.environment(cache);
    const current = (): boolean => this.current(capture, runtime.isCurrent)
      && this.app.metadataCache.getFileCache(file) === cache && this.environment(cache) === environmentText;
    try {
      const environment = await this.repository.observationDigest(environmentText);
      if (!current()) return selectedSourceFailure(runtime.isCurrent() ? "stale" : "cancelled");
      const physical = { ...capture.physical, identity: capture.state.identity };
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
        source, physical, observation: { epoch: this.epoch, revision: capture.hostRevision, environment }, isCurrent: current,
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
    if (unique.length > MAX_CACHED_SCOPE_SOURCES) return selectedSourceFailure("backpressure");
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
    }
    return new CachedSourceSemanticReader(this.repository).prepare(requests, policy, {
      entity: (ref) => {
        if (!current() || !ref.physicalPath) return undefined;
        const file = this.app.vault.getFileByPath(ref.physicalPath);
        if (!(file instanceof TFile)) return undefined;
        const fact = entityFactForFile(file);
        return fact.entity.id === ref.id ? fact : undefined;
      },
    }, runtime);
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
      const hostCurrent = head?.observation.epoch === this.epoch && head.observation.revision === this.hostRevision
        && head.observation.environment === environment;
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
        capture.state.dirty = false; capture.state.bodyDirty = false; capture.state.created = false;
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
  /** Reconcile a captured inventory, reusing valid parsed inputs and repairing only local misses. */
  async reconcile(): Promise<boolean> {
    this.start();
    if (this.inventory) return this.inventory;
    if (this.closed) return false;
    this.requested = false;
    const revision = this.inventoryRevision;
    const current = (): boolean => !this.closed && revision === this.inventoryRevision;
    this.inventory = (async () => {
      let complete = true;
      try {
        const movedPaths = new Set<string>();
        for (const file of this.app.vault.getMarkdownFiles()) {
          if (!current()) return false;
          const capture = this.capture(file);
          if (capture.state.oldPath) movedPaths.add(capture.state.oldPath);
          const hostCache = this.app.metadataCache.getFileCache(file);
          if (!hostCache) { this.counters.pendingMetadata += 1; complete = false; continue; }
          const environment = await this.repository.observationDigest(this.environment(hostCache));
          const inspection = await this.repository.inspect(file.path, [], current);
          if (!current()) return false;
          if (inspection.saved && inspection.head && !capture.state.dirty && !capture.state.created
            && physicalMatches(inspection.head.physical, capture.physical)
            && inspection.head.observation.epoch === this.epoch && inspection.head.observation.revision === this.hostRevision
            && inspection.head.observation.environment === environment) {
            // This session already validated/activated the source. A new process has a different
            // epoch and validates every family before reuse, including selective corruption repair.
            continue;
          }
          const body = await this.loadBody(file, current);
          if (!body || !current()) return false;
          const acquired = await this.acquire(file, body, current);
          if (!acquired.current) return false;
          complete &&= acquired.saved;
          if (acquired.saved) {
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
          for (const head of page.heads) if (head.state === "complete" && !this.app.vault.getFileByPath(head.physical.path)) {
            const result = await this.repository.tombstone(head.sourceId, () => current() && !this.app.vault.getFileByPath(head.physical.path), movedPaths.has(head.physical.path));
            complete &&= result.outcome === "activated";
          }
          if (page.next === null) break;
          after = page.next;
        }
        return current() && complete;
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
