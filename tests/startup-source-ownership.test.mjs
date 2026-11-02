/**
 * Automatic rebuild ownership while source-backed startup is still adopting. Production interval,
 * rebuild and backlog methods are extracted intact; host effects/builders are counted capabilities.
 * This event-order regression is not a storage, native-interaction or CPU measurement.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {startupSourceCoordinatorSource} from './support/startupSourceCoordinator.mjs';

const require = createRequire(import.meta.url), ts = require('typescript');
const source = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const module = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true);
const plugin = module.statements.find(/** Select the real plugin lifecycle owner. */ node => ts.isClassDeclaration(node) && node.name?.text === 'KplexPlugin');
const names = new Set(['performRebuild', 'rebuildIndex', 'pruneMissingDirtyMarkdownPaths',
  'registerReactiveIndexListeners', 'pruneManagedMetadataWrites', 'scheduleRebuild',
  'settlePatchOnlyBacklogIfIdle', 'countDeletedMarkdownFile', 'computeIndexStatusFacts']);
const methods = plugin.members.filter(/** Copy complete production implementations, not alternate fixture algorithms. */ member => names.has(member.name?.getText(module)));
assert.equal(methods.length, names.size);
const onload = plugin.members.find(/** Locate the original timer registration. */ member => member.name?.getText(module) === 'onload');
const interval = onload.body.statements.find(/** Preserve the exact interval policy and callback. */ statement => ts.isIfStatement(statement)
  && statement.expression.getText(module) === 'this.settings.indexUpdateInterval > 0');
assert(interval, 'Actual legacy interval registration exists');
const base = startupSourceCoordinatorSource().replace("import {Platform,TFile,TFolder} from 'obsidian';", '')
  .replace("import {perfNow} from './util/perf';", '')
  .replace('export class StartupSourceCoordinator', 'class StartupSourceCoordinator');
const position = base.lastIndexOf('}');
const body = base.slice(0, position) + methods.map(/** Retain production method bodies unchanged. */ member => member.getText(module)).join('\n')
  + '\n/** Test-owned wrapper installs the actual onload timer statement. */\ninstallInitialRebuildInterval(){' + interval.getText(module) + '}\n}';
const js = ts.transpileModule(body, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
const load = new Function('Platform', 'TFile', 'TFolder', 'Notice', 'window', 'perfNow', js + '\nreturn StartupSourceCoordinator;');

/** Native notice presentation is outside this coordinator ownership fixture. */
class Notice { /** Accept the real command's notification without emulating UI. */ constructor() {} }

/** Native identity is explicit so the production event callbacks retain their instanceof checks. */
class HostFile {
  /** Supply the exact path and physical revision observed by metadata and delete callbacks. */
  constructor(path) { this.path = path; this.extension = 'md'; this.stat = {mtime: 1, ctime: 1, size: 1}; }
}
/** A real folder-shaped native event must remain structurally owed during source adoption. */
class HostFolder { /** Retain folder identity independently of its path. */ constructor(path) { this.path = path; } }

/** Supply a held initial adopter and finite graph effects to the actual legacy interval callback. */
function fixture({ reasons = ['startup:stale-snapshot'], dirty = [], sourceBacked = true, complete = false, onDemand = false, published = false } = {}) {
  let callback, period, pending, release;
  const timers = {
    /** Capture registration without changing its requested production interval. */ setInterval(work, delay) { callback = work; period = delay; return 1; },
    /** The production no-op retirement clears the test-owned scheduled marker only. */ clearTimeout() {},
  };
  const Coordinator = load({ isIosApp: false }, HostFile, HostFolder, Notice, timers, () => 0), p = new Coordinator();
  const counts = { full: 0, local: 0 }, initial = new Promise(/** Hold source adoption independently of automatic graph rebuild. */ done => { release = done; });
  p.app = { vault: { /** Retain the genuine named dirty source. */ getFileByPath: path => path === 'A.md' ? { path, extension: 'md' } : null } };
  p.settings = { indexUpdateInterval: 120000 }; p.layoutReady = true; p.indexPreparationAdmitted = true;
  p.initialIndexComplete = complete; p.initialIndexTask = initial; p.indexDirty = true; p.rebuildTimer = 1;
  p.indexBacklogReasons = new Set(reasons); p.dirtyMarkdownPaths = new Set(dirty);
  p.hasVisibleKplexSurface = /** The real interval only flushes a visible dirty surface. */ () => true;
  p.notifyIndexStatus = /** Observe ownership independently of status UI. */ () => {};
  p.registerInterval = /** This test retains no real timer. */ () => {};
  p.translator = /** Notification copy is unchanged and belongs to native checks. */ key => key;
  p.refreshBookmarkedEntryPoints = /** Preserve the local refresh branch's optional presentation completion. */ async () => {};
  p.startupGraphSeedPaths = /** No path discovery is required to observe builder admission. */ () => [];
  p.index = {
    size: 1,
    /** No structural operation owns this controlled interval. */ hasPendingStructuralMaintenance: () => false,
    /** The cache hydration owner has settled; source adoption is still held. */ hasPendingSnapshotHydration: () => false,
    /** Only source-backed initial work has the distinct ownership contract. */ hasSourceBackedStartup: () => sourceBacked,
    /** Keep mode-specific refresh separate from eager adoption. */ isOnDemandMode: () => onDemand,
    /** Independent URL discovery is outside this controlled ownership fixture. */ startBackgroundUrlIndex: async () => true,
    /** The coherent physical baseline remains navigable. */ hasPhysicalBaseline: () => true,
    /** This test observes ordinary full-builder admission, not progressive compilation. */ isFullSnapshotHydrated: () => true,
    /** Count admission only; a false result here is not evidence of a real incomplete build. */ rebuild: async () => { counts.full++; return published; },
    /** Preserve the on-demand branch's own local refresh. */ refreshOnDemandGraph: async () => { counts.local++; return false; },
    /** Decision formatting is outside this admission test. */ noteBuildDecision() {},
  };
  const rebuild = p.rebuildIndex;
  p.rebuildIndex = /** Preserve the real coordinator promise for the callback's void invocation. */ function(...args) { pending = rebuild.apply(this, args); return pending; };
  p.installInitialRebuildInterval();
  assert.equal(period, 120000, 'The production interval is unchanged');
  return { p, counts, initial,
    /** Fire the exact registered callback without advancing a watchdog or awaiting the held adopter. */
    async interval() { callback(); await pending; },
    /** Release the independent startup prerequisite after assertions. */
    close() { release(); },
  };
}

/** Deliver native-shaped events through the unmodified registered production callbacks. */
function eventFixture(options = {}) {
  const f = fixture({...options, published: true}), {p} = f;
  f.counts.dematerialized = 0;
  const vaultListeners = new Map(), metadataListeners = new Map(), files = new Map();
  const file = new HostFile('A.md'); files.set(file.path, file);
  p.app.vault = {
    /** Event registration captures production callbacks without emulating their implementation. */
    on(name, callback) { vaultListeners.set(name, callback); return callback; },
    /** Physical identity disappears before the native delete notification is delivered. */
    getFileByPath(path) { return files.get(path) ?? null; },
  };
  p.app.metadataCache = {
    /** Metadata callback ordering is controlled; source policy remains in production methods. */
    on(name, callback) { metadataListeners.set(name, callback); return callback; },
  };
  p.registerEvent = /** No external event subscription survives this fixture. */ () => {};
  p.managedMetadataWrites = new Map(); p.managedCreatedPaths = new Map(); p.renameMetadataSuppressions = new Map();
  p.managedCreatedFiles = new WeakSet(); p.deletedMarkdownFiles = new WeakSet();
  p.adjustCachedMarkdownFileCount = /** Cached count presentation is outside rebuild admission. */ () => {};
  p.index.invalidateHostStructure = /** Retain admission independently of graph storage or structural algorithms. */ () => {};
  p.index.dematerializeFile = /** Observe delegation to semantic deletion without duplicating that algorithm. */ () => { f.counts.dematerialized++; };
  p.index.insertCreatedFile = /** Successful full publication keeps a genuinely dirty native endpoint available. */ () => {};
  p.index.updateHostFileAvailability = /** A native create can publish availability without granting graph authority. */ () => {};
  p.index.refreshVisiblePresentation = /** Optional visible presentation grants no completion authority. */ async () => {};
  p.index.refreshVisibleHostMetadataPreviews = /** No preview is requested by this owner-only fixture. */ () => false;
  p.registerReactiveIndexListeners();
  return {...f,
    /** Keep a genuine dirty Markdown owner for the dirty-path negative control. */
    changed() { metadataListeners.get('changed')(file); },
    /** A created source is owed until its native deletion retires that exact dirty path. */
    created() { vaultListeners.get('create')(file); },
    /** Delete through Vault's real callback after a preceding metadata notification. */
    deleted() { files.delete(file.path); vaultListeners.get('delete')(file); },
    /** Startup has no complete physical graph, so a new folder remains structural work. */
    folderCreated() { vaultListeners.get('create')(new HostFolder('New folder')); },
  };
}

test('mixed startup and covered metadata backlog cannot compete with source adoption', /** A removed dirty source leaves no Markdown patch for a competing builder to consume. */ async () => {
  const f = eventFixture();
  try {
    f.changed(); f.deleted();
    assert.equal(f.p.dirtyMarkdownPaths.size, 0);
    assert.equal(f.counts.dematerialized, 1, 'The actual delete callback has delegated endpoint removal');
    assert.deepEqual([...f.p.indexBacklogReasons], ['startup:stale-snapshot', 'metadata:changed']);
    await f.interval();
    assert.equal(f.counts.full, 0, 'Covered metadata bookkeeping must not bypass the existing source-adoption owner');
    assert.equal(f.p.initialIndexComplete, false, 'Suppression cannot fabricate initial completion');
    assert.equal(f.p.initialIndexTask, f.initial, 'The pending initial owner remains unchanged');
  } finally { f.close(); }
});

test('covered patch-only metadata deletion remains a zero-path no-op', /** Without startup reasons the existing delete callback already retires the covered backlog. */ async () => {
  const f = eventFixture({reasons: []});
  try {
    f.changed(); f.deleted(); await f.interval();
    assert.equal(f.counts.full, 0); assert.equal(f.p.indexDirty, false);
    assert.equal(f.p.indexBacklogReasons.size, 0); assert.equal(f.p.dirtyMarkdownPaths.size, 0);
  } finally { f.close(); }
});

for (const reason of ['startup:no-snapshot', 'startup:partial-restore-incomplete', 'startup:post-initial-backlog']) {
  test(`covered native create/delete preserves ${reason} ownership`, /** Only the zero-path bookkeeping is suppressed; no pending source adoption is declared complete. */ async () => {
    const f = eventFixture({reasons: [reason]});
    try {
      f.created(); f.deleted(); await f.interval();
      assert.equal(f.counts.full, 0); assert.equal(f.p.dirtyMarkdownPaths.size, 0);
      assert.equal(f.p.indexDirty, true); assert.equal(f.p.initialIndexComplete, false);
      assert.deepEqual([...f.p.indexBacklogReasons], [reason, 'vault:create-markdown']);
    } finally { f.close(); }
  });
}

for (const reason of ['startup:unknown-prerequisite', 'vault:create', 'vault:rename-folder']) {
  test(`zero-path ${reason} remains outside covered startup suppression`, /** New startup labels and genuine structural reasons need positive admission evidence, not a prefix exemption. */ async () => {
    const f = eventFixture({reasons: ['startup:stale-snapshot', reason]});
    try {
      f.changed(); f.deleted(); await f.interval();
      assert.equal(f.counts.full, 1, 'An unqualified reason cannot be consumed as covered bookkeeping');
    } finally { f.close(); }
  });
}

for (const reason of ['coalesced-backlog', 'interval']) {
  test(`covered mixed backlog retains source ownership with ${reason} bookkeeping`, /** Earlier automatic calls can leave their scheduling label without adding a dirty source. */ async () => {
    const f = eventFixture({reasons: ['startup:stale-snapshot', reason]});
    try {
      f.changed(); f.deleted(); await f.interval();
      assert.equal(f.counts.full, 0); assert.equal(f.p.indexDirty, true);
      assert.equal(f.p.initialIndexComplete, false); assert.equal(f.p.initialIndexTask, f.initial);
      assert.deepEqual([...f.p.indexBacklogReasons], ['startup:stale-snapshot', reason, 'metadata:changed']);
    } finally { f.close(); }
  });
}

for (const kind of ['dirty-source', 'new-folder', 'manual']) {
  test(`actual ${kind} retains rebuild admission during source adoption`, /** Genuine changed facts and explicit user work must not disappear behind startup suppression. */ async () => {
    const f = eventFixture();
    try {
      f.changed();
      if (kind !== 'dirty-source') f.deleted();
      if (kind === 'new-folder') f.folderCreated();
      if (kind === 'manual') await f.p.rebuildIndex(true, false, 'explicit');
      else await f.interval();
      assert.equal(f.counts.full, 1, 'A real dirty path, structural event or explicit command remains owed');
    } finally { f.close(); }
  });
}

for (const reason of ['startup:stale-snapshot', 'startup:no-snapshot', 'startup:partial-restore-incomplete', 'startup:initial-index']) {
  test(`automatic ${reason} cannot compete with initial source adoption`, /** Keep startup reasons owned without clearing or falsely completing them. */ async () => {
    const f = fixture({ reasons: [reason] });
    try {
      await f.interval();
      assert.equal(f.counts.full, 0, 'An automatic startup-only backlog cannot pause/restart the source owner with a full rebuild');
      assert.equal(f.p.initialIndexComplete, false);
      assert.equal(f.p.indexDirty, true); assert.deepEqual([...f.p.indexBacklogReasons], [reason]);
      assert.equal(f.p.initialIndexTask, f.initial);
    } finally { f.close(); }
  });
}

for (const [name, options, expected] of [
  ['genuine structural change', { reasons: ['startup:stale-snapshot', 'vault:rename-folder'] }, 1],
  ['genuine dirty path', { reasons: ['startup:stale-snapshot', 'metadata:changed'], dirty: ['A.md'] }, 1],
  ['ordinary cold build', { sourceBacked: false }, 1],
  ['completed startup', { complete: true }, 1],
  ['on-demand refresh', { onDemand: true }, 0],
]) {
  test(`${name} retains its normal owner`, /** Retain validity-bearing work outside the narrow startup-only case. */ async () => {
    const f = fixture(options);
    try { await f.interval(); assert.equal(f.counts.full, expected); assert.equal(f.counts.local, options.onDemand ? 1 : 0); }
    finally { f.close(); }
  });
}

for (const [showNotice, force] of [[true, false], [false, true]]) {
  test(`explicit rebuild notice=${showNotice} force=${force} remains available`, /** User commands retain their existing rebuild semantics. */ async () => {
    const f = fixture();
    try { await f.p.rebuildIndex(showNotice, force, 'explicit'); assert.equal(f.counts.full, 1); }
    finally { f.close(); }
  });
}

test('successful automatic fallback finishes startup after the initial progressive build was cancelled', /** Preserve the incident order without storage delays or a manual second initial call. */ async () => {
  const f = fixture({sourceBacked: false, reasons: ['startup:partial-restore-incomplete']}), {p} = f;
  let hydrated = false, progressive = 0;
  p.initialIndexTask = null; p.rebuildTimer = null; p.metadataStabilized = true;
  p.index.hasPhysicalBaseline = () => hydrated;
  p.index.isFullSnapshotHydrated = () => hydrated;
  p.index.hasRestoredCheckpoint = () => false;
  p.index.hasIncrementalRestorePatch = () => false;
  p.index.hasPendingSemanticPreparation = () => false;
  p.index.hasPendingSearchVocabulary = () => false;
  p.index.indexedMarkdownFileCount = () => 1;
  p.index.rebuildProgressively = async () => { progressive++; return false; };
  p.index.rebuild = async () => { f.counts.full++; hydrated = true; return true; };
  p.scheduleRebuild = () => {};
  try {
    await p.ensureInitialIndex();
    assert.equal(progressive, 1); assert.equal(p.initialIndexComplete, false);
    assert.equal(p.initialIndexTask, null, 'Cancelled initial owner has released its task');
    await p.rebuildIndex(false, false, 'startup:post-initial-backlog');
    assert.equal(p.initialIndexComplete, true);
    assert.equal(p.initialSourceIndexIncomplete, false);
    assert.deepEqual(p.computeIndexStatusFacts(1, false), {upToDate: true, phase: 'ready', indexedFiles: 1, totalFiles: 1});
    await p.ensureInitialIndex();
    assert.equal(f.counts.full, 1, 'Completed fallback needs no additional full rebuild');
  } finally { f.close(); }
});

for (const boundary of ['cancelled', 'partial', 'source-backed', 'unloaded', 'replaced']) {
  test(`${boundary} fallback cannot finish initial startup`, /** Only a successful complete publication from this live index can establish completion. */ async () => {
    const f = fixture({sourceBacked: false, published: true}), {p} = f, index = p.index;
    index.rebuild = async () => {
      f.counts.full++;
      if (boundary === 'partial') index.isFullSnapshotHydrated = () => false;
      if (boundary === 'source-backed') index.hasSourceBackedStartup = () => true;
      if (boundary === 'unloaded') p.unloading = true;
      if (boundary === 'replaced') p.index = {...index};
      return boundary !== 'cancelled';
    };
    try { await p.rebuildIndex(false, false, 'fallback'); assert.equal(p.initialIndexComplete, false); }
    finally { f.close(); }
  });
}

test('a retired source adopter cannot undo a complete concurrent fallback', /** Settle the earlier adopter after the successful canonical publication. */ async () => {
  const f = fixture({published: true, reasons: ['vault:rename-folder']}), {p} = f;
  let settle;
  p.index.adoptStartupSources = () => new Promise(resolve => {settle = resolve;});
  const adoption = p.adoptInitialSourceIndex();
  p.index.rebuild = async () => {p.index.hasSourceBackedStartup = () => false; return true;};
  try {
    await p.rebuildIndex(false, false, 'fallback');
    assert.equal(p.initialIndexComplete, true);
    settle(false); await adoption;
    assert.equal(p.initialIndexComplete, true); assert.equal(p.initialSourceIndexIncomplete, false);
  } finally {settle(false); f.close();}
});

test('new edits during a successful fallback keep their dirty backlog', /** Startup completion does not acknowledge a newer source observation. */ async () => {
  const f = fixture({sourceBacked: false, published: true}), {p} = f;
  p.index.rebuild = async () => {p.indexDirtyRevision++; p.dirtyMarkdownPaths.add('A.md'); return true;};
  p.index.insertCreatedFile = () => {};
  try {
    await p.rebuildIndex(false, false, 'fallback');
    assert.equal(p.initialIndexComplete, true); assert.equal(p.indexDirty, true);
    assert.deepEqual([...p.dirtyMarkdownPaths], ['A.md']);
  } finally {f.close();}
});
