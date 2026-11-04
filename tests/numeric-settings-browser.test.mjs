/** Actual native/React slider owners, Settings definitions and detached inheritance in Chromium. */
import test from 'node:test';import assert from 'node:assert/strict';
import {colorEditorScenario} from './support/colorEditorBrowser.mjs';
const setup=`const M=sourceModules,check=(value,message)=>{if(!value)throw Error(message)};`;

test('long declarative text settings share stacked fields, preserve their writer and retire stale handlers',async()=>{
 assert.equal(await colorEditorScenario(`(async()=>{${setup}
 const p=await createAppearanceHost({});p.viewSettingsRegistry=M.builtInCanvasViewSettings;p.manifest={id:'k-plex'};
 const tab=new M.KplexSettingTab({workspace:{on:()=>({}),offref:()=>{}}},p),all=[];const walk=items=>{for(const row of items){all.push(row);walk(row.items??[])}};walk(tab.getSettingDefinitions());
 const fields=all.filter(row=>row.render?.name==='renderAuthoredTextSetting');check(fields.length===5,'Finite long native fields');
 const writes=[];tab.setControlValue=async(key,value)=>writes.push({key,value});
 for(const definition of fields){const host=document.body.createDiv(),row=new M.Setting(host),release=definition.render(row),input=host.querySelector('input,textarea');
 check(row.settingEl.classList.contains('kplex-form-field')&&input.getAttribute('aria-label')===definition.name,'Shared full-width labelled field');check(!input.hasAttribute('title'),'No duplicate native tooltip');
 input.value='Meaningful local value';input.dispatchEvent(new Event('input',{bubbles:true}));check(writes.at(-1)?.value==='Meaningful local value','Canonical setter receives actual input');
 const before=writes.length;release();input.value='Retired';input.dispatchEvent(new Event('input',{bubbles:true}));check(writes.length===before,'Retired native row wrote settings');host.remove();}
 return true})()`),true);
});
test('every generic Settings slider has a persistent accessible value and never writes on mount',async()=>{
 assert.equal(await colorEditorScenario(`(async()=>{${setup}
 const p=await createAppearanceHost({});p.writes=[];p.viewSettingsRegistry=M.builtInCanvasViewSettings;p.manifest={id:'k-plex'};
 const tab=new M.KplexSettingTab({workspace:{on:()=>({}),offref:()=>{}}},p),all=[];
 const walk=items=>{for(const row of items){all.push(row);walk(row.items??[])}};walk(tab.getSettingDefinitions());
 const numeric=all.filter(row=>row.render?.name==='renderNumberSetting');check(numeric.length>=15,'All native numeric view/global definitions must use the common control: '+numeric.length);
 for(const definition of numeric){const host=document.body.createDiv(),row=new M.Setting(host),release=definition.render(row),input=host.querySelector('input[type=range]'),output=host.querySelector('output');
  check(input&&output&&input.getAttribute('aria-label')===definition.name&&output.textContent.trim()&&input.getAttribute('aria-valuetext')===output.textContent,'Permanent named readout: '+definition.name);
  check(Number.isFinite(Number(input.min))&&Number(input.max)>Number(input.min)&&Number(input.step)>0,'Declared numeric bounds: '+definition.name);
  check(!host.querySelector('input[type=number]'),'No numeric text box');release();host.remove();}
 check(p.writes.length===0,'Opening all numeric preferences must not materialize defaults');tab.hide();return true})()`),true);
});
test('native shared slider coalesces slow updates and does not rewind the displayed latest value',async()=>{
 assert.equal(await colorEditorScenario(`(async()=>{${setup}
 const host=document.body.createDiv(),row=new M.Setting(host),calls=[],releases=[];
 const slider=M.numberSlider(row,{label:'Density',value:1,min:.5,max:3,step:.1,onChange:value=>new Promise(resolve=>{calls.push(value);releases.push(resolve)})}),input=row.controlEl.querySelector('input'),output=row.controlEl.querySelector('output');
 input.focus();for(const value of [1.1,1.3,1.5,1.9,2.3]){input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}))}
 check(JSON.stringify(calls)==='[1.1]'&&output.textContent==='2.3','First write and latest immediate readout');slider.setValue(1.1);check(input.value==='2.3','External old completion cannot rewind draft');
 releases.shift()();await Promise.resolve();await Promise.resolve();check(JSON.stringify(calls)==='[1.1,2.3]'&&input.value==='2.3','Only latest unstarted input follows');
 releases.shift()();await Promise.resolve();await Promise.resolve();check(output.textContent==='2.3'&&document.activeElement===input,'Settled value/focus');slider.dispose();const count=calls.length;input.value='3';input.dispatchEvent(new Event('input',{bubbles:true}));check(calls.length===count,'Retired slider inert');host.remove();return true})()`),true);
});
test('optional size sliders preserve inheritance, expose effective defaults and reset only their own axis',async()=>{
 assert.equal(await colorEditorScenario(`(async()=>{${setup}
 const host=document.body.createDiv(),draft={width:undefined,height:460},changes=[];
 const width=M.styleNumberSlider(host,M.createTranslator('en'),{label:'Width',initial:undefined,fallback:320,min:200,max:2400,step:1,onChange:value=>{draft.width=value;changes.push(value)}}),input=host.querySelector('input'),output=host.querySelector('output'),reset=host.querySelector('button');
 check(width.read()===undefined&&output.textContent.includes('320')&&output.textContent.includes('Default')&&reset.disabled&&changes.length===0,'Unchanged inherited opening');
 input.value='920';input.dispatchEvent(new Event('input',{bubbles:true}));check(draft.width===920&&draft.height===460&&output.textContent==='920'&&!reset.disabled,'One explicit bounded axis');
 reset.click();check(width.read()===undefined&&draft.width===undefined&&draft.height===460&&output.textContent.includes('320')&&reset.disabled,'Reset returns to inherited default without touching sibling');host.remove();return true})()`),true);
});

for(const scope of ['node','edge'])test(`lens ${scope} width uses the shared rail and retains draft Cancel/Save`,async()=>{
 assert.equal(await colorEditorScenario(`(async()=>{${setup}
 const t=M.createTranslator('en'),lens={id:'width',name:'Width',enabled:false,scope:'${scope}',mode:'style',expression:'${scope==='node'?'node.kind == "note"':'edge.role == "child"'}',style:{${scope}:{strokeWidth:2}}},initial=JSON.stringify(lens),writes=[];
 const host=document.body.createDiv(),root=M.createRoot(host),props={index:{suggestionCatalog:()=>({tags:[],noteTypes:[],folders:[],properties:[],paths:[]})},revision:0,value:M.EMPTY_PLEX_FILTER,onChange:()=>{},lenses:[lens],onLensesChange:async next=>{writes.push(next);return {refreshPending:false}},layoutMode:'keep',onLayoutModeChange:()=>{},showSiblings:false,onShowSiblingsChange:()=>{},visibility:{},onVisibilityChange:()=>{},sortOrder:'name',onSortOrderChange:()=>{},translate:t};
 M.flushSync(()=>root.render(M.React.createElement(M.PlexFilter,props)));M.flushSync(()=>host.querySelector('button').click());await waitFor(()=>document.querySelector('.kplex-lens-main'));
 const open=()=>M.flushSync(()=>document.querySelector('.kplex-lens-main').click());open();
 const change=()=>{const input=document.querySelector('.kplex-lens-style-grid input[type=range]');check(input&&input.closest('.kplex-density-control')&&input.min==='0.5'&&input.max==='8'&&input.step==='0.5','Shared bounded lens rail');M.flushSync(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'3.5');input.dispatchEvent(new Event('input',{bubbles:true}))});check(input.closest('label').querySelector('output').textContent==='3.5','Permanent lens width value');};
 change();check(writes.length===0&&JSON.stringify(lens)===initial,'Width edit stays detached');M.flushSync(()=>document.querySelector('.kplex-lens-editor-actions button').click());check(writes.length===0&&JSON.stringify(lens)===initial,'Cancel unchanged');
 open();change();M.flushSync(()=>[...document.querySelectorAll('.kplex-lens-editor-actions button')].find(button=>button.textContent===t('filter.saveLens')).click());await waitFor(()=>writes.length===1&&!document.querySelector('.kplex-lens-editor'));check(writes[0][0].style.${scope}.strokeWidth===3.5&&JSON.stringify(lens)===initial,'Explicit Save publishes only the numeric draft through its existing callback');root.unmount();host.remove();return true})()`),true);
});
