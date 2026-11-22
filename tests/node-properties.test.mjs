/** Display-only properties exercise actual loading, cached reads, all scene owners and geometry. */
import assert from 'node:assert/strict';import test from 'node:test';
import {plexViewModules,classicFixture,viewPage} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/core/plex/nodeProperties.ts','src/adapters/obsidian/nodeProperties.ts','src/core/graph/settingsPolicy.ts','src/ui/plexViews/measurement.ts','src/ui/plexViews/prepareScene.ts','src/core/plex/views/mindmap/definition.ts','src/core/plex/views/wuxing/definition.ts']);
const fields=[{field:'title',visible:true},{field:'private',visible:false},{field:'company',visible:true}];

test('common properties default Alias to creation only and retain explicit saved choices without semantic work',()=>{
 const fresh=M.migrateAndMergeSettings({sentinel:{keep:true}});
 assert.deepEqual(fresh.commonNodeProperties,[{field:'aliases',visible:false,creationVisible:true}]);
 assert.deepEqual(M.migrateAndMergeSettings({commonNodeProperties:[]}).commonNodeProperties,[]);
 const common=[{field:'Name',visible:true,creationVisible:false,showName:true,label:'Display name',icon:'user'}];
 const loaded=M.migrateAndMergeSettings({...fresh,commonNodeProperties:common});
 assert.deepEqual(loaded.commonNodeProperties,common);assert.deepEqual(M.migrateAndMergeSettings(JSON.parse(JSON.stringify(loaded))).commonNodeProperties,common);
 assert.deepEqual(loaded.sentinel,{keep:true});
 const effects=M.classifySettingsChange(M.captureSettingsPolicy(fresh),M.captureSettingsPolicy(loaded));
 assert.equal(effects.semanticInvalidation,false);assert.equal(effects.presentationFacets,false);assert.equal(effects.searchTerms,false);assert.equal(effects.render,true);
 assert.deepEqual(effects.changedKeys,['commonNodeProperties']);
});

test('common and type definitions merge once in common order with independent creation and display flags',()=>{
 const common=[{field:'aliases',visible:false,creationVisible:true},{field:'Company',visible:true,creationVisible:true,label:'Employer',showName:true,icon:'building'}];
 const type=[{field:'company',visible:false,creationVisible:false,icon:'🏢'},{field:'number',visible:true}];
 const merged=M.mergedNodePropertyRows(common,type);
 assert.deepEqual(merged,[common[0],{...common[1],...type[0]},type[1]]);
 assert.notEqual(merged[0],common[0]);assert.deepEqual(common[1].icon,'building');
 assert.deepEqual(M.nodePropertyLines(null,{},()=> 'Other name',common.slice(0,1)),[]);
 const read=[];assert.deepEqual(M.nodePropertyLines('person',{person:type},field=>{read.push(field);return 42},common),[{field:'number',text:'42'}]);assert.deepEqual(read,['number']);
 const aliasType=[{field:'aliases',visible:true}];assert.deepEqual(M.nodePropertyLines('person',{person:aliasType},()=> 'Authored alias',common.slice(0,1)),[{field:'aliases',text:'Authored alias'}]);
 const fullCommon=Array.from({length:16},(_,index)=>({field:'common'+index,visible:false})),fullType=Array.from({length:16},(_,index)=>({field:'type'+index,visible:true}));
 assert.equal(M.mergedNodePropertyRows(fullCommon,fullType).length,32);assert.equal(M.nodePropertyLines('person',{person:fullType},()=> 'value',fullCommon).length,16);
});

test('labels and icons are opt-in inert presentation and load without changing legacy value-only rows',()=>{
 const rows=[{field:'number',visible:true,showName:true,label:'Translated heading 🧭',icon:'🏷️'},{field:'date',visible:true,icon:'calendar'},{field:'empty',visible:true,showName:true}];
 const configuration=M.loadNoteTypeProperties({Person:rows});assert.deepEqual(configuration,{person:rows});
 assert.deepEqual(M.nodePropertyLines('person',configuration,field=>({number:0,date:'2026-11-22',empty:null})[field]),[
  {field:'number',text:'0',label:'Translated heading 🧭',icon:'🏷️'},{field:'date',text:'2026-11-22',icon:'calendar'}]);
 const rowsWithDefaultName=[{field:'Amount',visible:true,showName:true}];assert.deepEqual(M.nodePropertyLines(null,{},()=>false,rowsWithDefaultName),[{field:'Amount',text:'false',label:'Amount'}]);
 assert.equal(M.validNodeProperties([{field:'x',visible:true,label:'x\ny'}]),false);assert.equal(M.validNodeProperties([{field:'x',visible:true,showName:'yes'}]),false);
 const value={field:'number',text:'42'},rich={...value,label:'A long translated label',icon:'compass'};
 assert(M.nodePropertyLineWidth(rich,12)>M.nodePropertyLineWidth(value,12));
 assert.equal(M.nodePropertyLineWidth({...value,label:'中文'},12)-M.nodePropertyLineWidth(value,12),12*2+12*.55+4);
});

test('global property font size is bounded, persisted and presentation-only',()=>{
 for(const [input,expected] of [[undefined,12],[NaN,12],['18',12],[2,8],[40,20],[9,9],[13,13]])assert.equal(M.migrateAndMergeSettings({propertyFontSize:input}).propertyFontSize,expected);
 const small=M.migrateAndMergeSettings({propertyFontSize:8,sentinel:{keep:1}}),large=M.migrateAndMergeSettings({...small,propertyFontSize:20});
 assert.equal(M.migrateAndMergeSettings(JSON.parse(JSON.stringify(large))).propertyFontSize,20);assert.deepEqual(large.sentinel,{keep:1});
 const effects=M.classifySettingsChange(M.captureSettingsPolicy(small),M.captureSettingsPolicy(large));
 assert.equal(effects.semanticInvalidation,false);assert.equal(effects.presentationFacets,false);assert.equal(effects.render,true);assert.deepEqual(effects.changedKeys,['propertyFontSize']);
 const measure=(settings,details=[])=>M.nodeSize('Person',18,settings,true,30,400,1,details),details=[{field:'company',text:'Long company name'}];
 assert.deepEqual(measure(small),measure(large));assert(measure(large,details).height>measure(small,details).height);assert(measure(large,details).width>=measure(small,details).width);
});

test('property configuration round-trips with unknown settings and never affects semantic policy',()=>{
 const settings=M.migrateAndMergeSettings({sentinel:{future:7},noteTypeProperties:{person:fields}});
 assert.deepEqual(settings.noteTypeProperties,{person:fields});assert.deepEqual(M.migrateAndMergeSettings(JSON.parse(JSON.stringify(settings))).sentinel,{future:7});
 assert.deepEqual(M.migrateAndMergeSettings({}).noteTypeProperties,{});
 const effects=M.classifySettingsChange(M.captureSettingsPolicy({...settings,noteTypeProperties:{}}),M.captureSettingsPolicy(settings));
 assert.equal(effects.semanticInvalidation,false,JSON.stringify(effects.changedKeys));assert.equal(effects.presentationFacets,false);assert.equal(effects.nodeVisuals,false);assert.equal(effects.render,true);
 assert.deepEqual(effects.changedKeys,['noteTypeProperties']);
 const malformed=M.loadNoteTypeProperties({person:[{field:' title ',visible:true},{field:'TITLE',visible:false},{field:'',visible:true},{field:'bad',visible:'yes'},null]});
 assert.deepEqual(malformed,{person:[{field:'title',visible:true}]});assert.equal(M.validNodeProperties([{field:'title',visible:true},{field:'TITLE',visible:false}]),false);
 assert.equal(M.validNodeProperties(Array.from({length:17},(_,i)=>({field:String(i),visible:true}))),false);
});

test('only selected visible fields are read; scalar/list values are bounded inert text',()=>{
 const reads=[],values={title:'  Full sentence\nwith detail ',company:['Microsoft',0,false,null,{secret:'never'}],private:'SECRET'};
 assert.deepEqual(M.nodePropertyLines('person',{person:fields},field=>{reads.push(field);return values[field]}),[{field:'title',text:'Full sentence with detail'},{field:'company',text:'Microsoft, 0, false'}]);assert.deepEqual(reads,['title','company']);
 assert.deepEqual(M.nodePropertyLines('other',{person:fields},()=>{throw Error('Unconfigured type read')}),[]);
 assert.deepEqual(M.nodePropertyLines('person',{person:[{field:'private',visible:false}]},()=>{throw Error('Hidden field read')}),[]);
 for(const value of [null,undefined,{},[],NaN,' \n '])assert.deepEqual(M.nodePropertyLines('person',{person:[fields[0]]},()=>value),[]);
 assert.equal(M.nodePropertyLines('person',{person:[fields[0]]},()=>'<script>text</script>'+ 'x'.repeat(2000))[0].text.length,512);
});

test('native-cache adapter never reads bodies, fences file identity and avoids hidden/default lookups',()=>{
 let gets=0;const page=viewPage('Person.md');page.noteType='person';page.file.stat={mtime:1,size:10,ctime:1};let file=page.file;
 const cache={frontmatter:{Title:'Sentence',company:'Microsoft',get private(){throw Error('Private property read')}}};
 const app={vault:{getFileByPath:()=>file,read:()=>{throw Error('Body read')}},metadataCache:{getFileCache:()=>{gets++;return cache}}};
 assert.deepEqual(M.nodePropertyReader(app,{})(page),[]);assert.equal(gets,0);
 const reader=M.nodePropertyReader(app,{person:fields});const lines=reader(page);assert.deepEqual(lines,[{field:'title',text:'Sentence'},{field:'company',text:'Microsoft'}]);const count=gets;assert.equal(reader(page),lines);assert.equal(gets,count);
 file={...file,stat:{...file.stat}};assert.deepEqual(M.nodePropertyReader(app,{person:fields})(page),[]);
 const noCache={...app,vault:{getFileByPath:()=>page.file},metadataCache:{getFileCache:()=>null}};assert.deepEqual(M.nodePropertyReader(noCache,{person:fields})(page),[]);
});

test('common details work without a note type and never read hidden Alias or acquire sources',()=>{
 const page=viewPage('No type.md');page.file.stat={mtime:1,size:10};let reads=0;
 const cache={frontmatter:{aliases:['Title'],rating:5}};
 const app={vault:{getFileByPath:()=>page.file,read:()=>{throw Error('Body read')}},metadataCache:{getFileCache:()=>{reads++;return cache}}};
 const common=[{field:'aliases',visible:false,creationVisible:true},{field:'rating',visible:true,showName:true,icon:'star'}];
 assert.deepEqual(M.nodePropertyReader(app,{},common)(page),[{field:'rating',text:'5',label:'rating',icon:'star'}]);assert(reads>0);
});

test('type refinements read canonical spaced/hyphenated property identity and refuse ambiguous native keys',()=>{
 const page=viewPage('Person.md');page.file.stat={mtime:1,size:10};page.noteType='person';
 const cache={frontmatter:{'Full Name':'Ada'}},app={vault:{getFileByPath:()=>page.file},metadataCache:{getFileCache:()=>cache}};
 const common=[{field:'Full Name',visible:true}],types={person:[{field:'full-name',visible:true,showName:true,label:'Name'}]};
 assert.deepEqual(M.nodePropertyReader(app,types,common)(page),[{field:'full-name',text:'Ada',label:'Name'}]);
 cache.frontmatter['full-name']='Conflicting';assert.deepEqual(M.nodePropertyReader(app,types,common)(page),[]);
});

test('Compass measures extra lines before positioning and invalidates geometry on visible value changes',()=>{
 const f=classicFixture(M),plain=M.buildScene(f.neighborhood,f.index,f.settings,false,undefined,true);
 let text='Microsoft';const detailsFor=()=>[{field:'company',text}],reader={...f.index,detailsFor};
 const rich=M.buildScene(f.neighborhood,reader,f.settings,false,undefined,true);
 for(const node of rich.nodes){const original=plain.nodes.find(n=>n.page.path===node.page.path);assert(node.height>original.height);assert.equal(node.label,original.label);assert.equal(node.propertyLines[0].text,text);}
 const key=M.neighborhoodSceneKey(f.neighborhood,reader,f.settings);text='New company';assert.notEqual(M.neighborhoodSceneKey(f.neighborhood,reader,f.settings),key);
 const withEditor=M.buildScene(f.neighborhood,reader,f.settings,false,{width:580,height:340},true);assert.equal(withEditor.nodes.find(n=>n.role==='center').height,340);
});

for(const definition of [M.mindMapViewDefinition,M.wuXingViewDefinition])test(`${definition.id} uses measured property lines without changing topology`,()=>{
 const pages=new Map(['A','B'].map(path=>{const p=viewPage(path);p.file.stat={mtime:1,size:1,ctime:1};return[path,p]}));
 const source={get:id=>pages.get(id),titleFor:p=>p.name,isVisiblePage:()=>true,captureSemanticGateRead:()=>({isCurrent:()=>true}),neighbours:(p,role)=>p.path==='A'&&role==='child'?[{page:pages.get('B'),role,relationType:1,linkDirection:1}]:[],sortNeighbours:rows=>rows,viewScopeCoverage:()=>({coverage:'local',prepared:true,complete:true,pending:false}),explainRelationship:()=>null};
 const settings=M.migrateAndMergeSettings({groupRelations:false});const prepare=input=>M.prepareViewScene(definition,M.plexViewRead(source,()=>true,32,'A',256),input,'A',null,settings,()=>true);
 const plain=prepare(source),rich=prepare({...source,detailsFor:()=>[{field:'title',text:'A useful description'}]});assert.equal(plain.failure,false);assert.equal(rich.failure,false);
 assert.deepEqual(rich.scene.edges.map(e=>e.id),plain.scene.edges.map(e=>e.id));
 for(const node of rich.scene.nodes){const old=plain.scene.nodes.find(n=>n.occurrenceId===node.occurrenceId);assert(node.height>old.height);assert.equal(node.propertyLines.length,1);}
});

test('Compass, Mindmap and Facets reserve visible label/icon/value width for short titles without semantic preparation',()=>{
 const plain=[{field:'amount',text:'42'}],rich=[{field:'amount',text:'42',label:'Very long translated label 中文',icon:'🧭'}];
 const f=classicFixture(M);
 const compass=lines=>M.buildScene(f.neighborhood,{...f.index,detailsFor:()=>lines},f.settings,false,undefined,true);
 const scenes=[[compass(plain),compass(rich)]];
 for(const definition of [M.mindMapViewDefinition,M.wuXingViewDefinition]){
  const page=viewPage('A');page.file.stat={mtime:1,size:1};
  const source={get:id=>id==='A'?page:undefined,titleFor:()=> 'A',isVisiblePage:()=>true,captureSemanticGateRead:()=>({isCurrent:()=>true}),neighbours:()=>[],sortNeighbours:rows=>rows,viewScopeCoverage:()=>({coverage:'local',prepared:true,complete:true,pending:false}),explainRelationship:()=>null};
  const prepare=lines=>M.prepareViewScene(definition,M.plexViewRead(source,()=>true,32,'A',256),{...source,detailsFor:()=>lines},'A',null,f.settings,()=>true).scene;
  scenes.push([prepare(plain),prepare(rich)]);
 }
 for(const [before,after] of scenes){
  assert.deepEqual(after.edges.map(edge=>edge.id),before.edges.map(edge=>edge.id));
  for(const node of after.nodes){const previous=before.nodes.find(row=>row.page.path===node.page.path);assert(node.width>previous.width);assert.equal(node.height,previous.height);assert.equal(node.propertyLines[0].label,rich[0].label);}
 }
});
