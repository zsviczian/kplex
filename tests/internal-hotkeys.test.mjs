/** Contracts for additive shortcut persistence, platform modifiers and projected spatial selection. */
import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const temp = mkdtempSync(join(tmpdir(), "kplex-hotkeys-"));
await build({ stdin: { contents: 'export * from "./src/core/plex/internalHotkeys"; export * from "./src/core/plex/keyboardNavigation"; export * from "./src/settings"; export * from "./src/core/graph/settingsPolicy";', resolveDir: process.cwd() },
  outfile: join(temp, "contracts.mjs"), bundle: true, platform: "node", format: "esm",
  plugins: [{ name: "host-types-only", setup(builder) {
    builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "stub" }));
    builder.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: `
      export class App {} export class ButtonComponent {} export class Modal {} export class Notice {} export class AbstractInputSuggest {} export class Setting {}
      export class ExtraButtonComponent {} export class Scope {}
      export class SearchComponent {} export const setIcon = () => {}; export const setTooltip = () => {};
      export class PluginSettingTab {} export const getIcon = () => null; export const getIconIds = () => [];
      export const getLanguage = () => "en"; export const Platform = {};
    `, loader: "js" }));
  } }],
});
const hotkeys = await import(pathToFileURL(join(temp, "contracts.mjs")));
test.after(() => rmSync(temp, { recursive: true, force: true }));

/** Plain key events exercise production matcher independently of a browser/host keymap. */
const event = (key, modifiers = {}) => ({ key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...modifiers });

test("defaults, explicit disable, partial upgrades, malformed bindings and unknown future actions round-trip", () => {
  const defaults = hotkeys.migrateAndMergeSettings(undefined);
  assert.equal(hotkeys.resolveInternalHotkey(event("ArrowUp"), defaults.internalHotkeys, "macos"), "moveUp");
  const saved = hotkeys.migrateAndMergeSettings({ internalHotkeys: {
    moveUp: null, moveDown: { key: "J", modifiers: [] }, sectionLeft: { key: "ArrowLeft", modifiers: ["broken"] },
    sectionRight: { key: "Shift" }, focusFind: { key: "", modifiers: [] }, futureAction: { key: "F8" },
  } });
  assert.equal(saved.internalHotkeys.moveUp, null);
  assert.deepEqual(saved.internalHotkeys.moveDown, { key: "j", modifiers: [] });
  assert.deepEqual(saved.internalHotkeys.sectionLeft, defaults.internalHotkeys.sectionLeft);
  assert.deepEqual(saved.internalHotkeys.sectionRight, defaults.internalHotkeys.sectionRight);
  assert.deepEqual(saved.internalHotkeys.focusFind, defaults.internalHotkeys.focusFind);
  assert.deepEqual(saved.internalHotkeys.futureAction, { key: "F8" });
  assert.deepEqual(hotkeys.migrateAndMergeSettings(JSON.parse(JSON.stringify(saved))), saved);
  assert.equal(hotkeys.resolveInternalHotkey(event("ArrowUp"), saved.internalHotkeys, "macos"), null);
  assert.equal(hotkeys.resolveInternalHotkey(event("j"), saved.internalHotkeys, "macos"), "moveDown");
  assert.deepEqual(hotkeys.importExcaliBrainGraphSettings({ internalHotkeys: { moveUp: { key: "x" } } }, saved).internalHotkeys, saved.internalHotkeys);
  const effects = hotkeys.classifySettingsChange(hotkeys.captureSettingsPolicy(defaults), hotkeys.captureSettingsPolicy(saved));
  assert.equal(effects.semanticInvalidation, false); assert.equal(effects.searchTerms, false); assert.equal(effects.presentationFacets, false);
});

test("exact modifiers distinguish area selection from creation across desktop and mobile keyboard conventions", () => {
  const bindings = hotkeys.sanitizeInternalHotkeys(undefined);
  for (const [key, action] of [["ArrowUp", "addParent"], ["ArrowDown", "addChild"], ["ArrowLeft", "addFriend"], ["ArrowRight", "addChallenger"]]) {
    for (const convention of ["macos", "ios", "windows", "android", "unknown"]) {
      const mac = convention === "macos" || convention === "ios";
      assert.equal(hotkeys.resolveInternalHotkey(event(key, { ctrlKey: !mac, metaKey: mac }), bindings, convention), action);
      assert.equal(hotkeys.resolveInternalHotkey(event(key, { ctrlKey: mac, metaKey: !mac }), bindings, convention), null);
    }
  }
  assert.equal(hotkeys.resolveInternalHotkey(event("ArrowLeft", { altKey: true }), bindings, "macos"), "sectionLeft");
  assert.equal(hotkeys.resolveInternalHotkey(event("ArrowUp", { altKey: true, metaKey: true }), bindings, "macos"), null);
  assert.equal(hotkeys.resolveInternalHotkey(event("Enter", { shiftKey: true }), bindings, "macos"), null);
  assert.equal(hotkeys.resolveInternalHotkey(event("f", { metaKey: true }), bindings, "macos"), "focusFind");
  assert.equal(hotkeys.resolveInternalHotkey(event("F4"), bindings, "windows"), "focusSearch");
});

test("recorded chords survive Option-produced characters and preserve secondary platform modifiers", () => {
  const chord = hotkeys.captureInternalHotkey(event("å", { code: "KeyA", altKey: true, metaKey: true }), "macos");
  assert.deepEqual(chord, { key: "a", modifiers: ["mod", "alt"] });
  assert(hotkeys.matchesInternalHotkey(event("å", { code: "KeyA", altKey: true, metaKey: true }), chord, "macos"));
  assert.equal(hotkeys.captureInternalHotkey(event("Dead"), "macos"), null);
  assert.deepEqual(hotkeys.captureInternalHotkey(event("x", { ctrlKey: true }), "macos"), { key: "x", modifiers: ["ctrl"] });
});

/** Projected rows model repacked filters and overflow without introducing hidden placeholders. */
const node = (id, section, x, y) => ({ id, section, x, y });
const nodes = [node("center", "center", 0, 0), node("p1", "parent", -40, -200), node("p2", "parent", 40, -200),
  node("p3", "parent", -40, -160), node("p4", "parent", 40, -160), node("c", "child", 0, 200),
  node("l", "left", -300, 0), node("r", "right", 300, 0), node("s", "sibling", 600, 0)];

test("arrows stay within displayed areas and modifier jumps enter areas from a fresh center", () => {
  const move = (id, direction, sections = false, projection = nodes) => hotkeys.moveKeyboardSelection(projection, id, direction, sections);
  assert.equal(move(null, "up"), "center"); assert.equal(move(null, "up", true), "p3"); assert.equal(move("p3", "up"), "p1");
  assert.equal(move("p1", "right"), "p2"); assert.equal(move("p2", "down"), "p4");
  assert.equal(move("p4", "down"), "p4"); assert.equal(move("p4", "left"), "p3");
  assert.equal(move("p4", "down", true), "center"); assert.equal(move("center", "left", true), "l");
  assert.equal(move("r", "right", true), "s"); assert.equal(move("s", "left", true), "r");
  assert.equal(move("center", "right", true, nodes.filter(n => n.section !== "right")), "s");
  assert.equal(move("deleted", "down"), "center");
  assert.equal(hotkeys.moveKeyboardSelection([], null, "down", false), null);
  const reflowed = [nodes[0], node("p2", "parent", -40, -200), node("p4", "parent", -40, -160)];
  assert.equal(move("p2", "down", false, reflowed), "p4");
});
