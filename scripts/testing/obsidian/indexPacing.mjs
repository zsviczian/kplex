/** Exact-build native pacing/preemption and disposable cache lifecycle; never creates or edits vault notes. */
import {homedir} from 'node:os';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';
import {validateTarget} from './runner.mjs';
import {acquireHostLock} from './hostLock.mjs';

/** Exercise bundled constructors with their real main-window idle capability and private synthetic storage. */
async function scenario(app,c){
 const plugin=app.plugins.plugins['k-plex'];
 const assert=(condition,message)=>{if(!condition)throw Error(message);};
 assert(plugin,'Plugin loaded');
 const Scheduler=plugin.index.workScheduler.constructor,Cache=plugin.index.indexedDb.constructor;
 const pacing=plugin.index.workScheduler.pacing;
 assert(typeof pacing.scheduleIdle==='function','Bundled index injects the short-wait adapter');
 const schedulers=[],result={visibility:document.visibilityState,focused:document.hasFocus(),asyncWaitAvailable:typeof window.SharedArrayBuffer==='function'&&typeof window.Atomics?.waitAsync==='function',modes:[],cache:null};
 let cache,originalError,nativeWindow,originalWindow,focusLeaf,originalActive;
 /** Allocate only independent scheduler state; no plugin setting or active index is replaced. */
 const make=(mode,now=()=>performance.now(),isForeground=()=>true)=>{const scheduler=new Scheduler({...pacing,now,throttle:()=>mode,isForeground});schedulers.push(scheduler);return scheduler;};
 c.release=()=>{for(const scheduler of schedulers)scheduler.close();};
 try{
  if(c.checkFocus){
   assert(typeof pacing.isForeground==='function','Production index injects live native focus');
   assert(!c.hideRenderer,'Focus and hidden-renderer lanes run separately');
   nativeWindow=require('@electron/remote').getCurrentWindow();
   originalWindow={visible:nativeWindow.isVisible(),focused:nativeWindow.isFocused(),minimized:nativeWindow.isMinimized()};
   originalActive=app.workspace.activeLeaf;
   const plex=app.workspace.getLeavesOfType('k-plex-react-view').find(leaf=>leaf.view.containerEl.ownerDocument===document);
   assert(plex,'Existing main-window Plex required');
   nativeWindow.restore();nativeWindow.show();nativeWindow.focus();
   app.workspace.setActiveLeaf(plex,{focus:true});
   const startupDeadline=performance.now()+90000;
   while(!plugin.initialIndexComplete&&performance.now()<startupDeadline)await new Promise(resolve=>window.setTimeout(resolve,50));
   assert(plugin.initialIndexComplete,'Initial readiness precedes settled-session focus measurements');
   const focusDeadline=performance.now()+2000;
   while(!pacing.isForeground()&&performance.now()<focusDeadline)await new Promise(resolve=>window.setTimeout(resolve,20));
   assert(pacing.isForeground(),'Actual selected focused Plex receives normal throughput');
   /** Compare equal bounded CPU work under the real host hint; no live index method or progress is replaced. */
   const measure=async()=>{
    const scheduler=new Scheduler({...pacing,throttle:()=> 'responsive'});schedulers.push(scheduler);
    let worked=0;const started=performance.now();await scheduler.checkpoint(4);
    for(let slice=0;slice<6;slice++){
     const workStarted=performance.now();while(performance.now()-workStarted<6){/* Bounded synthetic CPU slice. */}
     worked+=performance.now()-workStarted;await scheduler.checkpoint(4);
    }
    const elapsedMs=performance.now()-started,idleWindows=scheduler.diagnostics().idleWindows;scheduler.close();
    return{workedMs:worked,elapsedMs,idleWindows,duty:worked/elapsedMs};
   };
   const foreground=await measure();
   focusLeaf=app.workspace.getLeaf('tab');await focusLeaf.setViewState({type:'empty',active:true});
   app.workspace.setActiveLeaf(focusLeaf,{focus:true});assert(!pacing.isForeground(),'Another actual tab reduces throughput');
   const inactive=await measure();
   assert(inactive.idleWindows===foreground.idleWindows&&inactive.idleWindows===6,'Both runs retain all six work slices');
   assert(inactive.duty<foreground.duty/3,'Inactive scheduled CPU duty must fall by at least threefold');
   app.workspace.setActiveLeaf(plex,{focus:true});assert(pacing.isForeground(),'Returning to Plex restores the live policy');
   result.focus={foreground,inactive,dutyReduction:foreground.duty/inactive.duty};
  }
  if(c.hideRenderer){
   nativeWindow=require('@electron/remote').getCurrentWindow();
   originalWindow={visible:nativeWindow.isVisible(),focused:nativeWindow.isFocused(),minimized:nativeWindow.isMinimized()};
   nativeWindow.hide();await new Promise(resolve=>window.setTimeout(resolve,100));
   result.visibility=document.visibilityState;result.focused=document.hasFocus();assert(result.visibility==='hidden','Actual selected renderer is hidden');
  }
  let legacyClock=0;const legacy=make('responsive',()=>legacyClock);legacy.pacing={...pacing,now:()=>legacyClock,throttle:()=> 'responsive',scheduleIdle:undefined};
  const legacyStarted=performance.now();await legacy.checkpoint(4);
  for(let step=0;step<3;step++){legacyClock+=6;await legacy.checkpoint(4);}
  result.legacyTimer={requestedIdleMs:72,elapsedMs:performance.now()-legacyStarted};legacy.close();
  for(const [mode,work,idle]of [['responsive',6,24],['balanced',12,12],['faster',24,4]]){
   let clock=0;const scheduler=make(mode,()=>clock),started=performance.now();
   await scheduler.checkpoint(4);
   for(let step=0;step<6;step++){assert(!c.closed,'Controller current');clock+=work;await scheduler.checkpoint(step%2?3:4);}
   result.modes.push({mode,requestedIdleMs:6*idle,elapsedMs:performance.now()-started,idleWindows:scheduler.diagnostics().idleWindows});
   assert(scheduler.diagnostics().idleWindows===6,'Each consumed work slice retains one real rest');scheduler.close();
  }
  result.clampingObserved=result.visibility==='hidden'&&result.legacyTimer.elapsedMs>=600;
  if(result.asyncWaitAvailable&&result.clampingObserved)assert(result.modes[0].elapsedMs/6<result.legacyTimer.elapsedMs/3/2,
   'Bundled native waits must avoid the observed hidden-renderer timer penalty');
  let clock=0;const scheduler=make('responsive',()=>clock);await scheduler.checkpoint(4);clock=6;
  let resumed=false;const background=scheduler.checkpoint(4).then(()=>{resumed=true;});
  const release=scheduler.begin(0);await Promise.resolve();await Promise.resolve();
  assert(!resumed,'Background cannot pass a retained mutation');await scheduler.checkpoint(0);release();await background;
  assert(resumed,'Foreground release resumes the same background continuation');
  clock+=6;const closing=scheduler.checkpoint(4);scheduler.close();await closing;
  assert(!scheduler.diagnostics().pacing&&scheduler.diagnostics().waiting===0,'Close settles retained rests and priority waiters');
  // Focus acceptance also proves snapshot activation/replacement/reclamation can finish at the
  // inactive rate; no live cache, save deadline or graph generation is substituted.
  const ioScheduler=make('responsive',()=>performance.now(),()=>!c.checkFocus);
  const fixtureName='__kplex_index_pacing_'+Date.now()+'_'+Math.random().toString(36).slice(2);
  c.progress={phase:'private-cache',fixtureName,modes:result.modes,asyncWaitAvailable:result.asyncWaitAvailable};
  cache=new Cache(fixtureName,()=>ioScheduler.checkpoint(4));
  const pages=Array.from({length:1000},(_,i)=>({path:'Synthetic '+i+'.md',filePath:'Synthetic '+i+'.md',name:'Synthetic '+i,url:null,isFolder:false,isTag:false,
   mtime:1,aliases:[],tags:[],noteType:null,primaryStyleTag:null,styleTags:[],maxLabelLength:30}));
  const meta={createdAt:1,vaultSignature:'owned-pacing-fixture',settingsSignature:'owned-pacing-fixture',discoveredFields:[]};
  const current=()=>!c.closed&&app.plugins.plugins['k-plex']===plugin;
  const started=performance.now();assert(await cache.writeSnapshot(meta,pages,[],current),'First private snapshot activates');
  const old=await cache.readSnapshotMeta();
  assert(await cache.writeSnapshot({...meta,createdAt:2},pages,[],current),'Replacement private snapshot activates');
  const active=await cache.readSnapshotMeta();assert(active.generation!==old.generation,'Distinct replacement generation');
  await cache.cleanupOrphanGenerations(active.generation,current);
  let restored=0;assert(await cache.iterateSnapshotPages(active,()=>restored++,current),'Active generation survives reclamation');assert(restored===1000,'All synthetic pages restored');
  const db=await cache.open();
  for(const store of ['pages','evidence','snapshotChunks']){
   const tx=db.transaction(store),done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
   const request=tx.objectStore(store).index('generation').count(old.generation);
   const count=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
   await done;
   assert(count===0,'Retired generation removed from '+store);
  }
  result.cache={pages:restored,elapsedMs:performance.now()-started,retiredGenerationRemoved:true,inactivePacing:Boolean(c.checkFocus)};return result;
 }catch(error){originalError=error;throw error;
 }finally{
  c.release();
  try{
   if(cache&&!await cache.purgeAndClose())throw Error(String(originalError??'Scenario completed')+'; private fixture purge failed');
  }finally{
   try{focusLeaf?.detach();if(originalActive)app.workspace.setActiveLeaf(originalActive,{focus:false});}
   finally{if(nativeWindow&&originalWindow){if(originalWindow.visible){if(originalWindow.focused){nativeWindow.show();nativeWindow.focus();}else nativeWindow.showInactive();if(originalWindow.minimized)nativeWindow.minimize();}else nativeWindow.hide();}}
  }
 }
}

validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small required');
const userData=process.env.KPLEX_OBSIDIAN_USER_DATA??(process.platform==='win32'?join(process.env.APPDATA,'obsidian'):process.platform==='darwin'?join(homedir(),'Library','Application Support','obsidian'):join(homedir(),'.config','obsidian'));
const lock=acquireHostLock({userDataPath:userData});
try{
 await runControlledProbe('index-pacing',scenario,'c.hideRenderer='+JSON.stringify(process.env.KPLEX_PACING_HIDDEN==='true')+';c.checkFocus='+JSON.stringify(process.env.KPLEX_PACING_FOCUS==='true')+';',['src/main.ts','src/index/ForegroundWorkScheduler.ts','src/adapters/obsidian/backgroundIdle.ts','src/index/IndexedDbCache.ts']);
}finally{lock.release();}
