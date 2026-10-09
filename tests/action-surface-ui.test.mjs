/**
 * Real-browser regressions for production surface transport, native-parent leases, exact selection,
 * picker capture and modal disposal. The Scope shell is a narrow API test double: these tests prove
 * transport arbitration/cleanup, while real Obsidian acceptance separately establishes host priority.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { chromiumHarness } from "./support/browserTypeScript.mjs";

const hostStub = `
export const scopes=[];
export class Scope {
 constructor(parent){this.parent=parent;this.handlers=[];scopes.push(this)}
 register(modifiers,key,dispatch){const handler={modifiers,key,dispatch};this.handlers.push(handler);return handler}
 unregister(handler){this.handlers=this.handlers.filter(item=>item!==handler)}
 handleKey(event,context){const actual=[event.ctrlKey?'Ctrl':null,event.metaKey?'Meta':null,event.altKey?'Alt':null,event.shiftKey?'Shift':null].filter(Boolean).sort().join('+');context??={key:event.key,modifiers:actual,vkey:event.key};for(const handler of this.handlers){const expected=handler.modifiers.map(value=>value==='Mod'?'Ctrl':value).sort().join('+');if(expected===actual&&(handler.key===null||handler.key===context.vkey||handler.key.toLowerCase()===event.key.toLowerCase()))return handler.dispatch(event,context)}return this.parent?.handleKey(event,context)}
}
export class Notice {constructor(message){window.testNotices.push(message)}}
function element(parent,tag,options={}){const el=document.createElement(tag);el.setText=text=>{el.textContent=text};el.addClass=(...names)=>el.classList.add(...names);el.createDiv=options=>element(el,'div',options);el.createSpan=options=>element(el,'span',options);if(options.text)el.textContent=options.text;if(options.cls)el.className=options.cls;for(const [key,value]of Object.entries(options.attr??{}))el.setAttribute(key,value);parent.append(el);return el}
export class Modal {constructor(app){this.app=app;this.modalEl=document.createElement('div');this.modalEl.addClass=(...names)=>this.modalEl.classList.add(...names);this.titleEl={setText:()=>{}};this.contentEl=this.modalEl;
 this.contentEl.empty=()=>this.contentEl.replaceChildren();this.contentEl.createEl=(tag,options)=>element(this.contentEl,tag,options);this.contentEl.createDiv=options=>element(this.contentEl,'div',options);this.scope=new Scope()}
 open(){document.body.append(this.modalEl);this.onOpen?.()}close(){this.onClose?.();this.modalEl.remove()}}
export class Setting {constructor(parent){this.settingEl=element(parent,'div');this.settingEl.addClass=(...names)=>this.settingEl.classList.add(...names)}setName(){return this}setDesc(){return this}
 addText(callback){const inputEl=element(this.settingEl,'input'),text={inputEl,setPlaceholder(value){inputEl.placeholder=value;return this},onChange(callback){inputEl.addEventListener('input',()=>callback(inputEl.value));return this}};callback(text);return this}
 addToggle(callback){const input=element(this.settingEl,'input');input.type='checkbox';callback({setValue(value){input.checked=value;return this},onChange(callback){input.addEventListener('change',()=>callback(input.checked));return this}});return this}
 addDropdown(callback){const input=element(this.settingEl,'select');callback({addOption(value,label){element(input,'option',{text:label,attr:{value}});return this},setValue(value){input.value=value;return this},onChange(callback){input.addEventListener('change',()=>callback(input.value));return this}});return this}
 addButton(callback){const input=element(this.settingEl,'button');callback({setButtonText(value){input.textContent=value;return this},setIcon(){return this},setCta(){return this},setDisabled(value){input.disabled=value;return this},onClick(callback){input.addEventListener('click',callback);return this}});return this}}
export class FuzzySuggestModal {
 constructor(app){this.app=app;this.closed=false;this.inputEl=document.createElement('input');this.modalEl=element(document.createElement('div'),'div')}
 setPlaceholder(value){this.placeholder=value}
 open(){this.closed=false}
 close(){if(this.closed)return;this.closed=true;this.onClose?.()}
 selectSuggestion(match,event){this.app.keymap?.updateModifiers?.(event);this.close();this.onChooseSuggestion(match,event)}
}
export const Platform={isDesktopApp:true,isMacOS:true,isMobile:false,isIosApp:false,isAndroidApp:false};
`;

/** Compile the production sequence-role boundary without loading the native modal shell. */
function productionRoleResolver() {
  const filename = "src/ui/RelationshipExplanationModal.ts";
  const source = ts.createSourceFile(filename, readFileSync(new URL(`../${filename}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "gateRoleForDisplayRole");
  assert(declaration, "the details modal must retain an explicit semantic-to-gate boundary");
  const code = ts.transpileModule(declaration.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2021 } }).outputText;
  return Function(`${code}\nreturn gateRoleForDisplayRole;`)();
}

test("connection inspection preserves sequence roles instead of reinterpreting them as relink gates", () => {
  const resolve = productionRoleResolver();
  for (const role of ["parent", "child", "left", "right"]) assert.equal(resolve(role), role);
  for (const role of ["previous", "next", "hidden", "center"]) assert.equal(resolve(role), null);
});

/** Isolate the production native property writer without replacing its asynchronous or identity policy. */
function productionNoteTypeSave(Notice) {
  const filename = "src/ui/NoteTypeModal.ts";
  const source = ts.createSourceFile(filename, readFileSync(new URL(`../${filename}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(ts.isClassDeclaration);
  const method = declaration.members.find(node => ts.isMethodDeclaration(node) && node.name.getText(source) === "save");
  assert(method, "the note-type dialog must keep its existing property writer");
  const text = method.getText(source);
  const code = ts.transpileModule(`const save = async function ${text.slice(text.indexOf("("))};`, { compilerOptions: { target: ts.ScriptTarget.ES2021 } }).outputText;
  return Function("Notice", `${code}\nreturn save;`)(Notice);
}

test("note-type dialog serializes Save/Clear and refuses deleted or replaced native files", async () => {
  const notices = [], file = { path: "Original.md" }; let current = file, writes = 0, rebuilds = 0, closed = 0, release;
  const pending = new Promise(resolve => { release = resolve; });
  const fields = {};
  const context = { opened: true, busy: false, file, close: () => { closed++; context.opened = false; }, plugin: {
    translator: key => key, settings: { noteTypeField: "Kind" }, rebuildIndex: async () => { rebuilds++; },
    app: { vault: { getFileByPath: () => current }, fileManager: { processFrontMatter: async (target, mutate) => {
      assert.equal(target, file); writes++; await pending; mutate(fields);
    } } },
  } };
  const save = productionNoteTypeSave(class { constructor(message) { notices.push(message); } });
  const first = save.call(context, "Concept"); await save.call(context, "");
  assert.equal(writes, 1, "concurrent Clear cannot schedule another native mutation");
  release(); await first;
  assert.deepEqual(fields, { Kind: "Concept" }); assert.equal(rebuilds, 1); assert.equal(closed, 1);
  context.opened = true; current = { path: file.path }; await save.call(context, "Replacement");
  assert.equal(writes, 1, "a replacement at the same path remains untouched");
  assert.deepEqual(notices, ["addRelated.endpointChanged"]);
  current = file; context.plugin.app.fileManager.processFrontMatter = async (_target, mutate) => { current = { path: file.path }; mutate(fields); };
  await save.call(context, "During-read replacement");
  assert.deepEqual(fields, { Kind: "Concept" }); assert.equal(rebuilds, 1); assert.equal(context.busy, false);
  assert.deepEqual(notices, ["addRelated.endpointChanged", "actions.failed"]);
});

/** Compile the App's real menu capture/refresh pair inside its bounded launch callback. */
function productionMenuTargets(dependencies) {
  const filename = "src/ui/App.tsx";
  const source = ts.createSourceFile(filename, readFileSync(new URL(`../${filename}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let owner;
  const visitOwner = node => { if (ts.isVariableDeclaration(node) && node.name.getText(source) === "openLocalActions") owner = node.initializer; ts.forEachChild(node, visitOwner); };
  visitOwner(source); assert(owner, "App must retain one local menu launch owner");
  const expressions = new Map();
  const visit = node => { if (ts.isVariableDeclaration(node) && ["capture", "refresh"].includes(node.name.getText(source))) expressions.set(node.name.getText(source), node.initializer.getText(source)); ts.forEachChild(node, visit); };
  visit(owner); assert.equal(expressions.size, 2);
  const code = ts.transpileModule([...expressions].map(([name, expression]) => `const ${name}=${expression};`).join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2021 } }).outputText;
  return Function(...Object.keys(dependencies), `${code}\nreturn {capture,refresh};`)(...Object.values(dependencies));
}

test("App menus capture native identity before canonical pages mutate, while following same-file rename", () => {
  const original = { path: "A.md" }, replacement = { path: "A.md" }, page = { path: "A.md", file: original }; let currentFile = original;
  const { capture, refresh } = productionMenuTargets({
    plugin: { app: { vault: { getFileByPath: () => currentFile } }, index: { get: () => page } },
    actionNodeRef: value => ({ identity: value.path, fileIdentity: value.file === original ? "original" : "replacement" }),
    resolveActionPage: () => page,
  });
  const captured = capture(page); original.path = "Renamed.md"; page.path = original.path;
  assert.deepEqual(refresh(captured), { identity: "Renamed.md", fileIdentity: "original" });
  page.file = replacement; currentFile = replacement;
  assert.equal(refresh(captured), null, "a mutable canonical GraphPage cannot replace the captured native target");
});

/** Compile the graph's actual target reacquisition callback rather than approximating section validity. */
function productionGraphTarget(dependencies) {
  const filename = "src/ui/PlexGraph.tsx";
  const source = ts.createSourceFile(filename, readFileSync(new URL(`../${filename}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(source) === "graphActionPage") expression = node.initializer.getText(source); ts.forEachChild(node, visit); };
  visit(source); assert(expression);
  const code = ts.transpileModule(`const resolve=${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2021 } }).outputText;
  return Function(...Object.keys(dependencies), `${code}\nreturn resolve;`)(...Object.values(dependencies));
}

test("section actions require the captured occurrence and original native source-file incarnation", () => {
  const original = { path: "A.md" }, replacement = { path: "A.md" }, page = { path: "kplex-section:A.md:H1", file: original, transient: { kind: "section" } }, node = { page };
  let currentFile = original;
  const resolve = productionGraphTarget({ scene: { nodes: [node] }, sceneNodeKeys: new Map([[node, "section@H1"]]), index: {},
    plugin: { app: { vault: { getFileByPath: () => currentFile } } },
    actionNodeRef: target => ({ fileIdentity: target.file === original ? "original" : "replacement" }), resolveActionPage: () => assert.fail("section facets resolve only their exact displayed occurrence"),
  });
  const context = { target: { kind: "node", node: { identity: page.path, kind: "section", fileIdentity: "original" }, occurrenceId: "section@H1" } };
  assert.equal(resolve(context), page);
  currentFile = replacement; assert.equal(resolve(context), null, "deleted stale projected source file is unavailable");
  page.file = replacement; assert.equal(resolve(context), null, "replacement source cannot inherit a captured section intent");
  assert.equal(resolve({ target: { ...context.target, occurrenceId: "section@removed" } }), null);
});

/** Bundle actual React hooks and manager, replacing only unavailable native host shells. */
async function bundle() {
  const result = await build({ stdin: { resolveDir: process.cwd(), contents: `
    export {createElement,useRef} from 'react';
    export {createRoot} from 'react-dom/client'; export {flushSync} from 'react-dom';
    export {Scope,scopes} from 'obsidian';
    export {usePlexActions} from './src/ui/usePlexActions';
    export {usePlexKeyboardNavigation} from './src/ui/usePlexKeyboardNavigation';
    export {usePlexTypeSelection,matchTypeSelection,nextTypeSelection} from './src/ui/usePlexTypeSelection';
    export {PlexTypeSelectionStatus} from './src/ui/features/PlexTypeSelectionStatus';
    export {ActionManager} from './src/application/ActionManager';
    export {migrateActionPreferences} from './src/core/plex/actionPreferences';
    export {ACTION_BY_ID} from './src/core/plex/actions';
    export {ActionMenuModal} from './src/ui/ActionMenuModal';
    export {ActionTargetPicker} from './src/ui/ActionTargetPicker';
    import {surfaceAction} from './src/ui/surfaceActionImplementation'; export {surfaceAction};
    export {captureSurfaceContinuation} from './src/ui/surfaceContinuation';
    export {forwardActionScopeKey} from './src/adapters/obsidian/actionScope';
    export {registerEmbeddedMarkdownFocus} from './src/adapters/obsidian/embeddedMarkdownFocus';
    import {focusEmbeddedMarkdown,focusEmbeddedMarkdownView,registerEmbeddedMarkdownFocusTarget} from './src/adapters/obsidian/embeddedMarkdownFocus';
    export {focusEmbeddedMarkdown,focusEmbeddedMarkdownView,registerEmbeddedMarkdownFocusTarget};
    export {CreateFolderNoteModal} from './src/ui/CreateFolderNoteModal';
    ${productionAppFocusActions()}
    ${productionEmbeddedActivation()}
    ${productionGraphSession()}
  ` }, bundle: true, write: false, platform: "browser", format: "iife", globalName: "sourceModules",
    plugins: [{ name: "native-ui-shell", setup(builder) {
      builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "native" }));
      builder.onLoad({ filter: /.*/, namespace: "native" }, () => ({ contents: hostStub, loader: "js" }));
      builder.onResolve({ filter: /embeddedMarkdownLeaf$/ }, () => ({ path: "embedded-scope", namespace: "scope" }));
      builder.onLoad({ filter: /.*/, namespace: "scope" }, () => ({ contents: `export function getEmbeddedMarkdownScope(element){return element?.closest('.kplex-central-editor-content')?window.testEditorScope:null}`, loader: "js" }));
    } }],
  });
  return result.outputFiles[0].text;
}

/** Exercise the actual graph session/typing priority callback without loading the large scene renderer. */
function productionGraphSession() {
  const filename = "src/ui/PlexGraph.tsx";
  const source = ts.createSourceFile(filename, readFileSync(new URL(`../${filename}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  /** Locate the finite graph port, preserving its actual connection and custom-action priority logic. */
  const visit = node => {
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === "handleSessionKey") callback = node.initializer.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source); assert(callback, "Plex graph session key policy must remain explicit");
  return `import {acceptPlexKeyEvent} from './src/ui/actionKeyboardOwnership';import {actionNodeRef} from './src/adapters/obsidian/actionNode';
    export function createGraphSession({typeSelection,plugin,selection,keyboardConnectRef,setKeyboardConnect,visibleConnectSession,scene,sceneNodeKeys,index,actionSurfaceId}){return ${callback}}`;
}

/** Extract the actual App policy and graph focus callback; native host reveal remains an explicit controllable port. */
function productionAppFocusActions() {
  const filename = "src/ui/App.tsx";
  const source = ts.createSourceFile(filename, readFileSync(new URL(`../${filename}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let wrapper, focus, editorFocus;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "uiAction") wrapper = node.initializer.getText(source);
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === '"graph.focus"') focus = node.initializer.getText(source);
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === '"editor.focus"') editorFocus = node.initializer.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source); assert(wrapper && focus && editorFocus, "App must preserve its real foreground policy and canonical focus implementations");
  return ts.transpileModule(`export function createAppFocusActions(plugin,actions,rootRef,hostLeaf){const uiAction=${wrapper};return {graphFocus:${focus},editorFocus:${editorFocus},background:uiAction(context=>{plugin.backgroundCalls.push(context.request.id)})};}`, { compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.ESNext } }).outputText;
}

/** Extract the adapter's existing native/mobile activation policy; the browser supplies only its native workspace boundary. */
function productionEmbeddedActivation() {
  const filename = "src/adapters/obsidian/embeddedMarkdownLeaf.ts";
  const source = ts.createSourceFile(filename, readFileSync(new URL(`../${filename}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  let activation;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "activateInteractionLeaf") activation = node.initializer.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source); assert(activation, "embedded command activation remains adapter-owned");
  return ts.transpileModule(`export function createEmbeddedActivation(app,hostLeaf,leaf,activateHostLeafOnInteraction){let disposed=false;const activate=${activation};return {activate,dispose(){disposed=true}};}`, { compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.ESNext } }).outputText;
}

test("App explicit graph focus reveals its captured native tab and cancels retired generations without foregrounding background actions", async () => {
  const browser = await chromiumHarness(await bundle());
  try {
    const result = await browser.evaluate(`(async()=>{
      const {createAppFocusActions}=window.sourceModules;
      const panel=document.createElement('div'),root=document.createElement('div'),external=document.createElement('input');root.tabIndex=0;panel.append(root);document.body.append(panel,external);
      let generation=1,reveals=[],pending=Promise.resolve(true),release;
      const plugin={backgroundCalls:[],revealActionSurface:async id=>{reveals.push(id);const ready=await pending;if(ready)panel.style.display='block';return ready},isActionSurfaceCurrent:(id,acceptedGeneration)=>id==='owned'&&generation===acceptedGeneration};
      const actions=createAppFocusActions(plugin,{surfaceId:'owned'},{current:root});
      const context=(source,id='graph.focus')=>({request:{id,source},surfaceId:'owned',generation,target:{kind:'none'}});
      const hide=()=>{panel.style.display='none';external.focus();reveals=[]};
      hide();const internal=await actions.graphFocus.execute(context('internal'));const internalReveal=internal.status==='completed'&&document.activeElement===root&&reveals.join()==='owned';
      hide();const published=await actions.graphFocus.execute(context('obsidian-command'));const publishedReveal=published.status==='completed'&&document.activeElement===root&&reveals.join()==='owned';
      hide();pending=new Promise(resolve=>release=resolve);const delayed=actions.graphFocus.execute(context('internal'));generation++;release(true);const retired=await delayed;
      const retiredCancellation=retired.status==='cancelled'&&document.activeElement===external&&reveals.join()==='owned';
      hide();pending=Promise.resolve(false);const unavailable=await actions.graphFocus.execute(context('internal'));const unrevealedCancellation=unavailable.status==='cancelled'&&document.activeElement===external;
      hide();pending=Promise.resolve(true);for(const source of ['internal','obsidian-command'])for(const id of ['view.depth.toggle','relationship.create-center.child'])await actions.background.execute(context(source,id));
      const backgroundNeverReveals=reveals.length===0&&plugin.backgroundCalls.length===4&&document.activeElement===external;
      panel.remove();external.remove();return{internalReveal,publishedReveal,retiredCancellation,unrevealedCancellation,backgroundNeverReveals};
    })()`);
    assert.deepEqual(result, { internalReveal:true,publishedReveal:true,retiredCancellation:true,unrevealedCancellation:true,backgroundNeverReveals:true });
  } finally { await browser.cleanup(); }
});

test("App editor focus uses the live native representation despite earlier hidden editable headers and nonfocusable wrappers", async () => {
  const browser = await chromiumHarness(await bundle());
  try {
    const result = await browser.evaluate(`(async()=>{
      const {createAppFocusActions,focusEmbeddedMarkdownView,registerEmbeddedMarkdownFocusTarget}=window.sourceModules;
      const root=document.createElement('div'),wrapper=document.createElement('div'),mount=document.createElement('div'),header=document.createElement('div'),editable=document.createElement('div'),preview=document.createElement('div'),drawing=document.createElement('div'),external=document.createElement('input');
      root.tabIndex=0;wrapper.className='kplex-central-editor-content';mount.className='kplex-central-editor-leaf-host';header.className='view-header-title';header.contentEditable='true';header.tabIndex=-1;header.style.display='none';editable.className='cm-content';editable.contentEditable='true';drawing.className='excalidraw';drawing.tabIndex=0;mount.append(header,editable,preview,drawing);wrapper.append(mount);root.append(wrapper);document.body.append(root,external);
      const originalHasFocus=document.hasFocus;document.hasFocus=()=>true;
      let sidecars=0,mode='source',activations=0,live=true,nativeCalls=0;const hostLeaf={};const plugin={hasAssociatedEditor:leaf=>leaf===hostLeaf,focusAssociatedEditor:leaf=>{if(leaf===hostLeaf){sidecars++;return true}return false},isActionSurfaceCurrent:()=>true,revealActionSurface:async()=>true};
      const actions=createAppFocusActions(plugin,{surfaceId:'owned'},{current:root},hostLeaf),context={request:{id:'editor.focus',source:'local-hotkey'},generation:1,target:{kind:'none'}};
      const nativeView={getViewType:()=>mode==='drawing'?'excalidraw':'markdown',setEphemeralState(state){nativeCalls++;if(!state.focus||!state.focusOnMobile)throw Error('canonical focus state required');if(mode==='source')editable.focus();if(mode==='preview'){preview.tabIndex=-1;preview.focus()}return {status:'completed'}}};
      const release=registerEmbeddedMarkdownFocusTarget(mount,()=>focusEmbeddedMarkdownView(mount,nativeView,()=>activations++),()=>live);
      root.focus();const legacyMatch=root.querySelector('.kplex-central-editor-content .cm-content, .kplex-central-editor-content [contenteditable="true"]');legacyMatch.focus();
      const oldSelectorFails=legacyMatch===header&&document.activeElement===root;
      const outcome=await actions.editorFocus.execute(context),nativeFocus=outcome.status==='completed'&&document.activeElement===editable&&sidecars===0;
      mode='preview';editable.style.display='none';root.focus();await actions.editorFocus.execute(context);const previewFocus=document.activeElement===preview;
      mode='drawing';root.focus();const beforeDrawing=nativeCalls;await actions.editorFocus.execute(context);const drawingFocus=document.activeElement===drawing&&nativeCalls===beforeDrawing;
      mode='no-op';root.focus();const beforeFailure=activations,failed=await actions.editorFocus.execute(context);const falseCompletionRejected=failed.status==='unavailable'&&document.activeElement===root&&activations===beforeFailure;
      mode='source';editable.style.display='block';live=false;const beforeRetired=nativeCalls,retired=await actions.editorFocus.execute(context);const retiredDeclines=retired.status==='unavailable'&&nativeCalls===beforeRetired;live=true;
      document.hasFocus=()=>false;const background=await actions.editorFocus.execute(context);const backgroundDeclines=background.status==='unavailable'&&nativeCalls===beforeRetired;document.hasFocus=()=>true;
      release();const released=await actions.editorFocus.execute(context);const exactCleanup=released.status==='unavailable'&&nativeCalls===beforeRetired;
      mount.remove();const guest=document.createElement('iframe');guest.className='kplex-embedded-web-frame';wrapper.append(guest);root.focus();const guestOutcome=await actions.editorFocus.execute(context);const guestFocus=guestOutcome.status==='completed'&&document.activeElement===guest;guest.remove();
      wrapper.remove();external.focus();await actions.editorFocus.execute(context);const managedSidecarOnly=sidecars===1&&document.activeElement===external;
      document.hasFocus=originalHasFocus;root.remove();external.remove();return{oldSelectorFails,nativeFocus,previewFocus,drawingFocus,falseCompletionRejected,retiredDeclines,backgroundDeclines,exactCleanup,guestFocus,managedSidecarOnly};
    })()`);
    assert.deepEqual(result, { oldSelectorFails:true,nativeFocus:true,previewFocus:true,drawingFocus:true,falseCompletionRejected:true,retiredDeclines:true,backgroundDeclines:true,exactCleanup:true,guestFocus:true,managedSidecarOnly:true });
  } finally { await browser.cleanup(); }
});

test("embedded native focus reconciles command ownership after ancestor bubbling without changing Scope or host policy", async () => {
  const browser = await chromiumHarness(await bundle());
  try {
    const result = await browser.evaluate(`(()=>{
      const {registerEmbeddedMarkdownFocus,createEmbeddedActivation,registerEmbeddedMarkdownFocusTarget,focusEmbeddedMarkdown}=window.sourceModules;
      const outer=document.createElement('div'),mount=document.createElement('div'),inner=document.createElement('div'),editor=document.createElement('input'),toolbar=document.createElement('button'),external=document.createElement('input');
      inner.append(editor);mount.append(inner);outer.append(mount,toolbar);document.body.append(outer,external);
      const originalHasFocus=document.hasFocus;document.hasFocus=()=>true;
      const hostLeaf={id:'native-host'},leaf={id:'native-editor'},scope={id:'native-editor-scope'},stack=[scope];let active=null,activationCalls=0,live=true;
      const app={workspace:{setActiveLeaf(value){active=value;activationCalls++}}};
      const desktop=createEmbeddedActivation(app,hostLeaf,leaf,false);
      // Native WorkspaceLeaf installs focusin at each container. React captures earlier;
      // the real outer leaf's bubble handler therefore overwrites the synthetic leaf.
      outer.addEventListener('focusin',()=>app.workspace.setActiveLeaf(hostLeaf));inner.addEventListener('focusin',()=>app.workspace.setActiveLeaf(leaf));
      mount.addEventListener('focusin',desktop.activate,true);editor.focus();const oldAncestorWins=active===hostLeaf;
      external.focus();const release=registerEmbeddedMarkdownFocus(mount,desktop.activate,()=>live);editor.focus();const reconciled=active===leaf&&stack.length===1&&stack[0]===scope;
      let before=activationCalls;toolbar.focus();const toolbarExcluded=active===hostLeaf&&activationCalls===before+1;
      before=activationCalls;external.focus();const externalExcluded=activationCalls===before;
      live=false;editor.focus();const retiredExcluded=active===hostLeaf;external.focus();live=true;
      release();editor.focus();const exactCleanup=active===hostLeaf;
      external.focus();const mobile=createEmbeddedActivation(app,hostLeaf,leaf,true),releaseMobile=registerEmbeddedMarkdownFocus(mount,mobile.activate,()=>true);editor.focus();const hostPolicyPreserved=active===hostLeaf;releaseMobile();
      external.focus();desktop.dispose();const releaseDisposed=registerEmbeddedMarkdownFocus(mount,desktop.activate,()=>true);editor.focus();const disposedActivationDeclines=active===hostLeaf;releaseDisposed();
      external.focus();const frame=document.createElement('iframe');document.body.append(frame);const popoutDocument=frame.contentDocument;
      popoutDocument.hasFocus=()=>true;const popoutMount=popoutDocument.createElement('div'),popoutEditor=popoutDocument.createElement('input'),popoutOther=popoutDocument.createElement('input');popoutMount.append(popoutEditor);popoutDocument.body.append(popoutMount,popoutOther);
      let popoutCalls=0,targetCalls=0;const releasePopout=registerEmbeddedMarkdownFocus(popoutMount,()=>popoutCalls++,()=>true),releasePopoutTarget=registerEmbeddedMarkdownFocusTarget(popoutMount,()=>{targetCalls++;return true},()=>true);popoutEditor.focus();const ownerDocumentWorks=popoutCalls===1&&focusEmbeddedMarkdown(popoutMount)&&targetCalls===1;
      popoutOther.focus();popoutDocument.hasFocus=()=>false;popoutEditor.focus();const backgroundDocumentExcluded=popoutCalls===1&&!focusEmbeddedMarkdown(popoutMount)&&targetCalls===1;
      popoutDocument.hasFocus=()=>true;external.focus();document.body.append(document.adoptNode(popoutMount));popoutEditor.focus();const migratedDocumentExcluded=popoutCalls===1&&!focusEmbeddedMarkdown(popoutMount)&&targetCalls===1;
      releasePopout();releasePopoutTarget();popoutMount.remove();frame.remove();document.hasFocus=originalHasFocus;outer.remove();external.remove();return{oldAncestorWins,reconciled,toolbarExcluded,externalExcluded,retiredExcluded,exactCleanup,hostPolicyPreserved,disposedActivationDeclines,ownerDocumentWorks,backgroundDocumentExcluded,migratedDocumentExcluded};
    })()`);
    assert.deepEqual(result, { oldAncestorWins:true,reconciled:true,toolbarExcluded:true,externalExcluded:true,retiredExcluded:true,exactCleanup:true,hostPolicyPreserved:true,disposedActivationDeclines:true,ownerDocumentWorks:true,backgroundDocumentExcluded:true,migratedDocumentExcluded:true });
  } finally { await browser.cleanup(); }
});

test("folder creation retains original native folder, continuation and post-close UI fences", async () => {
  const browser = await chromiumHarness(await bundle());
  try {
    const result = await browser.evaluate(`(async()=>{
      const {CreateFolderNoteModal,captureSurfaceContinuation}=window.sourceModules;window.testNotices=[];
      const root=document.createElement('div'),invoker=document.createElement('button');root.append(invoker);document.body.append(root);invoker.focus();
      const folder={path:'Folder'},vaultRoot={path:'/'},page={path:'Created.md',file:{path:'Created.md'}},renameListeners=new Set();let currentFolder=folder,writes=0,closed=0,follow=0,edit=0,current=true,release;
      let pending=new Promise(r=>release=r),writtenPath;
      const plugin={app:{vault:{getRoot:()=>vaultRoot,getFolderByPath:()=>currentFolder,on:(_name,callback)=>{renameListeners.add(callback);return callback},offref:callback=>renameListeners.delete(callback)}},translator:(key,params)=>key==='folderNote.help'?'Create inside '+params.folder:key,settings:{editNewNodeAfterCreate:false,newNodeDefaultType:'markdown',lastActivePath:'A'},isExcalidrawAvailable:()=>false,saveSettings:async()=>{},
        validateRelatedNoteName:name=>({valid:Boolean(name),existing:false,stem:name}),rememberNewNodeDefaultType:async()=>{},
        createNewNodeInFolder:async(target,name,kind,native)=>{writes++;writtenPath=target.path;if(native!==folder)throw Error('lost native folder');await pending;return page},
        finishNewRelatedNode:async(target,host,editing,stillValid)=>{if(stillValid()){follow++;if(editing)edit++}}};
      const makeModal=()=>{const modal=new CreateFolderNoteModal(plugin,{path:'folder:'+folder.path,isFolder:true,name:'Folder'}, {view:{containerEl:root}},
        {current:()=>current,onClosed:()=>closed++,focusGraph:()=>root.focus()});modal.open();return modal};
      let modal=makeModal();modal.noteName='First';folder.path='Renamed';for(const callback of renameListeners)callback(folder,'Folder');
      const displayedOrigin=modal.contentEl.querySelector('p').textContent==='Create inside Renamed';
      const task=modal.create('markdown','another');await modal.create('markdown','another');const singleflight=writes===1;release();await task;
      const another=modal.opened&&modal.noteName===''&&writtenPath==='folder:Renamed';
      modal.noteName='Second';pending=Promise.resolve();await modal.create('markdown','return');
      const returned=!modal.opened&&document.activeElement===invoker&&closed===1&&follow===0;
      modal=makeModal();modal.noteName='Third';currentFolder={path:folder.path};await modal.create('markdown','edit');const replacement=writes===2&&window.testNotices.at(-1)==='addRelated.endpointChanged';
      currentFolder=folder;pending=new Promise(r=>release=r);const late=modal.create('markdown','follow');modal.close();current=false;release();await late;
      const noLateFocus=follow===0&&closed===2;
      current=true;modal=makeModal();modal.noteName='Failure';let rejectWrite;pending=new Promise((_resolve,reject)=>rejectWrite=reject);const noticesBefore=window.testNotices.length;
      const failure=modal.create('markdown','follow');invoker.focus();rejectWrite(Error('native write failed'));await failure;
      const outsideNotificationFence=modal.invalidated&&window.testNotices.length===noticesBefore&&follow===0;modal.close();
      modal=makeModal();modal.noteName='Navigated';pending=new Promise(r=>release=r);const navigated=modal.create('markdown','follow');plugin.settings.lastActivePath='B';release();await navigated;
      const navigationFence=modal.invalidated&&follow===0;modal.close();
      let liveRoot=root,snapshot={mounted:true,center:{identity:'A',fileIdentity:'one'},interactionRevision:1};
      const guard=captureSurfaceContinuation(()=>liveRoot,()=>snapshot);const initiallyValid=guard();snapshot={...snapshot,interactionRevision:2};const interactionRetired=!guard();
      const newer=captureSurfaceContinuation(()=>liveRoot,()=>snapshot);liveRoot=document.createElement('div');const remountRetired=!newer();
      const renameCleanup=renameListeners.size===0;root.remove();return{displayedOrigin,renameCleanup,singleflight,another,returned,replacement,noLateFocus,outsideNotificationFence,navigationFence,initiallyValid,interactionRetired,remountRetired};
    })()`);
    assert.deepEqual(result, { displayedOrigin:true,renameCleanup:true,singleflight:true,another:true,returned:true,replacement:true,noLateFocus:true,outsideNotificationFence:true,navigationFence:true,initiallyValid:true,interactionRetired:true,remountRetired:true });
  } finally { await browser.cleanup(); }
});

test("focused surface Scope and DOM deliveries arbitrate once, preserve editor parents and retire on rebinding/unmount", async () => {
  const browser = await chromiumHarness(await bundle());
  try {
    const result = await browser.evaluate(`(async()=>{
      const {createElement:h,useRef,createRoot,flushSync,usePlexActions,ActionManager,migrateActionPreferences,Scope,scopes,surfaceAction,forwardActionScopeKey}=window.sourceModules;
      window.testNotices=[];window.testEditorScope=new Scope();
      const graphScope=new Scope(),stack=[],hosts=new Map(),listeners=new Set();let ready=0,moves=0,search=0,parentFind=0,parentArrow=0,parentEnter=0,parentSection=0,parentUndefined=0,documentFocused=true,exactReceiver=false;
      const originalHasFocus=document.hasFocus;document.hasFocus=()=>documentFocused;
      graphScope.register([],'Enter',()=>{parentEnter++});window.testEditorScope.register(['Mod'],'f',()=>{parentFind++});window.testEditorScope.register(['Mod'],'ArrowUp',()=>{parentArrow++});
      const rejectedContext={key:'q',modifiers:'Ctrl',vkey:'q'};let exactParentContext=false;graphScope.register(['Mod'],'q',(_event,context)=>{parentSection++;exactParentContext=context===rejectedContext;return false});
      graphScope.register(['Mod'],'w',()=>{parentUndefined++});const parentDispatch=graphScope.handleKey;graphScope.handleKey=function(event,context){exactReceiver=this===graphScope;return parentDispatch.call(this,event,context)};
      const manager=new ActionManager({readCommandContext:()=>({sharedCenter:null})});
      const plugin={app:{scope:graphScope,keymap:{pushScope:scope=>stack.push(scope),popScope:scope=>{const at=stack.indexOf(scope);if(at>=0)stack.splice(at,1)}}},
       actionManager:manager,settings:{actionPreferences:migrateActionPreferences(undefined).preferences},
       actionWindowId:()=>"main",isKplexLeafVisible:()=>true,hasAssociatedEditor:()=>false,
       registerActionSurfaceHost:(id,generation)=>{hosts.set(id,generation);return()=>{if(hosts.get(id)===generation)hosts.delete(id)}},
       subscribeActionPreferences:callback=>{listeners.add(callback);return()=>listeners.delete(callback)},subscribeKplexVisibility:()=>()=>{},translator:key=>key};
      plugin.settings.actionPreferences.localBindings['section.fold-descendants']=[{match:'key',value:'q',modifiers:['mod']}];
      plugin.settings.actionPreferences.localBindings['section.unfold-descendants']=[{match:'key',value:'w',modifiers:['mod']}];
      const leaf={view:{scope:graphScope}},center={path:"A",isFolder:false,isTag:false,url:null,file:null};
      let surface;
      function Harness(){const root=useRef(null),graph=useRef({normalMode:true,readSelected:()=>null,implementations:{"selection.move.up":surfaceAction(()=>{moves++})}});
        surface=usePlexActions({plugin,hostLeaf:leaf,root,graph,convention:"windows",center,mounted:true,historyBack:false,historyForward:false,
         implementations:{"search.focus":surfaceAction(()=>{search++})},onReady:()=>{ready++}});
        return h('div',{id:'plex',ref:root,tabIndex:0},h('button',{id:'button'},'Button'),h('div',{className:'kplex-central-editor-content'},h('div',{id:'editor',contentEditable:true,tabIndex:0})))}
      const mount=document.createElement('div');document.body.append(mount);const reactRoot=createRoot(mount);flushSync(()=>reactRoot.render(h(Harness)));
      await new Promise(r=>setTimeout(r,0));const root=document.querySelector('#plex');root.focus();
      const originalGeneration=hosts.get(surface.surfaceId),nativeScope=stack.at(-1);
      const native=new KeyboardEvent('keydown',{key:'ArrowUp',code:'ArrowUp',bubbles:true,cancelable:true});Object.defineProperty(native,'target',{value:root,configurable:true});
      nativeScope.handleKey(native);root.dispatchEvent(native);await Promise.resolve();
      const exactlyOnce=moves===1&&native.defaultPrevented;
      const rejected=new KeyboardEvent('keydown',{key:'q',ctrlKey:true,bubbles:true,cancelable:true});Object.defineProperty(rejected,'target',{value:root});nativeScope.handleKey(rejected,rejectedContext);root.dispatchEvent(rejected);
      const rejectedFallsBack=parentSection===1&&exactParentContext;
      const retiredCallback=nativeScope.handlers.find(handler=>handler.key==='q').dispatch;
      const undefinedEvent=new KeyboardEvent('keydown',{key:'w',ctrlKey:true,bubbles:true,cancelable:true});Object.defineProperty(undefinedEvent,'target',{value:root});nativeScope.handleKey(undefinedEvent);root.dispatchEvent(undefinedEvent);nativeScope.handleKey(undefinedEvent);
      const parentUndefinedOnce=parentUndefined===1&&!undefinedEvent.defaultPrevented&&exactReceiver;
      const absent=new Scope();absent.handleKey=undefined;const absentMethodSafe=forwardActionScopeKey(absent,rejected,rejectedContext)===undefined&&parentSection===1;
      const button=document.querySelector('#button');button.focus();const buttonArrow=new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true});button.dispatchEvent(buttonArrow);
      const widgetOwned=moves===1&&!buttonArrow.defaultPrevented;
      const buttonEnter=new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});Object.defineProperty(buttonEnter,'target',{value:button});stack.at(-1).handleKey(buttonEnter);button.dispatchEvent(buttonEnter);
      const nativeEnter=parentEnter===1&&!buttonEnter.defaultPrevented;
      const editor=document.querySelector('#editor');editor.focus();const editorParent=stack.at(-1)?.parent===window.testEditorScope;
      const editorArrow=new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true});editor.dispatchEvent(editorArrow);
      const editorOwned=moves===1&&!editorArrow.defaultPrevented;
      for(const key of ['f','ArrowUp']){const event=new KeyboardEvent('keydown',{key,ctrlKey:true,bubbles:true,cancelable:true});Object.defineProperty(event,'target',{value:editor});stack.at(-1).handleKey(event);editor.dispatchEvent(event)}
      const nativeEditorParent=parentFind===1&&parentArrow===1;
      plugin.settings.actionPreferences.localBindings['search.focus']=[{match:'key',value:'F4',modifiers:[]}];for(const callback of listeners)callback();const f4=new KeyboardEvent('keydown',{key:'F4',bubbles:true,cancelable:true});editor.dispatchEvent(f4);await Promise.resolve();
      const editorSearch=search===1&&f4.defaultPrevented;
      root.focus();const prompt=document.createElement('div');prompt.className='prompt';const palette=document.createElement('input');prompt.append(palette);document.body.append(prompt);palette.focus();
      const paletteOrigin=manager.readSnapshot(surface.surfaceId).commandFocusRegion==='graph'&&stack.length===0;
      const outside=document.createElement('input');document.body.append(outside);outside.focus();const externalCleared=manager.readSnapshot(surface.surfaceId).commandFocusRegion==='external';
      root.focus();plugin.settings.actionPreferences={...plugin.settings.actionPreferences,localBindings:{...plugin.settings.actionPreferences.localBindings,'selection.move.up':[{match:'key',value:'j',modifiers:[]}]}};
      const previousScope=stack.at(-1);for(const callback of listeners)callback();
      const immediate=new KeyboardEvent('keydown',{key:'j',bubbles:true,cancelable:true});Object.defineProperty(immediate,'target',{value:root});stack.at(-1).handleKey(immediate);root.dispatchEvent(immediate);await Promise.resolve();
      const synchronousRebound=moves===2&&immediate.defaultPrevented&&previousScope.handlers.length===0;
      await new Promise(r=>setTimeout(r,0));
      const sameGeneration=hosts.get(surface.surfaceId)===originalGeneration;
      const retiredEvent=new KeyboardEvent('keydown',{key:'q',ctrlKey:true,bubbles:true,cancelable:true});Object.defineProperty(retiredEvent,'target',{value:root});retiredCallback(retiredEvent,rejectedContext);const retiredCannotForward=parentSection===1&&!retiredEvent.defaultPrevented;
      const retiredOldKeys=nativeScope.handlers.length===0;
      root.dispatchEvent(new KeyboardEvent('keydown',{key:'j',bubbles:true,cancelable:true}));await Promise.resolve();const rebound=moves===3;
      const liveScopes=stack.length;
      documentFocused=false;window.dispatchEvent(new Event('blur'));for(const callback of listeners)callback();const backgroundLease=stack.length===0;
      documentFocused=true;window.dispatchEvent(new Event('focus'));const foregroundLease=stack.length===1;
      flushSync(()=>reactRoot.unmount());await Promise.resolve();
      const cleaned=stack.length===0&&hosts.size===0&&listeners.size===0&&scopes.every(scope=>scope===graphScope||scope===window.testEditorScope||scope.handlers.length===0);
      mount.remove();prompt.remove();outside.remove();manager.dispose();document.hasFocus=originalHasFocus;
      return {exactlyOnce,rejectedFallsBack,parentUndefinedOnce,absentMethodSafe,retiredCannotForward,widgetOwned,nativeEnter,editorParent,editorOwned,nativeEditorParent,editorSearch,paletteOrigin,externalCleared,synchronousRebound,sameGeneration,retiredOldKeys,rebound,liveScopes,backgroundLease,foregroundLease,cleaned,ready};
    })()`);
    assert.deepEqual(result, { exactlyOnce: true, rejectedFallsBack: true, parentUndefinedOnce: true, absentMethodSafe: true, retiredCannotForward: true, widgetOwned: true, nativeEnter: true, editorParent: true, editorOwned: true, nativeEditorParent: true, editorSearch: true,
      paletteOrigin: true, externalCleared: true, synchronousRebound: true, sameGeneration: true, retiredOldKeys: true, rebound: true, liveScopes: 1, backgroundLease: true, foregroundLease: true, cleaned: true, ready: 1 });
  } finally { await browser.cleanup(); }
});

test("local menus capture center separately from strict selection, and picker close releases before dispatch", async () => {
  const browser = await chromiumHarness(await bundle());
  try {
    const result = await browser.evaluate(`(async()=>{
      const {ActionMenuModal,ActionTargetPicker,ActionManager,ACTION_BY_ID,migrateActionPreferences,surfaceAction}=window.sourceModules;
      window.testNotices=[];const calls=[];const center={identity:'A',path:'A',kind:'file',fileIdentity:'original'};let selected=null,liveCenter={identity:'B',path:'B',kind:'file'};
      const releases=[],dispatchReleased=[];
      const implementations={};for(const id of ['relationship.create-center.child','relationship.create-selected.child','node.delete','pin.toggle'])implementations[id]=surfaceAction(context=>{dispatchReleased.push(releases.includes(id));calls.push([id,context.target.node.identity,context.target.node.fileIdentity]);});
      const manager=new ActionManager({readCommandContext:()=>({sharedCenter:liveCenter}),implementations});
      manager.registerSurface({id:'surface',generation:1,readSnapshot:()=>({mounted:true,visible:true,center:liveCenter,selected:null,focusRegion:'graph',interactionRevision:0})});
      let modifierEvent=null;const nativeApp={keymap:{updateModifiers:event=>modifierEvent=event}};
      const plugin={app:nativeApp,translator:key=>key,settings:{actionPreferences:migrateActionPreferences(undefined).preferences}};
      const menu=new ActionMenuModal(plugin,manager,'surface',()=>({center,selected}),()=>releases.push('relationship.create-center.child'));
      const paletteRow=menu.modalEl.createDiv({cls:'suggestion-item'}),pinAction=ACTION_BY_ID.get('pin.toggle');menu.renderSuggestion({item:pinAction},paletteRow);
      const nativePaletteRow=menu.modalEl.classList.contains('kplex-action-menu')&&paletteRow.matches('.suggestion-item.mod-complex')&&paletteRow.querySelector(':scope > .suggestion-content > .suggestion-title').textContent===pinAction.labelKey&&paletteRow.querySelector(':scope > .suggestion-content > .suggestion-note').textContent===pinAction.descriptionKey&&Boolean(paletteRow.querySelector(':scope > .suggestion-aux .suggestion-hotkey.setting-hotkey'));
      const strictHidden=!menu.getItems().some(item=>item.id==='node.delete'||item.id==='relationship.create-selected.child');
      menu.open();menu.selectSuggestion({item:ACTION_BY_ID.get('relationship.create-center.child')},new KeyboardEvent('keydown',{key:'Enter'}));await Promise.resolve();await Promise.resolve();
      selected={node:{identity:'C',path:'C',kind:'file'},occurrenceId:'C@parent'};
      const second=new ActionMenuModal(plugin,manager,'surface',()=>({center,selected}),()=>releases.push('relationship.create-selected.child'));second.open();second.selectSuggestion({item:ACTION_BY_ID.get('relationship.create-selected.child')},new MouseEvent('click'));second.selectSuggestion({item:ACTION_BY_ID.get('relationship.create-selected.child')},new MouseEvent('click'));await Promise.resolve();await Promise.resolve();
      let released=false,chooseAfterRelease=false,choices=0;const chooseEvent=new KeyboardEvent('keydown',{key:'Enter',metaKey:true}),picker=new ActionTargetPicker(nativeApp,[{label:'A',value:center}],'pick',(value,event)=>{choices++;chooseAfterRelease=released&&value.fileIdentity==='original'&&event===chooseEvent&&event.metaKey},()=>{released=true});picker.open();const match={item:picker.getItems()[0]};picker.selectSuggestion(match,chooseEvent);picker.selectSuggestion(match,chooseEvent);
      const preservedModifiers=modifierEvent===chooseEvent;let cancelledChoices=0,cancelledReleases=0;const cancelled=new ActionTargetPicker(nativeApp,[{label:'A',value:center}],'cancel',()=>cancelledChoices++,()=>cancelledReleases++);cancelled.open();const cancelledMatch={item:cancelled.getItems()[0]};cancelled.close();cancelled.selectSuggestion(cancelledMatch,chooseEvent);cancelled.onChooseItem(cancelledMatch.item,chooseEvent);cancelled.close();
      const retiredMenu=new ActionMenuModal(plugin,manager,'surface',()=>({center,selected}));retiredMenu.open();retiredMenu.close();retiredMenu.selectSuggestion({item:ACTION_BY_ID.get('pin.toggle')},chooseEvent);await Promise.resolve();
      const pending=surfaceAction(()=>({status:'saved-pending',affected:[center],reasonKey:'actions.savedPending'}));const outcome=await pending.execute({});
      manager.dispose();return{nativePaletteRow,strictHidden,calls,dispatchReleased,releases,chooseAfterRelease,released,choices,preservedModifiers,cancelledChoices,cancelledReleases,pendingPreserved:outcome.status==='saved-pending'};
    })()`);
    assert.equal(result.nativePaletteRow, true);
    assert.equal(result.strictHidden, true);
    assert.deepEqual(result.calls, [["relationship.create-center.child", "A", "original"], ["relationship.create-selected.child", "C", null]]);
    assert.deepEqual(result.dispatchReleased, [true,true]);
    assert.equal(result.releases.length, 2);
    assert.equal(result.chooseAfterRelease, true);
    assert.equal(result.released, true);
    assert.equal(result.choices, 1);
    assert.equal(result.preservedModifiers, true);
    assert.equal(result.cancelledChoices, 0);
    assert.equal(result.cancelledReleases, 1);
    assert.equal(result.pendingPreserved, true);
  } finally { await browser.cleanup(); }
});

test("graph typing matches exact displayed label phrases across areas and wraps distinct occurrences without hiding nodes", async () => {
  const browser = await chromiumHarness(await bundle());
  try {
    const result = await browser.evaluate(`(()=>{
      const {createElement:h,createRoot,flushSync,usePlexKeyboardNavigation,usePlexTypeSelection,PlexTypeSelectionStatus,matchTypeSelection,nextTypeSelection}=sourceModules;
      const style=document.createElement('style');style.textContent=${JSON.stringify(readFileSync(new URL("../styles.css", import.meta.url), "utf8"))};document.head.append(style);
      const nodes=[{id:'center',path:'Center',label:'Center',section:'center',x:0,y:0},{id:'first',path:'Shared',label:'Alpha beta',section:'parent',x:0,y:-100},{id:'middle',path:'Alpine',label:'Alpine',section:'left',x:-100,y:0},{id:'last',path:'Shared',label:'ALPHA BETA',section:'sibling',x:200,y:0},{id:'expanded',path:'Shared',label:'Alpha beta',section:'child',x:0,y:500},{id:'emoji',path:'Emoji',label:'😀',section:'right',x:100,y:0}];
      let options={activePath:'Center',normalMode:true,nodes},selection,typing;const revealed=[];
      function Harness(){selection=usePlexKeyboardNavigation({...options,crossSections:false,reveal:node=>revealed.push(node.id)});typing=usePlexTypeSelection({...options,selection});return h('div',{className:'type-viewport',style:{position:'relative',width:'390px',height:'844px'}},...options.nodes.map(node=>h('div',{key:node.id,'data-test-node':node.id},node.label)),h(PlexTypeSelectionStatus,{...typing,translate:(_key,args)=>JSON.stringify(args)}))}
      const mount=document.createElement('div');document.body.append(mount);const root=createRoot(mount),render=()=>flushSync(()=>root.render(h(Harness)));render();
      const press=(key,extra={})=>{let handled;flushSync(()=>{handled=typing.handleKey(new KeyboardEvent('keydown',{key,cancelable:true,...extra}))});return handled};
      const exact=matchTypeSelection(nodes,'ALPHA BETA').map(node=>node.id).join(',')==='first,last,expanded'&&matchTypeSelection(nodes,'al be').length===0&&matchTypeSelection(nodes,'Alpha  beta').length===0&&matchTypeSelection(nodes,'Shared').length===0;
      const phraseMatches=matchTypeSelection(nodes,'alpha b');const afterExcludedOrigin=nextTypeSelection(nodes,phraseMatches,'middle',1)?.id==='last'&&nextTypeSelection(nodes,phraseMatches,'middle',-1)?.id==='first';
      flushSync(()=>selection.select('middle'));for(const key of 'Alpha beta')press(key);
      const acrossAreas=typing.query==='Alpha beta'&&typing.count===3&&selection.readSelected()?.id==='last'&&typing.index===2;
      press('Tab');const next=selection.readSelected()?.id==='expanded';press('Tab');const wrap=selection.readSelected()?.id==='first';press('Tab',{shiftKey:true});const reverseWrap=selection.readSelected()?.id==='expanded';
      press('z');const noMatch=typing.count===0&&selection.readSelected()?.id==='expanded';press('Backspace');const backspace=typing.query==='Alpha beta'&&selection.readSelected()?.id==='first';press('Backspace',{shiftKey:true});const shiftBackspace=typing.query==='Alpha bet'&&selection.readSelected()?.id==='last';
      const feedback=mount.querySelector('.kplex-type-selection'),receipt=feedback.dataset.kplexTypeQuery==='Alpha bet'&&feedback.dataset.kplexTypeCount==='3'&&feedback.dataset.kplexTypeIndex==='2';
      press('Escape');const escape=typing.query===''&&selection.readSelected()?.id==='last'&&!mount.querySelector('.kplex-type-selection');
      const noLeadingSpace=!press(' ');press('😀');press('Backspace');const unicodeEdit=typing.query===''&&selection.readSelected()?.id==='emoji';
      const rejected=['Dead','Process','ArrowUp','Enter'].every(key=>!press(key))&&!press('a',{isComposing:true})&&!press('a',{ctrlKey:true})&&!press('a',{metaKey:true})&&!press('a',{altKey:true});
      const altGraph=new KeyboardEvent('keydown',{key:'a',cancelable:true});Object.defineProperty(altGraph,'getModifierState',{value:name=>name==='AltGraph'});const altGraphSafe=!typing.handleKey(altGraph);
      press('A');options={...options,normalMode:false};render();const inactive=typing.query===''&&!press('l');options={...options,normalMode:true};render();const notResurrected=typing.query==='';
      press('A');options={...options,activePath:'Other'};render();options={...options,activePath:'Center'};render();const centerRetired=typing.query==='';
      for(const key of 'Alpha b')press(key);options={...options,nodes:nodes.filter(node=>node.id!=='first')};render();press('Tab');const filtered=typing.count===2&&selection.readSelected()?.id!=='first';
      const noHiding=mount.querySelectorAll('[data-test-node]').length===options.nodes.length&&options.nodes.length===nodes.length-1;
      flushSync(()=>{typing.clear();for(let index=0;index<250;index++)typing.handleKey(new KeyboardEvent('keydown',{key:'x',cancelable:true}))});
      const status=mount.querySelector('.kplex-type-selection'),querySpan=status.querySelector('.kplex-type-selection-query'),countSpan=status.querySelector('.kplex-type-selection-count'),statusRect=status.getBoundingClientRect(),viewportRect=mount.querySelector('.type-viewport').getBoundingClientRect();
      const compactFeedback=statusRect.right<=viewportRect.right&&statusRect.height<48&&querySpan.scrollWidth>querySpan.clientWidth&&getComputedStyle(querySpan).textOverflow==='ellipsis'&&countSpan.getBoundingClientRect().right<=statusRect.right&&getComputedStyle(status).pointerEvents==='none';
      const layoutControl=document.createElement('div');layoutControl.className='kplex-layout-controls';const layoutButton=document.createElement('button');layoutButton.className='kplex-layout-toggle';layoutButton.textContent='Layout';layoutControl.append(layoutButton);mount.querySelector('.type-viewport').append(layoutControl);const controlRect=layoutControl.getBoundingClientRect();
      const controlsClear=statusRect.right<=controlRect.left||statusRect.left>=controlRect.right||statusRect.bottom<=controlRect.top||statusRect.top>=controlRect.bottom;
      const find=document.createElement('div');find.className='kplex-find';const findButton=document.createElement('button');findButton.textContent='Find';find.append(findButton);mount.querySelector('.type-viewport').append(find);const findRect=find.getBoundingClientRect();const symmetricCorners=Math.abs(statusRect.top-findRect.top)<1&&Math.abs(statusRect.left-viewportRect.left-(viewportRect.right-findRect.right))<1&&statusRect.right<=findRect.left;
      flushSync(()=>root.unmount());mount.remove();style.remove();return{exact,afterExcludedOrigin,acrossAreas,next,wrap,reverseWrap,noMatch,backspace,shiftBackspace,receipt,escape,noLeadingSpace,unicodeEdit,rejected,altGraphSafe,inactive,notResurrected,centerRetired,filtered,noHiding,compactFeedback,controlsClear,symmetricCorners,revealUsed:revealed.includes('first')&&revealed.includes('last')&&revealed.includes('expanded')};
    })()`);
    assert.deepEqual(result, Object.fromEntries(Object.keys(result).map(key => [key, true])));
  } finally { await browser.cleanup(); }
});

test("graph typing transport preserves custom actions and native fields while active query controls own finite Scope keys", async () => {
  const browser = await chromiumHarness(await bundle());
  try {
    const result = await browser.evaluate(`(async()=>{
      const {createElement:h,useRef,createRoot,flushSync,usePlexActions,usePlexKeyboardNavigation,usePlexTypeSelection,createGraphSession,ActionManager,migrateActionPreferences,Scope,surfaceAction}=sourceModules;
      window.testNotices=[];window.testEditorScope=new Scope();const parent=new Scope(),stack=[],listeners=new Set(),hosts=new Map();let parentTabs=0,parentLetters=0,parentShiftLetters=0,parentOther=0,parentOption=0,renames=0,history=0,search=0,help=0;parent.register([],'Tab',()=>{parentTabs++});parent.register(['Shift'],'Tab',()=>{parentTabs++});parent.register([],'A',()=>{parentLetters++;return false});parent.register(['Shift'],'Q',()=>{parentShiftLetters++;return false});parent.register([],'F7',()=>{parentOther++});parent.register(['Alt'],'÷',()=>{parentOption++;return false});parent.register(['Alt'],'®',()=>{parentOption++;return false});
      const previousHasFocus=document.hasFocus;document.hasFocus=()=>true;
      const manager=new ActionManager({readCommandContext:()=>({sharedCenter:null})}),plugin={app:{scope:parent,keymap:{pushScope:scope=>stack.push(scope),popScope:scope=>{const index=stack.indexOf(scope);if(index>=0)stack.splice(index,1)}}},actionManager:manager,settings:{actionPreferences:migrateActionPreferences(null,'windows').preferences},translator:key=>key,actionWindowId:()=>"main",isKplexLeafVisible:()=>true,hasAssociatedEditor:()=>false,registerActionSurfaceHost:(id,generation)=>{hosts.set(id,generation);return()=>hosts.delete(id)},subscribeActionPreferences:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},subscribeKplexVisibility:()=>()=>{}};
      plugin.settings.actionPreferences.localBindings['node.rename']=[{match:'key',value:'x',modifiers:[]},{match:'code',value:'KeyR',modifiers:['alt']}];plugin.settings.actionPreferences.localBindings['search.focus']=[{match:'code',value:'Slash',modifiers:['alt']}];
      const center={path:'Center',file:null,url:null},nodes=[{id:'center',path:'Center',label:'Center',section:'center',x:0,y:0},{id:'one',path:'One',label:'Alpha beta',section:'parent',x:0,y:-100},{id:'two',path:'Two',label:'ALPHA BETA',section:'child',x:0,y:100}],origin={current:null};let normalMode=true,typing,selection,surface,closedSessions=0;
      const originalCloseSession=manager.closeSession.bind(manager);manager.closeSession=id=>{closedSessions++;return originalCloseSession(id)};
      function Harness(){const root=useRef(null),graph=useRef(null);selection=usePlexKeyboardNavigation({activePath:'Center',normalMode,nodes,crossSections:false,reveal:()=>{}});typing=usePlexTypeSelection({activePath:'Center',normalMode:normalMode&&!origin.current,nodes,selection});graph.current={normalMode,readSelected:()=>{const selected=selection.readSelected();return selected?{node:{identity:selected.path,path:selected.path,kind:'ghost'},occurrenceId:selected.id}:null},implementations:{'node.rename':surfaceAction(()=>{renames++}),'history.back':surfaceAction(()=>{history++}),'history.forward':surfaceAction(()=>{history++})},handleSessionKey:createGraphSession({typeSelection:typing,plugin,selection,keyboardConnectRef:origin,setKeyboardConnect:()=>{},visibleConnectSession:'connect',scene:{nodes:[]},sceneNodeKeys:new Map(),index:{get:()=>null},actionSurfaceId:'surface'})};surface=usePlexActions({plugin,hostLeaf:{view:{scope:parent}},root,graph,convention:'windows',center,mounted:true,historyBack:true,historyForward:true,implementations:{'search.focus':surfaceAction(()=>{search++}),'keyboard.help':surfaceAction(()=>{help++})}});return h('div',{id:'type-plex',ref:root,tabIndex:0},h('input',{id:'vault-search',className:'kplex-search',defaultValue:'untouched'}),h('input',{id:'find',className:'kplex-find',defaultValue:'untouched'}),h('button',{id:'control'},'Control'),h('div',{className:'kplex-central-editor-content'},h('div',{id:'native-editor',contentEditable:true,tabIndex:0})))}
      const mount=document.createElement('div');document.body.append(mount);const reactRoot=createRoot(mount),render=()=>flushSync(()=>reactRoot.render(h(Harness)));render();const root=mount.querySelector('#type-plex');root.focus();
      const send=(key,extra={},target=root,context)=>{let event;flushSync(()=>{event=new KeyboardEvent('keydown',{key,code:extra.code??(key.length===1?'Key'+key.toUpperCase():key),bubbles:true,cancelable:true,...extra});Object.defineProperty(event,'target',{value:target});stack.at(-1)?.handleKey(event,context);target.dispatchEvent(event)});return event};
      send('Tab');send('Tab',{shiftKey:true});const inactiveTabs=parentTabs===2&&typing.query==='';
      send('A');send('l');const textOwned=typing.query==='Al'&&selection.readSelected()?.id==='two'&&parentLetters===0;
      const unrelated=send('F7');stack.at(-1).handleKey(unrelated);const parentFallthrough=parentOther===1&&!unrelated.defaultPrevented&&typing.query==='Al';
      const before=selection.readSelected()?.id;const tab=send('Tab');const once=tab.defaultPrevented&&selection.readSelected()?.id!==before&&parentTabs===2;send('Tab',{shiftKey:true});const reverse=selection.readSelected()?.id===before;
      send('Backspace');await Promise.resolve();const queryEditsDefaultHistory=typing.query==='A'&&history===0;send('Backspace',{shiftKey:true});const shiftedEdit=typing.query===''&&history===0;
      send('A');send('x');await Promise.resolve();await Promise.resolve();const customPrintable=renames===1&&typing.query==='A';
      plugin.settings.actionPreferences.localBindings['history.back']=[{match:'key',value:'Backspace',modifiers:[]}];for(const fn of listeners)fn();send('Backspace');await Promise.resolve();await Promise.resolve();const customizedBackspace=history===1&&typing.query==='A';
      send('÷',{altKey:true,code:'Slash'},root,{key:'÷',vkey:'/',modifiers:'Alt'});await Promise.resolve();await Promise.resolve();const optionGlyph=search===1&&typing.query==='A'&&parentOption===0;
      send('®',{altKey:true,code:'KeyR'},root,{key:'®',vkey:'R',modifiers:'Alt'});await Promise.resolve();await Promise.resolve();const optionLetter=renames===2&&typing.query==='A'&&parentOption===0;
      send('¿',{altKey:true,shiftKey:true,code:'Slash'},root,{key:'¿',vkey:'/',modifiers:'Alt+Shift'});await Promise.resolve();await Promise.resolve();const shiftedBaseKey=help===1&&typing.query==='A';
      const searchInput=mount.querySelector('#vault-search'),findInput=mount.querySelector('#find'),control=mount.querySelector('#control'),editor=mount.querySelector('#native-editor');let fieldsSafe=true;for(const target of [searchInput,findInput,control,editor]){target.focus();const event=send('z',{},target);fieldsSafe=fieldsSafe&&!event.defaultPrevented&&typing.query==='A'}const independent=searchInput.value==='untouched'&&findInput.value==='untouched';
      root.focus();send('Q',{shiftKey:true});const shiftTextOwned=typing.query==='AQ'&&parentShiftLetters===0;send('Escape');const cleared=typing.query==='';send('A');normalMode=false;render();const abnormal=!send('b').defaultPrevented&&typing.query==='';send('A');const inactiveParent=parentLetters===1&&typing.query==='';normalMode=true;render();
      send('A');origin.current={identity:'Origin',path:'Origin',kind:'ghost'};render();const connectionRetired=typing.query==='';const connectionText=send('b');const connectionPriority=!connectionText.defaultPrevented&&typing.query==='';send('Escape');const connectionCancelled=origin.current===null&&closedSessions===1&&typing.query==='';
      const textFallbacks=stack.at(-1).handlers.filter(handler=>handler.key===null),narrowCapture=textFallbacks.length===2&&textFallbacks[0].modifiers.length===0&&textFallbacks[1].modifiers.join()==='Shift'&&stack.at(-1).handlers.every(handler=>handler.modifiers!==null)&&stack.at(-1).handlers.some(handler=>handler.key==='Tab');flushSync(()=>reactRoot.unmount());const cleanup=stack.length===0&&listeners.size===0&&hosts.size===0;manager.dispose();document.hasFocus=previousHasFocus;mount.remove();return{inactiveTabs,textOwned,parentFallthrough,once,reverse,queryEditsDefaultHistory,shiftedEdit,customPrintable,customizedBackspace,optionGlyph,optionLetter,shiftedBaseKey,shiftTextOwned,fieldsSafe,independent,cleared,abnormal,inactiveParent,connectionRetired,connectionPriority,connectionCancelled,narrowCapture,cleanup};
    })()`);
    assert.deepEqual(result, Object.fromEntries(Object.keys(result).map(key => [key, true])));
  } finally { await browser.cleanup(); }
});

test("explicit modified physical Dead shortcuts dispatch once on graph while logical, unmatched and native editing events remain untouched", async () => {
  const browser = await chromiumHarness(await bundle());
  try {
    const result = await browser.evaluate(`(async()=>{
      const{createElement:h,useRef,createRoot,flushSync,usePlexActions,ActionManager,migrateActionPreferences,Scope,surfaceAction}=sourceModules;
      window.testNotices=[];const parent=new Scope();window.testEditorScope=new Scope();const stack=[],listeners=new Set(),hosts=new Map();let runs=0,search=0,parentKeys=0,editorKeys=0;
      for(const modifiers of [[],['Shift'],['Alt','Shift']])parent.register(modifiers,'E',()=>{parentKeys++});parent.register(['Alt','Shift'],'U',()=>{parentKeys++});window.testEditorScope.register(['Alt','Shift'],'E',()=>{editorKeys++});
      const previousHasFocus=document.hasFocus;document.hasFocus=()=>true;
      const manager=new ActionManager({readCommandContext:()=>({sharedCenter:null})}),plugin={app:{scope:parent,keymap:{pushScope:scope=>stack.push(scope),popScope:scope=>{const index=stack.indexOf(scope);if(index>=0)stack.splice(index,1)}}},actionManager:manager,settings:{actionPreferences:migrateActionPreferences(null,'windows').preferences},translator:key=>key,actionWindowId:()=>"main",isKplexLeafVisible:()=>true,hasAssociatedEditor:()=>false,registerActionSurfaceHost:(id,generation)=>{hosts.set(id,generation);return()=>hosts.delete(id)},subscribeActionPreferences:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},subscribeKplexVisibility:()=>()=>{}};
      const physical={match:'code',value:'KeyE',modifiers:['alt','shift']};plugin.settings.actionPreferences.localBindings['pin.toggle']=[physical];
      const center={path:'Center',file:null,url:null},leaf={view:{scope:parent}};
      function Harness(){const root=useRef(null),graph=useRef({normalMode:true,readSelected:()=>null,implementations:{'pin.toggle':surfaceAction(()=>{runs++})}});usePlexActions({plugin,hostLeaf:leaf,root,graph,convention:'windows',center,mounted:true,historyBack:false,historyForward:false,implementations:{'search.focus':surfaceAction(()=>{search++})}});return h('div',{id:'dead-plex',ref:root,tabIndex:0},h('input',{id:'dead-search',className:'kplex-search'}),h('input',{id:'dead-find',className:'kplex-find'}),h('button',{id:'dead-control'},'Control'),h('div',{className:'kplex-central-editor-content'},h('div',{id:'dead-editor',contentEditable:true,tabIndex:0})))}
      const mount=document.createElement('div');document.body.append(mount);const reactRoot=createRoot(mount);flushSync(()=>reactRoot.render(h(Harness)));const root=mount.querySelector('#dead-plex');root.focus();
      const send=(key='Dead',extra={},target=root)=>{const event=new KeyboardEvent('keydown',{key,code:'KeyE',altKey:true,shiftKey:true,bubbles:true,cancelable:true,...extra});Object.defineProperty(event,'target',{value:target});if(extra.altGraph)Object.defineProperty(event,'getModifierState',{value:name=>name==='AltGraph'});const context={key,vkey:event.code==='KeyU'?'U':'E',modifiers:[event.altKey?'Alt':null,event.shiftKey?'Shift':null].filter(Boolean).join('+')};const scope=stack.at(-1);scope?.handleKey(event,context);target.dispatchEvent(event);scope?.handleKey(event,context);return event};
      const accepted=send();await Promise.resolve();await Promise.resolve();const exactlyOnce=accepted.defaultPrevented&&runs===1&&parentKeys===0;
      const guarded=[send('Dead',{altKey:false,shiftKey:false}),send('Dead',{altKey:false}),send('Dead',{isComposing:true}),send('Dead',{altGraph:true}),send('Process'),send('Unidentified')];await Promise.resolve();const nativeSequences=guarded.every(event=>!event.defaultPrevented)&&runs===1;
      plugin.settings.actionPreferences.localBindings['pin.toggle']=[{match:'key',value:'e',modifiers:['alt','shift']}];for(const fn of listeners)fn();const logical=send();await Promise.resolve();const logicalUntouched=!logical.defaultPrevented&&runs===1;
      plugin.settings.actionPreferences.localBindings['pin.toggle']=[physical];for(const fn of listeners)fn();const unconfigured=send('Dead',{code:'KeyU'});await Promise.resolve();const noUnconfigured=!unconfigured.defaultPrevented&&runs===1;
      plugin.settings.actionPreferences.localBindings['pin.toggle']=[];plugin.settings.actionPreferences.localBindings['search.focus']=[physical];for(const fn of listeners)fn();
      const fieldEvents=[];for(const id of ['dead-search','dead-find','dead-control','dead-editor']){const target=mount.querySelector('#'+id);target.focus();fieldEvents.push(send('Dead',{},target))}await Promise.resolve();await Promise.resolve();const editingSafe=fieldEvents.every(event=>!event.defaultPrevented)&&search===0&&runs===1&&editorKeys===1;
      root.focus();const beforeParent=parentKeys;plugin.settings.actionPreferences.localBindings['search.focus']=[];plugin.settings.actionPreferences.localBindings['pin.toggle']=[physical];for(const fn of listeners)fn();
      // A physical native handler sees this dead-key virtual position, but exact code matching
      // declines it. Its original parent callback runs once across repeated Scope/DOM delivery.
      const mismatch=send('Dead',{code:'KeyI'});await Promise.resolve();const parentOnce=!mismatch.defaultPrevented&&parentKeys===beforeParent+1&&runs===1;
      flushSync(()=>reactRoot.unmount());const cleanup=stack.length===0&&listeners.size===0&&hosts.size===0;manager.dispose();document.hasFocus=previousHasFocus;mount.remove();return{exactlyOnce,nativeSequences,logicalUntouched,noUnconfigured,editingSafe,parentOnce,cleanup};
    })()`);
    assert.deepEqual(result, Object.fromEntries(Object.keys(result).map(key => [key, true])));
  } finally { await browser.cleanup(); }
});

test("selection crosses only opted-in boundaries and permanently retires filtered or inactive occurrences", async () => {
  const browser = await chromiumHarness(await bundle());
  try {
    const result = await browser.evaluate(`(async()=>{
      const {createElement:h,createRoot,flushSync,usePlexKeyboardNavigation}=window.sourceModules;
      const nodes=[{id:'center',path:'A',label:'A',section:'center',x:0,y:0},{id:'parent',path:'P',label:'P',section:'parent',x:0,y:-100},{id:'parent2',path:'P2',label:'P2',section:'parent',x:0,y:-140}];
      let options={activePath:'A',normalMode:true,crossSections:false,nodes,reveal:()=>{}},selection;
      function Harness(){selection=usePlexKeyboardNavigation(options);return h('div',null,selection.selectedId)}
      const mount=document.createElement('div');document.body.append(mount);const root=createRoot(mount);
      const render=()=>flushSync(()=>root.render(h(Harness)));render();
      flushSync(()=>selection.move('up',false));const preserved=selection.selectedId==='center';
      options={...options,crossSections:true};render();flushSync(()=>selection.move('up',false));const crossed=selection.selectedId==='parent';
      flushSync(()=>selection.move('up',false));const within=selection.selectedId==='parent2';
      options={...options,nodes:nodes.filter(node=>node.id!=='parent2')};render();await new Promise(r=>setTimeout(r,0));const filtered=selection.readSelected()===null;
      options={...options,nodes};render();const notResurrected=selection.readSelected()===null;
      flushSync(()=>selection.select('parent'));options={...options,normalMode:false};render();const inactive=selection.readSelected()===null;
      options={...options,normalMode:true};render();await new Promise(r=>setTimeout(r,0));const retiredMode=selection.readSelected()===null;
      flushSync(()=>root.unmount());mount.remove();return{preserved,crossed,within,filtered,notResurrected,inactive,retiredMode};
    })()`);
    assert.deepEqual(result, { preserved: true, crossed: true, within: true, filtered: true, notResurrected: true, inactive: true, retiredMode: true });
  } finally { await browser.cleanup(); }
});
