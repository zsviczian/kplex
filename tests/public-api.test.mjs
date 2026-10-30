/** Public automation runs the actual service, GraphQL.js and canonical index read methods.
 * Controlled host/publication fixtures make reads/acquisitions impossible and count all effects;
 * these tests are portable contract evidence, not native workspace/device acceptance. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {getIntrospectionQuery} from 'graphql';

const directory=mkdtempSync(join(tmpdir(),'kplex-public-api-'));
process.once('exit',()=>rmSync(directory,{recursive:true,force:true}));
const outfile=join(directory,'api.mjs');
await build({stdin:{contents:`export * from './src/application/PublicApi';export * from './src/application/publicApiContracts';export * from './src/application/publicApiMarkdown';export * from './src/adapters/obsidian/publicApiGraphql';export * from './src/adapters/obsidian/publicApiGraph';export * from './src/index/GraphIndex';export * from './src/core/graph/evidence';`,resolveDir:resolve('.')},outfile,bundle:true,format:'esm',platform:'node',target:'es2021',plugins:[{name:'native-types-only',setup(build){build.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export const Platform={isMobile:false,isIosApp:false};export class TFile{};export class TFolder{};export const normalizePath=x=>x;export const getAllTags=x=>x?.tags??[];export const getLanguage=()=>"en";`}));}}]});
const M=await import(pathToFileURL(outfile).href);

/** Create one published graph with an explicit ontology child and genuine field provenance. */
function graphFixture(){
 const index=Object.create(M.GraphIndex.prototype),evidence=new M.RelationEvidenceStore();
 const page=id=>({path:id,name:id,file:null,url:null,isFolder:false,isTag:false,mtime:null,neighbours:new Map(),aliases:[],tags:[],noteType:null,primaryStyleTag:null,styleTags:[],maxLabelLength:30});
 const a=page('A.md'),b=page('B.md');
 a.neighbours.set(b.path,{...M.emptyRelation(),target:b,isChild:true,childType:1,childTypeDefinition:'Contains',direction:1});
 evidence.addPair(a.path,b.path,'child',1,1,{sourceKind:'frontmatter-ontology',fieldName:'Contains',definition:'Contains',rawValue:'PRIVATE RAW NOTE VALUE',line:4,start:12,end:34});
 const state={pages:new Map([[a.path,a],[b.path,b]]),evidence,discoveredFields:new Map()};
 Object.assign(index,{state,publishedUrlState:{pages:new Map(),evidence:new M.RelationEvidenceStore()},semanticScopes:new Map(),hostPreviewScopes:new Map(),onDemandHostScopes:new Map(),onDemandCachedScopes:new Map(),retainedLocalScopes:new Map(),relationshipPairs:new Map(),retiredUrlTargets:new Set(),retiredHostTagPaths:new Set(),urlSearchEntries:new Map(),searchEntries:[a,b].map(page=>({page,name:page.name.toLowerCase(),aliases:[],path:page.path.toLowerCase()})),physicalSearchEntries:new Map(),app:{vault:{getFileByPath:()=>null}},plugin:{settings:{showPageNodes:false,showInferredNodes:false},getIndexSourceRevision:()=>1},sourceAcquisition:{getMaintenanceRevision:()=>1},fullSemanticPolicyRevision:1,semanticPolicyRevision:1,fullSemanticMaintenanceRevision:1,fullSemanticSourceRevision:1,pendingStructuralTasks:0,sourceBackedSemantics:false});
 index.visibleRecoveryScope=()=>null;index.semanticPage=id=>state.pages.get(id);index.get=id=>state.pages.get(id);
 index.semanticRelationSource=page=>({page,settings:{inferAllLinksAsFriends:false}});
 index.semanticEvidence=(source,target)=>({evidence:evidence.between(source,target),settings:{inferAllLinksAsFriends:false}});
 return{index,state,a,b,page};
}

/** Composition supplies no write/acquisition capability to passive graph and ontology reads. */
function fixture(){
 const graph=graphFixture(),transport=M.createPublicApiGraphql(),revision={semantic:1,source:1,configuration:1};let complete=false,navigations=0;
 const coverage=()=>({scope:complete?'global':'unknown',complete,pending:!complete});
 const canvas=id=>({id,viewId:'classic',attention:'A.md',root:'A.md',surface:'main',visible:true,revision:1});
 const canvases=[canvas('one'),canvas('two')];
 const configuration={list:()=>({presets:[],lenses:[],palette:[]}),export:()=>null,validate:()=>({status:'invalid'}),preview:()=>null,apply:async()=>({state:'saved'}),revision:()=>revision.configuration,dispose(){}};
 const api=new M.PublicApi({revisions:()=>({...revision}),status:()=>({phase:'preparing',upToDate:false,indexedFiles:1,totalFiles:null,coverage:coverage(),searchComplete:false,hydrating:true,sourceReady:false,mode:'eager'}),ontology:()=>({fields:[{key:'contains',name:'Contains',role:'child',roles:['child'],partner:'Part of',partnerRole:'parent',description:'Physical containment',configured:true,discovered:false}],truncated:false,discoveryComplete:false}),graph:{...M.createPublicGraphRead(graph.index),coverage},canvas:{list:()=>canvases,snapshot:id=>canvases.find(canvas=>canvas.id===id)?{canvas:canvas(id),semanticRevision:1,scenePending:false,motionPending:false,state:null,preset:null,lenses:[],filters:{layoutMode:'keep',globalActive:false,find:'',areas:{}},folds:[],selection:null,occurrences:[],connections:[],decorations:[],areas:[],camera:{x:0,y:0,scale:1},viewport:{width:100,height:100},bounds:null,coverage:coverage(),truncated:false}:null,navigate:async(id)=>{navigations++;return{status:'completed',canvasId:id,revision:2};},selectView:async(id)=>({status:'completed',canvasId:id,revision:2}),selectPreset:async(id)=>({status:'completed',canvasId:id,revision:2})},configuration,now:()=>1,graphql:transport.execute});
 return{...graph,api,transport,revision,configuration,setComplete:value=>{complete=value;},navigations:()=>navigations};
}

test('settings ontology and actual GraphQL remain available before index readiness',()=>{
 const f=fixture();assert(f.api.ontology().ok);assert.equal(f.api.ontology().value.fields[0].description,'Physical containment');
 const result=f.api.query({query:'query Fields($take:Int!){ ontology(limit:$take){ fields{name role partner description configured discovered} } status{phase totalFiles coverage{scope complete}} }',variables:{take:20}});
 assert(result.ok);assert.equal(result.value.errors,undefined);assert.equal(result.value.data.ontology.fields[0].description,'Physical containment');assert.equal(result.value.data.status.totalFiles,null);
 const strict=f.api.query({query:'{ontology{fields{name}}}',requireComplete:true});assert(strict.ok);assert.equal(strict.value.errors,undefined);
 assert.equal(f.api.neighbors({id:'A.md',requireComplete:true}).error.code,'INDEX_INCOMPLETE');
 f.setComplete(true);assert(f.api.neighbors({id:'A.md',requireComplete:true}).ok);
});

test('wide GraphQL variables stop inspection before reading values beyond the structural budget',()=>{
 const f=fixture(),variables=Object.fromEntries(Array.from({length:4096},(_,index)=>['field'+index,index]));
 Object.defineProperty(variables,'tail',{enumerable:true,get(){throw Error('Unbounded variable enumeration');}});
 const result=f.api.query({query:'{status{phase}}',variables});
 assert.equal(result.error?.code,'LIMIT_EXCEEDED');
});

test('genuine GraphQL supports standard introspection, aliases, fragments and input validation',()=>{
 const f=fixture(),introspection=f.api.query({query:getIntrospectionQuery()});assert(introspection.ok);assert.equal(introspection.value.errors,undefined);assert(introspection.value.data.__schema.types.some(type=>type.name==='OntologyField'));
 const query=f.api.query({query:'query N($id:ID!){one:node(id:$id){...N} two:node(id:"B.md"){...N}} fragment N on Node{id name kind coverage{complete}}',variables:{id:'A.md'}});assert(query.ok);assert.equal(query.value.data.one.id,'A.md');assert.equal(query.value.data.two.id,'B.md');
 const invalid=f.api.query({query:'{ontology{invented}}'});assert(invalid.ok);assert(invalid.value.errors.length);
 const mutation=f.api.query({query:'mutation { node(id:"A.md"){id} }'});assert.equal(mutation.ok,false);assert.equal(mutation.error.code,'UNSUPPORTED');
 assert.equal(f.navigations(),0);
});

test('bounds, cancellation, revision and retired handles fail with machine errors',()=>{
 const f=fixture();assert.equal(f.api.search({query:'',limit:201}).error.code,'INVALID_ARGUMENT');assert.equal(f.api.node({id:'A.md',isCancelled:()=>true}).error.code,'CANCELLED');
 assert.equal(f.api.node({id:'A.md',expectedRevision:{semantic:0,source:1,configuration:1}}).error.code,'STALE_REVISION');
 const deep=' {__type(name:"Node"){'+'ofType{'.repeat(21)+'name'+'}'.repeat(21)+'}}';assert.equal(f.api.query({query:deep}).ok,false);
 const fragments=Array.from({length:16},(_,i)=>`fragment F${i} on Query {${i===15?'status{phase}':`...F${i+1} ...F${i+1}`}}`).join(' ');const expanded=f.api.query({query:`{...F0} ${fragments}`});assert.equal(expanded.ok,false);assert.equal(expanded.error.code,'LIMIT_EXCEEDED');
 f.api.dispose();f.transport.dispose();assert.equal(f.api.ontology().error.code,'API_UNAVAILABLE');assert.equal(f.api.query({query:'{status{phase}}'}).error.code,'API_UNAVAILABLE');
});

test('canvas ambiguity and explicit actions stay isolated and outputs are detached',async()=>{
 const f=fixture();assert.equal(f.api.canvas().error.code,'AMBIGUOUS_CANVAS');assert.equal((await f.api.navigate({path:'A.md'})).error.code,'AMBIGUOUS_CANVAS');
 const result=await f.api.navigate({canvasId:'two',path:'B.md'});assert(result.ok);assert.equal(result.value.canvasId,'two');assert.equal(f.navigations(),1);
 const node=f.api.node({id:'A.md'});assert(node.ok);node.value.aliases.push('external');assert.deepEqual(f.a.aliases,[]);
 const snapshot=f.api.canvas({canvasId:'one'});assert(snapshot.ok);assert.equal(snapshot.value.canvas.id,'one');
});

test('canonical graph reads ignore canvas visibility and never disclose raw property values',()=>{
 const {index}=graphFixture();const result=index.publicApiNeighbors('A.md',undefined,20,()=>false);assert.equal(result.items.length,1);assert.equal(result.items[0].role,'child');assert.equal(result.items[0].definition,'Contains');
 const evidence=index.publicApiEvidence('A.md','B.md',20,()=>false);assert.equal(evidence.decisions[0].active,true);assert.equal(evidence.decisions[0].fieldName,'Contains');assert.equal(evidence.decisions[0].start,12);assert(!JSON.stringify(evidence).includes('PRIVATE'));
 assert.equal(index.publicApiCoverage().complete,true);index.sourceBackedSemantics=true;assert.equal(index.publicApiCoverage().complete,false);
});

test('bounded search retains every kind and caps scanning before broad catalog materialization',()=>{
 const f=graphFixture();for(const [kind,overrides]of [['ghost',{}],['folder',{isFolder:true}],['tag',{isTag:true}],['url',{url:'https://example.com'}]]){const page=f.page(kind);Object.assign(page,overrides);f.index.searchEntries.push({page,name:kind,aliases:[],path:kind});}
 assert.deepEqual(new Set(f.index.publicApiSearch('',20,()=>false).items.map(item=>item.kind)),new Set(['unresolved','container','tag','url']));
 f.index.searchEntries=Array.from({length:20000},(_,i)=>{const page=f.page(`n${i}`);return{page,name:page.name,aliases:[],path:page.path};});
 const bounded=f.index.publicApiSearch('no match',5,()=>false);assert.equal(bounded.scanned,M.PUBLIC_API_LIMITS.scan);assert(bounded.truncated);
});

test('dense evidence and incidence reject before canonical composition',()=>{
 const f=graphFixture();let classified=0;f.index.semanticRelationSource=()=>{classified++;throw new Error('Unbounded composition must not run');};
 f.a.neighbours=new Map(Array.from({length:10000},(_,i)=>[`target${i}`,{target:f.b}]));
 assert.throws(()=>f.index.publicApiNeighbors('A.md',undefined,20,()=>false),error=>error.code==='LIMIT_EXCEEDED');assert.equal(classified,0);
 const store=new M.RelationEvidenceStore();for(let i=0;i<1000;i++)store.addPair('A','B','child',1,1,{sourceKind:'inline-ontology'});
 assert.equal(store.inspectReadBudget('A',500),null);assert.equal(store.inspectReadBudget('A',2000).declarations,1000);
});

test('one GraphQL execution shares expensive reader budgets across aliases and meters introspection',()=>{
 const f=fixture(),query='{'+Array.from({length:12},(_,i)=>`n${i}:node(id:"A.md"){id}`).join(' ')+'}';
 const result=f.api.query({query});assert(result.ok);assert(result.value.errors.some(error=>error.extensions.code==='LIMIT_EXCEEDED'));
 const introspection=f.api.query({query:'{'+Array.from({length:80},(_,i)=>`s${i}:__schema{types{name fields{name type{kind name}}}}`).join(' ')+'}'});
 if(introspection.ok)assert(introspection.value.errors.some(error=>error.extensions.code==='LIMIT_EXCEEDED'));else assert.equal(introspection.error.code,'LIMIT_EXCEEDED');
});

test('retired physical search entries cannot mask a current exact replacement',()=>{
 const f=graphFixture(),oldFile={path:'A.md'},file={path:'A.md',name:'A.md',basename:'A',extension:'md',stat:{mtime:2,size:10,ctime:1}};
 f.a.file=oldFile;const replacement={...f.a,file,aliases:['Fresh']};f.index.app.vault.getFileByPath=()=>file;
 f.index.physicalSearchEntries.set('A.md',{page:replacement,name:'fresh',aliases:[],path:'a.md'});
 const result=f.index.publicApiSearch('fresh',10,()=>false);assert.equal(result.items[0].aliases[0],'Fresh');
});

test('canvas and context each project one committed frame with explicit GraphQL source stamps',()=>{
 const f=fixture(),original=f.api.ports.canvas.snapshot;let projections=0;
 f.api.ports={...f.api.ports,canvas:{...f.api.ports.canvas,snapshot:id=>{projections++;return{...original(id),sourceRevision:7,configurationRevision:9};}}};
 assert(f.api.canvas({canvasId:'one'}).ok);assert.equal(projections,1);
 assert(f.api.context({canvasId:'one'}).ok);assert.equal(projections,2);
 const result=f.api.query({query:'{canvas(canvasId:"one"){sourceRevision configurationRevision}}'});assert(result.ok);assert.equal(result.value.errors,undefined);assert.equal(result.value.data.canvas.sourceRevision,7);assert.equal(result.value.data.canvas.configurationRevision,9);assert.equal(projections,3);
 assert.equal(f.api.context({canvasId:'one',expectedRevision:{semantic:1,source:1,configuration:1,canvas:0}}).error.code,'STALE_REVISION');
});

test('complete discovery is explicit while configured ontology stays available before indexing',()=>{
 const f=fixture();assert(f.api.ontology({requireComplete:true}).ok);
 assert.equal(f.api.ontology({includeDiscovered:true,requireComplete:true}).error.code,'INDEX_INCOMPLETE');
 assert.equal(f.api.ontologyGuide({includeDiscovered:true,requireComplete:true,format:'markdown'}).error.code,'INDEX_INCOMPLETE');
 const result=f.api.query({query:'{ontology(includeDiscovered:true){fields{name}}}',requireComplete:true});assert(result.ok);assert.equal(result.value.errors[0].extensions.code,'INDEX_INCOMPLETE');
});

test('Markdown authored content is enclosed in unbreakable single-line code spans',()=>{
 const payload='<script>alert(1)</script>\n[link](https://example.com) ![[Note]] ``` ` **bold**',literal=M.publicApiMarkdownLiteral(payload);
 const delimiter=literal.match(/^`+/)[0];assert(delimiter.length>3);assert.equal(literal,delimiter+' '+JSON.stringify(payload)+' '+delimiter);assert(!literal.includes('\n'));assert(!JSON.stringify(payload).includes(delimiter));
 for(const value of ['',null,'   ','`','`````','<img src="https://example.com">','[unsafe](javascript:run())']){
  const text=M.publicApiMarkdownLiteral(value),fence=text.match(/^`+/)[0];assert(text.endsWith(fence));assert.equal(text.slice(fence.length+1,-fence.length-1),JSON.stringify(value));
 }
 const f=fixture(),originalOntology=f.api.ports.ontology,originalCanvas=f.api.ports.canvas.snapshot;
 f.api.ports={...f.api.ports,ontology:options=>({...originalOntology(options),fields:[{key:'x',name:payload,role:'child',roles:['child'],partner:payload,description:payload,configured:true,discovered:false}]}),canvas:{...f.api.ports.canvas,snapshot:id=>({...originalCanvas(id),occurrences:[{id:payload,label:payload,nodeId:payload,kind:'node',role:'child',areaId:null,bounds:{x:0,y:0,width:1,height:1},included:true,inViewport:true}]})}};
 const guide=f.api.ontologyGuide({format:'markdown'}),context=f.api.context({canvasId:'one'});assert(guide.ok);assert(context.ok);assert(guide.value.includes(literal));assert(context.value.includes(literal));
});
