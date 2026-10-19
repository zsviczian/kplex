/**
 * Exact-build issue 54 acceptance in the explicit disposable small vault. Native workspace
 * events exercise hidden sidebar follow, ordinary history motion and main-tab opening; the
 * synthetic pointer stream and computed stylesheet verify compact controls. This driver owns its
 * fixtures, workspace, temporary controller and settings and restores them after any failure.
 * Mobile note opening owns a drawer-dismiss transition; observe its completion before revealing again.
 * Desktop mobile emulation is layout/routing evidence, never physical Android/iOS acceptance.
 */
import {withNativeDocumentSessions} from "./nativeDocumentSessions.mjs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { release } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { obsidianCliExecutable, spawnNativeSync } from "./processTools.mjs";
import { validateTarget } from "./runner.mjs";

const projectRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName, "kplex-test-small", "Select the disposable small vault explicitly");
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const output = process.env.KPLEX_HOST_REPORT_DIR;
assert(output && (!existsSync(output) || !readdirSync(output).length), "Select a fresh report directory");
mkdirSync(output, { recursive: true });
const driver = readFileSync(fileURLToPath(import.meta.url));
writeFileSync(join(output, "driver-source.mjs"), driver);
const configuration = [join(target.pluginDir, "data.json"), join(target.config, "community-plugins.json")]
  .map(path => ({ path, bytes: readFileSync(path) }));
const report = { status: "running", node: process.version, host: `${process.platform} ${release()}`,
  startedAt: new Date().toISOString(), driverSha256: createHash("sha256").update(driver).digest("hex"),
  artifacts: {}, scenarios: [], limitations: ["DOM pointer events exercise the production touch handlers; no physical device, trusted touch, paint latency or screen-reader acceptance."] };

/** Reject native eval errors even if the console launcher reports exit status zero. */
function cli(command, ...args) {
  const result = spawnNativeSync(obsidianCliExecutable(), [`vault=${vaultName}`, command, ...args],
    { cwd: projectRoot, encoding: "utf8", timeout: 30_000, killSignal: "SIGKILL", maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout)) throw result.error ?? Error(result.stderr || result.stdout);
  return result.stdout.trim();
}
/** Detached observations avoid retaining renderer objects across host reloads. */
function evaluate(code) {code=withNativeDocumentSessions(code); return JSON.parse(cli("eval", `code=${code}`).replace(/^=>\s*/, "")); }
/** Short outer waits keep the renderer and CLI free to process native events. */
const delay = milliseconds => new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds));

/** Reacquire the actual plugin after mobile emulation reloads its owning renderer. */
async function ready() {
  const end = Date.now() + 120_000;
  while (true) {
    try { if (evaluate("JSON.stringify(Boolean(app.plugins.plugins['k-plex']?.actionManager))")) return; }
    catch { /* Native reload can briefly disconnect IPC; retry without resetting the vault. */ }
    assert(Date.now() < end, "Native mode reload did not load K-Plex"); await delay(500);
  }
}

/** Install a cancellable native probe after the exact plugin has loaded in its current host mode. */
function startProbe() {
  const p = app.plugins.plugins["k-plex"], remote = require("@electron/remote"), win = remote.getCurrentWindow();
  if (!p?.actionManager || window.__kplexSidebarFollow || app.setting.isOpen || document.querySelector(".modal-container,.menu")) throw Error("Clean native prerequisites required");
  const c = window.__kplexSidebarFollow = { settings: JSON.parse(JSON.stringify(p.settings)), layout: app.workspace.getLayout(),
    owners: { documents:documentSessions(p).capture(), last: p.lastDocumentLeaf, recent: [...p.recentLeafHistory], sidecars: new Map(p.sidecarLeaves) },
    bounds: win.getBounds(), minimum: win.getMinimumSize(), cases: [], observations: [], done: false, cancelled: false, owned: false };
  const folder = "__kplex_sidebar_follow_native";
  let host, root, surface, noteLeaf;
  /** Fence tasks against cleanup and turn failed native assertions into explicit report errors. */
  const check = (value, message) => { if (c.cancelled) throw Error("Retired sidebar probe"); if (!value) throw Error(message); };
  /** Yield to real host tasks without overriding background throttling. */
  const wait = async milliseconds => { check(true, "active"); await new Promise(done => window.setTimeout(done, milliseconds)); check(true, "active"); };
  /** Bound asynchronous host publication independently from CLI response lifetimes. */
  const until = async (read, message) => { const end = Date.now() + 15_000; while (!read()) { check(Date.now() < end, message); await wait(25); } };
  /** Native mobile dismissal can outlive openFile; await actual hidden geometry without an extra close/reopen or longer assertion deadline. */
  const waitForNoteDrawerDismissal = async () => {
    if (app.isMobile) await until(/** Observe the drawer's completed native dismissal. */ () => !p.isKplexLeafVisible(host), "Native phone drawer did not finish closing");
    else await wait(100);
  };
  /** Record only completed assertions, with finite serializable facts. */
  const passed = (id, details = {}) => c.cases.push({ id, status: "passed", ...details });
  /** Capture finite native ownership facts without exposing note bodies or mutating follow policy. */
  const observe = phase => c.observations.push({ phase, mode: p.getDocumentSyncMode(host), active: app.workspace.activeLeaf?.id,
    activeFile: app.workspace.getActiveFile()?.path, eligibleFile: p.getDocumentFollowFile()?.path,
    hostVisible: host ? p.isKplexLeafVisible(host) : false, center: center(), noteFile: noteLeaf?.view.file?.path,
    rootClass: root?.className, indexed: noteLeaf?.view.file ? Boolean(p.index.get(noteLeaf.view.file.path)) : false,
    indexedFileMatches: noteLeaf?.view.file ? p.index.get(noteLeaf.view.file.path)?.file === noteLeaf.view.file : false,
    preparation: p.index.getSemanticPreparationDiagnostics(),
    drawerCollapsed: app.workspace.rightSplit.collapsed,
    drawerGeometry: (() => { const el = app.workspace.rightSplit.containerEl, rect = el.getBoundingClientRect(), style = window.getComputedStyle(el);
      return { className: el.className, width: rect.width, height: rect.height, display: style.display, visibility: style.visibility }; })(),
    recent: p.recentLeafHistory.map(leaf => ({ id: leaf.id, type: leaf.getViewState().type, file: leaf.view.file?.path, visible: p.leafIsVisible(leaf) })) });
  /** Reacquire the registered sidebar surface and its actual current central DOM identity. */
  const acquire = () => {
    host = app.workspace.getLeavesOfType("k-plex-sidepanel-view")[0];
    root = host?.view.contentEl.querySelector(".kplex-app");
    surface = [...p.actionSurfaceHosts].find(([, entry]) => entry.leaf === host)?.[0];
    return Boolean(root && surface && root.querySelector(".kplex-plex"));
  };
  /** Reacquire the live App root because React may replace the loading surface during follow settlement. */
  const center = () => {
    root = host?.view.contentEl.querySelector(".kplex-app");
    return root?.querySelector(".kplex-role-center")?.dataset.kplexPath;
  };
  /** Deliver stationary touch contacts to the actual owning node/viewport pointer handlers. */
  const tap = async () => {
    check(p.isKplexLeafVisible(host), "Central touch prerequisite: sidebar must be visible");
    const node = root.querySelector(".kplex-role-center"), rect = node.getBoundingClientRect();
    const props = { bubbles: true, cancelable: true, pointerType: "touch", pointerId: 73, isPrimary: true,
      clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2, button: 0, buttons: 1 };
    node.dispatchEvent(new PointerEvent("pointerdown", props));
    node.dispatchEvent(new PointerEvent("pointerup", { ...props, buttons: 0 }));
    await wait(60);
  };
  /** Restore workspace/settings independently of assertion success and remove only owned fixtures. */
  c.cleanup = () => c.cleanupTask ??= (async () => {
    c.cancelled = true; await c.task;
    if (c.getOriginal) { p.index.get = c.getOriginal; c.getOriginal = null; }
    Object.assign(p.settings, c.settings); await p.saveSettings(false, false); p.index.notifyPresentation();
    if (c.owned) { const fixture = app.vault.getFolderByPath(folder); if (fixture) await app.vault.delete(fixture, true); c.owned = false; }
    win.setMinimumSize(...c.minimum); win.setBounds(c.bounds); await app.workspace.changeLayout(c.layout);
    const leaves = []; app.workspace.iterateAllLeaves(leaf => leaves.push(leaf));
    const rebind = old => old ? leaves.find(leaf => leaf.id === old.id) ?? null : null;
    await documentSessions(p).restore(c.owners.documents); p.lastDocumentLeaf = rebind(c.owners.last);
    p.recentLeafHistory = c.owners.recent.map(rebind).filter(Boolean); p.sidecarLeaves.clear();
    for (const [oldHost, oldNote] of c.owners.sidecars) { const newHost = rebind(oldHost), newNote = rebind(oldNote); if (newHost && newNote) p.sidecarLeaves.set(newHost, newNote); }
    if (c.settings.lastActivePath) p.notifyNavigation(c.settings.lastActivePath);
    c.cleaned = true;
  })();
  c.task = new Promise(done => window.setTimeout(done, 0)).then(async () => {
    remote.app.show?.(); remote.app.focus({ steal: true }); win.show(); win.focus(); win.webContents.focus();
    await until(() => document.hasFocus() && !document.hidden, "Foreground renderer required");
    await until(() => !p.isStartupInitializing(), "Native startup ownership did not settle");
    check(!app.vault.getFolderByPath(folder), "Fixture collision");
    await app.vault.createFolder(folder); c.owned = true;
    const files = [];
    for (const name of ["First", "Second", "Third"]) {
      const file = await app.vault.create(`${folder}/${name}.md`, `# ${name}\n`); files.push(file); p.index.insertCreatedFile(file);
    }
    p.settings.embedCentralNode = false; p.settings.animationSpeed = 1;
    p.settings.documentSyncMode="recent";
    noteLeaf = app.workspace.getLeaf("tab"); await noteLeaf.openFile(files[0], { active: true });
    await p.activateSidepanel(); await until(acquire, "Sidebar React/action surface absent");await p.setDocumentSyncMode(host,"recent");await noteLeaf.openFile(files[0],{active:true});
    await until(() => center() === files[0].path, "Initial native note did not center sidebar");
    app.workspace.rightSplit.collapse(); app.workspace.setActiveLeaf(noteLeaf, { focus: true });
    await until(() => !p.isKplexLeafVisible(host), "Native sidebar did not collapse");
    await noteLeaf.openFile(files[1], { active: true }); await wait(100);
    await noteLeaf.openFile(files[2], { active: true }); await wait(100);
    observe("hidden-after-rapid-notes");
    app.workspace.rightSplit.expand(); await app.workspace.revealLeaf(host);
    observe("immediate-reveal");
    await until(() => p.isKplexLeafVisible(host) && center() === files[2].path, "Sidebar reveal retained previous graph");
    passed("hidden-rapid-note-follow", { newest: files[2].path });
    check(!root.querySelector(".kplex-role-center").getAnimations().some(animation => animation.playState === "running"), "Automatic note follow animated stale center");
    passed("reveal-latest-center-without-arrival-motion");
    // Gate one exact lookup to model a native note arriving before the current index page.
    c.getOriginal = p.index.get;
    p.index.get = function(path) { return path === files[1].path ? undefined : c.getOriginal.call(this, path); };
    await noteLeaf.openFile(files[1], { active: true });
    await waitForNoteDrawerDismissal();
    app.workspace.rightSplit.expand(); await app.workspace.revealLeaf(host);
    await until(() => p.isKplexLeafVisible(host), "Pending-note drawer did not reveal");
    await until(() => {
      root = host.view.contentEl.querySelector(".kplex-app"); return root?.classList.contains("kplex-empty");
    }, "Pending native note retained stale scene");
    check(!root.querySelector(".kplex-role-center"), "Pending note still displayed an old central node");
    await noteLeaf.openFile(files[2], { active: true });
    await waitForNoteDrawerDismissal();
    app.workspace.rightSplit.expand(); await app.workspace.revealLeaf(host);
    await until(() => p.isKplexLeafVisible(host) && acquire() && center() === files[2].path, "Newer note failed to supersede pending note");
    p.index.get = c.getOriginal; c.getOriginal = null; p.index.notify(); await wait(100);
    check(center() === files[2].path, "Late lookup publication restored superseded native note");
    passed("pending-note-hides-stale-scene-and-newest-wins", { fault: "One exact page lookup temporarily unavailable; no cache/index schema modified" });
    // Explicit graph navigation stays deliberate even while its linked native tab is synchronized.
    p.notifyNavigation(files[0].path); await until(() => center() === files[0].path, "Explicit graph navigation absent");
    check(root.querySelector(".kplex-role-center").getAnimations().some(animation => animation.playState === "running"), "Explicit graph navigation lost arrival motion");
    await until(() => noteLeaf.view.file === files[0], "Graph navigation did not preserve recent native tab sync");
    passed("explicit-navigation-retains-native-sync");
    await wait(600);
    const back = await p.actionManager.dispatch({ id: "history.back", source: "toolbar", surfaceId: surface });
    check(back.status === "completed", "History action failed"); await until(() => center() === files[2].path, "History did not change central node");
    check(root.querySelector(".kplex-role-center").getAnimations().some(animation => animation.playState === "running"), "History navigation lost deliberate motion");
    passed("history-navigation-retains-arrival-motion");
    await wait(600); p.notifyNavigation(files[0].path); await until(() => center() === files[0].path, "Central opening setup did not navigate"); await wait(600);
    // Decouple so opening the central note is an explicit action, not passive synchronization.
    await documentSessions(p).off(); await noteLeaf.openFile(files[1], { active: true });
    await wait(400); app.workspace.rightSplit.expand(); await p.activateSidepanel();
    await until(() => p.isKplexLeafVisible(host), "Central touch drawer did not reveal");
    await wait(400); // Native drawer visibility precedes its final touch hit-test geometry.
    center();
    const beforeLeaves = app.workspace.getLeavesOfType("markdown").length;
    await tap(); await tap();
    await until(() => noteLeaf.view.file === files[0], "Central double tap did not reuse underlying main tab");
    check(app.workspace.getLeavesOfType("markdown").length === beforeLeaves, "Central opening created an unnecessary native tab");
    check(host.getViewState().type === "k-plex-sidepanel-view" && !p.sidecarLeaves.has(host), "Central opening replaced sidebar or created Sidecar");
    passed("central-double-pointer-tap-reuses-main-tab");
    await wait(400); app.workspace.rightSplit.expand(); await p.activateSidepanel();
    await until(() => p.isKplexLeafVisible(host), "Sidebar controls unavailable");
    const disclosure = root.querySelector(".kplex-layout-toggle"); disclosure.click();
    await until(() => root.querySelector(".kplex-layout-panel"), "Layout controls did not open");
    check(root.querySelector(".kplex-layout-controls").classList.contains("is-stacked"), "Compact sidebar did not stack controls");
    const labels = [...root.querySelectorAll(".kplex-density-heading")].map(heading => {
      const caption = heading.querySelector("span:not(.kplex-icon)"), style = caption && window.getComputedStyle(caption), rect = caption?.getBoundingClientRect();
      return { text: caption?.textContent?.trim(), visible: Boolean(rect?.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden") };
    });
    check(labels.length >= 7 && labels.every(label => label.text && label.visible), "Stacked layout rail captions missing");
    passed("stacked-layout-visible-captions", { labels });
    // Isolate the disposable vault's main root for the empty-workspace fallback, then restore its saved layout.
    const oldLayout = app.workspace.getLayout();
    const otherMain = [];
    app.workspace.iterateAllLeaves(leaf => { if (leaf !== host && leaf.getRoot() === app.workspace.rootSplit) otherMain.push(leaf); });
    for (const leaf of otherMain) leaf.detach();
    await wait(400); app.workspace.rightSplit.expand(); await p.activateSidepanel();
    await until(() => p.isKplexLeafVisible(host), "Empty-workspace drawer did not reveal");
    const outcome = await p.actionManager.dispatch({ id: "node.open", source: "internal", surfaceId: surface, target: { kind: "center" } });
    check(outcome.status === "completed", "Empty-workspace central open action unavailable");
    await until(() => app.workspace.getLeavesOfType("markdown").some(leaf => leaf.getRoot() === app.workspace.rootSplit && leaf.view.file === files[0]), "Central open did not create a main tab");
    check(host.getViewState().type === "k-plex-sidepanel-view", "Empty-workspace opening consumed sidebar");
    passed("central-open-creates-main-tab-when-empty");
    await app.workspace.changeLayout(oldLayout);
  }).then(() => { c.done = true; }, error => { observe("failure"); c.error = String(error?.stack ?? error); c.done = true; });
  return { installed: true };
}

let installed = false, baseline, modeChanged = false;
try {
  assert.equal(cli("vault", "info=path").replace(/^path /, ""), target.vault);
  report.obsidian = cli("version"); cli("dev:errors", "clear");
  for (const name of ["main.js", "styles.css", "manifest.json"]) {
    const built = readFileSync(join(projectRoot, "dist", name)), actual = readFileSync(join(target.pluginDir, name));
    assert(built.equals(actual), `Installed ${name} mismatch`); report.artifacts[name] = createHash("sha256").update(actual).digest("hex");
  }
  baseline = evaluate("JSON.stringify((()=>{const win=require('@electron/remote').getCurrentWindow();return {mobile:app.isMobile,layout:app.workspace.getLayout(),bounds:win.getBounds(),minimum:win.getMinimumSize()}})())");
  const emulate = process.env.KPLEX_SIDEBAR_EMULATE_PHONE === "true";
  report.emulatedPhone = emulate;
  if (emulate) {
    evaluate("JSON.stringify((()=>{const win=require('@electron/remote').getCurrentWindow();win.setMinimumSize(200,200);win.setContentSize(390,844);return true})())");
    if (!baseline.mobile) { modeChanged = true; cli("eval", "code=app.emulateMobile(true)"); await ready(); }
  }
  evaluate(`JSON.stringify((${startProbe.toString()})())`); installed = true;
  const end = Date.now() + 120_000;
  while (true) {
    const state = evaluate("JSON.stringify({done:window.__kplexSidebarFollow?.done,error:window.__kplexSidebarFollow?.error,cases:window.__kplexSidebarFollow?.cases,observations:window.__kplexSidebarFollow?.observations})");
    report.scenarios = state.cases ?? [];
    report.observations = state.observations ?? [];
    if (state.done) { if (state.error) throw Error(state.error); break; }
    assert(Date.now() < end, "Sidebar native probe deadline exceeded"); await delay(500);
  }
  report.nativeErrors = cli("dev:errors");
  assert(!report.nativeErrors || /^No errors captured\.?$/i.test(report.nativeErrors), "Captured native JavaScript errors");
  report.status = "passed";
} catch (error) { report.status = "failed"; report.error = String(error.stack ?? error); }
finally {
  if (installed) {
    try {
      evaluate("(()=>{const c=window.__kplexSidebarFollow;c.cleanup().then(()=>c.cleanupDone=true,error=>{c.cleanupError=String(error);c.cleanupDone=true});return JSON.stringify(true)})()");
      const end = Date.now() + 30_000;
      while (true) {
        const state = evaluate("JSON.stringify({done:window.__kplexSidebarFollow?.cleanupDone,error:window.__kplexSidebarFollow?.cleanupError})");
        if (state.done) { assert(!state.error, state.error); break; }
        assert(Date.now() < end, "Sidebar native cleanup deadline exceeded"); await delay(250);
      }
      evaluate("delete window.__kplexSidebarFollow;JSON.stringify(true)"); report.cleaned = true;
    } catch (error) { report.status = "failed"; report.cleanupError = String(error.stack ?? error); }
  }
  if (baseline) {
    try {
      if (modeChanged) { cli("eval", `code=app.emulateMobile(${baseline.mobile})`); await ready(); }
      evaluate(`JSON.stringify((()=>{const win=require('@electron/remote').getCurrentWindow();win.setMinimumSize(...${JSON.stringify(baseline.minimum)});win.setBounds(${JSON.stringify(baseline.bounds)});const c=window.__kplexSidebarModeCleanup={done:false};app.workspace.changeLayout(${JSON.stringify(baseline.layout)}).then(()=>c.done=true,error=>{c.error=String(error);c.done=true});return true})())`);
      const end = Date.now() + 30_000;
      while (true) {
        const state = evaluate("JSON.stringify(window.__kplexSidebarModeCleanup)");
        if (state.done) { assert(!state.error, state.error); break; }
        assert(Date.now() < end, "Native mode layout cleanup deadline exceeded"); await delay(250);
      }
      evaluate("delete window.__kplexSidebarModeCleanup;JSON.stringify(true)");
    } catch (error) { report.status = "failed"; report.modeCleanupError = String(error.stack ?? error); }
  }
  for (const item of configuration) writeFileSync(item.path, item.bytes);
  report.finishedAt = new Date().toISOString(); writeFileSync(join(output, "sidebar-follow.json"), JSON.stringify(report, null, 2));
}
console.log(`Sidebar follow ${report.status}; report: ${join(output, "sidebar-follow.json")}`);
if (report.error) console.error(report.error);
if (report.cleanupError) console.error(report.cleanupError);
if (report.status !== "passed") process.exitCode = 1;
