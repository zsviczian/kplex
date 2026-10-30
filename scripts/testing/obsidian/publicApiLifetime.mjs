/** Official-CLI API retirement/reload acceptance in the explicit disposable Small vault.
 * Captures only API handles and scalar observations; no note content or configuration is edited. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {obsidianCliExecutable,spawnNativeSync} from './processTools.mjs';
import {validateTarget} from './runner.mjs';

const vaultName=process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName,'kplex-test-small','Explicit disposable Small vault required');
const target=validateTarget({vaultName,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const output=process.env.KPLEX_HOST_REPORT_DIR;assert(output,'Set KPLEX_HOST_REPORT_DIR');mkdirSync(output,{recursive:true});
const originalData=readFileSync(join(target.pluginDir,'data.json')),originalEnabled=readFileSync(join(target.config,'community-plugins.json'));
const report={status:'failed',node:process.version,startedAt:new Date().toISOString(),cases:[]};
/** Use explicit argument arrays and the canonical bounded local-eval transport. */
function cli(command,...args){const result=spawnNativeSync(obsidianCliExecutable(),[`vault=${vaultName}`,command,...args],{encoding:'utf8',timeout:15000,maxBuffer:1024*1024});if(result.error||result.status!==0||/^Error:/m.test(result.stdout))throw result.error??Error(result.stderr||result.stdout);return result.stdout.trim();}
/** Decode only detached public acceptance values. */
function evaluate(code){return JSON.parse(cli('eval',`code=${code}`).replace(/^=>\s*/,''));}
/** Yield native save/enable tasks without changing window throttling policy. */
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let enabled=true;
try{
  assert.equal(resolve(cli('vault','info=path')),target.vault);report.obsidian=cli('version');
  assert(evaluate('(()=>{if(window.kplex240OldApi)throw Error("Existing API lifetime probe");window.kplex240OldApi=app.plugins.plugins["k-plex"].api.v1;return JSON.stringify({available:window.kplex240OldApi.ontology().ok})})()').available);
  cli('plugin:disable','id=k-plex');enabled=false;await delay(500);
  const retired=evaluate('JSON.stringify({status:window.kplex240OldApi.status(),ontology:window.kplex240OldApi.ontology(),query:window.kplex240OldApi.query({query:"{status{phase}}"}),configuration:window.kplex240OldApi.configuration.list(),portsReleased:window.kplex240OldApi.ports===null})');
  for(const name of ['status','ontology','query','configuration'])assert.equal(retired[name].error?.code,'API_UNAVAILABLE',name);
  assert(retired.portsReleased);report.cases.push('retained API and configuration handles reject after unload and release host ports');
  cli('plugin:enable','id=k-plex');enabled=true;
  let restored;const deadline=Date.now()+30000;
  do{await delay(100);restored=evaluate('JSON.stringify((()=>{const root=app.plugins.plugins["k-plex"]?.api;return {version:root?.version,fresh:root?.v1!==window.kplex240OldApi,ontology:root?.v1.ontology(),old:window.kplex240OldApi.status()}})())');}while(!restored.ontology?.ok&&Date.now()<deadline);
  assert.equal(restored.version,1);assert(restored.fresh&&restored.ontology.ok);assert.equal(restored.old.error?.code,'API_UNAVAILABLE');
  report.cases.push('reload publishes a fresh versioned API with ontology while old handles remain retired');report.status='passed';
}catch(error){report.error=String(error);process.exitCode=1;}
finally{
  try{
    evaluate('delete window.kplex240OldApi;JSON.stringify({clean:true})');
    if(!enabled)cli('plugin:enable','id=k-plex');await delay(2000);
    assert(readFileSync(join(target.pluginDir,'data.json')).equals(originalData),'Settings bytes');
    assert(readFileSync(join(target.config,'community-plugins.json')).equals(originalEnabled),'Enablement bytes');report.cleanup='passed';
  }catch(error){report.cleanupError=String(error);report.status='failed';process.exitCode=1;}
  report.completedAt=new Date().toISOString();writeFileSync(join(output,'public-api-lifetime-240.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report));
