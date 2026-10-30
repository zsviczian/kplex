/** Actual focal-point fit math, graph camera/layout callbacks and native drawing fit lifetimes. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {loadPortableModules} from './support/portableTypeScript.mjs';
const {exports: {centeredViewportFit, sameFitCamera, EmbeddedDrawingFit, centerArrivalFrames, hasClickModifier, edgeViewportEndpoints, branchDisclosureReserve, edgeViewportClip, revealRowScrollTop, editorToolbarInsets}} = loadPortableModules([
  'src/ui/components/viewportFit.ts', 'src/adapters/obsidian/EmbeddedDrawingFit.ts', 'src/ui/components/centerArrival.ts', 'src/ui/components/modifierClick.ts', 'src/ui/plexViews/areaVisibility.ts', 'src/ui/plexViews/branchDisclosure.ts']);
const source=ts.createSourceFile('graph.tsx',readFileSync('src/ui/PlexGraph.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);

/** Run production callbacks with explicit finite composition dependencies, without a second policy. */
function callback(name, dependencies) {
  let selected;
  /** Select the actual declaration or layout callback, preserving its complete body. */
  const visit=node=>{
    if(name!=='layout'&&ts.isVariableDeclaration(node)&&node.name.getText(source)===name&&ts.isArrowFunction(node.initializer))selected=node.initializer.getText(source);
    if(name==='layout'&&ts.isCallExpression(node)&&node.expression.getText(source)==='useLayoutEffect'
      &&node.arguments[0]?.getText(source).includes('const shouldRecenter'))selected=node.arguments[0].getText(source);
    if(name==='branchReveal'&&ts.isCallExpression(node)&&node.expression.getText(source)==='useLayoutEffect'
      &&node.arguments[0]?.getText(source).includes('const pending = pendingBranchReveal.current'))selected=node.arguments[0].getText(source);
    if(name==='sidecar'&&ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect'
      &&node.arguments[0]?.getText(source).includes('previousSidecarOpen.current === sidecarOpen'))selected=node.arguments[0].getText(source);
    if(name==='reframeSidecarViewport'&&ts.isBinaryExpression(node)&&node.left.getText(source)==='reframeSidecarViewport.current')selected=node.right.getText(source);
    if(name==='hierarchyInitialFrame'&&ts.isCallExpression(node)&&node.expression.getText(source)==='useLayoutEffect'
      &&node.arguments[0]?.getText(source).includes('hierarchyInitialFrame.current'))selected=node.arguments[0].getText(source);
    ts.forEachChild(node,visit);
  };
  visit(source);assert(selected,name);
  const js=ts.transpileModule(`const selected=${selected};`,{compilerOptions:{target:ts.ScriptTarget.ES2021}}).outputText;
  return Function(...Object.keys(dependencies),`${js}\nreturn selected;`)(...Object.values(dependencies));
}

test('a cold rooted map fits its first prepared local cover once without claiming complete incidence or overriding manual/editor ownership',()=>{
 for(const mode of ['automatic','manual','editor','restored','retired']){
  const definition={id:'mindmap',hierarchy:{}},camera={x:20,y:30,scale:1};let prepared=false,fits=0,flushes=0;
  const context={viewDefinition:definition,viewLifetime:1,sceneScope:'R',activePath:'A',nodeId:value=>value,
   viewSession:{definition,getLifetime:()=>mode==='retired'?2:1,layoutRoot:()=> 'R',readTransient:()=>mode==='restored'?{camera}:undefined},hierarchyInitialFrame:{current:null},viewFailed:false,
   index:{viewScopeCoverage:()=>({prepared,complete:false})},boundEditorBinding:mode==='editor'?{id:'B1'}:undefined,
   settings:{allowAutozoom:true},automaticFit:{current:{path:'R',camera}},camera:{current:mode==='manual'?{...camera,x:21}:camera},sameFitCamera,
   fitCurrentScene:{current:()=>fits++},flushCameraTransform:()=>flushes++};
  const run=callback('hierarchyInitialFrame',context);run();assert.equal(fits,0);prepared=true;run();assert.equal(fits,mode==='automatic'?1:0,mode);
  context.boundEditorBinding=undefined;callback('hierarchyInitialFrame',context)();assert.equal(fits,mode==='automatic'?1:0,'No late fit after editor close or ordinary geometry change');assert.equal(flushes,fits);
 }
});

/** Supply an asymmetric displayed scene and real camera application/fit/layout owners. */
function graphFixture() {
  const ctx={camera:{current:{x:0,y:0,scale:1}},automaticFit:{current:null},activePath:'Center.md',rooted:false,
    committedCamera:{current:{x:0,y:0,scale:1}},cameraFlushRevision:{current:0},publishPublicScene:{current:()=>{}},
    cameraIntentPlaced:{current:false},
    previousCameraViewport:{current:null},boundEditorBinding:undefined,
    centralEditorOverlayElement:{current:null},cameraWritePending:{current:false},compassCenter:{current:null},compassSync:{current:()=>false},requestCameraFrame:()=>{},
    cameraFrame:{current:1},cameraElement:{current:null},syncCentralEditorOverlay:()=>{},
    scene:{nodes:[{role:'center',page:{path:'Center.md'},x:30,y:-20,width:200,height:100}],zoneViewports:{}},
    centralEditorMaximized:false,Platform:{isIosApp:false},IOS_MAX_ZOOM:2,MAX_ZOOM:5,ZONES:['child'],scrollZoneForRole:role=>role==='child'?'child':null,
    centeredViewportFit,sameFitCamera,sceneMotion:{cancelAll(){}},preserveCameraOnNextLayout:{current:false},displayResizeLayout:{current:false},
    centralEditorAvailabilityRef:{current:false},centralEditorAvailable:false,centralEditorNode:null,centralEditorSize:null,centralEditorSizeKeyRef:{current:''},
    previousNodeRects:{current:new Map([['prior',{}]])},pathChangedThisRender:true,navigationOrigin:'user',settings:{allowAutozoom:true,animationSpeed:0},incomingCenter:{current:null}};
  ctx.viewport={current:{clientWidth:800,clientHeight:600,clientLeft:0,clientTop:0,getBoundingClientRect:()=>({left:0,top:0}),ownerDocument:{defaultView:{getComputedStyle:()=>({transformOrigin:'100px 50px'})}},querySelectorAll:()=>[
    {classList:{contains:value=>value==='kplex-role-center'},dataset:{kplexPath:ctx.activePath},getBoundingClientRect:()=>({left:300,top:250,width:200,height:100})}]}};
  /** Rebind render-owned callbacks after navigation just as React composition does. */
  ctx.render=()=>{ctx.sceneScope=ctx.rooted ? 'Root.md' : ctx.activePath;ctx.classic=true;ctx.areaForNode=callback('areaForNode',ctx);ctx.framingOccurrence=callback('framingOccurrence',ctx);ctx.applyCamera=callback('applyCamera',ctx);ctx.flushCameraTransform=callback('flushCameraTransform',ctx);ctx.fit=callback('fit',ctx);ctx.layout=callback('layout',ctx);};
  ctx.render();return ctx;
}

test('camera publication observes the written DOM transform and copied committed coordinates before later intent',()=>{
 const ctx=graphFixture(),published=[];ctx.cameraElement.current={style:{transform:''}};
 ctx.publishPublicScene.current=()=>published.push({transform:ctx.cameraElement.current.style.transform,camera:{...ctx.committedCamera.current},revision:ctx.cameraFlushRevision.current});
 ctx.applyCamera({x:75,y:-20,scale:1.5});assert.equal(published.length,0);assert.deepEqual(ctx.committedCamera.current,{x:0,y:0,scale:1});
 ctx.flushCameraTransform();assert.deepEqual(published,[{transform:'translate(75px, -20px) scale(1.5)',camera:{x:75,y:-20,scale:1.5},revision:1}]);
 ctx.applyCamera({x:90,y:40,scale:2});assert.deepEqual(ctx.committedCamera.current,{x:75,y:-20,scale:1.5});assert.equal(published.length,1);
 ctx.flushCameraTransform();assert.equal(published[1].revision,2);assert.equal(published[1].transform,'translate(90px, 40px) scale(2)');assert.equal(ctx.cameraWritePending.current,false);
});

test('a rooted automatic camera follows native startup viewport shrink without moving manual cameras or live editors',()=>{
 for(const allowAutozoom of [true,false])for(const owner of ['automatic','manual','editor']){
  const ctx=graphFixture();ctx.rooted=true;ctx.settings.allowAutozoom=allowAutozoom;ctx.scene.nodes[0].x=0;ctx.scene.nodes[0].y=0;ctx.camera.current.scale=1.6;ctx.viewport.current.clientHeight=2591;ctx.render();ctx.layout();
  assert.equal(ctx.camera.current.y+ctx.scene.nodes[0].y*ctx.camera.current.scale,2591/2);
  if(owner==='manual')ctx.applyCamera({...ctx.camera.current,y:500});
  if(owner==='editor')ctx.boundEditorBinding={id:'live-B'};
  const before={...ctx.camera.current};ctx.viewport.current.clientHeight=713;ctx.pathChangedThisRender=false;ctx.render();ctx.layout();
  if(owner==='automatic')assert.equal(ctx.camera.current.y+ctx.scene.nodes[0].y*ctx.camera.current.scale,713/2,'Root stays inside the actual pane after native/CSS layout settles');
  else assert.deepEqual(ctx.camera.current,before,owner+' camera ownership survives viewport geometry');
  if(!allowAutozoom)assert.equal(ctx.camera.current.scale,before.scale,'Disabled autozoom retains zoom through native viewport correction');
 }
});

test('Ctrl or Cmd wheel zooms over both bounded list types while native editor and modal scrolling remain native', () => {
  for (const surface of ['.kplex-zone-scroll', '.kplex-expanded-scroll', '.kplex-central-editor-content', '.modal-container', 'canvas'])
    for (const modifier of [null, 'ctrlKey', 'metaKey']) {
    const ctx = graphFixture();let prevented = false;
    Object.assign(ctx, {el:ctx.viewport.current, panDrag:{current:null}});
    const wheel = callback('wheel', ctx);
    wheel({target:{closest:selector=>selector.split(', ').includes(surface) ? {} : null},ctrlKey:modifier==='ctrlKey',metaKey:modifier==='metaKey',clientX:200,clientY:150,deltaY:-100,preventDefault(){prevented=true}});
    const zoom = surface==='canvas' || !!modifier && (surface==='.kplex-zone-scroll'||surface==='.kplex-expanded-scroll');
    assert.equal(prevented, zoom, surface+'/'+modifier);
    assert.equal(ctx.camera.current.scale > 1, zoom);
    if (zoom) {
      assert(Math.abs((200-ctx.camera.current.x)/ctx.camera.current.scale-200)<1e-8);
      assert(Math.abs((150-ctx.camera.current.y)/ctx.camera.current.scale-150)<1e-8);
    }
  }
});

test('passive follow cancels existing motion and suppresses immediate and late-layout arrivals while deliberate navigation still animates', /** Run the production preparation/layout owners with positive animation speed and inspect actual emitted frames. */ () => {
  const ctx=graphFixture(),plays=[],classes=['kplex-role-center'];
  classes.contains=/** Supply native class membership used by the production layout callback. */ value=>classes.includes(value);
  let cancels=0;
  Object.assign(ctx,{selection:{readSelected:()=>null},navigationOccurrence:{current:null},wanderMotion:{current:false},centerArrivalFrames,
    sceneMotion:{cancelAll(){cancels++},play(element,frames,options){plays.push({frames,options})}},
    areaResizeDrag:{current:null},nodeDrag:null,connectDrag:null,suppressLayoutMotionUntil:{current:0}});
  ctx.viewport.current.getBoundingClientRect=/** Bound captured deliberate source geometry. */ ()=>({left:0,top:0,right:800,bottom:600});
  ctx.viewport.current.querySelectorAll=/** Present one live center whose old geometry differs from its final layout. */ ()=>[{
    dataset:{kplexPath:ctx.activePath},classList:classes,getBoundingClientRect:()=>({left:300,top:250,width:200,height:100,right:500,bottom:350})}];
  ctx.settings.animationSpeed=1;
  const prepare=callback('prepareNavigation',ctx);
  ctx.incomingCenter.current={identity:ctx.activePath,rect:{left:10,top:10,width:200,height:100},origin:'user'};
  ctx.navigationOccurrence.current={identity:ctx.activePath,id:'old'};
  prepare(ctx.activePath,'follow');assert.equal(cancels,1);assert.equal(ctx.incomingCenter.current,null);assert.equal(ctx.navigationOccurrence.current,null);
  ctx.navigationOrigin='follow';ctx.render();ctx.layout();assert.equal(plays.length,0);
  ctx.pathChangedThisRender=false;ctx.scene.nodes.push({role:'right',page:{path:'Late.md'},x:1000,y:0,width:200,height:100});ctx.render();ctx.layout();assert.equal(plays.length,0);
  ctx.navigationOrigin='user';ctx.pathChangedThisRender=true;
  ctx.incomingCenter.current={identity:ctx.activePath,rect:{left:10,top:10,width:200,height:100},origin:'user'};
  ctx.render();ctx.layout();assert.equal(plays.length,1);assert(plays[0].frames.length>2,'deliberate center retains its curved arrival');
});

test('same-center navigation-origin changes retain outline expansion while genuine center changes reset it', /** Execute the real outline effect with React-style dependency comparisons. */ () => {
  let effect;
  /** Locate the production owner instead of recreating its outline policy. */
  const visit=node=>{
    if(ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect'
      &&node.arguments[0]?.getText(source).includes('transitionPath.current = sceneScope'))effect=node;
    ts.forEachChild(node,visit);
  };
  visit(source);assert(effect);
  const ctx={activePath:'Center.md',sceneScope:'Center.md',navigationOrigin:'follow',settings:{animationSpeed:1},transitionPath:{current:'Center.md'},sectionFoldCenter:{current:'Center.md'},
    setSectionExpanded(){ctx.expanded=false},setSectionExpansion(){ctx.expansion=null},setExpandedSectionIds(ids){ctx.ids=ids}};
  const js=ts.transpileModule(`const effect=${effect.arguments[0].getText(source)};const deps=${effect.arguments[1].getText(source)};`,{compilerOptions:{target:ts.ScriptTarget.ES2021}}).outputText;
  let previous;
  /** Run only when the production effect's actual dependency values change. */
  const render=()=>{
    const {effect:run,deps}=Function(...Object.keys(ctx),`${js}\nreturn {effect,deps};`)(...Object.values(ctx));
    if(!previous||deps.some((value,index)=>!Object.is(value,previous[index])))run();previous=deps;
  };
  render();ctx.expanded=true;ctx.expansion={outline:true};ctx.ids=new Set(['section']);
  ctx.navigationOrigin='user';render();assert.equal(ctx.expanded,true);assert.deepEqual([...ctx.ids],['section']);assert(ctx.expansion);
  ctx.activePath='Next.md';ctx.sceneScope=ctx.activePath;render();assert.equal(ctx.expanded,false);assert.equal(ctx.expansion,null);assert.equal(ctx.ids.size,0);
});

test('passive follow retires a deliberate transition through its original owning window', /** Execute the production transition effect across two window identities. */ () => {
  let selected;
  /** Locate the real timer owner rather than substituting a timer policy. */
  const visit=node=>{
    if(ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect'
      &&node.arguments[0]?.getText(source).includes('setSceneTransitioning(navigationOrigin !== "follow")'))selected=node.arguments[0].getText(source);
    ts.forEachChild(node,visit);
  };
  visit(source);assert(selected);
  const cleared=[],created=[],prior={clearTimeout:id=>cleared.push(['prior',id])},owner={
    clearTimeout:id=>cleared.push(['owner',id]),setTimeout(fn,ms){created.push({fn,ms});return 9}};
  const ctx={navigationOrigin:'follow',settings:{animationSpeed:1},viewport:{current:{ownerDocument:{defaultView:owner}}},window:owner,
    sceneTransitionTimer:{current:4},sceneTransitionTimerWindow:{current:prior},setSceneTransitioning:value=>{ctx.transitioning=value}};
  const js=ts.transpileModule(`const selected=${selected};`,{compilerOptions:{target:ts.ScriptTarget.ES2021}}).outputText;
  const run=()=>Function(...Object.keys(ctx),`${js}\nreturn selected();`)(...Object.values(ctx));
  run();assert.deepEqual(cleared,[['prior',4]]);assert.equal(created.length,0);assert.equal(ctx.transitioning,false);assert.equal(ctx.sceneTransitionTimerWindow.current,null);
  ctx.navigationOrigin='user';run();assert.equal(created.length,1);assert.equal(ctx.sceneTransitionTimerWindow.current,owner);assert.equal(ctx.transitioning,true);
  ctx.navigationOrigin='follow';run();assert.deepEqual(cleared,[['prior',4],['owner',9]]);assert.equal(created.length,1);assert.equal(ctx.transitioning,false);
});

test('asymmetric bounds keep the focus centered and every padded displayed extent inside the viewport',()=>{
  for(const [width,height]of [[800,600],[240,300],[1440,875]]){
    const focus={x:37,y:-23},bounds={left:-300,top:-120,right:1500,bottom:900};
    const camera=centeredViewportFit(width,height,focus,bounds,5);
    assert.equal(camera.x+focus.x*camera.scale,width/2);assert.equal(camera.y+focus.y*camera.scale,height/2);
    assert(camera.x+bounds.left*camera.scale>=46-1e-8);assert(camera.x+bounds.right*camera.scale<=width-46+1e-8);
    assert(camera.y+bounds.top*camera.scale>=46-1e-8);assert(camera.y+bounds.bottom*camera.scale<=height-46+1e-8);
  }
});

test('actual graph fit follows late nodes and bounded panels, and all manual camera applications retire it',()=>{
  const ctx=graphFixture();ctx.layout();ctx.pathChangedThisRender=false;
  const initial=ctx.camera.current.scale;
  ctx.scene.nodes.push({role:'right',page:{path:'Late.md'},x:1200,y:200,width:200,height:100});ctx.render();ctx.layout();
  assert(ctx.camera.current.scale<initial);assert.equal(ctx.camera.current.x+30*ctx.camera.current.scale,400);
  assert.equal(ctx.camera.current.y-20*ctx.camera.current.scale,300);
  // A bounded zone fits its viewport, not thousands of offscreen overflow rows.
  ctx.scene.zoneViewports.child={left:-200,top:100,width:400,height:200};
  ctx.scene.nodes.push({role:'child',page:{path:'Overflow.md'},x:0,y:50000,width:300,height:30});ctx.render();ctx.fit();
  assert(ctx.camera.current.scale>0.1);
  const fitted={...ctx.camera.current};ctx.applyCamera(c=>({...c,scale:c.scale*1.3,x:c.x+17}));
  const manual={...ctx.camera.current};ctx.scene.nodes.push({role:'right',page:{path:'Later.md'},x:5000,y:0,width:200,height:100});ctx.render();ctx.layout();
  assert.deepEqual(ctx.camera.current,manual);assert.equal(ctx.automaticFit.current,null);
  ctx.centralEditorAvailable=true;ctx.centralEditorAvailabilityRef.current=true;
  ctx.centralEditorSize={width:450,height:400};ctx.render();ctx.layout();
  assert.deepEqual(ctx.camera.current,manual,'a fluid editor frame resize cannot revive retired camera fitting');
  ctx.applyCamera(fitted);ctx.render();ctx.layout();assert.deepEqual(ctx.camera.current,fitted,'returning to old coordinates does not renew automatic ownership');
  ctx.fit();assert(ctx.automaticFit.current);ctx.scene.nodes.push({role:'left',page:{path:'Newest.md'},x:-7000,y:0,width:200,height:100});ctx.render();ctx.layout();
  assert(ctx.camera.current.scale<fitted.scale,'explicit Fit renews ownership for later publication');
});

test('navigation renews graph fitting but disabled autozoom and deliberate display transitions preserve manual intent',()=>{
  const ctx=graphFixture();ctx.layout();ctx.applyCamera({x:91,y:83,scale:1.7});
  ctx.activePath='Next.md';ctx.pathChangedThisRender=true;ctx.scene.nodes[0].page.path=ctx.activePath;ctx.render();ctx.layout();
  assert.equal(ctx.automaticFit.current.path,'Next.md');assert.equal(ctx.camera.current.x+30*ctx.camera.current.scale,400);
  const prior={...ctx.camera.current};ctx.pathChangedThisRender=false;ctx.preserveCameraOnNextLayout.current=true;
  ctx.scene.nodes.push({role:'right',page:{path:'New.md'},x:5000,y:0,width:100,height:50});ctx.render();ctx.layout();assert.deepEqual(ctx.camera.current,prior);
  ctx.settings.allowAutozoom=false;ctx.render();ctx.layout();assert.deepEqual(ctx.camera.current,prior);
});

test('manual input during an initially empty neighborhood remains authoritative when its first nodes arrive',()=>{
  const ctx=graphFixture(),nodes=ctx.scene.nodes;ctx.scene.nodes=[];ctx.layout();ctx.pathChangedThisRender=false;
  ctx.applyCamera({x:123,y:91,scale:0.7});ctx.scene.nodes=nodes;ctx.render();ctx.layout();
  assert.deepEqual(ctx.camera.current,{x:123,y:91,scale:0.7});assert.equal(ctx.automaticFit.current,null);
});

test('Sidecar open/close frames the latest focal node at every pane orientation, fitting only when autozoom is enabled',()=>{
  for(const allowAutozoom of [false,true])for(const [width,height]of [[400,600],[1200,600],[800,300],[800,900]]) {
    const ctx=graphFixture();Object.assign(ctx.viewport.current,{isConnected:true,clientWidth:width,clientHeight:height});
    ctx.settings.allowAutozoom=allowAutozoom;ctx.camera.current={x:91,y:83,scale:1.7};ctx.automaticFit.current=null;
    callback('reframeSidecarViewport',ctx)();
    const camera=ctx.camera.current;
    assert(Math.abs(camera.x+30*camera.scale-width/2)<1e-9);assert(Math.abs(camera.y-20*camera.scale-height/2)<1e-9);
    if(allowAutozoom)assert(ctx.automaticFit.current,'Sidecar framing renews the existing fit owner after manual movement');
    else {assert.equal(camera.scale,1.7);assert.equal(ctx.automaticFit.current,null);}
  }
  for(const condition of [{isConnected:false},{clientWidth:0},{clientHeight:0}]) {
    const ctx=graphFixture();Object.assign(ctx.viewport.current,{isConnected:true},condition);const prior={...ctx.camera.current};
    callback('reframeSidecarViewport',ctx)();assert.deepEqual(ctx.camera.current,prior,'Hidden/retired viewports do not write the camera');
  }
});

test('Sidecar framing waits for layout, uses the latest render and releases its owning-window frames and input listeners',()=>{
  for(const opening of [false,true])for(const interrupt of [null,'pointerdown','wheel','keydown','navigation']) {
    const frames=new Map(),listeners=new Map();let serial=0,framed=0;
    const owner={requestAnimationFrame(fn){const id=++serial;frames.set(id,fn);return id;},cancelAnimationFrame(id){frames.delete(id);}};
    const el={ownerDocument:{defaultView:owner},addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(type,fn){if(listeners.get(type)===fn)listeners.delete(type);}};
    const ctx={viewport:{current:el},previousSidecarOpen:{current:!opening},sidecarOpen:opening,reframeSidecarViewport:{current:()=>{throw Error('Stale render');}}};
    const cleanup=callback('sidecar',ctx)();assert.equal(frames.size,1);assert.equal(listeners.size,3);
    const first=[...frames.values()][0];frames.clear();first();assert.equal(framed,0);assert.equal(frames.size,1);
    const retired=[...frames.values()][0];ctx.reframeSidecarViewport.current=()=>framed++;
    if(interrupt==='navigation')cleanup();else if(interrupt)listeners.get(interrupt)();
    frames.clear();retired();assert.equal(framed,interrupt?0:1);assert.equal(listeners.size,0);cleanup();assert.equal(frames.size,0);
    assert.equal(callback('sidecar',ctx)(),undefined,'Unchanged ownership, unrelated notifications and ordinary splitter resizing never schedule framing');
  }
});

test('central-editor opening accepts every modifier through the existing expansion/camera owner and retains sidepanel restrictions',()=>{
  for(const centralEditorCanMaximize of [false,true])for(let mask=0;mask<16;mask++) {
    const camera={x:81,y:53,scale:1.7};let enabled=false;
    const ctx={hasClickModifier,centralEditorCanMaximize,centralEditorMaximized:false,camera:{current:camera},
      preserveCameraOnNextLayout:{current:false},suppressAutoFitUntil:{current:0},centralEditorRestoreCamera:{current:null},restoreCentralEditorCamera:{current:false},
      setCentralEditorMaximized(value){ctx.centralEditorMaximized=value;},onCentralNodeEditorChange(value){enabled=value;}};
    ctx.setCentralEditorMaximizedState=callback('setCentralEditorMaximizedState',ctx);
    callback('openCentralEditor',ctx)({altKey:!!(mask&1),ctrlKey:!!(mask&2),metaKey:!!(mask&4),shiftKey:!!(mask&8)});
    assert.equal(enabled,true);assert.equal(ctx.centralEditorMaximized,centralEditorCanMaximize&&mask!==0);
    if(ctx.centralEditorMaximized){assert.deepEqual(ctx.centralEditorRestoreCamera.current,camera);ctx.setCentralEditorMaximizedState=callback('setCentralEditorMaximizedState',ctx);ctx.setCentralEditorMaximizedState(false);assert.equal(ctx.restoreCentralEditorCamera.current,true);}
    else assert.equal(ctx.centralEditorRestoreCamera.current,null,'Ordinary opening and unsupported expansion do not claim the camera');
  }
});

test('the actual thought-corner control forwards modifier-bearing events while stopping native navigation/bubbling',()=>{
  const file=ts.createSourceFile('ThoughtNode.tsx',readFileSync('src/ui/ThoughtNode.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let selected;
  /** Read the actual button callback, without duplicating its modifier transport. */
  const visit=node=>{if(ts.isJsxElement(node)&&node.openingElement.attributes.properties.some(a=>a.name?.text==='className'&&a.initializer?.text==='kplex-thought-corner-action'))selected=node.openingElement.attributes.properties.find(a=>a.name?.text==='onClick').initializer.expression;ts.forEachChild(node,visit);};visit(file);assert(selected);
  const output=ts.transpileModule(`const handler=${selected.getText(file)};`,{compilerOptions:{target:ts.ScriptTarget.ES2021}}).outputText;
  let corner;
  /** Confirm the rendered graph connects the corner control to the tested opening owner. */
  const graphVisit=node=>{if(ts.isJsxAttribute(node)&&node.name.text==='cornerAction')corner=node.initializer.expression.whenTrue;ts.forEachChild(node,graphVisit);};graphVisit(source);assert(corner);
  const routing=ts.transpileModule(`const route=${corner.properties.find(p=>p.name.text==='onClick').initializer.getText(source)};`,{compilerOptions:{target:ts.ScriptTarget.ES2021}}).outputText;
  for(const occurrenceEditorPolicy of [false,true])for(const central of [false,true])for(const classic of [undefined,{}]){
    let forwarded,request;const baseNode={page:{path:'B.md'},occurrenceId:'B1'};
    const route=Function('occurrenceEditorPolicy','isEditorOccurrence','openCentralEditor','runNodeAction','baseNode','occurrenceKey','classic','sceneNodeKeys','editorTarget',`${routing};return route;`)(occurrenceEditorPolicy,()=>central,event=>{forwarded=event},(...args)=>{request=args},baseNode,node=>node.occurrenceId,classic,new Map([[baseNode,'classic-key']]),baseNode.page);
    const event={metaKey:true};route(event);
    if(occurrenceEditorPolicy||!central){assert.deepEqual(request,['editor.expand',baseNode.page,classic?'classic-key':'B1']);assert.equal(forwarded,undefined)}
    else{assert.equal(forwarded,event);assert.equal(request,undefined)}
  }
  let actual;const handler=Function('cornerAction',`${output};return handler;`)({onClick:event=>{actual=event;}});
  for(let mask=0;mask<16;mask++){let prevented=false,stopped=false;const event={altKey:!!(mask&1),ctrlKey:!!(mask&2),metaKey:!!(mask&4),shiftKey:!!(mask&8),preventDefault(){prevented=true;},stopPropagation(){stopped=true;}};handler(event);assert.equal(actual,event);assert(prevented&&stopped);}
});

/** Use explicit animation-frame batches to expose cancellation and native state changes without sleeps. */
function drawingFixture() {
  let next=0,fits=0;const frames=new Map(),state={owner:{},width:300,height:200,camera:{x:0,y:0,scale:0.55},eligible:true};
  const ownerWindow={requestAnimationFrame:fn=>{const id=++next;frames.set(id,fn);return id},cancelAnimationFrame:id=>frames.delete(id)};
  const controller=new EmbeddedDrawingFit(ownerWindow,()=>({...state,camera:{...state.camera}}),()=>{fits++;state.camera={x:-50,y:20,scale:0.8}});
  /** Execute one native frame, keeping later frames queued separately. */
  const flush=()=>{const pending=[...frames.values()];frames.clear();for(const fn of pending)fn()};
  return{controller,state,frames,flush,fits:()=>fits};
}

test('untouched reading drawing refits changed dimensions once and records its new native camera',()=>{
  const f=drawingFixture();f.controller.resize();f.flush();f.flush();assert.equal(f.fits(),0);
  f.state.width=600;f.controller.resize();f.controller.resize();f.flush();f.flush();f.flush();assert.equal(f.fits(),1);
  f.controller.resize();f.flush();f.flush();assert.equal(f.fits(),1,'ordinary render does not refit');
  f.state.height=400;f.controller.resize();f.flush();f.flush();f.flush();assert.equal(f.fits(),2);
  f.controller.dispose();assert.equal(f.frames.size,0);
});

test('drawing input, external camera changes and disposal cancel resize fitting until a new opening',()=>{
  for(const interrupt of [f=>f.controller.interrupt(),f=>{f.state.camera.x=100}]){
    const f=drawingFixture();f.controller.resize();f.flush();f.flush();f.state.width=500;f.controller.resize();interrupt(f);f.flush();f.flush();
    assert.equal(f.fits(),0);f.state.width=700;f.controller.resize();f.flush();f.flush();assert.equal(f.fits(),0);
    f.controller.reset();f.controller.resize();f.flush();f.flush();f.state.height=400;f.controller.resize();f.flush();f.flush();f.flush();assert.equal(f.fits(),1);
    f.controller.dispose();
  }
  const f=drawingFixture();f.controller.resize();const retired=[...f.frames.values()][0];f.controller.dispose();retired();f.flush();assert.equal(f.fits(),0);assert.equal(f.frames.size,0);
});

test('a newer native resize during post-fit recording does not mistake our camera update for manual input',()=>{
  const f=drawingFixture();f.controller.resize();f.flush();f.flush();
  f.state.width=600;f.controller.resize();f.flush();f.flush();assert.equal(f.fits(),1);
  f.state.height=500;f.controller.resize();f.flush();f.flush();f.flush();assert.equal(f.fits(),2);
  f.controller.dispose();
});

test('drawing fit excludes edit/fullscreen/disabled/loading reads and never applies a retired opening callback',()=>{
  const f=drawingFixture();f.controller.resize();f.flush();f.flush();f.state.width=800;f.state.eligible=false;f.controller.resize();f.flush();f.flush();assert.equal(f.fits(),0);
  f.state.eligible=true;f.controller.resize();const retired=[...f.frames.values()][0];f.controller.reset();f.state.owner={};retired();f.flush();f.flush();assert.equal(f.fits(),0);
  f.controller.dispose();
});


test('Compass tint uses the actual center card while a different occurrence hosts the native editor',()=>{
 for(const role of ['center','child']){const ctx=graphFixture();ctx.centralEditorAvailable=true;ctx.centralEditorNode={role};
  ctx.centralEditorOverlayElement.current={getBoundingClientRect:()=>({left:70,top:80,width:580,height:340})};ctx.render();ctx.layout();
  const actual=ctx.compassCenter.current;assert(actual);
  const camera=ctx.camera.current;
  assert(Math.abs(actual.left*camera.scale+camera.x-(role==='center'?70:300))<1e-8);
  assert(Math.abs(actual.top*camera.scale+camera.y-(role==='center'?80:250))<1e-8);
  assert(Math.abs(actual.width*camera.scale-(role==='center'?580:200))<1e-8);
  assert.equal(actual.element===null,role==='center','Only a central editor replaces the center-card measurement owner');
 }
});


test('area edge clipping follows physical occurrences independently of canonical endpoints and scroll visibility',()=>{
 const area={key:'parent',left:-400,top:-700,width:900,height:160};
 const a={x:20,y:-1200,width:150,height:40},b={x:250,y:-630,width:160,height:40},root={x:0,y:0,width:300,height:80};
 const nodes=new Map([['a',a],['heading',a],['b',b],['root',root]]),viewport=node=>node===root?undefined:area;
 const edge={sourcePath:'canonical-source',targetPath:'canonical-target',sourceOccurrence:'a',targetOccurrence:'b'};
 assert.deepEqual(edgeViewportClip(edge,nodes,viewport),{left:-400,top:-700,width:900,height:160});
 assert.deepEqual(edgeViewportClip({...edge,sourceOccurrence:'absent',sourceSectionOccurrence:'heading'},nodes,viewport),{left:-400,top:-700,width:900,height:160});
 const crossing=edgeViewportClip({...edge,targetOccurrence:'root'},nodes,viewport);
 assert(crossing.top===area.top&&crossing.top+crossing.height>=root.y+root.height/2,'Cross-area route includes bounded source aperture and actual external target');
 assert.equal(edgeViewportClip(edge,nodes,()=>undefined),undefined);
 assert.equal(edgeViewportClip({...edge,targetOccurrence:'missing'},nodes,viewport),undefined);
 assert.equal(edge.sourcePath,'canonical-source');assert.equal(a.y,-1200,'Clipping never moves the physical source to a fabricated gate');
});

test('expansion reveal minimally scrolls measured rows and clamps large or edge rows to content bounds',()=>{
 assert.equal(revealRowScrollTop(500,40,0,160,1000),360);
 assert.equal(revealRowScrollTop(500,40,360,160,1000),360);
 assert.equal(revealRowScrollTop(100,40,360,160,1000),80);
 assert.equal(revealRowScrollTop(980,40,0,160,1000),840);
 assert.equal(revealRowScrollTop(0,40,100,160,1000),0);
 assert.equal(revealRowScrollTop(500,400,0,160,1000),300);
});


test('delayed fixed-area expansion reveal keeps exact identity and yields to user camera/root/view retirement',()=>{
 for(const mode of ['current','manual','root','view','fold','before-commit']){
  const node={page:{path:'B'},occurrenceId:'B1',height:40,branch:{expanded:mode!=='fold',status:'loading'}},camera={current:{x:4,y:5,scale:1}},old={};let revealed=0;
  const pending={id:'B1',lifetime:1,scope:'R',previousScene:old,camera:{...camera.current}},ctx={pendingBranchReveal:{current:pending},viewLifetime:mode==='view'?2:1,sceneScope:mode==='root'?'other':'R',camera,sameFitCamera,
   scene:mode==='before-commit'?old:{nodes:[node],zoneViewports:{parent:{scrollable:false}}},occurrenceKey:node=>node.occurrenceId,areaForNode:()=> 'parent',zoneScrollRefs:{current:{parent:{scrollTop:0,clientHeight:1000,scrollHeight:1000}}},zoneDisplayLayouts:{parent:{localPositions:new Map([['B1',{y:500}]])}},
   revealRowScrollTop,setZoneScrollTop:()=>{},sceneNodeKeys:new Map([[node,'B1']]),revealFindHit:(path,id)=>{assert.equal(path,'B');assert.equal(id,'B1');revealed++;camera.current={...camera.current,y:15}}};
  if(mode==='manual')camera.current.x++;
  const run=callback('branchReveal',ctx);run();assert.equal(revealed,mode==='current'?1:0,mode);
  if(mode==='current'){assert.deepEqual(pending.camera,camera.current,'Own minimal reveal does not cancel final loading settlement');camera.current.x++;run();assert.equal(revealed,1);assert.equal(ctx.pendingBranchReveal.current,null,'User movement retires delayed reveal');}
  else if(mode==='before-commit')assert.equal(ctx.pendingBranchReveal.current,pending);else assert.equal(ctx.pendingBranchReveal.current,null,mode);
 }
});


test('area-hosted editor toolbar intersects canvas and area without resizing or panning its native document',()=>{
 const canvas={width:800,height:600},editor={left:-150,top:-200,width:500,height:500},area={left:-100,top:-300,width:1000,height:900};
 assert.deepEqual(editorToolbarInsets(editor,canvas,area),{top:200,left:150,right:0});
 assert.deepEqual(editorToolbarInsets({...editor,left:600,top:50},canvas,area),{top:0,left:0,right:300});
 assert.deepEqual(editorToolbarInsets({left:100,top:100,width:500,height:400},canvas,{left:200,top:150,width:300,height:300}),{top:50,left:100,right:100});
 assert.deepEqual(editor,{left:-150,top:-200,width:500,height:500});
});


test('visible-endpoint area policy suppresses hidden physical attachments without changing legacy routes',()=>{
 const source={x:0,y:0,width:100,height:40},target={x:200,y:150,width:100,height:40},area={key:'diagnostics',left:120,top:100,width:200,height:100,edgeVisibility:'visible-endpoints'},nodes=new Map([['source',source],['target',target],['heading',target]]);
 const edge={sourcePath:'source',targetPath:'target',sourceOccurrence:'source',targetOccurrence:'target',sourcePort:'right',targetPort:'top'},viewport=node=>node===target?area:undefined;
 const frozen=JSON.stringify(edge);assert(edgeViewportClip(edge,nodes,viewport));
 target.y=70;assert.equal(edgeViewportClip(edge,nodes,viewport),null,'Fully scrolled-out target has no stroke, marker, caption or hit path');
 target.y=110;assert.equal(edgeViewportClip(edge,nodes,viewport),null,'Partly visible card with hidden top gate has no floating arrow');
 target.y=120;assert(edgeViewportClip(edge,nodes,viewport),'An attachment exactly at the boundary is visible');
 target.y=240;assert.equal(edgeViewportClip({...edge,sourceSectionOccurrence:'heading',targetOccurrence:'source'},nodes,viewport),null,'Exact physical section endpoint follows the same policy');
 assert(edgeViewportClip(edge,nodes,node=>node===target?{...area,edgeVisibility:undefined}:undefined),'Existing through-area behavior remains the default');
 assert.equal(JSON.stringify(edge),frozen,'Paint never changes canonical endpoint/evidence identity');
});


test('reload viewport settlement keeps attention-following Compass and off-origin Facets visible without navigation',()=>{
 for(const view of ['compass','facets'])for(const allowAutozoom of [true,false])for(const owner of ['automatic','manual','bound-editor','central-editor','restored']){
  const ctx=graphFixture();ctx.settings.allowAutozoom=allowAutozoom;ctx.scene.nodes[0].occurrenceId='focus';ctx.scene.frameOccurrence=view==='facets'?'focus':undefined;
  ctx.scene.nodes[0].x=view==='facets'?370:30;ctx.scene.nodes[0].y=view==='facets'?-560:-20;ctx.occurrenceKey=node=>node.occurrenceId;
  ctx.viewport.current.clientHeight=3245;ctx.camera.current.scale=1.4;ctx.render();ctx.layout();
  const focus=ctx.scene.nodes[0];assert.equal(ctx.camera.current.y+focus.y*ctx.camera.current.scale,3245/2);
  if(owner==='manual')ctx.applyCamera({...ctx.camera.current,y:1200});
  if(owner==='restored')ctx.applyCamera({x:-200,y:1700,scale:1.2});
  if(owner==='bound-editor')ctx.boundEditorBinding={id:'live-editor'};
  if(owner==='central-editor'){ctx.centralEditorAvailable=true;ctx.centralEditorAvailabilityRef.current=true;}
  const before={...ctx.camera.current};ctx.viewport.current.clientHeight=954;ctx.pathChangedThisRender=false;ctx.render();ctx.layout();
  if(owner==='automatic'){assert(Math.abs(ctx.camera.current.y+focus.y*ctx.camera.current.scale-954/2)<1e-8,view+' default placement follows final CSS viewport');assert(Math.abs(ctx.camera.current.x+focus.x*ctx.camera.current.scale-400)<1e-8);if(!allowAutozoom)assert.equal(ctx.camera.current.scale,before.scale);}
  else assert.deepEqual(ctx.camera.current,before,owner+' keeps its exact coordinates');
 }
});

test('disabled autozoom placement ownership never recenters attention views for ordinary scene reflow',()=>{
 const ctx=graphFixture();ctx.settings.allowAutozoom=false;ctx.pathChangedThisRender=false;ctx.render();ctx.layout();const before={...ctx.camera.current};
 ctx.scene.nodes[0].y+=400;ctx.render();ctx.layout();assert.deepEqual(ctx.camera.current,before,'Only viewport settlement or explicit navigation may follow automatic translation');
 ctx.preserveCameraOnNextLayout.current=true;ctx.viewport.current.clientHeight=400;ctx.render();ctx.layout();assert.deepEqual(ctx.camera.current,before,'Explicit display transition retains camera intent');
});


test('scroll-area continuation anchors keep visible counterparts connected without hidden-note markers or invented endpoints',()=>{
 const area={key:'friends',left:100,top:100,width:200,height:200},outside=Object.freeze({x:500,y:200});
 for(const [hidden,expected] of [[{x:200,y:-500},{x:200,y:100}],[{x:200,y:900},{x:200,y:300}],[{x:0,y:200},{x:100,y:200}],[{x:700,y:200},{x:300,y:200}]]){
  const original=Object.freeze(hidden),result=edgeViewportEndpoints(outside,original,'left','right',undefined,area);
  assert(result);assert.deepEqual(result.source,{point:outside,port:'left',continued:false});assert.deepEqual(result.target.point,expected);assert.equal(result.target.continued,true);assert.deepEqual(original,hidden,'Only paint changes');
 }
 const visible={x:200,y:150};assert.equal(edgeViewportEndpoints({x:200,y:0},{x:200,y:500},'bottom','top',area,area),null,'Two hidden endpoints have no visible counterpart');
 assert.equal(edgeViewportEndpoints(outside,{x:200,y:500},'left','right',undefined,{...area,edgeVisibility:'visible-endpoints'}),null,'Explicit suppression remains an optional policy');
 assert.equal(edgeViewportEndpoints(outside,{x:200,y:500},'left','right',undefined,{...area,scrollable:false}).target.continued,false,'Growing fixed forests retain their actual gates');
 const internal=edgeViewportEndpoints(visible,{x:200,y:500},'bottom','top',area,area);assert(internal);assert.equal(internal.target.port,'top','Continuation tangent faces its visible counterpart');
});

test('hierarchy control clearance is uniform regardless of status, reference or fold availability',()=>{
 const rows=[{canExpand:true,expanded:false,reference:false},{canExpand:false,expanded:false,reference:true},{canExpand:false,expanded:false,reference:false},{canExpand:true,expanded:true,reference:false}];
 for(const branch of rows){assert.deepEqual(branchDisclosureReserve(branch,true),{right:48,bottom:48});assert.equal(branchDisclosureReserve(branch,false),undefined);}
 assert.equal(branchDisclosureReserve(undefined,true),undefined);
});


test('partially visible card keeps routes when its protruding gate is clipped',()=>{
 const area={key:'branch',left:0,top:0,width:200,height:100},source={x:50,y:90,width:80,height:20},target={x:50,y:400,width:80,height:20};
 const result=edgeViewportEndpoints({x:50,y:105},{x:50,y:390},'bottom','top',area,area,{source,target});
 assert(result&&result.source.continued&&result.target.continued,'The visible card retains a canonical route even when both gates need boundary paint');
 assert.equal(edgeViewportEndpoints({x:50,y:205},{x:50,y:390},'bottom','top',area,area,{source:{...source,y:200},target}),null,'Fully hidden cards have no visible context');
});
