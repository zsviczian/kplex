/**
 * Issue 128 exact-artifact deletion/hidden-link acceptance in the explicitly selected small test
 * vault. Native Markdown files, FileManager writes/trash, confirmation DOM and source replay
 * establish behavior, including directional Hidden controls with preserved inverse inline links.
 * Only owned fixtures are mutated; settings/layout/raw configuration and
 * temporary native wrappers are restored independently of assertions. Device input is separate.
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
assert.equal(vaultName, "kplex-test-small", "Select the disposable small vault explicitly");
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const output = process.env.KPLEX_HOST_REPORT_DIR;
assert(output && (!existsSync(output) || !readdirSync(output).length), "Choose a fresh report directory");
mkdirSync(output, { recursive: true });
const driver = readFileSync(fileURLToPath(import.meta.url));
writeFileSync(join(output, "driver-source.mjs"), driver);
const configuration = [];
const report = { status: "running", node: process.version, platform: `${process.platform} ${release()}`,
  startedAt: new Date().toISOString(), driverSha256: createHash("sha256").update(driver).digest("hex"),
  artifacts: {}, cases: [], limitations: ["Native Windows DOM activation does not establish physical touch or every device/window lifecycle."] };

/** Keep CLI arguments shell-free and reject renderer errors even when the launcher exits zero. */
function cli(command, ...args) {
  const result = spawnNativeSync(obsidianCliExecutable(), [`vault=${vaultName}`, command, ...args],
    { cwd: root, encoding: "utf8", timeout: 30_000, killSignal: "SIGKILL", maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout)) throw result.error ?? Error(result.stderr || result.stdout);
  return result.stdout.trim();
}
/** Marshal only finite detached receipts rather than native files or index objects. */
function evaluate(code) { return JSON.parse(cli("eval", `code=${code}`).replace(/^=>\s*/, "")); }
/** Yield the driver process while native work proceeds in the selected foreground window. */
const delay = milliseconds => new Promise(done => setTimeout(done, milliseconds));

/** Install a disposable independently cancellable controller without production diagnostics. */
function installProbe() {
  let p = app.plugins.plugins["k-plex"];
  if (!p?.index || window.__kplexDeleteProbe || app.setting.isOpen || document.querySelector(".modal-container,.menu")) throw Error("Clean native prerequisites required");
  const folder = "__kplex_delete_cleanup_native";
  const c = window.__kplexDeleteProbe = { settings: structuredClone(p.settings), layout: app.workspace.getLayout(),
    owners: { linked: p.linkedDocumentLeaf?.id, last: p.lastDocumentLeaf?.id, recent: p.recentLeafHistory.map(leaf => leaf.id),
      sidecars: [...p.sidecarLeaves].map(([host, note]) => [host.id, note.id]) }, originalCount: app.vault.getMarkdownFiles().length,
    cases: [], warm: [], releases: [], restores: [], operations: new Set(), phase: "setup", done: false, cancelled: false, owned: false };
  /** Reject both assertions and continuations after this controller has been retired. */
  const check = (value, message) => { if (c.cancelled) throw Error("Retired delete probe"); if (!value) throw Error(message); };
  /** Retain normal renderer scheduling and use the main window's timer realm. */
  const wait = async milliseconds => { check(true, "active"); await new Promise(done => window.setTimeout(done, milliseconds)); check(true, "active"); };
  /** Await an authoritative finite outcome, with its specific diagnostic deadline. */
  const until = async (read, message) => { const end = Date.now() + 60_000; while (!read()) { check(Date.now() < end, message); await wait(40); } };
  /** Reacquire current plugin following a native disable/enable boundary. */
  const plugin = () => p = app.plugins.plugins["k-plex"];
  /** Record acceptance only after all native assertions for the scenario have completed. */
  const passed = (id, facts = {}) => c.cases.push({ id, status: "passed", ...facts });
  /** Retain in-flight production operations so failed assertions cannot race fixture teardown. */
  const track = task => {
    c.operations.add(task);
    task.then(() => c.operations.delete(task), () => c.operations.delete(task));
    return task;
  };
  /** Compare detached native property values without inheriting prototype setters. */
  const equal = (actual, expected, message) => check(JSON.stringify(actual) === JSON.stringify(expected), `${message}: ${JSON.stringify(actual)}`);
  /** Use each owned shell's real footer action; native Obsidian need not expose a header close icon. */
  const dismiss = modal => {
    const label = p.translator(modal.matches(".kplex-remaining-references-modal") ? "common.done" : "common.cancel");
    const button = [...modal.querySelectorAll("button")].find(element => element.textContent?.trim() === label);
    if (button) button.click();
    else if (modal.querySelector(".modal-content")?.childElementCount) throw Error("Owned native dismissal unavailable");
  };
  /** Close only dialogs introduced by this driver's production operations. */
  const closeReports = async () => {
    for (const modal of document.querySelectorAll(".kplex-remaining-references-modal")) {
      dismiss(modal);
    }
    await wait(30);
  };
  /** Read current native metadata and exclude Obsidian's own location bookkeeping. */
  const properties = file => Object.fromEntries(Object.entries(app.metadataCache.getFileCache(file)?.frontmatter ?? {})
    .filter(([key]) => key !== "position"));
  /** Compare Markdown body content outside YAML; native YAML serialization may change presentation. */
  const body = async file => {
    const text = await app.vault.read(file), range = await p.frontmatterDocumentLineRange(file);
    return range ? text.split(/\r?\n/).slice(range.end + 1).join("\n") : text;
  };
  /** Create bounded physical fixtures and demand their real source-backed pair publications. */
  const fixture = async (id, sources, physical = true) => {
    c.phase = id;
    const targetPath = `${folder}/${id}-target.md`, otherPath = `${folder}/${id}-other.md`;
    const targetFile = physical ? await app.vault.create(targetPath, `# ${id} target\n`) : null;
    const other = await app.vault.create(otherPath, "# Unrelated target\n");
    const result = { id, targetPath: physical ? targetPath : targetPath.slice(0, -3), targetFile, other, sources: [] };
    if (targetFile) p.index.insertCreatedFile(targetFile);
    p.index.insertCreatedFile(other);
    for (const [name, render] of sources) {
      const path = `${folder}/${id}-${name}.md`, file = await app.vault.create(path, render(result));
      p.index.insertCreatedFile(file); result.sources.push(file);
    }
    await until(() => result.sources.every(file => app.metadataCache.getFileCache(file)?.frontmatter), "Fixture native frontmatter missing");
    for (const file of result.sources) {
      c.releases.push(p.index.acquireSemanticDemand(file.path));
      await p.index.publishHostMetadataPreview(file.path);
      check(await p.index.prepareRelationshipPair(file.path, result.targetPath), `Fixture pair unavailable ${file.path}`);
    }
    await until(() => !p.index.hasPendingSemanticPreparation(), "Fixture source preparation pending");
    result.page = p.index.get(result.targetPath);
    check(result.page && result.page.file === targetFile, "Fixture endpoint lost exact native identity");
    result.original = new Map();
    for (const file of result.sources) result.original.set(file.path, { properties: structuredClone(properties(file)), body: await body(file), bytes: await app.vault.read(file) });
    return result;
  };
  /** Build native YAML containing only disposable exact target identities. */
  const yaml = (fields, text = "# Body retained\n") => `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n")}\n---\n${text}`;
  /** Drive one production confirmation's exact source/property selection rather than bypass consent. */
  const choose = (modal, file, field, value) => {
    const row = [...modal.querySelectorAll("[data-kplex-delete-field]")]
      .find(element => element.dataset.kplexDeleteField === field && element.dataset.kplexDeleteSource === file.path);
    const select = row?.querySelector("select[data-kplex-delete-choice]");
    check(select && [...select.options].some(option => option.value === value), `Missing native choice ${file.path}/${field}/${value}`);
    select.value = value; select.dispatchEvent(new Event("change", { bubbles: true }));
  };
  /** Observe the real async workflow while interacting with its native confirmation. */
  const deleteWithDialog = async (item, configure, cancel = false, center = false) => {
    let done = false, outcome, failure;
    const task = track(p.deleteNode(item.page, undefined, center).then(value => { outcome = value; done = true; }, error => { failure = error; done = true; }));
    await until(() => document.querySelector(".kplex-delete-node-modal") || done, "Delete confirmation never opened");
    const modal = document.querySelector(".kplex-delete-node-modal");
    check(modal, `Delete skipped fresh scope consent: ${JSON.stringify(outcome)}`);
    // Property overrides are now behind a native disclosure. Open it before using
    // those controls so acceptance exercises the current visible consent surface.
    const review = modal.querySelector("details");
    if (configure && review) review.open = true;
    c.lastChoices = [...modal.querySelectorAll("[data-kplex-delete-field]")].map(row => ({sourcePath:row.dataset.kplexDeleteSource,field:row.dataset.kplexDeleteField,choice:row.querySelector("select")?.value}));
    check(modal.textContent.includes(item.page.name), "Delete confirmation omitted target");
    if (configure) await configure(modal);
    if (cancel) dismiss(modal);
    else modal.querySelector("[data-kplex-delete-confirm]").click();
    await until(() => done, "Delete workflow did not finish"); await task;
    if (failure) throw failure;
    return outcome;
  };
  /** Restore temporary FileManager functions exactly once, independently of scenario failure. */
  const restoreWrappers = () => { for (const restore of c.restores.splice(0)) restore(); };
  /** Inject only an owned source's native write failure or awaited identity change. */
  const intercept = callback => {
    const owner = app.fileManager, original = owner.processFrontMatter;
    owner.processFrontMatter = async function(file, update, ...rest) { await callback(file); return original.call(this, file, update, ...rest); };
    c.restores.push(() => owner.processFrontMatter = original);
  };
  /** Ensure the surviving body was never rewritten by deletion or hidden association. */
  const bodiesUnchanged = async item => {
    for (const file of item.sources) equal(await body(file), item.original.get(file.path).body, `Body changed in ${file.path}`);
  };
  /** Exercise real connector consent, its changing direction, and the selected note's canonical result. */
  const hideFromContext = async (item, cancel = false, saveInTarget = false) => {
    const menuOwner = p, originalMenu = menuOwner.showKplexMenuAtPosition;
    // Select the inspectable host backend without replacing coordinates or actions.
    menuOwner.showKplexMenuAtPosition = function(menu, ...args) {
      menu.setUseNativeMenu(false);
      return originalMenu.call(this, menu, ...args);
    };
    try {
    const sourceFile = saveInTarget ? item.targetFile : item.sources[0];
    const oppositePath = saveInTarget ? item.sources[0].path : item.targetPath;
    const targetBytes = await app.vault.read(item.targetFile), targetBody = await body(item.targetFile);
    p.notifyNavigation(item.sources[0].path);
    let edge;
    await until(() => {
      const roots = app.workspace.getLeavesOfType("k-plex-react-view").map(leaf => leaf.view.contentEl);
      edge = roots.flatMap(root => [...root.querySelectorAll(".kplex-edge-hit")])
        .find(element => element.dataset.kplexEdgeId?.includes(item.targetPath));
      return Boolean(edge);
    }, "Native hide fixture connector missing");
    const hostLeaf = app.workspace.getLeavesOfType("k-plex-react-view").find(leaf => leaf.view.contentEl.contains(edge));
    check(hostLeaf, "Native connector lost its owning graph leaf");
    const rect = edge.getBoundingClientRect();
    edge.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2, button: 2 }));
    await until(() => document.querySelector(".menu"), "Native connection menu missing");
    const entry = [...document.querySelectorAll(".menu-item")].find(element => element.textContent.includes(p.translator("hide.title")));
    check(entry, "Connection context menu omitted Hide connection");
    const owner = p, original = owner.hideRelationship;
    /** Observe the actual context action promise without replacing its confirmation or writer. */
    c.contextHideOutcome=null;
    owner.hideRelationship = function(...args) { return track(original.apply(this, args).then(outcome=>{c.contextHideOutcome=outcome;return outcome;})); };
    try {
    entry.click();
    await until(() => document.querySelector(".kplex-hide-relationship-modal"), "Hide connection did not request consent");
    const modal = document.querySelector(".kplex-hide-relationship-modal");
    check(modal.textContent.includes(item.targetPath) && modal.textContent.includes(item.sources[0].path), "Hide consent omitted exact endpoints");
    const sourceSelect = modal.querySelector("[data-kplex-hide-source]");
    /** Direction disclosure follows the exact pending writable note without approving any write. */
    const checkDirection = selectedPath => {
      const otherPath = selectedPath === item.targetPath ? item.sources[0].path : item.targetPath;
      const direction = modal.querySelector("[data-kplex-hide-direction]");
      check(direction?.dataset.kplexHideFrom === selectedPath && direction.dataset.kplexHideTo === otherPath,
        "Hide direction does not follow the selected save note");
      check(direction.textContent.includes(selectedPath) && direction.textContent.includes(otherPath), "Hide direction omitted exact notes");
      equal(direction.textContent, p.translator("hide.confirmPair", { source: selectedPath, target: otherPath }),
        "Native direction did not use the shared reference formatter");
      check(direction.textContent.includes(`"${selectedPath}"`) && direction.textContent.includes(`"${otherPath}"`),
        "Native note references lack double quotes");
      check(!direction.textContent.includes(`""${selectedPath}""`) && !direction.textContent.includes(`""${otherPath}""`),
        "Native note references have duplicate quote wrappers");
      check(!modal.textContent.includes("hidden in both directions"), "Hide still promises bidirectional suppression");
    };
    checkDirection(sourceSelect.value);
    if (cancel) {
      dismiss(modal); await wait(100);
      equal(await app.vault.read(item.sources[0]), item.original.get(item.sources[0].path).bytes, "Cancelled Hide wrote source");
    } else {
      sourceSelect.value=item.targetPath;sourceSelect.dispatchEvent(new Event("change",{bubbles:true}));checkDirection(item.targetPath);
      sourceSelect.value=sourceFile.path;sourceSelect.dispatchEvent(new Event("change",{bubbles:true}));checkDirection(sourceFile.path);
      equal(await app.vault.read(item.sources[0]),item.original.get(item.sources[0].path).bytes,"Pending direction selection wrote source");
      equal(await app.vault.read(item.targetFile),targetBytes,"Pending direction selection wrote opposite note");
      modal.querySelector("[data-kplex-hide-confirm]").click();
      await until(()=>Boolean(c.contextHideOutcome),"Native context Hide operation did not settle");
      check(["committed","saved-pending"].includes(c.contextHideOutcome.status),"Native context Hide rejected approved endpoints: "+JSON.stringify(c.contextHideOutcome));
      await until(() => Boolean(properties(sourceFile).hidden) && Boolean(p.index.explainRelationship(sourceFile.path, oppositePath)?.hidden), "Confirmed Hide did not publish selected directional declaration");
      equal(properties(item.sources[0]).arbitrary, item.original.get(item.sources[0].path).properties.arbitrary, "Hide changed non-ontology links");
      equal(properties(item.sources[0]).Parent, item.original.get(item.sources[0].path).properties.Parent, "Hide changed existing ontology links");
      await bodiesUnchanged(item);
      equal(await body(item.targetFile), targetBody, "Hide changed opposite note's Markdown body");
      if (saveInTarget) equal(await app.vault.read(item.sources[0]), item.original.get(item.sources[0].path).bytes, "Saving in opposite note changed current source");
      else equal(await app.vault.read(item.targetFile), targetBytes, "Saving in source changed opposite note");
      check(app.vault.getFileByPath(item.targetPath) === item.targetFile, "Hide trashed or replaced target");
      const roles = ["parents", "children", "leftFriends", "rightFriends", "siblings"];
      const neighborhood = p.index.getNeighborhood(sourceFile.path);
      check(roles.every(role => !(neighborhood?.[role] ?? []).some(neighbor => neighbor.page.path === oppositePath)), "Selected Hide direction remained in presented neighborhood");
      const inverse = p.index.explainRelationship(oppositePath, sourceFile.path);
      check(inverse && !inverse.hidden && inverse.resolvedRoles.length > 0, "Hide incorrectly removed the preserved opposite direction");
      check(roles.some(role => (p.index.getNeighborhood(oppositePath)?.[role] ?? []).some(neighbor => neighbor.page.path === sourceFile.path)), "Preserved opposite direction disappeared from neighborhood");
      /** Wait for the actual rendered central identity, then assert that perspective's connector. */
      const viewVisible = async (centerPath, otherPath, expected) => {
        p.notifyNavigation(centerPath);
        await until(/** Settings change synchronously; only the rendered center authenticates the visible edges. */ () => {
          const root = hostLeaf.view.contentEl;
          const edges = [...root.querySelectorAll(".kplex-edge-hit")];
          return root.querySelector(".kplex-role-center[data-kplex-path]")?.dataset.kplexPath === centerPath
            && edges.some(edge => edge.dataset.kplexEdgeId?.includes(otherPath)) === expected;
        }, "Directional Hide did not match the visible central-note perspective");
      };
      await viewVisible(oppositePath, sourceFile.path, true);
      await viewVisible(sourceFile.path, oppositePath, false);
    }
    } finally { owner.hideRelationship = original; }
    } finally { menuOwner.showKplexMenuAtPosition = originalMenu; }
  };
  /** Check generic property-only ghost/evidence without substituting a live physical file. */
  const ghost = async (item, source) => {
    check(!app.vault.getFileByPath(item.targetPath), "Deleted target still physical");
    const unresolved=Object.keys(app.metadataCache.unresolvedLinks[source.path]??{}).filter(path=>path===item.targetPath||path===item.targetPath.replace(/\.md$/i,""));
    check(unresolved.length<=1,"Ambiguous native unresolved target coordinate");
    item.graphPath=unresolved[0]??item.targetPath;
    await p.index.publishHostMetadataPreview(source.path);
    check(await p.index.prepareRelationshipPair(source.path, item.graphPath), "Ghost pair publication unavailable");
    const page = p.index.get(item.graphPath);
    c.ghostReceipt={sourcePath:source.path,targetPath:item.targetPath,graphPath:item.graphPath,
      unresolved:app.metadataCache.unresolvedLinks[source.path],evidence:p.index.evidenceBetween(source.path,item.graphPath)};
    check(page && !page.file, "Property-only ghost vanished");
    check(p.index.evidenceBetween(source.path, item.graphPath).some(evidence => evidence.declaredByPath === source.path), "Retained property evidence vanished");
  };
  /** Restore native runtime preferences/workspace and remove only this probe's owned fixture folder. */
  c.cleanup = () => c.cleanupTask ??= (async () => {
    c.cancelled = true;
    // Close consent first, then drain real writers before removing owned notes or restoring wrappers.
    for (const modal of document.querySelectorAll(".kplex-delete-node-modal,.kplex-hide-relationship-modal")) dismiss(modal);
    await c.task;
    await Promise.allSettled([...c.operations]);
    restoreWrappers();
    for (const modal of document.querySelectorAll(".kplex-delete-node-modal,.kplex-hide-relationship-modal,.kplex-remaining-references-modal")) dismiss(modal);
    for (const release of c.releases.splice(0)) release();
    plugin(); Object.assign(p.settings, c.settings); await p.saveSettings(false, false);
    if (c.owned) { const owned = app.vault.getFolderByPath(folder); if (owned) await app.vault.delete(owned, true); c.owned = false; }
    await p.index.refreshSemanticSettings(); await app.workspace.changeLayout(c.layout);
    const leaves = []; app.workspace.iterateAllLeaves(leaf => leaves.push(leaf));
    const rebind = id => leaves.find(leaf => leaf.id === id) ?? null;
    p.linkedDocumentLeaf = rebind(c.owners.linked); p.lastDocumentLeaf = rebind(c.owners.last);
    p.recentLeafHistory = c.owners.recent.map(rebind).filter(Boolean); p.sidecarLeaves.clear();
    for (const [hostId, noteId] of c.owners.sidecars) { const host = rebind(hostId), note = rebind(noteId); if (host && note) p.sidecarLeaves.set(host, note); }
    if (c.settings.lastActivePath) p.notifyNavigation(c.settings.lastActivePath);
    await p.actionPreferenceQueue; await p.settingsWriteQueue; await p.index.sourceAcquisition.repository.flush();
    if (app.vault.getMarkdownFiles().length !== c.originalCount || app.vault.getFolderByPath(folder)
      || document.querySelector(".kplex-delete-node-modal,.kplex-hide-relationship-modal,.kplex-remaining-references-modal")) throw Error("Owned fixture cleanup incomplete");
    c.cleaned = true;
  })();
  /** Verify warm source replay using the production requested pair owners after plugin reload. */
  c.warmCheck = async () => {
    plugin(); await until(() => !p.isStartupInitializing(), "Warm startup did not settle");
    await until(() => Boolean(c.reloadOutcome), "Plugin unload did not settle pending deletion consent");
    check(c.reloadOutcome.status === "cancelled", "Reload inherited a pending delete approval");
    check(app.vault.getFileByPath(c.reloadConsent.targetPath) === c.reloadConsent.targetFile, "Reload trashed the unapproved target");
    equal(await app.vault.read(c.reloadConsent.source), c.reloadConsent.bytes, "Reload changed unapproved source properties");
    passed("plugin-reload-cancels-pending-delete-consent");
    for (const item of c.warm) {
      const source = app.vault.getFileByPath(item.sourcePath);
      check(source, "Warm source missing"); c.releases.push(p.index.acquireSemanticDemand(source.path));
      check(await p.index.prepareRelationshipPair(source.path, item.targetPath), "Warm pair unavailable");
      const page = p.index.get(item.targetPath);
      check(page && (item.physical ? page.file === app.vault.getFileByPath(item.targetPath) : !page.file), "Warm endpoint identity changed");
      check(p.index.evidenceBetween(source.path, item.targetPath).some(evidence => evidence.declaredByPath === source.path), "Warm property evidence lost");
      if (item.hidden) check(p.index.explainRelationship(source.path, item.targetPath)?.hidden, "Warm hidden relationship became visible");
      if (item.directional) {
        const inverse = p.index.explainRelationship(item.targetPath, source.path);
        check(inverse && !inverse.hidden && inverse.resolvedRoles.length > 0, "Warm replay hid the preserved opposite direction");
      }
      passed(`warm:${item.id}`, { targetPath: item.targetPath, sourcePath: source.path, hidden: Boolean(item.hidden) });
    }
  };
  c.task = new Promise(done => window.setTimeout(done, 0)).then(async () => {
    const remote = require("@electron/remote"), win = remote.getCurrentWindow(); remote.app.focus({ steal: true }); win.restore(); win.show(); win.focus();
    await until(() => !document.hidden && document.hasFocus(), "Foreground native renderer required");
    await until(() => !p.isStartupInitializing(), "Original startup did not settle");
    check(!app.vault.getFolderByPath(folder), "Fixture collision"); await app.vault.createFolder(folder); c.owned = true;
    p.settings.hierarchy.hidden = ["hidden", "Private connection"];
    Object.assign(p.settings, { embedCentralNode: false, graphDepth: 1, showFolderNodes: false, showTagNodes: false,
      showCrossLinks: false, renderSiblings: false, showPageNodes: true, showVirtualNodes: true,
      showInferredNodes: true, inferAllLinksAsFriends: false, applyPowerFilter: false, animationSpeed: 0 });
    p.settings.deletePromptInitialized = false; p.settings.confirmFileDelete = true;
    p.settings.removeOntologyLinksOnDelete = true;
    await p.setDocumentSyncMode("off"); await p.saveSettings(); await p.activateView(); await p.index.refreshSemanticSettings();

    const mixed = await fixture("default", [["owner", item => yaml({ Parent: `[[${item.targetPath}]]`, hidden: `[[${item.targetPath}]]`,
      arbitrary: `[[${item.targetPath}]]`, list: [`[[${item.targetPath}]]`, `[[${item.other.path}]]`, `[[${item.targetPath}]]`],
      nested: { reference: `[[${item.targetPath}]]`, keep: 7 } }, `# Body retained\n[[${item.targetPath}]]\nParent:: [[${item.targetPath}]]\n`)]]);
    p.settings.navigationHistory = [mixed.other.path, mixed.targetPath]; p.settings.lastActivePath = mixed.targetPath;
    let outcome = await deleteWithDialog(mixed, modal => {
      const toggles = modal.querySelectorAll(".checkbox-container");
      if (toggles.length) toggles[0].click();
    }, false, true);
    check(["committed", "saved-pending"].includes(outcome.status), "Default deletion not committed");
    check(!app.vault.getFileByPath(mixed.targetPath), "Native trash did not remove target");
    check(p.index.get(mixed.targetPath)?.file === null, "Deleted canonical endpoint retained a physical projection");
    check(!p.settings.navigationHistory.includes(mixed.targetPath) && p.settings.lastActivePath === mixed.other.path, "Explicit delete history/navigation incorrect");
    const remaining = properties(mixed.sources[0]), before = mixed.original.get(mixed.sources[0].path).properties;
    c.defaultReceipt = {outcome,remaining,choices:c.lastChoices,ontology:p.allOntologyFields(),
      report:document.querySelector(".kplex-remaining-references-modal")?.textContent??null};
    check(!Object.hasOwn(remaining, "Parent"), "Default retained configured ontology");
    check(!Object.hasOwn(remaining, "hidden"), "Default retained configured Hidden ontology");
    for (const key of ["arbitrary", "list", "nested"]) equal(remaining[key], before[key], `Default touched ${key}`);
    await bodiesUnchanged(mixed);
    const reportModal = document.querySelector(".kplex-remaining-references-modal");
    check(reportModal?.textContent.includes("arbitrary") && reportModal.textContent.includes("Parent"), "Remaining property/inline navigation not reported");
    const propertyRow = [...reportModal.querySelectorAll(".setting-item")].find(row => row.querySelector(".setting-item-name")?.textContent === "arbitrary");
    check(propertyRow?.querySelector("button"), "Property source Open control missing"); propertyRow.querySelector("button").click();
    await until(() => app.workspace.getLeavesOfType("markdown").some(leaf => leaf.view.file === mixed.sources[0]), "Native property source navigation failed");
    passed("default-ontology-and-inline-navigation", { outcome: outcome.status, survivingProperties: Object.keys(remaining), lastActivePath: p.settings.lastActivePath });
    await closeReports();

    p.settings.removeOntologyLinksOnDelete = false; await p.saveSettings(false, false);
    const disabled = await fixture("cleanup-disabled", [["owner", item => yaml({ Parent: `[[${item.targetPath}]]`,
      hidden: `[[${item.targetPath}]]`, arbitrary: `[[${item.targetPath}]]` }, `# Body retained\n[[${item.targetPath}]]\n`)]]);
    outcome = await deleteWithDialog(disabled, modal => {
      check(modal.textContent.includes(p.translator("delete.cleanup.disabled")), "Disabled preference omitted from consent");
      check([...modal.querySelectorAll("select[data-kplex-delete-choice]")].every(select => select.value === "keep"), "Disabled cleanup proposed a property write");
    });
    check(!app.vault.getFileByPath(disabled.targetPath), "Disabled cleanup did not trash the file");
    equal(await app.vault.read(disabled.sources[0]), disabled.original.get(disabled.sources[0].path).bytes, "Disabled cleanup rewrote source bytes");
    passed("cleanup-preference-off-preserves-all-source-bytes", { outcome: outcome.status }); await closeReports();
    p.settings.removeOntologyLinksOnDelete = true; await p.saveSettings(false, false);

    p.settings.deletePromptInitialized = true; p.settings.confirmFileDelete = false; await p.saveSettings(false, false);
    const propertyOnly = await fixture("property-only", [["owner", item => yaml({ arbitrary: `[[${item.targetPath}]]` })]]);
    outcome = await deleteWithDialog(propertyOnly);
    equal(properties(propertyOnly.sources[0]).arbitrary, propertyOnly.original.get(propertyOnly.sources[0].path).properties.arbitrary, "Legacy suppression removed arbitrary property");
    await ghost(propertyOnly, propertyOnly.sources[0]); await bodiesUnchanged(propertyOnly);
    c.warm.push({ id: propertyOnly.id, sourcePath: propertyOnly.sources[0].path, targetPath: propertyOnly.graphPath });
    passed("legacy-preference-preserves-property-only-ghost", { outcome: outcome.status }); await closeReports();

    const short = await fixture("short-link", [["owner", item => yaml({ Parent: `[[${item.targetFile.basename}]]`, arbitrary: `[[${item.targetPath}]]` },
      `# Body retained\n[[${item.targetFile.basename}]]\nParent:: [[${item.targetFile.basename}]]\nParent:: ${item.targetFile.basename}\n`)]]);
    outcome = await deleteWithDialog(short);
    check(!properties(short.sources[0]).Parent && properties(short.sources[0]).arbitrary, "Pre-trash short ontology link was not removed safely");
    await ghost(short, short.sources[0]); await bodiesUnchanged(short);
    const shortReport = document.querySelector(".kplex-remaining-references-modal");
    check(shortReport?.textContent.includes(p.translator("references.markdownLink"))
      && shortReport.textContent.includes(p.translator("references.inlineRelationship")), "Short body/plain-inline navigation disappeared after trash");
    passed("resolved-short-ontology-captured-and-body-references-kept", { outcome: outcome.status }); await closeReports();

    const cancelled = await fixture("cancel", [["owner", item => yaml({ Parent: `[[${item.targetPath}]]`, arbitrary: `[[${item.targetPath}]]` })]]);
    outcome = await deleteWithDialog(cancelled, modal => choose(modal, cancelled.sources[0], "arbitrary", "remove"), true);
    check(outcome.status === "cancelled" && app.vault.getFileByPath(cancelled.targetPath) === cancelled.targetFile, "Cancel trashed target");
    equal(await app.vault.read(cancelled.sources[0]), cancelled.original.get(cancelled.sources[0].path).bytes, "Cancel mutated source");
    passed("cancel-no-write");

    const selected = await fixture("selective", [["owner", item => yaml({ Parent: `[[${item.targetPath}]]`,
      removeMe: [`[[${item.targetPath}]]`, `[[${item.other.path}]]`, `[[${item.targetPath}]]`], keepMe: `[[${item.targetPath}]]` })],
      ["other-note", item => yaml({ removeMe: `[[${item.targetPath}]]` })]]);
    outcome = await deleteWithDialog(selected, modal => choose(modal, selected.sources[0], "removeMe", "remove"));
    equal(properties(selected.sources[0]).removeMe, [`[[${selected.other.path}]]`], "Selected removal lost unrelated occurrence");
    equal(properties(selected.sources[0]).keepMe, `[[${selected.targetPath}]]`, "Selected removal touched unselected field");
    equal(await app.vault.read(selected.sources[1]), selected.original.get(selected.sources[1].path).bytes, "Selected removal changed another note");
    await bodiesUnchanged(selected); passed("explicit-extra-field-removal", { outcome: outcome.status }); await closeReports();

    const hidden = await fixture("delete-hide", [["owner", item => yaml({ arbitrary: `[[${item.targetPath}]]` })]]);
    outcome = await deleteWithDialog(hidden, modal => {
      choose(modal, hidden.sources[0], "arbitrary", "hide");
      const select = modal.querySelector("select[data-kplex-hidden-field]");
      check(select, "Configured hidden field selector missing"); select.value = "Private connection"; select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    equal(properties(hidden.sources[0]).arbitrary, `[[${hidden.targetPath}]]`, "Hide removed original property link");
    check(properties(hidden.sources[0])["Private connection"], "Hide omitted selected configured declaration");
    await ghost(hidden, hidden.sources[0]); check(p.index.explainRelationship(hidden.sources[0].path, hidden.graphPath)?.hidden, "Delete Hide did not suppress pair");
    c.warm.push({ id: hidden.id, sourcePath: hidden.sources[0].path, targetPath: hidden.graphPath, hidden: true });
    passed("delete-hide-preserves-links", { outcome: outcome.status }); await closeReports();

    const placeholder = await fixture("placeholder", [["owner", item => yaml({ Parent: `[[${item.targetPath}]]`, arbitrary: `[[${item.targetPath}]]` })]], false);
    outcome = await deleteWithDialog(placeholder);
    check(!properties(placeholder.sources[0]).Parent && properties(placeholder.sources[0]).arbitrary, "Placeholder cleanup scope wrong");
    await ghost(placeholder, placeholder.sources[0]); passed("placeholder-default-scope", { outcome: outcome.status }); await closeReports();

    const hiddenOntology = await fixture("hidden-ontology", [["owner", item => yaml({ hidden: `[[${item.targetPath}]]`, arbitrary: `[[${item.targetPath}]]` })]]);
    outcome = await deleteWithDialog(hiddenOntology);
    check(!properties(hiddenOntology.sources[0]).hidden && properties(hiddenOntology.sources[0]).arbitrary, "Configured hidden ontology not cleaned by default");
    await ghost(hiddenOntology, hiddenOntology.sources[0]); passed("hidden-is-configured-ontology", { outcome: outcome.status }); await closeReports();

    const partial = await fixture("partial", [["first", item => yaml({ Parent: `[[${item.targetPath}]]`, arbitrary: `[[${item.targetPath}]]` })],
      ["failed", item => yaml({ Parent: `[[${item.targetPath}]]`, arbitrary: `[[${item.targetPath}]]` })]]);
    let intercepted = 0; intercept(async file => { if (file === partial.sources[1]) { intercepted++; throw Error("Owned source failure"); } });
    try { outcome = await deleteWithDialog(partial); } finally { restoreWrappers(); }
    check(intercepted === 1 && !app.vault.getFileByPath(partial.targetPath), "Partial failure did not occur after trash");
    check(!properties(partial.sources[0]).Parent && properties(partial.sources[1]).Parent, "Partial edits falsely rolled back or erased failed source");
    check(["committed", "saved-pending"].includes(outcome.status), "Partial commit misreported unsaved");
    check(document.querySelector(".kplex-remaining-references-modal")?.textContent.includes(partial.sources[1].path), "Failed source omitted from native report");
    await ghost(partial, partial.sources[1]); passed("partial-source-failure-keeps-evidence", { outcome: outcome.status }); await closeReports();

    const replacement = await fixture("replacement", [["owner", item => yaml({ Parent: `[[${item.targetPath}]]`, arbitrary: `[[${item.targetPath}]]` })]]);
    outcome = await deleteWithDialog(replacement, async () => {
      await app.vault.delete(replacement.targetFile);
      replacement.newFile = await app.vault.create(replacement.targetPath, "# Replacement must survive\n"); p.index.insertCreatedFile(replacement.newFile);
    });
    check(outcome.status === "unavailable" && app.vault.getFileByPath(replacement.targetPath) === replacement.newFile, "Replaced target inherited delete approval");
    equal(await app.vault.read(replacement.sources[0]), replacement.original.get(replacement.sources[0].path).bytes, "Replacement mutated old references");
    passed("confirmation-target-replacement-refused"); await closeReports();

    const sourceReplacement = await fixture("source-replacement", [["owner", item => yaml({ Parent: `[[${item.targetPath}]]`, arbitrary: `[[${item.targetPath}]]` })]]);
    let replacedSource = null;
    const replacementBytes = "---\nBrandNew: true\n---\n# New source must survive\n";
    intercept(async file => {
      if (file !== sourceReplacement.sources[0] || replacedSource) return;
      await app.vault.delete(file);
      replacedSource = await app.vault.create(file.path, replacementBytes); p.index.insertCreatedFile(replacedSource);
    });
    try { outcome = await deleteWithDialog(sourceReplacement); } finally { restoreWrappers(); }
    check(replacedSource && app.vault.getFileByPath(replacedSource.path) === replacedSource, "Native source replacement not reached");
    equal(await app.vault.read(replacedSource), replacementBytes, "Source replacement inherited old property approval");
    check(!app.vault.getFileByPath(sourceReplacement.targetPath), "Committed target deletion rolled back after source replacement");
    passed("native-await-source-replacement-refused", { outcome: outcome.status }); await closeReports();

    const recreated = await fixture("post-trash-recreation", [["owner", item => yaml({ Parent: `[[${item.targetPath}]]`, arbitrary: `[[${item.targetPath}]]` })]]);
    let newTarget = null;
    const newTargetBytes = "# New target incarnation must survive\n";
    intercept(async file => {
      if (file !== recreated.sources[0] || newTarget) return;
      check(!app.vault.getFileByPath(recreated.targetPath), "Expected recreation boundary after trash");
      newTarget = await app.vault.create(recreated.targetPath, newTargetBytes); p.index.insertCreatedFile(newTarget);
    });
    try { outcome = await deleteWithDialog(recreated); } finally { restoreWrappers(); }
    check(newTarget && app.vault.getFileByPath(recreated.targetPath) === newTarget, "Native target recreation not reached");
    equal(await app.vault.read(newTarget), newTargetBytes, "Recreated target was changed");
    equal(await app.vault.read(recreated.sources[0]), recreated.original.get(recreated.sources[0].path).bytes, "Recreated target inherited old cleanup approval");
    check(p.index.get(recreated.targetPath)?.file === newTarget, "Recreated target dematerialized incorrectly");
    passed("post-trash-target-recreation-refused", { outcome: outcome.status }); await closeReports();

    const connection = await fixture("context-hide", [["owner", item => yaml({ Parent: `[[${item.targetPath}]]`, arbitrary: `[[${item.targetPath}]]` }, `# Preserve body\n[[${item.targetPath}]]\nParent:: [[${item.targetPath}]]\n`)]]);
    await hideFromContext(connection, true); passed("context-hide-cancel-preserves-source");
    await hideFromContext(connection); passed("context-hide-keeps-original-links-and-note");
    c.warm.push({ id: connection.id, sourcePath: connection.sources[0].path, targetPath: connection.targetPath, hidden: true, physical: true, directional: true });

    const reverseOwner = await fixture("context-hide-other-owner", [["owner", item => yaml({ arbitrary: `[[${item.targetPath}]]` },
      `# Preserve inline ontology\nParent:: [[${item.targetPath}]]\n`)]]);
    check(p.index.evidenceBetween(reverseOwner.sources[0].path, reverseOwner.targetPath).some(evidence => evidence.sourceKind === "inline-ontology"), "Directional fixture lacks actual inline evidence");
    await hideFromContext(reverseOwner, false, true);
    passed("context-hide-opposite-save-note-updates-direction-and-keeps-current-view");
    c.warm.push({ id: reverseOwner.id, sourcePath: reverseOwner.targetPath, targetPath: reverseOwner.sources[0].path, hidden: true, physical: true, directional: true });

    await until(() => c.operations.size === 0, "Confirmed connection workflow did not settle before reload");
    const pending = await fixture("unload-consent", [["owner", item => yaml({ arbitrary: `[[${item.targetPath}]]` })]]);
    c.reloadConsent = { targetPath: pending.targetPath, targetFile: pending.targetFile, source: pending.sources[0], bytes: pending.original.get(pending.sources[0].path).bytes };
    track(p.deleteNode(pending.page).then(outcome => c.reloadOutcome = outcome, error => c.reloadOutcome = { status: "failed", error: String(error) }));
    await until(() => document.querySelector(".kplex-delete-node-modal"), "Pending reload consent never opened");
    c.phase = "ready-for-warm-reload"; await p.index.sourceAcquisition.repository.flush();
  }).then(() => c.done = true, error => { c.error = String(error.stack ?? error); c.done = true; });
  return true;
}

/** Poll finite task facts; never replay a timed-out native mutation. */
async function waitTask() {
  const end = Date.now() + 600_000;
  while (true) {
    const state = evaluate("JSON.stringify({done:window.__kplexDeleteProbe?.done,error:window.__kplexDeleteProbe?.error,phase:window.__kplexDeleteProbe?.phase,cases:window.__kplexDeleteProbe?.cases,defaultReceipt:window.__kplexDeleteProbe?.defaultReceipt,ghostReceipt:window.__kplexDeleteProbe?.ghostReceipt,contextHideOutcome:window.__kplexDeleteProbe?.contextHideOutcome})");
    report.cases = state.cases ?? []; report.phase = state.phase;
    report.defaultReceipt = state.defaultReceipt;
    report.ghostReceipt = state.ghostReceipt;
    report.contextHideOutcome=state.contextHideOutcome;
    writeFileSync(join(output, "report.json"), JSON.stringify(report, null, 2));
    if (state.done) { assert(!state.error, state.error); return; }
    assert(Date.now() < end, "Native deletion scenario deadline exceeded"); await delay(500);
  }
}

let installed = false;
try {
  assert.equal(cli("vault", "info=path").replace(/^path /, ""), target.vault);
  report.obsidian = cli("version"); cli("dev:errors", "clear");
  for (const name of ["main.js", "styles.css", "manifest.json"]) {
    const built = readFileSync(join(root, "dist", name)), actual = readFileSync(join(target.pluginDir, name));
    assert(built.equals(actual), `Installed ${name} mismatch`); report.artifacts[name] = createHash("sha256").update(actual).digest("hex");
  }
  const readyDeadline = Date.now() + 60_000;
  while (!evaluate("JSON.stringify(Boolean(app.plugins.plugins['k-plex']?.index) && !app.plugins.plugins['k-plex'].isStartupInitializing())")) {
    assert(Date.now() < readyDeadline, "Original startup did not settle before state capture"); await delay(250);
  }
  report.configurationBefore = [];
  for (const path of [join(target.pluginDir, "data.json"), join(target.config, "community-plugins.json")]) {
    const bytes = readFileSync(path), name = path.endsWith("data.json") ? "data.json.before" : "community-plugins.json.before";
    configuration.push({ path, bytes });
    writeFileSync(join(output, name), bytes);
    report.configurationBefore.push({ name, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  evaluate(`JSON.stringify((${installProbe.toString()})())`); installed = true; await waitTask();
  evaluate("JSON.stringify((()=>{const c=window.__kplexDeleteProbe;for(const release of c.releases.splice(0))release();return true})())");
  cli("plugin:disable", "id=k-plex"); cli("plugin:enable", "id=k-plex"); cli("command", "id=k-plex:kplex-start");
  evaluate("JSON.stringify((()=>{const c=window.__kplexDeleteProbe;c.done=false;c.error=null;c.phase='warm-reload';c.task=c.warmCheck().then(()=>c.done=true,error=>{c.error=String(error.stack??error);c.done=true});return true})())");
  await waitTask(); report.nativeErrors = cli("dev:errors");
  assert(!report.nativeErrors || /^No errors captured\.?$/i.test(report.nativeErrors), "Captured native JavaScript errors"); report.status = "passed";
} catch (error) { report.status = "failed"; report.error = String(error.stack ?? error); }
finally {
  if (installed) {
    try {
      evaluate("JSON.stringify((()=>{const c=window.__kplexDeleteProbe;c.cleanup().then(()=>c.cleanupDone=true,error=>{c.cleanupError=String(error.stack??error);c.cleanupDone=true});return true})())");
      const end = Date.now() + 90_000;
      while (true) {
        const state = evaluate("JSON.stringify({done:window.__kplexDeleteProbe?.cleanupDone,error:window.__kplexDeleteProbe?.cleanupError})");
        if (state.done) { assert(!state.error, state.error); break; }
        assert(Date.now() < end, "Native deletion cleanup deadline exceeded"); await delay(250);
      }
      report.cleanup = evaluate("JSON.stringify({cleaned:window.__kplexDeleteProbe.cleaned,markdownFiles:app.vault.getMarkdownFiles().length,pluginEnabled:!!app.plugins.plugins['k-plex']})");
      evaluate("delete window.__kplexDeleteProbe;JSON.stringify(true)");
    } catch (error) { report.status = "failed"; report.cleanupError = String(error.stack ?? error); }
  }
  for (const item of configuration) writeFileSync(item.path, item.bytes);
  report.configurationCaptured = configuration.length === 2;
  report.configurationRestored = report.configurationCaptured && configuration.every(item => readFileSync(item.path).equals(item.bytes));
  report.finishedAt = new Date().toISOString(); writeFileSync(join(output, "report.json"), JSON.stringify(report, null, 2));
}
console.log(`Delete cleanup ${report.status}; report: ${join(output, "report.json")}`);
if (report.error) console.error(report.error);
if (report.cleanupError) console.error(report.cleanupError);
if (report.status !== "passed") process.exitCode = 1;
