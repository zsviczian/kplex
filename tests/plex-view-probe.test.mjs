/** Full production PlexGraph mounts a non-Classic definition in real Chromium. Host effects are finite explicit doubles. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import test from 'node:test';
import {chromiumHarness} from './support/browserTypeScript.mjs';

const nativeStub=`
  class NativeBase {constructor(){} register(){} registerEvent(){} addChild(){} removeChild(){}}
  exports.App=exports.Modal=exports.SuggestModal=exports.FuzzySuggestModal=exports.AbstractInputSuggest=exports.Component=exports.MarkdownRenderChild=
  exports.PluginSettingTab=exports.Setting=exports.ButtonComponent=exports.ColorComponent=exports.SearchComponent=exports.ExtraButtonComponent=
  exports.ItemView=exports.FileView=exports.TextFileView=exports.Scope=exports.WorkspaceLeaf=NativeBase;
  exports.TFile=class TFile {};exports.TFolder=class TFolder {};
  exports.Platform={isMobile:false,isIosApp:false};exports.Keymap={isModEvent:e=>e.metaKey||e.ctrlKey};
  exports.getLanguage=()=> 'en';exports.getIcon=()=>null;exports.getIconIds=()=>[];exports.setIcon=()=>{};exports.setTooltip=()=>{};
  exports.normalizePath=p=>p;exports.getAllTags=()=>[];
  exports.Notice=class Notice {constructor(message){throw Error('Unexpected notice: '+message)}};
  exports.Menu=class Menu {items=[];addItem(prepare){const item={setTitle(){return item},setIcon(){return item},setChecked(){return item},setDisabled(){return item},onClick(fn){item.click=fn;return item}};prepare(item);this.items.push(item);return this;}addSeparator(){return this;}};
  exports.MarkdownRenderer={render:async()=>{}};
`;
const output=await build({stdin:{resolveDir:process.cwd(),contents:`
  export {createElement,useSyncExternalStore} from 'react';export {createRoot} from 'react-dom/client';export {flushSync} from 'react-dom';
  export {PlexGraph} from './src/ui/PlexGraph';export {migrateAndMergeSettings} from './src/settings';export {createTranslator} from './src/lang';
  export {PlexViewRegistry} from './src/core/plex/views/registry';export {PlexViewSession} from './src/application/PlexViewSession';
  export {builtInPlexViews} from './src/ui/plexViews/builtins';export {probeViewDefinition} from './tests/support/plexViewProbe';
  export {ActionManager} from './src/application/ActionManager';export {actionNodeRef} from './src/adapters/obsidian/actionNode';
  export {editViewConfiguration} from './src/core/plex/views/configuration';
`},write:false,bundle:true,platform:'browser',format:'iife',globalName:'sourceModules',plugins:[{name:'finite-native-host',setup(builder){
  builder.onResolve({filter:/^obsidian$/},()=>({path:'host',namespace:'finite'}));
  builder.onLoad({filter:/.*/,namespace:'finite'},()=>({contents:nativeStub}));
}}]});

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
        getNeighborhood:()=>{work.classicReads++;return {center:pages.get('Focus.md'),parents:[],children:[],leftFriends:[],rightFriends:[],siblings:[]}},visibleRelationshipsWithin:()=>{throw Error('Non-Classic entered Classic cross-link projection')},
        explainRelationship:()=>null};
      const groupedDefinition={...M.probeViewDefinition,id:'test.grouped',project(input){const projection=M.probeViewDefinition.project(input);if(!projection)return null;
        return {...projection,occurrences:[...projection.occurrences,{id:'extra-above',nodeId:'Other.md',areaId:'grove',groupingPartition:'upper',representation:'thought',role:'child'}]}}};
      const failedDefinition={...M.probeViewDefinition,id:'test.failed',layout(){throw Error('Deliberate scene failure')}};
      const unavailableDefinition={...M.probeViewDefinition,id:'test.unavailable',project(){return null}};
      const registry=new M.PlexViewRegistry([...M.builtInPlexViews.available,M.probeViewDefinition,groupedDefinition,failedDefinition,unavailableDefinition]);const session=new M.PlexViewSession(registry,()=>{});session.select('test.situated');
      const actionPorts={current:null},activations=[],plugin={settings,index,translator:M.createTranslator('en'),app:{workspace:{...nativeEvents},metadataCache:{...nativeEvents,getFileCache:()=>null},vault:{getFileByPath:path=>pages.get(path)?.file??null,cachedRead:()=>{work.reads++;throw Error('Unexpected note read')}}},
        saveSettings:()=>{work.settingsWrites++;throw Error('Unexpected global settings write')},getTypographyDevice:()=> 'desktop',isKplexLeafVisible:()=>true,subscribeKplexVisibility:subscribe,subscribeNodeFlair:subscribe,getHierarchyColorRevision:()=>0,
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
        resizedHeight,heightRestored,retainedSelection,selectionRestored,retainedCamera,cameraRestored,staleOutcome,groupCount,unfolded,normalClassicReads,configuredBefore,configuredAfter,configurationRetainedSession,failureVisible,sameShell,failureAction,recovered,unavailableFallback,remainingFailure,
        errors:[...errors],text:mount.textContent,ports:!!actionPorts.current,work:{...work}};
      releaseAction();
      root.unmount();session.dispose();plugin.actionManager.dispose();style.remove();mount.remove();return {...snapshot,events:events.size,after:{...work}};
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
    assert.equal(result.failureAction.status,'unavailable');assert.equal(result.recovered,'classic');assert.equal(result.remainingFailure,false);
    assert.equal(result.work.settingsWrites,0);assert.equal(result.work.semantic,1);assert.equal(result.after.releases,1);assert.equal(result.after.presentation,0);assert.equal(result.events,0);
    assert.equal(result.after.reads,0);assert.equal(result.after.parses,0);assert.equal(result.after.publishes,0);
  } finally {await host.cleanup();}
});
