/** Node-owned #302 application-reload acceptance. Receipts, configuration and cleanup ownership
 * survive renderer replacement. Only the existing Small vault and one isolated BrowserWindow are
 * accepted. No process is closed and no graph preparation/save method or production timer is forced. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {appendFileSync,existsSync,mkdirSync,readFileSync,realpathSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {isAbsolute,join,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
import {acquireHostLock} from './hostLock.mjs';
import {obsidianCliExecutable,spawnNativeSync} from './processTools.mjs';
import {validateTarget} from './runner.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';

assert.equal(process.env.KPLEX_TEST_VAULT_NAME,'kplex-test-small','Explicit disposable Small required');
const root=resolve(fileURLToPath(new URL('../../..',import.meta.url)));
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
assert(process.env.KPLEX_HOST_REPORT_DIR,'Set a fresh managed KPLEX_HOST_REPORT_DIR');
const directory=resolve(process.env.KPLEX_HOST_REPORT_DIR),fromVault=relative(target.vault,directory);
assert(fromVault&&!(fromVault!=='..'&&!fromVault.startsWith('..'+sep)&&!isAbsolute(fromVault)),'Reports must be outside the vault');
mkdirSync(directory,{recursive:true});
const reportPath=join(directory,'authoring-workspace-restart.json');
assert(!existsSync(reportPath),'Restart report exists; use a fresh managed report directory');
const userDataPath=process.env.KPLEX_OBSIDIAN_USER_DATA??(process.platform==='win32'?join(process.env.APPDATA,'obsidian'):process.platform==='darwin'?join(homedir(),'Library','Application Support','obsidian'):join(process.env.XDG_CONFIG_HOME??join(homedir(),'.config'),'obsidian'));
const lock=acquireHostLock({userDataPath}),started=Date.now(),deadline=started+900000;
const folder='__kplex302_restart_'+Date.now(),paths={folder,a:folder+'/Baseline source.md',b:folder+'/Baseline target.md',added:folder+'/Added source.md',target:folder+'/Added target.md'};
const plannedFiles=[paths.a,paths.b,paths.added,paths.target];
const report={status:'failed',startedAt:new Date(started).toISOString(),node:process.version,platform:process.platform,
 lifecycle:'Obsidian app:reload application renderer; Electron process retained',isolation:[],cycles:[],paths,
 limitation:'Small functional cache/source-work acceptance. Observed DOM timing is a polling upper bound, not a paint trace or large-vault latency result.'};
const configPaths=[join(target.pluginDir,'data.json'),join(target.config,'community-plugins.json'),join(target.config,'workspace.json')];
let originalConfig,originalNative,setupStarted=false,activeCenter=paths.a;
/** Hash exact named artifacts without enumerating notes. */
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
/** Keep CLI transport finite; the shared helper owns long/multiline Windows eval scripts. */
function cli(command,...args){const r=spawnNativeSync(obsidianCliExecutable(),[`vault=${process.env.KPLEX_TEST_VAULT_NAME}`,command,...args],{cwd:root,encoding:'utf8',timeout:15000,killSignal:'SIGKILL',maxBuffer:4*1024*1024});if(r.error||r.status!==0||/^Error:/m.test(r.stdout??''))throw Error(r.error?.message||r.stderr||r.stdout);return r.stdout.trim();}
/** Validate serialized script syntax before any native operation. */
function evaluate(code){new Script(code);const raw=cli('eval','code='+code);return JSON.parse(raw.slice(raw.indexOf('{')));}
/** Node owns a bounded observation wait; no renderer scheduling policy is changed. */
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
/** Persist aggregate progress after every phase; private recovery inputs are separate files. */
function save(){writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');}
/** Prove the actual selected vault/window and absence of every other BrowserWindow each time.
 * A failed proof never closes another vault or schedules application reload. */
function isolation(){const proof=evaluate(`(()=>{const r=require('@electron/remote'),w=r.getCurrentWindow(),all=r.BrowserWindow.getAllWindows().filter(value=>!value.isDestroyed());return JSON.stringify({path:app.vault.adapter.getBasePath(),count:all.length,current:w.id,windows:all.map(value=>value.id),reload:!!app.commands.commands['app:reload']})})()`);assert.equal(realpathSync(proof.path),target.vault,'CLI selected a different vault');assert.equal(proof.count,1,'Leave only the disposable Small BrowserWindow open');assert.equal(proof.windows[0],proof.current,'Selected isolated BrowserWindow mismatch');assert(proof.reload,'Native app:reload command missing');report.isolation.push({...proof,at:Date.now()});save();return proof;}
/** A phase task may await native APIs; Node retains completion/error ownership before returning
 * from transport. No phase task is left running when application reload is scheduled. */
async function task(name,body,maximum=120000,cleanupPhase=false){
 if(!cleanupPhase)assert(Date.now()<deadline,name+' acceptance deadline');
 evaluate(`(()=>{if(window.kplex302RestartTask&&!window.kplex302RestartTask.done)throw Error('Existing restart phase');const s=window.kplex302RestartTask={done:false};s.task=(async()=>{${body}})().then(value=>{s.value=value;s.done=true},error=>{s.error=String(error);s.done=true});return JSON.stringify({started:true})})()`);
 const end=cleanupPhase?Date.now()+maximum:Math.min(deadline,Date.now()+maximum);
 while(Date.now()<end){await delay(250);const state=evaluate('JSON.stringify({done:window.kplex302RestartTask?.done,value:window.kplex302RestartTask?.value,error:window.kplex302RestartTask?.error})');if(!state.done)continue;evaluate('delete window.kplex302RestartTask;JSON.stringify({retired:true})');if(state.error)throw Error(name+': '+state.error);return state.value;}
 throw Error(name+' deadline');
}
/** Read current diagnostics and owned pair state without acquiring bodies or granting authority. */
function sample(){return evaluate(`(()=>{const p=app.plugins.plugins['k-plex'],i=p?.index,r=require('@electron/remote'),w=r.getCurrentWindow();const base={at:Date.now(),timeOrigin:performance.timeOrigin,now:performance.now(),loaded:!!i,files:app.vault.getFiles().length,markdownFiles:app.vault.getMarkdownFiles().length,foreground:{hidden:document.hidden,focused:document.hasFocus(),windowFocused:w.isFocused(),throttling:w.webContents.getBackgroundThrottling()}};if(!i)return JSON.stringify(base);const paths=${JSON.stringify(paths)},center=${JSON.stringify(activeCenter)},page=i.get(center),target=center===paths.added?paths.target:paths.b,relation=page?.neighbours.get(target),canonical=i.state.pages.get(center)?.neighbours.get(target);return JSON.stringify({...base,initial:p.initialIndexComplete,status:p.getIndexStatus(),initializing:p.isStartupInitializing(),building:i.isBuilding(),full:i.isFullSnapshotHydrated(),fullCurrent:i.hasCurrentFullSemanticGraph(),sourceBacked:i.sourceBackedSemantics,sourceReady:i.sourceAcquisition.hasSemanticDependencies(),sourceActive:i.hasActiveSourcePreparation(),inventory:!!i.sourceAcquisition.inventory,dirty:p.indexDirty,rebuild:!!p.rebuildTask,semanticActive:i.hasActiveSemanticPreparation(),semanticPending:i.hasPendingSemanticPreparation(),persistence:i.getSnapshotPersistenceDiagnostics(),hydration:i.getSnapshotHydrationDiagnostics(),source:i.getSourceAcquisitionCounters(),semantic:i.getSemanticPreparationDiagnostics(),work:p.startupDiagnostics.snapshot().sessionWork,repository:i.getSourceRepositoryDiagnostics(),url:i.getUrlIndexProgress(),coverage:i.viewScopeCoverage(center),pair:{shown:!!relation?.isRightFriend&&relation.rightFriendType===1,canonical:!!canonical?.isRightFriend&&canonical.rightFriendType===1},painted:[...document.querySelectorAll('[data-kplex-path]')].some(el=>el.getAttribute('data-kplex-path')===center),coordinates:{policy:[i.fullSemanticPolicyRevision,i.semanticPolicyRevision],source:[i.fullSemanticSourceRevision,p.getIndexSourceRevision()],maintenance:[i.fullSemanticMaintenanceRevision,i.sourceAcquisition.getMaintenanceRevision()]},decisions:i.getIndexDiagnostics().slice(-12).map(row=>({at:row.at,stage:row.stage,reason:row.reason}))})})()`);}
/** Cache activation/authority is later than visible paint. Pending-save intervals are observed
 * explicitly elsewhere rather than being called settled here. */
function complete(s){return s.loaded&&s.initial&&s.status.upToDate&&!s.initializing&&!s.building&&s.full&&s.fullCurrent&&!s.sourceBacked&&s.sourceReady&&!s.sourceActive&&!s.inventory&&!s.dirty&&!s.rebuild&&!s.semanticActive&&!s.semanticPending&&!s.persistence.pending&&!s.persistence.active&&!s.repository.unsaved&&s.pair.shown&&s.pair.canonical;}
/** Observe honest milestones independently; failed transport during renderer replacement is retried
 * within the same finite deadline, without preparing, flushing or changing readiness. */
async function observe(label,previousOrigin,maximum=180000){
 const receipt={label,requestedAt:Date.now(),milestones:{},transportReconnects:0},end=Math.min(deadline,Date.now()+maximum);let stable=0;
 while(Date.now()<end){await delay(500);let s;try{s=sample();}catch(error){receipt.transportReconnects++;receipt.lastTransportError=String(error);continue;}
  appendFileSync(join(directory,'restart.samples.jsonl'),JSON.stringify({label,...s})+'\n');
  if(previousOrigin!==undefined&&s.timeOrigin===previousOrigin)continue;
  assert(!s.foreground.hidden&&s.foreground.focused&&s.foreground.windowFocused,'Selected Small renderer lost foreground');
  for(const [name,ready]of [['firstObserved',true],['paintedCenter',s.painted],['currentViewAuthority',s.coverage?.complete&&s.pair.shown],['reportedReady',s.status?.upToDate],['globalSettlement',complete(s)]])if(ready&&receipt.milestones[name]===undefined)receipt.milestones[name]=s.now;
  stable=complete(s)?stable+1:0;receipt.last=s;report.progress={label,waitedMs:Date.now()-receipt.requestedAt,last:s};save();
  if(stable>=3){receipt.final=s;receipt.completedAt=Date.now();delete receipt.last;return receipt;}
 }
 throw Error(label+' did not naturally settle');
}
/** Inspect the actual activated generation through schema-3 chunk readers. Only owned rows and
 * provenance cross the boundary; matching live fingerprints and current graph certificates are separate. */
async function savedProof(){return task('Read activated owned snapshot',`const p=app.plugins.plugins['k-plex'],i=p.index,cache=i.indexedDb,meta=await cache.readSnapshotMeta(),owned=new Set(${JSON.stringify(plannedFiles)}),pages=[],evidence=[];if(!meta)throw Error('No active snapshot');if(!await cache.iterateSnapshotPages(meta,row=>{if(owned.has(row.path))pages.push({path:row.path,signature:row.semanticSignature,currentSignature:i.semanticFingerprints.get(row.path),mtime:row.mtime,relations:row.relations?.filter(value=>owned.has(value.targetPath))})},()=>true))throw Error('Page chunk read failed');if(!await cache.iterateSnapshotEvidence(meta,row=>{if(owned.has(row.sourcePath)&&owned.has(row.targetPath))evidence.push({by:row.sourcePath,target:row.targetPath,kind:row.sourceKind,field:row.fieldName??row.definition,type:row.relationType,role:row.role})},()=>true))throw Error('Evidence chunk read failed');return {meta:{generation:meta.generation,createdAt:meta.createdAt,settingsSignature:meta.settingsSignature,vaultSignature:meta.vaultSignature},pages,evidence};`);}
/** A complete saved source must have current canonical input and retained authored provenance. */
function assertSaved(proof,source,targetPath){const page=proof.pages.find(row=>row.path===source);assert(page?.signature&&page.signature===page.currentSignature,'Saved source lacks matching canonical fingerprint');assert(page.relations?.some(row=>row.targetPath===targetPath),'Saved authored adjacency missing');assert(proof.evidence.some(row=>row.by===source&&row.target===targetPath&&row.kind==='frontmatter-ontology'&&row.type===1),'Saved authored provenance missing');}
/** Unchanged input may compare native metadata/header coordinates; it cannot replay source bodies,
 * rebuild, run a global inventory or replace the settled saved generation. */
function assertUnchanged(receipt,proof,baseline){const s=receipt.final;assert.equal(s.hydration.route,'full-snapshot','Unchanged restart did not hydrate saved graph');for(const key of ['sourceInventoryPasses','fullBuildStarts','nodeCatalogStarts','completeSnapshotSaves','checkpointSaves'])assert.equal(s.work[key],0,'Unchanged restart admitted '+key);for(const key of ['vaultReads','parses','repaired','resolutionRefreshes'])assert.equal(s.source[key],0,'Unchanged restart repeated '+key);assert.equal(s.semantic.fullBuilds,0,'Unchanged semantic full build');assert.equal(s.semantic.dependencyVisits,0,'Unchanged restart replayed selected source semantics');assert.equal(s.repository.activated,0,'Unchanged restart rewrote sources');assert.equal(s.url.reads,0,'Unchanged restart regenerated URL sources');assert.equal(proof.meta.generation,baseline.meta.generation,'Unchanged restart replaced active generation');assert.equal(proof.meta.settingsSignature,baseline.meta.settingsSignature,'Unchanged restart changed saved policy');assertSaved(proof,activeCenter,activeCenter===paths.added?paths.target:paths.b);}
/** Schedule the actual installed application command only after a fresh isolated-window proof.
 * The pending task/controller is retired first; Node alone owns observations and recovery inputs. */
async function reload(label,baseline,requirePending=false){isolation();const before=sample();if(requirePending)assert(before.fullCurrent&&before.pair.canonical&&before.persistence.pending,'Save is no longer pending at the application reload boundary');evaluate(`(()=>{if(window.kplex302RestartTask&&!window.kplex302RestartTask.done)throw Error('Unsettled phase before app reload');delete window.kplex302RestartTask;if(window.kplex302ReloadTimer)throw Error('Existing owned reload timer');window.kplex302ReloadTimer=window.setTimeout(()=>{delete window.kplex302ReloadTimer;app.commands.executeCommandById('app:reload')},100);return JSON.stringify({scheduled:true})})()`);const result=await observe(label,before.timeOrigin);const proof=await savedProof();result.saved=proof;result.cacheProofCapturedAt=Date.now();report.cycles.push(result);save();if(baseline)assertUnchanged(result,proof,baseline);return result;}

try{
 isolation();
 const artifactDir=process.env.KPLEX_PROBE_ARTIFACT_DIR??join(root,'dist');
 assert(!process.env.KPLEX_PROBE_ARTIFACT_DIR||process.env.KPLEX_PROBE_BASELINE_REF,'Alternate artifacts require explicit baseline attribution');
 report.artifactDir=artifactDir;report.baselineRef=process.env.KPLEX_PROBE_BASELINE_REF;
 report.artifacts=Object.fromEntries(['main.js','manifest.json','styles.css'].map(name=>{const expected=hash(join(artifactDir,name));assert.equal(hash(join(target.pluginDir,name)),expected,'Installed artifact mismatch: '+name);return[name,expected];}));
 report.driverSha256=hash(fileURLToPath(import.meta.url));report.workingTreeSource=Object.fromEntries(['src/main.ts','src/index/GraphBuilder.ts','src/index/GraphIndex.ts','src/adapters/obsidian/sourceAcquisition.ts'].map(path=>[path,hash(join(root,path))]));
 originalNative=evaluate(`(()=>{const p=app.plugins.plugins['k-plex'];if(!p?.index||p.index.isOnDemandMode())throw Error('Actual eager Small required');if(app.setting.win||document.querySelector('.modal-container'))throw Error('Close native dialogs');return JSON.stringify({layout:app.workspace.getLayout(),settings:structuredClone(p.settings),sessions:(${nativeDocumentSessions.toString()})(p).capture(),inventory:app.vault.getFiles().map(file=>file.path).sort()})})()`);
 await task('Settle original settings writer',`await app.plugins.plugins['k-plex'].settingsWriteQueue;return {settled:true};`);
 originalConfig=configPaths.map(path=>({path,bytes:readFileSync(path)}));
 // Recovery inputs remain Node-owned on disk as well as in memory, including before first write.
 originalConfig.forEach((row,index)=>writeFileSync(join(directory,'original-config-'+index+'.bin'),row.bytes));
 writeFileSync(join(directory,'original-native-state.json'),JSON.stringify(originalNative)+'\n');
 writeFileSync(join(directory,'owned-fixture.json'),JSON.stringify(paths,null,2)+'\n');
 setupStarted=true;
 await task('Create custom-ontology native baseline',`const p=app.plugins.plugins['k-plex'],paths=${JSON.stringify(paths)};if(app.vault.getAbstractFileByPath(paths.folder))throw Error('Owned folder collision');const r=require('@electron/remote'),w=r.getCurrentWindow();r.app.show?.();r.app.focus({steal:true});w.restore();w.show();w.moveTop();w.focus();w.webContents.focus();await (${nativeDocumentSessions.toString()})(p).off();Object.assign(p.settings,{embedCentralNode:false,graphDepth:1,renderSiblings:false,animationSpeed:0});await p.saveSettings(false,false);await p.updateOntologyField('rightFriends',['Opposes302'],[...p.settings.hierarchy.rightFriends],()=>true);await app.vault.createFolder(paths.folder);await app.vault.create(paths.b,'');await app.vault.create(paths.a,${JSON.stringify('---\nOpposes302: '+JSON.stringify('[['+paths.b+']]')+'\n---\n')});await p.settingsWriteQueue;await app.plugins.disablePlugin('k-plex');await app.plugins.enablePlugin('k-plex');return {created:true};`);
 await task('Open owned baseline canvas',`const p=app.plugins.plugins['k-plex'],leaf=app.workspace.getLeaf('tab');await leaf.setViewState({type:'k-plex-react-view',active:true});await app.workspace.revealLeaf(leaf);await leaf.view.waitUntilReady();p.notifyNavigation(${JSON.stringify(paths.a)},leaf);await p.settingsWriteQueue;return {leafId:leaf.id};`);
 report.preparation=await observe('naturally-activated-custom-baseline',undefined,360000);
 const baseline=await savedProof();assertSaved(baseline,paths.a,paths.b);report.preparation.saved=baseline;save();
 await reload('unchanged-application-reload-1',baseline);
 await reload('unchanged-application-reload-2',baseline);
 await task('Create pending added owner pair',`const p=app.plugins.plugins['k-plex'],paths=${JSON.stringify(paths)};await app.vault.create(paths.target,'');await app.vault.create(paths.added,${JSON.stringify('---\nOpposes302: '+JSON.stringify('[['+paths.target+']]')+'\n---\n')});const leaf=app.workspace.getLeavesOfType('k-plex-react-view').find(value=>p.documentSession(value)?.centerPath===paths.a)??app.workspace.getLeavesOfType('k-plex-react-view')[0];if(!leaf)throw Error('Owned canvas missing');p.notifyNavigation(paths.added,leaf);await p.settingsWriteQueue;return {created:true};`);
 activeCenter=paths.added;
 const pendingEnd=Math.min(deadline,Date.now()+90000);let pending;
 while(Date.now()<pendingEnd){await delay(250);const s=sample();if(s.pair?.shown&&s.pair?.canonical&&s.fullCurrent&&s.persistence.pending){pending=s;break;}}
 assert(pending,'Added owner never reached canonical authority with a genuinely pending save');
 const oldActive=await savedProof();assert.equal(oldActive.meta.generation,baseline.meta.generation,'Old active pointer changed before pending-save boundary');assert(!oldActive.pages.some(row=>row.path===paths.added),'Active generation does not predate added owner');
 report.pendingBeforeReload={sample:pending,saved:oldActive};save();
 const repaired=await reload('pending-save-application-reload',undefined,true);
 assert.notEqual(repaired.saved.meta.generation,baseline.meta.generation,'Pending owner repair never activated a new generation');assert.equal(repaired.saved.meta.settingsSignature,baseline.meta.settingsSignature,'Pending owner recovery changed ontology policy');assertSaved(repaired.saved,paths.added,paths.target);assertSaved(repaired.saved,paths.a,paths.b);
 await reload('unchanged-after-pending-repair',repaired.saved);
 report.status='passed';
}catch(error){report.error=String(error);process.exitCode=1;}
finally{
 const failures=[];
 /** Cleanup attempts every independent owner even after a failed reload/activation assertion. */
 const clean=async(name,work)=>{try{await work();}catch(error){failures.push({name,error:String(error)});}};
 if(setupStarted){
  // Join a native phase before starting cleanup; never race a still-running settings/Vault write.
  // An unsettled owner leaves the disk recovery receipts intact instead of being force-closed.
  let nativeSettled=false;
  await clean('settle retired native phase',async()=>{
   const end=Date.now()+30000;
   while(Date.now()<end){try{const state=evaluate('JSON.stringify({settled:!window.kplex302RestartTask||window.kplex302RestartTask.done})');if(state.settled){evaluate('window.clearTimeout(window.kplex302ReloadTimer);delete window.kplex302ReloadTimer;delete window.kplex302RestartTask;JSON.stringify({retired:true})');nativeSettled=true;return;}}catch{ /* Retry benign identity/readiness after renderer replacement within this deadline. */ }await delay(250);}
   throw Error('Native phase remains unsettled; preserve Node recovery receipts');
  });
  if(nativeSettled){
   // Each owner has an independent bounded cleanup task, outside the acceptance deadline.
   await clean('enable original plugin',()=>task('Cleanup plugin',`if(!app.plugins.plugins['k-plex'])await app.plugins.enablePlugin('k-plex');return {enabled:!!app.plugins.plugins['k-plex']};`,120000,true));
   await clean('retire document following',()=>task('Cleanup document following',`const p=app.plugins.plugins['k-plex'];await (${nativeDocumentSessions.toString()})(p).off();return {retired:true};`,120000,true));
   for(const path of [...plannedFiles].reverse())await clean('owned note '+path,()=>task('Cleanup owned note',`const file=app.vault.getFileByPath(${JSON.stringify(path)});if(file)await app.vault.delete(file,true);return {removed:!app.vault.getFileByPath(${JSON.stringify(path)})};`,120000,true));
   await clean('owned empty folder',()=>task('Cleanup owned folder',`const folder=app.vault.getFolderByPath(${JSON.stringify(paths.folder)});if(folder){if(folder.children.length)throw Error('Unowned entries in owned folder');await app.vault.delete(folder,true);}return {removed:!app.vault.getFolderByPath(${JSON.stringify(paths.folder)})};`,120000,true));
   await clean('runtime settings',()=>task('Cleanup runtime settings',`const p=app.plugins.plugins['k-plex'];p.settings=${JSON.stringify(originalNative.settings)};await p.saveSettings(false,false);await p.settingsWriteQueue;return {restored:true};`,120000,true));
   await clean('native layout and sessions',()=>task('Cleanup layout and sessions',`const p=app.plugins.plugins['k-plex'];await app.workspace.changeLayout(${JSON.stringify(originalNative.layout)});await (${nativeDocumentSessions.toString()})(p).restore(${JSON.stringify(originalNative.sessions)});await p.settingsWriteQueue;return {restored:true};`,120000,true));
   await clean('original file inventory',async()=>{const current=evaluate('JSON.stringify({inventory:app.vault.getFiles().map(file=>file.path).sort()})');assert.deepEqual(current.inventory,originalNative.inventory,'Owned fixture inventory not restored');});
   await delay(2000);
   let configWriterSettled=false;
   await clean('configuration writer settlement',async()=>{
    const state=evaluate('JSON.stringify({settled:!window.kplex302RestartTask||window.kplex302RestartTask.done})');
    assert(state.settled,'Unsettled cleanup writer; preserve original Node recovery receipts');
    configWriterSettled=true;
   });
   if(configWriterSettled)for(const row of originalConfig??[])await clean('original configuration bytes '+row.path,async()=>{writeFileSync(row.path,row.bytes);assert(readFileSync(row.path).equals(row.bytes),'Configuration bytes differ');});
  }
 }
 if(report.artifacts)for(const [name,expected]of Object.entries(report.artifacts))await clean('installed artifact '+name,async()=>assert.equal(hash(join(target.pluginDir,name)),expected));
 report.cleanup={status:failures.length?'failed':'passed',failures};if(failures.length){report.status='failed';process.exitCode=1;}
 report.completedAt=new Date().toISOString();save();lock.release();
 console.log(JSON.stringify({status:report.status,report:reportPath,error:report.error,cleanup:report.cleanup.status}));
}
