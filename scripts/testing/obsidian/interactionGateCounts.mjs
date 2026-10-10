/**
 * B/#28 bounded native fixture probe. Runs only against CONTRIBUTING's explicitly configured
 * disposable vault. Copies the checked-in fixture through Vault APIs, owns a separate K-Plex
 * leaf, restores settings/data bytes and independently retires notes/listeners/wrappers/leaves.
 * KPLEX_GATE_USE_EXISTING_FIXTURE=true instead validates the 11 exact root fixture bodies and
 * reads them without any write/delete operation; copied-folder resolution may differ in real hosts.
 * Use KPLEX_GATE_EXPECTATION=baseline for installed old code or fixed for the verified new build.
 * This probe is not physical mobile acceptance, and it must run serially with other native drivers.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { validateTarget } from "./runner.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const reportDir = process.env.KPLEX_HOST_REPORT_DIR;
assert(reportDir && (!existsSync(reportDir) || readdirSync(reportDir).length === 0), "Explicit fresh KPLEX_HOST_REPORT_DIR required"); mkdirSync(reportDir, { recursive: true });
const expectation = process.env.KPLEX_GATE_EXPECTATION || "fixed";
const useExisting = process.env.KPLEX_GATE_USE_EXISTING_FIXTURE === "true";
assert(["baseline", "fixed"].includes(expectation));
const originalData = readFileSync(join(target.pluginDir, "data.json"));
const report = { status: "running", startedAt: new Date().toISOString(), target: vaultName, expectation, useExistingFixture: useExisting, scenarios: [], artifacts: {}, cleanup: {} };
const fixtureRoot = join(root, "tests/fixtures/excalibrain-indexing/Vault");
/** Read only checked-in fixture bodies and retain exact repository-relative paths. */
function payload(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? payload(join(directory, entry.name))
    : [{ path: relative(fixtureRoot, join(directory, entry.name)).replaceAll("\\", "/"), body: readFileSync(join(directory, entry.name), "utf8") }]);
}
const fixture = payload(fixtureRoot);
report.fixtureHashes = Object.fromEntries(fixture.filter(item => !useExisting || !item.path.includes("/")).map(item => [item.path, createHash("sha256").update(item.body).digest("hex")]));
const controller = "__kplexInteractionGateProbe";
/** Run one validated expression without a shell or repeating mutating calls after a timeout. */
function evaluate(code) {
  new Script(code);
  const result = spawnSync(process.env.KPLEX_OBSIDIAN_CLI || "obsidian", [`vault=${vaultName}`, "eval", `code=${code}`],
    { cwd: root, encoding: "utf8", timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, /^Error:/m);
  const value = JSON.parse(result.stdout.trim().replace(/^=>\s*/, ""));
  // Controller outcomes retain diagnostic fields even on failure; the caller asserts after recording them.
  return value;
}
/** Poll only controller state; native asynchronous work runs between short reads. */
async function poll(code, message, timeout = 300_000) {
  const end = Date.now() + timeout;
  while (true) {
    const value = evaluate(code); if (value) return value;
    assert(Date.now() < end, message); await new Promise(done => setTimeout(done, 250));
  }
}
/** Record installed artifact identity; the fixed lane additionally refuses unstaged dist output. */
function hashes() {
  for (const name of ["main.js", "manifest.json", "styles.css"]) {
    const hash = path => createHash("sha256").update(readFileSync(path)).digest("hex");
    report.artifacts[name] = hash(join(target.pluginDir, name));
    if (expectation === "fixed") assert.equal(report.artifacts[name], hash(join(root, "dist", name)), `${name} is not the final staged build`);
  }
}
let installed = false;
try {
  hashes();
  evaluate(`(()=>{
    if(window.${controller})throw Error("Prior count probe still exists");
    const p=app.plugins.plugins["k-plex"];if(!p)throw Error("K-Plex unavailable");
    const c=window.${controller}={p,folder:"Kplex-Interaction-Gates-"+Date.now(),originalSettings:JSON.parse(JSON.stringify(p.settings)),
      originalLeaf:app.workspace.getMostRecentLeaf(),files:[],fixtureFiles:[],fixtureChecks:[],folders:[],releases:[],wrappers:[],scenarios:[],counts:{},writes:new Set(),done:false,error:null,cancelled:false};
    const originalSave=p.saveData;p.saveData=function(...args){const result=originalSave.apply(this,args);c.writes.add(result);result.then(()=>c.writes.delete(result),()=>c.writes.delete(result));return result};c.restoreSave=()=>{p.saveData=originalSave};
    c.prefix=${JSON.stringify(useExisting)}?"":c.folder+"/";
    c.wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
    c.frames=()=>new Promise(resolve=>window.requestAnimationFrame(()=>window.requestAnimationFrame(resolve)));
    c.check=(ok,message)=>{if(!ok)throw Error(message)};
    c.until=async(fn,message,timeout=180000)=>{const end=Date.now()+timeout;while(!fn()){c.check(!c.cancelled,"Count probe cancelled");c.check(Date.now()<end,message);await c.wait(50)}};
    c.root=()=>c.leaf?.view.contentEl.querySelector(".kplex-app");
    c.wrap=(owner,name)=>{if(typeof owner[name]!=="function")return;const original=owner[name],key=name;
      c.counts[key]=0;owner[name]=function(...args){c.counts[key]++;return original.apply(this,args)};c.wrappers.push(()=>{owner[name]=original})};
    c.input=(el,value)=>{const view=el.ownerDocument.defaultView,proto=el.tagName==="SELECT"?view.HTMLSelectElement.prototype:view.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto,"value").set.call(el,value);el.dispatchEvent(new view.Event(el.tagName==="SELECT"?"change":"input",{bubbles:true}))};
    // Expanded descendants can share a path without having gates. Read the represented thought
    // with an actual gate, not whichever duplicate path occurs first in the DOM.
    c.gatedD=()=>Array.from(c.root()?.querySelectorAll(".kplex-thought")??[]).find(n=>n.dataset.kplexPath===c.prefix+"Note D.md"&&n.querySelector('[data-kplex-gate="right"]'));
    c.snapshot=()=>{const node=c.gatedD(),p=c.p;
      const gates=node?Object.fromEntries(["top","bottom","left","right"].map(side=>[side,node.querySelector(".gate-wrap-"+side+" .kplex-gate-count")?.textContent??null])):null;
      const page=p.index.get(c.prefix+"Note D.md"),stats=page?p.index.gateStats(page):null;
      return {gates,stats,sourceRevision:p.getIndexSourceRevision(),semanticRevision:p.index.getSemanticRevision(),acquisition:p.index.getSourceAcquisitionCounters(),wrapped:{...c.counts},
        center:c.root()?.querySelector(".kplex-role-center")?.dataset.kplexPath,nodes:Array.from(c.root()?.querySelectorAll(".kplex-thought")??[]).map(n=>({path:n.dataset.kplexPath,hasRightGate:Boolean(n.querySelector('[data-kplex-gate="right"]'))})),
        activePreparation:p.index.hasActiveSemanticPreparation(),pendingPreparation:p.index.hasPendingSemanticPreparation()}};
    c.run=(async()=>{
      const ensure=async(path)=>{if(app.vault.getFolderByPath(path))return;const parent=path.includes("/")?path.slice(0,path.lastIndexOf("/")):null;if(parent)await ensure(parent);await app.vault.createFolder(path);c.folders.push(path)};
      if(!${JSON.stringify(useExisting)})await ensure(c.folder);
      for(const item of ${JSON.stringify(fixture)}){
        if(${JSON.stringify(useExisting)}){
          if(item.path.includes("/"))continue;
          const file=app.vault.getFileByPath(item.path);c.check(file,"Exact original root fixture missing: "+item.path);
          c.check(await app.vault.read(file)===item.body,"Existing fixture body differs from checked-in original: "+item.path);
          c.fixtureFiles.push(file.path);c.fixtureChecks.push({path:file.path,exactBodyMatch:true,size:file.stat.size});
        }else{
          const path=c.folder+"/"+item.path;await ensure(path.slice(0,path.lastIndexOf("/")));const file=await app.vault.create(path,item.body);
          c.files.push(file.path);c.fixtureFiles.push(file.path);
        }
      }
      await c.until(()=>c.fixtureFiles.every(path=>app.metadataCache.getFileCache(app.vault.getFileByPath(path))),"Original fixture metadata did not settle");
      Object.assign(p.settings,{embedCentralNode:false,documentSyncMode:"off",followActiveFile:false,autoOpenCentralDocument:false,graphDepth:2,
        renderAlias:true,nameFields:"aliases",maxItemCount:100,showNeighborCount:true,graphLenses:[],animationSpeed:0,
        showInferredNodes:true,showPageNodes:true,showVirtualNodes:true,showAttachments:true,showFolderNodes:true,showTagNodes:true,showURLNodes:true,
        inferAllLinksAsFriends:false,inverseInfer:false,excludeFilepaths:[],lastActivePath:c.prefix+"Note A.md",navigationHistory:[c.prefix+"Note A.md"]});
      p.settings.hierarchy={hidden:["Hidden"],parents:["Parent","source"],children:["Child"],leftFriends:["Friend"],rightFriends:["Challenger"],previous:["Previous"],next:["Next"],exclusions:[]};
      await p.saveSettings(true,false);
      const ownedMarkdown=c.fixtureFiles.filter(path=>path.endsWith(".md"));
      // getFileCache alone precedes Obsidian's resolved-link map and the coalesced create/metadata
      // coordinator. Join those actual observable owners before starting a diagnostic direct patch.
      await c.until(()=>["Note A","Note C","Note F"].every(name=>app.metadataCache.resolvedLinks[c.prefix+name+".md"]?.[c.prefix+"Note D.md"]>0),"Original fixture A/C/F→D host resolution did not settle");
      const joinOwners=async()=>{
        await c.until(()=>!p.index.building&&!p.index.hasActiveSemanticPreparation()&&!p.rebuildTask
          &&p.rebuildTimer===null&&p.visibleMetadataTimer===null,"Actual create/metadata/source owners did not release the fixture patch lane");
        if(p.index.hasPendingStructuralMaintenance())await p.index.waitForStructuralMaintenance();
      };
      await joinOwners();
      // The ordinary patch requires indexed identities. Bind only absent owned notes; never scan
      // or force a full vault build. Partial commits stay accepted when a real event supersedes work.
      for(const path of ownedMarkdown)if(!p.index.get(path))p.index.insertCreatedFile(app.vault.getFileByPath(path));
      c.setupAttempts=[];let pending=[...ownedMarkdown],committed=0;const setupDeadline=Date.now()+180000;
      while(pending.length){
        c.check(Date.now()<setupDeadline&&c.setupAttempts.length<16,"Owned setup patch did not reach a current final publication");
        await joinOwners();
        const sourceBefore=p.getIndexSourceRevision(),generationBefore=p.index.generation,policyBefore=p.index.semanticPolicyRevision;
        const metadataBefore=pending.map(path=>[path,app.metadataCache.getFileCache(app.vault.getFileByPath(path))]);
        const result=await p.index.patchMarkdownPaths(pending,{forceRecompile:true});
        const sourceAfter=p.getIndexSourceRevision(),generationAfter=p.index.generation,policyAfter=p.index.semanticPolicyRevision;
        const metadataChanged=metadataBefore.some(([path,cache])=>app.metadataCache.getFileCache(app.vault.getFileByPath(path))!==cache);
        c.setupAttempts.push({result,sourceBefore,sourceAfter,generationBefore,generationAfter,policyBefore,policyAfter,metadataChanged});
        committed+=result.count;
        if(result.outcome==="patched"){pending=[];break}
        c.check(result.outcome==="cancelled","Owned patch requires a broader unsupported rebuild: "+JSON.stringify(result));
        // Retry only remaining owned paths after an observed source/policy/cache/competing-generation
        // retirement; unchanged terminal failures stay failures instead of being hidden by retries.
        c.check(sourceBefore!==sourceAfter||policyBefore!==policyAfter||metadataChanged||generationAfter!==generationBefore+1,
          "Owned patch cancelled without an observed input/owner retirement: "+JSON.stringify(c.setupAttempts));
        pending=result.pendingPaths??pending;
      }
      c.setupPatch={outcome:"patched",count:committed,attempts:c.setupAttempts.length};
      c.check(committed===ownedMarkdown.length,"Owned fixture commits did not cover every exact source");
      for(const name of ["Note A","Note B","Note C","Note D","Note E","Note F","Note G","Note H","Note X","Note Y"])c.releases.push(p.index.acquireSemanticDemand(c.prefix+name+".md"));
      await p.index.refreshSemanticSettings();
      // Await the existing bounded owner task lane, including any retiring-demand retry.
      // This is setup acquisition, before the presentation-only measurement wrappers are installed.
      if(typeof p.index.refreshOnDemandGraph==="function")await p.index.refreshOnDemandGraph(ownedMarkdown,false);
      // setViewState resolves before React's navigation subscription effect is necessarily live.
      // Join the new view's actual registration before emitting a one-shot navigation event.
      const navigationListenersBefore=p.navigationListeners.size;
      c.leaf=app.workspace.getLeaf("tab");await c.leaf.setViewState({type:"k-plex-react-view",active:true});app.workspace.setActiveLeaf(c.leaf,{focus:true});
      await c.until(()=>c.root()&&p.navigationListeners.size>navigationListenersBefore,"New K-Plex root/navigation listener did not mount");await c.frames();
      c.navigationSetup={listenersBefore:navigationListenersBefore,listenersAfter:p.navigationListeners.size,centerBefore:c.root().querySelector(".kplex-role-center")?.dataset.kplexPath};
      p.notifyNavigation(c.prefix+"Note A.md");
      await c.until(()=>c.root()?.querySelector(".kplex-role-center")?.dataset.kplexPath===c.prefix+"Note A.md"&&c.gatedD()&&!p.index.hasActiveSemanticPreparation()&&!p.index.hasPendingSemanticPreparation(),"Original Note A center and gated Note D did not materialize/settle");await c.frames();
      c.navigationSetup.settled=c.snapshot();
      const d=p.index.get(c.prefix+"Note D.md");
      const relations=page=>page?Array.from(page.neighbours).map(([path,r])=>({path,targetPath:r.target?.path,
        parent:r.isParent,parentType:r.parentType,child:r.isChild,childType:r.childType,friend:r.isLeftFriend,friendType:r.leftFriendType,
        challenger:r.isRightFriend,challengerType:r.rightFriendType,next:r.isNextFriend,nextType:r.nextFriendType,
        previous:r.isPreviousFriend,previousType:r.previousFriendType,hidden:r.isHidden,direction:r.direction})):null;
      const selected=typeof p.index.semanticRelationSource==="function"?p.index.semanticRelationSource(d):null;
      c.oracle={right:[c.prefix+"Note F.md"],left:[c.prefix+"Note A.md",c.prefix+"Note C.md"],raw:p.index.gateStats(d),
        neighbors:relations(d),selectedNeighbors:relations(selected?.page),selectedPolicy:selected?.settings,
        sourceRevision:p.getIndexSourceRevision(),semanticRevision:p.index.getSemanticRevision(),status:p.getIndexStatus(),
        acquisition:p.index.getSourceAcquisitionCounters(),active:p.index.hasActiveSemanticPreparation(),pending:p.index.hasPendingSemanticPreparation(),
        mode:p.index.isOnDemandMode()?"on-demand":"eager",methods:["patchMarkdownPaths","refreshSemanticSettings","captureSemanticGateRead"].map(name=>({name,available:typeof p.index[name]==="function"})),
        preparedInfo:p.index.preparedPageInfo?.get(d),onDemandIndexed:p.index.onDemandIndexed?Array.from(p.index.onDemandIndexed.keys()).filter(path=>c.fixtureFiles.includes(path)):null,
        taskPaths:p.index.onDemandTasks?Array.from(p.index.onDemandTasks.keys()).filter(path=>c.fixtureFiles.includes(path)):null,
        bindings:c.fixtureFiles.filter(path=>path.endsWith(".md")).map(path=>{const file=app.vault.getFileByPath(path),cache=app.metadataCache.getFileCache(file);
          return {path,mtime:file.stat.mtime,size:file.stat.size,metadataReady:Boolean(cache),frontmatter:cache?.frontmatter,
            links:(cache?.links??[]).map(link=>({link:link.link,target:app.metadataCache.getFirstLinkpathDest(link.link,path)?.path??null})),
            hostResolved:app.metadataCache.resolvedLinks[path],hostUnresolved:app.metadataCache.unresolvedLinks[path]}})};
      c.check(c.oracle.raw.right.visibleCount===1,"D semantic right denominator must be one before filter: "+JSON.stringify({raw:c.oracle.raw,neighbors:c.oracle.neighbors,selectedNeighbors:c.oracle.selectedNeighbors}));
      for(const name of ["rebuild","rebuildProgressively","prepareSemanticNeighborhood"])c.wrap(p.index,name);
      for(const name of ["readBody","prepareRequestedNeighborhood","prepareRequestedCandidateDegrees","prepareRequestedPair"])c.wrap(p.index.sourceAcquisition,name);
      const beforeFiltering=c.snapshot();
      /** Require presentation-only operations to leave both published revisions and acquisition counters intact. */
      const unchangedSource=receipt=>{
        c.check(receipt.sourceRevision===beforeFiltering.sourceRevision&&receipt.semanticRevision===beforeFiltering.semanticRevision,"Filtering changed a published source/semantic revision");
        c.check(JSON.stringify(receipt.acquisition)===JSON.stringify(beforeFiltering.acquisition),"Filtering changed source acquisition counters");
      };
      const trigger=c.root().querySelector(".kplex-filter-trigger");c.check(trigger,"Filter trigger unavailable");trigger.click();await c.until(()=>document.querySelector(".kplex-filter-portal .kplex-quick-lens-row"),"Quick lens panel missing");
      const panel=document.querySelector(".kplex-filter-portal"),row=panel.querySelector(".kplex-quick-lens-row"),selects=Array.from(row.querySelectorAll("select"));
      c.input(selects[0],"node.label");await c.frames();c.input(row.querySelectorAll("select")[1],"contains");await c.frames();
      const reflow=panel.querySelector('input[aria-label="'+p.translator("filter.reflowAria")+'"]');
      const cross=panel.querySelector('input[aria-label="'+p.translator("filter.showCrossLinks")+'"]');
      c.check(reflow&&cross,"Reflow/cross-link public controls missing");if(reflow.checked)reflow.click();if(!cross.checked)cross.click();await c.frames();
      c.input(row.querySelector("input"),"note");await c.frames();
      for(const mode of ["keep","reflow"])for(const crossLinks of [true,false]){
        if(reflow.checked!==(mode==="reflow"))reflow.click();if(cross.checked!==crossLinks)cross.click();await c.frames();await c.frames();
        const receipt=c.snapshot();c.check(receipt.gates,"D no longer materialized");
        const expected=${JSON.stringify(expectation)}==="baseline"?(crossLinks?"3/1":"1/1"):(crossLinks?"1/1":"0/1");
        c.check(receipt.gates.right===expected,"D right gate unexpected in "+mode+"/cross="+crossLinks+": "+JSON.stringify(receipt));
        if(${JSON.stringify(expectation)}==="fixed")c.check(receipt.gates.left===(crossLinks?"2/2":"1/2"),"D semantic left gate unexpected: "+JSON.stringify(receipt));
        unchangedSource(receipt);
        c.scenarios.push({id:"B-filtered-"+mode+"-cross-"+crossLinks,status:"passed",expectedRight:expected,...receipt});
      }
      c.input(row.querySelector("input"),"");await c.frames();await c.frames();const clear=c.snapshot();
      c.check(clear.gates.right==="1","Clearing Quick lens did not restore unfiltered denominator");c.scenarios.push({id:"B-clear-filter",status:"passed",...clear});
      unchangedSource(clear);
      c.check(Object.values(c.counts).every(n=>n===0),"Filtering started semantic/source acquisition: "+JSON.stringify(c.counts));
      c.scenarios.push({id:"B-presentation-only",status:"passed",wrapped:{...c.counts}});
      panel.querySelector('button[aria-label="'+p.translator("filter.closePanel")+'"]').click();
    })().then(()=>{c.done=true},error=>{c.error=String(error.stack||error);c.done=true});
    return JSON.stringify(true);
  })()`);
  installed = true;
  const result = await poll(`JSON.stringify((()=>{const c=window.${controller};return c?.done?{error:c.error,scenarios:c.scenarios,oracle:c.oracle,setupPatch:c.setupPatch,setupAttempts:c.setupAttempts,navigationSetup:c.navigationSetup,lastSnapshot:c.snapshot(),fixtureChecks:c.fixtureChecks,fixtureFiles:c.fixtureFiles,createdFiles:c.files,folder:c.folder}:false})())`, "Native gate probe did not complete", 600_000);
  Object.assign(report, result); assert(!result.error, result.error); report.status = "passed";
} catch (error) { report.status = "failed"; report.error = String(error.stack || error); }
finally {
  try { installed ||= evaluate(`JSON.stringify(Boolean(window.${controller}))`); } catch (error) { report.controllerProbeError=String(error); }
  if (installed) {
    try {
      evaluate(`(()=>{const c=window.${controller};c.cleanup=(async()=>{
        c.cancelled=true;await c.run;const errors=[];for(const restore of c.wrappers.reverse())try{restore()}catch(e){errors.push(String(e))}
        for(const release of c.releases)try{release()}catch(e){errors.push(String(e))}
        try{c.leaf?.detach()}catch(e){errors.push(String(e))}
        try{c.p.settings=c.originalSettings;await c.p.saveSettings(true,false);if(c.originalSettings.lastActivePath)c.p.notifyNavigation(c.originalSettings.lastActivePath);await Promise.allSettled([...c.writes])}catch(e){errors.push(String(e))}
        try{c.restoreSave()}catch(e){errors.push(String(e))}
        for(const path of c.files.reverse())try{const file=app.vault.getFileByPath(path);if(file)await app.vault.delete(file,true)}catch(e){errors.push(String(e))}
        for(const path of c.folders.reverse())try{const folder=app.vault.getFolderByPath(path);if(folder&&folder.children.length===0)await app.vault.delete(folder,true)}catch(e){errors.push(String(e))}
        try{if(c.originalLeaf)app.workspace.setActiveLeaf(c.originalLeaf,{focus:true})}catch(e){errors.push(String(e))}
        const existingFixtureChecks=[];
        if(${JSON.stringify(useExisting)})for(const item of ${JSON.stringify(fixture)})if(!item.path.includes("/")){
          try{const file=app.vault.getFileByPath(item.path);existingFixtureChecks.push({path:item.path,exactBodyMatch:Boolean(file&&await app.vault.read(file)===item.body)})}catch(e){errors.push(String(e))}
        }
        c.cleanupResult={errors,existingFixtureChecks,existingFixtureFilesIntact:${JSON.stringify(useExisting)}?c.fixtureFiles.every(path=>Boolean(app.vault.getFileByPath(path))):null,filesRemaining:c.files.filter(path=>app.vault.getFileByPath(path)),folderRemaining:Boolean(app.vault.getFolderByPath(c.folder)),leafDetached:!c.leaf?.containerEl?.isConnected};
      })();return JSON.stringify(true)})()`);
      report.cleanup = await poll(`JSON.stringify(window.${controller}?.cleanupResult||false)`, "Gate cleanup did not complete");
      assert.deepEqual(report.cleanup.errors, []); if(useExisting)assert(report.cleanup.existingFixtureChecks.every(item=>item.exactBodyMatch)); assert.deepEqual(report.cleanup.filesRemaining, []); assert.equal(report.cleanup.folderRemaining, false);
      evaluate(`(()=>{delete window.${controller};return JSON.stringify(true)})()`);
      writeFileSync(join(target.pluginDir, "data.json"), originalData);
      report.cleanup.settingsBytesRestored = readFileSync(join(target.pluginDir, "data.json")).equals(originalData);
      hashes();
    } catch (error) { report.cleanupError = String(error.stack || error); report.status = "failed"; }
  }
  report.endedAt = new Date().toISOString(); writeFileSync(join(reportDir, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify(report)); process.exitCode = report.status === "passed" ? 0 : 1;
