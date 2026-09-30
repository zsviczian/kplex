/** Exercise production host acquisition with explicit public-host fixtures, not substitute collectors. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { browserBundle } from "./browserTypeScript.mjs";

const bundle = await browserBundle([
  "src/index/CachedRequestedPair.ts", "src/core/graph/evidence.ts", "src/adapters/obsidian/sourceAcquisition.ts", "src/index/SourceRepository.ts", "src/core/parser/metadata.ts", "src/index/SourceReplay.ts", "src/index/CachedSourceSemantics.ts", "src/index/SourceContributorSummary.ts",
  "src/core/graph/compiler.ts", "src/core/graph/source.ts", "src/index/fieldParser.ts",
  "src/adapters/obsidian/structuralSourceCollector.ts", "src/adapters/obsidian/hostLinkSourceCollector.ts",
  "src/adapters/obsidian/ontologySourceCollector.ts", "src/adapters/obsidian/metadataSourceCollector.ts",
], { obsidian: `exports.Platform={isMobile:false}; exports.TFile=class TFile {
  constructor(path){this.path=path;this.name=path.split('/').pop();this.extension=path.split('.').pop();this.basename=path.split('/').pop().replace(/\\.[^.]+$/,'');this.stat={mtime:1,size:100,ctime:1};this.parent={path:''};}
}; exports.TFolder=class TFolder {constructor(){this.path='';this.name='';this.children=[];this.parent=null;}};
exports.getAllTags=cache=>cache.hostTags??[];window.SourceTestFolder=exports.TFolder;window.SourceTestFile=exports.TFile;` });
globalThis.window = globalThis;
new Function("window", bundle)(window);
export const M = window.sourceModules;
const { ObsidianSourceAcquisition, NeutralSourceRepository, parseBodyMetadata } = M;
const TFile = window.SourceTestFile;

/** Only host events and file IO are fixtures; source codecs, repository and acquisition are production. */
export function replayFixture() {
  const files = new Map(), metadata = new Map(), text = new Map(), legacy = new Map(), resolutions = new Map();
  const reads = [], parses = [], timers = new Map(); let timerId = 0;
  const events = () => {
    const refs = new Set();
    return { on(name, callback) { const ref = { name, callback }; refs.add(ref); return ref; },
      offref(ref) { refs.delete(ref); }, count: () => refs.size,
      trigger(name, ...args) { for (const ref of refs) if (ref.name === name) ref.callback(...args); } };
  };
  const root = new window.SourceTestFolder();
  const vault = { ...events(), getFileByPath: path => files.get(path) ?? null,
    getRoot: () => { root.children = [...files.values()]; return root; }, getFiles: () => [...files.values()],
    getMarkdownFiles: () => [...files.values()].filter(f => f.extension === "md"),
    cachedRead: async file => { reads.push(file.path); return text.get(file.path) ?? ""; },
  };
  vault.read = vault.cachedRead;
  const app = { vault, metadataCache: { ...events(), resolvedLinks: {}, unresolvedLinks: {},
    getFileCache: file => metadata.get(file.path) ?? null,
    getFirstLinkpathDest: (literal, source) => files.get(resolutions.get(`${source}:${literal}`) ?? resolutions.get(literal) ?? literal) ?? null,
  }, metadataTypeManager: { getPropertyInfo: name => ({ widget: app.dateFields.has(name) ? "date" : "text" }) },
    dateFields: new Set(), daily: { folder: "Daily", format: "YYYY-MM-DD" },
    internalPlugins: { getPluginById: () => ({ enabled: true, instance: { options: app.daily } }) } };
  window.moment = value => ({ isValid: () => true, format: () => value });
  const repository = new NeutralSourceRepository({ open: async () => null, failed() { assert.fail("No IDB in the host fixture"); } }, {
    now: () => 0, yield: async () => {}, digest: async value => createHash("sha256").update(value).digest("hex"), uniqueId: randomUUID,
    schedule: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; }, cancel: id => timers.delete(id),
  });
  const cache = { sources: repository,
    getBodies: async requests => new Map(requests.flatMap(({ path, mtime }) => { const item = legacy.get(path); return item?.mtime === mtime ? [[path, item.body]] : []; })),
    putBody: async (path, mtime, body) => { legacy.set(path, { path, mtime, parserVersion: 2, body }); },
  };
  cache.putBodies = async values => { for (const value of values) await cache.putBody(value.path, value.mtime, value.body); };
  cache.deleteBody = async path => { legacy.delete(path); };
  cache.queueBodyWrite = (path, mtime, body) => { legacy.set(path, { path, mtime, parserVersion: 2, body }); };
  const parser = async value => { parses.push(value); return parseBodyMetadata(value); };
  const acquisition = new ObsidianSourceAcquisition(app, cache, parser);
  const add = (path, bodyText = "Links:: [[Alias]] [[Target]]", frontmatter = {}) => {
    const file = new TFile(path); file.parent = root; files.set(path, file); text.set(path, bodyText);
    metadata.set(path, { frontmatter, links: [] });
    return file;
  };
  const facts = async (path, family) => { const result = []; assert.equal(await repository.visit(path, family, records => { result.push(...records); return true; }), "ready"); return result; };
  return { files, metadata, text, legacy, resolutions, reads, parses, app, repository, acquisition, cache, parser, add, facts,
    close() { acquisition.close(); repository.close(); assert.equal(vault.count(), 0); assert.equal(app.metadataCache.count(), 0); assert.equal(timers.size, 0); } };
}

/** A policy fixture uses the same finite inputs as the production compiler. */
export const settings = {
  hierarchy: { hidden: ["Hidden"], parents: ["Parent"], children: ["Children"], leftFriends: ["Friends"],
    rightFriends: ["Opposes"], previous: ["Previous"], next: ["Next"] },
  inferAllLinksAsFriends: false, inverseInfer: false, showFullTagName: true,
  tagStyleList: ["#project", "#person"], maxLabelLength: 30,
};
export const presentation = { noteTypeField: "Type", primaryTagField: "Style" };
/** Deterministic cooperative clock; cancellation tests replace only the scheduling port. */
export const runtime = (overrides = {}) => ({ now: () => 0, yield: async () => {}, isCurrent: () => true,
  sliceBudgetMs: 8, resolverBatchSize: 50, ...overrides });
/** The monotonic policy revision belongs to the caller, not to persisted source observations. */
export const policy = (overrides = {}) => ({ revision: "policy:1", settings: structuredClone(settings), isCurrent: () => true, ...overrides });

/** Collect a live producer, respecting finality for both one-pass and two-phase host collectors. */
export async function collect(collector) {
  const records = [];
  let cursor = M.beginSourceRead(collector.boundary);
  const consume = batch => {
    const accepted = M.acceptSourceBatch(cursor, batch);
    assert.equal(accepted.accepted, true); cursor = accepted.cursor;
    records.push(...batch.records); return true;
  };
  assert.equal(await collector.collectBatches(consume), true);
  if (collector.finalize) { const final = await collector.finalize(); assert(final); consume(final); }
  assert.equal(collector.isBoundaryCurrent(collector.boundary), true);
  assert.equal(M.sourceReadCanPublish(cursor, collector.boundary), true);
  return records;
}

/** Full compiler oracle over ALL current facts in the requested-owner fixture, not cached replay. */
export async function hostOracle(f, ids, config, options = presentation) {
  const compiler = new M.NormalizedGraphCompiler(config, runtime());
  const host = M.createObsidianMetadataSourceHost(f.app);
  const cr = { isCurrent: () => true, sourceRevision: () => f.acquisition.hostRevision, checkpoint: async () => true };
  // Entity facts are physical input. Every Markdown file here is a requested source; attachments
  // are real host entities used by the fixture. No unrelated whole-vault records are compared.
  const records = [...f.files.values()].map(M.entityFactForFile);
  for (const id of ids) {
    const file = f.files.get(id), body = M.parseBodyMetadata(f.text.get(id));
    const metadata = M.mergeFileMetadata(f.metadata.get(id), body);
    records.push(...await collect(new M.ObsidianStructuralPatchSourceCollector(f.app, cr, file)));
    records.push(...await collect(new M.ObsidianHostLinkSourceCollector(f.app, cr, id)));
    records.push(...await collect(new M.ObsidianMetadataSourceCollector(host, cr, file, metadata, options, "metadata")));
    records.push(...await collect(new M.ObsidianReferenceSourceCollector({ metadataCache: f.app.metadataCache,
      resolvedLinkCount: host.resolvedLinkCount }, cr, file, metadata)));
    records.push(...await collect(new M.ObsidianMetadataSourceCollector(host, cr, file, metadata, options, "relations")));
  }
  const b = { generation: M.sourceGeneration("oracle"), snapshotRevision: M.sourceSnapshotRevision("oracle") };
  const read = compiler.beginRead(b);
  for (let start = 0, sequence = 0; start < records.length; start += 256, sequence++) {
    const batch = records.slice(start, start + 256);
    assert.equal(await compiler.acceptBatch(read, { boundary: b, sequence, records: batch, final: start + batch.length === records.length }), true);
  }
  assert.equal(compiler.completeRead(read, b), true);
  const result = await compiler.finish(); assert(result); return result;
}

/**
 * Compare every semantic node/search input and directed relation/evidence field. Only generated
 * evidence keys and read-attempt ownership revision labels differ between live collectors and a
 * stored head. Ownership source IDs and all duplicate declarations remain exact; stamps are tested
 * separately. This is an additional oracle, not a change to any accepted golden fixture.
 */
export function semanticView(compilation) {
  const declaration = item => { const { id, contribution, ...rest } = item; return { ...rest, contribution: { sourceId: contribution.sourceId } }; };
  const nodes = [...compilation.nodes.values()].map(node => {
    const { neighbours, ...rest } = node;
    return { ...rest, neighbours: [...neighbours.values()].map(relation => {
      const { target, ...flags } = relation;
      return { ...flags, target: target.id };
    }).sort((a,b) => a.target.localeCompare(b.target)) };
  }).sort((a,b) => a.id.localeCompare(b.id));
  return { nodes, declarations: [...compilation.declarations()].map(declaration).map(x=>JSON.stringify(x)).sort(),
    discoveredFields: [...compilation.discoveredFields].sort() };
}
