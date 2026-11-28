/** Immutable pre-extraction Classic outputs complement the existing semantic/layout/interaction suites. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {plexViewModules,classicFixture,classicGeometrySnapshot} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/core/plex/views/classic/projection.ts','src/core/plex/views/classic/definition.ts']);

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

test('Compass projection and geometry stay scoped on a 5,000-node publication fixture',()=>{
  const ids=Array.from({length:5000},(_,i)=>`pub:${String(i).padStart(4,'0')}`);
  const nodes=new Map(ids.map((id,i)=>[id,{id,label:i%2?'Repeated label':'長い label with a near duplicate name'}]));
  const visits=new Set(),idsRead=new Set();
  const center=ids[1000],children=ids.slice(2000,2072);
  const read={coverage:'local',isCurrent:()=>true,
    node:id=>{idsRead.add(id);return nodes.get(id)??null;},compare:(a,b)=>a.id.localeCompare(b.id),
    relations:(id,role)=>{visits.add(id);return id===center&&role==='child'
      ? {coverage:'local',truncated:false,items:children.map(target=>({node:nodes.get(target),role:'child',relationType:1,definition:'Contains',direction:1}))}
      : {items:[],coverage:'local',truncated:false};},
    evidence:()=>({coverage:'unavailable',value:null}),corpus:{available:false,reason:'unsupported'}};
  const definition=M.classicViewDefinition;
  const projection=definition.project({attention:center,read,maximum:32,state:{renderSiblings:false},configuration:{status:'available',values:{}}});
  assert.equal(projection.attention,center);
  assert.equal(projection.truncated,true);
  assert.deepEqual(projection.occurrences.map(row=>row.nodeId),[center,...children.slice(0,32)]);
  assert.deepEqual(projection.edges.map(row=>[row.sourceNode,row.targetNode,row.sourcePort,row.targetPort]),
    children.slice(0,32).map(id=>[center,id,'bottom','top']));
  const measured=projection.occurrences.map(row=>({id:row.id,width:160,height:48,expandedWidth:160,expandedReserve:0}));
  const layout=definition.layout(projection,measured,M.migrateAndMergeSettings({}));
  assert.equal(layout.positions.size,33);
  assert([...layout.positions.values()].every(node=>Number.isFinite(node.x)&&Number.isFinite(node.y)));
  assert.deepEqual([...idsRead],[center,...children.slice(0,32)]);
  assert.deepEqual([...visits],[center,...children.slice(0,32)]);
});
