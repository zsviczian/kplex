/**
 * Internal SI4b1 closed-world contributor discovery. Canonical cached replay and the finalized host
 * structural collector supply policy-neutral dependencies; immutable hash-bucket pages certify both
 * presence and absence. This module never classifies relationships, parses Markdown, publishes a
 * graph, or schedules acquisition. SourceRepository owns all disk effects and existing source leases.
 */
import type { FileTreeOccurrence, NormalizedSourceRecord, SourceEntityFact, SourceEntityRef, TagTreeOccurrence } from "../core/graph/source";
import {
  SOURCE_CHUNK_TARGET_BYTES, SOURCE_DECODE_BUDGET_BYTES, SOURCE_MAX_BATCH_RECORDS,
  SOURCE_DEPENDENCY_BUCKETS, SOURCE_DEPENDENCY_MAX_PAGES, SOURCE_DEPENDENCY_ROOT_BYTES, SOURCE_DEPENDENCY_MAX_BYTES,
  SOURCE_DEPENDENCY_ROOT_KEY, SourceFactError, decodeSourceHead, sourceCount, sourceDependencyBucket,
  sourceObject, validSourceTarget, validSourceDependencyBuild,
  type SourceDependencyBuild, type SourceDependencyPageManifest, type SourceDependencyBucketManifest, type SourceDependencyRootRecord,
  type SourceHead, type SourceReason,
} from "./SourceFacts";
import { CachedSourceReplay, cachedSourceMatches, type CachedSourceRequest, type SourceReplayRuntime } from "./SourceReplay";
import type { NeutralSourceRepository, SelectedSourceStamp } from "./SourceRepository";

const MAX_BUFFER_BYTES = 2 * 1024 * 1024;
const MAX_IDENTITY_BYTES = 8 * 1024 * 1024;
const MAX_CATALOG_ROWS = 2_000_000;
const MAX_HOST_FACTS = 1024;
const MAX_QUERY_KEYS = 256;
const MAX_QUERY_PAGES = 256;
const MAX_QUERY_KEY_BYTES = 256 * 1024;
export type ContributorStructuralFact = SourceEntityFact | FileTreeOccurrence | TagTreeOccurrence;
/** A host capability is session-local. A disk root alone cannot certify current topology or Dates. */
export type ContributorHostStamp = Readonly<{ epoch: string; revision: number; token: string }>;
export type ContributorHostCatalog = Readonly<{
  stamp: ContributorHostStamp;
  isCurrent(): boolean;
  /** Recheck bounded Date/non-Date observations and Daily Notes configuration, not a vault scan. */
  validate(): boolean;
  /** Emit the complete canonical structural inventory and finalize its topology/tag digest. */
  collect(emit: (fact: ContributorStructuralFact) => Promise<boolean>): Promise<boolean>;
  /** Capture exactly this current document; no path/NodeId/SourceId equivalence is assumed here. */
  capture(entity: SourceEntityFact): Promise<CachedSourceRequest>;
}>;
/** Direct incidence only: siblings and transitive closure need separate, explicit finite requests. */
export type ContributorRequest = Readonly<{
  kind: "pair" | "neighborhood";
  endpoints: readonly SourceEntityRef[];
  fields?: readonly string[];
  literals?: readonly string[];
}>;
export type ContributorFailure = Readonly<{
  outcome: "pending" | "invalid" | "stale" | "cancelled" | "storage-unavailable";
  reason: SourceReason;
}>;
export type ContributorCertificate = Readonly<{
  coverage: "complete-direct-contributors";
  scope: ContributorRequest;
  scopeIdentity: string;
  dependency: SourceDependencyBuild & Readonly<{ digest: string }>;
  host: ContributorHostStamp;
  sources: readonly SelectedSourceStamp[];
  hostFacts: readonly Readonly<{ order: number; fact: ContributorStructuralFact }>[];
  selectionIdentity: string;
}>;
export type ContributorDiscoveryResult = ContributorFailure | (ContributorCertificate & Readonly<{
  outcome: "ready";
  sourceIds: readonly string[];
  work: Readonly<{ buckets: number; pages: number; bytes: number; sourceOwners: number; hostFacts: number }>;
}>);
type CatalogRoot = Readonly<{
  version: 1; build: SourceDependencyBuild; host: ContributorHostStamp;
  sources: number; hostFacts: number; rows: number;
  buckets: readonly SourceDependencyBucketManifest[];
}>;
type DependencyRow =
  | Readonly<{ kind: "link"; key: string; owner: string }>
  | Readonly<{ kind: "source"; key: string; order: number; head: SourceHead }>
  | Readonly<{ kind: "host"; key: string; order: number; fact: ContributorStructuralFact }>;
type QueryBudget = { buckets: Map<number, readonly DependencyRow[]>; pages: number; bytes: number };

/** Exact JSON tuples keep kind, opaque ID and physical/semantic spellings in separate namespaces. */
export function contributorKey(kind: "node" | "field" | "literal" | "family" | "source" | "host", value: string): string {
  return JSON.stringify([kind, value]);
}
/** Measure the actual encoded page size, including JSON escape expansion. */
function bytes(value: string): number { return new TextEncoder().encode(value).byteLength; }
/** Small strict shape guard used only for this module's finite persisted vocabulary. */
function exact(value: Record<string, unknown>, fields: readonly string[]): boolean {
  return Object.keys(value).length === fields.length && fields.every((field) => Object.prototype.hasOwnProperty.call(value, field));
}
/** Validate exact references, including the canonical root container's empty physical-path facet. */
function entity(value: unknown): value is SourceEntityRef {
  if (sourceObject(value) && value.kind === "container" && value.physicalPath === "") {
    // Stored document targets require nonempty paths; the full structural contract also permits
    // an empty root path. Validate the remaining shape without rewriting the returned reference.
    const { physicalPath: _rootPath, ...rest } = value;
    return validSourceTarget({ entity: rest, rawTarget: "", resolvedBy: "structural" });
  }
  return validSourceTarget({ entity: value, rawTarget: "", resolvedBy: "structural" });
}
/** Check untrusted request shape without widening the typed caller's arrays to `any[]`. */
function validRequest(value: unknown): value is ContributorRequest {
  if (!sourceObject(value) || Object.keys(value).some((key) => !["kind", "endpoints", "fields", "literals"].includes(key))
    || value.kind !== "pair" && value.kind !== "neighborhood" || !Array.isArray(value.endpoints)
    || value.endpoints.length === 0 || value.endpoints.length > 32
    || value.kind === "pair" && value.endpoints.length !== 2
    || !value.endpoints.every((ref: unknown) => entity(ref))) return false;
  for (const field of ["fields", "literals"] as const) {
    const values = value[field];
    if (values !== undefined && (!Array.isArray(values) || !values.every((item: unknown) => typeof item === "string"))) return false;
  }
  const fieldCount = Array.isArray(value.fields) ? value.fields.length : 0;
  const literalCount = Array.isArray(value.literals) ? value.literals.length : 0;
  return fieldCount + literalCount <= MAX_QUERY_KEYS;
}
/** Only genuine canonical structural records can be returned as host-owned contributions. */
function structural(value: unknown): value is ContributorStructuralFact {
  if (!sourceObject(value) || !entity(value.source) || typeof value.sourceRevision !== "string") return false;
  if (value.kind === "entity") return entity(value.entity) && typeof value.name === "string"
    && (value.url === null || typeof value.url === "string");
  if (value.kind !== "file-tree" && value.kind !== "tag-tree" || !validSourceTarget(value.target)) return false;
  return value.kind === "file-tree" || (value.membership === "tag-child" || value.membership === "entity-member");
}
/** Persisted rows have one purpose and no arbitrary metadata/property mirror. Checksums bind content. */
function row(value: unknown): value is DependencyRow {
  if (!sourceObject(value) || typeof value.key !== "string" || !value.key.length) return false;
  if (value.kind === "link") return exact(value, ["kind", "key", "owner"]) && typeof value.owner === "string" && value.owner.length > 0;
  if (!sourceCount(value.order)) return false;
  if (value.kind === "source") return exact(value, ["kind", "key", "order", "head"]) && decodeSourceHead(value.head) !== null;
  return value.kind === "host" && exact(value, ["kind", "key", "order", "fact"]) && structural(value.fact);
}
/** Separate global host observations from per-source physical heads and semantic policy tokens. */
function hostStamp(value: unknown): value is ContributorHostStamp {
  return sourceObject(value) && exact(value, ["epoch", "revision", "token"])
    && typeof value.epoch === "string" && value.epoch.length > 0 && sourceCount(value.revision)
    && typeof value.token === "string" && value.token.length > 0;
}
/** Compare explicit host coordinates; neither locale nor JSON object insertion order defines identity. */
function sameHost(left: ContributorHostStamp, right: ContributorHostStamp): boolean {
  return left.epoch === right.epoch && left.revision === right.revision && left.token === right.token;
}
/** Projection is deliberately role-neutral; ancestor tags use a conservative family, not copied grammar. */
export function* contributorRecordKeys(record: NormalizedSourceRecord): IterableIterator<string> {
  if (record.kind === "entity") { yield contributorKey("node", record.entity.id); return; }
  if (record.kind === "reference-value" || record.kind === "field-name") yield contributorKey("field", record.normalizedFieldName);
  if (record.kind === "reference-candidate" || record.kind === "obsidian-link" || record.kind === "unresolved-link"
    || record.kind === "date-property" || record.kind === "body-url" || record.kind === "file-tree" || record.kind === "tag-tree") {
    yield contributorKey("node", record.target.entity.id);
    yield contributorKey("literal", record.target.rawTarget);
  }
  if (record.kind === "body-url" && record.origin) yield contributorKey("node", record.origin.entity.id);
  if (record.kind === "file-tree" || record.kind === "tag-tree") yield contributorKey("node", record.source.id);
  if (record.kind === "tag-tree") yield contributorKey("family", "tag-tree");
  if (record.kind === "date-property" && record.provenance?.normalizedFieldName) yield contributorKey("field", record.provenance.normalizedFieldName);
}
/** Close failures without exposing source contents, exception messages or a partial owner list. */
function failure(error: unknown): ContributorFailure {
  const reason = error instanceof SourceFactError ? error.reason : "read-error";
  const outcome = reason === "cancelled" ? "cancelled"
    : ["stale", "superseded", "host-catalog-stale"].includes(reason) ? "stale"
    : ["storage-unavailable", "newer-database", "read-error", "write-error", "quota-exceeded"].includes(reason) ? "storage-unavailable"
    : ["dependency-pending", "unsaved", "backpressure", "decode-budget", "memory-budget", "missing", "pending-metadata", "tombstone", "unsupported-scope"].includes(reason) ? "pending"
    : "invalid";
  return { outcome, reason };
}
/** Root validation proves fixed coverage, page framing and total counts before consulting any bucket. */
function decodeRoot(data: string): CatalogRoot {
  const value: unknown = JSON.parse(data);
  if (!sourceObject(value) || !exact(value, ["version", "build", "host", "sources", "hostFacts", "rows", "buckets"])
    || value.version !== 1 || !validSourceDependencyBuild(value.build) || !hostStamp(value.host)
    || !sourceCount(value.sources) || !sourceCount(value.hostFacts) || !sourceCount(value.rows)
    || value.rows > MAX_CATALOG_ROWS || value.sources + value.hostFacts > value.rows
    || !Array.isArray(value.buckets) || value.buckets.length !== SOURCE_DEPENDENCY_BUCKETS) throw new SourceFactError("dependency-invalid");
  let count = 0, totalBytes = 0;
  const buckets: SourceDependencyBucketManifest[] = [];
  for (const bucket of value.buckets) {
    if (!sourceObject(bucket) || !exact(bucket, ["digest", "bytes", "records", "pages"])
      || !sourceCount(bucket.pages) || bucket.pages > SOURCE_DEPENDENCY_MAX_PAGES
      || !sourceCount(bucket.bytes) || bucket.bytes > bucket.pages * SOURCE_CHUNK_TARGET_BYTES
      || !sourceCount(bucket.records) || bucket.records < bucket.pages || bucket.records > bucket.pages * SOURCE_MAX_BATCH_RECORDS
      || typeof bucket.digest !== "string" || (bucket.pages ? !/^[a-f0-9]{64}$/.test(bucket.digest) : bucket.digest !== "")
      || (!bucket.pages && (bucket.bytes !== 0 || bucket.records !== 0))) throw new SourceFactError("dependency-invalid");
    buckets.push({ digest: bucket.digest, bytes: bucket.bytes, records: bucket.records, pages: bucket.pages });
    count += bucket.records; totalBytes += bucket.bytes;
  }
  if (count !== value.rows || totalBytes > SOURCE_DEPENDENCY_MAX_BYTES) throw new SourceFactError("dependency-invalid");
  return { version: 1, build: value.build, host: value.host, sources: value.sources, hostFacts: value.hostFacts, rows: value.rows, buckets };
}

/** Chain original page commitments in emission order; the fixed-size root also authenticates absence. */
export function contributorPageCommitment(previous: string, index: number, page: SourceDependencyPageManifest): string {
  return JSON.stringify(["source-dependency-page-v1", previous, index, page.digest, page.bytes, page.records]);
}

/** Bounded original-page writer; root commitments are computed before disk data can be lost or altered. */
class DependencyWriter {
  readonly manifests: SourceDependencyBucketManifest[] = Array.from({ length: SOURCE_DEPENDENCY_BUCKETS }, () => ({ digest: "", bytes: 0, records: 0, pages: 0 }));
  private readonly buffers: Array<{ rows: DependencyRow[]; bytes: number }> = Array.from({ length: SOURCE_DEPENDENCY_BUCKETS }, () => ({ rows: [], bytes: 2 }));
  private buffered = 0;
  private writtenBytes = 0;
  rows = 0;
  /** The repository owns transaction deadlines and cross-connection generation fencing. */
  constructor(private readonly repository: NeutralSourceRepository, readonly build: SourceDependencyBuild,
    private readonly current: () => boolean) {}
  /** Await every flush; at most two MiB of pending pages and one immutable transaction are retained. */
  async emit(value: DependencyRow): Promise<void> {
    if (!this.current()) throw new SourceFactError("cancelled");
    const size = bytes(JSON.stringify(value)) + 1;
    if (size + 2 > SOURCE_CHUNK_TARGET_BYTES || ++this.rows > MAX_CATALOG_ROWS) throw new SourceFactError("decode-budget");
    const bucket = sourceDependencyBucket(value.key), buffer = this.buffers[bucket];
    if (buffer.rows.length && (buffer.rows.length >= SOURCE_MAX_BATCH_RECORDS || buffer.bytes + size > SOURCE_CHUNK_TARGET_BYTES)) await this.flush(bucket);
    while (this.buffered + size > MAX_BUFFER_BYTES) {
      let largest = 0;
      for (let index = 1; index < this.buffers.length; index++) if (this.buffers[index].bytes > this.buffers[largest].bytes) largest = index;
      await this.flush(largest);
    }
    buffer.rows.push(value); buffer.bytes += size; this.buffered += size;
    if (buffer.rows.length >= SOURCE_MAX_BATCH_RECORDS) await this.flush(bucket);
  }
  /** Seal a non-empty original page; missing later pages cannot change the already captured digest. */
  private async flush(bucket: number): Promise<void> {
    const buffer = this.buffers[bucket];
    if (!buffer.rows.length) return;
    const previous = this.manifests[bucket];
    const index = previous.pages;
    if (index >= SOURCE_DEPENDENCY_MAX_PAGES) throw new SourceFactError("decode-budget");
    const data = JSON.stringify(buffer.rows);
    const manifest = { digest: await this.repository.observationDigest(data), bytes: bytes(data), records: buffer.rows.length };
    if (this.writtenBytes + manifest.bytes > SOURCE_DEPENDENCY_MAX_BYTES) throw new SourceFactError("decode-budget");
    await this.repository.putDependencyPage(this.build, { ...manifest, slot: this.build.slot, generation: this.build.generation, bucket, index, data }, this.current);
    this.writtenBytes += manifest.bytes;
    this.manifests[bucket] = {
      digest: await this.repository.observationDigest(contributorPageCommitment(previous.digest, index, manifest)),
      bytes: previous.bytes + manifest.bytes, records: previous.records + manifest.records, pages: index + 1,
    };
    this.buffered -= buffer.bytes - 2; buffer.rows = []; buffer.bytes = 2;
  }
  /** Explicit empty buckets stay in the fixed manifest; they are authenticated negative proofs too. */
  async finish(): Promise<void> { for (let bucket = 0; bucket < this.buffers.length; bucket++) await this.flush(bucket); }
}

/** A session-local capability with one build and at most two private queries; it owns no timers. */
export class SourceContributorDiscovery {
  private building = false;
  private queries = 0;
  /** Host inventory completeness is an injected capability, never inferred from available disk heads. */
  constructor(private readonly repository: NeutralSourceRepository, private readonly host: ContributorHostCatalog,
    private readonly runtime: SourceReplayRuntime) {}
  /** Distinguish demand cancellation from a stale host catalog. */
  private check(): void {
    if (!this.runtime.isCurrent()) throw new SourceFactError("cancelled");
    if (!this.host.isCurrent()) throw new SourceFactError("host-catalog-stale");
  }
  /** Synchronous revision guard suitable for repository and canonical replay boundaries. */
  private current = (): boolean => this.runtime.isCurrent() && this.host.isCurrent();
  /**
   * Explicit O(inventory + facts) acquisition of the query index, with no Markdown reads/parses.
   * Every current document is replayed under an existing selected-head lease. Any incomplete owner,
   * host inventory, mutation or interrupted page write prevents activation of the entire catalog.
   */
  async rebuild(): Promise<ContributorFailure | Readonly<{ outcome: "ready"; dependency: SourceDependencyBuild; sources: number; hostFacts: number; rows: number; pages: number }>> {
    if (this.building) return failure(new SourceFactError("backpressure"));
    this.building = true;
    try {
      this.check();
      if (!hostStamp(this.host.stamp) || !this.host.validate()) throw new SourceFactError("host-catalog-stale");
      const build = await this.repository.beginDependencyBuild(this.current);
      const writer = new DependencyWriter(this.repository, build, this.current);
      const owners = new Map<string, string>();
      const sourceIds = new Set<string>();
      let identityBytes = 0, sources = 0, hostFacts = 0;
      /** Dependency links are a superset independent of policy; duplicate occurrences remain harmless. */
      const link = async (key: string, owner: string): Promise<void> => writer.emit({ kind: "link", key, owner });
      const replay = new CachedSourceReplay(this.repository);
      const complete = await this.host.collect(async (fact) => {
        this.check();
        if (!structural(fact)) throw new SourceFactError("dependency-invalid");
        const order = hostFacts++, hostOwner = contributorKey("host", String(order));
        await writer.emit({ kind: "host", key: hostOwner, order, fact });
        for (const key of contributorRecordKeys(fact)) await link(key, hostOwner);
        if (fact.kind === "tag-tree" && fact.contribution) {
          const owner = owners.get(fact.contribution.source.id);
          if (!owner) throw new SourceFactError("dependency-invalid");
          for (const key of contributorRecordKeys(fact)) await link(key, owner);
        }
        if (fact.kind !== "entity" || fact.entity.kind !== "document") return true;
        const request = await this.host.capture(fact);
        this.check();
        if (request.host.source.id !== fact.entity.id || request.host.source.physicalPath !== fact.entity.physicalPath
          || request.host.observation.epoch !== this.host.stamp.epoch || request.host.observation.revision !== this.host.stamp.revision
          || owners.has(fact.entity.id) || sourceIds.has(request.sourceId)) throw new SourceFactError("dependency-invalid");
        identityBytes += (fact.entity.id.length + request.sourceId.length) * 2 + 128;
        if (identityBytes > MAX_IDENTITY_BYTES) throw new SourceFactError("memory-budget");
        const owner = contributorKey("source", request.sourceId), sourceOrder = sources++;
        owners.set(fact.entity.id, owner); sourceIds.add(request.sourceId);
        await link(contributorKey("node", request.host.source.id), owner);
        const selected = await replay.read(request, { ...this.runtime, isCurrent: this.current }, async (batch) => {
          for (const record of batch.records) for (const key of contributorRecordKeys(record)) await link(key, owner);
          return this.current();
        });
        if (selected.outcome !== "ready") throw new SourceFactError(selected.reason);
        if (!selected.stamp.saved || selected.stamp.sequence === null) throw new SourceFactError("unsaved");
        if (selected.stamp.sequence > build.sequence) throw new SourceFactError("superseded");
        // Normalized replay deduplicates host-selected targets and does not emit individual host
        // literal bindings. These validated visits retain every neutral spelling and resolved
        // identity, including null/duplicate aliases and literals absent from an aggregate host map.
        const lexical = await this.repository.readSelected(request.sourceId, (stamp) => {
          const matched = cachedSourceMatches(request, stamp);
          return matched !== "ready" ? matched : stamp.head.sourceRevision !== selected.stamp.head.sourceRevision
            || stamp.sequence !== selected.stamp.sequence ? "superseded" : "ready";
        }, async (reader) => {
          for (const family of ["values", "metadata", "resolution"] as const) {
            const reason = await reader.visit(family, async (records) => {
              for (const record of records) {
                if (record.kind === "reference-candidate" || record.kind === "host-literal") {
                  await link(contributorKey("literal", record.rawTarget), owner);
                } else if ((record.kind === "reference-resolution" || record.kind === "literal-resolution") && record.target) {
                  await link(contributorKey("node", record.target.entity.id), owner);
                }
              }
              return this.current();
            });
            if (reason !== "ready") throw new SourceFactError(reason, family);
          }
        }, this.current);
        if (lexical.outcome !== "ready") throw new SourceFactError(lexical.reason);
        await writer.emit({ kind: "source", key: owner, order: sourceOrder, head: { ...selected.stamp.head, sequence: selected.stamp.sequence } });
        return this.current();
      });
      this.check();
      if (!complete || !this.host.validate()) throw new SourceFactError("host-catalog-stale");
      await writer.finish();
      const root: CatalogRoot = { version: 1, build, host: { ...this.host.stamp }, sources, hostFacts, rows: writer.rows, buckets: writer.manifests };
      const data = JSON.stringify(root);
      if (bytes(data) > SOURCE_DEPENDENCY_ROOT_BYTES) throw new SourceFactError("decode-budget");
      const digest = await this.repository.observationDigest(data);
      this.check();
      if (!this.host.validate()) throw new SourceFactError("host-catalog-stale");
      const pages = writer.manifests.reduce((count, bucket) => count + bucket.pages, 0);
      await this.repository.activateDependencyBuild({ key: SOURCE_DEPENDENCY_ROOT_KEY, build, data, digest }, pages, this.current);
      this.check();
      if (!this.host.validate()) throw new SourceFactError("host-catalog-stale");
      return { outcome: "ready", dependency: build, sources, hostFacts, rows: writer.rows, pages };
    } catch (error) { return failure(error); }
    finally { this.building = false; }
  }
  /** Validate the manifest checksum and host certificate before an empty bucket can mean absence. */
  private async root(): Promise<{ record: SourceDependencyRootRecord; root: CatalogRoot }> {
    this.check();
    if (!this.host.validate()) throw new SourceFactError("host-catalog-stale");
    const record = await this.repository.readDependencyRoot(this.current);
    if (bytes(record.data) > SOURCE_DEPENDENCY_ROOT_BYTES || await this.repository.observationDigest(record.data) !== record.digest) throw new SourceFactError("dependency-invalid");
    let root: CatalogRoot;
    try { root = decodeRoot(record.data); } catch { throw new SourceFactError("dependency-invalid"); }
    if (root.build.generation !== record.build.generation || root.build.revision !== record.build.revision
      || root.build.sequence !== record.build.sequence || root.build.slot !== record.build.slot) throw new SourceFactError("dependency-invalid");
    if (!sameHost(root.host, this.host.stamp)) throw new SourceFactError("host-catalog-stale");
    this.check();
    if (!this.host.validate()) throw new SourceFactError("host-catalog-stale");
    return { record, root };
  }
  /** Read all committed pages of a selected bucket, never a possibly missing lookup row in isolation. */
  private async bucket(root: CatalogRoot, index: number, budget: QueryBudget): Promise<readonly DependencyRow[]> {
    const cached = budget.buckets.get(index);
    if (cached) return cached;
    const result: DependencyRow[] = [];
    const manifest = root.buckets[index];
    // Reserve the entire authenticated bucket before opening it, including decoded bookkeeping.
    budget.bytes += manifest.bytes * 3 + manifest.records * 128;
    if (budget.bytes > SOURCE_DECODE_BUDGET_BYTES) throw new SourceFactError("decode-budget");
    if (budget.pages + manifest.pages > MAX_QUERY_PAGES) throw new SourceFactError("backpressure");
    let digest = "", totalBytes = 0, totalRecords = 0;
    for (let pageIndex = 0; pageIndex < manifest.pages; pageIndex++) {
      const page = await this.repository.readDependencyPage(root.build, index, pageIndex, this.current);
      totalBytes += page.bytes; totalRecords += page.records;
      if (totalBytes > manifest.bytes || totalRecords > manifest.records || bytes(page.data) !== page.bytes
        || await this.repository.observationDigest(page.data) !== page.digest) throw new SourceFactError("dependency-invalid");
      digest = await this.repository.observationDigest(contributorPageCommitment(digest, pageIndex, page));
      let rows: unknown;
      try { rows = JSON.parse(page.data); } catch { throw new SourceFactError("dependency-invalid"); }
      if (!Array.isArray(rows) || rows.length !== page.records) throw new SourceFactError("dependency-invalid");
      for (const value of rows) {
        if (!row(value) || sourceDependencyBucket(value.key) !== index) throw new SourceFactError("dependency-invalid");
        result.push(value);
      }
      budget.pages += 1;
      await this.runtime.yield(); this.check();
    }
    if (digest !== manifest.digest || totalBytes !== manifest.bytes || totalRecords !== manifest.records) throw new SourceFactError("dependency-invalid");
    budget.buckets.set(index, result);
    return result;
  }
  /** Group finite exact keys by shard and share each verified bucket across all phases of one query. */
  private async lookup(root: CatalogRoot, keys: ReadonlySet<string>, budget: QueryBudget): Promise<DependencyRow[]> {
    const buckets = new Set([...keys].map(sourceDependencyBucket));
    const rows: DependencyRow[] = [];
    for (const index of buckets) for (const value of await this.bucket(root, index, budget)) if (keys.has(value.key)) rows.push(value);
    return rows;
  }
  /**
   * Return a complete conservative owner cover for a finite direct scope. Each owner is returned
   * once, both endpoint declarations are considered, and host-only records remain separate. Budget
   * or freshness failures discard all partial results; no parser, head scan or implicit rebuild runs.
   */
  async discover(request: ContributorRequest): Promise<ContributorDiscoveryResult> {
    if (this.queries >= 2) return failure(new SourceFactError("backpressure"));
    this.queries++;
    try {
      this.check();
      if (!validRequest(request)) throw new SourceFactError("unsupported-scope");
      const scope: ContributorRequest = { kind: request.kind, endpoints: request.endpoints.map((ref) => ({ ...ref })),
        ...(request.fields ? { fields: [...request.fields] } : {}), ...(request.literals ? { literals: [...request.literals] } : {}) };
      const keys = new Set<string>();
      for (const endpoint of scope.endpoints) {
        keys.add(contributorKey("node", endpoint.id));
        if (endpoint.kind === "tag") keys.add(contributorKey("family", "tag-tree"));
      }
      for (const [kind, values] of [["field", scope.fields], ["literal", scope.literals]] as const) for (const value of values ?? []) {
        if (typeof value !== "string") throw new SourceFactError("unsupported-scope");
        keys.add(contributorKey(kind, value));
      }
      if (keys.size > MAX_QUERY_KEYS || [...keys].reduce((total, key) => total + bytes(key), 0) > MAX_QUERY_KEY_BYTES) throw new SourceFactError("backpressure");
      const { root, record } = await this.root();
      const budget: QueryBudget = { buckets: new Map(), pages: 0, bytes: 0 };
      const ownerKeys = new Set<string>();
      for (const value of await this.lookup(root, keys, budget)) {
        if (value.kind !== "link") throw new SourceFactError("dependency-invalid");
        ownerKeys.add(value.owner);
        if (ownerKeys.size > SOURCE_MAX_BATCH_RECORDS + MAX_HOST_FACTS) throw new SourceFactError("backpressure");
      }
      const selected = new Map<string, Exclude<DependencyRow, { kind: "link" }>>();
      for (const value of await this.lookup(root, ownerKeys, budget)) {
        if (value.kind === "link" || selected.has(value.key)) throw new SourceFactError("dependency-invalid");
        selected.set(value.key, value);
      }
      if (selected.size !== ownerKeys.size) throw new SourceFactError("dependency-invalid");
      const sources: Array<Extract<DependencyRow, { kind: "source" }>> = [];
      const hostFacts: Array<{ order: number; fact: ContributorStructuralFact }> = [];
      for (const value of selected.values()) {
        if (value.kind === "source") {
          if (value.key !== contributorKey("source", value.head.sourceId) || value.head.state !== "complete"
            || value.head.sequence > root.build.sequence || value.order >= root.sources) throw new SourceFactError("dependency-invalid");
          sources.push(value);
        } else {
          if (value.key !== contributorKey("host", String(value.order)) || value.order >= root.hostFacts) throw new SourceFactError("dependency-invalid");
          hostFacts.push({ order: value.order, fact: value.fact });
        }
      }
      if (sources.length > SOURCE_MAX_BATCH_RECORDS || hostFacts.length > MAX_HOST_FACTS) throw new SourceFactError("backpressure");
      sources.sort((a, b) => a.order - b.order); hostFacts.sort((a, b) => a.order - b.order);
      const stamps = sources.map((value) => ({ head: value.head, sequence: value.head.sequence, saved: true }));
      const certificate: ContributorCertificate = {
        coverage: "complete-direct-contributors", scope, scopeIdentity: await this.repository.observationDigest(JSON.stringify(scope)),
        dependency: { ...root.build, digest: record.digest }, host: root.host,
        sources: stamps, hostFacts,
        selectionIdentity: await this.repository.observationDigest(JSON.stringify([stamps, hostFacts])),
      };
      const checked = await this.revalidate(certificate);
      if (checked !== "ready") throw new SourceFactError(checked);
      return { outcome: "ready", ...certificate, sourceIds: sources.map((value) => value.head.sourceId),
        work: { buckets: budget.buckets.size, pages: budget.pages, bytes: budget.bytes, sourceOwners: sources.length, hostFacts: hostFacts.length } };
    } catch (error) { return failure(error); }
    finally { this.queries--; }
  }
  /**
   * Recheck a later publication candidate: exact scope hash, host observations, selected source
   * stamps, selected host-fact identity, root identity and both global fences. This validates only;
   * it cannot publish anything. Certificates are internal capabilities, not adversarial credentials.
   */
  async revalidate(certificate: ContributorCertificate): Promise<SourceReason> {
    try {
      this.check();
      if (certificate.coverage !== "complete-direct-contributors" || !sameHost(certificate.host, this.host.stamp)
        || certificate.scopeIdentity !== await this.repository.observationDigest(JSON.stringify(certificate.scope))
        || certificate.selectionIdentity !== await this.repository.observationDigest(JSON.stringify([certificate.sources, certificate.hostFacts]))) return "dependency-invalid";
      const { record } = await this.root();
      if (record.digest !== certificate.dependency.digest || record.build.generation !== certificate.dependency.generation
        || record.build.revision !== certificate.dependency.revision || record.build.sequence !== certificate.dependency.sequence
        || record.build.slot !== certificate.dependency.slot) return "superseded";
      const selected = await this.repository.validateSelections(certificate.sources, this.current);
      if (selected.reason !== "ready") return selected.reason;
      const { record: after } = await this.root();
      return after.digest === record.digest && after.build.generation === record.build.generation ? "ready" : "superseded";
    } catch (error) { return error instanceof SourceFactError ? error.reason : "read-error"; }
  }
}
