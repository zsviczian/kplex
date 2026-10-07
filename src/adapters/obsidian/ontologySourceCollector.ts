/**
 * Obsidian reference-source adapter (the historical ontology collector module). It visits every
 * reference-bearing frontmatter/inline value without ontology or image settings, resolves lexical
 * targets through the host, and streams one shared provenance payload per physical occurrence.
 * GraphBuilder owns acquisition; this adapter owns bounded output and source/file revision fences.
 * External targets normalize web authority/root identity; raw property spellings stay in provenance.
 */
import { TFile } from "obsidian";
import { canonicalWebUrl, webUrlOriginTarget } from "./urlIdentity";
import { nodeId, type GraphNodeKind, type NodeId } from "../../core/graph/model";
import {
  estimateReferenceRecordBytes,
  MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH,
  MAX_REFERENCE_BATCH_ESTIMATED_BYTES,
  MAX_REFERENCE_PAYLOAD_CHARS,
  referenceValueId,
  sourceGeneration,
  sourceRevision,
  sourceSnapshotRevision,
  type NormalizedSourceBatch,
  type NormalizedSourceRecord,
  type ReferenceValueFact,
  type SourceEntityRef,
  type SourceReadBoundary,
  type SourceRevision,
  type SourceTargetRef,
} from "../../core/graph/source";
import { type ExtractedLinkReference, type ParsedFileMetadata } from "../../core/parser/metadata";
import {
  iteratePropertyValueSteps,
  iterateReferencePayloadChunks,
  iterateReferenceScanSteps,
  type PropertyValueOccurrence,
} from "../../core/parser/referenceValues";

export type ReferenceSourceCollectorHost = Readonly<{
  metadataCache: Readonly<{
    getFirstLinkpathDest(linkpath: string, sourcePath: string): TFile | null;
  }>;
  resolvedLinkCount(sourcePath: string, targetPath: string): number;
}>;

export type ReferenceSourceCollectorRuntime = Readonly<{
  isCurrent: () => boolean;
  checkpoint: () => Promise<boolean>;
  /** Monotonic source-event revision owned by the existing index coordinator. */
  sourceRevision: () => number;
}>;

type CapturedFileRevision = Readonly<{ path: string; mtime: number; size: number }>;
let collectorRunSequence = 0;
const CHECKPOINT_INTERVAL = 32;

/** Preserve the host's established case-sensitive Markdown/attachment distinction. */
function fileKind(file: TFile): GraphNodeKind { return file.extension === "md" ? "document" : "attachment"; }

/** Copy only explicit identity/path/kind facets; no host object crosses the source boundary. */
function fileRef(file: TFile): SourceEntityRef {
  return { id: nodeId(file.path), kind: fileKind(file), state: "materialized", semanticPath: file.path, physicalPath: file.path };
}

/** Mint a revision for this captured observation, not a claim that mtime alone proves coherence. */
function sourceRevisionFor(file: CapturedFileRevision, hostRevision: number): SourceRevision {
  return sourceRevision(`references:${file.path}\u0000${file.mtime}\u0000${file.size}\u0000${hostRevision}`);
}

/** Preserve legacy URI/subpath handling before asking Obsidian to resolve an internal target. */
function decodeInternalCandidate(rawTarget: string): string {
  let candidate = rawTarget.trim();
  try { candidate = decodeURIComponent(candidate); } catch { /* preserve undecodable host input */ }
  const hash = candidate.indexOf("#");
  return hash >= 0 ? candidate.slice(0, hash) : candidate;
}

/** Resolve only in the adapter; the neutral fact keeps lexical and resolved targets separately. */
export function resolveObsidianReferenceTarget(host: ReferenceSourceCollectorHost, sourcePath: string, reference: ExtractedLinkReference): SourceTargetRef | null {
  if (reference.external) {
    if (!reference.rawTarget) return null;
    const url = canonicalWebUrl(reference.rawTarget);
    return { entity: { id: nodeId(url), kind: "url", state: "materialized", semanticPath: url },
      rawTarget: reference.rawTarget, resolvedBy: "url" };
  }
  const candidate = decodeInternalCandidate(reference.rawTarget);
  if (!candidate) return null;
  const destination = host.metadataCache.getFirstLinkpathDest(candidate, sourcePath);
  return {
    entity: destination instanceof TFile ? fileRef(destination)
      : { id: nodeId(candidate), kind: "unresolved", state: "unresolved", semanticPath: candidate },
    rawTarget: reference.rawTarget,
    ...(reference.subpath ? { subpath: reference.subpath } : {}),
    resolvedBy: destination instanceof TFile ? "host" : "unresolved",
  };
}

/** Compatibility export; live collection and cached replay share the portable byte estimator. */
export { estimateReferenceRecordBytes } from "../../core/graph/source";

/**
 * One terminal, revision-fenced source attempt. Record and byte budgets bound the output queue;
 * only a single oversized lexical identity record may exceed the byte estimate (never a payload
 * chunk). No candidate array, complete frontmatter mirror or whole-vault fact collection is built.
 */
export class ObsidianReferenceSourceCollector {
  readonly boundary: SourceReadBoundary;
  private readonly startingHostRevision: number;
  private readonly capturedFile: CapturedFileRevision;
  private readonly source: SourceEntityRef;
  private readonly revision: SourceRevision;
  private nextSequence = 0;
  private state: "new" | "collecting" | "finalized" | "failed" = "new";

  /**
   * Capture the source boundary without ontology configuration. The optional external-only lane
   * restricts facts to URLs while retaining the same grammar, provenance and source-read fences.
   */
  constructor(
    private readonly host: ReferenceSourceCollectorHost,
    private readonly runtime: ReferenceSourceCollectorRuntime,
    private readonly file: TFile,
    private readonly metadata: ParsedFileMetadata,
    private readonly options: Readonly<{ externalOnly?: boolean }> = {},
  ) {
    this.startingHostRevision = runtime.sourceRevision();
    this.capturedFile = { path: file.path, mtime: file.stat.mtime, size: file.stat.size };
    this.source = fileRef(file);
    this.revision = sourceRevisionFor(this.capturedFile, this.startingHostRevision);
    const label = `obsidian-references-${++collectorRunSequence}:${file.path}`;
    this.boundary = { generation: sourceGeneration(label), snapshotRevision: sourceSnapshotRevision(`${label}:boundary`) };
  }

  /** Stream ordered value/payload/candidate records with consumer backpressure and terminal rejection. */
  async collectBatches(consume: (batch: NormalizedSourceBatch) => Promise<boolean> | boolean): Promise<boolean> {
    if (this.state !== "new" || !this.isCurrent()) return false;
    this.state = "collecting";
    try {
      let records: NormalizedSourceRecord[] = [];
      let bytes = 0;
      let processed = 0;
      /** Transfer the bounded queue; an awaited consumer never observes a subsequently mutated array. */
      const flush = async (final: boolean): Promise<boolean> => {
        const batch = { boundary: this.boundary, sequence: this.nextSequence++, final, records };
        records = [];
        bytes = 0;
        if (!(await consume(batch))) return false;
        return final ? this.isCurrent() : this.checkpoint();
      };
      /** Even ignored/non-reference/duplicate inputs remain cancellable between scan steps. */
      const touch = async (): Promise<boolean> => {
        processed += 1;
        return processed % CHECKPOINT_INTERVAL === 0 ? this.checkpoint() : this.isCurrent();
      };
      /** Apply both budgets before enqueueing; oversized lexical records travel alone, never truncated. */
      const emit = async (record: NormalizedSourceRecord): Promise<boolean> => {
        const size = estimateReferenceRecordBytes(record);
        if (records.length && bytes + size > MAX_REFERENCE_BATCH_ESTIMATED_BYTES && !(await flush(false))) return false;
        records.push(record);
        bytes += size;
        if ((records.length >= MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH || bytes >= MAX_REFERENCE_BATCH_ESTIMATED_BYTES)
          && !(await flush(false))) return false;
        return touch();
      };
      for (const occurrence of iteratePropertyValueSteps(this.metadata)) {
        if (!(await (occurrence ? this.collectValue(occurrence, emit, touch) : touch()))) { this.state = "failed"; return false; }
      }
      if (!this.isCurrent() || !(await flush(true))) { this.state = "failed"; return false; }
      this.state = "finalized";
      return true;
    } catch (error) {
      this.state = "failed";
      throw error;
    }
  }

  /** Only a fully consumed, still-current source attempt may close the compiler read. */
  isBoundaryCurrent(boundary: SourceReadBoundary): boolean {
    return this.state === "finalized" && this.isCurrent() && boundary.generation === this.boundary.generation
      && boundary.snapshotRevision === this.boundary.snapshotRevision;
  }

  /**
   * Enumerate one value lazily; deduplicate targets only within this physical value occurrence.
   * The URL lane may request external-only facts, retaining original value payload/provenance and
   * cancellation work while skipping internal resolution and unrelated semantic candidates.
   */
  private async collectValue(
    occurrence: PropertyValueOccurrence,
    emit: (record: NormalizedSourceRecord) => Promise<boolean>,
    touch: () => Promise<boolean>,
  ): Promise<boolean> {
    if (!occurrence.normalizedFieldName) return touch();
    const { value, ...identity } = occurrence;
    const header: ReferenceValueFact = { ...identity, kind: "reference-value", source: this.source, sourceRevision: this.revision,
      valueId: referenceValueId(JSON.stringify([identity.surface, identity.origin, identity.fieldName, identity.ordinal])) };
    const seen = new Set<NodeId>();
    let pending: Readonly<{ target: SourceTargetRef; origin?: SourceTargetRef; hostOccurrenceCount: number }> | undefined;
    let ordinal = 0;
    for (const reference of iterateReferenceScanSteps(value)) {
      if (!(await touch())) return false;
      if (!reference) continue;
      if (this.options.externalOnly && !reference.external) continue;
      const target = resolveObsidianReferenceTarget(this.host, this.capturedFile.path, reference);
      if (!target || seen.has(target.entity.id)) continue;
      seen.add(target.entity.id);
      if (!pending) {
        if (!(await emit(header))) return false;
        const chunks = iterateReferencePayloadChunks(value, MAX_REFERENCE_PAYLOAD_CHARS);
        let chunk = chunks.next();
        let index = 0;
        while (!chunk.done) {
          const next = chunks.next();
          if (!(await emit({ kind: "reference-payload", source: this.source, sourceRevision: this.revision,
            valueId: header.valueId, index: index++, final: Boolean(next.done), text: chunk.value }))) return false;
          chunk = next;
        }
      }
      if (pending && !(await emit({ kind: "reference-candidate", source: this.source, sourceRevision: this.revision,
        valueId: header.valueId, ordinal: ordinal++, final: false, ...pending }))) return false;
      const origin = webUrlOriginTarget(target);
      pending = { target, ...(origin ? { origin } : {}),
        hostOccurrenceCount: this.host.resolvedLinkCount(this.capturedFile.path, target.entity.semanticPath ?? "") };
    }
    if (pending && !(await emit({ kind: "reference-candidate", source: this.source, sourceRevision: this.revision,
      valueId: header.valueId, ordinal, final: true, ...pending }))) return false;
    return this.checkpoint();
  }

  /** Fence both sides of the host-owned cooperative yield. */
  private async checkpoint(): Promise<boolean> {
    return this.isCurrent() && await this.runtime.checkpoint() && this.isCurrent();
  }

  /** Reject source events, renames and stat changes observed during any awaited consumer work. */
  private isCurrent(): boolean {
    return this.runtime.isCurrent() && this.runtime.sourceRevision() === this.startingHostRevision
      && this.file.path === this.capturedFile.path && this.file.stat.mtime === this.capturedFile.mtime
      && this.file.stat.size === this.capturedFile.size;
  }
}
