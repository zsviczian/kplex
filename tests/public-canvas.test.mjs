/** Actual committed-scene projection and registry contracts without a browser/native host.
 * Fixtures supply already-produced geometry and callbacks; no layout, classifier or graph reader
 * exists here. Native rendering, editor persistence and physical devices remain separate lanes. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const directory=mkdtempSync(join(tmpdir(),'kplex-public-canvas-'));
process.once('exit',()=>rmSync(directory,{recursive:true,force:true}));
const outfile=join(directory,'canvas.mjs');
await build({stdin:{contents:`export * from './src/ui/publicCanvasScene';export * from './src/application/PublicCanvasRegistry';`,resolveDir:resolve('.')},outfile,bundle:true,format:'esm',platform:'node',target:'es2021'});
const {readPublicCanvasScene,publicCanvasState,PublicCanvasRegistry}=await import(pathToFileURL(outfile).href);

/** A scalar page double deliberately has native/body traps which no projection may inspect. */
function page(path,transient){return{path,...(transient?{transient}:{}),get file(){throw new Error('Native file access is forbidden');},get neighbours(){throw new Error('Graph traversal is forbidden');},get body(){throw new Error('Note body access is forbidden');}};}
/** Existing rendered occurrences retain independent canonical/path and occurrence identities. */
function node(id,path=id,overrides={}){return{occurrenceId:id,page:page(path),label:`Label ${id}`,x:50,y:50,width:20,height:20,role:'child',...overrides};}
/** A captured render frame supplies every geometry/filter/camera fact through narrow values. */
function frame(nodes=[node('A')],overrides={}){return{scene:{nodes,edges:[],zoneViewports:{},zoneAreas:{}},edges:[],rendered:new Map(),clusters:[],area:item=>item.areaId,included:item=>item.included!==false,visible:new Set(nodes.map(item=>item.occurrenceId)),scroll:{},camera:{x:0,y:0,scale:1},viewport:{width:100,height:100},coverage:{scope:'local',complete:true,pending:false},semanticRevision:7,sourceRevision:8,configurationRevision:9,pending:false,motion:false,selection:null,folds:[],filters:{layoutMode:'keep',globalActive:false,find:'',areas:{}},decorationLabel:item=>item.label,...overrides};}
/** Existing semantic metadata belongs to the passed edge, never a reclassified graph pair. */
function edge(id,source,target,overrides={}){return{id,sourceOccurrence:source,targetOccurrence:target,sourcePath:`path:${source}`,targetPath:`path:${target}`,role:'child',relationType:1,direction:1,typeDefinition:'Contains',...overrides};}

test('projection preserves occurrence identity, committed geometry, filters and viewport clipping independently',()=>{
 const a=node('occurrence-A','Notes/A.md',{areaId:'area'}),b=node('occurrence-B','Notes/A.md',{included:false}),c=node('offscreen','C.md',{x:300});
 const input=frame([a,b,c]);input.scene.zoneViewports.area={left:0,top:0,width:100,height:30,contentHeight:200};input.scene.zoneAreas.area={left:0,top:0,width:100,height:30};
 input.rendered.set(a.occurrenceId,{...a,y:50});const result=readPublicCanvasScene(input);
 assert.equal(result.occurrences[0].nodeId,'Notes/A.md');assert.equal(result.occurrences[0].id,'occurrence-A');assert.equal(result.occurrences[0].bounds.y,40);assert.equal(result.occurrences[0].included,true);assert.equal(result.occurrences[0].inViewport,false);
 assert.equal(result.occurrences[1].included,false);assert.equal(result.occurrences[1].inViewport,false);assert.equal(result.occurrences[2].included,true);assert.equal(result.occurrences[2].inViewport,false);
 assert.equal(result.semanticRevision,7);assert.equal(result.sourceRevision,8);assert.equal(result.configurationRevision,9);
 result.camera.x=42;assert.equal(input.camera.x,0);result.occurrences[0].bounds.x=99;assert.equal(a.x,50);
});

test('semantic pairs, structural headings, decorative guides and aggregates have distinct authority',()=>{
 const a=node('a','A.md'),b=node('b','B.md'),group=node('group','invented',{page:page('invented',{kind:'group',actualPath:'Never canonical'})}),section=node('section','heading',{page:page('heading',{kind:'section',sourcePath:'A.md'})});
 const input=frame([a,b,group,section],{edges:[edge('semantic','a','b'),edge('group-edge','a','group',{explanationSourcePath:'A.md',explanationTargetPath:'B.md'}),edge('heading-evidence','section','b',{explanationSourcePath:'A.md',explanationTargetPath:'B.md'}),edge('decoration','a','b',{kind:'decorative'})]});
 input.scene.sectionTreeEdges=[{id:'outline',sourceOccurrence:'a',targetOccurrence:'section',sourcePath:'A.md',targetPath:'heading'}];
 input.scene.decorations=[{id:'guide',kind:'guide',label:'Only a guide',points:[{x:0,y:0},{x:20,y:20}]}];
 const result=readPublicCanvasScene(input),byId=new Map(result.connections.map(item=>[item.id,item]));
 assert.equal(byId.get('semantic').sourceNodeId,'A.md');assert.equal(byId.get('semantic').targetNodeId,'B.md');
 assert.equal(result.occurrences.find(item=>item.id==='group').nodeId,null);assert.equal(byId.get('group-edge').kind,'structural');assert.equal(byId.get('group-edge').sourceNodeId,null);assert.equal(byId.get('group-edge').role,null);
 assert.equal(byId.get('heading-evidence').kind,'semantic');assert.equal(byId.get('heading-evidence').sourceNodeId,'A.md');assert.equal(byId.get('outline').kind,'structural');assert.equal(byId.get('outline').sourceNodeId,null);
 assert.equal(byId.get('decoration').kind,'decorative');assert.equal(byId.get('decoration').targetNodeId,null);assert.equal(result.decorations[0].kind,'guide');assert.equal('sourceNodeId' in result.decorations[0],false);
});

test('expanded rows retain physical clipping but groups never acquire semantic endpoints',()=>{
 const parent=node('parent','Parent.md',{page:page('Parent.md',{kind:'group',actualPath:'must-not-be-used'})}),child={key:'mini',relation:{page:page('Child.md'),role:'child',relationType:1,typeDefinition:'Contains',linkDirection:1},label:'Child',localX:10,localY:10,width:10,height:10};
 const input=frame([parent],{clusters:[{key:'expanded',parent,left:0,top:0,width:40,viewportHeight:20,contentHeight:100,scrollTop:0,children:[child]}]});
 const result=readPublicCanvasScene(input),connection=result.connections[0];assert.equal(result.occurrences[1].inViewport,true);assert.equal(connection.kind,'structural');assert.equal(connection.sourceNodeId,null);assert.equal(connection.targetNodeId,null);
 parent.page=page('Parent.md');child.localY=70;const scrolled=readPublicCanvasScene(input);assert.equal(scrolled.occurrences[1].inViewport,false);assert.equal(scrolled.connections[0].kind,'semantic');assert.equal(scrolled.connections[0].sourceNodeId,'Parent.md');assert.equal(scrolled.connections[0].definition,'Contains');
 parent.included=false;assert.equal(readPublicCanvasScene(input).occurrences[1].included,false);
});

test('badge, actual provenance paths, filters, folds and guide points consume finite output budgets',()=>{
 const nodes=Array.from({length:100},(_,i)=>node(`n${i}`,`N${i}.md`,{label:'a'.repeat(4096),viewDescription:'d'.repeat(4096),viewBadge:{label:'b'.repeat(4096)}}));
 const badge=readPublicCanvasScene(frame(nodes));assert(badge.truncated);assert(badge.occurrences.length<50);assert(JSON.stringify(badge).length<600000);
 const a=node('a','A.md'),b=node('b','B.md'),edges=Array.from({length:100},(_,i)=>edge(`e${i}`,'a','b',{explanationSourcePath:'S'.repeat(4000),explanationTargetPath:'T'.repeat(4000)}));
 const provenance=readPublicCanvasScene(frame([a,b],{edges}));assert(provenance.truncated);assert(provenance.connections.length<100);assert(provenance.connections[0].sourceNodeId.length===4000);
 const input=frame([a],{selection:'x'.repeat(5000),folds:Array.from({length:5000},(_,i)=>`fold${i}`),filters:{layoutMode:'keep',globalActive:true,find:'f'.repeat(5000),areas:Object.fromEntries(Array.from({length:5000},(_,i)=>[`area${i}`,'filter'])),quick:{field:'x',operator:'equals',value:'v'.repeat(5000)}}});
 const metadata=readPublicCanvasScene(input);assert(metadata.truncated);assert.equal(metadata.selection,null);assert.equal(metadata.folds.length,2048);assert.equal(Object.keys(metadata.filters.areas).length,128);assert.equal(metadata.filters.find.length,4096);assert.equal(metadata.filters.quick.value.length,4096);
 const guides=frame([a]);guides.scene.decorations=[{id:'guide',kind:'guide',points:Array.from({length:1000},(_,i)=>({x:i,y:i}))}];const guide=readPublicCanvasScene(guides);assert(guide.truncated);assert.equal(guide.decorations[0].points.length,256);
});

test('omitted identities and invalid geometry never create truncated aliases or dangling edges',()=>{
 const a=node('a','A.md'),large=node('z'.repeat(5000),'B.md'),invalid=node('bad','Bad.md',{x:Infinity});
 const result=readPublicCanvasScene(frame([a,large,invalid],{edges:[edge('dangling','a',large.occurrenceId)]}));assert(result.truncated);assert.equal(result.occurrences.length,1);assert.equal(result.connections.length,0);
 const fold=readPublicCanvasScene(frame([a],{folds:['z'.repeat(5000),'known']}));assert.deepEqual(fold.folds,['known']);assert(fold.truncated);
 assert.throws(()=>readPublicCanvasScene(frame([a],{camera:{x:0,y:0,scale:NaN}})),error=>error.code==='UNAVAILABLE');
 const state={value:[1,'x']},copy=publicCanvasState(state);assert.deepEqual(copy,state);copy.value.push(2);assert.equal(state.value.length,2);
});

test('skipped sparse invalid rows consume the work budget before callbacks can grow without bound',()=>{
 let inspected=0;const nodes=Array.from({length:20000},()=>{const row=node('x'.repeat(5000));Object.defineProperty(row,'page',{get(){inspected++;return page('A.md');}});return row;});
 const result=readPublicCanvasScene(frame(nodes));assert(result.truncated);assert.equal(result.occurrences.length,0);assert(inspected<=16384);
});

/** Native registrations are callbacks only; test counters prove discovery does not project scenes. */
function registration(overrides={}){let reads=0,revision=1;const actions=[];const ports={current:()=>true,summary:()=>({viewId:'classic',attention:'A.md',root:'A.md',surface:'main',visible:true,revision}),snapshot:()=>{reads++;return readPublicCanvasScene(frame());},navigate:async path=>{actions.push(['navigate',path]);revision++;return'completed';},selectView:async id=>{actions.push(['view',id]);return'accepted';},selectPreset:async id=>{actions.push(['preset',id]);return'completed';},...overrides};return{ports,actions,reads:()=>reads};}

test('registry identities belong to sessions; migration retains IDs and stale cleanup cannot remove replacement',()=>{
 const registry=new PublicCanvasRegistry('session'),owner={},first=registration(),release=registry.register(owner,first.ports),id=registry.list()[0].id;
 assert.equal(first.reads(),0);assert.equal(registry.snapshot(id).canvas.id,id);assert.equal(first.reads(),1);
 const replacement=registration(),releaseReplacement=registry.register(owner,replacement.ports);assert.equal(registry.list()[0].id,id);release();assert.equal(registry.list().length,1);assert.equal(registry.snapshot(id).canvas.id,id);
 registry.register({},registration().ports);assert.equal(new Set(registry.list().map(item=>item.id)).size,2);releaseReplacement();assert.equal(registry.list().length,1);
});

test('explicit registry actions use one owner and reject retired/replaced asynchronous completions',async()=>{
 const registry=new PublicCanvasRegistry('session'),owner={},first=registration(),other=registration();registry.register(owner,first.ports);registry.register({},other.ports);const id=registry.list()[0].id;
 const receipt=await registry.navigate(id,'B.md');assert.equal(receipt.canvasId,id);assert.equal(receipt.revision,2);assert.deepEqual(first.actions,[['navigate','B.md']]);assert.deepEqual(other.actions,[]);
 let finish;const waiting=registration({selectView:()=>new Promise(resolve=>{finish=resolve;})});registry.register(owner,waiting.ports);const pending=registry.selectView(id,'mindmap');registry.register(owner,registration().ports);finish('completed');await assert.rejects(pending,error=>error.code==='API_UNAVAILABLE');
 await assert.rejects(registry.navigate('unknown','B.md'),error=>error.code==='NOT_FOUND');
});

test('reentrant retirement during a synchronous snapshot cannot publish an obsolete frame',()=>{
 const registry=new PublicCanvasRegistry('session'),owner={};let oldSummaries=0;
 registry.register(owner,registration({summary:()=>{oldSummaries++;return{};},snapshot:()=>{registry.register(owner,registration().ports);return readPublicCanvasScene(frame());}}).ports);
 assert.throws(()=>registry.snapshot('session:1'),error=>error.code==='API_UNAVAILABLE');assert.equal(oldSummaries,0);
});

test('registry discovery bounds live and retired inventories, and disposal retires retained public ports',()=>{
 const live=new PublicCanvasRegistry('live');for(let i=0;i<65;i++)live.register({},registration().ports);assert.throws(()=>live.list(),error=>error.code==='LIMIT_EXCEEDED');
 const retired=new PublicCanvasRegistry('retired');let visits=0;for(let i=0;i<1000;i++)retired.register({},registration({current:()=>{visits++;return false;}}).ports);assert.throws(()=>retired.list(),error=>error.code==='LIMIT_EXCEEDED');assert.equal(visits,256);
 const registry=new PublicCanvasRegistry('closed'),item=registration();registry.register({},item.ports);const retained=registry.port();registry.dispose();assert.throws(()=>retained.list(),error=>error.code==='API_UNAVAILABLE');assert.throws(()=>retained.snapshot('closed:1'),error=>error.code==='API_UNAVAILABLE');assert.equal(item.reads(),0);assert.deepEqual(item.actions,[]);
 registry.register({},registration().ports)();assert.equal(registry.slots.size,0);
});
