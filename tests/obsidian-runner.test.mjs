/**
 * Tests K-Plex strict host-runner staging and failure paths with injected filesystem/CLI doubles.
 * Canonical command and DOM expectations match production; these tests do not launch Obsidian.
 */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { runObsidianVerification, validateTarget } from "../scripts/testing/obsidian/runner.mjs";
import { createWaitTimingProbe } from "../scripts/testing/obsidian/waitTiming.mjs";
import { npmInvocation, obsidianCliExecutable, spawnNativeSync } from "../scripts/testing/obsidian/processTools.mjs";
import { browserExecutable } from "./support/browserExecutable.mjs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { startupCacheIdentity } from "../scripts/testing/obsidian/startupCacheIdentity.mjs";
import { startupRetainedMemory } from "../scripts/testing/obsidian/startupRetainedMemory.mjs";
import {nativeDocumentSessions,withNativeDocumentSessions} from "../scripts/testing/obsidian/nativeDocumentSessions.mjs";
import ts from "typescript";

test("native fixture session tools disable explicit owners and serialize only native scalar state through lexical probes",async()=>{
  const calls=[],a={id:"A",view:{documentSession:{ownerId:"A"},getViewType:()=>"k-plex-react-view",getState:()=>({plexSession:{version:1,ownerId:"A",centerPath:"A.md"}})}},b={id:"B",view:{getViewType:()=>"k-plex-sidepanel-view",getState:()=>({plexSession:{version:1,ownerId:"B",centerPath:"B.md"}})}};
  const plugin={app:{workspace:{getLeafById:id=>id==="A"?a:id==="B"?b:null,getLeavesOfType:type=>type==="k-plex-react-view"?[a]:[b]}},settings:{documentSyncMode:"pinned"},setDocumentSyncMode:async(host,mode)=>calls.push([host,mode])};
  const tools=nativeDocumentSessions(plugin);await tools.off();assert.deepEqual(calls,[[a,"off"],[b,"off"]]);assert.equal(plugin.settings.documentSyncMode,"off");
  const context={plugin};const result=runInNewContext(withNativeDocumentSessions("(()=>{const later=()=>documentSessions(plugin).capture();return later()})()"),context);
  assert.deepEqual(JSON.parse(JSON.stringify(result)),tools.capture());assert.equal(context.documentSessions,undefined,"No renderer maintenance global may leak");
  assert(!JSON.stringify(result).includes("footprints"));
  assert.deepEqual(tools.capture().map(value=>value.id),["A","B"],"Deferred native shells have no documentSession; use verified native identity");
});

test("native gate setup binds foreground-only pages into the canonical patch baseline", () => {
  const source = readFileSync(new URL("../scripts/testing/obsidian/interactionGateCounts.mjs", import.meta.url), "utf8");
  const start = source.indexOf("c.fixtureBindings=[];");
  const end = source.indexOf("c.setupAttempts=[];", start);
  assert(start >= 0 && end > start, "Actual native fixture-binding block missing");
  const files = new Map(["Published.md", "Foreground.md", "Absent.md"].map(path => [path, {path}]));
  const published = {file: files.get("Published.md")};
  const pages = new Map([["Published.md", published]]);
  const foreground = {file: files.get("Foreground.md")};
  const inserted = [];
  const index = {
    state: {pages},
    get: path => pages.get(path) ?? (path === "Foreground.md" ? foreground : undefined),
    /** Match the existing insertion owner's idempotent exact-file identity contract. */
    insertCreatedFile(file) {
      inserted.push(file.path);
      if (pages.get(file.path)?.file !== file) pages.set(file.path, {file});
      return pages.get(file.path);
    },
  };
  const c = {check: (condition, message) => assert.ok(condition, message)};
  runInNewContext(source.slice(start, end), {ownedMarkdown: [...files.keys()], p: {index}, app: {vault: {getFileByPath: path => files.get(path)}}, c});
  assert.deepEqual(inserted, [...files.keys()]);
  assert.equal(pages.get("Published.md"), published, "An existing canonical page must remain intact");
  assert.deepEqual(JSON.parse(JSON.stringify(c.fixtureBindings[1])), {
    path: "Foreground.md", canonicalBefore: false, readableBefore: true, canonicalAfter: true,
  });
  assert([...files].every(([path, file]) => pages.get(path)?.file === file));
});

test("native theme helpers wrap chainable Obsidian Settings instead of assimilating their then method", async () => {
  const source = ts.createSourceFile("colorStyling.mjs", readFileSync(new URL("../scripts/testing/obsidian/colorStyling.mjs", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let initializer;
  /** Extract the actual native helper; a second implementation would miss this Promise boundary. */
  const visit = node => {if (ts.isVariableDeclaration(node) && node.name.getText(source) === "openVisual") initializer = node.initializer.getText(source); ts.forEachChild(node, visit);};
  visit(source); assert(initializer);
  let thenCalls = 0;
  const setting = {settingEl: {isConnected: true}, controlEl: {querySelector: () => ({})},
    /** Mirror the installed Setting.then chaining contract, with a finite failure if accidentally assimilated. */
    then(callback) {if (++thenCalls > 3) throw new Error("Native Setting was assimilated"); callback(this); return this;}};
  const c = {themeNativeRow: setting}, app = {setting: {isOpen: false, close() {this.isOpen = false;}}};
  const environment = {app, c, wait: async () => {}, native: {show() {}, focus() {}, webContents: {focus() {}}},
    document: {hidden: false, hasFocus: () => true}, p: {openSettings() {app.setting.isOpen = true;}, translator: value => value},
    tab: {containerEl: {isConnected: true}, openSettingsPage: () => true}, check: assert,
    until: async predicate => {assert(predicate());}};
  const openVisual = runInNewContext(`(${initializer})`, environment);
  const handle = await openVisual(); assert.equal(handle.setting, setting); assert.equal(thenCalls, 0);
});

test("retained-memory probe rejects unapproved targets before native access", /** Keep observations inside explicit disposable-vault scope. */ async () => {
  const app={vault:{getName:/** Refuse this synthetic unapproved target. */ ()=>"unapproved"}};
  await assert.rejects(startupRetainedMemory(app,"unapproved"),/Explicit disposable vault/);
  await assert.rejects(startupRetainedMemory(app,"kplex-test-small"),/Explicit disposable vault/);
});

test("startup cache identities distinguish payload changes, source ABA and interrupted selections", /** Test observation identities; native IDB behavior is exercised by disposable-vault identity trials. */ async () => {
  const state = { sequence: 3, meta: { key: "active", schema: 3, generation: "first", createdAt: 1,
    vaultSignature: "physical", settingsSignature: "policy", discoveredFields: [] },
    pages: [{ path: "private-test-owner.md", relations: [{ targetPath: "other.md" }] }],
    evidence: [{ sourcePath: "private-test-owner.md", targetPath: "other.md", direction: "positive" }],
    heads: [{ sourceId: "private-test-owner.md", sourceRevision: "selected-one", sequence: 3 }], invalid: 0 };
  const cache = {
    /** Deliver readonly transaction completion after its original request success. */
    async open() { return { transaction() {
      const tx = new EventTarget();tx.objectStore = /** Model only this observation's native sequence request. */ () => ({ get() {
        const request = new EventTarget();
        queueMicrotask(/** Complete one scalar transaction without retaining source payloads. */ () => {
          request.result = { key: "source-sequence", value: state.sequence };
          request.dispatchEvent(new Event("success"));tx.dispatchEvent(new Event("complete"));
        });return request;
      } });return tx;
    } }; },
    /** Return independent pointer metadata, like the real cache boundary. */
    async readSnapshotMeta() { return structuredClone(state.meta); },
    /** Forward ordered graph records without materializing a second graph. */
    async iterateSnapshotPages(_meta, visit) { for (const row of state.pages) visit(row);return true; },
    /** Preserve negative evidence and duplicate declaration contributions. */
    async iterateSnapshotEvidence(_meta, visit) { for (const row of state.evidence) visit(row);return true; },
    sources: { /** Finish one selected-head page followed by its real end marker. */
      async headPage(after) { return { available: true, heads: after === null ? state.heads : [], invalid: state.invalid,
        next: after === null ? "end" : null }; } },
  };
  const first = await startupCacheIdentity(cache, createHash);
  assert(!JSON.stringify(first).includes("private-test-owner.md"));
  state.meta.generation = "second";state.meta.createdAt = 2;
  const second = await startupCacheIdentity(cache, createHash);
  assert.deepEqual(second.graph, first.graph, "Activation metadata cannot manufacture a graph difference");
  assert.notDeepEqual(second.activation, first.activation);
  state.evidence.push({ ...state.evidence[0], direction: "negative" });
  const changed = await startupCacheIdentity(cache, createHash);
  assert.notEqual(changed.graph.evidence.sha256, first.graph.evidence.sha256);
  assert.equal(changed.graph.evidence.records, 2, "Multiplicity is retained");
  state.heads[0].sourceRevision = "different-incarnation";
  assert.notEqual((await startupCacheIdentity(cache, createHash)).sources.heads.sha256, first.sources.heads.sha256,
    "A reused sequence cannot conceal a different source incarnation");
  const pages = cache.iterateSnapshotPages;
  cache.iterateSnapshotPages = /** Simulate a real writer crossing an asynchronous cache read. */ async (...args) => { state.sequence++;return pages(...args); };
  await assert.rejects(startupCacheIdentity(cache, createHash), /Input selection changed/);
  cache.iterateSnapshotPages = pages;state.invalid = 1;
  await assert.rejects(startupCacheIdentity(cache, createHash), /Unreadable source/);
  state.invalid=0;
  state.pages[0].semanticSignature='canonical-original';
  state.heads[0].state='complete';state.heads[0].physical={path:'private-test-owner.md'};
  state.pages.push({path:'second-test-owner.md',semanticSignature:'canonical-second',relations:[]});
  state.heads.push({sourceId:'second-test-owner.md',sourceRevision:'selected-two',sequence:3,state:'complete',physical:{path:'second-test-owner.md'}});
  const fingerprints=new Map([['private-test-owner.md','canonical-original'],['second-test-owner.md','canonical-second']]);
  const semantic=await startupCacheIdentity(cache,createHash,fingerprints);
  assert.equal(semantic.semanticInputs.records,2);
  state.pages.reverse();
  const reordered=await startupCacheIdentity(cache,createHash,new Map([...fingerprints].reverse()));
  assert.deepEqual(reordered.semanticInputs,semantic.semanticInputs,'Input identity ignores live map and saved-page traversal order');
  assert.notDeepEqual(reordered.graph.pages,semantic.graph.pages,'Raw stored-record ordering remains visible');
  const order=[...fingerprints.keys()];
  const replay=await startupCacheIdentity(cache,createHash,fingerprints,()=>true,()=>order);
  const reversedReplay=await startupCacheIdentity(cache,createHash,fingerprints,()=>true,()=>[...order].reverse());
  assert.deepEqual(replay.semanticInputs,reversedReplay.semanticInputs,'Per-owner equality stays independently visible');
  assert.notDeepEqual(replay.hostReplayInputs,reversedReplay.hostReplayInputs,'Actual compiler encounter order remains a distinct input');
  let selections=0;
  await assert.rejects(startupCacheIdentity(cache,createHash,fingerprints,()=>true,()=>++selections===1?order:[...order].reverse()),/Host replay order changed/);
  state.meta.discoveredFields=[['later',{name:'Later',count:1}]];
  const discovery=await startupCacheIdentity(cache,createHash,fingerprints);
  assert.deepEqual(discovery.configuration,semantic.configuration,'Derived discovery order/content stays distinct from semantic settings identity');
  assert.notDeepEqual(discovery.graph.policy,semantic.graph.policy,'Raw policy metadata changes remain preserved');
  fingerprints.set('private-test-owner.md','different');
  await assert.rejects(startupCacheIdentity(cache,createHash,fingerprints),/Live fingerprints do not match/);
  fingerprints.set('private-test-owner.md','canonical-original');
  state.heads[0].state='tombstone';
  await assert.rejects(startupCacheIdentity(cache,createHash,fingerprints),/lack complete source-head coverage/);
  await assert.rejects(startupCacheIdentity(cache,createHash,fingerprints,/** Represent a retired live graph inspection. */ ()=>false),/Input selection changed/);
});

test("Windows large eval preserves literal code and retires its temporary script on success/failure", () => {
  const code = 'JSON.stringify({quoted:"literal \\\"quotes\\\"",path:"C:\\\\fixture",lines:"a\\nb"})' + " ".repeat(40_000);
  const options = { timeout: 30_000, encoding: "utf8" };
  let path;
  const spawn = (file, args, passedOptions) => {
    assert.equal(file, "Obsidian.com"); assert.equal(passedOptions, options);
    assert.equal(args[0], "vault=kplex-test-small"); assert.equal(args[1], "eval");
    assert(args[2].length < 1000);
    const require = createRequire(import.meta.url);
    const read = require("node:fs").readFileSync;
    const payload = runInNewContext(args[2].slice(5), { require: () => ({ readFileSync: (script, encoding) => {
      path = script; return read(script, encoding);
    } }) });
    assert.equal(payload, runInNewContext(code));
    return { status: 0, stdout: payload };
  };
  assert.equal(spawnNativeSync("Obsidian.com", ["vault=kplex-test-small", "eval", `code=${code}`], options, { platform: "win32", spawn }).status, 0);
  assert.equal(existsSync(path), false);
  assert.throws(() => spawnNativeSync("Obsidian.com", ["vault=kplex-test-small", "eval", `code=${code}`], options, {
    platform: "win32", spawn: (...args) => { spawn(...args); throw new Error("transport failed"); },
  }), /transport failed/);
  assert.equal(existsSync(path), false);
});

test("short Windows and large macOS commands keep argument/result identity", () => {
  for (const [platform, code] of [["win32", "true"], ["darwin", " ".repeat(40_000) + "true"]]) {
    const args = ["vault=kplex-test-small", "eval", `code=${code}`], options = {}, result = { status: 0 };
    assert.equal(spawnNativeSync("obsidian", args, options, { platform, spawn: (file, forwarded, passedOptions) => {
      assert.equal(forwarded, args); assert.equal(passedOptions, options); return result;
    } }), result);
  }
});

test("Windows multiline controllers use a single-line transport even when the code is short", () => {
  const source = '(\n()=>JSON.stringify({ok:true})\n)()';
  const result = spawnNativeSync("Obsidian.com", ["vault=kplex-test-small", "eval", `code=${source}`], {}, {
    platform: "win32", spawn: (file, args) => {
      assert(!/[\r\n]/.test(args[2]));
      return runInNewContext(args[2].slice(5), { require: createRequire(import.meta.url) });
    },
  });
  assert.equal(result, '{"ok":true}');
});

test("desktop CLI discovery honors overrides and selects Windows console and macOS launchers", () => {
  const env = { PROGRAMFILES: "C:/Program Files", LOCALAPPDATA: "C:/Users/Test/AppData/Local" };
  const console = join(env.PROGRAMFILES, "Obsidian", "Obsidian.com");
  assert.equal(obsidianCliExecutable(env, "win32", path => path === console), console);
  assert.equal(obsidianCliExecutable({ KPLEX_OBSIDIAN_CLI: "custom cli" }, "win32", () => false), "custom cli");
  assert.equal(obsidianCliExecutable({}, "darwin", () => true), "/Applications/Obsidian.app/Contents/MacOS/obsidian-cli");
  assert.equal(obsidianCliExecutable({}, "linux", () => false), "obsidian");
});

test("portable verification invokes npm-cli.js with the same Node and preserves spaces", () => {
  const npm = "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js", node = "C:/Program Files/nodejs/node.exe";
  assert.deepEqual(npmInvocation({ npm_execpath: npm }, node, path => path === npm), { file: node, args: [npm, "run", "verify"] });
  const adjacent = join("C:/tools", "node_modules", "npm", "bin", "npm-cli.js");
  assert.equal(npmInvocation({}, "C:/tools/node.exe", path => path === adjacent).args[0], adjacent);
  assert.throws(() => npmInvocation({}, node, () => false), /Cannot locate npm-cli.js/);
});

test("browser discovery supports Windows Edge and explicit paths without silent fallback", () => {
  const env = { "PROGRAMFILES(X86)": "C:/Program Files (x86)" };
  const edge = join(env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe");
  assert.equal(browserExecutable(env, "win32", path => path === edge), edge);
  assert.equal(browserExecutable({ KPLEX_TEST_BROWSER: "missing custom browser" }, "win32", () => false), "missing custom browser");
  assert.equal(browserExecutable({}, "linux", () => false), null);
});

test("native wait probe preserves exact promise/value/rejection identity and counts completion", async () => {
  let time = 0, resolve;
  const probe = createWaitTimingProbe({ now: () => time, phase: () => "source:checking" });
  const original = new Promise(done => { resolve = done; });
  assert.equal(probe.observe("yield", "timer", () => original), original);
  time = 5; resolve("same result"); assert.equal(await original, "same result");
  const reason = new Error("same rejection"), rejected = Promise.reject(reason);
  assert.equal(probe.observe("transaction", "readonly:sourceHeads", () => rejected), rejected);
  time = 8; await assert.rejects(rejected, error => error === reason);
  assert.equal(probe.observe("digest", "sha256", () => 42), 42);
  assert.throws(() => probe.observe("transaction", "throw", () => { throw reason; }), error => error === reason);
  const report = probe.stop(), rows = Object.values(report.groups);
  assert.equal(rows.reduce((n, row) => n + row.calls, 0), 4);
  assert.equal(rows.reduce((n, row) => n + row.completed, 0), 4);
  assert.equal(rows.reduce((n, row) => n + row.rejected, 0), 2);
  assert.equal(rows.reduce((n, row) => n + row.synchronousThrows, 0), 1);
  assert.deepEqual(report.active, [0, 0, 0]);
});

test("native wait probe separates overlapping intervals and real phase transitions", async () => {
  let time = 0, phase = "source:host", resolveTransaction, resolveYield;
  const probe = createWaitTimingProbe({ now: () => time, phase: () => phase });
  const transaction = new Promise(done => { resolveTransaction = done; });
  const yielding = new Promise(done => { resolveYield = done; });
  probe.observe("transaction", "readonly:sourceChunks", () => transaction);
  time = 1; probe.observe("yield", "timer", () => yielding);
  time = 3; probe.checkpoint(); phase = "source:reconciliation"; probe.checkpoint();
  time = 4; resolveYield(); await yielding;
  time = 5; resolveTransaction(); await transaction;
  time = 6; const report = probe.stop();
  assert.deepEqual(report.phases["source:host"].membershipMs, [0, 0, 1, 2, 0, 0, 0, 0]);
  assert.deepEqual(report.phases["source:reconciliation"].membershipMs, [1, 0, 1, 1, 0, 0, 0, 0]);
  assert.equal(Object.values(report.phases).reduce((n, row) => n + row.elapsedMs, 0), 6);
  const sums = Object.values(report.groups).reduce((n, row) => n + row.totalMs, 0);
  assert.equal(sums, 8, "Inclusive promise durations overlap; union is only five milliseconds");
});

test("native wait probe freezes pending observations on retirement and detaches snapshots", async () => {
  let time = 0, resolve;
  const probe = createWaitTimingProbe({ now: () => time, phase: () => "source:host" });
  const original = new Promise(done => { resolve = done; });
  probe.observe("yield", "timer", () => original);
  time = 2; const stopped = probe.stop(), saved = JSON.stringify(stopped);
  assert.equal(Object.values(stopped.groups)[0].pending, 1);
  time = 10; resolve(); await original; probe.checkpoint();
  assert.equal(JSON.stringify(probe.snapshot()), saved, "Late completion cannot rewrite retired evidence");
  stopped.categories[0] = "changed"; Object.values(stopped.phases)[0].membershipMs[1] = 999;
  assert.equal(JSON.stringify(probe.snapshot()), saved, "Returned arrays cannot mutate private aggregates");
  assert.equal(probe.observe("yield", "timer", () => original), original, "Retired observer still forwards");
});

test("native wait probe bounds phase/group cardinality and keeps fixed latency histograms", () => {
  let time = 0, phase = "source:0";
  const probe = createWaitTimingProbe({ now: () => time, phase: () => phase });
  for (let i = 0; i < 1000; i++) {
    phase = "source:" + i;
    probe.observe("digest", "sha256", () => { time += i % 2 === 0 ? 0.2 : 9; });
  }
  const report = probe.stop();
  assert(Object.keys(report.phases).length <= 128); assert(Object.keys(report.groups).length <= 128);
  assert.equal(Object.values(report.groups).reduce((n, row) => n + row.histogram.reduce((a, b) => a + b, 0), 0), 1000);
  assert.equal(Object.values(report.groups).reduce((n, row) => n + row.pending, 0), 0);
  assert(Object.values(report.groups).every(row => row.histogram.length === report.upperBoundsMs.length));
});

test("native wait probe injection is self-contained in another JavaScript realm", async () => {
  const factory = runInNewContext("(" + createWaitTimingProbe.toString() + ")");
  let time = 0;
  const probe = factory({ now: () => time, phase: () => "source:host" });
  const original = Promise.resolve("value");
  assert.equal(probe.observe("yield", "timer", () => original), original);
  time = 2; await original;
  const report = probe.stop();
  assert.equal(report.groups["source:host:yield:timer"].totalMs, 2);
  assert.equal(report.phases["source:host"].membershipMs[1], 2);
});

async function fixture(fn) {
  const root = mkdtempSync(join(tmpdir(), "kplex-host-runner-test-"));
  const projectRoot = join(root, "project");
  const vaultPath = join(root, "kplex-test");
  const configDir = join(vaultPath, ".obsidian");
  const pluginDir = join(configDir, "plugins", "k-plex");
  const reportDir = join(root, "report");
  try {
    for (const dir of [join(projectRoot, "dist"), pluginDir]) mkdirSync(dir, { recursive: true });
    for (const [name, value] of Object.entries({
      "main.js": "new plugin bundle",
      "manifest.json": JSON.stringify({ id: "k-plex", version: "0.0.5" }),
      "styles.css": "new styles",
    })) writeFileSync(join(projectRoot, "dist", name), value);
    writeFileSync(join(pluginDir, "main.js"), "old plugin bundle");
    writeFileSync(join(pluginDir, "data.json"), "settings stay");
    writeFileSync(join(configDir, "community-plugins.json"), '["k-plex"]');
    return await fn({ root, projectRoot, vaultPath, configDir, pluginDir, reportDir, vaultName: "kplex-test" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function fakeCli(target, options = {}) {
  const calls = [];
  const runCli = (vault, command, ...args) => {
    calls.push([vault, command, ...args]);
    assert.equal(vault, "kplex-test");
    if (command === "version") return "1.14.2\n";
    if (command === "help") return "version vault plugin:disable plugin:enable commands command dev:dom dev:errors";
    if (command === "vault") return `${options.reportedVault ?? target.vaultPath}\n`;
    if (command === "commands") return "k-plex:kplex-start\n";
    if (command === "dev:dom") return args.includes("total") ? options.domCount ?? "1\n" : options.domText ?? "K-Plex Welcome";
    if (command === "dev:errors") return options.errors ?? "No errors captured\n";
    return "OK\n";
  };
  return { calls, runCli };
}

test("requires an explicit, existing named test vault and config", async () => {
  assert.throws(() => validateTarget({}), /Set KPLEX_TEST_/);
  await fixture((target) => assert.equal(validateTarget(target).vault, realpathSync(target.vaultPath)));
});

test("verifies exact artifacts, preserves data and reports rendered smoke success", async () => {
  await fixture(async (target) => {
    const cli = fakeCli(target);
    let verified = false;
    const report = await runObsidianVerification({ ...target, runCli: cli.runCli, runVerify: () => { verified = true; }, source: { revision: "test" } });
    assert.equal(report.status, "passed");
    assert.equal(verified, true);
    assert.equal(readFileSync(join(target.pluginDir, "main.js"), "utf8"), "new plugin bundle");
    assert.equal(readFileSync(join(target.pluginDir, "data.json"), "utf8"), "settings stay");
    assert.deepEqual(report.artifacts.sourceHashes, report.artifacts.stagedHashes);
    assert.equal(JSON.parse(readFileSync(join(target.reportDir, "report.json"), "utf8")).status, "passed");
    assert(cli.calls.findIndex((call) => call[1] === "plugin:disable") < cli.calls.findIndex((call) => call[1] === "plugin:enable"));
  });
});

test("vault mismatch or failed portable verification blocks staging and reports failure", async () => {
  await fixture(async (target) => {
    const other = join(target.root, "other-vault");
    mkdirSync(other);
    let built = false;
    const wrongVault = await runObsidianVerification({ ...target, runCli: fakeCli(target, { reportedVault: other }).runCli, runVerify: () => { built = true; } });
    assert.equal(wrongVault.status, "failed");
    assert.match(wrongVault.error, /CLI targets/);
    assert.equal(wrongVault.scenarios[0].id, "preflight");
    assert.equal(built, false);
    assert.equal(readFileSync(join(target.pluginDir, "main.js"), "utf8"), "old plugin bundle");
    const failedBuild = await runObsidianVerification({ ...target, runCli: fakeCli(target).runCli, runVerify: () => { throw new Error("build failed"); } });
    assert.equal(failedBuild.status, "failed");
    assert.match(failedBuild.error, /build failed/);
    assert.equal(failedBuild.scenarios[0].id, "portable-verify");
    assert.equal(readFileSync(join(target.pluginDir, "main.js"), "utf8"), "old plugin bundle");
  });
});

test("unavailable CLI fails strict preflight without touching the plugin", async () => {
  await fixture(async (target) => {
    const report = await runObsidianVerification({ ...target, runCli: () => { throw new Error("CLI unavailable"); }, runVerify: () => { throw new Error("must not build"); } });
    assert.equal(report.status, "failed");
    assert.equal(report.scenarios[0].id, "preflight");
    assert.match(report.error, /CLI unavailable/);
    assert.equal(readFileSync(join(target.pluginDir, "main.js"), "utf8"), "old plugin bundle");
    assert.equal(existsSync(join(target.reportDir, "report.json")), true);
  });
});

test("missing render and captured JavaScript errors fail with a written report", async () => {
  await fixture(async (target) => {
    let tick = 0;
    const report = await runObsidianVerification({
      ...target, runCli: fakeCli(target, { domCount: "0\n" }).runCli, runVerify: () => {},
      now: () => (tick += 1000), wait: async () => {},
    });
    assert.equal(report.status, "failed");
    assert.match(report.error, /rendered-state assertion timed out/);
    assert.equal(existsSync(join(target.reportDir, "report.json")), true);
  });
  await fixture(async (target) => {
    const report = await runObsidianVerification({ ...target, runCli: fakeCli(target, { errors: "TypeError: broken" }).runCli, runVerify: () => {} });
    assert.equal(report.status, "failed");
    assert.match(report.error, /JavaScript errors/);
  });
});
