/**
 * Exact-build sync-like offline changes in disposable Small. The real cache, native events,
 * startup coordinator and compiler remain active; only one unrelated audit read is held.
 * The scenario owns finite notes, its held reader, native layout and configuration restoration.
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';

/** Observe prompt cached hydration separately from current authority and the final warm path. */
async function scenario(app,c){
 if(app.vault.getName()!=='kplex-test-small')throw Error('Explicit disposable Small required');
 let p=app.plugins.plugins['k-plex'];const workspace=app.workspace,layout=workspace.getLayout(),sessions=c.sessions(p),saved=sessions.capture();
 const original=structuredClone(p.settings),folder='Kplex-Sync-'+Date.now(),files=[],samples=[];
 const remote=require('@electron/remote'),win=remote.getCurrentWindow(),throttled=win.webContents.getBackgroundThrottling();
 let directory,releaseAudit,restoreInspect,disabled=false,failure;const foregroundRecoveries=[];
 c.release=()=>{releaseAudit?.();restoreInspect?.()};
 const wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
 const check=(value,message)=>{if(!value||c.closed)throw Error(message)};
 /** A bounded observable condition never grants production source authority. */
 const until=async(read,message,maximum=90000)=>{const end=Date.now()+maximum;while(!read()){check(Date.now()<end,message);if(document.hidden){foregroundRecoveries.push({at:Date.now(),phase:c.progress?.phase});win.show();win.focus()}await wait(40)}};
 const ready=()=>p.initialIndexComplete&&!p.index.isBuilding()&&p.index.publicApiCoverage().complete&&p.index.sourceAcquisition.hasSemanticDependencies()&&p.getIndexStatus().upToDate;
 /** Use actual unload/load identities; CLI command return is not plugin readiness. */
 const disable=async()=>{await app.plugins.disablePlugin('k-plex');disabled=true;await until(()=>!app.plugins.plugins['k-plex'],'Plugin did not unload')};
 const enable=async()=>{await app.plugins.enablePlugin('k-plex');disabled=false;await until(()=>app.plugins.plugins['k-plex']?.index,'Plugin did not load');p=app.plugins.plugins['k-plex']};
 try{
  c.progress={phase:'baseline'};
  // Foreground functional lane; preserve the host's configured throttling and do not claim physical paint.
  remote.app.show?.();remote.app.focus({steal:true});win.show();win.focus();await until(()=>!document.hidden,'Small remained hidden');
  await sessions.off();Object.assign(p.settings,{documentSyncMode:'off',sidecarOpen:false,embedCentralNode:false});
  if(!workspace.getLeavesOfType('k-plex-react-view').length)app.commands.executeCommandById('k-plex:kplex-start');
  const canvas=workspace.getLeavesOfType('k-plex-react-view')[0];check(canvas,'Small canvas is missing');await workspace.revealLeaf(canvas);
  await until(ready,'Initial Small baseline did not close');
  directory=await app.vault.createFolder(folder);
  const childField=p.defaultOntologyField('child');check(childField,'Native child ontology is missing');
  for(const [name,body]of [['Audit',''],['A',''],['B',''],['C','']])files.push(await app.vault.create(folder+'/'+name+'.md',body));
  const fixtureChangedAt=Date.now();await app.vault.modify(files[1],childField+':: [['+files[2].path+']]');
  c.progress={phase:'fixture-publication'};
  await until(()=>ready()&&p.index.get(files[1].path)?.neighbours.has(files[2].path),'Owned fixture did not publish');
  // Normal edit persistence intentionally waits five quiet minutes. This fixture waits for that
  // genuine owner instead of bypassing its debounce or claiming a test-written cache as evidence.
  await until(()=>{c.progress={phase:'fixture-persistence',normalIdleDelayMs:300000,elapsedSinceEditMs:Date.now()-fixtureChangedAt,status:p.getIndexStatus(),source:p.startupDiagnostics.progress('source'),saved:p.index.getSavedSnapshotSummary(),timer:p.index.snapshotPersistTimer,backlog:[...p.indexBacklogReasons],pending:p.index.sourceAcquisition.pendingGraphSources()?.size,coverage:p.index.publicApiCoverage()};return p.index.getSavedSnapshotSummary().active?.createdAt>=fixtureChangedAt&&p.index.snapshotPersistTimer===null},'Fixture snapshot did not persist',390000);
  await p.settingsWriteQueue;await disable();
  // A real offline change invalidates the saved physical signature; no cache flags are edited.
  await app.vault.modify(files[1],childField+':: [['+files[3].path+']]');
  await until(()=>app.metadataCache.getFileCache(files[1])?.links?.some(link=>link.link.includes('/C.md')),'Offline native metadata did not settle');
  const started=performance.now();await enable();
  c.progress={phase:'changed-vault-startup'};
  const source=p.index.sourceAcquisition,repository=source.repository,inspect=repository.inspectWithLocalDependencies;
  let auditEntered=false;const held=new Promise(resolve=>releaseAudit=resolve);
  repository.inspectWithLocalDependencies=async function(...args){if(args[0]===files[0].path&&!auditEntered){auditEntered=true;await held;}return inspect.apply(this,args)};
  restoreInspect=()=>{repository.inspectWithLocalDependencies=inspect};
  await until(()=>auditEntered,'Actual source audit did not reach owned gate');
  await until(()=>{c.progress={phase:'changed-vault-hydration',hydration:p.index.getSnapshotHydrationDiagnostics(),status:p.getIndexStatus(),source:p.startupDiagnostics.progress('source'),backlog:[...p.indexBacklogReasons],decisions:p.index.getIndexDiagnostics().slice(-5)};return p.index.isFullSnapshotHydrated()&&!p.index.hasPendingSnapshotHydration()},'Changed-vault graph remained behind held audit',15000);
  const auditHeldElapsedMs=performance.now()-started,hydration=p.index.getSnapshotHydrationDiagnostics();
  const hydratedMs=hydration.lastProgressAt-hydration.startedAt,status=p.getIndexStatus(),coverage=p.index.publicApiCoverage();
  check(hydratedMs<=15000,'Actual cached hydration exceeded its native bound: '+hydratedMs);
  check(!p.initialIndexComplete&&!coverage.complete,'Cached graph falsely claimed current semantics');
  check(p.index.hasSourceBackedStartup(),'Changed cached graph lost its recovery owner');
  check(status.label.includes('%')&&status.label.includes('/'),'Held audit did not display note counts and percentage: '+status.label);
  samples.push({phase:'audit-held',status,source:p.startupDiagnostics.progress('source'),cachedHydrated:true,current:false});
  c.progress={phase:'cached-graph-visible',hydratedMs,auditHeldElapsedMs,hydration,samples};
  // A second remote-style save during startup remains queued and must win final publication.
  const newerChangedAt=Date.now();await app.vault.modify(files[1],childField+':: [['+files[2].path+']], [['+files[3].path+']]');
  releaseAudit();restoreInspect();restoreInspect=null;
  await until(()=>{c.progress={phase:'newer-save-convergence',hydratedMs,auditHeldElapsedMs,hydration,samples,status:p.getIndexStatus(),source:p.startupDiagnostics.progress('source'),coverage:p.index.publicApiCoverage(),pending:p.index.sourceAcquisition.pendingGraphSources()?.size,backlog:[...p.indexBacklogReasons],foregroundRecoveries};return ready()&&p.index.get(files[1].path)?.neighbours.has(files[2].path)&&p.index.get(files[1].path)?.neighbours.has(files[3].path)},'Newer sync save did not reach current graph');
  const settled={elapsedMs:performance.now()-started,fullBuilds:p.index.getSemanticPreparationDiagnostics().fullBuilds,source:p.index.getSourceAcquisitionCounters(),backlog:[...p.indexBacklogReasons]};
  check(!p.indexBacklogReasons.has('vault:create'),'Covered creation triggered repeated whole-vault work');
  c.progress={phase:'current-graph-persistence',normalIdleDelayMs:300000,settled};
  await until(()=>p.index.getSavedSnapshotSummary().active?.createdAt>=newerChangedAt&&p.index.snapshotPersistTimer===null,'Current graph was not persisted',390000);
  await disable();const warmStart=performance.now();await enable();
  await until(ready,'Healthy warm reload did not close');
  const semantic=p.index.getSemanticPreparationDiagnostics(),counters=p.index.getSourceAcquisitionCounters();
  check(semantic.fullBuilds===0,'Healthy warm reload rebuilt the graph');
  check(counters.vaultReads===0&&counters.parses===0,'Healthy warm reload reread unchanged bodies');
  const before={...semantic};
  for(const file of files.slice(1)){const release=p.index.acquireSemanticDemand(file.path);try{await p.index.ensureSemanticScope(file.path)}finally{release()}}
  const after=p.index.getSemanticPreparationDiagnostics();check(after.requested===before.requested&&after.dependencyVisits===before.dependencyVisits,'Warm navigation re-prepared sources');
  return{environment:{hidden:document.hidden,focused:document.hasFocus(),backgroundThrottling:throttled,foregroundRecoveries},changed:{hydratedMs,auditHeldElapsedMs,hydration,samples,settled},warm:{elapsedMs:performance.now()-warmStart,fullBuilds:semantic.fullBuilds,reads:counters.vaultReads,parses:counters.parses,navigationRequests:after.requested-before.requested}};
 }catch(error){failure=error;throw error;}
 finally{
  releaseAudit?.();restoreInspect?.();const errors=[];
  /** Cleanup steps remain independent after assertion or native failure. */
  const clean=async(name,action)=>{try{await action()}catch(error){errors.push(name+': '+String(error))}};
  if(disabled)await clean('enable',enable);p=app.plugins.plugins['k-plex']??p;
  await clean('layout',()=>workspace.changeLayout(layout));await clean('sessions',()=>c.sessions(p).restore(saved));
  for(const file of files.reverse())if(app.vault.getFileByPath(file.path)===file)await clean('owned-note',()=>app.vault.delete(file,true));
  if(directory&&app.vault.getFolderByPath(folder)===directory&&!directory.children.length)await clean('owned-folder',()=>app.vault.delete(directory,true));
  await clean('settings',async()=>{p.settings=original;await p.saveSettings(false,false);await p.settingsWriteQueue;await wait(1200);await app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData);await app.vault.adapter.write(app.vault.configDir+'/community-plugins.json',c.originalEnabled)});
  c.progress={...c.progress,cleanup:errors.length?'failed':'passed'};
  if(errors.length)throw Error([failure,...errors].filter(Boolean).join('; '));
 }
}
if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit Small required');
const config=process.env.KPLEX_TEST_CONFIG_DIR;
await runControlledProbe('sync-hydration',scenario,'c.sessions='+nativeDocumentSessions.toString()+';c.originalData='+JSON.stringify(readFileSync(join(config,'plugins/k-plex/data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(config,'community-plugins.json'),'utf8'))+';',
 ['src/main.ts','src/adapters/obsidian/sourceAcquisition.ts'],{maximumMs:900000});
