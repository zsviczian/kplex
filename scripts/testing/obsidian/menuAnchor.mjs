/**
 * Exact-build native acceptance for action-dispatched toolbar menus in the explicit disposable
 * small vault. Trusted Electron input exercises the real React buttons and Obsidian DOM Menu;
 * a forwarding observer selects that inspectable backend without changing coordinates or actions.
 * The probe restores workspace, settings, modes, follow owners and wrappers even after failure.
 * OS-native menu rendering and physical-device touch remain separate acceptance environments.
 */
import {withNativeDocumentSessions} from "./nativeDocumentSessions.mjs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { release } from "node:os";
import { obsidianCliExecutable, spawnNativeSync } from "./processTools.mjs";
import { validateTarget } from "./runner.mjs";

const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName, "kplex-test-small", "Select the disposable small vault explicitly");
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const output = process.env.KPLEX_HOST_REPORT_DIR;
assert(output && (!existsSync(output) || !readdirSync(output).length), "Choose a fresh report directory");
mkdirSync(output, { recursive: true });
const configuration = [join(target.pluginDir, "data.json"), join(target.config, "community-plugins.json"), join(target.config, "app.json"), join(target.config, "workspace.json")]
  .filter(path => existsSync(path)).map(path => ({ path, bytes: readFileSync(path) }));
const report = { status: "running", startedAt: new Date().toISOString(), node: process.version,
  os: `${process.platform} ${release()}`, artifacts: {}, scenarios: [], limitations: ["Inspectable Obsidian DOM Menu backend; OS-native menu rendering and physical touch are not established."] };
writeFileSync(join(output, "driver-source.mjs"), readFileSync(fileURLToPath(import.meta.url)));

/** Bound native transport and reject renderer errors even if the launcher exits successfully. */
function cli(command, ...args) {
  const result = spawnNativeSync(obsidianCliExecutable(), [`vault=${vaultName}`, command, ...args],
    { cwd: root, encoding: "utf8", timeout: 30_000, killSignal: "SIGKILL", maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout)) throw result.error ?? Error(result.stderr || result.stdout);
  return result.stdout.trim();
}
/** Return only detached observations from the actual selected native renderer. */
function evaluate(code) {code=withNativeDocumentSessions(code); return JSON.parse(cli("eval", `code=${code}`).replace(/^=>\s*/, "")); }
/** Yield between bounded native controller observations. */
const delay = ms => new Promise(done => setTimeout(done, ms));

/** Own one cancellable native probe; no production instrumentation or note fixtures are needed. */
function probe() {
  const p = app.plugins.plugins["k-plex"], remote = require("@electron/remote"), mainWindow = remote.getCurrentWindow();
  if (!p?.actionManager || window.__kplexMenuAnchorProbe || document.querySelector(".modal-container,.menu")) throw Error("Clean native prerequisites required");
  const c = window.__kplexMenuAnchorProbe = { layout: app.workspace.getLayout(), settings: structuredClone(p.settings),
    owners: { documents:documentSessions(p).capture(), last: p.lastDocumentLeaf, recent: [...p.recentLeafHistory] },
    cases: [], calls: [], cancelled: false, done: false, originalMenu: p.showKplexMenuAtPosition };
  let leaf, root, surface, popDocument;
  /** Fence every assertion and continuation against external cleanup. */
  const check = (value, message) => { if (c.cancelled || !value) throw Error(message); };
  /** Yield the main application's native task queue without changing background throttling. */
  const wait = async ms => { check(true, "Retired probe"); await new Promise(done => window.setTimeout(done, ms)); check(true, "Retired probe"); };
  /** Bound readiness independently of transport deadlines. */
  const until = async (read, message) => { const end = Date.now() + 10_000; while (!read()) { check(Date.now() < end, message); await wait(30); } };
  /** Reacquire the exact migrated view and action generation. */
  const acquire = () => { root = leaf?.view.contentEl.querySelector(".kplex-app"); surface = [...p.actionSurfaceHosts].find(([, host]) => host.leaf === leaf)?.[0]; return Boolean(root && surface); };
  /** Deliver trusted input through this element's native owning window. */
  const click = async (element, blankCorner = false) => {
    check(element?.getClientRects().length, "Visible control required");
    // Native toolbar overflow can scroll after returning into a narrower tab group.
    element.scrollIntoView({ block: "nearest", inline: "nearest" }); await wait(30);
    const doc = element.ownerDocument, owner = doc.defaultView.require("@electron/remote").getCurrentWindow(), r = element.getBoundingClientRect();
    const x = Math.round(r.left + (blankCorner ? 10 : r.width / 2)), y = Math.round(r.top + (blankCorner ? 35 : r.height / 2));
    owner.show(); owner.focus(); owner.webContents.focus(); await until(() => doc.hasFocus(), "Input window not focused");
    const hit = doc.elementFromPoint(x, y);
    check(element.contains(hit), `Control obscured: ${JSON.stringify({ x, y, tag: hit?.tagName, classes: hit?.className, pane: { left: root.getBoundingClientRect().left, right: root.getBoundingClientRect().right } })}`);
    owner.webContents.sendInputEvent({ type: "mouseMove", x, y });
    owner.webContents.sendInputEvent({ type: "mouseDown", x, y, button: "left", clickCount: 1 });
    owner.webContents.sendInputEvent({ type: "mouseUp", x, y, button: "left", clickCount: 1 }); await wait(100);
  };
  /** Use the established raw-key/char transport; never synthesize a char after prevented keydown. */
  const key = async (doc, value) => {
    const owner = doc.defaultView.require("@electron/remote").getCurrentWindow(); let observed;
    owner.focus(); owner.webContents.focus();
    if (value === "Escape") {
      // The menu's earlier window-capture listener intentionally stops later observers.
      owner.webContents.sendInputEvent({ type: "keyDown", keyCode: value });
      owner.webContents.sendInputEvent({ type: "keyUp", keyCode: value }); await wait(100); return;
    }
    const record = event => { if (event.key === value) observed = event; };
    doc.defaultView.addEventListener("keydown", record, true);
    try {
      owner.webContents.sendInputEvent({ type: "keyDown", keyCode: value });
      await until(() => observed, "Native keydown absent"); check(observed.isTrusted, "Untrusted keyboard transport");
      // Electron raw keyDown omits the physical keyboard's char stage needed for button Enter.
      if (value === "Enter" && !observed.defaultPrevented) owner.webContents.sendInputEvent({ type: "char", keyCode: "\r" });
      owner.webContents.sendInputEvent({ type: "keyUp", keyCode: value }); await wait(100);
    } finally { doc.defaultView.removeEventListener("keydown", record, true); }
  };
  /** Freeze the state that opening and dismissing a menu must not alter. */
  const state = () => JSON.stringify({ sync: p.getDocumentSyncMode(leaf), sidecar: p.getSidecarPosition(leaf), history: p.settings.navigationHistory,
    linkedLeaf: p.documentSession(leaf)?.linkedDocumentLeaf?.id, sidecarLeaf: p.sidecarLeaves.get(leaf)?.id,
    modes: leaf.view.displayModes.getSnapshot(),
    center: root.querySelector(".kplex-role-center")?.dataset.kplexPath, semantic: p.index.getSemanticRevision() });
  /** Verify seed geometry, owner/leaf attribution, host viewport clamping and unchanged semantics. */
  const inspect = async (id, before, control, fallback = false) => {
    const doc = root.ownerDocument; await until(() => doc.querySelector(".menu"), `${id}: menu absent`);
    const call = c.calls.at(-1), b = control?.getBoundingClientRect(), pane = root.getBoundingClientRect(), menu = doc.querySelector(".menu").getBoundingClientRect();
    check(call.document === doc && call.leaf === leaf, `${id}: foreign menu owner`);
    const expectedX = fallback ? Math.min(pane.right - 1, Math.max(0, pane.left) + 40) : b.left;
    const expectedY = fallback ? Math.min(pane.bottom - 1, Math.max(0, pane.top) + 40) : Math.min(pane.bottom - 1, b.bottom + 4);
    check(Math.abs(call.position.x - expectedX) < 1 && Math.abs(call.position.y - expectedY) < 1, `${id}: stale or corner anchor`);
    check(menu.left >= -1 && menu.top >= -1 && menu.right <= doc.defaultView.innerWidth + 1 && menu.bottom <= doc.defaultView.innerHeight + 1, `${id}: menu outside viewport`);
    check(state() === before, `${id}: opening changed state`);
    await key(doc, "Escape"); await until(() => !doc.querySelector(".menu"), `${id}: Escape failed`);
    check(root.contains(doc.activeElement), `${id}: Escape lost owning Plex focus`);
    check(state() === before, `${id}: dismissal changed state`);
    c.cases.push({ id, status: "passed", position: call.position, control: b ? { left: b.left, bottom: b.bottom } : null,
      menu: { left: menu.left, top: menu.top, right: menu.right, bottom: menu.bottom }, owner: doc === document ? "main" : "popout" });
  };
  /** Restore ordinary application owners before removing test references and exact configuration bytes. */
  c.cleanup = () => { if (c.cleanupTask) return c.cleanupTask; c.cleanupTask = (async () => {
    c.cancelled = true; p.dismissKplexMenu(); p.showKplexMenuAtPosition = c.originalMenu;
    if (c.popWindow && !c.popWindow.isDestroyed() && c.popBounds) c.popWindow.setBounds(c.popBounds);
    if (leaf?.view.displayModes && c.modes) leaf.view.displayModes.setZen(c.modes.zen);
    Object.assign(p.settings, c.settings); await p.saveSettings(false, false); p.actionPublisher.sync(p.settings.actionPreferences);
    await app.workspace.changeLayout(c.layout);
    const original = app.workspace.getLeavesOfType("k-plex-react-view").find(item => item.id === c.leafId);
    if (original && c.modes) { const modes = original.view.displayModes; if (modes.getSnapshot().fullscreen !== c.modes.fullscreen) modes.toggleFullscreen(); modes.setZen(c.modes.zen); }
    await documentSessions(p).restore(c.owners.documents); p.lastDocumentLeaf = c.owners.last; p.recentLeafHistory = c.owners.recent;
    mainWindow.show(); mainWindow.focus(); mainWindow.webContents.focus(); c.calls.length = 0; c.cleaned = true;
  })(); return c.cleanupTask; };
  c.task = new Promise(done => window.setTimeout(done, 0)).then(async () => {
    remote.app.show?.(); remote.app.focus({ steal: true }); mainWindow.show(); mainWindow.focus(); mainWindow.webContents.focus();
    await until(() => document.hasFocus() && !document.hidden, "Main native window not foreground");
    leaf = app.workspace.getLeavesOfType("k-plex-react-view").find(item => item.view.contentEl.ownerDocument === document && p.isKplexLeafVisible(item));
    check(acquire(), "Rendered main Plex required"); await leaf.view.waitUntilReady();
    await until(() => root.querySelector(".kplex-role-center"), "Main center not rendered"); c.leafId = leaf.id; c.modes = leaf.view.displayModes.getSnapshot();
    if (c.modes.fullscreen) leaf.view.displayModes.toggleFullscreen(); leaf.view.displayModes.setZen(false); await wait(200);
    p.showKplexMenuAtPosition = function(menu, position, doc, owner) { c.calls.push({ position: { ...position }, document: doc, leaf: owner }); menu.setUseNativeMenu(false); return c.originalMenu.call(this, menu, position, doc, owner); };
    /** Exercise the real action-dispatched button, then independently verify host menu behavior. */
    const pointer = async (id, selector = "sync") => {
      const doc = leaf.view.contentEl.ownerDocument, owner = doc.defaultView.require("@electron/remote").getCurrentWindow();
      owner.show(); owner.focus(); owner.webContents.focus(); await wait(200);
      await until(() => acquire() && root.isConnected && root.querySelector(`[data-kplex-menu-trigger="${selector}"]`)?.getClientRects().length, `${id}: current visible control absent`);
      const control = root.querySelector(`[data-kplex-menu-trigger="${selector}"]`), before = state(); await click(control); await inspect(id, before, control);
    };
    await pointer("main-pointer");
    const control = root.querySelector('[data-kplex-menu-trigger="sync"]'); control.focus(); check(document.activeElement === control, "Sync button did not own keyboard focus");
    let before = state(); await key(document, "Enter"); await inspect("focused-button-enter", before, control);
    p.settings.actionPreferences.publishedCommands["view.sync.choose"] = true; p.actionPublisher.sync(p.settings.actionPreferences);
    before = state(); check(app.commands.executeCommandById("k-plex:kplex-action-view-sync-choose"), "Published sync command unavailable"); await inspect("published-command", before, control);
    for (let n = 0; n < 3; n++) await pointer(`rapid-reopen-${n}`);
    before = state(); await click(control); await until(() => document.querySelector(".menu"), "Outside-click menu absent");
    await click(root.querySelector(".kplex-plex"), true); await until(() => !document.querySelector(".menu"), "Outside click failed"); check(state() === before, "Outside dismissal changed state"); c.cases.push({ id: "outside-dismissal", status: "passed" });
    leaf.view.displayModes.setZen(true); await wait(100); before = state(); await p.actionManager.dispatch({ id: "view.sync.choose", source: "local-hotkey", surfaceId: surface });
    await inspect("hidden-toolbar-fallback", before, null, true); leaf.view.displayModes.setZen(false); await wait(100);
    if (!root.querySelector('[data-kplex-menu-trigger="sidecar-position"]')) { const outcome = await p.actionManager.dispatch({ id: "view.sidecar.toggle", source: "toolbar", surfaceId: surface }); check(outcome.status === "completed", "Sidecar setup failed"); }
    await until(() => root.querySelector('[data-kplex-menu-trigger="sidecar-position"]'), "Sidecar move control absent"); await wait(200); await pointer("sidecar-pointer", "sidecar-position");
    const mainParent = leaf.parent, mainRoot = root;
    await click(root.querySelector('[data-kplex-menu-trigger="sync"]')); await until(() => document.querySelector(".menu"), "Pre-migration main menu absent");
    app.workspace.moveLeafToPopout(leaf);
    await until(() => leaf.view.contentEl.ownerDocument !== document && leaf.view.contentEl.querySelector(".kplex-app") !== mainRoot, "Popout remount absent");
    await leaf.view.waitUntilReady(); await until(acquire, "Popout surface absent"); popDocument = root.ownerDocument;
    check(!document.querySelector(".menu"), "Retired main menu leaked"); c.cases.push({ id: "migration-retires-main-menu", status: "passed" });
    c.popWindow = popDocument.defaultView.require("@electron/remote").getCurrentWindow(); c.popBounds = c.popWindow.getBounds(); await wait(200); await pointer("popout-pointer");
    c.popWindow.setBounds({ ...c.popBounds, width: 500, height: 500 }); await wait(250); await pointer("narrow-popout-clamping");
    c.popWindow.setBounds(c.popBounds); await wait(200); await click(root.querySelector('[data-kplex-menu-trigger="sync"]'));
    await until(() => popDocument.querySelector(".menu"), "Pre-return popout menu absent");
    // Bounds are restored while the popout's remote proxy is live; do not call it after teardown.
    c.popWindow = null;
    // Obsidian may remove the original empty tab group after Sidecar setup/migration.
    // Return through an attached main-window root leaf, never a retained detached group.
    const mainParents = [];
    app.workspace.iterateRootLeaves(candidate => { if (candidate !== leaf && candidate.view.containerEl.isConnected && candidate.view.containerEl.ownerDocument === document) mainParents.push(candidate.parent); });
    const returnParent = mainParents.includes(mainParent) ? mainParent : mainParents[0]; check(returnParent, "Attached main-window destination absent");
    leaf.parent.removeChild(leaf); returnParent.insertChild(returnParent.children.length, leaf); await app.workspace.revealLeaf(leaf); app.workspace.setActiveLeaf(leaf, { focus: true });
    await until(() => leaf.view.contentEl.ownerDocument === document && leaf.view.contentEl.querySelector(".kplex-app")?.ownerDocument === document, "Main return absent");
    await leaf.view.waitUntilReady(); await until(acquire, "Returned action owner absent");
    await until(() => root.isConnected && root.querySelector('[data-kplex-menu-trigger="sync"]')?.getClientRects().length, "Returned toolbar not visible");
    await pointer("returned-main-pointer");
    check(!popDocument.querySelector(".menu"), "Retired popout menu leaked"); c.cases.push({ id: "retired-popout-owner", status: "passed" });
  }).then(() => { c.status = "passed"; }, error => { c.status = "failed"; c.error = String(error.stack ?? error); })
    .finally(async () => { try { await c.cleanup(); } catch (error) { c.status = "failed"; c.cleanupError = String(error.stack ?? error); } c.done = true; });
  return true;
}

try {
  assert.equal(cli("vault", "info=path").replace(/^path /, ""), target.vault); report.host = cli("version");
  for (const name of ["main.js", "styles.css", "manifest.json"]) { const built = readFileSync(join(root, "dist", name)), installed = readFileSync(join(target.pluginDir, name)); assert(built.equals(installed), `${name}: exact-build staging required`); report.artifacts[name] = createHash("sha256").update(installed).digest("hex"); }
  cli("dev:errors", "clear"); evaluate(`(${probe.toString()})()`); const end = Date.now() + 120_000; let result;
  do { await delay(300); result = evaluate("(()=>{const c=window.__kplexMenuAnchorProbe;return{done:c.done,status:c.status,error:c.error,cleanupError:c.cleanupError,cases:c.cases,cleaned:c.cleaned}})()"); if (result.done) break; assert(Date.now() < end, "Native menu acceptance deadline exceeded"); } while (true);
  report.scenarios = result.cases; report.cleaned = result.cleaned; assert.equal(result.status, "passed", result.error ?? result.cleanupError); assert.equal(result.cleaned, true);
  report.errors = cli("dev:errors"); assert(!report.errors || /^No errors captured\.?$/i.test(report.errors)); report.status = "passed";
} catch (error) { report.status = "failed"; report.error = String(error.stack ?? error); }
finally {
  try { evaluate("(async()=>{const c=window.__kplexMenuAnchorProbe;if(c)await c.cleanup();delete window.__kplexMenuAnchorProbe;return true})()"); } catch (error) { report.status = "failed"; report.cleanupError = String(error); }
  try { for (const item of configuration) { writeFileSync(item.path, item.bytes); assert(readFileSync(item.path).equals(item.bytes)); } report.configurationBytesRestored = true; } catch (error) { report.status = "failed"; report.configurationRestoreError = String(error); }
  report.finishedAt = new Date().toISOString(); writeFileSync(join(output, "menu-anchor-native.json"), JSON.stringify(report, null, 2));
  console.log(`${report.status}: ${report.scenarios.length} native menu scenarios; ${join(output, "menu-anchor-native.json")}`);
  if (report.status !== "passed") process.exitCode = 1;
}
