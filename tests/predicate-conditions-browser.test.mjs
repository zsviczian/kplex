/** Shared condition rows and lossless mode switching run in actual React/native preset UI.
 * Archived ARC is supplied explicitly as saved user data, independently of shipped templates. */
import assert from 'node:assert/strict';
import {archivedFacetPresets} from './support/facetPresetArchive.mjs';
import test from 'node:test';
import {colorEditorScenario} from './support/colorEditorBrowser.mjs';

test('rule Code preserves strict equality and typing focus; shared Simple rows edit the same detached expression',async()=>{
 assert.equal(await colorEditorScenario(`(async()=>{
 const M=sourceModules,t=M.createTranslator('en'),check=(value,message)=>{if(!value)throw Error(message)},updates=[];
 const host=document.createElement('div');host.className='kplex-app';document.body.append(host);const root=M.createRoot(host);
 M.flushSync(()=>root.render(M.React.createElement(M.PredicateRuleEditor,{initial:'note.phase == "Wood"',onChange:value=>updates.push(value),translate:t,
  suggestions:{properties:[],tags:[],folders:[],noteTypes:['Project','Person']}})));
 const button=label=>[...host.querySelectorAll('button')].find(row=>row.textContent.trim()===label),type=(control,value)=>{
  Object.getOwnPropertyDescriptor(control.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(control,value);
  M.flushSync(()=>control.dispatchEvent(new Event('input',{bubbles:true})));
 };
 check(host.querySelector('textarea').value==='note.phase == "Wood"','Strict equality begins in Code');
 M.flushSync(()=>button(t('filter.simple')).click());check(host.querySelector('textarea').value==='note.phase == "Wood"','Lossy conversion is refused');
 check(host.textContent.includes(t('filter.advancedCannotSimple')),'Conversion explains why code is retained');check(updates.length===0,'Mode changes do not rewrite the parent draft');
 const textarea=host.querySelector('textarea');textarea.focus();type(textarea,'note.phase.equals("Wood")');check(document.activeElement===textarea&&host.querySelector('textarea')===textarea,'Typing retains input/document focus');
 M.flushSync(()=>button(t('filter.simple')).click());check(!host.querySelector('textarea')&&host.querySelector('.kplex-lens-condition'),'Lossless text condition uses shared rows');
 check(host.querySelector('.kplex-lens-condition-property').value==='phase','Shared property control');
 const value=host.querySelector('.kplex-lens-condition-value');value.focus();type(value,'Metal');
 check(updates.at(-1)==='note["phase"].equals("Metal")'&&document.activeElement===value,'Shared rows retain semantics and focus');
 const select=host.querySelector('.kplex-lens-condition-field');M.flushSync(()=>{select.value='edge.role';select.dispatchEvent(new Event('change',{bubbles:true}))});
 const roles=host.querySelector('.kplex-lens-condition-value');check(roles.tagName==='SELECT'&&[...roles.options].some(row=>row.value==='child'),'Same canonical relationship choices');
 M.flushSync(()=>{roles.value='child';roles.dispatchEvent(new Event('change',{bubbles:true}))});check(updates.at(-1)==='edge.role.equals("child")','Native rule editor does not invent a predicate language');
 for(const [field,expected] of [
  ['edge.role',['parent','child','left','right','previous','next','sibling']],
  ['edge.kind',['defined','inferred']],['edge.direction',['from','to','both']],
  ['evidence.sourceKind',['frontmatter-ontology','inline-ontology','obsidian-link','unresolved-link','date-property','body-url','property-url','file-tree','tag-tree','url-origin']],
  ['evidence.active',['true','false']],['evidence.declaredRole',['parent','child','left','right','previous','next','hidden']],
  ['node.noteType',['Project','Person']],
 ]){
  M.flushSync(()=>{select.value=field;select.dispatchEvent(new Event('change',{bubbles:true}))});
  const values=host.querySelector('.kplex-lens-condition-value');
  check(values.tagName==='SELECT'&&JSON.stringify([...values.options].map(option=>option.value))===JSON.stringify(['',...expected]),'Exact ordered choices for '+field);
 }
 M.flushSync(()=>{select.value='node.label';select.dispatchEvent(new Event('change',{bubbles:true}))});
 check(host.querySelector('.kplex-lens-condition-value').tagName==='INPUT','Free-text fields retain text entry after a finite choice');
 M.flushSync(()=>root.unmount());host.remove();return true;
 })()`),true);
});

test('native preset rules reject invalid/unsupported plans and save current/candidate code through the original entry writer',async()=>{
 assert.equal(await colorEditorScenario(`(async()=>{
 const M=sourceModules,check=(value,message)=>{if(!value)throw Error(message)},p=await createAppearanceHost({canvasViewSettings:{wuxing:{version:2,values:{presets:{arc:${JSON.stringify(archivedFacetPresets.arc)}}}}}});p.viewSettingsRegistry=M.builtInCanvasViewSettings;p.manifest={id:'k-plex'};
 let disk=structuredClone(p.writes.at(-1));p.writes=[];p.loadData=async()=>structuredClone(disk);p.saveData=async value=>{disk=structuredClone(value);p.writes.push(structuredClone(value))};p.initializeSettingsReconciliation(structuredClone(disk));
 const app={workspace:{on:()=>({}),offref:()=>{}}},tab=new M.KplexSettingTab(app,p),t=M.createTranslator('en');tab.openCanvasViewManager('wuxing');const manager=M.TestModal.instances.at(-1);
 [...manager.contentEl.querySelectorAll('.kplex-style-manager-row')].find(row=>row.textContent.startsWith('ARC')).click();const editor=M.TestModal.instances.at(-1);
 const source=[...editor.contentEl.querySelectorAll('select')].find(row=>[...row.options].some(option=>option.value==='rules'));source.value='rules';source.dispatchEvent(new Event('change',{bubbles:true}));
 await new Promise(resolve=>setTimeout(resolve,30));
 const save=[...editor.contentEl.querySelectorAll('button')].find(row=>row.textContent===t('common.save'));check(save.disabled,'Empty category rules cannot save');
 const builders=[...editor.contentEl.querySelectorAll('.kplex-predicate-rule-editor')];check(builders.length===3,'One shared controlled rule editor per stable category');
 const setCode=(builder,code)=>{M.flushSync(()=>[...builder.querySelectorAll('button')].find(row=>row.textContent.trim()===t('filter.code')).click());const textarea=builder.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(textarea,code);M.flushSync(()=>textarea.dispatchEvent(new Event('input',{bubbles:true})))};
 setCode(builders[0],'this.phase == "wood" and note.phase == "metal"');setCode(builders[1],'edge.role == "child"');setCode(builders[2],'not node.typo.exists()');
 check(save.disabled&&p.writes.length===0,'Unsupported selectors do not become negative category matches or writes');
 setCode(builders[2],'node.name == "Other"');check(!save.disabled,'Valid shared grammar can save');save.click();await waitFor(()=>!editor.modalEl.isConnected);
 const preset=M.facetLibrary(M.readViewConfiguration(M.builtInPlexViews.resolve('wuxing'),p.settings.canvasViewSettings)).presets.arc;
 check(preset.source==='rules'&&preset.categories.add.rule==='this.phase == "wood" and note.phase == "metal"','Exact source and stable category IDs preserved');
 check(p.writes.length===1,'One original queued entry write');manager.close();tab.hide();check(window.migrationListeners===0,'Native owners/root listeners retired');return true;
 })()`),true);
});
