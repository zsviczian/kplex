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

/** Run the actual literal command registrations from onload, without starting the host lifecycle. */
function registerPluginCommands(plugin, device) {
  const filename = join(root, "src/main.ts");
  const source = readFileSync(filename, "utf8");
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const pluginClass = file.statements.find(ts.isClassDeclaration);
  const onload = pluginClass.members.find((member) => member.name?.getText(file) === "onload");
  assert(onload?.body, "Plugin onload implementation is missing");
  const statements = onload.body.statements.filter((statement) => {
    if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) return false;
    const call = statement.expression;
    return call.expression.getText(file) === "this.addCommand";
  });
  assert(statements.length >= 3, "Canonical commands must be registered directly through Obsidian");
  const result = ts.transpileModule(statements.map((statement) => statement.getText(file)).join("\n"), {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS, strict: true },
  });
  assert.deepEqual((result.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error), []);
  runInNewContext(`(function () { ${result.outputText} }).call(plugin)`, {
    plugin,
    readObsidianPresentationEnvironment: () => ({ device }),
    isGraphTabCommandAvailable: (environment) => environment.device !== "phone",
    isPopoutCommandAvailable: (environment) => environment.device === "desktop",
  });
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

test("commands are registered once with canonical IDs and unchanged availability/callbacks", () => {
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
    let activeFile = null;
    const plugin = {
      addCommand(command) { commands.push(command); return command; },
      translator: (key) => key,
      activateView: () => activations.push("open"),
      rebuildIndex: (force) => activations.push(["rebuild", force]),
      activateViewInPopout: () => activations.push("popout"),
      activateSidepanel: () => activations.push("sidepanel"),
      focusInKplex: (path) => activations.push(["focus", path]),
      app: { workspace: { getActiveFile: () => activeFile } },
    };
    registerPluginCommands(plugin, device);
    assert.equal(new Set(commands.map((command) => command.id)).size, commands.length);
    assert(commands.every((command) => command.id.startsWith("kplex-")));
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
    byId("kplex-open-sidepanel").callback();
    assert.deepEqual(activations.splice(0), ["sidepanel"]);
    byId("kplex-rebuild-index").callback();
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
  }
});
