/** Actual native loading-leaf and settings-readiness acceptance in the disposable Small vault.
 * The existing fixture owns native layout/settings cleanup; the staging caller owns exact artifacts
 * and independent restoration. Settings reads are held or rejected, never replaced with defaults. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {acquireHostLock} from './hostLock.mjs';
import {runControlledProbe} from './controlledProbe.mjs';
import {validateTarget} from './runner.mjs';
import {nativeBatch270} from './nativeBatch270.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';

/** Hold real native reads while exercising actual enable, registered views and early opening intent. */
async function initialization(app,c){
 const f=c.fixture(app,c),cases=[];let prototype=Object.getPrototypeOf(f.p);
 while(prototype&&!Object.hasOwn(prototype,'loadData'))prototype=Object.getPrototypeOf(prototype);
 const descriptor=Object.getOwnPropertyDescriptor(prototype,'loadData');
 f.check(typeof descriptor?.value==='function','Actual native Plugin.loadData owner');
 const original=descriptor.value,readRaw=app.vault.readRaw,rawDescriptor=Object.getOwnPropertyDescriptor(app.vault,'readRaw');
 let release,releaseCss,mode='normal',pendingOwner,cssText,cssWrapper,enabling;
 c.release=()=>{release?.();releaseCss?.();};
 const wrapper=async function(...args){
  if(this.manifest.id!=='k-plex')return original.apply(this,args);
  if(mode==='reject')throw Error('Owned initialization failure');
  const data=await original.apply(this,args);
  if(mode==='hold'){pendingOwner=this;await new Promise(resolve=>{release=resolve});}
  return data;
 };
 const restore=()=>{if(prototype.loadData===wrapper)Object.defineProperty(prototype,'loadData',descriptor);};
 try{
  await f.initialize();
  await f.p.updateOntologyField('parents',['BootstrapParent'],[...f.p.settings.hierarchy.parents],()=>true);
  const a=await f.note('Target A'),b=await f.note('Target B'),seed=await f.note('Bootstrap source','BootstrapParent:: [[Target A]]\n');
  await f.canvas(seed);await f.ready();
  // Ordinary edits persist after the production five-minute idle period; never force that timer.
  await f.until(()=>f.p.index.get(seed.path)?.neighbours.has(a.path)&&!f.p.getIndexStatus().cacheSavePending&&!f.p.index.getSourceRepositoryDiagnostics().unsaved,'Durable baseline body before held settings',420000);
  Object.defineProperty(prototype,'loadData',{...descriptor,value:wrapper});
  for(const retired of [false,true]){
   mode='hold';release=undefined;pendingOwner=undefined;
   await app.plugins.disablePlugin('k-plex');
   await app.plugins.enablePlugin('k-plex');
   const p=app.plugins.plugins['k-plex'];
   f.check(p&&typeof p.whenInitialized==='function','New instance exposes readiness');
   await f.until(()=>pendingOwner===p&&typeof release==='function','Actual settings read is held');
   f.check(!p.index&&p.api===null,'No default-backed graph or API is published while settings are pending');
   let readiness='pending';p.whenInitialized().then(value=>{readiness=value});
   const leaf=app.workspace.getLeaf('tab');f.leaves.push(leaf);
   const state={centerPresentation:{embedCentralNode:false,centralNodeMarkdownMode:'preview'},plexSession:{version:1,ownerId:leaf.id,centerPath:seed.path,targetId:null,documentSyncMode:'off',sidecarOpen:false,sidecarPosition:'left',sidecarLastFilePath:'',sidecarLastUrl:'',sidecarMarkdownMode:'preview'},futureWorkspaceField:{keep:true}};
   await leaf.setViewState({type:'k-plex-react-view',state,active:true});
   await app.workspace.revealLeaf(leaf);
   const view=leaf.view;
   f.check(view.getViewType()==='k-plex-react-view'&&!view.documentSession,'The registered native view is a real loading shell');
   f.check(JSON.stringify(view.getState())===JSON.stringify(state),'Pending native state round-trips exactly');
   f.check(!view.contentEl.querySelector('.kplex-app'),'React is not mounted against temporary settings');
   let opened=false;const opening=p.activateView().then(()=>{opened=true});
   await f.wait(40);f.check(readiness==='pending'&&!opened,'Early opening intent waits for settings/services');
   let equalStatReceipt;
   if(!retired){
    let events=0;const observed=app.vault.on('modify',file=>{if(file===seed)events++;});
    f.restores.push(()=>app.vault.offref(observed));
    const stat={...seed.stat};await app.vault.modify(seed,'BootstrapParent:: [[Target B]]\n',{mtime:stat.mtime,ctime:stat.ctime});
    f.check(seed.stat.mtime===stat.mtime&&seed.stat.size===stat.size,'The owned body edit actually preserves its native stat');
    f.check(await app.vault.readRaw(seed.path)==='BootstrapParent:: [[Target B]]\n','The owned equal-stat bytes are durable');
    await f.wait(100);const automaticEvents=events;
    // Equal-stat writes may be suppressed by the filesystem watcher. Exercise delivery through
    // its actual native entry point explicitly; this is controlled admission, not watcher coverage.
    if(events===0)app.vault.onChange('modified',seed.path,undefined,{...seed.stat});
    f.check(events>0&&p.initializationSourceChanges.has(seed),'A delivered pre-index body event is retained');
    equalStatReceipt={automaticEvents,controlledNativeEvent:automaticEvents===0};app.vault.offref(observed);
   }
   const resume=release;
   if(retired){
    await app.plugins.disablePlugin('k-plex');
    f.check(await p.whenInitialized()===false,'Unload settles pending readiness false');
    resume();await opening;await f.wait(40);
    f.check(!p.index&&p.api===null,'Late native data cannot publish into a retired instance');
    cases.push({retired,loadingStatePreserved:true,latePublicationRejected:true});
   }else{
    mode='normal';resume();f.check(await p.whenInitialized()===true,'Saved settings and services finish');await opening;
    await view.waitUntilReady();
    f.check(leaf.view===view&&!!view.documentSession,'The same native leaf/view becomes ready');
    const restored=view.getState();
    f.check(restored.plexSession.centerPath===seed.path&&restored.plexSession.sidecarPosition==='left','Buffered saved session restores after readiness');
    f.check(restored.centerPresentation.embedCentralNode===false&&restored.centerPresentation.centralNodeMarkdownMode==='preview','Buffered center representation wins over defaults');
    f.check(!!p.index&&!!p.api&&opened,'Authoritative graph/API and queued opening become available');
    await f.until(()=>{const page=p.index.get(seed.path),next=page?.neighbours.get(b.path),previous=page?.neighbours.get(a.path);return next?.isParent&&next.parentType===1&&!(previous?.isParent&&previous.parentType===1);},'Delivered equal-stat body edit preserves the current defined relationship',120000);
    await f.until(()=>p.getIndexStatus().upToDate,'Initialized graph and authenticated sources settle after the held settings read',120000);
    // Semantic pair publication may evict the hot field entry. Read the authenticated source
    // body through its existing native/event fences instead of assuming that optional hot cache survives.
    const currentBody=await p.index.sourceAcquisition.readBody(seed);
    f.check(JSON.stringify(currentBody?.inlineFields.bootstrapparent)===JSON.stringify(['[[Target B]]']),'The authenticated parsed source body contains the new inline property: '+JSON.stringify({body:currentBody,status:p.getIndexStatus(),source:p.index.getSourceAcquisitionCounters()}));
    // Native metadata intentionally reuses equal-stat caches. A subsequent genuine owned write
    // advances its stat and completes that independent host parser before final graph settlement.
    await app.vault.modify(seed,'BootstrapParent:: [[Target B]]\n',{mtime:seed.stat.mtime+1,ctime:seed.stat.ctime});
    await f.until(()=>p.index.get(seed.path)?.neighbours.has(b.path)&&!p.index.get(seed.path)?.neighbours.has(a.path),'Native metadata completion removes the prior host-only link',120000);
    cases.push({retired,loadingStatePreserved:true,sameNativeView:true,earlyOpeningResumed:true,equalStatBodyEdit:equalStatReceipt});
   }
   mode='normal';if(leaf.view===view)leaf.detach();
   if(!app.plugins.plugins['k-plex'])await app.plugins.enablePlugin('k-plex');
   const live=app.plugins.plugins['k-plex'];if(live?.whenInitialized)f.check(await live.whenInitialized(),'Normal replacement initialization');
  }
  const cssPath=app.plugins.plugins['k-plex'].manifest.dir+'/styles.css';
  await app.plugins.disablePlugin('k-plex');mode='normal';
  const stylesBefore=new Set(document.head.querySelectorAll('style'));
  cssWrapper=async function(path,...args){const value=await readRaw.call(this,path,...args);if(path===cssPath){cssText=value;await new Promise(resolve=>{releaseCss=resolve});}return value;};
  app.vault.readRaw=cssWrapper;
  enabling=app.plugins.enablePlugin('k-plex');
  await f.until(()=>typeof releaseCss==='function','Actual native CSS loading is held');
  const held=app.plugins.plugins['k-plex'];f.check(held&&!held.index&&held.api===null,'Held CSS cannot publish settings-backed services');
  let cssReadiness='pending';held.whenInitialized().then(value=>{cssReadiness=value});await f.wait(40);
  f.check(cssReadiness==='pending','CSS must complete before deferred settings start');
  await app.plugins.disablePlugin('k-plex');f.check(await held.whenInitialized()===false,'Unload while CSS is held retires readiness');
  releaseCss();await enabling;enabling=undefined;await f.wait(40);
  f.check(!held.index&&held.api===null,'Released late CSS cannot publish retired services');
  f.check(![...document.head.querySelectorAll('style')].some(node=>!stylesBefore.has(node)&&node.textContent===cssText),'Late native CSS cannot outlive unloaded initialization');
  cases.push({cssHeld:true,settingsDeferred:true,unloadSettledFalse:true,lateCssReleased:true});
  if(app.vault.readRaw===cssWrapper){if(rawDescriptor)Object.defineProperty(app.vault,'readRaw',rawDescriptor);else delete app.vault.readRaw;}
  cssWrapper=undefined;releaseCss=undefined;
  await app.plugins.disablePlugin('k-plex');mode='reject';
  await app.plugins.enablePlugin('k-plex');
  const failed=app.plugins.plugins['k-plex'];f.check(failed&&await failed.whenInitialized()===false,'Read failure after native CSS settles terminal readiness');
  f.check(!failed.index&&failed.api===null,'Failed data does not publish default configuration');
  cases.push({loadFailure:true,settledFalse:true,noDefaultsPublished:true});
  return{cases};
 }catch(error){throw Error(String(error)+'; completed initialization cases: '+JSON.stringify(cases));}
 finally{
  mode='normal';release?.();releaseCss?.();delete c.release;restore();
  if(enabling)await enabling;
  if(app.vault.readRaw===cssWrapper){if(rawDescriptor)Object.defineProperty(app.vault,'readRaw',rawDescriptor);else delete app.vault.readRaw;}
  await app.plugins.disablePlugin('k-plex');await app.plugins.enablePlugin('k-plex');
  const live=app.plugins.plugins['k-plex'];if(live?.whenInitialized)f.check(await live.whenInitialized(),'Cleanup initialized normal plugin');
  await f.cleanup();
 }
}

const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const userDataPath=process.env.KPLEX_OBSIDIAN_USER_DATA??(process.platform==='win32'?join(process.env.APPDATA,'obsidian'):process.platform==='darwin'?join(homedir(),'Library','Application Support','obsidian'):join(process.env.XDG_CONFIG_HOME??join(homedir(),'.config'),'obsidian'));
const lock=acquireHostLock({userDataPath});
try{
 const definitions='c.fixture='+nativeBatch270.toString()+';c.sessions='+nativeDocumentSessions.toString()+';c.fixturePrefix="__kplex_init_";c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';';
 await runControlledProbe('async-initialization',initialization,definitions,['src/main.ts','src/ui/KplexView.tsx'],{maximumMs:900000});
}finally{lock.release();}
