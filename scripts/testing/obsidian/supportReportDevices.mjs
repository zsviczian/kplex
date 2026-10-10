/**
 * Serial exact-build support-report acceptance under actual desktop Obsidian mobile emulation.
 * Only the explicitly configured disposable small vault is touched. Native Electron clicks reach
 * real Bug/modal controls; navigator interception proves routing/bytes without changing OS clipboard.
 * This is not physical Android/iOS permission, touch or WebView acceptance. All mode/window/settings,
 * layout/configuration and temporary controller ownership is restored independently on failure.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { validateTarget } from "./runner.mjs";

const root = resolve(process.env.KPLEX_PROJECT_ROOT ?? fileURLToPath(new URL("../../..", import.meta.url)));
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName, "kplex-test-small", "Choose the explicit disposable small vault");
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const out = process.env.KPLEX_HOST_REPORT_DIR;
assert(out && (!existsSync(out) || readdirSync(out).length === 0), "Choose a fresh explicit report directory");
mkdirSync(out, { recursive: true });
/** Hash exact built and installed bytes; manifest versions alone cannot prove native candidate identity. */
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const artifacts = ["main.js", "styles.css", "manifest.json"];
const built = Object.fromEntries(artifacts.map(/** Capture only generated artifact hashes. */ name => [name, sha(readFileSync(join(root, "dist", name)))]));
const installed = Object.fromEntries(artifacts.map(/** Verify the selected disposable vault's deployed candidate. */ name => [name, sha(readFileSync(join(target.pluginDir, name)))]));
assert.deepEqual(installed, built, "Stage the exact current build before device acceptance");
const names = ["plugins/k-plex/data.json", "community-plugins.json", "hotkeys.json", "workspace.json", "workspace-mobile.json"];
const backups = names.map(/** Preserve original bytes or absence, never publish configuration contents. */ name => ({ name, bytes: existsSync(join(target.config, name)) ? readFileSync(join(target.config, name)) : null }));
assert(backups[0].bytes && backups[1].bytes, "Initialized plugin settings and enablement are required");
const token = `support-device-${process.pid}-${Date.now()}`;
const driver = readFileSync(fileURLToPath(import.meta.url)); writeFileSync(join(out, "driver-source.mjs"), driver);
const report = { status: "running", startedAt: new Date().toISOString(), target: vaultName, driverSha256: sha(driver), artifacts: { built, installed }, scenarios: [],
  limitations: ["Actual app.emulateMobile desktop sessions and Electron trusted pointer input are emulation, not physical Android/iOS touch, permissions or mobile WebView acceptance", "Clipboard interception executes on the actual toolbar navigator; OS clipboard contents and formats are never read or written", "GitHub anchors are inspected only; no external browser, issue submission or network probe"] };
let baseline, attempted = false;

/** Invoke only the configured native vault using explicit arguments, rejecting zero-exit CLI errors. */
function cli(command, ...args) {
  const result = spawnSync(process.env.KPLEX_OBSIDIAN_CLI ?? "obsidian", [`vault=${vaultName}`, command, ...args], { cwd: root, encoding: "utf8", timeout: 30000, killSignal: "SIGKILL", maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout)) throw result.error ?? Error(result.stderr || result.stdout);
  return result.stdout.trim();
}
/** Validate every renderer expression and accept only its explicit JSON receipt. */
function evaluate(code) { new Script(code); return JSON.parse(cli("eval", `code=${code}`).replace(/^=>\s*/, "")); }
/** Yield outside the renderer between bounded observation attempts. */
const delay = ms => new Promise(/** No product timer or polling is installed by this driver wait. */ resolve => setTimeout(resolve, ms));
/** Await a freshly loaded production plugin after actual host mode changes. */
async function ready(expectedMobile) {
  const end = Date.now() + 180000;
  while (Date.now() < end) {
    try { if (evaluate(`JSON.stringify(Boolean(app.plugins.plugins['k-plex']?.actionManager&&app.plugins.plugins['k-plex']?.reportBug&&(${expectedMobile === undefined ? 'true' : `app.isMobile===${expectedMobile}`})&&(!window.__kplexSupportDeviceTransition||window.__kplexSupportDeviceTransition.plugin!==app.plugins.plugins['k-plex'])))`)) return; } catch {}
    await delay(300);
  }
  throw Error("Native mobile-mode plugin readiness deadline");
}
/** Require a fresh plugin incarnation after a real mode change, not the old pre-reload manager. */
async function setMobile(mode) {
  if (evaluate("JSON.stringify(app.isMobile)") === mode) { await ready(mode); return; }
  evaluate("(/** Retain one bounded transition witness until the native reload retires this plugin. */ ()=>{window.__kplexSupportDeviceTransition={plugin:app.plugins.plugins[\"k-plex\"]};return JSON.stringify(true)})()");
  cli("eval", `code=app.emulateMobile(${mode})`); await ready(mode);
  evaluate("(/** Release the old incarnation witness after observing actual native readiness. */ ()=>{delete window.__kplexSupportDeviceTransition;return JSON.stringify(true)})()");
}
/** Select a unique disposable native window, never whichever unrelated vault is currently focused. */
const targetWindow = 'require("@electron/remote").BrowserWindow.getAllWindows().filter(/** Select only the explicitly owned disposable vault window. */ w=>w.getTitle().includes("kplex-test-small"))';

/** Own one emulated viewport's real sidebar, clipboard override, observers and native Modal. */
function startProbe(token, width, height, expected) {
  if (window.__kplexSupportDevices || window.__kplexSupportReport || window.__kplexInteractionTouch || window.__kplexActionDevice || window.__kplexActionWorkflows || window.__kplexUxRegression || window.__kplexInteractionFinal) throw Error("Competing native controller");
  const p = app.plugins.plugins["k-plex"], remote = require("@electron/remote");
  const windows = remote.BrowserWindow.getAllWindows().filter(/** Never collect unrelated titles or use the active personal-vault owner. */ w => w.getTitle().includes("kplex-test-small"));
  if (windows.length !== 1 || !p?.reportBug || !app.isMobile) throw Error("Unique disposable emulated native owner required");
  const win = windows[0];
  if (remote.powerMonitor.getSystemIdleState(10) === "locked" || app.setting.isOpen || document.querySelector(".modal-container")) throw Error("Unlocked disposable session without unowned dialog required");
  const c = window.__kplexSupportDevices = { token, p, win, done: false, cancelled: false, wrappers: [], modal: null, writes: [], originalDialogs: new Set(p.actionDialogs.keys()) };
  /** Poll actual native state under a finite cancellable test deadline. */
  const until = async (read, label, timeout = 20000) => { const end = Date.now() + timeout; while (true) { if (c.cancelled || Date.now() > end) throw Error(label); if (read()) return; await new Promise(/** Yield only the owned test task, without changing product scheduling. */ resolve => window.setTimeout(resolve, 25)); } };
  /** Reject a native assertion while preserving existing controller evidence for cleanup. */
  const check = (value, label) => { if (!value) throw Error(label); };
  /** Dispatch actual Electron input after proving geometry and the native hit target. */
  const click = async element => {
    element.scrollIntoView({ block: "nearest", inline: "nearest" });
    const b = element.getBoundingClientRect(), owner = element.ownerDocument.defaultView;
    const x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2), hit = owner.document.elementFromPoint(x, y);
    check(b.width > 0 && b.height > 0 && b.left >= 0 && b.right <= owner.innerWidth && b.top >= 0 && b.bottom <= owner.innerHeight && (hit === element || element.contains(hit)), "Native support control is not visible/hit-testable");
    c.trusted = false;
    for (const type of ["mouseDown", "mouseUp"]) win.webContents.sendInputEvent({ type, x, y, button: "left", clickCount: 1 });
    await until(/** The passive capture receipt must come from Electron, not an assigned test flag. */ () => c.trusted, "Native support control lacked trusted Electron input");
  };
  c.task = (async () => {
    win.setMinimumSize(200, 200); win.setContentSize(width, height); remote.app.show(); remote.app.focus({ steal: true }); win.show(); win.moveTop(); win.focus(); win.webContents.focus();
    await until(/** Compare actual measured owner width; macOS may constrain height to its screen. */ () => win.getContentBounds().width === width && Math.abs(innerWidth - width) <= 2 && document.hasFocus() && win.isFocused(), "Native viewport/focus did not settle");
    check(document.body.classList.contains("is-mobile") && app.isMobile, "Actual mobile host/body classification missing");
    await until(/** Native resize must reach the production classifier before profile measurement. */ () => p.getTypographyDevice() === (expected === "phone" ? "mobile" : "tablet"), "Native device classification did not settle");
    // This synchronous sentinel verifies production device selection without persisting/announcing preferences.
    const profiles = p.settings.typographyProfiles;
    let sentinel;
    try {
      p.settings.typographyProfiles = { ...profiles, desktop: { ...profiles?.desktop, baseFontSize: 11.1 }, tablet: { ...profiles?.tablet, baseFontSize: 11.2 }, mobile: { ...profiles?.mobile, baseFontSize: 11.3 } };
      sentinel = p.getViewSettings("sidepanel").baseFontSize;
    } finally { p.settings.typographyProfiles = profiles; }
    const device = p.getTypographyDevice();
    check(device === (expected === "phone" ? "mobile" : "tablet") && sentinel === (expected === "phone" ? 11.3 : 11.2), "Actual production typography classifier did not select the expected mobile profile");
    await p.activateSidepanel();
    await until(/** Join real mobile sidebar initialization; phone Graph tabs are deliberately unavailable. */ () => app.workspace.getLeavesOfType("k-plex-sidepanel-view").length > 0, "Native mobile sidebar unavailable");
    const leaf = app.workspace.getLeavesOfType("k-plex-sidepanel-view")[0]; c.leaf = leaf;
    const owner = leaf.view.containerEl.ownerDocument.defaultView, drawer = leaf.view.containerEl.closest(".workspace-drawer");
    check(owner === window && drawer, "Mobile report sidebar has the wrong owning document");
    const split = drawer.classList.contains("mod-right") ? app.workspace.rightSplit : app.workspace.leftSplit;
    split.expand(); app.workspace.setActiveLeaf(leaf, { focus: true }); await app.workspace.revealLeaf(leaf);
    await until(/** Require actual fresh native drawer geometry rather than attached hidden DOM. */ () => !split.collapsed && owner.getComputedStyle(drawer).transform === "none" && leaf.view.containerEl.isShown(), "Actual mobile drawer did not become visible");
    /** Read the localized existing control from the mounted sidebar only. */
    const bug = () => [...leaf.view.containerEl.querySelectorAll("button")].find(/** Zen's hidden toolbar DOM cannot count as a visible Bug control. */ button => button.getAttribute("aria-label") === p.translator("support.reportTitle") && button.getClientRects().length);
    await until(/** Wait for fresh App registration and real accessible Bug control together. */ () => bug() && [...p.actionSurfaceHosts].some(/** Match only this exact native leaf. */ ([, host]) => host.leaf === leaf), "Mobile report toolbar unavailable");
    const clipboard = owner.navigator.clipboard; check(clipboard, "Owning mobile-emulated clipboard unavailable");
    const descriptor = Object.getOwnPropertyDescriptor(clipboard, "writeText");
    Object.defineProperty(clipboard, "writeText", { configurable: true, writable: true, value: /** Intercept on the actual origin navigator; never invoke its OS clipboard method. */ text => { c.writes.push({ text, trusted: c.trusted, beforeModal: !owner.document.querySelector(".kplex-support-report-modal") }); return Promise.resolve(); } });
    c.wrappers.push(/** Restore exactly the prior own property or inherited native writer. */ () => { if (descriptor) Object.defineProperty(clipboard, "writeText", descriptor); else delete clipboard.writeText; });
    /** Observe actual trusted support clicks without preventing propagation/default behavior. */
    const listener = event => { if (event.target.closest?.('.kplex-support-report-modal,button[aria-label="' + p.translator("support.reportTitle") + '"]')) c.trusted = event.isTrusted; };
    owner.document.addEventListener("click", listener, true);
    c.wrappers.push(/** Remove only this document's exact owned native observer. */ () => owner.document.removeEventListener("click", listener, true));
    await click(bug());
    await until(/** Native Modal must open in the same owner document as the real toolbar. */ () => owner.document.querySelector(".kplex-support-report-modal"), "Mobile report Modal opened in wrong document");
    const modal = owner.document.querySelector(".kplex-support-report-modal"), preview = modal.querySelector("textarea"), status = modal.querySelector("[role=status]");
    c.modal = [...p.actionDialogs.keys()].find(/** Retain only the feature Modal created by this owned native click. */ dialog => dialog.modalEl === modal);
    check(c.modal && preview?.readOnly && status, "Mobile native report controls missing");
    await until(/** A resolved owning clipboard write, rather than construction, must establish copied status. */ () => status.textContent === p.translator("support.copied"), "Mobile intercepted clipboard did not show actual fulfillment");
    let previousRect = null, stableSamples = 0;
    await until(/** Native mobile Modal opening animation must settle before layout/input acceptance. */ () => {
      const rect = modal.getBoundingClientRect(), values = [rect.left, rect.top, rect.width, rect.height];
      const stable = previousRect && values.every(/** Compare actual owner geometry without guessing an animation duration. */ (value, index) => Math.abs(value - previousRect[index]) < .1);
      stableSamples = stable ? stableSamples + 1 : 0; previousRect = values; return stableSamples >= 2;
    }, "Native mobile report geometry did not settle");
    const text = preview.value, parsed = JSON.parse(text.split("```json\n")[1]?.split("\n```")[0] ?? "null"), write = c.writes[0];
    check(c.writes.length === 1 && text === write.text && write.trusted && write.beforeModal && text.length <= 32768 && parsed?.formatVersion === 1, "Mobile report exact bytes/gesture/schema failed");
    check(parsed.environment.formFactor === expected && parsed.environment.surfaceKind === "sidepanel" && !text.includes("kplex-test-small"), "Report lost actual device/surface privacy facts");
    const links = [...modal.querySelectorAll("a")];
    check(links.length === 2 && links[0].getAttribute("href") === "https://github.com/zsviczian/kplex/issues" && links[1].getAttribute("href") === "https://github.com/zsviczian/kplex/issues/new" && links.every(/** Both explicit external links retain isolated browser targets. */ link => link.target === "_blank" && link.rel.includes("noopener")), "Mobile issue guidance anchors incorrect");
    const m = modal.getBoundingClientRect(), b = preview.getBoundingClientRect();
    check(m.left >= 0 && m.right <= owner.innerWidth && modal.scrollWidth <= modal.clientWidth + 1 && b.left >= m.left && b.right <= m.right, "Mobile native report has horizontal overflow");
    const close = [...modal.querySelectorAll("button")].find(/** Use the actual localized native Close button rather than calling modal cleanup to fake focus acceptance. */ button => button.textContent === p.translator("support.close"));
    await click(close); await until(/** Closing must dispose the actual feature dialog map entry and DOM. */ () => !modal.isConnected && !p.actionDialogs.has(c.modal), "Mobile report dialog did not retire");
    await until(/** Do not manufacture restored focus after native Modal dismissal. */ () => leaf.view.containerEl.contains(owner.document.activeElement), "Mobile report did not restore sidebar focus", 3000);
    c.modal = null;
    return { expectedDevice: expected, actualTypographyDevice: device, profileSentinel: sentinel, appMobile: app.isMobile, mobileBody: document.body.classList.contains("is-mobile"),
      viewport: { width: owner.innerWidth, height: owner.innerHeight }, nativeWindowId: win.id, toolbarOwnerIsModalOwner: true, trustedBugAndClose: true, interceptedClipboardWrites: c.writes.length,
      osClipboardUntouched: true, previewMatchesCopiedBytes: true, reportBytes: text.length, formatVersion: parsed.formatVersion, environment: parsed.environment, copiedStatus: true,
      linksCorrect: true, modalBounds: { width: m.width, left: m.left, right: m.right }, horizontalOverflow: false, focusRestored: true, ownedDialogsRemaining: 0 };
  })().then(/** Retain only the safe measurable device receipt. */ value => { c.value = value; c.done = true; }, /** Failure still permits independently owned teardown. */ error => { c.error = String(error); c.done = true; });
  return JSON.stringify({ started: true });
}

/** Remove the controller before reload, releasing Modal/listeners/clipboard captures even after failure. */
async function cleanupController() {
  const started = evaluate(`(/** Begin independently owned native teardown before any host reload. */ ()=>{const c=window.__kplexSupportDevices;if(!c||c.token!==${JSON.stringify(token)})return JSON.stringify({absent:true});c.cancelled=true;c.cleanup=(/** Retire the finite task and close only dialogs created after this probe began. */ async()=>{await c.task;const errors=[];for(const dialog of c.p.actionDialogs.keys())if(!c.originalDialogs.has(dialog)&&dialog.modalEl?.classList.contains('kplex-support-report-modal'))try{dialog.close()}catch{errors.push('modal-close')}for(const restore of c.wrappers.reverse())try{restore()}catch{errors.push('wrapper-restore')}c.wrappers=[];c.writes=[];c.cleaned={errors,ready:true}})();return JSON.stringify({started:true})})()`);
  if (started.absent) return;
  const end = Date.now() + 30000;
  while (Date.now() < end) {
    const state = evaluate('JSON.stringify({absent:!window.__kplexSupportDevices,cleaned:window.__kplexSupportDevices?.cleaned})');
    if (state.absent) return;
    if (state.cleaned) {
      evaluate('(/** Drop private captures only after the outer driver reads the teardown receipt. */ ()=>{delete window.__kplexSupportDevices;return JSON.stringify(true)})()');
      assert.deepEqual(state.cleaned.errors, [], 'Native mobile support resource restoration failed'); return;
    }
    await delay(100);
  }
  throw Error("Owned mobile support cleanup deadline");
}

try {
  assert.equal(cli("vault", "info=path").replace(/^path\s+/, ""), target.vault); report.version = cli("version"); await ready();
  baseline = evaluate(`(()=>{const windows=${targetWindow};if(windows.length!==1)throw Error('Ambiguous disposable window');const w=windows[0],p=app.plugins.plugins['k-plex'];if(document.querySelector('.modal-container')||app.setting.isOpen||window.__kplexSupportDevices||window.__kplexSupportReport||window.__kplexInteractionTouch||window.__kplexActionDevice||window.__kplexActionWorkflows||window.__kplexUxRegression||window.__kplexInteractionFinal)throw Error('Unowned dialog or competing controller');return JSON.stringify({mobile:app.isMobile,bounds:w.getBounds(),minimum:w.getMinimumSize(),settings:JSON.parse(JSON.stringify(p.settings)),layout:app.workspace.getLayout(),sidebar:{left:app.workspace.leftSplit.collapsed,right:app.workspace.rightSplit.collapsed}})})()`);
  report.baseline = { mobile: baseline.mobile, bounds: baseline.bounds, minimum: baseline.minimum }; attempted = true;
  if (baseline.mobile) await setMobile(false);
  await setMobile(true);
  for (const [width, height, expected] of [[900, 875, "tablet"], [390, 844, "phone"]]) {
    // Fresh real host sessions avoid accepting attached-but-hidden mobile drawer state after a reload.
    if (expected === "phone") { await cleanupController(); await setMobile(false); await setMobile(true); }
    try {
      cli("dev:errors", "clear");
      evaluate(`(${startProbe.toString()})(${JSON.stringify(token)},${width},${height},${JSON.stringify(expected)})`);
      const end = Date.now() + 60000;
      while (true) { const state = evaluate('JSON.stringify({done:window.__kplexSupportDevices?.done,value:window.__kplexSupportDevices?.value,error:window.__kplexSupportDevices?.error})'); if (state.done) { if (state.error) throw Error(state.error); report.scenarios.push({ id: `support-emulated-${expected}`, status: "passed", ...state.value }); break; } assert(Date.now() < end, "Mobile support scenario deadline"); await delay(100); }
      const nativeErrors = cli("dev:errors"); assert(!nativeErrors || /^No errors captured\.?$/i.test(nativeErrors), "Native JavaScript errors: " + nativeErrors.slice(0, 1000));
      report.scenarios.at(-1).nativeErrors = { status: "passed", errorsCaptured: false };
    } finally { await cleanupController(); }
    writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));
  }
  report.status = "passed";
} catch (error) { report.status = "failed"; report.error = String(error); }
finally {
  const errors = [];
  if (attempted) {
    try { await cleanupController(); } catch (error) { errors.push("Controller: " + String(error)); }
    try { cli("dev:errors", "clear"); await setMobile(baseline.mobile); } catch (error) { errors.push("Mobile restore: " + String(error)); }
    try {
      evaluate(`(()=>{const c=window.__kplexSupportDeviceRestore={done:false};c.task=(async()=>{const p=app.plugins.plugins['k-plex'];p.settings=${JSON.stringify(baseline.settings)};await p.saveSettings(false,false);await p.settingsWriteQueue;await app.workspace.changeLayout(${JSON.stringify(baseline.layout)});p.settings=${JSON.stringify(baseline.settings)};await p.saveSettings(false,false);await p.settingsWriteQueue;const windows=${targetWindow};if(windows.length!==1)throw Error('Ambiguous restore window');const w=windows[0];w.setMinimumSize(...${JSON.stringify(baseline.minimum)});w.setBounds(${JSON.stringify(baseline.bounds)});for(const side of ['left','right']){const split=app.workspace[side+'Split'];if(${JSON.stringify(baseline.sidebar)}[side])split.collapse();else split.expand()}await new Promise(resolve=>window.setTimeout(resolve,500));return{mobile:app.isMobile,bounds:w.getBounds(),minimum:w.getMinimumSize(),settingsRestored:JSON.stringify(p.settings)===JSON.stringify(${JSON.stringify(baseline.settings)}),controllersRemoved:!window.__kplexSupportDevices,dialogsRemaining:[...p.actionDialogs.keys()].filter(d=>d.modalEl?.classList.contains('kplex-support-report-modal')).length}})().then(value=>{c.value=value;c.done=true},error=>{c.error=String(error);c.done=true});return JSON.stringify({started:true})})()`);
      const end = Date.now() + 90000;
      while (true) { const state = evaluate('JSON.stringify({done:window.__kplexSupportDeviceRestore?.done,value:window.__kplexSupportDeviceRestore?.value,error:window.__kplexSupportDeviceRestore?.error})'); if (state.done) { if (state.error) throw Error(state.error); report.cleanup = state.value; break; } assert(Date.now() < end, "Native device restoration deadline"); await delay(100); }
      evaluate("(()=>{delete window.__kplexSupportDeviceRestore;delete window.__kplexSupportDeviceTransition;return JSON.stringify(true)})()");
      const nativeErrors = cli("dev:errors"); report.desktopRestorationNativeErrors = { status: "checked", errorsCaptured: Boolean(nativeErrors && !/^No errors captured\.?$/i.test(nativeErrors)) };
      assert(!report.desktopRestorationNativeErrors.errorsCaptured, "Native JavaScript errors after restoration: " + nativeErrors.slice(0, 1000));
      assert.equal(report.cleanup.mobile, baseline.mobile); assert.deepEqual(report.cleanup.bounds, baseline.bounds); assert.deepEqual(report.cleanup.minimum, baseline.minimum); assert(report.cleanup.settingsRestored && report.cleanup.controllersRemoved && report.cleanup.dialogsRemaining === 0);
    } catch (error) { report.desktopRestorationNativeErrors ??= { status: "pending", reason: "native-host-unavailable" }; errors.push("Native restore: " + String(error)); }
    for (const backup of backups) {
      try { const path = join(target.config, backup.name); if (backup.bytes === null) { if (existsSync(path)) rmSync(path); } else writeFileSync(path, backup.bytes); assert(backup.bytes === null ? !existsSync(path) : readFileSync(path).equals(backup.bytes), "Configuration bytes differ"); }
      catch (error) { errors.push("Configuration restore: " + backup.name + ": " + String(error)); }
    }
    report.configurationBytesRestored = !errors.some(/** Native task cleanup and byte restoration remain independently reported. */ error => error.startsWith("Configuration restore:"));
    try { evaluate("(()=>{delete window.__kplexSupportDeviceRestore;delete window.__kplexSupportDeviceTransition;return JSON.stringify(true)})()"); } catch {}
  }
  if (errors.length) { report.status = "failed"; report.cleanupErrors = errors; }
  report.completedAt = new Date().toISOString(); writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ status: report.status, error: report.error, cleanupErrors: report.cleanupErrors, cases: report.scenarios.length, report: join(out, "report.json") }));
if (report.status !== "passed") process.exitCode = 1;
