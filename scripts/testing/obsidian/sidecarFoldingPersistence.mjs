/**
 * Serial exact-build persistence acceptance in the explicitly selected disposable small vault.
 * No note fixtures or note-body reads/writes are owned by this driver. Configuration and native
 * workspace backups remain private, independently of assertion success. Ordinary app:reload is
 * explicitly different from renderer interruption. The optional interruption gate targets only
 * this verified vault renderer; a main-process timer survives the renderer it deliberately retires.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, unlinkSync, writeFileSync} from "node:fs";
import {dirname, isAbsolute, join, relative, resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";
import {obsidianCliExecutable, spawnNativeSync} from "./processTools.mjs";
import {validateTarget} from "./runner.mjs";

const root = resolve(fileURLToPath(new URL("../../..", import.meta.url))), vault = process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vault, "kplex-test-small", "Select only the authorized disposable small vault");
const target = validateTarget({vaultName: vault, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR});
const output = process.env.KPLEX_HOST_REPORT_DIR;
const forceInterruption = process.env.KPLEX_FOLD_FORCE_RENDERER_CRASH === "true";
const resizeNative = process.env.KPLEX_FOLD_NATIVE_RESIZE === "true";
assert(output && isAbsolute(output), "Choose an explicit absolute private report directory");
assert(!existsSync(output) || readdirSync(output).length === 0, "Choose a fresh evidence directory");
mkdirSync(output, {recursive: true});
/** Backups must not become vault content or accidentally enter the source publication tree. */
const outside = parent => { const path = relative(parent, realpathSync(output)); return path && (isAbsolute(path) || path === ".." || path.startsWith(`..${sep}`)); };
assert(outside(target.vault) && outside(root), "Private reports and configuration backups must be outside the vault and source checkout");
const privateDirectory = join(output, "private-configuration"); mkdirSync(privateDirectory);
const source = readFileSync(fileURLToPath(import.meta.url)); writeFileSync(join(output, "driver-source.mjs"), source);
/** Hash only explicit executable/configuration bytes, never vault note payloads. */
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const configuration = [], report = {schemaVersion: 1, status: "running", acceptance: "incomplete", node: process.version,
  startedAt: new Date().toISOString(), driverSha256: digest(source), artifacts: {}, scenarios: [], pending: [],
  privacy: "Private configuration/workspace backups are not approved for publication. No note bodies are collected.",
  limitations: ["Native application renderer reload is not a renderer crash or full application/process restart.",
    "Optional forced interruption is confined to the selected verified renderer; it is not a full Electron application restart."]};
let before, mutated = false;

/** Keep each named-vault CLI operation bounded, including transient reload failures. */
function cli(command, ...args) {
  const result = spawnNativeSync(obsidianCliExecutable(), [`vault=${vault}`, command, ...args], {
    cwd: root, encoding: "utf8", timeout: 30000, killSignal: "SIGKILL", maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout ?? "")) throw Error(`Native ${command} failed: ${result.error?.message || result.stderr || result.stdout || String(result.status)}`);
  return result.stdout.trim();
}
/** Decode only the explicit JSON result; raw CLI transport is not treated as note evidence. */
function evaluate(code) { return JSON.parse(cli("eval", `code=${code}`).replace(/^=>\s*/, "")); }
/** Poll outside the renderer; production timers, throttling and native scheduling stay unchanged. */
const pause = milliseconds => new Promise(/** Resolve only this finite driver poll. */ done => setTimeout(done, milliseconds));
/** Wait through a real document replacement, rejecting a stale pre-reload renderer as completion. */
async function ready(previousTimeOrigin, enabled, milliseconds = 120000) {
  const deadline = Date.now() + milliseconds;
  let value, lastError;
  while (Date.now() < deadline) {
    try {
      value = evaluate("JSON.stringify((()=>{const w=require('@electron/remote').getCurrentWindow();return {vault:app.vault.getName(),timeOrigin:performance.timeOrigin,layoutReady:app.workspace.layoutReady,enabled:!!app.plugins.plugins['k-plex'],rendererPid:w.webContents.getOSProcessId(),webContentsId:w.webContents.id,url:w.webContents.getURL(),cpuPid:require('process').pid}})())");
      assert.equal(value.vault, vault, "Reload observation reached another vault");
      if (value.layoutReady && value.enabled === enabled && (previousTimeOrigin === undefined || value.timeOrigin !== previousTimeOrigin)) return value;
    } catch (error) { lastError = String(error.message ?? error); }
    await pause(250);
  }
  throw Error(`Native renderer did not become ready: ${lastError ?? JSON.stringify(value)}`);
}
/** Await an injected native operation while recording the exact failed phase and bounded result. */
async function runRenderer(label, operation, argumentsValue) {
  report.phase = label;
  evaluate(`(()=>{const task=window.__kplex173PersistenceTask={done:false,label:${JSON.stringify(label)}};Promise.resolve().then(()=>(${operation.toString()})(${JSON.stringify(argumentsValue ?? {})})).then(result=>{task.result=result;task.done=true},error=>{task.error=String(error.stack??error);task.done=true});return JSON.stringify({started:true})})()`);
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const task = evaluate("JSON.stringify((()=>{const t=window.__kplex173PersistenceTask;return {label:t?.label,done:t?.done,result:t?.result,error:t?.error}})())");
    assert.equal(task.label, label, "A retired controller cannot satisfy this phase");
    if (task.done) { assert(!task.error, task.error); return task.result; }
    await pause(100);
  }
  throw Error(`Native task deadline: ${label}`);
}
/** Project persisted model dimensions, not computed DOM pixels while a group is intentionally hidden. */
function allocations(layout, ids) {
  const found = {};
  /** Native layout is finite JSON; inspect only the tab groups containing this fixture's anchors. */
  const visit = value => {
    if (!value || typeof value !== "object") return;
    if (value.type === "tabs" && Array.isArray(value.children)) {
      for (const [name, id] of Object.entries(ids)) if (value.children.some(/** Match exact persisted native leaf identity. */ leaf => leaf.id === id)) {
        const fields = Object.fromEntries(["width", "height", "dimension", "size"].filter(/** Preserve every actually serialized allocation field. */ key => Object.hasOwn(value, key)).map(/** Keep native units and values unchanged. */ key => [key, value[key]]));
        found[name] = Object.keys(fields).length ? {mode: "explicit", fields} : {mode: "native-default"};
      }
    }
    for (const nested of Object.values(value)) if (nested && typeof nested === "object") {
      if (Array.isArray(nested)) for (const child of nested) visit(child); else visit(nested);
    }
  };
  visit(layout); assert(Object.keys(found).length === Object.keys(ids).length, "Serialized layout omitted a fixture tab group");
  // This host omits default dimensions. That absence is recorded explicitly; actual post-reload
  // visibility and relative geometry below, rather than equal empty objects, prove recoverability.
  return found;
}
/** Inspect native visibility and identity after plugin unload or a real new document generation. */
function inspectNative(input) {
  const leaves = []; app.workspace.iterateAllLeaves(/** Native iteration stops on truthy results, so collect references without returning push's count. */ leaf => { leaves.push(leaf); });
  const groups = {};
  for (const [name, id] of Object.entries(input.anchors)) {
    const leaf = leaves.find(/** Persisted native IDs survive an ordinary layout restoration. */ value => value.id === id);
    const element = leaf?.parent?.containerEl, rectangle = element?.getBoundingClientRect();
    groups[name] = {found: Boolean(leaf), connected: Boolean(element?.isConnected), width: rectangle?.width ?? 0, height: rectangle?.height ?? 0,
      display: element ? element.ownerDocument.defaultView.getComputedStyle(element).display : null,
      type: leaf?.getViewState().type};
  }
  return {groups, controls: document.querySelectorAll(".kplex-sidecar-unfold-plex").length,
    hiddenGroups: document.querySelectorAll(".kplex-folded-workspace-group,[data-kplex-fold-owner]").length,
    enabled: Boolean(app.plugins.plugins["k-plex"]), layout: app.workspace.getLayout(), timeOrigin: performance.timeOrigin};
}
/** Assert genuine reachable groups; a nonpersistent JavaScript map alone is insufficient proof. */
function assertExpanded(value, expectedEnabled, expectedShare) {
  assert.equal(value.enabled, expectedEnabled); assert.equal(value.controls, 0); assert.equal(value.hiddenGroups, 0);
  for (const group of Object.values(value.groups)) assert(group.found && group.connected && group.width > 8 && group.height > 8 && group.display !== "none", "Restored native group is absent or unreachable");
  const share = value.groups.host.width / (value.groups.host.width + value.groups.companion.width);
  assert(Math.abs(share - expectedShare) < 0.02, `Native restored split share changed: ${share} versus ${expectedShare}`);
}
/** Set the runtime plugin state first and explicitly verify the configured next-restart state. */
function pluginEnabled(enabled) {
  const loaded = evaluate("JSON.stringify(Boolean(app.plugins.plugins['k-plex']))");
  if (loaded !== enabled) cli(enabled ? "plugin:enable" : "plugin:disable", "id=k-plex");
  const path = join(target.config, "community-plugins.json"), configured = JSON.parse(readFileSync(path, "utf8"));
  assert(Array.isArray(configured), "Native enabled-plugin configuration is malformed");
  if (configured.includes("k-plex") !== enabled) {
    const changed = enabled ? [...configured, "k-plex"] : configured.filter(/** Preserve every unrelated plugin and its order. */ id => id !== "k-plex");
    writeFileSync(path, JSON.stringify(changed, null, 2));
    (report.explicitEnablementWrites ??= []).push({enabled});
  }
  assert.equal(JSON.parse(readFileSync(path, "utf8")).includes("k-plex"), enabled);
}
/** Prepare normal native groups using an existing physical center and only owned Empty tabs. */
async function preparePair(input) {
  const p = app.plugins.plugins["k-plex"], workspace = app.workspace;
  const native = require("@electron/remote").getCurrentWindow(); native.show(); native.focus(); native.webContents.focus();
  if (!p || p.collapsedPlexHosts.size) throw Error("An enabled plugin without an existing fold is required");
  const host = workspace.getLeavesOfType("k-plex-react-view")[0]; if (!host) throw Error("Existing native K-Plex required");
  await host.view.waitUntilReady();
  const page = p.index.get(p.settings.lastActivePath); if (!page?.file) throw Error("An existing physical center is required");
  p.settings.sidecarPosition = "right"; await p.openSidecar(host, page);
  const companion = p.sidecarLeaves.get(host); if (!companion) throw Error("Normal managed companion did not open");
  const anchors = {};
  for (const [name, leaf] of [["host", host], ["companion", companion]]) {
    const extra = workspace.createLeafInParent(leaf.parent, leaf.parent.children.length);
    await extra.setViewState({type: "empty", active: false}); anchors[name] = extra.id;
  }
  workspace.setActiveLeaf(host, {focus: true});
  await new Promise(/** Measure only after owning native flex layout has settled. */ done => window.requestAnimationFrame(/** Require the next committed native frame. */ () => window.requestAnimationFrame(done)));
  let candidate = p.readPlexFoldCandidate(host); if (!candidate || candidate.hostShare === null) throw Error("Prepared layout is not an isolated safe two-group pair");
  let resize;
  if (input.resize) {
    const hostRect = candidate.hostGroup.getBoundingClientRect(), otherRect = candidate.sidecarGroup.getBoundingClientRect();
    const boundary = hostRect.right, handles = [...candidate.split.querySelectorAll(":scope > .workspace-tabs > .workspace-leaf-resize-handle")];
    const handle = handles.find(/** Only the actual internal native divider may receive trusted drag input. */ element => {
      const r = element.getBoundingClientRect(); return r.width > 0 && r.height > 8 && Math.abs(r.left + r.width / 2 - boundary) < 12;
    });
    if (!handle) throw Error("Native internal divider prerequisite unavailable");
    const r = handle.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (!handle.contains(document.elementFromPoint(x, y))) throw Error("Native divider is obscured");
    const initialShare = candidate.hostShare, zoom = native.webContents.getZoomFactor(), delta = (hostRect.width + otherRect.width) * 0.12;
    native.webContents.sendInputEvent({type: "mouseMove", x: Math.round(x * zoom), y: Math.round(y * zoom)});
    native.webContents.sendInputEvent({type: "mouseDown", x: Math.round(x * zoom), y: Math.round(y * zoom), button: "left", clickCount: 1});
    try {
      for (const fraction of [1 / 3, 2 / 3, 1]) {
        native.webContents.sendInputEvent({type: "mouseMove", x: Math.round((x + delta * fraction) * zoom), y: Math.round(y * zoom), button: "left"});
        await new Promise(/** Native divider motion owns allocation; wait for its actual owning frame. */ done => window.requestAnimationFrame(done));
      }
    } finally { native.webContents.sendInputEvent({type: "mouseUp", x: Math.round((x + delta) * zoom), y: Math.round(y * zoom), button: "left", clickCount: 1}); }
    await new Promise(/** Observe settled native flex geometry without writing test CSS. */ done => window.requestAnimationFrame(/** The next native frame settles resize delivery. */ () => window.requestAnimationFrame(done)));
    candidate = p.readPlexFoldCandidate(host);
    if (!candidate || candidate.hostShare === null || Math.abs(candidate.hostShare - initialShare) < 0.05) throw Error("Trusted native divider drag did not establish asymmetric allocation");
    resize = {initialShare, share: candidate.hostShare, trustedNativeDrag: true};
  }
  workspace.requestSaveLayout(); await workspace.requestSaveLayout.run();
  const normalLayout = workspace.getLayout();
  await p.collapsePlexForSidecar(host);
  if (!p.isPlexFoldedForSidecar(host)) throw Error("Prepared native pair did not fold");
  workspace.requestSaveLayout(); await workspace.requestSaveLayout.run();
  return {hostId: host.id, companionId: companion.id, anchors, normalLayout, foldedLayout: workspace.getLayout(), share: candidate.hostShare,
    controls: candidate.ownerWindow.document.querySelectorAll(".kplex-sidecar-unfold-plex").length, resize};
}
/** Rebuild the original native fixture between cases; use existing settings persistence ownership. */
async function restoreRuntime(input) {
  const p = app.plugins.plugins["k-plex"];
  if (p) for (const host of [...p.collapsedPlexHosts.keys()]) p.restorePlexFoldBeforeReveal(host);
  await app.workspace.setLayout(input.layout);
  await new Promise(/** Let the replacement native view mount before restoring its saved preferences. */ done => window.requestAnimationFrame(/** Settle the next owning frame. */ () => window.requestAnimationFrame(done)));
  if (p && input.settings) { Object.assign(p.settings, structuredClone(input.settings)); await p.saveSettings(false, false); }
  app.workspace.requestSaveLayout(); await app.workspace.requestSaveLayout.run();
  return {layout: app.workspace.getLayout(), controls: document.querySelectorAll(".kplex-sidecar-unfold-plex").length,
    hiddenGroups: document.querySelectorAll(".kplex-folded-workspace-group").length};
}
/** Use the established native app command and require a genuinely new performance time origin. */
async function reload(enabled) {
  const prior = await ready(undefined, enabled);
  evaluate("(()=>{if(!app.commands.commands['app:reload'])throw Error('Native app:reload is unavailable');window.setTimeout(/** Reload only this named vault renderer after CLI acknowledgment. */ ()=>app.commands.executeCommandById('app:reload'),100);return JSON.stringify({scheduled:true})})()");
  const after = await ready(prior.timeOrigin, enabled); assert.equal(after.cpuPid, after.rendererPid, "Selected CPU process is not its native renderer");
  return {before: prior, after, lifecycle: "ordinary app:reload; not renderer interruption"};
}
/** Force only the validated renderer after saving normal native allocation; recovery runs in main. */
async function interruptRenderer() {
  const prior = await ready(undefined, true);
  assert.equal(prior.cpuPid, prior.rendererPid); assert.equal(prior.vault, vault);
  const enabledPath = join(target.config, "community-plugins.json"), configured = JSON.parse(readFileSync(enabledPath, "utf8"));
  assert(configured.includes("k-plex"));
  // Next startup is disabled while the current renderer remains genuinely folded and loaded.
  writeFileSync(enabledPath, JSON.stringify(configured.filter(/** Preserve all unrelated native enablement. */ id => id !== "k-plex"), null, 2));
  const mainOperation = function (contents, expected, registry) {
    /** Process-isolation check reads IDs/PIDs only, never other windows' URLs, titles or vault data. */
    const exclusive = () => registry.getAllWebContents().every(/** Never interrupt a renderer shared by another native surface. */ other => other.isDestroyed() || other.id === contents.id || other.getOSProcessId() !== expected.rendererPid);
    if (contents.isDestroyed() || contents.id !== expected.webContentsId || contents.getOSProcessId() !== expected.rendererPid || contents.getURL() !== expected.url) throw Error("Refuse interrupting a different native renderer");
    if (!exclusive()) throw Error("Refuse interrupting a renderer process shared by another native surface");
    if (contents.__kplex173Interruption) throw Error("An interruption already owns this renderer");
    const receipt = contents.__kplex173Interruption = {webContentsId: contents.id, oldRendererPid: contents.getOSProcessId(), mainPid: process.pid, scheduledAt: Date.now()};
    /** This main-process listener survives the retired renderer and records actual termination. */
    const gone = (_event, details) => {
      receipt.goneAt = Date.now(); receipt.reason = details.reason; receipt.exitCode = details.exitCode;
      if (receipt.issuedAt) setTimeout(/** Reload this same surviving webContents, never another application window. */ () => { if (!contents.isDestroyed()) { receipt.reloadAt = Date.now(); contents.reload(); } }, 100);
    };
    contents.once("render-process-gone", gone);
    setTimeout(/** Revalidate exact process identity immediately before intentional interruption. */ () => {
      if (contents.isDestroyed() || contents.getOSProcessId() !== expected.rendererPid || !exclusive()) { receipt.failure = "Renderer changed or became shared before interruption"; contents.removeListener("render-process-gone", gone); return; }
      receipt.issuedAt = Date.now(); contents.forcefullyCrashRenderer();
    }, 150);
    return {scheduled: true, webContentsId: contents.id, rendererPid: contents.getOSProcessId()};
  };
  report.phase = "forced-renderer-interruption";
  const scheduled = evaluate(`(()=>{const p=app.plugins.plugins['k-plex'];if(app.vault.getName()!==${JSON.stringify(vault)}||!p||p.collapsedPlexHosts.size!==1)throw Error('Selected renderer is not genuinely folded');const remote=require('@electron/remote'),contents=remote.getCurrentWindow().webContents;return JSON.stringify(remote.require('vm').runInThisContext(${JSON.stringify(`(${mainOperation.toString()})`)})(contents,${JSON.stringify(prior)},remote.require('electron').webContents))})()`);
  assert.equal(scheduled.webContentsId, prior.webContentsId);
  const after = await ready(prior.timeOrigin, false);
  assert.equal(after.webContentsId, prior.webContentsId); assert.notEqual(after.rendererPid, prior.rendererPid);
  const receipt = evaluate("(()=>{const remote=require('@electron/remote'),contents=remote.getCurrentWindow().webContents;return remote.require('vm').runInThisContext('(function(contents){const receipt=contents.__kplex173Interruption;delete contents.__kplex173Interruption;return JSON.stringify(receipt)})')(contents)})()");
  assert(receipt.issuedAt && receipt.goneAt && receipt.reloadAt && !receipt.failure);
  assert(["crashed", "killed"].includes(receipt.reason), `Native process did not report forced termination: ${receipt.reason}`);
  return {before: prior, after, receipt, lifecycle: "forced selected-renderer interruption followed by disabled renderer startup"};
}
/** Save and verify exact private backup bytes before any native mutation or destructive lifecycle step. */
function backup() {
  for (const name of ["plugins/k-plex/data.json", "community-plugins.json", "workspace.json", "workspace-mobile.json", "app.json", "appearance.json"]) {
    const path = join(target.config, name), bytes = existsSync(path) ? readFileSync(path) : null, saved = join(privateDirectory, name);
    if (bytes) { mkdirSync(dirname(saved), {recursive: true}); writeFileSync(saved, bytes); assert(readFileSync(saved).equals(bytes)); }
    configuration.push({name, path, saved, bytes});
  }
  const manifest = configuration.map(/** Persist existence and checksums, never an inferred default configuration. */ item => ({name: item.name, present: item.bytes !== null, sha256: item.bytes === null ? null : digest(item.bytes)}));
  writeFileSync(join(privateDirectory, "MANIFEST.json"), JSON.stringify(manifest, null, 2) + "\n"); report.backupVerified = true;
}
/** Restore exact presence and bytes; independently attempt every file even if another restoration fails. */
function restoreConfiguration() {
  const failures = [];
  for (const item of configuration) {
    try {
      if (item.bytes !== null) { mkdirSync(dirname(item.path), {recursive: true}); writeFileSync(item.path, item.bytes); }
      else if (existsSync(item.path)) unlinkSync(item.path);
      assert(item.bytes !== null ? readFileSync(item.path).equals(item.bytes) : !existsSync(item.path));
    } catch (error) { failures.push(`${item.name}: ${String(error.message ?? error)}`); }
  }
  assert(failures.length === 0, failures.join("; ")); report.configurationBytesRestored = true;
}

try {
  assert.equal(realpathSync(cli("vault", "info=path").replace(/^path\s+/, "")), target.vault); report.host = cli("version");
  for (const name of ["main.js", "styles.css", "manifest.json"]) {
    const built = readFileSync(join(root, "dist", name)), installed = readFileSync(join(target.pluginDir, name));
    assert(built.equals(installed), `Stage the exact build first: ${name}`); report.artifacts[name] = digest(built);
  }
  await ready(undefined, true); backup();
  before = evaluate("JSON.stringify((()=>{const p=app.plugins.plugins['k-plex'];if(!p||p.collapsedPlexHosts.size)throw Error('Clean enabled plugin required');return {layout:app.workspace.getLayout(),settings:structuredClone(p.settings),fileCount:app.vault.getFiles().length,markdownCount:app.vault.getMarkdownFiles().length}})())");
  writeFileSync(join(privateDirectory, "runtime-before.json"), JSON.stringify(before, null, 2) + "\n");
  cli("dev:errors", "clear"); mutated = true;
  pluginEnabled(true);
  const first = await runRenderer("prepare-fold-and-save", preparePair, {resize: resizeNative});
  assert.equal(first.controls, 1);
  const beforeAllocation = allocations(first.normalLayout, first.anchors), foldedAllocation = allocations(first.foldedLayout, first.anchors);
  assert.deepEqual(foldedAllocation, beforeAllocation, "Folding changed serialized native dimensions");
  const foldedDisk = readFileSync(join(target.config, "workspace.json"));
  writeFileSync(join(privateDirectory, "first-folded-workspace.json"), foldedDisk);
  assert.deepEqual(allocations(JSON.parse(foldedDisk), first.anchors), beforeAllocation, "Saved workspace contains collapsed native allocation");
  report.scenarios.push({id: "folded-save-retains-native-allocation", status: "passed", share: first.share, resize: first.resize, beforeAllocation, foldedAllocation, savedWorkspaceSha256: digest(foldedDisk)});
  if (Math.abs(first.share - 0.5) < 0.05) report.pending.push({id: "asymmetric-native-split-share", reason: "Prepared split was approximately 50/50; no characterized public resize API or trusted native divider drag is available in this driver. No inline flex dimensions were manufactured."});
  pluginEnabled(false); await ready(undefined, false);
  const disabled = await runRenderer("plugin-disable-live-group-restoration", inspectNative, {anchors: first.anchors}); assertExpanded(disabled, false, first.share);
  report.scenarios.push({id: "plugin-disable-restores-live-groups", status: "passed", groups: disabled.groups});

  pluginEnabled(true); await ready(undefined, true);
  await runRenderer("restore-opening-fixture-between-cases", restoreRuntime, before);
  const second = await runRenderer("prepare-native-enabled-reload", preparePair, {resize: resizeNative});
  const secondAllocation = allocations(second.normalLayout, second.anchors);
  assert.deepEqual(allocations(second.foldedLayout, second.anchors), secondAllocation);
  const enabledReload = await reload(true);
  const reopened = await runRenderer("inspect-enabled-native-reload", inspectNative, {anchors: second.anchors}); assertExpanded(reopened, true, second.share);
  assert.deepEqual(allocations(reopened.layout, second.anchors), secondAllocation, "Enabled restart changed normal native allocation");
  report.scenarios.push({id: "ordinary-enabled-app-reload-starts-expanded", status: "passed", lifecycle: enabledReload, groups: reopened.groups, allocation: allocations(reopened.layout, second.anchors)});

  pluginEnabled(false); await ready(undefined, false);
  const disabledReload = await reload(false);
  const reopenedDisabled = await runRenderer("inspect-disabled-native-reload", inspectNative, {anchors: second.anchors}); assertExpanded(reopenedDisabled, false, second.share);
  report.scenarios.push({id: "ordinary-disabled-app-reload-keeps-native-groups-reachable", status: "passed", lifecycle: disabledReload, groups: reopenedDisabled.groups});
  if (forceInterruption) {
    pluginEnabled(true); await ready(undefined, true);
    await runRenderer("restore-before-forced-interruption", restoreRuntime, before);
    const third = await runRenderer("prepare-genuine-fold-before-interruption", preparePair, {resize: resizeNative});
    writeFileSync(join(privateDirectory, "interrupted-folded-workspace.json"), readFileSync(join(target.config, "workspace.json")));
    const interruption = await interruptRenderer();
    const recovered = await runRenderer("inspect-disabled-interruption-recovery", inspectNative, {anchors: third.anchors});
    assertExpanded(recovered, false, third.share);
    assert.deepEqual(allocations(recovered.layout, third.anchors), allocations(third.normalLayout, third.anchors));
    report.scenarios.push({id: "forced-renderer-interruption-then-disabled-startup", status: "passed", lifecycle: interruption, groups: recovered.groups, share: third.share});
  } else report.pending.push({id: "forced-renderer-interruption-then-disabled-startup", reason: "Not executed. Set KPLEX_FOLD_FORCE_RENDERER_CRASH=true only for this explicitly authorized disposable renderer gate; ordinary reload is not a substitute."});
  report.acceptance = report.pending.length ? "incomplete" : "complete";
  report.status = report.pending.length ? "partial" : "passed";
} catch (error) { report.status = "failed"; report.error = String(error.stack ?? error); }
finally {
  if (mutated) {
    try {
      pluginEnabled(false); await ready(undefined, false);
      restoreConfiguration();
      pluginEnabled(true); await ready(undefined, true);
      const restored = await runRenderer("restore-original-runtime-and-workspace", restoreRuntime, before);
      assert.equal(restored.controls, 0); assert.equal(restored.hiddenGroups, 0); report.runtimeRestored = true;
      evaluate("JSON.stringify(delete window.__kplex173PersistenceTask)");
    } catch (error) { report.status = "failed"; report.runtimeRestoreError = String(error.stack ?? error); }
  }
  if (configuration.length) {
    try { restoreConfiguration(); }
    catch (error) { report.status = "failed"; report.configurationRestoreError = String(error.stack ?? error); }
  }
  if (mutated) {
    try {
      const counts = evaluate("JSON.stringify({fileCount:app.vault.getFiles().length,markdownCount:app.vault.getMarkdownFiles().length})");
      assert.equal(counts.fileCount, before.fileCount); assert.equal(counts.markdownCount, before.markdownCount); report.noteInventoryUnchanged = true;
      report.nativeErrors = cli("dev:errors"); assert(/^No errors captured\.?$/i.test(report.nativeErrors), report.nativeErrors);
    } catch (error) { report.status = "failed"; report.finalObservationError = String(error.stack ?? error); }
  }
  report.completedAt = new Date().toISOString(); writeFileSync(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify({status: report.status, acceptance: report.acceptance, passedCases: report.scenarios.length, pending: report.pending.map(/** Report only finite gate IDs in the terminal. */ item => item.id), report: join(output, "report.json")}));
process.exitCode = report.status === "failed" ? 1 : report.status === "partial" ? 2 : 0;
