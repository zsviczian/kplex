/**
 * PR #153 E3 measurement gate. Genuine URL occurrences reach the actual normalized compiler and
 * evidence owner in bounded source batches. Dense versus distributed ownership keeps the same
 * original declaration total. Fixed CPU time permits work counts only, never elapsed/heap claims.
 * No host parser, public store contract, scheduler or production implementation is replaced.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {loadPortableModules} from '../../tests/support/portableTypeScript.mjs';
import {probeEvidenceAppends} from '../../tests/support/evidenceAppendProbe.mjs';
import {spawnNativeSync} from './obsidian/processTools.mjs';

const sources=['src/core/graph/compiler.ts','src/core/graph/evidence.ts'],ref=process.argv.find(/** Baseline modules must name exact committed Git bytes. */arg=>arg.startsWith('--baseline-ref='))?.split('=')[1],overrides={},expectPrivate=process.argv.includes('--expect-private-appends');
if(ref){assert.match(ref,/^[a-f0-9]{7,40}$/);for(const source of sources){const result=spawnNativeSync('git',['show',`${ref}:${source}`],{cwd:process.cwd(),encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr);overrides[source]=result.stdout;}}
const loaded=loadPortableModules(['src/core/graph/compiler.ts','src/core/graph/model.ts','src/core/graph/source.ts','src/core/graph/evidence.ts','src/core/graph/relations.ts'],{},overrides),M=loaded.exports;
const settings={hierarchy:{hidden:['Hidden'],parents:['Parent'],children:['Child'],leftFriends:['Friends'],rightFriends:['Opposes'],previous:['Previous'],next:['Next']},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
const rows=[];
try{
  for(const mode of ['dense','distributed'])for(const declarations of [256,512,1024,2048,4096]){
    const compiler=new M.NormalizedGraphCompiler(settings,{now:/** A count fixture must not invent CPU timings. */()=>0,yield:async/** No native task/paint claim. */()=>{},isCurrent:/** No cancellation is injected in this baseline. */()=>true,sliceBudgetMs:8,resolverBatchSize:256});
    const boundary={generation:M.sourceGeneration('append-work'),snapshotRevision:M.sourceSnapshotRevision('append-work')},read=compiler.beginRead(boundary),revision=M.sourceRevision('one');
    const target={id:M.nodeId('opaque URL'),kind:'url',state:'synthetic',semanticPath:'https://shared.example/path'},records=[];
    for(let n=0;n<declarations;n++){
      const ownerOrdinal=mode==='dense'?0:n,source={id:M.nodeId('opaque Owner '+ownerOrdinal),kind:'document',state:'materialized',semanticPath:'Owner '+ownerOrdinal+'.md',physicalPath:'Owner '+ownerOrdinal+'.md'};
      if(mode==='distributed'||n===0)records.push({kind:'entity',source,entity:source,sourceRevision:revision,name:'Owner '+ownerOrdinal,url:null});
      records.push({kind:'body-url',source,sourceRevision:revision,target:{entity:target,rawTarget:target.semanticPath,resolvedBy:'url'},label:'Fixed',provenance:{surface:'body',location:{line:n+1}}});
    }
    const probe=probeEvidenceAppends(compiler.evidence);
    try{for(let start=0,sequence=0;start<records.length;start+=256,sequence++)assert(await compiler.acceptBatch(read,{boundary,sequence,final:start+256>=records.length,records:records.slice(start,start+256)}));}
    finally{probe.restore();}
    assert(compiler.completeRead(read,boundary));const graph=await compiler.finish();assert(graph);
    const originals=[...graph.declarations()],body=originals.filter(/** Only original physical URL occurrences contribute to this multiplicity assertion. */item=>item.sourceKind==='body-url');
    assert.equal(body.length,declarations);assert.equal(originals.length,declarations,'This fixture supplies body occurrences only; URL-origin facts are a separate producer');
    assert.deepEqual(body.map(/** Body-URL compilation retains genuine one-based line provenance, not invented character offsets. */item=>item.line),Array.from({length:declarations},/** Expected original physical order is never sorted away. */(_,n)=>n+1));
    const store=graph.legacyEvidence();assert(store);assert.equal(store.targetIndex,null);assert.equal(store.declarationCount,declarations);assert.equal(store.pairCount,mode==='dense'?1:declarations);
    assert.equal(probe.counts.appends,declarations);assert.equal(probe.counts.priorEntriesCopied,mode==='dense'&&!expectPrivate?declarations*(declarations-1)/2:0);
    assert.equal(probe.counts.inPlaceAppends,mode==='dense'&&expectPrivate?declarations-1:0);
    const value={nodes:[...graph.nodes].map(/** Preserve all ordered node/alias/relation values while removing only target object cycles. */([id,node])=>{const{neighbours,...facts}=node;return[id,{...facts,neighbours:[...neighbours].map(/** Keep exact target identities as opaque IDs. */([key,{target,...relation}])=>[key,{...relation,targetId:target.id}])}];}),evidence:originals};
    rows.push({mode,declarations,physicalOccurrences:declarations,nodes:graph.nodes.size,pairs:store.pairCount,...probe.counts,graphDigest:createHash('sha256').update(JSON.stringify(value)).digest('hex')});
  }
}finally{loaded.cleanup();}
console.log(JSON.stringify({node:process.version,baselineRef:ref??null,expectPrivate,sources:Object.fromEntries(sources.map(/** Attribute canonical implementation bytes used by this comparison. */source=>[source,createHash('sha256').update(overrides[source]??readFileSync(source)).digest('hex')])),rows,limitations:'Actual private compiler/evidence allocation proxies with genuine occurrence provenance; fixed clock gives no elapsed, native startup, source-I/O, retained-heap or physical-device acceptance.'},null,2));
