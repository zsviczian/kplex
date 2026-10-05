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

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const reportDir = process.env.KPLEX_HOST_REPORT_DIR;
assert(reportDir, "Set KPLEX_HOST_REPORT_DIR explicitly");
mkdirSync(reportDir, { recursive: true });
const report = { status: "running", startedAt: new Date().toISOString(), scenarios: [], target: vaultName, artifacts: {}, limits: ["Desktop Electron functional tests; no physical iPad trackpad or mobile WebView acceptance", "Trusted native pointer input for resize and gate/history; File Explorer drops use the real host payload and DOM handler", "Browser guest creation, sizing and teardown are asserted; remote login, video playback and sites blocking mobile iframes require separate acceptance", "Area settings menu uses Obsidian's public DOM mode; OS-native menu selection is not asserted"] };
const dataPath = join(target.pluginDir, "data.json");
const originalData = readFileSync(dataPath);
const enabledPath = join(target.config, "community-plugins.json");
const originalEnabled = readFileSync(enabledPath);
const controller = "__kplexUxRegression";
const folder = "Kplex-UX-Regression";
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
    bounds:win.getBounds(),throttling:win.webContents.getBackgroundThrottling(),folder:${JSON.stringify(folder)},
    denseTarget:${JSON.stringify(process.env.KPLEX_UX_DENSE_TARGET || null)},scenarios:[],notices:[]};
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
  // Optional global alias repair is separate from authoritative graph/current-view readiness.
  c.primaryReady=()=>p.index.isFullSnapshotHydrated()&&!p.index.hasPendingSnapshotHydration()&&!p.index.hasPendingSemanticPreparation()&&!p.index.building;
  c.center=()=>c.root().querySelector(".kplex-role-center")?.dataset.kplexPath||p.settings.lastActivePath;
  // Hidden retained controls can share a localized label with the current editor toolbar.
  c.button=(key)=>Array.from(c.root().querySelectorAll("button")).find(b=>b.getAttribute("aria-label")===p.translator(key)&&b.getBoundingClientRect().width>0&&b.getBoundingClientRect().height>0);
  c.key=(target,key,extra={})=>target.dispatchEvent(new KeyboardEvent("keydown",{key,bubbles:true,cancelable:true,...extra}));
  c.input=(input,text)=>{input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,text);input.dispatchEvent(new Event("input",{bubbles:true}))};
  // Navigation settings update before the React scene. Wait for the actual destination so
  // trusted pointer input cannot race the previous center's navigation-reset effect.
  c.go=async(path)=>{p.notifyNavigation(path);await c.until(()=>p.settings.lastActivePath===path&&c.root().querySelector(".kplex-role-center")?.dataset.kplexPath===path,"Center did not render "+path);await c.frames()};
  c.openFind=async()=>{app.workspace.setActiveLeaf(c.leaf,{focus:true});c.root().focus();c.key(c.root(),"f",{metaKey:true});await c.until(()=>c.root().querySelector(".kplex-find-input")===document.activeElement,"Ctrl/Cmd+F focus failed");return document.activeElement};
  c.editor=async(enabled)=>{if(Boolean(p.settings.embedCentralNode)!==enabled){c.button(enabled?"app.useCentralNodeEditor":"app.useNormalCentralNode").click();await c.frames()}
    await c.until(()=>Boolean(c.root().querySelector(".kplex-central-editor-content"))===enabled,"Editor toggle did not render")};
  c.click=async(el)=>{const r=el.getBoundingClientRect();const x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);
    const hit=document.elementFromPoint(x,y);c.lastClick={label:el.getAttribute("aria-label"),point:[x,y],hitLabel:hit?.closest("button")?.getAttribute("aria-label"),hitClass:hit?.getAttribute("class")};
    c.check(hit===el||el.contains(hit),"Trusted click target is covered or outside the viewport: "+JSON.stringify(c.lastClick));
    win.focus();win.webContents.sendInputEvent({type:"mouseMove",x,y});await c.frames();
    win.webContents.sendInputEvent({type:"mouseDown",x,y,button:"left",clickCount:1});
    win.webContents.sendInputEvent({type:"mouseUp",x,y,button:"left",clickCount:1});await c.frames()};
  remote.app.focus({steal:true});win.show();win.focus();win.webContents.setBackgroundThrottling(false);
  win.setContentSize(1200,900);
  return JSON.stringify(true);
})()`;

/** Create owned Vault fixtures and prepare their canonical source facts and bounded graph scopes. */
const setup = `(()=>{const c=window.${controller};(async()=>{
  c.check(!app.vault.getAbstractFileByPath(c.folder),"Fixture folder already exists");
  await app.vault.createFolder(c.folder);c.owned.push(c.folder);
  const create=async(name,text)=>{const file=await app.vault.create(c.folder+"/"+name,text);c.owned.push(file.path);return file};
  const groups={Parent:[],Friend:[],Child:[]};
  for(const role of Object.keys(groups))for(let i=0;i<16;i++){
    const name=role+"-"+String(i).padStart(2,"0")+".md";groups[role].push(c.folder+"/"+name);
    await create(name,i===15?"---\\naliases: [Hidden overflow alias]\\n---\\n":"# "+name);
  }
  c.hub=c.folder+"/Hub.md";c.unrelated=c.folder+"/Unrelated.txt";c.canvas=c.folder+"/Drawing.canvas";
  c.tall=c.folder+"/Tall.png";c.wide=c.folder+"/Wide.png";
  c.existing=c.folder+"/Existing-target.md";await create("Existing-target.md","# Existing composer target");
  c.historyTargets={};for(const role of ["parent","child","left","right"]){const name="History-"+role+".md";c.historyTargets[role]=c.folder+"/"+name;await create(name,"# History target "+role)}
  const yaml=Object.entries(groups).map(([role,paths])=>role+":\\n"+paths.map(path=>"  - '[["+path+"]]'").join("\\n")).join("\\n");
  await create("Hub.md","---\\n"+yaml+"\\n---\\n# Hub\\n");
  await create("Unrelated.txt","Unrelated whole-vault file");
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
  const legacyAliasesPending=c.p.index.hasPendingSearchVocabulary();
  if(legacyAliasesPending){
    const ownedMarkdown=c.owned.filter(path=>path.endsWith(".md"));
    await c.p.index.patchMarkdownPaths(ownedMarkdown);
    c.fixtureDemands=[c.hub,c.folder+"/Child-00.md",c.folder+"/URLs.md"].map(path=>c.p.index.acquireSemanticDemand(path));
    c.p.notifyNavigation(c.hub);await c.p.index.refreshSemanticSettings();
  }else await c.p.rebuildIndex(false,true,"ux-fixture-seed");
  c.check(c.p.index.isFullSnapshotHydrated(),"Fixture graph seeding was cancelled");
  await c.until(()=>c.primaryReady(),"Fixture primary graph/current-view semantics did not settle",900000);
  // A complete rendered graph may precede the initial source inventory. Establish actual
  // editable authority during fixture setup, so cold source acquisition is not attributed
  // to the first gesture's existing action deadline. Neither delay nor graph flags grant it.
  c.check(await c.p.index.flushSourceRepository(),"Fixture source reconciliation remains incomplete");
  c.check(c.p.index.sourceAcquisition.hasSemanticDependencies(),"Fixture lacks source dependency authority");
  c.fixtureReadiness={mode:legacyAliasesPending?"owned-patch-and-requested-scopes":"full-seed",status:c.p.getIndexStatus(),aliasVocabularyPending:c.p.index.hasPendingSearchVocabulary(),source:c.p.index.getSourceAcquisitionCounters()};
  for(const path of [c.tall,c.wide,c.canvas,c.unrelated])c.p.index.insertCreatedFile(app.vault.getFileByPath(path));
  c.fixtureAliases=["Parent","Friend","Child"].map(role=>({role,aliases:c.p.index.get(c.folder+"/"+role+"-15.md")?.aliases}));
  c.check(c.fixtureAliases.every(item=>item.aliases.includes("Hidden overflow alias")),"Fixture aliases were not indexed");
  c.check(c.p.index.titleFor(c.p.index.get(c.folder+"/Parent-15.md")).includes("Parent-15"),"Find fixture must select file labels while retaining unused aliases");
  c.check(c.p.index.neighbours(c.p.index.get(c.folder+"/Child-00.md"),"child").some(item=>item.page.path===c.folder+"/Grandchild.md"),"Fixture expanded relationship was not materialized");
  app.workspace.setActiveLeaf(c.leaf,{focus:true});await c.until(()=>c.root()?.querySelector(".kplex-role-center"),"Fixture Plex did not render");
  await c.go(c.hub);c.done=true;
})().catch(e=>{c.error=e.stack;c.done=true});return JSON.stringify(true)})()`;

/** Run UI workflows using production React handlers, native FileViews and trusted captured-pointer input. */
const scenarios = `(()=>{const c=window.${controller};c.done=false;(async()=>{
  const record=(id,evidence={})=>c.scenarios.push({id,status:"passed",...evidence});
  const p=c.p, root=c.root();
  // Measure the real toolbar at different pane widths without changing persisted workspace geometry.
  const toolbar=root.querySelector(".kplex-topbar"),oldWidth=toolbar.style.getPropertyValue("width"),oldPriority=toolbar.style.getPropertyPriority("width"),toolbarWidths=[];
  try{for(const width of [1500,1100,700,570,300]){toolbar.style.setProperty("width",width+"px");await c.frames();const search=toolbar.querySelector(".kplex-search-shell").getBoundingClientRect(),actions=toolbar.querySelector(".kplex-top-actions").getBoundingClientRect(),filter=toolbar.querySelector(".kplex-top-actions").previousElementSibling.getBoundingClientRect();toolbarWidths.push({pane:width,width:search.width,gap:actions.left-filter.right-parseFloat(getComputedStyle(toolbar).gap),sameRow:Math.abs(actions.top-search.top)<5})}
    const [wide,middle,tight,minimum,narrow]=toolbarWidths;c.check(wide.sameRow&&middle.sameRow&&tight.sameRow&&minimum.sameRow,"Toolbar wrapped before consuming search width");c.check(Math.abs(wide.width-middle.width)<1&&middle.gap<wide.gap,"Toolbar margin must shrink before search width");c.check(tight.gap<1&&tight.width<middle.width&&minimum.width>=100,"Toolbar search did not shrink after margin disappeared");c.check(!narrow.sameRow,"Toolbar did not wrap below its usable minimum");
  }finally{oldWidth?toolbar.style.setProperty("width",oldWidth,oldPriority):toolbar.style.removeProperty("width");await c.frames()}
  record("toolbar-margin-search-shrink-before-wrap",{widths:toolbarWidths});
  const findStyle=getComputedStyle(root.querySelector(".kplex-find button")),zoomStyle=getComputedStyle(root.querySelector(".kplex-zoom-controls button"));
  for(const property of ["width","height","backgroundColor","borderRadius"])c.check(findStyle[property]===zoomStyle[property],"Find control differs from zoom controls: "+property);
  c.check(getComputedStyle(root.querySelector(".kplex-find")).backgroundColor==="rgba(0, 0, 0, 0)","Find wrapper has an opaque surface");
  record("Find-magnifier-matches-zoom-style",{width:findStyle.width,height:findStyle.height,background:findStyle.backgroundColor});
  c.key(root,"F4");await c.until(()=>document.activeElement===root.querySelector(".kplex-search"),"F4 did not focus Vault search");
  const vaultInput=document.activeElement;
  p.settings.showAttachments=false;
  for(const term of ["Unrelated.txt","Tall.png","Drawing.canvas"]){
    c.input(vaultInput,term);await c.until(()=>root.querySelector(".kplex-search-results")?.textContent.includes(term),"Vault search missing "+term);
    c.check(c.center()===c.hub,"Vault typing changed center");
  }
  p.settings.showAttachments=true;
  c.key(vaultInput,"Enter");await c.until(()=>c.center()===c.canvas,"Vault Enter did not activate the selected Canvas file");
  await c.until(()=>vaultInput.value==="","Vault activation did not clear its query");await c.go(c.hub);
  // Enter closes/blurs the shared suggester; reopen its focus lifetime before another Vault query.
  c.key(root,"F4");await c.until(()=>document.activeElement===root.querySelector(".kplex-search"),"F4 did not refocus Vault search after activation");
  c.check(vaultInput===document.activeElement,"Vault search input changed after Canvas activation");
  for(const term of ["help.obsidian.md","First Help alias","Second Help alias"]){
    c.input(vaultInput,term);await c.until(()=>root.querySelector(".kplex-search-results")?.textContent.includes("https://help.obsidian.md"),"Vault URL/alias search missing "+term);
  }
  c.key(vaultInput,"Escape");record("F4-whole-vault-files-URL-multiple-aliases");
  let find=await c.openFind();c.check(!root.querySelector(".kplex-search-results"),"Find opened Vault results");
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
  c.input(find,c.folder);await c.frames();c.check(root.querySelectorAll(".kplex-thought.is-highlighted").length===0,"Default Find matched hidden paths");
  const pathToggle=c.button("find.includePath");c.check(pathToggle,"Extended path toggle missing");pathToggle.click();await c.frames();
  c.check(pathToggle.getAttribute("aria-pressed")==="true"&&root.querySelectorAll(".kplex-thought.is-highlighted").length>3,"Extended path search did not include projected paths");
  c.check(!root.querySelector(".kplex-edge.is-highlighted"),"Path mode matched incidental connectors");pathToggle.click();await c.frames();
  c.input(find,"-15");await c.until(()=>root.querySelectorAll(".kplex-thought.is-highlighted").length===3,"Displayed labels should cover three projected regions",5000);
  c.key(find,"Enter");await c.frames();c.key(find,"Enter",{shiftKey:true});await c.frames();
  c.check(c.center()===centerBefore&&JSON.stringify(p.settings.navigationHistory)===historyBefore,"Find changed navigation history");
  c.input(find,"Unrelated.txt");await c.frames();c.check(root.querySelectorAll(".kplex-thought.is-highlighted").length===0,"Find searched an off-Plex file");
  const childScroll=root.querySelector(".kplex-zone-child .kplex-zone-scroll");childScroll.scrollTop=0;childScroll.dispatchEvent(new Event("scroll",{bubbles:true}));await c.frames();
  c.input(find,"Grandchild");await c.frames();c.check(root.querySelector(".kplex-expanded-mini-thought.is-find-match"),"Find missed expanded descendant");
  c.key(find,"Escape");await c.frames();record("independent-Plex-Find-displayed-values-path-toggle-overflow-expanded-history");
  await p.setGraphLenses([{id:"ux-exclude",name:"UX exclude",enabled:true,scope:"node",mode:"exclude",expression:'node.path.equals("'+c.folder+'/Parent-15.md")'}]);
  find=await c.openFind();c.input(find,"Parent-15");await c.frames();c.check(root.querySelectorAll(".kplex-thought.is-highlighted").length===0,"Find included a lens-excluded node");
  c.key(find,"Escape");await p.setGraphLenses([]);record("Plex-Find-projection-excludes");
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
  const dragGate=async(to,side="bottom",hoverTarget=null)=>{app.workspace.setActiveLeaf(c.leaf,{focus:true});gateWindow.show();gateWindow.focus();await c.frames();const gate=root.querySelector('.kplex-role-center [data-kplex-gate="'+side+'"]'),a=gate.getBoundingClientRect();
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
      if(hoverTarget)c.check(hoverTarget.classList.contains("is-relationship-drop-target"),"History target did not light during drag");
      wc.sendInputEvent({type:"mouseUp",x:Math.round(to.x),y:Math.round(to.y),button:"left",clickCount:1});await c.frames();
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
  const bounds=c.plex().getBoundingClientRect();await dragGate({x:bounds.right-50,y:bounds.bottom-120});
  await c.until(()=>modal(),"Empty gate drag did not open composer");
  const targetInput=modal().querySelector(".kplex-add-related-note-search input");
  // Type only after modal autofocus has settled; initial focus resets its typed-results lifetime.
  await c.until(()=>document.activeElement===targetInput,"Composer note input did not focus");await c.frames();c.input(targetInput,"Existing-target");
  await c.until(()=>document.querySelector(".kplex-search-results")?.textContent.includes("Existing-target"),"Existing note not suggested");
  c.key(targetInput,"Enter");await c.frames();c.check(linkButton()&&!linkButton().disabled,"Existing selection did not enable Link");
  const ontology=modal().querySelector(".kplex-add-related-ontology-search input");
  c.input(ontology,"");modal().querySelector(".kplex-fuzzy-disclosure").click();await c.frames();
  c.check(document.querySelector(".kplex-search-results"),"Empty ontology disclosure did not show fields");
  c.key(ontology,"Enter");await c.frames();const selectedField=ontology.value;c.check(selectedField,"Ontology dropdown did not select a field");
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
  try{for(const path of [c.tall,"https://Obsidian.md",...(c.denseTarget?[c.denseTarget]:[])]){
    c.check(p.index.get(path),"Non-Markdown fixture endpoint is missing: "+path);await c.go(path);await c.go(c.hub);
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
  const paintedImage=async()=>{const img=root.querySelector('[data-type="image"] img'),r=img.getBoundingClientRect();
    const scale=Math.min(r.width/img.naturalWidth,r.height/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;
    const x=r.x+(r.width-w)/2,y=r.y+(r.height-h)/2;await c.frames();
    // Use the same explicit NativeImage representation for dimensions and bitmap on Retina displays.
    const capture=await wc.capturePage({x:Math.round(x),y:Math.round(y),width:Math.round(w),height:Math.round(h)}),size=capture.getSize(1),bitmap=capture.toBitmap({scaleFactor:1});
    c.check(bitmap.length===size.width*size.height*4,"Native capture bitmap dimensions do not match its selected representation");
    const pixel=(sx,sy)=>{const i=(Math.round(sy*(size.height-1))*size.width+Math.round(sx*(size.width-1)))*4;return [bitmap[i+2],bitmap[i+1],bitmap[i]]};
    const pixels=[[.04,.04],[.96,.04],[.04,.96],[.96,.96]].map(([sx,sy])=>pixel(sx,sy));
    const expected=[[255,0,0],[0,255,0],[0,0,255],[255,255,0]];
    c.check(pixels.every((sample,i)=>sample.every((value,j)=>Math.abs(value-expected[i][j])<25)),"Image corner content cropped/distorted: "+JSON.stringify(pixels));
    return {natural:[img.naturalWidth,img.naturalHeight],painted:[w,h],pixels}};
  const tall={...imageCheck(),paint:await paintedImage()};
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
  c.key(root.querySelector(".kplex-find-input"),"Escape");record("maximized-editor-suspends-preserves-Plex-Find");
  await c.go(c.wide);await c.until(()=>root.querySelector('[data-type="image"] img')?.complete&&root.querySelector('[data-type="image"] img')?.naturalWidth===2000,"Second native image did not load");
  const wide={...imageCheck(),paint:await paintedImage()};const history=JSON.stringify(p.settings.navigationHistory);
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
      for(const delta of [10,20,35]){wc.sendInputEvent({type:"mouseMove",x,y:y+(top?-delta:delta),modifiers:["leftbuttondown"]});await c.frames();samples.push(area.getBoundingClientRect().height)}
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
  pr.dispatchEvent(new pw.KeyboardEvent("keydown",{key:"f",metaKey:true,bubbles:true,cancelable:true}));
  await c.until(()=>pr.querySelector(".kplex-find-input")===pd.activeElement,"Popout Ctrl/Cmd+F did not focus its own field");
  const popoutInput=pd.activeElement,popoutHistory=JSON.stringify(p.settings.navigationHistory);
  Object.getOwnPropertyDescriptor(pw.HTMLInputElement.prototype,"value").set.call(popoutInput,"Parent-15");popoutInput.dispatchEvent(new pw.Event("input",{bubbles:true}));
  await c.until(()=>pr.querySelector(".kplex-role-parent.is-highlighted"),"Popout Find did not highlight its projected hit");
  c.check(JSON.stringify(p.settings.navigationHistory)===popoutHistory,"Popout Find changed navigation history");
  const ps=pw.getComputedStyle(pr.querySelector(".kplex-find button")),pz=pw.getComputedStyle(pr.querySelector(".kplex-zoom-controls button"));
  for(const property of ["width","height","backgroundColor","borderRadius"])c.check(ps[property]===pz[property],"Popout Find differs from zoom controls");
  record("popout-Find-owning-document-focus-highlight-style-history",{width:ps.width,height:ps.height,background:ps.backgroundColor});
  c.popoutLeaf.detach();c.popoutLeaf=null;app.workspace.setActiveLeaf(c.leaf,{focus:true});
  // Locate issue #70's actual nested settings page, then exercise its real control writer.
  c.ownsSettings=true;app.setting.open();app.setting.openTabById("k-plex");
  const tab=app.setting.pluginTabs.find(t=>t.id==="k-plex");
  for(const key of ["settings.ui.visual.styling","settings.ui.node.styling"]){const row=Array.from(app.setting.getCurrentPageEl().querySelectorAll(".setting-item")).find(el=>el.querySelector(".setting-item-name")?.textContent===p.translator(key));c.check(row,"Label settings subpage missing: "+key);row.click();await c.frames()}
  for(const key of ["settings.ui.max.label.length","settings.ui.wrap.node.labels","settings.ui.maximum.node.width","settings.ui.maximum.central.node.width"]){const row=Array.from(app.setting.getCurrentPageEl().querySelectorAll(".setting-item")).find(el=>el.querySelector(".setting-item-name")?.textContent===p.translator(key));c.check(row?.querySelector("input,.checkbox-container"),"Label control missing from rendered settings: "+key)}
  app.setting.close();c.ownsSettings=false;
  p.settings.graphDepth=1;p.settings.layoutProfiles={...p.settings.layoutProfiles,"desktop:leaf":{...p.settings.layoutProfiles["desktop:leaf"],parentColumns:2,childColumns:2}};
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
  const fixture=app.vault.getFolderByPath(c.folder);if(fixture&&c.owned.includes(c.folder))await app.vault.delete(fixture,true);
  c.p.settings=c.settings;await c.p.saveSettings(false,false);
  if(c.settings.lastActivePath&&c.p.index.get(c.settings.lastActivePath))c.p.notifyNavigation(c.settings.lastActivePath);
  const win=require("@electron/remote").getCurrentWindow();win.setBounds(c.bounds);win.webContents.setBackgroundThrottling(c.throttling);
  c.done=true;
})().catch(e=>{c.error=e.stack;c.done=true});return JSON.stringify(true)})()`;

/** Optional mobile-emulation lane; reloads are outside the fixture/controller lifetime. */
async function deviceMatrix() {
  const baseline=evaluate('JSON.stringify((()=>{const w=require("@electron/remote").getCurrentWindow();return {mobile:app.isMobile,bounds:w.getBounds(),minimum:w.getMinimumSize()}})())');
  const liveSettings=evaluate('JSON.stringify(app.plugins.plugins["k-plex"].settings)');
  const webOwner="Kplex-UX-Web-Routing.md";
  let ownsWebOwner=false;
  const probe=async(width,height,expected)=>{
    cli("dev:errors", "clear");
    evaluate(`(()=>{const w=require("@electron/remote").getCurrentWindow();w.setMinimumSize(200,200);w.setContentSize(${width},${height});return JSON.stringify(true)})()`);
    await sleep(500);
    const environment=evaluate(`(()=>{const p=app.plugins.plugins["k-plex"],original=p.settings.layoutProfiles;
      // Distinct valid profile values identify the actual environment selected by the production adapter.
      p.settings.layoutProfiles={...original,"desktop:leaf":{...original["desktop:leaf"],compactingFactor:2.01},"tablet:leaf":{...original["tablet:leaf"],compactingFactor:2.02},"mobile:leaf":{...original["mobile:leaf"],compactingFactor:2.03}};
      try{const value=p.getActiveLayoutProfile("leaf").compactingFactor;return JSON.stringify({device:value===2.01?"desktop":value===2.02?"tablet":value===2.03?"phone":"unknown",mobile:app.isMobile,size:[innerWidth,innerHeight],bodyClasses:document.body.className})}finally{p.settings.layoutProfiles=original}
    })()`);
    assert.equal(environment.device,expected,`Actual classification: ${JSON.stringify(environment)}`);
    evaluate(`(()=>{const c=window.__kplexUxDevice={done:false,error:null,leaf:app.workspace.getLeaf(true)};
      c.leaf.setViewState({type:"k-plex-react-view",active:true}).then(()=>{app.workspace.setActiveLeaf(c.leaf,{focus:true});c.done=true}).catch(e=>{c.error=e.stack;c.done=true});return JSON.stringify(true)})()`);
    await until('JSON.stringify(window.__kplexUxDevice.error?{error:window.__kplexUxDevice.error}:window.__kplexUxDevice.done)',"Emulated view did not open");
    await until('JSON.stringify(Boolean(window.__kplexUxDevice.leaf.view.contentEl.querySelector(".kplex-find button")))',"Emulated Find magnifier did not render");
    evaluate('(()=>{window.__kplexUxDevice.leaf.view.contentEl.querySelector(".kplex-find button").click();return JSON.stringify(true)})()');
    const geometry=await until(`JSON.stringify((()=>{const root=window.__kplexUxDevice.leaf.view.contentEl,input=root.querySelector(".kplex-find-input");if(document.activeElement!==input)return false;
      const find=root.querySelector(".kplex-find").getBoundingClientRect(),plex=root.querySelector(".kplex-plex").getBoundingClientRect();
      return {inside:find.left>=plex.left-1&&find.right<=plex.right+1&&find.top>=plex.top-1,dropdown:Boolean(root.querySelector(".kplex-find [role=listbox]")),width:find.width,available:plex.width,searchHint:root.querySelector(".kplex-search").placeholder}
    })())`,"Emulated magnifier did not focus its Find field");
    assert(geometry.inside&&!geometry.dropdown,JSON.stringify(geometry));
    if(expected!=="desktop")assert(!geometry.searchHint.includes("F4"),"Mobile hint assumes a hardware keyboard");
    // A validated source-backed startup is authoritative without a complete graph acceleration
    // snapshot. Require settled source/current-view authority, not the optional full-graph flag.
    await until('JSON.stringify((()=>{const p=app.plugins.plugins["k-plex"],i=p.index;return (i.isFullSnapshotHydrated()||i.hasSourceBackedStartup()&&p.getIndexStatus().upToDate&&i.sourceAcquisition.hasSemanticDependencies())&&!i.hasPendingSnapshotHydration()&&!i.hasPendingSemanticPreparation()&&!i.building})())',"Emulated primary source/graph authority did not complete",1_800_000);
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
  } finally {
    try{evaluate('(()=>{window.__kplexUxDevice?.leaf?.detach();delete window.__kplexUxDevice;return JSON.stringify(true)})()')}catch{}
    if(ownsWebOwner){evaluate(`(()=>{window.__kplexUxWebCleanup={done:false,error:null};const file=app.vault.getFileByPath(${JSON.stringify(webOwner)});(file?app.vault.delete(file):Promise.resolve()).then(()=>{window.__kplexUxWebCleanup.done=true}).catch(e=>{window.__kplexUxWebCleanup.error=e.stack;window.__kplexUxWebCleanup.done=true});return JSON.stringify(true)})()`);await until('JSON.stringify(window.__kplexUxWebCleanup.error?{error:window.__kplexUxWebCleanup.error}:window.__kplexUxWebCleanup.done)',"Web routing fixture cleanup failed")}
    evaluate('(()=>{delete window.__kplexUxWebSetup;delete window.__kplexUxWebCleanup;return JSON.stringify(true)})()');
    const current=evaluate('JSON.stringify(app.isMobile)');
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
  // A previous stress run can leave a 20k-contributor center whose requested-scope decode
  // deliberately exceeds its budget. Select an existing small note before strict readiness.
  const setupCenter=process.env.KPLEX_UX_SETUP_CENTER||"Welcome.md";
  if(evaluate(`JSON.stringify(Boolean(app.vault.getFileByPath(${JSON.stringify(setupCenter)})))`)){
    await until(`JSON.stringify(Boolean(app.plugins.plugins["k-plex"].index.getVaultSearchPage(${JSON.stringify(setupCenter)})))`,"Setup center did not become available",1_800_000);
    evaluate(`(()=>{const p=app.plugins.plugins["k-plex"],page=p.index.getVaultSearchPage(${JSON.stringify(setupCenter)});if(page?.file&&!p.index.get(page.path))p.index.insertCreatedFile(page.file);p.notifyNavigation(${JSON.stringify(setupCenter)});return JSON.stringify(true)})()`);
    report.setupCenter=setupCenter;
  }
  console.log("Waiting for test-vault index readiness");
  // Navigation alone does not reopen a completed/cancelled startup coordinator. Use the same
  // readiness entry point as opening a view; never manufacture readiness by changing its flags.
  evaluate(`(()=>{const c=window.${controller};c.readinessRecovery={done:false,error:null};
    (async()=>{await c.p.ensureIndexReady("ux-test-setup");
      if(!c.p.index.isFullSnapshotHydrated()&&!c.p.index.hasPendingSnapshotHydration())await c.p.rebuildIndex(false,true,"ux-initial-seed");
      await c.p.index.refreshSemanticSettings();
      c.readinessRecovery.done=true})().catch(e=>{c.readinessRecovery.error=e.stack;c.readinessRecovery.done=true});return JSON.stringify(true)})()`);
  await until(`JSON.stringify(window.${controller}.readinessRecovery.error?{error:window.${controller}.readinessRecovery.error}:window.${controller}.readinessRecovery.done&&window.${controller}.primaryReady())`, "Initial primary graph/current-view semantics did not settle", 1_800_000);
  report.startupReadiness=evaluate(`JSON.stringify((()=>{const c=window.${controller},center=c.root().querySelector(".kplex-role-center")?.dataset.kplexPath,page=c.p.index.get(center);return {center,centerNeighbours:page?c.p.index.neighbourCount(page):null,primaryReady:c.primaryReady(),failure:c.p.index.getSemanticPreparationFailure(),status:c.p.getIndexStatus(),aliasVocabularyPending:c.p.index.hasPendingSearchVocabulary(),source:c.p.index.getSourceAcquisitionCounters(),semantic:c.p.index.getSemanticPreparationDiagnostics()}})())`);
  if(report.setupCenter){assert.equal(report.startupReadiness.center,report.setupCenter,"Setup center is not rendered");assert.equal(report.startupReadiness.failure,null,"Ordinary setup center still has a terminal scope failure");}
  console.log("Index ready; creating the owned UX fixture");
  cli("dev:errors", "clear");
  evaluate(setup);
  await until(`JSON.stringify(window.${controller}.error?{error:window.${controller}.error}:window.${controller}.done)`, "Fixture setup timed out",900000);
  console.log("Fixture ready; running UX workflows");
  evaluate(scenarios);
  await until(`JSON.stringify(window.${controller}.error?{error:window.${controller}.error}:window.${controller}.done)`, "UX scenarios timed out", 300_000);
  report.scenarios = evaluate(`JSON.stringify(window.${controller}.scenarios)`);
  report.fixtureReadiness=evaluate(`JSON.stringify(window.${controller}.fixtureReadiness)`);
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
      pairTrace:c.pairTrace,notices:c.notices,linkDisabled:document.querySelector(".kplex-add-related-link-button")?.disabled,relationshipWrites:c.p.relationshipWriteCancels.size,sourceDiagnostics:c.p.index.getSourceRepositoryDiagnostics(),highlightedNodes:r?.querySelectorAll(".kplex-thought.is-highlighted").length,resize:c.lastResize,gate:c.lastGate,bodyDrag:c.lastBodyDrag,dragEvents:c.dragEvents,lastClick:c.lastClick,
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
    evaluate(`(()=>{window.${controller}?.restorePairTrace?.();delete window.${controller};return JSON.stringify(true)})()`);
    writeFileSync(dataPath,originalData);
    assert(readFileSync(dataPath).equals(originalData),"Original settings bytes were not restored");
    assert(readFileSync(enabledPath).equals(originalEnabled),"Community plugin enablement changed");
    report.cleanup="passed";
  } catch(error) {report.cleanup=error.stack;report.status="failed"}
  // Wrapper lifetime is independent of fixture cleanup and its native async failures.
  if(installed)try{evaluate(`(()=>{window.${controller}?.restorePairTrace?.();return JSON.stringify(true)})()`)}catch(error){report.traceCleanupError=error.message;report.status="failed"}
  if(report.status==="passed"&&process.env.KPLEX_UX_EMULATE_MOBILE==="true")try{await deviceMatrix()}catch(error){report.deviceError=error.stack;report.status="failed"}
  try {hashes()} catch(error) {report.artifactError=error.message;report.status="failed"}
  report.completedAt = new Date().toISOString();
  writeFileSync(join(reportDir,"report.json"),JSON.stringify(report,null,2)+"\n");
}
console.log(`UX verification ${report.status}; report: ${join(reportDir,"report.json")}`);
if(report.error)console.error(report.error);
if(report.status!=="passed")process.exitCode=1;
