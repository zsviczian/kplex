/** Preset-scoped presentation contracts use real projection/layout/validation and measured
 * geometry. Explicit cache-only graph facts never provide acquisition or mutation capabilities. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {plexViewModules} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/core/plex/views/facets/projection.ts','src/core/plex/views/facets/layout.ts',
 'src/core/plex/views/facets/templates.ts','src/core/plex/views/facets/configuration.ts','src/core/plex/views/configuration.ts',
 'src/core/plex/views/facets/validation.ts','src/core/contracts/areaGeometry.ts','src/ui/plexViews/nodeConnections.ts','src/ui/plexViews/areaVisibility.ts']);

/** Distinct native statuses cover assigned and every central fallback without inferring membership. */
function fixture(preset, value={status:'available',value:'water'}, state={version:1,preset:'custom'}){
 const nodes=new Map(['Focus','Child','Other'].map(id=>[id,{id,kind:'document',state:'materialized',file:{extension:'md'}}]));
 const read={coverage:'cached',isCurrent:()=>true,node:id=>nodes.get(id),compare:(a,b)=>a.id.localeCompare(b.id),
  relations:(id,role)=>({items:id==='Focus'&&role==='child'?['Child','Other'].map(id=>({node:nodes.get(id),role,relationType:1,direction:1})):[],coverage:'cached',truncated:false}),
  properties:{availability:()=> 'available',read:id=>id==='Focus'?value:{status:'available',value:'water'}},scope:()=>({pending:value.pending===true})};
 const configuration=M.readViewConfiguration({id:'wuxing',configuration:M.facetsConfigurationSchema},{wuxing:{version:2,values:{presets:{custom:preset}}}});
 const projection=M.projectFacets({attention:'Focus',maximum:20,state,configuration,read});assert(projection);
 const measured=projection.occurrences.map(row=>({id:row.id,width:row.id===projection.entry?190:140,height:row.id===projection.entry?50:30,
  expandedWidth:190,expandedReserve:0,mini:null,envelope:null,...(row.badge?{badge:{width:120,height:24}}:{})}));
 return {projection,measured,layout:()=>M.layoutFacets(projection,measured,'custom',preset)};
}

for(const focusInCategory of [false,true])for(const centerAnchoredLinks of [false,true]){
 test(`independent preset presentation (${focusInCategory}/${centerAnchoredLinks}) keeps one logical attention and unchanged edges`,()=>{
  const preset={...M.FACET_TEMPLATES.wuxing,focusInCategory,centerAnchoredLinks},f=fixture(preset),p=f.projection;
  const focus=p.occurrences.find(row=>row.id===p.entry);
  assert.equal(focus.areaId,focusInCategory?M.facetAreaId('custom','category','water'):undefined);
  assert.equal(p.connectionPresentation,centerAnchoredLinks?'node-centers':undefined);
  assert.equal(p.occurrences.filter(row=>row.nodeId==='Focus').length,1);
  assert.equal(p.entry,p.editor);assert.equal(p.entry,p.frame);assert.equal(p.attention,'Focus');
  assert.equal(p.edges.length,2);assert(p.edges.every(edge=>edge.kind==='semantic'&&edge.sourceNode==='Focus'&&edge.relation.role==='child'));
  assert.deepEqual(focus.ports,{top:'parent',bottom:'child',left:'left',right:'right'});
  const layout=f.layout(),position=layout.positions.get(p.entry);
  if(focusInCategory){const area=layout.areas.find(area=>area.id===focus.areaId);assert(M.areaContains(area.bounds,position,area.shape));assert.notEqual(position.y,0);}
  else assert.deepEqual(position,{x:0,y:0,width:190,height:50});
 });
}

test('optional preset booleans default off and reject invalid imports without a schema bump',()=>{
 const base=M.FACET_TEMPLATES.wuxing,f=fixture(base);
 assert.equal(f.projection.occurrences.find(row=>row.id===f.projection.entry).areaId,undefined);
 assert.equal(f.projection.connectionPresentation,undefined);assert.equal(M.facetsConfigurationSchema.version,2);
 for(const field of ['focusInCategory','centerAnchoredLinks']){
  for(const value of [false,true])assert(M.isFacetPreset({...base,[field]:value}));
  for(const value of [null,'true',1,{},[]])assert.equal(M.isFacetPreset({...base,[field]:value}),false);
 }
});

for(const [name,value] of [['unassigned',{status:'available',value:undefined}],['conflicting',{status:'available',value:['water','wood']}],
 ['checking',{status:'unavailable',pending:true}],['unresolved',{status:'unavailable'}],['unsupported',{status:'available',value:{bad:true}}]]){
 test(`enabled focus placement retains a single central fallback for ${name}`,()=>{
  const f=fixture({...M.FACET_TEMPLATES.wuxing,focusInCategory:true},value),p=f.projection;
  assert.equal(p.occurrences.find(row=>row.id===p.entry).areaId,undefined);
  assert.equal(p.occurrences.filter(row=>row.nodeId==='Focus').length,1);
  assert.equal(f.layout().positions.get(p.entry).x,0);
 });
}

test('unavailable/future preset selection retains central fallback despite enabled inherited template',()=>{
 const preset={...M.FACET_TEMPLATES.wuxing,focusInCategory:true};
 const f=fixture(preset,{status:'available',value:'water'},{version:1,preset:'missing'});
 assert.equal(f.projection.occurrences.find(row=>row.id===f.projection.entry).areaId,undefined);
});

for(const layout of ['circular','concentric','vertical','horizontal','quadrants'])test(`focused category uses measured editor dimensions in ${layout}`,()=>{
 const base=M.FACET_TEMPLATES['map-roles'],preset={...base,source:'property',field:'phase',focusInCategory:true,layout};
 const category=base.order[0],f=fixture(preset,{status:'available',value:base.categories[category].values[0]}),p=f.projection;
 const attention=f.measured.find(row=>row.id===p.entry);attention.width=820;attention.height=540;
 const result=f.layout(),focus=result.positions.get(p.entry),area=result.areas.find(area=>area.id===M.facetAreaId('custom','category',category));
 assert(M.areaContains(area.bounds,focus,area.shape));assert.equal(focus.width,820);assert.equal(focus.height,540);
 assert(area.viewport.width>=focus.width);assert(area.viewport.height>=focus.height);
 assert.equal(result.positions.size,p.occurrences.length);
 const other=fixture({...preset,focusInCategory:false},{status:'available',value:base.categories[category].values[0]});
 assert.equal(other.projection.occurrences.find(row=>row.id===other.projection.entry).areaId,undefined);
});

test('center connectors intersect rounded note bodies along their center line in every direction',()=>{
 const source={x:0,y:0,width:180,height:50,role:'center',style:{}},target={width:140,height:30,role:'child',style:{}};
 for(const [x,y] of [[500,0],[-500,0],[0,500],[0,-500],[500,500],[-500,-500],[500,-500],[-500,500],[300,30],[30,300]]){
  const end={...target,x,y},line=M.nodeCenterConnector(source,end);assert(line);
  for(const [point,node,dx,dy] of [[line.source,source,x,y],[line.target,end,-x,-y]]){
   assert(Math.abs((point.x-node.x)*dy-(point.y-node.y)*dx)<1e-7,'Every attachment lies on the original center line');
   const a=Math.abs(point.x-node.x),b=Math.abs(point.y-node.y),w=node.width/2,h=node.height/2,r=M.thoughtCornerRadius(node.style,node.role==='center');
   if(a>w-r&&b>h-r)assert(Math.abs(Math.hypot(a-w+r,b-h+r)-r)<1e-7,'Corner attachment lies on the painted arc');
   else assert(Math.abs(a-w)<1e-7||Math.abs(b-h)<1e-7,'Attachment lies on a straight body boundary');
  }
 }
 assert.equal(M.nodeCenterConnector(source,{...target,x:0,y:0}),null);
 assert.equal(M.nodeCenterConnector(source,{...target,x:10,y:0}),null);
 assert.equal(M.thoughtCornerRadius({strokeShaprness:'sharp'},true),5);
});

test('partially scrolled center links stay collinear; hidden cards and absent aperture spans paint nothing',()=>{
 const a={x:20,y:-10},b={x:200,y:100},area={left:0,top:0,width:100,height:100,scrollable:true};
 const source={x:20,y:-10,width:60,height:40},target={x:200,y:100,width:60,height:40};
 const line=M.edgeViewportEndpoints(a,b,'bottom','top',area,undefined,{source,target,centerLine:true});assert(line);
 assert.equal(line.source.point.y,0);assert.equal(line.source.continued,true);
 assert(Math.abs((line.source.point.x-a.x)*(b.y-a.y)-(line.source.point.y-a.y)*(b.x-a.x))<1e-7);
 const old=M.edgeViewportEndpoints(a,b,'bottom','top',area,undefined,{source,target});assert.equal(old.source.point.x,a.x,'Default gate routing keeps historical clamping');
 assert.equal(M.edgeViewportEndpoints(a,b,'bottom','top',area,undefined,{source:{...source,y:-50},target,centerLine:true}),null);
 assert.equal(M.edgeViewportEndpoints(a,{x:200,y:-10},'bottom','top',area,undefined,{source,target,centerLine:true}),null);
});
