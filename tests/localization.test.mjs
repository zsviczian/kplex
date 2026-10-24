/**
 * Validates K-Plex localization catalog contracts, bundled locale coverage, host-language fallback,
 * shortcut presentation and the source-wide user-facing literal ownership gate. Literal reference
 * classification remains source-owned across locales; values are never reinterpreted as templates.
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
  "src/core/plex/actions.ts",
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
  assert.equal(english("command.openGraph"), "Open canvas");
  assert.equal(english("toolbar.navigateBack"), "Navigate back");
  assert.equal(english("toolbar.navigateForward"), "Navigate forward");
  assert.equal(english("search.placeholderWithShortcut", { shortcut: "Command+F" }), "Search Vault… (Command+F)");

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
  assert.equal(futureGerman("command.openGraph"), "Open canvas", "missing locale keys must fall back to English");
  assert.equal(localization.createTranslator("zz-ZZ")("command.openGraph"), "Open canvas", "unknown locale must fall back to English");
});

/** Named reference metadata reflects each consumer's semantics, not a global parameter-name heuristic. */
test("reference metadata distinguishes literal source target field names from descriptive labels", () => {
  const translate = localization.createTranslator("en"), source = require(join(portableTemp,"src/lang/en.js")).englishCatalog;
  for (const [key,entry] of Object.entries(source)) if(entry.params.length) {
    assert(Array.isArray(entry.referenceParams),`${key} needs an explicit audited reference classification`);
    assert(entry.referenceParams.every(name=>entry.params.includes(name)),`${key} reference names must be declared`);
  }
  assert.equal(translate("hide.confirmPair",{source:"Folder/A.md",target:"Folder/B.md"}), 'Hide "Folder/B.md" when "Folder/A.md" is the central note. Save the Hidden relationship in "Folder/A.md".');
  assert.equal(translate("hide.retainsSources"),'All links are kept. The connection is hidden when the note you save in is in the center. It may still appear from the other note.');
  assert.equal(translate("delete.cleanup.property",{field:"Private connection"}), 'Property: "Private connection"');
  assert.equal(translate("delete.cleanup.sourceFailed",{path:"Folder/A.md"}), 'Source not changed: "Folder/A.md". Review it manually.');
  assert.equal(translate("graph.evidenceDecision",{source:"Markdown link",resolution:"Child · Inferred"}), "Markdown link — Child · Inferred");
  assert.equal(translate("graph.evidenceFieldDecision",{field:"Children",resolution:"Child · Defined"}), '"Children" — Child · Defined');
  assert.equal(translate("references.sourceLine",{source:"Inline relationship",line:4}), "Inline relationship · line 4");
  assert.equal(translate("typography.deviceField",{device:"Desktop",field:"Node title"}), "Desktop: Node title");
  assert.equal(translate("actions.targetPolicy",{target:"Current center"}), "Target: Current center");
  assert.equal(translate("relation.inverseStorage",{role:"Parent",property:"Children"}), 'Parent is stored on the Markdown note using the inverse document property "Children".');
  assert.equal(translate("notice.tag",{name:"#Project"}), 'Tag: "#Project"');
  assert.equal(translate("find.matches",{count:2}), "2 matches");
});

/** Template-owned wrappers normalize once; quote-like user values, backslashes and braces remain literal. */
test("reference quotes inherit across locales and normalize existing paired wrappers without interpreting values", () => {
  const value='A "quoted" \\ path {target} $&', expected='"'+value+'"';
  for(const wrappers of [['',''],['"','"'],['“','”'],['„','“'],['« ',' »'],['»','«'],['「','」'],['『','』'],["'","'"],['“"','"”']]) {
    const translate=localization.createTranslator("de",{de:{"note.existsNamed":{message:`Name: ${wrappers[0]}{name}${wrappers[1]}.`,context:"Synthetic wrapper regression.",params:["name"]}}});
    assert.equal(translate("note.existsNamed",{name:value}),`Name: ${expected}.`);
  }
  assert.equal(localization.createTranslator("en")("node.accessibleLabel",{label:'"A"',path:'C:\\{label}.md'}),'""A"" — "C:\\{label}.md"',"Quoted values are actual user data, not template wrappers");
  const plain=localization.createTranslator("de",{de:{"references.sourceLine":{message:'“{source}” · {line}',context:"Descriptive source label has no literal-reference metadata.",params:["source","line"]}}});
  assert.equal(plain("references.sourceLine",{source:"Inline relationship",line:2}),"“Inline relationship” · 2","Unmarked template punctuation remains owned by the translator");
  for(const locale of ["de","es","fr","ja","nl","ru","zh-TW"]) {
    const translate=localization.createTranslator(locale), text=translate("explain.removeConfirm",{note:"A.md",field:"Children",target:"B.md"});
    for(const reference of ["A.md","Children","B.md"])assert(text.includes('"'+reference+'"'),`${locale} needs one shared ASCII reference wrapper`);
    assert.equal((text.match(/"/g)??[]).length,6,`${locale} must not double template quote wrappers`);
    assert(translate("notice.tag",{name:"#Project"}).includes('"#Project"'));
  }
});

/** Source classification cannot drift through injected locale metadata or reference plural-count declarations. */
test("reference metadata validation rejects malformed subsets duplicates count references and locale drift", () => {
  for(const referenceParams of [null,"name",["missing"],["name","name"],[1]])assert.throws(()=>localization.validateCatalog("bad",{x:{message:"{name}",context:"Synthetic metadata validation.",params:["name"],referenceParams}}),/referenceParams/);
  assert.throws(()=>localization.validateCatalog("bad",{x:{plural:{one:"{count}",other:"{count}"},countParam:"count",context:"Synthetic count classification.",params:["count"],referenceParams:["count"]}}),/countParam cannot be a reference/);
  assert.throws(()=>localization.createTranslator("de",{de:{"note.existsNamed":{message:"{name}",context:"Synthetic metadata drift.",params:["name"],referenceParams:[]}}}),/reference parameters differ/);
  assert.throws(()=>localization.createTranslator("de",{de:{"references.sourceLine":{message:"{source} {line}",context:"Synthetic descriptive drift.",params:["source","line"],referenceParams:["source"]}}}),/reference parameters differ/);
  const entry={message:"{name}",context:"Synthetic inherited metadata.",params:["name"],referenceParams:["name"]};
  assert.equal(localization.createTranslator("de",{de:{"note.existsNamed":entry}})("note.existsNamed",{name:"A.md"}),'"A.md"');
  const module=require(join(portableTemp,"src/lang/de.js"));
  assert.deepEqual(module.germanCatalog["hide.confirmPair"].referenceParams,["source","target"]);
});

test("every action explains its behavior beyond its label, and help is distinct from commands", () => {
  const translate = localization.createTranslator("en");
  const { ACTION_CATALOG } = require(join(portableTemp, "src/core/plex/actions.js"));
  for (const action of ACTION_CATALOG) {
    const label = translate(action.labelKey);
    const description = translate(action.descriptionKey);
    assert.ok(description.split(/\s+/u).length >= 7, `${action.id} needs a short explanation of its effect`);
    assert.equal(description.startsWith(`${label}.`), false, `${action.id} must explain more than its label`);
  }
  assert.match(translate("actions.graph.focus.description"), /keyboard focus.*arrows/u);
  assert.match(translate("actions.editor.focus.description"), /keyboard focus.*editor/u);
  assert.match(translate("actions.node.open.description"), /existing notes.*center.*ensure.*sidecar is open where supported/u);
  assert.match(translate("actions.actions.open"), /K-Plex command palette/u);
  assert.match(translate("actions.keyboard.help.description"), /without running commands/u);
  assert.match(translate("actions.helpDescription"), /canvas is focused/u);
});

test("bundled locale catalogs are complete and provide translated copy", () => {
  const english = require(join(portableTemp, "src/lang/en.js")).englishCatalog;
  const englishKeys = Object.keys(english).sort();
  const maintainedSidecarKeys = [
    "actions.view.sidecar.attach-from-center", "actions.view.sidecar.attach-from-center.description",
    "actions.view.sidecar.attach-from-pane", "actions.view.sidecar.attach-from-pane.description",
    "settings.ui.where.k.plex.creates.its.dedicated.companion.document.pa",
    "actions.view.sidecar.collapse-plex", "actions.view.sidecar.collapse-plex.description",
    "app.foldForSidecar", "sidecar.unfoldPlex", "sidecar.foldUnavailable",
    "sidecar.foldUnsupportedLayout", "sidecar.chooseFoldPair",
  ];
  const catalogs = [
    ["de", "de.js", "germanCatalog", "Canvas öffnen"],
    ["fr", "fr.js", "frenchCatalog", "Ouvrir le canevas"],
    ["es", "es.js", "spanishCatalog", "Abrir lienzo"],
    ["nl", "nl.js", "dutchCatalog", "Canvas openen"],
    ["ja", "ja.js", "japaneseCatalog", "キャンバスを開く"],
    ["zh-TW", "zh-TW.js", "traditionalChineseCatalog", "開啟畫布"],
    ["ru", "ru.js", "russianCatalog", "Открыть холст"],
  ];

  for (const [locale, file, exportName, expected] of catalogs) {
    const catalog = require(join(portableTemp, `src/lang/${file}`))[exportName];
    assert.deepEqual(Object.keys(catalog).sort(), englishKeys, `${locale} must translate every English catalog key`);
    assert.equal(localization.createTranslator(locale)("command.openGraph"), expected);
    for (const key of maintainedSidecarKeys) {
      assert.notEqual(catalog[key].message, english[key].message, `${locale}:${key} must not silently fall back to English`);
      assert.equal(localization.createTranslator(locale)(key), catalog[key].message);
    }
    assert.notEqual(catalog["sidecar.foldPairLabel"].message, english["sidecar.foldPairLabel"].message);
    const pairLabel = localization.createTranslator(locale)("sidecar.foldPairLabel", {number: 2});
    assert(pairLabel.includes("2") && !pairLabel.includes("{number}") && !pairLabel.includes('"2"'), `${locale}: pair display ordinals are counts, not quoted note references`);
  }
  assert.equal(localization.createTranslator("de-DE")("command.openGraph"), "Canvas öffnen");
  assert.equal(localization.createTranslator("zh_TW")("command.openGraph"), "開啟畫布");
});

test("Sidecar folding copy identifies the native group scope and preserves the published action identity", () => {
  const translate = localization.createTranslator("en");
  const actions = require(join(portableTemp, "src/core/plex/actions.js"));
  const fold = actions.ACTION_BY_ID.get("view.sidecar.collapse-plex");
  assert.equal(fold.command.id, "kplex-action-view-sidecar-collapse-plex");
  assert.equal(translate(fold.labelKey), "Fold or unfold K-Plex tab group");
  assert.match(translate(fold.descriptionKey), /Other tabs in that group are hidden too/u);
  assert.match(translate("app.foldForSidecar"), /Other tabs in this group are hidden too/u);
  assert.equal(translate("sidecar.unfoldPlex"), "Unfold K-Plex tab group. ALT/OPT+click: close Sidecar and expand K-Plex.");
  for (const locale of ["en", "de", "fr", "es", "nl", "ja", "zh-TW", "ru"]) {
    const localized = localization.createTranslator(locale);
    assert.match(localized("sidecar.unfoldPlex"), /ALT\/OPT/u);
    assert.match(localized("app.openSidecarAt", {position: "right"}), /ALT\/OPT/u);
  }
  assert.equal(translate("sidecar.foldPairLabel", {number: 2}), "K-Plex tab group 2");
  assert.match(translate("sidecar.foldUnavailable"), /this window/u);
  assert.match(translate("sidecar.foldUnsupportedLayout"), /K-Plex remains visible/u);
});

test("central-editor modifier help retains the requested short ALT/Opt hint in all catalogs", () => {
  assert.equal(localization.createTranslator("en")("app.useCentralNodeEditorExpandedHint"), "Use editor as central node. ALT/Opt to open in expanded editor mode.");
  for(const locale of ["en","de","fr","es","nl","ja","zh-TW","ru"])assert.match(localization.createTranslator(locale)("app.useCentralNodeEditorExpandedHint"),/ALT\/Opt/u);
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
  // Settings describe the modifier even when configuring a future external keyboard.
  const hover = {key: "", modifiers: ["alt"]};
  assert.equal(shortcut.formatShortcut(hover, environment({ keyConvention: "macos" }), shortcutLabels, true, ""), "Option");
  assert.equal(shortcut.formatShortcut(hover, environment({ keyConvention: "windows" }), shortcutLabels, true, ""), "Alt");
  assert.equal(shortcut.formatShortcut(hover, environment({ keyConvention: "ios" }), shortcutLabels, true, ""), "Option");
  assert.equal(shortcut.formatShortcut(hover, environment({ keyConvention: "android" }), shortcutLabels, true, ""), "Alt");
  assert.equal(shortcut.formatShortcut(hover, environment({ keyConvention: "unknown" }), shortcutLabels, true, ""), null);

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
    placeholder: "Search Vault… (F4)",
    ariaLabel: "Search Vault",
    shortcutHint: "F4",
  });
  assert.equal(accepted({ key: copy.shortcutHint }), true);

  const touchCopy = searchPresentation.searchFieldCopy(
    localization.createTranslator("en"),
    environment({ keyConvention: "ios", keyboard: "unknown", pointer: false, touch: true }),
  );
  assert.deepEqual(touchCopy, { placeholder: "Search Vault…", ariaLabel: "Search Vault", shortcutHint: null });
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
exports.useCallback = (callback) => callback;
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
      ariaLabel: "Search Vault",
    });
    assert.equal(element.props.placeholder, "Search nodes… (F4)");
    assert.equal(element.props.ariaLabel, "Search Vault");
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
    assert.equal(translate("command.openGraph"), "Open canvas");
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

  const actions = require(join(portableTemp, "src/core/plex/actions.js"));
  const open = actions.ACTION_BY_ID.get("surface.open-tab");
  assert.equal(open.command.id, "kplex-start");
  assert.equal(localization.createTranslator("en")(open.labelKey), "Open canvas");
  assert(main.includes("createActionCommandPublisher"), "Native command labels must come from catalog publication");
  assert(main.includes('this.translator("notice.excaliBrainSettingsImported")'));
  assert(main.includes('this.translator("notice.indexedNodes", { count: this.index.size })'));
  assert(app.includes('label={translate("toolbar.navigateBack")}'));
  assert(app.includes('label={translate("toolbar.navigateForward")}'));
  assert(app.includes('effectiveActionBindings(plugin.settings.actionPreferences, "search.focus")'), "Search hints must reflect effective action preferences");
  assert(app.includes("formatActionBinding"), "Search hints must use platform-aware shared binding presentation");
  const transport = readFileSync(join(root, "src/ui/usePlexActions.ts"), "utf8");
  assert(transport.includes("let preferences = plugin.settings.actionPreferences;")
    && transport.includes("compileActionBindings(preferences, options.convention)")
    && transport.includes("preferences = plugin.settings.actionPreferences;")
    && transport.includes("plugin.subscribeActionPreferences(preferencesChanged)"),
  "Local dispatch must compile the same effective preference owner initially and on committed changes");
  for (const exact of [
    "Open canvas",
    "Imported ExcaliBrain settings into K-Plex.",
    "Navigate back",
    "Navigate forward",
    "Search Vault…",
    "Search Vault",
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
    'element.setAttribute("aria-label", "Open canvas");',
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
    'Unknown canvas position “custom-role”. To match a relationship property such as working-on, use Relationship property in Simple view (edge.definition in Code view).');
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
  for (const language of ["de", "es", "fr", "ja", "nl", "ru", "zh-TW"]) {
    const localized = localization.createTranslator(language);
    assert.equal(relationshipSummaryLabel("date-property", localized), accepted["date-property"],
      `${language} uses generic date-policy English until this new key is translated`);
  }
  assert.equal(suppressionReasonLabel("frontmatter-overrides-body-ontology", translate),
    "Conflicting body ontology is overridden by frontmatter ontology for this note pair.");
});
