/** Immutable pre-extraction Classic outputs complement the existing semantic/layout/interaction suites. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {plexViewModules,classicFixture,classicGeometrySnapshot} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/core/plex/views/classic/projection.ts']);

test('Classic preserves ordered caps, occupied exclusions and defined sibling precedence',()=>{
  const f=classicFixture(M),n=f.neighborhood;
  assert.equal(n.center,f.pages.get('root'));
  assert.deepEqual(Object.fromEntries(['parents','children','leftFriends','rightFriends','siblings'].map(key=>[key,n[key].map(r=>r.page.path)])),
    {parents:['p2','p1'],children:['c1','c2'],leftFriends:['l','prev'],rightFriends:['r','next'],siblings:['s1','s2']});
  assert.deepEqual(n.siblings.map(r=>[r.role,r.relationType]),[['sibling',1],['sibling',1]]);
  // Six center roles plus six roles for each of the eight admitted direct witnesses.
  assert.equal(f.work.neighbours,54);assert.equal(f.work.counts,0);assert.equal(f.work.title,0);
  f.index.plugin.settings.renderSiblings=false;
  assert.deepEqual(M.GraphIndex.prototype.getNeighborhood.call(f.index,'root').siblings,[]);
  assert.equal(M.GraphIndex.prototype.getNeighborhood.call(f.index,'missing'),null);
});

test('second-order projection traverses every role and never repeats the center or direct nodes',()=>{
  const pages=new Map(),page=id=>{if(!pages.has(id))pages.set(id,{id});return pages.get(id)};
  const roles=['parent','child','left','right','previous','next'],rows=new Map();
  const row=(id,role,relationType=1)=>({page:page(id),role,relationType});
  roles.forEach((role,i)=>{
    rows.set('focus:'+role,[row('direct'+i,role)]);
    roles.forEach((next,j)=>rows.set('direct'+i+':'+next,[row('focus',next),row('direct'+j,next),row('second'+i+j,next)]));
  });
  const read={identity:p=>p.id,neighbours:(p,r)=>rows.get(p.id+':'+r)??[],sort:rs=>rs.sort((a,b)=>a.page.id.localeCompare(b.page.id))};
  const n=M.projectClassicNeighborhood(page('focus'),read,100,true);
  assert.equal(n.siblings.length,36);assert(n.siblings.every(r=>r.page.id.startsWith('second')));
  const expanded=M.excludeClassicSiblingOccurrences(n,p=>p.id,new Set(roles.map((_,i)=>'second'+i+'1')));
  assert.equal(expanded.siblings.length,30,'Children already displayed in expanded strips do not repeat in the sibling area');
  const admitted=M.classicExpandedChildren(page('direct0'),page('focus'),read,1,row=>row.page.id.startsWith('second'));
  assert.deepEqual(admitted.map(row=>row.page.id),['second01'],'Filtering precedes the child cap and always excludes the center');
  assert.deepEqual(M.projectClassicNeighborhood(page('focus'),read,2,false).siblings,[]);
});

test('hidden descendant strips and an editor-owned witness cannot erase peripheral nodes',()=>{
  const f=classicFixture(M),settings={...f.settings,graphDepth:2};
  const hidden=M.buildScene(f.neighborhood,{...f.index,expandedChildren:()=>[]},settings,false);
  assert.deepEqual(hidden.nodes.filter(node=>node.role==='sibling').map(node=>node.page.path),['s1','s2']);
  const p=f.pages.get('p2'),editor={page:p,binding:{occurrenceId:JSON.stringify(['classic-editor','root','parent','p2']),dimensions:{width:350,height:180}}};
  const read={...f.index,neighbours:(page,role)=>page.path==='p2'?f.index.neighbours(page,role):[]};
  const edited=M.buildScene(f.neighborhood,read,settings,false,undefined,false,editor,false);
  assert.deepEqual(edited.nodes.filter(node=>node.role==='sibling').map(node=>node.page.path),['s1','s2']);
});

test('Classic geometry matches the accepted pre-extraction matrix exactly',()=>{
  const expected=JSON.parse(readFileSync(new URL('./fixtures/plex-views/classic-geometry.json',import.meta.url),'utf8'));
  assert.deepEqual(JSON.parse(JSON.stringify(classicGeometrySnapshot(M))),expected);
});
