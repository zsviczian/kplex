/** Public policy/UI exports, measured canonical scenes and captured contribution lifetimes.
 * Native Menu rendering and the real queued writer have separate browser/native coverage. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {plexViewModules,viewPage} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/core/plex/views/index.ts','src/core/plex/views/example.ts',
  'src/application/PlexViewSession.ts','src/ui/plexViews/settingsContributions.ts','src/ui/plexViews/example.ts',
  'src/ui/plexViews/CanvasViewContributionController.ts','src/ui/plexViews/contributionValidation.ts',
  'src/ui/plexViews/prepareScene.ts','src/ui/plexViews/labels.ts','src/core/plex/views/mindmap/definition.ts']);

test('registry admits additive central section policies and refuses unsupported or unrooted sources',()=>{
 const base=M.mindMapViewDefinition;
 assert.equal(new M.PlexViewRegistry([base],base.id).resolve(base.id).sectionSource,'layout-root');
 for(const changes of [{sectionSource:'selected'},{capabilities:{...base.capabilities,sections:false}},{navigation:undefined}])
  assert.throws(()=>new M.PlexViewRegistry([{...base,...changes}],base.id));
 const legacy={...base,sectionSource:undefined};assert.equal(new M.PlexViewRegistry([legacy],base.id).resolve(base.id),legacy);
});
const definition=M.exampleViewDefinition;

test('shared rounded band occupancy excludes its true inner hole and matches circular corners',()=>{
 const bounds={x:-300,y:-200,width:600,height:400},shape={kind:'rounded-band',inner:{x:-180,y:-100,width:360,height:200},radius:20};
 assert.equal(M.validAreaShape(bounds,shape),true);
 for(const point of [{x:0,y:0},{x:0,y:-100},{x:-300,y:-200},{x:-299,y:-199}])assert.equal(M.areaContains(bounds,point,shape),false);
 for(const point of [{x:0,y:-180},{x:290,y:0},{x:-180,y:-99},{x:-294,y:-194}])assert.equal(M.areaContains(bounds,point,shape),true);
 assert.equal(M.areaContains(bounds,{x:-300,y:-200}),true,'Omitted shape preserves the inclusive rectangular contract');
 for(const invalid of [{...shape,radius:101},{...shape,inner:bounds},{...shape,inner:{...shape.inner,width:Infinity}},{...shape,kind:'circle'}])assert.equal(M.validAreaShape(bounds,invalid),false);
 const transformed=M.transformAreaShape(shape,2,40,-20);assert.deepEqual(transformed.inner,{x:-320,y:-220,width:720,height:400});assert.equal(transformed.radius,40);
 assert.equal((M.areaShapePath(bounds,shape).match(/M /g)||[]).length,2,'Shared paint path contains the exact outer and inner rounded boundary');
});

test('shared area grid preserves unadorned geometry and native dimensions',()=>{
  const items=[{id:'a',width:100,height:40},{id:'b',width:200,height:80},{id:'c',width:120,height:30}];
  const grid=M.measuredAreaGrid(items,2,20,10);
  assert.equal(grid.width,388);assert.equal(grid.height,178);
  assert.deepEqual([...grid.positions], [['a',{x:84,y:82,width:100,height:40}],['b',{x:264,y:82,width:200,height:80}],['c',{x:84,y:147,width:120,height:30}]]);
  assert.deepEqual(M.measuredAreaGrid([],1,0,0),{positions:new Map(),width:0,height:0});
});

test('shared area envelopes reserve badges without resizing nodes or overlapping adjacent cells',()=>{
  const items=Object.freeze([Object.freeze({id:'a',width:160,height:44,insets:Object.freeze({top:28,right:40})}),Object.freeze({id:'b',width:160,height:64})]);
  const grid=M.measuredAreaGrid(items,2,16,18);
  assert.equal(grid.width,424);assert.equal(grid.height,130);
  assert.deepEqual(grid.positions.get('a'),{x:104,y:92,width:160,height:44});
  assert.deepEqual(grid.positions.get('b'),{x:320,y:78,width:160,height:64});
  const a=grid.positions.get('a'),b=grid.positions.get('b');
  assert.equal(a.y-a.height/2-items[0].insets.top,42);
  assert.equal(b.x-b.width/2-(a.x+a.width/2+items[0].insets.right),16);
  assert.deepEqual([...M.measuredAreaGrid(items,2,16,18).positions],[...grid.positions]);
  assert.deepEqual(M.nodeBadgeInsets({x:800,y:-900,width:160,height:44},{width:200,height:16}),{top:28,right:40},'World position must not enter an area-local envelope');
});

test('automatic area columns use actual cell envelopes at exact world-width thresholds',()=>{
  const items=Array.from({length:6},(_,i)=>({id:String(i),width:100,height:40}));
  assert.equal(M.measuredAreaColumns(items,263,16),1);
  assert.equal(M.measuredAreaColumns(items,264,16),2);
  assert.equal(M.measuredAreaColumns(items,380,16),3);
  assert.equal(M.measuredAreaColumns(items,728,16),6);
  assert.equal(M.measuredAreaColumns(items,728,16,24,3),3);
  assert.equal(M.measuredAreaColumns([],200,16),1);
  const varied=[{id:'wide',width:600,height:40},{id:'b',width:100,height:60},{id:'c',width:100,height:40}];
  assert.equal(M.measuredAreaColumns(varied,880,16),3);
  assert.equal(M.measuredAreaColumns([{...varied[0],insets:{right:40}},...varied.slice(1)],880,16),2);
  assert.equal(M.measuredAreaColumns(varied,200,16),1);
});

test('shared area packing retains finite budgets and rejects invalid identities, insets and policies',()=>{
  const item={id:'a',width:100,height:40};
  for(const items of [[item,item],[{...item,insets:{top:-1}}],[{...item,insets:{right:Infinity}}],Array.from({length:2049},(_,i)=>({...item,id:String(i)}))]){
    assert.throws(()=>M.measuredAreaGrid(items,1,16,18));assert.throws(()=>M.measuredAreaColumns(items,500,16));
  }
  for(const columns of [0,33,1.5])assert.throws(()=>M.measuredAreaGrid([item],columns,16,18));
  for(const width of [0,-1,NaN,Infinity])assert.throws(()=>M.measuredAreaColumns([item],width,16));
  assert.throws(()=>M.measuredAreaColumns([item],500,16,24,33));
});
/** Independent canvases share type settings only, with visible host-effect counters. */
function fixture(contribution=M.exampleSettingsContribution){
  const fallback={...definition,id:'org.example.other'};
  const views=new M.PlexViewRegistry([definition,fallback],definition.id);
  const registry=new M.CanvasViewSettingsRegistry(views,[contribution]);
  let stored={},mounted=true;const effects={workspace:0,configuration:0,camera:0,settings:0,failed:0};
  const session=new M.PlexViewSession(views,()=>effects.workspace++);
  const controller=new M.CanvasViewContributionController(session,registry,{
    settings:()=>stored,mounted:()=>mounted,beforePresentationChange:()=>effects.camera++,
    update:async(id,address,edit,expected)=>{stored=M.editViewConfigurationAt(views.resolve(id),stored,address,edit,expected);effects.configuration++;},
    openSettings:id=>{assert.equal(id,definition.id);effects.settings++;return true;},failed:()=>effects.failed++,
  });
  return {session,controller,registry,effects,get stored(){return stored},setStored:value=>{stored=value},unmount:()=>{mounted=false}};
}

test('View menu discovers inactive plugin choices and checks only the current view/subview', async()=>{
 const f=fixture();f.session.select('org.example.other');const before=f.effects.workspace;
 const rows=f.controller.selectionMenus();
 assert.equal(f.effects.workspace,before,'Reading inactive choices never selects or persists a view');
 const plugin=rows.find(row=>row.id===definition.id),other=rows.find(row=>row.id==='org.example.other');
 assert.equal(plugin.kind,'submenu');assert.equal(plugin.checked,false);assert.equal(other.kind,'action');assert.equal(other.checked,true);
 assert.deepEqual(plugin.items.map(row=>[row.id,row.checked]),[['left',false],['right',false]]);
 const choice=plugin.items[0].command;
 assert.equal((await choice.run()).status,'completed');assert.equal(f.session.definition.id,definition.id);assert.equal(f.session.state.side,-1);
 assert.equal((await choice.run()).status,'unavailable','A captured choice runs only once');
 const selected=f.controller.selectionMenus().find(row=>row.id===definition.id);
 assert.equal(selected.checked,true);assert.deepEqual(selected.items.map(row=>[row.id,row.checked]),[['left',true],['right',false]]);
 assert.equal(f.effects.configuration,0,'Subview selection remains session-local');
 f.controller.dispose();f.session.dispose();
});

test('View menu respects failed preflight, stale source/target configuration and retired canvases', async()=>{
 const f=fixture();f.session.select('org.example.other');
 const capture=()=>f.controller.selectionMenus().find(row=>row.id===definition.id).items[0].command;
 let release=f.session.guardSelection(async()=>false);
 assert.equal((await capture().run()).status,'unavailable');assert.equal(f.session.definition.id,'org.example.other');release();
 const stale=capture();f.session.updateState({});assert.equal((await stale.run()).status,'unavailable');
 const settings=capture();f.setStored(M.editViewConfiguration(definition,{},'spacing',120));assert.equal((await settings.run()).status,'unavailable');
 const retired=capture();f.unmount();assert.equal((await retired.run()).status,'unavailable');
 f.controller.dispose();f.session.dispose();
});

test('View menu automatically includes production Facets presets from an inactive session', async()=>{
 const registry=M.builtInCanvasViewSettings,session=new M.PlexViewSession(registry.views,()=>{});
 const controller=new M.CanvasViewContributionController(session,registry,{settings:()=>M.migrateAndMergeSettings({}).canvasViewSettings,mounted:()=>true,
  beforePresentationChange(){},update:async()=>{throw Error('Unexpected global settings write')},openSettings:()=>false,failed:error=>{throw error}});
 const rows=controller.selectionMenus();assert.deepEqual(rows.map(row=>row.id),['classic','mindmap','wuxing']);
 const facets=rows[2];assert.equal(facets.kind,'submenu');assert.deepEqual(facets.items.map(row=>row.id),['wuxing','map-roles']);
 const target=facets.items.find(row=>row.id!=='wuxing');assert(target);
 assert.equal((await target.command.run()).status,'completed');assert.equal(session.definition.id,'wuxing');
 assert.equal(controller.selectionMenus()[2].items.find(row=>row.id===target.id).checked,true);
 controller.dispose();session.dispose();
});

test('versioned public registration rejects incompatible contracts and omitted capabilities remain unavailable',()=>{
  assert.equal(M.CANVAS_VIEW_API_VERSION,1);assert.deepEqual(definition.capabilities,{});
  for(const alter of [d=>({...d,version:2}),d=>({...d,icon:'bad icon'}),d=>({...d,capabilities:{editor:'yes'}}),
    d=>({...d,project:null}),d=>({...d,defaultState:{data:'x'.repeat(17000)}})]){
    assert.throws(()=>new M.PlexViewRegistry([alter(definition)],definition.id));
  }
  assert.throws(()=>new M.PlexViewRegistry([definition,definition],definition.id));
  const f=fixture(),release=f.session.retainEditor();assert.equal(f.session.canSelect('org.example.other'),false);release();
  assert.equal(f.session.canSelect('org.example.other'),true);
});

/** Optional host admission is independent from source-frontier ownership and remains finite. */
test('hierarchy depth capabilities validate finite limits and preserve undeclared policies',()=>{
  const hierarchy={maximumScopes:1,primary:'expand',reduce:()=>null};
  const declared=maximumDepth=>({...definition,navigation:'rooted',hierarchy:{...hierarchy,maximumDepth}});
  for(const maximum of [0,-1,1.5,21,NaN,Infinity,'20',null,true])
    assert.throws(()=>new M.PlexViewRegistry([declared(maximum)],definition.id));
  for(const maximum of [1,8,20])
    assert.equal(new M.PlexViewRegistry([declared(maximum)],definition.id).resolve(definition.id).hierarchy.maximumDepth,maximum);
  assert.equal(new M.PlexViewRegistry([{...definition,navigation:'rooted',hierarchy}],definition.id).resolve(definition.id).hierarchy.maximumDepth,undefined);
});

/** Canonical finite chains exercise the actual shared projection admission and measurement owner. */
function depthSceneFixture(){
  const chain=Array.from({length:22},(_,index)=>'Depth'+index+'.md'),pages=new Map(chain.map(id=>{
    const page=viewPage(id);page.file={...page.file,name:id,basename:id.slice(0,-3),stat:{mtime:1,ctime:1,size:1}};return [id,page];
  }));
  const source={get:id=>pages.get(id),titleFor:page=>page.name,isVisiblePage:()=>true,sortNeighbours:rows=>rows,
    captureSemanticGateRead:()=>({isCurrent:()=>true}),explainRelationship:()=>null,
    viewScopeCoverage:()=>({coverage:'local',prepared:true,complete:true,pending:false}),
    neighbours:(page,role)=>{const position=chain.indexOf(page.path),target=chain[position+1];
      return role==='child'&&target?[{page:pages.get(target),role,relationType:1,typeDefinition:'Child',linkDirection:1}]:[];}};
  const settings={...M.migrateAndMergeSettings({}),maxItemCount:100,canvasViewSettings:{mindmap:{version:1,values:{maximumDepth:20}}}};
  const prepare=(policy,state=policy.defaultState)=>M.prepareViewScene(policy,M.plexViewRead(source,()=>true,100,chain[0],22),source,chain[0],state,settings,()=>true);
  /** Only fixture geometry policy is replaced; every edge refers to the real supplied canonical child. */
  const policy=(depth,maximumDepth)=>({...definition,id:'test.depth',navigation:'rooted',
    hierarchy:{maximumScopes:1,primary:'expand',reduce:()=>null,...(maximumDepth===undefined?{}:{maximumDepth})},
    project(input){
      const occurrences=chain.slice(0,depth+1).map((id,index)=>{const node=input.read.node(id);
        const relation=index?input.read.relations(chain[index-1],'child',1).items[0]:undefined;
        assert(node&&(!index||relation?.node.id===id));
        return {id:'n-'+index,nodeId:node.id,representation:'thought',...(relation?{role:'child',relation}:{}),
          ports:{top:'parent',bottom:'child'},branch:{...(index?{parent:'n-'+(index-1)}:{}),depth:index,side:1,expanded:index<depth,canExpand:index<depth,reference:false,status:'ready'}};});
      const edges=occurrences.slice(1).map((row,index)=>({id:'e-'+index,kind:'semantic',source:occurrences[index].id,target:row.id,
        sourceNode:occurrences[index].nodeId,targetNode:row.nodeId,relation:row.relation,sourcePort:'bottom',targetPort:'top'}));
      return {attention:input.attention,layoutRoot:input.layoutRoot,entry:'n-0',root:'n-0',frame:'n-0',occurrences,edges,truncated:false,coverage:'cached'};
    }});
  return {chain,prepare,policy};
}

/** Declaring twenty admits twenty, while legacy eight and explicit smaller bounds remain enforced. */
test('shared hierarchy admission honors declared depth without weakening the legacy or terminal bound',()=>{
  const f=depthSceneFixture();
  assert.equal(f.prepare(f.policy(8)).failure,false);
  assert.equal(f.prepare(f.policy(9)).failure,true);
  const deep=f.prepare(f.policy(20,20));assert.equal(deep.failure,false);assert.equal(deep.projection.occurrences.length,21);assert.equal(deep.scene.edges.length,20);
  assert.equal(f.prepare(f.policy(21,20)).failure,true);
  assert.equal(f.prepare(f.policy(1,1)).failure,false);
  assert.equal(f.prepare(f.policy(2,1)).failure,true);
});

/** Eight non-root scopes can expose a ninth-depth card; its limited continuation must not fail the view. */
test('production Mind Map admits depth nine while retaining its eight-scope expansion budget',()=>{
  const f=depthSceneFixture(),state={version:1,scope:f.chain[0],initialGenerations:1,collapsed:[],sides:{},
    expanded:f.chain.slice(1,9).map((_,index)=>JSON.stringify(f.chain.slice(0,index+2)))};
  const prepared=f.prepare(M.mindMapViewDefinition,state);
  assert.equal(prepared.failure,false,'A bounded ninth-depth card must not invalidate the entire scene');
  assert.equal(M.mindMapViewDefinition.hierarchy.maximumDepth,20);assert.equal(M.mindMapViewDefinition.hierarchy.maximumScopes,8);
  assert.equal(prepared.projection.preparation.parents.length,8);assert.equal(prepared.projection.occurrences.length,10);
  assert.equal(Math.max(...prepared.projection.occurrences.map(row=>row.branch.depth)),9);
  const limited=f.prepare(M.mindMapViewDefinition,{...state,expanded:[...state.expanded,JSON.stringify(f.chain.slice(0,10))]});
  assert.equal(limited.failure,false);assert.equal(limited.projection.truncated,true);assert.equal(limited.projection.preparation.parents.length,8);
  assert.equal(limited.projection.occurrences.length,10);assert.equal(limited.projection.occurrences.at(-1).branch.status,'limited');
});

test('badge budgets are explicit bounded capabilities and preserve the ordinary default',()=>{
  for(const budget of [0,-1,1.5,2049,NaN,Infinity])assert.throws(()=>new M.PlexViewRegistry([{...definition,capabilities:{badges:true},badgeBudget:budget}],definition.id));
  assert.throws(()=>new M.PlexViewRegistry([{...definition,badgeBudget:20}],definition.id));
  for(const budget of [1,16,2048])assert.equal(new M.PlexViewRegistry([{...definition,capabilities:{badges:true},badgeBudget:budget}],definition.id).resolve(definition.id).badgeBudget,budget);
  assert.equal(new M.PlexViewRegistry([definition],definition.id).resolve(definition.id).badgeBudget,undefined);
});

test('example projection/layout uses shared measurements and real canonical edge evidence without source access',()=>{
  const pages=new Map(['Focus.md','Child.md'].map(id=>[id,viewPage(id)]));let reads=0;
  for(const page of pages.values())page.file.stat={mtime:1,ctime:1,size:1};
  const source={get:id=>pages.get(id),isVisiblePage:()=>true,titleFor:page=>page.name,captureSemanticGateRead:()=>({isCurrent:()=>true}),
    neighbours:(page,role)=>{reads++;return page.path==='Focus.md'&&role==='child'?[{page:pages.get('Child.md'),role,relationType:1,linkDirection:1}]:[]},
    sortNeighbours:rows=>rows,explainRelationship:()=>null};
  const settings=M.migrateAndMergeSettings({});
  const prepare=(state,configuration={})=>M.prepareViewScene(definition,M.plexViewRead(source,()=>true,10,'Focus.md'),source,
    'Focus.md',state,{...settings,canvasViewSettings:configuration},()=>true);
  const right=prepare({version:1,side:1});assert.equal(right.failure,false);assert.equal(right.scene.nodes.length,2);
  assert.equal(right.scene.edges[0].sourcePath,'Focus.md');assert.equal(right.scene.edges[0].targetPath,'Child.md');
  assert.equal(right.scene.nodes.find(n=>n.page.path==='Child.md').x>0,true);assert.deepEqual(right.projection.heading,{literal:'Example columns'});
  const left=prepare({version:1,side:-1});assert.equal(left.scene.nodes.find(n=>n.page.path==='Child.md').x<0,true);
  const hidden=prepare({version:1,side:1},M.editViewConfiguration(definition,{},'showHeading',false));assert.equal(hidden.projection.heading,null);
  assert.equal(reads,3,'Only one bounded direct-role query per scene');
});

test('menu and panel choice commands share exact session state and independent restoration',async()=>{
  const a=fixture(),b=fixture();
  const menu=a.controller.menus()[0];assert.equal(menu.kind,'submenu');assert.equal(menu.items[1].checked,true);
  const left=a.controller.choices()[0].options[0].command;
  assert.deepEqual(await left.run(),{status:'completed'});assert.deepEqual(a.session.state,{version:1,side:-1});
  assert.deepEqual(b.session.state,{version:1,side:1});assert.deepEqual(await left.run(),{status:'unavailable'});
  assert.deepEqual(await menu.items[1].command.run(),{status:'unavailable'},'Older menu cannot undo a later choice');
  const restored=fixture();restored.session.restore(a.session.getState());assert.deepEqual(restored.session.state,a.session.state);
  assert.deepEqual(a.effects,{workspace:1,configuration:0,camera:1,settings:0,failed:0});
});

test('selection, revision, configuration, teardown and native lifetime changes retire captured callbacks',async()=>{
  for(const change of [f=>f.session.select('org.example.other'),f=>f.session.updateState({version:1,side:-1}),
    f=>f.setStored(M.editViewConfiguration(definition,{},'spacing',120)),f=>f.controller.dispose(),f=>f.unmount(),f=>f.session.dispose()]){
    const f=fixture(),captured=f.controller.capture({kind:'configuration',address:{field:'spacing'},edit:{kind:'set',value:100}});
    change(f);assert.equal((await captured.run()).status,'unavailable');assert.equal(f.effects.configuration,0);
  }
});

test('configuration and Settings commands use only the owning registered writer/page and preserve other namespaces',async()=>{
  const f=fixture();f.setStored({'org.example.other':{version:1,values:{opaque:'retained'}}});
  assert.equal((await f.controller.capture({kind:'configuration',address:{field:'spacing'},edit:{kind:'set',value:110}}).run()).status,'completed');
  assert.equal(f.stored[definition.id].values.spacing,110);assert.equal(f.stored['org.example.other'].values.opaque,'retained');
  assert.equal((await f.controller.capture({kind:'settings'}).run()).status,'completed');
  assert.equal(f.effects.settings,1);assert.equal(f.effects.workspace,0);
  assert.equal((await f.controller.capture({kind:'configuration',address:{field:'foreign'},edit:{kind:'set',value:1}}).run()).status,'failed');
  assert.equal(f.effects.failed,1);assert.equal(f.effects.configuration,1);
});

test('unsupported future state/configuration remains inert and is never destructively downgraded by commands',async()=>{
  const f=fixture(),future={version:3,side:-1,opaque:{payload:'retain'}};f.session.restore({version:1,id:definition.id,states:{[definition.id]:future}});
  const before=f.session.getState();assert.equal((await f.controller.capture({kind:'state',action:{id:'side',args:1}}).run()).status,'unavailable');
  assert.deepEqual(f.session.getState(),before);assert.equal(f.effects.workspace,0);
  f.setStored({[definition.id]:{version:7,values:{opaque:'retain'}}});
  assert.equal((await f.controller.capture({kind:'configuration',address:{field:'spacing'},edit:{kind:'set',value:100}}).run()).status,'unavailable');
  assert.equal(f.stored[definition.id].version,7);
});

test('bounded contribution admission rejects malformed/oversized descriptors without executing them',()=>{
  const action={kind:'action',id:'item',label:{literal:'Item'},command:{kind:'state',action:{id:'side',args:1}}};
  for(const menus of [[{...action,label:{literal:'x',key:'view.choose'}}],[{...action,command:{kind:'file-write'}}],
    Array.from({length:33},(_,i)=>({...action,id:'item'+i})),[action,action]]) assert.throws(()=>M.validateCanvasViewMenus(menus));
  let menus=[action];for(let i=0;i<5;i++)menus=[{kind:'submenu',id:'group',label:{literal:'Group'},items:menus}];
  assert.throws(()=>M.validateCanvasViewMenus(menus));
  const f=fixture({...M.exampleSettingsContribution,menus:()=>menus});assert.deepEqual(f.controller.menus(),[]);assert.equal(f.effects.failed,1);
  assert.deepEqual(new M.CanvasViewSettingsRegistry(f.session.registry,[]).layoutControls(definition),[]);
});

test('nested native control addresses retain stable identities and reject ambiguous/prototype paths',()=>{
  assert.deepEqual(M.canvasViewControl('canvasView:org.example.columns:presets:alpha/categories/~2/label'),
    {id:'org.example.columns',field:'presets',path:['alpha','categories',2,'label']});
  for(const key of ['canvasView:org.example.columns:presets:__proto__/label','canvasView:org.example.columns:presets:a//b',
    'canvasView:org.example.columns:presets:~01','canvasView:org.example.columns:presets:a/b/c/d/e/f/g'])assert.equal(M.canvasViewControl(key),null,key);
  assert.equal(M.validCanvasViewText({literal:''}),true);assert.equal(M.validCanvasViewText({literal:'view.choose'}),true);
  assert.equal(M.canvasViewText({literal:'view.choose'},()=>{throw Error('Literal must not use catalog')}),'view.choose');
});


test('captured view selection waits for the owning native save/close and retains direct guards',async()=>{
 const a=fixture(),b=fixture(),release=a.session.retainEditor();let finish,calls=0;
 a.session.guardSelection(async()=>{calls++;await new Promise(resolve=>finish=resolve);release();return true});
 const pending=a.session.requestSelection('org.example.other');assert.equal(a.session.definition.id,definition.id);assert.equal(a.session.canSelect('org.example.other'),false);
 b.session.select('org.example.other');finish();assert.equal(await pending,true);assert.equal(a.session.definition.id,'org.example.other');assert.equal(calls,1);
 assert.equal(await a.session.requestSelection('org.example.other'),true);assert.equal(calls,1,'Same view never closes native content');
});
test('failed save and retired selection cannot change the captured canvas or clear its editor lease',async()=>{
 const f=fixture(),release=f.session.retainEditor();f.session.guardSelection(async()=>false);
 assert.equal(await f.session.requestSelection('org.example.other'),false);assert.equal(f.session.definition.id,definition.id);assert.equal(f.session.canSelect('org.example.other'),false);
 release();let finish;f.session.guardSelection(()=>new Promise(resolve=>finish=resolve));const late=f.session.requestSelection('org.example.other');f.session.dispose();finish(true);assert.equal(await late,false);
});
test('invalid selection never invokes native preflight and newer selection requests supersede older ones',async()=>{
 const f=fixture(),pending=[];f.session.guardSelection(()=>new Promise(resolve=>pending.push(resolve)));
 assert.equal(await f.session.requestSelection('unknown'),false);assert.equal(pending.length,0);
 const first=f.session.requestSelection('org.example.other'),last=f.session.requestSelection('org.example.other');pending[0](true);assert.equal(await first,false);pending[1](true);assert.equal(await last,true);
});


test('non-scrolling viewports and stable filters are optional validated view capabilities',()=>{
 const f=depthSceneFixture(),base=M.mindMapViewDefinition;
 const policy=(viewport,reflow)=>({...base,layout(...args){const result=base.layout(...args);return {...result,areas:result.areas.map(area=>area.id!=='parent'?area:{...area,viewport:{...area.viewport,...viewport},reflow:{...area.reflow,...reflow}})}}});
 assert.equal(f.prepare(policy({},{})).failure,false);
 for(const viewport of [{edgeVisibility:'all'},{scrollable:true},{scrollable:'no'},{scrollable:false,initialScrollTop:1},{scrollable:false,contentHeight:100000}])assert.equal(f.prepare(policy(viewport,{})).failure,true,'Invalid fixed viewport declines scene admission');
 assert.equal(f.prepare(policy({}, {filterLayout:'repack'})).failure,true);
 assert.equal(f.prepare(policy({scrollable:undefined}, {filterLayout:undefined})).failure,false,'Legacy scroll and packing defaults remain accepted');
});


test('node status is an optional validated measured presentation shared by all view plugins',()=>{
 const node={x:100,y:200,width:160,height:44},status={width:200,height:12,presentation:'status'};
 assert.deepEqual(M.nodeBadgeBounds(node,status),{x:20,y:226,width:160,height:12});
 assert.deepEqual(M.nodeBadgeInsets(node,status),{bottom:16});
 assert.equal(M.validPlexNodeBadge({label:{literal:'Unassigned'},presentation:'status'}),true);
 for(const presentation of ['banner','',false,null])assert.equal(M.validPlexNodeBadge({label:{literal:'Status'},presentation}),false);
 const grid=M.measuredAreaGrid([{id:'a',width:160,height:44,insets:M.nodeBadgeInsets(node,status)},{id:'b',width:160,height:44,insets:M.nodeBadgeInsets(node,status)}],1,18,18);
 assert(grid.positions.get('b').y-grid.positions.get('a').y>=44+16+18,'Status clearance participates in shared packing');
});
