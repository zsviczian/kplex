/** Optional serialized action-manager responsive acceptance. Desktop mobile emulation is not physical touch or mobile WebView acceptance. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { buildSync } from "esbuild";
import { validateTarget } from "./runner.mjs";

const projectRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const catalogBundle = buildSync({ stdin: { contents: 'export { ACTION_CATALOG } from "./src/core/plex/actions";', resolveDir: projectRoot }, bundle: true, platform: "node", format: "cjs", write: false });
const catalogModule = { exports: {} }; Function("module", catalogBundle.outputFiles[0].text)(catalogModule);
const catalogActionIds = catalogModule.exports.ACTION_CATALOG.map(action => action.id);
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName, "kplex-test-small", "This optional probe is restricted to the explicitly selected disposable small vault");
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const reportDir = process.env.KPLEX_HOST_REPORT_DIR;
assert(reportDir, "Set KPLEX_HOST_REPORT_DIR explicitly");
mkdirSync(reportDir, { recursive: true });
const configuration = [join(target.pluginDir, "data.json"), join(target.config, "community-plugins.json"), join(target.config, "hotkeys.json")]
  .map(path => ({ path, bytes: existsSync(path) ? readFileSync(path) : null }));
assert(configuration[0].bytes && configuration[1].bytes, "Initialized plugin settings and enablement are required");
const token = `action-device-${process.pid}-${Date.now()}`;
const report = { status: "running", startedAt: new Date().toISOString(), target: vaultName, artifacts: {}, scenarios: [],
  limitations: ["Desktop mobile emulation proves responsive DOM geometry and native session routing; no physical touch, mobile WebView, keyboard attachment or screen-reader acceptance", "Read-only search/filter/recorder cancellation and publication affordances; no preference edits, leaves, fixtures or network resources"] };
let baseline, originalSettings, mutatedHost = false;

/** Keep explicit native CLI arguments outside a shell and reject zero-exit eval errors. */
function cli(command, ...args) {
  const result = spawnSync(process.env.KPLEX_OBSIDIAN_CLI || "obsidian", [`vault=${vaultName}`, command, ...args], { cwd: projectRoot, encoding: "utf8", timeout: 30000, killSignal: "SIGKILL", maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout)) throw new Error(result.error?.message || result.stderr || result.stdout);
  return result.stdout.trim();
}

/** Validate every native expression before delivery and parse only its explicit JSON result. */
function evaluate(code) {
  new Script(code);
  const value = JSON.parse(cli("eval", `code=${code}`).replace(/^=>\s*/, ""));
  if (value?.error) throw new Error(value.error);
  return value;
}
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

/** Reacquire the plugin after Obsidian intentionally reloads during a mode transition. */
async function ready() {
  const deadline = Date.now() + 180000;
  while (true) {
    try { if (evaluate('JSON.stringify(Boolean(app.plugins.plugins["k-plex"]?.actionManager))')) return; } catch {}
    assert(Date.now() < deadline, "Mobile-mode reload did not become ready"); await delay(500);
  }
}

/** Own the exact native Settings page/window opened through the action dispatcher, including its geometry. */
function startNativeProbe(token, width, height, catalogActionIds) {
  if (window.__kplexActionTest || window.__kplexActionWorkflows || window.__kplexUxRegression || window.__kplexUxDevice || window.__kplexActionDevice) throw Error("Another native driver is active");
  if (app.setting.win || document.querySelector(".modal-container .modal, .modal-container .prompt")) throw Error("Unowned native Settings/dialog is already open");
  const p = app.plugins.plugins["k-plex"], remote = require("@electron/remote"), mainOwner = remote.getCurrentWindow();
  if (remote.powerMonitor.getSystemIdleState(10) === "locked" || document.hidden || !document.hasFocus() || !mainOwner.isFocused()) throw Error("Unlocked native foreground required");
  const c = window.__kplexActionDevice = { token, p, ownedSettings: false, done: false };
  c.task = (async () => {
    const check = (condition, message) => { if (!condition) throw Error(message); };
    const snapshots = { guards: p.actionManager.guards.size, sessions: p.actionManager.sessions.size, hosts: p.actionSurfaceHosts.size,
      dialogs: p.actionDialogs.size, leaves: [...app.workspace.getLeavesOfType("k-plex-react-view"), ...app.workspace.getLeavesOfType("k-plex-sidepanel-view")].length,
      settings: JSON.stringify(p.settings), fileCount: app.vault.getFiles().length };
    c.ownedSettings = true;
    const outcome = await p.actionManager.dispatch({ id: "actions.configure", source: "internal" });
    check(outcome.status === "completed", "Action dispatcher did not navigate to native inline Settings");
    const content = app.setting.getCurrentPageEl(), doc = content.ownerDocument, viewWindow = doc.defaultView;
    check(viewWindow === app.setting.win && typeof viewWindow.require === "function", "Inline Settings native document owner missing");
    const owner = viewWindow.require("@electron/remote").getCurrentWindow(); c.owner = owner; c.ownerId = owner.id; c.settingsUsesMainWindow = doc === document;
    c.restoreMainFocus = async deadline => {
      remote.app.show(); remote.app.focus({steal:true}); mainOwner.show(); mainOwner.moveTop(); mainOwner.focus(); mainOwner.webContents.focus();
      let trusted = false, clicked = false;
      const receipt = event => { if (event.target?.matches?.(".kplex-app input.kplex-search") && event.isTrusted) trusted = true; };
      document.addEventListener("mousedown",receipt,true);
      try {
        while (true) {
          const settingsOwner = c.settingsUsesMainWindow ? null : remote.BrowserWindow.fromId(c.ownerId);
          const search = [...document.querySelectorAll(".kplex-app input.kplex-search")].find(input=>{const r=input.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight});
          if (!clicked && (!settingsOwner || settingsOwner.isDestroyed()) && search && mainOwner.isFocused() && document.hasFocus() && remote.powerMonitor.getSystemIdleState(10)!=="locked") {
            const r=search.getBoundingClientRect(),x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);
            if (document.elementFromPoint(x,y)===search) { mainOwner.webContents.sendInputEvent({type:"mouseMove",x,y});mainOwner.webContents.sendInputEvent({type:"mouseDown",x,y,button:"left",clickCount:1});mainOwner.webContents.sendInputEvent({type:"mouseUp",x,y,button:"left",clickCount:1});clicked=true; }
          }
          if (trusted && activeWindow===window && activeDocument===document) { c.mainFocusRestored={trustedPointer:true,mainOwnerId:mainOwner.id,settingsOwnerId:c.ownerId,settingsSharedMain:c.settingsUsesMainWindow};return; }
          check(Date.now()<deadline,"Owned Settings cleanup did not restore trusted main-window routing");await new Promise(resolve=>window.setTimeout(resolve,25));
        }
      } finally { document.removeEventListener("mousedown",receipt,true); }
    };
    c.ownerGeometry = { bounds: owner.getBounds(), minimum: owner.getMinimumSize() };
    owner.setMinimumSize(200,200); owner.setContentSize(width,height); remote.app.show(); remote.app.focus({steal:true}); owner.show(); owner.moveTop(); owner.focus(); owner.webContents.focus();
    const group = content.querySelector(".kplex-action-settings"); c.group = group;
    check(group, "Native Actions settings group did not render");
    const search = group.querySelector('[data-kplex-action-search]');
    const visibleDeadline = Date.now() + 3000;
    let previousLayout = null, settledSamples = 0;
    while (true) {
      const bounds = content.getBoundingClientRect(), searchBounds = search?.getBoundingClientRect();
      const parentBounds = content.parentElement?.getBoundingClientRect(), groupParentBounds = group.parentElement?.getBoundingClientRect();
      const ownerBounds = owner.getContentBounds(), root = doc.documentElement;
      // Native page navigation initially exposes a sliding, zero-width parent. macOS may also clip
      // the requested height to the screen; compare the actual owner viewport rather than nominal height.
      const viewportReady = ownerBounds.width === width && Math.abs(ownerBounds.width-viewWindow.innerWidth)<=2 && Math.abs(ownerBounds.height-viewWindow.innerHeight)<=2
        && Math.abs(root.clientWidth-viewWindow.innerWidth)<=2 && Math.abs(root.clientHeight-viewWindow.innerHeight)<=2;
      const layoutReady = viewportReady && parentBounds?.width>0 && groupParentBounds?.width>0 && content.clientWidth>128 && bounds.width>128
        && bounds.height>0 && searchBounds?.width>0 && searchBounds.height>0 && searchBounds.top<viewWindow.innerHeight && searchBounds.bottom>0;
      const layout = [bounds.left,bounds.top,bounds.width,bounds.height,parentBounds?.width,groupParentBounds?.width,searchBounds?.left,searchBounds?.top,searchBounds?.width,searchBounds?.height,viewWindow.innerWidth,viewWindow.innerHeight];
      const sameLayout = previousLayout && layout.every((value,index)=>typeof value==="number" && typeof previousLayout[index]==="number" && Math.abs(value-previousLayout[index])<0.01);
      settledSamples = layoutReady && sameLayout ? settledSamples+1 : 0; previousLayout=layout;
      if (remote.powerMonitor.getSystemIdleState(10)!=="locked" && owner.isFocused() && doc.hasFocus() && !doc.hidden && layoutReady && settledSamples>=2) break;
      check(Date.now() < visibleDeadline, "Native inline manager controls did not become visible in the exact Settings window"); await new Promise(resolve => window.setTimeout(resolve,25));
    }
    check(doc.querySelectorAll(".kplex-action-settings").length === 1, "Inline native manager was duplicated");
    const samePage = app.setting.getCurrentPageEl(); check(p.openActionSettings() === true && app.setting.getCurrentPageEl() === samePage, "Direct recovery changed the active native Actions page");
    const duplicate = await p.actionManager.dispatch({ id:"actions.configure", source:"internal" });
    check(duplicate.status === "completed" && app.setting.getCurrentPageEl() === samePage && doc.querySelectorAll(".kplex-action-settings").length === 1, "Repeated configure duplicated native settings content");
    const rows = () => [...group.querySelectorAll(".kplex-action-setting")];
    const visibleRows = () => rows().filter(row=>!row.classList.contains("kplex-action-filtered"));
    check(rows().length === catalogActionIds.length && catalogActionIds.every(id=>rows().some(row=>row.dataset.actionId===id)), "Native global-search catalog definitions were lost");
    const initialRows = rows().length;
    const shape = () => {
      const bounds=content.getBoundingClientRect();
      const controls=[...group.querySelectorAll("input,button,[role=checkbox],[role=switch]")].filter(element=>{
        const r=element.getBoundingClientRect(),css=viewWindow.getComputedStyle(element);return r.width>0&&r.height>0&&css.visibility!=="hidden"&&css.display!=="none"&&r.bottom>bounds.top&&r.top<bounds.bottom&&r.bottom>0&&r.top<viewWindow.innerHeight;
      }).map(element=>{
        const r=element.getBoundingClientRect(), name=element.getAttribute("aria-label")||element.labels?.[0]?.textContent?.trim()||element.textContent?.trim()||element.closest(".setting-item")?.querySelector(".setting-item-name")?.textContent?.trim();
        return {tag:element.tagName.toLowerCase(),role:element.getAttribute("role"),name,inside:r.left>=bounds.left-1&&r.right<=bounds.right+1&&r.left>=-1&&r.right<=viewWindow.innerWidth+1,width:r.width,noDuplicateTitle:!(element.hasAttribute("aria-label")&&element.hasAttribute("title"))};
      });
      return {width:bounds.width,viewport:[viewWindow.innerWidth,viewWindow.innerHeight],horizontalFit:bounds.left>=-1&&bounds.right<=viewWindow.innerWidth+1&&content.scrollWidth<=content.clientWidth+2,controls};
    };
    const top=shape(); content.scrollTop=content.scrollHeight; const bottom=shape(); content.scrollTop=0; c.geometry={top,bottom};
    for(const geometry of [top,bottom]) {check(geometry.horizontalFit,"Native inline Actions page exceeded its horizontal bounds");check(geometry.controls.length>0&&geometry.controls.every(control=>control.inside&&control.name&&control.noDuplicateTitle),"A visible native manager control clipped horizontally or lost its label");}
    check(search?.getAttribute("aria-label")&&group.querySelectorAll("button[data-kplex-action-filter]").length===5,"Native search/filter affordances missing");
    const setInput=value=>{Object.getOwnPropertyDescriptor(viewWindow.HTMLInputElement.prototype,"value").set.call(search,value);search.dispatchEvent(new viewWindow.Event("input",{bubbles:true}));};
    setInput(p.translator("actions.pin.toggle"));check(visibleRows().some(row=>row.dataset.actionId==="pin.toggle")&&visibleRows().length<initialRows,"Native local search did not narrow catalog");
    const searchedRows=visibleRows().map(row=>row.dataset.actionId);setInput("");const filters=[];
    for(const value of ["all","assigned","custom","unassigned","conflicts"]){const pill=group.querySelector('button[data-kplex-action-filter="'+value+'"]');pill.click();check(pill.getAttribute("aria-pressed")==="true","Native filter pill did not retain its chosen state");filters.push({value,visibleRows:visibleRows().length});}
    group.querySelector('button[data-kplex-action-filter="all"]').click();
    check(group.querySelector('[data-action-id="relationship.create-center.child"] button[aria-label="'+p.translator(p.isActionPublished("relationship.create-center.child")?"actions.unpublishCommand":"actions.publishCommand")+'"]'),"Native command publication affordance missing");
    check(JSON.stringify(p.settings)===snapshots.settings,"Filtering changed live preferences");
    // A transient recorder remains separate from the native Settings page; cancellation is read-only.
    const add=group.querySelector('[data-action-id="pin.toggle"] button[aria-label="'+p.translator("actions.addBinding")+'"]');add.scrollIntoView({block:"center"});add.click();
    const recorder=()=>doc.querySelector('[role="group"][aria-label="'+p.translator("hotkeys.pressKeys")+'"]');
    const recorderDeadline=Date.now()+3000;while(recorder()!==doc.activeElement){check(Date.now()<recorderDeadline,"Owned native recorder did not focus within Settings document");await new Promise(resolve=>window.setTimeout(resolve,25));}
    let trustedEscape=false;const observed=event=>{if(event.key==="Escape")trustedEscape=event.isTrusted;};viewWindow.addEventListener("keydown",observed,true);
    try{owner.webContents.sendInputEvent({type:"keyDown",keyCode:"Escape"});owner.webContents.sendInputEvent({type:"keyUp",keyCode:"Escape"});const deadline=Date.now()+3000;while(recorder()){check(Date.now()<deadline,"Owned recorder did not close");await new Promise(resolve=>window.setTimeout(resolve,25));}check(trustedEscape,"Recorder Escape was not trusted native input");}finally{viewWindow.removeEventListener("keydown",observed,true);}
    check(JSON.stringify(p.settings)===snapshots.settings,"Recorder cancellation changed preferences");
    owner.setMinimumSize(...c.ownerGeometry.minimum);owner.setBounds(c.ownerGeometry.bounds);c.ownerGeometry=null;
    app.setting.close();c.ownedSettings=false;
    const closeDeadline=Date.now()+3000;while(group.isConnected&&group.getClientRects().length){check(Date.now()<closeDeadline,"Native Actions page survived Settings close");await new Promise(resolve=>window.setTimeout(resolve,25));}
    await c.restoreMainFocus(closeDeadline);
    check(p.actionManager.guards.size===snapshots.guards&&p.actionManager.sessions.size===snapshots.sessions&&p.actionDialogs.size===snapshots.dialogs&&p.actionSurfaceHosts.size===snapshots.hosts,"Inline manager leaked session, guard, dialog or surface registration");
    check(app.vault.getFiles().length===snapshots.fileCount&&[...app.workspace.getLeavesOfType("k-plex-react-view"),...app.workspace.getLeavesOfType("k-plex-sidepanel-view")].length===snapshots.leaves,"Read-only manager probe created a file or leaf");
    c.value={initialRows,searchedRows,filters,top,bottom,trustedRecorderEscape:true,nativeSettingsOwnerIsMain:doc===document,mainFocusRestored:c.mainFocusRestored,restored:true};
  })().then(()=>{c.done=true;},error=>{c.error=String(error);c.done=true;});
  return JSON.stringify({installed:true});
}

/** Close only this probe's original session even if an assertion or CLI delivery failed. */
async function closeOwnedController() {
  const started = evaluate(`(()=>{const c=window.__kplexActionDevice;if(!c||c.token!==${JSON.stringify(token)})return JSON.stringify({absent:true});c.cleanup=(async()=>{await c.task;const owner=c.ownerId?require("@electron/remote").BrowserWindow.fromId(c.ownerId):null;if(c.ownerGeometry&&owner&&!owner.isDestroyed()){owner.setMinimumSize(...c.ownerGeometry.minimum);owner.setBounds(c.ownerGeometry.bounds);c.ownerGeometry=null}if(c.ownedSettings){app.setting.close();c.ownedSettings=false}const end=Date.now()+3000;while(c.group?.isConnected&&c.group.getClientRects().length){if(Date.now()>end)throw Error('Owned inline device manager survived cleanup');await new Promise(resolve=>window.setTimeout(resolve,25))}if(c.restoreMainFocus&&!c.mainFocusRestored)await c.restoreMainFocus(end);if(window.__kplexActionDevice===c)delete window.__kplexActionDevice})().catch(error=>{c.cleanupError=String(error)});return JSON.stringify({started:true})})()`);
  if (started.absent) return;
  const deadline = Date.now() + 30000;
  while (true) { await delay(100); const state = evaluate('JSON.stringify({removed:!window.__kplexActionDevice,error:window.__kplexActionDevice?.cleanupError})'); if (state.removed) return; assert(Date.now() < deadline, "Action-device native cleanup deadline"); }
}

/** Probe one actual production device classification using a temporary profile sentinel restored synchronously. */
async function probe(width, height, expected) {
  cli("dev:errors", "clear");
  evaluate(`(()=>{const r=require("@electron/remote"),w=r.getCurrentWindow();w.setMinimumSize(200,200);w.setContentSize(${width},${height});r.app.show();r.app.focus({steal:true});w.show();w.moveTop();w.focus();return JSON.stringify(true)})()`);
  await delay(500);
  const foregroundDeadline = Date.now() + 3000;
  while (!evaluate('JSON.stringify((()=>{const r=require("@electron/remote");return r.powerMonitor.getSystemIdleState(10)!=="locked"&&!document.hidden&&document.hasFocus()&&r.getCurrentWindow().isFocused()})())')) {
    assert(Date.now() < foregroundDeadline, "Unlocked native foreground required after mode transition"); await delay(100);
  }
  const environment = evaluate(`(()=>{const p=app.plugins.plugins["k-plex"],original=p.settings.layoutProfiles;p.settings.layoutProfiles={...original,"desktop:leaf":{...original["desktop:leaf"],compactingFactor:2.01},"tablet:leaf":{...original["tablet:leaf"],compactingFactor:2.02},"mobile:leaf":{...original["mobile:leaf"],compactingFactor:2.03}};try{const value=p.getActiveLayoutProfile("leaf").compactingFactor;return JSON.stringify({device:value===2.01?"desktop":value===2.02?"tablet":value===2.03?"phone":"unknown",mobile:app.isMobile,size:[innerWidth,innerHeight],bodyClasses:document.body.className})}finally{p.settings.layoutProfiles=original}})()`);
  assert.equal(environment.device, expected, JSON.stringify(environment));
  let result;
  try {
    evaluate(`(${startNativeProbe.toString()})(${JSON.stringify(token)},${width},${height},${JSON.stringify(catalogActionIds)})`);
    const deadline = Date.now() + 30000;
    while (true) { await delay(100); const state = evaluate('JSON.stringify({done:window.__kplexActionDevice?.done,value:window.__kplexActionDevice?.value,failure:window.__kplexActionDevice?.error,geometry:window.__kplexActionDevice?.geometry})'); if (state.done) { if(state.failure){report.failureGeometry=state.geometry;throw Error(state.failure)} result = state.value; break; } assert(Date.now() < deadline, "Action-device native probe deadline"); }
  } finally { await closeOwnedController(); }
  const errors = cli("dev:errors"); assert(!errors || /^No errors captured\.?$/i.test(errors), errors);
  report.scenarios.push({ id: `action-manager-emulated-${expected}`, status: "passed", environment, result, errors });
  writeFileSync(join(reportDir, "report.json"), JSON.stringify(report, null, 2));
}

try {
  assert.equal(cli("vault", "info=path").replace(/^path\s+/, ""), target.vault);
  report.version = cli("version");
  report.help = cli("help").split("\n").filter(line => /eval|dev:dom|dev:errors|dev:mobile/.test(line));
  for (const name of ["main.js", "styles.css", "manifest.json"]) { const hash = path => createHash("sha256").update(readFileSync(path)).digest("hex"); report.artifacts[name] = hash(join(projectRoot, "dist", name)); assert.equal(hash(join(target.pluginDir, name)), report.artifacts[name], `Installed ${name} differs from exact staged build`); }
  baseline = evaluate('JSON.stringify((()=>{const w=require("@electron/remote").getCurrentWindow();return {mobile:app.isMobile,bounds:w.getBounds(),minimum:w.getMinimumSize()}})())');
  originalSettings = evaluate('JSON.stringify(app.plugins.plugins["k-plex"].settings)'); report.baseline = baseline;
  assert(!evaluate('JSON.stringify(Boolean(window.__kplexActionTest||window.__kplexActionWorkflows||window.__kplexUxRegression||window.__kplexUxDevice||window.__kplexActionDevice||document.querySelector(".modal-container .modal,.modal-container .prompt")))'), "Another native controller or unowned dialog is active");
  mutatedHost = true;
  if (baseline.mobile) { cli("eval", "code=app.emulateMobile(false)"); await ready(); }
  await probe(1200, 900, "desktop");
  cli("eval", "code=app.emulateMobile(true)"); await ready();
  await probe(900, 875, "tablet"); await probe(390, 844, "phone");
  report.status = "passed";
} catch (error) { report.status = "failed"; report.error = String(error); }
finally {
  if (mutatedHost) {
    try {
      await closeOwnedController(); await ready();
      if (evaluate('JSON.stringify(app.isMobile)') !== baseline.mobile) { cli("eval", `code=app.emulateMobile(${baseline.mobile})`); await ready(); }
      evaluate(`(()=>{const w=require("@electron/remote").getCurrentWindow();w.setMinimumSize(${baseline.minimum[0]},${baseline.minimum[1]});w.setBounds(${JSON.stringify(baseline.bounds)});return JSON.stringify(true)})()`);
      await delay(200);
      evaluate(`(()=>{const p=app.plugins.plugins["k-plex"],original=${JSON.stringify(originalSettings)};window.__kplexActionDeviceQueue={done:false};(async()=>{if(JSON.stringify(p.settings)!==JSON.stringify(original)){p.settings=original;await p.updateActionPreferences(original.actionPreferences)}await p.settingsWriteQueue})().then(()=>{window.__kplexActionDeviceQueue.done=true},error=>{window.__kplexActionDeviceQueue.error=String(error)});return JSON.stringify(true)})()`);
      const end = Date.now() + 30000; while (true) { const state = evaluate('JSON.stringify({done:window.__kplexActionDeviceQueue?.done,error:window.__kplexActionDeviceQueue?.error})'); if (state.done) break; assert(Date.now() < end, "Existing settings queue did not settle"); await delay(100); }
      evaluate('(()=>{delete window.__kplexActionDeviceQueue;return JSON.stringify(true)})()');
      assert.deepEqual(evaluate('JSON.stringify(app.plugins.plugins["k-plex"].settings)'), originalSettings, "Original live preferences/settings did not restore");
      report.cleanup = evaluate('JSON.stringify((()=>{const w=require("@electron/remote").getCurrentWindow();return {mobile:app.isMobile,bounds:w.getBounds(),minimum:w.getMinimumSize(),controllerRemoved:!window.__kplexActionDevice&&!window.__kplexActionDeviceQueue,managerClosed:!app.setting.win}})())');
      assert.equal(report.cleanup.mobile, baseline.mobile); assert.deepEqual(report.cleanup.bounds, baseline.bounds); assert.deepEqual(report.cleanup.minimum, baseline.minimum); assert(report.cleanup.controllerRemoved && report.cleanup.managerClosed);
    } catch (error) { report.status = "failed"; report.cleanupError = String(error); }
    finally {
      try { for (const item of configuration) { if (item.bytes) writeFileSync(item.path, item.bytes); else if (existsSync(item.path)) unlinkSync(item.path); assert(item.bytes ? readFileSync(item.path).equals(item.bytes) : !existsSync(item.path), `Configuration bytes changed: ${item.path}`); } report.configurationBytesRestored = true; }
      catch (error) { report.status = "failed"; report.configurationRestoreError = String(error); }
      try { evaluate('(()=>{delete window.__kplexActionDeviceQueue;return JSON.stringify(true)})()'); } catch {}
    }
  }
  report.completedAt = new Date().toISOString(); writeFileSync(join(reportDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ status: report.status, error: report.error, cleanupError: report.cleanupError, report: join(reportDir, "report.json") }));
if (report.status !== "passed") process.exitCode = 1;
