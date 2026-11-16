/** Exact-artifact #302 cache acceptance in the approved disposable Small vault. All saves use
 * production deadlines/owners. Plugin reload preserves this controller; full application reloads
 * belong to the Node-owned warmRestart driver and require the separately proven isolated session. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {acquireHostLock} from './hostLock.mjs';
import {runControlledProbe} from './controlledProbe.mjs';
import {validateTarget} from './runner.mjs';
import {nativeBatch270} from './nativeBatch270.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';

/** Share only bounded observations and genuine native fixture operations between serialized lanes.
 * A cached row/body is never inserted into the graph, and no preparation/persistence method is called. */
function cacheFixture(app,c){
 const f=c.fixture(app,c),cases=[];
 /** Await actual retained/native state without flushing, rebuilding or changing a production timer. */
 const until=async(read,message,maximum=90000)=>{
  const start=Date.now();
  while(!await read()){
   f.check(!c.closed&&Date.now()-start<maximum,message);
   const p=f.p;
   c.progress={phase:message,waitedMs:Date.now()-start,status:p.getIndexStatus(),persistence:p.index.getSnapshotPersistenceDiagnostics(),
    source:p.index.getSourceAcquisitionCounters(),semantic:p.index.getSemanticPreparationDiagnostics(),cases};
   await f.wait(250);
  }
 };
 /** Read the actual immutable schema-3 generation, retaining owned owners/provenance only. */
 const saved=async(paths)=>{
  const cache=f.p.index.indexedDb,meta=await cache.readSnapshotMeta(),owned=new Set(paths),pages=[],evidence=[];
  if(!meta)return{meta:null,pages,evidence};
  f.check(await cache.iterateSnapshotPages(meta,row=>{if(owned.has(row.path))pages.push({path:row.path,mtime:row.mtime,
   signature:row.semanticSignature,relations:row.relations?.filter(relation=>owned.has(relation.targetPath))});},()=>!c.closed),'Read owned saved pages');
  // Persisted declarations encode the declaring owner/target as sourcePath/targetPath.
  f.check(await cache.iterateSnapshotEvidence(meta,row=>{if(owned.has(row.sourcePath)&&owned.has(row.targetPath))evidence.push({
   sourcePath:row.sourcePath,targetPath:row.targetPath,declaredByPath:row.sourcePath,declaredTargetPath:row.targetPath,
   kind:row.sourceKind,field:row.fieldName??row.definition,role:row.role,relationType:row.relationType});},()=>!c.closed),'Read owned saved evidence');
  return{meta:{generation:meta.generation,createdAt:meta.createdAt,settingsSignature:meta.settingsSignature,vaultSignature:meta.vaultSignature},pages,evidence};
 };
 /** Distinguish coherent current graph authority from ready presentation or a local cached scope. */
 const coherent=()=>{
  const p=f.p,i=p.index;
  return p.initialIndexComplete&&!i.isBuilding()&&i.fullSnapshotHydrated&&!i.sourceBackedSemantics
   &&i.hasCurrentFullSemanticGraph()&&i.sourceAcquisition.hasSemanticDependencies()
   &&!i.hasActiveSourcePreparation()&&!i.hasPendingSemanticPreparation()&&!p.indexDirty&&!p.rebuildTask;
 };
 /** The role assertion reads the canonical semantic result; it never repairs a pair. */
 const pair=(source,target,role='right')=>{
  const relation=f.p.index.get(source)?.neighbours.get(target);
  return !!relation&&(role==='right'?relation.isRightFriend&&relation.rightFriendType===1:relation.isLeftFriend&&relation.leftFriendType===1);
 };
 /** Report counters, certificates and source evidence separately from persistent activation. */
 const capture=(phase,paths)=>{
  const p=f.p,i=p.index;
  const result={phase,at:Date.now(),status:p.getIndexStatus(),persistence:i.getSnapshotPersistenceDiagnostics(),coherent:coherent(),
   source:i.getSourceAcquisitionCounters(),semantic:i.getSemanticPreparationDiagnostics(),work:p.startupDiagnostics.snapshot().sessionWork,
   coordinates:{policy:[i.fullSemanticPolicyRevision,i.semanticPolicyRevision],source:[i.fullSemanticSourceRevision,p.getIndexSourceRevision()],
    maintenance:[i.fullSemanticMaintenanceRevision,i.sourceAcquisition.getMaintenanceRevision()]},
   pages:paths.map(path=>({path,signature:i.semanticFingerprints.get(path),bare:[...(i.state.pages.get(path)?.neighbours.keys()??[])],
    shown:[...(i.get(path)?.neighbours.keys()??[])],coverage:i.viewScopeCoverage(path)}))};
  cases.push(result);return result;
 };
 /** Prepare a real non-default ontology and let a normal plugin startup settle/save its graph.
  * A plugin reload is setup here, never a substitute for the separate whole-application gates. */
 const initialize=async()=>{
  await f.initialize();f.check(!f.p.index.isOnDemandMode(),'Actual eager session required');
  await f.p.updateOntologyField('rightFriends',['Opposes302','Supports302'],[...f.p.settings.hierarchy.rightFriends],()=>true);
  const b=await f.note('Baseline target'),other=await f.note('Other target');
  const a=await f.note('Baseline source','---\nOpposes302: '+JSON.stringify('[['+b.path+']]')+'\n---\n');
  let leaf=await f.canvas(a);await f.ready();
  await f.reload();leaf=await f.canvas(a);await f.ready();
  await until(()=>coherent()&&pair(a.path,b.path),'Current custom-ontology baseline');
  let baseline;
  await until(async()=>{
   if(!coherent()||f.p.index.getSnapshotPersistenceDiagnostics().pending||f.p.index.getSnapshotPersistenceDiagnostics().active)return false;
   const current=await saved([a.path,b.path,other.path]);
   if(!f.p.index.semanticFingerprints.has(a.path)||current.pages.find(row=>row.path===a.path)?.signature!==f.p.index.semanticFingerprints.get(a.path)
    ||!current.evidence.some(row=>row.declaredByPath===a.path&&row.declaredTargetPath===b.path&&row.kind==='frontmatter-ontology'))return false;
   baseline=current;return true;
  },'Natural baseline activation',360000);
  cases.push({phase:'natural-baseline-activation',saved:baseline});
  return{a,b,other,leaf,baseline};
 };
 /** Genuine native metadata edit; all compilation/reconciliation remains production-owned. */
 const edit=async(file,write)=>{
  await app.fileManager.processFrontMatter(file,write);
  await f.ready();
 };
 return{f,cases,until,saved,coherent,pair,capture,initialize,edit};
}

/** Close/reopen a canvas while an added owner's ordinary save is pending, then reload the plugin
 * before that save. The old active snapshot must recover the newly added source and activate it. */
async function pending(app,c){
 const h=c.cacheFixture(app,c),{f,cases}=h;
 try{
  const setup=await h.initialize();setup.leaf.detach();
  const b=await f.note('Pending target'),a=await f.note('Pending source','---\nOpposes302: '+JSON.stringify('[['+b.path+']]')+'\n---\n');
  let leaf=await f.canvas(a);await f.ready();
  await h.until(()=>h.coherent()&&h.pair(a.path,b.path),'Added owner canonical publication');
  const source=await app.vault.read(a),before=await h.saved([a.path,b.path]);
  f.check(!before.pages.some(row=>row.path===a.path),'Active generation must genuinely predate added source');
  f.check(f.p.index.getSnapshotPersistenceDiagnostics().pending,'Ordinary added-source save must be pending');
  h.capture('pending-before-canvas-close',[a.path,b.path]);
  leaf.detach();await f.wait(250);
  f.check(f.p.index.getSnapshotPersistenceDiagnostics().pending,'Canvas close retained completed-graph persistence');
  leaf=await f.canvas(a);await f.ready();
  f.check(h.pair(a.path,b.path),'Reopened pending canvas retained authored relationship');
  cases.push({phase:'pending-canvas-reopened',saved:before});
  await f.reload(false);
  const index=f.p.index,owner=index.indexedDb,iterate=owner.iterateSnapshotPages;
  let held=false,releasePages;const gate=new Promise(resolve=>releasePages=resolve);
  if(c.cacheStartupBoundary!=='before-cache')owner.iterateSnapshotPages=async function(...args){if(!held&&index.getSnapshotHydrationDiagnostics().phase==='pages'){held=true;await gate;}return iterate.apply(this,args);};
  const release=()=>{owner.iterateSnapshotPages=iterate;releasePages();};f.restores.push(release);
  if(c.cacheStartupBoundary!=='before-cache')await h.until(()=>held,'Actual stale-cache page await before embed');
  const sourceOwner=index.sourceAcquisition,repository=sourceOwner.repository,proof=sourceOwner.restoreRestartHostObservations,
   lookup=repository.lookupLocalDependencyCounts,heads=repository.headPage,observations=[];
  repository.lookupLocalDependencyCounts=async function(...args){const result=await lookup.apply(this,args);if(observations.length<64)observations.push({kind:'counts',outcome:result.outcome,fence:result.value?.fence});return result;};
  repository.headPage=async function(...args){const result=await heads.apply(this,args);if(args[2]?.hostObservations&&observations.length<64){const known=new Set(result.hostObservations?.map(row=>row.sourceId));observations.push({kind:'headers',available:result.available,invalid:result.invalid,missingObservations:result.heads.filter(head=>head.state==='complete'&&!known.has(head.sourceId)).map(head=>head.physical.path)});}return result;};
  sourceOwner.restoreRestartHostObservations=async function(...args){const before=this.getRecoveryDiagnostics(),result=await proof.apply(this,args);if(observations.length<64)observations.push({kind:'restart-proof',result,before,after:this.getRecoveryDiagnostics()});return result;};
  f.restores.push(()=>{repository.lookupLocalDependencyCounts=lookup;repository.headPage=heads;sourceOwner.restoreRestartHostObservations=proof;});
  const resume=f.p.index.getSnapshotHydrationDiagnostics(),resumeWork=f.p.startupDiagnostics.snapshot().sessionWork;
  f.check(!f.p.initialIndexComplete,'Embed must arrive before stale new-note startup settles');
  const embed='https://youtu.be/kplex_startup_embed',edited=source+'\n**Source**:: ![Startup embed]('+embed+')\n';
  let metadataChanged=false;const observation=app.metadataCache.on('changed',file=>{if(file===a)metadataChanged=true;});
  try{
   await app.vault.modify(a,edited);await h.until(()=>metadataChanged,'Native changed-file callback during cached page wait');
   if(c.cacheStartupBoundary==='storage-backoff'){
    const db=await owner.open();f.check(!!db,'Original shared native connection is available before its declared fault');
    const tx=db.transaction('meta','readwrite');tx.objectStore('meta').get('active');
    await new Promise(resolve=>{tx.onabort=resolve;tx.abort();});
    f.check(await owner.open()===null,'Actual request AbortError enters ordinary connection backoff');
    cases.push({phase:'native-storage-backoff-before-pages',connection:owner.getStorageDiagnostics()});
   }
  }
  finally{app.metadataCache.offref(observation);release();}
  leaf=await f.canvas(a);await f.ready();
  await h.until(()=>h.coherent()&&h.pair(a.path,b.path),'Added owner recovered after pending-save plugin reload');
  f.check(await app.vault.read(a)===edited,'Pending-save recovery retained the foreground embed bytes');
  f.check(f.p.index.get(a.path)?.neighbours.has(embed),'New-note startup incorporates the foreground embed');
  const resumed=f.p.startupDiagnostics.snapshot().sessionWork;
  const diagnostics=JSON.parse(f.p.captureDiagnosticJson(window));
  for(const key of ['sourceInventoryPasses','fullBuildStarts'])f.check(resumed[key]===resumeWork[key],'Foreground embed during new-note recovery must not start '+key+': '+JSON.stringify({resume,resumeWork,resumed,observations,recovery:diagnostics.index.recovery,activity:diagnostics.indexingActivity,decisions:f.p.index.getIndexDiagnostics()}));
  f.check(f.p.index.getSemanticPreparationDiagnostics().fullBuilds===0,'No hidden full compiler admission');
  if(c.cacheStartupBoundary==='storage-backoff'){
   const connection=owner.getStorageDiagnostics();
   f.check(connection.snapshotRetries===1&&connection.snapshotRecoveries===1,'One bounded connection recovery resumes original cache decoding');
   f.check(connection.lastFailure?.errorName==='AbortError','Native failure class remains observable after recovery');
   cases.push({phase:'native-storage-backoff-recovered',connection});
  }
  cases.push({phase:'stale-new-note-embed-before-settlement',resume,resumeWork,resumed,observations,source:f.p.index.getSourceAcquisitionCounters()});
  h.capture('pending-reload-recovered',[a.path,b.path]);
  let activated;
  await h.until(async()=>{
   const meta=await f.p.index.indexedDb.readSnapshotMeta();
   if(!h.coherent()||meta?.generation===before.meta?.generation||f.p.index.getSnapshotPersistenceDiagnostics().active)return false;
   const current=await h.saved([a.path,b.path]);
   if(!f.p.index.semanticFingerprints.has(a.path)||current.pages.find(row=>row.path===a.path)?.signature!==f.p.index.semanticFingerprints.get(a.path)
    ||!current.evidence.some(row=>row.declaredByPath===a.path&&row.declaredTargetPath===b.path&&row.kind==='frontmatter-ontology'&&row.relationType===1))return false;
   activated=current;return true;
  },'Natural repaired-generation activation',90000);
  cases.push({phase:'pending-reload-activated',saved:activated});
  return{cases,limitation:'Plugin reload and canvas close/reopen only. Whole-application reload is a separate Node-owned gate.'};
 }catch(error){throw Error(String(error)+'; cache cases: '+JSON.stringify(cases));}finally{await f.cleanup();}
}

/** One declared write-boundary failure must preserve the previous active pointer. A genuine later
 * document edit is the retry trigger; this lane does not assume automatic retry with no new event. */
async function failureRetry(app,c){
 const h=c.cacheFixture(app,c),{f,cases}=h;
 try{
  const {a,b,other,baseline}=await h.initialize(),owner=f.p.index.indexedDb;
  const descriptor=Object.getOwnPropertyDescriptor(owner,'writeSnapshot'),original=owner.writeSnapshot;
  let failed=false,restored=false;
  /** Restore this exact owner independently of source/mutation/activation assertions. */
  const restore=()=>{if(restored)return;restored=true;if(descriptor)Object.defineProperty(owner,'writeSnapshot',descriptor);else delete owner.writeSnapshot;};
  f.restores.push(restore);
  owner.writeSnapshot=async function(...args){
   if(!failed&&(args[4]??'active')==='active'){
    failed=true;cases.push({phase:'injected-single-write-error',at:Date.now(),oldGeneration:baseline.meta.generation});
    args[5]?.('write-error');return false;
   }
   return original.apply(this,args);
  };
  await h.edit(a,fm=>{fm.Supports302='[['+b.path+']]';});
  await h.until(()=>h.coherent()&&h.pair(a.path,b.path),'Accepted source before failed save');
  f.check(f.p.index.getSnapshotPersistenceDiagnostics().pending,'Real edit scheduled the ordinary save');
  h.capture('first-edit-save-pending',[a.path,b.path,other.path]);
  await h.until(()=>failed,'Natural writer reached injected single failure',360000);
  await h.until(()=>!f.p.index.getSnapshotPersistenceDiagnostics().active
   &&f.p.index.getIndexDiagnostics().some(row=>row.reason==='complete-write-error'),'Failed writer retired with persistence failure receipt');
  const afterFailure=await h.saved([a.path,b.path,other.path]);
  f.check(afterFailure.meta?.generation===baseline.meta.generation,'Failed save retained old active generation');
  f.check(f.p.index.getIndexDiagnostics().some(row=>row.reason==='complete-write-error'),'Graph readiness retained a separate persistence failure receipt');
  cases.push({phase:'old-active-survived-failure',saved:afterFailure});
  restore();
  await h.edit(a,fm=>{fm.Opposes302='[['+other.path+']]';});
  await h.until(()=>h.coherent()&&h.pair(a.path,b.path)&&h.pair(a.path,other.path),'Later genuine edit accepted after writer restoration');
  h.capture('later-edit-normal-retry-pending',[a.path,b.path,other.path]);
  let activated;
  await h.until(async()=>{
   const meta=await owner.readSnapshotMeta();
   if(!h.coherent()||meta?.generation===baseline.meta.generation||f.p.index.getSnapshotPersistenceDiagnostics().active)return false;
   const current=await h.saved([a.path,b.path,other.path]);
   if(!f.p.index.semanticFingerprints.has(a.path)||current.pages.find(row=>row.path===a.path)?.signature!==f.p.index.semanticFingerprints.get(a.path)
    ||![b.path,other.path].every(target=>current.evidence.some(row=>row.declaredByPath===a.path&&row.declaredTargetPath===target&&row.kind==='frontmatter-ontology'&&row.relationType===1)))return false;
   activated=current;return true;
  },'Natural save retry after genuine later mutation',360000);
  cases.push({phase:'later-mutation-retry-activated',saved:activated});
  return{cases,fault:'One writeSnapshot active-save invocation returns false with write-error before writing.',
   retry:'Genuine later source mutation schedules the unchanged production save deadline; no autonomous retry claim.'};
 }catch(error){throw Error(String(error)+'; cache cases: '+JSON.stringify(cases));}finally{await f.cleanup();}
}

/** Repeated unchanged native resolver notifications and a real background/foreground transition
 * must retain the settled graph and saved generation. This is not OS suspend/resume coverage. */
async function quiet(app,c){
 const h=c.cacheFixture(app,c),{f,cases}=h;
 try{
  const native=f.owner(document);
  // Desktop overlays can occlude the restored window even while Electron reports focus.
  // Keep only this test window genuinely visible; never override page visibility or throttling.
  const originalAlwaysOnTop=native.isAlwaysOnTop();native.setAlwaysOnTop(true);
  f.restores.push(()=>{if(!native.isDestroyed())native.setAlwaysOnTop(originalAlwaysOnTop);});
  const {a,b,baseline}=await h.initialize(),p=f.p,index=p.index,page=index.get(a.path),target=index.get(b.path);
  const before=h.capture('settled-before-quiet-events',[a.path,b.path]);
  // `changed`/`modify` explicitly revoke body authority, including same-stat edits. A settled
  // resolver notification carries no such content claim and is the true unchanged-event case.
  for(let n=0;n<3;n++){app.metadataCache.trigger('resolve',a);await f.wait(150);}
  await f.ready();await h.until(()=>h.coherent(),'Unchanged native events settle');
  native.minimize();await f.wait(750);native.restore();await f.focus(document);await f.wait(1250);await f.ready();
  await h.until(()=>h.coherent()&&!p.getIndexStatus().activeWork,'Foreground wake remains current');
  const after=h.capture('after-noop-events-and-window-wake',[a.path,b.path]),saved=await h.saved([a.path,b.path]);
  f.check(index.get(a.path)===page&&index.get(b.path)===target&&h.pair(a.path,b.path),'No-op events replaced displayed identities or relationship');
  f.check(saved.meta?.generation===baseline.meta.generation,'Quiet events replaced the activated generation');
  for(const key of ['vaultReads','parses','repaired'])f.check(after.source[key]===before.source[key],'Quiet events repeated '+key);
  for(const key of ['fullBuildStarts','completeSnapshotSaves'])f.check(after.work[key]===before.work[key],'Quiet events admitted '+key);
  cases.push({phase:'quiet-generation-retained',generation:saved.meta.generation,unchangedNotifications:3,backgroundForeground:true,visibility:{temporarilyRaised:true,originalAlwaysOnTop}});
  return {cases,limitation:'Native window background/foreground only; no OS suspend or physical device claim.'};
 }catch(error){throw Error(String(error)+'; quiet cases: '+JSON.stringify(cases));}finally{await f.cleanup();}
}

/** Genuine edits, native rename/delete and committed policy changes must replace current pair
 * semantics. This is functional invalidation evidence, separate from natural cache activation. */
async function mutations(app,c){
 const h=c.cacheFixture(app,c),{f,cases}=h;
 try{
  const {a,b,other,leaf}=await h.initialize();
  await h.edit(a,fm=>{fm.Opposes302='[['+other.path+']]';});
  await h.until(()=>h.pair(a.path,other.path)&&!h.pair(a.path,b.path),'Genuine relationship replacement');
  h.capture('authored-target-edited',[a.path,b.path,other.path]);
  const oldPath=other.path,renamed=f.folder+'/Renamed target.md';
  await app.fileManager.renameFile(other,renamed);
  // The test does not depend on Obsidian's optional automatic link-update preference.
  // This explicit subsequent source edit names the genuinely renamed native file.
  await h.edit(a,fm=>{fm.Opposes302='[['+renamed+']]';});
  await h.until(()=>h.pair(a.path,renamed)&&f.p.index.get(renamed)?.file===other,'Native rename and explicit source retarget');
  f.check(!f.p.index.get(a.path)?.neighbours.has(oldPath),'Retired native identity is absent from the source pair');
  h.capture('native-rename-and-source-retarget',[a.path,oldPath,renamed]);
  await app.vault.delete(other,true);await f.ready();
  await h.until(()=>{
   const relation=[...(f.p.index.get(a.path)?.neighbours.values()??[])].find(row=>row.target.path===renamed||row.target.path===renamed.replace(/\.md$/,''));
   return relation?.isRightFriend&&relation.rightFriendType===1&&!relation.target.file;
  },'Native deletion retained explicit unresolved relationship');
  h.capture('native-delete-dematerialized',[a.path,renamed]);
  await h.edit(a,fm=>{delete fm.Opposes302;});
  await h.until(()=>![...(f.p.index.get(a.path)?.neighbours.values()??[])].some(row=>row.isRightFriend),'Authored relationship removal');
  await h.edit(a,fm=>{fm.Opposes302='[['+b.path+']]';});
  await h.until(()=>h.pair(a.path,b.path),'Restored authored relationship before policy change');
  await f.p.updateOntologyField('rightFriends',['Supports302'],[...f.p.settings.hierarchy.rightFriends],()=>true);
  await f.p.updateOntologyField('leftFriends',['Opposes302'],[...f.p.settings.hierarchy.leftFriends],()=>true);
  f.p.notifyNavigation(a.path,leaf);await f.ready();
  await h.until(()=>h.pair(a.path,b.path,'left')&&!h.pair(a.path,b.path),'Committed ontology policy replaced pair role');
  h.capture('ontology-policy-invalidated',[a.path,b.path]);
  return{cases,limitation:'Native rename is followed by an explicit source retarget; no automatic-link-update preference claim.'};
 }catch(error){throw Error(String(error)+'; cache cases: '+JSON.stringify(cases));}finally{await f.cleanup();}
}

if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small required');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const lane=process.env.KPLEX_CACHE_LANE??'pending',scenario={pending,'failure-retry':failureRetry,mutations,quiet}[lane];
if(!scenario)throw Error('Unknown authoring cache lane');
const userDataPath=process.env.KPLEX_OBSIDIAN_USER_DATA??(process.platform==='win32'?join(process.env.APPDATA,'obsidian'):process.platform==='darwin'?join(homedir(),'Library','Application Support','obsidian'):join(process.env.XDG_CONFIG_HOME??join(homedir(),'.config'),'obsidian'));
const lock=acquireHostLock({userDataPath});
try{
 const definitions='c.fixture='+nativeBatch270.toString()+';c.sessions='+nativeDocumentSessions.toString()+';c.cacheFixture='+cacheFixture.toString()+';c.fixturePrefix="__kplex302_cache_";c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';';
 await runControlledProbe('authoring-workspace-cache-'+lane,scenario,definitions+'c.cacheStartupBoundary='+JSON.stringify(['before-cache','storage-backoff'].includes(process.env.KPLEX_CACHE_STARTUP_BOUNDARY)?process.env.KPLEX_CACHE_STARTUP_BOUNDARY:'pages')+';',['src/main.ts','src/adapters/obsidian/sourceAcquisition.ts'],{maximumMs:900000});
}finally{lock.release();}
