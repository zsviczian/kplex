/** Real Views and lenses UI over independent session owners. Native smoke covers actual workspace/popout rendering. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {colorEditorScenario} from './support/colorEditorBrowser.mjs';

const initialize=`
const M=sourceModules,R=M.React,{flushSync}=M,t=M.createTranslator('en');
const check=(value,message)=>{if(!value)throw Error(message)},equal=(a,b,message)=>check(JSON.stringify(a)===JSON.stringify(b),message+' '+JSON.stringify([a,b]));
const alpha={...M.probeViewDefinition,id:'test.alpha',labelKey:'Probe alpha'},beta={...M.probeViewDefinition,id:'test.beta',labelKey:'Probe beta'},blocked={...alpha,id:'test.blocked',labelKey:'Probe without editor',capabilities:{...alpha.capabilities,editor:false}};
const registry=new M.PlexViewRegistry([alpha,M.classicViewDefinition,beta,blocked]);
const writes={a:0,b:0,lenses:0,filter:0,settings:0,sources:0},session=(name,registry)=>new M.PlexViewSession(registry,()=>writes[name]++);
const index={suggestionCatalog:()=>({tags:[],noteTypes:[],folders:[],properties:[],paths:[]}),acquireSemanticDemand:()=>{writes.sources++;throw Error('Unexpected acquisition')},read:()=>{writes.sources++;throw Error('Unexpected read')}};
const lens={id:'lens',name:'Opening',enabled:true,scope:'node',mode:'style',expression:'node.kind == "note"',style:{node:{textColor:'#abcdef'}}};
const base={index,revision:0,value:{...M.EMPTY_PLEX_FILTER,value:'retained filter'},onChange:()=>writes.filter++,lenses:[lens],onLensesChange:()=>{writes.lenses++;return{refreshPending:false}},layoutMode:'keep',onLayoutModeChange:()=>{},showSiblings:false,onShowSiblingsChange:()=>{},visibility:{},onVisibilityChange:()=>writes.settings++,sortOrder:'name-asc',onSortOrderChange:()=>{},translate:t};
const mount=(owner,doc=document,extra={})=>{
 const container=doc.createElement('div');container.className='kplex-app';container.style.cssText='width:390px;min-height:500px';doc.body.append(container);
 const style=doc.createElement('style');style.textContent=${JSON.stringify(readFileSync('styles.css','utf8'))};doc.head.append(style);
 const root=M.createRoot(container),props={...base,viewSession:owner,...extra};
 function Shell(){R.useSyncExternalStore(owner.subscribe,owner.getSnapshot);return R.createElement(M.PlexFilter,props)}
 const render=()=>flushSync(()=>root.render(R.createElement(Shell)));render();
 const open=()=>flushSync(()=>container.querySelector('.kplex-filter-trigger').click());
 const panel=()=>doc.querySelector('.kplex-filter-panel'),select=()=>panel()?.querySelector('.kplex-view-selector select');
 const change=id=>flushSync(()=>{select().value=id;select().dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}))});
 return{container,root,open,panel,select,change,render,props,close:()=>{flushSync(()=>root.unmount());container.remove();style.remove()}};
};
`;
const scenario=body=>colorEditorScenario(`(async()=>{${initialize}\n${body}\nreturn true})()`);

test('the production panel shows labelled disabled Compass and no unfinished definitions',async()=>{
 assert.equal(await scenario(`
 const owner=session('a',M.builtInPlexViews),ui=mount(owner);ui.open();await waitFor(ui.select);
 equal([...ui.select().options].map(option=>[option.value,option.textContent]),[['classic','Compass']],'Production options');
 check(ui.select().disabled,'Single option remains visible and disabled');
 check(ui.panel().querySelector('label[for="'+ui.select().id+'"]')?.textContent==='Canvas viewCompass','Label names the native select');
 check(ui.panel().querySelector('.kplex-filter-section')?.classList.contains('kplex-view-selector'),'Selector comes before filters');
 equal(ui.container.querySelector('.kplex-filter-trigger').getAttribute('aria-label'),'Views and lenses','Trigger accessible name');
 equal(ui.panel().querySelector('.kplex-filter-panel-header span').textContent,'Views and lenses','Panel title');
 check(!ui.panel().textContent.includes('Probe alpha'),'Test definition is absent from production registry');
 equal(writes,{a:0,b:0,lenses:0,filter:0,settings:0,sources:0},'Opening has no write/acquisition');ui.close();
 `),true);
});

test('selection is registry populated, session owned, restorable and safe for unavailable saved IDs',async()=>{
 assert.equal(await scenario(`
 const a=session('a',registry),b=session('b',registry),first=mount(a);first.open();await waitFor(first.select);
 equal([...first.select().options].map(option=>option.value),['classic','test.alpha','test.beta','test.blocked'],'Compass first and registry order');
 first.change('test.alpha');check(first.select().value==='test.alpha'&&a.definition===alpha&&b.definition.id==='classic','Owner-only selection');
 b.select('test.beta');check(first.select().value==='test.alpha','Another canvas publication cannot retarget the opening owner');
 const savedA=JSON.parse(JSON.stringify(a.getState())),savedB=JSON.parse(JSON.stringify(b.getState())),restoredA=session('a',registry),restoredB=session('b',registry);
 restoredA.restore(savedA);restoredB.restore(savedB);equal([restoredA.definition.id,restoredB.definition.id],['test.alpha','test.beta'],'Independent native workspace payloads');
 const unknown=session('a',registry);unknown.restore({version:1,id:'future.view',states:{'future.view':{retained:true}}});const future=mount(unknown);first.close();future.open();await waitFor(future.select);
 check(future.select().value==='classic','Unknown view renders actual fallback');equal(unknown.getState().states['future.view'],{retained:true},'Future state preserved');
 equal([writes.lenses,writes.filter,writes.settings,writes.sources],[0,0,0,0],'Switch/restoration has no global effects');future.close();
 `),true);
});

test('incompatible and retired submissions reflect actual selection and explain rejection',async()=>{
 assert.equal(await scenario(`
 const a=session('a',registry),ui=mount(a);ui.open();await waitFor(ui.select);ui.change('test.alpha');const release=a.retainEditor();
 ui.change('test.blocked');check(a.definition===alpha&&ui.select().value==='test.alpha','Rejected transition must not look selected');
 check(ui.panel().querySelector('[role=status]')?.textContent===t('view.editorTransitionBlocked'),'Editor restriction explained');
 ui.change('test.blocked');check(ui.select().value==='test.alpha','Repeated rejection restores DOM even without a new state render');
 release();ui.change('test.blocked');check(a.definition===blocked&&ui.select().value==='test.blocked','Eligibility rechecked at submission');
 a.dispose();ui.change('classic');check(a.definition===blocked&&ui.select().value==='test.blocked','Retired owner cannot change');
 check(ui.panel().querySelector('[role=status]')?.textContent===t('view.unavailable'),'Retirement explained');ui.close();
 `),true);
});

test('compatible switching retains the mounted panel, filters, unsaved lens draft and color/save safeguards',async()=>{
 assert.equal(await scenario(`
 const a=session('a',registry);let child,retired=0,reject,calls=0;
 const ui=mount(a,document,{onLensesChange:()=>{calls++;return new Promise((resolve,no)=>reject=no)},onEditColor:request=>{child=request;const element=createDiv();document.body.append(element);return{element,retire:()=>{retired++;element.remove()}}}});
 ui.open();await waitFor(ui.select);flushSync(()=>ui.panel().querySelector('.kplex-lens-main').click());
 const panel=ui.panel(),editor=panel.querySelector('.kplex-lens-editor'),name=editor.querySelector('input');
 Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(name,'Unsaved lens');flushSync(()=>name.dispatchEvent(new Event('input',{bubbles:true})));
 flushSync(()=>[...panel.querySelectorAll('.kplex-lens-style-grid button')].at(-1).click());check(child,'Existing color port opened');
 ui.change('test.alpha');check(ui.panel()===panel&&panel.querySelector('.kplex-lens-editor')===editor&&name.value==='Unsaved lens','Compatible switch discarded panel/draft');
 check(retired===0&&child.apply('#112233'),'Compatible switch retired a valid color draft');
 const save=[...panel.querySelectorAll('.kplex-lens-editor-actions button')].find(button=>button.textContent==='Save lens');flushSync(()=>save.click());ui.change('test.beta');flushSync(()=>save.click());
 check(calls===1&&panel.querySelector('.kplex-lens-fields').disabled&&!child.apply('#445566'),'Pending save safeguards survive switching');
 reject(Error('Expected owned storage fault'));await waitFor(()=>!panel.querySelector('.kplex-lens-fields').disabled);
 check(ui.panel()===panel&&name.value==='Unsaved lens','Failed save lost draft after switching');
 equal([writes.lenses,writes.filter,writes.settings,writes.sources],[0,0,0,0],'View changes did not mutate lenses/filter/settings or acquire data');
 ui.close();check(retired>0&&!panel.isConnected,'Teardown releases existing panel/color lifetime');
 `),true);
});

test('two canvas panels retain owning-document and session identity across focus changes in a narrow popout',async()=>{
 assert.equal(await scenario(`
 const a=session('a',registry),b=session('b',registry),iframe=document.createElement('iframe');iframe.style.cssText='width:390px;height:844px';document.body.append(iframe);
 await new Promise(resolve=>setTimeout(resolve,20));const doc=iframe.contentDocument;
 const first=mount(a),second=mount(b,doc);first.open();second.open();await waitFor(()=>first.select()&&second.select());
 check(first.panel().ownerDocument===document&&second.panel().ownerDocument===doc,'Portal follows opening document');
 second.select().focus();check(doc.activeElement===second.select(),'Native select receives owning-document keyboard focus');first.change('test.alpha');
 equal([first.select().value,second.select().value],['test.alpha','classic'],'Focused popout does not steal main selection');
 first.select().focus();second.change('test.beta');equal([a.definition.id,b.definition.id],['test.alpha','test.beta'],'Focused main does not steal popout selection');
 check(second.select().getBoundingClientRect().width>100&&second.select().getBoundingClientRect().right<=doc.defaultView.innerWidth,'Narrow native select fits');
 check(first.panel().querySelector('label[for="'+first.select().id+'"]')&&second.panel().querySelector('label[for="'+second.select().id+'"]'),'Each document has its own accessible label');
 equal([writes.lenses,writes.filter,writes.settings,writes.sources],[0,0,0,0],'Cross-document switching adds no unrelated work');
 first.close();check(second.panel()?.isConnected,'One canvas teardown cannot close the other panel');second.close();iframe.remove();
 `),true);
});
