import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
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

const portableTemp = compileModules([
  "src/lang/en.ts",
  "src/lang/index.ts",
  "src/core/contracts/presentationEnvironment.ts",
  "src/core/plex/shortcutPresentation.ts",
  "src/ui/features/searchPresentation.ts",
]);
process.on("exit", () => rmSync(portableTemp, { recursive: true, force: true }));
const localization = require(join(portableTemp, "src/lang/index.js"));
const shortcut = require(join(portableTemp, "src/core/plex/shortcutPresentation.js"));
const searchPresentation = require(join(portableTemp, "src/ui/features/searchPresentation.js"));

function environment({ keyConvention = "macos", keyboard = true, pointer = true, touch = false } = {}) {
  return {
    device: "desktop",
    keyConvention,
    inputModes: { keyboard, pointer, touch },
    hostActions: { graphTab: true, sidepanel: true, popout: true },
  };
}

test("English catalog is strict, typed at source, and falls back from future locales", () => {
  const english = localization.createTranslator("en");
  assert.equal(english("command.openGraph"), "Open graph");
  assert.equal(english("toolbar.navigateBack"), "Navigate back");
  assert.equal(english("toolbar.navigateForward"), "Navigate forward");
  assert.equal(english("search.placeholderWithShortcut", { shortcut: "Command+F" }), "Search nodes… (Command+F)");

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
  assert.equal(localization.createTranslator("fr")("command.openGraph"), "Open graph", "missing locale must fall back to English");
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
  assert.equal(shortcut.formatShortcut(modF, environment({ keyConvention: "macos" })), "Command+F");
  assert.equal(shortcut.formatShortcut(modF, environment({ keyConvention: "windows" })), "Control+F");
  assert.equal(shortcut.formatShortcut(modF, environment({ keyConvention: "ios" })), "Command+F");
  assert.equal(shortcut.formatShortcut(modF, environment({ keyConvention: "android" })), "Control+F");
  assert.equal(shortcut.formatShortcut(modF, environment({ keyConvention: "unknown" })), null);
  assert.equal(shortcut.formatShortcut(shortcut.SEARCH_FOCUS_SHORTCUT, environment({ keyConvention: "macos" })), "F4");
  assert.equal(shortcut.formatShortcut(shortcut.SEARCH_FOCUS_SHORTCUT, environment({ keyConvention: "windows" })), "F4");
});

test("shortcut hints are omitted for unavailable, touch-only and unknown-keyboard actions", () => {
  assert.equal(shortcut.formatShortcut(shortcut.SEARCH_FOCUS_SHORTCUT, environment(), false), null);
  assert.equal(shortcut.formatShortcut(shortcut.SEARCH_FOCUS_SHORTCUT, environment({ keyboard: false, pointer: false, touch: true })), null);
  assert.equal(shortcut.formatShortcut(shortcut.SEARCH_FOCUS_SHORTCUT, environment({ keyConvention: "ios", keyboard: "unknown", pointer: false, touch: true })), null);
});

test("displayed search hint matches a gesture the production handler accepts", () => {
  const accepted = (overrides) => shortcut.isSearchFocusShortcut({
    key: "F",
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...overrides,
  });
  assert.equal(accepted({ ctrlKey: true }), true);
  assert.equal(accepted({ metaKey: true }), true);
  assert.equal(accepted({ key: "F4" }), true);
  assert.equal(accepted({ ctrlKey: true, altKey: true }), false);

  const copy = searchPresentation.searchFieldCopy(localization.createTranslator("en"), environment({ keyConvention: "macos" }));
  assert.deepEqual(copy, {
    placeholder: "Search nodes… (F4)",
    ariaLabel: "Search nodes",
    shortcutHint: "F4",
  });
  assert.equal(accepted({ key: copy.shortcutHint }), true);

  const touchCopy = searchPresentation.searchFieldCopy(
    localization.createTranslator("en"),
    environment({ keyConvention: "ios", keyboard: "unknown", pointer: false, touch: true }),
  );
  assert.deepEqual(touchCopy, { placeholder: "Search nodes…", ariaLabel: "Search nodes", shortcutHint: null });
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
      ariaLabel: "Search nodes",
    });
    assert.equal(element.props.placeholder, "Search nodes… (F4)");
    assert.equal(element.props.ariaLabel, "Search nodes");
    assert.equal(element.props.focusRequest, 7);
    assert.equal(element.props.floating, true);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("Obsidian language adapter calls the host getLanguage export and retains English fallback", () => {
  const temp = compileModules([
    "src/lang/en.ts",
    "src/lang/index.ts",
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

test("representative production consumers preserve command ids and existing English copy", () => {
  const main = readFileSync(join(root, "src/main.ts"), "utf8");
  const app = readFileSync(join(root, "src/ui/App.tsx"), "utf8");
  const catalog = readFileSync(join(root, "src/lang/en.ts"), "utf8");

  assert(main.includes('id: "excalibrain-start"'));
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
    "Search nodes…",
    "Search nodes",
    "K-Plex indexed {count} nodes.",
  ]) assert(catalog.includes(exact), `catalog lost existing English wording: ${exact}`);
});
