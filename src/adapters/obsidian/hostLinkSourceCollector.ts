import { TFile } from "obsidian";
import { nodeId, type GraphNodeKind } from "../../core/graph/model";
import {
  MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH,
  sourceGeneration,
  sourceRevision,
  sourceSnapshotRevision,
  type HostLinkOccurrence,
  type NormalizedSourceBatch,
  type NormalizedSourceRecord,
  type SourceEntityRef,
  type SourceReadBoundary,
  type SourceRevision,
} from "../../core/graph/source";

export type HostLinkMap = Readonly<Record<string, Readonly<Record<string, number>>>>;

export type HostLinkSourceCollectorHost = Readonly<{
  vault: Readonly<{
    getFileByPath(path: string): TFile | null;
  }>;
  metadataCache: Readonly<{
    resolvedLinks: HostLinkMap;
    unresolvedLinks: HostLinkMap;
  }>;
}>;

export type HostLinkSourceCollectorRuntime = Readonly<{
  isCurrent: () => boolean;
  checkpoint: () => Promise<boolean>;
  /** Monotonic source-event revision owned by the existing index coordinator. */
  sourceRevision: () => number;
}>;

export type HostLinkSignatureEntries = Readonly<{
  resolved: ReadonlyArray<readonly [string, number]>;
  unresolved: ReadonlyArray<readonly [string, number]>;
}>;

type HostLinkScanResult = Readonly<{ digest: string }>;
type HostLinkEmitter = (record: HostLinkOccurrence) => Promise<boolean>;

let collectorRunSequence = 0;
const CHECKPOINT_INTERVAL = 64;

class HostLinkDigest {
  private a = 2166136261 >>> 0;
  private b = 3339675911 >>> 0;
  private c = 374761393 >>> 0;
  private d = 668265263 >>> 0;
  private length = 0;

  update(value: string | number | null | undefined): void {
    const text = value === null ? "<null>" : value === undefined ? "<undefined>" : String(value);
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      this.a = Math.imul(this.a ^ code, 16777619) >>> 0;
      this.b = Math.imul(this.b ^ (code + this.length), 2246822519) >>> 0;
      this.c = Math.imul(this.c ^ (code + (this.length << 1)), 3266489917) >>> 0;
      this.d = Math.imul(this.d ^ (code + (this.length >>> 1)), 2654435761) >>> 0;
      this.length += 1;
    }
    this.separator();
  }

  private separator(): void {
    this.a = Math.imul(this.a, 16777619) >>> 0;
    this.b = Math.imul(this.b ^ this.length, 2246822519) >>> 0;
    this.c = Math.imul(this.c ^ (this.length << 1), 3266489917) >>> 0;
    this.d = Math.imul(this.d ^ (this.length >>> 1), 2654435761) >>> 0;
    this.length += 1;
  }

  value(): string {
    return [this.length, this.a, this.b, this.c, this.d].map((value) => value.toString(36)).join(":");
  }
}

function fileKind(file: TFile): GraphNodeKind {
  return file.extension === "md" ? "document" : "attachment";
}

function materializedFileRef(file: TFile): SourceEntityRef {
  return {
    id: nodeId(file.path),
    kind: fileKind(file),
    state: "materialized",
    semanticPath: file.path,
    physicalPath: file.path,
  };
}

function missingFileRef(path: string): SourceEntityRef {
  return {
    id: nodeId(path),
    kind: "unresolved",
    state: "missing",
    semanticPath: path,
  };
}

function unresolvedRef(path: string): SourceEntityRef {
  return {
    id: nodeId(path),
    kind: "unresolved",
    state: "unresolved",
    semanticPath: path,
  };
}

function sourceRef(host: HostLinkSourceCollectorHost, path: string): SourceEntityRef {
  const file = host.vault.getFileByPath(path);
  return file instanceof TFile ? materializedFileRef(file) : missingFileRef(path);
}

function resolvedTargetRef(host: HostLinkSourceCollectorHost, path: string): SourceEntityRef {
  const file = host.vault.getFileByPath(path);
  return file instanceof TFile ? materializedFileRef(file) : missingFileRef(path);
}

function sourceMapRevision(sourcePath: string, hostRevision: number): SourceRevision {
  return sourceRevision(`host-links:${sourcePath}\u0000${hostRevision}`);
}

function hostLinkRecord(
  host: HostLinkSourceCollectorHost,
  source: SourceEntityRef,
  revision: SourceRevision,
  targetPath: string,
  occurrenceCount: number,
  kind: HostLinkOccurrence["kind"],
): HostLinkOccurrence {
  const targetEntity = kind === "obsidian-link" ? resolvedTargetRef(host, targetPath) : unresolvedRef(targetPath);
  return {
    kind,
    source,
    sourceRevision: revision,
    provenance: { surface: "host", definition: kind === "obsidian-link" ? "resolvedLinks" : "unresolvedLinks" },
    target: {
      entity: targetEntity,
      // MetadataCache maps expose the selected target identity/count, not the literal Markdown
      // spelling, heading, or physical location. Do not fabricate information the host map lacks.
      rawTarget: targetPath,
      resolvedBy: kind === "obsidian-link" ? "host" : "unresolved",
    },
    occurrenceCount,
  };
}

/** Read the exact count-bearing link-map inputs used by semantic no-op detection. */
export function readHostLinkSignatureEntries(
  metadataCache: HostLinkSourceCollectorHost["metadataCache"],
  sourcePath: string,
): HostLinkSignatureEntries {
  const resolved = Object.entries(metadataCache.resolvedLinks[sourcePath] ?? {}).sort(([left], [right]) => left.localeCompare(right));
  const unresolved = Object.entries(metadataCache.unresolvedLinks[sourcePath] ?? {}).sort(([left], [right]) => left.localeCompare(right));
  return { resolved, unresolved };
}

/**
 * Obsidian adapter for aggregate resolved/unresolved MetadataCache link maps.
 *
 * A collector instance is either a whole-map C12b1 read or one source-scoped incremental read.
 * Both use the same normalization path. Initial batches are non-final; `finalize()` re-scans only
 * the count-bearing maps and emits the final empty batch iff the family digest and source-event
 * revision still match. The boundary therefore describes this link-map family only, not an atomic
 * whole-vault snapshot shared with structural/ontology/Date/body families.
 */
export class ObsidianHostLinkSourceCollector {
  readonly boundary: SourceReadBoundary;
  private readonly startingRevision: number;
  private readonly startingSourcePath: string | null;
  private initialDigest: string | null = null;
  private nextSequence = 0;
  private state: "new" | "collecting" | "collected" | "failed" | "finalized" = "new";

  constructor(
    private readonly host: HostLinkSourceCollectorHost,
    private readonly runtime: HostLinkSourceCollectorRuntime,
    sourcePath?: string,
  ) {
    this.startingRevision = runtime.sourceRevision();
    this.startingSourcePath = sourcePath ?? null;
    const label = `obsidian-host-links-${++collectorRunSequence}${sourcePath ? `:${sourcePath}` : ":all"}`;
    this.boundary = {
      generation: sourceGeneration(label),
      snapshotRevision: sourceSnapshotRevision(`${label}:boundary`),
    };
  }

  async collectBatches(consume: (batch: NormalizedSourceBatch) => Promise<boolean> | boolean): Promise<boolean> {
    if (this.state !== "new" || !this.isCurrent()) return false;
    this.state = "collecting";
    try {
      let records: NormalizedSourceRecord[] = [];
      const emit: HostLinkEmitter = async (record) => {
        records.push(record);
        if (records.length < MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH) return true;
        const batch: NormalizedSourceBatch = {
          boundary: this.boundary,
          sequence: this.nextSequence++,
          final: false,
          records,
        };
        records = [];
        if (!(await consume(batch))) return false;
        return this.checkpoint();
      };
      const scanned = await this.scan(emit);
      if (!scanned || !this.isCurrent()) {
        this.state = "failed";
        return false;
      }
      if (records.length) {
        const batch: NormalizedSourceBatch = {
          boundary: this.boundary,
          sequence: this.nextSequence++,
          final: false,
          records,
        };
        if (!(await consume(batch)) || !(await this.checkpoint())) {
          this.state = "failed";
          return false;
        }
      }
      this.initialDigest = scanned.digest;
      this.state = "collected";
      return true;
    } catch (error) {
      this.state = "failed";
      throw error;
    }
  }

  async finalize(): Promise<NormalizedSourceBatch | null> {
    if (this.state !== "collected" || this.initialDigest === null || !this.isCurrent()) return null;
    this.state = "failed";
    const verification = await this.scan();
    if (!verification || !this.isCurrent() || verification.digest !== this.initialDigest) return null;
    this.state = "finalized";
    return {
      boundary: this.boundary,
      sequence: this.nextSequence++,
      final: true,
      records: [],
    };
  }

  isBoundaryCurrent(boundary: SourceReadBoundary): boolean {
    return this.state === "finalized" && this.isCurrent()
      && boundary.generation === this.boundary.generation
      && boundary.snapshotRevision === this.boundary.snapshotRevision;
  }

  private async checkpoint(): Promise<boolean> {
    if (!this.isCurrent()) return false;
    if (!(await this.runtime.checkpoint())) return false;
    return this.isCurrent();
  }

  private isCurrent(): boolean {
    return this.runtime.isCurrent() && this.runtime.sourceRevision() === this.startingRevision;
  }

  private *sourceEntries(map: HostLinkMap): IterableIterator<readonly [string, Readonly<Record<string, number>>]> {
    if (this.startingSourcePath !== null) {
      const targets = map[this.startingSourcePath];
      if (targets) yield [this.startingSourcePath, targets];
      return;
    }
    for (const sourcePath in map) {
      if (!Object.prototype.hasOwnProperty.call(map, sourcePath)) continue;
      const targets = map[sourcePath];
      if (targets) yield [sourcePath, targets];
    }
  }

  private async scan(emit?: HostLinkEmitter): Promise<HostLinkScanResult | null> {
    const digest = new HostLinkDigest();
    let processed = 0;
    const families: ReadonlyArray<readonly [HostLinkOccurrence["kind"], HostLinkMap]> = [
      ["obsidian-link", this.host.metadataCache.resolvedLinks],
      ["unresolved-link", this.host.metadataCache.unresolvedLinks],
    ];
    for (const [kind, map] of families) {
      for (const [sourcePath, targets] of this.sourceEntries(map)) {
        if (!this.isCurrent()) return null;
        digest.update(kind);
        digest.update(sourcePath);
        // One immutable source fact/revision per source map, shared by its bounded batches.
        const source = emit ? sourceRef(this.host, sourcePath) : null;
        const revision = emit ? sourceMapRevision(sourcePath, this.startingRevision) : null;
        for (const targetPath in targets) {
          if (!Object.prototype.hasOwnProperty.call(targets, targetPath)) continue;
          const occurrenceCount = targets[targetPath];
          digest.update(targetPath);
          digest.update(occurrenceCount);
          if (emit && source && revision && !(await emit(hostLinkRecord(this.host, source, revision, targetPath, occurrenceCount, kind)))) return null;
          processed += 1;
          if ((processed % CHECKPOINT_INTERVAL) === 0 && !(await this.checkpoint())) return null;
        }
        if (!(await this.checkpoint())) return null;
      }
    }
    return this.isCurrent() ? { digest: digest.value() } : null;
  }
}
