/** Portable action acceptance, preference migration, chord compilation and public command diff contracts. */
import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
import {mkdtempSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
const temp = mkdtempSync(join(tmpdir(), "kplex-actions-"));
await build({stdin: {contents: 'export * from "./src/core/plex/actions"; export * from "./src/core/plex/actionPreferences"; export * from "./src/application/ActionManager"; export * from "./src/adapters/obsidian/actionCommands"; export * from "./src/ui/actionPresentation"; export { createTranslator } from "./src/lang";', resolveDir: process.cwd()}, outfile: join(temp, "contracts.mjs"), bundle: true, platform: "node", format: "esm"});
const api = await import(pathToFileURL(join(temp, "contracts.mjs")));
test.after(() => rmSync(temp, {recursive: true, force: true}));
/** Stable references model distinct file objects through an opaque identity. */
const node = (identity, path = `${identity}.md`) => ({identity, path, kind: "file"});
/** Pure snapshots provide only bounded presentation facts. */
const snapshot = (center = node("A"), extra = {}) => ({mounted: true, visible: true, windowId: "main", center, selected: null, focusRegion: "graph", interactionRevision: 1, ...extra});
/** Exact event flags separate logical character matching from physical position matching. */
const event = (key, extra = {}) => ({key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...extra});
/** Narrow implementations record dispatch without touching any host state. */
const implementation = (execute = () => ({status: "completed"})) => ({availability: () => ({state: "enabled"}), execute});
/** Provide a shared center independently of whichever editor has focus. */
const manager = (extra = {}) => new api.ActionManager({readCommandContext: () => ({sharedCenter: node("shared"), windowId: "main", focusRegion: "graph"}), ...extra});

test("catalog contains bounded variants, 22 preserved IDs, eight new publication defaults and session-only actions", () => {
  assert.equal(new Set(api.ACTION_CATALOG.map(item => item.id)).size, api.ACTION_CATALOG.length);
  assert.equal(new Set(api.ACTION_CATALOG.flatMap(item => item.command ? [item.command.id] : [])).size, api.ACTION_CATALOG.filter(item => item.command).length);
  assert.equal(api.ACTION_CATALOG.filter(item => item.command?.defaultPublished).length, 30);
  const support = api.ACTION_BY_ID.get("support.report-bug");
  assert.equal(support.command.id, "kplex-support-report-bug");
  assert.equal(support.target, "none");
  assert.deepEqual(api.effectiveActionBindings(api.migrateActionPreferences(undefined).preferences, "support.report-bug"), []);
  const preserved = ["kplex-start", "kplex-rebuild-index", "kplex-copy-index-diagnostics", "kplex-open-popout", "kplex-open-sidepanel", "kplex-search", "kplex-add-child", "kplex-add-parent", "kplex-add-friend", "kplex-add-challenger", "kplex-sync-tab-from-plex", "kplex-sync-plex-from-tab", "kplex-focus-active-note", ...["select", "parent", "child", "left", "right", "previous", "next", "hidden", "excluded"].map(role => `kplex-ontology-${role}`)];
  for (const id of preserved) assert(api.ACTION_CATALOG.some(item => item.command?.id === id));
  for (const role of ["parent", "child", "left", "right", "previous", "next"]) for (const origin of ["center", "selected"]) assert(api.ACTION_BY_ID.has(`relationship.create-${origin}.${role}`));
  for (const item of api.ACTION_CATALOG) { assert.equal(item.labelKey, `actions.${item.id}`); if (item.id.startsWith("composer.")) assert.equal(item.command, undefined); }
  assert.equal(api.ACTION_CATALOG.filter(item => item.command?.kind === "editor").length, 9);
});

test("checking is pure, local owner never falls back and legacy global create retains shared center", async () => {
  let calls = 0, captured;
  const impl = implementation(context => { calls++; captured = context.target; return {status: "completed"}; });
  const app = manager({implementations: {"relationship.create-center.child": impl}});
  app.registerSurface({id: "one", generation: 1, readSnapshot: () => snapshot(node("local"))});
  const command = {id: "relationship.create-center.child", source: "obsidian-command"};
  assert.equal(app.check(command).state, "enabled"); assert.equal(calls, 0);
  assert.equal((await app.dispatch(command)).status, "completed"); assert.equal(captured.node.identity, "shared");
  const local = {...command, source: "local-hotkey", surfaceId: "one"};
  await app.dispatch(local); assert.equal(captured.node.identity, "local");
  assert.equal(app.check({...local, surfaceId: "missing"}).state, "disabled");
  assert.equal(app.check({id: "relationship.create-selected.child", source: "local-hotkey", surfaceId: "one"}).state, "disabled");
  assert.equal(app.check({id: "node.delete", source: "local-menu", surfaceId: "one", target: {kind: "center"}}).state, "disabled");
  app.dispose();
});

test("prepare freezes origin, starts once, cancel releases unused guards and opened sessions retain exclusivity", async () => {
  let current = snapshot(), calls = 0, captured;
  const app = manager();
  app.registerSurface({id: "one", generation: 1, readSnapshot: () => current, implementations: {"relationship.create-center.child": implementation(context => {calls++; captured = context.target.node.identity; return {status: "opened", sessionId: "composer-1"};})}});
  const request = {id: "relationship.create-center.child", source: "local-hotkey", surfaceId: "one"};
  const cancelled = app.prepare(request); assert.equal(cancelled.state, "accepted");
  assert.deepEqual(app.check(request), {state: "disabled", reasonKey: "actions.busy"}); assert.equal(calls, 0, "Busy checking remains pure");
  cancelled.cancel(); assert.equal(app.check(request).state, "enabled"); assert.equal((await cancelled.run()).status, "cancelled");
  const prepared = app.prepare(request); assert.equal(prepared.state, "accepted"); current = snapshot(node("B"));
  assert.equal(prepared.run(), prepared.run()); await prepared.run(); assert.equal(calls, 1); assert.equal(captured, "A");
  assert.equal(app.prepare(request).state, "rejected"); assert.deepEqual(app.check(request), {state: "disabled", reasonKey: "actions.busy"});
  app.closeSession("composer-1"); assert.equal(app.check(request).state, "enabled"); assert.equal(app.prepare(request).state, "accepted"); app.dispose();
});

test("generation cleanup and exact reference validation reject replacement without removing a successor", async () => {
  let valid = true, calls = 0;
  const app = manager({validateNode: () => valid});
  const impl = implementation(() => {calls++; return {status: "completed"};});
  const staleCleanup = app.registerSurface({id: "one", generation: 1, readSnapshot: snapshot, implementations: {"node.open": impl}});
  const prepared = app.prepare({id: "node.open", source: "local-menu", surfaceId: "one"}); valid = false;
  assert.equal((await prepared.run()).status, "cancelled"); assert.equal(calls, 0);
  valid = true;
  app.registerSurface({id: "one", generation: 2, readSnapshot: snapshot, implementations: {"node.open": impl}}); staleCleanup();
  assert.equal((await app.dispatch({id: "node.open", source: "local-menu", surfaceId: "one"})).status, "completed");
  assert.equal(calls, 1); app.dispose();
});

test("cross-window ambiguity never guesses a foreground owner but ownerless host commands still run", async () => {
  const app = manager({readCommandContext: () => ({sharedCenter: node("A"), windowId: "other"}), implementations: {"index.rebuild": implementation(), "actions.open": implementation()}});
  for (const id of ["first", "second"]) app.registerSurface({id, generation: 1, readSnapshot: () => snapshot(node("A"), {windowId: id})});
  assert.equal(app.check({id: "actions.open", source: "obsidian-command"}).state, "disabled");
  assert.equal((await app.dispatch({id: "index.rebuild", source: "obsidian-command"})).status, "completed"); app.dispose();
});

test("reusing an ID and generation cannot revive the retired implementation or malformed occurrence payload", async () => {
  let retiredCalls = 0, currentCalls = 0;
  const app = manager();
  const staleCleanup = app.registerSurface({id: "same", generation: 1, readSnapshot: snapshot, implementations: {"node.open": implementation(() => {retiredCalls++; return {status: "completed"};})}});
  const prepared = app.prepare({id: "node.open", source: "local-menu", surfaceId: "same"});
  assert.equal(prepared.state, "accepted");
  app.registerSurface({id: "same", generation: 1, readSnapshot: snapshot, implementations: {"node.open": implementation(() => {currentCalls++; return {status: "completed"};})}});
  staleCleanup();
  assert.equal((await prepared.run()).status, "cancelled");
  assert.equal((await app.dispatch({id: "node.open", source: "local-menu", surfaceId: "same"})).status, "completed");
  assert.equal(retiredCalls, 0); assert.equal(currentCalls, 1);
  assert.equal(app.check({id: "node.open", source: "local-menu", surfaceId: "same", target: {kind: "explicit", node: node("A"), occurrenceId: {execute: "foreign"}}}).reasonKey, "actions.invalid-request");
  assert.equal(app.check({id: "relationship.details", source: "local-menu", surfaceId: "same", target: {kind: "edge", origin: node("A"), target: node("B"), evidenceId: 7}}).reasonKey, "actions.invalid-request");
  app.dispose();
});

test("retired preparation cannot release a successor's single-flight guard when generation is reused", async () => {
  const app = manager();
  const request = {id: "node.open", source: "local-menu", surfaceId: "same"};
  app.registerSurface({id: "same", generation: 1, readSnapshot: snapshot, implementations: {"node.open": implementation()}});
  const retired = app.prepare(request);
  let release;
  app.registerSurface({id: "same", generation: 1, readSnapshot: snapshot, implementations: {"node.open": implementation(() => new Promise(resolve => {release = resolve;}))}});
  const successor = app.prepare(request); assert.equal(successor.state, "accepted");
  const running = successor.run();
  retired.cancel(); assert.equal((await retired.run()).status, "cancelled");
  assert.equal(app.prepare(request).state, "rejected", "A retired token must not release the successor's pending operation");
  release({status: "completed"}); assert.equal((await running).status, "completed");
  assert.equal(app.prepare(request).state, "accepted"); app.dispose();
});

test("accepted request captures finite arguments, source and target values before caller mutation", async () => {
  let captured;
  const app = manager();
  app.registerSurface({id: "one", generation: 1, readSnapshot: snapshot, implementations: {
    "relationship.create-center.child": implementation(context => {captured = context; return {status: "completed"};}),
  }});
  const request = {id: "relationship.create-center.child", source: "local-menu", surfaceId: "one", args: {continuation: "follow"}, target: {kind: "explicit", node: node("A"), occurrenceId: "A-occurrence"}};
  const prepared = app.prepare(request); assert.equal(prepared.state, "accepted");
  request.id = "relationship.create-center.parent"; request.source = "internal"; request.args.continuation = "edit";
  request.target.node.identity = "B"; request.target.node.path = "B.md"; request.target.occurrenceId = "B-occurrence";
  assert.equal((await prepared.run()).status, "completed");
  assert.equal(captured.request.id, "relationship.create-center.child"); assert.equal(captured.request.source, "local-menu");
  assert.deepEqual(captured.request.args, {continuation: "follow"});
  assert.equal(captured.request.target.node.identity, "A"); assert.equal(captured.request.target.occurrenceId, "A-occurrence");
  assert.equal(captured.target.node.identity, "A");
  assert(Object.isFrozen(captured.request)); assert(Object.isFrozen(captured.request.args)); assert(Object.isFrozen(captured.request.target.node));
  app.dispose();
});

test("separator-shaped surface aliases cannot release another owner's live session guard", async () => {
  const app = manager();
  const releaseUnrelated = app.registerSurface({id: "alias", generation: 1, readSnapshot: snapshot});
  app.registerSurface({id: "alias:1", generation: 2, readSnapshot: snapshot, implementations: {
    "node.open": implementation(() => ({status: "opened", sessionId: "alias-session"})),
  }});
  const request = {id: "node.open", source: "local-menu", surfaceId: "alias:1"};
  assert.equal((await app.dispatch(request)).status, "opened");
  releaseUnrelated();
  assert.equal(app.prepare(request).state, "rejected", "Cleanup must compare structured owner fields rather than a textual prefix");
  app.closeSession("alias-session"); assert.equal(app.prepare(request).state, "accepted"); app.dispose();
});

test("typed runtime validation rejects unknown or executable payloads; errors report once and pending stays pending", async () => {
  let notices = 0;
  const app = manager({onError: () => notices++, implementations: {"index.rebuild": implementation(() => {throw new Error("failed");}), "relationship.create-center.child": implementation(() => ({status: "saved-pending", affected: [node("A")], reasonKey: "pending"}))}});
  assert.equal(app.check({id: "unknown", source: "internal"}).state, "disabled");
  assert.equal(app.check({id: "index.rebuild", source: "internal", args: {execute: () => {}}}).state, "disabled");
  assert.equal((await app.dispatch({id: "index.rebuild", source: "internal"})).status, "failed"); assert.equal(notices, 1);
  app.registerSurface({id: "one", generation: 1, readSnapshot: snapshot});
  assert.equal((await app.dispatch({id: "relationship.create-center.child", source: "local-menu", surfaceId: "one"})).status, "saved-pending"); app.dispose();
});

test("raw migration distinguishes upgrades, preserves disables/unknowns, physical legacy letters and idempotence", () => {
  const fresh = api.migrateActionPreferences(undefined); assert.equal(fresh.preferences.crossSectionAtBoundary, true);
  const upgraded = api.migrateActionPreferences({internalHotkeys: {moveUp: null, moveDown: {key: "P"}, futureAction: {key: "F8"}}});
  assert.equal(upgraded.preferences.crossSectionAtBoundary, false);
  assert.deepEqual(upgraded.preferences.localBindings["selection.move.up"], []);
  assert.deepEqual(upgraded.preferences.localBindings["selection.move.down"], [{match: "code", value: "KeyP", modifiers: []}]);
  assert.deepEqual(upgraded.preferences.legacyUnknown.futureAction, {key: "F8"});
  assert(!upgraded.skippedDefaults.includes("pin.toggle"), "The modified pin default can coexist with an explicit bare legacy letter");
  const again = api.migrateActionPreferences({actionPreferences: {...upgraded.preferences, publishedCommands: {"search.focus": false}}});
  assert.equal(again.migrated, false); assert.equal(api.isActionPublished(again.preferences, "search.focus"), false);
  assert.deepEqual(again.preferences.localBindings, upgraded.preferences.localBindings);
  assert.equal(api.migrateActionPreferences({}).preferences.crossSectionAtBoundary, false);
});

test("exact logical/physical chords support Caps Lock, reject composing/dead/AltGraph and imported ambiguity", () => {
  const prefs = api.migrateActionPreferences(undefined).preferences;
  prefs.localBindings["pin.toggle"] = [{match: "key", value: "p", modifiers: []}];
  let compiled = api.compileActionBindings(prefs, "windows");
  assert.equal(compiled.match(event("P", {code: "KeyP"}), "graph"), "pin.toggle");
  assert.equal(compiled.match(event("p", {code: "KeyQ"}), "graph"), "pin.toggle");
  assert.equal(compiled.match(event("p", {shiftKey: true}), "graph"), null);
  for (const extra of [{isComposing: true}, {altGraph: true}]) assert.equal(compiled.match(event("p", extra), "graph"), null);
  assert.equal(compiled.match(event("Dead", {code: "KeyP"}), "graph"), null);
  prefs.localBindings["node.open"] = [{match: "code", value: "KeyP", modifiers: []}];
  compiled = api.compileActionBindings(prefs, "windows"); assert.equal(compiled.match(event("p", {code: "KeyP"}), "graph"), null);
  assert(compiled.conflicts.some(item => item.kind === "possible-layout-overlap"));
  assert.equal(compiled.match(event("p", {code: "KeyP"}), "embedded-editor"), null);
  prefs.localBindings["actions.open"] = [{match: "key", value: "x", modifiers: ["mod", "ctrl"]}];
  assert(api.compileActionBindings(prefs, "windows").issues.some(item => item.actionId === "actions.open"));
  assert.equal(api.matchesActionBinding(event("x", {metaKey: true, ctrlKey: true}), prefs.localBindings["actions.open"][0], "macos"), true);
});

test("sanitization bounds arrays and retains newer version markers without executing unknown bindings", () => {
  const result = api.sanitizeActionPreferences({version: 2, localBindings: {"node.open": Array(5).fill({match: "key", value: "x", modifiers: []}), future: [{match: "key", value: "y", modifiers: []}]}, publishedCommands: {future: true}});
  assert.equal(result.unsupportedVersion, 2); assert.deepEqual(result.preferences.localBindings["node.open"], []);
  assert(result.issues.some(item => item.reason === "too-many-bindings"));
  assert.equal(api.compileActionBindings(result.preferences, "windows").match(event("y"), "graph"), null);
});

test("public command diff preserves editor callbacks, omits global hotkeys and removes unprefixed stable IDs", async () => {
  const added = [], removed = [], released = [];
  const app = manager({implementations: {"index.rebuild": implementation(), "ontology.assign.parent": implementation()}});
  const publisher = api.createActionCommandPublisher({host: {addCommand: command => {added.push(command); return command;}, removeCommand: id => removed.push(id)}, manager: app, translate: key => key, makeRequest: id => ({id, source: "obsidian-command", ...(id.startsWith("ontology.") ? {target: {kind: "editor-field", editorInvocationId: "cursor"}} : {})}), releaseRequest: request => released.push(request.id)});
  const preferences = api.migrateActionPreferences(undefined).preferences;
  publisher.sync(preferences); assert.equal(added.length, 30);
  publisher.sync(preferences); assert.equal(added.length, 30);
  assert(added.every(command => command.hotkeys === undefined));
  const editor = added.find(command => command.id === "kplex-ontology-parent"); assert.equal(typeof editor.editorCheckCallback, "function"); assert.equal(editor.checkCallback, undefined);
  assert.equal(editor.editorCheckCallback(true, {}, {}), true); assert.deepEqual(released, ["ontology.assign.parent"]);
  assert.equal(editor.editorCheckCallback(false, {}, {}), true); await new Promise(resolve => setImmediate(resolve)); assert.equal(released.length, 2);
  preferences.publishedCommands["index.rebuild"] = false; publisher.sync(preferences); assert.deepEqual(removed, ["kplex-rebuild-index"]);
  assert.equal((await app.dispatch({id: "index.rebuild", source: "internal"})).status, "completed");
  preferences.publishedCommands["index.rebuild"] = true; publisher.sync(preferences); assert.equal(added.at(-1).id, "kplex-rebuild-index");
  publisher.dispose(); app.dispose();
});

test("ambiguous chords are distinct from no match; immutable metadata and invalid physical/Tab input retain native ownership", () => {
  const prefs = api.migrateActionPreferences(undefined).preferences;
  prefs.localBindings["node.open"] = [{match: "key", value: "x", modifiers: []}];
  prefs.localBindings["pin.toggle"] = [{match: "code", value: "KeyX", modifiers: []}];
  const compiled = api.compileActionBindings(prefs, "macos");
  assert.deepEqual(compiled.resolve(event("y", {code: "KeyY"}), "graph"), {state: "none"});
  const ambiguity = compiled.resolve(event("x", {code: "KeyX"}), "graph"); assert.equal(ambiguity.state, "ambiguous"); assert.deepEqual(new Set(ambiguity.ids), new Set(["node.open", "pin.toggle"]));
  assert.equal(api.isLocalBinding({match: "code", value: "letter-X", modifiers: []}), false);
  assert.equal(api.isLocalBinding({match: "code", value: "ControlLeft", modifiers: []}), false);
  assert.equal(api.isLocalBinding({match: "key", value: "Tab", modifiers: []}), false);
  assert.equal(api.isLocalBinding({match: "code", value: "IntlBackslash", modifiers: []}), true);
  assert(Object.isFrozen(api.ACTION_CATALOG)); assert(Object.isFrozen(api.ACTION_BY_ID.get("node.open").localContexts));
  assert.equal(api.ACTION_BY_ID.get("node.open").effect, "vault-write"); assert.equal(api.ACTION_BY_ID.get("ontology.assign.parent").effect, "semantic-setting");
});

test("v1 load skips conflicting inherited defaults but keeps explicit imported ambiguity for recovery", () => {
  const imported = {version: 1, localBindings: {"node.open": [{match: "key", value: "p", modifiers: ["alt"]}]}, publishedCommands: {"search.focus": false}};
  const result = api.sanitizeActionPreferences(imported);
  assert(result.skippedDefaults.includes("pin.toggle")); assert.deepEqual(result.preferences.localBindings["pin.toggle"], []);
  assert.equal(api.compileActionBindings(result.preferences, "windows").match(event("p", {altKey: true}), "graph"), "node.open");
  const again = api.sanitizeActionPreferences(result.preferences); assert.deepEqual(again.preferences, result.preferences);
  imported.localBindings["pin.toggle"] = [{match: "key", value: "p", modifiers: ["alt"]}];
  const ambiguous = api.sanitizeActionPreferences(imported); assert.equal(api.compileActionBindings(ambiguous.preferences, "windows").resolve(event("p", {altKey: true}), "graph").state, "ambiguous");
  assert.deepEqual(imported.localBindings["node.open"], [{match: "key", value: "p", modifiers: ["alt"]}]);
});

test("explicit saves opt into retained default overlaps while old loads migrate once and future generations remain guarded", () => {
  const raw={version:1,localBindings:{'pin.toggle':[{match:'code',value:'KeyR',modifiers:['alt']}]},publishedCommands:{}};
  const before=structuredClone(raw),legacy=api.sanitizeActionPreferences(raw,false,'windows');
  assert(legacy.skippedDefaults.includes('node.rename'));assert.deepEqual(legacy.preferences.localBindings['node.rename'],[]);
  const saved=api.sanitizeActionPreferences(raw,false,'windows',true);
  assert.equal(saved.preferences.defaultBindingsVersion,1);assert.deepEqual(saved.skippedDefaults,[]);assert.equal(saved.preferences.localBindings['node.rename'],undefined);
  const reload=api.sanitizeActionPreferences(saved.preferences,false,'windows');
  assert.deepEqual(reload.preferences,saved.preferences);assert.deepEqual(reload.skippedDefaults,[]);
  assert.equal(api.compileActionBindings(reload.preferences,'windows').resolve(event('r',{code:'KeyR',altKey:true}),'graph').state,'ambiguous');
  const future={...before,defaultBindingsVersion:2},futureBefore=structuredClone(future),unsupported=api.sanitizeActionPreferences(future,false,'windows');
  assert.equal(unsupported.unsupportedVersion,2);assert.deepEqual(future,futureBefore);assert.deepEqual(raw,before);
});

test("partial public registration failure reports actual state and stable-ID retry without duplicate success", () => {
  const counts = new Map(); let fail = true;
  const app = manager();
  const publisher = api.createActionCommandPublisher({host: {addCommand: command => {counts.set(command.id, (counts.get(command.id) ?? 0) + 1); if (command.id === "kplex-actions" && fail) throw new Error("native failure"); return command;}, removeCommand: () => {}}, manager: app, translate: key => key, makeRequest: id => ({id, source: "obsidian-command"})});
  const preferences = api.migrateActionPreferences(undefined).preferences;
  const first = publisher.sync(preferences); assert.equal(first.failures.length, 1); assert.equal(publisher.registeredIds().length, 29);
  const actual = publisher.registeredIds(); actual.pop(); assert.equal(publisher.registeredIds().length, 29);
  fail = false; assert.equal(publisher.sync(preferences).failures.length, 0); assert.equal(publisher.registeredIds().length, 30);
  assert.equal(counts.get("kplex-actions"), 2); assert.equal(counts.get("kplex-start"), 1);
  publisher.dispose(); app.dispose();
});

test("surface ownership uses a shared deliberate-interaction ledger rather than incomparable local counters", async () => {
  let chosen, preferred;
  const app = manager({readCommandContext: () => ({sharedCenter: node("A"), windowId: "main", preferredSurfaceId: preferred}), implementations: {"actions.open": implementation(context => {chosen = context.surfaceId; return {status: "completed"};})}});
  app.registerSurface({id: "first", generation: 1, readSnapshot: () => snapshot(node("A"), {interactionRevision: 100})});
  app.registerSurface({id: "second", generation: 1, readSnapshot: () => snapshot(node("A"), {interactionRevision: 1, visible: false})});
  app.recordInteraction("second"); await app.dispatch({id: "actions.open", source: "obsidian-command"}); assert.equal(chosen, "second");
  preferred = "first"; await app.dispatch({id: "actions.open", source: "obsidian-command"}); assert.equal(chosen, "first");
  assert.equal(app.check({id: "actions.open", source: "invalid"}).state, "disabled");
  assert.equal(app.check({id: "node.open", source: "internal", target: null}).state, "disabled"); app.dispose();
});

test("execution refreshes capability snapshot while preserving accepted origin and invocation focus", async () => {
  let current = snapshot(node("A"), {historyBack: true}), captured;
  const app = manager();
  app.registerSurface({id: "one", generation: 1, readSnapshot: () => current, implementations: {"node.open": {availability: context => context.snapshot.historyBack ? {state: "enabled"} : {state: "disabled", reasonKey: "changed"}, execute: context => {captured = context; return {status: "completed"};}}}});
  const prepared = app.prepare({id: "node.open", source: "local-menu", surfaceId: "one"}); current = snapshot(node("B"), {historyBack: false});
  assert.deepEqual(await prepared.run(), {status: "unavailable", reasonKey: "changed"}); assert.equal(captured, undefined);
  current = snapshot(node("A"), {historyBack: true}); const fresh = app.prepare({id: "node.open", source: "local-menu", surfaceId: "one"});
  current = snapshot(node("B"), {historyBack: true, focusRegion: "external"}); await fresh.run();
  assert.equal(captured.target.node.identity, "A"); assert.equal(captured.snapshot.center.identity, "B"); assert.equal(captured.invocationSnapshot.focusRegion, "graph"); app.dispose();
});

test("published selection recognizes captured graph palette context and rejects external-editor focus", async () => {
  let current = snapshot(node("A"), {focusRegion: "external", commandFocusRegion: "graph"}), calls = 0;
  const app = manager({readCommandContext: () => ({sharedCenter: node("A"), windowId: "main", focusRegion: "external"})});
  app.registerSurface({id: "one", generation: 1, readSnapshot: () => current, implementations: {"selection.move.down": implementation(() => {calls++; return {status: "completed"};})}});
  assert.equal((await app.dispatch({id: "selection.move.down", source: "obsidian-command"})).status, "completed");
  current = {...current, commandFocusRegion: "external"}; assert.equal(app.check({id: "selection.move.down", source: "obsidian-command"}).state, "disabled"); assert.equal(calls, 1); app.dispose();
});

test("disable character shortcuts also disables migrated physical printable chords while retaining modified and named keys", () => {
  const prefs = api.migrateActionPreferences({internalHotkeys: {moveDown: {key: "p"}, focusFind: {key: "f", modifiers: ["mod"]}}}).preferences;
  prefs.characterShortcutsEnabled = false;
  const compiled = api.compileActionBindings(prefs, "windows");
  assert.equal(compiled.match(event("p", {code: "KeyP"}), "graph"), null);
  assert.equal(compiled.match(event("F4", {code: "F4"}), "graph"), "search.focus");
  assert.equal(compiled.match(event("f", {code: "KeyF", ctrlKey: true}), "graph"), "find.focus");
});

test("modified laptop defaults match Mac Option glyphs by physical position and retain exact contexts", () => {
  const fresh = api.migrateActionPreferences(null, "macos").preferences;
  const compiled = api.compileActionBindings(fresh, "macos");
  const windows = api.compileActionBindings(fresh, "windows");
  assert.equal(compiled.conflicts.length, 0);
  for (const bindings of Object.values(api.ACTION_BINDING_DEFAULTS)) for (const binding of bindings) assert(!/^(F\d+|Home|End|ContextMenu)$/.test(binding.value));
  const macOption = [
    ["≥", "Period", "actions.open"], ["÷", "Slash", "search.focus"],
    ["®", "KeyR", "node.rename"], ["º", "Digit0", "selection.center"],
    ["π", "KeyP", "pin.toggle"], ["∫", "KeyB", "pins.open"],
    ["˙", "KeyH", "history.open"], ["ç", "KeyC", "relationship.connect"],
    ["µ", "KeyM", "node.context-menu"], ["¿", "Slash", "keyboard.help", true],
  ];
  for (const [glyph, code, id, shiftKey = false] of macOption) {
    const input = event(glyph, {code, altKey: true, shiftKey});
    assert.equal(compiled.match(input, "graph"), id, `${id} must use code rather than the Option-produced glyph`);
    assert.equal(api.matchesActionBinding(input, api.effectiveActionBindings(fresh, id)[0], "macos"), true);
    const logicalKey = code === "Period" ? "." : code === "Slash" ? shiftKey ? "?" : "/" : code.startsWith("Key") ? code.slice(3).toLowerCase() : code.slice(5);
    assert.equal(windows.match({...input, key: logicalKey}, "graph"), id, "Alt uses the same physical position on Windows");
    assert.deepEqual(api.captureActionBinding(input, "macos", "code"), api.effectiveActionBindings(fresh, id)[0]);
    assert.equal(compiled.match({...input, altKey: false}, "graph"), null, "The Option modifier is required");
    assert.equal(compiled.match({...input, code: "KeyQ"}, "graph"), null, "A different physical position cannot trigger the glyph's action");
    for (const state of [{isComposing: true}, {altGraph: true}]) assert.equal(compiled.match({...input, ...state}, "graph"), null);
  }
  for (const key of [".", "/", "?", "r", "0", "p", "b", "h", "c", "m"]) assert.equal(compiled.match(event(key), "graph"), null, "Ordinary typing remains unbound");
  for (const region of ["embedded-editor", "sidecar-editor", "search", "find", "native-control"]) {
    assert.equal(compiled.match(event("®", {code: "KeyR", altKey: true}), region), null);
    assert.equal(compiled.match(event("÷", {code: "Slash", altKey: true}), region), "search.focus", "Explicit search focus remains available in owned regions");
  }
  for (const region of ["embedded-editor", "sidecar-editor"]) assert.equal(compiled.match(event("¿", {code: "Slash", altKey: true, shiftKey: true}), region), null, "Editors keep their own help chords");
  assert.equal(compiled.match(event("g", {metaKey: true, shiftKey: true}), "embedded-editor"), "graph.focus");
  assert.equal(compiled.match(event("e", {metaKey: true, shiftKey: true}), "graph"), "editor.focus");
  assert.equal(compiled.match(event("Enter", {metaKey: true}), "graph"), "node.open");
  assert.equal(compiled.match(event("ArrowUp", {altKey: true}), "graph"), "selection.section.up");
  assert.equal(compiled.match(event("ArrowUp", {metaKey: true}), "graph"), "relationship.create-center.parent");
});

test("character opt-out retains modified defaults while explicit custom chords, disables and resets stay authoritative", () => {
  const saved = {version: 1, localBindings: {"node.rename": [{match: "key", value: "F2", modifiers: []}], "selection.center": [], "pin.toggle": [{match: "key", value: "p", modifiers: []}]}, publishedCommands: {"pin.toggle": false}, characterShortcutsEnabled: false};
  const result = api.sanitizeActionPreferences(saved, false, "macos");
  assert.deepEqual(result.preferences.localBindings, saved.localBindings);
  let compiled = api.compileActionBindings(result.preferences, "macos");
  assert.equal(compiled.match(event("F2"), "graph"), "node.rename");
  assert.equal(compiled.match(event("®", {code: "KeyR", altKey: true}), "graph"), null);
  assert.equal(compiled.match(event("º", {code: "Digit0", altKey: true}), "graph"), null);
  assert.equal(compiled.match(event("p", {code: "KeyP"}), "graph"), null, "Only the explicit bare letter is disabled by character opt-out");
  assert.equal(compiled.match(event("¿", {code: "Slash", altKey: true, shiftKey: true}), "graph"), "keyboard.help");
  assert.equal(compiled.match(event("≥", {code: "Period", altKey: true}), "graph"), "actions.open");
  delete result.preferences.localBindings["node.rename"];
  delete result.preferences.localBindings["selection.center"];
  delete result.preferences.localBindings["pin.toggle"];
  compiled = api.compileActionBindings(result.preferences, "macos");
  assert.equal(compiled.match(event("®", {code: "KeyR", altKey: true}), "graph"), "node.rename");
  assert.equal(compiled.match(event("º", {code: "Digit0", altKey: true}), "graph"), "selection.center");
  assert.equal(compiled.match(event("π", {code: "KeyP", altKey: true}), "graph"), "pin.toggle");
  assert.equal(api.isActionPublished(result.preferences, "pin.toggle"), false, "Resetting local chords does not change publication");
  assert.deepEqual(saved.localBindings["selection.center"], [], "Sanitization/reset never mutates caller-owned saved values");
});

test("modified punctuation conflicts preserve explicit imports and expose only possible layout overlaps", () => {
  for (const [value, modifiers, defaultAction] of [[".", ["alt"], "actions.open"], ["/", ["alt"], "search.focus"], ["?", ["alt", "shift"], "keyboard.help"]]) {
    const imported = {version: 1, localBindings: {"node.rename": [{match: "key", value, modifiers}]}};
    const result = api.sanitizeActionPreferences(imported, false, "macos");
    assert(result.skippedDefaults.includes(defaultAction));
    assert.deepEqual(result.preferences.localBindings[defaultAction], []);
    assert.equal(api.compileActionBindings(result.preferences, "macos").match(event(value, {altKey: true, shiftKey: modifiers.includes("shift")}), "graph"), "node.rename");
    const inherited = api.migrateActionPreferences(null, "macos").preferences;
    inherited.localBindings["node.rename"] = imported.localBindings["node.rename"];
    const conflict = api.compileActionBindings(inherited, "macos").conflicts.find(item => new Set([item.first, item.second]).has(defaultAction));
    assert.equal(conflict.kind, "possible-layout-overlap");
    assert.deepEqual(conflict.contexts, ["graph"]);
  }
});

test("physical default presentation uses readable keycaps and native platform modifiers without changing match identity", () => {
  const translate = api.createTranslator("en");
  const environment = keyConvention => ({device: "desktop", keyConvention, inputModes: {keyboard: true, pointer: true, touch: false}, hostActions: {graphTab: true, sidepanel: true, popout: true}});
  const preferences = api.migrateActionPreferences(null, "macos").preferences;
  const labels = [["node.rename", "R"], ["selection.center", "0"], ["actions.open", "."], ["search.focus", "/"], ["keyboard.help", "⇧ ?"]];
  for (const [id, keycap] of labels) {
    const binding = api.effectiveActionBindings(preferences, id)[0];
    assert.equal(binding.match, "code");
    assert.equal(api.formatActionBinding(binding, environment("macos"), translate, true), `⌥ ${keycap}`);
    assert.equal(api.formatActionBinding(binding, environment("ios"), translate, true), `⌥ ${keycap}`);
    assert(!api.formatActionBinding(binding, environment("windows"), translate, true).includes("Key"));
  }
  const rename = api.effectiveActionBindings(preferences, "node.rename")[0];
  assert.equal(api.formatActionBinding(rename, environment("windows"), translate, true), "Alt R");
  assert.equal(api.formatActionBinding(rename, environment("macos"), translate), "Option+R");
  assert.equal(api.formatActionBinding(rename, environment("windows"), translate), "Alt+R");
  assert.equal(api.formatActionBinding(rename, environment("unknown"), translate), null);
  const touch = {...environment("ios"), inputModes: {keyboard: false, pointer: false, touch: true}};
  assert.equal(api.formatActionBinding(rename, touch, translate), null);
  assert.equal(api.formatActionBinding(rename, touch, translate, true), "⌥ R", "Configuration can show a chord without asserting a connected keyboard");
  assert.equal(api.formatActionBinding({match: "code", value: "IntlYen", modifiers: ["alt"]}, environment("macos"), translate, true), "⌥ IntlYen (physical position)");
});


test("modified physical dead chords capture and resolve while accent typing, logical Dead and IME stay native", () => {
  const chord = event("Dead", {code: "KeyE", altKey: true, shiftKey: true});
  const binding = {match: "code", value: "KeyE", modifiers: ["alt", "shift"]};
  assert.equal(api.isModifiedPhysicalDeadKey(chord), true);
  assert.deepEqual(api.captureActionBinding(chord, "macos", "code"), binding);
  assert.equal(api.captureActionBinding(chord, "macos", "key"), null);
  assert.equal(api.matchesActionBinding(chord, binding, "macos"), true);
  assert.equal(api.matchesActionBinding(chord, {match: "key", value: "é", modifiers: ["alt", "shift"]}, "macos"), false);
  const preferences = api.migrateActionPreferences(null, "macos").preferences;
  preferences.localBindings["pin.toggle"] = [binding];
  const compiled = api.compileActionBindings(preferences, "macos");
  assert.deepEqual(compiled.resolve(chord, "graph"), {state: "matched", id: "pin.toggle"});
  assert.equal(compiled.match({...chord, code: "KeyQ"}, "graph"), null);
  for (const native of [event("Dead", {code: "KeyE"}), event("Dead", {code: "KeyE", shiftKey: true}),
    {...chord, isComposing: true}, {...chord, altGraph: true}, {...chord, code: "AltLeft"},
    {...chord, code: ""}, {...chord, key: "Process"}, {...chord, key: "Unidentified"}]) {
    assert.equal(api.isModifiedPhysicalDeadKey(native), false);
    assert.equal(api.captureActionBinding(native, "macos", "code"), null);
    assert.equal(api.matchesActionBinding(native, binding, "macos"), false);
    assert.equal(compiled.match(native, "graph"), null);
  }
  for (const modifier of ["Shift", "Alt", "Control", "Meta"]) {
    assert.equal(api.captureActionBinding(event(modifier, {code: `${modifier}Left`, altKey: true}), "macos", "code"), null);
  }
});
