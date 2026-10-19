/**
 * Issue 114 exact-build acceptance in the explicit disposable small vault. Native notes exercise
 * defined direction precedence, both central endpoints, real SVG markers, display inversion,
 * inferred visibility, repeated reconciliation and warm plugin reload with a second view.
 * Own only fixture notes/settings/workspace/controller, and restore them on assertion failure.
 * Baseline mode characterizes the unfixed BOTH result; it never grants candidate acceptance.
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
const baseline = process.env.KPLEX_ARROW_EXPECT_BASELINE === "true";
const report = { status: "running", baseline, node: process.version, host: `${process.platform} ${release()}`,
  startedAt: new Date().toISOString(), driverSha256: createHash("sha256").update(driver).digest("hex"), artifacts: {}, observations: [] };

/** Reject renderer errors even when the console launcher itself returns success. */
function cli(command, ...args) {
  const result = spawnNativeSync(obsidianCliExecutable(), [`vault=${vaultName}`, command, ...args],
    { cwd: projectRoot, encoding: "utf8", timeout: 30_000, killSignal: "SIGKILL", maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout)) throw result.error ?? Error(result.stderr || result.stdout);
  return result.stdout.trim();
}
/** Return detached finite facts rather than retaining renderer objects through reload. */
function evaluate(code) {code=withNativeDocumentSessions(code); return JSON.parse(cli("eval", `code=${code}`).replace(/^=>\s*/, "")); }
/** Outer waits leave the actual host event loop free. */
const delay = milliseconds => new Promise(done => setTimeout(done, milliseconds));

/** Install an independently cancellable probe in the selected native renderer. */
function installProbe(expectBaseline) {
  const p = app.plugins.plugins["k-plex"], remote = require("@electron/remote"), win = remote.getCurrentWindow();
  if (!p?.index || window.__kplexArrowProbe || app.setting.isOpen || document.querySelector(".modal-container,.menu")) throw Error("Clean native prerequisites required");
  const c = window.__kplexArrowProbe = { originalSettings: structuredClone(p.settings), originalLayout: app.workspace.getLayout(),
    owners: { documents:documentSessions(p).capture(), last: p.lastDocumentLeaf, recent: [...p.recentLeafHistory], sidecars: [...p.sidecarLeaves] },
    observations: [], phase: "setup", done: false, cancelled: false, owned: false, releases: [] };
  const folder = "__kplex_arrow_direction_native";
  c.a = `${folder}/A-Star.md`; c.b = `${folder}/Uniform Cost Search.md`;
  /** Fail before recording an observation as accepted; reject retired probe continuations. */
  const check = (value, message) => { if (c.cancelled) throw Error("Retired arrow probe"); if (!value) throw Error(message); };
  /** Real renderer tasks, with no throttling/timer overrides. */
  const wait = async ms => { check(true, "active"); await new Promise(done => window.setTimeout(done, ms)); check(true, "active"); };
  /** Bound native readiness independently of the CLI transport response. */
  const until = async (read, message) => { const end = Date.now() + 60_000; while (!read()) { check(Date.now() < end, message); await wait(50); } };
  /** Reacquire current plugin and canonical file after each native reload. */
  const plugin = () => app.plugins.plugins["k-plex"];
  /** Inspect only fixture-relative roles/direction/evidence and the exact real SVG connector. */
  c.capture = async (from, to, inverse, inferred, phase) => {
    const current = plugin(), index = current.index;
    current.settings.inverseArrowDirection = inverse; current.settings.showInferredNodes = inferred;
    await current.saveSettings(false, false); index.notifyPresentation();
    current.notifyNavigation(from);
    await until(() => {
      const visible = app.workspace.getLeavesOfType("k-plex-react-view").filter(leaf => current.isKplexLeafVisible(leaf));
      return visible.some(leaf => leaf.view.contentEl.querySelector(".kplex-role-center")?.dataset.kplexPath === from)
        && index.getNeighborhood(from)?.leftFriends.some(item => item.page.path === to);
    }, "Visible defined neighbor did not settle");
    const host = app.workspace.getLeavesOfType("k-plex-react-view").find(leaf => current.isKplexLeafVisible(leaf)
      && leaf.view.contentEl.querySelector(".kplex-role-center")?.dataset.kplexPath === from);
    let edge;
    await until(() => {
      edge = [...host.view.contentEl.querySelectorAll("[data-kplex-edge-id]")]
        .find(el => el.dataset.kplexEdgeId === `left:${to}:0`)?.parentElement.querySelector(".kplex-edge-visible");
      return Boolean(edge);
    }, "Actual defined connector absent");
    const neighbor = index.getNeighborhood(from).leftFriends.find(item => item.page.path === to);
    const explanation = index.explainRelationship(from, to);
    const observation = { phase, from, to, inverse, inferred, direction: neighbor.linkDirection, role: neighbor.role,
      type: neighbor.relationType, markerStart: edge.getAttribute("marker-start"), markerEnd: edge.getAttribute("marker-end"),
      canonicalFiles: index.get(from)?.file === app.vault.getFileByPath(from) && index.get(to)?.file === app.vault.getFileByPath(to),
      gates: Object.fromEntries(["parents", "children", "leftFriends", "rightFriends"].map(role => [role, index.getNeighborhood(from)[role].length])),
      definitions: neighbor.typeDefinition, decisions: explanation.decisions.map(decision => ({ active: decision.active,
        sourceKind: decision.evidence.sourceKind, relationType: decision.evidence.relationType, direction: decision.evidence.direction })) };
    c.observations.push(observation);
    check(observation.canonicalFiles, "Fixture graph lost canonical native file identity");
    check(observation.role === "left" && observation.type === 1, "Explicit friend role/strength changed");
    check(observation.decisions.some(item => item.active && item.relationType === 1)
      && observation.decisions.some(item => item.active && item.relationType === 2), "Explanation lost defined or inferred provenance");
    if (expectBaseline) check(observation.direction === 3, "Expected unfixed native BOTH direction not reproduced");
    else {
      const expected = from === c.a ? 2 : 1;
      check(observation.direction === expected, "Defined direction contaminated by inferred backlink");
      const reverse = expected === (inverse ? 1 : 2);
      check(observation.markerStart === (reverse ? "url(#kplex-arrow)" : null)
        && observation.markerEnd === (reverse ? null : "url(#kplex-arrow)"), "Real SVG arrow marker orientation differs from semantic direction/inversion");
    }
  };
  /** Capture all requested setting/endpoint combinations through the same native owner. */
  c.matrix = async phase => {
    for (const inferred of [false, true]) for (const inverse of [true, false]) {
      await c.capture(c.a, c.b, inverse, inferred, phase);
      await c.capture(c.b, c.a, inverse, inferred, phase);
    }
  };
  /** Restore current host settings/owners after tasks retire; remove only owned fixture content. */
  c.cleanup = () => c.cleanupTask ??= (async () => {
    c.cancelled = true; await c.task;
    for (const release of c.releases.splice(0)) release();
    const current = plugin(); Object.assign(current.settings, c.originalSettings); await current.saveSettings(false, false);
    if (c.owned) {
      const owned = app.vault.getFolderByPath(folder); if (owned) await app.vault.delete(owned, true); c.owned = false;
    }
    await current.index.refreshSemanticSettings(); await app.workspace.changeLayout(c.originalLayout);
    const leaves = []; app.workspace.iterateAllLeaves(leaf => leaves.push(leaf));
    const rebind = old => old ? leaves.find(leaf => leaf.id === old.id) ?? null : null;
    await documentSessions(current).restore(c.owners.documents); current.lastDocumentLeaf = rebind(c.owners.last);
    current.recentLeafHistory = c.owners.recent.map(rebind).filter(Boolean); current.sidecarLeaves.clear();
    for (const [oldHost, oldNote] of c.owners.sidecars) { const host = rebind(oldHost), note = rebind(oldNote); if (host && note) current.sidecarLeaves.set(host, note); }
    if (c.originalSettings.lastActivePath) current.notifyNavigation(c.originalSettings.lastActivePath);
    await current.actionPreferenceQueue; await current.settingsWriteQueue;
    await current.index.sourceAcquisition.repository.flush();
    c.cleaned = true;
  })();
  c.task = new Promise(done => window.setTimeout(done, 0)).then(async () => {
    remote.app.focus({ steal: true }); win.show(); win.focus(); win.webContents.focus();
    await until(() => document.hasFocus() && !document.hidden, "Foreground renderer required");
    await until(() => !p.isStartupInitializing(), "Original startup did not settle");
    check(!app.vault.getFolderByPath(folder), "Fixture collision");
    await app.vault.createFolder(folder); c.owned = true;
    const a = await app.vault.create(c.a, `---\nImplements: "[[${c.b.slice(0, -3)}]]"\n---\n# Search\n`);
    const b = await app.vault.create(c.b, `# Search\n[[${c.a.slice(0, -3)}#Search]]\n[[${c.a.slice(0, -3)}#Search|A-Star heading]]\n`);
    await until(() => app.metadataCache.getFileCache(a)?.frontmatter?.Implements
      && app.metadataCache.getFileCache(b)?.links?.length >= 2, "Native Markdown metadata missing");
    p.settings.hierarchy.leftFriends = [...new Set([...p.settings.hierarchy.leftFriends, "Implements"])];
    Object.assign(p.settings, { embedCentralNode: false, graphDepth: 1, showFolderNodes: false, showTagNodes: false,
      showCrossLinks: false, renderSiblings: false, inferAllLinksAsFriends: false, applyPowerFilter: false, animationSpeed: 0 });
    p.settings.baseLinkStyle = { ...p.settings.baseLinkStyle, startArrowHead: "none", endArrowHead: "arrow" };
    p.settings.hierarchyLinkStyles = {};
    await documentSessions(p).off(); await p.saveSettings(); await p.activateView();
    p.index.insertCreatedFile(a); p.index.insertCreatedFile(b);
    c.releases.push(p.index.acquireSemanticDemand(c.a), p.index.acquireSemanticDemand(c.b));
    await p.index.refreshSemanticSettings();
    await until(() => !p.index.hasPendingSemanticPreparation(), "Fixture semantic preparation pending");
    c.phase = "initial"; await c.matrix("initial");
    c.phase = "policy-refresh"; await p.index.refreshSemanticSettings(); await c.matrix("repeat-policy-refresh");
    await p.index.sourceAcquisition.repository.flush();
    const heads = await Promise.all([c.a, c.b].map(path => p.index.sourceAcquisition.repository.inspect(path, [])));
    check(heads.every(head => head.saved && head.reason === "ready"), "Fixture neutral sources are not durable before reload");
    c.neutralBefore = JSON.stringify(heads.map(({ head, sequence }) => ({ head, sequence })));
  }).then(() => { c.done = true; }, error => { c.error = String(error?.stack ?? error); c.done = true; });
  return true;
}

/** Wait only for a finite controller token, retaining its failure and observations. */
async function waitTask() {
  const end = Date.now() + 180_000;
  while (true) {
    const state = evaluate("JSON.stringify({done:window.__kplexArrowProbe?.done,error:window.__kplexArrowProbe?.error,phase:window.__kplexArrowProbe?.phase,observations:window.__kplexArrowProbe?.observations})");
    report.observations = state.observations ?? []; report.phase = state.phase;
    if (state.done) { assert(!state.error, state.error); return; }
    assert(Date.now() < end, "Native arrow probe deadline exceeded"); await delay(500);
  }
}

let installed = false;
try {
  assert.equal(cli("vault", "info=path").replace(/^path /, ""), target.vault);
  report.obsidian = cli("version"); cli("dev:errors", "clear");
  for (const name of ["main.js", "styles.css", "manifest.json"]) {
    const built = readFileSync(join(projectRoot, "dist", name)), actual = readFileSync(join(target.pluginDir, name));
    assert(built.equals(actual), `Installed ${name} mismatch`); report.artifacts[name] = createHash("sha256").update(actual).digest("hex");
  }
  evaluate(`JSON.stringify((${installProbe.toString()})(${baseline}))`); installed = true; await waitTask();
  if (!baseline) {
    evaluate("JSON.stringify((()=>{const c=window.__kplexArrowProbe;for(const release of c.releases.splice(0))release();return true})())");
    cli("plugin:disable", "id=k-plex"); cli("plugin:enable", "id=k-plex");
    cli("command", "id=k-plex:kplex-start");
    evaluate("JSON.stringify((()=>{const c=window.__kplexArrowProbe,p=app.plugins.plugins['k-plex'];c.done=false;c.error=null;c.phase='warm-reload';c.task=new Promise(done=>window.setTimeout(done,0)).then(async()=>{const end=Date.now()+60000;while(p.isStartupInitializing()){if(c.cancelled||Date.now()>end)throw Error('Warm startup deadline');await new Promise(done=>window.setTimeout(done,50));}c.releases.push(p.index.acquireSemanticDemand(c.a),p.index.acquireSemanticDemand(c.b));await c.matrix('warm-reload');const leaf=app.workspace.getLeaf('tab');await leaf.setViewState({type:'k-plex-react-view',active:true});await app.workspace.revealLeaf(leaf);await c.matrix('second-view');await p.index.sourceAcquisition.repository.flush();const heads=await Promise.all([c.a,c.b].map(path=>p.index.sourceAcquisition.repository.inspect(path,[])));c.neutralUnchanged=JSON.stringify(heads.map(({head,sequence})=>({head,sequence})))===c.neutralBefore;if(!c.neutralUnchanged)throw Error('Warm arrow policy rewrote neutral source heads');}).then(()=>c.done=true,error=>{c.error=String(error.stack??error);c.done=true});return true})())");
    await waitTask();
    report.neutralSourceHeadsUnchanged = evaluate("JSON.stringify(window.__kplexArrowProbe.neutralUnchanged)");
  }
  report.nativeErrors = cli("dev:errors");
  assert(!report.nativeErrors || /^No errors captured\.?$/i.test(report.nativeErrors), "Captured native JavaScript errors");
  report.status = baseline ? "baseline-reproduced" : "passed";
} catch (error) { report.status = "failed"; report.error = String(error.stack ?? error); }
finally {
  if (installed) {
    try {
      evaluate("JSON.stringify((()=>{const c=window.__kplexArrowProbe;c.cleanup().then(()=>c.cleanupDone=true,error=>{c.cleanupError=String(error.stack??error);c.cleanupDone=true});return true})())");
      const end = Date.now() + 60_000;
      while (true) {
        const state = evaluate("JSON.stringify({done:window.__kplexArrowProbe?.cleanupDone,error:window.__kplexArrowProbe?.cleanupError})");
        if (state.done) { assert(!state.error, state.error); break; }
        assert(Date.now() < end, "Native arrow cleanup deadline exceeded"); await delay(250);
      }
      evaluate("delete window.__kplexArrowProbe;JSON.stringify(true)"); report.cleaned = true;
    } catch (error) { report.status = "failed"; report.cleanupError = String(error.stack ?? error); }
  }
  for (const item of configuration) writeFileSync(item.path, item.bytes);
  report.finishedAt = new Date().toISOString(); writeFileSync(join(output, "arrow-direction.json"), JSON.stringify(report, null, 2));
}
console.log(`Arrow direction ${report.status}; report: ${join(output, "arrow-direction.json")}`);
if (report.error) console.error(report.error);
if (report.cleanupError) console.error(report.cleanupError);
if (report.status === "failed") process.exitCode = 1;
