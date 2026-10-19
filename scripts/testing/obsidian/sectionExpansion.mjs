/**
 * Exact-build native section grouping and stationary inbound-edit acceptance in Small.
 * Reuses bounded CLI transport/config guards, owns four notes and one native Plex, and restores
 * its settings/workspace on every exit. Counts presentation operations, never comparative timings.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runControlledProbe } from "./controlledProbe.mjs";

/** Exercise the installed React fold control and automatic index-to-section publication. */
async function scenario(app, c) {
  const p = app.plugins.plugins["k-plex"];
  if (!p || app.vault.getFiles().length >= 1000 || app.setting.isOpen) throw Error("Clean Small-vault prerequisites required");
  const settings = structuredClone(p.settings), policy = p.savedSettingsPolicy;
  const active = app.workspace.activeLeaf;
  const folder = "Kplex-Sections-162-" + Date.now();
  const path = name => folder + "/" + name + ".md";
  const owned = [], releases = [], restores = [];
  let leaf, createdFolder, restoreWindow, failure;
  const check = (value, message) => { if (!value) throw Error(message); };
  const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
  /** Native metadata and React each publish independently; no manual refresh or navigation retry. */
  const until = async (predicate, message) => {
    const end = Date.now() + 60000;
    while (!predicate()) { check(!c.closed && Date.now() < end, message); await wait(50); }
  };
  const nodes = () => [...leaf.view.contentEl.querySelectorAll(".kplex-thought[data-kplex-path]")];
  const direct = name => nodes().some(node => node.dataset.kplexPath === path(name));
  const section = name => nodes().some(node => node.dataset.kplexPath.startsWith("kplex-section-target:") && node.dataset.kplexPath.endsWith(":" + path(name)));
  try {
    await until(() => !p.isStartupInitializing(), "Startup did not settle");
    const remote = require("@electron/remote"), win = remote.getCurrentWindow();
    const bounds = win.getBounds(), maximized = win.isMaximized(), minimized = win.isMinimized();
    restoreWindow = () => { win.setBounds(bounds); if (maximized) win.maximize(); if (minimized) win.minimize(); };
    remote.app.show?.(); remote.app.focus({steal:true}); win.restore(); win.show(); win.focus();
    createdFolder = await app.vault.createFolder(folder);
    for (const name of ["Preamble", "B", "C", "Center"]) {
      const body = name === "Center" ? `[[${folder}/Preamble]]\n# First\n[[${folder}/B]]\n[[${folder}/B]]\n# Second\n[[${folder}/C]]\n` : "A disposable section fixture.\n";
      const file = await app.vault.create(path(name), body); owned.push(file);
    }
    await until(() => owned.every(file => app.metadataCache.getFileCache(file)), "Native fixture metadata absent");
    Object.assign(p.settings, { documentSyncMode: "off", sidecarOpen: false, followActiveFile: false,
      autoOpenCentralDocument: false, embedCentralNode: false, showInferredNodes: true,
      showPageNodes: true, showFolderNodes: false, showTagNodes: false, graphDepth: 1,
      renderSiblings: false, graphLenses: [], applyPowerFilter: false, animationSpeed: 0, lastActivePath: path("Center") });
    for (const file of owned) { p.index.insertCreatedFile(file); releases.push(p.index.acquireSemanticDemand(file.path)); }
    await until(() => !p.index.hasPendingSemanticPreparation(), "Fixture semantic preparation pending");
    leaf = app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: "k-plex-react-view", active: true });
    await app.workspace.revealLeaf(leaf); await leaf.view.waitUntilReady();
    await until(() => [...p.actionSurfaceHosts.values()].some(registration => registration.leaf === leaf), "Owned action surface absent");
    p.notifyNavigation(path("Center"), leaf);
    await until(() => direct("Center"), "Owned center did not render");
    const fold = leaf.view.contentEl.querySelector(".kplex-role-center .kplex-section-fold-handle");
    check(fold, "Central outline fold control missing"); fold.click();
    await until(() => section("B") && section("C"), "Ordinary links not grouped under headings");
    check(direct("Preamble") && !direct("B") && !direct("C"), "Preamble/body partition incorrect");
    check(nodes().filter(node => node.dataset.kplexPath.endsWith(":" + path("B"))).length === 1, "Repeated links duplicated the section target");
    const centerMtime = app.vault.getFileByPath(path("Center")).stat.mtime;
    const b = app.vault.getFileByPath(path("B"));
    c.progress = { phase: "inbound-add" };
    const parentKey = p.settings.hierarchy.parents[0]; check(parentKey, "Configured parent field absent");
    await app.vault.modify(b, `---\n${parentKey}: "[[${folder}/Center]]"\n---\nA disposable section fixture.\n`);
    await until(() => direct("B") && section("B"), "Stationary expansion missed inbound ontology addition");
    check(app.vault.getFileByPath(path("Center")).stat.mtime === centerMtime, "Center changed during inbound test");
    c.progress = { phase: "inbound-remove" };
    await app.vault.modify(b, "A disposable section fixture.\n");
    await until(() => !direct("B") && section("B"), "Stationary expansion retained removed inbound ontology");
    await until(() => p.getIndexStatus().upToDate && !p.index.hasPendingSemanticPreparation(), "Presentation guard requires drain");
    const work = { reads: 0, parses: 0, rebuilds: 0 };
    /** Instrument only the bounded presentation interval; delegate exact native promises/results. */
    const observe = (owner, key, counter) => {
      const original = owner[key]; if (typeof original !== "function") return;
      owner[key] = function (...args) { work[counter]++; return original.apply(this, args); };
      restores.push(() => { owner[key] = original; });
    };
    observe(app.vault, "read", "reads"); observe(app.vault, "cachedRead", "reads");
    observe(p.index.metadataParser, "parse", "parses"); observe(p.index, "rebuild", "rebuilds");
    p.settings.showInferredNodes = false; p.index.notifyPresentation();
    await until(() => !section("B") && !section("C"), "Hidden inferred section targets remained visible");
    p.settings.showInferredNodes = true; p.index.notifyPresentation();
    await until(() => section("B") && section("C"), "Presentation update lost ordinary section links");
    await wait(300);
    for (const [key, value] of Object.entries(work)) check(value === 0, "Presentation performed " + key);
    check(direct("Center") && app.vault.getFileByPath(path("Center")).stat.mtime === centerMtime, "Stationary center changed");
    c.progress = { phase: "complete", cases: ["native fold grouping", "preamble and repeated links", "stationary inbound add", "stationary inbound removal", "visibility round trip"], work };
    return c.progress;
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    const errors = [];
    /** One cleanup failure must never skip another fixture, native owner or disk restoration. */
    const clean = async action => { try { await action(); } catch (error) { errors.push(String(error)); } };
    for (const restore of restores.reverse()) await clean(restore);
    for (const release of releases) await clean(release);
    if (leaf) await clean(() => leaf.detach());
    p.settings = settings; p.savedSettingsPolicy = policy;
    if (active) await clean(() => app.workspace.setActiveLeaf(active, { focus: true }));
    for (const file of owned.reverse()) if (app.vault.getFileByPath(file.path) === file) await clean(() => app.vault.delete(file));
    if (createdFolder && app.vault.getFolderByPath(folder) === createdFolder && !createdFolder.children.length) await clean(() => app.vault.delete(createdFolder, true));
    await clean(() => p.settingsWriteQueue);
    await wait(1000);
    await clean(() => app.vault.adapter.write(p.manifest.dir + "/data.json", c.originalData));
    if (restoreWindow) await clean(restoreWindow);
    if (errors.length) throw Error((failure ? "Scenario: " + String(failure) + "; " : "") + "Section fixture cleanup: " + errors.join("; "));
  }
}

if (process.env.KPLEX_TEST_VAULT_NAME !== "kplex-test-small") throw Error("Sections require the explicit Small fixture");
const data = readFileSync(join(process.env.KPLEX_TEST_CONFIG_DIR, "plugins/k-plex/data.json"), "utf8");
await runControlledProbe("sections-162", scenario, "c.originalData=" + JSON.stringify(data) + ";", ["src/index/SectionExpansion.ts"]);
