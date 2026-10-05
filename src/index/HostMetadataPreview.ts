/**
 * Bounded, disposable first-order previews from Obsidian's already-loaded metadata. This host
 * composition reuses normalized collectors and the canonical compiler; it acquires neither body
 * text nor durable sources and never certifies semantic/evidence authority. The index owns event
 * delivery and replacement with canonical scopes. A lifecycle-local reverse link map avoids a
 * whole-vault backlink scan on each navigation.
 */
import { getAllTags, TFile, type App } from "obsidian";
import { NormalizedGraphCompiler, type GraphCompilerRuntime, type GraphCompilerSettings, type PortableGraphCompilation } from "../core/graph/compiler";
import { sourceGeneration, sourceRevision, sourceSnapshotRevision, type NormalizedSourceBatch, type SourceEntityRef } from "../core/graph/source";
import { graphCompilerSettingsFromLegacy } from "../adapters/obsidian/graphContracts";
import { ObsidianHostLinkSourceCollector } from "../adapters/obsidian/hostLinkSourceCollector";
import { createObsidianMetadataSourceHost, ObsidianMetadataSourceCollector } from "../adapters/obsidian/metadataSourceCollector";
import { ObsidianReferenceSourceCollector } from "../adapters/obsidian/ontologySourceCollector";
import { entityFactForFile, entityFactForFolder, structuralFileTreeOccurrence, structuralTagMembershipFacts } from "../adapters/obsidian/structuralSourceCollector";
import type { KplexSettings } from "../settings";
import type { GraphPage } from "../types";
import { createGraphState, type GraphState } from "./GraphState";
import { mergeFileMetadata } from "./fieldParser";

const MAX_PREVIEW_SOURCES = 64;
const MAX_PREVIEW_TARGETS = 256;
const MAX_PREVIEW_RECORDS = 8192;
const MAX_PREVIEW_METADATA_BYTES = 8 * 1024;
const MAX_PREVIEW_TOTAL_METADATA_BYTES = 16 * 1024;

/** A provisional scope is explicitly incomplete and must never become durable source authority. */
export type HostMetadataPreviewResult = Readonly<{
  state: GraphState;
  centerPath: string;
  visiblePaths: ReadonlySet<string>;
  incomplete: true;
  settings: GraphCompilerSettings;
}>;

type PreviewCollector = Readonly<{
  boundary: NormalizedSourceBatch["boundary"];
  collectBatches(consume: (batch: NormalizedSourceBatch) => Promise<boolean> | boolean): Promise<boolean>;
  isBoundaryCurrent(boundary: NormalizedSourceBatch["boundary"]): boolean;
  finalize?: () => Promise<NormalizedSourceBatch | null>;
}>;

/** Measure only a bounded prefix; reject huge/deep/cyclic host values before copying or parsing. */
function metadataBytes(value: unknown, limit: number): number | null {
  let bytes = 0;
  let visited = 0;
  const seen = new Set<object>();
  const stack: unknown[] = [value];
  while (stack.length) {
    if (++visited > 2048) return null;
    const item = stack.pop();
    if (typeof item === "string") bytes += item.length * 2;
    else if (item && typeof item === "object") {
      if (seen.has(item)) return null;
      seen.add(item);
      // Iteration stops before a dense input can allocate a complete value mirror.
      for (const key in item) {
        if (!Object.prototype.hasOwnProperty.call(item, key)) continue;
        bytes += key.length * 2 + 16;
        if (bytes > limit || stack.length >= 2048) return null;
        stack.push((item as Record<string, unknown>)[key]);
      }
    } else bytes += 16;
    if (bytes > limit) return null;
  }
  return bytes;
}

/** Bound potential tag ancestor work before the canonical structural collector allocates prefixes. */
function tagPrefixesWithinBudget(tags: readonly string[]): boolean {
  let prefixes = 0;
  for (const tag of tags) {
    if (++prefixes > MAX_PREVIEW_TARGETS) return false;
    for (const character of tag) if (character === "/" && ++prefixes > MAX_PREVIEW_TARGETS) return false;
  }
  return true;
}

/** Own host-only lookup acceleration; callers own listeners, scheduling and publication lifetime. */
export class HostMetadataPreview {
  private readonly outgoing = new Map<string, Set<string>>();
  private readonly incoming = new Map<string, Set<string>>();
  private initialized = false;
  private initialization: Promise<void> | null = null;
  private revision = 0;
  private disposed = false;

  /** Capture live settings by accessor; the caller's runtime fences unload and request supersession. */
  constructor(
    private readonly app: App,
    private readonly settings: () => KplexSettings,
    private readonly runtime: GraphCompilerRuntime,
  ) {}

  /** Build the lightweight reverse map once, yielding between host edges without reading note text. */
  initializeBacklinks(): Promise<void> {
    if (this.initialized || this.disposed) return Promise.resolve();
    if (this.initialization) return this.initialization;
    this.initialization = this.scanBacklinks().finally(() => {
      // A cancelled/failed initialization may be retried; a resolved partial scan is not ready.
      this.initialization = null;
    });
    return this.initialization;
  }

  /** Scan loaded aggregate host facts once; subsequent navigation performs indexed lookups only. */
  private async scanBacklinks(): Promise<void> {
    let processed = 0;
    let startedAt = this.runtime.now();
    for (const source in this.app.metadataCache.resolvedLinks) {
      if (this.disposed || !this.runtime.isCurrent()) return;
      const targets = new Set<string>();
      for (const target in this.app.metadataCache.resolvedLinks[source]) {
        if (this.app.metadataCache.resolvedLinks[source]?.[target] > 0) targets.add(target);
        if ((++processed & 255) === 0 && this.runtime.now() - startedAt >= this.runtime.sliceBudgetMs) {
          await this.runtime.yield();
          startedAt = this.runtime.now();
        }
        if (this.disposed || !this.runtime.isCurrent()) return;
      }
      // A resolve event during an awaited slice owns the newer source contribution.
      if (!this.outgoing.has(source)) this.replaceSource(source, targets);
      if ((++processed & 255) === 0 && this.runtime.now() - startedAt >= this.runtime.sliceBudgetMs) {
        await this.runtime.yield();
        startedAt = this.runtime.now();
      }
    }
    this.initialized = true;
    for (const [source, targets] of this.outgoing) if (!targets.size) this.outgoing.delete(source);
  }

  /** Apply a post-resolve delta and return old/new targets so newly added backlinks refresh visible centers. */
  refreshSource(path: string): ReadonlySet<string> {
    if (this.disposed) return new Set();
    this.revision += 1;
    const targets = new Set(Object.keys(this.app.metadataCache.resolvedLinks[path] ?? {}));
    const affected = new Set([...(this.outgoing.get(path) ?? []), ...targets]);
    this.replaceSource(path, targets);
    return affected;
  }

  /** Retire deleted/renamed source contributions and return targets whose visible previews need refreshing. */
  removeSource(path: string): ReadonlySet<string> {
    if (this.disposed) return new Set();
    this.revision += 1;
    const affected = new Set(this.outgoing.get(path) ?? []);
    this.replaceSource(path, new Set());
    return affected;
  }

  /** Replace exactly one source's backlinks, retiring empty target buckets to avoid lifetime leaks. */
  private replaceSource(source: string, targets: Set<string>): void {
    for (const target of this.outgoing.get(source) ?? []) {
      const owners = this.incoming.get(target);
      owners?.delete(source);
      if (!owners?.size) this.incoming.delete(target);
    }
    if (targets.size || !this.initialized) this.outgoing.set(source, targets);
    else this.outgoing.delete(source);
    for (const target of targets) {
      const owners = this.incoming.get(target) ?? new Set<string>();
      owners.add(source);
      this.incoming.set(target, owners);
    }
  }

  /** Release lookup state and fence all pending collector/compiler work on plugin unload. */
  dispose(): void {
    this.disposed = true;
    this.revision += 1;
    this.outgoing.clear();
    this.incoming.clear();
  }

  /**
   * Compile one bounded private host scope. Direct center contributions precede incoming owners;
   * dense/oversized enrichment remains incomplete rather than authorizing partial persisted facts.
   * No source flush, DB access or Markdown body acquisition occurs on this path.
   */
  async build(centerPath: string): Promise<HostMetadataPreviewResult | null> {
    if (this.disposed || !this.runtime.isCurrent()) return null;
    await this.initializeBacklinks();
    const center = this.app.vault.getFileByPath(centerPath);
    if (!(center instanceof TFile)) return null;
    const revision = this.revision;
    const captured = new Map<TFile, Readonly<{ path: string; mtime: number; size: number }>>();
    /** Capture physical identity once so any awaited work cannot publish stale host files. */
    const capture = (file: TFile): void => {
      if (!captured.has(file)) captured.set(file, { path: file.path, mtime: file.stat.mtime, size: file.stat.size });
    };
    capture(center);
    /** Finality checks include exact file identity, not only mtime, at every cooperative boundary. */
    const current = (): boolean => !this.disposed && this.revision === revision && this.runtime.isCurrent()
      && [...captured].every(([file, stat]) => file.path === stat.path && file.stat.mtime === stat.mtime
        && file.stat.size === stat.size && this.app.vault.getFileByPath(stat.path) === file);
    const settings = this.settings();
    const compilerSettings = graphCompilerSettingsFromLegacy(settings);
    const metadataSettings = { noteTypeField: settings.noteTypeField, primaryTagField: settings.primaryTagField };
    const compiler = new NormalizedGraphCompiler(compilerSettings, { ...this.runtime, isCurrent: current });
    const seeded = new Set<string>();
    let records = 0;
    let metadataTotal = 0;
    /** Seed only exact host materializations selected by the shared semantic policy. */
    const seed = async (ref: SourceEntityRef): Promise<boolean> => {
      if (!ref.physicalPath || seeded.has(ref.physicalPath)) return true;
      const file = this.app.vault.getFileByPath(ref.physicalPath);
      if (!(file instanceof TFile)) return false;
      capture(file);
      seeded.add(file.path);
      return compiler.seedEntityFact(entityFactForFile(file));
    };
    /** Feed complete source frames into the canonical compiler; no role interpretation occurs here. */
    const consume = async (collector: PreviewCollector): Promise<boolean> => {
      const read = compiler.beginRead(collector.boundary);
      /** Seed selected endpoints before the compiler validates required physical facts. */
      const accept = async (batch: NormalizedSourceBatch): Promise<boolean> => {
        records += batch.records.length;
        if (records > MAX_PREVIEW_RECORDS) return false;
        return compiler.acceptBatch(read, batch, async (record) => {
          if (!(await seed(record.source))) return false;
          return !("target" in record) || await seed(record.target.entity);
        });
      };
      if (!(await collector.collectBatches(accept))) return false;
      if (collector.finalize) {
        const final = await collector.finalize();
        if (!final || !(await accept(final))) return false;
      }
      return collector.isBoundaryCurrent(collector.boundary) && compiler.completeRead(read, collector.boundary);
    };
    const metadataHost = createObsidianMetadataSourceHost(this.app);
    const collectorRuntime = {
      isCurrent: current, sourceRevision: () => this.revision,
      /** Preserve caller-owned cooperative scheduling and both sides of the revision fence. */
      checkpoint: async (): Promise<boolean> => { await this.runtime.yield(); return current(); },
    };
    const sources = new Set([center.path]);
    for (const path of this.incoming.get(center.path) ?? []) {
      if (sources.size >= MAX_PREVIEW_SOURCES) break;
      sources.add(path);
    }
    // Direct neighbours also contribute frontmatter overrides for the center pair.
    for (const path in this.app.metadataCache.resolvedLinks[center.path] ?? {}) {
      if (sources.size >= MAX_PREVIEW_SOURCES) break;
      sources.add(path);
    }
    for (const path of sources) {
      const file = this.app.vault.getFileByPath(path);
      if (!(file instanceof TFile)) continue;
      capture(file);
      if (!(await compiler.seedEntityFact(entityFactForFile(file)))) return null;
      const cache = this.app.metadataCache.getFileCache(file);
      const estimated = metadataBytes(cache?.frontmatter ?? {}, MAX_PREVIEW_METADATA_BYTES);
      const inlineTags = cache?.tags ?? [];
      const tagBytes = estimated === null || inlineTags.length > MAX_PREVIEW_TARGETS ? null
        : metadataBytes(inlineTags.map(tag => tag.tag), MAX_PREVIEW_METADATA_BYTES - estimated);
      const tags = estimated !== null && tagBytes !== null && cache ? getAllTags(cache) ?? [] : [];
      const metadataAllowed = estimated !== null && tagBytes !== null
        && metadataTotal + estimated + tagBytes <= MAX_PREVIEW_TOTAL_METADATA_BYTES && tagPrefixesWithinBudget(tags);
      if (metadataAllowed) {
        metadataTotal += estimated + tagBytes;
        const metadata = mergeFileMetadata(cache, { inlineFields: {}, inlineFieldOccurrences: [], urls: [] });
        const host = metadataHost;
        if (!(await consume(new ObsidianMetadataSourceCollector(host, collectorRuntime, file, metadata, metadataSettings, "metadata")))) return null;
        if (!(await consume(new ObsidianReferenceSourceCollector({ metadataCache: this.app.metadataCache,
          resolvedLinkCount: host.resolvedLinkCount }, collectorRuntime, file, metadata)))) return null;
      }
      // If metadata exceeded the bound, omit its aggregate links as well: unknown explicit
      // overrides must not be misrepresented as inferred relationships.
      const resolved = Object.create(null) as Record<string, number>;
      const unresolved = Object.create(null) as Record<string, number>;
      let inspectedTargets = 0;
      for (const target in metadataAllowed ? this.app.metadataCache.resolvedLinks[path] ?? {} : {}) {
        // Irrelevant entries consume work too; a dense owner must not synchronously scan its fanout.
        if (++inspectedTargets > MAX_PREVIEW_TARGETS) break;
        if (path === center.path && !sources.has(target) && this.app.vault.getFileByPath(target)?.extension === "md") continue;
        if (path !== center.path && target !== center.path) continue;
        resolved[target] = this.app.metadataCache.resolvedLinks[path][target];
      }
      if (path === center.path && metadataAllowed) for (const target in this.app.metadataCache.unresolvedLinks[path] ?? {}) {
        if (++inspectedTargets > MAX_PREVIEW_TARGETS) break;
        unresolved[target] = this.app.metadataCache.unresolvedLinks[path][target];
      }
      if (!(await consume(new ObsidianHostLinkSourceCollector({ vault: this.app.vault,
        metadataCache: { resolvedLinks: { [path]: resolved }, unresolvedLinks: { [path]: unresolved } } }, collectorRuntime, path)))) return null;
      if (path === center.path) {
        const structural = [entityFactForFile(file)];
        const folder = file.parent;
        const boundary = { generation: sourceGeneration(`host-preview:${revision}`), snapshotRevision: sourceSnapshotRevision(`host-preview:${revision}`) };
        const facts = [...structural];
        if (folder) {
          // The preview needs membership only; hashing every root sibling would add whole-vault work.
          const folderRevision = sourceRevision(`host-preview-folder:${revision}:${folder.path}`);
          facts.push(entityFactForFolder(folder, folderRevision));
        }
        const read = compiler.beginRead(boundary);
        const relationFacts = folder ? [structuralFileTreeOccurrence(folder, file, sourceRevision(`host-preview-folder:${revision}:${folder.path}`))] : [];
        const tagFacts = metadataAllowed ? structuralTagMembershipFacts(file, this.app.metadataCache) : [];
        const allFacts = [...facts, ...relationFacts, ...tagFacts];
        records += allFacts.length;
        if (records > MAX_PREVIEW_RECORDS) return null;
        for (let start = 0, sequence = 0; start < allFacts.length; start += 256, sequence += 1) {
          if (!(await compiler.acceptBatch(read, { boundary, sequence, final: start + 256 >= allFacts.length, records: allFacts.slice(start, start + 256) }))) return null;
        }
        if (!compiler.completeRead(read, boundary)) return null;
      }
    }
    const compiled = await compiler.finish();
    if (!compiled || !current()) return null;
    const state = this.bind(compiled);
    if (!state || !current()) return null;
    const page = state.pages.get(centerPath);
    if (!page) return null;
    return { state, centerPath, visiblePaths: new Set([centerPath, ...page.neighbours.keys()]), incomplete: true, settings: compilerSettings };
  }

  /** Bind canonical resolved output to the retained path-keyed host facade without classifying it. */
  private bind(compiled: PortableGraphCompilation): GraphState | null {
    const state = createGraphState();
    const evidence = compiled.legacyEvidence();
    if (!evidence) return null;
    state.evidence = evidence;
    state.discoveredFields = new Map(compiled.discoveredFields);
    const pages = new Map<string, GraphPage>();
    for (const node of compiled.nodes.values()) {
      if (!node.semanticPath) return null;
      const page: GraphPage = { path: node.semanticPath, name: node.name,
        file: node.file ? this.app.vault.getFileByPath(node.file.path) : null, url: node.url,
        isFolder: node.kind === "container", isTag: node.kind === "tag", mtime: node.semanticMtime,
        aliases: [...node.aliases], tags: [...node.tags], noteType: node.noteType,
        primaryStyleTag: node.primaryStyleTag, styleTags: [...node.styleTags], maxLabelLength: node.maxLabelLength,
        neighbours: new Map() };
      pages.set(node.id, page);
      state.pages.set(page.path, page);
      state.lowercasePathMap.set(page.path.toLowerCase(), page.path);
    }
    for (const node of compiled.nodes.values()) {
      const page = pages.get(node.id);
      if (!page) return null;
      for (const relation of node.neighbours.values()) {
        const target = pages.get(relation.target.id);
        if (!target) return null;
        page.neighbours.set(target.path, { ...relation, target });
      }
    }
    return state;
  }
}
