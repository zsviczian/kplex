import { getAllTags, TFile, TFolder, type MetadataCache, type Vault } from "obsidian";
import { nodeId, type FileFacet, type GraphNodeKind } from "../../core/graph/model";
import {
  MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH,
  sourceGeneration,
  sourceRevision,
  sourceSnapshotRevision,
  type FileTreeOccurrence,
  type NormalizedSourceBatch,
  type NormalizedSourceRecord,
  type SourceEntityFact,
  type SourceEntityRef,
  type SourceReadBoundary,
  type SourceRevision,
  type TagTreeOccurrence,
} from "../../core/graph/source";

export type StructuralSourceCollectorHost = Readonly<{
  vault: Pick<Vault, "getRoot" | "getMarkdownFiles" | "getFileByPath">;
  metadataCache: Pick<MetadataCache, "getFileCache">;
}>;

export type StructuralSourceCollectorRuntime = Readonly<{
  isCurrent: () => boolean;
  checkpoint: () => Promise<boolean>;
  /** Monotonic host source-event revision, distinct from a per-file mtime or collection generation. */
  sourceRevision: () => number;
}>;

type StructuralScanResult = Readonly<{
  digest: string;
}>;

type ScanEmitter = (record: NormalizedSourceRecord) => Promise<boolean>;

let collectorRunSequence = 0;

const ROOT_SEMANTIC_PATH = "folder:/";
const CHECKPOINT_INTERVAL = 64;

class StructuralDigest {
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
    // Length-delimit tokens so different token boundaries cannot alias the same digest input.
    this.updateSeparator();
  }

  private updateSeparator(): void {
    const code = 0;
    this.a = Math.imul(this.a ^ code, 16777619) >>> 0;
    this.b = Math.imul(this.b ^ (code + this.length), 2246822519) >>> 0;
    this.c = Math.imul(this.c ^ (code + (this.length << 1)), 3266489917) >>> 0;
    this.d = Math.imul(this.d ^ (code + (this.length >>> 1)), 2654435761) >>> 0;
    this.length += 1;
  }

  value(): string {
    return [this.length, this.a, this.b, this.c, this.d].map((value) => value.toString(36)).join(":");
  }
}

function fileFacet(file: TFile): FileFacet {
  return {
    name: file.name,
    extension: file.extension,
    path: file.path,
    mtime: file.stat.mtime,
    basename: file.basename,
    ctime: file.stat.ctime,
    size: file.stat.size,
  };
}

function entityKind(file: TFile): GraphNodeKind {
  return file.extension === "md" ? "document" : "attachment";
}

function folderRef(folder: TFolder): SourceEntityRef {
  return {
    id: nodeId(folder.path ? `folder:${folder.path}` : ROOT_SEMANTIC_PATH),
    kind: "container",
    state: "materialized",
    semanticPath: folder.path ? `folder:${folder.path}` : ROOT_SEMANTIC_PATH,
    physicalPath: folder.path,
  };
}

function fileRef(file: TFile): SourceEntityRef {
  return {
    id: nodeId(file.path),
    kind: entityKind(file),
    state: "materialized",
    semanticPath: file.path,
    physicalPath: file.path,
  };
}

function tagRef(rawTag: string): SourceEntityRef | null {
  if (!rawTag.trim()) return null;
  return {
    // Preserve the host's exact tag spelling here. GraphBuilder remains the single owner of
    // tag path normalization, hierarchy construction, exclusions and presentation naming.
    id: nodeId(`obsidian-tag:${rawTag}`),
    kind: "tag",
    state: "materialized",
    semanticPath: rawTag,
  };
}

function physicalRevision(file: TFile): SourceRevision {
  return sourceRevision(`physical:${file.path}\u0000${file.stat.mtime}\u0000${file.stat.ctime}\u0000${file.stat.size}`);
}

function tagContributionRevision(file: TFile, rawTags: readonly string[]): SourceRevision {
  const digest = new StructuralDigest();
  digest.update(file.path);
  digest.update(file.stat.mtime);
  digest.update(file.stat.ctime);
  digest.update(file.stat.size);
  for (const tag of rawTags) digest.update(tag);
  return sourceRevision(`tag-contribution:${digest.value()}`);
}

function tagSourceRevision(rawTag: string): SourceRevision {
  return sourceRevision(`tag:${rawTag}`);
}

function folderSourceRevision(folder: TFolder): SourceRevision {
  const digest = new StructuralDigest();
  digest.update(folder.path);
  digest.update(folder.name);
  digest.update(folder.children.length);
  for (const child of folder.children) {
    digest.update(child instanceof TFolder ? "folder" : child instanceof TFile ? "file" : "other");
    digest.update(child.path);
  }
  return sourceRevision(`folder-topology:${digest.value()}`);
}

function entityFactForFolder(folder: TFolder, revision = folderSourceRevision(folder)): SourceEntityFact {
  const entity = folderRef(folder);
  return {
    kind: "entity",
    source: entity,
    sourceRevision: revision,
    entity,
    // Real Obsidian roots use path "/" and name ""; some host doubles use path "".
    name: folder.path === "" || folder.path === "/" ? "/" : folder.name,
    url: null,
    semanticMtime: null,
  };
}

function entityFactForFile(file: TFile): SourceEntityFact {
  const entity = fileRef(file);
  const facet = fileFacet(file);
  return {
    kind: "entity",
    source: entity,
    sourceRevision: physicalRevision(file),
    entity,
    name: file.extension === "md" ? file.basename : file.name,
    url: null,
    semanticMtime: file.stat.mtime,
    file: facet,
  };
}

function fileTreeOccurrence(parent: TFolder, parentRevision: SourceRevision, child: TFolder | TFile): FileTreeOccurrence {
  const source = folderRef(parent);
  const target = child instanceof TFolder ? folderRef(child) : fileRef(child);
  return {
    kind: "file-tree",
    source,
    sourceRevision: parentRevision,
    provenance: { surface: "host", definition: "file-tree" },
    target: {
      entity: target,
      rawTarget: target.physicalPath ?? target.semanticPath ?? "",
      resolvedBy: "structural",
    },
  };
}

function tagMembershipOccurrence(file: TFile, rawTag: string, contributionRevision: SourceRevision): TagTreeOccurrence | null {
  const tag = tagRef(rawTag);
  if (!tag) return null;
  const member = fileRef(file);
  return {
    kind: "tag-tree",
    membership: "entity-member",
    source: tag,
    sourceRevision: tagSourceRevision(rawTag),
    contribution: { source: member, revision: contributionRevision },
    provenance: { surface: "host", definition: "tag-tree", rawValue: rawTag },
    target: {
      entity: member,
      rawTarget: file.path,
      resolvedBy: "structural",
    },
  };
}

/**
 * Obsidian-only structural source reader for the C12a full-build seam.
 *
 * Records never contain TFile/TFolder/MetadataCache objects. The initial scan emits bounded C11
 * batches; `finalize()` re-reads only structural in-memory host facts and emits the final empty
 * batch iff the same topology/tag digest is still current. That keeps one private GraphBuilder run
 * from publishing a mixed structural read without inventing a MetadataCache "revision" from mtimes.
 */
export class ObsidianStructuralSourceCollector {
  readonly boundary: SourceReadBoundary;
  private readonly runLabel: string;
  private initialDigest: string | null = null;
  private nextSequence = 0;
  private finalized = false;
  private state: "new" | "collecting" | "collected" | "failed" | "finalized" = "new";
  private readonly startingRevision: number;

  constructor(
    private readonly host: StructuralSourceCollectorHost,
    private readonly runtime: StructuralSourceCollectorRuntime,
  ) {
    this.runLabel = `obsidian-structural-${++collectorRunSequence}`;
    this.startingRevision = runtime.sourceRevision();
    this.boundary = {
      generation: sourceGeneration(this.runLabel),
      // This is an opaque read-attempt identity, not a claim that file mtime is a MetadataCache snapshot.
      snapshotRevision: sourceSnapshotRevision(`${this.runLabel}:boundary`),
    };
  }

  async collectBatches(consume: (batch: NormalizedSourceBatch) => Promise<boolean> | boolean): Promise<boolean> {
    if (this.state !== "new" || !this.isCurrent()) return false;
    this.state = "collecting";
    try {
      const collected = await this.collect(consume);
      this.state = collected ? "collected" : "failed";
      return collected;
    } catch (error) {
      this.state = "failed";
      throw error;
    }
  }

  private async collect(consume: (batch: NormalizedSourceBatch) => Promise<boolean> | boolean): Promise<boolean> {
    let records: NormalizedSourceRecord[] = [];
    const emit: ScanEmitter = async (record) => {
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
    if (!scanned || !this.isCurrent()) return false;
    if (records.length) {
      const batch: NormalizedSourceBatch = {
        boundary: this.boundary,
        sequence: this.nextSequence++,
        final: false,
        records,
      };
      if (!(await consume(batch))) return false;
      if (!(await this.checkpoint())) return false;
    }
    if (!this.isCurrent()) return false;
    this.initialDigest = scanned.digest;
    return true;
  }

  async finalize(): Promise<NormalizedSourceBatch | null> {
    if (this.state !== "collected" || this.initialDigest === null || !this.isCurrent()) return null;
    this.state = "failed";
    const verification = await this.scan();
    if (!verification || !this.isCurrent() || verification.digest !== this.initialDigest) return null;
    this.finalized = true;
    this.state = "finalized";
    return {
      boundary: this.boundary,
      sequence: this.nextSequence++,
      final: true,
      records: [],
    };
  }

  isBoundaryCurrent(boundary: SourceReadBoundary): boolean {
    return this.finalized && this.isCurrent()
      && boundary.generation === this.boundary.generation
      && boundary.snapshotRevision === this.boundary.snapshotRevision;
  }

  /** Transitional host binding for legacy GraphPage.file. The normalized record stays host-free. */
  materializedFile(facet: FileFacet): TFile | null {
    const file = this.host.vault.getFileByPath(facet.path);
    if (!(file instanceof TFile)) return null;
    if (file.path !== facet.path || file.name !== facet.name || file.extension !== facet.extension) return null;
    if (file.basename !== facet.basename || file.stat.mtime !== facet.mtime || file.stat.ctime !== facet.ctime || file.stat.size !== facet.size) return null;
    return file;
  }

  private async checkpoint(): Promise<boolean> {
    if (!this.isCurrent()) return false;
    if (!(await this.runtime.checkpoint())) return false;
    return this.isCurrent();
  }

  private isCurrent(): boolean {
    return this.runtime.isCurrent() && this.runtime.sourceRevision() === this.startingRevision;
  }

  private async scan(emit?: ScanEmitter): Promise<StructuralScanResult | null> {
    const digest = new StructuralDigest();
    let processed = 0;
    const emitRecord = async (record: NormalizedSourceRecord): Promise<boolean> => emit ? emit(record) : true;
    const touch = async (...values: Array<string | number | null | undefined>): Promise<boolean> => {
      for (const value of values) digest.update(value);
      processed += 1;
      if ((processed % CHECKPOINT_INTERVAL) !== 0) return this.isCurrent();
      return this.checkpoint();
    };

    const root = this.host.vault.getRoot();
    if (!(root instanceof TFolder) || !(await touch("root", root.path, root.name))) return null;
    const rootRevision = folderSourceRevision(root);
    if (emit && !(await emitRecord(entityFactForFolder(root, rootRevision)))) return null;

    const stack: Array<{ folder: TFolder; revision: SourceRevision }> = [{ folder: root, revision: rootRevision }];
    while (stack.length) {
      if (!this.isCurrent()) return null;
      const { folder, revision } = stack.pop()!;
      for (const item of folder.children) {
        if (item instanceof TFolder) {
          if (!(await touch("folder", folder.path, item.path, item.name))) return null;
          // Emit the relationship before the materialized target fact on purpose. C11 permits
          // later-batch targets, and the compiler must not assume target facts are already seen.
          if (emit && !(await emitRecord(fileTreeOccurrence(folder, revision, item)))) return null;
          const childRevision = folderSourceRevision(item);
          if (emit && !(await emitRecord(entityFactForFolder(item, childRevision)))) return null;
          stack.push({ folder: item, revision: childRevision });
        } else if (item instanceof TFile) {
          if (!(await touch("file", folder.path, item.path, item.name, item.extension, item.basename, item.stat.mtime, item.stat.ctime, item.stat.size))) return null;
          if (emit && !(await emitRecord(fileTreeOccurrence(folder, revision, item)))) return null;
          if (emit && !(await emitRecord(entityFactForFile(item)))) return null;
        }
      }
      if (!(await this.checkpoint())) return null;
    }

    for (const file of this.host.vault.getMarkdownFiles()) {
      if (!this.isCurrent()) return null;
      const cache = this.host.metadataCache.getFileCache(file);
      const rawTags = cache ? (getAllTags(cache) ?? []) : [];
      const contributionRevision = emit ? tagContributionRevision(file, rawTags) : null;
      if (!(await touch("tag-source", file.path, file.stat.mtime, file.stat.ctime, file.stat.size, rawTags.length))) return null;
      for (const rawTag of rawTags) {
        if (!(await touch("tag", file.path, rawTag))) return null;
        if (emit && contributionRevision) {
          const record = tagMembershipOccurrence(file, rawTag, contributionRevision);
          if (record && !(await emitRecord(record))) return null;
        }
      }
      if (!(await this.checkpoint())) return null;
    }

    if (!(await this.checkpoint())) return null;
    return { digest: digest.value() };
  }
}
