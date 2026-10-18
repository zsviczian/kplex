/**
 * Issue 126 exact-artifact desktop acceptance through native FileManager and K-Plex's actual
 * rename action/modal. Inspect synchronous retained incidence separately from settled DOM,
 * aliases and legitimately unresolved old-name links. Own only one disposable fixture subtree,
 * wrappers, settings and workspace; restore all of them even after an assertion failure.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { release } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { obsidianCliExecutable, spawnNativeSync } from "./processTools.mjs";
import { validateTarget } from "./runner.mjs";

const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName, "kplex-test-small", "Explicit disposable small vault required");
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const output = process.env.KPLEX_HOST_REPORT_DIR;
assert(output && (!existsSync(output) || !readdirSync(output).length), "Fresh report directory required");
mkdirSync(output, { recursive: true });
const driver = readFileSync(fileURLToPath(import.meta.url));
writeFileSync(join(output, "driver-source.mjs"), driver);
const configuration = [join(target.pluginDir, "data.json"), join(target.config, "community-plugins.json"), join(target.config, "app.json")]
  .map(path => ({ path, bytes: readFileSync(path) }));
const report = { status: "running", node: process.version, host: `${process.platform} ${release()}`,
  startedAt: new Date().toISOString(), driverSha256: createHash("sha256").update(driver).digest("hex"), artifacts: {}, observations: [] };

/** Bound transport and reject renderer errors even when the launcher exits successfully. */
function cli(command, ...args) {
  const result = spawnNativeSync(obsidianCliExecutable(), [`vault=${vaultName}`, command, ...args],
    { cwd: root, encoding: "utf8", timeout: 30_000, killSignal: "SIGKILL", maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout)) throw result.error ?? Error(result.stderr || result.stdout);
  return result.stdout.trim();
}
/** Read detached finite facts from the selected production renderer. */
function evaluate(code) { return JSON.parse(cli("eval", `code=${code}`).replace(/^=>\s*/, "")); }
/** Let the real renderer progress between bounded observations. */
const delay = ms => new Promise(done => setTimeout(done, ms));

/** Install one cancellable fixture/probe in the current plugin enable lifetime. */
function installProbe(mode) {
  const p = app.plugins.plugins["k-plex"], i = p?.index, folder = "__kplex_rename_identity_native";
  if (!i || window.__kplexRenameProbe || app.vault.getFolderByPath(folder) || document.querySelector(".modal-container,.menu")) throw Error("Clean native prerequisites required");
  const c = window.__kplexRenameProbe = { settings: structuredClone(p.settings), layout: app.workspace.getLayout(),
    owners: { linked: p.linkedDocumentLeaf, last: p.lastDocumentLeaf, recent: [...p.recentLeafHistory], sidecars: [...p.sidecarLeaves] },
    links: app.vault.getConfig("alwaysUpdateLinks"), mode, observations: [], renameFailures: [], releases: [], retiredPaths: [], owned: false, done: false, cancelled: false };
  /** Fail retired continuations before another host mutation. */
  const check = (value, message) => { if (c.cancelled || !value) throw Error(message); };
  /** Use ordinary owning-window timers without throttling changes. */
  const wait = ms => new Promise(done => window.setTimeout(done, ms));
  /** Bound readiness separately from CLI process deadlines. */
  const until = async (read, message) => { const end = Date.now() + 60_000; while (!read()) { check(Date.now() < end, message); await wait(50); } };
  /** Reacquire the actual plugin after warm enable; never keep an index across reload. */
  const plugin = () => app.plugins.plugins["k-plex"];
  /** Open an owned visible view and wait for its real navigation listener. */
  c.view = async () => {
    const listeners = plugin().navigationListeners.size;
    c.leaf = app.workspace.getLeaf("tab"); await c.leaf.setViewState({ type: "k-plex-react-view", active: true });
    await app.workspace.revealLeaf(c.leaf); await c.leaf.view.waitUntilReady();
    await until(() => plugin().navigationListeners.size > listeners && plugin().index.get(c.a), "Requested center/navigation subscription not ready");
    plugin().notifyNavigation(c.a);
    await until(() => c.leaf.view.contentEl.querySelector(".kplex-role-center")?.dataset.kplexPath === c.a, "Actual Plex center missing");
  };
  /** Compare physical identity, retained source coordinates and current visible fixture nodes. */
  c.capture = async phase => {
    const raw = await app.vault.read(app.vault.getFileByPath(c.a));
    const index = plugin().index, neighbor = index.getNeighborhood(c.a).children;
    const nodes = neighbor.filter(item => item.page.path.startsWith(folder + "/")).map(item => ({ path: item.page.path,
      file: item.page.file?.path ?? null, name: item.page.name, title: index.titleFor(item.page), same: item.page.file === c.b }));
    const dom = [...c.leaf.view.contentEl.querySelectorAll("[data-kplex-path]")].filter(el => el.dataset.kplexPath.startsWith(folder + "/"))
      .map(el => ({ path: el.dataset.kplexPath, label: el.querySelector(".kplex-label")?.textContent ?? el.textContent }));
    check(nodes.every(node => !node.file || node.path === node.file), "Retained materialized coordinates disagree with native identity");
    c.observations.push({ mode, phase, physical: c.b.path, nodes, dom, raw,
      resolved: app.metadataCache.resolvedLinks[c.a], unresolved: app.metadataCache.unresolvedLinks[c.a],
      pinned: plugin().settings.pinnedNodes.filter(path => path.startsWith(folder + "/")),
      history: plugin().settings.navigationHistory.filter(path => path.startsWith(folder + "/")) });
  };
  /** Require settled filename/alias DOM independently from the synchronous index callback. */
  c.settle = async (phase, title) => {
    const current = plugin(); current.notifyNavigation(c.a);
    await until(() => current.index.getNeighborhood(c.a).children.some(item => item.page.file === c.b
      && item.page.path === c.b.path && current.index.titleFor(item.page) === title)
      && [...c.leaf.view.contentEl.querySelectorAll("[data-kplex-path]")].some(el => el.dataset.kplexPath === c.b.path && el.textContent.includes(title))
      && [...c.leaf.view.contentEl.querySelectorAll("[data-kplex-path]")].every(el => el.dataset.kplexPath === c.b.path
        || !c.retiredPaths.includes(el.dataset.kplexPath)), "Current native name/alias did not reach the visible graph: " + phase);
    await c.capture(phase);
    check(c.renameFailures.length === 0, "Synchronous rename invariant failed: " + JSON.stringify(c.renameFailures));
    check(app.vault.getFileByPath(c.b.path) === c.b, "Native file identity changed");
  };
  /** Restore independent probe resources before settings, notes and native follow owners. */
  c.cleanup = () => c.cleanupTask ??= (async () => {
    c.cancelled = true; await c.task;
    if (c.restoreRename) c.restoreRename();
    for (const release of c.releases.splice(0)) release();
    const current = plugin(); app.vault.setConfig("alwaysUpdateLinks", c.links);
    Object.assign(current.settings, c.settings); await current.saveSettings(false, false);
    if (c.owned) { const owned = app.vault.getFolderByPath(folder); if (owned) await app.vault.delete(owned, true); }
    await app.workspace.changeLayout(c.layout);
    const leaves = []; app.workspace.iterateAllLeaves(leaf => leaves.push(leaf));
    const rebind = old => old ? leaves.find(leaf => leaf.id === old.id) ?? null : null;
    current.linkedDocumentLeaf = rebind(c.owners.linked); current.lastDocumentLeaf = rebind(c.owners.last);
    current.recentLeafHistory = c.owners.recent.map(rebind).filter(Boolean); current.sidecarLeaves.clear();
    for (const [host, note] of c.owners.sidecars) { const h = rebind(host), n = rebind(note); if (h && n) current.sidecarLeaves.set(h, n); }
    if (c.settings.lastActivePath) current.notifyNavigation(c.settings.lastActivePath);
    await current.settingsWriteQueue; await current.index.sourceAcquisition.repository.flush();
  })();
  c.task = new Promise(done => window.setTimeout(done, 0)).then(async () => {
    const remote = require("@electron/remote"), win = remote.getCurrentWindow();
    if (require("node:process").platform === "darwin") remote.app.focus({ steal: true });
    win.show(); win.focus(); win.webContents.focus();
    // A plugin reload restores its view lazily; open the normal application before
    // requiring startup readiness rather than waiting on an unopened surface.
    await p.activateView();
    await until(() => document.hasFocus() && !document.hidden && !p.isStartupInitializing(), "Foreground/startup prerequisites missing");
    check(p.settings.indexingMode === mode, "Wrong real indexing mode");
    await app.vault.createFolder(folder); c.owned = true;
    await app.vault.createFolder(folder + "/Nested"); await app.vault.createFolder(folder + "/Other");
    c.a = folder + "/Origin.md"; c.b = await app.vault.create(folder + "/Old.md", "# Original\n");
    const child = p.settings.hierarchy.children[0]; check(child, "Configured child field required");
    const body = path => `---\n${child}: "[[${path.slice(0, -3)}]]"\n---\n[[${path.slice(0, -3)}]]\n`;
    const origin = await app.vault.create(c.a, body(c.b.path));
    await until(() => app.metadataCache.getFileCache(origin)?.links?.length, "Native property/body metadata missing");
    Object.assign(p.settings, { renderAlias: false, nameFields: "aliases,title", animationSpeed: 0, embedCentralNode: false,
      showFolderNodes: false, showTagNodes: false, renderSiblings: false, graphDepth: 1, applyPowerFilter: false });
    await p.setDocumentSyncMode("off"); await p.saveSettings();
    c.releases.push(i.acquireSemanticDemand(c.a)); await c.view(); await c.settle("initial", "Old");
    p.settings.pinnedNodes = [...p.settings.pinnedNodes, c.b.path]; p.settings.navigationHistory = [c.a, c.b.path];
    const rename = i.renameFile;
    i.renameFile = function(oldPath, file) {
      /** Capture only owned synthetic incidence when a failed observation needs owner attribution. */
      const ownerFacts = (select = false) => {
        const page = value => value ? { path: value.path, file: value.file?.path, same: value.file === c.b,
          aliases: [...value.aliases], neighbors: [...value.neighbours.values()].filter(item => item.target.path.startsWith(folder + "/"))
            .map(item => ({ path: item.target.path, file: item.target.file?.path, same: item.target.file === c.b })) } : null;
        return { maintenance: this.sourceAcquisition.getMaintenanceRevision(), local: this.usesLocalForeground(),
          canonical: [c.a, oldPath, file.path].map(path => page(this.state.pages.get(path))),
          selected: select ? page(this.semanticPage(c.a)) : null, scopes: [...this.semanticScopes.values()].filter(scope => scope.pagesByPath.has(c.a))
            .map(scope => ({ center: scope.centerPath, maintenance: scope.maintenanceRevision, retained: scope.retainedAfterRename,
              complete: [...scope.completePaths].filter(path => path.startsWith(folder + "/")),
              pages: [c.a, oldPath, file.path].map(path => page(scope.pagesByPath.get(path))) })) };
      };
      const before = file === c.b ? this.getNeighborhood(c.a).children.find(item => item.page.file === file)?.page : null;
      const beforeAliases = before ? [...before.aliases] : [];
      const knownTitle = file === c.b ? app.metadataCache.getFileCache(file)?.frontmatter?.title : null;
      const beforeOwners = file === c.b ? ownerFacts() : null;
      const result = rename.call(this, oldPath, file);
      if (file === c.b) {
        c.retiredPaths.push(oldPath, oldPath.slice(0, -3));
        const nodes = this.getNeighborhood(c.a).children.filter(item => item.page.file === file);
        const page = nodes[0]?.page, title = page ? this.titleFor(page) : null;
        const expected = !p.settings.renderAlias ? file.basename : p.settings.nameFields === "title"
          ? knownTitle : beforeAliases[0];
        const vaultSearch = this.search(file.basename, 100, "vault-files").some(hit => hit.file === file && hit.path === file.path);
        const observation = { mode, phase: "synchronous-rename", oldPath, path: file.path, title, expectedKnownTitle: expected ?? null,
          beforeAliases, afterAliases: page?.aliases ?? [], occurrences: nodes.length, vaultSearch };
        c.observations.push(observation);
        if (nodes.length !== 1 || page.path !== file.path || expected && title !== expected
          || JSON.stringify(beforeAliases) !== JSON.stringify(page.aliases) || !vaultSearch) {
          observation.owners = { before: beforeOwners, after: ownerFacts(true) }; c.renameFailures.push(observation);
        }
      }
      return result;
    };
    c.restoreRename = () => { i.renameFile = rename; };
    app.vault.setConfig("alwaysUpdateLinks", true);
    await app.fileManager.renameFile(c.b, folder + "/New.md"); await c.settle("native-file-manager-auto-links", "New");
    check(p.settings.pinnedNodes.includes(c.b.path) && p.settings.navigationHistory.includes(c.b.path), "Pins/history did not follow the renamed endpoint");
    await app.fileManager.processFrontMatter(c.b, fm => { fm.aliases = ["Stable alias"]; fm.title = "Stable title"; });
    p.settings.renderAlias = true; await p.saveSettings(false, false);
    await until(() => i.titleFor(i.get(c.b.path)) === "Stable alias", "Configured alias not acquired");
    await c.settle("alias-ready-before-modal", "Stable alias");
    p.notifyNavigation(c.b.path);
    await until(() => c.leaf.view.contentEl.querySelector(".kplex-role-center")?.dataset.kplexPath === c.b.path, "Rename action center missing");
    const surfaceId = [...p.actionSurfaceHosts].find(([, host]) => host.leaf === c.leaf)?.[0]; check(surfaceId, "Mounted action surface missing");
    const outcome = await p.actionManager.dispatch({ id: "node.rename", source: "context-menu", surfaceId, target: { kind: "center" } });
    check(outcome.status === "opened", "Real K-Plex rename action did not open");
    const modal = document.querySelector(".kplex-rename-note-modal"), input = modal?.querySelector("input"); check(input, "Native rename input missing");
    input.value = "Modal"; input.dispatchEvent(new Event("input", { bubbles: true })); modal.querySelector("button.mod-cta").click();
    await until(() => !document.querySelector(".kplex-rename-note-modal") && c.b.path === folder + "/Modal.md", "Actual rename modal did not save");
    await until(() => c.leaf.view.contentEl.querySelector(".kplex-role-center")?.dataset.kplexPath === c.b.path, "Renamed central node did not follow the native file");
    await c.settle("kplex-modal-alias-preserved", "Stable alias");
    await app.vault.modify(origin, body(c.b.path)); await c.settle("explicit-old-path-before-link-updates-off", "Stable alias");
    app.vault.setConfig("alwaysUpdateLinks", false); const previous = c.b.path;
    const beforeMove = await app.vault.read(origin);
    check(app.vault.getConfig("alwaysUpdateLinks") === false, "Native automatic-link preference did not switch off");
    let moved = false, moveError;
    const move = app.fileManager.renameFile(c.b, folder + "/Nested/Moved.md").then(() => { moved = true; }, error => { moveError = error; moved = true; });
    await until(() => moved || document.querySelector(".modal-container .modal-button-container"), "Native off-preference rename did not finish or prompt");
    if (!moved) {
      const buttons = [...document.querySelectorAll(".modal-container .modal-button-container button")];
      check(buttons.length === 3, "Expected the host's three-choice internal-link update prompt");
      buttons[2].click(); c.declinedLinkUpdatePrompt = true;
    }
    await move; if (moveError) throw moveError;
    await until(() => i.getNeighborhood(c.a).children.some(item => !item.page.file), "Supported unresolved old-name ghost missing");
    const afterMove = await app.vault.read(origin);
    c.observations.push({ mode, phase: "off-preference-raw-references", preference: app.vault.getConfig("alwaysUpdateLinks"),
      declinedPrompt: Boolean(c.declinedLinkUpdatePrompt), beforeMove, afterMove, previous });
    check(afterMove === beforeMove && beforeMove.includes(previous.slice(0, -3)), "Auto-links off unexpectedly rewrote fixture references");
    const duplicate = await app.vault.create(folder + "/Other/Moved.md", "# Independent\n");
    c.releases.push(i.acquireSemanticDemand(c.b.path), i.acquireSemanticDemand(duplicate.path));
    await until(() => i.get(c.b.path)?.file === c.b && i.get(duplicate.path)?.file === duplicate, "Requested duplicate basenames lost their independent native identities");
    p.notifyNavigation(c.a); await c.capture("auto-links-off-supported-ghost");
    app.vault.setConfig("alwaysUpdateLinks", true); await app.vault.modify(origin, body(c.b.path)); await c.settle("explicit-relink-after-move", "Stable alias");
    await app.fileManager.renameFile(c.b, folder + "/Nested/moved.md"); await c.settle("case-only", "Stable alias");
    p.settings.nameFields = "title"; await p.saveSettings(false, false); await c.settle("configured-title-before-repeat", "Stable title");
    await app.fileManager.renameFile(c.b, folder + "/Final.md"); await c.settle("repeat-move-title-preserved", "Stable title");
    p.settings.nameFields = "aliases,title"; await p.saveSettings(false, false); await c.settle("alias-restored-before-warm-enable", "Stable alias");
    c.restoreRename(); c.restoreRename = null; await i.sourceAcquisition.repository.flush();
  }).then(() => { c.done = true; }, error => { c.error = String(error.stack ?? error); c.done = true; });
  return true;
}

/** Observe the current task token without retaining pre-reload plugin objects. */
async function waitTask() {
  const end = Date.now() + 240_000;
  while (true) {
    const state = evaluate("JSON.stringify({done:window.__kplexRenameProbe?.done,error:window.__kplexRenameProbe?.error})");
    if (state.done) { assert(!state.error, state.error); return; }
    assert(Date.now() < end, "Native rename task deadline"); await delay(300);
  }
}
/** Restore the independently owned native resources before deleting the controller. */
async function cleanupProbe() {
  evaluate("JSON.stringify((()=>{const c=window.__kplexRenameProbe;c.cleanup().then(()=>c.cleaned=true,e=>{c.cleanupError=String(e.stack??e);c.cleaned=true});return true})())");
  const end = Date.now() + 60_000;
  while (true) {
    const state = evaluate("JSON.stringify({done:window.__kplexRenameProbe?.cleaned,error:window.__kplexRenameProbe?.cleanupError})");
    if (state.done) { assert(!state.error, state.error); break; }
    assert(Date.now() < end, "Native rename cleanup deadline"); await delay(250);
  }
  evaluate("JSON.stringify(delete window.__kplexRenameProbe)");
}
/** Run matched native enable operations and wait for the actual loaded instance. */
async function reload() {
  evaluate("JSON.stringify((()=>{window.__kplexRenameReload={done:false};app.plugins.disablePlugin('k-plex').then(()=>app.plugins.enablePlugin('k-plex')).then(()=>window.__kplexRenameReload.done=true,e=>{window.__kplexRenameReload.error=String(e);window.__kplexRenameReload.done=true});return true})())");
  const end = Date.now() + 60_000;
  while (true) {
    const state = evaluate("JSON.stringify(window.__kplexRenameReload)");
    if (state.done) { assert(!state.error, state.error); assert(evaluate("JSON.stringify(!!app.plugins.plugins['k-plex']?.index)")); break; }
    assert(Date.now() < end, "Native enable deadline"); await delay(250);
  }
  evaluate("JSON.stringify(delete window.__kplexRenameReload)");
}

let installed = false, settings;
try {
  assert.equal(cli("vault", "info=path").replace(/^path /, ""), target.vault); report.obsidian = cli("version"); cli("dev:errors", "clear");
  for (const name of ["main.js", "styles.css", "manifest.json"]) {
    const built = readFileSync(join(root, "dist", name)), actual = readFileSync(join(target.pluginDir, name));
    assert(built.equals(actual), `Installed ${name} mismatch`); report.artifacts[name] = createHash("sha256").update(actual).digest("hex");
  }
  settings = evaluate("JSON.stringify(app.plugins.plugins['k-plex'].settings)");
  for (const mode of ["on-demand", "eager"]) {
    evaluate(`JSON.stringify((()=>{const p=app.plugins.plugins['k-plex'];p.settings.indexingMode=${JSON.stringify(mode)};p.saveSettings(false,false);return true})())`);
    evaluate("JSON.stringify((()=>{window.__kplexRenameSaved=false;app.plugins.plugins['k-plex'].settingsWriteQueue.then(()=>window.__kplexRenameSaved=true);return true})())");
    const end = Date.now() + 30_000;
    while (!evaluate("JSON.stringify(window.__kplexRenameSaved)")) { assert(Date.now() < end); await delay(100); }
    evaluate("JSON.stringify(delete window.__kplexRenameSaved)"); await reload();
    evaluate(`JSON.stringify((${installProbe.toString()})(${JSON.stringify(mode)}))`); installed = true; await waitTask();
    await reload();
    evaluate("JSON.stringify((()=>{const c=window.__kplexRenameProbe;c.done=false;c.error=null;c.task=new Promise(done=>window.setTimeout(done,0)).then(async()=>{const p=app.plugins.plugins['k-plex'];c.releases.push(p.index.acquireSemanticDemand(c.a));await c.view();await c.settle('warm-reload','Stable alias');}).then(()=>c.done=true,e=>{c.error=String(e.stack??e);c.done=true});return true})())");
    await waitTask(); report.observations.push(...evaluate("JSON.stringify(window.__kplexRenameProbe.observations)"));
    await cleanupProbe(); installed = false;
  }
  report.nativeErrors = cli("dev:errors"); assert(!report.nativeErrors || /^No errors captured\.?$/i.test(report.nativeErrors), "Native JavaScript errors captured");
  report.status = "passed";
} catch (error) { report.status = "failed"; report.error = String(error.stack ?? error); }
finally {
  try {
    if (installed) {
      report.observations.push(...evaluate("JSON.stringify(window.__kplexRenameProbe.observations)")); await cleanupProbe();
    }
    if (settings) {
      evaluate(`JSON.stringify((()=>{const p=app.plugins.plugins['k-plex'];Object.assign(p.settings,${JSON.stringify(settings)});window.__kplexRenameRestored=false;p.saveSettings(false,false).then(()=>window.__kplexRenameRestored=true);return true})())`);
      const end = Date.now() + 30_000;
      while (!evaluate("JSON.stringify(window.__kplexRenameRestored)")) { assert(Date.now() < end); await delay(100); }
      evaluate("JSON.stringify(delete window.__kplexRenameRestored)");
      await reload();
    }
    report.cleaned = true;
  } catch (error) { report.status = "failed"; report.cleanupError = String(error.stack ?? error); }
  try {
    for (const item of configuration) {
      writeFileSync(item.path, item.bytes);
      assert(readFileSync(item.path).equals(item.bytes), "Original configuration bytes were not restored");
    }
    report.configurationBytesRestored = true;
  } catch (error) { report.status = "failed"; report.configurationRestoreError = String(error.stack ?? error); }
  report.finishedAt = new Date().toISOString(); writeFileSync(join(output, "rename-identity.json"), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
if (report.status !== "passed") process.exitCode = 1;
