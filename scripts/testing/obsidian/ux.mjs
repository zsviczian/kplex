/** Exact-build UX regressions in an explicitly selected disposable Obsidian vault.
 * Run verify:obsidian first. This driver checks hashes rather than building/staging another bundle.
 * It owns only one fixture folder/view and restores settings, native window geometry and wrappers.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { validateTarget } from "./runner.mjs";
import { gateCountScenarios, layoutEnhancementScenarios } from "./uxLayoutEnhancements.mjs";
import { relationshipEnhancementScenarios } from "./uxRelationshipEnhancements.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const reportDir = process.env.KPLEX_HOST_REPORT_DIR;
const layoutOnly = process.env.KPLEX_UX_LAYOUT_ONLY === "true";
assert(!(layoutOnly && process.env.KPLEX_UX_DEVICE_ONLY === "true"), "Select layout-only or device-only verification separately");
assert(reportDir, "Set KPLEX_HOST_REPORT_DIR explicitly");
mkdirSync(reportDir, { recursive: true });
const report = { status: "running", startedAt: new Date().toISOString(), scenarios: [], target: vaultName, artifacts: {}, limits: ["Desktop Electron functional tests; no physical iPad trackpad or mobile WebView acceptance", "Trusted native pointer input for resize and gate/history; File Explorer drops use the real host payload and DOM handler", "Browser guest creation, sizing and teardown are asserted; remote login, video playback and sites blocking mobile iframes require separate acceptance", "Area settings menu uses Obsidian's public DOM mode; OS-native menu selection is not asserted"] };
report.scope = layoutOnly ? "layout-and-typography-only" : process.env.KPLEX_UX_DEVICE_ONLY === "true" ? "device-only" : "full";
const dataPath = join(target.pluginDir, "data.json");
const originalData = readFileSync(dataPath);
const enabledPath = join(target.config, "community-plugins.json");
const originalEnabled = readFileSync(enabledPath);
const controller = "__kplexUxRegression";
// A retry must not reuse a retired mutation overlay's endpoint identity. Each owned fixture
// has fresh paths; normal Vault cleanup remains responsible for removing its notes afterward.
const folder = "Kplex-UX-Regression-" + Date.now();
report.fixtureFolder = folder;
let installed = false;

/** Keep CLI arguments outside a shell, reject zero-exit eval errors and parse the CLI prefix. */
function cli(name, ...args) {
  const run = spawnSync(process.env.KPLEX_OBSIDIAN_CLI || "obsidian", [`vault=${vaultName}`, name, ...args], { cwd: projectRoot, encoding: "utf8", timeout: 30_000, killSignal: "SIGKILL", maxBuffer: 4 * 1024 * 1024 });
  if (run.error) throw run.error;
  assert.equal(run.status, 0, run.stderr || run.stdout);
  if (/^Error:/m.test(run.stdout)) throw new Error(run.stdout);
  return run.stdout.trim();
}
/** Validate the expression locally and decode a native JSON result without accepting eval errors. */
function evaluate(code) {
  new Script(code);
  const raw = cli("eval", `code=${code}`).replace(/^=>\s*/, "");
  const value = JSON.parse(raw);
  if (value?.error) throw new Error(value.error);
  return value;
}
/** Retry a read-only state probe after a lost CLI response; never repeat a mutation or accept host errors. */
async function readState(code) {
  for (let attempt=0;attempt<3;attempt++) {
    try { return evaluate(code) } catch (error) {
      if (error.code!=="ETIMEDOUT"||attempt===2) throw error;
      report.cliTimeouts=(report.cliTimeouts||0)+1;
      await sleep(250);
    }
  }
}
/** Yield the driver between short CLI reads; native work continues independently. */
const sleep = ms => new Promise(done => setTimeout(done, ms));
/** Poll native work serially; waits report aggregate phases and completed fixture scenarios without changing host state. */
async function until(code, message, timeout = 180_000) {
  const end = Date.now() + timeout;
  let nextProgress = Date.now() + 30_000;
  do {
    let value;
    try { value = evaluate(code) } catch (error) {
      if (error.code !== "ETIMEDOUT") throw error;
      report.cliTimeouts = (report.cliTimeouts || 0) + 1;
      assert(Date.now() < end, message);
      await sleep(1000);
      continue;
    }
    if (value) return value;
    if ((installed || report.deviceOnly) && Date.now() >= nextProgress) {
      try {
        const progress = evaluate(`JSON.stringify((()=>{const p=app.plugins.plugins["k-plex"];return {status:p.getIndexStatus(),progress:p.getStartupDiagnostics().progress,activeSemanticPreparation:p.index.hasActiveSemanticPreparation(),alias:p.index.getUrlAliasUpgradeProgress(),completedScenarios:window.${controller}?.scenarios?.map(s=>s.id),activeInput:document.activeElement?.className}})())`);
        console.log("Native readiness progress:", JSON.stringify(progress));
      } catch (error) {
        // Optional reporting cannot retire still-running native work after a lost CLI response.
        // Keep the same outer deadline and reject actual host errors, as in the primary poll.
        if (error.code !== "ETIMEDOUT") throw error;
        report.cliTimeouts = (report.cliTimeouts || 0) + 1;
      }
      nextProgress = Date.now() + 30_000;
    }
    assert(Date.now() < end, message);
    await sleep(250);
  } while (true);
}
/** Refuse mismatched runtime artifacts before and after native tests, recording exact digests. */
function hashes() {
  for (const name of ["main.js", "manifest.json", "styles.css"]) {
    const digest = path => createHash("sha256").update(readFileSync(path)).digest("hex");
    const source = digest(join(projectRoot, "dist", name)), staged = digest(join(target.pluginDir, name));
    assert.equal(staged, source, `${name} differs from the production build; run verify:obsidian`);
    report.artifacts[name] = source;
  }
}
/** Native controller holds fixture state only; no production debugging API is added. */
const nativeController = `(()=>{
  if(window.${controller})throw new Error("UX controller already exists");
  const p=app.plugins.plugins["k-plex"], remote=require("@electron/remote"), win=remote.getCurrentWindow();
  const c=window.${controller}={p,settings:JSON.parse(JSON.stringify(p.settings)),owned:[],leaf:null,done:false,error:null,
    bounds:win.getBounds(),throttling:win.webContents.getBackgroundThrottling(),sidebars:{left:app.workspace.leftSplit.collapsed,right:app.workspace.rightSplit.collapsed},folder:${JSON.stringify(folder)},
    denseTarget:${JSON.stringify(process.env.KPLEX_UX_DENSE_TARGET || null)},scenarios:[],notices:[]};
  // Track actual persistence promises so native view teardown cannot race original-byte restoration.
  c.settingsWrites=new Set();c.settingsWriteErrors=[];
  const originalSaveData=p.saveData;
  p.saveData=function(...args){const promise=originalSaveData.apply(this,args);c.settingsWrites.add(promise);promise.then(()=>c.settingsWrites.delete(promise),error=>{c.settingsWrites.delete(promise);c.settingsWriteErrors.push(String(error))});return promise};
  c.restoreSettingsWrites=()=>{p.saveData=originalSaveData};
  // Passive bounded pair observations preserve each original call and its Promise identity.
  c.pairTrace=[];
  const index=p.index,source=index.sourceAcquisition,originalPair=index.prepareRelationshipPair,originalSourcePair=source.prepareRequestedPair;
  const tracePair=(owner,args,invoke)=>{const at=performance.now(),pub=index.publicationRevision,revision=p.getIndexSourceRevision(),maintenance=source.getMaintenanceRevision(),paths=owner==="index"?args.slice(0,2):args[0].endpoints.map(ref=>ref.physicalPath??ref.semanticPath),tokens=paths.map(path=>{const file=app.vault.getFileByPath(path);return {path,file,cache:file?app.metadataCache.getFileCache(file):null,mtime:file?.stat.mtime,size:file?.stat.size,event:file?source.getFileRevision(file):null}});
    const observe=(value,error)=>{if(c.pairTrace.length>=128)c.pairTrace.shift();c.pairTrace.push({owner,paths,elapsedMs:performance.now()-at,outcome:error?"threw":owner==="index"?(value?"ready":"not-ready"):value.outcome,reason:owner==="source"?value?.reason:undefined,error:error?String(error):undefined,publicationChanged:pub!==index.publicationRevision,sourceChanged:revision!==p.getIndexSourceRevision(),maintenanceChanged:maintenance!==source.getMaintenanceRevision(),selected:tokens.map(t=>({cacheChanged:Boolean(t.file&&app.metadataCache.getFileCache(t.file)!==t.cache),fileChanged:app.vault.getFileByPath(t.path)!==t.file||t.file?.stat.mtime!==t.mtime||t.file?.stat.size!==t.size,eventChanged:Boolean(t.file&&source.getFileRevision(t.file)!==t.event)}))})};
    let result;try{result=invoke()}catch(error){observe(undefined,error);throw error}result.then(value=>observe(value),error=>observe(undefined,error));return result};
  index.prepareRelationshipPair=function(...args){return tracePair("index",args,()=>originalPair.apply(this,args))};
  source.prepareRequestedPair=function(...args){return tracePair("source",args,()=>originalSourcePair.apply(this,args))};
  c.restorePairTrace=()=>{index.prepareRelationshipPair=originalPair;source.prepareRequestedPair=originalSourcePair};
  // Record bounded observable notices without wrapping plugin actions or changing their result.
  const notices=document.querySelector(".notice-container");
  if(notices){c.noticeObserver=new MutationObserver(()=>{for(const element of notices.querySelectorAll(".notice")){const text=element.textContent;if(text&&!c.notices.includes(text)){c.notices.push(text);if(c.notices.length>12)c.notices.shift()}}});c.noticeObserver.observe(notices,{childList:true,subtree:true,characterData:true})}
  c.wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
  c.frames=()=>new Promise(resolve=>window.requestAnimationFrame(()=>window.requestAnimationFrame(resolve)));
  c.check=(ok,message)=>{if(!ok)throw new Error(message)};
  c.until=async(fn,message,timeout=180000)=>{const end=Date.now()+timeout;while(!fn()){if(Date.now()>end)throw new Error(message);await c.wait(50)}};
  c.root=()=>c.leaf.view.contentEl.querySelector(".kplex-app");
  c.plex=()=>c.root().querySelector(".kplex-plex");
  // Constructor-selected on-demand mode intentionally never grants global source inventory or
  // full-snapshot authority. Keep the selected distinct pair's actual production authority;
  // eager mode retains its full-snapshot prerequisite. Neither a timer nor a graph flag grants it.
  c.authorityTargets=new Map();
  c.primaryReady=()=>{const center=c.root()?.querySelector(".kplex-role-center")?.dataset.kplexPath||p.settings.lastActivePath,target=c.authorityTargets.get(center);
    return !p.index.hasPendingSnapshotHydration()&&!p.index.hasPendingSemanticPreparation()&&!p.index.building&&
      (p.index.isOnDemandMode()?Boolean(center&&target&&p.index.isSemanticWriteReady(center,target)&&p.getIndexStatus().upToDate):p.index.isFullSnapshotHydrated())};
  // Prepare only explicitly selected physical endpoints, using the same pair owner as editing.
  // Pair authority is deliberately narrower than the global dependency-inventory certificate.
  c.prepareAuthority=async(center,target)=>{c.check(center!==target,"Readiness requires distinct selected endpoints");
    for(const path of [center,target]){const file=app.vault.getFileByPath(path);c.check(file?.extension==="md","Readiness endpoint is not physical Markdown: "+path);if(!p.index.get(path))p.index.insertCreatedFile(file)}
    await c.until(()=>!p.index.hasPendingSnapshotHydration()&&!p.index.hasPendingSemanticPreparation()&&!p.index.building,"Selected endpoint graph tasks did not settle");
    c.check(await p.index.prepareRelationshipPair(center,target),"Selected source/pair authority did not prepare: "+center+" / "+target);
    c.check(p.index.isSemanticWriteReady(center,target),"Selected pair is not current after preparation");c.authorityTargets.set(center,target)};
  c.center=()=>c.root().querySelector(".kplex-role-center")?.dataset.kplexPath||p.settings.lastActivePath;
  // Hidden retained controls can share a localized label with the current editor toolbar.
  c.button=(key)=>Array.from(c.root().querySelectorAll("button")).find(b=>b.getAttribute("aria-label")===p.translator(key)&&b.getBoundingClientRect().width>0&&b.getBoundingClientRect().height>0);
  // Use the owning Electron renderer so native Obsidian Scope receives real key/code values.
  // Raw keyDown needs the normal char stage for an unconsumed native Enter/editing gesture.
  c.key=async(target,key,extra={})=>{const doc=target.ownerDocument,view=doc.defaultView,native=view.require("@electron/remote").getCurrentWindow();
    const modifiers=[];if(extra.metaKey)modifiers.push("meta");if(extra.ctrlKey)modifiers.push("control");if(extra.altKey)modifiers.push("alt");if(extra.shiftKey)modifiers.push("shift");
    const keyCode=({ArrowDown:"Down",ArrowUp:"Up",ArrowLeft:"Left",ArrowRight:"Right"})[key]??key;
    const expectedCode=({f:"KeyF",F4:"F4",Enter:"Enter",Escape:"Escape",ArrowDown:"ArrowDown",ArrowUp:"ArrowUp",ArrowLeft:"ArrowLeft",ArrowRight:"ArrowRight"})[key];c.check(expectedCode,"Native UX key lacks an explicit physical receipt expectation");
    native.focus();native.webContents.focus();target.focus({preventScroll:true});
    await c.until(()=>doc.activeElement===target&&doc.hasFocus()&&native.isFocused(),"Native shortcut target did not own focus",5000);
    let observedEvent;
    const observe=event=>{if(event.target===target&&event.key.toLowerCase()===key.toLowerCase()&&event.metaKey===Boolean(extra.metaKey)&&event.ctrlKey===Boolean(extra.ctrlKey)&&event.altKey===Boolean(extra.altKey)&&event.shiftKey===Boolean(extra.shiftKey))observedEvent=event};
    view.addEventListener("keydown",observe,true);
    try{native.webContents.sendInputEvent({type:"keyDown",keyCode,modifiers});await c.until(()=>observedEvent,"Native shortcut keydown receipt missing",5000);
      c.check(observedEvent.isTrusted&&observedEvent.code===expectedCode,"Shortcut lacked its exact trusted physical key receipt");
      c.lastKey={key:observedEvent.key,code:observedEvent.code,trusted:observedEvent.isTrusted,meta:observedEvent.metaKey,ctrl:observedEvent.ctrlKey,alt:observedEvent.altKey,shift:observedEvent.shiftKey,targetClass:target.className,defaultPrevented:observedEvent.defaultPrevented};
      if(!observedEvent.defaultPrevented&&!extra.metaKey&&!extra.ctrlKey&&!extra.altKey&&(key==="Enter"||key.length===1))native.webContents.sendInputEvent({type:"char",keyCode:key==="Enter"?"\\r":key,modifiers});
      await c.wait(25);
    }finally{native.webContents.sendInputEvent({type:"keyUp",keyCode,modifiers});view.removeEventListener("keydown",observe,true)}};
  c.input=(input,text)=>{input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,text);input.dispatchEvent(new Event("input",{bubbles:true}))};
  // Navigation settings update before the React scene. Wait for the actual destination so
  // trusted pointer input cannot race the previous center's navigation-reset effect.
  c.go=async(requestedPath)=>{const target=p.index.get(requestedPath);c.check(target,"Navigation fixture endpoint is unavailable: "+requestedPath);const path=target.path;
    p.notifyNavigation(path);await c.until(()=>p.settings.lastActivePath===path&&c.root().querySelector(".kplex-role-center")?.dataset.kplexPath===path,"Center did not render "+path);await c.frames();
    if(p.index.isOnDemandMode()&&(path===c.hub||path===c.labelCenter))await c.prepareAuthority(path,c.existing)};
  c.openFind=async()=>{app.workspace.setActiveLeaf(c.leaf,{focus:true});c.root().focus();await c.key(c.root(),"f",{metaKey:true});await c.until(()=>c.root().querySelector(".kplex-find-input")===document.activeElement,"Ctrl/Cmd+F focus failed");return document.activeElement};
  c.editor=async(enabled)=>{if(Boolean(p.settings.embedCentralNode)!==enabled){c.button(enabled?"app.useCentralNodeEditor":"app.useNormalCentralNode").click();await c.frames()}
    await c.until(()=>Boolean(c.root().querySelector(".kplex-central-editor-content"))===enabled,"Editor toggle did not render")};
  c.click=async(el)=>{const r=el.getBoundingClientRect();const x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);
    const hit=document.elementFromPoint(x,y);c.lastClick={label:el.getAttribute("aria-label"),point:[x,y],hitLabel:hit?.closest("button")?.getAttribute("aria-label"),hitClass:hit?.getAttribute("class")};
    c.check(hit===el||el.contains(hit),"Trusted click target is covered or outside the viewport: "+JSON.stringify(c.lastClick));
    win.focus();win.webContents.sendInputEvent({type:"mouseMove",x,y});await c.frames();
    win.webContents.sendInputEvent({type:"mouseDown",x,y,button:"left",clickCount:1});
    win.webContents.sendInputEvent({type:"mouseUp",x,y,button:"left",clickCount:1});await c.frames()};
  remote.app.focus({steal:true});win.show();win.focus();win.webContents.setBackgroundThrottling(false);
  // Own the fixture's available pane geometry rather than inheriting sidebars restored by a
  // preceding device run. Retain the established window size for native Canvas resize checks;
  // finally restores both original sidebar states and exact native window bounds.
  app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();
  win.setContentSize(1200,900);
  return JSON.stringify(true);
})()`;

/** Create owned Vault fixtures and prepare their canonical source facts and bounded graph scopes. */
const setup = `(()=>{const c=window.${controller};(async()=>{
  c.check(!app.vault.getAbstractFileByPath(c.folder),"Fixture folder already exists");
  await app.vault.createFolder(c.folder);c.owned.push(c.folder);
  const create=async(name,text)=>{const file=await app.vault.create(c.folder+"/"+name,text);c.owned.push(file.path);return file};
  const groups={Parent:[],Friend:[],Challenger:[],Child:[]};
  for(const role of Object.keys(groups))for(let i=0;i<16;i++){
    const name=role+"-"+String(i).padStart(2,"0")+".md";groups[role].push(c.folder+"/"+name);
    await create(name,i===15?"---\\naliases: [Hidden overflow alias]\\n---\\n":"# "+name);
  }
  c.hub=c.folder+"/Hub.md";c.unrelated=c.folder+"-Unrelated.txt";c.canvas=c.folder+"/Drawing.canvas";
  c.tall=c.folder+"/Tall.png";c.wide=c.folder+"/Wide.png";
  c.existing=c.folder+"/Existing-target.md";await create("Existing-target.md","# Existing composer target");
  c.historyTargets={};for(const role of ["parent","child","left","right"]){const name="History-"+role+".md";c.historyTargets[role]=c.folder+"/"+name;await create(name,"# History target "+role)}
  const yaml=Object.entries(groups).map(([role,paths])=>role+":\\n"+paths.map(path=>"  - '[["+path+"]]'").join("\\n")).join("\\n");
  await create("Hub.md","---\\n"+yaml+"\\n---\\n# Hub\\n");
  // A same-folder attachment legitimately appears in sibling/folder-descendant projections.
  // Keep the Vault-only candidate outside the hub's physical folder without hiding those features.
  const unrelated=await app.vault.create(c.unrelated,"Unrelated whole-vault file");c.owned.push(unrelated.path);
  await create("Grandchild.md","# Expanded descendant");
  await create("URLs.md","[First Help alias](https://help.obsidian.md)\\n[Second Help alias](https://help.obsidian.md)\\n[User domain](https://Obsidian.md)\\n[Video](https://www.youtube.com/watch?v=dQw4w9WgXcQ)\\n[Shorts](https://www.youtube.com/shorts/dQw4w9WgXcQ)\\n[Vimeo](https://vimeo.com/76979871)");
  const longTitle="Meaningful connected knowledge and long book titles ".repeat(3);
  c.labelCenter=c.folder+"/Center "+longTitle.trim()+".md";c.labelPaths={};
  for(const role of ["Parent","Child","Friend","Challenger"]){
    const name=role+" "+longTitle.trim()+".md";c.labelPaths[role]=c.folder+"/"+name;await create(name,"# Long label");
    if(role!=="Challenger")await create("Short "+role+".md","# Short label");
  }
  await create(c.labelCenter.slice(c.folder.length+1),"---\\n"+["Parent","Child","Friend","Challenger"].map(role=>role+": ["+JSON.stringify("[["+c.labelPaths[role]+"]]")+(role!=="Challenger"?", "+JSON.stringify("[["+c.folder+"/Short "+role+".md]]"):"")+"]").join("\\n")+"\\n---\\n");
  const first=app.vault.getFileByPath(groups.Child[0]);await app.vault.modify(first,"---\\nChild: '[["+c.folder+"/Grandchild.md]]'\\n---\\n");
  await create("Drawing.canvas",JSON.stringify({nodes:[{id:"ux-text",type:"text",x:0,y:0,width:250,height:120,text:"Canvas UX test"}],edges:[]}));
  for(const [name,width,height]of [["Tall.png",592,1000],["Wide.png",2000,250]]){
    const canvas=createFragment().createEl("canvas");canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext("2d");ctx.fillStyle="#3c78aa";ctx.fillRect(0,0,width,height);
    for(const [color,x,y]of [["#ff0000",0,0],["#00ff00",width*0.9,0],["#0000ff",0,height*0.9],["#ffff00",width*0.9,height*0.9]]){ctx.fillStyle=color;ctx.fillRect(x,y,width*0.1,height*0.1)}
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
    const file=await app.vault.createBinary(c.folder+"/"+name,await blob.arrayBuffer());c.owned.push(file.path);
  }
  await c.until(()=>[c.hub,...Object.values(groups).flat(),c.folder+"/Grandchild.md"].every(path=>app.metadataCache.getFileCache(app.vault.getFileByPath(path))),"Fixture metadata did not settle");
  await c.wait(1000);
  Object.assign(c.p.settings,{embedCentralNode:false,documentSyncMode:"off",followActiveFile:false,autoOpenCentralDocument:false,
    renderAlias:false,
    graphDepth:2,maxItemCount:100,parentMaxHeight:160,childMaxHeight:180,friendMaxHeight:160,parentColumns:1,childColumns:1,
    graphLenses:[],animationSpeed:0,showAttachments:true,attachmentImageDisplay:"thumbnail-label",lastActivePath:c.hub,navigationHistory:[c.hub]});
  c.p.settings.layoutProfiles={...c.p.settings.layoutProfiles,"desktop:leaf":{...c.p.settings.layoutProfiles["desktop:leaf"],parentColumns:1,childColumns:1}};
  // Seed only the owned fixture while old global aliases remain optional background work.
  // Requested scopes materialize its current canonical relationships without forcing grammar
  // repair across the unrelated scale vault; every temporary demand is released in cleanup.
  await c.p.rebuildIndex(false,false,"ux-fixture-quiescence");
  const legacyAliasesPending=c.p.index.hasPendingSearchVocabulary(),localFixture=c.p.index.isOnDemandMode();
  if(localFixture||legacyAliasesPending){
    const ownedMarkdown=c.owned.filter(path=>path.endsWith(".md"));
    await c.p.index.patchMarkdownPaths(ownedMarkdown);
    c.fixtureDemands=[c.hub,c.folder+"/Child-00.md",c.folder+"/URLs.md"].map(path=>c.p.index.acquireSemanticDemand(path));
    c.p.notifyNavigation(c.hub);await c.p.index.refreshSemanticSettings();
  }else await c.p.rebuildIndex(false,true,"ux-fixture-seed");
  // Exact pair acquisition is supported before global inventory in on-demand sessions. It
  // cannot certify the whole vault, and self-pairs are explicitly unsupported by the writer.
  await c.prepareAuthority(c.hub,c.existing);
  c.check(localFixture?c.p.index.isSemanticWriteReady(c.hub,c.existing):c.p.index.isFullSnapshotHydrated(),"Fixture graph seeding lacks its mode's authority");
  await c.until(()=>c.primaryReady(),"Fixture primary graph/current-view semantics did not settle",900000);
  // A complete rendered graph may precede the initial source inventory. Establish actual
  // editable authority during fixture setup, so cold source acquisition is not attributed
  // to the first gesture's existing action deadline. Neither delay nor graph flags grant it.
  if(localFixture){c.check(await c.p.index.sourceAcquisition.repository.flush(),"Fixture selected source persistence remains incomplete");c.check(c.p.index.isSemanticWriteReady(c.hub,c.existing),"Fixture selected pair lost current authority during persistence")}
  else{c.check(await c.p.index.flushSourceRepository(),"Fixture source reconciliation remains incomplete");c.check(c.p.index.sourceAcquisition.hasSemanticDependencies(),"Fixture lacks source dependency authority")}
  c.fixtureReadiness={mode:localFixture?"on-demand-owned-patch-and-requested-scopes":legacyAliasesPending?"owned-patch-and-requested-scopes":"full-seed",authorityPair:[c.hub,c.existing],pairReady:c.p.index.isSemanticWriteReady(c.hub,c.existing),globalDependencies:c.p.index.sourceAcquisition.hasSemanticDependencies(),status:c.p.getIndexStatus(),aliasVocabularyPending:c.p.index.hasPendingSearchVocabulary(),source:c.p.index.getSourceAcquisitionCounters()};
  for(const path of [c.tall,c.wide,c.canvas,c.unrelated])c.p.index.insertCreatedFile(app.vault.getFileByPath(path));
  const fixtureHub=c.p.index.get(c.hub);c.check(fixtureHub&&c.p.index.isSemanticWriteReady(c.hub,c.existing),"Fixture hub is not canonically editable");
  for(const [group,role]of [["Parent","parent"],["Friend","left"],["Challenger","right"],["Child","child"]]){
    const expected=new Set(groups[group]),actual=c.p.index.neighbours(fixtureHub,role).filter(item=>expected.has(item.page.path));
    c.check(actual.length===16&&new Set(actual.map(item=>item.page.path)).size===16&&actual.every(item=>c.p.index.get(item.page.path)===item.page),"Fixture "+group+" canonical relationships/counts were not materialized");
  }
  c.fixtureAliases=["Parent","Friend","Challenger","Child"].map(role=>({role,aliases:c.p.index.get(c.folder+"/"+role+"-15.md")?.aliases}));
  c.check(c.fixtureAliases.every(item=>item.aliases.includes("Hidden overflow alias")),"Fixture aliases were not indexed");
  c.check(c.p.index.titleFor(c.p.index.get(c.folder+"/Parent-15.md")).includes("Parent-15"),"Find fixture must select file labels while retaining unused aliases");
  c.check(c.p.index.neighbours(c.p.index.get(c.folder+"/Child-00.md"),"child").some(item=>item.page.path===c.folder+"/Grandchild.md"),"Fixture expanded relationship was not materialized");
  app.workspace.setActiveLeaf(c.leaf,{focus:true});await c.until(()=>c.root()?.querySelector(".kplex-role-center"),"Fixture Plex did not render");
  await c.go(c.hub);
  // The user may disable navigation auto-fit, and normal index publications preserve camera.
  // Fit this fully materialized owned fixture through its real toolbar before pointer checks.
  const fixtureFit=c.button("graph.fitGraph");c.check(fixtureFit,"Fixture Fit control is unavailable");fixtureFit.click();await c.frames();
  await c.until(()=>["parent","child","left","right"].every(zone=>{const element=c.root().querySelector(".kplex-zone-"+zone+" .kplex-zone-filter-button"),r=element?.getBoundingClientRect(),v=c.plex().getBoundingClientRect();return r&&r.width>0&&r.height>0&&r.left>=v.left&&r.right<=v.right&&r.top>=v.top&&r.bottom<=v.bottom}),"Fitted fixture area controls did not become visible");
  c.done=true;
})().catch(e=>{c.error=e.stack;c.done=true});return JSON.stringify(true)})()`;

/** Run UI workflows using production React handlers, native FileViews and trusted captured-pointer input. */
/** One exact assertion block shared by broad UX and the explicitly scoped typography lane. */
const labelLayoutAcceptanceScenarios = `
  // Locate issue #70's actual nested settings page, then exercise its real control writer.
  c.ownsSettings=true;app.setting.open();app.setting.openTabById("k-plex");
  const tab=app.setting.pluginTabs.find(t=>t.id==="k-plex");
  for(const key of ["settings.ui.visual.styling","settings.ui.node.styling"]){const row=Array.from(app.setting.getCurrentPageEl().querySelectorAll(".setting-item")).find(el=>el.querySelector(".setting-item-name")?.textContent===p.translator(key));c.check(row,"Label settings subpage missing: "+key);row.click();await c.frames()}
  for(const key of ["settings.ui.max.label.length","settings.ui.wrap.node.labels","settings.ui.maximum.node.width","settings.ui.maximum.central.node.width"]){
    const name=key==="settings.ui.maximum.central.node.width"?p.translator(key):p.translator("typography.deviceField",{device:p.translator("typography.sharedDefaults"),field:p.translator(key)});
    const row=Array.from(app.setting.getCurrentPageEl().querySelectorAll(".setting-item")).find(el=>el.querySelector(".setting-item-name")?.textContent===name);c.check(row?.querySelector("input,.checkbox-container"),"Label control missing from rendered settings: "+key)}
  app.setting.close();c.ownsSettings=false;
  p.settings.graphDepth=1;p.settings.layoutProfiles={...p.settings.layoutProfiles,"desktop:leaf":{...p.settings.layoutProfiles["desktop:leaf"],parentColumns:2,childColumns:2}};
  // The two-line sample needs a fixed font: a saved 8px base can fit this title on one line.
  // The driver's original settings snapshot restores the caller's typography after the fixture.
  // These are shared-default controls. A saved Desktop override intentionally wins over them;
  // start this owned fixture in inheritance mode, preserving all width/wrap assertions below.
  await p.resetTypographyOverride("desktop");
  await tab.setControlValue("baseFontSize",12.4);
  await tab.setControlValue("baseNodeStyle.maxLabelLength",120);await tab.setControlValue("baseNodeStyle.maxWidth",800);await tab.setControlValue("centralNodeStyle.maxWidth",1000);
  await c.go(c.labelCenter);
  const labelEvidence=[];
  for(const wrap of [false,true]){
    // A wide short-font title can legitimately fit on one line; constrain the wrap case explicitly.
    await tab.setControlValue("baseNodeStyle.maxWidth",wrap?320:800);
    await tab.setControlValue("wrapNodeLabels",wrap);await c.until(()=>Boolean(root.querySelector(".kplex-role-center .is-two-line"))===wrap,"Wrap control did not update the rendered scene");await c.frames();
    const nodes=Array.from(root.querySelectorAll(".kplex-thought")).filter(n=>[c.labelCenter,...Object.values(c.labelPaths),...Object.keys(c.labelPaths).map(role=>c.folder+"/Short "+role+".md")].includes(n.dataset.kplexPath));
    c.check(nodes.length===8,"Long-label fixture did not render its exact neighborhood");
    const rects=nodes.map(n=>({path:n.dataset.kplexPath,role:n.className,rect:n.getBoundingClientRect(),height:parseFloat(n.style.height),width:parseFloat(n.style.width)}));
    for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i].rect,b=rects[j].rect;c.check(a.right<=b.left+.5||b.right<=a.left+.5||a.bottom<=b.top+.5||b.bottom<=a.top+.5,"Long-label nodes overlap: "+rects[i].path+" / "+rects[j].path)}
    const regular=rects.filter(n=>n.path!==c.labelCenter);c.check(regular.some(n=>n.width>286),"Maximum node width control did not permit larger labels");c.check(rects.find(n=>n.path===c.labelCenter).width>370,"Central maximum width control did not permit a larger title");c.check(new Set(regular.map(n=>n.height)).size===1,"Short/long regular nodes have unequal row heights");
    if(wrap){const text=nodes.find(n=>n.dataset.kplexPath===c.labelPaths.Friend).querySelector(".kplex-thought-text"),style=getComputedStyle(text),scale=nodes[0].getBoundingClientRect().height/parseFloat(nodes[0].style.height);c.check(style.whiteSpace==="normal"&&style.webkitLineClamp==="2"&&text.getBoundingClientRect().height/scale>parseFloat(style.lineHeight)*1.5,"Native long title did not occupy two lines: "+JSON.stringify({whiteSpace:style.whiteSpace,clamp:style.webkitLineClamp,height:text.getBoundingClientRect().height,scale,lineHeight:style.lineHeight,fontSize:style.fontSize,width:text.getBoundingClientRect().width,textLength:text.textContent.length}))}
    const historyButton=Array.from(root.querySelectorAll("[data-kplex-history-path]")).find(n=>n.dataset.kplexHistoryPath===c.labelCenter),historyText=historyButton?.querySelector(".kplex-history-text");c.check(historyText,"History label text box missing");
    const first=historyText.ownerDocument.createRange();first.setStart(historyText.firstChild,0);first.setEnd(historyText.firstChild,1);c.check(first.getBoundingClientRect().left>=historyText.getBoundingClientRect().left-.5,"History title clips its beginning");
    const historyStyle=getComputedStyle(historyText),historyHeight=root.querySelector(".kplex-history-bar").getBoundingClientRect().height;
    c.check(wrap?historyStyle.whiteSpace==="normal"&&historyStyle.webkitLineClamp==="2"&&historyText.getBoundingClientRect().height>parseFloat(historyStyle.lineHeight)*1.5:historyStyle.whiteSpace==="nowrap"&&historyText.scrollWidth>historyText.clientWidth,"History did not follow label wrapping mode");
    c.check(historyHeight===(wrap?52:40),"History row did not reserve its configured text height");
    labelEvidence.push({wrap,regularHeight:regular[0].height,widths:rects.map(n=>n.width),historyHeight});
  }
  record("label-controls-wide-nodes-fixed-two-line-height-no-overlap",{settingsPath:["Visual styling","Node styling","Node appearance"],modes:labelEvidence});
  ${layoutEnhancementScenarios}
`;

const scenarios = `(()=>{const c=window.${controller};c.done=false;(async()=>{
  const record=(id,evidence={})=>c.scenarios.push({id,status:"passed",...evidence});
  const p=c.p, root=c.root();
  // Measure the real toolbar at different pane widths without changing persisted workspace geometry.
  const toolbar=root.querySelector(".kplex-topbar"),oldWidth=toolbar.style.getPropertyValue("width"),oldPriority=toolbar.style.getPropertyPriority("width"),toolbarWidths=[];
  try{for(const width of [1500,1100,700,570,300]){toolbar.style.setProperty("width",width+"px");await c.frames();const search=toolbar.querySelector(".kplex-search-shell").getBoundingClientRect(),actions=toolbar.querySelector(".kplex-top-actions").getBoundingClientRect(),filter=toolbar.querySelector(".kplex-top-actions").previousElementSibling.getBoundingClientRect();toolbarWidths.push({pane:width,width:search.width,gap:actions.left-filter.right-parseFloat(getComputedStyle(toolbar).gap),sameRow:Math.abs(actions.top-search.top)<5})}
    const [wide,middle,tight,minimum,narrow]=toolbarWidths;c.check(wide.sameRow&&middle.sameRow&&tight.sameRow&&minimum.sameRow,"Toolbar wrapped before consuming search width");c.check(Math.abs(wide.width-middle.width)<1&&middle.gap<wide.gap,"Toolbar margin must shrink before search width");c.check(tight.gap<1&&tight.width<middle.width&&minimum.width>=100,"Toolbar search did not shrink after margin disappeared");c.check(!narrow.sameRow,"Toolbar did not wrap below its usable minimum");
  }finally{oldWidth?toolbar.style.setProperty("width",oldWidth,oldPriority):toolbar.style.removeProperty("width");await c.frames()}
  record("toolbar-margin-search-shrink-before-wrap",{widths:toolbarWidths});
  const controlProperties=["width","height","backgroundColor","borderRadius","color","borderTopWidth","borderTopColor","padding","boxShadow"];
  const controlStyle=element=>{const style=getComputedStyle(element);return Object.fromEntries(controlProperties.map(property=>[property,style[property]]))};
  const assertControlStyle=async elements=>{require("@electron/remote").getCurrentWindow().webContents.sendInputEvent({type:"mouseMove",x:0,y:0});await c.frames();const expected=controlStyle(root.querySelector(".kplex-zoom-controls button"));for(const element of elements){c.check(element,"Expected Plex control is missing");c.check(JSON.stringify(controlStyle(element))===JSON.stringify(expected),"Plex control differs from zoom: "+element.getAttribute("aria-label")+JSON.stringify({actual:controlStyle(element),expected}))}};
  const sharedSelectors=[".kplex-find button",".kplex-layout-toggle",".kplex-zoom-controls button",".kplex-sidecar-primary",...["parent","child","left","right"].map(role=>".kplex-zone-"+role+" .kplex-zone-filter-button")];
  await assertControlStyle(sharedSelectors.map(selector=>root.querySelector(selector)));
  c.check(getComputedStyle(root.querySelector(".kplex-find")).backgroundColor==="rgba(0, 0, 0, 0)","Find wrapper has an opaque surface");
  const styleWc=require("@electron/remote").getCurrentWindow().webContents,hoverStyles=[];
  for(const selector of sharedSelectors){
    const element=root.querySelector(selector),rect=element.getBoundingClientRect();
    const x=Math.round(rect.left+rect.width/2),y=Math.round(rect.top+rect.height/2),hit=document.elementFromPoint(x,y),viewport=c.plex().getBoundingClientRect();
    // Retain only the latest finite geometry and hit classes, with no note labels or contents.
    c.lastHover={selector,point:[x,y],rect:{left:rect.left,top:rect.top,width:rect.width,height:rect.height},viewport:{left:viewport.left,top:viewport.top,width:viewport.width,height:viewport.height},hitClass:hit?.getAttribute("class"),hitsTarget:hit===element||element.contains(hit),camera:root.querySelector(".kplex-camera")?.style.transform};
    styleWc.sendInputEvent({type:"mouseMove",x,y});await c.frames();
    c.check(element.matches(":hover"),"Button hover input did not reach "+selector);
    const style=getComputedStyle(element);hoverStyles.push({color:style.color,background:style.backgroundColor,border:style.border});
  }
  styleWc.sendInputEvent({type:"mouseMove",x:0,y:0});await c.frames();
  c.check(hoverStyles.every(style=>JSON.stringify(style)===JSON.stringify(hoverStyles[0])),"Plex controls have inconsistent hover styles");
  record("all-area-filters-sidecar-Find-configuration-match-zoom-style",{normal:controlStyle(root.querySelector(".kplex-find button")),hoverStyles});
  const overflowEvidence=[];
  // Probe narrow panel CSS without changing saved dimensions or the scene's node geometry.
  for(const zone of ["parent","child","left","right"]){
    const panel=root.querySelector(".kplex-zone-"+zone),trigger=panel.querySelector(".kplex-zone-filter-button");
    const oldPanelWidth=panel.style.getPropertyValue("width"),oldPanelPriority=panel.style.getPropertyPriority("width");
    panel.style.setProperty("width","100px");
    try {
      trigger.click();await c.frames();
      const field=panel.querySelector(".kplex-zone-filter-input"),r=field.getBoundingClientRect(),bounds=panel.getBoundingClientRect(),plex=c.plex().getBoundingClientRect();
      c.check(getComputedStyle(panel).overflow==="visible"&&getComputedStyle(panel.querySelector(".kplex-zone-scroll")).overflowX==="hidden","Area controls or node list have the wrong clipping policy: "+zone);
      c.check(r.left<bounds.left,"Narrow native fixture must exercise an overflowing filter: "+zone);
      const buttonBounds=trigger.getBoundingClientRect();
      c.check(r.bottom<bounds.top&&buttonBounds.bottom<bounds.top,"Area filter overlaps its node region: "+zone);
      c.check(Math.abs(buttonBounds.right-bounds.right)<0.5,"Area filter is not right-aligned with its scroll region: "+zone);
      const x=Math.max(r.left+5,plex.left+5),y=r.top+r.height/2;
      c.check(document.elementFromPoint(x,y)===field,"Overflowing area input is clipped or covered: "+zone+JSON.stringify({point:[x,y],field:r.toJSON(),panel:bounds.toJSON(),hit:document.elementFromPoint(x,y)?.className,stack:document.elementsFromPoint(x,y).slice(0,5).map(el=>el.className)}));
      overflowEvidence.push({zone,fieldWidth:r.width,overflow:bounds.left-r.left,point:[x,y],clearance:bounds.top-Math.max(r.bottom,buttonBounds.bottom),rightEdgeOffset:buttonBounds.right-bounds.right});
      trigger.click();await c.frames();c.check(!panel.querySelector(".kplex-zone-filter-input"),"Area filter failed to close: "+zone);
    } finally {oldPanelWidth?panel.style.setProperty("width",oldPanelWidth,oldPanelPriority):panel.style.removeProperty("width");await c.frames()}
  }
  record("area-filter-overflow-with-node-scroll-clipping",{areas:overflowEvidence});
  // A synthetic root event does not move native focus. Local actions prepare against the actual
  // focused surface, so retire the just-closed area input's focus before testing this binding.
  app.workspace.setActiveLeaf(c.leaf,{focus:true});root.focus();c.check(root.ownerDocument.activeElement===root,"Plex did not own focus before Vault search shortcut");
  await c.key(root,"F4");await c.until(()=>document.activeElement===root.querySelector(".kplex-search"),"F4 did not focus Vault search");
  const vaultInput=document.activeElement;
  p.settings.showAttachments=false;
  for(const term of ["Unrelated.txt","Tall.png","Drawing.canvas"]){
    c.input(vaultInput,term);await c.until(()=>root.querySelector(".kplex-search-results")?.textContent.includes(term),"Vault search missing "+term);
    c.check(c.center()===c.hub,"Vault typing changed center");
  }
  p.settings.showAttachments=true;
  await c.key(vaultInput,"Enter");await c.until(()=>c.center()===c.canvas,"Vault Enter did not activate the selected Canvas file");
  await c.until(()=>vaultInput.value==="","Vault activation did not clear its query");await c.go(c.hub);
  // Enter closes/blurs the shared suggester; reopen its focus lifetime before another Vault query.
  app.workspace.setActiveLeaf(c.leaf,{focus:true});root.focus();c.check(root.ownerDocument.activeElement===root,"Plex did not own focus before repeated Vault search shortcut");
  await c.key(root,"F4");await c.until(()=>document.activeElement===root.querySelector(".kplex-search"),"F4 did not refocus Vault search after activation");
  c.check(vaultInput===document.activeElement,"Vault search input changed after Canvas activation");
  for(const term of ["help.obsidian.md","First Help alias","Second Help alias"]){
    c.input(vaultInput,term);await c.until(()=>root.querySelector(".kplex-search-results")?.textContent.includes("https://help.obsidian.md"),"Vault URL/alias search missing "+term);
  }
  await c.key(vaultInput,"Escape");record("F4-whole-vault-files-URL-multiple-aliases");
  let find=await c.openFind();c.check(!root.querySelector(".kplex-find button[aria-expanded]"),"Expanded Find must hide its magnifier");c.check(!root.querySelector(".kplex-search-results"),"Find opened Vault results");
  const originalTheme={light:document.body.classList.contains("theme-light"),dark:document.body.classList.contains("theme-dark")},findTheme=[];
  const luminance=color=>color.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
  try{for(const dark of [false,true]){
    document.body.classList.toggle("theme-dark",dark);document.body.classList.toggle("theme-light",!dark);await c.frames();
    for(const focused of [false,true]){focused?find.focus():find.blur();await c.frames();c.check((document.activeElement===find)===focused,"Find input did not enter the requested focus state");const s=getComputedStyle(find),a=luminance(s.color),b=luminance(s.backgroundColor),contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);c.check(contrast>=4.5,"Find text unreadable in "+(dark?"dark":"light")+" mode, focused="+focused);findTheme.push({dark,focused,color:s.color,background:s.backgroundColor,contrast})}
  }}finally{document.body.classList.toggle("theme-light",originalTheme.light);document.body.classList.toggle("theme-dark",originalTheme.dark);find.focus();await c.frames()}
  record("Plex-Find-focused-unfocused-theme-contrast",{states:findTheme});
  const parentScroll=root.querySelector(".kplex-zone-parent .kplex-zone-scroll");
  c.check(parentScroll?.scrollHeight>parentScroll.clientHeight,"Parent fixture must overflow");
  parentScroll.scrollTop=parentScroll.scrollHeight;parentScroll.dispatchEvent(new Event("scroll",{bubbles:true}));await c.frames();
  const parentScrollBefore=parentScroll.scrollTop;
  const parentHit=Array.from(root.querySelectorAll(".kplex-role-parent")).find(n=>n.dataset.kplexPath===c.folder+"/Parent-15.md");
  c.check(parentHit&&parentHit.getBoundingClientRect().top<parentScroll.getBoundingClientRect().top,"Parent hit must start outside the viewport");
  c.input(find,"Parent-15");await c.until(()=>root.querySelector(".kplex-role-parent.is-highlighted"),"Projected hit not highlighted");
  await c.frames();c.check(!root.querySelector(".kplex-edge.is-highlighted"),"Note matches must not highlight incident relationships");
  c.input(find,"Parent");await c.frames();c.check(!root.querySelector(".kplex-edge.is-highlighted"),"Hidden generic ontology must not highlight connectors");
  c.input(find,"Parent-15");await c.frames();
  c.check(!root.querySelector(".kplex-find [role=listbox],.kplex-find [role=option]"),"Find rendered a dropdown");
  await c.until(()=>{const n=parentHit.getBoundingClientRect(),v=parentScroll.getBoundingClientRect();return n.top>=v.top-1&&n.bottom<=v.bottom+1},"Find did not reveal overflow hit");
  c.check(parentScroll.scrollTop<parentScrollBefore,"Find did not move the parent overflow list to its hit");
  const centerBefore=c.center(),historyBefore=JSON.stringify(p.settings.navigationHistory);
  c.input(find,"Hidden overflow alias");await c.frames();c.check(root.querySelectorAll(".kplex-thought.is-highlighted").length===0,"Find matched an unused alias");
  // The owned folder's basename is a legitimate visible folder-parent label. Its trailing
  // separator occurs only in the flat owned notes' paths, so this term isolates hidden paths.
  const pathToggle=c.button("find.includePath");c.check(pathToggle,"Extended path toggle missing");c.check(pathToggle.getAttribute("aria-pressed")==="false","Find must start with displayed labels only");
  c.input(find,c.folder+"/");await c.frames();c.check(root.querySelectorAll(".kplex-thought.is-highlighted").length===0,"Default Find matched hidden paths");
  pathToggle.click();await c.frames();
  c.check(pathToggle.getAttribute("aria-pressed")==="true"&&root.querySelectorAll(".kplex-thought.is-highlighted").length>3,"Extended path search did not include projected paths");
  c.check(!root.querySelector(".kplex-edge.is-highlighted"),"Path mode matched incidental connectors");pathToggle.click();await c.frames();
  c.input(find,"-15");await c.until(()=>root.querySelectorAll(".kplex-thought.is-highlighted").length===4,"Displayed labels should cover four projected regions",5000);
  await c.key(find,"Enter");await c.frames();await c.key(find,"Enter",{shiftKey:true});await c.frames();
  c.check(c.center()===centerBefore&&JSON.stringify(p.settings.navigationHistory)===historyBefore,"Find changed navigation history");
  c.check(!Array.from(root.querySelectorAll("[data-kplex-path]")).some(node=>node.dataset.kplexPath===c.unrelated),"Vault-only candidate must be outside the displayed Plex projection");
  c.input(find,"Unrelated.txt");await c.frames();c.check(root.querySelectorAll(".kplex-thought.is-highlighted").length===0,"Find searched an off-Plex file");
  const childScroll=root.querySelector(".kplex-zone-child .kplex-zone-scroll");childScroll.scrollTop=0;childScroll.dispatchEvent(new Event("scroll",{bubbles:true}));await c.frames();
  c.input(find,"Grandchild");await c.frames();c.check(root.querySelector(".kplex-expanded-mini-thought.is-find-match"),"Find missed expanded descendant");
  await c.key(find,"Escape");await c.frames();record("independent-Plex-Find-displayed-values-path-toggle-overflow-expanded-history");
  await p.setGraphLenses([{id:"ux-exclude",name:"UX exclude",enabled:true,scope:"node",mode:"exclude",expression:'node.path.equals("'+c.folder+'/Parent-15.md")'}]);
  find=await c.openFind();c.input(find,"Parent-15");await c.frames();c.check(root.querySelectorAll(".kplex-thought.is-highlighted").length===0,"Find included a lens-excluded node");
  await c.key(find,"Escape");await p.setGraphLenses([]);record("Plex-Find-projection-excludes");
  // Exercise the actual portaled Filter shell with trusted pointer input. Its form state stays
  // caller-owned; moving the header must not pan the Plex, change semantics or steal field focus.
  const filterTrigger=c.button("filter.trigger"),filterWc=require("@electron/remote").getCurrentWindow().webContents;
  c.check(filterTrigger,"Filter trigger missing");await c.click(filterTrigger);
  await c.until(()=>document.querySelector(".kplex-filter-portal .kplex-filter-panel-header"),"Draggable Filter header did not render");
  let filterPanel=document.querySelector(".kplex-filter-portal");
  const filterHeader=filterPanel.querySelector(".kplex-filter-panel-header"),filterField=filterPanel.querySelector(".kplex-quick-lens-row input"),filterBefore=filterPanel.getBoundingClientRect();
  c.check(filterPanel.ownerDocument===root.ownerDocument&&filterHeader.classList.contains("kplex-draggable-dialog-handle"),"Filter drag uses the wrong document or shared handle");
  filterField.focus();const filterValueBefore=filterField.value,filterSemantic=p.index.getSemanticRevision(),filterHistory=JSON.stringify(p.settings.navigationHistory),filterCamera=root.querySelector(".kplex-camera").style.transform;
  const dragHandle=filterHeader.querySelector("span"),handleBounds=dragHandle.getBoundingClientRect();
  const fx=Math.round(handleBounds.left+Math.min(30,handleBounds.width/2)),fy=Math.round(handleBounds.top+handleBounds.height/2);
  const fdx=filterBefore.left>90?-70:70,fdy=Math.max(8,Math.min(filterBefore.top+25,innerHeight-filterBefore.height-8))-filterBefore.top;
  c.check(dragHandle.contains(document.elementFromPoint(fx,fy)),"Filter drag header is covered");
  let filterPointerTrusted=false;
  const observeFilterPointer=event=>{filterPointerTrusted=event.isTrusted};
  filterHeader.addEventListener("pointerdown",observeFilterPointer,{once:true});
  try{
    filterWc.sendInputEvent({type:"mouseMove",x:fx,y:fy});filterWc.sendInputEvent({type:"mouseDown",x:fx,y:fy,button:"left",clickCount:1});await c.frames();
    for(let step=1;step<=5;step++){filterWc.sendInputEvent({type:"mouseMove",x:Math.round(fx+fdx*step/5),y:Math.round(fy+fdy*step/5),modifiers:["leftbuttondown"]});await c.frames()}
  }finally{
    filterWc.sendInputEvent({type:"mouseUp",x:Math.round(fx+fdx),y:Math.round(fy+fdy),button:"left",clickCount:1});filterHeader.removeEventListener("pointerdown",observeFilterPointer);await c.frames();
  }
  const filterMoved=filterPanel.getBoundingClientRect();
  c.check(filterPointerTrusted&&filterPanel.classList.contains("is-positioned")&&Math.abs(filterMoved.left-filterBefore.left)>30,"Trusted Filter header drag did not move its panel");
  c.check(filterMoved.left>=7&&filterMoved.right<=innerWidth-7&&filterMoved.top>=7&&filterMoved.bottom<=innerHeight-7,"Dragged Filter panel escaped its viewport");
  c.check(document.activeElement===filterField&&filterField.value===filterValueBefore&&root.querySelector(".kplex-camera").style.transform===filterCamera,"Dragging Filter changed form value, focus or Plex camera: "+JSON.stringify({focusClass:document.activeElement?.className,valueBefore:filterValueBefore,valueAfter:filterField.value,cameraBefore:filterCamera,cameraAfter:root.querySelector(".kplex-camera").style.transform}));
  filterPanel.dispatchEvent(new Event("scroll"));await c.frames();
  c.check(Math.abs(filterPanel.getBoundingClientRect().left-filterMoved.left)<1&&Math.abs(filterPanel.getBoundingClientRect().top-filterMoved.top)<1,"Filter scroll snapped its panel back to the anchor");
  filterWc.sendInputEvent({type:"keyDown",keyCode:"Escape"});filterWc.sendInputEvent({type:"keyUp",keyCode:"Escape"});
  await c.until(()=>!document.querySelector(".kplex-filter-portal"),"Escape did not dismiss Filter");
  c.check(document.activeElement===filterTrigger&&!filterPanel.classList.contains("kplex-draggable-dialog")&&!filterPanel.style.getPropertyValue("--kplex-dialog-left"),"Filter dismissal failed focus or drag cleanup");
  await c.click(filterTrigger);await c.until(()=>document.querySelector(".kplex-filter-portal"),"Filter did not reopen");filterPanel=document.querySelector(".kplex-filter-portal");
  const filterReopened=filterPanel.getBoundingClientRect();
  c.check(!filterPanel.classList.contains("is-positioned")&&Math.abs(filterReopened.left-filterBefore.left)<1&&Math.abs(filterReopened.top-filterBefore.top)<1,"Reopened Filter retained stale dragged coordinates");
  await c.click(filterPanel.querySelector('button[aria-label="'+p.translator("filter.closePanel")+'"]'));
  c.check(!document.querySelector(".kplex-filter-portal")&&document.activeElement===filterTrigger,"Filter close button did not dismiss and restore its trigger");
  c.check(p.index.getSemanticRevision()===filterSemantic&&JSON.stringify(p.settings.navigationHistory)===filterHistory,"Filter drag changed graph semantics or navigation");
  record("Filter-panel-trusted-drag-scroll-dismiss-reopen-cleanup",{trusted:filterPointerTrusted,before:{left:filterBefore.left,top:filterBefore.top},dragged:{left:filterMoved.left,top:filterMoved.top},reopened:{left:filterReopened.left,top:filterReopened.top}});
  // Read production filter controls rather than private React state, proving contains/reflow and
  // center retention through the actual Find action. Restore local filtering before later gestures.
  find=await c.openFind();const findFilter=c.button("find.applyFilter");
  c.check(findFilter?.disabled&&!findFilter.hasAttribute("title"),"Find filter action must be disabled for empty input without a native tooltip");
  c.input(find,"Parent-15");await c.frames();
  const findFilterCenter=c.center(),findFilterHistory=JSON.stringify(p.settings.navigationHistory),findFilterSemantic=p.index.getSemanticRevision(),findParentsBefore=Array.from(root.querySelectorAll(".kplex-role-parent")).map(node=>node.dataset.kplexPath).sort();
  await c.click(findFilter);
  await c.until(()=>root.querySelectorAll(".kplex-role-parent").length===1&&root.querySelectorAll(".kplex-thought:not(.kplex-role-center)").length===1&&!root.querySelector(".kplex-expanded-mini-thought"),"Find contains filter did not reflow the matching neighborhood");
  c.check(root.querySelector(".kplex-role-parent")?.dataset.kplexPath===c.folder+"/Parent-15.md"&&c.center()===findFilterCenter,"Find filtering failed to retain exact match and center");
  c.check(find.value==="Parent-15"&&JSON.stringify(p.settings.navigationHistory)===findFilterHistory,"Applying Find filter changed its query or navigation");
  await c.click(filterTrigger);filterPanel=document.querySelector(".kplex-filter-portal");
  const quickRow=filterPanel.querySelector(".kplex-quick-lens-row"),quickSelections=Array.from(quickRow.querySelectorAll("select")),reflow=filterPanel.querySelector('input[aria-label="'+p.translator("filter.reflowAria")+'"]');
  c.check(quickSelections[0]?.value==="node.label"&&quickSelections[1]?.value==="contains"&&quickRow.querySelector("input")?.value==="Parent-15"&&reflow?.checked,"Find action did not use the existing contains/reflow controls");
  c.check(p.index.getSemanticRevision()===findFilterSemantic,"Find filtering rebuilt graph semantics");
  filterPanel.querySelector('button[aria-label="'+p.translator("filter.closePanel")+'"]').click();await c.frames();
  c.check(findFilter.getAttribute("aria-pressed")==="true","Find filter did not expose its active state");
  await c.click(findFilter);await c.frames();
  c.check(findFilter.getAttribute("aria-pressed")==="false"&&find.value==="Parent-15","Find second press did not turn filtering off and retain its query");
  await c.click(findFilter);await c.frames();c.input(find,"Parent-14");await c.click(findFilter);
  await c.until(()=>root.querySelectorAll(".kplex-role-parent").length===1&&root.querySelector(".kplex-role-parent").dataset.kplexPath===c.folder+"/Parent-14.md","Changed Find term did not replace its active filter");
  c.input(find,"");await c.frames();c.check(!findFilter.disabled,"Blank Find query trapped the active filter");await c.click(findFilter);await c.frames();
  c.check(findFilter.getAttribute("aria-pressed")==="false","Blank-query press failed to turn filtering off");
  await c.key(find,"Escape");await c.until(()=>JSON.stringify(Array.from(root.querySelectorAll(".kplex-role-parent")).map(node=>node.dataset.kplexPath).sort())===JSON.stringify(findParentsBefore),"Clearing Find filter did not restore the exact neighborhood");
  record("Plex-Find-apply-existing-label-contains-reflow-center-retained",{field:"node.label",operator:"contains",value:"Parent-15",layout:"reflow",semanticUnchanged:true});
  const indicator=root.querySelector(".kplex-index-status");indicator.click();await c.frames();
  c.check(!document.querySelector(".kplex-vault-stats"),"Single click opened About vault");
  indicator.dispatchEvent(new MouseEvent("dblclick",{bubbles:true}));await c.frames();
  c.statsModalEl=document.querySelector(".kplex-vault-stats")?.closest(".modal");
  c.check(document.querySelector(".kplex-vault-stats"),"Double click did not open About vault");
  document.querySelector(".kplex-vault-stats").closest(".modal").querySelector(".modal-content button.mod-cta").click();record("about-vault-double-click");
  const tap=()=>{indicator.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerType:"touch",pointerId:7,isPrimary:true,button:0}));indicator.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerType:"touch",pointerId:7,isPrimary:true,button:0}))};
  tap();await c.frames();c.check(!document.querySelector(".kplex-vault-stats"),"Single touch opened About vault");
  tap();await c.frames();c.check(document.querySelector(".kplex-vault-stats"),"Double tap did not open About vault");
  c.statsModalEl=document.querySelector(".kplex-vault-stats").closest(".modal");
  document.querySelector(".kplex-vault-stats").closest(".modal").querySelector(".modal-content button.mod-cta").click();record("about-vault-completed-touch-pair");
  c.button("graph.fitGraph").click();await c.frames();
  const gateWindow=require("@electron/remote").getCurrentWindow(),wc=gateWindow.webContents;
  const dragGate=async(to,side="bottom",hoverTarget=null,expectedPreview=null)=>{app.workspace.setActiveLeaf(c.leaf,{focus:true});gateWindow.show();gateWindow.focus();await c.frames();const gate=root.querySelector('.kplex-role-center [data-kplex-gate="'+side+'"]'),a=gate.getBoundingClientRect();
    const x=Math.round(a.x+a.width/2),y=Math.round(a.y+a.height/2);
    const originHit=document.elementFromPoint(x,y);c.lastGate={side,origin:[x,y],originClass:originHit?.getAttribute("class"),destination:to};
    c.check(originHit?.closest("[data-kplex-gate]")===gate,"Trusted gate drag must start on its visible gate: "+JSON.stringify(c.lastGate));
    // Observe trusted input at the owning root, so a lost native input delivery is distinguished
    // from a production handler failure. The bounded listener always ends with this gesture.
    c.dragEvents=[];const eventTypes=["pointerdown","pointermove","pointerup","pointercancel","gotpointercapture","lostpointercapture"];
    const observe=event=>{if(c.dragEvents.length<32)c.dragEvents.push({type:event.type,pointer:event.pointerId,button:event.button,buttons:event.buttons,gate:event.target.closest?.("[data-kplex-gate]")?.dataset.kplexGate,center:c.root().querySelector(".kplex-role-center")?.dataset.kplexPath,trusted:event.isTrusted})};
    for(const type of eventTypes)root.addEventListener(type,observe,true);
    try{
      wc.sendInputEvent({type:"mouseMove",x,y});wc.sendInputEvent({type:"mouseDown",x,y,button:"left",clickCount:1});await c.frames();
      for(let step=1;step<=5;step++){wc.sendInputEvent({type:"mouseMove",x:Math.round(x+(to.x-x)*step/5),y:Math.round(y+(to.y-y)*step/5),modifiers:["leftbuttondown"]});await c.frames()}
      if(expectedPreview){c.check(root.querySelector(".kplex-area-"+expectedPreview+".is-relationship-drop-area"),"Gate action area did not highlight");record("trusted-gate-area-preview",{role:expectedPreview})}
      if(hoverTarget){const hit=document.elementFromPoint(Math.round(to.x),Math.round(to.y));c.lastGate.hover={expectedPath:hoverTarget.dataset.kplexHistoryPath,connected:hoverTarget.isConnected,hitClass:hit?.getAttribute("class"),hitPath:hit?.closest("[data-kplex-history-path]")?.dataset.kplexHistoryPath,gateBlocked:Array.from(p.index.gateNeighbourPaths(p.index.get(c.center()),side)),connector:root.querySelector(".kplex-drag-connector")?.getAttribute("d")};c.check(hoverTarget.classList.contains("is-relationship-drop-target"),"History target did not light during drag: "+JSON.stringify(c.lastGate.hover))}
      wc.sendInputEvent({type:"mouseUp",x:Math.round(to.x),y:Math.round(to.y),button:"left",clickCount:1});await c.frames();
      c.check(!root.querySelector(".is-relationship-drop-area"),"Gate release retained area feedback");
      c.check(c.dragEvents.some(event=>event.type==="pointerdown"&&event.gate===side&&event.trusted),"Trusted gate pointerdown was not delivered");
      c.check(c.dragEvents.some(event=>event.type==="pointerup"&&event.trusted),"Trusted gate release was not delivered");
      if(hoverTarget)c.check(!hoverTarget.classList.contains("is-relationship-drop-target"),"History hover did not clear on release");
    }finally{for(const type of eventTypes)root.removeEventListener(type,observe,true)}
  };
  const modal=()=>document.querySelector(".kplex-add-related-modal");
  c.check(!modal(),"An existing relationship dialog is open");c.ownsRelationModal=true;
  const linkButton=()=>modal()?.querySelector(".kplex-add-related-link-button");
  // FileManager can write shortest wiki links or Markdown links. Verify MetadataCache resolves
  // the persisted property to the actual target, rather than requiring an absolute raw string.
  const linked=async(path,field)=>{await c.until(()=>{
      const storage=app.vault.getFileByPath(c.hub),cache=app.metadataCache.getFileCache(storage);
      return cache?.frontmatterLinks?.some(ref=>(ref.key===field||ref.key.startsWith(field+"."))&&app.metadataCache.getFirstLinkpathDest(ref.link,storage.path)?.path===path);
    },"Relationship not persisted: "+field+" → "+path);
    await c.until(()=>Boolean(p.index.get(c.hub)?.neighbours.get(path)),"Relationship not published");
    const evidence=p.index.explainRelationship(c.hub,path);c.check(evidence,"Relationship lacks provenance");return evidence};
  const bounds=c.plex().getBoundingClientRect();await dragGate({x:bounds.right-50,y:bounds.bottom-120},"bottom",null,"child");
  await c.until(()=>modal(),"Empty gate drag did not open composer");
  const targetInput=modal().querySelector(".kplex-add-related-note-search input");
  // Type only after modal autofocus has settled; initial focus resets its typed-results lifetime.
  await c.until(()=>document.activeElement===targetInput,"Composer note input did not focus");await c.frames();c.input(targetInput,"Existing-target");
  await c.until(()=>document.querySelector(".kplex-search-results")?.textContent.includes("Existing-target"),"Existing note not suggested");
  await c.key(targetInput,"Enter");await c.frames();c.check(linkButton()&&!linkButton().disabled,"Existing selection did not enable Link");
  const ontology=modal().querySelector(".kplex-add-related-ontology-search input");
  c.input(ontology,"");modal().querySelector(".kplex-fuzzy-disclosure").click();await c.frames();
  c.check(document.querySelector(".kplex-search-results"),"Empty ontology disclosure did not show fields");
  await c.key(ontology,"Enter");await c.frames();const selectedField=ontology.value;c.check(selectedField,"Ontology dropdown did not select a field");
  linkButton().click();await c.until(()=>!modal(),"Existing-target Link failed to close after commit");
  await linked(c.existing,selectedField);record("gate-composer-existing-target-Link-and-empty-ontology-disclosure",{field:selectedField});
  const showPosition=p.showKplexMenuAtPosition;
  p.showKplexMenuAtPosition=function(menu,position,doc){menu.setUseNativeMenu(false);return showPosition.call(this,menu,position,doc)};
  try{for(const role of ["parent","child","left","right"]){
    const path=c.historyTargets[role];await c.go(path);await c.go(c.hub);
    const button=Array.from(root.querySelectorAll("[data-kplex-history-path]")).find(b=>b.dataset.kplexHistoryPath===path);
    c.check(button,"History target not rendered");button.scrollIntoView({block:"nearest",inline:"center"});await c.frames();
    const r=button.getBoundingClientRect();await dragGate({x:r.x+r.width/2,y:r.y+r.height/2},{parent:"top",child:"bottom",left:"left",right:"right"}[role],button);
    await c.until(()=>modal(),"Gate-to-history did not open fixed-target composer");
    c.check(!document.querySelector(".menu .menu-item"),"Specific gate unexpectedly opened a relationship-role menu");
    const field=modal().querySelector(".kplex-add-related-ontology-search input").value;linkButton().click();await c.until(()=>!modal(),"History Link did not commit");
    await linked(path,field);c.check(p.index.neighbours(p.index.get(c.hub),role).some(n=>n.page.path===path),"History relationship has the wrong role: "+role);
    record("gate-to-history-commit-"+role,{field});
  }}finally{p.showKplexMenuAtPosition=showPosition}
  // A node-body drag has no physical gate role; preserve the chooser and cancellation semantics.
  const bodyMenuPresenter=p.showKplexMenuAtPosition;
  p.showKplexMenuAtPosition=function(menu,position,doc){menu.setUseNativeMenu(false);return bodyMenuPresenter.call(this,menu,position,doc)};
  try{
    const targetPath=c.historyTargets.child;
    const target=Array.from(root.querySelectorAll("[data-kplex-history-path]")).find(b=>b.dataset.kplexHistoryPath===targetPath);
    c.check(target,"Body/history target missing");target.scrollIntoView({block:"nearest",inline:"center"});await c.frames();
    // Overflow transforms can leave an existing DOM row clipped. Select a genuinely exposed
    // parent body and authenticate the trusted-input hit instead of dragging a clipped row.
    const thought=Array.from(root.querySelectorAll(".kplex-thought.kplex-role-parent")).find(n=>{
      const r=n.getBoundingClientRect(),hit=root.ownerDocument.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return hit?.closest(".kplex-thought")===n&&!hit.closest("[data-kplex-gate],button");
    });
    c.check(thought,"No exposed parent body for history drag");
    const originPath=thought.dataset.kplexPath,originFile=app.vault.getFileByPath(originPath),before=await app.vault.read(originFile);
    const a=thought.getBoundingClientRect(),b=target.getBoundingClientRect(),x=Math.round(a.x+a.width/2),y=Math.round(a.y+a.height/2),tx=Math.round(b.x+b.width/2),ty=Math.round(b.y+b.height/2);
    c.lastBodyDrag={originPath,origin:[x,y],destination:[tx,ty]};
    wc.sendInputEvent({type:"mouseMove",x,y});wc.sendInputEvent({type:"mouseDown",x,y,button:"left",clickCount:1});await c.frames();
    for(let step=1;step<=5;step++){wc.sendInputEvent({type:"mouseMove",x:Math.round(x+(tx-x)*step/5),y:Math.round(y+(ty-y)*step/5),modifiers:["leftbuttondown"]});await c.frames();}
    c.check(target.classList.contains("is-relationship-drop-target"),"Body/history hover missing");
    wc.sendInputEvent({type:"mouseUp",x:tx,y:ty,button:"left",clickCount:1});await c.frames();
    await c.until(()=>document.querySelector(".menu .menu-item"),"Body history drop did not offer roles");
    const labels=["role.parent","role.child","role.friend","role.challenger"].map(k=>p.translator(k)),items=Array.from(document.querySelectorAll(".menu .menu-item"));
    c.check(labels.every(label=>items.some(i=>i.textContent.includes(label))),"Body history chooser lacks a role");
    items.find(i=>i.textContent.includes(p.translator("role.friend"))).click();await c.until(()=>modal(),"Body chooser did not open composer");
    wc.sendInputEvent({type:"keyDown",keyCode:"Escape"});wc.sendInputEvent({type:"keyUp",keyCode:"Escape"});await c.frames();
    c.check(!modal()&&!target.classList.contains("is-relationship-drop-target"),"Body cancellation left composer or hover");
    c.check(await app.vault.read(originFile)===before,"Cancelling history relationship changed the source");
    record("body-to-history-four-role-menu-cancel-preserves-source");
  }finally{p.showKplexMenuAtPosition=bodyMenuPresenter}
  // Non-Markdown history endpoints must write and reconcile through their Markdown origin.
  // A committed property is checked separately from published role/provenance and the ability to
  // remove it immediately; source/cache events during the save must not turn success into an error.
  // An optional existing scale target is read-only: only the owned Hub property is edited.
  const denseFile=c.denseTarget?app.vault.getFileByPath(c.denseTarget):null;
  const denseBefore=denseFile?await app.vault.read(denseFile):null;
  if(c.denseTarget)c.check(denseFile,"Configured scale target is missing");
  const denseUrl=p.index.get("https://example.com");
  const releaseUnrelated=denseUrl?p.index.acquireSemanticDemand(denseUrl.path):null;
  const nonMarkdownMenu=p.showKplexMenuAtPosition;
  p.showKplexMenuAtPosition=function(menu,position,doc){menu.setUseNativeMenu(false);return nonMarkdownMenu.call(this,menu,position,doc)};
  try{for(const requestedPath of [c.tall,"https://Obsidian.md",...(c.denseTarget?[c.denseTarget]:[])]){
    // Keep the source URL's lexical spelling, but compare navigation, provenance and publication
    // against the actual canonical endpoint returned by the index's ordinary identity boundary.
    const endpoint=p.index.get(requestedPath);c.check(endpoint,"Non-Markdown fixture endpoint is missing: "+requestedPath);const path=endpoint.path;await c.go(path);await c.go(c.hub);
    const button=Array.from(root.querySelectorAll("[data-kplex-history-path]")).find(b=>b.dataset.kplexHistoryPath===path);
    c.check(button,"Non-Markdown history endpoint missing");button.scrollIntoView({block:"nearest",inline:"center"});await c.frames();
    const r=button.getBoundingClientRect();await dragGate({x:r.x+r.width/2,y:r.y+r.height/2},"bottom",button);
    await c.until(()=>modal(),"Non-Markdown history drop did not open composer");
    const field=modal().querySelector(".kplex-add-related-ontology-search input").value;
    const fullBuilds=p.index.getIndexDiagnostics().filter(entry=>entry.reason.startsWith("full-rebuild:")).length;
    linkButton().click();await c.until(()=>!modal(),"Non-Markdown Link reported a preparation error");
    await c.until(()=>{const f=app.vault.getFileByPath(c.hub),fm=app.metadataCache.getFileCache(f)?.frontmatter;return fm&&p.valueContainsTarget(fm[field],f,p.index.get(path))},"Non-Markdown property not persisted");
    await c.until(()=>p.index.neighbours(p.index.get(c.hub),"child").some(n=>n.page.path===path),"Persisted non-Markdown child was not published");
    const decisions=p.index.explainRelationship(c.hub,path)?.decisions??[];
    const candidate=await p.directFrontmatterUnlinkCandidate(decisions.map(d=>d.evidence));
    c.check(candidate?.declaredByPath===c.hub&&candidate.declaredTargetPath===path,"Non-Markdown child lost exact editable provenance");
    c.check(await p.unlinkFrontmatterEvidence(candidate),"Immediate non-Markdown unlink failed");
    await c.until(()=>!p.index.neighbours(p.index.get(c.hub),"child").some(n=>n.page.path===path),"Unlinked non-Markdown child remained published");
    for(const role of ["parent","child","left","right"]){
      c.check(p.index.neighbours(p.index.get(c.hub),role).some(n=>n.page.path===c.historyTargets[role]),"A subsequent pair edit hid an earlier saved history relationship: "+role);
    }
    for(const [role,name] of [["parent","Parent"],["child","Child"],["left","Friend"]]){
      c.check(p.index.neighbours(p.index.get(c.hub),role).some(n=>n.page.path===c.folder+"/"+name+"-00.md"),"A pair edit hid an unrelated existing relationship: "+role);
    }
    c.check(p.index.getIndexDiagnostics().filter(entry=>entry.reason.startsWith("full-rebuild:")).length===fullBuilds,"One relationship mutation rebuilt the entire vault");
    record("history-persist-publish-immediate-unlink",{kind:path===c.denseTarget?"scale-document":p.index.get(path)?.url?"url":"attachment",field,unrelatedUrlDemand:Boolean(denseUrl)});
  }
    if(denseFile)c.check(await app.vault.read(denseFile)===denseBefore,"Linking an existing scale target changed its source");
  }finally{releaseUnrelated?.();p.showKplexMenuAtPosition=nonMarkdownMenu}
  // Test a real preceding document so embedded-leaf detach cannot silently follow it back.
  c.previousLeaf=app.workspace.getLeaf(true);await c.previousLeaf.openFile(app.vault.getFileByPath(c.tall));
  await p.setDocumentSyncMode("recent");
  app.workspace.setActiveLeaf(c.leaf,{focus:true});await c.go(c.tall);await c.editor(true);
  await c.until(()=>root.querySelector('[data-type="image"] img')?.complete,"Tall native image did not load");
  const imageCheck=()=>{const img=root.querySelector('[data-type="image"] img'),frame=img.closest(".view-content"),r=img.getBoundingClientRect(),f=frame.getBoundingClientRect(),style=getComputedStyle(img);
    c.check(style.objectFit==="contain","Native image does not contain-fit");c.check(r.width<=f.width+1&&r.height<=f.height+1,"Native image exceeds its editor bounds");
    c.check(Math.abs(r.x+r.width/2-f.x-f.width/2)<1&&Math.abs(r.y+r.height/2-f.y-f.height/2)<1,"Native image box is not centered");return {image:[r.width,r.height],frame:[f.width,f.height],objectFit:style.objectFit}};
  const paintedImage=async()=>{const img=root.querySelector('[data-type="image"] img'),owner=img.ownerDocument.defaultView,frame=img.closest(".view-content");
    let decodeTimer;try{await Promise.race([img.decode(),new Promise((_,reject)=>decodeTimer=owner.setTimeout(()=>reject(new Error("Native image decode did not settle")),5000))]);}finally{owner.clearTimeout(decodeTimer)}
    let previousGeometry=null,stableGeometry=0;
    c.lastImagePaint={natural:[img.naturalWidth,img.naturalHeight],samples:[]};
    await c.until(()=>{
      const ancestors=[];for(let node=img;node;node=node.parentElement){ancestors.push(node);if(node===root)break;}
      const r=img.getBoundingClientRect(),f=frame.getBoundingClientRect();
      const geometry=JSON.stringify([r.x,r.y,r.width,r.height,f.x,f.y,f.width,f.height]);
      const settled=img.isConnected&&img.complete&&img.naturalWidth>0&&r.width>0&&r.height>0&&ancestors.every(node=>Number(owner.getComputedStyle(node).opacity)>=.999&&!node.getAnimations().some(animation=>animation.playState==="running"||animation.pending));
      stableGeometry=settled&&geometry===previousGeometry?stableGeometry+1:0;previousGeometry=geometry;
      c.lastImagePaint.ancestors=ancestors.map(node=>({className:node.className,opacity:owner.getComputedStyle(node).opacity,activeAnimations:node.getAnimations().filter(animation=>animation.playState==="running"||animation.pending).length}));
      c.lastImagePaint.geometry=JSON.parse(geometry);return stableGeometry>=2;
    },"Native image geometry/ancestor animation did not settle",5000);
    // Calculate after settling: a pre-frame rectangle can belong to a prior navigation transform.
    const r=img.getBoundingClientRect(),scale=Math.min(r.width/img.naturalWidth,r.height/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;
    const x=r.x+(r.width-w)/2,y=r.y+(r.height-h)/2,rectangle={x:Math.round(x),y:Math.round(y),width:Math.round(w),height:Math.round(h)};
    let pixels,previousPixels=null,stablePaint=false;const deadline=Date.now()+5000;
    while(Date.now()<deadline){
      // Use the same explicit NativeImage representation for dimensions and bitmap on Retina displays.
      const capture=await wc.capturePage(rectangle),size=capture.getSize(1),bitmap=capture.toBitmap({scaleFactor:1});
      c.check(bitmap.length===size.width*size.height*4,"Native capture bitmap dimensions do not match its selected representation");
      const pixel=(sx,sy)=>{const i=(Math.round(sy*(size.height-1))*size.width+Math.round(sx*(size.width-1)))*4;return [bitmap[i+2],bitmap[i+1],bitmap[i]]};
      pixels=[[.04,.04],[.96,.04],[.04,.96],[.96,.96]].map(([sx,sy])=>pixel(sx,sy));
      const currentPixels=JSON.stringify(pixels);c.lastImagePaint.samples.push(pixels);if(c.lastImagePaint.samples.length>8)c.lastImagePaint.samples.shift();
      if(currentPixels===previousPixels){stablePaint=true;break;}previousPixels=currentPixels;await c.wait(50);
    }
    // Stability is independent of the expected colors; stable cropping still fails the exact check.
    c.check(stablePaint,"Native image paint did not settle: "+JSON.stringify(c.lastImagePaint));
    const expected=[[255,0,0],[0,255,0],[0,0,255],[255,255,0]];
    c.check(pixels.every((sample,i)=>sample.every((value,j)=>Math.abs(value-expected[i][j])<25)),"Image corner content cropped/distorted: "+JSON.stringify(pixels));
    return {natural:[img.naturalWidth,img.naturalHeight],painted:[w,h],pixels}};
  // Keep small-editor fit assertions, then use the real maximized native surface for exact pixels.
  // At a tiny camera scale, its top corner swatches can sit beneath the sibling toolbar's shadow.
  await c.frames();const smallTall=imageCheck(),tallCamera=root.querySelector(".kplex-camera").style.transform;
  await c.click(c.button("centralEditor.maximize"));await c.until(()=>root.querySelector(".kplex-central-editor-content.is-maximized"),"Tall image editor did not maximize",5000);
  const tallPaint=await paintedImage(),maximizedTall=imageCheck();
  await c.click(c.button("centralEditor.restore"));await c.until(()=>!root.querySelector(".kplex-central-editor-content.is-maximized")&&Math.abs(root.querySelector('[data-type="image"] img').getBoundingClientRect().width-smallTall.image[0])<1&&Math.abs(root.querySelector('[data-type="image"] img').getBoundingClientRect().height-smallTall.image[1])<1,"Tall image editor did not restore original geometry",5000);
  c.check(root.querySelector(".kplex-camera").style.transform===tallCamera,"Tall image maximize/restore changed the Plex camera");
  const tall={...imageCheck(),maximized:maximizedTall,paint:tallPaint,cameraBefore:tallCamera,cameraAfter:root.querySelector(".kplex-camera").style.transform};
  record("native-image-tall-corners-contain",{tall});
  find=await c.openFind();c.input(find,"Tall");await c.frames();
  const editorFindState={query:find.value,pathMode:c.button("find.includePath").getAttribute("aria-pressed")};
  const editorMenuPresenter=p.showKplexMenuAtPosition;
  c.escapeTrace=[];const observeMenuKey=event=>{if(event.key==="Escape"&&c.escapeTrace.length<8)c.escapeTrace.push({type:event.type,key:event.key,tracked:Boolean(p.activeKplexMenu),closed:Boolean(p.justClosedKplexMenu),leaf:app.workspace.activeLeaf?.view.getViewType(),prevented:event.defaultPrevented})};
  window.addEventListener("keydown",observeMenuKey,true);window.addEventListener("keyup",observeMenuKey,true);
  p.showKplexMenuAtPosition=function(menu,position,doc){menu.setUseNativeMenu(false);return editorMenuPresenter.call(this,menu,position,doc)};
  try{for(const maximized of [false,true]){
    if(maximized){await c.until(()=>c.button("centralEditor.maximize"),"Visible editor maximize button missing",2000);await c.click(c.button("centralEditor.maximize"));await c.until(()=>root.querySelector(".kplex-central-editor-content.is-maximized"),"Editor maximize did not activate");}
    const findSurface=root.querySelector(".kplex-find");
    c.check(maximized?getComputedStyle(findSurface).display==="none":getComputedStyle(findSurface).display!=="none","Find visibility did not follow editor maximization");
    c.check(findSurface.querySelector("input").value===editorFindState.query,"Maximization lost Find query");
    const openButton=root.querySelector('.kplex-central-editor-toolbar button[aria-label="'+p.translator("graph.openMenu")+'"]');
    await assertControlStyle(Array.from(root.querySelectorAll(".kplex-central-editor-toolbar button")));
    c.menuFocus=[{phase:"before",type:app.workspace.activeLeaf?.view.getViewType(),host:app.workspace.activeLeaf===c.leaf}];
    c.check(openButton?.querySelector("svg.lucide-ellipsis-vertical"),"Editor ellipsis menu icon missing");
    c.check(openButton.parentElement.querySelector("button:last-child")===openButton,"Editor menu must be the last button in both sizes");await c.click(openButton);
    await c.until(()=>Array.from(document.querySelectorAll(".menu .menu-item")).some(item=>item.textContent.includes(p.translator("graph.openMenu"))),"Editor button did not open the shared node context menu");
    // Obsidian's native Menu scope expects host keyboard input; a synthetic event with
    // no native key code can leave the menu covering the adjacent maximize control.
    c.menuFocus.push({phase:"opened",type:app.workspace.activeLeaf?.view.getViewType(),host:app.workspace.activeLeaf===c.leaf,tracked:Boolean(p.activeKplexMenu)});
    wc.sendInputEvent({type:"keyDown",keyCode:"Escape"});wc.sendInputEvent({type:"keyUp",keyCode:"Escape"});
    await c.until(()=>!document.querySelector(".menu .menu-item"),"Editor context menu did not dismiss with Escape");
    c.menuFocus.push({phase:"closed",type:app.workspace.activeLeaf?.view.getViewType(),host:app.workspace.activeLeaf===c.leaf,embedded:Boolean(app.workspace.activeLeaf?.containerEl.closest(".kplex-central-editor-overlay"))});
    record("editor-shared-context-menu-"+(maximized?"maximized":"normal"));
  }}finally{p.showKplexMenuAtPosition=editorMenuPresenter;window.removeEventListener("keydown",observeMenuKey,true);window.removeEventListener("keyup",observeMenuKey,true)}
  await c.click(c.button("centralEditor.restore"));await c.frames();
  c.check(!root.querySelector(".kplex-find").classList.contains("is-suspended")&&root.querySelector(".kplex-find-input").value===editorFindState.query,"Editor restore did not preserve Find");
  c.check(c.button("find.includePath").getAttribute("aria-pressed")===editorFindState.pathMode,"Editor restore lost path-search mode");
  await c.key(root.querySelector(".kplex-find-input"),"Escape");record("maximized-editor-suspends-preserves-Plex-Find");
  await c.go(c.wide);await c.until(()=>root.querySelector('[data-type="image"] img')?.complete&&root.querySelector('[data-type="image"] img')?.naturalWidth===2000,"Second native image did not load");
  const widePaint=await paintedImage(),wide={...imageCheck(),paint:widePaint};const history=JSON.stringify(p.settings.navigationHistory);
  await c.click(root.querySelector('[data-type="image"] img'));
  await c.click(c.button("app.useNormalCentralNode"));await c.wait(250);
  c.check(c.center()===c.wide&&JSON.stringify(p.settings.navigationHistory)===history,"Collapsing second image navigated back");
  await p.setDocumentSyncMode("off");
  await c.go(c.tall);await c.until(()=>root.querySelector(".kplex-role-center .kplex-node-visual img")?.complete,"Tall thumbnail missing");
  const thumb=root.querySelector(".kplex-role-center .kplex-node-visual img").getBoundingClientRect(),node=root.querySelector(".kplex-role-center").getBoundingClientRect();
  c.check(Math.abs(thumb.y+thumb.height/2-node.y-node.height/2)<1,"Tall thumbnail is off vertical center");record("native-image-fit-collapse-history-thumbnail",{tall,wide,thumbnailCenterError:Math.abs(thumb.y+thumb.height/2-node.y-node.height/2)});
  await c.go(c.hub);
  // The host may choose an OS menu, which has no renderer DOM. Force only this owned menu to
  // the public DOM mode, then use its real item and restore the presenter immediately.
  const showMenu=p.showKplexMenuAtMouseEvent;
  p.showKplexMenuAtMouseEvent=function(menu,event){menu.setUseNativeMenu(false);return showMenu.call(this,menu,event)};
  try {
    await c.click(c.button("app.settingsMenu"));
    await c.until(()=>Array.from(document.querySelectorAll(".menu-item")).some(item=>item.textContent.includes(p.translator("app.areaSettings"))),"Area settings menu item missing");
    const menuItem=Array.from(document.querySelectorAll(".menu-item")).find(item=>item.textContent.includes(p.translator("app.areaSettings")));await c.click(menuItem);
  } finally {p.showKplexMenuAtMouseEvent=showMenu}
  const save=p.saveSettings,saveCalls=[];p.saveSettings=function(...args){saveCalls.push(args);return save.apply(this,args)};
  try {
    for(const [zone,key]of [["parent","parentMaxHeight"],["left","friendMaxHeight"],["child","childMaxHeight"]]){
      const area=root.querySelector(".kplex-area-"+zone);c.check(area,"Area missing: "+zone);
      const rect=area.getBoundingClientRect(),top=area.classList.contains("is-edge-top"),x=Math.round(rect.x+rect.width/2),y=Math.round(top?rect.top:rect.bottom);
      const before=p.settings[key],camera=root.querySelector(".kplex-camera").style.transform,oldHeight=rect.height,oldSaves=saveCalls.length;
      const wc=require("@electron/remote").getCurrentWindow().webContents;
      wc.sendInputEvent({type:"mouseMove",x,y});wc.sendInputEvent({type:"mouseDown",x,y,button:"left",clickCount:1});await c.frames();
      c.check(c.plex().classList.contains("is-area-resizing"),"Resize did not capture "+zone);
      const samples=[];
      // Electron does not retain the held button on injected moves; without the modifier,
      // Chromium receives buttons=0 and implicitly releases capture before the first move.
      for(const delta of [10,20,35]){
        const previousHeight=samples.length?samples[samples.length-1]:oldHeight;
        wc.sendInputEvent({type:"mouseMove",x,y:y+(top?-delta:delta),modifiers:["leftbuttondown"]});await c.frames();
        // A native input receipt precedes React's commit. Observe the actual next painted geometry
        // before recording this point, without dispatching another move or forcing a render.
        await c.until(()=>area.isConnected&&area.getBoundingClientRect().height>previousHeight,"Resize point did not render: "+zone+" "+delta,5000);
        samples.push(area.getBoundingClientRect().height);
      }
      c.lastResize={zone,before,after:p.settings[key],oldHeight,samples,connected:area.isConnected,top,
        captured:root.querySelector(".kplex-area-frame.is-resizing")?.className};
      c.check(p.settings[key]>before&&area.getBoundingClientRect().height>oldHeight,"Area did not update while dragging: "+JSON.stringify(c.lastResize));
      c.check(samples[0]>oldHeight&&samples[1]>samples[0]&&samples[2]>samples[1],"Resize did not follow intermediate pointer positions");
      c.check(root.querySelector(".kplex-camera").style.transform===camera,"Resize moved the camera");
      wc.sendInputEvent({type:"mouseUp",x,y:y+(top?-35:35),button:"left",clickCount:1});await c.frames();
      c.check(saveCalls.length===oldSaves+1,"Resize must persist once on release");
      c.scenarios.push({id:"live-captured-resize-"+zone,status:"passed",before,after:p.settings[key],renderedSamples:samples});
    }
  } finally {p.saveSettings=save}
  const drag=app.dragManager.draggable;try {
    app.dragManager.draggable={type:"file",file:app.vault.getFileByPath(c.canvas)};
    const transfer=new DataTransfer();root.dispatchEvent(new DragEvent("dragover",{bubbles:true,cancelable:true,dataTransfer:transfer}));
    root.dispatchEvent(new DragEvent("drop",{bubbles:true,cancelable:true,dataTransfer:transfer}));
    await c.until(()=>c.center()===c.canvas,"Canvas File Explorer drop did not center its node");
  }finally{app.dragManager.draggable=drag}
  // The editor opens AFTER wheel registration: detects stale geometry closures even before pan.
  await c.editor(true);await c.until(()=>root.querySelector('[data-type="canvas"] .canvas'),"Native Canvas view missing");
  const overlay=root.querySelector(".kplex-central-editor-overlay"),before=overlay.getBoundingClientRect();
  const nativeCanvas=root.querySelector('[data-type="canvas"] .canvas'),canvasBefore=nativeCanvas.getBoundingClientRect();
  const r=c.plex().getBoundingClientRect();c.plex().dispatchEvent(new WheelEvent("wheel",{bubbles:true,cancelable:true,deltaY:-150,clientX:r.x+30,clientY:r.y+30}));
  await c.frames();await c.wait(100);const after=overlay.getBoundingClientRect();
  c.check(after.width>before.width+1&&after.height>before.height+1,"Canvas overlay did not resize on Plex wheel zoom before pan");
  c.lastCanvasResize={before:[canvasBefore.width,canvasBefore.height],overlayBefore:[before.width,before.height],overlayAfter:[after.width,after.height]};
  await c.until(()=>{const r=nativeCanvas.getBoundingClientRect();c.lastCanvasResize.after=[r.width,r.height];c.lastCanvasResize.connected=nativeCanvas.isConnected;return nativeCanvas.isConnected&&r.width>canvasBefore.width+1&&r.height>canvasBefore.height+1},"Native Canvas surface resize did not settle: "+JSON.stringify(c.lastCanvasResize),5000);
  const canvasAfter=nativeCanvas.getBoundingClientRect();
  c.check(canvasAfter.width>canvasBefore.width+1&&canvasAfter.height>canvasBefore.height+1,"Native Canvas surface did not resize on Plex zoom before pan");
  record("Canvas-drop-native-view-wheel-resize-before-pan",{before:[before.width,before.height],after:[after.width,after.height],nativeBefore:[canvasBefore.width,canvasBefore.height],nativeAfter:[canvasAfter.width,canvasAfter.height],nativeType:root.querySelector('[data-type="canvas"]').dataset.type});
  await c.editor(false);
  for(const [url,ratio]of [["https://help.obsidian.md",null],["https://www.youtube.com/watch?v=dQw4w9WgXcQ",16/9],["https://www.youtube.com/shorts/dQw4w9WgXcQ",9/16],["https://vimeo.com/76979871",16/9]]){
    await c.go(url);await c.editor(true);await c.until(()=>root.querySelector(".kplex-embedded-web-page webview"),"Desktop URL editor did not mount webview");
    const frame=root.querySelector(".kplex-embedded-web-frame");
    await c.until(()=>{try{return frame.getWebContentsId()>0}catch{return false}},"Desktop browser guest did not initialize",30000);
    const r=frame.getBoundingClientRect();
    if(ratio)c.check(Math.abs(r.width/r.height-ratio)<.01,"Video ratio is incorrect");
    c.check(!frame.hasAttribute("nodeintegration")&&!frame.hasAttribute("disablewebsecurity"),"Browser guest gained privileged access");
    const history=JSON.stringify(p.settings.navigationHistory);await c.editor(false);c.check(!root.querySelector(".kplex-embedded-web-frame"),"Collapsed browser guest leaked");
    c.check(c.center()===url&&JSON.stringify(p.settings.navigationHistory)===history,"URL collapse changed node history");
    record("desktop-webview-"+(ratio===9/16?"shorts":url.includes("vimeo")?"vimeo":ratio?"youtube":"page"),{src:frame.getAttribute("src"),ratio:r.width/r.height});
  }
  await c.go(c.hub);
  c.popoutLeaf=app.workspace.getLeaf("window");await c.popoutLeaf.setViewState({type:"k-plex-react-view",active:true});
  await app.workspace.revealLeaf(c.popoutLeaf);
  const popoutRoot=()=>c.popoutLeaf.view.contentEl.querySelector(".kplex-app");
  await c.until(()=>popoutRoot()?.classList.contains("kplex-surface-popout")&&popoutRoot()?.querySelector(".kplex-find button"),"Popout Find did not render");
  // Native popout creation migrates/replaces the initial React root. Wait in the owning
  // window and reacquire it before input rather than keeping the retired initial DOM.
  const popoutWindow=c.popoutLeaf.view.contentEl.ownerDocument.defaultView;
  await new Promise(resolve=>popoutWindow.requestAnimationFrame(()=>popoutWindow.requestAnimationFrame(resolve)));
  await c.go(c.hub);
  const pr=popoutRoot(),pd=pr.ownerDocument,pw=pd.defaultView;
  c.popoutRootForFind=pr;
  c.check(pw!==window,"Popout remained in the main document");
  app.workspace.setActiveLeaf(c.popoutLeaf,{focus:true});pr.focus();
  await c.key(pr,"f",{metaKey:true});
  await c.until(()=>pr.querySelector(".kplex-find-input")===pd.activeElement,"Popout Ctrl/Cmd+F did not focus its own field");
  const popoutInput=pd.activeElement,popoutHistory=JSON.stringify(p.settings.navigationHistory);
  Object.getOwnPropertyDescriptor(pw.HTMLInputElement.prototype,"value").set.call(popoutInput,"Parent-15");popoutInput.dispatchEvent(new pw.Event("input",{bubbles:true}));
  await c.until(()=>pr.querySelector(".kplex-role-parent.is-highlighted"),"Popout Find did not highlight its projected hit");
  c.check(JSON.stringify(p.settings.navigationHistory)===popoutHistory,"Popout Find changed navigation history");
  const ps=pw.getComputedStyle(pr.querySelector(".kplex-find button")),pz=pw.getComputedStyle(pr.querySelector(".kplex-zoom-controls button"));
  for(const property of ["width","height","backgroundColor","borderRadius"])c.check(ps[property]===pz[property],"Popout Find differs from zoom controls");
  record("popout-Find-owning-document-focus-highlight-style-history",{width:ps.width,height:ps.height,background:ps.backgroundColor});
  c.popoutLeaf.detach();c.popoutLeaf=null;app.workspace.setActiveLeaf(c.leaf,{focus:true});
  ${labelLayoutAcceptanceScenarios}
  ${relationshipEnhancementScenarios}
  ${gateCountScenarios}
  // Siblings share the same toolbar but need their own overflowing production fixture.
  await tab.setControlValue("renderSiblings",true);await tab.setControlValue("siblingMaxHeight",72);
  await c.go(c.folder+"/Child-00.md");
  await c.until(()=>root.querySelector(".kplex-zone-sibling .kplex-zone-filter-button"),"Sibling filter fixture did not render");
  const siblingPanel=root.querySelector(".kplex-zone-sibling"),siblingFilter=siblingPanel.querySelector(".kplex-zone-filter-button");
  siblingFilter.click();await c.frames();
  const siblingField=siblingPanel.querySelector(".kplex-zone-filter-input"),siblingBounds=siblingPanel.getBoundingClientRect(),siblingButtonBounds=siblingFilter.getBoundingClientRect(),siblingFieldBounds=siblingField.getBoundingClientRect();
  c.check(siblingFieldBounds.bottom<siblingBounds.top&&siblingButtonBounds.bottom<siblingBounds.top,"Sibling filter overlaps its node region");
  c.check(Math.abs(siblingButtonBounds.right-siblingBounds.right)<0.5,"Sibling filter is not right-aligned with its scroll region");
  const siblingPoint=[siblingFieldBounds.left+siblingFieldBounds.width/2,siblingFieldBounds.top+siblingFieldBounds.height/2];
  c.check(document.elementFromPoint(...siblingPoint)===siblingField,"Sibling filter field is clipped or covered");
  siblingFilter.click();await c.frames();
  c.check(!siblingPanel.querySelector(".kplex-zone-filter-input")&&siblingFilter.getBoundingClientRect().bottom<siblingPanel.getBoundingClientRect().top,"Closed sibling filter overlaps its node region");
  record("sibling-filter-above-node-region-open-closed",{clearance:siblingBounds.top-Math.max(siblingFieldBounds.bottom,siblingButtonBounds.bottom),point:siblingPoint,rightEdgeOffset:siblingButtonBounds.right-siblingBounds.right});
  c.done=true;
})().catch(e=>{c.error=e.stack;c.done=true});return JSON.stringify(true)})()`;

/** Scoped acceptance retains the full owned fixture and the identical label/settings/layout assertions. */
const layoutScenarios = `(()=>{const c=window.${controller};c.done=false;(async()=>{
  const record=(id,evidence={})=>c.scenarios.push({id,status:"passed",...evidence});
  const p=c.p,root=c.root(),gateWindow=require("@electron/remote").getCurrentWindow(),wc=gateWindow.webContents;
  await c.editor(false);
  ${labelLayoutAcceptanceScenarios}
  c.done=true;
})().catch(e=>{c.error=e.stack;c.done=true});return JSON.stringify(true)})()`;

/** Clean up even a partially created fixture and flush the original settings before byte restoration. */
const cleanup = `(()=>{const c=window.${controller};if(!c)return JSON.stringify(true);c.noticeObserver?.disconnect();c.restorePairTrace?.();c.done=false;c.error=null;(async()=>{
  c.statsModalEl?.querySelector(".modal-content button.mod-cta")?.click();
  if(c.ownsRelationModal){
    // Obsidian's Modal has no close-button element in this host; use its real Escape lifecycle.
    const wc=require("@electron/remote").getCurrentWindow().webContents;
    for(let i=0;i<2&&document.querySelector(".kplex-add-related-modal");i++){
      wc.sendInputEvent({type:"keyDown",keyCode:"Escape"});wc.sendInputEvent({type:"keyUp",keyCode:"Escape"});await c.wait(50);
    }
    c.check(!document.querySelector(".kplex-add-related-modal"),"Owned related-note modal survived cancellation");
  }
  if(c.ownsSettings){app.setting.close();c.ownsSettings=false}
  c.p.dismissKplexMenu();
  require("@electron/remote").getCurrentWindow().webContents.sendInputEvent({type:"mouseUp",x:0,y:0,button:"left",clickCount:1});
  for(const release of c.fixtureDemands??[])release();c.fixtureDemands=[];
  c.popoutLeaf?.detach();c.leaf?.detach();c.previousLeaf?.detach();
  const unrelated=app.vault.getFileByPath(c.unrelated);if(unrelated&&c.owned.includes(c.unrelated))await app.vault.delete(unrelated,true);
  const fixture=app.vault.getFolderByPath(c.folder);if(fixture&&c.owned.includes(c.folder))await app.vault.delete(fixture,true);
  await c.until(()=>c.settingsWrites.size===0,"Retiring fixture still has active settings writes");await c.frames();
  c.p.settings=c.settings;await c.p.saveSettings(false,false);
  await c.until(()=>c.settingsWrites.size===0,"Original settings still have active writes");await c.frames();
  c.check(c.settingsWriteErrors.length===0,"Fixture settings write failed: "+JSON.stringify(c.settingsWriteErrors));
  c.restoreSettingsWrites();
  if(c.settings.lastActivePath&&c.p.index.get(c.settings.lastActivePath))c.p.notifyNavigation(c.settings.lastActivePath);
  for(const [side,collapsed]of Object.entries(c.sidebars)){const split=side==="left"?app.workspace.leftSplit:app.workspace.rightSplit;collapsed?split.collapse():split.expand()}
  c.check(app.workspace.leftSplit.collapsed===c.sidebars.left&&app.workspace.rightSplit.collapsed===c.sidebars.right,"Original native sidebar states did not restore");
  const win=require("@electron/remote").getCurrentWindow();win.setBounds(c.bounds);win.webContents.setBackgroundThrottling(c.throttling);
  c.done=true;
})().catch(e=>{c.error=e.stack;c.done=true});return JSON.stringify(true)})()`;

/** Optional mobile-emulation lane; reloads are outside the fixture/controller lifetime. */
async function deviceMatrix() {
  const baseline=evaluate('JSON.stringify((()=>{const w=require("@electron/remote").getCurrentWindow();return {mobile:app.isMobile,bounds:w.getBounds(),minimum:w.getMinimumSize()}})())');
  report.deviceBaseline=baseline;
  const liveSettings=evaluate('JSON.stringify(app.plugins.plugins["k-plex"].settings)');
  const webOwner="Kplex-UX-Web-Routing.md";
  let ownsWebOwner=false;
  let devicePhase={step:"fixture-setup"};
  const probe=async(width,height,expected)=>{
    devicePhase={device:expected,width,height,step:"environment"};
    cli("dev:errors", "clear");
    evaluate(`(()=>{const w=require("@electron/remote").getCurrentWindow();w.setMinimumSize(200,200);w.setContentSize(${width},${height});return JSON.stringify(true)})()`);
    await sleep(500);
    const environment=evaluate(`(()=>{const p=app.plugins.plugins["k-plex"],original=p.settings.layoutProfiles,originalTypography=p.settings.typographyProfiles;
      // Distinct valid profile values identify the actual environment selected by the production adapter.
      p.settings.layoutProfiles={...original,"desktop:leaf":{...original["desktop:leaf"],compactingFactor:2.01},"tablet:leaf":{...original["tablet:leaf"],compactingFactor:2.02},"mobile:leaf":{...original["mobile:leaf"],compactingFactor:2.03}};
      // Distinct temporary overrides exercise the production typography environment projection;
      // they are restored synchronously without storage writes or semantic publication.
      p.settings.typographyProfiles={...originalTypography,desktop:{maxLabelLength:61},tablet:{maxLabelLength:62},mobile:{maxLabelLength:63}};
      try{const value=p.getActiveLayoutProfile("leaf").compactingFactor,typographyDevice=p.getTypographyDevice();
        const typography=Object.fromEntries(["leaf","sidepanel","popout"].map(surface=>[surface,p.getViewSettings(surface).baseNodeStyle.maxLabelLength]));
        return JSON.stringify({device:value===2.01?"desktop":value===2.02?"tablet":value===2.03?"phone":"unknown",typographyDevice,typography,mobile:app.isMobile,size:[innerWidth,innerHeight],bodyClasses:document.body.className})
      }finally{p.settings.layoutProfiles=original;p.settings.typographyProfiles=originalTypography}
    })()`);
    assert.equal(environment.device,expected,`Actual classification: ${JSON.stringify(environment)}`);
    const expectedTypographyDevice=expected==="phone"?"mobile":expected;
    assert.equal(environment.typographyDevice,expectedTypographyDevice);
    assert.deepEqual(environment.typography,{leaf:{desktop:61,tablet:62,mobile:63}[expectedTypographyDevice],sidepanel:{desktop:61,tablet:62,mobile:63}[expectedTypographyDevice],popout:{desktop:61,tablet:62,mobile:63}[expectedTypographyDevice]},"Typography environment scope differs between native surfaces");
    devicePhase.step="mount-and-Find";
    evaluate(`(()=>{const c=window.__kplexUxDevice={done:false,error:null,leaf:app.workspace.getLeaf(true)};
      c.leaf.setViewState({type:"k-plex-react-view",active:true}).then(()=>{app.workspace.setActiveLeaf(c.leaf,{focus:true});c.done=true}).catch(e=>{c.error=e.stack;c.done=true});return JSON.stringify(true)})()`);
    await until('JSON.stringify(window.__kplexUxDevice.error?{error:window.__kplexUxDevice.error}:window.__kplexUxDevice.done)',"Emulated view did not open");
    await until('JSON.stringify(Boolean(window.__kplexUxDevice.leaf.view.contentEl.querySelector(".kplex-find button")))',"Emulated Find magnifier did not render");
    evaluate('(()=>{window.__kplexUxDevice.leaf.view.contentEl.querySelector(".kplex-find button").click();return JSON.stringify(true)})()');
    const geometry=await until(`JSON.stringify((()=>{const root=window.__kplexUxDevice.leaf.view.contentEl,input=root.querySelector(".kplex-find-input");if(document.activeElement!==input)return false;
      const find=root.querySelector(".kplex-find").getBoundingClientRect(),plex=root.querySelector(".kplex-plex").getBoundingClientRect();
      return {inside:find.left>=plex.left-1&&find.right<=plex.right+1&&find.top>=plex.top-1,magnifier:Boolean(root.querySelector(".kplex-find button[aria-expanded]")),dropdown:Boolean(root.querySelector(".kplex-find [role=listbox]")),width:find.width,available:plex.width,searchHint:root.querySelector(".kplex-search").placeholder}
    })())`,"Emulated magnifier did not focus its Find field");
    assert(geometry.inside&&!geometry.dropdown&&!geometry.magnifier,JSON.stringify(geometry));
    if(expected!=="desktop")assert(!geometry.searchHint.includes("F4"),"Mobile hint assumes a hardware keyboard");
    devicePhase.step="layout-controls";
    // Probe responsive availability without mutating density/columns: their behavior is exercised
    // separately. Every actual range and the new Find action must remain reachable in this surface.
    const hiddenLayout=evaluate('JSON.stringify((()=>{const root=window.__kplexUxDevice.leaf.view.contentEl,t=root.querySelector(".kplex-layout-toggle");return {toggle:Boolean(t),expanded:t?.getAttribute("aria-expanded"),ranges:root.querySelectorAll(".kplex-layout-controls input[type=range]").length}})())');
    assert(hiddenLayout.toggle&&hiddenLayout.expanded==="false"&&hiddenLayout.ranges===0,JSON.stringify(hiddenLayout));
    evaluate('(()=>{window.__kplexUxDevice.leaf.view.contentEl.querySelector(".kplex-layout-toggle").click();return JSON.stringify(true)})()');
    await until('JSON.stringify(window.__kplexUxDevice.leaf.view.contentEl.querySelectorAll(".kplex-layout-controls input[type=range]").length===7)',"Emulated configuration did not mount seven sliders");
    const layoutControls=evaluate(`JSON.stringify((()=>{const p=app.plugins.plugins["k-plex"],root=window.__kplexUxDevice.leaf.view.contentEl,plex=root.querySelector(".kplex-plex").getBoundingClientRect();
      const keys=["graph.horizontalDensity","graph.verticalDensity","graph.parentColumns","graph.childColumns","graph.baseFontSize","settings.ui.max.label.length","settings.ui.maximum.node.width"];
      const controls=keys.map(key=>{const input=Array.from(root.querySelectorAll('.kplex-layout-controls input[type="range"]')).find(el=>el.getAttribute("aria-label")===p.translator(key));if(!input)return {key,missing:true};const r=input.getBoundingClientRect(),label=input.closest("label").getBoundingClientRect();return {key,min:input.min,max:input.max,step:input.step,value:input.value,width:r.width,height:r.height,inside:r.width>0&&r.height>0&&label.left>=plex.left-1&&label.right<=plex.right+1&&label.top>=plex.top-1&&label.bottom<=plex.bottom+1}});
      const filter=Array.from(root.querySelectorAll(".kplex-find button")).find(el=>el.getAttribute("aria-label")===p.translator("find.applyFilter")),r=filter?.getBoundingClientRect();
      const wrap=root.querySelector(".kplex-wrap-label-control"),wr=wrap?.getBoundingClientRect();
      const pair=root.querySelector(".kplex-typography-controls .kplex-density-axes"),rails=pair?.querySelectorAll(".kplex-density-control"),first=rails?.[0],second=rails?.[1],third=rails?.[2],fr=first?.getBoundingClientRect(),sr=second?.getBoundingClientRect(),tr=third?.getBoundingClientRect(),pr=pair?.getBoundingClientRect();
      const caption=wrap?.querySelector(".kplex-wrap-label-caption"),heading=first?.querySelector(".kplex-density-heading"),cs=caption&&getComputedStyle(caption),hs=heading&&getComputedStyle(heading),ws=wrap&&getComputedStyle(wrap),rs=first&&getComputedStyle(first);
      const typography={stacked:Boolean(fr&&sr&&tr&&rails.length===3&&Math.abs(fr.left-sr.left)<1&&Math.abs(fr.left-tr.left)<1&&Math.abs(fr.width-sr.width)<1&&Math.abs(fr.width-tr.width)<1&&sr.top>fr.bottom&&tr.top>sr.bottom),threeRowTile:Boolean(wr&&pr&&Math.abs(wr.top-pr.top)<1&&Math.abs(wr.bottom-pr.bottom)<1),narrowTile:Boolean(wr&&fr&&wr.width<fr.width),wrappedCaption:Boolean(cs&&caption.getBoundingClientRect().height>parseFloat(cs.lineHeight)*1.5),matchingText:Boolean(cs&&hs&&["fontSize","letterSpacing","textTransform","color"].every(key=>cs[key]===hs[key])),matchingTile:Boolean(ws&&rs&&["backgroundColor","borderRadius","borderTopColor","borderTopWidth","boxShadow"].every(key=>ws[key]===rs[key])),tileWidth:wr?.width,tileHeight:wr?.height,pairHeight:pr?.height,fontSize:cs?.fontSize};
      return {typography,wrapInside:Boolean(wr&&wr.left>=plex.left-1&&wr.right<=plex.right+1&&wr.top>=plex.top-1&&wr.bottom<=plex.bottom+1),controls,rangeCount:root.querySelectorAll('.kplex-layout-controls input[type="range"]').length,findFilter:filter?{disabled:filter.disabled,noTitle:!filter.hasAttribute("title"),besidePath:filter.previousElementSibling?.getAttribute("aria-label")===p.translator("find.includePath"),inside:r.width>0&&r.height>0&&r.left>=plex.left-1&&r.right<=plex.right+1&&r.top>=plex.top-1&&r.bottom<=plex.bottom+1}:null}
    })())`);
    assert.equal(layoutControls.rangeCount,7,JSON.stringify(layoutControls));
    assert(layoutControls.wrapInside&&layoutControls.controls.every(control=>control.inside),JSON.stringify(layoutControls));
    assert(["stacked","threeRowTile","narrowTile","wrappedCaption","matchingText","matchingTile"].every(key=>layoutControls.typography[key]),JSON.stringify(layoutControls.typography));
    assert.deepEqual(layoutControls.controls.slice(2,4).map(({min,max,step})=>[min,max,step]),[["1","3","1"],["1","7","1"]],"Rendered parent/child column caps differ from their supported 3/7 widths");
    assert(layoutControls.findFilter?.disabled&&layoutControls.findFilter.noTitle&&layoutControls.findFilter.besidePath&&layoutControls.findFilter.inside,JSON.stringify(layoutControls));
    devicePhase.step="Filter-open";
    evaluate('(()=>{const p=app.plugins.plugins["k-plex"],root=window.__kplexUxDevice.leaf.view.contentEl;window.__kplexUxDevice.filterTrigger=Array.from(root.querySelectorAll("button")).find(b=>b.getAttribute("aria-label")===p.translator("filter.trigger"));if(!window.__kplexUxDevice.filterTrigger)throw new Error("Emulated Filter trigger missing");window.__kplexUxDevice.filterTrigger.click();return JSON.stringify(true)})()');
    const filterPanelGeometry=await until(`JSON.stringify((()=>{const p=app.plugins.plugins["k-plex"],doc=window.__kplexUxDevice.filterTrigger.ownerDocument,view=doc.defaultView,panel=doc.querySelector(".kplex-filter-portal"),header=panel?.querySelector(".kplex-filter-panel-header");if(!header||!view)return false;const r=panel.getBoundingClientRect(),close=Array.from(header.querySelectorAll("button")).find(b=>b.getAttribute("aria-label")===p.translator("filter.closePanel")),cr=close?.getBoundingClientRect();return {ownerMatches:panel.ownerDocument===doc,sharedDrag:header.classList.contains("kplex-draggable-dialog-handle"),title:header.querySelector("span")?.textContent,expectedTitle:p.translator("filter.panelTitle"),width:r.width,height:r.height,left:r.left,top:r.top,inside:r.width>0&&r.height>0&&r.left>=0&&r.right<=view.innerWidth+1&&r.top>=0&&r.bottom<=view.innerHeight+1,closeReachable:Boolean(cr&&cr.width>0&&cr.height>0&&cr.left>=0&&cr.right<=view.innerWidth+1&&cr.top>=0&&cr.bottom<=view.innerHeight+1)}})())`,"Emulated draggable Filter panel did not render");
    assert(filterPanelGeometry.ownerMatches&&filterPanelGeometry.sharedDrag&&filterPanelGeometry.inside&&filterPanelGeometry.closeReachable,JSON.stringify(filterPanelGeometry));
    assert.equal(filterPanelGeometry.title,filterPanelGeometry.expectedTitle);
    devicePhase.step="Filter-close";
    evaluate('(()=>{const p=app.plugins.plugins["k-plex"],panel=window.__kplexUxDevice.filterTrigger.ownerDocument.querySelector(".kplex-filter-portal");Array.from(panel.querySelectorAll("button")).find(b=>b.getAttribute("aria-label")===p.translator("filter.closePanel")).click();return JSON.stringify(true)})()');
    await until('JSON.stringify((()=>{const trigger=window.__kplexUxDevice.filterTrigger,doc=trigger.ownerDocument;return !doc.querySelector(".kplex-filter-portal")&&doc.activeElement===trigger})())',"Emulated Filter close failed dismissal/focus cleanup");
    report.scenarios.push({id:`emulated-${expected}-new-controls-and-filter-panel-fit`,status:"passed",environment,layoutControls,filterPanelGeometry,interaction:"DOM activation/geometry in desktop emulation; no physical touch assertion"});
    devicePhase.step="selected-pair-authority";
    // Local sessions grant selected-pair authority before global inventory. Prepare the actual
    // displayed center and owned Markdown endpoint; eager sessions retain their global proof.
    await until('JSON.stringify((()=>{const i=app.plugins.plugins["k-plex"].index;return !i.hasPendingSnapshotHydration()&&!i.hasPendingSemanticPreparation()&&!i.building})())',"Emulated pending primary work did not settle",1_800_000);
    evaluate(`(()=>{const c=window.__kplexUxDevice,p=app.plugins.plugins["k-plex"],i=p.index;c.readiness={done:false,error:null};
      (async()=>{if(i.isOnDemandMode()){const file=app.vault.getFileByPath(${JSON.stringify(webOwner)});if(!file)throw new Error("Owned web source disappeared");if(!i.get(file.path))i.insertCreatedFile(file);
        const center=c.leaf.view.contentEl.querySelector(".kplex-role-center")?.dataset.kplexPath,other=center===file.path?"https://help.obsidian.md":file.path;
        if(!center||!i.get(center)||center===other||!i.get(other))throw new Error("Emulated selected endpoints are unavailable");
        if(!await i.prepareRelationshipPair(center,other)||!i.isSemanticWriteReady(center,other))throw new Error("Emulated selected pair authority did not prepare");c.readiness.pair=[center,other];}
        c.readiness.done=true})().catch(error=>{c.readiness.error=String(error);c.readiness.done=true});return JSON.stringify(true)})()`);
    await until('JSON.stringify((()=>{const c=window.__kplexUxDevice,p=app.plugins.plugins["k-plex"],i=p.index;if(c.readiness.error)return {error:c.readiness.error};if(!c.readiness.done)return false;return (i.isOnDemandMode()?c.readiness.pair&&i.isSemanticWriteReady(...c.readiness.pair)&&p.getIndexStatus().upToDate:i.isFullSnapshotHydrated()||i.hasSourceBackedStartup()&&p.getIndexStatus().upToDate&&i.sourceAcquisition.hasSemanticDependencies())&&!i.hasPendingSnapshotHydration()&&!i.hasPendingSemanticPreparation()&&!i.building})())',"Emulated primary source/graph authority did not complete",1_800_000);
    devicePhase.step="web-routing";
    // Route a known URL through the actual central editor in every host mode. A guest's
    // remote response/authentication is separate from proving native element selection.
    await until('JSON.stringify(Boolean(app.plugins.plugins["k-plex"].index.get("https://help.obsidian.md")))',"Source-backed web routing URL did not restore");
    evaluate(`(()=>{const p=app.plugins.plugins["k-plex"];p.settings.showURLNodes=true;p.settings.documentSyncMode="off";p.settings.followActiveFile=false;p.notifyNavigation("https://help.obsidian.md");return JSON.stringify(true)})()`);
    await until('JSON.stringify(window.__kplexUxDevice.leaf.view.contentEl.querySelector(".kplex-role-center")?.dataset.kplexPath==="https://help.obsidian.md")',"Emulated URL center did not activate");
    evaluate('(()=>{const p=app.plugins.plugins["k-plex"],root=window.__kplexUxDevice.leaf.view.contentEl;if(!p.settings.embedCentralNode)Array.from(root.querySelectorAll("button")).find(b=>b.getAttribute("aria-label")===p.translator("app.useCentralNodeEditor"))?.click();return JSON.stringify(true)})()');
    const webRouting=await until(`JSON.stringify((()=>{const root=window.__kplexUxDevice.leaf.view.contentEl,frame=root.querySelector(".kplex-embedded-web-frame");if(!frame)return false;const r=frame.getBoundingClientRect();return {tag:frame.tagName.toLowerCase(),src:frame.getAttribute("src"),width:r.width,height:r.height,frames:root.querySelectorAll(".kplex-embedded-web-frame").length}})())`,"Emulated web editor did not mount");
    assert.equal(webRouting.tag,expected==="desktop"?"webview":"iframe");
    assert.equal(webRouting.frames,1);assert(webRouting.width>0&&webRouting.height>0,JSON.stringify(webRouting));
    evaluate('(()=>{const p=app.plugins.plugins["k-plex"],root=window.__kplexUxDevice.leaf.view.contentEl;Array.from(root.querySelectorAll("button")).find(b=>b.getAttribute("aria-label")===p.translator("app.useNormalCentralNode"))?.click();return JSON.stringify(true)})()');
    await until('JSON.stringify(!window.__kplexUxDevice.leaf.view.contentEl.querySelector(".kplex-embedded-web-frame"))',"Emulated browser survived collapse");
    const errors=cli("dev:errors");
    assert(!errors||/^No errors captured\.?$/i.test(errors),errors);
    report.scenarios.push({id:`emulated-${expected}-Find-magnifier-and-web-routing`,status:"passed",environment,geometry,webRouting,errors});
    evaluate('(()=>{window.__kplexUxDevice.leaf.detach();delete window.__kplexUxDevice;return JSON.stringify(true)})()');
  };
  /** Reconnect across Obsidian's intentional mobile-mode reload. */
  const ready=async()=>{const end=Date.now()+180000;while(true){try{if(evaluate('JSON.stringify(Boolean(app.plugins.plugins["k-plex"]?.index))'))return}catch{}assert(Date.now()<end,"Mobile reload did not become available");await sleep(500)}};
  try {
    assert(!evaluate(`JSON.stringify(Boolean(app.vault.getAbstractFileByPath(${JSON.stringify(webOwner)})))`),"Web routing fixture already exists");
    evaluate(`(()=>{window.__kplexUxWebSetup={done:false,error:null};app.vault.create(${JSON.stringify(webOwner)},"[Web routing acceptance](https://help.obsidian.md)").then(()=>{window.__kplexUxWebSetup.done=true}).catch(e=>{window.__kplexUxWebSetup.error=e.stack;window.__kplexUxWebSetup.done=true});return JSON.stringify(true)})()`);
    ownsWebOwner=true;
    await until('JSON.stringify(window.__kplexUxWebSetup.error?{error:window.__kplexUxWebSetup.error}:window.__kplexUxWebSetup.done)',"Web routing fixture creation failed");
    await until(`JSON.stringify(Boolean(app.metadataCache.getFileCache(app.vault.getFileByPath(${JSON.stringify(webOwner)}))))`,"Web routing metadata did not settle");
    evaluate(`(()=>{window.__kplexUxWebSetup.done=false;app.plugins.plugins["k-plex"].index.patchMarkdownPaths([${JSON.stringify(webOwner)}]).then(()=>{window.__kplexUxWebSetup.done=true}).catch(e=>{window.__kplexUxWebSetup.error=e.stack;window.__kplexUxWebSetup.done=true});return JSON.stringify(true)})()`);
    await until('JSON.stringify(window.__kplexUxWebSetup.error?{error:window.__kplexUxWebSetup.error}:window.__kplexUxWebSetup.done)',"Web routing source preparation failed");
    if(baseline.mobile){cli("eval","code=app.emulateMobile(false)");await ready()}
    await probe(1200,900,"desktop");
    cli("eval","code=app.emulateMobile(true)");await ready();
    await probe(900,875,"tablet");
    await probe(390,844,"phone");
  } catch(error) {
    // Capture the failed phase before owned view teardown, without labels, paths or vault data.
    report.deviceFailure={...devicePhase};
    try{report.deviceFailure.native=evaluate('JSON.stringify((()=>{const c=window.__kplexUxDevice,root=c?.leaf?.view.contentEl,trigger=c?.filterTrigger,current=root?.querySelector(".kplex-filter-trigger"),doc=trigger?.ownerDocument||root?.ownerDocument||document;const portals=scope=>Array.from(scope.querySelectorAll(".kplex-filter-portal")).slice(0,4).map(panel=>({class:panel.className,header:Boolean(panel.querySelector(".kplex-filter-panel-header")),connected:panel.isConnected}));return {rootConnected:root?.isConnected,triggerConnected:trigger?.isConnected,triggerMatchesCurrent:trigger===current,triggerExpanded:trigger?.getAttribute("aria-expanded"),currentExpanded:current?.getAttribute("aria-expanded"),ownerMatchesAmbient:doc===document,ownedPortalCount:doc.querySelectorAll(".kplex-filter-portal").length,ambientPortalCount:document.querySelectorAll(".kplex-filter-portal").length,ownedPortals:portals(doc),ambientPortals:portals(document),activeClass:doc.activeElement?.className,mode:app.plugins.plugins["k-plex"].index.isOnDemandMode()?"on-demand":"eager",readinessError:c?.readiness?.error,readinessDone:c?.readiness?.done}})())')}catch(receiptError){report.deviceFailure.receiptError=String(receiptError)}
    try{report.deviceFailure.errors=cli("dev:errors").slice(0,8000)}catch(receiptError){report.deviceFailure.errorReceiptError=String(receiptError)}
    throw error;
  } finally {
    try{evaluate('(()=>{window.__kplexUxDevice?.leaf?.detach();delete window.__kplexUxDevice;return JSON.stringify(true)})()')}catch{}
    if(ownsWebOwner){evaluate(`(()=>{window.__kplexUxWebCleanup={done:false,error:null};const file=app.vault.getFileByPath(${JSON.stringify(webOwner)});(file?app.vault.delete(file):Promise.resolve()).then(()=>{window.__kplexUxWebCleanup.done=true}).catch(e=>{window.__kplexUxWebCleanup.error=e.stack;window.__kplexUxWebCleanup.done=true});return JSON.stringify(true)})()`);await until('JSON.stringify(window.__kplexUxWebCleanup.error?{error:window.__kplexUxWebCleanup.error}:window.__kplexUxWebCleanup.done)',"Web routing fixture cleanup failed")}
    evaluate('(()=>{delete window.__kplexUxWebSetup;delete window.__kplexUxWebCleanup;return JSON.stringify(true)})()');
    const current=await readState('JSON.stringify(app.isMobile)');
    if(current!==baseline.mobile){cli("eval",`code=app.emulateMobile(${baseline.mobile})`);await ready()}
    evaluate(`(()=>{const w=require("@electron/remote").getCurrentWindow();w.setMinimumSize(${baseline.minimum[0]},${baseline.minimum[1]});w.setBounds(${JSON.stringify(baseline.bounds)});return JSON.stringify(true)})()`);
    evaluate(`(()=>{const p=app.plugins.plugins["k-plex"];p.settings=JSON.parse(${JSON.stringify(JSON.stringify(liveSettings))});window.__kplexUxSettingsRestore={done:false,error:null};p.saveSettings(false,false).then(()=>{window.__kplexUxSettingsRestore.done=true}).catch(e=>{window.__kplexUxSettingsRestore.error=e.stack;window.__kplexUxSettingsRestore.done=true});return JSON.stringify(true)})()`);
    await until('JSON.stringify(window.__kplexUxSettingsRestore.error?{error:window.__kplexUxSettingsRestore.error}:window.__kplexUxSettingsRestore.done)',"Live device settings did not restore");
    evaluate('(()=>{delete window.__kplexUxSettingsRestore;return JSON.stringify(true)})()');
    assert.deepEqual(evaluate('JSON.stringify(app.plugins.plugins["k-plex"].settings)'),liveSettings,"Device emulation changed live settings");
    writeFileSync(dataPath,originalData);
    assert(readFileSync(dataPath).equals(originalData),"Device settings bytes did not restore");
    assert(readFileSync(enabledPath).equals(originalEnabled),"Device emulation changed plugin enablement");
    report.deviceCleanup={mobile:evaluate('JSON.stringify(app.isMobile)'),liveSettingsRestored:true,restored:true};
  }
}

try {
  assert.equal(resolve(cli("vault", "info=path").replace(/^path\s+/, "")), target.vault);
  hashes();
  report.version = cli("version");
  if(process.env.KPLEX_UX_DEVICE_ONLY==="true"){
    assert.equal(process.env.KPLEX_UX_EMULATE_MOBILE,"true","Device-only verification requires the device matrix");
    report.deviceOnly=true;report.status="passed";
  }else{
  assert.equal(evaluate(`JSON.stringify(Boolean(window.${controller}))`),false,"UX controller already exists");
  // The host can execute an eval after the CLI loses its response. Own cleanup before
  // submitting creation so that this partial success still restores its captured state.
  installed = true;
  evaluate(nativeController);
  // A forced rebuild still obeys visible-view demand. Mount the owned view before preparing
  // the baseline/fixture rather than asking a hidden plugin to execute UI acceptance work.
  evaluate(`(()=>{const c=window.${controller};c.mount={done:false,error:null};c.leaf=app.workspace.getLeaf(true);
    c.leaf.setViewState({type:"k-plex-react-view",active:true}).then(()=>{app.workspace.setActiveLeaf(c.leaf,{focus:true});c.mount.done=true}).catch(e=>{c.mount.error=e.stack;c.mount.done=true});return JSON.stringify(true)})()`);
  await until(`JSON.stringify(window.${controller}.mount.error?{error:window.${controller}.mount.error}:window.${controller}.mount.done)`,"Owned test view did not mount");
  // Native setViewState can resolve before the child React navigation subscription mounts.
  // Wait on the owning view's frames before sending its ordinary setup navigation notification.
  evaluate(`(()=>{const c=window.${controller};c.navigationMounted=false;const owner=c.leaf.view.contentEl.ownerDocument.defaultView;owner.requestAnimationFrame(()=>owner.requestAnimationFrame(()=>{c.navigationMounted=true}));return JSON.stringify(true)})()`);
  await until(`JSON.stringify(window.${controller}.navigationMounted)`,"Owned navigation subscription frames did not settle",5000);
  // A previous stress run can leave a 20k-contributor center whose requested-scope decode
  // deliberately exceeds its budget. Select an existing small note before strict readiness.
  const setupCenter=process.env.KPLEX_UX_SETUP_CENTER||"Welcome.md";
  if(evaluate(`JSON.stringify(Boolean(app.vault.getFileByPath(${JSON.stringify(setupCenter)})))`)){
    await until(`JSON.stringify(Boolean(app.plugins.plugins["k-plex"].index.getVaultSearchPage(${JSON.stringify(setupCenter)})))`,"Setup center did not become available",1_800_000);
    evaluate(`(()=>{const p=app.plugins.plugins["k-plex"],page=p.index.getVaultSearchPage(${JSON.stringify(setupCenter)});if(page?.file&&!p.index.get(page.path))p.index.insertCreatedFile(page.file);p.notifyNavigation(${JSON.stringify(setupCenter)});return JSON.stringify(true)})()`);
    await until(`JSON.stringify(window.${controller}.center()===${JSON.stringify(setupCenter)})`,"Explicit physical setup center did not render",30000);
    report.setupCenter=setupCenter;
  }
  console.log("Waiting for test-vault index readiness");
  // Navigation alone does not reopen a completed/cancelled startup coordinator. Use the same
  // readiness entry point as opening a view; never manufacture readiness by changing its flags.
  evaluate(`(()=>{const c=window.${controller};c.readinessRecovery={done:false,error:null};
    (async()=>{await c.p.ensureIndexReady("ux-test-setup");
      if(!c.p.index.isOnDemandMode()&&!c.p.index.isFullSnapshotHydrated()&&!c.p.index.hasPendingSnapshotHydration())await c.p.rebuildIndex(false,true,"ux-initial-seed");
      await c.p.index.refreshSemanticSettings();
      const center=c.center();c.check(center&&c.p.index.get(center),"Initial canonical center is unavailable");
      if(c.p.index.isOnDemandMode()){
        // Prefer an already published physical neighbor. An unconnected selected file is also
        // a valid negative pair; enumerate identities only, without acquiring the global vault.
        const page=c.p.index.get(center),neighbor=[...page.neighbours.keys()].map(path=>app.vault.getFileByPath(path)).find(file=>file?.extension==="md"&&file.path!==center);
        const target=neighbor||app.vault.getMarkdownFiles().find(file=>file.path!==center);
        c.check(target,"Initial center has no distinct physical Markdown readiness target");await c.prepareAuthority(center,target.path);
      }
      c.readinessRecovery.done=true})().catch(e=>{c.readinessRecovery.error=e.stack;c.readinessRecovery.done=true});return JSON.stringify(true)})()`);
  await until(`JSON.stringify(window.${controller}.readinessRecovery.error?{error:window.${controller}.readinessRecovery.error}:window.${controller}.readinessRecovery.done&&window.${controller}.primaryReady())`, "Initial primary graph/current-view semantics did not settle", 1_800_000);
  report.startupReadiness=evaluate(`JSON.stringify((()=>{const c=window.${controller},center=c.root().querySelector(".kplex-role-center")?.dataset.kplexPath,page=c.p.index.get(center),target=c.authorityTargets.get(center);return {center,centerNeighbours:page?c.p.index.neighbourCount(page):null,mode:c.p.index.isOnDemandMode()?"on-demand":"eager",authorityPair:target?[center,target]:null,pairReady:target?c.p.index.isSemanticWriteReady(center,target):null,globalDependencies:c.p.index.sourceAcquisition.hasSemanticDependencies(),primaryReady:c.primaryReady(),failure:c.p.index.getSemanticPreparationFailure(),status:c.p.getIndexStatus(),aliasVocabularyPending:c.p.index.hasPendingSearchVocabulary(),source:c.p.index.getSourceAcquisitionCounters(),semantic:c.p.index.getSemanticPreparationDiagnostics()}})())`);
  if(report.setupCenter){assert.equal(report.startupReadiness.center,report.setupCenter,"Setup center is not rendered");assert.equal(report.startupReadiness.failure,null,"Ordinary setup center still has a terminal scope failure");}
  console.log("Index ready; creating the owned UX fixture");
  cli("dev:errors", "clear");
  evaluate(setup);
  await until(`JSON.stringify(window.${controller}.error?{error:window.${controller}.error}:window.${controller}.done)`, "Fixture setup timed out",900000);
  console.log("Fixture ready; running "+report.scope+" UX workflows");
  evaluate(layoutOnly ? layoutScenarios : scenarios);
  await until(`JSON.stringify(window.${controller}.error?{error:window.${controller}.error}:window.${controller}.done)`, "UX scenarios timed out", 300_000);
  report.scenarios = evaluate(`JSON.stringify(window.${controller}.scenarios)`);
  report.fixtureReadiness=evaluate(`JSON.stringify(window.${controller}.fixtureReadiness)`);
  report.enhancementPatchAttempts=evaluate(`JSON.stringify(window.${controller}.enhancementPatchAttempts??[])`);
  const errors = cli("dev:errors");
  assert(!errors || /^No errors captured\.?$/i.test(errors), errors);
  report.errors = errors;report.status = "passed";
  }
} catch (error) {
  report.status = "failed";report.error = error.stack;
  if (installed) try {
    report.scenarios=evaluate(`JSON.stringify(window.${controller}.scenarios)`);
    report.failureState=evaluate(`JSON.stringify((()=>{const c=window.${controller},r=c.leaf?c.root():null;return {
      center:r?c.center():c.p.settings.lastActivePath,status:c.p.getIndexStatus(),activeClass:document.activeElement?.className,
      findOpen:r?.querySelector(".kplex-find button")?.getAttribute("aria-expanded"),
      findValue:r?.querySelector(".kplex-find-input")?.value,matchLabel:r?.querySelector(".kplex-find-count")?.textContent,fixtureAliases:c.fixtureAliases,
      enhancementPatchAttempts:c.enhancementPatchAttempts,pairTrace:c.pairTrace,notices:c.notices,linkDisabled:document.querySelector(".kplex-add-related-link-button")?.disabled,relationshipWrites:c.p.relationshipWriteCancels.size,sourceDiagnostics:c.p.index.getSourceRepositoryDiagnostics(),highlightedNodes:r?.querySelectorAll(".kplex-thought.is-highlighted").length,resize:c.lastResize,imagePaint:c.lastImagePaint,canvasResize:c.lastCanvasResize,gate:c.lastGate,bodyDrag:c.lastBodyDrag,dragEvents:c.dragEvents,lastClick:c.lastClick,lastHover:c.lastHover,lastKey:c.lastKey,
      vaultInput:r?.querySelector(".kplex-search")?.value,vaultResults:r?.querySelector(".kplex-search-results")?.textContent,
      popoutRootConnected:c.popoutRootForFind?.isConnected,
      popoutRootCurrent:c.popoutRootForFind===c.popoutLeaf?.view.contentEl.querySelector(".kplex-app"),
      expandedNodes:r?.querySelectorAll(".kplex-expanded-mini-thought").length,
      nativeType:r?.querySelector(".kplex-central-editor-leaf-host .workspace-leaf-content")?.dataset.type,
      editorOverlay:r?.querySelector(".kplex-central-editor-overlay")?.className,
      editorToolbar:r?.querySelector(".kplex-central-editor-toolbar")?.outerHTML,
      toolbarDisplay:r?.querySelector(".kplex-central-editor-toolbar")?getComputedStyle(r.querySelector(".kplex-central-editor-toolbar")).display:null
      ,hostDisplay:getComputedStyle(c.leaf.containerEl).display,hostClass:c.leaf.containerEl.className,
      activeLeafType:app.workspace.activeLeaf?.view.getViewType(),activeLeafIsHost:app.workspace.activeLeaf===c.leaf,
      toolbarButtons:Array.from(r?.querySelectorAll(".kplex-central-editor-toolbar button")??[]).map(b=>({label:b.getAttribute("aria-label"),width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height,display:getComputedStyle(b).display})),
      rootConnected:r?.isConnected,menuFocus:c.menuFocus,escapeTrace:c.escapeTrace,
      ownedRelationshipState:{frontmatter:app.metadataCache.getFileCache(app.vault.getFileByPath(c.hub))?.frontmatter,
        policy:c.p.index.semanticPolicyRevision,source:c.p.getIndexSourceRevision(),maintenance:c.p.index.sourceAcquisition.getMaintenanceRevision(),
        pairs:Array.from(c.p.index.relationshipPairs.values()).filter(pair=>pair.paths.includes(c.hub)).map(pair=>({paths:pair.paths,policy:pair.policyRevision,source:pair.sourceRevision,maintenance:pair.maintenanceRevision,relations:pair.paths.map(path=>({path,relation:pair.relations.get(path)?{flags:pair.relations.get(path).flags,role:pair.relations.get(path).role}:null})),parents:pair.settings.hierarchy.parents})),
        scopes:Array.from(c.p.index.semanticScopes.values()).filter(scope=>scope.pagesByPath.has(c.hub)).map(scope=>({center:scope.centerPath,policy:scope.policyRevision,source:scope.sourceRevision,maintenance:scope.maintenanceRevision,completeHub:scope.completePaths.has(c.hub),parents:scope.settings.hierarchy.parents,history:Object.entries(c.historyTargets).map(([role,path])=>({role,path,complete:scope.completePaths.has(path),hubHas:scope.pagesByPath.get(c.hub)?.neighbours.has(path)}))}))}
    }})())`);
  } catch {}
} finally {
  if (installed) try {
    if(evaluate(`JSON.stringify(Boolean(window.${controller}))`)){
      evaluate(cleanup);
      await until(`JSON.stringify(window.${controller}.error?{error:window.${controller}.error}:window.${controller}.done)`, "UX cleanup timed out");
    }
    evaluate(`(()=>{window.${controller}?.restorePairTrace?.();window.${controller}?.restoreSettingsWrites?.();delete window.${controller};return JSON.stringify(true)})()`);
    writeFileSync(dataPath,originalData);
    assert(readFileSync(dataPath).equals(originalData),"Original settings bytes were not restored");
    assert(readFileSync(enabledPath).equals(originalEnabled),"Community plugin enablement changed");
    report.cleanup="passed";
  } catch(error) {report.cleanup=error.stack;report.status="failed"}
  // Wrapper lifetime is independent of fixture cleanup and its native async failures.
  if(installed)try{evaluate(`(()=>{window.${controller}?.restorePairTrace?.();window.${controller}?.restoreSettingsWrites?.();return JSON.stringify(true)})()`)}catch(error){report.traceCleanupError=error.message;report.status="failed"}
  if(report.status==="passed"&&process.env.KPLEX_UX_EMULATE_MOBILE==="true")try{await deviceMatrix()}catch(error){report.deviceError=error.stack;report.status="failed"}
  try {hashes()} catch(error) {report.artifactError=error.message;report.status="failed"}
  report.completedAt = new Date().toISOString();
  writeFileSync(join(reportDir,"report.json"),JSON.stringify(report,null,2)+"\n");
}
console.log(`UX verification ${report.status}; report: ${join(reportDir,"report.json")}`);
if(report.error)console.error(report.error);
if(report.status!=="passed")process.exitCode=1;
