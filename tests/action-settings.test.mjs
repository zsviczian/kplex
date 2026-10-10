/**
 * Exercises production action preference drafts, recording and apply callbacks with real portable
 * binding compilation. Bounded native doubles isolate host rendering without claiming Scope precedence.
 */
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import ts from "typescript";
import test from "node:test";

const temporary = mkdtempSync(join(tmpdir(), "kplex-action-settings-"));
process.on("exit", /** Test-only compiled portable contracts never remain in the repository. */ () => rmSync(temporary, { recursive: true, force: true }));
await build({ stdin: { contents: 'export * from "./src/core/plex/actionPreferences"; export * from "./src/core/plex/actions"; export * from "./src/ui/actionShortcutConflicts"; export * from "./src/adapters/obsidian/actionHotkeys";', resolveDir: fileURLToPath(new URL("..", import.meta.url)) }, outfile: join(temporary, "contracts.mjs"), bundle: true, platform: "node", format: "esm" });
const contracts = await import(pathToFileURL(join(temporary, "contracts.mjs")));

/** Compile the actual focused production method without evaluating a native modal constructor. */
function production(name, dependencies = {}, path = "src/ui/actionSettingsPreferences.ts") {
  const source = ts.createSourceFile(path, readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let expression;
  /** Find the selected implementation while preserving its asynchronous branches. */
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) expression = node.getText(source).replace(/^export\s+/, "");
    if (ts.isMethodDeclaration(node) && node.name.getText(source) === name) {
      const text = node.getText(source);
      expression = `${node.modifiers?.some(item => item.kind === ts.SyntaxKind.AsyncKeyword) ? "async " : ""}function ${name}${text.slice(text.indexOf("("))}`;
    }
    ts.forEachChild(node, visit);
  }
  visit(source); assert(expression, name);
  const compiled = ts.transpileModule(`const selected = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.None } }).outputText;
  return Function(...Object.keys(dependencies), `${compiled}; return selected;`)(...Object.values(dependencies));
}
const cloneValue = production("clonePreferenceValue", {});
const clone = production("cloneActionPreferenceDraft", { clonePreferenceValue: cloneValue });
const stage = production("stageActionBinding", { cloneActionPreferenceDraft: clone, ACTION_BINDING_DEFAULTS: contracts.ACTION_BINDING_DEFAULTS, compileActionBindings: contracts.compileActionBindings });

/** Use real fresh defaults with platform-explicit migration instead of a success-only compiler stub. */
function preferences() { return contracts.migrateActionPreferences(null, "windows").preferences; }

/** Expose a pending persistence operation to prove Apply takes its guard before awaiting. */
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }

/** Keep host presentation facts explicit and independent from the process OS. */
function environment() { return { keyConvention: "windows" }; }

test("draft cloning preserves disabled, absent, unknown and publication preferences without platform reinterpretation", () => {
  const saved = preferences(); saved.localBindings["selection.move.up"] = [];
  saved.localBindings["future.action"] = [{ match: "code", value: "KeyX", modifiers: ["meta"] }];
  saved.publishedCommands["search.focus"] = false; saved.publishedCommands["future.action"] = true;
  saved.legacyUnknown = { future: { values: [1, 2] } };
  const draft = clone(saved); assert.deepEqual(draft, saved); assert.notEqual(draft, saved);
  draft.localBindings["future.action"][0].modifiers.push("shift"); draft.legacyUnknown.future.values.push(3);
  assert.deepEqual(saved.localBindings["future.action"][0].modifiers, ["meta"]); assert.deepEqual(saved.legacyUnknown.future.values, [1, 2]);
});

test("staging reports a contextual overlap without mutating either saved assignment", () => {
  const saved = preferences(), before = clone(saved);
  const staged = stage(saved, "pin.toggle", { match: "key", value: "r", modifiers: ["alt"] }, "windows");
  assert.deepEqual(saved, before); assert(staged.conflicts.some(conflict => conflict.first === "node.rename" && conflict.second === "pin.toggle" || conflict.second === "node.rename" && conflict.first === "pin.toggle"));
});

test("four-binding maximum and duplicate choices never discard earlier preferences", () => {
  const saved = preferences(); saved.localBindings["pin.toggle"] = Array.from({ length: 4 }, (_, index) => ({ match: "key", value: `F${index + 5}`, modifiers: [] }));
  assert.equal(stage(saved, "pin.toggle", { match: "key", value: "F12", modifiers: [] }, "windows"), null);
  const short = preferences(), original = short.localBindings["pin.toggle"] ?? contracts.ACTION_BINDING_DEFAULTS["pin.toggle"];
  const repeated = stage(short, "pin.toggle", original[0], "windows"); assert.equal(repeated.draft.localBindings["pin.toggle"]?.length ?? original.length, original.length);
});

test("changed filter compares local and publication overrides independently of translated labels", () => {
  const changed = production("actionPreferenceChanged", { ACTION_BINDING_DEFAULTS: contracts.ACTION_BINDING_DEFAULTS }), action = contracts.ACTION_BY_ID.get("search.focus"), saved = preferences();
  assert.equal(changed(saved, action), false); saved.publishedCommands[action.id] = false; assert.equal(changed(saved, action), true);
  delete saved.publishedCommands[action.id]; saved.localBindings[action.id] = []; assert.equal(changed(saved, action), true);
});

test("failed immediate save preserves live preferences and offers a rebased explicit retry", async () => {
  const saved = preferences(), notices = new Map(), retries = new Map();
  const edit = draft => { draft.localBindings["pin.toggle"] = []; };
  const context = { rows: new Set([{}]), saving: false, capturedAliases: new Map(), pruneCapturedAliases() {}, epoch: 1, unsupported: () => false, notices, retries, refresh() {},
    plugin: { settings: { actionPreferences: saved }, translator: (key, args) => `${key}:${args?.error ?? ""}`, updateActionPreferences: async () => { throw new Error("Disk failure"); } } };
  await production("save", { readObsidianPresentationEnvironment: environment, compileActionBindings: contracts.compileActionBindings, cloneActionPreferenceDraft: clone }, "src/ui/ActionSettingsController.ts").call(context, "pin.toggle", edit);
  assert.equal(context.plugin.settings.actionPreferences, saved); assert.equal(context.saving, false);
  assert.equal(notices.get("pin.toggle"), "actions.saveFailed:Disk failure"); assert.equal(retries.get("pin.toggle"), edit);
});

test("immediate edits acquire single-flight before await and install only a confirmed complete save", async () => {
  const saved = preferences(), hold = deferred(); let calls = 0;
  const context = { rows: new Set([{}]), saving: false, capturedAliases: new Map(), pruneCapturedAliases() {}, epoch: 1, unsupported: () => false, notices: new Map(), retries: new Map(), refresh() {},
    plugin: { settings: { actionPreferences: saved }, translator: key => key, updateActionPreferences: async value => { calls++; await hold.promise; context.plugin.settings.actionPreferences = value; } } };
  const save = production("save", { readObsidianPresentationEnvironment: environment, compileActionBindings: contracts.compileActionBindings, cloneActionPreferenceDraft: clone }, "src/ui/ActionSettingsController.ts").bind(context);
  const first = save("pin.toggle", draft => { draft.localBindings["pin.toggle"] = []; }), second = save("pin.toggle", assert.fail);
  assert.equal(calls, 1); assert.equal(context.plugin.settings.actionPreferences, saved);
  hold.resolve(); await Promise.all([first, second]); assert.deepEqual(context.plugin.settings.actionPreferences.localBindings["pin.toggle"], []);
  assert.equal(context.notices.get("pin.toggle"), "actions.saved");
});

test("unsupported future preferences and retired render generations cannot save or receive late UI", async () => {
  const save = production("save", { readObsidianPresentationEnvironment: environment, compileActionBindings: contracts.compileActionBindings, cloneActionPreferenceDraft: clone }, "src/ui/ActionSettingsController.ts");
  const context = { rows: new Set([{}]), saving: false, capturedAliases: new Map(), pruneCapturedAliases() {}, epoch: 1, unsupported: () => true };
  await save.call(context, "pin.toggle", assert.fail); context.unsupported = () => false; const hold = deferred(); context.notices = new Map(); context.retries = new Map(); context.refresh = () => {};
  context.plugin = { settings: { actionPreferences: preferences() }, translator: key => key, updateActionPreferences: async () => { await hold.promise; throw new Error("Late failure"); } };
  const pending = save.call(context, "pin.toggle", draft => { draft.localBindings["pin.toggle"] = []; });
  context.epoch++; context.notices.clear(); hold.resolve(); await pending; assert.equal(context.notices.size, 0); assert.equal(context.retries.size, 0);
});

test("shortcut search normalizes platform Mod while preserving logical versus physical matching", () => {
  const matches = production("actionMatchesShortcut", { matchesActionBinding: contracts.matchesActionBinding }, "src/ui/ActionSettingsController.ts");
  assert.equal(matches([{ match: "key", value: "f", modifiers: ["ctrl"] }], { match: "key", value: "F", modifiers: ["mod"] }, "windows"), true);
  assert.equal(matches([{ match: "key", value: "f", modifiers: ["meta"] }], { match: "key", value: "F", modifiers: ["mod"] }, "macos"), true);
  assert.equal(matches([{ match: "code", value: "KeyF", modifiers: ["mod"] }], { match: "key", value: "f", modifiers: ["mod"] }, "windows"), false);
});

test("captured Option collisions require actual code facts and overlapping effective action contexts", () => {
  const matches = production("actionMatchesShortcut", { matchesActionBinding: contracts.matchesActionBinding }, "src/ui/ActionSettingsController.ts");
  const conflicts = production("recordedActionConflicts", { ACTION_BY_ID: contracts.ACTION_BY_ID, ACTION_CATALOG: contracts.ACTION_CATALOG,
    effectiveActionBindings: contracts.effectiveActionBindings, actionBindingContexts: contracts.actionBindingContexts, actionMatchesShortcut: matches }, "src/ui/ActionSettingsController.ts");
  const saved = preferences(), logical = {match: "key", value: "®", modifiers: ["alt"]}, physical = {match: "code", value: "KeyR", modifiers: ["alt"]};
  saved.localBindings["pin.toggle"] = [logical];
  saved.localBindings["ontology.assign.parent"] = [physical];
  const before = clone(saved);
  assert.deepEqual(conflicts(saved, "pin.toggle", logical, [logical, physical], "macos").map(conflict => conflict.second), ["node.rename"]);
  assert.deepEqual(conflicts(saved, "pin.toggle", logical, [logical], "macos"), [], "An Option glyph alone cannot prove its physical position");
  assert.deepEqual(saved, before, "Collision inspection does not alter saved bindings or command publication");
  saved.localBindings["node.rename"] = [];
  assert.deepEqual(conflicts(saved, "pin.toggle", logical, [logical, physical], "macos"), [], "Disjoint editor-only routes do not conflict with graph shortcuts");
  saved.characterShortcutsEnabled = false;
  const character = {match: "key", value: "r", modifiers: []}, characterCode = {match: "code", value: "KeyR", modifiers: []};
  saved.localBindings["pin.toggle"] = [character]; saved.localBindings["node.rename"] = [characterCode];
  assert.deepEqual(conflicts(saved, "pin.toggle", character, [character, characterCode], "macos"), [], "Disabled text shortcuts do not create executable collisions");
});

test("recorder gives Tab traversal, composition and AltGraph back to native controls", () => {
  let prevented = 0, choices = 0;
  const context = { opened: true, recording: true, match: "key", accepted: new WeakSet(), modalEl: { ownerDocument: {} }, choose: () => choices++, close() {} };
  const record = production("record", { captureActionBinding: contracts.captureActionBinding, isModifiedPhysicalDeadKey: contracts.isModifiedPhysicalDeadKey, readObsidianPresentationEnvironment: environment }, "src/ui/ShortcutRecorder.ts").bind(context);
  const event = { key: "Tab", code: "Tab", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, isComposing: false, repeat: false, getModifierState: () => false, preventDefault: () => prevented++, stopPropagation() {} };
  assert.equal(record(event), undefined); assert.equal(prevented, 0); assert.equal(context.recording, false);
  context.recording = true; event.key = "a"; event.isComposing = true; assert.equal(record(event), undefined); event.isComposing = false; event.getModifierState = () => true; assert.equal(record(event), undefined);
  assert.equal(prevented, 0); assert.equal(choices, 0);
});

test("one recorded event delivered by native and DOM routes chooses one binding; repeat never chooses", () => {
  const choices = [], context = { opened: true, recording: true, match: "code", accepted: new WeakSet(), modalEl: { ownerDocument: {} }, choose: value => choices.push(value), close() {} };
  const record = production("record", { captureActionBinding: contracts.captureActionBinding, isModifiedPhysicalDeadKey: contracts.isModifiedPhysicalDeadKey, readObsidianPresentationEnvironment: environment }, "src/ui/ShortcutRecorder.ts").bind(context);
  const event = { key: "ö", code: "KeyP", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, isComposing: false, repeat: false, getModifierState: () => false, preventDefault() {}, stopPropagation() {} };
  record(event); record(event); assert.deepEqual(choices, [{ match: "code", value: "KeyP", modifiers: ["mod"] }]);
  record({ ...event, repeat: true }); assert.equal(choices.length, 1);
});

test("recording retains selected save semantics while returning detached logical and physical search facts", () => {
  const choices = [], context = { opened: true, recording: true, match: "key", accepted: new WeakSet(), modalEl: { ownerDocument: {} }, choose: (...values) => choices.push(values), close() {} };
  const record = production("record", { captureActionBinding: contracts.captureActionBinding, isModifiedPhysicalDeadKey: contracts.isModifiedPhysicalDeadKey, readObsidianPresentationEnvironment: () => ({keyConvention: "macos"}) }, "src/ui/ShortcutRecorder.ts").bind(context);
  const event = { key: "®", code: "KeyR", ctrlKey: false, metaKey: false, altKey: true, shiftKey: false, isComposing: false, repeat: false, getModifierState: () => false, preventDefault() {}, stopPropagation() {} };
  record(event); record(event);
  assert.equal(choices.length, 1);
  assert.deepEqual(choices[0], [{match: "key", value: "®", modifiers: ["alt"]}, [{match: "key", value: "®", modifiers: ["alt"]}, {match: "code", value: "KeyR", modifiers: ["alt"]}]]);
  event.key = "changed"; event.code = "KeyQ"; event.altKey = false;
  assert.equal(choices[0][1][0].value, "®"); assert.equal(choices[0][1][1].value, "KeyR");
  assert.equal(choices[0][1].includes(event), false, "Search alternatives contain persistable values rather than the live event");
});

test("ontology assignment acquires synchronously and a dismissed durable save has no late UI", async () => {
  let release, writes = 0;
  const completion = new Promise(resolve => { release = resolve; });
  const context = { opened: true, busy: false, generation: 1, fieldName: "Topic", saveButton: { setDisabled() {} },
    onSaved: assert.fail, close: assert.fail, plugin: { assignFieldToOntology: async () => { writes++; await completion; } } };
  const save = production("save", { Notice: class { constructor() { assert.fail("late Notice"); } } }, "src/ui/AddToOntologyModal.ts").bind(context);
  const first = save("child"), duplicate = save("parent"); assert.equal(writes, 1); assert.equal(context.busy, true);
  context.opened = false; release(); await Promise.all([first, duplicate]); assert.equal(context.busy, false);
});

test("ontology assignment failure retains its shell and permits explicit retry without unhandled rejection", async () => {
  const notices = [], disabled = [];
  const context = { opened: true, busy: false, generation: 1, fieldName: "Topic", saveButton: { setDisabled: value => disabled.push(value) },
    onSaved: assert.fail, close: assert.fail, plugin: { assignFieldToOntology: async () => { throw new Error("expected save failure"); }, translator: key => key } };
  const save = production("save", { Notice: class { constructor(message) { notices.push(message); } } }, "src/ui/AddToOntologyModal.ts").bind(context);
  await save("child"); assert.deepEqual(notices, ["actions.failed"]); assert.deepEqual(disabled, [true, false]); assert.equal(context.busy, false);
  context.opened = false; await save("child"); assert.equal(notices.length, 1);
});

test("ontology shells release each native invocation exactly once", () => {
  for (const path of ["src/ui/AddToOntologyModal.ts"]) {
    let closes = 0;
    const context = { opened: true, recorder: null, releasePreferences: null, pendingBinding: null, contentEl: { empty() {} }, onClosed: () => closes++ };
    const close = production("onClose", {}, path).bind(context);
    close(); close(); assert.equal(closes, 1); context.opened = true; close(); assert.equal(closes, 2);
  }
});

/** Real DOM shell for the public native Setting render contract; production controls/recorder stay intact. */
async function settingsBrowser(keyConvention = "windows") {
  const { chromiumHarness } = await import("./support/browserTypeScript.mjs");
  const host = `
    export const Platform={isMobile:false,isMacOS:${keyConvention === "macos"},isWin:${keyConvention === "windows"},isIosApp:false,isAndroidApp:false};
    export function setIcon(el,name){el.setAttribute('data-icon',name)} export function setTooltip(el,text){el.setAttribute('aria-label',text)}
    export class Scope{constructor(){this.handlers=[]}register(modifiers,key,callback){const value={callback};this.handlers.push(value);return value}unregister(value){this.handlers=this.handlers.filter(x=>x!==value)}}
    export class Modal{constructor(app){this.app=app;this.scope=new Scope();this.modalEl=document.createElement('div');this.modalEl.className='modal';this.contentEl=this.modalEl.appendChild(document.createElement('div'));this.contentEl.className='modal-content'}setTitle(){}open(){document.body.append(this.modalEl);this.onOpen?.()}close(){this.onClose?.();this.modalEl.remove()}}
    export class ButtonComponent{constructor(parent){this.buttonEl=parent.createEl('button',{attr:{type:'button'}})}setButtonText(value){this.buttonEl.textContent=value;return this}}
    export class SearchComponent{constructor(parent){this.inputEl=parent.createDiv({cls:'search-input-container'}).createEl('input')}setPlaceholder(value){this.inputEl.placeholder=value;return this}onChange(fn){this.inputEl.addEventListener('input',()=>fn(this.inputEl.value));return this}setValue(value){this.inputEl.value=value;return this}}
    export class Setting{constructor(parent){this.components=[];this.settingEl=parent.createDiv({cls:'setting-item'});this.infoEl=this.settingEl.createDiv({cls:'setting-item-info'});this.nameEl=this.infoEl.createDiv({cls:'setting-item-name'});this.descEl=this.infoEl.createDiv({cls:'setting-item-description'});this.controlEl=this.settingEl.createDiv({cls:'setting-item-control'})}setClass(value){this.settingEl.classList.add(value);return this}setName(value){this.nameEl.textContent=value;return this}setDesc(value){this.description=value;this.descEl.textContent=value;return this}addDropdown(cb){const selectEl=this.controlEl.createEl('select');const component={selectEl,addOption(value,text){const option=selectEl.createEl('option',{text});option.value=value;return this},setValue(value){selectEl.value=value;return this},getValue(){return selectEl.value}};this.components.push(component);cb(component);return this}addToggle(cb){const input=this.controlEl.createEl('input');input.type='checkbox';let changeCallback;const component={setValue(v){if(input.checked!==v){input.checked=v;changeCallback?.(v)}return this},setDisabled(v){input.disabled=v;return this},onChange(fn){changeCallback=fn;input.addEventListener('change',()=>fn(input.checked));return this}};this.components.push(component);cb(component);return this}}
  `;
  const built = await build({ stdin: { contents: `export {ActionSettingsController,actionMatchesShortcut} from './src/ui/ActionSettingsController'; export {ACTION_CATALOG,ACTION_BY_ID} from './src/core/plex/actions'; export {migrateActionPreferences,ACTION_BINDING_DEFAULTS} from './src/core/plex/actionPreferences'; export {englishCatalog} from './src/lang/en'; export {createTranslator} from './src/lang'; export {Setting} from 'obsidian'; export {readObsidianActionHotkeys} from './src/adapters/obsidian/actionHotkeys';`, resolveDir: fileURLToPath(new URL("..", import.meta.url)) }, bundle: true, write: false, platform: "browser", format: "iife", globalName: "sourceModules", plugins: [{ name: "native-setting-shell", setup(builder) { builder.onResolve({filter:/^obsidian$/},()=>({path:"host",namespace:"host"})); builder.onLoad({filter:/.*/,namespace:"host"},()=>({contents:host,loader:"js"})); } }] });
  const browser = await chromiumHarness(built.outputFiles[0].text);
  await browser.evaluate(`(()=>{
    window.settingMigrations=new Map();window.settingMigrationCallbacks=new Map();const p=HTMLElement.prototype;p.onWindowMigrated=function(callback){const callbacks=settingMigrationCallbacks.get(this)??new Set();callbacks.add(callback);settingMigrationCallbacks.set(this,callbacks);settingMigrations.set(this,(...args)=>{for(const fn of callbacks)fn(...args)});return()=>{callbacks.delete(callback);if(!callbacks.size){settingMigrations.delete(this);settingMigrationCallbacks.delete(this)}}};
    p.setAttr=function(k,v){this.setAttribute(k,v)};p.addClass=function(...names){this.classList.add(...names)};p.toggleClass=function(name,on){this.classList.toggle(name,on)};p.empty=function(){this.replaceChildren()};p.setText=function(text){this.textContent=text};
    p.createEl=function(tag,options={}){const el=this.ownerDocument.createElement(tag);if(options.cls)el.className=options.cls;if(options.text)el.textContent=options.text;for(const[k,v]of Object.entries(options.attr??{}))el.setAttribute(k,v);this.append(el);return el};p.createDiv=function(options){return this.createEl('div',options)};p.createSpan=function(options){return this.createEl('span',options)};
    const {ActionSettingsController,migrateActionPreferences,Setting,createTranslator}=sourceModules;
    window.makeSettings=()=>{const listeners=new Set(),calls=[];const nativeListeners=new Set(),customHotkeys={},defaultHotkeys={},nativeCommands={},nativeReads={custom:0,defaults:0};const app={vault:{configDir:'.obsidian',on(name,callback){const ref={name,callback};nativeListeners.add(ref);return ref},offref(ref){nativeListeners.delete(ref)}},hotkeyManager:{getHotkeys(id){nativeReads.custom++;return customHotkeys[id]},getDefaultHotkeys(id){nativeReads.defaults++;return defaultHotkeys[id]}},commands:{commands:nativeCommands}};const plugin={app,manifest:{id:'k-plex'},registration:new Map(),isActionPublished(id){return this.registration.get(id)??true},settings:{actionPreferences:migrateActionPreferences(null,${JSON.stringify(keyConvention)}).preferences},translator:createTranslator('en'),subscribeActionPreferences(fn){listeners.add(fn);return()=>listeners.delete(fn)},async updateActionPreferences(value){calls.push(value);this.settings.actionPreferences=value;for(const [id,published]of Object.entries(value.publishedCommands))this.registration.set(id,published);for(const fn of listeners)fn()}};
      const controller=new ActionSettingsController(plugin),definition=controller.getSettingDefinitions();const page=document.body.createDiv({cls:'kplex-action-settings'}),list=page.createDiv();
      const rows=[],releases=[];for(const item of definition.items){const setting=new Setting(list);rows.push(setting);releases.push(item.render(setting,{listEl:list}))}const input=page.querySelector('[data-kplex-action-search]'),header=page.querySelector('.kplex-action-settings-header');return{controller,plugin,definition,page,list,header,input,listeners,calls,rows,releases,nativeListeners,customHotkeys,defaultHotkeys,nativeCommands,nativeReads};};
  })()`);
  return browser;
}

test("native hotkey search finds physical defaults and logical Option glyphs without saving or changing add semantics", async () => {
  const browser = await settingsBrowser("macos");
  try {
    const result = await browser.evaluate(`(async()=>{
      const s=makeSettings();
      s.plugin.settings.actionPreferences.localBindings['node.copy-link']=[{match:'key',value:'®',modifiers:['alt']}];s.controller.refresh();
      const before=JSON.stringify(s.plugin.settings.actionPreferences);
      s.header.querySelector('[data-kplex-action-control=search-hotkey]').click();
      const recorder=s.controller.recorder,area=recorder.contentEl.querySelector('[role=group]');area.focus();
      area.dispatchEvent(new KeyboardEvent('keydown',{key:'®',code:'KeyR',altKey:true,bubbles:true,cancelable:true}));
      const visible=[...s.list.querySelectorAll('[data-action-id]:not(.kplex-action-filtered)')].map(row=>row.dataset.actionId).sort();
      const physicalAndLogical=JSON.stringify(visible)===JSON.stringify(['node.copy-link','node.rename']);
      const readable=s.input.value==='⌥ R',noSave=s.calls.length===0&&before===JSON.stringify(s.plugin.settings.actionPreferences),closed=!recorder.modalEl.isConnected;
      s.input.value='';s.input.dispatchEvent(new Event('input'));const clearSearch=s.list.querySelectorAll('.kplex-action-filtered').length===0;
      s.list.querySelector('[data-action-id="actions.configure"] [data-kplex-action-control=add]').click();
      const addRecorder=s.controller.recorder,addArea=addRecorder.contentEl.querySelector('[role=group]'),addMode=addRecorder.contentEl.querySelector('select');addMode.value='key';addMode.dispatchEvent(new Event('change'));addArea.focus();
      addArea.dispatchEvent(new KeyboardEvent('keydown',{key:'ß',code:'KeyS',altKey:true,bubbles:true,cancelable:true}));
      for(let turn=0;s.controller.saving&&turn<20;turn++)await Promise.resolve();
      const selectedLogicalSaved=s.calls.length===1&&JSON.stringify(s.plugin.settings.actionPreferences.localBindings['actions.configure'])===JSON.stringify([{match:'key',value:'ß',modifiers:['alt']}]);
      s.controller.dispose();s.page.remove();return{physicalAndLogical,readable,noSave,closed,clearSearch,selectedLogicalSaved,clean:s.listeners.size===0&&settingMigrations.size===0};
    })()`);
    assert.deepEqual(result, {physicalAndLogical: true, readable: true, noSave: true, closed: true, clearSearch: true, selectedLogicalSaved: true, clean: true});
  } finally { await browser.cleanup(); }
});

test("recorded Option overlaps save both assignments and keep exact event evidence visible until removal or session teardown", async () => {
  const browser = await settingsBrowser("macos");
  try {
    const result = await browser.evaluate(`(async()=>{
      const s=makeSettings(),c=s.controller,defaults=sourceModules.ACTION_BINDING_DEFAULTS;
      s.plugin.settings.actionPreferences.localBindings['node.rename']=[...defaults['node.rename'],{match:'key',value:'F11',modifiers:[]}];c.refresh();
      const pin=s.list.querySelector('[data-action-id="pin.toggle"]'),rename=s.list.querySelector('[data-action-id="node.rename"]');
      pin.querySelector('[data-kplex-action-control=add]').click();const recorder=c.recorder,area=recorder.contentEl.querySelector('[role=group]'),mode=recorder.contentEl.querySelector('select');mode.value='key';mode.dispatchEvent(new Event('change'));area.focus();area.dispatchEvent(new KeyboardEvent('keydown',{key:'®',code:'KeyR',altKey:true,bubbles:true,cancelable:true}));for(let n=0;c.saving&&n<20;n++)await Promise.resolve();
      const saved=s.calls.length===1&&s.plugin.settings.actionPreferences.localBindings['pin.toggle'].some(binding=>binding.match==='key'&&binding.value==='®')&&s.plugin.settings.actionPreferences.localBindings['node.rename'][0].value==='KeyR';
      const bothRed=Boolean(pin.querySelector('.has-conflict'))&&Boolean(rename.querySelector('.has-conflict'));
      const visible=pin.querySelector('.kplex-action-diagnostic-error').textContent.includes(s.plugin.translator('actions.node.rename'))&&rename.querySelector('.kplex-action-diagnostic-error').textContent.includes(s.plugin.translator('actions.pin.toggle'));
      const noReplacement=!pin.textContent.includes(s.plugin.translator('actions.replaceConflicts'))&&!pin.querySelector('.kplex-action-feedback button');
      const filter=s.header.querySelector('[data-kplex-action-filter=conflicts]');filter.click();const filtered=filter.textContent==='Conflicts (2)'&&filter.classList.contains('is-active')&&filter.classList.contains('kplex-action-conflicts-filter');
      const glyph=[...pin.querySelectorAll('.setting-hotkey')].find(chip=>chip.textContent.includes('®'));glyph.click();for(let n=0;c.saving&&n<20;n++)await Promise.resolve();
      const removedOnlyOne=!rename.querySelector('.has-conflict')&&!pin.querySelector('.has-conflict')&&s.plugin.settings.actionPreferences.localBindings['node.rename'][0].value==='KeyR'&&c.capturedAliases.size===0;
      c.dispose();s.page.remove();return{saved,bothRed,visible,noReplacement,filtered,removedOnlyOne,clean:s.listeners.size===0&&settingMigrations.size===0};
    })()`);
    assert.deepEqual(result,{saved:true,bothRed:true,visible:true,noReplacement:true,filtered:true,removedOnlyOne:true,clean:true});
  } finally {await browser.cleanup();}
});

test("failed overlapping additions retry against fresh bindings without replacing either action", async () => {
  const browser=await settingsBrowser("macos");
  try {
    const result=await browser.evaluate(`(async()=>{
      const s=makeSettings(),c=s.controller,original=s.plugin.updateActionPreferences,logical={match:'key',value:'®',modifiers:['alt']},physical={match:'code',value:'KeyR',modifiers:['alt']};
      s.plugin.updateActionPreferences=async()=>{throw new Error('Disk failure')};c.chooseBinding('pin.toggle',logical,document,[logical,physical]);for(let n=0;c.saving&&n<20;n++)await Promise.resolve();
      const failed=c.retries.has('pin.toggle')&&!s.plugin.settings.actionPreferences.localBindings['pin.toggle']&&c.capturedAliases.size===0;
      s.plugin.settings.actionPreferences.localBindings['pin.toggle']=[{match:'key',value:'F12',modifiers:[]}];s.plugin.settings.actionPreferences.localBindings['node.rename']=[physical,{match:'key',value:'F11',modifiers:[]}];s.plugin.updateActionPreferences=original;
      await c.save('pin.toggle',c.retries.get('pin.toggle'),document);const saved=s.plugin.settings.actionPreferences;
      const retained=s.calls.length===1&&saved.localBindings['pin.toggle'].length===2&&saved.localBindings['pin.toggle'].some(binding=>binding.value==='F12')&&saved.localBindings['pin.toggle'].some(binding=>binding.value==='®')&&saved.localBindings['node.rename'].length===2;
      const recoveredEvidence=Boolean(s.list.querySelector('[data-action-id="node.rename"] .has-conflict'))&&Boolean(s.list.querySelector('[data-action-id="pin.toggle"] .has-conflict'));
      c.dispose();s.page.remove();return{failed,retained,recoveredEvidence};
    })()`);
    assert.deepEqual(result,{failed:true,retained:true,recoveredEvidence:true});
  } finally {await browser.cleanup();}
});

test("external shortcut removal retires captured layout evidence before a later re-addition", async () => {
  const browser=await settingsBrowser("macos");
  try {
    const result=await browser.evaluate(`(async()=>{
      const s=makeSettings(),c=s.controller,logical={match:'key',value:'®',modifiers:['alt']},physical={match:'code',value:'KeyR',modifiers:['alt']};
      c.chooseBinding('pin.toggle',logical,document,[logical,physical]);for(let n=0;c.saving&&n<20;n++)await Promise.resolve();
      const recorded=c.capturedAliases.size===1&&Boolean(s.list.querySelector('[data-action-id="node.rename"] .has-conflict'));
      s.plugin.settings.actionPreferences.localBindings['pin.toggle']=[];for(const fn of s.listeners)fn();const removed=c.capturedAliases.size===0;
      s.plugin.settings.actionPreferences.localBindings['pin.toggle']=[logical];for(const fn of s.listeners)fn();
      const noGuess=c.capturedAliases.size===0&&!s.list.querySelector('[data-action-id="node.rename"] .has-conflict')&&!s.list.querySelector('[data-action-id="pin.toggle"] .has-conflict');
      c.dispose();s.page.remove();return{recorded,removed,noGuess,clean:s.listeners.size===0&&settingMigrations.size===0};
    })()`);
    assert.deepEqual(result,{recorded:true,removed:true,noGuess:true,clean:true});
  } finally {await browser.cleanup();}
});

test("actual declarative rows remain globally searchable while native group filters and exact render lifetimes stay local", async () => {
  const browser = await settingsBrowser();
  try {
    const result = await browser.evaluate(`(async()=>{
      const {ACTION_CATALOG,Setting}=sourceModules,s=makeSettings();
      const originalToggle=s.rows[1].controlEl.querySelector('input');const initialRenderDoesNotSave=s.calls.length===0&&s.controller.notices.size===0;s.plugin.settings.actionPreferences.characterShortcutsEnabled=false;s.controller.refresh();const externalRefreshDoesNotSave=s.calls.length===0&&!originalToggle.checked;s.plugin.settings.actionPreferences.characterShortcutsEnabled=true;s.controller.refresh();const definitions=s.definition.items.filter(item=>item.aliases?.some(alias=>ACTION_CATALOG.some(action=>action.id===alias)));
      const blankRow=s.list.querySelector('[data-action-id="actions.configure"]'),blank=blankRow.querySelector('.setting-command-hotkeys > span.setting-hotkey.mod-empty'),add=blankRow.querySelector('button.clickable-icon.setting-add-hotkey-button');const nativeDelete=s.list.querySelector('[data-action-id="pin.toggle"] button.setting-hotkey .setting-hotkey-icon.setting-delete-hotkey');const nativeChipMarkup=Boolean(nativeDelete)&&blank?.textContent==='Blank'&&add?.getAttribute('data-icon')==='plus-circle'&&add?.getAttribute('aria-label')==='Add local shortcut';
      const complete=definitions.length===ACTION_CATALOG.length&&definitions.every(item=>item.name&&item.desc&&item.render&&item.visible===undefined&&item.searchable===undefined);
      const outside=document.body.createDiv(),globalSetting=new Setting(outside),globalDefinition=definitions.find(item=>item.aliases.includes('pin.toggle'));const releaseGlobal=globalDefinition.render(globalSetting,{listEl:outside});
      s.input.value='nothing-matches';s.input.dispatchEvent(new Event('input'));
      const localFiltered=s.list.querySelectorAll('.kplex-action-filtered').length===ACTION_CATALOG.length;
      const globalVisible=!globalSetting.settingEl.classList.contains('kplex-action-filtered');
      s.input.value='';s.input.dispatchEvent(new Event('input'));s.header.querySelector('[data-kplex-action-filter=assigned]').click();
      const assignedFilters=!s.list.querySelector('[data-action-id="pin.toggle"]').classList.contains('kplex-action-filtered')&&s.list.querySelector('[data-action-id="actions.configure"]').classList.contains('kplex-action-filtered');
      s.plugin.settings.actionPreferences.localBindings['pin.toggle']=[{match:'key',value:'F12',modifiers:['shift']}];s.controller.refresh();s.header.querySelector('[data-kplex-action-filter=custom]').click();
      const customFilters=!s.list.querySelector('[data-action-id="pin.toggle"]').classList.contains('kplex-action-filtered')&&s.list.querySelector('[data-action-id="selection.move.up"]').classList.contains('kplex-action-filtered');
      s.header.querySelector('[data-kplex-action-control=search-hotkey]').click();s.controller.recorder.choose({match:'key',value:'F12',modifiers:['shift']});s.controller.recorder.close();
      const chordSearch=!s.list.querySelector('[data-action-id="pin.toggle"]').classList.contains('kplex-action-filtered')&&s.list.querySelectorAll('[data-action-id]:not(.kplex-action-filtered)').length===1&&s.calls.length===0;
      const globalSearch=outside.createDiv({cls:'search-input-container'}).createEl('input');globalSearch.focus();
      const externalSearchClears=s.input.value===''&&s.list.querySelectorAll('.kplex-action-filtered').length===0&&s.header.querySelector('[data-kplex-action-filter=all]').getAttribute('aria-pressed')==='true';
      s.input.value='Keyboard help';s.input.dispatchEvent(new Event('input'));const globalResult=outside.createDiv({cls:'setting-search-result-item'});let visibleBeforeHost=false;
      globalResult.addEventListener('click',()=>{visibleBeforeHost=!s.list.querySelector('[data-action-id="pin.toggle"]').classList.contains('kplex-action-filtered')});const resultIcon=document.createElementNS('http://www.w3.org/2000/svg','svg');globalResult.append(resultIcon);resultIcon.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      const resultClickClears=visibleBeforeHost&&s.input.value===''&&s.list.querySelectorAll('.kplex-action-filtered').length===0;
      const frame=document.body.createEl('iframe'),targetDocument=frame.contentDocument;for(const method of ['setAttr','addClass','toggleClass','empty','setText','createEl','createDiv','createSpan'])frame.contentWindow.HTMLElement.prototype[method]=HTMLElement.prototype[method];targetDocument.body.append(targetDocument.adoptNode(s.page));
      const headerSetting=s.rows[0].settingEl;settingMigrations.get(headerSetting)(frame.contentWindow);s.input.value='Keyboard help';s.input.dispatchEvent(new Event('input'));
      globalSearch.dispatchEvent(new Event('input',{bubbles:true}));const oldDocumentInert=s.input.value==='Keyboard help'&&s.list.querySelector('[data-action-id="pin.toggle"]').classList.contains('kplex-action-filtered');
      const migratedSearch=document.createElement('input');migratedSearch.type='search';targetDocument.body.append(targetDocument.adoptNode(migratedSearch));migratedSearch.dispatchEvent(new frame.contentWindow.Event('input',{bubbles:true}));
      const migratedDocumentClears=s.input.value===''&&s.list.querySelectorAll('.kplex-action-filtered').length===0;
      const sourceRealmRetained=migratedSearch instanceof window.Element&&!(migratedSearch instanceof frame.contentWindow.Element);
      const publication=s.list.querySelector('[data-action-id="search.focus"] [data-kplex-action-control=publication]');publication.focus();const originalSave=s.plugin.updateActionPreferences;let finish;s.plugin.updateActionPreferences=async value=>{await new Promise(done=>finish=done);await originalSave.call(s.plugin,value)};publication.click();finish();for(let turn=0;s.controller.saving&&turn<20;turn++)await Promise.resolve();
      const stableToggle=s.rows[1].controlEl.querySelector('input')===originalToggle&&s.rows[1].components.length===1&&s.rows[2].components.length===1;const migratedEquivalentFocus=targetDocument.activeElement===s.list.querySelector('[data-action-id="search.focus"] [data-kplex-action-control=publication]')&&targetDocument.activeElement!==publication;s.plugin.updateActionPreferences=originalSave;




      const group=[...s.controller.groups][0];s.controller.record(group,()=>{});const recorder=s.controller.recorder;
      releaseGlobal();const unrelatedKeepsCapture=s.controller.recorder===recorder;
      const anotherGlobal=new Setting(outside),releaseAnother=globalDefinition.render(anotherGlobal,{listEl:outside});
      for(const release of s.releases)release();const headerRetired=s.controller.groups.size===0&&s.controller.recorder===null&&s.listeners.size===1;
      s.input.value='pin';s.input.dispatchEvent(new Event('input'));globalResult.click();const retiredHeaderInert=s.input.value==='pin'&&!anotherGlobal.settingEl.classList.contains('kplex-action-filtered');
      releaseAnother();s.controller.dispose();s.controller.dispose();const clean=s.listeners.size===0&&s.controller.rows.size===0&&s.controller.listeners.size===0&&settingMigrations.size===0;
      const next=s.controller.getSettingDefinitions(),setting=new Setting(outside);const release=next.items[3].render(setting,{listEl:outside});const reusable=s.listeners.size===1;release();s.controller.dispose();s.page.remove();outside.remove();frame.remove();
      return{initialRenderDoesNotSave,externalRefreshDoesNotSave,nativeChipMarkup,complete,localFiltered,globalVisible,assignedFilters,customFilters,chordSearch,externalSearchClears,resultClickClears,oldDocumentInert,migratedDocumentClears,sourceRealmRetained,migratedEquivalentFocus,stableToggle,unrelatedKeepsCapture,headerRetired,retiredHeaderInert,clean,reusable,accessible:s.input.getAttribute('aria-label')==='Search actions'};
    })()`);
    assert.deepEqual(result, {initialRenderDoesNotSave:true,externalRefreshDoesNotSave:true,nativeChipMarkup:true,complete:true,localFiltered:true,globalVisible:true,assignedFilters:true,customFilters:true,chordSearch:true,externalSearchClears:true,resultClickClears:true,oldDocumentInert:true,migratedDocumentClears:true,sourceRealmRetained:true,migratedEquivalentFocus:true,stableToggle:true,unrelatedKeepsCapture:true,headerRetired:true,retiredHeaderInert:true,clean:true,reusable:true,accessible:true});
  } finally { await browser.cleanup(); }
});

test("actual native chips save immediately, recover failed removals without losing new chords and preserve focus ownership", async () => {
  const browser = await settingsBrowser();
  try {
    const result = await browser.evaluate(`(async()=>{
      const s=makeSettings(),controller=s.controller;const pin=s.list.querySelector('[data-action-id="pin.toggle"]');
      let reject;const original=s.plugin.updateActionPreferences;s.plugin.updateActionPreferences=()=>new Promise((_,no)=>reject=no);
      const chip=pin.querySelector('.setting-hotkey');chip.focus();chip.click();const guardedFocus=document.activeElement===chip&&controller.saving;s.list.querySelector('[data-action-id="search.focus"] [data-kplex-action-control="publication"]').click();const singleFlight=controller.saving;
      reject(new Error('Disk failure'));await Promise.resolve();await Promise.resolve();const failed=!s.plugin.settings.actionPreferences.localBindings['pin.toggle']&&controller.retries.has('pin.toggle');
      const extra={match:'key',value:'F12',modifiers:['shift']};s.plugin.settings.actionPreferences.localBindings['pin.toggle']=[...sourceModules.ACTION_BINDING_DEFAULTS['pin.toggle'],extra];s.plugin.updateActionPreferences=original;
      await controller.save('pin.toggle',controller.retries.get('pin.toggle'),document);const preserved=s.plugin.settings.actionPreferences.localBindings['pin.toggle'].length===1&&s.plugin.settings.actionPreferences.localBindings['pin.toggle'][0].value==='F12';
      const unknown=[{match:'code',value:'KeyZ',modifiers:['meta']}];s.plugin.settings.actionPreferences.localBindings['future.action']=unknown;s.plugin.settings.actionPreferences.legacyUnknown={future:{deep:[1]}};
      controller.chooseBinding('pin.toggle',{match:'key',value:'r',modifiers:['alt']},document);for(let n=0;controller.saving&&n<20;n++)await Promise.resolve();const proposed=s.plugin.settings.actionPreferences.localBindings['pin.toggle'].some(x=>x.value==='r');
      s.plugin.settings.actionPreferences.localBindings['node.rename']=[{match:'key',value:'r',modifiers:['alt']},{match:'key',value:'F11',modifiers:['shift']}];controller.refresh();
      const replacement=s.plugin.settings.actionPreferences.localBindings['node.rename'].length===2&&s.plugin.settings.actionPreferences.localBindings['node.rename'][0].value==='r'&&s.plugin.settings.actionPreferences.localBindings['pin.toggle'].some(x=>x.value==='r');
      const compatible=JSON.stringify(s.plugin.settings.actionPreferences.localBindings['future.action'])===JSON.stringify(unknown)&&s.plugin.settings.actionPreferences.legacyUnknown.future.deep[0]===1;
      s.plugin.updateActionPreferences=async()=>{throw new Error('Add failure')};const added={match:'key',value:'F9',modifiers:['shift']};controller.chooseBinding('pin.toggle',added,document);await Promise.resolve();await Promise.resolve();
      s.plugin.settings.actionPreferences.localBindings['pin.toggle']=[...s.plugin.settings.actionPreferences.localBindings['pin.toggle'],{match:'key',value:'F8',modifiers:['shift']}];s.plugin.updateActionPreferences=original;
      await controller.save('pin.toggle',controller.retries.get('pin.toggle'),document);const rebasedAdd=s.plugin.settings.actionPreferences.localBindings['pin.toggle'].some(x=>x.value==='F8')&&s.plugin.settings.actionPreferences.localBindings['pin.toggle'].some(x=>x.value==='F9')&&s.plugin.settings.actionPreferences.localBindings['pin.toggle'].length===4;

      let finish;s.plugin.updateActionPreferences=async value=>{await new Promise(done=>finish=done);await original.call(s.plugin,value)};const pub=pin.querySelector('[data-kplex-action-control="publication"]');pub?.focus();const edit=controller.save('pin.toggle',draft=>{draft.localBindings['pin.toggle']=[]},document);const external=document.body.createEl('input');external.focus();finish();await edit;const noFocusTheft=document.activeElement===external;
      const stale=pin.querySelector('[data-kplex-action-control="add"]');for(const release of s.releases)release();stale.click();const retiredInert=controller.recorder===null;s.controller.dispose();s.page.remove();external.remove();
      return{guardedFocus,singleFlight,failed,preserved,proposed,replacement,compatible,rebasedAdd,noFocusTheft,retiredInert};
    })()`);
    assert.deepEqual(result,{guardedFocus:true,singleFlight:true,failed:true,preserved:true,proposed:true,replacement:true,compatible:true,rebasedAdd:true,noFocusTheft:true,retiredInert:true});
  } finally { await browser.cleanup(); }
});


test("sequential Shift and Option modifier keydowns never complete a recording in either matching mode", () => {
  for (const match of ["key", "code"]) for (const order of [["Shift", "Alt"], ["Alt", "Shift"]]) {
    const choices = []; let prevented = 0;
    const context = {opened: true, recording: true, match, accepted: new WeakSet(), modalEl: {ownerDocument: {}}, choose: (...values) => choices.push(values), close() {this.opened = false;}};
    const record = production("record", {captureActionBinding: contracts.captureActionBinding, isModifiedPhysicalDeadKey: contracts.isModifiedPhysicalDeadKey, readObsidianPresentationEnvironment: () => ({keyConvention: "macos"})}, "src/ui/ShortcutRecorder.ts").bind(context);
    const base = {ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, isComposing: false, repeat: false, getModifierState: () => false, preventDefault: () => prevented++, stopPropagation() {}};
    const flags = {};
    for (const modifier of order) {
      flags[modifier === "Shift" ? "shiftKey" : "altKey"] = true;
      assert.equal(record({...base, ...flags, key: modifier, code: `${modifier}Left`}), undefined);
      assert.equal(choices.length, 0); assert.equal(context.opened, true); assert.equal(prevented, 0);
    }
    record({...base, ...flags, key: "‰", code: "KeyR"});
    assert.equal(choices.length, 1); assert.equal(prevented, 1);
    assert.deepEqual(choices[0][0], {match, value: match === "code" ? "KeyR" : "‰", modifiers: ["alt", "shift"]});
    assert.deepEqual(choices[0][1], [{match: "key", value: "‰", modifiers: ["alt", "shift"]}, {match: "code", value: "KeyR", modifiers: ["alt", "shift"]}]);
  }
});

test("recorder captures modified physical accents but gives logical Dead and composition back to native input", () => {
  for (const [match, overrides, captures] of [["code", {}, true], ["key", {}, false], ["code", {altKey: false}, false],
    ["code", {isComposing: true}, false], ["code", {getModifierState: () => true}, false], ["code", {key: "Process"}, false]]) {
    const choices = []; let prevented = 0;
    const context = {opened: true, recording: true, match, accepted: new WeakSet(), modalEl: {ownerDocument: {}}, choose: (...values) => choices.push(values), close() {}};
    const record = production("record", {captureActionBinding: contracts.captureActionBinding, isModifiedPhysicalDeadKey: contracts.isModifiedPhysicalDeadKey, readObsidianPresentationEnvironment: () => ({keyConvention: "macos"})}, "src/ui/ShortcutRecorder.ts").bind(context);
    const outcome = record({key: "Dead", code: "KeyE", ctrlKey: false, metaKey: false, altKey: true, shiftKey: true, isComposing: false, repeat: false,
      getModifierState: () => false, preventDefault: () => prevented++, stopPropagation() {}, ...overrides});
    assert.equal(choices.length, captures ? 1 : 0); assert.equal(prevented, captures ? 1 : 0); assert.equal(outcome, captures ? false : undefined);
    if (captures) assert.deepEqual(choices[0], [{match: "code", value: "KeyE", modifiers: ["alt", "shift"]}, [{match: "code", value: "KeyE", modifiers: ["alt", "shift"]}]]);
  }
});

test("native recorder matching changes refocus capture, preserve Tab and make retired controls and focus callbacks inert", async () => {
  const browser = await settingsBrowser("macos");
  try {
    const result = await browser.evaluate(`(async()=>{
      const s=makeSettings(),controller=s.controller; s.list.querySelector('[data-action-id="actions.configure"] [data-kplex-action-control=add]').click();
      const recorder=controller.recorder,content=recorder.contentEl,area=content.querySelector('[role=group]'),mode=content.querySelector('select');
      await Promise.resolve();const physicalDefault=mode.value==='code'&&document.activeElement===area;
      const nativeLayout=Boolean(mode.closest('.setting-item')?.querySelector('.setting-item-description')?.textContent.includes('physical position'))&&content.querySelectorAll('.modal-button-container button').length===2;
      area.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',code:'Tab',bubbles:true,cancelable:true}));mode.focus();
      mode.value='key';mode.dispatchEvent(new Event('change'));const tabNative=document.activeElement===mode;await Promise.resolve();
      const logicalRefocus=document.activeElement===area&&content.querySelector('.setting-item-description').textContent.includes('Accent-producing');
      mode.focus();mode.value='code';mode.dispatchEvent(new Event('change'));await Promise.resolve();const physicalRefocus=document.activeElement===area;
      for(const facts of [{key:'Shift',code:'ShiftLeft',shiftKey:true},{key:'Alt',code:'AltLeft',shiftKey:true,altKey:true}])area.dispatchEvent(new KeyboardEvent('keydown',{...facts,bubbles:true,cancelable:true}));
      const modifiersKeepOpen=recorder.modalEl.isConnected&&s.calls.length===0;
      area.dispatchEvent(new KeyboardEvent('keydown',{key:'‰',code:'KeyR',shiftKey:true,altKey:true,bubbles:true,cancelable:true}));for(let n=0;controller.saving&&n<20;n++)await Promise.resolve();
      const selectedPhysical=s.calls.length===1&&JSON.stringify(s.plugin.settings.actionPreferences.localBindings['actions.configure'])===JSON.stringify([{match:'code',value:'KeyR',modifiers:['alt','shift']}]);
      const before=s.calls.length;mode.value='key';mode.dispatchEvent(new Event('change'));area.dispatchEvent(new KeyboardEvent('keydown',{key:'r',code:'KeyR',bubbles:true,cancelable:true}));const retiredInert=s.calls.length===before&&recorder.scope.handlers.length===0;
      s.list.querySelector('[data-action-id="actions.configure"] [data-kplex-action-control=add]').click();const pending=controller.recorder,pendingMode=pending.contentEl.querySelector('select');pendingMode.value='key';pendingMode.dispatchEvent(new Event('change'));pending.close();const outside=document.body.createEl('input');outside.focus();await Promise.resolve();const closedFocusInert=document.activeElement===outside;
      controller.dispose();s.page.remove();outside.remove();return{physicalDefault,nativeLayout,tabNative,logicalRefocus,physicalRefocus,modifiersKeepOpen,selectedPhysical,retiredInert,closedFocusInert,clean:s.listeners.size===0&&settingMigrations.size===0};
    })()`);
    assert.deepEqual(result, {physicalDefault:true,nativeLayout:true,tabNative:true,logicalRefocus:true,physicalRefocus:true,modifiersKeepOpen:true,selectedPhysical:true,retiredInert:true,closedFocusInert:true,clean:true});
  } finally {await browser.cleanup();}
});


test("queued recorder focus cannot cross a document migration or refocus a replaced capture region", () => {
  const tasks = [], document = {defaultView: {queueMicrotask: callback => tasks.push(callback)}, activeElement: null};
  let focuses = 0;
  const area = {ownerDocument: document, isConnected: true, focus() {focuses++; document.activeElement = area;}};
  const context = {opened: true, captureArea: area, contentEl: {ownerDocument: document, contains: node => node === area}, recording: false};
  const focus = production("focusCaptureArea", {}, "src/ui/ShortcutRecorder.ts").bind(context);
  focus();area.ownerDocument = {};tasks.shift()();assert.equal(focuses, 0);
  area.ownerDocument = document;focus();context.captureArea = {};tasks.shift()();assert.equal(focuses, 0);
  context.captureArea = area;focus();area.isConnected = false;tasks.shift()();assert.equal(focuses, 0);
  area.isConnected = true;focus();tasks.shift()();assert.equal(focuses, 1);assert.equal(context.recording, true);
});


test("native assignment snapshots inherit defaults, preserve explicit disables and detach validated effective chords", () => {
  const overrides = {disabled: [], custom: [{key: "x", modifiers: ["Alt"]}]}, defaults = {default: [{key: "f", modifiers: ["Mod"]}], disabled: [{key: "f", modifiers: ["Mod"]}]};
  const commands = {default: {name: "Default command"}, disabled: {name: "Disabled command"}, custom: {name: "Custom command"}, registered: {name: "Registered command", hotkeys: [{key: "z", modifiers: ["Ctrl"]}]}, malformed: {name: "Malformed", hotkeys: [{key: "x", modifiers: ["Future"]}]} };
  let reads = 0; const app = {hotkeyManager: {getHotkeys(id) {reads++; return overrides[id];}, getDefaultHotkeys(id) {return defaults[id];}}, commands: {commands}};
  const snapshot = contracts.readObsidianActionHotkeys(app);
  assert.equal(snapshot.available, true); assert.equal(snapshot.complete, false); assert.equal(reads, 5);
  assert.deepEqual(snapshot.commands.map(command => command.id), ["default", "custom", "registered"]);
  assert.deepEqual(snapshot.commands[0].bindings, [{match: "key", value: "f", modifiers: ["mod"]}]);
  overrides.custom[0].key = "changed"; overrides.custom[0].modifiers.push("Shift");
  assert.deepEqual(snapshot.commands[1].bindings, [{match: "key", value: "x", modifiers: ["alt"]}]);
  assert.deepEqual(contracts.readObsidianActionHotkeys({}), {available: false, complete: false, commands: [], assignments: []});
  assert.equal(contracts.readObsidianActionHotkeys({hotkeyManager: {getHotkeys() {throw Error("unavailable");}, getDefaultHotkeys() {}}, commands: {commands: {bad: {name: "Bad"}}}}).complete, false);
});

test("persistent local diagnostics identify each endpoint chord, respect contexts and distinguish physical layout possibilities", () => {
  const saved = preferences(), first = {match: "key", value: "F12", modifiers: ["mod"]}, unrelated = {match: "key", value: "F11", modifiers: ["mod"]};
  saved.localBindings["node.rename"] = [first, unrelated]; saved.localBindings["pin.toggle"] = [unrelated, first];
  saved.localBindings["ontology.assign.parent"] = [first];
  const native = {available: true, complete: true, commands: []};
  let snapshot = contracts.collectActionShortcutConflicts(saved, "macos", native);
  for (const binding of [first, unrelated]) {
    assert.deepEqual(snapshot.get("node.rename").get(contracts.actionBindingIdentity(binding)).local, [{action: "pin.toggle", possible: false}]);
    assert.deepEqual(snapshot.get("pin.toggle").get(contracts.actionBindingIdentity(binding)).local, [{action: "node.rename", possible: false}]);
  }
  assert.deepEqual(snapshot.get("ontology.assign.parent").get(contracts.actionBindingIdentity(first)).local, [], "Editor-only context is disjoint from graph-local shortcuts");
  const logical = {match: "key", value: "?", modifiers: ["alt", "shift"]}, physical = {match: "code", value: "Slash", modifiers: ["alt", "shift"]};
  saved.localBindings["node.rename"] = [logical]; saved.localBindings["pin.toggle"] = [physical]; saved.localBindings["keyboard.help"] = [];
  snapshot = contracts.collectActionShortcutConflicts(saved, "macos", native);
  assert.deepEqual(snapshot.get("node.rename").get(contracts.actionBindingIdentity(logical)).local, [{action: "pin.toggle", possible: true}]);
  assert.deepEqual(snapshot.get("pin.toggle").get(contracts.actionBindingIdentity(physical)).local, [{action: "node.rename", possible: true}]);
});

test("native overlap advisories normalize exact modifiers, retain own-command information and never infer Option glyph positions", () => {
  const saved = preferences(), logical = {match: "key", value: "f", modifiers: ["mod"]};
  const native = {available: true, complete: true, commands: [
    {id: "editor:find", name: "Native Find", bindings: [{match: "key", value: "F", modifiers: ["meta"]}]},
    {id: "wrong", name: "Wrong modifiers", bindings: [{match: "key", value: "f", modifiers: ["ctrl"]}]},
    {id: "k-plex:kplex-search", name: "K-Plex Search", bindings: [{match: "key", value: "/", modifiers: ["alt"]}]},
    {id: "external:r", name: "External R", bindings: [{match: "key", value: "r", modifiers: ["alt"]}]},
    {id: "external:glyph", name: "External glyph", bindings: [{match: "key", value: "®", modifiers: ["alt"]}]},
  ]};
  const snapshot = contracts.collectActionShortcutConflicts(saved, "macos", native);
  assert.deepEqual(snapshot.get("find.focus").get(contracts.actionBindingIdentity(logical)).obsidian, [{id: "editor:find", name: "Native Find", possible: false, self: false}]);
  const rename = snapshot.get("node.rename").get(contracts.actionBindingIdentity(contracts.ACTION_BINDING_DEFAULTS["node.rename"][0]));
  assert.deepEqual(rename.obsidian, [{id: "external:r", name: "External R", possible: true, self: false}]);
  const search = snapshot.get("search.focus").get(contracts.actionBindingIdentity(contracts.ACTION_BINDING_DEFAULTS["search.focus"][0]));
  assert.equal(search.obsidian[0].self, true);
  const before = JSON.stringify(saved); contracts.collectActionShortcutConflicts(saved, "windows", native); assert.equal(JSON.stringify(saved), before);
  saved.localBindings["node.rename"] = [{match: "key", value: "r", modifiers: []}]; saved.characterShortcutsEnabled = false;
  assert.equal(contracts.collectActionShortcutConflicts(saved, "macos", native).get("node.rename").size, 0, "Inactive text shortcuts do not carry executable conflict warnings");
});

test("read-only native raw subscription tracks the active config path and removes the exact callback once", () => {
  let refreshes = 0, releases = 0, callback;
  const ref = {}, app = {vault: {configDir: "custom-config", on(name, fn) {assert.equal(name, "raw"); callback = fn; return ref;}, offref(value) {assert.equal(value, ref); releases++;}}};
  const release = contracts.subscribeObsidianActionHotkeys(app, () => refreshes++);
  callback(".obsidian/hotkeys.json"); callback("custom-config/other.json"); assert.equal(refreshes, 0);
  callback("custom-config/hotkeys.json"); assert.equal(refreshes, 1);
  app.vault.configDir = "next-config"; callback("custom-config/hotkeys.json"); callback("next-config/hotkeys.json"); assert.equal(refreshes, 2);
  release(); release(); assert.equal(releases, 1);
});

test("persistent native chips retain local and global labels, exact counts and render-owned refresh cleanup", async () => {
  const browser = await settingsBrowser("macos");
  try {
    const result = await browser.evaluate(`(async()=>{
      const s=makeSettings(),c=s.controller,first={match:'key',value:'F12',modifiers:['mod']},second={match:'key',value:'F11',modifiers:[]};
      s.plugin.settings.actionPreferences.localBindings['node.rename']=[first,second];s.plugin.settings.actionPreferences.localBindings['pin.toggle']=[first];
      s.nativeCommands['native:test']={name:'Native test command'};s.defaultHotkeys['native:test']=[{key:'F12',modifiers:['Meta']}];
      s.nativeCommands['k-plex:kplex-search']={name:'K-Plex Search'};s.defaultHotkeys['k-plex:kplex-search']=[{key:'/',modifiers:['Alt']}];
      const before=s.nativeReads.custom;c.refresh();const once=s.nativeReads.custom-before===new Set([...Object.keys(s.nativeCommands),...sourceModules.ACTION_CATALOG.flatMap(action=>action.command?['k-plex:'+action.command.id]:[])]).size;
      const rename=s.list.querySelector('[data-action-id="node.rename"]'),pill=rename.querySelector('.setting-hotkey'),other=rename.querySelectorAll('.setting-hotkey')[1];
      const both=pill.classList.contains('has-conflict')&&Boolean(pill.querySelector('.kplex-action-local-conflict'))&&Boolean(pill.querySelector('.kplex-action-global-warning'))&&pill.getAttribute('aria-label').includes(s.plugin.translator('actions.pin.toggle'))&&pill.getAttribute('aria-label').includes('Native test command')&&!pill.hasAttribute('title');
      const precise=!other.classList.contains('has-conflict')&&!other.classList.contains('kplex-action-global-overlap');
      const self=s.list.querySelector('[data-action-id="search.focus"] .setting-hotkey'),selfInformational=Boolean(self.querySelector('.kplex-action-global-self'))&&!self.classList.contains('kplex-action-global-overlap');
      const filter=s.header.querySelector('[data-kplex-action-filter=conflicts]');filter.click();const counts=filter.textContent==='Conflicts (2)'&&s.list.querySelectorAll('[data-action-id]:not(.kplex-action-filtered)').length===2;
      const outside=document.body.createDiv(),nativeSetting=new sourceModules.Setting(outside),definition=s.definition.items.find(item=>item.aliases?.includes('node.rename')),release=definition.render(nativeSetting,{listEl:outside});
      const globalRow=Boolean(nativeSetting.controlEl.querySelector('.has-conflict .kplex-action-global-warning'))&&!nativeSetting.settingEl.classList.contains('kplex-action-filtered');
      s.customHotkeys['native:test']=[];for(const entry of s.nativeListeners)entry.callback('.obsidian/hotkeys.json');
      const disabledUpdates=!rename.querySelector('.kplex-action-global-warning')&&!nativeSetting.controlEl.querySelector('.kplex-action-global-warning');
      s.customHotkeys['native:test']=[{key:'F11',modifiers:[]}];window.dispatchEvent(new Event('focus'));
      const focusUpdates=Boolean(rename.querySelectorAll('.setting-hotkey')[1].querySelector('.kplex-action-global-warning'));
      s.plugin.settings.actionPreferences.localBindings['pin.toggle']=[];for(const fn of s.listeners)fn();const preferencesUpdate=!rename.querySelector('.has-conflict')&&filter.textContent==='Conflicts (1)';
      const globalNoBlock=!c.saving&&s.calls.length===0;
      s.customHotkeys['native:test'].push({key:'F10',modifiers:[]});c.refresh();const nativeBefore=JSON.stringify(s.customHotkeys);c.chooseBinding('actions.configure',{match:'key',value:'F10',modifiers:[]},document);for(let n=0;c.saving&&n<20;n++)await Promise.resolve();const globalSaveAllowed=s.calls.length===1&&s.plugin.settings.actionPreferences.localBindings['actions.configure'][0].value==='F10'&&JSON.stringify(s.customHotkeys)===nativeBefore;
      release();for(const off of s.releases)off();const clean=s.nativeListeners.size===0&&c.focusOwners.size===0&&c.nativeRefreshTimers.size===0&&settingMigrations.size===0;c.dispose();c.dispose();s.page.remove();outside.remove();
      return{once,both,precise,selfInformational,counts,globalRow,disabledUpdates,focusUpdates,preferencesUpdate,globalNoBlock,globalSaveAllowed,clean};
    })()`);
    assert.deepEqual(result, {once:true,both:true,precise:true,selfInformational:true,counts:true,globalRow:true,disabledUpdates:true,focusUpdates:true,preferencesUpdate:true,globalNoBlock:true,globalSaveAllowed:true,clean:true});
  } finally {await browser.cleanup();}
});


test("native raw rechecks are finite, coalesced and cancelled on the exact owning window", () => {
  let refreshes = 0, next = 0;
  const timers = new Map(), cancelled = [], ownerWindow = {setTimeout(callback, delay) {const id = ++next; timers.set(id, {callback, delay}); return id;}, clearTimeout(id) {cancelled.push(id); timers.delete(id);}};
  const context = {rows: new Set([{setting: {settingEl: {isConnected: true, ownerDocument: {defaultView: ownerWindow}}}}]), nativeRefreshTimers: new Set(), refresh() {refreshes++;}};
  context.clearNativeRefreshTimers = production("clearNativeRefreshTimers", {}, "src/ui/ActionSettingsController.ts").bind(context);
  const schedule = production("scheduleNativeRefresh", {}, "src/ui/ActionSettingsController.ts").bind(context);
  schedule(); assert.equal(refreshes, 1); assert.deepEqual([...timers.values()].map(value => value.delay), [250, 1000, 3000]);
  schedule(); assert.equal(refreshes, 2); assert.deepEqual(cancelled, [1, 2, 3]); assert.equal(timers.size, 3);
  const first = timers.get(4); timers.delete(4); first.callback(); assert.equal(refreshes, 3); assert.equal(context.nativeRefreshTimers.size, 2);
  context.rows.clear(); context.clearNativeRefreshTimers(); assert.equal(context.nativeRefreshTimers.size, 0); assert.equal(timers.size, 0);
  schedule(); assert.equal(refreshes, 3); assert.equal(timers.size, 0);
});


test("native physical advisories use base punctuation and digit keys with exact independent Shift modifiers", () => {
  for (const [code, base, shifted] of [["Slash", "/", "?"], ["Period", ".", ">"], ["Digit0", "0", ")"], ["Quote", "'", '"']]) {
    const saved = preferences(), binding = {match: "code", value: code, modifiers: ["alt", "shift"]};
    saved.localBindings["actions.configure"] = [binding];
    const native = {available: true, complete: true, commands: [
      {id: "native:base", name: "Native base chord", bindings: [{match: "key", value: base, modifiers: ["alt", "shift"]}]},
      {id: "native:wrong-modifiers", name: "Unshifted chord", bindings: [{match: "key", value: base, modifiers: ["alt"]}]},
      {id: "native:shifted-spelling", name: "Shifted spelling", bindings: [{match: "key", value: shifted, modifiers: ["alt", "shift"]}]},
    ]};
    const diagnostic = contracts.collectActionShortcutConflicts(saved, "macos", native).get("actions.configure").get(contracts.actionBindingIdentity(binding));
    assert.deepEqual(diagnostic.obsidian, [{id: "native:base", name: "Native base chord", possible: true, self: false}], code);
    assert.equal(contracts.physicalBindingKeycap(binding), code === "Digit0" ? "0" : shifted, "Native projection must not change existing display keycaps");
  }
});


test("valid native Tab navigation is excluded from comparable assignments without a misleading partial warning", () => {
  const commands = {"workspace:next-tab": {name: "Next tab"}, "workspace:previous-tab": {name: "Previous tab"}, ordinary: {name: "Ordinary command"}};
  const hotkeys = {"workspace:next-tab": [{key: "Tab", modifiers: ["Ctrl"]}], "workspace:previous-tab": [{key: "Tab", modifiers: ["Ctrl", "Shift"]}], ordinary: [{key: "f", modifiers: ["Mod"]}]};
  const app = {hotkeyManager: {getHotkeys() {return undefined;}, getDefaultHotkeys(id) {return hotkeys[id];}}, commands: {commands}};
  const snapshot = contracts.readObsidianActionHotkeys(app);
  assert.equal(snapshot.available, true); assert.equal(snapshot.complete, true);
  assert.deepEqual(snapshot.commands.map(command => command.id), ["ordinary"]);
  assert.equal(contracts.isLocalBinding({match: "key", value: "Tab", modifiers: ["ctrl"]}), false, "Native exclusion does not permit local Tab assignments");
  hotkeys.ordinary = [{key: "f", modifiers: ["Future"]}]; assert.equal(contracts.readObsidianActionHotkeys(app).complete, false);
  hotkeys.ordinary = [{key: "Tab", modifiers: ["Future"]}]; assert.equal(contracts.readObsidianActionHotkeys(app).complete, false, "Unknown native modifiers are still malformed");
  hotkeys.ordinary = [{key: "Tab", modifiers: ["Ctrl", "Ctrl"]}]; assert.equal(contracts.readObsidianActionHotkeys(app).complete, false);
});


test("assignment presence is independent from native comparison and observes unpublished exact IDs", () => {
  const keys = {tab: [{key: "Tab", modifiers: ["Ctrl"]}], disabled: [], inherited: undefined, partial: [{key: "Tab", modifiers: ["Ctrl"]}, {key: "f", modifiers: ["Future"]}], malformed: [{key: "f", modifiers: ["Future"]}], "k-plex:kplex-focus": [{key: "F9", modifiers: ["Mod"]}]};
  const defaults = {disabled: [{key: "f", modifiers: ["Mod"]}], inherited: [{key: "i", modifiers: ["Mod"]}]};
  const commands = Object.fromEntries(["tab", "disabled", "inherited", "partial", "malformed", "throwing", "unset"].map(id => [id, {name: id}]));
  const reads = new Map();
  const app = {hotkeyManager: {getHotkeys(id) {reads.set(id, (reads.get(id) ?? 0) + 1); if(id === "throwing") throw Error("unavailable"); return keys[id];}, getDefaultHotkeys(id) {return defaults[id];}}, commands: {commands}};
  const snapshot = contracts.readObsidianActionHotkeys(app, ["tab", "k-plex:kplex-focus", "graph.focus", "missing"]), byId = new Map(snapshot.assignments.map(fact => [fact.id, fact]));
  assert.equal(snapshot.complete, false);
  assert.deepEqual(byId.get("tab"), {id: "tab", presence: "assigned", bindings: [], bindingsComplete: false});
  assert.equal(byId.get("partial").presence, "assigned"); assert.equal(byId.get("partial").bindingsComplete, false);
  assert.equal(byId.get("disabled").presence, "unassigned"); assert.deepEqual(byId.get("disabled").bindings, []);
  assert.equal(byId.get("inherited").presence, "assigned"); assert.equal(byId.get("inherited").bindingsComplete, true);
  assert.equal(byId.get("unset").presence, "unassigned");
  for (const id of ["throwing", "malformed", "graph.focus", "missing"]) assert.equal(byId.get(id).presence, "unknown", id);
  assert.equal(byId.get("k-plex:kplex-focus").presence, "assigned"); assert.equal(reads.get("tab"), 1);
  commands.badRecord = null; keys.badRecord = [{key: "Tab", modifiers: ["Ctrl"]}];
  Object.defineProperty(commands, "throwingRecord", {enumerable: true, get() {throw Error("record unavailable");}}); keys.throwingRecord = [{key: "Tab", modifiers: ["Ctrl"]}];
  const damagedRegistry = contracts.readObsidianActionHotkeys(app);
  for (const id of ["badRecord", "throwingRecord"]) assert.equal(damagedRegistry.assignments.find(fact => fact.id === id).presence, "assigned", "Independent saved assignment survives malformed command records");

  assert(!snapshot.commands.some(command => command.id === "k-plex:kplex-focus"), "Unregistered saved keys do not become registered collision diagnostics");
  keys["k-plex:kplex-focus"][0].key = "changed"; assert.equal(byId.get("k-plex:kplex-focus").bindings[0].value, "F9");
  keys.partial = [{key: "Tab", modifiers: ["Ctrl"]}, {get key() {throw Error("unavailable entry");}, modifiers: []}];
  assert.equal(contracts.readObsidianActionHotkeys(app).assignments.find(fact => fact.id === "partial").presence, "assigned", "A later throwing entry cannot suppress a proven assignment");
  keys.partial = Array.from({length: 40}, (_, index) => ({key: index ? "x" : "Tab", modifiers: []}));
  const limited = contracts.readObsidianActionHotkeys(app).assignments.find(fact => fact.id === "partial");
  assert.equal(limited.presence, "assigned"); assert.equal(limited.bindingsComplete, false); assert.equal(limited.bindings.length, 31);
});

test("row-local publication guidance refreshes independent native keys in place and survives global search", async () => {
  const browser = await settingsBrowser("macos");
  try {
    const result = await browser.evaluate(`(async()=>{
      const s=makeSettings(),c=s.controller,action=sourceModules.ACTION_BY_ID.get('graph.focus'),id='k-plex:'+action.command.id;const style=document.head.createEl('style',{text:${JSON.stringify(readFileSync(new URL("../styles.css", import.meta.url), "utf8"))}});document.body.style.setProperty('--text-warning','rgb(1, 2, 3)');document.body.style.setProperty('--text-muted','rgb(4, 5, 6)');
      const definition=s.definition.items.find(item=>item.aliases?.includes('graph.focus')),outside=document.body.createDiv(),setting=new sourceModules.Setting(outside),release=definition.render(setting,{listEl:outside});
      const row=setting.settingEl,status=()=>row.querySelector('.kplex-action-publication-state').textContent,local=JSON.stringify(s.plugin.settings.actionPreferences.localBindings);
      const guidance=row.querySelector('.kplex-action-scope').textContent.includes('focused Plex')&&row.querySelector('.setting-command-hotkeys').getAttribute('aria-label')==='Local shortcuts';
      const unknown=status().includes('Global shortcut not checked');s.nativeCommands[id]={name:'Localized focus graph'};s.defaultHotkeys[id]=[];c.refresh();const absent=status().includes('No global shortcut');
      const button=row.querySelector('[data-kplex-action-control=publication]');button.focus();s.customHotkeys[id]=[{key:'F9',modifiers:['Mod']}];c.refresh();
      const updated=status().includes('Global shortcut: ⌘ F9')&&row.querySelector('[data-kplex-action-control=publication]')===button&&document.activeElement===button;
      s.customHotkeys[id]=[{key:'Tab',modifiers:['Ctrl']}];c.refresh();const tab=status().includes('Shortcut assigned in Obsidian')&&!status().includes('No global shortcut');s.customHotkeys[id].push({key:'f',modifiers:['Future']});c.refresh();const partial=status().includes('Shortcut assigned in Obsidian');
      s.plugin.registration.set('graph.focus',false);s.plugin.settings.actionPreferences.publishedCommands['graph.focus']=true;c.refresh();const failed=status().includes('Publication requested; not registered')&&getComputedStyle(row.querySelector('.kplex-action-publication-state')).color==='rgb(1, 2, 3)';
      const publish=row.querySelector('[data-kplex-action-control=publication]');publish.click();for(let n=0;c.saving&&n<20;n++)await Promise.resolve();
      const retained=status().includes('Saved shortcut retained; command unavailable.')&&JSON.stringify(s.plugin.settings.actionPreferences.localBindings)===local&&s.customHotkeys[id][0].key==='Tab';
      const unpublishHint=row.querySelector('[data-kplex-action-control=publication]').getAttribute('aria-label').includes('no global shortcut is assigned');
      release();c.dispose();outside.remove();s.page.remove();style.remove();return{guidance,unknown,absent,updated,tab,partial,failed,retained,unpublishHint,clean:s.listeners.size===0&&s.nativeListeners.size===0&&settingMigrations.size===0};
    })()`);
    assert.deepEqual(result, {guidance:true,unknown:true,absent:true,updated:true,tab:true,partial:true,failed:true,retained:true,unpublishHint:true,clean:true});
  } finally {await browser.cleanup();}
});
