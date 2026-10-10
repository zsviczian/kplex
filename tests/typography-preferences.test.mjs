/** Production sparse typography, migration, inherited view facades and settings-effect regressions. Host APIs are bounded doubles. */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";
const temp = mkdtempSync(join(tmpdir(), "kplex-typography-"));
process.on("exit", () => rmSync(temp, { recursive: true, force: true }));
await build({ stdin: { contents: 'export * from "./src/core/plex/typographyPreferences"; export * from "./src/settings"; export * from "./src/core/graph/settingsPolicy"; export * from "./src/ui/viewProfile"; export * from "./src/index/style";', resolveDir: process.cwd() },
  outfile: join(temp, "model.mjs"), bundle: true, platform: "node", format: "esm", plugins: [{ name: "host", setup(b) {
    b.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "host" }));
    b.onLoad({ filter: /.*/, namespace: "host" }, () => ({ contents: `export class App {} export class Modal {} export class Notice {} export class AbstractInputSuggest {} export class PluginSettingTab {} export class Scope {} export class Setting {} export class ButtonComponent {} export class ExtraButtonComponent {} export class SearchComponent {} export const setIcon=()=>{}; export const setTooltip=()=>{}; export const getIcon=()=>null; export const getIconIds=()=>[]; export const getLanguage=()=>"en"; export const Platform={};`, loader: "js" }));
  }}] });
const m = await import(pathToFileURL(join(temp, "model.mjs")));
const env = device => ({ device });
const shared = { baseFontSize: 12.4, maxLabelLength: 30, maxWidth: 286, wrapNodeLabels: true };

test("legacy migration remains sparse and forward values are inert; false and equal-to-default choices remain explicit", () => {
  assert.deepEqual(m.migrateAndMergeSettings(undefined).typographyProfiles, {});
  const raw = { desktop: { baseFontSize: 12.4, wrapNodeLabels: false, future: { value: 4 }, maxLabelLength: "bad" }, tablet: { maxWidth: Infinity }, futureDevice: { maxWidth: 500 } };
  const profiles = m.sanitizeTypographyProfiles(raw);
  assert.deepEqual(profiles.desktop, { baseFontSize: 12.4, wrapNodeLabels: false, future: { value: 4 } });
  assert.equal(profiles.tablet, undefined); assert.deepEqual(profiles.futureDevice, raw.futureDevice);
  assert.deepEqual(m.effectiveTypography(shared, profiles.desktop), { ...shared, wrapNodeLabels: false });
  assert.equal(m.effectiveTypography({ ...shared, baseFontSize: 22 }, profiles.desktop).baseFontSize, 12.4);
  assert.equal(raw.desktop.maxLabelLength, "bad");
  assert.deepEqual(m.sanitizeTypographyProfiles({ mobile: { baseFontSize: 100, maxLabelLength: 7, maxWidth: 159, wrapNodeLabels: 0 } }).mobile,
    { baseFontSize: 28, maxLabelLength: 8, maxWidth: 160 });
});

test("scalar merges and resets preserve other devices, future fields and latest interleaved values", () => {
  const empty = {}; assert.equal(m.mergeTypographyOverride(empty, "desktop", { baseFontSize: "bad", wrapNodeLabels: null }), empty);
  let profiles = m.mergeTypographyOverride({}, "desktop", { baseFontSize: 18 });
  profiles = m.mergeTypographyOverride(profiles, "mobile", { wrapNodeLabels: false });
  profiles = m.mergeTypographyOverride(profiles, "desktop", { maxWidth: 500 });
  profiles = { ...profiles, desktop: { ...profiles.desktop, future: "retained" } };
  profiles = m.resetTypographyOverride(profiles, "desktop", "baseFontSize");
  assert.deepEqual(profiles.desktop, { maxWidth: 500, future: "retained" });
  profiles = m.resetTypographyOverride(profiles, "desktop");
  assert.deepEqual(profiles.desktop, { future: "retained" }); assert.equal(profiles.mobile.wrapNodeLabels, false);
  const settings = m.migrateAndMergeSettings({ typographyProfiles: profiles });
  assert.deepEqual(m.migrateAndMergeSettings(JSON.parse(JSON.stringify(settings))).typographyProfiles, profiles);
  assert.deepEqual(m.importExcaliBrainGraphSettings({ typographyProfiles: { desktop: { maxWidth: 700 } }, baseNodeStyle: { maxWidth: 320 } }, settings).typographyProfiles, profiles);
});

test("view overlay preserves inherited root dictionaries, own style fields and explicit style precedence across all surfaces", () => {
  const root = m.migrateAndMergeSettings({ noteTypeStyles: { special: { maxWidth: 650, maxLabelLength: 160 } }, typographyProfiles: { desktop: { maxWidth: 450, maxLabelLength: 60, baseFontSize: 18, wrapNodeLabels: false } } });
  const prepared = Object.assign(Object.create(root), { baseNodeStyle: { ...root.baseNodeStyle } });
  for (const surface of ["leaf", "sidepanel", "popout"]) {
    const effective = m.effectiveViewSettings(prepared, surface, env("desktop"));
    assert.equal(Object.getPrototypeOf(effective), prepared); assert.equal(effective.noteTypeStyles, root.noteTypeStyles);
    assert.equal(effective.baseNodeStyle.maxWidth, 450); assert.equal(effective.wrapNodeLabels, false);
    assert.equal(Object.hasOwn(effective.baseNodeStyle, "fontSize"), true);
    const node = { path: "Node.md", file: { extension: "md" }, styleTags: [], noteType: "special" };
    const resolved = m.resolveNodeStyle(node, null, "child", effective);
    assert.equal(resolved.maxWidth, 650); assert.equal(resolved.maxLabelLength, 160); assert.equal(resolved.fontSize, root.baseNodeStyle.fontSize);
  }
  assert.equal(root.baseNodeStyle.maxWidth, 286);
  assert.equal(m.effectiveViewSettings(prepared, "leaf", env("tablet")).baseNodeStyle.maxWidth, 286);
});

test("device width controls center and regular roles while reset restores shared center styling and later explicit styles", () => {
  const s = m.migrateAndMergeSettings({ centralNodeStyle: { maxWidth: 390, textColor: "#abcdef" },
    typographyProfiles: { desktop: { maxWidth: 800 }, mobile: { maxWidth: 320 } },
    noteTypeStyles: { special: { maxWidth: 650 } }, tagStyleList: ["#wide"], tagNodeStyles: { "#wide": { maxWidth: 720 } } });
  const plain = { path: "Node.md", file: { extension: "md" }, styleTags: [] };
  for (const surface of ["leaf", "sidepanel", "popout"]) {
    for (const [device, width] of [["desktop", 800], ["phone", 320]]) {
      const effective = m.effectiveViewSettings(s, surface, env(device));
      assert.equal(m.resolveNodeStyle(plain, null, "center", effective).maxWidth, width);
      assert.equal(m.resolveNodeStyle(plain, null, "child", effective).maxWidth, width);
      assert.equal(effective.centralNodeStyle.textColor, "#abcdef");
      assert.equal(m.resolveNodeStyle({ ...plain, noteType: "special" }, null, "center", effective).maxWidth, 650);
      assert.equal(m.resolveNodeStyle({ ...plain, primaryStyleTag: "#wide", styleTags: ["#wide"] }, null, "center", effective).maxWidth, 720);
    }
  }
  assert.equal(s.centralNodeStyle.maxWidth, 390);
  assert.equal(m.effectiveViewSettings(s, "leaf", env("tablet")).centralNodeStyle.maxWidth, 390);
  s.centralNodeStyle.textColor = "#123456";
  assert.equal(m.effectiveViewSettings(s, "leaf", env("desktop")).centralNodeStyle.textColor, "#123456");
  s.centralNodeStyle = { ...s.centralNodeStyle, maxWidth: 500 };
  s.typographyProfiles.desktop.maxWidth = 286;
  assert.equal(m.effectiveViewSettings(s, "leaf", env("desktop")).centralNodeStyle.maxWidth, 286);
  // Same effective base width before/after reset must not reuse a stale merged center style.
  delete s.typographyProfiles.desktop.maxWidth;
  assert.equal(m.effectiveViewSettings(s, "leaf", env("desktop")).centralNodeStyle.maxWidth, 500);
  s.typographyProfiles.desktop.maxWidth = NaN;
  assert.equal(m.effectiveViewSettings(s, "leaf", env("desktop")).centralNodeStyle.maxWidth, 500);
});

test("cache refresh handles no profile, sparse reset, shared style replacement and supported in-place edits", () => {
  const s = m.migrateAndMergeSettings({ typographyProfiles: { mobile: { maxWidth: 450 } } });
  delete s.layoutProfiles["mobile:leaf"];
  let effective = m.effectiveViewSettings(s, "leaf", env("phone"));
  assert.equal(effective.baseNodeStyle.maxWidth, 450);
  assert.equal(m.effectiveViewSettings(s, "leaf", env("phone")), effective);
  s.baseNodeStyle.padding = 15;
  const edited = m.effectiveViewSettings(s, "leaf", env("phone"));
  assert.notEqual(edited, effective); assert.equal(edited.baseNodeStyle.padding, 15);
  s.baseNodeStyle = { ...s.baseNodeStyle, textColor: "#aabbccff" };
  effective = m.effectiveViewSettings(s, "leaf", env("phone")); assert.equal(effective.baseNodeStyle.textColor, "#aabbccff");
  s.typographyProfiles.mobile.maxWidth = 520;
  assert.equal(m.effectiveViewSettings(s, "leaf", env("phone")).baseNodeStyle.maxWidth, 520);
  s.typographyProfiles = m.resetTypographyOverride(s.typographyProfiles, "mobile");
  assert.equal(m.effectiveViewSettings(s, "leaf", env("phone")), s);
});

test("device typography edits classify as render only and never mutate shared label facets or semantic signature", () => {
  const s = m.migrateAndMergeSettings(undefined), before = m.captureSettingsPolicy(s), signature = m.encodeIndexSettingsSignature(s);
  s.typographyProfiles = m.mergeTypographyOverride(s.typographyProfiles, "desktop", { maxLabelLength: 60, wrapNodeLabels: false });
  const effects = m.classifySettingsChange(before, m.captureSettingsPolicy(s));
  assert.equal(effects.render, true); assert.equal(effects.semanticInvalidation, false); assert.equal(effects.presentationFacets, false); assert.equal(effects.searchTerms, false);
  assert.equal(effects.typographyOnly, true);
  assert.deepEqual(effects.changedKeys, ["typographyProfiles"]); assert.equal(m.encodeIndexSettingsSignature(s), signature);
  assert.equal(s.baseNodeStyle.maxLabelLength, 30);
  assert.equal(m.classifySettingsChange(before, before).typographyOnly, false);
  s.showFolderNodes = !s.showFolderNodes;
  assert.equal(m.classifySettingsChange(before, m.captureSettingsPolicy(s)).typographyOnly, false, "Mixed visibility writes retain their scope refresh");
  s.hierarchy.parents.push("Different parent");
  const mixed = m.classifySettingsChange(before, m.captureSettingsPolicy(s));
  assert.equal(mixed.typographyOnly, false); assert.equal(mixed.semanticInvalidation, true);
  const legacy = m.migrateAndMergeSettings(undefined), legacyBefore = m.captureSettingsPolicy(legacy);
  legacy.baseFontSize += 1;
  assert.equal(m.classifySettingsChange(legacyBefore, m.captureSettingsPolicy(legacy)).typographyOnly, false, "Legacy shared controls keep their established effect");
});

/** Extract the real host methods without importing the native plugin superclass/lifecycle. */
function hostTypography(notices) {
  const text = readFileSync("src/main.ts", "utf8"), file = ts.createSourceFile("main.ts", text, ts.ScriptTarget.Latest, true);
  const names = new Set(["stageTypographyOverride", "persistTypographySettings", "updateTypographyOverride", "resetTypographyOverride"]);
  const methods = [];
  /** Keep production method bodies intact, including await/error and notification boundaries. */
  const visit = node => { if (ts.isMethodDeclaration(node) && names.has(node.name.getText(file))) methods.push(node.getText(file)); ts.forEachChild(node, visit); };
  visit(file);
  assert.equal(methods.length, names.size);
  const code = ts.transpileModule(`class Host {${methods.join("\n")}}`, { compilerOptions: { target: ts.ScriptTarget.ES2021 } }).outputText;
  return new Function("mergeTypographyOverride", "resetDeviceTypography", "Notice", `${code};return new Host();`)(m.mergeTypographyOverride, m.resetTypographyOverride, class { constructor(message) { notices.push(message); } });
}

test("actual device host writer retains latest state across interleaved awaits, reset and failed storage", async () => {
  const notices = [], host = hostTypography(notices), snapshots = [], releases = [];
  host.settings = m.migrateAndMergeSettings(undefined); host.translator = (key, params) => `${key}:${params.error}`;
  host.index = { notifyPresentation() {} };
  host.saveSettings = async () => { snapshots.push(structuredClone(host.settings.typographyProfiles)); await new Promise(resolve => releases.push(resolve)); };
  const first = host.updateTypographyOverride("desktop", { baseFontSize: 18 });
  const second = host.updateTypographyOverride("mobile", { wrapNodeLabels: false });
  const reset = host.resetTypographyOverride("desktop");
  assert.equal(host.settings.typographyProfiles.desktop, undefined); assert.equal(host.settings.typographyProfiles.mobile.wrapNodeLabels, false);
  releases.splice(0).forEach(resolve => resolve()); await Promise.all([first, second, reset]);
  assert.equal(host.settings.typographyProfiles.desktop, undefined, "Late save must never replay an old patch");
  host.saveSettings = async () => { throw new Error("disk unavailable"); };
  await host.updateTypographyOverride("tablet", { maxLabelLength: 60 });
  assert.equal(host.settings.typographyProfiles.tablet.maxLabelLength, 60); assert.equal(notices.length, 1);
  assert.match(notices[0], /disk unavailable/); assert.equal(await host.persistTypographySettings(), false);
  host.saveSettings = async () => { snapshots.push(structuredClone(host.settings.typographyProfiles)); };
  assert.equal(await host.persistTypographySettings(), true); assert.equal(snapshots.at(-1).tablet.maxLabelLength, 60);
});

/** Mount one actual native setting row with host component doubles that do not fire on initial setValue. */
function mountTypographyRow(definition) {
  const state = { value: undefined, change: undefined, reset: undefined, description: "" };
  const control = { setValue(value) { state.value = value; return this; }, setLimits() { return this; }, setDynamicTooltip() { return this; }, onChange(callback) { state.change = callback; return this; } };
  const button = { setIcon() { return this; }, setTooltip() { return this; }, onClick(callback) { state.reset = callback; return this; } };
  const setting = { setDesc(text) { state.description = text; }, addSlider(callback) { callback(control); }, addToggle(callback) { callback(control); }, addExtraButton(callback) { callback(button); } };
  state.release = definition.render(setting); return state;
}

test("actual searchable native rows permanently capture device scope, mount without writes and synchronize resets", async () => {
  const tab = Object.create(m.KplexSettingTab.prototype), notices = [], plugin = hostTypography(notices), listeners = new Set();
  let saves = 0;
  plugin.settings = m.migrateAndMergeSettings(undefined); plugin.translator = (key, args = {}) => `${key}:${JSON.stringify(args)}`;
  plugin.saveSettings = async () => { saves++; };
  plugin.index = { notifyPresentation() { listeners.forEach(callback => callback()); }, subscribePresentation(callback) { listeners.add(callback); return () => listeners.delete(callback); } };
  tab.kplexPlugin = plugin;
  const pages = tab.typographyDefinitions();
  const desktop = mountTypographyRow(pages[0].items[0]), tablet = mountTypographyRow(pages[1].items[0]);
  assert.equal(saves, 0); assert.deepEqual(plugin.settings.typographyProfiles, {}); assert.match(desktop.description, /inherited/);
  desktop.change(18); tablet.change(20); await Promise.resolve();
  assert.equal(plugin.settings.typographyProfiles.desktop.baseFontSize, 18); assert.equal(plugin.settings.typographyProfiles.tablet.baseFontSize, 20);
  assert.equal(desktop.value, 18); assert.equal(tablet.value, 20); assert.match(desktop.description, /customized/);
  desktop.reset(); await Promise.resolve();
  assert.equal(plugin.settings.typographyProfiles.desktop, undefined); assert.equal(desktop.value, plugin.settings.baseFontSize);
  assert.equal(tablet.value, 20); desktop.release(); tablet.release(); assert.equal(listeners.size, 0);
  assert.equal(tab.getControlValue("typography.mobile.wrapNodeLabels"), plugin.settings.wrapNodeLabels);
});

/** Capture the real quick-control callback and unmount cleanup while supplying only their view-owned collaborators. */
function quickTypographyCallbacks(dependencies) {
  const text = readFileSync("src/ui/PlexGraph.tsx", "utf8"), file = ts.createSourceFile("PlexGraph.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let change, unmount;
  /** Extract actual closures, including their storage-only debounce and retirement guards. */
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === "changeTypography") change = node.initializer.getText(file);
    if (ts.isCallExpression(node) && node.expression.getText(file) === "useEffect" && node.arguments[0]?.getText(file).startsWith("() => () =>") && node.arguments[0].getText(file).includes("typographySave.current")) unmount = node.arguments[0].getText(file);
    ts.forEachChild(node, visit);
  };
  visit(file); assert(change && unmount);
  const code = ts.transpileModule(`const change=${change};const unmount=(${unmount})();`, { compilerOptions: { target: ts.ScriptTarget.ES2021 } }).outputText;
  return new Function(...Object.keys(dependencies), `${code};return {change,unmount};`)(...Object.values(dependencies));
}

test("actual quick debounce/unmount persists latest staged device once and cannot resurrect a Settings reset", async () => {
  const notices = [], plugin = hostTypography(notices), timers = new Map(); let timer = 0, saves = 0, release;
  plugin.settings = m.migrateAndMergeSettings(undefined); plugin.index = { notifyPresentation() {} }; plugin.translator = () => "failed";
  plugin.saveSettings = async () => { saves++; await new Promise(resolve => { release = resolve; }); };
  const ownerWindow = { setTimeout(callback) { timers.set(++timer, callback); return timer; }, clearTimeout(id) { timers.delete(id); } };
  const ref = () => ({ current: null });
  const dependencies = { plugin, typographyDevice: "desktop", typographyDraft: ref(), typographySave: ref(),
    viewport: { current: { ownerDocument: { defaultView: ownerWindow }, classList: { remove() {} } } }, window: ownerWindow,
    suppressLayoutMotionUntil: ref(), suppressAutoFitUntil: ref(), preserveCameraOnNextLayout: ref(), sceneMotion: { cancelAll() {} }, setLayoutRevision() {},
    layoutSaveTimer: ref(), layoutDraft: ref(), hoverIntentTimer: ref(), edgeTooltipTimer: ref(), sceneTransitionTimer: ref(), cameraFrame: ref(), cameraFrameWindow: ref() };
  const quick = quickTypographyCallbacks(dependencies);
  quick.change({ baseFontSize: 18 }); quick.change({ maxLabelLength: 60 });
  plugin.stageTypographyOverride("tablet", { maxWidth: 500 });
  plugin.settings.typographyProfiles = m.resetTypographyOverride(plugin.settings.typographyProfiles, "desktop");
  quick.unmount(); assert.equal(saves, 1); assert.equal(timers.size, 0); assert.equal(plugin.settings.typographyProfiles.desktop, undefined);
  release(); await Promise.resolve(); assert.equal(plugin.settings.typographyProfiles.tablet.maxWidth, 500);
  quick.change({ wrapNodeLabels: false }); const pending = [...timers.values()][0]; pending(); timers.clear();
  assert.equal(saves, 2); quick.unmount(); assert.equal(saves, 2, "Started save must not flush twice on unmount"); release(); await Promise.resolve();
});
