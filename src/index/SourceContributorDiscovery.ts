/**
 * Internal SI4b1 closed-world contributor discovery. Canonical cached replay and the finalized host
 * structural collector supply policy-neutral dependencies; immutable hash-bucket pages certify both
 * presence and absence. Per-owner summary pages preserve the original sorted dependency set,
 * collected in the canonical four-family replay rather than an additional lexical pass. The v2
 * derivative root remains a rejected full-build lifecycle, not an incremental C2 certificate.
 * Journal repair authenticates retained old summaries, prepares one new owner and certifies only
 * unchanged-host impact; changed-host fan-out remains explicitly unknown. This module never
 * classifies relationships, parses Markdown, publishes a
 * graph, or schedules acquisition. SourceRepository owns all disk effects and existing source leases.
 */
import type { FileTreeOccurrence, SourceEntityFact, SourceEntityRef, TagTreeOccurrence } from "../core/graph/source";
import {
  SOURCE_CHUNK_TARGET_BYTES, SOURCE_DECODE_BUDGET_BYTES, SOURCE_MAX_BATCH_RECORDS,
  SOURCE_DEPENDENCY_BUCKETS, SOURCE_DEPENDENCY_MAX_PAGES, SOURCE_DEPENDENCY_ROOT_BYTES, SOURCE_DEPENDENCY_MAX_BYTES,
  SOURCE_DEPENDENCY_ROOT_KEY, SourceFactError, decodeSourceHead, sourceCount, sourceDependencyBucket,
  sourceObject, validSourceTarget, validSourceDependencyBuild,
  type SourceDependencyBuild, type SourceDependencyPageManifest, type SourceDependencyBucketManifest, type SourceDependencyRootRecord,
  type SourceHead, type SourceReason,
} from "./SourceFacts";
import type { CachedSourceRequest, SourceReplayRuntime } from "./SourceReplay";
import {
  contributorKey, contributorRecordKeys, contributorSummaryPageCommitment, contributorSummaryPages,
  summarizeContributorOwner, prepareContributorOwnerDelta, validContributorMembershipKey, validContributorOwnerSummary, validContributorSummaryManifest,
  type ContributorOwnerSummary, type ContributorOwnerState, type ContributorSummaryManifest,
} from "./SourceContributorSummary";
export { contributorKey, contributorRecordKeys } from "./SourceContributorSummary";
import type { NeutralSourceRepository, SelectedSourceStamp, ContributorJournalReader } from "./SourceRepository";

import { contributorJournalAuthority, contributorJournalSelection, sameContributorSelection,
  type ContributorJournalRecord } from "./SourceContributorJournal";

/** A persisted repair certificate. It is deliberately not a graph or query coverage certificate. */
export type ContributorImpactCertificate = Readonly<{
  version: 1;
  coverage: "complete-owner-impact";
  owner: string;
  ticket: string;
  authority: string;
  originalCommitment: ContributorSummaryManifest | null;
  previous: ContributorOwnerState;
  next: ContributorOwnerState;
  host: Readonly<{ kind: "unchanged"; from: ContributorHostStamp; to: ContributorHostStamp }>;
  affectedKeys: readonly string[];
  sourceOwners: readonly string[];
  hostOwners: readonly string[];
}>;
export type ContributorImpactWork = Readonly<{ familyVisits: number; pages: number; bytes: number }>;
export type ContributorImpactResult = ContributorFailure
  | Readonly<{ outcome: "unknown"; reason: SourceReason; work: ContributorImpactWork }>
  | Readonly<{ outcome: "known"; certificate: ContributorImpactCertificate; work: ContributorImpactWork }>;

/** Format 2 is retained; additive v7 journaling does not reinterpret existing v5/v6 source data. */
export const CONTRIBUTOR_CATALOG_VERSION = 2;
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
  version: 2; build: SourceDependencyBuild; host: ContributorHostStamp;
  sources: number; hostFacts: number; rows: number;
  buckets: readonly SourceDependencyBucketManifest[];
}>;
type DependencyRow =
  | Readonly<{ kind: "link"; key: string; owner: string }>
  | Readonly<{ kind: "source"; key: string; order: number; head: SourceHead; source: SourceEntityRef; summary: ContributorSummaryManifest }>
  | Readonly<{ kind: "summary"; key: string; index: number; keys: readonly string[] }>
  | Readonly<{ kind: "host"; key: string; order: number; fact: ContributorStructuralFact }>;
type QueryBudget = {
  buckets: Map<number, readonly DependencyRow[]>; pages: number; bytes: number;
  historical?: Readonly<{ page: ContributorJournalReader["page"]; check(): void }>;
};

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
  if (value.kind === "summary") return exact(value, ["kind", "key", "index", "keys"]) && sourceCount(value.index)
    && Array.isArray(value.keys) && value.keys.length > 0 && value.keys.length <= SOURCE_MAX_BATCH_RECORDS
    && value.keys.every(validContributorMembershipKey);
  if (!sourceCount(value.order)) return false;
  if (value.kind === "source") return exact(value, ["kind", "key", "order", "head", "source", "summary"])
    && decodeSourceHead(value.head) !== null && entity(value.source) && value.source.kind === "document"
    && value.source.state === "materialized" && validContributorSummaryManifest(value.summary);
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
    || value.version !== CONTRIBUTOR_CATALOG_VERSION || !validSourceDependencyBuild(value.build) || !hostStamp(value.host)
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
  return { version: CONTRIBUTOR_CATALOG_VERSION, build: value.build, host: value.host, sources: value.sources, hostFacts: value.hostFacts, rows: value.rows, buckets };
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
   * Every current document is replayed under one existing selected-head lease in exactly four
   * family visits. Its authenticated summary pages share this selection. Any incomplete owner,
   * host inventory, mutation or interrupted page write prevents activation of the entire catalog.
   * This explicit bootstrap is not per-edit incremental maintenance and is never run by a query.
   */
  async rebuild(): Promise<ContributorFailure | Readonly<{ outcome: "ready"; dependency: SourceDependencyBuild; sources: number; hostFacts: number; rows: number; pages: number; familyVisits: number }>> {
    if (this.building) return failure(new SourceFactError("backpressure"));
    this.building = true;
    try {
      this.check();
      if (!hostStamp(this.host.stamp) || !this.host.validate()) throw new SourceFactError("host-catalog-stale");
      const build = await this.repository.beginDependencyBuild(this.current);
      const writer = new DependencyWriter(this.repository, build, this.current);
      const owners = new Map<string, string>();
      const sourceIds = new Set<string>();
      let identityBytes = 0, sources = 0, hostFacts = 0, familyVisits = 0;
      /** Dependency links are a superset independent of policy; duplicate occurrences remain harmless. */
      const link = async (key: string, owner: string): Promise<void> => writer.emit({ kind: "link", key, owner });
      const complete = await this.host.collect(
        /** Preserve canonical host order and bind each document to one complete selected summary. */
        async (fact) => {
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
          const selected = await summarizeContributorOwner(this.repository, request, { ...this.runtime, isCurrent: this.current });
          if (selected.outcome !== "ready") throw new SourceFactError(selected.reason);
          if (!selected.stamp.saved || selected.stamp.sequence === null) throw new SourceFactError("unsaved");
          if (selected.stamp.sequence > build.sequence) throw new SourceFactError("superseded");
          familyVisits += selected.value.work.familyVisits;
          const summary = await this.writeSummary(writer, selected.value.summary, selected.stamp.sequence);
          for (const key of selected.value.summary.keys) await link(key, owner);
          await writer.emit({ kind: "source", key: owner, order: sourceOrder,
            head: { ...selected.stamp.head, sequence: selected.stamp.sequence }, source: selected.value.summary.source, summary });
          return this.current();
        });
      this.check();
      if (!complete || !this.host.validate()) throw new SourceFactError("host-catalog-stale");
      await writer.finish();
      const root: CatalogRoot = { version: CONTRIBUTOR_CATALOG_VERSION, build, host: { ...this.host.stamp }, sources, hostFacts, rows: writer.rows, buckets: writer.manifests };
      const data = JSON.stringify(root);
      if (bytes(data) > SOURCE_DEPENDENCY_ROOT_BYTES) throw new SourceFactError("decode-budget");
      const digest = await this.repository.observationDigest(data);
      this.check();
      if (!this.host.validate()) throw new SourceFactError("host-catalog-stale");
      const pages = writer.manifests.reduce((count, bucket) => count + bucket.pages, 0);
      await this.repository.activateDependencyBuild({ key: SOURCE_DEPENDENCY_ROOT_KEY, build, data, digest }, pages, this.current);
      this.check();
      if (!this.host.validate()) throw new SourceFactError("host-catalog-stale");
      return { outcome: "ready", dependency: build, sources, hostFacts, rows: writer.rows, pages, familyVisits };
    } catch (error) { return failure(error); }
    finally { this.building = false; }
  }
  /**
   * Persist sorted key pages with an independent original commitment bound to this exact head.
   * Page framing accounts for the escaped SourceId envelope; no key is split, truncated or omitted.
   * The root/head selection is still owned by the existing complete-build transaction boundary.
   */
  private async writeSummary(writer: DependencyWriter, summary: ContributorOwnerSummary, sequence: number): Promise<ContributorSummaryManifest> {
    const key = contributorKey("summary", summary.sourceId);
    const envelope = bytes(JSON.stringify({ kind: "summary", key, index: 0, keys: [] })) + 32;
    let manifest: ContributorSummaryManifest = { pages: 0, records: 0, bytes: 0, digest: "" };
    for (const page of contributorSummaryPages(summary.keys, SOURCE_CHUNK_TARGET_BYTES - envelope)) {
      const digest = await this.repository.observationDigest(page.data);
      const pageManifest = { digest, bytes: page.bytes, records: page.keys.length };
      const commitment = await this.repository.observationDigest(contributorSummaryPageCommitment(manifest.digest,
        summary.sourceId, summary.sourceRevision, sequence, page.index, pageManifest));
      await writer.emit({ kind: "summary", key, index: page.index, keys: page.keys });
      manifest = { pages: manifest.pages + 1, records: manifest.records + page.keys.length,
        bytes: manifest.bytes + page.bytes, digest: commitment };
    }
    if (!validContributorSummaryManifest(manifest)) throw new SourceFactError("dependency-invalid");
    return manifest;
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
      const page = budget.historical ? await budget.historical.page(index, pageIndex)
        : await this.repository.readDependencyPage(root.build, index, pageIndex, this.current);
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
      await this.runtime.yield();
      if (budget.historical) budget.historical.check(); else this.check();
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
   * Authenticate every selected owner's sorted summary pages against the source-row commitment.
   * All pages must exist exactly once, in order, including the mandatory self-node key. Missing
   * summary rows, page truncation and reordered/duplicated keys fail closed; surviving rows never
   * define a new commitment. The outer bucket proof independently authenticates a missing lookup.
   */
  private async summaries(root: CatalogRoot, sources: readonly Extract<DependencyRow, { kind: "source" }>[],
    budget: QueryBudget): Promise<Map<string, ContributorOwnerSummary>> {
    // Reserve nested key bookkeeping and reconstructed arrays, in addition to decoded bucket bytes.
    for (const source of sources) {
      budget.bytes += source.summary.records * 104 + 256;
      if (budget.bytes > SOURCE_DECODE_BUDGET_BYTES) throw new SourceFactError("decode-budget");
    }
    const keys = new Set(sources.map(
      /** Derive an exact lookup tuple; neither path facet is an owner identity. */
      (source) => contributorKey("summary", source.head.sourceId)));
    const pages = new Map<string, Array<Extract<DependencyRow, { kind: "summary" }>>>();
    for (const value of await this.lookup(root, keys, budget)) {
      if (value.kind !== "summary") throw new SourceFactError("dependency-invalid");
      let group = pages.get(value.key);
      if (!group) { group = []; pages.set(value.key, group); }
      group.push(value);
    }
    const result = new Map<string, ContributorOwnerSummary>();
    for (const source of sources) {
      const group = pages.get(contributorKey("summary", source.head.sourceId));
      if (!group || group.length !== source.summary.pages || source.source.physicalPath !== source.head.physical.path) {
        throw new SourceFactError("dependency-invalid");
      }
      group.sort(
        /** Restore committed page order independently of bucket traversal order. */
        (left, right) => left.index - right.index);
      const ownerKeys: string[] = [];
      let digest = "", totalBytes = 0;
      for (let index = 0; index < group.length; index++) {
        const page = group[index];
        if (page.index !== index) throw new SourceFactError("dependency-invalid");
        const data = JSON.stringify(page.keys), pageBytes = bytes(data);
        totalBytes += pageBytes;
        if (totalBytes > source.summary.bytes || ownerKeys.length + page.keys.length > source.summary.records) throw new SourceFactError("dependency-invalid");
        digest = await this.repository.observationDigest(contributorSummaryPageCommitment(digest, source.head.sourceId,
          source.head.sourceRevision, source.head.sequence, index,
          { digest: await this.repository.observationDigest(data), bytes: pageBytes, records: page.keys.length }));
        ownerKeys.push(...page.keys);
        if (budget.historical) budget.historical.check(); else this.check();
      }
      const summary: ContributorOwnerSummary = { version: 1, sourceId: source.head.sourceId,
        sourceRevision: source.head.sourceRevision, sequence: source.head.sequence, source: source.source, keys: ownerKeys };
      if (digest !== source.summary.digest || totalBytes !== source.summary.bytes || ownerKeys.length !== source.summary.records
        || !validContributorOwnerSummary(summary)) throw new SourceFactError("dependency-invalid");
      result.set(source.head.sourceId, summary);
    }
    return result;
  }
  /**
   * Authenticate a retained original owner or an original absence using the SAME bucket/summary
   * reader as public discovery. A tombstone/missing disk head alone never proves catalog absence.
   * Historical authority bypasses no public host/root check and can only feed private repair work.
   */
  private async originalJournalOwner(reader: ContributorJournalReader, budget: QueryBudget): Promise<Readonly<{
    root: CatalogRoot; state: ContributorOwnerState; commitment: ContributorSummaryManifest | null;
  }>> {
    const record = reader.record, stored = reader.root;
    if (record.subject.kind !== "source" || record.original.kind === "invalid" || !record.root || !stored
      || bytes(stored.data) > SOURCE_DEPENDENCY_ROOT_BYTES
      || stored.digest !== record.root.digest || JSON.stringify(stored.build) !== JSON.stringify(record.root.build)
      || await this.repository.observationDigest(stored.data) !== stored.digest) throw new SourceFactError("dependency-invalid");
    const root = decodeRoot(stored.data);
    if (root.build.generation !== stored.build.generation || root.build.slot !== stored.build.slot
      || root.build.revision !== stored.build.revision || root.build.sequence !== stored.build.sequence) throw new SourceFactError("dependency-invalid");
    const sourceId = record.subject.sourceId;
    const found = await this.lookup(root, new Set([contributorKey("source", sourceId)]), budget);
    if (!found.length) {
      if (record.original.kind === "head" && record.original.head.state !== "tombstone") throw new SourceFactError("dependency-invalid");
      return { root, state: { kind: "absent", sourceId }, commitment: null };
    }
    if (found.length !== 1 || found[0].kind !== "source") throw new SourceFactError("dependency-invalid");
    const owner = found[0];
    if (owner.head.sourceId !== sourceId || owner.head.state !== "complete" || owner.order >= root.sources
      || owner.head.sequence > root.build.sequence || !sameContributorSelection(record.original, { kind: "head", head: owner.head })) {
      throw new SourceFactError("dependency-invalid");
    }
    const summary = (await this.summaries(root, [owner], budget)).get(sourceId);
    if (!summary) throw new SourceFactError("dependency-invalid");
    return { root, state: { kind: "present", summary }, commitment: { ...owner.summary } };
  }
  /**
   * Prepare one journaled owner through the canonical four-family path, or zero visits for a
   * selected deletion plus current authoritative host absence. Only a provably UNCHANGED canonical
   * host capability closes fan-out in this slice. Changed topology/resolution/Date/Daily Notes stays
   * unknown: direct key disjointness does not prove an unrelated referrer unaffected.
   * Neither outcome makes queries ready, rewrites source heads, publishes a root, nor retires tickets.
   */
  async prepareOwnerImpact(sourceId: string, request: CachedSourceRequest | null,
    absent: () => boolean = () => false): Promise<ContributorImpactResult> {
    if (this.queries >= 2) return failure(new SourceFactError("backpressure"));
    this.queries++;
    /** Caller cancellation discards private old/new state even when historical host stamps differ. */
    const current = (): boolean => this.runtime.isCurrent() && (request ? request.host.isCurrent() : absent());
    try {
      if (!sourceId || request && request.sourceId !== sourceId) throw new SourceFactError("dependency-invalid");
      if (!current()) throw new SourceFactError("cancelled");
      const result = await this.repository.withContributorJournal<ContributorImpactResult>({ kind: "source", sourceId }, current, async (reader) => {
        const budget: QueryBudget = { buckets: new Map(), pages: 0, bytes: 0, historical: { page: reader.page,
          /** The repository separately fences the retained ticket at each page and termination. */
          check: () => { if (!current()) throw new SourceFactError("cancelled"); } } };
        const original = await this.originalJournalOwner(reader, budget), selected = reader.record.selected;
        if (!selected || selected.kind === "invalid") throw new SourceFactError("dependency-pending");
        let next: ContributorOwnerState, familyVisits = 0;
        if (selected.kind === "missing" || selected.head.state === "tombstone") {
          if (request || !absent()) throw new SourceFactError("dependency-pending");
          next = { kind: "absent", sourceId };
        } else {
          if (!request) throw new SourceFactError("dependency-pending");
          const result = await summarizeContributorOwner(this.repository, { ...request,
            expected: { sourceRevision: selected.head.sourceRevision, sequence: selected.head.sequence } }, this.runtime);
          if (result.outcome !== "ready") throw new SourceFactError(result.reason);
          if (!result.stamp.saved || result.stamp.sequence === null
            || !sameContributorSelection(selected, contributorJournalSelection({ ...result.stamp.head, sequence: result.stamp.sequence }))) {
            throw new SourceFactError("unsaved");
          }
          next = { kind: "present", summary: result.value.summary }; familyVisits = result.value.work.familyVisits;
        }
        const delta = prepareContributorOwnerDelta(original.state, next);
        const work: ContributorImpactWork = { familyVisits, pages: budget.pages, bytes: budget.bytes };
        if (!current()) throw new SourceFactError("cancelled");
        // The canonical session fence closes ALL resolver/structure observations only if unchanged.
        // There is no inverse resolver/referrer capability in the present adapter. Never synthesize
        // a changed-host closure from old/new direct keys or a list of surviving lookup candidates.
        if (!sameHost(original.root.host, this.host.stamp) || !this.host.isCurrent() || !this.host.validate()) {
          return { outcome: "unknown", reason: "host-catalog-stale", work };
        }
        const certificate: ContributorImpactCertificate = { version: 1, coverage: "complete-owner-impact",
          owner: reader.record.owner, ticket: reader.record.ticket,
          authority: await this.repository.observationDigest(contributorJournalAuthority(reader.record)),
          originalCommitment: original.commitment, previous: delta.previous, next: delta.next,
          host: { kind: "unchanged", from: { ...original.root.host }, to: { ...this.host.stamp } },
          affectedKeys: [...delta.affectedKeys], sourceOwners: [sourceId], hostOwners: [] };
        /** Close source/demand AND the canonical same-session host proof at the activation boundary. */
        const certified = (): boolean => current() && this.host.isCurrent() && this.host.validate()
          && sameHost(original.root.host, this.host.stamp);
        await this.repository.storeContributorImpact(reader, JSON.stringify(certificate), certified);
        if (!certified()) throw new SourceFactError("host-catalog-stale");
        return { outcome: "known", certificate, work };
      });
      if (result.outcome === "known" && (!current() || !this.host.isCurrent() || !this.host.validate()
        || !sameHost(result.certificate.host.to, this.host.stamp))) throw new SourceFactError("host-catalog-stale");
      return result;
    } catch (error) { return failure(error); }
    finally { this.queries--; }
  }
  /**
   * Read persisted known impact without replaying any source family. The original summary proof,
   * digest, exact selected head and same-session host still have to close. Reopen recovers UNKNOWN
   * tickets independently; a new-session host proof is explicitly C3, not inferred from this record.
   */
  async readOwnerImpact(sourceId: string): Promise<ContributorImpactResult> {
    if (this.queries >= 2) return failure(new SourceFactError("backpressure"));
    this.queries++;
    try {
      this.check();
      const result = await this.repository.withContributorJournal<ContributorImpactResult>({ kind: "source", sourceId }, this.current, async (reader) => {
        const budget: QueryBudget = { buckets: new Map(), pages: 0, bytes: 0, historical: { page: reader.page, check: () => this.check() } };
        const original = await this.originalJournalOwner(reader, budget), record = reader.record;
        const work = { familyVisits: 0, pages: budget.pages, bytes: budget.bytes };
        if (record.status !== "known" || !record.impact) return { outcome: "unknown", reason: "dependency-pending", work };
        if (await this.repository.observationDigest(record.impact.data) !== record.impact.digest) throw new SourceFactError("dependency-invalid");
        const certificate = await this.decodeImpact(record, original.state, original.commitment);
        if (!sameHost(certificate.host.from, original.root.host) || !sameHost(certificate.host.to, this.host.stamp) || !this.host.validate()) throw new SourceFactError("host-catalog-stale");
        await this.repository.validateContributorImpact(reader, this.current);
        if (!this.host.validate()) throw new SourceFactError("host-catalog-stale");
        return { outcome: "known", certificate, work };
      });
      this.check();
      if (result.outcome === "known" && (!this.host.validate()
        || !sameHost(result.certificate.host.to, this.host.stamp))) throw new SourceFactError("host-catalog-stale");
      return result;
    } catch (error) { return failure(error); }
    finally { this.queries--; }
  }
  /** Validate detached persisted impact structure and its full old/new union; never trust raw arrays. */
  private async decodeImpact(record: ContributorJournalRecord, previous: ContributorOwnerState,
    commitment: ContributorSummaryManifest | null): Promise<ContributorImpactCertificate> {
    const value: unknown = JSON.parse(record.impact?.data ?? "null");
    if (!sourceObject(value) || !exact(value, ["version", "coverage", "owner", "ticket", "authority", "originalCommitment", "previous", "next", "host", "affectedKeys", "sourceOwners", "hostOwners"])
      || value.version !== 1 || value.coverage !== "complete-owner-impact" || value.owner !== record.owner || value.ticket !== record.ticket
      || value.authority !== await this.repository.observationDigest(contributorJournalAuthority(record))
      || JSON.stringify(value.previous) !== JSON.stringify(previous) || JSON.stringify(value.originalCommitment) !== JSON.stringify(commitment)
      || !sourceObject(value.host) || !exact(value.host, ["kind", "from", "to"]) || value.host.kind !== "unchanged"
      || !hostStamp(value.host.from) || !hostStamp(value.host.to) || !sameHost(value.host.from, value.host.to)
      || !sourceObject(value.next) || record.subject.kind !== "source") throw new SourceFactError("dependency-invalid");
    let next: ContributorOwnerState;
    if (value.next.kind === "absent" && value.next.sourceId === record.subject.sourceId && Object.keys(value.next).length === 2) {
      if (!record.selected || record.selected.kind === "invalid" || record.selected.kind === "head" && record.selected.head.state !== "tombstone") throw new SourceFactError("dependency-invalid");
      next = { kind: "absent", sourceId: record.subject.sourceId };
    } else if (value.next.kind === "present" && Object.keys(value.next).length === 2 && validContributorOwnerSummary(value.next.summary)) {
      const summary = value.next.summary, selected = record.selected;
      if (!selected || selected.kind !== "head" || selected.head.state !== "complete" || summary.sourceId !== record.subject.sourceId
        || summary.sourceRevision !== selected.head.sourceRevision || summary.sequence !== selected.head.sequence
        || summary.source.physicalPath !== selected.head.physical.path) throw new SourceFactError("dependency-invalid");
      next = { kind: "present", summary };
    } else throw new SourceFactError("dependency-invalid");
    const delta = prepareContributorOwnerDelta(previous, next);
    if (JSON.stringify(value.affectedKeys) !== JSON.stringify(delta.affectedKeys)
      || JSON.stringify(value.sourceOwners) !== JSON.stringify([record.subject.sourceId])
      || JSON.stringify(value.hostOwners) !== "[]") throw new SourceFactError("dependency-invalid");
    return { version: 1, coverage: "complete-owner-impact", owner: record.owner, ticket: record.ticket,
      authority: value.authority, originalCommitment: commitment, previous: delta.previous, next: delta.next,
      host: { kind: "unchanged", from: value.host.from, to: value.host.to }, affectedKeys: [...delta.affectedKeys],
      sourceOwners: [record.subject.sourceId], hostOwners: [] };
  }
  /**
   * Capture one authenticated old-owner summary for private local-delta preparation. A missing
   * source row is pending/missing, never certified absence. The returned historical snapshot cannot
   * close dirty impacts or select a root after the host/head changes; the eventual C2 transaction
   * protocol must provide those separate proofs. No families, Markdown or host inventory are read.
   */
  async readOwnerSummary(sourceId: string): Promise<ContributorFailure | Readonly<{
    outcome: "ready"; summary: ContributorOwnerSummary; stamp: SelectedSourceStamp;
    dependency: SourceDependencyBuild & Readonly<{ digest: string }>;
  }>> {
    if (this.queries >= 2) return failure(new SourceFactError("backpressure"));
    this.queries++;
    try {
      if (typeof sourceId !== "string" || !sourceId || sourceId.length > MAX_QUERY_KEY_BYTES
        || bytes(contributorKey("summary", sourceId)) > MAX_QUERY_KEY_BYTES) throw new SourceFactError("unsupported-scope");
      const { root, record } = await this.root();
      const budget: QueryBudget = { buckets: new Map(), pages: 0, bytes: 0 };
      const found = await this.lookup(root, new Set([contributorKey("source", sourceId)]), budget);
      if (!found.length) throw new SourceFactError("missing");
      if (found.length !== 1 || found[0].kind !== "source") throw new SourceFactError("dependency-invalid");
      const owner = found[0];
      if (owner.head.sourceId !== sourceId || owner.head.state !== "complete" || owner.head.sequence > root.build.sequence
        || owner.order >= root.sources) throw new SourceFactError("dependency-invalid");
      const summary = (await this.summaries(root, [owner], budget)).get(sourceId);
      if (!summary) throw new SourceFactError("dependency-invalid");
      const stamp: SelectedSourceStamp = { head: owner.head, sequence: owner.head.sequence, saved: true };
      const checked = await this.repository.validateSelections([stamp], this.current);
      if (checked.reason !== "ready") throw new SourceFactError(checked.reason);
      const after = await this.root();
      if (after.record.digest !== record.digest || after.record.build.generation !== record.build.generation) throw new SourceFactError("superseded");
      return { outcome: "ready", summary, stamp, dependency: { ...record.build, digest: record.digest } };
    } catch (error) { return failure(error); }
    finally { this.queries--; }
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
      const selected = new Map<string, Extract<DependencyRow, { kind: "source" | "host" }>>();
      for (const value of await this.lookup(root, ownerKeys, budget)) {
        if (value.kind === "link" || value.kind === "summary" || selected.has(value.key)) throw new SourceFactError("dependency-invalid");
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
      // A source lookup row without its complete original summary is not a selectable owner.
      // In particular, an empty summary-page lookup cannot be reinterpreted as an empty key set.
      await this.summaries(root, sources, budget);
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
   * Synchronous host fence for a private caller's final return, including zero-source scopes.
   * This observes the existing session/environment capability only: it authenticates no root,
   * journal or selected head, repairs nothing, and must follow full certificate revalidation.
   */
  isHostCurrent(): boolean {
    try { return this.current() && this.host.validate(); }
    catch { return false; }
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
