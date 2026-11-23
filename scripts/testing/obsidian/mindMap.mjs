/** Exact-build production Mind Map acceptance in the authorized Small vault. Shared transport/session helpers own native isolation; no test definition or editor is installed. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';
import {validateTarget} from './runner.mjs';
import {acceptMindMapInteractions} from './mindMapInteractions.mjs';
import {nativeHtmlDrag} from './nativeHtmlDrag.mjs';
import {acceptNativeOccurrenceDrag} from './nativeOccurrenceDrag.mjs';

/** Run separate bounded editor and two-canvas lanes against actual production registration, then restore all owned resources independently of success. */
async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'],workspace=app.workspace;
 if(!p||app.vault.getFiles().length>=1000||app.setting.isOpen)throw Error('Clean disposable Small required');
 const challengers=c.lane==='challengers';
 const original=structuredClone(p.settings),policy=p.savedSettingsPolicy,layout=workspace.getLayout(),sessions=c.documentSessions(p),owners=sessions.capture();
 const files=[],hosts=[],releases=[],restores=[],embedded=new Set(),cases=[],cleanup=[],folder='Kplex-219-Mindmap-'+Date.now();let createdFolder,failure;
 /** Every native continuation belongs to this exact still-live controller. */
 const check=(value,message)=>{if(c.closed||!value)throw Error(message)};
 /** Opaque fixture paths name only files owned by this scenario. */
 const path=name=>folder+'/'+name+'.md';
 /** Bound waits reject retired controllers before another native effect. */
 const wait=async ms=>{check(true,'Retired controller');await new Promise(resolve=>window.setTimeout(resolve,ms));check(true,'Retired controller')};
 /** Conditions receive a fixed deadline; no failed assertion is retried as a new scenario. */
 const until=async(read,message)=>{const end=Date.now()+20000;while(!read()){check(Date.now()<end,message);await wait(30)}};
 /** Read the actual owning native shell, never a globally active canvas. */
 const root=host=>host.view.contentEl.querySelector('.kplex-app');
 /** The existing document session owns selected view/root/bindings. */
 const session=host=>host.view.documentSession.plexView;
 /** Capture the native action surface associated with this exact leaf. */
 const surface=host=>[...p.actionSurfaceHosts].find(([,registration])=>registration.leaf===host)?.[0];
 /** All structural/editor operations go through the shipped shared manager. */
 const act=async(host,id,args,target)=>{const result=await p.actionManager.dispatch({id,source:'internal',surfaceId:surface(host),...(args?{args}:{}),...(target?{target}:{})});c.progress={...c.progress,lastAction:{id,result}};await wait(40);return result};
 /** Native actions may resolve a current fixture file; stale-incarnation tests remain in the dedicated M0 lane. */
 const target=(name,occurrenceId)=>({kind:'explicit',node:{identity:path(name),path:path(name),kind:'file'},...(occurrenceId?{occurrenceId}:{})});
 /** Exact displayed lineage, independent of order and canonical same-note copies. */
 const occurrence=(...names)=>names.length===1?'root':JSON.stringify(names.map(path));
 /** Enumerate only actual displayed occurrences in one canvas. */
 const nodes=host=>[...root(host).querySelectorAll('[data-kplex-keyboard-id]')];
 /** Native editor leaves are observed through the existing reviewed setViewState seam. */
 const instance=host=>[...embedded].find(leaf=>leaf.view.containerEl.isConnected&&root(host)?.querySelector('.kplex-central-editor-leaf-host')?.contains(leaf.view.containerEl));
 /** The existing filter panel is portaled into its opening document. */
 const panel=host=>root(host).ownerDocument.querySelector('.kplex-filter-panel');
 /** Return the existing native select in that panel. */
 const selector=host=>panel(host)?.querySelector('.kplex-view-selector select');
 /** Open the captured canvas's shared panel without another selector implementation. */
 const openPanel=async host=>{if(!panel(host))root(host).querySelector('.kplex-filter-trigger').click();await until(()=>selector(host),'Owning panel selector absent')};
 /** Submit against the opening session even when the other document has keyboard focus. */
 const choose=async(host,id)=>{await openPanel(host);const element=selector(host);element.value=id;element.dispatchEvent(new element.ownerDocument.defaultView.Event('change',{bubbles:true}));await wait(80)};
 /** Native code must receive trusted primary input at a visible actual occurrence. */
 const clickNative=async readTarget=>{await until(()=>readTarget()?.isConnected&&readTarget().ownerDocument.defaultView,'Primary target lacks a live native document');const first=readTarget();const doc=first.ownerDocument,win=doc.defaultView.require('@electron/remote').getCurrentWindow();win.show();win.focus();win.webContents.focus();await until(()=>{const element=readTarget(),rect=element?.getBoundingClientRect();return element?.ownerDocument===doc&&rect.width>0&&rect.height>0&&element.contains(doc.elementFromPoint(Math.round(rect.left+rect.width/2),Math.round(rect.top+rect.height/2)))},'Visible unobscured primary target required');let priorBox,stableSince=Date.now();await until(()=>{const target=readTarget(),box=target?.getBoundingClientRect(),key=box&&[box.left,box.top,box.width,box.height].join(',');if(key!==priorBox){priorBox=key;stableSince=Date.now()}return target?.ownerDocument===doc&&Date.now()-stableSince>=120},'Native target geometry did not settle');const element=readTarget(),rect=element.getBoundingClientRect(),x=Math.round(rect.left+rect.width/2),y=Math.round(rect.top+rect.height/2),hit=doc.elementFromPoint(x,y);c.progress={...c.progress,input:{rect:{left:rect.left,top:rect.top,width:rect.width,height:rect.height},viewport:{width:doc.defaultView.innerWidth,height:doc.defaultView.innerHeight},hitClass:typeof hit?.className==='string'?hit.className:null,hitInside:element.contains(hit),windowId:win.id,focused:win.isFocused()}};let trusted=false;const observe=event=>{const current=readTarget();trusted=event.isTrusted&&!!current?.contains(event.target);c.progress={...c.progress,delivered:{trusted:event.isTrusted,target:event.target?.className,inside:!!current?.contains(event.target),x:event.clientX,y:event.clientY}}};doc.addEventListener('click',observe,true);try{win.webContents.sendInputEvent({type:'mouseMove',x,y});for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x,y,button:'left',clickCount:1});await until(()=>trusted,'Trusted primary click not delivered')}finally{doc.removeEventListener('click',observe,true)}};
 c.progress={phase:'fixture',lane:c.lane,cases};
 try{
  await until(()=>!p.isStartupInitializing()&&!p.index.hasPendingSemanticPreparation()&&!p.index.hasActiveSemanticPreparation(),'Startup/current requested semantics pending');
  const information=p.appearanceMigrationDialog;
  if(information?.modalEl.isConnected){const done=information.modalEl.querySelector('button.mod-cta');check(information.modalEl.classList.contains('kplex-notification-modal')&&done?.textContent===p.translator('common.done'),'Unexpected staging information owner');const ownDocument=information.modalEl.ownerDocument===document,visible=information.modalEl.getBoundingClientRect().width>0;information.close();await until(()=>p.appearanceMigrationDialog!==information&&!information.contentEl.querySelector('button'),'Staging information owner did not retire');await p.settingsWriteQueue;cases.push({id:'staging-native-theme-information-dismissed',publicModalClose:true,ownDocument,visible})}
  const remote=require('@electron/remote'),win=remote.getCurrentWindow();
  if(!challengers){remote.app.focus({steal:true});win.show();win.focus();win.webContents.focus();}
  if(c.prepareViewport){
   const bounds=win.getBounds(),maximized=win.isMaximized(),minimized=win.isMinimized();
   restores.push(()=>{win.restore();win.setBounds(bounds);if(maximized)win.maximize();if(minimized)win.minimize()});
   win.restore();win.setBounds({x:20,y:20,width:1800,height:1100});
  }
  workspace.leftSplit.collapse();workspace.rightSplit.collapse();c.progress={phase:'disable-native-follow',lane:c.lane,cases};await sessions.off();
  c.progress={phase:'create-folder',lane:c.lane,cases};createdFolder=await app.vault.createFolder(folder);const child=p.settings.hierarchy.children[0];check(child,'Child ontology required');const children={R:['P','Q'],P:['B'],Q:['B'],B:['D'],D:['R'],Left:['LeftChild']};
  const peerFields=[p.settings.hierarchy.leftFriends[0],p.settings.hierarchy.rightFriends[0],p.settings.hierarchy.previous[0],p.settings.hierarchy.next[0]];
  const names=challengers?['R','A','B','C','D','E']:
   c.lane==='navigation'?['R','A','P','Q','B','C','D','S','Left','Right','Prev','Next','LeftChild','LeafPeer']:['R','A','P','Q','B','C','D','S'];
  if(challengers){
   const right=p.settings.hierarchy.rightFriends;
   check(right.some(field=>field.toLowerCase()==='challenger'),'Challenger must be a configured right ontology');
  }
  if(c.lane==='interactions'){for(let i=0;i<12;i++){const name='Parent'+i;names.push(name);children[name]=['R']}children.P=['B','Q']}
  for(const name of names){
   c.progress={phase:'create-fixture-note',note:name,lane:c.lane,cases};
   const fields=!challengers&&children[name]?{[child]:children[name].map(value=>'[['+path(value)+']]')}:{};
   if(challengers&&(name==='R'||name==='C'))fields.Challenger=(name==='R'?['A','B','C','D']:['E']).map(value=>'[['+path(value)+']]');
   if(c.lane==='navigation'&&name==='R')for(const[index,peer]of ['Left','Right','Prev','Next'].entries())fields[peerFields[index]]=['[['+path(peer)+']]'];
   if(c.lane==='navigation'&&name==='P')fields[peerFields[0]]=['[['+path('LeafPeer')+']]'];
   const yaml=Object.entries(fields).map(([key,value])=>JSON.stringify(key)+': '+JSON.stringify(value)).join('\n');
   const file=await app.vault.create(path(name),(yaml?'---\n'+yaml+'\n---\n':'')+'# '+name+'\n');files.push(file);p.index.insertCreatedFile(file);
   if(!challengers)releases.push(p.index.acquireSemanticDemand(file.path));
  }
  c.progress={phase:'settle-fixture',lane:c.lane,cases};await until(()=>files.every(file=>app.metadataCache.getFileCache(file))&&!p.index.hasPendingSemanticPreparation()&&!p.index.hasActiveSemanticPreparation(),'Fixture not ready');
  Object.assign(p.settings,{documentSyncMode:'off',sidecarOpen:false,embedCentralNode:false,autoOpenCentralDocument:false,followActiveFile:false,centralNodeMarkdownMode:'source',animationSpeed:0,allowAutozoom:true,graphDepth:1,renderSiblings:false,showPageNodes:true,showInferredNodes:true,showFolderNodes:false,showTagNodes:false,showCrossLinks:true,graphLenses:[],applyPowerFilter:false,groupRelations:false,
   canvasViewSettings:{...p.settings.canvasViewSettings,mindmap:{version:1,values:{arrangement:'right',initialGenerations:1,maximumDepth:6,maximumOccurrences:128,horizontalSpacing:96,verticalSpacing:24}}}});p.index.notifyPresentation();
  c.progress={phase:'open-native-host',lane:c.lane,cases};
  if(c.prepareViewport){
   // Native source/Sidecar probes need a real tab parent. A bare rootSplit leaf makes later
   // getLeaf('tab') calls fall back to an unrelated narrow group despite a wide main viewport.
   const anchors=[];workspace.iterateRootLeaves(leaf=>{if(leaf.view.containerEl.ownerDocument===document&&leaf.view.containerEl.getBoundingClientRect().width>0)anchors.push(leaf)});
   anchors.sort((a,b)=>b.view.containerEl.getBoundingClientRect().width-a.view.containerEl.getBoundingClientRect().width);check(anchors[0],'Native main-window tab anchor absent');await workspace.revealLeaf(anchors[0]);workspace.setActiveLeaf(anchors[0],{focus:true});
  }
  const host=workspace.getLeaf('tab');hosts.push(host);const prototype=Object.getPrototypeOf(host),setState=prototype.setViewState;
  prototype.setViewState=function(...args){if(this.containerEl.closest('.kplex-central-editor-leaf-host'))embedded.add(this);return setState.apply(this,args)};restores.push(()=>{prototype.setViewState=setState});
  await host.setViewState({type:'k-plex-react-view',active:true});await workspace.revealLeaf(host);await host.view.waitUntilReady();host.view.centerPresentation.update({embedCentralNode:false,centralNodeMarkdownMode:'source'});p.notifyNavigation(path(challengers?'R':'A'),host);
  if(challengers){
   const expected=['A','B','C','D'].map(path),onDemand=p.index.isOnDemandMode();
   const before=await Promise.all(files.map(file=>app.vault.read(file)));
   const scope=()=>p.index.viewScopeCoverage(path('R'));
   const right=()=>p.index.getNeighborhood(path('R'))?.rightFriends.map(row=>row.page.path).sort()??[];
   const visible=()=>Array.from(root(host).querySelectorAll('.kplex-thought[data-kplex-path]'),node=>node.dataset.kplexPath).sort();
   const expectedVisible=[...expected,path('R')].sort();
   const inspect=async view=>{
    await until(()=>host.view.documentSession.centerPath===path('R')&&session(host).definition.id===view
     &&scope().prepared&&!scope().pending&&(onDemand||scope().complete)
     &&JSON.stringify(right())===JSON.stringify(expected)&&JSON.stringify(visible())===JSON.stringify(expectedVisible),
    'Four direct Challenger nodes and root scope did not settle in '+view);
    check(!root(host).querySelector('.kplex-view-error'),view+' scene error');
    check(view!=='mindmap'||session(host).layoutRoot(path('R'))===path('R'),'Mind Map captured another root');
    if(scope().complete)check(!nodes(host).find(node=>node.dataset.kplexPath===path('R'))?.querySelector('.kplex-node-status'),
     'Authoritative root displayed a coverage warning');
    return expected.map(target=>{
     const row=p.index.cachedViewRelation(path('R'),target,'right'),explanation=p.index.explainRelationship(path('R'),target);
     check(row&&explanation?.decisions.some(({active,evidence})=>active&&evidence.sourceKind==='frontmatter-ontology'
      &&evidence.declaredByPath===path('R')&&evidence.declaredTargetPath===target&&evidence.declaredRole==='right'),
     'Missing exact authored Challenger provenance');
     return {target,field:row.typeDefinition,direction:row.linkDirection,roles:explanation.resolvedRoles,
      evidence:explanation.decisions.map(({evidence:{id,...fact},...decision})=>({fact,...decision}))};
    });
   };
   await choose(host,'classic');
   const baseline=JSON.stringify(await inspect('classic')),baselineScope=scope();
   const other=workspace.getLeaf('tab');hosts.push(other);
   await other.setViewState({type:'k-plex-react-view',active:true});await other.view.waitUntilReady();
   other.view.centerPresentation.update({embedCentralNode:false});p.notifyNavigation(path('C'),other);
   await until(()=>other.view.documentSession.centerPath===path('C'),'Second canvas root not reached');
   workspace.moveLeafToPopout(other);await until(()=>root(other)?.ownerDocument!==document&&root(other)?.isConnected,'Second native document did not mount');
   await other.view.waitUntilReady();await choose(other,'mindmap');await workspace.revealLeaf(host);
   const work=p.startupDiagnostics.snapshot().sessionWork;
   for(const view of ['mindmap','classic','mindmap','classic']){
    c.progress={phase:'switch-four-challengers',view,cases};await choose(host,view);
    check(JSON.stringify(await inspect(view))===baseline,'Switch changed direct Challenger evidence');
    check(JSON.stringify(scope())===JSON.stringify(baselineScope),'Switch changed settled coverage');
    check(session(other).definition.id==='mindmap'&&other.view.documentSession.centerPath===path('C')
     &&session(other).layoutRoot(path('C'))===path('C'),'Switch changed the other canvas');
   }
   other.detach();await inspect('classic');
   const settled=p.startupDiagnostics.snapshot().sessionWork;
   check(settled.sourceInventoryPasses===work.sourceInventoryPasses&&settled.fullBuildStarts===work.fullBuildStarts,
    'View selection admitted broad index work');
   check(JSON.stringify(await Promise.all(files.map(file=>app.vault.read(file))))===JSON.stringify(before),'View changes edited the fixture');
   cases.push({id:'four-authored-challengers-retain-provenance-and-visibility',mode:onDemand?'on-demand':'eager',scope:baselineScope});
   cases.push({id:'independent-native-popout-and-same-center-selection'});
   return {lane:c.lane,cases,limits:['Native Obsidian test with the current persisted indexing policy.','No full application restart or original Linux host.']};
  }
  await until(()=>host.view.documentSession.centerPath===path('A'),'Initial attention absent');session(host).select('mindmap');session(host).setRoot(path('R'));
  await until(()=>nodes(host).length===(c.lane==='navigation'?8:c.lane==='interactions'?16:4)&&!root(host).querySelector('.kplex-view-error'),'Production rooted Mind Map absent');
  check(session(host).definition.id==='mindmap'&&session(host).definition.editorHosting==='occurrence','Production definition mismatch');
  if(c.lane==='navigation'){
   c.progress={phase:'root-context-and-navigation',cases};await act(host,'view.fit');
   const rect=name=>nodes(host).find(node=>node.dataset.kplexKeyboardId===occurrence('R',name))?.getBoundingClientRect(),rootRect=nodes(host).find(node=>node.dataset.kplexKeyboardId==='root').getBoundingClientRect();
   check(['P','Q'].every(name=>rect(name)?.left>rootRect.right),'Children not on right');check(['Left','Right','Prev','Next'].every(name=>rect(name)?.right<rootRect.left),'Peers not on left');check(rect('D')?.bottom<rootRect.top,'Parent not above root');
   const beforeAttention=host.view.documentSession.centerPath;
   await clickNative(()=>nodes(host).find(node=>node.dataset.kplexKeyboardId===occurrence('R','P')));await until(()=>nodes(host).some(node=>node.dataset.kplexKeyboardId===occurrence('R','P','B'))&&nodes(host).some(node=>node.dataset.kplexKeyboardId===occurrence('R','P','LeafPeer')),'Primary child expansion did not add children and peers');
   check(!session(host).editors.bindings.length&&host.view.documentSession.centerPath===beforeAttention&&session(host).layoutRoot(beforeAttention)===path('R'),'Branch click changed editor/attention/root');
   await clickNative(()=>nodes(host).find(node=>node.dataset.kplexKeyboardId===occurrence('R','P')));await until(()=>!nodes(host).some(node=>node.dataset.kplexKeyboardId===occurrence('R','P','B')),'Second primary click did not fold the branch');check(session(host).layoutRoot(beforeAttention)===path('R')&&host.view.documentSession.centerPath===beforeAttention&&!session(host).editors.bindings.length,'Fold changed root/attention/editor');
   await clickNative(()=>nodes(host).find(node=>node.dataset.kplexKeyboardId===occurrence('R','P')));await until(()=>nodes(host).some(node=>node.dataset.kplexKeyboardId===occurrence('R','P','B')),'Third primary click did not reopen branch');
   await act(host,'view.fit');await clickNative(()=>nodes(host).find(node=>node.dataset.kplexKeyboardId===occurrence('R','Left')));await until(()=>nodes(host).some(node=>node.dataset.kplexKeyboardId===occurrence('R','Left','LeftChild')),'Left-side child expansion absent');
   const rightChild=nodes(host).find(node=>node.dataset.kplexKeyboardId===occurrence('R','P','B')).getBoundingClientRect(),rightPeer=nodes(host).find(node=>node.dataset.kplexKeyboardId===occurrence('R','P','LeafPeer')).getBoundingClientRect(),P=rect('P');
   const leftChild=nodes(host).find(node=>node.dataset.kplexKeyboardId===occurrence('R','Left','LeftChild')).getBoundingClientRect(),L=rect('Left');check(rightChild.left>P.right&&rightPeer.left>P.right&&leftChild.right<L.left,'Expanded descendants lost their branch side');
   /** Inspect the shipped SVG route in its owning document, not just the pure projection's port label. */
   const origin=(names,gate)=>{const id=occurrence(...names),source=nodes(host).find(node=>node.dataset.kplexKeyboardId===occurrence(...names.slice(0,-1))),edge=[...root(host).querySelectorAll('[data-kplex-edge-id]')].find(element=>element.dataset.kplexEdgeId===id);check(source&&edge,'Native semantic route absent');const point=edge.getPointAtLength(0),screen=new edge.ownerDocument.defaultView.DOMPoint(point.x,point.y).matrixTransform(edge.getScreenCTM()),box=source.getBoundingClientRect();check(gate==='bottom'?Math.abs(screen.x-(box.left+box.width/2))<1&&screen.y>box.bottom:gate==='top'?Math.abs(screen.x-(box.left+box.width/2))<1&&screen.y<box.top:Math.abs(screen.y-(box.top+box.height/2))<1&&(gate==='left'?screen.x<box.left:screen.x>box.right),'Native connector left the wrong physical gate')};
   origin(['R','P'],'bottom');origin(['R','D'],'top');for(const peer of ['Left','Right','Prev','Next'])origin(['R',peer],'left');origin(['R','P','B'],'bottom');origin(['R','P','LeafPeer'],'right');origin(['R','Left','LeftChild'],'bottom');
   cases.push({id:'native-SVG-bottom-child-outward-peer-and-top-parent-origins'});
   cases.push({id:'trusted-primary-toggles-child-and-peer-context-without-editor-or-reroot'});
   await choose(host,'classic');p.notifyNavigation(path('S'),host);await until(()=>host.view.documentSession.centerPath===path('S'),'Compass destination absent');await choose(host,'mindmap');await until(()=>session(host).layoutRoot(path('S'))===path('S')&&nodes(host).length===1,'Selector restored stale root');
   root(host).querySelector('.kplex-filter-trigger').click();await until(()=>!panel(host),'Selector panel did not close');p.settings.pinnedNodes=[path('R')];await p.saveSettings(false,true);await until(()=>root(host).querySelector('[data-kplex-pinned-path]'),'Owned fixture pin absent');
   c.progress={...c.progress,phase:'trusted-fixture-pin'};await clickNative(()=>root(host).querySelector('[data-kplex-pinned-path]'));await until(()=>session(host).layoutRoot(path('R'))===path('R'),'Pin did not choose map root');
   c.progress={...c.progress,phase:'trusted-fixture-history'};await clickNative(()=>[...root(host).querySelectorAll('[data-kplex-history-path]')].find(element=>element.dataset.kplexHistoryPath===path('S')));await until(()=>session(host).layoutRoot(path('S'))===path('S'),'History did not choose map root');
   check(!session(host).editors.bindings.length,'Browse navigation opened an editor');cases.push({id:'native-selector-current-node-entry-and-pins-history-reroot'});
   await act(host,'view.layout-controls');const rail=root(host).querySelector('.kplex-layout-panel');check(rail,'Bottom-left layout controls absent');
   for(const [field,key]of [['horizontalDensity','graph.horizontalDensity'],['verticalDensity','graph.verticalDensity']]){
    const read=()=>[...rail.querySelectorAll('input[type=range]')].find(element=>element.getAttribute('aria-label')===p.translator(key)),before=Number(read()?.value);check(read(),'Mind Map density rail absent');await clickNative(read);
    await until(()=>p.settings.canvasViewSettings.mindmap?.values[field]!==undefined&&p.settings.canvasViewSettings.mindmap.values[field]!==before,'Live density did not commit');await p.settingsWriteQueue;
    const value=p.settings.canvasViewSettings.mindmap.values[field];check((await p.loadData()).canvasViewSettings.mindmap.values[field]===value&&Number(read().value)===value,'Live/native Settings density owner diverged');
    const input=read(),owner=input.ownerDocument.defaultView.require('@electron/remote').getCurrentWindow();check(Number(input.min)===0.1,'Spacious minimum missing from live rail');input.focus();check(input.ownerDocument.activeElement===input,'Density rail did not own native focus');for(const type of ['keyDown','keyUp'])owner.webContents.sendInputEvent({type,keyCode:'Home'});await until(()=>p.settings.canvasViewSettings.mindmap.values[field]===0.1,'Native Home did not select spacious minimum');await p.settingsWriteQueue;check((await p.loadData()).canvasViewSettings.mindmap.values[field]===0.1&&Number(read().value)===0.1,'Spacious density minimum was not durable');
   }
   check(session(host).layoutRoot(path('S'))===path('S')&&!session(host).editors.bindings.length,'Density changed navigation/editor state');cases.push({id:'trusted-bottom-left-density-rails-share-durable-type-settings'});
   // Use the existing genuine R/P/B/D/R cycle. Reciprocal parent/child declarations for one
   // pair are reconciled by the canonical owner and are not a substitute for this cycle.
   for(const field of ['horizontalDensity','verticalDensity'])await p.updateCanvasViewSetting('mindmap',field,1);
   if(root(host).querySelector('.kplex-layout-panel'))await act(host,'view.layout-controls');
   p.notifyNavigation(path('R'),host);session(host).setRoot(path('R'));await until(()=>host.view.documentSession.centerPath===path('R')&&nodes(host).some(element=>element.dataset.kplexKeyboardId==='root'&&element.dataset.kplexPath===path('R')),'Cycle root scene absent');
   // Expand each actual occurrence after its parent has rendered. Generation requests can
   // legitimately wait for frontier admission and must not be treated as synchronous batches.
   for(const lineage of [['R','P'],['R','P','B'],['R','P','B','D']]){
    const id=occurrence(...lineage),next=occurrence(...lineage,lineage.length===2?'B':lineage.length===3?'D':'R');
    await until(()=>nodes(host).some(element=>element.dataset.kplexKeyboardId===id),'Cycle branch occurrence absent');
    if(!nodes(host).some(element=>element.dataset.kplexKeyboardId===next)){await act(host,'view.fit');await wait(100);await clickNative(()=>nodes(host).find(element=>element.dataset.kplexKeyboardId===id));}
    await until(()=>nodes(host).some(element=>element.dataset.kplexKeyboardId===next),'Cycle branch did not expand');
   }
   const cycle=()=>nodes(host).find(element=>{try{const lineage=JSON.parse(element.dataset.kplexKeyboardId);return Array.isArray(lineage)&&lineage[0]===path('R')&&[path('P'),path('Q')].includes(lineage[1])&&lineage.at(-1)===path('R')&&element.textContent.includes(p.translator('mindmap.reference'))}catch{return false}});
   await until(cycle,'Genuine child-branch cycle reference absent');await act(host,'view.fit');await wait(100);await clickNative(cycle);
   await until(()=>p.actionManager.readSnapshot(surface(host))?.selected?.occurrenceId==='root'&&[...document.querySelectorAll('.notice')].some(element=>element.textContent===p.translator('mindmap.cycleReference')),'Cycle did not reveal its earlier occurrence with a Notice');
   check(session(host).layoutRoot(path('R'))===path('R')&&host.view.documentSession.centerPath===path('R'),'Cycle inspection changed root or attention');cases.push({id:'native-cycle-reference-reveals-earlier-occurrence-and-notice'});
  }else if(c.lane==='center-navigation'){
   p.notifyNavigation(path('R'),host);
   await until(()=>host.view.documentSession.centerPath===path('R'),'Initial center R absent');
   check((await act(host,'editor.expand',undefined,target('R','root'))).status==='completed','Root editor did not open');
   await until(()=>instance(host)?.view.editor&&session(host).editors.bindings[0]?.target.path===path('R'),'Native root editor absent');
   const oldLeaf=instance(host),editor=oldLeaf.view.editor,save=oldLeaf.view.save;
   const binding=session(host).editors.bindings[0],marker='Owned-center-navigation-'+Date.now();
   check((await act(host,'editor.resize',{bindingId:binding.id,width:620,height:400})).status==='completed','Root editor resize rejected');
   editor.replaceRange('\n'+marker+'\n',editor.getCursor('to'));
   check(!(await app.vault.read(files.find(file=>file.path===path('R')))).includes(marker),'Root buffer must be genuinely dirty');
   let rejected=0;oldLeaf.view.save=async()=>{rejected++;throw Error('Owned center navigation save rejection')};restores.push(()=>{oldLeaf.view.save=save});
   await act(host,'view.fit');
   await clickNative(()=>nodes(host).find(node=>node.dataset.kplexPath===path('P')));
   await until(()=>rejected>0&&!session(host).editors.bindings[0]?.closing,'Navigation save rejection did not settle');
   check(instance(host)===oldLeaf&&editor.getValue().includes(marker)&&session(host).layoutRoot(path('R'))===path('R')&&host.view.documentSession.centerPath===path('R'),'Failed navigation discarded or retargeted the dirty editor');
   cases.push({id:'center-navigation-save-failure-preserves-native-buffer-root-and-attention'});
   oldLeaf.view.save=save;
   await clickNative(()=>nodes(host).find(node=>node.dataset.kplexPath===path('P')));
   await until(()=>session(host).layoutRoot(path('P'))===path('P')&&host.view.documentSession.centerPath===path('P')&&session(host).editors.bindings[0]?.target.path===path('P')&&instance(host)?.view.file?.path===path('P'),'Clicked child did not become the native editor center');
   check((await app.vault.read(files.find(file=>file.path===path('R')))).includes(marker),'Center navigation lost unsaved source edits');
   const next=session(host).editors.bindings[0];
   check(next.mode==='source'&&next.dimensions.width===620&&next.dimensions.height===400&&next.id!==binding.id&&session(host).editors.bindings.length===1,'Center navigation lost mode, dimensions or capacity');
   cases.push({id:'trusted-node-click-saves-source-and-transfers-root-editor-mode-and-size'});
   const fold=()=>nodes(host).find(node=>node.dataset.kplexKeyboardId==='root')?.querySelector('.kplex-section-fold-handle');
   await clickNative(fold);await until(()=>!nodes(host).some(node=>node.dataset.kplexPath===path('B')),'Fold button did not hide children');
   check(session(host).editors.bindings[0]?.id===next.id&&instance(host)?.view.file?.path===path('P'),'Folding children changed the root editor');
   await clickNative(fold);await until(()=>nodes(host).some(node=>node.dataset.kplexPath===path('B')),'Unfold button did not restore children');
   const preview=()=>[...root(host).querySelectorAll('.kplex-central-editor-toolbar button')].find(button=>button.getAttribute('aria-label')===p.translator('centralEditor.showPreview')
    ||button.ownerDocument.getElementById(button.getAttribute('aria-labelledby'))?.textContent===p.translator('centralEditor.showPreview'));
   root(host).querySelector('.kplex-central-editor-content .cm-content')?.focus();
   await clickNative(preview);
   await until(()=>instance(host)?.view.getMode()==='preview','Native preview mode did not settle');
   await act(host,'view.fit');await clickNative(()=>nodes(host).find(node=>node.dataset.kplexPath===path('B')));
   await until(()=>session(host).layoutRoot(path('B'))===path('B')&&session(host).editors.bindings[0]?.target.path===path('B')&&instance(host)?.view.file?.path===path('B'),'Preview editor did not follow the clicked center');
   check(session(host).editors.bindings[0].mode==='preview','Preview intent was lost during recentering: '+JSON.stringify({mode:session(host).editors.bindings[0].mode,native:instance(host).view.getMode()}));
   await until(()=>instance(host)?.view.getMode()==='preview'&&!root(host).querySelector('.kplex-central-editor-status'),'New native preview host did not finish opening');
   cases.push({id:'fold-controls-preserve-root-editor-and-next-center-preserves-preview-mode'});
   await act(host,'editor.collapse',{bindingId:session(host).editors.bindings[0].id});
   session(host).setRoot(path('R'));p.notifyNavigation(path('R'),host);
   await until(()=>nodes(host).some(node=>node.dataset.kplexKeyboardId==='root'&&node.dataset.kplexPath===path('R')),'Onward fixture root absent');
   check((await act(host,'editor.expand',undefined,target('R','root'))).status==='completed','Onward root editor did not open');
   await until(()=>instance(host)?.view.editor&&session(host).editors.bindings[0]?.target.path===path('R'),'Onward native root editor absent');
   const onward=session(host).editors.bindings[0];
   await act(host,'editor.resize',{bindingId:onward.id,width:640,height:380});
   root(host).querySelector('.kplex-central-editor-content .cm-content')?.focus();await clickNative(preview);
   await until(()=>instance(host)?.view.getMode()==='preview','Onward native preview mode did not settle');
   const sourceLeaf=instance(host),sourceSave=sourceLeaf.view.save;let sourceSaves=0;
   sourceLeaf.view.save=function(...args){sourceSaves++;return sourceSave.apply(this,args)};restores.push(()=>{sourceLeaf.view.save=sourceSave});
   const capture=p.index.captureSemanticGateRead;
   p.index.captureSemanticGateRead=function(...args){const proof=capture.apply(this,args);return session(host).layoutRoot(path('R'))===path('P')?{...proof,isCurrent:()=>false}:proof};
   restores.push(()=>{p.index.captureSemanticGateRead=capture});
   await act(host,'view.fit');await clickNative(()=>nodes(host).find(node=>node.dataset.kplexPath===path('P')));
   await until(()=>session(host).layoutRoot(path('P'))===path('P')&&host.view.documentSession.centerPath===path('P')&&!session(host).editors.bindings.length&&root(host).querySelector('.kplex-view-error'),'Expected delayed P scene without an admitted editor');
   const savesAfterClose=sourceSaves,search=root(host).querySelector('input.kplex-search');
   search.focus();search.select();await until(()=>search.ownerDocument.activeElement===search,'Onward search did not focus');
   await win.webContents.insertText(path('C'));
   const onwardResult=()=>[...search.ownerDocument.querySelectorAll('.kplex-search-result')].find(element=>element.textContent.includes(path('C')));
   await until(onwardResult,'Onward C search result absent');await clickNative(onwardResult);
   await until(()=>session(host).layoutRoot(path('C'))===path('C')&&host.view.documentSession.centerPath===path('C')&&session(host).editors.bindings[0]?.target.path===path('C')&&instance(host)?.view.file?.path===path('C')&&instance(host)?.view.getMode()==='preview'&&!root(host).querySelector('.kplex-central-editor-status'),'Onward C did not receive the saved editor intent');
   check(session(host).editors.bindings[0].dimensions.width===640&&session(host).editors.bindings[0].dimensions.height===380&&sourceSaves===savesAfterClose,'Onward handoff changed size or saved the original host again');
   p.index.captureSemanticGateRead=capture;sourceLeaf.view.save=sourceSave;
   cases.push({id:'delayed-root-onward-search-retains-native-editor-mode-size-and-save-ownership'});
   await act(host,'editor.collapse',{bindingId:session(host).editors.bindings[0].id});
  }else if(c.lane==='interactions'){
   await c.acceptInteractions({app,p,c,host,hosts,restores,path,root,session,nodes,act,check,wait,until,clickNative,cases,instance});
  }else if(c.lane==='editor'){
   c.progress={phase:'canonical-branches',cases};
   for(let i=0;i<3;i++)check((await act(host,'branches.expand-generation')).status==='completed','Generation expansion rejected');
   await until(()=>nodes(host).length===11,'Diamond/cycle hierarchy and root parent absent');
   const copies=nodes(host).filter(node=>node.dataset.kplexPath===path('B')),references=nodes(host).filter(node=>node.dataset.kplexPath===path('R')&&node.dataset.kplexKeyboardId!=='root');
   check(copies.length===2&&copies[0].dataset.kplexKeyboardId!==copies[1].dataset.kplexKeyboardId&&references.length===3,'Canonical duplicates/cycles lost occurrence identity');
   check(references.every(node=>node.querySelector('.kplex-node-status')?.textContent===p.translator('mindmap.reference')&&!node.querySelector('.kplex-section-fold-handle')),'Cycles did not terminate as references');
   cases.push({id:'production-diamond-and-terminal-cycle-references'});
   const find=root(host).querySelector('.kplex-find');find.querySelector('button').click();await until(()=>find.querySelector('input'),'Find input absent');const input=find.querySelector('input');Object.getOwnPropertyDescriptor(input.ownerDocument.defaultView.HTMLInputElement.prototype,'value').set.call(input,'B');input.dispatchEvent(new input.ownerDocument.defaultView.Event('input',{bubbles:true}));
   await until(()=>p.actionManager.readSnapshot(surface(host))?.selected?.node.identity===path('B'),'Find did not select B');
   check(!session(host).editors.bindings.length&&host.view.documentSession.centerPath===path('A')&&session(host).layoutRoot(path('A'))===path('R'),'Find opened an editor or rerooted');
   cases.push({id:'find-selects-exact-occurrence-without-activation-or-editor'});find.querySelector('button[aria-label="'+p.translator('find.close')+'"]').click();await until(()=>!find.querySelector('input'),'Find did not dismiss');
   await until(()=>!root(host).querySelector('.kplex-view-error')&&['R','P','Q','B','D'].every(name=>{const scope=p.index.viewScopeCoverage(path(name));return scope.prepared&&!scope.pending}),'Find dismissal frontiers did not settle');
   await act(host,'view.fit');const B1=occurrence('R','P','B'),B2=occurrence('R','Q','B'),camera=root(host).querySelector('.kplex-camera').style.transform;
   await clickNative(()=>nodes(host).find(node=>node.dataset.kplexKeyboardId===B1));check(!session(host).editors.bindings.length,'Branch click opened an editor');
   await clickNative(()=>nodes(host).find(node=>node.dataset.kplexKeyboardId===B1));await until(()=>nodes(host).length===11,'Reopening B1 after primary fold did not restore descendants');
   await clickNative(()=>nodes(host).find(node=>node.dataset.kplexKeyboardId===B1)?.querySelector('.kplex-thought-corner-action'));await until(()=>session(host).editors.bindings[0]?.occurrenceId===B1&&instance(host)?.view.editor,'Explicit editor control did not open native B1');
   const leaf=instance(host),editor=leaf.view.editor,binding=session(host).editors.bindings[0],content=root(host).querySelector('.kplex-central-editor-content');
   check(leaf.view.file===files.find(file=>file.path===path('B'))&&host.view.documentSession.centerPath===path('A')&&session(host).layoutRoot(path('A'))===path('R'),'Explicit editor control retargeted root/attention/document');
   check(!nodes(host).find(node=>node.dataset.kplexKeyboardId===B2).querySelector('.kplex-central-editor-placeholder'),'B2 expanded with B1');
   check(root(host).querySelector('.kplex-camera').style.transform===camera,'Primary editor expansion changed camera');
   const capacity=await act(host,'editor.expand',undefined,target('B',B2));check(capacity.status==='unavailable'&&capacity.reasonKey==='actions.editor-capacity','Second occurrence replaced editor');
   p.notifyNavigation(path('C'),host);await until(()=>host.view.documentSession.centerPath===path('C'),'Attention C absent');check(instance(host)===leaf&&leaf.view.editor===editor&&session(host).layoutRoot(path('C'))===path('R'),'Attention retargeted native editor or root');
   cases.push({id:'trusted-explicit-B1-editor-retains-root-through-attention-C',capacity:1});
   c.progress={...c.progress,phase:'settle-attention-frontiers'};
   await until(()=>!root(host).querySelector('.kplex-view-error')&&nodes(host).some(node=>node.dataset.kplexKeyboardId===B1)&&['R','P','Q','B','D'].every(name=>{const scope=p.index.viewScopeCoverage(path(name));return scope.prepared&&!scope.pending}),'Current attention/root/editor frontiers did not settle');
   check(root(host).querySelector('.kplex-camera').style.transform===camera,'Attention changed the explicit fitted camera');
   await act(host,'view.pan.right');await act(host,'view.zoom-out');
   const marker='Kplex-219-Mindmap-dirty';content.querySelector('.cm-content').focus();const endLines=editor.getValue().split('\n');editor.replaceRange('\n'+marker+'\n',{line:endLines.length-1,ch:endLines[endLines.length-1].length});const line=editor.getValue().split('\n').findIndex(value=>value.includes(marker));editor.setSelection({line,ch:1},{line,ch:5});
   const dirty=editor.getValue(),selection=JSON.stringify(editor.listSelections()),manualCamera=root(host).querySelector('.kplex-camera').style.transform;check(!(await app.vault.read(leaf.view.file)).includes(marker),'Genuinely dirty editor required');
   c.progress={...c.progress,phase:'dirty-editor-admission'};
   await until(()=>!root(host).querySelector('.kplex-view-error')&&nodes(host).some(node=>node.dataset.kplexKeyboardId===B1)&&['R','P','Q','B','D'].every(name=>{const scope=p.index.viewScopeCoverage(path(name));return scope.prepared&&!scope.pending}),'Dirty editor frontiers did not settle');
   check(!(await app.vault.read(leaf.view.file)).includes(marker),'Dirty editor autosaved before geometry proof');
   check((await act(host,'editor.resize',{bindingId:binding.id,width:660,height:410})).status==='completed','Editor resize rejected');await p.updateCanvasViewSetting('mindmap','horizontalSpacing',200);await p.updateCanvasViewSetting('mindmap','verticalSpacing',60);await p.updateCanvasViewSetting('mindmap','horizontalDensity',0.2);await p.updateCanvasViewSetting('mindmap','verticalDensity',0.1);await wait(100);
   check(instance(host)===leaf&&leaf.view.editor===editor&&root(host).querySelector('.kplex-central-editor-content')===content&&editor.getValue()===dirty&&JSON.stringify(editor.listSelections())===selection&&content.contains(content.ownerDocument.activeElement),'Reflow lost native editing state/focus');
   check(root(host).querySelector('.kplex-camera').style.transform===manualCamera&&session(host).layoutRoot(path('C'))===path('R'),'Geometry changed manual camera or root');
   const rects=nodes(host).map(node=>node.getBoundingClientRect());for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];check(a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1,'Measured expanded nodes overlap')}
   const anchor=nodes(host).find(node=>node.dataset.kplexKeyboardId===B1).getBoundingClientRect(),box=root(host).querySelector('.kplex-central-editor-overlay').getBoundingClientRect();check(['left','top','width','height'].every(key=>Math.abs(anchor[key]-box[key])<1),'Native editor anchor/geometry mismatch');
   cases.push({id:'dirty-native-resize-type-reflow-focus-and-nonoverlap'});
   await openPanel(host);const filter=panel(host).querySelector('.kplex-quick-lens-row input');Object.getOwnPropertyDescriptor(filter.ownerDocument.defaultView.HTMLInputElement.prototype,'value').set.call(filter,'Kplex-219-no-match');filter.dispatchEvent(new filter.ownerDocument.defaultView.Event('input',{bubbles:true}));await wait(100);
   check(instance(host)===leaf&&nodes(host).some(node=>node.dataset.kplexKeyboardId===B1)&&!nodes(host).some(node=>node.dataset.kplexKeyboardId===B2),'Filter did not pin only the exact editor ancestry');
   const folded=await act(host,'branch.toggle',undefined,target('P',occurrence('R','P')));check(folded.status==='unavailable'&&folded.reasonKey==='actions.branch-editor-blocked'&&instance(host)===leaf,'Ancestor fold removed live editor');
   const reroot=await act(host,'view.root.selected',undefined,target('C'));check(reroot.status==='unavailable'&&session(host).layoutRoot(path('C'))===path('R'),'Reroot implicitly removed editor');
   await choose(host,'classic');check(session(host).definition.id==='mindmap'&&selector(host).value==='mindmap'&&panel(host).querySelector('[role=status]'),'Blocked selector appeared selected');
   panel(host).querySelector('.kplex-filter-clear').click();root(host).querySelector('.kplex-filter-trigger').click();cases.push({id:'exact-filter-pin-branch-root-and-selector-save-guards'});
   workspace.moveLeafToPopout(host);await until(()=>root(host).ownerDocument!==document&&instance(host)?.view.editor?.getValue().includes(marker),'Dirty native popout migration lost B');await host.view.waitUntilReady();
   check(session(host).layoutRoot(path('C'))===path('R')&&instance(host).view.file.path===path('B'),'Popout retargeted binding/root');
   const parents=[];workspace.iterateRootLeaves(candidate=>{if(candidate!==host&&candidate.view.containerEl.ownerDocument===document&&candidate.view.containerEl.isConnected)parents.push(candidate.parent)});check(parents.length,'Main native parent absent');host.parent.removeChild(host);parents[0].insertChild(parents[0].children.length,host);await workspace.revealLeaf(host);await host.view.waitUntilReady();
   await until(()=>root(host).ownerDocument===document&&instance(host)?.view.editor?.getValue().includes(marker),'Main migration lost B');check((await act(host,'editor.collapse',{bindingId:session(host).editors.bindings[0].id})).status==='completed','Native durable close rejected');
   check((await app.vault.read(files.find(file=>file.path===path('B')))).includes(marker)&&!session(host).editors.bindings.length,'Native close lost edits or retained owner');cases.push({id:'dirty-popout-main-migration-and-durable-collapse'});
   const saved=host.getViewState();await host.setViewState({type:'empty'});await host.setViewState(saved);await host.view.waitUntilReady();await until(()=>session(host).definition.id==='mindmap'&&nodes(host).some(node=>node.dataset.kplexKeyboardId===B1),'Root/folds did not restore');check(session(host).layoutRoot(path('C'))===path('R'),'Restoration followed attention');cases.push({id:'production-root-fold-restoration',applicationRestart:false});
   const rootChoice=[...root(host).querySelectorAll('button[aria-label]')].find(element=>element.getAttribute('aria-label')===p.translator('mindmap.useAttentionRoot'));check(rootChoice,'Explicit outside-attention root control absent');await clickNative(()=>[...root(host).querySelectorAll('button[aria-label]')].find(element=>element.getAttribute('aria-label')===p.translator('mindmap.useAttentionRoot')));await until(()=>session(host).layoutRoot(path('C'))===path('C')&&nodes(host).length===1&&!root(host).querySelector('.kplex-view-error'),'Explicit current-note reroot failed');check(host.view.documentSession.centerPath===path('C'),'Reroot changed attention');cases.push({id:'trusted-explicit-root-from-outside-current-map'});
  }else{
   c.progress={phase:'independent-native-sessions',cases};const other=workspace.getLeaf('tab');hosts.push(other);await other.setViewState({type:'k-plex-react-view',active:true});await other.view.waitUntilReady();other.view.centerPresentation.update({embedCentralNode:false});p.notifyNavigation(path('S'),other);await until(()=>other.view.documentSession.centerPath===path('S'),'Second attention absent');workspace.moveLeafToPopout(other);await until(()=>root(other).ownerDocument!==document,'Actual second popout absent');await other.view.waitUntilReady();
   await workspace.revealLeaf(other);await until(()=>p.documentSession(other)===other.view.documentSession&&!other.view.documentSession.disposed&&root(other).getBoundingClientRect().width>100,'Popout native owner not ready');
   await workspace.revealLeaf(host);await until(()=>{const page=p.index.get(path('A')),scope=p.index.viewScopeCoverage(path('A'));return page?.file===files.find(file=>file.path===path('A'))&&scope.prepared&&!scope.pending},'Main canonical file not prepared');
   await p.openSidecar(host,p.index.get(path('A')));const companion=p.sidecarLeaves.get(host);check(companion,'Owned main Sidecar absent');await companion.loadIfDeferred();await until(()=>companion.view.file?.path===path('A'),'Owned main Sidecar file absent');
   await openPanel(host);await openPanel(other);const firstPanel=panel(host),secondPanel=panel(other),before={root:session(host).layoutRoot(path('A')),camera:root(host).querySelector('.kplex-camera').style.transform,attention:host.view.documentSession.centerPath};
   const newLens=[...firstPanel.querySelectorAll('button[aria-label]')].find(element=>element.getAttribute('aria-label')===p.translator('filter.newLens'));check(newLens,'New lens control absent');newLens.click();await until(()=>firstPanel.querySelector('.kplex-lens-editor input'),'Native lens draft absent');
   const draftName=firstPanel.querySelector('.kplex-lens-editor input');Object.getOwnPropertyDescriptor(draftName.ownerDocument.defaultView.HTMLInputElement.prototype,'value').set.call(draftName,'Owned unsaved Mind Map draft');draftName.dispatchEvent(new draftName.ownerDocument.defaultView.Event('input',{bubbles:true}));const retainedLenses=JSON.stringify(p.settings.graphLenses),retainedHistory=JSON.stringify(p.settings.navigationHistory),retainedFilter=firstPanel.querySelector('.kplex-quick-lens-row input')?.value;
   await workspace.revealLeaf(other);await choose(host,'classic');check(session(other).definition.id==='classic'&&other.view.documentSession.centerPath===path('S'),'Main switch changed popout');const compassCamera=root(host).querySelector('.kplex-camera').style.transform;
   await workspace.revealLeaf(host);await choose(other,'mindmap');await until(()=>nodes(other).some(node=>node.dataset.kplexPath===path('S'))&&!root(other).querySelector('.kplex-view-error'),'Popout Mind Map absent');check(session(host).definition.id==='classic'&&root(host).querySelector('.kplex-camera').style.transform===compassCamera&&host.view.documentSession.centerPath===before.attention,'Other focus changed main view/camera/attention');await choose(host,'mindmap');
   check(panel(host)===firstPanel&&panel(other)===secondPanel,'Compatible switch remounted shared panel');check(session(host).layoutRoot(path('A'))===path('A')&&host.view.documentSession.centerPath===before.attention,'Explicit Mind Map entry did not capture its own current note');
   check(draftName.isConnected&&draftName.value==='Owned unsaved Mind Map draft'&&JSON.stringify(p.settings.graphLenses)===retainedLenses&&JSON.stringify(p.settings.navigationHistory)===retainedHistory&&firstPanel.querySelector('.kplex-quick-lens-row input')?.value===retainedFilter,'Production switch discarded draft or changed lenses/history/filter');
   check(session(other).layoutRoot(path('S'))===path('S')&&selector(host).value==='mindmap'&&selector(other).value==='mindmap','Owning session choice/root mismatch');
   await choose(other,'classic');check(selector(host).value==='mindmap'&&session(host).layoutRoot(path('A'))===path('A'),'Popout switch changed main');check(p.sidecarLeaves.get(host)===companion&&companion.view.file?.path===path('A')&&!p.sidecarLeaves.get(other),'Selection redirected another canvas Sidecar');cases.push({id:'production-Compass-Mindmap-independent-main-popout-panels-roots-and-Sidecar',entryRoot:'own-current-note'});
   firstPanel.querySelector('.kplex-lens-editor-actions button').click();
   await p.closeSidecar(host);
   const saved=[host,other].map(leaf=>({leaf,state:structuredClone(leaf.getViewState()),view:session(leaf).definition.id,root:session(leaf).layoutRoot(leaf.view.documentSession.centerPath),attention:leaf.view.documentSession.centerPath}));
   for(const value of saved){await value.leaf.setViewState({type:'empty'});await value.leaf.setViewState(value.state);await value.leaf.view.waitUntilReady();await until(()=>session(value.leaf).definition.id===value.view&&nodes(value.leaf).length,'Independent owned view did not restore');check(session(value.leaf).layoutRoot(value.attention)===value.root&&value.leaf.view.documentSession.centerPath===value.attention,'Restoration changed root/attention');await openPanel(value.leaf);check(selector(value.leaf).value===value.view,'Restored dropdown does not match actual view')}
   cases.push({id:'production-independent-native-view-restoration',applicationRestart:false});
  }
  c.progress={phase:'complete',cases};return{lane:c.lane,cases,capacity:1,limits:['Native Electron automation; no physical Windows/mobile proof.','Owned native-view restoration is not whole-application restart.','Dedicated M0 FileManager cache-gate limitation remains unproven; no FileManager pass claimed.','Session acceptance preserves a main-window Sidecar; separate fresh-popout Sidecar creation remained empty and is not a passing workflow.']};
 }catch(error){failure=error;c.progress={...c.progress,diagnostic:{preparation:p.index.getSemanticPreparationDiagnostics(),pending:p.index.hasPendingSemanticPreparation(),active:p.index.hasActiveSemanticPreparation(),hosts:hosts.length,files:files.length,ownedReadiness:files.map(file=>({name:file.basename,metadata:!!app.metadataCache.getFileCache(file),canonical:p.index.get(file.path)?.file===file,scope:p.index.viewScopeCoverage(file.path)})),views:hosts.map(host=>({attention:host.view.documentSession?.centerPath,root:host.view.documentSession?.plexView?.layoutRoot(host.view.documentSession.centerPath),sidecar:!!p.sidecarLeaves.get(host),sidecarState:p.sidecarLeaves.get(host)?.getViewState(),nativeOwner:p.documentSession(host)===host.view.documentSession,disposed:host.view.documentSession?.disposed,bindings:host.view.documentSession?.plexView?.editors.bindings.map(binding=>({id:binding.id,occurrence:binding.occurrenceId,closing:binding.closing})),failure:root(host)?.querySelector('.kplex-view-error')?.textContent,status:root(host)?.querySelector('.kplex-central-editor-status')?.textContent})),modals:[...document.querySelectorAll('.modal-container')].filter(element=>element.getBoundingClientRect().width).map(element=>element.className)}};throw error}
 finally{
  const errors=[];/** Cleanup does not depend on a live assertion controller and attempts every owned resource. */
  const clean=async(label,action)=>{try{await action();cleanup.push({label,status:'passed'})}catch(error){errors.push(label+': '+String(error));cleanup.push({label,status:'failed'})}c.progress={...c.progress,cleanup}};
  for(const restore of restores.reverse())await clean('restore-native-wrapper',restore);
  for(const host of hosts.reverse())await clean('close-owned-host',async()=>{if(workspace.getLeafById(host.id)===host){await p.closeSidecar(host);host.detach()}});
  for(const release of releases.reverse())await clean('release-demand',release);
  p.settings=original;await clean('restore-live-settings',()=>p.saveSettings(false,false));p.savedSettingsPolicy=policy;
  await clean('restore-workspace',()=>workspace.changeLayout(layout));await clean('restore-native-document-sessions',()=>sessions.restore(owners));await new Promise(resolve=>window.setTimeout(resolve,500));
  for(const file of files.reverse())if(app.vault.getFileByPath(file.path)===file)await clean('delete-owned-file',()=>app.vault.delete(file,true));
  if(createdFolder&&app.vault.getFolderByPath(folder)===createdFolder&&!createdFolder.children.length)await clean('delete-owned-folder',()=>app.vault.delete(createdFolder,true));
  await clean('drain-settings',()=>p.settingsWriteQueue);await clean('restore-settings-bytes',()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
  if(challengers)await clean('restore-enablement-bytes',()=>app.vault.adapter.write(app.vault.configDir+'/community-plugins.json',c.originalEnabled));
  if(errors.length)throw Error((failure?String(failure)+'; ':'')+errors.join('; '));
 }
}

if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit Small required');
const lane=process.env.KPLEX_MINDMAP_LANE??'editor';if(!['editor','sessions','navigation','interactions','center-navigation','challengers'].includes(lane))throw Error('Expected editor, sessions, navigation, interactions, center-navigation or challengers lane');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const definitions='c.nativeDragOnly='+JSON.stringify(process.env.KPLEX_MINDMAP_DRAG_ONLY==='true')+';c.prepareViewport='+JSON.stringify(process.env.KPLEX_NATIVE_MAIN_VIEWPORT==='true')+';c.lane='+JSON.stringify(lane)+';c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.documentSessions=('+nativeDocumentSessions.toString()+');c.acceptInteractions=('+acceptMindMapInteractions.toString()+');c.htmlDrag=('+nativeHtmlDrag.toString()+');c.acceptNativeDrag=('+acceptNativeOccurrenceDrag.toString()+');';
const enablement=lane==='challengers'?'c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';':'';
await runControlledProbe('mindmap-219-'+lane,scenario,definitions+enablement,['src/main.ts','src/application/PlexHierarchyDemand.ts','src/application/PlexViewSession.ts','src/ui/App.tsx','src/ui/NewRelatedNoteModal.ts','src/ui/KplexDocumentSession.ts','src/core/plex/views/contracts.ts','src/core/plex/views/registry.ts','src/core/plex/views/mindmap/configuration.ts','src/ui/plexViews/settingsContributions.ts','src/ui/plexViews/measurement.ts','src/types.ts','src/ui/PlexGraph.tsx','src/ui/ThoughtNode.tsx','src/ui/plexViews/prepareScene.ts','src/ui/plexViews/useHierarchyDemand.ts','src/core/plex/views/mindmap/definition.ts','src/core/plex/views/mindmap/projection.ts','src/core/plex/views/mindmap/layout.ts','src/ui/plexViews/mindmap/settings.ts','scripts/testing/obsidian/mindMap.mjs','scripts/testing/obsidian/mindMapInteractions.mjs','scripts/testing/obsidian/nativeHtmlDrag.mjs','scripts/testing/obsidian/nativeOccurrenceDrag.mjs','src/core/plex/views/areaLayout.ts','src/ui/plexViews/crossLinks.ts','src/ui/plexViews/reflowArea.ts','src/adapters/obsidian/nodeLinkDrag.ts','scripts/testing/obsidian/nativeDocumentSessions.mjs'],{maximumMs:240000});
