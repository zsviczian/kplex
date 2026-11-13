/**
 * Guarded Windows source-event convergence through real file operations and native notifications.
 * A declared dependency-await gate establishes ordering during warm startup, not throughput.
 * The existing controller owns target/artifact checks; this scenario owns fixtures, wrappers,
 * native event listeners, plugin lifetime and configuration/workspace restoration on every exit.
 */
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { validateTarget } from './runner.mjs';
import { runControlledProbe } from './controlledProbe.mjs';
import { createStartupSourceConvergenceProbe } from './startupSourceConvergenceProbe.mjs';

/** Observe natural startup completion after exactly three real writes during a held source await. */
async function scenario(app, c) {
  /** A failed functional prerequisite must remain a failed receipt. */
  const check = (value, message) => { if (!value) throw Error(message); };
  /** Poll retained state without flushing, reconciling, resolving or granting authority. */
  const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
  /** A finite native observation deadline is independent of production retry/watchdog policy. */
  const until = async (read, message) => {
    const deadline = Date.now() + 90000;
    while (!read()) { check(!c.closed && Date.now() < deadline, message); await wait(40); }
  };
  check(app.vault.getName() === 'kplex-test-small' && app.vault.adapter.getBasePath() === c.vaultPath, 'Wrong disposable vault');
  let p = app.plugins.plugins['k-plex'];
  check(p && !p.index.isOnDemandMode(), 'Actual eager session required');
  check(!app.setting.isOpen && !document.querySelector('.modal-container'), 'Close native dialogs before this lane');
  const remote = require('@electron/remote'), win = remote.getCurrentWindow();
  remote.app.focus({ steal: true }); win.restore(); win.show(); win.focus(); win.webContents.focus();
  await wait(150);
  check(!document.hidden && document.hasFocus() && win.isFocused(), 'Selected native test renderer must be foreground');
  const layout = app.workspace.getLayout(), initialFiles = app.vault.getFiles().length;
  const prefix = 'Kplex210-Events-' + Date.now(), owned = [], listeners = [], ownerIds = new WeakMap();
  const originalLayoutReady = app.workspace.onLayoutReady;
  const layoutReadyDescriptor = Object.getOwnPropertyDescriptor(app.workspace, 'onLayoutReady');
  let folder, probe, restoreEnsure, layoutReplacement, initialComplete, finalComplete, released = false;
  const gate = new Promise(resolve => { c.release = () => { released = true; resolve(); }; });
  const events = [], writes = [], maxEvents = 96;
  c.progress = { phase: 'fixture-preparation', events, writes };
  /** Serialize only test-owner ordinals and finite event categories. */
  const observed = (kind, file) => {
    const ordinal = ownerIds.get(file);
    if (kind !== 'resolved' && ordinal === undefined) return;
    if (events.length < maxEvents) events.push({ kind, ordinal: ordinal ?? null, at: performance.now(), inventory: !!p.index.sourceAcquisition.inventory });
    else c.eventOverflow = true;
  };
  /** Natural source/semantic/URL and persistence closure, using only already retained task state. */
  const settled = () => {
    const index = p.index, source = index.sourceAcquisition, state = source.getActivityState();
    const cache = index.indexedDb.getActivityState();
    const urls = index.getUrlIndexProgress();
    return p.initialIndexComplete && source.hasSemanticDependencies() && !index.hasPendingSemanticPreparation()
      && !p.initialSourceRecoveryTask && !p.rebuildTask && !p.indexDirty && p.rebuildTimer === null
      && !state.sourceActive && !state.pendingKnown
      && !state.knownImpactTasks && !state.repoWrites && !state.repoDeleteTask
      && index.getSourceRepositoryDiagnostics().unsaved === 0 && !index.urlAliasUpgradeTask
      && urls.complete && !urls.active && !urls.failed
      && !cache.writerActive && cache.queuedBodies === 0;
  };
  /** Normal native visibility owns edit catch-up. A Markdown-only starting layout intentionally
   * retains coordinator backlog, so establish real demand before creating fixture sources. */
  async function prepareFixtureView() {
    await p.activateView('leaf');
    let leaf;
    await until(() => {
      leaf = app.workspace.getLeavesOfType('k-plex-react-view').find(value =>
        value.view.containerEl.ownerDocument === document && p.isKplexLeafVisible(value));
      return Boolean(leaf);
    }, 'Visible normal fixture canvas prerequisite');
    await leaf.view.waitUntilReady();
  }
  try {
    await prepareFixtureView();
    await until(settled, 'Original native source state did not settle');
    folder = await app.vault.createFolder(prefix);
    for (const [index, name] of ['Gate', 'Left', 'Right'].entries()) {
      const file = await app.vault.create(prefix + '/' + name + '.md', '---\ntags: [kplex210/events]\n---\nValue:: initial-' + index + '\n');
      owned.push(file); ownerIds.set(file, index);
    }
    await until(() => owned.every(file => app.metadataCache.getFileCache(file)), 'Fixture metadata did not arrive');
    await until(settled, 'Fixture preparation did not naturally close');
    initialComplete = { files: app.vault.getFiles().length, counters: p.index.getSourceAcquisitionCounters() };
    for (const [owner, name, kind] of [[app.vault, 'modify', 'modify'], [app.metadataCache, 'changed', 'metadata'], [app.metadataCache, 'resolved', 'resolved']]) {
      const ref = owner.on(name, file => observed(kind, file));
      listeners.push(() => owner.offref(ref));
    }
    await app.plugins.disablePlugin('k-plex');
    c.progress.phase = 'warm-startup';
    /** Attach before the real plugin's layout callback admits its existing startup owners. */
    layoutReplacement = function(...args) {
      const next = app.plugins.plugins['k-plex'];
      if (next && !probe) {
        p = next; c.index = p.index;
        probe = c.probeFactory(app, p);
        const repository = p.index.sourceAcquisition.repository;
        const original = repository.ensureLocalDependencies, descriptor = Object.getOwnPropertyDescriptor(repository, 'ensureLocalDependencies');
        /** Hold only one actual selected-owner dependency await; no validity result is fabricated. */
        const replacement = async function(...values) {
          const result = await original.apply(this, values);
          if (!c.held && values[0] === owned[0].path && p.index.sourceAcquisition.inventory) {
            c.held = true;
            c.gateState = { sourceActive: !!p.index.sourceAcquisition.inventory, restartChecked: p.index.sourceAcquisition.restartInventoryChecked };
            c.progress.gate = c.gateState;
            await gate;
          }
          return result;
        };
        repository.ensureLocalDependencies = replacement;
        restoreEnsure = () => {
          check(repository.ensureLocalDependencies === replacement, 'Dependency wrapper ownership changed');
          if (descriptor) Object.defineProperty(repository, 'ensureLocalDependencies', descriptor);
          else delete repository.ensureLocalDependencies;
        };
      }
      return originalLayoutReady.apply(this, args);
    };
    app.workspace.onLayoutReady = layoutReplacement;
    await app.plugins.enablePlugin('k-plex');
    p = app.plugins.plugins['k-plex'];
    let openingError;
    const opening = p.activateView('leaf').catch(error => { openingError = error; });
    await until(() => c.held || openingError, 'Actual warm source dependency gate was not reached');
    if (openingError) throw openingError;
    check(c.gateState.sourceActive, 'Gate must occur inside actual source inventory');
    const started = performance.now(); c.progress.phase = 'native-writes';
    for (const [number, file] of [owned[2], owned[1], owned[2]].entries()) {
      const eventStart = events.length, ordinal = ownerIds.get(file);
      await app.vault.modify(file, '---\ntags: [kplex210/events]\n---\nValue:: changed-' + number + '\n');
      await until(() => events.slice(eventStart).some(event => event.kind === 'modify' && event.ordinal === ordinal), 'Real Vault modify notification missing');
      await until(() => events.slice(eventStart).some(event => event.kind === 'metadata' && event.ordinal === ordinal), 'Real MetadataCache changed notification missing');
      writes.push({ number, ordinal, at: performance.now() });
    }
    const lastWrite = performance.now(); c.progress.phase = 'natural-convergence'; c.release();
    await opening;
    if (openingError) throw openingError;
    await until(settled, 'Finite native event burst did not automatically converge');
    const closedAt = performance.now(), values = [];
    for (const file of [owned[1], owned[2]]) {
      const rows = [];
      check(await p.index.sourceAcquisition.repository.visit(file.path, 'values', records => { rows.push(...records); return true; }) === 'ready', 'Final source family is not authenticated');
      values.push(rows.filter(record => record.kind === 'inline-payload').map(record => record.text));
    }
    check(JSON.stringify(values) === JSON.stringify([['changed-1'], ['changed-2']]), 'Final native source facts do not match writes');
    check(events.filter(event => event.kind === 'modify').length === 3, 'Native mutation cardinality changed');
    check(events.some(event => event.kind === 'metadata' && event.inventory), 'No metadata event observed during source work');
    check(!c.eventOverflow, 'Native transition receipt overflow');
    finalComplete = { counters: p.index.getSourceAcquisitionCounters(), state: p.index.sourceAcquisition.getActivityState(), unsaved: p.index.getSourceRepositoryDiagnostics().unsaved };
    await wait(500); check(settled(), 'Quiet tail lost source completion');
    c.progress.functionalComplete = true;
    c.progress.summary = { finalComplete, values, lastWriteToClosureMs: closedAt - lastWrite };
    return { initialComplete, finalComplete, writes, events, gate: c.gateState, observation: probe.snapshot(),
      eventSpanMs: lastWrite - started, lastWriteToClosureMs: closedAt - lastWrite,
      limitation: 'Declared selected-owner await gate, actual native writes/events and natural completion. Functional ordering evidence, not throughput, actual paint or full application restart.' };
  } catch (error) {
    c.progress.scenarioError = String(error);
    throw error;
  } finally {
    const failures = [];
    /** Independent teardown continues after any earlier assertion or cleanup failure. */
    const clean = async work => { try { await work(); } catch (error) { failures.push(String(error)); } };
    // Preserve the bounded native chain even if an assertion fails before the final return.
    c.progress.phaseAtExit = c.progress.phase;
    await clean(() => {
      c.progress.sourceAtExit = p.index.sourceAcquisition.getActivityState();
      if (probe) c.progress.observation = probe.snapshot();
    });
    c.progress.phase = 'cleanup';
    if (!released) c.release();
    for (const dispose of listeners.reverse()) await clean(dispose);
    if (restoreEnsure) await clean(restoreEnsure);
    if (probe) await clean(() => probe.stop());
    if (app.workspace.onLayoutReady === layoutReplacement) {
      if (layoutReadyDescriptor) Object.defineProperty(app.workspace, 'onLayoutReady', layoutReadyDescriptor);
      else delete app.workspace.onLayoutReady;
    }
    for (const file of owned.reverse()) await clean(async () => {
      check(app.vault.getFileByPath(file.path) === file && file.path.startsWith(prefix + '/'), 'Owned file identity changed');
      await app.vault.delete(file);
    });
    if (folder) await clean(async () => {
      check(app.vault.getFolderByPath(prefix) === folder && folder.path === prefix && folder.children.length === 0, 'Owned folder not empty');
      // Windows requires force for this directory API. Resolve the exact test-owned target and
      // inspect hidden entries before permitting recursive deletion; never follow an escaped path.
      const fs = require('node:fs'), path = require('node:path');
      const base = fs.realpathSync(c.vaultPath), absolute = fs.realpathSync(path.join(base, prefix));
      check(path.relative(base, absolute) === prefix && fs.readdirSync(absolute).length === 0, 'Owned folder physical target is not empty inside the test vault');
      await app.vault.delete(folder, true);
    });
    await clean(() => until(settled, 'Cleanup native events did not naturally close'));
    await clean(() => app.plugins.disablePlugin('k-plex'));
    await clean(() => app.workspace.changeLayout(layout));
    await clean(() => app.vault.adapter.write(c.configRelative + '/plugins/k-plex/data.json', c.originalData));
    await clean(() => app.plugins.enablePlugin('k-plex'));
    p = app.plugins.plugins['k-plex'];
    await clean(async () => {
      await until(() => p.layoutReady, 'Restored plugin did not load'); await p.settingsWriteQueue; await wait(1500);
      await app.vault.adapter.write(c.configRelative + '/plugins/k-plex/data.json', c.originalData);
      check(app.vault.getFiles().length === initialFiles, 'Native fixture inventory not restored');
    });
    Object.assign(c.progress, { cleaned: failures.length === 0, failures });
    if (failures.length) throw Error('Event convergence cleanup: ' + failures.join('; '));
  }
}

if (process.env.KPLEX_TEST_VAULT_NAME !== 'kplex-test-small') throw Error('Explicit disposable Small required');
const target = validateTarget({ vaultName: process.env.KPLEX_TEST_VAULT_NAME, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
await runControlledProbe('indexing-event-convergence-210', scenario,
  'c.vaultPath=' + JSON.stringify(target.vault) + ';c.configRelative=' + JSON.stringify(relative(target.vault, target.config).replaceAll('\\', '/'))
    + ';c.originalData=' + JSON.stringify(readFileSync(join(target.pluginDir, 'data.json'), 'utf8'))
    + ';c.probeFactory=' + createStartupSourceConvergenceProbe.toString() + ';',
  ['src/main.ts', 'src/adapters/obsidian/sourceAcquisition.ts'], { maximumMs: 300000 });
