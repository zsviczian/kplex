/** Exact-build eager recovery from a missing native graph-cache chunk in disposable Small.
 * Backs up only derived snapshot stores/pointers, reloads the real plugin, observes automatic
 * startup and restores the original cache, settings and workspace even on failure. No note is
 * changed, no readiness flag is restamped and no builder is invoked by the test.
 */
import {readFileSync} from 'node:fs';
import {join,relative} from 'node:path';
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
  let cacheName,backup,pointers,db,disabled=false;
  c.progress={phase:'baseline'};
  try {
    let p=app.plugins.plugins['k-plex'];check(p&&!p.index.isOnDemandMode(),'Eager Small required');
    await until(()=>p.initialIndexComplete&&!p.index.building&&p.index.sourceAcquisition.hasSemanticDependencies()
      &&p.index.publicApiCoverage().scope==='global'&&!p.index.publicApiCoverage().pending,'Initial eager graph did not complete');
    // Wait for the production persistence owner, rather than creating the test's own full baseline.
    await until(()=>p.index.activeSnapshotGeneration&&p.index.snapshotPersistTimer===null,'Complete snapshot was not persisted');
    await p.settingsWriteQueue;await app.plugins.disablePlugin('k-plex');disabled=true;
    cacheName='k-plex-index-v1-'+[...new TextEncoder().encode(app.vault.getName())].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,96);
    db=await open(cacheName);
    backup=Object.fromEntries(await Promise.all(stores.map(async name=>[name,await request(db.transaction(name).objectStore(name).getAll())])));
    pointers=await request(db.transaction('meta').objectStore('meta').getAll());
    pointers=pointers.filter(row=>row.key==='active'||row.key==='checkpoint');
    const active=pointers.find(row=>row.key==='active'),chunk=backup.snapshotChunks.find(row=>row.generation===active?.generation&&row.kind==='pages');
    check(chunk,'Real active page chunk required');
    await transaction(db,['snapshotChunks'],tx=>tx.objectStore('snapshotChunks').delete([chunk.generation,chunk.kind,chunk.index]));
    db.close();db=null;
    c.progress={phase:'damaged-cache-startup',backedUpRows:Object.fromEntries(stores.map(name=>[name,backup[name].length]))};
    const started=performance.now();await app.plugins.enablePlugin('k-plex');disabled=false;p=app.plugins.plugins['k-plex'];
    await until(()=>p.initialIndexComplete&&!p.index.building&&p.index.sourceAcquisition.hasSemanticDependencies()
      &&p.index.publicApiCoverage().scope==='global'&&!p.index.publicApiCoverage().pending,'Damaged-cache eager startup never completed global relationships');
    const hydration=p.index.getSnapshotHydrationDiagnostics(),source=p.index.getSourceAcquisitionCounters(),semantic=p.index.getSemanticPreparationDiagnostics();
    check(hydration.firstFailure?.reason==='missing-chunk','Test did not enter actual missing-chunk recovery');
    check(p.index.isFullSnapshotHydrated()&&!p.index.hasSourceBackedStartup(),'Vocabulary-only recovery cannot pass');
    check(semantic.fullBuilds===1,'Eager recovery must compile global relationships once');
    check(source.vaultReads===0&&source.parses===0,'Unchanged durable sources must not be reread/reparsed');
    const paths=app.vault.getMarkdownFiles().slice(-6).map(file=>file.path),before={...semantic};
    for(const path of paths){const release=p.index.acquireSemanticDemand(path);try{await p.index.ensureSemanticScope(path);check(p.index.viewScopeCoverage(path).complete,'Recovered destination incomplete');}finally{release();}}
    const after=p.index.getSemanticPreparationDiagnostics();
    check(after.requested===before.requested&&after.dependencyVisits===before.dependencyVisits,'Post-recovery destinations replayed source families');
    return {elapsedMs:performance.now()-started,hydration:{route:hydration.route,failure:hydration.firstFailure.reason},coverage:p.index.publicApiCoverage(),
      fullBuilds:semantic.fullBuilds,sourceReads:source.vaultReads,parses:source.parses,navigation:{destinations:paths.length,requests:after.requested-before.requested,familyVisits:after.dependencyVisits-before.dependencyVisits}};
  } finally {
    c.progress={...c.progress,phase:'restoration'};
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
    c.progress={phase:'restored',cacheRestored:!!backup};
  }
}

if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small required');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
await runControlledProbe('eager-startup-recovery',scenario,
  'c.vaultPath='+JSON.stringify(target.vault)+';c.configRelative='+JSON.stringify(relative(target.vault,target.config).replaceAll('\\','/'))+';c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';',
  ['src/main.ts','src/adapters/obsidian/sourceAcquisition.ts'],{maximumMs:360000});
