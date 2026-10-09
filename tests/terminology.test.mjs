/**
 * Guards K-Plex runtime terminology, CSS/SVG hooks and the narrow legacy data-migration boundary.
 * Uses real source text and the plugin's transpiled command registrations; it does not claim native
 * Obsidian or React interaction coverage. No legacy UI/command alias is an allowed exception.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { buildSync } from "esbuild";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Only catalog entries explaining legacy data import may name the former product. */
const migrationCopyKeys = new Set([
  "notice.excaliBrainSettingsImported",
  "settings.importTitle",
  "settings.importHelp",
  "settings.chooseFileFirst",
  "settings.importedNotice",
  "settings.ui.migration.and.legacy.excalibrain.interoperability",
  "settings.ui.excalibrain",
  "settings.ui.import.excalibrain.settings",
  "settings.ui.import.a.backed.up.excalibrain.data.json.file.and.migrat",
]);

/** Exact token exceptions for graph-data migration and the legacy plugin lookup only. */
const migrationTokens = new Map([
  ["src/main.ts", new Set(["runningExcaliBrainSettings", "importExcaliBrainGraphSettings", "excalibrain", "notice.excaliBrainSettingsImported"])],
  ["src/settings.ts", new Set(["importExcaliBrainGraphSettings", "excalibrainFilepath", ...[...migrationCopyKeys].filter((key) => key.startsWith("settings.ui."))])],
  ["src/index/IndexedDbCache.ts", new Set(["excalibrain:index-body-cache:v2"])],
  // Decode only this historical on-disk signature member; never restore runtime branding/commands.
  ["src/core/graph/settingsPolicy.ts", new Set(["excalibrainFilepath"])],
]);

/** Enumerate actual source modules without reading generated output or dependencies. */
function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** Resolve a translation token's owning key rather than allowing the entire language directory. */
function isMigrationCopy(node) {
  for (let current = node; current; current = current.parent) {
    if (ts.isPropertyAssignment(current) && ts.isStringLiteralLike(current.name)
      && migrationCopyKeys.has(current.name.text)) return true;
  }
  return false;
}

/** Find executable identifiers/literals that use legacy branding outside explicit migration seams. */
function terminologyViolations(source, filename) {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true,
    filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const violations = [];
  /** Inspect all syntax children; comments documenting migration are intentionally not code tokens. */
  function visit(node) {
    const isTextToken = ts.isIdentifier(node) || ts.isStringLiteralLike(node) || ts.isJsxText(node)
      || node.kind === ts.SyntaxKind.TemplateHead || node.kind === ts.SyntaxKind.TemplateMiddle
      || node.kind === ts.SyntaxKind.TemplateTail;
    if (isTextToken && /excalibrain|--eb-/i.test(node.text)) {
      const allowed = filename.startsWith("src/lang/")
        ? isMigrationCopy(node)
        : migrationTokens.get(filename)?.has(node.text);
      if (!allowed) {
        const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
        violations.push(`${filename}:${line + 1}: ${node.text}`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return violations;
}

/** Bundle the actual catalog, manager and public publisher; only native effects are explicit doubles. */
const actionRuntimeSource = buildSync({ stdin: {
  contents: 'export * from "./src/core/plex/actions"; export * from "./src/core/plex/actionPreferences"; export * from "./src/application/ActionManager"; export * from "./src/adapters/obsidian/actionCommands"; export * from "./src/adapters/obsidian/actionNode"; export * from "./src/core/plex/viewPresentation";',
  resolveDir: root,
}, bundle: true, write: false, format: "cjs", platform: "node" }).outputFiles[0].text;

/** Run actual initialization without starting lifecycle, indexing, React or native workspace effects. */
function registerPluginCommands(plugin, device) {
  // The native command boundary resolves public active view classes even for ownerless commands.
  // Represent that API explicitly; a missing host method is not a legitimate unavailable action.
  class KplexView {} class KplexSidepanelView {}
  const ownerWindow = {};
  plugin.app.workspace.getActiveViewOfType ??= () => null;
  const filename = join(root, "src/main.ts");
  const source = readFileSync(filename, "utf8");
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const pluginClass = file.statements.find(ts.isClassDeclaration);
  const initialize = pluginClass.members.find((member) => member.name?.getText(file) === "initializeActions");
  assert(initialize?.body, "Plugin action assembly is missing");
  const result = ts.transpileModule(`function initializeActions() ${initialize.body.getText(file)}`, {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS, strict: true },
  });
  assert.deepEqual((result.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error), []);
  const module = {exports: {}};
  runInNewContext(actionRuntimeSource, {module, exports: module.exports});
  const api = module.exports;
  plugin.settings = {lastActivePath: "", actionPreferences: api.migrateActionPreferences({}).preferences};
  plugin.actionSurfaceHosts = new Map(); plugin.actionEditors = new Map(); plugin.actionDialogs = new Map(); plugin.actionInvocationSequence = 0;
  plugin.actionWindowId = () => "main";
  plugin.index = {get: () => null};
  runInNewContext(`${result.outputText}\ninitializeActions.call(plugin);`, {
    ...api, plugin, KplexView, KplexSidepanelView, window: {activeWindow: ownerWindow},
    translateActionText: (_translate, key) => key,
    readObsidianPresentationEnvironment: () => ({device, hostActions: {graphTab: device !== "phone", popout: device === "desktop", sidepanel: true}}),
    Notice: class { constructor(message) { throw new Error(`Unexpected notice: ${message}`); } },
    console,
  });
  return {...api, KplexView, KplexSidepanelView, ownerWindow};
}

test("runtime names are K-Plex except explicitly inventoried migration tokens", () => {
  const violations = sourceFiles(join(root, "src")).flatMap((path) =>
    terminologyViolations(readFileSync(path, "utf8"), relative(root, path).split("\\").join("/")));
  assert.deepEqual(violations, [], violations.join("\n"));
});

test("terminology gate rejects retired symbols, selectors, imports and non-migration copy", () => {
  for (const [filename, source] of [
    ["src/settings.ts", "export interface ExcaliBrainSettings {}"],
    ["src/core/graph/settingsPolicy.ts", 'const command = { id: "excalibrain-start" };'],
    ["src/main.ts", 'import { KplexView } from "./ui/ExcaliBrainView";'],
    ["src/main.ts", 'const command = { id: "excalibrain-start" };'],
    ["src/adapters/obsidian/legacyCommands.ts", 'const command = { id: "excalibrain-start" };'],
    ["src/ui/App.tsx", '<div className="excalibrain-app" />'],
    ["src/ui/App.tsx", '<div className={`excalibrain-app ${state}`} />'],
    ["src/ui/App.tsx", '<div>ExcaliBrain</div>'],
    ["src/ui/App.tsx", 'const accent = "var(--eb-accent)";'],
    ["src/lang/en.ts", 'const catalog = { "view.displayName": { message: "ExcaliBrain" } };'],
  ]) assert(terminologyViolations(source, filename).length > 0, `${filename} unexpectedly passed`);
  assert.deepEqual(terminologyViolations(
    'const catalog = { "settings.importTitle": { message: "Import ExcaliBrain settings" } };',
    "src/lang/en.ts"), []);
});

test("CSS hooks, variables, SVG markers and owning-document selectors use the K-Plex namespace", () => {
  const css = readFileSync(join(root, "styles.css"), "utf8");
  assert.doesNotMatch(css, /excalibrain|--eb-/i);
  for (const [module, tokens] of [
    ["src/ui/KplexView.tsx", ["kplex-view-host"]],
    ["src/ui/App.tsx", ["kplex-app", "kplex-topbar", "kplex-history-bar"]],
    ["src/ui/components/ActionButton.tsx", ["kplex-icon-button"]],
    ["src/ui/components/FuzzySuggester.tsx", ["kplex-search", "kplex-search-result", "kplex-search-results"]],
    ["src/ui/ThoughtNode.tsx", ["kplex-thought", "kplex-gate", "kplex-gate-count"]],
    ["src/ui/PlexGraph.tsx", ["kplex-edge-visible", "kplex-edge-hit", "kplex-zoom-controls"]],
  ]) {
    const source = readFileSync(join(root, module), "utf8");
    for (const token of tokens) {
      assert(source.includes(token), `${module} lost ${token}`);
      assert(css.includes(`.${token}`), `styles.css lost .${token}`);
    }
  }
  for (const variable of ["panel", "panel-2", "line", "muted", "text", "accent"])
    assert(css.includes(`--kplex-${variable}:`), `missing CSS variable ${variable}`);
  const graph = readFileSync(join(root, "src/ui/PlexGraph.tsx"), "utf8");
  for (const marker of ["arrow", "triangle", "dot", "bar"]) {
    assert(graph.includes(`id="kplex-${marker}"`), `missing SVG marker ${marker}`);
    assert(graph.includes(`url(#kplex-${marker})`), `missing marker reference ${marker}`);
  }
  for (const path of ["src/ui/FuzzySearchInput.tsx", "scripts/testing/obsidian/runner.mjs", "scripts/testing/obsidian/migration.mjs"])
    assert(readFileSync(join(root, path), "utf8").includes(".kplex-app"), `${path} lost its shell selector`);
  assert(readFileSync(join(root, "esbuild.config.mjs"), "utf8").includes("/* K-Plex - generated bundle */"));
});

test("canonical view symbols preserve existing serialized workspace and plugin identities", () => {
  const view = readFileSync(join(root, "src/ui/KplexView.tsx"), "utf8");
  assert.match(view, /KPLEX_VIEW_TYPE = "k-plex-react-view"/);
  assert.match(view, /KPLEX_SIDEPANEL_VIEW_TYPE = "k-plex-sidepanel-view"/);
  assert(readFileSync(join(root, "src/main.ts"), "utf8").includes('from "./ui/KplexView"'));
  for (const file of ["manifest.json", "manifest-beta.json"])
    assert.equal(JSON.parse(readFileSync(join(root, file), "utf8")).id, "k-plex");
  const retiredPath = join(root, "src/ui/ExcaliBrainView.tsx");
  if (existsSync(retiredPath)) {
    const retired = readFileSync(retiredPath, "utf8");
    assert.match(retired, /export \{\};/);
    assert.doesNotMatch(retired, /createRoot|class\s+\w+|from\s+["']/);
  }
});

test("commands are registered once with canonical IDs and unchanged availability/callbacks", async () => {
  const main = readFileSync(join(root, "src/main.ts"), "utf8");
  assert.doesNotMatch(main, /legacyCommands|registerMigratedCommand|command\.legacyShortcut/);
  const retired = join(root, "src/adapters/obsidian/legacyCommands.ts");
  if (existsSync(retired)) {
    const source = readFileSync(retired, "utf8");
    assert.match(source, /export \{\};/);
    assert.doesNotMatch(source, /addCommand|registerMigratedCommand|excalibrain-/i);
  }
  for (const path of sourceFiles(join(root, "src/lang")))
    assert.doesNotMatch(readFileSync(path, "utf8"), /command\.legacyShortcut/);
  for (const device of ["desktop", "tablet", "phone"]) {
    const commands = [];
    const activations = [];
    const nativeDialogs = [];
    let activeFile = null;
    const plugin = {
      addCommand(command) { commands.push(command); return command; },
      removeCommand() { throw new Error("Initialization must not remove commands"); },
      translator: (key) => key,
      activateView: () => activations.push("open"),
      rebuildIndex: (force) => activations.push(["rebuild", force]),
      activateViewInPopout: () => activations.push("popout"),
      activateSidepanel: () => activations.push("sidepanel"),
      focusInKplex: (path) => activations.push(["focus", path]),
      fieldAtEditorCursor: (editor) => editor.field ?? null,
      openAddToOntologyModal(field, _onSaved, onClosed) {
        activations.push(["ontology", "select", field]);
        let closed = false;
        const dialog = {close() {if (closed) return; closed = true; onClosed?.();}};
        nativeDialogs.push(dialog);
        return dialog;
      },
      assignFieldToOntology: (field, role) => activations.push(["ontology", role, field]),
      app: { workspace: { getActiveFile: () => activeFile, getMostRecentLeaf: () => null } },
    };
    registerPluginCommands(plugin, device);
    assert.equal(new Set(commands.map((command) => command.id)).size, commands.length);
    assert(commands.every((command) => command.id.startsWith("kplex-")));
    assert.equal(commands.length, 29, "22 preserved commands and seven new defaults must publish");
    plugin.actionPublisher.sync(plugin.settings.actionPreferences);
    assert.equal(commands.length, 29, "Repeated reconciliation must not duplicate stable IDs");
    assert.equal(commands.filter(command => typeof command.editorCheckCallback === "function").length, 9);
    assert(commands.every(command => command.hotkeys === undefined), "Local defaults must not become global host hotkeys");
    const byId = (id) => {
      const matches = commands.filter((command) => command.id === id);
      assert.equal(matches.length, 1, `${id} must have exactly one registration`);
      return matches[0];
    };
    const open = byId("kplex-start");
    const allowed = device !== "phone";
    assert.equal(open.checkCallback(true), allowed);
    assert.deepEqual(activations, [], "Availability checks must not execute the action");
    assert.equal(open.checkCallback(false), allowed);
    assert.deepEqual(activations.splice(0), allowed ? ["open"] : []);
    const popout = byId("kplex-open-popout");
    assert.equal(popout.checkCallback(true), device === "desktop");
    assert.equal(popout.checkCallback(false), device === "desktop");
    assert.deepEqual(activations.splice(0), device === "desktop" ? ["popout"] : []);
    assert.equal(byId("kplex-open-sidepanel").checkCallback(true), true);
    assert.deepEqual(activations, []);
    assert.equal(byId("kplex-open-sidepanel").checkCallback(false), true);
    assert.deepEqual(activations.splice(0), ["sidepanel"]);
    assert.equal(byId("kplex-rebuild-index").checkCallback(true), true);
    assert.deepEqual(activations, []);
    assert.equal(byId("kplex-rebuild-index").checkCallback(false), true);
    assert.deepEqual(activations.splice(0), [["rebuild", true]]);
    const focus = byId("kplex-focus-active-note");
    assert.equal(focus.checkCallback(true), false);
    assert.equal(focus.checkCallback(false), false);
    assert.deepEqual(activations, []);
    activeFile = { path: "Current.md" };
    assert.equal(focus.checkCallback(true), true);
    assert.deepEqual(activations, []);
    assert.equal(focus.checkCallback(false), true);
    assert.deepEqual(activations, [["focus", "Current.md"]]);
    activations.length = 0;
    for (const role of ["select", "parent", "child", "left", "right", "previous", "next", "hidden", "excluded"]) {
      const command = byId(`kplex-ontology-${role}`), editor = {field: "related"};
      assert.equal(command.editorCheckCallback(true, {}, {}), false);
      assert.equal(command.editorCheckCallback(false, {}, {}), false);
      assert.equal(command.editorCheckCallback(true, editor, {}), true);
      assert.deepEqual(activations, [], "Editor availability cannot assign or open a selector");
      assert.equal(plugin.actionEditors.size, 0, "Checking must release the supplied native editor");
      assert.equal(command.editorCheckCallback(false, editor, {}), true);
      assert.deepEqual(activations.splice(0), [["ontology", role, "related"]]);
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(plugin.actionEditors.size, 0, "Execution must release the native editor after settlement");
      if (role === "select") {
        assert.equal(plugin.actionDialogs.size, 1, "The host must own the opened ontology selector");
        assert.equal(command.editorCheckCallback(true, editor, {}), false, "A live selector session must prevent duplicate launch");
        assert.equal(plugin.actionEditors.size, 0, "Busy checking must still release its temporary editor");
        assert.deepEqual(activations, []);
        nativeDialogs.at(-1).close();
        assert.equal(plugin.actionDialogs.size, 0, "Native close must release host dialog ownership");
        assert.equal(command.editorCheckCallback(true, editor, {}), true, "Native close must also release the manager session guard");
        assert.equal(plugin.actionEditors.size, 0);
      }
    }
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(plugin.actionEditors.size, 0, "Execution must release native editors after settlement");
    plugin.actionManager.dispose();
  }
});

test("selected creation commands check their selected endpoint independently of a folder Plex center", () => {
  const commands = [], roles = ["parent", "child", "left", "right", "previous", "next"];
  let centerChecks = 0;
  const nativeFile = {path: "Selected.md", extension: "md"};
  const file = {path: nativeFile.path, file: nativeFile, isFolder: false, isTag: false, url: null};
  const folder = {path: "Folder", file: null, isFolder: true, isTag: false, url: null};
  const pages = new Map([[file.path, file], [folder.path, folder]]);
  const plugin = {
    addCommand(command) {commands.push(command); return command;},
    removeCommand() {throw new Error("Enabling selected publication must retain existing commands");},
    translator: key => key,
    commandCentralPage() {centerChecks++; return null;},
    app: {workspace: {getMostRecentLeaf: () => null}, vault: {getFileByPath: path => path === nativeFile.path ? nativeFile : null}},
  };
  const api = registerPluginCommands(plugin, "desktop");
  const activeView = new api.KplexSidepanelView(), activeLeaf = {view: activeView};
  activeView.leaf = activeLeaf;
  activeView.containerEl = {ownerDocument: {defaultView: api.ownerWindow}};
  plugin.app.workspace.getActiveViewOfType = type => activeView instanceof type ? activeView : null;
  plugin.actionSurfaceHosts.set("graph", {leaf: activeLeaf, generation: 1});
  plugin.settings.lastActivePath = folder.path; plugin.index.get = path => pages.get(path);
  let selected = file;
  plugin.actionManager.registerSurface({id: "graph", generation: 1, readSnapshot: () => ({
    mounted: true, visible: true, windowId: "main", center: api.actionNodeRef(folder),
    selected: selected ? {node: api.actionNodeRef(selected), occurrenceId: "selected-occurrence"} : null,
    focusRegion: "graph", commandFocusRegion: "graph", interactionRevision: 1,
  })});
  const publishedCommands = Object.fromEntries(roles.map(role => [`relationship.create-selected.${role}`, true]));
  assert.equal(plugin.actionPublisher.sync({...plugin.settings.actionPreferences, publishedCommands}).failures.length, 0);
  const commandFor = id => commands.find(command => command.id === api.ACTION_BY_ID.get(id).command.id);
  for (const role of roles) assert.equal(commandFor(`relationship.create-selected.${role}`).checkCallback(true), true,
    `Selected Markdown ${role} creation must remain available with a folder center`);
  assert.equal(centerChecks, 0, "Selected actions must not inherit the legacy shared-center predicate");
  assert.equal(commandFor("relationship.create-center.child").checkCallback(true), false,
    "The preserved legacy global Add child command still excludes folder centers");
  selected = folder;
  for (const role of roles) assert.equal(commandFor(`relationship.create-selected.${role}`).checkCallback(true), role === "child",
    "Only selected folder-child creation may use the existing physical-folder factory");
  selected = null;
  for (const role of roles) assert.equal(commandFor(`relationship.create-selected.${role}`).checkCallback(true), false,
    "Selected commands must not fall back to the center after selection disappears");
  assert.equal(plugin.actionDialogs.size, 0, "Checking must not open a native composer or create a file");
  assert.equal(plugin.actionEditors.size, 0);
  plugin.actionManager.dispose();
});
