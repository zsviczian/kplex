/**
 * Exact-installed-build Package C bootstrap regression. Reloads the actual plugin in each mode,
 * pauses a transaction-complete URL page through a temporary native lifecycle hook, and observes
 * main.ts's real snapshotRestoreTask. Owns one note, temporary wrappers, cache seeding and cleanup;
 * preserves settings/enabled-list bytes, workspace, window geometry and ordinary throttling.
 */
import { runControlledProbe } from './controlledProbe.mjs';

/** Exercise actual plugin enable/layout startup; an isolated native builder seeds a valid derived snapshot. */
async function scenario(app,c){
  let p=app.plugins.plugins['k-plex'];
  /** Assertions retire through the independently owned cleanup block. */
  const check=(value,message)=>{if(!value)throw Error(message);};
  const readyDeadline=performance.now()+45000;
  while(p&&!p.getIndexStatus().upToDate){check(!c.closed&&performance.now()<readyDeadline,'Existing native plugin readiness');await new Promise(/** Previous owned reload must settle before the next independent driver. */ resolve=>window.setTimeout(resolve,50));p=app.plugins.plugins['k-plex'];}
  check(p?.getIndexStatus().upToDate,'Existing native plugin must be settled');
  check(app.vault.getMarkdownFiles().length<1000,'Use the small functional vault');
  const path='__kplex-153-preview-startup.md',url='https://startup.example/saved-preview';check(!app.vault.getFileByPath(path),'Owned note exists');
  const dataPath=p.manifest.dir+'/data.json',data=await app.vault.adapter.read(dataPath),settings=structuredClone(p.settings),layout=structuredClone(app.workspace.getLayout());
  const remote=require('@electron/remote'),win=remote.getCurrentWindow(),geometry={bounds:win.getBounds(),maximized:win.isMaximized(),minimized:win.isMinimized()};
  remote.app.show?.();remote.app.focus({steal:true});win.restore();win.show();win.moveTop();win.focus();
  const restores=[],releases=[],rows=[];let file,seed;
  /** Own bounded native waits without changing either production watchdog. */
  const delay=ms=>new Promise(/** Release only this setup task. */ resolve=>window.setTimeout(resolve,ms));
  /** Poll actual native state with cancellation and a finite test deadline. */
  const until=async(predicate,label)=>{const end=performance.now()+45000;while(!predicate()){check(!c.closed&&performance.now()<end,label);await delay(20);}};
  /** Observe the selected renderer without disabling background throttling. */
  const foreground=()=>({hidden:document.hidden,documentFocused:document.hasFocus(),windowFocused:win.isFocused(),throttling:win.webContents.getBackgroundThrottling()});
  c.release=/** Free every external hold on cancellation. */ ()=>{for(const release of releases)release();};
  try{
    file=await app.vault.create(path,'[Saved startup URL]('+url+')');
    await until(/** Native metadata and independent URL persistence settle before baseline seeding. */ ()=>app.metadataCache.getFileCache(file)&&p.getIndexStatus().upToDate,'Owned note readiness');
    await p.index.refreshUrlOwner(path,false);await p.index.persistUrlOwner(path);
    for(const mode of ['eager','on-demand']){
      p=app.plugins.plugins['k-plex'];p.settings.indexingMode=mode;p.settings.lastActivePath=path;p.settings.sidecarOpen=false;p.settings.documentSyncMode='off';await p.saveSettings(false,false);
      const plugin={app,settings:{...structuredClone(p.settings),indexingMode:'eager'},manifest:{...p.manifest,dir:undefined},getIndexSourceRevision:/** Preserve native event revision fences. */ ()=>p.getIndexSourceRevision(),notifyStartupProgress:/** Seeding is outside the actual measured bootstrap. */ ()=>undefined};
      seed=new p.index.constructor(plugin,app);
      const physical={mtime:file.stat.mtime,size:file.stat.size,ctime:file.stat.ctime};
      const current=/** Setup authenticates the actual current file, including its new incarnation. */ ()=>!c.closed&&app.vault.getFileByPath(path)===file&&file.stat.mtime===physical.mtime&&file.stat.size===physical.size&&file.stat.ctime===physical.ctime;
      if(c.warmOwner){
        const body=await seed.metadataParser.parse(await app.vault.cachedRead(file));check(current(),'Warm seed physical revision');
        const acquired=await seed.sourceAcquisition.acquire(file,body,current,true);check(acquired.current&&acquired.saved,'Actual current neutral owner seed');
        check(await seed.sourceAcquisition.flush(),'Warm source inventory');check(seed.sourceAcquisition.hasSemanticDependencies(),'Warm source authority');
      }
      const selected=await seed.indexedDb.sources.inspect(path),incarnationWarm=selected.head?.state==='complete'&&selected.head.physical.mtime===physical.mtime&&selected.head.physical.size===physical.size&&selected.head.physical.ctime===physical.ctime;
      if(c.warmOwner)check(incarnationWarm,'Warm exact native incarnation');
      check(await seed.rebuild(),'Actual native complete seed');seed.cancelPendingPersistence();
      check(await seed.persistIndexedDbSnapshot(seed.snapshotPersistGeneration),'Actual schema-3 seed activation');seed.destroy();seed=null;
      let owner=p;while(owner&&!Object.prototype.hasOwnProperty.call(owner,'registerEvent'))owner=Object.getPrototypeOf(owner);check(owner,'Native lifecycle registration owner');
      const register=owner.registerEvent;let release,entered=false,hooked=false,observation,loading;
      const gate=new Promise(/** One completed URL page remains held until after preview observation. */ resolve=>release=resolve);releases.push(release);
      const before=foreground(),readAttribution={owned:0,other:0,actors:{}};let reads=0,parses=0,ownedParses=0;
      for(const key of ['read','cachedRead']){const original=app.vault[key];app.vault[key]=/** Count actual native reads without exporting any existing vault path or content. */ function(...args){reads++;readAttribution[args[0]?.path===path?'owned':'other']++;const stack=Error().stack??'',actor=['loadBody','readUrlOwnerBody','patchMarkdownFiles','warmBodyCache','GraphBuilder'].find(name=>stack.includes(name))??'other';readAttribution.actors[actor]=(readAttribution.actors[actor]??0)+1;return original.apply(this,args);};restores.push(/** Restore only this owned wrapper. */ ()=>app.vault[key]=original);}
      owner.registerEvent=/** Capture the newly constructed actual index before main registers layout-ready startup. */ function(...args){
        if(!hooked&&this.manifest?.id==='k-plex'&&this.index){
          hooked=true;loading=this;const i=this.index;owner.registerEvent=register;c.index=i;
          const page=i.indexedDb.readUrlOwnerPage,restore=i.restorePersistedSnapshot,parse=i.metadataParser.parse;
          i.indexedDb.readUrlOwnerPage=/** Hold only after the actual native transaction completes. */ async function(...values){const result=await page.apply(this,values);if(!entered){entered=true;await gate;}return result;};
          i.metadataParser.parse=/** Count this index's parser; only the test-owned literal is classified, never logged. */ function(...values){parses++;if(values[0]==='[Saved startup URL]('+url+')')ownedParses++;return parse.apply(this,values);};
          i.restorePersistedSnapshot=/** Observe main.ts's exact public promise and keep its identity. */ function(...values){
            const at=performance.now(),task=restore.apply(this,values);observation={at,seedIncludesOwned:values[0]?.includes(path),settled:false};
            void task.then(/** Record the public preview result after the production owner settles. */ result=>{observation.settled=true;observation.result=result;observation.previewMs=performance.now()-at;},/** Preserve bounded failure evidence. */ error=>{observation.error=String(error);observation.settled=true;});return task;
          };
          restores.push(/** Release only methods owned by the newly loaded plugin. */ ()=>{i.indexedDb.readUrlOwnerPage=page;i.restorePersistedSnapshot=restore;i.metadataParser.parse=parse;});
        }
        return register.apply(this,args);
      };
      restores.push(/** Restore the shared host prototype even if plugin enable fails before capture. */ ()=>owner.registerEvent=register);
      await app.plugins.disablePlugin('k-plex');await app.plugins.enablePlugin('k-plex');p=app.plugins.plugins['k-plex'];
      check(loading===p&&p.index.isOnDemandMode()===(mode==='on-demand'),'Actual new plugin and captured strategy');
      await until(/** A genuine URL cache transaction entered before the observation window. */ ()=>entered&&observation,'Actual bootstrap URL hold');await delay(250);
      check(!observation.error,'Bootstrap restore error');check(observation.seedIncludesOwned,'Actual main startup seed');
      const early={settled:observation.settled,previewMs:observation.previewMs,restored:observation.result?.restored,
        bodyEdge:Boolean(p.index.state.pages.get(path)?.neighbours.has(url)),physicalSearch:p.index.search('__kplex-153-preview-startup',10,'vault-files').some(/** Search must remain independent of cache replay. */ page=>page.path===path),url:p.index.getUrlIndexProgress(),writeReady:p.index.isSemanticWriteReady(path,url),status:p.getIndexStatus().upToDate};
      check(early.settled===c.expectIndependent,'Saved preview dependency differs from expected build');check(early.physicalSearch,'Actual bootstrap physical search');
      if(c.expectIndependent)check(early.restored&&early.bodyEdge,'Saved body-only preview before URL release');
      release();await until(/** Eager source closure is separate from UI readiness and may require a genuine incarnation repair. */ ()=>observation.settled&&p.getIndexStatus().upToDate&&p.index.getUrlIndexProgress().complete&&(mode==='on-demand'||p.index.sourceAcquisition.hasSemanticDependencies()&&!p.index.sourceAcquisition.inventory&&p.index.sourceAcquisition.timer===null),'Actual restart/source convergence');
      check(observation.result.restored,'Actual saved bootstrap restore');check(p.index.get(url)?.aliases.includes('Saved startup URL'),'Final native URL vocabulary');
      if(c.warmOwner)check(reads===0&&parses===0,'Authenticated warm restart performs no body acquisition');
      else check(readAttribution.owned<=1&&ownedParses<=1,'Incarnation repair never duplicates the owned body read/parse');
      const after=foreground();check(!before.hidden&&before.documentFocused&&before.windowFocused&&!after.hidden&&after.documentFocused&&after.windowFocused,'Native foreground retained');
      rows.push({mode,incarnationWarm,early,previewMs:observation.previewMs,reads,parses,ownedParses,readAttribution,source:p.index.getSourceAcquisitionCounters(),sourceAuthority:p.index.sourceAcquisition.hasSemanticDependencies(),url:p.index.getUrlIndexProgress(),before,after});
      for(const restore of restores.splice(0).reverse())restore();c.index=null;
    }
    return {expectIndependent:c.expectIndependent,warmOwner:c.warmOwner,rows,limitations:'Actual plugin reload with a declared 250ms URL hold and captured neutral-owner state; no whole-app cold-start, paint, heap or physical-device claim.'};
  }finally{
    const errors=[];c.release();seed?.destroy();for(const restore of restores.reverse())try{restore();}catch(error){errors.push(String(error));}
    try{p=app.plugins.plugins['k-plex'];if(!p){await app.plugins.enablePlugin('k-plex');p=app.plugins.plugins['k-plex'];}p.settings=structuredClone(settings);await p.saveSettings(false,false);}catch(error){errors.push(String(error));}
    try{if(file&&app.vault.getFileByPath(path)===file)await app.vault.delete(file);check(!app.vault.getFileByPath(path),'Owned note cleanup');}catch(error){errors.push(String(error));}
    try{await app.plugins.disablePlugin('k-plex');await app.plugins.enablePlugin('k-plex');await app.workspace.changeLayout(layout);await app.vault.adapter.write(dataPath,data);}catch(error){errors.push(String(error));}
    try{win.setBounds(geometry.bounds);if(geometry.maximized)win.maximize();if(geometry.minimized)win.minimize();}catch(error){errors.push(String(error));}
    c.index=null;if(errors.length)throw Error('Native bootstrap cleanup: '+errors.join('; '));
  }
}

await runControlledProbe('url-preview-startup',scenario,`c.expectIndependent=${process.env.KPLEX_EXPECT_PREVIEW_INDEPENDENT!=='false'};c.warmOwner=${process.env.KPLEX_SEED_WARM_OWNER!=='false'};`);
