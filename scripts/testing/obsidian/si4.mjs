/**
 * Exact-build native SI4 settings acceptance in an explicitly configured disposable vault.
 * Waits for real startup/source readiness, creates only owned root-level fixtures, exercises saved
 * policies and live consumers, and restores settings, methods, demand, fixtures and throttling.
 * This functional lane does not claim foreground latency, restart or physical-device acceptance.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateTarget } from "./runner.mjs";

const projectRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const reportDir = process.env.KPLEX_HOST_REPORT_DIR || "/private/tmp/kplex-si4-acceptance";
mkdirSync(reportDir, { recursive: true });

/** Execute only in the named vault; Obsidian eval errors can otherwise have a zero exit status. */
function cli(command, ...args) {
  const result = spawnSync(process.env.KPLEX_OBSIDIAN_CLI || "obsidian", [`vault=${vaultName}`, command, ...args],
    { cwd: projectRoot, encoding: "utf8", timeout: 30_000, killSignal: "SIGKILL", maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout || "")) {
    throw new Error(result.error?.message || result.stderr || result.stdout || `CLI status ${result.status}`);
  }
  return result.stdout.trim();
}
/** Decode the single JSON value rather than treating CLI success as an assertion pass. */
function evaluate(code) {
  const value = cli("eval", `code=${code}`);
  const start = value.indexOf("{");
  if (start < 0) throw new Error(`Missing native JSON result: ${value.slice(0, 300)}`);
  return JSON.parse(value.slice(start));
}
/** Bind host acceptance to the exact installed artifacts. */
function hash(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
const artifacts = {};
for (const name of ["main.js", "manifest.json", "styles.css"]) {
  const built = hash(join(projectRoot, "dist", name)), installed = hash(join(target.pluginDir, name));
  if (built !== installed) throw new Error(`Installed ${name} differs from the current build`);
  artifacts[name] = built;
}
if (cli("vault", "info=path") !== target.vault) throw new Error("Wrong native vault");

/** All assertions run against the loaded plugin, real Vault/MetadataCache, IDB and rendered view. */
async function nativeAcceptance() {
  const p = app.plugins.plugins["k-plex"], i = p?.index, s = i?.sourceAcquisition;
  const controller = window.kplexSi4Native;
  const ok = (value, message) => { if (!value) throw new Error(message); };
  const delay = ms => new Promise(done => window.setTimeout(done, ms));
  const wait = async (predicate, label, timeout = 180_000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) { if (predicate()) return; await delay(100); }
    throw new Error(`${label}: ${JSON.stringify({status:p.getIndexStatus(),ready:s.hasSemanticDependencies(),pending:i.getSemanticPreparationDiagnostics()})}`);
  };
  const settle = async label => {
    controller.phase = label;
    await wait(() => s.hasSemanticDependencies() && !s.inventory && s.knownImpactTasks === 0
      && !s.pendingKnownFiles.size && !s.pendingResolutionKeys.size, `${label} source readiness`);
    ok(await s.repository.flush(), `${label} durability`);
    await wait(() => !i.building && !i.rebuildQueued && !p.rebuildTask, `${label} graph readiness`);
    await delay(500);
  };
  ok(p && i && s, "K-Plex is not loaded");
  const prefix = "__kplex_si4_acceptance__";
  const A = `${prefix}A.md`, B = `${prefix}B.md`, C = `${prefix}C.md`, D = `${prefix}D.md`, E = `${prefix}E.md`, image = `${prefix}Image.png`;
  const paths = [A, B, C, D, E, image], created = [], restores = [], steps = [];
  for (const path of paths) ok(!app.vault.getFileByPath(path), `Existing fixture ${path}`);
  const originalSettings = structuredClone(p.settings), wc = require("@electron/remote").getCurrentWindow().webContents;
  const throttle = wc.getBackgroundThrottling(); wc.setBackgroundThrottling(false);
  restores.push(() => wc.setBackgroundThrottling(throttle));
  let release, fixtureLeaf, primaryError, answer;
  const work = { reads:0, parses:0, acquisitions:0, markdownEnumerations:0, fileEnumerations:0, headPages:0, captures:0, familyVisits:0 };
  const owners = new Set(), preparedWork = []; let stepOwners = new Set();
  const wrap = (object, name, observe) => {
    const original = object[name]; ok(typeof original === "function", `Missing ${name}`);
    object[name] = function(...args) { observe(args); return original.apply(this, args); };
    restores.push(() => object[name] = original);
  };
  const relation = path => {
    const value = i.get(A)?.neighbours.get(path);
    return value ? { parent:value.isParent, child:value.isChild, left:value.isLeftFriend, right:value.isRightFriend, inferred:value.isInferred } : null;
  };
  const centerElement = () => [...document.querySelectorAll("[data-kplex-path]")].find(el => el.getAttribute("data-kplex-path") === A && el.classList.contains("kplex-role-center"));
  const observe = label => {
    const neighborhood = i.getNeighborhood(A), center = i.get(A), gates = i.gateStats(center);
    ok(neighborhood?.center.path === A, `${label} current neighborhood`);
    ok(i.isSemanticWriteReady(A, B), `${label} current write readiness`);
    ok(i.search("SI4 acceptance alias", 50).some(page => page.path === A), `${label} alias search`);
    ok(i.titleFor(center) === "SI4 acceptance alias", `${label} selected alias title`);
    const explanation = i.explainRelationship(A, B), evidence = i.evidenceBetween(A, B);
    ok(explanation && evidence.some(row => row.declaredByPath === A), `${label} current provenance`);
    for (const [role, side] of [["leftFriends","left"],["rightFriends","right"],["parents","top"],["children","bottom"]]) {
      const paths = [...new Set(neighborhood[role].map(item => item.page.path))];
      ok(gates[side].visibleCount === paths.length, `${label} gate/list parity ${side}`);
    }
    const node = centerElement(); ok(node, `${label} rendered center`);
    ok(node.getAttribute("aria-label")?.includes("SI4 acceptance alias"), `${label} accessible alias`);
    if(node.classList.contains("is-node-image-only"))ok(node.querySelector(".kplex-node-visual.is-replace img"),`${label} rendered replacement image`);
    else ok(node.querySelector(".kplex-thought-label")?.textContent.includes("SI4 acceptance alias"), `${label} rendered alias`);
    for (const side of ["top","bottom","left","right"]) {
      const gate = node.querySelector(`[data-kplex-gate="${side}"]`);
      ok(gate && gate.classList.contains("has-connections") === gates[side].hasAny, `${label} rendered gate fill ${side}`);
      const count = gate.parentElement.querySelector(".kplex-gate-count")?.textContent;
      ok(gates[side].visibleCount === 0 ? !count : count === String(gates[side].visibleCount), `${label} rendered gate count ${side}`);
    }
    return {label, B:relation(B),C:relation(C),D:relation(D),image:relation(image),gates,
      siblings:neighborhood.siblings.filter(item => paths.includes(item.page.path)).map(item => item.page.path),
      title:i.titleFor(center),evidenceCount:evidence.length,writeReady:true};
  };
  const step = async (label, mutate, check) => {
    controller.phase = label; stepOwners = new Set(); const start = performance.now(), captures = work.captures;
    mutate(); await p.saveSettings(); await i.refreshSemanticSettings();
    ok(!i.hasPendingSemanticPreparation(), `${label} incomplete publication ${JSON.stringify({diag:i.getSemanticPreparationDiagnostics(),ready:s.hasSemanticDependencies(),inventory:!!s.inventory,preparations:preparedWork.slice(-8),demands:[...i.semanticDemandCounts]})}`);
    await wait(() => !!centerElement(), `${label} render`); await delay(350);
    check(); const observation = observe(label);
    observation.elapsedMs = performance.now() - start; observation.ownerCaptures = work.captures - captures;
    observation.distinctOwners = stepOwners.size;
    if(controller.requiredMarkdownFiles>0)ok(stepOwners.size < controller.markdownFiles, `${label} replayed every owner`);
    steps.push(observation);
  };
  try {
    controller.phase = "startup prerequisite";
    await wait(() => p.getIndexStatus().upToDate && s.hasSemanticDependencies() && !s.inventory
      && !i.building && !p.rebuildTask, "Large-vault valid-facts prerequisite", 5_400_000);
    controller.prerequisite = {status:p.getIndexStatus(),source:i.getSourceAcquisitionCounters(),at:new Date().toISOString()};
    const inventory = app.vault.getMarkdownFiles();
    controller.markdownFiles = inventory.length;
    const warmOwner = inventory[0]; ok(warmOwner,"No existing warm source owner");
    if (controller.markdownFiles < Number(controller.requiredMarkdownFiles)) throw new Error("Large fixture is too small");
    for (const [path, text] of [[B,""],[C,`---\nChildren: "[[${E}]]"\n---\n`],[D,""],[E,""]]) {
      await app.vault.create(path, text); created.push(path); await settle(`create ${path}`);
    }
    const bytes = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ7kAAAAASUVORK5CYII="), c => c.charCodeAt(0));
    await app.vault.createBinary(image, bytes.buffer); created.push(image); await settle("create image");
    await app.vault.create(A,`---\naliases: [SI4 acceptance alias]\nR3Dormant: "[[${C}]]"\nR3Image: "[[${image}]]"\n---\nR3Friends:: [[${B}]] [[${warmOwner.path}]]\n## Relationships\nBody [[${D}]]\n`);
    created.push(A); await settle("create center");
    fixtureLeaf = app.workspace.getLeaf(true); await fixtureLeaf.openFile(app.vault.getFileByPath(A), {active:true});
    for (const leaf of app.workspace.getLeavesOfType("k-plex-react-view")) leaf.detach();
    Object.assign(p.settings, {lastActivePath:A,renderAlias:true,nameFields:"aliases",showNeighborCount:true,renderSiblings:true,
      showFolderNodes:false,showAttachments:true,showPageNodes:true,showURLNodes:true,showVirtualNodes:true,showTagNodes:true,showInferredNodes:true,
      inferAllLinksAsFriends:false,inverseInfer:false,nodeImageProperty:"",thumbnailProperty:"",nodeSortOrder:"name-asc"});
    p.settings.hierarchy.leftFriends = [...originalSettings.hierarchy.leftFriends,"R3Friends"];
    p.settings.hierarchy.children = [...originalSettings.hierarchy.children,"Children"];
    await p.activateView(); release = i.acquireSemanticDemand(A); await p.saveSettings(); await i.refreshSemanticSettings(); await delay(500);
    await wait(()=>p.getIndexStatus().upToDate&&!p.indexDirty&&p.rebuildTimer===null&&!p.rebuildTask,"Fixture graph backlog completion");
    await settle("fixture baseline");
    ok(!i.hasPendingSemanticPreparation() && relation(B)?.left, "Initial Friend publication"); observe("baseline");
    controller.prerequisiteMarkdownFiles=controller.markdownFiles;
    controller.markdownFiles=app.vault.getMarkdownFiles().length;
    const warmHeadBefore=(await s.repository.inspect(warmOwner.path,[])).head;
    const baseline = i.getSemanticPreparationDiagnostics(), sourceBefore = i.getSourceAcquisitionCounters(), completion = p.getIndexStatus();
    wrap(app.vault,"read",()=>work.reads++); wrap(app.vault,"cachedRead",()=>work.reads++);
    wrap(s,"parse",()=>work.parses++); wrap(s,"acquire",()=>work.acquisitions++);
    wrap(app.vault,"getMarkdownFiles",()=>work.markdownEnumerations++); wrap(app.vault,"getFiles",()=>work.fileEnumerations++);
    wrap(s.repository,"headPage",()=>work.headPages++); wrap(s.repository,"visit",()=>work.familyVisits++);
    wrap(s,"captureForReplay",args=>{work.captures++;owners.add(args[0]);stepOwners.add(args[0]);});
    for (const name of ["prepareRequestedNeighborhood","prepareRequestedCandidateDegrees"]) {
      const original = s[name]; s[name] = async function(...args) {
        const result = await original.apply(this,args);
        preparedWork.push({name,outcome:result.outcome,reason:result.reason,work:result.work}); return result;
      }; restores.push(()=>s[name]=original);
    }
    await step("Friend to Challenger",()=>{p.settings.hierarchy.leftFriends=p.settings.hierarchy.leftFriends.filter(x=>x!=="R3Friends");p.settings.hierarchy.rightFriends.push("R3Friends");},()=>ok(relation(B)?.right&&!relation(B)?.left,"Challenger missing"));
    await step("Challenger to Friend",()=>{p.settings.hierarchy.rightFriends=p.settings.hierarchy.rightFriends.filter(x=>x!=="R3Friends");p.settings.hierarchy.leftFriends.push("R3Friends");},()=>ok(relation(B)?.left&&!relation(B)?.right,"Friend missing"));
    await step("Dormant add",()=>p.settings.hierarchy.parents.push("R3Dormant"),()=>{
      ok(relation(C)?.parent,"Dormant parent missing");ok(i.getNeighborhood(A).siblings.some(n=>n.page.path===E),"Sibling witness missing");
    });
    await step("Dormant remove",()=>p.settings.hierarchy.parents=p.settings.hierarchy.parents.filter(x=>x!=="R3Dormant"),()=>{
      ok(!relation(C)?.parent,"Dormant parent survived");ok(!i.getNeighborhood(A).siblings.some(n=>n.page.path===E),"Retired sibling survived");
    });
    await step("Infer links as friends",()=>p.settings.inferAllLinksAsFriends=true,()=>ok(relation(D)?.left,"Friend inference missing"));
    await step("Forward inference",()=>{p.settings.inferAllLinksAsFriends=false;p.settings.inverseInfer=false;},()=>ok(relation(D)?.child,"Forward inference missing"));
    await step("Inverse inference",()=>p.settings.inverseInfer=true,()=>ok(relation(D)?.parent,"Inverse inference missing"));
    await step("Image semantic add",()=>p.settings.hierarchy.leftFriends.push("R3Image"),()=>ok(relation(image)?.left,"Image relation missing"));
    await step("Thumbnail selector",()=>p.settings.thumbnailProperty="R3Image",()=>ok(relation(image)?.left,"Explicit image precedence lost"));
    await step("Image assignment remove",()=>p.settings.hierarchy.leftFriends=p.settings.hierarchy.leftFriends.filter(x=>x!=="R3Image"),()=>ok(!relation(image),"Thumbnail inference survived"));
    await step("Thumbnail remove",()=>p.settings.thumbnailProperty="",()=>ok(relation(image)?.parent,"Image inference missing"));
    await step("Node image selector",()=>p.settings.nodeImageProperty="R3Image",()=>ok(!relation(image),"Node-image inference survived"));
    const prepare=s.prepareRequestedNeighborhood;let unblock,entered;
    const enteredPromise=new Promise(done=>entered=done);
    s.prepareRequestedNeighborhood=async function(...args){if(args[0].center.id===B){entered();await new Promise(done=>unblock=done);}return prepare.apply(this,args);};
    restores.push(()=>{unblock?.();s.prepareRequestedNeighborhood=prepare;});
    const oldDemand=i.acquireSemanticDemand(B); await enteredPromise;
    const retired=i.semanticPreparationTasks.get(B).task; oldDemand();
    const latestDemand=i.acquireSemanticDemand(C); await i.refreshSemanticSettings();
    ok(i.semanticScopes.get(C)?.policyRevision===i.semanticPolicyRevision,"Latest navigation missing");
    unblock();await retired;ok(!i.semanticScopes.has(B),"Retired navigation resurrected");latestDemand();s.prepareRequestedNeighborhood=prepare;
    steps.push({label:"Latest navigation wins",retiredScopeAbsent:true});
    p.settings.inverseInfer=false;const old=p.saveSettings();
    ok(!i.isSemanticWriteReady(A,B),"Superseded policy admitted a write");
    ok(i.applyRelationshipEdit(A,B,"right","R3Friends")===false,"Stale relationship edit mutated graph");
    p.settings.inverseInfer=true;const middle=p.saveSettings();p.settings.inverseInfer=false;const latest=p.saveSettings();
    await Promise.all([old,middle,latest]);await i.refreshSemanticSettings();await delay(350);
    ok(!i.hasPendingSemanticPreparation()&&relation(D)?.child,"Latest policy lost");
    steps.push({...observe("Latest policy wins"),staleWriteRejected:true});
    const published=i.getSemanticPreparationDiagnostics(),sourceAfter=i.getSourceAcquisitionCounters(),afterCompletion=p.getIndexStatus();
    ok(published.fullBuilds===baseline.fullBuilds,`Settings caused full build ${JSON.stringify({baseline:baseline.fullBuilds,final:published.fullBuilds,diagnostics:i.getIndexDiagnostics().slice(-15)})}`);
    for(const name of ["reads","parses","acquisitions","markdownEnumerations","fileEnumerations","headPages"])ok(work[name]===0,`Settings caused ${name}: ${work[name]}`);
    ok(JSON.stringify(sourceBefore)===JSON.stringify(sourceAfter),"Source completion/counters changed");
    ok(afterCompletion.indexedFiles===completion.indexedFiles&&afterCompletion.totalFiles===completion.totalFiles,"Settings reset source completion");
    if(controller.requiredMarkdownFiles>0)ok(owners.size<controller.markdownFiles,"Settings replayed all owners");
    ok(owners.has(warmOwner.path),"Native settings did not exercise an adopted warm source owner");
    ok(JSON.stringify((await s.repository.inspect(warmOwner.path,[])).head)===JSON.stringify(warmHeadBefore),"Settings rewrote an adopted warm head");
    answer={status:"passed",markdownFiles:controller.markdownFiles,prerequisiteMarkdownFiles:controller.prerequisiteMarkdownFiles,warmOwnerReplayed:true,warmHeadUnchanged:true,steps,work,distinctOwners:owners.size,preparedWork,
      fullBuildDelta:published.fullBuilds-baseline.fullBuilds,publicationDelta:published.published-baseline.published,
      sourceBefore,sourceAfter,completion,afterCompletion,hidden:document.hidden};
  }catch(error){primaryError=error;controller.failure={status:p.getIndexStatus(),sourceReady:s.hasSemanticDependencies(),inventory:!!s.inventory,diag:i.getSemanticPreparationDiagnostics(),preparedWork:preparedWork.slice(-8)};}finally{
    for(const restore of restores.reverse())restore();release?.();
    Object.assign(p.settings,originalSettings);await p.saveSettings();
    if(fixtureLeaf?.view?.file?.path===A)fixtureLeaf.detach();
    // The created graph view owns a separate React navigation state; restoring plugin settings
    // alone cannot release its fixture demand. Close that owned view before deleting its center.
    for(const leaf of app.workspace.getLeavesOfType("k-plex-react-view")) {
      if(leaf.view.containerEl.querySelector(`[data-kplex-path="${A}"]`))leaf.detach();
    }
    for(const path of created.reverse()){const file=app.vault.getFileByPath(path);if(file)await app.vault.delete(file,true);}
    try{await settle("cleanup");if(answer)answer.cleanup={settingsRestored:JSON.stringify(p.settings)===JSON.stringify(originalSettings),fixturesAbsent:paths.every(path=>!app.vault.getFileByPath(path)),throttlingRestored:wc.getBackgroundThrottling()===throttle};}
    catch(error){if(!primaryError)primaryError=error;else controller.cleanupError=String(error);}
  }
  if(primaryError)throw primaryError;return answer;
}

const initial = evaluate(`(()=>{if(window.kplexSi4Native)throw Error("Controller already exists");window.kplexSi4Native={done:false,phase:"initial",requiredMarkdownFiles:${Number(process.env.KPLEX_SI4_REQUIRED_FILES || 20015)}};(${nativeAcceptance.toString()})().then(result=>{window.kplexSi4Native.result=result;window.kplexSi4Native.done=true;},error=>{window.kplexSi4Native.error=error.stack||String(error);window.kplexSi4Native.done=true;});return {started:true};})()`);
const report={schemaVersion:1,startedAt:new Date().toISOString(),vaultName,artifacts,initial};
let result;
try{
  const deadline=Date.now()+7_200_000;
  while(Date.now()<deadline){
    await new Promise(done=>setTimeout(done,5000));
    result=evaluate(`(()=>{const c=window.kplexSi4Native,p=app.plugins.plugins["k-plex"];return c.done?c:{done:false,phase:c.phase,prerequisite:c.prerequisite,status:p.getIndexStatus(),ready:p.index.sourceAcquisition.hasSemanticDependencies()};})()`);
    console.log(JSON.stringify({at:new Date().toISOString(),poll:result.done?{done:true,error:result.error,status:result.result?.status}:result}));
    if(result.done)break;
  }
  if(!result?.done)throw new Error("Native SI4 controller exceeded its deadline; cleanup still requires attention");
  report.native=result;report.status=result.error?"failed":"passed";
  if(result.error)process.exitCode=1;
}finally{
  report.completedAt=new Date().toISOString();
  writeFileSync(join(reportDir,"si4-native.json"),JSON.stringify(report,null,2)+"\n");
  if(result?.done)evaluate("(()=>{delete window.kplexSi4Native;return {controllerRemoved:true};})()");
}
console.log(`Native SI4 ${report.status}; report: ${join(reportDir,"si4-native.json")}`);
