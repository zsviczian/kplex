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
  dependencies = { templateChoices: null, templatePath: "", folderValidation: { error: null }, folderPath: "", ...dependencies };
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

test("All keeps a known field in its assigned direction and refuses unassigned new fields", async () => {
  const calls = [], notices = [];
  const deps = { roleFilter: "all", knownRole: "parent", role: "parent", ontology: "Mentor",
    plugin: { rememberRelationshipOntology: async (...args) => { calls.push(args); return args[1]; }, translator: key => key },
    Notice: class { constructor(message) { notices.push(message); } } };
  assert.equal(await production("prepareField", deps)(), "Mentor");
  assert.deepEqual(calls, [["parent", "Mentor"]]);
  assert.equal(await production("prepareField", { ...deps, knownRole: null, ontology: "new field" })(), null);
  assert.equal(calls.length, 1, "All must not reassign or invent ontology membership");
  assert.deepEqual(notices, ["addRelated.chooseDirection"]);
});

test("relationship note provider uses bounded physical catalog ranking without graph visibility", () => {
  const calls = [], target = page("Target.md");
  const provider = production("getNoteResults", { useCallback: fn => fn, origin: page("Origin.md"), isNoteTarget: production("isNoteTarget"),
    plugin: { index: { search: (...args) => { calls.push(args); return [target, page("Origin.md"), { ...page("Folder"), isFolder: true }]; } } } });
  assert.deepEqual(provider("  Target  "), [target]);
  assert.deepEqual(calls, [["Target", 48, "vault-files"]]);
  assert.deepEqual(provider(" "), []);
  assert.equal(calls.length, 1);
});

test("configured completion displays the actual outcome without changing saved compatibility intent", () => {
  const creationCompletionValue = production("creationCompletionValue", {}, "src/ui/features/CreationCompletionSelect.tsx");
  for (const [continuation, selectedTarget, webUrl, editAfterCreate, expected] of [
    ["configured", null, null, false, "return"], ["configured", null, null, true, "edit"],
    ["configured", page("Target.md"), null, true, "return"], ["configured", null, "https://example.com", true, "return"],
    ["another", null, null, true, "another"], ["follow", null, null, false, "follow"],
  ]) assert.equal(production("completionValue", { creationCompletionValue, continuation, selectedTarget, webUrl, editAfterCreate }), expected);
});

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
      rememberNewNodeDefaultType: async () => {}, linkNewRelatedFile: async () => ({ state: "saved-pending", page: created }) } };
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
      createNewRelatedFileForOrigin: assert.fail, rememberNewNodeDefaultType: async () => {}, linkNewRelatedFile: async (_origin, _role, file, _field, _alias, _query, recoverMetadata) => { assert.equal(file, created.file); assert.equal(recoverMetadata, true); return { state: "saved-pending", page: created }; } } };
  await production("createNew", dependencies)("markdown"); assert.deepEqual(complete, [[created, "return", true, "saved-pending"]]);
});

test("another resets target/name/alias after confirmed publication and retains role/ontology/type", async () => {
  const affected = page("C.md"), events = [], setters = Object.fromEntries(["setSelectedTarget", "setQuery", "setAlias", "setNoteTyped", "setAliasFocused", "setPartialFile", "setPartialFailure", "setOntologyTyped", "setBrowseOntology"].map(name => [name, value => events.push([name, value])]));
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

/** Normal file durability must not publish failure UI while the relationship is still in flight. */
test("drawing creation retains recovery state only after a genuine failure", async () => {
  const created = page("Drawing.md"), hold = deferred(), failures = [], pendingFiles = [];
  const dependencies = { selectedTarget: null, webUrl: null, partialFile: null, nameValidation: { valid: true, existing: false },
    beginWrite: () => true, prepareField: async () => "Children", origin: page("A.md"), refreshCapturedPage: (_plugin, value) => value,
    session: { isSessionOpen: () => true, setWriting() {} }, query: "Drawing", alias: "", role: "child", continuation: "return",
    busyRef: { current: true }, setBusy() {}, setPartialFile: value => pendingFiles.push(value), setDefaultCreateType() {},
    complete: assert.fail, reportFailure: (...args) => failures.push(args),
    plugin: { app: { vault: { getFileByPath: () => created.file } }, createNewRelatedFileForOrigin: async () => created.file,
      rememberNewNodeDefaultType: async () => {}, linkNewRelatedFile: () => hold.promise } };
  const operation = production("createNew", dependencies)("excalidraw");
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(pendingFiles, [], "durable creation is progress, not partial failure");
  const error = new Error("Relationship could not be saved"); hold.resolve(Promise.reject(error)); await operation;
  assert.equal(failures[0][0], error); assert.equal(failures[0][2], created.file);
});

/** Creation and linking failures retain the same exact file and a persistent reason, without duplicate notices. */
test("partial recovery retains the failure reason as well as file identity", () => {
  class SavedRelationshipPendingError extends Error {}
  class PartialRelatedFileError extends Error { constructor(file) { super("Metadata write failed"); this.file = file; } }
  const created = page("Drawing.md"), files = [], reasons = [];
  const report = production("reportFailure", { SavedRelationshipPendingError, PartialRelatedFileError,
    session: { isSessionOpen: () => true }, setPartialFile: file => files.push(file), setPartialFailure: reason => reasons.push(reason),
    Notice: class { constructor() { assert.fail("Persistent partial failure must not duplicate a fleeting notice"); } } });
  report(new PartialRelatedFileError(created.file));
  report(new Error("Relationship write failed"), undefined, created.file);
  assert.deepEqual(files, [created.file, created.file]); assert.deepEqual(reasons, ["Metadata write failed", "Relationship write failed"]);
});

/** A newly created file is ready to edit after persistence even while its graph reconciliation remains pending. */
test("saved new-file relationship still completes Open for editing while indexing is pending", async () => {
  const created = page("Child.md"), outcomes = [], edits = [];
  await production("complete", { onCommitted: outcome => outcomes.push(outcome), editAfterCreate: true,
    session: { canComplete: () => true, closeForCompletion: intent => edits.push(intent), finishCompletion() {}, focusGraph: assert.fail },
    plugin: { requestNodeFlair() {}, finishNewRelatedNode: async (...args) => edits.push(args.slice(0, 3)) }, hostLeaf: "owning-leaf" })(created, "configured", true, "saved-pending");
  assert.deepEqual(outcomes, [{ state: "saved-pending", page: created }]); assert.deepEqual(edits, ["configured", [created, "owning-leaf", true]]);
});

/** Folder selection shares the existing single-flight write rather than adding another creation route. */
test("creation forwards an explicit folder and alias once through the established writer", async () => {
  const origin = page("Origin.md"), created = page("Projects/Next.md"), writes = [];
  const dependencies = { selectedTarget: null, webUrl: null, partialFile: null, nameValidation: { valid: true, existing: false },
    folderValidation: { error: null }, folderPath: "Projects", query: "Next", alias: "A readable name", origin,
    beginWrite: () => true, prepareField: async () => "Children", session: { isSessionOpen: () => true, setWriting() {} },
    continuation: "return", role: "child", refreshCapturedPage: (_plugin, value) => value,
    setDefaultCreateType() {}, busyRef: { current: false }, setBusy() {}, complete: async () => {}, reportFailure: assert.fail,
    plugin: { app: { vault: { getFileByPath: () => created.file } },
      createNewRelatedFileForOrigin: async (...args) => { writes.push(args); return created.file; },
      rememberNewNodeDefaultType: async () => {}, linkNewRelatedFile: async () => ({ state: "saved-pending", page: created }) } };
  await production("createNew", dependencies)("markdown");
  assert.deepEqual(writes, [[origin, "Next", "markdown", "A readable name", "Projects", undefined]]);
});

/** A malformed destination cannot acquire single-flight write ownership, remember ontology or touch storage. */
test("invalid folder prevents both real and placeholder creation before any write", async () => {
  for (const name of ["createNew", "createPlaceholder"]) {
    const action = production(name, { selectedTarget: null, webUrl: null, folderValidation: { error: "Invalid folder" },
      partialFile: null, nameValidation: { valid: true, existing: false }, continuation: "return", beginWrite: assert.fail });
    await action("markdown");
  }
});

/** Folder validation touches only native path metadata and never creates a folder, reads a note or starts indexing. */
test("folder path validation accepts root and nested paths but rejects traversal and file collisions", () => {
  const validate = production("validateNoteFolderPath", { normalizePath: value => value.replace(/\/{2,}/g, "/") }, "src/main.ts");
  const context = { translator: key => key, app: { vault: { getFileByPath: path => path === "File.md" ? {} : null } } };
  assert.deepEqual(validate.call(context, "/"), { folderPath: "", error: null });
  assert.deepEqual(validate.call(context, " Projects\\Ideas/ "), { folderPath: "Projects/Ideas", error: null });
  for (const path of ["../Outside", "Projects/../Outside", "C:/Outside", "Projects|Other"]) {
    assert.equal(validate.call(context, path).error, "folderPicker.invalid");
  }
  assert.equal(validate.call(context, "Projects/#Draft [old]").error, null, "Physical folder validity is independent of placeholder link grammar");
  assert.equal(validate.call(context, "File.md").error, "folderPicker.fileConflict");
});

/** Choosing a destination permits equal filenames in other folders and requires only three exact Vault lookups. */
test("folder-aware name validation is local to the selected destination", () => {
  const lookups = [], found = { path: "Projects/Next.md" };
  const validate = production("validateRelatedNoteName", {}, "src/main.ts");
  const context = { translator: key => key, app: { vault: { getFiles: assert.fail,
    getFileByPath: path => { lookups.push(path); return path === found.path ? found : null; } } } };
  assert.equal(validate.call(context, "Next", "Other").existing, null);
  assert.equal(validate.call(context, "Next", "Projects").existing, found);
  assert.equal(lookups.length, 6);
});

/** The actual folder writer must use the destination-aware validator, not a vault-wide basename query. */
test("folder-child creation permits a parent's basename but rejects an exact destination collision", async () => {
  const parent = {path: "A/test file.md"}, child = {path: "A/B/test file.md"};
  const files = new Map([[parent.path, parent]]), requests = [];
  const validateRelatedNoteName = production("validateRelatedNoteName", {}, "src/main.ts");
  const create = production("createNewNodeInFolder", {normalizePath: path => path, normalizeFieldName: value => value, Notice: class {}}, "src/main.ts");
  const context = {translator: key => key, unloading: false,
    app: {vault: {getFiles: assert.fail, getFileByPath: path => files.get(path) ?? null}},
    index: {withForegroundPriority: work => work(), insertCreatedFile: file => file},
    createNewFileInFolder: async (stem, kind, folder) => {requests.push([stem, kind, folder]);files.set(child.path, child);return child;},
    writeCreatedNodeDisplayName: async () => "", configuredDisplayNameField: () => null,
  };
  context.validateRelatedNoteName = validateRelatedNoteName.bind(context);
  assert.equal(await create.call(context, {isFolder:true, path:"folder:A/B"}, "test file", "markdown"), child);
  assert.deepEqual(requests, [["test file", "markdown", "A/B"]]);
  assert.equal(await create.call(context, {isFolder:true, path:"folder:A/B"}, "test file", "markdown"), null);
  assert.equal(requests.length, 1, "The same-folder collision must not reach creation");
  assert.equal(files.get(parent.path), parent, "The original parent's file is untouched");
});

/** A pathful unresolved reference preserves its exact folder and explicit/default display alias without creating files. */
test("placeholder references preserve the chosen folder and the filename/default or supplied alias", async () => {
  const origin = page("Origin.md"), references = [], inserted = [];
  const create = production("createPlaceholderRelatedPage", { placeholderReference: (_app, _source, path, alias) => `[[${path}|${alias}]]` }, "src/main.ts");
  const context = { translator: key => key, index: { withForegroundPriority: action => action(), get: path => path === origin.path ? origin : null,
    prepareRelationshipPair: async () => true, insertVirtualPage: path => { inserted.push(path); return { path }; } },
    validateNoteFolderPath: raw => ({ folderPath: raw, error: null }), validateRelatedNoteName: () => ({ stem: "Next", valid: true, existing: null }),
    placeholderPath: production("placeholderPath", {}, "src/main.ts"),
    writeRelationship: async (_source, _target, _field, reference) => references.push(reference), publishSavedRelationship: async () => {} };
  await create.call(context, origin, "child", "Next", "Children", "Projects");
  await create.call(context, origin, "child", "Next", "Children", "Projects", "Readable title");
  assert.deepEqual(references, ["[[Projects/Next|Next]]", "[[Projects/Next|Readable title]]"]);
  assert.deepEqual(inserted, ["Projects/Next", "Projects/Next"]);
});

/** Only the explicit modifier path adds the folder picker; ordinary Markdown materialization keeps its existing fast path. */
test("explicit folder choice opens the reused picker with the calculated placeholder destination", async () => {
  const opened = [], materialized = [], ghost = { path: "Projects/Next", name: "Next", file: null };
  const create = production("createGhostNote", { MaterializeGhostModal: class {
    constructor(...args) { this.args = args; } open() { opened.push(this.args); }
  } }, "src/main.ts");
  const context = { drawingTemplateOptions: () => null, app: {}, settings: {}, documentSession:()=>null, validateRelatedNoteName: () => ({ stem: "Next", valid: true, existing: null }),
    ghostCreationLocations: () => [{ folderPath: "Projects", label: "Projects" }], isExcalidrawAvailable: () => false,
    materializeGhostPage: async (...args) => materialized.push(args) };
  await create.call(context, ghost, false);
  assert.equal(materialized.length, 1); assert.equal(opened.length, 0);
  await create.call(context, ghost, true);
  assert.equal(materialized.length, 1); assert.equal(opened.length, 1);
  assert.equal(opened[0][2][0].folderPath, "Projects");
  assert.equal(opened[0][6],true,"Explicit modifier opening focuses the folder field");
  await opened[0][5]("markdown", "Other");
  assert.equal(materialized.at(-1)[3], "Other");
  await create.call(context, ghost, true, true);
  await opened[1][5]("markdown", "Projects");
  assert.equal(materialized.at(-1)[8], true, "The accepted modal must retain its opening in-place creation intent");
  context.isExcalidrawAvailable=()=>true;await create.call(context,ghost,false);
  assert.equal(opened[2][6],false,"Ordinary drawing-choice opening must retain quick default submission");
});

/** In-place creation promotes the endpoint without opening a document that could move a synchronized center. */
test("in-place materialization preserves the center while retaining ordinary document opening", async () => {
  const materialize = production("materializeGhostPage", {}, "src/main.ts");
  for (const wasCenter of [false, true]) for (const preserveCenter of [false, true]) for (const scoped of [false,true]) {
    const file = {path: "Next.md", parent: {path: "/"}}, opened = [], promoted = [], navigated = [];
    const host=scoped?{view:{}}:undefined;
    const context = { settings: {lastActivePath: wasCenter ? "Next" : "Origin.md"}, unloading: false,
      app: {vault: {getFileByPath: () => file}}, translator: key => key,
      validateNoteFolderPath: () => ({folderPath: "", error: null}),
      createNewFileInFolder: async () => file, writeCreatedNodeDisplayName: async () => {}, rememberNewNodeDefaultType: async () => {},
      index: {materializeFile: (...args) => {promoted.push(args); return true;}},
      remapNavigationPaths: () => {if (wasCenter) context.settings.lastActivePath = file.path; return wasCenter;},
      documentSession:()=>({centerPath:wasCenter?"Next":"Origin.md"}),
      saveSettings: async () => {}, notifyNavigation: (path,owner) => navigated.push({path,owner}), openInDocumentLeaf: async value => opened.push(value),
    };
    assert.equal(await materialize.call(context, {path: "Next", name: "Next"}, "Next", "markdown", "", "Next", undefined, {}, () => true, preserveCenter,host), true);
    assert.deepEqual(promoted, [["Next", file]]); assert.deepEqual(opened, preserveCenter ? [] : [file]);
    assert.deepEqual(navigated, scoped && !preserveCenter && wasCenter ? [{path:file.path,owner:host}] : [], "Materialization never broadcasts another Plex's saved center");
    assert.equal(context.settings.lastActivePath, wasCenter ? file.path : "Origin.md");
  }
});

/** A rejected durable relationship write must not publish a detached pathful placeholder. */
test("failed placeholder persistence leaves the virtual index untouched", async () => {
  const origin = page("Origin.md"), failure = new Error("Storage denied");
  const create = production("createPlaceholderRelatedPage", { placeholderReference: (_app, _source, path, alias) => `[[${path}|${alias}]]` }, "src/main.ts");
  const context = { translator: key => key, index: { withForegroundPriority: action => action(), get: path => path === origin.path ? origin : null,
    prepareRelationshipPair: async () => true, insertVirtualPage: assert.fail },
    validateNoteFolderPath: raw => ({ folderPath: raw, error: null }), validateRelatedNoteName: () => ({ stem: "Next", valid: true, existing: null }),
    placeholderPath: production("placeholderPath", {}, "src/main.ts"), writeRelationship: async () => { throw failure; }, publishSavedRelationship: assert.fail };
  await assert.rejects(create.call(context, origin, "child", "Next", "Children", "Projects"), error => error === failure);
});

/** Folder identities are case-sensitive even though suggestion matching remains case-insensitive. */
test("shared folder suggestions preserve case-distinct native paths without changing ontology deduplication", () => {
  const rank = production("fuzzyFilterStrings", {}, "src/ui/FuzzySearchInput.tsx");
  assert.deepEqual(rank(["Foo", "foo", "Foo"], ""), ["Foo"]);
  const render = production("FolderPathInput", {
    createElement: (type, props) => ({ type, props }), useMemo: evaluate => evaluate(),
    FuzzySearchInput() {}, fuzzyFilterStrings: rank,
  }, "src/ui/FolderPathInput.tsx");
  const props = render({ value: "fo", onChange() {}, folders: ["Foo", "foo", "Foo", "Other"], translate: key => key }).props;
  assert.deepEqual(new Set(props.results), new Set(["Foo", "foo"]));
  assert.equal(props.getKey("Foo"), "Foo"); assert.equal(props.getKey("foo"), "foo");
  assert.equal(props.autoFocus, undefined, "Normal creation keeps autofocus in the name field");
  assert.equal(props.icon, ""); assert.equal(props.disclosure, undefined, "Folder choice reuses the ordinary text suggester without a second button");
  assert.equal(props.minFloatingWidth, 560); assert.equal(props.resultsClassName, "kplex-folder-path-results");
  const partial=render({value:"/08",onChange(){},folders:["08 About","Archive/08 Meetings","Archive/09 Later"],translate:key=>key}).props;
  assert.deepEqual(partial.results,["08 About","Archive/08 Meetings"]);assert.equal(partial.matchingQuery,"08");
  assert.equal(partial.value,"/08","Search normalization must not replace the editable destination");
  const root=render({value:"/",onChange(){},folders:["/","08 About"],translate:key=>key}).props;
  assert.deepEqual(root.results,["/","08 About"]);
});

/** The explicit materialization prompt owns folder focus after its asynchronous React commit. */
test("native materialization focuses the shared folder field without changing quick-create focus", () => {
  let rendered; const folderClasses=[];
  class NativeSetting {
    constructor() { this.controlEl = { createDiv: () => ({}) }; }
    setName() { return this; } setDesc() { return this; }
    setClass(value) { folderClasses.push(value); return this; }
    addButton(configure) {
      const button = { setButtonText() { return this; }, setIcon() { return this; }, onClick() { return this; }, setCta() { return this; }, setDisabled() { return this; } };
      configure(button); return this;
    }
  }
  const open = production("onOpen", { Setting: NativeSetting,
    createRoot: () => ({ render: element => { rendered = element; } }),
    createElement: (type, props) => ({ type, props }), MaterializationFolderInput() {},
  }, "src/ui/MaterializeGhostModal.ts");
  const context = { renderTemplate() {}, defaultKind: "markdown", excalidrawAvailable: false, selectedFolderPath: "Projects", noteName: "Next", focusFolder: true,
    titleEl: { setText() {} }, contentEl: { createEl() {} }, translate: key => key,
    locations: [{ folderPath: "Projects", label: "Projects" }], app: { vault: { getAllFolders: () => [] } },
    buttons: [], nativeHandlers: [], scope: { register: () => ({}) }, partialFile: null, partialKind: null, creating: false,
  };
  context.refreshControls = production("refreshControls", { createElement: (type, props) => ({ type, props }), MaterializationFolderInput() {} }, "src/ui/MaterializeGhostModal.ts");
  open.call(context);
  assert.deepEqual(folderClasses,["kplex-materialize-folder-row"],"Folder label and input share the modal width without the description column");
  assert.equal(rendered.props.value, "Projects"); assert.equal(rendered.props.autoFocus, true);
  assert.equal(rendered.props.openResultsOnFocus, false, "The prefilled destination must start closed without losing keyboard focus");
  context.focusFolder=false;context.refreshControls();assert.equal(rendered.props.autoFocus,false,"Ordinary materialization must retain its one-step default submission");
});

/** Wider folder results retain the shared suggester's visual-viewport clamping in main windows and popouts. */
test("folder suggestion width expands readable paths but clamps to the owning visual viewport",()=>{
  for(const [viewport,minWidth,expectedWidth,expectedLeft]of [
    [{offsetLeft:0,offsetTop:0,width:1200,height:800},560,560,250],
    [{offsetLeft:40,offsetTop:60,width:320,height:400},560,304,48],
    [{offsetLeft:0,offsetTop:0,width:1200,height:800},0,220,250],
  ]){
    let style;
    const update=production("updatePosition",{shell:{getBoundingClientRect:()=>({left:250,top:150,bottom:184,width:220})},
      visualViewport:viewport,ownerWindow:{innerWidth:1200,innerHeight:800},floatingMode:"viewport",
      minFloatingWidth:minWidth,maxFloatingHeight:240,setOverlayStyle:value=>{style=value;}},"src/ui/components/FuzzySuggester.tsx");
    update();assert.equal(style.width,expectedWidth);assert.equal(style.left,expectedLeft);
    assert(style.left>=viewport.offsetLeft+8);assert(style.left+style.width<=viewport.offsetLeft+viewport.width-8);
  }
});

/** Reuse the actual canonical grammar and host-resolution facade in serializer/relocation tests. */
function literalOwners() {
  const parser = "src/core/parser/metadata.ts", facade = "src/index/fieldParser.ts", adapter = "src/adapters/obsidian/placeholderRelocation.ts";
  const tokens = production("iterateInternalLinkTokens", { WIKI_LINK_RE: production("WIKI_LINK_RE", {}, parser), MARKDOWN_LINK_RE: production("MARKDOWN_LINK_RE", {}, parser) }, parser);
  const references = production("iterateLinkReferencesFromValue", {
    WIKI_LINK_RE: production("WIKI_LINK_RE", {}, parser), MARKDOWN_LINK_RE: production("MARKDOWN_LINK_RE", {}, parser),
    URL_RE: production("URL_RE", {}, parser), splitInternalSubpath: production("splitInternalSubpath", {}, parser),
  }, parser);
  const resolveLink = production("resolveLink", {}, facade);
  const resolved = production("iterateResolvedLinksFromValue", { iterateLinkReferencesFromValue: references, resolveLink, canonicalWebUrl: value => value }, facade);
  const extract = production("extractLinksFromValue", { iterateResolvedLinksFromValue: resolved }, facade);
  const normalizePath = value => value.replaceAll("\\", "/").replace(/\/{2,}/g, "/").replace(/^\/+|\/+$/g, "");
  const coordinate = production("coordinate", { normalizePath }, adapter);
  const encodeReferencePath = production("encodeReferencePath", {}, adapter);
  const preflight = production("assertPlaceholderRelocationTarget", {}, adapter);
  return { tokens, coordinate, extract, preflight,
    serialize: production("placeholderReference", { extractLinksFromValue: extract, normalizePath, coordinate, encodeReferencePath }, adapter),
    capture: production("capturePlaceholderRelocation", { coordinate, iterateInternalLinkTokens: tokens,
      iterateCacheRefs: (cache, visit) => { for (const reference of [...cache.links ?? [], ...cache.embeds ?? []]) visit(reference); }, SOURCE_DECODE_BUDGET_BYTES: 8 * 1024 * 1024 }, adapter),
    apply: production("applyPlaceholderRelocation", { encodeReferencePath, assertPlaceholderRelocationTarget: preflight }, adapter) };
}

/** Exact native cache ranges approve changes; code examples with identical spelling remain untouched. */
function relocationFixture(text, frontmatterOriginals = ["[[Projects/Next|Alias]]"]) {
  const source = { path: "Origin.md", extension: "md", stat: { mtime: 1, size: text.length } }, created = { path: "Other/Next.md", extension: "md", stat: { mtime: 2, size: 0 } };
  const files = new Map([[source.path, source], [created.path, created]]), texts = new Map([[source.path, text]]);
  const original = "[[Projects/Next#Heading|Readable]]", start = text.indexOf(original);
  const cache = { links: start < 0 ? [] : [{ link: "Projects/Next#Heading", original, position: { start: { offset: start }, end: { offset: start + original.length } } }],
    frontmatterLinks: frontmatterOriginals.map(original => ({ link: "Projects/Next", original, key: "Child" })),
    frontmatterPosition: { start: { offset: 0 }, end: { offset: text.indexOf("\n---", 3) + 4 } } };
  const app = { metadataCache: { unresolvedLinks: { [source.path]: { "Projects/Next": 1 } }, getFileCache: () => cache,
    getFirstLinkpathDest: raw => files.get(raw) ?? files.get(raw + ".md") ?? null }, vault: { getFileByPath: raw => files.get(raw) ?? null,
    cachedRead: async file => texts.get(file.path), process: async (file, update) => { const result = update(texts.get(file.path)); texts.set(file.path, result); file.stat.mtime++; file.stat.size = result.length; return result; } } };
  return { source, created, files, texts, cache, app };
}

/** Physical bracketed folders are valid; encoded Markdown must resolve through the unchanged canonical owner. */
test("placeholder serializer round-trips bracketed paths and refuses literal hash paths before persistence", () => {
  const {serialize}=literalOwners(), source={path:"Origin.md"}, app={metadataCache:{getFirstLinkpathDest:()=>null}};
  assert.equal(serialize(app,source,"Projects/Next","Readable","unsupported"),"[[Projects/Next|Readable]]");
  assert.equal(serialize(app,source,"Projects [old]/Next","Readable","unsupported"),"[Readable](Projects%20%5Bold%5D/Next)");
  assert.throws(()=>serialize(app,source,"Projects/#Draft","Readable","unsupported"),/unsupported/);
});

/** Native provenance authorizes exact target spans without changing aliases, subpaths, YAML or a matching code sample. */
test("pathful relocation changes approved YAML and body references while retaining all other bytes", async () => {
  const owners=literalOwners(),text='---\nChild: ["[[Projects/Next|Alias]]"]\n---\nBody [[Projects/Next#Heading|Readable]]\n`[[Projects/Next|Code sample]]`\n';
  const f=relocationFixture(text),plan=await owners.capture(f.app,"Projects/Next",[f.source],"changed");
  await owners.apply(f.app,plan,f.created,()=>true,"changed");
  assert.equal(f.texts.get(f.source.path),text.replace('[[Projects/Next|Alias]]','[[Other/Next.md|Alias]]').replace('[[Projects/Next#Heading|Readable]]','[[Other/Next.md#Heading|Readable]]'));
});

/** Frontmatter caches omit offsets; an indistinguishable comment is uncertain and must fail before creation. */
test("ambiguous frontmatter occurrences and same-stat source edits fail closed", async () => {
  const owners=literalOwners(),text='---\nChild: ["[[Projects/Next|Alias]]"] # [[Projects/Next|Alias]]\n---\n';
  await assert.rejects(owners.capture(relocationFixture(text).app,"Projects/Next",[],"changed"),/changed/);
  const f=relocationFixture('---\nChild: ["[[Projects/Next|Alias]]"]\n---\n'),plan=await owners.capture(f.app,"Projects/Next",[],"changed");
  f.texts.set(f.source.path,f.texts.get(f.source.path).replace("Child","Other"));
  await assert.rejects(owners.apply(f.app,plan,f.created,()=>true,"changed"),/changed/);
  assert(f.texts.get(f.source.path).includes("Other:"));
});

/** Partial durable work preserves its exact file and retry uses the same creator result. */
test("materialization retry retains the accepted file and cannot switch kind or recreate", async () => {
  class PartialRelatedFileError extends Error { constructor(file,cause){super(cause.message);this.file=file;} }
  const file={path:"Other/Next.md"},calls=[];
  const create=production("create",{PartialRelatedFileError,SavedRelationshipPendingError:class extends Error{}},"src/ui/MaterializeGhostModal.ts");
  const context={creating:false,opened:true,partialFile:null,partialKind:null,selectedFolderPath:"Other",refreshControls(){},
    translate:key=>key,contentEl:{createDiv:()=>({setText(){}})},close(){this.opened=false;},
    onCreate:async(kind,folder,retained)=>{calls.push([kind,folder,retained]);if(calls.length===1)throw new PartialRelatedFileError(file,new Error("source write failed"));return true;}};
  await create.call(context,"markdown");assert.equal(context.partialFile,file);assert.equal(context.partialKind,"markdown");
  await create.call(context,"excalidraw");assert.equal(calls.length,1);
  await create.call(context,"markdown");assert.deepEqual(calls,[["markdown","Other",undefined],["markdown","Other",file]]);
});

/** The established resolver decodes percent-encoded fragments; relocation retains their exact suffix spelling. */
test("relocation preserves encoded heading and block suffixes", async () => {
  const owners=literalOwners();
  for(const suffix of ["%23Heading","%23%5Eblock","#Heading","#^block"]){
    const original=`[alias](Projects/Next${suffix})`,f=relocationFixture(original,[]);
    f.cache.links=[{link:decodeURIComponent(`Projects/Next${suffix}`),original,position:{start:{offset:0},end:{offset:original.length}}}];
    const plan=await owners.capture(f.app,"Projects/Next",[],"changed");await owners.apply(f.app,plan,f.created,()=>true,"changed");
    assert.equal(f.texts.get(f.source.path),`[alias](Other/Next.md${suffix})`);
  }
});

/** An awaited native source read cannot follow the created file into another destination. */
test("relocation rejects source replacement and target rename during an awaited write", async () => {
  const owners=literalOwners();
  for(const mutation of ['source-replacement','target-rename']){
    const f=relocationFixture('---\nChild: ["[[Projects/Next|Alias]]"]\n---\n'),plan=await owners.capture(f.app,"Projects/Next",[],"changed"),original=f.texts.get(f.source.path);
    const write=f.app.vault.process;
    f.app.vault.process=async(file,update)=>{
      if(mutation==='source-replacement')f.files.set(f.source.path,{...f.source});
      else{f.files.delete(f.created.path);f.created.path='Elsewhere/Next.md';f.files.set(f.created.path,f.created);}
      return write(file,update);
    };
    await assert.rejects(owners.apply(f.app,plan,f.created,()=>true,"changed"),/changed/);
    assert.equal(f.texts.get(f.source.path),original);
  }
});

/** A fulfilled source write retires its own authority; retry continues only the still-pending captured source. */
test("two-source relocation retries after one accepted write without recapturing or overwriting later user edits", async () => {
  const owners=literalOwners(),text='---\nChild: ["[[Projects/Next|Alias]]"]\n---\n',f=relocationFixture(text);
  const second={path:"Second.md",extension:"md",stat:{mtime:1,size:text.length}};
  f.files.set(second.path,second);f.texts.set(second.path,text);f.app.metadataCache.unresolvedLinks[second.path]={"Projects/Next":1};
  const plan=await owners.capture(f.app,"Projects/Next",[f.source,second],"changed"),process=f.app.vault.process,calls=[];
  let fail=true;
  f.app.vault.process=async(file,update)=>{calls.push(file.path);if(file===second&&fail){fail=false;throw Error("Second source failed");}return process(file,update);};
  await assert.rejects(owners.apply(f.app,plan,f.created,()=>true,"changed"),/Second source failed/);
  assert.equal(plan.completed.has(f.source),true);assert.equal(plan.completed.has(second),false);
  f.texts.set(f.source.path,f.texts.get(f.source.path)+"A later user edit.\n");f.source.stat.mtime++;f.source.stat.size=f.texts.get(f.source.path).length;
  await owners.apply(f.app,plan,f.created,()=>true,"changed");
  assert.deepEqual(calls,["Origin.md","Second.md","Second.md"]);
  assert(f.texts.get(f.source.path).endsWith("A later user edit.\n"));
  assert(f.texts.get(second.path).includes("[[Other/Next.md|Alias]]"));assert.equal(plan.completed.size,2);
});

/** Later metadata/navigation failure keeps the original coordinates and exact created file even after the page itself was promoted. */
test("complete retarget followed by metadata or navigation failure retries the same file and completed plan", async () => {
  const owners=literalOwners();
  class PartialRelatedFileError extends Error{constructor(file,cause){super(cause.message);this.file=file;}}
  const materialize=production("materializeGhostPage",{capturePlaceholderRelocation:owners.capture,applyPlaceholderRelocation:owners.apply,
    assertPlaceholderRelocationTarget:owners.preflight,placeholderReference:owners.serialize,PartialRelatedFileError},"src/main.ts");
  for(const stage of ["metadata","navigation"]){
    const f=relocationFixture('---\nChild: ["[[Projects/Next|Alias]]"]\n---\n');
    f.created.parent={path:"Other"};f.files.delete(f.created.path);
    const page={path:"Projects/Next",file:null},continuation={},oldPaths=[];let creates=0,attempt=0,writes=0;
    const process=f.app.vault.process;f.app.vault.process=async(...args)=>{writes++;return process(...args);};
    const context={app:f.app,settings:{lastActivePath:"Unrelated.md"},translator:key=>key,unloading:false,
      validateNoteFolderPath:folder=>({folderPath:folder,error:null}),referencingMarkdownFiles:()=>[f.source],
      createNewFileInFolder:async()=>{creates++;f.files.set(f.created.path,f.created);return f.created;},
      writeCreatedNodeDisplayName:async()=>{if(stage==="metadata"&&attempt++===0)throw Error("Later metadata failure");},
      rememberNewNodeDefaultType:async()=>{},index:{materializeFile:(oldPath,file)=>{oldPaths.push(oldPath);page.path=file.path;page.file=file;return true;}},
      remapNavigationPaths:()=>false,openInDocumentLeaf:async()=>{if(stage==="navigation"&&attempt++===0)throw Error("Later navigation failure");}};
    await assert.rejects(materialize.call(context,page,"Next","markdown","Other","Next",undefined,continuation),error=>error instanceof PartialRelatedFileError&&error.file===f.created);
    assert.equal(continuation.relocation.completed.size,1);assert.equal(continuation.relocation.target.file,f.created);
    context.referencingMarkdownFiles=assert.fail;
    assert.equal(await materialize.call(context,page,"Next","markdown","Other","Next",f.created,continuation),true);
    assert.equal(creates,1);assert.equal(writes,1);assert(oldPaths.every(path=>path==="Projects/Next"));
  }
});

/** Completed progress never grants authority to a renamed or replaced target file. */
test("completed relocation still fences retained target identity and original path", async () => {
  const owners=literalOwners();
  for(const mutation of ["replacement","rename"]){
    const f=relocationFixture('---\nChild: ["[[Projects/Next|Alias]]"]\n---\n'),plan=await owners.capture(f.app,"Projects/Next",[],"changed");
    await owners.apply(f.app,plan,f.created,()=>true,"changed");assert.equal(plan.completed.size,1);
    if(mutation==="replacement")f.files.set(f.created.path,{...f.created});
    else{f.files.delete(f.created.path);f.created.path="Moved/Next.md";f.files.set(f.created.path,f.created);}
    await assert.rejects(owners.apply(f.app,plan,f.created,()=>true,"changed"),/changed/);
  }
});

/** Encoded literal targets remain valid in single-quoted YAML and Markdown's parenthesized syntax. */
test("special folder targets preserve typed frontmatter, body aliases and literal suffixes", async () => {
  const owners=literalOwners(),source={path:"Origin.md"},app={metadataCache:{getFirstLinkpathDest:()=>null}};
  const path="People's notes [old](!*)/Next",encoded="People%27s%20notes%20%5Bold%5D%28%21%2A%29/Next";
  const serialized=owners.serialize(app,source,path,"Readable","unsupported");
  assert.equal(serialized,`[Readable](${encoded})`);
  assert.deepEqual(owners.extract(app,{Child:[serialized],Enabled:true,Rank:2},source),[path]);
  const text="---\nChild: '[Alias](Projects/Next)'\nEnabled: true\nRank: 2\n---\n[Readable](Projects/Next%23Heading)\n";
  const f=relocationFixture(text,["[Alias](Projects/Next)"]),original="[Readable](Projects/Next%23Heading)",offset=text.indexOf(original);
  f.cache.links=[{link:"Projects/Next#Heading",original,position:{start:{offset},end:{offset:offset+original.length}}}];
  f.files.delete(f.created.path);f.created.path=path+".md";f.files.set(f.created.path,f.created);
  const plan=await owners.capture(f.app,"Projects/Next",[],"changed");await owners.apply(f.app,plan,f.created,()=>true,"changed");
  const result=f.texts.get(f.source.path),target=encoded+".md";
  assert.equal(result,`---\nChild: '[Alias](${target})'\nEnabled: true\nRank: 2\n---\n[Readable](${target}%23Heading)\n`);
  assert.deepEqual(owners.extract(app,{Child:[`[Alias](${target})`],Enabled:true,Rank:2},source),[path+".md"]);
  assert.deepEqual(owners.extract(app,`[Readable](${target}%23Heading)`,source),[path+".md"]);
});

/** The callback may finish before its native promise; accepted writes remain completed on finality failure. */
test("target rename after the update callback but before native completion rejects promotion authority", async () => {
  const owners=literalOwners(),f=relocationFixture('---\nChild: ["[[Projects/Next|Alias]]"]\n---\n');
  const plan=await owners.capture(f.app,"Projects/Next",[],"changed"),write=f.app.vault.process;
  f.app.vault.process=async(file,update)=>{
    const result=await write(file,update);
    f.files.delete(f.created.path);f.created.path="Renamed/Next.md";f.files.set(f.created.path,f.created);
    return result;
  };
  await assert.rejects(owners.apply(f.app,plan,f.created,()=>true,"changed"),/changed/);
  assert(plan.completed.has(f.source),"Accepted source write must not be retried or rolled back");
  assert(f.texts.get(f.source.path).includes("[[Other/Next.md|Alias]]"));
});

/** Exercise the real materialization owner with explicit asynchronous creation and native cache barriers. */
test("materialization fences final metadata races and dismissed capture or accepted-write UI", async () => {
  const owners=literalOwners();
  class PartialRelatedFileError extends Error{constructor(file,cause){super(cause.message);this.file=file;}}
  const materialize=production("materializeGhostPage",{capturePlaceholderRelocation:owners.capture,applyPlaceholderRelocation:owners.apply,
    assertPlaceholderRelocationTarget:owners.preflight,placeholderReference:owners.serialize,PartialRelatedFileError},"src/main.ts");
  for(const stage of ["capture-cancel","create-cancel","metadata-rename","default-rename"]){
    const f=relocationFixture('---\nChild: ["[[Projects/Next|Alias]]"]\n---\n'),barrier=deferred(),entered=deferred();
    f.created.parent={path:"Other"};f.files.delete(f.created.path);
    let current=true,creates=0,promotions=0,navigations=0,opens=0,saves=0;
    const rename=()=>{f.files.delete(f.created.path);f.created.path="Renamed/Next.md";f.files.set(f.created.path,f.created);};
    const read=f.app.vault.cachedRead;
    if(stage==="capture-cancel")f.app.vault.cachedRead=async file=>{entered.resolve();await barrier.promise;return read(file);};
    const context={app:f.app,settings:{lastActivePath:"Projects/Next"},translator:key=>key,unloading:false,
      validateNoteFolderPath:folder=>({folderPath:folder,error:null}),referencingMarkdownFiles:()=>[f.source],
      createNewFileInFolder:async()=>{creates++;f.files.set(f.created.path,f.created);if(stage==="create-cancel"){entered.resolve();await barrier.promise;}return f.created;},
      writeCreatedNodeDisplayName:async()=>{if(stage==="metadata-rename")rename();},
      rememberNewNodeDefaultType:async()=>{if(stage==="default-rename")rename();},
      index:{materializeFile:()=>{promotions++;return true;}},remapNavigationPaths:()=>true,
      notifyNavigation:()=>navigations++,saveSettings:async()=>saves++,openInDocumentLeaf:async()=>opens++};
    const operation=materialize.call(context,{path:"Projects/Next",name:"Next"},"Next","markdown","Other","Next",undefined,{},()=>current);
    if(stage.endsWith("cancel")){await entered.promise;current=false;barrier.resolve();}
    if(stage.endsWith("rename")){
      await assert.rejects(operation,error=>error instanceof PartialRelatedFileError&&error.file===f.created);
      assert.equal(promotions,0);assert.equal(opens,0);assert.equal(navigations,0);
    }else{
      assert.equal(await operation,stage==="create-cancel");
      assert.equal(creates,stage==="capture-cancel"?0:1);assert.equal(opens,0);assert.equal(navigations,0);
      assert.equal(promotions,stage==="capture-cancel"?0:1);assert.equal(saves,stage==="capture-cancel"?0:1);
      if(stage==="capture-cancel")assert(f.texts.get(f.source.path).includes("[[Projects/Next|Alias]]"));
      else assert(f.texts.get(f.source.path).includes("[[Other/Next.md|Alias]]"));
    }
  }
});

/** A closed/reopened native shell must never accept a previous submission's late completion. */
test("materialization session capability expires on close even when the shell opens again", async () => {
  const barrier=deferred();let capability,closes=0,submissions=0;
  const context={generation:0,creating:false,opened:true,partialFile:null,partialKind:null,selectedFolderPath:"Other",refreshControls(){},
    folderRoot:null,nativeHandlers:[],buttons:[],contentEl:{empty(){}},scope:{unregister(){}},
    close(){closes++;},onCreate:async(_kind,_folder,_file,current)=>{submissions++;capability=current;await barrier.promise;return true;}};
  const create=production("create",{PartialRelatedFileError:class extends Error{},SavedRelationshipPendingError:class extends Error{}},"src/ui/MaterializeGhostModal.ts");
  const operation=create.call(context,"markdown");assert.equal(capability(),true);
  production("onClose",{},"src/ui/MaterializeGhostModal.ts").call(context);
  context.opened=true;
  assert.equal(capability(),false);await create.call(context,"markdown");assert.equal(submissions,1,"An accepted write excludes a second submission after reopening");
  barrier.resolve();await operation;
  assert.equal(closes,0);assert.equal(context.creating,false);
});

/** Existing placeholders retain the canonical duplicate/relink policy; only a new connection forwards its validated alias. */
test("existing placeholder delegates duplicate, relink and unconnected alias behavior to the canonical owner", async () => {
  const owners=literalOwners(),origin=page("Origin.md"),ghost={path:"Projects/Next",file:null,neighbours:new Map()};
  for(const mode of ["duplicate","connected","unconnected"]){
    const writes=[],relinks=[];let publications=0,prepared=0;
    const context={app:{metadataCache:{getFirstLinkpathDest:()=>null}},translator:key=>key,
      validateNoteFolderPath:folder=>({folderPath:folder,error:null}),validateRelatedNoteName:()=>({valid:true,stem:"Next",existing:null}),
      index:{withForegroundPriority:work=>work(),get:path=>path===origin.path?origin:path===ghost.path?ghost:null,
        gateNeighbourPaths:()=>new Set(mode==="duplicate"?[ghost.path]:[]),isConnected:()=>mode==="connected",insertVirtualPage:assert.fail},
      prepareRelationshipMutation:async()=>{prepared++;return[origin,ghost];},
      relinkCentralNeighbour:async(...args)=>{relinks.push(args);return{state:"saved-published",page:ghost};},
      writeRelationship:async(...args)=>writes.push(args),publishSavedRelationship:async()=>publications++};
    for(const method of ["placeholderPath","createRelationToPage"])
      context[method]=production(method,{Notice:class{}},"src/main.ts").bind(context);
    const create=production("createPlaceholderRelatedPage",{placeholderReference:owners.serialize},"src/main.ts");
    assert.equal(await create.call(context,origin,"left","Next","Friends","Projects","Friendly alias"),mode==="duplicate"?null:ghost);
    assert.equal(prepared,1);
    assert.deepEqual(writes,mode==="unconnected"?[[origin.file,ghost,"Friends","[[Projects/Next|Friendly alias]]"]]:[]);
    assert.deepEqual(relinks,mode==="connected"?[[origin,ghost,"left","Friends",null]]:[]);
    assert.equal(publications,mode==="unconnected"?1:0);
  }
});

/** Native Obsidian resolves literal wiki coordinates; URI escaping belongs only to Markdown targets. */
test("wiki relocation retains raw spaces, apostrophes and parentheses in body and safe native YAML", async () => {
  const owners=literalOwners(),text='---\nChild: ["[[Projects/Next|Alias]]"]\n---\n[[Projects/Next#Heading|Readable]]\n';
  const f=relocationFixture(text),target="Moved notes')/Next.md";
  f.files.delete(f.created.path);f.created.path=target;f.files.set(target,f.created);
  const plan=await owners.capture(f.app,"Projects/Next",[],"changed");owners.preflight(plan,target,"unsupported");
  await owners.apply(f.app,plan,f.created,()=>true,"changed");
  assert.equal(f.texts.get(f.source.path),`---\nChild: ["[[${target}|Alias]]"]\n---\n[[${target}#Heading|Readable]]\n`);
  assert.deepEqual(owners.extract(f.app,`[[${target}|Alias]]`,f.source),[target]);
  const body=relocationFixture("---\nTitle: 'An unrelated apostrophe'\n---\n[[Projects/Next#Heading|Readable]]\n",[]);
  const bodyPlan=await owners.capture(body.app,"Projects/Next",[],"changed");
  owners.preflight(bodyPlan,target,"unsupported");
});

/** Unsupported native wiki destinations fail before file creation, source mutation or graph publication. */
test("materialization preflight rejects bracketed wiki paths and uncertain YAML apostrophes before creation", async () => {
  const owners=literalOwners();
  const materialize=production("materializeGhostPage",{capturePlaceholderRelocation:owners.capture,
    assertPlaceholderRelocationTarget:owners.preflight,placeholderReference:owners.serialize},"src/main.ts");
  for(const [text,folder]of [
    ['---\nChild: ["[[Projects/Next|Alias]]"]\n---\n',"Moved [old]"],
    ["---\nChild: '[[Projects/Next|Alias]]'\n---\n","People's notes"],
    ['---\nChild: ["[[Projects/Next|Alias]]"]\nTitle: "An unrelated apostrophe\'s presence is uncertain"\n---\n',"People's notes"],
  ]){
    const f=relocationFixture(text);let creates=0,writes=0;
    f.app.vault.process=async()=>{writes++;assert.fail("Unsupported target must not reach a writer");};
    const context={app:f.app,translator:key=>key,validateNoteFolderPath:folder=>({folderPath:folder,error:null}),
      referencingMarkdownFiles:()=>[f.source],createNewFileInFolder:async()=>{creates++;assert.fail("Unsupported target must not create a file");}};
    await assert.rejects(materialize.call(context,{path:"Projects/Next",name:"Next"},"Next","markdown",folder),/ghost.relocationUnsupported/);
    assert.equal(creates,0);assert.equal(writes,0);assert.equal(f.texts.get(f.source.path),text);
  }
  const single=relocationFixture("---\nChild: '[[Projects/Next|Alias]]'\n---\n");
  const plan=await owners.capture(single.app,"Projects/Next",[],"changed");
  assert.throws(()=>owners.preflight(plan,"Other/#Draft.md","unsupported"),/unsupported/);
});


/** Native cache observations decode Markdown exactly once, while wiki spelling stays literal. */
test("relocation distinguishes wiki percent literals from Markdown decode-once targets", async () => {
  const owners=literalOwners();
  for(const wanted of ["Projects/Old note","Projects/Old%20note"]){
    const values=[
      {original:"[[Projects/Old note|Space]]",link:"Projects/Old note"},
      {original:"[[Projects/Old%20note|Percent]]",link:"Projects/Old%20note"},
      {original:"[Space](Projects/Old%20note%23Heading)",link:"Projects/Old note#Heading"},
      {original:"[Percent](Projects/Old%2520note%23Heading)",link:"Projects/Old%20note#Heading"},
    ];
    const text=values.map(item=>item.original).join("\n"),f=relocationFixture(text,[]);
    f.cache.links=values.map(item=>{const offset=text.indexOf(item.original);return{...item,position:{start:{offset},end:{offset:offset+item.original.length}}};});
    f.app.metadataCache.unresolvedLinks={[f.source.path]:{"Projects/Old note":2,"Projects/Old%20note":2}};
    const plan=await owners.capture(f.app,wanted,[],"changed");await owners.apply(f.app,plan,f.created,()=>true,"changed");
    const expected=wanted.endsWith("%20note")
      ? "[[Projects/Old note|Space]]\n[[Other/Next.md|Percent]]\n[Space](Projects/Old%20note%23Heading)\n[Percent](Other/Next.md%23Heading)"
      : "[[Other/Next.md|Space]]\n[[Projects/Old%20note|Percent]]\n[Space](Other/Next.md%23Heading)\n[Percent](Projects/Old%2520note%23Heading)";
    assert.equal(f.texts.get(f.source.path),expected);
  }
});

/** Percent-encoded hash is an ordinary native wiki filename component, never a heading delimiter. */
test("wiki literal percent-hash is replaced completely and frontmatter twins stay distinct", async () => {
  const owners=literalOwners(),originals=["[[Projects/Old%23note|Literal]]","[[Projects/Old#note|Heading]]"];
  const text=`---\nChild: ${JSON.stringify(originals)}\n---\n`,f=relocationFixture(text,originals);
  f.cache.frontmatterLinks=[{original:originals[0],link:"Projects/Old%23note",key:"Child.0"},{original:originals[1],link:"Projects/Old#note",key:"Child.1"}];
  f.app.metadataCache.unresolvedLinks={[f.source.path]:{"Projects/Old%23note":1,"Projects/Old":1}};
  const plan=await owners.capture(f.app,"Projects/Old%23note",[],"changed");await owners.apply(f.app,plan,f.created,()=>true,"changed");
  assert.equal(f.texts.get(f.source.path),text.replace(originals[0],"[[Other/Next.md|Literal]]"));
});

/** Inconsistent native/cache syntax and syntax-free catalogue candidates cannot silently authorize edits. */
test("uncertain percent-literal provenance fails closed instead of skipping incoming sources", async () => {
  const owners=literalOwners(),original="[[Projects/Old%20note|Literal]]",f=relocationFixture(original,[]);
  f.app.metadataCache.unresolvedLinks={[f.source.path]:{"Projects/Old note":1}};
  f.cache.links=[{original,link:"Projects/Old note",position:{start:{offset:0},end:{offset:original.length}}}];
  await assert.rejects(owners.capture(f.app,"Projects/Old note",[],"changed"),/changed/);
  f.cache.links[0].link="Projects/Old%20note";
  await assert.rejects(owners.capture(f.app,"Projects/Old note",[],"changed"),/changed/);
  assert.equal(f.texts.get(f.source.path),original);
});

/** Avoid a second URI decode and do not call the compatibility decoder native proof for wiki literals. */
test("placeholder serializer rejects ambiguous percent wiki paths and decodes Markdown fallback only once", () => {
  const owners=literalOwners(),source={path:"Origin.md"},app={metadataCache:{getFirstLinkpathDest:()=>null}};
  assert.throws(()=>owners.serialize(app,source,"Projects/Old%20note","Alias","unsupported"),/unsupported/);
  assert.equal(owners.serialize(app,source,"Projects [old]/Old%20note","Alias","unsupported"),"[Alias](Projects%20%5Bold%5D/Old%2520note)");
});


/** Raw-cache fallback is not native authority: getFirstLinkpathDest keeps its percentages literal. */
test("raw or twice-decoded Markdown cache spellings cannot authorize a relocation", async () => {
  const owners=literalOwners();
  for(const [original,link,wanted]of [
    ["[Alias](Projects/Old%20note)","Projects/Old%20note","Projects/Old note"],
    ["[Alias](Projects/Old%2520note)","Projects/Old%2520note","Projects/Old%20note"],
    ["[Alias](Projects/Old%2520note)","Projects/Old note","Projects/Old%20note"],
  ]){
    const f=relocationFixture(original,[]);
    f.app.metadataCache.unresolvedLinks={[f.source.path]:{[wanted]:1}};
    f.cache.links=[{original,link,position:{start:{offset:0},end:{offset:original.length}}}];
    await assert.rejects(owners.capture(f.app,wanted,[],"changed"),/changed/);
    assert.equal(f.texts.get(f.source.path),original);
  }
});

/** Non-removal intent must reach the actual existing-target commit after ontology preparation; UI mode alone is insufficient. */
test('native additive-only invocation survives the shared existing-target composer',async()=>{
 const origin=page('R.md'),target=page('B.md'),calls=[],commits=[];
 const link=production('linkExisting',{origin,selectedTarget:target,role:'parent',continuation:'another',session:{additiveOnly:true,isSessionOpen:()=>true,setWriting(){}},beginWrite:()=>true,prepareField:async()=> 'parents',refreshCapturedPage:(_plugin,page)=>page,busyRef:{current:true},setBusy(){},reportFailure:assert.fail,complete:async(...args)=>commits.push(args),plugin:{createRelationToPage:async(...args)=>{calls.push(args);return{state:'saved-published',page:target}}}});
 await link();assert.deepEqual(calls,[[origin,'parent',target,'parents',undefined,true]]);assert.deepEqual(commits,[[target,'another',false]]);
});
