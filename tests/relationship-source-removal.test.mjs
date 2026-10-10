/**
 * Actual Connection-details/native-confirmation components in real Chromium. A narrow Modal/Setting
 * shell and mutation port isolate generation/UI lifetime; real writer/IndexedDB and native H11 lanes
 * separately establish persistence, canonical publication and Sidecar behavior.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { browserBundle, chromiumHarness } from "./support/browserTypeScript.mjs";

const host = `
function make(parent,tag,options={}){const el=document.createElement(tag);if(options.cls)el.className=options.cls;if(options.text)el.textContent=options.text;for(const[k,v]of Object.entries(options.attr??{}))el.setAttribute(k,v);parent.append(el);return el;}
for(const [name,callback]of Object.entries({empty(){this.replaceChildren()},setText(text){this.textContent=text},addClass(...names){this.classList.add(...names)},createEl(tag,options){return make(this,tag,options)},createDiv(options){return make(this,'div',options)},createSpan(options){return make(this,'span',options)}}))HTMLElement.prototype[name]=callback;
exports.Modal=class Modal{constructor(app){this.app=app;this.modalEl=make(document.createElement('div'),'div');this.titleEl=make(this.modalEl,'h2');this.contentEl=make(this.modalEl,'div');}open(){document.body.append(this.modalEl);this.onOpen?.()}close(){this.onClose?.();this.modalEl.remove()}};
exports.Setting=class Setting{constructor(parent){this.parent=make(parent,'div',{cls:'setting-item'})}addButton(callback){const el=make(this.parent,'button');callback({buttonEl:el,setButtonText(text){el.textContent=text;return this},setDestructive(){el.classList.add('mod-warning');return this},onClick(fn){el.addEventListener('click',fn);return this}});return this}};
exports.setIcon=(el,icon)=>el.dataset.icon=icon;
exports.Notice=class Notice{constructor(text){window.notices.push(text)}};
`;
const bundle = await browserBundle(["src/ui/RelationshipExplanationModal.ts", "src/application/frontmatterUnlink.ts", "src/lang/index.ts",
 "src/adapters/obsidian/relationshipMetadataWrite.ts"], { obsidian: host });
const setup = `(()=>{
 const M=window.sourceModules;window.notices=[];window.ok=(value,message)=>{if(!value)throw new Error(message)};
 window.tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
 window.defer=()=>{let release;const promise=new Promise(r=>release=r);return{promise,release}};
 window.makeDetails=()=>{
  const storage={path:'Owner.md'},inverse={path:'Target.md'},target=inverse,owners=new Map([[storage.path,storage],[inverse.path,inverse]]),listeners=new Set(),calls=[];
  const evidence=(field,owner='Owner.md',kind='frontmatter-ontology')=>({id:field+owner+kind,sourcePath:'Owner.md',targetPath:'Target.md',declaredByPath:owner,declaredTargetPath:owner==='Owner.md'?'Target.md':'Owner.md',sourceKind:kind,fieldName:field,role:'child',declaredRole:'child',direction:1,relationType:1});
  const child=evidence('Children'),friend=evidence('Friends'),reverse=evidence('Parents','Target.md');
  let current={sourcePath:'Owner.md',targetPath:'Target.md',hidden:false,resolvedRoles:[{role:'child',relationType:1}],summary:'defined-ontology',decisions:[child,{...child,id:'repeat'},friend,reverse,{...evidence('inferred'),relationType:2},evidence('date','Owner.md','date-property'),evidence('body','Owner.md','inline-ontology'),evidence('generic','Owner.md','obsidian-link')].map(evidence=>({evidence,active:true}))};
  const pages=new Map([['Owner.md',{path:'Owner.md',file:storage,url:null}],['Target.md',{path:'Target.md',file:target,url:null}]]);
  const section=(item)=>({path:item.declaredByPath,startLine:1,endLine:5,text:item.declaredByPath==='Owner.md'?'Children: [[Target]]\\nFriends: [[Target]]':'Parents: [[Owner]]',label:item.declaredByPath,id:item.id,sourceKind:item.sourceKind});
  const f={owners,listeners,calls,child,friend,reverse,storage,target,ready:true,get explanation(){return current},set explanation(value){current=value},sections:async items=>new Map(items.map(item=>[item.id,[section(item)]])),save:async()=>true};
  const plugin={app:{},translator:M.createTranslator('en'),index:{get:path=>pages.get(path),titleFor:page=>page.path,explainRelationship:()=>current,isSemanticWriteReady:()=>f.ready,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)}},
   captureFrontmatterUnlinkExpectation:item=>item.sourceKind==='frontmatter-ontology'?{storage:owners.get(item.declaredByPath),target:owners.get(item.declaredTargetPath),storagePath:item.declaredByPath,targetPath:item.declaredTargetPath,fieldKey:item.fieldName,declarationKey:M.frontmatterDeclarationKey(item)}:null,
   unlinkFrontmatterEvidence:async(...args)=>{calls.push(args);return f.save(...args)},relationshipEvidenceSectionsBatch:items=>f.sections(items),openRelationshipEvidenceLocation:async(...args)=>{f.navigation=args},openRelationModal:()=>{}};
  f.plugin=plugin;f.modal=new M.RelationshipExplanationModal(plugin,current, {hostLeaf:{id:'owned-sidecar'}});f.emit=()=>{for(const fn of listeners)fn()};return f;
 };
 return true;
})()`;

/** Declaration coordinates remain independent of occurrence grouping and generic cache mirrors. */
test("connection source actions deduplicate declaration tuples and retain independent fields/owners", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(setup),true);
  assert.deepEqual(await browser.evaluate(`(async()=>{const f=makeDetails();f.modal.open();await tick();const buttons=[...f.modal.modalEl.querySelectorAll('[data-kplex-remove-field]')];const result={fields:buttons.map(b=>b.dataset.kplexRemoveField).sort(),count:sourceModules.selectedFrontmatterDeclarations(f.explanation.decisions.map(d=>d.evidence)).length};f.modal.close();result.released=f.listeners.size===0;return result})()`),{fields:["Children","Friends","Parents"],count:3,released:true});
 }finally{await browser.cleanup();}
});

/** Rendered native Cancel/Confirm, serialized clicks and refreshed feedback use the production session. */
test("rendered source removal confirms exact property scope, cancels without writes and refreshes canonical visibility", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=makeDetails();f.modal.open();await tick();const find=()=>f.modal.modalEl.querySelector('[data-kplex-remove-field="Children"]');
   find().click();let confirmation=document.querySelector('.kplex-remove-relationship-source-modal');ok(confirmation.textContent.includes('Children')&&confirmation.textContent.includes('Owner.md')&&confirmation.textContent.includes('Target.md')&&confirmation.textContent.includes('All references'),'Exact destructive scope disclosed');
   confirmation.querySelector('button').click();await tick();ok(f.calls.length===0&&!find().disabled,'Cancellation leaves write port untouched');
   const save=defer();f.save=async()=>{await save.promise;f.explanation={...f.explanation,decisions:f.explanation.decisions.filter(d=>d.evidence.fieldName!=='Children')};return true};
   find().click();confirmation=document.querySelector('.kplex-remove-relationship-source-modal');confirmation.querySelector('button.mod-warning').click();await tick();find().click();ok(f.calls.length===1,'Duplicate activation serialized');ok([...f.modal.modalEl.querySelectorAll('[data-kplex-remove-field]')].every(b=>b.disabled),'Competing controls disabled');
   save.release();await tick();ok(!find()&&f.modal.modalEl.textContent.includes('connection still has other evidence'),'Canonical remaining visibility refreshed');
   const f2=makeDetails();f2.save=async()=>{f2.explanation={...f2.explanation,hidden:true,resolvedRoles:[],decisions:[{evidence:f2.friend,active:false}]};return true};f2.modal.open();await tick();f2.modal.modalEl.querySelector('[data-kplex-remove-field]').click();document.querySelector('.kplex-remove-relationship-source-modal button.mod-warning').click();await tick();ok(f2.modal.modalEl.textContent.includes('Source removed.')&&!f2.modal.modalEl.textContent.includes('still has other evidence'),'Suppressed decisions do not imply visible connection');
   f.modal.close();f2.modal.close();return true;
  })()`),true);
 }finally{await browser.cleanup();}
});

/** Stale source-load generations, replacement before confirmation and close never grant late write authority. */
test("connection details retires old source loads and closed confirmations", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=makeDetails(),first=defer(),sections=f.sections;let once=true;f.sections=async items=>{const result=await sections(items);if(once){once=false;await first.promise;for(const values of result.values())values[0].text='STALE CONTENT'}return result};
   f.modal.open();f.modal.refreshDetails();await tick();first.release();await tick();ok(!f.modal.modalEl.textContent.includes('STALE CONTENT'),'Superseded sources cannot append');
   f.owners.set('Owner.md',{path:'Owner.md'});f.modal.modalEl.querySelector('[data-kplex-remove-field="Children"]').click();await tick();ok(!document.querySelector('.kplex-remove-relationship-source-modal')&&f.calls.length===0,'Rendered source replacement requires refreshed approval');f.modal.close();
   const f2=makeDetails();f2.modal.open();await tick();f2.modal.modalEl.querySelector('[data-kplex-remove-field]').click();const confirm=document.querySelector('.kplex-remove-relationship-source-modal button.mod-warning');f2.modal.close();confirm.click();await tick();ok(f2.calls.length===0&&f2.listeners.size===0&&!document.querySelector('.kplex-remove-relationship-source-modal'),'Disposed confirmation cannot write');
   const f3=makeDetails(),waiting=defer();let persisted=0;f3.save=async(e,x,current)=>{await waiting.promise;if(!current())return false;persisted++;return true};f3.modal.open();await tick();f3.modal.modalEl.querySelector('[data-kplex-remove-field]').click();document.querySelector('.kplex-remove-relationship-source-modal button.mod-warning').click();await tick();f3.modal.close();waiting.release();await tick();ok(persisted===0,'Closed generation predicate fences persistence');return true;
  })()`),true);
 }finally{await browser.cleanup();}
});

/** Source navigation preserves the exact owning surface context rather than adopting a global editor. */
test("rendered Go to source forwards its owning Sidecar leaf and closes only after native navigation", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(async()=>{const f=makeDetails(),nav=defer();f.plugin.openRelationshipEvidenceLocation=async(...args)=>{f.navigation=args;await nav.promise};f.modal.open();await tick();f.modal.modalEl.querySelector('button[aria-label="Go to source"]').click();await tick();ok(f.navigation[0].path==='Owner.md'&&f.navigation[0].line===1&&f.navigation[1].id==='owned-sidecar','Exact context forwarded');ok(f.modal.modalEl.isConnected,'Await native navigation before closing');nav.release();await tick();ok(!f.modal.modalEl.isConnected&&f.listeners.size===0,'Navigation closes and releases exact session');return true})()`),true);
 }finally{await browser.cleanup();}
});

/** Saved pending states are truthful and retry-free, while failure before save can be explicitly retried. */
test("saved-pending absent explanation requires canonical readiness before declaring removal", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(async()=>{const f=makeDetails();f.save=async()=>{throw new sourceModules.SavedRelationshipPendingError('SAVED PENDING',true)};f.modal.open();await tick();f.modal.modalEl.querySelector('[data-kplex-remove-field]').click();document.querySelector('.kplex-remove-relationship-source-modal button.mod-warning').click();await tick();f.explanation=null;f.ready=false;f.emit();await tick();ok(f.modal.modalEl.textContent.includes('SAVED PENDING')&&[...f.modal.modalEl.querySelectorAll('[data-kplex-remove-field]')].every(b=>b.disabled),'Temporary missing explanation cannot certify a saved edit');f.ready=true;f.emit();await tick();ok(f.modal.modalEl.textContent.includes('Source removed.')&&!f.modal.modalEl.querySelector('[data-kplex-remove-field]')&&f.calls.length===1,'Canonical absent pair clears stale sources without destructive retry');f.modal.close();return true})()`),true);
 }finally{await browser.cleanup();}
});

/** Saved pending states are truthful and retry-free, while failure before save can be explicitly retried. */
for (const mode of ["failure", "pending-noticed", "pending-unnoticed", "closed-after-save"]) {
 test(`connection removal handles ${mode} without duplicate destructive retry or stale UI`, async () => {
  const browser=await chromiumHarness(bundle);
  try {
   assert.equal(await browser.evaluate(setup),true);
   assert.equal(await browser.evaluate(`(async()=>{
    const f=makeDetails(),mode=${JSON.stringify(mode)},hold=defer();f.save=async()=>{await hold.promise;if(mode==='failure')throw new Error('native save failed');throw new sourceModules.SavedRelationshipPendingError('SAVED PENDING',mode==='pending-noticed')};
    f.modal.open();await tick();f.modal.modalEl.querySelector('[data-kplex-remove-field]').click();document.querySelector('.kplex-remove-relationship-source-modal button.mod-warning').click();await tick();if(mode==='closed-after-save')f.modal.close();hold.release();await tick();
    if(mode==='failure'){ok(f.modal.modalEl.textContent.includes('native save failed'),'Failed save remains failure');ok([...f.modal.modalEl.querySelectorAll('[data-kplex-remove-field]')].every(b=>!b.disabled),'Explicit retry available before persistence');}
    else if(mode!=='closed-after-save'){ok(f.modal.modalEl.textContent.includes('SAVED PENDING'),'Saved pending retained');ok([...f.modal.modalEl.querySelectorAll('[data-kplex-remove-field]')].every(b=>b.disabled),'Saved pending cannot replay destructive edit');ok(notices.length===(mode==='pending-noticed'?0:1),'Notice ownership respected');f.explanation={...f.explanation,decisions:f.explanation.decisions.filter(d=>d.evidence.fieldName!=='Children')};f.emit();await tick();ok(f.modal.modalEl.textContent.includes('Source removed;')&&f.calls.length===1,'Eventual canonical refresh performs no second write');}
    else ok(f.listeners.size===0&&notices.length===1,'Saved post-close notice remains visible and subscriptions retire');
    f.modal.close();return true;
   })()`),true);
  }finally{await browser.cleanup();}
 });
}
