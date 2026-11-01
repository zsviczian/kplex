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
import {styleSettingsHostSource} from "./support/styleSettingsHost.mjs";
import { assertMigratedExcaliBrainSettings, localPreferenceKeys } from "./support/excalibrainMigration.mjs";

// The production completion adapter owns native timers. This Node-only form fixture supplies
// real task timers rather than a synchronous fake or a production no-window compatibility branch.
const openingWindow = globalThis.window;
globalThis.window = {crypto: globalThis.crypto, setTimeout, clearTimeout};
process.on("exit", /** Retire only this isolated test process's host boundary. */ () => {globalThis.window = openingWindow;});

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = JSON.parse(readFileSync(join(root, "tests/fixtures/excalibrain-migration/data.json"), "utf8"));
const temp = mkdtempSync(join(tmpdir(), "kplex-migration-"));
process.on("exit", () => rmSync(temp, { recursive: true, force: true }));
await build({
  stdin: { contents: styleSettingsHostSource(pathToFileURL(root+"/")) + '\nexport * from "./src/settings"; export {ontologyConfiguration} from "./src/core/contracts/ontologyConfiguration"; export * as themeModel from "./src/core/plex/appearanceThemes"; export {adoptStandardThemeColors,deleteNamedColor} from "./src/core/plex/colorEditing"; export * from "./src/core/graph/settingsPolicy"; export * from "./src/index/style"; export * from "./src/ui/layout"; export * from "./src/ui/PurgeIndexCacheModal"; export { Modal as TestModal, Notice as TestNotice, AbstractInputSuggest as TestSuggest } from "obsidian"; export { createObsidianTranslator } from "./src/adapters/obsidian/localization";', resolveDir: root, loader: "ts" },
  outfile: join(temp, "migration.mjs"), bundle: true, platform: "node", format: "esm",
  plugins: [{ name: "obsidian-boundary-double", setup(builder) {
    // This finite non-browser form fixture has no CSS document or workspace event bus. Keep the
    // decoration-only port finite here; color-editors.test exercises the actual sampler/strips in
    // Chromium and native lanes prove installed host behavior. All queue/form assertions stay real.
    builder.onResolve({filter: /ColorSwatchList$/}, () => ({path: "paired-swatches", namespace: "decoration"}));
    builder.onLoad({filter: /.*/, namespace: "decoration"}, () => ({contents: `
      export class ColorSwatchList { add() { return () => {}; } update() {} dispose() {} }
      export function renderColorStrips() {}
    `}));
    builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "double" }));
    builder.onLoad({ filter: /.*/, namespace: "double" }, () => ({ contents: `
      export class Component {load(){} unload(){}} export const MarkdownRenderer={render:()=>{throw Error("Native Markdown is outside this finite fixture")}}; export class App {}
      export class ExtraButtonComponent {} export class Scope {}
      export const Platform = {};
      /** Narrow form-shell double: production modal fields, listeners and save callbacks remain real. */
      class FormElement {
        constructor(tag = "div", options = {}) {
          this.tag = tag; this.children = []; this.buttons = []; this.listeners = {}; this.value = options.value ?? "";
          this.text = options.text ?? ""; this.attrs = {}; this.visible = true; this.disabled = false; this.isConnected = true; this.ownerDocument = { defaultView: globalThis.window };
          const classes = new Set((options.cls ?? "").split(" ").filter(Boolean));
          this.classList = { add(...names) { names.forEach(name => classes.add(name)); }, remove(...names) { names.forEach(name => classes.delete(name)); }, contains(name) { return classes.has(name); } };
          Object.entries(options.attr ?? {}).forEach(([name, value]) => this.setAttribute(name, value));
        }
        addClass(name) { this.classList.add(name); }
        createEl(tag, options) { const child = new FormElement(tag, options); this.appendChild(child); return child; }
        createDiv(options) { return this.createEl("div", options); }
        createSpan(options) { return this.createEl("span", options); }
        appendChild(child) { if (child.parent) child.parent.children = child.parent.children.filter(item => item !== child); this.children.push(child); child.parent = this; }
        append(...children) { for (const child of children) this.appendChild(child); }
        prepend(child) { this.appendChild(child); this.children = [child, ...this.children.filter(item => item !== child)]; }
        setText(text) { this.text = text; }
        get tagName() { return this.tag.toUpperCase(); }
        get textContent() { return this.text; }
        setAttribute(name, value) { this.attrs[name] = value; if (name === "type") this.type = value; }
        setCssProps() {}
        toggle(value) { this.visible = value; }
        focus() { this.focused = true; }
        addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
        dispatchEvent(event) { for (const fn of this.listeners[event.type] ?? []) fn(event); return true; }
        querySelectorAll(selector) { const tags = selector.split(", "); const visit = el => el.children.flatMap(child => [...(tags.includes(child.tag) ? [child] : []), ...visit(child)]); return visit(this); }
        empty() { this.children = []; this.buttons = []; }
      }
      // Obsidian provides this global DOM helper; retain its actual fragment/span contract in the finite form double.
      globalThis.createFragment = () => new FormElement("fragment");
      export class ButtonComponent {} export class Modal {
        constructor(app) { this.app = app; this.titleEl = new FormElement(); this.contentEl = new FormElement(); this.modalEl = new FormElement(); Modal.latest = this; }
        open() { this.onOpen?.(); }
        close() { this.closed = true; this.onClose?.(); }
      }
      export class ColorComponent {}
      export class SuggestModal extends Modal {}
      export class Notice { static messages = []; constructor(message) { Notice.messages.push(message); } }
      export class Setting {
        constructor(container) { this.container = container; this.settingEl = container.createDiv(); this.nameEl = this.settingEl.createDiv(); this.descEl = this.settingEl.createDiv(); this.controlEl = this.settingEl.createDiv(); }
        setName(value) { this.nameEl.setText(value); return this; }
        setDesc(value) { this.descEl.setText(value); return this; }
        addSlider(create) {
          const input = this.controlEl.createEl("input", {attr: {type: "range"}});
          const api = {sliderEl: input, setLimits(min, max, step) {Object.assign(input, {min, max, step}); return api;}, setInstant() {return api;}, setDisabled(value) {input.disabled = value; return api;}, setValue(value) {input.value = String(value); return api;}, onChange(run) {input.addEventListener("input", () => run(Number(input.value))); return api;}};
          create(api); return this;
        }
        addExtraButton(create) {
          const input = this.controlEl.createEl("button");
          const api = {extraSettingsEl: input, setIcon() {return api;}, setTooltip(value) {input.setAttribute("aria-label", value); return api;}, setDisabled(value) {input.disabled = value; return api;}, onClick(run) {input.addEventListener("click", run); return api;}};
          create(api); return this;
        }
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
      export class PluginSettingTab { constructor(app) { this.app = app; this.containerEl = new FormElement(); } }
      export const getIcon = () => null; export const getIconIds = () => []; export const getLanguage = () => "en";
    `, loader: "js" }));
  } }],
});
const { ontologyConfiguration, DEFAULT_SETTINGS, DEFAULT_HIERARCHY_DEFINITION, migrateAndMergeSettings, importExcaliBrainGraphSettings, KplexSettingTab, resolveNodeStyle, resolveLinkStyle, buildScene, PurgeIndexCacheModal,
  captureSettingsPolicy, classifySettingsChange, encodeIndexSettingsSignature, TestModal, TestNotice, TestSuggest, createObsidianTranslator, StyleSettingsHost, themeModel } = await import(pathToFileURL(join(temp, "migration.mjs")));
const defaults = migrateAndMergeSettings(undefined);
const migrated = importExcaliBrainGraphSettings(fixture);

test("fresh settings pair inverse factory fields, survive persistence and keep independent defaults", () => {
  const expected = [["Parent", "Child"], ["Parents", "Children"], ["up", "down"], ["u", "d"], ["North", "South"],
    ["Previous", "Next"], ["West", "East"], ["w", "e"], ["Before", "After"]];
  for (const raw of [undefined, null, {}]) {
    const settings = migrateAndMergeSettings(raw);
    assert.deepEqual(settings.hierarchy, DEFAULT_SETTINGS.hierarchy);
    assert.deepEqual(settings.hierarchy, DEFAULT_HIERARCHY_DEFINITION);
    const configuration = ontologyConfiguration(settings);
    for (const [field, partner] of expected) {
      assert.equal(configuration.pairs.get(field.toLowerCase()).partner, partner);
      assert.equal(configuration.pairs.get(partner.toLowerCase()).partner, field);
    }
    assert.equal(configuration.pairs.size, expected.length * 2);
    const legacy = ontologyConfiguration(migrateAndMergeSettings({standardStyleDefaults: "native"}));
    for (const group of Object.keys(configuration.hierarchy)) {
      assert.deepEqual([...configuration.hierarchy[group]].sort(), [...legacy.hierarchy[group]].sort(), group);
    }
    assert.deepEqual(migrateAndMergeSettings(JSON.parse(JSON.stringify(settings))).hierarchy, settings.hierarchy);
  }
  const first = migrateAndMergeSettings(null), second = migrateAndMergeSettings(null);
  first.hierarchy.parents.push("Only this installation");
  first.hierarchy.leftFriends.push("Only this friend list");
  assert(!second.hierarchy.parents.includes("Only this installation"));
  assert(!DEFAULT_SETTINGS.hierarchy.parents.includes("Only this installation"));
  assert(!second.hierarchy.leftFriends.includes("Only this friend list"));
  assert(!DEFAULT_SETTINGS.hierarchy.leftFriends.includes("Only this friend list"));
});

test("paired factory defaults never opt saved or imported ontology into pairing", () => {
  for (const raw of [{showTagNodes: true}, {standardStyleDefaults: "native"},
    {hierarchy: {parents: ["Custom/field", "Parent"], children: ["Child"]}},
    {ontologyPairingVersion: 1, hierarchy: {parents: ["Parent"], children: ["Child"]}}]) {
    const settings = migrateAndMergeSettings(raw);
    assert.equal(ontologyConfiguration(settings).pairs.size, 0);
    assert.deepEqual(migrateAndMergeSettings(JSON.parse(JSON.stringify(settings))).hierarchy, settings.hierarchy);
  }
  const imported = importExcaliBrainGraphSettings({hierarchy: {parents: ["Parent"], children: ["Child"]}});
  assert.equal(ontologyConfiguration(imported).pairs.size, 0);
  assert.deepEqual(imported.hierarchy.parents, ["Parent"]);
  const importedOverFresh = importExcaliBrainGraphSettings({hierarchy: {parents: ["Custom"], children: ["Custom child"]}}, defaults);
  assert.deepEqual(importedOverFresh.hierarchy.parents, ["Custom"]);
  assert.deepEqual(importedOverFresh.hierarchy.children, ["Custom child"]);
  assert.equal(ontologyConfiguration(importedOverFresh).pairs.has("parent"), false);
});

/** Keep theme identities native-shaped while preserving the real queue and all source/color policy. */
async function withThemeWindow(run) {
  const previous = globalThis.window; globalThis.window = {...previous, crypto: globalThis.crypto};
  try {return await run();} finally {globalThis.window = previous;}
}

/** Initialize through the actual production writer, retaining finite counters for forbidden graph work. */
async function themeFixture(raw = {backgroundColor: "#12345680"}, existing = true, legacyImport) {
  const result = styleEditorFixture(migrateAndMergeSettings(raw)), calls = {presentation: 0, semantic: 0, invalidation: 0};
  result.plugin.index.refreshPresentationSettings = async () => {calls.presentation++;};
  result.plugin.index.refreshSemanticSettings = async () => {calls.semantic++;};
  result.plugin.index.invalidateSemanticPolicy = () => {calls.invalidation++;};
  await result.plugin.updateStyleSettings(() => {}, result.plugin.captureAppearanceOwner(), {initializeThemes: {existing}, ...(legacyImport === undefined ? {} : {legacyImport})});
  return {...result, calls};
}

test("appearance initialization preserves migrated legacy omissions, persists three choices once and retries failed storage without a false backup", async () => withThemeWindow(async () => {
  const original = migrateAndMergeSettings({baseNodeStyle: {fontSize: 29}, tagNodeStyles: {legacy: {icon: "star"}}, tagStyleList: ["legacy"]});
  const {plugin, settings, saves} = styleEditorFixture(original), before = structuredClone(settings);
  plugin.saveData = async () => {throw Error("Expected migration storage failure");};
  await assert.rejects(plugin.updateStyleSettings(() => {}, plugin.captureAppearanceOwner(), {initializeThemes: {existing: true}}), /migration storage/);
  assert.deepEqual(settings, before); assert.equal(settings.appearanceThemes, undefined);
  plugin.saveData = async snapshot => {saves.push(structuredClone(snapshot));};
  await plugin.updateStyleSettings(() => {}, plugin.captureAppearanceOwner(), {initializeThemes: {existing: true}});
  assert.equal(settings.appearanceThemes.selectedId, "user"); assert.equal(settings.appearanceThemes.migrationNotice, true);
  assert.deepEqual(settings.appearanceThemes.themes[0].appearance, themeModel.captureThemeAppearance(before));
  assert.equal(settings.appearanceThemes.themes[0].appearance.base.baseNodeStyle.textColor, "#ffffffff", "Historically omitted colors retain their prior effective legacy baseline");
  assert.equal(settings.appearanceThemes.themes[1].appearance.base.baseNodeStyle.textColor, undefined);
  assert.equal(settings.appearanceThemes.themes[1].appearance.base.baseNodeStyle.fontSize, 29);
  const reloaded = migrateAndMergeSettings(JSON.parse(JSON.stringify(saves[0]))), second = styleEditorFixture(reloaded);
  await second.plugin.updateStyleSettings(() => {}, second.plugin.captureAppearanceOwner(), {initializeThemes: {existing: true}});
  assert.equal(second.saves.length, 0); assert.deepEqual(second.settings.appearanceThemes, settings.appearanceThemes);
}));

test("fresh/no-import starts with immutable factory only; actual first-run ExcaliBrain import retains selected User theme", async () => withThemeWindow(async () => {
  const fresh = await themeFixture(null, false);
  assert.deepEqual(fresh.settings.appearanceThemes.themes.map(theme => theme.id), ["default"]);
  assert.equal(fresh.settings.appearanceThemes.selectedId, "default"); assert.equal(fresh.settings.appearanceThemes.migrationNotice, false);
  const imported = await themeFixture(null, true, fixture);
  const expected = importExcaliBrainGraphSettings(fixture, migrateAndMergeSettings(undefined));
  assert.equal(imported.settings.appearanceThemes.selectedId, "user"); assert.equal(imported.settings.appearanceThemes.themes.length, 3);
  assert.deepEqual(imported.settings.appearanceThemes.themes[0].appearance, themeModel.captureThemeAppearance(expected));
  assert.deepEqual(imported.settings.hierarchy, expected.hierarchy);
  assert.equal(imported.calls.presentation, 0); assert.equal(imported.calls.semantic, 0, "First publication stays with normal startup demand");
}));

test("factory copy-on-write is atomic, genuinely changed only, uniquely named and failed saves leave factory exact", async () => withThemeWindow(async () => {
  const {plugin, settings, saves} = await themeFixture(null, false), factory = structuredClone(settings.appearanceThemes.themes[0]);
  const before = saves.length, owner = plugin.captureAppearanceOwner();
  await plugin.updateStyleSettings(() => {}, owner); assert.equal(saves.length, before); assert.equal(settings.appearanceThemes.themes.length, 1);
  const write = plugin.saveData; plugin.saveData = async () => {throw Error("Expected factory save failure");};
  await assert.rejects(plugin.updateStyleSettings(draft => {draft.backgroundColor = "#abcdef80";}, owner), /factory save failure/);
  assert.equal(settings.appearanceThemes.selectedId, "default"); assert.equal(settings.backgroundColor, undefined); assert.deepEqual(settings.appearanceThemes.themes[0], factory);
  plugin.saveData = write; await plugin.updateStyleSettings(draft => {draft.backgroundColor = "#abcdef80";}, owner);
  assert.equal(settings.appearanceThemes.themes.length, 2); assert.equal(settings.appearanceThemes.themes[1].name, "Custom theme");
  assert.deepEqual(settings.appearanceThemes.themes[0], factory); assert.equal(plugin.isAppearanceOwnerCurrent(owner), false);
  assert.deepEqual(themeModel.captureThemeAppearance(settings), settings.appearanceThemes.themes[1].appearance);
  await plugin.updateAppearanceThemes({kind: "select", id: "default"});
  await plugin.updateStyleSettings(draft => {draft.baseNodeStyle.fontSize = 25;});
  assert.equal(settings.appearanceThemes.themes[2].name, "Custom theme 2"); assert.deepEqual(settings.appearanceThemes.themes[0], factory);
}));

test("metadata-only theme operations cause zero graph refresh; active deletion and fallback share one durable snapshot", async () => withThemeWindow(async () => {
  const {plugin, settings, saves, calls} = await themeFixture(), before = structuredClone(settings.appearanceThemes);
  let notifications = 0; plugin.subscribeAppearanceThemes(() => notifications++);
  await plugin.updateAppearanceThemes({kind: "rename", id: "native-base", name: "Renamed"});
  await plugin.updateAppearanceThemes({kind: "delete", id: "native-base"});
  assert.deepEqual(calls, {presentation: 0, semantic: 0, invalidation: 0}); assert.equal(notifications, 2);
  assert.equal(settings.appearanceThemes.selectedId, "user"); assert.deepEqual(settings.appearanceThemes.themes[0], before.themes[0]);
  const write = plugin.saveData, exact = structuredClone(settings); plugin.saveData = async () => {throw Error("Expected deletion storage failure");};
  await assert.rejects(plugin.updateAppearanceThemes({kind: "delete", id: "user"}), /deletion storage/); assert.deepEqual(settings, exact);
  plugin.saveData = write; const count = saves.length; await plugin.updateAppearanceThemes({kind: "delete", id: "user"});
  assert.equal(saves.length, count + 1); assert.equal(saves.at(-1).appearanceThemes.selectedId, "default"); assert.equal(saves.at(-1).backgroundColor, undefined);
  assert.equal(settings.appearanceThemes.selectedId, "default"); assert.equal(settings.backgroundColor, undefined);
  await assert.rejects(plugin.updateAppearanceThemes({kind: "delete", id: "default"}));
  await assert.rejects(plugin.updateAppearanceThemes({kind: "rename", id: "default", name: "Overwrite"}));
  await assert.rejects(plugin.resetAppearanceThemeColors("all")); assert.equal(calls.semantic, 0);
}));

test("A→B→A never revives old drafts; accepted queued writes finish before selection and behind-switch stale writes reject", async () => withThemeWindow(async () => {
  const {plugin, settings, saves} = await themeFixture(), old = plugin.captureAppearanceOwner();
  await plugin.updateAppearanceThemes({kind: "select", id: "native-base"}); await plugin.updateAppearanceThemes({kind: "select", id: "user"});
  const count = saves.length; await assert.rejects(plugin.updateStyleSettings(draft => {draft.backgroundColor = "#ff0000";}, old), /earlier theme activation/); assert.equal(saves.length, count);
  const disk = deferred(), write = plugin.saveData; let first = true;
  plugin.saveData = async snapshot => {if (first) {first = false; await disk.promise;} await write(snapshot);};
  const owner = plugin.captureAppearanceOwner();
  const accepted = plugin.updateStyleSettings(draft => {draft.backgroundColor = "#11223380";}, owner);
  const selection = plugin.updateAppearanceThemes({kind: "select", id: "native-base"}, owner);
  const behind = plugin.updateStyleSettings(draft => {draft.backgroundColor = "#445566";}, owner);
  const rejected = assert.rejects(behind, /earlier theme activation/); await new Promise(resolve => setImmediate(resolve));
  assert.equal(settings.appearanceThemes.selectedId, "user"); disk.resolve(); await Promise.all([accepted, selection, rejected]);
  assert.equal(settings.appearanceThemes.selectedId, "native-base"); assert.equal(settings.backgroundColor, undefined);
  assert.equal(settings.appearanceThemes.themes.find(theme => theme.id === "user").appearance.base.backgroundColor, "#11223380");
}));

test("theme-owned concurrent edits merge fields and lens colors never carry lens behavior or recreate a deleted lens", async () => withThemeWindow(async () => {
  const {plugin, settings, saves, calls} = await themeFixture({graphLenses: [{id: "lens", name: "Global", enabled: false, expression: 'node.kind == "file"', scope: "node", mode: "style", style: {node: {textColor: "#ff0000", strokeWidth: 3}}}]});
  const owner = plugin.captureAppearanceOwner(); await Promise.all([
    plugin.updateStyleSettings(draft => {draft.noteTypeStyles.Project = {fontSize: 23};}, owner),
    plugin.updateStyleSettings(draft => {draft.baseNodeStyle.textColor = "#abcdef80";}, owner),
  ]);
  assert.equal(settings.noteTypeStyles.Project.fontSize, 23); assert.equal(settings.baseNodeStyle.textColor, "#abcdef80");
  assert.deepEqual(settings.appearanceThemes.themes[0].appearance, themeModel.captureThemeAppearance(settings));
  const behavior = structuredClone(settings.graphLenses[0]); await plugin.createAppearanceTheme("Factory copy", true);
  assert.equal(settings.graphLenses[0].expression, behavior.expression); assert.equal(settings.graphLenses[0].enabled, false); assert.equal(settings.graphLenses[0].style.node.strokeWidth, 3);
  assert.equal(settings.graphLenses[0].style.node.textColor, undefined);
  await plugin.setGraphLenses([]); await plugin.updateAppearanceThemes({kind: "select", id: "user"}); assert.deepEqual(settings.graphLenses, []);
  assert.equal(calls.semantic, 0); assert.equal(calls.invalidation, 0);
  assert.deepEqual(saves.at(-1).graphLenses, []);
}));

test("scoped theme resets persist inheritance with shared palette references intact, and compatibility saves synchronize their selected theme", async () => withThemeWindow(async () => {
 for (const scope of ['base','semantic','all']) {
  const raw={standardStyleDefaults:'native',backgroundColor:{kind:'palette',id:'shared'},baseNodeStyle:{textColor:{kind:'theme',variable:'--kplex-semantic-origin'},fontSize:25},
   noteTypeStyles:{Project:{textColor:{kind:'palette',id:'shared'},icon:'star',fontSize:23}},tagNodeStyles:{'#z':{backgroundColor:'#112233',shape:'diamond'}},tagStyleList:['#z'],hierarchyLinkStyles:{Parent:{strokeColor:'#123456',strokeWidth:3}},
   colorPreferences:{version:1,palette:[{id:'shared',name:'Shared',light:'#11223380',dark:'#abcdef40'}],semantic:{origin:{kind:'palette',id:'shared'}},compass:{enabled:true,intensity:11,fills:{north:{kind:'palette',id:'shared'}}}},
   graphLenses:[{id:'lens',name:'Global',enabled:false,expression:'node.kind == "note"',scope:'node',mode:'style',style:{node:{textColor:{kind:'palette',id:'shared'},strokeWidth:3}}}]};
  const {plugin,settings,saves,calls}=await themeFixture(raw),other=structuredClone(settings.appearanceThemes.themes[1]);
  await plugin.resetAppearanceThemeColors(scope);assert.deepEqual(settings.appearanceThemes.themes[1],other);assert.equal(settings.colorPreferences.palette.length,1);
  assert.equal(settings.baseNodeStyle.fontSize,25);assert.equal(settings.noteTypeStyles.Project.icon,'star');assert.equal(settings.hierarchyLinkStyles.Parent.strokeWidth,3);assert.deepEqual(settings.tagStyleList,['#z']);assert.equal(settings.colorPreferences.compass.intensity,11);assert.equal(settings.colorPreferences.compass.enabled,true);
  assert.equal(settings.graphLenses[0].enabled,false);assert.equal(settings.graphLenses[0].style.node.strokeWidth,3);
  if(scope==='semantic'){assert.deepEqual(settings.baseNodeStyle.textColor,{kind:'theme',variable:'--kplex-semantic-origin'});assert.deepEqual(settings.backgroundColor,{kind:'palette',id:'shared'})}else assert.equal(settings.backgroundColor,undefined);
  if(scope==='base'){assert.deepEqual(settings.noteTypeStyles.Project.textColor,{kind:'palette',id:'shared'});assert(settings.colorPreferences.compass.fills.north)}else{assert.equal(settings.noteTypeStyles.Project.textColor,undefined);assert.deepEqual(settings.colorPreferences.semantic,{});assert.deepEqual(settings.colorPreferences.compass.fills,{})}
  assert.deepEqual(themeModel.captureThemeAppearance(migrateAndMergeSettings(saves.at(-1))),themeModel.captureThemeAppearance(settings));assert.equal(calls.semantic,0);
  settings.baseNodeStyle.fontSize=27;await plugin.saveSettings();assert.equal(settings.appearanceThemes.themes[0].appearance.base.baseNodeStyle.fontSize,27);assert.equal(saves.at(-1).appearanceThemes.themes[0].appearance.base.baseNodeStyle.fontSize,27);assert.equal(calls.semantic,0);
 }
}));

test("future colors/libraries remain raw and never become authentic migration backups; legacy imports synchronize active appearance", async () => withThemeWindow(async () => {
  for (const raw of [{colorPreferences: {version: 99, payload: "future"}}, {appearanceThemes: {version: 99, payload: "future-library"}}]) {
    const {plugin, settings, saves} = await themeFixture(raw);
    assert.equal(settings.appearanceThemes, undefined); assert.equal(saves[0].appearanceThemesFuture, undefined);
    if (raw.colorPreferences) assert.deepEqual(saves[0].colorPreferences, raw.colorPreferences);
    else {assert.deepEqual(saves[0].appearanceThemes, raw.appearanceThemes); await assert.rejects(plugin.updateStyleSettings(draft => {draft.backgroundColor = "#123456";}), /read-only/);}
  }
  const {plugin, settings, saves} = await themeFixture(), before = structuredClone(settings.appearanceThemes);
  const write = plugin.saveData; plugin.saveData = async () => {throw Error("Expected import storage failure");}; const exact = structuredClone(settings);
  await assert.rejects(plugin.importLegacyAppearance(fixture), /import storage/); assert.deepEqual(settings, exact);
  plugin.saveData = write; await plugin.importLegacyAppearance(fixture);
  assert.equal(settings.appearanceThemes.selectedId, "user"); assert.deepEqual(settings.appearanceThemes.themes[0].appearance, themeModel.captureThemeAppearance(settings));
  assert.deepEqual(settings.appearanceThemes.themes.slice(1), before.themes.slice(1));
  assert.deepEqual(migrateAndMergeSettings(JSON.parse(JSON.stringify(saves.at(-1)))).appearanceThemes, settings.appearanceThemes);
}));

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

/** Physical-file cleanup defaults preserve existing behavior, while foreign imports retain the local workflow preference. */
test("automatic ontology cleanup migrates, persists and stays local during foreign import", async () => {
  assert.equal(defaults.removeOntologyLinksOnDelete, true);
  const off = migrateAndMergeSettings({ removeOntologyLinksOnDelete: false });
  assert.equal(migrateAndMergeSettings(JSON.parse(JSON.stringify(off))).removeOntologyLinksOnDelete, false);
  assert.equal(importExcaliBrainGraphSettings({ ...fixture, removeOntologyLinksOnDelete: true }, off).removeOntologyLinksOnDelete, false);
  const saves = [];
  const plugin = { settings: structuredClone(defaults), saveSettings: async (...args) => { saves.push(args); } };
  await new KplexSettingTab({}, plugin).setControlValue("removeOntologyLinksOnDelete", false);
  assert.equal(plugin.settings.removeOntologyLinksOnDelete, false);
  assert.deepEqual(saves, [[false, false]], "Workflow preference does not request semantic reconstruction");
});

test("remote node image consent is explicit, durable and independent of foreign graph settings", /** Only boolean true grants permission; no semantic signature changes. */ () => {
  for (const value of [undefined, null, false, "true", "false", 1, {}, []]) {
    assert.equal(migrateAndMergeSettings({ allowRemoteNodeImages: value }).allowRemoteNodeImages, false);
  }
  assert.equal(defaults.allowRemoteNodeImages, false);
  const consent = migrateAndMergeSettings({ ...defaults, allowRemoteNodeImages: true });
  assert.equal(migrateAndMergeSettings(JSON.parse(JSON.stringify(consent))).allowRemoteNodeImages, true);
  assert.equal(importExcaliBrainGraphSettings({ ...fixture, allowRemoteNodeImages: true }, defaults).allowRemoteNodeImages, false);
  assert.equal(importExcaliBrainGraphSettings(fixture, consent).allowRemoteNodeImages, true);
  assert.deepEqual(classifySettingsChange(captureSettingsPolicy(defaults), captureSettingsPolicy(consent)), {
    semanticInvalidation: false, presentationFacets: false, searchTerms: false,
    nodeVisuals: true, render: true, typographyOnly: false, paintOnly: false, changedKeys: ["allowRemoteNodeImages"],
  });
  assert.equal(encodeIndexSettingsSignature(consent), encodeIndexSettingsSignature(defaults));
  const plugin = { manifest: { id: "k-plex" }, settings: structuredClone(defaults),
    translator: createObsidianTranslator(), index: { unassignedOntologyFields: () => [], allPages: () => [] } };
  const tab = new KplexSettingTab({}, plugin);
  /** Flatten existing declarative pages/groups without emulating native controls. */
  const rows = items => items.flatMap(item => [item, ...rows(item.items ?? [])]);
  const row = rows(tab.getSettingDefinitions()).find(item => item.control?.key === "allowRemoteNodeImages");
  assert.equal(row?.control?.type, "toggle");
  assert.equal(row?.name, "Allow remote node images");
  assert.match(row?.desc ?? "", /contacts their host/);
});

test("cross-link visibility persists across reload and uses a presentation-only Plex settings toggle", async () => {
  assert.equal(defaults.showCrossLinks, false, "fresh and unspecified settings retain the committed 0.1.2 disabled default");
  assert.equal(migrateAndMergeSettings({ showCrossLinks: "invalid" }).showCrossLinks, false);
  const saves = [];
  const plugin = { manifest: { id: "k-plex" }, settings: structuredClone(defaults),
    saveSettings: async (...args) => { saves.push(args); },
    index: { unassignedOntologyFields: () => [], allPages: () => [] } };
  plugin.translator = createObsidianTranslator();
  const tab = new KplexSettingTab({}, plugin);
  const page = tab.getSettingDefinitions().find(item => item.name === "Canvas behavior");
  const row = page.items.flatMap(group => group.items ?? []).find(item => item.control?.key === "showCrossLinks");
  assert.equal(row.name, "Show cross-links");
  assert.equal(row.control.type, "toggle");
  await tab.setControlValue("showCrossLinks", true);
  assert.deepEqual(saves, [[]]);
  const restored = migrateAndMergeSettings(JSON.parse(JSON.stringify(plugin.settings)));
  assert.equal(restored.showCrossLinks, true, "enabled visibility survives serialization and reload");
  assert.equal(migrateAndMergeSettings(JSON.parse(JSON.stringify({ showCrossLinks: false }))).showCrossLinks, false,
    "explicitly disabled visibility also survives serialization and reload");
  assert.equal(migrateAndMergeSettings({ showCrossLinks: true }).showCrossLinks, true);
  assert.equal(importExcaliBrainGraphSettings({ ...fixture, showCrossLinks: false }, restored).showCrossLinks, true,
    "foreign imports preserve the local preference");
  assert.deepEqual(classifySettingsChange(captureSettingsPolicy(defaults), captureSettingsPolicy(restored)), {
    semanticInvalidation: false, presentationFacets: false, searchTerms: false,
    nodeVisuals: false, render: true, typographyOnly: false, paintOnly: false, changedKeys: ["showCrossLinks"],
  });
  assert.equal(encodeIndexSettingsSignature(restored), encodeIndexSettingsSignature(defaults));
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
  const faster = migrateAndMergeSettings({ ...defaults, indexingThrottle: "faster" });
  assert.deepEqual(classifySettingsChange(before, captureSettingsPolicy(faster)), {
    semanticInvalidation: false, presentationFacets: false, searchTerms: false,
    nodeVisuals: false, render: false, typographyOnly: false, paintOnly: false, changedKeys: [],
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
  for (const [suffix,mode] of [["Desktop","on-demand"],["Tablet","eager"],["Mobile","eager"]]) {
    const modeKey="indexingMode"+suffix, startupKey="indexBeforeView"+suffix;
    assert(flatten(indexingPage.items).some(item=>item.control?.key===modeKey),"Every device has a native mode control");
    assert(flatten(indexingPage.items).some(item=>item.control?.key===startupKey),"Every device has a native startup control");
    await tab.setControlValue(modeKey,mode);await tab.setControlValue(startupKey,suffix!=="Desktop");
    assert.equal(plugin.settings[modeKey],mode);assert.equal(plugin.settings[startupKey],suffix!=="Desktop");
  }
  assert(!flatten(indexingPage.items).some(item=>item.control?.key==="indexingMode"||item.control?.key==="urlIndexingMode"),"Retired global and URL selectors stay absent");
  assert.deepEqual(saves, Array.from({length:6},()=>[false,false]), "restart-only settings must not schedule live rebuilds");
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
  assert(main.includes("importExcaliBrainGraphSettings(options.legacyImport, source)"));
  assert(main.includes("{legacyImport: legacySettings}"), "First-run import uses that same queued allowlist");
  assert(settings.includes("this.plugin.importLegacyAppearance(parsed, this.openingOwner)"), "File import keeps its opening theme and delegates the same queued allowlist");
  assert(main.includes("migrateAndMergeSettings(ownData)"), "Own K-Plex settings must not be filtered as foreign data");
});

test("central editor stays opt-in while its local mode defaults safely", () => {
  assert.equal(migrated.embedCentralNode, false, "legacy ExcaliBrain embed preference must not enable K-Plex editor mode by default");
  assert.equal(migrated.centralNodeMarkdownMode, "source");
  assert.equal(migrateAndMergeSettings({ ...fixture, centralNodeMarkdownMode: "preview" }).centralNodeMarkdownMode, "preview");
  assert.equal(migrateAndMergeSettings({ ...fixture, centralNodeMarkdownMode: "invalid" }).centralNodeMarkdownMode, "source");
  assert.equal(migrateAndMergeSettings({ ...fixture, kplexInitialized: true, embedCentralNode: true }).embedCentralNode, true, "initialized K-Plex vaults preserve the user's editor toggle");
});

test("per-note Markdown zoom preferences reload and remain independent of foreign imports and graph policy", /** Sparse local workflow choices have no semantic/presentation/index signature effects. */ () => {
  assert.deepEqual(defaults.centralNodeMarkdownZoomModes, {});
  const local = migrateAndMergeSettings({ ...defaults, centralNodeMarkdownZoomModes: { "Local.md": "scale", "Fixed.md": "fixed", "Bad.md": true } });
  assert.deepEqual(local.centralNodeMarkdownZoomModes, { "Local.md": "scale" });
  assert.deepEqual(migrateAndMergeSettings(JSON.parse(JSON.stringify(local))).centralNodeMarkdownZoomModes, { "Local.md": "scale" });
  assert.deepEqual(importExcaliBrainGraphSettings({ ...fixture, centralNodeMarkdownZoomModes: { "Foreign.md": "scale" } }, local).centralNodeMarkdownZoomModes, { "Local.md": "scale" });
  assert.deepEqual(classifySettingsChange(captureSettingsPolicy(defaults), captureSettingsPolicy(local)), {
    semanticInvalidation: false, presentationFacets: false, searchTerms: false, nodeVisuals: false,
    render: false, typographyOnly: false, paintOnly: false, changedKeys: [],
  });
  assert.equal(encodeIndexSettingsSignature(local), encodeIndexSettingsSignature(defaults));
});

test("editor drawing-fit override defaults on and preserves explicit saved choices", /** Local compatibility policy is Boolean, reload-safe and unrelated to legacy graph preferences. */ () => {
  assert.equal(migrateAndMergeSettings({}).excalidrawFitOnNodeOpen, true);
  assert.equal(migrateAndMergeSettings({ excalidrawFitOnNodeOpen: false }).excalidrawFitOnNodeOpen, false);
  assert.equal(migrateAndMergeSettings({ excalidrawFitOnNodeOpen: true }).excalidrawFitOnNodeOpen, true);
  assert.equal(migrateAndMergeSettings({ excalidrawFitOnNodeOpen: "false" }).excalidrawFitOnNodeOpen, true);
  const saved = migrateAndMergeSettings({ kplexInitialized: true, excalidrawFitOnNodeOpen: false });
  assert.equal(migrateAndMergeSettings(JSON.parse(JSON.stringify(saved))).excalidrawFitOnNodeOpen, false);
  assert.equal(importExcaliBrainGraphSettings(fixture, saved).excalidrawFitOnNodeOpen, false);
  assert.deepEqual(classifySettingsChange(captureSettingsPolicy(saved), captureSettingsPolicy({ ...saved, excalidrawFitOnNodeOpen: true })), {
    semanticInvalidation: false, presentationFacets: false, searchTerms: false, nodeVisuals: false,
    render: false, typographyOnly: false, paintOnly: false, changedKeys: [],
  }, "opening-only preference must not trigger source/index recanonicalization");
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
  const plugin = Object.assign(new StyleSettingsHost(), { settings, settingsWriteQueue: Promise.resolve(), savedSettingsPolicy: captureSettingsPolicy(settings),
    saveData: async snapshot => { saves.push(structuredClone(snapshot)); }, index: { subscribePresentation: () => () => {}, refreshPresentationSettings: async () => {}, refreshSemanticSettings: async () => { throw new Error("Style-only save acquired semantics"); }, allPages: () => [
    { noteType: "Project", tags: ["#project/active", "project/backlog"] },
    { noteType: "Person", tags: ["#person"] },
  ] } });
  plugin.translator = createObsidianTranslator();
  const tab = new KplexSettingTab({}, plugin);
  tab.update = () => {};
  return { tab, settings, saves, plugin };
}

/** Mount the real modal logic with timers isolated to this form-shell test, never native acceptance. */
function openStyle(tab, kind, name = null) {
  const priorWindow = globalThis.window;
  try {
    globalThis.window = { setTimeout(callback) { callback(); return 0; }, clearTimeout() {} };
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
  icon.value = "briefcase"; assert.equal(byLabel("Background").tag, "button");
  byLabel("Font size").value = "23"; await activate(byLabel("Font size"), "input");
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
  assert.equal(settings.tagNodeStyles["#project/backlog"].backgroundColor, undefined, "Opening the source action never manufactures an override");
  assert.equal(settings.tagNodeStyles["#project/backlog"].fontSize, 23);
  const effective = resolveNodeStyle({ primaryStyleTag: "#project/backlog/task", styleTags: [], file: { extension: "md" }, noteType: null }, null, "center", settings);
  assert.equal(effective.icon, "briefcase"); assert.equal(effective.backgroundColor, undefined);
  assert.equal(suggest.closed, true);
  assert.equal(saves.length, 1);
  assert.match(elements.find(element => element.tag === "p").text, /primary style tag/);
});


test("style editor controls expose visible linked descriptions and type switches never change existing keys", async () => {
  const { tab, settings } = styleEditorFixture();
  const modal = openStyle(tab, "property"); const elements = formElements(modal);
  for (const control of elements.filter(element => ["input", "select"].includes(element.tag))) {
    if (control.type === "range") {
      assert(control.attrs["aria-label"]?.trim(), "Native dimension sliders need accessible names");
      assert(control.attrs["aria-valuetext"]?.trim(), "Native dimension sliders expose their visible value");
      assert(control.parent.children.some(element => element.tag === "output" && element.text.trim()));
      assert.equal(control.attrs.title, undefined);
      continue;
    }
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
  assert.equal(saves.length, 2);
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
  assert.equal(saves.length, 4);
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
  assert.equal(saves.length, 3);
});


/** Hold the real storage/refresh await boundary without changing the production operation. */
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

test("style save excludes duplicate submissions and Cancel/Escape until persistence; unrelated preferences survive", async () => {
  const { tab, settings, plugin, saves } = styleEditorFixture();
  const disk = deferred(); plugin.saveData = async snapshot => { saves.push(structuredClone(snapshot)); await disk.promise; };
  const modal = openStyle(tab, "property"); const elements = formElements(modal);
  const name = elements.find(e => e.attrs["aria-label"] === "Note type"); name.value = "Project";
  const save = elements.find(e => e.text === "Save");
  await activate(save); await activate(save); await activate(elements.find(e => e.text === "Cancel")); modal.close();
  assert.equal(saves.length, 1); assert.equal(modal.closed, undefined); assert.equal(modal.modalEl.attrs["aria-busy"], "true");
  assert(elements.filter(e => ["input", "select", "button"].includes(e.tag)).every(e => e.disabled));
  assert.equal(settings.noteTypeStyles.Project, undefined, "Pending draft must not appear committed");
  settings.backgroundColor = "#123456ff";
  disk.resolve(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(modal.closed, true); assert(settings.noteTypeStyles.Project);
  assert.equal(settings.backgroundColor, "#123456ff", "Never replace the whole settings snapshot");
});

test("failed style disk write keeps memory and policy unchanged, preserves the draft and permits one safe retry", async () => {
  const { tab, settings, plugin, saves } = styleEditorFixture(); const policy = plugin.savedSettingsPolicy;
  let calls = 0; plugin.saveData = async snapshot => { if (++calls === 1) throw new Error("Expected storage failure"); saves.push(structuredClone(snapshot)); };
  const modal = openStyle(tab, "tag"); const elements = formElements(modal);
  const name = elements.find(e => e.attrs["aria-label"] === "Tag"); name.value = "project";
  const save = elements.find(e => e.text === "Save"); await activate(save);
  assert.deepEqual(settings.tagNodeStyles, {}); assert.deepEqual(settings.tagStyleList, []); assert.equal(plugin.savedSettingsPolicy, policy);
  assert.equal(modal.closed, undefined); assert.equal(save.disabled, false); assert.equal(name.value, "project");
  assert.match(elements.find(e => e.attrs.role === "status").text, /Not saved.*draft is kept/);
  await activate(save); assert.equal(modal.closed, true); assert.equal(calls, 2); assert.equal(saves.length, 1);
  assert.deepEqual(settings.tagStyleList, ["#project"]); assert(settings.tagNodeStyles["#project"]);
});

test("durable style refresh failure and thrown manager callback close with truthful saved feedback", async () => {
  for (const failure of ["presentation", "manager", "settings"]) {
    const { tab, settings, plugin, saves } = styleEditorFixture(); TestNotice.messages.length = 0;
    if (failure === "presentation") plugin.index.refreshPresentationSettings = async () => { throw new Error("Expected presentation failure"); };
    if (failure === "settings") tab.update = () => { throw new Error("Expected settings failure"); };
    const priorWindow = globalThis.window;
    try { globalThis.window = { setTimeout: fn => { fn(); return 0; }, clearTimeout() {} }; tab.openNodeStyleEditor("property", null,
      /** The real manager callback may throw after the successful disk commit. */ () => { if (failure === "manager") throw new Error("Expected manager failure"); });
    } finally { globalThis.window = priorWindow; }
    const modal = TestModal.latest, elements = formElements(modal); elements.find(e => e.attrs["aria-label"] === "Note type").value = "Saved";
    await activate(elements.find(e => e.text === "Save"));
    assert.equal(saves.length, 1); assert(settings.noteTypeStyles.Saved); assert.equal(modal.closed, true);
    assert.equal(TestNotice.messages.length, 1); assert.match(TestNotice.messages[0], /Style saved/);
  }
});

test("external teardown retires completion before a replacement editor opens", async () => {
  const { tab, plugin, settings } = styleEditorFixture(); const disk = deferred(); let refreshes = 0;
  plugin.saveData = async () => disk.promise; tab.update = () => { refreshes++; };
  const old = openStyle(tab, "property"), elements = formElements(old); elements.find(e => e.attrs["aria-label"] === "Note type").value = "Old";
  await activate(elements.find(e => e.text === "Save")); old.onClose();
  const replacement = openStyle(tab, "tag"); disk.resolve(); await new Promise(resolve => setImmediate(resolve));
  assert(settings.noteTypeStyles.Old, "An external teardown cannot cancel an already submitted write");
  assert.equal(refreshes, 0); assert.equal(replacement.closed, undefined); assert.equal(replacement.modalEl.attrs["aria-busy"], "false");
});

test("a native close failure after persistence remains saved and cannot submit twice", async () => {
  const { tab, settings, saves } = styleEditorFixture(); const modal = openStyle(tab, "property"), elements = formElements(modal);
  elements.find(e => e.attrs["aria-label"] === "Note type").value = "Durable";
  const close = modal.close; modal.close = () => { throw new Error("Expected native close failure"); };
  const save = elements.find(e => e.text === "Save"); await activate(save);
  assert(settings.noteTypeStyles.Durable); assert.equal(saves.length, 1); assert.equal(save.disabled, true);
  assert.match(elements.find(e => e.attrs.role === "status").text, /Style saved/);
  await activate(save); assert.equal(saves.length, 1, "Even programmatic redelivery cannot repeat a committed effect");
  modal.close = close; const dismiss = elements.find(e => e.text === "Close"); assert.equal(dismiss.disabled, false); await activate(dismiss); assert.equal(modal.closed, true);
});

test("unchanged source actions preserve imported literal spelling, alpha and absent appearance fields", async () => {
  const { tab, settings } = styleEditorFixture(); settings.noteTypeStyles.Alpha = { backgroundColor: "#AABBCC80", textColor: "#FFEEDD66", borderColor: "#11223344" };
  const modal = openStyle(tab, "property", "Alpha"), elements = formElements(modal);
  assert.equal(elements.find(e => e.attrs["aria-label"] === "Background").tag, "button");
  assert.equal(elements.find(e => e.attrs["aria-label"] === "Text").text, "#FFEEDD66");
  await activate(elements.find(e => e.text === "Save"));
  assert.equal(settings.noteTypeStyles.Alpha.backgroundColor, "#AABBCC80");
  assert.equal(settings.noteTypeStyles.Alpha.textColor, "#FFEEDD66");
  assert.equal(settings.noteTypeStyles.Alpha.borderColor, "#11223344");
  assert.equal(settings.noteTypeStyles.Alpha.fontSize, undefined); assert.equal(settings.noteTypeStyles.Alpha.prefix, undefined);
});

test("queued style editors merge latest committed families and preserve tag priority and action preferences", async () => {
  const { plugin, settings } = styleEditorFixture(); const disk = deferred(); const snapshots = []; let calls = 0;
  plugin.saveData = async snapshot => { snapshots.push(structuredClone(snapshot)); if (++calls === 1) await disk.promise; };
  const first = plugin.updateStyleSettings(draft => { draft.tagNodeStyles["legacy"] = { icon: "box" }; draft.tagStyleList.push("legacy"); });
  const second = plugin.updateStyleSettings(draft => { draft.noteTypeStyles.legacy = { icon: "info" }; draft.tagNodeStyles["#second"] = {}; draft.tagStyleList.push("#second"); });
  await new Promise(resolve => setImmediate(resolve)); settings.actionPreferences = { schema: 1, marker: "new workflow" }; disk.resolve(); await Promise.all([first, second]);
  assert.deepEqual(settings.tagStyleList, ["legacy", "#second"]); assert.equal(settings.noteTypeStyles.legacy.icon, "info");
  assert.equal(snapshots[1].tagNodeStyles.legacy.icon, "box"); assert.equal(snapshots[1].actionPreferences.marker, "new workflow");
  assert.equal(snapshots[1].actionPreferencesFuture, undefined);
});

test("own color identities, alpha and local palette survive reload and foreign graph import", /** Foreign appearance imports cannot replace local semantic pairs or tint preferences. */ () => {
  const colors = { version: 1, palette: [{ id: "stable-1", name: "Concept", light: "#abcdef00", dark: "rgba(3,4,5,.123456)" }],
    semantic: { origin: { kind: "palette", id: "stable-1" } }, compass: { enabled: true, intensity: 0, fills: {} } };
  const settings = migrateAndMergeSettings({ colorPreferences: colors, backgroundColor: { kind: "theme", variable: "--Custom-Canvas" },
    noteTypeStyles: { Project: { backgroundColor: { kind: "palette", id: "stable-1" }, textColor: "#AABBCC80" } },
    graphLenses: [{ id: "lens-1", name: "Test", enabled: true, scope: "node", mode: "style", expression: 'node.kind == "file"',
      style: { node: { borderColor: { kind: "theme", variable: "--Custom-Border" } } } }] });
  assert.deepEqual(migrateAndMergeSettings(JSON.parse(JSON.stringify(settings))), settings);
  assert.deepEqual(settings.noteTypeStyles.Project.backgroundColor, { kind: "palette", id: "stable-1" });
  assert.equal(settings.noteTypeStyles.Project.textColor, "#AABBCC80");
  assert.deepEqual(settings.graphLenses[0].style.node.borderColor, { kind: "theme", variable: "--Custom-Border" });
  const imported = importExcaliBrainGraphSettings({ colorPreferences: { version: 99 }, backgroundColor: "#11223344" }, settings);
  assert.deepEqual(imported.colorPreferences, colors); assert.equal(imported.backgroundColor, "#11223344");
});

test("palette and canvas edits share the latest queued appearance without clobbering unrelated writes", /** Hold real storage and prove that the next operation captures the preceding committed palette. */ async () => {
  const { plugin, settings } = styleEditorFixture(); const disk = deferred(); const snapshots = [];
  plugin.saveData = async snapshot => { snapshots.push(structuredClone(snapshot)); if (snapshots.length === 1) await disk.promise; };
  const first = plugin.updateStyleSettings(draft => {
    draft.colorPreferences.palette.push({ id: "stable-1", name: "First", light: "#12345600", dark: "#abcdef80" });
    draft.backgroundColor = { kind: "palette", id: "stable-1" };
  });
  const second = plugin.updateStyleSettings(draft => { draft.colorPreferences.palette[0].name = "Renamed"; draft.colorPreferences.compass.intensity = 0; });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(settings.colorPreferences.palette.length, 0);
  settings.lastActivePath = "Unrelated.md"; disk.resolve(); await Promise.all([first, second]);
  assert.equal(settings.colorPreferences.palette[0].name, "Renamed"); assert.equal(settings.colorPreferences.compass.intensity, 0);
  assert.deepEqual(settings.backgroundColor, { kind: "palette", id: "stable-1" }); assert.equal(settings.lastActivePath, "Unrelated.md");
  assert.equal(snapshots[1].lastActivePath, "Unrelated.md"); assert.equal(snapshots[1].colorPreferences.palette[0].name, "Renamed");
});

test("unsupported color data remains exact on ordinary writes and imports while palette editing is read-only", /** Test actual persistence, including a null payload and unknown future extensions. */ async () => {
  for (const raw of [null, { version: 12, palette: [{ futurePair: true }], extension: [1, 2, 3] }]) {
    const { plugin, settings, saves } = styleEditorFixture(migrateAndMergeSettings({ colorPreferences: raw }));
    await plugin.updateStyleSettings(draft => { draft.noteTypeStyles.Other = { icon: "box" }; });
    assert.deepEqual(saves[0].colorPreferences, raw); assert.equal(saves[0].colorPreferencesFuture, undefined);
    const imported = importExcaliBrainGraphSettings({ colorPreferences: { version: 1 } }, settings);
    assert.deepEqual(imported.colorPreferencesFuture, raw);
    await assert.rejects(plugin.updateStyleSettings(draft => { draft.colorPreferences.compass.enabled = true; }), /read-only/);
    assert.equal(saves.length, 1); assert.equal(settings.colorPreferences.compass.enabled, false);
  }
});

test("invalid palette drafts and semantic cycles never reach storage or replace committed state", /** Rejected appearance operations preserve the queue for a later valid retry. */ async () => {
  const { plugin, settings, saves } = styleEditorFixture(); const before = structuredClone(settings);
  await assert.rejects(plugin.updateStyleSettings(draft => { draft.colorPreferences.semantic.origin = { kind: "theme", variable: "--kplex-semantic-origin" }; }), /Invalid color/);
  await assert.rejects(plugin.updateStyleSettings(draft => { draft.colorPreferences.palette.push({ id: "bad", name: "Bad", light: "url(x)", dark: "#ffffff" }); }), /Invalid color/);
  assert.deepEqual(settings, before); assert.equal(saves.length, 0);
  await plugin.updateStyleSettings(draft => { draft.colorPreferences.compass.intensity = 0; });
  assert.equal(saves.length, 1); assert.equal(settings.colorPreferences.compass.intensity, 0);
});

test("delete failure never removes live style; retry removes only its fixed family and matching slots", async () => {
  const { plugin, tab, settings } = styleEditorFixture(); settings.tagNodeStyles.same = { icon: "box" }; settings.noteTypeStyles.same = { icon: "info" }; settings.tagStyleList = ["before", "same", "after", "same"];
  let fail = true; plugin.saveData = async () => { if (fail) throw new Error("Expected delete failure"); };
  const modal = openStyle(tab, "tag", "same"), remove = formElements(modal).find(e => e.text === "Delete"); await activate(remove);
  assert(settings.tagNodeStyles.same); assert.deepEqual(settings.tagStyleList, ["before", "same", "after", "same"]);
  assert.equal(formElements(modal).find(e => e.tag === "select").disabled, true, "Fixed family remains locked after failure");
  fail = false; await activate(remove); assert.equal(modal.closed, true); assert.equal(settings.tagNodeStyles.same, undefined);
  assert.equal(settings.noteTypeStyles.same.icon, "info"); assert.deepEqual(settings.tagStyleList, ["before", "after"]);
});

test("a later live priority edit wins its queued write without an older style draft restoring the list", async () => {
  const { plugin, settings, saves } = styleEditorFixture(); const disk = deferred(); let calls = 0;
  plugin.saveData = async snapshot => { saves.push(structuredClone(snapshot)); if (++calls === 1) await disk.promise; };
  const first = plugin.updateStyleSettings(draft => { draft.tagNodeStyles["#captured"] = {}; draft.tagStyleList.push("#captured"); });
  await new Promise(resolve => setImmediate(resolve)); settings.tagStyleList = ["#new-priority"];
  const later = plugin.saveSettings(false, false); disk.resolve(); await Promise.all([first, later]);
  assert.deepEqual(settings.tagStyleList, ["#new-priority"]); assert.deepEqual(saves.at(-1).tagStyleList, ["#new-priority"]);
  assert(settings.tagNodeStyles["#captured"], "Unchanged family still receives its earlier durable style commit");
});

test("a later settings import cannot be overwritten by an older pending style dictionary", async () => {
  const { plugin, settings, saves } = styleEditorFixture(); const disk = deferred(); let calls = 0;
  plugin.saveData = async snapshot => { saves.push(structuredClone(snapshot)); if (++calls === 1) await disk.promise; };
  const first = plugin.updateStyleSettings(draft => { draft.noteTypeStyles.Older = { icon: "box" }; });
  await new Promise(resolve => setImmediate(resolve)); const replacement = structuredClone(settings); replacement.noteTypeStyles = { Imported: { icon: "info" } };
  plugin.settings = replacement; const later = plugin.saveSettings(false, false); disk.resolve(); await Promise.all([first, later]);
  assert.deepEqual(replacement.noteTypeStyles, { Imported: { icon: "info" } }); assert.deepEqual(saves.at(-1).noteTypeStyles, replacement.noteTypeStyles);
  assert.deepEqual(settings.noteTypeStyles, {}, "Never publish the commit back into a retired settings object");
});

test("style persistence preserves future action preferences and immediate remote-image revocation across overlapping saves", async () => {
  const base = structuredClone(defaults); base.allowRemoteNodeImages = true; base.actionPreferencesFuture = { schema: 900, marker: "preserved future" };
  const { plugin, settings, saves } = styleEditorFixture(base); const disk = deferred(); let calls = 0, revocations = 0, notifications = 0;
  plugin.index.invalidateNodeVisuals = () => { revocations++; }; plugin.index.notifyPresentation = () => { notifications++; };
  plugin.saveData = async snapshot => { saves.push(structuredClone(snapshot)); if (++calls === 1) await disk.promise; };
  const style = plugin.updateStyleSettings(draft => { draft.noteTypeStyles.Project = {}; }); await new Promise(resolve => setImmediate(resolve));
  settings.allowRemoteNodeImages = false; const consent = plugin.saveSettings(false, false);
  assert.equal(revocations, 1); assert.equal(notifications, 1); assert.equal(settings.allowRemoteNodeImages, false);
  disk.resolve(); await Promise.all([style, consent]);
  assert.equal(saves.at(-1).allowRemoteNodeImages, false); assert.deepEqual(saves.at(-1).actionPreferences, base.actionPreferencesFuture);
  assert.equal(saves.at(-1).actionPreferencesFuture, undefined); assert(settings.noteTypeStyles.Project);
});

test("mutating an existing queued appearance draft cannot leak into memory after a rejected write", async () => {
  const { plugin, settings } = styleEditorFixture(); settings.noteTypeStyles.Existing = { icon: "box" };
  plugin.saveData = async () => { throw new Error("Expected draft storage rejection"); };
  await assert.rejects(plugin.updateStyleSettings(draft => { draft.noteTypeStyles.Existing.icon = "info"; }), /Expected draft storage rejection/);
  assert.equal(settings.noteTypeStyles.Existing.icon, "box");
});

test("a publication exception after storage is a saved recovery outcome, never a rejected retry", async () => {
  const { plugin, settings, saves } = styleEditorFixture();
  plugin.saveData = async snapshot => { saves.push(structuredClone(snapshot)); Object.freeze(settings); };
  assert.deepEqual(await plugin.updateStyleSettings(draft => { draft.noteTypeStyles.Durable = {}; }), { refreshPending: true });
  assert(saves[0].noteTypeStyles.Durable); assert.equal(settings.noteTypeStyles.Durable, undefined);
});

test("Cancel before submission has no durable or live style effects", async () => {
  const { tab, settings, saves } = styleEditorFixture(); const modal = openStyle(tab, "property");
  await activate(formElements(modal).find(e => e.text === "Cancel")); assert.equal(modal.closed, true); assert.deepEqual(settings.noteTypeStyles, {}); assert.equal(saves.length, 0);
});

test("relationship style Save/Reset use the same duplicate and failure contract", async () => {
  const { tab, plugin, settings, saves } = styleEditorFixture(); settings.hierarchyLinkStyles.parent = { strokeWidth: 3 };
  const disk = deferred(); plugin.saveData = async snapshot => { saves.push(structuredClone(snapshot)); await disk.promise; };
  tab.openOntologyLinkStyleEditor("Parent"); const modal = TestModal.latest, elements = formElements(modal), reset = elements.find(e => e.text === "Reset");
  assert(reset); await activate(reset); await activate(reset); assert.equal(saves.length, 1); assert.equal(settings.hierarchyLinkStyles.parent.strokeWidth, 3);
  disk.resolve(); await new Promise(resolve => setImmediate(resolve)); assert.equal(modal.closed, true); assert.equal(settings.hierarchyLinkStyles.parent, undefined);
});

test("compatibility saves persist a replaced coherent theme snapshot instead of treating it as an unchanged editor draft", async () => withThemeWindow(async () => {
  const {plugin, saves, calls} = await themeFixture({baseNodeStyle: {fontSize: 23}});
  const original = structuredClone(plugin.settings);
  await plugin.updateStyleSettings(draft => {draft.baseNodeStyle.fontSize = 31;});
  assert.equal(saves.at(-1).baseNodeStyle.fontSize, 31);
  plugin.settings = structuredClone(original);
  const before = saves.length;
  await plugin.saveSettings(false);
  assert.equal(saves.length, before + 1, "An imperative replacement owns a disk write even when its supplied library already matches");
  assert.equal(saves.at(-1).baseNodeStyle.fontSize, 23);
  assert.deepEqual(themeModel.captureThemeAppearance(migrateAndMergeSettings(saves.at(-1))), themeModel.captureThemeAppearance(original));
  await plugin.updateStyleSettings(() => {});
  assert.equal(saves.length, before + 1, "Unchanged ordinary editor saves remain no-ops");
  assert.equal(calls.semantic, 0);
}));

test("a rejected imperative appearance save can retry without persisting an old selected-theme snapshot", async () => withThemeWindow(async () => {
  const {plugin, saves} = await themeFixture({baseNodeStyle: {fontSize: 23}});
  const saveData = plugin.saveData;
  plugin.settings.baseNodeStyle.fontSize = 31;
  plugin.saveData = async () => {throw Error("Expected compatibility storage fault");};
  await assert.rejects(plugin.saveSettings(false, false), /compatibility storage fault/);
  assert.equal(saves.at(-1).baseNodeStyle.fontSize, 23);
  plugin.saveData = saveData;
  await plugin.saveSettings(false, false);
  assert.equal(saves.at(-1).baseNodeStyle.fontSize, 31);
  assert.equal(saves.at(-1).appearanceThemes.themes[0].appearance.base.baseNodeStyle.fontSize, 31);
  assert.equal(migrateAndMergeSettings(saves.at(-1)).baseNodeStyle.fontSize, 31, "Restart must preserve the successfully retried edit");
}));

test("an older rejected compatibility write cannot rewind a newer pending save's policy or theme appearance", async () => withThemeWindow(async () => {
  const {plugin, saves} = await themeFixture({baseNodeStyle: {fontSize: 23}}), originalSave = plugin.saveData;
  let rejectOlder, releaseNewer, calls = 0;
  plugin.saveData = async snapshot => {
    const call = ++calls;
    if (call === 1) await new Promise((resolve, reject) => {rejectOlder = reject;});
    else await new Promise(resolve => {releaseNewer = resolve;});
    await originalSave(snapshot);
  };
  plugin.settings.baseNodeStyle.fontSize = 31;
  const older = plugin.saveSettings(false, false), rejected = assert.rejects(older, /older compatibility fault/);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(typeof rejectOlder, "function", "First queued write must reach its held storage boundary");
  plugin.settings.baseNodeStyle.fontSize = 32;
  const newer = plugin.saveSettings(false, false), newerPolicy = plugin.savedSettingsPolicy;
  rejectOlder(Error("Expected older compatibility fault")); await rejected;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(typeof releaseNewer, "function", "Second write must continue after the older rejection");
  assert.equal(plugin.savedSettingsPolicy, newerPolicy, "An older failure must not undo a newer pending policy");
  releaseNewer(); await newer;
  assert.equal(saves.at(-1).baseNodeStyle.fontSize, 32);
  assert.equal(migrateAndMergeSettings(saves.at(-1)).baseNodeStyle.fontSize, 32);
  assert.deepEqual(plugin.savedSettingsPolicy, captureSettingsPolicy(plugin.settings));
}));

test("a workflow save queued behind a rejected imperative appearance edit preserves both the edit and its selected theme", async () => withThemeWindow(async () => {
  const {plugin, saves} = await themeFixture({baseNodeStyle: {fontSize: 23}}), originalSave = plugin.saveData;
  let rejectDisk, calls = 0;
  plugin.saveData = async snapshot => {if (++calls === 1) await new Promise((resolve, reject) => {rejectDisk = reject;}); await originalSave(snapshot);};
  plugin.settings.baseNodeStyle.fontSize = 31;
  const appearance = plugin.saveSettings(false, false), rejected = assert.rejects(appearance, /overlapping compatibility fault/);
  await new Promise(resolve => setImmediate(resolve)); assert.equal(typeof rejectDisk, "function");
  plugin.settings.editNewNodeAfterCreate = !plugin.settings.editNewNodeAfterCreate;
  const expectedWorkflow = plugin.settings.editNewNodeAfterCreate, workflow = plugin.saveSettings(false, false);
  rejectDisk(Error("Expected overlapping compatibility fault")); await rejected; await workflow;
  assert.equal(saves.at(-1).editNewNodeAfterCreate, expectedWorkflow);
  assert.equal(saves.at(-1).baseNodeStyle.fontSize, 31);
  assert.equal(migrateAndMergeSettings(saves.at(-1)).baseNodeStyle.fontSize, 31, "An unrelated queued save cannot persist stale theme content");
}));

test("compatibility saves skip semantics only for style-only edits; mixed view changes retain requested-scope refresh", async () => {
  const { plugin, settings } = styleEditorFixture(); let semantic = 0; plugin.index.refreshSemanticSettings = async () => { semantic++; };
  settings.noteTypeStyles.Project = { icon: "box" }; await plugin.saveSettings(false); assert.equal(semantic, 0);
  settings.tagStyleList.push("#work"); settings.tagNodeStyles["#work"] = {}; await plugin.saveSettings(false); assert.equal(semantic, 0);
  settings.hierarchyLinkStyles.parent = { strokeWidth: 4 }; settings.renderSiblings = !settings.renderSiblings; await plugin.saveSettings(false); assert.equal(semantic, 1);
});

test("actual layout-profile saves stay presentation-only while mixed visibility and ontology edits retain semantic refresh", async () => {
  const {plugin,settings}=styleEditorFixture();let semantic=0,invalidations=0;
  plugin.index.refreshSemanticSettings=async()=>{semantic++};
  plugin.index.invalidateSemanticPolicy=()=>{invalidations++};
  settings.layoutProfiles['desktop:leaf']={...settings.layoutProfiles['desktop:leaf'],lateralArrangement:'left'};
  await plugin.saveSettings(false);assert.equal(semantic,0);
  settings.layoutProfiles['desktop:leaf']={...settings.layoutProfiles['desktop:leaf'],horizontalCompactingFactor:4};
  await plugin.saveSettings(false,false);assert.equal(semantic,0);assert.equal(invalidations,0);
  settings.layoutProfiles['desktop:sidepanel']={...settings.layoutProfiles['desktop:sidepanel'],lateralArrangement:'left'};
  settings.renderSiblings=!settings.renderSiblings;await plugin.saveSettings(false);assert.equal(semantic,1);
  settings.layoutProfiles['desktop:leaf']={...settings.layoutProfiles['desktop:leaf'],lateralArrangement:'split'};
  settings.hierarchy.parents.push('Other parent');await plugin.saveSettings(false);assert.equal(semantic,2);assert.equal(invalidations,1);
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
    const singleHeight = buildScene(neighborhood, index, {...settings, wrapNodeLabels:false}, false, centerSize).nodes.find(n=>n.role==='child').height;
    assert(wrapNodeLabels ? regular[0].height > singleHeight : regular[0].height >= 26, "Rows must reserve glyph clearance and two-line mode must remain taller");
    assert.equal(Math.abs(scene.nodes.find(n => n.role === "left").x), scene.nodes.find(n => n.role === "right").x, "Lateral zones must stay symmetrical");
  }
});


test("fresh native defaults and legacy absence policy survive explicit single-field clearing and foreign import",()=>{
 const fresh=migrateAndMergeSettings(undefined);assert.equal(fresh.standardStyleDefaults,'native');assert.equal(fresh.backgroundColor,undefined);
 for(const key of ['baseNodeStyle','centralNodeStyle','inferredNodeStyle','virtualNodeStyle','folderNodeStyle','tagNodeStyle'])for(const field of ['backgroundColor','textColor','borderColor','gateStrokeColor','gateBackgroundColor'])assert.equal(fresh[key][field],undefined);
 const old=migrateAndMergeSettings({baseFontSize:13});assert.equal(old.standardStyleDefaults,'legacy');assert.equal(old.backgroundColor,'#0c3e6aff');assert.equal(old.baseNodeStyle.textColor,'#ffffffff');
 const original=structuredClone(old);old.standardStyleDefaults='native';delete old.backgroundColor;delete old.baseNodeStyle.textColor;
 const loaded=migrateAndMergeSettings(JSON.parse(JSON.stringify(old)));assert.equal(loaded.backgroundColor,undefined);assert.equal(loaded.baseNodeStyle.textColor,undefined);
 assert.equal(loaded.baseNodeStyle.backgroundColor,original.baseNodeStyle.backgroundColor);assert.deepEqual(loaded.centralNodeStyle,original.centralNodeStyle);assert.equal(loaded.baseNodeStyle.fontSize,original.baseNodeStyle.fontSize);
 const imported=importExcaliBrainGraphSettings({standardStyleDefaults:'native',baseNodeStyle:{fontSize:24},colorPreferences:{version:9}},fresh);
 assert.equal(imported.standardStyleDefaults,'native');assert.equal(imported.baseNodeStyle.fontSize,24);assert.equal(imported.baseNodeStyle.textColor,'#ffffffff');assert.deepEqual(imported.colorPreferences,fresh.colorPreferences);
 const explicit=migrateAndMergeSettings({baseNodeStyle:{textColor:'#ffffffff'}});assert.equal(explicit.baseNodeStyle.textColor,'#ffffffff');assert.equal(explicit.standardStyleDefaults,'legacy');
});

test("future lens colors survive ordinary saves and imports; active lens edits are read-only",async()=>{
 for(const color of [null,{kind:'future-source',payload:['unchanged']},{kind:'theme',variable:['--text-normal']}]){
  const raw=[{id:'future',name:'Future',enabled:true,scope:'node',mode:'style',expression:'node.kind == "note"',style:{node:{textColor:color}}}];
  const settings=migrateAndMergeSettings({graphLenses:raw});assert.deepEqual(settings.graphLensesColorFuture,raw);
  const {plugin,saves}=styleEditorFixture(settings);plugin.graphLensListeners=new Set();
  await plugin.updateStyleSettings(draft=>{draft.backgroundColor='#12345680';});
  assert.deepEqual(saves.at(-1).graphLenses,raw);assert(!('graphLensesColorFuture'in saves.at(-1)));
  const reloaded=migrateAndMergeSettings(saves.at(-1));assert.deepEqual(reloaded.graphLensesColorFuture,raw);
  const imported=importExcaliBrainGraphSettings({backgroundColor:'#ffffff'},reloaded);assert.deepEqual(imported.graphLensesColorFuture,raw);
  await assert.rejects(plugin.setGraphLenses([],settings.graphLenses),/read-only/);
 }
});

test("queued lens parent save preserves a replaced named color and concurrent new lenses without optimistic publication",async()=>{
 const {plugin,settings,saves}=styleEditorFixture();plugin.graphLensListeners=new Set();
 settings.colorPreferences.palette=[{id:'a',name:'A',light:'#123456',dark:'#abcdef'},{id:'b',name:'B',light:'#234567',dark:'#fedcba'}];
 const opening={id:'edited',name:'Opening',enabled:true,scope:'node',mode:'style',expression:'node.kind == "note"',style:{node:{textColor:{kind:'palette',id:'a'},strokeWidth:1}}};
 settings.graphLenses=[structuredClone(opening)];plugin.savedSettingsPolicy=captureSettingsPolicy(settings);
 const disk=deferred();plugin.saveData=async snapshot=>{saves.push(structuredClone(snapshot));if(saves.length===1)await disk.promise;};
 const remap=plugin.updateStyleSettings(draft=>{draft.graphLenses[0].style.node.textColor={kind:'palette',id:'b'};draft.colorPreferences.palette=draft.colorPreferences.palette.filter(p=>p.id!=='a');});
 const renamed={...structuredClone(opening),name:'Renamed'};const save=plugin.setGraphLenses([renamed],[opening]);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(settings.graphLenses[0].name,'Opening');assert.equal(settings.graphLenses[0].style.node.textColor.id,'a');
 disk.resolve();await Promise.all([remap,save]);assert.equal(settings.graphLenses[0].name,'Renamed');assert.equal(settings.graphLenses[0].style.node.textColor.id,'b');assert.equal(saves.length,2);
 const baseline=structuredClone(settings.graphLenses);settings.graphLenses.push({...opening,id:'concurrent',name:'Concurrent'});
 await plugin.setGraphLenses([{...baseline[0],enabled:false}],baseline);assert.deepEqual(settings.graphLenses.map(l=>l.id),['edited','concurrent']);assert.equal(settings.graphLenses[0].enabled,false);
 settings.graphLenses=settings.graphLenses.filter(l=>l.id!=='edited');await assert.rejects(plugin.setGraphLenses([{...baseline[0],name:'Resurrect'}],baseline),/no longer exists/);
});


test("unchanged sparse ontology styles retain inheritance while a concurrent base style changes",async()=>{
 const {tab,settings}=styleEditorFixture();settings.hierarchyLinkStyles.parent={strokeColor:'#11223380'};
 const previousWindow=globalThis.window;let modal;
 try{globalThis.window={setTimeout:run=>{run();return 0},clearTimeout(){}};tab.openOntologyLinkStyleEditor('parent');modal=TestModal.latest;}finally{globalThis.window=previousWindow;}
 settings.baseLinkStyle={...settings.baseLinkStyle,strokeWidth:4,fontSize:22};
 await activate(formElements(modal).find(element=>element.text==='Save'));
 assert.deepEqual(settings.hierarchyLinkStyles.parent,{strokeColor:'#11223380'});assert.equal(settings.baseLinkStyle.strokeWidth,4);assert.equal(settings.baseLinkStyle.fontSize,22);
});

/** Exercise the real disk-before-live writer; deleting an optional root draft key must override its old value. */
test("standard adoption and named deletion durably clear an existing canvas through the production queue",async()=>{
 const {adoptStandardThemeColors,deleteNamedColor}=await import(pathToFileURL(join(temp,"migration.mjs")));
 for(const action of ['adopt','delete']){
  const {plugin,settings,saves}=styleEditorFixture();
  settings.backgroundColor={kind:'palette',id:'canvas-pair'};
  settings.colorPreferences.palette=[{id:'canvas-pair',name:'Canvas',light:'#11223380',dark:'#aabbcc40'}];
  settings.baseNodeStyle={...settings.baseNodeStyle,textColor:'#abcdef',fontSize:27};
  plugin.savedSettingsPolicy=captureSettingsPolicy(settings);
  await plugin.updateStyleSettings(draft=>action==='adopt'?adoptStandardThemeColors(draft):deleteNamedColor(draft,'canvas-pair',undefined));
  assert.equal(settings.backgroundColor,undefined,action+' live canvas');
  assert.equal(saves.at(-1).backgroundColor,undefined,action+' durable canvas');
  assert.equal(migrateAndMergeSettings(JSON.parse(JSON.stringify(saves.at(-1)))).backgroundColor,undefined,action+' restart');
  assert.equal(settings.baseNodeStyle.fontSize,27);
  if(action==='adopt'){assert.equal(settings.baseNodeStyle.textColor,undefined);assert.equal(settings.colorPreferences.palette.length,1)}
  else{assert.equal(settings.baseNodeStyle.textColor,'#abcdef');assert.equal(settings.colorPreferences.palette.length,0)}
 }
});


test("hover modifier preferences default on while explicit false survives migration, restart and foreign import", () => {
  for (const key of ["hoverHighlightRequiresAlt", "areaOutlineRequiresAlt", "gateTooltipRequiresAlt"]) {
    assert.equal(defaults[key], true, key);
    for (const malformed of [undefined, null, "true", "false", 0, 1, [], {}])
      assert.equal(migrateAndMergeSettings({kplexInitialized: true, [key]: malformed})[key], true, `${key}: ${JSON.stringify(malformed)}`);
    for (const enabled of [true, false]) {
      const saved = migrateAndMergeSettings({kplexInitialized: true, [key]: enabled});
      assert.equal(saved[key], enabled, key);
      assert.equal(migrateAndMergeSettings(JSON.parse(JSON.stringify(saved)))[key], enabled, key);
      assert.equal(importExcaliBrainGraphSettings({...fixture, [key]: !enabled}, saved)[key], enabled, key);
    }
  }
});

test("hover modifier preferences remain independent of theme application and all graph work policies", () => {
  const changed = {...defaults, hoverHighlightRequiresAlt: false, areaOutlineRequiresAlt: false, gateTooltipRequiresAlt: false};
  assert.deepEqual(classifySettingsChange(captureSettingsPolicy(defaults), captureSettingsPolicy(changed)), {
    semanticInvalidation: false, presentationFacets: false, searchTerms: false, nodeVisuals: false,
    render: false, typographyOnly: false, paintOnly: false, changedKeys: [],
  });
  assert.equal(encodeIndexSettingsSignature(defaults), encodeIndexSettingsSignature(changed));
  const appearance = themeModel.captureThemeAppearance(defaults);
  assert.deepEqual(themeModel.captureThemeAppearance(changed), appearance);
  themeModel.applyThemeAppearance(changed, appearance);
  assert.equal(changed.hoverHighlightRequiresAlt, false);
  assert.equal(changed.areaOutlineRequiresAlt, false);
  assert.equal(changed.gateTooltipRequiresAlt, false);
});

test("native declarative hover controls expose both local preferences and persist explicit opt-outs", async () => {
  const saves = [];
  const plugin = {manifest: {id: "k-plex"}, settings: structuredClone(defaults),
    saveSettings: async (...args) => { saves.push(args); },
    index: {unassignedOntologyFields: () => [], allPages: () => []}};
  plugin.translator = createObsidianTranslator();
  const tab = new KplexSettingTab({}, plugin);
  const behavior = tab.getSettingDefinitions().find(item => item.name === "Canvas behavior");
  const navigation = behavior.items.find(item => item.heading === "Navigation & interaction");
  for (const key of ["hoverHighlightRequiresAlt", "areaOutlineRequiresAlt", "gateTooltipRequiresAlt"]) {
    const row = navigation.items.find(item => item.control?.key === key);
    assert.equal(row?.control?.type, "toggle", key);
    assert.equal(typeof row?.desc, "string", key);
    assert(!row.desc.includes("{key}"), "the owner environment formats the modifier name");
    await tab.setControlValue(key, false);
    assert.equal(plugin.settings[key], false, key);
  }
  assert.deepEqual(saves, [[], [], []], "workflow controls use the existing settings writer");
});

test('partial legacy ontology import preserves an implicit former counterpart and escapes foreign slash fields',()=>{const current=migrateAndMergeSettings({ontologyPairingVersion:1,hierarchy:{previous:['replies to/replied by'],next:[]}});const partial=importExcaliBrainGraphSettings({hierarchy:{previous:['literal/a']}},current);assert(partial.hierarchy.next.includes('replied by'));assert.deepEqual(partial.hierarchy.previous,['literal\\/a']);const replaced=importExcaliBrainGraphSettings({hierarchy:{previous:['literal/a'],next:['Explicit next']}},current);assert.deepEqual(replaced.hierarchy.next,['Explicit next']);assert(!replaced.hierarchy.next.includes('replied by'));});


test("trackpad and remembered drawing templates survive settings loading without semantic invalidation", () => {
  const settings = migrateAndMergeSettings({...defaults, trackpadNavigation: true, lastDrawingTemplatePath: "Templates/Chosen.md", futureCreationPreference: {retained: true}});
  assert.equal(settings.trackpadNavigation, true);
  assert.equal(settings.lastDrawingTemplatePath, "Templates/Chosen.md");
  assert.deepEqual(settings.futureCreationPreference, {retained: true});
  const restored = migrateAndMergeSettings(JSON.parse(JSON.stringify(settings)));
  assert.equal(restored.lastDrawingTemplatePath, "Templates/Chosen.md");
  assert.deepEqual(restored.futureCreationPreference, {retained: true});
  const effects = classifySettingsChange(captureSettingsPolicy(defaults), captureSettingsPolicy(settings));
  assert.equal(effects.semanticInvalidation, false);
  assert.equal(effects.render, true);
  assert.deepEqual(effects.changedKeys, ["trackpadNavigation"]);
  assert.equal(encodeIndexSettingsSignature(settings), encodeIndexSettingsSignature(defaults));
  const invalid = migrateAndMergeSettings({trackpadNavigation: "true", lastDrawingTemplatePath: 42});
  assert.equal(invalid.trackpadNavigation, false); assert.equal(invalid.lastDrawingTemplatePath, null);
});
