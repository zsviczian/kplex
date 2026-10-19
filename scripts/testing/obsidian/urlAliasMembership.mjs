/**
 * Paired actual-core B3 measurements inside native Electron. Exact baseline/checkout compilers are
 * independently bundled into the test controller, not substituted into the installed plugin. The
 * native fixture separately exercises the installed publisher/parser, owns cleanup and captures
 * foreground state. Engine timings exclude parsing/setup/digests and are not whole-index timings.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { browserBundle } from '../../../tests/support/browserTypeScript.mjs';
import { runControlledProbe } from './controlledProbe.mjs';
import { nativeUrlFixture,nativeUrlGraphValue } from './nativeUrlFixture.mjs';
import { spawnNativeSync } from './processTools.mjs';

const ref='186406e',source='src/core/graph/compiler.ts',r=spawnNativeSync('git',['show',`${ref}:${source}`],{cwd:process.cwd(),encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);
const entries=[source,'src/core/graph/source.ts','src/core/graph/model.ts','src/adapters/obsidian/graphContracts.ts'];
const baseline=await browserBundle(entries,{}, {[source]:r.stdout}),candidate=await browserBundle(entries);
const identities={baselineRef:ref,baseline:createHash('sha256').update(r.stdout).digest('hex'),candidate:createHash('sha256').update(readFileSync(source)).digest('hex')};

/** Compile the same physical-owner facts in alternating independent lifetimes, then check installed publication. */
async function scenario(app,c){
  const f=await nativeUrlFixture(app,'[First](https://shared.example/path)\n[Second](https://shared.example/path)',c),rows=[];
  try{
    const crypto=require('node:crypto'),target={id:'opaque URL',kind:'url',state:'synthetic',semanticPath:'https://shared.example/path'};
    for(const mode of ['distinct-labels','repeated-label']){
    const records=[];
    for(let n=0;n<4096;n++){
      const source={id:`Owner ${n}`,kind:'document',state:'materialized',semanticPath:`Owner ${n}.md`,physicalPath:`Owner ${n}.md`};
      records.push({kind:'entity',source,entity:source,sourceRevision:'one',name:`Owner ${n}`,url:null},
        {kind:'body-url',source,sourceRevision:'one',target:{entity:target,rawTarget:target.semanticPath,resolvedBy:'url'},label:mode==='distinct-labels'?`Label ${n}`:'First',
          ...(mode==='distinct-labels'?{aliases:[`Label ${n}`,'First',`Label ${n}`,target.semanticPath]}:{})});
    }
    const batches=[];for(let start=0;start<records.length;start+=256)batches.push(records.slice(start,start+256));
    for(const lane of ['baseline','candidate','candidate','baseline','baseline','candidate']){
      const M=c[lane+'Modules'],boundary={generation:'membership',snapshotRevision:'membership'};
      let yields=0,sliceStarted,maxSliceMs=0;
      const compiler=new M.NormalizedGraphCompiler(M.graphCompilerSettingsFromLegacy(f.settings),{
        now:/** Use the actual Electron monotonic clock. */ ()=>performance.now(),
        yield:/** Measure compute segments between actual host-task yields, not paint. */ async()=>{maxSliceMs=Math.max(maxSliceMs,performance.now()-sliceStarted);yields++;await new Promise(/** Existing cooperative host-task boundary. */ resolve=>window.setTimeout(resolve,0));sliceStarted=performance.now();},
        isCurrent:/** Outer controller owns cancellation, without any production timeout changes. */ ()=>!c.closed,sliceBudgetMs:13,resolverBatchSize:400,
      });
      const read=compiler.beginRead(boundary),before=f.foreground();sliceStarted=performance.now();const at=sliceStarted;
      for(let sequence=0;sequence<batches.length;sequence++)f.check(await compiler.acceptBatch(read,{boundary,sequence,final:sequence===batches.length-1,records:batches[sequence]}),'Native compiled batch');
      f.check(compiler.completeRead(read,boundary),'Native complete cursor');const graph=await compiler.finish();
      const elapsedMs=performance.now()-at;maxSliceMs=Math.max(maxSliceMs,performance.now()-sliceStarted);f.check(graph,'Native engine result');
      const value={aliases:graph.node(target.id).aliases,evidence:[...graph.declarations()],nodes:[...graph.nodes].map(/** Preserve every scalar/facet and ordered relation without cycles. */ ([id,node])=>{const {neighbours,...facts}=node;return [id,{...facts,neighbours:[...neighbours].map(/** Preserve all relation fields and target identity. */ ([key,{target,...relation}])=>[key,{...relation,targetId:target.id}])}];})};
      f.check(value.aliases.length===(mode==='distinct-labels'?4097:1)&&value.evidence.length===4096,'Native output multiplicity');
      rows.push({mode,lane,elapsedMs,yields,maxSliceMs,before,after:f.foreground(),graphDigest:crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')});
    }
    }
    f.check(rows.every(/** Digest equality includes declaration IDs/order; foreground loss invalidates observations. */ row=>row.graphDigest===rows.find(/** Match the same distinct/repeated fixture only. */ first=>first.mode===row.mode).graphDigest&&!row.before.hidden&&row.before.windowFocused&&row.before.documentFocused&&!row.after.hidden&&row.after.windowFocused&&row.after.documentFocused),'Matched native semantics/foreground');
    f.begin();await f.index.publishUrlOwner(f.file,f.body,0,undefined,true);f.end();
    f.check(f.operations.reads===0&&f.operations.parses===0,'Native installed hot publisher');
    const installedGraph=nativeUrlGraphValue(f.index);f.check(installedGraph.pages.find(/** Actual installed graph receives both parsed aliases. */ page=>page.path===target.semanticPath)?.aliases.length===2,'Native installed vocabulary');
    return {sources:c.sources,rows,installedPublisher:{operations:{...f.operations},graphDigest:crypto.createHash('sha256').update(JSON.stringify(installedGraph)).digest('hex')},limitations:'Paired exact-core engine inside native Electron, not whole native GraphIndex duration or retained heap.'};
  }finally{await f.close();}
}

const definitions=`const nativeUrlFixture=${nativeUrlFixture.toString()};const nativeUrlGraphValue=${nativeUrlGraphValue.toString()};c.sources=${JSON.stringify(identities)};${baseline.replace('window.sourceModules=','c.baselineModules=')}${candidate.replace('window.sourceModules=','c.candidateModules=')}`;
await runControlledProbe('url-alias-membership',scenario,definitions);
