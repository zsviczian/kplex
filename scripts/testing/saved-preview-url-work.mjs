/**
 * Real-IDB Package C dependency measurement. A real URL-owner page/publication/compiler hold
 * remains unresolved for a declared observation window; preview completion and total completion
 * are reported separately. Exact committed GraphIndex sources select the baseline without checkout.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { hydrationWorkBundle,contributorBrowserInitialize } from '../../tests/support/hydrationWorkFixture.mjs';
import { initializeSavedPreviewUrl } from '../../tests/support/savedPreviewUrlFixture.mjs';
import { chromiumHarness } from '../../tests/support/browserTypeScript.mjs';
import { spawnNativeSync } from './obsidian/processTools.mjs';

const source='src/index/GraphIndex.ts',ref=process.argv.find(/** Only committed source identities select a baseline. */ arg=>arg.startsWith('--baseline-ref='))?.split('=')[1],overrides={};
if(ref){assert.match(ref,/^[a-f0-9]{7,40}$/);const r=spawnNativeSync('git',['show',`${ref}:${source}`],{cwd:process.cwd(),encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);overrides[source]=r.stdout;}
const browser=await chromiumHarness(await hydrationWorkBundle(overrides)),rows=[];
try{
  assert(await browser.evaluate(contributorBrowserInitialize));assert(await browser.evaluate(initializeSavedPreviewUrl));
  for(const mode of ['eager','on-demand'])for(const phase of ['page','publication','compiler']){
    rows.push(await browser.evaluate(`(async()=>{
      const q=await savedPreviewUrlFixture('preview-work-${mode}-${phase}','${mode}','${phase}'),i=q.index;
      try{
        const discovery=i.startBackgroundUrlIndex();await savedPreviewDeadline(q.entered,'URL hold');
        await i.primePhysicalSearchCatalog();ok(i.search('Hub',10,'vault-files').some(page=>page.path==='Hub.md'),'Physical search before preview');
        let catalogReads=0;const read=i.indexedDb.readSnapshotCatalog;
        i.indexedDb.readSnapshotCatalog=function(...args){catalogReads++;return read.apply(this,args);};
        let previewMs=null,settled=false;const at=performance.now();
        const preview=i.restorePersistedSnapshot(['Hub.md']).then(result=>{settled=true;previewMs=performance.now()-at;return result;});
        await new Promise(resolve=>setTimeout(resolve,200));
        const beforeRelease={previewCompleted:settled,previewMs,catalogReads,hasBodyUrl:Boolean(i.state.pages.get('Hub.md')?.neighbours.has(q.target)),writeReady:i.isSemanticWriteReady('Hub.md',q.target),urlComplete:i.getUrlIndexProgress().complete,priority:i.getWorkPriorityDiagnostics()};
        q.release();const result=await savedPreviewDeadline(preview,'Saved preview after URL release');
        ok(result.restored,'Valid current snapshot');ok(await savedPreviewDeadline(discovery,'URL completion'),'URL completion');
        if('${mode}'==='eager')ok((await savedPreviewDeadline(i.waitForSnapshotHydration(),'Full hydration',8000)).restored,'Full optional graph');
        ok(i.get(q.target)?.aliases.includes('Saved body URL'),'Final URL vocabulary');
        const totalMs=performance.now()-at,value={graph:hydrationWorkValue(i),declarations:[...i.state.evidence.declarations()],urlPages:[...i.urlState.pages].map(([path,page])=>({path,name:page.name,aliases:page.aliases,neighbours:[...page.neighbours].map(([path,{target,...relation}])=>[path,relation])})),urlEvidence:[...i.urlState.evidence.declarations()]};
        const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))),graphDigest=Array.from(new Uint8Array(hash),value=>value.toString(16).padStart(2,'0')).join('');
        return {mode:'${mode}',phase:'${phase}',holdMs:200,beforeRelease,previewMs,totalMs,graphDigest,reads:q.f.reads.length,parses:q.f.parses.length,
          aliases:i.get(q.target).aliases,owners:i.urlOwners.size,fullHydrated:i.fullSnapshotHydrated};
      }finally{q.close();}
    })()`));
  }
}finally{await browser.cleanup();}
console.log(JSON.stringify({node:process.version,baselineRef:ref??null,sourceSha256:createHash('sha256').update(overrides[source]??readFileSync(source)).digest('hex'),rows,limitations:'Controlled 200ms dependency hold; preview latency is distinct from whole startup, total CPU, actual paint and retained heap.'},null,2));
