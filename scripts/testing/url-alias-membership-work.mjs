/**
 * Exact-source B3 compiler work comparison. Distinct owners feed a shared URL in bounded batches;
 * only alias membership is observed, with setup and ordered graph/evidence oracle outside probes.
 * The fixed injected clock supports work counts, not elapsed-time claims.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { contributorBrowserBundle } from '../../tests/support/contributorBrowserFixture.mjs';
import { portableNoopFixture,noopPatchEntries } from '../../tests/support/noopPatchPortable.mjs';
import { probeUrlAliasMembership } from '../../tests/support/urlAliasMembershipProbe.mjs';
import { spawnNativeSync } from './obsidian/processTools.mjs';

const source='src/core/graph/compiler.ts',ref=process.argv.find(/** Only exact committed sources may select a baseline. */ arg=>arg.startsWith('--baseline-ref='))?.split('=')[1],overrides={};
if(ref){assert.match(ref,/^[a-f0-9]{7,40}$/);const r=spawnNativeSync('git',['show',`${ref}:${source}`],{cwd:process.cwd(),encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);overrides[source]=r.stdout;}
const bundle=await contributorBrowserBundle([...noopPatchEntries,'src/core/graph/model.ts',source],overrides),results=[];
for(const mode of ['repeated-label','distinct-labels','alias-vocabularies'])for(const owners of [256,512,1024,2048,4096]){
  const f=portableNoopFixture(bundle,0),M=f.M,target={id:M.nodeId('opaque URL'),kind:'url',state:'synthetic',semanticPath:'https://shared.example/path'};
  const compiler=new M.NormalizedGraphCompiler(f.builder.fullCompilerSettings(),{now:/** Counts only. */ ()=>0,yield:async/** No native scheduling claim. */ ()=>{},isCurrent:/** Fixture lifetime remains current. */ ()=>true,sliceBudgetMs:8,resolverBatchSize:256});
  const boundary={generation:M.sourceGeneration('membership'),snapshotRevision:M.sourceSnapshotRevision('membership')},read=compiler.beginRead(boundary),revision=M.sourceRevision('one');
  const records=[];
  for(let n=0;n<owners;n++){
    const owner={id:M.nodeId(`Owner ${n}`),kind:'document',state:'materialized',semanticPath:`Owner ${n}.md`,physicalPath:`Owner ${n}.md`},label=mode==='repeated-label'?'First':`Label ${n}`;
    records.push({kind:'entity',source:owner,entity:owner,sourceRevision:revision,name:`Owner ${n}`,url:null},
      {kind:'body-url',source:owner,sourceRevision:revision,target:{entity:target,rawTarget:target.semanticPath,resolvedBy:'url'},label,
        ...(mode==='alias-vocabularies'?{aliases:[label,'First',label,target.semanticPath]}:{})});
  }
  const probe=probeUrlAliasMembership(compiler,target.id);
  try{for(let start=0,sequence=0;start<records.length;start+=256,sequence++)assert(await compiler.acceptBatch(read,{boundary,sequence,final:start+256>=records.length,records:records.slice(start,start+256)}));}
  finally{probe.restore();}
  assert(compiler.completeRead(read,boundary));const graph=await compiler.finish();assert(graph);
  const expected=mode==='repeated-label'?['First']:Array.from({length:owners},/** Preserve source order; optional First follows the first meaningful label. */ (_,n)=>`Label ${n}`);
  if(mode==='alias-vocabularies')expected.splice(1,0,'First');
  assert.deepEqual([...graph.nodes.get(target.id).aliases],expected);assert.equal([...graph.declarations()].length,owners);
  const value={nodes:[...graph.nodes].map(/** Preserve every scalar/array and ordered relationship while avoiding cycles. */ ([id,node])=>{const {neighbours,...facts}=node;return [id,{...facts,neighbours:[...neighbours].map(/** Preserve target identity and relation values. */ ([key,{target,...relation}])=>[key,{...relation,targetId:target.id}])}];}),evidence:[...graph.declarations()]};
  results.push({mode,owners,...probe.counts,aliases:expected.length,bodyReads:f.host.reads.length,parses:f.host.parses.length,graphDigest:createHash('sha256').update(JSON.stringify(value)).digest('hex')});
}
console.log(JSON.stringify({node:process.version,baselineRef:ref??null,sourceSha256:createHash('sha256').update(overrides[source]??readFileSync(source)).digest('hex'),results},null,2));
