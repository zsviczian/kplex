/**
 * Exercise the actual Properties adapter against native-loader ordering doubles. The host's loader
 * publishes `file` before awaiting its metadata read, so assertions check `modifyingFile` as well.
 * Exact-build native interaction and private-API compatibility remain separate acceptance gates.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { loadPortableModules } from "./support/portableTypeScript.mjs";

const compiled = loadPortableModules(["src/adapters/obsidian/filePropertiesCenter.ts"]);
const { registerFilePropertiesCenter } = compiled.exports;

/** Suspend a real adapter/native-loader boundary without introducing a timing-dependent test. */
function deferred() {
  let resolve;
  const promise = new Promise(/** Retain one explicit completion capability for the test. */ done => { resolve = done; });
  return { promise, resolve };
}

/** Drain bounded promise chains; no product timer or background scheduler is involved. */
async function settle() { for (let index = 0; index < 35; index++) await Promise.resolve(); }

/** Supply only exact native file identity, utility panes, visibility and workspace notifications. */
function fixture() {
  const document = {}, otherDocument = {}, files = new Map(), leaves = [], handlers = new Map(), loads = [];
  const a = { path: "A.md", extension: "md" }, b = { path: "B.md", extension: "md" }, c = { path: "C.md", extension: "md" };
  for (const file of [a, b, c]) files.set(file.path, file);
  const state = { active: null, nativeFile: b, fileEvents: 0, activeChanges: 0, history: ["native-history"], leases: [] };
  /** Model exact owner-document identity and actual bounded pane geometry. */
  const element = (owner = document) => ({ ownerDocument: owner, isConnected: true, shown: true,
    /** Hidden ancestor layout produces an empty native pane rectangle. */
    getBoundingClientRect() { return { width: this.shown ? 300 : 0, height: this.shown ? 500 : 0 }; },
    /** Let a source explicitly declare one nested embedded native leaf. */
    contains(candidate) { return candidate === this || candidate === this.child; },
  });
  /** Construct a native pane without defining any graph/index/source-acquisition capability. */
  const leaf = (type, owner = document) => {
    const value = { pinned: false, bound: false, isDeferred: false, state: { type },
      /** Preserve native pinned state separately from the content view. */
      getViewState() { return { ...this.state, pinned: this.pinned, group: this.bound ? {} : undefined }; },
      /** Hydration is controlled independently from source ownership and visibility. */
      async loadIfDeferred() { this.hydrations = (this.hydrations ?? 0) + 1; if (this.hydration) await this.hydration; this.isDeferred = false; },
    };
    value.view = { containerEl: element(owner), getViewType: /** Preserve stable native view registration IDs. */ () => type };
    leaves.push(value); return value;
  };
  const host = leaf("k-plex-react-view"), properties = leaf("file-properties");
  /** Reproduce verified FileView load ordering, including its incorrect same-file short circuit. */
  const installProperties = target => {
    Object.assign(target.view, { file: null, modifyingFile: null, pauses: new Map(),
      /** A later native load may finish before an older suspended metadata read. */
      async onLoadFile(file) { const pause = this.pauses.get(file); this.pauses.delete(file); if (pause) await pause; this.modifyingFile = file.extension === "md" ? file : null; },
      /** Native public unload also repairs stale metadata after a same-file null short circuit. */
      async onUnloadFile() { this.modifyingFile = null; },
      /** Native unloading clears metadata before resolving its inherited file transition. */
      async loadFile(file) {
        loads.push({ leaf: target, file });
        if (this.file === file) return false;
        if (this.file) await this.onUnloadFile(this.file);
        this.file = null;
        this.file = file;
        if (file) await this.onLoadFile(file);
        return true;
      },
    });
    Object.defineProperty(target.view, "isLeafBoundToFile", { get: /** Pinned and grouped native panes reject unsolicited following. */ () => target.pinned || target.bound });
    return target;
  };
  installProperties(properties);
  const workspace = {
    getMostRecentLeaf: /** Return exact current native leaf identity. */ () => state.active,
    getActiveFile: /** Native document ownership is independent of K-Plex's center. */ () => state.nativeFile,
    getLeavesOfType: /** Existing visible/deferred utility leaves only; no new pane can be created. */ type => leaves.filter(candidate => candidate.view.getViewType() === type),
    /** Preserve real subscription identity for exact teardown assertions. */
    on(name, callback) { const ref = { name, callback }; const values = handlers.get(name) ?? new Set(); values.add(ref); handlers.set(name, values); return ref; },
    /** Removing one lease must not remove another surface's subscriptions. */
    offref(ref) { handlers.get(ref.name)?.delete(ref); },
  };
  const app = { workspace, vault: { getFileByPath: /** Canonical identity rejects renamed/replaced/deleted incarnations. */ path => files.get(path) ?? null } };
  /** Drive actual native events rather than invoking private adapter implementation methods. */
  const emit = (name, value) => { if (name === "file-open") state.fileEvents++; for (const ref of handlers.get(name) ?? []) ref.callback(value); };
  /** A genuine native activation is visible before its asynchronous loader settles. */
  const activate = (target, file = state.nativeFile) => { state.active = target; state.nativeFile = file; state.activeChanges++; emit("active-leaf-change", target); };
  /** Each real mounted App lease supplies its center through a live mutable ref. */
  const register = (source = host, initial = a) => {
    const center = { file: initial, visible: true };
    const lease = registerFilePropertiesCenter(app, source, /** Return only this surface's current rendered central file. */ () => center.file,
      /** Hidden roots retain state without claiming native utility panes. */ () => center.visible);
    state.leases.push(lease); return { center, lease };
  };
  state.active = host;
  return { app, state, document, otherDocument, files, leaves, loads, a, b, c, host, properties, leaf, installProperties, handlers, emit, activate, register,
    /** Dispose every caller-owned root even if a preceding assertion fails. */
    cleanup() { for (const lease of state.leases) lease.dispose(); },
  };
}

test("central file follows in existing main/popout Properties without changing document ownership or history", async () => {
  const f = fixture();
  try {
    const popout = f.installProperties(f.leaf("file-properties", f.otherDocument));
    const { center, lease } = f.register(); await settle();
    assert.equal(f.properties.view.file, f.a); assert.equal(popout.view.modifyingFile, f.a);
    assert.equal(f.state.active, f.host); assert.equal(f.state.nativeFile, f.b);
    assert.deepEqual(f.state.history, ["native-history"]); assert.equal(f.state.fileEvents, 0); assert.equal(f.state.activeChanges, 0);
    const count = f.loads.length; lease.refresh(); await settle(); assert.equal(f.loads.length, count, "same-file presentation changes perform no native read");
    center.file = null; lease.refresh(); await settle();
    assert.equal(f.properties.view.file, null); assert.equal(f.properties.view.modifyingFile, null);
    assert.equal(popout.view.file, null);
  } finally { f.cleanup(); }
});

test("most recently active Plex owns every unbound Properties pane while background center edits remain inert", async () => {
  const f = fixture();
  try {
    const first = f.register(); await settle();
    const otherHost = f.leaf("k-plex-react-view", f.otherDocument), second = f.register(otherHost, f.b); await settle();
    assert.equal(f.properties.view.file, f.a, "mounting another Plex cannot activate it");
    f.activate(otherHost); await settle(); assert.equal(f.properties.view.modifyingFile, f.b);
    first.center.file = f.c; first.lease.refresh(); await settle(); assert.equal(f.properties.view.file, f.b);
    f.activate(f.properties); await settle(); second.center.file = f.c; second.lease.refresh(); await settle();
    assert.equal(f.properties.view.modifyingFile, f.c, "focusing Properties retains its most recent Plex owner");
    const native = f.leaf("markdown"); f.activate(native, f.a); await f.properties.view.loadFile(f.a); await settle();
    second.center.file = f.b; second.lease.refresh(); await settle(); assert.equal(f.properties.view.file, f.a, "native content activation returns following to Obsidian");
  } finally { f.cleanup(); }
});

test("own accepted loads serialize and collapse rapid A-B-A center changes without reviving an obsolete B request", async () => {
  const f = fixture();
  try {
    const hold = deferred(); f.properties.view.pauses.set(f.a, hold.promise);
    const { center, lease } = f.register(); await settle();
    assert.equal(f.loads.length, 1); assert.equal(f.properties.view.file, f.a);
    center.file = f.b; lease.refresh(); center.file = f.a; lease.refresh(); await settle();
    assert.equal(f.loads.length, 1, "a second adapter load cannot run while A is accepted");
    hold.resolve(); await settle(); assert.equal(f.properties.view.modifyingFile, f.a);
    assert.deepEqual(f.loads.map(item => item.file), [f.a]);
  } finally { f.cleanup(); }
});

test("a held older read repairs the real native same-file metadata trap after foreign activation", async () => {
  const f = fixture();
  try {
    const hold = deferred(); f.properties.view.pauses.set(f.a, hold.promise); f.register(); await settle();
    const native = f.leaf("markdown"); f.activate(native, f.b);
    await f.properties.view.loadFile(f.b);
    assert.equal(f.properties.view.file, f.b); assert.equal(f.properties.view.modifyingFile, f.b);
    hold.resolve(); await settle();
    assert.equal(f.properties.view.file, f.b); assert.equal(f.properties.view.modifyingFile, f.b);
    assert.deepEqual(f.loads.map(item => item.file), [f.a, f.b, null, f.b], "same-file stale metadata requires a clear before fresh native-target reload");
    assert.equal(f.state.active, native); assert.equal(f.state.fileEvents, 0);
  } finally { f.cleanup(); }
});

test("fresh authority is reacquired between clear and reload instead of restoring captured foreign B over C", async () => {
  const f = fixture();
  try {
    const hold = deferred(); f.properties.view.pauses.set(f.a, hold.promise); f.register(); await settle();
    const native = f.leaf("markdown"); f.activate(native, f.b); await f.properties.view.loadFile(f.b);
    const original = f.properties.view.loadFile;
    f.properties.view.loadFile = async function(file) {
      const result = await original.call(this, file);
      if (file === null) f.activate(native, f.c);
      return result;
    };
    hold.resolve(); await settle();
    assert.equal(f.properties.view.file, f.c); assert.equal(f.properties.view.modifyingFile, f.c);
    assert.deepEqual(f.loads.map(item => item.file), [f.a, f.b, null, f.c]);
  } finally { f.cleanup(); }
});

test("pinned, group-bound, hidden and replaced destinations decline including deferred completion", async () => {
  const f = fixture();
  try {
    f.properties.pinned = true;
    const grouped = f.installProperties(f.leaf("file-properties")); grouped.bound = true; grouped.isDeferred = true;
    const hidden = f.installProperties(f.leaf("file-properties")); hidden.view.containerEl.shown = false; hidden.isDeferred = true;
    const deferredPane = f.installProperties(f.leaf("file-properties")); deferredPane.isDeferred = true;
    const hydration = deferred(); deferredPane.hydration = hydration.promise;
    f.register(); await settle(); assert.equal(f.loads.length, 0); assert.equal(hidden.hydrations, undefined);
    assert.equal(grouped.hydrations, undefined, "group-bound deferred panes are not hydrated");
    deferredPane.pinned = true; hydration.resolve(); await settle(); assert.equal(f.loads.length, 0);
    f.properties.pinned = false; f.emit("layout-change"); await settle(); assert.equal(f.properties.view.file, f.a);
    const hold = deferred(); f.properties.view.pauses.set(f.b, hold.promise);
    f.state.leases[0].dispose(); const second = f.register(f.host, f.b); await settle();
    const previous = f.properties.view; f.properties.view = { ...previous, getViewType: () => "markdown" };
    second.center.file = f.c; second.lease.refresh(); hold.resolve(); await settle();
    assert.equal(f.properties.view.file, f.b, "a retired native view cannot write its replacement");
    assert.equal(previous.modifyingFile, f.b, "the accepted host loader can complete only against its captured view");
  } finally { f.cleanup(); }
});

test("deferred visible Properties hydrate once and reject a source migration while hydration is held", async () => {
  const f = fixture();
  try {
    f.properties.isDeferred = true; const hold = deferred(); f.properties.hydration = hold.promise;
    f.register(); await settle(); assert.equal(f.properties.hydrations, 1);
    f.host.view.containerEl.ownerDocument = f.otherDocument; hold.resolve(); await settle();
    assert.equal(f.loads.length, 0, "the source registration belongs to its opening document");
  } finally { f.cleanup(); }
});

test("same-path file replacement retires the old TFile and then adopts only the new canonical incarnation", async () => {
  const f = fixture();
  try {
    const hold = deferred(); f.properties.view.pauses.set(f.a, hold.promise);
    const { center, lease } = f.register(); await settle();
    const replacement = { path: "A.md", extension: "md" }; f.files.set(replacement.path, replacement); lease.refresh(); hold.resolve(); await settle();
    assert.equal(f.properties.view.file, null, "a still-rendered obsolete TFile cannot be treated as canonical");
    center.file = replacement; lease.refresh(); await settle(); assert.equal(f.properties.view.modifyingFile, replacement);
  } finally { f.cleanup(); }
});

test("root disposal removes listeners but repairs an already accepted load against current native ownership", async () => {
  const f = fixture();
  try {
    const hold = deferred(); f.properties.view.pauses.set(f.a, hold.promise);
    const { lease } = f.register(); await settle(); lease.dispose();
    assert.equal([...f.handlers.values()].reduce((sum, entries) => sum + entries.size, 0), 0);
    const native = f.leaf("markdown"); f.activate(native, f.c); await f.properties.view.loadFile(f.c);
    hold.resolve(); await settle(); assert.equal(f.properties.view.modifyingFile, f.c); assert.equal(f.state.active, native);
    lease.dispose(); assert.equal([...f.handlers.values()].reduce((sum, entries) => sum + entries.size, 0), 0);
  } finally { f.cleanup(); }
});

test("closing a destination cancels queued repair and later root registration retains accepted-load serialization", async () => {
  const f = fixture();
  try {
    const hold = deferred(); f.properties.view.pauses.set(f.a, hold.promise);
    const first = f.register(); await settle(); first.lease.dispose();
    const second = f.register(f.host, f.b); await settle(); assert.equal(f.loads.length, 1);
    f.properties.view.containerEl.isConnected = false; hold.resolve(); await settle();
    assert.equal(f.loads.length, 1, "closing a pane must not start another native read");
    second.lease.dispose();
  } finally { f.cleanup(); }
});

test("native null-file observation after an ItemView activation is repaired without another file-open event", async () => {
  const f = fixture();
  try {
    f.register(); await settle();
    const native = f.properties.view.loadFile(null); f.emit("file-open", null); await native; await settle();
    assert.equal(f.properties.view.modifyingFile, f.a); assert.equal(f.state.fileEvents, 1);
    const count = f.loads.length; f.emit("file-open", f.a); await settle(); assert.equal(f.loads.length, count, "matching native notifications cause no redundant read");
  } finally { f.cleanup(); }
});

test("attachment and Bases centers use the native unsupported-file state without a metadata repair loop", async () => {
  const f = fixture();
  try {
    const png = { path: "Image.png", extension: "png" }, base = { path: "test base.base", extension: "base" };
    f.files.set(png.path, png); f.files.set(base.path, base);
    const { center, lease } = f.register(f.host, png); await settle();
    assert.equal(f.properties.view.file, png); assert.equal(f.properties.view.modifyingFile, null);
    assert.deepEqual(f.loads.map(item => item.file), [png]);
    center.file = base; lease.refresh(); await settle();
    assert.equal(f.properties.view.file, base); assert.equal(f.properties.view.modifyingFile, null);
    assert.deepEqual(f.loads.map(item => item.file), [png, base]);
    center.file = null; lease.refresh(); await settle(); assert.equal(f.properties.view.file, null);
    assert.deepEqual(f.loads.map(item => item.file), [png, base, null]);
  } finally { f.cleanup(); }
});

test("an old Markdown read completing after a native null clear repairs the empty metadata editor", async () => {
  const f = fixture();
  try {
    const hold = deferred(); f.properties.view.pauses.set(f.a, hold.promise);
    const { center, lease } = f.register(); await settle();
    await f.properties.view.loadFile(null); center.file = null; lease.refresh();
    hold.resolve(); await settle();
    assert.equal(f.properties.view.file, null); assert.equal(f.properties.view.modifyingFile, null);
    assert.deepEqual(f.loads.map(item => item.file), [f.a, null], "public unload repairs metadata because native loadFile(null) would short-circuit");
  } finally { f.cleanup(); }
});

test("a successful accepted A read clobbered by native null-file activation reloads the still-owned A", async () => {
  const f = fixture();
  try {
    const hold = deferred(); f.properties.view.pauses.set(f.a, hold.promise);
    f.register(); await settle();
    await f.properties.view.loadFile(null); f.emit("file-open", null);
    hold.resolve(); await settle();
    assert.equal(f.properties.view.file, f.a); assert.equal(f.properties.view.modifyingFile, f.a);
    assert.deepEqual(f.loads.map(item => item.file), [f.a, null, f.a], "successful metadata proves a native clear race rather than a failed read");
  } finally { f.cleanup(); }
});

test("native swallowed read failure stops an unchanged request and retries only on a later refresh", async () => {
  const f = fixture();
  try {
    f.properties.view.loadFile = async function(file) { f.loads.push({ leaf: f.properties, file }); this.file = null; this.modifyingFile = null; return false; };
    const { center, lease } = f.register(); await settle(); assert.equal(f.loads.length, 1);
    await settle(); assert.equal(f.loads.length, 1, "no timer, retry loop or repeated error notices");
    lease.refresh(); await settle(); assert.equal(f.loads.length, 2);
    center.file = f.b; lease.refresh(); await settle(); assert.equal(f.loads.length, 3);
    assert.deepEqual(f.loads.map(item => item.file), [f.a, f.a, f.b]);
  } finally { f.cleanup(); }
});

test("resolved native refusal cannot spin through an unchanged Properties repair intent", async t => {
  for (const state of ["stale same-file metadata", "foreign file", "wrong metadata after load"]) {
    await t.test(state, async () => {
      const f = fixture();
      try {
        const original = f.properties.view.loadFile;
        f.properties.view.file = state === "stale same-file metadata" ? f.a : f.b;
        f.properties.view.modifyingFile = f.b;
        f.properties.view.loadFile = async function(file) {
          f.loads.push({ leaf: f.properties, file });
          if (state === "wrong metadata after load") this.file = file;
          f.emit("layout-change"); f.emit("file-open", this.file);
          // Bound the old implementation's infinite microtask loop so a regression fails safely.
          if (f.loads.length === 12) this.containerEl.isConnected = false;
          return false;
        };
        const { center, lease } = f.register(); await settle();
        assert.ok(f.loads.length <= 3, `unchanged intent performed ${f.loads.length} native calls`);
        const count = f.loads.length;
        f.emit("layout-change"); f.emit("file-open", f.properties.view.file); await settle();
        assert.equal(f.loads.length, count, "native event noise does not restart a rejected repair");
        lease.refresh(); await settle();
        assert.ok(f.loads.length > count && f.loads.length <= count + 3, "a genuine refresh permits one bounded repair sequence");
        f.properties.view.loadFile = original; center.file = f.c; lease.refresh(); await settle();
        assert.equal(f.properties.view.file, f.c); assert.equal(f.properties.view.modifyingFile, f.c);
      } finally { f.cleanup(); }
    });
  }
});

test("a newer center arriving during the final bounded repair retains the accepted native queue", async () => {
  const f = fixture();
  try {
    const hold = deferred(), original = f.properties.view.loadFile;
    f.properties.view.loadFile = async function(file) {
      f.loads.push({ leaf: f.properties, file });
      if (f.loads.length === 3) await hold.promise;
      this.file = f.b; this.modifyingFile = f.b;
      return false;
    };
    const { center, lease } = f.register(); await settle(); assert.equal(f.loads.length, 3);
    center.file = f.c; lease.refresh(); await settle();
    assert.equal(f.loads.length, 3, "the new center cannot overlap an accepted native request");
    f.properties.view.loadFile = original; hold.resolve(); await settle();
    assert.deepEqual(f.loads.map(item => item.file), [f.a, f.a, f.a, f.c]);
    assert.equal(f.properties.view.file, f.c); assert.equal(f.properties.view.modifyingFile, f.c);
  } finally { f.cleanup(); }
});

test("read-error layout/file-open noise cannot retry a failed file until an explicit center intent", async () => {
  const f = fixture();
  try {
    f.properties.view.loadFile = async function(file) {
      f.loads.push({ leaf: f.properties, file }); this.file = null; this.modifyingFile = null;
      f.emit("layout-change"); f.emit("file-open", null);
      return false;
    };
    const { center, lease } = f.register(); await settle(); assert.equal(f.loads.length, 1);
    f.emit("layout-change"); f.emit("file-open", null); f.activate(f.properties); await settle();
    assert.equal(f.loads.length, 1, "automatic native failure/header notifications cannot repeat the read");
    lease.refresh(); await settle(); assert.equal(f.loads.length, 2, "an explicit center refresh permits one new attempt");
    f.emit("layout-change"); await settle(); assert.equal(f.loads.length, 2);
    center.file = f.b; lease.refresh(); await settle(); assert.equal(f.loads.length, 3);
    f.activate(f.leaf("markdown"), f.c); f.activate(f.host); await settle();
    assert.equal(f.loads.length, 4, "genuine content-owner reactivation permits one attempt");
  } finally { f.cleanup(); }
});

test("a later successful native load clears the failure latch so normal native-clear repair still works", async () => {
  const f = fixture();
  try {
    const original = f.properties.view.loadFile;
    f.properties.view.loadFile = async function(file) { f.loads.push({ leaf: f.properties, file }); this.file = null; this.modifyingFile = null; f.emit("layout-change"); return false; };
    f.register(); await settle(); assert.equal(f.loads.length, 1);
    f.properties.view.loadFile = original;
    await original.call(f.properties.view, f.a); f.emit("file-open", f.a); await settle();
    const count = f.loads.length;
    await original.call(f.properties.view, null); f.emit("file-open", null); await settle();
    assert.equal(f.loads.length, count + 2); assert.equal(f.properties.view.modifyingFile, f.a);
  } finally { f.cleanup(); }
});

test("a newer center can proceed after an older native read fails instead of being mistaken for a retry", async () => {
  const f = fixture();
  try {
    const hold = deferred(), original = f.properties.view.loadFile;
    f.properties.view.loadFile = async function(file) {
      if (file !== f.a) return original.call(this, file);
      f.loads.push({ leaf: f.properties, file }); await hold.promise; this.file = null; this.modifyingFile = null; return false;
    };
    const { center, lease } = f.register(); await settle(); center.file = f.b; lease.refresh(); hold.resolve(); await settle();
    assert.deepEqual(f.loads.map(item => item.file), [f.a, f.b]); assert.equal(f.properties.view.modifyingFile, f.b);
  } finally { f.cleanup(); }
});

test("newly pinned or grouped panes repair their native target after overlap without adopting the newer Plex center", async () => {
  for (const binding of ["pinned", "bound"]) {
    const f = fixture();
    try {
      const hold = deferred(); f.properties.view.pauses.set(f.a, hold.promise);
      const { center, lease } = f.register(); await settle();
      await f.properties.view.loadFile(f.b); f.properties[binding] = true;
      center.file = f.c; lease.refresh(); hold.resolve(); await settle();
      assert.equal(f.properties.view.file, f.b); assert.equal(f.properties.view.modifyingFile, f.b);
      assert.deepEqual(f.loads.map(item => item.file), [f.a, f.b, null, f.b]);
    } finally { f.cleanup(); }
  }
});

test("destination document migration retires the captured loader's queued repair", async () => {
  const f = fixture();
  try {
    const hold = deferred(); f.properties.view.pauses.set(f.a, hold.promise);
    const { center, lease } = f.register(); await settle();
    f.properties.view.containerEl.ownerDocument = f.otherDocument;
    center.file = f.b; lease.refresh(); hold.resolve(); await settle();
    assert.deepEqual(f.loads.map(item => item.file), [f.a], "the captured Properties document must match after every await");
  } finally { f.cleanup(); }
});

test("actual App effects lease rendered central identity and dispose the exact native follower", async () => {
  const source = ts.createSourceFile("src/ui/App.tsx", readFileSync(new URL("../src/ui/App.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const effects = [];
  /** Extract the production hook callbacks without duplicating their host ownership behavior. */
  const visit = node => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect"
      && node.arguments[0]?.getText(source).includes("propertiesCenterLease.current")) effects.push(node.arguments[0].getText(source));
    ts.forEachChild(node, visit);
  };
  visit(source); assert.equal(effects.length, 2);
  const f = fixture(), center = { current: f.a }, leaseRef = { current: null };
  const plugin = { app: f.app, isKplexLeafVisible: () => true };
  /** Run the exact App callback against the actual adapter with bounded native collaborators. */
  const invoke = expression => {
    const text = ts.transpileModule(`const effect = ${expression}`, { compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.None } }).outputText;
    return Function("plugin", "hostLeaf", "propertiesCenterFile", "propertiesCenterLease", "registerFilePropertiesCenter", `${text};return effect();`)(plugin, f.host, center, leaseRef, registerFilePropertiesCenter);
  };
  let release;
  try {
    release = invoke(effects[0]); await settle(); assert.equal(f.properties.view.modifyingFile, f.a);
    center.current = f.c; invoke(effects[1]); await settle(); assert.equal(f.properties.view.modifyingFile, f.c);
    release(); release = null; assert.equal(leaseRef.current, null);
    assert.equal([...f.handlers.values()].reduce((sum, entries) => sum + entries.size, 0), 0);
    assert.equal(f.state.fileEvents, 0); assert.equal(f.state.activeChanges, 0);
  } finally { release?.(); f.cleanup(); }
});
