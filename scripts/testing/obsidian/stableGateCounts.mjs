/**
 * Guarded native autosave/count regression. Owns two ordinary notes and a separate Plex leaf;
 * records bounded badge/scene DOM mutations during real Vault or native-editor saves, then checks
 * genuine link edits. Diagnostic attribution is opt-in and bounded. The shared driver verifies the
 * selected disposable vault and exact installed artifact, and checks exact configuration cleanup.
 * Retire owned editor/canvas demand and restore prior navigation before deleting fixture documents.
 */
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { validateTarget } from './runner.mjs';
import { runControlledProbe } from './controlledProbe.mjs';

/** Exercise actual native event delivery without flushing or directly patching the index. */
async function scenario(app, c) {
  /** Stop on a failed prerequisite instead of recording an unrun assertion as a pass. */
  const check = (value, message) => { if (!value) throw Error(message); };
  /** Observe bounded native completion while allowing production timers and callbacks to run. */
  const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
  /** Join actual completion; the deadline is only a harness failure bound. */
  const until = async (read, message) => {
    const end = Date.now() + 90000;
    while (!read()) { check(!c.closed && Date.now() < end, message); await wait(50); }
  };
  check(app.vault.adapter.getBasePath() === c.vaultPath, 'Wrong disposable vault');
  let p = app.plugins.plugins['k-plex'];
  check(p && !p.index.isOnDemandMode(), 'Settled Eager session required');
  const layout = app.workspace.getLayout(), initialFiles = app.vault.getFiles().length;
  const prefix = 'Kplex-Stable-Gates-' + Date.now(), owned = [], releases = [];
  const remote = require('@electron/remote'), win = remote.getCurrentWindow();
  remote.app.focus({ steal: true }); win.restore(); win.show(); win.focus();
  let leaf, observer, editorMount;
  c.progress = { phase: 'setup', saves: [], publications: [], mutations: [], work: {}, commits: [] };
  /** Source/URL and ordinary patch owners must actually finish after each save. */
  const settled = () => {
    const s = p.index.sourceAcquisition.getActivityState();
    return !p.indexDirty && !p.rebuildTask && p.rebuildTimer === null
      && !p.index.hasActiveSemanticPreparation() && !p.index.hasPendingSemanticPreparation()
      && !s.sourceActive && !s.pendingKnown && !s.knownImpactTasks && !s.repoWrites
      && !p.index.urlOwnerTasks.size && !p.index.onDemandGateTasks.size;
  };
  /** Read visible badge text only; do not schedule additional count work from polling. */
  const snapshot = () => Array.from(leaf.view.contentEl.querySelectorAll('.kplex-thought')).map(n => ({
    path: n.dataset.kplexPath,
    gates: ['top', 'bottom', 'left', 'right'].map(side => n.querySelector('.gate-wrap-' + side + ' .kplex-gate-count')?.textContent ?? null),
  }));
  try {
    const listeners = p.navigationListeners.size;
    leaf = app.workspace.getLeaf('tab'); await leaf.setViewState({ type: 'k-plex-react-view', active: true });
    app.workspace.setActiveLeaf(leaf, { focus: true });
    await until(() => p.navigationListeners.size > listeners, 'Plex navigation listener missing');
    await until(settled, 'Original session not settled');
    Object.assign(p.settings, { showNeighborCount: true, showFolderNodes: true, showTagNodes: true,
      documentSyncMode: 'off', followActiveFile: false, autoOpenCentralDocument: false, embedCentralNode: false });
    const target = await app.vault.create(prefix + '-Target.md', 'Target note.'); owned.push(target);
    const body = '---\ntags: [kplex-stable-gates]\n---\n[[' + target.basename + ']]\n\nParagraph ';
    const source = await app.vault.create(prefix + '-Source.md', body + '0.'); owned.push(source);
    await until(() => app.metadataCache.resolvedLinks[source.path]?.[target.path] > 0 && settled(), 'Fixture indexing not settled');
    p.notifyNavigation(source.path);
    await until(() => leaf.view.contentEl.querySelector('.kplex-role-center')?.dataset.kplexPath === source.path && settled(), 'Fixture center not settled');
    await wait(1500);
    if (c.editor) {
      p.settings.sidecarMarkdownMode = 'source';
      await p.openSidecar(leaf, p.index.get(source.path));
      editorMount = p.sidecarLeaves.get(leaf)?.view.containerEl;
      await until(() => editorMount?.querySelector('.cm-content') && settled(), 'Native source editor not ready');
      // Opening the native split schedules post-layout demand/count effects. Join that initial
      // editor admission before observing ordinary saves, just as the Plex setup above settles.
      await wait(1500);
      await until(settled, 'Native editor layout admission did not settle');
    }
    c.progress.nativeEditor = !!c.editor;
    releases.push(p.index.subscribe(() => { if (c.progress.publications.length < 96) c.progress.publications.push({ kind: 'semantic', at: performance.now() }); }));
    releases.push(p.index.subscribePresentation(() => { if (c.progress.publications.length < 96) c.progress.publications.push({ kind: 'presentation', at: performance.now() }); }));
    for (const name of ['ensureOnDemandCenter', 'publishOnDemandHostScope', 'prepareSemanticScope', 'prepareVisibleFolderGates', 'publishIncrementalFile', ...(c.characterize ? ['hasCompiledEagerSource'] : [])]) {
      const original = p.index[name], descriptor = Object.getOwnPropertyDescriptor(p.index, name);
      c.progress.work[name] = 0;
      p.index[name] = function (...args) {
        c.progress.work[name]++;
        if (name === 'publishIncrementalFile' && c.progress.commits.length < 48) c.progress.commits.push({ semanticChanged: args[0].semanticChanged, unchangedSource: !!args[0].unchangedSource });
        const value = original.apply(this, args);
        if (name === 'hasCompiledEagerSource') {
          c.progress.routes ??= [];
          if (c.progress.routes.length < 48) c.progress.routes.push({ result: value,
            signature: this.fieldCache.get(args[0])?.semanticSignature !== undefined,
            policy: this.fieldCache.get(args[0])?.semanticPolicyRevision,
            currentPolicy: this.semanticPolicyRevision, fingerprint: this.semanticFingerprints.has(args[0]) });
        }
        return value;
      };
      releases.push(() => { if (descriptor) Object.defineProperty(p.index, name, descriptor); else delete p.index[name]; });
    }
    observer = new MutationObserver(records => {
      for (const r of records) {
        const element = r.target.nodeType === 1 ? r.target : r.target.parentElement;
        if (!element?.closest('.kplex-thought') || c.progress.mutations.length >= 96) continue;
        if (element.closest('.kplex-gate-wrap') || r.type === 'childList') c.progress.mutations.push({ type: r.type,
          path: element.closest('.kplex-thought')?.dataset.kplexPath,
          gate: element.closest('.kplex-gate-wrap')?.className,
          text: element.textContent?.slice(0, 100), at: performance.now() });
      }
    });
    observer.observe(leaf.view.contentEl, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'] });
    if (c.characterize) {
      const original = p.index.gateStats, descriptor = Object.getOwnPropertyDescriptor(p.index, 'gateStats');
      c.progress.countReads = [];
      p.index.gateStats = function (page) {
        const value = original.call(this, page);
        if (c.progress.countReads.length < 160) c.progress.countReads.push({ kind: page.isFolder ? 'folder' : page.isTag ? 'tag' : page.path === source.path ? 'source' : 'target',
          gates: value, ...(page.isTag ? { targets: [...page.neighbours.values()].map(row => ({ path: row.target.path,
            physical: !!app.vault.getFileByPath(row.target.path), file: !!row.target.file })) } : {}),
          scope: this.semanticScopes.has(source.path), local: this.onDemandHostScopes.has(source.path), foreground: this.usesLocalForeground() });
        return value;
      };
      releases.push(() => { if (descriptor) Object.defineProperty(p.index, 'gateStats', descriptor); else delete p.index.gateStats; });
    }
    c.progress.phase = 'ordinary-saves';
    for (let i = 1; i <= 3; i++) {
      const before = snapshot(), revision = p.getIndexSourceRevision();
      if (c.editor) {
        const content = editorMount.querySelector('.cm-content');
        content.focus();
        const modifiers = [require('process').platform === 'darwin' ? 'meta' : 'control'];
        for (const type of ['keyDown', 'keyUp']) win.webContents.sendInputEvent({ type, keyCode: 'End', modifiers });
        await win.webContents.insertText('\nOrdinary saved paragraph ' + i + '.\n');
      } else await app.vault.modify(source, body + i + '.');
      await until(() => p.getIndexSourceRevision() > revision && app.metadataCache.getFileCache(source)?.sections && settled(), 'Save did not naturally settle');
      await wait(800);
      c.progress.saves.push({ before, after: snapshot() });
    }
    observer.disconnect(); observer = null;
    c.progress.phase = 'saved';
    check(c.progress.saves.every(s => JSON.stringify(s.before) === JSON.stringify(s.after)), 'Final badge values changed on prose-only saves');
    if (!c.characterize) check(c.progress.mutations.length === 0, 'Prose saves changed badge/scene DOM: ' + JSON.stringify(c.progress.mutations));
    if (c.editor) check(editorMount.contains(editorMount.ownerDocument.activeElement), 'Native editor focus lost');
    if (!c.characterize) for (const node of leaf.view.contentEl.querySelectorAll('.is-structural-thought')) for (const side of ['left', 'right']) {
      check(node.querySelector('.gate-wrap-' + side + ' .kplex-gate-count')?.textContent === '0', 'Structural lateral gate is not zero');
    }
    c.progress.ordinaryWork = { ...c.progress.work };
    c.progress.phase = 'real-link-edit';
    await app.vault.modify(source, '---\ntags: [kplex-stable-gates]\n---\nThe link has been removed.');
    await until(() => !app.metadataCache.resolvedLinks[source.path]?.[target.path] && settled()
      && !p.index.getNeighborhood(source.path)?.children.some(row => row.page.path === target.path), 'Actual link removal did not publish');
    await app.vault.modify(source, body + 'Restored link.');
    await until(() => app.metadataCache.resolvedLinks[source.path]?.[target.path] > 0 && settled()
      && p.index.getNeighborhood(source.path)?.children.some(row => row.page.path === target.path), 'Actual link addition did not publish');
    c.progress.realLinkChanges = 'passed';
    c.progress.phase = 'complete';
    return c.progress;
  } catch (error) {
    c.progress.functionalError = String(error);
    throw error;
  } finally {
    const failures = [];
    /** Continue independent restoration after any functional or cleanup failure. */
    const clean = async work => { try { await work(); } catch (error) { failures.push(String(error)); } };
    observer?.disconnect(); for (const release of releases.reverse()) release();
    await clean(/** A live native editor may still own its fixture's save/metadata lifecycle. */ async () => {
      if (leaf && p.sidecarLeaves.has(leaf)) await p.closeSidecar(leaf, false);
    });
    await clean(() => leaf?.detach());
    await clean(/** Deleted fixture paths cannot remain the active requested semantic scope during cleanup. */ () => {
      const originalPath = JSON.parse(c.originalData).lastActivePath;
      if (originalPath) p.notifyNavigation(originalPath);
      else p.settings.lastActivePath = null;
    });
    for (const file of owned.reverse()) await clean(async () => {
      check(app.vault.getFileByPath(file.path) === file && file.path.startsWith(prefix), 'Owned note identity changed');
      await app.vault.delete(file);
    });
    await clean(() => until(settled, 'Cleanup indexing not settled'));
    await clean(() => app.plugins.disablePlugin('k-plex'));
    await clean(() => app.workspace.changeLayout(layout));
    await clean(() => app.vault.adapter.write(c.configRelative + '/plugins/k-plex/data.json', c.originalData));
    await clean(() => app.plugins.enablePlugin('k-plex'));
    p = app.plugins.plugins['k-plex'];
    await clean(async () => { await until(() => p.layoutReady, 'Restored plugin not loaded'); await p.settingsWriteQueue; await wait(1500);
      await app.vault.adapter.write(c.configRelative + '/plugins/k-plex/data.json', c.originalData);
      const expected = JSON.parse(c.originalEnabled);
      await until(() => {
        const actual = [...app.plugins.enabledPlugins];
        return expected.length === actual.length && expected.every(id => actual.includes(id));
      }, 'Loaded plugin profile changed');
      await app.vault.adapter.write(c.configRelative + '/community-plugins.json', c.originalEnabled);
      check(app.vault.getFiles().length === initialFiles, 'Original file inventory not restored'); });
    c.progress.cleanup = { passed: !failures.length, failures };
    if (failures.length) throw Error('Count probe cleanup: ' + failures.join('; '));
  }
}

if (process.env.KPLEX_TEST_VAULT_NAME !== 'kplex-test-small') throw Error('Explicit disposable Small required');
const target = validateTarget({ vaultName: process.env.KPLEX_TEST_VAULT_NAME, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
await runControlledProbe('stable-gate-counts', scenario,
  'c.vaultPath=' + JSON.stringify(target.vault) + ';c.configRelative=' + JSON.stringify(relative(target.vault, target.config).replaceAll('\\', '/'))
    + ';c.originalData=' + JSON.stringify(readFileSync(join(target.pluginDir, 'data.json'), 'utf8'))
    + ';c.originalEnabled=' + JSON.stringify(readFileSync(join(target.config, 'community-plugins.json'), 'utf8'))
    + ';c.characterize=' + JSON.stringify(process.env.KPLEX_GATE_CHARACTERIZE === 'true')
    + ';c.editor=' + JSON.stringify(process.env.KPLEX_GATE_NATIVE_EDITOR === 'true') + ';',
  ['src/ui/ThoughtNode.tsx', 'src/ui/PlexGraph.tsx', 'src/ui/useGateCountPresentation.ts', 'src/index/HostMetadataPreview.ts'], { maximumMs: 300000 });
