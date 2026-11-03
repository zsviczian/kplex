/** Exact-build Wu Xing Windows acceptance on explicit disposable Small. Uses the production registry/settings/editor/Sidecar, owns bounded fixture resources and restores configuration independently of assertions. Run lanes serially. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';
import {acceptFacetsNodePresentation} from './facetsNodePresentation.mjs';
import {acceptWuXingEditor} from './wuxingEditor.mjs';
import {acceptWuXingPairs} from './wuxingPairs.mjs';
import {acceptFacetsFeatures} from './facetsFeatures.mjs';
import {nativeHtmlDrag} from './nativeHtmlDrag.mjs';
import {acceptFacets222Help} from './facets222Help.mjs';
import {acceptFacets222Sharing} from './facets222Sharing.mjs';
import {acceptFacets222Layouts} from './facets222Layouts.mjs';
import {acceptFacets222UX} from './facets222UX.mjs';
import {acceptViewInteractions222} from './viewInteractions222.mjs';
import {acceptHelpVaultFacets222} from './helpVaultFacets222.mjs';

/** Keep every native effect under one exact controller lifetime; callbacks are serialized into the selected renderer, never production modules. */
async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'],workspace=app.workspace,root=host=>host.view.contentEl.querySelector('.kplex-app');
 if(!p||app.setting.isOpen||app.vault.getFiles().length>=1000)throw Error('Clean disposable Small required');
 const startupDeadline=Date.now()+30000;
 while(!p.layoutReady||p.isStartupInitializing()){
  if(c.closed||Date.now()>=startupDeadline)throw Error('Native plugin lifecycle did not finish before fixture capture');
  await new Promise(resolve=>window.setTimeout(resolve,50));
 }
 const original=structuredClone(p.settings),policy=p.savedSettingsPolicy,layout=workspace.getLayout(),folder='Kplex-220-WuXing-'+Date.now();
 const remote=require('@electron/remote'),native=remote.getCurrentWindow(),bounds=native.getBounds(),maximized=native.isMaximized(),minimized=native.isMinimized(),files=[],hosts=[],releases=[],restores=[],cases=[],cleanup=[];
 let createdFolder,failure;
 const path=name=>folder+'/'+name+'.md',check=(value,message)=>{if(c.closed||!value)throw Error(message)};
 const wait=async ms=>{check(true,'Retired controller');await new Promise(resolve=>window.setTimeout(resolve,ms));check(true,'Retired controller')};
 const until=async(read,message,maximumMs=20000)=>{const end=Date.now()+maximumMs;while(!read()){check(Date.now()<end,message);await wait(40)}};
 // The production view consumes cached revision-scoped relationships, not a complete corpus.
 // Global semantic pending is retained as a diagnostic; current local proof and zero active work
 // are required in addition to the exact fixture relationships asserted below.
 const localReady=()=>{const readiness={rebuild:!!p.rebuildTask,timer:p.rebuildTimer!==null,dirty:p.dirtyMarkdownPaths.size,
  active:p.index.hasActiveSemanticPreparation(),current:p.index.captureSemanticGateRead().isCurrent(),initial:p.initialIndexComplete};
  // On-demand startup can retain an uncovered global dirty backlog while serving current local
  // cached neighborhoods. Keep that limitation visible. Require no executing/queued rebuild,
  // active semantic work or retired local proof; completed startup must also drain its backlog.
  c.progress={...c.progress,readiness};return !readiness.rebuild&&!readiness.timer&&(!readiness.initial||readiness.dirty===0)&&!readiness.active&&readiness.current};
 const center=host=>host.view.documentSession.centerPath;
 const observe=(owner,key,work,label=key)=>{const previous=owner[key];check(typeof previous==='function','Observation owner missing: '+key);owner[key]=function(...args){work[label]=(work[label]??0)+1;return previous.apply(this,args)};const restore=()=>{owner[key]=previous};restores.push(restore);return restore};
 const quiet=()=>{const work={reads:0,parses:0,acquisitions:0,rebuilds:0},readers=[];
  const stops=['read','cachedRead'].map(key=>{const previous=app.vault[key];app.vault[key]=function(...args){work.reads++;if(readers.length<4)readers.push({method:key,callers:new Error().stack.split('\n').slice(1,8)});return previous.apply(this,args)};const restore=()=>app.vault[key]=previous;restores.push(restore);return restore});
  stops.push(observe(p.index.metadataParser,'parse',work,'parses'),observe(p.index,'acquireSemanticDemand',work,'acquisitions'),observe(p.index,'rebuild',work,'rebuilds'),observe(p.index,'rebuildProgressively',work,'rebuilds'));
  return label=>{for(const stop of stops)stop();c.progress={...c.progress,zeroWork:{label,work,readers}};check(Object.values(work).every(value=>value===0),label+': '+JSON.stringify(work));cases.push({id:label,work})}};
 const reveal=async host=>{const win=host.view.containerEl.ownerDocument.defaultView.require('@electron/remote').getCurrentWindow();win.restore();win.show();win.focus();win.webContents.focus();await workspace.revealLeaf(host);workspace.setActiveLeaf(host,{focus:true});await until(()=>host.view.containerEl.ownerDocument.hasFocus(),'Exact native canvas focus absent')};
 const panel=host=>host.view.containerEl.ownerDocument.querySelector('.kplex-filter-panel');
 const choose=async(host,id)=>{await reveal(host);if(!panel(host)){root(host).querySelector('.kplex-filter-trigger').click();await until(()=>panel(host)?.querySelector('.kplex-view-selector select'),'Native view selector absent')}
  const select=panel(host).querySelector('.kplex-view-selector select');check(JSON.stringify([...select.options].map(option=>option.value))===JSON.stringify(['classic','mindmap','wuxing']),'Production options differ');select.value=id;select.dispatchEvent(new select.ownerDocument.defaultView.Event('change',{bubbles:true}));
  await until(()=>host.view.documentSession.plexView.definition.id===id&&select.value===id,'Owning native selection failed');
 };
 try{
  native.restore();native.setBounds({x:20,y:20,width:1800,height:1100});native.show();native.focus();native.webContents.focus();if(process.platform==='darwin')remote.app.focus({steal:true});await until(()=>!document.hidden,'Foreground unavailable');
  workspace.leftSplit.collapse();workspace.rightSplit.collapse();await until(()=>!p.isStartupInitializing()&&!p.index.hasActiveSemanticPreparation(),'Startup owner/active work did not settle before fixture writes');
  // With no demand, global pending can describe an unprepared dormant subject. It must not be
  // misreported as ready or require a whole-vault completion before this cached local-view test.
  c.progress={phase:'pre-demand-readiness',pending:p.index.hasPendingSemanticPreparation(),active:p.index.hasActiveSemanticPreparation()};
  // Use a real native tab in the widest main-window group. A direct leaf under rootSplit is
  // unsuitable for native Sidecar adjacency; an arbitrary active group can be only128px wide.
  const anchors=[];workspace.iterateRootLeaves(leaf=>{if(leaf.view.containerEl.ownerDocument===document&&leaf.view.containerEl.getBoundingClientRect().width>0)anchors.push(leaf)});
  anchors.sort((a,b)=>b.view.containerEl.getBoundingClientRect().width-a.view.containerEl.getBoundingClientRect().width);check(anchors[0],'Native main-window tab anchor absent');await workspace.revealLeaf(anchors[0]);workspace.setActiveLeaf(anchors[0],{focus:true});
  const host=workspace.getLeaf('tab');hosts.push(host);await host.setViewState({type:'k-plex-react-view',active:true});await host.view.waitUntilReady();await reveal(host);await p.setDocumentSyncMode(host,'off');
  createdFolder=await app.vault.createFolder(folder);
  const child=p.settings.hierarchy.children[0];check(child,'Configured child ontology required');
  const phase={Memory:'water',Concept:'wood',Concept2:'wood',Goal:'fire',Review:'earth',Method:'metal',Conflict:['water','wood'],Unmapped:null};
  if(['features','areas','layouts'].includes(c.lane))phase.Unsupported={unrecognized:true};
  for(const [name,value]of Object.entries(phase)){
   const emoji={wood:'🟢',fire:'🔴',earth:'🟤',metal:'🟡',water:'🔵'};
   const index=Object.keys(phase).indexOf(name),frontmatter={phase:value,status:Array.isArray(value)?value.map(phase=>emoji[phase]??phase):emoji[value]??value,[p.settings.noteTypeField]:'Example',tags:['wuxing-fixture']};
   for(const [field,values]of Object.entries({arc:['add','relate','communicate'],para:['projects','areas','resources','archives'],horizon:['actions','projects','areas','goals','vision','purpose'],access:['encounters','atlas','calendar','cards','extras','sources','spaces'],state:['seed','research','draft','review','published'],'map-role':['hub','supporting-map','concept','reference']}))if(value!==null)frontmatter[field]=name==='Conflict'?values.slice(0,2):values[index%values.length];
   if(value!==null){frontmatter.approach=name==='Conflict'?['top-down','bottom-up']:index%4<2?'top-down':'bottom-up';frontmatter.mode=index%2?'expression':'reflection';}
   if(name==='Memory')frontmatter[child]=Object.keys(phase).filter(key=>key!=='Memory').map(key=>'[['+path(key)+']]');
   const yaml=Object.entries(frontmatter).map(([key,value])=>JSON.stringify(key)+': '+JSON.stringify(value)).join('\n');
   const file=await app.vault.create(path(name),'---\n'+yaml+'\n---\n# '+name+'\n\nDisposable Wu Xing native fixture.\n');files.push(file);p.index.insertCreatedFile(file);releases.push(p.index.acquireSemanticDemand(file.path));
  }
  await until(()=>files.every(file=>app.metadataCache.getFileCache(file))&&!p.index.hasActiveSemanticPreparation(),'Fixture metadata/active work did not settle');
  Object.assign(p.settings,{canvasViewSettings:{},maxItemCount:100,documentSyncMode:'off',sidecarOpen:false,embedCentralNode:false,autoOpenCentralDocument:false,followActiveFile:false,centralNodeMarkdownMode:'source',animationSpeed:0,graphDepth:1,renderSiblings:false,showPageNodes:true,showVirtualNodes:true,showInferredNodes:true,showFolderNodes:false,showTagNodes:false,graphLenses:[],applyPowerFilter:false});p.index.notifyPresentation();
  // Legacy area/editor lanes deliberately characterize separate diagnostic regions. Combined
  // defaults and their captured canvas toggle have independent expanded acceptance coverage.
  for(const id of c.lane==='features'?['arc','para','wuxing','gtd','eaccess','sensemaking','publishing','map-roles']:['wuxing'])
   await p.updateCanvasViewConfiguration('wuxing',{field:'presets',path:[id,'diagnostics']},{kind:'set',value:{combined:false}});
  await until(()=>p.index.neighbours(p.index.get(path('Memory')),'child').length>=7,'Canonical direct relationships absent');
  host.view.centerPresentation.update({embedCentralNode:false,centralNodeMarkdownMode:'source'});p.notifyNavigation(path('Memory'),host);await until(()=>center(host)===path('Memory')&&root(host)?.querySelector('.kplex-filter-trigger'),'Attention did not render');
  // The real native view-open callback owns asynchronous preparation. Cached presence can
  // support these bounded presentation checks without awaiting absent global source closure.
  await until(localReady,'Requested local cached proof/active work did not settle');
  cases.push({id:'requested-local-cache-proof',current:true,coverage:'cached',globalSemanticPending:p.index.hasPendingSemanticPreparation()});await choose(host,'wuxing');
  const expectedRegions=['features','areas','layouts'].includes(c.lane)?8:7;
  await until(()=>root(host).querySelectorAll('.kplex-view-region').length===expectedRegions&&!root(host).querySelector('.kplex-view-error'),'Facets production scene absent');panel(host).querySelector('.kplex-filter-panel-header button').click();
  check(root(host).querySelectorAll('.kplex-view-guide').length===10,'Generating/regulating decorative cycles absent');
  const conflict=[...root(host).querySelectorAll('[data-kplex-decoration]')].find(element=>element.dataset.kplexDecoration===JSON.stringify(['facets','wuxing','status','conflicting']));check(conflict?.textContent.includes('1'),'Conflicting list missing');
  cases.push({id:'production-registry-five-phases-canonical-links',regions:expectedRegions,semanticConnectors:root(host).querySelectorAll('[data-kplex-edge-id]').length});
  const context={app,p,c,workspace,remote,native,bounds,host,hosts,files,releases,restores,cases,path,root,center,check,wait,until,localReady,choose,panel,reveal,observe,quiet};
  c.progress={phase:c.lane,cases};
  if(c.lane==='node-presentation')await c.acceptNodePresentation(context);else if(['editor','editor-isolated','editor-lifecycle'].includes(c.lane))await c.acceptEditor(context);else if(c.lane==='pairs')await c.acceptPairs(context);else if(c.lane==='help')await c.acceptHelp(context);else if(c.lane==='sharing')await c.acceptSharing(context);else if(c.lane==='layouts')await c.acceptLayouts(context);else if(c.lane==='ux')await c.acceptUX(context);else if(c.lane==='interactions')await c.acceptInteractions(context);else if(c.lane==='help-vault')await c.acceptHelpVault(context);else await c.acceptFeatures(context);
  return {lane:c.lane,cases,cleanup,host:{node:process.version,electron:process.versions.electron,chrome:process.versions.chrome,hidden:document.hidden},limits:['Windows native automation is separate from macOS and physical mobile acceptance.','#215 extra-tab application restart/combined two-editor-pair baseline failures are not claimed fixed.',...(c.lane==='areas'?['Area-only acceptance: no Wander, assignment, preset manager or editor pass is claimed.']:[]),...(c.lane==='editor-isolated'?['Combined editor/Sidecar acceptance is excluded from this isolated lane; its failing Facets/Compass observations remain separate.']:[]),...(c.lane==='editor-lifecycle'?['Clipboard excluded: this lane uses native typed text; the separate guarded clipboard lane declined rich/custom formats.']:[]),...(!c.osInput?['Native trusted input uses Electron; this is not an OS clipboard acceptance receipt.']:[])]};
 }catch(error){failure=error;c.progress={...c.progress,cases,errorStack:error?.stack??String(error)};throw error}
 finally{
  const errors=[];
  const clean=async(label,action)=>{try{await action();cleanup.push({label,status:'passed'})}catch(error){errors.push(label+': '+String(error));cleanup.push({label,status:'failed',error:String(error)})}c.progress={...c.progress,cleanup}};
  await clean('close-owned-settings',()=>{if(app.setting.isOpen)app.setting.close()});
  for(const restore of restores.reverse())await clean('restore-resource',restore);
  for(const host of hosts.reverse())if(workspace.getLeafById(host.id)===host)await clean('detach-owned-host',()=>host.detach());
  for(const release of releases.reverse())await clean('release-demand',release);
  p.settings=original;await clean('restore-live-settings',()=>p.saveSettings(false,false));p.savedSettingsPolicy=policy;
  await clean('restore-layout',()=>workspace.changeLayout(layout));await clean('restore-window-bounds',()=>{native.setBounds(bounds);if(maximized)native.maximize();if(minimized)native.minimize()});
  for(const file of files.reverse())if(app.vault.getFileByPath(file.path)===file)await clean('delete-owned-fixture',()=>app.vault.delete(file,true));
  if(createdFolder&&app.vault.getFolderByPath(folder)===createdFolder&&!createdFolder.children.length)await clean('delete-owned-folder',()=>app.vault.delete(createdFolder,true));
  await clean('drain-settings',()=>p.settingsWriteQueue);await new Promise(resolve=>window.setTimeout(resolve,750));await clean('restore-settings-bytes',()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
  if(errors.length)throw Error((failure?String(failure)+'; ':'')+'Wu Xing cleanup: '+errors.join('; '));
 }
}

if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small required');
const lane=process.env.KPLEX_WUXING_NATIVE_LANE??'editor';if(!['editor','editor-isolated','editor-lifecycle','pairs','features','areas','help','sharing','layouts','ux','interactions','help-vault','node-presentation'].includes(lane))throw Error('Unknown Wu Xing native lane');
const definitions='c.htmlDrag='+nativeHtmlDrag.toString()+';c.includeSidecar='+JSON.stringify(['editor','editor-lifecycle'].includes(lane))+';c.compareSidecar='+JSON.stringify(process.env.KPLEX_WUXING_SIDECAR_COMPARATOR==='true')+';c.screenshotPrefix='+JSON.stringify(join(process.env.KPLEX_HOST_REPORT_DIR??'','facets'))+';c.lane='+JSON.stringify(lane)+';c.osInput='+JSON.stringify(process.env.KPLEX_WUXING_OS_INPUT==='true')+';c.loadedCompanion='+JSON.stringify(process.env.KPLEX_WUXING_LOADED_COMPANION==='true')+';c.stateExample='+JSON.stringify(JSON.parse(readFileSync('tests/fixtures/facets-vault/.obsidian/plugins/k-plex/data.json','utf8')).canvasViewSettings.wuxing.values.presets.state)+';c.originalData='+JSON.stringify(readFileSync(join(process.env.KPLEX_TEST_CONFIG_DIR,'plugins/k-plex/data.json'),'utf8'))+';c.acceptNodePresentation='+acceptFacetsNodePresentation.toString()+';c.acceptEditor='+acceptWuXingEditor.toString()+';c.acceptPairs='+acceptWuXingPairs.toString()+';c.acceptFeatures='+acceptFacetsFeatures.toString()+';c.acceptHelp='+acceptFacets222Help.toString()+';c.acceptSharing='+acceptFacets222Sharing.toString()+';c.acceptLayouts='+acceptFacets222Layouts.toString()+';c.acceptUX='+acceptFacets222UX.toString()+';c.acceptInteractions='+acceptViewInteractions222.toString()+';c.acceptHelpVault='+acceptHelpVaultFacets222.toString()+';'+(lane==='help-vault'?'c.helpVault='+JSON.stringify(JSON.parse(readFileSync(process.env.KPLEX_HELP_DEMO_PAYLOAD,'utf8')))+';':'');
await runControlledProbe('wuxing-220-'+lane,scenario,definitions,['scripts/testing/obsidian/facetsNodePresentation.mjs','src/ui/plexViews/nodeConnections.ts','scripts/testing/obsidian/helpVaultFacets222.mjs','src/ui/PlexGraph.tsx','src/ui/plexViews/areaVisibility.ts','src/ui/plexViews/reflowArea.ts','src/ui/plexViews/scene.ts','src/ui/plexViews/prepareScene.ts','src/core/plex/views/contracts.ts','src/core/plex/views/hierarchy.ts','src/core/plex/views/registry.ts','src/core/plex/views/mindmap/definition.ts','src/core/plex/views/mindmap/projection.ts','src/core/plex/views/mindmap/layout.ts','src/core/plex/views/wuxing/definition.ts','src/core/plex/views/facets/projection.ts','src/core/plex/views/facets/layout.ts','src/core/plex/views/facets/rules.ts','src/core/plex/predicate.ts','src/ui/plexViews/facets/FacetPresetEditor.ts','src/ui/CanvasPropertyAssignmentActions.ts','src/adapters/obsidian/predicateContracts.ts','src/ui/NativeMarkdownHelp.ts','src/ui/MarkdownHelpModal.ts','src/core/contracts/markdownHelp.ts','src/ui/plexViews/facets/helpSettings.ts','src/core/plex/views/facets/templates.ts'],{maximumMs:480000});

