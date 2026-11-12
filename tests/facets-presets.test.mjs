/** Bounded shared preset values, legacy migration, independent intent and truthful cached-field
 * classification. Production registration/rendering/native acceptance follow in checkpointC. */
import {archivedFacetPresets} from './support/facetPresetArchive.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {plexViewModules} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/core/plex/views/facets/contracts.ts','src/core/plex/views/facets/templates.ts',
 'src/core/plex/views/facets/validation.ts','src/core/plex/views/facets/configuration.ts','src/core/plex/views/facets/state.ts',
 'src/core/plex/views/facets/classification.ts','src/core/plex/views/configurationValues.ts',
 'src/core/plex/views/configuration.ts','src/core/plex/views/facets/projection.ts','src/core/plex/views/facets/layout.ts',
 'src/core/plex/views/decorations.ts','src/core/plex/views/facets/presentation.ts',
 'src/core/plex/views/facets/assignment.ts','src/core/plex/views/wuxing/definition.ts','src/core/plex/views/registry.ts',
 'src/core/contracts/areaGeometry.ts','src/core/plex/views/facets/flow.ts','src/core/contracts/markdownHelp.ts','src/lang/index.ts']);
const definition={id:'wuxing',configuration:M.facetsConfigurationSchema};
const available=stored=>M.readViewConfiguration(definition,stored),library=stored=>M.facetLibrary(available(stored));
const node={id:'A',kind:'document',file:{extension:'md'},noteType:'water',tags:['wood']};

test('all eight locales provide substantial distinct safe help with the actual preset facts',()=>{
 const before=JSON.stringify(available({}));
 for(const locale of ['en','de','es','fr','ja','nl','ru','zh-tw']){
  const translate=M.createTranslator(locale),texts=M.FACET_TEMPLATE_ORDER.map(id=>translate('facets.help.'+id));assert.equal(new Set(texts).size,2);
  for(const [index,id]of M.FACET_TEMPLATE_ORDER.entries()){
   const text=texts[index];assert(text.length>=400&&text.length<=4096,locale+' '+id+' substantial bounded help');assert.equal(M.validMarkdownHelp(text),true,locale+' '+id);
   assert(text.startsWith('# ')&&text.includes('## ')&&text.includes('```yaml\n'),'Native headings and actual YAML examples');
   for(const value of id==='sensemaking'?['approach','mode','top-down','bottom-up','reflection','expression']:M.FACET_TEMPLATES[id].order.map(key=>M.FACET_TEMPLATES[id].categories[key].values[0]))assert(text.includes(value),locale+' '+id+' documents '+value);
  }
 }
 assert.equal(JSON.stringify(available({})),before,'Reading built-in localized help never materializes defaults');
});

test('help source safety preserves ordinary Markdown and neutralizes executable fences without evaluating it',()=>{
 const source='# Help\n\n- **Purpose**\n\n```dataviewjs\nwindow.shouldNeverRun = true\n```\n\n[Guide](https://github.com/zsviczian/kplex)\n\n\x60= note.phase\x60';
 assert.equal(M.validMarkdownHelp(source),true);const inert=M.inertMarkdownHelpSource(source);assert(!inert.includes('```dataviewjs'));assert(inert.includes('window.shouldNeverRun = true'));assert(inert.includes('\x60\u200b='));assert.equal(source.includes('```dataviewjs'),true,'Stored source stays literal');
 for(const text of ['<script>bad</script>','![image](https://example.com/image.png)','![[private.md]]','[bad](javascript:bad)','[bad](file:///private)','[bad](https://user:secret@example.com)','[x]: data:bad','x'.repeat(4097),'bad'+String.fromCharCode(1)])assert.equal(M.validMarkdownHelp(text),false,text.slice(0,40));
 const preset={...archivedFacetPresets.arc,helpMarkdown:'',helpSourceLocale:'ja'};assert.equal(M.isFacetPreset(preset),true);
 assert.equal(M.isFacetPreset({...preset,helpMarkdown:'<iframe src="bad">'}),false);assert.equal(M.isFacetPreset({...preset,helpSourceLocale:'private/path'}),false);
});

/** Explicit cached facts cover every diagnostic meaning without a parser or source acquisition. */
function diagnosticScene(additional=0){
 const values=new Map([['focus',{status:'available',value:'water'}],['assigned',{status:'available',value:'wood'}],
  ['unassigned',{status:'available',value:undefined}],['conflicting',{status:'available',value:['wood','fire']}],
  ['checking',{status:'unavailable'}],['unresolved',{status:'unavailable'}],['unsupported',{status:'available',value:{bad:true}}],
  ...Array.from({length:additional},(_,i)=>['extra'+i,{status:'available',value:undefined}])]);
 const nodes=new Map([...values.keys()].map(id=>[id,{...node,id}])),work={fields:0};
 const read={coverage:'cached',isCurrent:()=>true,node:id=>nodes.get(id),compare:(a,b)=>a.id.localeCompare(b.id),
  relations:(id,role)=>({items:id==='focus'&&role==='child'?[...nodes.values()].slice(1).map(node=>({node,role,relationType:1,direction:1})):[],coverage:'cached',truncated:false}),
  properties:{availability:()=> 'available',read:id=>{work.fields++;return values.get(id)}},scope:id=>({pending:id==='checking'})};
 const project=(state={version:1,preset:'wuxing'})=>M.projectFacets({attention:'focus',maximum:128,state,configuration:available({}),read});
 const measure=p=>p.occurrences.map(row=>({id:row.id,width:160,height:44,expandedWidth:160,expandedReserve:0,mini:null,envelope:null,...(row.badge?{badge:{width:120,height:24}}:{})}));
 return {values,work,project,measure};
}

test('measured workflow guides preserve logical direction through both axes, reversal, anchors and caption positions',()=>{
 const f=diagnosticScene(),projection=f.project(),measured=f.measure(projection),before=JSON.stringify(projection),base=M.FACET_TEMPLATES.wuxing;
 for(const layout of ['horizontal','vertical'])for(const reverse of [false,true])for(const focusAnchor of ['top','bottom','left','right'])for(const direction of ['forward','backward','both'])for(const style of ['arrow','line','none'])for(const captionPosition of ['start','middle','end']){
  const preset={...base,layout,reverse,focusAnchor,flow:{direction,style,caption:'A bounded workflow caption',captionPosition}},labels=M.facetFlowLabels(preset,'wuxing'),sizes=new Map(labels.map(label=>[label.id,{width:220,height:28,fontSize:12}]));
  const result=M.layoutFacets(projection,measured,'wuxing',preset,{},true,{},undefined,sizes),guides=result.decorations.filter(mark=>mark.kind==='guide');assert.equal(guides.length,4);
  for(const guide of guides){
   assert.equal(guide.direction,style==='arrow'?direction:undefined);assert.equal(guide.stroke,style==='none'?'none':'line');assert.equal(guide.source,undefined);assert.equal(guide.targetNode,undefined);
   const a=guide.points[0],b=guide.points.at(-1),delta=layout==='horizontal'?b.x-a.x:b.y-a.y;assert(reverse?delta<0:delta>0,'Forward logical sequence follows actual physical reversal');
   assert.equal(guide.caption.bounds.width,220);assert.equal(guide.caption.fontSize,12);
   const fraction=captionPosition==='start'?.2:captionPosition==='end'?.8:.5,center=layout==='horizontal'?guide.caption.bounds.x+110:guide.caption.bounds.y+14;
   assert(Math.abs(center-((layout==='horizontal'?a.x:a.y)+(layout==='horizontal'?b.x-a.x:b.y-a.y)*fraction))<1e-9,'Caption follows its requested rail fraction within floating-point precision');
   for(const point of guide.points)assert(!M.areaContains({x:-80,y:-22,width:160,height:44},point),'Guide points stay outside the attention editor');
   assert(!M.areaContains(guide.caption.bounds,{x:0,y:0}),'Caption never covers attention');
  }
  const dock=result.areas.find(area=>area.id===M.facetCombinedAreaId('wuxing'));assert(dock.bounds.x>Math.max(...guides.map(mark=>mark.caption.bounds.x+mark.caption.bounds.width)),'Diagnostics dock accounts for measured caption extents');
  assert.equal(JSON.stringify(projection),before);
 }
});

test('flow pair overrides retain identities and blank-caption inheritance without executable data',()=>{
 const preset={...archivedFacetPresets.arc,layout:'horizontal',guides:true,flow:{caption:'Default',direction:'both'},flowOverrides:[{source:'add',target:'relate',caption:'',style:'line'}]};
 assert.equal(M.isFacetPreset(preset),true);assert.equal(M.facetFlowStyle(preset,'relate','add').caption,'');assert.equal(M.facetFlowStyle(preset,'relate','add').direction,'both');
 assert.equal(M.facetFlowLabels(preset,'arc').length,1);assert.equal(M.facetFlowId('add','relate'),M.facetFlowId('relate','add'));
 for(const change of [{flow:{caption:'x'.repeat(81)}},{flow:{direction:'execute'}},{flow:{script:'bad'}},{flowOverrides:[{source:'add',target:'missing'}]}, {flowOverrides:[{source:'add',target:'relate'},{source:'relate',target:'add'}]}])assert.equal(M.isFacetPreset({...preset,...change}),false);
});

test('all five measured layouts retain one attention editor, category identities and canonical edges',()=>{
 const f=diagnosticScene(),projection=f.project(),measure=f.measure(projection),before=JSON.stringify(projection);
 for(const layout of ['circular','concentric','vertical','horizontal','quadrants'])for(const focusAnchor of ['top','bottom','left','right']){
  const preset={...M.FACET_TEMPLATES.wuxing,layout,focusAnchor},state={version:1,preset:'wuxing'};
  const result=M.layoutFacets(projection,measure,'wuxing',preset,{},true,{},state),focus=result.positions.get(projection.entry);
  assert.equal(result.positions.size,measure.length);assert.equal(focus.x,0);assert.equal(focus.y,0);
  assert.equal(result.areas.filter(area=>JSON.parse(area.id)[2]==='category').length,5);
  for(const occurrence of projection.occurrences)if(occurrence.areaId){const area=result.areas.find(area=>area.id===occurrence.areaId),point=result.positions.get(occurrence.id);assert(point.x>=area.viewport.x&&point.x<=area.viewport.x+area.viewport.width);assert(point.y>=area.viewport.contentTop&&point.y<=area.viewport.contentTop+area.viewport.contentHeight);if(point.y<=area.viewport.y+area.viewport.height)assert(M.areaContains(area.bounds,point,area.shape),'Visible cards belong to their actual physical area');}
  assert.equal(JSON.stringify(projection),before,'Layout never changes classification or canonical relationships');
  if(layout==='concentric'){
   const bands=result.areas.filter(area=>area.shape);assert.equal(bands.length,5);
   for(const area of bands){assert.equal(M.areaContains(area.bounds,focus,area.shape),false);assert.equal(area.heightPreference.value,preset.regionHeight);assert.equal(area.widthPreference.value,preset.regionWidth);assert.equal(area.resizeEdge,'top');}
   for(const band of bands)for(const other of bands)if(band!==other){const strip={x:other.viewport.x+other.viewport.width/2,y:other.viewport.y+10};assert.equal(M.areaContains(band.bounds,strip,band.shape),false,'Outer bands do not intercept an inner content strip');}
  }
 }
 const para=archivedFacetPresets.para,occurrences=[{id:'focus'},...para.order.map(id=>({id,areaId:M.facetAreaId('para','category',id)}))],p={entry:'focus',occurrences};
 const result=M.layoutFacets(p,occurrences.map(row=>({id:row.id,width:900,height:500})),'para',{...para,layout:'quadrants'});
 assert(result.areas.filter(area=>JSON.parse(area.id)[2]==='category').every(area=>!M.areaContains(area.bounds,{x:0,y:0})));
});

test('preset layout is authoritative over inert legacy canvas intent and preserves individual size precedence',()=>{
 const config=available({}),initial={version:1,preset:'wuxing',layouts:{wuxing:'concentric'}};
 assert.deepEqual(M.facetState(JSON.parse(JSON.stringify(initial))),initial,'Legacy state remains readable without executing its layout');
 assert.equal(M.reduceFacetState(initial,{id:'layout.select',args:'concentric'},config).status,'unavailable');
 assert.equal(M.facetLayout(M.FACET_TEMPLATES.wuxing,'wuxing',initial).effective,'circular');
 assert.equal(M.facetLayout({...M.FACET_TEMPLATES.wuxing,layout:'vertical'},'wuxing',initial).effective,'vertical');
 assert.equal(M.facetLayout({...M.FACET_TEMPLATES.wuxing,layout:'quadrants'},'wuxing',initial).fallback,true);
 assert.equal(M.facetLayout({...archivedFacetPresets.para,layout:'quadrants'},'para',initial).effective,'quadrants');
 const f=diagnosticScene(),p=f.project(),measured=f.measure(p),id=M.facetAreaId('wuxing','category','wood'),preset={...M.FACET_TEMPLATES.wuxing,areaSizes:{categories:{wood:{width:900,height:500}},diagnostics:{combined:{width:800,height:400}}}};
 const defaults=M.layoutFacets(p,measured,'wuxing',preset),override=M.layoutFacets(p,measured,'wuxing',preset,{[id]:300},true,{[id]:600});
 assert.equal(defaults.areas.find(area=>area.id===id).bounds.width,900);assert.equal(defaults.areas.find(area=>area.id===id).bounds.height,500);
 assert.equal(override.areas.find(area=>area.id===id).bounds.width,600);assert.equal(override.areas.find(area=>area.id===id).bounds.height,300);
 for(const alter of [{layout:'force'},{focusAnchor:'center'},{reverse:'yes'},{areaSizes:{categories:{wood:{width:2401}}}},{areaSizes:{diagnostics:{invented:{height:300}}}}])assert.equal(M.isFacetPreset({...preset,...alter}),false);
});

test('combined diagnostics defaults preserve distinct statuses, personal phases and exact canonical relations',()=>{
 const f=diagnosticScene(),before=JSON.stringify([...f.values]),combined=f.project(),separate=f.project({version:1,preset:'wuxing',combinedDiagnostics:{wuxing:false}});
 const diagnostics=combined.occurrences.filter(row=>row.nodeId!=='focus'&&row.nodeId!=='assigned'),id=M.facetCombinedAreaId('wuxing');
 assert.equal(diagnostics.length,5);assert(diagnostics.every(row=>row.areaId===id&&row.badge?.presentation==='status')); assert.equal(new Set(diagnostics.map(row=>row.id)).size,5);
 assert.deepEqual(new Set(diagnostics.map(row=>JSON.parse(row.groupingPartition)[3])),new Set(['unassigned','conflicting','checking','unresolved']));
 assert.equal(diagnostics.find(row=>row.nodeId==='checking').badge.label.key,'facets.checking');
 assert.equal(diagnostics.find(row=>row.nodeId==='unresolved').badge.description.key,'facets.reason.metadata');
 assert.equal(diagnostics.find(row=>row.nodeId==='unsupported').badge.description.key,'facets.reason.unsupported');
 assert.deepEqual(combined.edges,separate.edges);assert.equal(JSON.stringify([...f.values]),before);
 const layout=M.layoutFacets(combined,f.measure(combined),'wuxing',M.FACET_TEMPLATES.wuxing),area=layout.areas.find(area=>area.id===id);
 assert.equal(layout.areas.length,6);assert.equal(area.viewport.edgeVisibility,undefined,'Shared continuation behavior is the default');assert.equal(area.dropTarget,undefined);assert(M.facetPresetAssignments('wuxing',M.FACET_TEMPLATES.wuxing).some(target=>target.id===M.facetAreaId('wuxing','status','unassigned')));
 assert.equal(layout.positions.size,combined.occurrences.length);assert.equal(combined.occurrences.find(row=>row.id===combined.entry).areaId,undefined);
});

test('combined dock sides and separate arrangements stay outside measured guides and retain dimension identities',()=>{
 const f=diagnosticScene(20),combined=f.project(),measured=f.measure(combined),id=M.facetCombinedAreaId('wuxing');
 for(const side of ['top','right','bottom','left']){
  const preset={...M.FACET_TEMPLATES.wuxing,diagnostics:{side}},layout=M.layoutFacets(combined,measured,'wuxing',preset,{[id]:480},true,{[id]:600}),dock=layout.areas.find(area=>area.id===id);
  assert.equal(dock.bounds.width,600);assert.equal(dock.bounds.height,480);assert.equal(dock.reflow.columns,3);assert.equal(dock.heightPreference.key,id);
  const marks=layout.decorations.filter(mark=>mark.kind==='guide').flatMap(mark=>mark.points);
  if(side==='right')assert(dock.bounds.x>Math.max(...marks.map(p=>p.x)));
  if(side==='left')assert(dock.bounds.x+dock.bounds.width<Math.min(...marks.map(p=>p.x)));
  if(side==='top')assert(dock.bounds.y+dock.bounds.height<Math.min(...marks.map(p=>p.y)));
  if(side==='bottom')assert(dock.bounds.y>Math.max(...marks.map(p=>p.y)));
 }
 const state={version:1,preset:'wuxing',combinedDiagnostics:{wuxing:false}},p=f.project(state),preset={...M.FACET_TEMPLATES.wuxing,diagnostics:{orientation:'horizontal'}};
 const separate=M.layoutFacets(p,f.measure(p),'wuxing',preset,{[id]:480},true,{[id]:600},state),areas=separate.areas.filter(area=>area.id.includes('"status"'));
 assert.equal(areas.length,4);assert(areas.every(area=>area.bounds.y===areas[0].bounds.y));assert(areas.every(area=>area.bounds.width!==600));
 assert.equal(areas.find(area=>area.id===M.facetAreaId('wuxing','status','unassigned')).dropTarget.kind,'property');
});

test('canvas diagnostic overrides remain explicit across preset defaults and support bounded restoration',()=>{
 const config=available({}),initial={version:1,preset:'wuxing'},off=M.reduceFacetState(initial,{id:'diagnostics.combine',args:false},config);
 assert.equal(off.status,'updated');assert.equal(M.facetDiagnostics(M.FACET_TEMPLATES.wuxing,'wuxing',off.state).combined,false);
 assert.equal(M.facetDiagnostics(M.FACET_TEMPLATES.wuxing,'wuxing',initial).combined,true);
 const on=M.reduceFacetState(off.state,{id:'diagnostics.combine',args:true},config),changedDefault={...M.FACET_TEMPLATES.wuxing,diagnostics:{combined:false}};
 assert.equal(M.facetDiagnostics(changedDefault,'wuxing',on.state).combined,true);assert.equal(M.facetDiagnostics(changedDefault,'wuxing',initial).combined,false);
 assert.deepEqual(M.facetState(JSON.parse(JSON.stringify(on.state))),on.state);assert.equal(M.facetState({...initial,combinedDiagnostics:{wuxing:'true'}}),null);
 assert.equal(M.reduceFacetState(initial,{id:'diagnostics.combine',args:'false'},config).status,'unavailable');
 for(const diagnostics of [{combined:'yes'},{side:'middle'},{orientation:'diagonal'},{order:['unassigned','unassigned','checking','unresolved']}])assert.equal(M.isFacetPreset({...M.FACET_TEMPLATES.wuxing,diagnostics}),false);
});

test('individual Facets widths drive one, two and three measured columns without enlarging unrelated regions',()=>{
 const preset=M.FACET_TEMPLATES.wuxing,wood=M.facetAreaId('wuxing','category','wood'),water=M.facetAreaId('wuxing','category','water');
 const occurrences=[{id:'focus'},...Array.from({length:6},(_,i)=>({id:'wood-'+i,areaId:wood})),{id:'wide-water',areaId:water}];
 const projection={entry:'focus',occurrences},measured=occurrences.map(row=>({id:row.id,width:row.id==='wide-water'?600:100,height:40,expandedWidth:0,expandedReserve:0,mini:null,envelope:null}));
 for(const [width,columns]of [[200,1],[300,2],[400,3]]){
  const layout=M.layoutFacets(projection,measured,'wuxing',preset,{},true,{[wood]:width}),area=layout.areas.find(area=>area.id===wood);
  assert.equal(area.bounds.width,width);assert.equal(area.reflow.columns,columns);assert.equal(area.widthPreference.value,width);assert.equal(area.widthResizeEdge,'right');
  assert.equal(layout.areas.find(area=>area.id===water).bounds.width,648);
  assert.equal(layout.positions.size,measured.length);assert.equal(layout.positions.get('focus').x,0);assert.equal(layout.positions.get('focus').y,0);
  const cards=occurrences.filter(row=>row.areaId===wood).map(row=>layout.positions.get(row.id));
  assert.equal(new Set(cards.map(card=>card.x)).size,columns);
  for(const card of cards){assert.equal(card.width,100);assert(card.x-card.width/2>=area.bounds.x);assert(card.x+card.width/2<=area.bounds.x+area.bounds.width);}
 }
});

test('two built-in templates retain3–7 categories, explicit rules and existing settings bounds',()=>{
 M.validateViewConfigurationSchema(M.facetsConfigurationSchema);
 assert.deepEqual(M.FACET_TEMPLATE_ORDER,['wuxing','map-roles']);
 assert.deepEqual(M.FACET_TEMPLATE_ORDER.map(id=>M.FACET_TEMPLATES[id].order.length),[5,4]);
 for(const [id,preset]of Object.entries(M.FACET_TEMPLATES)){
  assert.equal(M.isFacetPreset(preset),true,id);assert.equal(preset.guides,['arc','wuxing','publishing'].includes(id));
  assert.deepEqual(Object.keys(preset.categories),preset.order);if(preset.source!=='rules')assert.equal(preset.categories[preset.order[0]].assignment,preset.categories[preset.order[0]].values[0]);
 }
 const stored=M.editViewConfiguration(definition,{},'presets',M.FACET_TEMPLATES);
 assert.equal(available(stored).status,'available');assert(JSON.stringify(stored).length<=16384);
 assert.deepEqual(M.configurationJson(stored),stored);assert.equal(M.isFacetPreset(M.FACET_STATE_EXAMPLE),true);
 assert.deepEqual(M.FACET_STATE_EXAMPLE.order,['seed','research','draft','published']);assert.equal(M.FACET_STATE_EXAMPLE.field,'state');
});

test('absent inherited ACE intent follows ARC while explicit customized ACE data stays intact',()=>{
 const empty=library({wuxing:{version:2,values:{presets:{arc:archivedFacetPresets.arc}}}}),fallback=M.resolveFacetPreset(empty,'ace');assert.equal(empty.presets.ace,undefined);assert.equal(fallback.id,'arc');assert.equal(fallback.status,'replaced');
 const custom={...archivedFacetPresets.arc,name:'My saved ACE',field:'old-field',order:['add','connect','express'],start:'connect',categories:{add:{label:'Ideas',values:['inbox'],color:'#ffffff'},connect:{label:'Connections',values:['linked'],color:'#aaaaaa'},express:{label:'Results',values:['shared'],color:'#333333'}}};
 const stored=M.editViewConfigurationAt(definition,{}, {field:'presets',path:['ace']},{kind:'set',value:custom}),before=JSON.stringify(stored),selected=M.resolveFacetPreset(library(stored),'ace');
 assert.equal(selected.id,'ace');assert.equal(selected.status,'ready');assert.deepEqual(selected.preset,custom);assert.equal(JSON.stringify(stored),before);
});

test('Wu Xing migration retains mappings, exact case, source, labels/order/start/layout and unknown fields',()=>{
 const raw={other:{version:8,values:{opaque:'other'}},wuxing:{version:1,wrapper:'keep',values:{source:'property',field:'State',
  order:'metal,earth,fire,wood,water',start:'fire',waterLabel:'Literal water',waterValues:' Liquid,liquid\nwater ',
  woodValues:'',spacing:88,regionWidth:440,regionHeight:360,guides:false,tints:false,unknownFuture:{retain:true}}}};
 const before=structuredClone(raw),effective=available(raw);assert.equal(effective.status,'available');
 const preset=library(raw).presets.wuxing;assert.equal(preset.field,'State');assert.deepEqual(preset.order,['metal','earth','fire','wood','water']);assert.equal(preset.start,'fire');
 assert.deepEqual(preset.categories.water.values,['Liquid','liquid','water']);assert.equal(preset.categories.water.label,'Literal water');assert.equal(preset.categories.water.assignment,'Liquid');
 assert.equal('assignment'in preset.categories.wood,false);assert.equal(preset.spacing,88);assert.equal(preset.regionWidth,440);assert.equal(preset.regionHeight,360);assert.equal(preset.guides,false);assert.equal(preset.tints,false);
 const migrated=M.migrateViewConfiguration(definition,raw);assert.equal(migrated.status,'migrated');assert.equal(migrated.settings.wuxing.version,2);
 assert.equal(migrated.settings.wuxing.wrapper,'keep');assert.deepEqual(migrated.settings.wuxing.values.unknownFuture,{retain:true});assert.deepEqual(migrated.settings.other,raw.other);
 assert.equal('waterValues'in migrated.settings.wuxing.values,false,'Explicit known-field retirement prevents duplicate legacy storage');
 assert.deepEqual(raw,before);assert.equal(M.migrateViewConfiguration(definition,migrated.settings).status,'unchanged');
 assert.equal(Object.keys(library(migrated.settings).presets).length,2,'Unchanged templates inherit without duplicate materialization');
});

test('legacy type/tag sources and maximum alias text retain their interpretation without body parsing',()=>{
 for(const source of ['type','tag']){
  const raw={wuxing:{version:1,values:{source,field:'phase'}}};assert.equal(library(raw).presets.wuxing.source,source);
 }
 const aliases=Array(512).fill('w').join(',');const raw={wuxing:{version:1,values:Object.fromEntries(['water','wood','fire','earth','metal'].map(id=>[id+'Values',aliases]))}};
 const migrated=M.migrateViewConfiguration(definition,raw);assert.equal(migrated.status,'migrated');assert.equal(available(migrated.settings).status,'available');
 assert.equal(library(migrated.settings).presets.wuxing.categories.water.values.length,512);assert(JSON.stringify(migrated.settings).length<=16384);
 const long='x'.repeat(1024),single=M.migrateViewConfiguration(definition,{wuxing:{version:1,values:{waterValues:long}}});
 assert.equal(single.status,'migrated');assert.deepEqual(library(single.settings).presets.wuxing.categories.water.values,[long]);
 assert.equal(library(single.settings).presets.wuxing.categories.water.assignment,long,'A maximum legacy scalar alias remains assignable without truncation');
});

test('failed/future migrations preserve original payload and refuse a destructive fallback write',()=>{
 for(const payload of [{version:9,values:{opaque:'future'}},{version:1,values:{waterValues:42}},
  {version:1,values:{presets:{foreign:'unknown'}}}]){
  const raw={wuxing:payload},before=structuredClone(raw),result=M.migrateViewConfiguration(definition,raw);
  assert.equal(result.status,'unavailable');assert.deepEqual(raw,before);assert.deepEqual(result.original,raw);
  assert.throws(()=>M.editViewConfiguration(definition,raw,'presetOrder',['wuxing']));
 }
});

test('preset selection is canvas state and preserves unknown compatible fields without changing configuration',()=>{
 const configuration=available({wuxing:{version:2,values:{presets:{arc:archivedFacetPresets.arc,para:archivedFacetPresets.para}}}}),a={version:1,preset:'wuxing',opaque:'keep'},b={version:1,preset:'para'};
 const changed=M.reduceFacetState(a,{id:'preset.select',args:'arc'},configuration);
 assert.deepEqual(changed,{status:'updated',state:{version:1,preset:'arc',opaque:'keep'}});assert.equal(b.preset,'para');assert.equal(a.preset,'wuxing');
 assert.deepEqual(M.restoreFacetState(null),{version:1,preset:'wuxing'});assert.deepEqual(configuration,available({wuxing:{version:2,values:{presets:{arc:archivedFacetPresets.arc,para:archivedFacetPresets.para}}}}));
 const future={version:7,preset:'future',opaque:{retain:true}};assert.equal(M.restoreFacetState(future),future);
 assert.equal(M.reduceFacetState(future,{id:'preset.select',args:'para'},configuration).status,'unavailable');assert.equal(M.facetState(future),null);
});

test('unknown/future preset IDs safely render fallback while retaining their requested identity and data',()=>{
 const stored={wuxing:{version:2,values:{presets:{newer:{version:8,opaque:{retain:true}}},presetOrder:['newer','para']}}};
 const before=structuredClone(stored),lib=library(stored);
 assert.equal(M.resolveFacetPreset(lib,'newer').status,'future');assert.equal(M.resolveFacetPreset(lib,'newer').requestedId,'newer');
 assert.equal(M.resolveFacetPreset(lib,'missing').status,'missing');assert.equal(M.resolveFacetPreset(lib,'missing').id,'wuxing');
 const edited=M.editViewConfigurationAt(definition,stored,{field:'presets',path:['para']},{kind:'set',value:{...archivedFacetPresets.para,name:'My PARA'}});
 assert.deepEqual(edited.wuxing.values.presets.newer,stored.wuxing.values.presets.newer);assert.deepEqual(stored,before);
});

test('rename/reorder/scoped updates retain stable categories and other presets',()=>{
 let stored=M.editViewConfigurationAt(definition,{}, {field:'presets',path:['para']},{kind:'set',value:{...archivedFacetPresets.para,name:'My projects'}});
 stored=M.editViewConfigurationAt(definition,stored,{field:'presets',path:['para','categories','projects','label']},{kind:'set',value:'Work'});
 stored=M.editViewConfigurationAt(definition,stored,{field:'presets',path:['para','order']},{kind:'set',value:['archives','resources','areas','projects']});
 assert.equal(library(stored).presets.para.categories.projects.label,'Work');assert.equal(library(stored).presets.wuxing.categories.water.values[0],'\u{1f535}');
 assert.equal(M.resolveFacetPreset(library(stored),'para').id,'para');assert.equal(stored.wuxing.values.presets.para.categories.projects.assignment,'projects');
});

test('explicit replacement is required for deletion and covers restored closed-canvas intent without a rewrite',()=>{
 const lib=library({});for(const replacement of [undefined,'wuxing','missing'])assert.throws(()=>M.replaceFacetPreset(lib,'wuxing',replacement));
 const replacement=M.replaceFacetPreset(lib,'wuxing','map-roles'),stored=M.editViewConfigurationAt(definition,{}, {field:'presets',path:['wuxing']},{kind:'set',value:replacement});
 const state={version:1,preset:'wuxing'},selection=M.resolveFacetPreset(library(stored),state.preset);
 assert.equal(selection.status,'replaced');assert.equal(selection.id,'map-roles');assert.deepEqual(state,{version:1,preset:'wuxing'});
 const cyclic={presets:{a:{version:1,replacement:'b'},b:{version:1,replacement:'a'}},order:['a','b']};
 assert.equal(M.resolveFacetPreset(cyclic,'a').status,'missing');
});

test('preset/category/JSON limits reject rather than truncate or erase configuration',()=>{
 const custom=count=>Object.fromEntries(Array.from({length:count},(_,i)=>['custom'+i,{...M.FACET_STATE_EXAMPLE,name:'State'+i}]));
 assert.equal(M.validFacetLibrary(custom(14)),true);assert.equal(M.validFacetLibrary(custom(15)),false);
 for(const preset of [{...archivedFacetPresets.arc,order:['add','relate']},{...archivedFacetPresets.arc,order:['add','relate','relate']},
  {...archivedFacetPresets.arc,spacing:Infinity},{...archivedFacetPresets.arc,start:'missing'}])assert.equal(M.isFacetPreset(preset),false);
 const raw={wuxing:{version:2,values:{presets:{future:{version:3,opaque:'x'.repeat(17000)}}}}},before=structuredClone(raw);
 assert.equal(available(raw).status,'unavailable');assert.deepEqual(raw,before);assert.throws(()=>M.editViewConfiguration(definition,raw,'presets',{}));
});

test('primitive/list aliases remain trimmed/exact and conflicts deduplicate within each category',()=>{
 const preset=M.FACET_TEMPLATES.wuxing;
 assert.deepEqual(M.classifyFacetValues(' water ',preset),{status:'assigned',category:'water'});
 assert.deepEqual(M.classifyFacetValues('Water',preset),{status:'unassigned'});
 assert.deepEqual(M.classifyFacetValues(['water','water'],preset),{status:'assigned',category:'water'});
 assert.deepEqual(M.classifyFacetValues(['water','metal'],preset),{status:'conflicting',categories:['metal','water']});
 assert.deepEqual(M.classifyFacetValues(undefined,preset),{status:'unassigned'});
 for(const raw of [{phase:'water'},['water',{}],Array(257).fill('water'),'w'.repeat(4097)])assert.deepEqual(M.classifyFacetValues(raw,preset),{status:'unresolved',reason:'unsupported'});
});

test('one explicit source uses bounded cached fields and distinguishes checking, cannot classify and known missing',()=>{
 let reads=0,fields=[],pending=false,status='available',raw='water';
 const read={properties:{read:(_id,field)=>{reads++;fields.push(field);return status==='available'?{status,value:raw}:{status}},availability:()=>status},scope:()=>({pending})};
 assert.deepEqual(M.classifyFacetNode(node,read,M.FACET_TEMPLATES.wuxing),{status:'assigned',category:'water'});assert.deepEqual(fields,['status']);
 raw=undefined;assert.deepEqual(M.classifyFacetNode(node,read,M.FACET_TEMPLATES.wuxing),{status:'unassigned'});
 status='unavailable';assert.deepEqual(M.classifyFacetNode(node,read,M.FACET_TEMPLATES.wuxing),{status:'unresolved',reason:'metadata'});
 pending=true;assert.deepEqual(M.classifyFacetNode(node,read,M.FACET_TEMPLATES.wuxing),{status:'checking'});
 status='unsupported';assert.deepEqual(M.classifyFacetNode(node,read,M.FACET_TEMPLATES.wuxing),{status:'unresolved',reason:'unsupported'});
 status='available';const before=reads;
 assert.deepEqual(M.classifyFacetNode(node,read,{...M.FACET_TEMPLATES.wuxing,source:'type'}),{status:'assigned',category:'water'});
 assert.deepEqual(M.classifyFacetNode(node,read,{...M.FACET_TEMPLATES.wuxing,source:'tag'}),{status:'assigned',category:'wood'});assert.equal(reads,before,'No property fallback from type/tag');
 assert.deepEqual(M.classifyFacetNode({...node,kind:'folder'},read,M.FACET_TEMPLATES.wuxing),{status:'unresolved',reason:'unsupported'});
});

/** Direct admitted canonical facts with no acquisition, body, write, or corpus capability. */
function scene(presetId='wuxing',count=8,presetOverride){
 // These existing geometry/status assertions characterize the retained separate-area mode.
 const preset={...(presetOverride??({...archivedFacetPresets,...M.FACET_TEMPLATES})[presetId]),diagnostics:{combined:false}},nodes=new Map(Array.from({length:count+1},(_,i)=>['N'+i,{...node,id:'N'+i}]));
 const work={fields:[],relations:0};const read={coverage:'cached',isCurrent:()=>true,node:id=>nodes.get(id)??null,compare:(a,b)=>a.id.localeCompare(b.id),
  relations:(id,role)=>{work.relations++;return{items:id==='N0'&&role==='child'?[...nodes.values()].slice(1).map(node=>({node,role,relationType:1,direction:1})):[],coverage:'cached',truncated:false}},
  properties:{read:(id,field)=>{work.fields.push([id,field]);return{status:'available',value:id==='N0'?preset.categories[preset.order[0]].values[0]:preset.categories[preset.order[Number(id.slice(1))%preset.order.length]].values[0]}},availability:()=> 'available'},
  scope:()=>({pending:false})};
 const configuration=available({wuxing:{version:2,values:{presets:{[presetId]:preset}}}});
 const projection=M.projectFacets({attention:'N0',maximum:count+1,state:{version:1,preset:presetId},configuration,read});
 const measured=projection.occurrences.map(row=>({id:row.id,width:row.id===projection.entry?600:240,height:row.id===projection.entry?700:40,
  expandedWidth:600,expandedReserve:0,mini:null,envelope:null,...(row.id===projection.entry?{badge:{width:120,height:24}}:{})}));
 return{preset,projection,measured,work,layout:(heights={})=>M.layoutFacets(projection,measured,presetId,preset,heights)};
}

test('twelve categories survive configuration admission and render in each compatible layout',()=>{
 const order=Array.from({length:12},(_,i)=>'category'+i);
 const preset={...M.FACET_TEMPLATES.wuxing,name:'Twelve',interpretation:undefined,flows:undefined,order,start:order[0],
  categories:Object.fromEntries(order.map(id=>[id,{label:id,values:[id],color:'#cccccc'}])),
  areaSizes:{categories:Object.fromEntries(order.map(id=>[id,{width:300,height:240}]))}};
 delete preset.interpretation;delete preset.flows;
 assert.equal(M.isFacetPreset(preset),true);
 for(const layout of ['circular','horizontal','vertical','concentric']){
  const f=scene('twelve',12,{...preset,layout}),result=f.layout();
  assert.equal(f.projection.occurrences.length,13);assert.equal(result.areas.filter(a=>order.some(id=>a.id===M.facetAreaId('twelve','category',id))).length,12);
  const regions=result.decorations.filter(mark=>mark.kind==='region');assert.equal(regions.length,14);
  assert.deepEqual([...f.layout().positions],[...result.positions]);
 }
 const invalid={...preset,order:[...order,'thirteenth'],categories:{...preset.categories,thirteenth:{label:'More',values:['more'],color:'#cccccc'}}};
 assert.equal(M.isFacetPreset(invalid),false,'The thirteenth category is rejected, never silently truncated');
});

test('Facets centers attention once, classifies unique direct neighbors once and retains canonical connectors',()=>{
 const f=scene('wuxing',12),p=f.projection;assert.equal(p.occurrences.filter(row=>row.nodeId==='N0').length,1);
 assert.equal(p.occurrences.find(row=>row.id===p.entry).areaId,undefined);assert(p.occurrences.find(row=>row.id===p.entry).badge);
 assert.equal(f.work.fields.length,13);assert(f.work.fields.every(([,field])=>field==='status'));assert.equal(f.work.relations,6);
 for(const edge of p.edges){assert.equal(edge.kind,'semantic');assert.equal(edge.sourceNode,'N0');assert.equal(p.occurrences.find(row=>row.id===edge.target).nodeId,edge.targetNode);assert.equal(edge.relation.node.id,edge.targetNode)}
 assert.equal(f.layout().positions.get(p.entry).x,0);assert.equal(f.layout().positions.get(p.entry).y,0);
});

test('large local incidence stops at the shared scene bound before excess property work',()=>{
 const f=scene('arc',3000);assert.equal(f.projection.occurrences.length,2048);assert.equal(f.work.fields.length,2048);
 assert.equal(f.projection.edges.length,2047);assert.equal(f.projection.truncated,true);
});

test('measured3/4/5/6/7 regions stay disjoint from one another and the expanded center/badge',()=>{
 const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
 const inHole=(shape,b)=>shape&&b.x>=shape.inner.x+shape.radius&&b.y>=shape.inner.y+shape.radius&&b.x+b.width<=shape.inner.x+shape.inner.width-shape.radius&&b.y+b.height<=shape.inner.y+shape.inner.height-shape.radius;
 const separated=(a,b)=>!overlaps(a.bounds,b.bounds)||inHole(a.shape,b.bounds)||inHole(b.shape,a.bounds);
 for(const id of M.FACET_TEMPLATE_ORDER){
  const f=scene(id,0),layout=f.layout(),center=layout.positions.get(f.projection.entry),body={x:center.x-center.width/2,y:center.y-center.height/2,width:center.width,height:center.height};
  const badge=M.nodeBadgeBounds(center,{width:120,height:24}),regions=layout.decorations.filter(mark=>mark.kind==='region');
  assert.equal(layout.areas.length,f.preset.order.length+2,'Empty categories plus compact Unassigned/Conflicting remain reachable');
  for(let i=0;i<regions.length;i++){
   assert(separated(regions[i],{bounds:body}),id+' center');assert(separated(regions[i],{bounds:badge}),id+' badge');
   for(let j=i+1;j<regions.length;j++)assert(separated(regions[i],regions[j]),id+' disjoint physical regions');
  }
  assert.equal(layout.decorations.filter(mark=>mark.kind==='guide').length,id==='wuxing'?10:id==='arc'?2:id==='publishing'?4:0);
  assert.deepEqual([...f.layout().positions],[...layout.positions],'Deterministic measured layout');
 }
});

test('dense overflow is bounded and preset/category-scoped area controls preserve the existing key budget',()=>{
 const f=scene('arc',180),first=M.facetAreaId('arc','category','add'),layout=f.layout({[first]:500});
 assert.equal(layout.areas.find(area=>area.id===first).bounds.height,500);
 assert(layout.areas.some(area=>area.viewport.contentHeight>area.viewport.height),'Dense rows remain in shared bounded scrollers');
 assert.equal(layout.positions.size,f.measured.length);for(const area of layout.areas)assert(area.viewport.height>0&&area.bounds.height<=1200);
 const other=scene('para',0);assert.equal(other.layout({[first]:500}).areas[0].bounds.height,280,'One preset does not inherit another preset override');
 const key=M.facetAreaId('p'.repeat(48),'category','c'.repeat(48));assert(key.length<=128);assert.notEqual(M.facetAreaId('a.b','category','c'),M.facetAreaId('a','category','b.c'));
 assert.notEqual(M.facetAreaId('arc','category','unassigned'),M.facetAreaId('arc','status','unassigned'),'Category names cannot collide with diagnostics');
});

test('shared badge validation/bounds keep labels, colors and optional geometry finite',()=>{
 assert.equal(M.validPlexNodeBadge({label:{literal:'Water'},background:{kind:'theme',variable:'--color-blue'}}),true);
 assert.equal(M.validPlexNodeBadge({label:{literal:'x'.repeat(81)}}),false);
 assert.equal(M.validPlexNodeBadge({label:{literal:'Water',key:'wuxing.water'}}),false);
 assert.equal(M.validPlexNodeBadge({label:{literal:'Water'},background:'url(https://invalid.example/)'}),false);
 assert.throws(()=>M.boundedViewColors(Array(257).fill('#ffffff')));
 const small=M.nodeBadgeBounds({x:20,y:40,width:200,height:100},{width:120,height:24}),expanded=M.nodeBadgeBounds({x:20,y:40,width:600,height:700},{width:120,height:24});
 assert.deepEqual(small,{x:-80,y:-46,width:120,height:24});assert.equal(expanded.x,-280);assert.equal(expanded.y,-346);
 assert.throws(()=>M.nodeBadgeBounds({x:0,y:0,width:NaN,height:100},{width:100,height:20}));
});

test('status regions resize independently beyond their compact defaults and retain measured separation',()=>{
 const f=scene('wuxing',3),unresolved=M.facetAreaId('wuxing','status','unresolved');
 f.projection.occurrences.find(row=>row.id!==f.projection.entry).areaId=unresolved;
 const initial=f.layout(),categoryRight=Math.max(...initial.areas.filter(area=>area.id.includes('"category"')).map(area=>area.bounds.x+area.bounds.width));
 for(const status of ['unassigned','conflicting','unresolved']){
  const id=M.facetAreaId('wuxing','status',status),area=initial.areas.find(area=>area.id===id);
  assert.equal(area.resizeEdge,'bottom');assert.deepEqual(area.heightPreference,{key:id,minimum:160,maximum:1200});
  assert.equal(area.bounds.height,220);assert(area.bounds.x-categoryRight>=160);
  assert.equal(f.layout({[id]:480}).areas.find(area=>area.id===id).bounds.height,480);
  assert.equal(f.layout({[id]:180}).areas.find(area=>area.id===id).bounds.height,180);
 }
 const heights=Object.fromEntries(['unassigned','conflicting','unresolved'].map((status,index)=>[M.facetAreaId('wuxing','status',status),400+index*100]));
 const resized=f.layout(heights),statuses=resized.areas.filter(area=>area.id.includes('"status"'));
 for(let index=1;index<statuses.length;index++)assert(statuses[index].bounds.y>=statuses[index-1].bounds.y+statuses[index-1].bounds.height+20);
 assert.deepEqual(resized.positions.get(f.projection.entry),initial.positions.get(f.projection.entry));
 assert(M.layoutFacets(f.projection,f.measured,'wuxing',f.preset,{},false).areas.every(area=>!area.heightPreference),'Unavailable intent remains read-only');
});

test('a wide measured badge contributes its complete envelope to region separation',()=>{
 const f=scene('wuxing',0),size=f.measured.find(row=>row.id===f.projection.entry);size.badge={width:1400,height:48};
 const layout=f.layout(),badge=M.nodeBadgeBounds(layout.positions.get(f.projection.entry),size.badge);
 for(const mark of layout.decorations.filter(mark=>mark.kind==='region')){
  const b=mark.bounds;assert.equal(badge.x<b.x+b.width&&badge.x+badge.width>b.x&&badge.y<b.y+b.height&&badge.y+badge.height>b.y,false);
 }
});

test('Wu Xing relative regions follow all25 phase pairs, independent of category order',()=>{
 const cycle=['wood','fire','earth','metal','water'],keys=['Same','Generate','Regulate','Regulated','Generated'];
 const preset=M.FACET_TEMPLATES.wuxing;
 for(const [i,focus]of cycle.entries())for(const [j,target]of cycle.entries()){
  const f=scene('wuxing',0);f.projection.occurrences[0].groupingPartition=M.facetAreaId('wuxing','category',focus);
  const layout=M.layoutFacets(f.projection,f.measured,'wuxing',{...preset,order:['metal','earth','wood','water','fire']});
  const region=layout.decorations.find(mark=>mark.id===M.facetAreaId('wuxing','category',target));
  assert.equal(region.description.key,'facets.relative'+keys[(j-i+5)%5]);
 }
});

test('Wood to Metal focus changes only the model reading, preserving phase assignments and canonical evidence',()=>{
 const phases=['wood','fire','earth','metal','water'],nodes=new Map(phases.map(id=>[id,Object.freeze({id,kind:'document',path:id+'.md',name:id,file:{extension:'md'}})]));
 const values=new Map(phases.map(id=>[id,{status:'available',value:id}]));let reads=0;
 const relations=new Map(phases.map(id=>[id,phases.filter(other=>other!==id).map(other=>Object.freeze({node:nodes.get(other),role:'child',relationType:1,direction:1,definition:'Recorded'}))]));
 const before=JSON.stringify([...relations]),beforeValues=JSON.stringify([...values]),preset=M.FACET_TEMPLATES.wuxing;
 const read={coverage:'cached',isCurrent:()=>true,node:id=>nodes.get(id),compare:(a,b)=>a.id.localeCompare(b.id),scope:()=>({pending:false}),
  relations:(id,role)=>({items:role==='child'?relations.get(id):[],coverage:'cached',truncated:false}),
  properties:{read:id=>{reads++;return values.get(id)},availability:()=> 'available'}};
 const project=attention=>M.projectFacets({attention,maximum:20,state:{version:1,preset:'wuxing'},configuration:available({}),read});
 const render=p=>M.layoutFacets(p,p.occurrences.map(row=>({id:row.id,width:240,height:40,mini:null,envelope:null})),'wuxing',preset);
 const wood=project('wood'),metal=project('metal');assert.equal(reads,10,'One classified field per unique occurrence');
 const descriptions=p=>Object.fromEntries(render(p).decorations.filter(row=>row.kind==='region'&&row.description).map(row=>[JSON.parse(row.id)[3],row.description.key]));
 assert.deepEqual(descriptions(wood),{water:'facets.relativeGenerated',wood:'facets.relativeSame',fire:'facets.relativeGenerate',earth:'facets.relativeRegulate',metal:'facets.relativeRegulated'});
 assert.deepEqual(descriptions(metal),{water:'facets.relativeGenerate',wood:'facets.relativeRegulate',fire:'facets.relativeRegulated',earth:'facets.relativeGenerated',metal:'facets.relativeSame'});
 for(const p of [wood,metal])for(const row of p.occurrences)assert.equal(row.groupingPartition,M.facetAreaId('wuxing','category',row.nodeId));
 for(const p of [wood,metal])for(const edge of p.edges){assert.equal(edge.kind,'semantic');assert(relations.get(p.attention).includes(edge.relation));assert.equal(edge.relation.definition,'Recorded');}
 assert.equal(JSON.stringify([...relations]),before);assert.equal(JSON.stringify([...values]),beforeValues);
 for(const result of [{status:'available',value:undefined},{status:'available',value:['wood','metal']},{status:'unavailable'},{status:'unsupported'}]){
  values.set('wood',result);const projection=project('wood'),layout=render(projection);
  assert.equal(layout.decorations.filter(row=>row.description?.key==='facets.relativeUnavailable').length,5);
  assert.equal(projection.edges.length,4,'Unavailable phases never remove recorded connectors');
 }
});

test('cycle guides remain bounded optional phase decorations without note endpoints or action authority',()=>{
 const f=scene('wuxing',10),before=JSON.stringify(f.projection.edges),layout=f.layout(),guides=layout.decorations.filter(row=>row.kind==='guide');
 assert.equal(guides.filter(row=>row.variant==='generating').length,5);assert.equal(guides.filter(row=>row.variant==='regulating').length,5);
 for(const guide of guides){assert(guide.directed);assert(guide.points.length<=32);assert(!('relation'in guide));assert(!('sourceNode'in guide));assert(!('dropTarget'in guide));}
 const generating=guides.find(row=>row.id==='facets-guide-1-wood-fire'),regulating=guides.find(row=>row.id==='facets-guide-2-wood-earth');assert(generating&&regulating);
 for(const point of regulating.points)assert(Math.hypot(point.x,point.y)>100,'Regulating guides stay outside the centered editor');
 assert.equal(JSON.stringify(f.projection.edges),before);assert.equal(f.work.fields.length,11);
 for(const preset of [{...f.preset,relativeLabels:false},{...f.preset,interpretation:undefined}])assert(M.layoutFacets(f.projection,f.measured,'wuxing',preset).decorations.every(row=>!row.description));
 assert.equal(M.layoutFacets(f.projection,f.measured,'wuxing',{...f.preset,guides:false}).decorations.filter(row=>row.kind==='guide').length,0);
 assert.equal(M.layoutFacets(f.projection,f.measured,'wuxing',{...f.preset,regulatingGuides:false}).decorations.filter(row=>row.kind==='guide').length,5);
});
