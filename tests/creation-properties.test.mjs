/** Real creation-value projection and staged native mutation, including captured host write lifetimes.
 * The finite native tag lexer is supplied only at Obsidian's documented parser boundary. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import ts from 'typescript';

const source=ts.createSourceFile('main.ts',readFileSync('src/main.ts','utf8'),ts.ScriptTarget.Latest,true);
const methods=[],methodNames=new Set(['applyNewNoteCreationMetadata','updateCommonNodeProperties']);
/** Extract the production host method so tests exercise its real queue and identity checks. */
const visit=node=>{if(ts.isMethodDeclaration(node)&&methodNames.has(node.name.getText(source)))methods.push(node.getText(source));ts.forEachChild(node,visit)};
visit(source);assert.equal(methods.length,methodNames.size);
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'ts',contents:`
 export * from './src/application/creationProperties';
 export * from './src/adapters/obsidian/creationProperties';
 export * from './src/core/plex/nodeProperties';
 import {normalizeFieldName} from './src/core/contracts/fieldName';
 import {applyCreationProperties} from './src/adapters/obsidian/creationProperties';
 import {validNodeProperties} from './src/core/plex/nodeProperties';
 import {captureSettingsPolicy} from './src/core/graph/settingsPolicy';
 import * as appearanceThemes from './src/core/plex/appearanceThemes';
 export class CreationHost {${methods.join('\n')}}
`},write:false,bundle:true,format:'cjs',platform:'node',plugins:[{name:'native-tag-parser',setup(builder){
 builder.onResolve({filter:/^obsidian$/},()=>({path:'native',namespace:'tags'}));
 builder.onLoad({filter:/.*/,namespace:'tags'},()=>({contents:`export const parseFrontMatterTags=fm=>{const value=fm.tags;return Array.isArray(value)?value.map(tag=>'#'+tag.replace(/^#/,'')):typeof value==='string'?value.split(/[ ,]+/).filter(Boolean).map(tag=>'#'+tag.replace(/^#/,'')):null};`}));
}}]});
const module={exports:{}};Function('module','exports',bundle.outputFiles[0].text)(module,module.exports);const M=module.exports;

/** A current type supplies refinements; stale type-only drafts are intentionally absent from the output. */
test('common/type creation drafts retain shared values once and omit unset, hidden and obsolete fields',()=>{
 const common=[{field:'Company',visible:false,creationVisible:true},{field:'aliases',visible:false,creationVisible:true}];
 const type=[{field:'company',visible:true,label:'Employer'},{field:'rating',visible:false},{field:'hidden',visible:true,creationVisible:false}];
 const rows=M.mergedNodePropertyRows(common,type),drafts={company:'  ACME  ',aliases:'Public name',rating:'0',hidden:'never',obsolete:'never'};
 assert.deepEqual(M.creationPropertyValues(rows,drafts,field=>field==='rating'?'number':field==='aliases'?'list':'text'),[
  {field:'company',value:'ACME'},{field:'aliases',value:['Public name']},{field:'rating',value:0}]);
 assert.deepEqual(M.creationPropertyValues([{field:'checkbox',visible:true}],{checkbox:'false'},()=> 'checkbox'),[{field:'checkbox',value:false}]);
 assert.deepEqual(M.creationPropertyValues([{field:'checkbox',visible:true}],{checkbox:''},()=> 'checkbox'),[]);
 assert.deepEqual(M.creationPropertyValues([{field:'checkbox',visible:true}],{},()=>{throw Error('Unset widget read')}),[]);
 assert.equal(drafts.hidden,'never');assert.equal(common[0].field,'Company');
});

for(const [kind,valid,invalid] of [
 ['number',['0','-3.5','.25','1e3'],['NaN','Infinity','0x10','1e309','1,2']],
 ['checkbox',['true','false'],['1','yes','False']],
 ['date',['2024-02-29','2000-02-29','2026-11-22'],['2026-02-29','1900-02-29','2026-04-31','2026-13-01','2026-00-01','0000-01-01']],
 ['datetime-local',['2024-02-29T23:59','2026-11-22T00:00:59'],['2026-02-29T12:00','2026-11-22T24:00','2026-11-22T23:60','2026-11-22T12:00:60','2026-11-22T12:00Z']],
])test(`${kind} creation values validate without coercing invalid calendar or scalar input`,()=>{
 const rows=[{field:'value',visible:true}];
 for(const value of valid)assert.equal(M.creationPropertyValues(rows,{value},()=>kind).length,1,value);
 for(const value of invalid)assert.throws(()=>M.creationPropertyValues(rows,{value},()=>kind),/value/,value);
});

test('list values keep individual lines and runtime value guards reject complex, sparse and nonfinite data',()=>{
 assert.deepEqual(M.creationPropertyValues([{field:'list',visible:true}],{list:' One \r\n\n Two, with comma \n'},()=> 'list'),[{field:'list',value:['One','Two, with comma']}]);
 for(const value of [null,undefined,{},NaN,Infinity,[1],['valid',{}],[['nested']],Array(1)])assert.equal(M.supportedCreationPropertyValue(value),false);
 for(const value of ['',false,0,[],['x']])assert.equal(M.supportedCreationPropertyValue(value),true);
});

test('creation property widgets use the existing native registry and built-in alias/tag types',()=>{
 const widgets={n:'number',check:'checkbox',date:'date',time:'datetime',list:'multitext',url:'text',future:'future'};
 const app={metadataTypeManager:{getAssignedWidget:field=>widgets[field]}};
 for(const [field,kind] of Object.entries({n:'number',check:'checkbox',date:'date',time:'datetime-local',list:'list',url:'text',future:'text',aliases:'list',Alias:'list',Tags:'list'}))assert.equal(M.creationPropertyKind(app,field),kind);
 assert.equal(M.creationPropertyKind({metadataTypeManager:{getPropertyInfo:()=>({widget:'number'})}},'old'),'number');assert.equal(M.creationPropertyKind({},'other'),'text');
});

test('explicit metadata overrides only edited fields, appends aliases and type membership, and preserves template spelling/order',()=>{
 const untouched={nested:['kept']},fm={Title:'Template title',Alias:['Template alias'],Tags:['existing'],'Note type':'old',untouched};
 M.applyCreationProperties(fm,{noteType:'project',properties:[{field:'title',value:'Authored title'},{field:'aliases',value:['Authored alias']},{field:'tags',value:['#work']} ]},'Note type','invalid');
 assert.deepEqual(fm,{Title:'Authored title',Alias:['Template alias','Authored alias'],Tags:['existing','work','project'],'Note type':'project',untouched});
 assert.equal(fm.untouched,untouched);assert.deepEqual(Object.keys(fm),['Title','Alias','Tags','Note type','untouched']);
 assert(!Object.hasOwn(fm,'tags'));assert(!Object.hasOwn(fm,'aliases'));
 const before=JSON.stringify(fm);M.applyCreationProperties(fm,{noteType:null,properties:[]},'Note type','invalid');assert.equal(JSON.stringify(fm),before);
});

test('a configured Name field writes Name while Alias semantics remain independent from filename and display labels',()=>{
 const fm={};M.applyCreationProperties(fm,{noteType:null,properties:[{field:'Name',value:'Metadata name'}]},'Note type','invalid');
 assert.deepEqual(fm,{Name:'Metadata name'});assert.deepEqual(Object.keys(fm),['Name']);
});

test('staging rejects conflicts, malformed values and unsafe property identities before publishing any field',()=>{
 const badDrafts=[
  [{field:'color',value:'a'},{field:'COLOR',value:'b'}],
  [{field:'aliases',value:['a']},{field:'alias',value:['b']}],
  [{field:'position',value:'x'}],[{field:'__proto__',value:'x'}],[{field:'constructor',value:'x'}],
  [{field:'Note type',value:'x'}],[{field:'a\nb',value:'x'}],[{field:'',value:'x'}],
  [{field:'complex',value:{nested:1}}],[{field:'complex',value:[1]}],[{field:'number',value:Infinity}],
  [{field:'tags',value:['[[bad link]]']}],
  [{field:'tags',value:false}],[{field:'aliases',value:42}],
 ];
 for(const properties of badDrafts){const fm={unchanged:['keep']},before=JSON.stringify(fm);assert.throws(()=>M.applyCreationProperties(fm,{noteType:null,properties:[{field:'first',value:'staged'},...properties]},'Note type','invalid'),/invalid/);assert.equal(JSON.stringify(fm),before)}
 for(const fm of [{Color:'a',color:'b'},{aliases:'a',Alias:'b'},{tags:['a'],Tags:['b']}]){
  const before=JSON.stringify(fm),field=Object.keys(fm)[0];assert.throws(()=>M.applyCreationProperties(fm,{noteType:null,properties:[{field,value:'new'}]},'Note type','invalid'),/invalid/);assert.equal(JSON.stringify(fm),before);
 }
 const fm={tags:{future:1},untouched:'yes'},before=JSON.stringify(fm);assert.throws(()=>M.applyCreationProperties(fm,{noteType:'person',properties:[{field:'first',value:'staged'}]},'Note type','invalid'),/invalid/);assert.equal(JSON.stringify(fm),before);
});

/** Controlled native callback delay models FileManager's queue; only the real method authorizes the write. */
function creationHost(){
 const file={path:'new.md',extension:'md'},fm={aliases:['Template']},host=new M.CreationHost();let native=file,callback,finish;
 const pending=new Promise(resolve=>{finish=resolve});
 Object.assign(host,{unloading:false,settings:{noteTypeField:'Note type'},translator:key=>key,app:{vault:{getFileByPath:()=>native,create:()=>{throw Error('Duplicate creation')}}},
  index:{withForegroundPriority:run=>run()},mutateCreatedNodeMetadata:async(_file,fields,mutate)=>{callback={fields,mutate};await pending;mutate(fm)}});
 return{host,file,fm,get callback(){return callback},release:()=>finish(),replace:()=>{native={...file}}};
}

test('host captures explicit arrays before awaiting and mutates only the retained new file',async()=>{
 const f=creationHost(),aliases=['Authored'],draft={noteType:'project',properties:[{field:'aliases',value:aliases}]};
 const saving=f.host.applyNewNoteCreationMetadata(f.file,draft,()=>true);aliases.push('Late mutation');f.release();await saving;
 assert.deepEqual(f.fm,{aliases:['Template','Authored'],'Note type':'project',tags:['project']});assert.deepEqual([...f.callback.fields].sort(),['aliases','note-type','tags']);
});

for(const reason of ['view','rename','replace','unload','type-field'])test(`queued creation metadata refuses ${reason} retirement without touching the note`,async()=>{
 const f=creationHost();let current=true;
 const saving=f.host.applyNewNoteCreationMetadata(f.file,{noteType:'project',properties:[{field:'Name',value:'Authored'}]},()=>current);
 if(reason==='view')current=false;if(reason==='rename')f.file.path='renamed.md';if(reason==='replace')f.replace();if(reason==='unload')f.host.unloading=true;if(reason==='type-field')f.host.settings.noteTypeField='Other type';
 f.release();await assert.rejects(saving,/addRelated.endpointChanged/);assert.deepEqual(f.fm,{aliases:['Template']});
});

test('non-Markdown and entirely unset drafts never enter a native metadata callback',async()=>{
 for(const [extension,draft] of [['svg',{noteType:'project',properties:[]}],['md',{noteType:null,properties:[]}]]){
  const f=creationHost();f.file.extension=extension;await f.host.applyNewNoteCreationMetadata(f.file,draft,()=>true);assert.equal(f.callback,undefined);assert.deepEqual(f.fm,{aliases:['Template']});
 }
});

/** A controlled persistence port exposes the queued method's real admission/publication behavior. */
function commonPropertyHost(){
 const opening=[{field:'aliases',visible:false,creationVisible:true}],host=new M.CreationHost(),writes=[];let admit,notifications=0;
 Object.assign(host,{settings:{commonNodeProperties:opening,unknown:{future:['preserve']},noteTypeField:'Note type',hierarchy:{parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[],hidden:[],exclusions:[]},baseNodeStyle:{},tagStyleList:[]},
  translator:key=>key,settingsForWrite:()=>host.settings,
  enqueueSettingsWrite:run=>new Promise((resolve,reject)=>{admit=()=>Promise.resolve().then(run).then(resolve,reject)}),
  settingsSnapshotForPersistence:(_preferences,settings)=>structuredClone(settings),writeSettingsSnapshot:async value=>{writes.push(value)},
  index:{notifyPresentation:()=>{notifications++},prepareRelationshipPair:()=>{throw Error('Presentation requested source preparation')}}});
 return{host,opening,writes,release:()=>admit(),get notifications(){return notifications}};
}

test('common-property save merges latest unknown settings, publishes after storage and notifies presentation only',async()=>{
 const f=commonPropertyHost(),rows=[{field:'Name',visible:true,creationVisible:false,showName:true,icon:'user'}];
 const saving=f.host.updateCommonNodeProperties(f.opening,rows,()=>true);
 f.host.settings={...f.host.settings,unknown:{future:['newly received']},other:'keep'};assert.equal(f.notifications,0);
 await f.release();assert.equal(await saving,true);assert.deepEqual(f.host.settings.commonNodeProperties,rows);assert.notEqual(f.host.settings.commonNodeProperties,rows);
 assert.deepEqual(f.writes[0].unknown,{future:['newly received']});assert.equal(f.writes[0].other,'keep');assert.equal(f.notifications,1);
 assert.deepEqual(JSON.parse(f.host.savedSettingsPolicy.values.commonNodeProperties),rows);
});

test('failed common-property storage leaves settings and presentation unchanged; a stale or canceled draft never saves',async()=>{
 for(const reason of ['storage','stale','canceled']){
  const f=commonPropertyHost(),rows=[{field:'Name',visible:true}],saving=f.host.updateCommonNodeProperties(f.opening,rows,()=>reason!=='canceled');
  if(reason==='storage')f.host.writeSettingsSnapshot=async()=>{throw Error('Controlled storage failure')};
  if(reason==='stale')f.host.settings={...f.host.settings,commonNodeProperties:[]};
  const before=JSON.stringify(f.host.settings);await f.release();
  if(reason==='storage')await assert.rejects(saving,/Controlled storage failure/);else assert.equal(await saving,false);
  assert.equal(JSON.stringify(f.host.settings),before);assert.equal(f.notifications,0);assert.equal(f.writes.length,0);
 }
});

test('common-property opening identity ignores object key order while retaining row values and order',async()=>{
 const f=commonPropertyHost(),rows=[{field:'Name',visible:true,showName:true,label:'Display name'}];
 f.host.settings.commonNodeProperties=[{creationVisible:true,visible:false,field:'aliases'}];
 const saving=f.host.updateCommonNodeProperties(f.opening,rows,()=>true);await f.release();
 assert.equal(await saving,true,'A decoded but unchanged definition must retain edit authority');
 assert.deepEqual(f.host.settings.commonNodeProperties,rows);assert.equal(f.writes.length,1);assert.equal(f.notifications,1);
});
