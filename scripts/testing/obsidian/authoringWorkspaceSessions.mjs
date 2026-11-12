/** Exact-artifact #302/#118 native document release acceptance. The shared fixture owns only
 * disposable notes/views and restores settings/layout; this runner owns the host lock and receipts. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {acquireHostLock} from './hostLock.mjs';
import {runControlledProbe} from './controlledProbe.mjs';
import {validateTarget} from './runner.mjs';
import {nativeBatch270} from './nativeBatch270.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';

/** Preserve native documents through every release route, including attached sibling tabs,
 * folded groups, independent Plex owners and completions of already accepted native opens. */
async function sessions(app,c){
 const f=c.fixture(app,c),cases=[],scrollControls=[];let mainAnchor;
 /** Snapshot the native history owner and its existing entries without serializing host objects. */
 const history=leaf=>{const owner=leaf.history;f.check(owner&&typeof owner==='object','Native leaf history owner');const arrays=Object.keys(owner).filter(key=>Array.isArray(owner[key])).map(key=>({key,array:owner[key],entries:[...owner[key]]}));f.check(arrays.length,'Native history arrays: '+Object.keys(owner));return{owner,arrays};};
 /** Only file representation is compared; native activation is independently allowed by folding. */
 const state=leaf=>{const value=leaf.getViewState();return JSON.stringify({type:value.type,state:value.state,pinned:value.pinned});};
 /** Native scroll can settle after the workspace's split geometry and CodeMirror measurement.
  * Record both to distinguish a reopened/reset editor from an ordinary viewport-size change. */
 const metrics=leaf=>{const editor=leaf.view.editor,rect=leaf.view.containerEl.getBoundingClientRect(),group=leaf.parent.containerEl.getBoundingClientRect(),win=leaf.view.containerEl.ownerDocument.defaultView;return{scroll:editor?.getScrollInfo(),view:{width:rect.width,height:rect.height},group:{width:group.width,height:group.height},window:{width:win.innerWidth,height:win.innerHeight},from:editor?.getCursor('from'),to:editor?.getCursor('to'),state:state(leaf),selected:leaf.parent.activeTab===leaf,active:f.workspace.activeLeaf===leaf};};
 /** Require stable actual geometry/selection/scroll readings, not a fixed sleep masquerading as paint. */
 const settled=async(leaf,label)=>{let previous,samples=0;await f.until(()=>{if(!leaf.view.editor)return false;const current=JSON.stringify(metrics(leaf));samples=current===previous?samples+1:0;previous=current;return samples>=3;},label+' settled native editor',10000);};
 /** Capture the actual view/editor/group/history identities and native selection/scroll values. */
 const snapshot=leaf=>{const editor=leaf.view.editor;f.check(editor,'Native Markdown editor');return{leaf,view:leaf.view,editor,parent:leaf.parent,tabs:[...leaf.parent.children],history:history(leaf),state:state(leaf),file:leaf.view.file,text:editor.getValue(),from:editor.getCursor('from'),to:editor.getCursor('to'),scroll:editor.getScrollInfo(),metrics:metrics(leaf)};};
 /** Closing a native split can remeasure CodeMirror even without a plugin. A changed viewport
  * must match an independently measured ordinary split with the same geometry and initial pixels. */
 const closeScroll=(before,after,destination,label)=>{
  const sameGeometry=(a,b)=>['view','group','window'].every(owner=>['width','height'].every(axis=>Math.abs(a[owner][axis]-b[owner][axis])<2));
  if(sameGeometry(before,after)){f.check(Math.abs(after.scroll.top-before.scroll.top)<2&&Math.abs(after.scroll.left-before.scroll.left)<2,label+' native scroll without viewport resize: '+JSON.stringify({before,after}));return;}
  const control=scrollControls.find(item=>item.destination===destination&&sameGeometry(item.before,before)&&sameGeometry(item.after,after)&&Math.abs(item.before.scroll.top-before.scroll.top)<2&&Math.abs(item.before.scroll.left-before.scroll.left)<2);
  f.check(control,label+' has no matching ordinary native split-close geometry/initial-scroll control: '+JSON.stringify({destination,before,after,controls:scrollControls}));
  f.check(Math.abs(after.scroll.top-control.after.scroll.top)<2&&Math.abs(after.scroll.left-control.after.scroll.left)<2,label+' differs from the matched ordinary native split-close scroll outcome: '+JSON.stringify({before,after,control}));
 };
 /** A release cannot replace/reopen/reparent a native editor or reset its navigation history. */
 const retained=(before,label,closingDestination)=>{const {leaf,editor}=before;f.check(f.p.leafIsAttached(leaf),label+' attached document');f.check(leaf.view===before.view&&leaf.view.editor===editor&&leaf.parent===before.parent,label+' native view/editor/group identity');f.check(leaf.parent.children.length===before.tabs.length&&before.tabs.every((tab,index)=>leaf.parent.children[index]===tab),label+' tab order');f.check(leaf.view.file===before.file&&state(leaf)===before.state&&editor.getValue()===before.text,label+' file/representation/text');f.check(JSON.stringify(editor.getCursor('from'))===JSON.stringify(before.from)&&JSON.stringify(editor.getCursor('to'))===JSON.stringify(before.to),label+' native selection');f.check(leaf.history===before.history.owner&&before.history.arrays.every(({key,array,entries})=>leaf.history[key]===array&&array.length===entries.length&&entries.every((entry,index)=>array[index]===entry)),label+' native history identity/entries');const after=metrics(leaf);if(closingDestination)closeScroll(before.metrics,after,closingDestination,label);else f.check(Math.abs(after.scroll.top-before.scroll.top)<2&&Math.abs(after.scroll.left-before.scroll.left)<2,label+' native scroll: '+JSON.stringify({before:before.metrics,after}));};
 /** Count native calls while preserving their exact receiver, arguments and completion. */
 const observe=(owner,key,calls)=>{const original=owner[key],descriptor=Object.getOwnPropertyDescriptor(owner,key);f.check(typeof original==='function','Native observer '+key);const replacement=function(...args){calls.push(key);return original.apply(this,args)};owner[key]=replacement;const restore=()=>{if(owner[key]===replacement){if(descriptor)Object.defineProperty(owner,key,descriptor);else delete owner[key]}};f.restores.push(restore);return restore;};
 /** Release is deliberately distinct from the explicit Close action, which can detach content. */
 const release=async(p,host,route,page)=>{if(route==='unpin')await p.detachSidecar(host);else await p.setDocumentSyncMode(host,route,page);};
 /** Main-window hosts receive a fresh horizontal group. Their right-hand Sidecar then owns a
  * nested two-branch vertical split, rather than sharing an unsafe split with untouched tabs. */
 const canvas=async(file,destination)=>{let host;if(destination==='tab'){
   f.check(mainAnchor&&f.p.leafIsAttached(mainAnchor),'Main-window native tab target');
   host=own(f.workspace.createLeafBySplit(mainAnchor,'horizontal',false));await host.setViewState({type:'k-plex-react-view',active:true});await f.workspace.revealLeaf(host);await host.view.waitUntilReady();f.p.notifyNavigation(file.path,host);await f.until(()=>host.view.contentEl.querySelector('[data-kplex-path="'+file.path+'"]'),'Native isolated canvas center');
  }else host=await f.canvas(file,'k-plex-react-view',destination);
  f.p.documentSession(host).preferences.sidecarPosition='right';await f.ready();return host;};
 /** Keep every created native document under fixture cleanup, including unclaimed siblings. */
 const own=leaf=>{if(!f.leaves.includes(leaf))f.leaves.push(leaf);return leaf;};
 /** Select and diverge the managed document while suppressing only this fixture's inward echo. */
 const diverge=async(p,host,leaf,file)=>{const session=p.documentSession(host),previous=session.suppression;session.suppression={path:file.path,until:Date.now()+60000};try{await leaf.openFile(file,{active:true,state:{mode:'source'}});await f.until(()=>leaf.view.file===file&&!!leaf.view.editor,'Divergent native editor');await f.wait(100);f.check(session.centerPath!==file.path,'Divergent document changed the canvas center');}finally{session.suppression=previous;}};
 try{
  // Short physical lines fit even the narrow split. The controls still measure native editor
  // remeasurement on split close; scroll is not presumed immutable merely because text fits.
  await f.initialize();const p=f.p,body=Array.from({length:80},(_,index)=>'Line '+index+' native text.').join('\n');
  const a=await f.note('Canvas A',body),b=await f.note('Divergent B',body),next=await f.note('Next C',body),other=await f.note('Other Plex',body);
  let mainSeed;f.workspace.iterateAllLeaves(leaf=>{if(!mainSeed&&leaf.view.containerEl.ownerDocument===document)mainSeed=leaf});f.check(mainSeed,'Main-window native tab group');
  mainAnchor=own(f.workspace.createLeafInParent(mainSeed.parent,mainSeed.parent.children.length));await mainAnchor.openFile(a,{active:false,state:{mode:'source'}});
  // A separate native window keeps the independent pair structurally adjacent in every main/popout case.
  const otherHost=await canvas(other,'window');await p.openSidecar(otherHost,p.index.get(other.path));const otherDocument=own(p.sidecarLeaves.get(otherHost));f.check(otherDocument,'Independent companion');
  const otherView=otherDocument.view,otherGroup=otherDocument.parent;
  // These are ordinary Markdown splits, with no Plex/Sidecar ownership. Measure both the empty
  // scroll origin and the prepared scrolled document, without relaxing any release assertion.
  for(const destination of ['tab','window'])for(const requestedTop of [0,120]){
   let neighbour,doc,sibling;
   try{
    neighbour=own(destination==='tab'?f.workspace.createLeafBySplit(mainAnchor,'horizontal',false):f.workspace.getLeaf('window'));await neighbour.openFile(a,{active:true,state:{mode:'source'}});
    if(destination==='window')await f.until(()=>neighbour.view.containerEl.ownerDocument!==document,'Ordinary control popout document');
    doc=own(f.workspace.createLeafBySplit(neighbour,'vertical',false));await doc.openFile(b,{active:true,state:{mode:'source'}});sibling=own(f.workspace.createLeafInParent(doc.parent,doc.parent.children.length));await sibling.openFile(b,{active:false,state:{mode:'source'}});
    await f.focus(doc.view.containerEl.ownerDocument);f.workspace.setActiveLeaf(doc,{focus:true});await f.until(()=>!!doc.view.editor,'Ordinary control native editor');doc.view.editor.setSelection({line:12,ch:2},{line:12,ch:9});doc.view.editor.scrollTo(0,requestedTop);await settled(doc,'Ordinary '+destination+' before close');
    const before=snapshot(doc);neighbour.detach();await settled(doc,'Ordinary '+destination+' after close');const after=metrics(doc);
    f.check(p.leafIsAttached(doc)&&doc.view===before.view&&doc.view.editor===before.editor&&doc.view.file===before.file&&doc.parent===before.parent,'Ordinary split close changed the native document identity');
    scrollControls.push({destination,requestedTop,before:before.metrics,after,topDelta:after.scroll.top-before.scroll.top,leftDelta:after.scroll.left-before.scroll.left,sameNativeEditor:true});
   }finally{for(const leaf of [neighbour,doc,sibling])if(leaf&&p.leafIsAttached(leaf))leaf.detach();}
  }
  for(const destination of ['tab','window'])for(const route of ['off','recent','unpin'])for(const folded of [false,true]){
   const id=[destination,route,folded?'folded-attached':'unfolded'].join('-');c.progress={phase:id};
   let host,managed,original,sibling;const restores=[];
   try{
    host=await canvas(a,destination);await p.openSidecar(host,p.index.get(a.path));managed=original=own(p.sidecarLeaves.get(host));f.check(managed,'Owned managed document');
    sibling=own(f.workspace.createLeafInParent(managed.parent,managed.parent.children.length));await sibling.openFile(b,{active:false,state:{mode:'source'}});
    if(folded){f.workspace.setActiveLeaf(sibling,{focus:true});await f.wait(100);f.check(p.getAdjacentSidecarCandidate(host)===sibling,'Visible sibling attachment candidate');await p.attachAdjacentSidecar(host,'to-leaf',p.index.get(a.path));managed=sibling;f.check(p.sidecarLeaves.get(host)===managed&&p.leafIsAttached(original),'Explicit sibling attachment retains former native tab');}
    await diverge(p,host,managed,b);await f.focus(managed.view.containerEl.ownerDocument);f.workspace.setActiveLeaf(managed,{focus:true});managed.view.editor.setSelection({line:12,ch:2},{line:12,ch:9});managed.view.editor.scrollTo(0,120);await settled(managed,id+' prepared document');
    if(folded){
     try{await f.until(()=>!!p.readPlexFoldCandidate(host),'Eligible native two-group fold owner',5000);}
     catch(error){const hostGroup=host.parent.containerEl,sidecarGroup=managed.parent.containerEl,split=hostGroup.parentElement;throw Error(String(error)+'; topology '+JSON.stringify({hostTabs:host.parent.children.length,sidecarTabs:managed.parent.children.length,sameParent:sidecarGroup.parentElement===split,splitClass:split?.className,branches:[...(split?.children??[])].map(child=>child.className),moving:p.sidecarMovingHosts.has(host),managed:p.sidecarLeaves.get(host)===managed}));}
     await p.collapsePlexForSidecar(host);await f.until(()=>p.isPlexFoldedForSidecar(host),'Folded native Plex group',5000);
    }
    await settled(managed,id+' before release');const before=snapshot(managed),nativeCalls=[];restores.push(observe(managed,'openFile',nativeCalls),observe(managed,'setViewState',nativeCalls));
    const mode=route==='recent'?'recent':'off';await release(p,host,route,p.index.get(a.path));await settled(managed,id+' released');
    retained(before,id+' release');f.check(nativeCalls.length===0,id+' release reopened the native document: '+nativeCalls);f.check(!p.sidecarLeaves.has(host)&&!p.isSidecarOpen(host)&&!p.isPlexFoldedForSidecar(host),id+' release retained managed/fold ownership');
    const session=p.documentSession(host);f.check(session.preferences.documentSyncMode===mode&&!session.preferences.sidecarOpen&&!session.linkedDocumentLeaf,id+' release synchronization state');
    await f.until(()=>!host.view.contentEl.querySelector('.kplex-sidecar-controls.is-open'),id+' released Sidecar decoration');
    f.check(p.sidecarLeaves.get(otherHost)===otherDocument&&p.isSidecarOpen(otherHost)&&otherDocument.view===otherView&&otherDocument.parent===otherGroup,id+' disturbed independent Plex pair');
    restores.splice(0).reverse().forEach(restore=>restore());
    if(route==='recent'){
     f.workspace.setActiveLeaf(managed,{focus:true});await f.wait(100);f.check(p.findRecentDocumentLeaf(host)===managed,id+' ordinary Recent destination');
     p.notifyNavigation(next.path,host);await f.until(()=>managed.view.file===next,id+' later accepted Recent navigation');f.check(!p.sidecarLeaves.has(host)&&!p.isSidecarOpen(host),id+' ordinary Recent navigation reclaimed Sidecar');
    }
    await settled(managed,id+' before Plex close');const beforeClose=snapshot(managed);host.detach();await settled(managed,id+' after Plex close');retained(beforeClose,id+' close Plex',destination);f.check(p.sidecarLeaves.get(otherHost)===otherDocument&&p.leafIsAttached(otherDocument),id+' closing Plex disturbed another owner');
    cases.push({id,status:'passed',sameNativeLeaf:true,sameViewEditorHistory:true,sameGroupTabs:true,divergentPath:b.path,laterRecentFollow:route==='recent',foldRestored:folded,attachedSibling:folded});
   }finally{restores.reverse().forEach(restore=>restore());if(host&&p.leafIsAttached(host))host.detach();for(const leaf of new Set([managed,original,sibling]))if(leaf&&p.leafIsAttached(leaf))leaf.detach();}
  }
  for(const destination of ['tab','window'])for(const route of ['off','recent','unpin']){
   const id=[destination,route,'late-native-open'].join('-');c.progress={phase:id};let host,managed,continueNative,opening;
   try{
    host=await canvas(a,destination);await p.openSidecar(host,p.index.get(a.path));managed=own(p.sidecarLeaves.get(host));f.check(managed,'Pending managed document');
    let entered=false;const original=managed.openFile,descriptor=Object.getOwnPropertyDescriptor(managed,'openFile'),gate=new Promise(resolve=>{continueNative=resolve});
    const pending=function(...args){const task=original.apply(this,args);return Promise.resolve(task).then(async value=>{entered=true;await gate;return value})};managed.openFile=pending;
    const restore=()=>{if(managed.openFile===pending){if(descriptor)Object.defineProperty(managed,'openFile',descriptor);else delete managed.openFile}};f.restores.push(restore);
    opening=p.syncSidecarToPage(host,p.index.get(next.path));await f.until(()=>entered,'Accepted native open before release');
    await release(p,host,route,p.index.get(a.path));await settled(managed,id+' before late completion');const before=snapshot(managed),revision=p.documentSession(host).revision;continueNative();await opening;restore();await settled(managed,id+' late completion');
    retained(before,id+' completion');f.check(!p.sidecarLeaves.has(host)&&!p.isSidecarOpen(host)&&p.documentSession(host).revision===revision,id+' stale completion reclaimed ownership or advanced released intent');
    const beforeClose=snapshot(managed);host.detach();await settled(managed,id+' close');retained(beforeClose,id+' close',destination);cases.push({id,status:'passed',acceptedNativeCompletion:true,ownershipRetired:true,sameNativeLeaf:true});
   }finally{continueNative?.();if(opening)await opening.catch(()=>{});if(host&&p.leafIsAttached(host))host.detach();if(managed&&p.leafIsAttached(managed))managed.detach();}
  }
  return{cases,scrollControls};
 }catch(error){throw Error(String(error)+'; ordinary native split-close controls: '+JSON.stringify(scrollControls)+'; completed release cases: '+JSON.stringify(cases));}finally{await f.cleanup();}
}

const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const userDataPath=process.env.KPLEX_OBSIDIAN_USER_DATA??(process.platform==='win32'?join(process.env.APPDATA,'obsidian'):process.platform==='darwin'?join(homedir(),'Library','Application Support','obsidian'):join(process.env.XDG_CONFIG_HOME??join(homedir(),'.config'),'obsidian'));
const lock=acquireHostLock({userDataPath});
try{
 const definitions='c.fixture='+nativeBatch270.toString()+';c.sessions='+nativeDocumentSessions.toString()+';c.fixturePrefix="__kplex302sessions_";c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';';
 await runControlledProbe('authoring-workspace-sessions',sessions,definitions,['src/main.ts','src/ui/KplexDocumentSession.ts','src/ui/App.tsx','scripts/testing/obsidian/authoringWorkspaceSessions.mjs'],{maximumMs:900000});
}finally{lock.release();}
