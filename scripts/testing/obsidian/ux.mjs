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
      const progress = evaluate(`JSON.stringify((()=>{const p=app.plugins.plugins["k-plex"];return {status:p.getIndexStatus(),progress:p.getStartupDiagnostics().progress,activeSemanticPreparation:p.index.hasActiveSemanticPreparation(),alias:p.index.getUrlAliasUpgradeProgress(),completedScenarios:window.${controller}?.scenarios?.map(s=>s.id),activeInput:document.activeElement?.className}})())`);
      console.log("Native readiness progress:", JSON.stringify(progress));
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
    bounds:win.getBounds(),throttling:win.webContents.getBackgroundThrottling(),folder:${JSON.stringify(folder)},scenarios:[]};
  c.wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
  c.frames=()=>new Promise(resolve=>window.requestAnimationFrame(()=>window.requestAnimationFrame(resolve)));
  c.check=(ok,message)=>{if(!ok)throw new Error(message)};
  c.until=async(fn,message,timeout=180000)=>{const end=Date.now()+timeout;while(!fn()){if(Date.now()>end)throw new Error(message);await c.wait(50)}};
  c.root=()=>c.leaf.view.contentEl.querySelector(".kplex-app");
  c.plex=()=>c.root().querySelector(".kplex-plex");
  // Optional global alias repair is separate from authoritative graph/current-view readiness.
  c.primaryReady=()=>p.index.isFullSnapshotHydrated()&&!p.index.hasPendingSnapshotHydration()&&!p.index.hasPendingSemanticPreparation()&&!p.index.building;
  c.center=()=>c.root().querySelector(".kplex-role-center")?.dataset.kplexPath||p.settings.lastActivePath;
  c.button=(key)=>Array.from(c.root().querySelectorAll("button")).find(b=>b.getAttribute("aria-label")===p.translator(key));
  c.key=(target,key,extra={})=>target.dispatchEvent(new KeyboardEvent("keydown",{key,bubbles:true,cancelable:true,...extra}));
  c.input=(input,text)=>{input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,text);input.dispatchEvent(new Event("input",{bubbles:true}))};
  c.go=async(path)=>{p.notifyNavigation(path);await c.until(()=>p.settings.lastActivePath===path,"Center did not navigate to "+path);await c.frames()};
  c.openFind=async()=>{app.workspace.setActiveLeaf(c.leaf,{focus:true});c.root().focus();c.key(c.root(),"f",{metaKey:true});await c.until(()=>c.root().querySelector(".kplex-find-input")===document.activeElement,"Ctrl/Cmd+F focus failed");return document.activeElement};
  c.editor=async(enabled)=>{if(Boolean(p.settings.embedCentralNode)!==enabled){c.button(enabled?"app.useCentralNodeEditor":"app.useNormalCentralNode").click();await c.frames()}
    await c.until(()=>Boolean(c.root().querySelector(".kplex-central-editor-content"))===enabled,"Editor toggle did not render")};
  c.click=async(el)=>{const r=el.getBoundingClientRect();const x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);
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
  await create("URLs.md","[First Help alias](https://help.obsidian.md)\\n[Second Help alias](https://help.obsidian.md)\\n[Video](https://www.youtube.com/watch?v=dQw4w9WgXcQ)\\n[Shorts](https://www.youtube.com/shorts/dQw4w9WgXcQ)\\n[Vimeo](https://vimeo.com/76979871)");
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
  c.fixtureReadiness={mode:legacyAliasesPending?"owned-patch-and-requested-scopes":"full-seed",status:c.p.getIndexStatus(),aliasVocabularyPending:c.p.index.hasPendingSearchVocabulary(),source:c.p.index.getSourceAcquisitionCounters()};
  for(const path of [c.tall,c.wide,c.canvas,c.unrelated])c.p.index.insertCreatedFile(app.vault.getFileByPath(path));
  c.fixtureAliases=["Parent","Friend","Child"].map(role=>({role,aliases:c.p.index.get(c.folder+"/"+role+"-15.md")?.aliases}));
  c.check(c.fixtureAliases.every(item=>item.aliases.includes("Hidden overflow alias")),"Fixture aliases were not indexed");
  c.check(c.p.index.neighbours(c.p.index.get(c.folder+"/Child-00.md"),"child").some(item=>item.page.path===c.folder+"/Grandchild.md"),"Fixture expanded relationship was not materialized");
  app.workspace.setActiveLeaf(c.leaf,{focus:true});await c.until(()=>c.root()?.querySelector(".kplex-role-center"),"Fixture Plex did not render");
  await c.go(c.hub);c.done=true;
})().catch(e=>{c.error=e.stack;c.done=true});return JSON.stringify(true)})()`;

/** Run UI workflows using production React handlers, native FileViews and trusted captured-pointer input. */
const scenarios = `(()=>{const c=window.${controller};c.done=false;(async()=>{
  const record=(id,evidence={})=>c.scenarios.push({id,status:"passed",...evidence});
  const p=c.p, root=c.root();
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
  c.input(find,"Parent-15");await c.until(()=>root.querySelector(".kplex-role-parent.is-highlighted"),"Projected hit not highlighted");
  await c.frames();c.check(!root.querySelector(".kplex-edge.is-highlighted"),"Note matches must not highlight incident relationships");
  c.input(find,"Parent");await c.until(()=>root.querySelector(".kplex-edge.is-highlighted"),"Matching parent ontology did not highlight its connectors");
  c.input(find,"Parent-15");await c.frames();
  c.check(!root.querySelector(".kplex-find [role=listbox],.kplex-find [role=option]"),"Find rendered a dropdown");
  const parentScroll=root.querySelector(".kplex-zone-parent .kplex-zone-scroll");
  c.check(parentScroll?.scrollTop>0,"Find did not reveal overflow hit");
  const centerBefore=c.center(),historyBefore=JSON.stringify(p.settings.navigationHistory);
  c.input(find,"Hidden overflow alias");await c.until(()=>root.querySelectorAll(".kplex-thought.is-highlighted").length===3,"Alias matches should cover three projected regions",5000);
  c.key(find,"Enter");await c.frames();c.key(find,"Enter",{shiftKey:true});await c.frames();
  c.check(c.center()===centerBefore&&JSON.stringify(p.settings.navigationHistory)===historyBefore,"Find changed navigation history");
  c.input(find,"Unrelated.txt");await c.frames();c.check(root.querySelectorAll(".kplex-thought.is-highlighted").length===0,"Find searched an off-Plex file");
  const childScroll=root.querySelector(".kplex-zone-child .kplex-zone-scroll");childScroll.scrollTop=0;childScroll.dispatchEvent(new Event("scroll",{bubbles:true}));await c.frames();
  c.input(find,"Grandchild");await c.frames();c.check(root.querySelector(".kplex-expanded-mini-thought.is-find-match"),"Find missed expanded descendant");
  c.key(find,"Escape");await c.frames();record("independent-Plex-Find-overflow-alias-expanded-history");
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
  const wc=require("@electron/remote").getCurrentWindow().webContents;
  const dragGate=async(to)=>{const gate=root.querySelector('.kplex-role-center [data-kplex-gate="bottom"]'),a=gate.getBoundingClientRect();
    const x=Math.round(a.x+a.width/2),y=Math.round(a.y+a.height/2);
    wc.sendInputEvent({type:"mouseMove",x,y});wc.sendInputEvent({type:"mouseDown",x,y,button:"left",clickCount:1});await c.frames();
    for(let step=1;step<=5;step++){wc.sendInputEvent({type:"mouseMove",x:Math.round(x+(to.x-x)*step/5),y:Math.round(y+(to.y-y)*step/5),modifiers:["leftbuttondown"]});await c.frames()}
    wc.sendInputEvent({type:"mouseUp",x:Math.round(to.x),y:Math.round(to.y),button:"left",clickCount:1});await c.frames()};
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
    const r=button.getBoundingClientRect();await dragGate({x:r.x+r.width/2,y:r.y+r.height/2});
    await c.until(()=>document.querySelector(".menu .menu-item"),"Gate-to-history did not open role menu");
    const labels=["role.parent","role.child","role.friend","role.challenger"].map(k=>p.translator(k));
    const items=Array.from(document.querySelectorAll(".menu .menu-item"));c.check(labels.every(label=>items.some(i=>i.textContent.includes(label))),"History menu lacks a role");
    const wanted=p.translator(role==="left"?"role.friend":role==="right"?"role.challenger":"role."+role);
    items.find(i=>i.textContent.includes(wanted)).click();await c.until(()=>modal(),"History role did not open fixed-target composer");
    const field=modal().querySelector(".kplex-add-related-ontology-search input").value;linkButton().click();await c.until(()=>!modal(),"History Link did not commit");
    await linked(path,field);c.check(p.index.neighbours(p.index.get(c.hub),role).some(n=>n.page.path===path),"History relationship has the wrong role: "+role);
    record("gate-to-history-commit-"+role,{field});
  }}finally{p.showKplexMenuAtPosition=showPosition}
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
  const tall={...imageCheck(),paint:await paintedImage()};await c.go(c.wide);await c.until(()=>root.querySelector('[data-type="image"] img')?.complete&&root.querySelector('[data-type="image"] img')?.naturalWidth===2000,"Second native image did not load");
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
  c.done=true;
})().catch(e=>{c.error=e.stack;c.done=true});return JSON.stringify(true)})()`;

/** Clean up even a partially created fixture and flush the original settings before byte restoration. */
const cleanup = `(()=>{const c=window.${controller};if(!c)return JSON.stringify(true);c.done=false;c.error=null;(async()=>{
  c.statsModalEl?.querySelector(".modal-content button.mod-cta")?.click();
  if(c.ownsRelationModal){
    // Obsidian's Modal has no close-button element in this host; use its real Escape lifecycle.
    const wc=require("@electron/remote").getCurrentWindow().webContents;
    for(let i=0;i<2&&document.querySelector(".kplex-add-related-modal");i++){
      wc.sendInputEvent({type:"keyDown",keyCode:"Escape"});wc.sendInputEvent({type:"keyUp",keyCode:"Escape"});await c.wait(50);
    }
    c.check(!document.querySelector(".kplex-add-related-modal"),"Owned related-note modal survived cancellation");
  }
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
    // Mobile emulation reloads the real vault. Complete its existing bounded primary startup
    // prerequisite before timing a URL element assertion; a rendered Find button is not source
    // authority. This uses the same 30-minute startup bound as the desktop setup, not the
    // interaction wait, and leaves optional alias work independent.
    await until('JSON.stringify((()=>{const i=app.plugins.plugins["k-plex"].index;return i.isFullSnapshotHydrated()&&!i.hasPendingSnapshotHydration()&&!i.building})())',"Emulated primary graph hydration did not complete",1_800_000);
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
  evaluate(nativeController);installed = true;
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
  report.startupReadiness=evaluate(`JSON.stringify((()=>{const c=window.${controller};return {primaryReady:c.primaryReady(),status:c.p.getIndexStatus(),aliasVocabularyPending:c.p.index.hasPendingSearchVocabulary(),source:c.p.index.getSourceAcquisitionCounters(),semantic:c.p.index.getSemanticPreparationDiagnostics()}})())`);
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
      highlightedNodes:r?.querySelectorAll(".kplex-thought.is-highlighted").length,resize:c.lastResize,
      vaultInput:r?.querySelector(".kplex-search")?.value,vaultResults:r?.querySelector(".kplex-search-results")?.textContent,
      popoutRootConnected:c.popoutRootForFind?.isConnected,
      popoutRootCurrent:c.popoutRootForFind===c.popoutLeaf?.view.contentEl.querySelector(".kplex-app"),
      expandedNodes:r?.querySelectorAll(".kplex-expanded-mini-thought").length,
      nativeType:r?.querySelector(".kplex-central-editor-leaf-host .workspace-leaf-content")?.dataset.type
    }})())`);
  } catch {}
} finally {
  if (installed) try {
    evaluate(cleanup);
    await until(`JSON.stringify(window.${controller}.error?{error:window.${controller}.error}:window.${controller}.done)`, "UX cleanup timed out");
    evaluate(`(()=>{delete window.${controller};return JSON.stringify(true)})()`);
    writeFileSync(dataPath,originalData);
    assert(readFileSync(dataPath).equals(originalData),"Original settings bytes were not restored");
    assert(readFileSync(enabledPath).equals(originalEnabled),"Community plugin enablement changed");
    report.cleanup="passed";
  } catch(error) {report.cleanup=error.stack;report.status="failed"}
  if(report.status==="passed"&&process.env.KPLEX_UX_EMULATE_MOBILE==="true")try{await deviceMatrix()}catch(error){report.deviceError=error.stack;report.status="failed"}
  try {hashes()} catch(error) {report.artifactError=error.message;report.status="failed"}
  report.completedAt = new Date().toISOString();
  writeFileSync(join(reportDir,"report.json"),JSON.stringify(report,null,2)+"\n");
}
console.log(`UX verification ${report.status}; report: ${join(reportDir,"report.json")}`);
if(report.error)console.error(report.error);
if(report.status!=="passed")process.exitCode=1;
