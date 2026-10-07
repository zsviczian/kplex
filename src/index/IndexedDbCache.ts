/**
 * Vault-local IndexedDB storage for neutral source facts, parsed bodies and graph snapshots.
 * Complete and partial checkpoint metadata point to independent chunk generations only after
 * their writes finish; callers own semantic validity, disposable URL-facet versions and plugin-lifetime cancellation. Retired
 * contributor pins may use one cleanup-only existing-database connection after normal-handle
 * failure; cleanup never resets write backoff or acquires source/publication authority. Attributed
 * source cancellation/domain rollback AbortErrors preserve the healthy shared connection; genuine
 * storage faults still close the handle and enter the existing bounded recovery backoff. A caller
 * may observe completed neutral-source work without receiving identities/content or acquiring
 * source readiness; the repository owns observer isolation and closed-lifetime fencing.
 * Snapshot decoding and mobile write batches release CPU slices through host event tasks; connection
 * opening, delayed body writes and failure recovery retain their actual timed waits.
 * Settings-only maintenance estimates logical payloads through sequential cursors. Purging ends
 * this owner's lifetime before deleting this vault's database; no same-session reopen is allowed.
 */
import { yieldToHostTask } from "../adapters/obsidian/yieldToHostTask";
import { sanitizeChangedSettingKeys, type SettingDiagnosticKey } from "../core/graph/settingsPolicy";
import { Platform } from "obsidian";
import { NeutralSourceRepository, SOURCE_HEAD_STORE, SOURCE_CHUNK_STORE, SOURCE_POSTING_STORE,
  SOURCE_REVISION_INDEX, SOURCE_FAMILY_INDEX, SOURCE_LOOKUP_INDEX, SOURCE_LEASE_INDEX } from "./SourceRepository";
import { SOURCE_LOCAL_DEPENDENCY_STATE_KEY, SOURCE_LOCAL_DEPENDENCY_STORE, SOURCE_LOCAL_KEY_STORE, SOURCE_LOCAL_LOOKUP_INDEX, SOURCE_LOCAL_OWNER_STORE, SOURCE_LOCAL_REPAIR_STORE,
  SOURCE_LOCAL_REVISION_INDEX, sourceLocalDependencyState } from "./SourceLocalDependencies";
import { SOURCE_DEPENDENCY_STORE, sourceDependencyState, validSourceFact } from "./SourceFacts";
import type { ParsedBodyMetadata } from "../core/parser/metadata";
import type { PersistedEvidenceDeclaration, PersistedPage } from "./IndexSnapshot";

import { SOURCE_IMPACT_STORE, SOURCE_IMPACT_SLOT_INDEX, SOURCE_IMPACT_LEASE_INDEX } from "./SourceContributorJournal";

import { releaseContributorRootLeaseFresh, type ContributorRootLease } from "./SourceContributorLease";

const DB_VERSION = 10;
const BODY_CACHE_VERSION = 3;
const META_STORE = "meta";
const PAGE_STORE = "pages";
const EVIDENCE_STORE = "evidence";
const BODY_STORE = "bodies";
const URL_STORE = "urlOwners";
const URL_CACHE_VERSION = 3;
const SNAPSHOT_CHUNK_STORE = "snapshotChunks";
const GENERATION_INDEX = "generation";

/** Disposable URL alias facets produced by the current compiler; neutral sources and DB schema stay unchanged. */
export const URL_ALIAS_FACET_VERSION = 2;

export type IndexedDbSnapshotMeta = {
  key: "active" | "checkpoint";
  schema: 1 | 2 | 3;
  generation: string;
  createdAt: number;
  vaultSignature: string;
  settingsSignature: string;
  /** Missing/zero marks legacy URL aliases requiring node-only replay, not a source migration. */
  urlAliasVersion?: number;
  discoveredFields: Array<[string, { name: string; count: number }]>;
  /** Present for schema 3 snapshots. Older generations fall back to per-record cursors. */
  pageChunkCount?: number;
  evidenceChunkCount?: number;
  /** A checkpoint contains the full structural baseline but only these completed Markdown sources. */
  completedMarkdownPaths?: string[];
};

/** Local, bounded decision history. Contains counts and reason codes, never vault paths/content. */
export type IndexDiagnosticEntry = {
  at: number;
  stage: "restore" | "reconcile" | "build" | "persist";
  reason: string;
  added?: number;
  removed?: number;
  modified?: number;
  completedMarkdownFiles?: number;
  durationMs?: number;
  changedKeys?: SettingDiagnosticKey[];
};

/** Revalidate stored history and public exports without copying arbitrary diagnostic fields. */
export function sanitizeIndexDiagnostics(entries: readonly unknown[]): IndexDiagnosticEntry[] {
  return entries.flatMap((item): IndexDiagnosticEntry[] => {
    if (!isUnknownRecord(item) || typeof item.at !== "number" || !Number.isFinite(item.at) || typeof item.reason !== "string" ||
      !/^[a-z0-9:|_-]{1,240}$/.test(item.reason) ||
      (item.stage !== "restore" && item.stage !== "reconcile" && item.stage !== "build" && item.stage !== "persist")) return [];
    const sanitized: IndexDiagnosticEntry = { at: item.at, stage: item.stage, reason: item.reason };
    for (const key of ["added", "removed", "modified", "completedMarkdownFiles", "durationMs"] as const) {
      const value = item[key];
      if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) sanitized[key] = value;
    }
    const changedKeys = sanitizeChangedSettingKeys(item.changedKeys);
    if (changedKeys.length) sanitized.changedKeys = changedKeys;
    return [sanitized];
  }).slice(-20);
}

/** Path-free reason codes for an unsuccessful snapshot stream. */
export type SnapshotReadFailureReason = "storage-unavailable" | "missing-chunk" | "invalid-chunk" |
  "invalid-record" | "read-error" | "cancelled";

/** Path-free reason codes for a failed generation write. */
export type SnapshotWriteFailureReason = "storage-unavailable" | "cancelled" | "quota-exceeded" | "write-error";

type PageRecord = { generation: string; path: string; value: PersistedPage };
type EvidenceRecord = { generation: string; key: string; value: PersistedEvidenceDeclaration };
type BodyRecord = { path: string; mtime: number; parserVersion: number; body: ParsedBodyMetadata };

/** Reject malformed URL alias payloads before a disposable parser-cache hit reaches live collection. */
function validCachedBody(body: ParsedBodyMetadata | undefined): body is ParsedBodyMetadata {
  return Boolean(body && Array.isArray(body.inlineFieldOccurrences) && Array.isArray(body.urls)
    && body.urls.every(/** Reuse the strict neutral URL vocabulary; never coerce stored alias values. */
      (reference) => validSourceFact({ kind: "body-url", ...reference }, "body-urls")));
}

/** URL-only derived facts retain native revision and parser provenance independently of graph settings. */
export type UrlOwnerRecord = Readonly<{
  path: string; mtime: number; size: number; version: number; parserVersion: number; urls: ParsedBodyMetadata["urls"];
  inlineFieldOccurrences: ParsedBodyMetadata["inlineFieldOccurrences"];
  frontmatter: Record<string, unknown>;
}>;

/** Validate the JSON-like native property payload without recursive stack growth. */
function validUrlPropertyValue(value: unknown): boolean {
  const pending: Array<{ value: unknown; exit?: boolean }> = [{ value }];
  const active = new WeakSet<object>();
  while (pending.length) {
    const frame = pending.pop()!;
    const item = frame.value;
    if (frame.exit) { active.delete(item as object); continue; }
    if (item === null || typeof item === "string" || typeof item === "boolean"
      || typeof item === "number" && Number.isFinite(item)) continue;
    if (!item || typeof item !== "object" || active.has(item)) return false;
    if (item instanceof Date) { if (!Number.isFinite(item.getTime())) return false; continue; }
    active.add(item);
    pending.push({ value: item, exit: true });
    if (Array.isArray(item)) for (const nested of item) pending.push({ value: nested });
    else if (isUnknownRecord(item)) for (const nested of Object.values(item)) pending.push({ value: nested });
    else return false;
  }
  return true;
}

/** Validate optional cache data before publishing any URL owner; malformed records become cold misses. */
function validUrlOwner(value: unknown): value is UrlOwnerRecord {
  return isUnknownRecord(value) && typeof value.path === "string" && typeof value.mtime === "number"
    && Number.isFinite(value.mtime) && typeof value.size === "number" && Number.isSafeInteger(value.size)
    && value.size >= 0 && value.version === URL_CACHE_VERSION && value.parserVersion === BODY_CACHE_VERSION && isUnknownRecord(value.frontmatter)
    && Object.values(value.frontmatter).every(validUrlPropertyValue) && Array.isArray(value.inlineFieldOccurrences)
    && value.inlineFieldOccurrences.every(item => isUnknownRecord(item) && typeof item.name === "string"
      && typeof item.normalizedName === "string" && typeof item.value === "string" && Number.isSafeInteger(item.line) && Number(item.line) >= 0
      && Number.isSafeInteger(item.start) && Number(item.start) >= 0 && Number.isSafeInteger(item.end)
      && Number(item.end) >= Number(item.start)
      && (item.syntax === "line" || item.syntax === "bracketed" || item.syntax === "parenthesized")) && Array.isArray(value.urls)
    && value.urls.every(/** Use the accepted URL-fact validator rather than coercing labels/provenance. */
      reference => isUnknownRecord(reference) && validSourceFact({ kind: "body-url", ...reference }, "body-urls"));
}

type SnapshotChunkRecord = {
  generation: string;
  kind: "pages" | "evidence";
  index: number;
  values: PersistedPage[] | PersistedEvidenceDeclaration[];
};

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  const done = new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
  });
  void done.catch(() => undefined);
  return done;
}

function requestUnknownResult(request: IDBRequest): Promise<unknown> {
  return new Promise<unknown>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function legacySourceLocalDependencyState(value: unknown): value is Readonly<{
  key: typeof SOURCE_LOCAL_DEPENDENCY_STATE_KEY; version: 1; revision: number; complete: boolean;
}> {
  return isUnknownRecord(value) && Object.keys(value).length === 4 && value.key === SOURCE_LOCAL_DEPENDENCY_STATE_KEY
    && value.version === 1 && typeof value.revision === "number" && Number.isSafeInteger(value.revision) && value.revision >= 0
    && typeof value.complete === "boolean";
}


function stringStorageBytes(value: string | null | undefined): number {
  return value ? value.length * 2 : 0;
}

function estimatedPageBytes(page: PersistedPage): number {
  let bytes = 256
    + stringStorageBytes(page.path)
    + stringStorageBytes(page.filePath)
    + stringStorageBytes(page.name)
    + stringStorageBytes(page.url)
    + stringStorageBytes(page.noteType)
    + stringStorageBytes(page.primaryStyleTag)
    + stringStorageBytes(page.semanticSignature);
  for (const value of page.aliases) bytes += 24 + stringStorageBytes(value);
  for (const value of page.tags) bytes += 24 + stringStorageBytes(value);
  for (const value of page.styleTags) bytes += 24 + stringStorageBytes(value);
  for (const relation of page.relations ?? []) {
    bytes += 192
      + stringStorageBytes(relation.targetPath)
      + stringStorageBytes(relation.parentTypeDefinition)
      + stringStorageBytes(relation.childTypeDefinition)
      + stringStorageBytes(relation.leftFriendTypeDefinition)
      + stringStorageBytes(relation.rightFriendTypeDefinition)
      + stringStorageBytes(relation.nextFriendTypeDefinition)
      + stringStorageBytes(relation.previousFriendTypeDefinition);
  }
  return bytes;
}

function estimatedEvidenceBytes(item: PersistedEvidenceDeclaration): number {
  return 224
    + stringStorageBytes(item.sourcePath)
    + stringStorageBytes(item.targetPath)
    + stringStorageBytes(item.definition)
    + stringStorageBytes(item.fieldName)
    + stringStorageBytes(item.rawValue);
}

function isIndexedDbSnapshotMeta(value: unknown): value is IndexedDbSnapshotMeta {
  if (!isUnknownRecord(value)) return false;
  const schema = value.schema;
  if (schema !== 1 && schema !== 2 && schema !== 3) return false;
  if ((value.key !== "active" && value.key !== "checkpoint") || typeof value.generation !== "string" || typeof value.createdAt !== "number") return false;
  if (value.key === "checkpoint" && (!Array.isArray(value.completedMarkdownPaths) ||
    !value.completedMarkdownPaths.every((path) => typeof path === "string"))) return false;
  if (typeof value.vaultSignature !== "string" || typeof value.settingsSignature !== "string" || !Array.isArray(value.discoveredFields)) return false;
  if (schema === 3) {
    if (!Number.isInteger(value.pageChunkCount) || !Number.isInteger(value.evidenceChunkCount)) return false;
    if (Number(value.pageChunkCount) < 0 || Number(value.evidenceChunkCount) < 0) return false;
  }
  return true;
}


function safeDbName(vaultName: string): string {
  const encoded = Array.from(new TextEncoder().encode(vaultName))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 96);
  return `k-plex-index-v1-${encoded || "vault"}`;
}

/** Iterate container members without allocating another array proportional to a dense record. */
function* storedValueParts(value: object): Generator<unknown> {
  if (value instanceof Map) {
    for (const [key, item] of value) { yield key; yield item; }
  } else if (value instanceof Set) {
    yield* value.values();
  } else {
    for (const key in value) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
      yield key;
      yield (value as Record<string, unknown>)[key];
    }
  }
}

/**
 * Approximate one cloned record with bounded, cycle-safe iterative traversal. Binary payloads
 * use their byte length; strings use UTF-16 length. A pathological record returns null rather
 * than blocking the settings page indefinitely or reporting an incomplete total as accurate.
 */
function estimatedStoredValueBytes(value: unknown): number | null {
  const stack: Array<Iterator<unknown>> = [[value][Symbol.iterator]()];
  const seen = new WeakSet<object>();
  let bytes = 0;
  let remaining = 1_000_000;
  while (stack.length) {
    if (--remaining < 0 || stack.length > 256) return null;
    const next = stack[stack.length - 1].next();
    if (next.done) { stack.pop(); continue; }
    const item: unknown = next.value;
    if (typeof item === "string") bytes += item.length * 2;
    else if (typeof item === "number") bytes += 8;
    else if (typeof item === "boolean" || item === null || item === undefined) bytes += 4;
    else if (typeof item === "bigint") bytes += item.toString().length * 2 + 8;
    else if (typeof item === "object") {
      if (seen.has(item)) { bytes += 8; continue; }
      seen.add(item);
      if (item instanceof ArrayBuffer || ArrayBuffer.isView(item)) bytes += item.byteLength + 24;
      else if (item instanceof Blob) bytes += item.size + item.type.length * 2 + 24;
      else if (item instanceof Date) bytes += 8;
      else if (item instanceof RegExp) bytes += (item.source.length + item.flags.length) * 2 + 24;
      else { bytes += 32; stack.push(storedValueParts(item)); }
    } else return null;
    if (!Number.isSafeInteger(bytes)) return null;
  }
  return bytes;
}

/** Durable K-Plex cache backed by IndexedDB. */
export class KplexIndexedDbCache {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private openFailureCount = 0;
  private openRetryAfter = 0;
  private queuedBodyWrites = new Map<string, { path: string; mtime: number; body: ParsedBodyMetadata }>();
  private bodyWriteTimer: number | null = null;
  private bodyWriteInFlight = false;

  readonly sources: NeutralSourceRepository;
  private closed = false;
  private connection: IDBDatabase | null = null;
  private openEpoch = 0;
  private newerDatabase = false;
  private maintenanceReads = new Set<IDBTransaction>();
  private purgePromise: Promise<boolean> | null = null;

  /** Share one connection owner; forward optional source-work observation without changing storage scheduling. */
  constructor(private vaultName: string, private readonly backgroundCheckpoint?: () => Promise<void>, completedWork?: () => void) {
    this.sources = new NeutralSourceRepository({ open: () => this.open(), failed: (db) => this.storageFailed(db),
      unavailableReason: () => this.newerDatabase ? "newer-database" : "storage-unavailable",
      /** Cleanup borrows no normal writer authority and accepts only an ended reader's lease. */
      releaseContributorLease: lease => this.releaseContributorLease(lease) }, undefined, completedWork);
  }

  /**
   * Retired-reader cleanup is allowed after unload or normal connection failure. The temporary
   * handle cannot create/upgrade a database, clear backoff, or make this cache available for writes.
   */
  private releaseContributorLease(lease: ContributorRootLease): Promise<boolean> {
    if (this.purgePromise || typeof indexedDB === "undefined") return Promise.resolve(false);
    return releaseContributorRootLeaseFresh(indexedDB, safeDbName(this.vaultName), DB_VERSION, lease, {
      /** Use the storage owner's window, matching the normal connection lifetime. */
      schedule: (callback, delay) => window.setTimeout(callback, delay),
      /** Every settled attempt disposes its owned timeout. */
      cancel: timer => window.clearTimeout(timer),
    });
  }

  /** Clear only the failed handle; never erase stores or neutral heads on a cache failure. */
  private storageFailed(db: IDBDatabase): void {
    try { db.close(); } catch { /* already closed */ }
    if (this.connection !== db) return;
    this.connection = null;
    this.dbPromise = null;
    this.openEpoch += 1;
    this.openFailureCount += 1;
    this.openRetryAfter = Date.now() + (this.openFailureCount === 1 ? 1000 : this.openFailureCount === 2 ? 5000 : 30000);
  }

  /** Ignore only native AbortErrors from a source transaction deliberately canceled or rolled back. */
  private isExpectedSourceAbort(event: Event): boolean {
    const target = event.target;
    const transaction = target instanceof IDBRequest ? target.transaction : target instanceof IDBTransaction ? target : null;
    const error = target instanceof IDBRequest || target instanceof IDBTransaction ? target.error : null;
    return error?.name === "AbortError" && transaction !== null && this.sources.isExpectedTransactionAbort(transaction);
  }

  /** A synchronously closed/invalid legacy transaction must not leave the shared owner ready. */
  private openTransaction(db: IDBDatabase, stores: string | string[], mode: IDBTransactionMode): IDBTransaction {
    try { return db.transaction(stores, mode); }
    catch (error) { this.storageFailed(db); throw error; }
  }

  /** Lazily open v10 with bounded backoff and reject late, blocked or newer-version connections. */
  private open(): Promise<IDBDatabase | null> {
    if (this.closed || this.newerDatabase) return Promise.resolve(null);
    if (this.dbPromise) return this.dbPromise;
    if (Date.now() < this.openRetryAfter) return Promise.resolve(null);
    const epoch = ++this.openEpoch;
    // Defer the executor so synchronous failure cannot re-memoize a resolved-null promise.
    const pending = Promise.resolve().then(() => new Promise<IDBDatabase | null>((resolve) => {
      let settled = false;
      let openTimeout: number | null = null;
      const clearOpenTimeout = (): void => {
        if (openTimeout !== null) window.clearTimeout(openTimeout);
        openTimeout = null;
      };
      const fail = (): void => {
        if (settled) return;
        settled = true;
        clearOpenTimeout();
        this.openFailureCount += 1;
        const delay = this.openFailureCount === 1 ? 1000 : this.openFailureCount === 2 ? 5000 : 30000;
        this.openRetryAfter = Date.now() + delay;
        if (this.openEpoch === epoch) this.dbPromise = null;
        resolve(null);
      };
      try {
        if (this.closed || epoch !== this.openEpoch || typeof indexedDB === "undefined") { fail(); return; }
        const request = indexedDB.open(safeDbName(this.vaultName), DB_VERSION);
        // IndexedDB open can remain pending for a surprisingly long time in a busy WebView. The
        // cache is only an optimization, so cold startup degrades to vault reads instead of waiting
        // minutes for storage. A late success is closed by the settled guard below.
        openTimeout = window.setTimeout(fail, Platform.isMobile ? 2500 : 1800);
        request.onupgradeneeded = (event) => {
          if (settled || this.closed || epoch !== this.openEpoch) { request.transaction?.abort(); return; }
          const db = request.result;
          if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: "key" });
          if (!db.objectStoreNames.contains(PAGE_STORE)) {
            const store = db.createObjectStore(PAGE_STORE, { keyPath: ["generation", "path"] });
            store.createIndex(GENERATION_INDEX, "generation", { unique: false });
          }
          if (!db.objectStoreNames.contains(EVIDENCE_STORE)) {
            const store = db.createObjectStore(EVIDENCE_STORE, { keyPath: ["generation", "key"] });
            store.createIndex(GENERATION_INDEX, "generation", { unique: false });
          }
          if (!db.objectStoreNames.contains(BODY_STORE)) db.createObjectStore(BODY_STORE, { keyPath: "path" });
          // v10 adds only a disposable URL-owner cache; neutral sources and graph generations remain intact.
          if (!db.objectStoreNames.contains(URL_STORE)) db.createObjectStore(URL_STORE, { keyPath: "path" });
          if (!db.objectStoreNames.contains(SNAPSHOT_CHUNK_STORE)) {
            const store = db.createObjectStore(SNAPSHOT_CHUNK_STORE, { keyPath: ["generation", "kind", "index"] });
            store.createIndex(GENERATION_INDEX, "generation", { unique: false });
          }
          // Version 5 adds only neutral-source storage. Legacy graph schemas and body-v2
          // records remain readable and are migrated lazily by the source adapter.
          if (!db.objectStoreNames.contains(SOURCE_HEAD_STORE)) {
            db.createObjectStore(SOURCE_HEAD_STORE, { keyPath: "sourceId" });
          }
          for (const name of [SOURCE_CHUNK_STORE, SOURCE_POSTING_STORE]) {
            if (db.objectStoreNames.contains(name)) continue;
            const store = db.createObjectStore(name, { keyPath: ["sourceId", "revision", "family", "index"] });
            store.createIndex(SOURCE_REVISION_INDEX, ["sourceId", "revision"]);
            store.createIndex(SOURCE_FAMILY_INDEX, ["sourceId", "revision", "family"]);
            if (name === SOURCE_POSTING_STORE) store.createIndex(SOURCE_LOOKUP_INDEX, ["kind", "key", "sourceId", "revision", "family", "index"]);
          }
          // v6 adds an independently rebuildable, two-slot dependency catalog. No source head,
          // body, graph pointer or reader lease is rewritten by this upgrade.
          if (!db.objectStoreNames.contains(SOURCE_DEPENDENCY_STORE)) {
            db.createObjectStore(SOURCE_DEPENDENCY_STORE, { keyPath: ["slot", "bucket", "index"] });
            request.transaction?.objectStore(META_STORE).put(sourceDependencyState(0, 0));
          }
          // v7 retains all v5/v6 bytes and adds only durable repair owners and root-slot leases.
          if (!db.objectStoreNames.contains(SOURCE_IMPACT_STORE)) {
            db.createObjectStore(SOURCE_IMPACT_STORE, { keyPath: "owner" }).createIndex(SOURCE_IMPACT_SLOT_INDEX, "slot");
          }
          // v8 adds an incrementally maintained source-local dependency derivative. Immutable rows
          // are selected by a per-source owner activated with the source head; no vault-wide catalog
          // is built or migrated during this schema upgrade.
          if (!db.objectStoreNames.contains(SOURCE_LOCAL_DEPENDENCY_STORE)) {
            const store = db.createObjectStore(SOURCE_LOCAL_DEPENDENCY_STORE, { keyPath: ["sourceId", "sourceRevision", "index"] });
            store.createIndex(SOURCE_LOCAL_LOOKUP_INDEX, ["key", "sourceId", "sourceRevision", "index"]);
            store.createIndex(SOURCE_LOCAL_REVISION_INDEX, ["sourceId", "sourceRevision"]);
          }
          if (!db.objectStoreNames.contains(SOURCE_LOCAL_OWNER_STORE)) db.createObjectStore(SOURCE_LOCAL_OWNER_STORE, { keyPath: "sourceId" });
          if (!db.objectStoreNames.contains(SOURCE_LOCAL_KEY_STORE)) db.createObjectStore(SOURCE_LOCAL_KEY_STORE, { keyPath: "key" });
          // v9 adds only the durable source-local repair journal plus the pending counter on the
          // existing state record. Accepted v8 rows and every unrelated store stay untouched.
          const hadLocalRepairStore = db.objectStoreNames.contains(SOURCE_LOCAL_REPAIR_STORE);
          if (!hadLocalRepairStore) db.createObjectStore(SOURCE_LOCAL_REPAIR_STORE, { keyPath: "sourceId" });
          const meta = request.transaction?.objectStore(META_STORE);
          if (meta && request.transaction && event.oldVersion < 8) {
            meta.put(sourceLocalDependencyState());
          } else if (meta && request.transaction && event.oldVersion === 8) {
            // The accepted d61dc7f v8 schema has source-local rows/owners/key counts and a four-field
            // state record, but no repair store. Preserve every accepted byte and only add pending: 0.
            const state = meta.get(SOURCE_LOCAL_DEPENDENCY_STATE_KEY);
            state.onsuccess = () => {
              const raw: unknown = state.result;
              if (legacySourceLocalDependencyState(raw)) meta.put({ ...raw, pending: 0 });
            };
          }
          if (meta && !meta.indexNames.contains(SOURCE_IMPACT_LEASE_INDEX)) meta.createIndex(SOURCE_IMPACT_LEASE_INDEX, "impactSlot");
          if (meta && !meta.indexNames.contains(SOURCE_LEASE_INDEX)) meta.createIndex(SOURCE_LEASE_INDEX, ["sourceId", "revision"]);
        };
        request.onsuccess = () => {
          const db = request.result;
          if (settled || this.closed || epoch !== this.openEpoch) {
            // A blocked request can later succeed after we already degraded for this attempt.
            // Never leak that late connection or let it replace a newer successful retry.
            try { db.close(); } catch { /* stale open only */ }
            return;
          }
          settled = true;
          clearOpenTimeout();
          this.openFailureCount = 0;
          this.openRetryAfter = 0;
          this.connection = db;
          db.onversionchange = () => { this.storageFailed(db); };
          db.onclose = () => { this.storageFailed(db); };
          db.onerror = (event) => { if (!this.isExpectedSourceAbort(event)) this.storageFailed(db); };
          db.onabort = (event) => {
            if (!this.isExpectedSourceAbort(event) && event.target instanceof IDBTransaction && event.target.error) this.storageFailed(db);
          };
          resolve(db);
        };
        request.onerror = () => {
          if (request.error?.name === "VersionError") this.newerDatabase = true;
          fail();
        };
        request.onblocked = fail;
      } catch {
        fail();
      }
    }));
    this.dbPromise = pending;
    return pending;
  }



  /** Fence pending opens/source writes immediately; unload never waits for asynchronous persistence. */
  close(): void {
    this.closed = true;
    this.openEpoch += 1;
    this.sources.close();
    for (const transaction of this.maintenanceReads) {
      try { transaction.abort(); } catch { /* A completed estimate already released its cursor. */ }
    }
    this.maintenanceReads.clear();
    this.connection = null;
    if (this.bodyWriteTimer !== null) window.clearTimeout(this.bodyWriteTimer);
    this.bodyWriteTimer = null;
    this.queuedBodyWrites.clear();
    const pending = this.dbPromise;
    this.dbPromise = null;
    void pending?.then((db) => {
      try { db?.close(); } catch { /* shutdown only */ }
    });
  }

  /**
   * Settings-only, best-effort logical payload size for this database. One readonly cursor per
   * store avoids retaining all source records or counting unrelated origin storage. Closing the
   * owner cancels an in-flight estimate; unavailable, failed or oversized records return null.
   */
  async estimateStoredBytes(): Promise<number | null> {
    const db = await this.open();
    if (!db || this.closed) return null;
    let bytes = 0;
    try {
      for (const name of Array.from(db.objectStoreNames)) {
        if (this.closed) return null;
        const measured = await this.estimateStoreBytes(db, name);
        if (measured === null || this.closed) return null;
        bytes += measured;
        if (!Number.isSafeInteger(bytes)) return null;
      }
      return bytes;
    } catch { return null; }
  }

  /** Own a single streaming transaction and acknowledge a subtotal only after it commits. */
  private estimateStoreBytes(db: IDBDatabase, name: string): Promise<number | null> {
    return new Promise<number | null>(/** Cursor values stay private to the storage owner. */ resolve => {
      let transaction: IDBTransaction | undefined;
      let bytes = 0;
      let complete = false;
      let settled = false;
      /** Clear maintenance ownership exactly once on every terminal transaction/request event. */
      const finish = (result: number | null): void => {
        if (settled) return;
        settled = true;
        if (transaction) this.maintenanceReads.delete(transaction);
        resolve(result);
      };
      /** Stop the current cursor on cancellation or a malformed/unbounded record. */
      const fail = (): void => {
        try { transaction?.abort(); } catch { /* Already terminal or never opened. */ }
        finish(null);
      };
      try {
        transaction = this.openTransaction(db, name, "readonly");
        this.maintenanceReads.add(transaction);
        transaction.oncomplete = /** In-flight requests alone never certify a complete scan. */ () => finish(complete && !this.closed ? bytes : null);
        transaction.onabort = /** Closing the cache cancels settings maintenance. */ () => finish(null);
        transaction.onerror = fail;
        const request = transaction.objectStore(name).openCursor();
        request.onerror = fail;
        request.onsuccess = /** Process only this cursor record before requesting the next host task. */ () => {
          if (settled || this.closed) { fail(); return; }
          const cursor = request.result;
          if (!cursor) { complete = true; return; }
          try {
            const measured = estimatedStoredValueBytes([cursor.key, cursor.value]);
            if (measured === null || !Number.isSafeInteger(bytes + measured)) { fail(); return; }
            bytes += measured;
            cursor.continue();
          } catch { fail(); }
        };
      } catch { fail(); }
    });
  }

  /**
   * End this cache/repository lifetime, discard queued body writes and delete only this vault's
   * K-Plex database. Blocked/error results are false; a failed purge still requires restart because
   * this owner remains closed. Concurrent calls share the same deletion request.
   */
  purgeAndClose(): Promise<boolean> {
    if (this.purgePromise) return this.purgePromise;
    const pending = this.dbPromise;
    // Assign the promise before close retires source readers: their cleanup cannot reopen a
    // database which is being deleted. The microtask also lets close install its late-open fence.
    this.purgePromise = Promise.resolve().then(/** Wait for any pending normal handle to close before deletion. */ async () => {
      try { await pending; } catch { /* A failed open must not prevent deleting a disposable cache. */ }
      if (typeof indexedDB === "undefined") return false;
      return new Promise<boolean>(/** Only success acknowledges deletion; blocked is a terminal UI failure. */ resolve => {
        try {
          const request = indexedDB.deleteDatabase(safeDbName(this.vaultName));
          request.onsuccess = /** Notes and unrelated database names are never involved. */ () => resolve(true);
          request.onerror = /** Storage failure leaves this instance closed. */ () => resolve(false);
          request.onblocked = /** Another connection must be released through restart. */ () => resolve(false);
        } catch { resolve(false); }
      });
    });
    this.close();
    return this.purgePromise;
  }

  /** Read an activated complete generation or a separately activated partial checkpoint. */
  async readSnapshotMeta(key: "active" | "checkpoint" = "active"): Promise<IndexedDbSnapshotMeta | null> {
    const db = await this.open();
    if (!db) return null;
    try {
      const tx = this.openTransaction(db, META_STORE, "readonly");
      const done = transactionDone(tx);
      const value = await requestUnknownResult(tx.objectStore(META_STORE).get(key));
      await done;
      return isIndexedDbSnapshotMeta(value) && value.key === key ? value : null;
    } catch {
      return null;
    }
  }

  /** Read both generation pointers in one transaction and distinguish missing cache from unavailable storage. */
  async readSnapshotCatalog(): Promise<{
    available: boolean;
    active: IndexedDbSnapshotMeta | null;
    checkpoint: IndexedDbSnapshotMeta | null;
    invalidActive: boolean;
    invalidCheckpoint: boolean;
  }> {
    const unavailable = { available: false, active: null, checkpoint: null, invalidActive: false, invalidCheckpoint: false };
    const db = await this.open();
    if (!db) return unavailable;
    try {
      const tx = this.openTransaction(db, META_STORE, "readonly");
      const done = transactionDone(tx);
      const store = tx.objectStore(META_STORE);
      const [rawActive, rawCheckpoint] = await Promise.all([
        requestUnknownResult(store.get("active")), requestUnknownResult(store.get("checkpoint")),
      ]);
      await done;
      return {
        available: true,
        active: isIndexedDbSnapshotMeta(rawActive) && rawActive.key === "active" ? rawActive : null,
        checkpoint: isIndexedDbSnapshotMeta(rawCheckpoint) && rawCheckpoint.key === "checkpoint" ? rawCheckpoint : null,
        invalidActive: rawActive !== undefined && (!isIndexedDbSnapshotMeta(rawActive) || rawActive.key !== "active"),
        invalidCheckpoint: rawCheckpoint !== undefined && (!isIndexedDbSnapshotMeta(rawCheckpoint) || rawCheckpoint.key !== "checkpoint"),
      };
    } catch { return unavailable; }
  }

  /** Read only bounded, path-free diagnostic fields from untrusted persisted metadata. */
  async readIndexDiagnostics(): Promise<IndexDiagnosticEntry[]> {
    const db = await this.open();
    if (!db) return [];
    try {
      const tx = this.openTransaction(db, META_STORE, "readonly");
      const done = transactionDone(tx);
      const value = await requestUnknownResult(tx.objectStore(META_STORE).get("diagnostics"));
      await done;
      if (!isUnknownRecord(value) || !Array.isArray(value.entries)) return [];
      return sanitizeIndexDiagnostics(value.entries);
    } catch { return []; }
  }

  /** Save sanitized local history without changing cache schema or blocking indexing on failure. */
  async writeIndexDiagnostics(entries: readonly IndexDiagnosticEntry[]): Promise<void> {
    const db = await this.open();
    if (!db) return;
    try {
      const tx = this.openTransaction(db, META_STORE, "readwrite");
      tx.objectStore(META_STORE).put({ key: "diagnostics", entries: sanitizeIndexDiagnostics(entries) });
      await transactionDone(tx);
    } catch { /* Diagnostics must never block indexing. */ }
  }

  async getPages(generation: string, paths: readonly string[]): Promise<Map<string, PersistedPage>> {
    const unique = [...new Set(paths.filter(Boolean))];
    const result = new Map<string, PersistedPage>();
    if (!unique.length) return result;
    const db = await this.open();
    if (!db) return result;
    try {
      const tx = this.openTransaction(db, PAGE_STORE, "readonly");
      const done = transactionDone(tx);
      const store = tx.objectStore(PAGE_STORE);
      const values = await Promise.all(unique.map((path) => requestResult(store.get([generation, path])) as Promise<PageRecord | undefined>));
      await done;
      for (const record of values) if (record?.value) result.set(record.path, record.value);
    } catch {
      return result;
    }
    return result;
  }

  snapshotUsesChunks(meta: IndexedDbSnapshotMeta): boolean {
    return meta.schema >= 3 && Number.isInteger(meta.pageChunkCount) && Number.isInteger(meta.evidenceChunkCount);
  }

  async iterateSnapshotPages(
    meta: IndexedDbSnapshotMeta,
    onPage: (page: PersistedPage) => void,
    isCurrent: () => boolean = () => true,
    onFailure?: (reason: SnapshotReadFailureReason) => void,
  ): Promise<boolean> {
    if (meta.schema >= 3 && Number.isInteger(meta.pageChunkCount)) {
      return this.iterateChunks(meta.generation, "pages", meta.pageChunkCount ?? 0, (value) => onPage(value as PersistedPage), isCurrent, onFailure);
    }
    return this.iteratePages(meta.generation, onPage, isCurrent, onFailure);
  }

  async iterateSnapshotEvidence(
    meta: IndexedDbSnapshotMeta,
    onEvidence: (evidence: PersistedEvidenceDeclaration) => void,
    isCurrent: () => boolean = () => true,
    onFailure?: (reason: SnapshotReadFailureReason) => void,
  ): Promise<boolean> {
    if (meta.schema >= 3 && Number.isInteger(meta.evidenceChunkCount)) {
      return this.iterateChunks(meta.generation, "evidence", meta.evidenceChunkCount ?? 0, (value) => onEvidence(value as PersistedEvidenceDeclaration), isCurrent, onFailure);
    }
    return this.iterateEvidence(meta.generation, onEvidence, isCurrent, onFailure);
  }

  private async iterateChunks(
    generation: string,
    kind: "pages" | "evidence",
    chunkCount: number,
    onValue: (value: PersistedPage | PersistedEvidenceDeclaration) => void,
    isCurrent: () => boolean,
    onFailure?: (reason: SnapshotReadFailureReason) => void,
  ): Promise<boolean> {
    const db = await this.open();
    if (!db || !db.objectStoreNames.contains(SNAPSHOT_CHUNK_STORE)) {
      onFailure?.("storage-unavailable");
      return false;
    }
    try {
      // Read a handful of chunk records per transaction. This avoids hundreds of thousands of
      // cursor continuations while also avoiding one enormous getAll() allocation on iOS.
      const readBatch = Platform.isIosApp ? 4 : Platform.isMobile ? 8 : 12;
      let sliceStartedAt = performance.now();
      for (let start = 0; start < chunkCount; start += readBatch) {
        await this.backgroundCheckpoint?.();
        if (!isCurrent()) { onFailure?.("cancelled"); return false; }
        const end = Math.min(chunkCount, start + readBatch);
        const tx = this.openTransaction(db, SNAPSHOT_CHUNK_STORE, "readonly");
        const done = transactionDone(tx);
        const store = tx.objectStore(SNAPSHOT_CHUNK_STORE);
        const chunks = await Promise.all(Array.from({ length: end - start }, (_, offset) =>
          requestResult(store.get([generation, kind, start + offset])) as Promise<SnapshotChunkRecord | undefined>
        ));
        await done;
        for (const chunk of chunks) {
          if (!chunk) { onFailure?.("missing-chunk"); return false; }
          if (chunk.generation !== generation || chunk.kind !== kind || !Array.isArray(chunk.values)) {
            onFailure?.("invalid-chunk");
            return false;
          }
          let processed = 0;
          for (const value of chunk.values) {
            try { onValue(value); } catch { onFailure?.("invalid-record"); return false; }
            processed += 1;
            if (processed % 128 === 0 && !isCurrent()) { onFailure?.("cancelled"); return false; }
          }
          if (performance.now() - sliceStartedAt >= (Platform.isMobile ? 6 : 8)) {
            await yieldToHostTask();
            await this.backgroundCheckpoint?.();
            sliceStartedAt = performance.now();
            if (!isCurrent()) { onFailure?.("cancelled"); return false; }
          }
        }
      }
      return true;
    } catch {
      onFailure?.("read-error");
      return false;
    }
  }

  async iteratePages(generation: string, onPage: (page: PersistedPage) => void, isCurrent: () => boolean = () => true,
    onFailure?: (reason: SnapshotReadFailureReason) => void): Promise<boolean> {
    return this.iterateGeneration<PageRecord>(PAGE_STORE, generation, (record) => onPage(record.value), isCurrent, onFailure);
  }

  async iterateEvidence(generation: string, onEvidence: (evidence: PersistedEvidenceDeclaration) => void, isCurrent: () => boolean = () => true,
    onFailure?: (reason: SnapshotReadFailureReason) => void): Promise<boolean> {
    return this.iterateGeneration<EvidenceRecord>(EVIDENCE_STORE, generation, (record) => onEvidence(record.value), isCurrent, onFailure);
  }

  private async iterateGeneration<T>(storeName: string, generation: string, onValue: (value: T) => void, isCurrent: () => boolean,
    onFailure?: (reason: SnapshotReadFailureReason) => void): Promise<boolean> {
    const db = await this.open();
    if (!db) { onFailure?.("storage-unavailable"); return false; }
    let failureReason: SnapshotReadFailureReason | null = null;
    try {
      const tx = this.openTransaction(db, storeName, "readonly");
      const done = transactionDone(tx);
      const index = tx.objectStore(storeName).index(GENERATION_INDEX);
      await new Promise<void>((resolve, reject) => {
        const request = index.openCursor(IDBKeyRange.only(generation));
        request.onerror = () => reject(request.error ?? new Error("IndexedDB cursor failed"));
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) { resolve(); return; }
          if (!isCurrent()) {
            failureReason = "cancelled";
            try { tx.abort(); } catch { /* cancellation */ }
            resolve();
            return;
          }
          try { onValue(cursor.value as T); cursor.continue(); } catch {
            failureReason = "invalid-record";
            try { tx.abort(); } catch { /* invalid record */ }
            resolve();
          }
        };
      });
      await done;
      if (failureReason) onFailure?.(failureReason);
      return failureReason === null;
    } catch {
      onFailure?.(failureReason ?? "read-error");
      return false;
    }
  }

  /** Serialize one graph generation in bounded transactions, then atomically activate its key.
   * Cancellation leaves unreachable chunks for later orphan cleanup and preserves prior metadata.
   * The optional failure callback reports a fixed, path-free code for support diagnostics. */
  async writeSnapshot(
    meta: Omit<IndexedDbSnapshotMeta, "key" | "schema" | "generation" | "pageChunkCount" | "evidenceChunkCount">,
    pages: Iterable<PersistedPage>,
    evidence: Iterable<PersistedEvidenceDeclaration>,
    isCurrent: () => boolean = () => true,
    key: "active" | "checkpoint" = "active",
    onFailure?: (reason: SnapshotWriteFailureReason) => void,
  ): Promise<boolean> {
    const db = await this.open();
    if (!db) { onFailure?.("storage-unavailable"); return false; }
    const generation = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const batchSize = Platform.isIosApp ? 120 : Platform.isMobile ? 240 : 700;
    const pageChunkSize = Platform.isIosApp ? 256 : Platform.isMobile ? 384 : 512;
    const evidenceChunkSize = Platform.isIosApp ? 512 : Platform.isMobile ? 768 : 1024;
    const evidenceChunkBatchSize = Platform.isIosApp ? 2 : Platform.isMobile ? 4 : 12;
    // Record counts alone do not bound structured-clone cost: one high-degree page can dwarf
    // hundreds of ordinary pages. Keep both transactions and chunk payloads under approximate
    // byte budgets so snapshot maintenance remains background work rather than a visible pause.
    const pageBatchByteBudget = Platform.isIosApp ? 1_250_000 : Platform.isMobile ? 2_500_000 : 5_000_000;
    const pageChunkByteBudget = Platform.isIosApp ? 700_000 : Platform.isMobile ? 1_400_000 : 2_800_000;
    const evidenceChunkByteBudget = Platform.isIosApp ? 600_000 : Platform.isMobile ? 1_200_000 : 2_400_000;
    const evidenceFlushByteBudget = Platform.isIosApp ? 1_200_000 : Platform.isMobile ? 2_400_000 : 4_800_000;
    let pageChunkCount = 0;
    let evidenceChunkCount = 0;
    const yieldBetweenBatches = async (): Promise<void> => {
      await this.backgroundCheckpoint?.();
      // IndexedDB completion is asynchronous, but serialization/structured cloning happens on the
      // caller thread. Give input/paint a real task boundary after every bounded write wave on all
      // platforms; desktop gets larger waves above, so this does not become a per-record yield.
      await yieldToHostTask();
    };
    const cancelAndCleanup = async (): Promise<boolean> => {
      // Do not launch a large delete transaction in the same moment the user resumes editing.
      // The incomplete generation is unreachable (META_STORE still points at the previous one)
      // and the low-priority orphan sweep will remove it after a long quiet period.
      onFailure?.("cancelled");
      return false;
    };

    try {
      const pageBatch: PageRecord[] = [];
      let pageBatchBytes = 0;
      let pageChunkValues: PersistedPage[] = [];
      let pageChunkBytes = 0;
      const pageChunks: SnapshotChunkRecord[] = [];
      const finishPageChunk = (): void => {
        if (!pageChunkValues.length) return;
        pageChunks.push({ generation, kind: "pages", index: pageChunkCount++, values: pageChunkValues });
        pageChunkValues = [];
        pageChunkBytes = 0;
      };
      const flushPages = async (): Promise<boolean> => {
        if (!pageBatch.length && !pageChunks.length) return true;
        if (!isCurrent()) return false;
        const tx = this.openTransaction(db, [PAGE_STORE, SNAPSHOT_CHUNK_STORE], "readwrite");
        const store = tx.objectStore(PAGE_STORE);
        const chunkStore = tx.objectStore(SNAPSHOT_CHUNK_STORE);
        for (const record of pageBatch) store.put(record);
        for (const chunk of pageChunks) chunkStore.put(chunk);
        pageBatch.length = 0;
        pageBatchBytes = 0;
        pageChunks.length = 0;
        await transactionDone(tx);
        await yieldBetweenBatches();
        return isCurrent();
      };
      for (const page of pages) {
        const estimatedBytes = estimatedPageBytes(page);
        pageBatch.push({ generation, path: page.path, value: page });
        pageBatchBytes += estimatedBytes;
        pageChunkValues.push(page);
        pageChunkBytes += estimatedBytes;
        if (pageChunkValues.length >= pageChunkSize || pageChunkBytes >= pageChunkByteBudget) finishPageChunk();
        if ((pageBatch.length >= batchSize || pageBatchBytes >= pageBatchByteBudget) && !(await flushPages())) return await cancelAndCleanup();
      }
      finishPageChunk();
      if (!(await flushPages())) return await cancelAndCleanup();

      // Schema-3 restore reads evidence exclusively from snapshotChunks. Writing the same 249k
      // declarations again as individual EVIDENCE_STORE records doubled the I/O and made every
      // cache refresh needlessly expensive. Keep the legacy store for schema-1/2 migration only.
      let evidenceChunkValues: PersistedEvidenceDeclaration[] = [];
      let evidenceChunkBytes = 0;
      let pendingEvidenceBytes = 0;
      const evidenceChunks: SnapshotChunkRecord[] = [];
      const finishEvidenceChunk = (): void => {
        if (!evidenceChunkValues.length) return;
        evidenceChunks.push({ generation, kind: "evidence", index: evidenceChunkCount++, values: evidenceChunkValues });
        evidenceChunkValues = [];
        evidenceChunkBytes = 0;
      };
      const flushEvidenceChunks = async (): Promise<boolean> => {
        if (!evidenceChunks.length) return true;
        if (!isCurrent()) return false;
        const tx = this.openTransaction(db, SNAPSHOT_CHUNK_STORE, "readwrite");
        const chunkStore = tx.objectStore(SNAPSHOT_CHUNK_STORE);
        for (const chunk of evidenceChunks) chunkStore.put(chunk);
        evidenceChunks.length = 0;
        pendingEvidenceBytes = 0;
        await transactionDone(tx);
        await yieldBetweenBatches();
        return isCurrent();
      };
      for (const declaration of evidence) {
        const estimatedBytes = estimatedEvidenceBytes(declaration);
        evidenceChunkValues.push(declaration);
        evidenceChunkBytes += estimatedBytes;
        pendingEvidenceBytes += estimatedBytes;
        if (evidenceChunkValues.length >= evidenceChunkSize || evidenceChunkBytes >= evidenceChunkByteBudget) {
          finishEvidenceChunk();
          if ((evidenceChunks.length >= evidenceChunkBatchSize || pendingEvidenceBytes >= evidenceFlushByteBudget) && !(await flushEvidenceChunks())) return await cancelAndCleanup();
        }
      }
      finishEvidenceChunk();
      if (!(await flushEvidenceChunks()) || !isCurrent()) return await cancelAndCleanup();

      if (!isCurrent()) return await cancelAndCleanup();
      const active: IndexedDbSnapshotMeta = {
        key,
        schema: 3,
        urlAliasVersion: URL_ALIAS_FACET_VERSION,
        generation,
        pageChunkCount,
        evidenceChunkCount,
        ...meta,
      };
      const tx = this.openTransaction(db, META_STORE, "readwrite");
      tx.objectStore(META_STORE).put(active);
      await transactionDone(tx);
      // Once the metadata transaction commits, the generation is activated. A later cancellation
      // cannot retract it; the next restore will validate its physical/file signatures.
      return true;
    } catch (error) {
      onFailure?.(error instanceof DOMException && error.name === "QuotaExceededError" ? "quota-exceeded" : "write-error");
      return false;
    }
  }

  /** Retire a partial checkpoint only after a complete snapshot has activated successfully. */
  async clearCheckpoint(): Promise<void> {
    const db = await this.open();
    if (!db) return;
    try {
      const tx = this.openTransaction(db, META_STORE, "readwrite");
      tx.objectStore(META_STORE).delete("checkpoint");
      await transactionDone(tx);
    } catch { /* cache cleanup only */ }
  }

  private generationRange(storeName: string, generation: string): IDBKeyRange | IDBKeyRange[] {
    if (storeName === SNAPSHOT_CHUNK_STORE) {
      return [
        IDBKeyRange.bound([generation, "evidence", 0], [generation, "evidence", Number.MAX_SAFE_INTEGER]),
        IDBKeyRange.bound([generation, "pages", 0], [generation, "pages", Number.MAX_SAFE_INTEGER]),
      ];
    }
    return IDBKeyRange.bound([generation, ""], [generation, "\uffff"]);
  }

  private async deleteGeneration(generation: string, isCurrent: () => boolean): Promise<void> {
    if (!isCurrent()) return;
    const db = await this.open();
    if (!db || !isCurrent()) return;
    // Maintenance is deliberately sequential. Launching three large delete transactions at once
    // competes with live body-cache/index work and makes cancellation less responsive.
    for (const storeName of [PAGE_STORE, EVIDENCE_STORE, SNAPSHOT_CHUNK_STORE]) {
      if (!isCurrent()) return;
      try {
        const tx = this.openTransaction(db, storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const ranges = this.generationRange(storeName, generation);
        for (const range of Array.isArray(ranges) ? ranges : [ranges]) store.delete(range);
        await transactionDone(tx);
      } catch { /* cache cleanup only */ }
    }
  }

  /** Remove unreachable chunks while retaining both the complete and partial active generations. */
  /** Sweep unreachable generations at transaction-free background priority boundaries. */
  async cleanupOrphanGenerations(activeGeneration: string, isCurrent: () => boolean = () => true): Promise<void> {
    await this.backgroundCheckpoint?.();
    if (!isCurrent()) return;
    const db = await this.open();
    if (!db || !isCurrent() || !db.objectStoreNames.contains(SNAPSHOT_CHUNK_STORE)) return;
    try {
      const tx = this.openTransaction(db, SNAPSHOT_CHUNK_STORE, "readonly");
      const done = transactionDone(tx);
      const index = tx.objectStore(SNAPSHOT_CHUNK_STORE).index(GENERATION_INDEX);
      const generations: string[] = [];
      await new Promise<void>((resolve, reject) => {
        const request = index.openKeyCursor(null, "nextunique");
        request.onerror = () => reject(request.error ?? new Error("IndexedDB generation scan failed"));
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) { resolve(); return; }
          if (!isCurrent()) { try { tx.abort(); } catch { /* cancellation */ } resolve(); return; }
          if (typeof cursor.key === "string") generations.push(cursor.key);
          cursor.continue();
        };
      });
      await done;
      if (!isCurrent()) return;
      const catalog = await this.readSnapshotCatalog();
      if (!catalog.available || catalog.invalidActive || catalog.invalidCheckpoint) return;
      const { active, checkpoint } = catalog;
      const stale = generations.filter((generation) => generation !== activeGeneration &&
        generation !== active?.generation && generation !== checkpoint?.generation);
      for (const generation of stale) {
        await this.backgroundCheckpoint?.();
        if (!isCurrent()) return;
        await this.deleteGeneration(generation, isCurrent);
      }
    } catch {
      return;
    }
  }

  async getBodies(requests: ReadonlyArray<{ path: string; mtime: number }>): Promise<Map<string, ParsedBodyMetadata>> {
    const result = new Map<string, ParsedBodyMetadata>();
    if (!requests.length) return result;
    const db = await this.open();
    if (!db) return result;
    try {
      const tx = this.openTransaction(db, BODY_STORE, "readonly");
      const done = transactionDone(tx);
      const store = tx.objectStore(BODY_STORE);
      const values = await Promise.all(requests.map(({ path }) => requestResult(store.get(path)) as Promise<BodyRecord | undefined>));
      await done;
      for (let i = 0; i < requests.length; i += 1) {
        const request = requests[i];
        const value = values[i];
        if (value && value.mtime === request.mtime && value.parserVersion === BODY_CACHE_VERSION && validCachedBody(value.body)) result.set(request.path, value.body);
      }
    } catch {
      return result;
    }
    return result;
  }

  async bodyStoreReady(): Promise<boolean> {
    const db = await this.open();
    const ready = Boolean(db?.objectStoreNames.contains(BODY_STORE));
    return ready;
  }

  async putBodies(records: ReadonlyArray<{ path: string; mtime: number; body: ParsedBodyMetadata }>): Promise<boolean> {
    if (!records.length) return true;
    const db = await this.open();
    if (!db || !db.objectStoreNames.contains(BODY_STORE)) return false;
    try {
      const tx = this.openTransaction(db, BODY_STORE, "readwrite");
      const done = transactionDone(tx);
      const store = tx.objectStore(BODY_STORE);
      for (const record of records) store.put({ ...record, parserVersion: BODY_CACHE_VERSION } satisfies BodyRecord);
      await done;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Coalescing write-behind for live edits. Runtime graph publication must never wait for an
   * IndexedDB write: on Chromium/WebKit, unrelated snapshot maintenance can hold storage work for
   * seconds. Only the latest mtime for a path is retained while a flush is pending.
   */
  queueBodyWrite(path: string, mtime: number, body: ParsedBodyMetadata): void {
    if (this.closed) return;
    this.queuedBodyWrites.set(path, { path, mtime, body });
    if (this.bodyWriteTimer !== null || this.bodyWriteInFlight) return;
    this.bodyWriteTimer = window.setTimeout(() => {
      this.bodyWriteTimer = null;
      void this.flushQueuedBodyWrites();
    }, Platform.isMobile ? 1200 : 700);
  }

  private async flushQueuedBodyWrites(): Promise<void> {
    if (this.closed || this.bodyWriteInFlight || !this.queuedBodyWrites.size) return;
    this.bodyWriteInFlight = true;
    try {
      const limit = Platform.isIosApp ? 16 : Platform.isMobile ? 32 : 64;
      while (!this.closed && this.queuedBodyWrites.size) {
        const records: Array<{ path: string; mtime: number; body: ParsedBodyMetadata }> = [];
        for (const [path, record] of this.queuedBodyWrites) {
          records.push(record);
          this.queuedBodyWrites.delete(path);
          if (records.length >= limit) break;
        }
        const ok = await this.putBodies(records);
        if (!ok) break;
        if (Platform.isMobile) await yieldToHostTask();
      }
    } finally {
      this.bodyWriteInFlight = false;
      if (!this.closed && this.queuedBodyWrites.size && this.bodyWriteTimer === null) {
        this.bodyWriteTimer = window.setTimeout(() => {
          this.bodyWriteTimer = null;
          void this.flushQueuedBodyWrites();
        }, Platform.isMobile ? 1500 : 900);
      }
    }
  }

  /** Read count/byte-bounded URL-owner pages; consumer work always begins after its transaction completes. */
  async readUrlOwners(consume: (records: readonly UrlOwnerRecord[]) => Promise<void>, isCurrent: () => boolean): Promise<boolean> {
    const db = await this.open();
    if (!db || !isCurrent()) return false;
    let after: IDBValidKey | undefined;
    const countLimit = Platform.isMobile ? 32 : 64, byteLimit = (Platform.isMobile ? 512 : 2048) * 1024;
    try {
      while (isCurrent()) {
        const page = await this.readUrlOwnerPage(db, after, countLimit, byteLimit, isCurrent);
        if (!isCurrent()) return false;
        if (page.values.length) await consume(page.values.filter(validUrlOwner));
        if (page.exhausted) return true;
        if (page.lastKey === undefined) return false;
        after = page.lastKey;
        await this.backgroundCheckpoint?.();
      }
    } catch { return false; }
    return false;
  }

  /**
   * Retain at most one bounded URL page. A single oversized record is delivered alone; a record
   * exceeding the remaining page budget is revisited in the next transaction, not retained here.
   * Cursor callbacks never await, and transaction completion precedes the returned page.
   */
  private async readUrlOwnerPage(db: IDBDatabase, after: IDBValidKey | undefined, countLimit: number, byteLimit: number,
    isCurrent: () => boolean): Promise<{ values: unknown[]; lastKey?: IDBValidKey; exhausted: boolean }> {
    const tx = this.openTransaction(db, URL_STORE, "readonly"), done = transactionDone(tx);
    const values: unknown[] = []; let bytes = 0, lastKey: IDBValidKey | undefined, exhausted = false;
    const request = tx.objectStore(URL_STORE).openCursor(after === undefined ? undefined : IDBKeyRange.lowerBound(after, true));
    request.onsuccess = /** Decode only one owner at a time and stop admitting records when either page bound is met. */ () => {
      if (!isCurrent()) { tx.abort(); return; }
      const cursor = request.result;
      if (!cursor) { exhausted = true; return; }
      const value: unknown = cursor.value, measured = estimatedStoredValueBytes(value);
      if (measured === null || typeof cursor.key !== "string") { tx.abort(); return; }
      if (values.length && bytes + measured > byteLimit) return;
      values.push(value); bytes += measured; lastKey = cursor.key;
      if (values.length < countLimit && bytes < byteLimit) cursor.continue();
    };
    await done;
    return { values, ...(lastKey === undefined ? {} : { lastKey }), exhausted };
  }

  /** Persist a small URL-only batch; recheck the caller fence after opening storage and before starting its transaction. */
  async putUrlOwners(records: readonly Omit<UrlOwnerRecord, "version" | "parserVersion">[], isCurrent?: () => boolean): Promise<boolean> {
    const db = await this.open();
    if (!db || this.closed || isCurrent?.() === false) return false;
    try {
      const tx = this.openTransaction(db, URL_STORE, "readwrite"), done = transactionDone(tx);
      for (const record of records) tx.objectStore(URL_STORE).put({ ...record, version: URL_CACHE_VERSION, parserVersion: BODY_CACHE_VERSION });
      await done;
      return !this.closed && isCurrent?.() !== false;
    } catch { return false; }
  }

  /** Retire one modified/deleted/renamed owner without touching unrelated graph or neutral-source caches. */
  async deleteUrlOwner(path: string): Promise<void> {
    const db = await this.open();
    if (!db || this.closed) return;
    try {
      const tx = this.openTransaction(db, URL_STORE, "readwrite"), done = transactionDone(tx);
      tx.objectStore(URL_STORE).delete(path);
      await done;
    } catch { /* disposable cache cleanup only */ }
  }

  async getBody(path: string, mtime: number): Promise<ParsedBodyMetadata | null> {
    const db = await this.open();
    if (!db) return null;
    try {
      const tx = this.openTransaction(db, BODY_STORE, "readonly");
      const done = transactionDone(tx);
      const value = await requestResult(tx.objectStore(BODY_STORE).get(path)) as BodyRecord | undefined;
      await done;
      const hit = Boolean(value && value.mtime === mtime && value.parserVersion === BODY_CACHE_VERSION && validCachedBody(value.body));
      return hit ? value!.body : null;
    } catch {
      return null;
    }
  }

  async putBody(path: string, mtime: number, body: ParsedBodyMetadata): Promise<boolean> {
    const db = await this.open();
    if (!db || !db.objectStoreNames.contains(BODY_STORE)) return false;
    try {
      const tx = this.openTransaction(db, BODY_STORE, "readwrite");
      const done = transactionDone(tx);
      tx.objectStore(BODY_STORE).put({ path, mtime, parserVersion: BODY_CACHE_VERSION, body } satisfies BodyRecord);
      await done;
      return true;
    } catch {
      return false;
    }
  }

  async deleteBody(path: string): Promise<void> {
    const db = await this.open();
    if (!db) return;
    try {
      const tx = this.openTransaction(db, BODY_STORE, "readwrite");
      const done = transactionDone(tx);
      tx.objectStore(BODY_STORE).delete(path);
      await done;
    } catch { /* cache cleanup only */ }
  }

  async clearLegacyLocalStorage(app: { saveLocalStorage(key: string, value: unknown): void }): Promise<void> {
    for (const key of [
      "k-plex:index-body-cache:v1",
      "k-plex:index-body-cache:v2",
      "k-plex:index-cache:v1",
      "k-plex:index-snapshot:v1",
      "excalibrain:index-body-cache:v2",
      "k-plex:mobile-diagnostics:v1",
    ]) {
      try { app.saveLocalStorage(key, null); } catch { /* migration only */ }
    }
  }
}
