/** Private URL adjacency ordering, bounded adoption, stale/consumed views and retention against a native Map oracle. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadPortableModules} from './support/portableTypeScript.mjs';

const {exports:{UrlAdjacencyMap}}=loadPortableModules(['src/index/UrlAdjacencyMap.ts']);

/** Compare every public iterable/read surface without sorting keys or hiding undefined entries. */
function compare(actual,expected){
  assert.equal(actual.size,expected.size);assert.deepEqual([...actual],[...expected]);assert.deepEqual([...actual.keys()],[...expected.keys()]);assert.deepEqual([...actual.values()],[...expected.values()]);
  for(const key of ['a','b','c','d','e',NaN,undefined]){assert.equal(actual.has(key),expected.has(key));assert.equal(actual.get(key),expected.get(key));}
  const entries=[],receiver={};actual.forEach(/** Native callback receives this map and the supplied receiver. */ function(value,key,map){assert.equal(this,receiver);assert.equal(map,actual);entries.push([key,value]);},receiver);assert.deepEqual(entries,[...expected]);
}

test('random mixed forks preserve Map order, shadows, clear, undefined and delete/reinsert',/** Exercise repeated actual immediate-child consumption against independently mutated native storage. */()=>{
  let value=0x12345678;const random=/** Stable operation generation is independent of either Map implementation. */ ()=>{value^=value<<13;value^=value>>>17;value^=value<<5;return value>>>0;};
  const live=new UrlAdjacencyMap(),native=new Map(),keys=['a','b','c','d','e',NaN,undefined];
  for(let trial=0;trial<100;trial++){
    const child=live.fork(),expected=new Map(native);
    for(let n=0;n<30;n++){
      const key=keys[random()%keys.length],operation=random()%20;
      if(operation===0){child.clear();expected.clear();}
      else if(operation<8)assert.equal(child.delete(key),expected.delete(key));
      else{const value=random()%3?random()%100:undefined;child.set(key,value);expected.set(key,value);}
      compare(child,expected);compare(live,native);
    }
    const iterator=child.entries();iterator.next();assert(live.adopt(child,1024));
    native.clear();for(const [key,value] of expected)native.set(key,value);compare(live,native);
    assert.throws(()=>child.get('a'),/Retired/);assert.throws(()=>[...child],/Retired/);
    // A nonempty iterator must reject resumption after consumption; an exhausted iterator is final.
    if(expected.size)assert.throws(()=>iterator.next(),/Retired/);
  }
});

test('exact 1024 replay admission and 1025 immutable fallback never enumerate the parent',/** Distinguish bounded replay from cooperative fallback materialization. */()=>{
  for(const size of [1024,1025]){
    const parent=new UrlAdjacencyMap(),child=parent.fork();for(let n=0;n<size;n++)child.set(n,n);
    const entries=parent.entries;parent.entries=/** Admission and replay must use only changed keys. */ ()=>{throw Error('Parent scan');};
    assert.equal(child.replayCost,size);assert.equal(parent.adopt(child,1024),size===1024);parent.entries=entries;
    if(size===1024){assert.equal(parent.size,size);assert.throws(()=>[...child],/Retired/);}
    else{assert.equal(parent.size,0);child.freezeBase();assert.throws(()=>parent.set('forbidden',1),/Immutable/);assert.equal(child.size,size);const next=child.fork();next.delete(0);next.set(0,-1);assert(child.adopt(next,2));assert.equal([...child.keys()].at(-1),0);}
  }
});

test('stale ancestors and consumed/held iterators cannot observe a subsequently mutated parent',/** Invalid private stages fail closed rather than becoming live views. */()=>{
  const parent=UrlAdjacencyMap.copyOf(new Map([['a',1],['b',2]])),child=parent.fork(),grandchild=child.fork();
  parent.set('c',3);assert.equal(parent.canAdopt(child,1024),false);assert.equal(grandchild.isCurrent(),false);
  assert.throws(()=>child.size,/stale/);assert.throws(()=>grandchild.get('a'),/stale/);
  const valid=parent.fork(),iterator=valid.entries();iterator.next();valid.set('a',9);assert(parent.adopt(valid,1));parent.set('a',10);
  assert.throws(()=>iterator.next(),/Retired/);assert.throws(()=>valid.has('a'),/Retired/);
});

test('clear charges old entries but discards obsolete history after adoption or fallback',/** Huge clear publication stays O(1) through a frozen fallback and releases dead parent retention. */()=>{
  for(const size of [1024,1025]){
    const parent=UrlAdjacencyMap.copyOf(new Map(Array.from({length:size},(_,n)=>[n,n]))),child=parent.fork();child.clear();
    assert.equal(child.replayCost,size);assert.equal(parent.adopt(child,1024),size===1024);
    if(size===1024){assert.equal(parent.size,0);assert.equal(parent.retainedEntries,0);}
    else{child.freezeBase();assert.equal(child.size,0);assert.equal(child.depth,0);assert.equal(child.retainedEntries,0);assert.equal(parent.size,size);assert.throws(()=>parent.delete(0),/Immutable/);}
  }
});

test('cooperative compaction bounds deleted history and cancellation retains every old value',/** A retained-peak map cannot stay reachable indefinitely after large deletion waves. */async()=>{
  const parent=UrlAdjacencyMap.copyOf(new Map(Array.from({length:1000},(_,n)=>[n,n]))),child=parent.fork();for(let n=0;n<800;n++)child.delete(n);
  child.freezeBase();assert(child.needsCompaction(8));let checkpoints=0;
  assert.equal(await child.flattenCooperative(async/** Reject final completion even when fewer than one chunk remains. */()=>{checkpoints++;return false;}),null);assert.equal(checkpoints,1);assert.equal(child.size,200);assert.equal(parent.size,1000);
  const flat=await child.flattenCooperative(async/** Successful bounded owner continuation. */()=>true);compare(flat,new Map(Array.from({length:200},(_,n)=>[n+800,n+800])));assert.equal(flat.depth,0);assert.equal(flat.retainedEntries,200);
});

test('live iterators and forEach preserve native delete, append, reinsert and clear visitation',/** Consumers can mutate the current private layer while iterating without changing Map semantics. */()=>{
  for(const withBase of [false,true])for(const clear of [false,true]){
    const native=new Map([['a',1],['b',2],['c',3]]),root=UrlAdjacencyMap.copyOf(native),actual=withBase?root.fork():root;
    /** Apply the same visitation-triggered mutations without consulting either implementation. */
    const visit=map=>{const seen=[];let first=true;map.forEach((value,key)=>{seen.push([key,value]);if(first){first=false;if(clear)map.clear();else{map.delete('b');map.delete('a');}map.set('d',4);map.set('a',5);}});return seen;};
    assert.deepEqual(visit(actual),visit(native));compare(actual,native);
  }
});

test('random mixed immutable fallback chains preserve native order and every retained parent',/** Exercise overwritten/tombstoned transitive bases as well as immediate private adoption. */async()=>{
  let live=new UrlAdjacencyMap(),native=new Map(),seed=0xabcdef01;const retained=[];
  /** Stable mixed operations exercise both publication decisions without consulting storage state. */
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
  const keys=Array.from({length:32},/** More base keys than local changes retain meaningful shadows. */(_,n)=>'key-'+n);
  for(let trial=0;trial<100;trial++){
    const child=live.fork(),expected=new Map(native);
    for(let n=0;n<15;n++){
      const key=keys[random()%keys.length],operation=random()%47;
      if(operation===0){child.clear();expected.clear();}
      else if(operation<17)assert.equal(child.delete(key),expected.delete(key));
      else{const value=random()%5?random()%100:undefined;child.set(key,value);expected.set(key,value);}
      compare(child,expected);compare(live,native);
    }
    if(random()%2){retained.push([live,[...live]]);child.freezeBase();live=child;}
    else assert(live.adopt(child,1024));
    native=expected;
    if(live.needsCompaction(8)){
      const flat=await live.flattenCooperative(async/** Complete this test-owned private compaction. */()=>true);
      retained.push([live,[...live]]);live.freeze();live=flat;
    }
    compare(live,native);assert(live.depth<=8);
    for(const [parent,entries] of retained)assert.deepEqual([...parent],entries);
  }
});

test('bounded adoption never enumerates either complete logical adjacency',/** A tiny override/reinsert delta over a dense parent cannot become a full child-map replay. */()=>{
  const expected=new Map(Array.from({length:5000},/** Independent native source order. */(_,n)=>[n,n])),parent=UrlAdjacencyMap.copyOf(expected),child=parent.fork();
  child.set(0,undefined);expected.set(0,undefined);child.delete(1);expected.delete(1);child.delete(2);expected.delete(2);child.set(2,-2);expected.set(2,-2);child.set(6000,6);expected.set(6000,6);
  const parentEntries=parent.entries,childEntries=child.entries;
  parent.entries=child.entries=/** Replay owns only local writes, not either logical parent/child view. */()=>{throw Error('Logical adjacency scan during bounded replay');};
  try{assert.equal(child.replayCost,5);assert.equal(parent.adopt(child,4),false);assert.equal(parent.size,5000);assert(parent.adopt(child,5));}
  finally{parent.entries=parentEntries;child.entries=childEntries;}
  compare(parent,expected);assert.throws(/** Consumed stages reject further logical reads. */()=>child.size,/Retired/);
});

test('retired stages release intrinsic backing without changing a retained parent',/** Native storage must not retain values after a consumed or explicitly discarded private lifetime. */()=>{
  const parent=UrlAdjacencyMap.copyOf(new Map([['parent',{keep:true}]])),child=parent.fork();child.set('temporary',{owned:true});child.discard();
  assert.equal(Map.prototype.entries.call(child).next().done,true);assert.equal(parent.size,1);assert.equal(parent.get('parent').keep,true);
  assert.throws(/** Public access to discarded storage stays closed even when native backing was released. */()=>child.get('temporary'),/Retired/);
  const adopted=parent.fork();adopted.set('published',{current:true});assert(parent.adopt(adopted,1));assert.equal(Map.prototype.entries.call(adopted).next().done,true);assert.equal(parent.get('published').current,true);
  parent.discard();assert.equal(Map.prototype.entries.call(parent).next().done,true);
});
