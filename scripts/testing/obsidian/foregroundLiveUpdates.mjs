/**
 * Optional live-update cases for the existing foreground native driver. Owns one plugin restart,
 * unrelated P3 body hold and disposable UI fixtures; the caller owns target/artifact checks,
 * reporting and exact configuration-byte restoration. No canonical admission is injected.
 */
import { createStartupResourceProbe } from './startupResources.mjs';

/** Run real physical discovery and local semantic work before releasing unrelated URL acquisition. */
export async function runLiveUpdatesForeground({ cli, evaluate, wait, report, vaultName, composer = false, workspaceReady = false, progress = () => {} }) {
    const token = 'foreground-live-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    let installed = false;
    try {
        report.setup = evaluate(`(${installLiveUpdates.toString()})(${createStartupResourceProbe.toString()},${JSON.stringify(vaultName)},${JSON.stringify(token)})`);
        installed = true;
        evaluate(`(async()=>{const c=window.__kplexForegroundLiveUpdates,p=app.plugins.plugins['k-plex'];p.settings.followActiveFile=false;p.settings.documentSyncMode='off';await p.saveSettings(false,false);await p.settingsWriteQueue;return JSON.stringify({configured:true})})()`);
        cli('plugin:disable', 'id=k-plex');
        evaluate(`(async()=>{const c=window.__kplexForegroundLiveUpdates;await app.vault.createFolder(c.folder);c.anchor=await app.vault.create(c.folder+'/Anchor.md','Anchor fixture\\n');c.unrelated=await app.vault.create(c.folder+'/Unrelated.md','[Synthetic URL](https://example.com/kplex-live-unrelated)\\n');await c.until(()=>app.metadataCache.getFileCache(c.unrelated),'Unrelated metadata missing');await c.wait(200);return JSON.stringify({created:true})})()`);
        cli('plugin:enable', 'id=k-plex');
        // A reload can retire the original canvas. Reopen normal visible demand before waiting for P3.
        cli('command', 'id=k-plex:kplex-start');
        const holdDeadline = Date.now() + 90000;
        while (!evaluate('JSON.stringify({held:window.__kplexForegroundLiveUpdates.held})').held) {
            if (Date.now() > holdDeadline) throw Error('Real unrelated P3 hold not reached');
            await wait(150);
        }
        report.workspaceGuardVariant = workspaceReady ? 'after-existing-workspace-guard; original early case remains separate' : 'original-early';
        evaluate(`(()=>{const c=window.__kplexForegroundLiveUpdates;c.task=(${exerciseLiveUpdates.toString()})(c,${composer},${workspaceReady}).then(value=>{c.value=value;c.done=true},error=>{c.error=String(error);c.done=true});return JSON.stringify({started:true})})()`);
        const deadline = Date.now() + 180000;
        while (true) {
            await wait(300);
            const state = evaluate('(()=>{const c=window.__kplexForegroundLiveUpdates;c.probe?.sample(require("process").memoryUsage());return JSON.stringify({done:c.done,error:c.error,events:c.events,value:c.value})})()');
            report.progress = state; progress();
            if (state.done) { if (state.error) throw Error(state.error); return state.value; }
            if (Date.now() > deadline) throw Error('Native live-update/drain deadline');
        }
    } catch (error) { report.liveUpdatesError = String(error); throw error; }
    finally {
        if (!installed) installed = evaluate(`JSON.stringify({owned:window.__kplexForegroundLiveUpdates?.ownerToken===${JSON.stringify(token)}})`).owned;
        if (installed) {
            // Release the real body owner even if restart, foreground setup or an assertion failed.
            evaluate(`(()=>{const c=window.__kplexForegroundLiveUpdates;c.cancelled=true;c.release();c.cleanup=(${cleanupLiveUpdates.toString()})(c).then(value=>{c.cleaned=value},error=>{c.cleanupError=String(error)});return JSON.stringify({cleanupStarted:true})})()`);
            const deadline = Date.now() + 90000;
            while (true) {
                await wait(300);
                const state = evaluate('JSON.stringify({cleaned:window.__kplexForegroundLiveUpdates?.cleaned,error:window.__kplexForegroundLiveUpdates?.cleanupError})');
                if (state.error) throw Error('Live-update cleanup: ' + state.error);
                if (state.cleaned) { report.cleanup = state.cleaned; break; }
                if (Date.now() > deadline) throw Error('Live-update cleanup deadline');
            }
            evaluate('(()=>{delete window.__kplexForegroundLiveUpdates;return JSON.stringify({removed:true})})()');
            if (!report.cleanup.folderRemoved || !report.cleanup.filesRestored || !report.cleanup.cachedReadRestored) throw Error('Incomplete live-update cleanup');
        }
    }
}

/** Install one selected-renderer controller before restart; only the owned unrelated URL body waits. */
async function installLiveUpdates(resourceFactory, vaultName, ownerToken) {
    const p = app.plugins.plugins['k-plex'], remote = require('@electron/remote');
    if (window.__kplexForegroundLiveUpdates || window.__kplexForegroundTest || !p?.index.isOnDemandMode()
        || p.settings.urlIndexingMode !== 'background' || p.settings.indexingThrottle !== 'responsive') throw Error('Actual On-demand/background/Responsive session required');
    const windows = remote.BrowserWindow.getAllWindows().filter(w => w.getTitle().includes(vaultName));
    if (windows.length !== 1 || remote.getCurrentWindow().id !== windows[0].id) throw Error('Selected vault renderer identity ambiguous');
    if (remote.powerMonitor.getSystemIdleState(10) === 'locked' || app.setting.isOpen || document.querySelector('.modal-container')) throw Error('Unlock native session and close existing dialogs');
    const win = windows[0]; remote.app.show?.(); remote.app.focus({ steal: true }); win.restore(); win.show(); win.focus(); win.webContents.focus();
    await new Promise(resolve => window.setTimeout(resolve, 150));
    if (document.hidden || !document.hasFocus() || !win.isFocused()) throw Error('Selected native renderer did not acquire foreground');
    const c = window.__kplexForegroundLiveUpdates = { ownerToken, originalSettings: structuredClone(p.settings), layout: app.workspace.getLayout(),
        filesBefore: app.vault.getFiles().length, originalThrottling: win.webContents.getBackgroundThrottling(), folder: 'Kplex-Live-P3-' + Date.now(), started: performance.now(), foregroundDeadlineMs: 15000, done: false, events: [], leaves: [], phase: 'preparation' };
    c.wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
    c.foreground = () => { if (document.hidden || !document.hasFocus() || !win.isFocused() || remote.getCurrentWindow().id !== win.id || win.webContents.getBackgroundThrottling() !== c.originalThrottling) throw Error('Selected native renderer lost foreground or changed throttling'); return { hidden: document.hidden, focused: document.hasFocus(), selectedWindow: win.id, throttling: win.webContents.getBackgroundThrottling() }; };
    c.until = async (fn, label, timeout = 45000) => { const end = Date.now() + timeout; while (!fn()) { if (c.cancelled || Date.now() > end) throw Error(label); c.foreground(); await c.wait(40); } c.foreground(); };
    c.emit = (name, detail = {}) => { c.foreground(); if (c.events.length < 120) c.events.push({ ms: Math.round(performance.now() - c.started), name, ...detail }); };
    c.release = () => { c.released = true; c.resolveGate(); };
    c.gate = new Promise(resolve => { c.resolveGate = resolve; }); c.originalCachedRead = app.vault.cachedRead;
    app.vault.cachedRead = function (file, ...args) {
        const index = app.plugins.plugins['k-plex']?.index;
        if (!c.held && file === c.unrelated && index?.urlDiscoveryRunning && new Error().stack.includes('readUrlOwnerBody')) {
            c.held = true; c.p = app.plugins.plugins['k-plex']; c.emit('real-p3-body-held', { scheduler: index.getWorkPriorityDiagnostics(), initialIndexComplete: c.p.initialIndexComplete, reactiveListeners: c.p.reactiveIndexListenersRegistered });
            c.probe = resourceFactory({ phase: () => c.phase, now: () => performance.now(), cpu: () => require('process').cpuUsage(), cpuProcess: { pid: require('process').pid, type: require('process').type }, databaseName: index.indexedDb.connection?.name, detailed: false }); c.probe.attach(index);
            return c.gate.then(() => c.originalCachedRead.call(this, file, ...args));
        }
        return c.originalCachedRead.call(this, file, ...args);
    };
    c.input = (input, value) => { c.foreground(); input.focus(); const owner = input.ownerDocument.defaultView; Object.getOwnPropertyDescriptor(owner.HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new owner.Event('input', { bubbles: true })); };
    c.activate = async leaf => { app.workspace.setActiveLeaf(leaf, { focus: true }); leaf.view.focus?.(); await c.wait(100); c.foreground(); };
    c.createNative = async (name, text) => { c.emit('native-create-request', { filename: name }); const file = await app.vault.create(c.folder + '/' + name, text); c.emit('native-file-created', { path: file.path }); await c.until(() => app.metadataCache.getFileCache(file), 'Native metadata missing'); c.emit('native-metadata-ready', { path: file.path }); return file; };
    c.select = async file => { await c.activate(c.host); const input = c.host.view.contentEl.querySelector('.kplex-topbar input'); if (!input) throw Error('Visible Find input missing'); c.emit('find-request', { path: file.path }); c.input(input, file.basename); const hit = () => [...input.ownerDocument.querySelectorAll('.kplex-search-result')].find(row => row.querySelector('small')?.textContent === file.path); await c.until(hit, 'Visible Find result missing', c.foregroundDeadlineMs); c.emit('find-result', { path: file.path }); hit().click(); await c.until(() => c.host.view.contentEl.querySelector('.kplex-role-center')?.dataset.kplexPath === file.path, 'Find selection did not center', c.foregroundDeadlineMs); c.emit('find-center', { path: file.path }); };
    return JSON.stringify({ installed: true, folder: c.folder, foreground: c.foreground() });
}

/** Exercise existing public Find/recent-sync consumers; optional composer selection never submits a
 * write. The explicit workspace-ready variant retains unrelated P3 work but separates the native
 * session's existing sidecar/history guard from source availability. Original early failures remain. */
async function exerciseLiveUpdates(c, composer, workspaceReady) {
    const p = c.p, i = p.index; c.phase = 'foreground-create'; await p.activateView();
    c.host = app.workspace.getLeavesOfType('k-plex-react-view').find(leaf => p.isKplexLeafVisible(leaf));
    if (!c.host) throw Error('Visible graph host missing'); await c.host.view.waitUntilReady(); await c.wait(200); c.foreground(); await c.select(c.anchor);
    if (workspaceReady) {
        await c.until(() => !p.startupInitializing, 'Existing workspace guard did not settle');
        c.emit('workspace-guard-settled-before-actions', { gateStillHeld: c.held && !c.released });
    }
    c.before = i.getSourceAcquisitionCounters();
    if (composer) {
        const leaf = app.workspace.getLeaf('tab'); c.leaves.push(leaf); await leaf.openFile(c.anchor, { active: true }); await c.activate(leaf);
        const hidden = !p.hasVisibleKplexSurface(), file = await c.createNative('ComposerTarget.md', 'Existing target fixture\n');
        c.emit('composer-native-created', { hidden, canonical: i.state.pages.has(file.path), exactPhysical: i.getVaultSearchPage(file.path)?.file === file });
        if (!hidden || i.state.pages.has(file.path)) c.emit('composer-setup-excluded', { reason: !hidden ? 'another-visible-plex' : 'already-canonical' });
        else {
            if (i.getVaultSearchPage(file.path)?.file !== file) throw Error('Physical-only composer target unavailable');
            await c.activate(c.host); if (!app.commands.executeCommandById('k-plex:kplex-add-child')) throw Error('Public Add child unavailable');
            await c.until(() => document.querySelector('.kplex-add-related-modal .kplex-add-related-note-search input'), 'Actual related composer missing');
            const modal = document.querySelector('.kplex-add-related-modal'), dialog = [...p.actionDialogs.keys()].find(item => item.modalEl === modal), input = modal.querySelector('.kplex-add-related-note-search input');
            if (!dialog || !modal.querySelector('.modal-title')?.textContent.includes(c.anchor.basename)) throw Error('Composer captured wrong origin');
            c.dialog = dialog; c.originalSearch = i.search;
            i.search = function (...args) { if (args[0] === file.basename) c.composerSearch = { scope: args[2] ?? 'visible', canonical: i.state.pages.has(file.path), held: c.held && !c.released }; return c.originalSearch.apply(this, args); };
            try {
                c.input(input, file.basename); await c.until(() => c.composerSearch, 'Composer search callback missing');
                c.emit('composer-query-observed', { search: c.composerSearch, path: file.path });
                if (c.composerSearch.canonical) c.emit('composer-setup-excluded', { reason: 'canonical-before-query', search: c.composerSearch });
                else {
                    const hit = () => [...input.ownerDocument.querySelectorAll('[data-fuzzy-owner="' + dialog.suggestionOwnerId + '"] .kplex-search-result')].find(row => row.querySelector('small')?.textContent === file.path);
                    await c.until(hit, 'Physical-only target missing from actual existing-note composer', 3000); hit().click();
                    await c.until(() => modal.querySelector('.kplex-add-related-link-button'), 'Composer target selection failed');
                    if (modal.querySelector('.kplex-add-related-create-hint')?.textContent !== p.translator('addRelated.selectedExisting', { path: file.path })) throw Error('Composer selected wrong native target');
                    c.emit('composer-selected-before-release', { search: c.composerSearch, path: file.path });
                }
            } finally { i.search = c.originalSearch; c.originalSearch = null; dialog.close(); c.dialog = null; }
        }
    }
    c.created = await c.createNative('ExternalP3.md', 'Child:: [[Live P3 Ghost]]\n'); await c.select(c.created);
    await c.until(() => i.getNeighborhood(c.created.path)?.children.some(item => item.page.name === 'Live P3 Ghost' && item.relationType === 1), 'Stationary local semantics missing before P3 release', c.foregroundDeadlineMs);
    c.emit('local-semantics-ready', { path: c.created.path });
    await c.wait(400); if (c.host.view.contentEl.querySelector('.kplex-role-center')?.dataset.kplexPath !== c.created.path) throw Error('Foreground center reverted while P3 held');
    c.emit('foreground-available-before-release', { center: c.created.path, exact: i.get(c.created.path)?.file === c.created, gateStillHeld: c.held && !c.released, scheduler: i.getWorkPriorityDiagnostics() });
    c.recentFile = await c.createNative('Recent.md', 'Child:: [[Live Recent Ghost]]\n');
    const recent = app.workspace.getLeaf('tab'); c.leaves.push(recent); await recent.openFile(c.recentFile, { active: true }); await c.activate(c.host);
    c.emit('recent-sync-request', { path: c.recentFile.path, canonical: !!i.get(c.recentFile.path),
        physical: i.getVaultSearchPage(c.recentFile.path)?.file === c.recentFile,
        activationObserved: p.recentLeafHistory.some(leaf => leaf.view?.file === c.recentFile) });
    if (!app.commands.executeCommandById('k-plex:kplex-sync-plex-from-tab')) throw Error('Public recent-sync command missing');
    try {
        await c.until(() => c.host.view.contentEl.querySelector('.kplex-role-center')?.dataset.kplexPath === c.recentFile.path && i.getNeighborhood(c.recentFile.path)?.children.some(item => item.page.name === 'Live Recent Ghost' && item.relationType === 1), 'Explicit recent sync did not finish before P3 release', c.foregroundDeadlineMs);
    } catch (error) {
        c.emit('recent-sync-incomplete', { centered: c.host.view.contentEl.querySelector('.kplex-role-center')?.dataset.kplexPath === c.recentFile.path,
            canonical: !!i.get(c.recentFile.path), physical: i.getVaultSearchPage(c.recentFile.path)?.file === c.recentFile,
            activationObserved: p.recentLeafHistory.some(leaf => leaf.view?.file === c.recentFile),
            semanticPending: i.hasPendingSemanticPreparation(), semanticActive: i.hasActiveSemanticPreparation() });
        throw error;
    }
    c.emit('recent-sync-before-release', { exact: i.get(c.recentFile.path)?.file === c.recentFile, gateStillHeld: c.held && !c.released }); await c.select(c.created);
    if (!c.held || c.released) throw Error('Foreground controls did not retain the unrelated body gate');
    c.phase = 'background-drain'; c.release();
    const source = i.sourceAcquisition, repository = i.indexedDb.sources, cache = i.indexedDb; let stableSince;
    // Observe actual owners/queues, not dormant known-file backlog in disabled On-demand inventory.
    await c.until(() => {
        const observed = c.probe.snapshot(), scheduler = i.getWorkPriorityDiagnostics();
        c.drain = { coordinator: Boolean(p.rebuildTask || p.rebuildTimer || p.indexDirty), graph: Boolean(i.building || i.pendingStructuralTasks || i.hasActiveSemanticPreparation() || i.hasPendingSemanticPreparation()),
            url: Boolean(i.urlDiscoveryRunning || i.cancelUrlRestore || i.urlAliasUpgradeTask || i.nodeImpactTask || i.urlFlushTimer || i.pendingUrlPaths.size || i.pendingUrlOwners.size || i.urlOwnerTasks.size || i.urlCacheWrites.size),
            snapshot: Boolean(i.snapshotPersistTimer || i.checkpointSaving), source: Boolean(source.inventory || source.timer || source.knownImpactTasks || source.knownFanoutTasks.size || source.deferredResolutionRetryTimer || source.resolverWaveTimer),
            repository: Boolean(repository.lanes.size || repository.transactions.size || repository.pendingDeletes.size || repository.deleteTask || repository.retryTask || repository.retryTimer || repository.hostChange || repository.hostJournalTask || repository.localStaging.size || repository.readers.size || repository.decodeBytes || [...repository.impactReaders.values()].some(reader => reader.active)),
            cache: Boolean(cache.queuedBodyWrites.size || cache.bodyWriteInFlight || cache.bodyWriteTimer || cache.maintenanceReads.size),
            scheduler: Boolean(scheduler.waiting || scheduler.active.some(count => count > 0)), observations: Boolean(observed.pending || observed.activeTransactions || observed.decodeCurrent) };
        if (Object.values(c.drain).some(Boolean)) { stableSince = undefined; return false; }
        stableSince ??= performance.now(); return performance.now() - stableSince >= 250;
    }, 'Actual source/storage/work queues did not drain', 90000);
    if (c.host.view.contentEl.querySelector('.kplex-role-center')?.dataset.kplexPath !== c.created.path || i.get(c.created.path)?.file !== c.created) throw Error('Late background replaced selected native center');
    c.after = i.getSourceAcquisitionCounters(); c.emit('genuine-drain', { source: c.after }); const resources = c.probe.snapshot(); c.probe.stop();
    const composerStatus = !composer ? 'not-requested' : c.events.some(event => event.name === 'composer-selected-before-release') ? 'selected' : 'setup-excluded';
    return { events: c.events, before: c.before, after: c.after, resources, drain: c.drain, dormantKnownSources: source.pendingKnownFiles.size,
        deferredOrphanMaintenance: i.orphanCleanupTimer !== null, foregroundDeadlineMs: c.foregroundDeadlineMs, finalCenterCurrent: true, foreground: c.foreground(), composerStatus };
}

/** Release instrumentation before restoring owned UI/files/settings; attempt restoration after every failure. */
async function cleanupLiveUpdates(c) {
    const errors = [], attempt = async (name, work) => { try { await work(); } catch (error) { errors.push(name + ': ' + String(error)); } };
    c.probe?.stop(); app.vault.cachedRead = c.originalCachedRead;
    if (c.originalSearch && c.p) c.p.index.search = c.originalSearch; c.dialog?.close();
    await attempt('probe-task', async () => { await c.task; });
    await attempt('plugin-enable', async () => { if (!app.plugins.plugins['k-plex']) await app.plugins.enablePlugin('k-plex'); });
    const current = app.plugins.plugins['k-plex'];
    await attempt('owned-leaves', () => { for (const leaf of app.workspace.getLeavesOfType('k-plex-react-view')) leaf.detach(); for (const leaf of c.leaves) if (leaf.view.containerEl.isConnected) leaf.detach(); });
    await attempt('fixture-folder', async () => { const folder = app.vault.getFolderByPath(c.folder); if (folder) await app.vault.delete(folder, true); });
    await attempt('settings', async () => { Object.assign(current.settings, c.originalSettings); await current.saveSettings(false, false); await current.settingsWriteQueue; });
    await attempt('workspace-layout', async () => { await app.workspace.changeLayout(c.layout); Object.assign(current.settings, c.originalSettings); await current.saveSettings(false, false); await current.settingsWriteQueue; });
    const result = { errors, folderRemoved: !app.vault.getFolderByPath(c.folder), filesRestored: app.vault.getFiles().length === c.filesBefore, cachedReadRestored: app.vault.cachedRead === c.originalCachedRead };
    if (errors.length) throw Error(JSON.stringify(result)); return result;
}
