/**
 * Durable neutral-source repository. Immutable bounded family chunks/postings are staged privately,
 * validated, then selected by one compare-and-swap source head. Disk activation and live publication
 * are explicitly different outcomes. This module owns source transactions, cross-connection reader
 * leases, conservative cleanup, bounded unsaved facts/backoff and aggregate-only diagnostics; it
 * never reads a Vault, selects a relationship policy, or serializes a graph. The additive SI4b1
 * catalog uses this same transaction owner. v7 retains its original summary/root proof in a durable
 * repair journal before mutation, with a separate non-queryable impact certificate and root leases.
 * A deletion-only pin capability can retire a masked head without making it readable as live data.
 * Retired impact leases retain bounded retry ownership until an exact deletion commits; a cleanup-
 * only storage port can release them after a failed/closed normal connection, without new authority.
 */
import { estimateReferenceRecordBytes } from "../core/graph/source";
import type { ParsedBodyMetadata } from "../core/parser/metadata";
import {
  SOURCE_DEPENDENCY_STORE, SOURCE_DEPENDENCY_STATE_KEY, SOURCE_DEPENDENCY_ROOT_KEY,
  SOURCE_DEPENDENCY_BUILD_KEY, SOURCE_DEPENDENCY_BUCKETS, SOURCE_DEPENDENCY_MAX_PAGES,
  sourceDependencyState, validSourceDependencyState, validSourceDependencyBuild,
  validSourceDependencyPage, validSourceDependencyRoot,
  type SourceDependencyBuild, type SourceDependencyPage, type SourceDependencyRootRecord,
  type SourceDependencyState,
  SOURCE_BODY_PARSER_VERSION, SOURCE_CHUNK_TARGET_BYTES, SOURCE_DECODE_BUDGET_BYTES, SOURCE_FACT_COMPILER_VERSION,
  SOURCE_FACT_FORMAT_VERSION, SOURCE_FAMILIES, SOURCE_FLUSH_INTERVAL_MS, SOURCE_MAX_BATCH_RECORDS,
  SOURCE_MAX_RECORD_BYTES, SOURCE_REASONS, SOURCE_RESOLUTION_VERSION, SourceBodyDecoder, SourceFactError,
  SourceFrameValidator, decodeSourceHead, sourceCount, sourceHeadReason, sourceObject,
  sourcePostingKeys, validSourceChunk, validSourcePhysical, validSourcePosting,
  type SourceChunk, type SourceFamily, type SourceFamilyManifest, type SourceHead, type SourceManifest,
  type SourceObservation, type SourcePhysical, type SourcePosting, type SourcePostingKind, type SourceReason,
  type StoredSourceFact,
} from "./SourceFacts";

import {
  SOURCE_IMPACT_ENABLED_KEY, SOURCE_IMPACT_STORE, SOURCE_IMPACT_SLOT_INDEX, SOURCE_IMPACT_LEASE_INDEX, SOURCE_IMPACT_ROOT_PREFIX,
  SOURCE_IMPACT_RECORD_BYTES, SOURCE_IMPACT_DATA_BYTES, contributorJournalKey, contributorJournalSelection,
  sameContributorSelection, validContributorJournalRecord, validContributorHostChange, contributorJournalAuthority,
  type ContributorJournalOwner, type ContributorJournalRecord, type ContributorJournalSelection, type ContributorHostChange,
} from "./SourceContributorJournal";

import { releaseContributorRootLease, type ContributorRootLease } from "./SourceContributorLease";
import {
  SOURCE_LOCAL_DEPENDENCY_STATE_KEY, SOURCE_LOCAL_DEPENDENCY_STORE, SOURCE_LOCAL_DEPENDENCY_VERSION, SOURCE_LOCAL_KEY_STORE, SOURCE_LOCAL_LOOKUP_INDEX, SOURCE_LOCAL_OWNER_STORE, SOURCE_LOCAL_REPAIR_STORE,
  sourceLocalDependencyState, sourceLocalStoredDependencyKeys, sourceLocalStoredResolverKeys, sourceLocalStructuralBaseKeys, validSourceLocalDependencyOwner,
  validSourceLocalDependencyKeyState, validSourceLocalDependencyRepair, validSourceLocalDependencyRow, validSourceLocalDependencyState, type SourceLocalDependencyKeyState, type SourceLocalDependencyOwner, type SourceLocalDependencyRepair, type SourceLocalDependencyRow,
  type SourceLocalDependencyState,
} from "./SourceLocalDependencies";

export const SOURCE_HEAD_STORE = "sourceHeads";
export const SOURCE_CHUNK_STORE = "sourceChunks";
export const SOURCE_POSTING_STORE = "sourcePostings";
export const SOURCE_REVISION_INDEX = "sourceRevision";
export const SOURCE_FAMILY_INDEX = "sourceFamilyRevision";
export const SOURCE_LOOKUP_INDEX = "lookup";
export const SOURCE_LEASE_INDEX = "sourceLease";
const META_STORE = "meta";
const SOURCE_SEQUENCE_KEY = "source-sequence";
const MAX_UNSAVED_BYTES = 16 * 1024 * 1024;
const MAX_WRITERS = 2;
const TRANSACTION_TIMEOUT_MS = 5000;

/** Connection ownership stays in KplexIndexedDbCache, including VersionError and reopen backoff. */
export type SourceStorage = Readonly<{
  open(): Promise<IDBDatabase | null>;
  failed(db: IDBDatabase, error: unknown): void;
  unavailableReason?(): SourceReason;
  /** Cleanup-only existing-database reopen; the repository supplies only its retired exact lease. */
  releaseContributorLease?(lease: ContributorRootLease): Promise<boolean>;
}>;
/** Narrow source-local repair checkpoints let real-IDB tests interrupt durable phase boundaries. */
export type SourceLocalDependencyCheckpoint =
  | "before-local-staging"
  | "after-local-staging-page"
  | "after-local-activation"
  | "after-local-old-count-batch"
  | "after-local-new-count-batch"
  | "before-local-repair-retire";

/** Real runtime capabilities, also usable with deterministic clocks and focused repair fault injection. */
export type SourceRepositoryRuntime = Readonly<{
  now(): number;
  yield(): Promise<void>;
  schedule(callback: () => void, delay: number): number;
  cancel(timer: number): void;
  digest(text: string): Promise<string>;
  uniqueId(): string;
  localDependencyCheckpoint?(phase: SourceLocalDependencyCheckpoint): void;
}>;
/** Select the browser's owning storage/runtime services only at the composition boundary. */
export function sourceRepositoryRuntime(): SourceRepositoryRuntime {
  return {
    now: () => Date.now(),
    yield: () => new Promise<void>((resolve) => window.setTimeout(resolve, 0)),
    schedule: (callback, delay) => window.setTimeout(callback, delay),
    cancel: (timer) => window.clearTimeout(timer),
    digest: async (text) => {
      const hash = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
    },
    uniqueId: () => window.crypto.randomUUID(),
  };
}

/** An unavailable catalog is not equivalent to an empty database. */
export type SourceHeadExpectation =
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "invalid" }>
  | Readonly<{ kind: "unavailable" }>
  | Readonly<{ kind: "head"; revision: string; sequence: number }>;
/** A producer must await emit, including null cooperative work steps, to apply storage backpressure. */
export type SourceFamilyProducer = (emit: (fact: StoredSourceFact | null) => Promise<boolean>) => Promise<boolean>;
export type SourceReplacement = Readonly<{
  sourceId: string;
  physical: SourcePhysical;
  observation: SourceObservation;
  expected: SourceHeadExpectation;
  families: Readonly<Record<SourceFamily, SourceFamilyProducer | SourceFamilyManifest>>;
}>;
export type SourceWriteResult = Readonly<{
  outcome: "activated" | "absent" | "unsaved" | "cancelled" | "superseded" | "rejected";
  reason: SourceReason;
  sequence: number | null;
  live: boolean;
}>;
export type SourceInspection = Readonly<{
  head: SourceManifest | null;
  sequence: number | null;
  saved: boolean;
  expected: SourceHeadExpectation;
  reason: SourceReason;
  families: Readonly<Partial<Record<SourceFamily, SourceReason>>>;
}>;

/** Identity of one selected source; a policy revision deliberately is not a storage revision. */
export type SelectedSourceStamp = Readonly<{
  head: SourceManifest;
  sequence: number | null;
  saved: boolean;
}>;
/** A private multi-family read. Consumers must not publish records before the terminal result. */
export type SelectedSourceReader = SelectedSourceStamp & Readonly<{
  visit(family: SourceFamily, consume: (records: readonly StoredSourceFact[]) => Promise<boolean> | boolean): Promise<SourceReason>;
}>;
/** Closed outcomes prevent an unavailable or incomplete source from masquerading as an empty one. */
export type SelectedSourceResult<T> =
  | Readonly<{ outcome: "ready"; stamp: SelectedSourceStamp; value: T }>
  | Readonly<{ outcome: "pending-acquisition" | "stale" | "cancelled" | "invalid-family" | "storage-unavailable";
      reason: SourceReason; family?: SourceFamily }>;
export type SourceLocalDependencyLookupResult<T> =
  | Readonly<{ outcome: "ready"; value: T }>
  | Exclude<SelectedSourceResult<never>, { outcome: "ready" }>;

/** Classify only stable storage reasons; never expose raw exceptions or partial prepared values. */
export function selectedSourceFailure(reason: SourceReason, family?: SourceFamily): Exclude<SelectedSourceResult<never>, { outcome: "ready" }> {
  const outcome = reason === "cancelled" ? "cancelled"
    : reason === "stale" || reason === "superseded" ? "stale"
    : ["missing", "pending-metadata", "tombstone", "unsaved", "memory-budget", "backpressure", "dependency-pending"].includes(reason) ? "pending-acquisition"
    : ["storage-unavailable", "newer-database", "read-error", "write-error", "quota-exceeded", "catalog-uncertain"].includes(reason) ? "storage-unavailable"
    : "invalid-family";
  return { outcome, reason, ...(family ? { family } : {}) };
}

type SourceLease = { key: string; sourceId: string; revision: string; owner: string };
type SourceView = {
  head: SourceManifest;
  sequence: number | null;
  saved: boolean;
  expected: SourceHeadExpectation;
  leases: string[];
  memory?: MemorySource;
  connection?: IDBDatabase;
  release?: Promise<void>;
};
type MemorySource = {
  head: SourceManifest;
  expected: SourceHeadExpectation;
  chunks: Map<string, SourceChunk>;
  postings: Map<string, SourcePosting>;
  bytes: number;
  current: () => boolean;
};
/** An identity-fenced deletion capability, distinct from a normal include-tombstone body reader. */
type PendingSourceDeletion = Readonly<{ current: () => boolean; retain: boolean; ready?: Promise<void> }>;
type SourceWriteLane = {
  ticket: number;
  active: Promise<SourceWriteResult>;
  pending?: { start: () => Promise<SourceWriteResult>; resolve: (value: SourceWriteResult) => void };
};
type StagedSourceChunk = Readonly<{ chunk: SourceChunk; batches: readonly SourcePosting[][]; bytes: number }>;
type PreparedLocalDependencies = Readonly<{ records: number; digest: string }>;

/** A pinned historical repair read; its pages are never an alternate public discovery route. */
export type ContributorJournalReader = Readonly<{
  record: ContributorJournalRecord;
  root: SourceDependencyRootRecord | null;
  fence: Readonly<{ revision: number; sequence: number }>;
  page(bucket: number, index: number): Promise<SourceDependencyPage>;
}>;

/** Export only finite aggregate numbers and this module's closed reason/family vocabularies. */
export type SourceRepositoryDiagnostics = {
  formatVersion: 1;
  databaseVersion: 9;
  factFormatVersion: number;
  factCompilerVersion: number;
  bodyParserVersion: number;
  resolutionVersion: number;
  storage: "unchecked" | "available" | "unavailable";
  activated: number;
  unsaved: number;
  empty: number;
  chunksWritten: number;
  bytesWritten: number;
  familiesReused: number;
  readFailures: number;
  sequenceMin: number;
  sequenceMax: number;
  peakDecodeBytes: number;
  lastReason: SourceReason;
  familyFailures: Record<SourceFamily, number>;
};
/** Sanitize reports independently of private state; extra fields and arbitrary reasons disappear. */
export function sanitizeSourceRepositoryDiagnostics(value: unknown): SourceRepositoryDiagnostics {
  const input = sourceObject(value) ? value : {};
  const result: SourceRepositoryDiagnostics = {
    formatVersion: 1, databaseVersion: 9, factFormatVersion: SOURCE_FACT_FORMAT_VERSION,
    factCompilerVersion: SOURCE_FACT_COMPILER_VERSION, bodyParserVersion: SOURCE_BODY_PARSER_VERSION,
    resolutionVersion: SOURCE_RESOLUTION_VERSION, storage: "unchecked", activated: 0, unsaved: 0,
    empty: 0, chunksWritten: 0, bytesWritten: 0, familiesReused: 0, readFailures: 0,
    sequenceMin: 0, sequenceMax: 0, peakDecodeBytes: 0, lastReason: "missing",
    familyFailures: { values: 0, "body-urls": 0, metadata: 0, resolution: 0 },
  };
  if (input.storage === "available" || input.storage === "unavailable") result.storage = input.storage;
  for (const key of ["activated", "unsaved", "empty", "chunksWritten", "bytesWritten", "familiesReused", "readFailures", "sequenceMin", "sequenceMax", "peakDecodeBytes"] as const) {
    if (sourceCount(input[key])) result[key] = input[key];
  }
  const reason = SOURCE_REASONS.find((reason) => reason === input.lastReason);
  if (reason) result.lastReason = reason;
  if (sourceObject(input.familyFailures)) {
    for (const family of SOURCE_FAMILIES) if (sourceCount(input.familyFailures[family])) result.familyFailures[family] = input.familyFailures[family];
  }
  return result;
}

/** Compare only explicit dependency-generation coordinates, never serialized object key order. */
function sameDependencyBuild(left: SourceDependencyBuild, right: SourceDependencyBuild): boolean {
  return left.generation === right.generation && left.slot === right.slot
    && left.revision === right.revision && left.sequence === right.sequence;
}
/** Exact UTF-8 sizes bound JSON storage, including escape expansion rather than UTF-16 estimates. */
function encodedBytes(text: string): number { return new TextEncoder().encode(text).byteLength; }
/** Stable local map keys never contain producer-controlled delimiters. */
function memoryKey(family: SourceFamily, index: number): string { return JSON.stringify([family, index]); }
/** Read one request without changing the transaction's error/cancellation ownership. */
function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new SourceFactError("read-error"));
  });
}
/** Safely read untrusted stored data without propagating an IndexedDB any type into a codec. */
function unknownValue(request: IDBRequest): Promise<unknown> { return requestValue<unknown>(request); }
/** Match an expected head without reading timestamps as a total order across writers. */
function expectedHeadMatches(expected: SourceHeadExpectation, raw: unknown): boolean {
  if (expected.kind === "missing") return raw === undefined;
  if (expected.kind === "unavailable") return false;
  const head = decodeSourceHead(raw);
  if (expected.kind === "invalid") return raw !== undefined && head === null;
  return head !== null && head.sourceRevision === expected.revision && head.sequence === expected.sequence;
}
/** Construct the only supported expectation from a trusted head or a known catalog failure. */
function expectation(raw: unknown): SourceHeadExpectation {
  if (raw === undefined) return { kind: "missing" };
  const head = decodeSourceHead(raw);
  return head ? { kind: "head", revision: head.sourceRevision, sequence: head.sequence } : { kind: "invalid" };
}
/** Compare regenerated postings field by field, independent of persisted object key order. */
function samePosting(left: SourcePosting, right: SourcePosting): boolean {
  return left.sourceId === right.sourceId && left.revision === right.revision && left.family === right.family
    && left.index === right.index && left.kind === right.kind && left.key === right.key;
}
/** Classify storage failures without retaining the exception message, which can contain source data. */
function errorReason(error: unknown, fallback: SourceReason): SourceReason {
  if (error instanceof SourceFactError) return error.reason;
  return error instanceof DOMException && error.name === "QuotaExceededError" ? "quota-exceeded" : fallback;
}
/** Produce bounded posting batches deterministically from a chunk, including its family membership. */
function* postingBatches(sourceId: string, revision: string, family: SourceFamily, records: readonly StoredSourceFact[], start: number): IterableIterator<SourcePosting[]> {
  let batch: SourcePosting[] = []; let bytes = 2; let index = start;
  /** Generate the exact dependency sequence, never configured or currently visible contributions. */
  function* dependencies(): IterableIterator<{ kind: SourcePostingKind; key: string }> {
    if (start === 0) yield { kind: "family", key: family };
    for (const record of records) yield* sourcePostingKeys(record);
  }
  for (const dependency of dependencies()) {
    const posting: SourcePosting = { sourceId, revision, family, index: index++, ...dependency };
    const size = encodedBytes(JSON.stringify(posting)) + 1;
    if (size > SOURCE_MAX_RECORD_BYTES) throw new SourceFactError("decode-budget", family);
    if (batch.length && (bytes + size > SOURCE_CHUNK_TARGET_BYTES || batch.length >= SOURCE_MAX_BATCH_RECORDS)) { yield batch; batch = []; bytes = 2; }
    batch.push(posting); bytes += size;
    if (bytes >= SOURCE_CHUNK_TARGET_BYTES) { yield batch; batch = []; bytes = 2; }
  }
  if (batch.length) yield batch;
}

/**
 * Settings-neutral source store with at most two active source lanes and one replaceable pending
 * writer per lane. Callers producing multiple files await each result; excess independent writers
 * get explicit backpressure instead of growing an unbounded queue.
 */
export class NeutralSourceRepository {
  private closed = false;
  private owner = "";
  private ticket = 0;
  private readonly lanes = new Map<string, SourceWriteLane>();
  private readonly transactions = new Map<IDBTransaction, string>();
  /** In-process guard: a durable staging marker owned by this process must not be reclaimed by a concurrent inventory pass. */
  private readonly localStaging = new Map<string, string>();
  private readonly cancelledTransactions = new WeakSet<IDBTransaction>();
  private readonly readers = new Set<SourceView>();
  private readonly memory = new Map<string, MemorySource>();
  private readonly unsaved = new Set<string>();
  private readonly pendingDeletes = new Map<string, PendingSourceDeletion>();
  private deleteTask: Promise<SourceWriteResult> | null = null;
  private readonly knownHeads = new Map<string, number>();
  private memoryBytes = 0;
  private retryTimer: number | null = null;
  private retryFailures = 0;
  private retryTask: Promise<void> | null = null;
  private decodeBytes = 0;
  private impactReadReservations = 0;
  private readonly impactReaders = new Map<string, { db: IDBDatabase; lease: ContributorRootLease | null;
    active: boolean; release?: Promise<void> }>();
  private hostChange: ContributorHostChange | null = null;
  private hostJournalTask: Promise<SourceReason> | null = null;
  private diagnostics = sanitizeSourceRepositoryDiagnostics(null);

  /** Keep connection/runtime effects injected; construction does not open storage or start work. */
  constructor(private readonly storage: SourceStorage, private readonly runtime: SourceRepositoryRuntime = sourceRepositoryRuntime()) {
    // Allocate the session token lazily, so graph/body-only users do not require crypto at construction.
  }
  /** Copy allowlisted aggregate state, never heads, exceptions, paths or reference values. */
  getDiagnostics(): SourceRepositoryDiagnostics {
    return sanitizeSourceRepositoryDiagnostics({ ...this.diagnostics, activated: this.knownHeads.size, unsaved: this.unsaved.size });
  }
  /** Reject local writes/evictions before consulting a disk-only closed-world certificate. */
  private dependencyAvailable(current: () => boolean): void {
    if (this.closed || !current()) throw new SourceFactError("cancelled");
    if (this.unsaved.size || this.pendingDeletes.size) throw new SourceFactError("unsaved");
    if (this.lanes.size || this.deleteTask || this.hostChange || this.hostJournalTask) throw new SourceFactError("dependency-pending");
  }
  /** Source-local dependency closure follows source activation, not the legacy global catalog journal. */
  private localDependencyAvailable(current: () => boolean): void {
    if (this.closed || !current()) throw new SourceFactError("cancelled");
    if (this.unsaved.size || this.pendingDeletes.size) throw new SourceFactError("unsaved");
    if (this.lanes.size || this.deleteTask) throw new SourceFactError("dependency-pending");
  }
  /** Read the independent mutation fence and head sequence within the caller's IDB transaction. */
  private async dependencyControl(transaction: IDBTransaction): Promise<SourceDependencyState & { sequence: number }> {
    const meta = transaction.objectStore(META_STORE);
    const [state, sequence] = await Promise.all([
      unknownValue(meta.get(SOURCE_DEPENDENCY_STATE_KEY)), unknownValue(meta.get(SOURCE_SEQUENCE_KEY)),
    ]);
    if (!validSourceDependencyState(state)) throw new SourceFactError("dependency-invalid");
    if (sequence !== undefined && (!sourceObject(sequence) || sequence.key !== SOURCE_SEQUENCE_KEY
      || !sourceCount(sequence.value) || Object.keys(sequence).length !== 2)) throw new SourceFactError("dependency-invalid");
    return { ...state, sequence: sourceObject(sequence) && sourceCount(sequence.value) ? sequence.value : 0 };
  }
  /**
   * Retain the original root/summary pages and selected head in the SAME transaction that raises
   * the dirty fence. A repeated writer changes only its ticket and immediate predecessor, never
   * its original anchor. No-root initial acquisition still follows C1; there is no catalog to lose.
   */
  private async journalMutation(transaction: IDBTransaction, subject: ContributorJournalOwner, ticket: string,
    change: ContributorHostChange | null = null): Promise<ContributorJournalRecord | null> {
    const store = transaction.objectStore(SOURCE_IMPACT_STORE), owner = contributorJournalKey(subject);
    const [previous, rawRoot, rawHead, enabled] = await Promise.all([
      unknownValue(store.get(owner)), unknownValue(transaction.objectStore(META_STORE).get(SOURCE_DEPENDENCY_ROOT_KEY)),
      subject.kind === "source" ? unknownValue(transaction.objectStore(SOURCE_HEAD_STORE).get(subject.sourceId)) : Promise.resolve(undefined),
      unknownValue(transaction.objectStore(META_STORE).get(SOURCE_IMPACT_ENABLED_KEY)),
    ]);
    if (previous === undefined && rawRoot === undefined && enabled === undefined) return null;
    transaction.objectStore(META_STORE).put({ key: SOURCE_IMPACT_ENABLED_KEY, version: 1 });
    const prior = validContributorJournalRecord(previous) ? previous : null;
    // Corrupt prior evidence cannot be replaced by a conveniently narrower, apparently clean anchor.
    let root = prior?.root ?? null;
    if (previous === undefined && validSourceDependencyRoot(rawRoot)) {
      root = { build: { ...rawRoot.build }, digest: rawRoot.digest };
      const meta = transaction.objectStore(META_STORE), key = SOURCE_IMPACT_ROOT_PREFIX + rawRoot.build.slot;
      // Never overwrite an existing shared anchor with a different commitment. Slot reuse
      // deletes it only after checking all journal and reader pins. Reads authenticate its digest.
      if (await unknownValue(meta.get(key)) === undefined) meta.put({ key, root: rawRoot });
    }
    const before = contributorJournalSelection(rawHead);
    const record: ContributorJournalRecord = { version: 1, owner, subject, ticket, root, slot: root?.build.slot ?? -1,
      original: prior ? prior.original : previous === undefined ? before : { kind: "invalid" }, before,
      selected: subject.kind === "host" ? { kind: "missing" } : null, change, status: "unknown", impact: null };
    this.checkJournalSize(record);
    store.put(record);
    return record;
  }
  /** Bound retained proof bytes before enqueueing an IDB structured clone; never truncate an owner. */
  private checkJournalSize(record: ContributorJournalRecord): void {
    if (!validContributorJournalRecord(record)) throw new SourceFactError("dependency-invalid");
    if (encodedBytes(JSON.stringify(record)) > SOURCE_IMPACT_RECORD_BYTES) throw new SourceFactError("backpressure");
  }
  /** Register an unsettled source before staging; journal failure prohibits a new durable head. */
  private async beginDependencyMutation(db: IDBDatabase, sourceId: string, current: () => boolean): Promise<string> {
    return this.transaction(db, [META_STORE, SOURCE_HEAD_STORE, SOURCE_IMPACT_STORE], "readwrite", sourceId, async (transaction) => {
      const meta = transaction.objectStore(META_STORE), raw = await unknownValue(meta.get(SOURCE_DEPENDENCY_STATE_KEY));
      if (!validSourceDependencyState(raw) || raw.revision >= Number.MAX_SAFE_INTEGER || raw.dirty >= Number.MAX_SAFE_INTEGER) throw new SourceFactError("dependency-invalid");
      const key = `source-dependency-dirty:${JSON.stringify(sourceId)}`, previous = await unknownValue(meta.get(key));
      if (previous !== undefined && (!sourceObject(previous) || previous.key !== key || typeof previous.ticket !== "string" || Object.keys(previous).length !== 2)) throw new SourceFactError("dependency-invalid");
      const ticket = this.runtime.uniqueId();
      await this.journalMutation(transaction, { kind: "source", sourceId }, ticket);
      if (!current() || this.closed) throw new SourceFactError("cancelled");
      meta.put({ key, ticket });
      meta.put(sourceDependencyState(raw.revision + 1, raw.dirty + (previous === undefined ? 1 : 0)));
      return ticket;
    });
  }
  /**
   * Select the new head and an explicit UNKNOWN repair state atomically. Only the exact writer may
   * settle C1's staging fence; the impact ticket survives, including an unchanged membership set.
   */
  private async finishDependencyMutation(transaction: IDBTransaction, sourceId: string, selected: ContributorJournalSelection,
    ticket?: string): Promise<void> {
    const meta = transaction.objectStore(META_STORE), store = transaction.objectStore(SOURCE_IMPACT_STORE);
    const key = `source-dependency-dirty:${JSON.stringify(sourceId)}`;
    const [raw, dirty, journal] = await Promise.all([unknownValue(meta.get(SOURCE_DEPENDENCY_STATE_KEY)),
      unknownValue(meta.get(key)), unknownValue(store.get(contributorJournalKey({ kind: "source", sourceId })))]);
    if (!validSourceDependencyState(raw) || raw.revision >= Number.MAX_SAFE_INTEGER) throw new SourceFactError("dependency-invalid");
    const owned = ticket !== undefined && sourceObject(dirty) && dirty.key === key && dirty.ticket === ticket && Object.keys(dirty).length === 2;
    if (dirty !== undefined && !owned) throw new SourceFactError("superseded");
    let repair: ContributorJournalRecord | null;
    if (journal !== undefined) {
      if (!validContributorJournalRecord(journal)) throw new SourceFactError("dependency-invalid");
      if (journal.ticket !== ticket || journal.selected !== null) throw new SourceFactError("superseded");
      const before = contributorJournalSelection(await unknownValue(transaction.objectStore(SOURCE_HEAD_STORE).get(sourceId)));
      if (!sameContributorSelection(journal.before, before)) throw new SourceFactError("superseded");
      repair = journal;
    } else {
      // Storage recovery can arrive without the earlier begin transaction. The activation itself
      // must retain a root/head anchor rather than exposing a head/root gap as a clean selection.
      repair = await this.journalMutation(transaction, { kind: "source", sourceId }, ticket ?? this.runtime.uniqueId());
    }
    if (repair) { const next = { ...repair, selected }; this.checkJournalSize(next); store.put(next); }
    else meta.delete(SOURCE_DEPENDENCY_ROOT_KEY);
    if (owned && raw.dirty === 0) throw new SourceFactError("dependency-invalid");
    if (owned) meta.delete(key);
    meta.put(sourceDependencyState(raw.revision + 1, raw.dirty - (owned ? 1 : 0)));
  }
  /** Verify staging ownership and both global fences before every bounded catalog write/cleanup. */
  private async dependencyBuildCurrent(transaction: IDBTransaction, build: SourceDependencyBuild): Promise<void> {
    const control = await this.dependencyControl(transaction);
    const raw = await unknownValue(transaction.objectStore(META_STORE).get(SOURCE_DEPENDENCY_BUILD_KEY));
    if (control.dirty || control.revision !== build.revision || control.sequence !== build.sequence
      || !sourceObject(raw) || raw.key !== SOURCE_DEPENDENCY_BUILD_KEY || Object.keys(raw).length !== 2
      || !validSourceDependencyBuild(raw.build) || !sameDependencyBuild(raw.build, build)) throw new SourceFactError("superseded");
  }
  /**
   * Begin an explicit catalog rebuild in the other of two reusable slots. A later builder can
   * supersede an interrupted one; each cleanup/write checks its generation in the same transaction.
   * This is never called implicitly by a query and never touches source chunks or reader leases.
   */
  async beginDependencyBuild(current: () => boolean): Promise<SourceDependencyBuild> {
    this.dependencyAvailable(current);
    const db = await this.open();
    if (!db) throw new SourceFactError("storage-unavailable");
    const build = await this.transaction(db, [META_STORE, SOURCE_IMPACT_STORE], "readwrite", "", async (transaction) => {
      this.dependencyAvailable(current);
      const control = await this.dependencyControl(transaction);
      if (control.dirty) throw new SourceFactError("dependency-pending");
      const meta = transaction.objectStore(META_STORE);
      const previous = await unknownValue(meta.get(SOURCE_DEPENDENCY_ROOT_KEY));
      const slot = validSourceDependencyRoot(previous) && previous.build.slot === 0 ? 1 : 0;
      if (await requestValue(transaction.objectStore(SOURCE_IMPACT_STORE).index(SOURCE_IMPACT_SLOT_INDEX).count(slot))
        || await requestValue(meta.index(SOURCE_IMPACT_LEASE_INDEX).count(slot))) throw new SourceFactError("backpressure");
      const build: SourceDependencyBuild = { revision: control.revision, sequence: control.sequence, slot, generation: this.runtime.uniqueId() };
      meta.delete(SOURCE_IMPACT_ROOT_PREFIX + slot);
      meta.put({ key: SOURCE_DEPENDENCY_BUILD_KEY, build });
      return build;
    });
    // A slot has a fixed maximum page count; corruption cannot turn cleanup into an unbounded loop.
    for (let removed = 0; removed <= SOURCE_DEPENDENCY_BUCKETS * SOURCE_DEPENDENCY_MAX_PAGES; removed += SOURCE_MAX_BATCH_RECORDS) {
      this.dependencyAvailable(current);
      const count = await this.transaction(db, [META_STORE, SOURCE_DEPENDENCY_STORE, SOURCE_IMPACT_STORE], "readwrite", "", async (transaction) => {
        await this.dependencyBuildCurrent(transaction, build);
        if (await requestValue(transaction.objectStore(SOURCE_IMPACT_STORE).index(SOURCE_IMPACT_SLOT_INDEX).count(build.slot))
          || await requestValue(transaction.objectStore(META_STORE).index(SOURCE_IMPACT_LEASE_INDEX).count(build.slot))) throw new SourceFactError("backpressure");
        const store = transaction.objectStore(SOURCE_DEPENDENCY_STORE);
        const range = IDBKeyRange.bound([build.slot], [build.slot + 1], false, true);
        const keys = await requestValue(store.getAllKeys(range, SOURCE_MAX_BATCH_RECORDS));
        for (const key of keys) store.delete(key);
        return keys.length;
      });
      if (!count) return build;
      await this.runtime.yield();
    }
    throw new SourceFactError("dependency-invalid");
  }
  /** Add one immutable original page; producer backpressure bounds queue depth to one transaction. */
  async putDependencyPage(build: SourceDependencyBuild, page: SourceDependencyPage, current: () => boolean): Promise<void> {
    this.dependencyAvailable(current);
    if (!validSourceDependencyPage(page) || page.slot !== build.slot || page.generation !== build.generation
      || encodedBytes(page.data) !== page.bytes) throw new SourceFactError("dependency-invalid");
    const db = await this.open();
    if (!db) throw new SourceFactError("storage-unavailable");
    await this.transaction(db, [META_STORE, SOURCE_DEPENDENCY_STORE], "readwrite", "", async (transaction) => {
      await this.dependencyBuildCurrent(transaction, build);
      this.dependencyAvailable(current);
      await requestValue(transaction.objectStore(SOURCE_DEPENDENCY_STORE).add(page));
    });
  }
  /** Seal only the fully emitted page set at the same head/mutation fence; never activate a prefix. */
  async activateDependencyBuild(root: SourceDependencyRootRecord, pages: number, current: () => boolean): Promise<void> {
    this.dependencyAvailable(current);
    if (!validSourceDependencyRoot(root) || !sourceCount(pages)
      || pages > SOURCE_DEPENDENCY_BUCKETS * SOURCE_DEPENDENCY_MAX_PAGES) throw new SourceFactError("dependency-invalid");
    const db = await this.open();
    if (!db) throw new SourceFactError("storage-unavailable");
    await this.transaction(db, [META_STORE, SOURCE_DEPENDENCY_STORE, SOURCE_IMPACT_STORE], "readwrite", "", async (transaction) => {
      await this.dependencyBuildCurrent(transaction, root.build);
      const range = IDBKeyRange.bound([root.build.slot], [root.build.slot + 1], false, true);
      if (await requestValue(transaction.objectStore(SOURCE_DEPENDENCY_STORE).count(range)) !== pages) throw new SourceFactError("dependency-invalid");
      this.dependencyAvailable(current);
      const meta = transaction.objectStore(META_STORE);
      meta.put(root); meta.delete(SOURCE_DEPENDENCY_BUILD_KEY);
      meta.put({ key: SOURCE_IMPACT_ENABLED_KEY, version: 1 });
      // A complete explicit bootstrap re-proves ALL source/host coverage at the same global CAS.
      // This is not local publication or retirement because an impact set became known.
      transaction.objectStore(SOURCE_IMPACT_STORE).clear();
    });
    this.dependencyAvailable(current);
  }
  /** Select a root and its independent source/mutation fence atomically, including certified emptiness. */
  async readDependencyRoot(current: () => boolean): Promise<SourceDependencyRootRecord> {
    this.dependencyAvailable(current);
    const db = await this.open();
    if (!db) throw new SourceFactError("storage-unavailable");
    const root = await this.transaction(db, [META_STORE, SOURCE_IMPACT_STORE], "readonly", "", async (transaction) => {
      const control = await this.dependencyControl(transaction);
      if (await requestValue(transaction.objectStore(SOURCE_IMPACT_STORE).count())) throw new SourceFactError("dependency-pending");
      if (control.dirty) throw new SourceFactError("dependency-pending");
      const raw = await unknownValue(transaction.objectStore(META_STORE).get(SOURCE_DEPENDENCY_ROOT_KEY));
      if (raw === undefined) throw new SourceFactError("dependency-pending");
      if (!validSourceDependencyRoot(raw)) throw new SourceFactError("dependency-invalid");
      if (raw.build.revision !== control.revision || raw.build.sequence !== control.sequence) throw new SourceFactError("superseded");
      return raw;
    });
    this.dependencyAvailable(current);
    return root;
  }
  /** Read one bounded generation-tagged page; missing/reused slot data is never an empty bucket. */
  async readDependencyPage(build: SourceDependencyBuild, bucket: number, index: number,
    current: () => boolean): Promise<SourceDependencyPage> {
    this.dependencyAvailable(current);
    if (!sourceCount(bucket) || bucket >= SOURCE_DEPENDENCY_BUCKETS || !sourceCount(index) || index >= SOURCE_DEPENDENCY_MAX_PAGES) throw new SourceFactError("dependency-invalid");
    const db = await this.open();
    if (!db) throw new SourceFactError("storage-unavailable");
    const raw = await this.transaction(db, [SOURCE_DEPENDENCY_STORE], "readonly", "", (transaction) =>
      unknownValue(transaction.objectStore(SOURCE_DEPENDENCY_STORE).get([build.slot, bucket, index])));
    this.dependencyAvailable(current);
    if (!validSourceDependencyPage(raw) || raw.slot !== build.slot || raw.generation !== build.generation
      || raw.bucket !== bucket || raw.index !== index) throw new SourceFactError("dependency-invalid");
    return raw;
  }

  /**
   * Persist the latest host event with one active transaction and one replaceable pending value.
   * The synchronous local mask precedes every await. Events are evidence of UNKNOWN fan-out, not
   * permission to classify changed resolver or Date dependencies as an empty impact.
   */
  markContributorHostDirty(change: ContributorHostChange): Promise<SourceReason> {
    if (this.closed) return Promise.resolve("cancelled");
    if (!validContributorHostChange(change)) return Promise.resolve("dependency-invalid");
    this.hostChange = { ...change };
    return this.flushContributorHostChange();
  }
  /** Drain one bounded host observation; failures retain the latest value for the existing backoff. */
  private flushContributorHostChange(): Promise<SourceReason> {
    if (this.hostJournalTask) return this.hostJournalTask;
    const change = this.hostChange;
    if (!change || this.closed) return Promise.resolve(this.closed ? "cancelled" : "ready");
    /** A newer event may supersede this value, but can never be erased by its completion. */
    const run = async (): Promise<SourceReason> => {
      try {
        const db = await this.open();
        if (!db) return "storage-unavailable";
        await this.transaction(db, [META_STORE, SOURCE_HEAD_STORE, SOURCE_IMPACT_STORE], "readwrite", "", async (transaction) => {
          const control = await this.dependencyControl(transaction);
          if (control.revision >= Number.MAX_SAFE_INTEGER) throw new SourceFactError("dependency-invalid");
          const record = await this.journalMutation(transaction, { kind: "host", id: "catalog" }, this.runtime.uniqueId(), change);
          if (record) transaction.objectStore(META_STORE).put(sourceDependencyState(control.revision + 1, control.dirty));
        });
        if (this.hostChange === change) this.hostChange = null;
        return "ready";
      } catch (error) { return errorReason(error, "write-error"); }
    };
    const task = run(); this.hostJournalTask = task;
    void task.finally(() => {
      if (this.hostJournalTask === task) this.hostJournalTask = null;
      if (this.hostChange) this.scheduleRetry();
    });
    return task;
  }
  /** Enumerate only dirty owner IDs after reopen; never scan unchanged source heads or families. */
  async contributorJournalOwners(after: string | null = null, limit = 64): Promise<readonly string[]> {
    if (!sourceCount(limit) || limit < 1 || limit > 64) throw new SourceFactError("backpressure");
    const db = await this.open(); if (!db) throw new SourceFactError("storage-unavailable");
    const keys = await this.transaction(db, [SOURCE_IMPACT_STORE], "readonly", "", (transaction) =>
      requestValue(transaction.objectStore(SOURCE_IMPACT_STORE).getAllKeys(after === null ? undefined : IDBKeyRange.lowerBound(after, true), limit)));
    const result: string[] = []; let reserved = 0;
    for (const key of keys) {
      if (typeof key !== "string") throw new SourceFactError("dependency-invalid");
      reserved += key.length * 2 + 64;
      if (reserved > SOURCE_DECODE_BUDGET_BYTES) throw new SourceFactError("backpressure");
      result.push(key);
    }
    return result;
  }
  /** Read a detached repair envelope, including pending writes. This grants no source/query authority. */
  async readContributorJournal(owner: ContributorJournalOwner): Promise<ContributorJournalRecord | null> {
    const db = await this.open(); if (!db) throw new SourceFactError("storage-unavailable");
    return this.transaction(db, [SOURCE_IMPACT_STORE], "readonly", "", async (transaction) => {
      const raw = await unknownValue(transaction.objectStore(SOURCE_IMPACT_STORE).get(contributorJournalKey(owner)));
      if (raw === undefined) return null;
      if (!validContributorJournalRecord(raw)) throw new SourceFactError("dependency-invalid");
      this.checkJournalSize(raw);
      return raw;
    });
  }
  /** Fail an awaited repair when any selection coordinate, newer writer or local lifetime changed. */
  private async checkContributorJournal(transaction: IDBTransaction, record: ContributorJournalRecord,
    current: () => boolean): Promise<void> {
    if (this.closed || !current()) throw new SourceFactError("cancelled");
    const raw = await unknownValue(transaction.objectStore(SOURCE_IMPACT_STORE).get(record.owner));
    if (!validContributorJournalRecord(raw) || raw.ticket !== record.ticket
      || contributorJournalAuthority(raw) !== contributorJournalAuthority(record)) throw new SourceFactError("superseded");
    if (!current() || this.closed) throw new SourceFactError("cancelled");
  }
  /**
   * Hold a persistent root-slot lease across authenticated historical page reads and impact work.
   * Each page and terminal result rechecks the exact ticket; full bootstrap or a newer writer may
   * supersede it but cannot reclaim a leased slot. Page capabilities expire before retirement.
   * A failed cleanup retains its ticket for bounded retry; it never expires an active reader.
   */
  async withContributorJournal<T>(owner: ContributorJournalOwner, current: () => boolean,
    consume: (reader: ContributorJournalReader) => Promise<T>): Promise<T> {
    if (this.impactReadReservations >= 2) throw new SourceFactError("backpressure");
    this.impactReadReservations++;
    try {
      await this.retryRetiredContributorLeases();
      const db = await this.open(); if (!db) throw new SourceFactError("storage-unavailable");
      // Active and unreleased retired pins share one bound. Failure must not accumulate a queue.
      if (this.impactReaders.size >= 2) throw new SourceFactError("backpressure");
      const key = `source-impact-lease:${this.runtime.uniqueId()}`;
      const pin: { db: IDBDatabase; lease: ContributorRootLease | null; active: boolean; release?: Promise<void> }
        = { db, lease: null, active: true };
      this.impactReaders.set(key, pin);
      /** Escaped page callbacks cannot outlive their lease, even if the host stays unchanged. */
      const readable = (): boolean => pin.active && !this.closed && current();
      try {
        const selected = await this.transaction(db, [META_STORE, SOURCE_IMPACT_STORE], "readwrite", "", async (transaction) => {
          const record = await unknownValue(transaction.objectStore(SOURCE_IMPACT_STORE).get(contributorJournalKey(owner)));
          if (!validContributorJournalRecord(record)) throw new SourceFactError(record === undefined ? "missing" : "dependency-invalid");
          this.checkJournalSize(record);
          if (!current() || this.closed) throw new SourceFactError("cancelled");
          const fence = await this.dependencyControl(transaction);
          let root: SourceDependencyRootRecord | null = null;
          if (record.root) {
            const anchor = await unknownValue(transaction.objectStore(META_STORE).get(SOURCE_IMPACT_ROOT_PREFIX + record.slot));
            if (!sourceObject(anchor) || Object.keys(anchor).length !== 2 || anchor.key !== SOURCE_IMPACT_ROOT_PREFIX + record.slot
              || !validSourceDependencyRoot(anchor.root) || anchor.root.digest !== record.root.digest
              || !sameDependencyBuild(anchor.root.build, record.root.build)) throw new SourceFactError("dependency-invalid");
            root = anchor.root;
          }
          pin.lease = { key, impactSlot: record.slot };
          transaction.objectStore(META_STORE).put(pin.lease);
          return { record, root, fence: { revision: fence.revision, sequence: fence.sequence } };
        });
        // Keep private coordinates separate from values passed to a caller that could mutate them.
        const copy: unknown = JSON.parse(JSON.stringify(selected.record));
        if (!validContributorJournalRecord(copy)) throw new SourceFactError("dependency-invalid");
        const value = await consume({ record: copy, root: selected.root ? { ...selected.root, build: { ...selected.root.build } } : null,
          fence: { ...selected.fence },
          /** Historical pages are available only under this retained ticket, not a public root bypass. */
          page: async (bucket, index) => {
            if (!readable()) throw new SourceFactError("cancelled");
            const root = selected.root;
            if (!root || !sourceCount(bucket) || bucket >= SOURCE_DEPENDENCY_BUCKETS
              || !sourceCount(index) || index >= SOURCE_DEPENDENCY_MAX_PAGES) throw new SourceFactError("dependency-invalid");
            const page = await this.transaction(db, [SOURCE_IMPACT_STORE, SOURCE_DEPENDENCY_STORE], "readonly", "", async (transaction) => {
              await this.checkContributorJournal(transaction, selected.record, readable);
              const raw = await unknownValue(transaction.objectStore(SOURCE_DEPENDENCY_STORE).get([root.build.slot, bucket, index]));
              if (!validSourceDependencyPage(raw) || raw.generation !== root.build.generation || raw.slot !== root.build.slot
                || raw.bucket !== bucket || raw.index !== index) throw new SourceFactError("dependency-invalid");
              if (!readable()) throw new SourceFactError("cancelled");
              return raw;
            });
            if (!readable()) throw new SourceFactError("cancelled");
            return page;
          },
        });
        pin.active = false;
        await this.releaseImpactLease(key);
        await this.transaction(db, [SOURCE_IMPACT_STORE], "readonly", "", (transaction) => this.checkContributorJournal(transaction, selected.record, current));
        return value;
      } finally {
        if (pin.active) { pin.active = false; await this.releaseImpactLease(key); }
        else if (pin.release) await pin.release;
      }
    } finally { this.impactReadReservations--; }
  }
  /**
   * Retire only an ended reader. Try its original handle first, then one cleanup-only reopen.
   * Failure retains the exact ticket; no error/abort callback may masquerade as successful cleanup.
   */
  private releaseImpactLease(key: string): Promise<void> {
    const reader = this.impactReaders.get(key);
    if (!reader || reader.active) return Promise.resolve();
    if (reader.release) return reader.release;
    reader.release = (/** Keep the retired pin registered until storage acknowledges its removal. */ async () => {
      const lease = reader.lease;
      let released = lease === null;
      if (lease) {
        released = await releaseContributorRootLease(reader.db, lease, this.runtime);
        if (!released && this.storage.releaseContributorLease) {
          try { released = await this.storage.releaseContributorLease(lease); } catch { /* Keep retry ownership. */ }
        }
      }
      if (released) this.impactReaders.delete(key);
    })().finally(/** A failed attempt remains retryable at the next explicit storage boundary. */ () => { reader.release = undefined; });
    return reader.release;
  }
  /**
   * Retry at most two ended readers, never active or foreign leases. Explicit flush and the next
   * journal read drive recovery after storage returns; no timer guesses whether a reader is alive.
   */
  async retryRetiredContributorLeases(): Promise<boolean> {
    // Snapshot the bounded queue: concurrent retirements cannot extend this attempt indefinitely.
    const retired = [...this.impactReaders].filter(/** Never borrow another reader's active lifetime. */ ([, reader]) => !reader.active);
    for (const [key] of retired) await this.releaseImpactLease(key);
    for (const reader of this.impactReaders.values()) if (!reader.active) return false;
    return true;
  }
  /** An observed host transition has no complete fan-out certificate in S2; it must stay UNKNOWN. */
  private async requireUnchangedContributorHost(transaction: IDBTransaction): Promise<void> {
    const host = await unknownValue(transaction.objectStore(SOURCE_IMPACT_STORE).get(contributorJournalKey({ kind: "host", id: "catalog" })));
    if (host !== undefined) throw new SourceFactError("host-catalog-stale");
  }
  /** Validate a stored impact against the selected head and all current mutation fences, without writes. */
  async validateContributorImpact(reader: ContributorJournalReader, current: () => boolean): Promise<void> {
    this.dependencyAvailable(current);
    const db = await this.open(); if (!db) throw new SourceFactError("storage-unavailable");
    await this.transaction(db, [SOURCE_IMPACT_STORE, SOURCE_HEAD_STORE, META_STORE], "readonly", "", async (transaction) => {
      await this.checkContributorJournal(transaction, reader.record, current);
      await this.requireUnchangedContributorHost(transaction);
      const control = await this.dependencyControl(transaction), record = reader.record;
      if (control.dirty || control.revision !== reader.fence.revision || control.sequence !== reader.fence.sequence
        || record.subject.kind !== "source" || !record.selected) throw new SourceFactError("superseded");
      const head = contributorJournalSelection(await unknownValue(transaction.objectStore(SOURCE_HEAD_STORE).get(record.subject.sourceId)));
      if (!sameContributorSelection(head, record.selected)) throw new SourceFactError("superseded");
      this.dependencyAvailable(current);
    });
    this.dependencyAvailable(current);
  }
  /**
   * Persist a copied impact ONLY at the captured ticket/head/root/global transition fence. Hashing
   * and host work have already completed. Known does not select a root or remove any dirty ticket.
   */
  async storeContributorImpact(reader: ContributorJournalReader, data: string, current: () => boolean): Promise<void> {
    this.dependencyAvailable(current);
    if (encodedBytes(data) > SOURCE_IMPACT_DATA_BYTES) throw new SourceFactError("backpressure");
    const digest = await this.runtime.digest(data), db = await this.open();
    if (!db) throw new SourceFactError("storage-unavailable");
    const record = reader.record, next: ContributorJournalRecord = { ...record, status: "known", impact: { data, digest } };
    this.checkJournalSize(next);
    await this.transaction(db, [SOURCE_IMPACT_STORE, SOURCE_HEAD_STORE, META_STORE], "readwrite", "", async (transaction) => {
      this.dependencyAvailable(current);
      await this.checkContributorJournal(transaction, record, current);
      await this.requireUnchangedContributorHost(transaction);
      const stored = await unknownValue(transaction.objectStore(SOURCE_IMPACT_STORE).get(record.owner));
      if (validContributorJournalRecord(stored) && stored.status === "known" && stored.impact?.digest !== digest) throw new SourceFactError("superseded");
      const control = await this.dependencyControl(transaction);
      if (control.dirty || control.revision !== reader.fence.revision || control.sequence !== reader.fence.sequence
        || record.subject.kind !== "source" || record.selected === null) throw new SourceFactError("superseded");
      const head = contributorJournalSelection(await unknownValue(transaction.objectStore(SOURCE_HEAD_STORE).get(record.subject.sourceId)));
      if (!sameContributorSelection(head, record.selected)) throw new SourceFactError("superseded");
      this.dependencyAvailable(current);
      transaction.objectStore(SOURCE_IMPACT_STORE).put(next);
    });
    this.dependencyAvailable(current);
  }
  /** Hash a narrow host observation descriptor without exposing its settings/property text in a head. */
  async observationDigest(value: string): Promise<string> { return this.runtime.digest(value); }
  /** Allocate an opaque source incarnation; the Obsidian adapter alone binds it to a physical file. */
  createIdentity(): string { return this.runtime.uniqueId(); }
  /** Invalidate active/pending work synchronously, including an activation transaction awaiting commit. */
  cancelSource(sourceId: string): void {
    const lane = this.lanes.get(sourceId);
    if (lane) {
      lane.ticket = ++this.ticket;
      lane.pending?.resolve(this.result("cancelled", "cancelled"));
      lane.pending = undefined;
    }
    for (const [transaction, owner] of this.transactions) if (owner === sourceId) {
      this.cancelledTransactions.add(transaction);
      try { transaction.abort(); } catch { /* A completed disk activation cannot be retracted. */ }
    }
  }
  /** Unload never claims to await a last flush. Abort all outstanding work and stop bounded retries. */
  close(): void {
    this.closed = true;
    if (this.retryTimer !== null) this.runtime.cancel(this.retryTimer);
    this.retryTimer = null;
    for (const id of this.lanes.keys()) this.cancelSource(id);
    for (const transaction of this.transactions.keys()) {
      this.cancelledTransactions.add(transaction);
      try { transaction.abort(); } catch { /* already completed */ }
    }
    // Start lease deletion synchronously, before the cache owner closes its connection. Failed
    // transactions remain conservatively protective; a clean unload must not leak healthy pins.
    for (const view of this.readers) void this.releaseLeases(view);
    for (const [key, reader] of this.impactReaders) {
      reader.active = false;
      void this.releaseImpactLease(key);
    }
    this.hostChange = null;
    this.memory.clear(); this.pendingDeletes.clear(); this.memoryBytes = 0;
  }
  /** Translate one outcome without accidentally reporting a durable sequence for memory-only facts. */
  private result(outcome: SourceWriteResult["outcome"], reason: SourceReason, sequence: number | null = null, live = false): SourceWriteResult {
    this.diagnostics.lastReason = reason;
    return { outcome, reason, sequence, live };
  }
  /** Record only finite family/reason counters; corruption never clears another source's head. */
  private fail(reason: SourceReason, family?: SourceFamily): SourceReason {
    this.diagnostics.lastReason = reason;
    this.diagnostics.readFailures += 1;
    if (family) this.diagnostics.familyFailures[family] += 1;
    return reason;
  }
  /** Open through the shared owner and accurately distinguish unavailable storage from an empty DB. */
  private async open(): Promise<IDBDatabase | null> {
    if (this.closed) return null;
    this.owner ||= this.runtime.uniqueId();
    const db = await this.storage.open();
    if (this.closed) return null;
    this.diagnostics.storage = db ? "available" : "unavailable";
    if (!db) this.diagnostics.lastReason = this.storage.unavailableReason?.() ?? "storage-unavailable";
    return db;
  }
  /**
   * Own a bounded transaction, aborting timeouts and surfacing only stable errors. The callback may
   * await IDB requests, but never timers, hashing or host work (which would auto-close the transaction).
   */
  private async transaction<T>(db: IDBDatabase, stores: string[], mode: IDBTransactionMode, sourceId: string,
    work: (transaction: IDBTransaction) => Promise<T> | T): Promise<T> {
    if (this.closed) throw new SourceFactError("cancelled");
    let transaction: IDBTransaction | undefined;
    let timer: number | null = null;
    try {
      transaction = db.transaction(stores, mode);
      const active = transaction;
      this.transactions.set(active, sourceId);
      const done = new Promise<void>((resolve, reject) => {
        active.oncomplete = () => resolve();
        active.onabort = () => reject(this.closed || this.cancelledTransactions.has(active)
          ? new SourceFactError("cancelled") : active.error ?? new SourceFactError(mode === "readonly" ? "read-error" : "write-error"));
        active.onerror = () => reject(active.error ?? new SourceFactError("write-error"));
        timer = this.runtime.schedule(() => {
          try { active.abort(); } catch { /* It may already have completed before this task ran. */ }
          reject(new SourceFactError(mode === "readonly" ? "read-error" : "write-error"));
        }, TRANSACTION_TIMEOUT_MS);
      });
      // Attach both handlers immediately; request failure and transaction abort can otherwise race
      // into an unhandled rejection before the caller reaches the second await.
      const [result] = await Promise.all([Promise.resolve().then(() => work(active)), done]);
      return result;
    } catch (error) {
      try { transaction?.abort(); } catch { /* idempotent failure/cancellation */ }
      if (!(error instanceof SourceFactError) || error.reason === "read-error" || error.reason === "write-error") {
        this.storage.failed(db, error); this.diagnostics.storage = "unavailable";
      }
      throw error;
    } finally {
      if (timer !== null) this.runtime.cancel(timer);
      if (transaction) this.transactions.delete(transaction);
    }
  }
  /**
   * Record and select a head plus persistent reader leases atomically against concurrent cleanup.
   * Only the current deletion capability may inspect a masked disk head for a tombstone CAS. It
   * does not unmask that head for readers; includeTombstone alone never grants this authority.
   */
  private async pin(sourceId: string, includeTombstone = false, deletion?: PendingSourceDeletion): Promise<{ view: SourceView | null; expected: SourceHeadExpectation; reason: SourceReason }> {
    /** Match this request by identity after every asynchronous boundary; retention is not authority. */
    const deleting = (): boolean => deletion !== undefined && this.pendingDeletes.get(sourceId) === deletion
      && deletion.current() && !this.closed;
    if (deletion && !deleting()) return { view: null, expected: { kind: "unavailable" }, reason: "cancelled" };
    if (this.pendingDeletes.has(sourceId) && !includeTombstone) return { view: null, expected: { kind: "unavailable" }, reason: "tombstone" };
    const memory = this.memory.get(sourceId);
    if (memory?.head.state === "tombstone" && !includeTombstone) return { view: null, expected: memory.expected, reason: "tombstone" };
    if (memory && (includeTombstone || memory.head.state !== "tombstone")) {
      const reason = sourceHeadReason({ ...memory.head, sequence: 1 });
      if (reason !== "ready" && !(includeTombstone && reason === "tombstone")) return { view: null, expected: memory.expected, reason };
      return { view: { head: memory.head, sequence: null, saved: false, expected: memory.expected, leases: [], memory }, expected: memory.expected, reason: "ready" };
    }
    // An unsaved source whose bounded memory payload was evicted must mask its older disk head.
    // The acquisition owner can rebuild that one source from its body cache on a later inventory
    // pass, but no reader may mistake the previous durable revision for the current source.
    if (this.unsaved.has(sourceId) && !deleting()) return { view: null, expected: { kind: "unavailable" }, reason: "unsaved" };
    const db = await this.open();
    if (!db) return { view: null, expected: { kind: "unavailable" }, reason: this.storage.unavailableReason?.() ?? "storage-unavailable" };
    let leased: SourceView | undefined;
    try {
      const selected = await this.transaction(db, [SOURCE_HEAD_STORE, META_STORE], "readwrite", sourceId, async (transaction) => {
        if (deletion && !deleting()) throw new SourceFactError("cancelled");
        const raw = await unknownValue(transaction.objectStore(SOURCE_HEAD_STORE).get(sourceId));
        if (deletion && !deleting()) throw new SourceFactError("cancelled");
        const expected = expectation(raw); const reason = sourceHeadReason(raw); const head = decodeSourceHead(raw);
        if (!head || head.sourceId !== sourceId || head.state === "tombstone" && !includeTombstone) return { view: null, expected, reason: head?.sourceId !== sourceId && head ? "invalid-head" as const : reason };
        const leases: string[] = [];
        for (const revision of new Set(Object.values(head.families).map((family) => family.revision))) {
          const lease: SourceLease = { key: `source-lease:${this.runtime.uniqueId()}`, sourceId, revision, owner: this.owner };
          transaction.objectStore(META_STORE).add(lease); leases.push(lease.key);
        }
        leased = { head, sequence: head.sequence, saved: true, expected, leases, connection: db };
        // Register before commit completion: unload may run before the pin promise resumes.
        this.readers.add(leased);
        return { view: leased, expected, reason };
      });
      if (selected.view && this.closed) void this.releaseLeases(selected.view);
      return selected;
    } catch (error) {
      if (leased) await this.releaseLeases(leased);
      return { view: null, expected: { kind: "unavailable" }, reason: this.fail(errorReason(error, "read-error")) };
    }
  }
  /** Delete only this reader's leases using its original connection, including during unload. */
  private releaseLeases(view: SourceView): Promise<void> {
    if (view.release) return view.release;
    this.readers.delete(view);
    if (!view.leases.length || !view.connection) return Promise.resolve();
    const leases = view.leases.splice(0);
    try {
      const transaction = view.connection.transaction([META_STORE], "readwrite");
      for (const key of leases) transaction.objectStore(META_STORE).delete(key);
      view.release = new Promise<void>((resolve) => {
        const timer = this.runtime.schedule(() => {
          try { transaction.abort(); } catch { /* already terminal */ }
          resolve();
        }, TRANSACTION_TIMEOUT_MS);
        /** Release failures leave conservative leases, never permission to delete a live revision. */
        const finish = (): void => { this.runtime.cancel(timer); resolve(); };
        transaction.oncomplete = finish;
        transaction.onabort = transaction.onerror = finish;
      });
      return view.release;
    } catch { return Promise.resolve(); }
  }
  /** Always release the selected lifetime, independent of caller cancellation or repository close. */
  private async unpin(view: SourceView): Promise<void> { await this.releaseLeases(view); }

  /** Recheck an immutable selection against its current memory overlay or exact durable head. */
  async selectionReason(stamp: SelectedSourceStamp, current: () => boolean = () => true): Promise<SourceReason> {
    if (this.closed || !current()) return "cancelled";
    const id = stamp.head.sourceId;
    if (this.pendingDeletes.has(id)) return "tombstone";
    const memory = this.memory.get(id);
    if (memory) return memory.head === stamp.head && memory.current() ? "ready" : "superseded";
    if (this.unsaved.has(id)) return "unsaved";
    if (!stamp.saved || stamp.sequence === null) return "superseded";
    const db = await this.open();
    if (this.closed || !current()) return "cancelled";
    if (!db) return this.storage.unavailableReason?.() ?? "storage-unavailable";
    try {
      const raw = await this.transaction(db, [SOURCE_HEAD_STORE], "readonly", id,
        (transaction) => unknownValue(transaction.objectStore(SOURCE_HEAD_STORE).get(id)));
      if (this.closed || !current()) return "cancelled";
      if (this.memory.has(id) || this.unsaved.has(id) || this.pendingDeletes.has(id)) return "superseded";
      const reason = sourceHeadReason(raw);
      if (reason !== "ready") return reason;
      return expectedHeadMatches({ kind: "head", revision: stamp.head.sourceRevision, sequence: stamp.sequence }, raw) ? "ready" : "superseded";
    } catch (error) { return errorReason(error, "read-error"); }
  }

  /**
   * Validate a finite multi-source scope with bounded head pages under one global source-sequence
   * fence. This preserves the former all-at-once atomic meaning without a permanent 256-owner cap.
   */
  async validateSelections(stamps: readonly SelectedSourceStamp[], current: () => boolean): Promise<{ reason: SourceReason; sourceId?: string }> {
    const disk: SelectedSourceStamp[] = [];
    const localReason = (stamp: SelectedSourceStamp): SourceReason => {
      const id = stamp.head.sourceId;
      if (this.closed || !current()) return "cancelled";
      if (this.pendingDeletes.has(id)) return "tombstone";
      const memory = this.memory.get(id);
      if (memory) return memory.head === stamp.head && memory.current() ? "ready" : "superseded";
      if (this.unsaved.has(id)) return "unsaved";
      return stamp.saved && stamp.sequence !== null ? "ready" : "superseded";
    };
    for (let index = 0; index < stamps.length; index += 1) {
      const stamp = stamps[index], reason = localReason(stamp);
      if (reason !== "ready") return { reason, sourceId: stamp.head.sourceId };
      if (stamp.saved) disk.push(stamp);
      if ((index + 1) % SOURCE_MAX_BATCH_RECORDS === 0) { await this.runtime.yield(); if (!current() || this.closed) return { reason: "cancelled" }; }
    }
    if (disk.length) {
      const db = await this.open();
      if (this.closed || !current()) return { reason: "cancelled" };
      if (!db) return { reason: this.storage.unavailableReason?.() ?? "storage-unavailable" };
      try {
        const capturedSequence = await this.transaction(db, [META_STORE], "readonly", "", async (transaction) => {
          const raw = await unknownValue(transaction.objectStore(META_STORE).get(SOURCE_SEQUENCE_KEY));
          if (raw === undefined) return 0;
          if (!sourceObject(raw) || raw.key !== SOURCE_SEQUENCE_KEY || !sourceCount(raw.value)) throw new SourceFactError("catalog-uncertain");
          return raw.value;
        });
        for (let offset = 0; offset < disk.length; offset += SOURCE_MAX_BATCH_RECORDS) {
          const page = disk.slice(offset, offset + SOURCE_MAX_BATCH_RECORDS);
          const result = await this.transaction(db, [SOURCE_HEAD_STORE, META_STORE], "readonly", "", async (transaction) => {
            const rawSequence = await unknownValue(transaction.objectStore(META_STORE).get(SOURCE_SEQUENCE_KEY));
            const sequence = rawSequence === undefined ? 0 : sourceObject(rawSequence) && rawSequence.key === SOURCE_SEQUENCE_KEY
              && sourceCount(rawSequence.value) ? rawSequence.value : -1;
            if (sequence !== capturedSequence) return { reason: "superseded" as const };
            const heads = await Promise.all(page.map((stamp) => unknownValue(transaction.objectStore(SOURCE_HEAD_STORE).get(stamp.head.sourceId))));
            for (let index = 0; index < page.length; index += 1) {
              const stamp = page[index], raw = heads[index];
              const reason = sourceHeadReason(raw);
              if (reason !== "ready") return { reason, sourceId: stamp.head.sourceId };
              if (!expectedHeadMatches({ kind: "head", revision: stamp.head.sourceRevision, sequence: stamp.sequence! }, raw)) {
                return { reason: "superseded" as const, sourceId: stamp.head.sourceId };
              }
            }
            return { reason: "ready" as const };
          });
          if (result.reason !== "ready") return result;
          if (offset + SOURCE_MAX_BATCH_RECORDS < disk.length) { await this.runtime.yield(); if (!current() || this.closed) return { reason: "cancelled" }; }
        }
        const finalSequence = await this.transaction(db, [META_STORE], "readonly", "", async (transaction) => {
          const raw = await unknownValue(transaction.objectStore(META_STORE).get(SOURCE_SEQUENCE_KEY));
          return raw === undefined ? 0 : sourceObject(raw) && raw.key === SOURCE_SEQUENCE_KEY && sourceCount(raw.value) ? raw.value : -1;
        });
        if (finalSequence !== capturedSequence) return { reason: "superseded" };
      } catch (error) { return { reason: errorReason(error, "read-error") }; }
    }
    for (let index = 0; index < stamps.length; index += 1) {
      const stamp = stamps[index], reason = localReason(stamp);
      if (reason !== "ready") return { reason, sourceId: stamp.head.sourceId };
      if ((index + 1) % SOURCE_MAX_BATCH_RECORDS === 0) { await this.runtime.yield(); if (!current() || this.closed) return { reason: "cancelled" }; }
    }
    return { reason: this.closed || !current() ? "cancelled" : "ready" };
  }

  /**
   * Read any required families under ONE selected head/pin. Every callback is private and fenced;
   * family failure poisons the result even if a consumer ignores its visit return. Head/host checks
   * occur before work, between families and after work. Pins are released on every terminal path.
   */
  async readSelected<T>(sourceId: string, matches: (stamp: SelectedSourceStamp) => SourceReason,
    work: (reader: SelectedSourceReader) => Promise<T>, current: () => boolean = () => true): Promise<SelectedSourceResult<T>> {
    if (this.closed || !current()) return selectedSourceFailure("cancelled");
    const pinned = await this.pin(sourceId);
    if (!pinned.view) return selectedSourceFailure(this.closed || !current() ? "cancelled" : pinned.reason);
    const view = pinned.view;
    const stamp: SelectedSourceStamp = { head: view.head, sequence: view.sequence, saved: view.saved };
    let failure: ReturnType<typeof selectedSourceFailure> | undefined;
    let active = true;
    let released = false;
    let visiting = false;
    /** Preserve the cause of a failed fence; source replacement is not demand cancellation. */
    const localReason = (): SourceReason => {
      if (this.closed || !current()) return "cancelled";
      const matched = matches(stamp);
      if (matched !== "ready") return matched;
      if (this.pendingDeletes.has(sourceId)) return "tombstone";
      const memory = this.memory.get(sourceId);
      if (this.unsaved.has(sourceId) && !memory) return "unsaved";
      if (view.memory && memory !== view.memory || !view.memory && memory) return "superseded";
      return view.memory && !view.memory.current() ? "stale" : "ready";
    };
    /** Fence callback lifetime as well as observed source/host/policy changes. */
    const valid = (): boolean => active && localReason() === "ready";
    try {
      const matched = matches(stamp);
      if (matched !== "ready") return selectedSourceFailure(matched);
      const observedBefore = localReason();
      if (observedBefore !== "ready") return selectedSourceFailure(observedBefore);
      const initial = await this.selectionReason(stamp, valid);
      const observedInitial = localReason();
      if (observedInitial !== "ready" || initial !== "ready") return selectedSourceFailure(observedInitial === "ready" ? initial : observedInitial);
      const value = await work({ ...stamp,
        /** Serialize families so a caller cannot multiply the decoded-chunk reservation. */
        visit: async (family, consume) => {
          if (!active || failure) return "cancelled";
          if (visiting) { failure = selectedSourceFailure("invalid-frame", family); return "invalid-frame"; }
          visiting = true;
          try {
            const reason = await this.visitFamily(view, family, consume, valid);
            if (reason !== "ready") {
              const observed = localReason();
              failure = selectedSourceFailure(observed === "ready" ? reason : observed, family);
              return failure.reason;
            }
            const selected = await this.selectionReason(stamp, valid);
            const observed = localReason();
            const result = observed === "ready" ? selected : observed;
            if (result !== "ready") failure = selectedSourceFailure(result, family);
            return result;
          } finally { visiting = false; }
        },
      });
      if (failure) return failure;
      if (visiting) return selectedSourceFailure("invalid-frame");
      // Lease release itself awaits storage; validate the selection again after that await.
      await this.unpin(view);
      released = true;
      const matchedAfter = matches(stamp);
      if (matchedAfter !== "ready") return selectedSourceFailure(matchedAfter);
      const selected = await this.selectionReason(stamp, valid);
      const observedAfter = localReason();
      if (observedAfter !== "ready" || selected !== "ready") return selectedSourceFailure(observedAfter === "ready" ? selected : observedAfter);
      return { outcome: "ready", stamp, value };
    } catch (error) {
      const observed = localReason();
      return selectedSourceFailure(observed === "ready" ? errorReason(error, "invalid-frame") : observed,
        error instanceof SourceFactError ? error.family : undefined);
    } finally { active = false; if (!released) await this.unpin(view); }
  }
  /** Account for disk heads independently of graph snapshot completion and live publication. */
  private rememberDurable(head: SourceHead): void {
    if (head.state === "tombstone") { this.knownHeads.delete(head.sourceId); return; }
    this.knownHeads.set(head.sourceId, head.sequence);
    this.diagnostics.sequenceMin = this.diagnostics.sequenceMin ? Math.min(this.diagnostics.sequenceMin, head.sequence) : head.sequence;
    this.diagnostics.sequenceMax = Math.max(this.diagnostics.sequenceMax, head.sequence);
  }
  /** Reserve encoded plus decoded space; oversized chunks travel alone and never create a read queue. */
  private reserveDecode(bytes: number): () => void {
    if (bytes > SOURCE_DECODE_BUDGET_BYTES || this.decodeBytes + bytes > SOURCE_DECODE_BUDGET_BYTES) throw new SourceFactError("decode-budget");
    this.decodeBytes += bytes; this.diagnostics.peakDecodeBytes = Math.max(this.diagnostics.peakDecodeBytes, this.decodeBytes);
    return () => { this.decodeBytes -= bytes; };
  }
  /** Validate one complete immutable family with one decoded chunk at a time and regenerated postings. */
  private async visitFamily(view: SourceView, family: SourceFamily, consume: (records: readonly StoredSourceFact[]) => Promise<boolean> | boolean,
    current: () => boolean, captureChunk?: (chunk: SourceChunk, batches: SourcePosting[][]) => void): Promise<SourceReason> {
    const manifest = view.head.families[family];
    if (!manifest) return this.fail("missing-chunk", family);
    const validator: SourceFrameValidator = new SourceFrameValidator(family);
    let records = 0; let bytes = 0; let postings = 0; let digest = ""; let postingDigest = "";
    try {
      for (let index = 0; index < manifest.chunks; index += 1) {
        if (this.closed || !current()) return "cancelled";
        let raw: unknown;
        if (view.memory) raw = view.memory.chunks.get(memoryKey(family, index));
        else {
          const db = await this.open(); if (!db || !current()) return "storage-unavailable";
          raw = await this.transaction(db, [SOURCE_CHUNK_STORE], "readonly", view.head.sourceId,
            (transaction) => unknownValue(transaction.objectStore(SOURCE_CHUNK_STORE).get([view.head.sourceId, manifest.revision, family, index])));
        }
        if (!current()) return "cancelled";
        if (raw === undefined) return this.fail("missing-chunk", family);
        if (!validSourceChunk(raw) || raw.sourceId !== view.head.sourceId || raw.revision !== manifest.revision || raw.family !== family
          || raw.index !== index || raw.final !== (index === manifest.chunks - 1)) return this.fail("invalid-chunk", family);
        // Two string representations can coexist during JSON.parse; the encoded byte count alone
        // is not a safe bound for ASCII-heavy or oversized values.
        const release = this.reserveDecode(raw.data.length * 4 + raw.bytes);
        try {
          if (encodedBytes(raw.data) !== raw.bytes || await this.runtime.digest(raw.data) !== raw.digest || !current()) {
            return !current() ? "cancelled" : this.fail("invalid-chunk", family);
          }
          const decoded: unknown = JSON.parse(raw.data);
          if (!Array.isArray(decoded) || decoded.length !== raw.records) return this.fail("invalid-chunk", family);
          const facts: StoredSourceFact[] = [];
          for (const record of decoded) { validator.accept(record); facts.push(record); }
          digest = await this.runtime.digest(digest + raw.digest);
          if (!current()) return "cancelled";
          const capturedPostings: SourcePosting[][] = [];
          for (const batch of postingBatches(view.head.sourceId, manifest.revision, family, facts, postings)) {
            let stored: unknown[];
            if (view.memory) stored = batch.map((posting) => view.memory?.postings.get(memoryKey(family, posting.index)));
            else {
              const db = await this.open(); if (!db || !current()) return "storage-unavailable";
              stored = await this.transaction(db, [SOURCE_POSTING_STORE], "readonly", view.head.sourceId, (transaction) =>
                Promise.all(batch.map((posting) => unknownValue(transaction.objectStore(SOURCE_POSTING_STORE).get([posting.sourceId, posting.revision, posting.family, posting.index])))));
            }
            if (!current()) return "cancelled";
            for (let i = 0; i < batch.length; i += 1) {
              if (stored[i] === undefined) return this.fail("missing-posting", family);
              const posting = stored[i];
              if (!validSourcePosting(posting) || !samePosting(posting, batch[i])) return this.fail("invalid-posting", family);
            }
            if (captureChunk) capturedPostings.push(batch);
            postings += batch.length;
            postingDigest = await this.runtime.digest(postingDigest + JSON.stringify(batch));
            if (!current()) return "cancelled";
          }
          records += raw.records; bytes += raw.bytes;
          if (!(await consume(facts)) || !current()) return "cancelled";
          captureChunk?.(raw, capturedPostings);
        } finally { release(); }
        await this.runtime.yield();
        if (!current()) return "cancelled";
      }
      validator.finish();
      return records === manifest.records && bytes === manifest.bytes && postings === manifest.postings
        && digest === manifest.digest && postingDigest === manifest.postingDigest ? "ready" : this.fail("invalid-chunk", family);
    } catch (error) { return this.fail(errorReason(error, "invalid-chunk"), family); }
  }
  /** Inspect only requested families. An invalid host family does not discard an intact parsed body. */
  async inspect(sourceId: string, families: readonly SourceFamily[] = SOURCE_FAMILIES, current: () => boolean = () => true): Promise<SourceInspection> {
    const pinned = await this.pin(sourceId);
    if (!pinned.view) return { head: null, sequence: null, saved: false, expected: pinned.expected, reason: pinned.reason, families: {} };
    const view = pinned.view; const results: Partial<Record<SourceFamily, SourceReason>> = {};
    try {
      for (const family of families) {
        results[family] = await this.visitFamily(view, family, () => true, current);
        if (!current() || this.closed) break;
      }
      const reason = !current() || this.closed ? "cancelled" : Object.values(results).find((reason) => reason !== "ready") ?? "ready";
      if (reason !== "ready") this.knownHeads.delete(sourceId);
      else if (view.saved && view.sequence !== null && SOURCE_FAMILIES.every((family) => results[family] === "ready")) {
        this.rememberDurable({ ...view.head, sequence: view.sequence });
      }
      return { head: view.head, sequence: view.sequence, saved: view.saved, expected: view.expected, reason, families: results };
    } finally { await this.unpin(view); }
  }
  /** Capture a fresh disk CAS expectation; only a new host-fenced acquisition may adopt this. */
  async catalogExpectation(sourceId: string): Promise<SourceHeadExpectation> {
    const db = await this.open();
    if (!db) return { kind: "unavailable" };
    try {
      const raw = await this.transaction(db, [SOURCE_HEAD_STORE], "readonly", sourceId,
        (transaction) => unknownValue(transaction.objectStore(SOURCE_HEAD_STORE).get(sourceId)));
      return expectation(raw);
    } catch { return { kind: "unavailable" }; }
  }
  /** Replay one family under a reader pin; callers consume privately until the final result is ready. */
  async visit(sourceId: string, family: SourceFamily, consume: (records: readonly StoredSourceFact[]) => Promise<boolean> | boolean,
    current: () => boolean = () => true): Promise<SourceReason> {
    const pinned = await this.pin(sourceId);
    if (!pinned.view) return pinned.reason;
    try { return await this.visitFamily(pinned.view, family, consume, current); }
    finally { await this.unpin(pinned.view); }
  }
  /** Restore immutable parser inputs without reading note text or reparsing Markdown. */
  async readBody(sourceId: string, matches: (physical: SourcePhysical) => boolean, current: () => boolean = () => true,
    includeTombstone = false, settleRetirement = false): Promise<ParsedBodyMetadata | null> {
    // A rename burst can queue this owner's retained tombstone behind another deletion. Its
    // temporary unsaved mask is not a body miss. Finish that authorized retirement before reading
    // the retained immutable families; ordinary readers still cannot inspect a masked disk head.
    if (includeTombstone && settleRetirement && this.pendingDeletes.get(sourceId)?.retain) {
      if (this.deleteTask) await this.deleteTask;
      if (this.closed || !current()) return null;
      const pending = this.pendingDeletes.get(sourceId);
      if (pending?.retain) await this.tombstone(sourceId, pending.current, true, pending.ready);
      if (this.closed || !current()) return null;
    }
    const pinned = await this.pin(sourceId, includeTombstone);
    if (!pinned.view) return null;
    const view = pinned.view; const decoder = new SourceBodyDecoder();
    try {
      if (!matches(view.head.physical) || !current()) return null;
      for (const family of ["values", "body-urls"] as const) {
        const reason = await this.visitFamily(view, family, (records) => { for (const record of records) decoder.accept(record); return true; }, current);
        if (reason !== "ready") return null;
      }
      return matches(view.head.physical) && current() && !this.closed ? decoder.finish() : null;
    } catch (error) { this.fail(errorReason(error, "invalid-frame"), "values"); return null; }
    finally { await this.unpin(view); }
  }
  /** Schedule a replacement with a latest-writer fence and a bounded, replaceable pending slot. */
  replace(input: SourceReplacement, current: () => boolean = () => true): Promise<SourceWriteResult> {
    if (this.closed || !current()) return Promise.resolve(this.result("cancelled", "cancelled"));
    if (!input.sourceId || !validSourcePhysical(input.physical)) return Promise.resolve(this.result("rejected", "invalid-head"));
    this.pendingDeletes.delete(input.sourceId);
    const ticket = ++this.ticket;
    const existing = this.lanes.get(input.sourceId);
    if (!existing && this.lanes.size >= MAX_WRITERS) return Promise.resolve(this.result("rejected", "backpressure"));
    if (existing) {
      existing.ticket = ticket;
      existing.pending?.resolve(this.result("superseded", "superseded"));
      // Abort storage work as well as fencing continuations, including an in-flight head put.
      for (const [transaction, owner] of this.transactions) if (owner === input.sourceId) {
        this.cancelledTransactions.add(transaction);
        try { transaction.abort(); } catch { /* committed */ }
      }
      return new Promise((resolve) => { existing.pending = { start: () => this.write(input, () => current() && existing.ticket === ticket), resolve }; });
    }
    const lane: SourceWriteLane = { ticket, active: Promise.resolve(this.result("cancelled", "cancelled")) };
    this.lanes.set(input.sourceId, lane);
    lane.active = this.write(input, () => current() && lane.ticket === ticket);
    void this.drainLane(input.sourceId, lane);
    return lane.active;
  }
  /** Release a lane or run only its latest waiting replacement; older pending producers never run. */
  private async drainLane(sourceId: string, lane: SourceWriteLane): Promise<void> {
    await lane.active;
    while (lane.pending && !this.closed) {
      const pending = lane.pending; lane.pending = undefined;
      lane.active = pending.start();
      pending.resolve(await lane.active);
    }
    if (this.lanes.get(sourceId) === lane) this.lanes.delete(sourceId);
  }
  /** Add one bounded batch of immutable chunks and postings in one transaction. */
  private async stageChunks(db: IDBDatabase, entries: readonly StagedSourceChunk[], current: () => boolean): Promise<void> {
    if (!current() || this.closed) throw new SourceFactError("cancelled");
    const sourceId = entries[0]?.chunk.sourceId;
    if (!sourceId || entries.some((entry) => entry.chunk.sourceId !== sourceId)) throw new SourceFactError("invalid-chunk");
    await this.transaction(db, [SOURCE_CHUNK_STORE, SOURCE_POSTING_STORE], "readwrite", sourceId, (transaction) => {
      if (!current()) throw new SourceFactError("cancelled");
      const chunkStore = transaction.objectStore(SOURCE_CHUNK_STORE);
      const postingStore = transaction.objectStore(SOURCE_POSTING_STORE);
      for (const entry of entries) {
        chunkStore.add(entry.chunk);
        for (const batch of entry.batches) for (const posting of batch) postingStore.add(posting);
      }
    });
    if (!current()) throw new SourceFactError("cancelled");
  }
  /** A same-revision zero-progress journal is a durable marker for privately staged, not-yet-selected rows. */
  private isLocalDependencyStaging(repair: SourceLocalDependencyRepair): boolean {
    return repair.fromRevision !== null && repair.fromRevision === repair.toRevision
      && repair.fromRecords === repair.toRecords && repair.fromIndex === 0 && repair.toIndex === 0;
  }
  /**
   * Cleanup claims a staging marker before deleting any row. fromIndex === fromRecords is the
   * private reclaim sentinel; toIndex is the durable next-row cursor. Selected count repairs never
   * have the same non-null revision on both sides, so the encoding cannot alias public authority.
   */
  private isLocalDependencyReclaim(repair: SourceLocalDependencyRepair): boolean {
    return repair.fromRevision !== null && repair.fromRevision === repair.toRevision
      && repair.fromRecords > 0 && repair.fromRecords === repair.toRecords
      && repair.fromIndex === repair.fromRecords && repair.toIndex <= repair.toRecords;
  }
  /** Private staging/reclaim markers do not consume the selected-repair pending counter. */
  private isLocalDependencyPrivateRepair(repair: SourceLocalDependencyRepair): boolean {
    return this.isLocalDependencyStaging(repair) || this.isLocalDependencyReclaim(repair);
  }

  /**
   * Reclaim crash/cancellation staging in bounded pages. The first cleanup transaction converts the
   * staging marker to a durable reclaim marker before deleting rows, which fences concurrent stagers
   * on other connections. A process crash during cleanup resumes from the marker's toIndex exactly.
   */
  private async cleanupStagedLocalDependencies(db: IDBDatabase, sourceId: string, current: () => boolean): Promise<SourceReason> {
    try {
      if (this.localStaging.has(sourceId)) return "dependency-pending";
      while (current() && !this.closed) {
        const page = await this.transaction(db, [SOURCE_LOCAL_DEPENDENCY_STORE, SOURCE_LOCAL_OWNER_STORE, SOURCE_LOCAL_REPAIR_STORE],
          "readwrite", sourceId, async (transaction) => {
            const repairs = transaction.objectStore(SOURCE_LOCAL_REPAIR_STORE);
            const rawRepair = await unknownValue(repairs.get(sourceId));
            if (rawRepair === undefined) return { done: true };
            if (!validSourceLocalDependencyRepair(rawRepair) || rawRepair.sourceId !== sourceId) throw new SourceFactError("dependency-invalid");
            if (!this.isLocalDependencyPrivateRepair(rawRepair) || rawRepair.fromRevision === null) {
              throw new SourceFactError("dependency-pending");
            }
            const rawOwner = await unknownValue(transaction.objectStore(SOURCE_LOCAL_OWNER_STORE).get(sourceId));
            if (rawOwner !== undefined && !validSourceLocalDependencyOwner(rawOwner)) throw new SourceFactError("dependency-invalid");
            const revision = rawRepair.fromRevision;
            if (validSourceLocalDependencyOwner(rawOwner) && rawOwner.sourceRevision === revision) {
              throw new SourceFactError("dependency-pending");
            }
            let repair = rawRepair;
            if (this.isLocalDependencyStaging(repair)) {
              repair = { ...repair, fromIndex: repair.fromRecords };
              repairs.put(repair);
            }
            if (!this.isLocalDependencyReclaim(repair)) throw new SourceFactError("dependency-invalid");
            const rows = transaction.objectStore(SOURCE_LOCAL_DEPENDENCY_STORE);
            const end = Math.min(repair.toRecords, repair.toIndex + SOURCE_MAX_BATCH_RECORDS);
            for (let index = repair.toIndex; index < end; index += 1) {
              const rawRow = await unknownValue(rows.get([sourceId, revision, index]));
              if (!validSourceLocalDependencyRow(rawRow) || rawRow.sourceId !== sourceId
                || rawRow.sourceRevision !== revision || rawRow.index !== index) throw new SourceFactError("dependency-invalid");
              rows.delete([sourceId, revision, index]);
            }
            if (end === repair.toRecords) { repairs.delete(sourceId); return { done: true }; }
            repairs.put({ ...repair, toIndex: end } satisfies SourceLocalDependencyRepair);
            return { done: false };
          });
        if (page.done) return "ready";
        await this.runtime.yield();
      }
      return "cancelled";
    } catch (error) { return errorReason(error, "dependency-invalid"); }
  }

  /** Resume either a selected count repair or reclaim an abandoned private staging marker. */
  private async settleLocalDependencyWork(db: IDBDatabase, sourceId: string, current: () => boolean): Promise<SourceReason> {
    const selected = await this.localDependencySelection(db, sourceId, current);
    if (!selected.repair) return "ready";
    return this.isLocalDependencyPrivateRepair(selected.repair)
      ? this.cleanupStagedLocalDependencies(db, sourceId, current)
      : this.repairLocalDependencies(db, sourceId, current);
  }

  /** Read the selected local owner and any resumable count journal without scanning its rows. */
  private async localDependencySelection(db: IDBDatabase, sourceId: string, current: () => boolean): Promise<Readonly<{
    state: SourceLocalDependencyState; owner: SourceLocalDependencyOwner | null; repair: SourceLocalDependencyRepair | null;
  }>> {
    if (!current() || this.closed) throw new SourceFactError("cancelled");
    return this.transaction(db, [SOURCE_LOCAL_OWNER_STORE, SOURCE_LOCAL_REPAIR_STORE, META_STORE], "readonly", sourceId, async (transaction) => {
      const [rawState, rawOwner, rawRepair] = await Promise.all([
        unknownValue(transaction.objectStore(META_STORE).get(SOURCE_LOCAL_DEPENDENCY_STATE_KEY)),
        unknownValue(transaction.objectStore(SOURCE_LOCAL_OWNER_STORE).get(sourceId)),
        unknownValue(transaction.objectStore(SOURCE_LOCAL_REPAIR_STORE).get(sourceId)),
      ]);
      const state = rawState === undefined ? sourceLocalDependencyState() : validSourceLocalDependencyState(rawState) ? rawState : null;
      if (!state) throw new SourceFactError("dependency-invalid");
      const owner = rawOwner === undefined ? null : validSourceLocalDependencyOwner(rawOwner) && rawOwner.sourceId === sourceId ? rawOwner : null;
      if (rawOwner !== undefined && !owner) throw new SourceFactError("dependency-invalid");
      const repair = rawRepair === undefined ? null : validSourceLocalDependencyRepair(rawRepair) && rawRepair.sourceId === sourceId ? rawRepair : null;
      if (rawRepair !== undefined && !repair) throw new SourceFactError("dependency-invalid");
      // Pending is global across sources. A local journal requires at least one pending slot; the
      // inverse is not true because another source may own the remaining journal.
      if (repair !== null && !this.isLocalDependencyPrivateRepair(repair) && state.pending === 0) throw new SourceFactError("dependency-invalid");
      return { state, owner, repair };
    });
  }

  /** Stage one bounded contiguous page of immutable source-local dependency rows. */
  private async stageLocalDependencies(db: IDBDatabase, rows: readonly SourceLocalDependencyRow[], current: () => boolean): Promise<void> {
    if (!current() || this.closed) throw new SourceFactError("cancelled");
    if (!rows.length) return;
    const sourceId = rows[0].sourceId, revision = rows[0].sourceRevision, first = rows[0].index;
    if (rows.length > SOURCE_MAX_BATCH_RECORDS || rows.some((row, offset) => row.sourceId !== sourceId || row.sourceRevision !== revision
      || row.index !== first + offset || !validSourceLocalDependencyRow(row))) throw new SourceFactError("dependency-invalid");
    await this.transaction(db, [SOURCE_LOCAL_DEPENDENCY_STORE, SOURCE_LOCAL_REPAIR_STORE], "readwrite", sourceId, async (transaction) => {
      if (!current()) throw new SourceFactError("cancelled");
      const store = transaction.objectStore(SOURCE_LOCAL_DEPENDENCY_STORE), repairs = transaction.objectStore(SOURCE_LOCAL_REPAIR_STORE);
      const rawMarker = await unknownValue(repairs.get(sourceId));
      if (rawMarker !== undefined) {
        if (!validSourceLocalDependencyRepair(rawMarker) || !this.isLocalDependencyStaging(rawMarker)
          || rawMarker.sourceId !== sourceId || rawMarker.fromRevision !== revision || rawMarker.fromRecords !== first) {
          throw new SourceFactError("dependency-pending");
        }
      } else if (first !== 0) throw new SourceFactError("dependency-invalid");
      for (const row of rows) store.put(row);
      const records = first + rows.length;
      repairs.put({ version: 1, sourceId, fromRevision: revision, fromRecords: records, fromIndex: 0,
        toRevision: revision, toRecords: records, toIndex: 0 } satisfies SourceLocalDependencyRepair);
    });
    this.runtime.localDependencyCheckpoint?.("after-local-staging-page");
    if (!current() || this.closed) throw new SourceFactError("cancelled");
  }

  /**
   * Apply one selected-owner count journal in bounded transactions. Head/owner selection already
   * committed atomically; while this journal exists closed-world lookup is pending, never partial.
   * Old rows are deleted only after their decrements commit, so crash/restart resumes exactly once.
   */
  private async repairLocalDependencies(db: IDBDatabase, sourceId: string, current: () => boolean): Promise<SourceReason> {
    try {
      while (current() && !this.closed) {
        const progress = await this.transaction(db, [SOURCE_LOCAL_DEPENDENCY_STORE, SOURCE_LOCAL_KEY_STORE, SOURCE_LOCAL_REPAIR_STORE, META_STORE],
          "readwrite", sourceId, async (transaction) => {
            const meta = transaction.objectStore(META_STORE), repairs = transaction.objectStore(SOURCE_LOCAL_REPAIR_STORE);
            const rawState = await unknownValue(meta.get(SOURCE_LOCAL_DEPENDENCY_STATE_KEY));
            if (!validSourceLocalDependencyState(rawState)) throw new SourceFactError("dependency-invalid");
            const rawRepair = await unknownValue(repairs.get(sourceId));
            if (rawRepair === undefined) {
              if (rawState.pending === 0) return { complete: true, decremented: false, incremented: false };
              return { complete: true, decremented: false, incremented: false }; // Another source may own the remaining global pending journals.
            }
            if (!validSourceLocalDependencyRepair(rawRepair) || rawRepair.sourceId !== sourceId) throw new SourceFactError("dependency-invalid");
            if (this.isLocalDependencyPrivateRepair(rawRepair)) throw new SourceFactError("dependency-pending");
            if (rawState.pending === 0) throw new SourceFactError("dependency-invalid");
            let repair = rawRepair;
            const rows = transaction.objectStore(SOURCE_LOCAL_DEPENDENCY_STORE), keys = transaction.objectStore(SOURCE_LOCAL_KEY_STORE);
            let processed = 0, decremented = false, incremented = false;
            const apply = async (revision: string, index: number, delta: -1 | 1): Promise<void> => {
              const rawRow = await unknownValue(rows.get([sourceId, revision, index]));
              if (!validSourceLocalDependencyRow(rawRow) || rawRow.sourceId !== sourceId || rawRow.sourceRevision !== revision || rawRow.index !== index) {
                throw new SourceFactError("dependency-invalid");
              }
              const rawKey = await unknownValue(keys.get(rawRow.key));
              const state: SourceLocalDependencyKeyState = rawKey === undefined ? { version: 1, key: rawRow.key, count: 0 }
                : validSourceLocalDependencyKeyState(rawKey) && rawKey.key === rawRow.key ? rawKey : (() => { throw new SourceFactError("dependency-invalid"); })();
              const count = state.count + delta;
              if (!sourceCount(count) || delta < 0 && state.count === 0) throw new SourceFactError("dependency-invalid");
              if (count === 0) keys.delete(rawRow.key); else keys.put({ version: 1, key: rawRow.key, count } satisfies SourceLocalDependencyKeyState);
              if (delta < 0) rows.delete([sourceId, revision, index]);
            };
            while (repair.fromRevision !== null && repair.fromIndex < repair.fromRecords && processed < SOURCE_MAX_BATCH_RECORDS) {
              await apply(repair.fromRevision, repair.fromIndex, -1);
              repair = { ...repair, fromIndex: repair.fromIndex + 1 }; processed += 1; decremented = true;
            }
            while (repair.toRevision !== null && repair.fromIndex === repair.fromRecords && repair.toIndex < repair.toRecords
              && processed < SOURCE_MAX_BATCH_RECORDS) {
              await apply(repair.toRevision, repair.toIndex, 1);
              repair = { ...repair, toIndex: repair.toIndex + 1 }; processed += 1; incremented = true;
            }
            const complete = repair.fromIndex === repair.fromRecords && repair.toIndex === repair.toRecords;
            if (complete) {
              this.runtime.localDependencyCheckpoint?.("before-local-repair-retire");
              if (!current() || this.closed) throw new SourceFactError("cancelled");
              repairs.delete(sourceId);
              meta.put({ ...rawState, revision: rawState.revision + 1, pending: rawState.pending - 1 } satisfies SourceLocalDependencyState);
            } else repairs.put(repair);
            return { complete, decremented, incremented };
          });
        if (progress.decremented) {
          this.runtime.localDependencyCheckpoint?.("after-local-old-count-batch");
          if (!current() || this.closed) return "cancelled";
        }
        if (progress.incremented) {
          this.runtime.localDependencyCheckpoint?.("after-local-new-count-batch");
          if (!current() || this.closed) return "cancelled";
        }
        if (progress.complete) return "ready";
        await this.runtime.yield();
      }
      return "cancelled";
    } catch (error) { return errorReason(error, "dependency-invalid"); }
  }

  /** Resume all crash-interrupted count journals before declaring the inventory closed. */
  private async repairAllLocalDependencies(db: IDBDatabase, current: () => boolean): Promise<SourceReason> {
    while (current() && !this.closed) {
      const selected = await this.transaction(db, [META_STORE, SOURCE_LOCAL_REPAIR_STORE], "readonly", "", async (transaction) => {
        const rawState = await unknownValue(transaction.objectStore(META_STORE).get(SOURCE_LOCAL_DEPENDENCY_STATE_KEY));
        if (!validSourceLocalDependencyState(rawState)) throw new SourceFactError("dependency-invalid");
        const keys = await requestValue(transaction.objectStore(SOURCE_LOCAL_REPAIR_STORE).getAllKeys(undefined, 1));
        return { state: rawState, sourceId: typeof keys[0] === "string" ? keys[0] : null };
      });
      if (!selected.sourceId) return selected.state.pending === 0 ? "ready" : "dependency-invalid";
      const rawRepair = await this.transaction(db, [SOURCE_LOCAL_REPAIR_STORE], "readonly", selected.sourceId, (transaction) =>
        unknownValue(transaction.objectStore(SOURCE_LOCAL_REPAIR_STORE).get(selected.sourceId!)));
      if (!validSourceLocalDependencyRepair(rawRepair) || rawRepair.sourceId !== selected.sourceId) return "dependency-invalid";
      const repaired = this.isLocalDependencyPrivateRepair(rawRepair)
        ? await this.cleanupStagedLocalDependencies(db, selected.sourceId, current)
        : await this.repairLocalDependencies(db, selected.sourceId, current);
      if (repaired !== "ready") return repaired;
      await this.runtime.yield();
    }
    return "cancelled";
  }

  /** Retain bounded identical encoded facts for storage-degraded operation, never a second graph. */
  private rememberMemory(source: MemorySource): void {
    const previous = this.memory.get(source.head.sourceId);
    if (previous) { this.memoryBytes -= previous.bytes; this.memory.delete(source.head.sourceId); }
    this.unsaved.add(source.head.sourceId);
    if (source.bytes > MAX_UNSAVED_BYTES) { this.diagnostics.lastReason = "memory-budget"; return; }
    while (this.memoryBytes + source.bytes > MAX_UNSAVED_BYTES && this.memory.size) {
      const entry = this.memory.entries().next();
      if (entry.done) break;
      const [sourceId, evicted] = entry.value;
      this.memoryBytes -= evicted.bytes; this.memory.delete(sourceId);
    }
    this.memory.set(source.head.sourceId, source); this.memoryBytes += source.bytes;
    this.scheduleRetry();
  }
  /** Release only the saved source's unsaved facts; failure in another source remains independent. */
  private forgetMemory(sourceId: string): void {
    const previous = this.memory.get(sourceId);
    if (previous) this.memoryBytes -= previous.bytes;
    this.memory.delete(sourceId); this.unsaved.delete(sourceId);
  }
  /** Prepare bounded immutable families, validate them, and select the manifest with one short CAS. */
  private async write(input: SourceReplacement, current: () => boolean): Promise<SourceWriteResult> {
    const revision = this.runtime.uniqueId();
    let dependencyTicket: string | undefined;
    const families: Partial<Record<SourceFamily, SourceFamilyManifest>> = {};
    const chunks = new Map<string, SourceChunk>(); const postings = new Map<string, SourcePosting>();
    let staged: StagedSourceChunk[] = []; let stagedBytes = 0; let stagedRecords = 0;
    let memoryBytes = 0; let memoryComplete = true; let db: IDBDatabase | null = null; let retainedView: SourceView | null = null;
    let storageReason: SourceReason = "storage-unavailable";
    let localRows: SourceLocalDependencyRow[] = []; let localBytes = 0; let localRecords = 0; let localDigest = "0".repeat(64);
    let localSelected = false;
    /** Preserve the fallback only within its explicit bound; live callers still own their parsed inputs. */
    const retain = (chunk: SourceChunk, batches: SourcePosting[][]): void => {
      if (!memoryComplete) return;
      memoryBytes += chunk.data.length * 2 + 256;
      for (const batch of batches) for (const posting of batch) memoryBytes += encodedBytes(JSON.stringify(posting)) * 2;
      if (memoryBytes > MAX_UNSAVED_BYTES) { memoryComplete = false; chunks.clear(); postings.clear(); return; }
      chunks.set(memoryKey(chunk.family, chunk.index), chunk);
      for (const batch of batches) for (const posting of batch) postings.set(memoryKey(posting.family, posting.index), posting);
    };
    /** Apply source-local storage backpressure at the same record/byte boundary as acquisition. */
    const stagePending = async (): Promise<boolean> => {
      if (!staged.length || !db) return current() && !this.closed;
      const entries = staged; staged = []; stagedBytes = 0; stagedRecords = 0;
      try {
        await this.stageChunks(db, entries, current);
        this.diagnostics.chunksWritten += entries.length;
        this.diagnostics.bytesWritten += entries.reduce((total, entry) => total + entry.chunk.bytes, 0);
      } catch (error) {
        if (!current() || this.closed) return false;
        storageReason = errorReason(error, "write-error"); db = null;
      }
      return current() && !this.closed;
    };
    /** Queue one already validated chunk, flushing before either bounded staging limit is crossed. */
    const queueStage = async (chunk: SourceChunk, batches: SourcePosting[][], force: boolean): Promise<boolean> => {
      if (!db) return current() && !this.closed;
      const bytes = chunk.bytes + batches.reduce((total, batch) => total + encodedBytes(JSON.stringify(batch)), 0);
      if (staged.length && (stagedBytes + bytes > SOURCE_CHUNK_TARGET_BYTES
        || stagedRecords + chunk.records > SOURCE_MAX_BATCH_RECORDS) && !(await stagePending())) return false;
      staged.push({ chunk, batches, bytes }); stagedBytes += bytes; stagedRecords += chunk.records;
      return !force && stagedBytes < SOURCE_CHUNK_TARGET_BYTES && stagedRecords < SOURCE_MAX_BATCH_RECORDS
        ? current() && !this.closed : stagePending();
    };
    /** Stage source-local memberships as a streaming derivative; no whole-source key set is retained. */
    const flushLocal = async (): Promise<boolean> => {
      if (!localRows.length || !db) return current() && !this.closed;
      const rows = localRows; localRows = []; localBytes = 0;
      try {
        await this.stageLocalDependencies(db, rows, current);
        localDigest = await this.runtime.digest(localDigest + JSON.stringify(rows.map((row) => row.key)));
      } catch (error) {
        if (!current() || this.closed) return false;
        storageReason = errorReason(error, "write-error"); db = null;
      }
      if (!current() || this.closed) return false;
      await this.runtime.yield();
      return current() && !this.closed;
    };
    const queueLocalKey = async (key: string): Promise<boolean> => {
      if (!db) return current() && !this.closed;
      const row: SourceLocalDependencyRow = { version: 1, sourceId: input.sourceId, sourceRevision: revision, index: localRecords, key };
      const bytes = encodedBytes(JSON.stringify(row)) + 1;
      if (bytes > SOURCE_MAX_RECORD_BYTES) throw new SourceFactError("decode-budget");
      if (localRows.length && (localRows.length >= SOURCE_MAX_BATCH_RECORDS || localBytes + bytes > SOURCE_CHUNK_TARGET_BYTES)
        && !(await flushLocal())) return false;
      localRows.push(row); localBytes += bytes; localRecords += 1;
      if ((localRows.length >= SOURCE_MAX_BATCH_RECORDS || localBytes >= SOURCE_CHUNK_TARGET_BYTES) && !(await flushLocal())) return false;
      return current() && !this.closed;
    };
    const queueLocalFact = async (fact: StoredSourceFact): Promise<boolean> => {
      for (const key of sourceLocalStoredDependencyKeys(input.physical.path, fact)) if (!(await queueLocalKey(key))) return false;
      return true;
    };
    try {
      db = await this.open();
      if (db) {
        try {
          const settled = await this.settleLocalDependencyWork(db, input.sourceId, current);
          if (settled !== "ready") throw new SourceFactError(settled);
          if (this.hostChange && (await this.flushContributorHostChange() !== "ready" || this.hostChange)) throw new SourceFactError("dependency-pending");
          dependencyTicket = await this.beginDependencyMutation(db, input.sourceId, current);
          this.runtime.localDependencyCheckpoint?.("before-local-staging");
        } catch (error) { storageReason = errorReason(error, "write-error"); db = null; }
      }
      if (!current() || this.closed) return this.result("cancelled", "cancelled");
      if (db) this.localStaging.set(input.sourceId, revision);
      if (db) for (const key of sourceLocalStructuralBaseKeys(input.sourceId, input.physical.path)) {
        if (!(await queueLocalKey(key))) return this.result("cancelled", "cancelled");
      }
      if (SOURCE_FAMILIES.some((family) => typeof input.families[family] !== "function")) {
        const pinned = await this.pin(input.sourceId, true);
        retainedView = pinned.view;
        if (!retainedView) return this.result("rejected", pinned.reason);
      }
      for (const family of SOURCE_FAMILIES) {
        if (!current() || this.closed) return this.result("cancelled", "cancelled");
        const producer = input.families[family];
        if (typeof producer !== "function") {
          families[family] = producer;
          if (!retainedView || retainedView.head.families[family]?.revision !== producer.revision) {
            return this.result("superseded", "superseded");
          }
          // Pin and validate retained revisions too. The same bounded encoded facts remain available
          // if storage fails while the new resolution family is being written.
          const reason = await this.visitFamily(retainedView, family, async (records) => {
            for (const record of records) if (!(await queueLocalFact(record))) return false;
            return current();
          }, current, retain);
          if (reason !== "ready") return this.result(current() ? "rejected" : "cancelled", reason);
          this.diagnostics.familiesReused += 1;
          continue;
        }
        const validator: SourceFrameValidator = new SourceFrameValidator(family);
        let pending: StoredSourceFact[] = []; let encoded: string[] = []; let pendingBytes = 2;
        let chunkIndex = 0; let recordCount = 0; let byteCount = 0; let postingCount = 0; let digest = ""; let postingDigest = "";
        let lastFlush = this.runtime.now(); let lastYield = this.runtime.now();
        /** Transfer one bounded chunk and all of its bounded posting batches before producing more. */
        const flush = async (final: boolean): Promise<boolean> => {
          if (!current() || this.closed) return false;
          const facts = pending; const data = `[${encoded.join(",")}]`;
          pending = []; encoded = []; pendingBytes = 2;
          const chunk: SourceChunk = { sourceId: input.sourceId, revision, family, index: chunkIndex++, final,
            records: facts.length, bytes: encodedBytes(data), digest: await this.runtime.digest(data), data };
          if (!current() || this.closed) return false;
          const batches = [...postingBatches(input.sourceId, revision, family, facts, postingCount)];
          for (const batch of batches) {
            postingCount += batch.length; postingDigest = await this.runtime.digest(postingDigest + JSON.stringify(batch));
            if (!current()) return false;
          }
          retain(chunk, batches);
          if (!(await queueStage(chunk, batches, !final))) return false;
          if (!current() || this.closed) return false;
          recordCount += facts.length; byteCount += chunk.bytes;
          digest = await this.runtime.digest(digest + chunk.digest);
          lastFlush = this.runtime.now();
          await this.runtime.yield(); lastYield = this.runtime.now();
          return current() && !this.closed;
        };
        const accepted = await producer(async (fact) => {
          if (!current() || this.closed) return false;
          if (pending.length && this.runtime.now() - lastFlush >= SOURCE_FLUSH_INTERVAL_MS && !(await flush(false))) return false;
          if (fact !== null) {
            validator.accept(fact);
            if (!(await queueLocalFact(fact))) return false;
            const value = JSON.stringify(fact); const bytes = encodedBytes(value) + 1;
            // Oversized single identity records may travel alone up to the explicit decode cap.
            if (bytes + 2 > SOURCE_MAX_RECORD_BYTES || value.length * 4 + bytes > SOURCE_DECODE_BUDGET_BYTES) throw new SourceFactError("decode-budget", family);
            if (pending.length && (pendingBytes + bytes > SOURCE_CHUNK_TARGET_BYTES || pending.length >= SOURCE_MAX_BATCH_RECORDS) && !(await flush(false))) return false;
            pending.push(fact); encoded.push(value); pendingBytes += bytes;
            if ((pending.length >= SOURCE_MAX_BATCH_RECORDS || pendingBytes >= SOURCE_CHUNK_TARGET_BYTES) && !(await flush(false))) return false;
          }
          if (this.runtime.now() - lastYield >= 8) { await this.runtime.yield(); lastYield = this.runtime.now(); }
          return current() && !this.closed;
        });
        if (!accepted || !current() || this.closed) return this.result("cancelled", "cancelled");
        validator.finish();
        if (!(await flush(true))) return this.result("cancelled", "cancelled");
        families[family] = { revision, chunks: chunkIndex, records: recordCount, bytes: byteCount, postings: postingCount, digest, postingDigest };
      }
      if (!(await stagePending()) || !(await flushLocal())) return this.result("cancelled", "cancelled");
      const local: PreparedLocalDependencies = { records: localRecords, digest: localDigest };
      if (!current() || this.closed) return this.result("cancelled", "cancelled");
      const head: SourceManifest = { sourceId: input.sourceId, sourceRevision: revision, formatVersion: SOURCE_FACT_FORMAT_VERSION,
        compilerVersion: SOURCE_FACT_COMPILER_VERSION, bodyParserVersion: SOURCE_BODY_PARSER_VERSION, resolutionVersion: SOURCE_RESOLUTION_VERSION,
        physical: input.physical, observation: input.observation, state: "complete", families };
      if (sourceHeadReason({ ...head, sequence: 1 }) !== "ready") return this.result("rejected", "invalid-head");
      if (db) {
        try {
          // Producers and frame codecs validated the exact encoded records before staging.
          // Activation atomically proves that every bounded chunk/posting write committed; a later
          // process still performs full digest/frame/posting validation before reuse.
          const result = await this.activate(db, head, input.expected, current, dependencyTicket, local);
          if (result.outcome === "activated") {
            localSelected = true;
            // An activation that is no longer live must not erase a newer deletion/unsaved mask.
            if (current() && !this.closed) this.forgetMemory(input.sourceId);
            return result;
          }
          if (result.outcome !== "unsaved") return result;
          storageReason = result.reason;
        } catch (error) { storageReason = errorReason(error, "write-error"); }
      }
      if (!current() || this.closed) return this.result("cancelled", "cancelled");
      memoryBytes += JSON.stringify(head).length * 2 + 256;
      if (memoryBytes > MAX_UNSAVED_BYTES) memoryComplete = false;
      if (memoryComplete) this.rememberMemory({ head, expected: input.expected, chunks, postings, bytes: memoryBytes, current });
      else { this.unsaved.add(input.sourceId); this.scheduleRetry(); }
      return this.result("unsaved", memoryComplete ? storageReason : "memory-budget", null, true);
    } catch (error) {
      return !current() || this.closed ? this.result("cancelled", "cancelled") : this.result("rejected", errorReason(error, "write-error"));
    } finally {
      if (retainedView) await this.unpin(retainedView);
      if (this.localStaging.get(input.sourceId) === revision) this.localStaging.delete(input.sourceId);
      if (!localSelected && localRecords > 0 && !this.closed) {
        const cleanupDb = db ?? await this.open();
        if (cleanupDb) {
          const cleaned = await this.cleanupStagedLocalDependencies(cleanupDb, input.sourceId, () => !this.closed);
          if (cleaned !== "ready" && cleaned !== "dependency-pending" && cleaned !== "cancelled") this.diagnostics.lastReason = cleaned;
        }
      }
    }
  }
  /**
   * Commit a complete manifest and durable sequence atomically. Producers validate frames before
   * staging; this transaction checks committed chunk/posting counts. Readers later verify full
   * digests and regenerated postings before treating the selected head as reusable.
   */
  private async activate(db: IDBDatabase, head: SourceManifest, expected: SourceHeadExpectation,
    current: () => boolean, dependencyTicket?: string, local?: PreparedLocalDependencies): Promise<SourceWriteResult> {
    if (!current() || this.closed) return this.result("cancelled", "cancelled");
    try {
      const stores = [SOURCE_HEAD_STORE, SOURCE_CHUNK_STORE, SOURCE_POSTING_STORE, META_STORE, SOURCE_IMPACT_STORE,
        SOURCE_LOCAL_DEPENDENCY_STORE, SOURCE_LOCAL_OWNER_STORE, SOURCE_LOCAL_REPAIR_STORE];
      const activated = await this.transaction(db, stores, "readwrite", head.sourceId, async (transaction) => {
        const heads = transaction.objectStore(SOURCE_HEAD_STORE); const meta = transaction.objectStore(META_STORE);
        const raw = await unknownValue(heads.get(head.sourceId));
        if (!current() || this.closed) throw new SourceFactError("cancelled");
        if (!expectedHeadMatches(expected, raw)) throw new SourceFactError("superseded");
        for (const family of SOURCE_FAMILIES) {
          if (head.state === "tombstone") continue;
          const manifest = head.families[family];
          if (!manifest) throw new SourceFactError("invalid-head");
          const range = IDBKeyRange.only([head.sourceId, manifest.revision, family]);
          const [chunks, postings] = await Promise.all([
            requestValue(transaction.objectStore(SOURCE_CHUNK_STORE).index(SOURCE_FAMILY_INDEX).count(range)),
            requestValue(transaction.objectStore(SOURCE_POSTING_STORE).index(SOURCE_FAMILY_INDEX).count(range)),
          ]);
          if (!current() || this.closed) throw new SourceFactError("cancelled");
          if (chunks !== manifest.chunks) throw new SourceFactError("missing-chunk", family);
          if (postings !== manifest.postings) throw new SourceFactError("missing-posting", family);
        }
        const sequenceRecord = await unknownValue(meta.get(SOURCE_SEQUENCE_KEY));
        if (sequenceRecord !== undefined && (!sourceObject(sequenceRecord) || sequenceRecord.key !== SOURCE_SEQUENCE_KEY
          || !sourceCount(sequenceRecord.value) || Object.keys(sequenceRecord).length !== 2)) throw new SourceFactError("catalog-uncertain");
        const previousSequence = sourceObject(sequenceRecord) && sourceCount(sequenceRecord.value) ? sequenceRecord.value : 0;
        if (previousSequence >= Number.MAX_SAFE_INTEGER || !current() || this.closed) throw new SourceFactError("cancelled");
        const activated: SourceHead = { ...head, sequence: previousSequence + 1 };

        const rawState = await unknownValue(meta.get(SOURCE_LOCAL_DEPENDENCY_STATE_KEY));
        const localState = rawState === undefined ? sourceLocalDependencyState()
          : validSourceLocalDependencyState(rawState) ? rawState : null;
        if (!localState || localState.revision >= Number.MAX_SAFE_INTEGER || localState.pending >= Number.MAX_SAFE_INTEGER) {
          throw new SourceFactError("dependency-invalid");
        }
        const ownerStore = transaction.objectStore(SOURCE_LOCAL_OWNER_STORE), repairs = transaction.objectStore(SOURCE_LOCAL_REPAIR_STORE);
        const [rawOwner, rawRepair] = await Promise.all([unknownValue(ownerStore.get(head.sourceId)), unknownValue(repairs.get(head.sourceId))]);
        const selectedOwner = rawOwner === undefined ? null : validSourceLocalDependencyOwner(rawOwner) ? rawOwner : null;
        if (rawOwner !== undefined && !selectedOwner) throw new SourceFactError("dependency-invalid");
        const staging = rawRepair === undefined ? null
          : validSourceLocalDependencyRepair(rawRepair) && this.isLocalDependencyStaging(rawRepair) ? rawRepair : null;
        if (rawRepair !== undefined && !staging) throw new SourceFactError(validSourceLocalDependencyRepair(rawRepair) ? "dependency-pending" : "dependency-invalid");
        if (localState.complete && raw !== undefined && decodeSourceHead(raw)?.state === "complete" && !selectedOwner) {
          throw new SourceFactError("dependency-invalid");
        }

        let nextRecords = 0, nextDigest = "0".repeat(64);
        if (head.state === "complete") {
          if (!local || local.records <= 0 || !staging || staging.sourceId !== head.sourceId
            || staging.fromRevision !== head.sourceRevision || staging.fromRecords !== local.records) throw new SourceFactError("dependency-invalid");
          nextRecords = local.records; nextDigest = local.digest;
        } else if (staging) throw new SourceFactError("dependency-invalid");
        const order = selectedOwner?.order ?? activated.sequence;
        const markdownOrder = selectedOwner?.markdownOrder ?? activated.sequence;
        const owner: SourceLocalDependencyOwner = { version: SOURCE_LOCAL_DEPENDENCY_VERSION, sourceId: head.sourceId, sourceRevision: head.sourceRevision,
          state: head.state, sequence: activated.sequence, order, markdownOrder, records: nextRecords, digest: nextDigest };
        ownerStore.put(owner);
        const fromRevision = selectedOwner?.state === "complete" ? selectedOwner.sourceRevision : null;
        const fromRecords = selectedOwner?.state === "complete" ? selectedOwner.records : 0;
        const toRevision = head.state === "complete" ? head.sourceRevision : null;
        const toRecords = head.state === "complete" ? nextRecords : 0;
        const needsRepair = fromRecords > 0 || toRecords > 0;
        if (needsRepair) {
          repairs.put({ version: 1, sourceId: head.sourceId, fromRevision, fromRecords, fromIndex: 0,
            toRevision, toRecords, toIndex: 0 } satisfies SourceLocalDependencyRepair);
        }
        meta.put({ ...localState, revision: localState.revision + 1,
          pending: localState.pending + (needsRepair ? 1 : 0) } satisfies SourceLocalDependencyState);

        await this.finishDependencyMutation(transaction, head.sourceId, { kind: "head", head: activated }, dependencyTicket);
        meta.put({ key: SOURCE_SEQUENCE_KEY, value: activated.sequence });
        await requestValue(heads.put(activated));
        if (!current() || this.closed) throw new SourceFactError("cancelled");
        return activated;
      });
      this.runtime.localDependencyCheckpoint?.("after-local-activation");
      const repaired = await this.repairLocalDependencies(db, head.sourceId, current);
      if (repaired !== "ready" && repaired !== "cancelled") this.diagnostics.lastReason = repaired;
      this.rememberDurable(activated);
      if (activated.state === "complete" && SOURCE_FAMILIES.every((family) => activated.families[family]?.records === 0)) this.diagnostics.empty += 1;
      const live = !this.closed && current();
      return this.result("activated", live ? "activated" : "activated-not-live", activated.sequence, live);
    } catch (error) {
      const reason = errorReason(error, "write-error");
      if (reason === "superseded") return this.result("superseded", reason);
      if (!current() || this.closed || reason === "cancelled") return this.result("cancelled", "cancelled");
      if (["missing-chunk", "missing-posting", "invalid-head", "catalog-uncertain", "dependency-invalid"].includes(reason)) return this.result("rejected", reason);
      return this.result("unsaved", reason, null, true);
    }
  }
  /**
   * Hide a deleted binding immediately, even when storage is unavailable. One coalesced tombstone
   * transaction runs beside the bounded source lanes; the remaining queue contains only dirty IDs
   * and validity predicates. A captured rename may retain independently validated old body families.
   */
  tombstone(sourceId: string, caller: () => boolean = () => true, retainFamilies = false,
    ready?: Promise<void>): Promise<SourceWriteResult> {
    if (this.closed || !caller()) return Promise.resolve(this.result("cancelled", "cancelled"));
    this.cancelSource(sourceId);
    const previous = this.pendingDeletes.get(sourceId);
    // A lost unsaved payload may not turn an older disk body into a reusable rename input. Read
    // that disk head only to retire it. Repeated requests can drop retention, never restore it.
    const canRetain = previous ? previous.retain : !this.unsaved.has(sourceId) || this.memory.has(sourceId);
    const prerequisite = previous?.ready && ready ? Promise.all([previous.ready, ready]).then(() => undefined) : ready ?? previous?.ready;
    const pending: PendingSourceDeletion = { current: caller, retain: retainFamilies && canRetain, ready: prerequisite };
    this.pendingDeletes.set(sourceId, pending); this.unsaved.add(sourceId); this.knownHeads.delete(sourceId);
    if (this.deleteTask) { this.scheduleRetry(); return Promise.resolve(this.result("unsaved", "backpressure", null, true)); }
    /** Fence every continuation against the exact coalesced absence request. */
    const current = (): boolean => !this.closed && caller() && this.pendingDeletes.get(sourceId) === pending;
    let retired: string[] = [];
    /** Retire only the selected owner; a masked disk head is CAS input, never a live read result. */
    const work = async (): Promise<SourceWriteResult> => {
      // Host maintenance may need the selected source's durable alias/path facts before deletion.
      // Register the tombstone immediately so flush() observes it, but do not mutate selection until
      // that bounded source-local fan-out capture has finished.
      if (pending.ready) { await pending.ready; if (!current()) return this.result("cancelled", "cancelled"); }
      if (this.hostChange && (await this.flushContributorHostChange() !== "ready" || this.hostChange)) {
        this.scheduleRetry(); return this.result("unsaved", "dependency-pending", null, true);
      }
      const mutationDb = await this.open();
      if (mutationDb) {
        const settled = await this.settleLocalDependencyWork(mutationDb, sourceId, current);
        if (settled !== "ready") return this.result("unsaved", settled, null, true);
      }
      const dependencyTicket = mutationDb ? await this.beginDependencyMutation(mutationDb, sourceId, current) : undefined;
      const pinned = await this.pin(sourceId, true, pending);
      if (!current()) {
        if (pinned.view) await this.unpin(pinned.view);
        return this.result("cancelled", "cancelled");
      }
      if (!pinned.view) {
        if (pinned.expected.kind === "missing") {
          if (mutationDb) await this.transaction(mutationDb, [SOURCE_HEAD_STORE, META_STORE, SOURCE_IMPACT_STORE], "readwrite", sourceId, async (transaction) => {
            if (!current() || await unknownValue(transaction.objectStore(SOURCE_HEAD_STORE).get(sourceId)) !== undefined) throw new SourceFactError("superseded");
            await this.finishDependencyMutation(transaction, sourceId, { kind: "missing" }, dependencyTicket);
          });
          if (!current()) return this.result("cancelled", "cancelled");
          this.pendingDeletes.delete(sourceId); this.forgetMemory(sourceId);
          return this.result("absent", "missing", null, true);
        }
        this.scheduleRetry(); return this.result("unsaved", pinned.reason, null, true);
      }
      const view = pinned.view;
      try {
        const head: SourceManifest = { ...view.head, sourceRevision: this.runtime.uniqueId(), state: "tombstone",
          families: pending.retain ? view.head.families : {} };
        const db = await this.open();
        if (!current()) return this.result("cancelled", "cancelled");
        if (db) {
          // A fresh, still-authoritative absence observation may capture the recovered disk head.
          const expected = view.saved ? view.expected : await this.catalogExpectation(sourceId);
          if (!current()) return this.result("cancelled", "cancelled");
          const result = await this.activate(db, head, expected, current, dependencyTicket,
            { records: 0, digest: "0".repeat(64) });
          if (result.outcome === "activated") {
            // Commit completion can race a new request/recreation. A retiring capability may not
            // erase another request's mask or install old retained memory over a newer source.
            if (!current()) return result;
            if (!pending.retain) retired = [...new Set(Object.values(view.head.families).map(family => family.revision))];
            this.pendingDeletes.delete(sourceId);
            if (pending.retain && view.memory) {
              this.rememberMemory({ ...view.memory, head, current: () => false });
              this.unsaved.delete(sourceId);
            } else this.forgetMemory(sourceId);
            return result;
          }
          if (result.outcome === "cancelled" || result.outcome === "superseded") return result;
        }
        if (view.memory && current()) this.rememberMemory({ ...view.memory, head, current });
        this.scheduleRetry();
        return this.result(current() ? "unsaved" : "cancelled", current() ? "storage-unavailable" : "cancelled", null, current());
      } finally { await this.unpin(view); }
    };
    const task = work().catch(() => this.result(current() ? "unsaved" : "cancelled", current() ? "write-error" : "cancelled"))
      .then(async (result) => {
        // work() has released the reader pin before cleanup. Head selection and persistent leases
        // are rechecked atomically; a recreation or another reader can only prevent reclamation.
        for (const revision of retired) await this.cleanupRevision(sourceId, revision, () => !this.closed && caller());
        return result;
      });
    this.deleteTask = task;
    void task.finally(() => { if (this.deleteTask === task) this.deleteTask = null; this.scheduleRetry(); });
    return task;
  }
  /** Read a bounded catalog page for inventory reconciliation; no whole-vault manifest is rewritten. */
  async headPage(after: string | null = null, limit = SOURCE_MAX_BATCH_RECORDS): Promise<Readonly<{ available: boolean; heads: SourceHead[]; invalid: number; next: string | null }>> {
    const db = await this.open();
    if (!db) return { available: false, heads: [], invalid: 0, next: null };
    try {
      return await this.transaction(db, [SOURCE_HEAD_STORE], "readonly", "", async (transaction) => {
        const range = after === null ? undefined : IDBKeyRange.lowerBound(after, true);
        const entries: unknown[] = await requestValue(transaction.objectStore(SOURCE_HEAD_STORE).getAll(range, Math.max(1, Math.min(limit, SOURCE_MAX_BATCH_RECORDS))));
        const keys = await requestValue(transaction.objectStore(SOURCE_HEAD_STORE).getAllKeys(range, Math.max(1, Math.min(limit, SOURCE_MAX_BATCH_RECORDS))));
        const heads: SourceHead[] = []; let invalid = 0;
        for (let index = 0; index < entries.length; index += 1) {
          const head = decodeSourceHead(entries[index]);
          if (head && head.sourceId === keys[index]) heads.push(head); else invalid += 1;
        }
        const last = keys[keys.length - 1];
        return { available: true, heads, invalid, next: typeof last === "string" ? last : null };
      });
    } catch { return { available: false, heads: [], invalid: 0, next: null }; }
  }
  /**
   * Upgrade one accepted R1 owner by appending only resolver-neutral lexical memberships. The source
   * revision/head never changes: immutable rows are staged idempotently, then the existing selected
   * count journal publishes their counts exactly once before closed-world lookup can resume.
   */
  private async upgradeLocalDependencyOwner(db: IDBDatabase, owner: SourceLocalDependencyOwner, head: SourceManifest,
    current: () => boolean): Promise<SourceReason> {
    if (owner.version >= SOURCE_LOCAL_DEPENDENCY_VERSION) return "ready";
    if (owner.version !== 1 || owner.state !== "complete" || head.state !== "complete"
      || owner.sourceRevision !== head.sourceRevision) return "dependency-invalid";
    try {
      let rows: SourceLocalDependencyRow[] = []; let bytes = 0; let records = owner.records; let digest = owner.digest;
      const flush = async (): Promise<void> => {
        if (!rows.length) return;
        const page = rows; rows = []; bytes = 0;
        await this.transaction(db, [SOURCE_LOCAL_DEPENDENCY_STORE], "readwrite", owner.sourceId, async (transaction) => {
          const store = transaction.objectStore(SOURCE_LOCAL_DEPENDENCY_STORE);
          for (const row of page) {
            const raw = await unknownValue(store.get([row.sourceId, row.sourceRevision, row.index]));
            if (raw !== undefined && (!validSourceLocalDependencyRow(raw) || raw.sourceId !== row.sourceId
              || raw.sourceRevision !== row.sourceRevision || raw.index !== row.index || raw.key !== row.key)) {
              throw new SourceFactError("dependency-invalid");
            }
            store.put(row);
          }
        });
        digest = await this.runtime.digest(digest + JSON.stringify(page.map((row) => row.key)));
        await this.runtime.yield();
        if (!current() || this.closed) throw new SourceFactError("cancelled");
      };
      const add = async (key: string): Promise<void> => {
        const row: SourceLocalDependencyRow = { version: 1, sourceId: owner.sourceId, sourceRevision: owner.sourceRevision, index: records, key };
        const rowBytes = encodedBytes(JSON.stringify(row)) + 1;
        if (rowBytes > SOURCE_MAX_RECORD_BYTES) throw new SourceFactError("decode-budget");
        if (rows.length && (rows.length >= SOURCE_MAX_BATCH_RECORDS || bytes + rowBytes > SOURCE_CHUNK_TARGET_BYTES)) await flush();
        rows.push(row); bytes += rowBytes; records += 1;
        if (rows.length >= SOURCE_MAX_BATCH_RECORDS || bytes >= SOURCE_CHUNK_TARGET_BYTES) await flush();
      };
      const read = await this.readSelected(owner.sourceId, (stamp) => stamp.saved && stamp.sequence === owner.sequence
        && stamp.head.sourceRevision === owner.sourceRevision ? "ready" : "superseded", async (reader) => {
        for (const family of ["values", "metadata"] as const) {
          const reason = await reader.visit(family, async (familyRows) => {
            for (const record of familyRows) for (const key of sourceLocalStoredResolverKeys(head.physical.path, record)) await add(key);
            return current();
          });
          if (reason !== "ready") throw new SourceFactError(reason, family);
        }
        return true;
      }, current);
      if (read.outcome !== "ready") return read.reason;
      await flush();
      const appended = records - owner.records;
      await this.transaction(db, [SOURCE_LOCAL_OWNER_STORE, SOURCE_LOCAL_REPAIR_STORE, META_STORE, SOURCE_HEAD_STORE],
        "readwrite", owner.sourceId, async (transaction) => {
          const rawHead = decodeSourceHead(await unknownValue(transaction.objectStore(SOURCE_HEAD_STORE).get(owner.sourceId)));
          const rawOwner = await unknownValue(transaction.objectStore(SOURCE_LOCAL_OWNER_STORE).get(owner.sourceId));
          const rawRepair = await unknownValue(transaction.objectStore(SOURCE_LOCAL_REPAIR_STORE).get(owner.sourceId));
          const rawState = await unknownValue(transaction.objectStore(META_STORE).get(SOURCE_LOCAL_DEPENDENCY_STATE_KEY));
          if (!rawHead || rawHead.sourceRevision !== owner.sourceRevision || rawHead.sequence !== owner.sequence
            || !validSourceLocalDependencyOwner(rawOwner) || rawOwner.version !== 1
            || rawOwner.sourceRevision !== owner.sourceRevision || rawOwner.sequence !== owner.sequence
            || rawOwner.records !== owner.records || rawOwner.digest !== owner.digest || rawRepair !== undefined
            || !validSourceLocalDependencyState(rawState) || rawState.pending >= Number.MAX_SAFE_INTEGER) {
            throw new SourceFactError("superseded");
          }
          transaction.objectStore(SOURCE_LOCAL_OWNER_STORE).put({ ...rawOwner, version: SOURCE_LOCAL_DEPENDENCY_VERSION, records, digest } satisfies SourceLocalDependencyOwner);
          if (appended > 0) {
            transaction.objectStore(SOURCE_LOCAL_REPAIR_STORE).put({ version: 1, sourceId: owner.sourceId, fromRevision: null, fromRecords: 0, fromIndex: 0,
              toRevision: owner.sourceRevision, toRecords: records, toIndex: owner.records } satisfies SourceLocalDependencyRepair);
          }
          transaction.objectStore(META_STORE).put({ ...rawState, revision: rawState.revision + 1,
            pending: rawState.pending + (appended > 0 ? 1 : 0) } satisfies SourceLocalDependencyState);
        });
      if (appended > 0) return this.repairLocalDependencies(db, owner.sourceId, current);
      return current() ? "ready" : "cancelled";
    } catch (error) { return !current() || this.closed ? "cancelled" : errorReason(error, "dependency-invalid"); }
  }

  /** Backfill or verify one durable source-local dependency owner without changing the source head. */
  async ensureLocalDependencies(sourceId: string, order: number, markdownOrder: number, current: () => boolean = () => true): Promise<SourceReason> {
    if (!sourceCount(order) || !sourceCount(markdownOrder) || this.closed || !current()) return "cancelled";
    const db = await this.open(); if (!db) return this.storage.unavailableReason?.() ?? "storage-unavailable";
    let stagingRevision: string | null = null;
    try {
      const settled = await this.settleLocalDependencyWork(db, sourceId, current);
      if (settled !== "ready") return settled;
      let selected = await this.localDependencySelection(db, sourceId, current);
      const inspection = await this.inspect(sourceId, [], current);
      if (!current() || this.closed) return "cancelled";
      const head = inspection.head;
      if (!inspection.saved || !head || inspection.sequence === null || head.state !== "complete") return inspection.reason;

      if (selected.owner) {
        if (selected.owner.state !== "complete" || selected.owner.sourceRevision !== head.sourceRevision
          || selected.owner.sequence !== inspection.sequence) return "dependency-invalid";
        if (selected.owner.version < SOURCE_LOCAL_DEPENDENCY_VERSION) {
          const upgraded = await this.upgradeLocalDependencyOwner(db, selected.owner, head, current);
          if (upgraded !== "ready") return upgraded;
          selected = await this.localDependencySelection(db, sourceId, current);
          if (!selected.owner || selected.owner.version !== SOURCE_LOCAL_DEPENDENCY_VERSION
            || selected.owner.sourceRevision !== head.sourceRevision || selected.owner.sequence !== inspection.sequence) return "dependency-invalid";
        }
        if (selected.owner.order === order && selected.owner.markdownOrder === markdownOrder) return "ready";
        await this.transaction(db, [SOURCE_LOCAL_OWNER_STORE, META_STORE, SOURCE_HEAD_STORE], "readwrite", sourceId, async (transaction) => {
          const rawHead = decodeSourceHead(await unknownValue(transaction.objectStore(SOURCE_HEAD_STORE).get(sourceId)));
          const rawOwner = await unknownValue(transaction.objectStore(SOURCE_LOCAL_OWNER_STORE).get(sourceId));
          const rawState = await unknownValue(transaction.objectStore(META_STORE).get(SOURCE_LOCAL_DEPENDENCY_STATE_KEY));
          if (!rawHead || rawHead.sourceRevision !== head.sourceRevision || rawHead.sequence !== inspection.sequence
            || !validSourceLocalDependencyOwner(rawOwner) || rawOwner.sourceRevision !== head.sourceRevision
            || rawOwner.sequence !== inspection.sequence || !validSourceLocalDependencyState(rawState)) throw new SourceFactError("superseded");
          transaction.objectStore(SOURCE_LOCAL_OWNER_STORE).put({ ...rawOwner, order, markdownOrder });
          transaction.objectStore(META_STORE).put({ ...rawState, revision: rawState.revision + 1 });
        });
        return current() ? "ready" : "cancelled";
      }
      if (selected.state.complete) return "dependency-invalid";

      stagingRevision = head.sourceRevision; this.localStaging.set(sourceId, stagingRevision);
      let rows: SourceLocalDependencyRow[] = []; let bytes = 0; let records = 0; let digest = "0".repeat(64);
      const flush = async (): Promise<void> => {
        if (!rows.length) return;
        const page = rows; rows = []; bytes = 0;
        await this.stageLocalDependencies(db, page, current);
        digest = await this.runtime.digest(digest + JSON.stringify(page.map((row) => row.key)));
        await this.runtime.yield();
        if (!current() || this.closed) throw new SourceFactError("cancelled");
      };
      const add = async (key: string): Promise<void> => {
        const row: SourceLocalDependencyRow = { version: 1, sourceId, sourceRevision: head.sourceRevision, index: records, key };
        const rowBytes = encodedBytes(JSON.stringify(row)) + 1;
        if (rowBytes > SOURCE_MAX_RECORD_BYTES) throw new SourceFactError("decode-budget");
        if (rows.length && (rows.length >= SOURCE_MAX_BATCH_RECORDS || bytes + rowBytes > SOURCE_CHUNK_TARGET_BYTES)) await flush();
        rows.push(row); bytes += rowBytes; records += 1;
        if (rows.length >= SOURCE_MAX_BATCH_RECORDS || bytes >= SOURCE_CHUNK_TARGET_BYTES) await flush();
      };
      for (const key of sourceLocalStructuralBaseKeys(sourceId, head.physical.path)) await add(key);
      const read = await this.readSelected(sourceId, (stamp) => stamp.saved && stamp.sequence === inspection.sequence
        && stamp.head.sourceRevision === head.sourceRevision ? "ready" : "superseded", async (reader) => {
        for (const family of SOURCE_FAMILIES) {
          const reason = await reader.visit(family, async (familyRows) => {
            for (const record of familyRows) for (const key of sourceLocalStoredDependencyKeys(head.physical.path, record)) await add(key);
            return current();
          });
          if (reason !== "ready") throw new SourceFactError(reason, family);
        }
        return true;
      }, current);
      if (read.outcome !== "ready") return read.reason;
      await flush();
      if (!records) throw new SourceFactError("dependency-invalid");

      const selectedByThisCall = await this.transaction(db,
        [SOURCE_LOCAL_DEPENDENCY_STORE, SOURCE_LOCAL_OWNER_STORE, SOURCE_LOCAL_REPAIR_STORE, META_STORE, SOURCE_HEAD_STORE],
        "readwrite", sourceId, async (transaction) => {
          const rawHead = decodeSourceHead(await unknownValue(transaction.objectStore(SOURCE_HEAD_STORE).get(sourceId)));
          const rawState = await unknownValue(transaction.objectStore(META_STORE).get(SOURCE_LOCAL_DEPENDENCY_STATE_KEY));
          const rawOwner = await unknownValue(transaction.objectStore(SOURCE_LOCAL_OWNER_STORE).get(sourceId));
          const rawRepair = await unknownValue(transaction.objectStore(SOURCE_LOCAL_REPAIR_STORE).get(sourceId));
          const staging = rawRepair === undefined ? null
            : validSourceLocalDependencyRepair(rawRepair) && this.isLocalDependencyStaging(rawRepair) ? rawRepair : null;
          if (!rawHead || rawHead.sourceRevision !== head.sourceRevision || rawHead.sequence !== inspection.sequence
            || !validSourceLocalDependencyState(rawState) || rawState.complete || !staging
            || staging.fromRevision !== head.sourceRevision || staging.fromRecords !== records) throw new SourceFactError("superseded");
          if (rawOwner !== undefined) {
            if (!validSourceLocalDependencyOwner(rawOwner) || rawOwner.sourceRevision !== head.sourceRevision
              || rawOwner.sequence !== inspection.sequence || rawOwner.state !== "complete") throw new SourceFactError("superseded");
            if (rawOwner.order !== order || rawOwner.markdownOrder !== markdownOrder) {
              transaction.objectStore(SOURCE_LOCAL_OWNER_STORE).put({ ...rawOwner, order, markdownOrder });
              transaction.objectStore(META_STORE).put({ ...rawState, revision: rawState.revision + 1 });
            }
            transaction.objectStore(SOURCE_LOCAL_REPAIR_STORE).delete(sourceId);
            return false;
          }
          transaction.objectStore(SOURCE_LOCAL_OWNER_STORE).put({ version: SOURCE_LOCAL_DEPENDENCY_VERSION, sourceId, sourceRevision: head.sourceRevision, state: "complete",
            sequence: inspection.sequence, order, markdownOrder, records, digest } satisfies SourceLocalDependencyOwner);
          transaction.objectStore(SOURCE_LOCAL_REPAIR_STORE).put({ version: 1, sourceId, fromRevision: null, fromRecords: 0, fromIndex: 0,
            toRevision: head.sourceRevision, toRecords: records, toIndex: 0 } satisfies SourceLocalDependencyRepair);
          transaction.objectStore(META_STORE).put({ ...rawState, revision: rawState.revision + 1,
            pending: rawState.pending + 1 } satisfies SourceLocalDependencyState);
          return true;
        });
      if (selectedByThisCall) {
        const repaired = await this.repairLocalDependencies(db, sourceId, current);
        if (repaired !== "ready") return repaired;
      }
      return current() ? "ready" : "cancelled";
    } catch (error) { return !current() || this.closed ? "cancelled" : errorReason(error, "dependency-invalid"); }
    finally { if (stagingRevision !== null && this.localStaging.get(sourceId) === stagingRevision) this.localStaging.delete(sourceId); }
  }

  /** Publish closed-world local lookup readiness only after all resumable count journals have completed. */
  async completeLocalDependencyInventory(current: () => boolean = () => true): Promise<SourceReason> {
    try {
      this.localDependencyAvailable(current);
      const db = await this.open(); if (!db) return this.storage.unavailableReason?.() ?? "storage-unavailable";
      const repaired = await this.repairAllLocalDependencies(db, current);
      if (repaired !== "ready") return repaired;
      await this.transaction(db, [META_STORE, SOURCE_LOCAL_REPAIR_STORE], "readwrite", "", async (transaction) => {
        const raw = await unknownValue(transaction.objectStore(META_STORE).get(SOURCE_LOCAL_DEPENDENCY_STATE_KEY));
        const state = raw === undefined ? sourceLocalDependencyState() : validSourceLocalDependencyState(raw) ? raw : null;
        if (!state || state.pending !== 0) throw new SourceFactError("dependency-invalid");
        const pending = await requestValue(transaction.objectStore(SOURCE_LOCAL_REPAIR_STORE).count());
        if (pending !== 0) throw new SourceFactError("dependency-invalid");
        transaction.objectStore(META_STORE).put({ ...state, revision: state.revision + (state.complete ? 0 : 1), complete: true });
      });
      return current() ? "ready" : "cancelled";
    } catch (error) { return errorReason(error, "dependency-invalid"); }
  }

  /** Authenticated source-local lookup. Hot keys continue in bounded pages and publish only after a final fence check. */
  async lookupLocalDependencies(keys: readonly string[], current: () => boolean = () => true): Promise<SourceLocalDependencyLookupResult<Readonly<{
    fence: Readonly<{ revision: number; sequence: number }>; sources: readonly SelectedSourceStamp[]; orders: readonly number[];
    markdownOrders: readonly number[];
    work: Readonly<{ keys: number; keyPages: number; pages: number; rows: number; owners: number; yields: number; peakItems: number; peakBytes: number }>;
  }>>> {
    try {
      this.localDependencyAvailable(current);
      // Snapshot caller-owned key membership before R3 continuation yields can interleave mutation.
      const requestedKeys = [...keys];
      if (!requestedKeys.length || new Set(requestedKeys).size !== requestedKeys.length) throw new SourceFactError("unsupported-scope");
      const db = await this.open(); if (!db) return selectedSourceFailure(this.storage.unavailableReason?.() ?? "storage-unavailable");
      const fence = await this.transaction(db, [META_STORE], "readonly", "", async (transaction) => {
        const meta = transaction.objectStore(META_STORE);
        const rawState = await unknownValue(meta.get(SOURCE_LOCAL_DEPENDENCY_STATE_KEY));
        const sequenceRecord = await unknownValue(meta.get(SOURCE_SEQUENCE_KEY));
        if (!validSourceLocalDependencyState(rawState) || !rawState.complete || rawState.pending !== 0) throw new SourceFactError("dependency-pending");
        if (sequenceRecord !== undefined && (!sourceObject(sequenceRecord) || sequenceRecord.key !== SOURCE_SEQUENCE_KEY
          || !sourceCount(sequenceRecord.value))) throw new SourceFactError("dependency-invalid");
        const sequence = sourceObject(sequenceRecord) && sourceCount(sequenceRecord.value) ? sequenceRecord.value : 0;
        return { revision: rawState.revision, sequence };
      });
      const counts = new Map<string, number>();
      let keyPages = 0, yields = 0;
      for (let offset = 0; offset < requestedKeys.length; offset += SOURCE_MAX_BATCH_RECORDS) {
        const page = requestedKeys.slice(offset, offset + SOURCE_MAX_BATCH_RECORDS);
        const pageCounts = await this.transaction(db, [META_STORE, SOURCE_LOCAL_KEY_STORE], "readonly", "", async (transaction) => {
          const meta = transaction.objectStore(META_STORE);
          const rawState = await unknownValue(meta.get(SOURCE_LOCAL_DEPENDENCY_STATE_KEY));
          const sequenceRecord = await unknownValue(meta.get(SOURCE_SEQUENCE_KEY));
          const sequence = sequenceRecord === undefined ? 0
            : sourceObject(sequenceRecord) && sequenceRecord.key === SOURCE_SEQUENCE_KEY && sourceCount(sequenceRecord.value) ? sequenceRecord.value : -1;
          if (!validSourceLocalDependencyState(rawState) || !rawState.complete || rawState.pending !== 0
            || rawState.revision !== fence.revision || sequence !== fence.sequence) throw new SourceFactError("superseded");
          return Promise.all(page.map(async (key) => {
            const rawKey = await unknownValue(transaction.objectStore(SOURCE_LOCAL_KEY_STORE).get(key));
            const keyState = rawKey === undefined ? { version: 1 as const, key, count: 0 }
              : validSourceLocalDependencyKeyState(rawKey) && rawKey.key === key ? rawKey : null;
            if (!keyState) throw new SourceFactError("dependency-invalid");
            return [key, keyState.count] as const;
          }));
        });
        keyPages += 1;
        for (const [key, count] of pageCounts) counts.set(key, count);
        if (!current() || this.closed) throw new SourceFactError("cancelled");
        if (offset + SOURCE_MAX_BATCH_RECORDS < requestedKeys.length) {
          yields += 1; await this.runtime.yield();
          if (!current() || this.closed) throw new SourceFactError("cancelled");
        }
      }

      const keyBytes = requestedKeys.reduce(
        /** Count keys and count-map entries once, independently of membership page count. */
        (total, value) => total + 2 * value.length + 128, 0);
      if (keyBytes > SOURCE_DECODE_BUDGET_BYTES) throw new SourceFactError("decode-budget");
      const selected = new Map<string, { stamp: SelectedSourceStamp; order: number; markdownOrder: number }>();
      let pagesVisited = 0, rowsVisited = 0, peakItems = 0, peakBytes = 0, retainedBytes = 0;
      for (const key of requestedKeys) {
        let after: IDBValidKey | null = null, active = 0;
        while (current() && !this.closed) {
          const page = await this.transaction(db,
            [META_STORE, SOURCE_LOCAL_DEPENDENCY_STORE, SOURCE_LOCAL_OWNER_STORE, SOURCE_HEAD_STORE], "readonly", "", async (transaction) => {
              const meta = transaction.objectStore(META_STORE);
              const rawState = await unknownValue(meta.get(SOURCE_LOCAL_DEPENDENCY_STATE_KEY));
              const sequenceRecord = await unknownValue(meta.get(SOURCE_SEQUENCE_KEY));
              const sequence = sequenceRecord === undefined ? 0
                : sourceObject(sequenceRecord) && sequenceRecord.key === SOURCE_SEQUENCE_KEY && sourceCount(sequenceRecord.value) ? sequenceRecord.value : -1;
              if (!validSourceLocalDependencyState(rawState) || !rawState.complete || rawState.pending !== 0
                || rawState.revision !== fence.revision || sequence !== fence.sequence) throw new SourceFactError("superseded");
              return new Promise<{ next: IDBValidKey | null; done: boolean; entries: Array<{ row: SourceLocalDependencyRow;
                owner: SourceLocalDependencyOwner | null; head: SourceHead | null }> }>((resolve, reject) => {
                const entries: Array<{ row: SourceLocalDependencyRow; owner: SourceLocalDependencyOwner | null; head: SourceHead | null }> = [];
                let visited = 0, pageBytes = 0; let next: IDBValidKey | null = null;
                const range = IDBKeyRange.bound(after ?? [key], [key, []], after !== null, true);
                const request = transaction.objectStore(SOURCE_LOCAL_DEPENDENCY_STORE).index(SOURCE_LOCAL_LOOKUP_INDEX).openCursor(range);
                request.onerror = () => reject(request.error ?? new SourceFactError("read-error"));
                request.onsuccess = () => {
                  const cursor = request.result;
                  if (!cursor) { resolve({ next, done: true, entries }); return; }
                  const row: unknown = cursor.value;
                  if (!validSourceLocalDependencyRow(row) || row.key !== key) { reject(new SourceFactError("dependency-invalid")); return; }
                  next = cursor.key; visited += 1;
                  const ownerRequest = transaction.objectStore(SOURCE_LOCAL_OWNER_STORE).get(row.sourceId);
                  ownerRequest.onerror = () => reject(ownerRequest.error ?? new SourceFactError("read-error"));
                  ownerRequest.onsuccess = () => {
                    const rawOwner: unknown = ownerRequest.result;
                    const owner = rawOwner === undefined ? null : validSourceLocalDependencyOwner(rawOwner) ? rawOwner : null;
                    if (rawOwner !== undefined && !owner) { reject(new SourceFactError("dependency-invalid")); return; }
                    const headRequest = transaction.objectStore(SOURCE_HEAD_STORE).get(row.sourceId);
                    headRequest.onerror = () => reject(headRequest.error ?? new SourceFactError("read-error"));
                    headRequest.onsuccess = () => {
                      const rawHead: unknown = headRequest.result;
                      const head = decodeSourceHead(rawHead);
                      if (rawHead !== undefined && !head) { reject(new SourceFactError("dependency-invalid")); return; }
                      const entry = { row, owner, head };
                      const size = 2 * estimateReferenceRecordBytes(entry) + 128;
                      if (size > SOURCE_DECODE_BUDGET_BYTES) { reject(new SourceFactError("decode-budget")); return; }
                      pageBytes += size; entries.push(entry);
                      if (visited >= SOURCE_MAX_BATCH_RECORDS || pageBytes >= SOURCE_CHUNK_TARGET_BYTES) resolve({ next, done: false, entries }); else cursor.continue();
                    };
                  };
                };
              });
            });
          pagesVisited += 1;
          rowsVisited += page.entries.length;
          for (const entry of page.entries) {
            const { row, owner, head } = entry;
            if (!owner || !head || owner.state !== "complete" || head.state !== "complete"
              || owner.sourceRevision !== row.sourceRevision || head.sourceRevision !== row.sourceRevision || head.sequence !== owner.sequence) continue;
            active += 1;
            const stamp: SelectedSourceStamp = { head, sequence: head.sequence, saved: true };
            const prior = selected.get(row.sourceId);
            if (prior && prior.stamp.head.sourceRevision !== head.sourceRevision) throw new SourceFactError("dependency-invalid");
            if (!prior) {
              // Full family manifests, physical/host coordinates and map/array entries remain live.
              retainedBytes += 2 * estimateReferenceRecordBytes(stamp) + 256;
              if (retainedBytes > 256 * 1024 * 1024) throw new SourceFactError("decode-budget");
              selected.set(row.sourceId, { stamp, order: owner.order, markdownOrder: owner.markdownOrder });
            }
          }
          peakItems = Math.max(peakItems, selected.size);
          const pageBytes = page.entries.reduce(
            /** Include the currently decoded membership page and all its full heads/families. */
            (total, entry) => total + 2 * estimateReferenceRecordBytes(entry) + 128, 0);
          peakBytes = Math.max(peakBytes, retainedBytes + pageBytes + keyBytes + 32 * selected.size);
          if (!current() || this.closed) throw new SourceFactError("cancelled");
          if (page.done || page.next === null) break;
          if (after !== null && indexedDB.cmp(page.next, after) === 0) throw new SourceFactError("dependency-invalid");
          after = page.next;
          yields += 1;
          await this.runtime.yield();
        }
        if (!current() || this.closed) throw new SourceFactError("cancelled");
        if (active !== counts.get(key)) throw new SourceFactError("dependency-invalid");
      }
      const ordered = [...selected.values()].sort((a, b) => a.order - b.order || a.stamp.head.sourceId.localeCompare(b.stamp.head.sourceId));
      selected.clear(); counts.clear();
      const sources = ordered.map((entry) => entry.stamp);
      const fenceReason = await this.validateLocalDependencies(fence, sources, current);
      if (fenceReason !== "ready") throw new SourceFactError(fenceReason);
      return { outcome: "ready", value: { fence, sources,
        orders: ordered.map((entry) => entry.order), markdownOrders: ordered.map((entry) => entry.markdownOrder),
        work: { keys: requestedKeys.length, keyPages, pages: pagesVisited, rows: rowsVisited, owners: ordered.length,
          yields, peakItems, peakBytes } } };
    } catch (error) { return selectedSourceFailure(errorReason(error, "dependency-invalid")); }
  }

  /** Revalidate a local lookup certificate after compiler/policy awaits without rebuilding anything. */
  async validateLocalDependencies(fence: Readonly<{ revision: number; sequence: number }>, stamps: readonly SelectedSourceStamp[],
    current: () => boolean = () => true): Promise<SourceReason> {
    try {
      this.localDependencyAvailable(current);
      const db = await this.open(); if (!db) return this.storage.unavailableReason?.() ?? "storage-unavailable";
      const same = await this.transaction(db, [META_STORE], "readonly", "", async (transaction) => {
        const state = await unknownValue(transaction.objectStore(META_STORE).get(SOURCE_LOCAL_DEPENDENCY_STATE_KEY));
        const seq = await unknownValue(transaction.objectStore(META_STORE).get(SOURCE_SEQUENCE_KEY));
        return validSourceLocalDependencyState(state) && state.complete && state.pending === 0 && state.revision === fence.revision
          && (seq === undefined ? 0 : sourceObject(seq) && sourceCount(seq.value) ? seq.value : -1) === fence.sequence;
      });
      if (!same) return "superseded";
      const selected = await this.validateSelections(stamps, current);
      if (selected.reason !== "ready") return selected.reason;
      this.localDependencyAvailable(current);
      return "ready";
    } catch (error) { return errorReason(error, "dependency-invalid"); }
  }

  /**
   * Stream unique dependency owners. Each page is filtered against heads in the same transaction;
   * staging and old revisions cannot both contribute. Consumers must still inspect source/family
   * validity before interpretation. This method returns dependencies, never semantic contributions.
   */
  async querySources(kind: SourcePostingKind, key: string, consume: (sourceIds: readonly string[]) => Promise<boolean> | boolean,
    current: () => boolean = () => true): Promise<boolean> {
    const seen = new Set<string>();
    let incomplete = [...this.unsaved].some((id) => !this.memory.has(id) && !this.pendingDeletes.has(id));
    // Unsaved current facts mask an older disk head using the same activated-view boundary.
    for (const source of this.memory.values()) {
      if (!current() || this.closed) return false;
      if (!source.current()) { incomplete = true; continue; }
      if (source.head.state !== "complete" || this.pendingDeletes.has(source.head.sourceId)) continue;
      let matched = false;
      let scanned = 0;
      for (const posting of source.postings.values()) {
        if (posting.kind === kind && posting.key === key) { matched = true; break; }
        if (++scanned % SOURCE_MAX_BATCH_RECORDS === 0) {
          await this.runtime.yield();
          if (!current() || this.closed) return false;
        }
      }
      if (this.memory.get(source.head.sourceId) !== source || !source.current()) { incomplete = true; continue; }
      if (matched) {
        seen.add(source.head.sourceId);
        if (!(await consume([source.head.sourceId]))) return false;
      }
    }
    const db = await this.open(); if (!db) return false;
    let after: IDBValidKey | null = null;
    try {
      while (current() && !this.closed) {
        const page = await this.transaction(db, [SOURCE_POSTING_STORE, SOURCE_HEAD_STORE], "readonly", "", (transaction) =>
          new Promise<{ ids: string[]; next: IDBValidKey | null }>((resolve, reject) => {
            const ids: string[] = []; let visited = 0; let next: IDBValidKey | null = null;
            const request = transaction.objectStore(SOURCE_POSTING_STORE).index(SOURCE_LOOKUP_INDEX).openCursor(IDBKeyRange.bound(after ?? [kind, key], [kind, key, []], after !== null, true));
            request.onerror = () => reject(request.error ?? new SourceFactError("read-error"));
            request.onsuccess = () => {
              const cursor = request.result;
              if (!cursor) { resolve({ ids, next }); return; }
              const raw: unknown = cursor.value;
              next = cursor.key; visited += 1;
              /** Advance only after this posting has been checked against the currently selected head. */
              const advance = (): void => { if (visited >= SOURCE_MAX_BATCH_RECORDS) resolve({ ids, next }); else cursor.continue(); };
              if (!validSourcePosting(raw) || raw.kind !== kind || raw.key !== key) { incomplete = true; advance(); return; }
              if (seen.has(raw.sourceId) || this.memory.has(raw.sourceId) || this.unsaved.has(raw.sourceId) || this.pendingDeletes.has(raw.sourceId)) { advance(); return; }
              const headRequest = transaction.objectStore(SOURCE_HEAD_STORE).get(raw.sourceId);
              headRequest.onerror = () => reject(headRequest.error ?? new SourceFactError("read-error"));
              headRequest.onsuccess = () => {
                const head = decodeSourceHead(headRequest.result);
                if (!head && headRequest.result !== undefined) incomplete = true;
                const manifest = head?.families[raw.family];
                if (head?.state === "complete" && manifest?.revision === raw.revision && raw.index < manifest.postings) { seen.add(raw.sourceId); ids.push(raw.sourceId); }
                advance();
              };
            };
          }));
        if (!current() || this.closed || !(await consume(page.ids))) return false;
        if (page.next === null || after !== null && indexedDB.cmp(page.next, after) === 0) {
          incomplete ||= [...this.unsaved].some((id) => !this.memory.has(id) && !this.pendingDeletes.has(id));
          return !incomplete && current() && !this.closed;
        }
        after = page.next;
        await this.runtime.yield();
      }
      return false;
    } catch { return false; }
  }
  /**
   * Reclaim one explicitly known retired or abandoned revision. Source-local rows are removed in
   * bounded pages and each page rechecks head/owner/repair authority, so a concurrent activation can
   * only stop cleanup; it cannot delete a newly selected revision.
   */
  async cleanupRevision(sourceId: string, revision: string, current: () => boolean = () => true): Promise<boolean> {
    if (this.closed || !current() || this.lanes.has(sourceId)) return false;
    const db = await this.open(); if (!db || !current()) return false;
    try {
      const preflight = await this.transaction(db, [SOURCE_HEAD_STORE, SOURCE_LOCAL_OWNER_STORE, SOURCE_LOCAL_REPAIR_STORE],
        "readonly", sourceId, async (transaction) => {
          const [rawHead, owner, repair] = await Promise.all([
            unknownValue(transaction.objectStore(SOURCE_HEAD_STORE).get(sourceId)),
            unknownValue(transaction.objectStore(SOURCE_LOCAL_OWNER_STORE).get(sourceId)),
            unknownValue(transaction.objectStore(SOURCE_LOCAL_REPAIR_STORE).get(sourceId)),
          ]);
          return { rawHead, head: decodeSourceHead(rawHead), owner, repair };
        });
      if (preflight.rawHead !== undefined && !preflight.head) return false;
      if (preflight.head?.sourceRevision === revision
        || (preflight.head && Object.values(preflight.head.families).some((family) => family.revision === revision))) return false;
      if (preflight.owner !== undefined && !validSourceLocalDependencyOwner(preflight.owner)) return false;
      if (validSourceLocalDependencyOwner(preflight.owner) && preflight.owner.sourceRevision === revision) return false;
      if (preflight.repair !== undefined && !validSourceLocalDependencyRepair(preflight.repair)) return false;
      if (validSourceLocalDependencyRepair(preflight.repair) && this.isLocalDependencyPrivateRepair(preflight.repair)
        && preflight.repair.fromRevision === revision) {
        if (await this.cleanupStagedLocalDependencies(db, sourceId, current) !== "ready") return false;
      }
    } catch { return false; }
    const stores = [SOURCE_HEAD_STORE, SOURCE_CHUNK_STORE, SOURCE_POSTING_STORE, SOURCE_LOCAL_DEPENDENCY_STORE,
      SOURCE_LOCAL_OWNER_STORE, SOURCE_LOCAL_REPAIR_STORE, META_STORE];
    const authorized = async (transaction: IDBTransaction): Promise<boolean> => {
      const [rawHead, rawOwner, rawRepair] = await Promise.all([
        unknownValue(transaction.objectStore(SOURCE_HEAD_STORE).get(sourceId)),
        unknownValue(transaction.objectStore(SOURCE_LOCAL_OWNER_STORE).get(sourceId)),
        unknownValue(transaction.objectStore(SOURCE_LOCAL_REPAIR_STORE).get(sourceId)),
      ]);
      const head = decodeSourceHead(rawHead);
      if (rawHead !== undefined && !head) return false;
      if (head?.sourceRevision === revision || (head && Object.values(head.families).some((family) => family.revision === revision))) return false;
      if (rawOwner !== undefined && !validSourceLocalDependencyOwner(rawOwner)) return false;
      if (validSourceLocalDependencyOwner(rawOwner) && rawOwner.sourceRevision === revision) return false;
      if (rawRepair !== undefined && !validSourceLocalDependencyRepair(rawRepair)) return false;
      if (validSourceLocalDependencyRepair(rawRepair) && !this.isLocalDependencyPrivateRepair(rawRepair)
        && (rawRepair.fromRevision === revision || rawRepair.toRevision === revision)) return false;
      if (this.localStaging.get(sourceId) === revision) return false;
      const leases = await requestValue(transaction.objectStore(META_STORE).index(SOURCE_LEASE_INDEX).count(IDBKeyRange.only([sourceId, revision])));
      return leases === 0 && current() && !this.closed;
    };
    try {
      let after: IDBValidKey | null = null;
      while (current() && !this.closed) {
        const page = await this.transaction(db, stores, "readwrite", sourceId, async (transaction) => {
          if (!(await authorized(transaction))) return { allowed: false, next: null as IDBValidKey | null, done: true };
          return new Promise<{ allowed: boolean; next: IDBValidKey | null; done: boolean }>((resolve, reject) => {
            const store = transaction.objectStore(SOURCE_LOCAL_DEPENDENCY_STORE);
            const range = IDBKeyRange.bound(after ?? [sourceId, revision, 0], [sourceId, revision, Number.MAX_SAFE_INTEGER], after !== null, false);
            const request = store.openCursor(range); let count = 0; let next: IDBValidKey | null = null;
            request.onerror = () => reject(request.error ?? new SourceFactError("read-error"));
            request.onsuccess = () => {
              const cursor = request.result;
              if (!cursor) { resolve({ allowed: true, next, done: true }); return; }
              const row: unknown = cursor.value;
              if (!validSourceLocalDependencyRow(row) || row.sourceId !== sourceId || row.sourceRevision !== revision) {
                reject(new SourceFactError("dependency-invalid")); return;
              }
              next = cursor.primaryKey; cursor.delete(); count += 1;
              if (count >= SOURCE_MAX_BATCH_RECORDS) resolve({ allowed: true, next, done: false }); else cursor.continue();
            };
          });
        });
        if (!page.allowed) return false;
        if (page.done || page.next === null) break;
        if (after !== null && indexedDB.cmp(after, page.next) === 0) return false;
        after = page.next;
        await this.runtime.yield();
      }
      if (!current() || this.closed) return false;
      return await this.transaction(db, stores, "readwrite", sourceId, async (transaction) => {
        if (!(await authorized(transaction))) return false;
        const rawRepair = await unknownValue(transaction.objectStore(SOURCE_LOCAL_REPAIR_STORE).get(sourceId));
        if (validSourceLocalDependencyRepair(rawRepair) && this.isLocalDependencyPrivateRepair(rawRepair)
          && rawRepair.fromRevision === revision) transaction.objectStore(SOURCE_LOCAL_REPAIR_STORE).delete(sourceId);
        for (const storeName of [SOURCE_CHUNK_STORE, SOURCE_POSTING_STORE]) {
          const range = IDBKeyRange.bound([sourceId, revision, "", 0], [sourceId, revision, "\uffff", Number.MAX_SAFE_INTEGER]);
          transaction.objectStore(storeName).delete(range);
        }
        return true;
      });
    } catch { this.diagnostics.lastReason = "catalog-uncertain"; return false; }
  }

  /** Keep one retry timer and no write queue; backoff saturates at thirty seconds. */
  private scheduleRetry(): void {
    if (this.closed || this.retryTimer !== null || this.retryTask || !this.memory.size && !this.pendingDeletes.size && !this.hostChange) return;
    const delay = this.retryFailures === 0 ? 1000 : this.retryFailures === 1 ? 5000 : 30000;
    this.retryTimer = this.runtime.schedule(() => { this.retryTimer = null; void this.flush(); }, delay);
  }
  /**
   * Explicit durable stop/retry boundary. A successful return means no known unsaved source remains;
   * unload does not await this. Retry regenerates bounded writes from the identical encoded facts.
   * Retired impact pins are also retried; their outcome does not redefine the source-durability result.
   */
  async flush(): Promise<boolean> {
    if (this.closed) return false;
    await this.retryRetiredContributorLeases();
    if (this.closed) return false;
    // Include active and replaceable pending lanes; draining a completed promise may install the
    // next lane, so repeat until producers have crossed their explicit final-family boundary.
    while (this.lanes.size && !this.closed) {
      await Promise.all([...this.lanes.values()].map((lane) => lane.active));
      await Promise.resolve();
    }
    if (this.deleteTask) await this.deleteTask;
    if (this.closed) return false;
    if (this.retryTimer !== null) this.runtime.cancel(this.retryTimer);
    this.retryTimer = null;
    if (!this.retryTask) this.retryTask = this.retryMemory();
    await this.retryTask;
    this.retryTask = null;
    if (this.hostJournalTask) await this.hostJournalTask;
    if (this.hostChange) await this.flushContributorHostChange();
    const complete = this.unsaved.size === 0 && !this.hostChange;
    if (complete) this.retryFailures = 0; else this.retryFailures += 1;
    this.scheduleRetry();
    return complete;
  }
  /** Revalidate source lifetime and the previous disk head before any storage-degraded retry. */
  private async retryMemory(): Promise<void> {
    if (this.hostChange) await this.flushContributorHostChange();
    for (const [sourceId, pending] of [...this.pendingDeletes]) {
      if (this.closed) return;
      if (this.pendingDeletes.get(sourceId) !== pending) continue;
      if (!pending.current()) {
        // Cancellation is not an authoritative observation of either presence or absence. Stop
        // retrying this request, but keep its unsaved/durable dirty masks until a real replacement
        // or a newly authorized deletion settles them. Never delete a newer request from a snapshot.
        this.pendingDeletes.delete(sourceId);
        continue;
      }
      await this.tombstone(sourceId, pending.current, pending.retain, pending.ready);
    }
    for (const source of [...this.memory.values()]) {
      if (this.closed) return;
      if (source.head.state === "tombstone" || !source.current() || this.lanes.has(source.head.sourceId)) continue;
      const db = await this.open(); if (!db) return;
      let expected = source.expected;
      try {
        const raw = await this.transaction(db, [SOURCE_HEAD_STORE], "readonly", source.head.sourceId,
          (transaction) => unknownValue(transaction.objectStore(SOURCE_HEAD_STORE).get(source.head.sourceId)));
        if (!source.current()) continue;
        if (expected.kind === "unavailable") {
          // Never let an unavailable-catalog retry overwrite an independently activated disk head.
          if (raw !== undefined) continue;
          expected = { kind: "missing" };
        }
        if (!expectedHeadMatches(expected, raw)) continue;
        const families = Object.fromEntries(SOURCE_FAMILIES.map((family) => [family, async (emit: (fact: StoredSourceFact | null) => Promise<boolean>): Promise<boolean> => {
          const view: SourceView = { head: source.head, sequence: null, saved: false, expected, leases: [], memory: source };
          return await this.visitFamily(view, family, async (records) => {
            for (const record of records) if (!(await emit(record))) return false;
            return true;
          }, source.current) === "ready";
        }])) as Record<SourceFamily, SourceFamilyProducer>;
        await this.replace({ sourceId: source.head.sourceId, physical: source.head.physical, observation: source.head.observation, expected, families }, source.current);
      } catch { return; }
    }
  }
}
