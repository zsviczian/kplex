/**
 * Ordinary sparse evidence maintenance is compared with the unchanged full compactor after every
 * publication. Unsorted original/inverse views, IDs and retained generations are observable; these
 * core-only fixtures also exercise bounded retention, cancellation and activated metadata fallback.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadPortableModules} from './support/portableTypeScript.mjs';
const loaded=loadPortableModules(['src/core/graph/evidence.ts','src/core/graph/relations.ts']);
const M=loaded.exports;
test.after(/** Remove only this test's emitted modules. */()=>loaded.cleanup());
/** Reuse the core's ordinary declaration API, including directional Hidden and physical provenance. */
function add(store,source='A',target='Hub',role='child',provenance={}){
  store.addDeclaration(source,target,role,M.RelationType.DEFINED,M.LinkDirection.TO,{sourceKind:'frontmatter-ontology',fieldName:'Child',rawValue:'[[Hub]]',...provenance});
}
/** Replace exactly one unordered pair, retaining all other declaration positions. */
function replace(store,source='A',target='Hub',role='parent',provenance={}){
  store.removeDeclarationsTouching(source,/** Match only this controlled target pair. */item=>item.declaredTargetPath===target);
  add(store,source,target,role,provenance);
}
/** Root evidence has multiple unrelated positions and a common endpoint. */
function root(count=40){const store=new M.RelationEvidenceStore();for(let n=0;n<count;n++)add(store,`Owner-${n}`);add(store);return store;}
/** Snapshot every ordered public evidence view, without sorting or normalizing away IDs. */
function snapshot(store){
  const declarations=[...store.declarations()],paths=new Set(declarations.flatMap(/** Both source perspectives must retain path-key order. */item=>[item.declaredByPath,item.declaredTargetPath]));
  return {declarations,entries:[...store.entries()],paths:[...paths].map(/** Include empty/inverse Hidden behavior and lazy touching iteration. */path=>[path,store.from(path),store.declarationsTouching(path)]),pairs:store.pairCount,count:store.declarationCount,nextId:store.nextId};
}
/** Eligibility fixtures preserve an unchanged standalone anchor and at least one positive override. */
function staged({pairs=1,oldRecords=1,newRecords=1,layers=8,rawValue='x',oldRawValue='x'}={}){
  const anchor=new M.RelationEvidenceStore();for(let n=0;n<pairs;n++)for(let i=0;i<oldRecords;i++)add(anchor,`S${n}`,'Hub','child',{rawValue:oldRawValue});
  let store=anchor;for(let n=0;n<layers;n++)store=store.fork();
  for(let n=0;n<pairs;n++){store.removeDeclarationsTouching(`S${n}`,/** Each source owns one exact pair. */()=>true);for(let i=0;i<newRecords;i++)add(store,`S${n}`,'Hub','parent',{rawValue});}
  return {anchor,store};
}
/** Apply the original eight-patch maintenance cadence to both representations. */
async function step(pair,operation){
  if(pair.actual.depth>=8){pair.actual=await pair.actual.compactOrdinaryPatchCooperative(async()=>true);pair.oracle=await pair.oracle.compactCooperative(async()=>true);assert(pair.actual&&pair.oracle);}
  pair.actual=pair.actual.forkForPatch();pair.oracle=pair.oracle.fork();
  operation(pair.actual);operation(pair.oracle);
  assert.equal(pair.actual.depth,pair.oracle.depth,'Sparse head folding preserves the original maintenance epoch');
  assert(pair.actual.depth<=8);assert.deepEqual(snapshot(pair.actual),snapshot(pair.oracle));
}

test('stable replacements copy a bounded positive set and preserve ordinary/public fork contracts',async()=>{
  const {anchor,store}=staged();const before=snapshot(store),anchorBefore=snapshot(anchor);
  const compact=await store.compactOrdinaryPatchCooperative(async()=>true);
  assert.equal(compact.base,anchor);assert.equal(compact.depth,1);assert.equal(compact.byPair.size,1);assert.equal(compact.targetIndex,null);
  assert.deepEqual(snapshot(compact),before);assert.deepEqual(snapshot(anchor),anchorBefore);
  const standalone=await compact.compactCooperative(async()=>true);assert.equal(standalone.base,null);assert.equal(standalone.depth,0);assert.deepEqual(snapshot(standalone),before);
  const publicFork=compact.fork();assert.equal(publicFork.base,compact);assert.equal(publicFork.depth,2);
  const patch=compact.forkForPatch();assert.equal(patch.base,anchor);assert.equal(patch.depth,1);
  replace(patch,'S0','Hub','hidden');assert.deepEqual(snapshot(compact),before);assert.deepEqual(snapshot(anchor),anchorBefore);
  assert.notEqual(patch.pairsByPath.get('Hub'),compact.pairsByPath.get('Hub'),'Path sets are private even when bucket arrays can be shared');
  const immediate=compact.fork();add(immediate,'fresh');assert(compact.adoptPrivateFork(immediate,32));
  assert.equal(compact.forkForPatch().base,compact,'A public write retires bounded-head folding authorization');
});

test('delete/re-add across maintenance epochs keeps the full-compactor insertion order',async()=>{
  const pair={actual:root(),oracle:root()},retained=[];
  for(let n=0;n<40;n++){
    if(n===8||n===16)retained.push([pair.actual,snapshot(pair.actual)]);
    await step(pair,/** A sparse completion at8 must not advance the next tombstone compaction to15. */store=>{
      if(n===9)store.removeDeclarationsTouching('Owner-0',()=>true);
      else if(n===15)add(store,'Owner-0');
      else replace(store,'A','Hub',n%2?'child':'parent');
    });
  }
  for(const [store,value]of retained)assert.deepEqual(snapshot(store),value);
});

test('mixed positive edits, multiplicity, Hidden, dates, endpoint deletion and rename match full maintenance',async()=>{
  const pair={actual:root(16),oracle:root(16)},retained=[];let random=0x153e2;
  for(let n=0;n<320;n++){
    random=(Math.imul(random,1664525)+1013904223)>>>0;
    const source=`Owner-${random%24}`,choice=(random>>>8)%7;
    if(n%31===0)retained.push([pair.actual,snapshot(pair.actual)]);
    await step(pair,/** Fixed deterministic choices exercise ordering without relying on implementation internals. */store=>{
      if(choice===0)store.removeDeclarationsTouching(source,()=>true);
      else if(choice===1)store.renamePath(source,`Owner-${(random>>>16)%24}`);
      else if(choice===2)add(store,source,'Hub','hidden',{sourceKind:'inline-ontology',line:n,start:n*2,end:n*2+1});
      else if(choice===3)add(store,source,'Hub','previous',{sourceKind:'date-property',rawValue:'2026-10-14'});
      else replace(store,source,'Hub',choice%2?'child':'parent');
    });
  }
  for(const [store,value]of retained)assert.deepEqual(snapshot(store),value);
});

test('pair, retained-record and depth bounds select sparse or unchanged standalone fallback',async()=>{
  for(const [options,eligible]of [[{pairs:32},true],[{pairs:33},false],[{oldRecords:128,newRecords:128},true],[{oldRecords:128,newRecords:129},false],[{layers:8},true],[{layers:9},false]]){
    const {store}=staged(options),before=snapshot(store),result=await store.compactOrdinaryPatchCooperative(async()=>true);
    assert.equal(result.base!==null,eligible,JSON.stringify(options));assert.deepEqual(snapshot(result),before);assert.deepEqual(snapshot(store),before);
  }
});

test('maximum bounded layer keys never enumerate the unrelated anchor graph',async()=>{
  const anchor=root(4096);let store=anchor;
  for(let layer=0;layer<8;layer++){store=store.fork();for(let n=0;n<32;n++)replace(store,`Owner-${n}`,'Hub',layer%2?'child':'parent');}
  const iterator=anchor.byPair[Symbol.iterator];anchor.byPair[Symbol.iterator]=/** The sparse path may read selected anchor buckets, never enumerate the full root. */function(){throw Error('Unexpected root scan');};
  let compact;try{compact=await store.compactOrdinaryPatchCooperative(async()=>true);}finally{anchor.byPair[Symbol.iterator]=iterator;}
  assert.equal(compact.base,anchor);assert.equal(compact.byPair.size,32);assert.deepEqual(snapshot(compact),snapshot(store));
});

test('scalar payload bound includes overwritten anchor records and refuses future non-scalar data',async()=>{
  const seed=staged({rawValue:'',oldRawValue:''});
  const bytes=[...seed.store.byPair.values(),...seed.anchor.byPair.values()].flat().reduce(/** Match only the declared UTF16 scalar-string budget, not heap or IDB size. */(sum,item)=>sum+Object.values(item).filter(value=>typeof value==='string').reduce((total,value)=>total+value.length*2,0),0);
  const padding=(65536-bytes)/2;assert(Number.isInteger(padding));
  for(const [rawValue,oldRawValue,eligible]of [['x'.repeat(padding),'',true],['x'.repeat(padding+1),'',false],['','x'.repeat(padding+1),false]]){
    const {store}=staged({rawValue,oldRawValue});const result=await store.compactOrdinaryPatchCooperative(async()=>true);assert.equal(result.base!==null,eligible);assert.deepEqual(snapshot(result),snapshot(store));
  }
  const {store}=staged();[...store.byPair.values()][0][0].future={value:1};
  const result=await store.compactOrdinaryPatchCooperative(async()=>true);assert.equal(result.base,null);assert.deepEqual(snapshot(result),snapshot(store));
});

test('tombstones, empty history and active facts retain the original full compactor',async()=>{
  for(const scenario of ['tombstone','anchor-tombstone','empty','active-current','active-parent']){
    let {anchor,store}=staged();
    if(scenario==='tombstone')store.removeDeclarationsTouching('S0',()=>true);
    if(scenario==='anchor-tombstone'){add(anchor,'deleted');const deletion=anchor.fork();deletion.removeDeclarationsTouching('deleted',()=>true);assert(anchor.adoptPrivateFork(deletion,32));}
    if(scenario==='empty'){store=anchor;for(let n=0;n<8;n++)store=store.fork();}
    if(scenario.startsWith('active'))assert(await(scenario==='active-current'?store:anchor).ensureDeclaredTargetIndexCooperative(['frontmatter-ontology'],async()=>true));
    const result=await store.compactOrdinaryPatchCooperative(async()=>true);assert.equal(result.base,null,scenario);assert.deepEqual(snapshot(result),snapshot(store));
  }
});

test('repeated sparse maintenance retains one unchanged anchor and bounded current overrides',async()=>{
  let store=root(2048);const anchor=store,original=snapshot(anchor);let completions=0;
  for(let n=0;n<256;n++){
    if(store.depth>=8){store=await store.compactOrdinaryPatchCooperative(async()=>true);assert.equal(store.base,anchor);assert.equal(store.byPair.size,1);completions++;}
    store=store.forkForPatch();replace(store,'A','Hub',n%2?'child':'parent');
    let layers=0;for(let current=store;current.base;current=current.base)layers++;
    assert(layers<=8);assert.equal(store.targetIndex,null);
  }
  assert.equal(completions,31);assert.deepEqual(snapshot(anchor),original);
});

test('dense eligible copying yields and cancellation cannot publish a partial bucket',async()=>{
  const {store}=staged({oldRecords:0,newRecords:256}),before=snapshot(store);let calls=0;
  assert.equal(await store.compactOrdinaryPatchCooperative(async()=>{calls++;return false;}),null);assert.equal(calls,1);assert.deepEqual(snapshot(store),before);
  calls=0;const result=await store.compactOrdinaryPatchCooperative(async()=>{calls++;return true;});assert.equal(calls,2);assert(result.base);assert.deepEqual(snapshot(result),before);
});

test('final sparse checkpoint rejects cancellation and reentrant mutations or fact activation',async()=>{
  for(const scenario of ['cancel','own','parent','activate']){
    const {anchor,store}=staged(),before=snapshot(store),anchorBefore=snapshot(anchor);let calls=0;
    const result=await store.compactOrdinaryPatchCooperative(/** Even one copied record must reach the final cancellation/finality boundary. */async()=>{
      calls++;if(scenario==='cancel')return false;
      if(scenario==='activate')await anchor.ensureDeclaredTargetIndexCooperative(['frontmatter-ontology'],async()=>true);
      else add(scenario==='own'?store:anchor,'intervening');return true;
    });
    assert.equal(result,null,scenario);assert.equal(calls,1);
    if(scenario==='cancel'||scenario==='activate'){assert.deepEqual(snapshot(store),before);assert.deepEqual(snapshot(anchor),anchorBefore);}
  }
});

test('activation after sparse completion survives bounded folding and retains exact counts',async()=>{
  const {store}=staged(),compact=await store.compactOrdinaryPatchCooperative(async()=>true);
  assert(await compact.ensureDeclaredTargetIndexCooperative(['frontmatter-ontology'],async()=>true));
  const before=snapshot(compact),child=compact.forkForPatch();add(child,'new');replace(child,'S0','Hub','hidden');
  assert.deepEqual(snapshot(compact),before);assert.equal(child.declaredTargetCount('Hub','frontmatter-ontology'),2);
  const selected=[];assert(await child.visitDeclaredTargetKindCooperative('Hub','frontmatter-ontology',item=>selected.push(item),async()=>true));
  assert.deepEqual(selected,[...child.declarations()]);
  const full=await child.compactOrdinaryPatchCooperative(async()=>true);assert.equal(full.base,null);assert.deepEqual(snapshot(full),snapshot(child));
});
