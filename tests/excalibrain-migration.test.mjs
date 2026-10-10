/**
 * Tests legacy data migration through the real K-Plex settings/style implementations with a
 * narrow Obsidian boundary double, including the stable manifest ID used by native command lookup.
 * Temporary bundles are removed independently of test outcomes.
 */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { assertMigratedExcaliBrainSettings, localPreferenceKeys } from "./support/excalibrainMigration.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = JSON.parse(readFileSync(join(root, "tests/fixtures/excalibrain-migration/data.json"), "utf8"));
const temp = mkdtempSync(join(tmpdir(), "kplex-migration-"));
process.on("exit", () => rmSync(temp, { recursive: true, force: true }));
await build({
  stdin: { contents: 'export * from "./src/settings"; export * from "./src/core/graph/settingsPolicy"; export * from "./src/index/style"; export * from "./src/ui/layout"; export * from "./src/ui/PurgeIndexCacheModal"; export { Modal as TestModal, AbstractInputSuggest as TestSuggest } from "obsidian"; export { createObsidianTranslator } from "./src/adapters/obsidian/localization";', resolveDir: root },
  outfile: join(temp, "migration.mjs"), bundle: true, platform: "node", format: "esm",
  plugins: [{ name: "obsidian-boundary-double", setup(builder) {
    builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "double" }));
    builder.onLoad({ filter: /.*/, namespace: "double" }, () => ({ contents: `
      export class App {}
      export class ExtraButtonComponent {} export class Scope {}
      export const Platform = {};
      /** Narrow form-shell double: production modal fields, listeners and save callbacks remain real. */
      class FormElement {
        constructor(tag = "div", options = {}) {
          this.tag = tag; this.children = []; this.buttons = []; this.listeners = {}; this.value = options.value ?? "";
          this.text = options.text ?? ""; this.attrs = {}; this.visible = true;
          const classes = new Set((options.cls ?? "").split(" ").filter(Boolean));
          this.classList = { add(...names) { names.forEach(name => classes.add(name)); }, remove(...names) { names.forEach(name => classes.delete(name)); }, contains(name) { return classes.has(name); } };
          Object.entries(options.attr ?? {}).forEach(([name, value]) => this.setAttribute(name, value));
        }
        addClass(name) { this.classList.add(name); }
        createEl(tag, options) { const child = new FormElement(tag, options); this.appendChild(child); return child; }
        createDiv(options) { return this.createEl("div", options); }
        createSpan(options) { return this.createEl("span", options); }
        appendChild(child) { if (child.parent) child.parent.children = child.parent.children.filter(item => item !== child); this.children.push(child); child.parent = this; }
        prepend(child) { this.appendChild(child); this.children = [child, ...this.children.filter(item => item !== child)]; }
        setText(text) { this.text = text; }
        setAttribute(name, value) { this.attrs[name] = value; if (name === "type") this.type = value; }
        setCssProps() {}
        toggle(value) { this.visible = value; }
        focus() { this.focused = true; }
        addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
        dispatchEvent(event) { for (const fn of this.listeners[event.type] ?? []) fn(event); return true; }
        empty() { this.children = []; this.buttons = []; }
      }
      export class ButtonComponent {} export class Modal {
        constructor(app) { this.app = app; this.titleEl = new FormElement(); this.contentEl = new FormElement(); this.modalEl = new FormElement(); Modal.latest = this; }
        open() { this.onOpen?.(); }
        close() { this.closed = true; this.onClose?.(); }
      }
      export class Notice {}
      export class Setting {
        constructor(container) { this.container = container; }
        addButton(cb) {
          const button = { setButtonText(text) { this.text = text; return this; }, setDestructive() { return this; }, setDisabled(value) { this.disabled = value; return this; }, onClick(cb) { this.activate = cb; return this; } };
          this.container.buttons.push(button); cb(button); return this;
        }
      }
      export class AbstractInputSuggest {
        static instances = [];
        constructor(app, input) { this.input = input; AbstractInputSuggest.instances.push(this); }
        setValue(value) { this.input.value = value; }
        close() { this.closed = true; }
      }
      export class SearchComponent {} export const setIcon = () => {}; export const setTooltip = () => {};
      export class PluginSettingTab { constructor(app) { this.app = app; this.containerEl = { addClass() {} }; } }
      export const getIcon = () => null; export const getIconIds = () => []; export const getLanguage = () => "en";
    `, loader: "js" }));
  } }],
});
const { migrateAndMergeSettings, importExcaliBrainGraphSettings, KplexSettingTab, resolveNodeStyle, resolveLinkStyle, buildScene, PurgeIndexCacheModal,
  captureSettingsPolicy, classifySettingsChange, encodeIndexSettingsSignature, TestModal, TestSuggest, createObsidianTranslator } = await import(pathToFileURL(join(temp, "migration.mjs")));
const defaults = migrateAndMergeSettings(undefined);
const migrated = importExcaliBrainGraphSettings(fixture);

test("real ExcaliBrain fixture imports complete ontology and graph styles without changing plugin preferences", () => {
  const before = JSON.stringify(fixture);
  assertMigratedExcaliBrainSettings(migrated, fixture, defaults);
  assert.equal(Object.keys(migrated.tagNodeStyles).length, 32);
  assert.equal(Object.keys(migrated.hierarchyLinkStyles).length, 297);
  assert.deepEqual(migrateAndMergeSettings(JSON.parse(JSON.stringify(migrated))), migrated, "persisted settings must remain stable on reload");
  assert.equal(JSON.stringify(fixture), before);
});

test("transient ExcaliBrain drawing paths are discarded from imported and saved settings", () => {
  assert.equal(Object.hasOwn(migrated, "excalibrainFilepath"), false);
  assert.equal(Object.hasOwn(migrateAndMergeSettings({ excalibrainFilepath: "Custom transient drawing.md" }), "excalibrainFilepath"), false);
});

test("indexing acquisition settings default conservatively, validate saved values and stay local on import", () => {
  assert.equal(defaults.indexingMode, "on-demand");
  assert.equal(defaults.urlIndexingMode, "background");
  assert.equal(defaults.indexingThrottle, "responsive");
  const invalid = migrateAndMergeSettings({ indexingMode: "invalid", urlIndexingMode: "invalid" });
  assert.equal(invalid.indexingMode, "on-demand");
  assert.equal(invalid.urlIndexingMode, "background");
  assert.equal(migrateAndMergeSettings({ indexingThrottle: "invalid" }).indexingThrottle, "responsive");
  for (const indexingThrottle of ["responsive", "balanced", "faster"]) {
    assert.equal(migrateAndMergeSettings({ indexingThrottle }).indexingThrottle, indexingThrottle);
  }
  const savedEager = migrateAndMergeSettings({ indexingMode: "eager", urlIndexingMode: "on-demand" });
  assert.equal(savedEager.indexingMode, "eager", "explicit saved Eager survives the new default");
  assert.equal(savedEager.urlIndexingMode, "background", "retired URL option migrates to always-on discovery");
  const local = migrateAndMergeSettings({ indexingMode: "on-demand", urlIndexingMode: "background" });
  const imported = importExcaliBrainGraphSettings({ ...fixture, indexingMode: "eager", urlIndexingMode: "on-demand" }, local);
  assert.equal(imported.indexingMode, "on-demand");
  assert.equal(imported.urlIndexingMode, "background");
  assert.deepEqual(migrateAndMergeSettings(JSON.parse(JSON.stringify(local))), local);
});

test("background throttle settings use declarative localized controls and save without reconstruction", async () => {
  const saves = [];
  const plugin = { manifest: { id: "k-plex" }, settings: structuredClone(defaults), saveSettings: async (...args) => { saves.push(args); },
    index: { unassignedOntologyFields: () => [], allPages: () => [] } };
  plugin.translator = createObsidianTranslator();
  const tab = new KplexSettingTab({}, plugin);
  const page = tab.getSettingDefinitions().find(item => item.name === "Indexing config");
  const row = page.items.flatMap(group => group.items ?? []).find(item => item.control?.key === "indexingThrottle");
  assert.equal(row.name, "Background indexing speed");
  assert.equal(row.control.defaultValue, "responsive");
  assert.deepEqual(Object.keys(row.control.options), ["responsive", "balanced", "faster"]);
  await tab.setControlValue("indexingThrottle", "faster");
  assert.equal(plugin.settings.indexingThrottle, "faster");
  await tab.setControlValue("indexingThrottle", "invalid");
  assert.equal(plugin.settings.indexingThrottle, "responsive");
  assert.deepEqual(saves, [[false, false], [false, false]]);
  const before = captureSettingsPolicy(defaults);
  const faster = migrateAndMergeSettings({ indexingThrottle: "faster" });
  assert.deepEqual(classifySettingsChange(before, captureSettingsPolicy(faster)), {
    semanticInvalidation: false, presentationFacets: false, searchTerms: false,
    nodeVisuals: false, render: false, typographyOnly: false, changedKeys: [],
  });
  assert.equal(encodeIndexSettingsSignature(faster), encodeIndexSettingsSignature(defaults));
  assert.equal(importExcaliBrainGraphSettings({ ...fixture, indexingThrottle: "balanced" }, faster).indexingThrottle, "faster");
});

test("indexing settings persist without rebuilding and cache estimation is lazy and fenced to the displayed row", async () => {
  let estimates = 0;
  let completeEstimate;
  const saves = [];
  const plugin = {
    manifest: { id: "k-plex" },
    settings: structuredClone(defaults),
    saveSettings: async (...args) => { saves.push(args); },
    index: {
      unassignedOntologyFields: () => [], allPages: () => [],
      estimatePersistentIndexBytes: () => {
        estimates += 1;
        return new Promise(resolve => { completeEstimate = resolve; });
      },
    },
  };
  plugin.translator = createObsidianTranslator();
  const tab = new KplexSettingTab({}, plugin);
  const definitions = tab.getSettingDefinitions();
  const indexingPage = definitions.find(item => item.name === "Indexing config");
  assert(indexingPage);
  assert(definitions.indexOf(indexingPage) < definitions.findIndex(item => item.name === "Compatibility"));
  assert.equal(estimates, 0, "constructing settings definitions must not read every cache store");
  const flatten = items => items.flatMap(item => [item, ...flatten(item.items ?? [])]);
  const row = flatten(indexingPage.items).find(item => item.name === "Purge index cache");
  let description;
  const button = { setButtonText() { return this; }, setDestructive() { return this; }, onClick() { return this; } };
  const setting = { setDesc(value) { description = value; return this; }, addButton(cb) { cb(button); return this; } };
  const cleanup = row.render(setting);
  assert.equal(estimates, 1);
  completeEstimate(1024);
  await Promise.resolve();
  assert(description.includes("1.0 KB"));
  const detachedCleanup = row.render(setting);
  assert.equal(estimates, 2);
  detachedCleanup();
  const detachedDescription = description;
  completeEstimate(4096);
  await Promise.resolve();
  assert.equal(description, detachedDescription, "a detached row must ignore late estimates");
  cleanup();
  await tab.setControlValue("indexingMode", "on-demand");
  await tab.setControlValue("urlIndexingMode", "background");
  assert.equal(plugin.settings.indexingMode, "on-demand");
  assert.equal(plugin.settings.urlIndexingMode, "background");
  assert.deepEqual(saves, [[false, false], [false, false]], "restart-only settings must not schedule live rebuilds");
});

test("purge confirmation requires activation, coalesces repeated clicks and never acknowledges failed deletion", async () => {
  let calls = 0;
  let purged = 0;
  let finish;
  const cancel = new PurgeIndexCacheModal({}, async () => { calls += 1; return true; }, () => { purged += 1; });
  cancel.open();
  cancel.contentEl.buttons.find(button => button.text === "Cancel").activate();
  assert.equal(calls, 0);
  assert.equal(purged, 0);

  const confirm = new PurgeIndexCacheModal({}, () => { calls += 1; return new Promise(resolve => { finish = resolve; }); }, () => { purged += 1; });
  confirm.open();
  const button = confirm.contentEl.buttons.find(button => button.text === "Purge cache");
  button.activate(); button.activate();
  assert.equal(calls, 1);
  assert.equal(button.disabled, true);
  finish(false);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(purged, 0);
  assert.notEqual(confirm.closed, true);
  assert.equal(button.disabled, false);
  button.activate();
  finish(true);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(calls, 2);
  assert.equal(purged, 1);
  assert.equal(confirm.closed, true);
});

test("manual graph import preserves local UI, navigation, editor, command and scheduling preferences", () => {
  const current = migrateAndMergeSettings({
    kplexInitialized: true, navigationHistory: ["Local.md"], lastActivePath: "Local.md", pinnedNodes: ["Pin.md"],
    documentSyncMode: "pinned", indexUpdateInterval: 120000, embedCentralNode: true,
    centralNodeMarkdownMode: "preview", sidecarOpen: true, sidecarPosition: "left", startInPopout: true,
    toolbarExpanded: true, confirmFileDelete: false, allowOntologySuggester: false,
    ontologySuggesterTrigger: "local::", nodeTitleScript: "local value", newNodeDefaultType: "excalidraw",
  });
  const legacy = { ...structuredClone(fixture),
    kplexInitialized: false, lastActivePath: "Legacy.md", pinnedNodes: ["Legacy pin.md"],
    documentSyncMode: "recent", sidecarOpen: false, sidecarPosition: "right", startInPopout: false,
    toolbarExpanded: false, centralNodeMarkdownMode: "source", confirmFileDelete: true,
    nodeTitleScript: "foreign value", newNodeDefaultType: "markdown",
    hotkeys: { "excalibrain-start": "Mod+G" }, commandAliases: ["excalibrain-start"],
    css: ".excalibrain-app {}", unrelatedPreference: "must not import",
  };
  const currentBefore = structuredClone(current);
  const sourceBefore = structuredClone(legacy);
  const result = importExcaliBrainGraphSettings(legacy, current);
  assertMigratedExcaliBrainSettings(result, fixture, current);
  for (const key of ["hotkeys", "commandAliases", "css", "unrelatedPreference"])
    assert.equal(Object.hasOwn(result, key), false, `${key} must not cross graph migration`);
  assert.deepEqual(current, currentBefore);
  assert.deepEqual(legacy, sourceBefore);
  assert.notStrictEqual(result.tagNodeStyles, legacy.tagNodeStyles, "Imported style dictionaries must be detached");
  assert.notStrictEqual(result.tagNodeStyles["#person"], legacy.tagNodeStyles["#person"], "Imported style entries must not mutate the running legacy plugin");
  const reloaded = migrateAndMergeSettings(JSON.parse(JSON.stringify(result)));
  for (const key of localPreferenceKeys) assert.deepEqual(reloaded[key], current[key], `${key} must survive reload`);
});

test("manual friends-only imports replace the local left-friend default", () => {
  const legacy = structuredClone(fixture);
  delete legacy.hierarchy.leftFriends;
  legacy.hierarchy.friends = ["Legacy friend field"];
  const current = migrateAndMergeSettings({ kplexInitialized: true, hierarchy: { leftFriends: ["Local friend field"] } });
  const imported = importExcaliBrainGraphSettings(legacy, current);
  assert(imported.hierarchy.leftFriends.includes("Legacy friend field"));
  assert(!imported.hierarchy.leftFriends.includes("Local friend field"));
});

test("both first-run and file imports use the bounded graph-import path", () => {
  const main = readFileSync(join(root, "src/main.ts"), "utf8");
  const settings = readFileSync(join(root, "src/settings.ts"), "utf8");
  assert(main.includes("importExcaliBrainGraphSettings(legacySettings, this.settings)"));
  assert(settings.includes("importExcaliBrainGraphSettings(parsed, this.plugin.settings)"));
  assert(main.includes("migrateAndMergeSettings(ownData)"), "Own K-Plex settings must not be filtered as foreign data");
});

test("central editor stays opt-in while its local mode defaults safely", () => {
  assert.equal(migrated.embedCentralNode, false, "legacy ExcaliBrain embed preference must not enable K-Plex editor mode by default");
  assert.equal(migrated.centralNodeMarkdownMode, "source");
  assert.equal(migrateAndMergeSettings({ ...fixture, centralNodeMarkdownMode: "preview" }).centralNodeMarkdownMode, "preview");
  assert.equal(migrateAndMergeSettings({ ...fixture, centralNodeMarkdownMode: "invalid" }).centralNodeMarkdownMode, "source");
  assert.equal(migrateAndMergeSettings({ ...fixture, kplexInitialized: true, embedCentralNode: true }).embedCentralNode, true, "initialized K-Plex vaults preserve the user's editor toggle");
});


test("central editor layout reserves its rectangle and pushes surrounding relationship zones away", () => {
  const makePage = (path) => ({ path, name: path, file: { extension: "md" }, noteType: null, styleTags: [], primaryStyleTag: null });
  const center = makePage("Center.md");
  const parentPage = makePage("Parent.md");
  const rightPage = makePage("Right.md");
  const siblingPage = makePage("Sibling.md");
  const relation = (page) => ({ page, relationType: 1, typeDefinition: "", linkDirection: 0 });
  const neighborhood = {
    center,
    parents: [relation(parentPage)],
    children: [],
    leftFriends: [],
    rightFriends: [relation(rightPage)],
    siblings: [relation(siblingPage)],
  };
  const gateStats = {
    top: { count: 0, inferredCount: 0 },
    bottom: { count: 0, inferredCount: 0 },
    left: { count: 0, inferredCount: 0 },
    right: { count: 0, inferredCount: 0 },
  };
  const index = {
    titleFor: (page) => page.name,
    neighbourCount: () => 0,
    gateStats: () => gateStats,
    neighbours: () => [],
    visibleRelationshipsWithin: () => [],
  };

  const normal = buildScene(neighborhood, index, migrated, false);
  const editor = buildScene(neighborhood, index, migrated, false, { width: 600, height: 480 });
  const node = (scene, path) => scene.nodes.find((candidate) => candidate.page.path === path);

  assert.equal(node(editor, "Center.md").width, 600);
  assert.equal(node(editor, "Center.md").height, 480);
  assert(node(editor, "Parent.md").y < node(normal, "Parent.md").y, "parents should move farther above a taller editor");
  assert(node(editor, "Right.md").x > node(normal, "Right.md").x, "lateral relationships should move beyond a wider editor");
  assert(node(editor, "Sibling.md").x > node(normal, "Sibling.md").x, "siblings should also move beyond a wider editor");
  assert(Math.abs(node(editor, "Right.md").y) < 1, "friends/challengers should stay centered beside the editor");
  assert(Math.abs(node(editor, "Sibling.md").y) < 1, "siblings should stay centered beside the editor");
});

test("legacy friends fallback and existing K-Plex-only settings survive migration", () => {
  const legacy = structuredClone(fixture);
  delete legacy.hierarchy.leftFriends;
  const result = migrateAndMergeSettings({ ...legacy, parentMaxHeight: 620, noteTypeStyles: { Project: { icon: "briefcase" } }, connectorStyle: "straight", kplexInitialized: true });
  assert(result.hierarchy.leftFriends.includes("Friends"));
  assert.equal(result.parentMaxHeight, 620);
  assert.equal(result.connectorStyle, "straight");
  assert.equal(result.kplexInitialized, true);
  assert.deepEqual(result.noteTypeStyles, { Project: { icon: "briefcase" } });
});

test("every imported tag and relationship override reaches the production style resolver", () => {
  for (const tag of fixture.tagStyleList) {
    const style = fixture.tagNodeStyles[tag];
    const page = { primaryStyleTag: tag, styleTags: [], file: { extension: "md" }, noteType: null };
    const effective = resolveNodeStyle(page, null, "center", migrated);
    const matching = fixture.tagStyleList.find(key => tag.startsWith(key));
    for (const [key, value] of Object.entries(fixture.tagNodeStyles[matching] ?? style)) assert.equal(effective[key], value, `${tag}.${key}`);
  }
  const page = { primaryStyleTag: "#person/family", styleTags: ["#work"], file: { extension: "md" }, noteType: null };
  const effective = resolveNodeStyle(page, null, "center", migrated);
  assert.equal(effective.borderColor, "#f7ce46ff");
  assert.equal(effective.prefix, "🧑 ⚙️ ");
  for (const [name, style] of Object.entries(fixture.hierarchyLinkStyles)) {
    for (const definition of new Set([name, name.toLowerCase().replaceAll(" ", "-")])) {
      const effective = resolveLinkStyle({ typeDefinition: definition, relationType: 2 }, migrated);
      for (const [key, value] of Object.entries(style)) assert.equal(effective[key], value, `${definition}.${key}`);
    }
  }
  assert.equal(resolveLinkStyle({ typeDefinition: "Inspired by", relationType: 2 }, migrated).strokeColor, "#fefb4199");
});

test("settings manager exposes imported tag styles without converting their matching semantics", () => {
  const settings = structuredClone(migrated);
  settings.noteTypeStyles = { "#person": { icon: "user" } };
  const plugin = { manifest: { id: "k-plex" }, settings, index: { unassignedOntologyFields: () => [], allPages: () => [] } };
  plugin.translator = createObsidianTranslator();
  const tab = new KplexSettingTab({}, plugin);
  const entries = tab.nodeStyleEntries();
  assert.equal(entries.length, 33);
  assert.deepEqual(entries.filter(entry => entry.name === "#person").map(entry => entry.kind).sort(), ["property", "tag"]);
  assert.deepEqual(entries.filter(entry => entry.kind === "tag").map(entry => entry.name).sort(), Object.keys(fixture.tagNodeStyles).sort());
  const fields = tab.ontologyStyleFields();
  for (const name of Object.keys(fixture.hierarchyLinkStyles).filter(Boolean))
    assert(fields.some(field => field.name.toLowerCase().replaceAll(" ", "-") === name.toLowerCase().replaceAll(" ", "-")), `Imported link style ${name} absent from settings`);
  assert.deepEqual(settings.tagStyleList, fixture.tagStyleList);
  assert.deepEqual(settings.tagNodeStyles, fixture.tagNodeStyles);
  const flatten = items => items.flatMap(item => [item, ...flatten(item.items ?? [])]);
  const manager = flatten(tab.getSettingDefinitions()).find(item => item.name === "Node styles");
  assert.equal(typeof manager.action, "function");
  assert(manager.desc.startsWith("33 custom styles."), "Settings count must include both style families");
});


/** Find the actual production form controls through the narrow native-shell double. */
function formElements(modal) {
  const visit = element => [element, ...element.children.flatMap(visit)];
  return visit(modal.contentEl);
}

/** Dispatch user-level form events; save callbacks keep their asynchronous production sequencing. */
async function activate(element, type = "click") {
  element.dispatchEvent(new Event(type));
  await new Promise(resolve => setImmediate(resolve));
}

/** Supply indexed hints and observe appearance-only saves without substituting the production editor. */
function styleEditorFixture(settings = structuredClone(defaults)) {
  const saves = [];
  const plugin = { settings, saveSettings: async (...args) => { saves.push(args); }, index: { allPages: () => [
    { noteType: "Project", tags: ["#project/active", "project/backlog"] },
    { noteType: "Person", tags: ["#person"] },
  ] } };
  plugin.translator = createObsidianTranslator();
  const tab = new KplexSettingTab({}, plugin);
  tab.update = () => {};
  return { tab, settings, saves, plugin };
}

/** Mount the real modal logic with timers isolated to this form-shell test, never native acceptance. */
function openStyle(tab, kind, name = null) {
  const priorWindow = globalThis.window;
  try {
    globalThis.window = { setTimeout(callback) { callback(); return 0; } };
    tab.openNodeStyleEditor(kind, name);
    return TestModal.latest;
  } finally { globalThis.window = priorWindow; }
}

test("new node style explicitly selects a tag prefix and preserves the appearance draft while switching", async () => {
  const { tab, settings, saves } = styleEditorFixture();
  const modal = openStyle(tab, "property");
  const elements = formElements(modal);
  const select = elements.find(element => element.tag === "select");
  const byLabel = name => elements.find(element => element.attrs["aria-label"] === name);
  assert.deepEqual(select.children.map(option => [option.value, option.text]), [["property", "Note type"], ["tag", "Tag"]]);
  assert.equal(select.disabled, false);
  const name = byLabel("Note type"), icon = byLabel("Lucide icon"), prefix = byLabel("Label prefix");
  icon.value = "briefcase"; byLabel("Background").value = "#123456"; byLabel("Font size").value = "23";
  assert.equal(prefix.parent.visible, false);
  name.value = "project/active";
  select.value = "tag"; await activate(select, "change");
  assert.equal(name.value, "#project/active");
  assert.equal(name.attrs["aria-label"], "Tag");
  assert.equal(name.placeholder, "#project"); assert.equal(prefix.parent.visible, true);
  prefix.value = "Work ";
  const suggest = TestSuggest.instances.findLast(instance => instance.input === name);
  assert(suggest.getSuggestions("").every(item => item.value.startsWith("#") && item.kind !== "property"));
  const suggested = suggest.getSuggestions("backlog")[0];
  suggest.selectSuggestion(suggested);
  assert.equal(name.value, "#project/backlog");
  select.value = "property"; await activate(select, "change");
  assert.equal(name.value, "project/backlog");
  assert.equal(name.attrs["aria-label"], "Note type");
  assert(suggest.getSuggestions("").some(item => item.value === "Project" && item.kind === "property"));
  assert(suggest.getSuggestions("backlog").some(item => item.value === "project/backlog"));
  select.value = "tag"; await activate(select, "change");
  assert.equal(name.value, "#project/backlog");
  assert.equal(prefix.value, "Work "); assert.equal(icon.value, "briefcase");
  name.value = " ##project/backlog ";
  await activate(elements.find(element => element.text === "Save"));
  assert.equal(modal.closed, true);
  assert.deepEqual(Object.keys(settings.tagNodeStyles), ["#project/backlog"]);
  assert.deepEqual(settings.tagStyleList, ["#project/backlog"]);
  assert.deepEqual(settings.noteTypeStyles, {});
  assert.equal(settings.tagNodeStyles["#project/backlog"].icon, "briefcase");
  assert.equal(settings.tagNodeStyles["#project/backlog"].prefix, "Work ");
  assert.equal(settings.tagNodeStyles["#project/backlog"].backgroundColor, "#123456ff");
  assert.equal(settings.tagNodeStyles["#project/backlog"].fontSize, 23);
  const effective = resolveNodeStyle({ primaryStyleTag: "#project/backlog/task", styleTags: [], file: { extension: "md" }, noteType: null }, null, "center", settings);
  assert.equal(effective.icon, "briefcase"); assert.equal(effective.backgroundColor, "#123456ff");
  assert.equal(suggest.closed, true);
  assert.deepEqual(saves, [[false]]);
  assert.match(elements.find(element => element.tag === "p").text, /primary style tag/);
});


test("style editor controls expose visible linked descriptions and type switches never change existing keys", async () => {
  const { tab, settings } = styleEditorFixture();
  const modal = openStyle(tab, "property"); const elements = formElements(modal);
  for (const control of elements.filter(element => ["input", "select"].includes(element.tag))) {
    const description = elements.find(element => element.attrs.id === control.attrs["aria-describedby"]);
    assert(description?.text.trim(), `${control.attrs["aria-label"]} needs a visible accessible description`);
    assert(elements.some(element => element.tag === "label" && element.attrs.for === control.attrs.id));
    assert.equal(control.attrs.title, undefined);
  }
  const prefix = elements.find(element => element.attrs["aria-label"] === "Label prefix");
  assert.equal(elements.find(element => element.attrs.id === prefix.attrs["aria-describedby"]).text, "Text placed before the displayed node title.");
  const type = elements.find(element => element.tag === "select"), name = elements.find(element => element.attrs["aria-label"] === "Note type");
  name.value = ""; type.value = "tag"; await activate(type, "change"); assert.equal(name.value, "");
  name.value = "##area"; type.value = "property"; await activate(type, "change"); assert.equal(name.value, "area");
  type.value = "tag"; await activate(type, "change"); assert.equal(name.value, "#area");
  settings.tagNodeStyles["legacy-without-hash"] = { icon: "box" }; settings.tagStyleList = ["legacy-without-hash"];
  const edit = openStyle(tab, "tag", "legacy-without-hash"); const controls = formElements(edit);
  const locked = controls.find(element => element.tag === "select"); locked.value = "property"; await activate(locked, "change");
  assert.equal(controls.find(element => element.attrs["aria-label"] === "Tag").value, "legacy-without-hash");
  await activate(controls.find(element => element.text === "Save"));
  assert.deepEqual(settings.tagStyleList, ["legacy-without-hash"]);
});

test("empty tag prefixes cannot save and property suggestions retain property normalization", async () => {
  const { tab, settings, saves } = styleEditorFixture();
  const tag = openStyle(tab, "tag"); const elements = formElements(tag);
  const name = elements.find(element => element.attrs["aria-label"] === "Tag");
  const save = elements.find(element => element.text === "Save");
  for (const invalid of ["", "  ", "#", " ### "]) {
    name.value = invalid; await activate(save);
    assert.equal(tag.closed, undefined); assert.equal(name.classList.contains("is-invalid"), true);
    assert.equal(saves.length, 0); assert.deepEqual(settings.tagStyleList, []);
  }
  name.value = "new/prefix"; await activate(name, "input");
  assert.equal(name.classList.contains("is-invalid"), false);
  await activate(save); assert(settings.tagNodeStyles["#new/prefix"]);
  const property = openStyle(tab, "property"); const propertyElements = formElements(property);
  const input = propertyElements.find(element => element.attrs["aria-label"] === "Note type");
  const suggest = TestSuggest.instances.findLast(instance => instance.input === input);
  suggest.selectSuggestion(suggest.getSuggestions("backlog")[0]);
  assert.equal(input.value, "project/backlog");
  await activate(propertyElements.find(element => element.text === "Save"));
  assert(settings.noteTypeStyles["project/backlog"]);
  assert.deepEqual(settings.tagStyleList, ["#new/prefix"]);
  assert.deepEqual(saves, [[false], [false]]);
});

test("editing imported tag styles retains family, exact unchanged keys, appearance and first-match priority", async () => {
  const original = structuredClone(migrated);
  original.tagNodeStyles["old-prefix"] = { prefix: "Legacy ", icon: "box", backgroundColor: "#10203080", fontSize: 19 };
  original.tagStyleList.splice(2, 0, "old-prefix");
  original.noteTypeStyles["old-prefix"] = { icon: "user" };
  const beforeTags = structuredClone(original.tagNodeStyles), beforeOrder = [...original.tagStyleList];
  const { tab, settings, saves } = styleEditorFixture(original);
  const modal = openStyle(tab, "tag", "old-prefix"); const elements = formElements(modal);
  const select = elements.find(element => element.tag === "select");
  assert.equal(select.disabled, true); assert.equal(select.value, "tag");
  select.value = "property"; await activate(select, "change");
  assert.equal(elements.find(element => element.tag === "p").text.includes("primary style tag"), true);
  await activate(elements.find(element => element.text === "Save"));
  assert.deepEqual(settings.tagStyleList, beforeOrder);
  assert.deepEqual(JSON.parse(JSON.stringify(settings.tagNodeStyles)), beforeTags);
  assert.deepEqual(settings.noteTypeStyles["old-prefix"], { icon: "user" });
  const renamed = openStyle(tab, "tag", "old-prefix"); const renameElements = formElements(renamed);
  renameElements.find(element => element.attrs["aria-label"] === "Tag").value = "new-prefix";
  await activate(renameElements.find(element => element.text === "Save"));
  assert.deepEqual(settings.tagStyleList, beforeOrder.map(key => key === "old-prefix" ? "#new-prefix" : key));
  assert.equal(settings.tagNodeStyles["old-prefix"], undefined);
  assert.equal(settings.tagNodeStyles["#new-prefix"].backgroundColor, "#10203080");
  const fresh = openStyle(tab, "tag"); const freshElements = formElements(fresh);
  freshElements.find(element => element.attrs["aria-label"] === "Tag").value = "#fresh";
  await activate(freshElements.find(element => element.text === "Save"));
  assert.equal(settings.tagStyleList.at(-1), "#fresh");
  const remove = openStyle(tab, "tag", "#new-prefix");
  await activate(formElements(remove).find(element => element.text === "Delete"));
  assert.deepEqual(settings.tagStyleList, [...beforeOrder.filter(key => key !== "old-prefix"), "#fresh"]);
  assert.equal(settings.tagNodeStyles["#new-prefix"], undefined);
  assert.deepEqual(settings.noteTypeStyles["old-prefix"], { icon: "user" });
  assert.deepEqual(saves, [[false], [false], [false], [false]]);
});


test("unchanged tag edits preserve an inherited label prefix instead of storing an empty override", async () => {
  const { tab, settings } = styleEditorFixture();
  const original = { icon: "info", backgroundColor: "#581c87ff", borderColor: "#d8b4feff", textColor: "#ffffffff", strokeWidth: 2 };
  settings.tagNodeStyles["#without-prefix"] = { ...original };
  settings.tagStyleList = ["#without-prefix"];
  const modal = openStyle(tab, "tag", "#without-prefix");
  await activate(formElements(modal).find(element => element.text === "Save"));
  assert.deepEqual(JSON.parse(JSON.stringify(settings.tagNodeStyles["#without-prefix"])), original);
  assert.equal(resolveNodeStyle({ primaryStyleTag: "#without-prefix", styleTags: [], file: { extension: "md" }, noteType: null }, null, "center", settings).prefix, settings.baseNodeStyle.prefix);
});

test("style callbacks target current settings and existing property edits keep property-value normalization", async () => {
  const { tab, settings, plugin, saves } = styleEditorFixture();
  settings.noteTypeStyles["#legacy"] = { icon: "box" };
  const modal = openStyle(tab, "property", "#legacy");
  const controls = formElements(modal);
  assert.equal(controls.find(element => element.tag === "select").disabled, true);
  const replacement = structuredClone(settings);
  replacement.tagNodeStyles["#retained"] = { icon: "info" }; replacement.tagStyleList = ["#retained"];
  plugin.settings = replacement;
  await activate(controls.find(element => element.text === "Save"));
  assert.equal(replacement.noteTypeStyles["#legacy"], undefined);
  assert.equal(replacement.noteTypeStyles.legacy.icon, "box");
  assert(settings.noteTypeStyles["#legacy"], "Opening snapshot must not become the persistence target");
  const tag = openStyle(tab, "tag");
  const tagControls = formElements(tag);
  tagControls.find(element => element.attrs["aria-label"] === "Tag").value = "fresh";
  await activate(tagControls.find(element => element.text === "Save"));
  assert.deepEqual(replacement.tagStyleList, ["#retained", "#fresh"]);
  assert.deepEqual(settings.tagStyleList, []);
  const remove = openStyle(tab, "tag", "#fresh");
  const finalSettings = structuredClone(replacement); plugin.settings = finalSettings;
  await activate(formElements(remove).find(element => element.text === "Delete"));
  assert.equal(finalSettings.tagNodeStyles["#fresh"], undefined);
  assert.deepEqual(finalSettings.tagStyleList, ["#retained"]);
  assert(replacement.tagNodeStyles["#fresh"]);
  assert.deepEqual(saves, [[false], [false], [false]]);
});


test("explicit normalized link-style keys take precedence over legacy display names", () => {
  const settings = structuredClone(migrated);
  settings.hierarchyLinkStyles["inspired-by"] = { strokeColor: "#123456ff" };
  assert.equal(resolveLinkStyle({ typeDefinition: "inspired-by", relationType: 1 }, settings).strokeColor, "#123456ff");
  assert.equal(resolveLinkStyle({ typeDefinition: "Inspired by", relationType: 1 }, settings).strokeColor, fixture.hierarchyLinkStyles["Inspired by"].strokeColor);
});


/** Exercise issue #70 against production style resolution/layout without changing semantic neighborhoods. */
test("long labels and fixed two-line rows clear the center and neighboring zones", () => {
  const page = (name) => ({ path: name + ".md", name, file: { extension: "md" }, aliases: [], tags: [], styleTags: [], neighbours: new Map() });
  const relation = (page) => ({ page, relationType: 1, typeDefinition: "", linkDirection: 0 });
  const long = "A long meaningful title about books and connected knowledge ".repeat(3);
  const neighborhood = { center: page("Center"), parents: [relation(page("Parent " + long)), relation(page("Second parent " + long))], children: [relation(page("Child " + long)), relation(page("Second child " + long))], leftFriends: [relation(page("Friend " + long)), relation(page("Short friend"))], rightFriends: [relation(page("Challenger " + long))], siblings: [relation(page("Sibling " + long))] };
  const index = { titleFor: p => p.name, neighbourCount: () => 0, gateStats: () => ({}), neighbours: () => [], visibleRelationshipsWithin: () => [] };
  for (const compactingFactor of [1, 2, 4]) for (const wrapNodeLabels of [false, true]) for (const centerSize of [undefined, {width: 900, height: 600}]) {
    const settings = { ...defaults, compactingFactor, wrapNodeLabels, graphDepth: 1, baseNodeStyle: {...defaults.baseNodeStyle, maxLabelLength: 120, maxWidth: 800}, centralNodeStyle: {...defaults.centralNodeStyle, maxWidth: 1000} };
    const scene = buildScene(neighborhood, index, settings, false, centerSize);
    for (let i = 0; i < scene.nodes.length; i++) for (let j = i + 1; j < scene.nodes.length; j++) {
      const a = scene.nodes[i], b = scene.nodes[j];
      assert(Math.abs(a.x-b.x) >= (a.width+b.width)/2 || Math.abs(a.y-b.y) >= (a.height+b.height)/2, `Nodes overlap: ${a.role}/${b.role}, density=${compactingFactor}, wrap=${wrapNodeLabels}`);
    }
    const regular = scene.nodes.filter(n => n.role !== "center" && n.role !== "sibling");
    assert(regular.some(n => n.width > 286), "Long-label controls did not permit wider nodes");
    assert.equal(new Set(regular.map(n => n.height)).size, 1, "Short and long labels must reserve identical regular-row heights");
    assert(wrapNodeLabels ? regular[0].height > 26 : regular[0].height === 26, "Two-line mode must reserve a taller fixed row");
    assert.equal(Math.abs(scene.nodes.find(n => n.role === "left").x), scene.nodes.find(n => n.role === "right").x, "Lateral zones must stay symmetrical");
  }
});
