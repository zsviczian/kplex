/**
 * Foreground-only warm plugin-restart attribution against the exact installed production build.
 * Native wrappers count operations without substituting promises, results, authority or throttling.
 * One deferred controller keeps each CLI request bounded; every wrapper and opt-in is restored.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateTarget } from "./runner.mjs";
import { createWaitTimingProbe } from "./waitTiming.mjs";
const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const selectedCenter = process.env.KPLEX_SI5_WARM_CENTER;
const reportDir = process.env.KPLEX_HOST_REPORT_DIR || "/private/tmp/kplex-si5-warm-start";
const runs = Number(process.env.KPLEX_SI5_RESTART_RUNS || 3);
const measureWaits = process.env.KPLEX_SI5_MEASURE_WAITS === "true";
if (!Number.isInteger(runs) || runs < 1 || runs > 3) throw Error("Expected 1–3 warm runs");
mkdirSync(reportDir, { recursive: true });
let lastCommand;
/** Execute one CLI command with the established 30-second process cap. */
function cli(command, ...args) {
  lastCommand = command;
  const result = spawnSync(process.env.KPLEX_OBSIDIAN_CLI || "obsidian", [`vault=${vaultName}`, command, ...args],
    { cwd: root, encoding: "utf8", timeout: 30000, killSignal: "SIGKILL", maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout || "")) throw Error(result.error?.message || result.stderr || result.stdout);
  return result.stdout.trim();
}
/** Parse one native JSON response; the CLI may prepend host startup text. */
function evaluate(code) {
  const output = cli("eval", `code=${code}`);
  return JSON.parse(output.slice(output.indexOf("{")));
}
/** Yield between bounded controller polls; no second native driver runs concurrently. */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const originalData = readFileSync(join(target.pluginDir, "data.json"), "utf8");
const originalEnabled = readFileSync(join(target.config, "community-plugins.json"), "utf8");
const report = { status: "failed", startedAt: new Date().toISOString(), checkpoint: cliGit("rev-parse", "HEAD"),
  dirty: Boolean(cliGit("status", "--porcelain")), measureWaits, artifacts: {}, runs: [] };
/** Record local Git identity without accessing or changing vault state. */
function cliGit(...args) { return spawnSync("git", args, { cwd: root, encoding: "utf8" }).stdout.trim(); }
/** Start one deferred native task and poll only its bounded aggregate response. */
async function probe(code) {
  evaluate(`(()=>{const c={done:false,closed:false,originals:[]};window.kplexWarmStartup=c;c.timer=window.setTimeout(()=>{c.task=(async()=>{${code}})().then(value=>{Object.assign(c,{done:true,value})},error=>{Object.assign(c,{done:true,error:String(error)})})},20);return JSON.stringify({started:true})})()`);
  while (true) {
    await delay(5000);
    let result;
    try {
      result = evaluate("JSON.stringify({done:window.kplexWarmStartup?.done,error:window.kplexWarmStartup?.error,value:window.kplexWarmStartup?.value,waitProgress:window.kplexWarmStartup?.waitProbe?.snapshot(),progress:app.plugins.plugins['k-plex']?.getStartupDiagnostics?.()})");
    } catch (error) {
      (report.cliReconnects ??= []).push({ at: new Date().toISOString(), error: String(error) });
      writeFileSync(join(reportDir, "report.json"), JSON.stringify({ ...report, status: "running" }, null, 2) + "\n");
      await delay(10000);
      continue;
    }
    report.pending = result.progress;
    if (result.waitProgress) report.pendingWaits = result.waitProgress;
    writeFileSync(join(reportDir, "report.json"), JSON.stringify({ ...report, status: "running" }, null, 2) + "\n");
    if (result.done) { if (result.error) throw Error(result.error);return result.value; }
  }
}

const native = `
const delay=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
const assert=(value,message)=>{if(!value)throw Error(message)};
// Streaming verification occurs outside timed startup and never exports owner paths.
const digest=async p=>{const db=await p.index.indexedDb.open();return new Promise((resolve,reject)=>{const hash=require('crypto').createHash('sha256'),tx=db.transaction('sourceHeads','readonly'),request=tx.objectStore('sourceHeads').openCursor();request.onsuccess=()=>{const cursor=request.result;if(cursor){hash.update(JSON.stringify(cursor.value));cursor.continue()}};tx.oncomplete=()=>resolve(hash.digest('hex'));tx.onabort=tx.onerror=()=>reject(tx.error)})};
const remote=require('@electron/remote'),w=remote.getCurrentWindow();
remote.app.show();remote.app.focus({steal:true});w.show();w.moveTop();w.focus();await delay(350);
const foreground=()=>({hidden:document.hidden,documentFocused:document.hasFocus(),windowFocused:w.isFocused(),throttle:w.webContents.getBackgroundThrottling()});
let p=app.plugins.plugins['k-plex'];assert(p?.getIndexStatus().upToDate&&!p.index.sourceAcquisition.inventory,'Previous index must be settled');
assert(!document.hidden&&document.hasFocus()&&w.isFocused()&&w.webContents.getBackgroundThrottling(),'Real foreground required');
const before=await digest(p),settings=JSON.stringify(p.settings),center=p.settings.lastActivePath;
const at=performance.now(),elapsed=()=>performance.now()-at;
c.result={elapsedSemantics:'Milliseconds from immediately before disable/enable; diagnostics are relative to onload. Method timings are inclusive and lanes overlap.',foreground:{samples:0,hidden:0,documentUnfocused:0,windowUnfocused:0,throttlingDisabled:0},operations:{},labels:[]};
const sample=()=>{const f=foreground(),r=c.result.foreground;r.samples++;r.hidden+=Number(f.hidden);r.documentUnfocused+=Number(!f.documentFocused);r.windowUnfocused+=Number(!f.windowFocused);r.throttlingDisabled+=Number(!f.throttle);r.comparable=r.hidden+r.documentUnfocused+r.windowUnfocused+r.throttlingDisabled===0};
sample();c.foregroundTimer=window.setInterval(sample,1000);
const bump=(name)=>{const d=app.plugins.plugins['k-plex']?.startupDiagnostics;const phase=d?.progress('source')?.phase,hydration=d?.progress('hydration')?.phase;const key=phase&&phase!=='complete'?phase:hydration??'plugin-enable';const row=c.result.operations[key]??={};row[name]=(row[name]??0)+1;d?.count(phase&&phase!=='complete'?'source':'hydration',name)};
// Synchronous forwarding preserves the native request/promise identity and ordering.
const wrap=(owner,key,label)=>{const original=owner[key];assert(typeof original==='function','Missing operation '+key);const replacement=function(...args){bump(typeof label==='function'?label.call(this):label);return original.apply(this,args)};owner[key]=replacement;c.originals.push({owner,key,original,replacement})};
c.originals=[];
const optIn=window.kplexStartupDiagnosticsEnabled;c.restoreOptIn=()=>{if(optIn===undefined)delete window.kplexStartupDiagnosticsEnabled;else window.kplexStartupDiagnosticsEnabled=optIn};
window.kplexStartupDiagnosticsEnabled=true;
try {
 await app.plugins.disablePlugin('k-plex');c.result.disableEndedMs=elapsed();
 for(const key of ['get','getAll','getAllKeys','openCursor','openKeyCursor','count','put','add','delete'])wrap(IDBObjectStore.prototype,key,function(){return 'idb.'+this.name+'.'+key});
 wrap(app.metadataCache,'getFileCache','metadataCacheLookups');wrap(app.vault,'getMarkdownFiles','markdownInventoryCalls');wrap(app.vault,'getAllLoadedFiles','physicalInventoryCalls');
 for(const key of ['read','cachedRead'])wrap(app.vault,key,'markdownReadCalls');
 wrap(app.vault.adapter,'stat','physicalStatIO');
 await app.plugins.enablePlugin('k-plex');c.result.enableEndedMs=elapsed();
 p=app.plugins.plugins['k-plex'];assert(p?.startupDiagnostics,'Measured plugin missing');
 const s=p.index.sourceAcquisition,r=s.repository;
 for(const [key,label] of [['inspect','sourceInspectionCalls'],['headPage','sourceHeadPageCalls'],['ensureLocalDependencies','dependencyChecks'],['completeLocalDependencyInventory','dependencyInventoryChecks'],['localDependencySelection','localDependencySelectionCalls'],['settleLocalDependencyWork','localDependencySettlementCalls']])wrap(r,key,label);
 wrap(r.runtime,'yield','repositoryYieldCalls');
 wrap(s,'acquire','sourceAcquisitions');wrap(s,'loadBody','bodyAcquisitions');
 if(${measureWaits}){
  c.result.waitTimingStartedMs=elapsed();
  c.waitProbe=(${createWaitTimingProbe.toString()})({now:()=>performance.now(),phase:()=>{const source=p.startupDiagnostics.progress('source'),hydration=p.startupDiagnostics.progress('hydration');return source&&source.phase!=='complete'?'source:'+source.phase:'hydration:'+(hydration?.phase??'plugin-enable')}});
  const observe=(owner,key,category,label)=>{const original=owner[key];assert(typeof original==='function','Missing timing operation '+key);const replacement=function(...args){return c.waitProbe.observe(category,typeof label==='function'?label(args):label,()=>original.apply(this,args))};owner[key]=replacement;c.originals.push({owner,key,original,replacement})};
  observe(r.runtime,'yield','yield','timer');observe(r.runtime,'digest','digest','sha256');
  observe(r,'transaction','transaction',args=>args[2]+':'+[...args[1]].sort().join(','));
  const owner=p.startupDiagnostics,original=owner.phase;const replacement=function(...args){c.waitProbe.checkpoint();const result=original.apply(this,args);c.waitProbe.checkpoint();return result};owner.phase=replacement;c.originals.push({owner,key:'phase',original,replacement});
 }
 void p.activateView();
 let previous='';
 while(!c.closed){
  assert(!c.closed,'Probe cancelled');
  const status=p.getIndexStatus(),authority=s.hasSemanticDependencies(),d=p.startupDiagnostics.snapshot();
  if(status.label!==previous){c.result.labels.push({ms:elapsed(),label:status.label,source:p.startupDiagnostics.progress('source'),hydration:p.startupDiagnostics.progress('hydration')});previous=status.label}
  if(c.result.sourceAuthorityMs===undefined&&authority)c.result.sourceAuthorityMs=elapsed();
  if(c.result.requestedSemanticsMs===undefined&&authority&&p.index.isSemanticWriteReady(center,center))c.result.requestedSemanticsMs=elapsed();
  if(c.result.firstPlexDomMs===undefined&&[...document.querySelectorAll('[data-kplex-path]')].some(el=>el.getAttribute('data-kplex-path')===center&&el.classList.contains('kplex-role-center')))c.result.firstPlexDomMs=elapsed();
  if(status.upToDate&&authority&&!s.inventory){c.result.strictReadyMs=elapsed();c.result.diagnostics=d;c.result.onloadOffsetMs=d.startedAtMs-at;c.result.status=status;c.result.source=p.index.getSourceAcquisitionCounters();c.result.semantic=p.index.getSemanticPreparationDiagnostics();c.result.hydration=p.index.getSnapshotHydrationDiagnostics();break}
  await delay(100);
 }
 assert(c.result.strictReadyMs!==undefined,'Strict readiness timeout');sample();
} finally {
 if(c.waitProbe)c.result.waits=c.waitProbe.stop();
 window.clearInterval(c.foregroundTimer);
 for(const entry of c.originals.reverse())if(entry.owner[entry.key]===entry.replacement)entry.owner[entry.key]=entry.original;
 c.originals=[];c.restoreOptIn();
}
assert(await digest(p)===before,'Source heads changed');assert(JSON.stringify(p.settings)===settings,'Settings changed');
c.result.sourceHeadsUnchanged=true;c.result.settingsUnchanged=true;c.result.foregroundFinal=foreground();
assert(c.result.foreground.comparable,'Foreground samples excluded this run');
return c.result;`;
try {
  if (cli("vault", "info=path") !== target.vault) throw Error("Wrong vault");
  for (const name of ["main.js", "manifest.json", "styles.css"]) {
    const hash = path => createHash("sha256").update(readFileSync(path)).digest("hex");
    report.artifacts[name] = hash(join(root, "dist", name));
    if (report.artifacts[name] !== hash(join(target.pluginDir, name))) throw Error(`Installed ${name} differs from build`);
  }
  if (selectedCenter) report.preflight = await probe(`
    const remote=require('@electron/remote'),w=remote.getCurrentWindow();
    remote.app.show();remote.app.focus({steal:true});w.show();w.moveTop();w.focus();
    await new Promise(resolve=>window.setTimeout(resolve,350));
    const p=app.plugins.plugins['k-plex'];if(!app.vault.getFileByPath(${JSON.stringify(selectedCenter)}))throw Error('Selected existing center missing');
    for(const leaf of app.workspace.getLeavesOfType('k-plex-react-view'))leaf.detach();
    p.settings.lastActivePath=${JSON.stringify(selectedCenter)};await p.saveSettings(false,false);await p.activateView();
    let navigated=false;
    while(!c.closed){if(p.index.get(${JSON.stringify(selectedCenter)})&&p.navigationListeners.size>0&&(!navigated||p.settings.lastActivePath!==${JSON.stringify(selectedCenter)})){p.notifyNavigation(${JSON.stringify(selectedCenter)});navigated=true}if(navigated&&p.settings.lastActivePath===${JSON.stringify(selectedCenter)}&&p.getIndexStatus().upToDate&&!p.index.sourceAcquisition.inventory)return {representativeCenterSelected:true,ready:true};await new Promise(resolve=>window.setTimeout(resolve,100))}throw Error('Cancelled representative preflight');
  `);
  for (let run = 1; run <= runs; run++) {
    report.runs.push(await probe(native));
    writeFileSync(join(reportDir, "report.json"), JSON.stringify({ ...report, status: "running" }, null, 2) + "\n");
  }
  report.status = "passed";
} catch (error) {
  report.error = String(error);report.failedCommand = lastCommand;
  try { report.failure = evaluate("JSON.stringify({result:window.kplexWarmStartup?.result,status:app.plugins.plugins['k-plex']?.getIndexStatus(),diagnostics:app.plugins.plugins['k-plex']?.startupDiagnostics.snapshot(),semantic:app.plugins.plugins['k-plex']?.index.getSemanticPreparationDiagnostics(),hydration:app.plugins.plugins['k-plex']?.index.getSnapshotHydrationDiagnostics(),demands:[...(app.plugins.plugins['k-plex']?.index.semanticDemandCounts??[])],hidden:document.hidden,documentFocused:document.hasFocus(),windowFocused:require('@electron/remote').getCurrentWindow().isFocused()})"); } catch (captureError) { report.captureError = String(captureError); }
} finally {
  try {
    report.cleanup = evaluate(`(()=>{const c=window.kplexWarmStartup;if(c){c.closed=true;c.waitProbe?.stop();window.clearTimeout(c.timer);window.clearInterval(c.foregroundTimer);for(const e of c.originals??[])if(e.owner[e.key]===e.replacement)e.owner[e.key]=e.original;c.restoreOptIn?.()}delete window.kplexWarmStartup;return JSON.stringify({controllerRemoved:!window.kplexWarmStartup,optInAbsent:window.kplexStartupDiagnosticsEnabled===undefined,backgroundThrottling:require('@electron/remote').getCurrentWindow().webContents.getBackgroundThrottling()})})()`);
  } catch (error) { report.cleanupError = String(error);report.status = "failed"; }
  try {
    // Restore the exact user configuration, including keys this test does not understand.
    writeFileSync(join(target.pluginDir, "data.json"), originalData);
    if (readFileSync(join(target.config, "community-plugins.json"), "utf8") !== originalEnabled) throw Error("Enabled-list changed");
    evaluate(`(()=>{const p=app.plugins.plugins['k-plex'];if(p)Object.assign(p.settings,${originalData.trim()});return JSON.stringify({settingsRestored:true})})()`);
    report.configurationRestored = readFileSync(join(target.pluginDir, "data.json"), "utf8") === originalData;
  } catch (error) { report.configurationRestoreError = String(error);report.status = "failed"; }
  report.completedAt = new Date().toISOString();
  writeFileSync(join(reportDir, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify({ status: report.status, error: report.error, report: join(reportDir, "report.json"), timings: report.runs.map(run => run.strictReadyMs) }));
if (report.status !== "passed") process.exitCode = 1;
