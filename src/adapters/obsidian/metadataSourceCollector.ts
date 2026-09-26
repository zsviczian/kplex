import { TFile, type App } from "obsidian";
import { nodeId, type GraphNodeKind } from "../../core/graph/model";
import {
  MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH,
  sourceGeneration,
  sourceRevision,
  sourceSnapshotRevision,
  type BodyUrlOccurrence,
  type DatePropertyOccurrence,
  type NormalizedSourceBatch,
  type NormalizedSourceRecord,
  type PresentationLinkOccurrence,
  type SemanticMetadataOccurrence,
  type SemanticMetadataValue,
  type SemanticMetadataScalar,
  type SourceEntityRef,
  type SourceFieldNameFact,
  type SourceReadBoundary,
  type SourceRevision,
  type SourceTargetRef,
} from "../../core/graph/source";
import {
  iterateLinkReferencesFromValue,
  normalizeFieldName,
  type ExtractedLinkReference,
  type ParsedFileMetadata,
} from "../../index/fieldParser";

export type ObsidianMetadataSourceRuntime = Readonly<{
  isCurrent: () => boolean;
  checkpoint: () => Promise<boolean>;
  /** Monotonic source-event revision owned by the existing index coordinator. */
  sourceRevision: () => number;
}>;

export type ObsidianMetadataSourceSettings = Readonly<{
  noteTypeField: string;
  primaryTagField: string;
  thumbnailProperty: string;
  nodeImageProperty: string;
}>;

export type DailyNotesSourceSettings = Readonly<{
  folder: string;
  format: string;
}>;

export type ObsidianMetadataSourceHost = Readonly<{
  getFileByPath(path: string): TFile | null;
  resolveLinkpath(linkpath: string, sourcePath: string): TFile | null;
  resolvedLinkCount(sourcePath: string, targetPath: string): number;
  isDateProperty(fieldName: string): boolean;
  dailyNotesSettings(): DailyNotesSourceSettings | null;
  formatDailyDate(isoDate: string, format: string): string | null;
}>;

export type MetadataSourceFamily = "metadata" | "relations" | "field-names";

type ObsidianMomentInstance = Readonly<{
  isValid(): boolean;
  format(format: string): string;
}>;

type ObsidianMomentFactory = (value: string, inputFormat: string, strict: boolean) => ObsidianMomentInstance;

type AppWithMetadataTypes = App & Readonly<{
  metadataTypeManager?: Readonly<{
    getPropertyInfo?: (name: string) => Readonly<{ widget?: string }> | null;
    getAssignedWidget?: (name: string) => string | null;
  }>;
}>;

type AppWithInternalPlugins = App & Readonly<{
  internalPlugins?: Readonly<{
    getPluginById?: (id: string) => unknown;
    plugins?: Readonly<Record<string, unknown>>;
  }>;
}>;

type CapturedFileRevision = Readonly<{
  path: string;
  mtime: number;
  size: number;
}>;

type VisualField = Readonly<{
  configuredFieldName: string;
  normalizedFieldName: string;
}>;

let collectorRunSequence = 0;
const CHECKPOINT_INTERVAL = 32;

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
}

/**
 * Explicit Obsidian-only runtime service used by C12c. Private property-registry/Daily Notes
 * compatibility reads and host Moment stay here; normalized records never retain the App/window.
 */
export function createObsidianMetadataSourceHost(app: App): ObsidianMetadataSourceHost {
  return {
    getFileByPath: (path) => app.vault.getFileByPath(path),
    resolveLinkpath: (linkpath, sourcePath) => app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath),
    resolvedLinkCount: (sourcePath, targetPath) => app.metadataCache.resolvedLinks[sourcePath]?.[targetPath] ?? 0,
    isDateProperty: (fieldName) => {
      const manager = (app as AppWithMetadataTypes).metadataTypeManager;
      const info = manager?.getPropertyInfo?.(fieldName);
      const widget = info?.widget ?? manager?.getAssignedWidget?.(fieldName);
      return widget === "date";
    },
    dailyNotesSettings: () => {
      const registry = (app as AppWithInternalPlugins).internalPlugins;
      const candidate = registry?.getPluginById?.("daily-notes") ?? registry?.plugins?.["daily-notes"];
      if (!candidate || typeof candidate !== "object") return null;
      const record = candidate as Record<string, unknown>;
      if (record.enabled === false) return null;
      const instance = record.instance && typeof record.instance === "object" ? record.instance as Record<string, unknown> : record;
      const options = instance.options && typeof instance.options === "object" ? instance.options as Record<string, unknown> : instance;
      const folder = typeof options.folder === "string" ? options.folder : "";
      const format = typeof options.format === "string" && options.format.trim() ? options.format : "YYYY-MM-DD";
      return { folder: normalizePath(folder), format };
    },
    formatDailyDate: (isoDate, format) => {
      const obsidianMoment = (window as unknown as { moment: ObsidianMomentFactory }).moment;
      const parsed = obsidianMoment(isoDate, "YYYY-MM-DD", true);
      return parsed.isValid() ? parsed.format(format) : null;
    },
  };
}

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
  return sourceRevision(`metadata:${file.path}\u0000${file.mtime}\u0000${file.size}\u0000${hostRevision}`);
}

function* flattenDateValues(value: unknown): IterableIterator<unknown> {
  if (Array.isArray(value)) {
    for (const nested of value) yield* flattenDateValues(nested);
    return;
  }
  if (value === null || value === undefined) return;
  yield value;
}

function decodeInternalCandidate(rawTarget: string): string {
  let candidate = rawTarget.trim();
  try { candidate = decodeURIComponent(candidate); } catch { /* preserve undecodable host input */ }
  const hash = candidate.indexOf("#");
  if (hash >= 0) candidate = candidate.slice(0, hash);
  return candidate;
}

function resolvePresentationTarget(
  host: ObsidianMetadataSourceHost,
  sourcePath: string,
  reference: ExtractedLinkReference,
): SourceTargetRef | null {
  if (reference.external) return {
    entity: urlRef(reference.rawTarget), rawTarget: reference.rawTarget, resolvedBy: "url",
  };
  const candidate = decodeInternalCandidate(reference.rawTarget);
  if (!candidate) return null;
  const destination = host.resolveLinkpath(candidate, sourcePath);
  const entity = destination instanceof TFile ? fileRef(destination) : unresolvedRef(candidate);
  return {
    entity,
    rawTarget: reference.rawTarget,
    ...(reference.subpath ? { subpath: reference.subpath } : {}),
    resolvedBy: destination instanceof TFile ? "host" : "unresolved",
  };
}

/** Only the scalar/array shape consumed by legacy metadata semantics crosses the boundary. */
const unsupportedMetadataValue: SemanticMetadataScalar = Object.freeze({ unsupported: true });
function metadataValue(value: unknown): SemanticMetadataValue {
  const scalar = (input: unknown): SemanticMetadataScalar =>
    input === null || input === undefined ? null
      : typeof input === "string" || typeof input === "number" || typeof input === "boolean" ? input
        : unsupportedMetadataValue;
  return Array.isArray(value) ? value.map(scalar) : scalar(value);
}

function visualFields(settings: ObsidianMetadataSourceSettings): VisualField[] {
  const output: VisualField[] = [];
  const seen = new Set<string>();
  for (const configuredFieldName of [settings.thumbnailProperty, settings.nodeImageProperty]) {
    const normalizedFieldName = normalizeFieldName(configuredFieldName);
    if (!normalizedFieldName || seen.has(normalizedFieldName)) continue;
    seen.add(normalizedFieldName);
    output.push({ configuredFieldName, normalizedFieldName });
  }
  return output;
}

/**
 * Source-scoped C12c adapter over already-acquired ParsedFileMetadata. Parser/cache ownership stays
 * in GraphBuilder/C16; this adapter owns only Obsidian-specific Date normalization and property-link
 * destination selection plus plain graph-relevant metadata normalization. Dense sources stream in
 * bounded batches and are fenced by the existing source-event revision plus file path/mtime/size.
 */
export class ObsidianMetadataSourceCollector {
  readonly boundary: SourceReadBoundary;
  private readonly startingHostRevision: number;
  private readonly capturedFile: CapturedFileRevision;
  private readonly source: SourceEntityRef;
  private readonly sourceRevision: SourceRevision;
  private nextSequence = 0;
  private state: "new" | "collecting" | "finalized" | "failed" = "new";

  constructor(
    private readonly host: ObsidianMetadataSourceHost,
    private readonly runtime: ObsidianMetadataSourceRuntime,
    private readonly file: TFile,
    private readonly metadata: ParsedFileMetadata,
    private readonly settings: ObsidianMetadataSourceSettings,
    private readonly family: MetadataSourceFamily,
  ) {
    this.startingHostRevision = runtime.sourceRevision();
    this.capturedFile = { path: file.path, mtime: file.stat.mtime, size: file.stat.size };
    this.source = fileRef(file);
    this.sourceRevision = sourceRevisionFor(this.capturedFile, this.startingHostRevision);
    const label = `obsidian-metadata-${++collectorRunSequence}:${family}:${file.path}`;
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
      const touch = async (): Promise<boolean> => {
        processed += 1;
        if ((processed % CHECKPOINT_INTERVAL) !== 0) return this.isCurrent();
        return this.checkpoint();
      };
      const emit = async (record: NormalizedSourceRecord): Promise<boolean> => {
        records.push(record);
        if (records.length >= MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH && !(await flush(false))) return false;
        return touch();
      };

      const ok = this.family === "relations"
        ? await this.collectRelations(emit, touch)
        : await this.collectMetadata(emit, touch, this.family === "field-names");
      if (!ok || !this.isCurrent() || !(await flush(true))) {
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

  private async collectMetadata(
    emit: (record: NormalizedSourceRecord) => Promise<boolean>,
    touch: () => Promise<boolean>,
    fieldNamesOnly: boolean,
  ): Promise<boolean> {
    if (!fieldNamesOnly) {
      for (const value of this.metadata.aliases) {
        const record: SemanticMetadataOccurrence = {
          kind: "semantic-metadata",
          source: this.source,
          sourceRevision: this.sourceRevision,
          metadataKind: "alias",
          value,
          provenance: { surface: "frontmatter" },
        };
        if (!(await emit(record))) return false;
      }
      for (const value of this.metadata.tags) {
        const record: SemanticMetadataOccurrence = {
          kind: "semantic-metadata",
          source: this.source,
          sourceRevision: this.sourceRevision,
          metadataKind: "tag",
          value,
          provenance: { surface: "host" },
        };
        if (!(await emit(record))) return false;
      }
    }

    for (const fieldName of Object.keys(this.metadata.frontmatter)) {
      const normalizedFieldName = normalizeFieldName(fieldName);
      if (!normalizedFieldName) { if (!(await touch())) return false; continue; }
      const record: SourceFieldNameFact = {
        kind: "field-name",
        source: this.source,
        sourceRevision: this.sourceRevision,
        fieldName,
        normalizedFieldName,
        surface: "frontmatter",
        provenance: { surface: "frontmatter", fieldName, normalizedFieldName },
      };
      if (!(await emit(record))) return false;
    }
    for (const occurrence of this.metadata.inlineFieldOccurrences) {
      const normalizedFieldName = normalizeFieldName(occurrence.name);
      if (!normalizedFieldName) { if (!(await touch())) return false; continue; }
      const record: SourceFieldNameFact = {
        kind: "field-name",
        source: this.source,
        sourceRevision: this.sourceRevision,
        fieldName: occurrence.name,
        normalizedFieldName,
        surface: "inline",
        provenance: {
          surface: "inline",
          fieldName: occurrence.name,
          normalizedFieldName,
          location: { line: occurrence.line, start: occurrence.start, end: occurrence.end },
        },
      };
      if (!(await emit(record))) return false;
    }
    if (fieldNamesOnly) return this.isCurrent();

    const noteTypeField = normalizeFieldName(this.settings.noteTypeField);
    const primaryTagField = normalizeFieldName(this.settings.primaryTagField);
    for (const [fieldName, value] of Object.entries(this.metadata.frontmatter)) {
      const normalizedFieldName = normalizeFieldName(fieldName);
      if (normalizedFieldName === noteTypeField) {
        if (!(await emit({
          kind: "semantic-metadata",
          source: this.source,
          sourceRevision: this.sourceRevision,
          metadataKind: "note-type",
          value: metadataValue(value),
          provenance: { surface: "frontmatter", fieldName, normalizedFieldName },
        }))) return false;
      }
      if (normalizedFieldName === primaryTagField) {
        if (!(await emit({
          kind: "semantic-metadata",
          source: this.source,
          sourceRevision: this.sourceRevision,
          metadataKind: "primary-tag-field",
          value: metadataValue(value),
          provenance: { surface: "frontmatter", definition: primaryTagField, fieldName, normalizedFieldName },
        }))) return false;
      }
      if (!(await touch())) return false;
    }
    for (const [normalizedFieldName, metadataKind] of [
      [noteTypeField, "note-type"], [primaryTagField, "primary-tag-field"],
    ] as const) {
      // The established inlineFields map owns values; occurrence records own discovery/provenance.
      for (const value of this.metadata.inlineFields[normalizedFieldName] ?? []) {
        if (!(await emit({
          kind: "semantic-metadata",
          source: this.source,
          sourceRevision: this.sourceRevision,
          metadataKind,
          value: metadataValue(value),
          provenance: { surface: "inline", fieldName: normalizedFieldName, normalizedFieldName,
            ...(metadataKind === "primary-tag-field" ? { definition: primaryTagField } : {}) },
        }))) return false;
      }
    }
    return this.isCurrent();
  }

  private async collectRelations(
    emit: (record: NormalizedSourceRecord) => Promise<boolean>,
    touch: () => Promise<boolean>,
  ): Promise<boolean> {
    const daily = this.host.dailyNotesSettings();
    if (daily) {
      for (const [fieldName, rawValue] of Object.entries(this.metadata.frontmatter)) {
        if (!this.host.isDateProperty(fieldName)) {
          if (!(await touch())) return false;
          continue;
        }
        const normalizedFieldName = normalizeFieldName(fieldName);
        for (const value of flattenDateValues(rawValue)) {
          if (typeof value !== "string") {
            if (!(await touch())) return false;
            continue;
          }
          const rendered = this.host.formatDailyDate(value.trim(), daily.format);
          if (!rendered) {
            if (!(await touch())) return false;
            continue;
          }
          const relative = normalizePath([daily.folder, rendered].filter(Boolean).join("/"));
          const targetPath = relative.toLowerCase().endsWith(".md") ? relative : `${relative}.md`;
          const materialized = this.host.getFileByPath(targetPath);
          const entity = materialized instanceof TFile ? fileRef(materialized) : unresolvedRef(targetPath);
          const record: DatePropertyOccurrence = {
            kind: "date-property",
            source: this.source,
            sourceRevision: this.sourceRevision,
            target: { entity, rawTarget: targetPath, resolvedBy: "daily-notes" },
            provenance: {
              surface: "frontmatter",
              definition: fieldName,
              fieldName,
              normalizedFieldName,
              rawValue: value,
            },
          };
          if (!(await emit(record))) return false;
        }
      }
    }

    for (const reference of this.metadata.urls) {
      const target: SourceTargetRef = {
        entity: urlRef(reference.url),
        rawTarget: reference.url,
        resolvedBy: "url",
      };
      let origin: SourceTargetRef | undefined;
      try {
        const originUrl = new URL(reference.url).origin;
        origin = { entity: urlRef(originUrl), rawTarget: originUrl, resolvedBy: "url" };
      } catch { /* malformed URL: retain raw URL node without origin input */ }
      const record: BodyUrlOccurrence = {
        kind: "body-url",
        source: this.source,
        sourceRevision: this.sourceRevision,
        target,
        ...(origin ? { origin } : {}),
        ...(reference.label ? { label: reference.label } : {}),
        provenance: {
          surface: "body",
          rawValue: reference.url,
          ...(reference.line === undefined ? {} : { location: { line: reference.line } }),
        },
      };
      if (!(await emit(record))) return false;
    }

    for (const field of visualFields(this.settings)) {
      for (const [fieldName, value] of Object.entries(this.metadata.frontmatter)) {
        if (!(await touch())) return false;
        if (normalizeFieldName(fieldName) !== field.normalizedFieldName) continue;
        if (!(await this.emitPresentationValue(emit, touch, field, "frontmatter", fieldName, value))) return false;
      }
      for (const value of this.metadata.inlineFields[field.normalizedFieldName] ?? []) {
        if (!(await touch())) return false;
        if (!(await this.emitPresentationValue(emit, touch, field, "inline", field.normalizedFieldName, value))) return false;
      }
    }
    return this.isCurrent();
  }

  private async emitPresentationValue(
    emit: (record: NormalizedSourceRecord) => Promise<boolean>,
    touch: () => Promise<boolean>,
    field: VisualField,
    surface: "frontmatter" | "inline",
    fieldName: string,
    value: unknown,
    location?: Readonly<{ line: number; start: number; end: number }>,
  ): Promise<boolean> {
    const seenTargets = new Set<string>();
    for (const reference of iterateLinkReferencesFromValue(value)) {
      const target = resolvePresentationTarget(this.host, this.capturedFile.path, reference);
      const targetPath = target?.entity.semanticPath;
      if (!target || !targetPath || seenTargets.has(targetPath)) {
        if (!(await touch())) return false;
        continue;
      }
      seenTargets.add(targetPath);
      const record: PresentationLinkOccurrence = {
        kind: "presentation-link",
        hostOccurrenceCount: this.host.resolvedLinkCount(this.capturedFile.path, targetPath),
        surface,
        source: this.source,
        sourceRevision: this.sourceRevision,
        target,
        provenance: {
          surface,
          definition: field.normalizedFieldName,
          fieldName,
          configuredFieldName: field.configuredFieldName,
          normalizedFieldName: field.normalizedFieldName,
          ...(location ? { location } : {}),
        },
      };
      if (!(await emit(record))) return false;
    }
    return this.isCurrent();
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
