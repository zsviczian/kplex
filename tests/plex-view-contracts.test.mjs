/** Cache-only scene admission rejects malformed semantics/geometry and reports unavailable capabilities honestly. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {plexViewModules,viewPage} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/ui/plexViews/occurrenceEditors.ts','src/ui/plexViews/prepareScene.ts','src/ui/plexViews/scene.ts','src/adapters/obsidian/actionNode.ts','tests/support/plexViewProbe.ts']);
/** Finite cached canonical graph; no acquisition, storage or note-reader capability exists. */
function fixture(maximum=10){
  const pages=new Map(['Focus.md','Root.md','Repeated.md','Hidden.md'].map(id=>{const page=viewPage(id);page.file.stat={mtime:1,ctime:1,size:1};return[id,page]}));
  let live=true;const source={get:id=>pages.get(id),titleFor:p=>p.name,isVisiblePage:p=>p.path!=='Hidden.md',captureSemanticGateRead:()=>({isCurrent:()=>live}),
    sortNeighbours:rows=>rows.sort((a,b)=>a.page.path.localeCompare(b.page.path)),
    neighbours:(_page,role)=>role==='child'?[{page:pages.get('Repeated.md'),role,relationType:1,linkDirection:1},{page:pages.get('Hidden.md'),role,relationType:1,linkDirection:1}]:[],
    explainRelationship:()=>({hidden:false,summary:'cached',resolvedRoles:[],decisions:[]})};
  const read=M.plexViewRead(source,()=>live,maximum,'Focus.md'),settings=M.migrateAndMergeSettings({});
  return{source,read,settings,retire:()=>{live=false},prepare:(definition=M.probeViewDefinition)=>M.prepareViewScene(definition,read,source,'Focus.md',null,settings,()=>live)};
}

test('bounded cache reads expose truncation, unavailable corpus and stale revision without inventing zero metrics',()=>{
  const f=fixture(1),relations=f.read.relations('Root.md','child');
  assert.equal(relations.truncated,true);assert.equal(relations.coverage,'cached');assert.equal(relations.items.length,1);
  assert.equal(f.read.node('Hidden.md'),null);assert.deepEqual(f.read.corpus,{available:false,reason:'unsupported'});
  assert.equal(f.read.evidence('Root.md','Repeated.md').coverage,'cached');f.retire();
  assert.equal(f.read.node('Focus.md'),null);assert.equal(f.read.relations('Root.md','child').coverage,'unavailable');assert.equal(f.read.evidence('Root.md','Repeated.md').coverage,'unavailable');
});

test('optional declared multi-field budgets retain the fifth/sixth signature, admission and finite existing owner',()=>{
 const f=fixture(1);let fields=0;
 const provider={getNoteProperty:()=>{throw Error('Unsafe legacy read')},readNoteProperty:()=>{fields++;return{status:'available',value:'known'}}};
 const plain=M.plexViewRead(f.source,()=>true,1,'Focus.md',0,provider);plain.node('Focus.md');
 for(let i=0;i<20;i++)plain.properties.read('Focus.md','phase');assert.equal(fields,9,'Existing default budget unchanged');
 fields=0;const read=M.plexViewRead(f.source,()=>true,1,'Focus.md',0,{...provider,viewDependencies:{fields:['phase','priority']}});read.node('Focus.md');
 for(let i=0;i<40;i++)read.properties.read('Focus.md','phase');assert.equal(fields,21,'Only the same finite frame grows for declared fields');
 const before=fields;assert.equal(read.properties.read('Unadmitted.md','phase').status,'unavailable');assert.equal(fields,before);
 fields=0;const invalid=M.plexViewRead(f.source,()=>true,1,'Focus.md',0,{...provider,viewDependencies:{fields:Array(17).fill('phase')}});invalid.node('Focus.md');
 for(let i=0;i<20;i++)invalid.properties.read('Focus.md','phase');assert.equal(fields,9,'Malformed declarations cannot enlarge a budget');
});

test('shared scene binds repeated occurrences to one canonical page with independent anchors and semantic edges',()=>{
  const f=fixture(),result=f.prepare();assert.equal(result.failure,false);
  const repeated=result.scene.nodes.filter(node=>node.page.path==='Repeated.md');assert.equal(repeated.length,2);assert.equal(repeated[0].page,repeated[1].page);
  assert.equal(result.scene.entryOccurrence,'look-here');assert.equal(result.projection.layoutRoot,'Root.md');assert.equal(result.scene.zoneAreas.grove.width,260);
  assert.equal(M.semanticEdgeForTarget(result.scene.edges,'Root.md','Focus.md','guide'),null);
  assert.equal(M.semanticEdgeForTarget(result.scene.edges,'Root.md','Repeated.md','real-child').id,'real-child');
});

test('malformed policy output fails locally before renderer or relationship writers receive it',()=>{
  const transforms=[
    p=>({...p,attention:'Root.md'}),
    p=>({...p,occurrences:[...p.occurrences,p.occurrences[0]]}),
    p=>({...p,occurrences:p.occurrences.map((o,i)=>i?o:{...o,representation:'point'})}),
    p=>({...p,edges:p.edges.map(e=>e.kind==='semantic'?{...e,sourceNode:'Focus.md'}:e)}),
    p=>({...p,edges:[...p.edges,p.edges[0]]}),
    p=>({...p,entry:'missing'}),
  ];
  for(const transform of transforms){const f=fixture();assert.equal(f.prepare({...M.probeViewDefinition,project:input=>transform(M.probeViewDefinition.project(input))}).failure,true);}
  for(const alter of [a=>({...a,id:'__proto__'}),a=>({...a,viewport:{...a.bounds,contentTop:0,contentHeight:NaN,initialScrollTop:0}}),a=>({...a,heightPreference:{key:'bad',minimum:200,maximum:100}}),a=>({...a,reflow:{columns:0,rowGap:0,columnGap:0}})]){
    const f=fixture();assert.equal(f.prepare({...M.probeViewDefinition,layout(...args){const l=M.probeViewDefinition.layout(...args);return{...l,areas:l.areas.map(alter)}}}).failure,true);
  }
});


test('explicit physical ports retain canonical role counts and unavailable undeclared gates',()=>{
  const stats={top:{visibleCount:2,hasAny:true},bottom:{visibleCount:7,hasAny:true},left:{visibleCount:3,hasAny:true},right:{visibleCount:4,hasAny:true}};
  const physical=M.physicalGateStats({gateStats:stats,physicalPorts:{left:'child',bottom:'parent'}});
  assert.equal(physical.left,stats.bottom);assert.equal(physical.bottom,stats.top);assert.equal(physical.top.countUnavailable,true);
  assert.equal(M.physicalGateStats({gateStats:stats}),stats,'Classic count presentation retains its original identity');
});

test('shared section dimensions preserve Compass density bounds and reserve readable headings in plugin views',()=>{
 assert.deepEqual(M.sectionNodeSize({width:112,height:28}),{width:172,height:32});
 for(const density of [0,0.5,1])for(const width of [112,172,260,320]){
  const reserve=16+(2-16)*density,heightReserve=3*(1-density),size=M.sectionNodeSize({width,height:28},286,reserve,heightReserve);
  assert.deepEqual(size,{width:Math.max(172,Math.min(286,width+reserve)),height:Math.max(32,28+heightReserve)},'Compass geometry remains identical');
 }
 assert.equal(M.sectionNodeSize({width:280,height:40},220).width,220,'Configured maximum remains authoritative');
});


test('unavailable projection never publishes an empty successful scene that could remove a live native editor',()=>{
 const f=fixture();assert.equal(f.prepare({...M.probeViewDefinition,project:()=>null}).failure,true);
 const result=M.prepareViewScene({...M.probeViewDefinition,project(input){const p=M.probeViewDefinition.project(input);return {...p,editor:'layout-root'}}},f.read,f.source,'Focus.md',null,f.settings,()=>true,{width:550,height:300});
 assert.equal(result.failure,true,'The existing attention editor cannot silently become another canonical document');
 const fallback=M.attentionFallbackScene(f.source,'Focus.md',f.settings,{width:550,height:300});assert.equal(fallback.editorOccurrence,'recovery-attention');assert.equal(fallback.nodes[0].page,f.source.get('Focus.md'));
});

test('bound occurrence dimensions reach shared layout independently of attention and same-note duplicates',()=>{
 const f=fixture(),page=f.source.get('Repeated.md'),reference=M.actionNodeRef(page),measurements=[],legacyModes=[];
 const definition={...M.probeViewDefinition,editorHosting:'occurrence',layout(projection,rows,state,legacy,context){measurements.push(rows);legacyModes.push(legacy);assert.equal(projection.editor,undefined);return M.probeViewDefinition.layout(projection,rows,state,legacy,context)}};
 const binding={id:'binding-B1',viewId:definition.id,occurrenceId:'repeat-above',target:{nodeId:reference.identity,path:page.file.path,fileIdentity:reference.fileIdentity},dimensions:{width:660,height:370},mode:'source',closing:false};
 const prepare=(bindings=[binding],matches=()=>true)=>M.prepareViewScene(definition,f.read,f.source,'Focus.md',null,f.settings,()=>true,undefined,matches,undefined,{bindings,supports:current=>current===page});
 const result=prepare();assert.equal(result.failure,false);assert.equal(result.projection.attention,'Focus.md');assert.equal(result.projection.layoutRoot,'Root.md');
 assert.equal(result.scene.boundEditors[0].page,page);assert.equal(result.scene.boundEditors[0].binding.id,'binding-B1');
 const B1=result.scene.nodes.find(row=>row.occurrenceId==='repeat-above'),B2=result.scene.nodes.find(row=>row.occurrenceId==='repeat-below');
 assert.equal(B1.page,B2.page);assert.equal(B1.width,660);assert.equal(B1.height,370);assert.notEqual(B2.width,660);
 assert.equal(measurements[0].find(row=>row.id==='repeat-above').editor,true);assert.equal(measurements[0].find(row=>row.id==='repeat-below').editor,undefined);assert.deepEqual(legacyModes,[false]);
 const pinned=prepare([binding],()=>false);assert.equal(pinned.failure,false);assert.deepEqual(pinned.scene.nodes.map(row=>row.occurrenceId),['repeat-above'],'Lens filtering pins the exact live occurrence, not both note copies');
 const resized=prepare([{...binding,dimensions:{width:710,height:420}}]);assert.equal(resized.scene.boundEditors[0].binding.id,binding.id);assert.equal(resized.scene.nodes.find(row=>row.occurrenceId==='repeat-above').width,710);
 const collapsed=prepare([]);assert.equal(collapsed.failure,false);assert.equal(collapsed.scene.boundEditors,undefined);assert(measurements.at(-1).every(row=>row.editor===undefined));
});

test('bound editor admission rejects missing, hidden, recreated or mismatched targets instead of retargeting attention',()=>{
 for(const failure of ['missing-occurrence','wrong-document','wrong-native-file','wrong-view','missing-native-file','native-rejected','authoritative-hidden','too-many','legacy-policy']){
  const f=fixture(),page=f.source.get('Repeated.md'),reference=M.actionNodeRef(page),definition={...M.probeViewDefinition,editorHosting:'occurrence'};
  const binding={id:'binding',viewId:definition.id,occurrenceId:'repeat-above',target:{nodeId:reference.identity,path:page.file.path,fileIdentity:reference.fileIdentity},dimensions:{width:660,height:370},mode:'source',closing:false};
  if(failure==='missing-occurrence')binding.occurrenceId='missing';
  if(failure==='wrong-document')binding.target.nodeId='Focus.md';
  if(failure==='wrong-native-file')page.file={...page.file};
  if(failure==='wrong-view')binding.viewId='other.view';
  if(failure==='missing-native-file')page.file=null;
  if(failure==='authoritative-hidden')f.source.isVisiblePage=()=>false;
  if(failure==='legacy-policy')delete definition.editorHosting;
  const result=M.prepareViewScene(definition,f.read,f.source,'Focus.md',null,f.settings,()=>true,undefined,()=>true,undefined,
   {bindings:failure==='too-many'?[binding,{...binding,id:'second',occurrenceId:'repeat-below'}]:[binding],supports:()=>failure!=='native-rejected'});
  assert.equal(result.failure,true,failure);assert.deepEqual(result.scene.nodes,[],failure);assert.equal(result.scene.boundEditors,undefined,failure);
 }
});

test('bound editor scene delegates media eligibility to the native owner while preserving the exact occurrence',()=>{
 for(const [extension,supported] of [['png',true],['mp4',true],['zip',false]]){
  const f=fixture(),page=f.source.get('Repeated.md');page.file.extension=extension;
  const reference=M.actionNodeRef(page),definition={...M.probeViewDefinition,editorHosting:'occurrence'};
  const binding={id:'native-media',viewId:definition.id,occurrenceId:'repeat-above',target:{nodeId:reference.identity,path:page.file.path,fileIdentity:reference.fileIdentity},dimensions:{width:660,height:370},mode:'source',closing:false};
  let checkedPage;
  const result=M.prepareViewScene(definition,f.read,f.source,'Focus.md',null,f.settings,()=>true,undefined,()=>true,undefined,
   {bindings:[binding],supports:current=>{checkedPage=current;return supported}});
  assert.equal(checkedPage,page,'The native owner receives the exact canonical page');assert.equal(result.failure,!supported,extension);
  if(supported){
   assert.equal(result.scene.boundEditors[0].page,page);assert.equal(result.scene.boundEditors[0].binding.occurrenceId,'repeat-above');
   assert.equal(result.projection.attention,'Focus.md','Media admission cannot retarget attention');
   assert.notEqual(result.scene.nodes.find(row=>row.occurrenceId==='repeat-below').width,660,'Same-note copies remain independent');
  }else{assert.deepEqual(result.scene.nodes,[]);assert.equal(result.scene.boundEditors,undefined);}
 }
});

test('rooted scene input keeps layout root separate from attention and central sizing',()=>{
 const f=fixture(),seen=[],definition={...M.probeViewDefinition,navigation:'rooted',project(input){seen.push({attention:input.attention,root:input.layoutRoot});return M.probeViewDefinition.project(input)}};
 const result=M.prepareViewScene(definition,f.read,f.source,'Focus.md',null,f.settings,()=>true,undefined,()=>true,
  {translate:value=>value,unfolded:new Set(),layoutRoot:'Root.md'});
 assert.equal(result.failure,false);assert.deepEqual(seen,[{attention:'Focus.md',root:'Root.md'}]);
 assert.equal(result.scene.nodes.find(row=>row.occurrenceId==='layout-root').role,'center');assert.equal(result.scene.nodes.find(row=>row.occurrenceId==='look-here').role,'child');
 assert.equal(f.prepare(definition).failure,true,'A rooted definition cannot silently replace its admitted root');
 const legacy=f.prepare();assert.equal(legacy.failure,false);assert.equal(legacy.scene.nodes.find(row=>row.occurrenceId==='look-here').role,'center','Omitted rooted policy preserves legacy attention styling');
});


test('native editor removal uses the same exact document proof as scene admission, including rename aliases',()=>{
 const f=fixture(),page=f.source.get('Repeated.md'),reference=M.actionNodeRef(page);
 const binding={id:'binding',viewId:'test.bound',occurrenceId:'B1',target:{nodeId:reference.identity,path:page.file.path,fileIdentity:reference.fileIdentity},dimensions:{width:600,height:360},mode:'source',closing:false};
 const resolve=()=>M.resolveOccurrenceEditorPage(binding,f.source,()=>true);
 assert.equal(resolve(),page);page.file.path='Renamed.md';assert.equal(resolve(),null,'A native rename cannot borrow the old binding path');
 page.file.path=binding.target.path;page.path='Renamed.md';assert.equal(resolve(),null,'An old-ID alias cannot confer authority over a different canonical identity');
 page.path=binding.target.nodeId;page.file={...page.file};assert.equal(resolve(),null,'A recreated file cannot inherit the old native token');
});


test('optional frontier coverage stays unavailable without a proof and limits are cache-only and lifetime-fenced',()=>{
 const f=fixture();assert.deepEqual(f.read.scope('Root.md'),{coverage:'unavailable',prepared:false,complete:false,pending:false});
 let calls=0;f.source.viewScopeCoverage=()=>{calls++;return{coverage:'local',prepared:true,complete:false,pending:false}};
 const read=M.plexViewRead(f.source,()=>true,10,'Focus.md');assert.deepEqual(read.scope('Root.md'),{coverage:'local',prepared:true,complete:false,pending:false});
 assert.equal(read.relations('Root.md','child',1).items.length,1);assert.equal(read.relations('Root.md','child',1).truncated,true);
 assert.equal(read.relations('Root.md','child',0).coverage,'unavailable');
 assert.equal(read.scope('Hidden.md').prepared,false);assert.equal(calls,1,'Hidden nodes never reach the scope owner');
 f.source.viewScopeCoverage=()=>{f.retire();return{coverage:'local',prepared:true,complete:true,pending:false}};
 assert.equal(read.scope('Root.md').complete,false,'A proof retired during a read cannot certify absence');
});


test('a repeated reference to the root note keeps ordinary occurrence sizing and cannot ambiguously claim the root',()=>{
 const f=fixture(),definition={...M.probeViewDefinition,navigation:'rooted',project(input){const p=M.probeViewDefinition.project(input);return{...p,root:'layout-root',occurrences:[...p.occurrences,{id:'root-reference',nodeId:'Root.md',role:'child',representation:'thought'}]}},layout(projection,rows,...rest){const base=M.probeViewDefinition.layout(projection,rows.filter(row=>row.id!=='root-reference'),...rest),reference=rows.find(row=>row.id==='root-reference');return{...base,positions:new Map([...base.positions,['root-reference',{x:480,y:520,width:reference.width,height:reference.height}]])}}};
 const prepare=def=>M.prepareViewScene(def,f.read,f.source,'Focus.md',null,f.settings,()=>true,undefined,()=>true,{translate:v=>v,unfolded:new Set(),layoutRoot:'Root.md'});
 const result=prepare(definition);assert.equal(result.failure,false);const reference=result.scene.nodes.find(row=>row.occurrenceId==='root-reference');
 const expected=M.nodeSize(reference.label,reference.style.fontSize??18,f.settings,false,reference.style.maxLabelLength,reference.style.maxWidth,reference.style.strokeWidth);
 assert.equal(reference.width,expected.width);assert.equal(reference.height,expected.height);assert.equal(reference.role,'child');assert.equal(result.projection.root,'layout-root');
 assert.equal(prepare({...definition,project(input){const p=definition.project(input);delete p.root;return p}}).failure,true,'Two root-note occurrences require one explicit root anchor');
});
