/**
 * Aggregate real-IDB measurements of production settings-signature work during Eager hydration.
 * Fixture creation, storage seeding and semantic digests are outside measured regions. Results
 * distinguish synchronous signature CPU from await-inclusive hydration time; no vault is touched.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnNativeSync } from './obsidian/processTools.mjs';
import { chromiumHarness } from '../../tests/support/browserTypeScript.mjs';
import { hydrationWorkBundle, contributorBrowserInitialize, initializeHydrationWork } from '../../tests/support/hydrationWorkFixture.mjs';

const root=resolve(fileURLToPath(new URL('../..',import.meta.url))),overrides={};
const ref=process.argv.find(/** Accept a literal committed baseline identity, never arbitrary Git options. */ arg=>arg.startsWith('--baseline-ref='))?.split('=')[1];
if(ref && !/^[a-f0-9]{7,40}$/.test(ref))throw Error('Use a commit hash for --baseline-ref');
const paths=['src/index/GraphIndex.ts','src/index/IndexedDbCache.ts'];
if(ref)for(const path of paths){
  const result=spawnNativeSync('git',['show',`${ref}:${path}`],{cwd:root,encoding:'utf8',timeout:10_000});
  if(result.error||result.status!==0)throw Error(result.error?.message||result.stderr);overrides[path]=result.stdout;
}
const source=Object.fromEntries(paths.map(/** Hash the actual source bytes compiled for this measurement. */ path=>[path,createHash('sha256').update(overrides[path]??readFileSync(join(root,path))).digest('hex')]));
const selected=process.argv.find(/** Select one existing count/field combination for serial paired trials. */ arg=>arg.startsWith('--case='))?.split('=')[1];
const cases=selected?[selected.split(':').map(Number)]:[[256,256],[512,256],[1024,256],[2048,256],[4096,256],[1024,0],[1024,128],[1024,512]];
if(cases.some(/** Refuse malformed or accidentally huge diagnostic workloads. */ ([records,fields])=>!Number.isInteger(records)||records<1||records>8192||!Number.isInteger(fields)||fields<0||fields>1024))throw Error('Invalid --case=records:fields');
const browser = await chromiumHarness(await hydrationWorkBundle(overrides));
try {
  assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
  assert.equal(await browser.evaluate(initializeHydrationWork), true);
  const results=[];
  for(const [records,fields] of cases) {
    const result=await browser.evaluate(`(async()=>{
      const f=await hydrationWorkFixture('hydration-guard-${records}-${fields}',${records},${fields});
      const probe=sourceModules.installHydrationWorkProbe(()=>performance.now(),()=>f.index.getSnapshotHydrationDiagnostics().phase);
      try{
        const expected=hydrationWorkValue({state:f.state}),at=performance.now();
        const preview=await f.index.restoreIndexedDbSnapshot(['Hub.md']);
        ok(preview.restored,'Actual saved preview');
        ok((await f.index.waitForSnapshotHydration()).restored,'Actual full hydration');
        const elapsedMs=performance.now()-at,phases=probe.snapshot();probe.restore();
        const actual=hydrationWorkValue(f.index);
        if(JSON.stringify(actual)!==JSON.stringify(expected)){
          const diffs=actual.pages.map((page,n)=>JSON.stringify(page)!==JSON.stringify(expected.pages[n])?{actual:page,expected:expected.pages[n]}:null).filter(Boolean).slice(0,2);
          throw Error('Cached graph oracle mismatch '+JSON.stringify({diffs,actualEvidence:actual.declarations[0],expectedEvidence:expected.declarations[0]}));
        }
        return {records:${records},fields:${fields},elapsedMs,phases,reads:f.f.reads.length,parses:f.f.parses.length,userAgent:navigator.userAgent};
      }finally{probe.restore();f.close();}
    })()`);
    results.push(result);
  }
  console.log(JSON.stringify({node:process.version,baselineRef:ref??null,source,results},null,2));
} finally { await browser.cleanup(); }
