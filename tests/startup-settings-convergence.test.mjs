/**
 * Actual settings-publication owners must resume an initial source adopter superseded by policy.
 * Production coordinator/GraphIndex code is retained; an external adoption gate isolates the
 * notification boundary. Actual source/storage recovery is covered by the real-IDB companion.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {contributorBrowserBundle} from './support/contributorBrowserFixture.mjs';
import {startupSourceCoordinatorSource} from './support/startupSourceCoordinator.mjs';
import {centerGateSettings} from './support/requestedCenterGateFixture.mjs';

const bundle = await contributorBrowserBundle(['src/main.ts', 'src/index/GraphIndex.ts', 'src/index/GraphBuilder.ts',
  'src/index/IndexSnapshot.ts'], {'src/main.ts': startupSourceCoordinatorSource()});

/** Drain the existing bounded promise continuation queue without advancing a watchdog. */
async function settle() { for (let n = 0; n < 120; n++) await Promise.resolve(); }

for (const owner of ['presentation', 'legacy-display', 'semantic']) {
  test(`${owner} publication resumes its superseded initial adopter`, /** Deliver a genuine policy publication while the first owner is still in flight. */ async () => {
    const window = { crypto: webcrypto, performance, setTimeout, clearTimeout };
    const context = vm.createContext({ window, performance, setTimeout, clearTimeout, structuredClone, TextEncoder, TextDecoder, URL, DOMException, console });
    vm.runInContext(bundle, context);
    const M = window.sourceModules, root = new window.ContributorFolder();
    const events = { /** No real native subscriptions are needed by this settings-only fixture. */ on() { return {}; }, /** Retire an owned event stub. */ offref() {} };
    const app = { /** Legacy-cache cleanup must remain local and idle. */ saveLocalStorage() {},
      vault: { ...events, /** Own an isolated cache identity without opening storage. */ getName: () => 'settings-convergence-' + owner,
        /** No physical files participate in this policy-publication case. */ getFiles: () => [],
        /** No Markdown acquisition may be required by a settings notification. */ getMarkdownFiles: () => [],
        /** Return the existing empty physical root. */ getRoot: () => root,
        /** No native path is present. */ getFileByPath: () => null,
        /** Only the root container exists. */ getFolderByPath: path => path === '' ? root : null },
      metadataCache: { ...events, resolvedLinks: {}, unresolvedLinks: {}, /** No body/cache owner is needed for empty presentation. */ getFileCache: () => null } };
    const settings = { ...centerGateSettings(), indexingMode: 'eager', lastActivePath: '', pinnedNodes: [], tagStyleList: [],
      hierarchy: { hidden: [], parents: [], children: [], leftFriends: [], rightFriends: [], previous: [], next: [], exclusions: [] },
      inferAllLinksAsFriends: false, inverseInfer: false, showFullTagName: false };
    const p = new M.StartupSourceCoordinator(); Object.assign(p, { app, settings, layoutReady: true, indexPreparationAdmitted: true,
      /** Status observation cannot create a retry. */ notifyIndexStatus() {},
      /** Empty policy-only fixture has no native seed. */ startupGraphSeedPaths: () => [],
      /** The captured before-view policy owns this closed eager startup. */ hasVisibleKplexSurface: () => false });
    const i = new M.GraphIndex(p, app, true, 'eager'); p.index = i; i.preparationDeferred = false; i.sourceBackedStartup = true;
    i.sourceAcquisition.hasSemanticDependencies = /** Isolate an already-recovered source prerequisite. */ () => true;
    i.retryUrlAliasUpgrade = /** Optional alias maintenance is not a notification substitute. */ () => {};
    let completeGraphs = 0;
    i.rebuildProgressively = /** Isolate the completion capability from this storage-free notification case. */ async () => { completeGraphs++; return true; };
    let release, attempts = 0;
    const hold = new Promise(/** Hold only the original initial adopter. */ done => { release = done; });
    i.adoptStartupSources = /** Model the superseded result without manually calling a second adoption. */ async () => { if (++attempts === 1) { await hold; return false; } return true; };
    try {
      const initial = p.finishStartupIndexPreparation(); await settle();
      if (owner === 'presentation') { settings.showFullTagName = true; await i.refreshPresentationSettings(); }
      if (owner === 'legacy-display') { settings.renderAlias = false; i.refreshDisplayNames(); }
      if (owner === 'semantic') { settings.inferAllLinksAsFriends = true; i.invalidateSemanticPolicy(); await i.refreshSemanticSettings(); }
      release(); await initial; await settle();
      assert.equal(p.initialIndexComplete, true, 'A current settings publication must not strand its superseded startup');
      assert.equal(attempts, 2, 'One genuine publication produces one coalesced continuation');
      assert.equal(completeGraphs, 1, 'Successful eager recovery also completes global relationships');
      assert.equal(i.getSourceAcquisitionCounters().vaultReads, 0); assert.equal(i.getSourceAcquisitionCounters().parses, 0);
    } finally { release(); i.destroy(); }
  });
}
