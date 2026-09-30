/**
 * Validated SI3 facts -> bounded canonical normalized batches. This storage adapter joins lexical
 * frames to their selected resolution family, without Markdown reads, scanning or semantic policy.
 * It owns one source pin at a time; callers supply current host facts and keep compilation private.
 * An optional neutral-fact observer shares the same four validated family visits and pin. Observer
 * effects are private until the entire selected read succeeds; it cannot authorize publication.
 */
import {
  acceptSourceBatch, beginSourceRead, estimateReferenceRecordBytes, MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH,
  MAX_REFERENCE_BATCH_ESTIMATED_BYTES, referenceValueId, sourceGeneration, sourceReadCanPublish, sourceRevision, sourceSnapshotRevision,
  type BodyUrlOccurrence, type HostLinkOccurrence, type NormalizedSourceBatch, type NormalizedSourceRecord,
  type ReferenceCandidate, type SourceEntityRef, type SourceReadBoundary, type SourceRevision,
} from "../core/graph/source";
import type { ParsedBodyMetadata } from "../core/parser/metadata";
import { normalizeFieldName } from "../core/parser/metadata";
import {
  SOURCE_DECODE_BUDGET_BYTES, SOURCE_FAMILIES, SourceBodyDecoder, SourceFactError,
  type SourceFamily, type SourceObservation, type SourcePhysical, type SourceReason, type StoredSourceFact, type StoredValueHeader,
} from "./SourceFacts";
import {
  type NeutralSourceRepository, type SelectedSourceReader, type SelectedSourceResult, type SelectedSourceStamp,
} from "./SourceRepository";

/** Host-only missing inputs. No resolver is called for a stored lexical reference during replay. */
export type CachedSourceHost = Readonly<{
  source: SourceEntityRef;
  physical: SourcePhysical;
  observation: SourceObservation;
  isCurrent(): boolean;
  structure(emit: (record: NormalizedSourceRecord) => Promise<boolean>): Promise<boolean>;
  presentation(body: ParsedBodyMetadata, emit: (record: NormalizedSourceRecord) => Promise<boolean>): Promise<boolean>;
  hostLink(record: Extract<StoredSourceFact, { kind: "host-link" }>, revision: SourceRevision): HostLinkOccurrence;
  bodyUrl(record: Extract<StoredSourceFact, { kind: "body-url" }>, revision: SourceRevision): BodyUrlOccurrence;
}>;
/** Expected head is optional for discovery, mandatory when retrying a previously selected scope. */
export type CachedSourceRequest = Readonly<{
  sourceId: string;
  host: CachedSourceHost;
  expected?: Readonly<{ sourceRevision: string; sequence: number | null }>;
}>;
/** Cooperative work is injected; this module owns no window, timer, parser or Vault capability. */
export type SourceReplayRuntime = Readonly<{ now(): number; yield(): Promise<void>; isCurrent(): boolean; sliceBudgetMs: number }>;
/** Aggregate work counts for a single requested owner, not a pair-specific performance claim. */
export type SourceReplayWork = Readonly<{
  familyVisits: number; chunks: number; storedRecords: number; normalizedRecords: number; batches: number;
  maxBatchRecords: number; maxBatchEstimatedBytes: number; retainedJoinBytes: number;
}>;
export type CachedSourceRead = Readonly<{ boundary: SourceReadBoundary; work: SourceReplayWork }>;
/**
 * Observe each already chunk/posting-validated batch once, before canonical replay consumes it.
 * The observer must await its own bounded work, must not mutate or retain the supplied records,
 * and must keep all derived output private. A family may still fail its terminal framing/digest
 * check, or the selected head may change, after this callback. Only read()'s terminal ready result
 * closes those checks. False rejects the read as cancelled; exceptions abort it and release the
 * existing source pin. No separate final callback, detached task or second family pass is owned here.
 */
export type CachedSourceFactObserver = (family: SourceFamily, records: readonly StoredSourceFact[]) => Promise<boolean> | boolean;
/** Private SI4 phase projection; "all" preserves the accepted replay byte-for-byte behavior. */
export type CachedSourceReplayPhase = "all" | "host-resolved" | "host-unresolved" | "markdown";
type Resolution = Extract<StoredSourceFact, { kind: "reference-resolution" }>;
type LiteralResolution = Extract<StoredSourceFact, { kind: "literal-resolution" }>;
type ResolutionGroup = { records: Resolution[]; hasTarget: boolean; next: number };
let replaySequence = 0;

/** Match all supplied observations without deriving an identity from a source/path spelling. */
export function cachedSourceMatches(request: CachedSourceRequest, stamp: SelectedSourceStamp): SourceReason {
  if (!request.host.isCurrent()) return "stale";
  const { head, sequence } = stamp;
  const physical = request.host.physical;
  if (head.sourceId !== request.sourceId || head.physical.identity !== physical.identity || head.physical.path !== physical.path
    || head.physical.mtime !== physical.mtime || head.physical.size !== physical.size || head.physical.ctime !== physical.ctime) return "stale";
  const observation = request.host.observation;
  if (head.observation.epoch !== observation.epoch || head.observation.revision !== observation.revision
    || head.observation.environment !== observation.environment) return "stale";
  if (request.expected && (head.sourceRevision !== request.expected.sourceRevision || sequence !== request.expected.sequence)) return "superseded";
  return "ready";
}

/** Bounded batch queue with the same cursor and terminal checks as every normalized producer. */
class ReplayBatchWriter {
  private records: NormalizedSourceRecord[] = [];
  private bytes = 0;
  private cursor;
  private sliceStarted: number;
  private steps = 0;
  private failed = false;
  readonly counts = { normalizedRecords: 0, batches: 0, maxBatchRecords: 0, maxBatchEstimatedBytes: 0 };

  /** Capture a fresh producer boundary; the sink must stage records privately until read success. */
  constructor(readonly boundary: SourceReadBoundary, private readonly runtime: SourceReplayRuntime,
    private readonly consume: (batch: NormalizedSourceBatch) => Promise<boolean> | boolean) {
    this.cursor = beginSourceRead(boundary);
    this.sliceStarted = runtime.now();
  }

  /** Even ignored frames and null/duplicate bindings count as cancellable cooperative work. */
  async touch(): Promise<boolean> {
    if (this.failed || !this.runtime.isCurrent()) return false;
    if (++this.steps % 32 === 0 || this.runtime.now() - this.sliceStarted >= this.runtime.sliceBudgetMs) {
      await this.runtime.yield();
      this.sliceStarted = this.runtime.now();
    }
    return !this.failed && this.runtime.isCurrent();
  }

  /** Flush at record/estimated-byte bounds; an indivisible identity travels alone, never truncated. */
  async emit(record: NormalizedSourceRecord): Promise<boolean> {
    if (this.failed || this.cursor.complete || !this.runtime.isCurrent()) return false;
    const bytes = estimateReferenceRecordBytes(record);
    if (bytes > SOURCE_DECODE_BUDGET_BYTES) throw new SourceFactError("decode-budget");
    if (this.records.length && this.bytes + bytes > MAX_REFERENCE_BATCH_ESTIMATED_BYTES && !(await this.flush(false))) return false;
    this.records.push(record); this.bytes += bytes; this.counts.normalizedRecords += 1;
    if ((this.records.length >= MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH || this.bytes >= MAX_REFERENCE_BATCH_ESTIMATED_BYTES)
      && !(await this.flush(false))) return false;
    return this.touch();
  }

  /** Seal the last queue, then confirm the same canonical cursor reached terminal finality. */
  async finish(): Promise<boolean> {
    return await this.flush(true) && sourceReadCanPublish(this.cursor, this.boundary) && this.runtime.isCurrent();
  }

  /** Transfer an immutable batch with backpressure and recheck the caller fence after its await. */
  private async flush(final: boolean): Promise<boolean> {
    if (this.failed || !this.runtime.isCurrent()) return false;
    const batch = { boundary: this.boundary, sequence: this.cursor.nextSequence, final, records: this.records };
    const accepted = acceptSourceBatch(this.cursor, batch);
    if (!accepted.accepted) { this.failed = true; return false; }
    this.counts.batches += 1;
    this.counts.maxBatchRecords = Math.max(this.counts.maxBatchRecords, this.records.length);
    this.counts.maxBatchEstimatedBytes = Math.max(this.counts.maxBatchEstimatedBytes, this.bytes);
    this.records = []; this.bytes = 0;
    if (!(await this.consume(batch)) || !this.runtime.isCurrent()) { this.failed = true; return false; }
    this.cursor = accepted.cursor;
    return this.touch();
  }
}

/**
 * One immutable source replay. Resolution joins have an explicit 8 MiB reservation separate from
 * repository chunk/body-decoder budgets. Oversized scopes reject; no unbounded fact mirror or
 * whole-source-per-pair loop is permitted. Every selected family is visited once.
 */
export class CachedSourceReplay {
  /** Keep storage ownership separate from compiler and host capabilities. */
  constructor(private readonly repository: NeutralSourceRepository) {}

  /**
   * Validate all families under one head, awaiting the observer before canonical consumption of
   * each stored batch. Neither observer nor normalized output is usable unless this whole read is
   * ready. With no observer, the accepted SI4a ordering, batches and work counts are unchanged.
   */
  async read(request: CachedSourceRequest, runtime: SourceReplayRuntime,
    consume: (batch: NormalizedSourceBatch) => Promise<boolean> | boolean,
    observe?: CachedSourceFactObserver, phase: CachedSourceReplayPhase = "all"): Promise<SelectedSourceResult<CachedSourceRead>> {
    /** The observer, canonical writer and selected read share the same caller/host lifetime. */
    const current = (): boolean => runtime.isCurrent() && request.host.isCurrent();
    const label = `cached-source:${++replaySequence}`;
    const boundary = { generation: sourceGeneration(label), snapshotRevision: sourceSnapshotRevision(label) };
    const writer = new ReplayBatchWriter(boundary, { ...runtime, isCurrent: current }, consume);
    return this.repository.readSelected(request.sourceId,
      /** A stored-fact callback does not relax any selected source/physical/host observation fence. */
      (stamp) => cachedSourceMatches(request, stamp),
      /** Keep both streams private until canonical finality and the repository's final lease fence. */
      async (reader) => {
        const work = await this.replay(reader, request.host, writer, current, observe, phase);
        if (!current() || !(await writer.finish()) || !current()) throw new SourceFactError("cancelled");
        return { boundary, work: { ...work, ...writer.counts } };
      }, current);
  }

  /**
   * Join stored facts by explicit value identity; classification remains in the normalized sink.
   * The observer shares each validated chunk and its lease, and is awaited inside the same
   * cancellation/error boundary. It does not change canonical target deduplication or multiplicity.
   */
  private async replay(reader: SelectedSourceReader, host: CachedSourceHost, writer: ReplayBatchWriter,
    current: () => boolean, observe?: CachedSourceFactObserver,
    phase: CachedSourceReplayPhase = "all"): Promise<Omit<SourceReplayWork, keyof ReplayBatchWriter["counts"]>> {
    const revision = sourceRevision(reader.head.sourceRevision);
    const base = { source: host.source, sourceRevision: revision };
    const groups = new Map<string, ResolutionGroup>();
    const literals = new Map<number, LiteralResolution>();
    const dates: Array<Extract<StoredSourceFact, { kind: "date-property" }>> = [];
    const inlineNames: Array<Extract<StoredSourceFact, { kind: "field-name" }>> = [];
    const body = new SourceBodyDecoder();
    let familyVisits = 0; let chunks = 0; let storedRecords = 0; let retainedJoinBytes = 0;
    /** Reserve transient join metadata without retaining complete values or candidate payload copies. */
    const reserve = (record: unknown): void => {
      retainedJoinBytes += estimateReferenceRecordBytes(record) + 64;
      if (retainedJoinBytes > SOURCE_DECODE_BUDGET_BYTES) throw new SourceFactError("decode-budget", "resolution");
    };
    /** Visit each family once, preserving storage validation and canonical producer backpressure. */
    const visit = async (family: typeof SOURCE_FAMILIES[number], accept: (record: StoredSourceFact) => Promise<boolean>): Promise<void> => {
      familyVisits += 1;
      let joinFailure: SourceFactError | undefined;
      const reason = await reader.visit(family,
        /** Await neutral observation before canonical consumption under this validated chunk lease. */
        async (records) => {
          chunks += 1; storedRecords += records.length;
          try {
            if (!current() || observe && (!(await observe(family, records)) || !current())) return false;
            for (const record of records) if (!current() || !(await accept(record)) || !(await writer.touch())) return false;
            return current();
          } catch (error) {
            // The repository identifies the family being read; a cross-family join must retain the
            // originating resolution/metadata failure instead of blaming an intact values chunk.
            if (error instanceof SourceFactError) joinFailure = error;
            throw error;
          }
        });
      if (joinFailure) throw joinFailure;
      if (reason !== "ready") throw new SourceFactError(reason, family);
      if (!current()) throw new SourceFactError("cancelled", family);
    };
    /** Emit only through the bounded queue; phase projection never changes stored-frame validation. */
    const emit = (record: NormalizedSourceRecord): Promise<boolean> => writer.emit(record);
    const markdown = phase === "all" || phase === "markdown";
    const emitMarkdown = (record: NormalizedSourceRecord): Promise<boolean> => markdown ? emit(record) : Promise.resolve(true);
    const emitStructure = phase === "all" ? emit : async (): Promise<boolean> => true;
    if (!(await host.structure(emitStructure)) || !current()) throw new SourceFactError("cancelled");

    await visit("resolution", async (record) => {
      if (record.kind === "reference-resolution") {
        reserve(record);
        let group = groups.get(record.valueId);
        if (!group) { group = { records: [], hasTarget: false, next: 0 }; groups.set(record.valueId, group); }
        if (record.ordinal !== group.records.length) throw new SourceFactError("invalid-frame", "resolution");
        group.records.push(record); group.hasTarget ||= record.target !== null;
      } else if (record.kind === "literal-resolution") {
        reserve(record);
        if (literals.has(record.ordinal)) throw new SourceFactError("invalid-frame", "resolution");
        literals.set(record.ordinal, record);
      } else if (record.kind === "date-property") {
        if (normalizeFieldName(record.fieldName) !== record.normalizedFieldName) throw new SourceFactError("invalid-frame", "resolution");
        reserve(record); dates.push(record);
      }
      else if (record.kind === "host-link") {
        const selected = phase === "all" || phase === "host-resolved" && record.state === "resolved"
          || phase === "host-unresolved" && record.state === "unresolved";
        return !selected || emit(host.hostLink(record, revision));
      }
      return true;
    });
    await visit("metadata", async (record) => {
      if (record.kind === "alias" || record.kind === "tag") return emitMarkdown({ ...base, kind: "semantic-metadata",
        metadataKind: record.kind, value: record.value, provenance: { surface: record.kind === "alias" ? "frontmatter" : "host" } });
      if (record.kind === "field-name") {
        if (normalizeFieldName(record.fieldName) !== record.normalizedFieldName) throw new SourceFactError("invalid-frame", "metadata");
        if (record.surface === "inline") { reserve(record); inlineNames.push(record); return true; }
        return emitMarkdown({ ...base, ...record, provenance: { surface: record.surface,
          fieldName: record.fieldName, normalizedFieldName: record.normalizedFieldName } });
      }
      if (record.kind === "host-literal") {
        const resolution = literals.get(record.ordinal);
        if (!resolution || resolution.target && resolution.target.rawTarget !== record.rawTarget) throw new SourceFactError("invalid-frame", "resolution");
        literals.delete(record.ordinal);
      }
      // file-parent is not a complete structural entity/topology fact. The host supplement owns it.
      return true;
    });
    if (literals.size) throw new SourceFactError("invalid-frame", "resolution");

    let header: StoredValueHeader | undefined;
    let active: ResolutionGroup | undefined;
    let pending: Omit<ReferenceCandidate, "ordinal" | "final"> | undefined;
    let seen = new Set<string>();
    let ordinal = 0; let inlineIndex = 0;
    await visit("values", async (record) => {
      body.accept(record);
      if (record.kind === "reference-value" || record.kind === "inline-value") {
        if (normalizeFieldName(record.fieldName) !== record.normalizedFieldName) throw new SourceFactError("invalid-frame", "values");
        header = record; active = groups.get(record.valueId); pending = undefined; seen = new Set(); ordinal = 0;
        if (record.surface === "inline" && record.origin === "physical") {
          const field = inlineNames[inlineIndex++];
          if (!field || field.fieldName !== record.fieldName || field.normalizedFieldName !== record.normalizedFieldName) throw new SourceFactError("invalid-frame", "metadata");
          if (!(await emitMarkdown({ ...base, ...field, provenance: { surface: "inline", fieldName: field.fieldName,
            normalizedFieldName: field.normalizedFieldName, location: { line: record.location?.line, start: record.location?.start, end: record.location?.end } } }))) return false;
        }
        if (record.kind === "inline-value") {
          if (active) throw new SourceFactError("invalid-frame", "resolution");
          return true;
        }
        if (!active) throw new SourceFactError("invalid-frame", "resolution");
        return !active.hasTarget || emitMarkdown({ ...record, ...base, kind: "reference-value", valueId: referenceValueId(record.valueId) });
      }
      if (record.kind === "reference-payload") return !active?.hasTarget || emitMarkdown({ ...record, ...base, kind: "reference-payload", valueId: referenceValueId(record.valueId) });
      if (record.kind !== "reference-candidate") return true;
      const resolved = active?.records[record.ordinal];
      if (!header || !active || !resolved || active.next++ !== record.ordinal
        || resolved.target && (resolved.target.rawTarget !== record.rawTarget
          || !record.external && resolved.target.subpath !== record.subpath)) throw new SourceFactError("invalid-frame", "resolution");
      if (resolved.target && !seen.has(resolved.target.entity.id)) {
        seen.add(resolved.target.entity.id);
        if (pending && !(await emitMarkdown({ ...pending, ordinal: ordinal++, final: false }))) return false;
        pending = { ...base, kind: "reference-candidate", valueId: referenceValueId(record.valueId),
          target: resolved.target, hostOccurrenceCount: resolved.hostOccurrenceCount };
      }
      if (record.final) {
        if (active.next !== active.records.length) throw new SourceFactError("invalid-frame", "resolution");
        groups.delete(record.valueId);
        if (pending && !(await emitMarkdown({ ...pending, ordinal, final: true }))) return false;
        pending = undefined;
      }
      return true;
    });
    if (groups.size || pending || inlineIndex !== inlineNames.length) throw new SourceFactError("invalid-frame", "resolution");
    const decodedBody = body.finish();
    if (!(await host.presentation(decodedBody, emitMarkdown)) || !current()) throw new SourceFactError("cancelled");
    for (const record of dates) {
      if (!(await emitMarkdown({ ...base, kind: "date-property", target: record.target, provenance: {
        surface: "frontmatter", definition: record.fieldName, fieldName: record.fieldName,
        normalizedFieldName: record.normalizedFieldName, rawValue: record.rawValue,
      } }))) throw new SourceFactError("cancelled");
    }
    await visit("body-urls", async (record) => record.kind !== "body-url" || emitMarkdown(host.bodyUrl(record, revision)));
    return { familyVisits, chunks, storedRecords, retainedJoinBytes };
  }
}
