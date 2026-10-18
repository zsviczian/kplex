/**
 * Bounded native controller transport shared by measured #153 checkpoints. Validates explicit
 * disposable vault/build identity and preserves configuration bytes. Scenarios own their actual
 * resources; this driver retires pending work and waits for independent cleanup on every exit.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { obsidianCliExecutable,spawnNativeSync } from './processTools.mjs';
import { validateTarget } from './runner.mjs';

/** Run one serialized scenario. Alternate artifact roots require an explicit prior-source baseline;
 * their exact-hash/full-verification staging receipt remains separate from this functional probe.
 * Callers list additional runtime modules when a checkpoint introduces a new implementation owner.
 * A new scale experiment may name a bounded test duration; existing probes retain180seconds. */
export async function runControlledProbe(name,scenario,definitions='',extraSources=[],options={}) {
  const maximumMs=options.maximumMs??180000;
  assert(Number.isInteger(maximumMs)&&maximumMs>0&&maximumMs<=900000,'Bound native experiments to at most15minutes');
  const root=resolve(fileURLToPath(new URL('../../..',import.meta.url))),vault=process.env.KPLEX_TEST_VAULT_NAME;
  const target=validateTarget({vaultName:vault,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
  const directory=process.env.KPLEX_HOST_REPORT_DIR;if(!directory)throw Error('Set KPLEX_HOST_REPORT_DIR');mkdirSync(directory,{recursive:true});
  /** Capture hashes without disclosing test-vault contents. */
  const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
  /** All native calls use the shared console executable/transport and a hard process deadline. */
  const cli=(command,...args)=>{const r=spawnNativeSync(obsidianCliExecutable(),[`vault=${vault}`,command,...args],{encoding:'utf8',timeout:15000,killSignal:'SIGKILL',maxBuffer:2*1024*1024});if(r.error||r.status!==0||/^Error:/m.test(r.stdout))throw Error(r.error?.message||r.stderr||r.stdout);return r.stdout.trim();};
  /** Check embedded syntax before native side effects and decode bounded controller responses. */
  const evaluate=code=>{new Script(code);const raw=cli('eval',`code=${code}`);return JSON.parse(raw.slice(raw.indexOf('{')));};
  /** Polling does not alter native scheduler/throttling policy. */
  const delay=ms=>new Promise(/** Own one bounded transport wait. */ resolve=>setTimeout(resolve,ms));
  const originalData=readFileSync(join(target.pluginDir,'data.json')),originalEnabled=readFileSync(join(target.config,'community-plugins.json'));
  const report={name,status:'failed',node:process.version,startedAt:new Date().toISOString(),maximumMs,driver:{transport:hash(fileURLToPath(import.meta.url)),scenario:createHash('sha256').update(scenario.toString()).digest('hex'),definitions:createHash('sha256').update(definitions).digest('hex')},artifacts:{},source:{},limitations:'Controlled native method observations, not actual paint or physical-device acceptance.'};
  try{
    assert.equal(resolve(cli('vault','info=path').replace(/^path\s+/,'')),target.vault);report.obsidian=cli('version');
    const artifactDir=process.env.KPLEX_PROBE_ARTIFACT_DIR??join(root,'dist');
    assert(!process.env.KPLEX_PROBE_ARTIFACT_DIR||process.env.KPLEX_PROBE_BASELINE_REF,'Alternate artifact root requires baseline attribution');
    for(const file of ['main.js','manifest.json','styles.css']){const value=hash(join(artifactDir,file));assert.equal(hash(join(target.pluginDir,file)),value);report.artifacts[file]=value;}
    const ref=process.env.KPLEX_PROBE_BASELINE_REF;
    if(ref){assert.match(ref,/^[a-f0-9]{7,40}$/);report.source.baselineRef=ref;}
    for(const file of ['src/index/GraphBuilder.ts','src/index/GraphIndex.ts','src/core/graph/compiler.ts',...extraSources]){
      if(ref){const result=spawnNativeSync('git',['show',`${ref}:${file}`],{cwd:root,encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr);report.source[file]=createHash('sha256').update(result.stdout).digest('hex');}
      else report.source[file]=hash(join(root,file));
    }
    const started=evaluate(`(/** Install cleanup ownership before asynchronous scenario work. */ ()=>{
      if(window.kplexIndexingProbe)throw Error('Existing indexing controller');
      const c=window.kplexIndexingProbe={done:false,closed:false};
      ${definitions}
      c.task=(${scenario.toString()})(app,c).then(/** Complete only after scenario cleanup succeeds. */ value=>{c.value=value;c.done=true;},/** Retain all failures for the driver. */ error=>{c.error=String(error);c.done=true;});
      return JSON.stringify({started:true});
    })()`);assert(started.started);
    const end=Date.now()+maximumMs;
    while(Date.now()<end){await delay(1000);const state=evaluate('JSON.stringify({done:window.kplexIndexingProbe?.done,error:window.kplexIndexingProbe?.error,value:window.kplexIndexingProbe?.value,progress:window.kplexIndexingProbe?.progress})');if(!state.done){if(state.progress){report.progress=state.progress;writeFileSync(join(directory,`${name}.json`),JSON.stringify({...report,status:'running'},null,2)+'\n');}continue;}if(state.error){report.partial=state.progress;throw Error(state.error);}report.result=state.value;report.status='passed';break;}
    assert.equal(report.status,'passed','Native experiment deadline');
  }catch(error){report.error=String(error);process.exitCode=1;}
  finally{
    try{
      let result=evaluate(`(/** Retire pending work; the scenario's finally owns independent native cleanup. */ ()=>{const c=window.kplexIndexingProbe;if(!c)return JSON.stringify({done:true});c.closed=true;if(!c.done){c.index?.destroy();c.release?.();}return JSON.stringify({done:c.done});})()`);
      const end=Date.now()+20000;while(!result.done&&Date.now()<end){await delay(250);result=evaluate('JSON.stringify({done:window.kplexIndexingProbe?.done})');}
      assert(result.done,'Cleanup deadline');evaluate('delete window.kplexIndexingProbe;JSON.stringify({clean:true})');
      assert(readFileSync(join(target.pluginDir,'data.json')).equals(originalData),'Settings bytes');assert(readFileSync(join(target.config,'community-plugins.json')).equals(originalEnabled),'Enablement bytes');report.cleanup='passed';
    }catch(error){report.cleanupError=String(error);report.status='failed';process.exitCode=1;}
    report.completedAt=new Date().toISOString();writeFileSync(join(directory,`${name}.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,report:join(directory,`${name}.json`),result:report.result}));
  }
  return report;
}
