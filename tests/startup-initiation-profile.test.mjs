/** Test-only startup observations must preserve native calls, failure propagation and owned cleanup. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {instrumentInitiationSources,initiationBanner,initiationFooter,replaceProfileAnchor} from '../scripts/testing/obsidian/buildStartupProfile.mjs';

/** Execute the actual Settings/native-ready statements and teardown, retaining the complete readiness callback. */
function settingsRegistrationFixture(alreadyReady=false){
 const file=ts.createSourceFile('main.ts',readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
 const plugin=file.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='KplexPlugin');
 const named=name=>plugin.members.find(member=>member.name?.getText(file)===name),onload=named('onload'),unload=named('onunload');
 const statementText=statement=>statement.getText(file);
 const install=onload.body.statements.filter(statement=>{
  const text=statementText(statement);return text.startsWith('this.settingsTab =')||text.startsWith('this.addSettingTab(')||text.startsWith('this.app.workspace.onLayoutReady(');
 }).map(statementText).join('\n');
 const cleanup=unload.body.statements.filter(statement=>/this\.unloading = true|this\.settingsTab(?:\?\.dispose|\s*=)|this\.settingsTabRegistrationTimer/.test(statementText(statement))).map(statementText).join('\n');
 const fields=['settingsTab','settingsTabRegistrationTimer','settingsTabRegistered'].map(name=>named(name)?.getText(file)??'').join('\n');
 const helper=['scheduleSettingsTabRegistration','registerSettingsTab','openSettings','openSettingsPage','openActionSettings'].map(name=>named(name)?.getText(file)??'').join('\n');
 const code=ts.transpileModule(`class SettingsLifecycle {${fields}\n${helper}\ninstall(){const alreadyKplex=true,hasOwnData=true;${install}}\nunload(){${cleanup}}}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 let ready,sequence=0,definitions=0;const jobs=new Map(),registrations=[],calls=[],notices=[],errors=[];
 const clock={setTimeout(callback,delay){const id=++sequence;jobs.set(id,{callback,delay});return id;},clearTimeout(id){jobs.delete(id);}};
 class Tab{getSettingDefinitions(){definitions++;}disposeOntologySettings(){}disposeActionSettings(){}openSettingsPage(){return registrations.includes(this);}}
 const navigationFile=ts.createSourceFile('settingsNavigation.ts',readFileSync(new URL('../src/adapters/obsidian/settingsNavigation.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
 const navigationSource=navigationFile.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name.text==='navigatePluginSettings').getText(navigationFile).replace(/^export /,'');
 const navigate=Function(ts.transpileModule(navigationSource,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';return navigatePluginSettings;')();
 const Lifecycle=Function('window','KplexSettingTab','fixedPinPaths','registerFileMenus','KPLEX_VIEW_TYPE','Notice','console','navigatePluginSettings',code+';return SettingsLifecycle;')(clock,Tab,()=>[],()=>{},'plex',class{constructor(message){notices.push(message);}},{error:(...args)=>errors.push(args)},navigate);
 const owner=new Lifecycle();Object.assign(owner,{app:{workspace:{onLayoutReady:callback=>{ready=callback;if(alreadyReady)callback();},getLeavesOfType:()=>[]}},
  settings:{navigationHistory:[],pinnedNodes:[]},manifest:{id:'k-plex'},translator:key=>key,index:{primeSavedNavigation:()=>calls.push('prime')},startupDiagnostics:{mark(){}},layoutReadyWaiters:new Set(),
  installPreRestoreChangeFence(){calls.push('fence');},updateStyleSettings:async()=>{},captureAppearanceOwner:()=>({}),registerOntologyContextMenu(){},prepareIndexIfRequested(){},
  addSettingTab(tab){registrations.push(tab);tab.getSettingDefinitions();}});
 owner.app.setting={open:()=>calls.push('settings-open'),openPagePath:()=>registrations.includes(owner.settingsTab)?(calls.push('settings-page'),true):false,openTabById:()=>calls.push(registrations.includes(owner.settingsTab)?'settings-root':'missing-tab')};
 return{owner,jobs,registrations,calls,notices,errors,get definitions(){return definitions;},ready:()=>ready(),run:job=>{jobs.delete(job[0]);job[1].callback();},zero:()=>[...jobs].filter(([,job])=>job.delay===0)};
}

for(const ready of [false,true])test('actual Settings registration leaves the initiation task after native workspace readiness: '+ready,async()=>{
 const f=settingsRegistrationFixture(ready);try{
  f.owner.install();assert(f.owner.settingsTab,'Early API consumers retain their Settings owner');assert.equal(f.registrations.length,0,'Settings definitions must not build in onload, even when native readiness fires inline');
  if(!ready){assert.equal(f.zero().length,0);f.ready();}
  assert.equal(f.registrations.length,0,'Readiness queues work rather than running definitions in its synchronous task');
  f.owner.scheduleSettingsTabRegistration();assert.equal(f.zero().length,1);f.run(f.zero()[0]);assert.equal(f.registrations.length,1);assert.equal(f.definitions,1);
  f.owner.scheduleSettingsTabRegistration();assert.equal(f.zero().length,0,'Repeated readiness cannot register another tab');
  await Promise.resolve();assert(f.calls.includes('fence')&&f.calls.includes('prime'),'The original early source/navigation readiness work remains active');
 }finally{f.owner.unload();f.jobs.clear();}
});

test('actual deferred Settings registration cannot publish a replaced tab instance',async()=>{
 const f=settingsRegistrationFixture();try{
  f.owner.install();f.ready();const original=f.owner.settingsTab;
  f.owner.settingsTab={getSettingDefinitions(){},disposeOntologySettings(){},disposeActionSettings(){}};
  f.run(f.zero()[0]);assert.equal(f.registrations.length,0,'The captured retired tab cannot register a replacement through its old task');
  f.owner.scheduleSettingsTabRegistration();f.run(f.zero()[0]);assert.deepEqual(f.registrations,[f.owner.settingsTab]);assert.notEqual(f.registrations[0],original);await Promise.resolve();
 }finally{f.owner.unload();f.jobs.clear();}
});

for(const phase of ['before-ready','before-task'])test('actual Settings registration cancels after unload '+phase,async()=>{
 const f=settingsRegistrationFixture();try{
  f.owner.install();if(phase==='before-task')f.ready();const late=f.zero()[0]?.[1].callback;
  if(phase==='before-task')assert.equal(typeof late,'function','Native readiness must queue a cancellable registration task');
  f.owner.unload();assert.equal(f.zero().length,0,'Unload must cancel the main-window task before disposing the tab');
  if(phase==='before-ready')f.ready();else late();
  assert.equal(f.registrations.length,0,'A retired ready/timer callback must never register Settings');assert.equal(f.zero().length,0);await Promise.resolve();
 }finally{f.jobs.clear();}
});

test('deferred Settings registration failure remains unregistered and reports without an uncaught timer error',async()=>{
 const f=settingsRegistrationFixture();try{
  f.owner.install();const add=f.owner.addSettingTab,error=new Error('Controlled native definition failure');f.owner.addSettingTab=()=>{throw error;};f.ready();
  assert.doesNotThrow(()=>f.run(f.zero()[0]));assert.equal(f.owner.settingsTabRegistered,false);assert.equal(f.zero().length,0);
  assert.deepEqual(f.notices,['actions.failed']);assert.equal(f.errors.length,1);assert.equal(f.errors[0][1],error);
  f.owner.addSettingTab=add;assert.equal(f.owner.openActionSettings(),true,'An explicit retry must be usable after a reported failure');assert.equal(f.registrations.length,1);await Promise.resolve();
 }finally{f.owner.unload();f.jobs.clear();}
});

for(const route of ['openActionSettings','openSettings'])test('explicit Settings navigation flushes queued registration before native lookup: '+route,async()=>{
 const f=settingsRegistrationFixture();try{
  f.owner.install();f.ready();const late=f.zero()[0][1].callback;
  const result=f.owner[route]();if(route==='openActionSettings')assert.equal(result,true);
  assert.equal(f.registrations.length,1);assert.equal(f.zero().length,0);assert(!f.calls.includes('missing-tab'));
  assert(f.calls.includes(route==='openActionSettings'?'settings-page':'settings-root'));late();assert.equal(f.registrations.length,1);await Promise.resolve();
 }finally{f.owner.unload();f.jobs.clear();}
});

const sources={
 main:`export default class KplexPlugin extends Plugin {
 translator=createObsidianTranslator();
 async onload(): Promise<void> {
 this.translator = createObsidianTranslator();
 const ownData: unknown = await this.loadData();
 this.settings=migrateAndMergeSettings(ownData);
 this.index=new GraphIndex(this,this.app);
 this.settingsTab=new KplexSettingTab();
 this.addSettingTab(this.settingsTab);
 this.initializeActions();
 this.app.workspace.onLayoutReady(() => {this.app.calls.push('layout');});
 }
 loadData(){return this.app.data;}
 addSettingTab(tab){this.app.calls.push('tab');tab.getSettingDefinitions();}
 initializeActions(){this.app.calls.push('actions');}
 }`,
 settings:`function migrateAndMergeSettings(raw){return raw;}
 class KplexSettingTab {getSettingDefinitions(){return [];}}`,
 graphIndex:`class GraphIndex {constructor(private plugin,private app){this.cache=new KplexIndexedDbCache();void this.cache.clearLegacyLocalStorage(app);}}`,
 indexedDb:`class KplexIndexedDbCache {async clearLegacyLocalStorage(app){app.saveLocalStorage('legacy',null);}}`,
};

/** Execute the transformed source, retaining a truly awaited loadData boundary. */
function fixture({failure=false,previous}={}){
 const instrumented=instrumentInitiationSources(sources),calls=[],window={};
 if(previous!==undefined)window.kplexStartupInitiation=previous;
 const app={calls,vault:{getName:()=> 'kplex-test-small'},workspace:{onLayoutReady:callback=>callback()},saveLocalStorage:()=>calls.push('legacy')};
 let settle;
 app.data=new Promise((resolve,reject)=>{settle=()=>failure?reject(Error('Native load failed')):resolve({saved:true});});
 const script=`class Plugin {constructor(app){this.app=app;this.releases=[];app.calls.push('base-constructor');}register(release){this.releases.push(release);}}
 function createObsidianTranslator(){return ()=> 'translated';}
 ${instrumented.indexedDb}\n${instrumented.graphIndex}\n${instrumented.settings}\n${instrumented.main.replace('export default ','')}
 globalThis.PluginClass=KplexPlugin;`;
 const compiled=ts.transpileModule(script,{compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.CommonJS}}).outputText;
 const context={window,performance,require:()=>({cpuUsage:()=>({user:0,system:0})})};
 vm.runInNewContext(initiationBanner+'\n'+compiled+'\n'+initiationFooter,context);
 const plugin=new context.PluginClass(app),task=plugin.onload();
 return{plugin,task,settle,calls,window,context};
}

test('initiation profiling preserves constructor, synchronous registration and actual await ordering',async()=>{
 const f=fixture();
 assert.deepEqual(f.calls,['base-constructor']);
 const controller=f.window.kplexStartupInitiation;
 assert(controller.snapshot().active);
 assert(controller.snapshot().events.some(event=>event.phase==='loadData:enter'));
 assert(!controller.snapshot().events.some(event=>event.phase==='loadData:exit'));
 f.settle();await f.task;
 assert.deepEqual(f.calls,['base-constructor','legacy','tab','actions','layout']);
 const receipt=controller.snapshot(),phases=receipt.events.map(event=>event.phase);
 assert.equal(receipt.active,false);
 for(const phase of ['module-eval','constructor','onload','translator','loadData','settings-migration','GraphIndex','legacy-localStorage','settings-definitions','addSettingTab','actions']){
  assert.equal(phases.filter(value=>value===phase+':enter').length,1,phase);
  assert.equal(phases.filter(value=>value===phase+':exit').length,1,phase);
  assert(phases.indexOf(phase+':enter')<phases.indexOf(phase+':exit'),phase);
 }
 assert(phases.indexOf('constructor:exit')<phases.indexOf('onload:enter'));
 assert(phases.indexOf('settings-definitions:exit')<phases.indexOf('addSettingTab:exit'));
 assert(phases.indexOf('layout-callback:enter')<phases.indexOf('onload:exit'),'Inline native layout callback remains inline');
 assert(receipt.events.every(event=>Number.isFinite(event.ms)&&event.ms>=0));
 for(const release of f.plugin.releases)release();
 assert.equal(f.window.kplexStartupInitiation,undefined);
});

test('failed startup preserves the native rejection and restores only its own controller',async()=>{
 const previous={earlier:true},f=fixture({failure:true,previous});
 const controller=f.window.kplexStartupInitiation;
 f.settle();await assert.rejects(f.task,/Native load failed/);
 assert.equal(controller.snapshot().events.at(-1).phase,'onload:exit');
 assert.equal(controller.snapshot().active,false);
 for(const release of f.plugin.releases)release();
 assert.equal(f.window.kplexStartupInitiation,previous);
 const next=fixture();next.settle();await next.task;
 const foreign={foreign:true};next.window.kplexStartupInitiation=foreign;
 for(const release of next.plugin.releases)release();
 assert.equal(next.window.kplexStartupInitiation,foreign);
});

test('lexical recorder is bounded and snapshots cannot mutate recorded observations',()=>{
 const context={performance,require:()=>({cpuUsage:()=>({user:0,system:0})})};
 vm.runInNewContext(initiationBanner+`;for(let n=0;n<150;n++)__kplexInitiation.mark('test');globalThis.controller=__kplexInitiation;`,context);
 const first=context.controller.snapshot();assert.equal(first.events.length,128);assert.equal(first.dropped,23);
 first.events[0].phase='changed';assert.equal(context.controller.snapshot().events[0].phase,'module-eval:enter');
 context.controller.finish();context.controller.mark('late');assert.equal(context.controller.snapshot().events.length,128);
});

test('current production method boundaries transform and parse without changing shipping source',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const actual=instrumentInitiationSources({main:read('src/main.ts'),settings:read('src/settings.ts'),graphIndex:read('src/index/GraphIndex.ts'),indexedDb:read('src/index/IndexedDbCache.ts')});
 for(const[name,source]of Object.entries(actual)){
  const file=ts.createSourceFile(name+'.ts',source,ts.ScriptTarget.Latest,true);
  assert.deepEqual(file.parseDiagnostics,[],name);
 }
 assert.throws(()=>instrumentInitiationSources({...sources,main:sources.main.replace('this.addSettingTab(this.settingsTab);','')}),/boundary changed/);
 assert.throws(()=>replaceProfileAnchor('x x','x','z'),/boundary changed/);
});
