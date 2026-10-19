/**
 * Explicit compiler append ownership must never escape into published/forked/retained generations.
 * Compare actual evidence APIs against ordinary copy-on-write stores, then verify canonical compiler
 * success, rejection and cancellation retire the capability. No native host behavior is simulated.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadPortableModules} from './support/portableTypeScript.mjs';
import {probeEvidenceAppends} from './support/evidenceAppendProbe.mjs';
const loaded=loadPortableModules(['src/core/graph/compiler.ts','src/core/graph/evidence.ts','src/core/graph/relations.ts','src/core/graph/model.ts','src/core/graph/source.ts']),M=loaded.exports;
test.after(/** Remove only this suite's emitted modules. */()=>loaded.cleanup());
/** Deterministic private checkpoints retain the actual store's cooperative operation. */
async function allow(){return true;}
/** Supply original directional/Hidden/date evidence through the canonical admission API. */
function add(store,n=0){
  const roles=['child','parent','hidden','previous','next','left','right'];
  store.addDeclaration('A','B',roles[n%roles.length],M.RelationType.DEFINED,n%2?M.LinkDirection.FROM:M.LinkDirection.TO,{sourceKind:n%3?'frontmatter-ontology':'date-property',fieldName:'Role',rawValue:'[[B]]',line:n+1});
}
/** Include every ordered public view and exact aggregate/ID state; this also seals original iteration. */
function value(store){return{declarations:[...store.declarations()],entries:[...store.entries()],forward:store.between('A','B'),reverse:store.between('B','A'),from:store.from('A'),touching:store.declarationsTouching('B'),pairs:store.pairCount,count:store.declarationCount,nextId:store.nextId};}
/** Internal arrays are inspected only to prove retention/copy ownership, never used as production ports. */
function bucket(store){return store.readPair('A\u0000B');}
/** Create the same originals in an ordinary store and an explicitly owned compiler store. */
function pair(count=2){const actual=M.RelationEvidenceStore.createPrivateCompilation(),oracle=new M.RelationEvidenceStore();for(let n=0;n<count;n++){add(actual,n);add(oracle,n);}return{actual,oracle};}

test('only explicit private creation avoids dense prefixes; sealing preserves all ordinary evidence values',async()=>{
  const actual=M.RelationEvidenceStore.createPrivateCompilation(),oracle=new M.RelationEvidenceStore(),probe=probeEvidenceAppends(actual),normal=probeEvidenceAppends(oracle);
  try{for(let n=0;n<1024;n++){add(actual,n);add(oracle,n);}assert.equal(probe.counts.priorEntriesCopied,0);assert.equal(probe.counts.inPlaceAppends,1023);assert.equal(normal.counts.priorEntriesCopied,1024*1023/2);}
  finally{probe.restore();normal.restore();}
  assert.equal(actual.privateCompilerAppend,true);assert.equal(oracle.privateCompilerAppend,false);assert.equal(actual.declarationCount,1024);assert.equal(actual.pairCount,1);
  actual.sealPrivateCompilation();const retained=bucket(actual);add(actual,1024);add(oracle,1024);assert.equal(retained.length,1024);assert.notEqual(bucket(actual),retained);assert.deepEqual(value(actual),value(oracle));
});

for(const method of ['declarations','declarationsTouchingIterator'])test(`${method} preserves suspended original iteration after further appends`,async()=>{
  const {actual,oracle}=pair(),a=actual[method]('A'),b=oracle[method]('A');
  assert.equal(actual.privateCompilerAppend,true,'An unstarted generator has not captured a bucket');
  assert.deepEqual(a.next(),b.next());assert.equal(actual.privateCompilerAppend,false);
  const retained=bucket(actual);add(actual,2);add(oracle,2);assert.deepEqual([...a],[...b]);assert.equal(retained.length,2);assert.notEqual(bucket(actual),retained);assert.deepEqual(value(actual),value(oracle));
});

test('copied public views and entry iteration retain ordinary semantics before explicit sealing',async()=>{
  const {actual,oracle}=pair(),copies=[actual.between('A','B'),actual.declarationsForPair('A','B'),actual.from('A')],before=structuredClone(copies),a=actual.entries(),b=oracle.entries();
  assert.deepEqual(a.next(),b.next());assert.equal(actual.privateCompilerAppend,true,'Resolver views own their arrays and need not disable private ingestion');
  add(actual,2);add(oracle,2);assert.deepEqual(copies,before);assert.deepEqual([...a],[...b]);assert.deepEqual(value(actual),value(oracle));
});

for(const method of ['fork','constructor','forkForPatch'])test(`${method} seals the parent and retains exact-child COW/adoption`,async()=>{
  const {actual,oracle}=pair(),retained=bucket(actual);
  const a=method==='constructor'?new M.RelationEvidenceStore(actual):actual[method](),b=method==='constructor'?new M.RelationEvidenceStore(oracle):oracle[method]();
  assert.equal(actual.privateCompilerAppend,false);assert.equal(a.privateCompilerAppend,false);assert.equal(a.base,actual);
  add(a,2);add(b,2);assert.equal(retained.length,2);assert.deepEqual(value(actual),value(oracle));assert.deepEqual(value(a),value(b));
  assert(actual.adoptPrivateFork(a,32));assert(oracle.adoptPrivateFork(b,32));const adopted=bucket(actual);add(actual,3);add(oracle,3);assert.equal(adopted.length,3);assert.deepEqual(value(actual),value(oracle));
});

for(const method of ['compactCooperative','compactOrdinaryPatchCooperative','orderDeclarationsCooperative','ensureDeclaredTargetIndexCooperative'])test(`${method} retires append permission before an awaited or standalone result`,async()=>{
  const {actual,oracle}=pair(600);
  if(method==='orderDeclarationsCooperative'){
    const compare=/** Reverse original order without changing declaration identities. */(a,b)=>b.line-a.line;
    assert(await actual[method](compare,allow));assert(await oracle[method](compare,allow));
  }else if(method==='ensureDeclaredTargetIndexCooperative'){
    assert(await actual[method](['frontmatter-ontology'],allow));assert(await oracle[method](['frontmatter-ontology'],allow));
  }else{assert.equal(await actual[method](allow),actual);assert.equal(await oracle[method](allow),oracle);}
  assert.equal(actual.privateCompilerAppend,false);const retained=bucket(actual);add(actual,600);add(oracle,600);assert.equal(retained.length,600);assert.deepEqual(value(actual),value(oracle));
  if(method==='ensureDeclaredTargetIndexCooperative')assert.equal(actual.declaredTargetCount('B','frontmatter-ontology'),oracle.declaredTargetCount('B','frontmatter-ontology'));
});

test('cancelled ordering and index activation preserve originals but still retire append ownership',async()=>{
  for(const method of ['orderDeclarationsCooperative','ensureDeclaredTargetIndexCooperative']){
    const {actual,oracle}=pair(600),retained=bucket(actual);let calls=0;
    const cancel=/** Reject the first actual cooperative slice. */async()=>{calls++;return false;};
    const result=method==='orderDeclarationsCooperative'?await actual[method](/** Stable comparator is irrelevant before the cancelled copy finishes. */(a,b)=>a.line-b.line,cancel):await actual[method](['frontmatter-ontology'],cancel);
    assert.equal(result,false);assert(calls>0);assert.equal(actual.privateCompilerAppend,false);assert.equal(bucket(actual),retained);assert.equal(actual.targetIndex,null);
    add(actual,600);add(oracle,600);assert.equal(retained.length,600);assert.deepEqual(value(actual),value(oracle));
  }
});

const settings={hierarchy:{hidden:['Hidden'],parents:['Parent'],children:['Child'],leftFriends:[],rightFriends:[],previous:['Previous'],next:['Next']},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
/** Prepare actual normalized producer records; no parser or evidence implementation is replaced. */
function compilerFixture(projection='graph',runtime={}){
  const compiler=new M.NormalizedGraphCompiler(settings,{now:/** Work tests never infer elapsed CPU. */()=>0,yield:allow,isCurrent:/** Default fixture remains current. */()=>true,sliceBudgetMs:8,resolverBatchSize:256,...runtime},projection),boundary={generation:M.sourceGeneration('private'),snapshotRevision:M.sourceSnapshotRevision('one')},read=compiler.beginRead(boundary),revision=M.sourceRevision('one');
  const source={id:M.nodeId('owner'),kind:'document',state:'materialized',semanticPath:'A',physicalPath:'A'},target={id:M.nodeId('url'),kind:'url',state:'synthetic',semanticPath:'https://shared.example/path'};
  const records=[{kind:'entity',source,entity:source,sourceRevision:revision,name:'A',url:null},...Array.from({length:300},/** Distinct genuine line locations preserve all originals on one pair. */(_,n)=>({kind:'body-url',source,sourceRevision:revision,target:{entity:target,rawTarget:target.semanticPath,resolvedBy:'url'},label:'Fixed',provenance:{surface:'body',location:{line:n+1}}}))];
  return{compiler,boundary,read,records};
}
/** Close bounded actual source batches before testing the compiler's publication boundary. */
async function ingest(f){for(let start=0,sequence=0;start<f.records.length;start+=256,sequence++)assert(await f.compiler.acceptBatch(f.read,{boundary:f.boundary,sequence,final:start+256>=f.records.length,records:f.records.slice(start,start+256)}));assert(f.compiler.completeRead(f.read,f.boundary));}

test('successful graph and node finalization seal ownership before returning public output',async()=>{
  for(const projection of ['graph','nodes']){
    const f=compilerFixture(projection);await ingest(f);assert.equal(f.compiler.evidence.privateCompilerAppend,true);
    const graph=await f.compiler[projection==='graph'?'finish':'finishNodes']();assert(graph);assert.equal(f.compiler.evidence.privateCompilerAppend,false);
    if(projection==='graph'){const store=graph.legacyEvidence(),retained=store.readPair('A\u0000https://shared.example/path');assert.equal(store,f.compiler.evidence);assert.equal(retained.length,300);store.addPair('A','https://shared.example/path','child',M.RelationType.INFERRED,M.LinkDirection.FROM,{sourceKind:'body-url'});assert.equal(retained.length,300);}
  }
});

test('invalid producer sequence and cancellation revoke private appends terminally',async()=>{
  const invalid=compilerFixture();assert.equal(await invalid.compiler.acceptBatch(invalid.read,{boundary:invalid.boundary,sequence:9,final:true,records:[]}),false);assert.equal(invalid.compiler.evidence.privateCompilerAppend,false);assert.equal(await invalid.compiler.finish(),null);
  let current=true;const cancelled=compilerFixture('graph',{isCurrent:/** Cancel the current compiler without fabricating a successful read. */()=>current});
  assert(await cancelled.compiler.acceptBatch(cancelled.read,{boundary:cancelled.boundary,sequence:0,final:false,records:cancelled.records.slice(0,100)}));assert.equal(cancelled.compiler.evidence.declarationCount,99);assert.equal(cancelled.compiler.evidence.privateCompilerAppend,true);
  current=false;assert.equal(await cancelled.compiler.acceptBatch(cancelled.read,{boundary:cancelled.boundary,sequence:1,final:true,records:cancelled.records.slice(100,200)}),false);assert.equal(cancelled.compiler.evidence.privateCompilerAppend,false);assert.equal(await cancelled.compiler.finish(),null);
});

test('missing required entity or cancellation during finalization cannot leave an appendable output',async()=>{
  const missing=compilerFixture();missing.records.shift();await ingest(missing);assert.equal(await missing.compiler.finish(),null);assert.equal(missing.compiler.evidence.privateCompilerAppend,false);
  let current=true;const cancelled=compilerFixture('graph',{isCurrent:/** Become stale only after ingestion completes. */()=>current});await ingest(cancelled);current=false;assert.equal(await cancelled.compiler.finish(),null);assert.equal(cancelled.compiler.evidence.privateCompilerAppend,false);
});
