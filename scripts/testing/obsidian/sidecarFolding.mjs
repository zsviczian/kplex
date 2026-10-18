/**
 * Exact-build native tab-group folding acceptance in the explicitly selected disposable small
 * vault. Reuses the CLI/target owners and actual commands, native tabs, display modes and input.
 * Owns temporary copies for native Markdown/drawing/PDF/Canvas transitions; existing notes remain
 * unchanged. Every case retains finite observations; cleanup restores layout/settings/configuration.
 * Renderer interruption/restart and physical-device acceptance are separate, explicit gates.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnNativeSync, obsidianCliExecutable } from "./processTools.mjs";
import { validateTarget } from "./runner.mjs";
import { runSidecarFoldingCases } from "./sidecarFoldingCases.mjs";
import { runSidecarFoldRoutingCases } from "./sidecarFoldingRoutingCases.mjs";
import { runSidecarFoldingLifecycleCases } from "./sidecarFoldingLifecycleCases.mjs";

const projectRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName, "kplex-test-small", "Select the authorized disposable small vault");
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const output = process.env.KPLEX_HOST_REPORT_DIR;
assert(output && (!existsSync(output) || !readdirSync(output).length), "Choose a fresh evidence directory");
mkdirSync(output, { recursive: true });
const source = readFileSync(fileURLToPath(import.meta.url));
writeFileSync(join(output, "driver-source.mjs"), source);
const helperHashes = {};
for (const name of ["sidecarFoldingCases.mjs", "sidecarFoldingRoutingCases.mjs", "sidecarFoldingLifecycleCases.mjs"]) {
  const bytes = readFileSync(fileURLToPath(new URL(name, import.meta.url)));
  writeFileSync(join(output, name), bytes); helperHashes[name] = createHash("sha256").update(bytes).digest("hex");
}
const configuration = ["plugins/k-plex/data.json", "community-plugins.json", "hotkeys.json", "workspace.json", "appearance.json"].map(
  /** Preserve exact disposable configuration, including an originally absent native hotkey file. */ name => {
    const path = join(target.config, name);
    return { path, bytes: existsSync(path) ? readFileSync(path) : null };
  });
const preparedFiles = ["04 Filter and focus/Filter and focus.md", "03 Build and edit/Excalidraw integration.md"].map(
  /** Retain original disposable fixture bytes in memory in case a companion autosaves on native open. */ path => {
    const absolute = join(target.vault, path); return { path, absolute, bytes: existsSync(absolute) ? readFileSync(absolute) : null };
  });
const report = { status: "running", startedAt: new Date().toISOString(), node: process.version,
  driverSha256: createHash("sha256").update(source).digest("hex"), helperHashes, artifacts: {}, scenarios: [],
  limitations: ["Native DOM and trusted Electron input are not physical touch, desktop tab dragging or multi-monitor acceptance.",
    "Saved native layout, plugin disable and selected-renderer interruption use the separate persistence driver; full application/process restart remains separate."] };

/** Invoke only the validated vault; zero-exit native error text remains a failure. */
function cli(command, ...args) {
  const result = spawnNativeSync(obsidianCliExecutable(), [`vault=${vaultName}`, command, ...args], {
    cwd: projectRoot, encoding: "utf8", timeout: 30000, killSignal: "SIGKILL", maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout)) throw result.error ?? Error(result.stderr || result.stdout);
  return result.stdout.trim();
}
/** Transfer detached finite observations; never retain native objects across reload. */
function evaluate(code) { return JSON.parse(cli("eval", `code=${code}`).replace(/^=>\s*/, "")); }
/** Keep polling outside the renderer; production timers and throttling remain untouched. */
function pause(milliseconds) { return new Promise(/** Yield one bounded driver interval. */ done => setTimeout(done, milliseconds)); }

/** Exercise actual host owners and native controls while retaining cleanup even after a failed assertion. */
function installProbe(extendedCases, routingCases, lifecycleCases) {
  const p = app.plugins.plugins["k-plex"], native = require("@electron/remote").getCurrentWindow();
  if (!p?.actionManager || window.__kplex173FoldProbe || app.setting.isOpen || document.querySelector(".modal-container .modal,.modal-container .prompt")) throw Error("Clean loaded native prerequisites required");
  const c = window.__kplex173FoldProbe = { done: false, scenarios: [], wrappers: [], layout: app.workspace.getLayout(), settings: structuredClone(p.settings),
    fileCount: app.vault.getFiles().length, markdownCount: app.vault.getMarkdownFiles().length, cancelled: false, createdLeaves: [], createdFiles: [] };
  const workspace = app.workspace;
  c.errorEvents = [];
  /** Attribute native errors to the current finite case without suppressing host error delivery. */
  c.onError = event => { if (c.errorEvents.length < 80) c.errorEvents.push({message: event.message, scenario: c.currentScenario, at: performance.now()}); };
  window.addEventListener("error", c.onError);
  let host, companion, sibling;
  /** Fail at the first violated native invariant without suppressing later cleanup. */
  const check = (condition, message) => { if (!condition) throw Error(message); };
  /** Yield normal native tasks; no production scheduling hook is changed. */
  const wait = milliseconds => new Promise(/** Resolve on this probe's owning window. */ done => window.setTimeout(done, milliseconds));
  /** Wait for an observable completion, honoring controller retirement at every poll. */
  const until = async (read, label, milliseconds = 15000) => {
    const deadline = Date.now() + milliseconds;
    while (!read()) { check(!c.cancelled && Date.now() < deadline, label); await wait(20); }
  };
  /** Resolve only the currently mounted native view's action registration. */
  const surface = leaf => [...p.actionSurfaceHosts].find(/** Exact leaf identity never substitutes another Plex. */ ([, owner]) => owner.leaf === leaf)?.[0];
  /** Native tab groups are the unit hidden by this feature. */
  const group = leaf => leaf.parent?.containerEl;
  /** Capture finite geometry without retaining DOM rectangles in evidence. */
  const box = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
  /** Select the host-owned session state independently of graph/React availability. */
  const folded = () => p.isPlexFoldedForSidecar(host);
  /** Inventory every native tab, preserving order and exact native identities. */
  const tabs = leaf => leaf.parent.children.map(/** File state is an opaque native UI payload, never note content. */ item => ({ id: item.id, state: item.getViewState() }));
  /** Wait for actual browser layout without assuming a timer means paint. */
  const frames = () => new Promise(/** Two owning frames settle native flex geometry. */ done => window.requestAnimationFrame(/** Wait for the next committed native frame. */ () => window.requestAnimationFrame(done)));
  /** Record a case only after all assertions succeed. */
  const scenario = async (id, action) => { c.currentScenario = id; await action(); c.scenarios.push({ id, status: "passed" }); };
  /** Create a fresh test Plex without confusing persisted workspace restoration with explicit Open.
   * The real initialization promise settles before restoring intent; no source owner is bypassed. */
  const openFreshPlex = async leaf => {
    const original = p.onKplexViewOpened, restoreIntent = p.settings.sidecarOpen;
    let initialized;
    /** Forward the exact host promise and receiver, recording only this fixture's initialization. */
    const replacement = function (...args) { const task = original.apply(this, args); if (args[0] === leaf) initialized = task; return task; };
    p.settings.sidecarOpen = false; p.onKplexViewOpened = replacement;
    try {
      await leaf.setViewState({type: "k-plex-react-view", active: false});
      await until(/** Ready DOM does not imply the asynchronous native initialization has settled. */ () => initialized, "Fresh Plex initialization did not begin");
      await initialized; await leaf.view.waitUntilReady();
    } finally { if (p.onKplexViewOpened === replacement) p.onKplexViewOpened = original; p.settings.sidecarOpen = restoreIntent; }
  };
  /** Forward a native method exactly and restore only this probe's installed wrapper. */
  const wrap = (owner, key, counts) => {
    const original = owner[key]; check(typeof original === "function", `Missing counter owner ${key}`);
    const descriptor = Object.getOwnPropertyDescriptor(owner, key);
    counts[key] = 0;
    /** Count calls without changing arguments, receiver, return or async timing. */
    const replacement = function (...args) { counts[key] = (counts[key] ?? 0) + 1; return original.apply(this, args); };
    owner[key] = replacement;
    c.wrappers.push(/** Preserve newer owners and restore inherited methods without adding own properties. */ () => { if (owner[key] === replacement) { if (descriptor) Object.defineProperty(owner, key, descriptor); else delete owner[key]; } });
  };
  /** Release call counters before test-owned workspace restoration can legitimately need indexing. */
  const releaseWrappers = () => { for (const release of c.wrappers.splice(0).reverse()) release(); };
  /** Execute the actually published native command and await this exact requested fold state. */
  const command = async expected => {
    check(app.commands.executeCommandById("k-plex:kplex-action-view-sidecar-collapse-plex"), "Published fold command unavailable");
    await until(/** No graph-ready condition substitutes for the fold owner. */ () => folded() === expected, `Command did not ${expected ? "fold" : "unfold"}`); await frames();
  };
  /** Deliver trusted renderer input only to an unobscured native recovery button. */
  const click = async button => {
    check(button?.isConnected, "Recovery control missing"); const doc = button.ownerDocument, win = doc.defaultView.require("@electron/remote").getCurrentWindow();
    win.show(); win.focus(); win.webContents.focus(); await until(/** Focus belongs to the button's actual window. */ () => doc.hasFocus() && win.isFocused(), "Recovery renderer not foreground");
    const r = button.getBoundingClientRect(), x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
    check(button.contains(doc.elementFromPoint(x, y)), "Recovery button obscured");
    const zoom = win.webContents.getZoomFactor(), nativeX = Math.round(x * zoom), nativeY = Math.round(y * zoom);
    win.webContents.sendInputEvent({ type: "mouseMove", x: nativeX, y: nativeY });
    win.webContents.sendInputEvent({ type: "mouseDown", x: nativeX, y: nativeY, button: "left", clickCount: 1 });
    win.webContents.sendInputEvent({ type: "mouseUp", x: nativeX, y: nativeY, button: "left", clickCount: 1 }); await frames();
  };
  /** Create native-content fixtures only after clean-work assertions; companion autosaves may alter these owned copies. */
  const prepareFiles = async () => {
    const folder = "__kplex173_fold_native";
    check(!app.vault.getFolderByPath(folder), "Native content fixture destination already exists");
    const drawing = app.vault.getFileByPath("03 Build and edit/Excalidraw integration.md");
    check(drawing, "Prepared disposable drawing source is absent");
    await app.vault.createFolder(folder); c.createdFolder = folder;
    /** Track each successfully created fixture before starting the next native operation. */
    const created = file => { c.createdFiles.push(file); return file; };
    const markdown = created(await app.vault.create(`${folder}/Note.md`, "# Folding validation\n\nDisposable native content.\n"));
    const drawingCopy = created(await app.vault.create(`${folder}/Drawing.md`, await app.vault.read(drawing)));
    const canvas = created(await app.vault.create(`${folder}/Canvas.canvas`, JSON.stringify({ nodes: [], edges: [] })));
    const content = "BT /F1 12 Tf 72 720 Td (K-Plex fold validation) Tj ET\n";
    const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
      `<< /Length ${content.length} >>\nstream\n${content}endstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
    let pdf = "%PDF-1.4\n"; const offsets = [0];
    for (let index = 0; index < objects.length; index++) { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`; }
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const pdfFile = created(await app.vault.createBinary(`${folder}/Document.pdf`, new TextEncoder().encode(pdf).buffer));
    await until(/** Native companion recognition comes from its ordinary metadata owner. */ () => app.plugins.plugins["obsidian-excalidraw-plugin"]?.isExcalidrawFile(drawingCopy), "Copied drawing metadata did not settle");
    c.foldPreparedFiles = { markdown, drawing: drawingCopy, canvas, pdf: pdfFile };
    return c.foldPreparedFiles;
  };
  /** Restore native content, selected tabs and preferences without deleting any note or original leaf. */
  c.cleanup = async () => {
    c.cancelled = true; await c.task; releaseWrappers(); window.removeEventListener("error", c.onError);
    for (const owner of [...p.collapsedPlexHosts.keys()]) p.restorePlexFoldBeforeReveal(owner);
    p.sidecarLeaves.clear(); p.linkedDocumentLeaf = null; Object.assign(p.settings, structuredClone(c.settings));
    await workspace.setLayout(c.layout); await p.saveSettings(false, false); p.actionPublisher.sync(p.settings.actionPreferences);
    for (const file of c.createdFiles.reverse()) if (app.vault.getFileByPath(file.path) === file) await app.vault.delete(file, true);
    if (c.createdFolder) { const folder = app.vault.getFolderByPath(c.createdFolder); check(!folder || folder.children.length === 0, "Fixture cleanup encountered unowned content"); if (folder) await app.vault.delete(folder, true); }
    await frames(); workspace.requestSaveLayout(); await workspace.requestSaveLayout.run();
    c.cleanupResult = { fileCount: app.vault.getFiles().length, markdownCount: app.vault.getMarkdownFiles().length,
      folds: p.collapsedPlexHosts.size, controls: document.querySelectorAll(".kplex-sidecar-unfold-plex").length, layout: workspace.getLayout(),
      settingsEqual: JSON.stringify(p.settings) === JSON.stringify(c.settings), wrappers: c.wrappers.length };
  };
  c.task = (/** Run the bounded matrix serially; each transition uses the production owner. */ async () => {
    native.show(); native.focus(); native.webContents.focus();
    await frames();
    if (!workspace.getLeavesOfType("k-plex-react-view").length) check(app.commands.executeCommandById("k-plex:kplex-start"), "Native fixture open command unavailable");
    await until(/** The public open command returns before native asynchronous leaf creation finishes. */ () => {
      host = workspace.getLeavesOfType("k-plex-react-view")[0]; return Boolean(host);
    }, "Existing native Plex required");
    await host.view.waitUntilReady(); check(surface(host), "Current action surface required");
    check(p.sidecarLeaves.size === 0 && p.collapsedPlexHosts.size === 0, "Start without managed companions/folds");
    const page = p.index.get(p.settings.lastActivePath); check(page?.file, "An existing physical center is required");
    p.settings.sidecarPosition = "right"; await p.openSidecar(host, page); companion = p.sidecarLeaves.get(host); check(companion, "Normal Sidecar did not open");
    sibling = workspace.createLeafInParent(companion.parent, companion.parent.children.length); c.createdLeaves.push(sibling);
    await sibling.setViewState({ type: "empty", active: false });
    const desired = structuredClone(p.settings.actionPreferences); desired.publishedCommands["view.sidecar.collapse-plex"] = true; await p.updateActionPreferences(desired);
    workspace.setActiveLeaf(host, { focus: true }); await frames();
    await until(/** Establish a quiet local graph before no-work assertions. */ () => p.getIndexStatus().upToDate, "Initial local graph is not settled", 60000);
    await until(/** Existing startup attachment guards must finish before explicit claim/release cases. */ () => !p.startupInitializing && !p.sidecarMovingHosts.has(host), "Native Sidecar startup ownership has not settled");
    c.before = { hostTabs: tabs(host), companionTabs: tabs(companion), host: box(group(host)), companion: box(group(companion)), center: p.settings.lastActivePath, history: [...p.settings.navigationHistory] };
    await scenario("published-command-toggle-and-focus", async () => {
      await command(true); check(group(host).getBoundingClientRect().width === 0, "Host group remains visible");
      check(workspace.activeLeaf === sibling, "Fold did not honor the surviving group's current New tab");
      check(JSON.stringify(tabs(host)) === JSON.stringify(c.before.hostTabs), "Host tabs/order/content changed");
      check(JSON.stringify(tabs(companion)) === JSON.stringify(c.before.companionTabs), "Companion tabs/order/content changed");
      await command(false); check(workspace.activeLeaf === host, "Explicit unfold did not focus its Plex");
      check(Math.abs(box(group(host)).width - c.before.host.width) < 3, "Round trip lost original split share");
    });
    await scenario("surviving-sibling-and-group-owned-control", async () => {
      await command(true); workspace.setActiveLeaf(sibling, { focus: true }); await frames();
      const button = group(companion).querySelector(".kplex-sidecar-unfold-plex");
      check(button && p.sidecarLeaves.get(host) === companion && folded(), "Sibling selection changed ownership/fold");
      check(button.getAttribute("aria-label") && !button.hasAttribute("title"), "Recovery accessible name/tooltip mismatch");
      await click(button); await until(/** The native button restores the same host owner. */ () => !folded(), "Recovery click did not unfold");
    });
    await scenario("native-pins-survive-fold-unfold", async () => {
      const pinned = [host.getViewState().pinned ?? false, companion.getViewState().pinned ?? false];
      try {
        host.setPinned(true); companion.setPinned(true); workspace.setActiveLeaf(host, {focus: true});
        await command(true); await command(false);
        check(host.getViewState().pinned && companion.getViewState().pinned, "Fold changed native pin state");
      } finally { host.setPinned(pinned[0]); companion.setPinned(pinned[1]); }
    });
    await scenario("hidden-sibling-activation-restores-without-redirection", async () => {
      const other = host.parent.children.find(/** A sibling native tab must retain its own activation intent. */ leaf => leaf !== host);
      check(other, "Opening fixture requires a host-group sibling"); await command(true); workspace.setActiveLeaf(other, { focus: true });
      await until(/** Native active-leaf-change may be delivered after the selected-tab model changes. */ () => !folded(), "Hidden sibling activation did not restore its group"); await frames();
      c.hiddenSibling = { folded: folded(), requested: other.id, active: workspace.activeLeaf?.id, width: box(group(host)).width };
      check(!folded() && workspace.activeLeaf === other && box(group(host)).width > 8, `Hidden sibling activation remained hidden or redirected: ${JSON.stringify(c.hiddenSibling)}`);
    });
    await scenario("sync-off-and-recent-restore-before-release", async () => {
      for (const mode of ["off", "recent"]) {
        if (!p.sidecarLeaves.has(host)) { workspace.setActiveLeaf(host, { focus: true }); await p.attachAdjacentSidecar(host, "to-plex"); }
        check(p.sidecarLeaves.get(host) === companion, "Explicit reattachment did not recover original managed file");
        await command(true); await p.setDocumentSyncMode(mode); await frames();
        check(!folded() && !p.sidecarLeaves.has(host) && p.leafIsAttached(companion) && p.leafIsAttached(sibling), `${mode} left a fold or closed content`);
        workspace.setActiveLeaf(companion, { focus: true }); await frames();
      }
    });
    workspace.setActiveLeaf(companion, { focus: true }); await frames(); await p.attachAdjacentSidecar(host, "to-plex");
    await scenario("fullscreen-and-zen-share-one-restore-owner", async () => {
      check(p.sidecarLeaves.get(host) === companion, "Fullscreen prerequisite association missing");
      const modes = host.view.displayModes; modes.setZen(true); modes.toggleFullscreen(); await frames();
      await p.collapsePlexForSidecar(host); await frames();
      check(folded() && !modes.getSnapshot().fullscreen && modes.getSnapshot().zen && !document.querySelector(".kplex-fullscreen-overlay"), "Fold/fullscreen owners conflict");
      await command(false); modes.setZen(false);
    });
    await scenario("recovery-without-graph-lookup", async () => {
      await command(true); const original = p.index.get;
      /** A host-only recovery action must not consult even a temporarily unavailable graph. */
      p.index.get = () => { throw Error("Fold recovery attempted graph lookup"); };
      let prepared;
      try {
        check(app.commands.commands["k-plex:kplex-action-view-sidecar-collapse-plex"].checkCallback(true), "Recovery check requires graph data");
        prepared = p.actionManager.prepare({ id: "view.sidecar.collapse-plex", source: "obsidian-command" });
        check(prepared.state === "accepted", "Host recovery preparation requires graph data");
      } finally { p.index.get = original; }
      // Visible graph rendering may legitimately query its existing page; the recovery owner itself
      // must accept intent without that page. Restoring the read port avoids poisoning React work.
      const outcome = await prepared.run(); check(outcome.status === "completed" && !folded(), "Prepared host recovery did not unfold"); await frames();
    });
    await scenario("fold-transition-is-presentation-only", async () => {
      await until(/** Exclude legitimate backlog catch-up before the clean no-work interval. */ () => p.getIndexStatus().upToDate, "Clean graph prerequisite missing", 60000);
      const counts = {}; for (const key of ["invalidateSemanticPolicy", "refreshSemanticSettings", "rebuild", "patchMarkdownPaths", "restoreSnapshot", "waitForSnapshotHydration"]) if (typeof p.index[key] === "function") wrap(p.index, key, counts);
      for (const key of ["read", "cachedRead", "modify", "create"]) wrap(app.vault, key, counts);
      workspace.iterateAllLeaves(/** Native file opens are counted across the finite current workspace, not only the managed tab. */ leaf => { wrap(leaf, "openFile", counts); });
      try { await command(true); await command(false); await frames(); check(Object.values(counts).every(/** Every observed acquisition/write counter must stay zero. */ value => value === 0), `Fold caused source work: ${JSON.stringify(counts)}`); c.cleanTransitionCounts = counts; }
      finally { releaseWrappers(); }
      check(p.settings.lastActivePath === c.before.center && JSON.stringify(p.settings.navigationHistory) === JSON.stringify(c.before.history), "Toggle changed center/history");
    });
    const ports = { p, workspace, c, page, check, until, frames, wait, command, click, scenario, prepareFiles, openFreshPlex,
      getHost: /** Reacquire the native host after layout/migration work. */ () => host,
      setHost: /** A recreated native view retains explicit driver ownership. */ leaf => { host = leaf; },
      getCompanion: /** Orientation moves replace only the managed native leaf. */ () => companion,
      setCompanion: /** Keep later assertions bound to that actual replacement. */ leaf => { companion = leaf; },
      getSibling: /** The driver's owned New tab remains an unowned native sibling. */ () => sibling,
      setSibling: /** Preserve an explicit replacement rather than discovering another empty tab. */ leaf => { sibling = leaf; } };
    await routingCases(ports);
    // Fresh destructive fixtures precede Sidecar moves, whose existing one-shot pixel allocation
    // repair can otherwise leave subsequently created native branches without available width.
    await lifecycleCases(ports);
    await extendedCases(ports);
    await scenario("close-exact-companion-leaves-new-tab-unowned", async () => {
      await command(true); workspace.setActiveLeaf(sibling, { focus: true }); companion.detach(); await frames();
      check(!folded() && !p.sidecarLeaves.has(host) && workspace.activeLeaf === sibling && p.leafIsAttached(sibling), "Closing managed leaf stranded fold or adopted sibling");
    });
    c.final = { fileCount: app.vault.getFiles().length, markdownCount: app.vault.getMarkdownFiles().length, folds: p.collapsedPlexHosts.size };
  })().then(/** Preserve successful receipts until outer cleanup completes. */ () => { c.done = true; }, /** Retain the exact failed prerequisite without relabeling it as production behavior. */ error => { c.error = String(error.stack ?? error); c.done = true; });
  return JSON.stringify({ started: true });
}

let started = false;
try {
  assert.equal(cli("vault", "info=path"), target.vault); report.host = cli("version");
  for (const name of ["main.js", "styles.css", "manifest.json"]) {
    const built = readFileSync(join(projectRoot, "dist", name)), installed = readFileSync(join(target.pluginDir, name));
    assert(built.equals(installed), `Stage the exact build before this lane: ${name}`);
    report.artifacts[name] = createHash("sha256").update(built).digest("hex");
  }
  cli("dev:errors", "clear"); evaluate(`(${installProbe.toString()})(${runSidecarFoldingCases.toString()},${runSidecarFoldRoutingCases.toString()},${runSidecarFoldingLifecycleCases.toString()})`); started = true;
  const deadline = Date.now() + 240000;
  while (true) {
    const value = evaluate("JSON.stringify((()=>{const c=window.__kplex173FoldProbe;return {done:c?.done,error:c?.error,currentScenario:c?.currentScenario,scenarios:c?.scenarios,before:c?.before,final:c?.final,cleanTransitionCounts:c?.cleanTransitionCounts,routingFailure:c?.routingFailure,lifecycleFailure:c?.lifecycleFailure,errorEvents:c?.errorEvents}})())");
    Object.assign(report, value); if (value.done) { assert(!value.error, value.error); break; }
    assert(Date.now() < deadline, `Native folding deadline: ${value.currentScenario}`); await pause(250);
  }
  report.status = "passed";
} catch (error) { report.status = "failed"; report.error = String(error.stack ?? error); }
finally {
  try {
    started ||= evaluate("JSON.stringify(Boolean(window.__kplex173FoldProbe))");
    if (started) {
      evaluate("(()=>{const c=window.__kplex173FoldProbe;c.cleanup().then(()=>c.cleaned=true,error=>{c.cleanupError=String(error.stack??error);c.cleaned=true});return JSON.stringify(true)})()");
      const deadline = Date.now() + 60000;
      while (true) {
        const value = evaluate("JSON.stringify({done:window.__kplex173FoldProbe?.cleaned,error:window.__kplex173FoldProbe?.cleanupError,result:window.__kplex173FoldProbe?.cleanupResult})");
        if (value.done) { assert(!value.error, value.error); report.cleanup = value.result; break; }
        assert(Date.now() < deadline, "Native cleanup deadline"); await pause(100);
      }
      assert.equal(report.cleanup.folds, 0); assert.equal(report.cleanup.controls, 0); assert.equal(report.cleanup.wrappers, 0); assert(report.cleanup.settingsEqual);
      evaluate("JSON.stringify(delete window.__kplex173FoldProbe)");
    }
  } catch (error) { report.status = "failed"; report.cleanupError = String(error.stack ?? error); }
  try {
    report.preparedFileIntegrity = [];
    for (const item of preparedFiles) if (item.bytes) {
      const unchanged = existsSync(item.absolute) && readFileSync(item.absolute).equals(item.bytes);
      report.preparedFileIntegrity.push({ path: item.path, unchanged, openingSha256: createHash("sha256").update(item.bytes).digest("hex") });
      if (!unchanged) {
        // A companion's automatic file migration is not folding acceptance. Restore through the
        // selected Vault API after closing the temporary native representation, and fail the lane.
        evaluate(`(async()=>{const file=app.vault.getFileByPath(${JSON.stringify(item.path)});if(!file)throw Error("Prepared fixture disappeared");await app.vault.modify(file,${JSON.stringify(item.bytes.toString("utf8"))});return JSON.stringify(true)})()`);
        assert(readFileSync(item.absolute).equals(item.bytes), "Prepared fixture restoration failed");
        report.status = "failed"; report.preparedFileChanged = true;
      }
    }
  } catch (error) { report.status = "failed"; report.preparedFileRestoreError = String(error); }
  try {
    for (const item of configuration) {
      if (item.bytes) writeFileSync(item.path, item.bytes); else if (existsSync(item.path)) unlinkSync(item.path);
      assert(item.bytes ? readFileSync(item.path).equals(item.bytes) : !existsSync(item.path), "Configuration bytes changed");
    }
    report.configurationBytesRestored = true;
  } catch (error) { report.status = "failed"; report.configurationRestoreError = String(error); }
  try { report.nativeErrors = cli("dev:errors"); assert(/^No errors captured\.?$/i.test(report.nativeErrors), report.nativeErrors); }
  catch (error) { report.status = "failed"; report.nativeErrorFailure = String(error); }
  report.completedAt = new Date().toISOString(); writeFileSync(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify({ status: report.status, error: report.error, cleanupError: report.cleanupError, scenarios: report.scenarios.length, report: join(output, "report.json") }));
if (report.status !== "passed") process.exitCode = 1;
