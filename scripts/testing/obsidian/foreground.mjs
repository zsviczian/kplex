/** Serial native foreground smoke with optional live-update cases; owns target/hash/report/config guards for disposable fixtures. */
import { spawnNativeSync as spawnSync, obsidianCliExecutable } from "./processTools.mjs";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, realpathSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTarget } from './runner.mjs';
import { runLiveUpdatesForeground } from './foregroundLiveUpdates.mjs';
import {withNativeDocumentSessions} from './nativeDocumentSessions.mjs';
import {Script} from 'node:vm';

/** Native layout serialization is authoritative for every view, including Bases and Markdown. */
function foregroundLeafStates(layout){
 const rows=[];
 const visit=value=>{if(!value||typeof value!=='object')return;if(value.type==='leaf'){if(typeof value.id!=='string')throw Error('Native layout leaf has no stable ID');rows.push({id:value.id,state:value.state});return;}for(const child of Object.values(value))if(child&&typeof child==='object')visit(child);};
 visit(layout);return rows.sort((a,b)=>a.id.localeCompare(b.id));
}

/** Capture only after the existing setup fence and settings writer settle, before fixture writes. */
async function captureForegroundInventoryState(app,documents){
 const plugin=app.plugins.plugins['k-plex'];await plugin.settingsWriteQueue;
 if(plugin.index.building||plugin.index.hasPendingSnapshotHydration())throw Error('Inventory baseline is not settled');
 const layout=app.workspace.getLayout(),recent=app.workspace.getMostRecentLeaf(),mostRecentLeafId=recent?.id??null;
 if(recent&&(typeof mostRecentLeafId!=='string'||app.workspace.getLeafById(mostRecentLeafId)!==recent))throw Error('Native recent document has no verified leaf ID');
 return JSON.parse(JSON.stringify({layout,mostRecentLeafId,sessions:documents(plugin).capture(),settings:plugin.settings,leaves:foregroundLeafStates(layout)}));
}

/** Node retains a detached immutable recovery input; renderer cleanup never owns the only copy. */
function freezeForegroundInventoryState(value){
 const copy=JSON.parse(JSON.stringify(value));const freeze=node=>{if(node&&typeof node==='object'){Object.values(node).forEach(freeze);Object.freeze(node);}return node;};return freeze(copy);
}

/** Restore independent native owners even if another restoration stage fails. */
async function restoreForegroundInventoryState(app,plugin,before,documents){
 const errors=[],restoredNativeStates=[],attempt=async(name,work)=>{try{await work();}catch(error){errors.push(name+': '+error);}},clone=value=>JSON.parse(JSON.stringify(value));
 await attempt('native layout',()=>app.workspace.changeLayout(clone(before.layout)));
 for(const row of before.leaves)await attempt('native leaf '+row.id,async()=>{const leaf=app.workspace.getLeafById(row.id);if(!leaf)throw Error('Original native leaf missing');await leaf.loadIfDeferred();});
 await attempt('document sessions',()=>documents(plugin).restore(clone(before.sessions)));
 await attempt('native recent document',()=>{
  if(before.mostRecentLeafId!==null){const leaf=app.workspace.getLeafById(before.mostRecentLeafId);if(!leaf)throw Error('Original recent native document missing');app.workspace.setActiveLeaf(leaf,{focus:false});}
  if((app.workspace.getMostRecentLeaf()?.id??null)!==before.mostRecentLeafId)throw Error('Native recent document differs before active-sidebar restoration');
 });
 await attempt('native active leaf',()=>{
  const id=before.layout.active;if(typeof id==='string'){const leaf=app.workspace.getLeafById(id);if(!leaf)throw Error('Original active native leaf missing');app.workspace.setActiveLeaf(leaf,{focus:false});}
  if(app.workspace.getLayout().active!==before.layout.active)throw Error('Native active leaf differs before writer drain');
 });
 // Core linked sidebars can follow the restored active Bases/Markdown leaf during changeLayout.
 // Reapply only changed captured native states after that event, without selecting those leaves.
 for(const row of before.leaves){
  if(['k-plex-react-view','k-plex-sidepanel-view'].includes(row.state.type))continue;
  await attempt('native serialized state '+row.id,async()=>{
   const current=foregroundLeafStates(app.workspace.getLayout()).find(value=>value.id===row.id);if(current&&JSON.stringify(current.state)===JSON.stringify(row.state))return;
   const leaf=app.workspace.getLeafById(row.id);if(!leaf)throw Error('Original native state owner missing');
   await leaf.setViewState({...clone(row.state),active:false});await leaf.loadIfDeferred();
   const after=foregroundLeafStates(app.workspace.getLayout()).find(value=>value.id===row.id),savedPath=row.state.state?.file??null;
   if(row.state.type==='file-properties'&&(after?.state?.state?.file??null)!==savedPath){
    // src/adapters/obsidian/filePropertiesCenter.ts verifies this native loader owner. Unbound
    // Properties may decline setViewState; load only its captured file without native activation.
    const view=leaf.view,loader=view.loadFile;
    if(view.getViewType()!=='file-properties'||!('file' in view)||typeof loader!=='function')throw Error('Verified native File properties loader unavailable');
    if(savedPath!==null&&typeof savedPath!=='string')throw Error('Captured File properties target is invalid');
    const file=savedPath===null?null:app.vault.getFileByPath(savedPath);
    if(savedPath!==null&&(!file||file.path!==savedPath))throw Error('Captured File properties target missing');
    const current=()=>app.workspace.getLeafById(row.id)===leaf&&leaf.view===view&&view.getViewType()==='file-properties'&&view.loadFile===loader&&(file===null||file.path===savedPath&&app.vault.getFileByPath(savedPath)===file);
    if(!current())throw Error('Native File properties owner or target changed');
    await loader.call(view,file);
    if(!current())throw Error('Native File properties owner or target changed');
    if((view.file??null)!==file)throw Error('Native File properties loader did not restore the captured target');
   }
   restoredNativeStates.push(row.id);
  });
 }
 await attempt('runtime settings writer',async()=>{plugin.settings=clone(before.settings);await plugin.saveSettings(false,false);await plugin.settingsWriteQueue;});
 await attempt('native workspace writer',async()=>{app.workspace.requestSaveLayout();await app.workspace.requestSaveLayout.run();await plugin.settingsWriteQueue;});
 await attempt('native state verification',async()=>{
  if((app.workspace.getMostRecentLeaf()?.id??null)!==before.mostRecentLeafId)throw Error('Native recent document differs after inventory cleanup');
  if(app.workspace.getLayout().active!==before.layout.active)throw Error('Native active leaf differs after inventory cleanup');
  if(JSON.stringify(foregroundLeafStates(app.workspace.getLayout()))!==JSON.stringify(before.leaves))throw Error('Native IDs/types/states differ after inventory cleanup');
  const actual=documents(plugin).capture().sort((a,b)=>String(a.id).localeCompare(String(b.id))),expected=clone(before.sessions).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Native document sessions differ after inventory cleanup');
  if(JSON.stringify(plugin.settings)!==JSON.stringify(before.settings))throw Error('Live runtime settings differ after inventory cleanup');
 });
 if(errors.length)throw Error(errors.join('; '));return{nativeLeaves:before.leaves.length,documentSessions:before.sessions.length,mostRecentLeafId:before.mostRecentLeafId,activeLeafId:before.layout.active,restoredNativeStates,layoutRestored:true,sessionsRestored:true,settingsRestored:true,writersDrained:true};
}

/** Inventory teardown cannot let a failed fixture delete/source convergence skip workspace restore. */
async function cleanupForegroundInventory(app,c,before,documents){
 const errors=[],attempt=async(name,work)=>{try{await work();}catch(error){errors.push(name+': '+error);}};
 c.cancelled=true;c.held=false;c.release?.();c.releasePrewrite?.();window.clearTimeout(c.timer);
 await attempt('pair observers',()=>c.restorePairTrace?.());await attempt('source observers',()=>c.restoreConvergenceDiagnostics?.());
 await attempt('source methods',()=>{if(c.source){c.source.backgroundCheckpoint=c.originalCheckpoint;if(c.originalFlush)c.source.flush=c.originalFlush;}});
 await attempt('accepted native work',()=>c.task);
 await attempt('source settings',()=>{c.p.settings=JSON.parse(JSON.stringify(before?.settings??c.originalSettings));c.p.index.invalidateSemanticPolicy();});
 for(const path of [...c.owned].reverse())await attempt('owned fixture '+path,async()=>{const file=app.vault.getAbstractFileByPath(path);if(file)await app.vault.delete(file,true);});
 await attempt('source convergence',async()=>{
  const start=Date.now(),deadline=start+30000;c.cleanupConvergence={attempts:0,ready:false};
  while(Date.now()<deadline){c.cleanupConvergence.attempts++;const saved=await c.p.index.flushSourceRepository();if(saved&&c.p.index.sourceAcquisition.hasSemanticDependencies()){c.cleanupConvergence.ready=true;break;}await new Promise(resolve=>window.setTimeout(resolve,250));}
  c.cleanupConvergence.elapsedMs=Date.now()-start;if(!c.cleanupConvergence.ready)throw Error('Restored source authority did not converge within 30 seconds');await c.p.index.refreshSemanticSettings();
 });
 await attempt('native workspace restoration',async()=>{if(before)c.nativeRestoration=await restoreForegroundInventoryState(app,c.p,before,documents);else if(c.owned.length)throw Error('Inventory wrote fixtures without a Node-owned baseline');});
 await attempt('owned fixture verification',()=>{if(c.owned.some(path=>app.vault.getAbstractFileByPath(path)))throw Error('Owned fixture remains after cleanup');});
 if(errors.length)throw Error(errors.join('; '));return true;
}

/** Each exact-byte restoration is independent; an earlier failed path cannot skip the others. */
function restoreForegroundConfiguration(entries,files){
 const errors=[];for(const {path,bytes}of entries)try{if(bytes!==null)files.writeFileSync(path,bytes);else if(files.existsSync(path))files.unlinkSync(path);if(bytes===null?files.existsSync(path):!files.readFileSync(path).equals(bytes))throw Error('Configuration bytes differ');}catch(error){errors.push(path+': '+error);}
 if(errors.length)throw Error(errors.join('; '));
}
const scenario = process.env.KPLEX_FOREGROUND_SCENARIO ?? 'inventory';
if (!['inventory', 'live-updates'].includes(scenario)) throw Error('Use inventory or live-updates foreground scenario');
const root = resolve(fileURLToPath(new URL('../../..', import.meta.url))), vaultName = process.env.KPLEX_TEST_VAULT_NAME;
if (scenario === 'live-updates' && vaultName !== 'kplex-test-small') throw Error('Live updates require the explicitly selected disposable small vault');
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const out = process.env.KPLEX_HOST_REPORT_DIR;
if (!out)
    throw Error('Set KPLEX_HOST_REPORT_DIR explicitly');
if (scenario === 'live-updates' && existsSync(out) && readdirSync(out).length) throw Error('Live updates require a fresh report directory');
mkdirSync(out, { recursive: true });
let data = readFileSync(join(target.pluginDir, 'data.json')), enabled = readFileSync(join(target.config, 'community-plugins.json'));
let workspace = scenario === 'live-updates' ? readFileSync(join(target.config, 'workspace.json')) : existsSync(join(target.config,'workspace.json'))?readFileSync(join(target.config,'workspace.json')):null;
const report = { status: 'running', startedAt: new Date().toISOString(), artifacts: {}, limitations: ['Desktop native API/DOM smoke, controlled acquisition pause outside transactions; no trusted pointer or physical mobile timing claim'] };
/** Execute one serial native command with the established deadline and fail closed on eval errors. */
const cli = (name, ...args) => { const r = spawnSync(obsidianCliExecutable(), [`vault=${vaultName}`, name, ...args], { encoding: 'utf8', timeout: 30000, killSignal: 'SIGKILL', maxBuffer: 4 * 1024 * 1024 }); if (r.error || r.status !== 0 || /^Error:/m.test(r.stdout))
    throw Error(r.error?.message || r.stderr || r.stdout); return r.stdout.trim(); };
/** Decode the bounded controller response while leaving native async work outside the CLI call. */
const evaluate = code => { new Script(code);const raw = cli('eval', `code=${scenario==='inventory'?withNativeDocumentSessions(code):code}`); return JSON.parse(raw.slice(raw.indexOf('{'))); };
/** Yield the driver between polls; renderer scheduling and throttling remain unchanged. */
const wait = ms => new Promise(r => setTimeout(r, ms));
let controllerInstalled = false,inventoryState=null,inventoryCleanupSettled=false;
try {
    // Obsidian 1.15 renamed vault-info. Verify the selected renderer's canonical vault before writes.
    if (realpathSync(evaluate('JSON.stringify({path:app.vault.adapter.getBasePath()})').path) !== target.vault)
        throw Error('Wrong vault');
    // An immutable accepted baseline uses the same assertions, with explicit runtime attribution.
    const artifactDirectory = process.env.KPLEX_PROBE_ARTIFACT_DIR ?? join(root, 'dist');
    if (process.env.KPLEX_PROBE_ARTIFACT_DIR) {
        if (!/^[a-f0-9]{7,40}$/.test(process.env.KPLEX_PROBE_BASELINE_REF ?? '')) throw Error('Alternate artifact root requires baseline attribution');
        report.baselineRef = process.env.KPLEX_PROBE_BASELINE_REF;
    }
    for (const name of ['main.js', 'styles.css', 'manifest.json']) {
        const hash = p => createHash('sha256').update(readFileSync(p)).digest('hex');
        report.artifacts[name] = hash(join(artifactDirectory, name));
        if (report.artifacts[name] !== hash(join(target.pluginDir, name)))
            throw Error('Installed build mismatch');
    }
    if (scenario === 'live-updates') {
        report.scenario = scenario;
        const source = readFileSync(new URL('./foregroundLiveUpdates.mjs', import.meta.url));
        report.scenarioSourceSha256 = createHash('sha256').update(source).digest('hex');
        report.driverSha256 = createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex');
        report.resourceProbeSha256 = createHash('sha256').update(readFileSync(new URL('./startupResources.mjs', import.meta.url))).digest('hex');
        writeFileSync(join(out, 'foregroundLiveUpdates.mjs'), source);
        writeFileSync(join(out, 'foreground.mjs'), readFileSync(import.meta.filename));
        report.result = await runLiveUpdatesForeground({ cli, evaluate, wait, report, vaultName, composer: process.env.KPLEX_FOREGROUND_COMPOSER === '1', workspaceReady: process.env.KPLEX_FOREGROUND_WORKSPACE_READY === 'true', progress: () => writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2)) });
    } else {
    evaluate(`(()=>{if(window.__kplexForegroundTest)throw Error('Controller exists');const p=app.plugins.plugins['k-plex'],remote=require('@electron/remote'),w=remote.getCurrentWindow();remote.app.show?.();remote.app.focus({steal:true});w.show();w.moveTop();w.focus();const c=window.__kplexForegroundTest={p,originalSettings:JSON.parse(JSON.stringify(p.settings)),folder:'Kplex-Foreground-Regression',owned:[],scenarios:[],pairTrace:[],done:false};c.timer=window.setTimeout(()=>{c.task=(async()=>{
 const delay=ms=>new Promise(r=>window.setTimeout(r,ms)),check=(v,m)=>{if(!v)throw Error(m)},until=async(fn,m,ms=15000)=>{const end=Date.now()+ms;while(!fn()){check(!c.cancelled,'Controller cancelled');if(Date.now()>end)throw Error(m);await delay(25)}};
 const timed=async(id,work)=>{check(!c.cancelled,'Controller cancelled');const start=performance.now();await work();check(!c.cancelled,'Controller cancelled');c.scenarios.push({id,elapsedMs:performance.now()-start,backgroundHeld:c.held===true})};
 // Observe only bounded scalar diagnostics. Wrappers return each original Promise unchanged.
 const index=p.index,source=index.sourceAcquisition,originalPair=index.prepareRelationshipPair,originalSourcePair=source.prepareRequestedPair;
 const trace=(owner,args,invoke)=>{const start=performance.now(),publication=index.publicationRevision,sourceRevision=p.getIndexSourceRevision(),maintenance=source.getMaintenanceRevision(),paths=owner==='index'?args.slice(0,2):args[0].endpoints.map(ref=>ref.physicalPath??ref.semanticPath),tokens=paths.map(path=>{const file=app.vault.getFileByPath(path);return{path,file,cache:file?app.metadataCache.getFileCache(file):null,mtime:file?.stat.mtime,size:file?.stat.size}}),beforeStructural=index.pendingStructuralTasks;
 const record=(value,error)=>{if(c.pairTrace.length>=64)return;c.pairTrace.push({owner,elapsedMs:performance.now()-start,outcome:error?'threw':owner==='index'?value?'ready':'not-ready':value.outcome,reason:owner==='source'?value?.reason:undefined,error:error?String(error):undefined,cacheChanged:tokens.map(t=>Boolean(t.file&&app.metadataCache.getFileCache(t.file)!==t.cache)),fileChanged:tokens.map(t=>app.vault.getFileByPath(t.path)!==t.file||t.file?.stat.mtime!==t.mtime||t.file?.stat.size!==t.size),publicationChanged:index.publicationRevision!==publication,sourceRevisionChanged:p.getIndexSourceRevision()!==sourceRevision,maintenanceChanged:source.getMaintenanceRevision()!==maintenance,pendingStructuralBefore:beforeStructural,pendingStructuralAfter:index.pendingStructuralTasks,priority:index.getWorkPriorityDiagnostics()})};
 let promise;try{promise=invoke()}catch(error){record(undefined,error);throw error}promise.then(value=>record(value),error=>record(undefined,error));return promise};
 const pairWrapper=function(...args){return trace('index',args,()=>originalPair.apply(this,args))},sourcePairWrapper=function(...args){return trace('source',args,()=>originalSourcePair.apply(this,args))};index.prepareRelationshipPair=pairWrapper;source.prepareRequestedPair=sourcePairWrapper;c.restorePairTrace=()=>{if(index.prepareRelationshipPair===pairWrapper)index.prepareRelationshipPair=originalPair;if(source.prepareRequestedPair===sourcePairWrapper)source.prepareRequestedPair=originalSourcePair};
 check(!app.vault.getFolderByPath(c.folder),'Fixture already exists');
 // Native focus activation settles asynchronously; wait before any fixture/action timing.
 await until(()=>!document.hidden&&document.hasFocus()&&w.isFocused(),'Foreground required',5000);
 await until(()=>!p.index.building&&!p.index.hasPendingSnapshotHydration(),'Initial small-vault settle',90000);
 c.prewriteReady=true;await new Promise(resolve=>{c.releasePrewrite=resolve});check(!c.cancelled&&c.baselineAccepted,'Node-owned inventory baseline required before fixture writes');
 await app.vault.createFolder(c.folder);c.owned.push(c.folder);
 await app.vault.createFolder(c.folder+'/Nested');c.owned.push(c.folder+'/Nested');
 const create=async(name,content)=>{const f=await app.vault.create(c.folder+'/'+name,content);c.owned.push(f.path);return f};
 c.a=await create('A.md','---\\nParent: '+JSON.stringify('[['+c.folder+'/B]]')+'\\n---\\n# A\\n');c.b=await create('B.md','# B');c.d=await create('C.md','# C');
 await create('Nested/Leaf1.md','# Leaf1');await create('Nested/Leaf2.md','# Leaf2');
 await until(()=>c.owned.filter(path=>path.endsWith('.md')).every(path=>app.metadataCache.getFileCache(app.vault.getFileByPath(path))),'Fixture MetadataCache');
 await until(()=>app.metadataCache.getFirstLinkpathDest(c.folder+'/B',c.a.path)===c.b&&app.metadataCache.resolvedLinks[c.a.path]?.[c.b.path]>0,'Fixture exact Parent resolver closure');
 Object.assign(p.settings,{documentSyncMode:'off',followActiveFile:false,autoOpenCentralDocument:false,embedCentralNode:false,lastActivePath:c.a.path,renderSiblings:false,showFolderNodes:true,showPageNodes:true,showAttachments:true,showNeighborCount:true,maxItemCount:100,excludeFilepaths:[]});
 p.settings.hierarchy={...p.settings.hierarchy,parents:['Parent'],leftFriends:['Friend']};p.index.invalidateSemanticPolicy();
 for(const f of [c.a,c.b,c.d])p.index.insertCreatedFile(f);
 await p.index.publishHostMetadataPreview(c.a.path);await p.activateView();
 // Native reveal can precede React's navigation subscription; use the existing surface readiness owner.
 const fixtureHost=['k-plex-react-view','k-plex-sidepanel-view'].flatMap(type=>app.workspace.getLeavesOfType(type)).find(leaf=>p.isKplexLeafVisible(leaf));
 check(fixtureHost,'Visible fixture surface missing');await fixtureHost.view.waitUntilReady();p.notifyNavigation(c.a.path);
 await until(()=>[...document.querySelectorAll('.kplex-role-center')].some(el=>el.dataset.kplexPath===c.a.path),'Initial fixture DOM');
 await until(()=>!p.index.pendingStructuralTasks&&p.index.getWorkPriorityDiagnostics().active.slice(0,3).every(count=>count===0),'Fixture foreground setup work settled');
 const s=p.index.sourceAcquisition;c.source=s;c.originalCheckpoint=s.backgroundCheckpoint;
 // Bounded passive receipts distinguish a retired source pass from a durable write failure.
 // These observers return the original Promise and never call another reconciliation/flush.
 function sourceConvergenceSnapshot(source){
  try{
  const repository=source.getDiagnostics();
  return {at:performance.now(),inventory:!!source.inventory,requested:source.requested,closed:source.closed,
   revisions:{capture:source.inventoryCaptureRevision??null,source:source.inventoryRevision,scope:source.inventoryScopeRevision,host:source.hostRevision,maintenance:source.maintenanceRevision},
   ready:source.hasSemanticDependencies(),activity:source.getActivityState(),recovery:source.getRecoveryDiagnostics(),
   repository:{storage:repository.storage,unsaved:repository.unsaved,lastReason:repository.lastReason,lastReadFailure:repository.lastReadFailure,readFailures:repository.readFailures}};
  }catch{return {diagnosticError:true}}
 }
 function observeSourceConvergence(source){
  const receipt={limit:64,calls:[],overflow:0,restoreConflicts:0},owners=[];let restored=false;
  const safeRead=()=>{try{return sourceConvergenceSnapshot(source)}catch{return {diagnosticError:true}}};
  const wrap=(owner,key)=>{
   const original=owner[key],descriptor=Object.getOwnPropertyDescriptor(owner,key);
   const replacement=function(...args){
    const retained=receipt.calls.length<receipt.limit;
    if(!retained)receipt.overflow=Math.min(Number.MAX_SAFE_INTEGER,receipt.overflow+1);
    const row=retained?{owner:key==='reconcile'?'reconcile':'repository-flush',entry:safeRead()}:null;
    if(row)receipt.calls.push(row);
    let value;
    try{value=original.apply(this,args)}catch(error){if(row){row.outcome='threw';row.exit=safeRead()}throw error}
    const selectedPass=source.recoveryPass;
    const finish=(outcome,result)=>{if(!row)return;try{row.outcome=outcome;row.returned=typeof result==='boolean'?result:null;row.exit=safeRead();row.selectedPass=selectedPass?{...selectedPass}:null}catch{row.diagnosticError=true}};
    if(value&&typeof value.then==='function')value.then(result=>finish('returned',result),()=>finish('rejected'));
    else finish('returned',value);
    return value;
   };
   owner[key]=replacement;owners.push({owner,key,original,descriptor,replacement});
  };
  wrap(source,'reconcile');wrap(source.repository,'flush');
  return {receipt,restore(){if(restored)return;restored=true;for(const row of owners.reverse()){if(row.owner[row.key]!==row.replacement){receipt.restoreConflicts++;continue}if(row.descriptor)Object.defineProperty(row.owner,row.key,row.descriptor);else delete row.owner[row.key]}}};
 }
 const convergenceObserver=observeSourceConvergence(s);c.sourceConvergence=convergenceObserver.receipt;c.restoreConvergenceDiagnostics=convergenceObserver.restore;
 const gate=new Promise(r=>{c.release=r});c.held=true;
 s.backgroundCheckpoint=async()=>{if(c.held){c.holdReached=true;await gate}await c.originalCheckpoint?.()};
 c.background=s.reconcile();await until(()=>c.holdReached,'Background checkpoint entered');check(Boolean(s.inventory),'Actual background inventory retained');
 c.originalFlush=s.flush;let flushCalls=0;s.flush=function(...args){flushCalls++;return c.originalFlush.apply(this,args)};
 await timed('folder-tree-and-numeric-gates-during-inventory',async()=>{const path='folder:'+c.folder;p.notifyNavigation(path);await p.index.publishHostMetadataPreview(path);await until(()=>[...document.querySelectorAll('.kplex-role-center')].some(el=>el.dataset.kplexPath===path),'Folder center while inventory held');const neighborhood=p.index.getNeighborhood(path);check(neighborhood.children.length===4,'Direct folder tree before source closure');await until(()=>p.index.gateStats(p.index.get('folder:'+c.folder+'/Nested'))?.bottom.complete===true,'Neighbor folder count-only preparation');check(p.index.gateStats(p.index.get(path)).bottom.visibleCount===4,'Exact center structural count');check(p.index.gateStats(p.index.get('folder:'+c.folder+'/Nested')).bottom.visibleCount===2,'Exact neighboring folder child count');await until(()=>{const center=[...document.querySelectorAll('.kplex-role-center')].find(el=>el.dataset.kplexPath===path);return center?.querySelector('.gate-wrap-bottom .kplex-gate-count')?.textContent==='4'},'Rendered folder child number');check(!p.index.isSemanticWriteReady(path,c.a.path),'Native membership does not authorize linking')});
 await timed('navigate-during-inventory',async()=>{p.notifyNavigation(c.d.path);await p.index.publishHostMetadataPreview(c.d.path);await until(()=>[...document.querySelectorAll('.kplex-role-center')].some(el=>el.dataset.kplexPath===c.d.path),'Navigation while inventory held')});
 await timed('create-link-during-inventory',async()=>{await p.createRelationToPage(p.index.get(c.a.path),'left',p.index.get(c.d.path),'Friend');check((await app.vault.read(c.a)).includes('Friend:'),'Actual persisted link');check(p.index.evidenceBetween(c.a.path,c.d.path).some(e=>e.sourceKind==='frontmatter-ontology'),'Canonical saved pair evidence')});
 await timed('remove-link-during-inventory',async()=>{const evidence=p.index.evidenceBetween(c.a.path,c.d.path).find(e=>e.sourceKind==='frontmatter-ontology');check(await p.unlinkFrontmatterEvidence(evidence),'Actual remove completed');check(!(await app.vault.read(c.a)).includes('Friend:'),'Actual persisted removal')});
 await timed('create-node-during-inventory',async()=>{const folder=p.index.get('folder:'+c.folder);check(folder?.isFolder,'Physical folder available');const page=await p.createNewNodeInFolder(folder,'Created','markdown');check(page?.file&&app.vault.getFileByPath(page.path)===page.file,'Actual new file');c.owned.push(page.path);check(p.index.search('Created',10,'vault-files').some(result=>result.path===page.path),'Immediate new-note filename search')});
 await timed('visible-edit-during-inventory',async()=>{p.notifyNavigation(c.a.path);await p.index.publishHostMetadataPreview(c.a.path);await until(()=>[...document.querySelectorAll('.kplex-role-center')].some(el=>el.dataset.kplexPath===c.a.path),'Visible edited fixture DOM');await app.fileManager.processFrontMatter(c.a,fm=>{fm.Parent='[['+c.d.path+']]'});await until(()=>p.index.getNeighborhood(c.a.path)?.parents.some(item=>item.page.path===c.d.path),'Visible host parent update ahead of inventory')});
 check(c.scenarios.every(row=>row.backgroundHeld),'Every operation completed before background release');check(flushCalls===0,'Foreground called broad flush');c.flushCalls=flushCalls;
 c.sourceConvergence.beforeRelease=sourceConvergenceSnapshot(s);
 s.flush=c.originalFlush;s.backgroundCheckpoint=c.originalCheckpoint;c.held=false;c.release();c.sourceConvergence.backgroundResult=await c.background;
 c.sourceConvergence.afterBackground=sourceConvergenceSnapshot(s);c.sourceConvergence.beforeFlush=sourceConvergenceSnapshot(s);
 const converged=await s.flush();c.sourceConvergence.flushResult=converged;c.sourceConvergence.afterFlush=sourceConvergenceSnapshot(s);
 check(converged,'Background resumes and converges');check(s.hasSemanticDependencies(),'Canonical authority after resume');c.resumed=true;
 return {scenarios:c.scenarios,flushCalls:c.flushCalls,resumed:c.resumed,priority:p.index.getWorkPriorityDiagnostics(),foreground:{hidden:document.hidden,focused:w.isFocused(),throttling:w.webContents.getBackgroundThrottling()}};
 })().then(value=>{c.done=true;c.value=value},error=>{c.done=true;c.error=String(error)})},50);return JSON.stringify({started:true})})()`);
    controllerInstalled = true;
    const end = Date.now() + 240000;
    while (true) {
        await wait(1000);
        const r = evaluate('JSON.stringify({done:window.__kplexForegroundTest?.done,prewriteReady:window.__kplexForegroundTest?.prewriteReady,error:window.__kplexForegroundTest?.error,value:window.__kplexForegroundTest?.value,completed:window.__kplexForegroundTest?.scenarios,pairTrace:window.__kplexForegroundTest?.pairTrace,sourceConvergence:window.__kplexForegroundTest?.sourceConvergence})');
        if(r.prewriteReady&&!inventoryState){
            const snapshot=evaluate(`(async()=>{const foregroundLeafStates=${foregroundLeafStates.toString()};return JSON.stringify(await (${captureForegroundInventoryState.toString()})(app,documentSessions));})()`);
            inventoryState=freezeForegroundInventoryState(snapshot);
            data=readFileSync(join(target.pluginDir,'data.json'));enabled=readFileSync(join(target.config,'community-plugins.json'));workspace=existsSync(join(target.config,'workspace.json'))?readFileSync(join(target.config,'workspace.json')):null;
            report.inventoryRecovery={native:join(out,'inventory-original-native.json'),configuration:join(out,'inventory-original-configuration.json')};
            writeFileSync(report.inventoryRecovery.native,JSON.stringify(inventoryState,null,2)+'\n');
            writeFileSync(report.inventoryRecovery.configuration,JSON.stringify([{path:join(target.pluginDir,'data.json'),bytes:data.toString('base64')},{path:join(target.config,'community-plugins.json'),bytes:enabled.toString('base64')},{path:join(target.config,'workspace.json'),bytes:workspace?.toString('base64')??null}],null,2)+'\n');
            evaluate('(()=>{const c=window.__kplexForegroundTest;if(!c||c.cancelled)throw Error("Inventory baseline owner retired");c.baselineAccepted=true;c.releasePrewrite();return JSON.stringify({accepted:true})})()');
        }
        report.progress = r;
        writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
        if (r.done) {
            if (r.error)
                throw Error(r.error);
            report.result = r.value;
            break;
        }
        if (Date.now() > end)
            throw Error('Native foreground smoke deadline');
    }
    }
    report.status = 'passed';
}
catch (error) {
    report.error = String(error);
    report.status = 'failed';
}
finally {
    try {
        if (controllerInstalled) {
        evaluate(`(()=>{const c=window.__kplexForegroundTest;if(!c)return JSON.stringify({absent:true});const foregroundLeafStates=${foregroundLeafStates.toString()},restoreForegroundInventoryState=${restoreForegroundInventoryState.toString()};c.cleanup=(${cleanupForegroundInventory.toString()})(app,c,${JSON.stringify(inventoryState)},documentSessions).then(()=>{c.cleaned=true},error=>{c.cleanupError=String(error)});return JSON.stringify({cleanupStarted:true})})()`);
        const end = Date.now() + 60000;
        while (true) {
            await wait(500);
            const r = evaluate('JSON.stringify({cleaned:window.__kplexForegroundTest?.cleaned,error:window.__kplexForegroundTest?.cleanupError})');
            if (r.error){
                inventoryCleanupSettled=true;
                throw Error(r.error);
            }
            if (r.cleaned){
                inventoryCleanupSettled=true;
                break;
            }
            if (Date.now() > end)
                throw Error('Cleanup deadline');
        }
        }
    }
    catch (error) {
        report.cleanupError = String(error);
        report.status = 'failed';
    }
    // Release the controller independently of convergence assertions and preserve their failure.
    try {
        if (controllerInstalled&&inventoryCleanupSettled) {
            report.cleanup = evaluate(`(()=>{const c=window.__kplexForegroundTest,remaining=(c?.owned??[]).filter(path=>app.vault.getAbstractFileByPath(path));delete window.__kplexForegroundTest;return JSON.stringify({remainingOwned:remaining.length,convergence:c?.cleanupConvergence,nativeRestoration:c?.nativeRestoration,pairTrace:c?.pairTrace,sourceConvergence:c?.sourceConvergence,controllerRemoved:!window.__kplexForegroundTest})})()`);
            if (report.cleanup.remainingOwned || !report.cleanup.controllerRemoved) throw Error('Owned fixture or controller remains after teardown');
        }else if(controllerInstalled){
            report.pendingInventoryRestoration={reason:'Native cleanup has not settled',recovery:report.inventoryRecovery};throw Error('Preserve the active inventory cleanup controller and recovery inputs');
        }
    } catch (error) {
        report.controllerCleanupError = String(error);
        report.status = 'failed';
    }
    try {
        if(scenario==='inventory'){
            if(controllerInstalled&&!inventoryCleanupSettled)throw Error('Do not replace configuration while native inventory cleanup is unsettled');
            if(inventoryState)restoreForegroundConfiguration([{path:join(target.pluginDir,'data.json'),bytes:data},{path:join(target.config,'community-plugins.json'),bytes:enabled},{path:join(target.config,'workspace.json'),bytes:workspace}],{writeFileSync,readFileSync,existsSync,unlinkSync});
        }else{
            writeFileSync(join(target.pluginDir, 'data.json'), data);
            if (workspace) {
            writeFileSync(join(target.config, 'workspace.json'), workspace);
            writeFileSync(join(target.config, 'community-plugins.json'), enabled);
            if (!readFileSync(join(target.config, 'workspace.json')).equals(workspace) || !readFileSync(join(target.pluginDir, 'data.json')).equals(data)) throw Error('Live-update configuration bytes differ');
            }
            if (!readFileSync(join(target.config, 'community-plugins.json')).equals(enabled)) throw Error('Enabled list changed');
        }
        report.configurationRestored = true;
    } catch (error) {
        report.configurationRestoreError = String(error);
        report.status = 'failed';
    }
    report.completedAt = new Date().toISOString();
    writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ status: report.status, error: report.error, cleanupError: report.cleanupError, report: join(out, 'report.json') }));
if (report.status !== 'passed')
    process.exitCode = 1;
