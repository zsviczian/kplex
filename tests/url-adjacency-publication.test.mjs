/** Production URL adjacency ownership, display retention and bounded atomic admission; finite host facts use the actual compiler/builder/index. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {contributorBrowserBundle} from './support/contributorBrowserFixture.mjs';
import {urlPublicationFixture} from './support/urlPublicationFixture.mjs';

const bundle=await contributorBrowserBundle(['src/index/GraphIndex.ts','src/index/GraphBuilder.ts','src/index/UrlAdjacencyMap.ts']);
const target='https://shared.example/path';

/** Create only native facts; URL parsing and exactly-once publication stay in production owners. */
async function append(f,path){const record=f.add(path,`[Fixed](${target})`);await f.index.publishUrlOwner(record.file,record.body,0,undefined,true);return record;}

/** Construct an actual builder with one explicit cancellation source. */
function builder(f,current=/** Default fixture facts remain current until explicit cancellation. */()=>true){const i=f.index;return new f.M.GraphBuilder(i.plugin,i.app,new Map(),i.metadataParser,i.indexedDb,current);}

test('display maps and target maps exclude unflushed work; current targets retain no old generation chain',/** Check each display boundary and retained map rather than merely evidence pointer inequality. */async()=>{
  const f=urlPublicationFixture(bundle),i=f.index;
  try{
    await append(f,'First.md');i.flushUrlPublication();
    const first=i.publishedUrlState.pages.get(target),map=first.neighbours,entries=[...map],source=i.publishedUrlState.pages.get('First.md');
    const facade=source.neighbours.get(target).target,facadeMap=facade.neighbours;
    assert.notEqual(facade,i.urlState.pages.get(target));assert.equal(facadeMap,map);
    for(let n=0;n<64;n++){
      const live=i.urlState.pages.get(target).neighbours;
      await append(f,`Next-${n}.md`);
      assert.equal(i.urlState.pages.get(target).neighbours,live,'Only proven private working maps adopt');
      assert.equal(first.neighbours,map);assert.deepEqual([...map],entries);
      if(n%8!==7){assert.equal(facade.neighbours,facadeMap===map&&n<8?map:i.publishedUrlState.pages.get(target).neighbours);}
      else{
        i.flushUrlPublication();assert.equal(source.neighbours.get(target).target,facade);
        const reachable=new Set();
        for(const page of i.publishedUrlState.pages.values()){
          reachable.add(page.neighbours);
          for(const relation of page.neighbours.values()){
            const value=relation.target;assert.notEqual(value,i.urlState.pages.get(value.path));
            assert.equal(value,i.urlPublishedTargets.get(value.path));
            assert.equal(value.neighbours,i.publishedUrlState.pages.get(value.path).neighbours);
            assert.equal(value.neighbours instanceof f.M.UrlAdjacencyMap,false);reachable.add(value.neighbours);
          }
        }
        assert.equal(reachable.size,i.publishedUrlState.pages.size,'Current graph retains one displayed map per path');
        assert.equal(i.urlPublishedTargets.size,i.publishedUrlState.pages.size);
      }
    }
    assert.equal(first.neighbours,map);assert.deepEqual([...map],entries);assert.deepEqual([...facadeMap],entries);
    const oldCount=i.urlPublishedTargets.size;await i.retireUrlOwner('Next-63.md');
    assert.equal(i.urlPublishedTargets.size,oldCount-1);
  }finally{f.close();}
});

test('flush during preparation rejects adoption and freezes the exact fallback parent',/** A live capability validates both working and presentation revision at synchronous commit. */async()=>{
  const f=urlPublicationFixture(bundle),i=f.index;
  try{
    await append(f,'First.md');const parent=i.urlState.pages.get(target).neighbours,capability=i.captureUrlAdjacencyPrivacy();
    const b=builder(f),next=f.add('Second.md',`[Fixed](${target})`);
    assert(await b.patchUrlReferences(i.urlState,next.file,next.body,/** Interleave publication after all private preparation. */(_,publish)=>{i.flushUrlPublication();publish();},undefined,undefined,capability));
    const current=i.urlState.pages.get(target).neighbours;
    assert.notEqual(current,parent);assert.equal(parent.has('Second.md'),false);assert.equal(current.has('Second.md'),true);
    assert.throws(()=>parent.delete('First.md'),/Immutable/);
    const fork=current.fork();fork.set('changed',fork.get('First.md'));assert(current.adopt(fork,1));assert.equal(parent.has('changed'),false);
  }finally{f.close();}
});

for(const sizes of [[1024,1],[1025,1],[512,512]])test(`atomic replay is a total 1024-key budget across pages: ${sizes}`,/** Both fallback maps preserve retained parents without widening synchronous admission. */()=>{
  const f=urlPublicationFixture(bundle),i=f.index,b=builder(f);
  try{
    const parents=sizes.map(/** Seed isolated owned URL roots; no ownership is inferred from container type. */(_,n)=>{const p=b.createPage({path:`https://budget.example/${n}`,url:`https://budget.example/${n}`,name:'Budget'});p.neighbours=new f.M.UrlAdjacencyMap();b.addPage(i.urlState,p);return p.neighbours;});
    const staged=b.createPatchState(i.urlState,true,true,true),children=sizes.map(/** Prepare independently ordered changed-key sets before the atomic publisher. */(size,n)=>{const p=staged.pages.get(`https://budget.example/${n}`);for(let x=0;x<size;x++)p.neighbours.set(String(x),{target:p});return p.neighbours;});
    b.commitPatchState(i.urlState,staged,undefined,/** This fixture explicitly owns all working maps. */()=>true);
    const firstAdopted=sizes[0]<=1024,secondAdopted=sizes[1]<=1024-(firstAdopted?sizes[0]:0);
    for(let n=0;n<2;n++){
      const adopted=n?secondAdopted:firstAdopted,map=i.urlState.pages.get(`https://budget.example/${n}`).neighbours;
      assert.equal(map===parents[n],adopted);assert.equal(map.size,sizes[n]);
      if(adopted)assert.throws(()=>children[n].size,/Retired/);
      else{assert.equal(parents[n].size,0);assert.throws(()=>parents[n].set('late',{}),/Immutable/);}
    }
  }finally{f.close();}
});

test('ordinary Markdown stages and unknown native URL maps preserve copy ownership',/** The new capability never changes ordinary staging or mutates an externally retained native base. */async()=>{
  const f=urlPublicationFixture(bundle),i=f.index,b=builder(f);
  try{
    await append(f,'First.md');const page=i.urlState.pages.get(target),native=new Map(page.neighbours);page.neighbours=native;
    const stage=b.createPatchState(i.urlState),ordinary=stage.pages.get(target).neighbours;
    assert.notEqual(ordinary,native);assert.equal(ordinary instanceof f.M.UrlAdjacencyMap,false);
    await append(f,'Second.md');assert.equal(native.has('Second.md'),false);assert.notEqual(page.neighbours,native);
    assert.equal(page.neighbours instanceof f.M.UrlAdjacencyMap,true);
    assert.equal(i.urlState.pages.get('Second.md').neighbours instanceof f.M.UrlAdjacencyMap,false);
  }finally{f.close();}
});

test('cancelled private preparation retires child wrappers without changing parent adjacency',/** Cancellation before canonical commit cannot leave a readable child of subsequently mutable storage. */async()=>{
  const f=urlPublicationFixture(bundle),i=f.index;
  try{
    await append(f,'First.md');const parent=i.urlState.pages.get(target).neighbours,retained=[...parent];let current=true,stage;
    const b=builder(f,/** One test-owned cancellation boundary. */()=>current),create=b.createPatchState;
    b.createPatchState=/** Capture a private stage without replacing any semantic operation. */function(...args){stage=create.apply(this,args);return stage;};
    const prune=b.pruneUnusedUrlNodesCooperative;
    b.pruneUnusedUrlNodesCooperative=/** Cancel only after normal private resolution has completed. */async function(...args){const result=await prune.apply(this,args);current=false;return result;};
    const next=f.add('Cancelled.md',`[Fixed](${target})`);
    assert.equal(await b.patchUrlReferences(i.urlState,next.file,next.body,/** A cancelled preparation must never call its publisher. */()=>{throw Error('Late publish');},undefined,undefined,i.captureUrlAdjacencyPrivacy()),null);
    assert.equal(i.urlState.pages.get(target).neighbours,parent);assert.deepEqual([...parent],retained);
    assert.throws(()=>stage.pages.get(target).neighbours.size,/Retired/);
  }finally{f.close();}
});

test('a stale later child rejects the whole publication before the first canonical page changes',/** Atomic preflight must finish before any bounded replay or identity publication occurs. */()=>{
  const f=urlPublicationFixture(bundle),i=f.index,b=builder(f);
  try{
    const pages=[0,1].map(/** Give two independently owned bases one existing key each. */n=>{const p=b.createPage({path:`https://stale.example/${n}`,url:`https://stale.example/${n}`,name:'Before'});p.neighbours=new f.M.UrlAdjacencyMap();p.neighbours.set('old',{target:p});b.addPage(i.urlState,p);return p;});
    const staged=b.createPatchState(i.urlState,true,true,true),first=staged.pages.get(pages[0].path),second=staged.pages.get(pages[1].path);
    first.name='After';first.neighbours.set('new',{target:first});second.neighbours.set('new',{target:second});pages[1].neighbours.set('intervening',{target:pages[1]});
    assert.throws(()=>b.commitPatchState(i.urlState,staged,undefined,/** Privacy cannot authorize a stale child. */()=>true),/Stale/);
    assert.equal(pages[0].name,'Before');assert.equal(pages[0].neighbours.has('new'),false);
    b.disposeUrlAdjacency(i.urlState,staged);
  }finally{f.close();}
});

test('aliased parent maps reject both adoptions before any live map changes',/** Unknown cross-page sharing must not let the first replay invalidate the second prepared child. */()=>{
  const f=urlPublicationFixture(bundle),i=f.index,b=builder(f);
  try{
    const parent=new f.M.UrlAdjacencyMap(),pages=[0,1].map(/** Deliberately violate normal one-owner allocation to test closed admission. */n=>{const p=b.createPage({path:`https://alias.example/${n}`,url:`https://alias.example/${n}`,name:'Alias'});p.neighbours=parent;b.addPage(i.urlState,p);return p;});
    const staged=b.createPatchState(i.urlState,true,true,true);
    for(const p of pages)staged.pages.get(p.path).neighbours.set(p.path,{target:p});
    b.commitPatchState(i.urlState,staged,undefined,/** Container identity cannot make aliased parents exclusively owned. */()=>true);
    assert.equal(parent.size,0);assert.throws(()=>parent.set('late',{}),/Immutable/);
    assert.notEqual(pages[0].neighbours,parent);assert.notEqual(pages[1].neighbours,parent);
    assert.equal(pages[0].neighbours.size,1);assert.equal(pages[1].neighbours.size,1);
  }finally{f.close();}
});

test('private fallback depth is compacted cooperatively; cancellation retains the exact live base',/** Exercise the actual builder compaction owner with a ninth layer and more than one 256-entry chunk. */async()=>{
  const f=urlPublicationFixture(bundle),i=f.index;let current=true,checkpoints=0;
  const b=builder(f,/** Own the lifetime without changing compiler or graph semantics. */()=>current);
  try{
    const page=b.createPage({path:target,url:target,name:'Dense'});page.neighbours=new f.M.UrlAdjacencyMap();
    for(let n=0;n<1025;n++)page.neighbours.set(String(n),{target:page});b.addPage(i.urlState,page);
    for(let n=0;n<8;n++){
      const staged=b.createPatchState(i.urlState,true,true,true);staged.pages.get(target).neighbours.set(`extra-${n}`,{target:page});
      b.commitPatchState(i.urlState,staged,undefined,/** Retained ownership deliberately rejects mutation of all previous generations. */()=>false);
    }
    const base=page.neighbours,old=[...base],stage=b.createPatchState(i.urlState,true,true,true),child=stage.pages.get(target).neighbours;
    child.set('last',{target:page});assert.equal(child.depth,9);
    b.yieldToHost=/** Cancel on the first real compaction chunk. */async force=>{assert.equal(force,true);checkpoints++;current=false;return false;};
    assert.equal(await b.compactUrlAdjacency(stage),false);assert.equal(checkpoints,1);assert.equal(page.neighbours,base);assert.deepEqual([...base],old);
    b.disposeUrlAdjacency(i.urlState,stage);assert.throws(()=>child.size,/Retired/);
    current=true;checkpoints=0;const retry=b.createPatchState(i.urlState,true,true,true);retry.pages.get(target).neighbours.set('last',{target:page});
    b.yieldToHost=/** Count chunk boundaries, including final completion, without manufacturing elapsed time. */async force=>{assert.equal(force,true);checkpoints++;return true;};
    assert.equal(await b.compactUrlAdjacency(retry),true);assert.equal(checkpoints,5);
    b.commitPatchState(i.urlState,retry,undefined,/** Publish the privately flattened replacement rather than adopting an unrelated root. */()=>true);
    assert.equal(page.neighbours.depth,0);assert.deepEqual([...base],old);assert.equal(page.neighbours.size,1034);
  }finally{f.close();}
});

test('ordinary publication retains one canonical-page pass and does not enter URL admission preflight',/** An isolated URL optimization must not add two whole touched-page scans to ordinary patches. */()=>{
  const f=urlPublicationFixture(bundle),i=f.index,b=builder(f);
  try{
    const page=b.createPage({path:'Ordinary.md',name:'Before'});b.addPage(i.urlState,page);
    const staged=b.createPatchState(i.urlState);staged.pages.get(page.path).name='After';
    const entries=staged.pages.existingLocalEntries;let passes=0;
    staged.pages.existingLocalEntries=/** Count actual canonical-entry traversal without changing yielded values. */function*(){passes++;yield* entries.call(this);};
    b.commitPatchState(i.urlState,staged);
    assert.equal(passes,1);assert.equal(page.name,'After');assert.equal(page.neighbours instanceof f.M.UrlAdjacencyMap,false);
  }finally{f.close();}
});

for(const operation of ['delete','clear','replace'])test(`discarded URL stage retires its private map on ${operation}`,/** Pruned values must release ownership even when absent from the final local-entry disposal pass. */async()=>{
  const f=urlPublicationFixture(bundle),i=f.index,b=builder(f);
  try{
    await append(f,'First.md');const base=i.urlState.pages.get(target).neighbours,old=[...base],stage=b.createPatchState(i.urlState,true,true,true),page=stage.pages.get(target),map=page.neighbours;
    if(operation==='delete')stage.pages.delete(target);
    else if(operation==='clear')stage.pages.clear();
    else stage.pages.set(target,b.createPage({path:target,url:target,name:'Replacement'}));
    assert.throws(()=>map.size,/Retired/);assert.deepEqual([...base],old);
    b.disposeUrlAdjacency(i.urlState,stage);
    const child=base.fork();child.set('later',child.get('First.md'));assert(base.adopt(child,1));assert.throws(()=>map.get('later'),/Retired/);
  }finally{f.close();}
});
