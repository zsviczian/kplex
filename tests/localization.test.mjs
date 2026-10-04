/**
 * Validates K-Plex localization catalog contracts, bundled locale coverage, host-language fallback,
 * shortcut presentation and the source-wide user-facing literal ownership gate.
 */
import assert from "node:assert/strict";
import { auditUserCopy } from "./support/localizationAudit.mjs";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function compileModules(relativePaths, prefix = "kplex-localization-test-") {
  const temp = mkdtempSync(join(tmpdir(), prefix));
  for (const relativePath of relativePaths) {
    const sourcePath = join(root, relativePath);
    const outputPath = join(temp, relativePath.replace(/\.tsx?$/, ".js"));
    mkdirSync(dirname(outputPath), { recursive: true });
    const result = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2021,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        strict: true,
      },
      fileName: sourcePath,
      reportDiagnostics: true,
    });
    const errors = (result.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
    if (errors.length) {
      rmSync(temp, { recursive: true, force: true });
      throw new Error(errors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")).join("\n"));
    }
    writeFileSync(outputPath, result.outputText);
  }
  return temp;
}

const localizationModulePaths = [
  "src/lang/en.ts",
  "src/lang/catalog.ts",
  "src/lang/de.ts",
  "src/lang/es.ts",
  "src/lang/fr.ts",
  "src/lang/ja.ts",
  "src/lang/nl.ts",
  "src/lang/ru.ts",
  "src/lang/zh-TW.ts",
  "src/lang/index.ts",
];

const portableTemp = compileModules([
  ...localizationModulePaths,
  "src/core/contracts/presentationEnvironment.ts",
  "src/core/plex/shortcutPresentation.ts",
  "src/core/plex/predicate.ts",
  "src/core/plex/predicateParser.ts",
  "src/ui/features/searchPresentation.ts",
  "src/ui/features/positionPresentation.ts",
]);
process.on("exit", () => rmSync(portableTemp, { recursive: true, force: true }));
const localization = require(join(portableTemp, "src/lang/index.js"));
const shortcut = require(join(portableTemp, "src/core/plex/shortcutPresentation.js"));
const searchPresentation = require(join(portableTemp, "src/ui/features/searchPresentation.js"));

const shortcutLabels = {
  shift: "Shift",
  command: "Command",
  control: "Control",
  option: "Option",
  alt: "Alt",
};

function environment({ keyConvention = "macos", keyboard = true, pointer = true, touch = false } = {}) {
  return {
    device: "desktop",
    keyConvention,
    inputModes: { keyboard, pointer, touch },
    hostActions: { graphTab: true, sidepanel: true, popout: true },
  };
}

test("English catalog is strict, typed at source, and remains the fallback", () => {
  const english = localization.createTranslator("en");
  assert.equal(english("command.openGraph"), "Open graph");
  assert.equal(english("toolbar.navigateBack"), "Navigate back");
  assert.equal(english("toolbar.navigateForward"), "Navigate forward");
  assert.equal(english("search.placeholderWithShortcut", { shortcut: "Command+F" }), "Search Vault files… (Command+F)");

  const futureGerman = localization.createTranslator("de_DE", {
    "de-DE": {
      "search.ariaLabel": { message: "Suchen (DE)", context: "Synthetic exact-locale test only.", params: [] },
    },
    de: {
      "search.placeholder": { message: "Suchen…", context: "Synthetic base-locale test only.", params: [] },
    },
  });
  assert.equal(futureGerman("search.ariaLabel"), "Suchen (DE)", "locale identifiers must normalize before exact matching");
  assert.equal(futureGerman("search.placeholder"), "Suchen…", "missing exact-locale keys must fall back to the base locale");
  assert.equal(futureGerman("command.openGraph"), "Open graph", "missing locale keys must fall back to English");
  assert.equal(localization.createTranslator("zz-ZZ")("command.openGraph"), "Open graph", "unknown locale must fall back to English");
});

test("bundled locale catalogs are complete and provide translated copy", () => {
  const englishKeys = Object.keys(require(join(portableTemp, "src/lang/en.js")).englishCatalog).sort();
  const catalogs = [
    ["de", "de.js", "germanCatalog", "Graph öffnen"],
    ["fr", "fr.js", "frenchCatalog", "Ouvrir le graphe"],
    ["es", "es.js", "spanishCatalog", "Abrir gráfico"],
    ["nl", "nl.js", "dutchCatalog", "Graph openen"],
    ["ja", "ja.js", "japaneseCatalog", "グラフを開く"],
    ["zh-TW", "zh-TW.js", "traditionalChineseCatalog", "開啟圖譜"],
    ["ru", "ru.js", "russianCatalog", "Открыть граф"],
  ];

  for (const [locale, file, exportName, expected] of catalogs) {
    const catalog = require(join(portableTemp, `src/lang/${file}`))[exportName];
    assert.deepEqual(Object.keys(catalog).sort(), englishKeys, `${locale} must translate every English catalog key`);
    assert.equal(localization.createTranslator(locale)("command.openGraph"), expected);
  }
  assert.equal(localization.createTranslator("de-DE")("command.openGraph"), "Graph öffnen");
  assert.equal(localization.createTranslator("zh_TW")("command.openGraph"), "開啟圖譜");
});

test("unknown keys and bad interpolation fail instead of leaking raw/blank UI", () => {
  const translate = localization.createTranslator("en");
  assert.throws(() => translate("missing.key"), /Unknown localization key/);
  assert.throws(() => translate("search.placeholderWithShortcut"), /Missing localization parameter shortcut/);
  assert.throws(() => translate("search.ariaLabel", { shortcut: "Command+F" }), /Unexpected localization parameter shortcut/);
});

test("catalog validation rejects malformed messages, placeholders and plural forms", () => {
  assert.throws(() => localization.validateCatalog("bad", {
    x: { message: "", context: "test", params: [] },
  }), /message must be non-empty/);
  assert.throws(() => localization.validateCatalog("bad", {
    x: { message: "Hello {name}", context: "test", params: [] },
  }), /placeholder \{name\} is not declared/);
  assert.throws(() => localization.validateCatalog("bad", {
    x: { plural: { one: "{count} item" }, countParam: "count", context: "test", params: ["count"] },
  }), /plural must define other/);
  assert.throws(() => localization.validateCatalog("bad", {
    x: { plural: { one: "{count} item", other: "{count} items" }, countParam: "n", context: "test", params: ["count"] },
  }), /countParam must name one declared parameter/);
});

test("future locale catalogs cannot drift from source keys and parameter contracts", () => {
  assert.throws(() => localization.createTranslator("de", {
    de: { "unknown.key": { message: "Unbekannt", context: "Synthetic test.", params: [] } },
  }), /key is absent from the English source catalog/);
  assert.throws(() => localization.createTranslator("de", {
    de: { "search.placeholderWithShortcut": { message: "Suche", context: "Synthetic test.", params: [] } },
  }), /parameters differ from the English source catalog/);
  assert.throws(() => localization.createTranslator("de", {
    de: { "notice.indexedNodes": { message: "Indiziert {count}", context: "Synthetic test.", params: ["count"] } },
  }), /plural shape differs from the English source catalog/);
});

test("English plural selection is supported while migrated wording stays byte-for-byte equivalent", () => {
  const translate = localization.createTranslator("en");
  assert.equal(translate("notice.indexedNodes", { count: 1 }), "K-Plex indexed 1 nodes.");
  assert.equal(translate("notice.indexedNodes", { count: 2 }), "K-Plex indexed 2 nodes.");
  assert.throws(() => translate("notice.indexedNodes", { count: "many" }), /must be numeric/);
});

test("future locales use their own plural categories rather than English count equals one", () => {
  const catalog = {
    "notice.indexedNodes": {
      plural: {
        one: "one:{count}",
        few: "few:{count}",
        many: "many:{count}",
        other: "other:{count}",
      },
      countParam: "count",
      context: "Synthetic plural-rule test only.",
      params: ["count"],
    },
  };
  const translate = localization.createTranslator("ru", { ru: catalog });
  assert.equal(translate("notice.indexedNodes", { count: 1 }), "one:1");
  assert.equal(translate("notice.indexedNodes", { count: 2 }), "few:2");
  assert.equal(translate("notice.indexedNodes", { count: 5 }), "many:5");
  assert.throws(() => localization.createTranslator("ru", {
    ru: { "notice.indexedNodes": { ...catalog["notice.indexedNodes"], plural: { other: "other:{count}" } } },
  }), /plural form .* is required/);
});

test("shortcut formatter is deterministic across desktop and explicit mobile keyboard conventions", () => {
  const modF = { key: "F", modifiers: ["mod"] };
  assert.equal(shortcut.formatShortcut(modF, environment({ keyConvention: "macos" }), shortcutLabels), "Command+F");
  assert.equal(shortcut.formatShortcut(modF, environment({ keyConvention: "windows" }), shortcutLabels), "Control+F");
  assert.equal(shortcut.formatShortcut(modF, environment({ keyConvention: "ios" }), shortcutLabels), "Command+F");
  assert.equal(shortcut.formatShortcut(modF, environment({ keyConvention: "android" }), shortcutLabels), "Control+F");
  assert.equal(shortcut.formatShortcut(modF, environment({ keyConvention: "unknown" }), shortcutLabels), null);
  assert.equal(shortcut.formatShortcut(shortcut.SEARCH_FOCUS_SHORTCUT, environment({ keyConvention: "macos" }), shortcutLabels), "F4");
  assert.equal(shortcut.formatShortcut(shortcut.SEARCH_FOCUS_SHORTCUT, environment({ keyConvention: "windows" }), shortcutLabels), "F4");
});

test("shortcut hints are omitted for unavailable, touch-only and unknown-keyboard actions", () => {
  assert.equal(shortcut.formatShortcut(shortcut.SEARCH_FOCUS_SHORTCUT, environment(), shortcutLabels, false), null);
  assert.equal(shortcut.formatShortcut(shortcut.SEARCH_FOCUS_SHORTCUT, environment({ keyboard: false, pointer: false, touch: true }), shortcutLabels), null);
  assert.equal(shortcut.formatShortcut(shortcut.SEARCH_FOCUS_SHORTCUT, environment({ keyConvention: "ios", keyboard: "unknown", pointer: false, touch: true }), shortcutLabels), null);
});

test("displayed search hint matches a gesture the production handler accepts", () => {
  const accepted = (overrides) => shortcut.isSearchFocusShortcut({
    key: "F",
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...overrides,
  });
  assert.equal(accepted({ ctrlKey: true }), false);
  assert.equal(accepted({ metaKey: true }), false);
  assert.equal(shortcut.isPlexFindShortcut({ key: "f", ctrlKey: true, metaKey: false, altKey: false }), true);
  assert.equal(shortcut.isPlexFindShortcut({ key: "f", ctrlKey: false, metaKey: true, altKey: false }), true);
  assert.equal(shortcut.isPlexFindShortcut({ key: "F4", ctrlKey: false, metaKey: false, altKey: false }), false);
  assert.equal(accepted({ key: "F4" }), true);
  assert.equal(accepted({ ctrlKey: true, altKey: true }), false);

  const copy = searchPresentation.searchFieldCopy(localization.createTranslator("en"), environment({ keyConvention: "macos" }));
  assert.deepEqual(copy, {
    placeholder: "Search Vault files… (F4)",
    ariaLabel: "Search Vault files",
    shortcutHint: "F4",
  });
  assert.equal(accepted({ key: copy.shortcutHint }), true);

  const touchCopy = searchPresentation.searchFieldCopy(
    localization.createTranslator("en"),
    environment({ keyConvention: "ios", keyboard: "unknown", pointer: false, touch: true }),
  );
  assert.deepEqual(touchCopy, { placeholder: "Search Vault files…", ariaLabel: "Search Vault files", shortcutHint: null });
});


test("SearchBox React consumer forwards localized copy into its input surface", () => {
  const temp = compileModules(["src/ui/features/SearchBox.tsx"], "kplex-localization-react-test-");
  try {
    const reactPath = join(temp, "node_modules/react/index.js");
    const jsxRuntimePath = join(temp, "node_modules/react/jsx-runtime.js");
    const fuzzyPath = join(temp, "src/ui/components/FuzzySuggester.js");
    mkdirSync(dirname(reactPath), { recursive: true });
    mkdirSync(dirname(fuzzyPath), { recursive: true });
    writeFileSync(reactPath, `
exports.useState = (initial) => [initial, () => {}];
exports.useMemo = (factory) => factory();
`);
    writeFileSync(jsxRuntimePath, `
exports.jsx = (type, props) => ({ type, props });
exports.jsxs = exports.jsx;
exports.Fragment = Symbol.for("react.fragment");
`);
    writeFileSync(fuzzyPath, "exports.FuzzySuggester = function FuzzySuggester() {};\n");

    const { SearchBox } = require(join(temp, "src/ui/features/SearchBox.js"));
    const element = SearchBox({
      graph: { search: () => [] },
      revision: 0,
      onActivate: () => {},
      focusRequest: 7,
      placeholder: "Search nodes… (F4)",
      ariaLabel: "Search Vault files",
    });
    assert.equal(element.props.placeholder, "Search nodes… (F4)");
    assert.equal(element.props.ariaLabel, "Search Vault files");
    assert.equal(element.props.focusRequest, 7);
    assert.equal(element.props.floating, true);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("Obsidian language adapter calls the host getLanguage export and retains English fallback", () => {
  const temp = compileModules([
    ...localizationModulePaths,
    "src/adapters/obsidian/localization.ts",
  ], "kplex-localization-host-test-");
  try {
    const stubPath = join(temp, "node_modules/obsidian/index.js");
    mkdirSync(dirname(stubPath), { recursive: true });
    writeFileSync(stubPath, 'let calls = 0; exports.getLanguage = () => { calls += 1; return "zz-ZZ"; }; exports.calls = () => calls;\n');
    const obsidian = require(stubPath);
    const adapter = require(join(temp, "src/adapters/obsidian/localization.js"));
    const translate = adapter.createObsidianTranslator();
    assert.equal(obsidian.calls(), 1);
    assert.equal(translate("command.openGraph"), "Open graph");
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("production UI sinks reject literal user-facing copy outside localization catalogs", () => {
  const sourceRoot = join(root, "src");
  const languageRoot = join(sourceRoot, "lang");
  const files = [];
  const visitDirectory = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (path !== languageRoot) visitDirectory(path);
      } else if (/\.tsx?$/.test(entry.name)) files.push(path);
    }
  };
  visitDirectory(sourceRoot);

  const violations = files.flatMap((sourcePath) => auditUserCopy(readFileSync(sourcePath, "utf8"), relative(root, sourcePath)));

  assert.deepEqual(violations, [], `User-facing literals must live in src/lang/:\n${violations.join("\n")}`);
});

test("representative production consumers use K-Plex command IDs and preserve existing English copy", () => {
  const main = readFileSync(join(root, "src/main.ts"), "utf8");
  const app = readFileSync(join(root, "src/ui/App.tsx"), "utf8");
  const catalog = readFileSync(join(root, "src/lang/en.ts"), "utf8");

  assert(main.includes('id: "kplex-start"'));
  assert(main.includes('name: this.translator("command.openGraph")'));
  assert(main.includes('this.translator("notice.excaliBrainSettingsImported")'));
  assert(main.includes('this.translator("notice.indexedNodes", { count: this.index.size })'));
  assert(app.includes('label={translate("toolbar.navigateBack")}'));
  assert(app.includes('label={translate("toolbar.navigateForward")}'));
  assert(app.includes("searchFieldCopy(translate, environment)"));
  assert(app.includes("isSearchFocusShortcut(event)"));
  for (const exact of [
    "Open graph",
    "Imported ExcaliBrain settings into K-Plex.",
    "Navigate back",
    "Navigate forward",
    "Search Vault files…",
    "Search Vault files",
    "K-Plex indexed {count} nodes.",
  ]) assert(catalog.includes(exact), `catalog lost existing English wording: ${exact}`);
});


test("localization gate catches nested UI literals but preserves diagnostics and stable tokens", () => {
  for (const source of [
    'new Notice(ok ? "Saved" : "Failed");',
    'button.setText(value ?? "Fallback");',
    '<button aria-label={enabled ? "Enable" : "Disable"} />;',
    '<span>{`Updated ${count} notes`}</span>;',
    'element.textContent = "Missing file";',
    'element.setAttribute("aria-label", "Open graph");',
    'dropdown.addOption("stable-id", "Option label");',
    'dropdown.addOptions({ stable: "Visible option" });',
    'React.createElement("span", null, "Visible child");',
    'const settings = { control: () => {}, name: "Setting name", desc: "Setting help" };',
    'const page = { type: "page", name: "Settings page", items: [] };',
    'plugin.addCommand({ id: "stable-id", name: "Visible command", callback: () => {} });',
  ]) assert(auditUserCopy(source).length > 0, `missed user copy: ${source}`);
  assert.deepEqual(auditUserCopy(`
    console.error("English diagnostic");
    throw new Error("Developer invariant");
    const persisted = { name: "Vault property", id: "stable-id" };
    new Notice(translate("notice.indexedNodes", { count: size }));
    <span>{kind === "folder" ? translate("role.parent") : userName}</span>;
    element.setAttribute("data-id", "stable-id");
    dropdown.addOption("stable-id", translate("role.parent"));
  `), []);
});

test("physical positions embedded in sentences use catalog labels", () => {
  const positions = require(join(portableTemp, "src/ui/features/positionPresentation.js"));
  const translate = localization.createTranslator("xx", { xx: {
    "position.physicalLeft": { message: "LEFT_TRANSLATED", context: "Synthetic localized physical side.", params: [] },
  } });
  assert.equal(positions.physicalPositionLabel("left", translate), "LEFT_TRANSLATED");
  assert.equal(localization.createTranslator("en")("node.gateEmpty", { gate: positions.physicalPositionLabel("left", localization.createTranslator("en")) }), "left gate · no relationships");
});


test("structured parser failures preserve accepted English and support future localized feedback", () => {
  const sourcePath = join(root, "src/ui/PlexFilter.tsx");
  const file = ts.createSourceFile(sourcePath, readFileSync(sourcePath, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = file.statements.filter((node) => ts.isFunctionDeclaration(node) &&
    ["graphLensExpectedTokenLabel", "graphLensValidationMessage"].includes(node.name?.text));
  assert.equal(declarations.length, 2, "the production formatters must remain available for contract validation");
  const output = ts.transpileModule(declarations.map((node) => node.getText(file)).join("\n") +
    "\nexport { graphLensValidationMessage };", { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } });
  const formatterPath = join(portableTemp, "validationPresentation.js");
  writeFileSync(formatterPath, output.outputText);
  const { graphLensValidationMessage: format } = require(formatterPath);
  const parser = require(join(portableTemp, "src/core/plex/predicateParser.js"));
  const accepted = JSON.parse(readFileSync(join(root, "tests/fixtures/l01-parser-errors.json"), "utf8"));
  for (const { source, message } of accepted) {
    const result = parser.tryParseGraphPredicateExpression(source);
    assert.equal(typeof result.error, "object");
    assert.equal(format({ code: "parse", issue: result.error }, localization.createTranslator("en")), message, source);
  }
  const future = localization.createTranslator("xx", { xx: {
    "filter.validationEmptyExpression": { message: "EMPTY_TRANSLATED {position}", context: "Synthetic parser feedback.", params: ["position"] },
  } });
  assert.equal(format({ code: "parse", issue: parser.tryParseGraphPredicateExpression("").error }, future), "EMPTY_TRANSLATED 1");
  assert.equal(format({ code: "unknown-edge-role", value: "custom-role" }, localization.createTranslator("en")),
    'Unknown Plex position “custom-role”. To match a relationship property such as working-on, use Relationship property in Simple view (edge.definition in Code view).');
});


test("semantic relationship reasons preserve accepted explanation wording at the UI boundary", () => {
  const path = join(root, "src/ui/RelationshipExplanationModal.ts");
  const file = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  const formatters = file.statements.filter((node) => ts.isFunctionDeclaration(node) &&
    ["relationshipSummaryLabel", "suppressionReasonLabel"].includes(node.name?.text));
  assert.equal(formatters.length, 2);
  const output = ts.transpileModule('const ONTOLOGY_PRECEDENCE_SUPPRESSION = "frontmatter-overrides-body-ontology";\n' +
    formatters.map((node) => node.getText(file)).join("\n") +
    "\nexport { relationshipSummaryLabel, suppressionReasonLabel };", { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } });
  const outputPath = join(portableTemp, "relationshipPresentation.js");
  writeFileSync(outputPath, output.outputText);
  const { relationshipSummaryLabel, suppressionReasonLabel } = require(outputPath);
  const accepted = JSON.parse(readFileSync(join(root, "tests/fixtures/l01-relationship-summaries.json"), "utf8"));
  const translate = localization.createTranslator("en");
  for (const [code, sentence] of Object.entries(accepted)) assert.equal(relationshipSummaryLabel(code, translate), sentence, code);
  assert.equal(suppressionReasonLabel("frontmatter-overrides-body-ontology", translate),
    "Conflicting body ontology is overridden by frontmatter ontology for this note pair.");
});
