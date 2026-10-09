/** Browser contracts for the real read-only shortcut-reference shell and its explicit teardown. */
import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { chromiumHarness } from "./support/browserTypeScript.mjs";

/** Native UI doubles supply only public shell APIs; production projection and search run unchanged. */
async function helpBrowser() {
  const host = `
    export const Platform={isMobile:false,isMacOS:true,isWin:false,isIosApp:false,isAndroidApp:false};
    export class Modal{constructor(app){this.app=app;this.modalEl=document.createElement('div');this.modalEl.className='modal';this.titleEl=this.modalEl.createDiv({cls:'modal-title'});this.contentEl=this.modalEl.createDiv({cls:'modal-content'})}setTitle(value){this.titleEl.textContent=value;return this}open(){document.body.append(this.modalEl);this.onOpen?.()}close(){this.onClose?.();this.modalEl.remove()}}
    export class SearchComponent{constructor(parent){this.inputEl=parent.createDiv({cls:'search-input-container'}).createEl('input')}setPlaceholder(value){this.inputEl.placeholder=value;return this}}
    export class Setting{constructor(parent){this.settingEl=parent.createDiv({cls:'setting-item'});this.infoEl=this.settingEl.createDiv();this.controlEl=this.settingEl.createDiv({cls:'setting-item-control'})}setName(value){this.infoEl.createDiv({cls:'setting-item-name',text:value});return this}setDesc(value){this.infoEl.createDiv({cls:'setting-item-description',text:value});return this}addButton(fn){const el=this.controlEl.createEl('button');fn({setButtonText(value){el.textContent=value;return this},onClick(callback){el.addEventListener('click',callback);return this}});return this}}
  `;
  const bundle = await build({ stdin: {
    contents: `export {KeyboardHelpModal} from './src/ui/KeyboardHelpModal';export {ACTION_CATALOG} from './src/core/plex/actions';export {migrateActionPreferences,effectiveActionBindings} from './src/core/plex/actionPreferences';export {englishCatalog} from './src/lang/en';`,
    resolveDir: fileURLToPath(new URL("..", import.meta.url)),
  }, bundle: true, write: false, platform: "browser", format: "iife", globalName: "sourceModules", plugins: [{ name: "native-help-shell", setup(builder) {
    builder.onResolve({filter:/^obsidian$/},()=>({path:"host",namespace:"host"}));
    builder.onLoad({filter:/.*/,namespace:"host"},()=>({contents:host,loader:"js"}));
  } }] });
  const browser = await chromiumHarness(bundle.outputFiles[0].text);
  const stylesheet = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  await browser.evaluate(`(()=>{
    const p=HTMLElement.prototype;p.empty=function(){this.replaceChildren()};p.setAttr=function(key,value){this.setAttribute(key,value)};p.addClass=function(...names){this.classList.add(...names)};
    p.createEl=function(tag,options={}){const el=this.ownerDocument.createElement(tag);if(options.cls)el.className=options.cls;if(options.text)el.textContent=options.text;this.append(el);return el};p.createDiv=function(options){return this.createEl('div',options)};p.createSpan=function(options){return this.createEl('span',options)};
    const {KeyboardHelpModal,migrateActionPreferences,englishCatalog}=sourceModules;
    const nativeShell=document.createElement('style');nativeShell.textContent=':root{--font-ui-small:12px;--text-muted:#666}.modal{width:560px;max-width:calc(100vw - 32px);padding:16px;box-sizing:border-box}.modal-title{font-size:20px;padding-bottom:12px;flex:0 0 auto}.modal-content{overflow-y:auto}.suggestion-item{padding:8px 12px;box-sizing:border-box}.suggestion-title{font-size:14px}.suggestion-note{font-size:12px}.suggestion-hotkey{font-size:12px;background:#eee;padding:2px 6px;border-radius:4px}.setting-item-control{display:flex;justify-content:flex-end}.search-input-container input{width:100%;box-sizing:border-box}.test-narrow{width:320px}';document.head.append(nativeShell);
    const structuralStyles=document.createElement('style');structuralStyles.textContent=${JSON.stringify(stylesheet)};document.head.append(structuralStyles);
    window.makeHelp=()=>{const listeners=new Set(),events=[],plugin={app:{},settings:{actionPreferences:migrateActionPreferences(null,'macos').preferences},translator:(key,args={})=>englishCatalog[key].message.replace(/\\{([^}]+)\\}/g,(_,name)=>String(args[name])),subscribeActionPreferences(fn){listeners.add(fn);return()=>listeners.delete(fn)},openActionSettings(){events.push('configure')}};
      const modal=new KeyboardHelpModal(plugin,()=>events.push('release'));return{modal,plugin,listeners,events};};
  })()`);
  return browser;
}

test("keyboard help is an effective, searchable read-only reference with native chips and exact lifetime cleanup", async () => {
  const browser = await helpBrowser();
  try {
    const result = await browser.evaluate(`(()=>{
      const {ACTION_CATALOG,effectiveActionBindings}=sourceModules,s=makeHelp();
      for(const[id,value]of [['graph.focus','F15'],['editor.focus','F16'],['search.focus','F17']])s.plugin.settings.actionPreferences.localBindings[id]=[{match:'key',value,modifiers:[]}];
      s.plugin.settings.actionPreferences.localBindings['pin.toggle']=[{match:'key',value:'k',modifiers:['mod']}];
      s.plugin.settings.actionPreferences.localBindings['node.rename']=[];
      s.plugin.settings.actionPreferences.localBindings['composer.submit']=[{match:'key',value:'F12',modifiers:[]}];
      s.plugin.settings.actionPreferences.localBindings['ontology.assign.parent']=[{match:'key',value:'F11',modifiers:[]}];
      s.modal.open();
      const input=s.modal.contentEl.querySelector('input'),rows=()=>[...s.modal.contentEl.querySelectorAll('[data-action-id]')],ids=()=>rows().map(row=>row.dataset.actionId);
      const expected=ACTION_CATALOG.filter(action=>action.localContexts.includes('graph')&&!action.id.startsWith('composer.')&&!action.id.startsWith('ontology.assign.')&&effectiveActionBindings(s.plugin.settings.actionPreferences,action.id).length>0).map(action=>action.id).sort();
      const complete=JSON.stringify(ids().sort())===JSON.stringify(expected),focusRoutes=['graph.focus','editor.focus','search.focus'].every(id=>ids().includes(id));
      const nativeReadOnly=rows().every(row=>row.querySelector('.setting-command-hotkeys .setting-hotkey')&&!row.querySelector('button,input'));
      const described=rows().every(row=>row.querySelector('.suggestion-note').textContent.length>0);
      const complexRows=rows().every(row=>row.matches('.suggestion-item.mod-complex')&&row.querySelector(':scope > .suggestion-content > .suggestion-title')&&row.querySelector(':scope > .suggestion-aux .suggestion-hotkey'));
      const pin=s.modal.contentEl.querySelector('[data-action-id="pin.toggle"]');pin.click();pin.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));const inert=s.events.length===0;
      const pinChord=pin.querySelector('.setting-hotkey').textContent;
      const localizedChord=pinChord==='⌘ K';
      input.value=pinChord;input.dispatchEvent(new Event('input'));const chordSearch=ids().join(',')==='pin.toggle';
      input.value=s.plugin.translator('actions.search.focus.description');input.dispatchEvent(new Event('input'));const descriptionSearch=ids().includes('search.focus');
      input.value='';input.dispatchEvent(new Event('input'));input.focus();
      s.plugin.settings.actionPreferences.characterShortcutsEnabled=false;for(const listener of s.listeners)listener();
      const optOut=ids().includes('pin.toggle')&&s.modal.contentEl.querySelector('[data-action-id="pin.toggle"] .setting-hotkey').textContent===pinChord;
      const characterActions=ACTION_CATALOG.filter(action=>action.localContexts.includes('graph')&&effectiveActionBindings(s.plugin.settings.actionPreferences,action.id).length===0);
      const hiddenDisabled=characterActions.every(action=>!ids().includes(action.id)),retainedFocus=document.activeElement===input;
      s.plugin.settings.actionPreferences.localBindings['pin.toggle']=[];for(const listener of s.listeners)listener();const refreshRemoved=!ids().includes('pin.toggle');
      s.modal.contentEl.querySelector('button').click();s.modal.onClose();const order=s.events.join(',')==='release,configure',disposed=s.listeners.size===0&&s.modal.contentEl.childElementCount===0;
      const query=s.modal.query;input.value='late';input.dispatchEvent(new Event('input'));const detachedInert=s.modal.query===query;
      const unopened=makeHelp();unopened.modal.close();unopened.modal.close();const closeBeforeOpen=unopened.events.join(',')==='release'&&unopened.listeners.size===0;
      return{complete,focusRoutes,nativeReadOnly,described,complexRows,inert,localizedChord,chordSearch,descriptionSearch,optOut,hiddenDisabled,retainedFocus,refreshRemoved,order,disposed,detachedInert,closeBeforeOpen};
    })()`);
    assert.deepEqual(result, Object.fromEntries(Object.keys(result).map(key => [key, true])));
  } finally { await browser.cleanup(); }
});

test("shortcut reference scrolls only results and bounds native shortcut columns at desktop and narrow widths", async () => {
  const browser = await helpBrowser();
  try {
    const result = await browser.evaluate(`(()=>{
      const{ACTION_CATALOG}=sourceModules,results=[];
      for(const narrow of [false,true]){
        const s=makeHelp();if(narrow)s.modal.modalEl.addClass('test-narrow');
        for(const action of ACTION_CATALOG.filter(action=>action.localContexts.includes('graph')))s.plugin.settings.actionPreferences.localBindings[action.id]=Array.from({length:4},(_,index)=>({match:'code',value:'Key'+String.fromCharCode(65+index),modifiers:['mod','shift']}));
        s.modal.open();const modal=s.modal.modalEl,header=modal.querySelector('.kplex-keyboard-help-header'),footer=modal.querySelector('.kplex-keyboard-help-footer'),list=modal.querySelector('.kplex-action-results'),row=list.querySelector('.suggestion-item'),content=row.querySelector('.suggestion-content'),aux=row.querySelector('.suggestion-aux');
        const before={header:header.getBoundingClientRect().top,footer:footer.getBoundingClientRect().top},rowRect=row.getBoundingClientRect(),contentRect=content.getBoundingClientRect(),auxRect=aux.getBoundingClientRect();
        const boundedColumns=contentRect.right<=auxRect.left&&auxRect.right<=rowRect.right&&[...aux.querySelectorAll('.suggestion-hotkey')].every(chip=>{const rect=chip.getBoundingClientRect();return rect.left>=auxRect.left&&rect.right<=auxRect.right});
        const onlyResultsScroll=list.scrollHeight>list.clientHeight&&getComputedStyle(list).overflowY==='auto'&&getComputedStyle(s.modal.contentEl).overflowY==='hidden'&&s.modal.contentEl.scrollHeight<=s.modal.contentEl.clientHeight+1;
        list.scrollTop=list.scrollHeight;const fixedControls=list.scrollTop>0&&header.getBoundingClientRect().top===before.header&&footer.getBoundingClientRect().top===before.footer;
        const noHorizontalOverflow=modal.scrollWidth<=modal.clientWidth&&list.scrollWidth<=list.clientWidth;
        const footerVisible=footer.getBoundingClientRect().bottom<=modal.getBoundingClientRect().bottom;
        results.push({narrow,boundedColumns,onlyResultsScroll,fixedControls,noHorizontalOverflow,footerVisible});s.modal.close();
      }return results;
    })()`);
    assert.deepEqual(result, [false, true].map(narrow => ({ narrow, boundedColumns: true, onlyResultsScroll: true, fixedControls: true, noHorizontalOverflow: true, footerVisible: true })));
  } finally { await browser.cleanup(); }
});
