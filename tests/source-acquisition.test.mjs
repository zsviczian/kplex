/** Exercise production host acquisition with explicit public-host fixtures, not substitute collectors. */
import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { browserBundle } from "./support/browserTypeScript.mjs";

const bundle = await browserBundle([
  "src/adapters/obsidian/sourceAcquisition.ts", "src/index/SourceRepository.ts", "src/index/SourceLocalDependencies.ts", "src/core/parser/metadata.ts", "src/index/GraphBuilder.ts", "src/index/fieldParser.ts", "src/index/ForegroundWorkScheduler.ts",
], { obsidian: `exports.Platform={isMobile:false}; exports.TFile=class TFile {
  constructor(path){this.path=path;this.name=path.split('/').pop();this.extension=path.split('.').pop();this.basename=path.split('/').pop().replace(/\\.[^.]+$/,'');this.stat={mtime:1,size:100,ctime:1};this.parent={path:''};}
}; exports.TFolder=class TFolder {constructor(){this.path='';this.name='';this.children=[];this.parent=null;}};
exports.getAllTags=()=>[];window.SourceTestFolder=exports.TFolder;window.SourceTestFile=exports.TFile;` });
globalThis.window = globalThis;
new Function("window", bundle)(window);
const { ObsidianSourceAcquisition, NeutralSourceRepository, parseBodyMetadata } = window.sourceModules;
const TFile = window.SourceTestFile;

/** Canonical cache merge and cooperative facets share order, duplicates, fallback and ignored-work rules. */
test("streaming frontmatter aliases match the canonical merge without unrelated metadata traversal", () => {
  const M=window.sourceModules;
  const inherited=Object.assign(Object.create({aliases:["Hidden"]}),{alias:[" Kept "]});
  const nonEnumerable=Object.defineProperty({alias:"Kept"},"aliases",{value:["Hidden"],enumerable:false});
  for(const [frontmatter,expected]of [
    [{aliases:[" First ","",3,null,["Second",[" First "]]],alias:"ignored"},["First","Second","First"]],
    [{alias:" One, Two "},["One, Two"]], [{aliases:[],alias:"ignored"},[]],
    [{aliases:null,alias:["Fallback"]},["Fallback"]], [inherited,["Kept"]], [nonEnumerable,["Kept"]],
  ]){
    assert.deepEqual([...M.iterateFrontmatterAliasSteps(frontmatter)].flatMap(step=>step.value===null?[]:[step.value]),expected);
    assert.deepEqual(M.mergeFileMetadata({frontmatter},M.parseBodyMetadata("")).aliases,expected);
  }
  const selected={aliases:["Facet"]};Object.defineProperty(selected,"unrelated",{enumerable:true,get(){throw Error("Unrelated metadata visited")}});
  assert.deepEqual([...M.iterateFrontmatterAliasSteps(selected)].flatMap(step=>step.value===null?[]:[step.value]),["Facet"]);
  let aliases=" Leaf ";for(let i=0;i<10000;i++)aliases=[aliases];
  const steps=[...M.iterateFrontmatterAliasSteps({aliases})];assert.deepEqual(steps.filter(step=>step.value!==null).map(step=>step.value),["Leaf"]);
  assert.ok(steps.filter(step=>step.value===null).length>20000,"Both descent and ignored/unwind work remain cooperative");
  assert.ok(steps.some(step=>step.depth>10000),"Traversal memory can be charged independently of retained labels");
  const sibling=[" Same "];assert.deepEqual([...M.iterateFrontmatterAliasSteps({aliases:[sibling,sibling]})].filter(step=>step.value!==null).map(step=>step.value),["Same","Same"]);
  const cyclic=[];cyclic.push(cyclic);
  assert.throws(()=>[...M.iterateFrontmatterAliasSteps({aliases:cyclic})],/Cyclic frontmatter aliases/);
  assert.throws(()=>M.mergeFileMetadata({frontmatter:{aliases:cyclic}},M.parseBodyMetadata("")),/Cyclic frontmatter aliases/);
});

/** Only host events and file IO are fixtures; source codecs, repository and acquisition are production. */
function hostFixture(backgroundCheckpoint, runBackgroundWork, onPresentationInputsAvailable) {
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
    getQueuedBody: (path, mtime) => { const item = legacy.get(path); return item?.mtime === mtime ? item.body : null; },
    getBodies: async requests => new Map(requests.flatMap(({ path, mtime }) => { const item = legacy.get(path); return item?.mtime === mtime ? [[path, item.body]] : []; })),
    putBody: async (path, mtime, body) => { legacy.set(path, { path, mtime, parserVersion: 2, body }); return true; },
  };
  cache.putBodies = async values => { for (const value of values) await cache.putBody(value.path, value.mtime, value.body); };
  cache.deleteBody = async path => { legacy.delete(path); };
  cache.queueBodyWrite = (path, mtime, body) => { legacy.set(path, { path, mtime, parserVersion: 2, body }); };
  const parser = async value => { parses.push(value); return parseBodyMetadata(value); };
  const acquisition = new ObsidianSourceAcquisition(app, cache, parser, undefined, undefined, undefined, backgroundCheckpoint, runBackgroundWork, onPresentationInputsAvailable);
  const add = (path, bodyText = "Links:: [[Alias]] [[Target]]", frontmatter = {}) => {
    const file = new TFile(path); file.parent = root; files.set(path, file); text.set(path, bodyText);
    metadata.set(path, { frontmatter, links: [] });
    return file;
  };
  const facts = async (path, family) => { const result = []; assert.equal(await repository.visit(path, family, records => { result.push(...records); return true; }), "ready"); return result; };
  return { files, metadata, text, legacy, resolutions, reads, parses, app, repository, acquisition, cache, parser, add, facts,
    close() { acquisition.close(); repository.close(); assert.equal(vault.count(), 0); assert.equal(app.metadataCache.count(), 0); assert.equal(timers.size, 0); } };
}

test("independently scheduled source inventory owns P4 and yields to P3 without losing its unload fence", async () => {
  const {ForegroundWorkScheduler,INDEX_WORK_PRIORITY:P}=window.sourceModules;
  const scheduler=new ForegroundWorkScheduler();
  const f=hostFixture(()=>scheduler.checkpoint(P.background),work=>scheduler.run(P.background,work));
  const release=scheduler.begin(P.urlInventory);
  let settled=false;const task=f.acquisition.reconcile().finally(()=>{settled=true;});
  try {
    await Promise.resolve();await Promise.resolve();
    assert.equal(settled,false);
    assert.deepEqual(scheduler.diagnostics().active,[0,0,0,1,1]);
    assert.equal(scheduler.diagnostics().waiting,1);
    assert.equal(f.acquisition.getCounters().checked,0,"No inventory reads begin behind the higher URL lane");
    f.acquisition.close();scheduler.close();
    assert.equal(await task,false,"A woken lower lane does not acquire late source authority");
    release();assert.deepEqual(scheduler.diagnostics().active,[0,0,0,0,0]);
  } finally {release();scheduler.close();f.close();}
});

test("full and node-only compiler continuations retain the builder caller's priority checkpoint", async () => {
  const {ForegroundWorkScheduler,INDEX_WORK_PRIORITY:P,GraphBuilder}=window.sourceModules;
  const scheduler=new ForegroundWorkScheduler();
  for(const projection of ["graph","nodes"]){
    const builder=Object.create(GraphBuilder.prototype);
    builder.fullCompilerSettings=()=>({hierarchy:{hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[]}});
    builder.isCurrent=()=>true;builder.backgroundCheckpoint=()=>scheduler.checkpoint(P.background);
    const compiler=builder.createFullCompiler(projection),release=scheduler.begin(P.urlInventory);
    let entered;
    const boundary=new Promise(resolve=>{entered=resolve;});
    builder.backgroundCheckpoint=()=>{entered();return scheduler.checkpoint(P.background);};
    let settled=false;const continuation=compiler.runtime.yield().finally(()=>{settled=true;});
    try{
      await boundary;assert.equal(settled,false);
      assert.equal(scheduler.diagnostics().waiting,1,`${projection} must yield behind URL inventory`);
      release();await continuation;assert.equal(scheduler.diagnostics().waiting,0);
    }finally{release();}
  }
  scheduler.close();
});

test("current new body availability wakes targeted presentation once; callback failure does not reject acquisition", async () => {
  const events=[],f=hostFixture(undefined,undefined,path=>{events.push(path);throw Error("optional observer");});
  try{
    const file=f.add("style.md","type:: excalidraw");
    const body=await f.acquisition.loadBody(file,()=>true);
    assert(body);assert.deepEqual(events,[file.path]);
    assert.equal(await f.acquisition.loadBody(file,()=>true),body);
    assert.deepEqual(events,[file.path],"Existing cache reuse does not masquerade as new input availability");
  }finally{f.close();}
});

for(const change of ["unload","native revision","caller"]){
  test(`late body-cache availability cannot wake presentation after ${change}`,async()=>{
    const events=[],f=hostFixture(undefined,undefined,path=>events.push(path));let valid=true,release,entered;
    const reached=new Promise(resolve=>{entered=resolve;});const held=new Promise(resolve=>{release=resolve;});
    try{
      const file=f.add("style.md","type:: excalidraw"),original=f.cache.putBody;
      f.cache.putBody=async(...args)=>{entered();await held;return original(...args);};
      const task=f.acquisition.loadBody(file,()=>valid);await reached;
      if(change==="unload")f.acquisition.close();else if(change==="native revision")file.stat.mtime++;else valid=false;
      release();assert.equal(await task,null);assert.deepEqual(events,[]);
    }finally{release?.();f.close();}
  });
}

test("resolver-neutral local tokens cover relative, extensionless, encoded and subpath spellings", () => {
  const key = window.sourceModules.sourceLocalResolverDependencyKey;
  const pathKey = window.sourceModules.sourceLocalResolverPathDependencyKey;
  assert.equal(key("../Target#Heading", "Folder/Ref.md"), pathKey("Target.md"));
  assert.equal(key("./Target.md#^block", "Folder/Ref.md"), pathKey("Folder/Target"));
  assert.equal(key("Folder%2FTarget.md#Section", "Ref.md"), pathKey("Folder/Target"));
  assert.notEqual(key("Target", "Ref.md"), key("Other", "Ref.md"));
});

test("legacy body-v2 migration reads/parses only a missing body and never treats pending metadata as empty", async () => {
  const f = hostFixture();
  try {
    const ready = f.add("ready.md", "Keep:: plain\nLinks:: [[Alias]]", { Dormant: "[[Never selected]]", Private: "not a reference" });
    const missing = f.add("missing.md", "Other:: [[Target]]");
    const pending = f.add("pending.md"); f.metadata.delete(pending.path);
    const body = parseBodyMetadata(f.text.get(ready.path));
    f.legacy.set(ready.path, { path: ready.path, mtime: 1, parserVersion: 2, body });
    assert.equal(await f.acquisition.reconcile(), false, "Unavailable storage must not be claimed durable");
    assert.deepEqual(f.reads, [missing.path]); assert.equal(f.parses.length, 1);
    assert.equal((await f.repository.inspect(ready.path)).reason, "ready");
    assert.equal((await f.repository.inspect(pending.path)).head, null);
    assert.equal(f.acquisition.getCounters().legacyBodies, 1);
    assert(f.acquisition.getCounters().pendingMetadata > 0);
    assert(!Object.hasOwn(f.legacy.get(ready.path), "size"));
    const stored = await f.facts(ready.path, "values");
    assert(stored.some(value => value.kind === "reference-candidate" && value.rawTarget === "Never selected"));
    assert(!JSON.stringify(stored).includes("not a reference"));
    await f.acquisition.reconcile(); assert.deepEqual(f.reads, [missing.path]); assert.equal(f.parses.length, 1);
  } finally { f.close(); }
});

test("target creation/alias settlement replays both lexical spellings without reading or parsing the source", async () => {
  const f = hostFixture();
  try {
    const source = f.add("source.md"); const target = f.add("target.png", "");
    f.resolutions.set("Alias", target.path); f.resolutions.set("Target", target.path);
    const body = parseBodyMetadata(f.text.get(source.path));
    assert.equal((await f.acquisition.acquire(source, body)).reason, "storage-unavailable");
    const first = await f.facts(source.path, "resolution");
    assert.deepEqual(first.filter(r => r.kind === "reference-resolution").map(r => r.target.entity.id), [target.path, target.path]);
    const other = f.add("other.png", ""); f.resolutions.set("Alias", other.path);
    f.app.vault.trigger("create", other); f.app.metadataCache.trigger("resolved");
    assert(await f.acquisition.readBody(source));
    await f.acquisition.reconcile();
    const second = await f.facts(source.path, "resolution");
    assert.deepEqual(second.filter(r => r.kind === "reference-resolution").map(r => r.target.entity.id), [other.path, target.path]);
    const lexical = await f.facts(source.path, "values");
    assert.deepEqual(lexical.filter(r => r.kind === "reference-candidate").map(r => r.rawTarget), ["Alias", "Target"]);
    assert.deepEqual(f.reads, []); assert.deepEqual(f.parses, []);
    assert(f.acquisition.getCounters().resolutionRefreshes > 0);
  } finally { f.close(); }
});

for (const tracking of [false, true]) test(`source-relative move reuses immutable body and tombstones the old binding; deletion cannot keep contributing (node impacts ${tracking})`, async () => {
  const f = hostFixture();
  try {
    const source = f.add("One/source.md", "Links:: [[Alias]] [[Target]]\n[Retired URL](https://retire.example/path)"); const left = f.add("left.png", ""); const right = f.add("right.png", "");
    f.resolutions.set(`${source.path}:Alias`, left.path);
    const body = parseBodyMetadata(f.text.get(source.path)); await f.acquisition.acquire(source, body);
    if (tracking) f.acquisition.enableNodeImpactTracking();
    const oldPath = source.path;
    f.files.delete(oldPath); source.path = "Two/source.md"; f.files.set(source.path, source);
    f.metadata.set(source.path, f.metadata.get(oldPath)); f.metadata.delete(oldPath);
    f.resolutions.set(`${source.path}:Alias`, right.path);
    f.app.vault.trigger("rename", source, oldPath);
    // Event-side tombstone work is deliberately not awaited by the host lifecycle.
    await f.repository.flush();
    assert(await f.acquisition.readBody(source));
    await f.acquisition.reconcile();
    assert.equal((await f.repository.inspect(oldPath)).reason, "tombstone");
    assert.equal((await f.facts(source.path, "resolution")).find(r => r.kind === "reference-resolution").target.entity.id, right.path);
    assert.deepEqual(f.reads, []); assert.deepEqual(f.parses, []);
    f.files.delete(source.path); f.app.vault.trigger("delete", source); await f.repository.flush();
    assert.equal((await f.repository.inspect(source.path)).reason, "tombstone");
    const owners = []; await f.repository.querySources("literal", "Alias", ids => { owners.push(...ids); return true; });
    assert.deepEqual(owners, []);
  } finally { f.close(); }
});

test("unselected metadata changes persist while Date/Daily Notes observations independently refresh without body IO", async () => {
  const f = hostFixture();
  try {
    const source = f.add("source.md", "Status:: plain", { Dormant: "[[Alpha]]", When: "2026-09-29" });
    const body = parseBodyMetadata(f.text.get(source.path)); await f.acquisition.acquire(source, body);
    const original = (await f.repository.inspect(source.path)).head;
    f.metadata.set(source.path, { frontmatter: { Dormant: "[[Beta]]", When: "2026-09-29" }, links: [] });
    f.app.metadataCache.trigger("changed", source);
    await f.acquisition.reconcile();
    assert((await f.facts(source.path, "values")).some(r => r.kind === "reference-candidate" && r.rawTarget === "Beta"));
    const beforeDateEnvironment = f.acquisition.getMaintenanceRevision();
    f.app.dateFields.add("When");
    await f.acquisition.reconcile();
    const dated = (await f.repository.inspect(source.path)).head;
    assert.notEqual(dated.observation.environment, original.observation.environment);
    assert(f.acquisition.getMaintenanceRevision() > beforeDateEnvironment);
    assert((await f.facts(source.path, "resolution")).some(r => r.kind === "date-property"));
    const beforeDailyEnvironment = f.acquisition.getMaintenanceRevision();
    f.app.daily.folder = "OtherDaily"; await f.acquisition.reconcile();
    const next = (await f.repository.inspect(source.path)).head;
    assert.notEqual(next.observation.environment, dated.observation.environment);
    assert(f.acquisition.getMaintenanceRevision() > beforeDailyEnvironment);
    f.app.settings = { hierarchy: { parents: ["Dormant"] }, imageProperty: "secret", nameFields: "Private" };
    await f.acquisition.reconcile();
    assert.equal((await f.repository.inspect(source.path)).head.observation.environment, next.observation.environment);
    assert.deepEqual(f.reads, []); assert.deepEqual(f.parses, []);
    assert(!JSON.stringify(f.acquisition.getDiagnostics()).match(/Dormant|Private|OtherDaily|source\.md|secret/));
  } finally { f.close(); }
});

test("host revision and unload fence asynchronous acquisition before neutral or live publication", async () => {
  const f = hostFixture();
  try {
    const source = f.add("source.md"); const body = parseBodyMetadata(f.text.get(source.path));
    const changing = f.acquisition.acquire(source, body);
    f.app.metadataCache.trigger("resolved");
    assert.equal((await changing).current, false);
    assert.equal((await f.repository.inspect(source.path)).head, null);
    const closing = f.acquisition.acquire(source, body); f.acquisition.close();
    assert.equal((await closing).current, false);
    assert.equal((await f.repository.inspect(source.path)).head, null);
  } finally { f.close(); }
});

test("multiple unscoped resolver events coalesce into one maintenance fence and cached-fact pass", async () => {
  const f = hostFixture();
  try {
    const source = f.add("source.md", "Friends:: [[Target]]"); const target = f.add("Target.md", "");
    f.resolutions.set("Target", target.path);
    assert.equal((await f.acquisition.acquire(source, parseBodyMetadata(f.text.get(source.path)))).reason, "storage-unavailable");
    assert.equal((await f.acquisition.acquire(target, parseBodyMetadata(f.text.get(target.path)))).reason, "storage-unavailable");
    const before = f.acquisition.getMaintenanceRevision();
    f.app.metadataCache.trigger("resolved"); f.app.metadataCache.trigger("resolved"); f.app.metadataCache.trigger("resolved");
    assert.equal(f.acquisition.getMaintenanceRevision(), before + 1, "One native resolved burst owns one maintenance revision");
    await f.acquisition.reconcile();
    assert.deepEqual(f.reads, [], "Unscoped resolver reconciliation reuses cached neutral bodies");
    assert.deepEqual(f.parses, [], "Unscoped resolver reconciliation does not parse unchanged Markdown");
    f.app.metadataCache.trigger("resolved");
    assert.equal(f.acquisition.getMaintenanceRevision(), before + 2, "A later resolver wave advances exactly once again");
  } finally { f.close(); }
});

test("native TFile resolver closes are causally covered while a later unscoped resolver wave stays uncertain", async () => {
  const f = hostFixture();
  try {
    const source = f.add("source.md", "Friends:: [[Target]]");
    await f.acquisition.acquire(source, parseBodyMetadata(f.text.get(source.path)));

    f.app.vault.trigger("modify", source);
    f.app.metadataCache.trigger("changed", source);
    const afterKnownEvents = f.acquisition.getMaintenanceRevision();
    f.app.metadataCache.trigger("resolved");
    assert.equal(f.acquisition.getMaintenanceRevision(), afterKnownEvents,
      "The first resolved event consumes the known TFile wave without globalizing maintenance");

    f.app.metadataCache.trigger("resolved");
    assert.equal(f.acquisition.getMaintenanceRevision(), afterKnownEvents + 1,
      "A later resolved event has no causal coverage and advances the uncertain maintenance fence");
  } finally { f.close(); }
});

test("folder activity cannot causally cover a following resolver wave", async () => {
  const f = hostFixture();
  try {
    const source = f.add("source.md", "Friends:: [[Target]]");
    await f.acquisition.acquire(source, parseBodyMetadata(f.text.get(source.path)));

    const folder = new window.SourceTestFolder(); folder.path = "Empty"; folder.name = "Empty";
    f.app.vault.trigger("create", folder);
    const afterFolder = f.acquisition.getMaintenanceRevision();
    f.app.metadataCache.trigger("resolved");
    assert.equal(f.acquisition.getMaintenanceRevision(), afterFolder + 1,
      "Folder/non-file activity must not make the following resolver wave look source-local");
  } finally { f.close(); }
});

test("production GraphBuilder full/patch/no-op acquire neutral facts without changing the synchronous graph publication contract", async () => {
  const f = hostFixture();
  try {
    const source = f.add("source.md", "Status:: before", { Dormant: "[[target.png]]" }); f.add("target.png", "");
    const body = parseBodyMetadata(f.text.get(source.path));
    f.legacy.set(source.path, { path: source.path, mtime: 1, parserVersion: 2, body });
    const plugin = { getIndexSourceRevision: () => 0, settings: {
      hierarchy: { hidden: [], parents: [], children: [], leftFriends: [], rightFriends: [], previous: [], next: [], exclusions: [] },
      noteTypeField: "type", primaryTagField: "type", thumbnailProperty: "thumbnail", nodeImageProperty: "image",
      inferAllLinksAsFriends: false, inverseInfer: false, showFullTagName: false, tagStyleList: [], baseNodeStyle: { maxLabelLength: 30 },
    } };
    const hot = new Map(), fingerprints = new Map();
    const builder = () => new window.sourceModules.GraphBuilder(plugin, f.app, hot, { parse: f.parser }, f.cache, () => true, fingerprints, f.acquisition);
    const state = await builder().build(); assert(state);
    assert.equal((await f.repository.inspect(source.path)).reason, "ready");
    assert.equal(state.pages.get(source.path).neighbours.has("target.png"), false, "Dormant source facts do not create a relationship");
    assert.deepEqual(f.reads, []); assert.deepEqual(f.parses, []);
    f.legacy.delete(source.path); hot.clear();
    assert(await builder().build({ acquireSources: false }), "A neutral source fills a missing legacy body during full rebuild");
    assert.deepEqual(f.reads, []); assert.deepEqual(f.parses, []);
    const initialRevision = (await f.repository.inspect(source.path)).head.sourceRevision;
    source.stat.mtime += 1;
    const updated = parseBodyMetadata("Status:: after"); hot.set(source.path, { mtime: source.stat.mtime, body: updated });
    f.app.metadataCache.trigger("changed", source);
    let publications = 0;
    const patch = await builder().patchMarkdownFiles(state, [source], { publishFileCommit(commit, publish) {
      publications++; assert.equal(commit.semanticChanged, false);
      assert.equal(publish(), undefined, "Publication is synchronous, not a storage promise");
    } });
    assert.equal(patch.ok, true); assert.equal(patch.semanticNoops, 1); assert.equal(publications, 1);
    const next = await f.repository.inspect(source.path); assert.notEqual(next.head.sourceRevision, initialRevision);
    assert((await f.facts(source.path, "values")).some(record => record.kind === "inline-payload" && record.text === "after"));
    // SI4 is deliberately NOT installed: semantic settings still go through the full builder.
    plugin.settings.hierarchy.parents = ["Dormant"];
    const interpreted = await builder().build(); assert(interpreted);
    assert.equal(interpreted.pages.get(source.path).neighbours.has("target.png"), true);
    assert.deepEqual(f.reads, []); assert.deepEqual(f.parses, []);
    // The production full-build caller delegates durable acquisition to its independent
    // post-publication inventory so a settings rebuild does not await per-note IDB writes.
    const deferred = f.add("deferred.md", "Dormant:: [[target.png]]");
    const nextGraph = await builder().build({ acquireSources: false }); assert(nextGraph);
    assert.equal((await f.repository.inspect(deferred.path)).head, null);
    await f.acquisition.reconcile();
    assert.equal((await f.repository.inspect(deferred.path)).reason, "ready");
  } finally { f.close(); }
});

test("an observed equal-stat body edit invalidates immutable and legacy inputs, while metadata-only changes do not", async () => {
  const f = hostFixture();
  try {
    const source = f.add("same.md", "Status:: before");
    const body = parseBodyMetadata(f.text.get(source.path)); await f.acquisition.acquire(source, body);
    f.legacy.set(source.path, { path: source.path, mtime: source.stat.mtime, parserVersion: 2, body });
    const revision = f.acquisition.getFileRevision(source);
    f.text.set(source.path, "Status:: after!");
    f.app.vault.trigger("modify", source);
    assert(f.acquisition.getFileRevision(source) > revision);
    assert.equal(await f.acquisition.readBody(source), null);
    await f.acquisition.reconcile();
    assert.deepEqual(f.reads, [source.path]); assert.equal(f.parses.length, 1);
    assert((await f.facts(source.path, "values")).some(record => record.kind === "inline-payload" && record.text === "after!"));
    f.app.metadataCache.trigger("changed", source);
    await f.acquisition.reconcile();
    assert.deepEqual(f.reads, [source.path]); assert.equal(f.parses.length, 1);
  } finally { f.close(); }
});

/** A durable-storage or missing-metadata outcome without a newer source event must remain pending after one pass. */
test("flush does not retry unchanged incomplete source inputs or reopen after close", async () => {
  const f = hostFixture();
  try {
    const pending = f.add("pending.md"); f.metadata.delete(pending.path);
    const reconcile = f.acquisition.reconcile.bind(f.acquisition);
    let passes = 0;
    f.acquisition.reconcile = async () => { passes++; return reconcile(); };
    assert.equal(await f.acquisition.flush(), false);
    assert.equal(passes, 1, "No retry without a genuinely newer queued source observation");
    assert.equal(f.acquisition.inventoryCaptureRevision, null, "The ended pass releases its capture");
    assert.equal(f.acquisition.hasSemanticDependencies(), false);
    const checked = f.acquisition.getCounters().checked;
    f.acquisition.close();
    assert.equal(await f.acquisition.flush(), false);
    assert.equal(f.acquisition.getCounters().checked, checked, "Closed acquisition cannot reopen or collect");
  } finally { f.close(); }
});

/** Two genuine source interruptions may consume one queued replacement; a third observation stays pending. */
test("flush joins at most one newer queued pass", async () => {
  const f = hostFixture();
  let release;
  try {
    const file = f.add("changed.md");
    const load = f.acquisition.loadBody.bind(f.acquisition);
    const reconcile = f.acquisition.reconcile.bind(f.acquisition);
    let passes = 0, loads = 0, reached;
    const paused = new Promise(resolve => { reached = resolve; });
    f.acquisition.reconcile = async () => { passes++; return reconcile(); };
    f.acquisition.loadBody = async (...args) => {
      const body = await load(...args);
      loads++;
      if (loads === 1) await new Promise(resolve => { release = resolve; reached(); });
      else if (loads === 2) f.app.metadataCache.trigger("changed", file);
      return body;
    };
    const oldPass = f.acquisition.reconcile();
    await paused;
    f.app.metadataCache.trigger("changed", file);
    const flushed = f.acquisition.flush();
    release(); release = null;
    assert.equal(await oldPass, false, "The retired pass remains canceled");
    assert.equal(await flushed, false, "Another interrupted replacement remains pending");
    assert.equal(passes, 2, "One queued replacement, no unbounded event retry loop");
    assert.equal(f.acquisition.hasSemanticDependencies(), false);
  } finally { release?.(); f.close(); }
});
