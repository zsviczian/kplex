/** Finite native boundary for actual shared canvas tests. No projection, layout, action or source owner is replaced. */
import {readFileSync} from "node:fs";
export const canvasSceneFixture=`
const M=sourceModules,check=(value,message)=>{if(!value)throw Error(message)},wait=()=>new Promise(resolve=>setTimeout(resolve,70));
const style=document.createElement('style');style.textContent=${JSON.stringify(readFileSync('styles.css','utf8'))};document.head.append(style);
const pages=new Map(['A.md','B.md','C.md'].map(path=>[path,{path,name:path,file:{path,name:path,extension:'md',basename:path,stat:{mtime:1,ctime:1,size:1}},url:null,isFolder:false,isTag:false,aliases:[],tags:[],styleTags:[],primaryStyleTag:null,noteType:null,maxLabelLength:30,neighbours:new Map()}]));
const fieldCaches=new Map([...pages.keys()].map(path=>[path,{frontmatter:{phase:'water',status:'water'}}]));
const work={acquisitions:0,releases:0,properties:0,body:0,scans:0,gateReads:0},events=new Set(),subscribe=fn=>{events.add(fn);return()=>events.delete(fn)};
const nativeEvents={on:(name,callback)=>{const ref={name,callback};events.add(ref);return ref},offref:ref=>events.delete(ref)};
let prepared=true,visible=true;
const settings=M.migrateAndMergeSettings({animationSpeed:0,allowAutozoom:false,embedCentralNode:false,showFolderNodes:false,showTagNodes:false,groupRelations:false});
const rows=(page,role)=>(page.path==='A.md'&&role==='child'?['B.md','C.md']:page.path!=='A.md'&&role==='parent'?['A.md']:[])
 .map(path=>({page:pages.get(path),role,relationType:1,typeDefinition:'Related',linkDirection:1}));
const unavailableCounts=()=>{work.gateReads++;return Object.fromEntries(['top','bottom','left','right'].map(side=>[side,{visibleCount:0,hasAny:false,complete:false,coverage:'cached',countUnavailable:true}]))};
const index={isVisiblePage:()=>true,get:path=>pages.get(path),titleFor:page=>page.name,neighbours:rows,sortNeighbours:rows=>rows,
 captureSemanticGateRead:()=>({isCurrent:()=>true,read:()=>new Map()}),viewScopeCoverage:()=>({coverage:prepared?'local':'cached',prepared,complete:false,pending:!prepared}),
 acquireSemanticDemand:()=>{work.acquisitions++;return()=>work.releases++},acquirePresentationDemand:()=>()=>{},getNodeVisualRevision:()=>0,resolveNodeVisuals:async()=>new Map(),invalidateNodeVisual:()=>{},
 gateStats:unavailableCounts,neighbourCount:()=>0,subscribe,subscribePresentation:subscribe,visibleRelationshipsWithin:()=>[],explainRelationship:()=>null,
 getNeighborhood:path=>({center:pages.get(path),parents:rows(pages.get(path),'parent'),children:rows(pages.get(path),'child'),leftFriends:[],rightFriends:[],siblings:[]})};
const plugin={settings,index,viewSettingsRegistry:M.builtInCanvasViewSettings,translator:M.createTranslator('en'),app:{workspace:{...nativeEvents},
 metadataCache:{...nativeEvents,getFileCache:file=>{work.properties++;return fieldCaches.get(file.path)}},vault:{getFileByPath:path=>pages.get(path)?.file??null,cachedRead:()=>{work.body++;throw Error('Unexpected body read')},getMarkdownFiles:()=>{work.scans++;throw Error('Unexpected inventory')}}},
 saveSettings:async()=>{},getTypographyDevice:()=> 'desktop',isKplexLeafVisible:()=>visible,subscribeKplexVisibility:subscribe,subscribeNodeFlair:subscribe,registerLinkedNodeFeedback:()=>()=>{},
 getHierarchyColorRevision:()=>0,isActionSurfaceCurrent:()=>true,getSavedSettingsPolicy:()=>null};
plugin.actionManager=new M.ActionManager({readCommandContext:()=>({sharedCenter:null,focusRegion:'graph'}),validateNode:()=>true});
const mount=async(definition,{openHelp}={})=>{
 const registered=[...M.builtInPlexViews.available,M.exampleViewDefinition];if(!registered.some(row=>row.id===definition.id))registered.push(definition);
 const registry=new M.PlexViewRegistry(registered),session=new M.PlexViewSession(registry,()=>{});session.select(definition.id);
 const container=document.createElement('div');container.className='kplex-app';container.style.cssText='width:1200px;height:900px;position:relative';document.body.append(container);
 const root=M.createRoot(container),ports={current:null},moves=[];
 const contributions=new M.CanvasViewContributionController(session,plugin.viewSettingsRegistry,{settings:()=>settings.canvasViewSettings??{},mounted:()=>container.isConnected,
  beforePresentationChange:()=>ports.current?.preparePresentationChange?.(),update:async(id,address,edit,expected)=>{settings.canvasViewSettings=M.editViewConfigurationAt(registry.resolve(id),settings.canvasViewSettings??{},address,edit,expected)},openSettings:()=>false,...(openHelp?{openHelp}:{}),failed:error=>{throw error}});
 const props={plugin,index,settings,paintSettings:settings,paintLenses:{lenses:[]},surface:'leaf',hostLeaf:{},predicate:null,lenses:{lenses:[]},filterLayoutMode:'keep',predicateRevision:0,
 showCrossLinks:true,activePath:'A.md',renderRevision:0,semanticRevision:0,findFocusRequest:0,areaSettingsMode:false,onAreaSettingsModeChange:()=>{},onApplyFindFilter:()=>{},appliedFindFilterQuery:null,onClearFindFilter:()=>{},
 onActivate:()=>{},onWanderActivate:page=>{moves.push(page.path);props.activePath=page.path;render()},onOpen:()=>{},onOpenInSidecar:async()=>{},onCentralNodeEditorChange:()=>{},onCentralNodeModeChange:()=>{},
 actionPorts:ports,actionSurfaceId:'wander-'+definition.id,displayState:{zen:false,fullscreen:false},fullscreenAvailable:false,sidecarOpen:false,viewDefinition:definition,viewSession:session,viewContributions:contributions,viewRevision:session.getSnapshot()};
 const render=()=>{props.viewRevision=session.getSnapshot();M.flushSync(()=>root.render(M.createElement(M.PlexGraph,props)))};render();await wait();await wait();
 return{container,ports,session,contributions,props,moves,render,close:()=>{M.flushSync(()=>root.unmount());contributions.dispose();session.dispose();container.remove()}};
};
`;

