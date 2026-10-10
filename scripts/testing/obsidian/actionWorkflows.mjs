/**
 * Supplemental exact-build native action workflows in an explicitly selected disposable vault.
 * Runs separately from actions.mjs, owns bounded fixtures/dialogs/leaves and restores configuration
 * bytes. Real Electron keys and installed UI establish desktop behavior; physical input remains separate.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { validateTarget } from "./runner.mjs";

const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const reportDir = process.env.KPLEX_HOST_REPORT_DIR;
if (!reportDir) throw new Error("Set KPLEX_HOST_REPORT_DIR explicitly");
mkdirSync(reportDir, { recursive: true });
const configuration = ["data.json", "community-plugins.json", "hotkeys.json"].map((name, index) => {
  const path = join(index === 0 ? target.pluginDir : target.config, name);
  return { path, bytes: existsSync(path) ? readFileSync(path) : null, writable: index === 0 };
});
const companionSettingsPath = join(target.config, "plugins", "obsidian-excalidraw-plugin", "data.json");
if (existsSync(companionSettingsPath)) configuration.push({ path: companionSettingsPath, bytes: readFileSync(companionSettingsPath), writable: true });
if (!configuration[0].bytes || !configuration[1].bytes) throw new Error("Initialized disposable plugin settings and enablement are required");
const report = { status: "running", startedAt: new Date().toISOString(), node: process.version, target: vaultName, artifacts: {},
  limitations: ["Desktop Electron UI and trusted renderer keyboard input; no physical keyboard/IME/touch or screen-reader acceptance", "H26 is conditional on an installed enabled Excalidraw companion", "Existing-target semantic writes are asserted through native metadata and exact source files; no whole-vault semantic oracle is inferred"] };
let installed = false;
let ownedController = false;
const runToken = `action-workflows-${process.pid}-${Date.now()}`;

/** Keep native CLI arguments out of a shell and reject eval errors even when Obsidian exits zero. */
function cli(command, ...args) {
  const result = spawnSync(process.env.KPLEX_OBSIDIAN_CLI || "obsidian", [`vault=${vaultName}`, command, ...args], { encoding: "utf8", timeout: 30000, killSignal: "SIGKILL", maxBuffer: 4 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0 || /^Error:/m.test(result.stdout)) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}

/** Parse bounded native controller responses after syntax validation in the driver process. */
function evaluate(code) {
  new Script(code);
  const output = cli("eval", `code=${code}`);
  return JSON.parse(output.slice(output.indexOf("{")));
}

let progressRetryUsed = false;
/** Retry one timed-out read-only progress receipt without replaying a native mutation or restarting either deadline. */
function readProgress(code, deadline) {
  const read = () => {
    const startedAt = new Date().toISOString();
    try { return evaluate(code); }
    catch (error) {
      if (error?.code === "ETIMEDOUT") {
        (report.progressPollFailures ??= []).push({startedAt, failedAt: new Date().toISOString(), error: String(error), code: error.code});
        report.progressPollFailureCount = report.progressPollFailures.length;
        writeFileSync(join(reportDir, "report.json"), JSON.stringify(report, null, 2));
      }
      throw error;
    }
  };
  try { return read(); }
  catch (error) {
    if (error?.code !== "ETIMEDOUT" || progressRetryUsed || Date.now() > deadline) throw error;
    progressRetryUsed = true;
    report.progressPollRetryCount = 1;
    return read();
  }
}

/** Yield only this driver between bounded completion polls. */
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

/** Install one disposable native controller; no production globals or diagnostic APIs are added. */
function nativeWorkflowProbe(runToken) {
  if (window.__kplexActionTest || window.__kplexActionWorkflows) throw new Error("Another native action driver is active");
  const p = app.plugins.plugins["k-plex"];
  if (!p?.actionManager) throw new Error("Exact action-manager build is not loaded");
  if (document.querySelector(".modal-container .modal, .modal-container .prompt")) throw new Error("Close existing dialogs before native workflow acceptance");
  const remote = require("@electron/remote"), nativeWindow = remote.getCurrentWindow();
  remote.app.show(); remote.app.focus({ steal: true }); nativeWindow.show(); nativeWindow.moveTop(); nativeWindow.focus();
  const c = window.__kplexActionWorkflows = { p, runToken, originalSettings: JSON.parse(JSON.stringify(p.settings)), originalLeaf: app.workspace.getMostRecentLeaf(),
    nativeWindow, folder: `Kplex-Action-Workflows-${Date.now()}`, owned: [], wrappers: [], leaves: [], dialogs: new Set(), scenarios: [], done: false, cancelled: false };
  /** All resources remain controller-owned until independent cleanup finishes. */
  const run = async () => {
    /** Give each failed prerequisite an actionable native assertion. */
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    const delay = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));
    /** Poll an actual state transition without modifying renderer throttling or publication clocks. */
    const until = async (predicate, message, timeout = 20000) => {
      const end = Date.now() + timeout;
      while (!predicate()) { check(!c.cancelled, "Workflow controller cancelled"); check(Date.now() < end, message); await delay(25); }
    };
    /** Record a scenario only after its assertions; conditional unavailable coverage stays explicit. */
    const scenario = async (id, action) => {
      const started = performance.now(); const detail = await action();
      c.scenarios.push({ id, status: detail?.unavailable ? "unavailable" : "passed", detail, elapsedMs: performance.now() - started });
    };
    /** Wrappers count real canonical calls and retain exact original implementations for cleanup. */
    const wrap = (key, replacement) => { const original = p[key]; p[key] = replacement(original); c.wrappers.push(() => { p[key] = original; }); };
    c.created = [];
    wrap("createNewRelatedFileForOrigin", original => async function (...args) {
      try { const file = await original.apply(this, args); if (file) { c.created.push(file); c.owned.push(file.path); } return file; }
      catch (error) { if (error?.file) { c.created.push(error.file); c.owned.push(error.file.path); } throw error; }
    });
    wrap("createNewNodeInFolder", original => async function (...args) {
      const page = await original.apply(this, args); if (page?.file) { c.created.push(page.file); c.owned.push(page.file.path); } return page;
    });
    c.relationshipWrites = 0;
    wrap("createRelationToPage", original => async function (...args) { c.relationshipWrites++; return original.apply(this, args); });
    c.unlinkWrites = 0;
    wrap("unlinkFrontmatterEvidence", original => async function (...args) { c.unlinkWrites++; return original.apply(this, args); });
    /** Observe trusted key provenance before relying on native Scope or SuggestModal delivery. */
    const key = async (keyCode, modifiers = []) => {
      await until(() => remote.powerMonitor.getSystemIdleState(10) !== "locked" && !document.hidden && document.hasFocus() && nativeWindow.isFocused(), "Unlocked native foreground required", 5000);
      let observed, observedEvent;
      const expected = ({ Down: "ArrowDown", Up: "ArrowUp", Left: "ArrowLeft", Right: "ArrowRight" })[keyCode] ?? keyCode;
      const observe = event => { if (event.key.toLocaleLowerCase() === expected.toLocaleLowerCase()) { observed = event.isTrusted; observedEvent = event; } };
      // Native Scope consumes accepted graph keys at window capture before they reach the document.
      // Observe the original trusted event at that same boundary, as the primary action driver does.
      window.addEventListener("keydown", observe, true);
      try {
        nativeWindow.focus(); nativeWindow.webContents.focus(); nativeWindow.webContents.sendInputEvent({ type: "keyDown", keyCode, modifiers });
        await until(() => observed !== undefined, `Native ${keyCode} did not arrive`); check(observed, "Keyboard delivery is not trusted native input");
        if (!observedEvent.defaultPrevented && !modifiers.some(modifier => ["meta", "control", "ctrl", "alt"].includes(modifier)) && (keyCode === "Enter" || keyCode.length === 1)) nativeWindow.webContents.sendInputEvent({ type: "char", keyCode: keyCode === "Enter" ? "\r" : keyCode, modifiers });
        nativeWindow.webContents.sendInputEvent({ type: "keyUp", keyCode, modifiers });
        c.trustedKeys = (c.trustedKeys ?? 0) + 1; await delay(25);
      } finally { window.removeEventListener("keydown", observe, true); }
    };
    /** Assign through native setters so React receives the same input/change protocols as normal controls. */
    const input = (element, value) => {
      check(element, "Missing owned native input"); const owner = element.ownerDocument.defaultView;
      Object.getOwnPropertyDescriptor(owner.HTMLInputElement.prototype, "value").set.call(element, value);
      element.dispatchEvent(new owner.Event("input", { bubbles: true }));
    };
    const select = (element, value) => { check(element, "Missing owned selector"); element.value = value; element.dispatchEvent(new element.ownerDocument.defaultView.Event("change", { bubbles: true })); };
    /** Track only the modal opened by this scenario, never an unrelated host dialog. */
    const modal = async selector => { await until(() => document.querySelector(selector), `Owned dialog missing: ${selector}`); const element = document.querySelector(selector); c.dialogs.add(element); return element; };
    const close = async element => { if (!element?.isConnected) return; (element.querySelector(".modal-close-button") ?? element.closest(".modal-container")?.querySelector(".modal-close-button"))?.click(); if (element.isConnected) { element.querySelector("input,button")?.focus(); await key("Escape"); } await until(() => !element.isConnected, "Owned dialog did not close"); };
    /** Prepare only this physical fixture's canonical facts before native graph routing. */
    const create = async (name, body = "# Owned workflow fixture\n") => {
      const file = await app.vault.create(`${c.folder}/${name}.md`, body); c.owned.push(file.path);
      await until(() => app.metadataCache.getFileCache(file), `Fixture metadata missing: ${name}`);
      p.index.insertCreatedFile(file); await p.index.publishHostMetadataPreview(file.path); return file;
    };
    const ref = page => ({ identity: page.path, path: page.path, kind: page.isFolder ? "folder" : page.isTag ? "tag" : page.transient?.kind === "section" ? "section" : page.url ? "url" : page.file ? "file" : "ghost" });
    const root = leaf => leaf.view.containerEl.querySelector(".kplex-app");
    /** Wait for action-adapter readiness rather than a fixed render delay. */
    const surface = async leaf => { await leaf.view.waitUntilReady(); await until(() => [...p.actionSurfaceHosts].some(([, registration]) => registration.leaf === leaf), "Action surface registration missing"); return [...p.actionSurfaceHosts].find(([, registration]) => registration.leaf === leaf)[0]; };
    const focus = leaf => { app.workspace.setActiveLeaf(leaf, { focus: true }); root(leaf).focus(); };
    const center = async path => { p.notifyNavigation(path); await until(() => root(c.host)?.querySelector(`.kplex-role-center[data-kplex-path="${CSS.escape(path)}"]`), "Expected center did not render"); };
    const dispatch = (id, target, args) => p.actionManager.dispatch({ id, source: "toolbar", surfaceId: c.surfaceId, ...(target ? { target } : {}), ...(args ? { args } : {}) });
    /** Select/reveal via the native finite visible-node picker, including clipped overflow occurrences. */
    const pickNode = async (name, id = c.surfaceId, leaf = c.host) => {
      focus(leaf); const opened = await p.actionManager.dispatch({ id: "nodes.open", source: "toolbar", surfaceId: id }); check(opened.status === "opened", "Visible-node picker unavailable");
      const prompt = await modal(".modal-container .prompt"); input(prompt.querySelector("input"), name);
      await until(() => prompt.querySelector(".suggestion-item")?.textContent.includes(name), "Visible-node picker did not find finite target");
      c.pickerBefore = { name, snapshot: p.actionManager.readSnapshot(id), displayed: [...root(leaf).querySelectorAll('[data-kplex-keyboard-id]')].map(element => ({ id: element.dataset.kplexKeyboardId, path: element.dataset.kplexPath })),
        rows: [...prompt.querySelectorAll('.suggestion-item')].map(element => element.textContent) };
      prompt.querySelector("input").focus(); await key("Enter"); await until(() => !prompt.isConnected, "Node picker did not close");
      await until(() => { c.pickerSelection = { surfaceId: id, snapshot: p.actionManager.readSnapshot(id),
        center: root(leaf)?.querySelector('.kplex-role-center')?.dataset.kplexPath, selected: root(leaf)?.querySelector('.is-keyboard-selected')?.dataset.kplexPath,
        active: document.activeElement?.className, activeLeafType: app.workspace.activeLeaf?.view?.getViewType(),
        displayed: [...root(leaf).querySelectorAll('[data-kplex-keyboard-id]')].map(element => ({ id: element.dataset.kplexKeyboardId, path: element.dataset.kplexPath })) };
        return p.actionManager.readSnapshot(id)?.selected; }, "Node picker did not select an occurrence");
      return p.actionManager.readSnapshot(id).selected;
    };
    /** Choose the canonical six-role composer selector and explicit Return, preserving shared center. */
    const configureComposer = async role => {
      const element = await modal(".kplex-add-related-modal");
      await until(() => element.querySelector(".kplex-add-related-note-search input"), "Composer React form not ready");
      select(element.querySelector(".kplex-add-related-role-select"), role);
      await until(() => element.querySelector(".kplex-add-related-role-select")?.value === role, "Composer role did not update");
      select([...element.querySelectorAll("select")].find(item => item.getAttribute("aria-label") === p.translator("addRelated.completionMode")), "return");
      return element;
    };
    const submit = async element => { await until(() => element.querySelector('button[data-kplex-primary-action="true"]')?.disabled === false, "Canonical composer submit unavailable"); element.querySelector('button[data-kplex-primary-action="true"]').click(); await until(() => !element.isConnected, "Canonical composer did not settle", 30000); };
    const ontology = async (origin, target, role) => {
      await until(() => app.metadataCache.getFileCache(origin)?.frontmatter?.[p.defaultOntologyField(role)], "Explicit role property not published");
      const field = p.defaultOntologyField(role), value = app.metadataCache.getFileCache(origin).frontmatter[field];
      check(JSON.stringify(value).includes(target.basename), `Wrong ${role} target/storage`);
      if (role === "previous" || role === "next") {
        const fm = app.metadataCache.getFileCache(origin).frontmatter;
        check(!JSON.stringify(fm[p.defaultOntologyField("left")] ?? []).includes(target.basename) && !JSON.stringify(fm[p.defaultOntologyField("right")] ?? []).includes(target.basename), "Sequence role was rewritten as a friend/challenger gate");
      }
    };

    await until(() => remote.powerMonitor.getSystemIdleState(10) !== "locked" && !document.hidden && document.hasFocus() && nativeWindow.isFocused(), "Unlocked native foreground required", 5000);
    await until(() => !p.index.building && !p.index.hasPendingSnapshotHydration(), "Small-vault initial settle", 90000);
    await app.vault.createFolder(c.folder); c.owned.push(c.folder);
    Object.assign(p.settings, { documentSyncMode: "off", followActiveFile: false, autoOpenCentralDocument: false, embedCentralNode: false, graphDepth: 1,
      editNewNodeAfterCreate: false, newNodeDefaultType: "markdown", showPageNodes: true, showVirtualNodes: true, showURLNodes: true, showAttachments: true, showInferredNodes: true, showTagNodes: true, showFolderNodes: false, childMaxHeight: 160, parentMaxHeight: 160 });
    const preferences = JSON.parse(JSON.stringify(p.settings.actionPreferences)); preferences.characterShortcutsEnabled = true;
    preferences.localBindings["relationship.connect"] = [{ match: "key", value: "c", modifiers: [] }];
    preferences.localBindings["relationship.connect-visible"] = [{ match: "key", value: "c", modifiers: ["shift"] }];
    preferences.localBindings["search.focus"] = [{ match: "key", value: "F4", modifiers: [] }];
    preferences.publishedCommands["relationship.create-selected.child"] = true; preferences.publishedCommands["relationship.create-center.child"] = true;
    await p.updateActionPreferences(preferences); await p.saveSettings(false, false);
    c.a = await create("Workflow-Origin-A"); c.editorFile = await create("Workflow-Editor-B");
    c.host = app.workspace.getLeaf("tab"); c.leaves.push(c.host); await c.host.setViewState({ type: "k-plex-react-view", active: true }); await app.workspace.revealLeaf(c.host);
    c.surfaceId = await surface(c.host); c.editor = app.workspace.getLeaf("tab"); c.leaves.push(c.editor); await c.editor.openFile(c.editorFile);
    await center(c.a.path); focus(c.host);

    await scenario("H10-C-picker-six-semantic-roles", async () => {
      const roles = ["parent", "child", "left", "right", "previous", "next"];
      for (const role of roles) {
        const target = await create(`Picker-${role}`); await center(c.a.path); focus(c.host);
        await dispatch("selection.center"); const before = c.relationshipWrites; await key("c");
        const element = await configureComposer(role), name = element.querySelector(".kplex-add-related-note-search input");
        input(name, target.basename); await until(() => name.getAttribute("aria-expanded") === "true", "Existing target suggestion missing"); name.focus(); await key("Enter");
        await until(() => element.querySelector(".kplex-add-related-link-button"), "Suggestion was not selected"); check(c.relationshipWrites === before, "Suggestion Enter also wrote relationship");
        await submit(element); check(c.relationshipWrites === before + 1, "Picker route issued duplicate semantic writes"); await ontology(c.a, target, role);
      }
      return { roles, exactWrites: roles.length };
    });

    await scenario("H10-visible-session-arrows-enter-search-and-cancel", async () => {
      for (const role of ["child", "left", "right", "previous", "next"]) {
        const target = await create(`Visible-${role}`), origin = await create(`Visible-Origin-${role}`, `---\n${JSON.stringify(p.defaultOntologyField("parent"))}: ["[[${target.path}]]"]\n---\n`);
        await p.index.prepareRelationshipPair(origin.path, target.path); await center(origin.path); focus(c.host); await dispatch("selection.center");
        await key("c", ["shift"]); await until(() => root(c.host).querySelector(".kplex-connection-session"), "Visible connection session missing");
        await key("Up", ["alt"]); await until(() => p.actionManager.readSnapshot(c.surfaceId)?.selected?.node.path === target.path, "Section arrow did not select visible target");
        const before = c.relationshipWrites; await key("Enter"); const element = await configureComposer(role); await submit(element);
        check(c.relationshipWrites === before + 1, "Visible route did not issue exactly one canonical write"); await ontology(origin, target, role);
      }
      await center(c.a.path); focus(c.host); await dispatch("selection.center"); await key("c", ["shift"]);
      await until(() => root(c.host).querySelector(".kplex-connection-session"), "Cancellation session missing"); const before = c.relationshipWrites;
      await key("Escape"); check(!root(c.host).querySelector(".kplex-connection-session") && c.relationshipWrites === before, "Visible Escape mutated or retained session");
      const rebound = JSON.parse(JSON.stringify(p.settings.actionPreferences)); rebound.localBindings["search.focus"] = [{ match: "key", value: "F8", modifiers: [] }]; await p.updateActionPreferences(rebound);
      focus(c.host); await key("c", ["shift"]); await until(() => root(c.host).querySelector(".kplex-connection-session"), "Rebound session missing");
      check(root(c.host).querySelector(".kplex-connection-session").textContent.includes("F8"), "Visible hint did not follow effective search binding");
      await key("F8"); const element = await configureComposer("child"); await close(element); await p.updateActionPreferences(preferences);
      check(c.relationshipWrites === before, "Search/cancel issued a relationship write"); return { visibleRoles: ["child", "left", "right", "previous", "next"], reboundSearch: "F8" };
    });

    await scenario("H11-multiple-evidence-and-inferred-unlink-storage", async () => {
      const childField = p.defaultOntologyField("child"), friendField = p.defaultOntologyField("left"); check(childField !== friendField, "Evidence fixture requires distinct child/friend ontology fields");
      const target = await create("Evidence-Target"), multi = await create("Evidence-Multiple", `---\n${JSON.stringify(childField)}: ["[[${target.path}]]"]\n${JSON.stringify(friendField)}: ["[[${target.path}]]"]\n---\n${childField}:: [[${target.path}]]\n`);
      const inverseField = p.defaultOntologyField("parent");
      await app.fileManager.processFrontMatter(target, frontmatter => { frontmatter[inverseField] = [`[[${multi.path}]]`]; });
      const inferred = await create("Evidence-Inferred", `[[${target.path}]]\n`);
      for (const origin of [multi, inferred]) {
        await p.index.prepareRelationshipPair(origin.path, target.path); await center(origin.path); focus(c.host);
        const before = await app.vault.read(origin), count = c.unlinkWrites, pair = { kind: "edge", origin: ref(p.index.get(origin.path)), target: ref(p.index.get(target.path)) };
        const inspect = await dispatch("relationship.details", pair); check(inspect.status === "opened", "Exact connection details unavailable");
        const details = await modal(".kplex-explanation-modal"); await until(() => details.querySelector(".kplex-edge-source-card"), "Connection sources did not render");
        if (origin === multi) check(details.textContent.includes(childField) && details.textContent.includes(friendField), "Multiple evidence fields were flattened");
        await close(details); const outcome = await dispatch("relationship.unlink", pair); check(outcome.status === "opened", "Unsafe removal did not open source inspection");
        await close(await modal(".kplex-explanation-modal")); check(c.unlinkWrites === count && await app.vault.read(origin) === before, "Ambiguous/inferred removal fabricated a native mutation");
        if (origin === multi) {
          const moved = await dispatch("relationship.relink", pair); check(moved.status === "opened", "Multiple-source relink unavailable"); await close(await modal(".kplex-explanation-modal"));
          const inverseBefore = await app.vault.read(target), preservedBody = before.slice(before.indexOf("---", 3) + 3).trim();
          await dispatch("relationship.details", pair); const selected = await modal(".kplex-explanation-modal");
          await until(() => selected.querySelector(`[data-kplex-remove-field="${CSS.escape(childField)}"]`), "Source-selected removal action missing");
          selected.querySelector(`[data-kplex-remove-field="${CSS.escape(childField)}"]`).click();
          const cancelled = await modal(".kplex-remove-relationship-source-modal");
          check(cancelled.textContent.includes(multi.path) && cancelled.textContent.includes(childField) && cancelled.textContent.includes(target.path), "Confirmation omitted exact source coordinates");
          await close(cancelled); check(c.unlinkWrites === count && await app.vault.read(origin) === before, "Cancelling source removal wrote metadata");
          selected.querySelector(`[data-kplex-remove-field="${CSS.escape(childField)}"]`).click();
          const confirmed = await modal(".kplex-remove-relationship-source-modal"); confirmed.querySelector("[data-kplex-confirm-remove]").click();
          await until(() => !selected.querySelector(`[data-kplex-remove-field="${CSS.escape(childField)}"]`) && selected.textContent.includes(p.translator("explain.sourceRemovedRemaining")), "Source-specific canonical refresh did not complete", 30000);
          const metadata = app.metadataCache.getFileCache(origin)?.frontmatter ?? {};
          check(!JSON.stringify(metadata[childField] ?? []).includes(target.path), "Selected property was retained");
          check(JSON.stringify(metadata[friendField]).includes(target.path), "Independent ontology field was removed");
          check((await app.vault.read(origin)).includes(preservedBody) && await app.vault.read(target) === inverseBefore, "Body or inverse note evidence changed");
          check(c.unlinkWrites === count + 1, "Selected removal repeated the destructive write");
          const editorBefore = JSON.stringify(c.editor.getViewState()), centerBefore = p.settings.lastActivePath;
          await p.openSidecar(c.host, p.index.get(origin.path));
          const ownedSidecar = p.sidecarLeaves.get(c.host); check(ownedSidecar, "Owned Sidecar did not open");
          if (!c.leaves.includes(ownedSidecar)) c.leaves.push(ownedSidecar);
          const inverseCard = selected.querySelector(`[data-kplex-remove-field="${CSS.escape(inverseField)}"]`)?.closest(".kplex-edge-source-card");
          check(inverseCard, "Preserved inverse source card missing");
          inverseCard.querySelector(`button[aria-label="${CSS.escape(p.translator("explain.goToSource"))}"]`).click();
          await until(() => !selected.isConnected && ownedSidecar.view.file === target, "Go to source did not reuse its owning Sidecar");
          check(p.sidecarLeaves.get(c.host) === ownedSidecar && JSON.stringify(c.editor.getViewState()) === editorBefore && p.settings.lastActivePath === centerBefore, "Source navigation altered an unrelated leaf or Plex center");
          await p.closeSidecar(c.host, false);
        } else check(!details.querySelector("[data-kplex-remove-field]"), "Inferred source exposed a destructive action");
      }
      const explicit = await create("Evidence-Explicit", `---\n${JSON.stringify(childField)}: ["[[${target.path}]]"]\n---\n`);
      await p.index.prepareRelationshipPair(explicit.path, target.path); await center(explicit.path); focus(c.host);
      const pair = { kind: "edge", origin: ref(p.index.get(explicit.path)), target: ref(p.index.get(target.path)) };
      const opened = await dispatch("relationship.relink", pair); check(opened.status === "opened", "Single-source relink unavailable");
      const relation = await modal(".kplex-relation-modal"); select(relation.querySelector("#kplex-relation-modal-role"), "right");
      const storage = relation.querySelector("#kplex-relation-modal-storage"); if (storage) select(storage, explicit.path);
      await until(() => relation.querySelector("button.mod-cta")?.disabled === false, "Relink save unavailable"); relation.querySelector("button.mod-cta").click();
      await until(() => !relation.isConnected, "Exact-storage relink did not settle", 30000); await ontology(explicit, target, "right");
      check(!JSON.stringify(app.metadataCache.getFileCache(explicit)?.frontmatter?.[childField] ?? []).includes(target.basename), "Relink retained old exact stored field");
      return { ambiguousAndInferred: "inspection without mutation", explicitStorage: explicit.path };
    });

    await scenario("H20-palette-selected-origin-multiple-surfaces-external-invalidation", async () => {
      await center(c.a.path); const existingSidebars = new Set(app.workspace.getLeavesOfType("k-plex-sidepanel-view")); await p.activateSidepanel();
      await until(() => [...p.actionSurfaceHosts].some(([, registration]) => registration.leaf.view.getViewType() === "k-plex-sidepanel-view"), "Sidebar surface missing");
      const entry = [...p.actionSurfaceHosts].find(([, registration]) => registration.leaf.view.getViewType() === "k-plex-sidepanel-view");
      const sidebar = entry[1].leaf; if (!existingSidebars.has(sidebar)) c.leaves.push(sidebar);
      // Surface registration precedes its asynchronous neighborhood projection. The finite picker
      // intentionally snapshots at launch, so establish the real rendered fixture before opening it.
      await surface(sidebar);
      // Opening a new sidepanel follows the active document as before this action assignment.
      // Explicitly establish A afterward; this probe tests selected-versus-center routing, not startup navigation.
      await center(c.a.path);
      await until(() => {
        c.sidebarReadiness = { center: root(sidebar)?.querySelector('.kplex-role-center')?.dataset.kplexPath,
          displayed: [...root(sidebar)?.querySelectorAll('[data-kplex-path]') ?? []].map(element => element.dataset.kplexPath),
          snapshot: p.actionManager.readSnapshot(entry[0]) };
        return root(sidebar)?.querySelector(`.kplex-role-center[data-kplex-path="${CSS.escape(c.a.path)}"]`) &&
          root(sidebar)?.querySelector(`[data-kplex-path="${CSS.escape(`${c.folder}/Picker-child.md`)}"]`);
      }, "Sidebar fixture projection did not become ready");
      const selected = await pickNode("Picker-child", entry[0], sidebar);
      check(selected.node.path !== c.a.path, "Sidebar selected test did not choose a neighbor");
      const selectedFile = app.vault.getFileByPath(selected.node.path); check(selectedFile, "Selected saved-origin fixture is not physical Markdown");
      const originalSelectedBytes = await app.vault.read(selectedFile), originalCenterBytes = await app.vault.read(c.a), beforeLegacy = c.created.length;
      check(app.commands.executeCommandById("k-plex:kplex-add-child"), "Legacy Add command unavailable with a selected neighbor");
      const savedLegacy = await configureComposer("child"); check(savedLegacy.querySelector(".modal-title").textContent.includes(c.a.basename), "Legacy Add followed selection rather than captured shared center");
      input(savedLegacy.querySelector(".kplex-add-related-note-search input"), `Legacy-A-child-${c.runToken}`); await submit(savedLegacy);
      check(c.created.length === beforeLegacy + 1, "Legacy Add did not create exactly one owned note"); const legacyFile = c.created.at(-1); await ontology(c.a, legacyFile, "child");
      check(await app.vault.read(selectedFile) === originalSelectedBytes && await app.vault.read(c.a) !== originalCenterBytes, "Legacy saved relationship wrote selected C instead of only center A");
      check(p.settings.lastActivePath === c.a.path && p.actionManager.readSnapshot(c.surfaceId).center.path === c.a.path, "Legacy Return changed shared center A");
      await pickNode(selectedFile.basename, entry[0], sidebar);
      const afterLegacyCenterBytes = await app.vault.read(c.a), beforeSelected = c.created.length;
      check(app.commands.executeCommandById("command-palette:open"), "Native command palette unavailable");
      const prompt = await modal(".modal-container .prompt"), label = p.translator("actions.relationship.create-selected.child"); input(prompt.querySelector("input"), label);
      await until(() => { c.paletteAvailability = { label, pureCheck: p.actionManager.check({ id: "relationship.create-selected.child", source: "obsidian-command" }),
        registered: app.commands.commands['k-plex:kplex-action-relationship-create-selected-child']?.name,
        nativeCheck: app.commands.commands['k-plex:kplex-action-relationship-create-selected-child']?.checkCallback?.(true),
        surfaces: [...p.actionSurfaceHosts.keys()].map(id => ({ id, snapshot: p.actionManager.readSnapshot(id) })),
        activeLeafType: app.workspace.activeLeaf?.view?.getViewType(), recentLeafType: app.workspace.getMostRecentLeaf()?.view?.getViewType(),
        rows: [...prompt.querySelectorAll('.suggestion-item')].map(element => element.textContent), query: prompt.querySelector('input')?.value };
        return prompt.querySelector(".suggestion-item")?.textContent.includes(label); }, "Published selected action missing from native palette");
      prompt.querySelector("input").focus(); await key("Enter"); const composer = await configureComposer("child");
      check(composer.querySelector(".modal-title").textContent.includes(p.index.titleFor(p.index.get(selected.node.path))), "Palette origin selected a different surface/center");
      input(composer.querySelector(".kplex-add-related-note-search input"), `Selected-C-child-${c.runToken}`); await submit(composer);
      check(c.created.length === beforeSelected + 1, "Selected Add did not create exactly one owned note"); const selectedChild = c.created.at(-1); await ontology(selectedFile, selectedChild, "child");
      check(await app.vault.read(c.a) === afterLegacyCenterBytes && await app.vault.read(selectedFile) !== originalSelectedBytes, "Selected saved relationship wrote center A rather than only captured C");
      check(p.settings.lastActivePath === c.a.path && p.actionManager.readSnapshot(c.surfaceId).center.path === c.a.path, "Selected Return changed shared center A");
      c.scenarios.push({ id: "H04-legacy-center-and-published-selected-save-different-origins", status: "passed", detail: { center: c.a.path, selected: selectedFile.path, legacyCreated: legacyFile.path, selectedCreated: selectedChild.path, returnRetainedCenter: true } });
      app.workspace.setActiveLeaf(c.editor, { focus: true }); c.editor.view.editor?.focus();
      // A background selected command follows the design's last deliberately interacted surface;
      // it must keep valid C rather than silently retargeting to active document B or shared center A.
      const backgroundSelected = await p.actionManager.dispatch({ id: "relationship.create-selected.child", source: "obsidian-command" });
      check(backgroundSelected.status === "opened", "Background selected command lost its valid resolved occurrence");
      const background = await configureComposer("child");
      check(background.querySelector(".modal-title").textContent.includes(p.index.titleFor(p.index.get(selected.node.path))), "Background selected command retargeted to the active editor or shared center");
      await close(background);
      check(await app.vault.read(c.editorFile) === '# Owned workflow fixture\n', "Background selected command changed unrelated editor B");
      check(app.commands.executeCommandById("k-plex:kplex-add-child"), "Legacy background Add command unavailable");
      const legacy = await configureComposer("child"); check(legacy.querySelector(".modal-title").textContent.includes(c.a.basename), "Legacy background Add drifted from shared center"); await close(legacy);
      return { surfaces: [c.surfaceId, entry[0]], selectedOrigin: selected.node.path, sharedCenter: c.a.path };
    });

    await scenario("H21-overflow-filter-retirement-no-hydration-resurrection", async () => {
      const children = []; for (let index = 0; index < 24; index++) children.push(await create(`Overflow-${String(index).padStart(2, "0")}`));
      const origin = await create("Overflow-Origin", `---\n${JSON.stringify(p.defaultOntologyField("child"))}: ${JSON.stringify(children.map(file => `[[${file.path}]]`))}\n---\n`);
      for (const file of children) await p.index.prepareRelationshipPair(origin.path, file.path);
      await center(origin.path); focus(c.host);
      // Newly prepared relationships finish native layout after the center first appears.
      // Start selection only when the exact last overflow row and its scroll capacity settle.
      let previousOverflowGeometry, stableOverflowGeometry = 0;
      await until(() => {
        const element = [...root(c.host).querySelectorAll("[data-kplex-keyboard-id]")].find(node => node.dataset.kplexPath === children.at(-1).path);
        const scroll = element?.closest(".kplex-zone-scroll, .kplex-expanded-scroll"), bounds = element?.getBoundingClientRect();
        if (!scroll || !bounds || scroll.scrollHeight <= scroll.clientHeight) return false;
        const geometry = [bounds.top,bounds.bottom,scroll.scrollHeight,scroll.clientHeight];
        stableOverflowGeometry = previousOverflowGeometry && geometry.every((value,index)=>Math.abs(value-previousOverflowGeometry[index])<0.01) ? stableOverflowGeometry+1 : 0;
        previousOverflowGeometry = geometry; return stableOverflowGeometry >= 3;
      }, "Owned overflow layout did not settle before selection");
      const selected = await pickNode(children.at(-1).basename);
      check(selected.node.path === children.at(-1).path, "Overflow picker selected a different occurrence");
      // Snapshot selection is synchronous; its rendered occurrence and native scroll settle later.
      // Reacquire only this exact selected path/occurrence, never an old element or another row.
      await until(() => {
        const snapshot = p.actionManager.readSnapshot(c.surfaceId), element = [...root(c.host).querySelectorAll("[data-kplex-keyboard-id]")].find(node =>
          node.dataset.kplexKeyboardId === selected.occurrenceId && node.dataset.kplexPath === selected.node.path);
        const scroll = element?.closest(".kplex-zone-scroll, .kplex-expanded-scroll"), bounds = element?.getBoundingClientRect(), viewport = scroll?.getBoundingClientRect();
        c.overflowReveal = {expectedPath: selected.node.path, expectedOccurrence: selected.occurrenceId,
          currentPath: snapshot?.selected?.node.path, currentOccurrence: snapshot?.selected?.occurrenceId,
          connected: Boolean(element?.isConnected), scrollTop: scroll?.scrollTop, row: bounds ? {top: bounds.top, bottom: bounds.bottom} : null,
          viewport: viewport ? {top: viewport.top, bottom: viewport.bottom} : null};
        return snapshot?.selected?.node.path === selected.node.path && snapshot.selected.occurrenceId === selected.occurrenceId
          && element?.isConnected && scroll && scroll.scrollTop > 0 && bounds.top >= viewport.top - 2 && bounds.bottom <= viewport.bottom + 2;
      }, "Selecting clipped overflow did not reveal its exact row within the viewport");
      await dispatch("view.filters.open"); await until(() => document.querySelector(".kplex-filter-panel .kplex-quick-lens-row input"), "Quick filter UI missing");
      input(document.querySelector(".kplex-filter-panel .kplex-quick-lens-row input"), children[0].basename);
      await until(() => p.actionManager.readSnapshot(c.surfaceId)?.selected === null, "Filtered occurrence selection was not retired");
      document.querySelector(".kplex-filter-clear")?.click(); await until(() => !document.querySelector(".kplex-filter-clear"), "Filter clear did not apply");
      await p.index.prepareRelationshipPair(origin.path, children.at(-1).path); await p.index.publishHostMetadataPreview(children.at(-1).path);
      check(p.actionManager.readSnapshot(c.surfaceId).selected === null, "Undo/filter or background hydration resurrected retired occurrence");
      document.querySelector(".kplex-filter-panel button[aria-label='" + p.translator("filter.closePanel") + "']")?.click();
      return { overflowRows: children.length, retiredOccurrence: selected.occurrenceId };
    });

    await scenario("H25-folder-child-native-rename-replacement-and-context-capabilities", async () => {
      // Native ButtonComponent.setIcon replaces its text. Identify the existing Markdown icon,
      // retaining the default CTA fallback only when this disposable run selected Markdown.
      const markdownButton = element => [...element.querySelectorAll("button")].find(button =>
        button.querySelector("svg.lucide-file-text") || button.textContent.includes(p.translator("common.markdown")))
        ?? (p.settings.newNodeDefaultType === "markdown" ? element.querySelector("button.mod-cta") : null);
      const waitForMarkdown = async (element, nativeFolder) => {
        await until(() => {
          const name = element.querySelector(".kplex-create-folder-note-name-setting input"), validation = p.validateRelatedNoteName(name?.value ?? ""), dialog = [...p.actionDialogs.keys()].find(item => item.modalEl === element);
          c.folderSaveReadiness = { input: name?.value, validation: {valid: validation.valid, stem: validation.stem, existing: validation.existing?.path ?? null},
            nativeFolder: {path: nativeFolder.path, sameObject: app.vault.getFolderByPath(nativeFolder.path) === nativeFolder},
            modal: {connected: element.isConnected, opened: dialog?.opened, creating: dialog?.creating, pending: dialog?.pending, invalidated: dialog?.invalidated, noteName: dialog?.noteName},
            buttons: [...element.querySelectorAll("button")].slice(0, 6).map(button => ({text: button.textContent, aria: button.getAttribute("aria-label"), classes: button.className, disabled: button.disabled, icon: button.querySelector("svg")?.getAttribute("class")})) };
          const button = markdownButton(element); return button && !button.disabled;
        }, "Folder-child native save unavailable");
        return markdownButton(element);
      };
      const folderPath = `${c.folder}/Physical-folder`; await app.vault.createFolder(folderPath); c.owned.push(folderPath);
      await until(() => p.index.get(`folder:${folderPath}`), "Physical folder graph node missing");
      const target = ref(p.index.get(`folder:${folderPath}`)), outcome = await dispatch("relationship.create-selected.child", { kind: "explicit", node: target }, { continuation: "return" });
      check(outcome.status === "opened", "Supported folder-child action disabled"); const folderModal = await modal(".kplex-create-folder-note-modal");
      const nativeFolder = app.vault.getFolderByPath(folderPath), renamedPath = `${c.folder}/Physical-folder-renamed`;
      await app.fileManager.renameFile(nativeFolder, renamedPath); c.owned = c.owned.map(path => path === folderPath ? renamedPath : path);
      await until(() => folderModal.textContent.includes(renamedPath) && !folderModal.textContent.includes(`${folderPath}\n`), "Folder composer displayed origin did not follow same-native-folder rename");
      const displayedRenamedOrigin = folderModal.textContent.includes(renamedPath);
      const createdName = `Folder-child-created-${c.runToken}`;
      input(folderModal.querySelector(".kplex-create-folder-note-name-setting input"), createdName);
      const button = await waitForMarkdown(folderModal, nativeFolder); check(button && !button.disabled, "Folder-child native save unavailable");
      button.click(); await until(() => !folderModal.isConnected && app.vault.getFileByPath(`${renamedPath}/${createdName}.md`), "Folder rename did not retain original native destination", 30000);
      c.folderOriginProof = { displayedRenamedOrigin, savedPath: `${renamedPath}/${createdName}.md`, originalPathAbsent: !app.vault.getFileByPath(`${folderPath}/${createdName}.md`), sameNativeFolder: app.vault.getFolderByPath(renamedPath) === nativeFolder };
      const second = await dispatch("relationship.create-selected.child", { kind: "explicit", node: ref(p.index.get(`folder:${renamedPath}`)) }); check(second.status === "opened", "Second folder composer unavailable");
      const stale = await modal(".kplex-create-folder-note-modal"), child = app.vault.getFileByPath(`${renamedPath}/${createdName}.md`);
      await app.vault.delete(child, true); await app.vault.delete(nativeFolder, true); await app.vault.createFolder(renamedPath);
      input(stale.querySelector(".kplex-create-folder-note-name-setting input"), "Must-not-create"); const staleButton = await waitForMarkdown(stale, nativeFolder); staleButton.click(); await delay(50);
      check(stale.isConnected && !app.vault.getFileByPath(`${renamedPath}/Must-not-create.md`), "Replaced folder received stale creation"); await close(stale);
      c.folderOriginProof.replacementRefused = true;
      const typed = await create("Typed-contexts", `# Unique-workflow-heading\n#KplexWorkflowTag\n[[${c.folder}/Unresolved-workflow-target]]\nhttps://example.com/kplex-action-workflow\n`);
      const attachment = await app.vault.create(`${c.folder}/Workflow-attachment.txt`, "owned attachment\n"); c.owned.push(attachment.path); p.index.insertCreatedFile(attachment);
      await p.index.prepareRelationshipPair(typed.path, typed.path); await center(typed.path); focus(c.host);
      const tag = p.index.get("tag:#KplexWorkflowTag") ?? p.index.get("tag:KplexWorkflowTag"); check(tag, "Tag context fixture missing");
      const deniedTag = await dispatch("relationship.create-selected.child", { kind: "explicit", node: ref(tag) }); check(deniedTag.status === "unavailable", "Tag creation should remain unsupported");
      await dispatch("sections.toggle"); await until(() => root(c.host).textContent.includes("Unique-workflow-heading"), "Heading projection unavailable");
      const heading = await pickNode("Unique-workflow-heading"); check(heading.node.kind === "section", "Heading fixture did not select a section facet");
      const deniedHeading = await dispatch("relationship.create-selected.child"); check(deniedHeading.status === "unavailable", "Heading creation reinterpreted a section as a writable note");
      await dispatch("sections.toggle");
      // Projection folding, demanded source acquisition and independent URL publication finish at
      // separate native boundaries. Reuse canonical host preview; never fabricate virtual pages.
      await p.index.publishHostMetadataPreview(typed.path);
      let ghost, url;
      await until(() => {
        const paths = [...root(c.host).querySelectorAll("[data-kplex-path]")].map(element => element.dataset.kplexPath), pages = paths.map(path => p.index.get(path));
        ghost = pages.find(page => page && !page.file && !page.url && !page.isFolder && !page.isTag && page.path.includes("Unresolved-workflow-target"));
        url = pages.find(page => page?.url?.includes("kplex-action-workflow"));
        c.contextReadiness = { center: p.actionManager.readSnapshot(c.surfaceId)?.center?.path,
          displayed: pages.map((page,index) => ({path: paths[index], resolved: Boolean(page), physical: Boolean(page?.file), url: page?.url ?? null, folder: page?.isFolder, tag: page?.isTag})),
          unresolved: Object.keys(app.metadataCache.unresolvedLinks?.[typed.path] ?? {}).slice(0, 10),
          urlPublished: Boolean(p.index.get("https://example.com/kplex-action-workflow")), ghostReady: Boolean(ghost), urlReady: Boolean(url),
          settings: {showVirtualNodes: p.settings.showVirtualNodes, showURLNodes: p.settings.showURLNodes, showInferredNodes: p.settings.showInferredNodes},
          activeFilter: root(c.host).querySelector(".kplex-filter-clear")?.getAttribute("aria-label") ?? null };
        return ghost && url;
      }, "Ghost/URL context fixtures missing");
      const before = c.created.length;
      for (const page of [p.index.get(attachment.path), ghost, url]) {
        check(page, "Attachment context fixture missing"); const opened = await dispatch("relationship.create-selected.child", { kind: "explicit", node: ref(page) }); check(opened.status === "opened", "Supported context did not use canonical composer");
        const composer = await configureComposer("child"); check(composer.querySelector(".modal-title").textContent.includes(p.index.titleFor(page)), "Context composer drifted origin"); await close(composer);
      }
      check(c.created.length === before && !app.vault.getFileByPath(ghost.path), "Opening/cancelling context controls implicitly materialized a note");
      return { folderRename: "same native folder", replacement: "refused", unsupported: ["tag", "heading"], supportedComposerOrigins: ["attachment", "ghost", "url"], contextProbe: "open/cancel without implicit materialization" };
    });

    await scenario("H26-unrelated-Excalidraw-mode-switch-no-reopen", async () => {
      const companion = app.plugins.plugins["obsidian-excalidraw-plugin"];
      if (!companion?.createDrawing) return { unavailable: true, reason: "Enabled Excalidraw companion is absent" };
      c.companion = companion; c.originalCompanionRank = companion.settings.rank;
      const created = await companion.createDrawing("Workflow-unrelated.excalidraw.md", c.folder);
      const file = typeof created === "string" ? app.vault.getFileByPath(created) : created; check(file?.path.startsWith(`${c.folder}/`), "Companion drawing escaped owned fixture folder"); c.owned.push(file.path);
      const rankDialog = document.querySelector(".modal-container.excalidraw-release .modal:has(.excalidraw-rank)");
      if (rankDialog) { c.dialogs.add(rankDialog); await close(rankDialog); }
      const leaf = app.workspace.getLeaf("tab"); c.leaves.push(leaf); await leaf.openFile(file); await until(() => leaf.view.getViewType() === "excalidraw", "Companion drawing did not open");
      const bridge = typeof companion.ea?.toggleViewMode === "function" ? companion.ea : window.ExcalidrawAutomate;
      check(typeof bridge?.toggleViewMode === "function", "Companion canonical representation toggle unavailable");
      await until(() => leaf.view.excalidrawAPI && !leaf.view.excalidrawAPI.getAppState().isLoading, "Companion drawing API did not become ready");
      let reopenCalls = 0; const originalOpenFile = leaf.openFile;
      leaf.openFile = function (...args) { reopenCalls++; return originalOpenFile.apply(this, args); };
      c.wrappers.push(() => { leaf.openFile = originalOpenFile; });
      c.companionTransitions = [];
      const switchRepresentation = async (expected, message) => {
        const before = leaf.view, receipt = {expected, before: before.getViewType(), file: file.path}; c.companionTransitions.push(receipt);
        // The companion owns its normal representation state/mode bookkeeping. Direct native
        // setViewState bypasses that policy and may be rewritten back to the drawing view.
        const replacement = await bridge.toggleViewMode(before); receipt.returned = replacement?.getViewType() ?? null;
        await until(() => { receipt.actual = leaf.view.getViewType(); receipt.actualPath = leaf.getViewState().state.file; return receipt.actual === expected && receipt.actualPath === file.path; }, message);
        check(replacement === leaf.view, "Canonical companion toggle did not return the exact owned replacement");
      };
      const sharedCenter = p.settings.lastActivePath;
      const assertBackgroundComposer = async expectedMode => {
        const beforeOpen = reopenCalls; check(app.commands.executeCommandById("k-plex:kplex-add-child"), "Legacy background Add unavailable with unrelated drawing");
        const composer = await configureComposer("child"), origin = p.index.get(sharedCenter);
        check(composer.querySelector(".modal-title").textContent.includes(p.index.titleFor(origin)), "Unrelated drawing changed canonical background composer origin");
        await close(composer);
        check(p.settings.lastActivePath === sharedCenter && leaf.view.getViewType() === expectedMode && leaf.getViewState().state.file === file.path && reopenCalls === beforeOpen, "Background composer reopened or retargeted unrelated companion view");
      };
      await switchRepresentation("markdown", "Drawing-to-Markdown transition failed");
      const beforeMarkdownAction = reopenCalls;
      await dispatch("pin.toggle", { kind: "explicit", node: ref(p.index.get(c.a.path)) }); await delay(100);
      check(leaf.view.getViewType() === "markdown" && leaf.getViewState().state.file === file.path && reopenCalls === beforeMarkdownAction, "Background K-Plex action reopened the drawing");
      await assertBackgroundComposer("markdown");
      focus(c.host); await switchRepresentation("excalidraw", "Markdown-to-drawing transition failed");
      const beforeDrawingAction = reopenCalls;
      await dispatch("selection.center"); await delay(100); check(leaf.view.getViewType() === "excalidraw" && leaf.getViewState().state.file === file.path && reopenCalls === beforeDrawingAction, "Foreground K-Plex action forced unrelated Markdown view");
      await assertBackgroundComposer("excalidraw");
      return { modes: ["excalidraw", "markdown", "excalidraw"], fixture: file.path, composerOrigin: sharedCenter, backgroundReopens: 0, canonicalToggle: "ExcalidrawAutomate.toggleViewMode" };
    });
    return { scenarios: c.scenarios, trustedNativeKeys: c.trustedKeys ?? 0, canonicalRelationshipWrites: c.relationshipWrites, createdFiles: c.created.length };
  };
  c.timer = window.setTimeout(() => { c.task = run().then(value => { c.done = true; c.value = value; }, error => { c.done = true; c.error = String(error); }); }, 50);
  return JSON.stringify({ started: true, fixtureFolder: c.folder });
}

try {
  if (cli("vault", "info=path").replace(/^path\s+/, "") !== target.vault) throw new Error("CLI targets the wrong disposable vault");
  report.obsidian = cli("version");
  for (const name of ["main.js", "styles.css", "manifest.json"]) {
    const hash = path => createHash("sha256").update(readFileSync(path)).digest("hex");
    report.artifacts[name] = hash(join(root, "dist", name));
    if (report.artifacts[name] !== hash(join(target.pluginDir, name))) throw new Error(`Installed ${name} differs from the exact staged build`);
  }
  cli("dev:errors", "clear"); installed = true; const started = evaluate(`(${nativeWorkflowProbe.toString()})(${JSON.stringify(runToken)})`); ownedController = true; report.fixtureFolder = started.fixtureFolder;
  const deadline = Date.now() + 600000;
  while (true) {
    await wait(500); const state = readProgress("JSON.stringify({done:window.__kplexActionWorkflows?.done,error:window.__kplexActionWorkflows?.error,value:window.__kplexActionWorkflows?.value,scenarios:window.__kplexActionWorkflows?.scenarios,sidebarReadiness:window.__kplexActionWorkflows?.sidebarReadiness,pickerBefore:window.__kplexActionWorkflows?.pickerBefore,pickerSelection:window.__kplexActionWorkflows?.pickerSelection,paletteAvailability:window.__kplexActionWorkflows?.paletteAvailability,folderOriginProof:window.__kplexActionWorkflows?.folderOriginProof,folderSaveReadiness:window.__kplexActionWorkflows?.folderSaveReadiness,contextReadiness:window.__kplexActionWorkflows?.contextReadiness,overflowReveal:window.__kplexActionWorkflows?.overflowReveal,companionTransitions:window.__kplexActionWorkflows?.companionTransitions})", deadline);
    report.progress = state; writeFileSync(join(reportDir, "report.json"), JSON.stringify(report, null, 2));
    if (state.done) { if (state.error) throw new Error(state.error); report.result = state.value; break; }
    if (Date.now() > deadline) throw new Error("Native workflow acceptance deadline");
  }
  const errors = cli("dev:errors"); if (errors && !/^No errors captured\.?$/i.test(errors)) throw new Error(`Native JavaScript errors: ${errors}`);
  report.status = "passed";
} catch (error) { report.status = "failed"; report.error = String(error); }
finally {
  try {
    if (installed) {
      const cleanupStart = evaluate(`(()=>{const c=window.__kplexActionWorkflows;if(!c||c.runToken!==${JSON.stringify(runToken)})return JSON.stringify({absent:true});c.cancelled=true;window.clearTimeout(c.timer);c.cleanup=(async()=>{
        const errors=[],attempt=async fn=>{try{await fn()}catch(error){errors.push(String(error))}};
        await attempt(()=>c.task);
        for(const dialog of c.dialogs)await attempt(async()=>{if(!dialog.isConnected)return;(dialog.querySelector('.modal-close-button')??dialog.closest('.modal-container')?.querySelector('.modal-close-button'))?.click();if(dialog.isConnected){dialog.querySelector('input,button')?.focus();c.nativeWindow.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});c.nativeWindow.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'})}const end=Date.now()+5000;while(dialog.isConnected){if(Date.now()>end)throw Error('Owned dialog remained connected');await new Promise(resolve=>window.setTimeout(resolve,25))}});
        for(const release of c.wrappers.reverse())await attempt(release);
        for(const leaf of [...new Set(c.leaves)].reverse())await attempt(()=>leaf?.detach());
        await attempt(()=>c.p.updateActionPreferences(c.originalSettings.actionPreferences));Object.assign(c.p.settings,c.originalSettings);
        if(c.companion)c.companion.settings.rank=c.originalCompanionRank;
        for(const path of [...new Set(c.owned)].sort((a,b)=>b.length-a.length))await attempt(async()=>{const item=app.vault.getAbstractFileByPath(path);if(item)await app.vault.delete(item,true)});
        if(c.originalSettings.lastActivePath)await attempt(()=>c.p.notifyNavigation(c.originalSettings.lastActivePath));
        if(c.originalLeaf?.view.containerEl.isConnected)await attempt(()=>app.workspace.setActiveLeaf(c.originalLeaf,{focus:true}));
        await attempt(()=>c.p.saveSettings(false,false));await attempt(()=>c.p.settingsWriteQueue);
        if(app.vault.getFolderByPath(c.folder))errors.push('Owned fixture folder remains');if(errors.length)throw Error(errors.join('; '));return true;
      })().then(()=>{c.cleaned=true},error=>{c.cleanupError=String(error)});return JSON.stringify({cleanupStarted:true})})()`);
      if (cleanupStart.absent) report.cleanup = { controllerAbsent: true };
      else {
      ownedController = true;
      const deadline = Date.now() + 90000;
      while (true) { await wait(500); const state = evaluate("JSON.stringify({cleaned:window.__kplexActionWorkflows?.cleaned,error:window.__kplexActionWorkflows?.cleanupError})"); if (state.error) throw new Error(state.error); if (state.cleaned) break; if (Date.now() > deadline) throw new Error("Native workflow cleanup deadline"); }
      report.cleanup = evaluate("(()=>{const c=window.__kplexActionWorkflows;const remaining=c.owned.filter(path=>app.vault.getAbstractFileByPath(path)).length;const dialogs=[...c.dialogs].filter(dialog=>dialog.isConnected).length;if(!remaining&&!dialogs)delete window.__kplexActionWorkflows;return JSON.stringify({remainingOwned:remaining,remainingDialogs:dialogs,controllerRemoved:!window.__kplexActionWorkflows})})()");
      if (report.cleanup.remainingOwned || report.cleanup.remainingDialogs || !report.cleanup.controllerRemoved) throw new Error("Native workflow resources survived cleanup");
      }
    }
  } catch (error) { report.status = "failed"; report.cleanupError = String(error); }
  try {
    for (const item of configuration) {
      if (ownedController && item.writable) writeFileSync(item.path, item.bytes);
      if (item.bytes ? !readFileSync(item.path).equals(item.bytes) : existsSync(item.path)) throw new Error(`Configuration bytes changed: ${item.path}`);
    }
    report.configurationRestored = true;
  } catch (error) { report.status = "failed"; report.configurationRestoreError = String(error); }
  report.completedAt = new Date().toISOString(); writeFileSync(join(reportDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ status: report.status, error: report.error, cleanupError: report.cleanupError, report: join(reportDir, "report.json") }));
if (report.status !== "passed") process.exitCode = 1;
