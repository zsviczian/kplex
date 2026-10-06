/**
 * Disposable first-order host projections from Obsidian's already-loaded metadata. Eager previews
 * retain strict source/fanout caps; on-demand count covers stream all selected direct host contributors
 * within decode/record/byte guards and reuse acquired bodies without body reads. A missing/guarded
 * current input is explicit, while caller cancellation retires the private cover silently. This host
 * composition reuses normalized collectors and the canonical compiler; it acquires neither body
 * text nor durable sources and never certifies semantic/evidence authority. The index owns event
 * delivery and replacement with canonical scopes. Folder previews use only native direct membership,
 * certifying structural gate counts separately from incomplete semantic incidence. Dense membership
 * is compiled in disposable chunks; only a finite visible cover survives. A lifecycle-local reverse
 * resolved/unresolved link maps avoid a whole-vault backlink scan on each navigation. A known
 * virtual endpoint needs no physical metadata; its incoming owners still prove local numeric gates.
 */
import { getAllTags, TFile, TFolder, type App } from "obsidian";
import { NormalizedGraphCompiler, type GraphCompilerRuntime, type GraphCompilerSettings, type PortableGraphCompilation } from "../core/graph/compiler";
import { estimateReferenceRecordBytes, sourceGeneration, sourceRevision, sourceSnapshotRevision, type NormalizedSourceBatch, type NormalizedSourceRecord, type SourceEntityFact, type SourceEntityRef } from "../core/graph/source";
import { nodeId } from "../core/graph/model";
import { canonicalTagPaths } from "../core/graph/tagPaths";
import { graphCompilerSettingsFromLegacy } from "../adapters/obsidian/graphContracts";
import { ObsidianHostLinkSourceCollector } from "../adapters/obsidian/hostLinkSourceCollector";
import { createObsidianMetadataSourceHost, ObsidianMetadataSourceCollector } from "../adapters/obsidian/metadataSourceCollector";
import { ObsidianReferenceSourceCollector } from "../adapters/obsidian/ontologySourceCollector";
import { entityFactForFile, entityFactForFolder, structuralFileTreeOccurrence, structuralTagMembershipFacts } from "../adapters/obsidian/structuralSourceCollector";
import type { KplexSettings } from "../settings";
import type { GraphPage } from "../types";
import { createGraphState, type GraphState } from "./GraphState";
import { extractLinksFromValue, iterateFrontmatterAliasSteps, mergeFileMetadata, normalizeFieldName, type ParsedBodyMetadata } from "./fieldParser";
import { cachedCenterTargetVisibility, captureCachedCenterGateSettings, projectCachedCenterGates,
  type CachedCenterGates } from "./CachedCenterGateProjection";

const MAX_PREVIEW_SOURCES = 64;
const MAX_PREVIEW_TARGETS = 256;
const MAX_PREVIEW_RECORDS = 8192;
const MAX_PREVIEW_METADATA_BYTES = 8 * 1024;
const MAX_PREVIEW_TOTAL_METADATA_BYTES = 16 * 1024;
/** On-demand covers stream one bounded host owner at a time instead of sharing the tiny paint-preview budget. */
const MAX_LOCAL_HOST_METADATA_BYTES = 2 * 1024 * 1024;
const MAX_LOCAL_HOST_RECORD_BYTES = 32 * 1024 * 1024;
const MAX_FOLDER_PREVIEW_COVER = 300;
const FOLDER_COUNT_CHUNK_SIZE = 64;

/** A provisional scope is explicitly incomplete and must never become durable source authority. */
export type HostMetadataPreviewResult = Readonly<{
  state: GraphState;
  centerPath: string;
  visiblePaths: ReadonlySet<string>;
  incomplete: true;
  settings: GraphCompilerSettings;
  /** Direct native membership proves only these gates; it never grants body/editing authority. */
  structuralGates?: ReadonlyMap<string, Partial<CachedCenterGates>>;
}>;

type FolderMemberCapture = Readonly<{
  member: TFolder | TFile;
  path: string;
  name: string;
  parent: TFolder | null;
  file?: Readonly<{ mtime: number; ctime: number; size: number; basename: string; extension: string }>;
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
  private readonly unresolvedOutgoing = new Map<string, Set<string>>();
  private readonly unresolvedIncoming = new Map<string, Set<string>>();
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

  /** Select current direct Markdown owners, center first, without body reads or recursive expansion.
   * The owner cap bounds semantic acquisition only; callers count the complete native baseline. */
  async candidateMarkdownPaths(centerPath: string, limit = 64): Promise<readonly string[]> {
    await this.initializeBacklinks();
    if (this.disposed || !this.runtime.isCurrent()) return [];
    const paths: string[] = [];
    const seen = new Set<string>();
    const cap = Math.min(64, Math.max(1, Math.floor(limit)));
    /** Admit exact live Markdown files in priority order, never synthetic or attachment owners. */
    const add = (path: string): void => {
      if (seen.has(path) || paths.length >= cap) return;
      const file = this.app.vault.getFileByPath(path);
      if (!file || file.extension !== "md") return;
      seen.add(path);
      paths.push(path);
    };
    add(centerPath);
    for (const path of this.metadataImpactTargets(centerPath) ?? []) add(path);
    for (const path of this.outgoing.get(centerPath) ?? []) add(path);
    for (const path of this.incoming.get(centerPath) ?? []) add(path);
    for (const path of this.unresolvedIncoming.get(centerPath) ?? []) add(path);
    return paths;
  }

  /** Scan loaded aggregate host facts once; subsequent navigation performs indexed lookups only. */
  private async scanBacklinks(): Promise<void> {
    let processed = 0;
    let startedAt = this.runtime.now();
    for (const unresolved of [false, true]) {
      const links = unresolved ? this.app.metadataCache.unresolvedLinks : this.app.metadataCache.resolvedLinks;
      const outgoing = unresolved ? this.unresolvedOutgoing : this.outgoing;
      for (const source in links) {
        if (this.disposed || !this.runtime.isCurrent()) return;
        const targets = new Set<string>();
        for (const target in links[source]) {
          if (links[source]?.[target] > 0) targets.add(target);
          if ((++processed & 255) === 0 && this.runtime.now() - startedAt >= this.runtime.sliceBudgetMs) {
            await this.runtime.yield();
            startedAt = this.runtime.now();
          }
          if (this.disposed || !this.runtime.isCurrent()) return;
        }
        // A resolve event during an awaited slice owns the newer source contribution.
        if (!outgoing.has(source)) this.replaceSource(source, targets, unresolved);
        if ((++processed & 255) === 0 && this.runtime.now() - startedAt >= this.runtime.sliceBudgetMs) {
          await this.runtime.yield();
          startedAt = this.runtime.now();
        }
      }
    }
    this.initialized = true;
    for (const outgoing of [this.outgoing, this.unresolvedOutgoing]) {
      for (const [source, targets] of outgoing) if (!targets.size) outgoing.delete(source);
    }
  }

  /** Fence private host covers against resolve notifications independently of plugin source revisions. */
  observationRevision(): number { return this.revision; }

  /** Apply a post-resolve delta and return old/new targets so newly added backlinks refresh visible centers. */
  refreshSource(path: string): ReadonlySet<string> {
    if (this.disposed) return new Set();
    this.revision += 1;
    const targets = new Set(Object.keys(this.app.metadataCache.resolvedLinks[path] ?? {}));
    const unresolved = new Set(Object.keys(this.app.metadataCache.unresolvedLinks?.[path] ?? {}).filter(target => this.app.metadataCache.unresolvedLinks?.[path][target] > 0));
    const affected = new Set([...(this.outgoing.get(path) ?? []), ...targets,
      ...(this.unresolvedOutgoing.get(path) ?? []), ...unresolved]);
    this.replaceSource(path, targets);
    this.replaceSource(path, unresolved, true);
    return affected;
  }

  /** Retire deleted/renamed source contributions and return targets whose visible previews need refreshing. */
  removeSource(path: string): ReadonlySet<string> {
    if (this.disposed) return new Set();
    this.revision += 1;
    const affected = new Set([...(this.outgoing.get(path) ?? []), ...(this.unresolvedOutgoing.get(path) ?? [])]);
    this.replaceSource(path, new Set());
    this.replaceSource(path, new Set(), true);
    return affected;
  }

  /**
   * Return bounded current host destinations affected by a metadata notification, including newly
   * introduced ontology, unresolved and tag endpoints absent from the aggregate resolved-link map.
   * Null means the observation is absent/dense/unsafe and callers must conservatively retire broader
   * warm proof. This synchronous helper does not mutate reverse maps or acquire bodies/DB sources;
   * link grammar, host resolution, property normalization and tag ancestry reuse their existing owners.
   * Supplied baseline aliases fence wider resolution effects; Date-property observations remain
   * conservative because their interpreted daily-note destinations are outside the host link map.
   */
  metadataImpactTargets(path: string, priorAliases?: readonly string[]): ReadonlySet<string> | null {
    if (this.disposed || !this.runtime.isCurrent()) return null;
    const file = this.app.vault.getFileByPath(path);
    if (!(file instanceof TFile)) return null;
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return null;
    const frontmatter = cache.frontmatter ?? {};
    const collections = [cache.links ?? [], cache.embeds ?? [], cache.frontmatterLinks ?? [], cache.tags ?? []];
    const metadataSize = metadataBytes(frontmatter, MAX_PREVIEW_METADATA_BYTES);
    if (metadataSize === null) return null;
    let bytes = metadataSize, entries = 0;
    for (const collection of collections) {
      entries += collection.length;
      if (entries > MAX_PREVIEW_TARGETS) return null;
      const size = metadataBytes(collection, MAX_PREVIEW_TOTAL_METADATA_BYTES - bytes);
      if (size === null) return null;
      bytes += size;
    }
    const hierarchy = this.settings().hierarchy;
    // Alias changes can re-resolve owners outside this source's outgoing incidence. Date widgets
    // interpret plain values through host Daily Notes policy. Neither fan-out is proved by links.
    if (priorAliases) {
      const aliases: string[] = [];
      for (const step of iterateFrontmatterAliasSteps(frontmatter)) if (step.value !== null) aliases.push(step.value);
      if (aliases.length !== priorAliases.length || aliases.some((alias, index) => alias !== priorAliases[index])) return null;
    }
    const metadataHost = createObsidianMetadataSourceHost(this.app);
    for (const name in frontmatter) if (Object.prototype.hasOwnProperty.call(frontmatter, name)
      && metadataHost.isDateProperty(name)) return null;
    const fields = new Set<string>();
    let fieldCount = 0, fieldBytes = 0;
    for (const group of [hierarchy.parents, hierarchy.children, hierarchy.leftFriends, hierarchy.rightFriends,
      hierarchy.previous, hierarchy.next, hierarchy.hidden, hierarchy.exclusions ?? []]) {
      for (const field of group) {
        fieldBytes += field.length * 2;
        if (++fieldCount > MAX_PREVIEW_TARGETS || fieldBytes > MAX_PREVIEW_METADATA_BYTES) return null;
        fields.add(normalizeFieldName(field));
      }
    }
    const tags = getAllTags(cache) ?? [];
    if (tags.length > MAX_PREVIEW_TARGETS || !tagPrefixesWithinBudget(tags)) return null;
    const targets = new Set<string>();
    let targetBytes = 0;
    /** Cap the union as well as each cache prefix; a complete bounded observation is never a truncation. */
    const add = (target: string): boolean => {
      if (!targets.has(target)) targetBytes += target.length * 2;
      targets.add(target);
      return targets.size <= MAX_PREVIEW_TARGETS && targetBytes <= MAX_PREVIEW_TOTAL_METADATA_BYTES;
    };
    let inspected = 0;
    for (const target in this.app.metadataCache.resolvedLinks[path] ?? {}) {
      if (++inspected > MAX_PREVIEW_TARGETS) return null;
      if (this.app.metadataCache.resolvedLinks[path][target] > 0 && !add(target)) return null;
    }
    for (const name in frontmatter) {
      if (!Object.prototype.hasOwnProperty.call(frontmatter, name) || !fields.has(normalizeFieldName(name))) continue;
      for (const target of extractLinksFromValue(this.app, frontmatter[name], file)) if (!add(target)) return null;
    }
    for (const links of [cache.links ?? [], cache.embeds ?? [], cache.frontmatterLinks ?? []]) {
      for (const link of links) {
        for (const target of extractLinksFromValue(this.app, `[[${link.link}]]`, file)) if (!add(target)) return null;
      }
    }
    for (const tag of tags) for (const target of canonicalTagPaths(tag)) if (!add(target)) return null;
    return targets;
  }

  /** Replace exactly one source's backlinks, retiring empty target buckets to avoid lifetime leaks. */
  private replaceSource(source: string, targets: Set<string>, unresolved = false): void {
    const outgoing = unresolved ? this.unresolvedOutgoing : this.outgoing;
    const incoming = unresolved ? this.unresolvedIncoming : this.incoming;
    for (const target of outgoing.get(source) ?? []) {
      const owners = incoming.get(target);
      owners?.delete(source);
      if (!owners?.size) incoming.delete(target);
    }
    if (targets.size || !this.initialized) outgoing.set(source, targets);
    else outgoing.delete(source);
    for (const target of targets) {
      const owners = incoming.get(target) ?? new Set<string>();
      owners.add(source);
      incoming.set(target, owners);
    }
  }

  /** Release lookup state and fence all pending collector/compiler work on plugin unload. */
  dispose(): void {
    this.disposed = true;
    this.revision += 1;
    this.outgoing.clear();
    this.incoming.clear();
    this.unresolvedOutgoing.clear();
    this.unresolvedIncoming.clear();
  }

  /**
   * Compile one bounded private host scope. Direct center contributions precede incoming owners;
   * dense/oversized enrichment remains incomplete rather than authorizing partial persisted facts.
   * Folder centers take the separate direct-native-membership path before backlink initialization.
   * No source flush, DB access or Markdown body acquisition occurs on either path.
   */
  async build(centerPath: string, options: Readonly<{
    /** Remove only owner/fanout preview caps for a local host cover; byte/record limits stay enforced. */
    completeHostCover?: boolean;
    /** Revision-valid already acquired bodies enrich host facts without additional reads. */
    bodyForPath?: (path: string) => ParsedBodyMetadata | undefined;
    additionalPaths?: Iterable<string>;
    /** Exact canonical identity for known URL/tag/unresolved endpoints, without guessing from paths. */
    entityForPath?: (path: string) => SourceEntityFact | undefined;
    isCurrent?: () => boolean;
    checkpoint?: () => Promise<void>;
    /** A current guard failure is distinct from cancellation and ordinary optional global work. */
    onUnavailable?: () => void;
  }> = {}): Promise<HostMetadataPreviewResult | null> {
    if (this.disposed || !this.runtime.isCurrent()) return null;
    // Folder identity is interpreted only at this host boundary. No backlink catalog or note
    // metadata is needed to expose the native direct tree during blocked durable startup.
    if (centerPath.startsWith("folder:")) {
      const folder = centerPath === "folder:/" ? this.app.vault.getRoot()
        : this.app.vault.getFolderByPath(centerPath.slice("folder:".length));
      return folder instanceof TFolder ? this.buildFolder(folder, centerPath) : null;
    }
    await this.initializeBacklinks();
    const center = this.app.vault.getFileByPath(centerPath);
    if (!(center instanceof TFile) && !options.completeHostCover) return null;
    const revision = this.revision;
    const captured = new Map<TFile, Readonly<{ path: string; mtime: number; size: number }>>();
    /** Capture physical identity once so any awaited work cannot publish stale host files. */
    const capture = (file: TFile): void => {
      if (!captured.has(file)) captured.set(file, { path: file.path, mtime: file.stat.mtime, size: file.stat.size });
    };
    if (center instanceof TFile) capture(center);
    /** Finality checks include exact file identity, not only mtime, at every cooperative boundary. */
    const current = (): boolean => !this.disposed && this.revision === revision && this.runtime.isCurrent()
      && options.isCurrent?.() !== false
      && (center instanceof TFile || this.app.vault.getFileByPath(centerPath) === null)
      && [...captured].every(([file, stat]) => file.path === stat.path && file.stat.mtime === stat.mtime
        && file.stat.size === stat.size && this.app.vault.getFileByPath(stat.path) === file);
    const settings = this.settings();
    const compilerSettings = graphCompilerSettingsFromLegacy(settings);
    const metadataSettings = { noteTypeField: settings.noteTypeField, primaryTagField: settings.primaryTagField };
    const compiler = new NormalizedGraphCompiler(compilerSettings, { ...this.runtime, isCurrent: current });
    // A known unresolved endpoint has no physical metadata to fetch. Its current host/body
    // contributors still prove local numeric gates, including zero, without global absence authority.
    if (!(center instanceof TFile)) {
      const entity: SourceEntityRef = { id: nodeId(centerPath), kind: "unresolved", state: "unresolved", semanticPath: centerPath };
      const known = options.entityForPath?.(centerPath);
      if (known && known.entity.semanticPath !== centerPath) return null;
      if (!(await compiler.seedEntityFact(known ?? { kind: "entity", source: entity, entity,
        sourceRevision: sourceRevision(`host-preview-virtual:${revision}`), name: centerPath, url: null }))) return null;
    }
    const seeded = new Set<string>();
    let records = 0;
    let recordBytes = 0;
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
        if (options.completeHostCover) for (const record of batch.records) recordBytes += estimateReferenceRecordBytes(record);
        if (records > MAX_PREVIEW_RECORDS || recordBytes > MAX_LOCAL_HOST_RECORD_BYTES) {
          options.onUnavailable?.();
          return false;
        }
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
      checkpoint: async (): Promise<boolean> => { await options.checkpoint?.(); await this.runtime.yield(); return current(); },
    };
    const sources = new Set([centerPath]);
    for (const path of this.incoming.get(centerPath) ?? []) {
      if (!options.completeHostCover && sources.size >= MAX_PREVIEW_SOURCES) break;
      sources.add(path);
      if (sources.size > MAX_PREVIEW_RECORDS) { options.onUnavailable?.(); return null; }
    }
    if (options.completeHostCover) for (const path of this.unresolvedIncoming.get(centerPath) ?? []) {
      sources.add(path);
      if (sources.size > MAX_PREVIEW_RECORDS) { options.onUnavailable?.(); return null; }
    }
    // Direct neighbours also contribute frontmatter overrides for the center pair.
    for (const path in this.app.metadataCache.resolvedLinks[centerPath] ?? {}) {
      if (!options.completeHostCover && sources.size >= MAX_PREVIEW_SOURCES) break;
      sources.add(path);
      if (sources.size > MAX_PREVIEW_RECORDS) { options.onUnavailable?.(); return null; }
    }
    if (options.completeHostCover) {
      for (const path of this.metadataImpactTargets(centerPath) ?? []) if (this.app.vault.getFileByPath(path)) sources.add(path);
      for (const path of options.additionalPaths ?? []) {
        if (this.app.vault.getFileByPath(path)) sources.add(path);
        else {
          const known = options.entityForPath?.(path);
          if (known && known.entity.semanticPath === path && !(await compiler.seedEntityFact(known))) return null;
        }
        if (sources.size > MAX_PREVIEW_RECORDS) { options.onUnavailable?.(); return null; }
      }
    }
    for (const path of sources) {
      const file = this.app.vault.getFileByPath(path);
      if (!(file instanceof TFile)) continue;
      capture(file);
      if (!(await compiler.seedEntityFact(entityFactForFile(file)))) return null;
      const cache = this.app.metadataCache.getFileCache(file);
      if (options.completeHostCover && file.extension === "md" && !cache) {
        options.onUnavailable?.();
        return null;
      }
      const metadataBudget = options.completeHostCover ? MAX_LOCAL_HOST_METADATA_BYTES : MAX_PREVIEW_METADATA_BYTES;
      const estimated = metadataBytes(cache?.frontmatter ?? {}, metadataBudget);
      const inlineTags = cache?.tags ?? [];
      const tagBytes = estimated === null || inlineTags.length > MAX_PREVIEW_TARGETS ? null
        : metadataBytes(inlineTags.map(tag => tag.tag), metadataBudget - estimated);
      const tags = estimated !== null && tagBytes !== null && cache ? getAllTags(cache) ?? [] : [];
      const metadataAllowed = estimated !== null && tagBytes !== null
        && (options.completeHostCover || metadataTotal + estimated + tagBytes <= MAX_PREVIEW_TOTAL_METADATA_BYTES)
        && tagPrefixesWithinBudget(tags);
      if (options.completeHostCover && !metadataAllowed) {
        options.onUnavailable?.();
        return null;
      }
      if (metadataAllowed) {
        metadataTotal += estimated + tagBytes;
        const metadata = mergeFileMetadata(cache, options.bodyForPath?.(path) ?? { inlineFields: {}, inlineFieldOccurrences: [], urls: [] });
        const host = metadataHost;
        if (!(await consume(new ObsidianMetadataSourceCollector(host, collectorRuntime, file, metadata, metadataSettings, "metadata")))) return null;
        if (!(await consume(new ObsidianReferenceSourceCollector({ metadataCache: this.app.metadataCache,
          resolvedLinkCount: host.resolvedLinkCount }, collectorRuntime, file, metadata)))) return null;
        if (options.completeHostCover && !(await consume(new ObsidianMetadataSourceCollector(host, collectorRuntime,
          file, metadata, metadataSettings, "relations")))) return null;
      }
      // If metadata exceeded the bound, omit its aggregate links as well: unknown explicit
      // overrides must not be misrepresented as inferred relationships.
      const resolved = Object.create(null) as Record<string, number>;
      const unresolved = Object.create(null) as Record<string, number>;
      let inspectedTargets = 0;
      for (const target in metadataAllowed ? this.app.metadataCache.resolvedLinks[path] ?? {} : {}) {
        // Irrelevant entries consume work too; a dense owner must not synchronously scan its fanout.
        if (++inspectedTargets > MAX_PREVIEW_TARGETS && !options.completeHostCover) break;
        if (path === centerPath && !sources.has(target) && this.app.vault.getFileByPath(target)?.extension === "md") continue;
        if (path !== centerPath && target !== centerPath) continue;
        resolved[target] = this.app.metadataCache.resolvedLinks[path][target];
      }
      if (metadataAllowed) for (const target in this.app.metadataCache.unresolvedLinks?.[path] ?? {}) {
        if (++inspectedTargets > MAX_PREVIEW_TARGETS && !options.completeHostCover) break;
        if (path !== centerPath && (!options.completeHostCover || target !== centerPath)) continue;
        unresolved[target] = this.app.metadataCache.unresolvedLinks?.[path][target];
      }
      if (!(await consume(new ObsidianHostLinkSourceCollector({ vault: this.app.vault,
        metadataCache: { resolvedLinks: { [path]: resolved }, unresolvedLinks: { [path]: unresolved } } }, collectorRuntime, path)))) return null;
      if (options.completeHostCover && options.entityForPath?.(centerPath)?.entity.kind === "tag" && metadataAllowed) {
        const facts = structuralTagMembershipFacts(file, this.app.metadataCache);
        records += facts.length;
        if (records > MAX_PREVIEW_RECORDS) { options.onUnavailable?.(); return null; }
        const boundary = { generation: sourceGeneration(`host-preview-tag:${revision}:${path}`), snapshotRevision: sourceSnapshotRevision(`host-preview-tag:${revision}:${path}`) };
        const read = compiler.beginRead(boundary);
        if (!(await compiler.acceptBatch(read, { boundary, sequence: 0, final: true, records: facts })) || !compiler.completeRead(read, boundary)) return null;
      }
      if (path === centerPath) {
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
        if (records > MAX_PREVIEW_RECORDS) { options.onUnavailable?.(); return null; }
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

  /**
   * Prove one physical folder's parent/child totals without retaining its rendered child graph.
   * This endpoint-local observation may supplement a partial canonical folder page; it cannot
   * authorize note incidence or editing. The caller still owns policy/source publication fences.
   */
  async folderGates(centerPath: string): Promise<Partial<CachedCenterGates> | null> {
    if (this.disposed || !this.runtime.isCurrent() || !centerPath.startsWith("folder:")) return null;
    const folder = centerPath === "folder:/" ? this.app.vault.getRoot()
      : this.app.vault.getFolderByPath(centerPath.slice("folder:".length));
    if (!(folder instanceof TFolder)) return null;
    const result = await this.buildFolder(folder, centerPath, false);
    return !this.disposed && this.runtime.isCurrent() ? result?.structuralGates?.get(centerPath) ?? null : null;
  }

  /**
   * Compile a direct native folder cover without recursive traversal or metadata/source acquisition.
   * Count-only chunks use the canonical structural compiler and gate projection, then are discarded.
   * The retained graph contains at most the configured visible child limit plus center and parent.
   * A lightweight identity/facet capture, independent of the graph cover, fences the final membership
   * observation; structural gate proofs never imply complete Markdown/body incidence or write safety.
   */
  private async buildFolder(folder: TFolder, centerPath: string, includeCover = true): Promise<HostMetadataPreviewResult | null> {
    const revision = this.revision;
    const settings = this.settings();
    const compilerSettings = graphCompilerSettingsFromLegacy(settings);
    const visibility = captureCachedCenterGateSettings({ ...settings, excludeFilepaths: settings.excludeFilepaths ?? [] });
    if (!visibility) return null;
    const limit = includeCover ? Math.min(MAX_FOLDER_PREVIEW_COVER, Math.max(1, Math.floor(settings.maxItemCount || 100))) : 0;
    const policySignature = JSON.stringify({ compilerSettings, visibility, limit });
    const folderPath = folder.path, folderName = folder.name, parent = folder.parent;
    const parentPath = parent?.path, parentName = parent?.name;
    const children = folder.children, childCount = children.length;
    const captured: FolderMemberCapture[] = [];
    const identities = new Set<TFolder | TFile>();
    const paths = new Set<string>();
    // Snapshot primitive host identities before the first await. This is O(direct members), not a
    // normalized graph/evidence mirror; later chunks and final validation must use this observation.
    for (const member of children) {
      if (!(member instanceof TFile) && !(member instanceof TFolder)) return null;
      if (identities.has(member) || paths.has(member.path) || member.parent !== folder) return null;
      identities.add(member); paths.add(member.path);
      captured.push({ member, path: member.path, name: member.name, parent: member.parent,
        ...(member instanceof TFile ? { file: { mtime: member.stat.mtime, ctime: member.stat.ctime,
          size: member.stat.size, basename: member.basename, extension: member.extension } } : {}) });
    }
    /** Resolve physical folder identity through public typed APIs, including both host root spellings. */
    const currentFolder = (path: string): TFolder | null => path === "/" || path === ""
      ? this.app.vault.getRoot() : this.app.vault.getFolderByPath(path);
    /** Reacquire one live accessor value so an in-place visibility/semantic edit invalidates old counts. */
    const currentPolicySignature = (): string => {
      const live = this.settings();
      return JSON.stringify({ compilerSettings: graphCompilerSettingsFromLegacy(live),
        visibility: captureCachedCenterGateSettings({ ...live, excludeFilepaths: live.excludeFilepaths ?? [] }),
        limit: includeCover ? Math.min(MAX_FOLDER_PREVIEW_COVER, Math.max(1, Math.floor(live.maxItemCount || 100))) : 0 });
    };
    /** Fence native identity/policy; unrelated note metadata revisions cannot cancel a tree count. */
    const current = (): boolean => !this.disposed && this.runtime.isCurrent()
      && folder.path === folderPath && folder.name === folderName && folder.parent === parent
      && currentFolder(folderPath) === folder && folder.children === children && children.length === childCount
      && (!parent || (parent.path === parentPath && parent.name === parentName && currentFolder(parent.path) === parent))
      && currentPolicySignature() === policySignature;
    const runtime = { ...this.runtime, isCurrent: current };
    const folderRevision = sourceRevision(`host-preview-folder:${revision}:${folderPath}`);
    const centerFact = entityFactForFolder(folder, folderRevision);
    const retained: NormalizedSourceRecord[] = [centerFact];
    if (parent) {
      const parentRevision = sourceRevision(`host-preview-parent:${revision}:${parent.path}`);
      retained.push(entityFactForFolder(parent, parentRevision), structuralFileTreeOccurrence(parent, folder, parentRevision));
    }
    /** Feed finite structural frames through the existing compiler; every normalized batch stays capped. */
    const compile = async (facts: readonly NormalizedSourceRecord[], label: string): Promise<PortableGraphCompilation | null> => {
      if (!current()) return null;
      const compiler = new NormalizedGraphCompiler(compilerSettings, runtime);
      const boundary = { generation: sourceGeneration(`host-folder-preview:${revision}:${label}`),
        snapshotRevision: sourceSnapshotRevision(`host-folder-preview:${revision}:${label}`) };
      const read = compiler.beginRead(boundary);
      for (let start = 0, sequence = 0; start < facts.length; start += 256, sequence++) {
        if (!(await compiler.acceptBatch(read, { boundary, sequence, final: start + 256 >= facts.length,
          records: facts.slice(start, start + 256) }))) return null;
      }
      return compiler.completeRead(read, boundary) ? compiler.finish() : null;
    };
    /** Bind only the exact private physical entity facts required by the shared visibility projector. */
    const entityPort = (facts: readonly NormalizedSourceRecord[]): Readonly<{ entity(ref: SourceEntityRef): SourceEntityFact | undefined }> => {
      const entities = new Map<SourceEntityRef["id"], SourceEntityFact>();
      for (const fact of facts) if (fact.kind === "entity") entities.set(fact.entity.id, fact);
      return {
        /** Answer one exact normalized identity without inventing physical facets or host acquisition. */
        entity: (ref) => entities.get(ref.id),
      };
    };
    const parentCompilation = await compile(retained, "parent");
    if (!parentCompilation || !current()) return null;
    const parentProjection = await projectCachedCenterGates(parentCompilation, centerFact.entity,
      compilerSettings.inferAllLinksAsFriends, visibility, entityPort(retained), runtime);
    if (parentProjection.outcome !== "ready") return null;
    let retainedChildren = 0;
    let sliceStarted = this.runtime.now();
    const bottom = { hasAny: false, visibleCount: 0 };
    for (let start = 0; start < childCount; start += FOLDER_COUNT_CHUNK_SIZE) {
      if (!current()) return null;
      const facts: NormalizedSourceRecord[] = [centerFact];
      const childFacts: Array<Readonly<{ fact: SourceEntityFact; occurrence: NormalizedSourceRecord }>> = [];
      for (let index = start; index < Math.min(childCount, start + FOLDER_COUNT_CHUNK_SIZE); index++) {
        const member = captured[index].member;
        const fact = member instanceof TFile ? entityFactForFile(member)
          : entityFactForFolder(member, sourceRevision(`host-preview-child:${revision}:${member.path}`));
        const occurrence = structuralFileTreeOccurrence(folder, member, folderRevision);
        childFacts.push({ fact, occurrence });
        facts.push(fact, occurrence);
      }
      const compilation = await compile(facts, `children:${start}`);
      if (!compilation || !current()) return null;
      const entities = entityPort(facts);
      const projection = await projectCachedCenterGates(compilation, centerFact.entity,
        compilerSettings.inferAllLinksAsFriends, visibility, entities, runtime);
      if (projection.outcome !== "ready") return null;
      bottom.hasAny ||= projection.gates.bottom.hasAny;
      bottom.visibleCount += projection.gates.bottom.visibleCount;
      for (const { fact, occurrence } of childFacts) {
        if (retainedChildren >= limit) break;
        const node = compilation.node(fact.entity.id);
        if (!node) return null;
        const visible = cachedCenterTargetVisibility(node, visibility, entities);
        if (visible.outcome !== "ready") return null;
        if (!visible.visible) continue;
        retained.push(fact, occurrence);
        retainedChildren++;
      }
      // Chunk size bounds private graph memory. Host task yielding separately follows the injected
      // time budget, so a cheap small folder does not incur a timer for every normalized frame.
      if (this.runtime.now() - sliceStarted >= this.runtime.sliceBudgetMs) {
        await this.runtime.yield();
        sliceStarted = this.runtime.now();
      }
    }
    const compilation = await compile(retained, "cover");
    if (!compilation || !current()) return null;
    // This final synchronous primitive identity pass closes the observation after the last await.
    // It retains no full normalized topology/evidence and cannot recurse into child folders.
    for (let index = 0; index < captured.length; index++) {
      const item = captured[index], member = children[index];
      if (member !== item.member || member.path !== item.path || member.name !== item.name || member.parent !== item.parent) return null;
      if (member instanceof TFile) {
        if (!item.file || this.app.vault.getFileByPath(item.path) !== member
          || member.stat.mtime !== item.file.mtime || member.stat.ctime !== item.file.ctime || member.stat.size !== item.file.size
          || member.basename !== item.file.basename || member.extension !== item.file.extension) return null;
      } else if (currentFolder(item.path) !== member) return null;
    }
    const state = this.bind(compilation);
    const page = state?.pages.get(centerPath);
    if (!state || !page || !current()) return null;
    return { state, centerPath, visiblePaths: new Set([centerPath, ...page.neighbours.keys()]), incomplete: true,
      settings: compilerSettings, structuralGates: new Map([[centerPath, { top: parentProjection.gates.top, bottom }]]) };
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
