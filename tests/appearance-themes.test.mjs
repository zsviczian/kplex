/** Theme content boundaries and reset invariants exercise the production portable owner with realistic mixed appearance records. */
import assert from "node:assert/strict";
import test from "node:test";
import {loadPortableModules} from "./support/portableTypeScript.mjs";
const {exports: m} = loadPortableModules(["src/core/plex/appearanceThemes.ts", "src/core/plex/colorPreferences.ts", "src/core/plex/colorEditing.ts"]);
const names = {default: "Default theme", user: "User theme", nativeBase: "Default base + my semantic colors", custom: "Custom theme"};

test("automatic theme names stay unique within the serialized limit and library capacity cannot create an unreadable restart", () => {
 const f=fixture(),library=m.createAppearanceThemes(f,f,true,names),name='x'.repeat(100);
 library.themes[0].name=name;assert.equal(m.uniqueThemeName(library,name).length,100);assert(m.uniqueThemeName(library,name).endsWith(' 2'));
 assert.throws(()=>m.uniqueThemeName(library,'   '),/Invalid/);
 const full={...library,themes:Array.from({length:m.MAX_APPEARANCE_THEMES},(_,i)=>({...library.themes[0],id:i?'id-'+i:'default',name:'Name '+i})),selectedId:'default'};
 assert.throws(()=>m.addAppearanceTheme(full,'extra','Extra',false),/Invalid/);
 const changed=m.captureThemeAppearance(f);changed.base.backgroundColor='#ffffff';assert.throws(()=>m.recordThemeAppearance(full,changed,'extra','Custom'),/limit/);
});
/** Include references shared by all consumers, global lens behavior, geometry and unrelated workflow. */
function fixture() {
  const source = {standardStyleDefaults: "native", colorPreferences: m.defaultColorPreferences(), tagStyleList: ["z", "a"],
    noteTypeStyles: {Concept: {icon: "star", fontSize: 22, textColor: {kind: "palette", id: "shared"}}},
    tagNodeStyles: {z: {backgroundColor: "#11223380", maxWidth: 400}, a: {borderColor: "#abcdef"}},
    hierarchyLinkStyles: {Parent: {strokeColor: "#123456", strokeStyle: "dashed"}},
    graphLenses: [{id: "lens-A", expression: "tag:#z", enabled: false, mode: "highlight", style: {node: {textColor: {kind: "palette", id: "shared"}, strokeWidth: 2}, edge: {strokeColor: "#654321", showLabel: true}}}],
    hierarchy: {parents: ["Parent"]}, noteTypeField: "type", typographyProfiles: {desktop: {baseFontSize: 17}}};
  for (const key of m.BASE_THEME_STYLE_KEYS) source[key] = key.endsWith("NodeStyle") ? {fontSize: 20, textColor: "#123456"} : {strokeWidth: 1, textColor: "#abcdef"};
  source.backgroundColor = {kind: "palette", id: "shared"};
  source.colorPreferences.palette = [{id: "shared", name: "Shared", light: "#12345680", dark: "#abcdef00"}];
  source.colorPreferences.semantic.origin = {kind: "palette", id: "shared"};
  source.colorPreferences.compass = {enabled: true, intensity: 12, fills: {north: {kind: "palette", id: "shared"}}};
  return source;
}
/** Factory fixtures carry native references, built-in semantics and no user dictionaries/palette/lenses. */
function factory() {
  const source = fixture(); m.resetAppearanceColors(source, "all");
  source.noteTypeStyles = {}; source.tagNodeStyles = {}; source.tagStyleList = []; source.hierarchyLinkStyles = {};
  source.colorPreferences = m.defaultColorPreferences(); source.graphLenses = []; return source;
}

test("migration creates three detached choices and fresh installation only factory; imported users follow existing path", () => {
  const current = fixture(), before = structuredClone(current), library = m.createAppearanceThemes(current, factory(), true, names);
  assert.equal(library.selectedId, "user"); assert.equal(library.migrationNotice, true); assert.equal(library.themes.length, 3);
  assert.deepEqual(library.themes[0].appearance, m.captureThemeAppearance(before));
  const adopted = structuredClone(before); m.adoptStandardThemeColors(adopted);
  assert.deepEqual(library.themes[1].appearance, m.captureThemeAppearance(adopted));
  assert.deepEqual(current, before); assert.deepEqual(m.readAppearanceThemes(JSON.parse(JSON.stringify(library))), library);
  library.themes[1].appearance.semantic.colorPreferences.palette[0].light = "#000000";
  library.themes[1].appearance.semantic.noteTypeStyles.Concept.fontSize = 99;
  assert.equal(library.themes[0].appearance.semantic.colorPreferences.palette[0].light, "#12345680");
  assert.equal(current.noteTypeStyles.Concept.fontSize, 22);
  const fresh = m.createAppearanceThemes(current, factory(), false, names);
  assert.deepEqual(fresh.themes.map(theme => theme.id), ["default"]); assert.equal(fresh.selectedId, "default"); assert.equal(fresh.migrationNotice, false);
  assert.deepEqual(fresh.themes[0].appearance.semantic.noteTypeStyles, {}); assert.deepEqual(fresh.themes[0].appearance.semantic.colorPreferences.palette, []);
});

test("theme capture/apply copies complete styles and only lens colors, never behavior or deleted lenses", () => {
  const current = fixture(), appearance = m.captureThemeAppearance(current), target = fixture();
  assert.deepEqual(Object.keys(appearance).sort(), ["base", "semantic"]);
  assert.equal(JSON.stringify(appearance).includes("expression"), false); assert.equal(JSON.stringify(appearance).includes("typographyProfiles"), false);
  target.graphLenses[0].expression = "new expression"; target.graphLenses[0].enabled = true; target.graphLenses[0].style.node.strokeWidth = 9;
  target.graphLenses.push({id: "new-lens", expression: "unrelated", enabled: true, style: {node: {backgroundColor: "#ff0000", strokeWidth: 7}}});
  m.applyThemeAppearance(target, appearance);
  assert.equal(target.graphLenses[0].expression, "new expression"); assert.equal(target.graphLenses[0].enabled, true);
  assert.equal(target.graphLenses[0].style.node.strokeWidth, 9); assert.equal(target.graphLenses[1].style.node.backgroundColor, undefined);
  assert.equal(target.graphLenses[1].style.node.strokeWidth, 7);
  target.graphLenses.shift(); m.applyThemeAppearance(target, appearance); assert.equal(target.graphLenses.length, 1); assert.equal(target.graphLenses[0].id, "new-lens");
  target.noteTypeStyles.Concept.icon = "circle"; assert.equal(appearance.semantic.noteTypeStyles.Concept.icon, "star");
});

test("scoped resets preserve palette, exact non-color style records, ordering, global settings and Compass controls", () => {
  for (const scope of ["base", "semantic", "all"]) {
    const source = fixture(), before = structuredClone(source); source.baseNodeStyle.borderColor = {kind: "theme", variable: "--kplex-semantic-origin"};
    const base = m.captureThemeAppearance(source).base; m.resetAppearanceColors(source, scope);
    assert.deepEqual(source.colorPreferences.palette, before.colorPreferences.palette); assert.equal(source.colorPreferences.compass.enabled, true); assert.equal(source.colorPreferences.compass.intensity, 12);
    assert.deepEqual(source.tagStyleList, before.tagStyleList); assert.equal(source.noteTypeStyles.Concept.icon, "star"); assert.equal(source.tagNodeStyles.z.maxWidth, 400);
    assert.equal(source.hierarchyLinkStyles.Parent.strokeStyle, "dashed"); assert.equal(source.graphLenses[0].style.node.strokeWidth, 2);
    assert.deepEqual(source.hierarchy, before.hierarchy); assert.deepEqual(source.typographyProfiles, before.typographyProfiles);
    if (scope === "base") { assert.deepEqual(m.captureThemeAppearance(source).semantic, m.captureThemeAppearance(before).semantic); assert.equal(source.backgroundColor, undefined); }
    else { assert.deepEqual(source.colorPreferences.semantic, {}); assert.deepEqual(source.colorPreferences.compass.fills, {}); assert.equal(m.semanticColorSlots(source).length, 0); }
    if (scope === "semantic") assert.deepEqual(m.captureThemeAppearance(source).base, base);
  }
});

test("default copy-on-write requires an actual appearance change and unique names; original copies stay immutable", () => {
  const defaults = factory(), library = m.createAppearanceThemes(defaults, defaults, false, names);
  assert.equal(m.recordThemeAppearance(library, m.captureThemeAppearance(defaults), "custom-1", names.custom), library);
  const changed = structuredClone(defaults); changed.baseNodeStyle.fontSize = 24;
  const next = m.recordThemeAppearance(library, m.captureThemeAppearance(changed), "custom-1", names.custom);
  assert.equal(next.selectedId, "custom-1"); assert.equal(library.themes.length, 1); assert.equal(next.themes[0].appearance.base.baseNodeStyle.fontSize, 20);
  next.selectedId = "default"; const third = m.recordThemeAppearance(next, m.captureThemeAppearance(changed), "custom-2", names.custom);
  assert.equal(third.themes[2].name, "Custom theme 2"); assert.equal(m.validThemeName(third, " custom THEME "), false); assert.equal(m.validThemeName(third, "  "), false);
  assert.equal(m.validThemeName(third, "Custom theme", "custom-1"), true);
});

test("future schemas, unsupported colors, missing palette identities and incomplete containers cannot masquerade as authentic backups", () => {
  const library = m.createAppearanceThemes(fixture(), factory(), true, names);
  for (const mutate of [x => x.version = 2, x => x.themes[0].appearance.semantic.colorPreferences.version = 2,
    x => x.themes[0].appearance.base.baseNodeStyle.textColor = {kind: "future", value: 3},
    x => x.themes[0].appearance.semantic.colorPreferences.palette = [], x => delete x.themes[0].appearance.base.baseNodeStyle,
    x => x.themes[1].id = "user", x => x.selectedId = "missing"]) {
    const broken = structuredClone(library); mutate(broken); const exact = JSON.stringify(broken);
    assert.equal(m.readAppearanceThemes(broken), undefined); assert.equal(JSON.stringify(broken), exact);
  }
});

test("create/rename/delete/select preserve independent contents and immutable factory; inactive metadata keeps appearance exact", () => {
  const library = m.createAppearanceThemes(fixture(), factory(), true, names), original = structuredClone(library);
  const created = m.addAppearanceTheme(library, "copy", "Copy", false); assert.equal(created.selectedId, "copy");
  created.themes[3].appearance.semantic.colorPreferences.palette[0].name = "Private copy";
  assert.deepEqual(library, original); assert.equal(created.themes[0].appearance.semantic.colorPreferences.palette[0].name, "Shared");
  const factoryCopy = m.addAppearanceTheme(library, "factory-copy", "Factory copy", true);
  assert.deepEqual(factoryCopy.themes[3].appearance.semantic.noteTypeStyles, {}); assert.equal(factoryCopy.themes[3].appearance.semantic.colorPreferences.palette.length, 0);
  const renamed = m.renameAppearanceTheme(library, "native-base", "Renamed"); assert.equal(renamed.selectedId, "user"); assert.deepEqual(renamed.themes[0], library.themes[0]);
  const inactive = m.deleteAppearanceTheme(renamed, "native-base"); assert.equal(inactive.selectedId, "user"); assert.deepEqual(inactive.themes[0].appearance, library.themes[0].appearance);
  const active = m.deleteAppearanceTheme(inactive, "user"); assert.equal(active.selectedId, "default"); assert.deepEqual(active.themes, [library.themes[2]]);
  for (const op of [() => m.deleteAppearanceTheme(library, "default"), () => m.renameAppearanceTheme(library, "default", "New"),
    () => m.addAppearanceTheme(library, "copy", "USER THEME", false), () => m.selectAppearanceTheme(library, "absent")]) assert.throws(op);
  assert.equal(m.selectAppearanceTheme(library, "user"), library);
  assert.equal(m.canCaptureThemeAppearance(fixture()), true);
  const broken = fixture(); broken.colorPreferences.palette = []; assert.equal(m.canCaptureThemeAppearance(broken), false);
});
