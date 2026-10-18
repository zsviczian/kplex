/**
 * Reproduce an unchanged genuine file publication before the first saved-graph chunk in real
 * Chromium/IndexedDB. An optional real structural-baseline publication reproduces native startup
 * ordering. Optional committed baseline sources run the same coordinator workload.
 * Setup is excluded from elapsed time; this is a work-count diagnostic, not a vault startup test.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnNativeSync } from './obsidian/processTools.mjs';
import { chromiumHarness } from '../../tests/support/browserTypeScript.mjs';
import { hydrationWorkBundle, contributorBrowserInitialize, initializeHydrationWork } from '../../tests/support/hydrationWorkFixture.mjs';

const root=resolve(fileURLToPath(new URL('../..',import.meta.url))),overrides={};
const ref=process.argv.find(/** Baselines are explicit immutable commits. */ arg=>arg.startsWith('--baseline-ref='))?.split('=')[1];
const structural=process.argv.includes('--structural-baseline');
if(ref&&!/^[a-f0-9]{7,40}$/.test(ref))throw Error('Use a commit hash for --baseline-ref');
const paths=['src/index/GraphIndex.ts','src/index/IndexedDbCache.ts'];
if(ref)for(const path of paths){
  const r=spawnNativeSync('git',['show',`${ref}:${path}`],{cwd:root,encoding:'utf8',timeout:10000});
  if(r.error||r.status!==0)throw Error('Baseline source unavailable');overrides[path]=r.stdout;
}
const source=Object.fromEntries(paths.map(/** Hash exactly what the browser bundler compiles. */ path=>[path,createHash('sha256').update(overrides[path]??readFileSync(join(root,path))).digest('hex')]));
const browser=await chromiumHarness(await hydrationWorkBundle(overrides)),results=[];
try{
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
  assert.equal(await browser.evaluate(initializeHydrationWork),true);
  for(let run=0;run<3;run++){
    const result=await browser.evaluate(`(/** Hold the actual reader, run the ordinary publisher, then let the coordinator choose recovery. */ async()=>{
      const f=await hydrationWorkFixture('restart-coordinator-${run}',512,0,'eager',true),i=f.index;
      const open=i.indexedDb.open,inventory=i.startPersistedSourceInventory,catalog=sourceModules.GraphBuilder.prototype.buildSourceNodeCatalog;
      let enter,release,held=false,inventories=0,catalogs=0;
      const entered=new Promise(/** Report exact first-page admission. */ resolve=>enter=resolve),gate=new Promise(/** Retain independent failure cleanup. */ resolve=>release=resolve);
      i.indexedDb.open=/** Hold only the full reader, preserving actual DB/promise completion. */ async function(...args){const db=await open.apply(this,args);if(!held&&i.getSnapshotHydrationDiagnostics().phase==='pages'){held=true;enter();await gate;}return db;};
      i.startPersistedSourceInventory=/** Count genuine fallback admission. */ function(...args){inventories++;return inventory.apply(this,args);};
      sourceModules.GraphBuilder.prototype.buildSourceNodeCatalog=/** Count actual global source vocabulary work. */ function(...args){catalogs++;return catalog.apply(this,args);};
      try{
        const expected=hydrationWorkValue({state:f.state}),at=performance.now(),restore=i.restoreIndexedDbSnapshot(['Hub.md']);
        await entered;
        if(${structural})equal(await i.initializeOnDemandBaseline(['Hub.md']),true,'Genuine startup structural publication');
        f.releaseSources();
        equal((await i.patchMarkdownPaths(['Hub.md'],{useDurableCache:true})).outcome,'patched','Ordinary genuine source publication');
        release();await restore;const outcome=await i.waitForSnapshotHydration(),elapsedMs=performance.now()-at;
        if(i.fullSnapshotHydrated)equal(hydrationWorkValue(i),expected,'Complete canonical saved adjacency/provenance is retained');
        return {elapsedMs,inventories,catalogs,full:i.fullSnapshotHydrated,pages:i.size,declarations:i.state.evidence.declarationCount,
          hydration:i.getSnapshotHydrationDiagnostics(),restored:outcome.restored,reads:f.f.reads.length,parses:f.f.parses.length};
      }finally{release();i.indexedDb.open=open;i.startPersistedSourceInventory=inventory;sourceModules.GraphBuilder.prototype.buildSourceNodeCatalog=catalog;f.close();}
    })()`);
    if(!ref){assert.equal(result.full,true);assert.equal(result.inventories,0);assert.equal(result.catalogs,0);}
    results.push(result);
  }
  const json=JSON.stringify({node:process.version,baselineRef:ref??null,scenario:structural?'structural-baseline-and-file':'file-only',source,results},null,2);
  if(process.env.KPLEX_BENCHMARK_REPORT)writeFileSync(process.env.KPLEX_BENCHMARK_REPORT,json+'\n');
  console.log(json);
}finally{await browser.cleanup();}
