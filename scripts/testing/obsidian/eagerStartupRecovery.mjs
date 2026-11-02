/** Exact-build eager recovery from a missing native graph-cache chunk in disposable Small.
 * Backs up only derived snapshot stores/pointers, reloads the real plugin, observes automatic
 * startup and restores the original cache, settings and workspace even on failure. No note is
 * changed, no readiness flag is restamped and no builder is invoked by the test.
 */
import {readFileSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {validateTarget} from './runner.mjs';
import {runControlledProbe} from './controlledProbe.mjs';

/** Remove one actual active page chunk while the plugin is disabled, then observe normal startup. */
async function scenario(app,c) {
  const check=(value,message)=>{if(!value)throw Error(message);};
  const until=async(read,message)=>{const end=Date.now()+120000;while(!read()){check(!c.closed&&Date.now()<end,message);await new Promise(done=>window.setTimeout(done,40));}};
  const request=value=>new Promise((resolve,reject)=>{value.onsuccess=()=>resolve(value.result);value.onerror=()=>reject(value.error);});
  const transaction=async(db,stores,action)=>{
    const tx=db.transaction(stores,'readwrite'),done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
    const result=action(tx);await done;return result;
  };
  const open=name=>new Promise((resolve,reject)=>{const r=indexedDB.open(name);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  check(app.vault.getName()==='kplex-test-small'&&app.vault.adapter.getBasePath()===c.vaultPath,'Wrong disposable vault');
  const originalLayout=app.workspace.getLayout(),stores=['snapshotChunks','pages','evidence'];
  const remote=require('@electron/remote'),nativeWindow=remote.getCurrentWindow();
  /** Keep the selected disposable window foregrounded with its normal throttling policy. */
  const focus=()=>{remote.app.show?.();remote.app.focus({steal:true});nativeWindow.show();nativeWindow.moveTop();nativeWindow.focus();};
  let cacheName,backup,pointers,db,disabled=false;
  const restoreReaders=[];let nativeBodyReads=0;
  c.progress={phase:'baseline'};
  try {
    let p=app.plugins.plugins['k-plex'];check(p&&!p.index.isOnDemandMode(),'Eager Small required');
    focus();
    if(!app.workspace.getLeavesOfType('k-plex-react-view').length)app.commands.executeCommandById('k-plex:kplex-start');
    await until(()=>{
      c.progress={phase:'baseline',status:p.getIndexStatus(),sourceProgress:p.startupDiagnostics.progress('source'),sourceReady:p.index.sourceAcquisition.hasSemanticDependencies()};
      return p.initialIndexComplete&&!p.index.building&&p.index.sourceAcquisition.hasSemanticDependencies()
        &&p.index.publicApiCoverage().scope==='global'&&!p.index.publicApiCoverage().pending;
    },'Initial eager graph did not complete');
    c.environment={focused:nativeWindow.isFocused(),hidden:document.hidden,backgroundThrottling:nativeWindow.webContents.getBackgroundThrottling()};

    // Wait for the production persistence owner, rather than creating the test's own full baseline.
    await until(()=>p.index.activeSnapshotGeneration&&p.index.snapshotPersistTimer===null
      &&(!p.index.getSemanticPreparationDiagnostics().fullBuilds||p.startupDiagnostics.snapshot().sessionWork.completeSnapshotSaves>0),'Complete snapshot was not persisted');
    await p.settingsWriteQueue;await app.plugins.disablePlugin('k-plex');disabled=true;
    cacheName='k-plex-index-v1-'+[...new TextEncoder().encode(app.vault.getName())].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,96);
    db=await open(cacheName);
    backup=Object.fromEntries(await Promise.all(stores.map(async name=>[name,await request(db.transaction(name).objectStore(name).getAll())])));
    pointers=await request(db.transaction('meta').objectStore('meta').getAll());
    pointers=pointers.filter(row=>row.key==='active'||row.key==='checkpoint');
    // Retain the modified derived stores on disk too, so an interrupted host can be recovered
    // independently of this controller. Durable source stores are never modified by the fault.
    require('node:fs').writeFileSync(c.backupPath,JSON.stringify({cacheName,stores:backup,pointers}));
    const active=pointers.find(row=>row.key==='active'),chunk=backup.snapshotChunks.find(row=>row.generation===active?.generation&&row.kind==='pages');
    check(chunk,'Real active page chunk required');
    await transaction(db,['snapshotChunks'],tx=>tx.objectStore('snapshotChunks').delete([chunk.generation,chunk.kind,chunk.index]));
    db.close();db=null;
    c.progress={phase:'damaged-cache-startup',backedUpRows:Object.fromEntries(stores.map(name=>[name,backup[name].length]))};
    for(const name of ['read','cachedRead']){
      const descriptor=Object.getOwnPropertyDescriptor(app.vault,name),original=app.vault[name];
      app.vault[name]=function(file,...args){if(file.extension==='md')nativeBodyReads++;return original.call(this,file,...args);};
      restoreReaders.push(()=>{if(descriptor)Object.defineProperty(app.vault,name,descriptor);else delete app.vault[name];});
    }
    const started=performance.now(),progressSamples=[];await app.plugins.enablePlugin('k-plex');disabled=false;p=app.plugins.plugins['k-plex'];focus();
    await until(()=>{
      const status=p.getIndexStatus();
      const progress=p.index.getBuildProgress();
      if(p.index.isBuilding()&&progressSamples.length<12&&(progressSamples.at(-1)?.indexed!==status.indexedFiles||progressSamples.at(-1)?.stage!==progress?.stage)){
        check(status.phase==='indexing','Active recovery build was hidden behind generic preparation');
        check(progress?.stage==='relationships'?status.label===p.translator('index.startupResolution')
          :progress?.stage==='presentation'?status.label===p.translator('index.startupSearch'):status.label.includes('%'),'Active build did not expose its note progress or actual finishing stage');
        progressSamples.push({indexed:status.indexedFiles,total:status.totalFiles,label:status.label,stage:progress?.stage});
      }
      return p.initialIndexComplete&&!p.index.building&&p.index.sourceAcquisition.hasSemanticDependencies()
        &&p.index.publicApiCoverage().scope==='global'&&!p.index.publicApiCoverage().pending;
    },'Damaged-cache eager startup never completed global relationships');
    const hydration=p.index.getSnapshotHydrationDiagnostics(),source=p.index.getSourceAcquisitionCounters(),semantic=p.index.getSemanticPreparationDiagnostics();
    check(hydration.firstFailure?.reason==='missing-chunk','Test did not enter actual missing-chunk recovery');
    check(p.index.isFullSnapshotHydrated()&&!p.index.hasSourceBackedStartup(),'Vocabulary-only recovery cannot pass');
    check(semantic.fullBuilds===1,'Eager recovery must compile global relationships once');
    check(p.startupDiagnostics.snapshot().sessionWork.nodeCatalogStarts===0,'Eager startup repeated a node-only pass before graph compilation');
    check(source.vaultReads===0&&source.parses===0,'Unchanged durable sources must not be reread/reparsed');
    check(nativeBodyReads===0,'Native Markdown reads occurred outside the source counters');
    const paths=app.vault.getMarkdownFiles().slice(-6).map(file=>file.path),before={...semantic};
    for(const path of paths){const release=p.index.acquireSemanticDemand(path);try{await p.index.ensureSemanticScope(path);check(p.index.viewScopeCoverage(path).complete,'Recovered destination incomplete');}finally{release();}}
    const after=p.index.getSemanticPreparationDiagnostics();
    check(after.requested===before.requested&&after.dependencyVisits===before.dependencyVisits,'Post-recovery destinations replayed source families');
    const cold={elapsedMs:performance.now()-started,hydration:{route:hydration.route,failure:hydration.firstFailure.reason},coverage:p.index.publicApiCoverage(),
      fullBuilds:semantic.fullBuilds,nodeCatalogStarts:p.startupDiagnostics.snapshot().sessionWork.nodeCatalogStarts,progressSamples,
      sourceReads:source.vaultReads,nativeBodyReads,parses:source.parses,navigation:{destinations:paths.length,requests:after.requested-before.requested,familyVisits:after.dependencyVisits-before.dependencyVisits}};
    c.progress={phase:'waiting-for-recovered-snapshot',cold};
    await until(()=>p.index.activeSnapshotGeneration&&p.index.activeSnapshotGeneration!==active.generation&&p.index.snapshotPersistTimer===null,'Recovered complete graph was not saved for warm reload');
    await app.plugins.disablePlugin('k-plex');disabled=true;
    const warmStarted=performance.now();await app.plugins.enablePlugin('k-plex');disabled=false;p=app.plugins.plugins['k-plex'];focus();
    c.progress={phase:'warm-reload',cold};
    await until(()=>p.initialIndexComplete&&!p.index.isBuilding()&&p.index.sourceAcquisition.hasSemanticDependencies()
      &&p.index.publicApiCoverage().scope==='global'&&!p.index.publicApiCoverage().pending,'Saved complete graph did not regain warm global coverage');
    const warmSemantic=p.index.getSemanticPreparationDiagnostics(),warmSource=p.index.getSourceAcquisitionCounters(),warmHydration=p.index.getSnapshotHydrationDiagnostics();
    check(warmHydration.route==='full-snapshot','Warm reload did not use complete saved acceleration');
    check(warmSemantic.fullBuilds===0&&p.startupDiagnostics.snapshot().sessionWork.nodeCatalogStarts===0,'Warm reload repeated whole-vault compilation');
    check(warmSource.vaultReads===0&&warmSource.parses===0&&nativeBodyReads===0,'Warm reload read or parsed unchanged Markdown');
    for(const path of paths){const release=p.index.acquireSemanticDemand(path);try{await p.index.ensureSemanticScope(path);}finally{release();}}
    const warmAfter=p.index.getSemanticPreparationDiagnostics();
    check(warmAfter.requested===warmSemantic.requested&&warmAfter.dependencyVisits===warmSemantic.dependencyVisits,'Warm destinations reconstructed neighborhoods');
    return {environment:c.environment,cold,warm:{elapsedMs:performance.now()-warmStarted,route:warmHydration.route,coverage:p.index.publicApiCoverage(),
      fullBuilds:warmSemantic.fullBuilds,nodeCatalogStarts:0,sourceReads:warmSource.vaultReads,parses:warmSource.parses,
      destinations:paths.length,requests:warmAfter.requested-warmSemantic.requested,familyVisits:warmAfter.dependencyVisits-warmSemantic.dependencyVisits}};
  } finally {
    c.progress={...c.progress,phase:'restoration'};
    for(const restore of restoreReaders.reverse())restore();
    db?.close();
    if(!disabled)await app.plugins.disablePlugin('k-plex');
    if(backup&&pointers){
      db=await open(cacheName);
      try{await transaction(db,[...stores,'meta'],tx=>{
        for(const name of stores){const store=tx.objectStore(name);store.clear();for(const row of backup[name])store.put(row);}
        const meta=tx.objectStore('meta');meta.delete('active');meta.delete('checkpoint');for(const row of pointers)meta.put(row);
      });}finally{db.close();}
    }
    await app.vault.adapter.write(c.configRelative+'/plugins/k-plex/data.json',c.originalData);
    await app.plugins.enablePlugin('k-plex');
    await app.workspace.changeLayout(originalLayout);
    await app.plugins.plugins['k-plex'].settingsWriteQueue;
    await app.vault.adapter.write(c.configRelative+'/plugins/k-plex/data.json',c.originalData);
    await app.vault.adapter.write(c.configRelative+'/community-plugins.json',c.originalEnabled);
    c.progress={phase:'restored',cacheRestored:!!backup};
  }
}

if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small required');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const reportDir=resolve(process.env.KPLEX_HOST_REPORT_DIR??'');
const reportFromVault=relative(target.vault,reportDir);
if(!process.env.KPLEX_HOST_REPORT_DIR||!reportFromVault.startsWith('..')&&!reportFromVault.includes(':'))throw Error('Report and cache backup must be outside the disposable vault');
await runControlledProbe('eager-startup-recovery',scenario,
  'c.vaultPath='+JSON.stringify(target.vault)+';c.backupPath='+JSON.stringify(join(reportDir,'derived-snapshot-backup.json'))+';c.configRelative='+JSON.stringify(relative(target.vault,target.config).replaceAll('\\','/'))+';c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';',
  ['src/main.ts','src/adapters/obsidian/sourceAcquisition.ts'],{maximumMs:360000});
