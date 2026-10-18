/**
 * Actual GraphIndex/GraphBuilder B2 work counts at fixed alias vocabulary. Source facts, owner
 * order and explicit 128-owner display batches match both exact revisions. Private cloning and
 * display materialization are counted independently; fake CPU/timers prohibit latency claims.
 * An optional independent adjacency revision pins the storage owner for later representation
 * comparisons without requiring that module in historical pre-B2 GraphBuilder baselines.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {contributorBrowserBundle} from '../../tests/support/contributorBrowserFixture.mjs';
import {urlPublicationFixture} from '../../tests/support/urlPublicationFixture.mjs';
import {probeUrlPageCopies} from '../../tests/support/urlPageCopyProbe.mjs';
import {spawnNativeSync} from './obsidian/processTools.mjs';

const ref=process.argv.find(/** Exact committed source is the sole baseline selector. */ value=>value.startsWith('--baseline-ref='))?.split('=')[1],sources=['src/index/GraphBuilder.ts','src/index/GraphIndex.ts'],overrides={};
if(ref){assert.match(ref,/^[a-f0-9]{7,40}$/);for(const source of sources){const r=spawnNativeSync('git',['show',`${ref}:${source}`],{cwd:process.cwd(),encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);overrides[source]=r.stdout;}}
const adjacencySource='src/index/UrlAdjacencyMap.ts',adjacencyRef=process.argv.find(/** Storage comparisons explicitly pin this additional implementation owner. */value=>value.startsWith('--adjacency-baseline-ref='))?.split('=')[1];
if(adjacencyRef){assert.match(adjacencyRef,/^[a-f0-9]{7,40}$/);const result=spawnNativeSync('git',['show',`${adjacencyRef}:${adjacencySource}`],{cwd:process.cwd(),encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr);overrides[adjacencySource]=result.stdout;}
const bundle=await contributorBrowserBundle([...sources,'src/index/UrlAdjacencyMap.ts','src/core/graph/evidence.ts','src/core/graph/relations.ts'],overrides),rows=[];
for(const owners of [256,512,1024,2048,4096]){
  let token=0;const timers=new Map(),f=urlPublicationFixture(bundle,{setTimeout:/** Drive only declared display boundaries in this count-only experiment. */ callback=>{const key=++token;timers.set(key,callback);return key;},clearTimeout:/** Cancellation remains exact for owned timer identities. */ key=>timers.delete(key)}),i=f.index,flush=i.flushUrlPublication;
  const probe=probeUrlPageCopies(f.M.GraphBuilder.prototype);let displayEntries=0;
  const prototype=f.M.UrlAdjacencyMap.prototype,adopt=prototype.adopt,flatten=prototype.flattenCooperative;
  let replayKeys=0,largestReplay=0,compactions=0,compactedEntries=0;
  prototype.adopt=/** Count admitted changed-key work separately from cloning/display enumeration. */function(child,maximum){const cost=child.replayCost,result=adopt.call(this,child,maximum);if(result){replayKeys+=cost;largestReplay=Math.max(largestReplay,cost);}return result;};
  prototype.flattenCooperative=/** Attribute actual compaction input for this noncancelled count-only sequence. */function(...args){compactions++;compactedEntries+=this.size;return flatten.apply(this,args);};
  i.flushUrlPublication=/** Count actual copy input only inside this index's existing synchronous flush. */ function(...args){
    const restores=[];
    for(const path of this.pendingUrlPaths){const map=this.urlState.pages.get(path)?.neighbours;if(!map)continue;const own=Object.getOwnPropertyDescriptor(map,Symbol.iterator),iterator=map[Symbol.iterator];
      map[Symbol.iterator]=/** Preserve exact Map results/order; no global prototype changes. */ function*(){for(const entry of iterator.call(this)){displayEntries++;yield entry;}};
      restores.push(/** Release only this exact observed map iterator. */ ()=>{if(own)Object.defineProperty(map,Symbol.iterator,own);else delete map[Symbol.iterator];});}
    try{return flush.apply(this,args);}finally{for(const restore of restores.reverse())restore();}
  };
  try{
    for(let n=0;n<owners;n++){const record=f.add(`Owner-${n}.md`,'[Fixed label](https://shared.example/path)');await i.publishUrlOwner(record.file,record.body,0,undefined,true);if((n+1)%128===0)i.flushUrlPublication();}
    i.flushUrlPublication();probe.restore();i.flushUrlPublication=flush;
    const value={pages:[...i.urlState.pages].map(/** Preserve ordered facts and every relation target identity without cycles. */ ([path,page])=>({path,name:page.name,aliases:page.aliases,neighbours:[...page.neighbours].map(/** Relationships are never sorted or deduplicated for comparison. */ ([path,{target,...relation}])=>[path,{...relation,targetPath:target.path}])})),evidence:[...i.urlState.evidence.declarations()],owners:[...i.urlOwners.keys()]};
    assert.equal(i.urlState.pages.get('https://shared.example/path').neighbours.size,owners+1);assert.equal(i.urlState.evidence.declarationCount,owners+1);
    rows.push({owners,...probe.counts,replayKeys,largestReplay,compactions,compactedEntries,displayEntries,flushes:i.urlPresentationFlushes,graphDigest:createHash('sha256').update(JSON.stringify(value)).digest('hex')});
  }finally{prototype.adopt=adopt;prototype.flattenCooperative=flatten;probe.restore();i.flushUrlPublication=flush;f.close();assert.equal(timers.size,0);}
}
console.log(JSON.stringify({node:process.version,baselineRef:ref??null,adjacencyBaselineRef:adjacencyRef??null,sources:Object.fromEntries([...sources,adjacencySource].map(/** Identify exact source bytes independently of working-tree status. */ source=>[source,createHash('sha256').update(overrides[source]??readFileSync(source)).digest('hex')])),rows},null,2));
