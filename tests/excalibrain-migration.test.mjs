/**
 * Tests legacy data migration through the real K-Plex settings/style implementations with a
 * narrow Obsidian boundary double. Temporary bundles are removed independently of test outcomes.
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
  stdin: { contents: 'export * from "./src/settings"; export * from "./src/index/style"; export * from "./src/ui/layout"; export * from "./src/ui/PurgeIndexCacheModal";', resolveDir: root },
  outfile: join(temp, "migration.mjs"), bundle: true, platform: "node", format: "esm",
  plugins: [{ name: "obsidian-boundary-double", setup(builder) {
    builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "double" }));
    builder.onLoad({ filter: /.*/, namespace: "double" }, () => ({ contents: `
      export class App {}
      export class Modal {
        constructor(app) { this.app = app; this.titleEl = { setText(text) { this.text = text; } }; this.contentEl = { buttons: [], createEl() {}, empty() {} }; }
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
      export class AbstractInputSuggest {}
      export class PluginSettingTab { constructor(app) { this.app = app; this.containerEl = { addClass() {} }; } }
      export const getIcon = () => null; export const getIconIds = () => []; export const getLanguage = () => "en";
    `, loader: "js" }));
  } }],
});
const { migrateAndMergeSettings, importExcaliBrainGraphSettings, KplexSettingTab, resolveNodeStyle, resolveLinkStyle, buildScene, PurgeIndexCacheModal } = await import(pathToFileURL(join(temp, "migration.mjs")));
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
  assert.equal(defaults.indexingMode, "eager");
  assert.equal(defaults.urlIndexingMode, "on-demand");
  const invalid = migrateAndMergeSettings({ indexingMode: "invalid", urlIndexingMode: "invalid" });
  assert.equal(invalid.indexingMode, "eager");
  assert.equal(invalid.urlIndexingMode, "on-demand");
  const local = migrateAndMergeSettings({ indexingMode: "on-demand", urlIndexingMode: "background" });
  const imported = importExcaliBrainGraphSettings({ ...fixture, indexingMode: "eager", urlIndexingMode: "on-demand" }, local);
  assert.equal(imported.indexingMode, "on-demand");
  assert.equal(imported.urlIndexingMode, "background");
  assert.deepEqual(migrateAndMergeSettings(JSON.parse(JSON.stringify(local))), local);
});

test("indexing settings persist without rebuilding and cache estimation is lazy and fenced to the displayed row", async () => {
  let estimates = 0;
  let completeEstimate;
  const saves = [];
  const plugin = {
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
  const plugin = { settings, index: { unassignedOntologyFields: () => [], allPages: () => [] } };
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
