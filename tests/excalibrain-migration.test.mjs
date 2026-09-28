import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { assertMigratedExcaliBrainSettings } from "./support/excalibrainMigration.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = JSON.parse(readFileSync(join(root, "tests/fixtures/excalibrain-migration/data.json"), "utf8"));
const temp = mkdtempSync(join(tmpdir(), "kplex-migration-"));
process.on("exit", () => rmSync(temp, { recursive: true, force: true }));
await build({
  stdin: { contents: 'export * from "./src/settings"; export * from "./src/index/style"; export * from "./src/ui/layout";', resolveDir: root },
  outfile: join(temp, "migration.mjs"), bundle: true, platform: "node", format: "esm",
  plugins: [{ name: "obsidian-boundary-double", setup(builder) {
    builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "double" }));
    builder.onLoad({ filter: /.*/, namespace: "double" }, () => ({ contents: `
      export class App {} export class Modal {} export class Notice {}
      export class AbstractInputSuggest {}
      export class PluginSettingTab { constructor(app) { this.app = app; this.containerEl = { addClass() {} }; } }
      export const getIcon = () => null; export const getIconIds = () => []; export const getLanguage = () => "en";
    `, loader: "js" }));
  } }],
});
const { migrateAndMergeSettings, ExcaliBrainSettingTab, resolveNodeStyle, resolveLinkStyle, buildScene } = await import(pathToFileURL(join(temp, "migration.mjs")));
const migrated = migrateAndMergeSettings(fixture);

test("real ExcaliBrain fixture migrates complete ontology, styles and compatible preferences without mutation", () => {
  const before = JSON.stringify(fixture);
  assertMigratedExcaliBrainSettings(migrated, fixture);
  assert.equal(Object.keys(migrated.tagNodeStyles).length, 32);
  assert.equal(Object.keys(migrated.hierarchyLinkStyles).length, 297);
  assert.deepEqual(migrateAndMergeSettings(JSON.parse(JSON.stringify(migrated))), migrated, "persisted settings must remain stable on reload");
  assert.equal(JSON.stringify(fixture), before);
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
  const tab = new ExcaliBrainSettingTab({}, plugin);
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
