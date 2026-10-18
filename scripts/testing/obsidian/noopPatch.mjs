/**
 * Bounded exact-artifact native receipt for ordinary high-degree no-op maintenance (PR #153).
 * An isolated production GraphIndex uses the installed bundle and real Vault/IndexedDB inputs.
 * The driver owns one disposable note and controller, preserves configuration/window state,
 * and never changes cache schema, policy, watchdogs or background throttling.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpus, release, totalmem } from 'node:os';
import { Script } from 'node:vm';
import { obsidianCliExecutable, spawnNativeSync } from './processTools.mjs';
import { validateTarget } from './runner.mjs';
import { probeNoopPatch } from '../../../tests/support/noopPatchFixture.mjs';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const name = process.env.KPLEX_TEST_VAULT_NAME;
const target = validateTarget({ vaultName: name, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const reportDir = process.env.KPLEX_HOST_REPORT_DIR;
if (!reportDir) throw Error('Set KPLEX_HOST_REPORT_DIR explicitly');
mkdirSync(reportDir, { recursive: true });
const maximumMs = 180_000;
const report = { status: 'failed', source: {}, node: process.version, os: `${process.platform} ${release()}`,
  cpu: cpus()[0]?.model, memory: totalmem(), artifacts: {}, limitations: 'Controlled ordinary no-op work, not startup/paint, mobile memory or whole-engine performance.' };

/** Fail on native transport/host errors; each call is bounded independently of the overall probe. */
function cli(command, ...args) {
  const r = spawnNativeSync(obsidianCliExecutable(), [`vault=${name}`, command, ...args],
    { cwd: root, encoding: 'utf8', timeout: 15_000, killSignal: 'SIGKILL', maxBuffer: 4 * 1024 * 1024 });
  if (r.error || r.status !== 0 || /^Error:/m.test(r.stdout ?? '')) throw Error(r.error?.message ?? (r.stderr || r.stdout));
  return r.stdout.trim();
}
/** Parse the actual object after Obsidian's optional CLI output prefix. */
function evaluate(code) { new Script(code); const output = cli('eval', `code=${code}`); return JSON.parse(output.slice(output.indexOf('{'))); }
/** Hash exact bytes without modifying installed artifacts or settings. */
function hash(path) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
/** Polling retains an explicit total experiment cap and performs cleanup on every exit. */
const delay = ms => new Promise(/** One driver-owned wait; no native scheduler policy changes. */ done => setTimeout(done, ms));

const originalData = readFileSync(join(target.pluginDir, 'data.json'));
const originalEnabled = readFileSync(join(target.config, 'community-plugins.json'));
try {
  assert.equal(resolve(cli('vault', 'info=path')), target.vault);
  report.obsidian = cli('version');
  const git = spawnNativeSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', timeout: 10_000 });
  report.source.head = git.stdout.trim();
  report.source.graphBuilderSha256 = hash(join(root, 'src/index/GraphBuilder.ts'));
  report.source.fixtureSha256 = hash(join(root, 'tests/support/noopPatchFixture.mjs'));
  report.source.driverSha256 = hash(fileURLToPath(import.meta.url));
  for (const file of ['main.js', 'manifest.json', 'styles.css']) {
    const built = hash(join(root, 'dist', file)), installed = hash(join(target.pluginDir, file));
    assert.equal(installed, built, `Stage the exact build before running: ${file}`);
    report.artifacts[file] = installed;
  }
  const start = evaluate(String.raw`(/** Install one controller with cleanup ownership before source setup. */ ()=>{
    if(window.kplexNoopPatchProbe)throw Error('Previous no-op controller still active');
    const c={done:false,closed:false};window.kplexNoopPatchProbe=c;
    c.task=(/** Keep asynchronous setup/measurements outside the CLI's immediate response. */ async()=>{
      const path='__kplex-153-noop-probe.md',p=app.plugins.plugins['k-plex'];
      if(!p?.getIndexStatus().upToDate)throw Error('Existing plugin must be ready');
      if(app.vault.getFileByPath(path))throw Error('Owned probe path already exists');
      const remote=require('@electron/remote'),win=remote.getCurrentWindow();
      const windowState={bounds:win.getBounds(),maximized:win.isMaximized(),minimized:win.isMinimized()};
      remote.app.show?.();remote.app.focus({steal:true});win.restore();win.show();win.moveTop();win.focus();
      /** Poll on real native event tasks without changing scheduling/throttling. */
      const delay=ms=>new Promise(/** Own just this native polling wait. */ r=>window.setTimeout(r,ms));
      /** Failed prerequisites terminate measurements and enter independent cleanup. */
      const assert=(v,m)=>{if(!v)throw Error(m)};
      /** Retired controllers cannot begin another setup or measurement step. */
      const current=()=>!c.closed;
      /** Bound setup polling by both elapsed time and the controller's exact lifetime. */
      const until=async(check)=>{const end=performance.now()+60000;while(!check()){assert(current()&&performance.now()<end,'Setup deadline');await delay(50)}};
      /** Record actual rendering-window state; the probe never disables background throttling. */
      const foreground=()=>({hidden:document.hidden,documentFocused:document.hasFocus(),windowFocused:win.isFocused(),throttle:win.webContents.getBackgroundThrottling()});
      const rows=[];
      try{
        c.file=await app.vault.create(path,Array.from({length:512},/** Disjoint unresolved targets give a known minimum physical degree. */ (_,n)=>'[[__kplex153_target_'+n+']]').join('\n'));
        await until(/** Wait for the actual native cache, not a fixed sleep. */ ()=>app.metadataCache.getFileCache(c.file)?.links?.length===512);
        c.index=new p.index.constructor(p,app);
        assert(await c.index.rebuild(),'Isolated production build');
        assert((await c.index.patchMarkdownPaths([path])).outcome==='patched','Warm source acquisition');
        await until(/** Avoid attributing concurrent primary-index fixture reconciliation to the no-op. */ ()=>p.getIndexStatus().upToDate&&!p.index.building);
        for(let run=0;run<3;run++){
          const i=c.index,page=i.get(path),retained=page.neighbours;
          assert(page&&retained.size>=512,'High-degree canonical page');
          while(i.state.evidence.depth<8)i.state.evidence=i.state.evidence.fork();
          const evidence=i.state.evidence;
          const before=JSON.stringify([...evidence.declarations()]),fingerprint=i.semanticFingerprints.get(path);
          c.probe=(${probeNoopPatch.toString()})({state:i.state,page});
          const operations={reads:0,parses:0,commits:0,largestCommitMs:0};c.wrappers=[];
          /** Forward receiver/results/promise identity and measure only synchronous admission/commit. */
          const wrap=(owner,key,before,after)=>{const original=owner[key];
            /** Observe this owner's call without joining or replacing asynchronous work. */
            owner[key]=function(...args){const at=performance.now();before?.();const result=original.apply(this,args);after?.(performance.now()-at);return result};
            c.wrappers.push(/** Restore wrappers independently of assertion/measurement success. */ ()=>owner[key]=original)};
          wrap(i.metadataParser,'parse',/** Record parser admission, not its async elapsed duration. */ ()=>operations.parses++);
          for(const key of ['read','cachedRead'])wrap(app.vault,key,/** Count issued native body reads only. */ ()=>operations.reads++);
          wrap(i,'publishIncrementalFile',/** Count exactly-once synchronous publication. */ ()=>operations.commits++,
            /** Keep the largest atomic commit separate from await-inclusive elapsed time. */ ms=>operations.largestCommitMs=Math.max(ms,operations.largestCommitMs));
          const visibility=foreground(),at=performance.now();
          const result=await i.patchMarkdownPaths([path],{isCurrent:current});
          const elapsed=performance.now()-at,afterVisibility=foreground(),counts={...c.probe.counts};
          for(const restore of c.wrappers.reverse())restore();c.wrappers=[];
          c.probe.restore();c.probe=null;
          assert(result.outcome==='patched'&&result.count===1,'Exactly one source published');
          assert(JSON.stringify([...i.state.evidence.declarations()])===before,'Declaration IDs/order/multiplicity retained');
          assert(i.semanticFingerprints.get(path)===fingerprint,'Fingerprint retained');
          for(const [path,relation] of page.neighbours)assert(i.state.pages.get(path)===relation.target,'Canonical relation target');
          assert(operations.reads===0&&operations.parses===0,'Warm no-op performs no body acquisition');
          rows.push({run,elapsedMs:elapsed,degree:retained.size,...counts,...operations,
            neighbourMapRetained:page.neighbours===retained,evidenceRetained:i.state.evidence===evidence,
            foreground:[visibility,afterVisibility],heap:performance.memory?.usedJSHeapSize});
        }
        return {rows,node:process.versions.node,chrome:process.versions.chrome,electron:process.versions.electron,
          inventory:{files:app.vault.getFiles().length,markdown:app.vault.getMarkdownFiles().length},
          counts:{pages:c.index.state.pages.size,declarations:c.index.state.evidence.declarationCount,pairs:c.index.state.evidence.pairCount}};
      }finally{
        const cleanupErrors=[];
        for(const restore of (c.wrappers??[]).reverse())try{restore()}catch(error){cleanupErrors.push(String(error))}c.wrappers=[];
        try{c.probe?.restore()}catch(error){cleanupErrors.push(String(error))}c.probe=null;
        try{c.index?.destroy()}catch(error){cleanupErrors.push(String(error))}c.index=null;
        try{if(c.file&&app.vault.getFileByPath(path)===c.file)await app.vault.delete(c.file)}catch(error){cleanupErrors.push(String(error))}c.file=null;
        try{win.setBounds(windowState.bounds);if(windowState.maximized)win.maximize();if(windowState.minimized)win.minimize()}catch(error){cleanupErrors.push(String(error))}
        if(cleanupErrors.length)throw Error('Native cleanup failed: '+cleanupErrors.join('; '));
      }
    })().then(/** Mark success only after the native finally block has completed. */ value=>{c.value=value;c.done=true},
      /** Preserve the error while still allowing bounded driver cleanup. */ error=>{c.error=String(error);c.done=true});
    return JSON.stringify({started:true});
  })()`);
  assert(start.started);
  const deadline = Date.now() + maximumMs;
  while (Date.now() < deadline) {
    await delay(1000);
    const value = evaluate("JSON.stringify({done:window.kplexNoopPatchProbe?.done,error:window.kplexNoopPatchProbe?.error,value:window.kplexNoopPatchProbe?.value})");
    if (!value.done) continue;
    if (value.error) throw Error(value.error);
    report.result = value.value;
    report.status = 'passed';
    break;
  }
  assert.equal(report.status, 'passed', 'Overall native experiment deadline');
} catch (error) { report.error = String(error); process.exitCode = 1; }
finally {
  try {
    const cleaned = evaluate(`(/** Retire pending work, then remove the controller only after native cleanup. */ ()=>{const c=window.kplexNoopPatchProbe;if(!c)return JSON.stringify({clean:true});c.closed=true;
      if(!c.done)c.index?.destroy();
      if(!c.done)return JSON.stringify({clean:false});delete window.kplexNoopPatchProbe;return JSON.stringify({clean:true})})()`);
    if (!cleaned.clean) {
      const end = Date.now() + 20_000;
      let done = false;
      while (Date.now() < end) {
        await delay(250);
        const state = evaluate('JSON.stringify({done:window.kplexNoopPatchProbe?.done})');
        if (state.done) { done = true; break; }
      }
      assert(done, 'Retired controller cleanup deadline');
      evaluate('delete window.kplexNoopPatchProbe;JSON.stringify({clean:true})');
    }
    assert(readFileSync(join(target.pluginDir, 'data.json')).equals(originalData), 'Settings bytes preserved');
    assert(readFileSync(join(target.config, 'community-plugins.json')).equals(originalEnabled), 'Enablement bytes preserved');
  } catch (error) { report.cleanupError = String(error); report.status = 'failed'; process.exitCode = 1; }
  writeFileSync(join(reportDir, 'noop-patch.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
