/**
 * Actual Connection-details/native-confirmation components in real Chromium. A narrow Modal/Setting
 * shell and mutation port isolate generation/UI lifetime and live directional Hidden source choice;
 * real writer/IndexedDB and native H11 lanes
 * separately establish persistence, canonical publication and Sidecar behavior.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
import { browserBundle, chromiumHarness } from "./support/browserTypeScript.mjs";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { hostOracle, collect } from "./support/cachedSourceFixture.mjs";
import { fullCenterIndex, centerGateSettings } from "./support/requestedCenterGateFixture.mjs";

const host = `
function make(parent,tag,options={}){const el=document.createElement(tag);if(options.cls)el.className=options.cls;if(options.text)el.textContent=options.text;for(const[k,v]of Object.entries(options.attr??{}))el.setAttribute(k,v);parent.append(el);return el;}
for(const [name,callback]of Object.entries({empty(){this.replaceChildren()},setText(text){this.textContent=text},addClass(...names){this.classList.add(...names)},createEl(tag,options){return make(this,tag,options)},createDiv(options){return make(this,'div',options)},createSpan(options){return make(this,'span',options)}}))HTMLElement.prototype[name]=callback;
exports.Modal=class Modal{constructor(app){this.app=app;this.modalEl=make(document.createElement('div'),'div');this.titleEl=make(this.modalEl,'h2');this.contentEl=make(this.modalEl,'div');}open(){document.body.append(this.modalEl);this.onOpen?.()}close(){this.onClose?.();this.modalEl.remove()}};
exports.Setting=class Setting{constructor(parent){this.parent=this.settingEl=make(parent,'div',{cls:'setting-item'})}addButton(callback){const el=make(this.parent,'button');callback({buttonEl:el,setButtonText(text){el.textContent=text;return this},setDestructive(){el.classList.add('mod-warning');return this},setCta(){el.classList.add('mod-cta');return this},onClick(fn){el.addEventListener('click',fn);return this}});return this}setName(text){this.nameEl=make(this.parent,'strong',{text});return this}setDesc(text){let el=this.parent.querySelector('.setting-item-description');if(!el)el=make(this.parent,'div',{cls:'setting-item-description'});el.textContent=text;return this}addDropdown(callback){const selectEl=make(this.parent,'select');callback({selectEl,addOption(value,label){const option=make(selectEl,'option',{text:label});option.value=value;return this},setValue(value){selectEl.value=value;return this},onChange(fn){selectEl.addEventListener('change',()=>fn(selectEl.value));return this}});return this}addToggle(callback){const toggleEl=make(this.parent,'input');toggleEl.type='checkbox';callback({toggleEl,setValue(value){toggleEl.checked=value;return this},setDisabled(value){toggleEl.disabled=value;return this},onChange(fn){toggleEl.addEventListener('change',()=>fn(toggleEl.checked));return this}});return this}};
exports.getLanguage=()=> 'en';
exports.setIcon=(el,icon)=>el.dataset.icon=icon;
exports.getIcon=()=>document.createElementNS('http://www.w3.org/2000/svg','svg');
exports.Notice=class Notice{constructor(text){window.notices.push(text)}};
`;
// Details now owns a shared React-backed reversal child. Bundle the real installed React
// runtime while retaining this lane's finite native mutation/Modal boundary.
const compiled = await build({stdin:{resolveDir:process.cwd(),contents:`export * from './src/ui/DeleteNodeModal';export * from './src/ui/RelationshipExplanationModal';export * from './src/application/frontmatterUnlink';export * from './src/lang/index';export * from './src/adapters/obsidian/relationshipMetadataWrite';`},bundle:true,write:false,platform:'browser',format:'iife',globalName:'sourceModules',plugins:[{name:'native-source-controls',setup(builder){builder.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'native'}));builder.onLoad({filter:/.*/,namespace:'native'},()=>({contents:host+`\nexports.AbstractInputSuggest=class {};exports.Scope=class {};exports.TFile=class {};exports.TFolder=class {};exports.Platform={};exports.normalizePath=path=>path;`}));}}]});
const bundle=compiled.outputFiles[0].text;
const setup = `(()=>{
 const M=window.sourceModules;window.notices=[];window.ok=(value,message)=>{if(!value)throw new Error(message)};
 window.tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
 window.defer=()=>{let release;const promise=new Promise(r=>release=r);return{promise,release}};
 window.makeDetails=({sourceExtension='md',targetExtension='md'}={})=>{
  const storage={path:'Owner.'+sourceExtension,extension:sourceExtension},inverse={path:'Target.'+targetExtension,extension:targetExtension},target=inverse,owners=new Map([[storage.path,storage],[inverse.path,inverse]]),listeners=new Set(),calls=[];
  const evidence=(field,owner=storage.path,kind='frontmatter-ontology')=>({id:field+owner+kind,sourcePath:storage.path,targetPath:target.path,declaredByPath:owner,declaredTargetPath:owner===storage.path?target.path:storage.path,sourceKind:kind,fieldName:field,role:'child',declaredRole:'child',direction:1,relationType:1});
  const child=evidence('Children'),friend=evidence('Friends'),reverse=evidence('Parents',target.path);
  let current={sourcePath:storage.path,targetPath:target.path,hidden:false,resolvedRoles:[{role:'child',relationType:1}],summary:'defined-ontology',decisions:[child,{...child,id:'repeat'},friend,reverse,{...evidence('inferred'),relationType:2},evidence('date',storage.path,'date-property'),evidence('body',storage.path,'inline-ontology'),evidence('generic',storage.path,'obsidian-link')].map(evidence=>({evidence,active:true}))};
  const pages=new Map([[storage.path,{path:storage.path,file:storage,url:null}],[target.path,{path:target.path,file:target,url:null}]]);
  const section=(item)=>({path:item.declaredByPath,startLine:1,endLine:5,text:item.declaredByPath===storage.path?'Children: [[Target]]\\nFriends: [[Target]]':'Parents: [[Owner]]',label:item.declaredByPath,id:item.id,sourceKind:item.sourceKind});
  const f={owners,listeners,calls,child,friend,reverse,storage,target,ready:true,get explanation(){return current},set explanation(value){current=value},sections:async items=>new Map(items.map(item=>[item.id,[section(item)]])),save:async()=>true};
  const plugin={app:{vault:{getFileByPath:path=>owners.get(path)??null}},settings:{hierarchy:{hidden:[],parents:['Parents'],children:['Children'],leftFriends:['Friends'],rightFriends:[],previous:['Previous'],next:['Next'],exclusions:[]}},captureConnectionOntologyChange:()=>null,translator:M.createTranslator('en'),index:{get:path=>pages.get(path),titleFor:page=>page.path,explainRelationship:()=>current,isSemanticWriteReady:()=>f.ready,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)}},
   captureFrontmatterUnlinkExpectation:item=>item.sourceKind==='frontmatter-ontology'&&owners.get(item.declaredByPath)?.extension==='md'?{storage:owners.get(item.declaredByPath),target:owners.get(item.declaredTargetPath),storagePath:item.declaredByPath,targetPath:item.declaredTargetPath,fieldKey:item.fieldName,declarationKey:M.frontmatterDeclarationKey(item)}:null,
   unlinkFrontmatterEvidence:async(...args)=>{calls.push(args);return f.save(...args)},relationshipEvidenceSectionsBatch:items=>f.sections(items),openRelationshipEvidenceLocation:async(...args)=>{f.navigation=args},openRelationModal:()=>{}};
  f.plugin=plugin;f.modal=new M.RelationshipExplanationModal(plugin,current, {hostLeaf:{id:'owned-sidecar',view:{containerEl:document.body.createDiv()}}});f.emit=()=>{for(const fn of listeners)fn()};return f;
 };
 return true;
})()`;

/** Read-only structural membership never displays a Hidden or ontology-edit control in real rendered details. */
test('tag and folder connection details omit impossible source mutation controls',async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(async()=>{
   for(const kind of ['isTag','isFolder']){
    const f=makeDetails(),source=f.plugin.index.get('Owner.md');source[kind]=true;
    f.explanation={...f.explanation,decisions:[],summary:kind==='isTag'?'source:tag-tree':'source:file-tree'};
    f.plugin.hideRelationship=()=>{throw new Error('Structural Hidden must not run')};
    f.modal=new sourceModules.RelationshipExplanationModal(f.plugin,f.explanation,{role:'child'});f.modal.open();await tick();
    ok(!f.modal.modalEl.querySelector('[data-kplex-hide-connection]'),'Structural Hidden leaked');
    ok(!f.modal.modalEl.querySelector('.kplex-edge-ontology-row button'),'Structural ontology edit leaked');
    f.modal.close();
   }return true;
  })()`),true);
 }finally{await browser.cleanup()}
});

/** The compact toolbar preserves all six source directions and leases one child to its inspector. */
test('connection toolbar owns additive and replacement children across cancel, publication and close',async()=>{
 const browser=await chromiumHarness(bundle);try{
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(async()=>{
   for(const role of ['parent','child','left','right','previous','next']){
    const f=makeDetails(),opened=[],declaration={...f.child,role,declaredRole:role};
    f.explanation={...f.explanation,decisions:[{evidence:declaration,active:true}]};
    const approved={selection:{primary:declaration,declarations:[declaration],signature:role},expectations:[]};
    f.plugin.captureConnectionOntologyChange=()=>approved;
    f.plugin.openRelationModal=options=>{const child={closed:false,close(){if(this.closed)return;this.closed=true;options.onClosed()}};opened.push({options,child});return child};
    let styled=0;f.modal=new sourceModules.RelationshipExplanationModal(f.plugin,f.explanation,{role,onStyle:button=>{ok(button.dataset.kplexConnectionStyle==='true','Captured style invoker');styled++}});
    f.modal.open();await tick();
    const toolbar=f.modal.modalEl.querySelector('.kplex-edge-connection-actions'),add=toolbar.querySelector('[data-kplex-add-ontology]'),replace=toolbar.querySelector('[data-kplex-change-ontology]');
    ok(add&&replace&&toolbar.querySelector('[data-kplex-connection-style]'),'Coherent connection toolbar');
    toolbar.querySelector('[data-kplex-connection-style]').click();ok(styled===1,'Appearance sources stay caller owned');
    add.click();ok(opened.length===1&&opened[0].options.semanticRole===role&&opened[0].options.allowRoleSelection===true&&opened[0].options.purpose==='ontology-add','Every semantic direction opens the shared additive selector');
    ok(f.modal.modalEl.isConnected&&add.disabled&&opened[0].options.current(),'Inspector stays mounted behind child');
    f.emit();ok(opened[0].options.current(),'Publication cannot retire its own pending child');
    opened[0].child.close();await tick();ok(!opened[0].options.current()&&f.modal.modalEl.isConnected,'Cancel returns to refreshed inspector and retires old generation');
    f.modal.modalEl.querySelector('[data-kplex-change-ontology]').click();ok(opened.length===2&&opened[1].options.semanticRole===role&&opened[1].options.ontologyChange===approved&&opened[1].options.initialStoragePath==='Owner.md','Replacement pins the real physical owner and role');
    const stale=f.modal.modalEl.querySelector('[data-kplex-add-ontology]');f.modal.close();ok(opened[1].child.closed&&!opened[1].options.current(),'Parent close retires exact child authority');stale.click();ok(opened.length===2,'Detached actions cannot open new children');
   }return true;
  })()`),true);
 }finally{await browser.cleanup()}
});

/** Body-property limitations stay next to ontology, without mislabeling ordinary prose links. */
test('connection details explains body ontology editing limits only for actual inline declarations',async()=>{
 const browser=await chromiumHarness(bundle);try{
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(async()=>{
   for(const mode of ['inline','mixed','frontmatter','inferred','body-url']){
    const f=makeDetails(),inline={...f.child,id:'body-property',sourceKind:'inline-ontology'};
    const decisions=mode==='mixed'?[{evidence:f.child,active:true},{evidence:inline,active:false}]
     :[{evidence:mode==='inline'?inline:mode==='frontmatter'?f.child:{...f.child,sourceKind:mode==='inferred'?'obsidian-link':'body-url',relationType:2},active:true}];
    f.explanation={...f.explanation,decisions};f.modal=new sourceModules.RelationshipExplanationModal(f.plugin,f.explanation);f.modal.open();await tick();
    const hint=f.modal.modalEl.querySelector('.kplex-edge-body-ontology-hint'),expected=mode==='inline'||mode==='mixed';
    ok(Boolean(hint)===expected,'Body ontology hint eligibility: '+mode);
    if(hint)ok(hint.closest('.kplex-edge-ontology-row')&&hint.textContent===f.plugin.translator('explain.bodyOntologyHint'),'Short limitation hint stays beside ontology');
    ok(f.calls.length===0,'Hint rendering must not write a relationship');f.modal.close();
   }return true;
  })()`),true);
 }finally{await browser.cleanup()}
});

/** Inference uses the same plus action; only genuine incompatible property sets explain conflict. */
test('connection ontology toolbar defines inferred sequence links and explains only declaration conflicts',async()=>{
 const browser=await chromiumHarness(bundle);try{
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=makeDetails(),opened=[];f.plugin.openRelationModal=options=>{opened.push(options);return{close(){options.onClosed()}}};
   f.explanation={...f.explanation,resolvedRoles:[{role:'next',relationType:2}],decisions:[{evidence:{...f.child,role:'next',declaredRole:'next',relationType:2,sourceKind:'obsidian-link'},active:true}]};
   f.modal=new sourceModules.RelationshipExplanationModal(f.plugin,f.explanation,{role:'sibling'});f.modal.open();await tick();
   ok(!f.modal.modalEl.querySelector('.kplex-edge-ontology-conflict'),'Inference is not a conflict');
   const define=f.modal.modalEl.querySelector('[data-kplex-add-ontology]');ok(define.getAttribute('aria-label')==='Define relationship…','Define plus has accessible intent');define.click();ok(opened[0].purpose==='ontology-specify'&&opened[0].semanticRole==='next','Inference preserves sequence direction');f.modal.close();
   const single=makeDetails();single.explanation={...single.explanation,decisions:[{evidence:single.child,active:true}]};single.modal.open();await tick();ok(!single.modal.modalEl.querySelector('.kplex-edge-ontology-conflict'),'Native or unsupported eligibility alone is not a conflict');single.modal.close();
   const pair=makeDetails();pair.plugin.settings.ontologyPairingVersion=1;pair.plugin.settings.hierarchy.children=['Children/Parents'];pair.plugin.settings.hierarchy.parents=[];pair.explanation={...pair.explanation,decisions:[{evidence:pair.child,active:true},{evidence:{...pair.reverse,declaredRole:'parent',direction:2},active:true}]};pair.modal.open();await tick();ok(!pair.modal.modalEl.querySelector('.kplex-edge-ontology-conflict'),'A configured reciprocal pair is one ontology despite unavailable native replacement');pair.modal.close();
   const conflict=makeDetails();conflict.modal=new sourceModules.RelationshipExplanationModal(conflict.plugin,conflict.explanation,{role:'child'});conflict.modal.open();await tick();
   ok(conflict.modal.modalEl.querySelector('.kplex-edge-ontology-conflict')&&!conflict.modal.modalEl.querySelector('[data-kplex-change-ontology]'),'Multiple mismatched properties explain how to repair source declarations');
   const removals=[...conflict.modal.modalEl.querySelectorAll('[data-kplex-remove-field]')];ok(removals.length===3&&removals.every(button=>button.parentElement.classList.contains('kplex-edge-declaration-actions')),'Exact confirmed removal remains grouped by physical declaration');
   ok(conflict.modal.modalEl.querySelector('.kplex-edge-source-actions [aria-label="Go to source"]'),'Source navigation remains readily available');conflict.modal.close();return true;
  })()`),true);
 }finally{await browser.cleanup()}
});

/** Declaration coordinates remain independent of occurrence grouping and generic cache mirrors. */
test('single Hidden visibility removal is direct, exact and guarded while multiple Hidden sources remain separate',async()=>{
 const browser=await chromiumHarness(bundle);try{
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(async()=>{
   const hidden=f=>({...f.child,fieldName:'Hidden',role:'hidden',declaredRole:'hidden'});
   const prepare=()=>{const f=makeDetails();f.plugin.settings.hierarchy.hidden=['Hidden','Private'];f.explanation={...f.explanation,hidden:true,resolvedRoles:[],summary:'hidden',decisions:[{evidence:hidden(f),active:true},{evidence:{...f.child,sourceKind:'obsidian-link',relationType:2},active:false}]};f.modal=new sourceModules.RelationshipExplanationModal(f.plugin,f.explanation,{role:'child'});return f};
   const f=prepare(),hold=defer();f.save=async()=>{await hold.promise;f.explanation={...f.explanation,hidden:false,decisions:f.explanation.decisions.filter(d=>d.evidence.declaredRole!=='hidden')};return true};f.modal.open();await tick();
   const show=f.modal.modalEl.querySelector('[data-kplex-show-connection]');ok(show&&show.getAttribute('aria-label')==='Remove Hidden declaration','One supported Hidden declaration exposes the eye action');show.click();show.click();await tick();ok(f.calls.length===1&&f.calls[0][0].fieldName==='Hidden'&&f.calls[0][1].storagePath==='Owner.md'&&f.calls[0][1].targetPath==='Target.md','Duplicate visibility activation writes exactly the selected physical property');ok(!document.querySelector('.kplex-remove-relationship-source-modal'),'Visibility toggle opens no extra confirmation');f.modal.close();ok(!f.calls[0][2](),'Closing the inspector retires the writer guard');hold.release();await tick();show.click();ok(f.calls.length===1&&!f.modal.modalEl.isConnected,'Late completion and detached activation cannot reopen or retry');
   const stale=prepare();stale.modal.open();await tick();const retired=stale.modal.modalEl.querySelector('[data-kplex-show-connection]'),capture=stale.plugin.captureFrontmatterUnlinkExpectation;stale.plugin.captureFrontmatterUnlinkExpectation=()=>null;retired.click();await tick();ok(stale.calls.length===0,'Changed native edit expectation cannot write');stale.plugin.captureFrontmatterUnlinkExpectation=capture;stale.modal.close();
   const multiple=prepare();multiple.explanation={...multiple.explanation,decisions:[...multiple.explanation.decisions,{evidence:{...hidden(multiple),fieldName:'Private',id:'private-hidden'},active:true}]};multiple.modal=new sourceModules.RelationshipExplanationModal(multiple.plugin,multiple.explanation,{role:'child'});multiple.modal.open();await tick();ok(!multiple.modal.modalEl.querySelector('[data-kplex-show-connection]')&&multiple.modal.modalEl.querySelectorAll('[data-kplex-remove-field]').length===2,'Several Hidden declarations keep independent source actions without a broad visibility removal');multiple.modal.close();return true;
  })()`),true);
 }finally{await browser.cleanup()}
});

/** Disabled reversal explains only its own unsupported receiver, while replacement stays available. */
test('visible reverse inspection removes only the original owners Hidden declaration',async()=>{
 const browser=await chromiumHarness(bundle);try{
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(async()=>{
   const prepare=kind=>{const f=makeDetails(),ontology={...f.child,sourcePath:'Target.md',targetPath:'Owner.md',role:'parent',direction:2},hidden={...ontology,id:'inverse-hidden',fieldName:'Hidden',declaredRole:'hidden',role:'hidden',sourceKind:kind};f.plugin.settings.hierarchy.hidden=['Hidden'];f.explanation={sourcePath:'Target.md',targetPath:'Owner.md',hidden:false,resolvedRoles:[{role:'parent',relationType:1}],summary:'defined-ontology',decisions:[{evidence:ontology,active:true},{evidence:hidden,active:false}]};f.modal=new sourceModules.RelationshipExplanationModal(f.plugin,f.explanation,{role:'parent'});return{f,ontology,hidden}};
   const {f,ontology,hidden}=prepare('frontmatter-ontology');f.save=async(item,expected,current)=>{ok(current(),'Exact reverse inspector still owns write authority');f.explanation={...f.explanation,decisions:f.explanation.decisions.filter(d=>d.evidence!==hidden)};return true};f.modal.open();await tick();
   const show=f.modal.modalEl.querySelector('[data-kplex-show-connection]');ok(show&&!f.explanation.hidden,'Opposite visible perspective still offers original Hidden declaration removal');show.click();show.click();await tick();ok(f.calls.length===1&&f.calls[0][0]===hidden&&f.calls[0][1].storage===f.storage&&f.calls[0][1].target===f.target&&f.calls[0][1].storagePath==='Owner.md'&&f.calls[0][1].targetPath==='Target.md','Perspective never swaps the physical Hidden owner or target');ok(!document.querySelector('.kplex-remove-relationship-source-modal'),'Reverse visibility removal opens no additional confirmation');ok(f.explanation.decisions.length===1&&f.explanation.decisions[0].evidence===ontology&&!f.modal.modalEl.querySelector('[data-kplex-show-connection]'),'Other explicit ontology is preserved and canonical refresh retires the eye action');f.modal.close();show.click();ok(f.calls.length===1&&!f.calls[0][2](),'Closed reverse inspector cannot reuse visibility authority');
   const inline=prepare('inline-ontology');inline.f.modal.open();await tick();ok(!inline.f.modal.modalEl.querySelector('[data-kplex-show-connection]')&&inline.f.modal.modalEl.querySelector('.kplex-edge-source-actions [aria-label="Go to source"]'),'Inline-only Hidden provenance stays available for manual source editing');inline.f.modal.close();
   const multiple=prepare('frontmatter-ontology');multiple.f.explanation={...multiple.f.explanation,decisions:[...multiple.f.explanation.decisions,{evidence:{...multiple.hidden,id:'other-hidden',fieldName:'Private'},active:false}]};multiple.f.modal=new sourceModules.RelationshipExplanationModal(multiple.f.plugin,multiple.f.explanation,{role:'parent'});multiple.f.modal.open();await tick();ok(!multiple.f.modal.modalEl.querySelector('[data-kplex-show-connection]')&&multiple.f.calls.length===0,'Visible reverse perspective cannot broadly remove multiple Hidden properties');multiple.f.modal.close();return true;
  })()`),true);
 }finally{await browser.cleanup()}
});

/** Disabled reversal explains only its own unsupported receiver, while replacement stays available. */
test('attachment connection limits are attached to Reverse rather than a broad ontology warning',async()=>{
 const browser=await chromiumHarness(bundle);try{
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(async()=>{const f=makeDetails({targetExtension:'png'});f.explanation={...f.explanation,decisions:[{evidence:f.child,active:true}]};f.plugin.captureConnectionOntologyChange=()=>({selection:{primary:f.child,declarations:[f.child],signature:'attachment'},expectations:[]});const opened=[];f.plugin.openRelationModal=options=>{opened.push(options);return{close(){options.onClosed()}}};f.modal.open();await tick();const reverse=f.modal.modalEl.querySelector('.kplex-edge-declaration-actions button[aria-label^="Flip owner"]');ok(reverse&&reverse.disabled&&reverse.getAttribute('aria-label').includes('Both owners must be physical Markdown notes'),'Disabled Reverse has its own exact availability explanation');const replace=f.modal.modalEl.querySelector('[data-kplex-change-ontology]');ok(replace&&f.modal.modalEl.querySelector('[data-kplex-add-ontology]'),'Single Markdown owner permits both additive and replacement ontology');replace.click();ok(opened.length===1&&opened[0].origin.file===f.storage&&opened[0].fixedTarget.file===f.target&&opened[0].fixedTarget.path==='Target.png'&&opened[0].initialStoragePath==='Owner.md','Attachment replacement keeps its live Markdown owner and native attachment identity');opened[0].onClosed();await tick();ok(![...f.modal.modalEl.querySelectorAll('.setting-item-description')].some(el=>el.textContent.includes('Both owners must be physical Markdown notes')),'No broad warning implies replacement is unavailable');f.modal.close();return true})()`),true);
 }finally{await browser.cleanup()}
});

/** Declaration coordinates remain independent of occurrence grouping and generic cache mirrors. */
test('connection ontology actions require a live Markdown property owner',async()=>{
 const browser=await chromiumHarness(bundle);try{
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(async()=>{
   for(const replaced of [false,true]){
    const f=replaced?makeDetails():makeDetails({sourceExtension:'png',targetExtension:'pdf'});
    f.explanation={...f.explanation,summary:'source:obsidian-link',decisions:[{evidence:{...f.child,sourceKind:'obsidian-link',relationType:2},active:true}]};
    if(replaced){for(const file of [f.storage,f.target])f.owners.set(file.path,{path:file.path,extension:'md'})}
    f.plugin.captureConnectionOntologyChange=()=>{throw new Error('No native owner must not expose replacement capture')};
    f.plugin.openRelationModal=()=>{throw new Error('No native owner must not open a property writer')};
    f.modal=new sourceModules.RelationshipExplanationModal(f.plugin,f.explanation,{role:'child'});f.modal.open();await tick();
    ok(!f.modal.modalEl.querySelector('[data-kplex-add-ontology]')&&!f.modal.modalEl.querySelector('[data-kplex-change-ontology]'),replaced?'Replaced native files cannot inherit editable ownership':'Two non-Markdown endpoints cannot store an ontology declaration');f.modal.close();
   }return true;
  })()`),true);
 }finally{await browser.cleanup()}
});

/** Declaration coordinates remain independent of occurrence grouping and generic cache mirrors. */
test('connection details retains its top toolbar by default and honors explicit initial focus once',async()=>{
 const browser=await chromiumHarness(bundle);try{
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(async()=>{const original=HTMLElement.prototype.scrollIntoView,calls=[];HTMLElement.prototype.scrollIntoView=function(){calls.push(this)};try{
   const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
   const ordinary=makeDetails();ordinary.modal.open();await frame();ok(calls.length===0&&ordinary.modal.modalEl.querySelector('.kplex-edge-connection-actions'),'Ordinary details preserves top actions without source-list autoscroll');ordinary.modal.refreshDetails();await frame();ok(calls.length===0,'Source publication never scrolls ordinary inspection');ordinary.modal.close();
   for(const initialFocus of ['sources','why']){const f=makeDetails();f.modal=new sourceModules.RelationshipExplanationModal(f.plugin,f.explanation,{role:'child',initialFocus});f.modal.open();await frame();ok(calls.length===1&&calls[0].classList.contains(initialFocus==='sources'?'kplex-edge-source-list':'kplex-edge-why'),'Explicit source/why navigation is honored');f.modal.refreshDetails();await frame();ok(calls.length===1,'Refresh preserves the reader position after initial navigation');f.modal.close();calls.length=0}return true;
  }finally{HTMLElement.prototype.scrollIntoView=original}})()`),true);
 }finally{await browser.cleanup()}
});

/** Declaration coordinates remain independent of occurrence grouping and generic cache mirrors. */
test("connection source actions deduplicate declaration tuples and retain independent fields/owners", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(setup),true);
  assert.deepEqual(await browser.evaluate(`(async()=>{const f=makeDetails();f.modal.open();await tick();const buttons=[...f.modal.modalEl.querySelectorAll('[data-kplex-remove-field]')];const result={fields:buttons.map(b=>b.dataset.kplexRemoveField).sort(),count:sourceModules.selectedFrontmatterDeclarations(f.explanation.decisions.map(d=>d.evidence)).length};f.modal.close();result.released=f.listeners.size===0;return result})()`),{fields:["Children","Friends","Parents"],count:3,released:true});
 }finally{await browser.cleanup();}
});

/** An incoming-only preview must acquire the exact pair before declaring its other-note property uneditable. */
test('incoming property unlink prepares the pair and offers the declaring note from either center',async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(async()=>{
   for(const reverse of [false,true]){
    const f=makeDetails(),hold=defer(),reads=[],canonical=f.explanation;
    const sourcePath=reverse?'Target.md':'Owner.md',targetPath=reverse?'Owner.md':'Target.md';
    const declaration={...f.child,sourcePath,targetPath,role:reverse?'parent':'child',direction:reverse?2:1};
    const full={...canonical,sourcePath,targetPath,decisions:[{evidence:declaration,active:true}]};
    f.explanation=reverse?{...full,decisions:[{evidence:{...declaration,id:'preview',sourceKind:'obsidian-link',relationType:2},active:true}]}:full;
    f.ready=!reverse;f.plugin.index.prepareRelationshipPair=async(source,target)=>{reads.push([source,target]);await hold.promise;f.explanation=full;f.ready=true;return true};
    f.modal=new sourceModules.RelationshipExplanationModal(f.plugin,f.explanation,{role:reverse?'parent':'child'});f.modal.open();await tick();
    if(reverse)ok(!f.modal.modalEl.querySelector('[data-kplex-remove-field]'),'Preview must not invent an editable declaration');
    hold.release();await tick();
    const remove=f.modal.modalEl.querySelector('[data-kplex-remove-field="Children"]');ok(remove,'Declared property missing from the opposite center');
    ok(reverse?reads.length===1&&reads[0][0]===sourcePath&&reads[0][1]===targetPath:reads.length===0,'Prepare only the incomplete pair once in its current orientation');
    remove.click();let confirmation=document.querySelector('.kplex-remove-relationship-source-modal');
    ok(confirmation.textContent.includes('Owner.md')&&confirmation.textContent.includes('Target.md'),'Confirmation must name the real owning note and link target');
    confirmation.querySelector('button').click();await tick();ok(f.calls.length===0,'Cancel must preserve both notes');
    remove.click();confirmation=document.querySelector('.kplex-remove-relationship-source-modal');confirmation.querySelector('button.mod-warning').click();await tick();
    ok(f.calls.length===1&&f.calls[0][0].declaredByPath==='Owner.md'&&f.calls[0][1].storagePath==='Owner.md'&&f.calls[0][1].targetPath==='Target.md','Both centers must authorize the same exact physical property');
    f.modal.close();ok(f.listeners.size===0,'Source preparation must retain ordinary modal cleanup');
   }
   return true;
  })()`),true);
 }finally{await browser.cleanup();}
});

/** The retained-placeholder explanation lists exact Markdown notes and hands manual editing to native navigation. */
test('remaining placeholder dialog explains body links and opens the selected source location',async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(async()=>{
   const opened=[],changes=[],reference={path:'Notes/Source.md',line:7,label:'body',sourceKind:'unresolved-link'};
   let canSave=false;
   const modal=new sourceModules.RemainingNodeReferencesModal({},'Missing note',[reference],item=>opened.push(item),[],
      async showAgain=>{changes.push(showAgain);return canSave;});modal.open();
   ok(modal.modalEl.textContent.includes('Missing note')&&modal.modalEl.textContent.includes('Notes/Source.md'),'Name the retained placeholder and its source note');
   const open=[...modal.modalEl.querySelectorAll('button')].find(button=>button.textContent==='Open');ok(open,'Offer native manual editing');open.click();await tick();
   ok(opened.length===1&&opened[0].path==='Notes/Source.md'&&opened[0].line===7,'Open the exact note and Markdown line');
   const toggle=modal.modalEl.querySelector('input[type=checkbox]');
   ok(toggle&&!toggle.checked&&toggle.parentElement.textContent.includes('Never show this again'),'Show an off-by-default native toggle');
   ok(toggle.getAttribute('role')==='switch'&&document.getElementById(toggle.getAttribute('aria-labelledby'))?.textContent==='Never show this again','Associate the accessible switch with its visible label');
   toggle.click();await tick();ok(!toggle.checked&&!toggle.disabled&&toggle.getAttribute('aria-checked')==='false','Failed preference save restores the toggle');
   canSave=true;toggle.click();await tick();ok(toggle.checked&&toggle.getAttribute('aria-checked')==='true'&&changes.length===2&&changes.every(value=>value===false),'Opt out immediately and keep this report open');
   ok(modal.modalEl.isConnected,'Opting out does not dismiss the report');
   modal.close();return true;
  })()`),true);
 }finally{await browser.cleanup();}
});

/** Exact-pair discovery cannot revive closed dialogs or dismiss a newer generation's confirmation. */
test('late incoming source preparation preserves newer confirmation and ready or structural pairs stay passive',async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=makeDetails(),hold=defer();let preparations=0;
   f.ready=false;f.plugin.index.prepareRelationshipPair=async()=>{preparations++;await hold.promise;return true};
   f.modal.open();await tick();f.modal.close();
   f.ready=true;f.modal.open();await tick();f.modal.modalEl.querySelector('[data-kplex-remove-field="Children"]').click();
   const confirmation=document.querySelector('.kplex-remove-relationship-source-modal');hold.release();await tick();
   ok(preparations===1&&confirmation.isConnected,'Old preparation cannot dismiss a newer confirmation or repeat a ready pair read');
   f.modal.close();ok(!confirmation.isConnected&&f.listeners.size===0&&f.calls.length===0,'Close retires confirmation and discovery without writing');
   const concurrent=makeDetails(),pending=defer();concurrent.ready=false;
   concurrent.plugin.index.prepareRelationshipPair=async()=>{await pending.promise;return true};
   concurrent.modal.open();await tick();concurrent.modal.modalEl.querySelector('[data-kplex-remove-field="Children"]').click();
   const active=document.querySelector('.kplex-remove-relationship-source-modal');pending.release();await tick();
   ok(active.isConnected&&concurrent.calls.length===0,'Pair discovery cannot interrupt an active source confirmation');concurrent.modal.close();
   for(const kind of ['isTag','isFolder']){
    const structural=makeDetails();structural.ready=false;structural.plugin.index.get('Owner.md')[kind]=true;
    structural.plugin.index.prepareRelationshipPair=()=>{throw new Error('Structural inspection must not request ontology preparation')};
    structural.modal.open();await tick();structural.modal.close();ok(structural.listeners.size===0,'Structural inspection releases its subscription');
   }
   return true;
  })()`),true);
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
   find().click();confirmation=document.querySelector('.kplex-remove-relationship-source-modal');const unlink=confirmation.querySelector('button.mod-warning');ok(unlink.classList.contains('kplex-icon-action')&&unlink.getAttribute('aria-label')==='Remove relationship','Destructive approval retains an accessible native icon action');unlink.click();await tick();find().click();ok(f.calls.length===1,'Duplicate activation serialized');ok([...f.modal.modalEl.querySelectorAll('[data-kplex-remove-field]')].every(b=>b.disabled),'Competing controls disabled');
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

/** The actual native deletion shell renders safe defaults, finite broader consent and exact property navigation. */
test('delete consent modal keeps arbitrary defaults and cancellation cannot revive detached controls',async()=>{
 const browser=await chromiumHarness(bundle);try{
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(()=>{const calls=[],opened=[],preview={sources:[{path:'A.md',properties:[{field:'Children',ontology:true,choice:'remove',supported:true,line:1},{field:'Notes',ontology:false,choice:'keep',supported:true,line:2}]}],hiddenFields:['hidden','Private'],hiddenField:'hidden'};
   const modal=new sourceModules.DeleteNodeConfirmationModal({}, {nodeName:'B',hasFile:true,firstUse:false,confirmFileDelete:false,preview,onConfirm:value=>calls.push(value),onOpenLocation:value=>opened.push(value),onCancel:()=>calls.push('cancel')});modal.open();
   ok(modal.modalEl.textContent.includes('This list may not include every note that links here')&&modal.modalEl.textContent.includes('Links in note text stay unchanged'),'Coverage and body preservation disclosed');
   const review=modal.modalEl.querySelector('details');ok(review&&!review.open,'Property review starts collapsed');review.open=true;
   const rows=[...modal.modalEl.querySelectorAll('[data-kplex-delete-field]')];ok(rows[0].dataset.kplexDeleteSource==='A.md'&&rows[0].querySelector('select').value==='remove'&&rows[1].querySelector('select').value==='keep','Exact coordinate defaults');
   const select=rows[1].querySelector('select');select.value='hide';select.dispatchEvent(new Event('change'));ok(preview.sources[0].properties[1].choice==='hide','One selected broader property only');rows[1].querySelector('button').click();ok(opened[0].path==='A.md'&&opened[0].line===2&&opened[0].fieldName==='Notes','Real source coordinate');
   const confirm=modal.modalEl.querySelector('[data-kplex-delete-confirm]');modal.close();confirm.click();ok(calls.length===1&&calls[0]==='cancel','Detached approval cannot revive canceled consent');return true})()`),true);
 }finally{await browser.cleanup();}
});

/** Explicit approval settles exactly once and retains the native physical-confirm preference independently. */
test('delete modal explicit consent is one-shot and no hidden configuration offers no Hide choice',async()=>{
 const browser=await chromiumHarness(bundle);try{
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(()=>{const calls=[],preview={sources:[{path:'A.md',properties:[{field:'Notes',ontology:false,choice:'keep',supported:true,line:2}]}],hiddenFields:[],hiddenField:''};const modal=new sourceModules.DeleteNodeConfirmationModal({}, {nodeName:'B',hasFile:true,firstUse:false,confirmFileDelete:true,preview,onConfirm:value=>calls.push(value)});modal.open();
   const select=modal.modalEl.querySelector('[data-kplex-delete-choice]');ok(![...select.options].some(o=>o.value==='hide')&&!modal.modalEl.querySelector('[data-kplex-hidden-field]'),'Unavailable Hidden not invented');
   const toggle=modal.modalEl.querySelector('input[type=checkbox]');toggle.checked=true;toggle.dispatchEvent(new Event('change'));const confirm=modal.modalEl.querySelector('[data-kplex-delete-confirm]');confirm.click();confirm.click();ok(calls.length===1&&calls[0]===false,'Physical preference and one-shot scope retained');return true})()`),true);
 }finally{await browser.cleanup();}
});

/** Live Hidden direction follows the selected owner; detached changes cannot revive or retarget one-shot approval. */
test('Hidden native shell updates exact central direction with source selection and retires stale controls',async()=>{
 const browser=await chromiumHarness(bundle);try{
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(()=>{const calls=[];const modal=new sourceModules.HideRelationshipModal({},['Folder/A.md','Folder/B.md'],['hidden','Private'],['Folder/A.md','Folder/B.md'],value=>calls.push(value));modal.open();ok(modal.modalEl.textContent.includes('All links are kept')&&modal.modalEl.textContent.includes('may still appear from the other note'),'Retention and inverse visibility disclosed');
   const direction=modal.modalEl.querySelector('[data-kplex-hide-direction]'),source=modal.modalEl.querySelector('[data-kplex-hide-source]'),field=modal.modalEl.querySelector('[data-kplex-hidden-field]');ok(direction.getAttribute('aria-live')==='polite','Source-selection consequences announce politely');ok(direction.dataset.kplexHideFrom==='Folder/A.md'&&direction.dataset.kplexHideTo==='Folder/B.md'&&direction.textContent==='Hide "Folder/B.md" when "Folder/A.md" is the central note. Save the Hidden relationship in "Folder/A.md".','Exact initial central and write note');
   source.value='Folder/B.md';source.dispatchEvent(new Event('change'));ok(direction.dataset.kplexHideFrom==='Folder/B.md'&&direction.dataset.kplexHideTo==='Folder/A.md'&&direction.textContent==='Hide "Folder/A.md" when "Folder/B.md" is the central note. Save the Hidden relationship in "Folder/B.md".','Selected source updates direction before approval');
   field.value='Private';field.dispatchEvent(new Event('change'));const confirm=modal.modalEl.querySelector('[data-kplex-hide-confirm]');ok(confirm.classList.contains('kplex-icon-action')&&confirm.getAttribute('aria-label')==='Hide connection','Hide approval uses the same accessible icon action');confirm.click();source.value='Folder/A.md';source.dispatchEvent(new Event('change'));confirm.click();ok(calls.length===1&&calls[0].sourcePath==='Folder/B.md'&&calls[0].field==='Private'&&direction.dataset.kplexHideFrom==='Folder/B.md','Detached approved controls cannot change exact once-only scope');
   const cancel=new sourceModules.HideRelationshipModal({},['A.md','B.md'],['hidden','Private'],['A.md','B.md'],value=>calls.push(value));cancel.open();const stale=cancel.modalEl.querySelector('[data-kplex-hide-confirm]'),staleSource=cancel.modalEl.querySelector('[data-kplex-hide-source]'),staleField=cancel.modalEl.querySelector('[data-kplex-hidden-field]'),staleDirection=cancel.modalEl.querySelector('[data-kplex-hide-direction]');cancel.close();staleSource.value='B.md';staleSource.dispatchEvent(new Event('change'));staleField.value='Private';staleField.dispatchEvent(new Event('change'));stale.click();ok(calls.length===2&&calls[1]===null&&staleDirection.dataset.kplexHideFrom==='A.md','Canceled hidden shell cannot revive or update detached direction');return true})()`),true);
 }finally{await browser.cleanup();}
});

/** The original target can be the sole writable source; the explicit pair prevents a false self-direction. */
test('Hidden setup is staged in the final form and cancellation grants no configuration authority',async()=>{
 const browser=await chromiumHarness(bundle);try{
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(()=>{const calls=[],modal=new sourceModules.HideRelationshipModal({},['A.md'],['privateHidden'],['A.md','B.md'],value=>calls.push(value),{createHiddenField:true});modal.open();const staged=modal.modalEl.querySelector('[data-kplex-hidden-field-staged]');ok(staged&&staged.textContent.includes('privateHidden'),'Final save form names the pending vocabulary field');ok(calls.length===0,'Opening never configures or writes');const stale=modal.modalEl.querySelector('[data-kplex-hide-confirm]');modal.close();stale.click();ok(calls.length===1&&calls[0]===null,'Cancel grants neither configuration nor hide authority');const configured=new sourceModules.HideRelationshipModal({},['A.md'],['hidden'],['A.md','B.md'],value=>calls.push(value));configured.open();ok(!configured.modalEl.querySelector('[data-kplex-hidden-field-staged]'),'Existing vocabulary requires no setup prompt');configured.close();return true})()`),true);
 }finally{await browser.cleanup()}
});

/** The original target can be the sole writable source; the explicit pair prevents a false self-direction. */
test('Hidden native shell names the opposite placeholder when only the original target is writable',async()=>{
 const browser=await chromiumHarness(bundle);try{
  assert.equal(await browser.evaluate(setup),true);
  assert.equal(await browser.evaluate(`(()=>{const calls=[],modal=new sourceModules.HideRelationshipModal({},['Folder/B.md'],['Private'],['Missing/B','Folder/B.md'],value=>calls.push(value));modal.open();const direction=modal.modalEl.querySelector('[data-kplex-hide-direction]'),source=modal.modalEl.querySelector('[data-kplex-hide-source]');ok(source.options.length===1&&source.value==='Folder/B.md','Only the captured writable endpoint is offered');ok(direction.dataset.kplexHideFrom==='Folder/B.md'&&direction.dataset.kplexHideTo==='Missing/B'&&direction.textContent==='Hide "Missing/B" when "Folder/B.md" is the central note. Save the Hidden relationship in "Folder/B.md".','Both explicit endpoint paths survive opposite-source-only choice');modal.modalEl.querySelector('[data-kplex-hide-confirm]').click();ok(calls.length===1&&calls[0].sourcePath==='Folder/B.md'&&calls[0].field==='Private','Sole writable source grants its exact one-note consent');return true})()`),true);
 }finally{await browser.cleanup();}
});

/** Real pair facades must follow canonical dematerialization before another exact native write scope. */
test('canonical dematerialization retires the copied physical pair facade and prepares the ghost pair',async()=>{
 const graphBundle=await contributorBrowserBundle(['src/index/GraphIndex.ts','src/index/GraphBuilder.ts','src/core/graph/compiler.ts','src/adapters/obsidian/metadataSourceCollector.ts','src/adapters/obsidian/ontologySourceCollector.ts']);
 const browser=await chromiumHarness(graphBundle);
 try{assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
  assert.equal(await browser.evaluate('(async()=>{'+
   'const assert=Object.assign((v,m)=>ok(v,m),{equal}),M=sourceModules,f=await fixture("delete-pair-facade"),collect='+collect.toString()+',hostOracle='+hostOracle.toString()+',fullCenterIndex='+fullCenterIndex.toString()+',centerGateSettings='+centerGateSettings.toString()+';'+
   'let index;try{'+
   'f.text=f.texts;const owner=f.add("Owner.md","",{Parent:"[[Target.md]]",arbitrary:"[[Target.md]]"}),native=f.add("Target.md","");await f.acquire();ok(await f.acquisition.reconcile(),"Seed real source authority");'+
   'const semantic={hierarchy:{hidden:[],parents:["Parent"],children:[],leftFriends:[],rightFriends:[],previous:[],next:[]},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};'+
   'index=await fullCenterIndex(M,f,await hostOracle(f,[...f.files.keys()],semantic,{noteTypeField:"Type",primaryTagField:"Style"},true),semantic,centerGateSettings({showFolderNodes:false}));index.scheduleOrphanCleanup=()=>{};'+
   'ok(await index.sourceAcquisition.reconcile(),"Acquire actual index source authority");ok(await index.prepareRelationshipPair(owner.path,native.path),"Prepare physical pair");'+
   'const canonical=index.pages.get(native.path),facade=index.get(native.path);ok(facade!==canonical,"Pair exposes copied facade");ok(facade.file===native&&canonical.file===native,"Both exact native identities before trash");'+
   'f.files.delete(native.path);f.app.vault.trigger("delete",native);index.dematerializeFile(native.path);'+
   'ok(index.pages.get(native.path)===canonical,"Canonical endpoint identity retained");equal(canonical.file,null,"Canonical ghost immediately");equal(index.get(native.path).file,null,"Read facade cannot retain deleted physical file");'+
   'ok(await index.sourceAcquisition.reconcile(),"Settle actual deletion source authority");ok(await index.prepareRelationshipPair(owner.path,native.path),"Prepare actual remaining ghost pair");'+
   'ok(index.pages.get(native.path)===canonical,"Pair publication preserves canonical ghost identity");equal(index.get(native.path).file,null,"Published ghost facade remains unbound");equal(f.app.vault.getFileByPath(native.path),null,"No replacement native target");'+
   'ok(index.isSemanticWriteReady(owner.path,native.path),"Ordinary pair write authority stays required and available");return true;'+
   '}finally{index?.destroy();f.close();}})()'),true);
 }finally{await browser.cleanup();}
});
