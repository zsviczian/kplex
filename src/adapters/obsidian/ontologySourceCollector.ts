import { TFile } from "obsidian";
import { nodeId, type GraphNodeKind } from "../../core/graph/model";
import {
  MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH,
  sourceGeneration,
  sourceRevision,
  sourceSnapshotRevision,
  type NormalizedSourceBatch,
  type NormalizedSourceRecord,
  type OntologyOccurrence,
  type SourceEntityRef,
  type SourceReadBoundary,
  type SourceRevision,
  type SourceTargetRef,
} from "../../core/graph/source";
import {
  getInlineFieldOccurrences,
  getNormalizedFrontmatterValues,
  iterateLinkReferencesFromValue,
  normalizeFieldName,
  type ExtractedLinkReference,
  type ParsedFileMetadata,
} from "../../index/fieldParser";

export type OntologySourceCollectorHost = Readonly<{
  metadataCache: Readonly<{
    getFirstLinkpathDest(linkpath: string, sourcePath: string): TFile | null;
  }>;
}>;

export type OntologySourceCollectorRuntime = Readonly<{
  isCurrent: () => boolean;
  checkpoint: () => Promise<boolean>;
  /** Monotonic source-event revision owned by the existing index coordinator. */
  sourceRevision: () => number;
}>;

export type OntologyConfiguredField = Readonly<{
  configuredFieldName: string;
  normalizedFieldName: string;
}>;

type CapturedFileRevision = Readonly<{
  path: string;
  mtime: number;
  size: number;
}>;

let collectorRunSequence = 0;
const CHECKPOINT_INTERVAL = 32;

function fileKind(file: TFile): GraphNodeKind {
  return file.extension === "md" ? "document" : "attachment";
}

function fileRef(file: TFile): SourceEntityRef {
  return {
    id: nodeId(file.path),
    kind: fileKind(file),
    state: "materialized",
    semanticPath: file.path,
    physicalPath: file.path,
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

function urlRef(url: string): SourceEntityRef {
  return {
    id: nodeId(url),
    kind: "url",
    state: "materialized",
    semanticPath: url,
  };
}

function sourceRevisionFor(file: CapturedFileRevision, hostRevision: number): SourceRevision {
  return sourceRevision(`ontology:${file.path}\u0000${file.mtime}\u0000${file.size}\u0000${hostRevision}`);
}

function configuredFields(fieldNames: readonly string[]): OntologyConfiguredField[] {
  const seen = new Set<string>();
  const output: OntologyConfiguredField[] = [];
  for (const configuredFieldName of fieldNames) {
    const normalizedFieldName = normalizeFieldName(configuredFieldName);
    if (!normalizedFieldName || seen.has(configuredFieldName)) continue;
    seen.add(configuredFieldName);
    output.push({ configuredFieldName, normalizedFieldName });
  }
  return output;
}

function rawValueText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function decodeInternalCandidate(rawTarget: string): string {
  let candidate = rawTarget.trim();
  try { candidate = decodeURIComponent(candidate); } catch { /* preserve undecodable host input */ }
  const hash = candidate.indexOf("#");
  if (hash >= 0) candidate = candidate.slice(0, hash);
  return candidate;
}

function resolveTarget(
  host: OntologySourceCollectorHost,
  sourcePath: string,
  reference: ExtractedLinkReference,
): SourceTargetRef | null {
  if (reference.external) {
    if (!reference.rawTarget) return null;
    return {
      entity: urlRef(reference.rawTarget),
      rawTarget: reference.rawTarget,
      resolvedBy: "url",
    };
  }
  const candidate = decodeInternalCandidate(reference.rawTarget);
  if (!candidate) return null;
  const destination = host.metadataCache.getFirstLinkpathDest(candidate, sourcePath);
  if (destination instanceof TFile) {
    return {
      entity: fileRef(destination),
      rawTarget: reference.rawTarget,
      ...(reference.subpath ? { subpath: reference.subpath } : {}),
      resolvedBy: "host",
    };
  }
  return {
    entity: unresolvedRef(candidate),
    rawTarget: reference.rawTarget,
    ...(reference.subpath ? { subpath: reference.subpath } : {}),
    resolvedBy: "unresolved",
  };
}

/**
 * Source-scoped C12b2 adapter. Markdown acquisition/parser caching remains in GraphBuilder; this
 * collector receives the already merged metadata view and owns only configured ontology occurrence
 * selection plus Obsidian destination resolution. One dense source may emit arbitrarily many
 * bounded batches. The boundary is explicitly per source attempt, not a whole-vault snapshot.
 */
export class ObsidianOntologySourceCollector {
  readonly boundary: SourceReadBoundary;
  readonly fields: readonly OntologyConfiguredField[];
  private readonly startingHostRevision: number;
  private readonly capturedFile: CapturedFileRevision;
  private readonly source: SourceEntityRef;
  private readonly sourceRevision: SourceRevision;
  private nextSequence = 0;
  private state: "new" | "collecting" | "finalized" | "failed" = "new";

  constructor(
    private readonly host: OntologySourceCollectorHost,
    private readonly runtime: OntologySourceCollectorRuntime,
    private readonly file: TFile,
    private readonly metadata: ParsedFileMetadata,
    fieldNames: readonly string[],
  ) {
    this.startingHostRevision = runtime.sourceRevision();
    this.capturedFile = { path: file.path, mtime: file.stat.mtime, size: file.stat.size };
    this.source = fileRef(file);
    this.sourceRevision = sourceRevisionFor(this.capturedFile, this.startingHostRevision);
    this.fields = configuredFields(fieldNames);
    const label = `obsidian-ontology-${++collectorRunSequence}:${file.path}`;
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
      let processed = 0;
      const flush = async (final: boolean): Promise<boolean> => {
        const batch: NormalizedSourceBatch = {
          boundary: this.boundary,
          sequence: this.nextSequence++,
          final,
          records,
        };
        records = [];
        if (!(await consume(batch))) return false;
        if (final) return this.isCurrent();
        return this.checkpoint();
      };
      const emit = async (record: OntologyOccurrence): Promise<boolean> => {
        records.push(record);
        if (records.length >= MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH && !(await flush(false))) return false;
        processed += 1;
        if ((processed % CHECKPOINT_INTERVAL) === 0 && !(await this.checkpoint())) return false;
        return this.isCurrent();
      };

      for (const field of this.fields) {
        for (const value of getNormalizedFrontmatterValues(this.metadata, field.normalizedFieldName)) {
          const text = rawValueText(value);
          const seenTargets = new Set<string>();
          for (const reference of iterateLinkReferencesFromValue(value)) {
            const target = resolveTarget(this.host, this.capturedFile.path, reference);
            const targetPath = target?.entity.semanticPath;
            if (!target || !targetPath || seenTargets.has(targetPath)) continue;
            seenTargets.add(targetPath);
            if (!(await emit({
              kind: "frontmatter-ontology",
              source: this.source,
              sourceRevision: this.sourceRevision,
              target,
              provenance: {
                surface: "frontmatter",
                definition: field.normalizedFieldName,
                fieldName: field.configuredFieldName,
                configuredFieldName: field.configuredFieldName,
                normalizedFieldName: field.normalizedFieldName,
                ...(text === undefined ? {} : { rawValue: text }),
              },
            }))) {
              this.state = "failed";
              return false;
            }
          }
          if (!(await this.checkpoint())) {
            this.state = "failed";
            return false;
          }
        }

        for (const occurrence of getInlineFieldOccurrences(this.metadata, field.normalizedFieldName)) {
          const seenTargets = new Set<string>();
          for (const reference of iterateLinkReferencesFromValue(occurrence.value)) {
            const target = resolveTarget(this.host, this.capturedFile.path, reference);
            const targetPath = target?.entity.semanticPath;
            if (!target || !targetPath || seenTargets.has(targetPath)) continue;
            seenTargets.add(targetPath);
            if (!(await emit({
              kind: "inline-ontology",
              source: this.source,
              sourceRevision: this.sourceRevision,
              target,
              provenance: {
                surface: "inline",
                definition: field.normalizedFieldName,
                fieldName: occurrence.name,
                configuredFieldName: field.configuredFieldName,
                normalizedFieldName: field.normalizedFieldName,
                rawValue: occurrence.value,
                location: { line: occurrence.line, start: occurrence.start, end: occurrence.end },
              },
            }))) {
              this.state = "failed";
              return false;
            }
          }
          if (!(await this.checkpoint())) {
            this.state = "failed";
            return false;
          }
        }
      }

      if (!this.isCurrent() || !(await flush(true))) {
        this.state = "failed";
        return false;
      }
      this.state = "finalized";
      return true;
    } catch (error) {
      this.state = "failed";
      throw error;
    }
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
    return this.runtime.isCurrent()
      && this.runtime.sourceRevision() === this.startingHostRevision
      && this.file.path === this.capturedFile.path
      && this.file.stat.mtime === this.capturedFile.mtime
      && this.file.stat.size === this.capturedFile.size;
  }
}
