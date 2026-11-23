/** Test-only startup observations must preserve native calls, failure propagation and owned cleanup. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {loadPortableModules} from './support/portableTypeScript.mjs';
import {instrumentInitiationSources,initiationBanner,initiationFooter,replaceProfileAnchor} from '../scripts/testing/obsidian/buildStartupProfile.mjs';
const pinContracts=loadPortableModules(['src/core/plex/periodicPins.ts','src/core/plex/savedPins.ts','src/core/plex/appearanceThemes.ts','src/core/contracts/appearance.ts']).exports;
const {LocalVideoThumbnails}=loadPortableModules(['src/adapters/obsidian/localVideoThumbnails.ts']).exports;
/** Keep the native lifecycle adapter itself in every controlled startup fixture. */
function nativeStartupGateFor(window){
 const code=ts.transpileModule(readFileSync(new URL('../src/adapters/obsidian/nativeStartupGate.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,exports={};
 Function('window','exports',code)(window,exports);return exports.installNativeStartupGate;
}

/** Execute the actual Settings/native-ready statements and teardown, retaining the complete readiness callback. */
function settingsRegistrationFixture(alreadyReady=false){
 const file=ts.createSourceFile('main.ts',readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
 const plugin=file.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='KplexPlugin');
 const named=name=>plugin.members.find(member=>member.name?.getText(file)===name),onload=named('initializePlugin'),unload=named('onunload');
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
  whenInitialized:async()=>true, settings:{navigationHistory:[],pinnedNodes:[]},manifest:{id:'k-plex'},translator:key=>key,index:{primeSavedNavigation:()=>calls.push('prime')},startupDiagnostics:{mark(){}},layoutReadyWaiters:new Set(),
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

/** Compile the actual initialization/fence/unload owners against finite native ports and a controllable data promise. */
function asyncInitializationFixture({layoutReady=true,nativeCss=false}={}){
 const source=ts.createSourceFile('main.ts',readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true),plugin=source.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='KplexPlugin');
 const methods=new Set(['onload','initializePlugin','whenInitialized','finishInitialization','installPreRestoreChangeFence','onunload','scheduleSettingsTabRegistration','registerSettingsTab','onExternalSettingsChange','register','activateView','installExternalSettings','refreshPeriodicPins','stopPeriodicPinTimer','readSavedPins']);
 const fields=plugin.members.filter(node=>ts.isPropertyDeclaration(node)&&node.initializer&&(node.initializer.kind===ts.SyntaxKind.NullKeyword||node.initializer.kind===ts.SyntaxKind.TrueKeyword||node.initializer.kind===ts.SyntaxKind.FalseKeyword||ts.isNumericLiteral(node.initializer)||ts.isNewExpression(node.initializer)&&['Map','Set','WeakMap','WeakSet','Promise'].includes(node.initializer.expression.getText(source))));
 const text='class InitializingPlugin extends NativePlugin {'+fields.map(node=>node.getText(source)).join('\n')+'\n'+plugin.members.filter(node=>ts.isMethodDeclaration(node)&&methods.has(node.name.getText(source))).map(node=>node.getText(source)).join('\n')+'\n}';
 let resolveData,rejectData;const data=new Promise((resolve,reject)=>{resolveData=resolve;rejectData=reject;}),calls=[],notices=[],errors=[],views=new Map(),jobs=new Map();let timer=0;
 const events=()=>{const handlers=new Map();return{on(type,callback){const set=handlers.get(type)??new Set();handlers.set(type,set);const ref={callback,release:()=>set.delete(ref)};set.add(ref);return ref;},offref:ref=>ref.release(),emit(type,...args){for(const ref of [...handlers.get(type)??[]])ref.callback(...args);}};};
 class File{constructor(path){this.path=path;this.extension='md';this.stat={mtime:1,ctime:1,size:1};}}class Folder{constructor(path){this.path=path;}}
 const readyCallbacks=new Set();let nativeReady=layoutReady;
 const files=new Map(),workspace={...events(),containerEl:{ownerDocument:{}},onLayoutReady(callback){calls.push('layout-registered');if(nativeReady)callback();else readyCallbacks.add(callback);},getLeavesOfType:()=>[]},vault={...events(),getFileByPath:path=>files.get(path)??null};
 const app={workspace,vault,metadataCache:events()},mainWindow={performance:{now:()=>0},setTimeout(callback,delay){const id=++timer;jobs.set(id,{callback,delay});return id;},clearTimeout(id){jobs.delete(id);}};
 class NativePlugin{constructor(){this.app=app;this.releases=[];this._loaded=true;this.settings={lastActivePath:'DEFAULT'};this.translator=key=>key;}register(release){this.releases.push(release);}registerEvent(ref){this.register(()=>ref.release?.());}registerView(id,create){views.set(id,create);this.register(()=>views.delete(id));}registerDomEvent(){}registerHoverLinkSource(){}registerEditorSuggest(){calls.push('suggest');}addRibbonIcon(_id,_label,run){this.ribbon=run;}registerInterval(){}loadData(){calls.push('load');return data;}unload(){if(!this._loaded)return;this._loaded=false;for(const release of this.releases.splice(0))release();this.onunload();}}
 let resolveCss,rejectCss,enteredCss,cssAttached=false;
 const css=new Promise((resolve,reject)=>{resolveCss=resolve;rejectCss=reject;}),cssEntered=new Promise(resolve=>{enteredCss=resolve;});
 if(nativeCss)Object.defineProperty(NativePlugin.prototype,'loadCSS',{configurable:true,writable:true,value:function(...args){calls.push(['css',this,args]);enteredCss();return css.then(value=>{cssAttached=true;this.register(()=>{cssAttached=false;});return value;});}});
 class Index{constructor(owner){this.owner=owner;calls.push(['index',owner.settings.lastActivePath]);}primeSavedNavigation(paths){calls.push(['prime',paths]);}invalidateHostStructure(){calls.push('structure');}observeDeferredHostChange(...args){calls.push(['observe',...args]);}async refreshUrlOwner(path){calls.push(['url',path]);}notifyPresentation(){calls.push('presentation');}destroy(){calls.push('index-dispose');}}
 class Tab{disposeOntologySettings(){}disposeActionSettings(){}}
 const dependencies={NativePlugin,window:mainWindow,installNativeStartupGate:nativeStartupGateFor(mainWindow),NodeLinkClipboard:class{dispose(){}},LocalVideoThumbnails,createObsidianTranslator:()=>key=>key,TFile:File,TFolder:Folder,
  migrateAndMergeSettings:raw=>structuredClone(raw),startupIndexPolicy:settings=>({device:'desktop',mode:settings.indexingMode,beforeView:false}),readObsidianPresentationEnvironment:()=>({device:'desktop',keyConvention:'windows'}),migrateActionPreferences:raw=>({preferences:raw.actionPreferences,migrated:false,issues:[],skippedDefaults:[]}),captureSettingsPolicy:()=>({}),classifySettingsChange:()=>({render:false,nodeVisuals:false,semanticInvalidation:false}),appearanceThemes:pinContracts,STYLE_SETTINGS_KEYS:pinContracts.STYLE_SETTINGS_KEYS,isPeriodicPin:pinContracts.isPeriodicPin,resolveSavedPins:pinContracts.resolveSavedPins,GraphIndex:Index,
  createPublicApi:owner=>{calls.push('api');return{api:{v1:{configuration:{list:()=>owner.settings.lastActivePath}}},canvases:{},dispose(){calls.push('api-dispose');}};},publishPublicApiWindows:(_workspace,api)=>{mainWindow.kplexApi=api;return()=>{delete mainWindow.kplexApi;};},fixedPinPaths:()=>[],KPLEX_VIEW_TYPE:'plex',KPLEX_SIDEPANEL_VIEW_TYPE:'sidebar',KplexSettingTab:Tab,KplexView:class{},KplexSidepanelView:class{},OntologySuggester:class{},Notice:class{constructor(message){notices.push(message);}},console:{error:(...args)=>errors.push(args)},registerFileMenus(){}};
 const js=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,Type=Function(...Object.keys(dependencies),js+';return InitializingPlugin;')(...Object.values(dependencies)),owner=new Type();
 Object.assign(owner,{supportEvents:{record(){},dispose(){}},startupDiagnostics:{begin(){},mark(){},observeActivityBoundary(){},dispose(){}},fileCreationAutomation:{dispose(){}},startIndexingHistory(){},initializeSettingsReconciliation(){calls.push('reconciliation');},registerSavedPathListeners(){},refreshPeriodicPins(){},stopPeriodicPinTimer(){},initializeActions(){calls.push('actions');this.actionManager={dispose(){}};},dismissKplexMenu(){},restoreCollapsedPlex(){},registerOntologyContextMenu(){},updateStyleSettings:async()=>{},captureAppearanceOwner:()=>({}),prepareIndexIfRequested(){},addSettingTab(){calls.push('settings-tab');}});
 const saved={kplexInitialized:true,lastActivePath:'Saved.md',navigationHistory:[],pinnedNodes:[],actionPreferences:{},indexUpdateInterval:0,indexingMode:'on-demand',futureSetting:{keep:true}};
 const runStartup=()=>{const entry=[...jobs].find(([,job])=>job.delay===0);if(entry){jobs.delete(entry[0]);entry[1].callback();}};
 return{owner,workspace,vault,files,File,mainWindow,calls,notices,errors,views,jobs,runStartup,cssEntered,resolveCss,rejectCss,get cssAttached(){return cssAttached;},ready(){nativeReady=true;for(const callback of [...readyCallbacks]){readyCallbacks.delete(callback);callback();}},resolve:raw=>resolveData(raw??saved),reject:rejectData,saved};
}

test('already-ready startup waits for native CSS and yields past the host clock continuation before reading saved settings',async()=>{
 const f=asyncInitializationFixture({nativeCss:true}),argument={native:true},value={cssComplete:true};
 const host=(async()=>{await f.owner.onload();f.runStartup();const result=await f.owner.loadCSS(argument);f.calls.push('host-clock-finished');return result;})();
 try{
  await f.cssEntered;assert(!f.calls.includes('load'),'Workspace readiness alone must not overlap the native CSS wait with settings initialization');
  assert.equal([...f.jobs.values()].filter(job=>job.delay===0).length,0);
  f.resolveCss(value);assert.equal(await host,value);assert(!f.calls.includes('load'),'The host promise/clock continuation must finish before the owned startup task');
  assert.equal([...f.jobs.values()].filter(job=>job.delay===0).length,1);assert.equal(f.calls.find(call=>Array.isArray(call)&&call[0]==='css')[1],f.owner);assert.deepEqual(f.calls.find(call=>Array.isArray(call)&&call[0]==='css')[2],[argument]);
  f.runStartup();assert.equal(f.calls.filter(call=>call==='load').length,1);f.resolve();assert.equal(await f.owner.whenInitialized(),true);
  assert(f.calls.indexOf('host-clock-finished')<f.calls.indexOf('load'));
 }finally{f.resolveCss(value);f.resolve();await host;f.owner.unload();f.jobs.clear();}
});

test('native CSS rejection settles existing service readiness false and preserves the host error without another Notice',async()=>{
 const f=asyncInitializationFixture({nativeCss:true}),failure=Error('Controlled native CSS read failure');
 try{
  await f.owner.onload();const css=f.owner.loadCSS(),rejected=assert.rejects(css,error=>error===failure);f.rejectCss(failure);await rejected;
  assert.equal(await f.owner.whenInitialized(),false);assert.equal(f.owner.initializationTask,null);assert(!f.calls.includes('load'));
  assert.deepEqual(f.notices,[]);assert.deepEqual(f.errors,[]);f.ready();f.runStartup();assert(!f.calls.includes('load'));
 }finally{f.owner.unload();f.jobs.clear();}
});

for(const phase of ['before-css','during-css','before-workspace','queued'])test('native startup admission retires on unload '+phase+' and late CSS owns no style or services',async()=>{
 const f=asyncInitializationFixture({nativeCss:true,layoutReady:phase!=='before-workspace'});let css,lateTask;
 try{
  await f.owner.onload();assert(!f.calls.includes('load'));
  if(phase==='before-css')f.owner.unload();
  css=f.owner.loadCSS();await f.cssEntered;
  if(phase==='during-css')f.owner.unload();
  f.resolveCss('native-result');assert.equal(await css,'native-result');
  if(phase==='queued'){
    const pending=[...f.jobs.values()].filter(job=>job.delay===0);assert.equal(pending.length,1);lateTask=pending[0].callback;
  }
  if(phase==='before-workspace')assert.equal([...f.jobs.values()].filter(job=>job.delay===0).length,0);
  f.owner.unload();f.ready();lateTask?.();f.runStartup();
  assert.equal(await f.owner.whenInitialized(),false);assert(!f.calls.includes('load'));assert.equal(f.owner.initializationTask,null);
  assert.equal(f.cssAttached,false,'A late native stylesheet registration must dispose through the retired Component');
  assert.equal(Object.hasOwn(f.owner,'loadCSS'),false);assert.equal([...f.jobs.values()].filter(job=>job.delay===0).length,0);
 }finally{f.resolveCss('native-result');await css;f.owner.unload();f.jobs.clear();}
});

/** Execute the real adapter with only native workspace/task/registration ports. */
function gateFixture({ready=true,descriptor}={}){
 const jobs=new Map(),releases=[],calls=[],callbacks=[];let serial=0;
 const owner={register:cleanup=>releases.push(cleanup)},window={setTimeout(callback,delay){assert.equal(delay,0);const id=++serial;jobs.set(id,callback);return id;},clearTimeout:id=>jobs.delete(id)};
 if(descriptor)Object.defineProperty(owner,'loadCSS',descriptor);
 const install=nativeStartupGateFor(window);install(owner,{onLayoutReady:callback=>{if(ready)callback();else callbacks.push(callback);}},()=>calls.push('start'),()=>calls.push('failed'));
 return{owner,jobs,calls,ready(){for(const callback of callbacks.splice(0))callback();},run(){const entry=jobs.entries().next().value;if(entry){jobs.delete(entry[0]);entry[1]();}},close(){for(const cleanup of releases.splice(0))cleanup();}};
}

test('native CSS observation preserves exact Promise, receiver, arguments and own descriptor',async()=>{
 let resolve,receiver,args;const promise=new Promise(done=>{resolve=done;}),native=function(...values){receiver=this;args=values;return promise;};
 const descriptor={configurable:true,enumerable:true,writable:true,value:native},f=gateFixture({descriptor});
 try{
  assert.notEqual(f.owner.loadCSS,native);const value={},returned=f.owner.loadCSS(value,7);
  assert.equal(returned,promise);assert.equal(receiver,f.owner);assert.deepEqual(args,[value,7]);assert.deepEqual(Object.getOwnPropertyDescriptor(f.owner,'loadCSS'),descriptor);
  resolve(value);assert.equal(await returned,value);assert.deepEqual(f.calls,[]);assert.equal(f.jobs.size,1);f.run();assert.deepEqual(f.calls,['start']);
 }finally{f.close();assert.deepEqual(Object.getOwnPropertyDescriptor(f.owner,'loadCSS'),descriptor);}
});

test('native CSS cleanup never replaces a successor instance wrapper',()=>{
 const native=()=>undefined,successor=()=>undefined,f=gateFixture({descriptor:{configurable:true,writable:true,value:native}});
 Object.defineProperty(f.owner,'loadCSS',{configurable:true,writable:true,value:successor});f.close();f.ready();f.run();
 assert.equal(f.owner.loadCSS,successor);assert.deepEqual(f.calls,[]);assert.equal(f.jobs.size,0);
});

test('native synchronous CSS throw is preserved and cannot admit initialization',()=>{
 const error=Error('Synchronous native CSS failure'),native=()=>{throw error;},f=gateFixture({descriptor:{configurable:true,writable:true,value:native}});
 try{assert.throws(()=>f.owner.loadCSS(),value=>value===error);assert.deepEqual(f.calls,['failed']);f.ready();f.run();assert.equal(f.jobs.size,0);}finally{f.close();}
});

for(const mode of ['missing','non-function','read-only'])test('unavailable native CSS observation retains functional workspace/task fallback: '+mode,()=>{
 const native=()=>undefined,descriptor=mode==='missing'?undefined:mode==='non-function'?{configurable:true,enumerable:false,writable:true,value:7}:{configurable:false,enumerable:false,writable:false,value:native};
 const f=gateFixture({ready:false,descriptor});try{
  assert.equal(f.jobs.size,0);assert.deepEqual(f.calls,[]);f.ready();assert.equal(f.jobs.size,1);assert.deepEqual(f.calls,[]);f.run();assert.deepEqual(f.calls,['start']);
  assert.deepEqual(Object.getOwnPropertyDescriptor(f.owner,'loadCSS'),descriptor);
 }finally{f.close();}
});

for(const retire of [false,true])test('cold startup admits saved-settings initialization only after native workspace readiness: '+retire,async()=>{
 const f=asyncInitializationFixture({layoutReady:false});try{
  await f.owner.onload();f.runStartup();assert.equal(f.views.size,2);assert.equal(typeof f.owner.ribbon,'function');
  assert(!f.calls.includes('load'),'A cold native onload must not start even the settings read before workspace readiness');assert.equal(f.owner.initializationTask,null);
  let settled=false;const readiness=f.owner.whenInitialized().then(value=>{settled=true;return value;});
  f.resolve();await Promise.resolve();assert.equal(settled,false);assert.equal(f.owner.api,null);assert.equal(f.owner.index,undefined);
  const file=new f.File('Pending.md');f.files.set(file.path,file);f.vault.emit('modify',file);f.files.delete(file.path);file.path='Renamed.md';f.files.set(file.path,file);f.vault.emit('rename',file,'Pending.md');
  const deleted=new f.File('Deleted.md');f.files.set(deleted.path,deleted);f.files.delete(deleted.path);f.vault.emit('delete',deleted);
  assert.equal(f.owner.initializationSourceChanges.get(file),'Pending.md','The existing early fence must retain genuine edits throughout the longer workspace wait');
  assert(f.owner.initializationSourceChanges.has(deleted));assert(f.owner.preRestoreReasons.has('vault:delete'));
  if(retire){f.owner.unload();assert.equal(await readiness,false);f.ready();await Promise.resolve();assert(!f.calls.includes('load'));assert.equal(f.owner.initializationTask,null);assert.equal(f.views.size,0);return;}
  f.ready();assert(!f.calls.includes('load'),'Workspace completion queues the owned admission task rather than entering it inline');f.runStartup();assert.equal(f.calls.filter(call=>call==='load').length,1);
  assert.equal(await readiness,true);assert.equal(f.owner.settings.lastActivePath,'Saved.md');assert.equal(f.owner.api.v1.configuration.list(),'Saved.md');
  assert(f.calls.some(call=>Array.isArray(call)&&call[0]==='observe'&&call[1]===file&&call[2]===true&&call[3]==='Pending.md'));
  assert(f.calls.some(call=>Array.isArray(call)&&call[0]==='observe'&&call[1]===deleted&&call[2]===true));
  f.ready();assert.equal(f.calls.filter(call=>call==='load').length,1,'Native readiness has one initialization owner');
 }finally{f.owner.unload();f.jobs.clear();}
});

test('async settings leave onload promptly while API, editor, actions and saved configuration await the native data owner',async()=>{
 const f=asyncInitializationFixture();try{
  await f.owner.onload();f.runStartup();assert.equal(f.views.size,2);assert.equal(f.owner.api,null);assert.equal(f.mainWindow.kplexApi,undefined);assert.equal(f.owner.index,undefined);assert(!f.calls.includes('actions'));assert(!f.calls.includes('suggest'));
  let settled=false;const ready=f.owner.whenInitialized().then(value=>{settled=true;return value;});await Promise.resolve();assert.equal(settled,false);
  f.owner.onExternalSettingsChange();assert.equal(f.owner.externalSettingsPending,true,'An early external receipt must survive until the existing reconciliation owner initializes');
  f.resolve();assert.equal(await ready,true,JSON.stringify(f.errors.map(args=>args.map(value=>value instanceof Error?value.stack:value))));assert.equal(f.owner.api.v1.configuration.list(),'Saved.md');assert.equal(f.mainWindow.kplexApi,f.owner.api);assert.deepEqual(f.owner.settings.futureSetting,{keep:true});
  assert(f.calls.includes('actions')&&f.calls.includes('suggest'));assert.deepEqual(f.calls.find(call=>Array.isArray(call)&&call[0]==='index'),['index','Saved.md']);
 }finally{f.owner.unload();assert.equal(await f.owner.whenInitialized(),false,'A retained initialized instance must report retirement after unload');f.jobs.clear();}
});

for(const retire of [false,true])test('external symbolic-pin settings can publish during held migration before index construction, preserving timer ownership and later refresh: '+retire,async()=>{
 const f=asyncInitializationFixture();let releaseMigration,enteredMigration;
 const entered=new Promise(resolve=>{enteredMigration=resolve;}),migration=new Promise(resolve=>{releaseMigration=resolve;});
 delete f.owner.refreshPeriodicPins;delete f.owner.stopPeriodicPinTimer;
 f.owner.persistSettingsSnapshot=()=>{enteredMigration();return migration;};
 f.owner.periodicPinRuntime={now:()=>0,format:()=> '2026-11-14',dailyNotes:()=>null,fileExists:path=>f.files.has(path),fixedAvailable:()=>true};
 try{
  await f.owner.onload();f.runStartup();f.resolve({...f.saved,kplexInitialized:false});await entered;
  assert.equal(f.owner.index,undefined);
  const incoming={...f.saved,pinnedNodes:[{kind:'periodic',period:'day'}],periodicPinSettings:{...pinContracts.DEFAULT_PERIODIC_PIN_SETTINGS,day:{...pinContracts.DEFAULT_PERIODIC_PIN_SETTINGS.day,folder:'Daily',useDailyNotes:false}},futureSetting:{keep:'external'}};
  assert.doesNotThrow(()=>f.owner.installExternalSettings(incoming),'The synchronous external-settings owner must not require an index during its real pre-construction migration wait');
  await Promise.resolve();assert.equal(f.owner.index,undefined);assert.deepEqual(f.owner.settings.futureSetting,{keep:'external'});
  assert.equal([...f.jobs.values()].filter(job=>job.delay===60000).length,1);assert(!f.calls.includes('presentation'));
  if(retire){
    f.owner.unload();assert.equal(await f.owner.whenInitialized(),false);
    assert.equal([...f.jobs.values()].filter(job=>job.delay===60000).length,0,'Unload during held migration must cancel a clock acquired by accepted external settings before index construction');
    releaseMigration();await f.owner.initializationTask;assert.equal(f.owner.index,undefined);return;
  }
  const priorTimer=f.owner.periodicPinTimer;releaseMigration();assert.equal(await f.owner.whenInitialized(),true);
  assert(!f.jobs.has(priorTimer),'Ordinary post-construction initialization still refreshes the same bounded clock');
  assert.equal([...f.jobs.values()].filter(job=>job.delay===60000).length,1);
  f.files.set('Daily/2026-11-14.md',new f.File('Daily/2026-11-14.md'));f.owner.refreshPeriodicPins();
  assert.equal(f.calls.filter(call=>call==='presentation').length,1,'After readiness an actual symbolic availability change retains ordinary presentation notification');
  f.owner.settings.pinnedNodes=[];f.owner.refreshPeriodicPins();assert.equal([...f.jobs.values()].filter(job=>job.delay===60000).length,0);
  assert.deepEqual(f.notices,[]);assert.deepEqual(f.errors,[]);
 }finally{releaseMigration();f.owner.unload();f.jobs.clear();}
});

for(const failure of [false,true])test('pending settings readiness settles false on '+(failure?'native read failure':'unload')+' without installing late services',async()=>{
 const f=asyncInitializationFixture();await f.owner.onload();f.runStartup();const ready=f.owner.whenInitialized();
 if(failure){f.reject(Error('Controlled load failure'));assert.equal(await ready,false);await f.owner.initializationTask;assert.equal(f.notices.length,1);assert.equal(f.errors.length,1);}else{f.owner.unload();assert.equal(await ready,false);f.resolve();await f.owner.initializationTask;}
 assert.equal(f.owner.index,undefined);assert.equal(f.owner.api,null);assert.equal(f.mainWindow.kplexApi,undefined);assert.equal(f.views.size,0);assert(!f.calls.includes('actions'));f.jobs.clear();
});

for(const retire of [false,true])test('early explicit native opening joins saved initialization and never allocates after retirement: '+retire,async()=>{
 const f=asyncInitializationFixture(),opened=[];try{
  Object.assign(f.workspace,{getMostRecentLeaf:()=>null,getLeaf:kind=>{const leaf={setViewState:async state=>{leaf.state=state;}};opened.push({kind,leaf});return leaf;},revealLeaf:async leaf=>{leaf.revealed=true;}});
  f.owner.rememberDocumentLeaf=()=>{};f.owner.restorePlexFoldBeforeReveal=()=>{};
  await f.owner.onload();f.runStartup();const intent=f.owner.activateView('leaf');await Promise.resolve();assert.equal(opened.length,0);
  if(retire)f.owner.unload();f.resolve();await intent;await f.owner.initializationTask;
  assert.equal(opened.length,retire?0:1);if(!retire){assert.equal(opened[0].kind,true);assert.deepEqual(opened[0].leaf.state,{type:'plex',active:true});assert.equal(opened[0].leaf.revealed,true);}
 }finally{f.owner.unload();f.jobs.clear();}
});

test('pending native host events retain the existing exact pre-restore observations until saved services exist',async()=>{
 const f=asyncInitializationFixture();try{
  await f.owner.onload();f.runStartup();const created=new f.File('Created.md'),old=new f.File('Saved.md');f.files.set(created.path,created);f.files.set(old.path,old);
  f.vault.emit('create',created);f.vault.emit('modify',created);f.files.delete(old.path);f.vault.emit('delete',old);
  f.files.delete(created.path);created.path='Renamed.md';f.files.set(created.path,created);f.vault.emit('rename',created,'Created.md');
  assert.equal(f.owner.index,undefined);assert(f.owner.preRestoreReasons.has('vault:delete'));assert(f.owner.preRestoreReasons.has('vault:rename'));assert(f.owner.preRestoreActualMarkdownChanges.has('Created.md'));assert(!f.owner.preRestoreCreatedItems.has('Created.md'));
  assert(!f.calls.includes('structure'),'Pending-load events cannot process default-policy index effects');f.resolve();assert.equal(await f.owner.whenInitialized(),true);
  const replay=f.calls.filter(call=>Array.isArray(call)&&call[0]==='observe');
  assert.deepEqual(replay.map(([,file,dirty,oldPath])=>[file.path,dirty,oldPath]),[['Renamed.md',true,'Created.md'],['Saved.md',true,undefined]],'Only genuine pending body/identity edits replay once into the dormant source owner, retaining the exact renamed native identity');
  assert.equal(replay[0][1],created);assert.equal(replay[1][1],old);assert.equal(f.owner.initializationSourceChanges.size,0);
  assert(f.owner.preRestoreReasons.has('vault:delete'),'Creating the index must not discard the saved-center deletion observation');
  f.vault.emit('modify',created);assert(f.calls.some(call=>Array.isArray(call)&&call[0]==='observe'&&call[1]===created),'The same listener hands subsequent work to the real index capability');
 }finally{f.owner.unload();f.jobs.clear();}
});

test('native CSS finishing after unloaded or failed bootstrap releases its late registration immediately',async()=>{
 for(const failure of [false,true]){
  const f=asyncInitializationFixture();await f.owner.onload();f.runStartup();let releaseCss,attached=false;
  const css=new Promise(resolve=>{releaseCss=resolve;}).then(()=>{attached=true;f.owner.register(()=>{attached=false;});});
  if(failure){f.reject(Error('Held data failure'));await f.owner.initializationTask;}else f.owner.unload();
  releaseCss();await css;assert.equal(attached,false,'The native loadCSS continuation must not leave a style after Component already drained its events');
  assert.equal(f.owner.releases.length,0);assert.equal(await f.owner.whenInitialized(),false);
  if(!failure){f.resolve();await f.owner.initializationTask;}f.jobs.clear();
 }
});

/** Native shell/session code remains actual source; only render/native host services are finite ports. */
function pendingViewFixture({initialization}={}){
 const read=(path,name)=>{const file=ts.createSourceFile(path,readFileSync(new URL('../'+path,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);return file.statements.find(node=>(ts.isClassDeclaration(node)||ts.isFunctionDeclaration(node))&&node.name?.text===name).getText(file).replace(/^export /,'');};
 const docText=read('src/ui/KplexDocumentSession.ts','KplexDocumentSession'),centerText=read('src/ui/KplexCenterPresentation.ts','KplexCenterPresentation'),viewText=read('src/ui/KplexView.tsx','BaseKplexView');
 let resolveReady;const pending=new Promise(resolve=>{resolveReady=resolve;}),calls=[],attrs=new Map(),doc=Object.assign(new EventTarget(),{defaultView:new EventTarget(),visibilityState:"visible",hasFocus:()=>false}),content={ownerDocument:doc,empty(){},addClass(){},toggleClass(){},setAttribute:(key,value)=>attrs.set(key,value),removeAttribute:key=>attrs.delete(key),createDiv:options=>{calls.push(['message',options.text]);}};
 const eventPort={on:()=>({}),offref(){}},leaf={id:'leaf-A',containerEl:{ownerDocument:doc,isConnected:true},contentEl:content};leaf.app={scope:{},workspace:{...eventPort,getActiveViewOfType:()=>null,getLeafById:id=>id===leaf.id?leaf:null,requestSaveLayout:()=>{throw Error('Restore wrote workspace defaults');}},vault:{...eventPort,getFileByPath:path=>({basename:path})}};
 const settings={documentSyncMode:'recent',sidecarPosition:'left',sidecarMarkdownMode:'preview',embedCentralNode:true,centralNodeMarkdownMode:'preview'};let authoritative=false;
 const plugin={get settings(){if(initialization)return initialization.settings;if(!authoritative)throw Error('Read default settings before authority');return settings;},translator:key=>key,whenInitialized:()=>initialization?initialization.whenInitialized():pending,restorePlexFoldBeforeReveal(){},refreshIndexActivity(){},onKplexViewStateRestored(){calls.push('restored');},onKplexViewOpened:async()=>{calls.push('opened');},onKplexViewClosed(){calls.push('closed');}};
 class ItemView{constructor(owner){this.leaf=owner;this.app=owner.app;this.containerEl=owner.containerEl;this.contentEl=owner.contentEl;}async onOpen(){}async onClose(){}getState(){return{native:'preserved'};}async setState(){}}
 class Display{constructor(element){calls.push(['display-document',element.ownerDocument]);}ownCleanup(){}dispose(){}exitFullscreen(){}setHostActive(){}}
 const dependencies={ItemView,Scope:class{},KplexDocumentSession:null,KplexCenterPresentation:null,PlexViewSession:class{restore(value){this.value=value;}getState(){return this.value??{};}dispose(){}},PlexFootprints:class{dispose(){}},builtInPlexViews:{},nodeId:value=>value,nativeLeafId:(workspace,owner)=>workspace.getLeafById(owner.id)===owner?owner.id:null,KplexDisplayModes:Display,readObsidianPresentationEnvironment:()=>({device:'desktop'}),registerDisplayModeUnload:()=>()=>{},createRoot:()=>({render:node=>{calls.push('render');node.props.onReady();},unmount(){}}),KplexApp:()=>{},exports:{},require:()=>({jsx:(type,props)=>({type,props})}),console};
 const code=ts.transpileModule(docText+'\n'+centerText+'\n'+viewText,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 delete dependencies.KplexDocumentSession;delete dependencies.KplexCenterPresentation;
 const Type=Function(...Object.keys(dependencies),code+';return BaseKplexView;')(...Object.values(dependencies)),view=new Type(leaf,plugin);view.getSurface=()=> 'leaf';leaf.view=view;
 return{view,leaf,content,attrs,calls,settings,resolve:value=>{authoritative=value;resolveReady(value);}};
}

test('native loading view open and state restoration finish before CSS/workspace readiness without deadlocking service initialization',async()=>{
 const f=asyncInitializationFixture({layoutReady:false,nativeCss:true}),v=pendingViewFixture({initialization:f.owner});
 try{
  await f.owner.onload();f.runStartup();await v.view.onOpen();await v.view.setState({plexSession:{version:1,ownerId:'leaf-A',centerPath:'Restored.md',sidecarPosition:'below'}},{});
  assert.equal(v.view.documentSession,null);assert(!f.calls.includes('load'));assert(!v.calls.includes('render'));assert.equal(v.view.getState().plexSession.centerPath,'Restored.md');
  const css=f.owner.loadCSS();f.resolveCss();await css;assert(!f.calls.includes('load'));
  f.resolve({...f.saved,...v.settings});f.ready();f.runStartup();assert.equal(await f.owner.whenInitialized(),true);await v.view.waitUntilReady();
  assert(v.calls.includes('render'));assert.equal(v.view.documentSession.centerPath,'Restored.md');assert.equal(v.view.documentSession.preferences.sidecarPosition,'below');assert.equal(v.view.getState().centerPresentation.centralNodeMarkdownMode,'preview');
 }finally{await v.view.onClose();f.owner.unload();f.jobs.clear();}
});

test('pending native view preserves detached nested state and initializes defaults only from saved authority',async()=>{
 const f=pendingViewFixture(),state={future:{nested:['unchanged']},centerPresentation:{embedCentralNode:false},plexSession:{version:1,ownerId:'leaf-A',centerPath:'Saved.md',documentSyncMode:'pinned',sidecarPosition:'below'}};
 await f.view.onOpen();await f.view.setState(state,{});assert.equal(f.view.documentSession,null);assert.equal(f.attrs.get('aria-busy'),'true');
 state.future.nested[0]='mutated';state.plexSession.centerPath='Changed.md';const read=f.view.getState();assert.deepEqual(read.future,{nested:['unchanged']});assert.equal(read.plexSession.centerPath,'Saved.md');read.future.nested[0]='external';assert.equal(f.view.getState().future.nested[0],'unchanged');
 const ready=f.view.waitUntilReady();f.leaf.containerEl.isConnected=false;const adopted=Object.assign(new EventTarget(),{defaultView:new EventTarget(),visibilityState:"visible",hasFocus:()=>false});f.content.ownerDocument=adopted;f.leaf.containerEl.ownerDocument=adopted;
 f.resolve(true);await ready;assert.equal(f.view.documentSession.centerPath,'Saved.md');assert.equal(f.view.documentSession.preferences.documentSyncMode,'pinned');assert.equal(f.view.documentSession.preferences.sidecarPosition,'below');assert.equal(f.view.getState().centerPresentation.centralNodeMarkdownMode,'preview');assert.equal(f.view.getState().centerPresentation.embedCentralNode,false);
 assert(f.calls.includes('render'));assert.equal(f.calls.find(call=>Array.isArray(call)&&call[0]==='display-document')[1],adopted,'A still-current detached leaf mounts in its latest adopted document');f.leaf.containerEl.isConnected=true;await f.view.onClose();
});

for(const terminal of ['close','replacement','failure'])test('pending native view releases waiters after '+terminal+' without late rendering or default session construction',async()=>{
 const f=pendingViewFixture();await f.view.onOpen();await f.view.setState({future:{kept:true}},{});const ready=f.view.waitUntilReady();
 if(terminal==='close')await f.view.onClose();if(terminal==='replacement')f.leaf.view={};f.resolve(terminal!=='failure');await ready;
 assert.equal(f.view.documentSession,null);assert(!f.calls.includes('render'));assert.equal(f.view.getState().future.kept,true);
 if(terminal==='failure')assert(f.calls.some(call=>Array.isArray(call)&&call[1]==='startup.failed'));if(terminal!=='close')await f.view.onClose();
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
function fixture({failure=false,previous,asynchronous=false}={}){
 const inputs=asynchronous?{...sources,main:sources.main.replace('this.translator = createObsidianTranslator();',`this.translator = createObsidianTranslator();
 this.task=this.initializePlugin().then(()=>this.finishInitialization(true),()=>this.finishInitialization(false));
 }
 finishInitialization(ready){this.initializationComplete = ready;}
 private async initializePlugin(): Promise<void> {`)}:sources;
 const instrumented=instrumentInitiationSources(inputs),calls=[],window={};
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

for(const failure of [false,true])test('async initiation profile retains later work through truthful services settlement: '+failure,async()=>{
 const f=fixture({asynchronous:true,failure});await f.task;
 const controller=f.window.kplexStartupInitiation,early=controller.snapshot();
 assert(early.events.some(event=>event.phase==='onload:exit'));assert.equal(early.active,true);
 assert(!early.events.some(event=>event.phase==='loadData:exit'),'Returning onload cannot erase the still-pending native read');
 f.settle();await f.plugin.task;const receipt=controller.snapshot(),phases=receipt.events.map(event=>event.phase);
 assert.equal(receipt.active,false);assert.equal(phases.at(-1),failure?'services:unavailable':'services:ready');
 assert(phases.indexOf('onload:exit')<phases.indexOf('initialization:exit'));
 if(!failure){assert(phases.indexOf('loadData:exit')>phases.indexOf('onload:exit'));assert(phases.includes('actions:exit'));assert(phases.includes('GraphIndex:exit'));}
 for(const release of f.plugin.releases)release();assert.equal(f.window.kplexStartupInitiation,undefined);
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
