/**
 * Measures natural Eager folder/file resolver waves in the explicit disposable kplex-test-small.
 * Checks actual bounded folder qualification and close outcomes through existing numeric owners,
 * retaining resource observations separately from owned Markdown/drawing/create-fill-rename cases.
 * Requires the same 107-file baseline and already-staged exact artifacts. Database bytes/history
 * are not restored or claimed identical. No forced reconcile/flush/resolved, build or clock change.
 * Saves private exact configuration backups and restores owned fixtures/settings/layout on exit.
 * Run serially with the three explicit KPLEX_TEST_* vault variables; optional quiet seconds 0/610:
 * node scripts/testing/obsidian/localFolderWave.mjs <fresh-report-directory>
 * CPU includes native host/tooling; Excalidraw may be unavailable; Templater internals are untested.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,realpathSync,unlinkSync,writeFileSync} from 'node:fs';
import {isAbsolute,join,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {obsidianCliExecutable,spawnNativeSync} from './processTools.mjs';
import {validateTarget} from './runner.mjs';
import {createStartupResourceProbe} from './startupResources.mjs';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const artifactRoot=process.env.KPLEX_NATIVE_ARTIFACT_DIR??join(root,'dist');
const sourceRoot=process.env.KPLEX_NATIVE_SOURCE_ROOT??root;
const quietSeconds=Number(process.env.KPLEX_NATIVE_QUIET_SECONDS??0);
assert(quietSeconds===0||quietSeconds===610,'KPLEX_NATIVE_QUIET_SECONDS must be 0 or 610');
const vaultName=process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName,'kplex-test-small','This bounded pilot refuses every other vault');
const target=validateTarget({vaultName,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const output=resolve(process.argv[2]??process.env.KPLEX_HOST_REPORT_DIR??'');
assert((process.argv[2]||process.env.KPLEX_HOST_REPORT_DIR)&&!existsSync(output),'Choose a fresh report directory');
const outputRelative=relative(target.vault,output);
assert(isAbsolute(outputRelative)||outputRelative==='..'||outputRelative.startsWith('..'+sep),'Reports/private backups must remain outside the test vault');
mkdirSync(join(output,'private'),{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const save=(name,value)=>writeFileSync(join(output,name),JSON.stringify(value,null,2));
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
/** Forward bounded argument arrays through the existing long-eval transport. */
function cli(command,...args){
 const result=spawnNativeSync(obsidianCliExecutable(),[`vault=${vaultName}`,command,...args],{cwd:root,encoding:'utf8',timeout:30000,killSignal:'SIGKILL',maxBuffer:8*1024*1024});
 if(result.error||result.status!==0||/^Error:/m.test(result.stdout??''))throw result.error??Error(result.stderr||result.stdout||`CLI ${command} failed`);
 return result.stdout.trim();
}
/** Export JSON only; private snapshots are written separately from aggregate measurement receipts. */
const evaluate=code=>JSON.parse(cli('eval','code='+code).replace(/^=>\s*/,''));
assert.equal(realpathSync(cli('vault','info=path').replace(/^path\s+/,'')),target.vault);
const configNames=['plugins/k-plex/data.json','community-plugins.json','workspace.json','appearance.json','hotkeys.json'];
const backups=configNames.map((name,index)=>{
 const path=join(target.config,name),bytes=existsSync(path)?readFileSync(path):null;
 if(bytes)writeFileSync(join(output,'private',`config-${index}.bin`),bytes);
 return{name,path,bytes};
});
const report={schemaVersion:1,status:'failed',startedAt:new Date().toISOString(),scope:'Three-arm causal pilot; no timing/resource efficiency claim',node:process.version,
 sourceRuntime:process.env.KPLEX_NATIVE_RUNTIME_REF??'Record installed artifact identity; no Git lookup performed',
 source:Object.fromEntries(['src/main.ts','src/adapters/obsidian/sourceAcquisition.ts','src/index/GraphIndex.ts','scripts/testing/obsidian/startupResources.mjs'].map(name=>[name,hash(readFileSync(join(name==='scripts/testing/obsidian/startupResources.mjs'?root:sourceRoot,name)))]).concat(
  ['src/application/IndexingActivity.ts','src/adapters/obsidian/startupDiagnostics.ts'].map(name=>[name,existsSync(join(sourceRoot,name))?hash(readFileSync(join(sourceRoot,name))):null]))),
 artifacts:Object.fromEntries(['main.js','styles.css','manifest.json'].map(name=>{const installed=readFileSync(join(target.pluginDir,name));assert(installed.equals(readFileSync(join(artifactRoot,name))),'Stage the exact verified build before this pilot: '+name);return[name,hash(installed)]})),
 driverSha256:hash(readFileSync(fileURLToPath(import.meta.url))),
 match:{baselineFiles:107,fixtureFolder:'Kplex-174-Matched-Change',currentInputs:'Same current fixture paths, note bodies and explicit Eager/follow/sync/embed settings across builds.',
  cacheInputs:'Not byte-identical databases: source/CAS identity, prior history and orphans may differ. Repeated priming is required; no cold-cache or byte-identical-cache claim.'},
 quiet:{seconds:quietSeconds,scope:quietSeconds?'One separate post-change 610-second natural idle interval, then genuine drain. Existing source polling and orphan cleanup remain scheduled and counted.':'Not requested.',
  foregroundSamplingMs:quietSeconds?10000:350,limits:'Foreground is sampled, not proven continuously. Resource observer and native CLI polling add observation work; no new production poll/scheduler is introduced.'},
 acceptance:{scope:'Owned ordinary Markdown, valid raw-scene Excalidraw Markdown loaded by the real companion view, and native create-fill-rename pattern. Runs after matched arms/quiet; never pooled with them.',
  limitations:'Templater-like tests real Vault/FileManager create, fill and rename events; it does not invoke or claim coverage of the Templater plugin. Excalidraw is explicitly unavailable if the enabled companion is absent.'},
 caveats:['One counts-only diagnostic per arm plus the explicitly requested optional quiet interval; no throughput, allocation-total or speedup claim.',
  'Native renderer CPU includes host/other activity; memory sampling can miss peaks.',
  'IDB request counts are not physical disk bytes; hashing units are UTF-16, not CPU.',
  'Drain checks use existing in-process readers/queues plus observed transactions; no durable-lease census is added.',
  quietSeconds?'Existing periodic source polling and five-minute orphan maintenance remain scheduled and their work during the 610-second interval is counted; later lifecycle cost remains unmeasured.':'Existing periodic source polling and five-minute orphan maintenance remain scheduled; this short pilot does not measure their later lifecycle cost.',
  'Sequential arms add owned files identically across build repetitions. Current inputs are matched; database bytes, source/CAS identity, history and orphans are not. Repeated priming is required.',
  'Native event listeners run after existing source listeners; timestamps describe observation order, not a substituted host dispatch order.',
  'Folder-close scalar observation adds diagnostic overhead near the real 50ms deadline. Covered/rejected returned by the actual source owner is authoritative; no eligibility/timing result is manufactured.',
  'The third arm records folder-only and subsequent settled-folder note as separate intervals.']};
save('report.json',report);

/** Retain rollback independently of the plugin being disabled/re-enabled for actual Eager strategy. */
function install(resourceFactory){
 const p=app.plugins.plugins['k-plex'],remote=require('@electron/remote'),win=remote.getCurrentWindow();
 if(!p||window.__kplex174SmallChange||app.setting.isOpen||app.dragManager.draggable)throw Error('Idle enabled plugin and clean native controller prerequisites required');
 if(!win.getTitle().includes('kplex-test-small')||win.webContents.isDevToolsOpened())throw Error('Explicit Small renderer without DevTools required');
 const conflicting=['__kplex172P3','__kplexInteractionUpdates','__kplexInteractionTouch','__kplexInteractionGateProbe'];
 if(conflicting.some(key=>window[key]))throw Error('Another native controller is active');
 if(app.vault.getFolderByPath('Kplex-174-Matched-Change'))throw Error('Matched fixture folder collision; nothing installed or owned');
 if(app.vault.getFiles().length!==107)throw Error('Matched driver requires the same 107-file baseline');
 const c=window.__kplex174SmallChange={originalSettings:structuredClone(p.settings),layout:app.workspace.getLayout(),
  inventory:app.vault.getFiles().map(file=>file.path).sort(),bounds:win.getBounds(),minimum:win.getMinimumSize(),
  folder:'Kplex-174-Matched-Change',restores:[],events:[],arms:[],started:performance.now(),done:false,phase:'setup',resourceFactory};
 c.wait=ms=>new Promise(done=>window.setTimeout(done,ms));
 c.until=async(predicate,label,timeout=90000)=>{const end=Date.now()+timeout;while(!predicate()){if(c.cancelled||Date.now()>end)throw Error(label);await c.wait(50)}};
 c.emit=(name,data={})=>{if(c.events.length<512)c.events.push({ms:performance.now()-c.started,phase:c.phase,name,...data});else c.eventOverflow=true};
 c.originalThrottle=win.webContents.getBackgroundThrottling();
 const nativeProcess=require('process');
 c.cpu=()=>({cpuUsageMicroseconds:nativeProcess.cpuUsage(),electronCpuUsage:typeof nativeProcess.getCPUUsage==='function'?nativeProcess.getCPUUsage():null,pid:nativeProcess.pid,type:nativeProcess.type});
 c.foreground=()=>({hidden:document.hidden,documentFocused:document.hasFocus(),windowFocused:win.isFocused(),backgroundThrottling:win.webContents.getBackgroundThrottling()});
 c.focus=()=>{remote.app.show?.();remote.app.focus({steal:true});if(win.isMinimized())win.restore();win.show();win.focus();win.webContents.focus()};
 c.focus();
 return JSON.stringify({settings:c.originalSettings,layout:c.layout,inventoryCount:c.inventory.length,originalActualMode:p.index.isOnDemandMode()?'on-demand':'eager',
  folder:c.folder,bounds:c.bounds,minimum:c.minimum,foreground:c.foreground(),host:{node:nativeProcess.versions.node,electron:nativeProcess.versions.electron,chrome:nativeProcess.versions.chrome,obsidian:app.version??null}});
}

/** Observe exact native scalar owners; never call getIndexStatus(), inventory, source flush or scan. */
function launch(quietSeconds){
 const c=window.__kplex174SmallChange,p=app.plugins.plugins['k-plex'],i=p.index,a=i.sourceAcquisition,r=a.repository,cache=i.indexedDb;
 if(i.isOnDemandMode()||p.settings.indexingMode!=='eager')throw Error('Actual Eager session required after plugin restart');
 c.p=p;c.index=i;
 /** Read only existing bounded tokens/scalars; the granted callback itself reads graph scalars. */
 c.folderProof=()=>{
  const wave=a.emptyFolderCreateWave,at=performance.now();let current=null,callbackThrew=false;
  if(typeof wave?.current==='function')try{current=wave.current()}catch{callbackThrew=true}
  return{waveApiAvailable:Object.hasOwn(a,'emptyFolderCreateWave'),qualificationApiAvailable:typeof a.qualifyEmptyFolderCreate==='function',
   wavePresent:!!wave,owned:wave?wave.path===c.folder||wave.path.startsWith(c.folder+'/'):null,ageMs:wave?at-wave.openedAt:null,within50Ms:wave?at-wave.openedAt<=50:null,
   granted:wave?typeof wave.current==='function':null,grantCurrent:current,callbackThrew,members:wave?.members.size??null,children:wave?.folder.children.length??null,
   sameFolderPath:wave?wave.folder.path===wave.path:null,sameParent:wave?wave.folder.parent===wave.parent&&wave.parent.path===wave.parentPath:null,
   hostRevisionMatches:wave?wave.hostRevision===a.hostRevision:null,known:a.knownResolverWave,uncovered:a.uncoveredResolverWave,expired:a.resolverWaveExpired??null,
   actualCloseReason:a.resolverActivityReason??null,source:{enabled:a.enabled,authority:a.localDependencyAuthorityReady,ready:a.localDependenciesReady,restartChecked:a.restartInventoryChecked,
    uncertain:a.uncertainResolution,environment:a.environmentMaintenancePending,resolutionBackpressure:a.resolutionBackpressure,pendingResolution:a.pendingResolutionKeys.size,completion:a.localInventoryCompletionPending},
   certificate:{completePhysicalFolderInventory:i.completePhysicalFolderInventory??null,coverageEpoch:i.physicalFolderCoverageEpoch??null,generation:i.generation,
    hostStructuralRevision:i.hostStructuralRevision??null,onDemand:i.isOnDemandMode(),building:i.building,structural:i.pendingStructuralTasks,hydrating:!!i.snapshotHydrationTask,closed:i.diagnosticsClosed,purged:i.persistentCachePurged}};
 };
 c.state=(withObserver=false)=>{
  const scheduler=i.getWorkPriorityDiagnostics(),resources=withObserver?c.probe?.snapshot():null;
  return{source:{hostRevision:a.hostRevision,inventoryRevision:a.inventoryRevision,maintenanceRevision:a.getMaintenanceRevision(),
   enabled:a.enabled,started:a.started,closed:a.closed,listenerCleanupCount:a.cleanup.length,restartInventoryChecked:a.restartInventoryChecked,authority:a.localDependencyAuthorityReady,ready:a.localDependenciesReady,
   uncertain:a.uncertainResolution,environment:a.environmentMaintenancePending,knownWave:a.knownResolverWave,uncoveredWave:a.uncoveredResolverWave,
   inventory:!!a.inventory,timer:a.timer!==null,resolverWaveTimer:a.resolverWaveTimer!==null,periodicPollScheduled:a.pollTimer!==null,knownImpacts:a.knownImpactTasks,pendingKnown:a.pendingKnownFiles.size,pendingFanout:a.pendingKnownImpacts.size,
   fanoutTasks:a.knownFanoutTasks.size,pendingResolution:a.pendingResolutionKeys.size,completion:a.localInventoryCompletionPending,retry:a.deferredResolutionRetryTimer!==null},
   repository:{writers:r.lanes.size,transactions:r.transactions.size,readers:r.readers.size,impactReaders:r.impactReaders.size,decodeBytes:r.decodeBytes,
    deletes:r.pendingDeletes.size,deleting:!!r.deleteTask,hostJournal:!!r.hostJournalTask,hostChange:!!r.hostChange,retry:!!r.retryTask||r.retryTimer!==null,unsaved:r.unsaved.size},
   cache:{queued:cache.queuedBodyWrites.size,writing:cache.bodyWriteInFlight,timer:cache.bodyWriteTimer!==null,maintenance:cache.maintenanceReads.size},
   graph:{initializing:p.isStartupInitializing(),initialComplete:p.initialIndexComplete,fullSnapshotHydrated:i.fullSnapshotHydrated,fullSnapshotFresh:i.fullSnapshotFresh,sourceBackedStartup:i.sourceBackedStartup,persistentCachePurged:i.persistentCachePurged,sourceNodeVocabularyPublished:i.sourceNodeVocabularyPublished,previewSnapshotPublished:i.previewSnapshotPublished,onDemandPartialState:i.onDemandPartialState,completePhysicalFolderInventory:i.completePhysicalFolderInventory??null,physicalFolderCoverageEpoch:i.physicalFolderCoverageEpoch??null,generation:i.generation,hostStructuralRevision:i.hostStructuralRevision??null,coordinator:!!p.rebuildTask,dirty:p.indexDirty,timer:p.rebuildTimer!==null,
    building:i.building,checkpointSaving:i.checkpointSaving,hydrating:!!i.snapshotHydrationTask,snapshotTimer:i.snapshotPersistTimer!==null,orphanMaintenanceScheduled:i.orphanCleanupTimer!==null,
    structural:i.pendingStructuralTasks,semantic:i.semanticPreparationTasks.size,onDemand:i.onDemandTasks.size,gates:i.onDemandGateTasks.size,
    onDemandBaseline:!!i.onDemandBaselineTask,buildWaiters:i.onDemandBuildWaiters?.size??0,urlRunning:i.urlDiscoveryRunning,urlPublications:i.urlPendingPublications,
    urlOwners:i.urlOwnerTasks.size,urlWrites:i.urlCacheWrites.size},scheduler,
   observer:resources?{pending:resources.pending,transactions:resources.activeTransactions}:null};
 };
 c.idle=()=>{
  const s=c.state(),source=s.source,repo=s.repository,graph=s.graph;
  return source.enabled&&source.restartInventoryChecked&&source.authority&&source.ready&&!source.uncertain&&!source.environment&&!source.inventory&&!source.timer&&!source.resolverWaveTimer
   &&!source.knownImpacts&&!source.pendingKnown&&!source.pendingFanout&&!source.fanoutTasks&&!source.pendingResolution&&!source.completion&&!source.retry
   &&Object.values(repo).every(value=>value===0||value===false)&&Object.values(s.cache).every(value=>value===0||value===false)
   &&graph.initialComplete&&!graph.initializing&&!graph.coordinator&&!graph.dirty&&!graph.timer&&!graph.building&&!graph.checkpointSaving&&!graph.hydrating&&!graph.snapshotTimer
   &&!graph.structural&&!graph.semantic&&!graph.onDemand&&!graph.gates&&!graph.onDemandBaseline&&!graph.buildWaiters&&!graph.urlRunning&&!graph.urlPublications&&!graph.urlOwners&&!graph.urlWrites
   &&s.scheduler.active.every(value=>value===0)&&s.scheduler.waiting===0&&(!c.probe||(()=>{const observed=c.probe.snapshot();return observed.pending===0&&observed.activeTransactions===0})());
 };
 /** A short stable drain guard catches the current native wave; it is not a quiet-window study. */
 c.drain=async(label)=>{let stable=null;await c.until(()=>{if(!c.idle()){stable=null;return false}stable??=performance.now();return performance.now()-stable>=400},label)};
 /** Preserve exact receiver, arguments and return; bounded scalar trace only, no payloads. */
 const wrap=(owner,key,describe)=>{
  const original=owner[key];if(typeof original!=='function')throw Error('Missing source observer boundary '+key);
  const replacement=function(...args){const before={host:a.hostRevision,maintenance:a.getMaintenanceRevision(),known:a.knownResolverWave,uncovered:a.uncoveredResolverWave};
   if(key==='consumeKnownResolverWave')before.folderProof=c.folderProof();
   const result=original.apply(this,args);c.emit(key,{...describe(args,result),before,after:{host:a.hostRevision,maintenance:a.getMaintenanceRevision(),known:a.knownResolverWave,uncovered:a.uncoveredResolverWave}});return result};
  owner[key]=replacement;c.restores.push(()=>{if(owner[key]===replacement)owner[key]=original});
 };
 const observeEvents=()=>{
  const fileType=app.vault.getFileByPath(c.folder+'/Anchor.md').constructor,folderType=app.vault.getRoot().constructor;
  wrap(a,'consumeKnownResolverWave',(_args,result)=>({covered:result,afterClose:c.folderProof()}));
  for(const name of ['beginEmptyFolderCreateWave','qualifyEmptyFolderCreate'])if(typeof a[name]==='function')wrap(a,name,(_args,result)=>({result:typeof result==='boolean'?result:null,proof:c.folderProof()}));
  wrap(a,'markContributorHostChange',args=>({kind:args[0],global:args[1]??args[0]==='resolution'}));
  wrap(a,'promoteUnknownFanout',()=>({}));
  const refs=[app.vault.on('create',item=>c.emit('vault.create',{type:item instanceof fileType?'TFile':item instanceof folderType?'TFolder':'unknown',owned:item.path===c.folder||item.path.startsWith(c.folder+'/')})),
   app.vault.on('modify',item=>c.emit('vault.modify',{owned:item.path.startsWith(c.folder+'/')})),
   app.metadataCache.on('changed',file=>c.emit('metadata.changed',{owned:file.path.startsWith(c.folder+'/')})),
   app.metadataCache.on('resolved',()=>c.emit('metadata.resolved'))];
  c.restores.push(()=>{app.vault.offref(refs[0]);app.vault.offref(refs[1]);app.metadataCache.offref(refs[2]);app.metadataCache.offref(refs[3])});
 };
 c.task=(async()=>{
  await p.activateView();c.host=app.workspace.getLeavesOfType('k-plex-react-view').find(leaf=>p.isKplexLeafVisible(leaf));
  if(!c.host||c.host.view.containerEl.ownerDocument!==document)throw Error('Visible Plex must belong to the measured main renderer');await c.host.view.waitUntilReady();
  app.workspace.setActiveLeaf(c.host,{focus:true});c.focus();p.notifyNavigation(c.folder+'/Anchor.md');
  await c.until(()=>c.host.view.contentEl.querySelector('.kplex-role-center')?.dataset.kplexPath===c.folder+'/Anchor.md','Fixed center missing');
  await c.drain('Initial Eager source/graph/cache drain missing');observeEvents();
  c.mode={actual:i.isOnDemandMode()?'on-demand':'eager',settings:p.settings.indexingMode,urls:p.settings.urlIndexingMode,throttle:p.settings.indexingThrottle,intervalMs:p.settings.indexUpdateInterval};
  /** One interval ends after all genuine queues/leases have drained; no forced work or synthetic close. */
  const interval=async(label,action)=>{
   if(c.cancelled)throw Error('Native probe cancelled');
   c.phase=label;
   const beforeState=c.state(),before=a.getCounters(),workBefore=p.getStartupDiagnostics().sessionWork,at=performance.now(),cpuBefore=c.cpu(),foregroundBefore=c.foreground();
   const validForeground=f=>!f.hidden&&f.documentFocused&&f.windowFocused&&f.backgroundThrottling===c.originalThrottle;
   if(!validForeground(foregroundBefore))throw Error('Foreground prerequisite failed');
   c.probe=c.resourceFactory({phase:()=>c.phase,now:()=>performance.now(),cpu:()=>require('process').cpuUsage(),cpuProcess:{pid:require('process').pid,type:require('process').type},databaseName:cache.connection?.name,detailed:false});
   if(!cache.connection?.name)throw Error('Existing native source database connection required');c.probe.attach(i);
   const eventStart=c.events.length;
   c.activeInterval={label,beforeState,before,workBefore,cpuBefore,eventStart};
   await action();if(c.cancelled)throw Error('Native probe cancelled');await c.drain(label+' genuine drain missing');
   c.probe.sample(require('process').memoryUsage());
   const after=a.getCounters(),workAfter=p.getStartupDiagnostics().sessionWork,cpuAfter=c.cpu(),foregroundAfter=c.foreground();
   if(!validForeground(foregroundAfter)||c.foregroundViolation)throw Error('Foreground changed during measured interval');
   if(c.host.view.contentEl.querySelector('.kplex-role-center')?.dataset.kplexPath!==c.folder+'/Anchor.md')throw Error('Measured center changed');
   const result={label,beforeState,elapsedMs:performance.now()-at,sourceDelta:Object.fromEntries(Object.keys(before).map(key=>[key,after[key]-before[key]])),
    sessionWorkDelta:Object.fromEntries(Object.keys(workBefore).map(key=>[key,workAfter[key]-workBefore[key]])),
    cpuBefore,cpuAfter,cpuDeltaMicroseconds:{user:cpuAfter.cpuUsageMicroseconds.user-cpuBefore.cpuUsageMicroseconds.user,system:cpuAfter.cpuUsageMicroseconds.system-cpuBefore.cpuUsageMicroseconds.system},
    cumulativeElectronCpuDeltaSeconds:typeof cpuBefore.electronCpuUsage?.cumulativeCPUUsage==='number'&&typeof cpuAfter.electronCpuUsage?.cumulativeCPUUsage==='number'?cpuAfter.electronCpuUsage.cumulativeCPUUsage-cpuBefore.electronCpuUsage.cumulativeCPUUsage:null,
    foregroundBefore,foregroundAfter,state:c.state(true),resources:c.probe.snapshot(),events:c.events.slice(eventStart)};
   c.probe.stop();c.probe=null;c.activeInterval=null;return result;
  };
  const body='Causal probe fixture.\n';
  const note=async path=>{const file=await app.vault.create(path,body);await c.until(()=>app.metadataCache.getFileCache(file),'Natural note metadata missing')};
  c.arms.push({arm:'existing-folder',note:await interval('existing-folder/note',()=>note(c.folder+'/Existing/Probe.md'))});
  c.arms.push({arm:'new-subfolder-and-note',combined:await interval('new-subfolder-and-note',async()=>{await app.vault.createFolder(c.folder+'/2026-10-17');await note(c.folder+'/2026-10-17/Probe.md')})});
  const third={arm:'folder-then-settled-note'};c.arms.push(third);
  third.folder=await interval('folder-then-settled-note/folder',()=>app.vault.createFolder(c.folder+'/2026-10-18'));
  third.note=await interval('folder-then-settled-note/note',()=>note(c.folder+'/2026-10-18/Probe.md'));
  if(quietSeconds)c.quietResult=await interval('post-changes-quiet-610s',()=>new Promise((resolve,reject)=>{
   const timer=window.setTimeout(()=>{c.cancelQuiet=null;resolve()},610000);
   c.cancelQuiet=()=>{window.clearTimeout(timer);c.cancelQuiet=null;reject(Error('Quiet interval cancelled'))};
  }));
  c.acceptance=[];
  /** Assert canonical physical endpoints and one real authored link without acquiring sources. */
  const assertOwned=(file,folder,hasAnchor)=>{
   if(app.vault.getFileByPath(file.path)!==file||i.get(file.path)?.file!==file||!i.get('folder:'+folder)?.isFolder)throw Error('Owned canonical file/folder publication missing');
   if(hasAnchor&&!i.get(file.path)?.neighbours.has(c.folder+'/Anchor.md'))throw Error('Owned authored link did not publish');
  };
  let ordinary;
  const ordinaryFolder=c.folder+'/Acceptance-Ordinary';
  const ordinaryWork=await interval('acceptance/ordinary-Markdown',async()=>{
   await app.vault.createFolder(ordinaryFolder);ordinary=await app.vault.create(ordinaryFolder+'/Ordinary.md','Owned ordinary acceptance.\n[['+c.folder+'/Anchor]]\n');
   await c.until(()=>app.metadataCache.getFileCache(ordinary),'Ordinary native metadata missing');
  });
  assertOwned(ordinary,ordinaryFolder,true);c.acceptance.push({case:'ordinary-Markdown',status:'passed',canonical:true,authoredLink:true,work:ordinaryWork});
  const companion=app.plugins.plugins['obsidian-excalidraw-plugin'];
  if(typeof companion?.isExcalidrawFile!=='function')c.acceptance.push({case:'valid-Excalidraw-Markdown',status:'unavailable',reason:'Enabled Excalidraw companion classification/view owner is absent'});
  else{
   let drawing,leaf;const drawingFolder=c.folder+'/Acceptance-Drawing';
   // Canonical uncompressed envelope, authored here; no templates or borrowed note payloads.
   const scene=JSON.stringify({type:'excalidraw',version:2,source:'https://excalidraw.com',elements:[],appState:{gridSize:null,viewBackgroundColor:'#ffffff'},files:{}});
   const drawingBody=['---','excalidraw-plugin: parsed','tags: [excalidraw]','---','# Excalidraw Data','','## Text Elements','%%','## Drawing','```json',scene,'```','%%'].join('\n');
   const drawingWork=await interval('acceptance/valid-Excalidraw-Markdown',async()=>{
    await app.vault.createFolder(drawingFolder);drawing=await app.vault.create(drawingFolder+'/Drawing.excalidraw.md',drawingBody);
    await c.until(()=>companion.isExcalidrawFile(drawing),'Real companion did not recognize owned Markdown drawing');
    leaf=app.workspace.getLeaf('tab');c.restores.push(()=>{if(leaf.parent)leaf.detach()});
    try{
     await leaf.openFile(drawing);
     await c.until(()=>leaf.view.getViewType()==='excalidraw'&&leaf.view.file===drawing&&leaf.view.excalidrawAPI&&!leaf.view.excalidrawAPI.getAppState().isLoading,'Owned scene did not load in the real drawing view');
     if(leaf.view.excalidrawAPI.getSceneElements().length!==0)throw Error('Owned empty drawing scene was not preserved');
    }finally{await leaf.setViewState({type:'empty',state:{}});leaf.detach();app.workspace.setActiveLeaf(c.host,{focus:true});c.focus()}
   });
   assertOwned(drawing,drawingFolder,false);c.acceptance.push({case:'valid-Excalidraw-Markdown',status:'passed',classification:true,nativeViewLoaded:true,sceneElements:0,canonical:true,work:drawingWork});
  }
  let filled;const fillFolder=c.folder+'/Acceptance-Fill-Rename',oldPath=fillFolder+'/Untitled.md',newPath=fillFolder+'/Filled.md';
  const fillWork=await interval('acceptance/create-fill-rename',async()=>{
   await app.vault.createFolder(fillFolder);filled=await app.vault.create(oldPath,'');
   await app.vault.modify(filled,'Owned filled acceptance.\n[['+c.folder+'/Anchor]]\n');
   await app.fileManager.renameFile(filled,newPath);
   await c.until(()=>app.metadataCache.getFileCache(filled),'Filled/renamed native metadata missing');
  });
  assertOwned(filled,fillFolder,true);
  if(filled.path!==newPath||app.vault.getFileByPath(oldPath)||i.get(oldPath)?.file===filled)throw Error('Old native/index identity remained after owned rename');
  c.acceptance.push({case:'create-fill-rename',status:'passed',nativeOwners:['Vault.create','Vault.modify','FileManager.renameFile'],sameFileIdentity:true,oldPhysicalEndpointRemoved:true,canonical:true,authoredLink:true,work:fillWork});
  if(c.eventOverflow)throw Error('Bounded causal trace overflow');
  c.done=true;
 })().catch(error=>{c.error=String(error);c.partial={interval:c.activeInterval,source:a.getCounters(),cpu:c.cpu(),resources:c.probe?.snapshot(),state:c.state(),events:c.events.slice(c.activeInterval?.eventStart??0)};c.done=true});
 return JSON.stringify({started:true,actualMode:'eager'});
}

let installed=false,modeChanged=false;
try{
 const baseline=evaluate(`(${install.toString()})(${createStartupResourceProbe.toString()})`);installed=true;
 save('private/runtime.json',baseline);
 report.preflight={inventoryCount:baseline.inventoryCount,originalActualMode:baseline.originalActualMode,ownedFolder:baseline.folder,host:baseline.host,foreground:baseline.foreground};
 assert.equal(baseline.originalActualMode,baseline.settings.indexingMode??'on-demand','Resolve a pre-existing pending strategy change before this pilot');
 evaluate(`(async()=>{const c=window.__kplex174SmallChange,p=app.plugins.plugins['k-plex'];Object.assign(p.settings,{indexingMode:'eager',followActiveFile:false,documentSyncMode:'off',embedCentralNode:false});await p.saveSettings(false,false);await p.settingsWriteQueue;return JSON.stringify({saved:true})})()`);modeChanged=true;
 cli('plugin:disable','id=k-plex');
 report.setup=evaluate(`(async()=>{const c=window.__kplex174SmallChange;if(app.vault.getFolderByPath(c.folder))throw Error('Owned fixture collision');await app.vault.createFolder(c.folder);c.ownsFolder=true;await app.vault.createFolder(c.folder+'/Existing');await app.vault.create(c.folder+'/Anchor.md','Causal anchor.\\n');return JSON.stringify({created:true})})()`);
 cli('plugin:enable','id=k-plex');
 const enabledDeadline=Date.now()+30000;
 while(!evaluate(`JSON.stringify({loaded:!!app.plugins.plugins['k-plex']?.index})`).loaded){if(Date.now()>enabledDeadline)throw Error('Plugin enable deadline');await sleep(150)}
 report.launch=evaluate(`(${launch.toString()})(${quietSeconds})`);
 const end=Date.now()+480000+quietSeconds*1000;let pollPhase='setup';
 while(true){
  await sleep(pollPhase==='post-changes-quiet-610s'?10000:350);
  const state=evaluate(`(()=>{const c=window.__kplex174SmallChange;if(c.probe){c.probe.sample(require('process').memoryUsage());const f=c.foreground();if(f.hidden||!f.documentFocused||!f.windowFocused||f.backgroundThrottling!==c.originalThrottle)c.foregroundViolation=true}return JSON.stringify({done:c.done,error:c.error,phase:c.phase,state:c.state?.(),foreground:c.foreground()})})()`);
  writeFileSync(join(output,'progress.json'),JSON.stringify(state,null,2));
  pollPhase=state.phase;
  if(state.done){report.result=evaluate(`(()=>{const c=window.__kplex174SmallChange;return JSON.stringify({arms:c.arms,quietResult:c.quietResult,acceptance:c.acceptance,partial:c.partial,events:c.events,eventOverflow:!!c.eventOverflow,mode:c.mode,error:c.error,lastState:c.state?.()})})()`);if(state.error)throw Error(state.error);break}
  if(Date.now()>end)throw Error('Bounded three-arm pilot deadline');
 }
 report.status=report.result.acceptance?.some(result=>result.status!=='passed')?'partial':'passed';
}catch(error){report.error=String(error)}finally{
 /** Independent attempts preserve the original failure and still restore durable configuration. */
 const attempt=async(label,action)=>{try{await action()}catch(error){report.cleanupErrors??=[];report.cleanupErrors.push({label,error:String(error)});report.status='failed'}};
 if(installed)await attempt('cancel-and-release-observers',async()=>{
  const released=evaluate(`(()=>{const c=window.__kplex174SmallChange;c.cancelled=true;c.cancelQuiet?.();const errors=[];try{c.probe?.stop()}catch(e){errors.push('resource observer: '+String(e))}c.probe=null;for(const restore of c.restores.reverse())try{restore()}catch(e){errors.push('event observer: '+String(e))}c.restores=[];return JSON.stringify({released:errors.length===0,errors})})()`);
  assert(released.released,JSON.stringify(released.errors));
  const end=Date.now()+10000;while(!evaluate(`JSON.stringify({done:!window.__kplex174SmallChange.task||window.__kplex174SmallChange.done})`).done){if(Date.now()>end)throw Error('Accepted native task did not finish before fixture cleanup');await sleep(100)}
 });
 if(modeChanged)await attempt('disable-temporary-eager-session',async()=>{cli('plugin:disable','id=k-plex')});
 if(installed)await attempt('delete-owned-fixtures',async()=>{
  report.fixtureCleanup=evaluate(`(async()=>{const c=window.__kplex174SmallChange;if(c.task&&!c.done)throw Error('Active task still owns fixture');for(const type of ['markdown','k-plex-react-view','k-plex-sidepanel-view'])for(const leaf of app.workspace.getLeavesOfType(type)){const path=leaf.view.file?.path??leaf.view.contentEl?.querySelector('.kplex-role-center')?.dataset.kplexPath;if(path?.startsWith(c.folder+'/'))leaf.detach()}const folder=app.vault.getFolderByPath(c.folder);if(c.ownsFolder&&folder)await app.vault.delete(folder,true);return JSON.stringify({removed:!app.vault.getFolderByPath(c.folder),inventoryRestored:JSON.stringify(app.vault.getFiles().map(file=>file.path).sort())===JSON.stringify(c.inventory),count:app.vault.getFiles().length})})()`);
  assert(report.fixtureCleanup.removed&&report.fixtureCleanup.inventoryRestored,'Owned fixture or unexpected vault inventory remains');
 });
 /** Write only the exact named configuration files captured from this validated disposable target. */
 const restoreBytes=()=>{const errors=[];for(const backup of backups)try{if(backup.bytes)writeFileSync(backup.path,backup.bytes);else if(existsSync(backup.path))unlinkSync(backup.path)}catch(error){errors.push(error)}if(errors.length)throw new AggregateError(errors,'Configuration restoration failed')};
 await attempt('restore-configuration-before-reenable',async()=>restoreBytes());
 if(modeChanged)await attempt('reenable-original-session',async()=>{cli('plugin:enable','id=k-plex')});
 if(installed)await attempt('restore-runtime-layout-and-preferences',async()=>{
  report.runtimeCleanup=evaluate(`(async()=>{const c=window.__kplex174SmallChange;if(c.task&&!c.done)throw Error('Retain cancelled controller until accepted fixture task settles');c.cancelled=false;await c.until(()=>!!app.plugins.plugins['k-plex']?.index,'Original plugin unavailable',30000);const p=app.plugins.plugins['k-plex'];Object.assign(p.settings,structuredClone(c.originalSettings));await p.saveSettings(false,false);await p.settingsWriteQueue;await app.workspace.changeLayout(c.layout);Object.assign(p.settings,structuredClone(c.originalSettings));await p.saveSettings(false,false);await p.settingsWriteQueue;const win=require('@electron/remote').getCurrentWindow();win.setMinimumSize(...c.minimum);win.setBounds(c.bounds);const result={mode:p.index.isOnDemandMode()?'on-demand':'eager',settingsRestored:JSON.stringify(p.settings)===JSON.stringify(c.originalSettings),backgroundThrottlingRestored:win.webContents.getBackgroundThrottling()===c.originalThrottle,controllerRemoved:true};delete window.__kplex174SmallChange;return JSON.stringify(result)})()`);
  assert(report.runtimeCleanup.settingsRestored&&report.runtimeCleanup.backgroundThrottlingRestored,'Runtime preference restoration mismatch');
  assert.equal(report.runtimeCleanup.mode,report.preflight.originalActualMode,'Original actual session mode was not restored');
 });
 await attempt('restore-final-exact-config-bytes',async()=>{await sleep(700);restoreBytes();report.configurationRestored=backups.every(backup=>backup.bytes?existsSync(backup.path)&&readFileSync(backup.path).equals(backup.bytes):!existsSync(backup.path));assert(report.configurationRestored)});
 report.completedAt=new Date().toISOString();save('report.json',report);
 writeFileSync(join(output,'driver-source.mjs'),readFileSync(fileURLToPath(import.meta.url)));
}
console.log(JSON.stringify({status:report.status,error:report.error,cleanupErrors:report.cleanupErrors,report:join(output,'report.json')}));
if(report.status!=='passed')process.exitCode=report.status==='partial'?2:1;
