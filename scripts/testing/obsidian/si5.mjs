/** Exact-build SI5 native restart/cache recovery in a configured disposable vault. */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cpus, totalmem, release } from "node:os";
import { validateTarget } from "./runner.mjs";
const root=resolve(fileURLToPath(new URL("../../..",import.meta.url))),vaultName=process.env.KPLEX_TEST_VAULT_NAME;
const target=validateTarget({vaultName,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const reportDir=process.env.KPLEX_HOST_REPORT_DIR||"/private/tmp/kplex-si5-native";
mkdirSync(reportDir,{recursive:true});
let lastCliCommand;
function cli(command,...args){lastCliCommand=command;const r=spawnSync(process.env.KPLEX_OBSIDIAN_CLI||"obsidian",[`vault=${vaultName}`,command,...args],
  {cwd:root,encoding:"utf8",timeout:30000,killSignal:"SIGKILL",maxBuffer:8*1024*1024});
  if(r.error||r.status!==0||/^Error:/m.test(r.stdout||""))throw Error(r.error?.message||r.stderr||r.stdout);return r.stdout.trim();}
function evaluate(code){const s=cli("eval",`code=${code}`),start=s.indexOf("{");if(start<0)throw Error(`Missing native JSON: ${s.slice(0,200)}`);return JSON.parse(s.slice(start));}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function run(code,label){report.currentPhase=label;writeFileSync(join(reportDir,"progress.json"),JSON.stringify({...report,status:"running"},null,2)+"\n");evaluate(`(()=>{const probe={done:false};window.kplexSi5Probe=probe;probe.timer=window.setTimeout(()=>{probe.task=(async()=>{${code}})().then(value=>Object.assign(probe,{done:true,value}),error=>Object.assign(probe,{done:true,error:String(error)}));},20);return JSON.stringify({started:true})})()`);
  const start=Date.now();await delay(100);while(Date.now()-start<300000){const r=evaluate("JSON.stringify(window.kplexSi5Probe)");if(r.done){if(r.error)throw Error(`${label}: ${r.error}`);return r.value;}await delay(1500);}throw Error(`${label}: timeout`);}
const report={status:"failed",startedAt:new Date().toISOString(),source:{revision:spawnSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).stdout.trim(),dirty:Boolean(spawnSync("git",["status","--porcelain"],{cwd:root,encoding:"utf8"}).stdout.trim())},
  host:{cpu:cpus()[0]?.model,logicalCPUs:cpus().length,physicalMemoryBytes:totalmem(),os:`${process.platform} ${release()}`,obsidian:cli("version")},artifacts:{},runs:[]};
for(const name of ["main.js","manifest.json","styles.css"]){const hash=path=>createHash("sha256").update(readFileSync(path)).digest("hex");
  const built=hash(join(root,"dist",name));if(built!==hash(join(target.pluginDir,name)))throw Error(`Installed ${name} differs from exact build`);report.artifacts[name]=built;}
if(cli("vault","info=path")!==target.vault)throw Error("Wrong vault");
const helper=`const delay=ms=>new Promise(r=>window.setTimeout(r,ms));const ok=(v,m)=>{if(!v)throw Error(m)};
const lifetime=window.kplexSi5Native,probeLifetime=window.kplexSi5Probe,current=()=>window.kplexSi5Native===lifetime&&!lifetime?.closed&&window.kplexSi5Probe===probeLifetime&&!probeLifetime.closed;
const settle=async()=>{const at=Date.now();while(Date.now()-at<240000){ok(current(),'Native test cancelled');const p=app.plugins.plugins['k-plex'];if(p?.getIndexStatus().upToDate&&p.index.sourceAcquisition.hasSemanticDependencies()&&!p.index.sourceAcquisition.inventory)return p;await delay(50);}throw Error('Readiness timeout '+JSON.stringify(app.plugins.plugins['k-plex']?.getIndexStatus()))};`;
const restartOnly=process.env.KPLEX_SI5_RESTART_ONLY==="true";
let initialized=false;
try{
  await run(`${helper}const win=require('@electron/remote').getCurrentWindow();win.show();win.focus();win.moveTop();require('@electron/remote').app.focus({steal:true});await delay(300);const p=await settle();ok(current(),'Native test cancelled');
    window.kplexSi5Native={settings:structuredClone(p.settings),created:[],reads:0,hidden:document.hidden,throttle:win.webContents.getBackgroundThrottling(),startCenter:p.settings.lastActivePath};
    const c=window.kplexSi5Native;for(const name of ['read','cachedRead']){const original=app.vault[name];c[name]=original;app.vault[name]=function(file,...args){if(file.extension==='md')c.reads++;return original.call(this,file,...args)}};
    void p.activateView();
    return {ready:true,hidden:document.hidden,throttle:c.throttle,markdownFiles:app.vault.getMarkdownFiles().length};`,"preflight");initialized=true;
  if(!restartOnly)await run(`${helper}const p=await settle(),c=window.kplexSi5Native,A='__kplex_si5_A.md',B='__kplex_si5_B.md';
    ok(!app.vault.getFileByPath(A)&&!app.vault.getFileByPath(B),'Fixture collision');
    for(const [path,text] of [[B,''],[A,'SI5Friends:: [['+B+']]']]){c.created.push(path);await app.vault.create(path,text);await settle()}
    const leaf=app.workspace.getLeaf(true);await leaf.openFile(app.vault.getFileByPath(A),{active:true});c.fixtureLeaf=leaf;
    for(const existing of app.workspace.getLeavesOfType('k-plex-react-view'))existing.detach();p.settings.lastActivePath=A;await p.saveSettings();await p.activateView();ok(current(),'Cancelled fixture setup');await p.index.refreshSemanticSettings();await settle();
    ok(current(),'Cancelled fixture setup');
    // Fault injection leaves a deliberately incomplete graph. Seed complete acceleration only in
    // disposable-fixture setup; restart measurements begin on the subsequently loaded instance.
    if(p.index.sourceBackedSemantics||!p.index.isFullSnapshotHydrated()){await p.index.rebuild();await settle();}
    ok(current(),'Cancelled fixture setup');p.index.cancelPendingPersistence();ok(await p.index.persistIndexedDbSnapshot(p.index.snapshotPersistGeneration),'Old-policy optional graph saved');
    c.heads={};for(const path of c.created)c.heads[path]=(await p.index.sourceAcquisition.repository.inspect(path,[])).head;
    p.settings.hierarchy.rightFriends.push('SI5Friends');await p.saveSettings();await p.index.refreshSemanticSettings();
    p.index.cancelPendingPersistence();ok(p.index.get(A)?.neighbours.get(B)?.isRightFriend,'New saved ontology');return {fixture:true};`,"fixture setup");
  const cases=restartOnly?["warm-1","warm-2","warm-3"]:["changed-policy","missing-cache","corrupt-cache","corrupt-source","offline-edit"];
  for(const name of cases){
    if(name==='corrupt-source'){
      const started=Date.now();
      const result=await run(`${helper}const p=await settle(),i=p.index,s=i.sourceAcquisition,c=window.kplexSi5Native,A='__kplex_si5_A.md',B='__kplex_si5_B.md';
        const before=i.getSourceAcquisitionCounters(),semBefore=i.getSemanticPreparationDiagnostics(),a=(await s.repository.inspect(A,[])).head,b=(await s.repository.inspect(B,[])).head;
        ok(a.families.values.chunks>0,'Fixture has a values chunk');const db=await i.indexedDb.open();
        await new Promise((resolve,reject)=>{const tx=db.transaction('sourceChunks','readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);tx.objectStore('sourceChunks').delete([A,a.families.values.revision,'values',0])});
        c.reads=0;i.invalidateSemanticPolicy();await i.refreshSemanticSettings();await settle();await i.refreshSemanticSettings();
        const counters=i.getSourceAcquisitionCounters(),sem=i.getSemanticPreparationDiagnostics(),after=(await s.repository.inspect(A,[])).head;
        ok(counters.repaired-before.repaired===1,'Exactly one source repaired');ok(counters.vaultReads-before.vaultReads<=1&&counters.parses-before.parses<=1,'At most one damaged-source acquisition');
        ok(sem.fullBuilds===semBefore.fullBuilds,'No corruption full build');ok(after.sourceRevision!==a.sourceRevision,'Damaged source replaced');
        ok(JSON.stringify((await s.repository.inspect(B,[])).head)===JSON.stringify(b),'Unrelated source unchanged');
        ok(i.get(A)?.neighbours.get(B)?.isRightFriend&&i.isSemanticWriteReady(A,B),'Automatic current-policy repair');
        return {status:p.getIndexStatus(),counters,delta:Object.fromEntries(Object.keys(before).map(k=>[k,counters[k]-before[k]])),semantic:sem,markdownReads:c.reads,unrelatedHeadUnchanged:true,automaticRepair:true,hidden:document.hidden,backgroundThrottling:require('@electron/remote').getCurrentWindow().webContents.getBackgroundThrottling(),jsHeapBytes:performance.memory?.usedJSHeapSize??null};`,name);
      report.runs.push({name,elapsedMs:Date.now()-started,...result});continue;
    }
    if(name==='missing-cache'||name==='corrupt-cache')await run(`${helper}const p=await settle();p.index.cancelPendingPersistence();const db=await p.index.indexedDb.open();
      await new Promise((resolve,reject)=>{const tx=db.transaction(['meta','pages','evidence','snapshotChunks'],'readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);
      for(const store of ['pages','evidence','snapshotChunks'])tx.objectStore(store).clear();tx.objectStore('meta').delete('active');tx.objectStore('meta').delete('checkpoint');
      ${name==='corrupt-cache'?"tx.objectStore('meta').put({key:'active',schema:999,generation:'invalid-si5'});":""}});return {damagedOptionalCache:true};`,name+" prepare");
    cli("plugin:disable","id=k-plex");
    if(name==='offline-edit')await run(`${helper}await app.vault.modify(app.vault.getFileByPath('__kplex_si5_A.md'),'SI5Friends:: [[__kplex_si5_B.md]]\\nSI5Friends:: [[__kplex_si5_Ghost]]');await delay(500);return {edited:true};`,"offline sync edit");
    evaluate("(()=>{window.kplexSi5Native.reads=0;return JSON.stringify({reset:true})})()");
    const started=Date.now();cli("plugin:enable","id=k-plex");
    evaluate(`(()=>{const p=app.plugins.plugins['k-plex'],s=p.index.sourceAcquisition,c=window.kplexSi5Native;c.trace=[];
      const inspect=s.repository.inspect;s.repository.inspect=async function(...args){const r=await inspect.apply(this,args);if(r.reason!=='ready'&&c.trace.length<12)c.trace.push({phase:'inspect',reason:r.reason,hasHead:!!r.head,expected:r.expected.kind,families:args[1]});return r;};
      const load=s.loadBody;c.instanceOriginals={inspect,load};s.loadBody=async function(file,...args){if(c.trace.length<12)c.trace.push({phase:'load-body',bodyDirty:this.states.get(file)?.bodyDirty,dirty:this.states.get(file)?.dirty,created:this.states.get(file)?.created,size:file.stat.size});return load.call(this,file,...args)};
      void p.activateView();return JSON.stringify({opened:true})})()`);
    const result=await run(`${helper}const p=await settle(),i=p.index,c=window.kplexSi5Native;await i.refreshSemanticSettings();await delay(100);
      const counters=i.getSourceAcquisitionCounters(),sem=i.getSemanticPreparationDiagnostics(),heads={};for(const path of c.created)heads[path]=(await i.sourceAcquisition.repository.inspect(path,[])).head;
      ok(sem.fullBuilds===0,'Warm source-backed restart used full graph build');
      ok(counters.vaultReads===${name==='offline-edit'?1:0},'Unexpected Markdown acquisition '+JSON.stringify(counters));
      ok(counters.parses===${name==='offline-edit'?1:0},'Unexpected parser calls');
      ${restartOnly?"":"ok(i.get('__kplex_si5_A.md')?.neighbours.get('__kplex_si5_B.md')?.isRightFriend,'Saved ontology after reload');ok(i.isSemanticWriteReady('__kplex_si5_A.md','__kplex_si5_B.md'),'Current write authority');for(const path of c.created)if(path!=='__kplex_si5_A.md'||"+JSON.stringify(name)+"!=='offline-edit')ok(JSON.stringify(heads[path])===JSON.stringify(c.heads[path]),'Valid neutral head rewritten');"}
      ${name==='offline-edit'?"ok(i.get('__kplex_si5_A.md')?.neighbours.get('__kplex_si5_Ghost')?.isRightFriend,'Latest offline candidate replayed');":""}
      const center=p.settings.lastActivePath,node=[...document.querySelectorAll('[data-kplex-path]')].find(el=>el.getAttribute('data-kplex-path')===center&&el.classList.contains('kplex-role-center'));
      ok(node,'Rendered restored center');return {status:p.getIndexStatus(),counters,semantic:sem,sourceBackedStartup:i.hasSourceBackedStartup(),
        sourceBackedSemantics:i.sourceBackedSemantics,hydration:i.getSnapshotHydrationDiagnostics(),hidden:document.hidden,backgroundThrottling:require('@electron/remote').getCurrentWindow().webContents.getBackgroundThrottling(),
        markdownReads:c.reads,trace:c.trace,jsHeapBytes:performance.memory?.usedJSHeapSize??null,renderedCenter:true};`,name);
    report.runs.push({name,elapsedMs:Date.now()-started,...result});
  }
  report.status="passed";
}catch(error){report.error=String(error);report.failedCommand=lastCliCommand;report.failedPhase=report.currentPhase;
  try{report.failure=evaluate("JSON.stringify({trace:window.kplexSi5Native?.trace,source:app.plugins.plugins['k-plex']?.index.getSourceAcquisitionCounters(),semantic:app.plugins.plugins['k-plex']?.index.getSemanticPreparationDiagnostics(),status:app.plugins.plugins['k-plex']?.getIndexStatus(),hidden:document.hidden})");}catch(captureError){report.captureError=String(captureError);}}
finally{
  try{evaluate("(()=>{if(window.kplexSi5Probe){window.kplexSi5Probe.closed=true;window.clearTimeout(window.kplexSi5Probe.timer)}return JSON.stringify({probeCancelled:true})})()");}catch{}
  if(!initialized)try{initialized=evaluate("JSON.stringify({initialized:!!window.kplexSi5Native})").initialized;}catch{}
  if(initialized)try{evaluate("(()=>{window.kplexSi5Native.closed=true;return JSON.stringify({cancelled:true})})()");report.cleanup=await run(`${helper}const c=window.kplexSi5Native;let p=app.plugins.plugins['k-plex'];if(!p){await app.plugins.enablePlugin('k-plex');p=app.plugins.plugins['k-plex']}
    for(const name of ['read','cachedRead'])app.vault[name]=c[name];if(c.instanceOriginals){p.index.sourceAcquisition.repository.inspect=c.instanceOriginals.inspect;p.index.sourceAcquisition.loadBody=c.instanceOriginals.load;}Object.assign(p.settings,c.settings);await p.saveSettings();
    c.fixtureLeaf?.detach();for(const leaf of app.workspace.getLeavesOfType('k-plex-react-view'))if(c.created.some(path=>leaf.view.containerEl.querySelector('[data-kplex-path="'+path+'"]')))leaf.detach();
    for(const path of c.created.slice().reverse()){const f=app.vault.getFileByPath(path);if(f)await app.vault.delete(f,true)}
    require('@electron/remote').getCurrentWindow().webContents.setBackgroundThrottling(c.throttle);delete window.kplexSi5Native;
    return {settingsRestored:true,fixturesAbsent:c.created.every(path=>!app.vault.getFileByPath(path)),throttleRestored:true};`,"cleanup");}catch(error){report.cleanupError=String(error);report.status="failed";}
  try{evaluate("(()=>{if(window.kplexSi5Probe)window.clearTimeout(window.kplexSi5Probe.timer);delete window.kplexSi5Probe;return JSON.stringify({cleaned:true})})()");}catch{}
  report.completedAt=new Date().toISOString();writeFileSync(join(reportDir,"report.json"),JSON.stringify(report,null,2)+"\n");
}
console.log(`SI5 native ${report.status}: ${join(reportDir,"report.json")}`);if(report.error)console.error(report.error);if(report.status!=="passed")process.exitCode=1;
