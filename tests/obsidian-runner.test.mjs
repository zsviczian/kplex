/**
 * Tests K-Plex strict host-runner staging and failure paths with injected filesystem/CLI doubles.
 * Canonical command and DOM expectations match production; these tests do not launch Obsidian.
 * Imported checkpoint/consumer contracts cover private CPU instrumentation without native hosts.
 */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { runObsidianVerification, validateTarget } from "../scripts/testing/obsidian/runner.mjs";
import { runLiveUpdatesForeground } from "../scripts/testing/obsidian/foregroundLiveUpdates.mjs";
import { createWaitTimingProbe } from "../scripts/testing/obsidian/waitTiming.mjs";
import { npmInvocation, obsidianCliExecutable, spawnNativeSync } from "../scripts/testing/obsidian/processTools.mjs";
import { browserExecutable } from "./support/browserExecutable.mjs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { startupCacheIdentity } from "../scripts/testing/obsidian/startupCacheIdentity.mjs";
import { startupRetainedMemory } from "../scripts/testing/obsidian/startupRetainedMemory.mjs";
import {nativeDocumentSessions,withNativeDocumentSessions} from "../scripts/testing/obsidian/nativeDocumentSessions.mjs";
import ts from "typescript";
import {createLightweightIndexingProbe} from "../scripts/testing/obsidian/indexingCpuProbe.mjs";
import "./indexing-checkpoint.test.mjs";
import "./indexing-consumer-probe.test.mjs";

const phoneDriverPath=new URL('../scripts/testing/obsidian/authoringWorkspacePhone.mjs',import.meta.url);
const phoneDriver=ts.createSourceFile(phoneDriverPath.pathname,readFileSync(phoneDriverPath,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const phoneFunctions=['phoneIsolation','isolation','isolatedEvaluate','transition'].map(name=>{
 const declaration=phoneDriver.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
 assert(declaration,'Actual phone driver function '+name);return declaration.getText(phoneDriver);
}).join('\n');

/** Execute the actual runner guards/transition code against finite native facts and write receipts. */
function phoneDriverFixture(overrides={}){
 const vaultPath='C:/owned/kplex-test-small',facts={vault:'kplex-test-small',path:vaultPath,ids:[1],current:1,destroyed:null,...overrides},mutations=[],files=new Map(),report={isolation:[],recoveryInputs:{native:'native-recovery.json',configuration:'configuration-recovery.json'}};
 const native={id:facts.current,setContentSize:(...args)=>mutations.push(['geometry',...args])};
 const renderer={require:name=>{assert.equal(name,'@electron/remote');return{getCurrentWindow:()=>({...native,id:facts.current}),BrowserWindow:{getAllWindows:()=>facts.ids.map(id=>({id,isDestroyed:()=>id===facts.destroyed}))}}},
  app:{isMobile:false,vault:{getName:()=>facts.vault,adapter:{getBasePath:()=>facts.path}},emulateMobile:value=>mutations.push(['emulate',value])}};
 const context={assert,realpathSync:path=>path,target:{vault:vaultPath},report,directory:'owned-report',selectedPath:vaultPath,join,
  evaluate:code=>JSON.parse(runInNewContext(code,renderer)),cli:(command,arg)=>{assert.equal(command,'eval');assert(arg.startsWith('code='));return runInNewContext(arg.slice(5),renderer)},
  ready:async()=>{},writeFileSync:(path,bytes)=>files.set(path,String(bytes))};
 runInNewContext(phoneFunctions+';globalThis.driver={phoneIsolation,isolation,isolatedEvaluate,transition}',context);
 return{context,renderer,facts,mutations,files,report,driver:context.driver,vaultPath};
}

for(const sample of [
 {name:'isolated Small',ids:[1],current:1},
 {name:'destroyed extra window',ids:[1,2],current:1,destroyed:2},
 {name:'multiple live windows',ids:[1,2],current:1,reject:true},
 {name:'wrong current window ID',ids:[1],current:2,reject:true},
 {name:'no native window',ids:[],current:1,reject:true},
 {name:'wrong vault',ids:[1],current:1,vault:'personal',reject:true},
 {name:'wrong selected path',ids:[1],current:1,path:'C:/other/kplex-test-small',reject:true},
])test('phone emulation actual-source isolation guards '+sample.name+' before geometry and mode writes',async()=>{
 const fixture=phoneDriverFixture(sample),geometry=()=>fixture.driver.isolatedEvaluate('require("@electron/remote").getCurrentWindow().setContentSize(390,844);return JSON.stringify({changed:true});','geometry acceptance');
 if(sample.reject){assert.throws(geometry,/isolated selected Small BrowserWindow/);await assert.rejects(fixture.driver.transition(true,'mode acceptance'),/isolated selected Small BrowserWindow/);assert.deepEqual(fixture.mutations,[],'A rejected native proof must precede every mutator');}
 else{assert.equal(geometry().changed,true);await fixture.driver.transition(true,'mode acceptance');assert.deepEqual(fixture.mutations,[['geometry',390,844],['emulate',true]]);assert.equal(fixture.report.isolation.length,3);}
});

test('phone emulation actual cleanup preserves recovery and refuses reload/configuration writes after isolation is lost',async()=>{
 const fixture=phoneDriverFixture(),nativeRecovery='original native layout/settings',configurationRecovery='original configuration bytes';
 fixture.files.set(fixture.report.recoveryInputs.native,nativeRecovery);fixture.files.set(fixture.report.recoveryInputs.configuration,configurationRecovery);
 fixture.driver.isolation('initial isolated proof');fixture.renderer.app.isMobile=true;fixture.facts.ids.push(2);
 const outer=phoneDriver.statements.find(node=>ts.isTryStatement(node)&&node.finallyBlock);
 assert(outer?.finallyBlock,'Actual phone driver restoration block');let releases=0;
 Object.assign(fixture.context,{mutated:true,baseline:{mobile:false},settled:true,restored:false,configuration:[{path:'plugin/data.json',bytes:Buffer.from('original')}],
  process:{exitCode:0},lock:{release:()=>{releases++;}},wait:async()=>{},existsSync:()=>true,readFileSync:()=>{throw Error('Configuration must not be read/replaced after lost isolation')},unlinkSync:()=>{throw Error('Configuration must not be deleted after lost isolation')}});
 fixture.files.set('plugin/data.json','current mobile-mode bytes');
 await runInNewContext('(async()=>'+outer.finallyBlock.getText(phoneDriver)+')()',fixture.context);
 assert.deepEqual(fixture.mutations,[],'Lost cleanup isolation must never call app.emulateMobile or a geometry mutator');
 assert.equal(fixture.renderer.app.isMobile,true,'Pending restoration must preserve the current emulation mode');
 assert.equal(fixture.files.get('plugin/data.json'),'current mobile-mode bytes','Wrong-mode configuration must remain untouched');
 assert.equal(fixture.files.get(fixture.report.recoveryInputs.native),nativeRecovery);assert.equal(fixture.files.get(fixture.report.recoveryInputs.configuration),configurationRecovery);
 assert.equal(fixture.report.status,'failed');assert.equal(fixture.report.configurationBytesRestored,false);assert.equal(fixture.report.pendingRestoration.preserveFixtures,true);
 assert.equal(fixture.report.pendingRestoration.recoveryInputs,fixture.report.recoveryInputs);assert.match(fixture.report.pendingRestoration.reason,/isolated selected Small BrowserWindow/);
 assert.equal(fixture.context.process.exitCode,1);assert.equal(releases,1,'The Node owner must release only its own lock after recording pending restoration');
});

test('phone emulation actual setup opens and owns a palette canvas before the deferred current-index fence',async()=>{
 const phone=phoneDriver.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='phone');assert(phone?.body);
 const helperNames=new Set(['own','tabs','command','explicitTab']);
 const helpers=phone.body.statements.filter(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(declaration=>helperNames.has(declaration.name.getText(phoneDriver)))).map(node=>node.getText(phoneDriver)).join('\n');
 const phase=phone.body.statements.find(node=>ts.isTryStatement(node));assert(phase,'Actual phone fixture phase');
 const indexFence=phase.tryBlock.statements.findIndex(node=>node.getText(phoneDriver).includes('await f.initialize()'));assert(indexFence>=0,'Actual fixture current-index fence');
 const setup=phase.tryBlock.statements.slice(0,indexFence+1).map(node=>node.getText(phoneDriver)).join('\n');
 const events=[],leaves=[],owned=[];let indexReady=false;
 const workspace={getLeavesOfType:type=>type==='k-plex-react-view'?leaves:[],getLeafById:id=>leaves.find(leaf=>leaf.id===id)??null};
 const app={commands:{commands:{'k-plex:kplex-start':{checkCallback(checking){events.push(checking?'palette availability':'palette execute');if(!checking&&!leaves.length)leaves.push({id:'owned-phone-tab',view:{getViewType:()=>'k-plex-react-view',waitUntilReady:async()=>{events.push('native canvas ready');indexReady=true;}}});return true;}}}}};
 const f={leaves:owned,check:(condition,message)=>assert.ok(condition,message),until:async(predicate,message)=>assert.ok(predicate(),message),initialize:async()=>{events.push('current index fence');assert(indexReady,'Markdown-only startup remains deferred until its actual canvas is ready');}};
 await runInNewContext('(async()=>{'+helpers+'\n'+setup+'})()',{app,f,workspace});
 assert.deepEqual(events,['palette availability','palette execute','native canvas ready','current index fence']);
 assert.equal(owned.length,1);assert.equal(owned[0],leaves[0],'The startup palette canvas must remain under normal fixture cleanup ownership');
});

test('phone emulation actual setup opens its native Markdown anchor before detaching an original-only Plex group',async()=>{
 const phone=phoneDriver.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='phone'),phase=phone?.body?.statements.find(ts.isTryStatement);assert(phase);
 const statements=phase.tryBlock.statements,start=statements.findIndex(node=>node.getText(phoneDriver).startsWith('let mainSeed')),detach=statements.findIndex(node=>node.getText(phoneDriver).includes('[...tabs(),...sidebars()]')&&node.getText(phoneDriver).includes('leaf.detach()'));
 assert(start>=0&&detach>start,'The actual fixture must create/open the native anchor before clearing Plex surfaces');
 const setup=statements.slice(start,detach+1).map(node=>node.getText(phoneDriver)).join('\n');
 const helpers=phone.body.statements.filter(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(declaration=>['own','tabs'].includes(declaration.name.getText(phoneDriver)))).map(node=>node.getText(phoneDriver)).join('\n');
 const document={},events=[],group={children:[]},a={path:'owned/Phone tab A.md'},owned=[];
 const original={parent:group,view:{containerEl:{ownerDocument:document},getViewType:()=>'k-plex-react-view'},detach(){events.push('detach original Plex');group.children.splice(group.children.indexOf(this),1);}};group.children.push(original);owned.push(original);
 const workspace={iterateAllLeaves:visit=>group.children.forEach(visit),getLeavesOfType:type=>group.children.filter(leaf=>leaf.view.getViewType()===type),
  getLeaf:()=>{throw Error('A native main-group anchor must not rely on getLeaf after the last Plex closes');},
  createLeafInParent(parent,index){assert.equal(parent,group);assert.equal(index,1);assert.equal(parent.children[0],original,'The original-only native group must still exist');events.push('create native anchor');const leaf={parent,view:{getViewType:()=>'empty'},openFile:async(file,state)=>{assert.equal(file,a);assert.equal(state.active,true);assert.equal(state.state.mode,'source');events.push('open native Markdown');leaf.view={file,getViewType:()=>'markdown'};}};parent.children.splice(index,0,leaf);return leaf;}};
 const anchor=await runInNewContext('(async()=>{'+helpers+'\n'+setup+'\nreturn anchor})()',{f:{leaves:owned,check:(condition,message)=>assert.ok(condition,message)},workspace,document,a});
 assert.deepEqual(events,['create native anchor','open native Markdown','detach original Plex']);assert.equal(anchor.parent,group);assert.equal(anchor.view.file,a);assert.deepEqual(group.children,[anchor]);assert.equal(owned[1],anchor,'The actual native anchor remains owned for cleanup and later tab switching');
});

test('phone emulation actual serialized restoration loads both exact deferred leaves before registered view readiness',async()=>{
 const phone=phoneDriver.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='phone'),phase=phone?.body?.statements.find(ts.isTryStatement);
 const orientation=phase?.tryBlock.statements.find(node=>ts.isForOfStatement(node)&&node.getText(phoneDriver).includes('Phone serialized native views restored'));assert(orientation&&ts.isBlock(orientation.statement));
 const statements=orientation.statement.statements,start=statements.findIndex(node=>node.getText(phoneDriver).includes('await workspace.changeLayout(serialized)')),end=statements.findIndex(node=>node.getText(phoneDriver).includes('Serialized native independent centers restored'));assert(start>=0&&end>start,'Actual native restore/readiness stage');
 const stage=statements.slice(start,end+1).map(node=>node.getText(phoneDriver)).join('\n'),events=[],owned=[],a={path:'Tab A.md'},b={path:'Sidebar B.md'};
 const serialized=Object.freeze({main:Object.freeze({id:'saved-tab'}),right:Object.freeze({id:'saved-sidebar'})});
 const deferred=(id,type,center)=>{const session=Object.freeze({centerPath:center}),leaf={id,isDeferred:true,session,
  view:{get waitUntilReady(){throw Error('DeferredView has no registered Plex readiness method');}},
  setViewState:()=>{throw Error('The actual saved leaf must not be reinitialized or receive replacement state');},
  async loadIfDeferred(){events.push('load '+id);this.isDeferred=false;this.view={getViewType:()=>type,waitUntilReady:async()=>{events.push('ready '+id);}};}};return leaf;};
 const restoredTab=deferred('saved-tab','k-plex-react-view',a.path),restoredSidebar=deferred('saved-sidebar','k-plex-sidepanel-view',b.path);let restored=false;
 const workspace={changeLayout:async value=>{assert.equal(value,serialized,'Restore the exact captured native layout');events.push('change saved layout');restored=true;}};
 const result=await runInNewContext('(async()=>{let tab={id:"retired-tab"},sidebar={id:"retired-sidebar"};'+stage+';return {tab,sidebar}})()',{
  workspace,serialized,own:leaf=>{owned.push(leaf);return leaf;},tabs:()=>restored?[restoredTab]:[],sidebars:()=>restored?[restoredSidebar]:[],a,b,
  f:{until:async(predicate,label)=>{assert(predicate(),label);},p:{documentSession:leaf=>leaf.session}}});
 assert.deepEqual(events,['change saved layout','load saved-tab','load saved-sidebar','ready saved-tab','ready saved-sidebar']);
 assert.equal(result.tab,restoredTab);assert.equal(result.sidebar,restoredSidebar);assert.deepEqual(owned,[restoredTab,restoredSidebar]);assert.equal(restoredTab.session.centerPath,a.path);assert.equal(restoredSidebar.session.centerPath,b.path);
});

test('native batch startup keeps global authority by default and admits only explicitly settled On-demand routing',async()=>{
 const path=new URL('../scripts/testing/obsidian/nativeBatch270.mjs',import.meta.url),source=ts.createSourceFile(path.pathname,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const factory=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='nativeBatch270');
 const declaration=factory?.body?.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]).find(node=>node.name.getText(source)==='initialize');assert(declaration?.initializer,'Actual native fixture initialization helper');
 const local='Settled local On-demand routing startup',global='Closed startup source inventory';
 for(const sample of [
  {name:'default closed Eager',onDemand:false,dependencies:true,scope:'global-source-authority'},
  {name:'default local On-demand cannot substitute for global authority',onDemand:true,dependencies:false,blocked:global},
  {name:'truthy string does not opt in',onDemand:true,dependencies:false,optIn:'true',blocked:global},
  {name:'explicit settled local On-demand',onDemand:true,dependencies:false,optIn:true,scope:'local-on-demand-routing'},
  {name:'opt-in Eager still requires global authority',onDemand:false,dependencies:false,optIn:true,blocked:global},
  {name:'local pending semantic work',onDemand:true,dependencies:false,optIn:true,semanticPending:true,blocked:local},
  {name:'local active semantic work',onDemand:true,dependencies:false,optIn:true,semanticActive:true,blocked:local},
  {name:'local pending source work',onDemand:true,dependencies:false,optIn:true,source:{pendingKnown:1},blocked:local},
  {name:'local active source work',onDemand:true,dependencies:false,optIn:true,source:{sourceActive:1},blocked:local},
  {name:'local pending native resolution',onDemand:true,dependencies:false,optIn:true,resolutionPending:true,blocked:local},
  {name:'local active native/index work',onDemand:true,dependencies:false,optIn:true,status:{activeWork:true},blocked:local},
 ]){
  const waits=[],created=[],activity={pendingKnown:0,knownImpactTasks:0,sourceActive:0,repoWrites:0,repoDeleteTask:0,...sample.source};
  const acquisition={inventory:null,hasSemanticDependencies:()=>sample.dependencies,getActivityState:()=>activity,pendingResolutionKeys:new Set(sample.resolutionPending?['pending']:[])};
  const plugin={initialIndexComplete:true,settings:{},saveSettings:async()=>{},getIndexStatus:()=>({upToDate:true,activeWork:false,...sample.status}),
   index:{sourceAcquisition:acquisition,isOnDemandMode:()=>sample.onDemand,isBuilding:()=>false,hasActiveSemanticPreparation:()=>Boolean(sample.semanticActive),hasPendingSemanticPreparation:()=>Boolean(sample.semanticPending),hasActiveSourcePreparation:()=>activity.sourceActive>0}};
  const c={allowOnDemandRoutingStartup:sample.optIn,sessions:()=>({off:async()=>{}})};
  const context={plugin,c,main:{setMinimumSize(){},setContentSize(){}},focus:async()=>{},document:{},folder:'owned-startup-fixture',
   app:{vault:{createFolder:async path=>{created.push(path);return{path}}}},until:async(predicate,label,deadline)=>{assert.equal(deadline,120000,'Existing startup deadlines stay strict');waits.push(label);if(!predicate())throw Error(label)}};
  const initialized=runInNewContext('(async()=>{let directory;const initialize='+declaration.initializer.getText(source)+';await initialize();return directory})()',context);
  if(sample.blocked){await assert.rejects(initialized,error=>error.message===sample.blocked,sample.name);assert.deepEqual(created,[],sample.name+' must not proceed to fixture writes');assert.equal(c.startupEvidence,undefined);}
  else{assert.equal((await initialized).path,'owned-startup-fixture');assert.deepEqual(created,['owned-startup-fixture']);assert.equal(c.startupEvidence.scope,sample.scope);assert.equal(c.startupEvidence.globalDependenciesReady,sample.dependencies);}
  assert.equal(waits[0],'Initial current index',sample.name+' retains the initial current-index fence');
 }
});

/** Synchronous scalar counting must preserve exact product results and require no timing/encoding globals. */
test("lightweight indexing observations preserve original promises, receivers, throws and inherited methods", async () => {
  const parsed=Promise.resolve({complete:true}),digested=Promise.resolve("digest"),transaction=Promise.resolve("rows"),failure=new Error("original parser failure");
  const parser=Object.create({/** Return or throw the same fixture identity under its original receiver. */ parse(text){assert.equal(this,parser);if(text==="fail")throw failure;return parsed;}});
  const runtime=Object.create({/** A digest wrapper must forward its string and existing promise unchanged. */ digest(text){assert.equal(this,runtime);assert.equal(text,"hash me");return digested;}});
  const repository=Object.create({/** Storage observation must preserve receiver and transaction mode. */ transaction(...args){assert.equal(this,repository);assert.equal(args[2],"readonly");return transaction;}});
  repository.runtime=runtime;
  const index={metadataParser:parser,sourceAcquisition:{repository}};
  // The injected native observer must work without timers, performance, TextEncoder or Node globals.
  const probe=runInNewContext(`(${createLightweightIndexingProbe.toString()})(index)`,{index});
  assert.equal(parser.parse("body"),parsed);assert.equal(runtime.digest("hash me"),digested);
  assert.equal(repository.transaction(null,["sourceHeads"],"readonly"),transaction);
  assert.throws(/** Exercise the instrumented synchronous failure path. */ ()=>parser.parse("fail"),
    /** The observer must retain the original exception identity. */ error=>error===failure);
  probe.sample({heapUsed:12,rss:24});const observed=JSON.parse(JSON.stringify(probe.snapshot()));
  assert.deepEqual(observed.parser,{calls:2,utf16Units:8});assert.deepEqual(observed.hashing,{calls:1,utf16Units:7});
  assert.deepEqual(observed.transactions,{calls:1,readonly:1,readwrite:0,other:0});
  assert.equal(observed.heapMaximum,12);assert.equal(observed.rssMaximum,24);
  probe.stop();probe.stop();
  assert.equal(Object.hasOwn(parser,"parse"),false);assert.equal(Object.hasOwn(runtime,"digest"),false);assert.equal(Object.hasOwn(repository,"transaction"),false);
  parser.parse("after stop");assert.equal(probe.snapshot().parser.calls,2);
  await Promise.all([parsed,digested,transaction]);
});

test("native fixture session tools disable explicit owners and serialize only native scalar state through lexical probes",async()=>{
  const calls=[],a={id:"A",view:{documentSession:{ownerId:"A"},getViewType:()=>"k-plex-react-view",getState:()=>({plexSession:{version:1,ownerId:"A",centerPath:"A.md"}})}},b={id:"B",view:{getViewType:()=>"k-plex-sidepanel-view",getState:()=>({plexSession:{version:1,ownerId:"B",centerPath:"B.md"}})}};
  const plugin={app:{workspace:{getLeafById:id=>id==="A"?a:id==="B"?b:null,getLeavesOfType:type=>type==="k-plex-react-view"?[a]:[b]}},settings:{documentSyncMode:"pinned"},setDocumentSyncMode:async(host,mode)=>calls.push([host,mode])};
  const tools=nativeDocumentSessions(plugin);await tools.off();assert.deepEqual(calls,[[a,"off"],[b,"off"]]);assert.equal(plugin.settings.documentSyncMode,"off");
  const context={plugin};const result=runInNewContext(withNativeDocumentSessions("(()=>{const later=()=>documentSessions(plugin).capture();return later()})()"),context);
  assert.deepEqual(JSON.parse(JSON.stringify(result)),tools.capture());assert.equal(context.documentSessions,undefined,"No renderer maintenance global may leak");
  assert(!JSON.stringify(result).includes("footprints"));
  assert.deepEqual(tools.capture().map(value=>value.id),["A","B"],"Deferred native shells have no documentSession; use verified native identity");
});

test("native gate setup binds foreground-only pages into the canonical patch baseline", () => {
  const source = readFileSync(new URL("../scripts/testing/obsidian/interactionGateCounts.mjs", import.meta.url), "utf8");
  const start = source.indexOf("c.fixtureBindings=[];");
  const end = source.indexOf("c.setupAttempts=[];", start);
  assert(start >= 0 && end > start, "Actual native fixture-binding block missing");
  const files = new Map(["Published.md", "Foreground.md", "Absent.md"].map(path => [path, {path}]));
  const published = {file: files.get("Published.md")};
  const pages = new Map([["Published.md", published]]);
  const foreground = {file: files.get("Foreground.md")};
  const inserted = [];
  const index = {
    state: {pages},
    get: path => pages.get(path) ?? (path === "Foreground.md" ? foreground : undefined),
    /** Match the existing insertion owner's idempotent exact-file identity contract. */
    insertCreatedFile(file) {
      inserted.push(file.path);
      if (pages.get(file.path)?.file !== file) pages.set(file.path, {file});
      return pages.get(file.path);
    },
  };
  const c = {check: (condition, message) => assert.ok(condition, message)};
  runInNewContext(source.slice(start, end), {ownedMarkdown: [...files.keys()], p: {index}, app: {vault: {getFileByPath: path => files.get(path)}}, c});
  assert.deepEqual(inserted, [...files.keys()]);
  assert.equal(pages.get("Published.md"), published, "An existing canonical page must remain intact");
  assert.deepEqual(JSON.parse(JSON.stringify(c.fixtureBindings[1])), {
    path: "Foreground.md", canonicalBefore: false, readableBefore: true, canonicalAfter: true,
  });
  assert([...files].every(([path, file]) => pages.get(path)?.file === file));
});

test("native theme helpers wrap chainable Obsidian Settings instead of assimilating their then method", async () => {
  const source = ts.createSourceFile("colorStyling.mjs", readFileSync(new URL("../scripts/testing/obsidian/colorStyling.mjs", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let initializer;
  /** Extract the actual native helper; a second implementation would miss this Promise boundary. */
  const visit = node => {if (ts.isVariableDeclaration(node) && node.name.getText(source) === "openVisual") initializer = node.initializer.getText(source); ts.forEachChild(node, visit);};
  visit(source); assert(initializer);
  let thenCalls = 0;
  const setting = {settingEl: {isConnected: true}, controlEl: {querySelector: () => ({})},
    /** Mirror the installed Setting.then chaining contract, with a finite failure if accidentally assimilated. */
    then(callback) {if (++thenCalls > 3) throw new Error("Native Setting was assimilated"); callback(this); return this;}};
  const c = {themeNativeRow: setting}, app = {setting: {isOpen: false, close() {this.isOpen = false;}}};
  const environment = {app, c, wait: async () => {}, native: {show() {}, focus() {}, webContents: {focus() {}}},
    document: {hidden: false, hasFocus: () => true}, p: {openSettings() {app.setting.isOpen = true;}, translator: value => value},
    tab: {containerEl: {isConnected: true}, openSettingsPage: () => true}, check: assert,
    until: async predicate => {assert(predicate());}};
  const openVisual = runInNewContext(`(${initializer})`, environment);
  const handle = await openVisual(); assert.equal(handle.setting, setting); assert.equal(thenCalls, 0);
});

test("retained-memory probe rejects unapproved targets before native access", /** Keep observations inside explicit disposable-vault scope. */ async () => {
  const app={vault:{getName:/** Refuse this synthetic unapproved target. */ ()=>"unapproved"}};
  await assert.rejects(startupRetainedMemory(app,"unapproved"),/Explicit disposable vault/);
  await assert.rejects(startupRetainedMemory(app,"kplex-test-small"),/Explicit disposable vault/);
});

test("startup cache identities distinguish payload changes, source ABA and interrupted selections", /** Test observation identities; native IDB behavior is exercised by disposable-vault identity trials. */ async () => {
  const state = { sequence: 3, meta: { key: "active", schema: 3, generation: "first", createdAt: 1,
    vaultSignature: "physical", settingsSignature: "policy", discoveredFields: [] },
    pages: [{ path: "private-test-owner.md", relations: [{ targetPath: "other.md" }] }],
    evidence: [{ sourcePath: "private-test-owner.md", targetPath: "other.md", direction: "positive" }],
    heads: [{ sourceId: "private-test-owner.md", sourceRevision: "selected-one", sequence: 3 }], invalid: 0 };
  const cache = {
    /** Deliver readonly transaction completion after its original request success. */
    async open() { return { transaction() {
      const tx = new EventTarget();tx.objectStore = /** Model only this observation's native sequence request. */ () => ({ get() {
        const request = new EventTarget();
        queueMicrotask(/** Complete one scalar transaction without retaining source payloads. */ () => {
          request.result = { key: "source-sequence", value: state.sequence };
          request.dispatchEvent(new Event("success"));tx.dispatchEvent(new Event("complete"));
        });return request;
      } });return tx;
    } }; },
    /** Return independent pointer metadata, like the real cache boundary. */
    async readSnapshotMeta() { return structuredClone(state.meta); },
    /** Forward ordered graph records without materializing a second graph. */
    async iterateSnapshotPages(_meta, visit) { for (const row of state.pages) visit(row);return true; },
    /** Preserve negative evidence and duplicate declaration contributions. */
    async iterateSnapshotEvidence(_meta, visit) { for (const row of state.evidence) visit(row);return true; },
    sources: { /** Finish one selected-head page followed by its real end marker. */
      async headPage(after) { return { available: true, heads: after === null ? state.heads : [], invalid: state.invalid,
        next: after === null ? "end" : null }; } },
  };
  const first = await startupCacheIdentity(cache, createHash);
  assert(!JSON.stringify(first).includes("private-test-owner.md"));
  state.meta.generation = "second";state.meta.createdAt = 2;
  const second = await startupCacheIdentity(cache, createHash);
  assert.deepEqual(second.graph, first.graph, "Activation metadata cannot manufacture a graph difference");
  assert.notDeepEqual(second.activation, first.activation);
  state.evidence.push({ ...state.evidence[0], direction: "negative" });
  const changed = await startupCacheIdentity(cache, createHash);
  assert.notEqual(changed.graph.evidence.sha256, first.graph.evidence.sha256);
  assert.equal(changed.graph.evidence.records, 2, "Multiplicity is retained");
  state.heads[0].sourceRevision = "different-incarnation";
  assert.notEqual((await startupCacheIdentity(cache, createHash)).sources.heads.sha256, first.sources.heads.sha256,
    "A reused sequence cannot conceal a different source incarnation");
  const pages = cache.iterateSnapshotPages;
  cache.iterateSnapshotPages = /** Simulate a real writer crossing an asynchronous cache read. */ async (...args) => { state.sequence++;return pages(...args); };
  await assert.rejects(startupCacheIdentity(cache, createHash), /Input selection changed/);
  cache.iterateSnapshotPages = pages;state.invalid = 1;
  await assert.rejects(startupCacheIdentity(cache, createHash), /Unreadable source/);
  state.invalid=0;
  state.pages[0].semanticSignature='canonical-original';
  state.heads[0].state='complete';state.heads[0].physical={path:'private-test-owner.md'};
  state.pages.push({path:'second-test-owner.md',semanticSignature:'canonical-second',relations:[]});
  state.heads.push({sourceId:'second-test-owner.md',sourceRevision:'selected-two',sequence:3,state:'complete',physical:{path:'second-test-owner.md'}});
  const fingerprints=new Map([['private-test-owner.md','canonical-original'],['second-test-owner.md','canonical-second']]);
  const semantic=await startupCacheIdentity(cache,createHash,fingerprints);
  assert.equal(semantic.semanticInputs.records,2);
  state.pages.reverse();
  const reordered=await startupCacheIdentity(cache,createHash,new Map([...fingerprints].reverse()));
  assert.deepEqual(reordered.semanticInputs,semantic.semanticInputs,'Input identity ignores live map and saved-page traversal order');
  assert.notDeepEqual(reordered.graph.pages,semantic.graph.pages,'Raw stored-record ordering remains visible');
  const order=[...fingerprints.keys()];
  const replay=await startupCacheIdentity(cache,createHash,fingerprints,()=>true,()=>order);
  const reversedReplay=await startupCacheIdentity(cache,createHash,fingerprints,()=>true,()=>[...order].reverse());
  assert.deepEqual(replay.semanticInputs,reversedReplay.semanticInputs,'Per-owner equality stays independently visible');
  assert.notDeepEqual(replay.hostReplayInputs,reversedReplay.hostReplayInputs,'Actual compiler encounter order remains a distinct input');
  let selections=0;
  await assert.rejects(startupCacheIdentity(cache,createHash,fingerprints,()=>true,()=>++selections===1?order:[...order].reverse()),/Host replay order changed/);
  state.meta.discoveredFields=[['later',{name:'Later',count:1}]];
  const discovery=await startupCacheIdentity(cache,createHash,fingerprints);
  assert.deepEqual(discovery.configuration,semantic.configuration,'Derived discovery order/content stays distinct from semantic settings identity');
  assert.notDeepEqual(discovery.graph.policy,semantic.graph.policy,'Raw policy metadata changes remain preserved');
  fingerprints.set('private-test-owner.md','different');
  await assert.rejects(startupCacheIdentity(cache,createHash,fingerprints),/Live fingerprints do not match/);
  fingerprints.set('private-test-owner.md','canonical-original');
  state.heads[0].state='tombstone';
  await assert.rejects(startupCacheIdentity(cache,createHash,fingerprints),/lack complete source-head coverage/);
  await assert.rejects(startupCacheIdentity(cache,createHash,fingerprints,/** Represent a retired live graph inspection. */ ()=>false),/Input selection changed/);
});

test("Windows large eval preserves literal code and retires its temporary script on success/failure", () => {
  const code = 'JSON.stringify({quoted:"literal \\\"quotes\\\"",path:"C:\\\\fixture",lines:"a\\nb"})' + " ".repeat(40_000);
  const options = { timeout: 30_000, encoding: "utf8" };
  let path;
  const spawn = (file, args, passedOptions) => {
    assert.equal(file, "Obsidian.com"); assert.equal(passedOptions, options);
    assert.equal(args[0], "vault=kplex-test-small"); assert.equal(args[1], "eval");
    assert(args[2].length < 1000);
    const require = createRequire(import.meta.url);
    const read = require("node:fs").readFileSync;
    const payload = runInNewContext(args[2].slice(5), { require: () => ({ readFileSync: (script, encoding) => {
      path = script; return read(script, encoding);
    } }) });
    assert.equal(payload, runInNewContext(code));
    return { status: 0, stdout: payload };
  };
  assert.equal(spawnNativeSync("Obsidian.com", ["vault=kplex-test-small", "eval", `code=${code}`], options, { platform: "win32", spawn }).status, 0);
  assert.equal(existsSync(path), false);
  assert.throws(() => spawnNativeSync("Obsidian.com", ["vault=kplex-test-small", "eval", `code=${code}`], options, {
    platform: "win32", spawn: (...args) => { spawn(...args); throw new Error("transport failed"); },
  }), /transport failed/);
  assert.equal(existsSync(path), false);
});

test("short Windows and large macOS commands keep argument/result identity", () => {
  for (const [platform, code] of [["win32", "true"], ["darwin", " ".repeat(40_000) + "true"]]) {
    const args = ["vault=kplex-test-small", "eval", `code=${code}`], options = {}, result = { status: 0 };
    assert.equal(spawnNativeSync("obsidian", args, options, { platform, spawn: (file, forwarded, passedOptions) => {
      assert.equal(forwarded, args); assert.equal(passedOptions, options); return result;
    } }), result);
  }
});

test("Windows multiline controllers use a single-line transport even when the code is short", () => {
  const source = '(\n()=>JSON.stringify({ok:true})\n)()';
  const result = spawnNativeSync("Obsidian.com", ["vault=kplex-test-small", "eval", `code=${source}`], {}, {
    platform: "win32", spawn: (file, args) => {
      assert(!/[\r\n]/.test(args[2]));
      return runInNewContext(args[2].slice(5), { require: createRequire(import.meta.url) });
    },
  });
  assert.equal(result, '{"ok":true}');
});

test("desktop CLI discovery honors overrides and selects Windows console and macOS launchers", () => {
  const env = { PROGRAMFILES: "C:/Program Files", LOCALAPPDATA: "C:/Users/Test/AppData/Local" };
  const console = join(env.PROGRAMFILES, "Obsidian", "Obsidian.com");
  assert.equal(obsidianCliExecutable(env, "win32", path => path === console), console);
  assert.equal(obsidianCliExecutable({ KPLEX_OBSIDIAN_CLI: "custom cli" }, "win32", () => false), "custom cli");
  assert.equal(obsidianCliExecutable({}, "darwin", () => true), "/Applications/Obsidian.app/Contents/MacOS/obsidian-cli");
  assert.equal(obsidianCliExecutable({}, "linux", () => false), "obsidian");
});

test("portable verification invokes npm-cli.js with the same Node and preserves spaces", () => {
  const npm = "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js", node = "C:/Program Files/nodejs/node.exe";
  assert.deepEqual(npmInvocation({ npm_execpath: npm }, node, path => path === npm), { file: node, args: [npm, "run", "verify"] });
  assert.deepEqual(npmInvocation({ npm_execpath: npm }, node, path => path === npm, "build:local"), { file: node, args: [npm, "run", "build:local"] });
  assert.throws(() => npmInvocation({ npm_execpath: npm }, node, path => path === npm, "arbitrary"), /Unsupported native preparation/);
  const adjacent = join("C:/tools", "node_modules", "npm", "bin", "npm-cli.js");
  assert.equal(npmInvocation({}, "C:/tools/node.exe", path => path === adjacent).args[0], adjacent);
  assert.throws(() => npmInvocation({}, node, () => false), /Cannot locate npm-cli.js/);
});

test("browser discovery supports Windows Edge and explicit paths without silent fallback", () => {
  const env = { "PROGRAMFILES(X86)": "C:/Program Files (x86)" };
  const edge = join(env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe");
  assert.equal(browserExecutable(env, "win32", path => path === edge), edge);
  assert.equal(browserExecutable({ KPLEX_TEST_BROWSER: "missing custom browser" }, "win32", () => false), "missing custom browser");
  assert.equal(browserExecutable({}, "linux", () => false), null);
});

test("native wait probe preserves exact promise/value/rejection identity and counts completion", async () => {
  let time = 0, resolve;
  const probe = createWaitTimingProbe({ now: () => time, phase: () => "source:checking" });
  const original = new Promise(done => { resolve = done; });
  assert.equal(probe.observe("yield", "timer", () => original), original);
  time = 5; resolve("same result"); assert.equal(await original, "same result");
  const reason = new Error("same rejection"), rejected = Promise.reject(reason);
  assert.equal(probe.observe("transaction", "readonly:sourceHeads", () => rejected), rejected);
  time = 8; await assert.rejects(rejected, error => error === reason);
  assert.equal(probe.observe("digest", "sha256", () => 42), 42);
  assert.throws(() => probe.observe("transaction", "throw", () => { throw reason; }), error => error === reason);
  const report = probe.stop(), rows = Object.values(report.groups);
  assert.equal(rows.reduce((n, row) => n + row.calls, 0), 4);
  assert.equal(rows.reduce((n, row) => n + row.completed, 0), 4);
  assert.equal(rows.reduce((n, row) => n + row.rejected, 0), 2);
  assert.equal(rows.reduce((n, row) => n + row.synchronousThrows, 0), 1);
  assert.deepEqual(report.active, [0, 0, 0]);
});

test("native wait probe separates overlapping intervals and real phase transitions", async () => {
  let time = 0, phase = "source:host", resolveTransaction, resolveYield;
  const probe = createWaitTimingProbe({ now: () => time, phase: () => phase });
  const transaction = new Promise(done => { resolveTransaction = done; });
  const yielding = new Promise(done => { resolveYield = done; });
  probe.observe("transaction", "readonly:sourceChunks", () => transaction);
  time = 1; probe.observe("yield", "timer", () => yielding);
  time = 3; probe.checkpoint(); phase = "source:reconciliation"; probe.checkpoint();
  time = 4; resolveYield(); await yielding;
  time = 5; resolveTransaction(); await transaction;
  time = 6; const report = probe.stop();
  assert.deepEqual(report.phases["source:host"].membershipMs, [0, 0, 1, 2, 0, 0, 0, 0]);
  assert.deepEqual(report.phases["source:reconciliation"].membershipMs, [1, 0, 1, 1, 0, 0, 0, 0]);
  assert.equal(Object.values(report.phases).reduce((n, row) => n + row.elapsedMs, 0), 6);
  const sums = Object.values(report.groups).reduce((n, row) => n + row.totalMs, 0);
  assert.equal(sums, 8, "Inclusive promise durations overlap; union is only five milliseconds");
});

test("native wait probe freezes pending observations on retirement and detaches snapshots", async () => {
  let time = 0, resolve;
  const probe = createWaitTimingProbe({ now: () => time, phase: () => "source:host" });
  const original = new Promise(done => { resolve = done; });
  probe.observe("yield", "timer", () => original);
  time = 2; const stopped = probe.stop(), saved = JSON.stringify(stopped);
  assert.equal(Object.values(stopped.groups)[0].pending, 1);
  time = 10; resolve(); await original; probe.checkpoint();
  assert.equal(JSON.stringify(probe.snapshot()), saved, "Late completion cannot rewrite retired evidence");
  stopped.categories[0] = "changed"; Object.values(stopped.phases)[0].membershipMs[1] = 999;
  assert.equal(JSON.stringify(probe.snapshot()), saved, "Returned arrays cannot mutate private aggregates");
  assert.equal(probe.observe("yield", "timer", () => original), original, "Retired observer still forwards");
});

test("native wait probe bounds phase/group cardinality and keeps fixed latency histograms", () => {
  let time = 0, phase = "source:0";
  const probe = createWaitTimingProbe({ now: () => time, phase: () => phase });
  for (let i = 0; i < 1000; i++) {
    phase = "source:" + i;
    probe.observe("digest", "sha256", () => { time += i % 2 === 0 ? 0.2 : 9; });
  }
  const report = probe.stop();
  assert(Object.keys(report.phases).length <= 128); assert(Object.keys(report.groups).length <= 128);
  assert.equal(Object.values(report.groups).reduce((n, row) => n + row.histogram.reduce((a, b) => a + b, 0), 0), 1000);
  assert.equal(Object.values(report.groups).reduce((n, row) => n + row.pending, 0), 0);
  assert(Object.values(report.groups).every(row => row.histogram.length === report.upperBoundsMs.length));
});

test("native wait probe injection is self-contained in another JavaScript realm", async () => {
  const factory = runInNewContext("(" + createWaitTimingProbe.toString() + ")");
  let time = 0;
  const probe = factory({ now: () => time, phase: () => "source:host" });
  const original = Promise.resolve("value");
  assert.equal(probe.observe("yield", "timer", () => original), original);
  time = 2; await original;
  const report = probe.stop();
  assert.equal(report.groups["source:host:yield:timer"].totalMs, 2);
  assert.equal(report.phases["source:host"].membershipMs[1], 2);
});

async function fixture(fn) {
  const root = mkdtempSync(join(tmpdir(), "kplex-host-runner-test-"));
  const projectRoot = join(root, "project");
  const vaultPath = join(root, "kplex-test");
  const configDir = join(vaultPath, ".obsidian");
  const pluginDir = join(configDir, "plugins", "k-plex");
  const reportDir = join(root, "report");
  try {
    for (const dir of [join(projectRoot, "dist"), pluginDir]) mkdirSync(dir, { recursive: true });
    for (const [name, value] of Object.entries({
      "main.js": "new plugin bundle",
      "manifest.json": JSON.stringify({ id: "k-plex", version: "0.0.5" }),
      "styles.css": "new styles",
    })) writeFileSync(join(projectRoot, "dist", name), value);
    writeFileSync(join(pluginDir, "main.js"), "old plugin bundle");
    writeFileSync(join(pluginDir, "data.json"), "settings stay");
    writeFileSync(join(configDir, "community-plugins.json"), '["k-plex"]');
    return await fn({ root, projectRoot, vaultPath, configDir, pluginDir, reportDir, vaultName: "kplex-test" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function fakeCli(target, options = {}) {
  const calls = [];
  const runCli = (vault, command, ...args) => {
    calls.push([vault, command, ...args]);
    assert.equal(vault, "kplex-test");
    if (command === "version") return "1.14.2\n";
    if (command === "help") return "version vault plugin:disable plugin:enable commands command dev:dom dev:errors";
    if (command === "vault") return `${options.reportedVault ?? target.vaultPath}\n`;
    if (command === "commands") return "k-plex:kplex-start\n";
    if (command === "dev:dom") return args.includes("total") ? options.domCount ?? "1\n" : options.domText ?? "K-Plex Welcome";
    if (command === "dev:errors") return options.errors ?? "No errors captured\n";
    return "OK\n";
  };
  return { calls, runCli };
}

test("requires an explicit, existing named test vault and config", async () => {
  assert.throws(() => validateTarget({}), /Set KPLEX_TEST_/);
  await fixture((target) => assert.equal(validateTarget(target).vault, realpathSync(target.vaultPath)));
});

test("verifies exact artifacts, preserves data and reports rendered smoke success", async () => {
  await fixture(async (target) => {
    const cli = fakeCli(target);
    let verified = false;
    const report = await runObsidianVerification({ ...target, runCli: cli.runCli, runVerify: () => { verified = true; }, source: { revision: "test" } });
    assert.equal(report.status, "passed");
    assert.equal(verified, true);
    assert.equal(readFileSync(join(target.pluginDir, "main.js"), "utf8"), "new plugin bundle");
    assert.equal(readFileSync(join(target.pluginDir, "data.json"), "utf8"), "settings stay");
    assert.deepEqual(report.artifacts.sourceHashes, report.artifacts.stagedHashes);
    assert.equal(JSON.parse(readFileSync(join(target.reportDir, "report.json"), "utf8")).status, "passed");
    assert(cli.calls.findIndex((call) => call[1] === "plugin:disable") < cli.calls.findIndex((call) => call[1] === "plugin:enable"));
  });
});

test("vault mismatch or failed portable verification blocks staging and reports failure", async () => {
  await fixture(async (target) => {
    const other = join(target.root, "other-vault");
    mkdirSync(other);
    let built = false;
    const wrongVault = await runObsidianVerification({ ...target, runCli: fakeCli(target, { reportedVault: other }).runCli, runVerify: () => { built = true; } });
    assert.equal(wrongVault.status, "failed");
    assert.match(wrongVault.error, /CLI targets/);
    assert.equal(wrongVault.scenarios[0].id, "preflight");
    assert.equal(built, false);
    assert.equal(readFileSync(join(target.pluginDir, "main.js"), "utf8"), "old plugin bundle");
    const failedBuild = await runObsidianVerification({ ...target, runCli: fakeCli(target).runCli, runVerify: () => { throw new Error("build failed"); } });
    assert.equal(failedBuild.status, "failed");
    assert.match(failedBuild.error, /build failed/);
    assert.equal(failedBuild.scenarios[0].id, "portable-verify");
    assert.equal(readFileSync(join(target.pluginDir, "main.js"), "utf8"), "old plugin bundle");
  });
});

test("unavailable CLI fails strict preflight without touching the plugin", async () => {
  await fixture(async (target) => {
    const report = await runObsidianVerification({ ...target, runCli: () => { throw new Error("CLI unavailable"); }, runVerify: () => { throw new Error("must not build"); } });
    assert.equal(report.status, "failed");
    assert.equal(report.scenarios[0].id, "preflight");
    assert.match(report.error, /CLI unavailable/);
    assert.equal(readFileSync(join(target.pluginDir, "main.js"), "utf8"), "old plugin bundle");
    assert.equal(existsSync(join(target.reportDir, "report.json")), true);
  });
});

test("missing render and captured JavaScript errors fail with a written report", async () => {
  await fixture(async (target) => {
    let tick = 0;
    const report = await runObsidianVerification({
      ...target, runCli: fakeCli(target, { domCount: "0\n" }).runCli, runVerify: () => {},
      now: () => (tick += 1000), wait: async () => {},
    });
    assert.equal(report.status, "failed");
    assert.match(report.error, /rendered-state assertion timed out/);
    assert.equal(existsSync(join(target.reportDir, "report.json")), true);
  });
  await fixture(async (target) => {
    const report = await runObsidianVerification({ ...target, runCli: fakeCli(target, { errors: "TypeError: broken" }).runCli, runVerify: () => {} });
    assert.equal(report.status, "failed");
    assert.match(report.error, /JavaScript errors/);
  });
});

/** Native cleanup must compile before it can own fixture/settings/workspace restoration. */
test('Find setup, scenario and cleanup expressions compile with the actual native-session wrapper',async()=>{
 const {Script}=await import('node:vm');
 const {findEnhancementSetup,findEnhancementScenarios,findEnhancementCleanup}=await import('../scripts/testing/obsidian/uxFindEnhancements.mjs');
 for(const code of [findEnhancementSetup,findEnhancementScenarios,findEnhancementCleanup])assert.doesNotThrow(()=>new Script(withNativeDocumentSessions(code)));
});

/** Model orchestration only: real body acquisition and UI acceptance remain native assertions. */
function liveRestartFixture(failStart = false) {
  const events = [], report = {};let evaluations = 0, visibleDemand = false;
  const run = () => runLiveUpdatesForeground({report, vaultName: 'kplex-test-small', wait: async () => {},
    /** Opening normal demand after enablement is required before the real P3 hold can start. */
    cli(command, argument) {
      if (command === 'command') {
        assert.equal(argument, 'id=k-plex:kplex-start');assert.equal(events.at(-1), 'plugin:enable');
        events.push('open-demand');if (failStart) throw Error('start command failed');visibleDemand = true;
      } else {assert.equal(argument, 'id=k-plex');events.push(command);}
    },
    /** Preserve native cleanup completion independently of a failed startup command. */
    evaluate(code) {
      if (code.includes('cleanupStarted:true')) {events.push('cleanup-start');return {cleanupStarted: true};}
      if (code.includes('cleaned:window.__kplexForegroundLiveUpdates')) return {cleaned: {folderRemoved: true, filesRestored: true, cachedReadRestored: true}};
      if (code.includes('delete window.__kplexForegroundLiveUpdates')) {events.push('controller-removed');return {removed: true};}
      const step = evaluations++;
      if (step < 3) return {};
      if (step === 3) {assert(visibleDemand, 'A reloaded closed canvas cannot supply P3 demand');return {held: true};}
      if (step === 4) return {started: true};
      if (step === 5) return {done: true, value: {accepted: true}};
      throw Error('Unexpected foreground orchestration');
    }});
  return {run, report, events};
}

test('foreground restart reopens the registered K-Plex command before awaiting unrelated body work', async () => {
  const f = liveRestartFixture();assert.deepEqual(await f.run(), {accepted: true});
  assert.deepEqual(f.events.slice(0, 3), ['plugin:disable', 'plugin:enable', 'open-demand']);
  assert.equal(f.events.at(-1), 'controller-removed');
});

test('failed foreground startup still retires the controller and restores owned resources', async () => {
  const f = liveRestartFixture(true);await assert.rejects(f.run(), /start command failed/);
  assert.match(f.report.liveUpdatesError, /start command failed/);assert.equal(f.report.cleanup.cachedReadRestored, true);
  assert(f.events.includes('cleanup-start'));assert.equal(f.events.at(-1), 'controller-removed');
});

/** Native receipts must consume the actual persisted declaration DTO, rather than live evidence
 * property names. Execute real driver readers with rows emitted by the production serializer. */
test('authoring cache and application-restart receipts retain owned persisted declaration provenance',async()=>{
 const parse=path=>ts.createSourceFile(path,readFileSync(new URL('../'+path,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
 const declaration=(source,name)=>{const node=source.statements.find(value=>value.name?.text===name);assert(node,'Actual declaration '+name);return node.getText(source);};
 const relations=parse('src/core/graph/relations.ts'),exports={};
 new Function('exports',ts.transpileModule(declaration(relations,'LinkDirection')+'\n'+declaration(relations,'RelationType'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exports);
 const snapshot=parse('src/index/IndexSnapshot.ts'),snapshotExports={};
 new Function('exports','LinkDirection',ts.transpileModule(declaration(snapshot,'persistedDeclarationFromEvidence'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(snapshotExports,exports.LinkDirection);
 const a='__owned/A.md',b='__owned/B.md',outside='Outside.md';
 const persist=(by,target,extra={})=>snapshotExports.persistedDeclarationFromEvidence({sourcePath:target,targetPath:by,
  declaredByPath:by,declaredTargetPath:target,declaredRole:'right',relationType:exports.RelationType.DEFINED,
  direction:exports.LinkDirection.TO,sourceKind:'frontmatter-ontology',definition:'opposes302',fieldName:'Opposes302',...extra});
 const rows=[persist(a,b),persist(b,a,{fieldName:undefined}),persist(outside,b),persist(a,outside)],before=structuredClone(rows);
 assert.equal('declaredByPath' in rows[0],false,'Wire DTO contains sourcePath, not live declaration fields');
 assert.equal(rows[0].sourcePath,a,'Serializer retains the declaring owner independently of semantic orientation');
 const meta={generation:'actual-schema3-generation',createdAt:1,settingsSignature:'custom-policy',vaultSignature:'native-inputs'};
 const pages=[{path:a,semanticSignature:'a',relations:[{targetPath:b},{targetPath:outside}]},{path:b,semanticSignature:'b',relations:[]},{path:outside,semanticSignature:'outside'}];
 const cache={readSnapshotMeta:async()=>meta,
  iterateSnapshotPages:async(selected,visit,current)=>{assert.equal(selected,meta);for(const row of pages){if(!current())return false;visit(row);}return current();},
  iterateSnapshotEvidence:async(selected,visit,current)=>{assert.equal(selected,meta);for(const row of rows){if(!current())return false;visit(row);}return current();}};
 const driver=parse('scripts/testing/obsidian/authoringWorkspaceCache.mjs');
 const cacheFixture=new Function('return ('+declaration(driver,'cacheFixture')+');')();
 const f={p:{index:{indexedDb:cache}},check:(value,message)=>assert(value,message)};
 const result=await cacheFixture({}, {fixture:()=>f,closed:false}).saved([a,b]);
 assert.deepEqual(result.pages.map(row=>row.path),[a,b]);
 assert.deepEqual(result.pages[0].relations,[{targetPath:b}]);
 assert.deepEqual(result.evidence.map(row=>[row.declaredByPath,row.declaredTargetPath,row.field,row.role,row.relationType]),
  [[a,b,'Opposes302','right',exports.RelationType.DEFINED],[b,a,'opposes302','right',exports.RelationType.DEFINED]]);
 const restart=parse('scripts/testing/obsidian/authoringWorkspaceRestart.mjs');
 const nativeIndex={indexedDb:cache,semanticFingerprints:new Map([[a,'a'],[b,'b']])};
 const nativeApp={plugins:{plugins:{'k-plex':{index:nativeIndex}}}};
 const task=async(_name,body)=>new Function('app','return (async()=>{'+body+'})();')(nativeApp);
 const restartResult=await new Function('task','plannedFiles',declaration(restart,'savedProof')+'\nreturn savedProof();')(task,[a,b]);
 assert.deepEqual(restartResult.evidence.map(row=>[row.by,row.target,row.field,row.role,row.type]),
  [[a,b,'Opposes302','right',exports.RelationType.DEFINED],[b,a,'opposes302','right',exports.RelationType.DEFINED]]);
 const relationships=parse('scripts/testing/obsidian/authoringWorkspace.mjs');let persistedCallback;
 const visit=node=>{if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='iterateSnapshotEvidence')persistedCallback=node.arguments[1];ts.forEachChild(node,visit);};visit(relationships);
 assert(persistedCallback,'Actual relationship driver persisted reader');
 const savedEvidence=[],consume=new Function('owned','savedEvidence','return ('+persistedCallback.getText(relationships)+');')(new Set([a,b]),savedEvidence);
 rows.forEach(consume);
 assert.deepEqual(savedEvidence.map(row=>[row.declaredByPath,row.declaredTargetPath,row.field,row.role,row.relationType]),
  [[a,b,'Opposes302','right',exports.RelationType.DEFINED],[b,a,'opposes302','right',exports.RelationType.DEFINED]]);
 assert.deepEqual(rows,before,'Receipt readers never mutate the persisted source DTO');
});

/** The host's vault-info CLI spelling may change; selected runtime identity stays authoritative. */
test('foreground preflight checks the selected runtime canonical vault before native writes',async()=>{
 const path='scripts/testing/obsidian/foreground.mjs',source=ts.createSourceFile(path,readFileSync(new URL('../'+path,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
 const guard=source.statements.find(ts.isTryStatement)?.tryBlock.statements.find(node=>ts.isIfStatement(node)&&node.thenStatement.getText(source).includes("Error('Wrong vault')"));
 assert(guard,'Actual foreground vault-identity guard');
 const check=new Function('evaluate','realpathSync','target',guard.getText(source));
 await fixture(async target=>{
  const calls=[];
  const evaluate=selected=>code=>{calls.push(code);return JSON.parse(runInNewContext(code,{app:{vault:{adapter:{getBasePath:()=>selected}}}}));};
  assert.doesNotThrow(()=>check(evaluate(target.vaultPath),realpathSync,{vault:realpathSync(target.vaultPath)}));
  assert.throws(()=>check(evaluate(target.configDir),realpathSync,{vault:realpathSync(target.vaultPath)}),/Wrong vault/);
  assert.throws(()=>check(()=>{throw Error('Native eval unavailable');},realpathSync,{vault:realpathSync(target.vaultPath)}),/Native eval unavailable/);
  assert(calls.every(code=>code==='JSON.stringify({path:app.vault.adapter.getBasePath()})'),'Identity uses selected runtime eval without the retired vault-info command');
 });
});

/** Passive source observers must retain the original async contract, including false/rejection,
 * rather than making another source admission while diagnosing native foreground settlement. */
test('foreground convergence receipts preserve Promise identity, finite outcomes and method ownership',async()=>{
 const path='scripts/testing/obsidian/foreground.mjs',source=ts.createSourceFile(path,readFileSync(new URL('../'+path,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
 const functions=new Map();
 const collect=node=>{if(ts.isFunctionDeclaration(node)&&['sourceConvergenceSnapshot','observeSourceConvergence'].includes(node.name?.text))functions.set(node.name.text,node.getText(node.getSourceFile()));ts.forEachChild(node,collect);};
 const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(source)==='evaluate'&&ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))collect(ts.createSourceFile('native-controller.js',node.arguments[0].text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS));ts.forEachChild(node,visit);};visit(source);
 assert.equal(functions.size,2,'Actual serialized native convergence observers');
 const install=new Function('performance',[...functions.values()].join('\n')+'\nreturn observeSourceConvergence;')(performance);
 let resolveInventory,resolveDurable,rejectDurable,reconcileCalls=0,durableCalls=0;
 const inventoryPromise=new Promise(resolve=>{resolveInventory=resolve;}),durablePromise=new Promise(resolve=>{resolveDurable=resolve;}),rejectedPromise=new Promise((_resolve,reject)=>{rejectDurable=reject;});
 const originalReconcile=function(...args){assert.equal(this,acquisition);assert.deepEqual(args,['native-args']);reconcileCalls++;return inventoryPromise;};
 const originalDurable=function(){assert.equal(this,repository);durableCalls++;return durableCalls===1?durablePromise:rejectedPromise;};
 const repository=Object.create({flush:originalDurable});
 const acquisition=Object.assign(Object.create({reconcile:originalReconcile}),{repository,inventory:inventoryPromise,requested:true,closed:false,
  inventoryCaptureRevision:1,inventoryRevision:1,inventoryScopeRevision:1,hostRevision:1,maintenanceRevision:1,
  recoveryPass:{phase:'sources',outcome:'running',sourceRevision:1,scopeRevision:1,sourceChanges:0},
  hasSemanticDependencies:()=>false,getActivityState:()=>({pendingKnown:1}),
  getRecoveryDiagnostics(){return{pass:{...this.recoveryPass}}},getDiagnostics:()=>({storage:'available',unsaved:0,lastReason:'ready',lastReadFailure:null,readFailures:0})});
 const observer=install(acquisition),returnedInventory=acquisition.reconcile('native-args'),returnedDurable=repository.flush();
 assert.equal(returnedInventory,inventoryPromise,'Inventory Promise identity is unchanged');
 assert.equal(returnedDurable,durablePromise,'Durable Promise identity is unchanged');
 acquisition.inventoryRevision=2;acquisition.recoveryPass.outcome='cancelled';acquisition.recoveryPass.sourceChanges=1;
 resolveInventory(false);resolveDurable(true);
 assert.equal(await returnedInventory,false);assert.equal(await returnedDurable,true);
 assert.equal(reconcileCalls,1);assert.equal(durableCalls,1,'Observers never invoke an extra source operation');
 assert.deepEqual(observer.receipt.calls.map(row=>[row.owner,row.returned]),[['reconcile',false],['repository-flush',true]]);
 assert.equal(observer.receipt.calls[0].entry.revisions.source,1);assert.equal(observer.receipt.calls[0].exit.revisions.source,2);
 assert.equal(observer.receipt.calls[0].selectedPass.sourceChanges,1,'The actual selected pass retains its final cancellation delta');
 const returnedRejection=repository.flush();assert.equal(returnedRejection,rejectedPromise);rejectDurable(Error('Original durable failure'));
 await assert.rejects(returnedRejection,/Original durable failure/);assert.equal(observer.receipt.calls.at(-1).outcome,'rejected');
 for(let n=0;n<70;n++)assert.equal(acquisition.reconcile('native-args'),inventoryPromise);
 await Promise.resolve();assert.equal(observer.receipt.calls.length,64);assert(observer.receipt.overflow>0,'Receipts remain bounded');
 observer.restore();observer.restore();
 assert.equal(acquisition.reconcile,originalReconcile);assert.equal(repository.flush,originalDurable);
 assert.equal(Object.hasOwn(acquisition,'reconcile'),false);assert.equal(Object.hasOwn(repository,'flush'),false);
 assert.equal(observer.receipt.restoreConflicts,0);
});

/** Run the maintained inventory capture/cleanup owners without launching a native application. */
function foregroundInventoryFixture({sidecar=false,deleteFailure=false,sourceFailure=false,layoutFailure=false,coreSidebarActive=false,preserveStaleActive=false,linkedCoreViews=false,reuseCoreViews=false,propertiesSetterIgnores=false}={}){
 const path='scripts/testing/obsidian/foreground.mjs',source=ts.createSourceFile(path,readFileSync(new URL('../'+path,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const names=['foregroundLeafStates','captureForegroundInventoryState','freezeForegroundInventoryState','restoreForegroundInventoryState','cleanupForegroundInventory','restoreForegroundConfiguration'];
 const functions=names.map(name=>{const node=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert(node,'Actual inventory owner '+name);return node.getText(source);});
 const helpers=runInNewContext('(()=>{'+functions.join('\n')+';return {'+names.join(',')+'}})()',{window:{clearTimeout(){},setTimeout},setTimeout});
 const clone=value=>JSON.parse(JSON.stringify(value)),events=[],stateCalls=[],propertiesLoads=[],nativeFiles=new Map(['testbase.base','Bookproject.md','Original.md','One.base'].map(path=>[path,{path,extension:path.split('.').at(-1)}])),claims=new Map(),owned=new Map([['fixture',{path:'fixture'}],['fixture/Note.md',{path:'fixture/Note.md'}]]);let propertiesLoaderHook=null;
 const row=(id,type,state)=>({id,type:'leaf',state:{type,state}}),session={plexSession:{version:1,ownerId:'original-plex',centerPath:'Original.md',targetId:'original-document',documentSyncMode:'pinned',sidecarOpen:true}};
 const original={main:{type:'split',children:[row('base-one','bases',{file:'One.base'}),row('base-two','bases',{file:'testbase.base'}),row('original-document','markdown',{file:linkedCoreViews?'Bookproject.md':'Original.md',mode:'source'}),...(sidecar?[row('original-plex','k-plex-react-view',session)]:[])]},active:'original-document'};
 if(coreSidebarActive){original.right={type:'split',children:[row('core-sidebar','file-properties',linkedCoreViews?{file:'testbase.base'}:{})]};original.active='core-sidebar';}
 if(linkedCoreViews)original.right.children.push(row('core-backlinks','backlink',{file:'Bookproject.md',sentinel:'backlinks'}),row('core-outgoing','outgoing-link',{file:'Bookproject.md',sentinel:'outgoing'}),row('core-outline','outline',{file:'Bookproject.md',sentinel:'outline'}));
 let layout=clone(original),leaves=new Map(),hydrateRestoration=false,mostRecentLeafId='original-document';
 const findRow=(value,id)=>{if(!value||typeof value!=='object')return null;if(value.type==='leaf')return value.id===id?value:null;for(const child of Object.values(value)){const found=findRow(child,id);if(found)return found;}return null;};
 const rebuild=(retained=new Map())=>{const next=new Map();for(const saved of helpers.foregroundLeafStates(layout)){if(retained.has(saved.id)){next.set(saved.id,retained.get(saved.id));continue;}const node=findRow(layout,saved.id),leaf={id:node.id,nativeRow:node,view:{getViewType:()=>node.state.type,getState:()=>node.state.state,waitUntilReady:async()=>events.push('Plex ready')},
  getViewState:()=>node.state,loadIfDeferred:async()=>events.push('load '+node.id),setViewState:async value=>{events.push('native state '+node.id);stateCalls.push({id:node.id,value:clone(value),leaf});if(propertiesSetterIgnores&&value.type==='file-properties')return;const {active,...serialized}=clone(value);node.state=serialized;}};
  if(node.state.type==='file-properties'){const view=leaf.view;Object.defineProperty(view,'file',{get:()=>nativeFiles.get(node.state.state?.file)??null});view.loadFile=async function(file){assert.equal(this,view);events.push('Properties load '+node.id);propertiesLoads.push({leaf,view,file});await propertiesLoaderHook?.({leaf,view,file});node.state.state={...node.state.state,file:file?.path??null};};}
  next.set(node.id,leaf);}leaves=next;};rebuild();
 const coreLeaves=()=>new Map([...leaves].filter(([,leaf])=>!leaf.view.getViewType().startsWith('k-plex')));
 const saveLayout=()=>events.push('request layout save');saveLayout.run=async()=>events.push('drain layout writer');
 const workspace={getLayout:()=>layout,getLeafById:id=>leaves.get(id)??null,getMostRecentLeaf:()=>leaves.get(mostRecentLeafId)??null,getLeavesOfType:type=>[...leaves.values()].filter(leaf=>leaf.view.getViewType()===type),requestSaveLayout:saveLayout,
  setActiveLeaf:(leaf,options)=>{assert.equal(leaf,leaves.get(leaf.id),'Restore the exact captured native leaf');assert.equal(options.focus,false);events.push((leaf.id==='core-sidebar'?'restore active ':'restore recent ')+leaf.id);layout.active=leaf.id;if(leaf.id!=='core-sidebar')mostRecentLeafId=leaf.id;if(linkedCoreViews){const file=leaves.get(mostRecentLeafId).getViewState().state.file;for(const id of ['core-sidebar','core-backlinks','core-outgoing','core-outline'])findRow(layout,id).state.state.file=file;}},revealLeaf:()=>{throw Error('Restoring native active ownership must not reveal or focus a different pane');},
  changeLayout:async saved=>{events.push('restore native layout');if(layoutFailure)throw Error('Native layout failed');const stale=layout.active,retained=reuseCoreViews?coreLeaves():new Map();layout=clone(saved);if(retained.size){const attach=value=>{if(!value||typeof value!=='object')return value;if(value.type==='leaf')return retained.get(value.id)?.nativeRow??value;for(const key of Object.keys(value))value[key]=attach(value[key]);return value;};layout=attach(layout);}if(preserveStaleActive)layout.active=stale;if(hydrateRestoration&&sidecar)layout.main.children.find(row=>row.id==='original-plex').state.state.plexSession.centerPath='Deferred stale center';rebuild(retained);}};
 const plugin={settings:{lastActivePath:'Original.md',documentSyncMode:'off',hierarchy:{parents:['Parent']},unknownFutureSetting:{keep:true}},settingsWriteQueue:Promise.resolve(),
  saveSettings:async()=>events.push('save runtime settings'),index:{building:false,hasPendingSnapshotHydration:()=>false,invalidateSemanticPolicy:()=>events.push('invalidate policy'),flushSourceRepository:async()=>{events.push('source convergence');if(sourceFailure)throw Error('Source cleanup failed');return true;},sourceAcquisition:{hasSemanticDependencies:()=>true},refreshSemanticSettings:async()=>events.push('refresh semantics')},
  restorePersistedSidecar:async host=>{events.push('restore original Sidecar');claims.set(host.id,host.view.getState().plexSession.targetId);}};
 const app={plugins:{plugins:{'k-plex':plugin}},workspace,vault:{getFileByPath:path=>nativeFiles.get(path)??null,getAbstractFileByPath:path=>owned.get(path),delete:async file=>{events.push('delete '+file.path);if(deleteFailure&&file.path==='fixture/Note.md')throw Error('Fixture delete failed');owned.delete(file.path);}}};plugin.app=app;
 const c={p:plugin,originalSettings:clone(plugin.settings),owned:[...owned.keys()],task:Promise.resolve(),release:()=>events.push('release inventory'),releasePrewrite:()=>events.push('release prewrite')};
 const addTestPlex=()=>{layout.main.children.push(row('test-created-plex','k-plex-react-view',{plexSession:{ownerId:'test-created-plex',centerPath:'fixture/Note.md'}}));mostRecentLeafId='base-two';layout.active=coreSidebarActive?'base-two':'test-created-plex';if(linkedCoreViews)for(const id of ['core-sidebar','core-backlinks','core-outgoing','core-outline'])findRow(layout,id).state.state.file='testbase.base';plugin.settings.lastActivePath='fixture/Note.md';plugin.settings.hierarchy.parents=['Fixture parent'];if(sidecar){layout.main.children.find(row=>row.id==='original-plex').state.state.plexSession.centerPath='fixture/Note.md';layout.main.children.find(row=>row.id==='original-document').state.state.file='fixture/Note.md';claims.set('original-plex','test-created-plex');}rebuild(reuseCoreViews?coreLeaves():new Map());hydrateRestoration=true;};
 return{helpers,app,plugin,c,events,stateCalls,propertiesLoads,nativeFiles,claims,owned,original,addTestPlex,setPropertiesLoaderHook:hook=>{propertiesLoaderHook=hook;},get layout(){return layout}};
}

for(const sidecar of [false,true])test('foreground inventory restores '+(sidecar?'existing Plex/Sidecar sessions':'two Bases and Markdown without retaining its test Plex'),async()=>{
 const f=foregroundInventoryFixture({sidecar}),captured=await f.helpers.captureForegroundInventoryState(f.app,nativeDocumentSessions),before=f.helpers.freezeForegroundInventoryState(captured),saved=JSON.stringify(before);
 f.addTestPlex();captured.layout.main.children.length=0;captured.settings.unknownFutureSetting.keep=false;
 assert.equal(JSON.stringify(before),saved,'Node-owned recovery must be detached and immutable');assert(Object.isFrozen(before.settings.hierarchy.parents));
 assert(f.helpers.foregroundLeafStates(f.layout).some(row=>row.id==='test-created-plex'));
 await f.helpers.cleanupForegroundInventory(f.app,f.c,before,nativeDocumentSessions);
 assert.equal(JSON.stringify(f.helpers.foregroundLeafStates(f.layout)),JSON.stringify(before.leaves));assert(!f.helpers.foregroundLeafStates(f.layout).some(row=>row.id==='test-created-plex'));
 assert.equal(JSON.stringify(f.plugin.settings),JSON.stringify(before.settings));assert.equal(f.owned.size,0);assert(f.events.includes('drain layout writer'));
 assert.deepEqual(JSON.parse(JSON.stringify(nativeDocumentSessions(f.plugin).capture())),JSON.parse(JSON.stringify(before.sessions)));
 if(sidecar)assert.equal(f.claims.get('original-plex'),'original-document','The original managed Sidecar is restored through its native session owner');
});

test('foreground inventory explicitly restores the captured core-sidebar active leaf before native writer drain',async()=>{
 const f=foregroundInventoryFixture({coreSidebarActive:true,preserveStaleActive:true}),before=f.helpers.freezeForegroundInventoryState(await f.helpers.captureForegroundInventoryState(f.app,nativeDocumentSessions));f.addTestPlex();assert.equal(f.layout.active,'base-two');
 await f.helpers.cleanupForegroundInventory(f.app,f.c,before,nativeDocumentSessions);
 assert.equal(JSON.stringify(f.layout),JSON.stringify(before.layout),'Native changeLayout may preserve stale activation; cleanup restores the full captured layout');
 assert.equal(f.layout.active,'core-sidebar');assert(f.events.indexOf('restore active core-sidebar')<f.events.indexOf('drain layout writer'),'Original active ownership must be restored before flushing workspace persistence');
});

test('foreground inventory restores root-document MRU before active sidebar and its independent native target',async()=>{
 const f=foregroundInventoryFixture({coreSidebarActive:true,preserveStaleActive:true,linkedCoreViews:true,reuseCoreViews:true}),before=f.helpers.freezeForegroundInventoryState(await f.helpers.captureForegroundInventoryState(f.app,nativeDocumentSessions));
 const originals=new Map(before.leaves.map(row=>[row.id,f.app.workspace.getLeafById(row.id)]));f.addTestPlex();
 assert.equal(before.mostRecentLeafId,'original-document');assert.equal(before.layout.active,'core-sidebar');assert.equal(f.app.workspace.getMostRecentLeaf().id,'base-two');
 await f.helpers.cleanupForegroundInventory(f.app,f.c,before,nativeDocumentSessions);
 assert.equal(JSON.stringify(f.layout),JSON.stringify(before.layout),'The original independent Bookproject sidebars and Bases-focused File properties must both survive cleanup');
 assert.deepEqual(f.stateCalls.map(call=>call.id),['core-sidebar'],'MRU fixes the linked Bookproject sidebars; only independently targeted File properties needs setViewState');
 for(const call of f.stateCalls){assert.equal(call.leaf,originals.get(call.id),'Restore the exact reused native leaf');assert.equal(call.value.active,false);assert.equal(call.value.state.file,'testbase.base');assert.equal(f.app.workspace.getLeafById(call.id),originals.get(call.id));}
 assert(f.events.indexOf('restore recent original-document')<f.events.indexOf('restore active core-sidebar'));assert(f.events.indexOf('restore active core-sidebar')<f.events.indexOf('native state core-sidebar'));assert(f.events.indexOf('native state core-sidebar')<f.events.indexOf('drain layout writer'));
 assert.equal(f.layout.active,'core-sidebar');assert.equal(f.app.workspace.getMostRecentLeaf().id,'original-document');assert.equal(f.c.nativeRestoration.mostRecentLeafId,'original-document');assert.equal(f.c.nativeRestoration.restoredNativeStates.length,1);
});

test('foreground inventory guarded native Properties loader repairs an independent target only after public state declines',async()=>{
 const f=foregroundInventoryFixture({coreSidebarActive:true,preserveStaleActive:true,linkedCoreViews:true,reuseCoreViews:true,propertiesSetterIgnores:true}),before=f.helpers.freezeForegroundInventoryState(await f.helpers.captureForegroundInventoryState(f.app,nativeDocumentSessions)),leaf=f.app.workspace.getLeafById('core-sidebar'),view=leaf.view,target=f.nativeFiles.get('testbase.base');f.addTestPlex();
 await f.helpers.cleanupForegroundInventory(f.app,f.c,before,nativeDocumentSessions);
 assert.equal(JSON.stringify(f.layout),JSON.stringify(before.layout));assert.equal(f.propertiesLoads.length,1);assert.equal(f.propertiesLoads[0].leaf,leaf);assert.equal(f.propertiesLoads[0].view,view);assert.equal(f.propertiesLoads[0].file,target);assert.equal(view.file,target);
 assert.equal(f.app.workspace.getMostRecentLeaf().id,'original-document');assert.equal(f.layout.active,'core-sidebar');assert.deepEqual(f.stateCalls.map(call=>call.id),['core-sidebar']);
 assert(f.events.indexOf('native state core-sidebar')<f.events.indexOf('Properties load core-sidebar'));assert(f.events.indexOf('Properties load core-sidebar')<f.events.indexOf('drain layout writer'));
});

test('foreground inventory guarded Properties loader preserves a captured null target',async()=>{
 const f=foregroundInventoryFixture({coreSidebarActive:true,preserveStaleActive:true,linkedCoreViews:true,reuseCoreViews:true,propertiesSetterIgnores:true});f.app.workspace.getLeafById('core-sidebar').nativeRow.state.state.file=null;
 const before=f.helpers.freezeForegroundInventoryState(await f.helpers.captureForegroundInventoryState(f.app,nativeDocumentSessions));f.addTestPlex();await f.helpers.cleanupForegroundInventory(f.app,f.c,before,nativeDocumentSessions);
 assert.equal(JSON.stringify(f.layout),JSON.stringify(before.layout));assert.equal(f.propertiesLoads.length,1);assert.equal(f.propertiesLoads[0].file,null);assert.equal(f.app.workspace.getMostRecentLeaf().id,'original-document');assert.equal(f.layout.active,'core-sidebar');
});

for(const failure of ['missing target','replaced view','replaced target'])test('foreground inventory Properties loader rejects '+failure+' without accepting stale native ownership',async()=>{
 const f=foregroundInventoryFixture({coreSidebarActive:true,preserveStaleActive:true,linkedCoreViews:true,reuseCoreViews:true,propertiesSetterIgnores:true}),before=f.helpers.freezeForegroundInventoryState(await f.helpers.captureForegroundInventoryState(f.app,nativeDocumentSessions));f.addTestPlex();
 if(failure==='missing target')f.nativeFiles.delete('testbase.base');
 else f.setPropertiesLoaderHook(({leaf,view,file})=>{if(failure==='replaced view')leaf.view={...view,getViewType:()=>'file-properties'};else f.nativeFiles.set(file.path,{...file});});
 await assert.rejects(f.helpers.cleanupForegroundInventory(f.app,f.c,before,nativeDocumentSessions),failure==='missing target'?/Captured File properties target missing/:/Native File properties owner or target changed/);
 assert.equal(f.propertiesLoads.length,failure==='missing target'?0:1);assert(f.events.includes('drain layout writer'),'A refused fallback cannot skip independent writer cleanup');assert.equal(f.app.workspace.getMostRecentLeaf().id,'original-document');assert.equal(f.layout.active,'core-sidebar');
});

test('foreground inventory still restores native layout/sessions/settings after earlier fixture and source cleanup failures',async()=>{
 const f=foregroundInventoryFixture({sidecar:true,deleteFailure:true,sourceFailure:true}),before=f.helpers.freezeForegroundInventoryState(await f.helpers.captureForegroundInventoryState(f.app,nativeDocumentSessions));f.addTestPlex();
 await assert.rejects(f.helpers.cleanupForegroundInventory(f.app,f.c,before,nativeDocumentSessions),/Fixture delete failed.*Source cleanup failed/);
 assert.equal(JSON.stringify(f.helpers.foregroundLeafStates(f.layout)),JSON.stringify(before.leaves));assert.equal(JSON.stringify(f.plugin.settings),JSON.stringify(before.settings));assert.equal(f.claims.get('original-plex'),'original-document');
 assert(f.events.includes('save runtime settings')&&f.events.includes('drain layout writer'),'Independent native writers still drain after earlier source failure');assert(f.events.includes('delete fixture'),'A failed owned file deletion must not skip other owned resources');
});

test('foreground inventory layout failure cannot skip session/settings writers or independent exact configuration restoration',async()=>{
 const f=foregroundInventoryFixture({sidecar:true,layoutFailure:true}),before=f.helpers.freezeForegroundInventoryState(await f.helpers.captureForegroundInventoryState(f.app,nativeDocumentSessions));f.addTestPlex();
 await assert.rejects(f.helpers.cleanupForegroundInventory(f.app,f.c,before,nativeDocumentSessions),/Native layout failed/);
 assert.equal(JSON.stringify(f.plugin.settings),JSON.stringify(before.settings));assert(f.events.includes('restore original Sidecar')&&f.events.includes('save runtime settings')&&f.events.includes('drain layout writer'));
 const original=[{path:'data.json',bytes:Buffer.from('original data')},{path:'enabled.json',bytes:Buffer.from('original enabled')},{path:'workspace.json',bytes:Buffer.from('original workspace')}],files=new Map(original.map(row=>[row.path,Buffer.from('mutated')])),writes=[];
 const ports={writeFileSync:(path,bytes)=>{writes.push(path);if(path==='data.json')throw Error('Data write failed');files.set(path,Buffer.from(bytes));},readFileSync:path=>files.get(path),existsSync:path=>files.has(path),unlinkSync:path=>files.delete(path)};
 assert.throws(()=>f.helpers.restoreForegroundConfiguration(original,ports),/Data write failed/);assert.deepEqual(writes,['data.json','enabled.json','workspace.json']);
 assert(files.get('enabled.json').equals(original[1].bytes));assert(files.get('workspace.json').equals(original[2].bytes));
});

test('foreground inventory prewrite barrier waits for Node-owned persisted recovery before creating fixtures',async()=>{
 const path='scripts/testing/obsidian/foreground.mjs',source=ts.createSourceFile(path,readFileSync(new URL('../'+path,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);let controller,nodeAcceptance;
 const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(source)==='evaluate'&&ts.isNoSubstitutionTemplateLiteral(node.arguments[0])&&node.arguments[0].text.includes('c.prewriteReady=true'))controller=node.arguments[0].text;if(ts.isIfStatement(node)&&node.expression.getText(source)==='r.prewriteReady&&!inventoryState')nodeAcceptance=node;ts.forEachChild(node,visit);};visit(source);
 assert(controller&&nodeAcceptance,'Actual native barrier and Node baseline acceptance blocks');
 const start=controller.indexOf('c.prewriteReady=true;'),finish=controller.indexOf('c.owned.push(c.folder);',start)+'c.owned.push(c.folder);'.length;assert(start>=0&&finish>start);
 const created=[],c={folder:'owned-fixture',owned:[]},task=runInNewContext('(async()=>{'+controller.slice(start,finish)+'})()',{c,check:(value,message)=>assert.ok(value,message),app:{vault:{createFolder:async path=>created.push(path)}}});
 assert.equal(c.prewriteReady,true);assert.deepEqual(created,[],'Native fixture writes are blocked until Node persists originals');
 const f=foregroundInventoryFixture(),snapshot=await f.helpers.captureForegroundInventoryState(f.app,nativeDocumentSessions),files=new Map(),receipts=[];
 const target={pluginDir:'owned-plugin',config:'owned-config'},report={},out='owned-report';for(const name of ['data.json','community-plugins.json','workspace.json'])files.set(join(name==='data.json'?target.pluginDir:target.config,name),Buffer.from('original '+name));
 const context={r:{prewriteReady:true},inventoryState:null,freezeForegroundInventoryState:f.helpers.freezeForegroundInventoryState,foregroundLeafStates:f.helpers.foregroundLeafStates,captureForegroundInventoryState:f.helpers.captureForegroundInventoryState,target,report,out,join,
  existsSync:path=>files.has(path),readFileSync:path=>files.get(path),writeFileSync:(path,bytes)=>{receipts.push(path);files.set(path,String(bytes));},
  evaluate:code=>{if(code.includes('captureForegroundInventoryState'))return snapshot;assert(report.inventoryRecovery);assert(files.has(report.inventoryRecovery.native)&&files.has(report.inventoryRecovery.configuration),'Recovery inputs must be durable before the native gate is released');return JSON.parse(runInNewContext(code,{window:{__kplexForegroundTest:c}}));}};
 runInNewContext(nodeAcceptance.getText(source),context);await task;
 assert(Object.isFrozen(context.inventoryState.layout));assert.deepEqual(created,['owned-fixture']);assert.deepEqual(JSON.parse(JSON.stringify(c.owned)),['owned-fixture']);assert.equal(c.baselineAccepted,true);
 assert.deepEqual(receipts,[report.inventoryRecovery.native,report.inventoryRecovery.configuration]);assert.equal(JSON.parse(files.get(report.inventoryRecovery.native)).leaves.length,3);
});
