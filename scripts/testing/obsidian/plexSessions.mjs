/**
 * Exact-build functional acceptance for independent native Plex sessions and memory-only
 * Footprints in the explicitly authorized small disposable vault. Uses real actions, native input,
 * held native opens, window migration and an actual renderer reload. No comparative timings.
 * Owns only its fixture subtree; restores workspace/settings/configuration and all wrappers.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from "node:fs";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {obsidianCliExecutable,spawnNativeSync} from "./processTools.mjs";
import {validateTarget} from "./runner.mjs";
const root=resolve(fileURLToPath(new URL("../../..",import.meta.url))),vaultName=process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName,"kplex-test-small","Explicit disposable small vault required");
const target=validateTarget({vaultName,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const output=process.env.KPLEX_HOST_REPORT_DIR;assert(output&&(!existsSync(output)||!readdirSync(output).length),"Fresh private report directory required");mkdirSync(output,{recursive:true});
const configuration=[join(target.pluginDir,"data.json"),join(target.config,"workspace.json"),join(target.config,"community-plugins.json"),join(target.config,"app.json")].filter(existsSync).map(path=>({path,bytes:readFileSync(path)}));
const report={status:"running",node:process.version,startedAt:new Date().toISOString(),artifacts:{},scenarios:[],limitations:["Windows native renderer input; macOS, physical mobile/touch and screen-reader acceptance remain separate."]};
writeFileSync(join(output,"driver-source.mjs"),readFileSync(fileURLToPath(import.meta.url)));
/** Bound exact-vault native transport; renderer errors cannot masquerade as launcher success. */
function cli(command,...args){const r=spawnNativeSync(obsidianCliExecutable(),[`vault=${vaultName}`,command,...args],{cwd:root,encoding:"utf8",timeout:30000,maxBuffer:8*1024*1024});if(r.error||r.status!==0||/^Error:/m.test(r.stdout))throw r.error??Error(r.stderr||r.stdout);return r.stdout.trim();}
/** Read only detached test observations through the shared CLI's multiline eval transport. */
function evaluate(code){return JSON.parse(cli("eval",`code=${code}`).replace(/^=>\s*/,""));}
/** Yield between bounded native polls without creating another driver. */
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

/** Install one explicitly retired native controller; every production operation remains authoritative. */
function nativeProbe(phase,saved){
 const p=app.plugins.plugins["k-plex"],workspace=app.workspace,remote=require("@electron/remote"),win=remote.getCurrentWindow();
 if(!p?.actionManager||window.__kplex187Sessions)throw Error("Clean loaded native plugin required");
 const c=window.__kplex187Sessions={original:saved?.original??{settings:structuredClone(p.settings),layout:workspace.getLayout(),inventory:app.vault.getFiles().map(f=>f.path).sort()},
  folder:saved?.folder??`Kplex-187-Sessions-${Date.now()}`,cases:[],restores:[],gates:[],done:false,cancelled:false};
 /** An assertion also fences teardown/timeout, so a retired probe cannot resume writes. */
 const check=(value,message)=>{if(c.cancelled||!value)throw Error(message);};
 /** Native tasks keep their actual scheduling and background-throttling policy. */
 const wait=async ms=>{check(true,"Retired probe");await new Promise(resolve=>window.setTimeout(resolve,ms));check(true,"Retired probe");};
 /** Bound readiness to the observed condition; no green status substitutes for a rendered center. */
 const until=async(read,message,timeout=15000)=>{const end=Date.now()+timeout;while(!read()){check(Date.now()<end,message);await wait(40);}};
 const path=name=>`${c.folder}/${name}.md`;
 const rootFor=host=>host.view.contentEl.querySelector(".kplex-app");
 const center=host=>rootFor(host)?.querySelector(".kplex-role-center")?.dataset.kplexPath;
 const trail=host=>host.view.documentSession.footprints;
 /** Count every serialized native tab, including deferred background tabs omitted by iterateAllLeaves. */
 const nativeLeafIds=()=>{const ids=[];const visit=node=>{if(!node||typeof node!=="object")return;if(node.type==="leaf"&&typeof node.id==="string"){check(workspace.getLeafById(node.id),"Serialized native leaf cannot be resolved");ids.push(node.id);}for(const child of node.children??[])visit(child);};for(const branch of Object.values(workspace.getLayout())){if(Array.isArray(branch))for(const node of branch)visit(node);else visit(branch);}return ids.sort();};
 /** Native center navigation runs the existing App activation/history/companion path. */
 const navigate=async(host,identity)=>{p.notifyNavigation(identity,host);await until(()=>center(host)===identity,`Center not accepted: ${identity}`);await wait(150);};
 /** Trusted input belongs to the element's actual main/popout window. */
 const click=async subject=>{
  let element=typeof subject==="function"?subject():subject;
  check(element?.getClientRects().length,"Visible native control required");element.scrollIntoView({block:"nearest",inline:"nearest"});await wait(30);
  const doc=element.ownerDocument,owner=doc.defaultView.require("@electron/remote").getCurrentWindow();
  owner.show();owner.focus();owner.webContents.focus();await until(()=>doc.hasFocus(),"Input document not focused");await wait(100);
  if(typeof subject==="function")element=subject();check(element?.ownerDocument===doc,"Input target migrated to another document");
  const r=element.getBoundingClientRect(),x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2),hit=doc.elementFromPoint(x,y);
  check(element.contains(hit),`Native control obscured: ${JSON.stringify({control:element.className,hit:hit?.className,rect:r.toJSON(),viewport:{width:doc.defaultView.innerWidth,height:doc.defaultView.innerHeight}})}`);
  owner.webContents.sendInputEvent({type:"mouseMove",x,y});owner.webContents.sendInputEvent({type:"mouseDown",x,y,button:"left",clickCount:1});owner.webContents.sendInputEvent({type:"mouseUp",x,y,button:"left",clickCount:1});await wait(100);
 };
 /** Escape uses the same native keyboard path as real users and shared FloatingLayer focus return. */
 const escape=async doc=>{const owner=doc.defaultView.require("@electron/remote").getCurrentWindow();owner.webContents.sendInputEvent({type:"keyDown",keyCode:"Escape"});owner.webContents.sendInputEvent({type:"keyUp",keyCode:"Escape"});await wait(100);};
 /** One forwarding wrapper captures only operation counts; exact originals restore on every exit. */
 const wrap=(owner,key,observe)=>{const original=owner[key];check(typeof original==="function",`Missing native owner ${key}`);owner[key]=function(...args){observe(...args);return original.apply(this,args);};const restore=()=>{owner[key]=original;};c.restores.push(restore);return restore;};
 /** Hold one non-cancellable native open before publication, without changing its real implementation. */
 const hold=(leaf,file)=>{
  const original=leaf.openFile;let release;const state={entered:false},gate=new Promise(resolve=>{release=resolve;});
  leaf.openFile=async function(target,options){if(target===file&&!state.entered){state.entered=true;await gate;}return original.call(this,target,options);};
  const restore=()=>{release();leaf.openFile=original;};c.restores.push(restore);c.gates.push(release);return{...state,get entered(){return state.entered},release,restore};
 };
 const passed=(id,details={})=>c.cases.push({id,status:"passed",...details});
 /** Cleanup uses only the proven owned subtree and the saved native layout, never another vault. */
 c.cleanup=()=>{if(c.cleanupTask)return c.cleanupTask;c.cleanupTask=(async()=>{
  c.cancelled=true;win.show();win.focus();win.webContents.focus();for(const release of c.gates)release();for(const restore of c.restores.splice(0).reverse())restore();
  c.cleanupPhase="settings";
  Object.assign(p.settings,structuredClone(c.original.settings));await p.saveSettings(false,false);
  c.cleanupPhase="return-popouts";
  for(const host of c.hosts??[]){if(!p.leafIsAttached(host)||host.view.contentEl.ownerDocument===document)continue;const parents=[];workspace.iterateRootLeaves(leaf=>{if(leaf!==host&&leaf.view.containerEl.ownerDocument===document&&leaf.view.containerEl.isConnected)parents.push(leaf.parent);});if(parents.length){host.parent.removeChild(host);parents[0].insertChild(parents[0].children.length,host);}}
  await new Promise(resolve=>window.setTimeout(resolve,100));
  c.cleanupPhase="layout";await workspace.changeLayout(c.original.layout);c.cleanupPhase="queue";await p.settingsWriteQueue;
  if(!/^Kplex-187-Sessions-\d+$/.test(c.folder))throw Error("Unverified fixture subtree");
  c.cleanupPhase="fixtures";const folder=app.vault.getFolderByPath(c.folder);if(folder){for(const child of [...folder.children]){if(child.parent!==folder)throw Error("Unexpected fixture child");await app.vault.delete(child,true);}await app.vault.delete(folder,true);}
  p.recentLeafHistory=[];p.index.notifyPresentation();win.show();win.focus();win.webContents.focus();c.cleaned=true;
 })();return c.cleanupTask;};
 if(phase==="cleanup"){c.cleanup().then(()=>{c.status="passed"},error=>{c.status="failed";c.error=String(error.stack??error)}).finally(()=>{c.done=true});return true;}
 c.task=new Promise(resolve=>window.setTimeout(resolve,0)).then(async()=>{
  remote.app.focus({steal:true});win.show();win.focus();win.webContents.focus();await until(()=>document.hasFocus()&&!document.hidden,"Native foreground unavailable");
  await until(()=>!p.isStartupInitializing(),"Startup ownership guard did not settle");
  if(phase==="restore"){
   const pairs=saved.pairs.map(pair=>({host:workspace.getLeafById(pair.host),sidecar:workspace.getLeafById(pair.sidecar),center:pair.center}));
   for(const pair of pairs){check(pair.host&&pair.sidecar,"Restored native IDs missing");await until(()=>p.sidecarLeaves.get(pair.host)===pair.sidecar,"Exact restored companion not claimed");await until(()=>center(pair.host)===pair.center,"Independent center not restored");check(trail(pair.host).length===1,"Restart reconstructed old Footprints");}
   const leaves=nativeLeafIds();check(JSON.stringify(leaves)===JSON.stringify(saved.leafIds),"Restart changed the exact native tab inventory");
   const serialized=JSON.stringify(workspace.getLayout());check(!serialized.includes('"footprints"')&&!serialized.includes('"visits"'),"Trail entered native workspace serialization");
   passed("real-renderer-restart-restores-two-exact-pairs-and-fresh-trails",{leafCount:leaves.length});
   await navigate(pairs[0].host,path("B"));await until(()=>p.fileForLeaf(pairs[0].sidecar)?.path===path("B"),"Restored A did not synchronize");
   check(center(pairs[1].host)===pairs[1].center,"Restored A navigation moved B");passed("restored-pairs-remain-independent");return;
  }
  check(!app.vault.getFolderByPath(c.folder),"Fixture collision");await app.vault.createFolder(c.folder);
  Object.assign(p.settings,{documentSyncMode:"off",sidecarOpen:false,embedCentralNode:false,animationSpeed:0});
  const children=p.settings.hierarchy.children[0];check(children,"Child ontology required");
  for(const name of ["A","B","C","D"]){const file=await app.vault.create(path(name),name==="A"?`---\n${JSON.stringify(children)}: ["[[${path("B")}]]"]\ntags: [kplex187/session]\n---\n[[${c.folder}/Missing]]\nhttps://example.com/kplex-187\n`:`# ${name}\n`);p.index.insertCreatedFile(file);}
  const hostA=workspace.getLeaf("tab");await hostA.setViewState({type:"k-plex-react-view",active:true});await hostA.view.waitUntilReady();
  const hostB=workspace.createLeafBySplit(hostA,"vertical",false);await hostB.setViewState({type:"k-plex-react-view",active:true});await hostB.view.waitUntilReady();
  c.hosts=[hostA,hostB];
  await navigate(hostA,path("A"));await navigate(hostB,path("C"));await p.openSidecar(hostA,p.index.get(path("A")));await p.openSidecar(hostB,p.index.get(path("C")));
  let sideA=p.sidecarLeaves.get(hostA);const sideB=p.sidecarLeaves.get(hostB);check(sideA&&sideB&&sideA!==sideB,"Distinct managed companions required");
  const defaults=JSON.stringify({mode:p.settings.documentSyncMode,open:p.settings.sidecarOpen,position:p.settings.sidecarPosition});
  let opensA=0,opensB=0;wrap(sideA,"openFile",()=>opensA++);wrap(sideB,"openFile",()=>opensB++);
  const beforeA=opensA,beforeB=opensB;await navigate(hostA,path("B"));await until(()=>p.fileForLeaf(sideA)?.path===path("B"),"A companion not synchronized");
  check(opensA-beforeA===1&&opensB===beforeB&&center(hostB)===path("C"),"Navigation crossed pairs or opened one leaf twice");
  await sideA.openFile(app.vault.getFileByPath(path("D")),{active:true});await until(()=>center(hostA)===path("D"),"Native A did not follow");check(center(hostB)===path("C"),"Native A moved B");
  await p.setDocumentSyncMode(hostA,"off");check(p.getDocumentSyncMode(hostB)==="pinned"&&p.sidecarLeaves.get(hostB)===sideB,"A mode released B");
  check(JSON.stringify({mode:p.settings.documentSyncMode,open:p.settings.sidecarOpen,position:p.settings.sidecarPosition})===defaults,"Live modes changed shared defaults");
  await p.attachAdjacentSidecar(hostA,"to-leaf",p.index.get(path("D")));sideA=p.sidecarLeaves.get(hostA);check(sideA,"A reattachment absent");passed("two-pairs-bidirectional-navigation-modes-and-single-native-open");
  await navigate(hostA,path("A"));await navigate(hostB,path("A"));await sideA.openFile(app.vault.getFileByPath(path("B")),{active:true});await until(()=>center(hostA)===path("B"),"A same-file pair failed native follow");check(center(hostB)===path("A"),"Path-only event broadcast moved B");passed("same-file-distinct-native-leaves");
  const fileA=app.vault.getFileByPath(path("A")),gate=hold(sideA,fileA),first=p.syncSidecarToPage(hostA,p.index.get(path("A")));
  await until(()=>gate.entered,"Held open not admitted");const middle=p.syncSidecarToPage(hostA,p.index.get(path("C"))),last=p.syncSidecarToPage(hostA,p.index.get(path("A")));
  const heldCount=opensA;gate.release();await Promise.all([first,middle,last]);gate.restore();check(p.fileForLeaf(sideA)===fileA,"Held A-B-A did not settle latest");check(opensA-heldCount===1,"Held A-B-A reopened a superseded target");passed("held-native-opens-coalesce-A-B-A");
  if(p.isExcalidrawAvailable()){
   const drawing=await p.createNewFileInFolder("Drawing","excalidraw",c.folder);check(drawing,"Drawing fixture unavailable");p.index.insertCreatedFile(drawing);await navigate(hostA,drawing.path);
   await until(()=>p.fileForLeaf(sideA)===drawing&&typeof sideA.view.openAsMarkdown==="function","Drawing companion did not load");await sideA.view.openAsMarkdown(undefined,true);await until(()=>sideA.getViewState().type==="markdown","Native Open as Markdown did not settle");await wait(150);
   const count=opensA,length=trail(hostA).length;await p.syncPageToDocumentLeaf(p.index.get(drawing.path),hostA);await p.syncSidecarToPage(hostA,p.index.get(drawing.path));await wait(150);
   check(sideA.getViewState().type==="markdown"&&opensA===count&&trail(hostA).length===length,`Same-file drawing observation reopened/duplicated visit: ${JSON.stringify({state:sideA.getViewState(),opensBefore:count,opensAfter:opensA,visitsBefore:length,visitsAfter:trail(hostA).length,center:center(hostA),target:drawing.path})}`);
   await p.openRelationshipEvidenceLocation({path:path("D"),line:0},hostA);check(center(hostA)===drawing.path,"Source inspection moved center");check(sideA.getViewState().type==="markdown"&&p.fileForLeaf(sideA)?.path===path("D"),"Source inspection lost native identity");passed("drawing-as-markdown-and-source-inspection");
  }else throw Error("Excalidraw native acceptance prerequisite unavailable");
  await navigate(hostA,path("A"));await navigate(hostA,path("B"));await navigate(hostA,path("A"));await navigate(hostA,path("C"));
  const aTrail=trail(hostA),bTrail=trail(hostB),tail=Array.from({length:4},(_,i)=>aTrail.at(aTrail.length-4+i).node.identity);check(JSON.stringify(tail)===JSON.stringify([path("A"),path("B"),path("A"),path("C")]),"Repeated chronological visits lost");
  const rootA=rootFor(hostA),bLength=bTrail.length,history=JSON.stringify(p.settings.navigationHistory),active=center(hostA),camera=rootA.querySelector(".kplex-camera").style.transform;let trigger=rootA.querySelector(".kplex-footprints-trigger");
  const findTrigger=rootA.querySelector(".kplex-find button"),footRect=trigger.getBoundingClientRect(),findRect=findTrigger.getBoundingClientRect();
  check(Math.abs(footRect.width-findRect.width)<1&&Math.abs(footRect.height-findRect.height)<1,"Footprints button must share Find's control geometry");
  const footIcon=trigger.querySelector("svg").getBoundingClientRect(),findIcon=findTrigger.querySelector("svg").getBoundingClientRect();
  check(footIcon.width<=findIcon.width&&footIcon.height<=findIcon.height,"Footprints glyph is larger than the magnifier");
  await wait(800);const activityBefore=p.captureIndexingActivity(),counts={demands:0,reads:0,rebuilds:0,settings:0};
  const restores=[wrap(p.index,"acquireSemanticDemand",()=>counts.demands++),wrap(app.vault,"read",()=>counts.reads++),wrap(p,"rebuildIndex",()=>counts.rebuilds++),wrap(p,"saveSettings",()=>counts.settings++)];
  await click(trigger);let panel=trigger.ownerDocument.querySelector(".kplex-footprints-panel");check(panel?.parentElement===trigger.ownerDocument.body,"Footprints portal ownership wrong");
  check(panel.querySelectorAll(".kplex-footprints-row").length<=40,"Unbounded native trail DOM");
  const displayed=[...panel.querySelectorAll(".kplex-footprints-row")].map(row=>Number(row.dataset.footprintOrdinal));
  check(displayed[0]===aTrail.length-1&&displayed.every((ordinal,index)=>!index||ordinal===displayed[index-1]-1),"Footprints must show newest visits first");
  await click(panel.querySelector(`[aria-label="${p.translator("footprints.startHere")}"]`));await escape(trigger.ownerDocument);
  for(const restore of restores)restore();
  check(aTrail.length===1&&bTrail.length===bLength&&JSON.stringify(p.settings.navigationHistory)===history&&center(hostA)===active&&rootA.querySelector(".kplex-camera").style.transform===camera,"Start here affected navigation/history/other trail/camera");
  check(Object.values(counts).every(value=>value===0),`Trail UI admitted resource work: ${JSON.stringify(counts)}`);check(trigger.ownerDocument.activeElement===trigger,"Escape did not return focus");
  const activityAfter=p.captureIndexingActivity(),work={};for(const key of ["vaultReads","parses","sourceInventoryPasses","fullBuildStarts","nodeCatalogStarts","completeSnapshotSaves","checkpointSaves"]){const i=activityAfter.columns.current.indexOf(key);work[key]=activityAfter.current[i]-activityBefore.current[i];check(work[key]===0,`Trail UI changed ${key}`);}passed("native-footprints-repeat-reset-focus-and-zero-index-work",{counts,work});
  await click(trigger);const surface=[...p.actionSurfaceHosts].find(([,owner])=>owner.leaf===hostA)?.[0];check(surface,"Native action surface missing");
  await p.actionManager.dispatch({id:"view.zen.toggle",source:"toolbar",surfaceId:surface});await until(()=>!document.querySelector(".kplex-footprints-panel"),"Zen left a body-portal trail visible");
  await p.actionManager.dispatch({id:"view.zen.toggle",source:"toolbar",surfaceId:surface});trigger=rootFor(hostA).querySelector(".kplex-footprints-trigger");check(trigger&&aTrail.length===1,"Zen discarded the native trail");passed("zen-retires-footprints-portal-without-clearing-trail");
  await navigate(hostA,path("B"));await navigate(hostA,path("A"));await click(trigger);panel=trigger.ownerDocument.querySelector(".kplex-footprints-panel");const firstVisit=aTrail.at(0).id,oldLength=aTrail.length;
  await click(panel.querySelector(`[data-footprint-ordinal="0"]`));await until(()=>aTrail.length===oldLength+1,"Older row selection did not append");check(aTrail.at(0).id===firstVisit,"Older selection truncated history");await escape(trigger.ownerDocument);passed("older-trail-row-appends-through-normal-navigation");
  const renameFile=app.vault.getFileByPath(path("B")),renamed=`${c.folder}/B-renamed.md`,occurrences=Array.from({length:aTrail.length},(_,i)=>aTrail.at(i)).filter(visit=>visit.node.identity===path("B"));
  check(occurrences.length,"Rename acceptance needs existing repeated visits");await app.fileManager.renameFile(renameFile,renamed);
  await until(()=>occurrences.every(visit=>Array.from({length:aTrail.length},(_,i)=>aTrail.at(i)).some(current=>current.id===visit.id&&current.node.identity===renamed)),"Native rename lost occurrence identity");
  await app.vault.delete(renameFile);await app.vault.create(renamed,"# Replacement incarnation\n");
  await click(trigger);panel=trigger.ownerDocument.querySelector(".kplex-footprints-panel");const staleOrdinal=Array.from({length:aTrail.length},(_,i)=>aTrail.at(i)).findIndex(visit=>visit.id===occurrences[0].id),stale=panel.querySelector(`[data-footprint-ordinal="${staleOrdinal}"]`);
  check(stale?.getAttribute("aria-disabled")==="true","Deleted/recreated file retargeted an older visit");const unchanged=aTrail.length;await click(stale);check(aTrail.length===unchanged,"Unavailable row caused navigation");await escape(trigger.ownerDocument);
  await app.fileManager.renameFile(app.vault.getFileByPath(renamed),path("B"));passed("native-rename-preserves-visits-and-recreated-file-remains-unavailable");
  const tag="tag:kplex187/session",folder=`folder:${c.folder}`,url="https://example.com/kplex-187",ghost=`${c.folder}/Missing`;
  await navigate(hostA,path("A"));await until(()=>p.index.get(tag)&&p.index.get(folder),"Fixture tag/folder catalog unavailable");
  p.index.insertUrlPage(url);p.index.insertVirtualPage(ghost);
  const attachment=await app.vault.create(`${c.folder}/attachment.txt`,"Owned attachment fixture\n");p.index.insertCreatedFile(attachment);
  await p.setDocumentSyncMode(hostA,"off");
  for(const identity of [tag,folder,url,ghost,attachment.path])await navigate(hostA,identity);
  await click(trigger);panel=trigger.ownerDocument.querySelector(".kplex-footprints-panel");
  check([...panel.querySelectorAll(".kplex-footprints-row")].some(row=>row.textContent.includes("#kplex187/session")&&row.querySelector("svg")),"Full hierarchical tag/type-icon presentation missing");
  check(Array.from({length:aTrail.length},(_,i)=>aTrail.at(i)).slice(-5).map(visit=>visit.node.kind).join(",")==="tag,folder,url,ghost,file","Supported footprint kinds lost");await escape(trigger.ownerDocument);passed("native-supported-node-types-full-tag-label-and-icons");
  await navigate(hostA,path("A"));await p.openSidecar(hostA,p.index.get(path("A")));sideA=p.sidecarLeaves.get(hostA);
  await navigate(hostB,path("C"));check(p.settings.lastActivePath===path("C"),"Command control needs a different shared last center");
  const modeB=p.getDocumentSyncMode(hostB),centerB=center(hostB);await workspace.revealLeaf(sideA);workspace.setActiveLeaf(sideA,{focus:true});sideA.view.editor?.focus();
  const commandResult=await p.actionManager.dispatch({id:"document.sync-from-center",source:"obsidian-command"});
  check(commandResult.status==="completed"&&center(hostA)===path("A")&&p.fileForLeaf(sideA)?.path===path("A")&&center(hostB)===centerB&&p.getDocumentSyncMode(hostB)===modeB,"Native command used the shared center or affected the other Plex");passed("native-document-command-origin-isolated");
  const duplicate=workspace.getLeaf("tab");await duplicate.setViewState({type:"k-plex-react-view",state:hostA.view.getState(),active:true});await duplicate.view.waitUntilReady();await until(()=>trail(duplicate).length===1,"Duplicated view did not seed fresh trail");
  check(!p.sidecarLeaves.has(duplicate)&&!duplicate.view.documentSession.targetId,"Duplicate stole companion");check(duplicate.view.documentSession!==hostA.view.documentSession,"Duplicate shared native owner");duplicate.detach();passed("native-duplicate-keeps-center-with-independent-session");
  const nativeView=hostA.view,retainedTrail=trail(hostA),visits=retainedTrail.length;workspace.moveLeafToPopout(hostA);await until(()=>hostA.view.contentEl.ownerDocument!==document&&rootFor(hostA),"Popout remount absent");await hostA.view.waitUntilReady();
  check(hostA.view===nativeView&&trail(hostA)===retainedTrail&&trail(hostA).length===visits,"Window migration discarded trail/native session");check(p.sidecarLeaves.get(hostB)===sideB,"Migration released B");
  await click(()=>rootFor(hostA).querySelector(".kplex-footprints-trigger"));const popTrigger=rootFor(hostA).querySelector(".kplex-footprints-trigger");check(popTrigger.ownerDocument.querySelector(".kplex-footprints-panel")?.parentElement===popTrigger.ownerDocument.body,"Popout portal leaked into main window");await escape(popTrigger.ownerDocument);
  const parents=[];workspace.iterateRootLeaves(leaf=>{if(leaf!==hostA&&leaf.view.containerEl.ownerDocument===document&&leaf.view.containerEl.isConnected)parents.push(leaf.parent);});check(parents.length,"No main return group");
  hostA.parent.removeChild(hostA);parents[0].insertChild(parents[0].children.length,hostA);await workspace.revealLeaf(hostA);await until(()=>hostA.view.contentEl.ownerDocument===document&&rootFor(hostA),"Main return absent");await hostA.view.waitUntilReady();check(trail(hostA)===retainedTrail,"Main return replaced trail");passed("same-native-view-popout-and-main-retain-trail-and-own-portals");
  await navigate(hostA,path("A"));await p.openSidecar(hostA,p.index.get(path("A")));sideA=p.sidecarLeaves.get(hostA);await navigate(hostB,path("C"));
  const serialized=JSON.stringify({layout:workspace.getLayout(),settings:p.settings,support:p.captureIndexingActivity()});check(!serialized.includes('"footprints"')&&!serialized.includes('"visits"'),"Ephemeral trail serialized");
  workspace.requestSaveLayout();await p.settingsWriteQueue;await wait(700);
  c.restart={original:c.original,folder:c.folder,pairs:[{host:hostA.id,sidecar:sideA.id,center:center(hostA)},{host:hostB.id,sidecar:sideB.id,center:center(hostB)}],leafIds:nativeLeafIds()};
  for(const restore of c.restores.splice(0).reverse())restore();passed("serialization-excludes-session-trails");
 }).then(()=>{c.status="passed"},error=>{c.status="failed";c.error=String(error.stack??error)}).finally(()=>{c.done=true});return true;
}

/** Wait for one native phase; raw detailed state remains only in the private report directory. */
async function phase(name,saved){evaluate(`(${nativeProbe.toString()})(${JSON.stringify(name)},${JSON.stringify(saved??null)})`);const end=Date.now()+180000;let state;do{await delay(300);state=evaluate('(()=>{const c=window.__kplex187Sessions;return{done:c.done,status:c.status,error:c.error,cases:c.cases,restart:c.restart}})()');assert(Date.now()<end,"Native session phase exceeded deadline");}while(!state.done);report.scenarios.push(...state.cases);writeFileSync(join(output,`${name}.json`),JSON.stringify(state,null,2));assert.equal(state.status,"passed",state.error);return state.restart;}
let restart;
try{
 assert.equal(cli("vault","info=path").replace(/^path /,""),target.vault);report.host=cli("version");
 for(const name of ["main.js","styles.css","manifest.json"]){const built=readFileSync(join(root,"dist",name)),installed=readFileSync(join(target.pluginDir,name));assert(built.equals(installed),`${name}: exact-build staging required`);report.artifacts[name]=createHash("sha256").update(installed).digest("hex");}
 cli("dev:errors","clear");restart=await phase("run");
 // requestSaveLayout is debounced. A restart control must wait for durable native intent,
 // rather than assuming an elapsed renderer delay means workspace.json has been written.
 const durableDeadline=Date.now()+30000;
 while(true){
  const disk=JSON.parse(readFileSync(join(target.config,"workspace.json"),"utf8")),leaves=new Map();
  const visit=value=>{if(!value||typeof value!=="object")return;if(value.type==="leaf"&&typeof value.id==="string")leaves.set(value.id,value.state);for(const child of Object.values(value))if(child&&typeof child==="object"){if(Array.isArray(child))child.forEach(visit);else visit(child);}};visit(disk);
  if(restart.pairs.every(pair=>leaves.get(pair.host)?.state?.plexSession?.centerPath===pair.center&&leaves.get(pair.host)?.state?.plexSession?.targetId===pair.sidecar)&&JSON.stringify([...leaves.keys()].sort())===JSON.stringify(restart.leafIds)){
   writeFileSync(join(output,"durable-workspace-before-reload.json"),JSON.stringify(disk,null,2));break;
  }
  assert(Date.now()<durableDeadline,"Native workspace intent did not reach disk before restart");await delay(200);
 }
 evaluate('(()=>{delete window.__kplex187Sessions;return true})()');cli("reload");
 const end=Date.now()+45000;while(true){try{if(evaluate('Boolean(app.plugins.plugins["k-plex"]?.actionManager)'))break;}catch{}assert(Date.now()<end,"Native renderer reload unavailable");await delay(500);}
 await phase("restore",restart);report.status="passed";
}catch(error){report.status="failed";report.error=String(error.stack??error);}
finally{
 try{if(restart&&!evaluate('Boolean(window.__kplex187Sessions)'))await phase("cleanup",restart);
  evaluate('(()=>{const c=window.__kplex187Sessions;if(c)c.cleanup().catch(error=>{c.cleanupError=String(error.stack??error)});return true})()');
  const end=Date.now()+45000;while(true){const state=evaluate('(()=>{const c=window.__kplex187Sessions;return c?{cleaned:c.cleaned,error:c.cleanupError,phase:c.cleanupPhase}:{cleaned:true}})()');if(state.error)throw Error(state.error);if(state.cleaned)break;assert(Date.now()<end,`Cleanup did not settle at ${state.phase}`);await delay(300);}
  evaluate('(()=>{delete window.__kplex187Sessions;return true})()');report.cleaned=true;
 }catch(error){report.status="failed";report.cleanupError=String(error);}
 try{for(const item of configuration){writeFileSync(item.path,item.bytes);assert(readFileSync(item.path).equals(item.bytes));}report.configurationBytesRestored=true;}catch(error){report.status="failed";report.configurationRestoreError=String(error);}
 report.finishedAt=new Date().toISOString();writeFileSync(join(output,"report.json"),JSON.stringify(report,null,2));console.log(`${report.status}: ${report.scenarios.length} native session scenarios; ${join(output,"report.json")}`);if(report.status!=="passed")process.exitCode=1;
}
