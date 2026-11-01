/** Host preview contracts exercise actual collectors/compiler/index readers with native metadata doubles.
 * Canonical structural tags retain their hierarchy over narrower direct-member covers; normal
 * atomic source patches preserve shared tag lifetimes without navigation-driven acquisition. */
import assert from "node:assert/strict";
import { buildSync } from "esbuild";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const directory = mkdtempSync(join(tmpdir(), "kplex-host-preview-"));
process.once("exit", () => rmSync(directory, { recursive: true, force: true }));
const obsidianDirectory = join(directory, "node_modules", "obsidian");
mkdirSync(obsidianDirectory, { recursive: true });
writeFileSync(join(obsidianDirectory, "index.js"), `
class TFolder { constructor(path, parent = null) { this.path = path; this.name = path.split('/').pop() || ''; this.children = []; this.parent = parent; parent?.children.push(this); } }
class TFile { constructor(path, parent) { this.path = path; this.name = path.split('/').pop(); this.extension = this.name.split('.').pop(); this.basename = this.name.slice(0, -(this.extension.length + 1)); this.parent = parent; this.stat = { mtime: 1, ctime: 1, size: 1 }; parent.children.push(this); } }
function getAllTags(cache) { return [...(cache.tags ?? []).map(t => t.tag), ...(cache.frontmatter?.tags ?? [])]; }
module.exports = { TFile, TFolder, getAllTags, Platform: { isMobile: false, isIosApp: false }, normalizePath: value => value };
`);
const output = join(directory, "preview.cjs");
buildSync({ entryPoints: ["src/index/HostMetadataPreview.ts"], outfile: output, bundle: true, platform: "node", format: "cjs", external: ["obsidian"] });
const require = createRequire(import.meta.url);
const { HostMetadataPreview } = require(output);
const resolverOutput = join(directory, "resolver.cjs");
buildSync({ entryPoints: ["src/core/graph/resolver.ts"], outfile: resolverOutput, bundle: true, platform: "node", format: "cjs" });
const { classifyRelation } = require(resolverOutput);
const indexOutput = join(directory, "graph-index.cjs");
buildSync({ stdin: { resolveDir: process.cwd(), contents: 'export * from "./src/index/GraphIndex"; export * from "./src/index/GraphBuilder";' }, outfile: indexOutput, bundle: true, platform: "node", format: "cjs", external: ["obsidian"] });
const { GraphIndex, GraphBuilder } = require(indexOutput);
const { TFile, TFolder } = require(join(obsidianDirectory, "index.js"));
const settings = { hierarchy: { hidden: ["Hidden"], parents: ["Parent"], children: ["Child"], leftFriends: ["Left"], rightFriends: ["Right"], previous: ["Previous"], next: ["Next"] }, inferAllLinksAsFriends: false, inverseInfer: false, showFullTagName: true, tagStyleList: [], baseNodeStyle: { maxLabelLength: 30 }, noteTypeField: "Type", primaryTagField: "Type" };

/** Create a host whose body/durable APIs fail if the preview accidentally acquires them. */
function fixture(options = {}) {
  const root = new TFolder("/"), folder = new TFolder("Notes", root);
  const names = ["Center", "Parent", "Child", "Left", "Right", "Previous", "Next", "Hidden", "Ordinary", "Backlink"];
  const files = new Map(names.map(name => { const file = new TFile(`Notes/${name}.md`, folder); return [file.path, file]; }));
  const cache = new Map([...files.keys()].map(path => [path, { frontmatter: {}, tags: [] }]));
  const centerPath = "Notes/Center.md";
  const resolvedLinks = { [centerPath]: Object.fromEntries(names.slice(1, -1).map(name => [`Notes/${name}.md`, 1])), "Notes/Backlink.md": { [centerPath]: 1 } };
  cache.get(centerPath).frontmatter = Object.fromEntries(["Parent", "Child", "Left", "Right", "Previous", "Next", "Hidden"].map(name => [name, `[[${name}]]`]));
  cache.get(centerPath).tags = [{ tag: "#project/nested" }];
  const app = { vault: { getRoot: () => root, getFolderByPath: path => path === folder.path ? folder : path === root.path ? root : null,
    getFileByPath: path => files.get(path) ?? null, read: () => { throw new Error("body reads forbidden"); }, cachedRead: () => { throw new Error("body reads forbidden"); } }, metadataCache: { resolvedLinks, unresolvedLinks: {}, getFileCache: file => file.extension === "md" ? cache.get(file.path) ?? null : {}, getFirstLinkpathDest: path => files.get(path) ?? files.get(`Notes/${path}`) ?? files.get(`Notes/${path}.md`) ?? null } };
  let yields = 0;
  const preview = new HostMetadataPreview(app, () => options.settings ?? settings, { now: () => 0, yield: async () => { yields++; await options.onYield?.(); }, isCurrent: () => options.isCurrent?.() ?? true, sliceBudgetMs: 7, resolverBatchSize: 96 });
  return { preview, app, files, cache, centerPath, yields: () => yields };
}

/** Native direct membership is available even when all metadata/backlink/body catalogs are blocked. */
function folderFixture(options = {}) {
  const root = new TFolder("/"), folder = new TFolder("Notes", root);
  const files = new Map(), folders = new Map([["/", root], ["Notes", folder]]);
  let liveSettings = { ...settings, excludeFilepaths: [], showVirtualNodes: true, showAttachments: true,
    showFolderNodes: true, showTagNodes: true, showPageNodes: true, showURLNodes: true,
    showInferredNodes: true, maxItemCount: 10, ...options.settings };
  const app = { vault: { getRoot: () => root, getFolderByPath: path => folders.get(path) ?? null,
    getFileByPath: path => files.get(path) ?? null, getFiles() { throw new Error("global inventory forbidden"); },
    getMarkdownFiles() { throw new Error("global inventory forbidden"); },
    read() { throw new Error("body reads forbidden"); }, cachedRead() { throw new Error("body reads forbidden"); } },
    get metadataCache() { if (options.hostMetadata) return options.hostMetadata;
      throw new Error("folder membership does not need metadata or backlink catalogs"); } };
  let yields = 0, workClock = 0;
  const preview = new HostMetadataPreview(app, () => liveSettings, { now: () => options.now?.() ?? ++workClock,
    yield: async () => { yields++; await options.onYield?.(); }, isCurrent: () => options.isCurrent?.() ?? true,
    sliceBudgetMs: 7, resolverBatchSize: 96 });
  /** Add one exact native local child; the collector must never descend through child children. */
  const addFolder = (path, parent = folder) => { const child = new TFolder(path, parent); folders.set(path, child); return child; };
  /** Add an ordinary note or attachment without making its body or metadata available. */
  const addFile = (path, parent = folder) => { const child = new TFile(path, parent); files.set(path, child); return child; };
  return { root, folder, files, folders, app, preview, addFolder, addFile, yields: () => yields,
    settings: () => liveSettings, setSettings: value => { liveSettings = value; } };
}

test('saved native history is synchronously available before catalogs, sources and storage', () => {
  const f = folderFixture(), originalWindow = globalThis.window;
  globalThis.window = {performance, setTimeout, clearTimeout, setInterval, clearInterval};
  const file = f.addFile('Notes/Center.md'), attachment = f.addFile('Notes/Photo.png');
  f.app.vault.getName = () => 'saved-navigation-test';
  const plugin = {settings: f.settings(), getIndexSourceRevision: () => 0, getIndexMaintenanceRevision: () => 0};
  const index = new GraphIndex(plugin, f.app);
  index.indexedDb.open = () => {throw Error('Storage forbidden');};
  index.sourceAcquisition.flush = () => {throw Error('Source acquisition forbidden');};
  const revision = index.getSemanticRevision();
  try {
    index.primeSavedNavigation([file.path, attachment.path, 'folder:Notes', 'Missing.md', file.path]);
    assert.equal(index.get(file.path)?.file, file);
    assert.equal(index.get(attachment.path)?.file, attachment);
    assert(index.get('folder:Notes')?.isFolder);
    assert.equal(index.get('Missing.md'), undefined);
    assert.equal(index.get(file.path).neighbours.size, 0, 'Availability owns no incidence');
    assert.equal(index.getSemanticRevision(), revision);
    assert.equal(index.physicalSearchUpdatedPaths.size, 0, 'Startup is not a native create event');
    const first = index.get(file.path);
    index.primeSavedNavigation([file.path]);
    assert.equal(index.get(file.path), first, 'Repeated layout readiness keeps the same availability');
    f.files.delete(file.path);
    assert.equal(index.get(file.path), undefined, 'Exact native deletion retires an uncompiled entry');
    f.files.set(file.path, new TFile(file.path, f.folder));
    assert.equal(index.get(file.path), undefined, 'Same-path replacement cannot borrow old identity');
    index.primeSavedNavigation([file.path]);
    assert.equal(index.get(file.path)?.file, f.files.get(file.path));
  } finally {index.destroy(); f.preview.dispose(); globalThis.window = originalWindow;}
});

/** Availability has no source completeness to grant; restore keeps its original stronger fence. */
test("startup availability survives an ordinary edit during priming while restore remains source-revision strict", async () => {
  const f = fixture(), originalWindow = globalThis.window, clockDescriptor = Object.getOwnPropertyDescriptor(globalThis, "performance");
  let now = 0, sourceRevision = 0, checkpoints = 0, inventories = 0;
  const clock = { now: () => now += 8 };
  Object.defineProperty(globalThis, "performance", { configurable: true, value: clock });
  globalThis.window = { performance: clock, setTimeout, clearTimeout, setInterval, clearInterval };
  const folder = f.files.get(f.centerPath).parent;
  for (let n = 0; n < 300; n++) { const file = new TFile(`Notes/Race-${n}.md`, folder); f.files.set(file.path, file); f.cache.set(file.path, { frontmatter: {}, tags: [] }); }
  Object.assign(f.app.vault, { getName: () => "prime-race", getFiles: () => { inventories++; return [...f.files.values()]; } });
  f.app.saveLocalStorage = () => {};
  const marks = [], plugin = { app: f.app, settings: { ...settings, lastActivePath: "", pinnedNodes: [], excludeFilepaths: [], nameFields: "aliases", renderAlias: false },
    getIndexSourceRevision: () => sourceRevision, startupDiagnostics: { mark: name => marks.push(name) } };
  const index = new GraphIndex(plugin, f.app);
  index.workScheduler.checkpoint = async () => {
    if (checkpoints++) return;
    sourceRevision++;
    f.cache.get(f.centerPath).frontmatter.Prose = "An ordinary startup edit";
    index.refreshVisibleHostMetadataPreviews(f.centerPath, sourceRevision - 1);
  };
  try {
    await index.primePhysicalSearchCatalog();
    assert(checkpoints > 0, "The source event overlaps the actual yielded catalog traversal");
    assert.equal(inventories, 1, "Availability needs no retry or second inventory");
    assert(index.physicalSearchEntries.size >= f.files.size);
    assert(index.search("Race-299", 10, "vault").some(page => page.path === "Notes/Race-299.md"));
    assert(marks.includes("host-search-ready"));
    const published = index.physicalSearchEntries; checkpoints = 0;
    const strict = await index.preparePhysicalSearchCatalog(new Map(f.files), () => true);
    assert.equal(strict, false, "Existing restore callers still reject a changed source revision");
    assert.equal(index.physicalSearchEntries, published, "Failed restore preparation cannot replace the available catalog");
  } finally {
    index.destroy(); f.preview.dispose(); globalThis.window = originalWindow;
    if (clockDescriptor) Object.defineProperty(globalThis, "performance", clockDescriptor); else delete globalThis.performance;
  }
});

/** Real event owners win over entries already visited by a yielding startup availability traversal. */
test("startup availability retains native file/folder events and late metadata tags across yielded inventory", async () => {
  const f = fixture(), originalWindow = globalThis.window, clockDescriptor = Object.getOwnPropertyDescriptor(globalThis, "performance");
  let now = 0, revision = 0, checkpoints = 0, inventories = 0;
  const clock = { now: () => now += 8 };
  Object.defineProperty(globalThis, "performance", { configurable: true, value: clock });
  globalThis.window = { performance: clock, setTimeout, clearTimeout, setInterval, clearInterval };
  const parent = f.files.get(f.centerPath).parent, folders = new Map([[parent.path, parent]]);
  for (let n = 0; n < 300; n++) { const file = new TFile(`Notes/Race-${n}.md`, parent); f.files.set(file.path, file); f.cache.set(file.path, { frontmatter: {}, tags: [] }); }
  for (let n = 0; n < 270; n++) { const folder = new TFolder(`Notes/Empty-${n}`, parent); folders.set(folder.path, folder); }
  Object.assign(f.app.vault, { getName: () => "prime-native-race", getAllLoadedFiles: () => { inventories++; return [...f.files.values(), ...folders.values()]; },
    getFolderByPath: path => folders.get(path) ?? null });
  f.app.saveLocalStorage = () => {};
  const index = new GraphIndex({ app: f.app, settings: { ...settings, lastActivePath: "", pinnedNodes: [], excludeFilepaths: [], nameFields: "aliases", renderAlias: false }, getIndexSourceRevision: () => revision }, f.app);
  let replacementFile, replacementFolder;
  index.workScheduler.checkpoint = async () => {
    if (++checkpoints !== 2) return;
    revision++;
    const deleted = f.files.get("Notes/Parent.md"); f.files.delete(deleted.path); index.updateHostFileAvailability(deleted.path);
    const moved = f.files.get("Notes/Child.md"), old = moved.path; f.files.delete(old); moved.path = "Notes/Renamed.md"; moved.name = "Renamed.md"; moved.basename = "Renamed";
    f.files.set(moved.path, moved); f.cache.set(moved.path, f.cache.get(old)); index.updateHostFileAvailability(old, moved);
    replacementFile = new TFile("Notes/Ordinary.md", parent); f.files.set(replacementFile.path, replacementFile); index.updateHostFileAvailability(replacementFile.path, replacementFile);
    folders.delete("Notes/Empty-0"); await index.updateHostFolderAvailability("Notes/Empty-0");
    const movedFolder = folders.get("Notes/Empty-1"); folders.delete(movedFolder.path); movedFolder.path = "Notes/Renamed-folder"; movedFolder.name = "Renamed-folder";
    folders.set(movedFolder.path, movedFolder); await index.updateHostFolderAvailability("Notes/Empty-1", movedFolder);
    replacementFolder = new TFolder("Notes/Empty-2", parent); folders.set(replacementFolder.path, replacementFolder); await index.updateHostFolderAvailability(replacementFolder.path, replacementFolder);
    const fresh = new TFile("Notes/Late.md", parent); f.files.set(fresh.path, fresh); f.cache.set(fresh.path, { frontmatter: {}, tags: [{ tag: "#Late/Fresh" }] });
    index.updateHostFileAvailability(fresh.path, fresh);
  };
  try {
    await index.primePhysicalSearchCatalog();
    assert(checkpoints >= 2); assert.equal(inventories, 1);
    for (const path of ["Notes/Parent.md", "Notes/Child.md", "folder:Notes/Empty-0", "folder:Notes/Empty-1"]) {
      assert.equal(index.getVaultSearchPage(path), undefined, `Stale pre-yield endpoint survived: ${path}`);
      assert.equal(index.search(path.replace(/^folder:/, ""), 100, "vault").some(page => page.path === path), false);
    }
    assert.equal(index.getVaultSearchPage("Notes/Ordinary.md").file, replacementFile);
    assert.equal(index.hostFolderSearchIdentities.get(index.getVaultSearchPage("folder:Notes/Empty-2")), replacementFolder);
    assert(index.search("Renamed-folder", 20, "vault").some(page => page.path === "folder:Notes/Renamed-folder"));
    assert(index.search("Renamed", 20, "vault").some(page => page.path === "Notes/Renamed.md"));
    assert(index.search("#Fresh", 20, "vault").some(page => page.path === "tag:Late/Fresh"));
    assert(index.getVaultSearchPage("Notes/Late.md"));
    index.retireCoveredPhysicalSearchEntries();
    assert(index.getVaultSearchPage("Notes/Late.md"), "An older canonical publication cannot retire a newer native file");
    assert(index.getVaultSearchPage("folder:Notes/Renamed-folder"), "An older canonical publication cannot retire a newer native folder");
    assert.equal(index.hostFolderSearchIdentities.get(index.getVaultSearchPage("folder:Notes/Empty-2")), replacementFolder);
  } finally {
    index.destroy(); f.preview.dispose(); globalThis.window = originalWindow;
    if (clockDescriptor) Object.defineProperty(globalThis, "performance", clockDescriptor); else delete globalThis.performance;
  }
});

/** Early Find and tag navigation use only already-loaded host metadata while semantic startup is held. */
test("early host Find discovers tags and empty folders, and selected tag children update without semantic indexing", async () => {
  const f = fixture(), originalWindow = globalThis.window;
  globalThis.window = { performance, setTimeout, clearTimeout, setInterval, clearInterval };
  for (const cache of f.cache.values()) { cache.frontmatter = {}; cache.tags = []; }
  f.app.metadataCache.resolvedLinks = {}; f.app.metadataCache.unresolvedLinks = {};
  const person = "tag:Research/Person", muller = person + "/Müller", child = person + "/New child";
  f.cache.get("Notes/Center.md").tags = [{ tag: "#Research/Person" }];
  f.cache.get("Notes/Child.md").tags = [{ tag: "#Research/Person/Müller/Deep" }];
  f.cache.get("Notes/Ordinary.md").frontmatter.tags = ["Research/Person/Müller/Deep"];
  const empty = new TFolder("Notes/Empty", f.files.get("Notes/Center.md").parent);
  const getFolder = f.app.vault.getFolderByPath;
  f.app.vault.getFolderByPath = path => path === empty.path ? empty : getFolder(path);
  let inventoryCalls = 0, metadataCalls = 0;
  const readCache = f.app.metadataCache.getFileCache;
  f.app.metadataCache.getFileCache = file => { metadataCalls++; return readCache(file); };
  Object.assign(f.app.vault, { getName: () => "early-tags", getAllLoadedFiles: () => { inventoryCalls++; return [...f.files.values(), empty]; },
    getFiles: () => { throw Error("Second inventory forbidden"); }, getMarkdownFiles: () => { throw Error("Second inventory forbidden"); } });
  const settingsForIndex = { ...settings, indexingMode: "on-demand", pinnedNodes: [], lastActivePath: person,
    nameFields: "aliases", renderAlias: false, nodeTitleScript: "", nodeSortOrder: "name-asc", excludeFilepaths: [],
    showTagNodes: false, showFolderNodes: false, showPageNodes: true, showVirtualNodes: true, showAttachments: true,
    showURLNodes: true, showInferredNodes: true, renderSiblings: false, maxItemCount: 100 };
  f.app.saveLocalStorage = () => {};
  const index = new GraphIndex({ app: f.app, settings: settingsForIndex, getIndexSourceRevision: () => 0 }, f.app);
  const forbidden = () => { throw Error("Early tag navigation acquired source/body/index work"); };
  index.metadataParser.parse = index.sourceAcquisition.acquire = index.sourceAcquisition.flush = index.rebuild = index.rebuildProgressively = forbidden;
  index.indexedDb.open = forbidden;
  try {
    await index.primePhysicalSearchCatalog();
    assert.equal(inventoryCalls, 1); assert.equal(metadataCalls, f.files.size, "Only the existing physical traversal inspects each Markdown cache once");
    const before = index.getSourceAcquisitionCounters(), semantic = index.getSemanticPreparationDiagnostics();
    metadataCalls = 0;
    assert.equal(index.onDemandBaselineReady, false); assert.equal(index.state.pages.size, 0);
    assert.deepEqual(index.search("#Müller", 10, "vault").map(page => page.path), [muller, muller + "/Deep"]);
    assert(index.search("Empty", 10, "vault").some(page => page.path === "folder:Notes/Empty"));
    assert.equal(index.getVaultSearchPage(person).isTag, true);
    assert.equal(index.getVaultSearchPage("folder:Notes/Empty").isFolder, true);
    for (const query of ["#", "#R", "#Re", "#Res", "#Research", "#Research/Person", "#Müller"]) index.search(query, 10, "vault");
    assert.equal(metadataCalls, 0, "Typing never rescans metadata or the Vault");
    await index.publishHostMetadataPreview(person);
    assert.deepEqual(index.getNeighborhood(person).children.map(item => item.page.path).sort(), ["Notes/Center.md", muller].sort());
    assert.equal(index.getNeighborhood(person).parents[0].page.path, "tag:Research");
    assert(index.evidenceBetween(person, muller).some(item => item.sourceKind === "tag-tree"));
    assert.equal(index.isSemanticWriteReady(person, muller), false);
    // Source updates affect only this file's lookup; no full graph or index needs to complete.
    f.cache.get("Notes/Parent.md").tags = [{ tag: "#Research/Person/New child" }];
    index.refreshVisibleHostMetadataPreviews("Notes/Parent.md");
    await index.publishHostMetadataPreview(person);
    assert(index.getNeighborhood(person).children.some(item => item.page.path === child));
    assert(index.search("#New child", 10, "vault").some(page => page.path === child));
    f.cache.get("Notes/Child.md").tags = [];
    index.refreshVisibleHostMetadataPreviews("Notes/Child.md"); await index.publishHostMetadataPreview(person);
    assert(index.getNeighborhood(person).children.some(item => item.page.path === muller), "Shared ancestry survives one member removal");
    f.cache.get("Notes/Ordinary.md").frontmatter.tags = [];
    index.refreshVisibleHostMetadataPreviews("Notes/Ordinary.md"); await index.publishHostMetadataPreview(person);
    assert.equal(index.getNeighborhood(person).children.some(item => item.page.path === muller), false);
    assert.equal(index.search("#Müller", 10, "vault").length, 0);
    assert.equal(index.get(muller), undefined);
    assert.equal(inventoryCalls, 1); assert.deepEqual(index.getSourceAcquisitionCounters(), before);
    assert.deepEqual(index.getSemanticPreparationDiagnostics(), semantic);

    // The provisional cover cap must never replace completed canonical counts on later navigation.
    settingsForIndex.maxItemCount = 2;
    for (const [path, cache] of f.cache) if (path !== "Notes/Center.md") {
      cache.tags = [{ tag: "#Research/Person/" + f.files.get(path).basename }]; cache.frontmatter.tags = [];
      index.refreshVisibleHostMetadataPreviews(path);
    }
    await index.publishHostMetadataPreview(person);
    assert(index.gateStats(index.get(person)).bottom.visibleCount < f.files.size, "The initial private tag cover is deliberately capped");
    f.app.vault.getFiles = f.app.vault.getMarkdownFiles = () => [...f.files.values()];
    const builder = new GraphBuilder(index.plugin, f.app, index.fieldCache, index.metadataParser, index.indexedDb, () => true);
    const complete = await builder.buildStructuralBaseline(); assert(complete);
    index.publishRestoredState(complete);
    assert.equal(index.hostPreviewScopes.size, 0, "The existing canonical publication retires the temporary tag cover");
    await index.publishHostMetadataPreview(person);
    assert.equal(index.hostPreviewScopes.size, 0, "Opening an already-complete tag cannot reinstate a capped preview");
    assert.equal(index.get(person), complete.pages.get(person));
    assert.equal(index.gateStats(index.get(person)).bottom.visibleCount, f.files.size, "Complete canonical membership counts remain larger than the view limit");
  } finally { index.destroy(); f.preview.dispose(); globalThis.window = originalWindow; }
});

/** Reproduce a narrower real tag-center cover without acquiring any descendant note bodies. */
test("On-demand tag reads retain canonical hierarchy across narrow host covers and normal shared-tag edits", async () => {
  const f = fixture(), originalWindow = globalThis.window;
  globalThis.window = { performance, setTimeout, clearTimeout, setInterval, clearInterval };
  for (const cache of f.cache.values()) { cache.frontmatter = {}; cache.tags = []; }
  f.app.metadataCache.resolvedLinks = {}; f.app.metadataCache.unresolvedLinks = {};
  const person = "tag:Research/Person", leaf = `${person}/Müller`, research = "tag:Research";
  f.cache.get("Notes/Center.md").tags = [{ tag: "#Research/Person" }];
  f.cache.get("Notes/Child.md").tags = [{ tag: "#Research/Person/Müller" }];
  f.cache.get("Notes/Ordinary.md").tags = [{ tag: "#Research/Person/Müller" }];
  Object.assign(f.app.vault, { getName: () => "tag-navigation-scope", getFiles: () => [...f.files.values()], getMarkdownFiles: () => [...f.files.values()] });
  f.app.saveLocalStorage = () => {};
  const indexSettings = { ...settings, indexingMode: "on-demand", pinnedNodes: [], lastActivePath: person,
    excludeFilepaths: [], nameFields: "aliases", renderAlias: false, nodeTitleScript: "", nodeSortOrder: "name-asc",
    showInferredNodes: true, showVirtualNodes: true, showAttachments: true, showFolderNodes: false,
    showTagNodes: false, showPageNodes: true, showURLNodes: true, maxItemCount: 100, renderSiblings: false,
    thumbnailProperty: "thumbnail", nodeImageProperty: "node-image" };
  let sourceRevision = 0;
  const plugin = { app: f.app, settings: indexSettings, getIndexSourceRevision: () => sourceRevision };
  const index = new GraphIndex(plugin, f.app);
  const builder = new GraphBuilder(plugin, f.app, index.fieldCache, index.metadataParser, index.indexedDb,
    /** The fixture's actual per-file publication controls source revisions explicitly. */ () => true, index.semanticFingerprints);
  try {
    const baseline = await builder.buildStructuralBaseline();
    assert(baseline); index.state = baseline; index.onDemandBaselineReady = true; index.onDemandPartialState = true;
    const canonical = baseline.pages.get(person);
    assert(canonical.neighbours.has(leaf), "The actual structural producer already indexed the child-tag edge");
    await index.publishOnDemandHostScope(person, /** Keep the finite prepared owner current. */ () => true);
    const narrowState = index.onDemandHostScopes.get(person), narrow = narrowState.pages.get(person);
    assert(narrow.neighbours.has("Notes/Center.md"));
    assert.equal(narrow.neighbours.has(leaf), false, "The real direct-note host cover omits the descendant-owned child tag");
    const forbidden = /** Selecting existing indexed structure cannot begin source/storage/index work. */ () => { throw Error("Unexpected tag navigation source or index work"); };
    f.app.vault.read = f.app.vault.cachedRead = f.app.vault.getFiles = f.app.vault.getMarkdownFiles = forbidden;
    index.metadataParser.parse = index.sourceAcquisition.acquire = index.rebuild = index.rebuildProgressively = forbidden;
    index.indexedDb.open = index.sourceAcquisition.flush = forbidden;
    const counters = index.getSourceAcquisitionCounters(), semantic = index.getSemanticPreparationDiagnostics();
    assert.equal(index.get(person), canonical, "The narrower local cover cannot replace existing structural tag incidence");
    const neighborhood = index.getNeighborhood(person);
    assert.deepEqual(neighborhood.parents.map(item => item.page.path), [research]);
    assert.deepEqual(neighborhood.children.map(item => item.page.path).sort(), ["Notes/Center.md", leaf].sort());
    assert.equal(index.getNeighborhood(leaf).parents[0].page.path, person);
    assert(index.getNeighborhood(research).children.some(item => item.page.path === person));
    assert.equal(narrowState.evidence.between(person, leaf).length, 0, "The narrower cover lacks this actual structural proof too");
    assert(index.evidenceBetween(person, leaf).some(item => item.sourceKind === "tag-tree"), "Hierarchy evidence follows the selected canonical tag");
    assert(index.evidenceBetween(person, "Notes/Center.md").some(item => item.sourceKind === "tag-tree"), "Direct-member evidence remains available");
    assert.equal(index.isSemanticWriteReady(person, leaf), false, "Structural navigation does not grant semantic write authority");
    assert.deepEqual(index.getSourceAcquisitionCounters(), counters); assert.deepEqual(index.getSemanticPreparationDiagnostics(), semantic);

    // Existing current semantic owners and current suppression still precede this local baseline.
    const coherent = { ...canonical, name: "Current semantic owner", neighbours: new Map() };
    const scope = { centerPath: person, policyRevision: index.semanticPolicyRevision,
      maintenanceRevision: index.sourceAcquisition.getMaintenanceRevision(), sourceRevision,
      completePaths: new Set([person]), pagesByPath: new Map([[person, coherent]]), suppressedPaths: new Set(), settings: index.fullSemanticSettings,
      evidence: narrowState.evidence };
    index.semanticScopes.set(person, scope); assert.equal(index.get(person), coherent); index.semanticScopes.clear();
    index.semanticScopes.set(person, { ...scope, pagesByPath: new Map(), suppressedPaths: new Set([person]) });
    assert.equal(index.get(person), undefined);
    assert.equal(index.evidenceBetween(person, leaf).length, 0, "Current complete suppression keeps its negative pair evidence");
    index.semanticScopes.clear();
    assert.equal(index.get(person), canonical);

    // A current owner of the opposite endpoint still certifies the exact pair over the baseline.
    index.semanticScopes.set(leaf, { ...scope, centerPath: leaf, completePaths: new Set([leaf]),
      pagesByPath: new Map([[leaf, { ...baseline.pages.get(leaf), neighbours: new Map() }]]) });
    assert.equal(index.get(person), canonical);
    assert.equal(index.evidenceBetween(person, leaf).length, 0, "Current prepared endpoint incidence keeps precedence");
    index.semanticScopes.clear();
    const pairKey = JSON.stringify([person, leaf].sort());
    index.relationshipPairs.set(pairKey, { evidence: narrowState.evidence, settings: index.fullSemanticSettings });
    assert.equal(index.evidenceBetween(person, leaf).length, 0, "Exact pair publication keeps precedence");
    index.relationshipPairs.clear();
    index.retainedLocalScopes.set(person, { state: narrowState, sourceRevision, policyRevision: index.semanticPolicyRevision });
    assert.equal(index.retainedLocalScopeFor(person), narrowState, "Exercise the actual still-current retained certificate");
    assert.equal(index.evidenceBetween(person, leaf).length, 0, "Retained coherent local publication keeps precedence");
    index.retainedLocalScopes.clear();
    assert(index.evidenceBetween(person, leaf).some(item => item.sourceKind === "tag-tree"));

    /** Use the real patch preparer and GraphIndex atomic publisher with an already parsed unchanged body. */
    const removeMembership = async path => {
      const file = f.files.get(path); f.cache.get(path).tags = []; file.stat.mtime++; sourceRevision++;
      index.fieldCache.set(path, { mtime: file.stat.mtime, body: { inlineFields: {}, inlineFieldOccurrences: [], urls: [] } });
      const result = await builder.patchMarkdownFiles(index.state, [file], { publishFileCommit: index.publishIncrementalFile });
      assert.equal(result.ok, true); assert.equal(result.cancelled, false);
    };
    await removeMembership("Notes/Child.md");
    assert(index.state.pages.has(leaf), "One remaining tagged note retains the shared tag");
    assert(index.getNeighborhood(person).children.some(item => item.page.path === leaf));
    assert(index.evidenceBetween(person, leaf).some(item => item.sourceKind === "tag-tree"), "Shared tag hierarchy retains its proof");
    await removeMembership("Notes/Ordinary.md");
    assert.equal(index.state.pages.has(leaf), false, "Removing the final member retires the canonical leaf tag");
    assert.equal(index.getNeighborhood(person).children.some(item => item.page.path === leaf), false);
    assert.equal(index.evidenceBetween(person, leaf).length, 0, "Retired tag hierarchy leaves no stale proof");
    assert(index.getNeighborhood(person).children.some(item => item.page.path === "Notes/Center.md"), "Unchanged direct membership remains");
    assert(index.evidenceBetween(person, "Notes/Center.md").some(item => item.sourceKind === "tag-tree"), "Unchanged direct-member proof remains");
  } finally { index.destroy(); f.preview.dispose(); globalThis.window = originalWindow; }
});

test("root and nested native folder previews expose direct canonical membership without metadata or recursive traversal", async () => {
  for (const policy of [{}, { inverseInfer: true }, { inferAllLinksAsFriends: true }]) {
    const f = folderFixture({ settings: policy });
    const child = f.addFolder("Notes/Nested");
    f.addFile("Notes/Note.md"); f.addFile("Notes/Image.png");
    Object.defineProperty(child, "children", { get() { throw new Error("recursive folder traversal forbidden"); } });
    try {
      const result = await f.preview.build("folder:Notes");
      assert(result); assert.equal(result.incomplete, true);
      const center = result.state.pages.get("folder:Notes");
      assert.equal(center.neighbours.get("folder:/").isParent, true);
      for (const path of ["folder:Notes/Nested", "Notes/Note.md", "Notes/Image.png"]) {
        assert.equal(classifyRelation(center.neighbours.get(path), "child", !!policy.inferAllLinksAsFriends), 1);
      }
      assert.deepEqual(result.structuralGates.get("folder:Notes"), {
        top: { hasAny: true, visibleCount: 1 }, bottom: { hasAny: true, visibleCount: 3 } });
      assert.equal(result.structuralGates.get("folder:Notes").left, undefined, "direct membership does not certify unrelated incidence");
      const root = await f.preview.build("folder:/");
      assert(root); assert.deepEqual([...root.visiblePaths], ["folder:/", "folder:Notes"]);
      assert.deepEqual(root.structuralGates.get("folder:/"), {
        top: { hasAny: false, visibleCount: 0 }, bottom: { hasAny: true, visibleCount: 1 } });
      assert.equal(f.preview.initialized, false, "folder navigation must not initialize the global backlink map");
    } finally { f.preview.dispose(); }
  }
});

test("empty folder membership proves zeros without claiming complete semantic incidence", async () => {
  const f = folderFixture();
  try {
    const result = await f.preview.build("folder:Notes");
    assert(result); assert.equal(result.incomplete, true);
    assert.deepEqual(result.structuralGates.get("folder:Notes"), {
      top: { hasAny: true, visibleCount: 1 }, bottom: { hasAny: false, visibleCount: 0 } });
    assert.equal(result.state.pages.size, 2);
    assert.equal(await f.preview.build("folder:Missing"), null);
    assert.equal(await f.preview.folderGates("Notes/NotAFolder.md"), null);
  } finally { f.preview.dispose(); }
});

test("unrelated host metadata during folder chunks cannot cancel native membership counts", async () => {
  let f, observations = 0;
  f = folderFixture({ hostMetadata: { resolvedLinks: {} }, onYield: () => {
    observations++; f.preview.refreshSource("Unrelated.md");
  } });
  for (let index = 0; index < 130; index++) f.addFile(`Notes/Note-${index}.md`);
  try {
    const result = await f.preview.build("folder:Notes");
    assert(result); assert(observations > 0, "actual host observations overlap cooperative counting");
    assert.equal(result.structuralGates.get("folder:Notes").bottom.visibleCount, 130);
  } finally { f.preview.dispose(); }
});

test("dense local folder counts are exact before top-N while only finite visible endpoints survive", async () => {
  const f = folderFixture({ settings: { maxItemCount: 3, showAttachments: false,
    excludeFilepaths: ["Notes/Excluded", "folder:Notes/Hidden"] } });
  for (let index = 0; index < 513; index++) f.addFile(`Notes/Note-${index}.md`);
  f.addFile("Notes/Image.png"); f.addFile("Notes/Excluded.md");
  const hidden = f.addFolder("Notes/Hidden"), nested = f.addFolder("Notes/Visible");
  Object.defineProperty(hidden, "children", { get() { throw new Error("hidden descendants forbidden"); } });
  Object.defineProperty(nested, "children", { get() { throw new Error("visible descendants forbidden"); } });
  try {
    const result = await f.preview.build("folder:Notes");
    assert(result); assert.equal(result.state.pages.size, 5, "three visible children plus center and parent");
    assert.equal(result.structuralGates.get("folder:Notes").bottom.visibleCount, 514);
    assert.equal(result.structuralGates.get("folder:Notes").bottom.hasAny, true);
    assert(f.yields() > 0, "dense canonical counting cooperates with the injected work-time budget");
    const originalBind = f.preview.bind.bind(f.preview);
    f.preview.bind = compiled => {
      assert.equal(compiled.nodes.size, 2, "count-only endpoint reads retain center/parent, never their child graph");
      return originalBind(compiled);
    };
    const gates = await f.preview.folderGates("folder:Notes");
    assert.deepEqual(gates, result.structuralGates.get("folder:Notes"), "count-only endpoint reads use the same canonical visibility policy");
  } finally { f.preview.dispose(); }
});

test("physical root spelling and the configured maximum cover retain canonical folder identity", async () => {
  const f = folderFixture({ settings: { maxItemCount: 10_000 } });
  f.root.path = "";
  for (let index = 0; index < 350; index++) f.addFile(`Notes/Note-${index}.md`);
  try {
    const root = await f.preview.build("folder:/");
    assert(root); assert.equal(root.state.pages.get("folder:/").name, "/");
    const nested = await f.preview.build("folder:Notes");
    assert(nested); assert.equal(nested.state.pages.size, 302, "only the supported 300-child maximum cover survives");
    assert.equal(nested.structuralGates.get("folder:Notes").bottom.visibleCount, 350, "count proof is independent of graph cover cap");
  } finally { f.preview.dispose(); }
});

test("folder counts use canonical visibility while structural fill survives hidden types", async () => {
  const f = folderFixture({ settings: { showFolderNodes: false, showPageNodes: false, showAttachments: false } });
  f.addFolder("Notes/Nested"); f.addFile("Notes/Note.md"); f.addFile("Notes/Image.png");
  try {
    const result = await f.preview.build("folder:Notes");
    assert(result); assert.equal(result.state.pages.size, 2);
    assert.deepEqual(result.structuralGates.get("folder:Notes"), {
      top: { hasAny: true, visibleCount: 0 }, bottom: { hasAny: true, visibleCount: 0 } });
  } finally { f.preview.dispose(); }
});

test("membership, exact native identity, policy and lifecycle changes reject private folder results across yields", async () => {
  const mutations = {
    insertion: f => f.addFile("Notes/Late.md"),
    deletion: f => { f.files.delete("Notes/Note-0.md"); f.folder.children.shift(); },
    replacement: f => {
      const old = f.folder.children[0], fresh = new TFile(old.path, f.folder);
      f.folder.children.pop(); f.folder.children[0] = fresh; f.files.set(old.path, fresh);
    },
    reorder: f => { [f.folder.children[0], f.folder.children[1]] = [f.folder.children[1], f.folder.children[0]]; },
    rename: f => { const child = f.folder.children[0]; f.files.delete(child.path); child.path = "Notes/Renamed.md"; f.files.set(child.path, child); },
    dirtyFile: f => { f.folder.children[0].stat.mtime++; },
    folderRename: f => { f.folder.path = "Moved"; },
    folderReplacement: f => { f.folders.set("Notes", new TFolder("Notes", f.root)); },
    folderDeletion: f => { f.folders.delete("Notes"); },
    parentReplacement: f => { f.app.vault.getRoot = () => new TFolder("/"); },
    visibility: f => f.setSettings({ ...f.settings(), showAttachments: false }),
    prefixMutation: f => { f.settings().excludeFilepaths.push("Notes/"); },
    semantic: f => f.setSettings({ ...f.settings(), inverseInfer: true }),
    cover: f => f.setSettings({ ...f.settings(), maxItemCount: 20 }),
    unload: f => f.preview.dispose(),
  };
  for (const [name, mutation] of Object.entries(mutations)) {
    let mutated = false, f;
    f = folderFixture({ onYield: () => { if (!mutated) { mutated = true; mutation(f); } } });
    for (let index = 0; index < 130; index++) f.addFile(`Notes/Note-${index}.md`);
    try {
      assert.equal(await f.preview.build("folder:Notes"), null, `${name} cannot publish mixed native membership`);
      assert(mutated, `${name} exercises an awaited boundary`);
    } finally { f.preview.dispose(); }
  }
  let current = true;
  const f = folderFixture({ isCurrent: () => current, onYield: () => { current = false; } });
  f.addFile("Notes/Note.md");
  try { assert.equal(await f.preview.build("folder:Notes"), null, "request cancellation retires pending folder compilation"); }
  finally { f.preview.dispose(); }
});

test("folder counts never certify duplicate or stale native membership identities", async () => {
  for (const corrupt of [
    f => f.folder.children.push(f.folder.children[0]),
    f => { f.addFile("Notes/Note.md"); },
    f => { f.files.delete("Notes/Note.md"); },
    f => { f.folder.children[0].parent = f.root; },
  ]) {
    const f = folderFixture(); f.addFile("Notes/Note.md"); corrupt(f);
    try { assert.equal(await f.preview.build("folder:Notes"), null); }
    finally { f.preview.dispose(); }
  }
});

test("bounded metadata impacts include fresh ontology, cache links, unresolved destinations and tag ancestors", () => {
  const f = fixture({ settings: { ...settings, hierarchy: { ...settings.hierarchy, leftFriends: ["Left Friend"] } } });
  const parent = f.files.get(f.centerPath).parent;
  for (const path of ["Notes/Fresh.md", "Notes/FromCache.md", "Notes/Image.png"]) f.files.set(path, new TFile(path, parent));
  const cache = f.cache.get(f.centerPath);
  cache.frontmatter = { PARENT: "[[Fresh]]", "Left Friend": ["[[Missing#Heading|Alias]]", "https://example.com/new"],
    ignored: "[[NotOntology]]" };
  cache.tags = [{ tag: "#project/new/child" }];
  cache.links = [{ link: "FromCache#Heading" }];
  cache.embeds = [{ link: "Image.png" }];
  cache.frontmatterLinks = [{ link: "PropertyTarget#Heading" }];
  try {
    const targets = f.preview.metadataImpactTargets(f.centerPath);
    assert(targets);
    for (const path of ["Notes/Fresh.md", "Notes/FromCache.md", "Notes/Image.png", "Missing", "PropertyTarget",
      "https://example.com/new", "tag:project", "tag:project/new", "tag:project/new/child", "Notes/Ordinary.md"]) {
      assert(targets.has(path), `new impact includes ${path}`);
    }
    assert.equal(targets.has("NotOntology"), false, "unconfigured frontmatter does not become ontology");
    assert.equal(f.preview.initialized, false, "impact lookup does not scan or mutate reverse links");
    assert.equal(f.preview.outgoing.size, 0);
  } finally { f.preview.dispose(); }
});

test("absent, cyclic, dense or oversized metadata impacts conservatively reject the whole observation", () => {
  const corruptions = [
    f => f.cache.delete(f.centerPath),
    f => { f.cache.get(f.centerPath).frontmatter.Parent = "x".repeat(100_000); },
    f => { const array = []; array.push(array); f.cache.get(f.centerPath).frontmatter.Parent = array; },
    f => { f.cache.get(f.centerPath).links = Array.from({ length: 257 }, (_, index) => ({ link: `Link${index}` })); },
    f => { f.cache.get(f.centerPath).tags = [{ tag: "#" + Array.from({ length: 300 }, () => "x").join("/") }]; },
    f => { f.app.metadataCache.resolvedLinks[f.centerPath] = Object.fromEntries(Array.from({ length: 257 }, (_, index) => [`Dense${index}`, 1])); },
  ];
  for (const corrupt of corruptions) {
    const f = fixture(); corrupt(f);
    try { assert.equal(f.preview.metadataImpactTargets(f.centerPath), null); }
    finally { f.preview.dispose(); }
  }
});

test("host first-order preview preserves canonical ontology roles, hidden, backlinks, folder and nested tags", async () => {
  const f = fixture();
  const result = await f.preview.build(f.centerPath);
  assert(result);
  assert.equal(result.incomplete, true);
  const center = result.state.pages.get(f.centerPath);
  for (const [name, flag] of [["Parent", "isParent"], ["Child", "isChild"], ["Left", "isLeftFriend"], ["Right", "isRightFriend"], ["Previous", "isPreviousFriend"], ["Next", "isNextFriend"], ["Hidden", "isHidden"]]) {
    assert.equal(center.neighbours.get(`Notes/${name}.md`)?.[flag], true, `${name} preserves canonical role`);
  }
  assert.equal(classifyRelation(center.neighbours.get("Notes/Parent.md"), "child", false), null, "frontmatter Parent suppresses inferred link Child presentation");
  assert.equal(classifyRelation(center.neighbours.get("Notes/Parent.md"), "parent", false), 1);
  assert.equal(center.neighbours.get("Notes/Ordinary.md").isChild, true);
  assert.equal(center.neighbours.get("Notes/Backlink.md").isParent, true);
  assert.equal(center.neighbours.get("folder:Notes").isParent, true);
  assert.equal(center.neighbours.get("tag:project/nested").isParent, true);
  assert(result.state.pages.has("tag:project"));
  assert(f.yields() > 0);
  f.preview.dispose();
});

test("navigation uses indexed backlinks and source resolve/delete deltas", async () => {
  const f = fixture();
  await f.preview.initializeBacklinks();
  // New aggregate owner appears after initialization; event delta supplies it without rescanning.
  const source = new TFile("Notes/New.md", f.files.get(f.centerPath).parent);
  f.files.set(source.path, source);
  f.cache.set(source.path, { frontmatter: { Parent: "[[Center]]" }, tags: [] });
  f.app.metadataCache.resolvedLinks[source.path] = { [f.centerPath]: 1 };
  assert(f.preview.refreshSource(source.path).has(f.centerPath), "new backlinks identify the affected center before it was a visible neighbor");
  let result = await f.preview.build(f.centerPath);
  assert.equal(classifyRelation(result.state.pages.get(f.centerPath).neighbours.get(source.path), "child", false), 1, "incoming explicit Parent produces defined Child at center");
  delete f.app.metadataCache.resolvedLinks[source.path];
  assert(f.preview.removeSource(source.path).has(f.centerPath));
  f.files.delete(source.path);
  result = await f.preview.build(f.centerPath);
  assert.equal(result.state.pages.get(f.centerPath).neighbours.has(source.path), false);
  f.preview.dispose();
});

test("dirty physical identity and unload reject pending previews", async () => {
  let stale = false;
  let f;
  f = fixture({ onYield: () => { if (stale) f.files.get(f.centerPath).stat.mtime++; } });
  await f.preview.initializeBacklinks();
  stale = true;
  assert.equal(await f.preview.build(f.centerPath), null);
  f.preview.dispose();
  assert.equal(await f.preview.build(f.centerPath), null);
});

test("dense root fanout does not scan folder siblings or materialize unrelated notes", async () => {
  const f = fixture();
  const folder = f.files.get(f.centerPath).parent;
  Object.defineProperty(folder, "children", { get() { throw new Error("root siblings forbidden"); } });
  const result = await f.preview.build(f.centerPath);
  assert(result);
  assert(result.state.pages.size < 32);
  assert(result.state.pages.has("folder:Notes"));
  f.preview.dispose();
});

test("oversized metadata omits uncertain inferred relations while retaining useful center membership", async () => {
  const f = fixture();
  f.cache.get(f.centerPath).frontmatter.Parent = "x".repeat(100_000);
  const result = await f.preview.build(f.centerPath);
  assert(result);
  const center = result.state.pages.get(f.centerPath);
  assert(center);
  assert.equal(center.neighbours.has("Notes/Ordinary.md"), false);
  assert.equal(center.neighbours.get("folder:Notes").isParent, true);
  f.preview.dispose();
});

test("oversized inline tag text and deep tag ancestry omit enrichment before structural allocation", async () => {
  for (const tag of ["#" + "x".repeat(100_000), "#" + Array.from({ length: 300 }, () => "x").join("/")]) {
    const f = fixture();
    f.cache.get(f.centerPath).tags = [{ tag }];
    const result = await f.preview.build(f.centerPath);
    assert(result);
    const center = result.state.pages.get(f.centerPath);
    assert.equal(center.neighbours.get("folder:Notes").isParent, true, "bounded physical membership remains available");
    assert.equal(center.neighbours.has("Notes/Ordinary.md"), false, "unknown explicit enrichment cannot become inferred evidence");
    assert.equal([...result.state.pages.values()].some(page => page.isTag), false, "oversized tag ancestry is never materialized");
    assert(result.state.pages.size < 32);
    f.preview.dispose();
  }
});

test("aggregate inspection is bounded even when filtered entries do not contribute preview relations", async () => {
  for (const owner of ["Notes/Center.md", "Notes/Backlink.md"]) {
    const f = fixture();
    await f.preview.initializeBacklinks();
    const targets = {};
    for (let i = 0; i < 600; i++) {
      const file = new TFile(`Notes/Dense-${i}.md`, f.files.get(f.centerPath).parent);
      f.files.set(file.path, file);
      f.cache.set(file.path, { frontmatter: {}, tags: [] });
      targets[file.path] = 1;
    }
    if (owner !== f.centerPath) targets[f.centerPath] = 1;
    let inspected = 0;
    f.app.metadataCache.resolvedLinks[owner] = new Proxy(targets, {
      getOwnPropertyDescriptor(target, key) {
        inspected++;
        assert(inspected <= (owner === f.centerPath ? 322 : 257), "irrelevant aggregate entries must stop consuming work at the preview cap");
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    const result = await f.preview.build(f.centerPath);
    assert(result, "a capped incomplete preview still publishes useful membership");
    assert.equal(result.incomplete, true);
    assert.equal(result.state.pages.get(f.centerPath).neighbours.get("folder:Notes").isParent, true);
    assert.equal(result.state.pages.get(f.centerPath).neighbours.has("Notes/Dense-599.md"), false);
    if (owner !== f.centerPath) assert.equal(result.state.pages.get(f.centerPath).neighbours.has(owner), false, "late incoming aggregate relation remains safely omitted");
    f.preview.dispose();
  }
});


test("repeated navigation does not enumerate the whole host link catalog", async () => {
  const f = fixture();
  await f.preview.initializeBacklinks();
  f.app.metadataCache.resolvedLinks = new Proxy(f.app.metadataCache.resolvedLinks, {
    ownKeys() { throw new Error("whole-vault host map enumeration forbidden on navigation"); },
  });
  assert(await f.preview.build(f.centerPath));
  assert(await f.preview.build("Notes/Ordinary.md"));
  f.preview.dispose();
});

test("ordinary link directions obey canonical inverse and friend inference policies", async () => {
  for (const [policy, role] of [[{ inverseInfer: true }, "parent"], [{ inferAllLinksAsFriends: true }, "left"]]) {
    const f = fixture({ settings: { ...settings, ...policy } });
    const result = await f.preview.build(f.centerPath);
    assert(result);
    const ordinary = result.state.pages.get(f.centerPath).neighbours.get("Notes/Ordinary.md");
    assert.notEqual(classifyRelation(ordinary, role, !!policy.inferAllLinksAsFriends), null);
    f.preview.dispose();
  }
});


/** The production folder route bypasses the backlink lane and publishes only structural numbers. */
test("GraphIndex folder navigation and neighboring folder gates remain numeric with durable work blocked", async () => {
  const f = fixture(), previousWindow = globalThis.window;
  const attachment = new TFile("Notes/Image.png", f.app.vault.getFolderByPath("Notes"));
  f.files.set(attachment.path, attachment);
  globalThis.window = { performance, performance, setTimeout, clearTimeout, setInterval, clearInterval };
  Object.assign(f.app.vault, { getName: () => "folder-preview-index", getFiles() { throw Error("inventory forbidden"); } });
  f.app.saveLocalStorage = () => {};
  const indexSettings = { ...settings, pinnedNodes: [], lastActivePath: "folder:Notes", excludeFilepaths: [],
    nameFields: "aliases", renderAlias: true, nodeTitleScript: "", nodeSortOrder: "name", showInferredNodes: true,
    showVirtualNodes: true, showAttachments: true, showFolderNodes: true, showTagNodes: true, showPageNodes: true,
    showURLNodes: true, maxItemCount: 3, renderSiblings: false, thumbnailProperty: "thumbnail", nodeImageProperty: "node-image" };
  const index = new GraphIndex({ app: f.app, settings: indexSettings, getIndexSourceRevision: () => 0 }, f.app);
  index.indexedDb.open = () => { throw Error("DB forbidden"); };
  index.sourceAcquisition.flush = () => { throw Error("broad source flush forbidden"); };
  index.hostPreview.initializeBacklinks = () => { throw Error("global backlink lane forbidden for folder"); };
  try {
    const build = index.hostPreview.build.bind(index.hostPreview);
    for (const [field, value] of [["showPageNodes", false], ["inverseInfer", true]]) {
      const original = indexSettings[field];
      index.hostPreview.build = async path => { const result = await build(path); indexSettings[field] = value; return result; };
      await index.publishHostMetadataPreview("folder:Notes");
      assert.equal(index.hostPreviewScopes.has("folder:Notes"), false, "a policy edit after adapter return cannot stamp old counts with new policy");
      indexSettings[field] = original;
    }
    index.hostPreview.build = build;
    await index.publishHostMetadataPreview("folder:Notes");
    const page = index.get("folder:Notes"), scope = index.hostPreviewScopes.get(page.path);
    assert(page?.isFolder); assert.equal(index.getNeighborhood(page.path).children.length, 3, "finite cover respects top-N");
    assert.deepEqual(index.gateStats(page).bottom, { visibleCount: f.files.size, hasAny: true, complete: true });
    assert.equal(index.gateStats(page).top.visibleCount, 1);
    assert.equal(index.gateStats(page).left.complete, false, "structural proof grants no unrelated gate authority");
    await index.prepareVisibleFolderGates(scope.pages.values(), () => index.hostPreviewScopes.get(page.path) === scope);
    const parent = index.get("folder:/");
    assert.equal(index.gateStats(parent).bottom.complete, true);
    assert.equal(index.gateStats(parent).bottom.visibleCount, 1, "parent total comes from its own direct membership");
    assert.equal(index.isSemanticWriteReady(page.path, "Notes/Center.md"), false);
    indexSettings.showPageNodes = false;
    assert.equal(index.gateStats(page).bottom.complete, false, "visibility change retires count proof");
    await index.publishHostMetadataPreview(page.path);
    assert.equal(index.gateStats(index.get(page.path)).bottom.visibleCount, 1, "only attachment survives canonical visibility");
    index.invalidateHostStructure();
    assert.equal(index.gateStats(index.get(page.path)).bottom.complete, false, "tree event retires old proof immediately");
  } finally { index.destroy(); f.preview.dispose(); globalThis.window = previousWindow; }
});

/** Exercise production search/read/publication while every durable-startup authority remains unavailable. */
test("GraphIndex host availability renders direct relations over a physical baseline with DB and sources blocked", async () => {
  const f = fixture();
  const originalWindow = globalThis.window;
  globalThis.window = { performance, performance, setTimeout, clearTimeout, setInterval, clearInterval };
  Object.assign(f.app.vault, { getName: () => "preview-test", getFiles: () => [...f.files.values()] });
  f.app.saveLocalStorage = () => {};
  const indexSettings = { ...settings, indexingMode: "eager", pinnedNodes: [], lastActivePath: f.centerPath,
    excludeFilepaths: [], nameFields: "aliases", renderAlias: true, nodeTitleScript: "", nodeSortOrder: "name",
    showInferredNodes: true, showVirtualNodes: true, showAttachments: true, showFolderNodes: true,
    showTagNodes: true, showPageNodes: true, showURLNodes: true, maxItemCount: 100, renderSiblings: false,
    thumbnailProperty: "thumbnail", nodeImageProperty: "node-image" };
  let sourceRevision = 0;
  const plugin = { app: f.app, settings: indexSettings, getIndexSourceRevision: () => sourceRevision, manifest: { dir: "" }, recordDiagnostic() {} };
  const index = new GraphIndex(plugin, f.app);
  index.indexedDb.open = () => { throw new Error("IndexedDB access forbidden for host availability"); };
  index.sourceAcquisition.flush = () => { throw new Error("durable authority flush forbidden for host availability"); };
  let presentations = 0;
  const release = index.subscribePresentation(() => { presentations++; });
  try {
    await index.primePhysicalSearchCatalog();
    assert(index.search("Center", 10, "vault-files").some(page => page.path === f.centerPath));
    const baseline = index.getVaultSearchPage(f.centerPath);
    index.state.pages.set(f.centerPath, baseline);
    index.state.lowercasePathMap.set(f.centerPath.toLowerCase(), f.centerPath);
    assert.equal(baseline.neighbours.size, 0);
    const semanticRevision = index.getSemanticRevision();
    await index.publishHostMetadataPreview(f.centerPath);
    assert(index.get(f.centerPath).neighbours.has("Notes/Parent.md"));
    const neighborhood = index.getNeighborhood(f.centerPath);
    assert(neighborhood.parents.some(item => item.page.path === "Notes/Parent.md"), "actual UI neighborhood must read the host scope rather than empty baseline");
    assert(neighborhood.children.some(item => item.page.path === "Notes/Child.md"));
    assert.equal(index.gateStats(index.get(f.centerPath)).top.complete, false, "host preview counts are explicitly partial");
    assert.equal(index.getSemanticRevision(), semanticRevision, "temporary host availability cannot claim evidence authority");
    assert(presentations >= 2, "host Find and host graph publish render notifications");
    const hostScope = index.hostPreviewScopes.get(f.centerPath);
    await index.prepareVisibleFolderGates(hostScope.pages.values(), () => index.hostPreviewScopes.get(f.centerPath) === hostScope);
    assert.equal(index.gateStats(index.get("folder:Notes")).bottom.visibleCount, f.files.size);
    const createdMember = new TFile("Notes/Created-member.md", f.app.vault.getFolderByPath("Notes"));
    f.files.set(createdMember.path, createdMember);
    index.invalidateHostStructure();
    const end = Date.now() + 1000;
    while (index.gateStats(index.get("folder:Notes")).bottom.complete !== true && Date.now() < end) {
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    assert.equal(index.gateStats(index.get("folder:Notes")).bottom.complete, true, "topology recounts folder neighbors of a Markdown center");
    assert.equal(index.gateStats(index.get("folder:Notes")).bottom.visibleCount, f.files.size, "new native child appears in the parent's complete total");
    // Canonical publication must retire the temporary owner and prevent later ordinary navigation
    // from replacing richer body/URL semantics with the incomplete MetadataCache approximation.
    const scope = index.hostPreviewScopes.get(f.centerPath);
    const canonical = { ...index.get(f.centerPath), name: "Canonical center", neighbours: new Map(index.get(f.centerPath).neighbours) };
    const canonicalState = { ...scope, pages: new Map(scope.pages), lowercasePathMap: new Map(scope.lowercasePathMap) };
    canonicalState.pages.set(f.centerPath, canonical);
    index.fullSnapshotHydrated = true;
    index.fullSnapshotFresh = true;
    index.publishRestoredState(canonicalState, { entries: [], byPath: new Map() }, false, true);
    assert(index.get(f.centerPath) === canonical);
    await index.publishHostMetadataPreview(f.centerPath);
    assert(index.get(f.centerPath) === canonical, "current authoritative canonical center must remain the read owner");
    // A previously prepared scope remains readable during repair, but must yield to fresh host
    // facts for the visible center as soon as the source revision advances.
    index.semanticScopes.set(f.centerPath, { centerPath: f.centerPath, policyRevision: index.semanticPolicyRevision,
      maintenanceRevision: index.sourceAcquisition.getMaintenanceRevision(), sourceRevision,
      completePaths: new Set([f.centerPath]), pagesByPath: canonicalState.pages, suppressedPaths: new Set(),
      settings: index.fullSemanticSettings, coverageSignature: index.semanticCoverageSignature() });
    sourceRevision++;
    f.files.get(f.centerPath).stat.mtime++;
    f.cache.get(f.centerPath).frontmatter.Parent = "[[Ordinary]]";
    assert(index.refreshVisibleHostMetadataPreviews(f.centerPath));
    await index.publishHostMetadataPreview(f.centerPath);
    assert(index.get(f.centerPath) !== canonical, "fresh visible preview outranks an older coherent semantic scope");
    assert(index.getNeighborhood(f.centerPath).parents.some(item => item.page.path === "Notes/Ordinary.md"), "visible frontmatter edit must appear before blocked canonical repair");
    // Simulate the normal canonical per-file publication after repair becomes available.
    const repaired = { ...index.get(f.centerPath), neighbours: new Map(index.get(f.centerPath).neighbours) };
    index.publishIncrementalFile({ sourcePath: f.centerPath, touchedPagePaths: new Set([f.centerPath]), semanticChanged: true }, () => {
      index.state.pages.set(f.centerPath, repaired);
    });
    assert(index.get(f.centerPath) === repaired, "canonical per-file commit retires the temporary host owner");
  } finally {
    release();
    index.destroy();
    f.preview.dispose();
    globalThis.window = originalWindow;
  }
});

/** Renames preserve coherent native reads while retiring builds; deletion retires the affected preview. */
test("host-only rename remaps neighboring previews; delete retires them and filename lookup", async () => {
  const f = fixture(), originalWindow = globalThis.window;
  globalThis.window = { performance, performance, setTimeout, clearTimeout, setInterval, clearInterval };
  Object.assign(f.app.vault, { getName: () => "preview-lifetime", getFiles: () => [...f.files.values()] });
  f.app.saveLocalStorage = () => {};
  const plugin = { app: f.app, settings: { ...settings, lastActivePath: f.centerPath, pinnedNodes: [],
    excludeFilepaths: [], nameFields: "aliases", nodeSortOrder: "name", renderAlias: true }, getIndexSourceRevision: () => 0 };
  const index = new GraphIndex(plugin, f.app);
  index.scheduleSnapshotPersist = () => {};
  index.indexedDb.open = () => { throw new Error("host event must not open IndexedDB"); };
  try {
    await index.primePhysicalSearchCatalog();
    await index.publishHostMetadataPreview(f.centerPath);
    const created = new TFile("Notes/Fresh.md", f.files.get(f.centerPath).parent);
    f.files.set(created.path, created); f.cache.set(created.path, { frontmatter: { Parent: "[[Center]]" }, tags: [] });
    f.app.metadataCache.resolvedLinks[created.path] = { [f.centerPath]: 1 };
    index.updateHostFileAvailability(created.path, created);
    assert.equal(index.state.pages.size, 0, "startup create availability cannot publish canonical evidence");
    assert(index.search("Fresh", 20, "vault-files").some(page => page.path === created.path));
    assert.equal(index.hostPreviewScopes.has(f.centerPath), false, "new incoming source retires affected center");
    await index.publishHostMetadataPreview(f.centerPath);
    assert(index.get(f.centerPath).neighbours.has(created.path));
    const oldPath = "Notes/Parent.md", file = f.files.get(oldPath), oldHit = index.getVaultSearchPage(oldPath);
    assert(index.hostPreviewScopes.has(f.centerPath));
    const priorScope = index.hostPreviewScopes.get(f.centerPath), priorPage = priorScope.pages.get(oldPath);
    const priorAliases = [...priorPage.aliases], priorRequest = index.hostPreviewRequests.get(f.centerPath);
    f.files.delete(oldPath); file.path = "Notes/Renamed.md"; file.name = "Renamed.md"; file.basename = "Renamed";
    f.files.set(file.path, file); f.cache.set(file.path, f.cache.get(oldPath));
    f.app.metadataCache.resolvedLinks[file.path] = f.app.metadataCache.resolvedLinks[oldPath] ?? {};
    delete f.app.metadataCache.resolvedLinks[oldPath];
    // A mutable TFile alone must never make an old page alias eligible before its event is handled.
    assert.equal(oldHit.file.path, file.path);
    assert.equal(index.search("Parent", 20, "vault-files").some(page => page.path === oldPath), false);
    assert.equal(index.getVaultSearchPage(oldPath), undefined);
    assert.equal(index.renameFile(oldPath, file), true, "filename-only rename is handled without full rebuild");
    const renamedScope = index.hostPreviewScopes.get(f.centerPath);
    assert.equal(renamedScope, priorScope, "retain the coherent read owner until current source repair replaces it");
    assert.equal(renamedScope.pages.has(oldPath), false, "old coordinate is retired inside the retained owner");
    assert.equal(renamedScope.pages.get(file.path), priorPage, "native page identity survives rename");
    assert.equal(priorPage.file, file); assert.equal(priorPage.path, file.path);
    assert.deepEqual(priorPage.aliases, priorAliases, "rename preserves known alias facets");
    assert.equal(index.get(f.centerPath).neighbours.has(oldPath), false);
    assert.equal([...index.get(f.centerPath).neighbours.values()].filter(relation => relation.target.file === file).length, 1);
    assert(index.hostPreviewRequests.get(f.centerPath) > priorRequest, "retire pending old-path preview build tokens");
    assert.equal(index.isSemanticWriteReady(f.centerPath, file.path), false, "retained provisional reads cannot authorize source writes");
    assert.equal(index.physicalSearchEntries.has(oldPath), false);
    assert(index.search("Renamed", 20, "vault-files").some(page => page.path === file.path));
    assert.equal(index.getVaultSearchPage(file.path).file, file);
    await index.publishHostMetadataPreview(f.centerPath);
    const neighbor = "Notes/Child.md";
    f.files.delete(neighbor);
    index.dematerializeFile(neighbor);
    assert.equal(index.hostPreviewScopes.has(f.centerPath), false, "delete retires preview containing deleted neighbor");
    assert.equal(index.getVaultSearchPage(neighbor), undefined);
    assert.equal(index.search("Child", 20, "vault-files").some(page => page.path === neighbor), false);
    await index.publishHostMetadataPreview(f.centerPath);
    assert.equal(index.get(f.centerPath).neighbours.has(neighbor), false);
  } finally { index.destroy(); f.preview.dispose(); globalThis.window = originalWindow; }
});

test("folder rename remaps filename-only descendants before canonical membership exists", async () => {
  const f = fixture(), originalWindow = globalThis.window;
  globalThis.window = { performance, performance, setTimeout, clearTimeout, setInterval, clearInterval };
  Object.assign(f.app.vault, { getName: () => "preview-folder-lifetime", getFiles: () => [...f.files.values()] });
  f.app.saveLocalStorage = () => {};
  const folder = f.files.get(f.centerPath).parent;
  f.app.vault.getFolderByPath = path => path === folder.path ? folder : null;
  const index = new GraphIndex({ app: f.app, settings: { ...settings, lastActivePath: f.centerPath,
    pinnedNodes: [], excludeFilepaths: [], nameFields: "aliases", renderAlias: true }, getIndexSourceRevision: () => 0 }, f.app);
  index.scheduleSnapshotPersist = () => {};
  try {
    await index.primePhysicalSearchCatalog();
    await index.publishHostMetadataPreview(f.centerPath);
    assert.equal(index.state.pages.size, 0);
    folder.path = "Moved"; folder.name = "Moved";
    for (const [path, file] of [...f.files]) {
      f.files.delete(path); file.path = path.replace("Notes/", "Moved/"); f.files.set(file.path, file);
      f.cache.set(file.path, f.cache.get(path));
    }
    await index.renameFolder("Notes", folder);
    assert.equal(index.getVaultSearchPage(f.centerPath), undefined);
    assert.equal(index.hostPreviewScopes.size, 0);
    const results = index.search("Center", 20, "vault-files");
    assert.deepEqual(results.map(page => page.path), ["Moved/Center.md"]);
    assert.equal([...index.physicalSearchEntries.values()].filter(entry => entry.page.file).length, f.files.size);
    assert.equal(index.search("Notes", 20, "vault").some(page => page.path === "folder:Notes"), false);
    assert(index.search("Moved", 20, "vault").some(page => page.path === "folder:Moved"));
    f.files.clear(); folder.children = [];
    await index.updateHostFolderAvailability("Moved");
    assert.equal([...index.physicalSearchEntries.values()].filter(entry => entry.page.file).length, 0, "folder-only delete removes captured filenames even when host children are gone");
    assert.equal(index.physicalSearchEntries.has("folder:Moved"), false);
    assert.equal(index.getVaultSearchPage("Moved/Center.md"), undefined);
  } finally { index.destroy(); f.preview.dispose(); globalThis.window = originalWindow; }
});

/** Lower-priority native event consumers may not start new canonical writers during an actual save. */
test("visible patch and optional saved-pair refresh wait behind an active mutation", async () => {
  const f = fixture(), originalWindow = globalThis.window;
  globalThis.window = { performance, performance, setTimeout, clearTimeout, setInterval, clearInterval };
  Object.assign(f.app.vault, { getName: () => "preview-priority", getFiles: () => [...f.files.values()] });
  f.app.saveLocalStorage = () => {};
  const index = new GraphIndex({ app: f.app, settings: { ...settings, indexingMode: "eager", lastActivePath: f.centerPath,
    pinnedNodes: [], excludeFilepaths: [], nameFields: "aliases", renderAlias: true }, getIndexSourceRevision: () => 0 }, f.app);
  let release;
  const held = new Promise(resolve => { release = resolve; });
  let patches = 0, pairs = 0;
  // This contract exercises the complete Eager direct-patch owner. Partial Eager uses the
  // requested local-demand owner, whose mutation parity is covered by on-demand-indexing tests.
  index.fullSnapshotFresh = true;
  index.state.pages.set(f.centerPath, { path: f.centerPath });
  index.patchMarkdownPaths = async () => { patches++; return { outcome: "patched", count: 1 }; };
  index.prepareRelationshipPair = async () => { pairs++; return true; };
  index.relationshipPairs.set("fixture", { paths: [f.centerPath, "Notes/Parent.md"], current: () => false });
  try {
    const mutation = index.withForegroundPriority(() => held);
    const visible = index.refreshVisibleMarkdownPath(f.centerPath);
    const refresh = index.refreshChangedRelationshipPairs(f.centerPath);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(patches, 0, "P2 cannot begin a competing file publication during P0");
    assert.equal(pairs, 0, "optional refresh cannot claim a competing pair writer during P0");
    release();
    await Promise.all([mutation, visible, refresh]);
    assert.equal(patches, 1); assert.equal(pairs, 1);
    assert.deepEqual(index.getWorkPriorityDiagnostics().active, [0, 0, 0, 0, 0]);
  } finally { release(); index.relationshipPairs.clear(); index.destroy(); f.preview.dispose(); globalThis.window = originalWindow; }
});

/** Native membership/cache stubs supply facts; GraphIndex owns real scheduling and task cleanup. */
function priorityIndexFixture(){
  const f=fixture(),previousWindow=globalThis.window;
  globalThis.window={performance,performance,setTimeout,clearTimeout,setInterval,clearInterval};
  Object.assign(f.app.vault,{getName:()=>"preview-lane-audit",getFiles:()=>[...f.files.values()]});
  f.app.saveLocalStorage=()=>{};
  const index=new GraphIndex({app:f.app,settings:{...settings,indexingMode:"eager",lastActivePath:f.centerPath,
    pinnedNodes:[],excludeFilepaths:[],nameFields:"aliases",renderAlias:true},getIndexSourceRevision:()=>0},f.app);
  return{index,close(){index.destroy();f.preview.dispose();globalThis.window=previousWindow;}};
}

test("GraphIndex broad inventory owns P4, pauses before storage behind P3 and lets a current-node request finish",async()=>{
  const f=priorityIndexFixture(),i=f.index;let reads=0;
  i.indexedDb.sources.headPage=async()=>{reads++;return{available:true,heads:[],invalid:0,next:null};};
  const releaseUrl=i.workScheduler.begin(3);const broad=i.startPersistedSourceInventory();
  try{
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(reads,0);assert.deepEqual(i.getWorkPriorityDiagnostics().active,[0,0,0,1,1]);
    const foreground=await i.withForegroundPriority(()=>i.prepareSearchIndex({pages:new Map()},()=>true,
      undefined,undefined,undefined,undefined,false,1),1);
    assert.deepEqual(foreground,{entries:[],byPath:new Map()});assert.equal(reads,0);
    releaseUrl();assert.equal(await broad,false);assert.equal(reads,1);
    assert.deepEqual(i.getWorkPriorityDiagnostics().active,[0,0,0,0,0]);
  }finally{releaseUrl();f.close();}
});

test("caller-specific semantic runtimes preempt lower work without exact mutation self-deadlock",async()=>{
  const f=priorityIndexFixture(),i=f.index;let releaseMutation;
  const hold=new Promise(resolve=>{releaseMutation=resolve;});
  try{
    let currentFinished=false;
    const mutation=i.withForegroundPriority(()=>hold,0);
    const requested=i.withForegroundPriority(async()=>{await i.semanticPreparationRuntime(()=>true,1).yield();currentFinished=true;},1);
    await new Promise(resolve=>setImmediate(resolve));assert.equal(currentFinished,false);
    await i.withForegroundPriority(()=>i.semanticPreparationRuntime(()=>true,0).yield(),0);
    assert.equal(currentFinished,false,"P0 does not borrow the waiting P1 runtime checkpoint");
    releaseMutation();await Promise.all([mutation,requested]);assert.equal(currentFinished,true);
    assert.deepEqual(i.getWorkPriorityDiagnostics().active,[0,0,0,0,0]);
  }finally{releaseMutation?.();f.close();}
});

for(const operation of ["build","folderGates"]){
  test(`visible folder ${operation} carries its caller checkpoint through canonical compiler slices`,{timeout:3000},async()=>{
    const f=folderFixture(),owner=priorityIndexFixture(),i=owner.index;
    for(let n=0;n<130;n++)f.addFile(`Notes/Child-${n}.md`);
    const release=i.workScheduler.begin(1);let entered,settled=false;
    const boundary=new Promise(resolve=>{entered=resolve;});
    const checkpoint=()=>{entered();return i.workScheduler.checkpoint(2);};
    const task=i.withForegroundPriority(()=>operation==="build"
      ?f.preview.build("folder:Notes",{checkpoint}):f.preview.folderGates("folder:Notes",checkpoint),2)
      .finally(()=>{settled=true;});
    try{
      await boundary;assert.equal(settled,false);
      assert.equal(i.getWorkPriorityDiagnostics().waiting,1,"P2 private folder progress pauses behind P1");
      await i.withForegroundPriority(()=>i.semanticPreparationRuntime(()=>true,1).yield(),1);
      assert.equal(settled,false,"A requested P1 consumer does not borrow the folder's P2 checkpoint");
      release();const result=await task;assert(result);
      const gates=operation==="build"?result.structuralGates.get("folder:Notes"):result;
      assert.equal(gates.bottom.visibleCount,130);
    }finally{release();f.preview.dispose();owner.close();}
  });
}

/** Folder selection keeps only a capped prefix plus one compiler chunk and needs no Markdown metadata. */
test('native folder ordering considers late members in bounded windows without metadata or recursive reads', async () => {
  const f=folderFixture();let largest=0;
  for(let n=129;n>=0;n--)f.addFile(`Notes/N${String(n).padStart(3,'0')}.md`);
  try {
    const result=await f.preview.build('folder:Notes',{
      /** A deterministic external display policy proves selection happens before retention. */
      selectFolderChildren: (paths,limit)=>{largest=Math.max(largest,paths.length);return [...paths].sort().slice(0,limit);},
    });
    assert(result);assert(largest<=74,'The cover retains at most ten candidates plus one 64-member chunk');
    assert.deepEqual([...result.state.pages.get('folder:Notes').neighbours.keys()].filter(path=>path.endsWith('.md')).sort(),
      Array.from({length:10},(_,n)=>`Notes/N${String(n).padStart(3,'0')}.md`));
    assert.equal(result.structuralGates.get('folder:Notes').bottom.visibleCount,130,'Counts still cover every native child');
  } finally {f.preview.dispose();}
});

/** A display-policy replacement cancels a private sorted cover at the same cooperative boundary as native changes. */
test('native sorted folder cover closes its caller policy fence after a yield', async () => {
  let current=true;
  const f=folderFixture({onYield:async()=>{current=false;}});
  for(let n=0;n<130;n++)f.addFile(`Notes/N${n}.md`);
  try {assert.equal(await f.preview.build('folder:Notes',{isCurrent:()=>current,selectFolderChildren:(paths,limit)=>paths.slice(0,limit)}),null);}
  finally {f.preview.dispose();}
});

/** Final native validation closes earlier owners after later source awaits without scanning on each record. */
for (const mutation of ['stat', 'replacement', 'rename', 'metadata']) test('host cover rejects an earlier owner changed during a later body await (' + mutation + ')', async () => {
  const f = fixture();
  let changed = false;
  try {
    const result = await f.preview.build(f.centerPath, { completeHostCover: true,
      bodyForPath: async path => {
        if (path !== 'Notes/Ordinary.md') return undefined;
        await Promise.resolve();
        const center = f.files.get(f.centerPath);
        if (mutation === 'metadata') f.cache.set(f.centerPath, {frontmatter: {Right: '[[Ordinary]]'}, tags: []});
        if (mutation === 'stat') center.stat.mtime++;
        if (mutation === 'replacement') f.files.set(f.centerPath, new TFile(f.centerPath, center.parent));
        if (mutation === 'rename') { f.files.delete(f.centerPath); center.path = 'Notes/Moved.md'; f.files.set(center.path, center); }
        changed = true;
        return undefined;
      },
    });
    assert(changed, 'A real earlier native owner changes after its own source collection');
    assert.equal(result, null, 'A private compilation cannot publish stale native identity/stat facts');
  } finally { f.preview.dispose(); }
});

/** Partial recovery may omit an unavailable peer, but ordinary covers and selected owners remain strict. */
for (const unavailable of ['missing', 'oversized']) test('partial host recovery omits uncertified peer incidence (' + unavailable + ')', async () => {
  const f = fixture();
  try {
    const peer = 'Notes/Parent.md';
    if (unavailable === 'missing') f.cache.delete(peer);
    else f.cache.set(peer, {frontmatter: {Huge: 'x'.repeat(2 * 1024 * 1024)}, tags: []});
    assert.equal(await f.preview.build(f.centerPath, {completeHostCover: true}), null, 'Ordinary count covers cannot become partial');
    assert.equal(await f.preview.build(f.centerPath, {completeHostCover: true, requiredMetadataPaths: new Set([f.centerPath, peer])}), null, 'Selected unavailable metadata is terminal for that surface');
    const partial = await f.preview.build(f.centerPath, {completeHostCover: true, requiredMetadataPaths: new Set([f.centerPath, 'Notes/Ordinary.md'])});
    assert(partial);
    assert(!partial.state.pages.has(peer), 'The omitted physical peer is not a certified endpoint');
    assert(!partial.state.pages.get(f.centerPath).neighbours.has(peer), 'Unknown explicit overrides cannot become inferred links');
    assert.deepEqual(partial.state.evidence.between(f.centerPath, peer), [], 'No provenance from an uncertified pair escapes');
    assert(partial.state.pages.get(f.centerPath).neighbours.has('Notes/Ordinary.md'), 'Healthy selected incidence survives');
  } finally {f.preview.dispose();}
});

/** Both visible-row limits and candidate limits participate in private native publication finality. */
test('native candidate overscan rejects a visible limit decrease while a chunk is yielded', async () => {
  let changed = false;
  const f = folderFixture({settings: {maxItemCount: 20}, onYield: async () => {
    if (!changed) {changed = true; f.setSettings({...f.settings(), maxItemCount: 10});}
  }});
  for (let n = 0; n < 130; n++) f.addFile('Notes/N' + n + '.md');
  try {
    assert.equal(await f.preview.build('folder:Notes', {folderCandidateLimit: 101}), null);
    assert(changed, 'A real cooperative chunk observes the setting change');
  } finally {f.preview.dispose();}
});


/** Mirror Obsidian’s fresh empty non-Markdown cache objects without reading binary bodies. */
function attachmentFixture(extension = 'pdf') {
  const f = fixture(), folder = f.files.get(f.centerPath).parent;
  const attachment = new TFile('Notes/Manual.' + extension, folder);f.files.set(attachment.path, attachment);
  const owners = Array.from({length:18},(_,i)=>{
    const file = new TFile('Notes/Reader-' + i + '.md',folder);f.files.set(file.path,file);
    f.cache.set(file.path,{frontmatter:{},tags:[],embeds:i===0?[{link:attachment.name}]:[]});
    f.app.metadataCache.resolvedLinks[file.path] = {[attachment.path]:i===0?2:1};return file;
  });
  return {...f,attachment,owners};
}

for (const extension of ['pdf','png']) for (const completeHostCover of [false,true]) test('native fresh attachment metadata preserves inbound links ('+extension+', complete '+completeHostCover+')',async()=>{
  const f = attachmentFixture(extension), bodyRequests=[];
  try {
    assert.notEqual(f.app.metadataCache.getFileCache(f.attachment),f.app.metadataCache.getFileCache(f.attachment),'Fixture reproduces Obsidian’s unstable attachment cache identity');
    const result=await f.preview.build(f.attachment.path,{completeHostCover,bodyForPath:async path=>{
      assert.notEqual(path,f.attachment.path,'Binary attachments never request Markdown parsing');bodyRequests.push(path);return undefined;
    }});
    assert(result,'Attachment preview publishes before global source authority');
    const page=result.state.pages.get(f.attachment.path);assert.equal(page.file,f.attachment);
    assert.deepEqual([...page.neighbours.keys()].filter(path=>path.endsWith('.md')).sort(),f.owners.map(file=>file.path).sort());
    for(const owner of f.owners)assert.equal(classifyRelation(page.neighbours.get(owner.path),'parent',false),2,'Inbound body/embed link uses canonical parent inference');
    assert.equal(bodyRequests.length,18,'Only Markdown contributors enter the optional body provider');
  } finally {f.preview.dispose();}
});

for (const completeHostCover of [false,true]) test('Markdown centers retain relations to fresh-cache PDF and image attachments (complete '+completeHostCover+')',async()=>{
  const f=attachmentFixture(),center=f.owners[0],image=new TFile('Notes/Image.png',f.attachment.parent),bodyRequests=[];
  f.files.set(image.path,image);
  f.app.metadataCache.resolvedLinks[center.path][image.path]=1;
  try {
    const result=await f.preview.build(center.path,{completeHostCover,bodyForPath:async path=>{bodyRequests.push(path);return undefined;}});
    assert(result,'Markdown preview survives attachment metadata lookups');
    const page=result.state.pages.get(center.path);
    for(const file of [f.attachment,image]){
      assert.equal(page.neighbours.get(file.path)?.target.file,file);
      assert.equal(classifyRelation(page.neighbours.get(file.path),'child',false),2);
      assert(!bodyRequests.includes(file.path),'No binary body reaches the Markdown provider');
    }
  } finally {f.preview.dispose();}
});

/** Exercise the real numerical publisher and repeat its revalidation, not merely the adapter. */
for(const indexingMode of ['eager','on-demand']) for(const centerKind of ['attachment','markdown']) test('numeric gates survive attachment metadata revalidation ('+indexingMode+', '+centerKind+')',async()=>{
  const f=attachmentFixture(),previousWindow=globalThis.window,centerPath=centerKind==='attachment'?f.attachment.path:f.owners[0].path;
  globalThis.window={performance,setTimeout,clearTimeout,setInterval,clearInterval};
  Object.assign(f.app.vault,{getName:()=> 'attachment-count-regression',getFiles:()=>[...f.files.values()]});
  f.app.saveLocalStorage=()=>{};
  const index=new GraphIndex({app:f.app,settings:{...settings,indexingMode,lastActivePath:centerPath,pinnedNodes:[],excludeFilepaths:[],
    nameFields:'aliases',renderAlias:false,showInferredNodes:true,showAttachments:true,showPageNodes:true,showFolderNodes:false,showTagNodes:false,showVirtualNodes:true},getIndexSourceRevision:()=>0},f.app);
  const forbidden=()=>{throw Error('Count-only work must not read bodies, sources or rebuild');};
  index.indexedDb.open=index.sourceAcquisition.acquire=index.sourceAcquisition.flush=index.rebuild=forbidden;
  try {
    for(let pass=0;pass<3;pass++){
      const scope=await index.publishOnDemandHostScope(centerPath,()=>true);
      assert(scope,'Shared local count scope publishes');
      const gates=index.gateStats(scope.pages.get(centerPath));
      assert.equal(gates[centerKind==='attachment'?'top':'bottom'].visibleCount,centerKind==='attachment'?18:1);
      for(const gate of Object.values(gates))assert.notEqual(gate.countUnavailable,true);
      assert.equal(index.onDemandUnavailableCounts.has(centerPath),false);
      assert.equal(index.isSemanticWriteReady(centerPath,centerKind==='attachment'?f.owners[0].path:f.attachment.path),false,'Numerical recovery grants no edit authority');
      // An observed native event retires proof; the same contributors must recertify normally.
      index.hostPreview.refreshSource(f.owners[0].path);
    }
  } finally {index.destroy();f.preview.dispose();globalThis.window=previousWindow;}
});

for (const mutation of ['stat','replacement','rename','delete','markdown-metadata']) test('attachment covers retain native and Markdown freshness fences ('+mutation+')',async()=>{
  const f=attachmentFixture();let changed=false;
  try {
    const result=await f.preview.build(f.attachment.path,{completeHostCover:true,bodyForPath:async path=>{
      if(path!==f.owners[1].path)return undefined;
      await Promise.resolve();changed=true;
      if(mutation==='stat')f.attachment.stat.mtime++;
      if(mutation==='replacement')f.files.set(f.attachment.path,new TFile(f.attachment.path,f.attachment.parent));
      if(mutation==='rename'){f.files.delete(f.attachment.path);f.attachment.path='Notes/Renamed.pdf';f.files.set(f.attachment.path,f.attachment);}
      if(mutation==='delete')f.files.delete(f.attachment.path);
      if(mutation==='markdown-metadata')f.cache.set(f.owners[0].path,{frontmatter:{Hidden:'[[Manual.pdf]]'},tags:[]});
      return undefined;
    }});
    assert(changed,'Mutation overlaps a real later Markdown await');assert.equal(result,null,'Retired file or real Markdown metadata cannot publish');
  } finally {f.preview.dispose();}
});

/** Switching to an unresolved neighbour must not wait for global source authority. */
test('bounded placeholder preview survives release of its original native center',async()=>{
 const f=fixture(),originalWindow=globalThis.window;
 globalThis.window={performance,setTimeout,clearTimeout,setInterval,clearInterval};
 const placeholder='Notes/Unwritten';
 f.app.vault.getName=()=> 'placeholder-handover';
 f.app.metadataCache.unresolvedLinks[f.centerPath]={[placeholder]:1};
 f.cache.get(f.centerPath).frontmatter.Left='[['+placeholder+']]';
 const plugin={settings:{...settings,excludeFilepaths:[],showVirtualNodes:true},getIndexSourceRevision:()=>0};
 const index=new GraphIndex(plugin,f.app);
 index.startSemanticDemand=()=>{};
 try{
  const releaseOld=index.acquireSemanticDemand(f.centerPath);
  await index.publishHostMetadataPreview(f.centerPath);
  assert(index.get(placeholder),'The early neighbour is visible');
  const releaseNew=index.acquireSemanticDemand(placeholder);releaseOld();
  await index.publishHostMetadataPreview(placeholder);
  const page=index.get(placeholder);
  assert(page,'The new placeholder owns a readable preview before global indexing');
  assert.equal(page.file,null);
  assert(page.neighbours.has(f.centerPath),'Its existing contributor remains connected');
  assert.equal(index.state.pages.size,0,'A provisional preview does not publish global authority');
  assert.equal(await f.preview.build('Unknown'),null,'An arbitrary missing identity is not fabricated');
  releaseNew();assert.equal(index.get(placeholder),undefined,'Releasing the last owner retires the preview');
 }finally{index.destroy();f.preview.dispose();globalThis.window=originalWindow}
});
