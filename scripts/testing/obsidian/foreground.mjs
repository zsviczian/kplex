/** Serial native foreground smoke using only owned fixtures in the explicit disposable small vault. */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTarget } from './runner.mjs';
const root = resolve(fileURLToPath(new URL('../../..', import.meta.url))), vaultName = process.env.KPLEX_TEST_VAULT_NAME;
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const out = process.env.KPLEX_HOST_REPORT_DIR;
if (!out)
    throw Error('Set KPLEX_HOST_REPORT_DIR explicitly');
mkdirSync(out, { recursive: true });
const data = readFileSync(join(target.pluginDir, 'data.json')), enabled = readFileSync(join(target.config, 'community-plugins.json'));
const report = { status: 'running', startedAt: new Date().toISOString(), artifacts: {}, limitations: ['Desktop native API/DOM smoke, controlled acquisition pause outside transactions; no trusted pointer or physical mobile timing claim'] };
/** Execute one serial native command with the established deadline and fail closed on eval errors. */
const cli = (name, ...args) => { const r = spawnSync(process.env.KPLEX_OBSIDIAN_CLI || 'obsidian', [`vault=${vaultName}`, name, ...args], { encoding: 'utf8', timeout: 30000, killSignal: 'SIGKILL', maxBuffer: 4 * 1024 * 1024 }); if (r.error || r.status !== 0 || /^Error:/m.test(r.stdout))
    throw Error(r.error?.message || r.stderr || r.stdout); return r.stdout.trim(); };
/** Decode the bounded controller response while leaving native async work outside the CLI call. */
const evaluate = code => { const raw = cli('eval', `code=${code}`); return JSON.parse(raw.slice(raw.indexOf('{'))); };
/** Yield the driver between polls; renderer scheduling and throttling remain unchanged. */
const wait = ms => new Promise(r => setTimeout(r, ms));
let controllerInstalled = false;
try {
    if (cli('vault', 'info=path').replace(/^path\s+/, '') !== target.vault)
        throw Error('Wrong vault');
    for (const name of ['main.js', 'styles.css', 'manifest.json']) {
        const hash = p => createHash('sha256').update(readFileSync(p)).digest('hex');
        report.artifacts[name] = hash(join(root, 'dist', name));
        if (report.artifacts[name] !== hash(join(target.pluginDir, name)))
            throw Error('Installed build mismatch');
    }
    evaluate(`(()=>{if(window.__kplexForegroundTest)throw Error('Controller exists');const p=app.plugins.plugins['k-plex'],remote=require('@electron/remote'),w=remote.getCurrentWindow();remote.app.show();remote.app.focus({steal:true});w.show();w.moveTop();w.focus();const c=window.__kplexForegroundTest={p,originalSettings:JSON.parse(JSON.stringify(p.settings)),folder:'Kplex-Foreground-Regression',owned:[],scenarios:[],pairTrace:[],done:false};c.timer=window.setTimeout(()=>{c.task=(async()=>{
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
 await app.vault.createFolder(c.folder);c.owned.push(c.folder);
 const create=async(name,content)=>{const f=await app.vault.create(c.folder+'/'+name,content);c.owned.push(f.path);return f};
 c.a=await create('A.md','---\\nParent: '+JSON.stringify('[['+c.folder+'/B]]')+'\\n---\\n# A\\n');c.b=await create('B.md','# B');c.d=await create('C.md','# C');
 await until(()=>[c.a,c.b,c.d].every(f=>app.metadataCache.getFileCache(f)),'Fixture MetadataCache');
 await until(()=>app.metadataCache.getFirstLinkpathDest(c.folder+'/B',c.a.path)===c.b&&app.metadataCache.resolvedLinks[c.a.path]?.[c.b.path]>0,'Fixture exact Parent resolver closure');
 Object.assign(p.settings,{documentSyncMode:'off',followActiveFile:false,autoOpenCentralDocument:false,embedCentralNode:false,lastActivePath:c.a.path,renderSiblings:false});
 p.settings.hierarchy={...p.settings.hierarchy,parents:['Parent'],leftFriends:['Friend']};p.index.invalidateSemanticPolicy();
 for(const f of [c.a,c.b,c.d])p.index.insertCreatedFile(f);
 await p.index.publishHostMetadataPreview(c.a.path);await p.activateView();p.notifyNavigation(c.a.path);
 await until(()=>[...document.querySelectorAll('.kplex-role-center')].some(el=>el.dataset.kplexPath===c.a.path),'Initial fixture DOM');
 await until(()=>!p.index.pendingStructuralTasks&&p.index.getWorkPriorityDiagnostics().active.slice(0,3).every(count=>count===0),'Fixture foreground setup work settled');
 const s=p.index.sourceAcquisition;c.source=s;c.originalCheckpoint=s.backgroundCheckpoint;
 const gate=new Promise(r=>{c.release=r});c.held=true;
 s.backgroundCheckpoint=async()=>{if(c.held){c.holdReached=true;await gate}await c.originalCheckpoint?.()};
 c.background=s.reconcile();await until(()=>c.holdReached,'Background checkpoint entered');check(Boolean(s.inventory),'Actual background inventory retained');
 c.originalFlush=s.flush;let flushCalls=0;s.flush=function(...args){flushCalls++;return c.originalFlush.apply(this,args)};
 await timed('navigate-during-inventory',async()=>{p.notifyNavigation(c.d.path);await p.index.publishHostMetadataPreview(c.d.path);await until(()=>[...document.querySelectorAll('.kplex-role-center')].some(el=>el.dataset.kplexPath===c.d.path),'Navigation while inventory held')});
 await timed('create-link-during-inventory',async()=>{await p.createRelationToPage(p.index.get(c.a.path),'left',p.index.get(c.d.path),'Friend');check((await app.vault.read(c.a)).includes('Friend:'),'Actual persisted link');check(p.index.evidenceBetween(c.a.path,c.d.path).some(e=>e.sourceKind==='frontmatter-ontology'),'Canonical saved pair evidence')});
 await timed('remove-link-during-inventory',async()=>{const evidence=p.index.evidenceBetween(c.a.path,c.d.path).find(e=>e.sourceKind==='frontmatter-ontology');check(await p.unlinkFrontmatterEvidence(evidence),'Actual remove completed');check(!(await app.vault.read(c.a)).includes('Friend:'),'Actual persisted removal')});
 await timed('create-node-during-inventory',async()=>{const folder=p.index.get('folder:'+c.folder);check(folder?.isFolder,'Physical folder available');const page=await p.createNewNodeInFolder(folder,'Created','markdown');check(page?.file&&app.vault.getFileByPath(page.path)===page.file,'Actual new file');c.owned.push(page.path);check(p.index.search('Created',10,'vault-files').some(result=>result.path===page.path),'Immediate new-note filename search')});
 await timed('visible-edit-during-inventory',async()=>{p.notifyNavigation(c.a.path);await p.index.publishHostMetadataPreview(c.a.path);await until(()=>[...document.querySelectorAll('.kplex-role-center')].some(el=>el.dataset.kplexPath===c.a.path),'Visible edited fixture DOM');await app.fileManager.processFrontMatter(c.a,fm=>{fm.Parent='[['+c.d.path+']]'});await until(()=>p.index.getNeighborhood(c.a.path)?.parents.some(item=>item.page.path===c.d.path),'Visible host parent update ahead of inventory')});
 check(c.scenarios.every(row=>row.backgroundHeld),'Every operation completed before background release');check(flushCalls===0,'Foreground called broad flush');c.flushCalls=flushCalls;
 s.flush=c.originalFlush;s.backgroundCheckpoint=c.originalCheckpoint;c.held=false;c.release();await c.background;
 check(await s.flush(),'Background resumes and converges');check(s.hasSemanticDependencies(),'Canonical authority after resume');c.resumed=true;
 return {scenarios:c.scenarios,flushCalls:c.flushCalls,resumed:c.resumed,priority:p.index.getWorkPriorityDiagnostics(),foreground:{hidden:document.hidden,focused:w.isFocused(),throttling:w.webContents.getBackgroundThrottling()}};
 })().then(value=>{c.done=true;c.value=value},error=>{c.done=true;c.error=String(error)})},50);return JSON.stringify({started:true})})()`);
    controllerInstalled = true;
    const end = Date.now() + 240000;
    while (true) {
        await wait(1000);
        const r = evaluate('JSON.stringify({done:window.__kplexForegroundTest?.done,error:window.__kplexForegroundTest?.error,value:window.__kplexForegroundTest?.value,completed:window.__kplexForegroundTest?.scenarios,pairTrace:window.__kplexForegroundTest?.pairTrace})');
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
    report.status = 'passed';
}
catch (error) {
    report.error = String(error);
    report.status = 'failed';
}
finally {
    try {
        if (controllerInstalled) {
        evaluate(`(()=>{const c=window.__kplexForegroundTest;if(!c)return JSON.stringify({absent:true});c.cancelled=true;c.held=false;c.release?.();window.clearTimeout(c.timer);c.restorePairTrace?.();if(c.source){c.source.backgroundCheckpoint=c.originalCheckpoint;if(c.originalFlush)c.source.flush=c.originalFlush}c.cleanup=(async()=>{await c.task;Object.assign(c.p.settings,c.originalSettings);c.p.index.invalidateSemanticPolicy();for(const path of [...c.owned].reverse()){const f=app.vault.getAbstractFileByPath(path);if(f)await app.vault.delete(f,true)}if(c.originalSettings.lastActivePath)c.p.notifyNavigation(c.originalSettings.lastActivePath);await c.p.saveSettings(false,false);const convergenceStarted=Date.now(),convergenceDeadline=convergenceStarted+30000;c.cleanupConvergence={attempts:0,ready:false};while(Date.now()<convergenceDeadline){c.cleanupConvergence.attempts++;const saved=await c.p.index.flushSourceRepository();if(saved&&c.p.index.sourceAcquisition.hasSemanticDependencies()){c.cleanupConvergence.ready=true;break}await new Promise(r=>window.setTimeout(r,250))}c.cleanupConvergence.elapsedMs=Date.now()-convergenceStarted;if(!c.cleanupConvergence.ready)throw Error('Restored source authority did not converge within 30 seconds');await c.p.index.refreshSemanticSettings();if(c.owned.some(path=>app.vault.getAbstractFileByPath(path)))throw Error('Owned fixture remains after cleanup');return true})().then(()=>{c.cleaned=true},error=>{c.cleanupError=String(error)});return JSON.stringify({cleanupStarted:true})})()`);
        const end = Date.now() + 60000;
        while (true) {
            await wait(500);
            const r = evaluate('JSON.stringify({cleaned:window.__kplexForegroundTest?.cleaned,error:window.__kplexForegroundTest?.cleanupError})');
            if (r.error)
                throw Error(r.error);
            if (r.cleaned)
                break;
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
        if (controllerInstalled) {
            report.cleanup = evaluate(`(()=>{const c=window.__kplexForegroundTest,remaining=(c?.owned??[]).filter(path=>app.vault.getAbstractFileByPath(path));if(c){c.cancelled=true;c.held=false;c.release?.();window.clearTimeout(c.timer);c.restorePairTrace?.();if(c.source){c.source.backgroundCheckpoint=c.originalCheckpoint;if(c.originalFlush)c.source.flush=c.originalFlush}}delete window.__kplexForegroundTest;return JSON.stringify({remainingOwned:remaining.length,convergence:c?.cleanupConvergence,pairTrace:c?.pairTrace,controllerRemoved:!window.__kplexForegroundTest})})()`);
            if (report.cleanup.remainingOwned || !report.cleanup.controllerRemoved) throw Error('Owned fixture or controller remains after teardown');
        }
    } catch (error) {
        report.controllerCleanupError = String(error);
        report.status = 'failed';
    }
    try {
        writeFileSync(join(target.pluginDir, 'data.json'), data);
        if (!readFileSync(join(target.config, 'community-plugins.json')).equals(enabled)) throw Error('Enabled list changed');
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
