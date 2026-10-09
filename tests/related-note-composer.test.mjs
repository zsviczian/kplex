/**
 * Exercises production composer/session callbacks with bounded host capabilities. Covers captured
 * file identity, asynchronous duplicate protection, truthful saved/partial outcomes and widget ownership.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import test from "node:test";

/** Compile the actual callback or method with injected capabilities, keeping production control flow intact. */
function production(name, dependencies = {}, path = "src/ui/NewRelatedNoteModal.ts") {
  const source = ts.createSourceFile(path, readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  /** Find one named production callback without evaluating the native Obsidian shell. */
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) expression = node.initializer.getText(source);
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) expression = node.getText(source).replace(/^export\s+/, "");
    if (ts.isMethodDeclaration(node) && node.name.getText(source) === name) {
      const text = node.getText(source);
      expression = `${node.modifiers?.some(item => item.kind === ts.SyntaxKind.AsyncKeyword) ? "async " : ""}function ${name}${text.slice(text.indexOf("("))}`;
    }
    ts.forEachChild(node, visit);
  }
  visit(source); assert(expression, name);
  const output = ts.transpileModule(`const selected = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.None } }).outputText;
  return Function(...Object.keys(dependencies), `${output}; return selected;`)(...Object.values(dependencies));
}

/** Return a physical page whose file identity can survive a rename but not replacement. */
function page(path) { return { path, file: { path, extension: "md" }, neighbours: new Map() }; }

/** Deferred writer allows two synchronous submits before any React busy-state update. */
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }

test("native Modal isOpen boolean cannot shadow composer readiness for button or Scope submit", async () => {
  class NativeModalFixture { constructor() { this.isOpen = true; } }
  const session = new NativeModalFixture();
  Object.assign(session, { opened: true, invalidated: false, invocation: {}, contentEl: { querySelector: () => null } });
  session.isSessionOpen = production("isSessionOpen");
  session.setWriting = production("setWriting");
  const origin = page("A.md"), created = page("New.md"), busyRef = { current: false };
  let writes = 0, completions = 0, finished = deferred();
  const dependencies = { session, busyRef, savedPending: null, setBusy() {}, origin, partialFile: null,
    query: "New", alias: "", selectedTarget: null, webUrl: null, nameValidation: { valid: true, existing: false },
    continuation: "return", role: "child", prepareField: async () => "Child", refreshCapturedPage: (_plugin, target) => target,
    setPartialFile() {}, setDefaultCreateType() {}, reportFailure: assert.fail,
    complete: async () => { completions++; finished.resolve(); },
    plugin: { app: { vault: { getFileByPath: () => created.file } }, translator: key => key,
      createNewRelatedFileForOrigin: async () => { writes++; return created.file; },
      rememberNewNodeDefaultType: async () => {}, linkNewRelatedFile: async () => created } };
  dependencies.beginWrite = production("beginWrite", dependencies);
  dependencies.createNew = production("createNew", dependencies);
  const submit = production("submit", { continuation: "return", selectedTarget: null, webLinkAvailable: false,
    createAvailable: true, partialFile: null, defaultCreateType: "markdown", createNew: dependencies.createNew });
  const button = production("markdownButton", { createElement: (type, props) => ({ type, props }), ObsidianIcon: {},
    defaultCreateType: "markdown", createAvailable: true, busy: false, plugin: dependencies.plugin, submit });
  const formerGuard = Function(...Object.keys(dependencies), `return (${dependencies.beginWrite.toString().replace("session.isSessionOpen()", "session.isOpen()")});`)(...Object.values(dependencies));
  assert.throws(() => formerGuard(), TypeError, "the former production submit guard fails on native host state before any writer");
  button.props.onClick(); await finished.promise; await Promise.resolve();
  assert.equal(writes, 1); assert.equal(completions, 1); assert.equal(busyRef.current, false);
  finished = deferred(); session.submitCallback = submit;
  const event = { defaultPrevented: false, isComposing: false, repeat: false, getModifierState: () => false,
    preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
  assert.equal(production("submitKey").call(session, event), false);
  await finished.promise; await Promise.resolve();
  assert.equal(writes, 2); assert.equal(completions, 2); assert.equal(event.defaultPrevented, true);
  assert.equal(session.isOpen, true, "composer must preserve the native host boolean");
});

test("captured reference cannot be retargeted by subsequent canonical-page file mutation", () => {
  const canonical = page("A.md"), captured = production("captureRelatedEndpoint")(canonical), original = canonical.file;
  canonical.file = { path: "A.md", extension: "md" }; canonical.path = "B.md";
  assert.equal(captured.path, "A.md"); assert.equal(captured.file, original);
});

test("captured endpoints follow same-file rename and reject deletion/recreation", () => {
  const origin = page("A.md"), target = page("C.md"), files = new Map([[origin.path, origin.file], [target.path, target.file]]);
  const plugin = { translator: key => key, app: { vault: { getFileByPath: path => files.get(path) } }, index: { get: () => undefined } };
  const refresh = production("refreshCapturedPage", { captureRelatedEndpoint: production("captureRelatedEndpoint") });
  origin.file.path = "Renamed.md"; files.delete("A.md"); files.set(origin.file.path, origin.file);
  assert.equal(refresh(plugin, origin).path, "Renamed.md");
  files.set(target.path, { path: target.path, extension: "md" });
  assert.throws(() => refresh(plugin, target), /endpointChanged/);
  files.delete(origin.file.path); assert.throws(() => refresh(plugin, origin), /endpointChanged/);
});

test("one delayed writer runs for two same-turn submits and retained origin never becomes current center", async () => {
  const origin = page("A.md"), selectedTarget = page("C.md"), hold = deferred(), calls = [], commits = [];
  const session = { isSessionOpen: () => true, setWriting() {} }, busyRef = { current: false };
  const dependencies = { origin, selectedTarget, role: "child", continuation: "another", session, busyRef, savedPending: null,
    setBusy() {}, prepareField: async () => "children", refreshCapturedPage: (_plugin, value) => value,
    complete: async (value, intent) => commits.push([value, intent]), reportFailure: assert.fail,
    plugin: { createRelationToPage: async (...args) => { calls.push(args); await hold.promise; return { state: "saved-published", page: selectedTarget }; } } };
  dependencies.beginWrite = production("beginWrite", dependencies);
  const link = production("linkExisting", dependencies);
  const first = link(), second = link(); await Promise.resolve(); await Promise.resolve();
  assert.equal(calls.length, 1); assert.equal(calls[0][0], origin); assert.equal(calls[0][2], selectedTarget);
  hold.resolve(); await Promise.all([first, second]); assert.deepEqual(commits, [[selectedTarget, "another"]]); assert.equal(busyRef.current, false);
});

test("unavailable legacy writer result is never announced as a saved relationship", async () => {
  const selectedTarget = page("C.md"), commits = [];
  const link = production("linkExisting", { selectedTarget, origin: page("A.md"), role: "child", continuation: "configured",
    beginWrite: () => true, session: { isSessionOpen: () => true, setWriting() {} }, prepareField: async () => "children", busyRef: { current: true }, setBusy() {},
    refreshCapturedPage: (_plugin, value) => value, plugin: { createRelationToPage: async () => ({ state: "unavailable" }) },
    complete: async () => commits.push(true), reportFailure: assert.fail });
  await link(); assert.deepEqual(commits, []);
});

test("saved-pending reports commitment once and disables duplicate submit without clearing input", () => {
  class SavedRelationshipPendingError extends Error { constructor(message, noticeReported = false) { super(message); this.noticeReported = noticeReported; } }
  class PartialRelatedFileError extends Error {}
  const target = page("C.md"), notices = [], commits = [], pending = [], busyRef = { current: false };
  const report = production("reportFailure", { SavedRelationshipPendingError, PartialRelatedFileError,
    session: { isSessionOpen: () => true },
    Notice: class { constructor(message) { notices.push(message); } }, setSavedPending: value => pending.push(value), onCommitted: value => commits.push(value),
    setPartialFile: assert.fail, plugin: { index: { get: () => undefined } }, origin: page("A.md"), webUrl: null, nameValidation: { stem: "New" } });
  report(new SavedRelationshipPendingError("Saved, awaiting graph"), target);
  assert.deepEqual(commits, [{ state: "saved-pending", page: target }]); assert.deepEqual(pending, [target]); assert.deepEqual(notices, ["Saved, awaiting graph"]);
  const begin = production("beginWrite", { busyRef, savedPending: target, session: { isSessionOpen: () => true }, setBusy: assert.fail });
  assert.equal(begin(), false); assert.equal(busyRef.current, false);
  report(new SavedRelationshipPendingError("Already reported pending", true), target);
  assert.equal(commits.length, 2); assert.equal(pending.length, 2);
  assert.deepEqual(notices, ["Saved, awaiting graph"], "already emitted adapter notice must not be repeated by composer");
});

test("partial file recovery reuses exact created file and never reissues create", async () => {
  const origin = page("A.md"), created = page("Already-created.md"), complete = [];
  const dependencies = { origin, partialFile: created.file, query: "New", alias: "", selectedTarget: null, webUrl: null,
    nameValidation: { valid: true, existing: true }, continuation: "return", role: "child", beginWrite: () => true,
    session: { isSessionOpen: () => true, setWriting() {} }, busyRef: { current: true }, setBusy() {}, prepareField: async () => "children",
    refreshCapturedPage: (_plugin, value) => value, setPartialFile() {}, setDefaultCreateType() {}, reportFailure: assert.fail,
    complete: async (...args) => complete.push(args), plugin: { app: { vault: { getFileByPath: () => created.file } },
      createNewRelatedFileForOrigin: assert.fail, rememberNewNodeDefaultType: async () => {}, linkNewRelatedFile: async (_origin, _role, file, _field, _alias, _query, recoverMetadata) => { assert.equal(file, created.file); assert.equal(recoverMetadata, true); return created; } } };
  await production("createNew", dependencies)("markdown"); assert.deepEqual(complete, [[created, "return", true]]);
});

test("another resets target/name/alias after confirmed publication and retains role/ontology/type", async () => {
  const affected = page("C.md"), events = [], setters = Object.fromEntries(["setSelectedTarget", "setQuery", "setAlias", "setNoteTyped", "setAliasFocused", "setPartialFile", "setOntologyTyped", "setBrowseOntology"].map(name => [name, value => events.push([name, value])]));
  await production("complete", { ...setters, onCommitted: value => events.push(["commit", value]), session: { canComplete: () => true, focusName: () => events.push(["focus"]) }, plugin: { requestNodeFlair() {} } })(affected, "another", true);
  assert.equal(events[0][0], "commit"); assert(events.some(([name, value]) => name === "setQuery" && value === ""));
  assert(events.some(([name, value]) => name === "setAlias" && value === "")); assert.equal(events.at(-1)[0], "focus");
  assert(!events.some(([name]) => ["setRole", "setOntology", "setDefaultCreateType"].includes(name)));
});

test("close during a saved write reports commitment but prevents late navigation and focus", async () => {
  const commits = [];
  await production("complete", { onCommitted: result => commits.push(result), session: { canComplete: () => false }, plugin: { requestNodeFlair: assert.fail, finishNewRelatedNode: assert.fail } })(page("C.md"), "edit", true);
  assert.equal(commits.length, 1); assert.equal(commits[0].state, "saved-published");
});

test("dismissed pending and partial writes preserve durable outcomes without transient state or notices", () => {
  class SavedRelationshipPendingError extends Error {}
  class PartialRelatedFileError extends Error { constructor(file) { super("partial"); this.file = file; } }
  const target = page("C.md"), commits = [];
  const report = production("reportFailure", { SavedRelationshipPendingError, PartialRelatedFileError,
    session: { isSessionOpen: () => false }, Notice: class { constructor() { assert.fail("late Notice"); } },
    setSavedPending: assert.fail, setPartialFile: assert.fail, onCommitted: outcome => commits.push(outcome),
    plugin: { index: { get: () => target } } });
  report(new SavedRelationshipPendingError("saved"), target);
  report(new PartialRelatedFileError(target.file)); report(new Error("failed"));
  assert.deepEqual(commits, [{ state: "saved-pending", page: target }]);
});

test("dismissal after physical file creation keeps the file and suppresses late linking or partial notices", async () => {
  let open = true, created = 0;
  const file = page("Created.md").file;
  const create = production("createNew", { selectedTarget: null, webUrl: null, partialFile: null, nameValidation: { valid: true, existing: false },
    beginWrite: () => true, prepareField: async () => "children", origin: page("A.md"), refreshCapturedPage: (_plugin, value) => value,
    session: { isSessionOpen: () => open, setWriting() {} }, query: "Created", alias: "", role: "child", continuation: "return",
    busyRef: { current: true }, setBusy: assert.fail, setPartialFile: assert.fail, setDefaultCreateType: assert.fail,
    complete: assert.fail, reportFailure: assert.fail, Notice: class { constructor() { assert.fail("late Notice"); } },
    plugin: { createNewRelatedFileForOrigin: async () => { created++; open = false; return file; }, linkNewRelatedFile: assert.fail } });
  await create("markdown"); assert.equal(created, 1); assert.equal(file.path, "Created.md");
});

test("modified submit gives open suggestions ownership and repeat never invokes save", () => {
  let submissions = 0, consumed = 0, suggestions = true;
  const submit = production("submitKey").bind({ contentEl: { querySelector: () => suggestions }, isSessionOpen: () => true, submitCallback: () => submissions++ });
  const event = { key: "Enter", defaultPrevented: false, isComposing: false, repeat: false, getModifierState: () => false, preventDefault: () => consumed++, stopPropagation() {} };
  assert.equal(submit(event, "another"), undefined); assert.equal(consumed, 0);
  suggestions = false; event.isComposing = true; assert.equal(submit(event), undefined); event.isComposing = false;
  event.repeat = true; assert.equal(submit(event), false); assert.equal(submissions, 0);
  event.repeat = false; assert.equal(submit(event, "another"), false); assert.equal(submissions, 1);
});

test("suggester modified Enter accepts one suggestion before submit, retaining IME and AltGraph ownership", () => {
  const selected = {}, chosen = [], submits = [];
  const keyDown = production("onKeyDown", { preferSuggestionOnModifiedEnter: true, visibleResults: [selected], clampedSelectedIndex: 0, choose: value => chosen.push(value), onCtrlEnter: () => submits.push(true) }, "src/ui/components/FuzzySuggester.tsx");
  const event = { key: "Enter", ctrlKey: true, metaKey: false, repeat: false, nativeEvent: { isComposing: true }, getModifierState: () => false, preventDefault() {}, stopPropagation() {} };
  keyDown(event); assert.equal(chosen.length, 0); event.nativeEvent.isComposing = false; keyDown(event);
  assert.deepEqual(chosen, [selected]); assert.deepEqual(submits, []);
  event.getModifierState = () => true; keyDown(event); assert.equal(chosen.length, 1);
});

test("focus restoration refuses a retired or migrated owner and preserves the exact connected invoker", () => {
  const document = { defaultView: {} }, container = { isConnected: true, ownerDocument: document }, active = { isConnected: true, ownerDocument: document, focus() { this.focused = true; } };
  const context = { invalidated: false, opened: true, completing: false, invocation: { current: () => true }, hostContainer: container, invokingDocument: document, invokingElement: active, focusGraph: assert.fail };
  context.canComplete = production("canComplete").bind(context); const restore = production("restoreInvoker").bind(context);
  restore(); assert.equal(active.focused, true); active.focused = false; container.ownerDocument = { defaultView: {} }; restore(); assert.equal(active.focused, false);
  container.ownerDocument = document; context.invalidated = true; restore(); assert.equal(active.focused, false);
});

/** Portaled suggestions are an owned interaction even though their list sits directly under body. */
test("composer recognizes only its exact portal session identity", () => {
  const owns = production("ownsInteractionTarget").bind({ modalEl: { contains: () => false }, suggestionOwnerId: "session-A" });
  assert.equal(owns({ closest: selector => selector === '[data-fuzzy-owner="session-A"]' ? {} : null }), true);
  assert.equal(owns({ closest: () => null }), false);
  assert.equal(owns({}), false);
});

test("another focus waits for the enabled field and ignores a dismissed frame", () => {
  const frames = new Map(), cancelled = [], field = { disabled: true, focus() { this.focused = true; } };
  let sequence = 0, open = true;
  const owner = { requestAnimationFrame: callback => { const id = ++sequence; frames.set(id, callback); return id; }, cancelAnimationFrame: id => { cancelled.push(id); frames.delete(id); } };
  const context = { nameFocusFrame: null, isSessionOpen: () => open, contentEl: { ownerDocument: { defaultView: owner }, querySelector: () => field } };
  const focusName = production("focusName").bind(context);
  const runFrame = () => { const [id, callback] = frames.entries().next().value; frames.delete(id); callback(); };
  focusName(); runFrame(); assert.equal(field.focused, undefined); assert.equal(frames.size, 1);
  field.disabled = false; runFrame(); assert.equal(field.focused, true);
  field.focused = false; focusName(); focusName(); assert.equal(cancelled.length, 1);
  open = false; runFrame(); assert.equal(field.focused, false); assert.equal(frames.size, 0);
});
