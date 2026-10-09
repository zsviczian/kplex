/**
 * Exact-build native fullscreen/Zen acceptance in an explicit disposable small vault. Owns
 * temporary panes, mode/input probes, preference/layout restoration and evidence. Desktop mobile
 * emulation checks layout/routing only; this driver does not establish physical touch or paint latency.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateTarget } from "./runner.mjs";

const projectRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName, "kplex-test-small", "Select the disposable small test vault explicitly");
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const output = process.env.KPLEX_HOST_REPORT_DIR;
assert(output && (!existsSync(output) || readdirSync(output).length === 0), "Choose a fresh report directory");
mkdirSync(output, { recursive: true });
const driver = readFileSync(fileURLToPath(import.meta.url));
writeFileSync(join(output, "driver-source.mjs"), driver);
const token = `display-modes-${process.pid}-${Date.now()}`;
const configuration = [join(target.pluginDir, "data.json"), join(target.config, "community-plugins.json"), join(target.config, "hotkeys.json")]
  .map(path => ({ path, bytes: existsSync(path) ? readFileSync(path) : null }));
const report = { status: "running", startedAt: new Date().toISOString(), driverSha256: createHash("sha256").update(driver).digest("hex"), artifacts: {}, scenarios: [],
  limitations: ["Trusted Electron renderer input and native DOM/layout assertions; no physical hardware/touch, screen reader or mobile WebView acceptance.", "Desktop mobile emulation assesses Zen geometry and fullscreen availability, not physical-device activation or performance."] };
let baseline, originalSettings, nativeStarted = false;

/** Run one explicit-vault CLI process, rejecting zero-exit native eval errors as well. */
function cli(command, ...args) {
  const result = spawnSync(process.env.KPLEX_OBSIDIAN_CLI || "obsidian", [`vault=${vaultName}`, command, ...args], { cwd: projectRoot, encoding: "utf8", timeout: 30000, killSignal: "SIGKILL", maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout)) throw result.error ?? new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}
/** Decode detached native facts; mutations are never retried implicitly. */
function evaluate(code) { return JSON.parse(cli("eval", `code=${code}`).replace(/^=>\s*/, "")); }
/** Yield polling without changing the renderer's own throttling or scheduler. */
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
/** Reacquire loaded plugin/view ownership after a deliberate host reload. */
async function ready() {
  const deadline = Date.now() + 180000;
  while (true) {
    try { if (evaluate('JSON.stringify(Boolean(app.plugins.plugins["k-plex"]?.actionManager))')) break; } catch {}
    assert(Date.now() < deadline, "Host reload did not load K-Plex"); await delay(500);
  }
  cli("command", "id=k-plex:kplex-start");
}

/** Exercise actual view/controller/action owners and retain exact cleanup even after failure. */
function installDesktopProbe(token) {
  const remote = require("@electron/remote"), owner = remote.getCurrentWindow(), p = app.plugins.plugins["k-plex"];
  if (!p?.actionManager || window.__kplexDisplayModesProbe) throw Error("Loaded plugin and no competing controller required");
  if (app.setting.isOpen || document.querySelector(".modal-container .modal, .modal-container .prompt")) throw Error("An unowned dialog is open");
  if (remote.powerMonitor.getSystemIdleState(10) === "locked") throw Error("Unlocked native session required");
  const c = window.__kplexDisplayModesProbe = { token, done: false, scenarios: [], owned: [], wrappers: [], originalSettings: JSON.stringify(p.settings) };
  /** Assert the exact observed behavior before collecting a pass receipt. */
  const check = (value, message) => { if (!value) throw Error(message); };
  /** Bound native behavior waits separately from source readiness. */
  const until = async (predicate, message, milliseconds = 15000) => { const end = Date.now() + milliseconds; while (!predicate()) { check(Date.now() < end, message); await new Promise(resolve => window.setTimeout(resolve, 25)); } };
  /** Collect detached geometry rather than retaining Electron remote proxies. */
  const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
  /** Read the view-owned session snapshot without a production debug surface. */
  const modes = leaf => leaf.view.displayModes?.getSnapshot();
  /** Reacquire the mounted graph after native migration. */
  const root = leaf => leaf.view.contentEl.querySelector(".kplex-app");
  /** Resolve a real unified-action button in the exact native view. */
  const control = (leaf, name) => root(leaf)?.querySelector(`[data-kplex-display-control=${name}]`);
  /** Native geometry establishes current visibility. */
  const visible = element => Boolean(element?.getClientRects().length);
  /** Match the actual mounted generation to its native leaf. */
  const surfaceId = leaf => [...p.actionSurfaceHosts].find(([, registration]) => registration.leaf === leaf)?.[0];
  /** Capture state whose identity must survive ordinary mode changes. */
  const snapshot = leaf => ({ camera: root(leaf).querySelector(".kplex-camera")?.style.transform, selected: p.actionManager.readSnapshot(surfaceId(leaf))?.selected ?? null,
    center: p.actionManager.readSnapshot(surfaceId(leaf))?.center ?? null, history: JSON.stringify(p.settings.navigationHistory), viewport: rect(root(leaf).querySelector(".kplex-plex")), content: rect(leaf.view.contentEl) });
  /** Deliver trusted pointer input to the exact owning renderer and hit-tested button. */
  const click = async button => {
    check(button && visible(button), "Mode/control button unavailable");
    const doc = button.ownerDocument, native = doc.defaultView.require("@electron/remote").getCurrentWindow(), r = button.getBoundingClientRect();
    native.show(); native.focus(); native.webContents.focus();
    await until(() => doc.hasFocus() && native.isFocused(), "Control renderer not foreground");
    const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
    check(button.contains(doc.elementFromPoint(x, y)), "Button obscured or clipped");
    native.webContents.sendInputEvent({ type: "mouseMove", x, y });
    native.webContents.sendInputEvent({ type: "mouseDown", x, y, button: "left", clickCount: 1 });
    native.webContents.sendInputEvent({ type: "mouseUp", x, y, button: "left", clickCount: 1 });
    await new Promise(resolve => window.setTimeout(resolve, 100));
  };
  /** Route one trusted key through the owning Obsidian/DOM scopes without OS-global input. */
  const key = async (element, value) => {
    const doc = element.ownerDocument, w = doc.defaultView, native = w.require("@electron/remote").getCurrentWindow();
    native.focus(); native.webContents.focus(); element.focus({ preventScroll: true });
    await until(() => doc.activeElement === element && doc.hasFocus(), "Native key target did not focus");
    let receipt = false;
    const nativeKey = ({ ArrowDown: "Down", ArrowUp: "Up", ArrowLeft: "Left", ArrowRight: "Right" })[value] ?? value;
    const observe = event => { if (event.isTrusted && event.target === element && event.key.toLowerCase() === value.toLowerCase()) receipt = true; };
    w.addEventListener("keydown", observe, true);
    try { native.webContents.sendInputEvent({ type: "keyDown", keyCode: nativeKey }); native.webContents.sendInputEvent({ type: "keyUp", keyCode: nativeKey }); await until(() => receipt, "Trusted key receipt missing"); await new Promise(resolve => window.setTimeout(resolve, 75)); }
    finally { w.removeEventListener("keydown", observe, true); }
  };
  /** Record passes only after their complete observable assertions. */
  const passed = (id, details = {}) => c.scenarios.push({ id, status: "passed", ...details });
  /** Count existing heavy entry points without changing their promises or semantics. */
  const wrap = (object, name, counts) => {
    const method = object[name]; if (typeof method !== "function") return;
    const descriptor = Object.getOwnPropertyDescriptor(object, name); c.wrappers.push({ object, name, descriptor });
    object[name] = function (...args) { counts[name] = (counts[name] ?? 0) + 1; return method.apply(this, args); };
  };
  /** Remove exactly owned instrumentation before reload or cleanup. */
  c.releaseWrappers = () => { for (const item of c.wrappers.splice(0).reverse()) { if (item.descriptor) Object.defineProperty(item.object, item.name, item.descriptor); else delete item.object[item.name]; } };
  /** Close modes first; native layout/config restoration is owned by the external driver. */
  c.cleanup = async () => {
    for (const dialog of p.actionDialogs.keys()) if (dialog.modalEl?.isConnected) dialog.close();
    for (const leaf of app.workspace.getLeavesOfType("k-plex-react-view")) { if (leaf.view.displayModes?.getSnapshot().fullscreen) leaf.view.displayModes.exitFullscreen(); }
    c.releaseWrappers();
    for (const leaf of c.owned.slice().reverse()) if (leaf.parent) leaf.detach();
    check(!document.querySelector(".kplex-fullscreen-overlay,.kplex-fullscreen-anchor"), "Fullscreen DOM leaked");
    c.cleaned = true;
  };
  c.task = new Promise(resolve => window.setTimeout(resolve, 0)).then(async () => {
    remote.app.show(); remote.app.focus({ steal: true }); owner.show(); owner.focus(); owner.webContents.focus();
    await until(() => owner.isFocused() && document.hasFocus() && !document.hidden, "Native foreground unavailable", 5000);
    const original = app.workspace.getLeavesOfType("k-plex-react-view").find(leaf => leaf.view.contentEl.ownerDocument === document && p.isKplexLeafVisible(leaf));
    check(original, "Visible main-window K-Plex required"); await original.view.waitUntilReady();
    p.settings.allowAutozoom = true; p.settings.animationSpeed = 0; p.index.notifyPresentation();
    await new Promise(resolve => window.setTimeout(resolve, 100));
    const other = app.workspace.getLeaf("split", "vertical"); c.owned.push(other); await other.setViewState({ type: "empty", active: true });
    app.workspace.setActiveLeaf(original, { focus: true }); await until(() => root(original)?.querySelector(".kplex-camera"), "Graph camera missing");
    await until(() => p.getIndexStatus().upToDate, "Initial local graph not ready", 30000);
    const originalRoot = root(original), cameraNode = originalRoot.querySelector(".kplex-camera"), originalParent = original.view.contentEl.parentElement;
    await p.actionManager.dispatch({ id: "view.zoom-in", source: "toolbar", surfaceId: surfaceId(original) });
    await p.actionManager.dispatch({ id: "view.pan.right", source: "toolbar", surfaceId: surfaceId(original) });
    await key(originalRoot, "ArrowDown");
    const counts = {}; for (const name of ["rebuild", "patchMarkdownPaths", "restoreSnapshot", "waitForSnapshotHydration"]) wrap(p.index, name, counts);
    for (const sidebarOpen of [true, false]) {
      for (const sidebar of [app.workspace.leftSplit, app.workspace.rightSplit]) sidebarOpen ? sidebar.expand() : sidebar.collapse();
      await new Promise(resolve => window.setTimeout(resolve, 150));
      // An ordinary native pane resize may auto-fit; acquire a fresh non-default camera afterward.
      await p.actionManager.dispatch({ id: "view.zoom-in", source: "toolbar", surfaceId: surfaceId(original) });
      const before = snapshot(original), layout = JSON.stringify(app.workspace.getLayout()), nativeLeaf = rect(original.view.containerEl);
      for (const [fullscreen, zen] of [[true, false], [true, true], [false, true], [false, false], [false, true], [true, true], [true, false], [false, false]]) {
        if (modes(original).fullscreen !== fullscreen) await click(control(original, "fullscreen"));
        if (modes(original).zen !== zen) await click(control(original, "zen"));
        await until(() => modes(original).fullscreen === fullscreen && modes(original).zen === zen, "Independent mode state incorrect");
        await new Promise(resolve => window.setTimeout(resolve, 75));
        check(root(original) === originalRoot && originalRoot.querySelector(".kplex-camera") === cameraNode, "Mode change replaced React/graph DOM");
        const after = snapshot(original);
        check(after.camera === before.camera && JSON.stringify(after.selected) === JSON.stringify(before.selected) && after.history === before.history && JSON.stringify(after.center) === JSON.stringify(before.center), "Mode resize changed camera/selection/history");
        check(visible(originalRoot.querySelector(".kplex-top-stack")) === !zen && visible(originalRoot.querySelector(".kplex-history-bar")) === !zen, "Zen toolbar visibility incorrect");
        check(control(original, "fullscreen").getAttribute("aria-pressed") === String(fullscreen) && control(original, "zen").getAttribute("aria-pressed") === String(zen), "Mode ARIA state incorrect");
        for (const button of originalRoot.querySelectorAll(".kplex-zoom-controls button")) { const r = button.getBoundingClientRect(); check(r.width > 0 && r.height > 0 && r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1 && button.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)), "A graph control is clipped or covered"); }
        if (fullscreen) { const r = rect(original.view.contentEl); check(Math.abs(r.x) < 1 && Math.abs(r.y) < 1 && Math.abs(r.width - innerWidth) < 1 && Math.abs(r.height - innerHeight) < 1, "Fullscreen does not cover owning application viewport"); check(!document.fullscreenElement, "Browser fullscreen was invoked"); }
        else check(original.view.contentEl.parentElement === originalParent && JSON.stringify(rect(original.view.containerEl)) === JSON.stringify(nativeLeaf), "Original native pane position/dimensions not restored");
        check(JSON.stringify(app.workspace.getLayout()) === layout, "Mode toggle changed native workspace configuration");
      }
      passed(`four-states-sidebars-${sidebarOpen ? "open" : "closed"}`, { camera: before.camera, states: 8, heavyCalls: { ...counts } });
    }
    check(Object.values(counts).every(value => value === 0), "Display modes invoked indexing/hydration");
    c.releaseWrappers(); passed("no-indexing-or-hydration-on-mode-toggle", { counts });
    await click(control(original, "fullscreen")); await click(control(original, "zen"));
    await key(originalRoot, "a"); await until(() => visible(originalRoot.querySelector(".kplex-type-selection")), "Typing phrase missing");
    await key(originalRoot, "Escape"); check(modes(original).fullscreen && modes(original).zen, "Query Escape exited a display mode");
    await key(originalRoot, "Escape"); check(modes(original).fullscreen && !modes(original).zen, "Bare Escape did not exit Zen first");
    await key(originalRoot, "Escape"); check(!modes(original).fullscreen, "Second bare Escape did not exit fullscreen"); passed("escape-query-before-zen-before-fullscreen");
    await click(control(original, "fullscreen")); await click(control(original, "zen"));
    await p.actionManager.dispatch({ id: "view.zoom-in", source: "toolbar", surfaceId: surfaceId(original) });
    const beforeFit = snapshot(original).camera;
    const fitButton = [...originalRoot.querySelectorAll(".kplex-zoom-controls button")].find(button => button.getAttribute("aria-label") === p.translator("graph.fitGraph"));
    await click(fitButton); check(snapshot(original).camera !== beforeFit && modes(original).fullscreen && modes(original).zen, "Explicit Fit unavailable in combined modes");
    await click(control(original, "zen")); passed("explicit-fit-in-combined-modes");
    const opened = await p.actionManager.dispatch({ id: "actions.open", source: "toolbar", surfaceId: surfaceId(original) }); check(opened.status === "opened", "Native command palette unavailable in fullscreen");
    const prompt = document.querySelector(".modal-container .prompt"), input = prompt?.querySelector("input"); check(input && visible(prompt), "Native command palette did not mount");
    const r = input.getBoundingClientRect(); check(input.contains(document.elementFromPoint(r.left + 20, r.top + r.height / 2)), "Fullscreen covered native command palette");
    await key(input, "Escape"); await until(() => !visible(prompt), "Palette Escape did not close native modal"); check(modes(original).fullscreen, "Native modal Escape exited fullscreen"); passed("native-command-palette-above-fullscreen");
    await click(control(original, "zen")); app.workspace.setActiveLeaf(other, { focus: true }); await until(() => !modes(original).fullscreen, "Active leaf change did not exit fullscreen");
    check(modes(original).zen && !document.querySelector(".kplex-fullscreen-overlay"), "Active leaf cleanup coupled Zen or leaked overlay"); app.workspace.setActiveLeaf(original, { focus: true }); await click(control(original, "zen")); passed("active-leaf-restoration-preserves-zen");
    // A separate owned graph supplies close/migration checks without retiring the original view.
    const extra = app.workspace.getLeaf("split", "horizontal"); c.owned.push(extra); await extra.setViewState({ type: "k-plex-react-view", active: true }); await extra.view.waitUntilReady();
    const mainTabs = original.parent; await click(control(extra, "fullscreen")); await click(control(extra, "zen"));
    app.workspace.moveLeafToPopout(extra);
    await until(() => extra.view.containerEl.ownerDocument !== document && root(extra)?.isConnected && !modes(extra).fullscreen, "Fullscreen main-to-popout migration did not restore/remount");
    const popDoc = extra.view.contentEl.ownerDocument; await until(() => popDoc.body.style.getPropertyValue("--zoom-factor"), "Native popout titlebar initialization incomplete"); check(!document.querySelector(".kplex-fullscreen-overlay,.kplex-fullscreen-anchor") && modes(extra).zen, "Migration leaked source overlay or lost Zen");
    await extra.view.waitUntilReady(); await click(control(extra, "fullscreen")); const popRect = rect(extra.view.contentEl);
    check(Math.abs(popRect.width - popDoc.defaultView.innerWidth) < 1 && Math.abs(popRect.height - popDoc.defaultView.innerHeight) < 1 && !document.querySelector(".kplex-fullscreen-overlay"), "Popout fullscreen used the wrong document");
    // Public workspace parent APIs preserve native migration; reveal triggers its existing insertion lifecycle.
    extra.parent.removeChild(extra); mainTabs.insertChild(mainTabs.children.length, extra); await app.workspace.revealLeaf(extra); app.workspace.setActiveLeaf(extra, { focus: true });
    await until(() => extra.view.containerEl.ownerDocument === document && root(extra)?.isConnected && !modes(extra).fullscreen, "Fullscreen popout-to-main migration did not restore/remount");
    check(!popDoc.querySelector(".kplex-fullscreen-overlay,.kplex-fullscreen-anchor") && modes(extra).zen, "Return migration leaked source overlay or coupled Zen"); passed("fullscreen-owning-document-two-way-migration");
    await click(control(extra, "fullscreen")); extra.detach(); await until(() => !document.querySelector(".kplex-fullscreen-overlay,.kplex-fullscreen-anchor"), "Closing fullscreen view leaked DOM"); passed("view-close-restores-native-workspace");
    app.workspace.setActiveLeaf(original, { focus: true }); await click(control(original, "fullscreen")); await app.plugins.disablePlugin("k-plex");
    check(!document.querySelector(".kplex-fullscreen-overlay,.kplex-fullscreen-anchor"), "Plugin unload leaked fullscreen chrome");
    await app.plugins.enablePlugin("k-plex"); app.commands.executeCommandById("k-plex:kplex-start");
    await until(() => app.workspace.getLeavesOfType("k-plex-react-view").some(leaf => root(leaf)?.isConnected && modes(leaf)), "Reloaded K-Plex missing");
    check(app.workspace.getLeavesOfType("k-plex-react-view").every(leaf => !modes(leaf)?.fullscreen && !modes(leaf)?.zen), "Session display modes persisted across reload"); passed("plugin-unload-restores-and-reload-starts-normal");
  }).then(() => { c.done = true; }, error => { c.error = String(error); c.done = true; });
  return JSON.stringify({ installed: true });
}

/** Poll one serial native controller, retaining its completed receipts even when an assertion fails. */
async function desktopProbe() {
  nativeStarted = true; evaluate(`(${installDesktopProbe.toString()})(${JSON.stringify(token)})`);
  const deadline = Date.now() + 180000;
  while (true) {
    await delay(150); const value = evaluate('JSON.stringify({done:window.__kplexDisplayModesProbe?.done,error:window.__kplexDisplayModesProbe?.error,scenarios:window.__kplexDisplayModesProbe?.scenarios})');
    report.scenarios = value.scenarios ?? [];
    if (value.done) { if (value.error) throw Error(value.error); break; }
    assert(Date.now() < deadline, "Native desktop probe deadline");
  }
}
/** Remove an exact native controller after its own bounded operations settle. */
async function cleanupController() {
  if (!nativeStarted) return;
  report.desktopCleanup = evaluate('(async()=>{const c=window.__kplexDisplayModesProbe;if(!c)return JSON.stringify({absent:true});await c.task;await c.cleanup();const result={cleaned:c.cleaned,remainingWrappers:c.wrappers.length};delete window.__kplexDisplayModesProbe;return JSON.stringify(result)})()'); nativeStarted = false;
}
/** Validate Zen and explicit desktop-only fullscreen availability after each native emulation reload. */
async function deviceProbe(width, height, expected) {
  evaluate(`(()=>{const r=require("@electron/remote"),w=r.getCurrentWindow();w.setMinimumSize(200,200);w.setContentSize(${width},${height});r.app.show();r.app.focus({steal:true});w.show();w.focus();return JSON.stringify(true)})()`); await delay(500);
  const environment = evaluate(`(()=>{const p=app.plugins.plugins["k-plex"],original=p.settings.layoutProfiles;p.settings.layoutProfiles={...original,"desktop:leaf":{...original["desktop:leaf"],compactingFactor:2.01},"tablet:leaf":{...original["tablet:leaf"],compactingFactor:2.02},"mobile:leaf":{...original["mobile:leaf"],compactingFactor:2.03}};try{const value=p.getActiveLayoutProfile("leaf").compactingFactor;return JSON.stringify({device:value===2.01?"desktop":value===2.02?"tablet":value===2.03?"phone":"unknown",mobile:app.isMobile,size:[innerWidth,innerHeight],bodyClasses:document.body.className})}finally{p.settings.layoutProfiles=original}})()`);
  assert.equal(environment.device, expected, JSON.stringify(environment));
  const result = evaluate(`(async()=>{const p=app.plugins.plugins["k-plex"],leaf=[...app.workspace.getLeavesOfType("k-plex-react-view"),...app.workspace.getLeavesOfType("k-plex-sidepanel-view")].find(l=>p.isKplexLeafVisible(l));if(!leaf)throw Error("Visible emulated K-Plex required");await leaf.view.waitUntilReady();const root=leaf.view.contentEl.querySelector(".kplex-app"),zen=root?.querySelector("[data-kplex-display-control=zen]");if(!zen)throw Error("Emulated Zen control missing");const controller=leaf.view.displayModes,normal=root.querySelector(".kplex-plex").getBoundingClientRect().height;controller.toggleZen();await new Promise(r=>window.setTimeout(r,100));const graph=root.querySelector(".kplex-plex").getBoundingClientRect(),b=zen.getBoundingClientRect(),value={mobile:app.isMobile,size:[innerWidth,innerHeight],fullscreenAvailable:controller.fullscreenAvailable,fullscreenButton:!!root.querySelector("[data-kplex-display-control=fullscreen]"),zen:controller.getSnapshot().zen,topVisible:root.querySelector(".kplex-top-stack").getClientRects().length>0,historyVisible:root.querySelector(".kplex-history-bar").getClientRects().length>0,normalGraphHeight:normal,zenGraphHeight:graph.height,control:{x:b.x,y:b.y,width:b.width,height:b.height},surface:root.className};controller.toggleFullscreen();value.refusedFullscreen=!controller.getSnapshot().fullscreen;controller.toggleZen();await new Promise(r=>window.setTimeout(r,100));value.restoredZen=!controller.getSnapshot().zen;return JSON.stringify(value)})()`);
  assert(result.mobile && !result.fullscreenAvailable && !result.fullscreenButton && result.refusedFullscreen, "Mobile fullscreen availability is not explicitly constrained");
  assert(result.zen && !result.topVisible && !result.historyVisible && result.restoredZen && result.zenGraphHeight > result.normalGraphHeight, "Emulated Zen did not expand/restore graph chrome");
  assert(result.control.x >= 0 && result.control.y >= 0 && result.control.x + result.control.width <= result.size[0] + 1 && result.control.y + result.control.height <= result.size[1] + 1, "Emulated Zen control clipped");
  report.scenarios.push({ id: `emulated-${expected}-zen`, status: "passed", environment, result });
}

try {
  assert.equal(cli("vault", "info=path").replace(/^path\s+/, ""), target.vault);
  report.version = cli("version"); report.help = cli("help").split("\n").filter(line => /eval|dev:dom|dev:errors|dev:mobile/.test(line));
  for (const name of ["main.js", "styles.css", "manifest.json"]) { const hash = path => createHash("sha256").update(readFileSync(path)).digest("hex"); report.artifacts[name] = hash(join(projectRoot, "dist", name)); assert.equal(hash(join(target.pluginDir, name)), report.artifacts[name], "Installed build differs"); }
  baseline = evaluate('JSON.stringify((()=>{const w=require("@electron/remote").getCurrentWindow();return {mobile:app.isMobile,bounds:w.getBounds(),minimum:w.getMinimumSize(),layout:app.workspace.getLayout(),markdownFiles:app.vault.getMarkdownFiles().length}})())');
  originalSettings = evaluate('JSON.stringify(app.plugins.plugins["k-plex"].settings)'); report.baseline = baseline;
  cli("dev:errors", "clear"); if (baseline.mobile) { cli("eval", "code=app.emulateMobile(false)"); await ready(); }
  await desktopProbe(); await cleanupController();
  cli("eval", "code=app.emulateMobile(true)"); await ready(); await deviceProbe(900, 875, "tablet"); await deviceProbe(390, 844, "phone");
  report.status = "passed";
} catch (error) { report.status = "failed"; report.error = String(error); }
finally {
  try {
    await cleanupController();
    if (baseline) {
      if (evaluate('JSON.stringify(app.isMobile)') !== baseline.mobile) { cli("eval", `code=app.emulateMobile(${baseline.mobile})`); await ready(); }
      evaluate(`(async()=>{const p=app.plugins.plugins["k-plex"];p.settings=${JSON.stringify(originalSettings)};await p.saveSettings(false,false);await p.actionPreferenceQueue;await p.settingsWriteQueue;const w=require("@electron/remote").getCurrentWindow();w.setMinimumSize(${baseline.minimum[0]},${baseline.minimum[1]});w.setBounds(${JSON.stringify(baseline.bounds)});await app.workspace.changeLayout(${JSON.stringify(baseline.layout)});await p.actionPreferenceQueue;await p.settingsWriteQueue;return JSON.stringify(true)})()`);
      await delay(200);
      report.cleanup = evaluate('JSON.stringify((()=>{const p=app.plugins.plugins["k-plex"],w=require("@electron/remote").getCurrentWindow();return {mobile:app.isMobile,bounds:w.getBounds(),minimum:w.getMinimumSize(),controllerRemoved:!window.__kplexDisplayModesProbe,overlayCount:document.querySelectorAll(".kplex-fullscreen-overlay,.kplex-fullscreen-anchor").length,markdownFiles:app.vault.getMarkdownFiles().length,layout:app.workspace.getLayout(),settings:p.settings}})())');
      assert.equal(report.cleanup.mobile, baseline.mobile); assert.deepEqual(report.cleanup.bounds, baseline.bounds); assert.deepEqual(report.cleanup.minimum, baseline.minimum);
      for (const key of ["main", "left", "right", "floating"]) assert.deepEqual(report.cleanup.layout[key], baseline.layout[key], `Native ${key} layout was not restored`);
      assert.equal(report.cleanup.markdownFiles, baseline.markdownFiles); assert(report.cleanup.controllerRemoved && report.cleanup.overlayCount === 0); assert.deepEqual(report.cleanup.settings, originalSettings);
    }
  } catch (error) { report.status = "failed"; report.cleanupError = String(error); }
  try {
    for (const item of configuration) { if (item.bytes) writeFileSync(item.path, item.bytes); else if (existsSync(item.path)) unlinkSync(item.path); assert(item.bytes ? readFileSync(item.path).equals(item.bytes) : !existsSync(item.path), "Original configuration bytes not restored"); }
    report.configurationBytesRestored = true;
  } catch (error) { report.status = "failed"; report.configurationRestoreError = String(error); }
  try { report.nativeErrors = cli("dev:errors"); assert(!report.nativeErrors || /^No errors captured\.?$/i.test(report.nativeErrors), report.nativeErrors); } catch (error) { report.status = "failed"; report.nativeErrorFailure = String(error); }
  report.completedAt = new Date().toISOString(); writeFileSync(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify({ status: report.status, error: report.error, cleanupError: report.cleanupError, report: join(output, "report.json") }));
if (report.status !== "passed") process.exitCode = 1;
