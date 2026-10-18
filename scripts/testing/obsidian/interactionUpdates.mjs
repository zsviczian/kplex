/**
 * Serial exact-build acceptance for Plex drag/drop, area modifiers and native File properties.
 * Owns a bounded synthetic folder and native leaves; restores configuration, workspace and window
 * geometry independently of assertions. Trusted Electron mouse input is desktop acceptance only.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {obsidianCliExecutable,spawnNativeSync} from './processTools.mjs';
import {validateTarget} from './runner.mjs';
import {acceptSimplifiedLayout} from './interactionSimplifiedLayout.mjs';
import {acceptNativeDragEnhancements} from './interactionNativeDragEnhancements.mjs';
import {nativeHtmlDrag} from './nativeHtmlDrag.mjs';
const root=fileURLToPath(new URL('../../..',import.meta.url)),vaultName=process.env.KPLEX_TEST_VAULT_NAME;
const scenario=process.env.KPLEX_NATIVE_INTERACTION_SCENARIO??'legacy';
assert(['legacy','layout','native-drag','navigation-enhancements'].includes(scenario),'Unknown native interaction scenario');
assert.equal(vaultName,'kplex-test-small');
const target=validateTarget({vaultName,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const output=process.env.KPLEX_HOST_REPORT_DIR;
assert(output&&(!existsSync(output)||!readdirSync(output).length),'Use a fresh report directory');mkdirSync(output,{recursive:true});
/** Use explicit native arguments and bounded long-eval transport, without a shell. */
function cli(command,...args){const r=spawnNativeSync(obsidianCliExecutable(),[`vault=${vaultName}`,command,...args],{cwd:root,encoding:'utf8',timeout:30000,killSignal:'SIGKILL',maxBuffer:4*1024*1024});if(r.error||r.status!==0||/^Error:/m.test(r.stdout))throw r.error??Error(r.stderr||r.stdout);return r.stdout.trim()}
/** Only finite JSON receipts leave the renderer. */
function evaluate(code){return JSON.parse(cli('eval','code='+code).replace(/^=>\s*/,''))}
assert.equal(cli('vault','info=path'),target.vault);
const backups=['plugins/k-plex/data.json','community-plugins.json','workspace.json','appearance.json'].filter(name=>existsSync(join(target.config,name))).map(name=>({name,bytes:readFileSync(join(target.config,name))}));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const artifacts=Object.fromEntries(['main.js','styles.css','manifest.json'].map(name=>{const bytes=readFileSync(join(root,'dist',name));assert(bytes.equals(readFileSync(join(target.pluginDir,name))),'Stale installed '+name);return[name,hash(bytes)]}));

/** Keep actual native controls and trusted pointer input inside their owning renderer. */
function start(scenario='legacy',layoutAcceptance,nativeDragAcceptance,htmlDrag){
 const p=app.plugins.plugins['k-plex'],remote=require('@electron/remote'),win=remote.getCurrentWindow();
 if(['__kplexInteractionUpdates','__kplexHoverProbe','__kplexInteractionTouch','__kplexInteractionGateProbe','__kplexActionWorkflows','__kplexActionDevice','__kplexDisplayModesProbe'].some(name=>window[name])||app.setting.isOpen||app.dragManager.draggable)throw Error('Clean native prerequisites required');
 const c=window.__kplexInteractionUpdates={settings:structuredClone(p.settings),policy:p.savedSettingsPolicy,layout:app.workspace.getLayout(),owners:{linked:p.linkedDocumentLeaf,last:p.lastDocumentLeaf,recent:[...p.recentLeafHistory],sidecars:[...p.sidecarLeaves]},bounds:win.getBounds(),minimum:win.getMinimumSize(),inventory:app.vault.getFiles().map(f=>f.path).sort(),files:[],leaves:[],releases:[],restores:[],cases:[],done:false,folder:'Kplex-Interaction-Updates-'+Date.now()};
 const check=(ok,message)=>{if(!ok)throw Error(message)},wait=ms=>new Promise(r=>window.setTimeout(r,ms));
 const until=async(fn,message)=>{const end=Date.now()+90000;while(!fn()){check(!c.cancelled&&Date.now()<end,message);await wait(50)}};
 const frames=()=>new Promise(r=>window.requestAnimationFrame(()=>window.requestAnimationFrame(r)));
 const path=name=>c.folder+'/'+name+'.md',root=()=>c.leaf.view.contentEl;
 /** Focus once per owning window, without changing background-throttling policy. */
 const native=leaf=>{const doc=leaf.view.contentEl.ownerDocument,w=doc.defaultView,r=w.require('@electron/remote'),n=r.getCurrentWindow();if(!n.isFocused()||!doc.hasFocus()){r.app.show?.();r.app.focus({steal:true});n.restore();n.show();n.focus();n.webContents.focus()}return n};
 const center=el=>{const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}};
 const input=(type,point,modifiers=[])=>native(c.leaf).webContents.sendInputEvent({type,x:Math.round(point.x),y:Math.round(point.y),button:'left',clickCount:1,modifiers});
 const key=down=>native(c.leaf).webContents.sendInputEvent({type:down?'keyDown':'keyUp',keyCode:'Alt',modifiers:down?['alt']:[]});
 /** Navigate only after the actual React subscription is registered. */
 const navigate=async(name,leaf=c.leaf)=>{app.workspace.setActiveLeaf(leaf,{focus:true});p.notifyNavigation(path(name));await until(()=>leaf.view.contentEl.querySelector('.kplex-role-center')?.dataset.kplexPath===path(name),'Center '+name+' absent');await frames()};
 /** Toggle actual declarative Settings, checking the existing durable writer. */
 const toggle=async(enabled)=>{
  p.openSettings();await until(()=>p.settingsTab.containerEl.isConnected,'Settings absent');
  check(p.settingsTab.openSettingsPage(p.translator('settings.ui.plex.behavior')),'Behavior page absent');
  const doc=p.settingsTab.containerEl.ownerDocument;
  await until(()=>[...doc.querySelectorAll('.setting-item-name')].some(e=>e.getClientRects().length&&e.textContent===p.translator('settings.areaOutline.name')),'Area preference absent');
  const row=[...doc.querySelectorAll('.setting-item-name')].find(e=>e.getClientRects().length&&e.textContent===p.translator('settings.areaOutline.name')).closest('.setting-item');
  if(p.settings.areaOutlineRequiresAlt!==enabled)row.querySelector('.checkbox-container').click();
  await until(()=>p.settings.areaOutlineRequiresAlt===enabled,'Area toggle did not save');await p.settingsWriteQueue;
  check((await p.loadData()).areaOutlineRequiresAlt===enabled,'Area toggle not durable');app.setting.close();await wait(150);
 };
 /** Use the existing Settings menu action to expose geometry, never a copied area resolver. */
 const areaMode=async()=>{
  root().querySelector('button[aria-label="'+p.translator('app.settingsMenu')+'"]').click();await frames();
  const item=[...root().ownerDocument.querySelectorAll('.menu-item')].find(e=>e.textContent.includes(p.translator('app.areaSettings')));check(item,'Area menu absent');item.click();await frames();
 };
 /** Choose actual empty canvas within a displayed native area frame. */
 const emptyPoint=(rect)=>{
  const doc=root().ownerDocument,v=root().querySelector('.kplex-plex').getBoundingClientRect();
  for(let y=Math.max(rect.top+15,v.top+15);y<Math.min(rect.bottom-15,v.bottom-15);y+=15)for(let x=Math.max(rect.left+15,v.left+15);x<Math.min(rect.right-15,v.right-15);x+=15){const e=doc.elementFromPoint(x,y);if(e&&root().contains(e)&&!e.closest('.kplex-thought,.kplex-edge-hit,button,input,select,.kplex-zone-tools,.kplex-area-frame,.kplex-layout-controls'))return{x,y}}
  throw Error('No exposed empty area');
 };
 const captureAreas=async()=>{await areaMode();check(root().querySelectorAll('.kplex-area-frame').length>=4,'Area mode did not show frames');const result=Object.fromEntries(['parent','child','left','right'].map(zone=>[zone,root().querySelector('.kplex-area-frame.kplex-area-'+zone).getBoundingClientRect().toJSON()]));await areaMode();return result};
 /** Trusted pointer sequence, preserving mouse-button state between native events. */
 const drag=async(from,to,release=true)=>{const hit=root().ownerDocument.elementFromPoint(from.x,from.y);if(release&&hit?.closest('.kplex-thought[draggable="true"]')&&!hit.closest('[data-kplex-gate]')){const receipt=await htmlDrag({contents:native(c.leaf).webContents,from,to,input,wait,until});await frames();return receipt}input('mouseMove',from);await wait(80);input('mouseDown',from);await wait(80);input('mouseMove',to,['leftButtonDown']);await wait(180);if(release){input('mouseUp',to);await frames()}};
 /** Confirm the existing composer through its real primary button. */
 const confirm=async()=>{await until(()=>root().ownerDocument.querySelector('[data-kplex-primary-action="true"]'),'Composer absent');const button=root().ownerDocument.querySelector('[data-kplex-primary-action="true"]');check(!button.disabled,'Composer primary disabled');button.click();await until(()=>!button.isConnected,'Composer did not close')};
 c.task=(async()=>{
  try{
   await until(()=>!p.isStartupInitializing(),'Startup did not settle');await app.vault.createFolder(c.folder);c.folderCreated=true;
   const make=async(name,body='')=>{const f=await app.vault.create(path(name),body);c.files.push(f.path);return f};
   await make('A drop target');await make('Parent');await make('Center','---\nParent: "[['+c.folder+'/Parent]]"\nFriend: "[['+c.folder+'/Friend]]"\nChallenger: "[['+c.folder+'/Challenger]]"\nChild: "[['+c.folder+'/Ghost]]"\n---\n');
   await make('Friend');await make('Challenger');
   for(const role of ['parent','child','left','right'])await make('Sibling '+role,'---\nParent: "[['+c.folder+'/Parent]]"\n---\n');
   for(let i=0;i<32;i++)await make('Child '+String(i).padStart(2,'0'),'---\nParent: "[['+c.folder+'/Center]]"\n---\n');
   await until(()=>c.files.every(name=>app.metadataCache.getFileCache(app.vault.getFileByPath(name))),'Fixture metadata absent');
   Object.assign(p.settings,{embedCentralNode:false,documentSyncMode:'off',followActiveFile:false,autoOpenCentralDocument:false,animationSpeed:0,graphDepth:1,childMaxHeight:200,childColumns:3,renderSiblings:true,renderAlias:false,graphLenses:[],showVirtualNodes:true,hoverHighlightRequiresAlt:true,areaOutlineRequiresAlt:true,lastActivePath:path('Center'),navigationHistory:[path('Center')]});
   p.settings.hierarchy={...p.settings.hierarchy,parents:['Parent'],children:['Child'],leftFriends:['Friend'],rightFriends:['Challenger']};await p.saveSettings(true,false);
   for(const name of c.files)p.index.insertCreatedFile(app.vault.getFileByPath(name));await p.index.rebuild();c.releases.push(p.index.acquireSemanticDemand(path('Center')),p.index.acquireSemanticDemand(path('Parent')));
   // This fixture requires the shared parent's actual child scope, independent of optional
   // sibling-enrichment timing. Join the existing bounded owner before measuring presentation.
   await p.index.refreshOnDemandGraph([path('Center'),path('Parent')],false);
   c.leaf=app.workspace.getLeaf('tab');c.leaves.push(c.leaf);await c.leaf.setViewState({type:'k-plex-react-view',active:true});await c.leaf.view.waitUntilReady();await navigate('Center');native(c.leaf);await wait(300);
   await until(()=>root().querySelectorAll('.kplex-role-child').length>=32&&root().querySelectorAll('.kplex-role-sibling').length===4&&!p.index.hasActiveSemanticPreparation()&&!p.index.hasPendingSemanticPreparation(),'Fixture graph and four sibling sources not settled');
   root().querySelector('button[aria-label="'+p.translator('graph.fitGraph')+'"]').click();await wait(350);
   const work={builds:0,semanticRefresh:0,acquisitions:0},stop=[];
   for(const [owner,name,key]of [[p.index,'rebuild','builds'],[p.index,'rebuildProgressively','builds'],[p.index,'refreshSemanticSettings','semanticRefresh'],[p.index.sourceAcquisition,'acquire','acquisitions']]){const original=owner[name];owner[name]=function(...args){work[key]++;return original.apply(this,args)};let restored=false;const restore=()=>{if(!restored){restored=true;owner[name]=original}};stop.push(restore);c.restores.push(restore)}
   if(scenario!=='legacy'){
    const context={app,p,c,check,wait,until,frames,path,root,native,input,center,areaMode,captureAreas,emptyPoint,drag,navigate,work};
    if(scenario==='layout'||scenario==='navigation-enhancements')await layoutAcceptance(context);
    // Outbound fixture/navigation work is legitimate; its module separately guards payload creation.
    for(const restore of stop)restore();
    if(scenario==='native-drag'||scenario==='navigation-enhancements')await nativeDragAcceptance(context);
    return;
   }
   await toggle(false);await toggle(true);const areas=await captureAreas();c.areas=areas;
   const point=emptyPoint(areas.left);input('mouseMove',{x:2,y:2});await wait(50);input('mouseMove',point);await wait(250);check(!root().querySelector('.kplex-area-frame'),'Area visible without modifier');
   key(true);await until(()=>root().querySelector('.kplex-area-frame.kplex-area-left'),'Stationary Alt did not show area');key(false);await until(()=>!root().querySelector('.kplex-area-frame'),'Alt release retained area');
   await toggle(false);input('mouseMove',{x:2,y:2});input('mouseMove',point);await until(()=>root().querySelector('.kplex-area-frame'),'Unmodified area opt-out failed');await toggle(true);
   c.cases.push({id:'area-settings',status:'passed',durableOnOff:true,stationaryAlt:true,release:true,explicitAreaMode:true});
   const scroll=root().querySelector('.kplex-zone-child .kplex-zone-scroll');check(scroll,'Child scroll absent');scroll.scrollTop=60;await wait(150);
   const bounds=scroll.getBoundingClientRect(),nodes=[...root().querySelectorAll('.kplex-role-child')].filter(e=>{const r=e.getBoundingClientRect();return r.top>bounds.top+12&&r.bottom<bounds.bottom-12&&e.querySelector('[data-kplex-gate=left]')});check(nodes.length>=2,'Two visible child gates required');
   const a=center(nodes[0].querySelector('[data-kplex-gate=left]')),b=center(nodes[1].querySelector('[data-kplex-gate=left]'));await drag(a,b,false);
   const draft=root().querySelector('.kplex-drag-connector');check(draft,'Draft path absent');const length=draft.getTotalLength(),screen=t=>draft.getPointAtLength(t).matrixTransform(draft.getScreenCTM()),start=screen(0),end=screen(length),near=screen(length-1);
   const geometry={source:a,target:b,start:{x:start.x,y:start.y},end:{x:end.x,y:end.y},approachFromLeft:near.x<end.x,spuriousArea:!!root().querySelector('.is-relationship-drop-area'),background:getComputedStyle(scroll.parentElement).backgroundColor};
   check(Math.hypot(start.x-a.x,start.y-a.y)<0.15&&Math.hypot(end.x-b.x,end.y-b.y)<0.15,'Draft not anchored to actual gate centers');check(geometry.approachFromLeft&&!geometry.spuriousArea,'Incorrect gate direction or area preview');check(geometry.background==='rgba(0, 0, 0, 0)','Scroll panel not transparent');
   root().querySelector('.kplex-plex').dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1,pointerType:'mouse'}));input('mouseUp',b);c.cases.push({id:'scroll-and-gate-draft',status:'passed',...geometry});
   for(const restore of stop)restore();check(Object.values(work).every(n=>n===0),'Presentation started graph work: '+JSON.stringify(work));c.cases.push({id:'presentation-work',status:'passed',work});
   c.cases.push({id:'fixture-sibling-observation',status:'observed',enabled:p.settings.renderSiblings,raw:p.index.getNeighborhood(path('Center'))?.siblings.map(n=>n.page.path),parentChildren:p.index.neighbours(p.index.get(path('Parent')),'child').map(n=>n.page.path),rendered:[...root().querySelectorAll('.kplex-role-sibling')].map(e=>e.dataset.kplexPath)});
   for(const role of ['parent','child','left','right']){
    const file=app.vault.getFileByPath(path('Sibling '+role)),before=app.metadataCache.getFileCache(file).frontmatter.Parent;
    const node=[...root().querySelectorAll('.kplex-role-sibling')].find(e=>e.dataset.kplexPath===file.path);check(node,'Sibling '+role+' absent');
    const currentAreas=await captureAreas(),target=emptyPoint(currentAreas[role]);await drag(center(node.querySelector('.kplex-thought-text')),target);await confirm();
    await until(()=>!root().querySelector('.kplex-role-sibling[data-kplex-path="'+file.path+'"]'),'Saved sibling did not become direct');
    check(JSON.stringify(app.metadataCache.getFileCache(file).frontmatter.Parent)===JSON.stringify(before),'Sibling parent changed');c.cases.push({id:'sibling-'+role,status:'passed',sharedParentPreserved:true});
   }
   // Hold a real private build at its final presentation boundary while the ordinary creator runs.
   const ghost=p.index.get(path('Ghost').slice(0,-3))??p.index.get(path('Ghost'));check(ghost&&!ghost.file,'Fixture placeholder absent');
   const oldPath=ghost.path,prepare=p.index.preparePresentationPublication;let releaseBuild,held=false;
   const gate=new Promise(resolve=>releaseBuild=resolve);let build;c.restores.push(async()=>{releaseBuild();p.index.preparePresentationPublication=prepare;await build});
   p.index.preparePresentationPublication=async function(...args){const result=await prepare.apply(this,args);if(!held){held=true;await gate}return result};
   build=p.index.rebuild();await until(()=>held,'Real rebuild did not reach held publication');
   const createRef=app.vault.on('create',file=>{if(file.path===path('Ghost')&&!c.files.includes(file.path))c.files.push(file.path)});c.restores.push(()=>app.vault.offref(createRef));
   check(await p.materializeGhostPage(ghost,'Ghost','markdown',c.folder),'Placeholder creation declined');
   const real=app.vault.getFileByPath(path('Ghost'));check(real,'Created physical note absent');
   await navigate('Center');const read=p.index.getNeighborhood(path('Center'));
   check(read.children.filter(n=>n.page.file===real).length===1,'Retained scope lacks exactly one real endpoint');
   check(!read.children.some(n=>n.page.path===oldPath&&!n.page.file),'Retained placeholder survived promotion');
   await until(()=>![...root().querySelectorAll('.kplex-thought')].some(e=>e.dataset.kplexPath===oldPath)
    &&[...root().querySelectorAll('.kplex-thought')].filter(e=>e.dataset.kplexPath===real.path).length===1,'Rendered graph retained or duplicated the materialized placeholder');
   releaseBuild();check(await build===false,'Held stale build was not rejected');p.index.preparePresentationPublication=prepare;
   await until(()=>app.metadataCache.getFirstLinkpathDest(c.folder+'/Ghost',path('Center'))===real,'Host resolution did not catch up');
   await p.index.rebuild();await navigate('Center');
   check(p.index.getNeighborhood(path('Center')).children.filter(n=>n.page.file===real).length===1,'Catch-up duplicated materialized endpoint');
   c.cases.push({id:'materialization-during-indexing',status:'passed',staleBuildRejected:true,retainedRealEndpoints:1,renderedRealEndpoints:1,oldPlaceholderRemoved:true});
   // Drive an actual Bases renderer link through dragstart and the graph's existing drop callbacks.
   const basePath=c.folder+'/Links.base';await app.vault.create(basePath,'filters:\n  and:\n    - file.inFolder("'+c.folder+'")\nviews:\n  - type: table\n    name: Owned links\n');c.files.push(basePath);
   const base=app.workspace.getLeaf('split');c.leaves.push(base);await base.openFile(app.vault.getFileByPath(basePath));await base.loadIfDeferred();
   await until(()=>base.view.containerEl.querySelector('span.internal-link[draggable]'),'Bases link absent');
   // Bases virtualizes rows and does not promise a data-href attribute. Inspect only a bounded
   // set of actual dragstart payloads; select an owned file different from the current center.
   let link,transfer,payload;
   for(const candidate of [...base.view.containerEl.querySelectorAll('span.internal-link[draggable]')].slice(0,8)){
    const data=new DataTransfer();candidate.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:data}));const d=app.dragManager.draggable;
    if(d?.type==='link'&&d.file?.path===path('A drop target')){link=candidate;transfer=data;payload={type:d.type,file:d.file.path,linktext:d.linktext,sourcePath:d.sourcePath};break}
    candidate.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:data}));
   }
   check(link&&payload,'Owned non-central Bases link absent');
   try{
    const destination=root().querySelector('.kplex-role-center'),point=center(destination);destination.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer,clientX:point.x,clientY:point.y}));destination.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer,clientX:point.x,clientY:point.y}));
   }finally{link.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:transfer}))}
   await until(()=>root().querySelector('.kplex-role-center')?.dataset.kplexPath===payload.file,'Bases drop did not navigate');check(payload.file.startsWith(c.folder+'/'),'Bases fixture escaped owned folder');c.cases.push({id:'bases-link-drop',status:'passed',payload});await navigate('Center');
   const areaRects=await captureAreas(),dropPoint=emptyPoint(areaRects.child),areaTransfer=new DataTransfer();check(link.isConnected,'Bases row retired before second drag');
   try{link.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:areaTransfer}));check(app.dragManager.draggable?.file?.path===payload.file,'Bases payload changed');const target=root().ownerDocument.elementFromPoint(dropPoint.x,dropPoint.y);target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:areaTransfer,clientX:dropPoint.x,clientY:dropPoint.y}));target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:areaTransfer,clientX:dropPoint.x,clientY:dropPoint.y}))}finally{link.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:areaTransfer}))}
   await confirm();await until(()=>p.index.getNeighborhood(path('Center')).children.some(n=>n.page.path===payload.file),'Bases area drop did not save child relation');c.cases.push({id:'bases-area-drop',status:'passed',role:'child'});base.detach();await navigate('Center');
   // Existing visible native Properties uses its real loader and real metadata editor.
   let properties=app.workspace.getLeavesOfType('file-properties').find(l=>!l.pinned&&!l.group&&l.view.containerEl.getBoundingClientRect().width>0);
   if(!properties){properties=app.workspace.getLeaf('split');c.leaves.push(properties);await properties.setViewState({type:'file-properties',active:false});await app.workspace.revealLeaf(properties)}await properties.loadIfDeferred();
   app.workspace.setActiveLeaf(c.leaf,{focus:true});await navigate('Friend');await until(()=>properties.view.file===app.vault.getFileByPath(path('Friend'))&&properties.view.modifyingFile===properties.view.file,'Properties did not follow center');
   const view=properties.view,events=[],ref=app.workspace.on('file-open',f=>events.push(f?.path??null));
   try{await navigate('Challenger');const active=app.workspace.activeLeaf,history=JSON.stringify(p.settings.navigationHistory);await until(()=>view.modifyingFile===app.vault.getFileByPath(path('Challenger')),'Properties editable file stale');await wait(150);check(app.workspace.activeLeaf===active&&JSON.stringify(p.settings.navigationHistory)===history,'Properties changed native focus or Plex history');check(!events.length,'Follower emitted file-open')}finally{app.workspace.offref(ref)}
   properties.setPinned(true);await navigate('Friend');await wait(200);check(view.modifyingFile===app.vault.getFileByPath(path('Challenger')),'Pinned Properties changed');properties.setPinned(false);await navigate('Center');await until(()=>view.modifyingFile===app.vault.getFileByPath(path('Center')),'Unpinned Properties did not recover');
   c.cases.push({id:'file-properties',status:'passed',editableFileFollows:true,pinnedPreserved:true,noSyntheticFileOpen:true,focusAndHistoryPreserved:true});
   const convergingLoader=view.loadFile;let refused=0;
   // A private host loader can resolve without applying its target. The safety cap makes this
   // regression fail without hanging Obsidian when run against the old unbounded retry loop.
   view.loadFile=async function(file){if(++refused>12)return convergingLoader.call(this,file)};
   c.restores.push(()=>{view.loadFile=convergingLoader});
   try{await navigate('Friend');await wait(300);await frames();
    check(refused>0&&refused<=3,'Resolved Properties refusal retried without a bounded repair budget: '+refused);
    const settled=refused;await wait(250);check(refused===settled,'Properties refusal restarted from its own notifications');
   }finally{view.loadFile=convergingLoader}
   await navigate('Challenger');await until(()=>view.file===app.vault.getFileByPath(path('Challenger'))&&view.modifyingFile===view.file,'Properties did not recover for a genuine newer center');
   c.cases.push({id:'properties-resolved-refusal',status:'passed',faultInjected:true,nativeAttempts:refused,framesResponsive:true,newIntentRecovered:true,reportedFreezeReproduced:false});
   const originalLoad=view.onLoadFile;let releaseRead,reading=false;
   const readGate=new Promise(resolve=>releaseRead=resolve);c.restores.push(()=>{releaseRead();view.onLoadFile=originalLoad});
   view.onLoadFile=async function(file){if(file.path===path('Friend')&&!reading){reading=true;await readGate}return originalLoad.call(this,file)};
   await navigate('Friend');await until(()=>reading,'Properties read did not reach overlap control');await navigate('Challenger');await view.loadFile(app.vault.getFileByPath(path('Challenger')));
   releaseRead();await until(()=>view.file===app.vault.getFileByPath(path('Challenger'))&&view.modifyingFile===view.file,'Older native read left stale editable metadata');view.onLoadFile=originalLoad;
   c.cases.push({id:'properties-native-overlap',status:'passed',fileAndEditableMetadataAgree:true});
   let unsupportedLoads=0;const loader=view.loadFile;view.loadFile=function(...args){unsupportedLoads++;return loader.apply(this,args)};c.restores.push(()=>{view.loadFile=loader});
   p.notifyNavigation(basePath);await until(()=>root().querySelector('.kplex-role-center')?.dataset.kplexPath===basePath&&view.file===app.vault.getFileByPath(basePath)&&view.modifyingFile===null,'Unsupported central file did not clear editable Properties');
   const loads=unsupportedLoads;await wait(350);check(unsupportedLoads===loads,'Unsupported Properties file caused repeated loads');view.loadFile=loader;await navigate('Center');c.cases.push({id:'properties-non-markdown',status:'passed',loads});
   const popout=app.workspace.getLeaf('window');c.leaves.push(popout);await popout.setViewState({type:'k-plex-react-view',active:true});await popout.view.waitUntilReady();await navigate('Friend',popout);await until(()=>view.modifyingFile===app.vault.getFileByPath(path('Friend')),'Popout center did not own Properties');popout.detach();await navigate('Center');c.cases.push({id:'properties-popout',status:'passed'});
  }catch(error){c.error=String(error.stack||error)}
  finally{
   const errors=[];for(const restore of c.restores.reverse())try{await restore()}catch(e){errors.push(String(e))}for(const release of c.releases)try{release()}catch(e){errors.push(String(e))}
   if(app.setting.isOpen)app.setting.close();for(const leaf of c.leaves.reverse())try{if(leaf.view.containerEl.isConnected)leaf.detach()}catch(e){errors.push(String(e))}
   try{p.settings=c.settings;p.savedSettingsPolicy=c.policy;await p.saveSettings(false,false)}catch(e){errors.push(String(e))}
   for(const name of c.files.reverse())try{const file=app.vault.getFileByPath(name);if(file)await app.vault.delete(file)}catch(e){errors.push(String(e))}
   try{const folder=c.folderCreated?app.vault.getFolderByPath(c.folder):null;if(folder){check(!folder.children.length,'Unknown files in owned folder');await app.vault.delete(folder,true)}}catch(e){errors.push(String(e))}
   try{await app.workspace.changeLayout(c.layout);const leaves=[];app.workspace.iterateAllLeaves(leaf=>leaves.push(leaf));const rebind=old=>old?leaves.find(leaf=>leaf.id===old.id)??null:null;p.linkedDocumentLeaf=rebind(c.owners.linked);p.lastDocumentLeaf=rebind(c.owners.last);p.recentLeafHistory=c.owners.recent.map(rebind).filter(Boolean);p.sidecarLeaves.clear();for(const [oldHost,oldNote]of c.owners.sidecars){const host=rebind(oldHost),note=rebind(oldNote);if(host&&note)p.sidecarLeaves.set(host,note)}if(c.settings.lastActivePath)p.notifyNavigation(c.settings.lastActivePath);await p.settingsWriteQueue;win.setMinimumSize(...c.minimum);win.setBounds(c.bounds)}catch(e){errors.push(String(e))}
   const gateDeadline=Date.now()+15000;while([...p.index.onDemandGateTasks.keys()].some(name=>name.startsWith(c.folder+'/'))&&Date.now()<gateDeadline)await wait(30);
   const ownedGateTasksRemaining=[...p.index.onDemandGateTasks.keys()].filter(name=>name.startsWith(c.folder+'/')).length;if(ownedGateTasksRemaining)errors.push('Owned gate-count task did not retire');
   c.cleanup={errors,inventoryRestored:JSON.stringify(app.vault.getFiles().map(f=>f.path).sort())===JSON.stringify(c.inventory),ownedFilesRemaining:c.files.filter(name=>app.vault.getFileByPath(name)),ownedGateTasksRemaining};c.done=true;
  }
 })();return true;
}
const report={status:'running',scenario,startedAt:new Date().toISOString(),node:process.version,host:process.platform,artifacts};
try{
 report.obsidian=cli('version');evaluate('('+start.toString()+')('+JSON.stringify(scenario)+','+acceptSimplifiedLayout.toString()+','+acceptNativeDragEnhancements.toString()+','+nativeHtmlDrag.toString()+')');const end=Date.now()+600000;let completed=0;
 while(true){await new Promise(r=>setTimeout(r,350));const state=evaluate('JSON.stringify((()=>{const c=window.__kplexInteractionUpdates;return{done:c?.done,error:c?.error,cases:c?.cases,cleanup:c?.cleanup,areas:c?.areas}})())');if(state.cases?.length!==completed){completed=state.cases?.length??0;console.log(JSON.stringify({completed:state.cases}))}if(state.done){Object.assign(report,state);assert(!state.error,state.error);assert.deepEqual(state.cleanup.errors,[]);assert(state.cleanup.inventoryRestored);assert.deepEqual(state.cleanup.ownedFilesRemaining,[]);report.status='passed';break}assert(Date.now()<end,'Native interaction deadline')}
}catch(error){report.status='failed';report.error=String(error.stack||error);process.exitCode=1}
finally{
 try{const end=Date.now()+100000;while(true){const state=evaluate('JSON.stringify((()=>{const c=window.__kplexInteractionUpdates;if(!c)return{absent:true};if(!c.done){c.cancelled=true;return{pending:true}}return{cleanup:c.cleanup,cases:c.cases,error:c.error,nativeDropDiagnostics:c.nativeDropDiagnostics,layoutWork:c.layoutWork}})())');if(!state.pending){report.finalState=state;assert(!state.cleanup?.errors.length,state.cleanup?.errors.join('\n'));assert(state.absent||state.cleanup?.inventoryRestored);evaluate('JSON.stringify(delete window.__kplexInteractionUpdates)');break}assert(Date.now()<end,'Controller still running; preserve configuration');await new Promise(r=>setTimeout(r,200))}for(const backup of backups)writeFileSync(join(target.config,backup.name),backup.bytes);report.configurationBytesRestored=backups.every(b=>readFileSync(join(target.config,b.name)).equals(b.bytes))}
 catch(error){report.cleanupError=String(error);report.status='failed';process.exitCode=1}
 report.completedAt=new Date().toISOString();writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');writeFileSync(join(output,'driver-source.mjs'),readFileSync(new URL(import.meta.url)));
 for(const name of ['interactionSimplifiedLayout.mjs','interactionNativeDragEnhancements.mjs'])writeFileSync(join(output,name),readFileSync(new URL(name,import.meta.url)));
}
console.log(JSON.stringify(report));
