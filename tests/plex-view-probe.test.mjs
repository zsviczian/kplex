/** Full production PlexGraph mounts a non-Classic definition in real Chromium. Host effects are finite explicit doubles. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {plexViewBrowserModules} from './support/plexViewBrowser.mjs';
import test from 'node:test';
import {chromiumHarness} from './support/browserTypeScript.mjs';

const output=await plexViewBrowserModules();

test('non-Classic definition uses the production scene, selection, Find and action lifecycle',async()=>{
  const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
  try {
    const result=await host.evaluate(`(async()=>{
      const M=sourceModules,errors=[];window.addEventListener('error',event=>errors.push(event.message));
      const style=document.createElement('style');style.textContent=${JSON.stringify(readFileSync('styles.css','utf8'))};document.head.append(style);
      const mount=document.createElement('div');mount.className='kplex-app';mount.style.cssText='width:1000px;height:800px;position:relative';document.body.append(mount);
      const pages=new Map(['Focus.md','Root.md','Repeated.md','Other.md'].map(path=>[path,{path,name:path,file:{path,name:path,extension:'md',basename:path,stat:{mtime:1,ctime:1,size:1}},url:null,isFolder:false,isTag:false,aliases:[],tags:[],styleTags:[],primaryStyleTag:null,noteType:null,maxLabelLength:30,neighbours:new Map()}]));
      const work={semantic:0,releases:0,presentation:0,reads:0,parses:0,publishes:0,settingsWrites:0,classicReads:0},events=new Set(),subscribe=fn=>{events.add(fn);return()=>events.delete(fn)};
      const nativeEvents={on:(name,callback)=>{const ref={name,callback};events.add(ref);return ref},offref:ref=>events.delete(ref)};
      const settings=M.migrateAndMergeSettings({animationSpeed:0,graphDepth:1,allowAutozoom:false,embedCentralNode:false});
      const unavailable=()=>({top:{visibleCount:0,hasAny:false,complete:false,countUnavailable:true},bottom:{visibleCount:0,hasAny:false,complete:false,countUnavailable:true},left:{visibleCount:0,hasAny:false,complete:false,countUnavailable:true},right:{visibleCount:0,hasAny:false,complete:false,countUnavailable:true}});
      const index={isVisiblePage:()=>true,get:path=>pages.get(path),titleFor:page=>page.name,neighbours:(page,role)=>page.path==='Root.md'&&role==='child'?[{page:pages.get('Repeated.md'),role:'child',relationType:1,typeDefinition:'Child',linkDirection:1}]:[],
        sortNeighbours:rows=>[...rows].sort((a,b)=>a.page.path.localeCompare(b.page.path)),captureSemanticGateRead:()=>({isCurrent:()=>true,read:()=>new Map()}),
        acquireSemanticDemand:()=>{work.semantic++;return()=>work.releases++},acquirePresentationDemand:()=>{work.presentation++;return()=>work.presentation--},
        getNodeVisualRevision:()=>0,resolveNodeVisuals:async()=>new Map(),invalidateNodeVisual:()=>{},gateStats:page=>({top:{visibleCount:page.path==='Repeated.md'?1:0,hasAny:page.path==='Repeated.md',complete:true},
          bottom:{visibleCount:page.path==='Root.md'?1:0,hasAny:page.path==='Root.md',complete:true},left:{visibleCount:0,hasAny:false,complete:true},right:{visibleCount:0,hasAny:false,complete:true}}),neighbourCount:()=>0,
        subscribe,subscribePresentation:subscribe,
        getNeighborhood:()=>{work.classicReads++;return {center:pages.get('Focus.md'),parents:[],children:[],leftFriends:[],rightFriends:[],siblings:[]}},visibleRelationshipsWithin:()=>[],
        explainRelationship:()=>null};
      const groupedDefinition={...M.probeViewDefinition,id:'test.grouped',project(input){const projection=M.probeViewDefinition.project(input);if(!projection)return null;
        return {...projection,occurrences:[...projection.occurrences,{id:'extra-above',nodeId:'Other.md',areaId:'grove',groupingPartition:'upper',representation:'thought',role:'child'}]}}};
      const failedDefinition={...M.probeViewDefinition,id:'test.failed',layout(){throw Error('Deliberate scene failure')}};
      const unavailableDefinition={...M.probeViewDefinition,id:'test.unavailable',project(){return null}};
      const rootedDefinition={...M.probeViewDefinition,id:'test.rooted',navigation:'rooted'};
      const readonlyAreaDefinition={...M.probeViewDefinition,id:'test.readonly-areas',layout(...args){const layout=M.probeViewDefinition.layout(...args);return {...layout,areas:layout.areas.map(({heightPreference,...area})=>area)}}};
      const registry=new M.PlexViewRegistry([...M.builtInPlexViews.available,M.probeViewDefinition,groupedDefinition,failedDefinition,unavailableDefinition,rootedDefinition,readonlyAreaDefinition]);const session=new M.PlexViewSession(registry,()=>{});session.select('test.situated');
      const actionPorts={current:null},activations=[],plugin={settings,index,viewSettingsRegistry:M.builtInCanvasViewSettings,translator:M.createTranslator('en'),app:{workspace:{...nativeEvents},metadataCache:{...nativeEvents,getFileCache:()=>null},vault:{getFileByPath:path=>pages.get(path)?.file??null,cachedRead:()=>{work.reads++;throw Error('Unexpected note read')}}},
        saveSettings:()=>{work.settingsWrites++;throw Error('Unexpected global settings write')},getTypographyDevice:()=> 'desktop',isKplexLeafVisible:()=>true,subscribeKplexVisibility:subscribe,subscribeNodeFlair:subscribe,registerLinkedNodeFeedback:()=>()=>{},getHierarchyColorRevision:()=>0,
        isActionSurfaceCurrent:()=>true,getSavedSettingsPolicy:()=>null};
      plugin.actionManager=new M.ActionManager({readCommandContext:()=>({sharedCenter:null,focusRegion:'graph'}),validateNode:()=>true});
      const props={plugin,index,settings,paintSettings:settings,paintLenses:{lenses:[]},surface:'leaf',hostLeaf:{},predicate:null,lenses:{lenses:[]},filterLayoutMode:'keep',predicateRevision:0,
        showCrossLinks:true,activePath:'Focus.md',renderRevision:0,semanticRevision:0,findFocusRequest:0,areaSettingsMode:false,onAreaSettingsModeChange:()=>{},
        onApplyFindFilter:()=>{},appliedFindFilterQuery:null,onClearFindFilter:()=>{},onActivate:page=>activations.push(page.path),onWanderActivate:()=>{},onOpen:()=>{},onOpenInSidecar:async()=>{},
        onCentralNodeEditorChange:()=>{},onCentralNodeModeChange:()=>{},actionPorts,actionSurfaceId:'probe',displayState:{zen:false,fullscreen:false},fullscreenAvailable:false,sidecarOpen:false,viewSession:session};
      const root=M.createRoot(mount);function Harness(){const revision=M.useSyncExternalStore(session.subscribe,session.getSnapshot);return M.createElement(M.PlexGraph,{...props,viewDefinition:session.definition,viewRevision:revision})}
      M.flushSync(()=>root.render(M.createElement(Harness)));await new Promise(resolve=>setTimeout(resolve,100));
      const nodes=[...mount.querySelectorAll('[data-kplex-keyboard-id]')].map(node=>({id:node.dataset.kplexKeyboardId,path:node.dataset.kplexPath}));
      const physicalPorts=[...mount.querySelectorAll('[data-kplex-keyboard-id="layout-root"] [data-kplex-gate]')].map(gate=>gate.dataset.kplexGate);
      const physicalCount=mount.querySelector('[data-kplex-keyboard-id="layout-root"] .gate-wrap-left .kplex-gate-count')?.textContent;
      const releaseAction=plugin.actionManager.registerSurface({id:'probe',generation:1,
        get implementations(){return actionPorts.current.implementations},
        readSnapshot:()=>({mounted:true,visible:true,windowId:'test',center:M.actionNodeRef(pages.get('Focus.md')),selected:actionPorts.current.readSelected(),
          focusRegion:'graph',interactionRevision:0,viewRevision:session.getSnapshot()})});
      const act=async(id,target)=>{let pending;M.flushSync(()=>pending=plugin.actionManager.dispatch({id,source:'local-menu',surfaceId:'probe',...(target?{target}:{})}));const result=await pending;await new Promise(resolve=>setTimeout(resolve,0));return result};
      await act('selection.center');const entry=actionPorts.current.readSelected();
      await act('selection.section.up');const above=actionPorts.current.readSelected();
      await act('selection.section.down');await act('selection.move.down');const below=actionPorts.current.readSelected();
      await act('node.activate');
      const decorative={kind:'edge',origin:M.actionNodeRef(pages.get('Root.md')),target:M.actionNodeRef(pages.get('Focus.md')),evidenceId:'guide'};
      const decorativeCheck=plugin.actionManager.check({id:'relationship.unlink',source:'local-menu',surfaceId:'probe',target:decorative});
      const decorativeOutcome=await act('relationship.unlink',decorative);
      const find=mount.querySelector('.kplex-find');M.flushSync(()=>find.querySelector('button').click());
      const findInput=find.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(findInput,'Repeated');
      M.flushSync(()=>findInput.dispatchEvent(new Event('input',{bubbles:true})));await new Promise(resolve=>setTimeout(resolve,0));
      const findText=find.textContent;
      const area=mount.querySelector('.kplex-zone-grove');M.flushSync(()=>area.querySelector('.kplex-zone-filter-button').click());
      const areaInput=area.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(areaInput,'missing');
      M.flushSync(()=>areaInput.dispatchEvent(new Event('input',{bubbles:true})));
      const filtered=[...mount.querySelectorAll('[data-kplex-keyboard-id]')].map(node=>node.dataset.kplexKeyboardId);
      M.flushSync(()=>area.querySelector('.kplex-zone-filter-button').click());
      const restored=[...mount.querySelectorAll('[data-kplex-keyboard-id]')].map(node=>node.dataset.kplexKeyboardId);
      const rootBefore=mount.querySelector('.kplex-plex');
      props.areaSettingsMode=true;M.flushSync(()=>root.render(M.createElement(Harness)));
      const heightControl=mount.querySelector('.kplex-area-grove [role="separator"]');
      M.flushSync(()=>heightControl.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true})));
      const resizedHeight=session.getAreaHeights().groveHeight;
      props.areaSettingsMode=false;M.flushSync(()=>root.render(M.createElement(Harness)));
      await act('selection.center');await act('selection.section.up');await act('view.pan.right');
      await new Promise(resolve=>setTimeout(resolve,40));
      const retainedSelection=actionPorts.current.readSelected()?.occurrenceId;
      const retainedCamera=mount.querySelector('.kplex-camera').style.transform;
      const held=plugin.actionManager.prepare({id:'node.activate',source:'local-menu',surfaceId:'probe',
        target:{kind:'explicit',node:M.actionNodeRef(pages.get('Repeated.md')),occurrenceId:'repeat-below'}});
      settings.groupRelations=true;
      session.select('test.grouped');
      const staleOutcome=held.state==='accepted'?await held.run():null;
      M.flushSync(()=>root.render(M.createElement(Harness)));await new Promise(resolve=>setTimeout(resolve,0));
      const group=mount.querySelector('.kplex-thought.is-relation-group');const groupCount=group?.querySelector('.kplex-group-count')?.textContent;
      M.flushSync(()=>group.click());await new Promise(resolve=>setTimeout(resolve,0));
      const unfolded=[...mount.querySelectorAll('[data-kplex-keyboard-id]')].map(node=>node.dataset.kplexKeyboardId);
      M.flushSync(()=>session.select('test.situated'));await new Promise(resolve=>setTimeout(resolve,0));
      await new Promise(resolve=>setTimeout(resolve,40));
      const selectionRestored=actionPorts.current.readSelected()?.occurrenceId,cameraRestored=mount.querySelector('.kplex-camera').style.transform;
      const heightRestored=session.getAreaHeights().groveHeight;
      const normalClassicReads=work.classicReads;
      const rootNodeBefore=mount.querySelector('[data-kplex-keyboard-id="layout-root"]');
      const configuredBefore=rootNodeBefore.style.left,sessionBefore=JSON.stringify(session.getState());
      settings.canvasViewSettings=M.editViewConfiguration(M.probeViewDefinition,settings.canvasViewSettings,'ridgeOffset',40);
      props.renderRevision++;M.flushSync(()=>root.render(M.createElement(Harness)));await new Promise(resolve=>setTimeout(resolve,0));
      const configuredAfter=mount.querySelector('[data-kplex-keyboard-id="layout-root"]').style.left;
      const configurationRetainedSession=JSON.stringify(session.getState())===sessionBefore;
      const editableBefore=actionPorts.current.canEditAreas(),retiredAreaModes=[];props.areaSettingsMode=true;props.onAreaSettingsModeChange=value=>{retiredAreaModes.push(value);props.areaSettingsMode=value};
      M.flushSync(()=>session.select('test.readonly-areas'));await new Promise(resolve=>setTimeout(resolve,20));
      const areaCapability={before:editableBefore,after:actionPorts.current.canEditAreas(),retired:retiredAreaModes,scrollPanels:mount.querySelectorAll('.kplex-zone-panel').length,failed:!!mount.querySelector('.kplex-view-error')};
      props.onAreaSettingsModeChange=()=>{};M.flushSync(()=>session.select('test.situated'));await new Promise(resolve=>setTimeout(resolve,0));
      M.flushSync(()=>session.select('test.failed'));await new Promise(resolve=>setTimeout(resolve,0));
      const failureVisible=!!mount.querySelector('.kplex-view-error'),sameShell=mount.querySelector('.kplex-plex')===rootBefore;
      const failureAction=await act('node.activate');
      M.flushSync(()=>mount.querySelector('.kplex-view-error button').click());await new Promise(resolve=>setTimeout(resolve,0));
      const recovered=session.definition.id;
      M.flushSync(()=>session.select('test.unavailable'));await new Promise(resolve=>setTimeout(resolve,0));
      const unavailableFallback=!!mount.querySelector('.kplex-view-error')&&!!mount.querySelector('[data-kplex-keyboard-id="recovery-attention"]');
      M.flushSync(()=>session.recover());await new Promise(resolve=>setTimeout(resolve,0));
      const remainingFailure=!!mount.querySelector('.kplex-view-error');
      const snapshot={nodes,physicalPorts,physicalCount,entry,above,below,activations,decorativeCheck,decorativeOutcome,findText,filtered,restored,
        resizedHeight,heightRestored,retainedSelection,selectionRestored,retainedCamera,cameraRestored,staleOutcome,groupCount,unfolded,normalClassicReads,configuredBefore,configuredAfter,configurationRetainedSession,areaCapability,failureVisible,sameShell,failureAction,recovered,unavailableFallback,remainingFailure,
        errors:[...errors],text:mount.textContent,ports:!!actionPorts.current,work:{...work}};
      releaseAction();
      root.unmount();session.dispose();plugin.actionManager.dispose();const legacyEvents=events.size,legacyAfter={...work};
      for(const key of Object.keys(work))work[key]=0;
      const rootedSession=new M.PlexViewSession(registry,()=>{});rootedSession.select('test.rooted');rootedSession.setRoot('Root.md');
      plugin.actionManager=new M.ActionManager({readCommandContext:()=>({sharedCenter:null,focusRegion:'graph'}),validateNode:()=>true});
      props.viewSession=rootedSession;props.activePath='Focus.md';const rootedRoot=M.createRoot(mount);
      function RootedHarness(){const revision=M.useSyncExternalStore(rootedSession.subscribe,rootedSession.getSnapshot);return M.createElement(M.PlexGraph,{...props,viewDefinition:rootedSession.definition,viewRevision:revision})}
      M.flushSync(()=>rootedRoot.render(M.createElement(RootedHarness)));await new Promise(resolve=>setTimeout(resolve,50));
      const releaseRootedAction=plugin.actionManager.registerSurface({id:'probe',generation:2,get implementations(){return actionPorts.current.implementations},
       readSnapshot:()=>({mounted:true,visible:true,windowId:'test',center:M.actionNodeRef(pages.get(props.activePath)),selected:actionPorts.current.readSelected(),focusRegion:'graph',interactionRevision:0,viewRevision:rootedSession.getSnapshot()})});
      const rootNode=mount.querySelector('[data-kplex-keyboard-id="layout-root"]');
      await act('selection.center');await act('selection.section.up');await act('view.pan.right');await new Promise(resolve=>setTimeout(resolve,40));
      const rootedBefore={camera:mount.querySelector('.kplex-camera').style.transform,selection:actionPorts.current.readSelected()?.occurrenceId,semantic:work.semantic};
      props.activePath='Other.md';M.flushSync(()=>rootedRoot.render(M.createElement(RootedHarness)));await new Promise(resolve=>setTimeout(resolve,50));
      const rootedProof={before:rootedBefore,after:{camera:mount.querySelector('.kplex-camera').style.transform,selection:actionPorts.current.readSelected()?.occurrenceId,semantic:work.semantic},
       root:rootedSession.layoutRoot(props.activePath),rootPresent:!!rootNode,sameRootElement:mount.querySelector('[data-kplex-keyboard-id="layout-root"]')===rootNode,failed:!!mount.querySelector('.kplex-view-error')};
      releaseRootedAction();rootedRoot.unmount();rootedSession.dispose();plugin.actionManager.dispose();rootedProof.releases=work.releases;rootedProof.events=events.size;
      for(const key of Object.keys(work))work[key]=0;
      index.neighbours=(page,role)=>role==='child'&&(page.path==='Root.md'||page.path==='Repeated.md')?[{page:pages.get(page.path==='Root.md'?'Repeated.md':'Other.md'),role:'child',relationType:1,typeDefinition:'Child',linkDirection:1}]:[];
      index.viewScopeCoverage=()=>({coverage:'local',prepared:true,complete:true,pending:false});
      plugin.actionManager=new M.ActionManager({readCommandContext:()=>({sharedCenter:null,focusRegion:'graph'}),validateNode:()=>true});
      const hierarchySession=new M.PlexViewSession(registry,()=>{});hierarchySession.select('mindmap');hierarchySession.setRoot('Root.md');
      props.viewSession=hierarchySession;props.activePath='Focus.md';const hierarchyRoot=M.createRoot(mount);
      function HierarchyHarness(){const revision=M.useSyncExternalStore(hierarchySession.subscribe,hierarchySession.getSnapshot);return M.createElement(M.PlexGraph,{...props,viewDefinition:hierarchySession.definition,viewRevision:revision})}
      const renderHierarchy=()=>M.flushSync(()=>hierarchyRoot.render(M.createElement(HierarchyHarness)));
      renderHierarchy();await new Promise(resolve=>setTimeout(resolve,30));const initialHierarchy={semantic:work.semantic,nodes:mount.querySelectorAll('[data-kplex-keyboard-id]').length};
      const releaseHierarchyAction=plugin.actionManager.registerSurface({id:'probe',generation:3,get implementations(){return actionPorts.current.implementations},
        readSnapshot:()=>({mounted:true,visible:true,windowId:'test',center:M.actionNodeRef(pages.get(props.activePath)),selected:actionPorts.current.readSelected(),focusRegion:'graph',interactionRevision:0,viewRevision:hierarchySession.getSnapshot()})});
      const branchId=JSON.stringify(['Root.md','Repeated.md']),branchTarget={kind:'explicit',node:M.actionNodeRef(pages.get('Repeated.md')),occurrenceId:branchId};
      const mismatched=await act('branch.toggle',{...branchTarget,node:M.actionNodeRef(pages.get('Other.md'))});
      const toggleOutcome=await act('branch.toggle',branchTarget);await new Promise(resolve=>setTimeout(resolve,30));
      const expandedHierarchy={semantic:work.semantic,nodes:mount.querySelectorAll('[data-kplex-keyboard-id]').length,failed:!!mount.querySelector('.kplex-view-error')};
      const currentGateRead=index.captureSemanticGateRead,frontierBefore={semantic:work.semantic,releases:work.releases};
      index.captureSemanticGateRead=()=>({isCurrent:()=>false,read:()=>null});props.renderRevision++;renderHierarchy();await new Promise(resolve=>setTimeout(resolve,30));
      const unavailableFrontier={semantic:work.semantic,releases:work.releases,failed:!!mount.querySelector('.kplex-view-error')};
      index.captureSemanticGateRead=currentGateRead;props.renderRevision++;renderHierarchy();await new Promise(resolve=>setTimeout(resolve,30));
      const recoveredFrontier={semantic:work.semantic,releases:work.releases,nodes:mount.querySelectorAll('[data-kplex-keyboard-id]').length,failed:!!mount.querySelector('.kplex-view-error')};
      const frontierProof={before:frontierBefore,unavailable:unavailableFrontier,recovered:recoveredFrontier};
      const hierarchyFind=mount.querySelector('.kplex-find');M.flushSync(()=>hierarchyFind.querySelector('button').click());
      const hierarchyFindInput=hierarchyFind.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(hierarchyFindInput,'Repeated');
      M.flushSync(()=>hierarchyFindInput.dispatchEvent(new Event('input',{bubbles:true})));await new Promise(resolve=>setTimeout(resolve,20));
      const hierarchyFindProof={selected:actionPorts.current.readSelected()?.occurrenceId,attention:props.activePath,root:hierarchySession.layoutRoot(props.activePath),editors:hierarchySession.editors.bindings.length};
      await act('view.layout-controls');
      const layoutBefore={semantic:work.semantic,root:hierarchySession.layoutRoot(props.activePath),camera:mount.querySelector('.kplex-camera').style.transform},layoutWrites=[];
      plugin.updateCanvasViewConfiguration=async(id,address,edit)=>{if(id!=='mindmap')throw Error('Foreign view setting');layoutWrites.push([id,address.field,edit.value]);settings.canvasViewSettings=M.editViewConfigurationAt(M.mindMapViewDefinition,settings.canvasViewSettings,address,edit);props.renderRevision++;renderHierarchy()};
      const rails=[...mount.querySelectorAll('.kplex-layout-panel input[type=range]')];
      for(const [label,value]of [['Horizontal density',2],['Vertical density',1.5]]){
        const rail=rails.find(element=>element.getAttribute('aria-label')===label);if(!rail)throw Error('Registered density rail missing');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(rail,value);M.flushSync(()=>rail.dispatchEvent(new Event('input',{bubbles:true})));await new Promise(resolve=>setTimeout(resolve,20));
      }
      const densityProof={writes:layoutWrites,values:settings.canvasViewSettings.mindmap.values,root:hierarchySession.layoutRoot(props.activePath),camera:mount.querySelector('.kplex-camera').style.transform,semantic:work.semantic,before:layoutBefore};
      settings.canvasViewSettings=M.editViewConfiguration(M.mindMapViewDefinition,settings.canvasViewSettings,'horizontalSpacing',160);props.renderRevision++;renderHierarchy();await new Promise(resolve=>setTimeout(resolve,20));
      props.activePath='Other.md';renderHierarchy();await new Promise(resolve=>setTimeout(resolve,20));const attentionHierarchy={semantic:work.semantic,root:hierarchySession.layoutRoot(props.activePath)};
      M.flushSync(()=>mount.querySelector('[aria-label="Collapse one generation"]').click());await new Promise(resolve=>setTimeout(resolve,20));
      const collapsedHierarchy={semantic:work.semantic,releases:work.releases,nodes:mount.querySelectorAll('[data-kplex-keyboard-id]').length};
      await act('selection.center');await act('selection.move.right');const keyboardHierarchy={editors:hierarchySession.editors.bindings.length,root:hierarchySession.layoutRoot(props.activePath)};
      const heldBranch=plugin.actionManager.prepare({id:'branch.toggle',source:'local-menu',surfaceId:'probe',target:branchTarget});
      const rerootOutcome=await act('view.root.selected',{kind:'explicit',node:M.actionNodeRef(pages.get('Other.md'))});await new Promise(resolve=>setTimeout(resolve,20));
      const staleBranch=heldBranch.state==='accepted'?await heldBranch.run():null,rerooted=hierarchySession.layoutRoot(props.activePath);
      index.neighbours=(page,role)=>page.path==='Root.md'&&role==='child'?['Repeated.md','Other.md'].map(id=>({page:pages.get(id),role,relationType:1,typeDefinition:'Child',linkDirection:1})):[];
      let crossReads=0;index.visibleRelationshipsWithin=(page,within)=>{crossReads++;return page.path==='Repeated.md'&&within.has('Other.md')?[{page:pages.get('Other.md'),role:'child',relationType:1,typeDefinition:'Cross-child',linkDirection:1}]:[]};
      settings.groupRelations=false;hierarchySession.setRoot('Root.md');props.renderRevision++;renderHierarchy();await new Promise(resolve=>setTimeout(resolve,40));
      const crossElement=mount.querySelector('.is-cross-link [data-kplex-edge-id]');if(!crossElement)throw Error('Enabled canonical occurrence cross-link absent '+JSON.stringify({crossReads,root:hierarchySession.layoutRoot(props.activePath),state:hierarchySession.state,nodes:[...mount.querySelectorAll('[data-kplex-keyboard-id]')].map(n=>[n.dataset.kplexKeyboardId,n.style.cssText]),edges:[...mount.querySelectorAll('[data-kplex-edge-id]')].map(n=>n.dataset.kplexEdgeId),text:mount.textContent}));
      const crossId=crossElement.dataset.kplexEdgeId,crossTarget={kind:'edge',origin:M.actionNodeRef(pages.get('Repeated.md')),target:M.actionNodeRef(pages.get('Other.md')),evidenceId:crossId};
      const beforeToggle={semantic:work.semantic,reads:crossReads},crossAvailability=plugin.actionManager.check({id:'relationship.connect',source:'local-menu',surfaceId:'probe',target:crossTarget});
      props.showCrossLinks=false;renderHierarchy();await new Promise(resolve=>setTimeout(resolve,20));
      const hiddenCross={count:mount.querySelectorAll('.is-cross-link').length,availability:plugin.actionManager.check({id:'relationship.connect',source:'local-menu',surfaceId:'probe',target:crossTarget}).state,semantic:work.semantic,reads:crossReads};
      props.showCrossLinks=true;renderHierarchy();await new Promise(resolve=>setTimeout(resolve,20));
      const crossProof={id:crossId,availability:crossAvailability.state,before:beforeToggle,hidden:hiddenCross,restored:mount.querySelectorAll('.is-cross-link').length,semantic:work.semantic};
      const gatePairs=[];index.captureSemanticGateRead=()=>({isCurrent:()=>true,read:(page,targets)=>{gatePairs.push([page.path,[...targets]]);return new Map()}});
      props.predicate=M.compileGraphPredicate({kind:'all',expressions:[]});props.predicateRevision++;renderHierarchy();await new Promise(resolve=>setTimeout(resolve,20));
      crossProof.filtered={count:mount.querySelectorAll('.is-cross-link').length,pairs:gatePairs,semantic:work.semantic};
      releaseHierarchyAction();hierarchyRoot.unmount();hierarchySession.dispose();plugin.actionManager.dispose();const hierarchyProof={initial:initialHierarchy,expanded:expandedHierarchy,attention:attentionHierarchy,collapsed:collapsedHierarchy,after:{...work},events:events.size,errors:[...errors],mismatched,toggleOutcome,frontiers:frontierProof,density:densityProof,find:hierarchyFindProof,keyboard:keyboardHierarchy,rerootOutcome,staleBranch,rerooted,cross:crossProof};
      style.remove();mount.remove();return {...snapshot,events:legacyEvents,after:legacyAfter,rooted:rootedProof,hierarchy:hierarchyProof};
    })()`);
    assert.deepEqual(result.physicalPorts,['left']);assert.equal(result.physicalCount,'1');
    assert.deepEqual(result.errors,[]);assert.equal(result.ports,true);assert.equal(result.nodes.length,4);
    assert.deepEqual(result.nodes.filter(node=>node.path==='Repeated.md').map(node=>node.id).sort(),['repeat-above','repeat-below']);
    assert.equal(result.retainedSelection,'repeat-above');assert.equal(result.selectionRestored,result.retainedSelection);assert.equal(result.cameraRestored,result.retainedCamera);
    assert.equal(result.entry.occurrenceId,'look-here');assert.equal(result.above.occurrenceId,'repeat-above');assert.equal(result.below.occurrenceId,'repeat-below');
    assert.deepEqual(result.activations,['Repeated.md']);assert.equal(result.decorativeCheck.state,'disabled');assert.equal(result.decorativeOutcome.status,'unavailable');
    assert.match(result.findText,/2/);assert(!result.filtered.includes('repeat-above'));assert(result.filtered.includes('repeat-below'));assert(result.restored.includes('repeat-above'));
    assert.equal(result.resizedHeight,170);assert.equal(result.heightRestored,170);assert.equal(result.staleOutcome.status,'cancelled');
    assert.equal(result.groupCount,'2');assert(result.unfolded.includes('repeat-above')&&result.unfolded.includes('extra-above'));
    assert.equal(result.normalClassicReads,0);assert.equal(result.unavailableFallback,true);assert.equal(result.failureVisible,true);assert.equal(result.sameShell,true);
    assert.notEqual(result.configuredBefore,result.configuredAfter,'type configuration reaches the actual shared renderer');
    assert.equal(result.configurationRetainedSession,true,'configuration does not replace per-canvas state');
    assert.deepEqual(result.areaCapability,{before:true,after:false,retired:[false],scrollPanels:1,failed:false},'Unsupported editable-area mode retires through its owner without removing bounded filtering/scrolling');
    assert.equal(result.failureAction.status,'unavailable');assert.equal(result.recovered,'classic');assert.equal(result.remainingFailure,false);
    assert.equal(result.work.settingsWrites,0);assert.equal(result.work.semantic,1);assert.equal(result.after.releases,1);assert.equal(result.after.presentation,0);assert.equal(result.events,0);
    assert.equal(result.after.reads,0);assert.equal(result.after.parses,0);assert.equal(result.after.publishes,0);
    assert.equal(result.rooted.failed,false);assert.equal(result.rooted.rootPresent,true);assert.equal(result.rooted.root,'Root.md');assert.equal(result.rooted.sameRootElement,true);
    assert.equal(result.rooted.before.selection,'repeat-above');assert.match(result.rooted.before.camera,/translate/);
    assert.equal(result.rooted.after.camera,result.rooted.before.camera);assert.equal(result.rooted.after.selection,result.rooted.before.selection);
    assert.equal(result.rooted.before.semantic,2,'Initial rooted render retains separate root and attention leases');assert.equal(result.rooted.after.semantic,3,'Attention change acquires only the new attention lease');
    assert.equal(result.rooted.releases,3);assert.equal(result.rooted.events,0);
    assert.deepEqual(result.hierarchy.frontiers,{before:{semantic:3,releases:0},unavailable:{semantic:3,releases:0,failed:true},recovered:{semantic:3,releases:0,nodes:3,failed:false}},'Unavailable current projection retains bounded branch leases; readmission neither reacquires nor borrows stale scene authority');
    assert.deepEqual(result.hierarchy.initial,{semantic:2,nodes:2});assert.deepEqual(result.hierarchy.expanded,{semantic:3,nodes:3,failed:false});
    assert.deepEqual(result.hierarchy.attention,{semantic:4,root:'Root.md'},'Geometry settings do not reacquire frontiers, attention adds only its independent lease');
    assert.deepEqual(result.hierarchy.collapsed,{semantic:4,releases:2,nodes:2});assert.equal(result.hierarchy.after.releases,result.hierarchy.after.semantic);assert.equal(result.hierarchy.events,0);assert.deepEqual(result.hierarchy.errors,[]);
    assert.equal(result.hierarchy.mismatched.status,'unavailable');assert.equal(result.hierarchy.toggleOutcome.status,'completed');assert.deepEqual(result.hierarchy.keyboard,{editors:0,root:'Root.md'});
    assert.deepEqual(result.hierarchy.find,{selected:JSON.stringify(['Root.md','Repeated.md']),attention:'Focus.md',root:'Root.md',editors:0},'Hierarchy Find selects and reveals its exact occurrence without activation or editor opening');
    assert.equal(result.hierarchy.rerootOutcome.status,'completed');assert.equal(result.hierarchy.rerooted,'Other.md');assert.notEqual(result.hierarchy.staleBranch?.status,'completed');
    assert.deepEqual(result.hierarchy.density.writes,[['mindmap','horizontalDensity',2],['mindmap','verticalDensity',1.5]]);
    assert.equal(result.hierarchy.density.values.horizontalDensity,2);assert.equal(result.hierarchy.density.values.verticalDensity,1.5);
    assert.equal(result.hierarchy.density.root,result.hierarchy.density.before.root);assert.equal(result.hierarchy.density.camera,result.hierarchy.density.before.camera);
    assert.equal(result.hierarchy.density.semantic,result.hierarchy.density.before.semantic,'Live density rails never acquire another frontier');
    assert.equal(result.hierarchy.cross.availability,'enabled');assert.equal(result.hierarchy.cross.hidden.count,0);assert.equal(result.hierarchy.cross.hidden.availability,'disabled');
    assert.equal(result.hierarchy.cross.hidden.reads,result.hierarchy.cross.before.reads,'Disabling cross-links performs no cached incidence pass');
    assert.equal(result.hierarchy.cross.restored,1);assert.equal(result.hierarchy.cross.semantic,result.hierarchy.cross.before.semantic,'Cross-link composition never acquires semantic sources');
    assert.equal(result.hierarchy.cross.filtered.count,1);assert(result.hierarchy.cross.filtered.pairs.some(([path,targets])=>path==='Repeated.md'&&targets.includes('Other.md')),'Filtered gate population retains the actual extra canonical pair');
    assert.equal(result.hierarchy.cross.filtered.semantic,result.hierarchy.cross.semantic);
    assert.equal(result.hierarchy.after.reads,0);assert.equal(result.hierarchy.after.parses,0);assert.equal(result.hierarchy.after.publishes,0);assert.equal(result.hierarchy.after.settingsWrites,0);
  } finally {await host.cleanup();}
});

/** Full React drag-start → native payload → shared drop routing; no helper receives a preselected source occurrence. */
test('native desktop payload preserves the second same-role occurrence and its relationship authority',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{
  await host.command('Emulation.setDeviceMetricsOverride',{width:1200,height:900,deviceScaleFactor:1,mobile:false});
  const result=await host.evaluate(`(async()=>{
   const M=sourceModules,check=(value,message)=>{if(!value)throw Error(message)},errors=[];window.addEventListener('error',e=>errors.push(e.message));
   const style=document.createElement('style');style.textContent=${JSON.stringify(readFileSync('styles.css','utf8'))};document.head.append(style);
   const pages=new Map(['R.md','C.md','B.md'].map(path=>[path,{path,name:path,file:{path,name:path,extension:'md',basename:path,stat:{mtime:1,ctime:1,size:1}},url:null,isFolder:false,isTag:false,aliases:[],tags:[],styleTags:[],primaryStyleTag:null,noteType:null,maxLabelLength:30,neighbours:new Map()}]));
   let firstOrigin='r',ambiguous=false,canonicalDirection=1,pairReady=true;const rerenders=[];
   const relation=()=>({role:'child',relationType:1,definition:'Child',direction:1,node:{id:'B.md'}});
   const makeDefinition=id=>({id,version:1,labelKey:'Native occurrence proof',icon:'network',navigation:'rooted',capabilities:{sections:false,descendants:false,editor:false,compact:false},defaultState:null,restoreState:()=>null,
    project(input){for(const path of pages.keys())input.read.node(path);const edge=(id,source,target)=>({id,kind:'semantic',source,target,sourceNode:source==='r'?'R.md':'C.md',targetNode:'B.md',sourcePort:'bottom',targetPort:'left',relation:relation()});
     return{attention:input.attention,layoutRoot:'R.md',entry:'r',frame:'r',coverage:'cached',truncated:false,occurrences:[
      {id:'r',nodeId:'R.md',representation:'thought',ports:{top:'parent',bottom:'child'}},
      {id:'c',nodeId:'C.md',representation:'thought',role:'child',ports:{top:'parent',bottom:'child'}},
      ...[['b-first','r'],['b-second','c']].map(([id,parent])=>({id,nodeId:'B.md',representation:'thought',role:'child',relation:relation(),ports:{left:'parent',bottom:'child'}}))],edges:[edge('rb',firstOrigin,'b-first'),edge('cb','c','b-second'),...(ambiguous?[edge('ambiguous','c','b-first')]:[])]};},
    layout(projection,measurements){const points={r:[0,0],c:[-170,130],'b-first':[170,-110],'b-second':[170,130]};return{positions:new Map(measurements.map(m=>[m.id,{x:points[m.id][0],y:points[m.id][1],width:m.width,height:m.height}])),areas:[]};}});
   const events=new Set(),subscribe=fn=>{events.add(fn);return()=>events.delete(fn)},nativeEvents={on:(name,fn)=>{const ref={name,fn};events.add(ref);return ref},offref:ref=>events.delete(ref)};
   const settings=M.migrateAndMergeSettings({animationSpeed:0,graphDepth:1,allowAutozoom:false,embedCentralNode:false});
   const index={isVisiblePage:()=>true,get:path=>pages.get(path),titleFor:p=>p.name,neighbours:(page,role)=>role==='child'&&['R.md','C.md'].includes(page.path)?[{page:pages.get('B.md'),role:'child',relationType:1,typeDefinition:'Child',linkDirection:canonicalDirection}]:[],isSemanticWriteReady:()=>pairReady,sortNeighbours:rows=>rows,captureSemanticGateRead:()=>({isCurrent:()=>true,read:()=>new Map()}),acquireSemanticDemand:()=>()=>{},acquirePresentationDemand:()=>()=>{},getNodeVisualRevision:()=>0,resolveNodeVisuals:async()=>new Map(),invalidateNodeVisual:()=>{},gateStats:()=>Object.fromEntries(['top','bottom','left','right'].map(side=>[side,{visibleCount:0,hasAny:false,complete:true}])),neighbourCount:()=>0,subscribe,subscribePresentation:subscribe,getNeighborhood:()=>({center:pages.get('R.md'),parents:[],children:[],leftFriends:[],rightFriends:[],siblings:[]}),visibleRelationshipsWithin:()=>[],explainRelationship:()=>null,gateNeighbourPaths:()=>new Set()};
   const manager={draggable:null,dragLink(event,linktext,sourcePath,title,source){event.dataTransfer.setData('text/plain','[['+linktext+']]');return{type:'link',linktext,sourcePath,title,source}},onDragStart(event,draggable){this.draggable=draggable},onDragEnd(){this.draggable=null}};
   const calls=[],activations=[],definitions=[makeDefinition('test.native-drag'),makeDefinition('test.retired-drag')],sessions=[],mounts=[],roots=[],propsList=[],ports=[];
   const plugin={settings,index,viewSettingsRegistry:M.builtInCanvasViewSettings,translator:M.createTranslator('en'),app:{dragManager:manager,workspace:{...nativeEvents},metadataCache:{...nativeEvents,getFileCache:()=>null},vault:{getFileByPath:path=>pages.get(path)?.file??null,cachedRead:()=>{throw Error('No note reads')}}},saveSettings:()=>{throw Error('No settings writes')},getTypographyDevice:()=> 'desktop',isKplexLeafVisible:()=>true,subscribeKplexVisibility:subscribe,subscribeNodeFlair:subscribe,registerLinkedNodeFeedback:()=>()=>{},getHierarchyColorRevision:()=>0,isActionSurfaceCurrent:()=>true,getSavedSettingsPolicy:()=>null,openStructuralNodeDrop:()=>false,openRelationModal:options=>{calls.push(options);return{}},inverseGateRole:role=>({parent:'child',child:'parent',left:'right',right:'left'}[role])};
   plugin.actionManager=new M.ActionManager({readCommandContext:()=>({sharedCenter:null,focusRegion:'graph'}),validateNode:()=>true});
   const releases=[];
   for(let i=0;i<2;i++){
    const mount=document.createElement('div');mount.className='kplex-app';mount.style.cssText='position:absolute;left:'+(i*520)+'px;top:0;width:500px;height:650px';document.body.append(mount);mounts.push(mount);
    const session=new M.PlexViewSession(new M.PlexViewRegistry([...M.builtInPlexViews.available,...definitions]),()=>{});session.select(definitions[0].id);session.setRoot('R.md');sessions.push(session);
    const actionPorts={current:null};ports.push(actionPorts);const surfaceId='drag-proof-'+i;
    const props={plugin,index,settings,paintSettings:settings,paintLenses:{lenses:[]},surface:'leaf',hostLeaf:{id:surfaceId},predicate:null,lenses:{lenses:[]},filterLayoutMode:'keep',predicateRevision:0,showCrossLinks:true,activePath:'R.md',renderRevision:0,semanticRevision:0,findFocusRequest:0,areaSettingsMode:false,onAreaSettingsModeChange:()=>{},onApplyFindFilter:()=>{},appliedFindFilterQuery:null,onClearFindFilter:()=>{},onActivate:page=>activations.push({canvas:i,page:page.path}),onWanderActivate:()=>{},onOpen:()=>{},onOpenInSidecar:async()=>{},onCentralNodeEditorChange:()=>{},onCentralNodeModeChange:()=>{},actionPorts,actionSurfaceId:surfaceId,displayState:{zen:false,fullscreen:false},fullscreenAvailable:false,sidecarOpen:false,viewSession:session};propsList.push(props);
    const root=M.createRoot(mount);roots.push(root);function Harness(){const revision=M.useSyncExternalStore(session.subscribe,session.getSnapshot);return M.createElement(M.PlexGraph,{...props,viewDefinition:session.definition,viewRevision:revision})}M.flushSync(()=>root.render(M.createElement(Harness)));rerenders.push(()=>{props.semanticRevision++;M.flushSync(()=>root.render(M.createElement(Harness)))});
    releases.push(plugin.actionManager.registerSurface({id:surfaceId,generation:1,get implementations(){return actionPorts.current.implementations},readSnapshot:()=>({mounted:true,visible:true,windowId:'test',center:M.actionNodeRef(pages.get('R.md')),selected:actionPorts.current.readSelected(),focusRegion:'graph',interactionRevision:0,viewRevision:session.getSnapshot()})}));
   }
   await new Promise(resolve=>setTimeout(resolve,80));
   const node=(canvas,id)=>mounts[canvas].querySelector('[data-kplex-keyboard-id="'+id+'"]');
   const start=(canvas,id)=>{const element=node(canvas,id),transfer=new DataTransfer(),event=new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:transfer});M.flushSync(()=>element.dispatchEvent(event));check(manager.draggable?.source,'Native start did not capture a payload');return{source:manager.draggable.source,transfer}};
   const finish=canvas=>M.flushSync(()=>node(canvas,'b-second')?.dispatchEvent(new DragEvent('dragend',{bubbles:true})));
   const drop=(canvas,transfer,gate='top')=>{const element=gate?node(canvas,'r').querySelector('[data-kplex-gate="'+gate+'"]'):node(canvas,'r'),box=element.getBoundingClientRect(),event=new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer,clientX:box.left+box.width/2,clientY:box.top+box.height/2});M.flushSync(()=>element.dispatchEvent(event));return event};
   const second=start(0,'b-second');check(second.source.occurrence?.id==='b-second'&&second.source.occurrence?.relationship?.origin.identity==='C.md','Actual native payload omitted the exact second occurrence/canonical C origin');drop(0,second.transfer);check(calls.length===1,'Second occurrence did not reach canonical composer');check(calls[0].mode==='create'&&calls[0].origin===pages.get('R.md')&&calls[0].fixedTarget===pages.get('B.md')&&calls[0].semanticRole==='parent'&&calls[0].existingDirection===undefined&&calls[0].invocation?.additiveOnly===true,'Second C→B occurrence borrowed first R→B relink authority: '+JSON.stringify({mode:calls[0].mode,origin:calls[0].origin?.path,direction:calls[0].existingDirection}));
   finish(0);
   const first=start(0,'b-first');drop(0,first.transfer);check(calls.at(-1).mode==='relink'&&calls.at(-1).origin===pages.get('R.md'),'Exact original R→B occurrence lost legitimate move authority');finish(0);
   const move=calls.at(-1);M.flushSync(()=>move.onCommitStart('parent'));check(mounts[0].querySelector('.kplex-relationship-updating'),'Relink did not show pending feedback');
   M.flushSync(()=>move.onCommitted({state:'saved-pending',page:pages.get('B.md')}));check(mounts[0].querySelector('.kplex-relationship-updating'),'Unpublished saved-pending result incorrectly cleared feedback');
   M.flushSync(()=>move.onCommitted({state:'saved-published',page:pages.get('B.md')}));await new Promise(resolve=>setTimeout(resolve,20));check(!mounts[0].querySelector('.kplex-relationship-updating'),'Published non-Classic relink remained blocked by empty Compass neighbourhood');
   const nextMove=start(0,'b-first');drop(0,nextMove.transfer);const newer=calls.at(-1);finish(0);M.flushSync(()=>newer.onCommitStart('parent'));M.flushSync(()=>move.onCommitted({state:'saved-published',page:pages.get('B.md')}));check(mounts[0].querySelector('.kplex-relationship-updating'),'Stale completion cleared a newer relink');M.flushSync(()=>newer.onCommitEnd(false));check(!mounts[0].querySelector('.kplex-relationship-updating'),'Failed current relink retained feedback');
   const copied=start(0,'b-first');drop(1,copied.transfer);check(calls.at(-1).mode==='create'&&calls.at(-1).hostLeaf===propsList[1].hostLeaf&&calls.at(-1).invocation?.additiveOnly===true,'Cross-canvas import inherited source removal authority: '+JSON.stringify({calls:calls.map(x=>({mode:x.mode,leaf:x.hostLeaf?.id})),target:node(1,'r').getBoundingClientRect().toJSON(),viewport:[innerWidth,innerHeight]}));finish(0);
   const copyNavigation=start(0,'b-second'),beforeNavigation=calls.length;drop(1,copyNavigation.transfer,null);check(activations.at(-1)?.canvas===1&&activations.at(-1)?.page==='B.md'&&calls.length===beforeNavigation,'Cross-canvas body copy did not route navigation without mutation');finish(0);
   const staleCanonical=start(0,'b-first');canonicalDirection=2;drop(0,staleCanonical.transfer);check(calls.at(-1).mode==='create'&&calls.at(-1).invocation?.additiveOnly===true,'Canonical relationship changed before paint but retained removal authority');finish(0);canonicalDirection=1;
   pairReady=false;const uncertified=start(0,'b-first');check(uncertified.source.occurrence.relationship?.origin.identity==='R.md','Uncertified capture lost its exact cached context');drop(0,uncertified.transfer);check(calls.at(-1).mode==='create'&&calls.at(-1).invocation?.additiveOnly===true,'Uncertified pair granted removal authority');finish(0);pairReady=true;
   const staleEdge=start(0,'b-first');firstOrigin='c';rerenders[0]();await new Promise(resolve=>setTimeout(resolve,10));drop(0,staleEdge.transfer);check(calls.at(-1).mode==='create','Changed primary relationship retained removal authority');finish(0);firstOrigin='r';rerenders[0]();
   ambiguous=true;rerenders[0]();const uncertain=start(0,'b-first');check(!uncertain.source.occurrence.relationship,'Ambiguous incoming edges gained primary removal context');drop(0,uncertain.transfer);check(calls.at(-1).mode==='create','Ambiguous source gained relink authority');finish(0);ambiguous=false;rerenders[0]();
   const staleFile=start(0,'b-first'),oldFile=pages.get('B.md').file,beforeReplacement=calls.length;pages.get('B.md').file={...oldFile};drop(0,staleFile.transfer);check(calls.length===beforeReplacement,'Replaced native source file was retargeted during drop');pages.get('B.md').file=oldFile;finish(0);
   const retired=start(0,'b-first');M.flushSync(()=>sessions[0].select('test.retired-drag'));await new Promise(resolve=>setTimeout(resolve,20));manager.draggable={type:'link',source:retired.source};drop(0,retired.transfer);check(calls.at(-1).mode==='create','Retired canvas source regained relink authority');manager.draggable=null;
   for(const release of releases)release();for(let i=0;i<roots.length;i++){M.flushSync(()=>roots[i].unmount());sessions[i].dispose();}check(!manager.draggable,'Native drag lease leaked');check(errors.length===0,errors.join('\\n'));return{passed:true,cases:10};
  })()`);
  assert.equal(result.passed,true);
 }finally{await host.cleanup()}
});
